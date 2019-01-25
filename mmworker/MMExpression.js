'use strict';

/**
 * @class MMExpression
 * @extends MMTool
 * @member {MMValue} cachedValue;
 * @member {MMUnit} _displayUnit
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
		this._displayUnit = null;
		this._isInput = false;
		this._isOutput = false;
	}

	/** @override */
	get properties() {
		let d = super.properties;
		d['isInput'] = {type: PropertyType.boolean, readOnly: false};
		d['isOutput'] = {type: PropertyType.boolean, readOnly: false};
		d['displayUnit'] = {type: PropertyType.string, readOnly: false};
		return d;
	}

	get isInput() {
		return this._isInput;
	}

	set isInput(newValue) {
		this._isInput = (newValue) ? true : false;
	}
	
	get isOutput() {
		return this._isOutput;
	}

	set isOutput(newValue) {
		this._isOutput = (newValue) ? true : false;
	}
	
	get displayUnit() {
		return (this._displayUnit) ? this._displayUnit.name : null;
	}

	set displayUnit(unitName) {
		if (!unitName) {
			this._displayUnit = null;
		}
		else {
			const unit = theMMSession.unitSystem.unitNamed(unitName);
			if (!unit) {
				throw(this.t('mmunit:unknownUnit', {name: unitName}));
			}
			this._displayUnit = unit;
		}
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['value'] = this.jsonValue;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			value: 'mmcmd:?exprUseJsonValue'
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
			for (let requestor of this.valueRequstors) {
				requestor.forgetCalculated();
			}
			this.valueRequstors.clear();
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
	 * @method jsonValue
	 * command.results = json
	 */
	jsonValue(command) {
		let value = this.valueForRequestor();
		let rv = {}
		if (value) {
			if (value instanceof MMNumberValue) {
				if (this._displayUnit) {
					const unit = this._displayUnit;
					rv['unit'] = unit.name;
					rv['v'] = Array.from(value._values).map(x => unit.convertFromBase(x));
				}
				else {
					rv['v'] = Array.from(value._values);
					rv['unit'] = theMMSession.unitSystem.baseUnitWithDimensions(value.unitDimensions).name;
				}
				rv['t'] = 'n';
			}
			else if (value instanceof MMStringValue) {
				rv['t'] = 's';
				rv['v'] = value._values;
			} else {
				throw(this.t('mmcmd:unimplemented'));
			}
		}
		command.results = rv;
	}
}