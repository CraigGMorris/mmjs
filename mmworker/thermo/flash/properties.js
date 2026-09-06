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
import { integrateCpIdeal, integrateCpIdealOverT, evaluateDippr, evaluateDippr100, evaluateDippr102, evaluateChemSep16 } from '../registry/dippr.js';
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
 * Calculates pure component liquid thermal conductivity at temperature T [W/(m*K)].
 * Uses compound.liquidThermalConductivity if present; otherwise falls back to Sato-Riedel correlation.
 *
 * @param {import('../types/compound.js').PureCompound} compound - Pure compound model
 * @param {number} T - System temperature [K]
 * @returns {number} Liquid thermal conductivity [W/(m*K)]
 */
export function calculatePureLiquidThermalConductivity(compound, T) {
	const ltc = compound.liquidThermalConductivity;
	if (ltc) {
		const c = ltc.coeffs;
		if (c) {
			if (ltc.eq === 16) {
				const val = evaluateChemSep16(c, T);
				if (val > 0.0) return val;
			} else if (ltc.eq === 100 || (ltc.eq >= 1 && ltc.eq <= 5)) {
				const val = evaluateDippr100(c, T);
				if (val > 0.0) return val;
			} else {
				const val = evaluateDippr(ltc, T, compound.tc);
				if (val > 0.0 && Number.isFinite(val)) return val;
			}
		}
	}

	// Sato-Riedel correlation fallback:
	// kL = (1.1053 / sqrt(M_g_mol)) * (3 + 20*(1 - Tr)^(2/3)) / (3 + 20*(1 - Tbr)^(2/3))
	const mwGmol = Math.max(1e-3, compound.mw * 1000.0);
	const tc = Math.max(1e-3, compound.tc);
	const tb = compound.tb && compound.tb > 0.0 ? compound.tb : 0.65 * tc;

	const Tr = Math.min(1.0, Math.max(0.0, T / tc));
	const Tbr = Math.min(1.0, Math.max(0.0, tb / tc));

	const oneMinusTr = Math.max(0.0, 1.0 - Tr);
	const oneMinusTbr = Math.max(0.0, 1.0 - Tbr);

	const num = 3.0 + 20.0 * Math.cbrt(oneMinusTr * oneMinusTr);
	const denom = 3.0 + 20.0 * Math.cbrt(oneMinusTbr * oneMinusTbr);

	return (1.1053 / Math.sqrt(mwGmol)) * (num / denom);
}

/**
 * Calculates pure component vapor thermal conductivity at temperature T [W/(m*K)].
 * Uses compound.vaporThermalConductivity if present; otherwise falls back to Modified Eucken correlation.
 *
 * @param {import('../types/compound.js').PureCompound} compound - Pure compound model
 * @param {number} T - System temperature [K]
 * @returns {number} Vapor thermal conductivity [W/(m*K)]
 */
export function calculatePureVaporThermalConductivity(compound, T) {
	const vtc = compound.vaporThermalConductivity;
	if (vtc) {
		const c = vtc.coeffs;
		if (c) {
			if (vtc.eq === 102) {
				const val = evaluateDippr102(c, T);
				if (val > 0.0) return val;
			} else {
				const val = evaluateDippr(vtc, T, compound.tc);
				if (val > 0.0 && Number.isFinite(val)) return val;
			}
		}
	}

	// Modified Eucken fallback:
	// kv = (eta_v / M) * (Cp_v + 1.25 * R)
	let etaV = 0.0;
	if (compound.vaporViscosity) {
		etaV = evaluateDippr(compound.vaporViscosity, T, compound.tc);
	}
	if (etaV <= 0.0 || !Number.isFinite(etaV)) {
		const mwGmol = Math.max(1e-3, compound.mw * 1000.0);
		etaV = 1e-7 * Math.sqrt(mwGmol) * Math.sqrt(Math.max(1.0, T));
	}

	let cpV = 0.0;
	if (compound.cpIdeal) {
		cpV = evaluateDippr(compound.cpIdeal, T, compound.tc);
	}
	if (cpV <= 0.0 || !Number.isFinite(cpV)) {
		cpV = 3.5 * R_GAS;
	}

	const M = Math.max(1e-4, compound.mw); // kg/mol
	return (etaV / M) * (cpV + 1.25 * R_GAS);
}

