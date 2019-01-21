'use strict';

/**
 * @class MMExpression
 * @extends MMTool
 * @member {MMValue} cachedValue;
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
//			addTool: 'mmcmd:?modelUseAddTool'
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
	 */
	valueForRequestor(requestor) {
		if (!this.cachedValue) {
			this.cachedValue = this.formula.value;
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
}