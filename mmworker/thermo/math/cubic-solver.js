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
 * @fileoverview Analytical real-root cubic polynomial solver using Cardano's and Viète's methods.
 * Implements zero-allocation root finding and liquid/vapor root resolution for cubic equations of state.
 */

const TWO_PI = 2.0 * Math.PI;
const ONE_THIRD = 1.0 / 3.0;

/**
 * Solves the depressed/standard cubic polynomial for real roots:
 *   Z^3 + c2 * Z^2 + c1 * Z + c0 = 0
 *
 * Uses Viète's trigonometric method when 3 real roots exist (Q^3 - R^2 >= 0) to avoid complex numbers,
 * and Cardano's formulation when only 1 real root exists (Q^3 - R^2 < 0).
 * Polishes all real roots with Newton-Raphson iterations for < 10^-14 machine accuracy.
 *
 * @param {number} c2 - Coefficient of Z^2
 * @param {number} c1 - Coefficient of Z^1
 * @param {number} c0 - Constant coefficient (Z^0)
 * @param {Float64Array|number[]} [outRoots] - Pre-allocated output buffer (length >= 3)
 * @returns {number} Number of real roots found (1 or 3)
 */
export function solveCubic(c2, c1, c0, outRoots = new Float64Array(3)) {
	const c2_3 = c2 * ONE_THIRD;
	const c2Sq = c2 * c2;

	// Q = (c2^2 - 3*c1) / 9
	const Q = (c2Sq - 3.0 * c1) / 9.0;
	// R = (2*c2^3 - 9*c1*c2 + 27*c0) / 54
	const R = (c2 * (2.0 * c2Sq - 9.0 * c1) + 27.0 * c0) / 54.0;

	const Q3 = Q * Q * Q;
	const R2 = R * R;
	const discriminant = Q3 - R2;

	let numRoots = 1;

	if (discriminant >= 0.0) {
		// Three real roots (or multiple roots)
		numRoots = 3;
		if (Q > 0.0) {
			const sqrtQ = Math.sqrt(Q);
			let ratio = R / (sqrtQ * Q);
			if (ratio > 1.0) ratio = 1.0;
			else if (ratio < -1.0) ratio = -1.0;

			const theta = Math.acos(ratio);
			const s = -2.0 * sqrtQ;

			outRoots[0] = s * Math.cos(theta * ONE_THIRD) - c2_3;
			outRoots[1] = s * Math.cos((theta + TWO_PI) * ONE_THIRD) - c2_3;
			outRoots[2] = s * Math.cos((theta + 4.0 * Math.PI) * ONE_THIRD) - c2_3;
		} else {
			// Triple root when Q == 0 and R == 0
			outRoots[0] = -c2_3;
			outRoots[1] = -c2_3;
			outRoots[2] = -c2_3;
		}
	} else {
		// One real root and two complex conjugate roots
		numRoots = 1;
		const sqrtD = Math.sqrt(R2 - Q3);
		const sgnR = R >= 0.0 ? 1.0 : -1.0;
		const A = -sgnR * Math.cbrt(Math.abs(R) + sqrtD);
		const B = A !== 0.0 ? Q / A : 0.0;

		outRoots[0] = (A + B) - c2_3;
	}

	// Newton-Raphson root polishing for maximum precision
	for (let i = 0; i < numRoots; i++) {
		let z = outRoots[i];
		for (let iter = 0; iter < 2; iter++) {
			const f = ((z + c2) * z + c1) * z + c0;
			const df = (3.0 * z + 2.0 * c2) * z + c1;
			if (Math.abs(df) > 1e-14) {
				z -= f / df;
			}
		}
		outRoots[i] = z;
	}

	return numRoots;
}

/**
 * Identifies the liquid compressibility factor (Z_L = min(Z_k > B))
 * and vapor compressibility factor (Z_V = max(Z_k > B)).
 *
 * @param {ArrayLike<number>} roots - Array containing the calculated real roots
 * @param {number} numRoots - Number of valid real roots (1 or 3)
 * @param {number} B - Dimensionless EOS parameter B = (b_m * P) / (R * T)
 * @param {Float64Array|number[]} [outZ] - Pre-allocated buffer of length >= 2 [zL, zV]
 * @returns {Float64Array|number[]} The output buffer populated with [zL, zV]
 */
export function selectCubicRoots(roots, numRoots, B, outZ = new Float64Array(2)) {
	if (numRoots === 1) {
		outZ[0] = roots[0];
		outZ[1] = roots[0];
		return outZ;
	}

	let zMin = Infinity;
	let zMax = -Infinity;
	let validCount = 0;

	for (let i = 0; i < numRoots; i++) {
		const r = roots[i];
		if (r > B) {
			if (r < zMin) zMin = r;
			if (r > zMax) zMax = r;
			validCount++;
		}
	}

	if (validCount > 0) {
		outZ[0] = zMin;
		outZ[1] = zMax;
	} else {
		// Fallback if numerical edge case yields no root > B
		let maxR = roots[0];
		for (let i = 1; i < numRoots; i++) {
			if (roots[i] > maxR) maxR = roots[i];
		}
		outZ[0] = maxR;
		outZ[1] = maxR;
	}

	return outZ;
}
