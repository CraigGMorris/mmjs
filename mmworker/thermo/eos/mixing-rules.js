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
 * @fileoverview Classical quadratic mixing rules engine for cubic equations of state.
 */

import { getBip } from '../math/linalg.js';

/**
 * Creates a reusable CubicMixtureParams struct.
 *
 * @param {number} numComponents - Number of components
 * @returns {import('../types/eos.js').CubicMixtureParams}
 */
export function createCubicMixtureParams(numComponents) {
	return {
		a: 0.0,
		b: 0.0,
		c: 0.0,
		dadT: 0.0,
		aSum: new Float64Array(numComponents),
		aMatrix: new Float64Array(numComponents * numComponents)
	};
}

/**
 * Evaluates standard quadratic mixing rules for a_m, b_m, c_m, da_m/dT, and sum_j(z_j * a_ij).
 * Zero-allocation implementation mutating pre-allocated typed arrays in outParams.
 *
 * @param {ArrayLike<number>} z - Mole fraction vector (length N)
 * @param {ArrayLike<number>} pureA - Pure component a_i(T) vector (length N)
 * @param {ArrayLike<number>} pureB - Pure component b_i vector (length N)
 * @param {ArrayLike<number>} pureC - Pure component c_i vector (length N)
 * @param {ArrayLike<number>} pureDadT - Pure component da_i/dT vector (length N)
 * @param {ArrayLike<number>|null|undefined} bipMatrix - Flattened N x N binary interaction parameter matrix (k_ij)
 * @param {number} numComponents - Number of components N
 * @param {import('../types/eos.js').CubicMixtureParams} outParams - Output struct to populate
 * @returns {import('../types/eos.js').CubicMixtureParams} The populated outParams struct
 */
export function calculateCubicMixingRules(
	z,
	pureA,
	pureB,
	pureC,
	pureDadT,
	bipMatrix,
	numComponents,
	outParams
) {
	let bm = 0.0;
	let cm = 0.0;
	let am = 0.0;
	let dadTm = 0.0;

	for (let i = 0; i < numComponents; i++) {
		const zi = z[i];
		bm += zi * pureB[i];
		cm += zi * pureC[i];

		const ai = pureA[i];
		const dai = pureDadT[i];
		let sumAi = 0.0;
		const rowOffset = i * numComponents;

		for (let j = 0; j < numComponents; j++) {
			const zj = z[j];
			const aj = pureA[j];
			const daj = pureDadT[j];
			let aij = 0.0;
			let daij = 0.0;

			if (i === j) {
				aij = ai;
				daij = dai;
			} else {
				const kij = getBip(bipMatrix, i, j, numComponents);
				const oneMinusK = 1.0 - kij;
				const sqrtAiAj = Math.sqrt(ai * aj);
				aij = sqrtAiAj * oneMinusK;
				if (sqrtAiAj > 0.0) {
					daij = (oneMinusK / (2.0 * sqrtAiAj)) * (ai * daj + aj * dai);
				}
			}

			if (outParams.aMatrix) {
				outParams.aMatrix[rowOffset + j] = aij;
			}

			sumAi += zj * aij;
			dadTm += zi * zj * daij;
		}

		outParams.aSum[i] = sumAi;
		am += zi * sumAi;
	}

	outParams.a = am;
	outParams.b = bm;
	outParams.c = cm;
	outParams.dadT = dadTm;

	return outParams;
}
