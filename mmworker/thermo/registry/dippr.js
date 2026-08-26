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
 * @fileoverview High-performance zero-allocation DIPPR and ChemSep equation evaluators.
 * Computes temperature-dependent physical properties, analytical first derivatives,
 * and analytical enthalpy / entropy integrals.
 */

/**
 * Evaluates DIPPR Form 100 (Polynomial):
 * Y = c0 + c1*T + c2*T^2 + c3*T^3 + c4*T^4 + ...
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E, ...]
 * @param {number} T - Temperature [K]
 * @returns {number} Property value
 */
export function evaluateDippr100(c, T) {
	const n = c.length;
	if (n === 0) return 0.0;
	// Horner's evaluation for zero allocation and high numerical stability
	let val = c[n - 1];
	for (let i = n - 2; i >= 0; i--) {
		val = val * T + c[i];
	}
	return val;
}

/**
 * Analytical derivative of DIPPR Form 100 with respect to temperature dY/dT.
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E, ...]
 * @param {number} T - Temperature [K]
 * @returns {number} First derivative dY/dT
 */
export function derivativeDippr100(c, T) {
	const n = c.length;
	if (n <= 1) return 0.0;
	let val = (n - 1) * c[n - 1];
	for (let i = n - 2; i >= 1; i--) {
		val = val * T + i * c[i];
	}
	return val;
}

/**
 * Definite integral of DIPPR Form 100: \int_{T1}^{T2} Y(T) dT
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E, ...]
 * @param {number} T1 - Initial temperature [K]
 * @param {number} T2 - Final temperature [K]
 * @returns {number} Integral value
 */
export function integrateDippr100(c, T1, T2) {
	const n = c.length;
	if (n === 0) return 0.0;
	let sum2 = 0.0;
	let sum1 = 0.0;
	for (let i = 0; i < n; i++) {
		const power = i + 1;
		sum2 += (c[i] / power) * Math.pow(T2, power);
		sum1 += (c[i] / power) * Math.pow(T1, power);
	}
	return sum2 - sum1;
}

/**
 * Definite integral of DIPPR Form 100 divided by T: \int_{T1}^{T2} (Y(T) / T) dT
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E, ...]
 * @param {number} T1 - Initial temperature [K]
 * @param {number} T2 - Final temperature [K]
 * @returns {number} Integral value
 */
export function integrateDippr100OverT(c, T1, T2) {
	const n = c.length;
	if (n === 0) return 0.0;
	let val2 = c[0] * Math.log(T2);
	let val1 = c[0] * Math.log(T1);
	for (let i = 1; i < n; i++) {
		val2 += (c[i] / i) * Math.pow(T2, i);
		val1 += (c[i] / i) * Math.pow(T1, i);
	}
	return val2 - val1;
}

/**
 * Evaluates DIPPR Form 101 (Extended Antoine / Vapor Pressure):
 * Y = exp(A + B/T + C*ln(T) + D*T^E)
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E]
 * @param {number} T - Temperature [K]
 * @returns {number} Property value
 */
export function evaluateDippr101(c, T) {
	const A = c[0] || 0.0;
	const B = c[1] || 0.0;
	const C = c[2] || 0.0;
	const D = c[3] || 0.0;
	const E = c[4] !== undefined ? c[4] : 0.0;

	let dTerm = 0.0;
	if (D !== 0.0) {
		dTerm = E === 0.0 ? D : D * Math.pow(T, E);
	}

	const lnY = A + B / T + C * Math.log(T) + dTerm;
	return Math.exp(lnY);
}

/**
 * Analytical derivative of DIPPR Form 101 with respect to temperature dY/dT.
 * dY/dT = Y * (-B/T^2 + C/T + D*E*T^(E-1))
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E]
 * @param {number} T - Temperature [K]
 * @returns {number} First derivative dY/dT
 */
export function derivativeDippr101(c, T) {
	const Y = evaluateDippr101(c, T);
	const B = c[1] || 0.0;
	const C = c[2] || 0.0;
	const D = c[3] || 0.0;
	const E = c[4] !== undefined ? c[4] : 0.0;

	let dTermDeriv = 0.0;
	if (D !== 0.0 && E !== 0.0) {
		dTermDeriv = D * E * Math.pow(T, E - 1.0);
	}

	const dLnY_dT = -B / (T * T) + C / T + dTermDeriv;
	return Y * dLnY_dT;
}

