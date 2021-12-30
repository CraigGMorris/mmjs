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
*/

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
	constructor() {
		super(1, 1); // tool values are always scalar
		this._values = new Array(1);
	}

	/** @method copyOf
	 * @returns {MMValue}  - a copy of this instance
	 */
	copyOf() {
		let newValue = new MMToolValue();
		newValue._values[0] = this._values[0];
		return newValue;
	}

	get values() {
		return this._values;
	}

	/** @static scalarValue
	 * creates a MMToolValue with a single value
	 * @param {MMTool} value
	 * @returns {MMToolValue}
	 */
	static scalarValue(value) {
		let newValue = new MMToolValue();
		newValue._values[0] = value;
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
	// eslint-disable-next-line no-unused-vars
	stringWithUnit(unit) {
	// ignore unit
		if (this.valueCount === 1) {
			return this._values[0].name;
		}
		else {
			return '---';
		}
	}
	
	/**
	 * @method jsonValue
	 * @override
	 * @returns {Object} - representation of value using unit, suitable for conversion to json
	 */
	jsonValue() {
		return {
			t: 's',
			v: this._values.map(t => t.typeName + ": " + t.name),
			nr: this.rowCount,
			nc: this.columnCount
		}
	}

	/**
	 * @method htmlValue
	 * @returns {String}
	 */
		htmlValue() {
			if (this.valueCount === 1) {
				const v = this._values[0];
				const html = v.htmlValue();
				if (html) {
					return html;
				}
				else {
					return v.typeName + ': ' + v.name;
				}
			}
			return super.htmlValue()
		}
}
