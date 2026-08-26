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
 * @fileoverview Immiscible Free-Water 3-Phase (VLLE) Decoupling Engine for Hydrocarbon-Water Systems.
 */

import { R_GAS, EPSILON } from '../math/constants.js';
import { ThermodynamicWorkspace } from '../types/memory.js';
import { PhaseState, PhaseType } from '../types/flash.js';
import { evaluateDippr } from '../registry/dippr.js';
import { flashTP } from './flash-tp.js';
import { assemblePhaseProperties, calculateIdealGasEnthalpy, calculateIdealGasEntropy } from './properties.js';

/**
 * Detects the index of the water component in a list of PureCompound objects.
 * Matches CAS (7732-18-5), formula (H2O), ID (water), or name (Water).
 *
 * @param {import('../types/compound.js').PureCompound[]} compounds - List of compounds
 * @returns {number} Index of water component, or -1 if not present
 */
export function findWaterIndex(compounds) {
	if (!compounds || compounds.length === 0) return -1;
	for (let i = 0; i < compounds.length; i++) {
		const c = compounds[i];
		if (!c) continue;
		if (c.cas && c.cas.trim() === '7732-18-5') return i;
		if (c.formula && c.formula.trim().toUpperCase() === 'H2O') return i;
		if (c.id && c.id.trim().toLowerCase() === 'water') return i;
		if (c.name && c.name.trim().toLowerCase() === 'water') return i;
	}
	return -1;
}

/**
 * Calculates pure water saturation vapor pressure and Poynting-corrected pressure at (T, P).
 *
 * P_w(T, P) = P_w^sat(T) * exp[ v_w^L * (P - P_w^sat(T)) / (R * T) ]
 *
 * @param {import('../types/compound.js').PureCompound} waterComp - Pure water compound model
 * @param {number} T - Temperature [K]
 * @param {number} P - Pressure [Pa]
 * @returns {{ pSat: number, pWater: number, vLiq: number }}
 */
export function calculateWaterVaporPressure(waterComp, T, P) {
	const tc = waterComp.tc || 647.14;
	const pc = waterComp.pc || 22064000.0;
	const mw = waterComp.mw || 0.01801528;

	let pSat = 0.0;
	if (T >= tc) {
		pSat = pc;
	} else if (waterComp.vaporPressure) {
		pSat = evaluateDippr(waterComp.vaporPressure, T, tc);
	} else {
		// Fallback to Wilson vapor pressure correlation
		const Tr = T / tc;
		pSat = pc * Math.exp(5.373 * (1.0 + (waterComp.omega || 0.344)) * (1.0 - 1.0 / Tr));
	}

	if (isNaN(pSat) || pSat <= 0.0) {
		pSat = 101325.0;
	}

	// Liquid molar volume v_w^L [m3/mol]
	let vLiq = 1.8068e-5; // Default ~ 18 mL/mol
	if (waterComp.liquidDensity && T < tc) {
		const rho = evaluateDippr(waterComp.liquidDensity, T, tc);
		if (rho > 0.0) {
			// If rho is molar density [kmol/m3 or mol/m3] vs mass density [kg/m3]
			if (rho < 100.0) {
				// kmol/m3
				vLiq = 0.001 / rho;
			} else if (rho < 10000.0) {
				// kg/m3 or mol/m3
				vLiq = (rho > 2000.0) ? (1.0 / rho) : (mw / rho);
			}
		}
	}

	// Poynting correction factor
	const deltaP = P - pSat;
	const RT = R_GAS * T;
	const poyntingArg = (vLiq * deltaP) / RT;
	const clampedArg = Math.max(-10.0, Math.min(10.0, poyntingArg));
	const poynting = Math.exp(clampedArg);

	const pWater = pSat * poynting;

	return { pSat, pWater, vLiq };
}

/**
 * Solves 3-phase immiscible free-water (VLLE) decoupling flash for hydrocarbon + water systems.
 *
 * @param {number} T - System temperature [K]
 * @param {number} P - System pressure [Pa]
 * @param {ArrayLike<number>} z - Feed mole fraction vector (length N)
 * @param {import('../types/eos.js').PropertyPackage} eos - Property package instance
 * @param {import('../types/flash.js').FlashOptions} [options={}] - Flash options
 * @param {ThermodynamicWorkspace} [workspace] - Workspace buffer
 * @returns {import('../types/flash.js').FlashResult}
 */
