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
 * @fileoverview Unified Flash Engine supporting TP, PH, PS, PQ, TH, TS, TQ flash specifications.
 */

import { ThermodynamicWorkspace } from '../types/memory.js';
import { FlashType } from '../types/flash.js';
import { insideOutFlash } from './inside-out.js';
import { immiscible3PhaseFlash, findWaterIndex } from './immiscible-3p.js';
import { generatePhaseEnvelope } from './envelope.js';

/**
 * High-performance flash engine router for multicomponent thermodynamic systems.
 * Pre-allocates and manages contiguous Float64Array memory buffers.
 */
export class FlashEngine {
	/**
	 * @param {import('../types/eos.js').PropertyPackage} eos - Property package instance (e.g. PengRobinson)
	 * @param {ThermodynamicWorkspace} [workspace] - Pre-allocated calculation workspace
	 */
	constructor(eos, workspace) {
		if (!eos || !eos.compounds || eos.compounds.length === 0) {
			throw new Error('FlashEngine requires a valid PropertyPackage with compounds');
		}

		this.eos = eos;
		this.numComponents = eos.numComponents;
		this.workspace = workspace || (eos instanceof Object && 'workspace' in eos && eos.workspace instanceof ThermodynamicWorkspace ? eos.workspace : new ThermodynamicWorkspace(this.numComponents));
		this._waterIndex = findWaterIndex(eos.compounds);
	}

	/**
	 * Validates and normalizes the feed composition vector in-place in workspace.z.
	 *
	 * @param {ArrayLike<number>} z - Input feed mole fractions
	 * @returns {Float64Array} Normalized mole fraction vector in workspace.z
	 */
	normalizeFeed(z) {
		const N = this.numComponents;
		if (!z || z.length < N) {
			throw new Error(`Feed vector length (${z ? z.length : 0}) must match component count (${N})`);
		}

		let sumZ = 0.0;
		for (let i = 0; i < N; i++) {
			const zi = Math.max(0.0, z[i]);
			this.workspace.z[i] = zi;
			sumZ += zi;
		}

		if (sumZ <= 0.0) {
			throw new Error('Sum of feed mole fractions must be strictly positive');
		}

		const invSumZ = 1.0 / sumZ;
		for (let i = 0; i < N; i++) {
			this.workspace.z[i] *= invSumZ;
		}

		return this.workspace.z;
	}

	/**
	 * Executes a general flash calculation for any supported specification.
	 *
	 * @param {import('../types/flash.js').FlashSpec} spec - Flash specification
	 * @param {ArrayLike<number>} z - Feed mole fraction vector
	 * @param {import('../types/flash.js').FlashOptions} [options={}] - Solver options
	 * @returns {import('../types/flash.js').FlashResult} Flash calculation result
	 */
	flash(spec, z, options = {}) {
		if (!spec || !spec.type) {
			throw new Error('Flash specification must include a valid .type property');
		}
		this.normalizeFeed(z);

		// Route to immiscible 3-phase engine if water is present and 3-phase is explicitly requested
		if (spec.type === FlashType.TP && this._waterIndex >= 0 && this.workspace.z[this._waterIndex] > 0.0) {
			if (options.enable3PhaseWater === true) {
				const T = spec.T !== undefined ? spec.T : 298.15;
				const P = spec.P !== undefined ? spec.P : 101325.0;
				return immiscible3PhaseFlash(T, P, this.workspace.z, this.eos, options, this.workspace);
			}
		}

		return insideOutFlash(spec, this.workspace.z, this.eos, options, this.workspace);
	}

	/**
	 * Isothermal-Isobaric (T-P) Flash.
	 *
	 * @param {number} T - System temperature [K]
	 * @param {number} P - System pressure [Pa]
	 * @param {ArrayLike<number>} z - Feed mole fraction vector
	 * @param {import('../types/flash.js').FlashOptions} [options={}] - Flash options
	 * @returns {import('../types/flash.js').FlashResult}
	 */
	flashTP(T, P, z, options = {}) {
		return this.flash({ type: FlashType.TP, T, P }, z, options);
	}

	/**
	 * Immiscible Free-Water 3-Phase (VLLE) Flash.
	 *
	 * @param {number} T - System temperature [K]
	 * @param {number} P - System pressure [Pa]
	 * @param {ArrayLike<number>} z - Feed mole fraction vector
	 * @param {import('../types/flash.js').FlashOptions} [options={}] - Flash options
	 * @returns {import('../types/flash.js').FlashResult}
	 */
	flash3P(T, P, z, options = {}) {
		this.normalizeFeed(z);
		return immiscible3PhaseFlash(T, P, this.workspace.z, this.eos, options, this.workspace);
	}

