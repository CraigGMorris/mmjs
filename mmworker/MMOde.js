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
	MMTool:readonly
	MMFormula:readonly
	MMPropertyType:readonly
	MMNumberValue:readonly
	MMNumberValue:readonly
	MMUnitSystem:readonly
	MMUnit:readonly
	MMUnitDimensionType:readonly
	MMTableValue:readonly
	MMTableValueColumn:readonly
	MMDivideOperator:readonly
	MMMultiplyOperator: readonly
	MMMath: readonly
	theMMSession: readonly
*/

/**
 * @class MMOde
 * @extends MMTool
 */
// eslint-disable-next-line no-unused-vars
class MMOde extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Ode');
		this.odeT = MMNumberValue.scalarValue(0); // this is just t in user interface, but t is already used by MMObject
		this.initialYFormula = new MMFormula('y0', this);
		this.derivativeFormula = new MMFormula('dy', this);
		this.nextTFormula = new MMFormula('nextT', this);
		this.nextTFormula.formula = '$.t + 1 * {baseunit $.t}';
		this.endTFormula = new MMFormula('endT', this);
		this.endTFormula.formula = '10';
		this.relTolFormula = new MMFormula('relTol', this);
		this.relTolFormula.formula = '1e-5';
		this.absTolFormula = new MMFormula('absTol', this);
		this.absTolFormula.formula = '1.0e-10*{baseunit $.y}';
		this.recordedValueFormulas = [];
		this.lastRecordedFormula = 1;		// used for naming recorded value formulas
		this.recordedValues = [];
		this.isHidingInfo = false;  // needed because the formula assigns will reset
		this.nextRecordNumber = 0;
		this._isStiff = false;
		this._shouldAutoRun = true;
		this.isSolving = false;
		this.isInError = false;
		this.isSolved = false;
		this.cachedY = null;
		this.relTol = null;
		this.absTol = null;
		this.yUnits = null;
		
		this.numberOfEquations = 0;
	}

	/**
	 * @method inputSources
	 * @override
	 * @returns {Set} contains tools referenced by this tool
	 */
	inputSources() {
		let sources = super.inputSources();
		this.initialYFormula.addInputSourcesToSet(sources);
		this.derivativeFormula.addInputSourcesToSet(sources);
		this.nextTFormula.addInputSourcesToSet(sources);
		this.endTFormula.addInputSourcesToSet(sources);
		this.relTolFormula.addInputSourcesToSet(sources);
		this.absTolFormula.addInputSourcesToSet(sources);
	
		for (let formula of this.recordedValueFormulas) {
			formula.addInputSourcesToSet(sources);
		}
		
		return sources;
	}

	/**
	 * @method toolViewInfo
	 * @override
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	async toolViewInfo(command) {
		await super.toolViewInfo(command);
		const results = command.results;
		results.isStiff = this.isStiff;
		results.shouldAutoRun = this.shouldAutoRun;

		const fReturn = (formula) => {
			const v = formula.value();
			const vString = v ? v.stringWithUnit() : '';
			return [formula.name, formula.formula, vString];
		}
		const formulas = [];
		formulas.push(fReturn(this.initialYFormula));
		formulas.push(fReturn(this.derivativeFormula));
		formulas.push(fReturn(this.nextTFormula));
		formulas.push(fReturn(this.endTFormula));
		formulas.push(fReturn(this.relTolFormula));
		formulas.push(fReturn(this.absTolFormula));
		for (let rv of this.recordedValueFormulas) {
			formulas.push(fReturn(rv));
		}
		results.t = this.odeT.values[0];
		results.tunit = this.odeT.defaultUnit.name;

		results.formulas = formulas;
	}

	/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o = super.saveObject();
		o['Type'] = 'ODE Solver';
		o['y0Formula'] = {Formula: this.initialYFormula.formula}
		o['dyFormula'] = {Formula: this.derivativeFormula.formula}
		o['nextTFormula'] = {Formula: this.nextTFormula.formula}
		o['endTFormula'] = {Formula: this.endTFormula.formula}
		o['relTolFormula'] = {Formula: this.relTolFormula.formula}
		o['absTolFormula'] = {Formula: this.absTolFormula.formula}

		o['recFormulas'] = this.recordedValueFormulas.map(f => {
			return {Formula: f.formula}
		});

		if (this._isStiff) { o['Stiff'] = 'y '; }
		if (this._shouldAutoRun) {
			o['AutoRun'] = 'y';
		}
		else {
			if (this.odeT && this.cachedY) {
				o['T'] = this.odeT.values[0];
				o['tUnit'] = MMUnit.stringFromDimensions(this.odeT.unitDimensions);
				const count = this.cachedY ? this.cachedY.valueCount : 0;
				const a = [];
				for (let i = 0; i < count; i++) {
					let x = this.cachedY.values[i];
					if (isNaN(x)) { x = 0; }
					a.push(x);
				}
				o['cachedYs'] = a;
				const columnCount = this.cachedY ? this.cachedY.columnCount : 0;
				o['nColumns'] = columnCount;

				if (this.yUnits) {
					o['ytunits'] = this.yUnits.columns.map(column => {
						return column.saveObject();
					})
				}
				else {
					o['yunits'] = MMUnit.stringFromDimensions(this.cachedY.unitDimensions);
				}
				if (this.isSolved) {
					o['solved'] = 'y';
				}
			}
		}
		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		this.isLoadingCase = true;
		try {
			super.initFromSaved(saved);
			this.initialYFormula.formula = saved.y0Formula.Formula;
			this.derivativeFormula.formula = saved.dyFormula.Formula;
			this.nextTFormula.formula = saved.nextTFormula.Formula;
			this.endTFormula.formula = saved.endTFormula.Formula;
			this.relTolFormula.formula = saved.relTolFormula.Formula;
			this.absTolFormula.formula = saved.absTolFormula.Formula;

			const recordedFormulas = saved.recFormulas;
			if (recordedFormulas) {
				for (let recordedFormula of recordedFormulas) {
					const formula = this.addRecordedValue();
					formula.formula = recordedFormula.Formula;
				}
			}
			this._isStiff = saved.Stiff ? true : false;
			this._shouldAutoRun = saved.AutoRun ? true : false;
		
			const t = saved.T;
			if (typeof t === 'number') {
				this.odeT.values[0] = t;
				const parseDimensions = (s) => {
					if (s) {
						return s.split(' ').map(d => parseFloat(d));
					}
				}
				this.odeT = MMNumberValue.scalarValue(t, parseDimensions(saved.tUnit));
				const a = saved.cachedYs;
				if (a) {
					const count = a.length;
					const nColumns = saved.nColumns;
					const columnCount = nColumns ? parseInt(nColumns) : 1;
					const rowCount = count / columnCount;
					if (saved.yunits) {
						// the saved Ys all have the same units and yUnits remains null
						this.cachedY = new MMNumberValue(rowCount,  columnCount, parseDimensions(saved.yunits));
						this.cachedY._values = Float64Array.from(a);
					}
					else {
						// y units are different and stored in table this.yUnits
						this.cachedY = new MMNumberValue(rowCount,  columnCount);
						this.cachedY._values = Float64Array.from(a);
						const ytunits = saved.ytunits;
						if (ytunits) {
							const columns = [];
							for (let savedColumn of ytunits) {
								const dimensions = parseDimensions(savedColumn.unitDimensions);
								const displayUnitName = dimensions ?
									theMMSession.unitSystem.defaultUnitWithDimensions(dimensions).name :
									'Fraction';
								columns.push(new MMTableValueColumn({
									name: savedColumn.name,
									displayUnit: displayUnitName,
									value: MMNumberValue.scalarValue(1, dimensions)
								}));
							}
							this.yUnits = new MMTableValue({columns: columns});
						}
					}
				}

				if (!this._shouldAutoRun && saved.solved) {
					this.isSolved = true;
				}
			}
		}
		finally {
			this.isLoadingCase = false;
		}
	}

	/** @override */
	get properties() {
		let d = super.properties;
		d['isStiff'] = {type: MMPropertyType.boolean, readOnly: false};
		d['shouldAutoRun'] = {type: MMPropertyType.boolean, readOnly: false};
		return d;
	}
	
	get isStiff() {
		return this._isStiff;
	}

	set isStiff(newValue) {
		this._isStiff = (newValue) ? true : false;
	}

	get shouldAutoRun() {
		return this._shouldAutoRun;
	}

	set shouldAutoRun(newValue) {
		this._shouldAutoRun = (newValue) ? true : false;
		if (newValue) {
			this.run();
		}
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['run'] = this.runCommand;
		verbs['reset'] = this.resetCommand;
		verbs['addrecorded'] = this.addRecordedCommand;
		verbs['removerecorded'] = this.removeRecordedCommand;
		verbs['restorerecorded'] = this.restoreRecordedCommand;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			run: 'mmcmd:_odeRun',
			reset: 'mmcmd:_odeReset',
			addrecorded: 'mmcmd:_odeAddRecorded',
			removerecorded: 'mmcmd:_odeRemoveRecorded',
			restorerecorded: 'mmcmd:_odeRestoreRecorded',
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
		p.push('solved');
		p.push('t');
		p.push('y');
		p.push('dy');
		p.push('y0');
		p.push('nextt');
		p.push('endt');
		p.push('abstol');
		p.push('reltol');
		p.push('i');
		p.push('table');
		for (let i = 1; i <= this.recordedValueFormulas.length; i++) {
			p.push(`r${i}`);
			const recordedName = this.columnNameForRecorded(i, true);
			if (recordedName) {
				p.push(recordedName);
			}
		}
		return p;
	}

	/**
	 * @method runCommand
	 * @param {MMCommand} command
	 */
	runCommand(command) {
		this.run();
		command.results = 'run complete';
	}

	/**
	 * @method resetCommand
	 * @param {MMCommand} command
	 */
	resetCommand(command) {
		this.reset();
		command.results = 'reset done';
	}
	
	/**
	 * @method addRecordedCommand
	 * @param {MMCommand} command
	 */
	addRecordedCommand(command) {
		this.addRecordedValue();
		command.results = 'added recorded';
	}

	/**
	 * @method removeRecordedCommand
	 * @param {MMCommand} command
	 */
	removeRecordedCommand(command) {
		const recNumber = parseInt(command.args);
		if (recNumber >= 1 && recNumber <= this.recordedValueFormulas.length) {
			const saveForUndo = {n: recNumber, f: this.recordedValueFormulas[recNumber - 1].formula};
			this.removeRecordedValue(recNumber);
			const undoString = JSON.stringify(saveForUndo);
			command.undo = `__blob__${this.getPath()} restorerecorded__blob__${undoString}`;
			command.results = 'removed recorded';
		}
		else {
			command.results = `No recorded value ${recNumber}`;
		}
	}

	/**
	 * @method restoreRecordedCommand
	 * @param {MMCommand} command
	 */
	restoreRecordedCommand(command) {
		const rec = JSON.parse(command.args);
		const nRec = rec.n;
		const formula = new MMFormula(`r${nRec}`, this);
		formula.formula = rec.f;
		this.recordedValueFormulas.splice(nRec - 1, 0, formula);
		this.recordedValues.splice(nRec - 1, 0, []);
		this.reset();
		command.results = `${name} restored`;
	}

	/**
	 * @method changedFormula
	 * @override
	 * @param {MMFormula} formula
	 */
	changedFormula(formula) {
		this.isSolved = false;
		if (this.shouldAutoRun) {
			super.changedFormula(formula);
		}
		super.changedFormula(formula);
	}

	/**
	 * @override forgetCalculated
	 */
	forgetCalculated() {
		if (!this.forgetRecursionBlockIsOn) {
			if (this.shouldAutoRun) {
				this.forgetStep();
				this.cachedY = null;
				this.odeT.values[0] = 0.0;
				this.resetRecordedValues();
				this.nextRecordNumber = 0;
				this.isSolved = false;
			}
		}
	}

	/**
	 * @method forgetStep
	 * forgets calculations for a calculation step
	 */
	forgetStep() {
		if (!this.forgetRecursionBlockIsOn) {
			try {
				this.forgetRecursionBlockIsOn = true;
				for (let requestor of this.valueRequestors) {
					if (requestor !== this) {
						requestor.forgetCalculated();
					}
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
	 * @method addRecordedValue
	 * @returns MMFormula
	 */
	addRecordedValue() {
		const formula = new MMFormula(`r${this.lastRecordedFormula++}`, this);
		formula.formula = '$.t';
		this.recordedValueFormulas.push(formula);
		this.recordedValues.push([]);
		if (!this.isLoadingCase) {
			this.reset();
		}
		return formula;
	}

	/**
	 * @method removeRecordValue
	 * @param {Number} n - the number to remove 
	 */
	removeRecordedValue(n) {
		if (n >= 1 && n <= this.recordedValueFormulas.length) {
			n--;
			this.recordedValueFormulas.splice(n,1);
			this.recordedValues.splice(n,1);
			this.reset();
		}
	}

	/**
	 * @method reset - resets to begining of run, discarding any calculations
	 */
	reset() {
		this.cachedY = null;
		this.resetRecordedValues();

		// make sure units of T are the same as endT
		const endT = this.endTFormula.numberValue();
		if (endT && !MMUnitSystem.areDimensionsEqual(endT.unitDimensions, this.odeT.unitDimensions)) {
			this.odeT = endT.copyOf();
		}
		this.odeT.setValue(0,1,1);
		this.nextRecordNumber = 0;
		this.isSolved = false;
		this.cachedY = null;
		this.forgetStep();
	}

	/**
	 * @method resetRecordedValues
	 */
	resetRecordedValues() {
		const count = this.recordedValues.length;
		this.recordedValues = [];
		for (let i = 0; i < count; i++) {
			this.recordedValues.push([]);
		}
	}

	/**
	 * @method run
	 */
	run() {
		if (this.canRun()) {
			this.resetRecordedValues();
			this.solve();
		}
	}

	/**
	 * @method recordCurrentValues
	 * @returns {boolean} - true if values can be calculated
	 */
	recordCurrentValues() {
		const count = this.recordedValueFormulas.length;
		for (let i = 0; i < count; i++) {
			const formula = this.recordedValueFormulas[i];
			const recValue = formula.value();
			if (recValue instanceof MMTableValue) {
				this.setError('mmcmd:recordTableError', {number: i + 1, path: this.getPath()});
				return false;
			}
			const a = this.recordedValues[i];
			if (recValue) {
				a.push(recValue.copyOf());
			}
			else {
				this.setError('mmcmd:recordValueError', {number: i + 1, path: this.getPath()});
				return false;
			}
		}
		return true;
	}

	/**
	 * @method valueForRecorded
	 * @param {Number} rNumber - the record value number
	 * @returns {MMNumberValue} - the recorded values for rNumber
	 */
	valueForRecorded(rNumber) {
		if (rNumber > 0 && rNumber <= this.recordedValues.length) {
			const a = this.recordedValues[rNumber - 1];
			const aLength = a.length;
			if (aLength) {
				const first = a[0];
				const firstLength = first.valueCount;
				const ov = new MMNumberValue(aLength, firstLength, first.unitDimensions);
				for (let row = 0; row < aLength; row++) {
					const v = a[row];
					if (v.valueCount !== firstLength) {
						this.setError('mmcmd:recordLengthError', {path: this.getPath()});
						return null;
					}
					for (let column = 0; column < firstLength; column++) {
						ov.values[row * firstLength + column] = v.values[column];
					}
				}
				return ov;
			}
		}
		return null;
	}

	/**
	 * @method columnNameForRecorded
	 * @param {Number} rNumber - the record value number
	 * @param {Boolean} commentOnly - if present and true, null will be return if no comment on formula
	 * @returns {String} - the name for recorded value rNumber
	 */
	columnNameForRecorded(rNumber, commentOnly) {
		if (rNumber > 0 && rNumber <= this.recordedValues.length) {
			const formula = this.recordedValueFormulas[rNumber - 1];
			const parts = formula.formula.split("'");
			if (parts.length > 1) {
				const comment = parts[1].trim();
				return comment.replace(/\s/g,'_');
			}
			else if (!commentOnly) {
				return formula.formula;
			}
		}
		return null;
	}

	/**
	 * @override valueDescribedBy
	 * @param {String} description
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueDescribedBy(description, requestor) {
		if (!description) {
			return super.valueDescribedBy(description, requestor);
		}
		const descriptionParts = description.toLowerCase().split('.');
		const lcDescription = descriptionParts[0];
		if (lcDescription === 'solved') {
			if (this.isSolved) {
				this.addRequestor(requestor);
				return MMNumberValue.scalarValue(1);
			}
			else {
				return null;
			}
		}

		if (!this.isSolved && !this.isSolving && this._shouldAutoRun) {
			if (this.canRun()) {
				this.resetRecordedValues();
				// check if dy can be calculated
				const dy = this.derivativeFormula.value();
				if (dy instanceof MMNumberValue || dy instanceof MMTableValue) {
					this.solve();
				}
			}
		}

		// convenience function to add requestor is return value is known
		const returnValue = (v) => {
			if (v instanceof MMTableValue && descriptionParts.length > 1) {
				const column = v.columnNamed(descriptionParts[1]);
				if (column) {
					v = column.value;
				}
			}
			if (v) {
				this.addRequestor(requestor);
				return v;
			}
		};

		const makeTable = () => {
			{
				const count = this.recordedValues.length;
				const columns = [];
				for (let rNumber = 1; rNumber <= count; rNumber++) {
					const columnName = this.columnNameForRecorded(rNumber);
					const v = this.valueForRecorded(rNumber);
					if (!columnName || !v) {
						return null;
					}
					if (v.columnCount > 1) {
						for (let cNumber = 1; cNumber <= v.columnCount; cNumber++) {
							const name = columnName + `_${cNumber}`;
							const column = new MMTableValueColumn({
								name: name, displayUnit: v.defaultUnit.name, value: v.valueForColumnNumber(cNumber)
							});
							columns.push(column);
						}
					}
					else {
						const column = new MMTableValueColumn({
							name: columnName, displayUnit: v.defaultUnit.name, value: v
						});
						columns.push(column);
					}
				}
				return returnValue(new MMTableValue({columns: columns}));
			}
		}

		switch (lcDescription) {
			case 't':
				return returnValue(this.odeT);

			case 'endt':
				return returnValue(this.endTFormula.numberValue());

			case 'nextt':
				return returnValue(this.nextTFormula.numberValue());
				
			case 'reltol':
				return returnValue(this.relTolFormula.numberValue());

			case 'abstol':
				return returnValue(this.absTolFormula.numberValue());
			
			case 'y0':
				return returnValue(this.initialYFormula.numberValue());
		
			case 'y':
				if (!this.cachedY) {
					this.yUnits = null;
					const value = this.initialYFormula.value();
					if (value instanceof MMNumberValue) {
						this.cachedY = value.copyOf();
						return returnValue(this.cachedY);
					}
					else if (value instanceof MMTableValue) {
						const columns = value.columns;
						let a = [];
						for (let column of columns) {
							const cValue = column.value;
							if (cValue instanceof MMNumberValue) {
								const calcValue = MMNumberValue.scalarValue(1, cValue.unitDimensions);
								const newColumn = new MMTableValueColumn({
									name: column.name,
									value: calcValue
								});
								a.push(newColumn);
							}
							else {
								a = null;
								break;
							}
						}
						if (a && a.length) {
							this.yUnits = new MMTableValue({columns: a});
							// need unitless values (yUnits has value 1 in each column)
							const op = new MMDivideOperator();
							const dimensionless = op.valueFor(value, this.yUnits);
							this.cachedY = dimensionless.numberValue();
							return returnValue(value);
						}
						return null;
					}
				}
				else if (this.yUnits) {
					// was table input - return table
					const columnCount = this.cachedY.columnCount;
					const columns = this.yUnits.columns;
					if (columns.length !== columnCount) {
						this.setError('mmcmd:odeColumnNumberMismatch');
						return null;
					}
					const a = [];
					const rowIndex = MMNumberValue.scalarValue(0.0);
					const columnIndex = MMNumberValue.scalarValue(0.0);
					for (let columnNumber = 0; columnNumber < columnCount; columnNumber++) {
						columnIndex.setValue(columnNumber+1, 1, 1);
						const column = this.cachedY.valueForIndexRowColumn(rowIndex, columnIndex);
						const unitColumn = columns[columnNumber];
						a.push(new MMTableValueColumn({
							name: unitColumn.name,
							value: column
						}));
					}
					const tValue = new MMTableValue({columns: a});
					const op = new MMMultiplyOperator();
					return returnValue(op.valueFor(tValue, this.yUnits));
				}
				return returnValue(this.cachedY);

			case 'dy': {
					const dy = this.derivativeFormula.value();
					if (dy instanceof MMNumberValue || dy instanceof MMTableValue) {
						return returnValue(dy);
					}
				}
				return null;

			case 'i':
				return returnValue(MMNumberValue.scalarValue(this.nextRecordNumber + 1));

			case 'table':
				return makeTable();

			default:
				if (lcDescription.match(/^r\d+$/)) {
					const rNumber = parseInt(lcDescription.substring(1));
					return returnValue(this.valueForRecorded(rNumber));
				}
				else {
					// see if it matches any recorded value comment
					const count = this.recordedValueFormulas.length;
					for (let rNumber = 1; rNumber <= count; rNumber++) {
						const columnName = this.columnNameForRecorded(rNumber, false);
						if (columnName && lcDescription == columnName.toLowerCase()) {
							return returnValue(this.valueForRecorded(rNumber));
						}
					}
					return super.valueDescribedBy(description, requestor);
				}
		}
	}

	/**
	 * @method calcDy
	 * @param {Number} t
	 * @param {Float64Array} y
	 * @param {Float64Array} dy
	 * @returns {boolean} - true if successful, else false
	 */
	calcDy(t, y, dy) {
		this.forgetStep();
		this.odeT.values[0] = t;
		const cachedY = this.cachedY.values;
		const nEqns = cachedY.length;
		for (let i = 0; i < nEqns; i++) {
			cachedY[i] = y[i];
		}

		const newDy = this.derivativeFormula.value();
		if (!(newDy instanceof MMNumberValue) && !(newDy instanceof MMTableValue)) {
			this.setError('mmcmd:odeMissingDy', {path: this.getPath()})
			return false;
		}

		if (newDy.valueCount !== nEqns) {
			this.setError('mmcmd:odeSizeMismatch', {path: this.getPath()});
			return false;
		}

		if (newDy instanceof MMNumberValue) {
			const values = newDy.values;
			for (let i = 0; i < nEqns; i++) {
				dy[i] = values[i];
			}
		}
		else {
			const columns = newDy.columns;
			const columnCount = columns.length;
			const rowCount = newDy.rowCount;
			for (let columnNumber = 0; columnNumber < columnCount; columnNumber++) {
				const column = columns[columnNumber];
				const columnValue = column.value.values;
				for (let rowNumber = 0; rowNumber < rowCount; rowNumber++) {
					dy[rowNumber * columnCount + columnNumber] = columnValue[rowNumber];
				}
			}
		}
		return true;
	}

	/**
	 * @method canRun
	 * @returns {boolean} - true if all information needed to run is available
	 */
	canRun() {
		// check that enough is known to run
		let savedSolvedState = this.isSolved;
		this.isSolved = true;  // so checks don't invoke a solve
		try {
			let endT = this.endTFormula.numberValue();
			if (endT && !MMUnitSystem.areDimensionsEqual(endT.unitDimensions, this.odeT.unitDimensions)) {
				// t dimensions don't match - reset
				this.reset();
				savedSolvedState = false;
				this.isSolved = true; // still want to block solve for additional checks
				endT = this.endTFormula.numberValue();
			}
			if (!endT) { return false; }
			if (this.odeT.values[0] >= endT.values[0]) { return false; }
			if (!this.cachedY && !this.valueDescribedBy('y')) {return false; }
			
			const nextT = this.nextTFormula.numberValue();
			if (!nextT) { return false; }
			if (!MMUnitSystem.areDimensionsEqual(endT.unitDimensions, nextT.unitDimensions)) {
				this.setError('mmcmd:odeNextTEndTMismatch', {path: this.getPath()});
				return false;
			}

			this.relTol = this.relTolFormula.numberValue();
			if (!this.relTol) { return false; }
			if (!MMUnitSystem.areDimensionsEqual(this.relTol.unitDimensions, null)) {
				this.setError('mmcmd:odeRelTolHasUnits', {path: this.getPath()});
				return false;
			}

			const absTol = this.absTolFormula.value();
			if (absTol instanceof MMNumberValue) {
				this.absTol = absTol;
				if (!MMUnitSystem.areDimensionsEqual(absTol.unitDimensions, this.cachedY.unitDimensions)) {
					this.setError('mmcmd:odeAbsTolUnitsMisMatch', {path: this.getPath()});
					return false;
				}
			}
			else if (absTol instanceof MMTableValue) {
				const rowCount = this.cachedY.rowCount;
				const columnCount = this.cachedY.columnCount;
				if (absTol.columnCount !== columnCount) {
					this.setError('mmcmd:odeAbsTolColumnCount', {path: this.getPath()});
					return false;
				}

				this.absTol = new MMNumberValue(rowCount, columnCount);
				for (let columnNumber = 0; columnNumber < columnCount; columnNumber++) {
					const column = absTol.columns[columnNumber];
					const columnValue = column.value;
					if (!(columnValue instanceof MMNumberValue)) {
						this.setError('mmcmd:odeAbsTolNotNumber', {path: this.getPath()});
						return false;
					}
					const unitColumn = this.yUnits.columns[columnNumber];
					const yUnit = unitColumn.value;
					if (!MMUnitSystem.areDimensionsEqual(columnValue.unitDimensions, yUnit.unitDimensions)) {
						this.setError('mmcmd:odeAbsTolUnitsMisMatch', {path: this.getPath()})
						return false;
					}
					const absV = this.absTol.values;
					const columnV = columnValue.values;
					const columnRowCount = columnValue.rowCount
					for (let rowNumber = 0; rowNumber < rowCount; rowNumber++) {
						absV[rowNumber*columnCount + columnNumber] = columnV[rowNumber % columnRowCount];
					}
				}
			}
			else {
				return false;
			}

			const derivativeValue = this.derivativeFormula.value();
			if (derivativeValue instanceof MMNumberValue) {
				if (derivativeValue.valueCount !== this.cachedY.valueCount) {
					this.setError('mmcmd:odeDyCountMismatch', {path: this.getPath()});
					return false;
				}
				const tDimensions = this.odeT.unitDimensions;
				const yDimensions = this.cachedY.unitDimensions;
				const dyDimensions = derivativeValue.unitDimensions;
				for (let i = 0; i < MMUnitDimensionType.NUMDIMS; i++) {
					if (yDimensions[i] !== tDimensions[i] + dyDimensions[i]) {
						this.setError('mmcmd:odeDyUnitMismatch', {path: this.getPath()});
						return false;
					}
				}
			}
			else if (derivativeValue instanceof MMTableValue) {
				const rowCount = derivativeValue.rowCount;
				const columnCount = derivativeValue.columnCount;
				if (columnCount !== this.cachedY.columnCount || rowCount !== this.cachedY.rowCount) {
					this.setError('mmcmd:odeDyCountMismatch', {path: this.getPath()});
					return false;
				}
				const tDimensions = this.odeT.unitDimensions;
				for (let columnNumber = 0; columnNumber < columnCount; columnNumber++) {
					const column = derivativeValue.columns[columnNumber];
					if (!(column.value instanceof MMNumberValue)) {
						this.setError('mmcmd:odeNonumericDy', {path: this.getPath()});
						return false;
					}
					const unitColumn = this.yUnits.columns[columnNumber];
					const yDimensions = unitColumn.value.unitDimensions;
					const dyDimensions = column.value.unitDimensions;
					for (let i = 0; i < MMUnitDimensionType.NUMDIMS; i++) {
						if (yDimensions[i] !== tDimensions[i] + dyDimensions[i]) {
							this.setError('mmcmd:odeDyUnitMismatch', {path: this.getPath()});
							return false;
						}
					}	
				}
			}
			else {
				return false;
			}
		}
		finally {
			this.isSolved = savedSolvedState;
		}
		return true;
	}

	/**
	 * @method solve
	 */
	solve() {
		this.isSolving = true;
		if (this.odeT.values[0] === 0.0 && !this.recordCurrentValues()) {
			this.isSolving = false;
			return;
		}
		this.isSolving = false;
		const derivativeValue = this.derivativeFormula.value();
		if (!(derivativeValue instanceof MMNumberValue) && !(derivativeValue instanceof MMTableValue)) {
			return;
		}
		const endT = this.endTFormula.numberValue();
		if (endT && endT.values[0] <= this.odeT.values[0]) {
			this.isSolved = true;
			return;
		}
		this.processor.statusCallBack(this.t('mmcmd:odeStatusT', {t: this.odeT.stringUsingUnit()}));

		const y = Float64Array.from(this.cachedY.values);
		this.isSolving = true;
		try {
			const solver = new MMOdeSolver(this);
			let nextT = this.nextTFormula.numberValue();
			let tNext = nextT.values[0];
			let tStop = endT.values[0];
			if (tNext > tStop) {
				tNext = tStop;
			}

			let lastStatusTime = Date.now();
			while (tNext <= tStop) {
				const stepResult = solver.stepToNextT(tNext, y);
				this.forgetStep();
				this.odeT.values[0] = stepResult.t;
				// console.log(`t ${this.odeT.values[0]} y1 ${y[0]}`);
				solver.vCopy(y, this.cachedY.values);
				this.derivativeFormula.value();  // so all requestor information is correct
				if (stepResult.succeeded === false) {
					break;
				}

				if (!this.recordCurrentValues()) {
					break;
				}
				const endT = this.endTFormula.numberValue();
				if (endT && endT.values[0] <= this.odeT.values[0]) {
					this.isSolved = true;
					return;
				}
				tStop = endT.values[0];
				if (this.odeT.values[0] >= tStop) {
					this.isSolved = true;
					break;
				}

				const now = Date.now();
				if (now - lastStatusTime > 1000) {
					this.processor.statusCallBack(this.t('mmcmd:odeStatusT', {t: this.odeT.stringUsingUnit()}));
					lastStatusTime = now;
				}

				this.nextRecordNumber++;
				this.forgetStep();
				nextT = this.nextTFormula.numberValue();
				if (!nextT) {
					this.setError('mmcmd:odeRecordTimeError', {path: this.getPath()});
					break;
				}
				tNext = nextT.values[0];
				if (tNext > tStop) {
					tNext = tStop;
				}
			}
			this.derivativeFormula.value();  // so all requestor information is correct
		}
		catch(e) {
			const msg = (typeof e === 'string') ? e : e.message;
			this.setError('mmcmd:odeException', {path: this.getPath(), msg: msg});
		}
		finally {
			this.isSolving = false;
			this.relTol = null;
			this.absTol = null;
		}
	}
}

/**
 * @class MMOdeSolver
 * this class does the actual solving based on techniques from
 * the Sundials CVOde code from Lawerence Livermore Labs
 */
class MMOdeSolver {
	/**
	 * @constructor
	 * @param {Object} ode - MMOde tool
	 */
	constructor(ode) {
		this.flags = Object.freeze({
			SUCCESS:						0,
			DO_ERROR_TEST:			2,
			PREDICT_AGAIN:			3,		
			CONV_FAIL:					4, 
			TRY_AGAIN:					5,		
			FIRST_CALL:					6,
			PREV_CONV_FAIL:			7,
			PREV_ERR_FAIL:			8,		
			RHSFUNC_RECVR:			9,
			TOO_MUCH_WORK:			-1,
			TOO_MUCH_ACC:				-2,
			ERR_FAILURE:				-3,
			CONV_FAILURE:				-4,
			LINIT_FAIL:					-5,
			LSETUP_FAIL:				-6,
			LSOLVE_FAIL:				-7,
			RHSFUNC_FAIL:				-8,
			FIRST_RHSFUNC_ERR:	-9,
			REPTD_RHSFUNC_ERR:	-10,
			UNREC_RHSFUNC_ERR:	-11,
			RTFUNC_FAIL:				-12,
			MEM_FAIL:						-20,
			MEM_NULL:						-21,
			ILL_INPUT:					-22,
			NO_MALLOC:					-23,
			BAD_K:							-24,
			BAD_T:							-25,
			BAD_DKY:						-26,
			TOO_CLOSE:					-27,
			NO_FAILURES:				0,
			FAIL_BAD_J:					1,
			FAIL_OTHER:					2
		})
		this.ode = ode;
		const count = ode.cachedY.values.length;

		// if stiff, then use BDF, else use Adams
		if (ode.isStiff) {
			this.qmax = 5;  // max order
			this.M = new Float64Array(count*count);				// array for keeping matrix for newton solver
			this.savedJ = new Float64Array(count*count);	// saved jacobian
			this.newtonStepNumber = 0;
		}
		else {
			this.qmax = 12; // max order
		}
		this.lMax = this.qmax + 1;

		// alloc working vectors
		this.y = null;		// y is used as temporary storage by the solver
											// The memory is provided by the user to stepToNext
											// as the parameter named yout.

		this.ewt = new Float64Array(count);			// error weight vector
		this.acor = new Float64Array(count);		// In the context of the solution of the nonlinear
																						// equation, acor = y_n(m) - y_n(0). On return, 
																						// this vector is scaled to give the est. local err.
		this.acor_indx;													// index of the zn vector with saved acor
		this.tempv = new Float64Array(count);		// temporary storage vector
		this.ftemp = new Float64Array(count);		// temporary storage vector
		this.zn = [];		// Nordsieck array, of size N x (q+1).
										// zn[j] is a vector of length N (j=0,...,q) 
										// zn[j] = [1/factorial(j)] * h^j * (jth      
										// derivative of the interpolating polynomial
		for (let i = 0; i < this.qmax + 1; i++) {
			this.zn.push(new Float64Array(count));
		}
		// Initialize zn[0] in the history array 
		this.vCopy(ode.cachedY.values, this.zn[0]);

		this.tn = ode.odeT.values[0];
		this.absTol = ode.absTol.values.length === 1 ? ode.absTol.values[0] : ode.absTol.values;
		this.relTol = ode.relTol.values[0];

		this.stepNumber = 0;
		this.setupStepNumber = 0;		// step number of last setup call
		this.h = 0;						// current step size 
		this.next_h;          // step size to be used on the next step
		this.eta;             // eta = hprime / h
		this.etamax = 10000;	// eta <= etamax
		this.etaqm1;					// ratio of new to old h for order q-1
		this.etaq;  					// ratio of new to old h for order q
		this.etaqp1;					// ratio of new to old h for order q+1
	
		this.hscale;          // value of h used in zn
		this.lCoeff = [];			// coefficients of l(x) (degree q poly)
		this.rl1;							// the scalar 1/l[1]
		this.gamma;						// gamma = h * rl1
		this.gammap;					// gamma at the last setup call
		this.gamrat;					// gamma / gammap

		this.acnrm;						// | acor | wrms
		this.nlscoef = 0.1;		// coeficient in nonlinear convergence test
	
		this.tau = [];				// array of previous q+1 successful step sizes indexed from 1 to q+1
		this.tq = [];					//array of test quantities indexed from 1 to NUM_TESTS(=5)
	
		this.mxstep = 500;		// maximum number of internal steps for one user call
	
		this.nfe = 0;					// number of f calls 

		// Set step parameters
		this.q = 1;					// current order
		this.L = 2;					// L = q + 1
		this.qwait = 2;			// number of internal steps to wait before considering a change in q 
		this.qprime = 1;		// order to be used on the next step

		this.hu  = 0;				// last successful h value used 
	}

	/**
	 * @method setError
	 * @param {String} errorKey 
	 */
	setError(errorKey) {
		this.ode.setError(`mmcmd:${errorKey}`, {path: this.ode.getPath()});
	}

	/**
	 * @method stepToNextT
	 * @param {Number} tout;
	 * @param {Float64Array} yout
	 * @returns {Object} - {succeeded: boolean, t: Number}
	 */
	stepToNextT(tout, yout) {
		this.y = yout;
		// initialization performed on the first step
		if (this.stepNumber === 0) {
			// Load initial error weights
			if (!this.setErrorWeight(this.zn[0], this.ewt)) {
				return {succeeded: false, t: this.tn};
			}

			// Call f at (t0,y0), set zn[1] = y'(t0)
			if (!this.ode.calcDy(this.tn, this.zn[0], this.zn[1])) {
				this.nfe++;
				return {succeeded: false, t: this.tn};
			}
			this.nfe++;

			if (!this.initializeStepSize(tout)) {
				return {succeeded: false, t: this.tn};
			}

			/* Scale zn[1] by h.*/
			this.hscale = this.h; 
			this.h0u    = this.h;
			this.hprime = this.h;

			this.vScale(this.h, this.zn[1], this.zn[1]);
		} /* end of first call block */

		if (this.stepNumber > 0) {
			/* Estimate an infinitesimal time interval to be used as
       a roundoff for time quantities (based on current time 
       and step size) */
			if ((this.tn - tout)*this.h >= 0)  {
				if (!this.getDKy(tout, 0, yout)) {					
					return {succeeded: false, t: this.tn};
				}
				return {succeeded: true, t: tout};
			}	
		}	// end stopping tests block

		/*
		* --------------------------------------------------
		* Looping point for internal steps
		*
		*    1. check for errors (too many steps, too much
		*       accuracy requested, step size too small)
		*    2. take a new step (call CVStep)
		*    3. stop on error 
		*    4. perform stop tests:
		*         - check for root in last step
		*         - check if tout was passed
		* --------------------------------------------------
		*/
		let nLocalSteps = 0;
		// console.log(`tout ${tout} h ${this.h}`);
		for(;;) {
		
			this.next_h = this.h;
			this.next_q = this.q;
			
			/* Reset and check ewt */
			if (this.stepNumber > 0) {
				if (!this.setErrorWeight(this.zn[0], this.ewt)) {
					return {succeeded: false, t: this.tn};
				}
			}

			// Check for too many steps
			if (this.mxstep > 0 && nLocalSteps >= this.mxstep) {
				this.setError('odeTooMuchWork');
				this.vScale(1, this.zn[0], yout);
				return {succeeded: false, t: this.tn};
			}

			// Check for too much accuracy requested
			const nrm = this.vWrmsNorm(this.zn[0], this.ewt);
			let tolsf = Number.EPSILON * nrm;
			if (tolsf > 1) {
				this.setError('odeTooMuchAccuracy');
				this.vScale(1, this.zn[0], yout);
				return {succeeded: false, t: this.tn};
			}
			else {
				tolsf = 1;
			}

			// Check for h below roundoff level in tn
			if (this.tn + this.h === this.tn) {
				this.setError('odeZeroStepSize');
				return {succeeded: false, t: this.tn};
			}
			
			// take a step
			if (!this.step()) {
				this.vScale(1, this.zn[0], yout);
				return {succeeded: false, t: this.tn};
			}

			nLocalSteps++;
			// check if tout reached
			if ((this.tn - tout)*this.h >= 0) {
				this.getDKy(tout, 0, yout);
				this.next_q = this.qprime;
				this.next_h = this.hprime;
				break;
			}
		}
		return {succeeded: true, t: tout};	
	}

	/**
	 * @method step
	 * @returns true if successful
	 * This routine performs one internal cvode step, from tn to tn + h.
	 * It calls other routines to do all the work.
	 *
	 * The main operations done here are as follows:
	 * - preliminary adjustments if a new step size was chosen;
	 * - prediction of the Nordsieck history array zn at tn + h;
	 * - setting of multistep method coefficients and test quantities;
	 * - solution of the nonlinear system;
	 * - testing the local error;
	 * - updating zn and other state data if successful;
	 * - resetting stepsize and order for the next step.
	 * On a failure in the nonlinear system solution or error test, the
	 * step may be reattempted, depending on the nature of the failure.
	 */
	step() {
		const savedT = this.tn;
		let ncf = 0;
		let nErrors = 0;
		let flag = this.flags.FIRST_CALL;
		let dsm;
	
		// console.log(`step ${this.stepNumber} hprime ${this.hprime} h ${this.h}`);
		if ((this.stepNumber > 0) && (this.hprime != this.h)) {
			this.adjustParams();
		}


		/* Looping point for attempts to take a step */
		for(;;) {  
			this.predict();  
			this.set();
			if (this.ode.isStiff) {
				flag = this.newtonSolve(flag);
			}
			else {
				flag = this.functionalSolve();
			}
			if (flag === this.flags.SUCCESS) {
				// nonlinear solve succeeded - test errors
				const returnValue = this.doErrorTest(savedT, nErrors);
				dsm = returnValue.dsm;
				nErrors = returnValue.nErrors;
				// console.log(`rv ${returnValue.succeeded} t ${this.tn} dsm ${dsm} nErrors ${nErrors}`);
				if (returnValue.succeeded === true) {
					// error okay, exit loop
					break;
				}
				flag = this.flags.PREV_ERR_FAIL;
				if (returnValue.tryAgain === false) {
					// unrecoverable
					return false;
				}
				// continue loop if we need to predict again
			}
			else {
				// nonlinear solver failed; restore zn
				this.restore(savedT);
				if (
					flag === this.flags.RHSFUNC_FAIL ||
					flag == this.flags.LSETUP_FAIL ||
					flag === this.flags.LSOLVE_FAIL
				) {
					return false;
				}
				// At this point, flag = null so another attempt may be possible; increment ncf
				ncf++;
				this.etamax = 1;
				// If we had maxncf failures or |h| = hmin, then fail and return false
				if (this.h <= 0 || ncf >= 10) {
					this.setError('odeConvFailure');
					return false;
				}

				// Reduce step size and reattempt the step */
				this.eta = 0.25;
				flag = this.flags.PREDICT_AGAIN;
				this.rescale();
			}
		}

		// Nonlinear system solve and error test were both successful.
		// Update data, and consider change of step and/or order.

		// Increment the step counter nst, record the values hu and qu,
		// update the tau array, and apply the corrections to the zn array.
		// The tau[i] are the last q values of h, with tau[1] the most recent.
		// The counter qwait is decremented, and if qwait == 1 (and q < qmax)
		// we save acor and tq[5] for a possible order increase.
		this.stepNumber++;
		this.hu = this.h;
		this.qu = this.q;
	
		for (let i = this.q; i >= 2; i--) {
			this.tau[i] = this.tau[i-1];
		}
		if (this.q === 1 && this.stepNumber > 1) {
			this.tau[2] = this.tau[1];
		}
		this.tau[1] = this.h;
	
		for (let j = 0; j <= this.q; j++) {
			this.vLinearSum(this.lCoeff[j], this.acor, 1, this.zn[j], this.zn[j]);
		}
		this.qwait--;
		if (this.qwait === 1 && this.q !== this.qmax) {
			this.vScale(1, this.acor, this.zn[this.qmax]);
			this.saved_tq5 = this.tq[5];
			this.indx_acor = this.qmax;
		}

		// Handle the setting of stepsize and order for the
		// next step -- hprime and qprime.  Along with hprime, set the
		// ratio eta = hprime/h.  Also update other state variables 
		// related to a change of step size or order. 

		// If etamax = 1, defer step size or order changes
		if (this.etamax === 1) {
			this.qwait = Math.max(this.qwait, 2);
			this.qprime = this.q;
			this.hprime = this.h;
			this.eta = 1;
		}
		else {
			// etaq is the ratio of new to old h at the current order  
			this.etaq = 1 /(Math.pow(6*dsm, 1/this.L) + 1e-6);
			
			// If no order change, adjust eta and acor in CVSetEta and return
			if (this.qwait !== 0) {
				this.eta = this.etaq;
				this.qprime = this.q;
				this.setEta();
			}
			else {
				/* If qwait = 0, consider an order change.   etaqm1 and etaqp1 are 
					the ratios of new to old h at orders q-1 and q+1, respectively.
					CVChooseEta selects the largest; CVSetEta adjusts eta and acor */
				this.qwait = 2;
				this.etaqm1 = this.computeEtaqm1();
				this.etaqp1 = this.computeEtaqp1();  
				this.chooseEta(); 
				this.setEta();
			}
		}
		this.etamax = 10;

		//  Finally, we rescale the acor array to be the 
		//	estimated local error vector.	
		this.vScale(this.tq[2], this.acor, this.acor);
		return true;
	}

	/**
	 * @method setEta
	 *
	 * This routine adjusts the value of eta according to the various
	 * heuristic limits and the optional input hmax.  It also resets
	 * etamax to be the estimated local error vector.
	 */

	setEta() {
		/* If eta below the threshhold THRESH, reject a change of step size */
		if (this.eta < 1.5) {
			this.eta = 1;
			this.hprime = this.h;
		} else {
			/* Limit eta by etamax and hmax, then set hprime */
			this.eta = Math.min(this.eta, this.etamax);
			this.hprime = this.h * this.eta;
		}
		
		/* Reset etamax for the next step size change, and scale acor */
	}

	/**
	 * @method computeEtaqm1
	 * @returns {Number} eta1m1
	 *
	 * This routine computes and returns the value of etaqm1 for a
	 * possible decrease in order by 1.
	 */
	computeEtaqm1() {		
		this.etaqm1 = 0;
		if (this.q > 1) {
			const ddn = this.vWrmsNorm(this.zn[this.q], this.ewt) * this.tq[1];
			this.etaqm1 = 1/(Math.pow(6*ddn, 1/this.q) + 1e-6);
		}
		return this.etaqm1;
	}

	/**
	 * @method computeEtaqp1
	 * @returns {Number} etaqp1
	 *
	 * This routine computes and returns the value of etaqp1 for a
	 * possible increase in order by 1.
	 */

	computeEtaqp1() {
		this.etaqp1 = 0;
		if (this.q != this.qmax) {
			if (this.saved_tq5 === 0) {
				return this.etaqp1;
			}
			const cquot = (this.tq[5] / this.saved_tq5) * Math.pow(this.h/this.tau[2], this.L);
			this.vLinearSum(-cquot, this.zn[this.qmax], 1, this.acor, this.tempv);
			const dup = this.vWrmsNorm(this.tempv, this.ewt) * this.tq[3];
			this.etaqp1 = 1 / (Math.pow(10*dup, 1/(this.L+1)) + 1e-6);
		}
		return this.etaqp1;
	}

	/**
	 * @method chooseEta
	 * Given etaqm1, etaq, etaqp1 (the values of eta for qprime =
	 * q - 1, q, or q + 1, respectively), this routine chooses the 
	 * maximum eta value, sets eta to that value, and sets qprime to the
	 * corresponding value of q.  If there is a tie, the preference
	 * order is to (1) keep the same order, then (2) decrease the order,
	 * and finally (3) increase the order.  If the maximum eta value
	 * is below the threshhold THRESH, the order is kept unchanged and
	 * eta is set to 1.
	 */

	chooseEta() {
		const etam = Math.max(this.etaqm1, Math.max(this.etaq, this.etaqp1));
		
		if (etam < 1.5) {
			this.eta = 1;
			this.qprime = this.q;
			return;
		}

		if (etam === this.etaq) {
			this.eta = this.etaq;
			this.qprime = this.q;

		} else if (etam === this.etaqm1) {
			this.eta = this.etaqm1;
			this.qprime = this.q - 1;
		} else {
			this.eta = this.etaqp1;
			this.qprime = this.q + 1;

			if (this.ode.isStiff) {
				/* 
				* Store Delta_n in zn[qmax] to be used in order increase 
				*
				* This happens at the last step of order q before an increase
				* to order q+1, so it represents Delta_n in the ELTE at q+1
				*/

				this.vScale(1, this.acor, this.zn[this.qmax]);

			}
		}
	}

	/**
	 * @method adjustParams()
	 *
	 * This routine is called when a change in step size was decided upon,
	 * and it handles the required adjustments to the history array zn.
	 * If there is to be a change in order, we adjus the order and reset
	 * q, L = q+1, and qwait.  Then in any case, we call rescale, which
	 * resets h and rescales the Nordsieck array.
	 */
	adjustParams() {
		const deltaQ = this.qprime - this.q; // should be -1, 0 or 1
		if (deltaQ) {
			this.adjustOrder(deltaQ);
			this.q = this.qprime;
			this.L = this.q+1;
			this.qwait = this.L;
		}
		this.rescale();	
	}

	/*
 * CVAdjustOrder
 *
 * This routine is a high level routine which handles an order
 * change by an amount deltaq (= +1 or -1). If a decrease in order
 * is requested and q==2, then the routine returns immediately.
 * Otherwise CVAdjustAdams or CVAdjustBDF is called to handle the
 * order change (depending on the value of lmm).
 */

	/**
	 * @method adjustOrder
	 * @param {Number} deltaQ
	 * This routine is a high level routine which handles an order
	 * change by an amount deltaq (= +1 or -1). If a decrease in order
	 * is requested and q==2, then the routine returns immediately.
	 * Otherwise adjustAdams or adjustBDF is called to handle the
	 * order change (depending on the value of this.ode.isStiff).
	 */
	adjustOrder(deltaQ) {
		if (this.q == 2 && deltaQ != 1) { return; }

		if (this.ode.isStiff) {
			this.adjustBDF(deltaQ);
		}
		else {
			this.adjustAdams(deltaQ);
		}	
	}

	/**
	 * @method adjustAdams
	 * @param {Number} deltaQ
	 * This routine adjusts the history array on a change of order q by
	 * deltaQ for the non stiff case
	 */
	adjustAdams(deltaQ) {
		// On an order increase, set new column of zn to zero and return
		if (deltaQ === 1) {
			this.zn[this.L].fill(0);
			return;
		}

		/*
			* On an order decrease, each zn[j] is adjusted by a multiple of zn[q].
			* The coeffs. in the adjustment are the coeffs. of the polynomial:
			*        x
			* q * INT { u * ( u + xi_1 ) * ... * ( u + xi_{q-2} ) } du 
			*        0
			* where xi_j = [t_n - t_(n-j)]/h => xi_0 = 0
		*/

		const l = this.lCoeff;
		for (let i = 0; i <= this.qmax; i++) {
			l[i] = 0;
		}
		l[1] = 1;
		let hsum = 0;
		for (let j = 1; j <= this.q-2; j++) {
			hsum += this.tau[j];
			const xi = hsum / this.hscale;
			for (let i = j+1; i >= 1; i--) {
				l[i] = l[i]*xi + l[i-1];
			}
		}

		for (let j=1; j <= this.q-2; j++) {
			l[j+1] = this.q * (l[j] / (j+1));
		}

		for (let j=2; j < this.q; j++) {
			this.vLinearSum(-l[j], this.zn[this.q], 1, this.zn[j], this.zn[j]);
		}
	}

	/**
	 * @method adjustBDF
	 * @param {Number} deltaQ
	 * This routine adjusts the history array on a change of order q by
	 * deltaQ for the stiff case
	 */
	adjustBDF(deltaQ) {
		if (deltaQ === 1) {
			/*
			* A new column zn[q+1] is set equal to a multiple of the saved 
			* vector (= acor) in zn[indx_acor].  Then each zn[j] is adjusted by
			* a multiple of zn[q+1].  The coefficients in the adjustment are the 
			* coefficients of the polynomial x*x*(x+xi_1)*...*(x+xi_j),
			* where xi_j = [t_n - t_(n-j)]/h.
			*/
			const l = this.lCoeff;
			for (let i = 0; i <= this.qmax; i++) {
				l[i] = 0;
			}
	
			l[2] = 1;
			let alpha1 = 1;
			let prod = 1;
			let xiold = 1;
			let alpha0 = -1;
			let hsum = this.hscale;
			if (this.q > 1) {
				for (let j = 1; j < this.q; j++) {
					hsum += this.tau[j+1];
					const xi = hsum / this.hscale;
					prod *= xi;
					alpha0 -= 1 / (j+1);
					alpha1 += 1 / xi;
					for (let i = j+2; i >= 2; i--) {
						l[i] = l[i]*xiold + l[i-1];
					}
					xiold = xi;
				}
			}
			const A1 = (-alpha0 - alpha1) / prod;
			this.vScale(A1, this.zn[this.indx_acor], this.zn[this.L]);
			for (let j = 2; j <= this.q; j++) {
				this.vLinearSum(l[j], this.zn[this.L], 1, this.zn[j], this.zn[j]);
			}  
		}
	}

	/**
	 * @method rescale
	 *
	 * This routine rescales the Nordsieck array by multiplying the
	 * jth column zn[j] by eta^j, j = 1, ..., q.  Then the value of
	 * h is rescaled by eta, and hscale is reset to h.
	*/
	rescale() {
		let factor = this.eta;
		for (let j =1 ; j <= this.q; j++) {
			this.vScale(factor, this.zn[j], this.zn[j]);
			factor *= this.eta;
		}
		this.h = this.hscale * this.eta;
		// console.log(`${this.nfe} t ${this.tn} h ${this.h} hscale ${this.hscale} eta ${this.eta}`);
		this.next_h = this.h;
		this.hscale = this.h;
	}

	/**
	* @method predict
	*
	* This routine advances tn by the tentative step size h, and computes
	* the predicted array z_n(0), which is overwritten on zn.  The
	* prediction of zn is done by repeated additions.
	*/

	predict() {
		
		this.tn += this.h;
		for (let k = 1; k <= this.q; k++) {
			for (let j = this.q; j >= k; j--) {
				this.vLinearSum(1, this.zn[j-1], 1, this.zn[j], this.zn[j-1]);
			}
		}
	}

	/**
	 * @method set
	 *
	 * This routine is a high level routine which calls setAdams or
	 * setBDF to set the polynomial lCoeff, the test quantity array tq, 
	 * and the related variables  rl1, gamma, and gamrat.
	 *
	 * The array tq is loaded with constants used in the control of estimated
	 * local errors and in the nonlinear convergence test.  Specifically, while
	 * running at order q, the components of tq are as follows:
	 *   tq[1] = a coefficient used to get the est. local error at order q-1
	 *   tq[2] = a coefficient used to get the est. local error at order q
	 *   tq[3] = a coefficient used to get the est. local error at order q+1
	 *   tq[4] = constant used in nonlinear iteration convergence test
	 *   tq[5] = coefficient used to get the order q+2 derivative vector used in
	 *           the est. local error at order q+1
	 */

	set() {
		if (this.ode.isStiff) {
			this.setBDF();
		}
		else {
			this.setAdams();
		}
		this.rl1 = 1 / this.lCoeff[1];
		this.gamma = this.h * this.rl1;
		if (this.stepNumber == 0) {
			this.gammap = this.gamma;
		}
		this.gamrat = (this.stepNumber > 0) ? this.gamma / this.gammap : 1;  // protect x / x != 1.0
	}

	/**
	 * @method setAdams
	 *
	 * This routine handles the computation of l and tq for the
	 * non stiff case.
	 *
	 * The components of the array l are the coefficients of a
	 * polynomial Lambda(x) = l_0 + l_1 x + ... + l_q x^q, given by
	 *                          q-1
	 * (d/dx) Lambda(x) = c * PRODUCT (1 + x / xi_i) , where
	 *                          i=1
	 *  Lambda(-1) = 0, Lambda(0) = 1, and c is a normalization factor.
	 * Here xi_i = [t_n - t_(n-i)] / h.
	 *
	 * The array tq is set to test quantities used in the convergence
	 * test, the error test, and the selection of h at a new order.
	 */

	setAdams() {
		let m = [];
		let M = [];
		const l = this.lCoeff;
		
		if (this.q === 1) {
			l[0] = l[1] = this.tq[1] = this.tq[5] = 1;
			this.tq[2] = 0.5;
			this.tq[3] = 1/12.;
			this.tq[4] = this.nlscoef / this.tq[2];       /* = 0.1 / tq[2] */
			return;
		}
		
		const hsum = this.adamsStart(m);
		
		M[0] = this.altSum(this.q-1, m, 1);
		M[1] = this.altSum(this.q-1, m, 2);
		
		this.adamsFinish(m, M, hsum);
	}

	/**
	 * @method adamsStart
	 * @param {Array} m
	 *
	 * This routine generates in m[] the coefficients of the product
	 * polynomial needed for the Adams l and tq coefficients for q > 1.
	 */

	adamsStart(m) {
		let hsum = this.h;
		m[0] = 1;
		for (let i = 1; i <= this.q; i++) {
			m[i] = 0;
		}
		for (let j = 1; j < this.q; j++) {
			if (j === this.q-1 && this.qwait === 1) {
				const sum = this.altSum(this.q-2, m, 2);
				this.tq[1] = this.q * sum / m[this.q-2];
			}
			const xi_inv = this.h / hsum;
			for (let i = j; i >= 1; i--) {
				m[i] += m[i-1] * xi_inv;
			}
			hsum += this.tau[j];
			/* The m[i] are coefficients of product(1 to j) (1 + x/xi_i) */
		}
		return hsum ;
	}

	/**
	 * @method adamsFinish
	 * @param {Array} m
	 * @param {array} M
	 * @param {Number} hsum
	 *
	 * This routine completes the calculation of the Adams l and tq.
	 */

	adamsFinish(m, M, hsum) {
		const l = this.lCoeff;		
		const M0_inv = 1 / M[0];
		
		l[0] = 1;
		for (let i = 1; i <= this.q; i++) {
			l[i] = M0_inv * (m[i-1] / i);
		}
		let xi = hsum / this.h;
		let xi_inv = 1 / xi;
		
		this.tq[2] = M[1] * M0_inv / xi;
		this.tq[5] = xi / l[this.q];

		if (this.qwait == 1) {
			for (let i = this.q; i >= 1; i--) {
				m[i] += m[i-1] * xi_inv;
			}
			M[2] = this.altSum(this.q, m, 2);
			this.tq[3] = M[2] * M0_inv / this.L;
		}

		this.tq[4] = this.nlscoef / this.tq[2];
	}

	/**  
	 * @method altSum
	 * @param {Number} iend
	 * @param {Array} a
	 * @param {Number} k
	 *
	 * altSum returns the value of the alternating sum
	 *   sum (i= 0 ... iend) [ (-1)^i * (a[i] / (i + k)) ].
	 * If iend < 0 then altSum returns 0.
	 * This operation is needed to compute the integral, from -1 to 0,
	 * of a polynomial x^(k-1) M(x) given the coefficients of M(x).
	*/

	altSum(iend, a, k) {
		if (iend < 0) {
			return 0;
		}
		
		let sum = 0;
		let sign = 1;
		for (let i = 0; i <= iend; i++) {
			sum += sign * (a[i] / (i+k));
			sign = -sign;
		}
		return sum;
	}

	/**
	 * @method setBDF
	 *
	 * This routine computes the coefficients l and tq in the stiff case
	 * 
	 * The components of the array l are the coefficients of a
	 * polynomial Lambda(x) = l_0 + l_1 x + ... + l_q x^q, given by
	 *                                 q-1
	 * Lambda(x) = (1 + x / xi*_q) * PRODUCT (1 + x / xi_i) , where
	 *                                 i=1
	 *  xi_i = [t_n - t_(n-i)] / h.
	 *
	 * The array tq is set to test quantities used in the convergence
	 * test, the error test, and the selection of h at a new order.
	 */

	setBDF() {		
		this.lCoeff[0] = this.lCoeff[1] = 1;
		let xi_inv = 1;
		let xistar_inv = 1;
		for (let i = 2; i <= this.q; i++) {
			this.lCoeff[i] = 0;
		}
		let alpha0 = -1;
		let alpha0_hat = -1;
		let hsum = this.h;
		if (this.q > 1) {
			for (let j = 2; j < this.q; j++) {
				hsum += this.tau[j-1];
				xi_inv = this.h / hsum;
				alpha0 -= 1.0 / j;
				for(let i = j; i >= 1; i--) {
					this.lCoeff[i] += this.lCoeff[i-1]*xi_inv;
				}
				/* The l[i] are coefficients of product(1 to j) (1 + x/xi_i) */
			}
			
			/* j = q */
			alpha0 -= 1. / this.q;
			xistar_inv = -this.lCoeff[1] - alpha0;
			hsum += this.tau[this.q-1];
			xi_inv = this.h / hsum;
			alpha0_hat = -this.lCoeff[1] - xi_inv;
			for (let i = this.q; i >= 1; i--) {
				this.lCoeff[i] += this.lCoeff[i-1]*xistar_inv;
			}
		}

		// Set the test quantity array tq
		const A1 = 1 - alpha0_hat + alpha0;
		const A2 = 1 + this.q * A1;
		this.tq[2] = Math.abs(A1 / (alpha0 * A2));
		this.tq[5] = Math.abs(A2 * xistar_inv / (this.lCoeff[this.q] * xi_inv));
		if (this.qwait === 1) {
			const C = xistar_inv / this.lCoeff[this.q];
			const A3 = alpha0 + 1. / this.q;
			const A4 = alpha0_hat + xi_inv;
			const Cpinv = (1 - A4 + A3) / A3;
			this.tq[1] = Math.abs(C * Cpinv);
			hsum += this.tau[this.q];
			xi_inv = this.h / hsum;
			const A5 = alpha0 - (1 / (this.q+1));
			const A6 = alpha0_hat - xi_inv;
			const Cppinv = (1 - A6 + A5) / A2;
			this.tq[3] =  Math.abs(Cppinv / (xi_inv * (this.q+2) * A5));
		}
		this.tq[4] = this.nlscoef / this.tq[2];
	}

	/**
	 * @method functionalSolve
	 * @returns {Number} flag
	 *
	 * This routine attempts to solve the nonlinear system associated
	 * with a single implicit step of the linear multistep method.
	 * It uses functional iteration (no matrices involved).
	 * 
	 * Possible return values:
	 *   SUCCESS		--->  continue with error test
	 *   RHS_FAIL		--->  halt the integration
	 *   CONV_FAIL	--->  predict again or stop if too many
	*/
	functionalSolve() {
		/* Initialize counter and evaluate f at predicted y */
		let crate = 1;
		let m = 0;
	
		if (!this.ode.calcDy(this.tn, this.zn[0], this.tempv)) {
			this.nfe++;
			return this.flags.RHSFUNC_FAIL;
		}
		this.nfe++;
	
		this.acor.fill(0);
	
		/* Initialize delp to avoid compiler warning message */
		let del = 0;
		let delp = 0;
	
		/* Loop until convergence; accumulate corrections in acor */
		for(;;) {
			/* Correct y directly from the last f value */
			this.vLinearSum(this.h, this.tempv, -1, this.zn[1], this.tempv);
			this.vScale(this.rl1, this.tempv, this.tempv);
			this.vLinearSum(1, this.zn[0], 1, this.tempv, this.y);
			/* Get WRMS norm of current correction to use in convergence test */
			this.vLinearSum(1, this.tempv, -1, this.acor, this.acor);
			del = this.vWrmsNorm(this.acor, this.ewt);
			this.vScale(1, this.tempv, this.acor);
			
			/* Test for convergence.  If m > 0, an estimate of the convergence
				 rate constant is stored in crate, and used in the test.        */
			if (m > 0) {
				crate = Math.abs(0.3 * crate, del / delp);
			}
			const dcon = del * Math.min(1, crate) / this.tq[4];
			if (dcon <= 1) {
				this.acnrm = (m === 0) ? del : this.vWrmsNorm(this.acor, this.ewt);
				return this.flags.SUCCESS;  /* Convergence achieved */
			}
	
			/* Stop at 3 iterations or if iter. seems to be diverging */
			m++;
			if (m == 3 || (m >= 2 && del > 2 * delp)) {
				return this.flags.CONV_FAIL;
			}
	
			/* Save norm of correction, evaluate f, and loop again */
			delp = del;
			if (!this.ode.calcDy(this.tn, this.y, this.tempv)) {
				this.nfe++;
				return this.flags.RHSFUNC_FAIL;
			}
			this.nfe++;
		}
	}

	/**
	 * @method newtonSolve
	 * @param {Number} flag - convey information about 
	 * @returns {boolean} true, false or null
	 *
	 * This routine attempts to solve the nonlinear system associated
	 * with a single implicit step of the linear multistep method.
	 * 
	 * This routine handles the Newton iteration. It calls lsetup if 
	 * indicated, calls newtonIteration to perform the iteration, and 
	 * retries a failed attempt at Newton iteration if that is indicated.
	 *
	 * Possible return values:
	 *   SUCCESS			--->  continue with error test
	 *   RHS_FAIL,
	 *   LSETUP_FAIL
	 *   LSOLVE_FAIL	--->  halt the integration
	 *   CONV_FAIL		--->  predict again or stop if too many
	*/
	newtonSolve(flag) {
		const vtemp1 = this.acor;  /* rename acor as vtemp1 for readability  */

		/* Set flag convfail, input to lsetup for its evaluation decision */
		let convFail = flag === this.flags.FIRST_CALL || flag === this.flags.PREV_ERR_FAIL;
		convFail = convFail ? this.flags.NO_FAILURES : this.flags.FAIL_OTHER;

		/* Decide whether or not to call setup routine (if one exists) */
		let callSetup = (flag === this.flags.PREV_CONV_FAIL) ||
			(flag === this.flags.PREV_ERR_FAIL) ||
			(this.stepNumber === 0) ||
			(this.stepNumber >= this.setupStepNumber + 20) ||
			(Math.abs(this.gamrat-1) > 0.3);

		/* Looping point for the solution of the nonlinear system.
     Evaluate f at the predicted y, call denseSetup if indicated, and
     call newtonIteration for the Newton iteration itself.      */
  
		for(;;) {
			if (!this.ode.calcDy(this.tn, this.zn[0], this.ftemp)) {
				this.nfe++;
				return this.flags.RHSFUNC_FAIL;
			}
			this.nfe++;
	
			if (callSetup) {
				const result =this.denseSetup(convFail, this.zn[0], this.ftemp, vtemp1);
				callSetup = false;
				this.gamrat = this.crate = 1; 
				this.gammap = this.gamma;
				this.setupStepNumber = this.stepNumber;
				/* Return if lsetup failed */
				if (!result) { return this.flags.LSETUP_FAIL; }
			}

			// Set acor to zero and load prediction into y vector
			this.acor.fill(0);
			this.vScale(1, this.zn[0], this.y);
			
			// Do the Newton iteration
			const iterReturn = this.newtonIteration();
			// console.log(`iterReturn ${iterReturn}`);

			/* If there is a convergence failure and the Jacobian-related 
       data appears not to be current, loop again with a call to lsetup
			 in which convfail=CV_FAIL_BAD_J.  Otherwise return.
			*/
			if (iterReturn !== this.flags.TRY_AGAIN) {
				return iterReturn;
			}
	
			callSetup = true;
			convFail = this.flags.FAIL_BAD_J;
		}
	}

	/**
	 * @method ewtonIteration
	 *
	 * This routine performs the Newton iteration. If the iteration succeeds,
	 * it returns the value SUCCESS. If not, it may signal the newtonSolve 
	 * routine to call denseSetup again and reattempt the iteration, by
	 * returning the value TRY_AGAIN. (In this case, newtonSolve must set 
	 * convfail to FAIL_BAD_J before calling setup again). 
	 * Otherwise, this routine returns one of the appropriate values 
	 * LSOLVE_FAIL, RHSFUNC_FAIL or CONV_FAIL back to newtonSolve.
	 */

	newtonIteration() {
		let m = 0;
		let delp = 0;
		/* Looping point for Newton iteration */
		for(;;) {
			/* Evaluate the residual of the nonlinear system*/
			const b = this.tempv;
			this.vLinearSum(this.rl1, this.zn[1], 1, this.acor, b);
			this.vLinearSum(this.gamma, this.ftemp, -1, b, b);
			
			// Call the back substitute function function to solve the matrix
			MMMath.luBackSubstitute(this.y.length, this.M, b, this.pivot);
			if (this.gamrat !== 1) {
				this.vScale(1/(1 + this.gamrat), b, b);
			}
			
			/* Get WRMS norm of correction; add correction to acor and y */
			const del = this.vWrmsNorm(b, this.ewt);
			this.vLinearSum(1, this.acor, 1, b, this.acor);
			this.vLinearSum(1, this.zn[0], 1, this.acor, this.y);
			
			/* Test for convergence.  If m > 0, an estimate of the convergence
				rate constant is stored in crate, and used in the test.        */
			if (m > 0) {
				this.crate = Math.max(0.3 * this.crate, del/delp);
			}
			const dcon = del * Math.min(1, this.crate) / this.tq[4];
			
			if (dcon <= 1) {
				this.acnrm = (m == 0) ? del : this.vWrmsNorm(this.acor, this.ewt);
				// console.log(`nlstep ${this.setupStepNumber} acnrm ${this.acnrm} ewt ${this.ewt}`);
				this.jcur = false;
				return this.flags.SUCCESS; /* Nonlinear system was solved successfully */
			}
			m++;

			/* Stop at 3 iterations or if iter. seems to be diverging.
				If still not converged and Jacobian data is not current, 
				signal to try the solution again                            */
			if (m == 3 || (m >= 2 && del > 2*delp)) {
				if (!this.jcur) {
					return this.flags.TRY_AGAIN;
				}
				else {
					return this.flags.CONV_FAIL;
				}
			}
			
			/* Save norm of correction, evaluate f, and loop again */
			delp = del;
			if (!this.ode.calcDy(this.tn, this.y, this.ftemp)) {
				this.nfe++;
				return this.flags.RHSFUNC_FAIL;
			}
			this.nfe++;
		} /* end loop */
	}


	/**
	 * denseSetup
	 * @param {Number} convFail 
	 * @param {Float64Arrat} ypred 
	 * @param {Float64Arrat} fpred 
	 * @param {Float64Arrat} vtemp1 
	 * @returns {boolean} true if the LU was complete; otherwise false
	 * This routine does the setup operations for the dense linear solver.
	 * It makes a decision whether or not to call the Jacobian evaluation
	 * routine based on various state variables, and if not it uses the 
	 * saved copy.  In any case, it constructs the Newton matrix 
	 * M = I - gamma*J, updates counters, and calls the dense LU 
	 * factorization routine.
	 */
	denseSetup(convFail, ypred, fpred, vtemp1) {
		/* Use stepNumber, gamma/gammap, and convfail to set J eval. flag jok */
		const dgamma = Math.abs((this.gamma/this.gammap) - 1);
		const jbad = (this.stepNumber === 0) ||
			(this.stepNumber > this.newtonStepNumber + 50) ||
			((convFail === this.flags.FAIL_BAD_J) && (dgamma < 0.2)) ||
			(convFail === this.flags.FAIL_OTHER);

		const jok = !jbad;
		if (jok) {
			/* If jok = TRUE, use saved copy of J */
			this.jcur = false;
			this.vCopy(this.savedJ, this.M);
		}
		else {
			/* If jok = fase, call calcJacobian routine for new J value */
			this.newtonStepNumber = this.stepNumber;
			this.jcur = true; 
			this.M.fill(0);
			if (!this.calcJacobian(this.tn, ypred, fpred, this.M, vtemp1)) {
				this.setError('mmcmd:odeJacobianError', {path: this.getPath()});
				return false;
			}
			// for (let ij = 0; ij < 3; ij++) {
			// 	for (let jj = 0; jj < 3; jj++) {
			// 		console.log(`jac ${ij} ${jj} ${this.M[ij*3 + jj]}`);
			// 	}
			// }
			this.vCopy(this.M, this.savedJ);
		}
		// scale
		const N = ypred.length;
		const N2 = N*N;
		const m = this.M
		for (let i = 0; i < N2; i++) {
			m[i] *= -this.gamma;
		}
		// add identity
		for (let i = 0; i < N; i++) {
			m[i*N + i] += 1;
		}

		// Do LU factorization of M
		const luResult = MMMath.luDecomposition(N, m);
		if (luResult.error) {
			return false;
		}
		this.pivot = luResult.pivot;
		return true;
	}

	/**
	 * @method calcJacobian
	 * @param {Number} t 
	 * @param {Float64Array} y 
	 * @param {Float64Array} fy 
	 * @param {Float64Array} Jac 
	 * @param {Float64Array} ftemp 
	 * @returns {boolean} true if successful
	 */
	calcJacobian(t, y, fy, Jac, ftemp) {
		/* Set minimum increment based on EPSILON and norm of f */
		const N = y.length;
		const srur = Math.sqrt(Number.EPSILON);
		const fnorm = this.vWrmsNorm(fy, this.ewt);
		const minInc = fnorm != 0 ? (1000 * this.h * Number.EPSILON * N * fnorm) : 1;
		for (let j = 0; j < N; j++) {
			/* Generate the jth col of J(tn,y) */
			const yjSaved = y[j];
			const inc = Math.max(srur*Math.abs(yjSaved), minInc/this.ewt[j]);
			y[j] += inc;
			if (!this.ode.calcDy(t, y, ftemp)) {
				this.nfe++;
				return false;
			}
			this.nfe++;
			y[j] = yjSaved;
			const inc_inv = 1/inc;
			for (let i = 0; i < N; i++) {
				Jac[i*N + j] = inc_inv * (ftemp[i] - fy[i]);
			}		
		}
		return true;
	}

	/**
	 * @method restore
	 * @param {Number} savedT
	 *
	 * This routine restores the value of tn to savedT and undoes the
	 * prediction.  After execution of CVRestore, the Nordsieck array zn has
	 * the same values as before the call to CVPredict.
	*/
	restore(savedT)
	{
		this.tn = savedT;
		for (let k = 1; k <= this.q; k++) {
			for (let j = this.q; j >= k; j--) {
				this.vLinearSum(1, this.zn[j-1], -1, this.zn[j], this.zn[j-1]);
			}
		}
	}

	/**
	 * @method doErrorTest
	 * @param {Number} savedT
	 * @param {Number} nErrors - number of error test failures
	 * 
	 * @returns {boolean}
	 *
	 * This routine performs the local error test. 
	 * The weighted local error norm dsm is loaded into returnValue, and 
	 * the test dsm ?<= 1 is made.
	 *
	 * If the test passes, returnValue.succeeded is set true. 
	 *
	 * If the test fails, we undo the step just taken (call restore) and 
	 *
	 *   - if max (7) error test failures have occurred or if h <= 0,
	 *     we return with succeeded = tryAgain = false
	 *
	 *   - if more than 3 error test failures have occurred, an order
	 *     reduction is forced. If already at order 1, restart by reloading 
	 *     zn from scratch. If calcDy() fails we return with succeeded = tryAgain = false
	 * 		 (no recovery is possible at this stage).
	 *
	 *   - otherwise, succeeded = false, and tryAgain = true. 
	 *
	*/
	doErrorTest(savedT, nErrors) {
		const returnValue = {
			succeeded: false,
			tryAgain: false,
			dsm: this.acnrm * this.tq[2],
			nErrors: nErrors
		}

		/* If est. local error norm dsm passes test, return success */  
		if (returnValue.dsm <= 1) {
			returnValue.succeeded = true;
			return returnValue;
		}

		/* Test failed; zn array */
		returnValue.nErrors++;
		this.restore(savedT);

		// At 7 failures or |h| = 0, fail
		if (this.h <= 0 || returnValue.nErrors >= 7) {
			this.setError('odeErrFailure');
			return returnValue;
		} 

		/* Set etamax = 1 to prevent step size increase at end of this step */
		this.etamax = 1;

		/* Set h ratio eta from dsm, rescale, and return for retry of step */
		if (returnValue.nErrors <= 3) {
			this.eta = 1 / (Math.pow(6*returnValue.dsm, 1/this.L) + 1e-6);
			this.eta = Math.max(0.1, this.eta);
			if (returnValue.nErrors >= 2) {
				this.eta = Math.min(this.eta, 0.2);
			}
			this.rescale();
			returnValue.tryAgain = true;
			return returnValue;
		}

		/* After 3 failures, force an order reduction and retry step */
		if (this.q > 1) {
			this.eta = 0.1;
			this.adjustOrder(-1);
			this.L = this.q;
			this.q--;
			this.qwait = this.L;
			this.rescale();
			returnValue.tryAgain = true;
			return returnValue;
		}

		/* If already at order 1, restart: reload zn from scratch */
		this.eta = 0.1;
		this.h *= this.eta;
		this.next_h = this.h;
		this.hscale = this.h;
		this.qwait = 10;
		if (!this.ode.calcDy(this.tn, this.zn[0], this.tempv)) {
			this.nfe++;
			return returnValue;
		}
		this.nfe++;
		this.vScale(this.h, this.tempv, this.zn[1]);
		returnValue.tryAgain = true;
		return returnValue;
	}


	/**
	 * @method setErrorWeight
	 * @param {Float64Array} ycur
	 * @param {FloatArray} weight
	 * This method is responsible for setting the error weight vector weight,
	 * according to the absTol vector length, as follows:
	 *
	 * (1)  weight[i] = 1 / (reltol * ABS(ycur[i]) + *abstol), i=0,...,neq-1
	 *      if absTol.length = 1
	 * (2) weight[i] = 1 / (reltol * ABS(ycur[i]) + abstol[i]), i=0,...,neq-1
	 *      if absTol.length > 1
	 *
	 * @returns {Number} true if ewt is successfully set as above to a
	 * positive vector and true otherwise. In the latter case, ewt is
	 * considered undefined.
	*/
	setErrorWeight(ycur, weight) {
		this.vAbs(ycur, this.tempv);
		if (this.ode.absTol.valueCount === 1) {
			this.vScale(this.relTol, this.tempv, this.tempv);
			this.vAddConst(this.tempv, this.absTol, this.tempv);
		}
		else {
			this.vLinearSum(this.relTol, this.tempv, 1, this.absTol, this.tempv);
		}
		if (this.vMin(this.tempv) < 0) {
			this.setError('odeSetErrorWtFailed');
			return false;
		}
		this.vInv(this.tempv, weight);
		return true;
	}

	/**
	 * @method initializeStepSize
	 * @param {Number} tout
	 * @returns {boolean} true if successful
	 *
	 * Following description is copied, with modifications, from CVOde for CVHin
	 * This routine computes a tentative initial step size h0. 
	 * It will fail if tout is too close to current t
	 * Note that here tout is the value  passed to stepToNextT at the first call.
	 *
	 * The algorithm used seeks to find h0 as a solution of
	 *       (WRMS norm of (h0^2 ydd / 2)) = 1, 
	 * where ydd = estimated second derivative of y.
	 *
	 * We start with an initial estimate equal to the geometric mean of the
	 * lower and upper bounds on the step size.
	 *
	 * Loop up to MAX_ITERS times to find h0.
	 * Stop if new and previous values differ by a factor < 2.
	 * Stop if hnew/hg > 2 after one iteration, as this probably means
	 * that the ydd value is bad because of cancellation error.        
	 *
	 * Finally, we apply a bias (0.5) and verify that h0 is within bounds.
	 */
	initializeStepSize(tout) {
		if (tout === this.tn) { return false; }
		const tdist = tout - this.tn;
		const tround = Number.EPSILON * Math.max(Math.abs(this.tn), Math.abs(tout));
		if (tdist < 2*tround) {
			return false; // too close
		}
		/* 
     Set lower and upper bounds on h0, and take geometric mean 
     as first trial value.
     Exit with this value if the bounds cross each other.
		*/

		/* 
			* Upper bound based on |y0|/|y0'| -- allow at most an increase of
			* 0.1 in y0 (based on a forward Euler step). The weight 
			* factor is used as a safeguard against zero components in y0. 
  	*/
		const temp1 = this.tempv;
		const temp2 = this.acor;
		const hubFactor = 0.1
		const maxIters = 100;
	
		this.vAbs(this.zn[0], temp2);
		if (!this.setErrorWeight(this.zn[0], temp1)) {return false;}
		this.vInv(temp1, temp1);
		this.vLinearSum(hubFactor, temp2, 1, temp1, temp1);
		this.vAbs(this.zn[1], temp2);
		this.vDiv(temp2, temp1, temp1);
		const hub_inv = this.vMaxNorm(temp1);
	
		/*
		 * bound based on tdist -- allow at most a step of magnitude
		 * hubFactor * tdist
		 */
	
		let hub = hubFactor*tdist;
	
		/* Use the smaler of the two */
	
		if (hub*hub_inv > 1) {
			hub = 1/hub_inv;
		}

		// lower bound
		const hlb = 100 * tround;

		let hg  = Math.sqrt(hlb*hub);

		if (hub < hlb) {
			this.h =  hg;
			return true;
		}
	
		let hnewOK = false;
		let hnew = hg;

		for(let count1 = 1; count1 <= maxIters; count1++) {
			/* Attempts to estimate ydd */
			this.vLinearSum(hg, this.zn[1], 1, this.zn[0], this.y);
			if (!this.ode.calcDy(this.tn + hg, this.y, this.tempv)) {
				this.nfe++;
				return false;
			}
			this.nfe++;
			this.vLinearSum(1, this.tempv, -1, this.zn[1], this.tempv);
			this.vScale(1/hg, this.tempv, this.tempv)
		
			const yddnrm = this.vWrmsNorm(this.tempv, this.ewt);

			// If the stopping criteria was met, or if this is the last pass, stop */
			if (hnewOK || (count1 == maxIters))  {
				hnew = hg;
				break;
			}

			/* Propose new step size */
			hnew = (yddnrm*hub*hub > 2) ? Math.sqrt(2/yddnrm) : Math.sqrt(hg*hub);
			const hrat = hnew/hg;

			/* Accept hnew if it does not differ from hg by more than a factor of 2 */
			if ((hrat > 0.5) && (hrat < 2)) {
				hnewOK = true;
			}

			/* After one pass, if ydd seems to be bad, use fall-back value. */
			if ((count1 > 1) && (hrat > 2)) {
				hnew = hg;
				hnewOK = true;
			}

			/* Send this value back through f() */
			hg = hnew;
		}

		/* Apply bounds and bias factor */
		let h0 = 0.5*hnew;
		if (h0 < hlb) { h0 = hlb; }
		if (h0 > hub) { h0 = hub; }
		this.h = h0;
	
		return true;		
	}

	/**
	 * @method getDKy
	 * @param {Number} t
	 * @param {Number} k
	 * @param {Float64Array} dky
	 * @returns {boolean} false if there was an error
	 *
	 * This routine computes the k-th derivative of the interpolating
	 * polynomial at the time t and stores the result in the vector dky.
	 * The formula is:
	 *         q 
	 *  dky = SUM c(j,k) * (t - tn)^(j-k) * h^(-j) * zn[j] , 
	 *        j=k 
	 * where c(j,k) = j*(j-1)*...*(j-k+1), q is the current order, and
	 * zn[j] is the j-th column of the Nordsieck history array.
	 *
	 * This function is called always called with k = 0 and t = tout in this program
	 * but I retained the CVOde form with k
	 */
	getDKy(t, k, dky) {
		if ((k < 0) || (k > this.q)) {
			return false;  // should never happen in this program
		}

		// Allow for some slack
		const tfuzz = 100 * Number.EPSILON * (this.tn + this.hu);
		const tp = this.tn - this.hu - tfuzz;
		const tn1 = this.tn + tfuzz;
		if ((t-tp)*(t-tn1) > 0) {
			return false;
		}
		
		// Sum the differentiated interpolating polynomial
		const s = (t - this.tn) / this.h;
		for (let j = this.q; j >= k; j--) {
			let c = 1;
			for (let i = j; i >= j-k+1; i--) {
				c *= i;
			}
			if (j === this.q) {
				this.vScale(c, this.zn[this.q], dky);
			}
			else {
				this.vLinearSum(c, this.zn[j], s, dky, dky);
			}
		}
		if (k == 0) {
			return true;
		}

		const r = Math.pow(this.h,-k);
		this.vScale(r, dky, dky);
		return true;
	}

	/**
	 * @method vScale
	 * @param {Number} c
	 * @param {Float64Array} x
	 * @param {Float64Array} z
	 * Performs the operation z = c*x
	 */
	vScale(c, x, z) {
		if (x === z) {	// BLAS usage: scale x <- cx
			const count = x.length;
			for (let i = 0; i < count; i++) {
				x[i] *= c;
			}
			return;
		}

		if (c === 1) {
			this.vCopy(x, z);
			return;
		}

		if (c === -1) {
			this.vNeg(x, z);
			return;
		}

		const count = x.length;
		for (let i = 0; i < count; i++) {
			z[i] = c * x[i];
		}
	}

	/**
	 * @method vScaleSum
	 * @param {Number} c
	 * @param {Float64Array} x
	 * @param {Float64Array} y
	 * @param {Float64Array} z
	 * Performs the operation z = c * (x+y)
	 */
	vScaleSum(c, x, y, z) {
		const count = x.length;
		for (let i = 0; i < count; i++) {
			z[i] = c * (x[i] + y[i]);
		}
	}

	/**
	 * @method vScaleDiff
	 * @param {Number} c
	 * @param {Float64Array} x
	 * @param {Float64Array} y
	 * @param {Float64Array} z
	 * Performs the operation z = c * (x-y)
	 */
	vScaleDiff(c, x, y, z) {
		const count = x.length;
		for (let i = 0; i < count; i++) {
			z[i] = c * (x[i] - y[i]);
		}
	}

	/**
	 * @method vCopy
	 * @param {Float64Array} x
	 * @param {Float64Array} z
	 * Performs the operation z = x
	 */
	vCopy(x, z) {
		const count = x.length;
		for (let i = 0; i < count; i++) {
			z[i] = x[i];
		}
	}

	/**
	 * @method vNeg
	 * @param {Float64Array} x
	 * @param {Float64Array} z
	 * Performs the operation z = -x
	 */
	vNeg(x, z) {
		const count = x.length;
		for (let i = 0; i < count; i++) {
			z[i] = -x[i];
		}
	}

	/**
	 * @method vAbs
	 * @param {Float64Array} x
	 * @param {Float64Array} z
	 * Performs the operation z = abs(x)
	 */
	vAbs(x, z) {
		const count = x.length;
		for (let i = 0; i < count; i++) {
			z[i] = Math.abs(x[i]);
		}
	}

	/**
	 * @method vInv
	 * @param {Float64Array} x
	 * @param {Float64Array} z
	 * Performs the operation z = 1 / x
	 * Note - does not check for x[i] == 0
	 */
	vInv(x, z) {
		const count = x.length;
		for (let i = 0; i < count; i++) {
			z[i] = 1 / x[i];
		}
	}

	/**
	 * @method vSum
	 * @param {Float64Array} x
	 * @param {Float64Array} y
	 * @param {Float64Array} z
	 * Performs the operation z = x + y
	 */
	vSum(x, y, z) {
		const count = x.length;
		for (let i = 0; i < count; i++) {
			z[i] = x[i] + y[i];
		}
	}

	/**
	 * @method vDiff
	 * @param {Float64Array} x
	 * @param {Float64Array} y
	 * @param {Float64Array} z
	 * Performs the operation z = x - y
	 */
	vDiff(x, y, z) {
		const count = x.length;
		for (let i = 0; i < count; i++) {
			z[i] = x[i] - y[i];
		}
	}

	/**
	 * @method vDiv
	 * @param {Float64Array} x
	 * @param {Float64Array} y
	 * @param {Float64Array} z
	 * Performs the operation z = x / y
	 */
	vDiv(x, y, z) {
		const count = x.length;
		for (let i = 0; i < count; i++) {
			z[i] = x[i] / y[i];
		}
	}

	/**
	 * @method vAddConst
	 * @param {Float64Array} x
	 * @param {Float64Array} b
	 * @param {Float64Array} z
	 * Performs the operation z[i] = x[i] + b
	 */
	vAddConst(x, b, z) {
		const count = x.length;
		for (let i = 0; i < count; i++) {
			z[i] = x[i] + b;
		}
	}

	/**
	 * @method vMin
	 * @param {Float64Array} x
	 * @returns {Number}
	 */
	vMin(x) {
		return Math.min(...x);
	}

	/**
	 * @method vMax
	 * @param {Float64Array} x
	 * @returns {Number}
	 */
	vMax(x) {
		return Math.max(...x);
	}

	/**
	 * @method vMaxNorm
	 * @param {Float64Array} x
	 * @returns {Number}  the maximum norm of x:
	 * 	max (i = 0 to N-1) abs(x[i])
	 */
	vMaxNorm(x) {
		let max = 0;
		const count = x.length;
		for (let i = 0; i < count; i++) {
			const absX = Math.abs(x[i]);
			if (absX > max) {
				max = absX;
			}
		}
		return max;
	}

	/**
	 * @method vLinearSum
	 * @param {Number} a
	 * @param {Float64Array} x
	 * @param {Number} b
	 * @param {Float64Array} y
	 * @param {Float64Array} z
	 * Performs the operation z = a*x + b*y
	 */
	vLinearSum(a, x, b, y, z) {
		if ((b === 1) && (z == y)) {    /* BLAS usage: axpy y <- ax+y */
			this.vAxpy(a,x,y);
			return;
		}
	
		if ((a == 1) && (z == x)) {    /* BLAS usage: axpy x <- by+x */
			this.vAxpy(b,y,x);
			return;
		}
	
		/* Case: a == b == 1.0 */
		if (a === 1 && b == 1) {
			this.vSum(x, y, z);
		}

		/* Cases: (1) a == 1.0, b = -1.0, (2) a == -1.0, b == 1.0 */
		let test = (a === 1) && (b === -1);
		if (test || ((a === -1) && (b === -1))) {
			const v1 = test ? y : x;
			const v2 = test ? x : y;
			this.vDiff(v2, v1, z);
			return;
		}
		
		/* Cases: (1) a == 1.0, b == other or 0.0, (2) a == other or 0.0, b == 1.0 */
		/* if a or b is 0.0, then user should have called N_VScale */
		test = (a === 1);
		if (test || b === 1) {
			const c  = test ? b : a;
			const v1 = test ? y : x;
			const v2 = test ? x : y;
			this.vLin1(c, v1, v2, z);
			return;
		}

		/* Cases: (1) a == -1.0, b != 1.0, (2) a != 1.0, b == -1.0 */
		test = (a === -11);
		if (test || b === -1) {
			const c  = test ? b : a;
			const v1 = test ? y : x;
			const v2 = test ? x : y;
			this.vLin2(c, v1, v2, z);
			return;
		}

		/* Case: a == b */
		/* catches case both a and b are 0.0 - user should have called N_VConst */
		if (a === b) {
			this.vScaleSum(a, x, y, z);
			return;
		}

		/* Case: a == -b */
		/* catches case both a and b are 0.0 - user should have called N_VConst */
		if (a === -b) {
			this.vScaleDiff(a, x, y, z);
			return;
		}

		/* Do all cases not handled above:
     (1) a == other, b == 0.0 - user should have called N_VScale
     (2) a == 0.0, b == other - user should have called N_VScale
     (3) a,b == other, a !=b, a != -b */
		const count = x.length;
		for (let i = 0; i < count; i++) {
			z[i] = a*x[i] + b*y[i];
		}
	}

	/**
	 * @method vLin1
	 * @param {Number} a
	 * @param {Float64Array} x
	 * @param {Float64Array} y
	 * @param {Float64Array} z
	 * Performs the operation z = ax + y 
	 */
	vLin1(a, x, y, z) {
		const count = x.length;
		for (let i = 0; i < count; i++) {
			z[i] = a*x[i] + y[i];
		}
	}

	/**
	 * @method vLin2
	 * @param {Number} a
	 * @param {Float64Array} x
	 * @param {Float64Array} y
	 * @param {Float64Array} z
	 * Performs the operation z = ax - y 
	 */
	vLin2(a, x, y, z) {
		const count = x.length;
		for (let i = 0; i < count; i++) {
			z[i] = a*x[i] - y[i];
		}
	}

	/**
	 * @method vAxpy
	 * @param {Number} a
	 * @param {Float64Array} x
	 * @param {Float64Array} y
	 * Performs the operation y <- ax+y 
	 */
	vAxpy(a, x, y) {
		const count = x.length;
		for (let i = 0; i < count; i++) {
			y[i] += a*x[i];
		}
	}

	/**
	 * @method vWrmsNorm
	 * @param {Float64Array} x
	 * @param {Float64Array} w
	 * @returns {Number}
	 * the weighted root mean square norm of x with weight 
	 *   vector w:
	 *         sqrt [(sum (i = 0 to N-1) {(x[i]*w[i])^2})/N]

	 * Performs the operation z = x / y
	 */
	vWrmsNorm(x, w) {
		const count = x.length;
		let sum = 0.0;
		for (let i = 0; i < count; i++) {
		const prodi = x[i]*w[i];
		sum += prodi * prodi;
		}
		return Math.sqrt(sum/count);
	}

}