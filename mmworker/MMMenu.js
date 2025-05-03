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
	MMNumberValue:readonly
	MMPropertyType:readonly
*/

/**
 * @class MMMenu
 * @extends MMTool
 * display tool for a menu value
 */
// eslint-disable-next-line no-unused-vars
class MMMenu extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Menu');
		this.optionsFormula = new MMFormula('options', this);
		this.isLoadingCase = false;
		this.isOutput = true;
		this._selected = 0;
	}

		/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o = super.saveObject();
		o['Type'] = 'Menu';
		o['optionsFormula'] = {Formula: this.optionsFormula.formula}
		o['selected'] = this._selected;
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
			this.optionsFormula.formula = saved.optionsFormula.Formula;
			this._selected = saved.selected || 0;
		}
		finally {
			this.isLoadingCase = false;
		}
	}

	/** @override */
	get properties() {
		let d = super.properties;
		d['selected'] = {type: MMPropertyType.int, readOnly: false};
		return d;
	}

	get selected() {
		return this._selected;
	}
	
	set selected(newValue) {
		if (this._selected !== newValue) {
			this._selected = newValue;
			this.forgetCalculated();
		}
	}
	
	/**
	 * @method inputSources
	 * @override
	 * @returns {Set} contains tools referenced by this tool
	 */
	inputSources() {
		let sources = super.inputSources();
		this.optionsFormula.addInputSourcesToSet(sources);		
		return sources;
	}

	/** @override */
		get verbs() {
			let verbs = super.verbs;
			return verbs;
		}
	
		/** @method getVerbUsageKey
		 * @override
		 * @param {string} command - command to get the usage key for
		 * @returns {string} - the i18n key, if it exists
		 */
		getVerbUsageKey(command) {
			let key = {
				select: 'mmcmd:_menuSelect',
			}[command];
			if (key) {
				return key;
			}
			else {
				return super.getVerbUsageKey(command);
			}
		}

	/**
	 * @method parameters
	 * i.e. things that can be appended to a formula value
	 */
	parameters() {
		let p = super.parameters();
		p.push('selected');
		p.push('label');

		return p;
	}

	/**
	 * @override valueDescribedBy
	 * @param {String} description
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueDescribedBy(description, requestor) {
		if (!description) {
			description = 'selected';
		}
		const lcDescription = description.toLowerCase();
		const options = this.optionsFormula.value();
		if (!options) {
			return null;
		}
		if (this._selected >= options.rowCount) {
			this.selected = options.rowCount ? 0 : -1;
		}
		switch (lcDescription) {
			case 'selected':
				if (this._selected !== null && this._selected >= 0) {
					const valueColumnNumber = options.columnCount > 1 ? 2 : 1;
					const selectedValue = options.valueForIndexRowColumn(
						MMNumberValue.scalarValue(this._selected + 1),
						MMNumberValue.scalarValue(valueColumnNumber)
					);
					if (selectedValue) {
						this.addRequestor(requestor)
					}
					return selectedValue;
				}
				break;
			case 'label':
				if (this._selected !== null && this._selected >= 0) {
					const labelValue = options.valueForIndexRowColumn(
						MMNumberValue.scalarValue(this._selected + 1),
						MMNumberValue.scalarValue(1)
					);
					if (labelValue) {
						this.addRequestor(requestor)
					}
					return labelValue;
				}
				break;
			default:
				return super.valueDescribedBy(description, requestor);
		}
	}
	
	/**
	 * @method htmlValue
	 * @returns {String}
	 */
	htmlValue(requestor) {
		this.addRequestor(requestor);
		const options = this.optionsFormula.value();
		const lines = [`<div  class="menu-tool">`]
		lines.push(`<select class="menu-select" id="menu__${this.name}"`);
		lines.push(` onChange="
			const newValue = document.getElementById('menu__${this.name}').selectedIndex;
			mmpost([], {mm_cmd: '${this.getPath()} set selected ' + newValue,
			mm_undo: '${this.getPath()} set selected ' + ${this._selected},
			mm_update: true});
			">`);

		if (options) {
			const optionCount = options.rowCount;
			if (this._selected >= optionCount) {
				this.selected = optionCount ? 0 : -1;
			}
			for (let optionNumber = 0; optionNumber < optionCount; optionNumber++) {
				const value = options.stringForRowColumnUnit(optionNumber + 1, 1);
				lines.push(`<option${optionNumber === this._selected ? ' selected' : ''}>${value}</option>`);
			}
		}
		lines.push('</select>');
		lines.push('</div>');
		return lines.join('\n');
	}

	/**
	 * @method toolViewInfo
	 * @override
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	async toolViewInfo(command) {
		await super.toolViewInfo(command);
		const results = command.results;
		results['optionsFormulaName'] = 'optionsFormula';
		results['optionsFormula'] = this.optionsFormula.formula;
		const options = this.optionsFormula.value();
		const optionValues = [];
		const optionLabels = [];
		if (options) {
			const optionCount = options.rowCount;
			const valueColumnNumber = options.columnCount > 1 ? 2 : 1;		
			for (let optionNumber = 0; optionNumber < optionCount; optionNumber++) {
				const value = options.stringForRowColumnWithUnit(optionNumber + 1, valueColumnNumber);
				optionValues.push(value);
				const label =  options.stringForRowColumnUnit(optionNumber + 1, 1);
				optionLabels.push(label);
			}
		}

		results['optionLabels'] = optionLabels;
		results['optionValues'] = optionValues;
		results['selected'] = this._selected;
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
			}
			finally {
				this.forgetRecursionBlockIsOn = false;
			}
		}
	}	
}
