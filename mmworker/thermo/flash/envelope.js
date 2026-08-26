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
 * Checks if the K-values vector represents a valid two-phase state (non-trivial).
 *
 * @param {Float64Array|number[]} K - K-values vector
 * @param {number} N - Number of components
 * @returns {boolean} True if non-trivial two-phase equilibrium
 */
function isNonTrivialK(K, N) {
	let sumLnK2 = 0.0;
	for (let i = 0; i < N; i++) {
		const lnK = Math.log(Math.max(1e-30, K[i]));
		sumLnK2 += lnK * lnK;
	}
	return sumLnK2 > 1e-5;
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
	const pMax = options.pMax !== undefined ? options.pMax : 15000000.0;
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

	/** @type {Array<{ T: number, P: number }>} */
	const bubbleCurve = [];
	/** @type {Array<{ T: number, P: number }>} */
	const dewCurve = [];
	/** @type {Map<number, Array<{ T: number, P: number }>>} */
	const qualityCurves = new Map();
	for (const q of qualityLevels) {
		qualityCurves.set(q, []);
	}

	const logPMin = Math.log(pMin);
	const logPMax = Math.log(pMax);

	// 1. Trace Bubble Curve (Q = 0)
	let prevK = null;
	let prevT = undefined;

	for (let i = 0; i <= numPoints; i++) {
		const frac = i / numPoints;
		const currP = Math.exp(logPMin + frac * (logPMax - logPMin));
		try {
			const res = insideOutFlash(
				{ type: FlashType.PQ, P: currP, Q: 0.0, T: prevT },
				ws.z,
				eos,
				{ initialK: prevK, tol, maxIterations: maxIter },
				ws
			);
			if (res.converged && isNonTrivialK(res.K, N)) {
				bubbleCurve.push({ T: res.T, P: currP });
				prevT = res.T;
				prevK = Array.from(res.K);
			} else {
				// Continuation near the upper critical region with adaptive T-stepping
				if (bubbleCurve.length > 5) {
					const lastPt = bubbleCurve[bubbleCurve.length - 1];
					let tStep = lastPt.T;
					let pStep = lastPt.P;
					for (let step = 1; step <= 20; step++) {
						tStep += 0.5;
						const resT = insideOutFlash(
							{ type: FlashType.TQ, T: tStep, Q: 0.0, P: pStep },
							ws.z,
							eos,
							{ initialK: prevK, tol, maxIterations: maxIter },
							ws
						);
						if (resT.converged && isNonTrivialK(resT.K, N) && resT.P > pStep) {
							bubbleCurve.push({ T: tStep, P: resT.P });
							pStep = resT.P;
							prevK = Array.from(resT.K);
						} else {
							break;
						}
					}
				}
				break;
			}
		} catch (e) {
			break;
		}
	}

	// 2. Trace Dew Curve (Q = 1)
	// 2a. Lower Dew Branch (P-stepping up to cricondentherm)
	const lowerDew = [];
	prevK = null;
	prevT = undefined;
	let maxDewT = 0;
	let pAtMaxDewT = pMin;

	for (let i = 0; i <= numPoints; i++) {
		const frac = i / numPoints;
		const currP = Math.exp(logPMin + frac * (logPMax - logPMin));
		try {
			const res = insideOutFlash(
				{ type: FlashType.PQ, P: currP, Q: 1.0, T: prevT },
				ws.z,
				eos,
				{ initialK: prevK, tol, maxIterations: maxIter },
				ws
			);
			if (res.converged && isNonTrivialK(res.K, N)) {
				lowerDew.push({ T: res.T, P: currP });
				prevT = res.T;
				prevK = Array.from(res.K);

				if (res.T >= maxDewT) {
					maxDewT = res.T;
					pAtMaxDewT = currP;
				} else if (res.T < maxDewT - 0.5 && lowerDew.length > 5) {
					// Passed cricondentherm
					break;
				}
			} else {
				break;
			}
		} catch (e) {
			break;
		}
	}

	// 2b. Upper Dew Branch (retrograde region using T-stepping from maxDewT down towards bubble curve top)
	const upperDew = [];
	const tCritEstimate = bubbleCurve.length > 0 ? bubbleCurve[bubbleCurve.length - 1].T : maxDewT * 0.9;
	if (maxDewT > tCritEstimate) {
		const nSteps = Math.max(25, Math.floor(numPoints / 2));
		let prevP = pAtMaxDewT;
		prevK = null;

		for (let i = 1; i <= nSteps; i++) {
			const currT = maxDewT - (i / nSteps) * (maxDewT - tCritEstimate);
			try {
				const res = insideOutFlash(
					{ type: FlashType.TQ, T: currT, Q: 1.0, P: prevP },
					ws.z,
					eos,
					{ initialK: prevK, tol, maxIterations: maxIter },
					ws
				);
				if (res.converged && isNonTrivialK(res.K, N) && res.P >= pAtMaxDewT * 0.8) {
					upperDew.push({ T: currT, P: res.P });
					prevP = res.P;
					prevK = Array.from(res.K);
				}
			} catch (e) {
				break;
			}
		}
	}

	// Assemble combined dew curve
	for (const pt of lowerDew) dewCurve.push(pt);
	for (const pt of upperDew) dewCurve.push(pt);

	// 3. Trace Quality Curves
	for (const q of qualityLevels) {
		const qPts = qualityCurves.get(q);
		prevK = null;
		prevT = undefined;
		for (let i = 0; i <= numPoints; i++) {
			const frac = i / numPoints;
			const currP = Math.exp(logPMin + frac * (logPMax - logPMin));
			try {
				const res = insideOutFlash(
					{ type: FlashType.PQ, P: currP, Q: q, T: prevT },
					ws.z,
					eos,
					{ initialK: prevK, tol, maxIterations: maxIter },
					ws
				);
				if (res.converged && isNonTrivialK(res.K, N)) {
					qPts?.push({ T: res.T, P: currP });
					prevT = res.T;
					prevK = Array.from(res.K);
				} else {
					break;
				}
			} catch (e) {
				break;
			}
		}
	}

	// 4. Identify Extrema
	// Cricondentherm: Point of maximum T on dew curve
	let cricondentherm = { T: 0.0, P: 0.0 };
	for (const pt of dewCurve) {
		if (pt.T > cricondentherm.T) {
			cricondentherm = { T: pt.T, P: pt.P };
		}
	}

	// Cricondenbar: Point of maximum P across the boundary
	let cricondenbar = { T: 0.0, P: 0.0 };
	for (const pt of [...bubbleCurve, ...dewCurve]) {
		if (pt.P > cricondenbar.P) {
			cricondenbar = { T: pt.T, P: pt.P };
		}
	}

	// Mixture Critical Point: Where bubble and dew curves converge
	let criticalPoint = { T: 0.0, P: 0.0 };
	if (bubbleCurve.length > 0) {
		criticalPoint = {
			T: bubbleCurve[bubbleCurve.length - 1].T,
			P: bubbleCurve[bubbleCurve.length - 1].P
		};
	} else if (dewCurve.length > 0) {
		criticalPoint = {
			T: dewCurve[dewCurve.length - 1].T,
			P: dewCurve[dewCurve.length - 1].P
		};
	}

	return {
		bubbleCurve,
		dewCurve,
		qualityCurves,
		criticalPoint,
		cricondentherm,
		cricondenbar
	};
}
