/*
	This file is part of Math Minion, a javascript based calculation program
	Copyright 2021, Craig Morris

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

// would like this to be static class variable, but eslint complains, so for now...
var MMFlashPropertyDefinitions;

/**
 * Parses a Math Minion thermo definition string into component names and properties.
 * 
 * @param {string} input - Thermo string, e.g. "'1,1-dichloroethane,Water;massx'"
 * @returns {{ compounds: string[], properties: string[] }}
 */
function parseThermoDefinition(input) {
	if (!input || typeof input !== 'string') {
		return { compounds: [], properties: [] };
	}

	// Remove outer single/double quotes if the whole expression was passed as a literal
	let cleanInput = input.trim();
	if (
		(cleanInput.startsWith("'") && cleanInput.endsWith("'")) ||
		(cleanInput.startsWith('"') && cleanInput.endsWith('"'))
	) {
		cleanInput = cleanInput.slice(1, -1).trim();
	}

	const [compoundsPart, ...propsPart] = cleanInput.split(';');
	const propStr = propsPart.join(';');

	// Parse compounds: matches quoted strings or unquoted tokens delimited by non-digit commas
	const compounds = [];
	if (compoundsPart) {
		// Split on commas not surrounded by digits
		const rawTokens = compoundsPart.split(/(?<!\d),(?!\d)/);
		for (let token of rawTokens) {
			token = token.trim();
			// Strip optional quotes or brackets if present around the individual compound
			if (
				(token.startsWith('"') && token.endsWith('"')) ||
				(token.startsWith("'") && token.endsWith("'")) ||
				(token.startsWith('[') && token.endsWith(']'))
			) {
				token = token.slice(1, -1).trim();
			}
			if (token) {
				compounds.push(token);
			}
		}
	}

	const properties = propStr
		? propStr.split(',').map(s => s.trim()).filter(Boolean)
		: [];

	return { compounds, properties };
}

/**
 * @class MMFlashValue
 * @extends MMValue
 */
// eslint-disable-next-line no-unused-vars
class MMFlashPhaseValue extends MMValue {
	/**
	 * @constructor
	 * @param {Object} flash - the flash object this value represents
	 * @param {String} phase - one of 'b', 'l', 'v', 'l2'
	 */
	constructor(flash, phase) {
		super(0, 0);
		this.flash = flash;
		this.phase = phase;
	}

	valueDescribedBy(description, requestor) {
		let returnValue = null;
		if (description === 'thermo') {
			const thermoDefn = this.flash.thermoFormula.value();
			if (thermoDefn && thermoDefn instanceof MMStringValue && thermoDefn.valueCount > 0) {
				returnValue = MMStringValue.scalarValue(thermoDefn.values[0]);
			}
		}
		else if (description === 'fluids') {
			returnValue = this.flash.valueDescribedBy('fluids');
		}
		else {
			returnValue = this.flash.valueDescribedBy(this.phase + '.' + description);
		}
		if (returnValue && requestor) {
			this.flash.addRequestor(requestor);
		}
		return returnValue;
	}

	parameters() {
		return this.flash.parameters();
	}

	displayTable() {
		return this.flash.displayTable(this.phase);
	}

	/**
	 * @method htmlValue
	 * @returns {String}
	 */
	htmlValue(requestor) {
		let rv;
		const table = this.displayTable();
		if (!table) {
			return '<b>Flash not calculated</b>';
		}
		const lines = [];
		const maxColumn = table.nc;
		const maxRow = table.nr;
		lines.push('\n<table class="tvalue">');
		lines.push('\t<tr class="row0">');
		for (let column = 0; column < maxColumn; column++) {
			const header = table.v[column].name;
			lines.push(`\t\t<th class="col${column + 1}">${header}</th>`);
		}
		lines.push('\t</tr>');
		for (let row = 0; row < maxRow; row++) {
			lines.push(`<tr class="row${row + 1}">\n\t\t<th class="col0">${row}</th>`);
			for (let column = 0; column < maxColumn; column++) {
				try {
					const v = table.v[column].v.v[row];
					lines.push(`\t\t<td class="col${column + 1}">${v}</td>`);
				}
				catch (e) {
					lines.push(`\t\t<td class="col${column + 1}">???</td>`);
				}
			}
			lines.push('\t</tr>');
		}
		lines.push('</table>\n');
		rv = lines.join('\n');

		return rv;
	}
}

/**
 * @class MMFlash
 * @extends MMTool
 */
// eslint-disable-next-line no-unused-vars
class MMFlash extends MMTool {
	static createPropertyDefinitions() {
		MMFlashPropertyDefinitions = {
			q: {dim: [0, 0, 0, 0, 0, 0, 0]},										// vapour fraction
			t: {dim: [0, 0, 0, 0, 1, 0, 0]},										// temperature
			p: {dim: [-1, 1, -2, 0, 0, 0, 0]},									// pressure
			h: {dim: [2, 1, -2, 0, 0, -1, 0]},									// Mole-based enthalpy
			s: {dim: [2, 1, -2, 0, -1, -1, 0]},									// Mole-based entropy
			mwt: {dim: [0, 1, 0, 0, 0, -1, 0]},									// molecular weight
			cpmolar: {dim: [2, 1, -2, 0, -1, -1, 0]},							// Mole-based constant-pressure specific heat
			cp0molar: {dim: [2, 1, -2, 0, -1, -1, 0]},							// Mole-based ideal-gas constant-pressure specific heat
			cvmolar: {dim: [2, 1, -2, 0, -1, -1, 0]},							// Mole-based constant-volume specific heat
			dmolar: {dim: [-3, 0, 0, 0, 0, 1, 0]},								// Mole-based density
			umolar: {dim: [2, 1, -2, 0, 0, -1, 0]},								// Mole-based internal energy
			gmolar: {dim: [2, 1, -2, 0, 0, -1, 0]},								// Mole-based Gibbs energy
			cpmass: {dim: [2, 0, -2, 0, -1, 0, 0]},								// Mass-based constant-pressure specific heat
			cp0mass: {dim: [2, 0, -2, 0, -1, 0, 0]},							// Mass-based ideal-gas constant-pressure specific heat
			cvmass: {dim: [2, 0, -2, 0, -1, 0, 0]},								// Mass-based constant-volume specific heat
			dmass: {dim: [-3, 1, 0, 0, 0, 0, 0]},								// Mass-based density
			umass: {dim: [2, 0, -2, 0, 0, 0, 0]},								// Mass-based internal energy
			gmass: {dim: [2, 0, -2, 0, 0, 0, 0]},								// Mass-based Gibbs energy
			tmin: {dim: [0, 0, 0, 0, 1, 0, 0]},									// Minimum temperature
			tmax: {dim: [0, 0, 0, 0, 1, 0, 0]},									// Maximum temperature
			pmin: {dim: [-1, 1, -2, 0, 0, 0, 0]},								// Minimum pressure
			pmax: {dim: [-1, 1, -2, 0, 0, 0, 0]},								// Maximum pressure
			viscosity: {dim: [-1, 1, -1, 0, 0, 0, 0]},							// viscosity
			conductivity: {dim: [1, 1, -3, 0, -1, 0, 0]},						// Thermal conductivity
			surfacetension: {dim: [0, 1, -2, 0, 0, 0, 0]},						// surface tension
			prandtl: {dim: [0, 0, 0, 0, 0, 0, 0]}								// Prandtl number
		};
	}

