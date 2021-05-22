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
	Module:readonly
	MMStringValue:readonly
	MMNumberValue:readonly
	MMNumberValue:readonly
	MMTableValueColumn:readonly
	MMTableValue:readonly
*/

// would like this to be static class variable, but eslint complains, so for now...
var MMFlashPropertyDefinitions;

/**
 * @class MMFlash
 * @extends MMTool
 */
// eslint-disable-next-line no-unused-vars
class MMFlash extends MMTool {
	// static propertyDefinitions = null;

	static createPropertyDefinitions() {
		MMFlashPropertyDefinitions = {
			q: {param: Module.parameters.iT, dim: [0, 0, 0, 0, 0, 0, 0]},
			t: {param: Module.parameters.iT, dim: [0, 0, 0, 0, 1, 0, 0]},
			p: {param: Module.parameters.iP, dim: [-1, 1, -2, 0, 0, 0, 0 ]},
			h: {param: Module.parameters.iHmolar, dim: [2, 1, -2, 0, 0, -1, 0]},
			s: {param: Module.parameters.iSmolar, dim: [2, 1, -2, 0, -1, -1, 0]},
			cp: {param: Module.parameters.iCpmolar, dim: [2, 1, -2, 0, -1, -1, 0]},
			rho: {param: Module.parameters.iDmolar, dim: [0, 1, 0, 0, 0, -3, 0]},
			mwt: {param: Module.parameters.imolar_mass, dim: [0, 1, 0, 0, 0, -1, 0]},
		};
	}

