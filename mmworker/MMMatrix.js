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
	MMUnitSystem:readonly
	MMFormula:readonly
	MMNumberValue:readonly
	MMTool:readonly
	MMPropertyType:readonly
	MMTableValue:readonly
	MMTableValueColumn:readonly
*/

/**
 * Enum for matrix value state.
 * @readonly
 * @enum {string}
 */
const MatrixValueState = Object.freeze({
	unknown: '?',
	string: 's',
	formula: 'f',
	error: 'e',
});


/**
 * @class MMMatrixInputValue
 */
class MMMatrixInputValue {
	constructor(row, column) {
		this.row = row;
		this.column = column;
		this.state = MatrixValueState.unknown;
		this._input = null;
		this.value = 0.0;
	}

	forget() {
		this.state = MatrixValueState.unknown;
		this._input = null;
		this.value = 0.0;
	}

	get formula() {
		if (this.state === MatrixValueState.formula) {
			return this._input;
		}
		else {
			return null;
		}
	}

	setInput(inputString, owner) {
		if (inputString !== this._input) {
			this.resetInput(inputString, owner);
		}
	}

	resetInput(inputString, owner) {
		this._input = null;
		const displayUnit = owner.getColumnUnit(this.column);

		// first check for number and unit separated by spaces
		const tokens = inputString.split(/\s+/);
		if (tokens.length == 2) {
			let value = Number(tokens[0]);
			if (!isNaN(value)) {
				let unitName = tokens[1];
				if (unitName.startsWith('"') && unitName.length > 1) {
					unitName = unitName.substring(1, unitName.length-1);
				}
				this.state = MatrixValueState.string;
				this._input = inputString;
				let unit = theMMSession.unitSystem.unitNamed(unitName);
				if (!unit) {
					throw(owner.t('mmunit:unknownUnit', {name: unitName}));
				}
				if (!MMUnitSystem.areDimensionsEqual(unit.dimensions, displayUnit ? displayUnit.dimensions : null)) {
					this.value = 0.0;
					this.state = MatrixValueState.error;
					throw(owner.t('mmcmd:matrixWrongUnitType', {path: owner.getPath(), input: inputString}))
				}
				this.value = unit.convertToBase(value);
				return;
			}
		}

		// determine if number or formula
		// use Number(value) so extra charaters after a number will yield NaN
		let value = Number(inputString);
		if (!isNaN(value)) {
			if (displayUnit) {
				this.value = displayUnit.convertToBase(value);
				// inputString = `${inputString} ${displayUnit.name}`;
			}
			else {
				this.value = value;
			}
			this.state = MatrixValueState.string;
			this._input = inputString;
			return;
		}

		// wasn't number, so assume formula
		const formula = new MMFormula(`cell_${this.row}_${this.column}`, owner);
		formula.formula = inputString;
		this._input = formula;
		this.state = MatrixValueState.formula;
	}

	// check the the inputstring has the same unit type as the column unit
	checkInputUnit(owner) {
		if (this.state === MatrixValueState.string) {
			this.resetInput(this._input, owner);
		}
	}

	get input() {
		switch (this.state) {
			case MatrixValueState.unknown:
				case MatrixValueState.string:
				case MatrixValueState.error:
					return this._input;
		
				case MatrixValueState.formula:
					return this._input.formula;
		
				default:
					return null;
		}
	}

	/**
	 * @method numberValue
	 * @return {MMNumberValue}
	 * @param {MMMatrix} owner 
	 */
	numberValue(owner) {
		const displayUnit = owner.getColumnUnit(this.column);

		if (this.state === MatrixValueState.formula) {
			let value = this._input.value();
			if (value instanceof MMNumberValue) {
				if (value.valueCount !== 1) {
					this._input = this._input.formula;
					this.state = MatrixValueState.error;
					owner.setError('mmcmd:matrixCellValueNotScalar', {
						path: owner.getPath(),
						row: this.row,
						column: this.column,
						formula: this._input
					});
					return null;
				}

				const dimensions = displayUnit?.dimensions;
				if (!MMUnitSystem.areDimensionsEqual(value.unitDimensions, dimensions)) {
					this._input = this._input.formula;
					this.state = MatrixValueState.error;
					owner.setWarning('mmcmd:matrixWrongUnitType', {
						path: owner.getPath(),
						input: this._input
					});
				}

				return value;
			}
			else {
				return null;
			}
		}
		const dimensions = displayUnit ? displayUnit.dimensions : null;
		return MMNumberValue.scalarValue(this.value, dimensions);
	}

