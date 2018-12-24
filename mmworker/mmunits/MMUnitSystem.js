'use strict';

/**
 * @enum {number} MMDimensionType
 */
const MMUnitDimensionType = Object.freeze({
	LENGTH: 0,
	MASS: 1,
	TIME: 2,
	CURRENT: 3,
	TEMPERATURE: 4,
	MOLE: 5,
	LUMINOUS: 6,
	NUMDIMS: 7
});

/**
 * @enum {number} MMUnitCalcType
 * How the unit is calculated
 */
const MMUnitCalcType = Object.freeze({
	COMPOUND: 0,	// the scale factor is calculated from the base units making up the unit.
								// all other types are base units and cannot have the /-^ characters in the name
	SCALE: 		1,	// dimensions and scale must be supplied.
	OFFSET: 	2,	// Conversion consists of a scale plus an offset - for instance degF or gauge pressure.
	INVERSE: 	3,	// conversion is scale/(value + offset) - for example API gravity
	DATETIME: 4		// seconds since beginning of 1970 into yyyymmdd.hhmmss form
});

/**
 * @class MMUnitSystem
 * This class implements a physical unit conversion system based
 * on every unit having defined exponents of the seven fundemental properties

 * (Length (m), Mass (kg), Time (s), Electric Current (A), Temperature (K)
 * Amount of substance (mol), Luminous intensity (cd)
 * 
 * Unit types can be defined in terms of these dimensions, with more than one type
 * having the same dimensions such as Volume and Large_Volume.  Sets (SI, Field for
 * for example) are defined which associate a compatible unit with each defined type.

 * Compound units are created from basic units with the operators /-^
 * There should only be on / dividing the unit into numerator and denominator
 * The - seporates terms in the numerator and denominator (effectively times)
 * The ^ is used to raise a basic unit to an integer or real power (i.e. m^3)
 * @member {MMUnitsContainer} units
 */
class MMUnitSystem extends MMCommandParent {
	/**
	 * @constructor
	 * @param {Object} session - MMSession - parent session
	 */
	constructor(session) {
		super('unitsys',  session, 'MMUnitSystem');
		new MMUnitsContainer(this);
		new MMUnitSetsContainer(this);
	}

	/** @returns {MMUnitsContainer} */
	get units() {
		return this.children['units'];
	}

	/** @method findNamePartsInString
	 * Parses the term (either a numerator or denominator of a compound unit)
	 * and returns and array of parts, each consisting of a tuple containing a
	 * unit and its exponent
	 * @param {string} term
	 */
	findNamePartsInString(term) {
		let parts = [];
		if (term.length == 0) {
			return parts;
		}
		let tokens = term.split('-');
		for (let token of tokens) {
			let exponent = 1.0;
			let exponentParts = token.split('^');
			let exponentPartsCount = exponentParts.length;
			if (exponentPartsCount > 2) {
				throw(this.t('mmcmd:unitExponentError', {term: term}));
			}
			else if (exponentPartsCount == 2) {
				exponent = parseFloat(exponentParts[1]);
			}
			let consituentUnit = this.units.childNamed(exponentParts[0]);
			if (consituentUnit || exponentParts[0] != '1') {
				if (consituentUnit.calcType == MMUnitCalcType.COMPOUND ||
					consituentUnit.calcType == MMUnitCalcType.SCALE)
				{
					parts.push([consituentUnit, exponent]);
				}
				else {
					throw(this.t('mmcmd:unitPartInvalid', {term: exponentParts[0]}));
				}
			}
			else if (exponentParts[0] !== '1') {
				throw(this.t('mmcmd:unitPartInvalid', {term: exponentParts[0]}));
			}
		}
		return parts;
	}

	/** @method unitNamed
	 * @param {string} name
	 * @returns {MMUnit}
	*/
	unitNamed(name) {
		if (!name) {
			return null;
		}

		let unit = this.units.childNamed(name);
		if (unit) {
			return unit;
		}

		// see if unit can be built
		if (MMUnit.compoundRegex.test(name)) {
			let parts = name.split(MMUnit.compoundRegex);
			for (let part of parts) {
				let value = Number(part);
				if ( value ==NaN && !this.units.childNamed(part)) {
					return null;
				}
			}
		}
		return this.units.addUnit(name, '0', true);
	}
}

/**
 * @class MMUnit
 * Unit in unit system
 * Key attributes:
 * @member {string} name
 * 		for basic units this must be an alphanumeric with no spaces
 * 		compound units are created from basic units with the operators /-^
 * 		There should only be one / dividing the unit into numerator and denominator
 * 		The - seporates terms in the numerator and denominator (effectively times)
 * 		The ^ is used to raise a basic unit to an integer or real power (i.e. m^3)
 * 
 * @member {number[]} dimensions
 * 		Represents SI base entities powers with a double array in order
 * 		(Length (m), Mass (kg), Time (s), Electric Current (A), Temperature (K)
 * 		Amount of substance (mol), Luminous intensity (cd)
 * 		The enum MMUnitDimensionType provides the index of a property in the array
 * 
 * 		each number represents the power of that entity in the unit.  Thus velocity would be
 * 		(1, 0, -1, 0, 0, 0, 0) and density  would be (-3, 1, 0, 0, 0, 0, 0)
 * 		Note that force is (1, 1, -2, 0, 0, 0, 0)
 * 		and thus pressure is (-1, 1, -2, 0, 0, 0, 0)
 * 		Energy is (2, 1, -2, 0, 0, 0, 0)
 * 
 * @member {string} dimensionString - read only string version of dimensions
 * 
 * @member {MMUnitCalcType} calcType
 * 		integer (enum MMUnitCalcType) indicating how the conversion is calculated
 * 		COMPOUND (0) or SCALE (1) - simple scaling.
 * 			If COMPOUND, then the scale factor is calculated from the base
 * 			units making up the unit.
 * 			If SCALE, then it is a base unit and the scale must be supplied.
 * 			Base units cannot have the /-^ characters in the name
 * 			Only base units (i.e. SCALE (1)) can make up compound units (COMPOUND (0))
 * 		OFFSET (2) - Conversion consists of a scale plus an offset - for instance degF or gauge pressure.
 * 		INVERSE (3_ - conversion is scale/(value + offset) - for example API gravity
 * 		DATETIME (4) - datetime conversion seconds since beginning of 1970 into yyyymmdd.hhmmss form
 * 
 * @member {number} scale - scale factor
 * @member {number} offset - double offset factor
 * @member {string} notes - any text comment on origin of unit etc.
 * @member {boolean} isMaster - boolean designating that the unit is part of the set distributed with the program
 * 		non master units are user units that will not be disturbed when the program is updated
 * @member {MMUnitSystem} unitSystem;
 */
