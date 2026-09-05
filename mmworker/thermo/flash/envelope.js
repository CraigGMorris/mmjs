// @ts-check

/**
 * jsflash - High-Performance Zero-Dependency Thermodynamics Engine
 *
 * Copyright (C) 2026 jsflash contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * @fileoverview Multicomponent Pressure-Temperature (PT) Phase Envelope and Critical Point Generator.
 */

import { FlashType } from '../types/flash.js';
import { insideOutFlash } from './inside-out.js';
import { ThermodynamicWorkspace } from '../types/memory.js';

/**
 * Solves a square linear system A * x = b via Gaussian elimination with partial pivoting.
 *
 * @param {number[][]} A - Matrix (dim x dim)
 * @param {Float64Array|number[]} b - Right hand side vector (length dim)
 * @param {number} dim - Dimension
 * @returns {Float64Array|null} Solution vector or null if singular
 */
function solveLinear(A, b, dim) {
	const M = Array.from({ length: dim }, (_, i) => [...A[i], b[i]]);
	for (let i = 0; i < dim; i++) {
		let maxRow = i;
		for (let k = i + 1; k < dim; k++) {
			if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
		}
		const temp = M[i];
		M[i] = M[maxRow];
		M[maxRow] = temp;
		if (Math.abs(M[i][i]) < 1e-18) return null;

		const pivot = M[i][i];
		for (let k = i + 1; k < dim; k++) {
			const factor = M[k][i] / pivot;
			for (let j = i; j <= dim; j++) {
				M[k][j] -= factor * M[i][j];
			}
		}
	}
	const x = new Float64Array(dim);
	for (let i = dim - 1; i >= 0; i--) {
		let s = M[i][dim];
		for (let j = i + 1; j < dim; j++) {
			s -= M[i][j] * x[j];
		}
		x[i] = s / M[i][i];
	}
	return x;
}

/**
 * Generates the complete multicomponent PT Phase Envelope:
 * - Bubble Point Curve (Q = 0)
 * - Dew Point Curve (Q = 1) including lower and upper retrograde branches
 * - Quality Iso-lines (e.g. Q = 0.1, 0.25, 0.5, 0.75, 0.9)
 * - Cricondentherm, Cricondenbar, and Mixture Critical Point
 *
 * @param {ArrayLike<number>} z - Feed mole fraction vector (length N)
 * @param {import('../types/eos.js').PropertyPackage} eos - Property package instance (e.g., PengRobinson)
 * @param {import('../types/flash.js').PhaseEnvelopeOptions} [options={}] - Phase envelope options
 * @param {ThermodynamicWorkspace} [workspace] - Workspace buffer
 * @returns {import('../types/flash.js').PhaseEnvelopeResult}
 */