/**
 * Evaluates DIPPR Form 105 (Rackett Liquid Density):
 * Y = A / (B^(1 + (1 - T/C)^D))
 *
 * @param {number[]} c - Coefficients [A, B, C, D]
 * @param {number} T - Temperature [K]
 * @returns {number} Liquid molar density [kmol/m3 or mol/m3]
 */
export function evaluateDippr105(c, T) {
	const A = c[0];
	const B = c[1];
	const C = c[2];
	const D = c[3];

	const tau = 1.0 - T / C;
	const clampedTau = tau > 0.0 ? tau : 0.0;
	const exponent = 1.0 + Math.pow(clampedTau, D);
	return A / Math.pow(B, exponent);
}

/**
 * Analytical derivative of DIPPR Form 105 with respect to temperature dY/dT.
 * dY/dT = Y * (D * ln(B) / C) * (1 - T/C)^(D - 1)
 *
 * @param {number[]} c - Coefficients [A, B, C, D]
 * @param {number} T - Temperature [K]
 * @returns {number} First derivative dY/dT
 */
export function derivativeDippr105(c, T) {
	const C = c[2];
	const D = c[3];
	const tau = 1.0 - T / C;
	if (tau <= 0.0) return 0.0;

	const Y = evaluateDippr105(c, T);
	const B = c[1];
	const dLnY_dT = (D * Math.log(B) / C) * Math.pow(tau, D - 1.0);
	return Y * dLnY_dT;
}

/**
 * Evaluates DIPPR Form 106 (Somayajulu / Watson Heat of Vaporization):
 * Y = A * (1 - Tr)^(B + C*Tr + D*Tr^2 + E*Tr^3), where Tr = T / Tc
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E]
 * @param {number} T - Temperature [K]
 * @param {number} tc - Critical temperature [K]
 * @returns {number} Heat of vaporization [J/mol or J/kmol]
 */
export function evaluateDippr106(c, T, tc) {
	const A = c[0];
	const B = c[1] || 0.0;
	const C = c[2] || 0.0;
	const D = c[3] || 0.0;
	const E = c[4] || 0.0;

	const Tr = T / tc;
	const tau = 1.0 - Tr;
	if (tau <= 0.0) return 0.0;

	const exponent = B + Tr * (C + Tr * (D + Tr * E));
	return A * Math.pow(tau, exponent);
}

/**
 * Analytical derivative of DIPPR Form 106 with respect to temperature dY/dT.
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E]
 * @param {number} T - Temperature [K]
 * @param {number} tc - Critical temperature [K]
 * @returns {number} First derivative dY/dT
 */
export function derivativeDippr106(c, T, tc) {
	const Tr = T / tc;
	const tau = 1.0 - Tr;
	if (tau <= 0.0) return 0.0;

	const Y = evaluateDippr106(c, T, tc);
	if (Y === 0.0) return 0.0;

	const B = c[1] || 0.0;
	const C = c[2] || 0.0;
	const D = c[3] || 0.0;
	const E = c[4] || 0.0;

	const f = B + Tr * (C + Tr * (D + Tr * E));
	const fPrime = C + Tr * (2.0 * D + Tr * 3.0 * E);

	const dLnY_dT = (1.0 / tc) * (fPrime * Math.log(tau) - f / tau);
	return Y * dLnY_dT;
}

/**
 * Evaluates DIPPR Form 107 (Aly-Lee Ideal Gas Heat Capacity):
 * Cp0 = A + B * ((C/T) / sinh(C/T))^2 + D * ((E/T) / cosh(E/T))^2
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E]
 * @param {number} T - Temperature [K]
 * @returns {number} Ideal gas heat capacity [J/(mol*K)]
 */
export function evaluateDippr107(c, T) {
	const A = c[0] || 0.0;
	const B = c[1] || 0.0;
	const C = c[2] || 0.0;
	const D = c[3] || 0.0;
	const E = c[4] || 0.0;

	let termB = 0.0;
	if (B !== 0.0 && C !== 0.0) {
		const u = C / T;
		if (u < 1e-7) {
			termB = B;
		} else if (u < 85.0) {
			const sinhU = Math.sinh(u);
			const ratioB = u / sinhU;
			termB = B * ratioB * ratioB;
		}
	}

	let termD = 0.0;
	if (D !== 0.0 && E !== 0.0) {
		const v = E / T;
		if (v < 1e-7) {
			termD = 0.0;
		} else if (v < 85.0) {
			const coshV = Math.cosh(v);
			const ratioD = v / coshV;
			termD = D * ratioD * ratioD;
		}
	}

	return A + termB + termD;
}