class MMUnit extends MMCommandObject {
	/** @static compoundRegex
	 * compound unit operators
	 */
	static get compoundRegex() {return /[/\-\^]/};

	/** @static stringFromDimensions
	 * creates dimensions string from Number array
	 * @param {number[]} dimensions
	 */
	static stringFromDimensions(dimensions) {
		return dimensions.map(n => String(n)).join(' ');
	}

	/** @constructor
	 * @param {string} name
	 * @param {MMUnitsContainer} unitsContainer
	 * result will need to have one of the init methods called on it
	*/
	constructor(name, unitsContainer) {
		super(name, unitsContainer, 'MMUnit');
	}

	get unitSystem() {
		return this.parent.unitSystem;
	}

	get dimensionString() {
		return MMUnit.stringFromDimensions(this.dimensions);
	}
	
	get properties() {
		let d = super.properties;
		d['scale'] = {type: PropertyType.float, readOnly: false};
		d['offset'] = {type: PropertyType.float, readOnly: false};
		d['notes'] = {type: PropertyType.string, readOnly: false};
		d['isMaster'] = {type: PropertyType.boolean, readOnly: true};
		d['calcType'] = {type: PropertyType.int, readOnly: true};
		d['dimensionString'] = {type: PropertyType.string, readOnly: true};
		return d;
	}

	/** @method initWithDescription
	 * @param {boolean} isMaster - false for user added
	 * @param {string} description - either a compound unit or string of space separated numbers
	 * consisting of the calculation type, followed by the seven dimension powers and
	 * optionally scale and offset.
	 * if scale and offset aren't suppled they will default to 1 and 0
	 */
	initWithDescription(isMaster, description) {
		this.isMaster = isMaster;
		try {
			this.scale = 1.0;		// default values
			this.offset = 0.0;
			let parts = description.split(' ');
			this.calcType = parseInt(parts[0]);
			if (this.calcType == MMUnitCalcType.COMPOUND) {	// construct from base units
				this.initCompoundWithDescription(this.name);
			}
			else {  // base unit - name should not contain operators
				if (MMUnit.compoundRegex.test(this.name)) {
					throw(this.t('mmcmd:operatorInBase', {name: this.name}));
				}
				
				// convert the dimension string to numbers
				this.dimensions = [];
				for (let i = 1; i <= MMUnitDimensionType.NUMDIMS; i++) {
					this.dimensions.push(parseInt(parts[i]));
				}

				let i = MMUnitDimensionType.NUMDIMS + 1;
				if (parts.length > i) {
					this.scale = Number(parts[i]);
					i++;
					if (parts.length > i) {
						this.offset = Number(parts[i]);
					}
				}
			}
		}
		catch(e) {
			if (e instanceof MMCommandMessage) {
				throw(e);
			}
			else if (e instanceof Error) {
				throw(e.message);
			}
			else {
				throw(this.t('mmcmd:badUnitDescription', {name: this.name, description: description}));
			}
		}
		return this;
	}

	/** @method initWithOperation
	 * @param {boolean} isMaster
	 * @param {MMUnitCalcType} calcType
	 * @param {string} dimensionString
	 * @param {number} scale
	 * @param {number} offset
	 */
	initWithOperation(isMaster, calcType, dimensionString, scale, offset) {
		this.isMaster = isMaster
		this.calcType = calcType

		try {
			if (calcType === MMUnitCalcType.COMPOUND) {	// construct from base units
				this.scale = 1.0;	// default units
				this.offset = 0.0;
				this.initCompoundWithDescription(this.name)
			}
			else {	// base unit - should not contain operators
				if (MMUnit.compoundRegex.test(this.name)) {
					throw(this.t('mmcmd:operatorInBase', {name: this.name}));
				}
				// convert the dimension string to numbers
				this.dimensions = [];
				for (let i = 1; i <= MMUnitDimensionType.NUMDIMS; i++) {
					this.dimensions.push(parseInt(parts[i]));
					this.scale = scale;
					this.offset = offset;
				}
			}
		}
		catch(e) {
			if (e instanceof MMCommandMessage) {
				throw(e);
			}
			else {
				throw(this.t('mmcmd:badUnitDescription', {name: this.name, description: description}));
			}
		}
		return this;
	}

	/** @method initWithUserDefinition
	 * @param {number} value - multiplier of scale defined by definition
	 * @param {string} definition - should resolve to a unit
	 */

	initWithUserDefinition(value, definition) {
		this.isMaster = false;
		this.calcType = MMUnitCalcType.COMPOUND;	// construct from base units
		this.scale = 1.0;
		this.offset = 0.0;

		if (!this.parseDefinition(definition)) {
			throw(this.t('mmcmd:unitParseError', {definition: definition}));
		}
		this.scale *= value;
		return this;
	}

	/** @method initCompoundWithDescription
	 * @param {string} description - compound unit name
	 */

	initCompoundWithDescription(description) {
		if (!MMUnit.compoundRegex.test(description)) {
			throw(this.t('mmcmd:noOpInCompoundUnit', {name: description}));
		}
		if (!this.parseDefinition(description)) {
			throw(this.t('mmcmd:unitParseError', {definition: description}));
		}
		return this;
	}

