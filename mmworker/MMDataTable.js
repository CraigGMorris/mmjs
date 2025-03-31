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
	MMObject: readonly
	MMTool:readonly
	MMTableValueColumn:readonly
	MMTableValue:readonly
	MMNumberValue:readonly
	MMStringValue:readonly
	MMFormula:readonly
	MMUnit:readonly
	MMPropertyType:readonly
	theMMSession:readonly
*/

/**
 * @class MMDataTableColumn
 * @extends MMObject
 */
class MMDataTableColumn extends MMObject {
	/**
	 * @constructor
	 * @param {MMDataTable} table - owner
	 * @param {Object} options containing:
	 * name - required string
	 * displayUnit - required MMUnit or String
	 * 	if string value equaling "string" then the column holds string values
	 * 	this type cannot be later changed, although if can be changed to another unit of the same type
	 */
	constructor(table, options) {
		super(options.name, table, 'MMDataTableColumn');
		this.defaultFormula = new MMFormula(`${options.name}defaultFormula`, this.parent);
		this.defaultFormula.formula = options.defaultValue || '';
		const displayUnitName = options.displayUnit instanceof MMUnit ? options.displayUnit.name : options.displayUnit;
		this.isCalculated = options.isCalculated;
		this.isMenu = options.isMenu;
		this.displayUnitName = displayUnitName;
		this._format = options.format;
		if (!this.isCalculated) {
			this._columnValue = new MMTableValueColumn({
				name: options.name,
				value: options.value,
				displayUnit: displayUnitName,
				format: this.format,
			});
			if (!options.defaultValue && !this._columnValue.isString) {
				this.defaultFormula.formula = `0 ${this._columnValue.displayUnit.name}`;
			}
		}
	}

	get properties() {
		let d = super.properties;
		d['defaultValue'] = {type: MMPropertyType.string, readOnly: false};
		d['displayUnit'] = {type: MMPropertyType.string, readOnly: false};
		d['format'] = {type: MMPropertyType.string, readOnly: false};
		return d;
	}

	get columnValue() {
		if (this._columnValue) {
			return this._columnValue;
		}
		// must be calculated value if _columnValue is not known
		let calculatedValue;
		calculatedValue = this.defaultFormula.value();
		if (!(calculatedValue instanceof MMNumberValue) && !(calculatedValue instanceof MMStringValue)) {
			// make empty string result as placeholder
			calculatedValue = new MMStringValue(this.parent.rowCount, 1);
		}
		this._columnValue = new MMTableValueColumn({
			name: this.name,
			value: calculatedValue,
			format: this.format
		});
		if (this.displayUnitName) {
			this._columnValue.displayUnit = this.displayUnitName;
		}
		return this._columnValue;
	}

	get defaultValue() {
		return this.defaultFormula.formula;
	}

	set defaultValue(newValue) {
		this.defaultFormula.formula = newValue;
		if (this.isCalculated) {
			this.forgetCalculated();
		}
	}

	get displayUnit() {
		return this.columnValue.displayUnit.name;
	}

	set displayUnit(unitName) {
		this.displayUnitName = unitName;
		this.columnValue.displayUnit = unitName;
		this.forgetCalculated();
	}

	get format() {
		return this._format || '';
	}

	set format(newValue) {
		this._format = newValue;
		if (!theMMSession.isLoadingCase) {
			this.columnValue.format = newValue;
			this.forgetCalculated();
		}
	}

	/**
	 * @method addRow
	 * @param {Number} rowNumber
	 * @param {String} insertValue
	 */
	addRow(rowNumber, suppliedValue) {
		let insertValue
		if (suppliedValue == null) {
			insertValue = this.defaultFormula.value();
			if (insertValue instanceof MMTableValue) {
				if (insertValue.columnCount > 1) {
					insertValue = insertValue.valueForColumnNumber(2);
				}
				else {
					insertValue = insertValue.valueForColumnNumber(1);
				}
			}
		}
		else {
			if (this._columnValue.isString) {
				insertValue = MMStringValue.scalarValue(suppliedValue);
			}
			else {
				let n;
				if (typeof suppliedValue === "string") {
					const valueParts = suppliedValue.split(' ');
					n = parseFloat(valueParts[0]);
					if (valueParts.length > 1) {
						// assume unit
						const unit = theMMSession.unitSystem.unitNamed(valueParts[1]);
						if (unit) {
							n = unit.convertToBase(n);
						}
					}
				}
				else {
					n = suppliedValue;
				}
				insertValue = MMNumberValue.scalarValue(n, this._columnValue.displayUnit.dimensions);
			}
		}
		this.columnValue.addRow(rowNumber, insertValue);
	}

