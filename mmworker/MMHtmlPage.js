'use strict';
/* global
	MMTool:readonly
	MMFormula:readonly
	MMValue:readonly
	MMStringValue:readonly
	MMNumberValue:readonly
	theMMSession:readonly
	MMDataTable:readonly
*/

/**
 * @class MMHtmlPage
 * @extends MMTool
 */
// eslint-disable-next-line no-unused-vars
class MMHtmlPage extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'HtmlPage');
		this.formula = new MMFormula('Formula', this);
		this.tagFormulas = [];
		this.inputs = null;
		this.rawHtml = null;
		this.processedHtml = null;
	}

	/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o = super.saveObject();
		o.Type = 'HTML Form';
		o['Formula'] = {Formula: this.formula.formula};
		if (this.inputs) {
			o.inputs = this.inputs;
		}

		const formulaCount = this.tagFormulas.length;
		for (let i = 0; i < formulaCount; i++) {
			const formula = this.tagFormulas[i];
			o[`f${i}`] = formula.formula;
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
			this.formula.formula = saved.Formula.Formula;
			this.inputs = saved.inputs;
			let formulaNumber = 0;
			let tagFormula;
			do {
				const name = `f${formulaNumber}`;
				tagFormula = saved[name];
				if (tagFormula) {
					const formula = new MMFormula(name, this);
					formula.formula = tagFormula;
					this.tagFormulas.push(formula);
					formulaNumber++;
				}
			} while(tagFormula);


		}
		finally {
			this.isLoadingCase = false;
		}
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['htmlaction'] = this.actionCommand;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			htmlaction: 'mmcmd:?htmlAction',
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}

	/**
	 * @method inputSources
	 * @override
	 * @returns {Set} contains tools referenced by this tool
	 */
	inputSources() {
		let sources = super.inputSources();
		this.formula.addInputSourcesToSet(sources);	
		for (let formula of this.tagFormulas) {
			formula.addInputSourcesToSet(sources);
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
			super.forgetCalculated();
			if (!this.retainCurrentHtml) {
				this.processedHtml = null;
				this.rawHtml = null;
			}

			this.forgetRecursionBlockIsOn = false;
		}
	}

	/**
	 * @override valueDescribedBy
	 * @param {String} description
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueDescribedBy(description, requestor) {
		const lcDescription = description.toLowerCase();
		let value = null;
		if (lcDescription.length === 0) {
			return super.valueDescribedBy(description, requestor);
		}
		if (lcDescription === 'html') {
			if (!this.processedHtml) {
				this.htmlForRequestor(requestor);
			}
			if (this.processedHtml) {
				this.addRequestor(requestor);
				value = MMStringValue.scalarValue(this.processedHtml);
			}
		}
		else if (lcDescription === 'myformula') {
			if ( this.formula.formula ) {
				value = MMStringValue.scalarValue(this.formula.formula);
			}
		}
		else if (this.inputs) {
			const inputValue = this.inputs[lcDescription];
			if (inputValue) {
				const valueType = typeof inputValue;
				if (valueType === 'string') {
					value = MMStringValue.scalarValue(inputValue);
				}
				else if (valueType === 'number') {
					value = MMNumberValue.scalarValue(inputValue);
				}
				else if (Array.isArray(inputValue)) {
					const rowCount = inputValue.length;
					if (rowCount) {
						const firstValue = inputValue[0];
						if (typeof firstValue === 'string') {
							value = new MMStringValue(rowCount, 1);
						}
						else if (typeof firstValue === 'number') {
							value = new MMNumberValue(rowCount, 1);
						}
						if (value) {
							const v = value.values;
							for (let i = 0; i < rowCount; i++) {
								v[i] = inputValue[i];
							}
						}
						else if (Array.isArray(firstValue)) {
							const columnCount = firstValue.length;
							if (columnCount) {
								const firstColumnValue = firstValue[0];
								if (typeof firstColumnValue === 'string') {
									value = new MMStringValue(rowCount, columnCount);
								}
								else if (typeof firstColumnValue === 'number') {
									value = new MMNumberValue(rowCount, columnCount);
								}
								if (value) {
									const v = value.values;
									for (let r = 0; r < rowCount; r++) {
										for (let c = 0; c < columnCount; c++) {
											v[r*columnCount + c] = inputValue[r][c];
										}
									}	
								}	
							}
						}
					}
				}
			}
		}
		if (value) {
			this.addRequestor(requestor);
		}
		return value;
	}

	/**
	 * @method action
	 * @param {String} jsonMessage 
	 * @returns {String}
	 * performs action indicated in jsonMessage
	 */
	action(jsonMessage) {
		const response = {}
		try {
			const message = JSON.parse(jsonMessage);
			if (message.callBackNumber !== null) {
				response.callBackNumber = message.callBackNumber;
			}
			if (message.inputs) {
				let foundNewInput = false;
				for (let inputName of Object.keys(message.inputs)) {
					const lcInputName = inputName.toLowerCase()
					const input = message.inputs[inputName];
					const newValue = (isNaN(input) || isNaN(parseFloat(input))) ? input : parseFloat(input);
					if (!this.inputs) {
						this.inputs = {}
					}
					if (newValue != this.inputs[lcInputName]) {
						this.inputs[lcInputName] = newValue;
						foundNewInput = true;
					}
				}
				if (foundNewInput) {
					this.forgetCalculated();
				}
			}

			const actions = {};
			if (message.requests) {
				const requestResults = {};
				for (let name of Object.keys(message.requests)) {
					if (name.startsWith('mm_')) {
						actions[name.toLowerCase()] = message.requests[name];
						console.log(`action ${name}`)
					}
					else {
						const formula = new MMFormula(`r_${name}`, this);
						formula.formula = message.requests[name];
						const mmResult = formula.value();
						let reqResult;
						if (!mmResult) {
							reqResult = '';
						}
						else if (mmResult instanceof MMValue) {
							const v = mmResult.values;
							if (mmResult.valueCount === 1) {
								reqResult = v[0];
							}
							else if (mmResult.rowCount > 1 && mmResult.columnCount > 1) {
								reqResult = [];
								const columnCount = mmResult.columnCount;
								for (let r = 0; r < mmResult.rowCount; r++) {
									const row = [];
									reqResult.push(row);
									for (let c = 0; c < columnCount; c++) {
										row[c] = v[r*columnCount + c];
									}
								}
							}
							else if (mmResult.valueCount > 1) {
								reqResult = [];
								for (let r = 0; r < mmResult.rowCount; r++) {
									reqResult[r] = v[r];
								}
							}	
						}

						requestResults[name] = reqResult;
					}
				}
				response.results = requestResults;
			}
			if (!message.callBackNumber && Object.keys(actions).length === 0) {
				response.update = true;
			}

			for (let action of Object.keys(actions)) {
				switch (action) {
					case 'mm_view': {
						const name = actions[action].toLowerCase();
						const target = this.parent.children[name];
						if (target) {
							response.view = {name: actions[action], type: target.typeName};
						}
					}
						break;
					case 'mm_push': {
						const name = actions[action].toLowerCase();
						const target = this.parent.children[name];
						if (target) {
							response.push = {name: actions[action], path: target.getPath(), type: target.typeName};
						}
					}
						break;
					case 'mm_addrow': {
						const name = actions[action].toLowerCase();
						const target = this.parent.children[name];
						if (target && target instanceof MMDataTable) {
							target.addRow(0);
						}
					}
						break;
					case 'mm_deleterows': {
						const actionValue = actions[action];
						const rows = actionValue.rows;
						const name = actionValue.table;
						if (Array.isArray(rows) && name) {
							const target = this.parent.children[name];
							if (target) {
								target.removeRows(rows);
							}
						}
					}
						break;
					case 'mm_refresh': {
						const name = actions[action].toLowerCase();
						const target = this.parent.children[name];
						if (target) {
							target.forgetCalculated();
						}
					}
						break;
					case 'mm_update': {
						response.update = true;
					}
						break;
					case 'mm_clear': {
						if (actions[action]) {
							this.inputs = null;
							this.forgetCalculated();
						}
					}
						break;
					case 'mm_load': {
						const path = actions[action].toLowerCase();
						if (path) {
							theMMSession.loadSession(path);
							response.popView = true;
						}
					}
						break;
					default:
						this.setError('mmcmd:htmlBadAction', {action: action, path: this.getPath()});
						break;
				}
			}

			return response;
		}
		catch(e) {
			this.setError('mmcmd:htmlBadActionJson', {path: this.getPath(), msg: e.message});
			return '';
		}
	}
	
	/**
	 * @method actionCommand
	 * @param {MMCommand} command
	 */
	actionCommand(command) {
		command.results = this.action(command.args);
	}

	/**
	 * @method htmlForRequestor
	 * @param {MMTool} requestor
	 * @returns {String} 
	 */
	htmlForRequestor(requestor) {
		const messageCode = `
<script>
window.onerror = function (e) {
	alert('Error: ' + e);
};
</script>
<script> 
var callBackNumber = 1;
const callBacks = {}

const handleMessage = (e) => {
	const results = e.data;
	if (results && results.callBackNumber) {
		callBacks[results.callBackNumber](results.results);
		delete callBacks[results.callBackNumber]
	}
}
window.addEventListener('message', handleMessage);
const mmpost = (inputs, requests, callBack) => {
	if (Array.isArray(inputs)) {
		inputs = mminputs(inputs);
	}
	const message = {
		inputs: inputs
	}
	if (requests) {
		message.requests = requests;
	}
	if (callBack) {
		message.callBackNumber = callBackNumber;
		callBacks[callBackNumber++] = callBack;
	}
	window.parent.postMessage('htmlPage' + JSON.stringify(message), '*');
}
const mminputs = (idNames) => {
	const inputs = {};
	for(let a of idNames) {
		const e = document.getElementById(a);
		if (e) {
			inputs[a] = e.value;
		}
	}
	return inputs;
}
</script>
`
		if (!this.processedHtml) {
			if (!this.rawHtml) {
				const htmlValue = this.formula.value();
				if (htmlValue) {
					this.rawHtml = htmlValue.values[0];
				}
			}
			if (this.rawHtml) {
				let chunks = [messageCode];
				let regex = RegExp('<mm>.*?</mm>','g');
				const rawHtml = this.rawHtml;
				const matches = rawHtml.matchAll(regex);
				let formulaNumber = 0;
				let includeFrom = 0;
				for (const match of matches) {
					chunks.push(rawHtml.substring(includeFrom, match.index));
					includeFrom = match.index + match[0].length
					if (formulaNumber >= this.tagFormulas.length) {
						this.tagFormulas.push(new MMFormula(`f${formulaNumber}`, this)); 
					}
					const tagFormula = this.tagFormulas[formulaNumber];
					tagFormula.formula = match[0].substring(4, match[0].length - 5);
					formulaNumber++;
					const value = tagFormula.value();
					if (value instanceof MMValue) {
						chunks.push(value.htmlValue());
					}
				}
				chunks.push(rawHtml.substring(includeFrom));

				this.processedHtml = chunks.join('');
			}
		}
		if (this.processedHtml) {
			this.addRequestor(requestor);
		}
		return this.processedHtml;
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
		results.formula = this.formula.formula;
		results.html = this.htmlForRequestor();
	}
}