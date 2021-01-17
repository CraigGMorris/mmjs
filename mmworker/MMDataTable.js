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
	MMCommandObject: readonly
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
 * @extends MMCommandObject
 */
class MMDataTableColumn extends MMCommandObject {
	/**
	 * @constructor
	 * @param {MMDataTable} table - owner
	 * @param {String} name
	 * @param {String} displayUnit - can be a string or a unit
	 * if omitted, Fraction is assumed
	 * if "string" then the column holds string values
	 * this type cannot be later changed, although if can be changed to another unit of the same type
	 */
	constructor(table, name, displayUnit) {
		super(name, table, 'MMDataTableColumn');
		const displayUnitName = displayUnit instanceof MMUnit ? displayUnit.name : displayUnit;
		this.columnValue = new MMTableValueColumn({
			name: name,
			displayUnit: displayUnitName,
		});
		if (this.columnValue.isString) {
			this.defaultValue = '';
		}
		else {
			this.defaultValue = `0 ${this.columnValue.displayUnit.name}`;
		}
	}

	get properties() {
		let d = super.properties;
		d['defaultValue'] = {type: MMPropertyType.string, readOnly: false};
		d['displayUnit'] = {type: MMPropertyType.string, readOnly: false};
		d['format'] = {type: MMPropertyType.string, readOnly: false};
		return d;
	}

	get defaultValue() {
		return this._defaultValue;
	}

	set defaultValue(newValue) {
		this._defaultValue = newValue;
	}

	get displayUnit() {
		return this.columnValue.displayUnit.name;
	}

	set displayUnit(unitName) {
		this.columnValue.displayUnit = unitName;
		this.parent.forgetCalculated();
	}

	get format() {
		return this._format;
	}

	set format(newValue) {
		this._format = newValue;
	}

