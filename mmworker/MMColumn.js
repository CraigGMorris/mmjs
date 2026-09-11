// @ts-check
/*
	This file is part of Math Minion, a javascript based calculation program
	Copyright 2026, Craig Morris

	Math Minion is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Math Minion is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with Math Minion.  If not, see <https://www.gnu.org/licenses/>.
*/
'use strict';

/* global
	MMTool:readonly
	MMFormula:readonly
	MMUnitSystem:readonly
	MMStringValue:readonly
	MMNumberValue:readonly
	MMTableValueColumn:readonly
	MMTableValue:readonly
	MMValue:readonly
	theMMSession:readonly
	thermo:readonly
*/

/** @typedef {import('./MMModel.js').MMModel} MMModel */
/** @typedef {import('./MMValue.js').MMValue} MMValue */
/** @typedef {import('./mmunits/MMUnitSystem.js').MMUnit} MMUnit */
/** @typedef {import('./MMCommandProcessor.js').MMCommand} MMCommand */
/** @typedef {import('./thermo/index.js').PureCompound} PureCompound */
/** @typedef {import('./thermo/index.js').FlashResult} FlashResult */
/** @typedef {import('./thermo/index.js').FlashEngine} FlashEngine */

import { MMTool } from './MMTool.js';
import { MMFormula } from './MMFormula.js';
import { MMNumberValue } from './MMNumberValue.js';
import { MMStringValue } from './MMStringValue.js';
import { MMTableValue, MMTableValueColumn } from './MMTableValue.js';
import { MMUnitSystem } from './mmunits/MMUnitSystem.js';
import { MMCommandMessage } from './MMCommandProcessor.js';
import { MMMath } from './MMMath.js';
import { parseThermoDefinition } from './MMFlash.js';
import { calculateIdealGasEnthalpy } from './thermo/flash/properties.js';

/**
 * @typedef {Object} MMColumnFeed
 * @property {number} stage - 1-based stage number
 * @property {MMFormula} formula - Formula resolving to feed stream
 * @property {string} [name]
 */

/**
 * @typedef {Object} MMColumnDraw
 * @property {number} stage - 1-based stage number
 * @property {'v'|'l'} phase - vapor or liquid draw
 * @property {string} name
 * @property {boolean} isBasis - true if primary basis draw (e.g. overhead or bottoms)
 * @property {number} [flow] - solved flow rate in mol/s
 * @property {MMFormula} [flowEst] - optional flow estimate formula
 */

/**
 * @typedef {Object} MMColumnSpec
 * @property {string} name
 * @property {MMFormula} formula - Formula evaluated for spec error (drives to 0)
 * @property {number} scale - Divisor to scale error
 */

/**
 * @class MMColumn
 * @extends MMTool
 */
export class MMColumn extends MMTool {
	/** @type {boolean} */
	forgetRecursionBlockIsOn = false;

	/**
	 * @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Column');

		/** @type {MMColumnFeed[]} */
		this.feeds = [];
		/** @type {MMColumnDraw[]} */
		this.draws = [];
		/** @type {MMColumnSpec[]} */
		this.specs = [];

		/** @type {MMFormula} */
		this.thermoFormula = new MMFormula('thermo', this);

		/** @type {MMFormula} */
		this.stageCountFormula = new MMFormula('nstages', this);
		this.stageCountFormula.formula = '10';

		/** @type {MMFormula} */
		this.pTopFormula = new MMFormula('ptop', this);
		this.pTopFormula.formula = '101.325 kPa';

		/** @type {MMFormula} */
		this.pBottomFormula = new MMFormula('pbottom', this);
		this.pBottomFormula.formula = '101.325 kPa';

		/** @type {MMFormula} */
		this.maxInnerLoopsFormula = new MMFormula('maxInnerLoops', this);
		this.maxInnerLoopsFormula.formula = '50';

		/** @type {MMFormula} */
		this.maxOuterLoopsFormula = new MMFormula('maxOuterLoops', this);
		this.maxOuterLoopsFormula.formula = '20';

		/** @type {MMFormula} */
		this.innerTolFormula = new MMFormula('innerTol', this);
		this.innerTolFormula.formula = '1e-4';

		/** @type {MMFormula} */
		this.outerTolFormula = new MMFormula('outerTol', this);
		this.outerTolFormula.formula = '1e-3';

		/** @type {MMFormula} */
		this.tTopEstFormula = new MMFormula('ttopest', this);

		/** @type {MMFormula} */
		this.tBotEstFormula = new MMFormula('tbotest', this);

		/** @type {boolean} */
		this._totalCondenser = false;

		/** @type {boolean} */
		this._reboiler = true;

		/** @type {boolean} */
		this.isSolving = false;
		/** @type {boolean} */
		this.isSolved = false;
		/** @type {boolean} */
		this.isInError = false;
		/** @type {boolean} */
		this.isLoadingCase = false;


		// Thermodynamic objects
		/** @type {string|null} */
		this.thermoPkg = null;
		/** @type {string[]} */
		this.componentNames = [];
		/** @type {number} */
		this.nComponents = 0;
		/** @type {PureCompound[]|null} */
		this.compounds = null;
		/** @type {any} */
		this.eos = null;
		/** @type {FlashEngine|null} */
		this.engine = null;
		/** @type {number[]} */
		this.mwts = [];

		// Numerical solver state
		/** @type {number} */
		this.nStages = 10;
		/** @type {Float64Array} */
		this.T = new Float64Array(0);
		/** @type {Float64Array} */
		this.P = new Float64Array(0);
		/** @type {Float64Array} */
		this.V = new Float64Array(0);
		/** @type {Float64Array} */
		this.L = new Float64Array(0);
		/** @type {Float64Array} */
		this.v = new Float64Array(0); // [stage * nComp + comp]
		/** @type {Float64Array} */
		this.l = new Float64Array(0); // [stage * nComp + comp]
		/** @type {Float64Array} */
		this.x = new Float64Array(0);
		/** @type {Float64Array} */
		this.y = new Float64Array(0);
		/** @type {Float64Array} */
		this.alpha = new Float64Array(0);
		/** @type {Float64Array} */
		this.A = new Float64Array(0);
		/** @type {Float64Array} */
		this.B = new Float64Array(0);
		/** @type {Float64Array} */
		this.Q = new Float64Array(0);
		/** @type {Float64Array} */
		this.hl = new Float64Array(0);
		/** @type {Float64Array} */
		this.hv = new Float64Array(0);
		/** @type {Float64Array} */
		this.Cpl = new Float64Array(0);
		/** @type {Float64Array} */
		this.Cpv = new Float64Array(0);
		/** @type {Float64Array} */
		this.f = new Float64Array(0);  // feed mass component flows [stage * nComp + comp]
		/** @type {Float64Array} */
		this.fQ = new Float64Array(0); // feed enthalpy flows [stage]
		/** @type {Float64Array} */
		this.logSFactors = new Float64Array(0);
		/** @type {number} */
		this.refComponent = 0;

		// Broyden warm state container
		/** @type {import('./MMMath.js').MMBroydenWarmState|null} */
		this.broydenWarmState = null;

		// Pre-allocated MMNumberValue caches for expression evaluation
		/** @type {MMNumberValue|null} */
		this.cachedT = null;
		/** @type {MMNumberValue|null} */
		this.cachedP = null;
		/** @type {MMNumberValue|null} */
		this.cachedVf = null;
		/** @type {MMNumberValue|null} */
		this.cachedLf = null;
		/** @type {MMNumberValue|null} */
		this.cachedQ = null;
		/** @type {MMNumberValue|null} */
		this.cachedVdraw = null;
		/** @type {MMNumberValue|null} */
		this.cachedLdraw = null;
		/** @type {MMNumberValue|null} */
		this.cachedHl = null;
		/** @type {MMNumberValue|null} */
		this.cachedHv = null;
		/** @type {Map<string, MMNumberValue>} */
		this.cachedCompProfiles = new Map();

		/** @type {Record<string, string>} */
		this.displayUnits = {};

		// Set default draws: top vapor distillate and bottom liquid bottoms
		const d1Est = new MMFormula('Overhead_est', this);
		d1Est.nameSpace = /** @type {any} */ ((parentModel && parentModel.typeName === 'Model') ? parentModel : theMMSession.currentModel);
		this.draws.push({ stage: 1, phase: 'v', name: 'Overhead', isBasis: true, flowEst: d1Est });

		const d2Est = new MMFormula('Bottoms_est', this);
		d2Est.nameSpace = /** @type {any} */ ((parentModel && parentModel.typeName === 'Model') ? parentModel : theMMSession.currentModel);
		this.draws.push({ stage: 10, phase: 'l', name: 'Bottoms', isBasis: true, flowEst: d2Est });

		// Set default specs: 2 specs
		const spec1 = new MMFormula('spec1', this);
		spec1.nameSpace = /** @type {any} */ ((parentModel && parentModel.typeName === 'Model') ? parentModel : theMMSession.currentModel);
		spec1.formula = '$.vf[1] - 50 mol/s';
		const spec2 = new MMFormula('spec2', this);
		spec2.nameSpace = /** @type {any} */ ((parentModel && parentModel.typeName === 'Model') ? parentModel : theMMSession.currentModel);
		spec2.formula = '$.lf[1] / $.vf[1] - 1.5';
		this.specs.push({ name: 'Spec1', formula: spec1, scale: 50 });
		this.specs.push({ name: 'Spec2', formula: spec2, scale: 1.0 });


