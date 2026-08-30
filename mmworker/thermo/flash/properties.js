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
 * @fileoverview Thermodynamic state assembler for phase properties, ideal gas integrals, departures, and bulk results.
 */

import { R_GAS, T_STD, P_STD, EPSILON } from '../math/constants.js';
import { integrateCpIdeal, integrateCpIdealOverT } from '../registry/dippr.js';
import { PhaseState } from '../types/flash.js';

/**
 * Calculates the ideal gas mixture enthalpy at temperature T relative to T_std (298.15 K).
 * H_ideal = sum_i [ z_i * int_{T_std}^T Cp0_i(T') dT' ] [J/mol]
 *
 * @param {import('../types/compound.js').PureCompound[]} compounds - Array of pure compound models
 * @param {ArrayLike<number>} z - Mole fraction vector (length N)
 * @param {number} T - System temperature [K]
 * @returns {number} Ideal gas mixture enthalpy [J/mol]
 */
export function calculateIdealGasEnthalpy(compounds, z, T) {
	let hIdeal = 0.0;
	const n = compounds.length;
	for (let i = 0; i < n; i++) {
		const zi = z[i];
		if (zi > 0.0) {
			const cp = compounds[i].cpIdeal;
			if (cp) {
				hIdeal += zi * integrateCpIdeal(cp, T_STD, T);
			}
		}
	}
	return hIdeal;
}

/**
 * Calculates the ideal gas mixture entropy at temperature T and pressure P relative to standard state.
 * S_ideal = sum_i [ z_i * ( int_{T_std}^T (Cp0_i / T') dT' - R*ln(z_i) ) ] - R*ln(P / P_std) [J/(mol*K)]
 *
 * @param {import('../types/compound.js').PureCompound[]} compounds - Array of pure compound models
 * @param {ArrayLike<number>} z - Mole fraction vector (length N)
 * @param {number} T - System temperature [K]
 * @param {number} P - System pressure [Pa]
 * @returns {number} Ideal gas mixture entropy [J/(mol*K)]
 */
export function calculateIdealGasEntropy(compounds, z, T, P) {
	let sIdeal = 0.0;
	const n = compounds.length;
	for (let i = 0; i < n; i++) {
		const zi = z[i];
		if (zi > 0.0) {
			const cp = compounds[i].cpIdeal;
			const sPure = cp ? integrateCpIdealOverT(cp, T_STD, T) : 0.0;
			const sMix = -R_GAS * Math.log(Math.max(EPSILON, zi));
			sIdeal += zi * (sPure + sMix);
		}
	}
	sIdeal -= R_GAS * Math.log(Math.max(EPSILON, P / P_STD));
	return sIdeal;
}

/**
 * Assembles the complete thermodynamic properties for an individual equilibrium phase.
 *
 * @param {'LIQUID'|'VAPOR'} phase - Phase name
 * @param {number} phaseBeta - Phase mole fraction in the overall system
 * @param {ArrayLike<number>} moleFractions - Mole fraction vector (length N)
 * @param {number} zFactor - Compressibility factor Z
 * @param {Float64Array} lnPhi - Fugacity coefficient vector ln(phi_i) (length N)
 * @param {import('../types/eos.js').PropertyPackage} eos - Property package
 * @param {number} T - System temperature [K]
 * @param {number} P - System pressure [Pa]
 * @param {import('../types/memory.js').ThermodynamicWorkspace} [workspace] - Workspace buffer
 * @returns {import('../types/flash.js').PhaseProperties}
 */
export function assemblePhaseProperties(phase, phaseBeta, moleFractions, zFactor, lnPhi, eos, T, P, workspace) {
	const N = eos.numComponents;
	const outZ = new Float64Array(N);
	const outLnPhi = new Float64Array(N);
	for (let i = 0; i < N; i++) {
		outZ[i] = moleFractions[i];
		outLnPhi[i] = lnPhi[i];
	}

	const dep = eos.calculateDepartures(T, P, outZ, zFactor);
	const dens = eos.calculateDensity(T, P, outZ, zFactor);

	const hIdeal = calculateIdealGasEnthalpy(eos.compounds, outZ, T);
	const sIdeal = calculateIdealGasEntropy(eos.compounds, outZ, T, P);

	const enthalpy = hIdeal + dep.hDep;
	const entropy = sIdeal + dep.sDep;
	const gibbs = enthalpy - T * entropy;
	const mw = eos.mwMix(outZ);

	return {
		phase,
		beta: phaseBeta,
		moleFractions: outZ,
		zFactor,
		molarVolume: dens.vCorr,
		massDensity: dens.rhoMass,
		molarDensity: dens.rhoMolar,
		enthalpy,
		entropy,
		gibbs,
		hDep: dep.hDep,
		sDep: dep.sDep,
		gDep: dep.gDep,
		mw,
		lnPhi: outLnPhi
	};
}