	/**
	 * @method displayValueWithUnit
	 * @param {Number} rowNumber
	 * @param {MMUnit} outUnit
	 */
	stringForRowWithUnit(rowNumber, outUnit) {
		const value = this.columnValue.value;
		if (!outUnit) {
			outUnit = value.displayUnit;
		}
		if (!outUnit) {
			outUnit = value.defaultUnit;
		}
		return value.stringForRowColumnWithUnit(rowNumber, 1, outUnit);
	}

	/**
	 * @method setCell
	 * @param {Number} rowNumber
	 * @param {String} input
	 */
	setCell(rowNumber, input) {
		const value = this.columnValue;
		if (value.isString) {
			if (input.startsWith('=')) {
				this.parent.insertFormula.formula = input.substring(1);
				const inputValue = this.parent.insertFormula.value();
				value.updateRow(rowNumber, inputValue, this.parent);
			}
			else if (input.startsWith("'")) {
				this.parent.insertFormula.formula = input;
				const inputValue = this.parent.insertFormula.value();
				value.updateRow(rowNumber, inputValue, this.parent);
			}
			else {
				value.updateRowWithString(rowNumber, input);
			}
		}
		else {
			this.parent.insertFormula.formula = input;
			const inputValue = this.parent.insertFormula.value();
			if (inputValue) {
				value.updateRow(rowNumber, inputValue);
			}
		}	
	}

