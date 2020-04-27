'use strict';
/* global
	theMMSession:readonly
	MMCommandMessage:readonly
	MMUnitSystem:readonly
	MMUnit:readonly
	MMUnitDimensionType:readonly
*/

/**
 * @class MMValue
 * all calculation values are derived from this
 */
class MMValue {
	/** @constructor
	* @param {Number} rowCount
	* @param {Number} columnCount
	*/
	constructor(rowCount, columnCount) {
		this.rowCount = rowCount;
		this.columnCount = columnCount;
		this.valueCount = rowCount * columnCount;
	}

	/** @method exceptionWith
	 * throws a MMCommandMessage
	 * @param {string} key	for i18n
	 * @param {Object} args	for i18n
	*/
	exceptionWith(key, args) {
		let msg = new MMCommandMessage(key, args);
		throw(msg);
	}
	
	/** @method offsetFor
	 * @param row
	 * @param column
	 * @returns {number} index into _values for indices row, column
	 */
	offsetFor(row, column) {
		return ((row-1)*this.columnCount + column-1);
	}

	/**
	 * @method checkBounds
	 * checks if row and column are valid indexes
	 * @param row
	 * @param column
	 */
	checkBounds(row, column) {
		if ( row == 0 || column == 0 || row > this.rowCount || column > this.columnCount ) {
			this.exceptionWith('mmcmd:valueMatrixBoundsError', {
				row: row,
				column: column,
				rowCount: this.rowCount,
				columnCount: this.columnCount
			});
		}
	}

	/**
	 * @method valueForIndexRowColumn
	 * @param {MMValue} rowIndex
	 * @param {MMValue} columnIndex
	 * @returns {MMValue}
	 */
	valueForIndexRowColumn(/* rowIndex, columnIndex */) {
		return undefined;
	}

	/**
	 * @method valueForIndexRowColumnFactory
	 * @param {MMValue} rowIndex
	 * @param {MMValue} columnIndex
	 * @param {function} factory - (rowIndex, columnIndex) => MMValue
	 * @returns {MMValue}
	 */
	valueForIndexRowColumnFactory(rowIndex, columnIndex, factory) {
		let rv;
		if( rowIndex instanceof MMNumberValue ) {
			let nRows = rowIndex.valueCount;
			if( columnIndex instanceof MMNumberValue ) {
				let nColumns = columnIndex.valueCount;
				if( nRows == 1 && rowIndex._values[0] == 0.0) {
					nRows = this.rowCount; // zero row index means all rows
					rv = factory(nRows, nColumns);
					for(let i = 0; i < nRows; i++) {
						for(let j = 0; j < nColumns; j++) {
							let row = i + 1;
							let column = columnIndex._values[j];
							if( column < 0) {
								column = this.columnCount + column + 1;  // negative counts back from end
							}
							rv.setValue(this.valueAtRowColumn(row, column), row, j+1);
						}
					}
				}
				else {
					rv = factory(nRows, nColumns);
					for(let i = 0; i < nRows; i++) {
						for(let j = 0; j < nColumns; j++) {
							let row = rowIndex._values[i];
							let column = columnIndex._values[j];
							if( row < 0) {
								row = this.rowCount + row + 1; // -ve counts back from end
							}
							if( column < 0 ) {
								column = this.columnCount + column + 1; // -ve counts back from end
							}
							rv.setValue(this.valueAtRowColumn(row, column), i+1, j+1);
						}
					}
				}
			}
			else {  // no columnIndex, so assume all columns
				let nColumns = this.columnCount;
				rv = factory(nRows, nColumns);
				for(let i = 0; i < nRows; i++) {
					let row = rowIndex._values[i];
					if( row < 0) {
						row = this.rowCount + row + 1; // -ve counts back from end
					}
					if ( row < 1 || row > this.rowCount ) {
						this.exceptionWith('mmcmd:valueRowBoundError', {index: row, rBound: this.rowCount, cBound: nColumns});
					}
					for(let j = 0; j < this.columnCount; j++) {
						rv.setValue(this._values[(row - 1)*this.columnCount + j], i+1, j+1);
					}
				}
			}
		}
		return rv;
	}

	/**
	 * @method stringWithUnit
	 * @param {MMUnit} unit - optional
	 * @returns {String} 
	 */
	stringWithUnit(/* unit */) {
		return '---';
	}

	/**
	 * @method stringForRowColumnUnit
	 * @param {Number} row
	 * @param {Number} column
	 * @param {MMUnit} outUnit
	 * @returns {String}
	 */
	stringForRowColumnUnit(/* row, column, outUnit */) {
		return '';
	}

