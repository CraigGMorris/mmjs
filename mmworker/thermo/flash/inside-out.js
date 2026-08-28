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
 * @fileoverview Full Boston-Britt Inside-Out Flash Engine and State Inversion Solvers (TP, PH, PS, PQ, TH, TS, TQ).
 */

import { R_GAS, T_STD, P_STD, EPSILON } from '../math/constants.js';
import { ThermodynamicWorkspace } from '../types/memory.js';
import { FlashType, PhaseState } from '../types/flash.js';
import { evaluateDippr } from '../registry/dippr.js';
import { createInsideOutParams, initInsideOutParams, updateInsideOutParams, calculateBParameter, selectReferenceComponent } from './inside-out-params.js';
import { solveInsideOutInner } from './inside-out-inner.js';
import { solveRachfordRice } from './rachford-rice.js';
import { assembleFlashResult, calculateIdealGasEnthalpy, calculateIdealGasEntropy } from './properties.js';

/**
 * Solves single-phase 1D temperature inversion for H_spec or S_spec at fixed P:
 * H_phase(T, P) - H_spec = 0  or  S_phase(T, P) - S_spec = 0.
 *
 * @param {import('../types/eos.js').PropertyPackage} eos - Property package
 * @param {number} P - Pressure [Pa]
 * @param {ArrayLike<number>} z - Mole fraction vector (length N)
 * @param {'LIQUID'|'VAPOR'} phase - Phase identifier
 * @param {number} targetValue - Specified H [J/mol] or S [J/(mol*K)]
 * @param {boolean} isEnthalpy - True for enthalpy, false for entropy
 * @param {number} initialT - Initial temperature estimate [K]
 * @param {ThermodynamicWorkspace} ws - Workspace buffer
 * @param {number} [tol=1e-7] - Convergence tolerance
 * @param {number} [maxIter=50] - Maximum iterations
 * @returns {{ T: number, zFactor: number, converged: boolean, iterations: number }}
 */
export function solveSinglePhaseT(
	eos,
	P,
	z,
	phase,
	targetValue,
	isEnthalpy,
	initialT,
	ws,
	tol = 1e-7,
	maxIter = 50
) {
	let T = Math.max(50.0, Math.min(3000.0, initialT));
	let converged = false;
	let iterCount = 0;
	let zFactor = 1.0;
	const N = eos.numComponents;

	for (let iter = 0; iter < maxIter; iter++) {
		iterCount = iter + 1;

		eos.calculateZFactors(T, P, z, ws.zFactors, undefined, ws);
		zFactor = (phase === 'LIQUID') ? ws.zFactors[0] : ws.zFactors[1];

		const dep = eos.calculateDepartures(T, P, z, zFactor);
		let currentVal = 0.0;

		let cpMix = 0.0;
		for (let i = 0; i < N; i++) {
			const comp = eos.compounds[i];
			const cpCorr = comp.cpIdeal;
			const cp_i = cpCorr ? evaluateDippr(cpCorr, T) : 30.0;
			cpMix += z[i] * cp_i;
		}

		if (isEnthalpy) {
			const hIg = calculateIdealGasEnthalpy(eos.compounds, z, T);
			currentVal = hIg + dep.hDep;
		} else {
			const sIg = calculateIdealGasEntropy(eos.compounds, z, T, P);
			currentVal = sIg + dep.sDep;
		}

		const residual = currentVal - targetValue;
		const scale = isEnthalpy ? Math.max(1000.0, Math.abs(targetValue)) : Math.max(10.0, Math.abs(targetValue));

		if (Math.abs(residual) / scale < 1e-7 || Math.abs(residual) < 1e-3) {
			converged = true;
			break;
		}

		// Numerical derivative dVal/dT accounting for both ideal gas and EOS departure temperature dependence
		const tPerturb = T * 1.001;
		eos.calculateZFactors(tPerturb, P, z, ws.zFactors, undefined, ws);
		const zPerturb = (phase === 'LIQUID') ? ws.zFactors[0] : ws.zFactors[1];
		const depPerturb = eos.calculateDepartures(tPerturb, P, z, zPerturb);

		let valPerturb = 0.0;
		if (isEnthalpy) {
			valPerturb = calculateIdealGasEnthalpy(eos.compounds, z, tPerturb) + depPerturb.hDep;
		} else {
			valPerturb = calculateIdealGasEntropy(eos.compounds, z, tPerturb, P) + depPerturb.sDep;
		}

		const dVal_dT = (valPerturb - currentVal) / (tPerturb - T);
		const fallbackDeriv = isEnthalpy ? Math.max(10.0, cpMix) : Math.max(0.01, cpMix / T);
		const deriv = Math.abs(dVal_dT) > 1e-6 ? dVal_dT : fallbackDeriv;
		let deltaT = -residual / deriv;

		// Step damping
		if (deltaT > 0.25 * T) deltaT = 0.25 * T;
		if (deltaT < -0.25 * T) deltaT = -0.25 * T;

		T += deltaT;
		if (T < 20.0) T = 20.0;
		if (T > 4000.0) T = 4000.0;

		if (Math.abs(deltaT) < 1e-6) {
			converged = true;
			break;
		}
	}

	return { T, zFactor, converged, iterations: iterCount };
}

/**
 * Solves single-phase 1D pressure inversion for H_spec or S_spec at fixed T:
 * H_phase(T, P) - H_spec = 0  or  S_phase(T, P) - S_spec = 0.
 *
 * @param {import('../types/eos.js').PropertyPackage} eos - Property package
 * @param {number} T - Temperature [K]
 * @param {ArrayLike<number>} z - Mole fraction vector (length N)
 * @param {'LIQUID'|'VAPOR'} phase - Phase identifier
 * @param {number} targetValue - Specified H [J/mol] or S [J/(mol*K)]
 * @param {boolean} isEnthalpy - True for enthalpy, false for entropy
 * @param {number} initialP - Initial pressure estimate [Pa]
 * @param {ThermodynamicWorkspace} ws - Workspace buffer
 * @param {number} [tol=1e-7] - Convergence tolerance
 * @param {number} [maxIter=50] - Maximum iterations
 * @returns {{ P: number, zFactor: number, converged: boolean, iterations: number }}
 */