	/**
	 * isPropertyType returns true if property dimensions matches type
	 * @param {MMNumberValue} property 
	 * @param {String} type - index into property definitions
	 * @returns {boolean}
	 */
	static isPropertyType(property, type) {
		const def = MMFlashPropertyDefinitions[type.toLowerCase()];
		if (property && def) {
			return MMUnitSystem.areDimensionsEqual(property.unitDimensions, def.dim);
		}
		return false;
	}

	/**
	 * propertyTypeForCPType returns the property type for a given type name
	 * @param {String} cpType
	 * @returns {String} property type
	 */
	static propertyTypeForCPType(cpType) {
		const cpTypes = {
			'q': 'Dimensionless',
			't': 'Temperature',
			'p': 'Pressure',
			'f': 'MoleFlow',
			'h': 'MolarEnthalpy',
			's': 'MolarSpecificHeat',
			'dmolar': 'MolarConcentration',
			'mwt': 'MolecularWeight',
			'x': 'Dimensionless',
			'massf': 'MassFlow',
			'massx': 'Dimensionless',
			'hflow': 'Power',
			'cpmolar': 'MolarSpecificHeat',
			'cp0molar': 'MolarSpecificHeat',
			'cvmolar': 'MolarSpecificHeat',
			'umolar': 'MolarEnthalpy',
			'gmolar': 'MolarEnthalpy',
			'cpmass': 'MassSpecificHeat',
			'cp0mass': 'MassSpecificHeat',
			'cvmass': 'MassSpecificHeat',
			'dmass': 'Density',
			'umass': 'MassEnthalpy',
			'gmass': 'MassEnthalpy',
			'tmin': 'Temperature',
			'tmax': 'Temperature',
			'pmin': 'Pressure',
			'pmax': 'Pressure',
			'viscosity': 'Viscosity',
			'conductivity': 'ThermalConductivity',
			'surfacetension': 'SurfaceTension',
			'prandtl': 'Dimensionless'
		};
		return cpTypes[cpType] || 'Dimensionless';
	}

	/**
	 * @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Flash');
		this.thermoFormula = new MMFormula('thermoFormula', this);
		this.thermoPkg = null;
		this.firstPropertyFormula = new MMFormula('firstPropFormula', this);
		this.secondPropertyFormula = new MMFormula('secondPropFormula', this);
		this.moleFracFormula = new MMFormula('moleFracFormula', this);
		this.massFracFormula = new MMFormula('massFracFormula', this);
		this.flowFormula = new MMFormula('flowFormula', this);
		this.additionalProperties = [];
		this.formatStrings = this.defaultFormatStrings();
		this.displayUnits = [];
	}

	defaultFormatStrings() {
		return {
			't': '.2f',
			'p': '.2f',
			'f': '.2f',
			'h': '.2f',
			's': '.2f',
			'dmolar': '.2f'
		};
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['setpropunit'] = this.setPropUnitCommand;
		verbs['setpropformat'] = this.setPropFormatCommand;
		return verbs;
	}

	/**
	 * @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			setpropunit: 'mmcmd:_flashSetPropUnit',
			setpropformat: 'mmcmd:_flashSetPropFormat',
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}

	/**
	 * @method setPropUnitCommand
	 * @param {MMCommand} command
	 */
	setPropUnitCommand(command) {
		const parts = command.args.split(/\s/);
		if (parts.length === 2) {
			const propName = parts[0];
			for (let i = 0; i < this.propList.length; i++) {
				if (this.propList[i] === propName) {
					this.displayUnits[i + 1] = parts[1];
					break;
				}
			}
			this.forgetCalculated();
			command.results = parts[1];
		}
	}

	/**
	 * @method setPropFormatCommand
	 * @param {MMCommand} command
	 */
	setPropFormatCommand(command) {
		const parts = command.args.split(/\s/);
		if (parts.length > 0) {
			const propName = parts[0];
			for (let i = 0; i < this.propList.length; i++) {
				if (this.propList[i] === propName) {
					this.formatStrings[propName] = parts[1] || '';
					break;
				}
			}
			this.forgetCalculated();
			command.results = parts[1];
		}
	}