	/**
	 * @method stringForRowColumnWithUnit
	 * @param {Number} row
	 * @param {Number} column
	 * @param {MMUnit} outUnit
	 * @returns {String}
	 */
	stringForRowColumnWithUnit(/* row, column, outUnit */) {
		return '';
	}


	/*
	dyadic functions
	*/

	/**
	 * @method dyadicNumberResult
	 * creates MMNumberValue with size of other parameter and unitDimesions
	 * @param {MMNumberValue} other
	 * @param {Number[]} unitDimensions
	 * @returns {MMNumberValue}
	 */
	dyadicNumberResult(other, unitDimensions) {
		let rowCount = other.rowCount;
		let columnCount = other.columnCount;
		let newRowCount = (rowCount > this.rowCount) ? rowCount : this.rowCount;
		let newColumnCount = (columnCount > this.columnCount ) ? columnCount : this.columnCount;
		return new MMNumberValue(newRowCount, newColumnCount, unitDimensions);
	}

	/**
	 * @method dyadicStringResult
	 * creates MMStringValue with size of other parameter
	 * @param {MMStringValue} other
	 * @returns {MMStringValue}
	 */
	dyadicStringResult(other) {
		let rowCount = other.rowCount;
		let columnCount = other.columnCount;
		let newRowCount = (rowCount > this.rowCount) ? rowCount : this.rowCount;
		let newColumnCount = (columnCount > this.columnCount ) ? columnCount : this.columnCount;
		return new MMStringValue(newRowCount, newColumnCount);
	}

	/**
	 * @method concat
	 * @param  {MMValue} other
	 * @return MMValue
	 * overriden to concatanate two arrays into one
	 */
	concat(/* other */) {
		return null;
	}

	/**
	 * @method numberValue
	 * @returns MMNumberValue
	 */
	numberValue() {
		return null;
	}

	/**
	 * @method columnNumber
	 * @param {Number} number 
	 * @returns {MMValue}
	 */
	columnNumber(/* number */) {
		return null;
	}

	/**
	 * @method append
	 * appends columns to value
	 * @param {MMValue} additions
	 */
	append(/*additions*/) {
		return null;
	}

