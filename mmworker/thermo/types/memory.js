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
 * @fileoverview Zero-allocation thermodynamic calculation workspace and memory buffer management.
 */

import { createCubicMixtureParams } from '../eos/mixing-rules.js';

/**
 * Pre-allocated contiguous Float64Array memory workspace for multicomponent thermodynamic calculations.
 * Eliminates transient object allocations in flash loops and EOS evaluations.
 */
export class ThermodynamicWorkspace {
	/**
	 * @param {number} numComponents - Number of chemical components
	 */
	constructor(numComponents) {
		if (numComponents <= 0) {
			throw new Error(`Component count must be positive, got: ${numComponents}`);
		}
		this.numComponents = numComponents;

		const N = numComponents;
		const N2 = N * N;

		// Calculate total contiguous Float64 buffer size:
		// 21 vectors of length N + 1 matrix of length N*N + 3 roots + 2 zFactors
		const totalFloats = (21 * N) + N2 + 3 + 2;
		this.buffer = new ArrayBuffer(totalFloats * Float64Array.BYTES_PER_ELEMENT);
		const f64 = new Float64Array(this.buffer);

		let offset = 0;

		/** @type {Float64Array} Feed composition z */
		this.z = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} Liquid 1 composition x */
		this.x = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} Vapor composition y */
		this.y = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} Liquid 2 composition x2 */
		this.x2 = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} K-values (y_i / x_i) */
		this.K = f64.subarray(offset, offset + N); offset += N;

		/** @type {Float64Array} Liquid ln(phi_i) */
		this.lnPhiL = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} Vapor ln(phi_i) */
		this.lnPhiV = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} Liquid 2 ln(phi_i) */
		this.lnPhiL2 = f64.subarray(offset, offset + N); offset += N;

		/** @type {Float64Array} Pure component a_i(T) */
		this.pureA = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} Pure component b_i */
		this.pureB = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} Pure component c_i (Peneloux) */
		this.pureC = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} Pure component da_i/dT */
		this.pureDadT = f64.subarray(offset, offset + N); offset += N;

		/** @type {Float64Array} Summation vector sum_j(z_j * a_ij) */
		this.aSum = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} Temporary vector scratch 1 */
		this.temp1 = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} Temporary vector scratch 2 */
		this.temp2 = f64.subarray(offset, offset + N); offset += N;

		/** @type {Float64Array} DEM acceleration history buffer 1 (lnK_0) */
		this.lnK_prev1 = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} DEM acceleration history buffer 2 (lnK_1) */
		this.lnK_prev2 = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} DEM acceleration computed target (lnK_calc) */
		this.lnK_calc = f64.subarray(offset, offset + N); offset += N;

		/** @type {Float64Array} Boston-Britt relative volatility vector alpha_i */
		this.alpha = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} Boston-Britt inner loop K-values */
		this.ioK = f64.subarray(offset, offset + N); offset += N;
		/** @type {Float64Array} Component ideal gas Cp scratch vector */
		this.cpVect = f64.subarray(offset, offset + N); offset += N;

		/** @type {Float64Array} Flattened N x N cross-parameter matrix a_ij */
		this.aMatrix = f64.subarray(offset, offset + N2); offset += N2;

		/** @type {Float64Array} Cubic polynomial roots (length 3) */
		this.roots = f64.subarray(offset, offset + 3); offset += 3;
		/** @type {Float64Array} Phase Z-factors [zL, zV] (length 2) */
		this.zFactors = f64.subarray(offset, offset + 2); offset += 2;

		/** @type {import('./eos.js').CubicMixtureParams} Reusable mixture parameter struct */
		this.mixtureParams = {
			a: 0.0,
			b: 0.0,
			c: 0.0,
			dadT: 0.0,
			aSum: this.aSum,
			aMatrix: this.aMatrix
		};

		/** @type {import('./eos.js').PhaseDepartures} Reusable departure struct */
		this.departures = {
			hDep: 0.0,
			sDep: 0.0,
			gDep: 0.0
		};

		/** @type {import('./eos.js').PhaseDensity} Reusable density struct */
		this.density = {
			vUntranslated: 0.0,
			vCorr: 0.0,
			rhoMolar: 0.0,
			rhoMass: 0.0
		};
	}
}