/**
 * Calculates liquid mixture thermal conductivity via mass-fraction weighting:
 * k_L = sum_i (w_i * k_L_i)
 *
 * @param {import('../types/compound.js').PureCompound[]} compounds - Pure compound models
 * @param {ArrayLike<number>} x - Liquid mole fraction vector (length N)
 * @param {number} T - System temperature [K]
 * @param {import('../types/memory.js').ThermodynamicWorkspace} [workspace] - Optional workspace
 * @returns {number} Liquid mixture thermal conductivity [W/(m*K)]
 */
export function calculateLiquidMixtureThermalConductivity(compounds, x, T, workspace) {
	const N = compounds.length;
	if (N === 1) {
		return calculatePureLiquidThermalConductivity(compounds[0], T);
	}

	let mwMix = 0.0;
	let sumWeightedK = 0.0;
	for (let i = 0; i < N; i++) {
		const xi = x[i];
		if (xi > 0.0) {
			const comp = compounds[i];
			const massI = xi * comp.mw;
			mwMix += massI;
			sumWeightedK += massI * calculatePureLiquidThermalConductivity(comp, T);
		}
	}
	return mwMix > 0.0 ? sumWeightedK / mwMix : 0.15;
}

/**
 * Calculates vapor mixture thermal conductivity via the Wassiljewa / Mason-Saxena formula
 * using the Wilke A_ij interaction parameter matrix.
 *
 * k_V = sum_i [ (y_i * k_V_i) / sum_j (y_j * A_ij) ]
 *
 * A_ij = [ 1 + (eta_i / eta_j)^(1/2) * (M_j / M_i)^(1/4) ]^2 / sqrt(8 * (1 + M_i / M_j))
 *
 * @param {import('../types/compound.js').PureCompound[]} compounds - Pure compound models
 * @param {ArrayLike<number>} y - Vapor mole fraction vector (length N)
 * @param {number} T - System temperature [K]
 * @param {import('../types/memory.js').ThermodynamicWorkspace} [workspace] - Optional workspace buffer
 * @returns {number} Vapor mixture thermal conductivity [W/(m*K)]
 */
export function calculateVaporMixtureThermalConductivity(compounds, y, T, workspace) {
	const N = compounds.length;
	if (N === 1) {
		return calculatePureVaporThermalConductivity(compounds[0], T);
	}

	const pureK = workspace?.pureK;
	const pureEta = workspace?.pureEta;

	for (let i = 0; i < N; i++) {
		const comp = compounds[i];
		const ki = calculatePureVaporThermalConductivity(comp, T);
		let etai = comp.vaporViscosity ? evaluateDippr(comp.vaporViscosity, T, comp.tc) : 0.0;
		if (etai <= 0.0 || !Number.isFinite(etai)) {
			const mwGmol = Math.max(1e-3, comp.mw * 1000.0);
			etai = 1e-7 * Math.sqrt(mwGmol) * Math.sqrt(Math.max(1.0, T));
		}
		if (pureK && pureEta) {
			pureK[i] = ki;
			pureEta[i] = Math.sqrt(etai);
		}
	}

	let kMix = 0.0;
	for (let i = 0; i < N; i++) {
		const yi = y[i];
		if (yi <= 0.0) continue;

		const compI = compounds[i];
		const ki = pureK ? pureK[i] : calculatePureVaporThermalConductivity(compI, T);
		const vviscI = compI.vaporViscosity;
		const sqrtEtaI = pureEta ? pureEta[i] : Math.sqrt(vviscI ? evaluateDippr(vviscI, T, compI.tc) : 1e-5);
		const Mi = compI.mw;

		let denom = 0.0;
		for (let j = 0; j < N; j++) {
			const yj = y[j];
			if (yj <= 0.0) continue;

			if (i === j) {
				denom += yj;
			} else {
				const compJ = compounds[j];
				const vviscJ = compJ.vaporViscosity;
				const sqrtEtaJ = pureEta ? pureEta[j] : Math.sqrt(vviscJ ? evaluateDippr(vviscJ, T, compJ.tc) : 1e-5);
				const Mj = compJ.mw;

				const etaRatioSqrt = sqrtEtaI / sqrtEtaJ;
				const mRatio = Mj / Mi;
				const numA = 1.0 + etaRatioSqrt * Math.pow(mRatio, 0.25);
				const denomA = Math.sqrt(8.0 * (1.0 + Mi / Mj));
				const Aij = (numA * numA) / denomA;

				denom += yj * Aij;
			}
		}

		if (denom > 0.0) {
			kMix += (yi * ki) / denom;
		}
	}

	return kMix;
}

