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
	MMStringValue:readonly
	MMNumberValue:readonly
*/

/**
 * @class MMJsonValue
 * @extends MMValue
 */
// eslint-disable-next-line no-unused-vars
class MMJsonValue extends MMValue {
	/** @constructor
	 * @param {String|Object} jsonOrObject
	*/
	constructor(jsonOrObject) {
		super(1, 1);
		if (typeof jsonOrObject === "string") {
			try {
				this._jsonValue = JSON.parse(jsonOrObject);
			}
			catch(e) {
				this.exceptionWith('mmcmd:formulaBadJsonValue', {msg: e.message});
				this._jsonValue = null;
			}
		}
		else {
			this._jsonValue = jsonOrObject;
		}
	}

	/** @method copyOf
	 * @returns {MMValue}  - a copy of this instance
	 */
	copyOf() {
		let newValue = new MMJsonValue(this._jsonValue);
		return newValue;
	}

	get values() {
		// used by MMTableValueColumn for saving actual values
		if (this._jsonValue) {
			return JSON.stringify(this._jsonValue, null, '\t');
		}
		return null;
	}

	/** @static scalarValue
	 * creates a MMStringValue with a single value
	 * @param {String} value
	 * @returns {MMStringValue}
	 */
	static scalarValue(value) {
		return new MMJsonValue(value);
	}

	/** @static stringArrayValue
	 * creates a MMStringValue from an array of strings
	 * @param {String[]} values
	 */
	static stringArrayValue(values) {
		return this.scalarValue(values);
	}

	/** @method logValueWithHeader 
	 * debugging method - information is pushed to results array
	 * @param {string} header
	 * @param {String[]} results
	*/
	logValueWithHeader(header, results) {
		results.push(header);
		results.push(this.values);
	}

	/**
	 * @method valueAtCount
	 * @param {Number} count 
	 * @returns {String}
	 */
	valueAtCount(count) {
		return (count < this.valueCount) ? this.values : '';
	}

	/**
	 * @method valueAtRowColumn
	 * @param {Number} row
	 * @param {Number} column
	 * @returns {String}
	 */
	valueAtRowColumn(row, column) {
		this.checkBounds(row, column);
		return this.values;
	}

	/**
	 * @method valueForDescription
	 * @param {String} descriptiopn
	 * @returns {MMValue}
	 */
	valueForDescription(description) {
		const parts = description.split('.');
		let obj = this._jsonValue;
		const partCount = parts.length;
		for (let i = 0; i < partCount; i++) {
			const part = parts[i];
			if (part === '*') {
				obj = Object.keys(obj);
			}
			else if (part === ':*') {
				obj = Object.values(obj);
			}
			else if (part.startsWith(':')) {
				const newObj = [];
				const key = part.substring(1);
				if (key) {
					const elements = Object.values(obj);
					// find default type
					let type = 'undefined';
					for (const element of elements) {
						const member = element[key];
						const memberType = typeof member;
						if (memberType !== 'undefined') {
							type = memberType;
							break;
						}
					}

					for (const element of elements) {
						const member = element[key];
						if (member) {
							newObj.push(member);
						}
						else if (type === 'number') {
							newObj.push(0);
						}
						else {
							newObj.push('');
						}
					}
				}
				obj = newObj;
			}
			else {
				obj = obj[part];
			}
			if (obj === undefined) {
				return null;
			}
		}
		if (typeof obj === 'number') {
			return MMNumberValue.scalarValue(obj);
		}
		if (typeof obj === 'string') {
			return MMStringValue.scalarValue(obj);
		}
		if (Array.isArray(obj) && obj.length) {
			const first = obj[0];
			let type = typeof first;
			if (type === 'number' || type === 'string') {
				for(const element of obj) {
					if (typeof element !== type) {
						type = 'object';
						break;
					}
				}
				if (type === 'number') {
					return MMNumberValue.numberArrayValue(obj);
				}
				if (type === 'string') {
					return MMStringValue.stringArrayValue(obj);
				}
			}
		}
		return new MMJsonValue(obj);
	}

	/**
	 * @method valueForIndexRowColumn
	 * @param {MMValue} rowIndex
	 * @param {MMValue} columnIndex
	 * @returns {MMValue}
	 */
	valueForIndexRowColumn(rowIndex, columnIndex) {
		if (this._jsonValue) {
			let description;
			if (rowIndex instanceof MMStringValue && rowIndex.valueCount > 0) {
				description = rowIndex.valueAtCount(0);
			}
			else if (columnIndex instanceof MMStringValue && columnIndex.valueCount > 0) {
				description = columnIndex.valueAtCount(0);
			}
			else {
				return null;
			}
		
			return this.valueForDescription(description);
		}
	}

	/**
	 * @method stringWithUnit
	 * @param {MMUnit} unit - optional
	 * @returns {String} 
	 */
	// eslint-disable-next-line no-unused-vars
	stringWithUnit(unit) {
		// ignore unit
		return this._jsonValue ? 'JSON' : '---';
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
		return this.values;
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
		return this.values;
	}

	/**
	 * @method valueForColumnNumber
	 * @override
	 * @param {Number} number 
	 * @returns {MMValue}
	 */
	valueForColumnNumber() {
		return this;
	}

	/*
	 * dyadic functions
	 */

	/**
	 * @method concat
	 * @param  {MMJsonValue} other
	 * @return MMJsonValue
	 * returns array with both jsonObjects
	 */
	concat(other) {
		let rv;
		if (other instanceof MMJsonValue && other._jsonValue && this._jsonValue) {
			rv = new MMJsonValue([this._jsonValue, other._jsonValue]);
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
			t: 'j',
			v: [this.values || ''],
			nr: this.rowCount,
			nc: this.columnCount
		}
	}
}
