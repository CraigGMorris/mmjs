/**
 * @class MMSession - base Math Minion class
 * @member {MMUnitSystem} unitSystem
 */
class MMSession extends MMCommandParent {
	/**
	 * @constructor
	 * @param {Object} processor - MMCommandProcessor
	 */
	constructor(processor) {
		super('root',  processor, 'MMSession');
		// construct the unit system - it will add itself to my children
		new MMUnitSystem(this);
	}
}