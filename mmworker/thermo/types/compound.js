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
 * @fileoverview Pure component and DIPPR parameter schemas for thermodynamic property calculations.
 */

/**
 * DIPPR Equation Form Numbers
 * @enum {number}
 */
export const DipprEquationForm = Object.freeze({
	POLYNOMIAL_100: 100,
	EXTENDED_ANTOINE_101: 101,
	RACKETT_105: 105,
	SOMAYAJULU_WATSON_106: 106,
	ALY_LEE_107: 107,
	CHEMSEP_POLYNOMIAL_EXP_16: 16,
	ANTOINE_10: 10
});

/**
 * Temperature-dependent correlation parameter definition.
 * @typedef {Object} DipprCorrelation
 * @property {number} eq - DIPPR or ChemSep equation form number
 * @property {number[]} coeffs - Coefficients [A, B, C, D, E, ...]
 * @property {number} tMin - Minimum valid temperature [K]
 * @property {number} tMax - Maximum valid temperature [K]
 */

/**
 * Critical thermodynamic properties.
 * @typedef {Object} CriticalProperties
 * @property {number} tc - Critical temperature [K]
 * @property {number} pc - Critical pressure [Pa]
 * @property {number} vc - Critical molar volume [m3/mol]
 * @property {number} omega - Pitzer acentric factor [dimensionless]
 * @property {number} [zc] - Critical compressibility factor [dimensionless]
 */

/**
 * Pure compound complete definition and property correlations.
 * @typedef {Object} PureCompound
 * @property {string} id - Unique lowercase compound identifier (e.g., 'methane')
 * @property {string} name - Standard chemical name (e.g., 'Methane')
 * @property {string} formula - Chemical formula (e.g., 'CH4')
 * @property {string} cas - CAS registry number (e.g., '74-82-8')
 * @property {string[]} synonyms - Common aliases and synonyms
 * @property {number} mw - Molecular weight [kg/mol]
 * @property {number} tc - Critical temperature [K]
 * @property {number} pc - Critical pressure [Pa]
 * @property {number} vc - Critical molar volume [m3/mol]
 * @property {number} omega - Pitzer acentric factor [dimensionless]
 * @property {number} zc - Critical compressibility factor [dimensionless]
 * @property {number} [tb] - Normal boiling point at 101325 Pa [K]
 * @property {number} [tm] - Normal melting point [K]
 * @property {number} [rackettZ] - Rackett compressibility factor Z_RA [dimensionless]
 * @property {number} [volumeShift] - Peneloux volume translation parameter c_i [m3/mol]
 * @property {number} [hfStandard] - Standard enthalpy of formation at 298.15 K [J/mol]
 * @property {number} [gfStandard] - Standard Gibbs free energy of formation at 298.15 K [J/mol]
 * @property {number} [sStandard] - Standard entropy at 298.15 K [J/(mol*K)]
 * @property {DipprCorrelation} [cpIdeal] - Ideal gas heat capacity Cp0(T) [J/(mol*K)]
 * @property {DipprCorrelation} [vaporPressure] - Vapor pressure Psat(T) [Pa]
 * @property {DipprCorrelation} [liquidDensity] - Liquid molar density rho_L(T) [mol/m3]
 * @property {DipprCorrelation} [heatOfVaporization] - Heat of vaporization dHvap(T) [J/mol]
 * @property {DipprCorrelation} [liquidViscosity] - Liquid dynamic viscosity [Pa*s]
 * @property {DipprCorrelation} [vaporViscosity] - Vapor dynamic viscosity [Pa*s]
 * @property {DipprCorrelation} [surfaceTension] - Liquid surface tension [N/m]
 */

/**
 * Flat binary interaction parameter matrix lookup table.
 * Keyed by lexicographically sorted CAS numbers: `${casA}:${casB}`
 * @typedef {Record<string, number>} BIPTable
 */