	/**
	 * @method jsonValue
	 * @param {MMUnit} displayUnit
	 * @returns {Object} - representation of value using unit, suitable for conversion to json
	 */
	jsonValue(/* unit */) {
		this.exceptionWith('mmcmd:unimplemented');
	}
}

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
			a % b;
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
	 * @param {Number[]} unitDimensions - optional
	 */
	genericMonadic(f, unitDimensions) {
		this.checkUnitDimensionsAreEqualTo(unitDimensions);
		let rv = new MMNumberValue(this.rowCount, this.columnCount, unitDimensions);
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
			displayUnit: displayUnit,
			value: rv
		})
		const iColumn = new MMTableValueColumn({
			name: 'i',
			displayUnit: displayUnit,
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

/**
 * @class MMStringValue
 * @extends MMValue
 * @member {String[]} _values
 */
class MMStringValue extends MMValue {
	/** @constructor
	 * @param {Number} rowCount
	 * @param {Number} columnCount
	*/
	constructor(rowCount, columnCount) {
		super(rowCount, columnCount);
		this._values = new Array(this.valueCount);
		this._values.fill('', 0, this.valueCount);
	}

	/** @method copyOf
	 * @returns {MMValue}  - a copy of this instance
	 */
	copyOf() {
		let newValue = new MMStringValue(this.rowCount, this.columnCount);
		newValue._values = Array.from(this._values);
		return newValue;
	}

	get values() {
		// used by MMTableValueColumn for saving actual values
		return this._values;
	}

	/** @static scalarValue
	 * creates a MMStringValue with a single value
	 * @param {String} value
	 * @returns {MMStringValue}
	 */
	static scalarValue(value) {
		let newValue = new MMStringValue(1, 1);
		newValue._values[0] = value;
		return newValue;
	}

	/** @static stringArrayValue
	 * creates a MMStringValue from an array of strings
	 * @param {String[]} values
	 */
	static stringArrayValue(values) {
		let newValue = new MMStringValue(values.length, 1);
		newValue._values = Array.from(values);
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

	/** @method setAllValuesTo
	 * @param {String} value sets all values to this scalar
	 */
	setAllValuesTo(value) {
		this._values.fill(value);
	}
	/**
	 * @method setValue
	 * set value at row and column
	 * @param {String} value
	 * @param {Number} row
	 * @param {Numbber} column
	 */
	setValue(value, row, column) {
		this.checkBounds(row, column);
		this._values[(row - 1) * this.columnCount + column - 1] = value;
	}

	/**
	 * @method setValueAtCount
	 * @param {String} value
	 * @param {Number} count
	 */
	setValueAtCount(value, count) {
		this._values[count] = value || '';
	}

	/**
	 * @method valueAtCount
	 * @param {Number} count 
	 * @returns {String}
	 */
	valueAtCount(count) {
		return (count < this.valueCount) ? this._values[count] : '';
	}

	/**
	 * @method valueAtRowColumn
	 * @param {Number} row
	 * @param {Number} column
	 * @returns {String}
	 */
	valueAtRowColumn(row, column) {
		this.checkBounds(row, column);
		return this._values[(row-1) * this.columnCount + column - 1];
	}

	/**
	 * @method valueForIndexRowColumn
	 * @param {MMValue} rowIndex
	 * @param {MMValue} columnIndex
	 * @returns {MMValue}
	 */
	valueForIndexRowColumn(rowIndex, columnIndex) {
		return this.valueForIndexRowColumnFactory(rowIndex, columnIndex, (nRows, nColumns) => {
			return new MMStringValue(nRows, nColumns);
		});
	}

	/**
	 * @method stringWithUnit
	 * @param {MMUnit} unit - optional
	 * @returns {String} 
	 */
	stringWithUnit(/* unit */) {
		// ignore unit
		if (this.valueCount == 1) {
			return this._values[0];
		}
		else if (this.valueCount > 1) {
			return `${this._values[0]}...[${this.rowCount}, ${this.columnCount}]`
		}
		else {
			return '---';
		}
	}

		/**
	 * @method stringForRowColumnUnit
	 * @override
	 * @param {Number} row
	 * @param {Number} column
	 * @param {MMUnit} outUnit
	 * @returns {String}
	 */
	stringForRowColumnUnit(row, column/*, outUnit */) {
		this.checkBounds(row, column);
		return this._values[(row - 1)*this.columnCount + column - 1];
	}

	/**
	 * @method stringForRowColumnWithUnit
	 * @override
	 * @param {Number} row
	 * @param {Number} column
	 * @param {MMUnit} outUnit
	 * @returns {String}
	 */
	stringForRowColumnWithUnit(row, column/*, outUnit */) {
		this.checkBounds(row, column);
		return this._values[(row - 1)*this.columnCount + column - 1];
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

		let rv = new MMStringValue(this.rowCount, 1);
		for (let r = 1; r <= this.rowCount; r++) {
			rv.setValue(this.valueAtRowColumn(r, number), r, 1);
		}
	
		return rv;
	}

	/**
	 * @method append
	 * appends columns to value
	 * @param {MMValue} additions
	*/
	append(additions) {
		let rv = null;
		const rowCount = this.rowCount
		if (additions instanceof MMStringValue && rowCount === additions.rowCount) {
			const thisColumnCount = this.columnCount;
			const addColumnCount = additions.columnCount
			const columnCount = thisColumnCount + addColumnCount;
			rv = new MMStringValue(this.rowCount, columnCount);
			let column = 1;
			for (let thisColumn = 1; thisColumn <= thisColumnCount; thisColumn++) {
				for (let row = 1; row <= rowCount; row++) {
					rv.setValue(this.valueAtRowColumn(row, thisColumn), row, column);
				}
				column++;
			}

			for (let addColumn = 1; addColumn <= addColumnCount; addColumn++) {
				for (let row = 1; row <= rowCount; row++) {
					rv.setValue(additions.valueAtRowColumn(row, addColumn), row, column);
				}
				column++
			}
		}
		return rv;
	}

	/*
	 * dyadic functions
	 */

	/**
	 * @member add
	 * returns the sum of this and value
	 * @param {MMStringValue} value
	 * @returns {MMStringValue}
	 */
	add(value) {
		let rv = this.dyadicStringResult(value);
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
				v1[i*columnCount+j] = this._values[rMine*this.columnCount + cMine] +
					v2[rValue*valueColumnCount + cValue];
			}
		}
		return rv;
	}

	/**
	 * @method numberValue
	 * @override
	 * @returns MMNumberValue
	 */
	numberValue() {
		let rv = new MMNumberValue(this.rowCount, this.columnCount);
		const count = this.valueCount;
		for (let i = 0; i < count; i++) {
			let x = parseFloat(this._values[i]);
			if (x && isFinite(x)) {
				this._values[i] = x;
			}
			else {
				this._values[i] = 0.0;
			}
		}
		return rv;
	}

	/**
	 * @method concat
	 * @param  {MMStringValue} other
	 * @return MMStringValue
	 * overriden to concatanate two arrays into one
	 */
	concat(other) {
		let rv;
		if (other instanceof MMStringValue) {
			let valueCount = this.valueCount + other.valueCount;
			rv = new MMStringValue(valueCount, 1, this.unitDimensions);
			valueCount = 1;
			for (let i = 0; i < this.valueCount; i++) {
				rv.setValue(this.valueAtCount(i), valueCount++, 1);
			}
			for (let i = 0; i < other.valueCount; i++) {
				rv.setValue(other.valueAtCount(i), valueCount++, 1);
			}
		}
		return rv;
	}

	/**
	 * @method jsonValue
	 * @override
	 * @param {MMUnit} displayUnit
	 * @returns {Object} - representation of value using unit, suitable for conversion to json
	 */
	jsonValue() {
		return {
			t: 's',
			v: this._values,
			nr: this.rowCount,
			nc: this.columnCount
		}
	}
}

/**
 * @class MMToolValue
 * @extends MMValue
 * @member {MMTool[]} _values
 */
// eslint-disable-next-line no-unused-vars
class MMToolValue extends MMValue {
	/** @constructor
	 * @param {Number} rowCount
	 * @param {Number} columnCount
	*/
	constructor(rowCount, columnCount) {
		super(rowCount, columnCount);
		this._values = new Array(this.valueCount);
	}

	/** @method copyOf
	 * @returns {MMValue}  - a copy of this instance
	 */
	copyOf() {
		let newValue = new MMToolValue(this.rowCount, this.columnCount);
		newValue._values = Array.from(this._values);
		return newValue;
	}

	/** @static scalarValue
	 * creates a MMToolValue with a single value
	 * @param {String} value
	 * @returns {MMToolValue}
	 */
	static scalarValue(value) {
		let newValue = new MMToolValue(1, 1);
		newValue._values[0] = value;
		return newValue;
	}

	/** @static toolArrayValue
	 * creates a MMToolValue from an array of strings
	 * @param {MMTool[]} values
	 */
	static toolArrayValue(values) {
		let newValue = new MMToolValue(values.length, 1);
		newValue._values = Array.from(values);
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

	/** @method setAllValuesTo
	 * @param {MMTool} value sets all values to this scalar
	 */
	setAllValuesTo(value) {
		this._values.fill(value);
	}
	/**
	 * @method setValue
	 * set value at row and column
	 * @param {MMToolValue} value
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
	 * @returns {MMTool}
	 */
	valueAtRowColumn(row, column) {
		this.checkBounds(row, column);
		return this._values[(row-1) * this.columnCount + column - 1];
	}

	/**
	 * @method valueForIndexRowColumn
	 * @param {MMValue} rowIndex
	 * @param {MMValue} columnIndex
	 * @returns {MMValue}
	 */
	valueForIndexRowColumn(rowIndex, columnIndex) {
		return this.valueForIndexRowColumnFactory(rowIndex, columnIndex, (nRows, nColumns) => {
			return new MMToolValue(nRows, nColumns);
		});
	}

		/**
	 * @method stringWithUnit
	 * @param {MMUnit} unit - optional
	 * @returns {String} 
	 */
	stringWithUnit(/* unit */) {
	// ignore unit
		if (this.valueCount == 1) {
			return this._values[0].name;
		}
		else if (this.valueCount > 1) {
			return `this._values[0].name...[${this.rowCount}, ${this.columnCount}]`
		}
		else {
			return '---';
		}
	}

	/*
	 * dyadic functions
	 */

	/**
	 * @member add
	 * returns the sum of this and value
	 * @param {MMStringValue} value
	 * @returns {MMStringValue}
	 */
	add(value) {
		let rv = this.dyadicStringResult(value);
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
				v1[i*columnCount+j] = this._values[rMine*this.columnCount + cMine] +
					v2[rValue*valueColumnCount + cValue];
			}
		}
		return rv;
	}
}

