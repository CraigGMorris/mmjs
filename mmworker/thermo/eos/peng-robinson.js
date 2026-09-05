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
 * @fileoverview Peng-Robinson (1978) Equation of State with Peneloux Volume Translation and Analytical Fugacities.
 */

import { R_GAS, EPSILON } from '../math/constants.js';
import { solveCubic, selectCubicRoots } from '../math/cubic-solver.js';
import { calculateCubicMixingRules, createCubicMixtureParams } from './mixing-rules.js';
import { ThermodynamicWorkspace } from '../types/memory.js';
import { defaultRegistry } from '../registry/registry.js';

const SQRT2 = Math.SQRT2;
const TWO_SQRT2 = 2.0 * Math.SQRT2;
const DELTA1 = 1.0 + Math.SQRT2;
const DELTA2 = 1.0 - Math.SQRT2;

/**
 * @typedef {import('../types/eos.js').PropertyPackage} IPropertyPackage
 */

/**
 * Peng-Robinson (1978) Property Package with Peneloux Volume Translation.
 * Implements the standard PropertyPackage interface with zero transient allocations.
 *
 * @implements {IPropertyPackage}
 */
export class PengRobinson {
	/**
	 * @param {import('../types/compound.js').PureCompound[]} compounds - Array of pure compounds
	 * @param {ArrayLike<number>|null} [bipMatrix] - Optional flattened N x N BIP matrix (k_ij)
	 */
	constructor(compounds, bipMatrix = null) {
		if (!compounds || compounds.length === 0) {
			throw new Error('PengRobinson requires at least one compound');
		}

		this.compounds = compounds;
		this.numComponents = compounds.length;
		const N = this.numComponents;

		/** @type {Float64Array} Critical temperature Tc [K] */
		this.tc = new Float64Array(N);
		/** @type {Float64Array} Critical pressure Pc [Pa] */
		this.pc = new Float64Array(N);
		/** @type {Float64Array} Pitzer acentric factor omega */
		this.omega = new Float64Array(N);
		/** @type {Float64Array} Molecular weight [kg/mol] */
		this.mw = new Float64Array(N);
		/** @type {Float64Array} Peneloux volume translation parameter c_i [m3/mol] */
		this.volumeShift = new Float64Array(N);
		/** @type {Float64Array} PR-78 kappa parameter */
		this.kappa = new Float64Array(N);
		/** @type {Float64Array} Critical attractive parameter a(Tc) */
		this.ac = new Float64Array(N);
		/** @type {Float64Array} Pure component co-volume b_i */
		this.b = new Float64Array(N);

		for (let i = 0; i < N; i++) {
			const c = compounds[i];
			this.tc[i] = c.tc;
			this.pc[i] = c.pc;
			this.omega[i] = c.omega;
			this.mw[i] = c.mw;
			this.volumeShift[i] = c.volumeShift !== undefined ? c.volumeShift : 0.0;

			// PR-78 kappa correlation
			const w = c.omega;
			if (w <= 0.49) {
				this.kappa[i] = 0.37464 + 1.54226 * w - 0.26992 * w * w;
			} else {
				this.kappa[i] = 0.379642 + 1.48503 * w - 0.164423 * w * w + 0.016666 * w * w * w;
			}

			// a_c = 0.45724 * R^2 * Tc^2 / Pc
			this.ac[i] = 0.45724 * (R_GAS * R_GAS * c.tc * c.tc) / c.pc;
			// b_i = 0.07780 * R * Tc / Pc
			this.b[i] = 0.07780 * (R_GAS * c.tc) / c.pc;
		}

		/** @type {Float64Array} Flattened N x N binary interaction parameter (BIP) matrix */
		this.bipMatrix = new Float64Array(N * N);
		if (bipMatrix && bipMatrix.length >= N * N) {
			for (let i = 0; i < N * N; i++) {
				this.bipMatrix[i] = bipMatrix[i];
			}
		} else {
			// Populate from default registry
			for (let i = 0; i < N; i++) {
				for (let j = 0; j < N; j++) {
					if (i !== j) {
						this.bipMatrix[i * N + j] = defaultRegistry.getBIP(compounds[i], compounds[j]);
					}
				}
			}
		}

		/** @type {ThermodynamicWorkspace} Internal pre-allocated workspace */
		this.workspace = new ThermodynamicWorkspace(N);
	}

	/**
	 * Calculates the mixture molecular weight in kg/mol.
	 *
	 * @param {ArrayLike<number>} z - Mole fractions (length N)
	 * @returns {number} Molecular weight [kg/mol]
	 */
	mwMix(z) {
		let mw = 0.0;
		for (let i = 0; i < this.numComponents; i++) {
			mw += z[i] * this.mw[i];
		}
		return mw;
	}

