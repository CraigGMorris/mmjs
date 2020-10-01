'use strict';
/* global
	MMTool:readonly
	MMFormula:readonly
	MMPropertyType:readonly
	MMNumberValue:readonly
	theMMSession:readonly
	MMUnitSystem:readonly
	MMMath:readonly
	MMCommandMessage:readonly
*/

/**
 * Enum for type of graph line
 * @readonly
 * @enum {Number}
 */
const MMGraphLineType = Object.freeze({
	line: 0,
	dot: 1,
	bar: 2,
	barWithDot: 3
});


/**
 * @class MMGraphAxis
 */
class MMGraphAxis {
	/**
	 * @constructor
	 * @param {MMGraph} graph
	 * @param {String} name - should start with x, y or z followed by index
	 * of the form n or i_j where n, i, j are integers
	 * a single number is only used with x
	 * for y and z two number are used with first being the x number and the second the y or z number 
	 */
	constructor(graph, name) {
		this.graph = graph;
		this.name = name;
		this.formula = new MMFormula(name, graph);
		this.formula.formula = '';
		this.minFormula = new MMFormula('min' + name, graph);
		this.minFormula.formula = '';
		this.maxFormula = new MMFormula('max' + name, graph);
		this.maxFormula.formula = '';
		this.displayUnit = null;
		this._values = null;
		this._minValue = null;
		this._maxValue = null;
	}

	/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		const o = {};
		o['v'] = this.formula.formula;
		o['vmin'] = this.minFormula.formula;
		o['vmax'] = this.maxFormula.formula;
		if (this.displayUnit) {
			o['unit'] = this.displayUnit.name;
		}
		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		this.formula.formula = saved.v ? saved.v : '';
		this.minFormula.formula = saved.vmin ? saved.vmin : '';
		this.maxFormula.formula = saved.vmax ? saved.vmax : '';
		if (saved.unit) {
			this.displayUnit = theMMSession.unitSystem.unitNamed(saved.unit);
		}
	}

	get values() {
		if (!this._values) {
			this._values = this.formula.numberValue();
		}
		return this._values;
	}

	get minValue() {
		if (!this._minValue) {
			this._minValue = this.minFormula.numberValue();
		}
		if (this.values && this._minValue &&
			!MMUnitSystem.areDimensionsEqual(this._values.unitDimensions, this._minValue.unitDimensions))
		{
			this._values.exceptionWith('mmcmd:graphUnitError', {
				path: this.getPath(),
				type: 'min',
				v: this.formula.formula,
				vmin: this.minFormula.formula
			});
		}
		return this._minValue;
	}

	get maxValue() {
		if (!this._maxValue) {
			this._maxValue = this.maxFormula.numberValue();
		}
		if (this.values && this._maxValue &&
			!MMUnitSystem.areDimensionsEqual(this._values.unitDimensions, this._maxValue.unitDimensions))
		{
			this._values.exceptionWith('mmcmd:graphUnitError', {
				path: this.getPath(),
				type: 'max',
				v: this.formula.formula,
				vtype: this.maxFormula.formula
			});
		}
		return this._maxValue;
	}

	/**
	 * @method forget
	 */
	forget() {
		this._values = null;
		this._minValue = null;
		this._maxValue = null;
	}

	/**
	 * @method addInputSourcesToSet
	 * @param {Set} sources - contains tools referenced by axis formulas
	 */
	addInputSourcesToSet(sources) {
		this.formula.addInputSourcesToSet(sources);
		this.minFormula.addInputSourcesToSet(sources);
		this.maxFormula.addInputSourcesToSet(sources);
	}

	/**
	 * @method renameTo
	 * @param {String} newName;
	 */
	renameTo(newName) {
		this.graph.renameChild(this.name , newName);
		this.graph.renameChild('min' + this.name, 'min' + newName);
		this.graph.renameChild('max' + this.name, 'max' + newName);
		this.name = newName;
	}

	/**
	 * @method removeChildren
	 */
	removeChildren() {
		this.graph.removeChildNamed(this.name);
		this.graph.removeChildNamed('min' + this.name);
		this.graph.removeChildNamed('max' + this.name);
	}
}

