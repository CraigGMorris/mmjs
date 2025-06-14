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
	theMMSession:readonly
	MMModel:readonly
	MMNumberValue:readonly
	MMStringValue:readonly
	MMToolValue:readonly
	MMTableValue:readonly
	MMTableValueColumn:readonly
	MMJsonValue: readonly
	MMPropertyType:readonly
	MMUnitSystem:readonly
*/

/**
 * @class MMExpression
 * @extends MMTool
 */
// eslint-disable-next-line no-unused-vars
class MMExpression extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Expression');
		this.formula = new MMFormula('Formula', this);
		this.cachedValue = null;		// MMValue - retained until forgotten
		this.displayUnit = null;		// MMUnit - for number values
		this.tableUnits = null;		// dictionary of optional table column display MMUnits 
		this._isInput = false;			// boolean
	}

	/** @override */
	get properties() {
		let d = super.properties;
		d['isInput'] = {type: MMPropertyType.boolean, readOnly: false};
		d['showInput'] = {type: MMPropertyType.boolean, readOnly: false};
		d['displayUnitName'] = {type: MMPropertyType.string, readOnly: false};  // for scalar displayUnit
		d['format'] = {type: MMPropertyType.string, readOnly: false}; // for scalar display
		return d;
	}

	get isInput() {
		return this._isInput;
	}

	set isInput(newValue) {
		let newInput = (newValue) ? true : false;

		if (newInput !== this._isInput ) {
			this._isInput = newInput;
			if (newInput) {
				// nameSpace will be parent model, but
				// check to ensure this isn't the root model and so actually has parent model
				this.formula.nameSpace = this.parent.parent instanceof MMModel ? this.parent.parent : this.parent;
			}
			else {
				this.formula.nameSpace = this.parent;
			}
		}
	}
	
	get showInput() {
		return this._showInput;
	}

	set showInput(newValue) {
		let newInput = (newValue) ? true : false;

		if (newInput !== this._showInput ) {
			this._showInput = newInput;
			this.parent.forgetCalculated();
		}
	}

	get displayUnitName() {
		return (this.displayUnit) ? this.displayUnit.name : null;
	}

	set displayUnitName(unitName) {
		if (this.displayUnit && this.displayUnit.name === unitName) {
			return;
		}
		this.tableUnits = null;
		if (!unitName) {
			this.displayUnit = null;
		}
		else {
			const unit = theMMSession.unitSystem.unitNamed(unitName);
			if (!unit) {
				throw(this.t('mmunit:unknownUnit', {name: unitName}));
			}
			this.displayUnit = unit;
		}
		this.forgetCalculated();
	}

	get format() {
		return this._format;
	}

	set format(format) {
		this._format = format;
		this.forgetCalculated();
	}

	/**
	 * @method defaultFormulaUnit
	 * @override
	 * returns null or a unit to be used for a bare numeric constant in the named formula
	 * for an expression there is only one formula, so the name is ignored
	 * @param {String} formulaName
	 * @returns {MMUnit}
	 */
	// eslint-disable-next-line no-unused-vars
	defaultFormulaUnit(formulaName) {
		return this.displayUnit;
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['value'] = this.valueCommand;
		verbs['setcolumnunit'] = this.setColumnUnitCommand;
		verbs['setcolumnformat'] = this.setColumnFormatCommand;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			value: 'mmcmd:_toolValue',
			setcolumnunit: 'mmcmd:_exprSetColumnUnit',
			setcolumnformat: 'mmcmd:_exprSetColumnFormat',
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
	 * @override
	 * i.e. things that can be appended to a formula value
	 */
	parameters() {
		let p = super.parameters();
		p.push('table');
		p.push('hasValue');
		p.push('formula');
		const v = this.valueForRequestor();
		if (v instanceof MMTableValue) {
			for (const column of v.columns) {
				p.push(column.name);
			}
		}
		else if (v instanceof MMToolValue) {
			if (v._values && v._values[0]) {
				p = v._values[0].parameters();
			}
		}
		return p;
	}

	/**
	 * @method valueForRequestor
	 * @override
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueForRequestor(requestor) {
		if (!this.cachedValue) {
			this.cachedValue = this.formula.value();
			if (this.cachedValue instanceof MMTableValue) {
				if (this.tableFormats) {
					const tv = this.cachedValue;
					for (let i in this.tableFormats) {
						if (tv.columns[i-1]) {
							tv.columns[i-1].format = this.tableFormats[i];
						}
					}
				}
				if (this.tableUnits) {
					const tv = this.cachedValue;
					for (let i in this.tableUnits) {
						if (tv.columns[i-1]) {
							tv.columns[i-1].displayUnit = this.tableUnits[i];
						}
					}
				}
			}
			else if (this.cachedValue instanceof MMNumberValue) {
				if (
					this.format && this.format !== this.cachedValue.displayFormat ||
					this.displayUnit && this.displayUnit !== this.cachedValue.displayFormat
				) {
					this.cachedValue = this.cachedValue.copyOf();
					if (this.format) {
						this.cachedValue.displayFormat = this.format;
					}
					if (this.displayUnit && MMUnitSystem.areDimensionsEqual(
							this.displayUnit.dimensions,
							this.cachedValue.unitDimensions))
					{
						this.cachedValue.displayUnit = this.displayUnit;
					}
				}
			}
		}
		if (requestor && this.cachedValue) {
			this.addRequestor(requestor);
		}
		return this.cachedValue;
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
				this.cachedValue = null;
				this.formula.parseFormula();
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
		let rv = null;	// return value
		if (this.formula && this.formula.formula && this.formula.formula.startsWith('$')) {
			// any reference to self will be recursive - see if Tool can handle it.
			return super.valueDescribedBy(description, requestor);
		}
		let value = this.valueForRequestor(requestor);
		if (description) {
			const lcDescription = description.toLowerCase();
			switch (lcDescription) {
				case 'hasvalue':
					if (value) {
						rv = MMNumberValue.scalarValue(1);
					}
					else {
						rv = MMNumberValue.scalarValue(0);
					}
					break;
				case "value":
					if (value instanceof MMToolValue) {
						rv = value.valueDescribedBy(description, requestor); 
					}
					else {
						rv = value;
					}
					break;
				case 'formula':
					if (this.formula.formula != null) {
						rv = MMStringValue.scalarValue(this.formula.formula);
					}
					break;
				case 'table':
					if (!(value instanceof MMTableValue)) {
						if (value instanceof MMToolValue) {
							const tool = value._values[0];
							rv = tool.valueDescribedBy(description, requestor);
						}
						else {
							const columnCount = value.columnCount;
							const columns = [];
							const rowIndex = MMNumberValue.scalarValue(0);
							const columnIndex = MMNumberValue.scalarValue(0);
							for (let i = 1; i <= columnCount; i++) {
								columnIndex._values[0] = i;
								const columnValue = value.valueForIndexRowColumn(rowIndex, columnIndex);
								const displayUnit = (columnValue instanceof MMNumberValue)
									? theMMSession.unitSystem.defaultUnitWithDimensions(columnValue.unitDimensions)
									: null;
								const columnName = `${i}`;
								const column = new MMTableValueColumn({
									name: columnName,
									displayUnit: displayUnit ? displayUnit.name : null,
									value: columnValue
								});
								columns.push(column);
							}
							rv = new MMTableValue({columns: columns});
						}
					}
					else {
						rv = value;
					}
					break;

				default: {
					if (value instanceof MMTableValue) {
						const column = value.columnNamed(description);
						rv = column ? column.value : null;
						if (rv && column) {
							if (column.format) {
								rv.displayFormat = column.format;
							}
							if (column.displayUnit) {
								rv.displayUnit = column.displayUnit;
							}
						}
					}
					else if (value instanceof MMToolValue) {
						rv = value.valueDescribedBy(description, requestor);
					}
					else if (value instanceof MMJsonValue) {
						rv = value.valueForDescription(description);
					}
					if (!rv) {
						rv = super.valueDescribedBy(description, requestor);
					}
				}
			}
		}
		else {
			rv = value;
		}

		if (rv && requestor) {
			this.addRequestor(requestor);
		}
		return rv;
	}

		/**
	 * @method inputSources
	 * @override
	 * @returns {Set} contains tools referenced by this tool
	 */
	inputSources() {
		let sources = super.inputSources();
		if (!this._isInput) {
			this.formula.addInputSourcesToSet(sources);
		}
		return sources;
	}

	/**
	 * @method formulaList
	 * @returns [] contains formulae contained by this tool and its children
	 */
	formulaList() {
		return [this.formula];
	}

	/**
	 * @method toolViewInfo
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	async toolViewInfo(command) {
		await super.toolViewInfo(command);
		let results = command.results;
		this.valueForRequestor();
		results['formulaName'] = 'formula';
		results['formula'] = this.formula.formula;
		results['isInput'] = this._isInput;
		results['showInput'] = this._showInput;
		results['value'] = this.jsonValue();
		if (this._isInput && this.parent.parent && this.parent.parent instanceof MMModel) {
			results['modelPath'] = this.parent.parent.getPath();
		}
	}

	jsonValue() {
		let value = this.valueForRequestor();
		let json = {}
		if (value) {
			let displayUnit;
			let formats;
			if (value instanceof MMTableValue) {
				displayUnit = this.tableUnits;
				formats = this.tableFormats;
			}
			else {
				displayUnit = this.displayUnit || this.cachedValue.displayUnit;
				formats = this.cachedValue.displayFormat;
				if (displayUnit && !MMUnitSystem.areDimensionsEqual(displayUnit.dimensions, value.unitDimensions)) {
					displayUnit = null;  // display unit is wrong type - ignore and use default
				}
			}
			json = value.jsonValue(displayUnit, formats);
		}
		return json;
	}

	/**
	 * @method htmlValue
	 * @returns {String}
	 */
	htmlValue(requestor) {
		const value = this.valueForRequestor();
		if (value instanceof MMToolValue) {
			const lines = [];
			for (const v of value.values) {
				if (v) {
					lines.push(v.typeName + ': ' + v.name + '<br>');
				}
			}
			return lines.join('\n');
		}
		else {
			return super.htmlValue(requestor);
		}
	}

	/**
	 * @method valueCommand
	 * @param {MMCommand} command
	 * command.results = json
	 */
	valueCommand(command) {
		command.results = this.jsonValue();
	}

	/**
	 * @method setColumnUnitCommand
	 * @param {MMCommand} command
	 * command.args should contain columnNumber unitName
	 * command.results = unitName if successful
	 */
	setColumnUnitCommand(command) {
		const parts = command.args.split(/\s/);
		if (parts.length === 2) {
			const unit = theMMSession.unitSystem.unitNamed(parts[1]);
			if (unit) {
				if (!this.tableUnits) {
					this.tableUnits = {};
				}
				if (this.tableUnits[parts[0]] != unit) {
					this.tableUnits[parts[0]] = unit;
					this.displayUnit = null;
					command.results = parts[1];
					this.forgetCalculated();
				}
				return;
			}
		}
		else if (this.tableUnits && this.tableUnits[parts[0]]) {
			delete this.tableUnits[parts[0]];
			command.results = '';
			this.forgetCalculated();
			return;
		}
	}

	/**
	 * @method setColumnFormatCommand
	 * @param {MMCommand} command
	 * command.args should contain columnNumber formatString
	 * command.results = format
	 */
	setColumnFormatCommand(command) {
		const parts = command.args.split(/\s/);
		if (parts.length === 2) {
			if (!this.tableFormats) {
				this.tableFormats = [];
			}
			if (this.tableFormats[parts[0]] != parts[1]) {
				this.tableFormats[parts[0]] = parts[1];
				this.forgetCalculated();
			}
			command.results = parts[1];
			return;
		}
		else if (this.tableFormats && this.tableFormats[parts[0]]) {
			delete this.tableFormats[parts[0]];
			this.forgetCalculated();
			command.results = '';
			return;
		}
	}

/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		if (this.savedInvalid) {
			// expression created to hold an unknown tool when session was imported
			// retrieve the json from the formula
			const savedFormula = this.formula.formula.split('\n');
			// remove first three lines
			savedFormula.shift(); savedFormula.shift(); savedFormula.shift();
			try {
				return JSON.parse(savedFormula.join('\n'));
			}
			catch(e) {
				console.log(`could not parse invalid tool ${this.getPath()}`);
				// fall through and just save expression as normal
			}
		}
		let o=   super.saveObject();
		o['Type'] = 'Expression';
		o['Formula'] = {'Formula': this.formula.formula};
		if (this._isInput)			{ o['isInput'] = 'y'; }
		if (this._showInput)			{ o['showInput'] = 'y'; }
		if (this.displayUnit)		{ o['displayUnit'] = this.displayUnit.name; }
		if (this.tableUnits) {
			const units = {};
			Object.entries(this.tableUnits).forEach(([key, unit]) => {
				units[key] = unit.name;
			});
			o['tableUnits'] = units;
		}
		if (this.tableFormats) { o['tableFormats'] = this.tableFormats; }
		if (this.format) { o['format'] = this.format; }
		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		super.initFromSaved(saved);
		this.formula.formula = saved.Formula.Formula;
		this.isInput = (saved.isInput === 'y');
		this.showInput = (saved.showInput === 'y');
		if (saved.displayUnit) {
			this.displayUnit = theMMSession.unitSystem.unitNamed(saved.displayUnit);
		}
		if (saved.tableUnits) {
			this.tableUnits = {};
			Object.entries(saved.tableUnits).forEach(([key, unitName]) => {
				const unit = theMMSession.unitSystem.unitNamed(unitName);
				if (unit) {
					this.tableUnits[key] = unit;
				}
			});
		}
		if (saved.tableFormats) { this.tableFormats = saved.tableFormats; }
		if (saved.format) { this.format = saved.format; }
	}
}