/**
 * Analytical derivative of DIPPR Form 107 with respect to temperature dCp0/dT.
 * dCp0/dT = (2*B*u^2 / (T * sinh(u)^2)) * (u*coth(u) - 1) + (2*D*v^2 / (T * cosh(v)^2)) * (v*tanh(v) - 1)
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E]
 * @param {number} T - Temperature [K]
 * @returns {number} First derivative dCp0/dT
 */
export function derivativeDippr107(c, T) {
	const B = c[1] || 0.0;
	const C = c[2] || 0.0;
	const D = c[3] || 0.0;
	const E = c[4] || 0.0;

	let derivB = 0.0;
	if (B !== 0.0 && C !== 0.0) {
		const u = C / T;
		if (u >= 1e-5 && u < 85.0) {
			const sinhU = Math.sinh(u);
			const coshU = Math.cosh(u);
			const cothU = coshU / sinhU;
			derivB = ((2.0 * B * u * u) / (T * sinhU * sinhU)) * (u * cothU - 1.0);
		}
	}

	let derivD = 0.0;
	if (D !== 0.0 && E !== 0.0) {
		const v = E / T;
		if (v >= 1e-5 && v < 85.0) {
			const coshV = Math.cosh(v);
			const tanhV = Math.tanh(v);
			derivD = ((2.0 * D * v * v) / (T * coshV * coshV)) * (v * tanhV - 1.0);
		}
	}

	return derivB + derivD;
}

/**
 * Anti-derivative of DIPPR Form 107: \int Cp0(T) dT = A*T + B*C*coth(C/T) - D*E*tanh(E/T)
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E]
 * @param {number} T - Temperature [K]
 * @returns {number} Enthalpy anti-derivative value
 */
function antiDerivativeDippr107H(c, T) {
	const A = c[0] || 0.0;
	const B = c[1] || 0.0;
	const C = c[2] || 0.0;
	const D = c[3] || 0.0;
	const E = c[4] || 0.0;

	let termB = 0.0;
	if (B !== 0.0 && C !== 0.0) {
		const u = C / T;
		if (u < 1e-7) {
			termB = B * T;
		} else if (u < 85.0) {
			termB = (B * C) / Math.tanh(u);
		} else {
			termB = B * C;
		}
	}

	let termD = 0.0;
	if (D !== 0.0 && E !== 0.0) {
		const v = E / T;
		termD = -D * E * Math.tanh(v);
	}

	return A * T + termB + termD;
}

/**
 * Definite enthalpy integral of DIPPR Form 107: \int_{T1}^{T2} Cp0(T) dT
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E]
 * @param {number} T1 - Initial temperature [K]
 * @param {number} T2 - Final temperature [K]
 * @returns {number} Delta ideal gas enthalpy [J/mol]
 */
export function integrateDippr107(c, T1, T2) {
	return antiDerivativeDippr107H(c, T2) - antiDerivativeDippr107H(c, T1);
}

/**
 * Anti-derivative of DIPPR Form 107 over T: \int (Cp0(T) / T) dT
 * S(T) = A*ln(T) + B*(u*coth(u) - ln(sinh(u))) - D*(v*tanh(v) - ln(cosh(v)))
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E]
 * @param {number} T - Temperature [K]
 * @returns {number} Entropy anti-derivative value
 */
function antiDerivativeDippr107S(c, T) {
	const A = c[0] || 0.0;
	const B = c[1] || 0.0;
	const C = c[2] || 0.0;
	const D = c[3] || 0.0;
	const E = c[4] || 0.0;

	let termB = 0.0;
	if (B !== 0.0 && C !== 0.0) {
		const u = C / T;
		if (u < 1e-7) {
			termB = B * Math.log(T);
		} else if (u < 85.0) {
			const sinhU = Math.sinh(u);
			const coshU = Math.cosh(u);
			termB = B * (u * (coshU / sinhU) - Math.log(sinhU));
		} else {
			termB = B * (u - (u - Math.log(2.0)));
		}
	}

	let termD = 0.0;
	if (D !== 0.0 && E !== 0.0) {
		const v = E / T;
		if (v < 85.0) {
			termD = -D * (v * Math.tanh(v) - Math.log(Math.cosh(v)));
		} else {
			termD = -D * (v - (v - Math.log(2.0)));
		}
	}

	return A * Math.log(T) + termB + termD;
}

