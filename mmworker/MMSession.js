'use strict';

/** @class MMPoint
 * simple point class
 * @member {number} x
 * @member {number} y
 */
class MMPoint {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}

/**
 * @class MMSession - base Math Minion class
 * @extends MMCommandParent
 * @member {MMSession} - this
 * @member {MMModel} rootModel;
 * @member {MMPoint} unknownPosition
 */
class MMSession extends MMCommandParent {
	/**
	 * @constructor
	 * @param {Object} processor - MMCommandProcessor
	 */
	constructor(processor) {
		super('session',  processor, 'MMSession');
		// construct the unit system - it will add itself to my children
		new MMUnitSystem(this);
		this.nextToolLocation = this.unknownPosition;
		//this.rootModel = new MMModel('root', this);
		this.rootModel = MMToolTypes['Model'].factory('root', this);
	}

	get	session() {
		return this;
	}

	get unknownPosition() {
		return new MMPoint(-12321, -12321);
	}

}

const MMToolTypes = {
	'Model': {
		factory: (name, parent) => { return new MMModel(name, parent)},
		displayName: new MMCommandMessage('mmcmd:modelDisplayName'),
		shortDescription: new MMCommandMessage('mmcmd:modelShortDescription'),
		rgbaColor: [.9, 1, 1, .8]
	},
	"Expression": {
		factory: (name, parent) => {return new MMExpression(name, parent)},
		displayName: new MMCommandMessage('mmcmd:exprDisplayName'),
		shortDescription: new MMCommandMessage('mmcmd:exprShortDescription'),
		rgbaColor: [.97, .97, .9, .8]
	}
};

/**
 * @class MMTool - base class for all calculation tools
 * @extends MMCommandParent
 * @member {MMSession} session;
 * @member {string} notes
 * @member {string} description
 * @member {string} displayName
 * @member {string} typeName
 * @member {boolean} forgetRecursionBlockIsOn;
 * @member {boolean} isHidingInfo;
 * @member {Set<MMTool>} valueRequestors;
 * @member {MMPoint} position;
 * @member {boolean} showNotesOnDiagram;
 */
class MMTool extends MMCommandParent {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 * @param {string} typeName
	 */
	constructor(name, parentModel, typeName) {
		super(name, parentModel, 'MM' + typeName);
		this.typeName = typeName;  // temporary until objectTypes is defined
		this.notes = '';
		this.valueRequstors = new Set([]);
		this.forgetRecursionBlockIsOn = false;
		this.isHidingConnections = false;
		this.position = this.session.nextToolLocation;
		this.session.nextToolLocation = this.session.unknownPosition;
	}

	get properties() {
		let d = super.properties;
		d['displayName'] = {type: PropertyType.string, reaoOnly: true};
		d['description'] = {type: PropertyType.string, readOnly: true};
		d['notes'] = {type: PropertyType.string, readOnly: false};
		return d;
	}

	get displayName() {
		let toolType = MMToolTypes[this.typeName];
		return this.t(toolType.displayName);
	}
/*
	get notes() {
		return this.notes;
	}

	set notes(newNote) {
		this.notes = newNote;
	}
*/
	get description() {
		if (this.notes) {
			let maxLength = 50;
			if ( this.notes.length <= maxLength) {
				return myNotes;
			}	else {
				return this.notes.substring(0, maxLength-1);
			}
		}
		return this.notes;
	}

	/**
	 * @method orderOfCopy
	 * @returns {string} string position representation for sorting
	 */
	orderOfCopy() {
		let x = this.position.x + 1e6;
		let y = this.position.y + 1e6;
		return `${x}${y}`;
	}

	get	session() {
		return this.parent.session;
	}
}