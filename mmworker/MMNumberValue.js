'use strict';
/* global
	theMMSession:readonly
	MMValue:readonly
	MMTableValue:readonly
	MMTableValueColumn:readonly
	MMUnitSystem:readonly
	MMUnitDimensionType:readonly
*/

/**
 * Enum for dyadic units
 * @readonly
 * @enum {string}
 */
const MMDyadicUnitAction = Object.freeze({
	none: '?',
	equal: '=',
	multiply: '*',
	divide: '/',
	power: '^',
});

/**
 * @class MMNumberValue
 * @extends MMValue
 * @member {number[]} unitDimensions
 * @member {Float64Array} _values
 */
// eslint-disable-next-line no-unused-vars
class MMNumberValue extends MMValue {
	/** @constructor
	 * @param {Number} rowCount
	 * @param {Number} columnCount
	 * @param {number[]} unitDimensions - can be nil
	*/
	constructor(rowCount, columnCount, unitDimensions) {
		super(rowCount, columnCount);
		if(unitDimensions) {
			this.unitDimensions = Array.from(unitDimensions);
		}
		else {
			this.unitDimensions = new Array(0, 0, 0, 0, 0, 0, 0);
		}
		this._values = new Float64Array(this.valueCount);
		this._values.fill(0.0);
	}

	/** @method setUnitDimensions
	 * @param {Number[]} unitDimensions
	 */
	setUnitDimensions(unitDimensions){
		this.unitDimensions = Array.from(unitDimensions);
	}

	/** @method copyOf
	 * @returns {MMValue}  - a copy of this instance
	 */
	copyOf() {
		let newValue = new MMNumberValue(this.rowCount, this.columnCount, this.unitDimensions);
		newValue._values.set(this._values);
		return newValue;
	}

	get values() {
		// used by MMTableValueColumn for saving actual values
		return this._values;
	}

	/** @static scalarValue
	 * creates a MMNumberValue with a single value
	 * @param {Number} value
	 * @param {Number[]} unitDimensions
	 * @returns {MMNumberValue}
	 */
	static scalarValue(value, unitDimensions) {
		let newValue = new MMNumberValue(1, 1, unitDimensions);
		newValue._values[0] = value;
		return newValue;
	}

	/** @static numberArrayValue
	 * creates a MMNumberValue from an array of numbers
	 * @param {number[]} values
	 * @param {number[]} unitDimensions
	 */
	static numberArrayValue(values, unitDimensions) {
		let newValue = new MMNumberValue(values.length, 1, unitDimensions);
		newValue._values = Float64Array.from(values);
		return newValue;
	}

	/** @method logValueWithHeader 
	 * debugging method - information is pushed to results array
	 * @param {string} header
	 * @param {String[]} results
	*/
	logValueWithHeader(header, results) {
		results.push(header);
		let v = this._values;
		let columnCount = this.columnCount;
		for(let r = 0; r < this.rowCount; r++) {
			for(let c = 0; c < columnCount; c++) {
				results.push(`${r} ${c} ${v[r*columnCount + c]}`)
			}
		}
	}

	/** @method addUnitDimensions
	 * @param {Number[]} dimesions
	 */
	addUnitDimensions(dimensions) {
		for (let i = 0; i < MMUnitDimensionType.NUMDIMS; i++) {
			this.unitDimensions[i] += dimensions[i];
		}
	}
	
	/** @method subtractUnitDimensions
	 * @param {Number[]} dimesions
	 */
	subtractUnitDimensions(dimensions) {
		for (let i = 0; i < MMUnitDimensionType.NUMDIMS; i++) {
			this.unitDimensions[i] -= dimensions[i];
		}
	}
	
	/** @method multiplyUnitDimensions
	 * @param {Number} by - scalar multiplier
	 */
	multiplyUnitDimensions(by) {
		for (let i = 0; i < MMUnitDimensionType.NUMDIMS; i++) {
			this.unitDimensions[i] *= by;
		}
	}
	
	/** @method hasUnitDimensions
	 * @returns {boolean} - true if any are non zero
	 */
	hasUnitDimensions() {
		for (let i = 0; i < MMUnitDimensionType.NUMDIMS; i++) {
			if ( this.unitDimensions[i] )
				return true;
		}
		return false;
	}
	
