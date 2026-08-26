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
 * @fileoverview High-performance zero-allocation analytical Rachford-Rice solver for two-phase equilibrium.
 */

/**
 * Evaluates the Rachford-Rice objective function f(beta) for a multicomponent mixture:
 * f(beta) = sum_i [ z_i * (K_i - 1) / (1 + beta * (K_i - 1)) ]
 *
 * @param {number} beta - Vapor mole fraction
 * @param {ArrayLike<number>} z - Overall feed mole fractions (length N)
 * @param {ArrayLike<number>} K - Equilibrium K-values (length N)
 * @param {number} n - Number of components N
 * @returns {number} Objective function value f(beta)
 */
export function evaluateRachfordRice(beta, z, K, n) {
	let f = 0.0;
	for (let i = 0; i < n; i++) {
		const kMinus1 = K[i] - 1.0;
		f += (z[i] * kMinus1) / (1.0 + beta * kMinus1);
	}
	return f;
}

/**
 * Evaluates the exact analytical first derivative of the Rachford-Rice function f'(beta):
 * f'(beta) = - sum_i [ z_i * (K_i - 1)^2 / (1 + beta * (K_i - 1))^2 ]
 *
 * @param {number} beta - Vapor mole fraction
 * @param {ArrayLike<number>} z - Overall feed mole fractions (length N)
 * @param {ArrayLike<number>} K - Equilibrium K-values (length N)
 * @param {number} n - Number of components N
 * @returns {number} Derivative value f'(beta) (< 0 everywhere)
 */
export function evaluateRachfordRiceDerivative(beta, z, K, n) {
	let df = 0.0;
	for (let i = 0; i < n; i++) {
		const kMinus1 = K[i] - 1.0;
		const den = 1.0 + beta * kMinus1;
		df -= (z[i] * kMinus1 * kMinus1) / (den * den);
	}
	return df;
}

/**
 * Solves the two-phase Rachford-Rice equation for vapor fraction beta using analytical
 * Newton-Raphson iterations with bisection safeguarding and strict phase boundary pre-checks.
 *
 * Zero transient allocations occur in the iteration loop.
 *
 * @param {ArrayLike<number>} z - Feed mole fraction vector (length N)
 * @param {ArrayLike<number>} K - Equilibrium K-values (length N)
 * @param {number} n - Number of components
 * @param {Float64Array} [outX] - Optional pre-allocated output buffer for liquid composition x_i
 * @param {Float64Array} [outY] - Optional pre-allocated output buffer for vapor composition y_i
 * @param {number} [tol=1e-12] - Convergence tolerance (|f(beta)| < tol or |delta_beta| < tol)
 * @param {number} [maxIter=100] - Maximum allowable iterations
 * @returns {import('../types/flash.js').RachfordRiceResult}
 */
