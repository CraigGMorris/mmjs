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
 * @fileoverview Type definitions and interfaces for isothermal-isobaric flash calculations and phase property results.
 */

/**
 * Thermodynamic phase state classification.
 * @enum {string}
 */
export const PhaseState = Object.freeze({
	LIQUID: 'LIQUID',
	VAPOR: 'VAPOR',
	TWO_PHASE: 'TWO_PHASE',
	THREE_PHASE: 'THREE_PHASE'
});

/**
 * Individual phase identity type.
 * @enum {string}
 */
export const PhaseType = Object.freeze({
	Liquid: 'Liquid',
	Vapor: 'Vapor',
	Liquid2: 'Liquid2'
});

/**
 * Flash calculation specification types.
 * @enum {string}
 */
export const FlashType = Object.freeze({
	TP: 'TP',
	PH: 'PH',
	PS: 'PS',
	PQ: 'PQ',
	TH: 'TH',
	TS: 'TS',
	TQ: 'TQ'
});

/**
 * Flash specification descriptor.
 * @typedef {Object} FlashSpec
 * @property {string} type - Specification type ('TP', 'PH', 'PS', 'PQ', 'TH', 'TS', 'TQ')
 * @property {number} [T] - Specified temperature [K] (for TP, TH, TS, TQ)
 * @property {number} [P] - Specified pressure [Pa] (for TP, PH, PS, PQ)
 * @property {number} [H] - Specified molar enthalpy [J/mol] (for PH, TH)
 * @property {number} [S] - Specified molar entropy [J/(mol*K)] (for PS, TS)
 * @property {number} [Q] - Specified vapor fraction (0 <= Q <= 1) (for PQ, TQ)
 */

/**
 * Boston-Britt simplified thermodynamic parameter set for Inside-Out solver.
 * @typedef {Object} InsideOutParams
 * @property {number} TRef - Reference temperature T* [K]
 * @property {number} PRef - Reference pressure P* [Pa]
 * @property {number} refIndex - Reference component index b
 * @property {number} A - Intercept for ln(K_b) = A + B*u
 * @property {number} B - Slope for ln(K_b) = A + B*u
 * @property {Float64Array} alpha - Relative volatility vector alpha_i = K_i / K_b [length N]
 * @property {number} hVStar - Vapor enthalpy departure offset h_V* [J/mol]
 * @property {number} hLStar - Liquid enthalpy departure offset h_L* [J/mol]
 * @property {number} sVStar - Vapor entropy departure offset s_V* [J/(mol*K)]
 * @property {number} sLStar - Liquid entropy departure offset s_L* [J/(mol*K)]
 */

/**
 * Configuration options for flash calculations.
 * @typedef {Object} FlashOptions
 * @property {number} [tol=1e-8] - Convergence tolerance on fugacity residuals (max_i |ln(K_i * phi_V,i / phi_L,i)|)
 * @property {number} [maxIterations=200] - Maximum allowable iterations for flash solver
 * @property {ArrayLike<number>} [initialK] - Optional custom initial K-values
 * @property {boolean} [acceleration=true] - Whether to use Dominant Eigenvalue Method (DEM) acceleration
 * @property {number} [damping=1.0] - Geometric damping parameter for successive substitution (0 < damping <= 1.0)
 * @property {boolean} [enable3PhaseWater=false] - Whether to decouple immiscible aqueous phase for hydrocarbon-water systems
 */

/**
 * Detailed thermodynamic properties of an individual equilibrium phase.
 * @typedef {Object} PhaseProperties
 * @property {string} phase - Phase identifier ('LIQUID', 'VAPOR', 'LIQUID2', or 'LIQUID_2')
 * @property {string} [phaseType] - Phase type enum value ('Liquid', 'Vapor', or 'Liquid2')
 * @property {number} beta - Phase mole fraction in the overall mixture (moles phase / total moles feed)
 * @property {Float64Array} moleFractions - Mole fraction vector of this phase (length N)
 * @property {number} zFactor - Compressibility factor Z of the phase
 * @property {number} molarVolume - Peneloux volume-translated molar volume [m3/mol]
 * @property {number} massDensity - Corrected mass density [kg/m3]
 * @property {number} molarDensity - Corrected molar density [mol/m3]
 * @property {number} enthalpy - Total molar enthalpy H = H_ideal + H_dep [J/mol]
 * @property {number} entropy - Total molar entropy S = S_ideal + S_dep [J/(mol*K)]
 * @property {number} gibbs - Total molar Gibbs free energy G = H - T*S [J/mol]
 * @property {number} hDep - Enthalpy departure relative to ideal gas state [J/mol]
 * @property {number} sDep - Entropy departure relative to ideal gas state [J/(mol*K)]
 * @property {number} gDep - Gibbs free energy departure relative to ideal gas state [J/mol]
 * @property {number} mw - Average molecular weight of the phase [kg/mol]
 * @property {Float64Array} lnPhi - Logarithm of fugacity coefficients ln(phi_i) (length N)
 */