/**
 * @class MMGraphY
 * @extends MMGraphAxis
 */
class MMGraphY extends MMGraphAxis {
	/**
	 * @constructor
	 * @param {MMGraph} graph
	 * @param {String} name;
	 */
	constructor(graph, name) {
		super(graph, name);
		this.name = name;
		this.lineType = MMGraphLineType.line;
	}

	/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		const o = super.saveObject();
		o.lineType = this.lineType;
		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		super.initFromSaved(saved);
		this.lineType = saved.lineType;
	}
}

/**
 * @class MMGraphX
 * @extends MMGraphAxis
 */
class MMGraphX extends MMGraphAxis {
	/**
	 * @constructor
	 * @param {MMGraph} graph
	 * @param {Number} n;
	 */
	constructor(graph, n) {
		super(graph, `x${n}`);
		this.number = n;
		this.yLines = [];
		this.zValue = null;
		this.addYLine();
		if (graph.numberOfXValues > 0) {
			const firstX = graph.xForIndex(0);
			if (firstX.zValue) {
				this.addZLine();
			}
		}
	}

	/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		const o = super.saveObject();
		const count = this.yLines.length;
		for (let i = 0; i < count; i++) {
			const yLine = this.yLines[i];
			o[`Y${i + 1}`] = yLine.saveObject();
		}

		if (this.zValue) {
			o.Z1 = this.zValue.saveObject();
		}
		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		super.initFromSaved(saved);
		this.yLines = [];
		let savedLine;
		for(let i = 1; (savedLine = saved[`Y${i}`]); i++) {
			const yLine = this.addYLine();
			yLine.initFromSaved(savedLine);
		}