	/** @method parseDefinition
	 * @param {string} definition
	 * @returns {boolean}
	 * Attempts to determine the scale and dimensions from the definition part
	 * 
	 * a compound definition can have at most one / dividing the numerator from the denominator
	 * individual parts of the numerator and denominator are separated by - characters, which are
	 * interpreted as unit multiplys.  A unit part can be followed by a ^ symbols and a power
	 */
	parseDefinition(definition) {
		if ( this.calcType != MMUnitCalcType.COMPOUND) {
			return true;	// no parsing needed (or allowed)
		}
		let parts = definition.split('/');
		let count = parts.length;
		let numerator = '';
		let denominator = '';
		if (count > 2) {
			throw(this.t('mmcmd:unitSlashError', {definition: definition}));
		}
		else if (count == 2) {
			numerator = parts[0];
			denominator = parts[1];
		}
		else {
			numerator = parts[0];
		}
	
		let numeratorParts = null;
		let denominatorParts = null;
		try {
			numeratorParts = this.parent.parent.findNamePartsInString(numerator);
			denominatorParts = this.parent.parent.findNamePartsInString(denominator);
		}
		catch (e) {
			return false;
		}

		if (numeratorParts.length == 0 && denominatorParts.length == 0) {
			throw(this.t('mmcmd:unitDefinitionInvalid', {definition: definition}));
		}

		this.scale = 1.0;
		this.dimensions = [0, 0, 0, 0, 0, 0, 0];
		for (let part of numeratorParts) {
			let unit = part[0];
			let exponent = part[1];
			if (exponent == 0.0) {
				throw(this.t('mmcmd:unitExponentZero', {definition: definition}));
			}
			this.scale *= Math.pow(unit.scale, exponent);
			for (let i = 0; i < MMUnitDimensionType.NUMDIMS; i++) {
				this.dimensions[i] += unit.dimensions[i] * exponent;
			}
		}
	
		for (let part of denominatorParts) {
			let unit = part[0];
			let exponent = part[1];
			if (exponent == 0.0) {
				throw(this.t('mmcmd:unitExponentZero', {definition: definition}));
			}
			this.scale /= Math.pow(unit.scale, exponent);
			for (let i = 0; i < MMUnitDimensionType.NUMDIMS; i++) {
				this.dimensions[i] -= unit.dimensions[i] * exponent;
			}
		}
		return true;
	}
}

/** @class MMUnitSet
 * 
 * @member {Object} unitsDictionary -key dimension value unit
 * @member {Object} typesDictionary - key dimension value typeName
 * @member {Object} dimensionsDictionary - key typeName value dimension
 * @member {boolean} isMaster
 * @member {MMUnitSystem} unitSystem;
 */
class MMUnitSet extends MMCommandObject {
		/** @constructor
	 * @param {string} name
	 * @param {MMUnitSetsContainer} setsContainer
	 * @param {boolean} isMaster
	*/
	constructor(name, setsContainer, isMaster) {
		super(name, setsContainer, 'MMUnitSet');
		this.isMaster = isMaster;
		this.unitsDictionary = {};
		this.dimensionsDictionary = {};
		this.typesDictionary = {};
	}

	get unitSystem() {
		return this.parent.unitSystem;
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		if (!this.isMaster) {
			verbs['addtype'] = this.addTypeVerb;
			verbs['renametype'] = this.renameType;
			verbs['removetype'] = this.removeType;
		}
		verbs['unitfortype'] = this.unitNameForType;
		verbs['listtypes'] = this.allTypeNames;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			addtype: 			'mmcmd:?addtype',
			renametype: 	'mmcmd:?renametype',
			removetype: 	'mmcmd:?removetype',
			unitfortype:	'mmcmd:?unitfortype',
			listtypes:		'mmcmd:?listtypes'
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}

	/** @method setUnitForTypeNamed
	 * @param {MMUnit} unit
	 * @param {string} typeName
	 */
	setUnitForTypeNamed(unit, typeName) {
		let dimensionString = unit.dimensionString;
		let lcTypeName = typeName.toLowerCase();
		let oldDimensionString = this.dimensionsDictionary[lcTypeName];
		let oldTypeName = this.typesDictionary[dimensionString];
		// check if type of those dimensions already exists
		if ( oldTypeName ) {
			if (oldTypeName != typeName) {
				throw(this.t('mmcmd:unitSetDuplicateDimensions', {name: typeName}));
			}
			this.dimensionsDictionary[lcTypeName] = dimensionString;
			if (oldDimensionString) {
				delete this.unitsDictionary[oldDimensionString];
				delete this.typesDictionary[oldDimensionString];
			}
			this.unitsDictionary[dimensionString] = unit;
			this.typesDictionary[dimensionString] = typeName;
		}
		else {
			if (oldDimensionString) {
				// type name already exists with different dimensions
				delete this.unitsDictionary[oldDimensionString];
				delete this.typesDictionary[oldDimensionString];
			}
			// adding new type
			this.dimensionsDictionary[lcTypeName] = dimensionString;
			this.typesDictionary[dimensionString] = typeName;
			this.unitsDictionary[dimensionString] = unit;
		}
	}

	/** @method addTypeVerb
	 * @param {MMCommand} command
	 * command.args consists of a type name and the name of a unit associated with it
	 */
	addTypeVerb(command) {
		let args = command.args;
		let parts = args.split(/\s/);
		if (parts.length != 2) {
			throw(this.t('mmcmd:unitAddTypeError', {args: args}));
		}
		let unit = this.unitSystem.unitNamed(parts[1]);
		this.setUnitForTypeNamed(unit, parts[0]);
		command.results = true;
		command.undo = this.getPath() + ' removetype ' + parts[0];
	}

	/** @method renameType
	 * verb
	 * @param {MMCommand} command command.args - should be 'fromName toName'
	*/
	renameType(command) {
		let args = command.args;
		let parts = args.split(/\s/);
		if (parts.length != 2) {
			throw(this.t('mmcmd:unitSetTypeRenameError', {args: args}));
		}
		let fromName = parts[0];
		let toName = parts[1];
		let lcFromName = fromName.toLowerCase();
		let lcToName = toName.toLowerCase();
		if (toName != fromName) {
			if (this.dimensionsDictionary[lcToName]) {
				throw(this.t('mmcmd:duplicateUnitTypeName', {name: toName}));
			}
			if (!this.dimensionsDictionary[lcFromName]) {
				throw(this.t('mmcmd:unitUnknownTypeName', {name: fromName}));
			}
			let dimensionString = this.dimensionsDictionary[lcFromName];
			this.typesDictionary[dimensionString] = toName;
			this.dimensionsDictionary[lcToName] = dimensionString;
			delete this.dimensionsDictionary[lcFromName];
			command.results = true;
			command.undo = `${this.getPath()} renametype ${toName} ${fromName}`;
		}
		else {
			command.results = false;
		}
	}

