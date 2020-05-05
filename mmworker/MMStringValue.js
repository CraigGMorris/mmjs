'use strict';
/* global
	MMValue:readonly
	MMNumberValue:readonly
*/

/**
 * @class MMStringValue
 * @extends MMValue
 * @member {String[]} _values
 */
// eslint-disable-next-line no-unused-vars
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
	// eslint-disable-next-line no-unused-vars
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

	/** @method transpose
	 *  @returns {MMStringValue}
	 */
	transpose() {
		const rowCount = this.rowCount;
		const columnCount = this.columnCount
		const rv = new MMStringValue(columnCount, rowCount);
		const rvValues = rv._values;
		const thisValues = this._values;
		for (let i = 0; i < rowCount; i++) {
			for (let j = 0; j < columnCount; j++) {
				rvValues[j*rowCount+i] = thisValues[i*columnCount+j];
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
