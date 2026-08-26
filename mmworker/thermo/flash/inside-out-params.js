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
 * @fileoverview Boston-Britt simplified thermodynamic parameterization and update routines.
 */

import { ThermodynamicWorkspace } from '../types/memory.js';

/**
 * Selects the reference component index b (typically the middle-boiling or median volatility component).
 *
 * @param {import('../types/eos.js').PropertyPackage} eos - Property package
 * @param {ArrayLike<number>} z - Feed mole fraction vector
 * @returns {number} Selected reference component index b (0 <= b < N)
 */
export function selectReferenceComponent(eos, z) {
	const N = eos.numComponents;
	if (N === 1) return 0;

	// Sort component indices by critical temperature Tc (proxy for boiling point)
	const indices = new Array(N);
	for (let i = 0; i < N; i++) {
		indices[i] = i;
	}
	indices.sort((i, j) => {
		const compI = eos.compounds[i];
		const compJ = eos.compounds[j];
		return compI.tc - compJ.tc;
	});

	// Select the median index
	const medianPos = Math.floor(N / 2);
	return indices[medianPos];
}

/**
 * Computes the simplified K-value temperature slope parameter B for reference component b.
 * Derived from the analytical derivative of Wilson's correlation:
 * B = d(ln K_b)/d(1/T) = - 5.373 * (1 + omega_b) * Tc_b
 *
 * @param {import('../types/eos.js').PropertyPackage} eos - Property package
 * @param {number} refIndex - Reference component index b
 * @returns {number} Slope parameter B (< 0)
 */
export function calculateBParameter(eos, refIndex) {
	const comp = eos.compounds[refIndex];
	return -5.373 * (1.0 + comp.omega) * comp.tc;
}

/**
 * Creates a pre-allocated InsideOutParams container.
 *
 * @param {import('../types/eos.js').PropertyPackage} eos - Property package
 * @param {ThermodynamicWorkspace} [workspace] - Workspace buffer
 * @returns {import('../types/flash.js').InsideOutParams}
 */
export function createInsideOutParams(eos, workspace) {
	const N = eos.numComponents;
	const alpha = (workspace && workspace.alpha) ? workspace.alpha : new Float64Array(N);

	return {
		TRef: 298.15,
		PRef: 101325.0,
		refIndex: 0,
		A: 0.0,
		B: -2000.0,
		alpha,
		hVStar: 0.0,
		hLStar: 0.0,
		sVStar: 0.0,
		sLStar: 0.0
	};
}

/**
 * Initializes Inside-Out simplified parameters from Wilson correlation at (TRef, PRef).
 *
 * @param {import('../types/eos.js').PropertyPackage} eos - Property package
 * @param {ArrayLike<number>} z - Feed mole fraction vector
 * @param {number} TRef - Reference temperature T* [K]
 * @param {number} PRef - Reference pressure P* [Pa]
 * @param {import('../types/flash.js').InsideOutParams} outParams - Output parameters struct
 * @param {ThermodynamicWorkspace} [workspace] - Workspace buffer
 * @returns {import('../types/flash.js').InsideOutParams} Populated parameters struct
 */
export function initInsideOutParams(eos, z, TRef, PRef, outParams, workspace) {
	const N = eos.numComponents;
	const b = selectReferenceComponent(eos, z);
	const B = calculateBParameter(eos, b);

	outParams.TRef = TRef;
	outParams.PRef = PRef;
	outParams.refIndex = b;
	outParams.B = B;

	// Initial Wilson K-values
	let lnKb = 0.0;
	for (let i = 0; i < N; i++) {
		const comp = eos.compounds[i];
		const Tr = TRef / comp.tc;
		const lnKi = Math.log(comp.pc / PRef) + 5.373 * (1.0 + comp.omega) * (1.0 - 1.0 / Tr);
		if (i === b) {
			lnKb = lnKi;
		}
		outParams.alpha[i] = Math.exp(lnKi);
	}

	outParams.A = lnKb;
	const Kb = Math.exp(lnKb);
	const invKb = Kb > 0.0 ? 1.0 / Kb : 1.0;
	for (let i = 0; i < N; i++) {
		outParams.alpha[i] *= invKb;
	}

	outParams.hVStar = 0.0;
	outParams.hLStar = 0.0;
	outParams.sVStar = 0.0;
	outParams.sLStar = 0.0;

	return outParams;
}

/**
 * Updates Inside-Out simplified parameters from rigorous EOS evaluations at (T, P, x, y).
 *
 * @param {import('../types/eos.js').PropertyPackage} eos - Property package
 * @param {number} T - Current system temperature [K]
 * @param {number} P - Current system pressure [Pa]
 * @param {ArrayLike<number>} x - Liquid mole fraction vector (length N)
 * @param {ArrayLike<number>} y - Vapor mole fraction vector (length N)
 * @param {ArrayLike<number>} K_rigorous - Rigorous K-values (exp(lnPhiL - lnPhiV))
 * @param {number} zL - Liquid compressibility factor
 * @param {number} zV - Vapor compressibility factor
 * @param {import('../types/flash.js').InsideOutParams} params - Parameters struct to mutate
 * @param {ThermodynamicWorkspace} [workspace] - Workspace buffer
 * @returns {import('../types/flash.js').InsideOutParams}
 */
export function updateInsideOutParams(eos, T, P, x, y, K_rigorous, zL, zV, params, workspace) {
	const N = eos.numComponents;
	const b = params.refIndex;

	params.TRef = T;
	params.PRef = P;

	const Kb = K_rigorous[b];
	params.A = Math.log(Math.max(1e-30, Kb));
	const invKb = Kb > 0.0 ? 1.0 / Kb : 1.0;

	for (let i = 0; i < N; i++) {
		params.alpha[i] = K_rigorous[i] * invKb;
	}

	// Calculate rigorous departure offsets
	const depV = eos.calculateDepartures(T, P, y, zV);
	params.hVStar = depV.hDep;
	params.sVStar = depV.sDep;

	const depL = eos.calculateDepartures(T, P, x, zL);
	params.hLStar = depL.hDep;
	params.sLStar = depL.sDep;

	return params;
}