	/**
	 * Calculates pure component temperature-dependent parameters a_i(T), b_i, c_i, and da_i/dT.
	 *
	 * @param {number} T - System temperature [K]
	 * @param {Float64Array} outA - Output buffer for pure a_i(T) [length N]
	 * @param {Float64Array} outB - Output buffer for pure b_i [length N]
	 * @param {Float64Array} outC - Output buffer for pure c_i [length N]
	 * @param {Float64Array} outDadT - Output buffer for pure da_i/dT [length N]
	 */
	calculatePureParams(T, outA, outB, outC, outDadT) {
		const N = this.numComponents;
		const sqrtT = Math.sqrt(T);

		for (let i = 0; i < N; i++) {
			const tc_i = this.tc[i];
			const kappa_i = this.kappa[i];
			const ac_i = this.ac[i];

			const sqrtTr = sqrtT / Math.sqrt(tc_i);
			const sqrtAlpha = 1.0 + kappa_i * (1.0 - sqrtTr);
			const alpha = sqrtAlpha * sqrtAlpha;

			outA[i] = ac_i * alpha;
			outB[i] = this.b[i];
			outC[i] = this.volumeShift[i];

			// da_i/dT = - (a_c,i * kappa_i * sqrtAlpha) / sqrt(T * Tc,i)
			outDadT[i] = -(ac_i * kappa_i * sqrtAlpha) / (sqrtT * Math.sqrt(tc_i));
		}
	}

	/**
	 * Evaluates quadratic mixing rules for a given composition at temperature T.
	 *
	 * @param {number} T - System temperature [K]
	 * @param {ArrayLike<number>} z - Mole fraction vector (length N)
	 * @param {import('../types/eos.js').CubicMixtureParams} [outParams] - Reusable mixture params struct
	 * @param {ThermodynamicWorkspace} [workspace] - Workspace buffer
	 * @returns {import('../types/eos.js').CubicMixtureParams} Populated mixture params struct
	 */
	calculateMixtureParams(T, z, outParams, workspace) {
		const ws = workspace || this.workspace;
		const params = outParams || ws.mixtureParams;

		this.calculatePureParams(T, ws.pureA, ws.pureB, ws.pureC, ws.pureDadT);
		return calculateCubicMixingRules(
			z,
			ws.pureA,
			ws.pureB,
			ws.pureC,
			ws.pureDadT,
			this.bipMatrix,
			this.numComponents,
			params
		);
	}

	/**
	 * Solves the PR cubic polynomial for liquid and vapor compressibility factors.
	 *
	 * @param {number} T - Temperature [K]
	 * @param {number} P - Pressure [Pa]
	 * @param {ArrayLike<number>} z - Mole fraction vector (length N)
	 * @param {Float64Array|number[]} [outZ] - Pre-allocated buffer for [zL, zV] (length >= 2)
	 * @param {import('../types/eos.js').CubicMixtureParams} [mixtureParams] - Optional pre-computed mixture parameters
	 * @param {ThermodynamicWorkspace} [workspace] - Workspace buffer
	 * @returns {number} Number of real roots (1 or 3)
	 */
	calculateZFactors(T, P, z, outZ, mixtureParams, workspace) {
		const ws = workspace || this.workspace;
		const targetZ = outZ || ws.zFactors;

		const mix = mixtureParams || this.calculateMixtureParams(T, z, ws.mixtureParams, ws);

		const RT = R_GAS * T;
		const A = (mix.a * P) / (RT * RT);
		const B = (mix.b * P) / RT;

		const B2 = B * B;
		const B3 = B2 * B;

		// PR cubic polynomial coefficients: Z^3 + c2*Z^2 + c1*Z + c0 = 0
		const c2 = -(1.0 - B);
		const c1 = A - 3.0 * B2 - 2.0 * B;
		const c0 = -(A * B - B2 - B3);

		const numRoots = solveCubic(c2, c1, c0, ws.roots);
		selectCubicRoots(ws.roots, numRoots, B, targetZ);

		return numRoots;
	}

