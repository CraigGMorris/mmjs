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
 * @fileoverview PureCompound factory and validator functions.
 */

import { R_GAS } from '../math/constants.js';

/**
 * Validates a PureCompound definition.
 *
 * @param {import('../types/compound.js').PureCompound} compound - Compound object to validate
 * @throws {Error} If required physical constants or identifiers are missing/invalid
 */
export function validateCompound(compound) {
	if (!compound) {
		throw new Error('Compound definition cannot be null or undefined');
	}
	if (!compound.id || typeof compound.id !== 'string') {
		throw new Error(`Compound ID must be a non-empty string, got: ${compound.id}`);
	}
	if (!compound.name || typeof compound.name !== 'string') {
		throw new Error(`Compound name must be a non-empty string for: ${compound.id}`);
	}
	if (!compound.cas || typeof compound.cas !== 'string') {
		throw new Error(`Compound CAS must be a non-empty string for: ${compound.id}`);
	}
	if (typeof compound.tc !== 'number' || compound.tc <= 0.0 || isNaN(compound.tc)) {
		throw new Error(`Critical temperature tc must be positive for: ${compound.name}`);
	}
	if (typeof compound.pc !== 'number' || compound.pc <= 0.0 || isNaN(compound.pc)) {
		throw new Error(`Critical pressure pc must be positive for: ${compound.name}`);
	}
	if (typeof compound.mw !== 'number' || compound.mw <= 0.0 || isNaN(compound.mw)) {
		throw new Error(`Molecular weight mw must be positive for: ${compound.name}`);
	}
	if (typeof compound.omega !== 'number' || isNaN(compound.omega)) {
		throw new Error(`Acentric factor omega must be a valid number for: ${compound.name}`);
	}
}

/**
 * Creates and normalizes a validated PureCompound object.
 *
 * @param {Partial<import('../types/compound.js').PureCompound>} def - Partial or raw compound definition
 * @returns {import('../types/compound.js').PureCompound} Normalized, validated PureCompound
 */
export function createCompound(def) {
	const tc = def.tc || 0.0;
	const pc = def.pc || 0.0;
	const vc = def.vc || (0.29 * R_GAS * tc) / pc;
	const mw = def.mw || 0.0;
	const omega = def.omega !== undefined ? def.omega : 0.0;
	const zc = def.zc !== undefined ? def.zc : (pc * vc) / (R_GAS * tc);
	const rackettZ = def.rackettZ !== undefined ? def.rackettZ : zc;

	// Calculate Peneloux volume translation if not explicitly provided
	let volumeShift = def.volumeShift;
	if (volumeShift === undefined) {
		if (rackettZ !== undefined) {
			volumeShift = 0.40768 * ((R_GAS * tc) / pc) * (0.2944 - rackettZ);
		} else {
			volumeShift = 0.0;
		}
	}

	/** @type {import('../types/compound.js').PureCompound} */
	const compound = {
		id: (def.id || def.name || '').toLowerCase().replace(/[^a-z0-9_-]/g, ''),
		name: def.name || '',
		formula: def.formula || '',
		cas: (def.cas || '').trim(),
		synonyms: Array.isArray(def.synonyms) ? [...def.synonyms] : [],
		mw,
		tc,
		pc,
		vc,
		omega,
		zc,
		tb: def.tb,
		tm: def.tm,
		rackettZ,
		volumeShift,
		hfStandard: def.hfStandard,
		gfStandard: def.gfStandard,
		sStandard: def.sStandard,
		cpIdeal: def.cpIdeal,
		vaporPressure: def.vaporPressure,
		liquidDensity: def.liquidDensity,
		heatOfVaporization: def.heatOfVaporization,
		liquidViscosity: def.liquidViscosity,
		vaporViscosity: def.vaporViscosity,
		surfaceTension: def.surfaceTension
	};

	validateCompound(compound);
	return Object.freeze(compound);
}