	/**
	 * isPropertyType returns true if property dimensions matches type
	 * @param {MMNumberValue} property 
	 * @param {String} type - index into property definitions
	 * @returns {boolean}
	 */
	static isPropertyType(property, type) {
		const def = MMFlashPropertyDefinitions[type];
		if (property && def) {
			return MMUnitSystem.areDimensionsEqual(property.unitDimensions, def.dim);
		}
		return false
}

	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Flash');
		this.thermoFormula = new MMFormula('thermoFormula', this)
		this.firstPropertyFormula = new MMFormula('firstPropFormula', this);
		this.secondPropertyFormula = new MMFormula('secondPropFormula', this);
		this.moleFracFormula = new MMFormula('moleFracFormula', this);
		this.massFracFormula = new MMFormula('massFracFormula', this);
		this.flowFormula = new MMFormula('flowFormula', this);
		this.additionalProperties = [];
	}

	/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o = super.saveObject();
		o['Type'] = 'Flash';
		o['thermo'] = {Formula: this.thermoFormula.formula}
		o['firstprop'] = {Formula: this.firstPropertyFormula.formula}
		o['secondprop'] = {Formula: this.secondPropertyFormula.formula}
		o['molefrac'] = {Formula: this.moleFracFormula.formula}
		o['massfrac'] = {Formula: this.massFracFormula.formula}
		o['flow'] = {Formula: this.flowFormula.formula}

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
		}
		finally {
			this.isLoadingCase = false;
		}
	}	

	/**
	 * @method parameters
	 * i.e. things that can be appended to a formula value
	 */
	parameters() {
		let p = super.parameters();
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
				this.thermoPkg = null;
				this.componentString = null;
				this.nComponents = null;
				this.componentNames = null;
				this.additionalProperties = [];
				this.mwts = null;
				this.flashResults = null;
				this.firstProperty = null;
				this.firstPropertyType = null;
				this.secondProperty = null;
				this.secondPropertyType = null;
				this.flow = null
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
		this.massFracFormula.addInputSourcesToSet(sources)
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

		const lcDescription = description.toLowerCase();
		if (lcDescription === 'thermo') {
			const thermo = this.thermoFormula.value();
			if (thermo) {
				this.addRequestor(requestor);
			}
			return thermo;
		}
		const descParts = lcDescription.split('.');
		const phase = descParts.shift();
		const property = descParts.shift();

		if (!this.flashResults) {
			this.flash();
		}
		if (this.flashResults) {
			const resultPhase = this.flashResults[phase];
			if (resultPhase) {
				const prop = resultPhase[property];
				if (prop) {
					this.addRequestor(requestor);
					return prop;
				}
			}
		}
	}

	convertMassFracToMole(massFracs) {
		const moleFracs = [];
		let sum = 0;
		for (let i = 0; i < this.nComponents; i++) {
			const moleFrac = massFracs[i]/this.mwts[i];
			sum += moleFrac;
			moleFracs.push(moleFrac);
		}
		for (let i = 0; i < this.nComponents; i++) {
			moleFracs[i] /= sum;
		}
		return moleFracs;
	}
	
	convertMoleFracToMass(moleFracs) {
		const massFracs = [];
		let sum = 0;
		for (let i = 0; i < this.nComponents; i++) {
			const massFrac = moleFracs[i]*this.mwts[i];
			sum += massFrac;
			massFracs.push(massFrac);
		}
		for (let i = 0; i < this.nComponents; i++) {
			massFracs[i] /= sum;
		}
		return massFracs;
	}

	/**
	 * flash - does flash and if successful puts results if this.flashResults
	 */
	flash() {
		// Module.set_debug_level(31);
		let result;

		if (!this.thermoPkg || !this.componentString) {
			const thermoDesc = this.thermoFormula.value()
			if (thermoDesc && thermoDesc instanceof MMStringValue && thermoDesc.valueCount > 0) {
				const desc = thermoDesc.values[0].replace(/[\s\n]+/g, '').split('::');
				this.thermoPkg = desc.shift();
				this.componentString = desc.shift();
				if (!this.thermoPkg || !this.componentString) {
					return;
				}
				this.componentNames = this.componentString.split('&');
				this.nComponents = this.componentNames.length;
				if (desc.length) {
					this.additionalProperties = desc[0].split('&');
				} 
			}
			else {
				return;
			}
		}
		if (!this.firstProperty) {
			this.firstProperty = this.firstPropertyFormula.value();
		}
		if (this.firstProperty) {
			if (MMFlash.isPropertyType(this.firstProperty,'t')) {
				this.firstPropertyType = 'T';
			}
			else if (MMFlash.isPropertyType(this.firstProperty,'p')) {
				this.firstPropertyType = 'P';
			}
			else {
				this.setError('mmcool:flashFirstPropNotTorP', {path: this.getPath()});
				this.firstProperty = null;
			}
		}
		if (!this.secondProperty) {
			this.secondProperty = this.secondPropertyFormula.value();
		}

		if (this.secondProperty) {
			if (MMFlash.isPropertyType(this.secondProperty,'t')) {
				this.secondPropertyType = 'T';
			}
			else if (MMFlash.isPropertyType(this.secondProperty,'p')) {
				this.secondPropertyType = 'P';
			}
			else if (MMFlash.isPropertyType(this.secondProperty,'q')) {
				this.secondPropertyType = 'Q';
			}
			else if (MMFlash.isPropertyType(this.secondProperty,'h')) {
				this.secondPropertyType = 'H';
			}
			else if (MMFlash.isPropertyType(this.secondProperty,'s')) {
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

		if (!this.flow) { this.flow = this.flowFormula.value(); }
		let flowIsMoles = true;
		if (this.flow && this.flow.valueCount > 1) {
			if (MMUnitSystem.areDimensionsEqual(this.flow.unitDimensions, [0, 0, -1, 0, 0, 1, 0])) {
				// mole flow
				this.moleX = this.flow.divideBy(this.flow.sum());

			}
			else if (MMUnitSystem.areDimensionsEqual(this.flow.unitDimensions, [0, 1, -1, 0, 0, 0, 0])) {
				// mass flow
				this.massX = this.flow.divideBy(this.flow.sum());
				flowIsMoles = false;
			}
			this.flow = this.flow.sum()
		}
		if (!this.moleX) { this.moleX = this.moleFracFormula.value(); }
		if (!this.massX) { this.massX = this.massFracFormula.value(); }

		if (!MMFlashPropertyDefinitions) {
			MMFlash.createPropertyDefinitions();
		}
		if (
			!this.firstProperty ||
			!this.secondProperty ||
			!(this.moleX || this.massX)
		) {
			return;  // not enough information
		}
		let flashType, firstValue, secondValue;
		if (this.firstPropertyType === 'T') {
			if (this.secondPropertyType === 'P') {
				flashType = Module.input_pairs.PT_INPUTS;
				firstValue = this.secondProperty.values[0];
				secondValue = this.firstProperty.values[0];
			}
			else if (this.secondPropertyType === 'Q') {
				flashType = Module.input_pairs.QT_INPUTS;
				firstValue = this.secondProperty.values[0];
				secondValue = this.firstProperty.values[0];
			}
			else if (this.secondPropertyType === 'H') {
				if (this.nComponents === 1) {
					flashType = Module.input_pairs.HmolarT_INPUTS;
					firstValue = this.secondProperty.values[0];
					secondValue = this.firstProperty.values[0];
				}
				else {
					return;
				}
			}
			else if (this.secondPropertyType === 'S') {
				if (this.nComponents === 1) {
					flashType = Module.input_pairs.SmolarT_INPUTS;
					firstValue = this.secondProperty.values[0];
					secondValue = this.firstProperty.values[0];
				}
				else {
					return;
				}
			}
			else {
				return;
			}
		} else if (this.firstPropertyType === 'P') {
			if (this.secondPropertyType === 'T') {
				flashType = Module.input_pairs.PT_INPUTS;
				firstValue = this.firstProperty.values[0];
				secondValue = this.secondProperty.values[0];
			}
			else if (this.secondPropertyType === 'Q') {
				flashType = Module.input_pairs.PQ_INPUTS;
				firstValue = this.firstProperty.values[0];
				secondValue = this.secondProperty.values[0];
			}
			else if (this.secondPropertyType === 'H') {
				if (this.nComponents === 1) {
					flashType = Module.input_pairs.HmolarP_INPUTS;
					firstValue = this.secondProperty.values[0];
					secondValue = this.firstProperty.values[0];
				}
				else {
					return;
				}
			}
			else if (this.secondPropertyType === 'S') {
				if (this.nComponents === 1) {
					flashType = Module.input_pairs.PSmolar_INPUTS;
					firstValue = this.firstProperty.values[0];
					secondValue = this.secondProperty.values[0];
				}
				else {
					return;
				}
			}
			else {
				return;
			}
		} else {
			return;
		}

		try {
			const absState = Module.factory(this.thermoPkg, this.componentString);
			const z = new Module.VectorDouble();
			let usingMoleFracs = true;
			try {
				if (!this.mwts) {
					const mwts = [];
					for (let i = 0; i < this.nComponents; i++) {
						mwts.push(absState.get_fluid_constant(i, Module.parameters.imolar_mass) * 1000);
					}
					this.mwts = mwts;
				}
				if (this.moleX && this.moleX instanceof MMNumberValue && this.moleX.valueCount > 0) {
					if (this.moleX.valueCount !== this.nComponents) {
						this.setError('mmcool:flashWrongCmpCount', {path: this.getPath()});
						return null;
					}
					for (let x of this.moleX.values) {
						z.push_back(x);
					}
					absState.set_mole_fractions(z);
				}
				else if (this.massX && this.massX instanceof MMNumberValue && this.massX.valueCount > 0) {
					if (this.massX.valueCount !== this.nComponents) {
						this.setError('mmcool:flashWrongCmpCount', {path: this.getPath()});
						return null;
					}
					for (let x of this.massX.values) {
						z.push_back(x);
					}
					absState.set_mass_fractions(z);
					usingMoleFracs = false;
				}
				absState.update(flashType, firstValue, secondValue);
				const q = absState.keyed_output(Module.parameters.iQ);
				const bulk = {};
				bulk.q = MMNumberValue.scalarValue(q);
				// const baseProperties = ['t', 'p', 'h', 's', 'cp', 'rho', 'mwt'];
				this.propList = ['q', 't', 'p', 'f', 'h', 's', 'x'].concat(this.additionalProperties);
				for (const prop of this.propList) {
					const propDef = MMFlashPropertyDefinitions[prop];
					if (propDef) {
						bulk[prop] = MMNumberValue.scalarValue(
							absState.keyed_output(propDef.param),
							propDef.dim
						);
					}
					else {
						switch(prop) {
							case 'f': {
								if (flowIsMoles) {
									bulk.f = this.flow;
								}
								else {
									const mwtDef = MMFlashPropertyDefinitions['mwt'];
									const mwt = MMNumberValue.scalarValue(
										absState.keyed_output(mwtDef.param),
										mwtDef.dim
									);
									bulk.f = this.flow.divideBy(mwt);
								}
							}
							break;
							case 'massf': {
								if (this.flow) {
									if (flowIsMoles) {
										const mwtDef = MMFlashPropertyDefinitions['mwt'];
										const mwt = MMNumberValue.scalarValue(
											absState.keyed_output(mwtDef.param),
											mwtDef.dim
										);
										bulk.massf = this.flow.multiply(mwt);
									}
									else {
										bulk.massf = this.flow;
									}
								}
								else {
									bulk.massf = null;
								}
							}
							break;
							case 'x': {
								bulk.x = new MMNumberValue(this.nComponents, 1);
								const xValues = bulk.x.values;
								if (usingMoleFracs) {
									for (let i = 0; i < this.nComponents; i++) {
										xValues[i] = this.moleX.values[i];
									}
								}
								else {
									const moleFracs = this.convertMassFracToMole(this.massX.values);
									for (let i = 0; i < this.nComponents; i++) {
										xValues[i] = moleFracs[i];
									}
								}
							}
							break;
							case 'massx': {
								bulk.massx = new MMNumberValue(this.nComponents, 1);
								const xValues = bulk.massx.values;
								if (!usingMoleFracs) {
									for (let i = 0; i < this.nComponents; i++) {
										xValues[i] = this.massX.values[i];
									}
								}
								else {
									const massFracs = this.convertMoleFracToMass(this.moleX.values);
									for (let i = 0; i < this.nComponents; i++) {
										xValues[i] = massFracs[i];
									}
								}
							}
							break;
						}
					}
				}
				result = {b: bulk};
				
				if (q !== -1) {
					// two phase
					const liquid = {q: MMNumberValue.scalarValue(0)};
					const vapor = {q: MMNumberValue.scalarValue(1)};
					for (const prop of this.propList) {
						const propDef = MMFlashPropertyDefinitions[prop];
						if (propDef) {
							liquid[prop] = MMNumberValue.scalarValue(
								absState.saturated_liquid_keyed_output(propDef.param),
								propDef.dim
							);
							vapor[prop] = MMNumberValue.scalarValue(
								absState.saturated_vapor_keyed_output(propDef.param),
								propDef.dim
							);
						}
						else {
							switch(prop) {
								case 'f': {
									if (bulk.f) {
										vapor.f = bulk.f.multiply(MMNumberValue.scalarValue(q));
										liquid.f = bulk.f.multiply(MMNumberValue.scalarValue(1-q));
									}
								}
								break;
								case 'massf': {
									if (bulk.f) {
										const mwtDef = MMFlashPropertyDefinitions['mwt'];
										const mwtv = MMNumberValue.scalarValue(
											absState.saturated_vapor_keyed_output(mwtDef.param),
											mwtDef.dim
										);
										vapor.massf = vapor.f.multiply(mwtv);
										const mwtl = MMNumberValue.scalarValue(
											absState.saturated_liquid_keyed_output(mwtDef.param),
											mwtDef.dim
										);
										liquid.massf = liquid.f.multiply(mwtl);
									}
								}
								break;
								case 'x': {
									const x = absState.mole_fractions_liquid();
									liquid.x = new MMNumberValue(this.nComponents, 1);
									const xValues = liquid.x.values;
									for (let i = 0; i < this.nComponents; i++) {
										xValues[i] = x.get(i);
									}
									x.delete();
				
									const y = absState.mole_fractions_vapor();
									vapor.x = new MMNumberValue(this.nComponents, 1);
									const yValues = vapor.x.values;
									for (let i = 0; i < this.nComponents; i++) {
										yValues[i] = y.get(i);
									}
									y.delete();
								}
								break;
								case'massx': {
									const x = absState.mole_fractions_liquid();
									liquid.massx = new MMNumberValue(this.nComponents, 1);
									const xValues = liquid.massx.values;
									const xMoleFracs = [];
									for (let i = 0; i < this.nComponents; i++) {
										xMoleFracs.push(x.get(i));
									}
									const xMassFracs = this.convertMoleFracToMass(xMoleFracs);
									for (let i = 0; i < this.nComponents; i++) {
										xValues[i] = xMassFracs[i];
									}
									x.delete();
				
									const y = absState.mole_fractions_vapor();
									vapor.massx = new MMNumberValue(this.nComponents, 1);
									const yValues = vapor.massx.values;
									const yMoleFracs = [];
									for (let i = 0; i < this.nComponents; i++) {
										yMoleFracs.push(y.get(i));
									}
									const yMassFracs = this.convertMoleFracToMass(yMoleFracs);
									for (let i = 0; i < this.nComponents; i++) {
										yValues[i] = yMassFracs[i];
									}
									y.delete();
								}
								break;
							}
						}
					}
					result.l = liquid;
					result.v = vapor;
				}
				else {
					console.log('single phase');
				}

				// const t = absState.keyed_output(Module.parameters.iT);
				// console.log(`t ${t}`);

				// const h = absState.keyed_output(Module.parameters.iHmolar);
				// console.log(`h ${h}`);

				// for (let i = 0; i < this.nComponents; i++) {
				// 	console.log(`${this.componentNames[i]} ${this.mwts[i]}`);
				// }
			}
			catch(e) {
				this.setError('mmcool:flashFailed',{path: this.getPath()});
				return;
			}
			finally {
				absState.delete()
				z.delete();
			}
		}
		catch(e) {
			console.log(e);
			this.setError('mmcool:flashThermoDefnError', {path: this.getPath()});
			return;
		}
		this.flashResults = result;
	}

/**
 * @method toolViewInfo
 * @override
 * @param {MMCommand} command
 * command.results contains the info for tool info view
 */
	toolViewInfo(command) {
		super.toolViewInfo(command);
		let results = command.results;
		results['thermoFormula'] = this.thermoFormula.formula;
		results['firstPropFormula'] = this.firstPropertyFormula.formula;
		results['secondPropFormula'] = this.secondPropertyFormula.formula;
		results['moleFracFormula'] = this.moleFracFormula.formula;
		results['massFracFormula'] = this.massFracFormula.formula;
		results['flowFormula'] = this.flowFormula.formula;

		if (!this.flashResults) {
			this.flash();
		}
		if (this.flashResults) {
			const makePhaseColumn = (phase) => {
				const strings = []
				for (const propName of this.propList) {
					const propValue = phase[propName];
					if (propValue) {
						const propCount = propValue.valueCount;
						for (let i = 1; i <= propCount; i++) {
							strings.push(propValue.stringForRowColumnUnit(i,1));
						}
					}
					else {
						strings.push('');
					}
				}
				return MMStringValue.stringArrayValue(strings);
			}

			const labelStrings = [];
			const unitStrings = [];
			const bulkProps = this.flashResults.b;
			for (const propName of this.propList) {
				const propValue = bulkProps[propName];
				if (propValue) {
					const propCount = propValue.valueCount;
					const unitName = propValue.defaultUnit.name;
					if (propCount === 1) {
						labelStrings.push(propName);
						unitStrings.push(unitName);
					}
					else {
						for (let i = 0; i < propCount; i++) {
							unitStrings.push(this.componentNames[i]);
							labelStrings.push(propName);
						}
					}
				}
				else {
					labelStrings.push(propName);
					unitStrings.push('');
				}
			}

			const columns = []
			columns.push(new MMTableValueColumn({
				name: 'Label',
				displayUnit:'string',
				value: MMStringValue.stringArrayValue(labelStrings)
			}));
			columns.push(new MMTableValueColumn({
				name: 'Unit',
				displayUnit:'string',
				value: MMStringValue.stringArrayValue(unitStrings)
			}));

			columns.push(new MMTableValueColumn({
				name: 'B',
				displayUnit:'string',
				value: makePhaseColumn(bulkProps)
			}));

			if (this.flashResults.v) {
				columns.push(new MMTableValueColumn({
					name: 'V',
					displayUnit:'string',
					value: makePhaseColumn(this.flashResults.v)
				}));
			}

			if (this.flashResults.l) {
				columns.push(new MMTableValueColumn({
					name: 'L',
					displayUnit:'string',
					value: makePhaseColumn(this.flashResults.l)
				}));
			}

			const table = new MMTableValue({columns: columns});
			results.displayTable = table.jsonValue();
		}
	}
}