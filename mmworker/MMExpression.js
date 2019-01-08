'use strict';

/**
 * @class MMExpression
 * @extends MMTool
 * @member {MMFormula} formula
 */
class MMExpression extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Expression');
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
}