/**
 * Definite entropy integral of DIPPR Form 107: \int_{T1}^{T2} (Cp0(T) / T) dT
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E]
 * @param {number} T1 - Initial temperature [K]
 * @param {number} T2 - Final temperature [K]
 * @returns {number} Delta ideal gas entropy [J/(mol*K)]
 */
export function integrateDippr107OverT(c, T1, T2) {
	return antiDerivativeDippr107S(c, T2) - antiDerivativeDippr107S(c, T1);
}

/**
 * Evaluates ChemSep Form 16 (Polynomial Exponential):
 * Y = A + exp(B/T + C + D*T + E*T^2)
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E]
 * @param {number} T - Temperature [K]
 * @returns {number} Property value
 */
export function evaluateChemSep16(c, T) {
	const A = c[0] || 0.0;
	const B = c[1] || 0.0;
	const C = c[2] || 0.0;
	const D = c[3] || 0.0;
	const E = c[4] || 0.0;

	const arg = B / T + C + D * T + E * T * T;
	const val = A + Math.exp(arg);
	return val > 1000.0 ? val / 1000.0 : val;
}

/**
 * Analytical derivative of ChemSep Form 16 with respect to temperature dY/dT.
 *
 * @param {number[]} c - Coefficients [A, B, C, D, E]
 * @param {number} T - Temperature [K]
 * @returns {number} First derivative dY/dT
 */
export function derivativeChemSep16(c, T) {
	const B = c[1] || 0.0;
	const C = c[2] || 0.0;
	const D = c[3] || 0.0;
	const E = c[4] || 0.0;

	const arg = B / T + C + D * T + E * T * T;
	const dArg_dT = -B / (T * T) + D + 2.0 * E * T;
	const deriv = Math.exp(arg) * dArg_dT;
	return (c[0] || 0.0) > 1000.0 ? deriv / 1000.0 : deriv;
}

/**
 * Evaluates standard 3-parameter Antoine (ChemSep Form 10):
 * Y = exp(A - B / (T + C))
 *
 * @param {number[]} c - Coefficients [A, B, C]
 * @param {number} T - Temperature [K]
 * @returns {number} Property value
 */
export function evaluateAntoine10(c, T) {
	const A = c[0] || 0.0;
	const B = c[1] || 0.0;
	const C = c[2] || 0.0;
	return Math.exp(A - B / (T + C));
}

/**
 * Analytical derivative of standard Antoine (Form 10) with respect to temperature.
 *
 * @param {number[]} c - Coefficients [A, B, C]
 * @param {number} T - Temperature [K]
 * @returns {number} First derivative dY/dT
 */
export function derivativeAntoine10(c, T) {
	const B = c[1] || 0.0;
	const C = c[2] || 0.0;
	const Y = evaluateAntoine10(c, T);
	const denom = T + C;
	return Y * (B / (denom * denom));
}

/**
 * Universal dispatcher to evaluate any supported DIPPR / ChemSep temperature correlation.
 *
 * @param {import('../types/compound.js').DipprCorrelation} correlation - Correlation definition
 * @param {number} T - Temperature [K]
 * @param {number} [tc=0] - Critical temperature [K] (required for Form 106)
 * @returns {number} Evaluated property value
 */
export function evaluateDippr(correlation, T, tc = 0) {
	if (!correlation || !correlation.coeffs) return 0.0;
	switch (correlation.eq) {
		case 100:
		case 1:
		case 2:
		case 3:
		case 4:
		case 5:
			return evaluateDippr100(correlation.coeffs, T);
		case 101:
			return evaluateDippr101(correlation.coeffs, T);
		case 105:
			return evaluateDippr105(correlation.coeffs, T);
		case 106:
			return evaluateDippr106(correlation.coeffs, T, tc);
		case 107:
			return evaluateDippr107(correlation.coeffs, T);
		case 16:
			return evaluateChemSep16(correlation.coeffs, T);
		case 10:
			return evaluateAntoine10(correlation.coeffs, T);
		default:
			// Fallback to polynomial
			return evaluateDippr100(correlation.coeffs, T);
	}
}