/**
 * Bulk mixture properties weighted across equilibrium phases.
 * @typedef {Object} BulkProperties
 * @property {number} beta - Overall vapor mole fraction
 * @property {number} zFactor - Weighted compressibility factor Z
 * @property {number} molarVolume - Weighted molar volume [m3/mol]
 * @property {number} massDensity - Weighted bulk mass density [kg/m3]
 * @property {number} molarDensity - Bulk molar density [mol/m3]
 * @property {number} enthalpy - Total bulk molar enthalpy [J/mol]
 * @property {number} entropy - Total bulk molar entropy [J/(mol*K)]
 * @property {number} gibbs - Total bulk molar Gibbs free energy [J/mol]
 * @property {number} mw - Average mixture molecular weight [kg/mol]
 */

/**
 * Complete result of an isothermal-isobaric or 3-phase flash calculation.
 * @typedef {Object} FlashResult
 * @property {number} T - System temperature [K]
 * @property {number} P - System pressure [Pa]
 * @property {number} beta - Equilibrium vapor mole fraction (0 <= beta <= 1)
 * @property {string} phaseState - Phase state classification ('LIQUID', 'VAPOR', 'TWO_PHASE', or 'THREE_PHASE')
 * @property {boolean} converged - Whether the flash algorithm reached specified tolerance
 * @property {number} iterations - Number of iterations executed
 * @property {number} residual - Final maximum fugacity coefficient residual
 * @property {Float64Array} x - Equilibrium liquid mole fraction vector (length N)
 * @property {Float64Array} y - Equilibrium vapor mole fraction vector (length N)
 * @property {Float64Array} K - Equilibrium K-values vector (y_i / x_i) (length N)
 * @property {PhaseProperties|null} liquid - Hydrocarbon liquid phase properties (null if pure vapor)
 * @property {PhaseProperties|null} vapor - Vapor phase properties (null if pure liquid)
 * @property {PhaseProperties|null} [liquidPhase2] - Aqueous liquid phase properties (null if no aqueous liquid)
 * @property {PhaseProperties|null} [liquid2] - Alias for liquidPhase2
 * @property {number} [betaL1] - Moles of hydrocarbon liquid per mole of feed
 * @property {number} [betaL2] - Moles of aqueous liquid per mole of feed
 * @property {BulkProperties} bulk - Bulk mixture properties
 */

/**
 * Result returned by the Rachford-Rice solver.
 * @typedef {Object} RachfordRiceResult
 * @property {number} beta - Solved vapor fraction
 * @property {number} iterations - Number of iterations
 * @property {boolean} converged - Convergence status
 * @property {number} error - Residual |f(beta)|
 */

/**
 * Point in pressure-temperature coordinate space.
 * @typedef {Object} PTPoint
 * @property {number} T - Temperature [K]
 * @property {number} P - Pressure [Pa]
 */

/**
 * Options for PT Phase Envelope Generation.
 * @typedef {Object} PhaseEnvelopeOptions
 * @property {number} [pMin=100000] - Minimum pressure limit [Pa]
 * @property {number} [pMax=15000000] - Maximum pressure limit [Pa]
 * @property {number} [numPoints=60] - Number of points per curve branch
 * @property {number[]} [qualityLevels=[0.1, 0.25, 0.5, 0.75, 0.9]] - Quality iso-lines to generate
 * @property {number} [tol=1e-6] - Flash convergence tolerance
 * @property {number} [maxIterations=40] - Maximum iterations per point
 */

/**
 * Complete PT Phase Envelope calculation result.
 * @typedef {Object} PhaseEnvelopeResult
 * @property {Array<{ T: number, P: number }>} bubbleCurve - Coordinates along bubble line (Q = 0, Pmin -> Pcrit)
 * @property {Array<{ T: number, P: number }>} dewCurve - Coordinates along dew line (Q = 1, Pcrit -> Pmin)
 * @property {Array<{ T: number, P: number }>} curve - Continuous ordered coordinates enclosing the envelope boundary (Pmin -> Pcrit -> Pmin)
 * @property {Map<number, Array<{ T: number, P: number }>>} qualityCurves - Map of quality fraction to PT coordinate arrays
 * @property {{ T: number, P: number }} criticalPoint - Estimated mixture critical point (Tc, Pc)
 * @property {{ T: number, P: number }} cricondentherm - Maximum temperature limit (Tmax, P(Tmax))
 * @property {{ T: number, P: number }} cricondenbar - Maximum pressure limit (Pmax, T(Pmax))
 */