	/**
	 * @method floatValue
	 * @param {MMMatrix} owner 
	 */
	floatValue(owner) {
		let value;
		switch (this.state) {
			case MatrixValueState.formula:
				value = this.numberValue(owner);
				if (value) {
					return value.valueAtRowColumn(1, 1);
				}
				return null;
			case MatrixValueState.string:
				return this.value;
			default:
				return null;
		}
	}
}

/**
 * @class MMMatrix
 * @extends MMTool
 */
// eslint-disable-next-line no-unused-vars
class MMMatrix extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Matrix');
		this.cellInputs = {};
		this.value = null;
		this.columnUnits = [theMMSession.unitSystem.unitNamed('Fraction')];
		// units assigned to each column. Can have null entries for columns that don't have a unit assigned
		// the unit type for the origin cell will be used for all columns that don't have a unit assigned
		// if only the origin cell has a unit assigned, the calculated value will be a MMNumberValue, otherwise it will be a MMTableValue
		this.columnFormats = []; // formats assigned to each column. Can have null entries for columns that don't have a format assigned
		this.calculatedColumnCount = 1;
		this.rowCountFormula = new MMFormula('rowCount', this);
		this.columnCountFormula = new MMFormula('columnCount', this);
		this.rowCountFormula.formula = '1';
		this.columnCountFormula.formula = '1';
		this.isHidingInfo = false;  // needed because the formula assigns will reset
		this.recursionCount = 0;
		this.isCalculating = false;
		this.currentRow = 0;
		this.currentColumn = 0;
		this.knowns = null;
		this.setCellInput(0, 0, '0');
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['setcell'] = this.setCellCommand;
		verbs['setrowcount'] = this.setRowCountCommand;
		verbs['setcolumncount'] = this.setColumnCountCommand;
		verbs['setcolumnunit'] = this.setColumnUnitCommand;
		verbs['setcolumnformat'] = this.setColumnFormatCommand;
		verbs['value'] = this.valueCommand;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			setcell: 'mmcmd:_matrixSetCell',
			setrowcount: 'mmcmd:_matrixSetRowCount',
			setcolumncount: 'mmcmd:_matrixSetColumnCount',
			setcolumnunit: 'mmcmd:_matrixSetColumnUnit',
			setcolumnformat: 'mmcmd:_matrixSetColumnFormat',
			value: 'mmcmd:_toolValue'
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}

	/** @override */
	get properties() {
		let d = super.properties;
		return d;
	}

	/**
	 * @method parameters
	 * @override
	 * i.e. things that can be appended to a formula value
	 */
	parameters() {
		let p = super.parameters();
		p.push('table.');
		p.push('nrows');
		p.push('ncols');
		p.push('1_1');
		if (this.value instanceof MMTableValue) {
			for (let i = 0; i < this.columnCount; i++) {
				p.push(this.value.columnHeader(i+1));
			}
		}
		return p;
	}

	/**
	 * @method toolViewInfo
	 * @override
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	async toolViewInfo(command) {
		await super.toolViewInfo(command);
		let results = command.results;
		results['rowCountFormula'] = this.rowCountFormula.formula;
		results['columnCountFormula'] = this.columnCountFormula.formula;
		results['rowCount'] = this.rowCount;
		results['columnCount'] = this.columnCount;
		results['columnUnits'] = this.columnUnits.map(unit => unit?.name);
		results['columnUnitType'] = this.columnUnits.map(unit => unit?.name ? theMMSession.unitSystem.typeNameForUnitNamed(unit.name) : null);
		results['columnFormats'] = this.columnFormats;
		if (!this.value && !this.isCalculating) {
			this.calculateValue();
		}
		results['valueType'] = this.value instanceof MMTableValue ? 'table' : 'number';

		const cellInputs = {};
		for (let key in this.cellInputs) {
			const cellInput = this.cellInputs[key];
			cellInputs[key] = {
				input: cellInput.input,
				state: cellInput.state
			}
		}
		results['cellInputs'] = cellInputs;
		let value = this.jsonValue();
		if (!value || Object.keys(value).length === 0) {
			value = {
				t: 'n',
				nr: this.rowCount,
				nc: this.columnCount,
			}
		}
		results['value'] = value;
	}

	jsonValue() {
		if (!this.value && !this.isCalculating) {
			this.calculateValue();
		}
		let json = {}
		if (this.value) {
			if (this.value instanceof MMTableValue) {
				const formats = this.columnFormats.map(format => format ? format : this.columnFormats[0]);
				json = this.value.jsonValue(this.columnUnits, formats);
			}
			else {
				json = this.value.jsonValue(this.columnUnits[0], this.columnFormats[0]);
			}
		}
		return json;
	}

	/**
	 * @override forgetCalculated
	 */
	forgetCalculated() {
		if (!this.forgetRecursionBlockIsOn) {
			try {
				this.forgetRecursionBlockIsOn = true;
				this.value = null;
				this.calculatedRowCount = null;
				this.calculatedColumnCount = null;
				for (const requestor of this.valueRequestors) {
					requestor.forgetCalculated();
				}
				this.valueRequestors.clear();
				super.forgetCalculated();
			}
			finally {
				this.forgetRecursionBlockIsOn = false;
			}
		}
	}

	/**
	 * @method refreshRequestors
	 * essentially forgetCalculated without recalculating value
	 * used for unit and format change
	 */
	// refreshRequestors() {
	// 	if (!this.forgetRecursionBlockIsOn) {
	// 		try {
	// 			this.forgetRecursionBlockIsOn = true;
	// 			for (const requestor of this.valueRequestors) {
	// 				requestor.forgetCalculated();
	// 			}
	// 			this.valueRequestors.clear();
	// 			super.forgetCalculated();
	// 		}
	// 		finally {
	// 			this.forgetRecursionBlockIsOn = false;
	// 		}
	// 	}
	// }

	/**
	 * @method inputSources
	 * @override
	 * @returns {Set} contains tools referenced by this tool
	 */
	inputSources() {
		let sources = super.inputSources();
		this.columnCountFormula.addInputSourcesToSet(sources);
		this.rowCountFormula.addInputSourcesToSet(sources);
		for (const key in this.cellInputs) {
			const input = this.cellInputs[key];
			const formula = input.formula;
			if (formula) {
				formula.addInputSourcesToSet(sources);
			}
		}
	
		return sources;
	}

	/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o =   super.saveObject();
		o['Type'] = 'Matrix';
		if (this.columnUnits.length > 0) {
			o['columnUnits'] = this.columnUnits.map(unit => unit?.name);
		}

		if (this.columnFormats.length > 0) {
			o['columnFormats'] = this?.columnFormats;
		}

		const cellInputs = {};
		for (let key in this.cellInputs) {
			cellInputs[key] = this.cellInputs[key].input;
		}
		o['CellInputs'] = cellInputs;
		o['rowCount'] = this.rowCountFormula ? this.rowCountFormula.formula : '1';
		o['columnCount'] = this.columnCountFormula ? this.columnCountFormula.formula : '1';
		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		super.initFromSaved(saved);
		const unitName = saved.unit;
		try {
			if (unitName) {
				this.columnUnits[0] = theMMSession.unitSystem.unitNamed(unitName);
			}
			else if (saved.columnUnits) {
				this.columnUnits = saved.columnUnits.map(unitName => theMMSession.unitSystem.unitNamed(unitName));
			}
			else {
				this.columnUnits = [theMMSession.unitSystem.unitNamed('Fraction')];
			}
		}
		catch(e) {
			this.caughtException(e);
			this.columnUnits = [theMMSession.unitSystem.unitNamed('Fraction')];
		}

		if (saved.format) { this.columnFormats[0] = saved.format; }
		if (saved.columnFormats) {
			this.columnFormats = saved.columnFormats;
		}
		if (saved.CellInputs) {
			for (let key in saved.CellInputs) {
				const parts = key.split('_');
				const row = Number(parts[0]);
				const column = Number(parts[1]);
				try {
				this.setCellInput(row, column, saved.CellInputs[key]);
				}
				catch(e) {
					this.setWarning('mmcmd:matrixSetCellError', {path: this.getPath(), args: saved.CellInputs[key]});
				}
			}
		}

		this.rowCountFormula.formula = saved.rowCount;
		this.columnCountFormula.formula = saved.columnCount;
	}

	/** initFromNumberString
	 * @param s - string of comma or tab separated numbers, one row per line
	 */
	initFromNumberString(s) {
		const rows = s.split('\n');
		const rowCount = rows.length;
		let columnCount = 0;
		this.rowCountFormula.formula = `${rowCount}`;
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const columns = row.split(/[,\t]\s*/);
			columnCount = Math.max(columnCount, columns.length);
			for (let j = 0; j < columns.length; j++) {
				this.setCellInput(i + 1, j + 1, columns[j]);
			}
		}
		this.columnCountFormula.formula = `${columnCount}`;
	}
	
	/**
	 * @property rowCount
	 */
	get rowCount() {
		if (!this.calculatedRowCount) {
			let countValue = this.rowCountFormula.value();
			if (countValue) {
				countValue = countValue.numberValue();
			}
			if (countValue) {
				try {
					countValue.checkUnitDimensionsAreEqualTo(null);
				}
				catch(e) {
					this.setWarning('mmcmd:matrixRowCountHasUnit', {formula: this.rowCountFormula.formula})
					countValue = null;
				}
			}
			if (countValue && countValue.valueCount) {
				const value = countValue.valueAtRowColumn(1, 1);
				if ( value > 0 )
					this.calculatedRowCount = value;
			}
		}
		
		return this.calculatedRowCount;
	}
	
	/**
	 * @property columnCount
	 */
	get columnCount() {
		if (!this.calculatedColumnCount) {
			let countValue = this.columnCountFormula.value();
			if (countValue) {
				countValue = countValue.numberValue();
			}
			if (countValue) {
				try {
					countValue.checkUnitDimensionsAreEqualTo(null);
				}
				catch(e) {
					this.setWarning('mmcmd:matrixColumnCountHasUnit', {formula: this.columnCountFormula.formula})
					countValue = null;
				}
			}
			if (countValue && countValue.valueCount) {
				let value = countValue.valueAtRowColumn(1, 1);
				if (value > 0) {
					this.calculatedColumnCount = value;
					this.columnUnits.length = value + 1; // +1 for origin cell
					this.columnFormats.length = value + 1;
				}
			}
		}
		
		return this.calculatedColumnCount;
	}
	
	/** @method setCellCommand
	 * assign input to a cell
	 * @param {MMCommand} command
	 * command.args should be rowNumber columnNumber inputString
	 * if inputString is missing, the cell value is cleared
	 */
	setCellCommand(command) {
		const indicesMatch = command.args.match(/^\d+\s+\d+\s*/);
		if (indicesMatch) {
			const parts = indicesMatch[0].split(/\s+/,2);
			if (parts.length >= 2) {
				const row = Number(parts[0]);
				const column = Number(parts[1]);
				if (isNaN(row) || isNaN(column)) {
					throw(this.t('mmcmd:matrixRowColumnError', { path: this.getPath(), args: command.args }));
				}

				const inputString = command.args.substring(indicesMatch[0].length);
				const cellInput = this.cellInputs[`${row}_${column}`];
				const oldInput = cellInput ? cellInput.input : '';
				this.setCellInput(row, column, inputString);
				command.undo = `${this.getPath()} setcell ${row} ${column} ${oldInput}`;
			}
			else {
				throw(this.t('mmcmd:matrixSetCellError', { path: this.getPath(), args: command.args }));
			}
		}
		else {
			throw(this.t('mmcmd:matrixSetCellError', { path: this.getPath(), args: command.args }));
		}	
	}

	/** @method setRowCountCommand
	 * set formula for number of rows
	 * @param {MMCommand} command
	 * command.args should be the formula as a string
	 */
	setRowCountCommand(command) {
		this.rowCountFormula.formula = command.args;
	}

	/** @method setColumnCountCommand
	 * set formula for number of columns
	 * @param {MMCommand} command
	 * command.args should be the formula as a string
	 */
	setColumnCountCommand(command) {
		this.columnCountFormula.formula = command.args;
	}

	/**
	 * @method setColumnUnit
	 * @param {Number} column
	 * @param {MMUnit} unit
	 */
	setColumnUnit(column, unit) {
		if (unit) {
			this.columnUnits[column] = unit;
		}
		else {
			if (column === 0) {
				this.columnUnits[0] = theMMSession.unitSystem.unitNamed('Fraction');
			}
			else {
				this.columnUnits[column] = null;
			}
		}
		this.forgetCalculated();
	}

	/**
	 * @method getColumnUnit
	 * @param {Number} column
	 * @returns {MMUnit}
	 */
		getColumnUnit(column) {
			return this.columnUnits[column] || this.columnUnits[0];
		}
	
	/** @method setColumnUnitCommand
	 * set unit for a column
	 * @param {MMCommand} command
	 * command.args should be columnNumber unitName
	 */

	setColumnUnitCommand(command) {
		const parts = command.args.split(/\s+/);
		if (parts.length >= 1) {
			const column = Number(parts[0]);
			const unitName = parts[1];
			if (isNaN(column) || column < 0 || column > this.columnCount) {
				throw(this.t('mmcmd:matrixColumnNumberError', { path: this.getPath(), args: command.args }));
			}
			try {
				if (this.columnUnits[column]?.name !== unitName) {
					if (unitName) {
						this.setColumnUnit(column, theMMSession.unitSystem.unitNamed(unitName));
					}
					else if (column > 0) {
						this.setColumnUnit(column, null);
					}
				}
				for (const input of Object.values(this.cellInputs)) {
					if (input.column === column) {
						input.checkInputUnit(this);
					}
				}
			}
			catch(e) {
				this.setWarning('mmcmd:matrixSetColumnUnitError', {path: this.getPath(), args: command.args});
			}
		}
	}

	/** @method setColumnFormatCommand
	 * set format for a column
	 * @param {Number} column
	 * @param {String} format
	 */
	setColumnFormatCommand(command) {
		const parts = command.args.split(/\s+/);
		if (parts.length >= 1) {
			const column = Number(parts[0]);
			const format = parts[1];
			if (isNaN(column) || column < 0 || column > this.columnCount) {
				throw(this.t('mmcmd:matrixColumnNumberError', { path: this.getPath(), args: command.args }));
			}
			this.columnFormats[column] = format;
		}
	}

	/**
	 * @method valueCommand
	 * command.results = json
	 */
	valueCommand(command) {
		command.results = this.jsonValue();
	}

	setCellInput(row, column, inputString) {
		const key = `${row}_${column}`;
		let inputValue = this.cellInputs[key];
		if (inputString && inputString.length) {
			if (!inputValue) {
				inputValue = new MMMatrixInputValue(row, column);
				this.cellInputs[key] = inputValue;
			}
			if (inputValue.state === MatrixValueState.error || inputValue.input !== inputString) {
				inputValue.setInput(inputString, this);
				this.forgetCalculated();
			}
		}
		else if (inputValue) {
			delete(this.cellInputs[key]);
			this.forgetCalculated();
		}
	}

	/**
	 * @method calculateValue - attempts to calculate all possible cells
	 */
	calculateValue() {
		try {
			const rowCount = this.rowCount;
			if (!rowCount) {
				return;				
			}
			const columnCount = this.columnCount;
			if (!columnCount) {
				return;
			}

			this.recursionCount = 0;
			// check to see if any columns have a unit assigned
			let hasUnits = false;
			for (let column = 1; column <= columnCount; column++) {
				if (this.columnUnits[column]) {
					hasUnits = true;
				}
			}

			const dimensions = hasUnits ? null : this?.columnUnits?.[0]?.dimensions;
			
			// a unitless number value is used for the calculations
			this.value = new MMNumberValue(rowCount, columnCount, dimensions);
			this.knowns = [];

			for (let row = 1; row <= rowCount; row++) {
				for (let column = 1; column <= columnCount; column++) {
					let offset = (row-1)*this.columnCount + column-1
					if (!this.knowns[offset]) {
						let number = null;
						this.isCalculating = true;
						try {
							this.currentRow = row;
							this.currentColumn = column;
							number = this.floatValue(row, column);
						}
						finally {
							this.isCalculating = false;
						}
						if (number !== null) {
							this.value.setValue(number, row, column);
							this.knowns[offset] = true;
						}
						else {
							this.knowns = [];
							this.forgetCalculated();
							return;
						}
					}
				}
			}
			if (hasUnits) {
				const columnValues = [];
				for (let column = 1; column <= columnCount; column++) {
					const columnDimensions = this.columnUnits?.[column]?.dimensions || this.columnUnits[0]?.dimensions;
					const value = new MMNumberValue(rowCount, 1, columnDimensions);
					for (let row = 1; row <= rowCount; row++) {
						value.setValue(this.value.valueAtRowColumn(row, column), row, 1);
					}
					// look for comment to use as column name
					const input = this.cellInputs[`0_${column}`];
					let name = `${column}`;
					if (input?.state === MatrixValueState.formula) {
						const formula = input.input;
						const comment = formula.match(/'(.*)$/);
						if (comment) {
							name = comment[1].trim();
						}
					}
					const columnValue = new MMTableValueColumn({
						name: name,
						displayUnit: this.columnUnits[column]?.name || this.columnUnits[0]?.name,
						value: value
					});
					columnValues.push(columnValue);
				}

				this.value = new MMTableValue({columns: columnValues});
			}
		}
		finally {
			this.knowns = [];
		}
	}

	/**
	 * @method floatValue
	 * @param {Number} row - row number
	 * @param {Number} column - column number
	 * @returns {Number} value at row - column
	 */
	floatValue(row, column) {
		if (!this.isCalculating) {
			if (!this.value) {
				this.calculateValue();
				if (!this.value) {
					return null;
				}
			}
			return this.value.valueAtRowColumn(row, column);
		}

		let inputValue = this.cellInputs[`${row}_${column}`];
		if (!inputValue) {
			inputValue = this.cellInputs[`${row}_0`];
		}
		if (!inputValue) {
			inputValue = this.cellInputs[`0_${column}`];
		}
		if (!inputValue) {
			inputValue = this.cellInputs['0_0'];
		}

		return inputValue ? inputValue.floatValue(this) : null;
	}

	/**
	 * @method numberValue
	 * @param {Number} row
	 * @param {Number} column
	 * @returns {MMNumberValue} 
	 */
	numberValue(row, column) {
		if (!this.isCalculating) {
			if (!this.value) {
				this.calculateValue();
				if (!this.value) {
					return null;
				}
			}
			if (this.value instanceof MMTableValue) {
				return this.value.valueForIndexRowColumn(MMNumberValue.scalarValue(row), MMNumberValue.scalarValue(column));
			}
			else {
				return this.value.numberValueAtRowColumn(row, column);
			}
		}

		if (!this.rowCount || !this.columnCount) {
			return null;
		}

		if (row < 1 || row > this.rowCount || column < 1 || column > this.columnCount) {
			return null;
		}

		if (this.recursionCount > (this.rowCount * this.columnCount)) {
			this.setWarning('mmcmd:matrixNestingError', {path: this.getPath()});
			return null;
		}

		const offset = this.value.offsetFor(row, column);
		if (this.knowns[offset]) {
			return this.value.numberValueAtRowColumn(row, column);
		}

		this.recursionCount++;
		const savedRow = this.currentRow;
		const savedColumn = this.currentColumn;
		this.currentRow = row;
		this.currentColumn = column;
		let inputValue = this.cellInputs[`${row}_${column}`];
		if (!inputValue) {
			inputValue = this.cellInputs[`${row}_0`];
		}
		if (!inputValue) {
			inputValue = this.cellInputs[`0_${column}`];
		}
		if (!inputValue) {
			inputValue = this.cellInputs['0_0'];
		}

		const rv = inputValue?.numberValue(this);
		if (rv) {
			this.value.setValue(rv.valueAtCount(0), row, column);
			this.knowns[offset] = true;
		}
		this.recursionCount--;
		this.currentRow = savedRow;
		this.currentColumn = savedColumn;
		return rv;
	}

	/**
	 * @method numberValueAtOffsets
	 * @return {MMNumberValue} - value at offset from current cell
	 * @param {Number} rowOffset
	 * @param {Number} columnOffset 
	 */
	numberValueAtOffsets(rowOffset, columnOffset) {
		const value = this.numberValue(this.currentRow + rowOffset, this.currentColumn + columnOffset);
		const columnUnit = this.columnUnits[this.currentColumn + columnOffset] || this.columnUnits[0];
		if (columnUnit) {
			value?.setUnitDimensions(columnUnit.dimensions);
		}
		return value;
	}

	/**
	 * @override valueDescribedBy
	 * @return {MMNumberValue}
	 * @param {String} description
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueDescribedBy(description, requestor) {
		let rv = null;
		// convenience function to deal with units and format
		const returnValue = (v) => {
			if (v) {
				if (v instanceof MMNumberValue) {
					const displayUnit = this.columnUnits[this.currentColumn] || this.columnUnits[0];
					const format = this.columnFormats[this.currentColumn] || this.columnFormats[0];
					if (
						(displayUnit && displayUnit !== v.displayUnit) ||
						(format && format !== v.format)
					)
					{
						v = v.copyOf();
						if (v instanceof MMNumberValue) {
							v.displayUnit = displayUnit;
							v.displayFormat = format;
						}
					}
					return v;
				}
				else if (v instanceof MMTableValue) {
					return v.copyOf();
				}
			}
			return v;
		}

		const lcDescription = description ? description.toLowerCase() : '';
		if (lcDescription === 'solved') {
			if (!this.isCalculating && this.value) {
				this.addRequestor(requestor);
				return MMNumberValue.scalarValue(1.0);
			}
			else {
				return null;
			}
		}

		if (!this.rowCount || !this.columnCount) {
			return null;
		}

		if (lcDescription.startsWith('nrow')) {
			this.addRequestor(requestor);
			return MMNumberValue.scalarValue(this.rowCount);
		}
		if (lcDescription.startsWith('ncol')) {
			this.addRequestor(requestor);
			return MMNumberValue.scalarValue(this.columnCount);
		}

		const getCellValue = (cellDescription) => {
			if (cellDescription.match(/^\d+_\d+$/)) {
				const indexStrings = lcDescription.split('_');
				const row = Number(indexStrings[0]);
				const column = Number(indexStrings[1]);
				return this.numberValue(row, column);
			}
			else if (this.value instanceof MMTableValue) {
				const column = this.value.columnNamed(cellDescription);
				if (column) {
					return column.value;
				}
			}
			return false;
		}

		if (this.isCalculating) {
			rv = getCellValue(lcDescription);
			if (rv) {
				this.addRequestor(requestor);
				return rv;
			}
			return null;
		}
		else if (!this.value) {
			this.calculateValue();
			if (!this.value) {
				return null;
			}
		}

		if (!lcDescription) {
			rv = returnValue(this.value);
		}
		else if (lcDescription === 'table') {
			if (this.value instanceof MMTableValue) {
				rv = this.value;
			}
			else {
				const a = [];
				for (let column = 1; column <= this.calculatedColumnCount; column++) {
					const columnValue = new MMNumberValue(this.calculatedRowCount, 1, this.value.unitDimensions);
					for (let row = 1; row <= this.calculatedRowCount; row++) {
						columnValue.setValue(this.value.valueAtRowColumn(row, column), row, 1);
					}
					const tableColumn = new MMTableValueColumn({
						name:`${column}`,
						displayUnit: this.columnUnits[0]?.name,
						value: columnValue
					});
					a.push(tableColumn);
				}
				rv = new MMTableValue({columns: a});
			}
		}
		else {
			rv = getCellValue(lcDescription);
			if (rv === false) {
				return super.valueDescribedBy(lcDescription, requestor);
			}
			rv = returnValue(rv);
		}

		if (rv) {
			this.addRequestor(requestor)
		}

		return rv;
	}
}
