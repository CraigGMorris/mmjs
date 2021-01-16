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
	 * @method valueForColumnNumber
	 * @override
	 * @param {Number} number 
	 * @returns {MMValue}
	 */
	valueForColumnNumber(number) {
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
			rv = new MMStringValue(rowCount, columnCount, this.unitDimensions);
			rv._values = Array.from(this._values);
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
	* @method processStringDyadic
	* processes function that returns string value
	* @param {MMStringValue} value
	* @param {function} func
	* @param isNumberResult - true if function has number result false if string result
	* @return {MMValue} - MMStringValue unless isNumberResult is true, then MMNumberValue
	*/
	processStringDyadic(value, func, isNumberResult) {
		const calculatedValue = isNumberResult ?
			this.dyadicNumberResult(value) : this.dyadicStringResult(value);
		let v1 = calculatedValue._values;
		let v2 = value._values;
		let rowCount = calculatedValue.rowCount;
		let columnCount = calculatedValue.columnCount;
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
		return calculatedValue;
	}

	/**
	 * @member add
	 * returns the sum of this and value
	 * @param {MMStringValue} value
	 * @returns {MMStringValue}
	 */
	add(value) {
		return this.processStringDyadic(value, (a, b) => {
			return a + b;
		});
	}

	/**
	 * @method multiply
	 * returns the repetiion of this value times
	 * @param {MMNumberValue} value
	 * @returns {MMStringValue}
	 */
	multiply(value) {
		const rv = this.processStringDyadic(value, (a, b) => {
			let s = a;
			for (let i = 1; i < b; i++) {
				s += a
			}
			return s;
		});
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
	 * @method format
	 * @param {MMNumberValue} value 
	 * @param {MMUnit} unit 
	 */
	format(value, unit) {
		const f = (v, format) => {
			if (format) {
				const parts = format.split('.');	// split on decimal point, if there is one
				let width = 0;
				format = parts[parts.length - 1];
				if (parts.length && parts[0].length) {
					const widthField = parts[0].replace(/[^\d]+/,'');
					if (widthField.length) {
						width = parseInt(widthField);
					}
				}
				let precision = parseInt(format);
				if (isNaN(precision) || precision < 0 || precision > 36) {
					precision = 8;
				}
				let s = ''
				switch (format.slice(-1)) {  // last character should be format type
					case 'f':
						s = v.toFixed(precision);
						break;
					case 'e':
						s = v.toExponential(precision);
						break;
					case 'x':
						s = `${precision}r` + v.toString(precision);
						break;
				}
				if (width > s.length) {
					s = s.padStart(width);
				}
				return s;
			}
			return v.toPrecision(8);
		}

		if (unit) {
			value.checkUnitDimensionsAreEqualTo(unit.dimensions);
		}
		const rv = this.dyadicStringResult(value);
		const rowCount = rv.rowCount;
		const columnCount = rv.columnCount;
		const rvValues = rv._values;
		const myRowCount = this.rowCount;
		const myColumnCount = this.columnCount
		const myValues = this._values;
		const vValues = value._values;
		const vRowCount = value.rowCount;
		const vColumnCount = value.columnCount;
		for (let i = 0; i < rowCount;  i++) {
			const rMine = i % myRowCount;
			const rValue = i % vRowCount;
			for (let j = 0; j < columnCount; j++) {
				const cMine = j % myColumnCount;
				const cValue = j % vColumnCount;
				const fmt = myValues[rMine * myColumnCount + cMine];
				let v = vValues[rValue * vColumnCount + cValue];
				if (unit) {
					v = unit.convertFromBase(v);
				}
				rvValues[i * columnCount + j] = f(v, fmt);
			}
		}
		return rv;	
	}

	/**
	 * @method join
	 * @param {MMStringValue} join1 
	 * @param {MMStringValue} join2 - // optional
	 */
	join(join1, join2) {
		const myValueCount = this.valueCount;
		const myValues = this._values;
		const myRowCount = this.rowCount;
		const myColumnCount = this.columnCount;
		if (join2) {
			// use join to join columns and rowJoin to join rows
			if (myValueCount && join1.valueCount && join2.valueCount) {
				let rowJoin = join2._values[0];
				rowJoin = rowJoin.replace(/\\n/, '\n');
				rowJoin = rowJoin.replace(/\\t/, '\t');

				let colJoin = join1._values[0];
				colJoin = colJoin.replace(/\\n/, '\n');
				colJoin = colJoin.replace(/\\t/, '\t');
				const rows = [];
				for (let i = 0; i < myRowCount; i++) {
					const columns = [];
					for (let j = 0; j < myColumnCount; j++) {
						columns.push(myValues[i * myColumnCount + j]);
					}
					const s = columns.join(colJoin);
					rows.push(s);
				}
				return MMStringValue.scalarValue(rows.join(rowJoin));
			}
		}
		else {	
			let joinValue = join1._values[0];
			joinValue = joinValue.replace(/\\n/, '\n');
			joinValue = joinValue.replace(/\\t/, '\t');
			if ( myValueCount && join1.valueCount ) {
				if ( myColumnCount == 1 || myRowCount == 1 ) { 
					return MMStringValue.scalarValue(this._values.join(joinValue));
				}
				else {
					// matrix - return array with columns joined into one column
					const rv = new MMStringValue(myRowCount, 1);
					const rvValues = rv._values;
					for (let i = 0; i < myRowCount; i++ ) {
						const columns = [];
						for (let j = 0; j < myColumnCount; j++ ) {
							columns.push(myValues[i * myColumnCount + j]);
						}
						rvValues[i] = columns.join(joinValue);
					}
					return rv;
				}
			}
		}
	}

	/**
	 * @method split
	 * @param {MMStringValue} sep1 
	 * @param {MMStringValue} sep2 - // optional
	 */
	split(sep1, sep2) {
		const myValueCount = this.valueCount;
		const myValues = this._values;
		if (sep2) {
			if (myValueCount && sep1.valueCount && sep2.valueCount) {
				const rowSep = sep2._values[0];
				const rowArray = this._values[0].split(rowSep);
				const rowCount = rowArray.length;
				if (rowCount) {
					const columnSep = sep1._values[0];

					// determine the number of columns in the first row
					const columnCount = rowArray[0].split(columnSep).length;
					const rv = new MMStringValue(rowCount, columnCount);
					const rvValues = rv._values;
					for(let row = 0; row < rowCount; row++) {
						const columnArray = rowArray[row].split(columnSep);
						const copyCount = columnArray.length;  // incase it is different from columnCount
						for(let column = 0; column < columnCount && column < copyCount; column++) {
							rvValues[row * columnCount + column] = columnArray[column];
						}
						for (let column = copyCount + 1; column < columnCount; column++) {
							rvValues[row * columnCount + column] = "";
						}
					}
					return rv;
				}
			}
		}
		else if (sep1) { // single separator
			const separator = sep1._values[0];
			const a = myValues[0].split(separator);
			if (myValueCount && sep1.valueCount) {
				if (myValueCount === 1) {
					const count = a.length;
					if (count) {
						const rv = new MMStringValue(count, 1);
						const rvValues = rv._values;
						for (let i = 0; i < count; i++) {
							rvValues[i] = a[i];
						}
						return rv;
					}
				}
				else {
					// string is array - split each value into columns
					const columnCount = myValues[0].split(separator).length;
					if (columnCount) {
						const rv = new MMStringValue(myValueCount, columnCount);
						const rvValues = rv._values;
						for (let row = 0; row < myValueCount; row++) {
							const columnArray = myValues[row].split(separator);
							const copyCount = columnArray.length;
							for(let column = 0; column < columnCount && column < copyCount; column++) {
								rvValues[row * columnCount + column] = columnArray[column];
							}
							for (let column = copyCount + 1; column < columnCount; column++) {
								rvValues[row * columnCount + column] = "";
							}
						}
						return rv;
					}
				}
			}
		}
		else {
			// no separator - split into characters
			if (myValueCount) {
				const s = myValues[0];
				const rowCount = s.length;
				if (rowCount) {
					const rv = new MMStringValue(rowCount, 1);
					const rvValues = rv._values;
					for(let i = 0; i < rowCount; i++) {
						rvValues[i] = s[i];
					}
					return rv;
				}
				else {
					return MMStringValue.scalarValue("");
				}
			}
		}
		return null;
	}

	/**
	 * @method replace
	 * @param {MMStringValue} match
	 * @param {MMStringValue} replace 
	 */
	replace(match, replace, options) {
		const myValues = this._values;
		const matchRowCount = match.rowCount;
		const matchColumnCount = match.columnCount;
		if ( matchRowCount !== replace.rowCount || matchColumnCount !== replace.columnCount ) {
			return null;
		}
		const myRowCount = this.rowCount;
		const myColumnCount = this.columnCount;
		const rv = this.dyadicStringResult(match);
		const rvValues = rv._values;
		const rowCount = rv.rowCount;
		const columnCount = rv.columnCount;
		const vMatch = match._values;
		const vReplace = replace._values;

		for (let i = 0; i < rowCount; i++) {
			const rMine = i % myRowCount;
			const rMatch = i % matchRowCount;
			for (let j = 0; j < columnCount; j++) {
				const cMine = j % myColumnCount;
				const cMatch = j % matchColumnCount;
				const s = myValues[rMine * myColumnCount + cMine];
				const sMatch = new RegExp(vMatch[rMatch * matchColumnCount + cMatch], options);
				const sReplace = vReplace[rMatch * matchColumnCount + cMatch];
				rvValues[i * columnCount + j] = s.replace(sMatch, sReplace);
			}
		}

	return rv;
	}

	/**
	 * @method subString
	 * @param {MMStringValue} from
	 * @param {MMStringValue} length 
	 */
	subString(from, length) {
		const myValueCount = this.valueCount;
		const myValues = this._values;
		const myRowCount = this.rowCount;
		const myColumnCount = this.columnCount;
		const rv = new MMStringValue(myRowCount, myColumnCount);
		const rvValues = rv._values;
		const fromCount = from.valueCount;
		const vFrom = from._values;
		const lengthCount = length ? length.valueCount : 0;
		const vLength = length ? length._values : null;

		for (let i = 0; i < myValueCount; i++) {
			let start = Math.floor(vFrom[i % fromCount] + 0.01);
			let s = myValues[i];
			let sLength = s.length;
			if (start > 0) {
				start--; // make 0 origin
			}
			else {
				start = sLength + start;
				if (start < 0) {
					start = 0;
				}
			}
			
			if (start >= s.length ) {
				s = '';
			}
			else {
				if ( !lengthCount )
					sLength -= start;
				else {
					const l = Math.floor(vLength[i % lengthCount] + 0.01);
					if (l < 0 || start + l > sLength) {
						sLength = sLength - start;
					}
					else {
						sLength = l;
					}
				}

				s = s.substring(start, start + sLength);
			}

			rvValues[i] = s;
		}
	
		return rv;
}

	/**
	 * @method find
	 * @param {MMStringValue} regex 
	 */
	find(regex) {
		const myValueCount = this.valueCount;
		const myValues = this._values;
		const rxCount = regex.valueCount;
		const rxValues = regex._values;
		const rv = new MMNumberValue(myValueCount, 2);
		const rvValues = rv._values;
		for (let i = 0; i < myValueCount; i++ ) {
			const m = myValues[i].match(rxValues[i % rxCount]);
			if (m) {
				rvValues[i * 2] = m.index + 1;
				rvValues[i * 2 + 1] = m[0].length;
			}
			else {
				rvValues[i * 2] = 0;
				rvValues[i * 2 + 1] = 0;
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