export function immiscible3PhaseFlash(T, P, z, eos, options = {}, workspace) {
	const N = eos.numComponents;
	const ws = workspace || (eos instanceof Object && 'workspace' in eos && eos.workspace instanceof ThermodynamicWorkspace ? eos.workspace : new ThermodynamicWorkspace(N));

	// 1. Identify water component
	const w = findWaterIndex(eos.compounds);

	// Normalize feed composition
	let sumZ = 0.0;
	for (let i = 0; i < N; i++) {
		sumZ += z[i];
	}
	const invSumZ = sumZ > 0.0 ? 1.0 / sumZ : 1.0;
	for (let i = 0; i < N; i++) {
		ws.z[i] = z[i] * invSumZ;
	}

	const zw = (w >= 0) ? ws.z[w] : 0.0;

	// If no water or zero water fraction, fall back to standard 2-phase flash
	if (w < 0 || zw <= 1e-12) {
		const res2P = flashTP(T, P, ws.z, eos, options, ws);
		return {
			...res2P,
			liquidPhase2: null,
			liquid2: null,
			betaL1: res2P.liquid ? res2P.liquid.beta : 0.0,
			betaL2: 0.0
		};
	}

	const waterComp = eos.compounds[w];

	// If 100% water feed
	if (zw >= 1.0 - 1e-12) {
		const { pWater } = calculateWaterVaporPressure(waterComp, T, P);
		for (let i = 0; i < N; i++) {
			ws.x[i] = (i === w) ? 1.0 : 0.0;
			ws.y[i] = (i === w) ? 1.0 : 0.0;
			ws.x2[i] = (i === w) ? 1.0 : 0.0;
			ws.K[i] = 1.0;
		}

		if (pWater >= P) {
			// Superheated pure water vapor
			eos.calculateZFactors(T, P, ws.y, ws.zFactors, undefined, ws);
			const zV = ws.zFactors[1];
			eos.calculateFugacityCoefficients(T, P, ws.y, zV, ws.lnPhiV, undefined, ws);
			const vaporProps = assemblePhaseProperties('VAPOR', 1.0, ws.y, zV, ws.lnPhiV, eos, T, P, ws);
			vaporProps.phaseType = PhaseType.Vapor;

			return {
				T,
				P,
				beta: 1.0,
				phaseState: PhaseState.VAPOR,
				converged: true,
				iterations: 1,
				residual: 0.0,
				x: ws.x,
				y: ws.y,
				K: ws.K,
				liquid: null,
				vapor: vaporProps,
				liquidPhase2: null,
				liquid2: null,
				betaL1: 0.0,
				betaL2: 0.0,
				bulk: {
					beta: 1.0,
					zFactor: vaporProps.zFactor,
					molarVolume: vaporProps.molarVolume,
					massDensity: vaporProps.massDensity,
					molarDensity: vaporProps.molarDensity,
					enthalpy: vaporProps.enthalpy,
					entropy: vaporProps.entropy,
					gibbs: vaporProps.gibbs,
					mw: vaporProps.mw
				}
			};
		} else {
			// Subcooled pure aqueous liquid
			eos.calculateZFactors(T, P, ws.x2, ws.zFactors, undefined, ws);
			const zL2 = ws.zFactors[0];
			eos.calculateFugacityCoefficients(T, P, ws.x2, zL2, ws.lnPhiL2, undefined, ws);
			const liq2Props = assemblePhaseProperties('LIQUID', 1.0, ws.x2, zL2, ws.lnPhiL2, eos, T, P, ws);
			liq2Props.phase = 'LIQUID_2';
			liq2Props.phaseType = PhaseType.Liquid2;

			return {
				T,
				P,
				beta: 0.0,
				phaseState: PhaseState.LIQUID,
				converged: true,
				iterations: 1,
				residual: 0.0,
				x: ws.x2,
				y: ws.y,
				K: ws.K,
				liquid: null,
				vapor: null,
				liquidPhase2: liq2Props,
				liquid2: liq2Props,
				betaL1: 0.0,
				betaL2: 1.0,
				bulk: {
					beta: 0.0,
					zFactor: liq2Props.zFactor,
					molarVolume: liq2Props.molarVolume,
					massDensity: liq2Props.massDensity,
					molarDensity: liq2Props.molarDensity,
					enthalpy: liq2Props.enthalpy,
					entropy: liq2Props.entropy,
					gibbs: liq2Props.gibbs,
					mw: liq2Props.mw
				}
			};
		}
	}

	// 2. Compute water vapor pressure and maximum vapor capacity
	const { pWater } = calculateWaterVaporPressure(waterComp, T, P);
	const ywMax = pWater / P;

	// Case: Water is superheated (pWater >= P) -> all water is vapor, single/two-phase standard VLE
	if (ywMax >= 1.0) {
		const res2P = flashTP(T, P, ws.z, eos, options, ws);
		return {
			...res2P,
			liquidPhase2: null,
			liquid2: null,
			betaL1: res2P.liquid ? res2P.liquid.beta : 0.0,
			betaL2: 0.0
		};
	}

	// 3. Decouple dry hydrocarbons
	const fDry = 1.0 - zw;
	const invFDry = 1.0 / fDry;
	const zDry = ws.temp1;
	for (let i = 0; i < N; i++) {
		zDry[i] = (i === w) ? 0.0 : ws.z[i] * invFDry;
	}

	// Effective hydrocarbon partial pressure
	const pHC = Math.max(100.0, P - pWater);

	// Solve 2-phase VLE on dry hydrocarbon fraction at (T, pHC)
	const dryRes = flashTP(T, pHC, zDry, eos, options, ws);
	const betaDry = dryRes.beta;

	// Dry vapor moles per total feed mole
	const vDry = fDry * betaDry;

	// Maximum water moles vapor can hold
	const vWaterMax = (ywMax / (1.0 - ywMax)) * vDry;

	let V = 0.0;
	let L1 = 0.0;
	let L2 = 0.0;
	let yw = 0.0;

	if (zw > vWaterMax) {
		// Three-Phase Split (VLLE): Excess water forms pure aqueous liquid L2
		L2 = zw - vWaterMax;
		V = vDry + vWaterMax;
		L1 = fDry * (1.0 - betaDry);
		yw = ywMax;
	} else {
		// Wet-to-Dry Transition (2-Phase VLE): All water enters vapor phase, L2 = 0
		L2 = 0.0;
		V = vDry + zw;
		L1 = fDry * (1.0 - betaDry);
		yw = (V > 1e-12) ? (zw / V) : 0.0;
	}

	// 4. Reconstruct phase compositions
	const yMix = ws.y;
	const x1Mix = ws.x;
	const x2Mix = ws.x2;

	const factorYDry = 1.0 - yw;
	for (let i = 0; i < N; i++) {
		if (i === w) {
			yMix[i] = yw;
			x1Mix[i] = 0.0;
			x2Mix[i] = 1.0;
		} else {
			yMix[i] = factorYDry * (dryRes.y ? dryRes.y[i] : zDry[i]);
			x1Mix[i] = dryRes.x ? dryRes.x[i] : zDry[i];
			x2Mix[i] = 0.0;
		}
	}

	// Normalize x1Mix and yMix
	let sumY = 0.0, sumX1 = 0.0;
	for (let i = 0; i < N; i++) {
		sumY += yMix[i];
		sumX1 += x1Mix[i];
	}
	if (sumY > 0.0) {
		const invY = 1.0 / sumY;
		for (let i = 0; i < N; i++) yMix[i] *= invY;
	}
	if (sumX1 > 0.0) {
		const invX1 = 1.0 / sumX1;
		for (let i = 0; i < N; i++) x1Mix[i] *= invX1;
	}

	// 5. K-values calculation
	for (let i = 0; i < N; i++) {
		if (i === w) {
			ws.K[i] = (L2 > 0.0) ? (yMix[i] / 1.0) : (x1Mix[i] > 1e-12 ? yMix[i] / x1Mix[i] : yw / Math.max(1e-12, zw));
		} else {
			ws.K[i] = (x1Mix[i] > 1e-12) ? (yMix[i] / x1Mix[i]) : (dryRes.K ? dryRes.K[i] : 1.0);
		}
	}

	// 6. Assemble individual phase properties
	/** @type {import('../types/flash.js').PhaseProperties|null} */
	let vaporProps = null;
	if (V > 1e-9) {
		eos.calculateZFactors(T, P, yMix, ws.zFactors, undefined, ws);
		const zV = ws.zFactors[1];
		eos.calculateFugacityCoefficients(T, P, yMix, zV, ws.lnPhiV, undefined, ws);
		vaporProps = assemblePhaseProperties('VAPOR', V, yMix, zV, ws.lnPhiV, eos, T, P, ws);
		vaporProps.phaseType = PhaseType.Vapor;
	}

	/** @type {import('../types/flash.js').PhaseProperties|null} */
	let liq1Props = null;
	if (L1 > 1e-9) {
		eos.calculateZFactors(T, P, x1Mix, ws.zFactors, undefined, ws);
		const zL1 = ws.zFactors[0];
		eos.calculateFugacityCoefficients(T, P, x1Mix, zL1, ws.lnPhiL, undefined, ws);
		liq1Props = assemblePhaseProperties('LIQUID', L1, x1Mix, zL1, ws.lnPhiL, eos, T, P, ws);
		liq1Props.phaseType = PhaseType.Liquid;
	}

	/** @type {import('../types/flash.js').PhaseProperties|null} */
	let liq2Props = null;
	if (L2 > 1e-9) {
		eos.calculateZFactors(T, P, x2Mix, ws.zFactors, undefined, ws);
		const zL2 = ws.zFactors[0];
		eos.calculateFugacityCoefficients(T, P, x2Mix, zL2, ws.lnPhiL2, undefined, ws);
		liq2Props = assemblePhaseProperties('LIQUID', L2, x2Mix, zL2, ws.lnPhiL2, eos, T, P, ws);
		liq2Props.phase = 'LIQUID_2';
		liq2Props.phaseType = PhaseType.Liquid2;
	}

	// 7. Bulk mixture properties
	const mwBulk = eos.mwMix(ws.z);
	let zBulk = 0.0;
	let vBulk = 0.0;
	let hBulk = 0.0;
	let sBulk = 0.0;

	if (vaporProps) {
		zBulk += V * vaporProps.zFactor;
		vBulk += V * vaporProps.molarVolume;
		hBulk += V * vaporProps.enthalpy;
		sBulk += V * vaporProps.entropy;
	}
	if (liq1Props) {
		zBulk += L1 * liq1Props.zFactor;
		vBulk += L1 * liq1Props.molarVolume;
		hBulk += L1 * liq1Props.enthalpy;
		sBulk += L1 * liq1Props.entropy;
	}
	if (liq2Props) {
		zBulk += L2 * liq2Props.zFactor;
		vBulk += L2 * liq2Props.molarVolume;
		hBulk += L2 * liq2Props.enthalpy;
		sBulk += L2 * liq2Props.entropy;
	}

	if (vBulk <= 0.0) {
		vBulk = (R_GAS * T) / P;
	}
	const rhoMolarBulk = 1.0 / vBulk;
	const rhoMassBulk = rhoMolarBulk * mwBulk;
	const gBulk = hBulk - T * sBulk;

	let phaseState = PhaseState.TWO_PHASE;
	if (L2 > 1e-6 && L1 > 1e-6 && V > 1e-6) {
		phaseState = PhaseState.THREE_PHASE;
	} else if (V <= 1e-6 && (L1 > 1e-6 || L2 > 1e-6)) {
		phaseState = PhaseState.LIQUID;
	} else if (V >= 1.0 - 1e-6) {
		phaseState = PhaseState.VAPOR;
	}

	// Final arrays
	const outX = new Float64Array(N);
	const outY = new Float64Array(N);
	const outK = new Float64Array(N);
	for (let i = 0; i < N; i++) {
		outX[i] = x1Mix[i];
		outY[i] = yMix[i];
		outK[i] = ws.K[i];
	}

	return {
		T,
		P,
		beta: V,
		phaseState,
		converged: dryRes.converged,
		iterations: dryRes.iterations,
		residual: dryRes.residual,
		x: outX,
		y: outY,
		K: outK,
		liquid: liq1Props,
		vapor: vaporProps,
		liquidPhase2: liq2Props,
		liquid2: liq2Props,
		betaL1: L1,
		betaL2: L2,
		bulk: {
			beta: V,
			zFactor: zBulk,
			molarVolume: vBulk,
			massDensity: rhoMassBulk,
			molarDensity: rhoMolarBulk,
			enthalpy: hBulk,
			entropy: sBulk,
			gibbs: gBulk,
			mw: mwBulk
		}
	};
}
