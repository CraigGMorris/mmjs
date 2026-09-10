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
 * @fileoverview High-performance zero-allocation simultaneous Boston-Britt inner loop solver.
 */

import { R_GAS, T_STD, P_STD, EPSILON } from '../math/constants.js';
import { evaluateDippr, integrateCpIdeal, integrateCpIdealOverT } from '../registry/dippr.js';
import { FlashType } from '../types/flash.js';

/**
 * Result structure for Inside-Out inner loop execution.
 * @typedef {Object} InsideOutInnerResult
 * @property {number} beta - Equilibrium vapor fraction
 * @property {number} u - Inverse temperature coordinate (1/T - 1/TRef)
 * @property {number} T - Calculated temperature [K]
 * @property {number} P - Calculated pressure [Pa]
 * @property {boolean} converged - Convergence flag
 * @property {number} iterations - Number of inner iterations
 * @property {number} error - Final residual
 */

/**
 * Computes K-values from the simplified Boston-Britt model:
 * K_i(u) = alpha_i * exp(A + B * u)
 *
 * @param {import('../types/flash.js').InsideOutParams} params - Simplified parameters
 * @param {number} u - Inverse temperature coordinate
 * @param {Float64Array} outK - Pre-allocated output buffer for K-values (length N)
 * @param {number} N - Number of components
 */
export function evaluateSimpleK(params, u, outK, N) {
	const lnKb = params.A + params.B * u;
	const clampedLnKb = Math.max(-80.0, Math.min(80.0, lnKb));
	const Kb = Math.exp(clampedLnKb);
	const alpha = params.alpha;

	for (let i = 0; i < N; i++) {
		outK[i] = alpha[i] * Kb;
	}
}

/**
 * Solves the Boston-Britt inner loop system with zero allocations in the iteration loop.
 *
 * @param {import('../types/flash.js').FlashSpec} spec - Flash specification
 * @param {ArrayLike<number>} z - Overall feed mole fractions (length N)
 * @param {import('../types/flash.js').InsideOutParams} params - Simplified Inside-Out parameters
 * @param {import('../types/eos.js').PropertyPackage} eos - Property package
 * @param {Float64Array} outX - Pre-allocated output array for liquid mole fractions x_i
 * @param {Float64Array} outY - Pre-allocated output array for vapor mole fractions y_i
 * @param {Float64Array} outK - Pre-allocated output array for K-values
 * @param {number} [initialBeta=0.5] - Initial vapor fraction estimate
 * @param {number} [initialU=0.0] - Initial inverse temperature coordinate
 * @param {number} [tol=1e-10] - Inner convergence tolerance
 * @param {number} [maxIter=40] - Maximum inner iterations
 * @returns {InsideOutInnerResult}
 */
