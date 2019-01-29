'use strict';

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
	valueForIndexRowColumn(rowIndex, columnIndex) {
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
						this.exceptionWith('mmcmd:valueRowBoundError', {index: row, rBound: this.rowCount, cBound: nCols});
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
	stringWithUnit(unit) {
		return '---';
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
	 * @method numeric
	 * @returns MMNumberValue
	 */
	numeric() {
		return null;
	}

	/**
	 * @method jsonValue
	 * @param {MMUnit} displayUnit
	 * @returns {String} - json representation of value using unit
	 */
	jsonValue(unit) {
		this.exceptionWith('mmcmd:unimplemented');
	}
}

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

	/** @method exceptionWith
	 * throws a MMCommandMessage
	 * @param {string} key	for i18n
	 * @param {Object} args	for i18n
	*/
	exceptionWith(key, args) {
		let msg = new MMCommandMessage(key, args);
		throw(msg);
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
	copyOf(original) {
		let newValue = new MMNumberValue(this.rowCount, this.columnCount, this.unitDimensions);
		newValue._values.set(this._values);
		return newValue;
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

	/*
	 * dyadic functions
	 */

	/**
	 * @method add
	 * returns the sum of this and value
	 * @param {MMNumberValue} value
	 * @returns {MMNumberValue}
	 */
	add(value) {
		this.checkUnitDimensionsAreEqualTo(value.unitDimensions);
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
				v1[i*columnCount+j] = this._values[rMine*this.columnCount + cMine] +
					v2[rValue*valueColumnCount + cValue];
			}
		}
		return rv;
	}

	/**
	 * @method subtract
	 * returns the difference of this and value
	 * @param {MMNumberValue} value
	 * @returns {MMNumberValue}
	 */
	subtract(value) {
		this.checkUnitDimensionsAreEqualTo(value.unitDimensions);
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
				v1[i*columnCount+j] = this._values[rMine*this.columnCount + cMine] -
					v2[rValue*valueColumnCount + cValue];
			}
		}
		return rv;
	}

	/**
	 * @method multiply
	 * returns the product of this and value
	 * @param {MMNumberValue} value
	 * @returns {MMNumberValue}
	 */
	multiply(value) {
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
				v1[i*columnCount+j] = this._values[rMine*this.columnCount + cMine] *
					v2[rValue*valueColumnCount + cValue];
			}
		}
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
				v1[i*columnCount+j] = this._values[rMine*this.columnCount + cMine] /
					v2[rValue*valueColumnCount + cValue];
			}
		}
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
				let first = Math.floor(Math.abs(this._values[rMine*this.columnCount + cMine]) + .1);
				let second = Math.floor(Math.abs(value._values[rValue*value.columnCount + cValue]) + .1);
				if( second <= 0 ) {
					return null;
				}
	
				v1[i*columnCount+j] = first % second;
			}
		}
		rv.subtractUnitDimensions(value.unitDimensions);
		return rv;
	}

	/**
	 * @method numeric
	 * @override
	 * @returns MMNumberValue
	 */
	numeric() {
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
				v1[i*columnCount+j] = Math.pow(this._values[rMine*this.columnCount + cMine],
					v2[rValue*valueColumnCount + cValue]);
			}
		}
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

	/**
	 * @member ln
	 * returns natural log of this value
	 * @returns {MMNumberValue}
	 */
	ln() {
		this.checkUnitDimensionsAreEqualTo();
		let rv = this.monadicResultWithUnitDimensions();
		rv._values = this._values.map(Math.log);
		return rv;
	}

	/**
	 * @member negative
	 * returns this times -1
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
	 * @method jsonValue
	 * @override
	 * @param {MMUnit} displayUnit
	 * @returns {String} - json representation of value using unit
	 */
	jsonValue(unit) {
		let rv = {}
		if (unit) {
			rv['unit'] = unit.name;
			rv['v'] = Array.from(this._values).map(x => unit.convertFromBase(x));
			}
		else {
			rv['v'] = Array.from(this._values);
			rv['unit'] = theMMSession.unitSystem.baseUnitWithDimensions(this.unitDimensions).name;
		}
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

	/** @method exceptionWith
	 * throws a MMCommandMessage
	 * @param {string} key	for i18n
	 * @param {Object} args	for i18n
	*/
	exceptionWith(key, args) {
		let msg = new MMCommandMessage(key, args);
		throw(msg);
	}
	
	/** @method copyOf
	 * @returns {MMValue}  - a copy of this instance
	 */
	copyOf(original) {
		let newValue = new MMStringValue(this.rowCount, this.columnCount);
		newValue._values = Array.from(this._values);
		return newValue;
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
	stringWithUnit(unit) {
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
	 * @method numeric
	 * @override
	 * @returns MMNumberValue
	 */
	numeric() {
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
	 * @method jsonValue
	 * @override
	 * @param {MMUnit} displayUnit
	 * @returns {String} - json representation of value using unit
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
class MMToolValue extends MMValue {
	/** @constructor
	 * @param {Number} rowCount
	 * @param {Number} columnCount
	*/
	constructor(rowCount, columnCount) {
		super(rowCount, columnCount);
		this._values = new Array(this.valueCount);
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
	
	/** @method copyOf
	 * @returns {MMValue}  - a copy of this instance
	 */
	copyOf(original) {
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
	stringWithUnit(unit) {
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
 * @class MMTableValue
 * @extends MMValue
 */
class MMTableValue extends MMValue {
	// just unimplemented placeholder
}