	/** @method removeType
	 * @param {MMCommand} command command.args = name
	 * - verb
	 */
	removeType(command) {
		let name = command.args;
		let lcName = name.toLowerCase();
		let dimensionString = this.dimensionsDictionary[lcName];
		if (dimensionString) {
			let definitionUnit = this.unitsDictionary[dimensionString];
			delete this.unitsDictionary[dimensionString];
			delete this.typesDictionary[dimensionString];
			delete this.dimensionsDictionary[lcName];
			command.results = true;
			if (definitionUnit) {
				command.undo = `${this.getPath()} addtype ${name} ${definitionUnit.name}`;
			}
		}
		else {
			throw(this.t('mmcmd:unitUnknownTypeName', {name: name}));
		}
	}

	/** @method unitNameForType - verb
	 * @param {MMCommand} command command.args = typeName
	 * command.results = unit name
	*/
	unitNameForType(command) {
		let typeName = command.args;
		let dimensionString = this.dimensionsDictionary[typeName.toLowerCase()];
		if (dimensionString) {
			command.results = this.unitsDictionary[dimensionString].name;
		}
		else {
			throw(this.t('mmcmd:unitUnknownTypeName', {name: typeName}));
		}
	}

	/** @method unitForDimensions
	 * @param {number[]} dimensions
	 * @returns {MMUnit}
	 */
	unitForDimensions(dimensions) {
		let dimensionString = MMUnit.stringFromDimensions(dimensions);
		if (dimensionString) {
			return this.unitsDictionary[dimensionString];
		}
		return null;
	}

	/** @method typeNameForDimensions
	 * @param {number[]} dimensions
	 * @returns {string}
	 */
	typeNameForDimensions(dimensions) {
		let dimensionString = MMUnit.stringFromDimensions(dimensions);
		if (dimensionString) {
			let typeName = this.typesDictionary[dimensionString];
			if (typeName) {
				return typeName;
			}
		}
		return 'Unknown type';
	}

	/** @method dimensionStringForTypeName
	 * @param {string} typeName
	 * @returns {string}
	 */
	dimensionStringForTypeName(typeName) {
		return this.dimensionsDictionary[typeName.toLowerCase()];
	}

	/** @method allTypeNames
	 * @param {MMCommand} command - does not require command.args
	 * command.results = array of names
	 */
	allTypeNames(command) {
		command.results = Object.values(this.typesDictionary);
	}

	/** @method loadFromJsonObjects
	 * @param {Object} objects
	 */
	loadFromJsonObjects(objects) {
		let types = objects['units'];
		for (let typeName in types) {
			let unitName = types[typeName];
			let unit = this.unitSystem.unitNamed(unitName);
			this.setUnitForTypeNamed(unit, typeName);
		}
	}
}

/**
 * @class MMUnitsContainer
 * Serves as container for units
 * @member {Object} dimensionsDictionary
 * key is dimensionString, value is array of units with those dimensions
 * @member {MMUnitSystem} unitSystem;
 */
class MMUnitsContainer extends MMCommandParent {
	/**
	 * @constructor
	 * @param {MMUnitSystem} unitSystem - parent
	 */
	constructor(unitSystem) {
		super('units',  unitSystem, 'MMUnitsContainer');
		this.dimensionsDictionary = {};
		this.loadMasterUnits();
	}

	get unitSystem() {
		return this.parent;
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		if (!this.isMaster) {
			verbs['adduserunit'] = this.addUserDefinition;
			verbs['remove'] = this.removeUserDefinition;
		}
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			adduserunit: 'mmcmd:?adduserunit'
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}

	/** @method registerDimensionsOfUnit
	 * adds the unit to the dimensionDictionary array keyed by dimensionString 
	 * @param {MMUnit}
	 */
	registerDimensionsOfUnit(unit) {
		let dimensionString = unit.dimensionString;
		let unitArray = this.dimensionsDictionary[dimensionString];
		if (!unitArray) {
			unitArray = [];
			this.dimensionsDictionary[dimensionString] = unitArray;
		}	
		unitArray.push(unit);
	}

	/** @method addUnit
	 * creates a unit based on the name and description
	 * @param {string} name
	 * @param {string} description - description string - unit powers
	 * @param {boolean} isMaster - false if user added
	 * @returns {MMUnit} returns unit created
	 */
	addUnit(name, description, isMaster) {
		let lowerCaseName = name.toLowerCase();
		if (this.children[lowerCaseName]) {
			throw(this.t('mmcmd:duplicateUnit', {name: name}));
		}
		let newUnit = new MMUnit(name, this).initWithDescription(isMaster, description);
		this.addChild(name, newUnit);
		this.registerDimensionsOfUnit(newUnit);
		return newUnit;
	}

	/** @method addUserDefinition
	 * @param {MMCommand} command - command args should be name = scale * existingUnit
	 * example - workday = 8 h
	 * existingUnit can be a previously undefined compound unit
	 * command.results is set to the new unit name
	*/
	addUserDefinition(command) {
		let definition = command.args;
		let parts = definition.split(/\s*=\s*|\s+/);
		if (parts.length != 3) {
			throw(this.t('mmcmd:unitDefinitionError', {definition: definition}));
		}
		let unitName = parts[0];
		let value = Number(parts[1]);
		if (value == NaN) {
			throw(this.t('mmcmd:unitUserDefValueError', {definition: definition}))
		}
		let lowerName = unitName.toLowerCase();
		let newUnit = this.children[lowerName];
		if (newUnit) {
			if (newUnit.isMaster) {
				throw(this.t('mmcmd:unitNameInUse', {name: unitName}));
			}
			newUnit.parseDefinition(parts[2]);
			newUnit.scale *= value;
		}
		else {
			newUnit = new MMUnit(unitName, this).initWithUserDefinition(value, parts[2]);
			this.registerDimensionsOfUnit(newUnit);
		}
		newUnit.definition = definition;	// save the definiton - useful for undoing remove
		command.results = newUnit.name;
		command.undo = `${this.getPath()} remove ${newUnit.name}`;
	}