export function solveInsideOutInner(
	spec,
	z,
	params,
	eos,
	outX,
	outY,
	outK,
	initialBeta = 0.5,
	initialU = 0.0,
	tol = 1e-10,
	maxIter = 40
) {
	const N = eos.numComponents;
	const TRef = params.TRef;
	const PRef = params.PRef;
	const invTRef = 1.0 / TRef;
	const flashType = spec.type || FlashType.TP;

	let beta = initialBeta;
	let u = initialU;
	let P = (spec.P !== undefined && spec.P > 0) ? spec.P : PRef;
	let T = (spec.T !== undefined && spec.T > 0) ? spec.T : 1.0 / (u + invTRef);

	// Case 1: Isothermal-Isobaric (TP) Flash (u = 0 is fixed)
	if (flashType === FlashType.TP) {
		u = 0.0;
		T = spec.T || TRef;
		evaluateSimpleK(params, 0.0, outK, N);

		// 1D Rachford-Rice for beta
		let f0 = 0.0;
		let f1 = 0.0;
		for (let i = 0; i < N; i++) {
			f0 += z[i] * (outK[i] - 1.0);
			f1 += z[i] * (1.0 - 1.0 / outK[i]);
		}

		if (f0 <= 0.0) {
			for (let i = 0; i < N; i++) {
				outX[i] = z[i];
				outY[i] = z[i] * outK[i];
			}
			return { beta: 0.0, u: 0.0, T, P, converged: true, iterations: 0, error: Math.abs(f0) };
		}
		if (f1 >= 0.0) {
			for (let i = 0; i < N; i++) {
				outY[i] = z[i];
				outX[i] = z[i] / outK[i];
			}
			return { beta: 1.0, u: 0.0, T, P, converged: true, iterations: 0, error: Math.abs(f1) };
		}

		let bLow = 0.0;
		let bHigh = 1.0;
		beta = Math.max(0.01, Math.min(0.99, f0 / (f0 - f1)));

		let converged = false;
		let error = 1.0;
		let iterCount = 0;

		for (let iter = 0; iter < maxIter; iter++) {
			iterCount = iter + 1;
			let f = 0.0;
			let df = 0.0;

			for (let i = 0; i < N; i++) {
				const km1 = outK[i] - 1.0;
				const den = 1.0 + beta * km1;
				const term = (z[i] * km1) / den;
				f += term;
				df -= term * (km1 / den);
			}

			error = Math.abs(f);
			if (error < tol) {
				converged = true;
				break;
			}

			if (f > 0.0) {
				bLow = beta;
			} else {
				bHigh = beta;
			}

			let nextBeta = beta - f / df;
			if (nextBeta <= bLow || nextBeta >= bHigh || isNaN(nextBeta)) {
				nextBeta = 0.5 * (bLow + bHigh);
			}

			const step = Math.abs(nextBeta - beta);
			beta = nextBeta;
			if (step < tol) {
				converged = true;
				break;
			}
		}

		// Update compositions
		for (let i = 0; i < N; i++) {
			const den = 1.0 + beta * (outK[i] - 1.0);
			outX[i] = z[i] / den;
			outY[i] = outX[i] * outK[i];
		}

		return { beta, u: 0.0, T, P, converged, iterations: iterCount, error };
	}

	// Case 2: Isobaric Vapor Fraction (PQ) Flash (beta = Q_spec is fixed)
	if (flashType === FlashType.PQ) {
		const Q = spec.Q !== undefined ? spec.Q : 0.0;
		beta = Q;

		if (Q === 0.0) {
			// Bubble point: sum(z_i * K_i(u)) = 1 => exp(A + B*u) * sum(z_i * alpha_i) = 1
			let sumZAlpha = 0.0;
			for (let i = 0; i < N; i++) {
				sumZAlpha += z[i] * params.alpha[i];
			}
			u = -(params.A + Math.log(Math.max(1e-30, sumZAlpha))) / params.B;
			T = 1.0 / (u + invTRef);
			evaluateSimpleK(params, u, outK, N);
			for (let i = 0; i < N; i++) {
				outX[i] = z[i];
				outY[i] = z[i] * outK[i];
			}
			return { beta: 0.0, u, T, P, converged: true, iterations: 1, error: 0.0 };
		}

		if (Q === 1.0) {
			// Dew point: sum(z_i / K_i(u)) = 1 => exp(A + B*u) = sum(z_i / alpha_i)
			let sumZOverAlpha = 0.0;
			for (let i = 0; i < N; i++) {
				sumZOverAlpha += z[i] / Math.max(1e-30, params.alpha[i]);
			}
			u = (Math.log(Math.max(1e-30, sumZOverAlpha)) - params.A) / params.B;
			T = 1.0 / (u + invTRef);
			evaluateSimpleK(params, u, outK, N);
			for (let i = 0; i < N; i++) {
				outY[i] = z[i];
				outX[i] = z[i] / outK[i];
			}
			return { beta: 1.0, u, T, P, converged: true, iterations: 1, error: 0.0 };
		}

		// 0 < Q < 1: 1D Newton-Raphson on u
		let converged = false;
		let iterCount = 0;
		let error = 1.0;

		for (let iter = 0; iter < maxIter; iter++) {
			iterCount = iter + 1;
			evaluateSimpleK(params, u, outK, N);

			let E1 = 0.0;
			let dE1_du = 0.0;
			for (let i = 0; i < N; i++) {
				const km1 = outK[i] - 1.0;
				const den = 1.0 + beta * km1;
				const den2 = den * den;
				E1 += (z[i] * km1) / den;
				dE1_du += (z[i] * outK[i]) / den2;
			}
			dE1_du *= params.B;

			error = Math.abs(E1);
			if (error < tol) {
				converged = true;
				break;
			}

			let deltaU = -E1 / dE1_du;
			// Step damping on temperature change
			const currentT = 1.0 / (u + invTRef);
			let trialT = 1.0 / (u + deltaU + invTRef);
			if (trialT <= 0.0 || trialT < 0.7 * currentT || trialT > 1.4 * currentT) {
				trialT = deltaU < 0.0 ? currentT * 1.2 : currentT * 0.8;
				deltaU = 1.0 / trialT - invTRef - u;
			}

			u += deltaU;
			T = 1.0 / (u + invTRef);
			if (Math.abs(deltaU) < 1e-12) {
				converged = true;
				break;
			}
		}

		evaluateSimpleK(params, u, outK, N);
		for (let i = 0; i < N; i++) {
			const den = 1.0 + beta * (outK[i] - 1.0);
			outX[i] = z[i] / den;
			outY[i] = outX[i] * outK[i];
		}

		return { beta, u, T, P, converged, iterations: iterCount, error };
	}

	// Case 3: Isothermal Vapor Fraction (TQ) Flash (T is fixed, P is varied)
	if (flashType === FlashType.TQ) {
		T = spec.T || TRef;
		const Q = spec.Q !== undefined ? spec.Q : 0.0;
		beta = Q;

		evaluateSimpleK(params, 0.0, outK, N);

		if (Q === 0.0) {
			// Bubble point pressure: P_new = PRef * exp(A) * sum(z_i * alpha_i)
			let sumZAlpha = 0.0;
			for (let i = 0; i < N; i++) {
				sumZAlpha += z[i] * params.alpha[i];
			}
			P = PRef * Math.exp(params.A) * sumZAlpha;
			for (let i = 0; i < N; i++) {
				outX[i] = z[i];
				outY[i] = (z[i] * outK[i]);
			}
			return { beta: 0.0, u: 0.0, T, P, converged: true, iterations: 1, error: 0.0 };
		}

		if (Q === 1.0) {
			// Dew point pressure: P_new = PRef * exp(A) / sum(z_i / alpha_i)
			let sumZOverAlpha = 0.0;
			for (let i = 0; i < N; i++) {
				sumZOverAlpha += z[i] / Math.max(1e-30, params.alpha[i]);
			}
			P = (PRef * Math.exp(params.A)) / sumZOverAlpha;
			for (let i = 0; i < N; i++) {
				outY[i] = z[i];
				outX[i] = z[i] / outK[i];
			}
			return { beta: 1.0, u: 0.0, T, P, converged: true, iterations: 1, error: 0.0 };
		}

		// 0 < Q < 1
		let pRatio = 1.0;
		for (let iter = 0; iter < maxIter; iter++) {
			let E1 = 0.0;
			let dE1_dv = 0.0;
			for (let i = 0; i < N; i++) {
				const ki = outK[i] * pRatio;
				const km1 = ki - 1.0;
				const den = 1.0 + beta * km1;
				E1 += (z[i] * km1) / den;
				dE1_dv += (z[i] * ki) / (den * den);
			}

			if (Math.abs(E1) < tol) break;
			const dv = -E1 / dE1_dv;
			pRatio *= Math.exp(Math.max(-1.0, Math.min(1.0, dv)));
		}

		P = PRef / pRatio;
		for (let i = 0; i < N; i++) {
			outK[i] *= pRatio;
			const den = 1.0 + beta * (outK[i] - 1.0);
			outX[i] = z[i] / den;
			outY[i] = outX[i] * outK[i];
		}

		return { beta, u: 0.0, T, P, converged: true, iterations: 1, error: 0.0 };
	}

	// Case 4: Simultaneous 2x2 Inner Loop for PH, PS (P is fixed, beta and u are solved)
	if (flashType === FlashType.PH || flashType === FlashType.PS) {
		const isEnthalpy = (flashType === FlashType.PH);
		const targetSpec = isEnthalpy ? (spec.H !== undefined ? spec.H : 0.0) : (spec.S !== undefined ? spec.S : 0.0);
		const compounds = eos.compounds;

	let converged = false;
	let iterCount = 0;
	let finalError = 1.0;

	for (let iter = 0; iter < maxIter; iter++) {
		iterCount = iter + 1;
		T = 1.0 / (u + invTRef);
		evaluateSimpleK(params, u, outK, N);

		// Material balance compositions
		let sumX = 0.0;
		let sumY = 0.0;
		for (let i = 0; i < N; i++) {
			const den = 1.0 + beta * (outK[i] - 1.0);
			const xi = z[i] / den;
			const yi = xi * outK[i];
			outX[i] = xi;
			outY[i] = yi;
			sumX += xi;
			sumY += yi;
		}

		// Evaluate objective function E1 and derivative dE1/dbeta, dE1/du
		let E1 = 0.0;
		let J00 = 0.0; // dE1/dbeta
		let J01 = 0.0; // dE1/du

		for (let i = 0; i < N; i++) {
			const km1 = outK[i] - 1.0;
			const den = 1.0 + beta * km1;
			const den2 = den * den;
			E1 += (z[i] * km1) / den;
			J00 -= (z[i] * km1 * km1) / den2;
			J01 += (z[i] * outK[i]) / den2;
		}
		J01 *= params.B;

		// Evaluate objective function E2 (Energy or Entropy) and derivatives J10, J11
		let propV_ig = 0.0;
		let propL_ig = 0.0;
		let cpV_ig = 0.0;
		let cpL_ig = 0.0;

		const invSumX = sumX > 0.0 ? 1.0 / sumX : 1.0;
		const invSumY = sumY > 0.0 ? 1.0 / sumY : 1.0;

		if (isEnthalpy) {
			for (let i = 0; i < N; i++) {
				const cpCorr = compounds[i].cpIdeal;
				const h_ig_i = cpCorr ? integrateCpIdeal(cpCorr, T_STD, T) : 0.0;
				const cp_i = cpCorr ? evaluateDippr(cpCorr, T) : 30.0;

				const xiNorm = outX[i] * invSumX;
				const yiNorm = outY[i] * invSumY;

				propV_ig += yiNorm * h_ig_i;
				propL_ig += xiNorm * h_ig_i;
				cpV_ig += yiNorm * cp_i;
				cpL_ig += xiNorm * cp_i;
			}
		} else {
			// Entropy
			for (let i = 0; i < N; i++) {
				const cpCorr = compounds[i].cpIdeal;
				const s_ig_i = cpCorr ? integrateCpIdealOverT(cpCorr, T_STD, T) : 0.0;
				const cp_i = cpCorr ? evaluateDippr(cpCorr, T) : 30.0;

				const xiNorm = outX[i] * invSumX;
				const yiNorm = outY[i] * invSumY;

				const sMixV = -R_GAS * Math.log(Math.max(EPSILON, yiNorm));
				const sMixL = -R_GAS * Math.log(Math.max(EPSILON, xiNorm));

				propV_ig += yiNorm * (s_ig_i + sMixV);
				propL_ig += xiNorm * (s_ig_i + sMixL);
				cpV_ig += yiNorm * cp_i;
				cpL_ig += xiNorm * cp_i;
			}
			const sPres = -R_GAS * Math.log(Math.max(EPSILON, P / P_STD));
			propV_ig += sPres;
			propL_ig += sPres;
		}

		const propV = propV_ig + (isEnthalpy ? params.hVStar : params.sVStar);
		const propL = propL_ig + (isEnthalpy ? params.hLStar : params.sLStar);
		const propBulk = beta * propV + (1.0 - beta) * propL;

		const E2 = propBulk - targetSpec;
		const J10 = propV - propL; // dE2/dbeta

		// dE2/du = dE2/dT * dT/du where dT/du = -T^2
		const cpBulk = beta * cpV_ig + (1.0 - beta) * cpL_ig;
		const J11 = isEnthalpy ? -T * T * cpBulk : -T * cpBulk; // dE2/du

		// Convergence check
		const scaleE2 = isEnthalpy ? Math.max(1000.0, Math.abs(targetSpec)) : Math.max(10.0, Math.abs(targetSpec));
		finalError = Math.max(Math.abs(E1), Math.abs(E2) / scaleE2);

		if (finalError < tol) {
			converged = true;
			break;
		}

		// Analytical 2x2 matrix inversion: J * [deltaBeta, deltaU]^T = - [E1, E2]^T
		const det = J00 * J11 - J01 * J10;
		let deltaBeta = 0.0;
		let deltaU = 0.0;

		if (Math.abs(det) > 1e-25) {
			deltaBeta = (-E1 * J11 + E2 * J01) / det;
			deltaU = (-J00 * E2 + J10 * E1) / det;
		} else {
			// Regularized diagonal fallback
			deltaBeta = -E1 / (J00 !== 0 ? J00 : -1.0);
			deltaU = -E2 / (J11 !== 0 ? J11 : -1000.0);
		}

		// Step damping on beta
		deltaBeta = Math.max(-0.35, Math.min(0.35, deltaBeta));
		beta = Math.max(-0.05, Math.min(1.05, beta + deltaBeta));

		// Step damping on u to prevent large temperature swings
		const currentT = 1.0 / (u + invTRef);
		let trialT = 1.0 / (u + deltaU + invTRef);
		if (trialT <= 0.0 || trialT < 0.8 * currentT || trialT > 1.25 * currentT) {
			trialT = deltaU < 0.0 ? currentT * 1.15 : currentT * 0.85;
			deltaU = 1.0 / trialT - invTRef - u;
		}

		u += deltaU;
		T = 1.0 / (u + invTRef);

		if (Math.abs(deltaBeta) < tol && Math.abs(deltaU) < 1e-12) {
			converged = true;
			break;
		}
	}

		evaluateSimpleK(params, u, outK, N);
		let finalSumX = 0.0;
		let finalSumY = 0.0;
		for (let i = 0; i < N; i++) {
			const den = 1.0 + beta * (outK[i] - 1.0);
			outX[i] = z[i] / den;
			outY[i] = outX[i] * outK[i];
			finalSumX += outX[i];
			finalSumY += outY[i];
		}
		if (finalSumX > 0.0) {
			const invX = 1.0 / finalSumX;
			for (let i = 0; i < N; i++) outX[i] *= invX;
		}
		if (finalSumY > 0.0) {
			const invY = 1.0 / finalSumY;
			for (let i = 0; i < N; i++) outY[i] *= invY;
		}

		return { beta, u, T, P, converged, iterations: iterCount, error: finalError };

	}

	// Case 5: Simultaneous 2x2 Inner Loop for TH, TS (T is fixed, beta and P are solved)
	if (flashType === FlashType.TH || flashType === FlashType.TS) {
		const isEnthalpy = (flashType === FlashType.TH);
		const targetSpec = isEnthalpy ? (spec.H !== undefined ? spec.H : 0.0) : (spec.S !== undefined ? spec.S : 0.0);
		const compounds = eos.compounds;
		T = (spec.T !== undefined && spec.T > 0) ? spec.T : TRef;
		u = 0.0;

		let v = Math.log(Math.max(1e-10, PRef / P));
		let converged = false;
		let iterCount = 0;
		let finalError = 1.0;

		for (let iter = 0; iter < maxIter; iter++) {
			iterCount = iter + 1;
			P = PRef * Math.exp(-v);

			const expAv = Math.exp(Math.max(-80.0, Math.min(80.0, params.A + v)));
			for (let i = 0; i < N; i++) {
				outK[i] = params.alpha[i] * expAv;
			}

			// Material balance compositions
			let sumX = 0.0;
			let sumY = 0.0;
			for (let i = 0; i < N; i++) {
				const den = 1.0 + beta * (outK[i] - 1.0);
				const xi = z[i] / den;
				const yi = xi * outK[i];
				outX[i] = xi;
				outY[i] = yi;
				sumX += xi;
				sumY += yi;
			}

			// Evaluate objective function E1 and derivative dE1/dbeta, dE1/dv
			let E1 = 0.0;
			let J00 = 0.0; // dE1/dbeta
			let J01 = 0.0; // dE1/dv

			for (let i = 0; i < N; i++) {
				const km1 = outK[i] - 1.0;
				const den = 1.0 + beta * km1;
				const den2 = den * den;
				E1 += (z[i] * km1) / den;
				J00 -= (z[i] * km1 * km1) / den2;
				J01 += (z[i] * outK[i]) / den2;
			}

			// Evaluate objective function E2 (Energy or Entropy) and derivatives J10, J11
			let propV = 0.0;
			let propL = 0.0;

			const invSumX = sumX > 0.0 ? 1.0 / sumX : 1.0;
			const invSumY = sumY > 0.0 ? 1.0 / sumY : 1.0;

			if (isEnthalpy) {
				let propV_ig = 0.0;
				let propL_ig = 0.0;
				for (let i = 0; i < N; i++) {
					const cpCorr = compounds[i].cpIdeal;
					const h_ig_i = cpCorr ? integrateCpIdeal(cpCorr, T_STD, T) : 0.0;
					const xiNorm = outX[i] * invSumX;
					const yiNorm = outY[i] * invSumY;
					propV_ig += yiNorm * h_ig_i;
					propL_ig += xiNorm * h_ig_i;
				}
				propV = propV_ig + params.hVStar;
				propL = propL_ig + params.hLStar;
			} else {
				let propV_ig = 0.0;
				let propL_ig = 0.0;
				for (let i = 0; i < N; i++) {
					const cpCorr = compounds[i].cpIdeal;
					const s_ig_i = cpCorr ? integrateCpIdealOverT(cpCorr, T_STD, T) : 0.0;
					const xiNorm = outX[i] * invSumX;
					const yiNorm = outY[i] * invSumY;
					const sMixV = -R_GAS * Math.log(Math.max(EPSILON, yiNorm));
					const sMixL = -R_GAS * Math.log(Math.max(EPSILON, xiNorm));
					propV_ig += yiNorm * (s_ig_i + sMixV);
					propL_ig += xiNorm * (s_ig_i + sMixL);
				}
				const sPres = -R_GAS * Math.log(Math.max(EPSILON, P / P_STD));
				propV = propV_ig + sPres + params.sVStar;
				propL = propL_ig + sPres + params.sLStar;
			}

			const propBulk = beta * propV + (1.0 - beta) * propL;
			const E2 = propBulk - targetSpec;
			const J10 = propV - propL; // dE2/dbeta
			const J11 = isEnthalpy ? 0.0 : R_GAS; // dE2/dv

			const scaleE2 = isEnthalpy ? Math.max(1000.0, Math.abs(targetSpec)) : Math.max(10.0, Math.abs(targetSpec));
			finalError = Math.max(Math.abs(E1), Math.abs(E2) / scaleE2);

			if (finalError < tol) {
				converged = true;
				break;
			}

			const det = J00 * J11 - J01 * J10;
			let deltaBeta = 0.0;
			let deltaV = 0.0;

			if (Math.abs(det) > 1e-25) {
				deltaBeta = (-E1 * J11 + E2 * J01) / det;
				deltaV = (-J00 * E2 + J10 * E1) / det;
			} else {
				deltaBeta = -E2 / (J10 !== 0 ? J10 : 1000.0);
				deltaV = -E1 / (J01 !== 0 ? J01 : 1.0);
			}

			// Step damping on beta
			deltaBeta = Math.max(-0.25, Math.min(0.25, deltaBeta));
			beta = Math.max(0.0, Math.min(1.0, beta + deltaBeta));

			// Step damping on v (pressure coordinate)
			deltaV = Math.max(-0.75, Math.min(0.75, deltaV));
			v += deltaV;

			if (Math.abs(deltaBeta) < tol && Math.abs(deltaV) < 1e-12) {
				converged = true;
				break;
			}
		}

		P = PRef * Math.exp(-v);
		const expAv = Math.exp(Math.max(-80.0, Math.min(80.0, params.A + v)));
		let finalSumX = 0.0;
		let finalSumY = 0.0;
		for (let i = 0; i < N; i++) {
			outK[i] = params.alpha[i] * expAv;
			const den = 1.0 + beta * (outK[i] - 1.0);
			outX[i] = z[i] / den;
			outY[i] = outX[i] * outK[i];
			finalSumX += outX[i];
			finalSumY += outY[i];
		}
		if (finalSumX > 0.0) {
			const invX = 1.0 / finalSumX;
			for (let i = 0; i < N; i++) outX[i] *= invX;
		}
		if (finalSumY > 0.0) {
			const invY = 1.0 / finalSumY;
			for (let i = 0; i < N; i++) outY[i] *= invY;
		}

		return { beta, u: 0.0, T, P, converged, iterations: iterCount, error: finalError };
	}

	throw new Error(`Unsupported flash specification type in inner solver: ${flashType}`);
}
