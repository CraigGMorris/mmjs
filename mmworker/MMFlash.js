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
			q: {param: Module.parameters.iQ, dim: [0, 0, 0, 0, 0, 0, 0]},										// vapour fraction
			t: {param: Module.parameters.iT, dim: [0, 0, 0, 0, 1, 0, 0]},										// temperature
			p: {param: Module.parameters.iP, dim: [-1, 1, -2, 0, 0, 0, 0 ]},								// pressure
			h: {param: Module.parameters.iHmolar, dim: [2, 1, -2, 0, 0, -1, 0]},						// Mole-based enthalpy
			s: {param: Module.parameters.iSmolar, dim: [2, 1, -2, 0, -1, -1, 0]},						// Mole-based entropy
			mwt: {param: Module.parameters.imolar_mass, dim: [0, 1, 0, 0, 0, -1, 0]},				// molecular weight
			cpmolar: {param: Module.parameters.iCpmolar, dim: [2, 1, -2, 0, -1, -1, 0]},		// Mole-based constant-pressure specific heat
			cp0molar: {param: Module.parameters.iCp0molar, dim: [2, 1, -2, 0, -1, -1, 0]},	// Mole-based ideal-gas constant-pressure specific heat
			cvmolar: {param: Module.parameters.iCvmolar, dim: [2, 1, -2, 0, -1, -1, 0]},		// Mole-based constant-volume specific heat
			dmolar: {param: Module.parameters.iDmolar, dim: [-3, 0, 0, 0, 0, 1, 0]},				// Mole-based density
			umolar: {param: Module.parameters.iUmolar, dim: [2, 1, -2, 0, 0, -1, 0]},				// Mole-based internal energy
			gmolar: {param: Module.parameters.iGmolar, dim: [2, 1, -2, 0, 0, -1, 0]},				// Mole-based Gibbs energy
			cpmass: {param: Module.parameters.iCpmass, dim: [2, 0, -2, 0, -1, 0, 0]},				// Mass-based constant-pressure specific heat
			cp0mass: {param: Module.parameters.iCp0mass, dim: [2, 0, -2, 0, -1, 0, 0]},			// Mass-based ideal-gas constant-pressure specific heat
			cvmass: {param: Module.parameters.iCvmass, dim: [2, 0, -2, 0, -1, 0, 0]},				// Mass-based constant-volume specific heat
			dmass: {param: Module.parameters.iDmass, dim: [-3, 1, 0, 0, 0, 0, 0]},					// Mass-based density
			umass: {param: Module.parameters.iUmass, dim: [2, 0, -2, 0, 0, 0, 0]},					// Mass-based internal energy
			gmass: {param: Module.parameters.iGmass, dim: [2, 0, -2, 0, 0, 0, 0]},					// Mass-based Gibbs energy
			tmin: {param: Module.parameters.iT_min, dim: [0, 0, 0, 0, 1, 0, 0]},						// Minimum temperature
			tmax: {param: Module.parameters.iT_max, dim: [0, 0, 0, 0, 1, 0, 0]},						// Maximum temperature
			pmin: {param: Module.parameters.iP_min, dim: [-1, 1, -2, 0, 0, 0, 0 ]},					// Minimum pressure
			viscosity: {param: Module.parameters.iviscosity, dim: [-1, 1, -1, 0, 0, 0, 0 ]},	// viscosity
			conductivity: {param: Module.parameters.iconductivity, dim: [1, 1, -3, 0, -1, 0, 0 ]},	// Thermal conductivity
			surfacetension: {param: Module.parameters.isurface_tension, dim: [0, 1, -2, 0, 0, 0, 0 ]},	// surface tension
			prandtl: {param: Module.parameters.iPrandtl, dim: [0, 0, 0, 0, 0, 0, 0 ]},	// surface tension
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
		return false
}

	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Flash');
		this.thermoFormula = new MMFormula('thermoFormula', this)
		this.thermoPkg = 'HEOS';
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
		if (!MMFlashPropertyDefinitions) {
			MMFlash.createPropertyDefinitions();
		}
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
				this.thermoPkg = 'HEOS';
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
		if (lcDescription === 'fluids') {
			const fluidsString = Module.get_global_param_string('fluids_list');
			const fluidsList = MMStringValue.stringArrayValue(fluidsString.split(','));
			this.addRequestor(requestor);
			return fluidsList;
			

		}

		if (!this.thermoDefn) {
			this.thermoDefn = this.thermoFormula.value();
		}

		if (!this.thermoPkg || !this.componentString) {
			const thermoDefn = this.thermoFormula.value()
			if (thermoDefn && thermoDefn instanceof MMStringValue && thermoDefn.valueCount > 0) {
				this.thermoDefn = thermoDefn;
				const desc = thermoDefn.values[0].replace(/[\s\n]+/g, '').replace(/,/g,'&').split('::');

				this.componentString = desc.shift();
				if (desc.length) {
					this.additionalProperties = desc[0].split('&');
				}
				this.componentNames = this.componentString.split('&');
				this.nComponents = this.componentNames.length;
			}
		}

		if (lcDescription === 'thermo') {
			if (this.thermoDefn) {
				this.addRequestor(requestor);
			}
			return this.thermoDefn;
		}

		if (!this.moleX) {
			this.moleX = this.moleFracFormula.value();
			if (this.moleX) {
				this.moleX = this.moleX.divideBy(this.moleX.sum());
			}
		}
		if (!this.massX) {
			this.massX = this.massFracFormula.value();
			if (this.massX) {
				this.massX = this.massX.divideBy(this.massX.sum());
			}
		}

		if (!this.moleX && !this.massX) {
			if (!this.flow) { this.flow = this.flowFormula.value(); }
			if (this.flow && this.flow.valueCount > 1) {
				if (MMUnitSystem.areDimensionsEqual(this.flow.unitDimensions, [0, 0, -1, 0, 0, 1, 0])) {
					// mole flow
					this.moleX = this.flow.divideBy(this.flow.sum());
				}
				else if (MMUnitSystem.areDimensionsEqual(this.flow.unitDimensions, [0, 1, -1, 0, 0, 0, 0])) {
					// mass flow
					this.massX = this.flow.divideBy(this.flow.sum());
				}
				this.flow = this.flow.sum()
			}
		}

		if (lcDescription === 'envelope') {
			const envelope = this.envelope();
			if (envelope) {
				this.addRequestor(requestor);
			}
			return envelope;
		}

		const descParts = lcDescription.split('.');
		let property = descParts.shift();
		let phase = descParts.shift();

		if (!this.flashResults) {
			this.flash();
		}
		if (this.flashResults) {
			if (phase) {
				const resultPhase = this.flashResults[phase];
				if (resultPhase) {
					let prop = resultPhase[property];
					if (!prop && (property === 'f' || property === 'massf')) {
						this.calculateFlows();
						prop = resultPhase[property];
					}
					this.addRequestor(requestor);
					return prop;
				}				
			}
			else {
				// make table of all phases
				const columns = [];
				const bulkPhase = this.flashResults['b'];
				if (bulkPhase[property] && bulkPhase[property].valueCount > 1) {
					const namesValue = MMStringValue.stringArrayValue(this.componentNames);
					columns.push(new MMTableValueColumn({name: 'Name', value: namesValue}));
				}

				for (const phaseName of ['b', 'v', 'l']) {
					const resultPhase = this.flashResults[phaseName];
					if (resultPhase) {
						let prop = resultPhase[property];
						if (!prop && (property === 'f' || property === 'massf')) {
							this.calculateFlows();
							prop = resultPhase[property];
						}
						if (prop) {
							columns.push(new MMTableValueColumn({name: phaseName, value: prop}));
						}
					}
				}
				this.addRequestor(requestor);
				return new MMTableValue({columns: columns});
			}
		}
		else if (!phase || phase === 'b') {
			// get any input information
			let returnValue;
			switch(property) {
				case 'x':
					returnValue = this.moleX;
					break;
				case 'massx':
					returnValue = this.massX;
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
				return returnValue;
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
			if (MMUnitSystem.areDimensionsEqual(f.unitDimensions, [0, 0, -1, 0, 0, 1, 0])) {
				results.b.f = f;
				results.b.massf = f.multiply(results.b.mwt);
				if (results.v) {
					results.v.f = f.multiply(results.b.q);
					results.l.f = f.multiply(MMNumberValue.scalarValue(1).subtract(results.b.q));
					results.v.massf = results.v.f.multiply(results.v.mwt);
					results.l.massf = results.l.f.multiply(results.l.mwt);
				}
			}
			else if (MMUnitSystem.areDimensionsEqual(f.unitDimensions, [0, 1, -1, 0, 0, 0, 0])) {
				results.b.massf = f;
				results.b.f = f.divideBy(results.b.mwt);
				if (results.v) {
					results.v.f = results.b.f.multiply(results.b.q);
					results.l.f = results.b.f.multiply(MMNumberValue.scalarValue(1).subtract(results.b.q));
					results.v.massf = results.v.f.multiply(results.v.mwt);
					results.l.massf = results.l.f.multiply(results.l.mwt);
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
		// Module.set_debug_level(301);
		if (!MMFlashPropertyDefinitions) {
			MMFlash.createPropertyDefinitions();
		}

		if (!this.thermoPkg || !this.componentString) {
			return;
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
					firstValue = this.firstProperty.values[0];
					secondValue = this.secondProperty.values[0];
					this.searchFlash('h', firstValue, secondValue);
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
					firstValue = this.firstProperty.values[0];
					secondValue = this.secondProperty.values[0];
					this.searchFlash('s', firstValue, secondValue);
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
			try {
				const usingMoleFracs = this.assignComposition(absState);
				absState.update(flashType, firstValue, secondValue);
				this.flashResults = this.getFlashResults(absState, usingMoleFracs);
			}
			catch(e) {
				const msg = e.message || ''
				this.setError('mmcool:flashFailed',{
					path: this.getPath(),
					msg: msg
				});
				return;
			}
			finally {
				absState.delete()
			}
		}
		catch(e) {
			console.log(e);
			this.setError('mmcool:flashThermoDefnError', {path: this.getPath()});
			return;
		}
	}

	/**
	 * @method assignComposition - determines mole or mass fractions
	 * and sets them in asbstract state
	 * @param {Object} absState - the CoolProp abstract state
	 */
	assignComposition(absState) {
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
			return usingMoleFracs;
		}
		finally {
			z.delete();
		}		
	}

	getFlashResults(absState, usingMoleFracs) {
		const q = absState.keyed_output(Module.parameters.iQ);
		const bulk = {};
		bulk.q = MMNumberValue.scalarValue(q);
		// const baseProperties = ['t', 'p', 'h', 's', 'cp', 'rho', 'mwt'];
		this.propList = ['q', 't', 'p', 'f', 'h', 's', 'dmolar', 'mwt', 'x'].concat(this.additionalProperties);
		for (const prop of this.propList) {
			const propDef = MMFlashPropertyDefinitions[prop.toLowerCase()];
			if (propDef) {
				bulk[prop] = MMNumberValue.scalarValue(
					absState.keyed_output(propDef.param),
					propDef.dim
				);
			}
			else {
				switch(prop) {
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
		const result = {b: bulk};
		
		if (q !== -1) {
			// two phase
			const liquid = {q: MMNumberValue.scalarValue(0)};
			const vapor = {q: MMNumberValue.scalarValue(1)};
			for (const prop of this.propList) {
				if (prop === 'q' || prop === 'surfacetension') {
					continue;
				}
				const propDef = MMFlashPropertyDefinitions[prop.toLowerCase()];
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
		return result;
	}

	/**
	 * seaarchFlash - attempts basic iteration to find T match at P and H or S
	 * pretty crude and slow, but fairly reliable
	 * someone less lazy could greatly improve this
	 */
	searchFlash(targetType, p, target) {
		const targetDef = MMFlashPropertyDefinitions[targetType];
		if (!targetDef) { return; }
		const targetParam = targetDef.param;

		try {
			const absState = Module.factory(this.thermoPkg, this.componentString);
			try {
				const usingMoleFracs = this.assignComposition(absState);
				const tMin = absState.keyed_output(Module.parameters.iT_min);
				const tMax = absState.keyed_output(Module.parameters.iT_max);
				let tUpper = tMax;
				let tLower = tMin;
				let t;
				let h;
				const flashType = Module.input_pairs.PT_INPUTS;
				let count = 0;
				const maxIter = 100;
				let lastSuccessfullT;
				let lastFailedT = -1;
				const tTolerance = 0.001
				while (tUpper - tLower > tTolerance && count < maxIter) {
					count++;
					t = (tUpper + tLower) / 2;
					try {
						absState.update(flashType, p, t);
						h = absState.keyed_output(targetParam);
						lastSuccessfullT = t;
						if (h > target) {
							tUpper = t;
						}
						else {
							tLower = t;
						}
					}
					catch(e) {
						if (e.message) {
							this.setError('mmcool:flashFailed',{
								path: this.getPath(),
								msg: e.message
							});
							return;									
						}
						else {
							if (t > lastSuccessfullT) {
								tUpper = t;
							}
							else {
								tLower = t;
							}
							lastFailedT = t;
						}
					}
				}
				if (count >= maxIter) {
					this.setError('mmcool:flashPHMaxIter', {type: targetType.toUpperCase(), path: this.getPath(), count: count});
				}
				if (tMax - t < tTolerance || t - tMin < tTolerance) {
					this.setError('mmcool:flashPHHitBound', {type: targetType.toUpperCase(), path: this.getPath()});
				}
				if (Math.abs(t - lastFailedT) < tTolerance) {
					this.setError('mmcool:flashPHBadBound', {type: targetType.toUpperCase(), path: this.getPath()});
				}
				this.flashResults = this.getFlashResults(absState, usingMoleFracs);
			}
			catch(e) {
				const msg = e.message || '';
				this.setError('mmcool:flashFailed',{
					path: this.getPath(),
					msg: msg
				});
				return;
			}
			finally {
				absState.delete()
			}
		}
		catch(e) {
			console.log(e);
			this.setError('mmcool:flashThermoDefnError', {path: this.getPath()});
			return;
		}
	}

	/**
	 * envelope - calculates Ts and Ps representing phase envelope
	 * @returns MMNumberValue if successful
	 */
	envelope() {
		try {
			if (!this.thermoPkg || !this.componentString) {
				return;
			}
			const absState = Module.factory(this.thermoPkg, this.componentString);
			try {
				this.assignComposition(absState);
				absState.build_phase_envelope("");
        const d = absState.get_phase_envelope_data();
        const nPoints = d.T.size();
				const tColumn = new MMNumberValue(nPoints, 1, [0, 0, 0, 0, 1, 0, 0]);
				const pColumn = new MMNumberValue(nPoints, 1, [-1, 1, -2, 0, 0, 0, 0 ]);
				const tValues = tColumn.values;
				const pValues = pColumn.values;
        for(let i = 0; i < nPoints; i++) {
            tValues[i] = d.T.get(i);
            pValues[i] = d.p.get(i);
        }
				const columns = [
					new MMTableValueColumn({
						name: 't',
						value: tColumn
					}),
					new MMTableValueColumn({
						name: 'p',
						value: pColumn
					}),
				];
				return new MMTableValue({columns: columns});
			}
			catch(e) {
				const msg = e.message || ''
				this.setError('mmcool:envelopeFailed',{
					path: this.getPath(),
					msg: msg
				});
				return;
			}
			finally {
				absState.delete()
			}
		}
		catch(e) {
			console.log(e);
			this.setError('mmcool:flashThermoDefnError', {path: this.getPath()});
			return;
		}
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

		try {
			if (!this.flashResults) {
				// trigger flash
				this.valueDescribedBy('flash.b');
			}
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

			const labelsAndUnits = (bulkProps) => {
				const labelStrings = [];
				const unitStrings = [];
				for (const propName of this.propList) {
					const propValue = bulkProps[propName];
					if (propValue) {
						const propCount = propValue.valueCount;
						const unitName = propValue.defaultUnit.name;
						if (propCount === 1) {
							labelStrings.push(propName);
							unitStrings.push(unitName);
						}
						else if (this.componentNames && this.componentNames.length === propCount) {
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
				return [labelStrings, unitStrings];
			}

			if (this.flashResults) {
				const bulkProps = this.flashResults.b;
				if (!bulkProps.f) {
					this.calculateFlows();
				}
				const [labelStrings, unitStrings] = labelsAndUnits(bulkProps);

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
			else {
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
					value: makePhaseColumn(bulk)
				}));
				const table = new MMTableValue({columns: columns});
				results.displayTable = table.jsonValue();
	
			}
		}
		catch(e) {
			const msg = e.message || ''
			this.setError('mmcool:flashFailed',{
				path: this.getPath(),
				msg: msg
			});
		}
	}
}