	/**
	 * @method addRow
	 * @param {Number} rowNumber
	 */
	addRow(rowNumber) {
		this.parent.insertFormula.formula = this.defaultValue;
		const insertValue = this.parent.insertFormula.value();
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
		const o = this.columnValue.saveObject();
		o.defaultValue = this.defaultValue;
		if (this.format) {
			o.format = this.format;
		}
		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		this.defaultValue = saved.defaultValue;
		if (saved.format) {
			this.format = saved.format;
		}
		this.columnValue.initFromSaved(saved);
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
			verbs['removecolumn'] = this.removeColumnCommand;
			verbs['removerows'] = this.removeRowsCommand;
			verbs['restorecolumn'] = this.restoreColumnCommand;
			verbs['restorerows'] = this.restoreRowsCommand;
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
				// value: 'mmcmd:?toolValue'
				addcolumn: 			'mmcmd:?tableAddColumn',
				addrow:					'mmcmd:?tableAddRow',
				removecolumn: 	'mmcmd:?tableRemoveColumn',
				removerows:			'mmcmd:?tableRemoveRows',
				restorecolumn:	'mmcmd?tableRestoreColumn',
				restorerows:		'mmcmd?tableRestoreRows',
				setcell:				'mmcmd:?tableSetCell',
				movecolumn:			'mmcmd:?tableMoveColumn',
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
	 * displayUnit: this unit also determines the column type - Fraction is assumed
	 * 		- use "string" for a string column
	 * 		- this type cannot be later changed, although if can be changed to another unit of the same type
	 * defaultValue: a string containing a formula to be used as the initial value for new rows
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
		if (options.defaultValue) {
			this.insertFormula.formula = options.defaultValue;
			insertValue = this.insertFormula.value();
		}

		let displayUnit = options.displayUnit;
		if ((!displayUnit || !displayUnit.length) && insertValue instanceof MMNumberValue) {
			displayUnit = theMMSession.unitSystem.baseUnitWithDimensions(insertValue.unitDimensions);
		}

		const column = new MMDataTableColumn(this, options.name, displayUnit);
		column.defaultValue = options.defaultValue;
		column.format = options.format;
		if (options.columnNumber && options.columnNumber <= this.columnCount && options.columnNumber > 0) {
			this.columnArray.splice(options.columnNumber - 1, 0, column);
		}
		else {
			this.columnArray.push(column);
		}

		if (this.rowCount) {
			let v;
			if (insertValue instanceof MMStringValue || options.displayUnit === 'string') {
				v = new MMStringValue(this.rowCount, 1);
				insertValue = insertValue ? insertValue.values[0] : ''
				for (let i = 0; i < this.rowCount; i++ ) {
					v.values[i] = insertValue;
				}
			}
			else {
				v = new MMNumberValue(this.rowCount, 1, column.columnValue.value.unitDimensions);
				insertValue = insertValue ? insertValue.values[0] : 0.0;
				for (let i = 0; i < this.rowCount; i++ ) {
					v.values[i] = insertValue;
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
			command.undo = `${this.getPath()} removecolumn ${column.name}}`;
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

		if (options.defaultValue && options.defaultValue !== column.defaultValue) {
			undoOptions.defaultValue = column.defaultValue || '';
			column.defaultValue = options.defaultValue;
		}

		if (options.format && options.format !== column.formant) {
			undoOptions.format = column.format || '';
			column.format = options.format;
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
				command.undo = `__blob__${this.getPath()} updatecolumn__blob__${undoString}`;
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
			command.undo = `__blob__${this.getPath()} restorecolumn ${columnNumber+1}__blob__${columnJson}`;
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
		if (!displayUnit && saved.unitDimensions) {
			const dimensions = MMUnit.dimensionsFromString(saved.unitDimensions);
			displayUnit = theMMSession.unitSystem.defaultUnitWithDimensions(dimensions);
			if (displayUnit) {
				displayUnit = displayUnit.name;
			}
		}
		const column = new MMDataTableColumn(this, saved.name, displayUnit);
		column.initFromSaved(saved);
		this.columnArray.splice(columnNumber - 1, 0, column);
	}

	/**
	 * @method restoreColumnCommand
	 * @param {MMCommand} command
	 * command.args should be the the row number followed by the undo json
	 * in the form __blob__/.x restorecolumn 1__blob__ followed by the json text
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
			this.setError('mmcmd:?tableMoveColumn', {path: this.getPath(), name: name});
			return;
		}
		const fromNumber = parseInt(parts[0]);
		const toNumber = parseInt(parts[1]);
		this.moveColumn(fromNumber, toNumber);
		command.undo = `${this.getPath()} movecolumn ${fromNumber} ${toNumber}`;
	}

	/**
	 * @method addRow
	 * @param {Number} rowNumber
	 * @returns {Number} - the actual number of the row added or -1 if failed
	 */
	addRow(rowNumber) {
		let successCount = 0;
		let error;
		for (let column of this.columnArray) {
			try {
				column.addRow(rowNumber);
			} catch(e) {
				error = e;
				break;
			}
			if (column.columnValue.rowCount !== this.rowCount + 1) {
				break;
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
		const rowNumber = this.addRow(command.args ? parseInt(command.args) : 0);
		if (rowNumber > 0) {
			command.undo = `${this.getPath()} removerows ${rowNumber}}`;
		}
		command.results = {rowNumber: rowNumber};
	}

	/**
	 * @method removeRows
	 * @param {Array} rowNumbers
	 * @returns {Object} - old inputs for undo keyed by row number - empty if fails
	 */
	removeRows(rowNumbers) {
		const oldInputs = {};
		rowNumbers.sort((a,b) => a - b).reverse();
		for (let rowNumber of rowNumbers) {
			if (rowNumber > 0 && rowNumber <= this.rowCount) {
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
	removeRowsCommand(command) {
		const argParts = command.args.split(/\s/);
		const rowNumbers = argParts.map(arg => {
			const n = parseInt(arg);
			return isNaN(n) ? 0 : n;
		})
		const oldInputs = this.removeRows(rowNumbers);
		if (Object.keys(oldInputs).length) {
			const inputsJson = JSON.stringify(oldInputs);
			command.undo = `__blob__${this.getPath()} restorerows__blob__${inputsJson}`;
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
		command.undo = `${this.getPath()} removerows ${rowNumbers.join(' ')}`;
	}

	/**
	 * @method setCellCommand
	 * @param {MMCommand} command
	 * command.args should have the the rowNumber columnNumber input
	 */
	setCellCommand(command) {
		const indicesMatch = command.args.match(/^\d+\s+\d+\s+/);
		if (indicesMatch) {
			const parts = indicesMatch[0].split(/\s+/,2);
			if (parts.length >= 2) {
				const rowNumber = Number(parts[0]);
				const columnNumber = Number(parts[1]);
				if (
					isNaN(rowNumber) || isNaN(columnNumber) || 
					rowNumber < 1 || rowNumber > this.rowCount || 
					columnNumber < 1 ||  columnNumber > this.columnArray.length
				) {
					throw(this.t('mmcmd:tableRowColumnError', { path: this.getPath(), args: command.args }));
				}

				const input = command.args.substring(indicesMatch[0].length);
				const column = this.columnArray[columnNumber - 1];
				const oldInput = column.stringForRowWithUnit(rowNumber);
				column.setCell(rowNumber, input);
				command.undo = `${this.getPath()} setcell ${rowNumber} ${columnNumber} ${oldInput}`;
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
		o
		o['Columns'] = this.columnArray.map(col => col.saveObject());
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
			this.restoreColumn(i, columns[i - 1]);
		}
		if (this.columnArray.length) {
			this.rowCount = this.columnArray[0].columnValue.value.rowCount;
		}
	}

	/** @method initFromCsv
	 * @param {String} csv - with three definition lines at top
	 * table en   where en is language code
	 * "name1","name2" ... column names
	 * "Fraction","Fraction" ... column display units
	 */
	initFromCsv(csv) {
		let i = 0;
		let line;
		let re = new RegExp('.*?\\n');
		const getLine = (i, re) => {
			let match = csv.substring(i).match(re);
			if (!match) {
				this.setError('mmcmd:tableBadCsvHeader', {path: this.getPath()});
				return [null, null];
			}
			let line = match[0];
			i += match.index + line.length;
			return [i, line];
		}
		[i, line] = getLine(i, re);
		if (!line) { return; }
		let csvSeparator = ',';
		let locale = 'en';
		if (line.length >= 7) {
			csvSeparator = line[5];
			locale = line.substring(6).trim();
		}
		let n = 1.1;
		const decimalSeparator = n.toLocaleString(locale).substring(1,2);

		[i, line] = getLine(i, re);
		if (!line) {return;}
		const columnNames = line.trim().split(csvSeparator);

		[i, line] = getLine(i, re);
		if (!line) {return;}
		const unitNames = line.trim().split(csvSeparator);

		if (unitNames.length !== columnNames.length) {
			this.setError('mmcmd:tableCsvColumnCountsDiffer', {path: this.getPath()});
			return;
		}

		const columns = this.columnArray;
		const columnData = [];
		const csvColumnCount = columnNames.length;
		const uniqueNames = new Set();
		const includeColumn = [];
		if (csvColumnCount === 0) {return;}
		for (let i = 0; i < csvColumnCount; i++) {
			let columnName = columnNames[i];
			columnName = columnName.substring(1,columnName.length -1);  // strip off the quotes
			let unitName = unitNames[i];
			unitName = unitName.substring(1,unitName.length -1);  // strip off the quotes
			if (!uniqueNames.has(columnName)) {
				const column = new MMDataTableColumn(this, columnName, unitName);
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

		re = new RegExp('".*?"|[^,"\\n]+','ms');
		let match = csv.substring(i).match(re);
		let columnNumber = 0;
		let csvColumnNumber = 0;
		while (match) {
			let token = match[0];
			i += match.index + token.length;
			if (includeColumn[csvColumnNumber]) {
				const column = columns[columnNumber];

				if (column.columnValue.isString) {
					if (!token.startsWith('"')) {
						this.setError('mmcmd:tableCsvExpectedString', {
							path: this.getPath(),
							token: token,
							column: columnNumber+1,
							row: columnData[columnNumber].length + 1
						});
						return;
					}
					token = token.substring(1,token.length - 1); // strip quotes
					columnData[columnNumber].push(token);
				}
				else {
					if (token.startsWith('"')) {
						this.setError('mmcmd:tableCsvUnexpectedString', {
							path: this.getPath(),
							token: token,
							column: columnNumber+1,
							row: columnData[columnNumber].length + 1
						});
						return;
					}
					token = token.replace(decimalSeparator, '.');
					columnData[columnNumber].push(token);
				}
				columnNumber = (columnNumber + 1) % columnCount;
			}
			csvColumnNumber = (csvColumnNumber + 1) % csvColumnCount;
			match = csv.substring(i).match(re);
		}

		const rowCount = columnData[0].length;
		for (let i = 1; i < columnCount; i++) {
			if (columnData[i].length !== rowCount) {
				this.setError('mmcmd:tableCsvRowCountsDiffer', {path: this.getPath()});
				return;
			}
		}
		for (let i = 0; i < columnCount; i++) {
			columns[i].columnValue.updateFromStringArray(columnData[i]);
		}
		console.log('made it');
	}

	/**
	 * @method toolViewInfo
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	toolViewInfo(command) {
		super.toolViewInfo(command);
		let results = command.results;
		const value = this.tableValue().jsonValue();
		const nc = this.columnArray.length;
		for (let i = 0; i < nc; i++) {
			const column = this.columnArray[i];
			const v = value.v[i];
			v.defaultValue = column.defaultValue;
			const columnValue = column.columnValue;
			if (columnValue.isString) {
				v.unitType = 'String';
			}
			else if (column.columnValue.displayUnit) {
				v.unitType = theMMSession.unitSystem.typeNameForUnitNamed(column.columnValue.displayUnit.name);
			}
			if (column.format) {
				v.format = column.format;
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
		// const tableValue = () => {
		// 	const values = []
		// 	for (const column of this.columnArray) {
		// 		values.push(column.columnValue);
		// 	}
		// 	return new MMTableValue({columns: values});
		// }

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
	 * @override forgetCalculated
	 */
	forgetCalculated() {
		if (!this.forgetRecursionBlockIsOn) {
			this.forgetRecursionBlockIsOn = true;
			for (let requestor of this.valueRequestors) {
				requestor.forgetCalculated();
			}
			this.valueRequestors.clear();
			super.forgetCalculated();
			this.forgetRecursionBlockIsOn = false;
		}
	}

}
