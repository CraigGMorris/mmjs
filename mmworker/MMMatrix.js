'use strict';

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
 * @class MatrixInputValue
 */
class MatrixInputValue {
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
		if (this.state = MatrixValueState.formula) {
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
				if (!MMUnitSystem.areDimensionsEqual(unit.dimensions, owner.displayUnit ? owner.displayUnit.dimensions : null)) {
					if (this.row === 0 && this.column === 0) {
						// the * cell - use its units
						owner.displayUnit = unit;
					}
					else {
						this.value = 0.0;
						this.state = MatrixValueState.error;
						throw(owner.t('mmcmd:matrixWrongUnitType', {path: owner.getPath(), input: inputString}))
					}
				}
				this.value = unit.convertToBase(value);
				return;
			}
		}

		// determine if number or formula
		// use Number(value) so extra charaters after a number will yield NaN
		let value = Number(inputString);
		if (!isNaN(value)) {
			if (owner.displayUnit) {
				this.value = owner.displayUnit.convertToBase(value);
				inputString = `${inputString} ${owner.displayUnit.name}`;
			}
			else {
				this.value = value;
			}
			this.state = MatrixValueState.string;
			this._input = inputString;
			return;
		}

		// wasn't number, so assume formula
		const formula = new MMFormula(`f_${this.row}_${this.column}`, owner);
		formula.formula = inputString;
		this._input = formula;
		this.state = MatrixValueState.formula;
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

				const dimensions = owner.displayUnit ? owner.displayUnit.dimensions : null;
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
		const dimensions = owner.displayUnit ? owner.displayUnit.dimensions : null;
		return MMNumberValue.scalarValue(this.value, dimensions);
	}

	/**
	 * @method floatValue
	 * @param {MMMatrix} owner 
	 */
	floatValue(owner) {
		switch (this.state) {
			case MatrixValueState.formula:
				const value = this.numberValue(owner);
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
class MMMatrix extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Matrix');
		this.cellInputs = {};
		this.value = null;
		this.displayUnit = null;
		this.calculatedRowCount = 1;
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
			setcell: 'mmcmd:?matrixSetCell',
			setrowcount: 'mmcmd:?matrixSetRowCount',
			setcolumncount: 'mmcmd:?matrixSetColumnCount',
			value: 'mmcmd:?toolValue'
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
		d['displayUnitName'] = {type: PropertyType.string, readOnly: false};
		return d;
	}

	get displayUnitName() {
		return (this.displayUnit) ? this.displayUnit.name : null;
	}

	set displayUnitName(unitName) {
		if (!unitName) {
			this.displayUnit = null;
		}
		else {
			const unit = theMMSession.unitSystem.unitNamed(unitName);
			if (!unit) {
				throw(this.t('mmunit:unknownUnit', {name: unitName}));
			}
			this.displayUnit = unit;
		}
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
		return p;
	}

	/**
	 * @method toolViewInfo
	 * @override
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	toolViewInfo(command) {
		super.toolViewInfo(command);
		let results = command.results;
		results['rowCountFormula'] = this.rowCountFormula.formula;
		results['columnCountFormula'] = this.columnCountFormula.formula;
		results['rowCount'] = this.rowCount;
		results['columnCount'] = this.columnCount;
		if (!this.value && !this.isCalculating) {
			this.calculateValue();
		}
		if (this.value) {
			results['value'] = this.jsonValue(this.displayUnit);
		}

		const cellInputs = {};
		for (let key in this.cellInputs) {
			const cellInput = this.cellInputs[key];
			cellInputs[key] = {
				input: cellInput.input,
				state: cellInput.state
			}
		}
		results['cellInputs'] = cellInputs;
	}

	jsonValue() {
		if (!this.value && !this.isCalculating) {
			this.calculateValue();
		}
		let json = {}
		if (this.value) {
			json = this.value.jsonValue(this.displayUnit);
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
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o =   super.saveObject();
		o['Type'] = 'Matrix';
		if (this.displayUnit) {
			o['unit'] = this.displayUnit.name;
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
				this.displayUnit = theMMSession.unitSystem.unitNamed(unitName);
			}
		}
		catch(e) {
			this.caughtException(e);
			this.displayUnit = null;
		}

		if (saved.CellInputs) {
			for (let key in saved.CellInputs) {
				const parts = key.split('_');
				const row = Number(parts[0]);
				const column = Number(parts[1]);
				this.setCellInput(row, column, saved.CellInputs[key]);
			}
		}

		this.rowCountFormula.formula = saved.rowCount;
		this.columnCountFormula.formula = saved.columnCount;
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
//					throw(this.t('mmcmd:matrixRowCountHasUnit', {formula: this.rowCountFormula.formula}));
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
				const value = countValue.valueAtRowColumn(1, 1);
				if ( value > 0 )
					this.calculatedColumnCount = value;
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
		const indicesMatch = command.args.match(/^\d+\s+\d+\s+/);
		if (indicesMatch) {
			const parts = indicesMatch[0].split(/\s+/,2);
			if (parts.length >= 2) {
				const row = Number(parts[0]);
				const column = Number(parts[1]);
				if (isNaN(row) || isNaN(column)) {
					throwError();
				}

				const inputString = command.args.substring(indicesMatch[0].length);
				this.setCellInput(row, column, inputString);
			}
			else {
				throwError();
			}
		}
		else {
			throwError();
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
				inputValue = new MatrixInputValue(row, column);
				this.cellInputs[key] = inputValue;
			}
			if (inputValue.state === MatrixValueState.error || inputValue.input !== inputString) {
				inputValue.setInput(inputString, this);
				if (row === 0 && column === 0) {
					// default cell may have changed matrix units - reset all inputs to clear errors
					for (const key in this.cellInputs) {
						const v = this.cellInputs[key];
						v.resetInput(v.input, this);
					}
				}
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
			const dimensions = this.displayUnit ? this.displayUnit.dimensions : null;
			this.value = new MMNumberValue(rowCount, columnCount, dimensions);
			this.knowns = [];

			for (let row = 1; row <= rowCount; row++) {
				for (let column = 1; column <= columnCount; column++) {
					let offset = this.value.offsetFor(row, column);
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
			return this.value.numberValueAtRowColumn(row, column);
		}

		if (!this.rowCount || !this.columnCount) {
			return null;
		}

		if (row < 1 || row > this.rowCount || column < 1 || column > this.columnCount) {
			return null;
		}

		if (this.recursionCount > (this.rowCount + this.columnCount)) {
			this.setWarning('mmcmd:matrixNestingError', {path: this.getPath()});
			return null;
		}

		const offset = this.value.offsetFor(row, column);
		if (this.knowns[offset]) {
			return this.value.numberValueAtRowColumn(row, column);
		}

		this.recursionCount++;
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

		const rv = inputValue.numberValue(this);
		this.recursionCount--;
		return rv;
	}

	/**
	 * @method numberValueAtOffsets
	 * @return {MMNumberValue} - value at offset from current cell
	 * @param {Number} rowOffset
	 * @param {Number} columnOffset 
	 */
	numberValueAtOffsets(rowOffset, columnOffset) {
		return this.numberValue(this.currentRow + rowOffset, this.currentColumn + columnOffset);
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
			return null;
		}

		if (this.isCalculating) {
			rv = getCellValue(lcDescription);
			if (rv) {
				this.addRequestor(requestor);
			}
			return rv;
		}
		else if (!this.value) {
			this.calculateValue();
			if (!this.value) {
				return null;
			}
		}

		if (!lcDescription) {
			rv = this.value;
		}
		else if (lcDescription === 'table') {
			const a = [];
			for (let column = 1; column <= this.calculatedColumnCount; column++) {
				const columnValue = new MMNumberValue(this.calculatedRowCount, 1, this.value.unitDimensions);
				for (let row = 1; row <= this.calculatedRowCount; row++) {
					columnValue.setValue(this.value.valueAtRowColumn(row, column), row, 1);
				}
				const columnName = `${column}`;
				const tableColumn = new MMTableValueColumn({
					name:`${column}`,
					displayUnit: this.displayUnit,
					value: columnValue
				});
				a.push(tableColumn);
			}
			rv = new MMTableValue({columns: a});
		}
		else {
			rv = getCellValue(lcDescription);
		}

		if (rv) {
			this.addRequestor(requestor)
		}
		return rv;
	}
}
