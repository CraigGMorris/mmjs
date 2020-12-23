'use strict';
/* global
	MMCommandMessage:readonly
	MMNumberValue:readonly
	MMStringValue:readonly
	MMTableValue:readonly
	MMTableValueColumn:readonly
*/

/**
 * @class MMValue
 * all calculation values are derived from this
 */
// eslint-disable-next-line no-unused-vars
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

	/**
	 * @method defaultUnit
	 * @returns {MMUnit}
	 */
	get defaultUnit() {
		return null;
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
	// eslint-disable-next-line no-unused-vars
	valueForIndexRowColumn(rowIndex, columnIndex) {
		return null;
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

	/** @method iSort
	 * @returns MMNumberValue - contains indexes sorted by first column values;
	 */
	iSort() {
		const values = [];
		const indicies = [];
		const columnCount = this.columnCount;
		const myValues = this._values;
		const rowCount = this.rowCount;
		for (let i = 0; i < rowCount; i++) {
			indicies.push(i);
			values.push(myValues[i*columnCount]);  // first column
		}
		indicies.sort((a,b) => {
			const va = values[a];
			const vb = values[b];
			if (va < vb) {
				return -1;
			}
			if (va > vb) {
				return 1;
			}
			return 0;
		});
		const rv = new MMNumberValue(rowCount, 1);
		const rvValues = rv._values;
		for (let i = 0; i < rowCount; i++) {
			rvValues[i] = indicies[i] + 1;
		}
		return rv;
	}

	/**
	 * @method stringWithUnit
	 * @param {MMUnit} unit - optional
	 * @returns {String} 
	 */
	// eslint-disable-next-line no-unused-vars
	stringWithUnit(unit) {
		return '---';
	}

	/**
	 * @method stringForRowColumnUnit
	 * @param {Number} row
	 * @param {Number} column
	 * @param {MMUnit} outUnit
	 * @returns {String}
	 */
	// eslint-disable-next-line no-unused-vars
	stringForRowColumnUnit(row, column, outUnit) {
		return '';
	}

	/**
	 * @method stringForRowColumnWithUnit
	 * @param {Number} row
	 * @param {Number} column
	 * @param {MMUnit} outUnit
	 * @returns {String}
	 */
	// eslint-disable-next-line no-unused-vars
	stringForRowColumnWithUnit(row, column, outUnit) {
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
	 * @param {MMValue} other
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
	 * overriden to concatanate two values into one by row
	 */
	// eslint-disable-next-line no-unused-vars
	concat(other) {
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
	 * @method valueForColumnNumber
	 * @param {Number} number 
	 * @returns {MMValue}
	 */
	// eslint-disable-next-line no-unused-vars
	valueForColumnNumber(number) {
		return null;
	}

	/**
	 * @method append
	 * appends columns to value
	 * @param {MMValue} additions
	 */
	// eslint-disable-next-line no-unused-vars
	append(additions) {
		return null;
	}

	/**
	 * @method htmlValue
	 * @returns {String}
	 */
	htmlValue() {
		let rv;
		if (this.valueCount === 0) {
			rv = '';
		}
		else if (this.valueCount == 1) {
			rv = this.stringForRowColumnWithUnit(1, 1, this.defaultUnit);
		}
		else {
			const lines = [];
			let unitName = '&nbsp';
			if (this.defaultUnit && this.defaultUnit.name) {
				unitName = this.defaultUnit.name;
			}
			lines.push('\n<table>');
			lines.push(`\t<tr>\n\t\t<td>${unitName}</td>`);
			for (let column = 1; column <= this.columnCount; column++) {
				lines.push(`\t\t<td>${column}</td>`);
			}
			lines.push('\t</tr>');
			for (let row = 1; row <= this.rowCount; row++) {
				lines.push(`<tr>\n\t\t<td>${row}</td>`)
				for (let column = 1; column <= this.columnCount; column++) {
					const v = this.stringForRowColumnUnit(row, column, this.defaultUnit);
					lines.push(`\t\t<td>${v}</td>`)
				}
				lines.push('\t</tr>');
			}
			lines.push('</table>\n');
			rv = lines.join('\n');
	
		}
		return rv;
	}

	/**
	 * @method jsonValue
	 * @param {MMUnit} displayUnit
	 * @returns {Object} - representation of value using unit, suitable for conversion to json
	 */
	// eslint-disable-next-line no-unused-vars
	jsonValue(unit) {
		this.exceptionWith('mmcmd:unimplemented');
	}

	/**
	 * @method ifThenElse
	 * @param {MMNumberValue} thenValue 
	 * @param {MMNumberValue} elseValue 
	*/
	ifThenElse(thenValue, elseValue) {
		const valueCount = this.valueCount
		if (valueCount === 1) {
			if (this._values[0]) {
				return thenValue;
			}
			else {
				return elseValue;
			}
		}

		thenValue.checkUnitDimensionsAreEqualTo(elseValue.unitDimensions);
		const thenCount = thenValue.valueCount;
		const elseCount = elseValue.valueCount;
		let rv;
		if (thenCount > elseCount) {
			rv = this.dyadicNumberResult(thenValue, thenValue.unitDimensions);
		}
		else {
			rv = this.dyadicNumberResult(elseValue, elseValue.unitDimensions);
		}
		const rvCount = rv.valueCount;
		const v1 = rv._values;
		const vThen = thenValue._values;
		const vElse = elseValue._values;
		const vThis = this._values;
		for (let i = 0; i < rvCount; i++) {
			v1[i] = vThis[i % valueCount] ? vThen[i % thenCount] : vElse[i % elseCount];
		}
		return rv;
	}

	/**
	 * @method ifStringThenElse
	 * @param {MMStringValue} thenValue 
	 * @param {MMStringValue} elseValue 
	*/
	ifStringThenElse(thenValue, elseValue) {
		const valueCount = this.valueCount
		if (valueCount === 1) {
			if (this._values[0]) {
				return thenValue;
			}
			else {
				return elseValue;
			}
		}
		const thenCount = thenValue.valueCount;
		const elseCount = elseValue.valueCount;
		let rv;
		if (thenCount > elseCount) {
			rv = this.dyadicStringResult(thenValue);
		}
		else {
			rv = this.dyadicStringResult(elseValue);
		}
		const rvCount = rv.valueCount;
		for (let i = 0; i < rvCount; i++) {
			rv.setValue(
				this._values[i % valueCount]
				? thenValue.valueAtCount(i % thenCount)
				: elseValue.valueAtCount(i % elseCount),
				i + 1, 1
			);
		}
		return rv;
	}

		// Lookup functions

		indexOf(value) {
			const valueCount = value.valueCount;
			const myValueCount = this.valueCount;
			const myColumnCount = this.columnCount;
			const vValues = value._values;
			const myValues = this._values;
			const rv = new MMNumberValue(valueCount, 2);
			const rvValues = rv._values;
			
			for (let j = 0; j < valueCount; j++) {
				const v = vValues[j];
				for (let i = 0; i <= myValueCount; i++) {
					if (v === myValues[i]) {
						const row = Math.floor((i / myColumnCount) + 1.1);
						const column = Math.floor((i - ((row - 1) * myColumnCount)) + 1.1);
						rvValues[j * 2] = row;
						rvValues[j * 2 + 1] = column;
						break;
					}
				}
			}
		
			return rv;
		}	

		select(selector) {
			if (!selector) {
				return null;
			}

			if (selector.columnCount > 1) {
				this.exceptionWith('mmcmd:formulaSelectColumns');
			}
			if (selector.rowCount !== this.rowCount) {
				this.exceptionWith('mmcmd:formulaSelectRowMismatch');
			}

			let newRowCount = 0;
			let myRowCount = this.rowCount;
			const sValues = selector.values;

			for (let i = 0; i < myRowCount; i++) {
				if (sValues[i] != 0.0) {
					newRowCount++;
				}
			}
			if (newRowCount) {
				let rv;
				if (this instanceof MMTableValue) {
					if (!this.columns.length) {
						return null;
					}
					const newColumns = [];
					for (let column of this.columns ) {
						const cValue = column.value;
						if (!cValue) {
							return null;
						}
						const selectedValues = cValue.select(selector);
						if (!selectedValues) {
							return null;
						}

						const newColumn = new MMTableValueColumn({
							name: column.name,
							displayUnit: column.displayUnit ? column.displayUnit.name : null,
							value: selectedValues
						});
						newColumns.push(newColumn);
						
					}
					return new MMTableValue({
						columns: newColumns
					});
				}
				else {
					if (this instanceof MMNumberValue) {
						rv = new MMNumberValue(newRowCount, this.columnCount, this.unitDimensions);
					}
					else if (this instanceof MMStringValue) {
						rv = new MMStringValue(newRowCount, this.columnCount);
					}
					const rvValues = rv.values;
					const myValues = this._values;
					let newRow = 0;
					const myColumnCount = this.columnCount;
					for (let r = 0; r < myRowCount; r++) {
						if (sValues[r] !== 0.0) {
							for (let c = 0; c < myColumnCount; c++) {
								rvValues[newRow * myColumnCount + c] = myValues[r * myColumnCount + c];
							}
							newRow++;
						}
					}
					return rv;
				}
			}
		}	
}