export function solveSinglePhaseP(
	eos,
	T,
	z,
	phase,
	targetValue,
	isEnthalpy,
	initialP,
	ws,
	tol = 1e-7,
	maxIter = 50
) {
	let P = Math.max(100.0, Math.min(1e8, initialP));
	let converged = false;
	let iterCount = 0;
	let zFactor = 1.0;

	for (let iter = 0; iter < maxIter; iter++) {
		iterCount = iter + 1;

		eos.calculateZFactors(T, P, z, ws.zFactors, undefined, ws);
		zFactor = (phase === 'LIQUID') ? ws.zFactors[0] : ws.zFactors[1];

		const dep = eos.calculateDepartures(T, P, z, zFactor);
		let currentVal = 0.0;

		if (isEnthalpy) {
			const hIg = calculateIdealGasEnthalpy(eos.compounds, z, T);
			currentVal = hIg + dep.hDep;
		} else {
			const sIg = calculateIdealGasEntropy(eos.compounds, z, T, P);
			currentVal = sIg + dep.sDep;
		}

		const residual = currentVal - targetValue;
		const scale = isEnthalpy ? Math.max(1000.0, Math.abs(targetValue)) : Math.max(10.0, Math.abs(targetValue));

		if (Math.abs(residual) / scale < 1e-7 || Math.abs(residual) < 1e-3) {
			converged = true;
			break;
		}

		// Numerical derivative dVal/dlnP
		const pPerturb = P * 1.001;
		eos.calculateZFactors(T, pPerturb, z, ws.zFactors, undefined, ws);
		const zPerturb = (phase === 'LIQUID') ? ws.zFactors[0] : ws.zFactors[1];
		const depPerturb = eos.calculateDepartures(T, pPerturb, z, zPerturb);

		let valPerturb = 0.0;
		if (isEnthalpy) {
			valPerturb = calculateIdealGasEnthalpy(eos.compounds, z, T) + depPerturb.hDep;
		} else {
			valPerturb = calculateIdealGasEntropy(eos.compounds, z, T, pPerturb) + depPerturb.sDep;
		}

		const dVal_dlnP = (valPerturb - currentVal) / 0.001;
		const dlnP = -residual / (Math.abs(dVal_dlnP) > 1e-6 ? dVal_dlnP : (isEnthalpy ? -100.0 : -R_GAS));

		const clampedDlnP = Math.max(-0.5, Math.min(0.5, dlnP));
		P *= Math.exp(clampedDlnP);

		if (Math.abs(clampedDlnP) < 1e-6) {
			converged = true;
			break;
		}
	}

	return { P, zFactor, converged, iterations: iterCount };
}

/**
 * Executes a full Boston-Britt Inside-Out flash calculation for any specification:
 * (TP, PH, PS, PQ, TH, TS, TQ).
 *
 * @param {import('../types/flash.js').FlashSpec} spec - Flash specification
 * @param {ArrayLike<number>} z - Feed mole fraction vector (length N)
 * @param {import('../types/eos.js').PropertyPackage} eos - Property package
 * @param {import('../types/flash.js').FlashOptions} [options={}] - Flash options
 * @param {ThermodynamicWorkspace} [workspace] - Workspace buffer
 * @returns {import('../types/flash.js').FlashResult} Assembled flash result
 */
