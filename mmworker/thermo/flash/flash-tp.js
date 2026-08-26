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
 * @fileoverview High-performance zero-allocation Isothermal-Isobaric (T-P) Flash Engine with DEM acceleration.
 */

import { ThermodynamicWorkspace } from '../types/memory.js';
import { solveRachfordRice } from './rachford-rice.js';
import { assembleFlashResult } from './properties.js';

/**
 * Solves the isothermal-isobaric (T-P) two-phase equilibrium flash for multicomponent mixtures.
 *
 * Executes with zero transient array or object allocations in the inner convergence loop.
 *
 * @param {number} T - System temperature [K]
 * @param {number} P - System pressure [Pa]
 * @param {ArrayLike<number>} z - Feed mole fraction vector (length N)
 * @param {import('../types/eos.js').PropertyPackage} eos - Property package instance (e.g., PengRobinson)
 * @param {import('../types/flash.js').FlashOptions} [options={}] - Flash configuration options
 * @param {ThermodynamicWorkspace} [workspace] - Pre-allocated workspace buffer
 * @returns {import('../types/flash.js').FlashResult} Assembled flash result
 */
export function flashTP(T, P, z, eos, options = {}, workspace) {
	const N = eos.numComponents;
	const ws = workspace || (eos instanceof Object && 'workspace' in eos && eos.workspace instanceof ThermodynamicWorkspace ? eos.workspace : new ThermodynamicWorkspace(N));

	const tol = options.tol !== undefined ? options.tol : 1e-8;
	const maxIterations = options.maxIterations !== undefined ? options.maxIterations : 200;
	const useAcceleration = options.acceleration !== false;
	const damping = options.damping !== undefined ? Math.max(0.1, Math.min(1.0, options.damping)) : 1.0;

	// Copy and normalize feed composition z into workspace
	let sumZ = 0.0;
	for (let i = 0; i < N; i++) {
		sumZ += z[i];
	}
	const invSumZ = sumZ > 0.0 ? 1.0 / sumZ : 1.0;
	for (let i = 0; i < N; i++) {
		ws.z[i] = z[i] * invSumZ;
	}

	// Step 1: Initialize K-values via Wilson correlation or user custom initialK
	if (options.initialK && options.initialK.length >= N) {
		for (let i = 0; i < N; i++) {
			ws.K[i] = options.initialK[i];
		}
	} else {
		for (let i = 0; i < N; i++) {
			const comp = eos.compounds[i];
			const Tr = T / comp.tc;
			const lnKWilson = Math.log(comp.pc / P) + 5.373 * (1.0 + comp.omega) * (1.0 - 1.0 / Tr);
			ws.K[i] = Math.exp(lnKWilson);
		}
	}

	// Successive Substitution Iteration (SSI) Loop with DEM acceleration
	let beta = 0.0;
	let zL = 1.0;
	let zV = 1.0;
	let converged = false;
	let iterations = 0;
	let residual = 1.0;
	let stepCount = 0;

	for (let iter = 0; iter < maxIterations; iter++) {
		iterations = iter + 1;

		// Step 2a: Solve Rachford-Rice objective function for vapor fraction beta
		const rr = solveRachfordRice(ws.z, ws.K, N, ws.x, ws.y);
		beta = rr.beta;

		// Step 2b: Handle single-phase liquid limit (beta = 0)
		if (beta <= 0.0) {
			for (let i = 0; i < N; i++) {
				ws.x[i] = ws.z[i];
				ws.y[i] = ws.z[i] * ws.K[i];
			}
			let sumY = 0.0;
			for (let i = 0; i < N; i++) {
				sumY += ws.y[i];
			}
			if (sumY > 0.0) {
				const invSumY = 1.0 / sumY;
				for (let i = 0; i < N; i++) {
					ws.y[i] *= invSumY;
				}
			}

			// Liquid phase fugacity at actual composition x = z
			eos.calculateZFactors(T, P, ws.x, ws.zFactors, undefined, ws);
			zL = ws.zFactors[0];
			eos.calculateFugacityCoefficients(T, P, ws.x, zL, ws.lnPhiL, undefined, ws);

			// Incipient vapor phase fugacity at incipient composition y
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
			for (let i = 0; i < N; i++) {
				sumZK += ws.z[i] * ws.K[i];
			}

			if (sumZK <= 1.0 + 1e-7 && residual < tol) {
				converged = true;
				break;
			}
			stepCount = 0;
			continue;
		}

		// Step 2c: Handle single-phase vapor limit (beta = 1)
		if (beta >= 1.0) {
			for (let i = 0; i < N; i++) {
				ws.y[i] = ws.z[i];
				ws.x[i] = ws.z[i] / ws.K[i];
			}
			let sumX = 0.0;
			for (let i = 0; i < N; i++) {
				sumX += ws.x[i];
			}
			if (sumX > 0.0) {
				const invSumX = 1.0 / sumX;
				for (let i = 0; i < N; i++) {
					ws.x[i] *= invSumX;
				}
			}

			// Vapor phase fugacity at actual composition y = z
			eos.calculateZFactors(T, P, ws.y, ws.zFactors, undefined, ws);
			zV = ws.zFactors[1];
			eos.calculateFugacityCoefficients(T, P, ws.y, zV, ws.lnPhiV, undefined, ws);

			// Incipient liquid phase fugacity at incipient composition x
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
			for (let i = 0; i < N; i++) {
				sumZOverK += ws.z[i] / ws.K[i];
			}

			if (sumZOverK <= 1.0 + 1e-7 && residual < tol) {
				converged = true;
				break;
			}
			stepCount = 0;
			continue;
		}

		// Step 2d: Two-phase equilibrium (0 < beta < 1)
		// x and y were populated in-place by solveRachfordRice
		eos.calculateZFactors(T, P, ws.x, ws.zFactors, undefined, ws);
		zL = ws.zFactors[0];
		eos.calculateFugacityCoefficients(T, P, ws.x, zL, ws.lnPhiL, undefined, ws);

		eos.calculateZFactors(T, P, ws.y, ws.zFactors, undefined, ws);
		zV = ws.zFactors[1];
		eos.calculateFugacityCoefficients(T, P, ws.y, zV, ws.lnPhiV, undefined, ws);

		// Convergence criterion: max_i |ln(K_i) + ln(phi_V,i) - ln(phi_L,i)| < tol
		residual = 0.0;
		for (let i = 0; i < N; i++) {
			const res_i = Math.abs(Math.log(ws.K[i]) + ws.lnPhiV[i] - ws.lnPhiL[i]);
			if (res_i > residual) residual = res_i;
		}

		if (residual < tol) {
			converged = true;
			break;
		}

		// Step 3: Trivial solution protection (K_i -> 1.0 for all components)
		let sumLnK2 = 0.0;
		for (let i = 0; i < N; i++) {
			const lnKi = Math.log(ws.K[i]);
			sumLnK2 += lnKi * lnKi;
		}

		if (sumLnK2 < 1e-6) {
			// Perturb K-values to break away from trivial homogeneous root
			for (let i = 0; i < N; i++) {
				const comp = eos.compounds[i];
				const Tr = T / comp.tc;
				const lnKWilson = Math.log(comp.pc / P) + 5.373 * (1.0 + comp.omega) * (1.0 - 1.0 / Tr);
				ws.K[i] = Math.exp(lnKWilson * 1.5);
			}
			stepCount = 0;
			continue;
		}

		// Step 4: K-value update with Dominant Eigenvalue Method (DEM) Acceleration
		if (useAcceleration && N > 1) {
			if (stepCount === 0) {
				for (let i = 0; i < N; i++) {
					ws.lnK_prev1[i] = Math.log(ws.K[i]);
					const lnK_calc = ws.lnPhiL[i] - ws.lnPhiV[i];
					ws.K[i] = Math.exp((1.0 - damping) * ws.lnK_prev1[i] + damping * lnK_calc);
				}
				stepCount = 1;
			} else if (stepCount === 1) {
				for (let i = 0; i < N; i++) {
					ws.lnK_prev2[i] = Math.log(ws.K[i]);
					const lnK_calc = ws.lnPhiL[i] - ws.lnPhiV[i];
					ws.K[i] = Math.exp((1.0 - damping) * ws.lnK_prev2[i] + damping * lnK_calc);
				}
				stepCount = 2;
			} else if (stepCount === 2) {
				// DEM Acceleration step using 3 past lnK vectors:
				// u0 = lnK_prev1, u1 = lnK_prev2, u2 = lnK_current
				let dot01 = 0.0;
				let dot00 = 0.0;
				for (let i = 0; i < N; i++) {
					const u2_i = Math.log(ws.K[i]);
					const du0_i = ws.lnK_prev2[i] - ws.lnK_prev1[i];
					const du1_i = u2_i - ws.lnK_prev2[i];
					dot01 += du1_i * du0_i;
					dot00 += du0_i * du0_i;
				}

				const mu = dot00 > 1e-20 ? dot01 / dot00 : 0.0;
				if (mu > 0.0 && mu < 0.999) {
					const factor = Math.min(5.0, mu / (1.0 - mu));
					for (let i = 0; i < N; i++) {
						const u2_i = Math.log(ws.K[i]);
						const du1_i = u2_i - ws.lnK_prev2[i];
						const lnK_calc = ws.lnPhiL[i] - ws.lnPhiV[i];
						const lnK_acc = lnK_calc + factor * du1_i;
						const clampedLnK = Math.max(-30.0, Math.min(30.0, lnK_acc));
						ws.K[i] = Math.exp(clampedLnK);
					}
				} else {
					for (let i = 0; i < N; i++) {
						const lnK_calc = ws.lnPhiL[i] - ws.lnPhiV[i];
						ws.K[i] = Math.exp(lnK_calc);
					}
				}
				stepCount = 0;
			}
		} else {
			for (let i = 0; i < N; i++) {
				const lnK_calc = ws.lnPhiL[i] - ws.lnPhiV[i];
				const lnK_old = Math.log(ws.K[i]);
				ws.K[i] = Math.exp((1.0 - damping) * lnK_old + damping * lnK_calc);
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