	/** @method removeUserDefinition
	 * @param {MMCommand} command - command args should be name = scale * existingUnit
	*/
	removeUserDefinition(command) {
		let name = command.args;
		let lcName = name.toLowerCase();
		let unit = this.children[lcName];
		if (!unit) {
			throw(this.t('mmcmd:unknownUnit', {name: name}));
		}
		if (unit.isMaster) {
			throw(this.t('mmcmd:unitCannotRemoveMaster', {name: name}));
		}
		let definition = unit.definition;	// for undo if available
		this.removeChildNamed(command);
		if (definition) {
			command.undo = `${this.getPath()} adduserunit ${definition}`;
		}
	}

	/** @method loadMasterUnits
	 * creates the builtin master units
	 */
	loadMasterUnits() {
		 this.addUnit("Fraction","1 0 0 0 0 0 0 0 1.000000e+00",true);
		 this.addUnit("ppm","1 0 0 0 0 0 0 0 1.000000e-06",true);
		 this.addUnit("%","1 0 0 0 0 0 0 0 1.000000e-02",true);
		 this.addUnit("radian","1 0 0 0 0 0 0 0 1.000000e+00",true);
		 this.addUnit("degree","1 0 0 0 0 0 0 0 0.017453292519943295",true);
		 this.addUnit("arcmin","1 0 0 0 0 0 0 0 0.00029088820866572158",true);
		 this.addUnit("arcsec","1 0 0 0 0 0 0 0 4.8481368110953598e-06",true);
		
		 this.addUnit("m","1 1 0 0 0 0 0 0 1.000000e+00",true);
		 this.addUnit("angstrom","1 1 0 0 0 0 0 0 1.000000e-10",true);
		 this.addUnit("yard","1 1 0 0 0 0 0 0 9.144000e-01",true);
		 this.addUnit("micron","1 1 0 0 0 0 0 0 1.000000e-06",true);
		 this.addUnit("fathom","1 1 0 0 0 0 0 0 1.828800e+00",true);
		 this.addUnit("ft","1 1 0 0 0 0 0 0 3.048000e-01",true);
		 this.addUnit("mm","1 1 0 0 0 0 0 0 1.000000e-03",true);
		 this.addUnit("km","1 1 0 0 0 0 0 0 1.000000e+03",true);
		 this.addUnit("in","1 1 0 0 0 0 0 0 2.540000e-02",true);
		 this.addUnit("Mile","1 1 0 0 0 0 0 0 1.609344e+03",true);
		 this.addUnit("cm","1 1 0 0 0 0 0 0 1.000000e-02",true);
		 this.addUnit("ly","1 1 0 0 0 0 0 0 9.4607304725808e15",true);
		
		 this.addUnit("kg","1 0 1 0 0 0 0 0 1.000000e+00",true);
		 this.addUnit("tonne","1 0 1 0 0 0 0 0 1.000000e+03",true);
		 this.addUnit("longton","1 0 1 0 0 0 0 0 1.01604691e+03",true);
		 this.addUnit("lb","1 0 1 0 0 0 0 0 4.535924e-01",true);
		 this.addUnit("g","1 0 1 0 0 0 0 0 1.000000e-03",true);
		 this.addUnit("mg","1 0 1 0 0 0 0 0 1.000000e-06",true);
		 this.addUnit("ug","1 0 1 0 0 0 0 0 1.000000e-09",true);
		 this.addUnit("grain","1 0 1 0 0 0 0 0 6.479891e-05",true);
		 this.addUnit("troyOz","1 0 1 0 0 0 0 0 3.11034768e-02",true);
		 this.addUnit("ton","1 0 1 0 0 0 0 0 9.0718474e+02",true);
		 this.addUnit("slug","1 0 1 0 0 0 0 0 1.459390e+01",true);
		 this.addUnit("ounce","1 0 1 0 0 0 0 0 2.83495231e-02",true);
		 this.addUnit("gm","1 0 1 0 0 0 0 0 1.000000e-03",true);
		
		 this.addUnit("s","1 0 0 1 0 0 0 0 1.000000e+00",true);
		 this.addUnit("d","1 0 0 1 0 0 0 0 8.640000e+04",true);
		 this.addUnit("h","1 0 0 1 0 0 0 0 3.600000e+03",true);
		 this.addUnit("min","1 0 0 1 0 0 0 0 6.000000e+01",true);
		 this.addUnit("year","1 0 0 1 0 0 0 0 31557600.0",true);
		 this.addUnit("date","4 0 0 1 0 0 0 0 0.0",true);
		 this.addUnit("dated","4 0 0 1 0 0 0 0 1.0",true);
		 this.addUnit("datem","4 0 0 1 0 0 0 0 2.0",true);
		
		 this.addUnit("A","1 0 0 0 1 0 0 0 1.000000e+00",true);
		
		 this.addUnit("K","1 0 0 0 0 1 0 0 1.000000e+00",true);
		 this.addUnit("degC","2 0 0 0 0 1 0 0 1.000000e+00 2.731500e+02",true);
		 this.addUnit("degF","2 0 0 0 0 1 0 0 5.555556e-01 2.553722e+02",true);
		 this.addUnit("degR","1 0 0 0 0 1 0 0 5.555556e-01",true);
		 this.addUnit("deltaC","1 0 0 0 0 1 0 0 1.000000e+00",true);
		 this.addUnit("deltaF","1 0 0 0 0 1 0 0 5.555556e-01",true);
		
		 this.addUnit("mol","1 0 0 0 0 0 1 0 1.000000e+00",true);
		 this.addUnit("gmol","1 0 0 0 0 0 1 0 1.000000e+00",true);
		 this.addUnit("kmol","1 0 0 0 0 0 1 0 1.000000e+03",true);
		 this.addUnit("lbmol","1 0 0 0 0 0 1 0 4.535924e+02",true);
		 this.addUnit("SCF","1 0 0 0 0 0 1 0 1.195253e+00",true);
		 this.addUnit("MSCM","1 0 0 0 0 0 1 0 4.461378e+04",true);
		 this.addUnit("MMSCM","1 0 0 0 0 0 1 0 4.461378e+07",true);
		 this.addUnit("SCM","1 0 0 0 0 0 1 0 4.461378e+01",true);
		 this.addUnit("MSCF","1 0 0 0 0 0 1 0 1.195253e+03",true);
		 this.addUnit("MMSCF","1 0 0 0 0 0 1 0 1.195253e+06",true);
		
		 this.addUnit("cd","1 0 0 0 0 0 0 1 1.000000e+00",true);
		
		 this.addUnit("N","1 1 1 -2 0 0 0 0 1.000000e+00",true);
		 this.addUnit("kgf","1 1 1 -2 0 0 0 0 9.806650e+00",true);
		 this.addUnit("lbf","1 1 1 -2 0 0 0 0 4.448222e+00",true);
		 this.addUnit("dyne","1 1 1 -2 0 0 0 0 1.000000e-05",true);
		 this.addUnit("poundal","1 1 1 -2 0 0 0 0 1.382550e-01",true);
		
		 this.addUnit("acre","1 2 0 0 0 0 0 0 4.04685642e+03",true);
		 this.addUnit("darcy","1 2 0 0 0 0 0 0 9.869233e-13",true);
		 this.addUnit("hectre","1 2 0 0 0 0 0 0 1.000000e+04",true);
		
		 this.addUnit("debye","1 1 0 1 1 0 0 0 3.335640e-30",true);
		
		 this.addUnit("centistoke","1 2 0 -1 0 0 0 0 1.000000e-06",true);
		 this.addUnit("St","1 2 0 -1 0 0 0 0 1.000000e-04",true);
		
		 this.addUnit("liter","1 3 0 0 0 0 0 0 1.0e-03",true);
		 this.addUnit("litre","1 3 0 0 0 0 0 0 1.0e-03",true);
		 this.addUnit("milliliter","1 3 0 0 0 0 0 0 1.0e-06",true);
		 this.addUnit("mL","1 3 0 0 0 0 0 0 1.0e-06",true);
		 this.addUnit("L","1 3 0 0 0 0 0 0 1.0e-03",true);
		 this.addUnit("quart","1 3 0 0 0 0 0 0 0.946352946e-03",true);
		 this.addUnit("fluidoz","1 3 0 0 0 0 0 0 0.2957352956e-04",true);
		 this.addUnit("impquart","1 3 0 0 0 0 0 0 1.1365225e-03",true);
		 this.addUnit("usgal","1 3 0 0 0 0 0 0 3.785411784e-03",true);
		 this.addUnit("gal","1 3 0 0 0 0 0 0 3.785411784e-03",true);
		 this.addUnit("impgal","1 3 0 0 0 0 0 0 4.54609e-03",true);
		 this.addUnit("bbl","1 3 0 0 0 0 0 0 1.589873e-01",true);
		
		 this.addUnit("kph","1 1 0 -1 0 0 0 0 0.277778",true);
		 this.addUnit("mph","1 1 0 -1 0 0 0 0 0.44704",true);
		 this.addUnit("knot","1 1 0 -1 0 0 0 0 0.514444",true);
		 this.addUnit("lightC","1 1 0 -1 0 0 0 0 299792458.0",true);
		
		 this.addUnit("C","1 0 0 1 1 0 0 0 1.000000e+00",true);
		
		 this.addUnit("kJ","1 2 1 -2 0 0 0 0 1.000000e+03",true);
		 this.addUnit("btu","1 2 1 -2 0 0 0 0 1.05505585e+03",true);
		 this.addUnit("mmbtu","1 2 1 -2 0 0 0 0 1.05505585e+09",true);
		 this.addUnit("J","1 2 1 -2 0 0 0 0 1.000000e+00",true);
		 this.addUnit("erg","1 2 1 -2 0 0 0 0 1.000000e-07",true);
		 this.addUnit("cal","1 2 1 -2 0 0 0 0 4.184000e+00",true);
		 this.addUnit("kcal","1 2 1 -2 0 0 0 0 4.184000e+03",true);
		 this.addUnit("megatontnt","1 2 1 -2 0 0 0 0 4.184000e+15",true);
		
		 this.addUnit("cp","1 -1 1 -1 0 0 0 0 1.000000e-03",true);
		 this.addUnit("poise","1 -1 1 -1 0 0 0 0 1.000000e-01",true);
		 this.addUnit("micropoise","1 -1 1 -1 0 0 0 0 1.000000e-07",true);
		
		 this.addUnit("Pa","1 -1 1 -2 0 0 0 0 1.000000e+00",true);
		 this.addUnit("kPa","1 -1 1 -2 0 0 0 0 1.000000e+03",true);
		 this.addUnit("MPa","1 -1 1 -2 0 0 0 0 1.000000e+06",true);
		 this.addUnit("bar","1 -1 1 -2 0 0 0 0 1.000000e+05",true);
		 this.addUnit("psi","1 -1 1 -2 0 0 0 0 6.89475729e+03",true);
		 this.addUnit("psia","1 -1 1 -2 0 0 0 0 6.89475729e+03",true);
		 this.addUnit("atm","1 -1 1 -2 0 0 0 0 1.013250e+05",true);
		 this.addUnit("barg","2 -1 1 -2 0 0 0 0 1.000000e+05 1.013250e+05",true);
		 this.addUnit("mmHg0C","1 -1 1 -2 0 0 0 0 1.333220e+02",true);
		 this.addUnit("cmHg0C","1 -1 1 -2 0 0 0 0 1.333220e+00",true);
		 this.addUnit("inHg32F","1 -1 1 -2 0 0 0 0 3.386383e+03",true);
		 this.addUnit("feetH2O4C","1 -1 1 -2 0 0 0 0 2.988980e+00",true);
		 this.addUnit("psig","2 -1 1 -2 0 0 0 0 6.894757e+03 1.013250e+05",true);
		 this.addUnit("kPag","2 -1 1 -2 0 0 0 0 1.000000e+03 1.013250e+05",true);
		
		 this.addUnit("W","1 2 1 -3 0 0 0 0 1.000000e+00",true);
		 this.addUnit("kW","1 2 1 -3 0 0 0 0 1.000000e+03",true);
		 this.addUnit("mW","1 2 1 -3 0 0 0 0 1.000000e+06",true);
		 this.addUnit("gW","1 2 1 -3 0 0 0 0 1.000000e+09",true);
		 this.addUnit("horsepower","1 2 1 -3 0 0 0 0 7.45699872e+02",true);
		 this.addUnit("hp","1 2 1 -3 0 0 0 0 7.45699872e+02",true);
		 this.addUnit("metrichp","1 2 1 -3 0 0 0 0 7.3549875e+02",true);
		
		 this.addUnit("volt","1 2 1 -3 -1 0 0 0 1.0",true);
		 this.addUnit("V","1 2 1 -3 -1 0 0 0 1.0",true);
		
		 this.addUnit("Ohm","1 2 1 -3 -2 0 0 0 1.0",true);

		 this.addUnit("F","1 -2 -1 4 2 0 0 0 1.0",true);
		 this.addUnit("uF","1 -2 -1 4 2 0 0 0 1.0e-6",true);
		 this.addUnit("nF","1 -2 -1 4 2 0 0 0 1.0e-9",true);
		 this.addUnit("pF","1 -2 -1 4 2 0 0 0 1.0e-12",true);
		
		 this.addUnit("Wb","1 2 1 -2 -1 0 0 0 1.0",true);
		 this.addUnit("Mx","1 2 1 -2 -1 0 0 0 1.0e-8",true);
		
		 this.addUnit("Henry","1 2 1 -2 -2 0 0 0 1.0",true);
		
		 this.addUnit("Hz","1 0 0 -1 0 0 0 0 1.0",true);
		 this.addUnit("rpm","1 0 0 -1 0 0 0 0 0.104719755",true);
		
		 this.addUnit("SG[60]","1 -3 1 0 0 0 0 0 9.990220e+02",true);
		 this.addUnit("API60","3 -3 1 0 0 0 0 0 1.413616e+05 1.315000e+02",true);
	}
}

