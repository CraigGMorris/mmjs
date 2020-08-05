'use strict';
/* global
	MMTool:readonly
	MMFormula:readonly
	MMPropertyType:readonly
	MMNumberValue:readonly
	theMMSession:readonly
	MMMath:readonly
	MMCommandMessage:readonly
*/

/**
 * @class MMSolver
 * @extends MMTool
 */
// eslint-disable-next-line no-unused-vars
class MMSolver extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Solver');
		this.maxIterFormula = new MMFormula('maxIter', this);
		this.maxJacobianFormula = new MMFormula('maxJacobian', this);
		this.maxIterFormula.formula = '200';
		this.maxJacobianFormula.formula = '5';
		this.isHidingInfo = false;  // needed because the formula assigns will reset
		this.isEnabled = false;
		this.isRunning = false;
		this.isInError = false;
		this.isConverged = false;
		this.functions = [];
		this.addFunction();
	}

	/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o = super.saveObject();
		o['Type'] = 'Equation Solver';
		const functionCount = this.functions.length;
		for (let i = 0; i < functionCount; i++) {
			const func = this.functions[i];
			o[`f${i}`] = func.errorFormula.formula;
			o[`c${i}`] = func.countFormula.formula;
			if (this.isConverged) {  // don't want to accidentally save nans as the json will fail
				o[`o${i}`] = this.outputs;
			}
		}

		const numberOrString = (s) => {
			// Apple MM has numbers, not strings for maxIter and maxJacobian
			// if possible, conform
			if (s.match(/[^\d]/)) {
				// it has non integers so must save as string
				return s
			}
			else {
				// pure number
				return parseInt(s);
			}
		}
		o['maxIter'] = numberOrString(this.maxIterFormula.formula);
		o['maxJacobians'] = numberOrString(this.maxJacobianFormula.formula);
		if (this.isEnabled) {
			o['Enabled'] = 'y';
		}
		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		super.initFromSaved(saved);
		let functionNumber = 0;
		for (;;) {
			const errorFormula = saved[`f${functionNumber}`];
			const countFormula = saved[`c${functionNumber}`];
			if (typeof errorFormula === 'string' && typeof countFormula === 'string') {
				const func = {
					errorFormula: new MMFormula(`formula_${functionNumber+1}`, this),
					countFormula: new MMFormula(`count_${functionNumber+1}`, this),
					outputs: [0]
				};
		
				func.errorFormula.formula = errorFormula;
				func.countFormula.formula = countFormula;
				const outputs = saved[`o${functionNumber}`];
				if (outputs) {
					func.outputs = outputs;
				}
				this.functions[functionNumber] = func;
				functionNumber++;
			}
			else {
				break;
			}
		}

		const maxIter = saved.maxIter;
		if (maxIter) {
			if (typeof maxIter === 'number') {
				this.maxIterFormula.formula = `${maxIter}`;
			}
			else if (typeof maxIter === 'string') {
				this.maxIterFormula.formula = maxIter;
			}
		}

		const maxJacobians = saved.maxJacobians;
		if (maxJacobians) {
			if (typeof maxJacobians === 'number') {
				this.maxJacobianFormula.formula = `${maxJacobians}`;
			}
			else if (typeof maxIter === 'string') {
				this.maxJacobiansFormula.formula = maxJacobians;
			}
		}

		if (saved.Enabled) {
			this.isEnabled = true;
		}
	}

	/** @override */
	get properties() {
		let d = super.properties;
		d['isEnabled'] = {type: MMPropertyType.boolean, readOnly: false};
		return d;
	}

	get isEnabled() {
		return this._isEnabled;
	}

	set isEnabled(newValue) {
		this._isEnabled = (newValue) ? true : false;
	}
	
	/** @method addFunction
	 * @param rowNumber - 1 based row position to insert function - if missing, add at end
	 * @returns {Number} - the actual 1 based row of the new function
	 */
	addFunction(rowNumber) {
		this.setEnabled(false);
		const functionNumber = rowNumber && rowNumber < this.functions.length + 1 ? rowNumber : this.functions.length + 1;
		for (let i = this.functions.length - 1; i >= functionNumber - 1; i--) {
			const func = this.functions[i];  // note this is a MM object not a JS function
			this.renameChild(func.errorFormula.name, `formula_${i + 2}`);
			this.renameChild(func.countFormula.name, `count_${i + 2}`);
		}
		const func = {
			errorFormula: new MMFormula(`formula_${functionNumber}`, this),
			countFormula: new MMFormula(`count_${functionNumber}`, this),
			outputs: [1]
		};
		this.functions.splice(functionNumber - 1, null, func);
		func.countFormula.formula = "1";
		return functionNumber;
	}

	/**
	 * @method removeFunction
	 * @param {Number} rowNumber - 1 based
	 */
	removeFunction(rowNumber) {
		this.setEnabled(false);
		const functionNumber = rowNumber - 1;
		if (functionNumber < this.functions.length) {
			this.functions.splice(functionNumber,1);  // delete from functions array
			this.removeChildNamed(`formula_${rowNumber}`);
			this.removeChildNamed(`count_${rowNumber}`)
			for (let i = functionNumber + 1; i < this.functions.length; i++) {
				const func = this.functions[i];
				this.renameChild(func.errorFormula.name, `formula_${i}`);
				this.renameChild(func.countFormula.name, `count_${i}`);
			}
			this.forgetCalculated();
		}
	}

	/**
	 * @method jsonForFunction
	 * @param {Number} functionNumber
	 * @returns {String} json representation of the function
	 */
	jsonForFunction(functionNumber) {
		const func = this.functions[functionNumber - 1];
		const obj = {
			number: functionNumber,
			error: func.errorFormula.formula,
			count: func.countFormula.formula
		}
		return JSON.stringify(obj);
	}

	/** @method setEnabled
	 * @param {boolean} newState
	 */
	setEnabled(newState) {
		if (this.isEnabled !== newState) {
			this.isEnabled = newState;
			if (newState && !this.isConverged) {
				this.isInError = false;
				this.calculate();
			}
		}
	}

	/**
	 * @method addFunctionCommand
	 * @param {MMCommand} command
	 * if supplied, command.args should be the 1 based row number where the function is inserted
	 */
	addFunctionCommand(command) {
		let insertRow = parseInt(command.args);
		if (isNaN(insertRow)) {
			insertRow = null;
		}
		const row = this.addFunction(insertRow);
		if (!command.error) {
			command.results = row;
			command.undo = `${this.getPath()} removefunction ${row}}`;
		}
	}

	/**
	 * @method removeFunctionCommand
	 * @param {MMCommand} command
	 * command.args should be the 1 based row number of the function to remove
	 */
	removeFunctionCommand(command) {
		if (this.functions.length < 2) {
			return;	// should always keep at least one function
		}
		let removeRow = parseInt(command.args);
		if (isNaN(removeRow) || removeRow < 1 || removeRow > this.functions.length) {
			this.setError('mmcmd:solverRemoveRowError', {row: command.args, path: this.getPath()});
			return;
		}
		const functionJson = this.jsonForFunction(removeRow);
		this.removeFunction(removeRow);
		command.undo = `__blob__${this.getPath()} restorefunction__blob__${functionJson}`;
	}

	/**
	 * @method restoreFunctionCommand
	 * @param {MMCommand} command
	 * command.args should be the json for the function to restore
	 */
	restoreFunctionCommand(command) {
		try {
			const func = JSON.parse(command.args);
			const row = this.addFunction(func.number) - 1;
			const addedFunc = this.functions[row];
			addedFunc.errorFormula.formula = func.error;
			addedFunc.countFormula.formula = func.count;
		}
		catch(e) {
			this.setError('mmcmd:solverRestoreError', {path: this.getPath(), json: command.args});
		}
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['addfunction'] = this.addFunctionCommand;
		verbs['removefunction'] = this.removeFunctionCommand;
		verbs['restorefunction'] = this.restoreFunctionCommand;
		verbs['reset'] = this.resetOutputs;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			addfunction: 'mmcmd:?solverAddFunction',
			removefunction: 'mmcmd:?solverRemoveFunction',
			reset: 'mmcmd:?solverReset'
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}


	/**
	 * @method getOutputs
	 * @param {Number} n - the function number
	 * @returns {[Number]} - array of outputs for that function
	 * resizes outputs if its size doesn't match the count formula value
	 */
	getOutputs(n) {
		const func = this.functions[n];
		const fCount = func.countFormula.value();
		if (fCount instanceof MMNumberValue) {
			const calcedCount = fCount.values[0];
			if (calcedCount !== func.outputs.length) {
				func.outputs = Array(calcedCount).fill(0);
			}
		}
		else {
			func.outputs = [0];
		}
		return func.outputs;
	}

	/**
	 * @method resetOutputs
	 * set all outputs to 0
	 */
	resetOutputs() {
		this.setEnabled(false);
		const nFunctions = this.functions.length;
		for (let i = 0; i < nFunctions; i++) {
			const func = this.functions[i];
			func.outputs = [0];
			this.getOutputs(i);
		}
		this.forgetCalculated();
	}

	/**
	 * @method removeFunctionCommand
	 * @param {MMCommand} command
	 * command.args should be the 1 based row number of the function to remove
	 */
	resetOutputsCommand(command) {
		this.resetOutputs;
		command.results = 'reset done';
	}

	/**
	 * @method forgetStep
	 * forgets calculations for a calculation step
	 */
	forgetStep() {
		if (!this.forgetRecursionBlockIsOn) {
			try {
				this.forgetRecursionBlockIsOn = true;
				for (const requestor of this.valueRequestors) {
					requestor.forgetCalculated();
				}
				this.valueRequestors.clear();
				super.forgetCalculated();
				this.isConverged = false;
			}
			finally {
				this.forgetRecursionBlockIsOn = false;
			}
		}
	}

	/**
	 * @override forgetCalculated
	 */
	forgetCalculated() {
		this.forgetStep();
		try {
			this.forgetRecursionBlockIsOn = true;
			if (this.isInError && this.isEnabled) {
				this.isInError = false;
				this.resetOutputs();
				this.setEnabled(true);
			}
			else {
				this.isInError = false;
			}
		}
		finally {
			this.forgetRecursionBlockIsOn = false;
		}
	}

	/**
	 * @method solve
	 */
	solve() {
		// check if all the fx can be calculated
		this.isRunning = true;
		this.isConverged = false;
		const functionCount = this.functions.length;
		let totalNumberOfEqns = 0;
		for (let i = 0; i < functionCount; i++) {
			const func = this.functions[i]
			const cx = func.countFormula.value();
			if (!cx) { return; }
			const fx = func.errorFormula.value();
			if (!fx) { return; }

			const nx = cx.values[0];
			if (fx.valueCount !== nx) {
				this.setError('mmcmd:solverCountMismatch', {fn: i+1, nFx: fx.valueCount, nx: nx});
				this.isRunning = false;
				this.isEnabled = false;
				return;
			}
			totalNumberOfEqns += nx;
		}

		try {
			if (totalNumberOfEqns === 1) {
				MMMath.brentSolve({
					fx: (x) => {
						this.forgetStep();
						const func = this.functions[0];
						func.outputs[0] = x;
						const fx = this.valueDescribedBy('f1');
						if (fx instanceof MMNumberValue) {
							return fx.values[0];
						}
						else {
							let msg = new MMCommandMessage('mmcmd:solverFxFail', {path: this.getPath()});
							throw(msg);
						}
					}
				})
			}
		}
		catch(e) {
			this.isInError = true;
			this.isConverged = false;
			this.caughtException(e);
		}
		finally {
			this.isRunning = false;
		}

	}

	/**
	 * @override valueDescribedBy
	 * @return {MMNumberValue}
	 * @param {String} description
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueDescribedBy(description, requestor) {
		const lcDescription = description.toLowerCase();
		if (lcDescription.length === 0 || this.functions.length === 0) {
			return super.valueDescribedBy(description, requestor);
		}
		if (lcDescription === 'solved') {
			if (this.isConverged && this.isEnabled && !this.isInError) {
				return MMNumberValue.scalarValue(1);
			}
			else {
				return null;
			}
		}

		if (lcDescription.startsWith('c')) {
			const n = parseInt(lcDescription.substring(1));
			if (isNaN(n) || n < 1 || n > this.functions.length) {
				return null;
			}
			const v = this.functions[n-1].countFormula.value();
			if (v) {
				this.addRequestor(requestor);
			}
			return v;
		}

		if (!this.isConverged && !this.isRunning && this.isEnabled && !this.isInError) {
			this.solve();
		}

		if (lcDescription.startsWith('f')) {
			const n = parseInt(lcDescription.substring(1));
			if (isNaN(n) || n < 1 || n > this.functions.length) {
				return null;
			}
			const v = this.functions[n-1].errorFormula.value();
			if (v) {
				this.addRequestor(requestor);
			}
			return v;
		}
		else {
			const n = parseInt(lcDescription);
			if (isNaN(n) || n < 1 || n > this.functions.length) {
				return null;
			}
			const func = this.functions[n-1];
			const countValue = func.countFormula.value();
			if (!countValue) { return null; }
			const count = countValue.values[0];
			if (count < 1) { return null; }
			this.addRequestor(requestor);
			const outputs = this.getOutputs(n-1);
			return MMNumberValue.numberArrayValue(outputs);
		}
	}

		/**
	 * @method inputSources
	 * @override
	 * @returns {Set} contains tools referenced by this tool
	 */
	inputSources() {
		let sources = super.inputSources();
		this.maxIterFormula.addInputSourcesToSet(sources);
		this.maxJacobianFormula.addInputSourcesToSet(sources);
		const functionCount = this.functions.length;
		for (let i = 0; i < functionCount; i++) {
			const func = this.functions[i];
			func.errorFormula.addInputSourcesToSet(sources);
			func.countFormula.addInputSourcesToSet(sources);
		}
		return sources;
	}

	/**
	 * @method changedFormula
	 * @override
	 * @param {MMFormula} formula
	 */
	// eslint-disable-next-line no-unused-vars
	changedFormula(formula) {
		if (!theMMSession.isLoadingCase) {
			this.setEnabled(false);
			if (formula && formula.name.startsWith('count_')) {
				const n = parseInt(formula.name.substring(6));
				this.getOutputs(n-1);
			}
		}
		super.changedFormula(formula);
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
		const formulas = {
			'maxIter': this.maxIterFormula.formula,
			'maxJacobian': this.maxJacobianFormula.formula,
		}
		const fv = [];
		const functionCount = this.functions.length;
		for (let i = 0; i < functionCount; i++) {
			const func = this.functions[i];
			formulas[`formula_${i+1}`] = func.errorFormula.formula;
			formulas[`count_${i+1}`] = func.countFormula.formula;
			const v = func.errorFormula.value();
			const vX = this.valueDescribedBy(`${i+1}`);
			fv.push({
				x: vX ? vX.stringUsingUnit() : '---',
				fx: v ? v.stringUsingUnit() : '---'
			});
		}
		results['formulas'] = formulas;
		results['fv'] = fv;
		results['isEnabled'] = this.isEnabled;
		results['isConverged'] = this.isConverged;
		results['isInError'] = this.isInError;
		// const v = this.valueDescribedBy: [ NSString stringWithFormat: @"f%lu", (unsigned long)indexPath.row + 1 ] forRequestor: nil ];
	}
}
