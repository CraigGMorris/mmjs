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
*/

/**
 * @class MMFlash
 * @extends MMTool
 */
// eslint-disable-next-line no-unused-vars
class MMFlash extends MMTool {
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
				this.mwts = null;
				this.flashResults = null;
				this.firstProperty = null;
				this.firstPropertyType = null;
				this.secondProperty = null;
				this.secondPropertyType = null;
				this.flow = null
				this.moleX = null;
				this.massX = null;
			}
			finally {
				this.forgetRecursionBlockIsOn = false;
			}
		}
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
		const lcDescription = description.toLowerCase();
		const descParts = lcDescription.split('.');
		const phase = descParts.shift();
		const property = descParts.shift();

		if (!this.thermoPkg || !this.componentString) {
			const thermoDesc = this.thermoFormula.value()
			if (thermoDesc && thermoDesc instanceof MMStringValue && thermoDesc.valueCount > 0) {
				const desc = thermoDesc.values[0].split('::');
				this.thermoPkg = desc.shift();
				this.componentString = desc.shift();
				if (!this.thermoPkg || !this.componentString) {
					return null;
				}
				this.componentNames = this.componentString.split('&');
				this.nComponents = this.componentNames.length;
			}
		}
		if (!this.firstProperty) {
			this.firstProperty = this.firstPropertyFormula.value();
			if (MMUnitSystem.areDimensionsEqual(this.firstProperty.unitDimensions, [0, 0, 0, 0, 1, 0, 0])) {
				this.firstPropertyType = 'T';
			}
			else if (MMUnitSystem.areDimensionsEqual(this.firstProperty.unitDimensions, [-1, 1, -2, 0, 0, 0, 0])) {
				this.firstPropertyType = 'P';
			}
			else {
				this.setError('mmcool:flashFirstPropNotTorP', {path: this.getPath()});
				this.firstProperty = null;
			}
		}
		if (!this.secondProperty) {
			this.secondProperty = this.secondPropertyFormula.value();
			if (MMUnitSystem.areDimensionsEqual(this.secondProperty.unitDimensions, [0, 0, 0, 0, 1, 0, 0])) {
				this.secondPropertyType = 'T';
			}
			else if (MMUnitSystem.areDimensionsEqual(this.secondProperty.unitDimensions, [-1, 1, -2, 0, 0, 0, 0])) {
				this.secondPropertyType = 'P';
			}
			else if (MMUnitSystem.areDimensionsEqual(this.secondProperty.unitDimensions, [0, 0, 0, 0, 0, 0, 0])) {
				this.secondPropertyType = 'Q';
			}
			else {
				this.setError('mmcool:flashInvalidSecondPropType', {path: this.getPath()});
				this.secondProperty = null;
				this.secondPropertyType = null;
			}
		}

		if (this.firstPropertyType === this.secondPropertyType) {
			this.setError('mmcool:flashDuplicatePropTypes', {path: this.getPath()});
			this.secondProperty = null;
			this.secondPropertyType = null;
		}

		if (!this.flow) { this.flow = this.flowFormula.value(); }
		if (this.flow && this.flow.valueCount > 1) {
			if (MMUnitSystem.areDimensionsEqual(this.flow.unitDimensions, [0, 0, -1, 0, 0, 1, 0])) {
				// mass flow
				this.massX = this.flow.dividedBy(this.flow.sum);
			}
			else if (MMUnitSystem.areDimensionsEqual(this.flow.unitDimensions, [0, 1, -1, 0, 0, 0, 0])) {
				// mass flow
				this.massX = this.flow.dividedBy(this.flow.sum);
			}
		}
		if (!this.moleX) { this.moleX = this.moleFracFormula.value(); }
		if (!this.massX) { this.massX = this.massFracFormula.value(); }

		if (!this.flashResults) {
			this.flashResults = this.flash();
		}
		if (this.flashResults) {
			const resultPhase = this.flashResults[phase];
			if (resultPhase) {
				return resultPhase[property];
			}
		}
	}
	
	flash() {
		// Module.set_debug_level(11);
		let result;
		if (
			!this.firstProperty ||
			!this.secondProperty ||
			!(this.moleX || this.massX)
		) {
			return null;  // not enough information
		}
		let flashType, firstValue, secondValue;
		if (this.firstPropertyType === 'T') {
			if (this.secondPropertyType === 'P') {
				flashType = Module.input_pairs.PT_INPUTS;
				firstValue = this.secondProperty.values[0];
				secondValue = this.firstProperty.values[0];
			}
			else if (this.secondPropertyType === 'Q') {
				flashType = Module.input.QT_INPUTS;
				firstValue = this.secondProperty.values[0];
				secondValue = this.firstProperty.values[0];
			}
			else {
				return null;
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
			else {
				return null;
			}
		} else {
			return null;
		}

		try {
			const absState = Module.factory(this.thermoPkg, this.componentString);
			const z = new Module.VectorDouble();
			try {
				if (!this.mwts) {
					const mwts = [];
					for (let i = 0; i < this.nComponents; i++) {
						mwts.push(absState.get_fluid_constant(i, Module.parameters.imolar_mass) * 1000);
					}
					this.mwts = mwts;
				}
				if (this.moleX && this.moleX instanceof MMNumberValue && this.moleX.valueCount > 0) {
					for (let x of this.moleX.values) {
						z.push_back(x);
					}
					absState.set_mole_fractions(z);
				}
				else if (this.massX && this.massX instanceof MMNumberValue && this.massX.valueCount > 0) {
					for (let x of this.massX.values) {
						z.push_back(x);
					}
					absState.set_mass_fractions(z);
				}
				absState.update(flashType, firstValue, secondValue);
				const q = absState.keyed_output(Module.parameters.iQ);
				const bulk = {};
				bulk.q = MMNumberValue.scalarValue(q);
				bulk.t = MMNumberValue.scalarValue(
					absState.keyed_output(Module.parameters.iT),
					[0, 0, 0, 0, 1, 0, 0]
				);
				bulk.p = MMNumberValue.scalarValue(
					absState.keyed_output(Module.parameters.iP),
					[-1, 1, -2, 0, 0, 0, 0 ]
				)
				bulk.h = MMNumberValue.scalarValue(
					absState.keyed_output(Module.parameters.iHmolar),
					[2, 1, -2, 0, 0, -1, 0]
				);
				bulk.s = MMNumberValue.scalarValue(
					absState.keyed_output(Module.parameters.iSmolar),
					[2, 2, -2, 0, -1, -1, 0]
				);
				bulk.cp = MMNumberValue.scalarValue(
					absState.keyed_output(Module.parameters.iCpmolar),
					[2, 2, -2, 0, -1, -1, 0]
				);
				bulk.rho = MMNumberValue.scalarValue(
					absState.keyed_output(Module.parameters.iDmolar),
					[0, 1, 0, 0, 0, -3, 0]
				);
				bulk.mwt = MMNumberValue.scalarValue(
					absState.keyed_output(Module.parameters.imolar_mass),
					[0, 1, 0, 0, 0, -1, 0]
				);
				bulk.x = new MMNumberValue(this.nComponents, 1);
				const xValues = bulk.x.values;
				for (let i = 0; i < this.nComponents; i++) {
					xValues[i] = this.massX.values[i];
				}
				result = {b: bulk};
				
				if (q !== -1) {
					const liquid = {};
					liquid.q = MMNumberValue.scalarValue(q);
					liquid.t = MMNumberValue.scalarValue(
						absState.saturated_liquid_keyed_output(Module.parameters.iT),
						[0, 0, 0, 0, 1, 0, 0]
					);
					liquid.p = MMNumberValue.scalarValue(
						absState.saturated_liquid_keyed_output(Module.parameters.iP),
						[-1, 1, -2, 0, 0, 0, 0 ]
					)
					liquid.h = MMNumberValue.scalarValue(
						absState.saturated_liquid_keyed_output(Module.parameters.iHmolar),
						[2, 1, -2, 0, 0, -1, 0]
					);
					liquid.s = MMNumberValue.scalarValue(
						absState.saturated_liquid_keyed_output(Module.parameters.iSmolar),
						[2, 2, -2, 0, -1, -1, 0]
					);
					liquid.cp = MMNumberValue.scalarValue(
						absState.saturated_liquid_keyed_output(Module.parameters.iCpmolar),
						[2, 2, -2, 0, -1, -1, 0]
					);
					liquid.rho = MMNumberValue.scalarValue(
						absState.saturated_liquid_keyed_output(Module.parameters.iDmolar),
						[0, 1, 0, 0, 0, -3, 0]
					);
					liquid.mwt = MMNumberValue.scalarValue(
						absState.saturated_liquid_keyed_output(Module.parameters.imolar_mass),
						[0, 1, 0, 0, 0, -1, 0]
					);
					const x = absState.mole_fractions_liquid();
					liquid.x = new MMNumberValue(this.nComponents, 1);
					const xValues = liquid.x.values;
					for (let i = 0; i < this.nComponents; i++) {
						xValues[i] = x.get(i);
					}
					x.delete();
					result.l = liquid;

					const vapor = {};
					vapor.q = MMNumberValue.scalarValue(q);
					vapor.t = MMNumberValue.scalarValue(
						absState.saturated_vapor_keyed_output(Module.parameters.iT),
						[0, 0, 0, 0, 1, 0, 0]
					);
					vapor.p = MMNumberValue.scalarValue(
						absState.saturated_vapor_keyed_output(Module.parameters.iP),
						[-1, 1, -2, 0, 0, 0, 0 ]
					)
					vapor.h = MMNumberValue.scalarValue(
						absState.saturated_vapor_keyed_output(Module.parameters.iHmolar),
						[2, 1, -2, 0, 0, -1, 0]
					);
					vapor.s = MMNumberValue.scalarValue(
						absState.saturated_vapor_keyed_output(Module.parameters.iSmolar),
						[2, 2, -2, 0, -1, -1, 0]
					);
					vapor.cp = MMNumberValue.scalarValue(
						absState.saturated_vapor_keyed_output(Module.parameters.iCpmolar),
						[2, 2, -2, 0, -1, -1, 0]
					);
					vapor.rho = MMNumberValue.scalarValue(
						absState.saturated_vapor_keyed_output(Module.parameters.iDmolar),
						[0, 1, 0, 0, 0, -3, 0]
					);
					vapor.mwt = MMNumberValue.scalarValue(
						absState.saturated_vapor_keyed_output(Module.parameters.imolar_mass),
						[0, 1, 0, 0, 0, -1, 0]
					);
					const y = absState.mole_fractions_vapor();
					vapor.x = new MMNumberValue(this.nComponents, 1);
					const yValues = vapor.x.values;
					for (let i = 0; i < this.nComponents; i++) {
						yValues[i] = y.get(i);
					}
					y.delete();
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
				return null;
			}
			finally {
				console.log('flash cleanup');
				absState.delete()
				z.delete();
			}
		}
		catch(e) {
			this.setError('mmcool:flashThermoDefnError', {path: this.getPath()});
			return null;
		}
		return result;
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
	}
}