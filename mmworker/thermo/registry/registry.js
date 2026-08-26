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
 * @fileoverview Pure compound registry and binary interaction parameter lookup engine.
 */

import { SEED_COMPOUNDS } from './data/seed-compounds.js';
import { ALL_COMPOUNDS } from './data/compounds-all.js';
import bipPrData from './data/bip-pr.json' with { type: 'json' };
import { createCompound, validateCompound } from './compound.js';

/**
 * Normalizes query string for indexing and lookup.
 *
 * @param {string} str
 * @returns {string}
 */
function normalizeKey(str) {
	return str ? str.trim().toLowerCase().replace(/[\s\-_]/g, '') : '';
}

/**
 * Compound Registry for managing pure compound thermodynamic models and BIP matrices.
 */
export class CompoundRegistry {
	/**
	 * Creates a new CompoundRegistry instance.
	 *
	 * @param {boolean} [loadDefaults=true] - Whether to load pre-bundled seed compounds and BIP table
	 */
	constructor(loadDefaults = true) {
		/** @type {Map<string, import('../types/compound.js').PureCompound>} */
		this._compoundsById = new Map();

		/** @type {Map<string, import('../types/compound.js').PureCompound>} */
		this._compoundsByCas = new Map();

		/** @type {Map<string, import('../types/compound.js').PureCompound>} */
		this._compoundsByName = new Map();

		/** @type {Map<string, import('../types/compound.js').PureCompound>} */
		this._compoundsByFormula = new Map();

		/** @type {Map<string, import('../types/compound.js').PureCompound>} */
		this._compoundsByAlias = new Map();

		/** @type {Map<string, number>} */
		this._bipTable = new Map();

		/** @type {boolean} */
		this._allLoaded = false;

		if (loadDefaults) {
			this.loadSeedDatabase();
		}
	}

	/**
	 * Preloads the seed database of 16 core industrial compounds and PR binary interaction parameters.
	 */
	loadSeedDatabase() {
		for (const comp of Object.values(SEED_COMPOUNDS)) {
			this.register(comp);
		}

		if (bipPrData && typeof bipPrData === 'object') {
			for (const [key, kij] of Object.entries(bipPrData)) {
				this._bipTable.set(key, kij);
			}
		}
	}

	/**
	 * Loads the full comprehensive database of all 558+ pure compounds into the registry.
	 */
	loadAll() {
		if (this._allLoaded) return;
		for (const comp of ALL_COMPOUNDS) {
			if (!this._compoundsByCas.has(comp.cas.trim())) {
				this.register(comp);
			}
		}
		this._allLoaded = true;
	}

	/**
	 * Registers a PureCompound in the registry and builds search index mappings.
	 *
	 * @param {import('../types/compound.js').PureCompound} rawCompound - Compound definition
	 * @returns {import('../types/compound.js').PureCompound} The registered compound
	 */
	register(rawCompound) {
		const compound = createCompound(rawCompound);
		validateCompound(compound);

		this._compoundsById.set(compound.id, compound);
		this._compoundsByCas.set(compound.cas.trim(), compound);

		const normName = normalizeKey(compound.name);
		if (normName) {
			this._compoundsByName.set(normName, compound);
		}

		const normFormula = normalizeKey(compound.formula);
		if (normFormula && !this._compoundsByFormula.has(normFormula)) {
			this._compoundsByFormula.set(normFormula, compound);
		}

		if (Array.isArray(compound.synonyms)) {
			for (const alias of compound.synonyms) {
				const normAlias = normalizeKey(alias);
				if (normAlias) {
					this._compoundsByAlias.set(normAlias, compound);
				}
			}
		}

		return compound;
	}

	/**
	 * Internal lookup across index maps.
	 *
	 * @param {string} query
	 * @returns {import('../types/compound.js').PureCompound|undefined}
	 * @private
	 */
	_lookup(query) {
		// 1. Direct ID lookup
		if (this._compoundsById.has(query.toLowerCase())) {
			return this._compoundsById.get(query.toLowerCase());
		}

		// 2. Direct CAS lookup
		if (this._compoundsByCas.has(query)) {
			return this._compoundsByCas.get(query);
		}

		const norm = normalizeKey(query);

		// 3. Name lookup
		if (this._compoundsByName.has(norm)) {
			return this._compoundsByName.get(norm);
		}

		// 4. Formula lookup
		if (this._compoundsByFormula.has(norm)) {
			return this._compoundsByFormula.get(norm);
		}

		// 5. Alias/Synonym lookup
		if (this._compoundsByAlias.has(norm)) {
			return this._compoundsByAlias.get(norm);
		}

		return undefined;
	}

