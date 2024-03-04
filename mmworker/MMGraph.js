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
	MMNumberValue:readonly
	MMStringValue:readonly
	theMMSession:readonly
	MMUnitSystem:readonly
	MMTableValue:readonly
	MMTableValueColumn:readonly
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
	barWithDot: 3,
	hidden: 4
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
			this.graph.setError('mmcmd:graphUnitError', {
				path: this.graph.getPath(),
				type: 'min',
				v: this.formula.formula,
				vmin: this.minFormula.formula
			});
			return null;
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
			this.graph.setError('mmcmd:graphUnitError', {
				path: this.graph.getPath(),
				type: 'max',
				v: this.formula.formula,
				vtype: this.maxFormula.formula
			});
			return null;
		}
		return this._maxValue;
	}

	/**
	 * @method title
	 */
	get title() {
		const parts = this.formula.formula.split("'");
		if (parts.length > 1) {
			return parts[1].trim();
		}
		else {
			return this.formula.formula.substring(0,10);
		}
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

	/**
	 * @method plotLabels
	 * @param {Number} count
	 * @returns {[Number, Number, [String]]} - min, max and the axis labels
	 */
	plotLabels(count) {
		const labels = [];
		let min = 0;
		let max = 1;
		if (this.values) {
			let displayUnit = this.displayUnit;
			if (!displayUnit)
				displayUnit = this.values.defaultUnit;
			const minValue = this.graph.valueDescribedBy(`min${this.name}`);
			min = minValue ? minValue.values[0] : 0;
			const maxValue = this.graph.valueDescribedBy(`max${this.name}`);
			max = maxValue ? maxValue.values[0] : 1;

			let step = (max - min) / (count - 1);

			for (let i = 0; i < count; i++) {
				let labelValue = step * i + min;
				if (displayUnit) {
					labelValue = displayUnit.convertFromBase(labelValue);
				}
				
				let labelText = null;
				if (labelValue != 0.0 && (Math.abs(labelValue) > 100000000.0 || Math.abs(labelValue) < 0.01)) {
					labelText = labelValue.toExponential(2);
				}
				else if (labelValue >= 1000000.0) {
					labelText =  labelValue.toFixed(0);
				}
				else {
					labelText =  labelValue.toFixed(3);
				}
				
				labelText = labelText.trim().replace(/(\.\d[^0]*)(0+$)/,'$1');
				labels.push(labelText);
			}
		}
		return [min, max, labels];
	}

	/**
	 * @method plotInfo()
	 * returns stringifiable object with info needed to plot
	 */
	plotInfo() {
		const info = {
			name: this.name,
			title: this.title,
		}
		if (this.values) {
			if (this.values.columnCount > 1) {
				info.columnCount = this.values.columnCount;
			}
			let displayUnit = this.displayUnit;
			if (!displayUnit) {
				displayUnit = this.values.defaultUnit;
			}
			info.unit = displayUnit.name;
			const minValue = this.graph.valueDescribedBy(`min${this.name}`);
			info.minValue = minValue ? minValue.values[0] : 0;
			const maxValue = this.graph.valueDescribedBy(`max${this.name}`);
			info.maxValue = maxValue ? maxValue.values[0] : 1
			if (info.unit === 'date' || info.unit === 'dated' || info.unit === 'datem') {
				// date values cannot be interpolated, so the view will have to convert them
				// one by one from the base values;
				info.minLabel = info.minValue;
				info.maxLabel = info.maxValue;
			}
			else {
				info.minLabel = displayUnit.convertFromBase(info.minValue);
				info.maxLabel = displayUnit.convertFromBase(info.maxValue);
			}
			info.values = Array.from(this.values.values)
		}
		return info;
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

	/**
	 * @method plotInfo()
	 * returns stringifiable object with info needed to plot
	 */
	plotInfo() {
		const info = super.plotInfo();
		info.lineType = this.lineType;
		return info;
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
		this.yValues = [];
		this.zValue = null;
		this.addYValue();
		if (graph.numberOfXValues > 0) {
			const firstX = graph.xForIndex(0);
			if (firstX.zValue) {
				this.addZValue();
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
		const count = this.yValues.length;
		for (let i = 0; i < count; i++) {
			const yValue = this.yValues[i];
			o[`Y${i + 1}`] = yValue.saveObject();
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
		this.yValues = [];
		let savedValue;
		for(let i = 1; (savedValue = saved[`Y${i}`]); i++) {
			const yValue = this.addYValue();
			yValue.initFromSaved(savedValue);
		}

		const savedZ = saved.Z1;
		if (savedZ) {
			const zValue = this.addZValue();
			zValue.initFromSaved(savedZ);
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
		const count = this.yValues.length;
		for (let i = 0; i < count; i++) {
			const yInfo = {}
			const yValue = this.yValues[i];
			const name = `y${this.number}_${i + 1}`;
			yInfo.name = name;
			yInfo.v = yValue.formula.formula;
			yInfo.vmin = yValue.minFormula.formula;
			yInfo.vmax = yValue.maxFormula.formula;
			if (!this.zValue) {
				yInfo.lineType = yValue.lineType;
			}
			if (yValue.displayUnit) {
				yInfo.unit = yValue.displayUnit.name;
			}
			else {
				const value = this.graph.valueDescribedBy(yValue.name);
				if (value) {
					yInfo.unit = value.defaultUnit.name;
				}			
			}	
			if (yInfo.unit) {
				yInfo.unitType = theMMSession.unitSystem.typeNameForUnitNamed(yValue.unit);
			}
	
			addValue(yInfo, 'min', name, yValue.displayUnit);
			addValue(yInfo, 'max', name, yValue.displayUnit);
			yValues.push(yInfo);
		}
		o.yValues = yValues;

		if (this.zValue) {
			const zInfo = {};
			const zValue = this.zValue;
			const name = `z${this.number}`;
			zInfo.name = name;
			zInfo.v = zValue.formula.formula;
			zInfo.vmin = zValue.minFormula.formula;
			zInfo.vmax = zValue.maxFormula.formula;
			zInfo.lineType = zValue.lineType;
			if (zValue.displayUnit) {
				zInfo.unit = zValue.displayUnit.name;
			}
			else {
				const value = this.graph.valueDescribedBy(zInfo.name);
				if (value) {
					zInfo.unit = value.defaultUnit.name;
				}			
			}	
			if (zInfo.unit) {
				zInfo.unitType = theMMSession.unitSystem.typeNameForUnitNamed(zInfo.unit);
			}

			addValue(zInfo, 'min', name, zValue.displayUnit);
			addValue(zInfo, 'max', name, zValue.displayUnit);
			o.zValue = zInfo;
		}
		return o;
	}

	/**
	 * @method plotInfo()
	 * returns stringifiable object with info needed to plot
	 */
	plotInfo() {
		const info = super.plotInfo();
		info.yInfo = this.yValues.map(y => y.plotInfo());
		if (this.zValue) {
			info.zInfo = this.zValue.plotInfo();
		}
		return info;
	}

	/**
	 * @method forget
	 */
	forget() {
		super.forget();
		for (let yValue of this.yValues) {
			yValue.forget();
		}
		if (this.zValue) {
			this.zValue.forget();
		}
	}

	/**
	 * @method addInputSourcesToSet
	 * @param {Set} sources - contains tools referenced by axis formulas
	 */
	addInputSourcesToSet(sources) {
		super.addInputSourcesToSet(sources);
		for (let yValue of this.yValues) {
			yValue.addInputSourcesToSet(sources);
		}
		if (this.zValue) {
			this.zValue.addInputSourcesToSet(sources);
		}
	}


	get numberOfYValues() {
		return this.yValues.length;
	}

	get numberOfZValues() {
		return this.zValue ? this.zValue.length : 0;
	}

	/**
	 * @method yForIndex
	 * @param {Number} index 
	 * @returns {MMGraphY}
	 */
	yForIndex(index) {
		return this.yValues[index];
	}

	/**
	 * @method addYValue
	 * @returns {MMGraphY} - the new line
	 */
	addYValue() {
		const n = this.yValues.length + 1;
		const yValue = new MMGraphY(this.graph, `y${this.number}_${n}`);
		this.yValues.push(yValue);
		this.graph.forgetCalculated();
		return yValue;
	}

	/**
	 * @method addYValueAtIndex
	 * @param {Number} index zero based
	 * @returns {MMGraphY} - the new Value
	 */
	addYValueAtIndex(index) {
		for (let i = this.yValues.length - 1; i >= index - 1; i--) {
			this.yValues[i].renameTo(`y${this.number}_${i + 2}`);
		}
		const newValue = new MMGraphY(this.graph, `y${this.number}_${index + 1}`);
		this.yValues.splice(index - 1, 0, newValue);
		this.graph.forgetCalculated();
		return newValue;
	}

	/**
	 * @method removeYValueAtIndex
	 * @param {Number} index zero based
	 */
	removeYValueAtIndex(index) {
		if (index >= 0 && this.yValues.length > 1) {
			this.yValues[index - 1].removeChildren();
			this.yValues.splice(index - 1,1);
			for (let i = index - 1; i < this.yValues.length; i++) {
				this.yValues[i].renameTo(`y${this.number}_${i + 1}`);
			}
			this.graph.forgetCalculated();
		}
		else {
			this.graph.setWarning('mmcmd:graphCantDeleteLast', {path: this.getPath(), vName: 'Y'});
		}
	}

	/**
	 * @method addZValue
	 * @returns {MMGraphY} - the new value
	 */
	addZValue() {
		this.zValue = new MMGraphY(this.graph, `z${this.number}`);
		this.graph.forgetCalculated();
		return this.zValue;
	}

	/**
	 * @method removeZValue
	 */
	removeZValue() {
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
		for (let yValue of this.yValues) {
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
		const nY = this.yValues.length;
		for (let i = 0; i < nY; i++) {
			this.yValues[i].renameTo(`y${n}_${i+1}`);
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
		if (this.selectedCurve) {
			o['Selected'] = this.selectedCurve;
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
		if (saved.Selected) {
			this.selectedCurve = saved.Selected;
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
		if (!description) {
			return super.valueDescribedBy(description, requestor);
		}
		const lcDescription = description.toLowerCase();
		// convenience function to add requestor is return value is known
		const returnValue = (v) => {
			if (v) {
				this.addRequestor(requestor);
				return v;
			}
		};
		// convenience function to deal with axis units
		const returnAxisValue = (axis) => {
			let v = axis.values;
			if (v) {
				if (axis.displayUnit && axis.displayUnit !== v.displayUnit) {
					v = v.copyOf();
					v.displayUnit = axis.displayUnit;
				}
			}
			return returnValue(v);
		}
		
		const is3d = this.xValues[0].zValue;
		if (lcDescription.startsWith('x')) {
			if (lcDescription === 'x') {
				return returnValue(this.xValues[0].values);
			}
			const xNumber = parseInt(lcDescription.substring(1));
			if (xNumber > 0 && xNumber <= this.xValues.length) {
				const xValue = this.xValues[xNumber - 1];
				return returnAxisValue(xValue);
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
				if (yNumber > 0 && yNumber <= xValue.numberOfYValues) {
					const yValue = xValue.yForIndex(yNumber - 1);
					return returnAxisValue(yValue);
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
					return returnAxisValue(xValue.zValue);
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
				rv = xValue.maxValue;
				
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
				if (yNumber > 0 && yNumber <= xValue.numberOfYValues) {
					const yValue = xValue.yForIndex(yNumber - 1);
					rv = yValue.minValue;
					
					if (!rv) {
						if (yNumber > 1 ) {
							const y1 = xValue.yForIndex(yNumber - 2);
							if (yValue.values && y1.values &&
								MMUnitSystem.areDimensionsEqual(yValue.values.unitDimensions, y1.values.unitDimensions))
							{
								rv = this.valueDescribedBy(`miny${xNumber}_${yNumber-1}`, requestor);
							}
						}
						else if (xNumber > 1) {
							const x1 = this.xValues[xNumber - 2];
						const y1 = x1.yForIndex(0);
							if (yValue.values && y1.values &&
								MMUnitSystem.areDimensionsEqual(yValue.values.unitDimensions, y1.values.unitDimensions))
							{
								rv = this.valueDescribedBy(`miny${xNumber-1}_1`);
							}
						}
						if (!rv) {
							rv = yValue.values ? yValue.values.min() : null;
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
				if (yNumber > 0 && yNumber <= xValue.numberOfYValues) {
					const yValue = xValue.yForIndex(yNumber - 1);
					rv = yValue.maxValue;
					
					if (!rv) {
						if (yNumber > 1 ) {
							const y1 = xValue.yForIndex(yNumber - 2);
							if (yValue.values && y1.values &&
								MMUnitSystem.areDimensionsEqual(yValue.values.unitDimensions, y1.values.unitDimensions))
							{
								rv = this.valueDescribedBy(`maxy${xNumber}_${yNumber-1}`, requestor);
							}
						}
						else if (xNumber > 1) {
							const x1 = this.xValues[xNumber - 2];
							const y1 = x1.yForIndex(0);
							if (yValue.values && y1.values &&
								MMUnitSystem.areDimensionsEqual(yValue.values.unitDimensions, y1.values.unitDimensions))
							{
								rv = this.valueDescribedBy(`maxy${xNumber-1}_1`);
							}
						}
						if (!rv) {
							rv = yValue.values ? yValue.values.max() : null;
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
						rv = xValue.zValue.values ? xValue.zValue.values.min() : null;
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
			const rv = this.tableValueForDescription(lcDescription);
			if (rv) {
				this.addRequestor(requestor);
			}
			return rv;
		}
		else if (lcDescription.startsWith("svg")) {
			const rv = this.svgForDescription(lcDescription);
			if (rv) {
				this.addRequestor(requestor);
			}
			return rv;
		}
		else if (lcDescription === 'legend') {
			return this.legendTable();	
		}
		else {
			return super.valueDescribedBy(description, requestor);
		}
	}

	/**
	 * @method tableValueForDescription
	 * @param {String} description
	 * @returns {MMTableValue}
	 */
	tableValueForDescription(description) {
		description = description.toLowerCase();
		let returnValue = null;
		if (description === 'table') {
			description = 'table1';
		}
		const xNumber = parseInt(description.substring(5));
		if (xNumber > 0 && xNumber <= this.xValues.length) {
			const xValue = this.xValues[xNumber - 1];
			if (xValue) {
				const nYLines = xValue.yValues.length;
				const a = [];
				let columnName = this.columnNameForAxis(xValue);
				let v = xValue.values;
				if (!v) { return null; }

				const zValue = xValue.zValue;
				const yValue0 = xValue.yValues[0];
				let isSurface3D = false;
				if (zValue && zValue.values && yValue0 && yValue0.values) {
					isSurface3D =zValue.values.valueCount === v.valueCount * yValue0.values.valueCount;
				}
				
				if (!isSurface3D) {
					if (v.columnCount === 1) {
						let column = new MMTableValueColumn({
							name: columnName,
							displayUnit: xValue.displayUnit ? xValue.displayUnit.name : null,
							value: v
						});
						a.push(column);

						for (let i = 0; i < nYLines; i++) {
							const yValue = xValue.yValues[i];
							columnName = this.columnNameForAxis(yValue);
							v = yValue.values;
							if (!v) { return null; }
							if (v.rowCount == 1 && v.columnCount > 1) {
								v = v.transpose();
							}
							
							column = new MMTableValueColumn({
								name: columnName,
								displayUnit: yValue.displayUnit ? yValue.displayUnit.name : null,
								value: v
							});
							a.push(column);
						}
	
						if (zValue) {
							columnName = this.columnNameForAxis(zValue);
							v = zValue.values;
							if (!v) { return null; }
							if (v.rowCount === 1 && v.columnCount > 1) {
								v = v.transpose();
							}
							column = new MMTableValueColumn({
								name: columnName,
								displayUnit: zValue.displayUnit ? zValue.displayUnit.name : null,
								value: v
							});
							a.push(column);
						}
					}
					else {
						// multiple columns
						const zero = MMNumberValue.scalarValue(0);
						for (let col = 1; col <= v.columnCount; col++) {
							const columnNumber = MMNumberValue.scalarValue(col);
							const columnValue = v.valueForIndexRowColumn(zero, columnNumber);
							const numberedName = `${columnName}_${col}`;
							const column = new MMTableValueColumn({
								name: numberedName,
								displayUnit: xValue.displayUnit ? xValue.displayUnit.name : null,
								value: columnValue
							});
							a.push(column);
							for (let i = 0; i < nYLines; i++) {
								const yValue = xValue.yValues[i];
								const yColumnName = this.columnNameForAxis(yValue);
								const columnV = yValue.values;
								if (!columnV) { return null; }
	
								const columnValue = columnV.valueForIndexRowColumn(zero, columnNumber);
								const numberedName = `${yColumnName}_${col}`;
								const column = new MMTableValueColumn({
									name: numberedName,
									displayUnit: yValue.displayUnit ? yValue.displayUnit.name : null,
									value: columnValue
								});
								a.push(column);

								if (zValue) {
									const zColumnName = this.columnNameForAxis(zValue);
									const columnV = zValue.values;
									if (!columnV) { return null; }
		
									const columnValue = columnV.valueForIndexRowColumn(zero, columnNumber);
									const numberedName = `${zColumnName}_${col}`;
									const column = new MMTableValueColumn({
										name: numberedName,
										displayUnit: zValue.displayUnit ? zValue.displayUnit.name : null,
										value: columnValue
									});
									a.push(column);
								}

							}		
						}
					}
				}
				else {
					// surface3d
					const zValues = zValue.values;
					const yValues = yValue0.values;
					if (zValues && yValues) {
						const xCount = v.valueCount;
						const yCount = yValues.valueCount;
						const zCount = zValues.valueCount;
						const xTemp = new MMNumberValue(zCount, 1, v.unitDimensions);
						const yTemp = new MMNumberValue(zCount, 1, yValues.unitDimensions);
						const zTemp = new MMNumberValue(zCount, 1, zValues.unitDimensions);
	
						let row = 0;
						const vx = v.values;
						const vy = yValues.values;
						const vz = zValues.values;
						const vxt = xTemp.values;
						const vyt = yTemp.values;
						const vzt = zTemp.values;

						if (zCount == xCount * yCount) {
							for (let ix = 0; ix < xCount; ix++) {
								for (let iy = 0; iy < yCount; iy++ ) {
									vxt[row] = vx[ix];
									vyt[row] = vy[iy];
									vzt[row] = vz[row];
									row++;
								}
							}
							let column = new MMTableValueColumn({
								name: columnName,
								displayUnit: xValue.displayUnit ? xValue.displayUnit.name : null,
								value: xTemp
							});
							a.push(column);

							columnName = this.columnNameForAxis(yValue0);
							column = new MMTableValueColumn({
								name: columnName,
								displayUnit: yValue0.displayUnit ? yValue0.displayUnit.name : null,
								value: yTemp
							});
							a.push(column);
	
							columnName = this.columnNameForAxis(zValue);
							column = new MMTableValueColumn({
								name: columnName,
								displayUnit: zValue.displayUnit ? zValue.displayUnit.name : null,
								value: zTemp
							});
							a.push(column);
						}	
					}
				}

				returnValue = new MMTableValue({columns: a});
			}
		}

		return returnValue;
	}

	/**
	 * @method legendTable
	 * @returns MMTableValue
	 */
	legendTable() {
		const lineColors =  ['Blue', 'Green', 'Brown', 'Orange', 'Purple', 'Red', 'Yellow'];
		if (this.xValues[0].zValue) { // 3d
			const nValues = this.xValues.length;
			const xTitles = new MMStringValue(nValues, 1);
			const yTitles = new MMStringValue(nValues, 1);
			const zTitles = new MMStringValue(nValues, 1);
			const colors = new MMStringValue(nValues, 1);

			const nColors = lineColors.length;
			for (let i = 0; i < nValues; i++) {
				const xValue = this.xValues[i];
				xTitles.values[i] = xValue.title;
				yTitles.values[i] = xValue.yValues[0].title;
				zTitles.values[i] = xValue.zValue.title;
				colors.values[i] = lineColors[i % nColors];
			}
			const columns = [];
			columns.push(new MMTableValueColumn({
				name: 'X',
				value: xTitles
			}));
			columns.push(new MMTableValueColumn({
				name: 'Y',
				value: yTitles
			}));
			columns.push(new MMTableValueColumn({
				name: 'Z',
				value: zTitles
			}));
			columns.push(new MMTableValueColumn({
				name: 'Color',
				value: colors
			}));
			return new MMTableValue({columns: columns});
		}
		else { // 2d
			let nValues = 0;
			for (const xValue of this.xValues) {
				nValues += xValue.yValues.length;
			}
			const xTitles = new MMStringValue(nValues, 1);
			const yTitles = new MMStringValue(nValues, 1);
			const colors = new MMStringValue(nValues, 1);

			const nColors = lineColors.length;
			let valueNumber = 0;
			for (const xValue of this.xValues) {
				for (const yValue of xValue.yValues) {
					xTitles.values[valueNumber] = xValue.title;
					yTitles.values[valueNumber] = yValue.title;
					colors.values[valueNumber] = lineColors[valueNumber % nColors];
					valueNumber++;
				}
			}
			const columns = [];
			columns.push(new MMTableValueColumn({
				name: 'X',
				value: xTitles
			}));
			columns.push(new MMTableValueColumn({
				name: 'Y',
				value: yTitles
			}));
			columns.push(new MMTableValueColumn({
				name: 'Color',
				value: colors
			}));
			return new MMTableValue({columns: columns});
		}
	}

	/**
	 * @method svgForDescription
	 * @param {String} description
	 * @returns {Array} svg strings
	 */
	svgForDescription(description) {
		const lcDescription = description.toLowerCase();
		let xAxisIndex = 0;
		let yAxisIndex = 0;

		const parseSelected = (s, offset) => {
			if (s) {
				const pathParts = s.split('_');
				if (pathParts.length > 1) {
					return [parseInt(pathParts[0]) - offset, parseInt(pathParts[1]) - offset];
					
				}
				else if (pathParts.length === 1) {
					return [parseInt(pathParts[0]) - offset, 0];
					
				}
				if (xAxisIndex >= this.xValues.length) {
					return [0, 0];
				}
			}
			return [0, 0];
		}

		if (lcDescription.length > 3) {
			[xAxisIndex, yAxisIndex] = parseSelected(lcDescription.substring(3), 1);
		} else if (this.selectedCurve) {
			[xAxisIndex, yAxisIndex] = parseSelected(this.selectedCurve, 0);
		}

		const height = 500.0;
		const width = 500.0;	
		
		const lines = [];
		const svgId = `svg_${this.name}`
		lines.push(`<svg id="${svgId}" viewBox="0,0,${width},${height}">`);
		
		const lineColors = [
			'Blue', '#009900', 'Brown', '#E58231', 'Purple', '#e60000', '#7D8F9B',
			'#9076C7', '#4994EC', '#684D43',
		];
		const nColors = lineColors.length;
		let colorNumber = 0;

		if (this.xValues[0].zValue) { // 3d
			let lineColor = lineColors[xAxisIndex % nColors];
	
			const aspect = width / height;
			const boxScale = 1.8;

			const pitch = MMNumberValue.pitchForAngle(Math.PI * 0.4);
			const roll = MMNumberValue.rollForAngle(Math.PI * -0.22);
			let transform = pitch.matrixMultiply(roll);
			const translate = new MMNumberValue(3, 1);
			const labelPos = new MMNumberValue(1, 3);

			if (aspect < 1.0) {
				translate.values[0] = 1.2;
				translate.values[1] = 0.0;
				translate.values[2] = 1.0 - aspect;
			}
			else {
				translate.values[0] = 0.2 + aspect;
				translate.values[1] = 0.0;
				translate.values[2] = 0.0;
			}
			transform = transform.matrixMultiply(translate.translate());

			let dScale;
			if (aspect < 1.0) {
				dScale = width / boxScale;
			}
			else {
				dScale = height / boxScale;
			}
			
			const scale = MMNumberValue.scalarValue(dScale);			
			const coords = new MMNumberValue(3, 3);
			const v = coords.values;
			const gridFormat = (x1, y1, x2, y2, x3, y3) => {
				return `<path class="svg_gridlines" fill="none" d="M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}"/>`;
			}
			const labelFormat = (x, y, color, anchor, text) => {
				return `<text  class="svg_label" x="${x}" y="${y}" stroke="${color}" text-anchor="${anchor}">${text}</text>`;
			}
			const titleFormat = (x, y, color, anchor, text) => {
				return `<text  class="svg_title" x="${x}" y="${y}" stroke="${color}" text-anchor="${anchor}">${text}</text>`;
			}
			const unitFormat = (x, y, color, anchor, text) => {
				return `<text  class="svg_unit" x="${x}" y="${y}" stroke="${color}" text-anchor="${anchor}">${text}</text>`;
			}
			
			lines.push('<g class="svg_grid" stroke="#b3b3b3">');

			// x labels and grid
			{
				const xValue = this.xValues[xAxisIndex];
				const xValues = xValue.values;
				const yValue = xValue.yForIndex(0);
				const yValues = yValue.values;
				const zValue = xValue.zValue;
				const zValues = zValue.values;

				const xLabels = xValue.plotLabels(5)[2];
				const xLabelCount = xLabels.length;
				const yLabels = yValue.plotLabels(5)[2];
				const yLabelCount = yLabels.length;
				const zLabels = zValue.plotLabels(5)[2];
				const zLabelCount = zLabels.length;

				lines.push('<g class="svg_gridx">');
				let xUnit = xValue.displayUnit;
				if (!xUnit) {
					xUnit = xValues.defaultUnit;
				}

				labelPos.values[0] = 0.3;
				labelPos.values[1] = -0.5;
				labelPos.values[2] = -0.05;
				let labelCoords = transform.transform(labelPos);
				labelCoords = labelCoords.multiply(scale);
				lines.push(titleFormat(labelCoords.values[0], // x
					height - labelCoords.values[1], // y
					lineColor, 'middle', xValue.title
				));

				labelPos.values[0] = 0.3;
				labelPos.values[1] = -0.5;
				labelPos.values[2] = -0.12;
				labelCoords = transform.transform(labelPos).multiply(scale);
				lines.push(unitFormat(labelCoords.values[0], // x
					height - labelCoords.values[1], // y
					lineColor, 'middle', xUnit.name
				));

				for (let i = 0; i < xLabelCount; i++) {
					const x = i / (xLabelCount - 1);
					// v is coords.values
					v[0] = x; v[1] = 0; v[2] = 0;
					v[3] = x; v[4] = 1; v[5] = 0;
					v[6] = x; v[7] = 1; v[8] = 1;
					
					const transformed = transform.transform(coords).multiply(scale);
					const tv = transformed.values;
					lines.push(gridFormat(
						tv[0],  // x1
						height - tv[1],	// y1
						tv[3],  // x2
						height - tv[4],	// y2
						tv[6],  // x3
						height - tv[7],	// y3
					))
				}

				for (let i = 0; i < xLabelCount; i++) {
					const xLabel = xLabels[i];
					labelPos.values[0] = i / (xLabelCount - 1);
					labelPos.values[1] = 0.0;
					labelPos.values[2] = -0.12;
					labelCoords = transform.transform(labelPos).multiply(scale);
					lines.push(labelFormat(
						labelCoords.values[0], // x
						height - labelCoords.values[1], // y
						lineColor, 'middle', xLabel
					));
				}
				lines.push('</g>'); // svg_gridx
			
				// y labels and grid
				lines.push('<g class="svg_gridy">');
				let yUnit = yValue.displayUnit;
				if ( !yUnit ) {
					yUnit = yValues.defaultUnit;
				}
				labelPos.values[0] = -0.2;
				labelPos.values[1] = 0.5;
				labelPos.values[2] = -0.1;
				labelCoords = transform.transform(labelPos).multiply(scale);
				lines.push(titleFormat(
					labelCoords.values[0],	// x
					height - labelCoords.values[1],	// y
					lineColor, "middle", yValue.title
				));
								
				labelPos.values[0] = -0.2;
				labelPos.values[1] = 0.5;
				labelPos.values[2] = -0.17;
				
				labelCoords = transform.transform(labelPos).multiply(scale);
				lines.push(unitFormat(
					labelCoords.values[0],	// x
					height - labelCoords.values[1],	// y
					lineColor, "middle", yUnit.name
				));

				for (let i = 0; i < yLabelCount; i++) {
					const y = i / (yLabelCount - 1);
					// v is coords.values
					v[0] = 0; v[1] = y; v[2] = 0;
					v[3] = 1; v[4] = y; v[5] = 0;
					v[6] = 1; v[7] = y; v[8] = 1;

					const transformed = transform.transform(coords).multiply(scale);
					const tv = transformed.values;
					lines.push(gridFormat(
						tv[0],  // x1
						height - tv[1],	// y1
						tv[3],  // x2
						height - tv[4],	// y2
						tv[6],  // x3
						height - tv[7],	// y3
					))
				}

				for (let i = 0; i < yLabelCount; i++) {
					const yLabel = yLabels[i];				
					labelPos.values[0] = -0.05;
					labelPos.values[1] = i / (yLabelCount - 1);
					labelPos.values[2] = -0.05;
					labelCoords = transform.transform(labelPos).multiply(scale);
					lines.push(labelFormat(
						labelCoords.values[0], // x
						height - labelCoords.values[1], // y
						lineColor, 'end', yLabel
					));	
				}			
				lines.push('</g>'); // svg_gridy

				// z labels and grid
				lines.push('<g class="svg_gridz">');
				let zUnit = zValue.displayUnit;
				if ( !zUnit ) {
					zUnit = zValues.defaultUnit;
				}
				labelPos.values[0] = -0.05;
				labelPos.values[1] = 1.0;
				labelPos.values[2] = 0.4;
					labelCoords = transform.transform(labelPos).multiply(scale);
				lines.push(titleFormat(
					labelCoords.values[0],	// x
					height - labelCoords.values[1],	// y
					lineColor, "end", zValue.title
				));

				labelPos.values[0] = -0.05;
				labelPos.values[1] = 1.0;
				labelPos.values[2] = 0.35;
				labelCoords = transform.transform(labelPos).multiply(scale);
				lines.push(unitFormat(
					labelCoords.values[0],	// x
					height - labelCoords.values[1],	// y
					lineColor, "end", zUnit.name
				));

				for (let i = 0; i < zLabelCount; i++) {
					const z = i / (zLabelCount - 1);
					// v is coords.values
					v[0] = 0; v[1] = 1; v[2] = z;
					v[3] = 1; v[4] = 1; v[5] = z;
					v[6] = 1; v[7] = 0; v[8] = z;

					const transformed = transform.transform(coords).multiply(scale);
					const tv = transformed.values;
					lines.push(gridFormat(
						tv[0],  // x1
						height - tv[1],	// y1
						tv[3],  // x2
						height - tv[4],	// y2
						tv[6],  // x3
						height - tv[7],	// y3
					))
				}

				for (let i = 0; i < zLabelCount; i++) {
					const zLabel = zLabels[i];				
					labelPos.values[0] = -0.02;
					labelPos.values[1] = 1;
					labelPos.values[2] = i / (zLabelCount - 1);
					labelCoords = transform.transform(labelPos).multiply(scale);
					lines.push(labelFormat(
						labelCoords.values[0], // x
						height - labelCoords.values[1], // y
						lineColor, 'end', zLabel
					));	
				}	
				lines.push('</g>'); // svg_gridz
				lines.push('</g>');	// svg_grid
			}

			// add the lines
			const renderLines = (lines, height, lineColor, opacity, lineClass, lineType, output) => {
				const isnormal = (n) => {
					return !isNaN(n) && n !== Infinity && n !== -Infinity;
				}
				const v = lines.values;
				switch (lineType) {
					case MMGraphLineType.bar:
					case MMGraphLineType.barWithDot:
					case MMGraphLineType.dot: {
						const radius = 3.0;
						const count = lines.rowCount;
						for (let row = 0; row < count; row++) {
							const offset = row * 3;
							const x = v[offset];
							const y = v[offset + 1];
							if (isnormal(x) && isnormal(y)) {
								output.push(`<circle stroke="${lineColor}" fill="${lineColor}" opacity="${opacity} class="${lineClass}" cx="${x + radius}" cy="${height - y}" r="${radius}"/>`);
							}
						}
					}
						break;

					case MMGraphLineType.hidden:
						break;
						
					default: {
						const v = lines.values;
						let x = v[0];
						let y = v[1];
						if (isnormal(x) && isnormal(y)) {
							const count = lines.rowCount;
							const path = []
							path.push(`<path stroke="${lineColor}" fill="none" opacity="${opacity} class="${lineClass}" d="M ${x} ${height - y}`);
							for (let row = 1; row < count; row++) {
								const offset = row * 3;
								x = v[offset];
								y = v[offset + 1];
								if (isnormal(x) && isnormal(y)) {
									path.push(`L ${x} ${height - y}`);
								}
							}
							path.push('"/>');
							output.push(path.join(' '));
						}
					}
						break;
				}
			}
			lines.push('<g class="svg_lines">');
			let colorNumber = 0;						
			for (let xNumber = 0; xNumber < this.xValues.length; xNumber++) {
				const opacity = xNumber === xAxisIndex ? 1 : 0.5;
				const xValue = this.xValues[xNumber];
				let xValues = xValue.values;
				const lineClass = `svg_line_${xNumber+1}`;
				lineColor = lineColors[colorNumber++ % nColors];
				const [minX, maxX] = xValue.plotLabels();
				const scaleForX = (minX === maxX) ? 0.1 : 1.0 / (maxX - minX);
				
				let numMin = MMNumberValue.scalarValue(minX, xValues.unitDimensions);
				let numScale = MMNumberValue.scalarValue(scaleForX);
				xValues = xValues.subtract(numMin).multiply(numScale);
				xValues.setUnitDimensions(numScale.unitDimensions);  // need to make unitless

				const yValue = xValue.yValues[0];
				let yValues = yValue.values;
				if (yValues.columnCount != 1 && xValues.columnCount == 1) {
					yValues = yValues.redimension(MMNumberValue.scalarValue(1));
				}
				const [minY, maxY] = yValue.plotLabels();
				const scaleForY = (minY === maxY ) ? 0.1 : 1.0 / (maxY - minY);
				numMin = MMNumberValue.scalarValue(minY, yValues.unitDimensions);
				numScale = MMNumberValue.scalarValue(scaleForY);
				yValues = yValues.subtract(numMin).multiply(numScale);
				yValues.setUnitDimensions(numScale.unitDimensions);  // need to make unitless

				const zValue = xValue.zValue;
				let zValues = zValue.values;
				const lineType = zValue.lineType;
				const [minZ, maxZ] = zValue.plotLabels();
				const scaleForZ = (minZ === maxZ ) ? 0.1 : 1.0 / (maxZ - minZ);
				numMin = MMNumberValue.scalarValue(minZ, zValues.unitDimensions);
				numScale = MMNumberValue.scalarValue(scaleForZ);
				zValues = zValues.subtract(numMin).multiply(numScale);
				zValues.setUnitDimensions(numScale.unitDimensions);  // need to make unitless

				if (zValues.valueCount == xValues.valueCount * yValues.valueCount) {
					// surface plot
					const columnCount = yValues.valueCount;
					const rowCount = xValues.valueCount;
					// x lines
					let zTemp = new MMNumberValue(columnCount, 1, zValues.unitDimensions);
					for (let row = 0; row < rowCount; row++) {
						const xConst = new MMNumberValue(columnCount, 1, xValues.unitDimensions);						
						const xRow = xValues.values[row];
						for (let col = 0; col < columnCount; col++) {
							xConst.values[col] = xRow;
							zTemp.values[col] = zValues.values[columnCount*row + col];
						}
						let coords = xConst.append(yValues).append(zTemp);
						coords = transform.transform(coords).multiply(scale);
						renderLines(coords, height, lineColor, opacity, lineClass, lineType, lines);
					}
					
					// y lines
					zTemp = new MMNumberValue(rowCount, 1, zValues.unitDimensions);
					for (let col = 0; col < columnCount; col++) {
						const yConst = new MMNumberValue(rowCount, 1, yValues.unitDimensions);
						
						const yCol = yValues.values[col];
						for (let row = 0; row < rowCount; row++) {
							yConst.values[row] = yCol;
							zTemp.values[row] = zValues.values[row * columnCount + col];
						}
						let coords = xValues.append(yConst).append(zTemp);
						coords = transform.transform(coords).multiply(scale);
						renderLines(coords, height, lineColor, opacity, lineClass, lineType, lines);
					}
				}
				else if (xValues.columnCount > 1 && xValues.columnCount === yValues.columnCount && xValues.columnCount === zValues.columnCount) {
					// each column is represented by a separate set of lines
					const  columnCount = xValues.columnCount;
					const rowCount = xValues.rowCount;
					let coords = new MMNumberValue(rowCount, 3);
					for (let column = 0; column < columnCount; column++) {
						for (let row = 0; row < rowCount; row++) {
							coords.values[row * 3] = xValues.values[row * columnCount + column];
							coords.values[row * 3 + 1] = yValues.values[row * columnCount + column];
							coords.values[row * 3 + 2] = zValues.values[row * columnCount + column];
						}		
						coords = transform.transform(coords).multiply(scale);
						renderLines(coords, height, lineColor, opacity, lineClass, lineType, lines);
					}
				}
				else {
					// line plot
					let coords = xValues.append(yValues).append(zValues);
					coords = transform.transform(coords).multiply(scale);
					renderLines(coords, height, lineColor, opacity, lineClass, lineType, lines);
				}
			}

			lines.push('</g>')	// svg_lines
		}
		else { // 2d
			// determine color to start with
			let colorStart = 0;
			const leftMargin = 90;
			const rightMargin = 10;
			let lineCount = 0;
			for (const x of this.xValues) {
				lineCount += x.numberOfYValues;
			}
			const yLegendSpacing = 20;
			const yLegendHeight = Math.floor((lineCount - 1)/3) * yLegendSpacing;
	
			const topMargin = 40 + yLegendHeight;
			const bottomMargin = 60;
			const plotWidth = width - leftMargin - rightMargin;
			const plotHeight = height - topMargin - bottomMargin;
	
			for (let i = 0; i < xAxisIndex; i++) {
				const x = this.xValues[i];
				colorStart += x.numberOfYValues;
			}
	
			const xValue = this.xValues[xAxisIndex];
			if (yAxisIndex >= xValue.numberOfValues ) {
				yAxisIndex = 0;
			}

			let xValues = xValue.values;
			let lineColor = lineColors[xAxisIndex % nColors];
	
			const xTitle = xValue.title +
				(xValue.displayUnit && (xValue.displayUnit.name !== 'Fraction')
				? ` (${xValue.displayUnit.name})`
				: '');
			lines.push(`<text class="svg_xlabel" x="${leftMargin + plotWidth/2}" y="${plotHeight + topMargin + 30}" stroke="black" text-anchor="middle">${xTitle}</text>`);
	
			if (xValues instanceof MMNumberValue ) {			
				const scale = 1.0;

				const [minX, maxX, xLabels] = xValue.plotLabels(5);
				const xLabelCount = xLabels.length;
				let step = plotWidth / (xLabelCount - 1);
				let labelStep = (maxX - minX) / (xLabelCount - 1);

				const gridFormat = (x1, x2, y1, y2) => {
					return `<line class="svg_gridlines" x1="${x1}" x2="${x2}" y1="${y1}" y2="${y2}" stroke="black"/>`
				}
				lines.push('<g class="svg_grid">"');
				lines.push('<g class="svg_gridx">"');

				for (let i = 0; i < xLabelCount; i++) {
					const centerX = i * step + leftMargin;
					lines.push(gridFormat(centerX, centerX, topMargin, topMargin + plotHeight));
					
					const labelText = xLabels[i];
					let anchor;
					let labelX = centerX;
					const labelY = height - bottomMargin + 15;
					if (i === 0) {
						anchor = 'start';
						labelX = leftMargin;
					}
					else if (i === xLabelCount - 1) {
						anchor = 'end';
					}
					else {
						anchor = 'middle';
					}
					lines.push(`<text  class="svg_xlabel" x="${labelX}" y="${labelY}" stroke="${lineColor}" text-anchor="${anchor}">${labelText}</text>`);
				}
				lines.push('</g>');
				lines.push('<g class="svg_gridy">');
	
				const yValue = xValue.yForIndex(yAxisIndex);
				const yLabels = yValue.plotLabels(5)[2];
				const yLabelCount = yLabels.length;
				lineColor = lineColors[(yAxisIndex + colorStart) % nColors];

				step = plotHeight / ( yLabelCount - 1);
				for (let i = 0; i < yLabelCount; i++) {
					const centerY = i * step + topMargin;
					lines.push(gridFormat(leftMargin, width - rightMargin, centerY, centerY));
					
					let yString = yLabels[yLabelCount - i - 1];					
					let labelY = centerY - 5.0;
					if (i === 0) {
						labelY = topMargin + 20.0;
					}
		
					lines.push(`<text class="svg_ylabel" x="${leftMargin - 5}" y="${labelY}" stroke="${lineColor}" text-anchor="end">${yString}</text>`);
				}
				lines.push('</g>');
				lines.push('</g>');
				
				// lines
				lines.push('<g class="svg_lines">');
				const xCount = this.xValues.length;
				let yTitleNumber = 0;
				for (let xNumber = 0; xNumber < xCount; xNumber++) {
					const xValue = this.xValues[xNumber];
					const xValues = xValue.values;					
					const nLines = xValue.numberOfYValues;
					const nPoints = xValues.valueCount;
					const scaleForX = (minX === maxX) ? 0.1 : scale * plotWidth / (maxX - minX);

					for (let lineNumber = 0; lineNumber < nLines; lineNumber++) {
						const lineClass = `svg_line_${xNumber+1}_${lineNumber+1}`;
						const yValue = xValue.yForIndex(lineNumber);
						const highlightTrace = false;  // for now turn this off - consider getting from interface
						const opacity = !highlightTrace || (xNumber === xAxisIndex && lineNumber === yAxisIndex) ? 1 : 0.5;
						
						let yValues = null;
						try {
							yValues = yValue.values;
						}
						catch(e) {
							return null;
						}
						const lineType = yValue.lineType;
						if (yValues instanceof MMNumberValue) {
							const n = Math.min(nPoints, yValues.valueCount);
							const [minY, maxY] = yValue.plotLabels(5);
							const scaleForY = (minY == maxY) ? 0.1 : scale * plotHeight / (maxY - minY);

							const rowCount = xValues.rowCount;
							const columnCount = xValues.columnCount;
							lineColor = lineColors[colorNumber++ % nColors];
							
							for (let col = 0; col < columnCount; col++) {
								const path = [];
								if (lineType === MMGraphLineType.dot || lineType === MMGraphLineType.barWithDot) {
									path.push(`<path class="${lineClass}" stroke="${lineColor}" fill="${lineColor}" opacity=${opacity} d="`);
								}
								else if (lineType !== MMGraphLineType.hidden) {
									path.push(`<path class="${lineClass}" stroke="${lineColor}" fill="none" opacity=${opacity} d="`);
								}

								for (let row = 0; row < rowCount; row++) {
									const pointCount = row*columnCount + col;
									if (pointCount < n) {
										const x = xValues.values[pointCount];
										const y = yValues.values[pointCount];
										
										const scaledY = ((minY - y) * scaleForY + 
											topMargin + plotHeight).toFixed(5);
										const scaledY0 = (topMargin + maxY * scaleForY).toFixed(5);
										const scaledX = (leftMargin + (x - minX) * scaleForX).toFixed(5);
	
										switch(lineType) {
											case MMGraphLineType.bar:
											case MMGraphLineType.barWithDot: 
												path.push(`M ${scaledX} ${scaledY}`);
												path.push(`L ${scaledX} ${scaledY0}`);
												if (lineType === MMGraphLineType.bar)
													break;
												// fall through and add dot as well for barWithDot
												
											case MMGraphLineType.dot:
												path.push(`M ${scaledX} ${scaledY} m -3 0 a 3,3 0 1,0 6,0 a 3,3 0 1,0 -6,0`);
												break;

											case MMGraphLineType.hidden:
												break;
												
											default:
												if (row == 0) {
													path.push(`M ${scaledX} ${scaledY}`);
												}
												else {
													path.push(`L ${scaledX} ${scaledY}`);
												}
												break;
										}		
									}
								}															
								lines.push(path.join(' ') + '"/>');
							}

							let yTitle = yValue.title;
							let displayUnit = yValue.displayUnit;
							if (!displayUnit) {
								displayUnit = yValue.values.defaultUnit;
							}
				
				
							if (displayUnit && displayUnit.name !== 'Fraction') {
								yTitle += ` (${displayUnit.name})`;
							}
							let titleAnchor = 'start';
							let titleX = 25;
							let titleY = (Math.floor(yTitleNumber/3) + 1) * yLegendSpacing;
							const column = yTitleNumber % 3;
							if (column === 1) {
								titleX = leftMargin + plotWidth/2;
								titleAnchor = 'middle';
							}	else if (column === 2) {
								titleX = leftMargin + plotWidth;
								titleAnchor = 'end';
							}
							lines.push(`<text class="svg_ylegend" x="${titleX}" y="${titleY}" stroke="${lineColor}" text-anchor="${titleAnchor}" opacity="opacity">${yTitle}</text>`);
							yTitleNumber++;
						}
					}
				}
			}
			lines.push('</g>');
		}
		lines.push('</svg>');
		return MMStringValue.scalarValue(lines.join('\n'));
	}

	/**
	 * @method htmlValue
	 * @returns {String}
	 */
	htmlValue(requestor) {
		const s = this.svgForDescription('svg');
		if (s) {
			this.addRequestor(requestor);
			return `<div class="graph__svg">${s.values[0]}</div>&nbsp;`;
		}
	}
	
	/**
	 * @method toolViewInfo
	 * @override
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	async toolViewInfo(command) {
		await super.toolViewInfo(command);
		const results = command.results;
		const xValues = [];
		const xCount = this.xValues.length;
		if (this.selectedCurve) {
			results['selected'] = this.selectedCurve;
		}
		for (let i = 0; i < xCount; i++) {
			const xValue = this.xValues[i];
			xValues.push(xValue.toolViewInfo());
		}
		results['xValues'] = xValues;

		const xValue = this.xValues[0];
		const is3d = xValue.zValue !== null;
		results['isKnown'] = xValue.values != null && xValue.yValues[0].values != null;
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
			else if (xValue.numberOfYValues != 1) {
				enableZ = false;
			}
		}
		results['is3d'] = is3d;
		results['enableY'] = enableY;
		results['enableZ'] = enableZ;
	}

	/**
	 * @method plotInfo()
	 * returns stringifiable object with info needed to plot
	 */
	plotInfo() {
		return {
			xInfo: this.xValues.map(x => x.plotInfo())
		}
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['addaxis'] = this.addAxisCommand;
		verbs['setlinetype'] = this.setLineTypeCommand;
		verbs['setunit'] = this.setUnitCommand;
		verbs['removeaxis'] = this.removeAxisCommand;
		verbs['restoreaxis'] = this.restoreAxisCommand;
		verbs['svg'] = this.svgCommand;
		verbs['plotinfo'] = this.plotInfoCommand;
		verbs['setselected'] = this.setSelectedCurve;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			addaxis: 'mmcmd:_graphAddAxis',
			setlinetype: 'mmcmd:_graphSetLineType',
			setunit: 'mmcmd:_graphSetUnit',
			removeaxis: 'mmcmd:_graphRemoveAxis',
			restoreaxis: 'mmcmd:_graphRestoreAxis',
			svg: 'mmcmd:_graphSvg',
			plotinfo: 'mmcmd:_graphPlotInfo',
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
	 * i.e. things that can be appended to a formula value
	 */
	parameters() {
		let p = super.parameters();
		p.push('x');
		p.push('minx');
		p.push('maxx');
		p.push('svg');
		p.push('table');
		p.push('legend');
		const xCount = this.xValues.length;
		const is3d = this.xValues[0].zValue != null;
		for (let i = 1; i <= xCount; i++) {
			p.push(`x${i}`);
			p.push(`minx${i}`);
			p.push(`maxx${i}`);
			p.push(`table${i}`);
			if (is3d) {
				p.push(`y${i}`);
				p.push(`miny${i}`);
				p.push(`maxy${i}`);
				p.push(`z${i}`);
				p.push(`minz${i}`);
				p.push(`maxz${i}`);
				p.push(`svg${i}`);
			}
			else {
				const xValue = this.xValues[i - 1];			
				const yCount = xValue.numberOfYValues;
				
				for (let j = 1; j <= yCount;  j++) {
					p.push(`y${i}_${j}`);
				}
				for (let j = 1; j <= yCount;  j++) {
					p.push(`miny${i}_${j}`);
				}
				for (let j = 1; j <= yCount;  j++) {
					p.push(`maxy${i}_${j}`);
				}
				for (let j = 1; j <= yCount;  j++) {
					p.push(`svg${i}_${j}`);
				}
			}
		}
		return p;
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
				return xValue.yValues[yNumber];
			}
		}
		return null;
	}

	/**
	 * @method addAxisCommand
	 * @param {MMCommand} command 
	 */
	addAxisCommand(command) {
		const name = command.args;
		if (name) {
			const parts = name.split('_');
			if (parts) {
				const axisType = parts[0][0];
				switch(axisType) {
					case 'x': {
						let xValue;
						if (parts[0].length > 1) {
							const xNumber = parseInt(parts[0].subtring(1));
							if (xNumber > 0 && xNumber <= this.xValues.length) {
								xValue = this.addXValueAtIndex(xNumber);
							}
						}
						else {
							xValue = this.addXValue();
						}
						if (xValue) {
							command.undo = `${this.getPath()} removeaxis ${xValue.name}`;
							return;
						}
						break;
					}

					case 'y': {
						let xNumber;
						if (parts[0].length > 1) {
							xNumber = parseInt(parts[0].subtring(1));
						}
						else {
							xNumber = this.xValues.length;
						}
						const xValue = this.xValues[xNumber - 1];
						if (xValue) {
							const yNumber = parts.length > 1 ? parseInt(parts[1]) : 0;
							if (typeof yNumber === 'number') {
								const yValue = yNumber ? xValue.addYValueAtIndex(yNumber) : xValue.addYValue();
								command.undo = `${this.getPath()} removeaxis ${yValue.name}`;
								return;
							}
						}
						break;
					}
					case 'z': {
						let xNumber;
						if (parts[0].length > 1) {
							xNumber = parseInt(parts[0].subtring(1));
						}
						else {
							xNumber = this.xValues.length;
						}
						const xValue = this.xValues[xNumber - 1];
						if (xValue) {
							const zValue = xValue.addZValue();
							command.undo = `${this.getPath()} removeaxis ${zValue.name}`;
							return;
						}
						break;
					}
				}
			}
		}
		this.setError('mmcmd:graphAddFail', {path: this.getPath(), name: name});
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
				const typeNames = ['line','scatter','bar','bar+dot', 'hidden'];
				const newType = typeNames.indexOf(args[1]);
				if (newType !== -1 && newType !== axis.lineType) {
					command.undo = `${this.getPath()} setlinetype ${args[0]} ${typeNames[axis.lineType]}`
					axis.lineType = newType;
					this.forgetCalculated();
					return;
				}
			}
		}

		this.setError('mmcmd:_graphSetLineType');
		return;
	}

	/**
	 * @method setSelectedCurve
	 * @param {MMCommand}} command 
	 * @returns 
	 */
	setSelectedCurve(command) {
		this.selectedCurve = command.args;
		this.forgetCalculated();
	}

	/**
	 * @method setUnitCommand
	 * @param {MMCommand} command
	 */
	setUnitCommand(command) {
		const args = command.args.split(/\s+/);
		if (args.length > 0) {
			const axis = this.axisFromName(args[0]);
			if (axis) {
				const unit = args[1] ? theMMSession.unitSystem.unitNamed(args[1]) : null;
				if (axis.displayUnit) {
					command.undo = `${this.getPath()} setUnit ${args[0]} ${axis.displayUnit.name}`;
				}
				else {
					command.undo = `${this.getPath()} setUnit ${args[0]}`;
				}
				axis.displayUnit = unit;
				this.forgetCalculated();
				return;
			}
		}
		this.setError('mmcmd:_graphSetUnit');
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
			const parts = name.substring(1).split('_');
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
						if (xValue.yValues.length < 2) {
							this.setWarning('mmcmd:graphCantDeleteLast', {path: this.getPath(), vName: 'Y'});
							return;
						}
						const yValue = xValue.yValues[yNumber - 1];
						if (yValue) {
							const savedY = yValue.saveObject();
							savedY.axisName = name;
							xValue.removeYValueAtIndex(yNumber);
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
							xValue.removeZValue();
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
		const parts = name.substring(1).split('_');
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
					const yValue = xValue.addYValueAtIndex(yNumber);
					yValue.initFromSaved(axis);
					return;
				}
				break;
			}
			case 'z': {
				const xValue = this.xValues[xNumber - 1];
				if (xValue) {
					const zValue = xValue.addZValue();
					zValue.initFromSaved(axis);
					return;
				}
				break;
			}
		}
		this.setError(`mmcmd:graphRestoreFail`, {name: name});
	}

	/**
	 * @method svgCommand
	 * @param {MMCommand} command
	 */
	svgCommand(command) {
		const svgValue = this.svgForDescription(command.args);
		command.results = svgValue ? svgValue.values[0] : '';
		return;
	}

	/**
	 * @method plotInfoCommand
	 * @param {MMCommand} command
	 */
	plotInfoCommand(command) {
		command.results = this.plotInfo();
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