export function generatePhaseEnvelope(z, eos, options = {}, workspace) {
	const N = eos.numComponents;
	const ws = workspace || (eos instanceof Object && 'workspace' in eos && eos.workspace instanceof ThermodynamicWorkspace ? eos.workspace : new ThermodynamicWorkspace(N));

	const pMin = options.pMin !== undefined ? options.pMin : 100000.0;
	const pMax = options.pMax !== undefined ? options.pMax : 25000000.0;
	const numPoints = options.numPoints !== undefined ? options.numPoints : 60;
	const qualityLevels = options.qualityLevels || [0.1, 0.25, 0.5, 0.75, 0.9];
	const tol = options.tol !== undefined ? options.tol : 1e-6;
	const maxIter = options.maxIterations !== undefined ? options.maxIterations : 40;

	// Normalize feed composition into ws.z
	let sumZ = 0.0;
	for (let i = 0; i < N; i++) {
		sumZ += z[i];
	}
	const invSumZ = sumZ > 0.0 ? 1.0 / sumZ : 1.0;
	for (let i = 0; i < N; i++) {
		ws.z[i] = z[i] * invSumZ;
	}

	// 1. Check for single pure component
	let maxZ = 0, maxZIdx = 0;
	for (let i = 0; i < N; i++) {
		if (ws.z[i] > maxZ) {
			maxZ = ws.z[i];
			maxZIdx = i;
		}
	}
	if (N === 1 || maxZ > 0.99999) {
		const comp = eos.compounds[maxZIdx];
		const Tc = comp.tc;
		const Pc = comp.pc;
		const pureCurve = [];
		const nPts = Math.max(30, numPoints);
		const tMin = comp.tm ? Math.max(20.0, comp.tm) : 0.4 * Tc;
		for (let i = 0; i <= nPts; i++) {
			const frac = i / nPts;
			const T = tMin + frac * (Tc * 0.999 - tMin);
			const Tr = T / Tc;
			let P = Pc * Math.exp(5.373 * (1.0 + comp.omega) * (1.0 - 1.0 / Tr));
			for (let iter = 0; iter < 10; iter++) {
				const zFactors = new Float64Array(2);
				eos.calculateZFactors(T, P, [1.0], zFactors, undefined, ws);
				const lnPhiL = new Float64Array(1);
				const lnPhiV = new Float64Array(1);
				eos.calculateFugacityCoefficients(T, P, [1.0], zFactors[0], lnPhiL, undefined, ws);
				eos.calculateFugacityCoefficients(T, P, [1.0], zFactors[1], lnPhiV, undefined, ws);
				const diff = lnPhiL[0] - lnPhiV[0];
				if (Math.abs(diff) < 1e-7) break;
				P *= Math.exp(diff / (zFactors[1] - zFactors[0] + 1e-6));
			}
			if (P >= pMin * 0.5 && P <= Pc * 1.01) {
				pureCurve.push({ T, P });
			}
		}
		pureCurve.push({ T: Tc, P: Pc });
		return {
			bubbleCurve: pureCurve,
			dewCurve: pureCurve,
			curve: pureCurve,
			qualityCurves: new Map(),
			criticalPoint: { T: Tc, P: Pc },
			cricondentherm: { T: Tc, P: Pc },
			cricondenbar: { T: Tc, P: Pc }
		};
	}

	// 2. Multicomponent Continuation System
	const zFeed = ws.z;

	/**
	 * Evaluates equilibrium residual vector F(X, Q) where X = [ln(K_1)...ln(K_N), T, ln(P)].
	 * @param {Float64Array} X
	 * @param {number} Q
	 */
	function evaluateF(X, Q) {
		const w = X.slice(0, N);
		const T = Math.max(20.0, Math.min(2500.0, X[N]));
		const lnP = X[N + 1];
		const P = Math.max(100.0, Math.min(1e9, Math.exp(lnP)));

		const K = new Float64Array(N);
		for (let i = 0; i < N; i++) {
			K[i] = Math.exp(Math.max(-50.0, Math.min(50.0, w[i])));
		}

		const x = new Float64Array(N);
		const y = new Float64Array(N);

		if (Q === 0.0) {
			for (let i = 0; i < N; i++) {
				x[i] = zFeed[i];
				y[i] = K[i] * zFeed[i];
			}
		} else if (Q === 1.0) {
			for (let i = 0; i < N; i++) {
				y[i] = zFeed[i];
				x[i] = zFeed[i] / K[i];
			}
		} else {
			for (let i = 0; i < N; i++) {
				const denom = 1.0 + Q * (K[i] - 1.0);
				x[i] = zFeed[i] / Math.max(1e-12, denom);
				y[i] = K[i] * x[i];
			}
		}

		let sumX = 0.0, sumY = 0.0;
		for (let i = 0; i < N; i++) {
			sumX += x[i];
			sumY += y[i];
		}
		const xNorm = new Float64Array(N);
		const yNorm = new Float64Array(N);
		const invSumX = sumX > 0 ? 1.0 / sumX : 1.0;
		const invSumY = sumY > 0 ? 1.0 / sumY : 1.0;
		for (let i = 0; i < N; i++) {
			xNorm[i] = x[i] * invSumX;
			yNorm[i] = y[i] * invSumY;
		}

		const zFactorsL = new Float64Array(2);
		const zFactorsV = new Float64Array(2);
		eos.calculateZFactors(T, P, xNorm, zFactorsL, undefined, ws);
		eos.calculateZFactors(T, P, yNorm, zFactorsV, undefined, ws);

		const lnPhiL = new Float64Array(N);
		const lnPhiV = new Float64Array(N);
		eos.calculateFugacityCoefficients(T, P, xNorm, zFactorsL[0], lnPhiL, undefined, ws);
		eos.calculateFugacityCoefficients(T, P, yNorm, zFactorsV[1], lnPhiV, undefined, ws);

		const F = new Float64Array(N + 1);
		for (let i = 0; i < N; i++) {
			F[i] = w[i] + lnPhiV[i] - lnPhiL[i];
		}

		if (Q === 0.0) {
			F[N] = Math.log(Math.max(1e-30, sumY));
		} else if (Q === 1.0) {
			F[N] = -Math.log(Math.max(1e-30, sumX));
		} else {
			let rr = 0.0;
			for (let i = 0; i < N; i++) {
				rr += (zFeed[i] * (K[i] - 1.0)) / (1.0 + Q * (K[i] - 1.0));
			}
			F[N] = rr;
		}

		return { F, zL: zFactorsL[0], zV: zFactorsV[1] };
	}

	/**
	 * Computes the (N+1) x (N+2) Jacobian matrix via forward finite differences.
	 * @param {Float64Array} X
	 * @param {number} Q
	 * @param {{ F: Float64Array }} f0
	 */
	function computeJacobian(X, Q, f0) {
		const dim = N + 2;
		const J = Array.from({ length: N + 1 }, () => new Float64Array(dim));
		const Xp = new Float64Array(X);
		for (let j = 0; j < dim; j++) {
			const eps = j < N ? 1e-6 : (j === N ? Math.max(1e-4, X[N] * 1e-6) : 1e-6);
			Xp[j] = X[j] + eps;
			const fp = evaluateF(Xp, Q);
			Xp[j] = X[j];
			for (let i = 0; i < N + 1; i++) {
				J[i][j] = (fp.F[i] - f0.F[i]) / eps;
			}
		}
		return J;
	}

	/**
	 * Computes normalized tangent vector v in (T, lnP) continuation space.
	 * @param {Float64Array[]} J
	 * @param {Float64Array|null} prevTangent
	 */
	function computeTangent(J, prevTangent) {
		const dim = N + 2;
		const A = [], b = new Float64Array(N + 1);
		for (let i = 0; i < N + 1; i++) {
			A.push(Array.from(J[i].slice(0, N + 1)));
			b[i] = -J[i][N + 1];
		}
		let sol = solveLinear(A, b, N + 1);
		let v = new Float64Array(dim);
		if (sol) {
			for (let j = 0; j < N + 1; j++) v[j] = sol[j];
			v[N + 1] = 1.0;
		} else {
			const A2 = [];
			for (let i = 0; i < N + 1; i++) {
				const row = Array.from(J[i].slice(0, N));
				row.push(J[i][N + 1]);
				A2.push(row);
				b[i] = -J[i][N];
			}
			sol = solveLinear(A2, b, N + 1);
			if (!sol) return null;
			for (let j = 0; j < N; j++) v[j] = sol[j];
			v[N] = 1.0;
			v[N + 1] = sol[N];
		}

		const dT_scaled = v[N] / 50.0;
		const dlnP = v[N + 1];
		const normTP = Math.sqrt(dT_scaled * dT_scaled + dlnP * dlnP);
		if (normTP < 1e-12) return null;
		for (let j = 0; j < dim; j++) v[j] /= normTP;

		if (prevTangent) {
			let dot = (v[N] / 50.0) * (prevTangent[N] / 50.0) + v[N + 1] * prevTangent[N + 1];
			if (dot < 0) {
				for (let j = 0; j < dim; j++) v[j] = -v[j];
			}
		}
		return v;
	}

	const baseStepSize = Math.max(0.005, Math.min(0.06, (Math.log(pMax) - Math.log(pMin)) / (Math.max(10, numPoints) * 1.3)));
	const maxStepSize = baseStepSize * 1.3;

	/**
	 * Traces a curve branch (bubble, dew, or quality) using parameter continuation.
	 * @param {Float64Array} initX
	 * @param {number} Q
	 * @param {number} maxSteps
	 */
	function traceBranch(initX, Q, maxSteps = 150) {
		let X = new Float64Array(initX);
		let prevTangent = null;
		let stepSize = baseStepSize;
		const pts = [{ T: X[N], P: Math.exp(X[N + 1]) }];
		let maxT = X[N];
		let passedMaxT = false;
		let minLnK2 = Infinity;
		let minLnK2Idx = 0;

		let initSumLnK2 = 0.0;
		for (let i = 0; i < N; i++) initSumLnK2 += initX[i] * initX[i];
		const criticalThreshold = Math.max(2.0, initSumLnK2 * 0.01);

		for (let step = 0; step < maxSteps; step++) {
			let sumLnK2 = 0.0;
			for (let i = 0; i < N; i++) sumLnK2 += X[i] * X[i];

			// Critical state detection
			if (pts.length > 5 && sumLnK2 < 2e-4) {
				break;
			}
			if (pts.length > 10 && minLnK2 < criticalThreshold && sumLnK2 > minLnK2 * 1.15) {
				// Passed the critical point - trim points past minimum
				while (pts.length > minLnK2Idx + 1) {
					pts.pop();
				}
				break;
			}
			if (sumLnK2 < minLnK2) {
				minLnK2 = sumLnK2;
				minLnK2Idx = pts.length - 1;
			}

			if (X[N] > maxT) {
				maxT = X[N];
			} else if (X[N] < maxT - 0.5) {
				passedMaxT = true;
			}

			// Retrograde direction guard: prevent superheated single-phase runaway
			if (passedMaxT && X[N] > maxT + 0.1 && sumLnK2 < 0.1) {
				break;
			}

			const f0 = evaluateF(X, Q);
			const J = computeJacobian(X, Q, f0);
			const tangent = computeTangent(J, prevTangent);
			if (!tangent) break;
			if (step === 0 && tangent[N + 1] < 0) {
				for (let j = 0; j < N + 2; j++) tangent[j] = -tangent[j];
			}
			prevTangent = tangent;

			const useP = Math.abs(tangent[N + 1]) >= Math.abs(tangent[N] / 50.0);
			const fixedIdx = useP ? N + 1 : N;
			const delta = useP ? stepSize * Math.sign(tangent[N + 1]) : (stepSize * 50.0) * Math.sign(tangent[N]);

			const X_pred = new Float64Array(N + 2);
			for (let j = 0; j < N + 2; j++) {
				X_pred[j] = X[j] + (delta / tangent[fixedIdx]) * tangent[j];
			}
			X_pred[fixedIdx] = X[fixedIdx] + delta;

			let X_curr = new Float64Array(X_pred);
			let conv = false;
			const otherIndices = [];
			for (let j = 0; j < N + 2; j++) {
				if (j !== fixedIdx) otherIndices.push(j);
			}

			for (let it = 0; it < 15; it++) {
				const f_curr = evaluateF(X_curr, Q);
				let maxF = 0.0;
				for (let i = 0; i < N + 1; i++) {
					const absF = Math.abs(f_curr.F[i]);
					if (absF > maxF) maxF = absF;
				}
				if (maxF < tol) {
					// Strict non-triviality check to reject single-phase trivial manifold
					let sK = 0.0;
					for (let i = 0; i < N; i++) sK += X_curr[i] * X_curr[i];
					if (sK > 5e-5) {
						conv = true;
					}
					break;
				}
				const J_curr = computeJacobian(X_curr, Q, f_curr);
				const A = [], b = new Float64Array(N + 1);
				for (let i = 0; i < N + 1; i++) {
					const row = [];
					for (const col of otherIndices) row.push(J_curr[i][col]);
					A.push(row);
					b[i] = -f_curr.F[i];
				}
				const dX_sub = solveLinear(A, b, N + 1);
				if (!dX_sub) break;
				for (let k = 0; k < N + 1; k++) {
					X_curr[otherIndices[k]] += dX_sub[k];
				}
			}

			if (conv) {
				for (let j = 0; j < N + 2; j++) X[j] = X_curr[j];
				pts.push({ T: X[N], P: Math.exp(X[N + 1]) });
				stepSize = Math.min(maxStepSize, stepSize * 1.1);
			} else {
				stepSize *= 0.5;
				if (stepSize < 0.0005) break;
			}
		}
		return pts;
	}

	// Trace Bubble Curve (Q = 0)
	const maxBranchSteps = Math.max(150, numPoints * 3);
	const pq0 = insideOutFlash({ type: FlashType.PQ, P: pMin, Q: 0.0 }, ws.z, eos, { tol, maxIterations: maxIter }, ws);
	const Xbub = new Float64Array(N + 2);
	for (let i = 0; i < N; i++) Xbub[i] = Math.log(Math.max(1e-30, pq0.K[i]));
	Xbub[N] = pq0.T;
	Xbub[N + 1] = Math.log(pMin);
	const bubbleCurve = traceBranch(Xbub, 0.0, maxBranchSteps);

	// Trace Dew Curve (Q = 1)
	const pq1 = insideOutFlash({ type: FlashType.PQ, P: pMin, Q: 1.0 }, ws.z, eos, { tol, maxIterations: maxIter }, ws);
	const Xdew = new Float64Array(N + 2);
	for (let i = 0; i < N; i++) Xdew[i] = Math.log(Math.max(1e-30, pq1.K[i]));
	Xdew[N] = pq1.T;
	Xdew[N + 1] = Math.log(pMin);
	const dewCurveAscending = traceBranch(Xdew, 1.0, maxBranchSteps);

	// Trace Quality Curves
	/** @type {Map<number, Array<{ T: number, P: number }>>} */
	const qualityCurves = new Map();
	for (const q of qualityLevels) {
		try {
			const resQ = insideOutFlash({ type: FlashType.PQ, P: pMin, Q: q }, ws.z, eos, { tol, maxIterations: maxIter }, ws);
			const Xq = new Float64Array(N + 2);
			for (let i = 0; i < N; i++) Xq[i] = Math.log(Math.max(1e-30, resQ.K[i]));
			Xq[N] = resQ.T;
			Xq[N + 1] = Math.log(pMin);
			const qPts = traceBranch(Xq, q, maxBranchSteps);
			qualityCurves.set(q, qPts);
		} catch (e) {
			qualityCurves.set(q, []);
		}
	}

	// Extrema Identification
	// Cricondentherm: Point of maximum T on dew curve
	let cricondentherm = { T: 0.0, P: 0.0 };
	for (const pt of dewCurveAscending) {
		if (pt.T > cricondentherm.T) {
			cricondentherm = { T: pt.T, P: pt.P };
		}
	}

	// Cricondenbar: Point of maximum P across the entire boundary
	let cricondenbar = { T: 0.0, P: 0.0 };
	for (const pt of [...bubbleCurve, ...dewCurveAscending]) {
		if (pt.P > cricondenbar.P) {
			cricondenbar = { T: pt.T, P: pt.P };
		}
	}

	// Mixture Critical Point: Convergence point of bubble and dew curves
	let criticalPoint = { T: 0.0, P: 0.0 };
	if (bubbleCurve.length > 0) {
		const lastB = bubbleCurve[bubbleCurve.length - 1];
		criticalPoint = { T: lastB.T, P: lastB.P };
	} else if (dewCurveAscending.length > 0) {
		const lastD = dewCurveAscending[dewCurveAscending.length - 1];
		criticalPoint = { T: lastD.T, P: lastD.P };
	}

	// Reverse dew curve so that it continues from critical point (Pc, Tc) down to pMin
	const dewCurve = dewCurveAscending.reverse();

	return {
		bubbleCurve,
		dewCurve,
		curve: [...bubbleCurve, ...dewCurve],
		qualityCurves,
		criticalPoint,
		cricondentherm,
		cricondenbar
	};
}