/**
 * @class MMTableValueColumn
 * @member {String} name
 * @member {MMUnit} _displayUnit
 * @member {MMValue} _value
 * @member {String} _format
 */
class MMTableValueColumn {
	/** @method exceptionWith
	 * throws a MMCommandMessage
	 * @param {string} key	for i18n
	 * @param {Object} args	for i18n
	*/
	exceptionWith(key, args) {
		let msg = new MMCommandMessage(key, args);
		throw(msg);
	}

	/**
	 * @constructor
	 * @param {Object} context
	 * context can have one of two forms
	 * the first has the name {String}, displayUnit {MMUnit} and value  {MMValue}
	 * the second has rowNumbers {MMNumberValue} and column {MMTableValueColumn} amd
	 * creates a copy of column containing just the rows listed in rowNumbers 
	 */
	constructor(context) {
		if (context.name) {
			this.name = context.name;
			const unitName = context.displayUnit ? context.displayUnit : 'Fraction';
			this._value = context.value;
			this.format = null;
			if (!this._value) {
				if (unitName.toLowerCase() === 'string') {
					this._value = new MMStringValue(0, 0);
				}
				else {
					this._displayUnit = theMMSession.unitSystem.unitNamed(unitName);
					if (this._displayUnit) {
						this._value = new MMNumberValue(0, 0, this._displayUnit.dimensions);
					}
					else {
						this.exceptionWith('mmcmd:tableBadUnit', {
							unit: unitName,
							name: this.name,
						});
					}
				}
			}
		}
		else {
			const column = context.column;
			this.name = column.name;
			this._displayUnit = column.displayUnit;
			this.format = column.format;
			const rowNumbers = context.rowNumbers;
			const nRows = rowNumbers.valueCount;
			// if rowNumbers is scalar 0, then the whole column is used
			if (nRows === 1 && rowNumbers.values[0] ===  0) {
				this._value = column.value;
			}
			else if (column.isString) {
				let sValue = new MMStringValue(nRows, 1);
				for (let i = 1; i <= nRows; i++) {
					let rowIndex = rowNumbers[i - 1] - 1;
					// if rowIndex is negative, then count back from the end
					if (rowIndex < 0) {
						rowIndex = column.value.valueCount + rowIndex +  1;
					}
					if (rowIndex < column.value.valueCount) {
						sValue.setValue(column.value[rowIndex], i, 1);
					}
				}
				this._value = sValue;
			}
			else {
				const v = column.value;
				let dimensions =  null;
				if  (v instanceof MMNumberValue) {
					dimensions = v.unitDimensions;
				}
				else {
					dimensions = column.unitDimensions.dimensions;
				}
				let nValue = new MMNumberValue(nRows, 1, dimensions);
				for (let i = 1; i <= nRows; i++) {
					let rowIndex = rowNumbers[i - 1] - 1;
					// if rowIndex is negative, then count back from the end
					if (rowIndex < 0) {
						rowIndex = column.value.valueCount + rowIndex +  1;
					}
					if (rowIndex < column.value.valueCount) {
						nValue.setValue(column.value[rowIndex], i, 1);
					}
				}
				this._value = nValue;
			}
		}
	}

