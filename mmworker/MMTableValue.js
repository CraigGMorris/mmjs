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
	theMMSession:readonly
	MMCommandMessage:readonly
	MMUnitSystem:readonly
	MMUnit:readonly
	MMUnitDimensionType:readonly
	MMValue:readonly
	MMNumberValue:readonly
	MMStringValue:readonly
	MMFunctionResult:readonly
*/

/**
 * @class MMTableValueColumn
 * @member {String} name
 * @member {MMUnit} _displayUnit
 * @member {MMValue} _value
 * @member {String} format
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
	 * the first has the name {String}, displayUnit {String} and value  {MMValue}
	 * the second has rowNumbers {MMNumberValue} and column {MMTableValueColumn} amd
	 * creates a copy of column containing just the rows listed in rowNumbers 
	 */
	constructor(context) {
		if (context.name) {
			this.name = context.name;
			this._value = context.value;
			this.format = context.format;
			if (this._value) {
				if (this._value instanceof MMNumberValue) {
					if (context.displayUnit) {
						try {
							this.displayUnit = theMMSession.unitSystem.unitNamed(context.displayUnit);
						}
						catch(e) {
							this.displayUnit = theMMSession.unitSystem.defaultUnitWithDimensions(this._value.unitDimensions);
							theMMSession.setError(e.msgKey, {error: e.args});
						}
					}
					else {
						this.displayUnit = theMMSession.unitSystem.defaultUnitWithDimensions(this._value.unitDimensions);
					}
				}
			}
			else {
				const unitName = context.displayUnit ? context.displayUnit : 'Fraction';
				if (unitName.toLowerCase() === 'string') {
					this._value = new MMStringValue(0, 0);
				}
				else {
					this._displayUnit = theMMSession.unitSystem.unitNamed(unitName);
					if (!this._displayUnit) {
						// don't want to fail as it could make session unreadable
						theMMSession.setWarning('mmcmd:tableBadUnit', {
							unit: unitName,
							name: this.name,
						});
						this._displayUnit = theMMSession.unitSystem.unitNamed('Fraction');
					}
					this._value = new MMNumberValue(0, 0, this._displayUnit.dimensions);
				}
			}
		}
		else if (context.column) {
			const column = context.column;
			this.name = column.name;
			this._displayUnit = column.displayUnit;
			this.format = column.format;
			const rowNumbers = context.rowNumbers;
			const nRows = rowNumbers.valueCount;
			const rowNValues = rowNumbers.values;
			const columnValues = column.value.values;
			const columnValueCount = column.value.valueCount;
			// if rowNumbers is scalar 0, then the whole column is used
			if (nRows === 1 && rowNValues[0] ===  0) {
				this._value = column.value;
			}
			else if (column.isString) {
				let sValue = new MMStringValue(nRows, 1);
				for (let i = 1; i <= nRows; i++) {
					let rowIndex = rowNValues[i - 1] - 1;
					// if rowIndex is negative, then count back from the end
					if (rowIndex < 0) {
						rowIndex = columnValueCount + rowIndex +  1;
					}
					if (rowIndex < columnValueCount) {
						sValue.setValue(columnValues[rowIndex], i, 1);
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
					let rowIndex = rowNValues[i - 1] - 1;
					// if rowIndex is negative, then count back from the end
					if (rowIndex < 0) {
						rowIndex = columnValueCount + rowIndex +  1;
					}
					if (rowIndex < columnValueCount) {
						nValue.setValue(columnValues[rowIndex], i, 1);
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
		return this.isString ? 'string' : this._displayUnit;
	}

	/**
	 * @param {MMUnit} unit - can be string in which case it will try to make unit from it
	 */
	set displayUnit(displayUnit) {
		if (this.isString) {
			return;
		}
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
					this._value.setValue(withValue.stringForRowColumnUnit(1, 1), rowNumber, 1);
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
				o.nValues = Array.from(this._value.values);
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
	 * @param {String} format
	 * @returns {Object} - representation of value using unit, suitable for conversion to json
	 */
	jsonValue(displayUnit, format) {
		if (!displayUnit) {
			displayUnit = this._displayUnit;
			if (!displayUnit && this._value.unitDimensions) {
				displayUnit = theMMSession.unitSystem.defaultUnitWithDimensions(this._value.unitDimensions);
			}
		}
		const displayUnitName = (displayUnit) ? displayUnit.displayName : '';
		return {
			t: 'tc',
			name: this.name,
			dUnit: displayUnitName,
			format: format ? format : this.format,
			v: this._value.jsonValue(displayUnit),
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
		const initWithColumns = (columns) => {
			this.columns = Array.from(columns)  // create copy
			this._nameDictionary = {};
			for (const column of this.columns) {
				this._nameDictionary[column.lowerCaseName] = column;
			}
		}
		if (context.columns) {
			const columns = context.columns;
			const nColumns = columns ? columns.length : 0;
			if (context.rowNumbers) {
				const rowNumbers = context.rowNumbers;
				let nRows = rowNumbers.valueCount;
				if (rowNumbers.values[0] === 0 && nColumns) {
					nRows = columns[0].rowCount;
				}

				super(nRows, nColumns);
				let newColumns = [];
				for (const column of columns) {
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
		else if (context.csv) {
			/*
				csv - with three definition lines at top

				table,en   where the character after table is
				the csv separator and en is the language code

				name1","name2" ... column names using csv separator

				"Fraction","Fraction" ... column display unitss using csv separator
			*/
			const csv = context.csv;
			let i = 0;
			let line;
			let re = new RegExp('.*?[\\r\\n]+');
			const exceptionWith = (key, args) => {
				let msg = new MMCommandMessage(key, args);
				throw(msg);
			}
		
			const getLine = (i, re) => {
				let match = csv.substring(i).match(re);
				if (!match) {
					exceptionWith('mmcmd:tableBadCsvHeader', {path: context.path});
				}
				let line = match[0];
				i += match.index + line.length;
				return [i, line];
			}
			[i, line] = getLine(i, re);
			if (!line) {
				exceptionWith('mmcmd:tableBadCsvHeader', {path: context.path});
			}
			let csvSeparator = ',';
			let locale = 'en';
			if (line.length >= 7) {
				csvSeparator = line[5];
				locale = line.substring(6).trim();
			}
			let n = 1.1;
			const decimalSeparator = n.toLocaleString(locale).substring(1,2);
	
			[i, line] = getLine(i, re);
			if (!line) {
				exceptionWith('mmcmd:tableBadCsvHeader', {path: context.path});
			}
			const columnNames = line.trim().split(csvSeparator);
	
			[i, line] = getLine(i, re);
			if (!line) {
				exceptionWith('mmcmd:tableBadCsvHeader',  {path: context.path});
			}
			const unitNames = line.trim().split(csvSeparator);
	
			if (unitNames.length !== columnNames.length) {
				exceptionWith('mmcmd:tableCsvColumnCountsDiffer',  {path: context.path});
			}
	
			const columns = [];
			const columnData = [];
			const csvColumnCount = columnNames.length;
			const uniqueNames = new Set();
			const includeColumn = [];
			if (csvColumnCount === 0) {
				super(0,0);
				return;
			}
			for (let i = 0; i < csvColumnCount; i++) {
				let columnName = columnNames[i];
				columnName = columnName.substring(1,columnName.length -1);  // strip off the quotes
				let unitName = unitNames[i];
				unitName = unitName.substring(1,unitName.length -1);  // strip off the quotes
				if (!uniqueNames.has(columnName)) {
					const column = new MMTableValueColumn({
						name: columnName,
						displayUnit: unitName
					});
					columns.push(column);
					columnData.push([]);
					uniqueNames.add(columnName);
					includeColumn.push(true);
				}
				else {
					includeColumn.push(false);
				}
			}
			const columnCount = uniqueNames.size;
	
			re = new RegExp('".*?"|[^' + csvSeparator + '"\\n]*','ms');
			let match = csv.substring(i).match(re);
			let columnNumber = 0;
			let csvColumnNumber = 0;
			const csvLength = csv.length;
			while (match && i <= csvLength) {
				let token = match[0];
				i += match.index + token.length;
				if (includeColumn[csvColumnNumber]) {
					const column = columns[columnNumber];
	
					if (token.startsWith('"')) {
						token = token.substring(1,token.length - 1); // strip quotes
					}					
					if (column.isString) {
						columnData[columnNumber].push(token);
					}
					else {
						if (token.length) {
							if (decimalSeparator !== '.') {
								token = token.replace(decimalSeparator, '.');
							}
							else {
								token = token.replace(/,/g, '');
							}
						}
						else {
							token = 0;
						}
						columnData[columnNumber].push(token);
					}
					columnNumber = (columnNumber + 1) % columnCount;
				}
				csvColumnNumber = (csvColumnNumber + 1) % csvColumnCount;
				i++;
				match = csv.substring(i).match(re);
			}
	
			let rowCount = columnData[0].length;
			for (let i = 1; i < columnCount; i++) {
				if (columnData[i].length !== rowCount) {
					theMMSession.setWarning('mmcmd:tableCsvRowCountsDiffer', {
						path: context.path,
						column: i,
						ilength: columnData[i].length,
						rowcount: rowCount
					});
					rowCount = Math.min(columnData[i].length, rowCount);
				}
			}
			for (let i = 0; i < columnCount; i++) {
				columns[i].updateFromStringArray(columnData[i]);
			}
			super(rowCount, columnCount);
			initWithColumns(columns);

		}
		else {
			super(0,0);
		}
	}

	/**
	 * @method valueForColumnNumber
	 * @override
	 * @param {Number} number 
	 * @returns {MMValue}
	 */
	valueForColumnNumber(number) {
		if (number <= this.columns.length) {
			return  this.columns[number - 1].value;
		}
		return null;
	}

	/** @method columnNamed
	 * @param name
	 * @returns {MMTableValueColumn}
	 */
	columnNamed(name) {
		return this._nameDictionary[name.toLowerCase()];
	}

	/**
	 * @method columnHeader
	 * @param {Number} number 
	 * @returns {String || Number}
	 */
		columnHeader(number) {
			if (number <= this.columns.length) {
				return  this.columns[number - 1].name;
			}
			return null;
		}
	
	/**
	 * @method columnDisplayUnitName
	 * @param {Number} number 
	 * @returns {String || Number}
	 */
	columnDisplayUnitName(number) {
		if (number <= this.columns.length) {
			const unit =  this.columns[number - 1].displayUnit;
			if (unit) {
				return unit.name;
			}
		}
		return null;
	}

	/**
	 * @method valueForIndexRowColumn
	 * @override
	 * @param {MMValue} rowIndex
	 * @param {MMValue} columnIndex
	 * @returns {MMValue}
	 */
	valueForIndexRowColumn(rowIndex, columnIndex) {
		if( rowIndex instanceof MMNumberValue ) {
			let rvColumns = [];
			if (!columnIndex) {
				rvColumns = this.columns;
			}
			else if (columnIndex instanceof MMNumberValue) {
				if (columnIndex.valueCount === 1 && columnIndex.values[0] === 0) {
					rvColumns = this.columns;
				}
				else {
					const nColumns = columnIndex.valueCount;
					for (let i = 0; i < nColumns; i++) {
						let columnNumber = columnIndex.values[i];
						if (columnNumber < 0) {
							columnNumber += this.columnCount + 1;
						}
						if (columnNumber > this.columnCount) {
							this.exceptionWith("mmcmd:tableValueIndexError");
						}
						const column = this.columns[columnNumber - 1];
						rvColumns.push(column);
					}
				}
			}
			else if (columnIndex instanceof MMStringValue) {
				const nColumns = columnIndex.valueCount;
				for (let i = 0; i < nColumns; i++) {
					const columnName = columnIndex.valueAtCount(i).toLowerCase();
					const column = this._nameDictionary[columnName];
					if (!column) {
						this.exceptionWith("mmcmd:tableValueIndexError");
					}
					rvColumns.push(column);
				}
			}
			if (rvColumns.length === 1) {
				const v = rvColumns[0].value.valueForIndexRowColumn(rowIndex, MMNumberValue.scalarValue(1));
				v.displayUnit = rvColumns[0]._displayUnit;
				v.displayFormat = rvColumns[0].format;
				return v;
			}
			else if (rvColumns.length > 1) {
				return new MMTableValue({
					columns: rvColumns,
					rowNumbers: rowIndex
				})
			}
		}
	}

	/**
	 * @method valueAtRowColumn
	 * @override
	 * @param {Number} rowIndex
	 * @param {Number} columnIndex
	 * @returns {MMValue}
	 */
	valueAtRowColumn(rowIndex, columnIndex) {
		if (columnIndex > this.columnCount) {
			this.exceptionWith("mmcmd:tableValueIndexError");
		}
		const column = this.columns[columnIndex - 1];
		return column.value.valueAtRowColumn(rowIndex, 1);
	}

	/**
	 * @method stringForRowColumnUnit
	 * @param {Number} rowNumber
	 * @param {Number} columnNumber
	 * @param {MMUnit} outUnit
	 * @param {String} format
	 * @returns {String}
	 */
	// eslint-disable-next-line no-unused-vars
	stringForRowColumnUnit(rowNumber, columnNumber, outUnit, format) {
		const column = this.columns[columnNumber - 1];

		if (!outUnit) {
			outUnit = column.displayUnit;
		}
		if (!outUnit) {
			outUnit = column.value.defaultUnit;
		}

		if (!format) {
			format = column.format;
		}

		return column.value.stringForRowColumnUnit(rowNumber, 1, outUnit, format);
	}

	/**
	 * @method stringForRowColumnUnit
	 * @param {Number} rowNumber
	 * @param {Number} columnNumber
	 * @param {MMUnit} outUnit
	 * @param {String} format
	 * @returns {String}
	 */
	// eslint-disable-next-line no-unused-vars
	stringForRowColumnWithUnit(rowNumber, columnNumber, outUnit, format) {
		const column = this.columns[columnNumber - 1];

		if (!outUnit) {
			outUnit = column.displayUnit;
		}
		if (!outUnit) {
			outUnit = column.value.defaultUnit;
		}

		if (!format) {
			format = column.format;
		}

		return column.value.stringForRowColumnWithUnit(rowNumber, 1, outUnit, format);
	}

	/**
	 * @method jsonValue
	 * @override
	 * @param {MMUnit[]} displayUnits
	 * @param {String[]} formats
	 * @returns {Object} - representation of value using unit, suitable for conversion to json
	 */
	jsonValue(displayUnits, formats) {
		let columns = [];
		const nc =  this.columnCount;
		for (let i = 0; i < nc; i++) {
			const column = this.columns[i];
			// const displayUnit = (displayUnits && i < displayUnits.length) ? displayUnits[i] : column.displayUnit;
			const displayUnit = displayUnits ? displayUnits[i + 1] : null;
			const format = formats ? formats[i + 1] : null;
			columns.push(column.jsonValue(displayUnit, format));
		}

		const returnValue = {
			t: 't',
			v: columns,
			nr: this.rowCount,
			nc: this.columnCount
		}
		if (this.isTransposed) {
			returnValue.isTransposed = true;
		}
		return returnValue;
	}

	/**
	 * @method stringWithUnit
	 * @param {MMUnit} unit - optional
	 * @returns {String} 
	 */
	// eslint-disable-next-line no-unused-vars
	stringWithUnit(unit) {
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
							this.exceptionWith('mmcmd:tableNumberValueUnits')
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

	/**
	 * @method ifThenElse
	 * table is not valid conditions
	 * table[0,1] would be though
	*/
	ifThenElse() {
		return null;
	}

	/**
	 * @method ifStringThenElse
	 * table is not valid conditions
	 * table[0,1] would be though
	*/
	ifStringThenElse() {
		return null;
	}

	/**
	 * @method selectBoolean
	 * @param {MMNumberValue} selector
	 * @returns MMTableValue
	 */
	selectBoolean(selector) {
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
					format: column.format,
					value: selectedValues
				});
				newColumns.push(newColumn);
				
			}
			return new MMTableValue({
				columns: newColumns
			});
		}
	}

	/**
	 * @method stringSelectorsToBoolean
	 * @param {MMStringValue} selectors
	 * @returns MMNumberValue
	 */
	stringSelectorsToBoolean(selectors) {
		const syntaxError = (term) => {
			this.exceptionWith('mmcmd:tableSelectSyntax', {term: term});
		}

		const initialSelector = [];
		initialSelector.length = this.rowCount;
		initialSelector.fill(1); // set all true to start
		const boolSelector = MMNumberValue.numberArrayValue(initialSelector);
		for (let selectorNumber = 0; selectorNumber < selectors.valueCount; selectorNumber++) {
			let selectorValue = selectors.values[selectorNumber];
			selectorValue = selectorValue.replace(/[^|&]+/g,'$&\n');
			for (let selector of selectorValue.split(/[\n,]/)) {
				selector = selector.trim();
				if (!selector) {
					continue;
				}
				let orOperation = false;

				if (selector[0] === '|') {
					orOperation = true;
					selector = selector.substring(1).trim();
				}
				else if (selector[0] === '&') {
					selector = selector.substring(1).trim();
				}
				const nameMatch = selector.match(/^[^!<=>?]+/);
				if (!nameMatch) { syntaxError(selectorValue); }
				const columnName = nameMatch[0].trim();
				const column = this.columnNamed(columnName);
				if (!column) {
					this.exceptionWith('mmcmd:tableSelectBadColumn', {name: columnName});
				}
				const columnValue = column.value;
				if (!columnValue) {
					return null;
				}
				selector = selector.substring(nameMatch[0].length).trim();

				if (selector.length < 1) { syntaxError(selectorValue); }
				let opString = selector[0];
				let valueString = '';
				if (selector[1] === '=') {
					opString += selector[1];
					valueString = selector.substring(2).trim();
				}
				else {
					valueString = selector.substring(1).trim();
				}

				let findValue;
				if (columnValue instanceof MMNumberValue) {
					if (valueString.length === 0) { syntaxError(selectorValue)}
					const valueParts = valueString.split(' ');
					findValue = parseFloat(valueParts[0]);
					if (isNaN(findValue)) {
						syntaxError(selectorValue);
					}
					if (valueParts.length > 1) {
						// assume unit
						const unit = theMMSession.unitSystem.unitNamed(valueParts[1]);
						if (!MMUnitSystem.areDimensionsEqual(unit.dimensions, columnValue.unitDimensions)) {
							this.exceptionWith('mmcmd:tableSelectUnitMismatch', {term: selectorValue})
						}
						if (unit) {
							findValue = unit.convertToBase(findValue);
						}
						else {
							this.exceptionWith('mmunit:unknownUnit', {name: valueParts[1]});
						}
					}
					else {
						if (!MMUnitSystem.areDimensionsEqual(columnValue.unitDimensions)) {
							this.exceptionWith('mmcmd:tableSelectUnitMismatch', {term: selectorValue})
						}
					}

				}
				else {
					findValue = valueString.toLowerCase();
				}

				const op = {
					'=': (a, b) => {return a === b ? 1 : 0;},
					'==': (a, b) => {return a === b ? 1 : 0;},
					'!=': (a, b) => {return a === b ? 0 : 1},
					'<': (a, b) => {return a < b ? 1 : 0;},
					'>': (a, b) => {return a > b ? 1 : 0;},
					'<=': (a, b) => {return a <= b ? 1 : 0;},
					'>=': (a, b) => {return a >= b ? 1 : 0;},
					'?': (a, b) => {return a.includes(b);}
				}[opString];

				for (let i = 0; i < this.rowCount; i++) {
					let value = columnValue.values[i];
					if (columnValue instanceof MMStringValue) {
						value = value.toLowerCase().trim();
					}
					if (orOperation) {
						if (op(value, findValue)) {
							boolSelector.values[i] = 1;
						}
					}
					else { // and operation}
						if (!op(value, findValue)) {
							boolSelector.values[i] = 0
						}
					}
				}
			}
		}
		return boolSelector;
	}

	/**
	 * @method selectString
	 * @param {MMStringValue} selectors
	 * @returns MMTableValue
	 */
	selectString(selectors) {
		return this.selectBoolean(this.stringSelectorsToBoolean(selectors))
	}

	// statistical functions

	calcMean(resultType, f) {
		if (resultType === MMFunctionResult.rows || resultType === MMFunctionResult.all) {
			const v = this.numberValue();
			return v ? f(v) : null;
		}

		let rv = null;
		if (this.columnCount) {
			const newColumns = [];
			for (let column of this.columns) {
				const value = column.value;
				if (value instanceof MMNumberValue) {
					const mean = f(value);
					if (mean === null) {
						return null;
					}
					let displayUnitName = null;
					if (column.displayUnit && MMUnitSystem.areDimensionsEqual(mean.unitDimensions, column.displayUnit.unitDimensions)) {
						displayUnitName = column.displayUnit.name;
					}
					const newColumn = new MMTableValueColumn({
						name: column.name,
						value: mean,
						displayUnit: displayUnitName,
					});
					newColumns.push(newColumn);
				}
			}
			rv = new MMTableValue({columns: newColumns});
		}
		return rv;
	}

	averageOf(resultType) {
		return this.calcMean(resultType, (v) => {
			return v.averageOf(resultType);
		})
	}

	medianOf(resultType) {
		return this.calcMean(resultType, (v) => {
			return v.medianOf(resultType);
		})
	}

	geoMeanOf(resultType) {
		return this.calcMean(resultType, (v) => {
			return v.geoMeanOf(resultType);
		})
	}

	harmonicMeanOf(resultType) {
		return this.calcMean(resultType, (v) => {
			return v.harmonicMeanOf(resultType);
		})
	}

	varianceOf(resultType) {
		return this.calcMean(resultType, (v) => {
			return v.varianceOf(resultType);
		})
	}
}
