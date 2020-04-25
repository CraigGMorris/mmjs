'use strict';
/* global
	MMCommandObject: readonly
	MMTool:readonly
	MMTableValueColumn:readonly
	MMTableValue:readonly
	MMNumberValue:readonly
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
		this.columnDictionary = {};
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
	 * @method addColumn
	 * @param {String} displayUnit - can be a string or a unit
	 * if omitted, Fraction is assumed
	 * if "string" then the column holds string values
	 * this type cannot be later changed, although if can be changed to another unit of the same type
	 * @param {String} name - should be valid for use in formula
	 * @returns {MMDataTableColumn}
	 */
	addColumn(displayUnit, name) {
		if (!name) {
			const n = this.columnArray.length + 1;
			name = `Field_${n}`;
		}
		const column = new MMDataTableColumn(this, name, displayUnit);
		this.columnArray.push(column);

		if (this.rowCount) {
			const v = new MMNumberValue(this.rowCount, 1, column.columnValue.value.unitDimensions);
			for (let i = 0; i < this.rowCount; i++ ) {
				v.values[i] = 0.0;
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
	 * command.args have should have a display unit and a column name
	 * if display unit is omitted, Fraction is assumed
	 * if display unit is "string" then the column holds string values
	 * this type cannot be later changed, although if can be changed to another unit of the same type
	 * if name is omitted, one will be fabricated
	 * command.results is set to the generated column name
	 */
	addColumnCommand(command) {
		const parts = command.args.split(/\s/);
		let name, displayUnit;
		if (parts.length > 1) {
			name = parts[1];
		}
		if (parts.length > 0) {
			displayUnit = parts[0];
		}
		const column = this.addColumn(displayUnit, name);
		command.results = column.name;
		command.undo = `${this.getPath()} removecolumn ${column.name}}`;
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
		const displayUnit = saved.sValues ? 'string' : saved.displayUnitl
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
		for (let column of this.columnArray) {
			column.addRow(rowNumber);
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
			for (let i = 0; i < successCount; i++) {
				const column = this.columnArray[i];
				column.RowNumber(rowNumber);
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
			else {
				v.unitType = theMMSession.unitSystem.typeNameForUnitNamed(column.columnValue.displayUnit.name);
			}
			if (column.format) {
				v.format = column.format;
			}
		}
		// results['defaultValues'] = this.columnArray.map( column => column.defaultValue );
		// results['unitTypes'] = this.columnArray.map(column => {
		// 	const columnValue = column.columnValue;
		// 	if (columnValue.isString) {
		// 		return 'String';
		// 	}
		// 	else {
		// 		return theMMSession.unitSystem.typeNameForUnitNamed(column.columnValue.displayUnit.name);
		// 	}
		// });
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
				case 'nrow':
					value = MMNumberValue.scalarValue(this.rowCount);
					break;
				case 'ncol':
					value = MMNumberValue.scalarValue(this.columnCount);
					break;
				case 'table':
				case '':
					value = this.tableValue();
					break;
				default:
					value = super.valueDescribedBy(description, requestor);
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