	/**
	 * @return {MMValue}
	 */
	get value() {
		return this._value;
	}

	/**
	 * @return {Boolean}
	 */
	get isString() {
		return (this._value instanceof MMStringValue);
	}

	/**
	 * @return {Number}
	 */
	get rowCount() {
		return this._value ? this._value.rowCount : 0;
	}

	/**
	 * @returns {MMUnit}
	 */
	get displayUnit() {
		return this._displayUnit;
	}

	/**
	 * @param {MMUnit} unit - can be string in which case it will try to make unit from it
	 */
	set displayUnit(displayUnit) {
		if (typeof displayUnit === 'string' ) {
			const unitName = displayUnit;
			displayUnit = theMMSession.unitSystem.unitNamed(unitName);
			if (!displayUnit) {
				this.exceptionWith('mmcmd:tableBadUnit', {
					unit: unitName,
					name: this.name,
				});
			}
		}
		if (!this._value && displayUnit) {
			this._displayUnit = displayUnit;
			return;
		}
		
		if (!displayUnit) {
			this._displayUnit = null;
		}

		if (this._value instanceof MMNumberValue) {
			if (MMUnitSystem.areDimensionsEqual(displayUnit.dimensions, this._value.unitDimensions)) {
				this._displayUnit = displayUnit;
				return;
			}
			else if (this._value.rowCount === 0) {
				this._value.setUnitDimensions(displayUnit.dimensions);
				this._displayUnit = displayUnit;
				return;
			}
		}

		this.exceptionWith('mmcmd:displayUnitTypeMismatch', { unitName: displayUnit.name });
	}

	/**
	* @returns string
	*/

	get lowerCaseName() {
		return this.name.toLowerCase();
	}

