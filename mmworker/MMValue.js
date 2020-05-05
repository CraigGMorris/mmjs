'use strict';
/* global
	MMCommandMessage:readonly
	MMNumberValue:readonly
	MMStringValue:readonly
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
	 * @method columnNumber
	 * @param {Number} number 
	 * @returns {MMValue}
	 */
	// eslint-disable-next-line no-unused-vars
	columnNumber(number) {
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
}