		/** @type {string|null} */
		this.lastErrorKey = null;
		/** @type {Record<string, any>|null} */
		this.lastErrorArgs = null;
	}

	get totalCondenser() {
		return this._totalCondenser;
	}

	set totalCondenser(val) {
		const bVal = Boolean(val);
		if (this._totalCondenser !== bVal) {
			this._totalCondenser = bVal;
			if (bVal) {
				// Check if liquid draw exists on stage 1
				const hasL1 = this.draws.some(d => d.stage === 1 && d.phase === 'l');
				if (!hasL1) {
					this.draws.push({ stage: 1, phase: 'l', name: 'DistillateLiq', isBasis: false });
				}
			}
			this.forgetCalculated();
		}
	}

	get reboiler() {
		return this._reboiler;
	}

	set reboiler(val) {
		const bVal = Boolean(val);
		if (this._reboiler !== bVal) {
			this._reboiler = bVal;
			this.forgetCalculated();
		}
	}

	/**
	 * @override
	 * @method formulaList
	 * @returns {MMFormula[]}
	 */
	formulaList() {
		const list = [
			this.thermoFormula,
			this.stageCountFormula,
			this.pTopFormula,
			this.pBottomFormula,
			this.tTopEstFormula,
			this.tBotEstFormula,
			this.maxInnerLoopsFormula,
			this.maxOuterLoopsFormula,
			this.innerTolFormula,
			this.outerTolFormula
		];
		for (const feed of this.feeds) {
			list.push(feed.formula);
		}
		for (const draw of this.draws) {
			if (draw.flowEst) list.push(draw.flowEst);
		}
		for (const spec of this.specs) {
			list.push(spec.formula);
		}
		return list;
	}

	/**
	 * @override
	 * @method inputSources
	 * @returns {Set<MMTool>}
	 */
	inputSources() {
		const sources = super.inputSources();
		for (const f of this.formulaList()) {
			f.addInputSourcesToSet(sources);
		}
		return sources;
	}

	/**
	 * @method forgetStep
	 * Invalidates only requestors downstream of this tool without global cascade
	 */
	forgetStep() {
		if (!this.forgetRecursionBlockIsOn) {
			try {
				this.forgetRecursionBlockIsOn = true;
				for (const requestor of this.valueRequestors) {
					if (requestor !== this) {
						requestor.forgetCalculated();
					}
				}
				this.valueRequestors.clear();
				super.forgetCalculated();


			}
			finally {
				this.forgetRecursionBlockIsOn = false;
			}

		}
	}

	/**
	 * @override
	 * @method forgetCalculated
	 */
	forgetCalculated() {
		this.isSolved = false;
		this.broydenWarmState = null;
		this.lastErrorKey = null;
		this.lastErrorArgs = null;
		this.forgetStep();
	}

	/**
	 * @override
	 * @param {string} key
	 * @param {Record<string, any>} [args]
	 * @param {import('./MMCommandProcessor.js').MMCommandMessage} [child]
	 */
	setError(key, args, child) {
		super.setError(key, args, child);
		if (!this.lastErrorKey || (this.lastErrorKey === 'mmcmd:mathJacobianSingular' && key !== 'mmcmd:mathJacobianSingular')) {
			this.lastErrorKey = key;
			this.lastErrorArgs = args || null;
		}
	}

	/**
	 * @method ensureThermo
	 * Validates and initializes thermodynamic engine from thermoFormula
	 * @returns {boolean}
	 */
	ensureThermo() {
		const thermoEngine = /** @type {any} */ ((typeof self !== 'undefined' ? (/** @type {any} */ (self)).thermo : null) || (typeof thermo !== 'undefined' ? thermo : null));
		if (!thermoEngine || !thermoEngine.defaultRegistry) {
			return false;
		}

		const defVal = this.thermoFormula.value();
		if (!defVal) {
			this.setError('thermo:columnNoThermoError', { path: this.getPath() });
			return false;
		}
		const defStr = (defVal instanceof MMStringValue && defVal.valueCount > 0) ? defVal.values[0] : (typeof defVal === 'string' ? defVal : '');
		if (!defStr) {
			this.setError('thermo:columnNoThermoError', { path: this.getPath() });
			return false;
		}

		const cleanThermo = defStr.replace(/^['"`]+|['"`]+$/g, '').trim();
		const phaseSplit = cleanThermo.split('@');
		const pkgSplit = phaseSplit[0].split('::');
		if (pkgSplit.length > 1) {
			this.thermoPkg = (/** @type {string} */ (pkgSplit.shift())).trim();
		}
		else {
			this.thermoPkg = 'PR';
		}
		const parsed = parseThermoDefinition(pkgSplit.join('::'));
		if (!parsed.compounds || parsed.compounds.length === 0) {
			this.setError('thermo:flashThermoDefnError', { path: this.getPath() });
			return false;
		}

		// Rebuild EOS if components changed
		const compNames = parsed.compounds;
		const compKey = compNames.join(',');
		if (this.componentNames.join(',') !== compKey || !this.engine) {
			thermoEngine.defaultRegistry.loadAll();
			const compounds = [];
			for (const cName of compNames) {
				const comp = thermoEngine.defaultRegistry.get(cName);
				if (!comp) {
					this.setError('thermo:flashThermoDefnError', { path: this.getPath() });
					return false;
				}
				compounds.push(comp);
			}
			this.compounds = compounds;
			this.componentNames = compNames;
			this.nComponents = compounds.length;
			this.mwts = compounds.map(c => c.mw * 1000);
			this.eos = new thermoEngine.PengRobinson(compounds);
			this.engine = new thermoEngine.FlashEngine(this.eos);
			this.refComponent = Math.floor(this.nComponents / 2); // default median
		}

		return true;
	}

	/**
	 * @method ensureStageCount
	 * @returns {number}
	 */
	ensureStageCount() {
		const countVal = this.stageCountFormula.value();
		let n = (countVal instanceof MMNumberValue) ? countVal.values[0] : 10;
		if (isNaN(n) || n < 2) {
			this.setError('thermo:columnInvalidStagesError', { path: this.getPath() });
			n = Math.max(2, Math.floor(isNaN(n) ? 10 : n));
		}
		else {
			n = Math.floor(n);
		}
		const oldN = this.nStages;
		this.nStages = n;
		if (oldN !== n) {
			this.broydenWarmState = null;
		}
		for (const d of this.draws) {
			if (d.isBasis && d.stage > 1) {
				if (d.name.toLowerCase() === 'bottoms' || d.stage === oldN || d.stage > n || oldN !== n) {
					d.stage = n;
				}
			}
			else if (d.stage > n) {
				d.stage = n;
			}
		}
		for (const f of this.feeds) {
			if (f.stage > n) {
				f.stage = n;
			}
		}
		return this.nStages;
	}

	/**
	 * @method allocateArrays
	 * @param {number} n
	 * @param {number} nComp
	 */
	allocateArrays(n, nComp) {
		const nTotal = n * nComp;
		if (this.T.length !== n) {
			this.T = new Float64Array(n);
			this.P = new Float64Array(n);
			this.V = new Float64Array(n);
			this.L = new Float64Array(n);
			this.Q = new Float64Array(n);
			this.hl = new Float64Array(n);
			this.hv = new Float64Array(n);
			this.Cpl = new Float64Array(n);
			this.Cpv = new Float64Array(n);
			this.A = new Float64Array(n);
			this.B = new Float64Array(n);
			this.fQ = new Float64Array(n);

			this.cachedT = new MMNumberValue(n, 1, [0, 0, 0, 0, 1, 0, 0]);
			this.cachedP = new MMNumberValue(n, 1, [-1, 1, -2, 0, 0, 0, 0]);
			this.cachedVf = new MMNumberValue(n, 1, [0, 0, -1, 0, 0, 1, 0]);
			this.cachedLf = new MMNumberValue(n, 1, [0, 0, -1, 0, 0, 1, 0]);
			this.cachedQ = new MMNumberValue(n, 1, [2, 1, -3, 0, 0, 0, 0]);
			this.cachedVdraw = new MMNumberValue(n, 1, [0, 0, -1, 0, 0, 1, 0]);
			this.cachedLdraw = new MMNumberValue(n, 1, [0, 0, -1, 0, 0, 1, 0]);
			this.cachedHl = new MMNumberValue(n, 1, [2, 1, -2, 0, 0, -1, 0]);
			this.cachedHv = new MMNumberValue(n, 1, [2, 1, -2, 0, 0, -1, 0]);
		}
		if (this.v.length !== nTotal) {
			this.v = new Float64Array(nTotal);
			this.l = new Float64Array(nTotal);
			this.x = new Float64Array(nTotal);
			this.y = new Float64Array(nTotal);
			this.alpha = new Float64Array(nTotal);
			this.f = new Float64Array(nTotal);
			this.cachedCompProfiles.clear();
		}
	}

	/**
	 * @method initScratch
	 * Cold start initialization: pressure profile, P-H feed flashes, Wilson K-values, CMO traffic
	 * @returns {boolean}
	 */
	initScratch() {
		this.broydenWarmState = null;
		if (!this.ensureThermo()) {
			return false;
		}
		const N = this.ensureStageCount();
		const nComp = this.nComponents;
		this.allocateArrays(N, nComp);

		// 1. Establish Pressure Profile
		const pTopVal = this.pTopFormula.value();
		const pBotVal = this.pBottomFormula.value();
		const pTop = (pTopVal instanceof MMNumberValue) ? pTopVal.values[0] : 101325.0;
		const pBot = (pBotVal instanceof MMNumberValue) ? pBotVal.values[0] : pTop;
		for (let j = 0; j < N; j++) {
			this.P[j] = pTop + (pBot - pTop) * (j / Math.max(1, N - 1));
		}

		// 2. Clear Feed Loading Arrays
		this.f.fill(0.0);
		this.fQ.fill(0.0);
		let totalFeedFlow = 0.0;
		const combinedFeedZ = new Float64Array(nComp);

		// 3. Pre-flash feeds via P-H flash at feed stage pressure
		const engine = /** @type {FlashEngine} */ (this.engine);
		for (const feed of this.feeds) {
			const feedVal = /** @type {any} */ (feed.formula.value());
			if (!feedVal) continue;

			// Extract stream properties: t, p, f (flow in mol/s), h (J/mol), x (mole fractions)
			let fFlow = 0.0;
			let fP = 101325.0;
			let fT = 298.15;
			let fH = 0.0;
			let fZ = new Float64Array(nComp);

			const target = (feedVal instanceof MMToolValue && feedVal.valueCount > 0) ? feedVal.values[0] : feedVal;

			if (target && typeof target.valueDescribedBy === 'function') {
				let flowVal = target.valueDescribedBy('f');
				if (!flowVal) flowVal = target.valueDescribedBy('b.f');
				if (!flowVal) flowVal = target.valueDescribedBy('flow');
				if (flowVal instanceof MMNumberValue && flowVal.valueCount > 0) {
					fFlow = flowVal.values[0];
				}
				let pVal = target.valueDescribedBy('p');
				if (!pVal) pVal = target.valueDescribedBy('b.p');
				if (pVal instanceof MMNumberValue && pVal.valueCount > 0) {
					fP = pVal.values[0];
				}
				let tVal = target.valueDescribedBy('t');
				if (!tVal) tVal = target.valueDescribedBy('b.t');
				if (tVal instanceof MMNumberValue && tVal.valueCount > 0) {
					fT = tVal.values[0];
				}
				let hVal = target.valueDescribedBy('h');
				if (!hVal) hVal = target.valueDescribedBy('b.h');
				if (hVal instanceof MMNumberValue && hVal.valueCount > 0) {
					fH = hVal.values[0];
				}
				let xVal = target.valueDescribedBy('x');
				if (!xVal) xVal = target.valueDescribedBy('b.x');
				if (xVal instanceof MMNumberValue && xVal.valueCount > 0) {
					for (let i = 0; i < Math.min(nComp, xVal.values.length); i++) {
						fZ[i] = xVal.values[i];
					}
				}
			}

			if (fFlow <= 0.0 && target && target.flowFormula) {
				const fv = target.flowFormula.value();
				if (fv instanceof MMNumberValue && fv.valueCount > 0) {
					fFlow = fv.values[0];
				}
			}
			if (fFlow <= 0.0 && feedVal instanceof MMNumberValue && feedVal.valueCount > 0) {
				fFlow = feedVal.values[0];
			}

			let sumZ = 0.0;
			for (let i = 0; i < nComp; i++) sumZ += fZ[i];
			if (sumZ <= 0.0 && target && target.moleFracFormula) {
				const zVal = target.moleFracFormula.value();
				if (zVal instanceof MMNumberValue) {
					for (let i = 0; i < Math.min(nComp, zVal.values.length); i++) {
						fZ[i] = zVal.values[i];
					}
				}
			}

			sumZ = 0.0;
			for (let i = 0; i < nComp; i++) sumZ += fZ[i];
			if (sumZ > 0.0) {
				for (let i = 0; i < nComp; i++) fZ[i] /= sumZ;
			}
			else {
				fZ.fill(1.0 / nComp);
			}

			if (fFlow <= 0.0) continue;
			const stageIdx = Math.max(0, Math.min(N - 1, feed.stage - 1));
			const stageP = this.P[stageIdx];

			// If enthalpy was not supplied, calculate at (T_feed, P_feed)
			if (fH === 0.0) {
				const res0 = engine.flashTP(fT, fP, fZ);
				fH = res0.bulk ? res0.bulk.enthalpy : 0.0;
			}

			// Adiabatic throttling / isenthalpic letdown into column feed stage
			let flashRes;
			try {
				flashRes = engine.flashPH(stageP, fH, fZ);
			}
			catch (e) {
				flashRes = engine.flashTP(fT, stageP, fZ);
			}

			const enthalpyIn = fH * fFlow; // W (J/s)
			this.fQ[stageIdx] += enthalpyIn;

			for (let i = 0; i < nComp; i++) {
				const compFlow = fFlow * fZ[i];
				this.f[stageIdx * nComp + i] += compFlow;
				combinedFeedZ[i] += compFlow;
			}
			totalFeedFlow += fFlow;
		}

		if (totalFeedFlow <= 0.0) {
			this.setError('thermo:columnNoFeedsError', { path: this.getPath() });
			return false;
		}

		// Normalize combined feed composition
		for (let i = 0; i < nComp; i++) {
			combinedFeedZ[i] /= totalFeedFlow;
		}

		// 4. Initial Temperature Profile and Flow Estimates
		const compounds = /** @type {PureCompound[]} */ (this.compounds);

		// Distillate rate estimate: check top draw (stage 1) user flow estimate, then bottom draw (stage N)
		let estD = NaN;
		for (const draw of this.draws) {
			if (draw.stage === 1 && draw.flowEst && draw.flowEst.formula) {
				const fVal = draw.flowEst.value();
				if (fVal instanceof MMNumberValue && fVal.valueCount > 0 && fVal.values[0] > 0) {
					estD = fVal.values[0];
					break;
				}
			}
		}
		if (isNaN(estD)) {
			for (const draw of this.draws) {
				if (draw.stage === N && draw.flowEst && draw.flowEst.formula) {
					const fVal = draw.flowEst.value();
					if (fVal instanceof MMNumberValue && fVal.valueCount > 0 && fVal.values[0] > 0) {
						estD = Math.max(0.01 * totalFeedFlow, totalFeedFlow - fVal.values[0]);
						break;
					}
				}
			}
		}
		// Fallback: check if an explicit anchored distillate flow spec was given: $.vf[1] - <val>
		if (isNaN(estD)) {
			for (const spec of this.specs) {
				const text = (spec.formula && spec.formula.formula) ? spec.formula.formula.trim().toLowerCase() : '';
				const mD = text.match(/^\s*\$\.(?:vf|vdraw|ldraw)\[\s*1\s*\]\s*-\s*([0-9.]+)/);
				if (mD) {
					estD = parseFloat(mD[1]);
					break;
				}
			}
		}
		// Fallback: infer estD from component purity specifications (e.g. light key in bottoms)
		if (isNaN(estD)) {
			for (const spec of this.specs) {
				const text = (spec.formula && spec.formula.formula) ? spec.formula.formula.trim().toLowerCase() : '';
				const m = text.match(/\$\.lx\[\s*(?:-1|\d+)\s*(?:,\s*["']?([a-zA-Z0-9_-]+)["']?)?\s*\](?:\.([a-zA-Z0-9_-]+))?\s*-\s*([0-9.]+)/);
				if (m) {
					const compName = m[1] || m[2];
					const target = parseFloat(m[3]);
					if (target <= 0.1 && compName) {
						const keyIdx = this.componentNames.findIndex(c => c.toLowerCase().replace(/[-_]/g, '') === compName.replace(/[-_]/g, ''));
						if (keyIdx >= 0) {
							const keyTc = (compounds[keyIdx] && compounds[keyIdx].tc) ? compounds[keyIdx].tc : 300.0;
							let sumD = 0.0;
							for (let i = 0; i < nComp; i++) {
								const tc_i = (compounds[i] && compounds[i].tc) ? compounds[i].tc : 300.0;
								if (tc_i <= keyTc + 0.1) {
									sumD += combinedFeedZ[i] * totalFeedFlow;
								}
							}
							estD = Math.max(0.05 * totalFeedFlow, Math.min(0.95 * totalFeedFlow, sumD));
							break;
						}
					}
				}
			}
		}
		if (isNaN(estD)) {
			estD = 0.5 * totalFeedFlow;
		}
		estD = Math.max(0.05 * totalFeedFlow, Math.min(0.95 * totalFeedFlow, estD));
		const estB = totalFeedFlow - estD;

		const compOrder = [];
		for (let i = 0; i < nComp; i++) {
			compOrder.push({ idx: i, tc: (compounds[i] && compounds[i].tc) ? compounds[i].tc : 300.0 });
		}
		compOrder.sort((a, b) => a.tc - b.tc);
		const zD = new Float64Array(nComp);
		const zB = new Float64Array(nComp);
		let remD = estD;
		for (const c of compOrder) {
			const compFeedFlow = combinedFeedZ[c.idx] * totalFeedFlow;
			if (remD > 0) {
				const take = Math.min(remD, compFeedFlow);
				zD[c.idx] = take;
				zB[c.idx] = compFeedFlow - take;
				remD -= take;
			}
			else {
				zB[c.idx] = compFeedFlow;
			}
		}
		for (let i = 0; i < nComp; i++) {
			zD[i] /= estD;
			zB[i] /= estB;
		}

		// Initial Temperature Profile: check user estimates first, fallback to flash
		let tTopEst = NaN;
		let tBotEst = NaN;

		if (this.tTopEstFormula && this.tTopEstFormula.formula) {
			const tv = this.tTopEstFormula.value();
			if (tv instanceof MMNumberValue && tv.valueCount > 0 && tv.values[0] > 0) {
				tTopEst = tv.values[0];
			}
		}
		if (this.tBotEstFormula && this.tBotEstFormula.formula) {
			const tv = this.tBotEstFormula.value();
			if (tv instanceof MMNumberValue && tv.valueCount > 0 && tv.values[0] > 0) {
				tBotEst = tv.values[0];
			}
		}

		// For uncooled overheads (e.g. demethanizers), ensure tTopEst is not warmer than cold feeds entering at stage 1
		for (const feed of this.feeds) {
			if (feed.stage === 1) {
				const fTarget = feed.formula && feed.formula.value();
				const target = (fTarget instanceof MMToolValue && fTarget.valueCount > 0) ? fTarget.values[0] : fTarget;
				if (target && typeof target.valueDescribedBy === 'function') {
					const tVal = target.valueDescribedBy('t') || target.valueDescribedBy('b.t');
					if (tVal instanceof MMNumberValue && tVal.valueCount > 0 && tVal.values[0] > 0) {
						const fT = tVal.values[0];
						if (!isNaN(tTopEst) && tTopEst > fT) {
							tTopEst = fT;
						}
					}
				}
			}
		}

		if (isNaN(tTopEst) || isNaN(tBotEst)) {
			try {
				if (isNaN(tTopEst)) {
					const qTop = this._totalCondenser ? 0.0 : 1.0;
					const dewRes = engine.flash({ type: 'PQ', P: this.P[0], Q: qTop }, zD);
					if (dewRes && dewRes.converged) tTopEst = dewRes.T;
				}
				if (isNaN(tBotEst)) {
					const bubRes = engine.flash({ type: 'PQ', P: this.P[N - 1], Q: 0.0 }, zB);
					if (bubRes && bubRes.converged) tBotEst = bubRes.T;
				}
			}
			catch (e) {
				if (isNaN(tTopEst)) tTopEst = 300.0;
				if (isNaN(tBotEst)) tBotEst = 350.0;
			}
		}
		if (isNaN(tTopEst)) tTopEst = 300.0;
		if (isNaN(tBotEst)) tBotEst = tTopEst + 30.0;
		if (tBotEst <= tTopEst) {
			tBotEst = tTopEst + 20.0;
		}
		for (let j = 0; j < N; j++) {
			this.T[j] = tTopEst + (tBotEst - tTopEst) * (j / Math.max(1, N - 1));
		}

		// 5. Select reference component: prefer subcritical key component at column conditions
		let bestRef = -1;
		let maxZ = -1;
		const minTc = 0.95 * tBotEst;
		for (let i = 0; i < nComp; i++) {
			const tc = compounds[i] ? compounds[i].tc : 300.0;
			if (tc >= minTc && combinedFeedZ[i] > maxZ) {
				maxZ = combinedFeedZ[i];
				bestRef = i;
			}
		}
		if (bestRef < 0) {
			let maxTc = -1;
			for (let i = 0; i < nComp; i++) {
				const tc = compounds[i] ? compounds[i].tc : 300.0;
				if (tc > maxTc) {
					maxTc = tc;
					bestRef = i;
				}
			}
		}
		if (bestRef >= 0) {
			this.refComponent = bestRef;
		}
		const b = this.refComponent;

		// 6. Initial K-values via Wilson Correlation and Relative Volatilities
		const KbArray = new Float64Array(N);
		for (let j = 0; j < N; j++) {
			const Tj = this.T[j];
			const Pj = this.P[j];
			let Kb = 1.0;
			for (let i = 0; i < nComp; i++) {
				const comp = compounds[i];
				const Tr = Tj / comp.tc;
				const lnKi = Math.log(comp.pc / Pj) + 5.373 * (1.0 + comp.omega) * (1.0 - 1.0 / Tr);
				const Ki = Math.exp(lnKi);
				this.alpha[j * nComp + i] = Ki;
				if (i === b) Kb = Ki;
			}
			KbArray[j] = Math.max(1e-6, Kb);
			for (let i = 0; i < nComp; i++) {
				this.alpha[j * nComp + i] /= KbArray[j];
			}
		}

		// 7. Internal Traffic Estimates (CMO)
		let nominalReflux = 1.5;
		for (const spec of this.specs) {
			const text = (spec.formula && spec.formula.formula) ? spec.formula.formula.toLowerCase() : '';
			const m = text.match(/\$\.lf\[\s*1\s*\]\s*\/\s*\$\.(?:vf|ldraw)\[\s*1\s*\]\s*-\s*([0-9.]+)/);
			if (m) {
				nominalReflux = Math.max(0.2, parseFloat(m[1]));
				break;
			}
		}

		let feedStage = Math.floor(N / 2);
		for (let j = 0; j < N; j++) {
			let stageFeed = 0.0;
			for (let i = 0; i < nComp; i++) stageFeed += this.f[j * nComp + i];
			if (stageFeed > 0.5 * totalFeedFlow) feedStage = j;
		}

		for (let j = 0; j < N; j++) {
			let Lcurr, Vcurr;
			if (j < feedStage) {
				Lcurr = nominalReflux * estD;
				Vcurr = (1.0 + nominalReflux) * estD;
			}
			else {
				Lcurr = nominalReflux * estD + totalFeedFlow;
				Vcurr = (1.0 + nominalReflux) * estD;
			}
			this.L[j] = Math.max(1e-4 * totalFeedFlow, Lcurr);
			this.V[j] = (j === 0 && this._totalCondenser) ? 0.0 : Math.max(1e-4 * totalFeedFlow, Vcurr);
		}

		// 8. Initial Stripping Factors ln(S_j) = ln(Kb_j * V_j / L_j)
		const totCond = this._totalCondenser ? 1 : 0;
		const numNonBasisDraws = this.draws.filter(d => !d.isBasis).length;
		const numInner = N - totCond + numNonBasisDraws;
		if (this.logSFactors.length !== numInner) {
			this.logSFactors = new Float64Array(numInner);
		}

		let varIdx = 0;
		for (let j = totCond; j < N; j++) {
			this.logSFactors[varIdx++] = Math.log(Math.max(1e-5, KbArray[j] * this.V[j] / this.L[j]));
		}
		for (const draw of this.draws) {
			if (!draw.isBasis) {
				const stg = draw.stage - 1;
				const baseFlow = draw.phase === 'v' ? this.V[stg] : this.L[stg];
				let defaultRatio = (this._totalCondenser && stg === 0) ? (1.0 / nominalReflux) : (0.1 * baseFlow / Math.max(1e-4, baseFlow));
				if (draw.flowEst && draw.flowEst.formula) {
					const fVal = draw.flowEst.value();
					if (fVal instanceof MMNumberValue && fVal.valueCount > 0 && fVal.values[0] > 0) {
						defaultRatio = fVal.values[0] / Math.max(1e-4, baseFlow);
					}
				}
				this.logSFactors[varIdx++] = Math.log(Math.max(1e-5, defaultRatio));
			}
		}

		// 9. Reconcile Mass Balance and Invert Temperatures
		this.solveFlowMatrix(this.logSFactors);
		this.calculateTemperatures();

		return true;
	}

	/**
	 * @method solveFlowMatrix
	 * Tridiagonal Thomas algorithm solver for stage component flows
	 * @param {Float64Array} logS
	 */
	solveFlowMatrix(logS) {
		const N = this.nStages;
		const nComp = this.nComponents;
		const totCond = this._totalCondenser ? 1 : 0;

		const S = new Float64Array(N);
		let varIdx = 0;
		if (totCond) S[0] = 0.0;
		for (let j = totCond; j < N; j++) {
			S[j] = Math.exp(Math.max(-25.0, Math.min(25.0, logS[varIdx++])));
		}

		// Draw ratio terms
		const RvTerm = new Float64Array(N).fill(1.0);
		const RlTerm = new Float64Array(N).fill(1.0);
		for (const draw of this.draws) {
			const j = draw.stage - 1;
			if (!draw.isBasis) {
				const rRatio = Math.exp(Math.max(-25.0, Math.min(25.0, logS[varIdx++])));
				if (draw.phase === 'v') RvTerm[j] += rRatio;
				else RlTerm[j] += rRatio;
			}
		}
		this.RvTerm = RvTerm;
		this.RlTerm = RlTerm;

		if (totCond) {
			const M = N - 1;
			const a = new Float64Array(M);
			const b = new Float64Array(M);
			const c = new Float64Array(M);
			const d = new Float64Array(M);
			const cPrime = new Float64Array(M);
			const dPrime = new Float64Array(M);

			for (let i = 0; i < nComp; i++) {
				for (let m = 0; m < M; m++) {
					const j = m + 1;
					const alphaSjInv = 1.0 / Math.max(1e-12, this.alpha[j * nComp + i] * S[j]);
					if (m === 0) {
						b[0] = RvTerm[1] - 1.0 / Math.max(1e-12, RlTerm[0]) + RlTerm[1] * alphaSjInv;
						c[0] = (M > 1) ? -1.0 : 0.0;
						a[0] = 0.0;
						d[0] = this.f[1 * nComp + i] + this.f[0 * nComp + i] / Math.max(1e-12, RlTerm[0]);
					}
					else {
						const jPrev = j - 1;
						const alphaSprevInv = 1.0 / Math.max(1e-12, this.alpha[jPrev * nComp + i] * S[jPrev]);
						a[m] = -RlTerm[jPrev] * alphaSprevInv;
						b[m] = RvTerm[j] + RlTerm[j] * alphaSjInv;
						c[m] = (m < M - 1) ? -1.0 : 0.0;
						d[m] = this.f[j * nComp + i];
					}
				}

				// Forward sweep
				cPrime[0] = c[0] / b[0];
				dPrime[0] = d[0] / b[0];
				for (let m = 1; m < M; m++) {
					const denom = b[m] - a[m] * cPrime[m - 1];
					cPrime[m] = c[m] / denom;
					dPrime[m] = (d[m] - a[m] * dPrime[m - 1]) / denom;
				}

				// Back substitution
				this.v[(N - 1) * nComp + i] = Math.max(1e-20, dPrime[M - 1]);
				for (let m = M - 2; m >= 0; m--) {
					const j = m + 1;
					const val = dPrime[m] - cPrime[m] * this.v[(j + 1) * nComp + i];
					this.v[j * nComp + i] = Math.max(1e-20, val);
				}

				// Stage 0 flows
				this.v[0 * nComp + i] = 0.0;
				this.l[0 * nComp + i] = (this.v[1 * nComp + i] + this.f[0 * nComp + i]) / Math.max(1e-12, RlTerm[0]);

				// Liquid flows for stages 1 to N-1
				for (let j = 1; j < N; j++) {
					const alphaVal = this.alpha[j * nComp + i];
					this.l[j * nComp + i] = this.v[j * nComp + i] / Math.max(1e-12, alphaVal * S[j]);
				}
			}
		}
		else {
			// Thomas algorithm workspace for standard partial condenser
			const a = new Float64Array(N);
			const b = new Float64Array(N);
			const c = new Float64Array(N);
			const d = new Float64Array(N);
			const cPrime = new Float64Array(N);
			const dPrime = new Float64Array(N);

			for (let i = 0; i < nComp; i++) {
				for (let j = 0; j < N; j++) {
					const alphaVal = this.alpha[j * nComp + i];
					const Sj = S[j];
					const alphaSjInv = 1.0 / Math.max(1e-12, alphaVal * Sj);

					b[j] = RvTerm[j] + RlTerm[j] * alphaSjInv;
					c[j] = (j < N - 1) ? -1.0 : 0.0;
					a[j] = (j > 0) ? -(RlTerm[j - 1] / Math.max(1e-12, this.alpha[(j - 1) * nComp + i] * S[j - 1])) : 0.0;
					d[j] = this.f[j * nComp + i];
				}

				// Forward sweep
				cPrime[0] = c[0] / b[0];
				dPrime[0] = d[0] / b[0];
				for (let j = 1; j < N; j++) {
					const denom = b[j] - a[j] * cPrime[j - 1];
					cPrime[j] = c[j] / denom;
					dPrime[j] = (d[j] - a[j] * dPrime[j - 1]) / denom;
				}

				// Back substitution
				this.v[(N - 1) * nComp + i] = Math.max(1e-20, dPrime[N - 1]);
				for (let j = N - 2; j >= 0; j--) {
					const val = dPrime[j] - cPrime[j] * this.v[(j + 1) * nComp + i];
					this.v[j * nComp + i] = Math.max(1e-20, val);
				}

				// Liquid flows from equilibrium relationship: l_ji = v_ji / (alpha_ji * S_j)
				for (let j = 0; j < N; j++) {
					const alphaVal = this.alpha[j * nComp + i];
					this.l[j * nComp + i] = this.v[j * nComp + i] / Math.max(1e-12, alphaVal * S[j]);
				}
			}
		}

		// Sum totals and compute mole fractions
		for (let j = 0; j < N; j++) {
			let totalV = 0.0;
			let totalL = 0.0;
			for (let i = 0; i < nComp; i++) {
				totalV += this.v[j * nComp + i];
				totalL += this.l[j * nComp + i];
			}
			this.V[j] = (j === 0 && totCond) ? 0.0 : totalV;
			this.L[j] = totalL;

			const invV = totalV > 0.0 ? 1.0 / totalV : 0.0;
			const invL = totalL > 0.0 ? 1.0 / totalL : 0.0;
			for (let i = 0; i < nComp; i++) {
				this.y[j * nComp + i] = this.v[j * nComp + i] * invV;
				this.x[j * nComp + i] = this.l[j * nComp + i] * invL;
			}
		}
	}

	/**
	 * @method calculateTemperatures
	 * Analytic temperature inversion via simplified Kb model
	 */
	calculateTemperatures() {
		const N = this.nStages;
		const nComp = this.nComponents;

		for (let j = 0; j < N; j++) {
			let sumAlphaX = 0.0;
			for (let i = 0; i < nComp; i++) {
				sumAlphaX += this.alpha[j * nComp + i] * this.x[j * nComp + i];
			}
			sumAlphaX = Math.max(1e-8, sumAlphaX);
			const denom = this.A[j] + Math.log(sumAlphaX);
			if (denom > 0.5 && this.B[j] > 0.0) {
				const targetT = this.B[j] / denom;
				this.T[j] = Math.max(100.0, Math.min(1000.0, targetT));
			}
		}
	}

	/**
	 * @method initOuterProperties
	 * Evaluates rigorous EOS properties, updating A, B, alpha, and enthalpy coefficients
	 */
	initOuterProperties() {
		const N = this.nStages;
		const nComp = this.nComponents;
		const eos = /** @type {any} */ (this.eos);
		const b = this.refComponent;

		const zL = new Float64Array(nComp);
		const zV = new Float64Array(nComp);
		const lnPhiL = new Float64Array(nComp);
		const lnPhiV = new Float64Array(nComp);

		for (let j = 0; j < N; j++) {
			let stageT = this.T[j];
			const P = this.P[j];
			for (let i = 0; i < nComp; i++) {
				zL[i] = this.x[j * nComp + i];
				zV[i] = this.y[j * nComp + i];
			}
			if (j === 0 && this._totalCondenser) {
				let sumY = 0.0;
				for (let i = 0; i < nComp; i++) {
					const yi = Math.max(1e-12, this.alpha[0 * nComp + i] * zL[i]);
					zV[i] = yi;
					sumY += yi;
				}
				const invSumY = sumY > 0.0 ? 1.0 / sumY : 1.0;
				for (let i = 0; i < nComp; i++) {
					zV[i] *= invSumY;
					this.y[0 * nComp + i] = zV[i];
				}
			}

			// Validate liquid root existence; if single root or collapsed to vapor root, reset stage T to bubble point
			const numRootsL = eos.calculateZFactors(stageT, P, zL);
			const zL_root = eos.workspace.zFactors[0];
			const zV_root = eos.workspace.zFactors[1];
			if (numRootsL === 1 || Math.abs(zL_root - zV_root) < 1e-4 || zL_root > 0.35) {
				try {
					const engine = /** @type {any} */ (this.engine);
					const bubRes = engine.flash({ type: 'PQ', P: P, Q: 0.0 }, zL);
					if (bubRes && bubRes.converged && bubRes.T > 50.0 && bubRes.T < 1000.0) {
						stageT = bubRes.T;
						this.T[j] = stageT;
						eos.calculateZFactors(stageT, P, zL);
					}
				}
				catch (e) {
					// retain best effort
				}
			}
			const T = stageT;

			// Rigorous Liquid
			const Z_L = eos.workspace.zFactors[0];
			eos.calculateFugacityCoefficients(T, P, zL, Z_L, lnPhiL);
			const depL = eos.calculateDepartures(T, P, zL, Z_L);
			const hDepL = depL.hDep;

			// Rigorous Vapor
			eos.calculateZFactors(T, P, zV);
			const Z_V = eos.workspace.zFactors[1];
			eos.calculateFugacityCoefficients(T, P, zV, Z_V, lnPhiV);
			const depV = eos.calculateDepartures(T, P, zV, Z_V);
			const hDepV = depV.hDep;

			const hIgL = calculateIdealGasEnthalpy(/** @type {PureCompound[]} */ (this.compounds), zL, T);
			const hIgV = calculateIdealGasEnthalpy(/** @type {PureCompound[]} */ (this.compounds), zV, T);
			this.hl[j] = hIgL + hDepL;
			this.hv[j] = hIgV + hDepV;

			// Relative volatilities K_i = phi_L,i / phi_V,i
			let Kb = 1.0;
			for (let i = 0; i < nComp; i++) {
				const lnKi = lnPhiL[i] - lnPhiV[i];
				const Ki = Math.exp(Math.max(-50.0, Math.min(50.0, lnKi)));
				this.alpha[j * nComp + i] = Ki;
				if (i === b) Kb = Ki;
			}
			for (let i = 0; i < nComp; i++) {
				this.alpha[j * nComp + i] /= Math.max(1e-12, Kb);
			}

			// Numerical temperature derivative for Russell / Boston-Britt B parameter
			const T2 = T + 1.0;
			eos.calculateZFactors(T2, P, zL);
			const Z_L2 = eos.workspace.zFactors[0];
			eos.calculateFugacityCoefficients(T2, P, zL, Z_L2, lnPhiL);

			eos.calculateZFactors(T2, P, zV);
			const Z_V2 = eos.workspace.zFactors[1];
			eos.calculateFugacityCoefficients(T2, P, zV, Z_V2, lnPhiV);

			const lnKb2 = lnPhiL[b] - lnPhiV[b];
			const lnKb1 = Math.log(Math.max(1e-12, Kb));

			const dtInv = (1.0 / T2 - 1.0 / T);
			const Bval = (lnKb1 - lnKb2) / dtInv;
			const refComp = (/** @type {PureCompound[]} */ (this.compounds))[b];
			const B_ref = refComp ? 5.373 * (1.0 + refComp.omega) * refComp.tc : 2000.0;
			if (isNaN(Bval) || Bval <= 100.0 || Bval > 25000.0) {
				this.B[j] = B_ref;
			}
			else {
				this.B[j] = Bval;
			}
			this.A[j] = lnKb1 + this.B[j] / T;
		}
	}

	/**
	 * Direct numerical evaluation of common column specifications
	 * Used as a robust fallback if formula engine encounters worker/namespace evaluation issues
	 * @param {{name: string, formula: MMFormula, scale?: number}} spec
	 * @returns {number} NaN if not matched
	 */
	evaluateSpecDirectly(spec) {
		if (!spec || !spec.formula || !spec.formula.formula) return NaN;
		const text = spec.formula.formula.trim().toLowerCase();
		const N = this.nStages;

		// 1. Reflux ratio: $.lf[1] / $.vf[1] - <val>
		const refluxMatch = text.match(/^\$\.lf\[\s*1\s*\]\s*\/\s*\$\.vf\[\s*1\s*\]\s*-\s*([0-9.]+)/);
		if (refluxMatch) {
			const target = parseFloat(refluxMatch[1]);
			const v1 = Math.max(1e-6, this.V[0]);
			const l1 = this.L[0];
			return (l1 / v1) - target;
		}

		// 2. Reboiler liquid flow: $.lf[$.nstages] - <val> or $.lf[10] - <val>
		const reboilerMatch = text.match(/^\$\.lf\[\s*(?:\$\.nstages|stagecount|\d+)\s*\]\s*-\s*([0-9.]+)/);
		if (reboilerMatch) {
			const target = parseFloat(reboilerMatch[1]);
			if (text.includes('nstages') || text.includes('stagecount') || text.includes(`[${N}]`) || text.includes(`[ ${N} ]`)) {
				return this.L[N - 1] - target;
			}
		}

		// 3. Stage vapor flow: $.vf[k] - <val>
		const vfMatch = text.match(/^\$\.vf\[\s*(\d+)\s*\]\s*-\s*([0-9.]+)/);
		if (vfMatch) {
			const k = parseInt(vfMatch[1], 10);
			if (k >= 1 && k <= N) {
				const target = parseFloat(vfMatch[2]);
				return this.V[k - 1] - target;
			}
		}

		// 4. Stage liquid flow: $.lf[k] - <val>
		const lfMatch = text.match(/^\$\.lf\[\s*(\d+)\s*\]\s*-\s*([0-9.]+)/);
		if (lfMatch) {
			const k = parseInt(lfMatch[1], 10);
			if (k >= 1 && k <= N) {
				const target = parseFloat(lfMatch[2]);
				return this.L[k - 1] - target;
			}
		}

		// 5. Stage composition: $.lx[k, "compound"] - <val> or $.vx[k, "compound"] - <val>
		const compMatch = text.match(/^\$\.(lx|vx)\[\s*(-?\d+)\s*,\s*["']([^"']+)["']\s*\]\s*-\s*([0-9.]+)/);
		if (compMatch) {
			const phase = compMatch[1];
			let k = parseInt(compMatch[2], 10);
			if (k < 0) k = N + k + 1;
			const stageIdx = k - 1;
			if (stageIdx >= 0 && stageIdx < N) {
				const queryName = compMatch[3].trim().toLowerCase().replace(/[\s-_]/g, '');
				const compIdx = this.componentNames.findIndex((c, i) => {
					const cClean = c.toLowerCase().replace(/[\s-_]/g, '');
					const compObj = this.compounds ? (/** @type {PureCompound[]} */ (this.compounds))[i] : null;
					const fClean = (compObj && compObj.formula) ? compObj.formula.toLowerCase().replace(/[\s-_]/g, '') : '';
					const nClean = (compObj && compObj.name) ? compObj.name.toLowerCase().replace(/[\s-_]/g, '') : '';
					return cClean === queryName || fClean === queryName || nClean === queryName;
				});
				if (compIdx >= 0) {
					const target = parseFloat(compMatch[4]);
					const arr = phase === 'lx' ? this.x : this.y;
					return arr[stageIdx * this.nComponents + compIdx] - target;
				}
			}
		}

		return NaN;
	}

	/**
	 * @method innerErrors
	 * Evaluates stage energy residuals, calculates unknown duties, and evaluates spec formulas
	 * @param {Float64Array} fx - Error vector destination
	 */
	innerErrors(fx) {
		const N = this.nStages;
		const totCond = this._totalCondenser ? 1 : 0;

		// 1. Synchronize pre-allocated MMNumberValue caches and compute draw flows
		(/** @type {MMNumberValue} */ (this.cachedT)).values.set(this.T);
		(/** @type {MMNumberValue} */ (this.cachedP)).values.set(this.P);
		(/** @type {MMNumberValue} */ (this.cachedVf)).values.set(this.V);
		(/** @type {MMNumberValue} */ (this.cachedLf)).values.set(this.L);
		if (this.cachedHl) (/** @type {MMNumberValue} */ (this.cachedHl)).values.set(this.hl);
		if (this.cachedHv) (/** @type {MMNumberValue} */ (this.cachedHv)).values.set(this.hv);

		const vdraws = (/** @type {MMNumberValue} */ (this.cachedVdraw)).values;
		const ldraws = (/** @type {MMNumberValue} */ (this.cachedLdraw)).values;
		vdraws.fill(0.0);
		ldraws.fill(0.0);
		const sideLDraws = new Float64Array(N);
		const sideVDraws = new Float64Array(N);
		for (const draw of this.draws) {
			const stg = draw.stage - 1;
			if (draw.phase === 'v') {
				const flow = draw.isBasis ? this.V[stg] : (this.V[stg] * Math.max(0.0, (this.RvTerm ? this.RvTerm[stg] - 1.0 : 0.0)));
				vdraws[stg] += flow;
				draw.flow = flow;
				if (!draw.isBasis) sideVDraws[stg] += flow;
			}
			else {
				const flow = draw.isBasis ? this.L[stg] : (this.L[stg] * Math.max(0.0, (this.RlTerm ? this.RlTerm[stg] - 1.0 : 0.0)));
				ldraws[stg] += flow;
				draw.flow = flow;
				if (!draw.isBasis) sideLDraws[stg] += flow;
			}
		}

		// 2. Heat balances
		// Ene_j = Q_feed,j + L_{j-1}*hl_{j-1} + V_{j+1}*hv_{j+1} - (L_j + sideLDraws_j)*hl_j - (V_j + sideVDraws_j)*hv_j - Q_j
		const heatErrors = new Float64Array(N);
		const scale = new Float64Array(N);
		for (let j = 0; j < N; j++) {
			let hIn = this.fQ[j];
			let hScale = Math.abs(this.fQ[j]);

			if (j > 0) {
				const lIn = this.L[j - 1] * this.hl[j - 1];
				hIn += lIn;
				hScale += Math.abs(lIn);
			}
			if (j < N - 1) {
				const vIn = this.V[j + 1] * this.hv[j + 1];
				hIn += vIn;
				hScale += Math.abs(vIn);
			}

			const lOut = (this.L[j] + sideLDraws[j]) * this.hl[j];
			const vOut = (j === 0 && this._totalCondenser) ? 0.0 : ((this.V[j] + sideVDraws[j]) * this.hv[j]);
			hScale += Math.abs(lOut) + Math.abs(vOut);

			heatErrors[j] = hIn - (lOut + vOut);
			scale[j] = Math.max(1e4, hScale);
		}

		// Stage 0 condenser duty and stage N-1 reboiler duty absorption
		this.Q[0] = -heatErrors[0];
		if (this._reboiler) {
			this.Q[N - 1] = -heatErrors[N - 1];
		}
		else {
			this.Q[N - 1] = 0.0;
		}
		(/** @type {MMNumberValue} */ (this.cachedQ)).values.set(this.Q);

		// 3. Invalidate downstream requestors so formulas evaluate current column values
		this.forgetStep();

		// 4. Populate inner error vector fx
		let eqIdx = 0;

		// Stages enforcing adiabatic heat balance
		const maxAdiabaticStage = this._reboiler ? (N - 1) : N;
		for (let j = 1; j < maxAdiabaticStage; j++) {
			fx[eqIdx++] = heatErrors[j] / scale[j];
		}

		// User specifications
		for (let s = 0; s < this.specs.length; s++) {
			const spec = this.specs[s];
			if (spec && spec.formula) {
				let err = NaN;
				const sVal = spec.formula.value();
				if (sVal instanceof MMNumberValue && !isNaN(sVal.values[0])) {
					err = sVal.values[0];
				}
				else {
					err = this.evaluateSpecDirectly(spec);
				}

				if (!isNaN(err)) {
					fx[eqIdx++] = err / (spec.scale || 1.0);
				}
				else {
					this.isInError = true;
					this.setError('thermo:columnSpecEvaluationError', {
						path: this.getPath(),
						name: spec.name,
						formula: spec.formula.formula
					});
					fx[eqIdx++] = 1e6;
				}
			}
			else {
				fx[eqIdx++] = 0.0;
			}
		}
	}

	/**
	 * @method solve
	 * Master solve coordinating outer EOS updates and inner Broyden solves
	 */
	solve() {
		if (this.isSolving) return;
		this.isSolving = true;
		this.isInError = false;
		this.lastErrorKey = null;
		this.lastErrorArgs = null;

		try {
			// Cold or warm initialization
			if (!this.isSolved || !this.broydenWarmState) {
				this.broydenWarmState = {};
				if (!this.initScratch()) {
					this.isInError = true;
					return;
				}
			}

			// Verify degrees of freedom (specifications count)
			const totCond = this._totalCondenser ? 1 : 0;
			const numNonBasisDraws = this.draws.filter(d => !d.isBasis).length;
			const numInner = this.nStages - totCond + numNonBasisDraws;
			const numEnergyEquations = this._reboiler ? (this.nStages - 2) : (this.nStages - 1);
			const requiredSpecs = Math.max(0, numInner - numEnergyEquations);
			if (this.specs.length !== requiredSpecs) {
				this.setError('thermo:columnSpecsCountError', { path: this.getPath(), count: this.specs.length, required: requiredSpecs });
				this.isInError = true;
				return;
			}

			const isColdStart = !this.isSolved;
			const maxOuter = 25;
			const outerTol = 0.05;
			let outerIter = 0;
			let outerConverged = false;
			const prevT = new Float64Array(this.nStages);

			while (outerIter < maxOuter && !outerConverged) {
				outerIter++;
				prevT.set(this.T);

				// Update outer properties from current (T, P, x, y)
				this.initOuterProperties();

				// Inner Broyden solve
				const nVars = this.logSFactors.length;
				const currentX = new Float64Array(this.logSFactors);

				MMMath.broydenSolve(
					nVars,
					currentX,
					{
						calcFx: (n, xIn, fxOut) => {
							this.logSFactors.set(xIn);
							this.solveFlowMatrix(this.logSFactors);
							this.calculateTemperatures();
							this.innerErrors(fxOut);
						},
						setError: (key, data) => {
							this.isInError = true;
							this.setError(key, Object.assign({ path: this.getPath() }, data));
						},
						setStatus: (msg, data) => {
							if (this.processor && typeof (/** @type {any} */ (this.processor)).statusCallBack === 'function') {
								(/** @type {any} */ (this.processor)).statusCallBack(this.t(msg, data));
							}
						}
					},
					{
						maxIterations: 100,
						fTolerance: 1e-4,
						dxTolerance: 1e-8,
						eps: 1e-10,
						maxStepLength: 0.5,
						warmState: this.broydenWarmState || undefined
					}
				);

				if (this.isInError) {
					break;
				}
				this.logSFactors.set(currentX);

				// Outer loop convergence check: temperature profile stability
				let maxDeltaT = 0.0;
				for (let j = 0; j < this.nStages; j++) {
					const dt = Math.abs(this.T[j] - prevT[j]);
					if (dt > maxDeltaT) maxDeltaT = dt;
				}

				if ((!isColdStart || outerIter > 1) && maxDeltaT < outerTol) {
					outerConverged = true;
					break;
				}
			}

			if (outerConverged) {
				this.initOuterProperties();
				const dummyFx = new Float64Array(this.logSFactors.length);
				this.innerErrors(dummyFx);
				this.isSolved = true;
				this.forgetStep();
			}
			else {
				this.isSolved = false;
				this.isInError = true;
				this.broydenWarmState = null;
				if (!this.lastErrorKey) {
					this.setError('thermo:columnOuterIterExceeded', { path: this.getPath(), iter: outerIter, maxIter: maxOuter });
				}
			}
		}
		catch (e) {
			console.log('solve catch error:', e);
			this.isSolved = false;
			this.isInError = true;
			this.broydenWarmState = null;
			this.setError('thermo:columnSolveFailed', { path: this.getPath(), msg: (e && /** @type {any} */ (e).message) ? /** @type {any} */ (e).message : String(e) });
		}
		finally {
			this.isSolving = false;
		}
	}

	/**
	 * @override
	 * @method valueDescribedBy
	 * @param {string} description
	 * @param {MMTool} [requestor]
	 * @returns {MMValue|null|undefined}
	 */
	valueDescribedBy(description, requestor) {
		if (!description) {
			return super.valueDescribedBy(description, requestor);
		}

		const descLower = description.toLowerCase().trim();
		const parts = descLower.split('.');
		const prop = parts[0];

		if (prop === 'solved') {
			if (this.isSolved) {
				this.addRequestor(requestor);
				return MMNumberValue.scalarValue(1);
			}
			return null;
		}

		if (prop === 'thermo') {
			if (this.thermoFormula) {
				this.addRequestor(requestor);
				return this.thermoFormula.value();
			}
		}

		if (prop === 'nstages' || prop === 'stagecount') {
			this.addRequestor(requestor);
			return MMNumberValue.scalarValue(this.nStages);
		}

		// Auto-trigger solve on query if not solved
		if (!this.isSolved && !this.isSolving) {
			this.solve();
		}

		this.addRequestor(requestor);

		switch (prop) {
			case 't':
				return this.cachedT;
			case 'p':
				return this.cachedP;
			case 'vf':
				return this.cachedVf;
			case 'lf':
				return this.cachedLf;
			case 'q':
				return this.cachedQ;
			case 'vdraw':
				return this.cachedVdraw;
			case 'ldraw':
				return this.cachedLdraw;
			case 'lh':
			case 'hl':
				return this.cachedHl;
			case 'lv':
			case 'vh':
			case 'hv':
				return this.cachedHv;


			case 'vx':
			case 'lx': {
				const isVap = prop === 'vx';
				const sourceArr = isVap ? this.y : this.x;
				const nComp = this.nComponents;
				const N = this.nStages;

				// Approach C: virtual property delegation by compound name (e.g. $.vx.propane)
				if (parts.length > 1) {
					const compNameQuery = parts[1];
					const compIdx = this.componentNames.findIndex(c => c.toLowerCase() === compNameQuery);
					if (compIdx >= 0) {
						let cachedCol = this.cachedCompProfiles.get(descLower);
						if (!cachedCol || cachedCol.values.length !== N) {
							cachedCol = new MMNumberValue(N, 1);
							this.cachedCompProfiles.set(descLower, cachedCol);
						}
						for (let j = 0; j < N; j++) {
							cachedCol.values[j] = sourceArr[j * nComp + compIdx];
						}
						return cachedCol;
					}
				}

				// Return 2D table of all compounds across stages
				const columns = [];
				for (let i = 0; i < nComp; i++) {
					const cName = this.componentNames[i];
					const colVal = new MMNumberValue(N, 1);
					for (let j = 0; j < N; j++) {
						colVal.values[j] = sourceArr[j * nComp + i];
					}
					columns.push(new MMTableValueColumn({ name: cName, value: colVal }));
				}
				return new MMTableValue({ columns });
			}

			default:
				return super.valueDescribedBy(description, requestor);
		}
	}

	/**
	 * @override
	 * @method parameters
	 * @returns {string[]}
	 */
	parameters() {
		let p = super.parameters();
		p.push('t');
		p.push('p');
		p.push('vf');
		p.push('lf');
		p.push('q');
		p.push('vdraw');
		p.push('ldraw');
		p.push('lh');
		p.push('lv');
		p.push('vx');
		p.push('lx');
		p.push('nstages');
		p.push('stagecount');
		p.push('solved');
		p.push('thermo');
		return p;
	}

	// ==================== Command Verbs ====================

	/** @override */
	get verbs() {
		const verbs = super.verbs;
		verbs['addfeed'] = this.addFeedCommand;
		verbs['removefeed'] = this.removeFeedCommand;
		verbs['restorefeed'] = this.restoreFeedCommand;
		verbs['adddraw'] = this.addDrawCommand;
		verbs['removedraw'] = this.removeDrawCommand;
		verbs['restoredraw'] = this.restoreDrawCommand;
		verbs['addspec'] = this.addSpecCommand;
		verbs['removespec'] = this.removeSpecCommand;
		verbs['restorespec'] = this.restoreSpecCommand;
		verbs['setstages'] = this.setStagesCommand;
		verbs['setdrawstage'] = this.setDrawStageCommand;
		verbs['setfeedstage'] = this.setFeedStageCommand;
		verbs['settotalcondenser'] = this.setTotalCondenserCommand;
		verbs['setreboiler'] = this.setReboilerCommand;
		verbs['reset'] = this.resetCommand;
		verbs['solve'] = this.solveCommand;
		verbs['setcolumnunit'] = this.setColumnUnitCommand;
		return verbs;
	}

	/**
	 * @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string|undefined} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			setcolumnunit: 'mmcmd:_exprSetColumnUnit',
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}

	/**
	 * @method setColumnUnitCommand
	 * @param {MMCommand} command
	 */
	setColumnUnitCommand(command) {
		const parts = String(command.args).trim().split(/\s+/);
		const colNames = ['T', 'P', 'V', 'L', 'Q', 'Feeds', 'Draws'];
		if (parts.length >= 2) {
			let colKey = parts[0];
			const colIndex = parseInt(colKey);
			if (!isNaN(colIndex) && colIndex >= 1 && colIndex <= colNames.length) {
				colKey = colNames[colIndex - 1];
			}
			const unitName = parts[1];
			const unit = theMMSession.unitSystem.unitNamed(unitName);
			if (unit) {
				this.displayUnits[colKey] = unitName;
				this.forgetCalculated();
				command.results = unitName;
			}
			else {
				this.setError('mmcmd:unknownUnit', { unit: unitName });
			}
		}
		else if (parts.length === 1 && parts[0]) {
			let colKey = parts[0];
			const colIndex = parseInt(colKey);
			if (!isNaN(colIndex) && colIndex >= 1 && colIndex <= colNames.length) {
				colKey = colNames[colIndex - 1];
			}
			delete this.displayUnits[colKey];
			this.forgetCalculated();
			command.results = '';
		}
	}

	/**
	 * @method addFeedCommand
	 * @param {MMCommand} command
	 */
	addFeedCommand(command) {
		const cmd = /** @type {any} */ (command);
		let stg = 1;
		let formulaStr = '';
		if (cmd.args) {
			const parts = String(cmd.args).trim().split(/\s+/);
			if (parts.length >= 2) {
				stg = parseInt(parts[0]);
				formulaStr = parts.slice(1).join(' ');
			}
		}
		else if (cmd.stage !== undefined && cmd.formula) {
			stg = parseInt(cmd.stage);
			formulaStr = String(cmd.formula);
		}
		if (formulaStr) {
			const name = cmd.name || `feed${this.feeds.length + 1}`;
			const f = new MMFormula(name, this);
			f.formula = formulaStr;
			f.nameSpace = /** @type {any} */ ((this.parent && (/** @type {any} */ (this.parent)).typeName === 'Model') ? this.parent : theMMSession.currentModel);
			this.feeds.push({ stage: stg, formula: f, name: f.name });
			this.forgetCalculated();
			cmd.results = this.feeds.length;
			cmd.undo = `${this.getPath()} removefeed ${this.feeds.length}`;
		}
	}

	/**
	 * @method removeFeedCommand
	 * @param {MMCommand} command
	 */
	removeFeedCommand(command) {
		const cmd = /** @type {any} */ (command);
		let idx = -1;
		if (cmd.args !== undefined) {
			idx = parseInt(cmd.args) - 1;
		}
		else if (cmd.index !== undefined) {
			idx = parseInt(cmd.index);
		}
		if (idx >= 0 && idx < this.feeds.length) {
			const removed = this.feeds.splice(idx, 1)[0];
			if (this.children && removed && removed.name) delete this.children[removed.name.toLowerCase()];
			this.forgetCalculated();
			const json = JSON.stringify({ stage: removed.stage, formula: removed.formula.formula, name: removed.name });
			cmd.undo = `${this.getPath()} restorefeed ${json}`;
		}
	}

	/**
	 * @method restoreFeedCommand
	 * @param {MMCommand} command
	 */
	restoreFeedCommand(command) {
		try {
			const data = JSON.parse(command.args);
			const f = new MMFormula(data.name || `feed${this.feeds.length + 1}`, this);
			f.formula = data.formula;
			f.nameSpace = /** @type {any} */ ((this.parent && (/** @type {any} */ (this.parent)).typeName === 'Model') ? this.parent : theMMSession.currentModel);
			this.feeds.push({ stage: data.stage, formula: f, name: f.name });
			this.forgetCalculated();
		}
		catch (e) {
			this.setError('mmcmd:feedRestoreError', { path: this.getPath() });
		}
	}

	/**
	 * @method setFeedStageCommand
	 * @param {MMCommand} command
	 */
	setFeedStageCommand(command) {
		const cmd = /** @type {any} */ (command);
		const parts = String(cmd.args || '').trim().split(/\s+/);
		if (parts.length < 2) return;
		let feed = null;
		const idx = parseInt(parts[0]);
		if (!isNaN(idx) && idx >= 1 && idx <= this.feeds.length) {
			feed = this.feeds[idx - 1];
		}
		else {
			feed = this.feeds.find(f => f.name.toLowerCase() === parts[0].toLowerCase());
		}
		if (feed) {
			const prevStage = feed.stage;
			const n = this.ensureStageCount();
			const newStage = Math.max(1, Math.min(n, parseInt(parts[1]) || 1));
			feed.stage = newStage;
			this.forgetCalculated();
			cmd.results = newStage;
			cmd.undo = `${this.getPath()} setfeedstage ${parts[0]} ${prevStage}`;
		}
	}

	/**
	 * @method addDrawCommand
	 * @param {MMCommand} command
	 */
	addDrawCommand(command) {
		const cmd = /** @type {any} */ (command);
		let stg = 1, phase = 'l', name = '', estStr = '';
		if (cmd.args) {
			const parts = String(cmd.args).trim().split(/\s+/);
			if (parts.length >= 3) {
				stg = parseInt(parts[0]);
				phase = parts[1].toLowerCase() === 'v' ? 'v' : 'l';
				name = parts[2];
				if (parts.length >= 4) {
					estStr = parts.slice(3).join(' ');
				}
			}
		}
		else if (cmd.stage !== undefined) {
			stg = parseInt(cmd.stage);
			phase = String(cmd.phase).toLowerCase() === 'v' ? 'v' : 'l';
			name = String(cmd.name);
			if (cmd.flowEst) estStr = String(cmd.flowEst);
		}
		if (name) {
			const flowEst = new MMFormula(`${name}_est`, this);
			flowEst.formula = estStr;
			flowEst.nameSpace = /** @type {any} */ ((this.parent && (/** @type {any} */ (this.parent)).typeName === 'Model') ? this.parent : theMMSession.currentModel);
			this.draws.push({ stage: stg, phase: /** @type {'v'|'l'} */ (phase), name, isBasis: false, flowEst });
			this.forgetCalculated();
			cmd.results = this.draws.length;
			cmd.undo = `${this.getPath()} removedraw ${this.draws.length}`;
		}
	}

	/**
	 * @method removeDrawCommand
	 * @param {MMCommand} command
	 */
	removeDrawCommand(command) {
		const cmd = /** @type {any} */ (command);
		let idx = -1;
		if (cmd.args !== undefined) {
			idx = parseInt(cmd.args) - 1;
		}
		else if (cmd.index !== undefined) {
			idx = parseInt(cmd.index);
		}
		else if (cmd.name) {
			idx = this.draws.findIndex(d => d.name === cmd.name);
		}
		if (idx >= 0 && idx < this.draws.length) {
			const removed = this.draws.splice(idx, 1)[0];
			if (this.children && removed && removed.name) {
				delete this.children[`${removed.name}_est`.toLowerCase()];
			}
			this.forgetCalculated();
			cmd.undo = `${this.getPath()} restoredraw ${JSON.stringify({
				stage: removed.stage,
				phase: removed.phase,
				name: removed.name,
				isBasis: removed.isBasis,
				flowEst: removed.flowEst ? removed.flowEst.formula : ''
			})}`;
		}
	}

	/**
	 * @method restoreDrawCommand
	 * @param {MMCommand} command
	 */
	restoreDrawCommand(command) {
		try {
			const data = JSON.parse(command.args);
			const flowEst = new MMFormula(`${data.name}_est`, this);
			flowEst.formula = data.flowEst || '';
			flowEst.nameSpace = /** @type {any} */ ((this.parent && (/** @type {any} */ (this.parent)).typeName === 'Model') ? this.parent : theMMSession.currentModel);
			this.draws.push({
				stage: data.stage,
				phase: data.phase,
				name: data.name,
				isBasis: Boolean(data.isBasis),
				flowEst
			});
			this.forgetCalculated();
		}
		catch (e) {
			this.setError('mmcmd:drawRestoreError', { path: this.getPath() });
		}
	}

	/**
	 * @method setDrawStageCommand
	 * @param {MMCommand} command
	 */
	setDrawStageCommand(command) {
		const cmd = /** @type {any} */ (command);
		const parts = String(cmd.args || '').trim().split(/\s+/);
		if (parts.length < 2) return;
		let draw = null;
		const idx = parseInt(parts[0]);
		if (!isNaN(idx) && idx >= 1 && idx <= this.draws.length) {
			draw = this.draws[idx - 1];
		}
		else {
			draw = this.draws.find(d => d.name.toLowerCase() === parts[0].toLowerCase());
		}
		if (draw) {
			const prevStage = draw.stage;
			const n = this.ensureStageCount();
			const newStage = Math.max(1, Math.min(n, parseInt(parts[1]) || 1));
			draw.stage = newStage;
			this.forgetCalculated();
			cmd.results = newStage;
			cmd.undo = `${this.getPath()} setdrawstage ${parts[0]} ${prevStage}`;
		}
	}

	/**
	 * @method addSpecCommand
	 * @param {MMCommand} command
	 */
	addSpecCommand(command) {
		const cmd = /** @type {any} */ (command);
		let name = '', formulaStr = '', scale = 1.0;
		if (cmd.args) {
			const trimmed = String(cmd.args).trim();
			const firstSpace = trimmed.indexOf(' ');
			if (firstSpace > 0) {
				name = trimmed.substring(0, firstSpace).trim();
				const rest = trimmed.substring(firstSpace + 1).trim();
				const lastSpace = rest.lastIndexOf(' ');
				if (lastSpace > 0) {
					const possibleScale = rest.substring(lastSpace + 1).trim();
					const num = Number(possibleScale);
					if (!isNaN(num) && isFinite(num) && !possibleScale.includes('/')) {
						scale = num;
						formulaStr = rest.substring(0, lastSpace).trim();
					}
					else {
						formulaStr = rest;
					}
				}
				else {
					formulaStr = rest;
				}
			}
		}
		else if (cmd.name && cmd.formula) {
			name = String(cmd.name);
			formulaStr = String(cmd.formula);
			scale = cmd.scale !== undefined ? parseFloat(cmd.scale) : 1.0;
		}
		if (name && formulaStr) {
			const f = new MMFormula(name, this);
			f.formula = formulaStr;
			f.nameSpace = /** @type {any} */ ((this.parent && (/** @type {any} */ (this.parent)).typeName === 'Model') ? this.parent : theMMSession.currentModel);
			this.specs.push({ name, formula: f, scale });
			this.forgetCalculated();
			cmd.results = this.specs.length;
			cmd.undo = `${this.getPath()} removespec ${this.specs.length}`;
		}

	}

	/**
	 * @method removeSpecCommand
	 * @param {MMCommand} command
	 */
	removeSpecCommand(command) {
		const cmd = /** @type {any} */ (command);
		let idx = -1;
		if (cmd.args !== undefined) {
			idx = parseInt(cmd.args) - 1;
		}
		else if (cmd.index !== undefined) {
			idx = parseInt(cmd.index);
		}
		else if (cmd.name) {
			idx = this.specs.findIndex(s => s.name === cmd.name);
		}
		if (idx >= 0 && idx < this.specs.length) {
			const removed = this.specs.splice(idx, 1)[0];
			if (this.children && removed && removed.name) delete this.children[removed.name.toLowerCase()];
			this.forgetCalculated();
			const json = JSON.stringify({ name: removed.name, formula: removed.formula.formula, scale: removed.scale });
			cmd.undo = `${this.getPath()} restorespec ${json}`;
		}
	}

	/**
	 * @method restoreSpecCommand
	 * @param {MMCommand} command
	 */
	restoreSpecCommand(command) {
		try {
			const data = JSON.parse(command.args);
			const f = new MMFormula(data.name, this);
			f.formula = data.formula;
			this.specs.push({ name: data.name, formula: f, scale: data.scale || 1.0 });
			this.forgetCalculated();
		}
		catch (e) {
			this.setError('mmcmd:specRestoreError', { path: this.getPath() });
		}
	}

	/**
	 * @method setStagesCommand
	 * @param {MMCommand} command
	 */
	setStagesCommand(command) {
		const cmd = /** @type {any} */ (command);
		const prev = this.stageCountFormula.formula;
		const val = cmd.args !== undefined ? String(cmd.args) : String(cmd.stageCount || '10');
		this.stageCountFormula.formula = val;
		this.ensureStageCount();
		this.forgetCalculated();
		cmd.undo = `${this.getPath()} setstages ${prev}`;
	}

	/**
	 * @method setTotalCondenserCommand
	 * @param {MMCommand} command
	 */
	setTotalCondenserCommand(command) {
		const cmd = /** @type {any} */ (command);
		const prev = this.totalCondenser;
		const str = cmd.args !== undefined ? String(cmd.args) : String(cmd.totalCondenser !== undefined ? cmd.totalCondenser : '');
		this.totalCondenser = str.toLowerCase().startsWith('t') || str === '1';
		cmd.undo = `${this.getPath()} settotalcondenser ${prev}`;
	}

	/**
	 * @method setReboilerCommand
	 * @param {MMCommand} command
	 */
	setReboilerCommand(command) {
		const cmd = /** @type {any} */ (command);
		const prev = this.reboiler;
		const str = cmd.args !== undefined ? String(cmd.args) : String(cmd.reboiler !== undefined ? cmd.reboiler : '');
		this.reboiler = str.toLowerCase().startsWith('t') || str === '1';
		cmd.undo = `${this.getPath()} setreboiler ${prev}`;
	}

	/**
	 * @method resetCommand
	 * @param {MMCommand} command
	 */
	resetCommand(command) {
		this.forgetCalculated();
		this.broydenWarmState = null;
		this.T = new Float64Array(0);
		this.V = new Float64Array(0);
		this.L = new Float64Array(0);
		this.Q = new Float64Array(0);
		this.cachedVf = null;
		this.cachedLf = null;
		this.cachedT = null;
		this.cachedP = null;
		this.cachedQ = null;
		this.cachedHl = null;
		this.cachedHv = null;
		this.isInError = false;
		this.lastErrorKey = null;
		this.lastErrorArgs = null;
		command.results = 'reset done';
	}

	/**
	 * @method solveCommand
	 * @param {MMCommand} command
	 */
	solveCommand(command) {
		this.solve();
		command.results = this.isSolved ? 'converged' : 'failed';
	}

	/**
	 * @override
	 * @method saveObject
	 * @returns {Object}
	 */
	saveObject() {
		const o = /** @type {Record<string, any>} */ (super.saveObject());
		o['Type'] = 'Column';
		o['thermo'] = { Formula: this.thermoFormula.formula };
		o['nstages'] = { Formula: this.stageCountFormula.formula };
		o['ptop'] = { Formula: this.pTopFormula.formula };
		o['pbottom'] = { Formula: this.pBottomFormula.formula };
		o['totalCondenser'] = this.totalCondenser;
		o['reboiler'] = this.reboiler;

		if (this.tTopEstFormula && this.tTopEstFormula.formula) o['ttopest'] = { Formula: this.tTopEstFormula.formula };
		if (this.tBotEstFormula && this.tBotEstFormula.formula) o['tbotest'] = { Formula: this.tBotEstFormula.formula };

		o['feeds'] = this.feeds.map(f => ({
			stage: f.stage,
			formula: f.formula.formula,
			name: f.name
		}));

		o['draws'] = this.draws.map(d => ({
			stage: d.stage,
			phase: d.phase,
			name: d.name,
			isBasis: d.isBasis,
			flowEst: d.flowEst ? d.flowEst.formula : ''
		}));

		o['specs'] = this.specs.map(s => ({
			name: s.name,
			formula: s.formula.formula,
			scale: s.scale
		}));

		if (this.displayUnits && Object.keys(this.displayUnits).length) {
			o['displayUnits'] = { ...this.displayUnits };
		}

		return o;
	}

	/**
	 * @method initFromSaved
	 * @override
	 * @param {Record<string, any>} saved
	 */
	initFromSaved(saved) {
		this.isLoadingCase = true;
		try {
			super.initFromSaved(saved);
			if (saved.thermo) this.thermoFormula.formula = saved.thermo.Formula;
			if (saved.nstages) this.stageCountFormula.formula = saved.nstages.Formula;
			if (saved.ptop) this.pTopFormula.formula = saved.ptop.Formula;
			if (saved.pbottom) this.pBottomFormula.formula = saved.pbottom.Formula;
			if (saved.ttopest) this.tTopEstFormula.formula = saved.ttopest.Formula;
			if (saved.tbotest) this.tBotEstFormula.formula = saved.tbotest.Formula;
			this.totalCondenser = Boolean(saved.totalCondenser);
			if (saved.reboiler !== undefined) this.reboiler = Boolean(saved.reboiler);

			if (Array.isArray(saved.feeds)) {
				this.feeds = saved.feeds.map(f => {
					const form = new MMFormula(f.name, this);
					form.formula = f.formula;
					form.nameSpace = /** @type {any} */ ((this.parent && (/** @type {any} */ (this.parent)).typeName === 'Model') ? this.parent : theMMSession.currentModel);
					return { stage: f.stage, formula: form, name: f.name };
				});
			}

			if (Array.isArray(saved.draws)) {
				this.draws = saved.draws.map(d => {
					const flowEst = new MMFormula(`${d.name}_est`, this);
					flowEst.formula = d.flowEst || '';
					flowEst.nameSpace = /** @type {any} */ ((this.parent && (/** @type {any} */ (this.parent)).typeName === 'Model') ? this.parent : theMMSession.currentModel);
					return {
						stage: d.stage,
						phase: d.phase,
						name: d.name,
						isBasis: Boolean(d.isBasis),
						flowEst
					};
				});
			}

			if (Array.isArray(saved.specs)) {
				this.specs = saved.specs.map(s => {
					const form = new MMFormula(s.name, this);
					form.formula = s.formula;
					form.nameSpace = /** @type {any} */ ((this.parent && (/** @type {any} */ (this.parent)).typeName === 'Model') ? this.parent : theMMSession.currentModel);
					return { name: s.name, formula: form, scale: s.scale || 1.0 };
				});
			}

			this.displayUnits = saved.displayUnits ? { ...saved.displayUnits } : {};

		}
		finally {
			this.isLoadingCase = false;
		}
	}

	/**
	 * @method displayTable
	 * @returns {Record<string, any>|null}
	 */
	displayTable() {
		const N = this.nStages || 10;
		const nComp = this.nComponents || 1;

		const tVals = new MMNumberValue(N, 1, [0, 0, 0, 0, 1, 0, 0]);
		if (this.T.length === N) tVals.values.set(this.T);

		const pVals = new MMNumberValue(N, 1, [-1, 1, -2, 0, 0, 0, 0]);
		if (this.P.length === N) pVals.values.set(this.P);

		const vVals = new MMNumberValue(N, 1, [0, 0, -1, 0, 0, 1, 0]);
		if (this.V.length === N) {
			vVals.values.set(this.V);
		}
		else {
			vVals.values.fill(NaN);
		}
		vVals.values[0] = NaN;

		const lVals = new MMNumberValue(N, 1, [0, 0, -1, 0, 0, 1, 0]);
		if (this.L.length === N) {
			lVals.values.set(this.L);
		}
		else {
			lVals.values.fill(NaN);
		}
		lVals.values[N - 1] = NaN;

		const qVals = new MMNumberValue(N, 1, [2, 1, -3, 0, 0, 0, 0]);
		if (this.Q.length === N) qVals.values.set(this.Q);

		const feedVals = new MMNumberValue(N, 1, [0, 0, -1, 0, 0, 1, 0]);
		feedVals.values.fill(NaN);
		if (this.f && this.f.length === N * nComp) {
			for (let j = 0; j < N; j++) {
				let stageFeed = 0.0;
				for (let i = 0; i < nComp; i++) {
					stageFeed += this.f[j * nComp + i];
				}
				if (stageFeed > 0) {
					feedVals.values[j] = stageFeed;
				}
			}
		}
		if (this.feeds && this.feeds.length > 0) {
			for (const feed of this.feeds) {
				const stg = feed.stage - 1;
				if (stg >= 0 && stg < N && isNaN(feedVals.values[stg])) {
					let fFlow = 0.0;
					const feedVal = feed.formula.value();
					const target = (feedVal instanceof MMToolValue && feedVal.valueCount > 0) ? feedVal.values[0] : feedVal;
					if (target && typeof target.valueDescribedBy === 'function') {
						let flowVal = target.valueDescribedBy('f') || target.valueDescribedBy('b.f') || target.valueDescribedBy('flow');
						if (flowVal instanceof MMNumberValue && flowVal.valueCount > 0) {
							fFlow = flowVal.values[0];
						}
					}
					if (fFlow <= 0.0 && target && target.flowFormula) {
						const fv = target.flowFormula.value();
						if (fv instanceof MMNumberValue && fv.valueCount > 0) {
							fFlow = fv.values[0];
						}
					}
					if (fFlow <= 0.0 && feedVal instanceof MMNumberValue && feedVal.valueCount > 0) {
						fFlow = feedVal.values[0];
					}
					if (fFlow > 0.0) {
						feedVals.values[stg] = (isNaN(feedVals.values[stg]) ? 0.0 : feedVals.values[stg]) + fFlow;
					}
				}
			}
		}

		const drawVals = new MMNumberValue(N, 1, [0, 0, -1, 0, 0, 1, 0]);
		drawVals.values.fill(NaN);
		const drawPrefixes = new Array(N).fill('');
		for (const d of this.draws) {
			if (this._totalCondenser && d.stage === 1 && d.phase === 'v' && d.isBasis) continue;
			const stg = d.stage - 1;
			if (stg < 0 || stg >= N) continue;
			let flow = d.flow;
			if (flow === undefined || isNaN(flow)) {
				if (d.isBasis) {
					if (d.phase === 'v' && this.V.length === N) flow = this.V[stg];
					else if (d.phase === 'l' && this.L.length === N) flow = this.L[stg];
				}
				if ((flow === undefined || isNaN(flow)) && d.flowEst) {
					const estVal = d.flowEst.value();
					if (estVal instanceof MMNumberValue && estVal.valueCount > 0) {
						flow = estVal.values[0];
					}
				}
			}
			if (flow !== undefined && !isNaN(flow)) {
				drawVals.values[stg] = (isNaN(drawVals.values[stg]) ? 0.0 : drawVals.values[stg]) + flow;
				const p = (d.phase || '').toUpperCase();
				if (p) {
					if (!drawPrefixes[stg]) {
						drawPrefixes[stg] = p;
					}
					else if (!drawPrefixes[stg].includes(p)) {
						drawPrefixes[stg] += ',' + p;
					}
				}
			}
		}

		const flowUnit = this.displayUnits['V'] || this.displayUnits['L'];
		const cols = [
			new MMTableValueColumn({ name: 'T', displayUnit: this.displayUnits['T'], value: tVals }),
			new MMTableValueColumn({ name: 'P', displayUnit: this.displayUnits['P'], value: pVals }),
			new MMTableValueColumn({ name: 'V', displayUnit: this.displayUnits['V'], value: vVals }),
			new MMTableValueColumn({ name: 'L', displayUnit: this.displayUnits['L'], value: lVals }),
			new MMTableValueColumn({ name: 'Q', displayUnit: this.displayUnits['Q'], value: qVals }),
			new MMTableValueColumn({ name: 'Feeds', displayUnit: this.displayUnits['Feeds'] || flowUnit, value: feedVals }),
			new MMTableValueColumn({ name: 'Draws', displayUnit: this.displayUnits['Draws'] || flowUnit, value: drawVals, prefixes: drawPrefixes })
		];

		const table = new MMTableValue({ columns: cols });
		return table.jsonValue();
	}

	/**
	 * @method toolViewInfo
	 * @override
	 * @param {MMCommand} command
	 */
	async toolViewInfo(command) {
		await super.toolViewInfo(command);
		this.ensureStageCount();
		const results = command.results;
		results['thermoFormula'] = this.thermoFormula.formula;
		results['stageCountFormula'] = this.stageCountFormula.formula;
		results['pTopFormula'] = this.pTopFormula.formula;
		results['pBottomFormula'] = this.pBottomFormula.formula;
		results['tTopEstFormula'] = this.tTopEstFormula.formula;
		results['tBotEstFormula'] = this.tBotEstFormula.formula;
		results['totalCondenser'] = this.totalCondenser;
		results['reboiler'] = this.reboiler;
		results['isSolved'] = this.isSolved;
		results['isInError'] = this.isInError;
		results['nStages'] = this.nStages;

		const totCond = this._totalCondenser ? 1 : 0;
		const numNonBasisDraws = this.draws.filter(d => !d.isBasis).length;
		const numInner = this.nStages - totCond + numNonBasisDraws;
		const numEnergyEquations = this._reboiler ? (this.nStages - 2) : (this.nStages - 1);
		results['requiredSpecs'] = Math.max(0, numInner - numEnergyEquations);

		results['feeds'] = this.feeds.map((f, idx) => ({
			index: idx + 1,
			stage: f.stage,
			name: f.name,
			formula: f.formula.formula
		}));

		results['draws'] = this.draws.map((d, idx) => ({
			index: idx + 1,
			stage: d.stage,
			phase: d.phase,
			name: d.name,
			isBasis: Boolean(d.isBasis),
			flowEstFormula: d.flowEst ? d.flowEst.formula : '',
			flowEstName: d.flowEst ? d.flowEst.name : `${d.name}_est`
		}));

		results['specs'] = this.specs.map((s, idx) => ({
			index: idx + 1,
			name: s.name,
			formula: s.formula.formula,
			scale: s.scale
		}));

		results.displayTable = this.displayTable();
		results['lastErrorKey'] = this.lastErrorKey;
		results['lastErrorArgs'] = this.lastErrorArgs;
	}
}