	/** @method checkUnitDimensionsAreEqualTo
	 * @param {Number[]} dimensions
	 * @throws if they are not
	 */
	checkUnitDimensionsAreEqualTo(dimensions) {
		if (!MMUnitSystem.areDimensionsEqual(this.unitDimensions, dimensions)) {
			this.exceptionWith('mmcmd:valueUnequalUnitDimensions');
		}
	}

	/** @method setAllValuesTo
	 * @param value sets all values to this scalar
	 */
	setAllValuesTo(value) {
		this._values.fill(value);
	}
	/**
	 * @method setValue
	 * set value at row and column
	 * @param {Number} value
	 * @param {Number} row
	 * @param {Numbber} column
	 */
	setValue(value, row, column) {
		this.checkBounds(row, column);
		this._values[(row - 1) * this.columnCount + column - 1] = value;
	}

	/**
	 * @method valueAtRowColumn
	 * @param {Number} row
	 * @param {Number} column
	 * @returns {Number}
	 */
	valueAtRowColumn(row, column) {
		this.checkBounds(row, column);
		return this._values[(row-1) * this.columnCount + column - 1];
	}

	/**
	 * @method numberValueAtRowColumn
	 * @param {Number} row
	 * @param {Number} column
	 * @returns {MMNumberValue}
	 */
	numberValueAtRowColumn(row, column) {
		this.checkBounds(row, column);
		return MMNumberValue.scalarValue(this._values[(row-1) * this.columnCount + column - 1], this.unitDimensions);
	}

	/**
	 * @method defaultUnit
	 * @returns {MMUnit}
	 */
	get defaultUnit() {
		return theMMSession.unitSystem.defaultUnitWithDimensions(this.unitDimensions);
	}

	/**
	 * @method stringUsingUnit
	 * @param {MMUnit} outUnit - can be nil
	 * @returns {String}
	 */
	stringUsingUnit(outUnit) {
		if(!outUnit) {
			outUnit = this.defaultUnit;
		}

		if(this.valueCount == 0) {
			return '---';
		}

		let value = this._values[0];
		if(this.valueCount == 1) {
			return outUnit.stringForValue(value);
		}
		return `${outUnit.stringForValue(value)}...[${this.rowCount},${this.columnCount}]`;
	}

	/**
	 * @method stringWithUnit
	 * @param {MMUnit} outUnit - can be nil
	 * @returns {String}
	 */
	stringWithUnit(outUnit) {
		if(!outUnit) {
			outUnit = this.defaultUnit;
		}

		if(this.valueCount == 0) {
			return '---';
		}

		let value = this._values[0];
		if(this.valueCount == 1) {
			return outUnit.stringForValueWithUnit(value);
		}
		return `${outUnit.stringForValueWithUnit(value)}...[${this.rowCount},${this.columnCount}]`;
	}

	/**
	 * @method stringForRowColumnUnit
	 * @override
	 * @param {Number} row
	 * @param {Number} column
	 * @param {MMUnit} outUnit
	 * @returns {String}
	 */
	stringForRowColumnUnit(row, column, outUnit) {
		this.checkBounds(row, column);
		let value = this._values[(row - 1)*this.columnCount + column - 1];
		return outUnit.stringForValue(value);
	}

	/**
	 * @method stringForRowColumnWithUnit
	 * @override
	 * @param {Number} row
	 * @param {Number} column
	 * @param {MMUnit} outUnit
	 * @returns {String}
	 */
	stringForRowColumnWithUnit(row, column, outUnit) {
		this.checkBounds(row, column);
		let value = this._values[(row - 1)*this.columnCount + column - 1];
		return outUnit.stringForValueWithUnit(value);
	}

	/**
	 * @method valueForIndexRowColumn
	 * @override
	 * @param {MMValue} rowIndex
	 * @param {MMValue} columnIndex
	 * @returns {MMValue}
	 */
	valueForIndexRowColumn(rowIndex, columnIndex) {
		return this.valueForIndexRowColumnFactory(rowIndex, columnIndex, (nRows, nColumns) => {
			return new MMNumberValue(nRows, nColumns, this.unitDimensions);
		});
	}

