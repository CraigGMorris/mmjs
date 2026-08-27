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
 * @fileoverview Type definitions and interfaces for Equation of State (EOS) property packages.
 */

/**
 * Mixture parameters for cubic equations of state.
 * @typedef {Object} CubicMixtureParams
 * @property {number} a - Mixture attractive parameter a_m [J*m3/mol2]
 * @property {number} b - Mixture co-volume parameter b_m [m3/mol]
 * @property {number} c - Mixture Peneloux volume translation parameter c_m [m3/mol]
 * @property {number} dadT - Temperature derivative of attractive parameter da_m/dT [J*m3/(mol2*K)]
 * @property {Float64Array} aSum - Cross-component attractive summation vector sum_j(z_j * a_ij) [length N]
 * @property {Float64Array} aMatrix - Flattened N x N cross-parameter matrix a_ij
 */

/**
 * Compressibility factors for liquid and vapor phases.
 * @typedef {Object} PhaseZFactors
 * @property {number} zL - Liquid compressibility factor Z_L
 * @property {number} zV - Vapor compressibility factor Z_V
 * @property {number} numRoots - Number of valid real cubic roots (1 or 3)
 */

/**
 * Thermodynamic departure functions relative to the ideal gas state at identical T and P.
 * @typedef {Object} PhaseDepartures
 * @property {number} hDep - Enthalpy departure H - H_ig [J/mol]
 * @property {number} sDep - Entropy departure S - S_ig [J/(mol*K)]
 * @property {number} gDep - Gibbs free energy departure G - G_ig [J/mol]
 */

/**
 * Molar volume and density properties of a phase.
 * @typedef {Object} PhaseDensity
 * @property {number} vUntranslated - Raw EOS molar volume [m3/mol]
 * @property {number} vCorr - Peneloux volume-translated molar volume [m3/mol]
 * @property {number} rhoMolar - Corrected molar density [mol/m3]
 * @property {number} rhoMass - Corrected mass density [kg/m3]
 */

/**
 * Standard contract for thermodynamic property packages.
 * @typedef {Object} PropertyPackage
 * @property {number} numComponents - Number of active components in the system
 * @property {import('./compound.js').PureCompound[]} compounds - Array of PureCompound definitions
 * @property {Float64Array} bipMatrix - Flattened N x N binary interaction parameter (BIP) matrix
 * @property {(z: ArrayLike<number>) => number} mwMix - Calculates mean molecular weight of mixture [kg/mol]
 * @property {(T: number, outA: Float64Array, outB: Float64Array, outC: Float64Array, outDadT: Float64Array) => void} calculatePureParams - Calculates pure component temperature-dependent parameters
 * @property {(T: number, z: ArrayLike<number>, outParams?: CubicMixtureParams, workspace?: any) => CubicMixtureParams} calculateMixtureParams - Evaluates mixing rules
 * @property {(T: number, P: number, z: ArrayLike<number>, outZ?: Float64Array|number[], mixtureParams?: CubicMixtureParams, workspace?: any) => number} calculateZFactors - Computes liquid and vapor Z factors
 * @property {(T: number, P: number, z: ArrayLike<number>, Z: number, outLnPhi: Float64Array, mixtureParams?: CubicMixtureParams, workspace?: any) => Float64Array} calculateFugacityCoefficients - Calculates analytical ln(phi_i)
 * @property {(T: number, P: number, z: ArrayLike<number>, Z: number, outDepartures?: PhaseDepartures, mixtureParams?: CubicMixtureParams) => PhaseDepartures} calculateDepartures - Calculates enthalpy and entropy departures
 * @property {(T: number, P: number, z: ArrayLike<number>, Z: number, outDensity?: PhaseDensity, mixtureParams?: CubicMixtureParams) => PhaseDensity} calculateDensity - Calculates Peneloux-corrected densities
 */

export {};