	/**
	 * @method addRow
	 * @param {Number} rowNumber
	 * @param {MMValue} insertValue
	 */
	addRow(rowNumber, insertValue) {
		const nCurrentRows = (this._value) ? this._value.valueCount : 0;
		const nTotalRows = nCurrentRows + 1;
		if (rowNumber > nTotalRows || rowNumber == 0 ) {
			rowNumber = nTotalRows;
		}
		const isString = (this._value) ? this.isString : (insertValue instanceof MMStringValue);

		if (isString) {
			let newString = new MMStringValue(nTotalRows, 1);
			if (this._value) {
				const oldValue = this._value;
				for ( let i = 0; i < rowNumber - 1; i++) {
					newString.setValueAtCount(oldValue.valueAtCount(i), i);
				}
	
				for (let i = rowNumber; i < nTotalRows; i++) {
					newString.setValueAtCount(oldValue.valueAtCount(i - 1), i);
				}
			}

			const calcValue = (insertValue) ? insertValue.stringForRowColumnUnit(1,1, null) : '';
			newString.setValue(calcValue, rowNumber, 1);
			this._value = newString;
		}
		else {
			const oldValue = this._value;
			let dimensions = null;
			if (oldValue) {
				dimensions = oldValue.unitDimensions;
			}
			else if (this._displayUnit) {
				dimensions = this._displayUnit.dimensions;
			}
			else if ( insertValue instanceof MMNumberValue ) {
				dimensions = insertValue.unitDimensions;
			}

			if (insertValue instanceof MMNumberValue &&
				!MMUnitSystem.areDimensionsEqual(insertValue.unitDimensions, dimensions))
			{
				if (this.rowCount === 0) {
					this._displayUnit = theMMSession.unitSystem.baseUnitWithDimensions(insertValue.unitDimensions);
					dimensions = insertValue.unitDimensions;
				}
				else {
					this.exceptionWith('mmcmd:tableAddRowUnitMismatch', {name: this.name});
				}
			}

			let newValue = new MMNumberValue(nTotalRows, 1, dimensions);
			if (oldValue) {
				for (let i = 0; i < rowNumber - 1; i++ ) {
					newValue.values[i] = oldValue.values[i];
				}
				
				for (let i = rowNumber; i < nTotalRows; i++ ) {
					newValue.values[i] = oldValue.values[i - 1];
				}
			}
			
			const calcValue = (insertValue instanceof MMNumberValue) ? insertValue._values[0] : 0.0;
			newValue._values[rowNumber -1] = calcValue;
			this._value = newValue;
		}
	}

	/**
	 * @method updateAllRows
	 * @param {Number} nCurrentRows
	 * @param {MMValue} withValue
	 */
	updateAllRows(nCurrentRows, withValue) {
		if (withValue && nCurrentRows) {
			if (withValue instanceof MMStringValue) {
				let newValue = new MMStringValue(nCurrentRows, 1);
				for (let i = 0; i < nCurrentRows; i++) {
					const j = i % withValue.rowCount;
					const calcValue = withValue.stringForRowColumnUnit(j + 1, 1, null);
					newValue.setValue(calcValue, i + 1, 1);
				}
				this._value = newValue;
			}
			else if (withValue instanceof MMNumberValue) {
				let newValue = new MMNumberValue(nCurrentRows, 1, withValue.unitDimensions);
				for (let i = 0; i < nCurrentRows; i++) {
					let j = i %  withValue.rowCount;
					newValue._values[i] = withValue._values[j];
				}
				this._value = newValue;
			}
		}
	}

	/**
	 * @method updateRow
	 * @param {Number} rowNumber
	 * @param {MMValue} withValue
	 * @param {MMTableValue} dataTable
	 */
	updateRow(rowNumber, withValue, dataTable) {
		if (this._value && rowNumber <= this._value.rowCount) {
			if (this.isString) {
				if (withValue) {
					this._value.setValue(withValue.stringForRowColumnUnit(rowNumber, 1), rowNumber, 1);
				}
				else {
					this._value.setValue('""', rowNumber, 1);
				}
			}
			else {
				if (withValue instanceof MMNumberValue) {
					if (MMUnitSystem.areDimensionsEqual(withValue.unitDimensions, this._value.unitDimensions)) {
						this._value.setValue(withValue.valueAtRowColumn(1,1), rowNumber, 1);
					}
					else {
						this.exceptionWith('mmcmd:tableUnitTypeMismatch', {
							row: rowNumber,
							column: this.name,
							table: dataTable
						});
					}
				}
				else {
					this.exceptionWith('mmcmd:tableTypeMismatch', {
						row: rowNumber,
						column: this.name,
						table: dataTable
					});
				}
			}
		}
	}