/**
 * Universal dispatcher to evaluate the analytical temperature derivative dY/dT.
 *
 * @param {import('../types/compound.js').DipprCorrelation} correlation - Correlation definition
 * @param {number} T - Temperature [K]
 * @param {number} [tc=0] - Critical temperature [K] (required for Form 106)
 * @returns {number} Analytical derivative dY/dT
 */
export function evaluateDipprDerivative(correlation, T, tc = 0) {
	if (!correlation || !correlation.coeffs) return 0.0;
	switch (correlation.eq) {
		case 100:
		case 1:
		case 2:
		case 3:
		case 4:
		case 5:
			return derivativeDippr100(correlation.coeffs, T);
		case 101:
			return derivativeDippr101(correlation.coeffs, T);
		case 105:
			return derivativeDippr105(correlation.coeffs, T);
		case 106:
			return derivativeDippr106(correlation.coeffs, T, tc);
		case 107:
			return derivativeDippr107(correlation.coeffs, T);
		case 16:
			return derivativeChemSep16(correlation.coeffs, T);
		case 10:
			return derivativeAntoine10(correlation.coeffs, T);
		default:
			return derivativeDippr100(correlation.coeffs, T);
	}
}

/**
 * Universal ideal gas enthalpy integral: \int_{T1}^{T2} Cp0(T) dT [J/mol]
 *
 * @param {import('../types/compound.js').DipprCorrelation} correlation - Ideal gas Cp correlation
 * @param {number} T1 - Initial temperature [K]
 * @param {number} T2 - Final temperature [K]
 * @returns {number} Enthalpy integral [J/mol]
 */
export function integrateCpIdeal(correlation, T1, T2) {
	if (!correlation || !correlation.coeffs) return 0.0;
	if (T1 === T2) return 0.0;

	if (correlation.eq === 107) {
		return integrateDippr107(correlation.coeffs, T1, T2);
	}
	if (correlation.eq === 100 || (correlation.eq >= 1 && correlation.eq <= 5)) {
		return integrateDippr100(correlation.coeffs, T1, T2);
	}

	// 5-point Gauss-Legendre quadrature for non-analytical forms (e.g. Form 16)
	return numericQuadrature((t) => evaluateDippr(correlation, t), T1, T2);
}

/**
 * Universal ideal gas entropy integral: \int_{T1}^{T2} (Cp0(T) / T) dT [J/(mol*K)]
 *
 * @param {import('../types/compound.js').DipprCorrelation} correlation - Ideal gas Cp correlation
 * @param {number} T1 - Initial temperature [K]
 * @param {number} T2 - Final temperature [K]
 * @returns {number} Entropy integral [J/(mol*K)]
 */
export function integrateCpIdealOverT(correlation, T1, T2) {
	if (!correlation || !correlation.coeffs) return 0.0;
	if (T1 === T2) return 0.0;

	if (correlation.eq === 107) {
		return integrateDippr107OverT(correlation.coeffs, T1, T2);
	}
	if (correlation.eq === 100 || (correlation.eq >= 1 && correlation.eq <= 5)) {
		return integrateDippr100OverT(correlation.coeffs, T1, T2);
	}

	// 5-point Gauss-Legendre quadrature for non-analytical forms
	return numericQuadrature((t) => evaluateDippr(correlation, t) / t, T1, T2);
}

// Pre-computed 5-point Gauss-Legendre quadrature nodes and weights on [-1, 1]
const GL_X = [
	0.0,
	-0.5384693101056831,
	0.5384693101056831,
	-0.9061798459386640,
	0.9061798459386640
];
const GL_W = [
	0.5688888888888889,
	0.4786286704993665,
	0.4786286704993665,
	0.2369268850561891,
	0.2369268850561891
];

/**
 * 5-point Gauss-Legendre numerical quadrature on interval [a, b].
 *
 * @param {(t: number) => number} f - Integrand function
 * @param {number} a - Lower limit
 * @param {number} b - Upper limit
 * @returns {number} Approximated integral
 */
function numericQuadrature(f, a, b) {
	const mid = 0.5 * (a + b);
	const halfWidth = 0.5 * (b - a);
	let sum = 0.0;
	for (let i = 0; i < 5; i++) {
		const t = mid + halfWidth * GL_X[i];
		sum += GL_W[i] * f(t);
	}
	return halfWidth * sum;
}