export function insideOutFlash(spec, z, eos, options = {}, workspace) {
	const N = eos.numComponents;
	const ws = workspace || (eos instanceof Object && 'workspace' in eos && eos.workspace instanceof ThermodynamicWorkspace ? eos.workspace : new ThermodynamicWorkspace(N));

	const tol = options.tol !== undefined ? options.tol : 1e-6;
	const maxOuterIterations = options.maxIterations !== undefined ? Math.min(250, options.maxIterations) : 100;
	const flashType = spec.type || FlashType.TP;

	// Normalize feed composition into ws.z
	let sumZ = 0.0;
	for (let i = 0; i < N; i++) {
		const zi = Math.max(0.0, z[i]);
		ws.z[i] = zi;
		sumZ += zi;
	}
	const invSumZ = sumZ > 0.0 ? 1.0 / sumZ : 1.0;
	for (let i = 0; i < N; i++) {
		ws.z[i] *= invSumZ;
	}

	// 1. Initial State Estimation
	let T = spec.T !== undefined ? spec.T : 298.15;
	let P = spec.P !== undefined ? spec.P : 101325.0;
	let beta = spec.Q !== undefined ? spec.Q : 0.5;

	// Estimate average Tc
	let tcAvg = 0.0;
	for (let i = 0; i < N; i++) {
		tcAvg += ws.z[i] * eos.compounds[i].tc;
	}

	// Reference component and B parameter
	const b = selectReferenceComponent(eos, ws.z);
	const B_param = calculateBParameter(eos, b);

	// Case A: Isothermal-Isobaric (TP) Flash
	if (flashType === FlashType.TP) {
		T = spec.T || 298.15;
		P = spec.P || 101325.0;

		// Initial K-values from Wilson
		if (options.initialK && options.initialK.length >= N) {
			for (let i = 0; i < N; i++) ws.K[i] = options.initialK[i];
		} else {
			for (let i = 0; i < N; i++) {
				const comp = eos.compounds[i];
				const Tr = T / comp.tc;
				ws.K[i] = Math.exp(Math.log(comp.pc / P) + 5.373 * (1.0 + comp.omega) * (1.0 - 1.0 / Tr));
			}
		}

		let zL = 1.0, zV = 1.0;
		let converged = false;
		let iterations = 0;
		let residual = 1.0;

		for (let iter = 0; iter < maxOuterIterations; iter++) {
			iterations = iter + 1;

			// Solve Rachford-Rice
			const rr = solveRachfordRice(ws.z, ws.K, N, ws.x, ws.y);
			beta = rr.beta;

			if (beta <= 0.0) {
				for (let i = 0; i < N; i++) {
					ws.x[i] = ws.z[i];
					ws.y[i] = ws.z[i] * ws.K[i];
				}
				let sumY = 0.0;
				for (let i = 0; i < N; i++) sumY += ws.y[i];
				if (sumY > 0) {
					const invY = 1.0 / sumY;
					for (let i = 0; i < N; i++) ws.y[i] *= invY;
				}

				eos.calculateZFactors(T, P, ws.x, ws.zFactors, undefined, ws);
				zL = ws.zFactors[0];
				eos.calculateFugacityCoefficients(T, P, ws.x, zL, ws.lnPhiL, undefined, ws);

				eos.calculateZFactors(T, P, ws.y, ws.zFactors, undefined, ws);
				zV = ws.zFactors[1];
				eos.calculateFugacityCoefficients(T, P, ws.y, zV, ws.lnPhiV, undefined, ws);

				residual = 0.0;
				for (let i = 0; i < N; i++) {
					const res_i = Math.abs(Math.log(ws.K[i]) + ws.lnPhiV[i] - ws.lnPhiL[i]);
					if (res_i > residual) residual = res_i;
					ws.K[i] = Math.exp(ws.lnPhiL[i] - ws.lnPhiV[i]);
				}

				let sumZK = 0.0;
				for (let i = 0; i < N; i++) sumZK += ws.z[i] * ws.K[i];
				if (sumZK <= 1.0 + 1e-7 && residual < tol) {
					converged = true;
					break;
				}
				continue;
			}

			if (beta >= 1.0) {
				for (let i = 0; i < N; i++) {
					ws.y[i] = ws.z[i];
					ws.x[i] = ws.z[i] / ws.K[i];
				}
				let sumX = 0.0;
				for (let i = 0; i < N; i++) sumX += ws.x[i];
				if (sumX > 0) {
					const invX = 1.0 / sumX;
					for (let i = 0; i < N; i++) ws.x[i] *= invX;
				}

				eos.calculateZFactors(T, P, ws.y, ws.zFactors, undefined, ws);
				zV = ws.zFactors[1];
				eos.calculateFugacityCoefficients(T, P, ws.y, zV, ws.lnPhiV, undefined, ws);

				eos.calculateZFactors(T, P, ws.x, ws.zFactors, undefined, ws);
				zL = ws.zFactors[0];
				eos.calculateFugacityCoefficients(T, P, ws.x, zL, ws.lnPhiL, undefined, ws);

				residual = 0.0;
				for (let i = 0; i < N; i++) {
					const res_i = Math.abs(Math.log(ws.K[i]) + ws.lnPhiV[i] - ws.lnPhiL[i]);
					if (res_i > residual) residual = res_i;
					ws.K[i] = Math.exp(ws.lnPhiL[i] - ws.lnPhiV[i]);
				}

				let sumZOverK = 0.0;
				for (let i = 0; i < N; i++) sumZOverK += ws.z[i] / ws.K[i];
				if (sumZOverK <= 1.0 + 1e-7 && residual < tol) {
					converged = true;
					break;
				}
				continue;
			}

			// Two-phase
			eos.calculateZFactors(T, P, ws.x, ws.zFactors, undefined, ws);
			zL = ws.zFactors[0];
			eos.calculateFugacityCoefficients(T, P, ws.x, zL, ws.lnPhiL, undefined, ws);

			eos.calculateZFactors(T, P, ws.y, ws.zFactors, undefined, ws);
			zV = ws.zFactors[1];
			eos.calculateFugacityCoefficients(T, P, ws.y, zV, ws.lnPhiV, undefined, ws);

			residual = 0.0;
			for (let i = 0; i < N; i++) {
				const res_i = Math.abs(Math.log(ws.K[i]) + ws.lnPhiV[i] - ws.lnPhiL[i]);
				if (res_i > residual) residual = res_i;
			}

			if (residual < tol) {
				converged = true;
				break;
			}

			// Wegstein acceleration on ln(K)
			if (iter === 0) {
				for (let i = 0; i < N; i++) {
					ws.lnK_prev1[i] = Math.log(ws.K[i]);
					ws.lnK_calc[i] = ws.lnPhiL[i] - ws.lnPhiV[i];
					ws.K[i] = Math.exp(ws.lnK_calc[i]);
				}
			} else {
				for (let i = 0; i < N; i++) {
					const lnK_curr = Math.log(ws.K[i]);
					const lnK_rig_curr = ws.lnPhiL[i] - ws.lnPhiV[i];
					const num = lnK_rig_curr - ws.lnK_calc[i];
					const den = lnK_curr - ws.lnK_prev1[i];
					const s = Math.abs(den) > 1e-12 ? num / den : 0.0;
					let q = Math.abs(s - 1.0) > 1e-6 ? s / (s - 1.0) : 0.0;
					q = Math.max(-5.0, Math.min(0.0, q));

					const lnK_next = (1.0 - q) * lnK_rig_curr + q * lnK_curr;
					ws.lnK_prev1[i] = lnK_curr;
					ws.lnK_calc[i] = lnK_rig_curr;
					ws.K[i] = Math.exp(Math.max(-30.0, Math.min(30.0, lnK_next)));
				}
			}
		}

		return assembleFlashResult(
			T,
			P,
			ws.z,
			beta,
			ws.x,
			ws.y,
			ws.K,
			zL,
			zV,
			ws.lnPhiL,
			ws.lnPhiV,
			eos,
			ws,
			{ converged, iterations, residual }
		);
	}

	// Case B: Isobaric Vapor Fraction (PQ) Flash
	if (flashType === FlashType.PQ) {
		const Q = spec.Q !== undefined ? spec.Q : 0.0;
		P = spec.P || 101325.0;

		let maxZ = 0.0;
		for (let i = 0; i < N; i++) {
			if (ws.z[i] > maxZ) maxZ = ws.z[i];
		}
		const isPure = (N === 1 || maxZ > 0.99999);

		// Initial Wilson estimation for bubble and dew points
		let tBub = tcAvg * 0.7;
		for (let k = 0; k < 15; k++) {
			let sumZK = 0.0, dSum_dT = 0.0;
			for (let i = 0; i < N; i++) {
				const c = eos.compounds[i];
				const Tr = tBub / c.tc;
				const Ki = Math.exp(Math.log(c.pc / P) + 5.373 * (1.0 + c.omega) * (1.0 - 1.0 / Tr));
				sumZK += ws.z[i] * Ki;
				dSum_dT += ws.z[i] * Ki * (5.373 * (1.0 + c.omega) * c.tc / (tBub * tBub));
			}
			const diff = sumZK - 1.0;
			if (Math.abs(diff) < 1e-4) break;
			const delta = diff / (dSum_dT !== 0 ? dSum_dT : 1.0);
			const clampedDelta = Math.max(-0.2 * tBub, Math.min(0.2 * tBub, delta));
			tBub -= clampedDelta;
			if (tBub < 20.0) tBub = 20.0;
		}

		let tDew = tcAvg * 0.85;
		for (let k = 0; k < 15; k++) {
			let sumZOverK = 0.0, dSum_dT = 0.0;
			for (let i = 0; i < N; i++) {
				const c = eos.compounds[i];
				const Tr = tDew / c.tc;
				const Ki = Math.exp(Math.log(c.pc / P) + 5.373 * (1.0 + c.omega) * (1.0 - 1.0 / Tr));
				sumZOverK += ws.z[i] / Ki;
				dSum_dT -= (ws.z[i] / Ki) * (5.373 * (1.0 + c.omega) * c.tc / (tDew * tDew));
			}
			const diff = sumZOverK - 1.0;
			if (Math.abs(diff) < 1e-4) break;
			const delta = diff / (dSum_dT !== 0 ? dSum_dT : 1.0);
			const clampedDelta = Math.max(-0.2 * tDew, Math.min(0.2 * tDew, delta));
			tDew -= clampedDelta;
			if (tDew < 20.0) tDew = 20.0;
		}

		if (!isPure && tDew > tcAvg * 1.35) {
			tDew = tcAvg * 1.25;
		}

		T = (1.0 - Q) * tBub + Q * tDew;
		if (isNaN(T) || T < 20.0) T = tcAvg * 0.75;

		let converged = false;
		let iterations = 0;
		let residual = 1.0;
		let zL = 1.0, zV = 1.0;

		// Initial y or x
		if (Q === 0.0) {
			for (let i = 0; i < N; i++) {
				ws.x[i] = ws.z[i];
				const c = eos.compounds[i];
				ws.K[i] = Math.exp(Math.log(c.pc / P) + 5.373 * (1.0 + c.omega) * (1.0 - c.tc / T));
				ws.y[i] = ws.z[i] * ws.K[i];
			}
			let sumY = 0.0;
			for (let i = 0; i < N; i++) sumY += ws.y[i];
			if (sumY > 0) for (let i = 0; i < N; i++) ws.y[i] /= sumY;
		} else if (Q === 1.0) {
			for (let i = 0; i < N; i++) {
				ws.y[i] = ws.z[i];
				const c = eos.compounds[i];
				ws.K[i] = Math.exp(Math.log(c.pc / P) + 5.373 * (1.0 + c.omega) * (1.0 - c.tc / T));
				ws.x[i] = ws.z[i] / ws.K[i];
			}
			let sumX = 0.0;
			for (let i = 0; i < N; i++) sumX += ws.x[i];
			if (sumX > 0) for (let i = 0; i < N; i++) ws.x[i] /= sumX;
		} else {
			for (let i = 0; i < N; i++) {
				const c = eos.compounds[i];
				ws.K[i] = Math.exp(Math.log(c.pc / P) + 5.373 * (1.0 + c.omega) * (1.0 - c.tc / T));
			}
			solveRachfordRice(ws.z, ws.K, Q, ws.x, ws.y, N);
		}

		for (let iter = 0; iter < maxOuterIterations; iter++) {
			iterations = iter + 1;

			if (Q === 0.0) {
				// Bubble Point: x = z fixed
				for (let i = 0; i < N; i++) ws.x[i] = ws.z[i];
				eos.calculateZFactors(T, P, ws.x, ws.zFactors, undefined, ws);
				zL = ws.zFactors[0];
				eos.calculateFugacityCoefficients(T, P, ws.x, zL, ws.lnPhiL, undefined, ws);

				eos.calculateZFactors(T, P, ws.y, ws.zFactors, undefined, ws);
				zV = ws.zFactors[1];
				eos.calculateFugacityCoefficients(T, P, ws.y, zV, ws.lnPhiV, undefined, ws);

				let S = 0.0;
				for (let i = 0; i < N; i++) {
					const lnKi = ws.lnPhiL[i] - ws.lnPhiV[i];
					ws.K[i] = Math.exp(lnKi);
					S += ws.z[i] * ws.K[i];
				}

				if (Math.abs(zV - zL) < 1e-4) {
					T *= 0.95;
					for (let i = 0; i < N; i++) {
						const c = eos.compounds[i];
						ws.K[i] = Math.exp(Math.log(c.pc / P) + 5.373 * (1.0 + c.omega) * (1.0 - c.tc / T));
						ws.y[i] = ws.z[i] * ws.K[i];
					}
					let sumY = 0.0;
					for (let i = 0; i < N; i++) sumY += ws.y[i];
					if (sumY > 0) for (let i = 0; i < N; i++) ws.y[i] /= sumY;
					continue;
				}

				let compRes = 0.0;
				for (let i = 0; i < N; i++) {
					const yTarget = (ws.z[i] * ws.K[i]) / S;
					const diff = Math.abs(ws.y[i] - yTarget);
					if (diff > compRes) compRes = diff;
					ws.y[i] = yTarget;
				}

				residual = Math.max(Math.abs(S - 1.0), compRes);
				const isNonTrivial = (zV - zL > 1e-4);
				if (residual < tol && isNonTrivial) {
					converged = true;
					break;
				}

				const deltaT = (T * T * Math.log(S)) / B_param;
				const clampedDeltaT = Math.max(-0.1 * T, Math.min(0.1 * T, deltaT));
				T += clampedDeltaT;
			} else if (Q === 1.0) {
				// Dew Point: y = z fixed
				for (let i = 0; i < N; i++) ws.y[i] = ws.z[i];
				eos.calculateZFactors(T, P, ws.y, ws.zFactors, undefined, ws);
				zV = ws.zFactors[1];
				eos.calculateFugacityCoefficients(T, P, ws.y, zV, ws.lnPhiV, undefined, ws);

				eos.calculateZFactors(T, P, ws.x, ws.zFactors, undefined, ws);
				zL = ws.zFactors[0];
				eos.calculateFugacityCoefficients(T, P, ws.x, zL, ws.lnPhiL, undefined, ws);

				let S = 0.0;
				for (let i = 0; i < N; i++) {
					const lnKi = ws.lnPhiL[i] - ws.lnPhiV[i];
					ws.K[i] = Math.exp(lnKi);
					S += ws.z[i] / ws.K[i];
				}

				if (Math.abs(zV - zL) < 1e-4) {
					T = Math.min(T - 5.0, tcAvg * 1.25);
					for (let i = 0; i < N; i++) {
						const c = eos.compounds[i];
						ws.K[i] = Math.exp(Math.log(c.pc / P) + 5.373 * (1.0 + c.omega) * (1.0 - c.tc / T));
						ws.x[i] = ws.z[i] / ws.K[i];
					}
					let sumX = 0.0;
					for (let i = 0; i < N; i++) sumX += ws.x[i];
					if (sumX > 0) for (let i = 0; i < N; i++) ws.x[i] /= sumX;
					continue;
				}

				let compRes = 0.0;
				for (let i = 0; i < N; i++) {
					const xTarget = (ws.z[i] / ws.K[i]) / S;
					const diff = Math.abs(ws.x[i] - xTarget);
					if (diff > compRes) compRes = diff;
					ws.x[i] = xTarget;
				}

				residual = Math.max(Math.abs(S - 1.0), compRes);
				const isNonTrivial = (zV - zL > 1e-4);
				if (residual < tol && isNonTrivial) {
					converged = true;
					break;
				}

				const deltaT = -(T * T * Math.log(S)) / B_param;
				const clampedDeltaT = Math.max(-0.08 * T, Math.min(0.08 * T, deltaT));
				T += clampedDeltaT;
			} else {
				// Intermediate 0 < Q < 1: Inside-Out loop
				const params = createInsideOutParams(eos, ws);
				initInsideOutParams(eos, ws.z, T, P, params, ws);

				eos.calculateZFactors(T, P, ws.x, ws.zFactors, undefined, ws);
				zL = ws.zFactors[0];
				eos.calculateFugacityCoefficients(T, P, ws.x, zL, ws.lnPhiL, undefined, ws);

				eos.calculateZFactors(T, P, ws.y, ws.zFactors, undefined, ws);
				zV = ws.zFactors[1];
				eos.calculateFugacityCoefficients(T, P, ws.y, zV, ws.lnPhiV, undefined, ws);

				residual = 0.0;
				for (let i = 0; i < N; i++) {
					const lnK_rig = ws.lnPhiL[i] - ws.lnPhiV[i];
					ws.temp1[i] = Math.exp(lnK_rig);
					const res_i = Math.abs(Math.log(Math.max(1e-30, ws.K[i])) - lnK_rig);
					if (isNaN(res_i)) residual = 1.0;
					else if (res_i > residual) residual = res_i;
				}

				const isNonTrivial = (zV - zL > 1e-4);
				if (residual < tol && isNonTrivial) {
					converged = true;
					break;
				}

				updateInsideOutParams(eos, T, P, ws.x, ws.y, ws.temp1, zL, zV, params, ws);
				const innerRes = solveInsideOutInner(spec, ws.z, params, eos, ws.x, ws.y, ws.K, Q, 0.0, 1e-10, 30);
				T = innerRes.T;
			}
		}

		return assembleFlashResult(
			T,
			P,
			ws.z,
			Q,
			ws.x,
			ws.y,
			ws.K,
			zL,
			zV,
			ws.lnPhiL,
			ws.lnPhiV,
			eos,
			ws,
			{ converged, iterations, residual }
		);
	}

	// Case C: Isothermal Vapor Fraction (TQ) Flash (Bubble & Dew Pressures)
	if (flashType === FlashType.TQ) {
		const Q = spec.Q !== undefined ? spec.Q : 0.0;
		T = spec.T || 298.15;

		let maxZ = 0.0;
		for (let i = 0; i < N; i++) {
			if (ws.z[i] > maxZ) maxZ = ws.z[i];
		}
		const isPure = (N === 1 || maxZ > 0.99999);

		// Initial Wilson estimation for bubble and dew pressures
		let pBub = 0.0, pDew = 0.0;
		let sumZOverK = 0.0;
		for (let i = 0; i < N; i++) {
			const comp = eos.compounds[i];
			const Tr = T / comp.tc;
			const pSat_i = comp.pc * Math.exp(5.373 * (1.0 + comp.omega) * (1.0 - 1.0 / Tr));
			pBub += ws.z[i] * pSat_i;
			sumZOverK += ws.z[i] / pSat_i;
		}
		pDew = 1.0 / sumZOverK;

		P = (1.0 - Q) * pBub + Q * pDew;
		if (isNaN(P) || P < 100.0) P = 101325.0;

		let converged = false;
		let iterations = 0;
		let residual = 1.0;
		let zL = 1.0, zV = 1.0;

		if (Q === 0.0) {
			for (let i = 0; i < N; i++) {
				ws.x[i] = ws.z[i];
				const comp = eos.compounds[i];
				ws.K[i] = Math.exp(Math.log(comp.pc / P) + 5.373 * (1.0 + comp.omega) * (1.0 - comp.tc / T));
				ws.y[i] = ws.z[i] * ws.K[i];
			}
			let sumY = 0.0;
			for (let i = 0; i < N; i++) sumY += ws.y[i];
			if (sumY > 0) for (let i = 0; i < N; i++) ws.y[i] /= sumY;
		} else if (Q === 1.0) {
			for (let i = 0; i < N; i++) {
				ws.y[i] = ws.z[i];
				const comp = eos.compounds[i];
				ws.K[i] = Math.exp(Math.log(comp.pc / P) + 5.373 * (1.0 + comp.omega) * (1.0 - comp.tc / T));
				ws.x[i] = ws.z[i] / ws.K[i];
			}
			let sumX = 0.0;
			for (let i = 0; i < N; i++) sumX += ws.x[i];
			if (sumX > 0) for (let i = 0; i < N; i++) ws.x[i] /= sumX;
		} else {
			for (let i = 0; i < N; i++) {
				const comp = eos.compounds[i];
				ws.K[i] = Math.exp(Math.log(comp.pc / P) + 5.373 * (1.0 + comp.omega) * (1.0 - comp.tc / T));
			}
			solveRachfordRice(ws.z, ws.K, Q, ws.x, ws.y, N);
		}

		for (let iter = 0; iter < maxOuterIterations; iter++) {
			iterations = iter + 1;

			if (Q === 0.0) {
				for (let i = 0; i < N; i++) ws.x[i] = ws.z[i];
				eos.calculateZFactors(T, P, ws.x, ws.zFactors, undefined, ws);
				zL = ws.zFactors[0];
				eos.calculateFugacityCoefficients(T, P, ws.x, zL, ws.lnPhiL, undefined, ws);

				eos.calculateZFactors(T, P, ws.y, ws.zFactors, undefined, ws);
				zV = ws.zFactors[1];
				eos.calculateFugacityCoefficients(T, P, ws.y, zV, ws.lnPhiV, undefined, ws);

				let S = 0.0;
				for (let i = 0; i < N; i++) {
					const lnKi = ws.lnPhiL[i] - ws.lnPhiV[i];
					ws.K[i] = Math.exp(lnKi);
					S += ws.z[i] * ws.K[i];
				}

				let compRes = 0.0;
				for (let i = 0; i < N; i++) {
					const yTarget = (ws.z[i] * ws.K[i]) / S;
					const diff = Math.abs(ws.y[i] - yTarget);
					if (diff > compRes) compRes = diff;
					ws.y[i] = yTarget;
				}

				residual = Math.max(Math.abs(S - 1.0), compRes);
				const isNonTrivial = (zV - zL > 1e-4);
				if (residual < tol && isNonTrivial) {
					converged = true;
					break;
				}

				P *= S;
			} else if (Q === 1.0) {
				for (let i = 0; i < N; i++) ws.y[i] = ws.z[i];
				eos.calculateZFactors(T, P, ws.y, ws.zFactors, undefined, ws);
				zV = ws.zFactors[1];
				eos.calculateFugacityCoefficients(T, P, ws.y, zV, ws.lnPhiV, undefined, ws);

				eos.calculateZFactors(T, P, ws.x, ws.zFactors, undefined, ws);
				zL = ws.zFactors[0];
				eos.calculateFugacityCoefficients(T, P, ws.x, zL, ws.lnPhiL, undefined, ws);

				let S = 0.0;
				for (let i = 0; i < N; i++) {
					const lnKi = ws.lnPhiL[i] - ws.lnPhiV[i];
					ws.K[i] = Math.exp(lnKi);
					S += ws.z[i] / ws.K[i];
				}

				let compRes = 0.0;
				for (let i = 0; i < N; i++) {
					const xTarget = (ws.z[i] / ws.K[i]) / S;
					const diff = Math.abs(ws.x[i] - xTarget);
					if (diff > compRes) compRes = diff;
					ws.x[i] = xTarget;
				}

				residual = Math.max(Math.abs(S - 1.0), compRes);
				const isNonTrivial = (zV - zL > 1e-4);
				if (residual < tol && isNonTrivial) {
					converged = true;
					break;
				}

				P /= S;
			} else {
				const params = createInsideOutParams(eos, ws);
				initInsideOutParams(eos, ws.z, T, P, params, ws);

				eos.calculateZFactors(T, P, ws.x, ws.zFactors, undefined, ws);
				zL = ws.zFactors[0];
				eos.calculateFugacityCoefficients(T, P, ws.x, zL, ws.lnPhiL, undefined, ws);

				eos.calculateZFactors(T, P, ws.y, ws.zFactors, undefined, ws);
				zV = ws.zFactors[1];
				eos.calculateFugacityCoefficients(T, P, ws.y, zV, ws.lnPhiV, undefined, ws);

				residual = 0.0;
				for (let i = 0; i < N; i++) {
					const lnK_rig = ws.lnPhiL[i] - ws.lnPhiV[i];
					ws.temp1[i] = Math.exp(lnK_rig);
					const res_i = Math.abs(Math.log(Math.max(1e-30, ws.K[i])) - lnK_rig);
					if (isNaN(res_i)) residual = 1.0;
					else if (res_i > residual) residual = res_i;
				}

				const isNonTrivial = (zV - zL > 1e-4);
				if (residual < tol && isNonTrivial) {
					converged = true;
					break;
				}

				updateInsideOutParams(eos, T, P, ws.x, ws.y, ws.temp1, zL, zV, params, ws);
				const innerRes = solveInsideOutInner(spec, ws.z, params, eos, ws.x, ws.y, ws.K, Q, 0.0, 1e-10, 30);
				P = innerRes.P;
			}
		}

		return assembleFlashResult(
			T,
			P,
			ws.z,
			Q,
			ws.x,
			ws.y,
			ws.K,
			zL,
			zV,
			ws.lnPhiL,
			ws.lnPhiV,
			eos,
			ws,
			{ converged, iterations, residual }
		);
	}

	// Case D: PH / PS Flash (Isobaric State Inversions)
	if (flashType === FlashType.PH || flashType === FlashType.PS) {
		const isEnthalpy = (flashType === FlashType.PH);
		const targetSpec = isEnthalpy ? (spec.H !== undefined ? spec.H : 0.0) : (spec.S !== undefined ? spec.S : 0.0);
		P = spec.P || 101325.0;

		// Calculate Wilson bubble and dew temperatures
		let tBub = tcAvg * 0.7;
		for (let k = 0; k < 15; k++) {
			let sumZK = 0.0, dSum_dT = 0.0;
			for (let i = 0; i < N; i++) {
				const c = eos.compounds[i];
				const Tr = tBub / c.tc;
				const Ki = Math.exp(Math.log(c.pc / P) + 5.373 * (1.0 + c.omega) * (1.0 - 1.0 / Tr));
				sumZK += ws.z[i] * Ki;
				dSum_dT += ws.z[i] * Ki * (5.373 * (1.0 + c.omega) * c.tc / (tBub * tBub));
			}
			const diff = sumZK - 1.0;
			if (Math.abs(diff) < 1e-4) break;
			const delta = diff / (dSum_dT !== 0 ? dSum_dT : 1.0);
			const clampedDelta = Math.max(-0.2 * tBub, Math.min(0.2 * tBub, delta));
			tBub -= clampedDelta;
			if (tBub < 20.0) tBub = 20.0;
		}

		let tDew = tcAvg * 0.85;
		for (let k = 0; k < 15; k++) {
			let sumZOverK = 0.0, dSum_dT = 0.0;
			for (let i = 0; i < N; i++) {
				const c = eos.compounds[i];
				const Tr = tDew / c.tc;
				const Ki = Math.exp(Math.log(c.pc / P) + 5.373 * (1.0 + c.omega) * (1.0 - 1.0 / Tr));
				sumZOverK += ws.z[i] / Ki;
				dSum_dT -= (ws.z[i] / Ki) * (5.373 * (1.0 + c.omega) * c.tc / (tDew * tDew));
			}
			const diff = sumZOverK - 1.0;
			if (Math.abs(diff) < 1e-4) break;
			const delta = diff / (dSum_dT !== 0 ? dSum_dT : 1.0);
			const clampedDelta = Math.max(-0.2 * tDew, Math.min(0.2 * tDew, delta));
			tDew -= clampedDelta;
			if (tDew < 20.0) tDew = 20.0;
		}

		// Calculate property at Wilson bubble point
		eos.calculateZFactors(tBub, P, ws.z, ws.zFactors, undefined, ws);
		const zLBub = ws.zFactors[0];
		const depBub = eos.calculateDepartures(tBub, P, ws.z, zLBub);
		const propBub = isEnthalpy ?
			(calculateIdealGasEnthalpy(eos.compounds, ws.z, tBub) + depBub.hDep) :
			(calculateIdealGasEntropy(eos.compounds, ws.z, tBub, P) + depBub.sDep);

		// Calculate property at Wilson dew point
		eos.calculateZFactors(tDew, P, ws.z, ws.zFactors, undefined, ws);
		const zVDew = ws.zFactors[1];
		const depDew = eos.calculateDepartures(tDew, P, ws.z, zVDew);
		const propDew = isEnthalpy ?
			(calculateIdealGasEnthalpy(eos.compounds, ws.z, tDew) + depDew.hDep) :
			(calculateIdealGasEntropy(eos.compounds, ws.z, tDew, P) + depDew.sDep);

		// If target < propBub: Subcooled liquid
		if (targetSpec < propBub) {
			const singleL = solveSinglePhaseT(eos, P, ws.z, 'LIQUID', targetSpec, isEnthalpy, tBub * 0.95, ws);
			eos.calculateFugacityCoefficients(singleL.T, P, ws.z, singleL.zFactor, ws.lnPhiL, undefined, ws);
			for (let i = 0; i < N; i++) {
				ws.x[i] = ws.z[i];
				ws.y[i] = ws.z[i];
				ws.K[i] = 1.0;
				ws.lnPhiV[i] = ws.lnPhiL[i];
			}
			return assembleFlashResult(singleL.T, P, ws.z, 0.0, ws.x, ws.y, ws.K, singleL.zFactor, singleL.zFactor, ws.lnPhiL, ws.lnPhiV, eos, ws, {
				converged: singleL.converged,
				iterations: singleL.iterations,
				residual: 0.0
			});
		}

		// If target > propDew: Superheated vapor
		if (targetSpec > propDew) {
			const initialGuessT = spec.T !== undefined ? spec.T : Math.max(300.0, tDew * 1.1);
			const singleV = solveSinglePhaseT(eos, P, ws.z, 'VAPOR', targetSpec, isEnthalpy, initialGuessT, ws);
			eos.calculateFugacityCoefficients(singleV.T, P, ws.z, singleV.zFactor, ws.lnPhiV, undefined, ws);
			for (let i = 0; i < N; i++) {
				ws.x[i] = ws.z[i];
				ws.y[i] = ws.z[i];
				ws.K[i] = 1.0;
				ws.lnPhiL[i] = ws.lnPhiV[i];
			}
			return assembleFlashResult(singleV.T, P, ws.z, 1.0, ws.x, ws.y, ws.K, singleV.zFactor, singleV.zFactor, ws.lnPhiL, ws.lnPhiV, eos, ws, {
				converged: singleV.converged,
				iterations: singleV.iterations,
				residual: 0.0
			});
		}

		// Two-phase initial estimate
		beta = Math.max(0.01, Math.min(0.99, (targetSpec - propBub) / (propDew - propBub)));
		T = (1.0 - beta) * tBub + beta * tDew;

		const params = createInsideOutParams(eos, ws);
		initInsideOutParams(eos, ws.z, T, P, params, ws);

		for (let i = 0; i < N; i++) {
			const comp = eos.compounds[i];
			const Tr = T / comp.tc;
			ws.K[i] = Math.exp(Math.log(comp.pc / P) + 5.373 * (1.0 + comp.omega) * (1.0 - 1.0 / Tr));
			const den = 1.0 + beta * (ws.K[i] - 1.0);
			ws.x[i] = ws.z[i] / den;
			ws.y[i] = ws.x[i] * ws.K[i];
		}

		let zL = 1.0, zV = 1.0;
		let converged = false;
		let iterations = 0;
		let residual = 1.0;

		for (let iter = 0; iter < maxOuterIterations; iter++) {
			iterations = iter + 1;

			eos.calculateZFactors(T, P, ws.x, ws.zFactors, undefined, ws);
			zL = ws.zFactors[0];
			eos.calculateFugacityCoefficients(T, P, ws.x, zL, ws.lnPhiL, undefined, ws);

			eos.calculateZFactors(T, P, ws.y, ws.zFactors, undefined, ws);
			zV = ws.zFactors[1];
			eos.calculateFugacityCoefficients(T, P, ws.y, zV, ws.lnPhiV, undefined, ws);

			residual = 0.0;
			for (let i = 0; i < N; i++) {
				const lnK_rig = ws.lnPhiL[i] - ws.lnPhiV[i];
				ws.temp1[i] = Math.exp(lnK_rig);
				const res_i = Math.abs(Math.log(Math.max(1e-30, ws.K[i])) - lnK_rig);
				if (res_i > residual) residual = res_i;
			}

			if (residual < tol) {
				converged = true;
				break;
			}

			updateInsideOutParams(eos, T, P, ws.x, ws.y, ws.temp1, zL, zV, params, ws);

			const innerRes = solveInsideOutInner(
				spec,
				ws.z,
				params,
				eos,
				ws.x,
				ws.y,
				ws.K,
				beta,
				0.0,
				1e-10,
				30
			);

			beta = innerRes.beta;
			T = innerRes.T;

			if (beta <= 0.0) {
				const singleL = solveSinglePhaseT(eos, P, ws.z, 'LIQUID', targetSpec, isEnthalpy, T, ws);
				eos.calculateFugacityCoefficients(singleL.T, P, ws.z, singleL.zFactor, ws.lnPhiL, undefined, ws);
				for (let i = 0; i < N; i++) {
					ws.x[i] = ws.z[i];
					ws.y[i] = ws.z[i];
					ws.K[i] = 1.0;
					ws.lnPhiV[i] = ws.lnPhiL[i];
				}
				return assembleFlashResult(singleL.T, P, ws.z, 0.0, ws.x, ws.y, ws.K, singleL.zFactor, singleL.zFactor, ws.lnPhiL, ws.lnPhiV, eos, ws, {
					converged: singleL.converged,
					iterations: iterations + singleL.iterations,
					residual: 0.0
				});
			}

			if (beta >= 1.0) {
				const singleV = solveSinglePhaseT(eos, P, ws.z, 'VAPOR', targetSpec, isEnthalpy, T, ws);
				eos.calculateFugacityCoefficients(singleV.T, P, ws.z, singleV.zFactor, ws.lnPhiV, undefined, ws);
				for (let i = 0; i < N; i++) {
					ws.x[i] = ws.z[i];
					ws.y[i] = ws.z[i];
					ws.K[i] = 1.0;
					ws.lnPhiL[i] = ws.lnPhiV[i];
				}
				return assembleFlashResult(singleV.T, P, ws.z, 1.0, ws.x, ws.y, ws.K, singleV.zFactor, singleV.zFactor, ws.lnPhiL, ws.lnPhiV, eos, ws, {
					converged: singleV.converged,
					iterations: iterations + singleV.iterations,
					residual: 0.0
				});
			}
		}

		return assembleFlashResult(
			T,
			P,
			ws.z,
			beta,
			ws.x,
			ws.y,
			ws.K,
			zL,
			zV,
			ws.lnPhiL,
			ws.lnPhiV,
			eos,
			ws,
			{ converged, iterations, residual }
		);
	}

	// Case E: TH / TS Flash (Isothermal State Inversions)
	if (flashType === FlashType.TH || flashType === FlashType.TS) {
		const isEnthalpy = (flashType === FlashType.TH);
		const targetSpec = isEnthalpy ? (spec.H !== undefined ? spec.H : 0.0) : (spec.S !== undefined ? spec.S : 0.0);
		T = spec.T || 298.15;

		const single = solveSinglePhaseP(eos, T, ws.z, 'VAPOR', targetSpec, isEnthalpy, 101325.0, ws);
		eos.calculateFugacityCoefficients(T, single.P, ws.z, single.zFactor, ws.lnPhiV, undefined, ws);
		for (let i = 0; i < N; i++) {
			ws.x[i] = ws.z[i];
			ws.y[i] = ws.z[i];
			ws.K[i] = 1.0;
			ws.lnPhiL[i] = ws.lnPhiV[i];
		}
		return assembleFlashResult(T, single.P, ws.z, 1.0, ws.x, ws.y, ws.K, single.zFactor, single.zFactor, ws.lnPhiL, ws.lnPhiV, eos, ws, {
			converged: single.converged,
			iterations: single.iterations,
			residual: 0.0
		});
	}

	throw new Error(`Unsupported flash specification type: ${flashType}`);
}
