'use strict';

/**
 * @class MMExpression
 * @extends MMTool
 * @member {MMValue} cachedValue;
 * @member {MMUnit} displayUnit
 * @member {Boolean} isInput;
 * @member {Boolean} isOutput;
 */
class MMExpression extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Expression');
		this.formula = new MMFormula('formula', this);
		this.cachedValue = null;
		this.displayUnit = null;
		this._isInput = false;
		this._isOutput = false;
	}

	/** @override */
	get properties() {
		let d = super.properties;
		d['isInput'] = {type: PropertyType.boolean, readOnly: false};
		d['isOutput'] = {type: PropertyType.boolean, readOnly: false};
		d['outputUnit'] = {type: PropertyType.string, readOnly: false};
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
				let model = this.parent.parent;
				if (model) {
					this.formula.nameSpace = model;
				}
				else {
					this.formula.nameSpace = this.parent;
				}
			}
			else {
				this.formula.nameSpace = this.parent;
			}
		}
	}
	
	get isOutput() {
		return this._isOutput;
	}

	set isOutput(newValue) {
		this._isOutput = (newValue) ? true : false;
	}
	
	get outputUnit() {
		return (this.displayUnit) ? this.displayUnit.name : null;
	}

	set outputUnit(unitName) {
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
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['value'] = this.valueCommand;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			value: 'mmcmd:?exprUseValue'
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}

	/**
	 * @method valueForRequestor
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueForRequestor(requestor) {
		if (!this.cachedValue) {
			this.cachedValue = this.formula.value();
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
			for (let requestor of this.valueRequestors) {
				requestor.forgetCalculated();
			}
			this.valueRequestors.clear();
			super.forgetCalculated();
			this.cachedValue = null;
			this.forgetRecursionBlockIsOn = false;
		}
	}

	/**
	 * @override valueDescribedBy
	 * @param {String} description
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueDescribedBy(description, requestor) {
		let value = this.valueForRequestor(requestor);
		if (description) {
			const lcDescription = description.toLowerCase();
			switch (lcDescription) {
				case 'hasvalue':
					self.addRequestor(requestor);
					if (value) {
						value = MMNumberValue.scalarValue(1);
					}
					else {
						value = MMNumberValue.scalarValue(0);
					}
					break;
				case 'formula':
					if (this.formula._formula) {
						this.addRequestor(requestor);
						value = MMStringValue.scalarValue(this.formula._formula);
					}
					else {
						value = null;
					}
					break;
				case 'table':
					this.setError('mmcmd:unimplemented', {feature: 'expression table property'})
					value = null;
					break;
				default: {
					if (value instanceof MMToolValue) {
						let tool = value.valueAtRowColumn(1,1);
						value = tool.valueDescribedBy(description, requestor);
					}
					/*
					else if (value instanceof MMTableValue) {
						value = value.columnNamed(description).value;
					}*/
					else {
						value = super.valueDescribedBy(description, requestor);
					}
				}
			}
		}
		return value;
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
	 * @method toolViewInfo
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	toolViewInfo(command) {
		super.toolViewInfo(command);
		let results = command.results;
		const value = this.valueForRequestor();
		results['formulaPath'] = this.getPath() + '.formula';
		results['formula'] = this.formula._formula;
		results['isInput'] = this._isInput;
		results['isOutput'] = this._isOutput;
		results['value'] = this.jsonValue();
	}

	jsonValue() {
		let value = this.valueForRequestor();
		let json = {}
		if (value) {
			json = value.jsonValue(this.displayUnit);
		}
		return json;
	}

	/**
	 * @method valueCommand
	 * command.results = json
	 */
	valueCommand(command) {
		command.results = this.jsonValue();
	}

	/**
	 * @method saveObject
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o=   super.saveObject();
		o['Type'] = 'Expression';
		o['Formula'] = this.formula._formula;
		if (this._isInput) { o['isInput'] = 'y'; }
		if (this._isOutput) { o['isOutput'] = 'y'}
		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		super.initFromSaved(saved);
		this.formula.formula = saved.Formula;
		this.isInput = (saved.isInput === 'y');
		this.isOutput = (saved.isOutput === 'y');
	}
}