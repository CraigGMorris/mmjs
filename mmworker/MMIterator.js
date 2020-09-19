'use strict';
/* global
	MMTool:readonly
	MMFormula:readonly
	MMPropertyType:readonly
	MMNumberValue:readonly
	MMTableValueColumn:readonly
	MMTableValue:readonly
*/

/**
 * @class MMIterator
 * @extends MMTool
 */
// eslint-disable-next-line no-unused-vars
class MMIterator extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Iterator');
		this.recordedValueFormulas = [];
		this.lastRecordedFormula = 1;		// used for naming recorded value formulas
		this.recordedValues =	[];

		this.i = MMNumberValue.scalarValue(1);

		this.whileFormula = new MMFormula('while', this);
		this.whileFormula.formula = '{le $.i, 10}';

		this.initialXFormula = new MMFormula('initialX', this);
		this.initialXFormula.formula = '1';

		this.nextXFormula = new MMFormula('nextX', this);
		this.nextXFormula.formula = '$.x + 1';

		this.x = null;
		this.isHidingInfo = false;   // needed because the formula assigns will reset
		this.shouldAutoRun = false;
		this.isSolved = false;
		this.isSolving = false;
		this.isLoadingCase = false;
	}

	/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o = super.saveObject();
		o['Type'] = 'Iterator';
		o['whileFormula'] = {Formula: this.whileFormula.formula}
		o['initXFormula'] = {Formula: this.initialXFormula.formula}
		o['nextXFormula'] = {Formula: this.nextXFormula.formula}

		o['recFormulas'] = this.recordedValueFormulas.map(f => {
			return {Formula: f.formula}
		});

		if (this.shouldAutoRun) {
			o['AutoRun'] = 'y';
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
			this.whileFormula.formula = saved.whileFormula.Formula;
			this.initialXFormula.formula = saved.initXFormula.Formula;
			this.nextXFormula.formula = saved.nextXFormula.Formula;
			const recFormulas = saved.recFormulas;
			if (recFormulas) {
				for (let f of recFormulas) {
					const formula = this.addRecordedValue();
					formula.formula = f.Formula;
				}
			}
			this.shouldAutoRun = saved.AutoRun === 'y';
		}
		finally {
			this.isLoadingCase = false;
		}
	}

	/**
	 * @method addRecordedValue
	 * @returns MMFormula
	 */
	addRecordedValue() {
		const formula = new MMFormula(`r${this.lastRecordedFormula++}`, this);
		formula.formula = '$.i';
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
		this.resetRecordedValues();
		this.i.values[0] = 1;
		this.forgetStep();
		this.isSolved = false
		this.x = null;
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
	 * @override forgetCalculated
	 */
	forgetCalculated() {
		if (!this.forgetRecursionBlockIsOn) {
			this.reset();
			if (this.shouldAutoRun) {
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
	 * @method columnNameForRecorded
	 * @param {Number} rNumber - the record value number
	 * @returns {String} - the name for recorded value rNumber
	 */
	columnNameForRecorded(rNumber) {
		if (rNumber > 0 && rNumber <= this.recordedValues.length) {
			const formula = this.recordedValueFormulas[rNumber - 1];
			const parts = formula.formula.split("'");
			if (parts.length > 1) {
				const comment = parts[1].trim();
				return comment.replace(/\s/g,'_');
			}
			else
				return formula.formula;
		}
		return null;
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
	 * @override valueDescribedBy
	 * @param {String} description
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueDescribedBy(description, requestor) {
		const lcDescription = description.toLowerCase();
		if (lcDescription.length === 0) {
			return super.valueDescribedBy(description, requestor);
		}
		if (lcDescription === 'solved') {
			if (this.isSolved) {
				this.addRequestor(requestor);
				return MMNumberValue.scalarValue(1);
			}
			else {
				return null;
			}
		}

		if (!this.isSolved && !this.isSolving && this.shouldAutoRun) {
			this.resetRecordedValues();
			this.solve();
		}

		// convenience function to add requestor is return value is known
		const returnValue = (v) => {
			if (v) {
				this.addRequestor(requestor);
				return v;
			}
		};

		const makeTable = () => {
			const count = this.recordedValueFormulas.length;
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
							name: name, displayUnit: v.defaultUnit.name, value: v.columnNumber(cNumber)
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
			return new MMTableValue({columns: columns});
		}

		switch (lcDescription) {
			case 'i':
				return returnValue(this.i);

			case 'x':
				if (!this.x) {
					this.x = this.initialXFormula.numberValue();
				}
				return returnValue(this.x);
			
			case 'while':
				return returnValue(this.whileFormula.numberValue());
			
			case 'initx':
				return returnValue(this.initialXFormula.numberValue());
						
			case 'nextx':
				return returnValue(this.nextXFormula.numberValue());
	
			case 'table': 
				return returnValue(makeTable());
			
			default:
				if (lcDescription.match(/^r\d+$/)) {
					const rNumber = parseInt(lcDescription.substring(1));
					return returnValue(this.valueForRecorded(rNumber));
				}
				else {
					// see if it matches any recorded value comment
					const count = this.recordedValueFormulas.length;
					for (let rNumber = 1; rNumber <= count; rNumber++) {
						const columnName = this.columnNameForRecorded(rNumber);
						if (lcDescription == columnName.toLowerCase()) {
							return returnValue(this.valueForRecorded(rNumber));
						}
					}
				}
				break;
		}
	}

	/**
	 * @method solve
	 */
	solve() {
		this.isSolving = true;
		this.x = null;
		this.valueDescribedBy('x');
		const setStatus = () => {
			this.processor.statusCallBack(this.t('mmcmd:iterStatus', {
				name: this.name,
				i: this.i.stringUsingUnit(),
				x: this.x ? this.x.stringUsingUnit() : '',
			}));
		}

		let test = null;
		this.forgetStep();
		try {
			test = this.whileFormula.numberValue();
			let lastStatusTime = Date.now();

			while (test && test.valueCount && test.values[0]) {
				test = null;
				this.forgetStep();
				if (!this.recordCurrentValues()) {
					this.shouldAutoRun = false;
					break;
				}
				this.i.values[0]++;
				const nextX = this.nextXFormula.value();
				this.x = nextX;
				test = this.whileFormula.numberValue();

				const now = Date.now();
				if (now - lastStatusTime > 1000) {
					setStatus();
					lastStatusTime = now;
					console.log(`iter i ${this.i.values[0]} test ${test.values[0]}`);
				}
			}
		}
		catch(e) {
			this.shouldAutoRun = false;
			this.setError('mmcmd:iterException', {path: this.getPath(), e: e.message});
		}
		finally {
			this.isSolving = false;
			this.isSolved = test && this.shouldAutoRun;
		}
	}

	/**
	 * @method inputSources
	 * @override
	 * @returns {Set} contains tools referenced by this tool
	 */
	inputSources() {
		let sources = super.inputSources();
		this.whileFormula.addInputSourcesToSet(sources);
		this.initialXFormula.addInputSourcesToSet(sources);
		this.nextXFormula.addInputSourcesToSet(sources);
	
		for (let formula of this.recordedValueFormulas) {
			formula.addInputSourcesToSet(sources);
		}
		
		return sources;
	}

	/** @override */
	get properties() {
		let d = super.properties;
		d['shouldAutoRun'] = {type: MMPropertyType.boolean, readOnly: false};
		return d;
	}

	get shouldAutoRun() {
		return this._shouldAutoRun;
	}

	set shouldAutoRun(newValue) {
		this._shouldAutoRun = (newValue) ? true : false;
		this.reset();
	}

	/** @override */
		get verbs() {
			let verbs = super.verbs;
			verbs['reset'] = this.resetCommand;
			verbs['addrecorded'] = this.addRecordedCommand;
			verbs['removerecorded'] = this.removeRecordedCommand;
			return verbs;
		}
	
		/** @method getVerbUsageKey
		 * @override
		 * @param {string} command - command to get the usage key for
		 * @returns {string} - the i18n key, if it exists
		 */
		getVerbUsageKey(command) {
			let key = {
				reset: 'mmcmd:?iterReset',
				addrecorded: 'mmcmd:?iterAddRecorded',
				removerecorded: 'mmcmd:?iterRemoveRecorded',
			}[command];
			if (key) {
				return key;
			}
			else {
				return super.getVerbUsageKey(command);
			}
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
		this.removeRecordedValue(parseInt(command.args));
		command.results = 'removed recorded';
	}

	/**
	 * @method toolViewInfo
	 * @override
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	toolViewInfo(command) {
		super.toolViewInfo(command);
		const results = command.results;
		results.shouldAutoRun = this.shouldAutoRun;

		const fReturn = (formula) => {
			const v = formula.value();
			const vString = v ? v.stringWithUnit() : '';
			return [formula.name, formula.formula, vString];
		}
		const formulas = [];
		formulas.push(fReturn(this.whileFormula));
		formulas.push(fReturn(this.initialXFormula));
		formulas.push(fReturn(this.nextXFormula));
		for (let rv of this.recordedValueFormulas) {
			formulas.push(fReturn(rv));
		}
		results.i = this.i.values[0];
		results.x = this.x ? this.x.values[0] : '';
		results.xunit = this.x ? this.x.defaultUnit.name : '';

		results.formulas = formulas;
	}

}