	/**
	 * Retrieves a PureCompound by identifier (ID, Name, CAS Number, Formula, or Synonym).
	 * If the compound is not found in the initial seed database, automatically loads all compounds.
	 *
	 * @param {string} identifier - Lookup query
	 * @returns {import('../types/compound.js').PureCompound|undefined} Matching compound or undefined
	 */
	get(identifier) {
		if (!identifier || typeof identifier !== 'string') return undefined;
		const query = identifier.trim();

		let found = this._lookup(query);
		if (!found && !this._allLoaded) {
			this.loadAll();
			found = this._lookup(query);
		}

		return found;
	}

	/**
	 * Checks whether a compound exists in the registry.
	 *
	 * @param {string} identifier - Lookup query
	 * @returns {boolean} True if found
	 */
	has(identifier) {
		return this.get(identifier) !== undefined;
	}

	/**
	 * Returns all currently loaded PureCompound definitions.
	 *
	 * @returns {import('../types/compound.js').PureCompound[]} Array of compounds
	 */
	all() {
		return Array.from(this._compoundsById.values());
	}

	/**
	 * Count of registered pure compounds.
	 *
	 * @type {number}
	 */
	get size() {
		return this._compoundsById.size;
	}

	/**
	 * Indicates whether the full database of 558+ compounds has been loaded.
	 *
	 * @type {boolean}
	 */
	get isAllLoaded() {
		return this._allLoaded;
	}

	/**
	 * Resolves a compound identifier or object to its CAS number.
	 *
	 * @param {string|import('../types/compound.js').PureCompound} comp
	 * @returns {string|undefined}
	 * @private
	 */
	_resolveCas(comp) {
		if (typeof comp === 'object' && comp !== null && comp.cas) {
			return comp.cas.trim();
		}
		if (typeof comp === 'string') {
			const found = this.get(comp);
			if (found) return found.cas.trim();
			// If not found in registry but resembles CAS pattern (e.g. 74-82-8)
			if (/^\d+-\d+-\d+$/.test(comp.trim())) {
				return comp.trim();
			}
		}
		return undefined;
	}

	/**
	 * Generates canonical BIP map key for two CAS numbers: `${casA}:${casB}` sorted.
	 *
	 * @param {string} cas1
	 * @param {string} cas2
	 * @returns {string}
	 * @private
	 */
	_getBIPKey(cas1, cas2) {
		const [a, b] = [cas1, cas2].sort();
		return `${a}:${b}`;
	}

	/**
	 * Retrieves the symmetric Peng-Robinson binary interaction parameter kij between two components.
	 * Returns 0.0 if i === j or if no interaction parameter is configured.
	 *
	 * @param {string|import('../types/compound.js').PureCompound} compA - First compound or CAS
	 * @param {string|import('../types/compound.js').PureCompound} compB - Second compound or CAS
	 * @returns {number} Binary interaction parameter k_ij (symmetric, k_ij = k_ji)
	 */
	getBIP(compA, compB) {
		const casA = this._resolveCas(compA);
		const casB = this._resolveCas(compB);

		if (!casA || !casB) return 0.0;
		if (casA === casB) return 0.0;

		const key = this._getBIPKey(casA, casB);
		return this._bipTable.get(key) || 0.0;
	}

	/**
	 * Sets or overrides the binary interaction parameter kij for a pair of compounds.
	 *
	 * @param {string|import('../types/compound.js').PureCompound} compA - First compound or CAS
	 * @param {string|import('../types/compound.js').PureCompound} compB - Second compound or CAS
	 * @param {number} kij - Binary interaction parameter value
	 */
	setBIP(compA, compB, kij) {
		const casA = this._resolveCas(compA);
		const casB = this._resolveCas(compB);

		if (!casA || !casB) {
			throw new Error(`Cannot set BIP: could not resolve CAS numbers for ${compA} and ${compB}`);
		}
		if (casA === casB) {
			return; // Self-interaction is always 0
		}

		const key = this._getBIPKey(casA, casB);
		this._bipTable.set(key, kij);
	}

	/**
	 * Checks if an explicit binary interaction parameter exists between two compounds.
	 *
	 * @param {string|import('../types/compound.js').PureCompound} compA
	 * @param {string|import('../types/compound.js').PureCompound} compB
	 * @returns {boolean}
	 */
	hasBIP(compA, compB) {
		const casA = this._resolveCas(compA);
		const casB = this._resolveCas(compB);
		if (!casA || !casB || casA === casB) return false;
		return this._bipTable.has(this._getBIPKey(casA, casB));
	}
}

/**
 * Pre-instantiated default registry instance containing standard industrial compounds.
 */
export const defaultRegistry = new CompoundRegistry(true);