	/**
	 * @method columnNumber
	 * @override
	 * @param {Number} number 
	 * @returns {MMValue}
	 */
	columnNumber(number) {
		if (this.columnCount == 1 ) {
			return this;
		}

		let rv = new MMNumberValue(this.rowCount, 1,this.unitDimensions);
		let rvValues = rv._values;
		for (let r = 0; r < this.rowCount; r++) {
			rvValues[r] = this._values[r*this.columnCount + number - 1];
		}
	
		return rv;
	}

	/**
	 * @method append
	 * appends columns to value
	 * @param {MMValue} additions
	*/
	append(additions) {
		additions = additions ? additions.numberValue() : null;
		if (!additions) {
			return this;
		}
		const thisColumnCount = this.columnCount;
		const addColumnCount = additions.columnCount;
		const addRowCount = additions.rowCount;
		const columnCount = thisColumnCount + addColumnCount;
		const rowCount = this.rowCount;

		this.checkUnitDimensionsAreEqualTo(additions.unitDimensions);
		const rv = new MMNumberValue(rowCount, columnCount, this.unitDimensions);
		const rvValues = rv._values;
		const thisValues = this._values;
		const addValues = additions._values;

		let column = 0;
		// copy this to new value
		for (let thisColumn = 0; thisColumn < thisColumnCount; thisColumn++) {
			for (let row = 0; row < rowCount; row++) {
				rvValues[row * columnCount + column] = thisValues[row * thisColumnCount + thisColumn];
			}
			column++;
		}

		for (let addColumn = 0; addColumn < addColumnCount; addColumn++) {
			for (let row = 0; row < rowCount; row++) {
				rvValues[row * columnCount + column] = addValues[(row % addRowCount) * addColumnCount + addColumn];
			}
			column++;
		}
	
		return rv;
	}



	/*
	 * dyadic functions
	 */

	/**
	* @method processDyadic
	* @param {MMNumberValue} value
	* @param {function} func
	*/
	processDyadic(value, func) {
		let rv = this.dyadicNumberResult(value, this.unitDimensions);
		let v1 = rv._values;
		let v2 = value._values;
		let rowCount = rv.rowCount;
		let columnCount = rv.columnCount;
		let valueRowCount = value.rowCount;
		let valueColumnCount = value.columnCount;
		for(let i = 0; i < rowCount; i++) {
			let rMine = i % this.rowCount;
			let rValue = i % valueRowCount;
			for(let j = 0; j < columnCount; j++) {
				let cMine = j % this.columnCount;
				let cValue = j % valueColumnCount;
				v1[i*columnCount+j] = func(
					this._values[rMine*this.columnCount + cMine],
					v2[rValue*valueColumnCount + cValue]
				);
			}
		}
		return rv;		
	}

	/**
	 * @method add
	 * returns the sum of this and value
	 * @param {MMNumberValue} value
	 * @returns {MMNumberValue}
	 */
	add(value) {
		this.checkUnitDimensionsAreEqualTo(value.unitDimensions);
		return this.processDyadic(value, (a,b) => a+b);
	}

	/**
	 * @method subtract
	 * returns the difference of this and value
	 * @param {MMNumberValue} value
	 * @returns {MMNumberValue}
	 */
	subtract(value) {
		this.checkUnitDimensionsAreEqualTo(value.unitDimensions);
		return this.processDyadic(value, (a,b) => a-b);
	}

	/**
	 * @method multiply
	 * returns the product of this and value
	 * @param {MMNumberValue} value
	 * @returns {MMNumberValue}
	 */
	multiply(value) {
		const rv = this.processDyadic(value, (a,b) => a*b);
		rv.addUnitDimensions(value.unitDimensions);
		return rv;
	}

	/**
	 * @method divide
	 * returns the division of this by value
	 * @param {MMNumberValue} value
	 * @returns {MMNumberValue}
	 */
	divide(value) {
		const rv = this.processDyadic(value, (a,b) => a/b);
		rv.subtractUnitDimensions(value.unitDimensions);
		return rv;
	}

	/**
	 * @method mod
	 * returns the remainder of this divided by value
	 * @param {MMNumberValue} value
	 * @returns {MMNumberValue}
	 */
	mod(value) {
		const rv = this.processDyadic(value, (a,b) => {
			return a % b;
			// the objc version did the equivalent of the following,
			// but I am not sure the floor operations should be included
			// if not needed
			// Math.floor(a + .1) % Math.floor(b + .1);
		});
		rv.subtractUnitDimensions(value.unitDimensions);
		return rv;
	}