/** MMUnitSetContainer
 * @member {MMUnitSet} defaultSet;
 * @member {MMUnitSystem} unitSystem;
 */
class MMUnitSetsContainer extends MMCommandParent {
	/**
	 * @constructor
	 * @param {MMUnitSystem} unitSystem - parent
	 */
	constructor(unitSystem) {
		super('sets', unitSystem, 'MMUnitSetsContainer');
		this.loadMasterSets();
		this.defaultSet = this.childNamed('SI');
	}

	get unitSystem() {
		return this.parent;
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['clone'] = this.cloneSet;
		verbs['remove'] = this.removeSetNamed;
		return verbs;
	}

	get properties() {
		let d = super.properties;
		d['default'] = {type: PropertyType.string, readOnly: false};
		return d;
	}

	get default() {
		return this.defaultSet.name;
	}

	set default(name) {
		let newDefault = this.childNamed(name);
		if (!newDefault) {
			throw(this.t('mmcmd:unitSetNotFound', {name: name}));
		}
		this.defaultSet = newDefault;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			clone:	'mmcmd:?cloneset',
			remove:	'mmcmd:?removeset'
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}

	/** @method addSet
	 * @param {string} name
	 * @param {boolean} isMaster
	 * @returns {MMUnitSet}
	 */
	addSet(name, isMaster) {
		let lowerCaseName = name.toLowerCase();
		if (this.children[lowerCaseName]) {
			throw(this.t('mmcmd:duplicateUnitSet', {name: name}));
		}
		let newSet = new MMUnitSet(name, this, isMaster);
		this.addChild(name, newSet);
		return newSet;
	}

