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
 * @fileoverview High-performance zero-allocation vector math and matrix helpers.
 */

/**
 * Computes the dot product of two vectors of length n.
 *
 * @param {ArrayLike<number>} a - First vector
 * @param {ArrayLike<number>} b - Second vector
 * @param {number} n - Vector dimension
 * @returns {number} Scalar dot product
 */
export function dot(a, b, n) {
	let s = 0.0;
	for (let i = 0; i < n; i++) {
		s += a[i] * b[i];
	}
	return s;
}

/**
 * Computes the sum of elements in a vector of length n.
 *
 * @param {ArrayLike<number>} a - Input vector
 * @param {number} n - Vector dimension
 * @returns {number} Sum of vector elements
 */
export function sum(a, n) {
	let s = 0.0;
	for (let i = 0; i < n; i++) {
		s += a[i];
	}
	return s;
}

/**
 * Copies n elements from source array to destination array.
 *
 * @param {ArrayLike<number>} src - Source array
 * @param {Float64Array|number[]} dst - Destination array
 * @param {number} n - Number of elements to copy
 * @returns {Float64Array|number[]} The destination array
 */
export function vecCopy(src, dst, n) {
	for (let i = 0; i < n; i++) {
		dst[i] = src[i];
	}
	return dst;
}

/**
 * Fills n elements of destination array with a constant scalar value.
 *
 * @param {Float64Array|number[]} dst - Destination array
 * @param {number} val - Scalar value to fill
 * @param {number} n - Number of elements to fill
 * @returns {Float64Array|number[]} The destination array
 */
export function vecFill(dst, val, n) {
	for (let i = 0; i < n; i++) {
		dst[i] = val;
	}
	return dst;
}

/**
 * Retrieves a symmetric binary interaction parameter (BIP) from a flattened N x N array.
 * Enforces zero on the diagonal (k_ii = 0) and symmetry (k_ij = k_ji).
 *
 * @param {ArrayLike<number>|null|undefined} bipMatrix - Flattened N x N matrix
 * @param {number} i - Row index (component i)
 * @param {number} j - Column index (component j)
 * @param {number} n - Number of components
 * @returns {number} Binary interaction parameter k_ij
 */
export function getBip(bipMatrix, i, j, n) {
	if (i === j || !bipMatrix || bipMatrix.length === 0) {
		return 0.0;
	}
	return bipMatrix[i * n + j];
}