		const savedZ = saved.Z1;
		if (savedZ) {
			const zLine = this.addZLine();
			zLine.initFromSaved(savedZ);
		}
	}

	/**
	 * @method toolViewInfo
	 * @returns {Object} toolViewInfo for parent
	 */
	toolViewInfo() {
		const addValue = (o, prefix, name, displayUnit) => {
			const value = this.graph.valueDescribedBy(prefix+name);
			if (value) {
				o[`${prefix}_value`] = value.stringUsingUnit(displayUnit);
			}
		}
		const o = {};
		o.name = this.name;
		o.v = this.formula.formula;
		o.vmin = this.minFormula.formula;
		o.vmax = this.maxFormula.formula;
		if (this.displayUnit) {
			o.unit = this.displayUnit.name;
		}
		else {
			const value = this.graph.valueDescribedBy(this.name);
			if (value) {
				o.unit = value.defaultUnit.name;
			}			
		}
		if (o.unit) {
			o.unitType = theMMSession.unitSystem.typeNameForUnitNamed(o.unit);
		}

		addValue(o, 'min', this.name, this.displayUnit);
		addValue(o, 'max', this.name, this.displayUnit);

		const yValues = [];
		const count = this.yLines.length;
		for (let i = 0; i < count; i++) {
			const yValue = {}
			const yLine = this.yLines[i];
			const name = `y${this.number}_${i + 1}`;
			yValue.name = name;
			yValue.v = yLine.formula.formula;
			yValue.vmin = yLine.minFormula.formula;
			yValue.vmax = yLine.maxFormula.formula;
			if (!this.zValue) {
				yValue.lineType = yLine.lineType;
			}
			if (yLine.displayUnit) {
				yValue.unit = yLine.displayUnit.name;
			}
			else {
				const value = this.graph.valueDescribedBy(yValue.name);
				if (value) {
					yValue.unit = value.defaultUnit.name;
				}			
			}	
			if (yValue.unit) {
				yValue.unitType = theMMSession.unitSystem.typeNameForUnitNamed(yValue.unit);
			}
	
			addValue(yValue, 'min', name, yLine.displayUnit);
			addValue(yValue, 'max', name, yLine.displayUnit);
			yValues.push(yValue);
		}
		o.yValues = yValues;

		if (this.zValue) {
			const zValue = {};
			const zLine = this.zValue;
			const name = `z${this.number}`;
			zValue.name = name;
			zValue.v = zLine.formula.formula;
			zValue.vmin = zLine.minFormula.formula;
			zValue.vmax = zLine.maxFormula.formula;
			zValue.lineType = zLine.lineType;
			if (zLine.displayUnit) {
				zValue.unit = zLine.displayUnit.name;
			}
			else {
				const value = this.graph.valueDescribedBy(zValue.name);
				if (value) {
					zValue.unit = value.defaultUnit.name;
				}			
			}	
			if (zValue.unit) {
				zValue.unitType = theMMSession.unitSystem.typeNameForUnitNamed(zValue.unit);
			}

			addValue(zValue, 'min', name, zLine.displayUnit);
			addValue(zValue, 'max', name, zLine.displayUnit);
			o.zValue = zValue;
		}
		return o;
	}

	/**
	 * @method forget
	 */
	forget() {
		super.forget();
		for (let yLine of this.yLines) {
			yLine.forget();
		}
		if (this.zValue) {
			this.zValue.forget();
		}
	}

	get numberOfYLines() {
		return this.yLines.length;
	}

	/**
	 * @method yForIndex
	 * @param {Number} index 
	 * @returns {MMGraphY}
	 */
	yForIndex(index) {
		return this.yLines[index];
	}

	/**
	 * @method addYLine
	 * @returns {MMGraphY} - the new line
	 */
	addYLine() {
		const n = this.yLines.length + 1;
		const line = new MMGraphY(this.graph, `y${this.number}_${n}`);
		this.yLines.push(line);
		this.graph.forgetCalculated();
		return line;
	}

	/**
	 * @method addYLineAtIndex
	 * @param {Number} index zero based
	 * @returns {MMGraphY} - the new line
	 */
	addYLineAtIndex(index) {
		for (let i = this.yLines.length - 1; i >= index - 1; i--) {
			this.yLines[i].renameTo(`y${this.number}_${i + 2}`);
		}
		const newLine = new MMGraphY(this.graph, `y${this.number}_${index + 1}`);
		this.yLines.splice(index - 1, 0, newLine);
		this.graph.forgetCalculated();
		return newLine;
	}

	/**
	 * @method removeYLineAtIndex
	 * @param {Number} index zero based
	 */
	removeYLineAtIndex(index) {
		if (index >= 0 && this.yLines.length > 1) {
			this.yLines[index - 1].removeChildren();
			this.yLines.splice(index - 1,1);
			for (let i = index; i < this.yLines.length; i++) {
				this.yLines[i].renameTo(`y${this.number}_${i + 1}`);
			}
			this.graph.forgetCalculated();
		}
		else {
			this.graph.setWarning('mmcmd:graphCantDeleteLast', {path: this.getPath(), vName: 'Y'});
		}
	}

	/**
	 * @method addZLine
	 * @returns {MMGraphY} - the new line
	 */
	addZLine() {
		this.zValue = new MMGraphY(this.graph, `z${this.number}`);
		this.graph.forgetCalculated();
		return this.zValue;
	}

	/**
	 * @method removeZLine
	 */
	removeZLine() {
		if (this.zValue) {
			this.zValue.removeChildren()
			this.zValue = null;
			this.graph.forgetCalculated();
		}
	}

	/**
	 * @method removeChildren
	 */
	removeChildren() {
		this.graph.removeChildNamed(this.name);
		this.graph.removeChildNamed('min' + this.name);
		this.graph.removeChildNamed('max' + this.name);
		for (let yValue of this.yLines) {
			yValue.removeChildren()
		}
		if (this.zValue) {
			this.zValue.removeChildren()
		}
	}

	/**
	 * @method renumberTo
	 * @param {Number} n;
	 */
	renumberTo(n) {
		this.name = `x${n}`;
		this.number = n;
		const nY = this.yLines.length;
		for (let i = 0; i < nY; i++) {
			this.yLines[i].renameTo(`y${n}_${i+1}`);
		}
		if (this.zValue) {
			this.zValue.renameTo(`z${n}`);
		}
	}
}