	/**
	 * @method numberValue
	 * @override
	 * @returns MMNumberValue
	 */
	numberValue() {
		return this;
	}

	/**
	 * @method power
	 * returns this raise to the power of value
	 * @param {MMNumberValue} value
	 * @returns {MMNumberValue}
	 */
	power(value) {
		if(value.hasUnitDimensions()) {
			this.exceptionWith('mmcmd:valuePowerHasUnits');
		}
		if(value.valueCount > 1 && this.hasUnitDimensions()) {
			this.exceptionWith('mmcmd:valuePowerOfArrayWithUnits');
		}
		const rv = this.processDyadic(value, Math.pow);
		rv.multiplyUnitDimensions(value.valueAtRowColumn(1,1));
		return rv;
	}

	// monadic functions

	/**
	 * @method monadicResultWithUnitDimensions
	 * @param {Number[]} unitDimensions
	 * @returns {MMNumberValue}
	 */
	monadicResultWithUnitDimensions(unitDimensions) {
		return new MMNumberValue(this.rowCount, this.columnCount, unitDimensions); 
	}

	/** @method genericMonadic
	 * @param f - function taking a float value and returning the function result for it
	 */
	genericMonadic(f, ) {
		if (this.hasUnitDimensions()) {
			this.exceptionWith('mmcmd:formulaMonadicUnitNone');
		}
		let rv = new MMNumberValue(this.rowCount, this.columnCount);
		rv._values = this._values.map(f);
		return rv;
	}

	/** @method negative - returns this times -1
	 * @returns {MMNumberValue}
	 */
	negative() {
		let rv = this.monadicResultWithUnitDimensions(this.unitDimensions);
		const count = this.valueCount;
		for (let i = 0; i < count; i++) {
			rv._values[i] = -this._values[i];
		}
		return rv;
	}

	/** @method abs - returns absolute value for real
	 * @returns {MMNumberValue}
	 */
	abs() {
		let rv = this.monadicResultWithUnitDimensions(this.unitDimensions);
		const count = this.valueCount;
		for (let i = 0; i < count; i++) {
			const v = this._values[i];
			rv._values[i] = v >= 0 ? v : -v;
		}
		return rv;
	}

	/** @method min
	 * returns the minimum of all the values
	 */
	min() {
		if (this.valueCount === 1) {
			return this;
		}
		else if (this.valueCount > 0)  {
			const min = Math.min(...(this._values));
			return MMNumberValue.scalarValue(min, this.unitDimensions);
		}
		return null;
	}

	/** @method minRows
	 * returns the minimum of each row
	 */
	minRows() {
		const columnCount = this.columnCount;
		const rowCount = this.rowCount;
		const values = this._values;
		const rv = new MMNumberValue(rowCount, 1, this.unitDimensions);
		for (let r = 0; r < rowCount; r++) {
			const start = r*columnCount;
			const end = start + columnCount;
			const min = Math.min(...(values.slice(start, end)));
			rv._values[r] = min;
		}
		return rv;
	}

	/** @method minColumns
	 * returns the minimum of each column
	 */
	minColumns() {
		const columnCount = this.columnCount;
		const rowCount = this.rowCount;
		const values = this._values;
		const rv = new MMNumberValue(1, columnCount, this.unitDimensions);
		for (let c = 0; c < columnCount; c++) {
			let min = Number.POSITIVE_INFINITY;
			for (let r = 0; r < rowCount; r++) {
				min = Math.min(min, values[r*columnCount + c]);
			}
			rv.values[c] = min;
		}
		return rv;
	}

	/** @method max
	 * returns the maximum of all the values
	 */
	max() {
		if (this.valueCount === 1) {
			return this;
		}
		else if (this.valueCount > 0)  {
			const max = Math.max(...(this._values));
			return MMNumberValue.scalarValue(max, this.unitDimensions);
		}
		return null;
	}

	/** @method maxRows
	 * returns the maximum of each row
	 */
	maxRows() {
		const columnCount = this.columnCount;
		const rowCount = this.rowCount;
		const values = this._values;
		const rv = new MMNumberValue(rowCount, 1, this.unitDimensions);
		for (let r = 0; r < rowCount; r++) {
			const start = r*columnCount;
			const end = start + columnCount;
			const max = Math.max(...(values.slice(start, end)));
			rv._values[r] = max;
		}
		return rv;
	}