	/**
	 * @method updateRowWithString
	 * @param {Number} rowNumber
	 * @param {String} value
	 */
	updateRowWithString(rowNumber, value) {
		if (this._value && rowNumber <= this._value.rowCount) {
			if (this.isString) {
				if (value) {
					this._value.setValue(value, rowNumber, 1);
				}
				else {
					this._value.setValue('', rowNumber, 1);
				}
			}
			else {
				let d = parseFloat(value);
				if (this._displayUnit) {
					d = this._displayUnit.convertToBase(d);
				}
				this._value._values[rowNumber - 1] = d;
			}
		}

	}

	/**
	 * @method saveObject
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		const o = {
			name: this.name,
			displayUnit: this.isString ? 'string' : this.displayUnit.name,
		}
		if (this.format && this.format.length) {
			o.format = this.format;
		}
		if (this._value) {
			if (this.isString) {
				o.sValues = this._value.values;
			}
			else {
				o.nValues = this._value.values;
				o.unitDimensions = MMUnit.stringFromDimensions(this._value.unitDimensions);
			}
		}
		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		if (saved.format) {
			this.format = saved.format;
		}
		if (saved.displayUnit && saved.displayUnit !== 'string') {
			this.displayUnit = theMMSession.unitSystem.unitNamed(saved.displayUnit);
		}
		if (this.isString) {
			this._value = MMStringValue.stringArrayValue(saved.sValues);
		}
		else {
			const dimensions = [];
			const parts = saved.unitDimensions.split(' ');
			for (let i = 0; i < MMUnitDimensionType.NUMDIMS; i++) {
				dimensions.push(parseFloat(parts[i]));
			}
		
			this._value = MMNumberValue.numberArrayValue(Object.values(saved.nValues), dimensions);
		}
	}

	/**
	 * @method updateFromStringArray
	 * @param {String[]} stringValues
	 */
	updateFromStringArray(stringValues) {
		const rowCount = stringValues.length;
		if (this.isString) {
			const newValue = new MMStringValue(rowCount, 1);
			for (let i = 0; i < rowCount; i++) {
				newValue.setValue(stringValues[i], i + 1, 1);
			}
			this._value = newValue;
		}
		else {
			const dimensions = this._displayUnit.dimensions;
			const newValue = new MMNumberValue(rowCount, 1, dimensions);
			for (let i = 0; i < rowCount; i++) {
				let d = parseFloat(stringValues[i]);
				if (this._displayUnit) {
					d = this._displayUnit.convertToBase(d);
				}
				newValue._values[i] = d
			}
			this._value =  newValue;
		}
	}

	/**
	 * @method removeRowNumber
	 * @param {Number} rowNumber
	 */
	removeRowNumber(rowNumber) {
		if (this._value && rowNumber <= this._value.rowCount) {
			const nNewRows = this._value.rowCount - 1;
			if (this.isString) {
				const newValue = new MMStringValue(nNewRows, 1);
				const oldValue = this._value;
				for (let i = 1; i < rowNumber; i++) {
					newValue.setValue(oldValue.valueAtCount(i - 1), i, 1);
				}
				for (let i = rowNumber; i <= nNewRows; i++) {
					newValue.setValue(oldValue.valueAtCount(i), i, 1);
				}
				this._value = newValue;
			}
			else {
				const oldValue = this._value;
				const dimensions =  oldValue.unitDimensions;
				const newValue = new MMNumberValue(nNewRows, 1, dimensions);
				for (let i = 0; i < rowNumber - 1; i++) {
					newValue._values[i] = oldValue._values[i];
				}
				for (let i = rowNumber; i <= nNewRows; i++) {
					newValue._values[i - 1] = oldValue._values[i];
				}
				this._value = newValue;
			}
		}
	}

	/**
	 * @method keepRowNumbers
	 * @param {Number[]} keepNumbers
	 */
	keepRowNumbers(keepNumbers) {
		if (this._value) {
			const nNewRows = keepNumbers.length;
			if (this.isString) {
				const newValue  =  new MMStringValue(nNewRows, 1);
				const oldValue = this._value;
				for (let i = 0; i < nNewRows; i++) {
					newValue.setValue(oldValue.valueAtCount(keepNumbers[i]), i, 1);
				}
				this._value = newValue;
			}
			else {
				const oldValue = this._value;
				const newValue = new MMNumberValue(nNewRows, 1, oldValue.unitDimensions);
				for (let i = 0; i < nNewRows; i++) {
					newValue._values[i] = oldValue._values[keepNumbers[i]];
				}
				this._value = newValue;
			}
		}
	}

