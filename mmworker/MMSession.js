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
 * @member {MMSession} session - this
 * @member {MMUnitSystem} unitSystem
 * @member {MMModel} rootModel;
 * @member {MMModel} currentModel;
 * @member {MMModel[]} modelStack;
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
		this.currentModel = this.rootModel;
	}

		/** @override */
		get verbs() {
			let verbs = super.verbs;
			verbs['test'] = this.test;
			return verbs;
		}
	
	get	session() {
		return this;
	}

	get unitSystem() {
		return this.childNamed('unitsys');
	}

	get unknownPosition() {
		return new MMPoint(-12321, -12321);
	}

	// MMModel related methods

	/**
	 * @method pushModel
	 * @param {MMModel} model
	 */
	pushModel(model) {
		if (this.currentModel) {
			this.modelStack.push(this.currentModel);
		}
		this.currentModel = model;
	}

	/**
	 * @method popModel
	 */
	popModel() {
		if (this.modelStack.length > 0) {
			this.currentModel = this.modelStack.pop();
		}
	}

	// testing method
	test(command) {
		let results = []
		let test = command.args;
		let unitSystem = this.session.unitSystem;
		switch(test) {
			case 'all':
			case 'units': {
				let unitSystem = this.session.unitSystem;
				let u = unitSystem.unitNamed('lb');
				u.dimensionString = '1 0 -1 0 0 0 0';
				results.push(`Unit2 ${u.name} dims ${u.dimensionString}`);

				u = unitSystem.unitNamed('ft');
				let v = u.convertToBase(1);
				results.push(`1 ft = ${v.toFixed(5)} m`);
				v = u.convertFromBase(v);
				results.push(`back to ft ${v.toFixed(5)}`);

				u = unitSystem.unitNamed('ft/s');
				v = u.convertToBase(1);
				results.push(`1 ft/s = ${v.toFixed(5)} m/s`);
				v = u.convertFromBase(v);
				results.push(`back to ft/s ${v.toFixed(5)}`);

				u = unitSystem.unitNamed('degf');
				v = u.convertToBase(32);
				results.push(`32 F = ${v.toFixed(5)} K`);
				v = u.convertFromBase(v);
				results.push(`back to F ${v.toFixed(5)}`);

				u = unitSystem.unitNamed('API60');
				v = u.convertToBase(10);
				results.push(`10 API60 = ${v.toFixed(5)} kg/m3`);
				v = u.convertFromBase(v);
				results.push(`back to API60 ${v.toFixed(5)}`);

				u = unitSystem.unitNamed('date');
				v = u.convertToBase(20190114.101010);
				results.push(`20190114.101010 date = ${v.toFixed(0)} s`);
				v = u.convertFromBase(v);
				results.push(`back to date ${v.toFixed(6)}`);

				u = unitSystem.unitNamed('date');
				v = u.convertToBase(20190114.101010);
				results.push(`20190114.101010 date = ${v.toFixed(0)} s`);
				v = u.convertFromBase(v);
				results.push(`back to date ${v.toFixed(6)}`);

				u = unitSystem.unitNamed('dated');
				v = u.convertToBase(14012019.101010);
				results.push(`14012019.101010 dated = ${v.toFixed(0)} s`);
				v = u.convertFromBase(v);
				results.push(`back to dated ${v.toFixed(6)}`);

				u = unitSystem.unitNamed('datem');
				v = u.convertToBase(1142019.101010);
				results.push(`1142019.101010 datedm = ${v.toFixed(0)} s`);
				v = u.convertFromBase(v);
				results.push(`back to datem ${v.toFixed(6)}`);

				results.push(`displayName for datem: '${u.displayName}'`);
				results.push(`displayName for fraction: '${unitSystem.unitNamed('Fraction').displayName}'`);
				u = unitSystem.unitNamed('degf')
				results.push(`100 degf stringForValue '${u.stringForValue(373.15)}'`);
				results.push(`100 degf stringForValueWithUnit '${u.stringForValueWithUnit(373.15)}'`);
			}
				if (test != 'all') break;

			case 'values': {
				let v = new MMNumberValue(3, 4);
				let unitSet = unitSystem.sets.defaultSet;

				let u = unitSystem.unitNamed('m/s');
				v.setUnitDimensions(u.dimensions);
				for(let i = 1; i <= v.rowCount; i++) {
					for(let j = 1; j <= v.columnCount; j++) {
						v.setValue(i+j/10., i, j);
					}
				}
				let v2 = v.copyOf();
				v2.logValueWithHeader(`NumberValue ${unitSet.typeNameForDimensions(v2.unitDimensions)}`, results);
				let v3 = MMNumberValue.scalarValue(123, unitSystem.unitNamed('ft^2').dimensions);
				v3.logValueWithHeader(`V3 ft2 ${unitSet.typeNameForDimensions(v3.unitDimensions)}`, results);
				v3.multiplyUnitDimensions(0.5);
				v3.logValueWithHeader(`V3 ft ${unitSet.typeNameForDimensions(v3.unitDimensions)}`, results);
				v3.subtractUnitDimensions(unitSystem.unitNamed('s^2').dimensions)
				v3.logValueWithHeader(`V3 ft/s2 ${unitSet.typeNameForDimensions(v3.unitDimensions)}`, results);
				v3.addUnitDimensions(unitSystem.unitNamed('s').dimensions)
				v3.logValueWithHeader(`V3 ft/s ${unitSet.typeNameForDimensions(v3.unitDimensions)}`, results);
				results.push(`has dimensions ${v3.hasUnitDimensions()}`);
				v3.addUnitDimensions([-1,0,1,0,0,0,0,]);
				v3.logValueWithHeader(`V3 frac ${unitSet.typeNameForDimensions(v3.unitDimensions)}`, results);
				results.push(`has dimensions ${v3.hasUnitDimensions()}`);
				try {
					v3.checkUnitDimensionsAreEqualTo(v.unitDimensions);
				}
				catch(e) {
					results.push(e);
				}
				try {
					v3.checkBounds(12,3);
				}
				catch(e) {
					results.push(e);
				}
				let v4 = MMNumberValue.numberArrayValue([600,700,800], unitSystem.unitNamed('lb/ft^3').dimensions)
				v4.logValueWithHeader(`V4 density ${unitSet.typeNameForDimensions(v4.unitDimensions)}`, results);
				v4.setAllValuesTo(987.654);
				v4.logValueWithHeader(`V4 density ${unitSet.typeNameForDimensions(v4.unitDimensions)}`, results);

				u = v4.defaultUnit;
				results.push(`V4 default unit ${u.name} dims ${u.dimensionString}`);
				results.push(`Unit descriptionString ${u.descriptionString}`);
				u = unitSystem.unitNamed('lb/ft^3');
				results.push(`V4 stringUsingUnit ${u.name} = ${v4.stringUsingUnit(v4.defaultUnit)}`)
				results.push(`V4 stringWithUnit ${u.name} = ${v4.stringWithUnit(v4.defaultUnit)}`)
				v4.setValue(1000, 2, 1);
				results.push('V4[2,1] set to 1000 kg/m^3');
				results.push(`stringForRowColumnUnit 2, 1, lb/ft^3: ${v4.stringForRowColumnUnit(2, 1, u)}`);
				results.push(`stringForRowColumnWithUnit 2, 1, lb/ft^3: ${v4.stringForRowColumnWithUnit(2, 1, u)}`);

				let vr = MMNumberValue.scalarValue(2);
				let vc = MMNumberValue.scalarValue(3);
				let v5 = v.valueForIndexRowColumn(vr,vc);
				v5.logValueWithHeader(`v[2,3]`, results);

				vr = MMNumberValue.scalarValue(0);
				v5 = v.valueForIndexRowColumn(vr,vc);
				v5.logValueWithHeader(`v[0,3]`, results);

				vr = MMNumberValue.scalarValue(-2);
				v5 = v.valueForIndexRowColumn(vr,vc);
				v5.logValueWithHeader(`v[-2,3]`, results);

				vc = MMNumberValue.scalarValue(-4);
				v5 = v.valueForIndexRowColumn(vr,vc);
				v5.logValueWithHeader(`v[-2,-4]`, results);

				v5 = v.valueForIndexRowColumn(vr);
				v5.logValueWithHeader(`v[-2]`, results);

				vr = MMNumberValue.scalarValue(1);
				vc = MMNumberValue.numberArrayValue([1,3,4]);
				v5 = v.valueForIndexRowColumn(vr,vc);
				v5.logValueWithHeader(`v[1,[1,3,4]]`, results);

				vr = MMNumberValue.numberArrayValue([1,3]);
				v5 = v.valueForIndexRowColumn(vr,vc);
				v5.logValueWithHeader(`v[[1,3],[1,3,4]]`, results);

				// tests for add and subtract
				u = unitSystem.unitNamed('m/s');
				let x = MMNumberValue.numberArrayValue([1,2,3], u.dimensions);
				x.logValueWithHeader('Add and subtract: x column array', results);
				results.push(`x = ${x.stringWithUnit(x.defaultUnit)}`);
				let y = MMNumberValue.numberArrayValue([4,5,6], u.dimensions)
				y.logValueWithHeader('y row array', results);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);

				let r = x.add(y);
				r.logValueWithHeader(`x+y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.subtract(y);
				r.logValueWithHeader(`x-y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.add(x);
				r.logValueWithHeader(`y+x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.subtract(x);
				r.logValueWithHeader(`y-x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				y = MMNumberValue.scalarValue(10,u.dimensions);
				y.logValueWithHeader('y row array', results);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);

				r = x.add(y);
				r.logValueWithHeader(`x+y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.subtract(y);
				r.logValueWithHeader(`x-y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.add(x);
				r.logValueWithHeader(`y+x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.subtract(x);
				r.logValueWithHeader(`y-x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				y = new MMNumberValue(1,2,u.dimensions);
				y.setValue(20, 1, 1);
				y.setValue(30, 1, 2);
				y.logValueWithHeader('y column array', results);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);

				r = x.add(y);
				r.logValueWithHeader(`x+y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.subtract(y);
				r.logValueWithHeader(`x-y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.add(x);
				r.logValueWithHeader(`y+x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.subtract(x);
				r.logValueWithHeader(`y-x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				// tests for multiply, divide and mod
				let u2 = unitSystem.unitNamed('s');
				x = MMNumberValue.numberArrayValue([1,2,3], u.dimensions);
				x.logValueWithHeader('Multiply, divide and mod: x row array', results);
				results.push(`x = ${x.stringWithUnit(x.defaultUnit)}`);
				y = MMNumberValue.numberArrayValue([4,5,6], u2.dimensions)
				y.logValueWithHeader('y row array', results);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);

				r = x.multiply(y);
				r.logValueWithHeader(`x*y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.divide(y);
				r.logValueWithHeader(`x/y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.mod(y);
				r.logValueWithHeader(`x%y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.multiply(x);
				r.logValueWithHeader(`y*x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.divide(x);
				r.logValueWithHeader(`y/x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.mod(x);
				r.logValueWithHeader(`y%x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				y = MMNumberValue.scalarValue(10,u2.dimensions);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);

				r = x.multiply(y);
				r.logValueWithHeader(`x*y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.divide(y);
				r.logValueWithHeader(`x/y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.mod(y);
				r.logValueWithHeader(`x%y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.multiply(x);
				r.logValueWithHeader(`y*x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.divide(x);
				r.logValueWithHeader(`y/x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.mod(x);
				r.logValueWithHeader(`y%x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				y = new MMNumberValue(1,2,u2.dimensions);
				y.setValue(20, 1, 1);
				y.setValue(30, 1, 2);
				y.logValueWithHeader('y column array', results);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);

				r = x.multiply(y);
				r.logValueWithHeader(`x*y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.divide(y);
				r.logValueWithHeader(`x/y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.mod(y);
				r.logValueWithHeader(`x%y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.multiply(x);
				r.logValueWithHeader(`y*x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.divide(x);
				r.logValueWithHeader(`y/x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.mod(x);
				r.logValueWithHeader(`y%x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				// tests for power
				y = MMNumberValue.scalarValue(2);
				x.logValueWithHeader('Power tests: x row array', results);
				results.push(`x = ${x.stringWithUnit(x.defaultUnit)}`);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);

				r = x.power(y);
				r.logValueWithHeader(`x^y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				y = MMNumberValue.scalarValue(2, u2.dimensions);
				y.logValueWithHeader('y scalar with unit', results);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);
				try {
					r = x.power(y);
				} catch(e) {
					results.push(e);
				}

				y = new MMNumberValue(1,2);
				y.setValue(2, 1, 1);
				y.setValue(3, 1, 2);
				y.logValueWithHeader('y unitless column array', results)
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);
				try {
					r = x.power(y);
				} catch(e) {
					results.push(e);
				}

				x =  MMNumberValue.numberArrayValue([5, 10, 20]);
				x.logValueWithHeader('x unitless row array', results);
				r = x.power(y);
				r.logValueWithHeader(`x^y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				let s1 = new MMStringValue(3,2);
				s1.setValue('a',2,1);
				s1.setValue('b',2,2);
				vr = MMNumberValue.scalarValue(2);
				vc = MMNumberValue.scalarValue(2);
				let s2 = s1.valueForIndexRowColumn(vr,vc);
				s2.logValueWithHeader(`s1[2,2]`, results);
				let s3 = s1.add(s2);
				s3.logValueWithHeader(`s1 + s2`, results);

			}
				break;

			case 'formula': {
				let x = MMNumberValue.scalarValue(2);
				let y = MMNumberValue.scalarValue(3);
				let v1 = new MMConstantOperator(x);
				let v2 = new MMConstantOperator(y);
				let op = MMFormulaOpDictionary['+']();
				op.setInputs(v1,v2);
				let r = op.value();
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				let expr = new MMExpression('x1', this.rootModel);
				this.rootModel.forgetAllCalculations();

				let f = expr.childNamed('formula');
				let f2 = new MMFormula('f2', expr);
				f.formula = '2 + 3';
				f2.formula = '2 + 3'
				results.push(`f == f: ${f.isEqualToFormula(f)}`);
				results.push(`f == f2: ${f.isEqualToFormula(f2)}`);
				f2.formula = '2 h + 3 x';
				results.push(`f == f2: ${f.isEqualToFormula(f2)}`);
				let u = unitSystem.unitNamed('s');
				results.push(`f2 value: ${f2.value.stringWithUnit(u)}`);
				f2.formula = "' just a comment which should become string";
				results.push(`f2 string: ${f2.value.valueAtRowColumn(1,1)}`)
				f2.formula = '$';
				results.push(`f2 object: ${f2.value.valueAtRowColumn(1,1).name}`)
				f2.formula = '2 + 3';
			}
				break;

			case 'bigmult': {
				let length = 10000;
				results.push(`start - length ${length}`);
				let a = new Float64Array(length);
				let b = new Float64Array(length);
				a.fill(123.345, 0, length);
				b = a.map((v, i) => v * i);
				let c = new Float64Array(length*length);
				c = c.map((v,i) => a[i%length] * b[i%length]);
				results.push('done');
				command.results = true;
			}
				break;
		}
		command.results = results;
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
		this.isHidingInfo = false;
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

	/**
	 * @virtual forgetCalculated
	 */
	forgetCalculated() {}

	/**
	 * @method forgetAllCalculations
	 */
	forgetAllCalculations() {
		this.forgetCalculated();
	}

	/**
	 * @method changedFormula
	 * @param {MMFormula} formula
	 */
	changedFormula(formula) {
		if (!theMMSession.isLoadingCase) {
			this.forgetCalculated();
		}
	}

	/**
	 * @method displayUnit
	 * @returns {MMUnit}
	 */
	displayUnit() {
		return null;  // overridded as necessary
	}

	/**
	 * overrided by appropriate tools - should call super if no match with description
	 * @method valueDescribedBy
	 * @param {String} description
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueDescribedBy(description, requestor) {
		if (!description || description == 'self') {
			return MMToolValue.scalarValue(this);
		}
		else if (description == 'myName') {
			if (requestor) {
				this.valueRequstors.add(requestor);
			}
			return MMStringValue.scalarValue(this.name);
		}
		return null;
	}
}