	/** @method  cloneSet
	 * @param {command} command - args should be originalName
	 * command.results set to new set name
	*/
	cloneSet(command) {
		let originalName = command.args;
		let original = this.childNamed(originalName);
		if (!original) {
			throw(this.t('mmcmd:unitSetNotFound', {name: originalName}));
		}
		let i = 2;
		let newName = `${original.name}_${i}`;
		while (this.childNamed(newName)) {
			newName = `${original.name}_${++i}`;
		}
		let clone = new MMUnitSet(newName, this, false);
		clone.unitsDictionary = Object.assign({}, original.unitsDictionary);
		clone.typesDictionary = Object.assign({}, original.typesDictionary);
		clone.dimensionsDictionary = Object.assign({}, original.dimensionsDictionary);
		command.results = newName;
		command.undo = `${this.getPath()} remove ${newName}`;
	}

	/** @method removeSetNamed
	 * @param {MMCommand} command args should be name
	 */
	removeSetNamed(command) {
		let name = command.args;
		let set = this.childNamed(name);
		if (set && !set.isMaster) {
			this.removeChildNamed(command);
			if (set === this.defaultSet) {
				this.defaultSet = this.childNamed['SI'];
			}
		}
	}

	/** @method loadFromJsonObjects
	 * @param {Object} sets
	 * @param {boolean} isMaster
	 */
	loadFromJsonObjects(sets, isMaster) {
		for (let setName in sets) {
			let set = this.addSet(setName, isMaster);
			set.loadFromJsonObjects(sets[setName]);
		}
	}