	/**
	 * @method saveObject
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		const columnValue = this.columnValue;
		const o = columnValue.saveObject();
		
		o.defaultValue = this.defaultFormula.formula
		if (this.format) { o.format = this.format; }
		if (this.isCalculated) { o.isCalculated = true; }
		if (this.isMenu) { o.isMenu = true; }
		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		this.defaultFormula.formula = saved.defaultValue || '';
		if (saved.format) { this.format = saved.format; }
		if (saved.isMenu) {this.isMenu = true; }
		if (saved.isCalculated) {
			this.isCalculated = true;
		}
		else {
			this.columnValue.initFromSaved(saved);
		}
	}

	forgetCalculated() {
		if (this.isCalculated) {
			this._columnValue = null;
		}
		if (this._menu) {
			this._menu = null;
		}
		this.parent.forgetCalculated();
	}
}

/**
 * @class MMDataTable
 * @extends MMTool
 */
// eslint-disable-next-line no-unused-vars
class MMDataTable extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'DataTable');
		this.columnArray = [];
		this.rowCount = 0;
		this.insertFormula = new MMFormula('insertFormula', this);
		this.filterFormula = new MMFormula('filterFormula', this);
	}

	get columnCount() {
		return this.columnArray.length;
	}

		/** @override */
		get verbs() {
			let verbs = super.verbs;
			verbs['addcolumn'] = this.addColumnCommand;
			verbs['updatecolumn'] = this.updateColumnCommand;
			verbs['addrow'] = this.addRowCommand;
			verbs['undoaddrow'] = this.undoAddRowCommand;
			verbs['removecolumn'] = this.removeColumnCommand;
			verbs['removerows'] = this.removeRowsCommand;
			verbs['restorecolumn'] = this.restoreColumnCommand;
			verbs['restorerows'] = this.restoreRowsCommand;
			verbs['undorestorerows'] = this.undoRestoreRowsCommand;
			verbs['setcell'] = this.setCellCommand;
			verbs['movecolumn'] =this.moveColumnCommand;
			return verbs;
		}
	
		/** @method getVerbUsageKey
		 * @override
		 * @param {string} command - command to get the usage key for
		 * @returns {string} - the i18n key, if it exists
		 */
		getVerbUsageKey(command) {
			let key = {
				// value: 'mmcmd:_toolValue'
				addcolumn: 			'mmcmd:_tableAddColumn',
				addrow:					'mmcmd:_tableAddRow',
				undoaddrow:			'mmcmd:_tableUndoAddRow',
				removecolumn: 	'mmcmd:_tableRemoveColumn',
				removerows:			'mmcmd:_tableRemoveRows',
				restorecolumn:	'mmcmd:_tableRestoreColumn',
				restorerows:		'mmcmd:_tableRestoreRows',
				setcell:				'mmcmd:_tableSetCell',
				movecolumn:			'mmcmd:_tableMoveColumn',
			}[command];
			if (key) {
				return key;
			}
			else {
				return super.getVerbUsageKey(command);
			}
		}

	/**
	 * @method parameters
	 * i.e. things that can be appended to a formula value
	 */
	parameters() {
		let p = super.parameters();
		p.push('nrows');
		p.push('ncols');
		p.push('table');
		for (let column of this.columnArray) {
			p.push(column.name);
		}
		return p;
	}

	/**
	 * @method addColumn
	 * @param {String} options - optional json string containing 
	 * name: column name - default Field_n where n is columnNumber
	 * columnNmber: n - the 1 based number where the column should be inserted
	 * 		- default is as the last column
	 * isCalculated - if present and true this will be a calculated column
	 * displayUnit: this unit also determines the column type - Fraction is assumed
	 * 		- use "string" for a string column
	 * 		- this type cannot be later changed, although if can be changed to another unit of the same type
	 * defaultValue: a string containing a formula to be used as the initial value for new rows
	 *   - if isCalculated is true, then the formula should return an array of rowCount length
	 *   - should be the same type as designated by displayUnit
	 * format: a string designating number of decimal points and type of number formatting
	 * 		- types f: fixed 2f => 1.23, e: exp 2e => 1.23e0
	 * 				x: radix - the precision number is now the radix (between 2 and 36)
	 * 					123 for 16x => 16r7b for 8x => 8r173 2x => 2r1111011
	 * @returns {MMDataTableColumn}
	 */
	addColumn(optionsJson) {
		let options = {};
		if (optionsJson && optionsJson.trim().startsWith('{')) {
			try {
				options = JSON.parse(optionsJson);
			}
			catch(e) {
				this.setError('mmcmd:tableBadColumnJson', {path: this.getPath(), msg: e.message});
				return;
			}
		}
		if (!options.name) {
			let n = options.columnNumber;
			if (!n) {
				n = this.columnArray.length + 1;
			}

			options.name = `Field_${n}`;
			while(this.childNamed(options.name)) {
				options.name += '_1';
			}
		} else {
			if (this.childNamed(options.name)) {
				this.setError('mmcmd:tableDuplicateColumnName', {name: options.name, path: this.getPath()});
				return;
			}
		}

		let insertValue;
		let displayUnit = options.displayUnit;
		
		if (!options.isCalculated) {
			if (options.defaultValue) {
				this.insertFormula.formula = options.defaultValue;
				insertValue = this.insertFormula.value();
				if (options.isMenu && insertValue instanceof MMTableValue) {
					if (insertValue.rowCount > 1 && insertValue.columnCount > 1) {
						insertValue = insertValue.valueForColumnNumber(2);
					}
					else {
						insertValue = insertValue.valueForColumnNumber(1);
					}
				}
			}

			if ((!displayUnit || !displayUnit.length) && insertValue instanceof MMNumberValue) {
				options.displayUnit = theMMSession.unitSystem.baseUnitWithDimensions(insertValue.unitDimensions).name;
			}
			else if (insertValue instanceof MMStringValue) {
				options.displayUnit = 'string';
			}
		}

		const column = new MMDataTableColumn(this, options);
		column.defaultFormula.formula = options.defaultValue;
		column.format = options.format;
		if (options.columnNumber && options.columnNumber <= this.columnCount && options.columnNumber > 0) {
			this.columnArray.splice(options.columnNumber - 1, 0, column);
		}
		else {
			this.columnArray.push(column);
		}

		if (this.rowCount) {
			let v;
			if (insertValue instanceof MMTableValue) {
				insertValue = insertValue.valueForColumnNumber(2);
			}

			if (insertValue instanceof MMStringValue || options.displayUnit === 'string') {
				v = new MMStringValue(this.rowCount, 1);
				insertValue = insertValue ? insertValue.values : '';
				const insertCount = insertValue.length;
				for (let i = 0; i < this.rowCount; i++ ) {
					v.values[i] = insertValue[i % insertCount];
				}
			}
			else {
				v = new MMNumberValue(this.rowCount, 1, column.columnValue.value.unitDimensions);
				insertValue = insertValue ? insertValue.values : 0.0;
				const insertCount = insertValue.length;
				for (let i = 0; i < this.rowCount; i++ ) {
					v.values[i] = insertValue[i % insertCount];
				}
			}
			column.columnValue.updateAllRows(this.rowCount, v);
		}
	
		this.forgetCalculated();
		return column;
	}

	/**
	 * @method addColumnCommand
	 * add a column to the table
	 * @param {MMCommand} command
	 * command.args is string containing json - see addColumn for details
	 */
	addColumnCommand(command) {
		const column = this.addColumn(command.args);
		if (!command.error && column) {
			command.results = column.name;
			command.undo = `${this.getPath()} removecolumn ${column.name}`;
		}
	}

	/**
	 * @method updateColumn
	 * @param {String} options - optional json string containing changes to column properties
	 * see addColumn for details of the options
	 * @returns {Object} the undo options necessary to reverse the update or null
	 */
	updateColumn(optionsJson) {
		let options;
		try {
			options = JSON.parse(optionsJson);
		}
		catch(e) {
			this.setError('mmcmd:tableBadColumnJson', {path: this.getPath(), msg: e.message});
			return;
		}
		
		const column = options.name && this.childNamed(options.name);
		if (!column) {
			this.setError('mmcmd:tableUpdateNoName', {path: this.getPath(), name: options.name});
			return;
		}

		const undoOptions = {};
		if (options.newName) {
			if (options.newName === column.name) {
				if (this.childNamed(options.newName)) {
					this.setError('mmcmd:tableDuplicateColumnName', {name: options.newName, path: this.getPath()});
					return;
				}
			}
			undoOptions.newName = column.name;
			undoOptions.name = options.newName;
			this.renameChild(column.name, options.newName);
		}
		else {
			undoOptions.name = column.name;
		}

		if (options.defaultValue && options.defaultValue !== column.defaultValue) {
			undoOptions.defaultValue = column.defaultFormula.formula || '';
			column.defaultFormula.formula = options.defaultValue;
		}

		if (column.isCalculated) {
			// clear the column calculated value so it is recalculated before setting unit
			column.forgetCalculated();
			column.displayUnitName = options.displayUnit;
		}

		if (options.isMenu != column.isMenu) {
			column.isMenu = options.isMenu;
			undoOptions.isMenu = !column.isMenu;
		}

		if (options.displayUnit && options.displayUnit !== column.displayUnit) {
				const oldUnit = column.displayUnit;
				try {
					column.displayUnit = options.displayUnit;
				}
				catch (e) {
					this.setError(e.msgKey, e.args);
					return undoOptions;
				}
				undoOptions.displayUnit = oldUnit;
		}

		if (options.format !== column.format) {
			undoOptions.format = column.format || '';
			column.format = options.format || '';
		}

		if (options.columnNumber) {
			const toNumber = parseInt(options.columnNumber);
			if ( toNumber > 0 && toNumber <= this.columnCount) {
				let fromNumber = -1;
				const lcname = column.name.toLowerCase();
				for (let i = 0; i < this.columnCount; i++) {
					if (lcname === this.columnArray[i].name.toLowerCase()) {
						fromNumber = i + 1;
						break;
					}
				}
				if (toNumber >= 1) {
					this.moveColumn(fromNumber, toNumber);
					undoOptions.columnNumber = fromNumber;
				}
			}
		}

		this.forgetCalculated();
		return undoOptions
	}

		/**
	 * @method updateColumnCommand
	 * update a columns properties
	 * @param {MMCommand} command
	 * command.args is string containing json - see addColumn for details
	 */
	updateColumnCommand(command) {
		const undoOptions = this.updateColumn(command.args);
		if (!command.error && undoOptions) {
			if (Object.values(undoOptions).length > 1) {
				command.results = undoOptions.name;
				const undoString = JSON.stringify(undoOptions);
				command.undo = `${this.getPath()} updatecolumn${undoString}`;
			}
		}
	}

	/**
	 * @method removeChildNamed - removes column
	 * @param {String} name
	 * @override
	 */
	removeChildNamed(name) {
		if (super.removeChildNamed(name)) {
			super.removeChildNamed(name+'defaultFormula'); // remove column's formula
			const columnCount = this.columnArray.length;
			const lcname = name.toLowerCase();
			for (let i = 0; i < columnCount; i++) {
				if (lcname === this.columnArray[i].name.toLowerCase()) {
					this.columnArray.splice(i, 1);
					break;
				}
			}
			if (this.columnArray.length === 0) {
				this.rowCount = 0;
			}

			this.forgetCalculated();
			return true;
		}
		return false;
	}

	/**
	 * @method renameChild - renames column
	 * @param {String} fromName
	 * @param {String} toName
	 * @override
	 */
	renameChild(fromName, toName) {
		super.renameChild(fromName, toName);
		const extension = 'defaultFormula';
		super.renameChild(fromName+extension, toName+extension);
		const column = this.childNamed(toName);
		column.columnValue.name = toName;
	}

	/**
	 * @param {MMCommand} command
	 * command.args should be the column name
	 */
	removeColumnCommand(command) {
		let name = command.args;
		const column = this.childNamed(name);
		if (column) {
			const savedColumn = column.saveObject();
			const columnJson = JSON.stringify(savedColumn);
			let columnNumber = this.columnArray.indexOf(column);
			super.removeChildNamedCommand(command);
			command.undo = `${this.getPath()} restorecolumn ${columnNumber+1}${columnJson}`;
		}
		else {
			this.setError('mmcmd:tableBadColumnName', {path: this.getPath(), name: name});
		}
	}

	/**
	 * @method restoreColumn - adds a column from json - for undo
	 * @param {Number} columnNumber 
	 * @param {Object} saved - from json
	 */
	restoreColumn(columnNumber, saved) {
		let displayUnit = saved.sValues ? 'string' : saved.displayUnit;
		if ((!displayUnit || !theMMSession.unitSystem.unitNamed(displayUnit)) && saved.unitDimensions) {
			const dimensions = MMUnit.dimensionsFromString(saved.unitDimensions);
			displayUnit = theMMSession.unitSystem.defaultUnitWithDimensions(dimensions);
			if (displayUnit) {
				displayUnit = displayUnit.name;
				saved.displayUnit = displayUnit;
			}
		}
		const column = new MMDataTableColumn(this, {
			name: saved.name,
			defaultValue: saved.defaultValue,
			displayUnit: displayUnit,
			isCalculated: saved.isCalculated,
			isMenu: saved.isMenu,
		});
		column.initFromSaved(saved);
		this.columnArray.splice(columnNumber - 1, 0, column);
	}

	/**
	 * @method restoreColumnCommand
	 * @param {MMCommand} command
	 * command.args should be the the column number followed by the undo json
	 * in the form /.x restorecolumn 1 followed by the json text
	 */
	restoreColumnCommand(command) {
		const indicesMatch = command.args.match(/^\d+\s+/);
		const columnNumber = Number(indicesMatch[0]);
		const json = command.args.substring(indicesMatch[0].length);
		const saved = JSON.parse(json);
		this.restoreColumn(columnNumber, saved);
		const columnName = this.columnArray[columnNumber - 1].name;
		command.results = {columnName: columnName}
		command.undo = `${this.getPath()} removecolumn ${columnName}`
	}

	/**
	 * @method moveColumn - change column position
	 * @param {Number} fromNumber 
	 * @param {Number} toNumber
	 */
	moveColumn(fromNumber, toNumber) {
		if (fromNumber > 0 && fromNumber <= this.columnArray.length && toNumber > 0) {
			const column = this.columnArray[fromNumber - 1];
			this.columnArray.splice(fromNumber - 1, 1);
			this.columnArray.splice(toNumber - 1, 0 , column);
		}
	}

	/**
	 * @method moveColumnCommand
	 * @param {MMCommand} command
	 * command.args should be fromNumber, toNumber
	 */
	moveColumnCommand(command) {
		const parts = command.args.split(/\s/);
		if (parts.length !== 2) {
			this.setError('mmcmd:_tableMoveColumn', {path: this.getPath(), name: name});
			return;
		}
		const fromNumber = parseInt(parts[0]);
		const toNumber = parseInt(parts[1]);
		this.moveColumn(fromNumber, toNumber);
		command.undo = `${this.getPath()} movecolumn ${fromNumber} ${toNumber}`;
	}

	/**
	 * @method displayRows
	 * @returns {[Number]} returns an array of the row numbers to be displayed
	 */
	get displayRows() {
		if (this._displayRows) {
			return this._displayRows;
		}

		if (!this.filterFormula.formula) {
			return null;
		}

		try {
			const value = this.filterFormula.value();
			if (value) {
				let filters;
				if (value instanceof MMNumberValue) {
					filters = value.values;
				}
				else if (
					value instanceof MMStringValue &&
					value.valueCount && !
					value.values[0].startsWith("'"))
				{
					const boolValue = this.tableValue().stringSelectorsToBoolean(value);
					if (boolValue) {
						filters = boolValue.values;
					}
				}

				if (filters) {
					this._displayRows = [];
					for (let rowNumber in filters) {
						rowNumber = Number(rowNumber);
						if (filters[rowNumber]) {
							this._displayRows.push(rowNumber % this.rowCount + 1);
						}
					}
				}
				return this._displayRows;
			}
		}
		catch(e) {
			this._displayRows = null;
			this.setWarning(e.msgKey, e.args);
		}
		return null;
	}

	/**
	 * @method addRow
	 * @param {Number} rowNumber
	 * @param {Object} columnValues - optional dictionary of column values
	 * - missing values will use default formula
	 * @returns {Number} - the actual number of the row added or -1 if failed
	 */
	addRow(rowNumber, columnValues) {
		let successCount = 0;
		let error;
		for (let column of this.columnArray) {
			if (!column.isCalculated) {
				try {
					const value = columnValues ? columnValues[column.name] : null;
					column.addRow(rowNumber, value);
				} catch(e) {
					error = e;
					break;
				}
				if (column.columnValue.rowCount !== this.rowCount + 1) {
					break;
				}
			}
			successCount++;
		}

		if (successCount === this.columnArray.length) {
			this.rowCount++;
			// if rowNumber is 0 or >= rowCount, it is added to the end
			if (rowNumber === 0 || rowNumber > this.rowCount) {
				rowNumber = this.rowCount;
			}
		}
		else {
			// not all columns successfully added row for some reason
			if (rowNumber === 0 && successCount > 0) {
				rowNumber = this.columnArray[0].columnValue.rowCount;
			}
			for (let i = 0; i < successCount; i++) {
				const column = this.columnArray[i];
				column.columnValue.removeRowNumber(rowNumber);
			}
			if (error) {
				throw error;
			}
			return -1;
		}
		this.forgetCalculated();
		return rowNumber;
	}

	/**
	 * @method addRowCommand
	 * @param {MMCommand} command
	 * command.args should be the the row number
	 */
	addRowCommand(command) {
		let rowNumber, columnValues;
		if (command.args) {
			let args = command.args.trim();
			if (!args.startsWith('{')) { // should be row number
				rowNumber = parseInt(args);
				const firstSpace = args.indexOf(' ');
				if (firstSpace > 0 && args.length > firstSpace) {
					args = args.substring(firstSpace + 1);
				}
				else {
					args = '';
				}
			}
			if (args.length) {
				try {
					columnValues = JSON.parse(args);
				}
				catch(e) {
					columnValues = null;
				}
			}
		}
		else {
			rowNumber = 0;
		}
		if (rowNumber && this.displayRows) {
			// the row number will be one plus the displayed row number
			// make it one plus the real row number
			rowNumber = this.displayRows[rowNumber - 2] + 1;
		}

		rowNumber = this.addRow(rowNumber, columnValues);
		if (rowNumber > 0) {
			command.undo = `${this.getPath()} undoaddrow ${rowNumber}}`;
		}
		command.results = {rowNumber: rowNumber};
	}

	/**
	 * @method undoAddRowCommand
	 * @param {MMCommand} command
	 * command.args should be the the unfiltered row number
	 */
	undoAddRowCommand(command) {
		const rowNumber = parseInt(command.args);
		const oldInputs = this.removeRows([rowNumber], true);
		if (Object.keys(oldInputs).length) {
			const inputsJson = JSON.stringify(oldInputs);
			command.undo = `${this.getPath()} restorerows${inputsJson}`;
		}
	}

	/**
	 * @method removeRows
	 * @param {Array} rowNumbers
	 * @param {Boolean} ignoreFilter - set to true to ignore row filter
	 * @returns {Object} - old inputs for undo keyed by row number - empty if fails
	 */
	removeRows(rowNumbers, ignoreFilter=false) {
		const oldInputs = {};
		rowNumbers.sort((a,b) => a - b).reverse();
		const displayRows = this.displayRows;
		for (let rowNumber of rowNumbers) {
			if (rowNumber > 0 && rowNumber <= this.rowCount) {
				if (displayRows && !ignoreFilter) {
					if (rowNumber > displayRows.length) {
						continue; // shouldn't happen
					}
					rowNumber = displayRows[rowNumber - 1];
				}
				const columnInput = [];
				for (let column of this.columnArray) {
					const input = column.stringForRowWithUnit(rowNumber);
					columnInput.push(input);
					column.columnValue.removeRowNumber(rowNumber);
				}
				oldInputs[rowNumber] = columnInput;
				this.rowCount--;
				this.forgetCalculated();
			}
		}
		return oldInputs;
	}

	/**
	 * @method removeRowsCommand
	 * @param {MMCommand} command
	 * command.args should be the the row number(s)
	 */
	removeRowsCommand(command, ignoreFilter=false) {
		const argParts = command.args.split(/\s/);
		const rowNumbers = argParts.map(arg => {
			const n = parseInt(arg);
			return isNaN(n) ? 0 : n;
		})
		const oldInputs = this.removeRows(rowNumbers, ignoreFilter);
		if (Object.keys(oldInputs).length) {
			const inputsJson = JSON.stringify(oldInputs);
			command.undo = `${this.getPath()} restorerows${inputsJson}`;
		}
	}

	/**
	 * @method restoreRows
	 * @param {Object} inputs) - row number keyed column values
	 */
	restoreRows(inputs) {
		const rowNumbers = Object.keys(inputs);
		rowNumbers.sort((a,b) => a - b);
		for (let rowNumber of rowNumbers) {
			rowNumber = this.addRow(rowNumber);
			const columnInputs = inputs[rowNumber];
			const nColumns = this.columnArray.length;
			for (let columnNumber = 0; columnNumber < nColumns; columnNumber++) {
				this.columnArray[columnNumber].setCell(rowNumber, columnInputs[columnNumber]);
			}
		}
		this.forgetCalculated();
	}

	/**
	 * @method restoreRowsCommand
	 * @param {MMCommand} command
	 * command.args should have the the rinputsJson
	 */
	restoreRowsCommand(command) {
		const inputs = JSON.parse(command.args);
		const rowNumbers = Object.keys(inputs);
		this.restoreRows(inputs);
		command.results = {rowNumbers: rowNumbers}
		command.undo = `${this.getPath()} undorestorerows ${rowNumbers.join(' ')}`;
	}

	/**
	 * @method undoRestoreRowsCommand
	 * @param {MMCommand} command
	 * command.args should be the the row number(s)
	 */
	undoRestoreRowsCommand(command) {
		this.removeRowsCommand(command, true); // ignore filter
	}

	/**
	 * @method setCellCommand
	 * @param {MMCommand} command
	 * command.args should have the the rowNumber columnNumber input
	 */
	setCellCommand(command) {
		const indicesMatch = command.args.match(/^-?\d+\s+\d+\s+/);
		if (indicesMatch) {
			const parts = indicesMatch[0].split(/\s+/,2);
			if (parts.length >= 2) {
				let rowNumber = Number(parts[0]);
				const columnNumber = Number(parts[1]);
				let displayRows;
				// in nasty hack use negative row number for undo to disable row filter
				if (rowNumber > 0) {
					displayRows = this.displayRows;
				}
				else {
					rowNumber = -rowNumber;
				}
				if (
					isNaN(rowNumber) || isNaN(columnNumber) || 
					rowNumber < 1 || rowNumber > this.rowCount || 
					columnNumber < 1 ||  columnNumber > this.columnArray.length ||
					(displayRows && rowNumber > this.displayRows.length)
				) {
					throw(this.t('mmcmd:tableRowColumnError', { path: this.getPath(), args: command.args }));
				}
				if (displayRows) {
					rowNumber = displayRows[rowNumber - 1];
				}

				const input = command.args.substring(indicesMatch[0].length);
				const column = this.columnArray[columnNumber - 1];
				const oldInput = column.stringForRowWithUnit(rowNumber);
				column.setCell(rowNumber, input);
				command.undo = `${this.getPath()} setcell ${-rowNumber} ${columnNumber} ${oldInput}`;
			}
			else {
				throw(this.t('mmcmd:tableSetCellError', { path: this.getPath(), args: command.args }));
			}
		}
		else {
			throw(this.t('mmcmd:tableSetCellError', { path: this.getPath(), args: command.args }));
		}	
	}

	/**
	 * @method saveObject
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o =   super.saveObject();
		o['Type'] = 'Data Table';
		o['Columns'] = this.columnArray.map(col => col.saveObject());
		o['Filter'] = {'Formula': this.filterFormula.formula};
		return o;
	}

		/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Object} saved
	 */
	initFromSaved(saved) {
		super.initFromSaved(saved);
		const columns = saved.Columns;
		for (let i = 1; i <= columns.length; i++) {
			try {
				this.restoreColumn(i, columns[i - 1]);
			}
			catch(e) {
				theMMSession.setWarning(e);
				continue;
			}
		}
		if (this.columnArray.length) {
			this.rowCount = this.columnArray[0].columnValue.value.rowCount;
		}
		if (saved.Filter) {
			this.filterFormula.formula = saved.Filter.Formula;
		}
	}

	/**
	 * @method initFromTableValue
	 * @param {MMTableValue} tableValue 
	 */
	initFromTableValue(tableValue) {
		const nColumns = tableValue.columnCount;
		this.rowCount = tableValue.rowCount;
		for (let i = 0; i < nColumns; i++) {
			const valueColumn = tableValue.columns[i];
			const value = valueColumn.value ? valueColumn.value.copyOf() : null;
			const dataColumn = new MMDataTableColumn(this, {
				name: valueColumn.name,
				value: value,
				displayUnit: valueColumn.displayUnit,
				format: valueColumn.format,
			});
			this.columnArray.push(dataColumn);
		}
	}

	/**
	 * @method toolViewInfo
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	async toolViewInfo(command) {
		await super.toolViewInfo(command);
		let results = command.results;
		const value = this.tableValue().jsonValue();

		const nc = this.columnArray.length;
		for (let i = 0; i < nc; i++) {
			const column = this.columnArray[i];
			const v = value.v[i];
			v.defaultValue = column.defaultFormula.formula;
			const columnValue = column.columnValue;
			if (columnValue.isString) {
				v.unitType = 'String';
			}
			else if (column.columnValue.displayUnit) {
				v.unitType = theMMSession.unitSystem.typeNameForUnitNamed(column.columnValue.displayUnit.name);
			}
			v.format = column.format;
			if (column.isCalculated) {
				v.isCalculated = true;
			}
			if (column.isMenu) {
				if (!column._menu) {
					column._menuLookup = {}
					if (column.defaultFormula.formula) {
						const menuValue = column.defaultFormula.value();
						if (menuValue) {
							column._menu = {selections: [], values: []};
							if (menuValue.rowCount > 1 && menuValue.columnCount > 1) {
								for (let i = 1; i <= menuValue.rowCount; i++) {
									const si = menuValue.valueAtRowColumn(i, 1);
									const vi = menuValue.valueAtRowColumn(i,2)
									column._menu.selections.push(si);
									column._menu.values.push(vi);
									column._menuLookup[vi] = si;
								}
							}
							else {
								for (let i = 0; i < menuValue.valueCount; i++) {
									const vi = menuValue.valueAtCount(i);
									column._menu.selections.push(vi);
									column._menu.values.push(vi);
									column._menuLookup[vi] = vi;
								}
							}
						}
					}
					else {
						column._menu = {selections: ['?'], values: ['?']};
						column._menuLookup['?'] = '?';
					}					
				}
				v.menu = column._menu;
				const newV = [];
				for (let i = 0; i < v.v.nr; i++) {
					newV.push(column._menuLookup[v.v.v[i]]);
				}
				v.v.v = newV
			}
		}

		const displayRows = this.displayRows;
		value.filter = this.filterFormula.formula;
		if (displayRows) {
			// filter out all but rows to display
			const nRows = displayRows.length;
			value.allNr = value.nr;
			value.nr = nRows;
			for (const column of value.v) {
				column.v.nr = nRows;
				const newV = [];
				const rowN = []; // reports the real row numbers
				for (const row of displayRows) {
					newV.push(column.v.v[row - 1]);
					rowN.push(row);
				}
				column.v.v = newV;
				column.v.rowN = rowN;
			}
		}
		results['value'] = value;
	}

	/**
	 * @method tableValue
	 * @returns MMTableValue 
	 */
	tableValue() {
		const values = []
		for (const column of this.columnArray) {
			values.push(column.columnValue);
		}
		return new MMTableValue({columns: values});
	}

	/**
	 * @override valueDescribedBy
	 * @param {String} description
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueDescribedBy(description, requestor) {
		let value;
		if (description) {
			const lcDescription = description.toLowerCase();
			switch (lcDescription) {
				case 'nrows':
					value = MMNumberValue.scalarValue(this.rowCount);
					break;
				case 'ncols':
					value = MMNumberValue.scalarValue(this.columnCount);
					break;
				case 'table':
				case '':
					value = this.tableValue();
					break;
				default: {
					const parts = description.split('.');
					const toolName = parts[0].toLowerCase();
					const column = this.childNamed(toolName);
					if (column) {
						value = column.columnValue;
						if (value) {
							value = value.value;
						}
					}

					if (!value) {
						value = super.valueDescribedBy(description, requestor);
					}
				}
					break;
			}
		}
		else {
			value = this.tableValue();			
		}
		if (value) {
			this.addRequestor(requestor);
		}
		return value;
	}

	/**
	 * @method inputSources
	 * @override
	 * @returns {Set} contains tools referenced by this tool
	 */
	inputSources() {
		let sources = super.inputSources();
		this.filterFormula.addInputSourcesToSet(sources);
		for (let column of this.columnArray) {
			if (column.defaultFormula) {
				column.defaultFormula.addInputSourcesToSet(sources);
			}
		}			
		return sources;
	}
	
	/**
	 * @override forgetCalculated
	 */
	forgetCalculated() {
		if (!this.forgetRecursionBlockIsOn) {
			this.forgetRecursionBlockIsOn = true;
			for (let requestor of this.valueRequestors) {
				requestor.forgetCalculated();
			}
			this.valueRequestors.clear();
			for (let column of this.columnArray) {
				column.forgetCalculated();
			}
			this._displayRows = null;
			super.forgetCalculated();
			this.forgetRecursionBlockIsOn = false;
		}
	}

}