export function solveRachfordRice(z, K, n, outX, outY, tol = 1e-12, maxIter = 100) {
	// Step 1: Phase boundary pre-checks
	// f(0) = sum(z_i * (K_i - 1)) = sum(z_i * K_i) - 1
	// f(1) = sum(z_i * (1 - 1/K_i)) = 1 - sum(z_i / K_i)
	let f0 = 0.0;
	let f1 = 0.0;
	let kMax = K[0];
	let kMin = K[0];

	for (let i = 0; i < n; i++) {
		const ki = K[i];
		const zi = z[i];
		f0 += zi * (ki - 1.0);
		f1 += zi * (1.0 - 1.0 / ki);
		if (ki > kMax) kMax = ki;
		if (ki < kMin) kMin = ki;
	}

	// If f(0) <= 0: Subcooled liquid or at bubble point -> pure liquid (beta = 0)
	if (f0 <= 0.0) {
		if (outX && outY) {
			let sumY = 0.0;
			for (let i = 0; i < n; i++) {
				outX[i] = z[i];
				const yi = z[i] * K[i];
				outY[i] = yi;
				sumY += yi;
			}
			if (sumY > 0.0) {
				const invSumY = 1.0 / sumY;
				for (let i = 0; i < n; i++) {
					outY[i] *= invSumY;
				}
			}
		}
		return { beta: 0.0, iterations: 0, converged: true, error: Math.abs(f0) };
	}

	// If f(1) >= 0: Superheated vapor or at dew point -> pure vapor (beta = 1)
	if (f1 >= 0.0) {
		if (outX && outY) {
			let sumX = 0.0;
			for (let i = 0; i < n; i++) {
				outY[i] = z[i];
				const xi = z[i] / K[i];
				outX[i] = xi;
				sumX += xi;
			}
			if (sumX > 0.0) {
				const invSumX = 1.0 / sumX;
				for (let i = 0; i < n; i++) {
					outX[i] *= invSumX;
				}
			}
		}
		return { beta: 1.0, iterations: 0, converged: true, error: Math.abs(f1) };
	}

	// Step 2: Compute strict pole boundaries & bracket
	// beta_min = max(0, 1 / (1 - K_max)), beta_max = min(1, 1 / (1 - K_min))
	let bLow = 0.0;
	let bHigh = 1.0;
	if (kMax > 1.0) {
		const poleLow = 1.0 / (1.0 - kMax);
		if (poleLow > bLow) bLow = poleLow;
	}
	if (kMin < 1.0) {
		const poleHigh = 1.0 / (1.0 - kMin);
		if (poleHigh < bHigh) bHigh = poleHigh;
	}

	// Initial estimate via secant / linear interpolation between f(0) and f(1)
	let beta = f0 / (f0 - f1);
	if (beta <= bLow || beta >= bHigh || isNaN(beta)) {
		beta = 0.5 * (bLow + bHigh);
	}

	// Step 3: Hybrid Newton-Raphson & Bisection iteration
	let converged = false;
	let iterations = 0;
	let error = Math.abs(f0);

	for (let iter = 0; iter < maxIter; iter++) {
		iterations = iter + 1;

		let f = 0.0;
		let df = 0.0;
		for (let i = 0; i < n; i++) {
			const kMinus1 = K[i] - 1.0;
			const den = 1.0 + beta * kMinus1;
			const term = (z[i] * kMinus1) / den;
			f += term;
			df -= term * (kMinus1 / den);
		}

		error = Math.abs(f);
		if (error < tol) {
			converged = true;
			break;
		}

		// Update bracket based on monotonic derivative f'(beta) < 0
		if (f > 0.0) {
			bLow = beta;
		} else {
			bHigh = beta;
		}

		// Analytical Newton-Raphson step: delta_beta = - f(beta) / f'(beta)
		let nextBeta = beta - f / df;

		// Fallback to bisection if Newton step lands outside bracket or is NaN
		if (nextBeta <= bLow || nextBeta >= bHigh || isNaN(nextBeta)) {
			nextBeta = 0.5 * (bLow + bHigh);
		}

		const stepSize = Math.abs(nextBeta - beta);
		beta = nextBeta;

		if (stepSize < tol) {
			converged = true;
			break;
		}
	}

	// Step 4: Populate equilibrium compositions in place if buffers provided
	if (outX && outY) {
		let sumX = 0.0;
		let sumY = 0.0;

		for (let i = 0; i < n; i++) {
			const ki = K[i];
			const den = 1.0 + beta * (ki - 1.0);
			const xi = z[i] / den;
			const yi = xi * ki;
			outX[i] = xi;
			outY[i] = yi;
			sumX += xi;
			sumY += yi;
		}

		// Normalize mole fractions
		if (sumX > 0.0 && sumY > 0.0) {
			const invSumX = 1.0 / sumX;
			const invSumY = 1.0 / sumY;
			for (let i = 0; i < n; i++) {
				outX[i] *= invSumX;
				outY[i] *= invSumY;
			}
		}
	}

	return { beta, iterations, converged, error };
}