	/**
	 * Isobaric-Enthalpic (P-H) Flash (Adiabatic Expansion / JT Valve).
	 *
	 * @param {number} P - System pressure [Pa]
	 * @param {number} H - Specified mixture molar enthalpy [J/mol]
	 * @param {ArrayLike<number>} z - Feed mole fraction vector
	 * @param {import('../types/flash.js').FlashOptions} [options={}] - Flash options
	 * @returns {import('../types/flash.js').FlashResult}
	 */
	flashPH(P, H, z, options = {}) {
		return this.flash({ type: FlashType.PH, P, H }, z, options);
	}

	/**
	 * Isobaric-Isentropic (P-S) Flash (Isentropic Expansion / Compression).
	 *
	 * @param {number} P - System pressure [Pa]
	 * @param {number} S - Specified mixture molar entropy [J/(mol*K)]
	 * @param {ArrayLike<number>} z - Feed mole fraction vector
	 * @param {import('../types/flash.js').FlashOptions} [options={}] - Flash options
	 * @returns {import('../types/flash.js').FlashResult}
	 */
	flashPS(P, S, z, options = {}) {
		return this.flash({ type: FlashType.PS, P, S }, z, options);
	}

	/**
	 * Isobaric Vapor Fraction (P-Q) Flash (Bubble / Dew Points).
	 *
	 * @param {number} P - System pressure [Pa]
	 * @param {number} Q - Specified vapor fraction (0.0 = Bubble Point, 1.0 = Dew Point)
	 * @param {ArrayLike<number>} z - Feed mole fraction vector
	 * @param {import('../types/flash.js').FlashOptions} [options={}] - Flash options
	 * @returns {import('../types/flash.js').FlashResult}
	 */
	flashPQ(P, Q, z, options = {}) {
		return this.flash({ type: FlashType.PQ, P, Q }, z, options);
	}

	/**
	 * Isothermal-Enthalpic (T-H) Flash.
	 *
	 * @param {number} T - System temperature [K]
	 * @param {number} H - Specified molar enthalpy [J/mol]
	 * @param {ArrayLike<number>} z - Feed mole fraction vector
	 * @param {import('../types/flash.js').FlashOptions} [options={}] - Flash options
	 * @returns {import('../types/flash.js').FlashResult}
	 */
	flashTH(T, H, z, options = {}) {
		return this.flash({ type: FlashType.TH, T, H }, z, options);
	}

	/**
	 * Isothermal-Isentropic (T-S) Flash.
	 *
	 * @param {number} T - System temperature [K]
	 * @param {number} S - Specified molar entropy [J/(mol*K)]
	 * @param {ArrayLike<number>} z - Feed mole fraction vector
	 * @param {import('../types/flash.js').FlashOptions} [options={}] - Flash options
	 * @returns {import('../types/flash.js').FlashResult}
	 */
	flashTS(T, S, z, options = {}) {
		return this.flash({ type: FlashType.TS, T, S }, z, options);
	}

	/**
	 * Isothermal Vapor Fraction (T-Q) Flash (Bubble / Dew Pressures).
	 *
	 * @param {number} T - System temperature [K]
	 * @param {number} Q - Specified vapor fraction (0.0 = Bubble Pressure, 1.0 = Dew Pressure)
	 * @param {ArrayLike<number>} z - Feed mole fraction vector
	 * @param {import('../types/flash.js').FlashOptions} [options={}] - Flash options
	 * @returns {import('../types/flash.js').FlashResult}
	 */
	flashTQ(T, Q, z, options = {}) {
		return this.flash({ type: FlashType.TQ, T, Q }, z, options);
	}

	/**
	 * Generates a full multicomponent Pressure-Temperature (PT) Phase Envelope.
	 *
	 * @param {ArrayLike<number>} z - Feed mole fraction vector
	 * @param {import('../types/flash.js').PhaseEnvelopeOptions} [options={}] - Envelope options
	 * @returns {import('../types/flash.js').PhaseEnvelopeResult}
	 */
	generatePhaseEnvelope(z, options = {}) {
		this.normalizeFeed(z);
		return generatePhaseEnvelope(this.workspace.z, this.eos, options, this.workspace);
	}
}