	/** @method maxColumns
	 * returns the maximum of each column
	 */
	maxColumns() {
		const columnCount = this.columnCount;
		const rowCount = this.rowCount;
		const values = this._values;
		const rv = new MMNumberValue(1, columnCount, this.unitDimensions);
		for (let c = 0; c < columnCount; c++) {
			let max = Number.NEGATIVE_INFINITY;
			for (let r = 0; r < rowCount; r++) {
				max = Math.max(max, values[r*columnCount + c]);
			}
			rv.values[c] = max;
		}
		return rv;
	}

	/** @method sum
	 * returns the sum of all values
	 */
	sum() {
		let sum = 0;
		const valueCount = this.valueCount;
		const values = this._values;
		for (let i = 0; i < valueCount; i++) {
			sum += values[i];
		}
		return MMNumberValue.scalarValue(sum, this.unitDimensions);
	}

	/** @method sumRows
	 * returns the sum of each row
	 */
	sumRows() {
		const columnCount = this.columnCount;
		const rowCount = this.rowCount;
		const values = this._values;
		const rv = new MMNumberValue(rowCount, 1, this.unitDimensions);
		for (let r = 0; r < rowCount; r++) {
			let sum = 0;
			for (let c = 0; c < columnCount; c++) {
				sum += values[r*columnCount + c];
			}
			rv.values[r] = sum;
		}
		return rv;
	}

	/** @method sumColumns
	 * returns the sum of each column
	 */
	sumColumns() {
		const columnCount = this.columnCount;
		const rowCount = this.rowCount;
		const values = this._values;
		const rv = new MMNumberValue(1, columnCount, this.unitDimensions);
		for (let c = 0; c < columnCount; c++) {
			let sum = 0;
			for (let r = 0; r < rowCount; r++) {
				sum += values[r*columnCount + c];
			}
			rv.values[c] = sum;
		}
		return rv;
	}

	/** @method transpose
	 *  @returns {MMNumberValue}
	 */
	transpose() {
		const rowCount = this.rowCount;
		const columnCount = this.columnCount
		const rv = new MMNumberValue(columnCount, rowCount, this.unitDimensions);
		const rvValues = rv._values;
		const thisValues = this._values;
		for (let i = 0; i < rowCount; i++) {
			for (let j = 0; j < columnCount; j++) {
				rvValues[j*rowCount+i] = thisValues[i*columnCount+j];
			}
		}
		return rv;
	}

	// dyadic functions

	/**
	 * @method concat
	 * @param  {MMNumberValue} other
	 * @return MMNumberValue
	 * overriden to concatanate two arrays into one
	 */
	concat(other) {
		let rv;
		if (other instanceof MMNumberValue) {
			this.checkUnitDimensionsAreEqualTo(other.unitDimensions);
			const valueCount = this.valueCount + other.valueCount;
			rv = new MMNumberValue(valueCount, 1, this.unitDimensions);
			for (let i = 0; i < this.valueCount; i++) {
				rv._values[i] = this._values[i];
			}
			for (let i = 0; i < other.valueCount; i++) {
				rv._values[i + this.valueCount] = other._values[i];
			}
		}
		return rv;
	}

	/** @method redimension
	 * return value reconfigured to given number of columns
	 * @param {MMNumberValue} nColumns
	 */
	redimension(nColumns) {
		let rv;
		if (nColumns instanceof MMNumberValue && nColumns.valueCount) {
			let columnCount = Math.floor(nColumns._values[0] + 0.01);
			if (this.valueCount % columnCount !== 0) {
				this.exceptionWith('mmcmd:formulaRedimCountError')
			}
			const rowCount = this.valueCount / columnCount;
			rv = new MMNumberValue(rowCount, columnCount, this.unitDimensions);
			rv._values = Float64Array.from(this._values);
		}
		return rv;
	}

	// complex value methods