	/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o = super.saveObject();
		o['Type'] = 'Flash';
		o['thermo'] = {Formula: this.thermoFormula.formula};
		o['firstprop'] = {Formula: this.firstPropertyFormula.formula};
		o['secondprop'] = {Formula: this.secondPropertyFormula.formula};
		o['molefrac'] = {Formula: this.moleFracFormula.formula};
		o['massfrac'] = {Formula: this.massFracFormula.formula};
		o['flow'] = {Formula: this.flowFormula.formula};
		o['displayUnits'] = this.displayUnits;
		o['formatStrings'] = this.formatStrings;

		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		this.isLoadingCase = true;
		try {
			super.initFromSaved(saved);
			this.thermoFormula.formula = saved.thermo.Formula;
			this.firstPropertyFormula.formula = saved.firstprop.Formula;
			this.secondPropertyFormula.formula = saved.secondprop.Formula;
			this.moleFracFormula.formula = saved.molefrac.Formula;
			this.massFracFormula.formula = saved.massfrac.Formula;
			this.flowFormula.formula = saved.flow.Formula;
			this.displayUnits = saved.displayUnits || [];
			this.formatStrings = (!saved.formatStrings || Array.isArray(saved.formatStrings)) ? this.defaultFormatStrings() : saved.formatStrings;
		}
		finally {
			this.isLoadingCase = false;
		}
	}

	/**
	 * @method parameters
	 */
	parameters() {
		let p = super.parameters();
		if (!MMFlashPropertyDefinitions) {
			MMFlash.createPropertyDefinitions();
		}
		p.push('b');
		p.push('v');
		p.push('l');
		p.push('l2');
		p.push('thermo');
		p.push('envelope');
		p.push('fluids');
		p.push('f');
		p.push('massf');
		p.push('x');
		p.push('massx');
		p.push('fugacities');
		for (const propName of Object.keys(MMFlashPropertyDefinitions)) {
			p.push(propName);
		}
		return p;
	}

	/**
	 * @override forgetCalculated
	 */
	forgetCalculated() {
		if (!this.forgetRecursionBlockIsOn) {
			this.forgetRecursionBlockIsOn = true;
			try {
				for (let requestor of this.valueRequestors) {
					requestor.forgetCalculated();
				}
				this.valueRequestors.clear();
				super.forgetCalculated();
				this.thermoDefn = null;
				this.thermoPkg = null;
				this.componentString = null;
				this.nComponents = null;
				this.componentNames = null;
				this.compounds = null;
				this.eos = null;
				this.engine = null;
				this.additionalProperties = [];
				this.mwts = null;
				this.flashResults = null;
				this.firstProperty = null;
				this.firstPropertyType = null;
				this.secondProperty = null;
				this.secondPropertyType = null;
				this.flow = null;
				this.moleX = null;
				this.massX = null;
				this.propList = null;
			}
			finally {
				this.forgetRecursionBlockIsOn = false;
			}
		}
	}

	/**
	 * @method inputSources
	 * @override
	 * @returns {Set} contains tools referenced by this tool
	 */
	inputSources() {
		let sources = super.inputSources();
		this.thermoFormula.addInputSourcesToSet(sources);
		this.firstPropertyFormula.addInputSourcesToSet(sources);
		this.secondPropertyFormula.addInputSourcesToSet(sources);
		this.moleFracFormula.addInputSourcesToSet(sources);
		this.massFracFormula.addInputSourcesToSet(sources);
		this.flowFormula.addInputSourcesToSet(sources);
		return sources;
	}

	/**
	 * @override valueDescribedBy
	 * @param {String} description
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueDescribedBy(description, requestor) {
		if (!description) {
			return super.valueDescribedBy(description, requestor);
		}
		if (!MMFlashPropertyDefinitions) {
			MMFlash.createPropertyDefinitions();
		}

		const thermoEngine = (typeof self !== 'undefined' ? self.thermo : null) || (typeof thermo !== 'undefined' ? thermo : null);
		const lcDescription = description.toLowerCase();

		if (lcDescription === 'fluids') {
			if (thermoEngine && thermoEngine.defaultRegistry) {
				thermoEngine.defaultRegistry.loadAll();
				const fluidsList = MMStringValue.stringArrayValue(thermoEngine.defaultRegistry.all().map(c => c.name));
				this.addRequestor(requestor);
				return fluidsList;
			}
			return null;
		}

		if (!this.thermoDefn) {
			this.thermoDefn = this.thermoFormula.value();
		}

		if (!this.thermoPkg || !this.componentString || !this.engine) {
			const thermoDefn = this.thermoFormula.value();
			if (thermoDefn && thermoDefn instanceof MMStringValue && thermoDefn.valueCount > 0) {
				this.thermoDefn = thermoDefn;
				const cleanThermo = thermoDefn.values[0].replace(/^['"`]+|['"`]+$/g, '').trim();
				const phaseSplit = cleanThermo.split('@');
				if (phaseSplit.length > 1) {
					this.imposedPhase = phaseSplit[1].trim().toLowerCase();
				}

				const pkgSplit = phaseSplit[0].split('::');
				if (pkgSplit.length > 1) {
					this.thermoPkg = pkgSplit.shift().trim();
				}
				else {
					this.thermoPkg = 'PR';
				}
				const parsed = parseThermoDefinition(pkgSplit.join('::'));
				this.componentNames = parsed.compounds;
				this.nComponents = this.componentNames.length;
				this.componentString = this.componentNames.join(',');
				this.additionalProperties = parsed.properties;

				if (thermoEngine && thermoEngine.defaultRegistry) {
					thermoEngine.defaultRegistry.loadAll();
					const compounds = [];
					for (const cName of this.componentNames) {
						let comp = thermoEngine.defaultRegistry.get(cName);
						if (!comp) {
							this.setError('mmcool:flashThermoDefnError', {path: this.getPath()});
							return null;
						}
						compounds.push(comp);
					}
					this.compounds = compounds;
					this.mwts = compounds.map(c => c.mw * 1000); // g/mol for mass fraction conversions
					this.eos = new thermoEngine.PengRobinson(compounds);
					this.engine = new thermoEngine.FlashEngine(this.eos);
				}
			}
		}

		const descParts = lcDescription.split('.');
		let phase = descParts.shift();
		let property = descParts.shift();

		if (phase === 'thermo' || property === 'thermo') {
			if (this.thermoDefn) {
				this.addRequestor(requestor);
			}
			return this.thermoDefn;
		}

		if (phase === 'fluids' || property === 'fluids') {
			if (thermoEngine && thermoEngine.defaultRegistry) {
				thermoEngine.defaultRegistry.loadAll();
				const fluidsList = MMStringValue.stringArrayValue(thermoEngine.defaultRegistry.all().map(c => c.name));
				this.addRequestor(requestor);
				return fluidsList;
			}
			return null;
		}

		if (!property && phase !== 'envelope') {
			const phaseSet = new Set(['b', 'v', 'l', 'l2']);
			if (phaseSet.has(phase)) {
				this.addRequestor(requestor);
				return new MMFlashPhaseValue(this, phase);
			}
			property = phase;
			phase = 'b';
		}

		if (!this.moleX) {
			this.moleX = this.moleFracFormula.value();
			if (!this.moleX && this.nComponents === 1) {
				this.moleX = MMNumberValue.scalarValue(1);
			}
			if (this.moleX) {
				this.moleX = this.moleX.divideBy(this.moleX.sum());
			}
		}
		if (!this.massX) {
			this.massX = this.massFracFormula.value();
			if (!this.massX && this.nComponents === 1) {
				this.massX = MMNumberValue.scalarValue(1);
			}
			if (this.massX) {
				this.massX = this.massX.divideBy(this.massX.sum());
			}
		}

		if (phase === 'b') {
			if (property === 'x') {
				if (!this.moleX && this.massX && this.mwts) {
					const x = MMNumberValue.numberArrayValue(this.convertMassFracToMole(this.massX.values));
					if (x) {
						this.addRequestor(requestor);
					}
					return x;
				}
				if (this.moleX) {
					this.addRequestor(requestor);
				}
				return this.moleX;
			}
			else if (property === 'massx') {
				if (this.moleX && !this.massX && this.mwts) {
					const x = MMNumberValue.numberArrayValue(this.convertMoleFracToMass(this.moleX.values));
					if (x) {
						this.addRequestor(requestor);
					}
					return x;
				}
				if (this.massX) {
					this.addRequestor(requestor);
				}
				return this.massX;
			}
		}
		else {
			if (!this.moleX && !this.massX) {
				return null;
			}
		}

		if (phase === 'envelope') {
			const envelope = this.envelope();
			if (envelope) {
				this.addRequestor(requestor);
				if (property) {
					return envelope.valueForIndexRowColumn(MMNumberValue.scalarValue(0), MMStringValue.scalarValue(property));
				}
			}
			return envelope;
		}

		if (!this.flashResults) {
			this.flash();
		}
		if (this.flashResults) {
			if (phase) {
				const resultPhase = this.flashResults[phase];
				if (resultPhase) {
					let prop = resultPhase[property];
					if (!prop && (property === 'f' || property === 'massf' || property === 'hflow')) {
						this.calculateFlows();
						prop = resultPhase[property];
					}
					if (prop) {
						this.addRequestor(requestor);
					}
					return prop;
				}
			}
		}
		else if (!phase || phase === 'b') {
			// get any input information
			let returnValue;
			switch (property) {
				case 'x':
					if (!this.moleX && this.massX && this.mwts) {
						returnValue = MMNumberValue.numberArrayValue(this.convertMassFracToMole(this.massX.values));
					}
					else {
						returnValue = this.moleX;
					}
					break;
				case 'massx':
					if (this.moleX && !this.massX && this.mwts) {
						returnValue = MMNumberValue.numberArrayValue(this.convertMoleFracToMass(this.moleX.values));
					}
					else {
						returnValue = this.massX;
					}
					break;
				case 'f': {
					if (!this.flow) { this.flow = this.flowFormula.value(); }
					if (this.flow && MMUnitSystem.areDimensionsEqual(this.flow.unitDimensions, [0, 0, -1, 0, 0, 1, 0])) {
						returnValue = this.flow;
					}
				}
					break;
				case 'massf': {
					if (!this.flow) { this.flow = this.flowFormula.value(); }
					if (this.flow && MMUnitSystem.areDimensionsEqual(this.flow.unitDimensions, [0, 1, -1, 0, 0, 0, 0])) {
						returnValue = this.flow;
					}
				}
					break;
				default: {
					if (!this.firstProperty) {
						this.firstProperty = this.firstPropertyFormula.value();
					}
					if (MMFlash.isPropertyType(this.firstProperty, property)) {
						returnValue = this.firstProperty;
					}
					else {
						if (!this.secondProperty) {
							this.secondProperty = this.secondPropertyFormula.value();
						}
						if (MMFlash.isPropertyType(this.secondProperty, property)) {
							returnValue = this.secondProperty;
						}
					}
				}
			}
			if (returnValue) {
				this.addRequestor(requestor);
				if (phase === 'b') {
					return returnValue;
				}
				else {
					const columns = [];
					columns.push(new MMTableValueColumn({name: 'b', value: returnValue}));
					return new MMTableValue({columns: columns});
				}
			}
		}
	}

	calculateFlows() {
		if (!this.flow) {
			this.flow = this.flowFormula.value();
		}
		if (!this.flow) {
			return;
		}
		const f = this.flow;
		const results = this.flashResults;
		if (results) {
			const fracV = results.v && results.v.phaseFraction !== undefined ? results.v.phaseFraction : Math.max(0.0, Math.min(1.0, results.b.q ? results.b.q.values[0] : 0.0));
			const fracL = results.l && results.l.phaseFraction !== undefined ? results.l.phaseFraction : (1.0 - fracV);
			const fracL2 = results.l2 && results.l2.phaseFraction !== undefined ? results.l2.phaseFraction : 0.0;

			const q = MMNumberValue.scalarValue(fracV);
			const fracLVal = MMNumberValue.scalarValue(fracL);
			const fracL2Val = MMNumberValue.scalarValue(fracL2);

			if (MMUnitSystem.areDimensionsEqual(f.unitDimensions, [0, 0, -1, 0, 0, 1, 0])) {
				results.b.f = f;
				results.b.massf = f.multiply(results.b.mwt);
				if (results.b.h) {
					results.b.hflow = f.multiply(results.b.h);
				}
				if (results.v) {
					results.v.f = f.multiply(q);
					results.v.massf = results.v.f.multiply(results.v.mwt);
					if (results.v.h) {
						results.v.hflow = results.v.h.multiply(results.v.f);
					}
				}
				if (results.l) {
					results.l.f = f.multiply(fracLVal);
					results.l.massf = results.l.f.multiply(results.l.mwt);
					if (results.l.h) {
						results.l.hflow = results.l.h.multiply(results.l.f);
					}
				}
				if (results.l2) {
					results.l2.f = f.multiply(fracL2Val);
					results.l2.massf = results.l2.f.multiply(results.l2.mwt);
					if (results.l2.h) {
						results.l2.hflow = results.l2.h.multiply(results.l2.f);
					}
				}
			}
			else if (MMUnitSystem.areDimensionsEqual(f.unitDimensions, [0, 1, -1, 0, 0, 0, 0])) {
				const molarF = f.divideBy(results.b.mwt);
				results.b.massf = f;
				results.b.f = molarF;
				if (results.b.h) {
					results.b.hflow = molarF.multiply(results.b.h);
				}
				if (results.v) {
					results.v.f = molarF.multiply(q);
					results.v.massf = results.v.f.multiply(results.v.mwt);
					if (results.v.h) {
						results.v.hflow = results.v.h.multiply(results.v.f);
					}
				}
				if (results.l) {
					results.l.f = molarF.multiply(fracLVal);
					results.l.massf = results.l.f.multiply(results.l.mwt);
					if (results.l.h) {
						results.l.hflow = results.l.h.multiply(results.l.f);
					}
				}
				if (results.l2) {
					results.l2.f = molarF.multiply(fracL2Val);
					results.l2.massf = results.l2.f.multiply(results.l2.mwt);
					if (results.l2.h) {
						results.l2.hflow = results.l2.h.multiply(results.l2.f);
					}
				}
			}
			else {
				this.setError('mmcool:flashBadFlowUnit', {path: this.getPath()});
				this.flow = null;
			}
		}
	}

	convertMassFracToMole(massFracs) {
		const moleFracs = [];
		let sum = 0;
		for (let i = 0; i < this.nComponents; i++) {
			const moleFrac = Math.max(0, massFracs[i]) / this.mwts[i];
			sum += moleFrac;
			moleFracs.push(moleFrac);
		}
		if (sum > 0) {
			for (let i = 0; i < this.nComponents; i++) {
				moleFracs[i] /= sum;
			}
		}
		return moleFracs;
	}

	convertMoleFracToMass(moleFracs) {
		const massFracs = [];
		let sum = 0;
		for (let i = 0; i < this.nComponents; i++) {
			const massFrac = Math.max(0, moleFracs[i]) * this.mwts[i];
			sum += massFrac;
			massFracs.push(massFrac);
		}
		if (sum > 0) {
			for (let i = 0; i < this.nComponents; i++) {
				massFracs[i] /= sum;
			}
		}
		return massFracs;
	}

	/**
	 * flash - executes flash calculation using thermo package
	 */
	flash() {
		if (!MMFlashPropertyDefinitions) {
			MMFlash.createPropertyDefinitions();
		}

		if (!this.thermoPkg || !this.componentString || !this.engine || !this.eos) {
			return;
		}
		if (!this.firstProperty) {
			this.firstProperty = this.firstPropertyFormula.value();
		}
		if (this.firstProperty) {
			if (MMFlash.isPropertyType(this.firstProperty, 't')) {
				this.firstPropertyType = 'T';
			}
			else if (MMFlash.isPropertyType(this.firstProperty, 'p')) {
				this.firstPropertyType = 'P';
			}
			else if (MMFlash.isPropertyType(this.firstProperty, 'dmolar')) {
				this.firstPropertyType = 'DMolar';
			}
			else {
				this.setError('mmcool:flashFirstPropNotTorPorD', {path: this.getPath()});
				this.firstProperty = null;
			}
		}
		if (!this.secondProperty) {
			this.secondProperty = this.secondPropertyFormula.value();
		}

		if (this.secondProperty) {
			if (MMFlash.isPropertyType(this.secondProperty, 't')) {
				this.secondPropertyType = 'T';
			}
			else if (MMFlash.isPropertyType(this.secondProperty, 'p')) {
				this.secondPropertyType = 'P';
			}
			else if (MMFlash.isPropertyType(this.secondProperty, 'q')) {
				this.secondPropertyType = 'Q';
			}
			else if (MMFlash.isPropertyType(this.secondProperty, 'h')) {
				this.secondPropertyType = 'H';
			}
			else if (MMFlash.isPropertyType(this.secondProperty, 's')) {
				this.secondPropertyType = 'S';
			}
			else {
				this.setError('mmcool:flashInvalidSecondPropType', {path: this.getPath()});
				this.secondProperty = null;
				this.secondPropertyType = null;
			}
		}

		if (this.firstProperty && this.firstPropertyType === this.secondPropertyType) {
			this.setError('mmcool:flashDuplicatePropTypes', {path: this.getPath()});
			this.secondProperty = null;
			this.secondPropertyType = null;
		}

		if (
			!this.firstProperty ||
			!this.secondProperty ||
			!(this.moleX || this.massX)
		) {
			return; // not enough information
		}

		const thermoEngine = (typeof self !== 'undefined' ? self.thermo : null) || (typeof thermo !== 'undefined' ? thermo : null);
		if (!thermoEngine) {
			return;
		}

		let usingMoleFracs = true;
		let z = [];
		if (this.moleX && this.moleX instanceof MMNumberValue && this.moleX.valueCount > 0) {
			if (this.moleX.valueCount !== this.nComponents) {
				this.setError('mmcool:flashWrongCmpCount', {path: this.getPath()});
				return;
			}
			z = Array.from(this.moleX.values).map(v => Math.max(0, v));
			let sumZ = z.reduce((a, b) => a + b, 0);
			if (sumZ > 0) z = z.map(v => v / sumZ);
		}
		else if (this.massX && this.massX instanceof MMNumberValue && this.massX.valueCount > 0) {
			if (this.massX.valueCount !== this.nComponents) {
				this.setError('mmcool:flashWrongCmpCount', {path: this.getPath()});
				return;
			}
			z = this.convertMassFracToMole(this.massX.values);
			usingMoleFracs = false;
		}
		else {
			return;
		}

		let spec = null;
		const val1 = this.firstProperty.values[0];
		const val2 = this.secondProperty.values[0];

		if (this.firstPropertyType === 'T') {
			if (this.secondPropertyType === 'P') {
				spec = { type: thermoEngine.FlashType.TP, T: val1, P: val2 };
			}
			else if (this.secondPropertyType === 'Q') {
				spec = { type: thermoEngine.FlashType.TQ, T: val1, Q: val2 };
			}
			else if (this.secondPropertyType === 'H') {
				spec = { type: thermoEngine.FlashType.TH, T: val1, H: val2 };
			}
			else if (this.secondPropertyType === 'S') {
				spec = { type: thermoEngine.FlashType.TS, T: val1, S: val2 };
			}
		}
		else if (this.firstPropertyType === 'P') {
			if (this.secondPropertyType === 'T') {
				spec = { type: thermoEngine.FlashType.TP, T: val2, P: val1 };
			}
			else if (this.secondPropertyType === 'Q') {
				spec = { type: thermoEngine.FlashType.PQ, P: val1, Q: val2 };
			}
			else if (this.secondPropertyType === 'H') {
				spec = { type: thermoEngine.FlashType.PH, P: val1, H: val2 };
			}
			else if (this.secondPropertyType === 'S') {
				spec = { type: thermoEngine.FlashType.PS, P: val1, S: val2 };
			}
		}
		else if (this.firstPropertyType === 'DMolar') {
			// Single component density flash
			if (this.secondPropertyType === 'T') {
				const T = val2;
				const dmolar = val1;
				const vCorr = 1.0 / dmolar;
				const ws = this.eos.workspace;
				const mix = this.eos.calculateMixtureParams(T, z, ws.mixtureParams, ws);
				const vUntrans = Math.max(mix.b * 1.001, vCorr + mix.c);
				const RT = thermoEngine.R_GAS * T;
				const P = (RT / (vUntrans - mix.b)) - (mix.a / (vUntrans * vUntrans + 2.0 * mix.b * vUntrans - mix.b * mix.b));
				spec = { type: thermoEngine.FlashType.TP, T: T, P: Math.max(100.0, P) };
			}
			else if (this.secondPropertyType === 'P') {
				const P = val2;
				const dmolar = val1;
				// Initial temperature estimate using ideal gas law
				let T = (P / (dmolar * thermoEngine.R_GAS));
				T = Math.max(50.0, Math.min(2000.0, T));
				spec = { type: thermoEngine.FlashType.TP, T: T, P: P };
			}
		}

		if (!spec) {
			return;
		}

		try {
			if (this.processor && this.processor.statusCallBack) {
				this.processor.showStatus(this.t(`flash ${this.getPath()}`));
			}
			const options = {enable3PhaseWater: true};
			if (this.imposedPhase) {
				if (this.imposedPhase === 'liquid' || this.imposedPhase === 'supercritical_liquid') {
					options.enable3PhaseWater = false;
				}
			}

			const flashResult = this.engine.flash(spec, z, options);
			if (flashResult && !flashResult.converged) {
				this.setError('mmcool:flashFailed', {
					path: this.getPath(),
					msg: `Calculation did not converge t=${flashResult.T-273.15}, p=${flashResult.P/1000}`
				});
				return;
			}
			this.flashResults = this.getFlashResults(flashResult, usingMoleFracs);
			this.calculateFlows();
		}
		catch (e) {
			const msg = e.message || '';
			this.setError('mmcool:flashFailed', {
				path: this.getPath(),
				msg: msg
			});
		}
		finally {
			if (this.processor && this.processor.statusCallBack) {
				this.processor.showStatus(this.t('mmcmd:calculating'));
			}
		}
	}

	/**
	 * Helper method to calculate transport, caloric, and derivative properties for a phase
	 */
	calculatePhaseProperties(phaseData, phaseZ, T, P, isVapor, qValue) {
		const thermoEngine = (typeof self !== 'undefined' ? self.thermo : null) || (typeof thermo !== 'undefined' ? thermo : null);
		const props = {};
		const N = this.nComponents;

		props.q = MMNumberValue.scalarValue(qValue);
		props.t = MMNumberValue.scalarValue(T, [0, 0, 0, 0, 1, 0, 0]);
		props.p = MMNumberValue.scalarValue(P, [-1, 1, -2, 0, 0, 0, 0]);
		props.h = MMNumberValue.scalarValue(phaseData.enthalpy, [2, 1, -2, 0, 0, -1, 0]);
		props.s = MMNumberValue.scalarValue(phaseData.entropy, [2, 1, -2, 0, -1, -1, 0]);
		props.dmolar = MMNumberValue.scalarValue(phaseData.molarDensity, [-3, 0, 0, 0, 0, 1, 0]);
		props.dmass = MMNumberValue.scalarValue(phaseData.massDensity, [-3, 1, 0, 0, 0, 0, 0]);
		props.mwt = MMNumberValue.scalarValue(phaseData.mw, [0, 1, 0, 0, 0, -1, 0]);

		const umolar = phaseData.enthalpy - P * phaseData.molarVolume;
		props.umolar = MMNumberValue.scalarValue(umolar, [2, 1, -2, 0, 0, -1, 0]);
		props.gmolar = MMNumberValue.scalarValue(phaseData.gibbs, [2, 1, -2, 0, 0, -1, 0]);
		props.umass = MMNumberValue.scalarValue(umolar / phaseData.mw, [2, 0, -2, 0, 0, 0, 0]);
		props.gmass = MMNumberValue.scalarValue(phaseData.gibbs / phaseData.mw, [2, 0, -2, 0, 0, 0, 0]);

		// Ideal gas heat capacity Cp0
		let cp0 = 0.0;
		let tMinOverall = 50.0;
		let tMaxOverall = 2000.0;
		for (let i = 0; i < N; i++) {
			const comp = this.compounds[i];
			if (comp) {
				if (comp.cpIdeal) {
					cp0 += phaseZ[i] * thermoEngine.evaluateDippr(comp.cpIdeal, T);
					if (comp.cpIdeal.tMin && comp.cpIdeal.tMin > tMinOverall) tMinOverall = comp.cpIdeal.tMin;
					if (comp.cpIdeal.tMax && comp.cpIdeal.tMax < tMaxOverall) tMaxOverall = comp.cpIdeal.tMax;
				}
			}
		}
		props.cp0molar = MMNumberValue.scalarValue(cp0, [2, 1, -2, 0, -1, -1, 0]);
		props.cp0mass = MMNumberValue.scalarValue(cp0 / phaseData.mw, [2, 0, -2, 0, -1, 0, 0]);

		// Real fluid constant-pressure heat capacity Cp via numerical enthalpy derivative dH/dT|_P
		const dT = 0.01;
		const Tplus = T + dT;
		const Tminus = T - dT;
		const zFactorsPlus = new Float64Array(2);
		const zFactorsMinus = new Float64Array(2);
		this.eos.calculateZFactors(Tplus, P, phaseZ, zFactorsPlus);
		this.eos.calculateZFactors(Tminus, P, phaseZ, zFactorsMinus);
		const zFPlus = isVapor ? zFactorsPlus[1] : zFactorsPlus[0];
		const zFMinus = isVapor ? zFactorsMinus[1] : zFactorsMinus[0];
		const hDepPlus = this.eos.calculateDepartures(Tplus, P, phaseZ, zFPlus).hDep;
		const hDepMinus = this.eos.calculateDepartures(Tminus, P, phaseZ, zFMinus).hDep;
		const hIdealPlus = thermoEngine.calculateIdealGasEnthalpy(this.compounds, phaseZ, Tplus);
		const hIdealMinus = thermoEngine.calculateIdealGasEnthalpy(this.compounds, phaseZ, Tminus);
		const cpmolarVal = Math.max(cp0, ((hIdealPlus + hDepPlus) - (hIdealMinus + hDepMinus)) / (2.0 * dT));

		props.cpmolar = MMNumberValue.scalarValue(cpmolarVal, [2, 1, -2, 0, -1, -1, 0]);
		props.cpmass = MMNumberValue.scalarValue(cpmolarVal / phaseData.mw, [2, 0, -2, 0, -1, 0, 0]);

		// Constant-volume heat capacity Cv
		const cvmolarVal = Math.max(cpmolarVal - thermoEngine.R_GAS, 0.0);
		props.cvmolar = MMNumberValue.scalarValue(cvmolarVal, [2, 1, -2, 0, -1, -1, 0]);
		props.cvmass = MMNumberValue.scalarValue(cvmolarVal / phaseData.mw, [2, 0, -2, 0, -1, 0, 0]);

		props.tmin = MMNumberValue.scalarValue(tMinOverall, [0, 0, 0, 0, 1, 0, 0]);
		props.tmax = MMNumberValue.scalarValue(tMaxOverall, [0, 0, 0, 0, 1, 0, 0]);
		props.pmin = MMNumberValue.scalarValue(1000.0, [-1, 1, -2, 0, 0, 0, 0]);
		props.pmax = MMNumberValue.scalarValue(1e8, [-1, 1, -2, 0, 0, 0, 0]);

		// Dynamic viscosity
		let visc = 0.0;
		for (let i = 0; i < N; i++) {
			const comp = this.compounds[i];
			if (comp) {
				const viscCorr = isVapor ? comp.vaporViscosity : comp.liquidViscosity;
				if (viscCorr) {
					visc += phaseZ[i] * thermoEngine.evaluateDippr(viscCorr, T, comp.tc);
				}
			}
		}
		if (visc <= 0.0) {
			visc = isVapor ? 1.5e-5 : 1e-3;
		}
		props.viscosity = MMNumberValue.scalarValue(visc, [-1, 1, -1, 0, 0, 0, 0]);

		// Thermal conductivity
		let cond = 0.0;
		for (let i = 0; i < N; i++) {
			const comp = this.compounds[i];
			if (comp && comp.thermalConductivity) {
				cond += phaseZ[i] * thermoEngine.evaluateDippr(comp.thermalConductivity, T, comp.tc);
			}
		}
		if (cond <= 0.0) {
			cond = isVapor ? 0.025 : 0.15;
		}
		props.conductivity = MMNumberValue.scalarValue(cond, [1, 1, -3, 0, -1, 0, 0]);

		// Surface tension
		let st = 0.0;
		if (!isVapor) {
			for (let i = 0; i < N; i++) {
				const comp = this.compounds[i];
				if (comp && comp.surfaceTension) {
					st += phaseZ[i] * thermoEngine.evaluateDippr(comp.surfaceTension, T, comp.tc);
				}
			}
		}
		props.surfacetension = MMNumberValue.scalarValue(st, [0, 1, -2, 0, 0, 0, 0]);

		// Prandtl number
		const pr = (visc * (cpmolarVal / phaseData.mw)) / Math.max(1e-6, cond);
		props.prandtl = MMNumberValue.scalarValue(pr, [0, 0, 0, 0, 0, 0, 0]);

		// Mole and mass fraction arrays
		props.x = MMNumberValue.numberArrayValue(phaseZ);
		props.massx = MMNumberValue.numberArrayValue(this.convertMoleFracToMass(phaseZ));

		// Fugacities
		const fugs = [];
		for (let i = 0; i < N; i++) {
			if (phaseData.lnPhi && phaseData.lnPhi[i] !== undefined) {
				fugs.push(phaseZ[i] * P * Math.exp(phaseData.lnPhi[i]));
			}
			else {
				fugs.push(phaseZ[i] * P);
			}
		}
		props.fugacities = MMNumberValue.numberArrayValue(fugs, [-1, 1, -2, 0, 0, 0, 0]);

		return props;
	}

	getFlashResults(flashResult, usingMoleFracs) {
		const T = flashResult.T;
		const P = flashResult.P;
		const beta = flashResult.beta;
		const thermoEngine = (typeof self !== 'undefined' ? self.thermo : null) || (typeof thermo !== 'undefined' ? thermo : null);

		this.propList = ['q', 't', 'p', 'f', 'h', 's', 'dmolar', 'mwt', 'x'].concat(this.additionalProperties);

		const bulkZ = this.moleX ? this.moleX.values : this.convertMassFracToMole(this.massX.values);
		const bulkProps = this.calculatePhaseProperties(flashResult.bulk, bulkZ, T, P, beta >= 0.5, beta);

		const result = { b: bulkProps };

		const liq2 = flashResult.liquid2 || flashResult.liquidPhase2;
		const hasL2 = !!(liq2 && ((liq2.beta !== undefined && liq2.beta > 1e-9) || (flashResult.betaL2 !== undefined && flashResult.betaL2 > 1e-9)));

		let betaV = flashResult.vapor ? flashResult.vapor.beta : (flashResult.beta !== undefined ? flashResult.beta : 0.0);
		let betaL1 = flashResult.liquid ? flashResult.liquid.beta : (flashResult.betaL1 !== undefined ? flashResult.betaL1 : (hasL2 ? 0.0 : 1.0 - betaV));
		let betaL2 = hasL2 ? (liq2.beta !== undefined ? liq2.beta : flashResult.betaL2 || 0.0) : 0.0;

		if (flashResult.liquid) {
			const liquidZ = flashResult.liquid.moleFractions || flashResult.x || bulkZ;
			result.l = this.calculatePhaseProperties(flashResult.liquid, liquidZ, T, P, false, 0.0);
			result.l.phaseFraction = betaL1;
		}
		else {
			result.l = this.calculatePhaseProperties(flashResult.bulk, bulkZ, T, P, false, 0.0);
			result.l.phaseFraction = betaL1;
		}

		if (flashResult.vapor) {
			const vaporZ = flashResult.vapor.moleFractions || flashResult.y || bulkZ;
			result.v = this.calculatePhaseProperties(flashResult.vapor, vaporZ, T, P, true, 1.0);
			result.v.phaseFraction = betaV;
		}
		else {
			result.v = this.calculatePhaseProperties(flashResult.bulk, bulkZ, T, P, true, 1.0);
			result.v.phaseFraction = betaV;
		}

		if (hasL2) {
			const liquid2Z = liq2.moleFractions || (flashResult.workspace && flashResult.workspace.x2) || liq2.x;
			result.l2 = this.calculatePhaseProperties(liq2, liquid2Z, T, P, false, 0.0);
			result.l2.phaseFraction = betaL2;
		}

		return result;
	}

	/**
	 * envelope - calculates Ts and Ps representing phase envelope
	 * @returns {MMTableValue} if successful
	 */
	envelope() {
		try {
			if (!this.thermoPkg || !this.componentString || !this.engine || !this.eos) {
				return null;
			}
			const z = this.moleX ? this.moleX.values : this.convertMassFracToMole(this.massX.values);
			const envResult = this.engine.generatePhaseEnvelope(z);

			const points = [];
			if (envResult.curve) {
				for (let i = 0; i < envResult.curve.length; i++) {
					points.push(envResult.curve[i]);
				}
			}
			const nPoints = points.length;
			const tColumn = new MMNumberValue(nPoints, 1, [0, 0, 0, 0, 1, 0, 0]);
			const pColumn = new MMNumberValue(nPoints, 1, [-1, 1, -2, 0, 0, 0, 0]);
			for (let i = 0; i < nPoints; i++) {
				tColumn.values[i] = points[i].T;
				pColumn.values[i] = points[i].P;
			}
			const columns = [
				new MMTableValueColumn({
					name: 't',
					value: tColumn
				}),
				new MMTableValueColumn({
					name: 'p',
					value: pColumn
				})
			];
			return new MMTableValue({columns: columns});
		}
		catch (e) {
			const msg = e.message || '';
			this.setError('mmcool:envelopeFailed', {
				path: this.getPath(),
				msg: msg
			});
			return null;
		}
	}

	displayTable(justPhase, requestor) {
		try {
			if (!this.flashResults) {
				// trigger flash
				this.valueDescribedBy('b.t', requestor);
			}
			const makePhaseColumn = (phase) => {
				const strings = [];
				for (let row = 0; row < this.propList.length; row++) {
					const propName = this.propList[row];
					const propValue = phase[propName];
					if (propValue) {
						const propCount = propValue.valueCount;
						const unitName = this.displayUnits[row + 1];
						let unit = unitName && typeof theMMSession !== 'undefined' ? theMMSession.unitSystem.unitNamed(unitName) : null;
						const def = MMFlashPropertyDefinitions[propName.toLowerCase()];
						if (unit && def) {
							if (!MMUnitSystem.areDimensionsEqual(unit.dimensions, def.dim)) {
								unit = null;
							}
						}

						for (let j = 1; j <= propCount; j++) {
							strings.push(propValue.stringForRowColumnUnit(j, 1, unit, this.formatStrings[propName]));
						}
					}
					else {
						strings.push('');
					}
				}
				return MMStringValue.stringArrayValue(strings);
			};

			const labelsAndUnits = (bulkProps) => {
				const labelStrings = [];
				const unitStrings = [];
				for (let i = 0; i < this.propList.length; i++) {
					const propName = this.propList[i];
					const propValue = bulkProps[propName];
					if (propValue) {
						const propCount = propValue.valueCount;
						const unitName = this.displayUnits[i + 1] || (propValue.defaultUnit ? propValue.defaultUnit.name : '');
						if (propCount === 1) {
							if (propName === 'q' && this.imposedPhase) {
								labelStrings.push('q IMPOSED');
							}
							else {
								labelStrings.push(propName);
							}
							unitStrings.push(unitName);
						}
						else if (this.componentNames && this.componentNames.length === propCount) {
							for (let j = 0; j < propCount; j++) {
								unitStrings.push(this.componentNames[j]);
								labelStrings.push(propName);
							}
						}
						else {
							for (let j = 0; j < propCount; j++) {
								unitStrings.push(unitName);
								labelStrings.push(propName);
							}
						}
					}
					else {
						labelStrings.push(propName);
						unitStrings.push('');
					}
				}
				return [labelStrings, unitStrings];
			};

			if (this.flashResults) {
				const bulkProps = this.flashResults.b;
				if (!bulkProps.f) {
					this.calculateFlows();
				}
				const [labelStrings, unitStrings] = labelsAndUnits(bulkProps);

				const columns = [];
				columns.push(new MMTableValueColumn({
					name: 'Label',
					displayUnit: 'string',
					value: MMStringValue.stringArrayValue(labelStrings)
				}));
				columns.push(new MMTableValueColumn({
					name: 'Unit',
					displayUnit: 'string',
					value: MMStringValue.stringArrayValue(unitStrings)
				}));

				if (justPhase) {
					if (this.flashResults[justPhase]) {
						columns.push(new MMTableValueColumn({
							name: justPhase.toUpperCase(),
							displayUnit: 'string',
							value: makePhaseColumn(this.flashResults[justPhase])
						}));
					}
					else {
						return null;
					}
				}
				else {
					columns.push(new MMTableValueColumn({
						name: 'B',
						displayUnit: 'string',
						value: makePhaseColumn(bulkProps)
					}));

					if (this.flashResults.v) {
						columns.push(new MMTableValueColumn({
							name: 'V',
							displayUnit: 'string',
							value: makePhaseColumn(this.flashResults.v)
						}));
					}

					if (this.flashResults.l) {
						columns.push(new MMTableValueColumn({
							name: 'L',
							displayUnit: 'string',
							value: makePhaseColumn(this.flashResults.l)
						}));
					}

					if (this.flashResults.l2) {
						columns.push(new MMTableValueColumn({
							name: 'L2',
							displayUnit: 'string',
							value: makePhaseColumn(this.flashResults.l2)
						}));
					}
				}

				const table = new MMTableValue({columns: columns});
				return table.jsonValue();
			}
			else if (!justPhase || justPhase === 'b') {
				// show the defined bulk properties
				if (!this.propList) {
					this.propList = ['q', 't', 'p', 'f', 'h', 's', 'dmolar', 'mwt', 'x'].concat(this.additionalProperties);
				}
				const bulk = {};
				const prop1 = this.firstPropertyFormula.value();
				const prop2 = this.secondPropertyFormula.value();
				for (const propName of ['q', 't', 'p', 'h', 's']) {
					for (const prop of [prop1, prop2]) {
						if (MMFlash.isPropertyType(prop, propName)) {
							bulk[propName] = prop;
							break;
						}
						else {
							bulk[propName] = null;
						}
					}
				}
				bulk.f = this.flowFormula.value();
				bulk.x = this.moleFracFormula.value();
				bulk.massx = this.massFracFormula.value();
				const [labelStrings, unitStrings] = labelsAndUnits(bulk);
				const columns = [];
				columns.push(new MMTableValueColumn({
					name: 'Label',
					displayUnit: 'string',
					value: MMStringValue.stringArrayValue(labelStrings)
				}));
				columns.push(new MMTableValueColumn({
					name: 'Unit',
					displayUnit: 'string',
					value: MMStringValue.stringArrayValue(unitStrings)
				}));
				columns.push(new MMTableValueColumn({
					name: 'B',
					displayUnit: 'string',
					value: makePhaseColumn(bulk)
				}));
				const table = new MMTableValue({columns: columns});
				return table.jsonValue();
			}
		}
		catch (e) {
			const msg = e.message || '';
			this.setError('mmcool:flashFailed', {
				path: this.getPath(),
				msg: msg
			});
		}
	}

	/**
	 * @method toolViewInfo
	 * @override
	 * @param {MMCommand} command
	 */
	async toolViewInfo(command) {
		super.toolViewInfo(command);
		await super.toolViewInfo(command);
		const results = command.results;
		results['thermoFormula'] = this.thermoFormula.formula;
		results['firstPropFormula'] = this.firstPropertyFormula.formula;
		results['secondPropFormula'] = this.secondPropertyFormula.formula;
		results['moleFracFormula'] = this.moleFracFormula.formula;
		results['massFracFormula'] = this.massFracFormula.formula;
		results['flowFormula'] = this.flowFormula.formula;
		results['formatStrings'] = this.formatStrings;
		results.displayTable = this.displayTable();
		const unitTypes = {};
		for (const propName of this.propList) {
			const type = MMFlash.propertyTypeForCPType(propName);
			if (type) {
				unitTypes[propName] = type;
			}
		}
		results['unitTypes'] = unitTypes;
	}

	/**
	 * @method htmlValue
	 * @returns {String}
	 */
	htmlValue(requestor) {
		let rv;
		const table = this.displayTable(null, requestor);
		if (!table) {
			return '<b>Flash not calculated</b>';
		}
		const lines = [];
		const maxColumn = table.nc;
		const maxRow = table.nr;
		lines.push('\n<table class="tvalue">');
		lines.push('\t<tr class="row0">');
		for (let column = 0; column < maxColumn; column++) {
			const header = table.v[column].name;
			lines.push(`\t\t<th class="col${column + 1}">${header}</th>`);
		}
		lines.push('\t</tr>');
		for (let row = 0; row < maxRow; row++) {
			lines.push(`<tr class="row${row + 1}">\n\t\t<th class="col0">${row}</th>`);
			for (let column = 0; column < maxColumn; column++) {
				try {
					const v = table.v[column].v.v[row];
					lines.push(`\t\t<td class="col${column + 1}">${v}</td>`);
				}
				catch (e) {
					lines.push(`\t\t<td class="col${column + 1}">???</td>`);
				}
			}
			lines.push('\t</tr>');
		}
		lines.push('</table>\n');
		rv = lines.join('\n');

		return rv;
	}
}

MMFlash.parseThermoDefinition = parseThermoDefinition;

export { MMFlash, MMFlashPhaseValue, parseThermoDefinition };