	/**
	 * Computes analytical fugacity coefficients ln(phi_i) for all components.
	 *
	 * @param {number} T - Temperature [K]
	 * @param {number} P - Pressure [Pa]
	 * @param {ArrayLike<number>} z - Mole fraction vector (length N)
	 * @param {number} Z - Phase compressibility factor (zL or zV)
	 * @param {Float64Array} outLnPhi - Pre-allocated output array (length N)
	 * @param {import('../types/eos.js').CubicMixtureParams} [mixtureParams] - Optional pre-computed mixture parameters
	 * @param {ThermodynamicWorkspace} [workspace] - Workspace buffer
	 * @returns {Float64Array} Populated outLnPhi array
	 */
	calculateFugacityCoefficients(T, P, z, Z, outLnPhi, mixtureParams, workspace) {
		const ws = workspace || this.workspace;
		const mix = mixtureParams || this.calculateMixtureParams(T, z, ws.mixtureParams, ws);

		const N = this.numComponents;
		const RT = R_GAS * T;
		const am = mix.a;
		const bm = mix.b;

		const A = (am * P) / (RT * RT);
		const B = (bm * P) / RT;

		const ZminusB = Math.max(EPSILON, Z - B);
		const lnZminusB = Math.log(ZminusB);

		const argNumerator = Z + DELTA1 * B;
		const argDenominator = Math.max(EPSILON, Z + DELTA2 * B);
		const lnArg = Math.log(argNumerator / argDenominator);

		const prefactor = (A / (TWO_SQRT2 * B)) * lnArg;
		const zMinus1 = Z - 1.0;
		const invBm = 1.0 / bm;
		const twoOverAm = 2.0 / am;

		for (let i = 0; i < N; i++) {
			const biOverBm = this.b[i] * invBm;
			const term1 = biOverBm * zMinus1;
			const term2 = -lnZminusB;
			const term3 = -prefactor * (twoOverAm * mix.aSum[i] - biOverBm);

			outLnPhi[i] = term1 + term2 + term3;
		}

		return outLnPhi;
	}

	/**
	 * Computes thermodynamic enthalpy, entropy, and Gibbs departure functions.
	 *
	 * @param {number} T - Temperature [K]
	 * @param {number} P - Pressure [Pa]
	 * @param {ArrayLike<number>} z - Mole fraction vector (length N)
	 * @param {number} Z - Phase compressibility factor
	 * @param {import('../types/eos.js').PhaseDepartures} [outDepartures] - Reusable departure struct
	 * @param {import('../types/eos.js').CubicMixtureParams} [mixtureParams] - Pre-computed mixture parameters
	 * @returns {import('../types/eos.js').PhaseDepartures} Populated departure struct
	 */
	calculateDepartures(T, P, z, Z, outDepartures, mixtureParams) {
		const mix = mixtureParams || this.calculateMixtureParams(T, z);
		const dep = outDepartures || this.workspace.departures;

		const RT = R_GAS * T;
		const am = mix.a;
		const bm = mix.b;
		const dadTm = mix.dadT;
		const B = (bm * P) / RT;

		const ZminusB = Math.max(EPSILON, Z - B);
		const lnZminusB = Math.log(ZminusB);

		const argNumerator = Z + DELTA1 * B;
		const argDenominator = Math.max(EPSILON, Z + DELTA2 * B);
		const lnArg = Math.log(argNumerator / argDenominator);

		const factor = lnArg / (TWO_SQRT2 * bm);

		// H_dep = RT*(Z - 1) + (T * da/dT - a) / (2*sqrt(2)*b) * ln(...)
		dep.hDep = RT * (Z - 1.0) + (T * dadTm - am) * factor;

		// S_dep = R * ln(Z - B) + (da/dT) / (2*sqrt(2)*b) * ln(...)
		dep.sDep = R_GAS * lnZminusB + dadTm * factor;

		// G_dep = H_dep - T * S_dep
		dep.gDep = dep.hDep - T * dep.sDep;

		return dep;
	}

	/**
	 * Computes raw and Peneloux-corrected molar volume and mass densities.
	 *
	 * @param {number} T - Temperature [K]
	 * @param {number} P - Pressure [Pa]
	 * @param {ArrayLike<number>} z - Mole fraction vector (length N)
	 * @param {number} Z - Phase compressibility factor
	 * @param {import('../types/eos.js').PhaseDensity} [outDensity] - Reusable density struct
	 * @param {import('../types/eos.js').CubicMixtureParams} [mixtureParams] - Pre-computed mixture parameters
	 * @returns {import('../types/eos.js').PhaseDensity} Populated density struct
	 */
	calculateDensity(T, P, z, Z, outDensity, mixtureParams) {
		const mix = mixtureParams || this.calculateMixtureParams(T, z);
		const dens = outDensity || this.workspace.density;

		const RT = R_GAS * T;
		// v_untranslated = Z * R * T / P [m3/mol]
		const vUntranslated = (Z * RT) / P;
		// v_corr = v_untranslated - c_m [m3/mol]
		const vCorr = Math.max(1e-9, vUntranslated - mix.c);

		const rhoMolar = 1.0 / vCorr;
		const mw = this.mwMix(z);
		const rhoMass = rhoMolar * mw;

		dens.vUntranslated = vUntranslated;
		dens.vCorr = vCorr;
		dens.rhoMolar = rhoMolar;
		dens.rhoMass = rhoMass;

		return dens;
	}
}