/**
 * Evaluates phase thermal conductivity based on phase state (liquid or vapor).
 *
 * @param {'LIQUID'|'VAPOR'|string} phase - Phase identifier
 * @param {ArrayLike<number>} moleFractions - Phase composition
 * @param {number} T - System temperature [K]
 * @param {import('../types/compound.js').PureCompound[]} compounds - Pure compound models
 * @param {import('../types/memory.js').ThermodynamicWorkspace} [workspace] - Workspace buffer
 * @returns {number} Thermal conductivity [W/(m*K)]
 */
export function calculateThermalConductivity(phase, moleFractions, T, compounds, workspace) {
	const isVap = phase === 'VAPOR' || phase === 'Vapor';
	if (isVap) {
		return calculateVaporMixtureThermalConductivity(compounds, moleFractions, T, workspace);
	}
	return calculateLiquidMixtureThermalConductivity(compounds, moleFractions, T, workspace);
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
	const thermalConductivity = calculateThermalConductivity(phase, outZ, T, eos.compounds, workspace);

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
		thermalConductivity,
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

	const isTwoPhase = beta > 1e-9 && beta < 1.0 - 1e-9;
	let isEquilibrium = isTwoPhase;
	if (!isTwoPhase && Math.abs(zV - zL) > 1e-4) {
		let sum = 0.0;
		if (beta <= 1e-9) {
			for (let i = 0; i < N; i++) sum += z[i] * K[i];
		} else {
			for (let i = 0; i < N; i++) sum += z[i] / K[i];
		}
		if (Math.abs(sum - 1.0) < 1e-3) {
			isEquilibrium = true;
		}
	}

	const hasLiquid = beta < 1.0 - 1e-9 || isEquilibrium;
	const hasVapor = beta > 1e-9 || isEquilibrium;

	/** @type {import('../types/flash.js').PhaseProperties|null} */
	let liquid = null;
	/** @type {import('../types/flash.js').PhaseProperties|null} */
	let vapor = null;

	if (hasLiquid) {
		const fracL = phaseState === PhaseState.LIQUID ? 1.0 : (phaseState === PhaseState.VAPOR ? 0.0 : 1.0 - beta);
		liquid = assemblePhaseProperties('LIQUID', fracL, outX, zL, lnPhiL, eos, T, P, workspace);
	}
	if (hasVapor) {
		const fracV = phaseState === PhaseState.VAPOR ? 1.0 : (phaseState === PhaseState.LIQUID ? 0.0 : beta);
		vapor = assemblePhaseProperties('VAPOR', fracV, outY, zV, lnPhiV, eos, T, P, workspace);
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
			mw: mwBulk,
			thermalConductivity: liquid.thermalConductivity
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
			mw: mwBulk,
			thermalConductivity: vapor.thermalConductivity
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
		const kBulk = betaL * (liquid.thermalConductivity || 0.15) + betaV * (vapor.thermalConductivity || 0.025);

		bulk = {
			beta: betaV,
			zFactor: zBulk,
			molarVolume: vBulk,
			massDensity: rhoMassBulk,
			molarDensity: rhoMolarBulk,
			enthalpy: hBulk,
			entropy: sBulk,
			gibbs: gBulk,
			mw: mwBulk,
			thermalConductivity: kBulk
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
			mw: mwBulk,
			thermalConductivity: beta >= 1.0 ? 0.025 : 0.15
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