	/**
	 * @method jsonValue
	 * @override
	 * @param {MMUnit} displayUnit
	 * @returns {Object} - representation of value using unit, suitable for conversion to json
	 */
	jsonValue(displayUnit) {
		if (!displayUnit) {
			displayUnit = this._displayUnit;
			if (!displayUnit && this._value.unitDimensions) {
				displayUnit = theMMSession.unitSystem.defaultUnitWithDimensions(this._value.unitDimensions);
			}
		}
		const displayUnitName = (displayUnit) ? displayUnit.name : '';
		return {
			t: 'tc',
			name: this.name,
			dUnit: displayUnitName,
			format: this.format,
			v: this._value.jsonValue(displayUnit),
			// nr: this._value.rowCount,
			// nc: 1
		}
	}
}

/**
 * @class MMTableValue
 * @extends MMValue
 */
// eslint-disable-next-line no-unused-vars
class MMTableValue extends MMValue {
	/**
	 * @constructor
	 * @param {Object} context
	 * context must have a columns array containing MMTableValueColumns
	 * can optionally have a rowNumbers MMNumberValue containing the rows from columns to include
	 */
	constructor(context) {
		if (context.columns) {
			const initWithColumns = (columns) => {
				this.columns = Array.from(columns)  // create copy
				this._nameDictionary = {};
				for (const column in this.columns) {
					this._nameDictionary[column.lowerCaseName] = column;
				}
			}
			const columns = context.columns;
			const nColumns = columns ? columns.length : 0;
			if (context.rowNumbers) {
				const rowNumbers = context.rowNumbers;
				const nRows = rowNumbers.valueCount;
				super(nRows, nColumns);
				let newColumns = [];
				for (const column in columns) {
					const newColumn = new MMTableValueColumn({rowNumbers: rowNumbers, column: column});
					newColumns.push(newColumn);
				}
				initWithColumns(newColumns);
			}
			else {
				const nRows = (nColumns) ? columns[0].value.rowCount : 0;
				super(nRows, nColumns);
				initWithColumns(columns);
			}
		}
		else {
			super(0,0);
		}
	}

	/**
	 * @method columnNumber
	 * @override
	 * @param {Number} number 
	 * @returns {MMValue}
	 */
	columnNumber(number) {
		if (number < this.columns.length) {
			return  this.columns[number - 1].value;
		}
		return null;
	}

	/**
	 * @method jsonValue
	 * @override
	 * @param {MMUnit[]} displayUnits
	 * @returns {Object} - representation of value using unit, suitable for conversion to json
	 */
	jsonValue(displayUnits) {
		let columns = [];
		const nc =  this.columnCount;
		for (let i = 0; i < nc; i++) {
			const column = this.columns[i];
			// const displayUnit = (displayUnits && i < displayUnits.length) ? displayUnits[i] : column.displayUnit;
			const displayUnit = displayUnits ? displayUnits[i + 1] : null;
			columns.push(column.jsonValue(displayUnit));
		}

		return {
			t: 't',
			v: columns,
			nr: this.rowCount,
			nc: this.columnCount
		}
	}

	/**
	 * @method stringWithUnit
	 * @param {MMUnit} unit - optional
	 * @returns {String} 
	 */
	stringWithUnit(/* unit */) {
		return `Table [ ${this.rowCount}, ${this.columnCount} ]`;
	}

	/**
	 * @method numberValue
	 * @override
	 * @returns MMNumberValue
	 */
	numberValue() {
		let rv;
		if (this.columnCount) {
			let numericCount = 0;
			let firstNumeric;
			const nc =  this.columnCount;
			for (let i = 0; i < nc; i++) {
				const column = this.columns[i];
				if (column.value instanceof MMNumberValue) {
					numericCount++;
					if (!firstNumeric) {
						firstNumeric = column.value;
					}
					else {
						if (!MMUnitSystem.areDimensionsEqual(firstNumeric.unitDimensions, column.value.unitDimensions)) {
							this.exceptionWith('mmcmd:tableNumericUnits')
						}
					}
				}
			}

			if (firstNumeric) {
				rv = new MMNumberValue(this.rowCount, numericCount, firstNumeric.unitDimensions);
				for (let r = 1; r <= this.rowCount; r++) {
					let outColumn = 1;
					for (let i = 0; i < nc; i++) {
						const column = this.columns[i];
						if (column.value instanceof MMNumberValue) {
							rv.setValue(column.value.valueAtRowColumn(r, 1), r, outColumn++);
						}
					}
				}
			}
		}
		return rv;
	}
}