	/**
	 * @method processComplexDyadic
	 * @param {String} name - name of operation
	 * @param {MMNumber} value - 2 column number value representing complex
	 * @param {MMDyadicUnitAction} unitAction
	 * @param {function} func
	*/
	processComplexDyadic(name, value, unitAction, func) {
		let v1, v2;
		[v1, v2] = this.complexNumberParameters(this, value);

		const rowCount = (v2.rowCount > v1.rowCount) ? v2.rowCount : v1.rowCount;
		let rv = new MMNumberValue(rowCount, 1, this.unitDimensions);
		switch (unitAction) {
			case MMDyadicUnitAction.none:
				if (v1.hasUnitDimensions() || v2.hasUnitDimensions()) {
					this.exceptionWith('mmcmd:formulaFunctionUnitsNone', {name: name});
				}
				break;
			case MMDyadicUnitAction.equal: 
				v1.checkUnitDimensionsAreEqualTo(v2.unitDimensions);
				break;
			case MMDyadicUnitAction.multiply:
				rv.addUnitDimensions(v2.unitDimensions);
				break;
			case MMDyadicUnitAction.divide:
				rv.subtractUnitDimensions(v2.unitDimensions);
				break;
			case MMDyadicUnitAction.power:
				if(v2.hasUnitDimensions()) {
					this.exceptionWith('mmcmd:valuePowerHasUnits');
				}
				if(v2.valueCount > 1 && this.hasUnitDimensions()) {
					this.exceptionWith('mmcmd:valuePowerOfArrayWithUnits');
				}
				rv.multiplyUnitDimensions(value.valueAtRowColumn(1,1));
				break;
			default:
				return null;
		}
		const iv = rv.copyOf();
		const rValues = rv._values;
		const iValues = iv._values;
		const count1 = v1.rowCount;
		const count2 = v2.rowCount
		for (let row = 0; row < rowCount; row++) {
			const row1 = row % count1;
			const row2 = row % count2;
			const rThis = v1._values[(row1) * 2];  // columnCount must be 2
			const iThis = v1._values[(row1) * 2 + 1];
			const rValue = v2._values[(row2) * 2];  // columnCount must be 2
			const iValue = v2._values[(row2) * 2 + 1];
			let rResult, iResult;
			[rResult, iResult] = func([rThis, iThis], [rValue, iValue]);
			rValues[row] = rResult;
			iValues[row] = iResult;
		}

		const displayUnit = theMMSession.unitSystem.baseUnitWithDimensions(rv.unitDimensions);
		const rColumn = new MMTableValueColumn({
			name: 'r',
			displayUnit: displayUnit.name,
			value: rv
		})
		const iColumn = new MMTableValueColumn({
			name: 'i',
			displayUnit: displayUnit.name,
			value: iv
		})
		const complexValue = new MMTableValue({ columns: [rColumn, iColumn]});
	
		return complexValue;		
	}

	complexNumberParameters(v1, v2) {
		if (v1.columnCount > 2 || v2.columnCount > 2) {
			this.exceptionWith('mmcmd:formulaComplexColumnCount');
		}

		if (v1.columnCount === 1) {
			// assume real and add zero img column
			const zero = MMNumberValue.scalarValue(0, v1.unitDimensions);
			v1 = v1.append(zero);
		}

		if (v2.columnCount === 1) {
			// assume real and add zero img column
			const zero = MMNumberValue.scalarValue(0, v2.unitDimensions);
			v2 = v2.append(zero);
		}
		return [v1, v2];
	}

	/**
	 * @method jsonValue
	 * @override
	 * @param {MMUnit} displayUnit
	 * @returns {Object} - representation of value using unit, suitable for conversion to json
	 */
	jsonValue(displayUnit) {
		let rv = {}
		if (!displayUnit) {
			displayUnit = theMMSession.unitSystem.defaultUnitWithDimensions(this.unitDimensions);
		}
		if (displayUnit) {
			rv['unit'] = displayUnit.name;
			rv['v'] = Array.from(this._values).map(x => displayUnit.convertFromBase(x));
			}
		else {
			rv['v'] = Array.from(this._values);
			rv['unit'] = theMMSession.unitSystem.baseUnitWithDimensions(this.unitDimensions).name;
		}
		rv['unitType'] = theMMSession.unitSystem.sets.defaultSet.typeNameForDimensions(this.unitDimensions);
		rv['t'] = 'n';
		rv['nr'] = this.rowCount;
		rv['nc'] = this.columnCount;
		return rv;
	}
}