	/** @method loadMasterSets */
	loadMasterSets() {
		let sets = {
			"PureSI" : {
				"units" : {
					"Acceleration" : "m/s^2",
					"Area" : "m^2",
					"Capacitance" : "A^2-s^4/kg-m^2",
					"Density" : "kg/m^3",
					"Dimensionless" : "Fraction",
					"DipoleMoment" : "A-s-m",
					"ElectricCharge" : "A-s",
					"ElectricCurrent" : "A",
					"Energy" : "kg-m^2/s^2",
					"Force" : "kg-m/s^2",
					"Frequency" : "1/s",
					"HeatFlux" : "kg/s^3",
					"HeatTransferCoeff" : "kg/s^3-K",
					"Inductance" : "kg-m^2/A^2-s^2",
					"IsoThermalCompressibility" : "m-s^2/kg",
					"JouleThomson" : "K-m-s^2/kg",
					"KinematicViscosity" : "m^2/s",
					"Length" : "m",
					"LuminousIntensity" : "cd",
					"MagneticFlux" : "kg-m^2/A-s^2",
					"Mass" : "kg",
					"MassEnthalpy" : "m^2/s^2",
					"MassFlow" : "kg/s",
					"MassSpecificHeat" : "m^2/s^2-K",
					"MassVolume" : "m^3/kg",
					"MolarConcentration" : "mol/m^3",
					"MolarEnthalpy" : "kg-m^2/s^2-mol",
					"MolarSpecificHeat" : "kg-m^2/s^2-mol-K",
					"MolarVolume" : "m^3/mol",
					"MolecularWeight" : "kg/mol",
					"MoleFlow" : "mol/s",
					"Moles" : "mol",
					"Permeability" : "mol-s/kg",
					"Power" : "kg-m^2/s^3",
					"Pressure/MolarVolume" : "kg-mol/m^4-s^2",
					"Pressure" : "kg/m-s^2",
					"ReactionRateCat" : "mol/s-kg",
					"ReactionRateVol" : "mol/s-m^3",
					"Resistance" : "kg-m^2/A^2-s^3",
					"SolubilityParameter" : "kg^0.5/s-m^0.5",
					"SurfaceTension" : "kg/s^2",
					"Temperature" : "K",
					"ThermalConductivity" : "kg-m/s^3-K",
					"ThermalExpansion" : "1/K",
					"Time" : "s",
					"UA" : "kg-m^2/s^3-K",
					"Velocity" : "m/s",        
					"Viscosity" : "kg/m-s",        
					"Voltage" : "kg-m^2/A-s^3",
					"Volume" : "m^3",
					"VolumetricFlow" : "m^3/s"
				}
			},
			"SI" : {
				"units" : {
					"Acceleration" : "m/s^2",
					"Area" : "m^2",
					"Capacitance" : "uF",
					"Density" : "kg/m^3",
					"Dimensionless" : "Fraction",
					"DipoleMoment" : "C-m",
					"ElectricCharge" : "C",
					"ElectricCurrent" : "A",
					"Energy" : "kJ",
					"Force" : "N",
					"Frequency" : "1/s",
					"HeatTransferCoeff" : "W/m^2-K",
					"HeatFlux" : "W/m^2",
					"Inductance" : "Henry",
					"IsoThermalCompressibility" : "1/kPa",
					"JouleThomson" : "K/kPa",
					"KinematicViscosity" : "m^2/s",
					"Length" : "m",
					"LuminousIntensity" : "cd",
					"MagneticFlux" : "Wb",
					"Mass" : "kg",
					"MassEnthalpy" : "kJ/kg",
					"MassFlow" : "kg/h",
					"MassVolume" : "m^3/kg",
					"MassSpecificHeat" : "kJ/kg-K",
					"MolarConcentration" : "kmol/m^3",
					"MolarEnthalpy" : "kJ/kmol",
					"MolarSpecificHeat" : "kJ/kmol-K",
					"MolarVolume" : "m^3/kmol",
					"MolecularWeight" : "kg/kmol",
					"MoleFlow" : "kmol/h",
					"Moles" : "mol",
					"Permeability" : "kmol/s-m-kPa",
					"Power" : "W",
					"Pressure" : "kPa",
					"Pressure/MolarVolume" : "kPa-kmol/m^3",
					"ReactionRateCat" : "kmol/s-kg",
					"ReactionRateVol" : "kmol/s-m^3",
					"Resistance" : "ohm",
					"SolubilityParameter" : "J^0.5/m^1.5",
					"SurfaceTension" : "N/m",
					"Temperature" : "degC",
					"ThermalConductivity" : "W/m-K",
					"ThermalExpansion" : "1/K",
					"Time" : "s",
					"UA" : "W/K",
					"Velocity" : "m/s",
					"Viscosity" : "Pa-s",
					"Voltage" : "volt",
					"Volume" : "m^3",
					"VolumetricFlow" : "m^3/s"
				}
			},
			"US" : {
				"units" : {
			"Acceleration" : "ft/s^2",
					"Area" : "ft^2",
					"Capacitance" : "uF",
					"Density" : "lb/ft^3",
					"Dimensionless" : "Fraction",
					"DipoleMoment" : "debye",
					"ElectricCharge" : "C",
					"ElectricCurrent" : "A",
					"Energy" : "Btu",
					"Force" : "lbf",
					"Frequency" : "1/s",
					"HeatFlux" : "Btu/h-ft^2",
					"HeatTransferCoeff" : "Btu/h-ft^2-deltaF",
					"Inductance" : "Henry",
					"IsoThermalCompressibility" : "1/psia",
					"JouleThomson" : "deltaF/psia",
					"KinematicViscosity" : "centistoke",
					"Length" : "ft",
					"LuminousIntensity" : "cd",
					"MagneticFlux" : "Wb",
					"Mass" : "lb",
					"MassEnthalpy" : "Btu/lb",
					"MassFlow" : "lb/h",
					"MassVolume" : "ft^3/lb",
					"MassSpecificHeat" : "Btu/lb-deltaF",
					"MolarConcentration" : "lbmol/ft^3",
					"MolarEnthalpy" : "Btu/lbmol",
					"MolarSpecificHeat" : "Btu/lbmol-deltaF",
					"MolarVolume" : "ft^3/lbmol",
					"MolecularWeight" : "lb/lbmol",
					"MoleFlow" : "lbmol/h",
					"Moles" : "lbmol",
					"Permeability" : "lbmol/h-ft-psia",
					"Power" : "Btu/h",
					"Pressure" : "psia",
					"Pressure/MolarVolume" : "psia-lbmol/ft^3",
					"ReactionRateCat" : "lbmol/h-lb",
					"ReactionRateVol" : "lbmol/h-ft^3",
					"Resistance" : "ohm",
					"SolubilityParameter" : "Btu^0.5/ft^1.5",
					"SurfaceTension" : "lbf/ft",
					"Temperature" : "degF",
					"ThermalConductivity" : "Btu/h-ft-deltaF",
					"ThermalExpansion" : "1/degR",
					"Time" : "h",
					"UA" : "Btu/h-deltaF",
					"Velocity" : "ft/s",
					"Viscosity" : "cp",
					"Voltage" : "volt",
					"Volume" : "ft^3",
					"VolumetricFlow" : "ft^3/h"
				}
			}
		}
		this.loadFromJsonObjects(sets, true);
	}
}
