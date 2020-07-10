'use strict';
/* global
	theMMSession:readonly
	MMMath:readonly
	MMValue:readonly
	MMTableValue:readonly
	MMTableValueColumn:readonly
	MMUnitSystem:readonly
	MMUnitDimensionType:readonly,
	MMFunctionResult:readonly,
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
	processDyadic(value, unitAction, func) {
		let rv = this.dyadicNumberResult(value, this.unitDimensions);
		let v1 = rv._values;
		let v2 = value._values;
		switch (unitAction) {
			case MMDyadicUnitAction.none:
				if (this.hasUnitDimensions() || value.hasUnitDimensions()) {
					this.exceptionWith('mmcmd:formulaFunctionUnitsNone', {name: name});
				}
				break;
			case MMDyadicUnitAction.equal: 
				this.checkUnitDimensionsAreEqualTo(value.unitDimensions);
				break;
			case MMDyadicUnitAction.multiply:
				rv.addUnitDimensions(value.unitDimensions);
				break;
			case MMDyadicUnitAction.divide:
				rv.subtractUnitDimensions(value.unitDimensions);
				break;
			case MMDyadicUnitAction.power:
				if(value.hasUnitDimensions()) {
					this.exceptionWith('mmcmd:valuePowerHasUnits');
				}
				if(value.valueCount > 1 && this.hasUnitDimensions()) {
					this.exceptionWith('mmcmd:valuePowerOfArrayWithUnits');
				}
				rv.multiplyUnitDimensions(v2[0]);
				break;
			default:
				return null;
		}
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
		return this.processDyadic(value, MMDyadicUnitAction.equal, (a,b) => a+b);
	}

	/**
	 * @method subtract
	 * returns the difference of this and value
	 * @param {MMNumberValue} value
	 * @returns {MMNumberValue}
	 */
	subtract(value) {
		return this.processDyadic(value, MMDyadicUnitAction.equal, (a,b) => a-b);
	}

	/**
	 * @method multiply
	 * returns the product of this and value
	 * @param {MMNumberValue} value
	 * @returns {MMNumberValue}
	 */
	multiply(value) {
		const rv = this.processDyadic(value, MMDyadicUnitAction.multiply, (a,b) => a*b);
		return rv;
	}

	/**
	 * @method divideBy
	 * returns the division of this by value
	 * @param {MMNumberValue} value
	 * @returns {MMNumberValue}
	 */
	divideBy(value) {
		const rv = this.processDyadic(value, MMDyadicUnitAction.divide, (a,b) => a/b);
		return rv;
	}

	/**
	 * @method mod
	 * returns the remainder of this divided by value
	 * @param {MMNumberValue} value
	 * @returns {MMNumberValue}
	 */
	mod(value) {
		const rv = this.processDyadic(value, MMDyadicUnitAction.divide, (a,b) => {
			// return a % b;
			// the objc version did the equivalent of the following,
			// but I am not sure the floor operations should be included
			// if not needed
			return Math.floor(Math.abs(a) + .1) % Math.floor(Math.abs(b) + .1);
		});
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
		const rv = this.processDyadic(value, MMDyadicUnitAction.power, Math.pow);
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
	genericMonadic(f, canHaveUnits = false) {
		if (!canHaveUnits && this.hasUnitDimensions()) {
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
	 * overriden to concatanate two value into one by row
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
			rv._values =  Float64Array.from(this._values);
		}
		return rv;
	}

	/** @method cross
	 * return cross product
	 * @param {MMNumberValue} other
	 * @return {MMNumberValue}
	 */
	cross(other) {
		if (this.valueCount % 3 || other.valueCount % 3) {
			this.exceptionWith('mmcmd:crossProductNotThree');
		}
		const maxValueCount = Math.max(this.valueCount, other.valueCount);

		let nRows, nColumns;
		if (maxValueCount > 3) {
			nColumns = 3;
			nRows = maxValueCount / 3;
		}
		else {
			nRows = 3;
			nColumns = 1;
		}

		const rv = new MMNumberValue(nRows, nColumns, this.unitDimensions);													 
		const mValues = this._values;
		const oValues = other._values;
		const rValues = rv._values;
		for (let n = 0; n < maxValueCount; n+= 3 ) {
			const mOrigin = n % this.valueCount;
			const oOrigin = n % other.valueCount;
			
			const a1 = mValues[0 + mOrigin ];
			const a2 = mValues[ 1 + mOrigin ];
			const a3 = mValues[ 2 + mOrigin ];
			const b1 = oValues[ 0 + oOrigin ];
			const b2 = oValues[ 1 + oOrigin ];
			const b3 = oValues[ 2 + oOrigin ];
			
			rValues[n + 0] = a2*b3 - a3*b2;
			rValues[n + 1] = a3*b1 - a1*b3;
			rValues[n + 2] = a1*b2 - a2*b1;
		}
		
		rv.addUnitDimensions(other.unitDimensions);
		return rv;		
	}

	/** @method matrixMultiply
	 * return the matrix multiplication of this by other - i.e. dot product
	 * @param {MMNumberValue} other
	 * @return {MMNumberValue}
	 */
	matrixMultiply(other) {
		if (this.columnCount !== other.rowCount ) {
			this.exceptionWith('mmcmd:matrixMultiplyeColsNeRows');
		}
		
		const nRows = this.rowCount;
		const nColumns = other.columnCount;
		const rv = new MMNumberValue(nRows, nColumns, this.unitDimensions);

		const myValues = this._values;
		const myColumnCount = this.columnCount;
		const oValues = other._values;
		const rValues = rv._values;
		for (let i = 0; i < nRows; i++) {
			for (let j = 0; j < nColumns; j++) {
				let sum = 0.0;
				for (let k = 0; k < myColumnCount; k++) {
					sum += myValues[myColumnCount * i + k] * oValues[nColumns * k + j];
				}
				rValues[nColumns * i + j] = sum;
			}
		}
		
		rv.addUnitDimensions(other.unitDimensions);
		return rv;
	}

	/**
	 * @method luDecomposition
	 * pivot is an output vector that records the row permutations effected by partial pivoting.
	 * it must be sized appropriately by the calling routine
	 * based on Numerical Recipe in C
	 * @return {Object} contains pivot:, a Int32Array that records the row permutations effected by partial pivoting
	 * and isEven: which is true if the number of row interchanges was even and false if odd
	 */
	luDecomposition() {
		if (this.columnCount !== this.rowCount) {
			this.exceptionWith('mmcmd:matrixNotSquare', {f: 'luDecomposition'})
		}
		const count = this.columnCount;
		let isEven = true;
		let imax = 0;
		const vv = new Float64Array(count);
		const pivot = new Int32Array(count);

		const values = this._values;
		for (let i = 0; i < count; i++ ) {  // loop over rows to get implicit scaling information
			let big = 0.0;
			for (let j = 0; j < count; j++ ) {
				const temp = Math.abs(values[count * i  + j]);
				if (temp > big)
					big = temp;
			}
			if (big === 0.0) {
				this.exceptionWith('mmcmd:matrixLudecompSingular');
			}
			
			vv[i] = 1.0 / big;  // save the scaling
		}
		
		for (let j = 0; j < count; j++ ) {     // this loop is over columns of Crout.s method
			for (let i = 0; i < j; i++) {
				let sum = values[count * i + j];
				for (let k = 0; k < i; k++) {
					sum -= values[count * i + k] * values[count * k + j];
				}
				values[count * i + j] = sum;
			}
			
			let big = 0.0;   // initialize the search for the largest pivot
			for (let i = j; i < count; i++) {
				let sum = values[count * i + j];
				for (let k = 0; k < j; k++ ) {
					sum -= values[count * i + k] * values[count * k + j];
				}
				
				values[count * i + j] = sum;
				
				const dum = vv[i] * Math.abs(sum);
				if ( dum >= big ) {
					big = dum;  // is the figure of merit for the pivot better than the best so far
					imax = i;
				}
			}
			
			if (j != imax) {       // do we need to interchange rows?
				for (let k = 0; k < count; k++ ) { // yes - do so
					const dum = values[count * imax + k];
					values[count * imax + k] = values[count * j + k];
					values[count * j + k] = dum;
				}
				isEven = !isEven;		// ...and change the parity of isEven
				vv[imax] = vv[j];	// and interchange the scale factor
			}
			
			pivot[j] = imax;
			if (values[count * j + j] === 0.0) {  // if the pivot element is zero, then the matrix is singular.  For some applications on singular
				values[count * j + j] = 1e-20;   // matricies, it is desirable to substitute a tiny number for zero
			}
			if (j !== count - 1 ) {   // Now, finally, divide by the pivot element
				const dum = 1.0 / values[count * j + j];
				for (let i = j + 1; i < count; i++) {
					values[count * i + j] *= dum;
				}
			}
		}
		return {pivot: pivot, isEven: isEven}
	}

	/**
	 * @method luBackSubstitute
	 * @param {Float64Array} b 
	 * @param {Int32Array} pivot 
	 * values in b are replaced with x in solving equation A*x = b
	 * this matrix is A having undergone luDecomposition producing pivot
	 */
	luBackSubstitute(b, pivot) {
		if (this.columnCount !== this.rowCount) {
			this.exceptionWith('mmcmd:matrixNotSquare', {f: 'luBackSubstitute'})
		}
		const count = this.columnCount;
		const values = this._values;
		let ii = -1;
		for (let i = 0; i < count; i++) {	// when ii is a positive value it will become the index of the first
			let ip = pivot[i];			// nonvanishing element of b. We now do the forward substitution.
			let sum = b[ip];
			b[ip] = b[i];
			if (ii >= 0) {
				for (let j = ii; j < i; j++) {
					sum -= values[count * i + j] * b[j];
				}
			}
			else if (sum !== 0.0) {
				ii = i;		 // a nonzero element was encountered, so from now on we will have to do the sums in the loop above
			}
			b[i] = sum;
		}
		
		for (let i = count - 1; i >= 0; i--) {	// now we do the backsubstitution
			let sum = b[i];
			for (let j = i + 1; j < count; j++) {
				sum -= values[count * i + j] * b[j];
			}
			b[i] = sum /values[count * i + i];
		}
	}

	/**
	 * invert - inverts this matrix
	 */
	invert() {
		if (this.columnCount !== this.rowCount) {
			this.exceptionWith('mmcmd:matrixNotSquare', {f: 'invert'})
		}
		const count = this.columnCount;
	
		const col = new Float64Array(count);
		const a = this.copyOf();
		const rv = new MMNumberValue(count, count, this.unitDimensions);
		rv.multiplyUnitDimensions(-1);
		const rvValues = rv._values;
		const decomp = a.luDecomposition();

		for (let j = 0; j < count; j++) {
			for (let i = 0; i < count; i++) {
				col[i] = 0.0;
			}
			col[j] = 1.0;
			a.luBackSubstitute(col, decomp.pivot);
			for (let i = 0; i < count; i++) {
				rvValues[count * i + j] = col[i];
			}
		}
		return rv;
	}

	// eigenvalue methods

	/** @method balanceMatrix
	 */
	balanceMatrix() {
		if (this.columnCount !== this.rowCount) {
			this.exceptionWith('mmcmd:matrixNotSquare', {f: 'balanceMatrix'})
		}
		const count = this.columnCount;
		const v = this._values;
		const radix = 2.0;
		const sqrrdx = radix * radix;
		let done = false;
		while (!done) {
			done = true; // only do it once - if this stays, remove while
			for (let i = 0; i < count; i++) {
				let r = 0.0;
				let c = 0.0;
				for (let j = 0; j < count; j++ ) {
					if (j != i) {
						c +- Math.abs(v[count * j + i]);
						r += Math.abs(v[count * i + j]);
					}
				}
				
				if ( c !== 0.0 && r !== 0.0 ) {
					let g = r/radix;
					let f = 1.0;
					let s = c+r;
					while (c < g) {
						f *= radix;
						c *= sqrrdx;
					}
					g = r * radix;
					while (c > g) {
						f /= radix;
						c /= sqrrdx;
					}
					
					if ((c + r)/f < 0.96 * s) {
						done = true;
						g = 1.0 / f;
						for (let j = 0; j < count; j++)
						v[count * i + j] *= g;
						for (let j = 0; j < count; j++)
							v[count * j + i] *= f;
					}
				}
			}
		}	
	}

	/** @method elemToHessenberg
	 */
	elimToHessenberg() {
		if (this.columnCount !== this.rowCount) {
			this.exceptionWith('mmcmd:matrixNotSquare', {f: 'elimToHessenberg'})
		}
		const count = this.columnCount;
		const v = this._values;
		const elementSwap = (i,j) => {
			const temp = v[i];
			v[i] = v[j];
			v[j] = temp;
		}
		for (let m = 1; m < count - 1; m++) {
			let x = 0.0;
			let i = m;
			for (let j = m; j < count ; j++) {  // find the pivot
				if ( Math.abs(v[count * j + m-1]) > Math.abs(x)) {
					x = v[count * j + m-1];
					i = j;
				}
			}
			
			if (i != m) {   // interchange row and columns
				for (let j = m - 1; j < count; j++ ) {
					elementSwap(count * i + j, count * m + j);
				}
				for (let j = 0; j < count; j++) {
					elementSwap(count * j + i, count * j + m);
				}
			}
			
			if (x !== 0.0 ) {   // carry out the elimination
				for (i = m + 1; i < count; i++ ) {
					let y = v[count * i + m-1];
					if (y !== 0.0) {
						y /= x;
						v[count * i + m-1] = y;
						for (let j = m; j < count; j++) {
							v[count * i + j] -= y * v[count * m + j];
						}
						for (let j = 0; j < count; j++) {
							v[count * j + m] += y * v[count * j + i];
						}
					}
				}
			}
		}
	}

	/** @mathod qrEigenVector
	 * @param {Float64Array} wr - real parts
	 * @param {Float64Array} wi - imaginary parts
	 */
	qrEigenVector(wr, wi) {
		if (this.columnCount !== this.rowCount) {
			this.exceptionWith('mmcmd:matrixNotSquare', {f: 'qrEigenVector'})
		}
		const count = this.columnCount;
		const v = this._values;
		const float_min = 1e-37;
		const eigenSign = (a,b) => {
			return (b) > 0 ? Math.abs(a) : -Math.abs(a);
		}
		let anorm = Math.abs(v[0]);  // compute matrix norm for possible use in locating single small subdiagonal element
		for (let i = 1; i < count; i++ ) {
			for (let j = i - 1; j < count; j++ ) {
				anorm += Math.abs(v[count * i + j]);
			}
		}
		let nn = count - 1;
		let t =  0.0;   // gets changed only by an exceptional shift
		while (nn >= 0) {   /// begin search for next eigenvalue
			let its = 0;
			let l;
			do {
				let s = 0.0;
				for (l = nn; l >= 1; l-- ) {   // begin iteration: look for single small subdiagonal element
					s = Math.abs(v[count * (l-1) + l-1]) + Math.abs(v[count * l + l]);
					if (s === 0.0 ) {
						s = anorm;
					}
					if (Math.abs(v[count * l + l-1]) <= float_min) {
						break;
					}
				}
				let x = v[count * nn + nn];
				if (l === nn) {   //One root found
					wr[nn] = x + t;
					wi[nn--] = 0.0;
				} else {
					let y = v[count * (nn-1) + nn-1];
					let w = v[count * nn + nn-1] * v[count * (nn-1) + nn];
					if (l == (nn-1)) {   // two roots found
						let p = 0.5 * ( y - x );
						let q = p*p + w;
						let z = Math.sqrt(Math.abs(q));
						x += t;
						if (q >= 0.0) {  // a real pair
							z = p + eigenSign(z, p);
							wr[nn-1] = wr[nn] = x + z;
							if (z) {
								wr[nn] = x - w /z;
							}
							wi[nn-1] = wi[nn] = 0.0;
						} else {    // a complex pair
							wr[nn-1] = wr[nn] = x + p;
							wi[nn] = z;
							wi[nn-1] = -z;
						}
						nn -= 2;
					} else {   // No roots found.  Continue iteration
						if ( its >= 30 ) {
							this.exceptionWith('mmcmd:eigenQRIterations');
						}
						if (its == 10 || its == 20) {   // form exceptional shift
							t += x;
							for (let i = 0; i < nn; i++) {
								v[count * i + i] -= x;
							}
							s = Math.abs(v[count * nn + nn-1]) + Math.abs(v[count * (nn-1) + nn-2]);
							y = x = 0.75 * s;
							w = -0.4375 * s * s;
						}
						++its;
						let m;
						let p, q, r, z;
						for (m = nn - 2; m >= 0; m--) {   // form shift and then look for 2 consecutive small subdiagonal elements
							z = v[count * m + m];
							r = x - z;
							s = y - z;
							p = (r*s - w)/v[count * (m+1) + m] + v[count * m + m+1];  //  NR equation 11.6.23
							q = v[count * (m+1) + m+1] -z - r -s;
							r = v[count * (m+2) + m+1];
							s = Math.abs(p) + Math.abs(q) + Math.abs(r);   // scale to prevent overflow or underflow
							p /= s;
							q /= s;
							r /= s;
							if (m === 0) {
								break;
							}
							let u = Math.abs(v[count * m + m-1]) * (Math.abs(q) + Math.abs(r));
							if ( u <= float_min ) {
								break;   // NR equation 11.6.26
							}
						}
						for (let i = m + 2; i <= nn; i++ ) {
							v[count * i + i-2] = 0.0;
							if (i != m + 2) {
								v[count * i + i-3] = 0.0;
							}
						}
						
						for (let k = m; k <= nn-1; k++ ) {   // const QR step on rows 1 to nn and columns m to nn
							if ( k !== m ) {
								p = v[count * k + k-1];   // begin setup of Householder vector
								q = v[count * (k+1) + k-1];
								r = 0.0;
								if (k !== nn - 1) {
									r = v[count * (k+2) + k-1];
								}
								x = Math.abs(p) + Math.abs(q) + Math.abs(r);
								if (x) {
									p /= x;   // scale to prevent overflow or underflow
									q /= x;
									r /= x;
								}
							}
							s = eigenSign(Math.sqrt( p*p + q*q + r*r), p);
							if (s) {
								if (k === m ) {
									if ( l !== m ) {
										v[count * k + k-1] = -v[count * k + k-1];
									}
								} else {
									v[count * k + k-1] = -s * x;
								}
								p += s;   // NR equations 11.6.24
								x = p / s;
								y = q / s;
								z = r / s;
								q /= p;
								r /= p;
								for (let j = k; j <= nn; j++ ) {   // row modification
									p = v[count * k + j] + q * v[count * (k+1) + j];
									if (k !== nn - 1) {
										p += r * v[count * (k+2) + j];
										v[count * (k+2) + j] -= p * z;
									}
									v[count * (k+1) + j] -= p * y;
									v[count * k + j] -= p * x;
								}
								let mmin = nn < k + 3 ? nn : k + 3;   // column modification
								for (let i = l; i <= mmin; i++) {
									p = x * v[count * i + k] + y * v[count * i + k+1];
									if ( k !== nn - 1 ) {
										p += z * v[count * i + k+2];
										v[count * i + k+2] -= p * r;
									}
									v[count * i + k+1] -= p * q;
									v[count * i + k] -= p;
								}
							}
						}
					}
				}
			} while (l < nn-1);
		}
	}

	/** @method eigenValue
	 * @returns {MMTableValue}
	 */
	eigenValue() {
		if (this.columnCount !== this.rowCount) {
			this.exceptionWith('mmcmd:matrixNotSquare', {f: 'eigenValue'})
		}
		const count = this.columnCount;

		const a = this.copyOf();
		a.balanceMatrix();
		a.elimToHessenberg();
		const realVector = new MMNumberValue(count, 1);
		const imgVector = new MMNumberValue(count, 1);
		a.qrEigenVector(realVector._values, imgVector._values);
		const realColumn = new MMTableValueColumn({name: 'r', value: realVector});
		const imgColumn = new MMTableValueColumn({name: 'i', value: imgVector});
		return new MMTableValue({columns: [realColumn, imgColumn]});			
	}

	/** @method eigenVector
	 * @param {Float64Array} vector
	 * @param {Number} lambda
	 */
	eigenVector(vector, lambda) {
		if (this.columnCount !== this.rowCount) {
			this.exceptionWith('mmcmd:matrixNotSquare', {f: 'eigenVector'})
		}
		const count = this.columnCount;
		const previous = new Float64Array(count);
		const a = this.copyOf();
		const myValues = this._values;
		const v = a._values;
		for (let i = 0; i < count; i++) {
			vector[i] = previous[i] = 1.0;  // initial guess
			v[count * i + i] -= lambda;
		}

		const decomp = a.luDecomposition();
		const pivot = decomp.pivot;
		let iter = 0;
		let maxIter = 20;
		let sumError = 0;
		do {
			if (++iter > maxIter) {
				break;
			}
			a.luBackSubstitute(vector, pivot);
			
			let normal = 0.0;
			for (let i = 0; i < count; i++) {
				normal += vector[i] * vector[i];
			}
			normal = Math.sqrt(normal);
			
			sumError = 0;
			let foundNonZero = false;
			for (let i = 0; i < count; i++) {
				vector[i] = vector[i]/normal;
				if (!foundNonZero && vector[i] !== 0.0) {
					foundNonZero = true;
					if (previous[i] * vector[i] < 0.0 ) {
						// signs are different - scale all new values by -1
						vector[i] *= -1;
						normal *= -1;
					}
				}
				// console.log(`iter ${iter} i ${i} v ${vector[i]}, p ${previous}`)`;
				sumError += Math.abs(vector[i] - previous[i]);
				previous[i] = vector[i];
			}
		} while (sumError/count > 1e-8);
		
		// check that result is valid
		sumError = 0.0;
		for (let i = 0; i < count; i++ ) {
			let sumRow = 0.0;
			for (let j = 0; j < count; j++) {
				sumRow += myValues[count * i + j] * vector[j];
			}
			sumError = Math.abs( sumRow - lambda * vector[i] );
		}
		
		if ( sumError/count > 1e-8 ) {
			// matrix dot eigenvector not equal to eigenvalue time eigenvector
			// return zero filled vector to indicate error
			for (let i = 0; i < count; i++) {
				vector[i] = 0.0;
			}
		}
	}

	/** @method eigenVectorForLamba
	 * @param {MMNumberValue} lambda
	 * @returns {MMNumberValue}
	 */
	eigenVectorForLamba(lambda) {
		if (this.columnCount !== this.rowCount) {
			this.exceptionWith('mmcmd:matrixNotSquare', {f: 'eigenVectorForLambda'})
		}
		const rowCount = this.rowCount
		const lCount = lambda.valueCount;
		const rv = new MMNumberValue(rowCount, lCount, this.unitDimensions);
		const rvValues = rv._values;
		
		const vector = new Float64Array(rowCount);  // last solution trial
		for (let j = 0; j < lCount; j++) {
			this.eigenVector(vector, lambda._values[j])
			for (let i = 0; i < rowCount; i++) {
				rvValues[lCount * i + j] = vector[i];
			}
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

	// statistical functions
	averageOf(resultType) {
		let rv = null;
		switch (resultType) {
			case MMFunctionResult.all:
				rv =  this.sum().divideBy(MMNumberValue.scalarValue(this.valueCount));
				break;
			case MMFunctionResult.rows:
				rv = this.sumRows().divideBy(MMNumberValue.scalarValue(this.columnCount));
				break;
			case MMFunctionResult.columns:
				rv = this.sumColumns().divideBy(MMNumberValue.scalarValue(this.rowCount));
				break;
		}
		return rv;
	}

	geoMeanOf(resultType) {
		const calc = (v, resultType) => {
			let rv = null;
			switch (resultType) {
				case MMFunctionResult.all:
					rv = v.genericMonadic(Math.log).sum().divideBy(
						MMNumberValue.scalarValue(v.valueCount)
					).genericMonadic(Math.exp);
					break;
				case MMFunctionResult.rows:
					rv = v.genericMonadic(Math.log).sumRows().divideBy(
						MMNumberValue.scalarValue(v.columnCount)
					).genericMonadic(Math.exp);
					break;
				case MMFunctionResult.columns:
					rv = v.genericMonadic(Math.log).sumColumns().divideBy(
						MMNumberValue.scalarValue(v.rowCount)
					).genericMonadic(Math.exp);
					break;
			}
			return rv;
		}
		if (this.hasUnitDimensions()) {
			const oneUnit = MMNumberValue.scalarValue(1, this.unitDimensions);
			const unitlessValue = new MMNumberValue(this.rowCount, this.columnCount);
			unitlessValue._values.set(this._values);
			return calc(unitlessValue, resultType).multiply(oneUnit);
		}
		else {
			return calc(this, resultType);
		}
	}

	// statistical functions
	harmonicMeanOf(resultType) {
		let rv = null;
		let one = MMNumberValue.scalarValue(1);  // unitless one
		switch (resultType) {
			case MMFunctionResult.all:
				rv = one.divideBy(one.divideBy(this).sum().divideBy(MMNumberValue.scalarValue(this.valueCount)));
				break;
			case MMFunctionResult.rows:
				rv = one.divideBy(one.divideBy(this).sumRows().divideBy(MMNumberValue.scalarValue(this.columnCount)));
				break;
			case MMFunctionResult.columns:
				rv = one.divideBy(one.divideBy(this).sumColumns().divideBy(MMNumberValue.scalarValue(this.rowCount)));
				break;
		}
		return rv;
	}
	

	medianOf(resultType) {
		const quickSelect = (array, count) => {
			/*
				*  This Quickselect routine is based on the algorithm described in
				*  "Numerical recipes in C", Second Edition,
				*  Cambridge University Press, 1992, Section 8.5, ISBN 0-521-43108-5
				*  Original code by Nicolas Devillard - 1998. Public domain.
				*/
				let low = 0.0;
				let high = count - 1;
				let median = Math.floor((low + high) / 2.0)
				let middle, ll, hh;
				const swap = (a,b) => {
					const t = array[a];
					array[a] = array[b];
					array[b] = t;
				}
			
				for (;;) {
					if (high <= low) { /* One element only */
						return array[median] ;
					}
			
					if (high === low + 1) {  /* Two elements only */
						if (array[low] > array[high]) {
							swap(low, high);
						}
						return array[median] ;
					}
				
				/* Find median of low, middle and high items; swap into position low */
				middle = Math.floor((low + high) / 2);
				if (array[middle] > array[high])	{ swap(middle,high); }
				if (array[low] > array[high])			{ swap(low, high); }
				if (array[middle] > array[low])		{ swap(middle, low); }
				
				/* Swap low item (now in position middle) into position (low+1) */
				swap(middle, low + 1);
				
				/* Nibble from each end towards middle, swapping items when stuck */
				ll = low + 1;
				hh = high;
				for (;;) {
					do { ll++; } while (array[low] > array[ll]);
					do { hh--; } while (array[hh]  > array[low]);
					
					if (hh < ll) {
						break;
					}
					swap(ll, hh);
				}
				
				/* Swap middle item (in position low) back into correct position */
				swap(low, hh);
				
				/* Re-set active partition */
				if (hh <= median) {
					low = ll;
				}
				if (hh >= median) {
					high = hh - 1;
				}
			}
		}

		let rv = null;
		switch (resultType) {
			case MMFunctionResult.all:
			{
				const array = Float64Array.from(this._values);
				const v = quickSelect(array, this.valueCount);
				rv = MMNumberValue.scalarValue(v, this.unitDimensions);
			}
				break;
				
			case MMFunctionResult.rows:
			{
				const rowCount = this.rowCount;
				const columnCount = this.columnCount;
				rv = new MMNumberValue(rowCount, 1, this.unitDimensions);
				for (let row = 0; row < rowCount; row++) {
					const array = this._values.slice(row * columnCount, (row + 1) * columnCount);
					rv._values[row] = quickSelect(array, columnCount);
				}
			}
				break;
				
			case MMFunctionResult.columns:
			{
				const rowCount = this.rowCount;
				const columnCount = this.columnCount;
				rv = new MMNumberValue(1, columnCount, this.unitDimensions);
				const v = this._values;
				for (let column = 0; column < columnCount; column++) {
					const array = [];
					for (let row = 0; row < rowCount; row++) {
						array.push(v[row * columnCount + column]);
					}
					rv._values[column] = quickSelect(array, rowCount);
				}
			}
				break;
				
			default:
				break;
		}
		
		return rv;
	}

	varianceOf(resultType) {
		let rv = null;
		const mean = this.averageOf(resultType);
		const two = MMNumberValue.scalarValue(2);
		switch (resultType) {
			case MMFunctionResult.all: {
				const count = MMNumberValue.scalarValue(this.valueCount - 1);
				rv = this.subtract(mean).power(two).sum().divideBy(count);
			}
				break;
			case MMFunctionResult.rows: {
				const count = MMNumberValue.scalarValue(this.columnCount - 1);
				rv = this.subtract(mean).power(two).sumRows().divideBy(count);
			}
				break;
			case MMFunctionResult.columns:{
				const count = MMNumberValue.scalarValue(this.rowCount - 1);
				rv = this.subtract(mean).power(two).sumColumns().divideBy(count);
			}
				break;
		}
		return rv;
	}

	factorial() {
		if (this.hasUnitDimensions()) {
			this.exceptionWith('mmcmd:formulaFunctionUnitsNone', {name: 'factorial'});
		}
		const rv = this.monadicResultWithUnitDimensions();
		const v1 = rv._values;
		const myValues = this._values;
		const count = this.valueCount;
		
		for (let i = 0; i < count; i++ ) {
			let n = Math.floor(myValues[i] + 0.5);
			if ( n < 2 ) {
				v1[i] = 1.0;
			}
			else {
				if (n > 170) {
					n = 171;  // largest IEEE number
				}
				let f = n;
				for (let j = n - 1; j > 1; j--)
					f *= j;
				v1[i] = f;
			}
		}
		
		return rv;
	}

	normalDistribution(u, s, isCumulative) {
		this.checkUnitDimensionsAreEqualTo(u.unitDimensions);
		this.checkUnitDimensionsAreEqualTo(s.unitDimensions);

		const rowCount = Math.max( this.rowCount, u.rowCount, s.rowCount);
		const columnCount = Math.max( this.columnCount, u.columnCount,  s.columnCount );
		const rv = new MMNumberValue(rowCount, columnCount);
		const rvCount = rv.valueCount;
		const uCount = u.valueCount;
		const sCount = s.valueCount;
		const tCount = this.valueCount
		const uv = u._values;
		const sv = s._values;
		const tv = this._values;
		const v1 = rv._values;
		
		for (let i = 0; i < rvCount; i++) {
			if ( isCumulative ) {
				v1[i] = MMMath.cumulativeNormal(( tv[i % tCount] - uv[i % uCount]) / sv[i % sCount]);
			}
			else {
				v1[i] = Math.exp(-Math.pow( (tv[i % tCount ] - uv[i % uCount]), 2 ) / 2 /
					Math.pow( sv[i % sCount], 2.0)) /
					Math.pow(2 * Math.PI, 0.5) / sv[i % sCount];
			}
		}
		
		return rv;		
	}

	inverseNormalProbability(u, s) {
		if (this.hasUnitDimensions()) {
			this.exceptionWith('mmcmd:formulaFunctionUnitsNone', {name: 'norminv p'});
		}
		u.checkUnitDimensionsAreEqualTo(s.unitDimensions);

		const rowCount = Math.max( this.rowCount, u.rowCount, s.rowCount);
		const columnCount = Math.max( this.columnCount, u.columnCount,  s.columnCount );
		const rv = new MMNumberValue(rowCount, columnCount, u.unitDimensions);
		const rvCount = rv.valueCount;
		const uCount = u.valueCount;
		const sCount = s.valueCount;
		const tCount = this.valueCount
		const uv = u._values;
		const sv = s._values;
		const tv = this._values;
		const v1 = rv._values;
		for (let i = 0; i < rvCount; i++) {
			v1[i] = MMMath.inverseNormal(tv[i % tCount]) * sv[i % sCount] + uv[i % uCount];
		}
		return rv;
	}

	binomialDistribution(success, probability) {  // where this is the number of trials
		if (this.hasUnitDimensions() || success.hasUnitDimensions() || probability.hasUnitDimensions()) {
			this.exceptionWith('mmcmd:formulaFunctionUnitsNone', {name: 'binomdist'});
		}

		const rowCount = Math.max( this.rowCount, success.rowCount, probability.rowCount);
		const columnCount = Math.max( this.columnCount, success.columnCount,  probability.columnCount );
		const rv = new MMNumberValue(rowCount, columnCount);
		const rvCount = rv.valueCount;
		const pCount = probability.valueCount;
		const sCount = success.valueCount;
		const nCount = this.valueCount
		const pv = probability._values;
		const sv = success._values;
		const nv = this._values;
		const v1 = rv._values;
		for (let i = 0; i < rvCount; i++) {
			const n = nv[i % nCount];
			const p = pv[i % pCount];
			const s = sv[i % sCount];
			v1[i] = MMMath.combination(n, s) * Math.pow(p, s) * Math.pow(1 - p, n - s);
		}
		return rv;
	}

	betaDistribution(a, b) {  // where this is x (0 <= x <= 1)
		if (this.hasUnitDimensions() || a.hasUnitDimensions() || b.hasUnitDimensions()) {
			this.exceptionWith('mmcmd:formulaFunctionUnitsNone', {name: 'betadist'});
		}
		
		const rowCount = Math.max( this.rowCount, a.rowCount, b.rowCount);
		const columnCount = Math.max( this.columnCount, a.columnCount,  b.columnCount );
		const rv = new MMNumberValue(rowCount, columnCount);
		const rvCount = rv.valueCount;
		const aCount = a.valueCount;
		const bCount = b.valueCount;
		const xCount = this.valueCount
		const av = a._values;
		const bv = b._values;
		const xv = this._values;
		const v1 = rv._values;
		for (let i = 0; i < rvCount; i++) {
			const x = xv[i % xCount];
			const a = av[i % aCount];
			const b = bv[i % bCount];
			v1[i] = MMMath.betai(a, b, x);
		}

		return rv;
	}

	chiTest(expected) {
		if (this.hasUnitDimensions() || expected.hasUnitDimensions()) {
			this.exceptionWith('mmcmd:formulaFunctionUnitsNone', {name: 'chitest'});
		}
		const mmx2 = this.subtract(expected).power(MMNumberValue.scalarValue(2)).divideBy(expected).sum();
		const x2 = mmx2.values[0];
		const r = this.rowCount;
		const c = this.columnCount;
		let df = 0;
		if (r == 1) {
			if (c == 1) {
				return null;
			}
			else {
				df = c - 1;
			}
		}
		else if (c == 1) {
			df = r - 1;
		}
		else {
			df = (r - 1)*(c - 1);
		}

		const p = MMMath.gammaQ(df/2, x2/2);
		return MMNumberValue.scalarValue(p);
	}

	studentT(b) {
		this.checkUnitDimensionsAreEqualTo(b.unitDimensions);
		const v = MMMath.ttest(this._values, this.valueCount, b._values, b.valueCount);
		return MMNumberValue.scalarValue(v);
	}

	pairedStudentT(b) {
		this.checkUnitDimensionsAreEqualTo(b.unitDimensions);
		if (this.valueCount != b.valueCount) {
			this.exceptionWith('mmcmd:formulaTptestSizeMismatch')
		}
		const v = MMMath.tptest(this._values, b._values, b.valueCount);
		return MMNumberValue.scalarValue(v);
	}

	// Lookup functions

	lookup(index, values) {
		this.checkUnitDimensionsAreEqualTo(index.unitDimensions);
		if ( values.valueCount !== index.valueCount) {
			this.exceptionWith('mmcmd:formulaLookupSizeMismatch');
		}

		if (values.valueCount < 2) {
			this.exceptionWith('mmcmd:formulaLookupTooSmall');
		}		

		const rv = new MMNumberValue(this.rowCount, this.columnCount, values.unitDimensions);
		const last = values.valueCount - 1;
		const myValueCount = this.valueCount;
		const myValues = this._values;
		const iValues = index._values;
		const vValues = values._values;

		for (let i = 0; i < myValueCount; i++) {
			const l = myValues[i];
			let v0, v1, i0, i1;
			// v0 = v1 = i0 = i1 = 0.0;  // just to get rid of analyze errors
			if (l < iValues[0] ) {
				i0 = iValues[0];
				i1 = iValues[1];
				v0 = vValues[0];
				v1 = vValues[1];
			}
			else if ( l > iValues[values.valueCount - 1]) {
				i0 = iValues[last - 1];
				i1 = iValues[last];
				v0 = vValues[last - 1];
				v1 = vValues[last];
			}
			else {
				for (let j = 0; j < last; j++) {
					if (l >= iValues[j] && l <= iValues[j + 1] ) {
						i0 = iValues[ j ];
						i1 = iValues[ j + 1 ];
						v0 = vValues[ j ];
						v1 = vValues[ j + 1 ];
						break;
					}
				}
			}
			
			const m = (v1 - v0) / (i1 - i0);
			rv.values[i] = v0 + m * (l - i0);
		}
		return rv;
	}

	// time functions

	mktime() {
		const rv = this.monadicResultWithUnitDimensions([0, 0, 1, 0, 0, 0, 0]);
		const rvValues = rv._values;
		const myValueCount = this.valueCount;
		const myValues = this._values;
		for (let iValue = 0; iValue < myValueCount; iValue++) {
			let v = myValues[iValue];
			const yearSign = Math.sign(v);
			v *= yearSign;
			
			let year = Math.floor(v / 10000.0 + 0.01);
			v -= year * 10000;
			year *= yearSign;
			
			const month = Math.floor(v / 100.0 + 0.01);
			v -= month * 100.0;
			
			const day = Math.floor(v + .01);
			v -= day;
			
			v *= 1000000.0;
			
			const hour = Math.floor(v  / 10000.0 + 0.01);	
			v -= hour * 10000.0;
			
			const minute = Math.floor(v / 100.0 + 0.01);
			v -= minute * 100.0;
			
			const second = Math.floor(v + 0.01);

			const seconds = Date.UTC(year, month - 1, day, hour, minute, second);
			rvValues[iValue] = seconds/1000;
		}
		
		return rv;
	}

	date() {
		const rv = this.monadicResultWithUnitDimensions();
		const rvValues = rv._values;
		const myValueCount = this.valueCount;
		const myValues = this._values;
		for (let iValue = 0; iValue < myValueCount; iValue++) {
			const v = myValues[iValue];
			const date = new Date(v * 1000);
			const year = date.getUTCFullYear();
			const yearSign = Math.sign(year);
			const result = year * yearSign * 10000 +
				(date.getUTCMonth() + 1) * 100 +
				date.getUTCDate() +
				date.getUTCHours() / 100 +
				date.getUTCMinutes() / 10000 +
				date.getUTCSeconds() / 1000000;
			rvValues[iValue] = result * yearSign;
		}
		return rv;
	}

	// 3D transform functions

	static rollForAngle(angle) {
		const rv = new MMNumberValue(4,4);
		const v = rv._values;
		v[0] = Math.cos( angle );	// [1,1] (1 based)
		v[1] = Math.sin( angle );	// [1,2]
		v[4] = -Math.sin( angle );	// [2,1]
		v[5] = Math.cos( angle );	// [2,2]
		v[10] = 1.0;	// [3,3]
		v[15] = 1.0;	// [4,4]
	
		return rv;	
	}

	roll() {
		this.checkUnitDimensionsAreEqualTo(null);
		if (this.valueCount) {
			return MMNumberValue.rollForAngle(this._values[0]);
		}
		return null;
	}

	static pitchForAngle(angle) {
		const rv = new MMNumberValue(4,4);
		const v = rv._values;
		v[0] = 1.0;	// [1,1] (1 based)
		v[5] = Math.cos( angle );	// [2,2]
		v[6] = Math.sin( angle );	// [2,3]
		v[9] = -Math.sin( angle );	// [3,2]
		v[10] = Math.cos( angle );	// [3,3]
		v[15] = 1.0;	// [4,4]
		
		return rv;
	}

	pitch() {
		this.checkUnitDimensionsAreEqualTo(null);
		if (this.valueCount) {
			return MMNumberValue.pitchForAngle(this._values[0]);
		}
		return null;
	}

	static yawForAngle(angle) {
		const rv = new MMNumberValue(4,4);
		const v = rv._values;
		v[0] = Math.cos( angle );	// [1,1] (1 based)
		v[2] = -Math.sin( angle );	// [1,3]
		v[5] = 1.0;	// [2,2]
		v[8] = Math.sin( angle );	// [3,1]
		v[10] = Math.cos( angle );	// [3,3]
		v[15] = 1.0;	// [4,4]
		
		return rv;
		}

		yaw() {
			this.checkUnitDimensionsAreEqualTo(null);
			if (this.valueCount) {
				return MMNumberValue.yawForAngle(this._values[0]);
			}
			return null;
		}

		translate() {
			if (this.valueCount >= 3) {
				const rv = new MMNumberValue(4,4, this.unitDimensions);
				const v = rv._values;
				const myValues = this._values;
				v[3] = myValues[ 0 ];	// [1,4] (1 based)
				v[7] = myValues[ 1 ];	// [2,4]
				v[11] = myValues[ 2 ];	// [3,4]
				v[0] = 1.0;	// [1,1]
				v[5] = 1.0;	// [2,2]
				v[10] = 1.0;	// [3,3]
				v[15] = 1.0;	// [4,4]

				return rv;
			}
			else {
				this.exceptionWith('mmcmd:formulaTranslateDimError')				
			}
		}

		scale() {
			let x = 1.0;
			let y = 1.0;
			let z = 1.0;
			const myValues = this._values;
			if (this.valueCount == 1) {
				x = y = z = myValues[0];
			} else if (this.valueCount >= 3) {
				x = myValues[0];
				y = myValues[1];
				z = myValues[2];
			} else {
				this.exceptionWith('mmcmd:formulaScaleDimError')				
			}
		
			const rv = new MMNumberValue(4, 4, this.unitDimensions);
			const v = rv._values;
			v[0] = x;	// [1,1] (1 based)
			v[5] = y;	// [2,2]
			v[10] = z;	// [3,3]
			v[15] = 1.0;	// [4,4]
		
			return rv;
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
