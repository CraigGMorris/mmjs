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
	MMStringValue:readonly
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
	constructor(rowCount, columnCount) {
		super(rowCount, columnCount); // tool values are always scalar
		this._values = new Array(this.valueCount);
	}

	/** @static toolArrayValue
	 * creates a MMToolValue from an array of tools
	 * @param {MMTool[]} values
	 */
	static toolArrayValue(values) {
		let newValue = new MMToolValue(values.length, 1);
		newValue._values = Array.from(values);
		return newValue;
	}

	/** @method copyOf
	 * @returns {MMValue}  - a copy of this instance
	 */
	copyOf() {
		let newValue = new MMToolValue(this.rowCount, this.columnCount);
		newValue._values = Array.from(this._values);
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
		let newValue = new MMToolValue(1,1);
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
	 * @method setValueAtCount
	 * @param {MMTool} value
	 * @param {Number} count
	 */
		setValueAtCount(value, count) {
			this._values[count] = value || '';
		}
	
		/**
		 * @method valueAtCount
		 * @param {Number} count 
		 * @returns {MMTool}
		 */
		valueAtCount(count) {
			return (count < this.valueCount) ? this._values[count] : '';
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
	htmlValue(requestor) {
		if (this.valueCount === 1) {
			const v = this._values[0];
			const html = v.htmlValue(requestor);
			if (html) {
				return html;
			}
			else {
				return v.typeName + ': ' + v.name;
			}
		}
		return super.htmlValue()
	}

	/**
	 * @method concat
	 * @param  {MMToolValue} other
	 * @return MMToolValue
	 * overriden to concatanate two arrays into one
	 */
	concat(other) {
		let rv;
		if (other instanceof MMToolValue) {
			let valueCount = this.valueCount + other.valueCount;
			rv = new MMToolValue(valueCount, 1);
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
	 * @param {String} description
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueDescribedBy(description, requestor) {
		let rv = null;	// return value
		if (this.valueCount === 1) {
			const tool = this.valueAtRowColumn(1,1);
			if (tool) {
				rv = tool.valueDescribedBy(description, requestor);
			}
		}
		else if (this.valueCount > 1) {
			const firstTool = this.valueAtRowColumn(1,1);
			if (firstTool) {
				const firstValue = firstTool.valueDescribedBy(description, requestor);
				if (firstValue instanceof MMNumberValue) {
					rv = new MMNumberValue(this.rowCount, this.columnCount, firstValue.unitDimensions);
				}
				else if (firstValue instanceof MMStringValue) {
					rv = new MMStringValue(this.rowCount, this.columnCount);
				}
				else {
					return null;
				}
				rv.setValueAtCount(firstValue.valueAtCount(0), 0);
				for (let i = 1; i < this.valueCount; i++) {
					const tool = this.valueAtCount(i);
					if (!tool) {
						return null;
					}
					const value = tool.valueDescribedBy(description, requestor);
					if (!value || Object.getPrototypeOf(value).constructor !== Object.getPrototypeOf(firstValue).constructor) {
						if (firstValue instanceof MMNumberValue) {
							rv.setValueAtCount(NaN, i);
						}
						else {
							rv.setValueAtCount('???', i);
						}
					}
					else {
						rv.setValueAtCount(value.valueAtCount(0), i);
					}
				}
			}
		}
		return rv
	}
}