/**
 * Assembles the complete FlashResult containing liquid, vapor, and bulk mixture properties.
 *
 * @param {number} T - System temperature [K]
 * @param {number} P - System pressure [Pa]
 * @param {ArrayLike<number>} z - Overall feed mole fractions (length N)
 * @param {number} beta - Solved vapor fraction
 * @param {Float64Array} x - Solved liquid mole fractions (length N)
 * @param {Float64Array} y - Solved vapor mole fractions (length N)
 * @param {Float64Array} K - Solved equilibrium K-values (length N)
 * @param {number} zL - Liquid compressibility factor
 * @param {number} zV - Vapor compressibility factor
 * @param {Float64Array} lnPhiL - Liquid fugacity coefficients (length N)
 * @param {Float64Array} lnPhiV - Vapor fugacity coefficients (length N)
 * @param {import('../types/eos.js').PropertyPackage} eos - Property package
 * @param {import('../types/memory.js').ThermodynamicWorkspace} workspace - Workspace buffer
 * @param {{ converged: boolean, iterations: number, residual: number }} info - Convergence info
 * @returns {import('../types/flash.js').FlashResult}
 */
export function assembleFlashResult(
	T,
	P,
	z,
	beta,
	x,
	y,
	K,
	zL,
	zV,
	lnPhiL,
	lnPhiV,
	eos,
	workspace,
	info
) {
	const N = eos.numComponents;
	const outX = new Float64Array(N);
	const outY = new Float64Array(N);
	const outK = new Float64Array(N);

	for (let i = 0; i < N; i++) {
		outX[i] = x[i];
		outY[i] = y[i];
		outK[i] = K[i];
	}

	/** @type {string} */
	let phaseState = PhaseState.TWO_PHASE;
	if (beta <= 1e-9) {
		phaseState = PhaseState.LIQUID;
	} else if (beta >= 1.0 - 1e-9) {
		phaseState = PhaseState.VAPOR;
	}

	/** @type {import('../types/flash.js').PhaseProperties|null} */
	let liquid = null;
	/** @type {import('../types/flash.js').PhaseProperties|null} */
	let vapor = null;

	if (phaseState === PhaseState.LIQUID) {
		liquid = assemblePhaseProperties('LIQUID', 1.0, outX, zL, lnPhiL, eos, T, P, workspace);
		vapor = null;
	} else if (phaseState === PhaseState.VAPOR) {
		liquid = null;
		vapor = assemblePhaseProperties('VAPOR', 1.0, outY, zV, lnPhiV, eos, T, P, workspace);
	} else {
		liquid = assemblePhaseProperties('LIQUID', 1.0 - beta, outX, zL, lnPhiL, eos, T, P, workspace);
		vapor = assemblePhaseProperties('VAPOR', beta, outY, zV, lnPhiV, eos, T, P, workspace);
	}

	const mwBulk = eos.mwMix(z);

	/** @type {import('../types/flash.js').BulkProperties} */
	let bulk;

	if (phaseState === PhaseState.LIQUID && liquid) {
		bulk = {
			beta: 0.0,
			zFactor: liquid.zFactor,
			molarVolume: liquid.molarVolume,
			massDensity: liquid.massDensity,
			molarDensity: liquid.molarDensity,
			enthalpy: liquid.enthalpy,
			entropy: liquid.entropy,
			gibbs: liquid.gibbs,
			mw: mwBulk
		};
	} else if (phaseState === PhaseState.VAPOR && vapor) {
		bulk = {
			beta: 1.0,
			zFactor: vapor.zFactor,
			molarVolume: vapor.molarVolume,
			massDensity: vapor.massDensity,
			molarDensity: vapor.molarDensity,
			enthalpy: vapor.enthalpy,
			entropy: vapor.entropy,
			gibbs: vapor.gibbs,
			mw: mwBulk
		};
	} else if (liquid && vapor) {
		const betaV = beta;
		const betaL = 1.0 - beta;
		const zBulk = betaL * liquid.zFactor + betaV * vapor.zFactor;
		const vBulk = betaL * liquid.molarVolume + betaV * vapor.molarVolume;
		const rhoMolarBulk = 1.0 / vBulk;
		const rhoMassBulk = rhoMolarBulk * mwBulk;
		const hBulk = betaL * liquid.enthalpy + betaV * vapor.enthalpy;
		const sBulk = betaL * liquid.entropy + betaV * vapor.entropy;
		const gBulk = betaL * liquid.gibbs + betaV * vapor.gibbs;

		bulk = {
			beta: betaV,
			zFactor: zBulk,
			molarVolume: vBulk,
			massDensity: rhoMassBulk,
			molarDensity: rhoMolarBulk,
			enthalpy: hBulk,
			entropy: sBulk,
			gibbs: gBulk,
			mw: mwBulk
		};
	} else {
		bulk = {
			beta,
			zFactor: 1.0,
			molarVolume: (R_GAS * T) / P,
			massDensity: (P * mwBulk) / (R_GAS * T),
			molarDensity: P / (R_GAS * T),
			enthalpy: 0.0,
			entropy: 0.0,
			gibbs: 0.0,
			mw: mwBulk
		};
	}

	return {
		T,
		P,
		beta,
		phaseState,
		converged: info.converged,
		iterations: info.iterations,
		residual: info.residual,
		x: outX,
		y: outY,
		K: outK,
		liquid,
		vapor,
		liquidPhase2: null,
		liquid2: null,
		bulk
	};
}
