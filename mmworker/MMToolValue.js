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
		const v = this._values.map(t => {return {t: t.typeName, n: t.name, p: t.getPath()}})
		return {
			t: 'tool',
			v: v,
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
	 * @method append
	 * appends columns to value
	 * @param {MMValue} additions
	*/
	append(additions) {
		let rv = null;
		const rowCount = this.rowCount
		if (additions instanceof MMToolValue && rowCount === additions.rowCount) {
			const thisColumnCount = this.columnCount;
			const addColumnCount = additions.columnCount
			const columnCount = thisColumnCount + addColumnCount;
			rv = new MMToolValue(this.rowCount, columnCount);
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
			rv = new MMToolValue(rowCount, columnCount);
			rv._values = Array.from(this._values);
		}
		return rv;
	}

	/** @method transpose
	 *  @returns {MMToolValue}
	 */
	transpose() {
		const rowCount = this.rowCount;
		const columnCount = this.columnCount
		const rv = new MMToolValue(columnCount, rowCount);
		const rvValues = rv._values;
		const thisValues = this._values;
		for (let i = 0; i < rowCount; i++) {
			for (let j = 0; j < columnCount; j++) {
				rvValues[j*rowCount+i] = thisValues[i*columnCount+j];
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
				// if (description === 'value' && firstTool instanceof MMExpression) {
				// 	// if a "value" is asked for, use '' for description so the
				// 	// referenced expression returns its own value
				// 	description = '';
				// }
				const firstValue = firstTool.valueDescribedBy(description, requestor);
				if (!(
					firstValue instanceof MMNumberValue ||
					firstValue instanceof MMStringValue ||
					firstValue instanceof MMToolValue)
				){
					return null;
				}
				rv = firstValue;
				for (let i = 1; i < this.valueCount; i++) {
					const tool = this.valueAtCount(i);
					if (!tool) {
						return null;
					}
					const value = tool.valueDescribedBy(description, requestor);
					if (value && Object.getPrototypeOf(value).constructor === Object.getPrototypeOf(firstValue).constructor) {
						rv = rv.concat(value);
					}
				}
			}
		}
		return rv
	}
}