/**
 * @class MMGraph
 * @extends MMTool
 */
// eslint-disable-next-line no-unused-vars
class MMGraph extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Graph');
		this.xValues = [];
		this.addXValue();
	}

	/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o = super.saveObject();
		o['Type'] = 'Graph';
		const count = this.xValues.length;
		for (let i = 0; i < count; i++) {
			const xValue = this.xValues[i];
			o[`X${i + 1}`] = xValue.saveObject();
		}

		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		super.initFromSaved(saved);
		this.xValues = [];
		let savedX;
		for (let i = 1; (savedX = saved[`X${i}`]); i++) {
			const xValue = this.addXValue();
			xValue.initFromSaved(savedX);
		}
	}

	get numberOfXValues() {
		return this.xValues.length;
	}

	/**
	 * @method inputSources
	 * @override
	 * @returns {Set} contains tools referenced by this tool
	 */
	inputSources() {
		let sources = super.inputSources();
		for (let xValue of this.xValues) {
			xValue.addInputSourcesToSet(sources);
		}
		return sources;
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

				for (let xValue of this.xValues) {
					xValue.forget();
				}
				super.forgetCalculated();
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
		const lcDescription = description.toLowerCase();
		if (lcDescription.length === 0) {
			return super.valueDescribedBy(description, requestor);
		}

		// convenience function to add requestor is return value is known
		const returnValue = (v) => {
			if (v) {
				this.addRequestor(requestor);
				return v;
			}
		};
		
		const is3d = this.xValues[0].zValue;
		if (lcDescription.startsWith('x')) {
			if (lcDescription === 'x') {
				return returnValue(this.xValues[0].values);
			}
			const xNumber = parseInt(lcDescription.substring(1));
			if (xNumber > 0 && xNumber <= this.xValues.length) {
				const xValue = this.xValues[xNumber - 1];
				return returnValue(xValue.values);
			}
		}
		else if (lcDescription.startsWith('y')) {
			const name = lcDescription === 'y' ? 'y1' : lcDescription;
			const parts = name.substring(1).split('_');

			let xNumber, yNumber;
			if (parts.length > 1) {
				xNumber = parseInt(parts[0]);
				yNumber = parseInt(parts[1]);
			}
			else {
				if (is3d) {
					yNumber = 1;
					xNumber = parseInt(parts[0]);
				}
				else {
					xNumber = 1;
					yNumber = parseInt(parts[0]);
				}
			}
			
			if (xNumber > 0 && xNumber <= this.xValues.length) {
				const xValue = this.xValues[xNumber - 1];
				if (yNumber > 0 && yNumber <= xValue.numberOfYLines) {
					const yLine = xValue.yForIndex(yNumber - 1);
					return returnValue(yLine.values);
				}
			}
		}
		else if (lcDescription.startsWith('z')) {
			const name = lcDescription === 'z' ? 'z1' : lcDescription;
			const parts = name.substring(1).split('_');

			let xNumber, zNumber;
			if (parts.length > 1) {
				xNumber = parseInt(parts[0]);
				zNumber = parseInt(parts[1]);
			}
			else {
				zNumber = 1;
				xNumber = parseInt(parts[0]);
			}
			
			if (xNumber > 0 && xNumber <= this.xValues.length) {
				const xValue = this.xValues[xNumber - 1];
				if (zNumber === 1) {
					return returnValue(xValue.zValue.values);
				}
			}
		}
		else if (lcDescription.startsWith('minx')) {
			const name = lcDescription === 'minx' ? 'minx1' : lcDescription;
			const xNumber = parseInt(name.substring(4));
			let rv;
			if (xNumber > 0 && xNumber <= this.xValues.length) {
				const xValue = this.xValues[xNumber - 1];
				rv = xValue.minValue;
				
				if (!rv) {
					if (xNumber > 1) {
						const x1 = this.xValues[xNumber - 2];
						if (xValue.values && x1.values &&
							MMUnitSystem.areDimensionsEqual(xValue.values.unitDimensions, x1.values.unitDimensions))
						{
							rv = this.valueDescribedBy(`minx${xNumber-1}`, requestor);
						}						
					}
					
					if (!rv) {
						rv = xValue.values ? xValue.values.min() : null;
					}
				}
			}
			return returnValue(rv);
		}
		else if (lcDescription.startsWith('maxx')) {
			const name = lcDescription === 'maxx' ? 'maxx1' : lcDescription;
			const xNumber = parseInt(name.substring(4));
			let rv;
			if (xNumber > 0 && xNumber <= this.xValues.length) {
				const xValue = this.xValues[xNumber - 1];
				rv = xValue.minValue;
				
				if (!rv) {
					if (xNumber > 1) {
						const x1 = this.xValues[xNumber - 2];
						if (xValue.values && x1.values &&
							MMUnitSystem.areDimensionsEqual(xValue.values.unitDimensions, x1.values.unitDimensions))
						{
							rv = this.valueDescribedBy(`maxx${xNumber-1}`, requestor);
						}						
					}
					
					if (!rv) {
						rv = xValue.values ? xValue.values.max() : null;
					}
				}
			}
			return returnValue(rv);
		}
		else if (lcDescription.startsWith('miny')) {
			const name = lcDescription === 'miny' ? 'miny1' : lcDescription;
			const parts = name.substring(4).split('_');

			let xNumber, yNumber;
			if (parts.length > 1) {
				xNumber = parseInt(parts[0]);
				yNumber = parseInt(parts[1]);
			}
			else {
				if ( is3d ) {
					yNumber = 1;
					xNumber = parseInt(parts[0]);
				}
				else {
					xNumber = 1;
					yNumber = parseInt(parts[0]);
				}
			}
			
			let rv;
			if (xNumber > 0 && xNumber <= this.xValues.length) {
				const xValue = this.xValues[xNumber - 1];
				if (yNumber > 0 && yNumber <= xValue.numberOfYLines) {
					const yLine = xValue.yForIndex(yNumber - 1);
					rv = yLine.minValue;
					
					if (!rv) {
						if (yNumber > 1 ) {
							const y1 = xValue.yForIndex(yNumber - 2);
							if (yLine.values && y1.values &&
								MMUnitSystem.areDimensionsEqual(yLine.values.unitDimensions, y1.values.unitDimensions))
							{
								rv = this.valueDescribedBy(`miny${xNumber}_${yNumber-1}`, requestor);
							}
						}
						else if (xNumber > 1) {
							const x1 = this.xValues[xNumber - 2];
						const y1 = x1.yForIndex(0);
							if (yLine.values && y1.values &&
								MMUnitSystem.areDimensionsEqual(yLine.values.unitDimensions, y1.values.unitDimensions))
							{
								rv = this.valueDescribedBy(`miny${xNumber-1}_1`);
							}
						}
						if (!rv) {
							rv = yLine.values ? yLine.values.min() : null;
						}
					}
				}
			}
			return returnValue(rv);
		}
		else if (lcDescription.startsWith('maxy')) {
			const name = lcDescription === 'maxy' ? 'maxy1' : lcDescription;
			const parts = name.substring(4).split('_');

			let xNumber, yNumber;
			if (parts.length > 1) {
				xNumber = parseInt(parts[0]);
				yNumber = parseInt(parts[1]);
			}
			else {
				if ( is3d ) {
					yNumber = 1;
					xNumber = parseInt(parts[0]);
				}
				else {
					xNumber = 1;
					yNumber = parseInt(parts[0]);
				}
			}
			
			let rv;
			if (xNumber > 0 && xNumber <= this.xValues.length) {
				const xValue = this.xValues[xNumber - 1];
				if (yNumber > 0 && yNumber <= xValue.numberOfYLines) {
					const yLine = xValue.yForIndex(yNumber - 1);
					rv = yLine.maxValue;
					
					if (!rv) {
						if (yNumber > 1 ) {
							const y1 = xValue.yForIndex(yNumber - 2);
							if (yLine.values && y1.values &&
								MMUnitSystem.areDimensionsEqual(yLine.values.unitDimensions, y1.values.unitDimensions))
							{
								rv = this.valueDescribedBy(`maxy${xNumber}_${yNumber-1}`, requestor);
							}
						}
						else if (xNumber > 1) {
							const x1 = this.xValues[xNumber - 2];
							const y1 = x1.yForIndex(0);
							if (yLine.values && y1.values &&
								MMUnitSystem.areDimensionsEqual(yLine.values.unitDimensions, y1.values.unitDimensions))
							{
								rv = this.valueDescribedBy(`maxy${xNumber-1}_1`);
							}
						}
						if (!rv) {
							rv = yLine.values ? yLine.values.max() : null;
						}
					}
				}
			}
			return returnValue(rv);
		}
		else if (lcDescription.startsWith('minz')) {
			const name = lcDescription === 'minz' ? 'minz1' : lcDescription;
			const parts = name.substring(4).split('_');
		
			let xNumber, zNumber;
			if (parts.length > 1 ) {
				xNumber = parseInt(parts[0]);
				zNumber = parseInt(parts[1]);
			}
			else {
				zNumber = 1;
				xNumber = parseInt(parts[0]);
			}
			
			let rv;
			if (xNumber > 0 && xNumber <= this.xValues.length) {
				const xValue = this.xValues[xNumber - 1];
				if (zNumber === 1) {
					rv = xValue.zValue.minValue;
					
					if (!rv)
						if (xNumber > 1) {
							const x1 = this.xValues[xNumber - 2];
							const z1 = x1.zValue;
							if (xValue.zValue.values && z1.values &&
								MMUnitSystem.areDimensionsEqual(xValue.zValue.values.unitDimensions, z1.values.unitDimensions))
							{
								rv = this.valueDescribedBy(`minz${xNumber - 1}`, requestor);
							}
						}
					if (!rv) {
						rv = this.zValue ? this.zValue.values.min() : null;
					}
				}
			}
			return returnValue(rv);
		}
		else if (lcDescription.startsWith('maxz')) {
			const name = lcDescription === 'maxz' ? 'maxz1' : lcDescription;
			const parts = name.substring(4).split('_');
		
			let xNumber, zNumber;
			if (parts.length > 1 ) {
				xNumber = parseInt(parts[0]);
				zNumber = parseInt(parts[1]);
			}
			else {
				zNumber = 1;
				xNumber = parseInt(parts[0]);
			}
			
			let rv;
			if (xNumber > 0 && xNumber <= this.xValues.length) {
				const xValue = this.xValues[xNumber - 1];
				if (zNumber === 1) {
					rv = xValue.zValue.maxValue;
					
					if (!rv)
						if (xNumber > 1) {
							const x1 = this.xValues[xNumber - 2];
							const z1 = x1.zValue;
							if (xValue.zValue.values && z1.values &&
								MMUnitSystem.areDimensionsEqual(xValue.zValue.values.unitDimensions, z1.values.unitDimensions))
							{
								rv = this.valueDescribedBy(`maxz${xNumber - 1}`, requestor);
							}
						}
					if (!rv) {
						rv = xValue.zValue.values ? xValue.zValue.values.max() : null;
					}
				}
			}
			return returnValue(rv);
		}
		else if (lcDescription.startsWith("table")) {
			return this.tableValueForDescription(lcDescription);
		}
		else if (lcDescription.startsWith("svg")) {
			return this.svgForDescription(lcDescription);
		}
	}

	/**
	 * @method toolViewInfo
	 * @override
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	toolViewInfo(command) {
		super.toolViewInfo(command);
		const results = command.results;
		const xValues = [];
		const xCount = this.xValues.length;
		for (let i = 0; i < xCount; i++) {
			const xValue = this.xValues[i];
			xValues.push(xValue.toolViewInfo());
		}
		results['xValues'] = xValues;

		const xValue = this.xValues[0];
		const is3d = xValue.zValue !== null;
		let enableY = true;
		let enableZ = true;
		if (this.numberOfXValues > 1) {
			enableZ = false;
			if (is3d) {
				enableY = false;
			}
		}
		else {
			if (is3d) {
				enableY = false;
				enableZ = false;
			}
			else if (xValue.numberOfYLines != 1) {
				enableZ = false;
			}
		}
		results['is3d'] = is3d;
		results['enableY'] = enableY;
		results['enableZ'] = enableZ;
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['setlinetype'] = this.setLineTypeCommand;
		verbs['setunit'] = this.setUnitCommand;
		verbs['removeaxis'] = this.removeAxisCommand;
		verbs['restoreaxis'] = this.restoreAxisCommand;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			setlinetype: 'mmcmd:?graphSetLineType',
			setunit: 'mmcmd:?graphSetUnit',
			removeaxis: 'mmcmd:?graphRemoveAxis',
			restoreaxis: 'mmcmd:?graphRestoreAxis',
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}

	/**
	 * @method axisFromName
	 * @param {String} name
	 * parse name like y2_1 and return the corresponding axiz
	 */
	axisFromName(name) {
		if (!name || name.length < 2) { return null; }

		const prefix = name[0];
		const numberStrings = name.substring(1).split('_');

		let xNumber, yNumber;
		[xNumber, yNumber] = numberStrings.map(s => parseInt(s) - 1);
		const xValue = this.xValues[xNumber];
		if (xValue) { 
			if (prefix === 'x') {
				return xValue;
			}
			if (prefix === 'z') {
				return xValue.zValue;
			}
			if (prefix === 'y' && typeof yNumber === 'number') {
				return xValue.yLines[yNumber];
			}
		}
		return null;
	}
	
	/**
	 * @method setLineTypeCommand
	 * @param {MMCommand} command 
	 */
	setLineTypeCommand(command) {
		const args = command.args.split(/\s+/);
		if (args.length > 1) {
			const axis = this.axisFromName(args[0]);
			if (axis && axis.lineType != undefined) {
				const typeNames = ['line','scatter','bar','bar+dot'];
				const newType = typeNames.indexOf(args[1]);
				if (newType !== -1) {
					command.undo = `${this.getPath()} setlinetype ${args[0]} ${typeNames[axis.lineType]}`
					axis.lineType = newType;
					return;
				}
			}
		}

		this.setError('mmcmd:?graphSetLineType');
		return;
	}

	/**
	 * @method setUnitCommand
	 * @param {MMCommand} command
	 */
	setUnitCommand(command) {
		const args = command.args.split(/\s+/);
		if (args.length > 1) {
			const axis = this.axisFromName(args[0]);
			if (axis) {
				const unit = theMMSession.unitSystem.unitNamed(args[1]);
				if (unit) {
					command.undo = `${this.getPath()} setUnit ${args[0]} ${axis.displayUnit.name}`;
					axis.displayUnit = unit;
					return;
				}
			}
		}
		this.setError('mmcmd:?graphSetUnit');
		return;	
	}

	/**
	 * @method removeAxisCommand
	 * @param {MMCommand} command
	 */
	removeAxisCommand(command) {
		const name = command.args;
		if (name.length > 1) {
			const prefix = name[0];
			const parts = name.substring(1).split(/\s+/);
			const xNumber = parseInt(name.substring(1)) - 1;
			const xValue = this.xValues[xNumber];
			if (xValue) {
				switch(prefix) {
					case 'x': {
						if (this.xValues.length < 2) {
							this.setWarning('mmcmd:graphCantDeleteLast', {path: this.getPath(), vName: 'X'});
							return;
						}
						const savedX = xValue.saveObject();
						savedX.axisName = name;
						this.removeXValueAtIndex(xNumber);
						const undoString = JSON.stringify(savedX);
						command.undo = `__blob__${this.getPath()} restoreaxis__blob__${undoString}`;
						return;
					}
					case 'y': {
						const yNumber = parts.length > 1 ? parseInt(parts[1]) : 1;
						if (xValue.yLines.length < 2) {
							this.setWarning('mmcmd:graphCantDeleteLast', {path: this.getPath(), vName: 'Y'});
							return;
						}
						const yValue = xValue.yLines[yNumber - 1];
						if (yValue) {
							const savedY = yValue.saveObject();
							savedY.axisName = name;
							xValue.removeYLineAtIndex(yNumber);
							const undoString = JSON.stringify(savedY);
							command.undo = `__blob__${this.getPath()} restoreaxis__blob__${undoString}`;
							return;
						}
						break;
					}
					case 'z': {
						if (this.xValues.length > 1) {
							this.setWarning('mmcmd:graphCantDelete3DZ', {path: this.getPath()});
							return;
						}
						const zValue = xValue.zValue;
						if (zValue) {
							const savedZ = zValue.saveObject();
							savedZ.axisName = name;
							xValue.removeZLine();
							const undoString = JSON.stringify(savedZ);
							command.undo = `__blob__${this.getPath()} restoreaxis__blob__${undoString}`;
							return;
						}
					}
				}
			}
		}
		this.setError('mmcmd:graphRemoveFailed', {name: name});
	}

	/**
	 * @method restoreAxisCommand
	 * @param {MMCommand} command
	 */
	restoreAxisCommand(command) {
		const axis = JSON.parse(command.args);
		const name = axis.axisName;
		const prefix = name[0];
		const parts = name.substring(1).split(/\s+/);
		const xNumber = parseInt(parts[0]);
		switch(prefix) {
			case 'x': {
				const xValue = this.addXValueAtIndex(xNumber);
				xValue.initFromSaved(axis);
				command.results = `${name} restored`;
				return;
			}
			case 'y': {
				const xValue = this.xValues[xNumber - 1];
				if (xValue) {
					const yNumber = parts.length > 1 ? parseInt(parts[1]) : 1;
					const yValue = xValue.addYLineAtIndex(yNumber);
					yValue.initFromSaved(axis);
					return;
				}
				break;
			}
			case 'z': {
				const xValue = this.xValues[xNumber - 1];
				if (xValue) {
					const zValue = xValue.addZLine();
					zValue.initFromSaved(axis);
					return;
				}
				break;
			}
		}
		this.setError(`mmcmd:graphRestoreFail`, {name: name});
	}


	/**
	 * @method addXValue
	 * @returns {MMGraphX}
	 */
	addXValue() {
		const n = this.xValues.length + 1;
		const newX = new MMGraphX(this, n);
		this.xValues.push(newX);
		this.forgetCalculated();
		return newX;
	}

	/**
	 * @method addXValueAtIndex
	 * @param {Number} index zero based
	 * @return {MMGraphX}
	 */
	addXValueAtIndex(index) {
		for (let i = this.xValues.length - 1; i >= index - 1; i--) {
			this.xValues[i].renumberTo(i + 2);
		}
		const newX = new MMGraphX(this, index);
		this.xValues.splice(index - 1, 0, newX);
		this.forgetCalculated();
		return newX;
	}

	/**
	 * @method removeXValueAtIndex
	 * @param {Number} index zero based
	 */
	removeXValueAtIndex(index) {
		if (index >= 0 && this.xValues.length > 1) {
			this.xValues[index].removeChildren();
			this.xValues.splice(index,1);
			for (let i = index; i < this.xValues.length; i++) {
				this.xValues[i].renumberTo(i + 1);
			}
			this.forgetCalculated();
		}
		else {
			this.setWarning('mmcmd:graphCantDeleteLast', {path: this.getPath(), vName: 'X'});
		}
	}

	/**
	 * @method xForIndex
	 * @param {Number} index
	 * @returns {MMGraphX}
	 */
	xForIndex(index) {
		return this.xValues[index];
	}

	/**
	 * @method columnNameForAxis
	 * @param {MMGraphAxis} axis 
	 */
	columnNameForAxis(axis) {
		const parts = axis.formula.formula.split("'");
		if (parts.length > 1) {
			const comment = parts[1].trim();
			return comment.replace(/\s/g,'_');
		}
		else {
			return axis.formula.formula;
		}
	}
}