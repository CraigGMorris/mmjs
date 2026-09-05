// @ts-check
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
	MMValue:readonly
	MMStringValue:readonly
	MMNumberValue:readonly
	theMMSession:readonly
	MMModel:readonly
	MMDataTable:readonly
	MMCommandMessage:readonly
	MMExpression:readonly
	MMToolValue:readonly
*/

/** @typedef {import('./MMTool.js').MMTool} MMTool */
/** @typedef {import('./MMModel.js').MMModel} MMModel */
/** @typedef {import('./MMFormula.js').MMFormula} MMFormula */
/** @typedef {import('./MMValue.js').MMValue} MMValue */
/** @typedef {import('./MMNumberValue.js').MMNumberValue} MMNumberValue */
/** @typedef {import('./MMStringValue.js').MMStringValue} MMStringValue */
/** @typedef {import('./MMTableValue.js').MMTableValue} MMTableValue */
/** @typedef {import('./MMTableValue.js').MMTableValueColumn} MMTableValueColumn */
/** @typedef {import('./MMToolValue.js').MMToolValue} MMToolValue */
/** @typedef {import('./MMDataTable.js').MMDataTable} MMDataTable */
/** @typedef {import('./MMExpression.js').MMExpression} MMExpression */
/** @typedef {import('./MMCommandProcessor.js').MMCommand} MMCommand */
/** @typedef {import('./MMCommandProcessor.js').MMCommandMessage} MMCommandMessage */


// code inserted into the page to implement the mmpost function
const MMHtmlMessageCode = `
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
	message.scrollY = window.scrollY;
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

/**
 * @class MMHtmlPageProcessor
 * @property {any} parent
 * @property {Record<string, any>|null} [inputs]
 * @property {string|null} [rawHtml]
 * @property {string|null} [processedHtml]
 * @property {number} [scrollViewToY]
 * @property {boolean} [recursionBlockIsOn]
 */
export class MMHtmlPageProcessor {
	/**
	 * @constructor
	 * @param {any} parentTool
	 */
	constructor(parentTool) {
		// formula have to have a tool as parent, so rudely paste them onto it
		this.parent = parentTool
		this.parent.tagFormulas = [];
		this.inputs = null;
		this.rawHtml = null;
		this.processedHtml = null;
		this.recursionBlockIsOn = false;
	}

	/**
	 * @method saveObject
	 * @param {Record<string, any>} o
	 * @returns {Record<string, any>} object that can be converted to json for save file
	 */
	saveObject(o) {
		if (this.inputs) {
			o.inputs = this.inputs;
		}

		const tagFormulas = this.parent.tagFormulas;
		const formulaCount = tagFormulas.length;
		for (let i = 0; i < formulaCount; i++) {
			const formula = tagFormulas[i];
			o[`f${i}`] = formula.formula;
		}
		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @param {Record<string, any>} saved 
	 */
	initFromSaved(/** @type {Record<string, any>} */ saved) {
		this.inputs = saved.inputs;
		let formulaNumber = 0;
		let tagFormula;
		const tagFormulas = this.parent.tagFormulas;
		do {
			const name = `f${formulaNumber}`;
			tagFormula = saved[name];
			if (tagFormula) {
				const formula = new MMFormula('_' + name, this.parent);
				formula.formula = tagFormula;
				tagFormulas.push(formula);
				formulaNumber++;
			}
		} while(tagFormula);
	}
	
	/**
	 * @method inputSources
	 * @param {Set<MMTool>} sources - contains tools referenced by this tool
	 */
	inputSources(sources) {
		const tagFormulas = this.parent.tagFormulas;
		for (let formula of tagFormulas) {
			if (formula.formula) {
				formula.addInputSourcesToSet(sources);
			}
			else {
				// tag represents parent model
				const parentModel = /** @type {any} */ (this.parent.parent);
				if (parentModel && parentModel.children) {
					for (const childName in parentModel.children) {
						const child = /** @type {MMTool} */ (parentModel.children[childName]);
						if (child && ((/** @type {any} */ (child)).isInput || (/** @type {any} */ (child)).isOutput || (/** @type {any} */ (child)).htmlNotes)) {
							sources.add(child);
							child.addRequestor(this.parent);
						}
					}
				}
			}
		}
	}

	/**
	 * @method clearCache
	 */
	clearCache() {
		this.processedHtml = null;
		this.rawHtml = null;
	}

	/**
	 * @method action
	 * @param {String} jsonMessage 
	 * @returns {Promise<Record<string, any>|string>}
	 * Makes any inputs in the message available as parameters and
	 * returns and returns and requested values in the response return
	 * also performs action indicated in the requests with the mm_ keywords
	 */
	async action(jsonMessage) {
		const response = /** @type {Record<string, any>} */ ({});
		try {
			const message = JSON.parse(jsonMessage);
			if (message.callBackNumber) {
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
					this.parent.forgetCalculated();
				}
			}

			const actions = /** @type {Record<string, any>} */ ({});
			const requestResults = /** @type {Record<string, any>} */ ({});
			if (message.requests) {
				for (let name of Object.keys(message.requests)) {
					if (name.startsWith('mm_')) {
						// save actions for below
						actions[name.toLowerCase()] = message.requests[name];
					}
				}
			}
			if (!message.callBackNumber && Object.keys(actions).length === 0) {
				response.update = true;
			}

			// now do any action requests
			let parentModel = /** @type {any} */ (this.parent);
			const getTarget = (/** @type {any} */ names) => {
				names = names.toLowerCase().split('.');
				let target = parentModel;
				for (const name of names){
					target = target.children[name];
				}
				return target;
			}
			while (!(parentModel instanceof MMModel)) {
				parentModel = parentModel.parent;
			}
			for (let action of Object.keys(actions)) {
				switch (action) {
					case 'mm_view': {
						// pass back instruction to view to switch to different tool
						const target = getTarget(actions[action])
						if (target) {
							response.view = {name: actions[action], type: target.typeName};
						}
					}
						break;
					case 'mm_viewurl': {
						response.viewurl = {name: actions[action]};
					}
						break;
					case 'mm_push': {
						// pass back instruction to view to push another tool view over the html page view
						const target = getTarget(actions[action])
						if (target) {
							response.push = {name: actions[action], path: target.getPath(), type: target.typeName};
						}
						if (message.scrollY != null) {
							this.scrollViewToY = message.scrollY; // to allow same scroll on next view
							this.clearCache();
						}
					}
						break;
					case 'mm_addrow': {
						// add a row to a specified data table
						const target = getTarget(actions[action])
						if (target) {
							if (target instanceof MMDataTable) {
								const rowNumber = target.addRow(0);
								if (rowNumber) {
									response.undo = `${target.getPath()} undoaddrow ${rowNumber}}`;
								}
							}
							else if (target instanceof MMExpression) {
								const value = target.valueForRequestor();
								if (value instanceof MMToolValue) {
									const tool = value.valueAtRowColumn(1,1);
									if (tool instanceof MMDataTable) {
										const rowNumber = tool.addRow(0);
										if (rowNumber) {
											response.undo = `${tool.getPath()} undoaddrow ${rowNumber}}`;
										}
									}
								}
							}
						}
					}
						break;
					case 'mm_deleterows': {
						// delete specified rows from a data table
						const actionValue = actions[action];
						const rows = actionValue.rows;
						const name = actionValue.table;
						if (Array.isArray(rows) && name) {
							const target = getTarget(name);
							if (target) {
								if (target instanceof MMDataTable) {
									const oldInputs = target.removeRows(rows);
									if (Object.keys(oldInputs).length) {
										const inputsJson = JSON.stringify(oldInputs);
										response.undo = `${(/** @type {any} */ (this)).getPath()} restorerows ${inputsJson}`;
									}
								}
								else if (target instanceof MMExpression) {
									const value = target.valueForRequestor();
									if (value instanceof MMToolValue) {
										const tool = value.valueAtRowColumn(1,1);
										if (tool instanceof MMDataTable) {
											const oldInputs = tool.removeRows(rows)
											if (Object.keys(oldInputs).length) {
												const inputsJson = JSON.stringify(oldInputs);
												response.undo = `${(/** @type {any} */ (this)).getPath()} restorerows ${inputsJson}`;
											}
										}
									}
								}
							}
						}
					}
						break;
					case 'mm_refresh': {
						// recalculate the values for a specified tool
						const target = getTarget(actions[action])
						if (target) {
							target.forgetCalculated();
						}
					}
						break;
					case 'mm_update': {
						// instruct the view to refresh the html page view
						response.update = true;
					}
						break;
					case 'mm_clear': {
						// forget all previously defined parameters derived from page inputs
						if (actions[action]) {
							this.inputs = undefined;
							(/** @type {any} */ (this)).forgetCalculated();
						}
					}
						break;
					case 'mm_load': {
						// load a different session
						const path = actions[action];
						if (path) {
							response.resetInfo = await theMMSession.loadSession(path);
							response.didLoad = true;
						}
					}
						break;
					case 'mm_loadurl': {
						// load a different session from a url
						const path = actions[action];
						if (path) {
							response.resetInfo = await theMMSession.loadUrl(path);
							response.didLoad = true;
						}
					}
						break;
					case 'mm_cmd': {
						// have session execute a command(s)
						const cmds = actions[action];
						const results = await (/** @type {any} */ (theMMSession.processor)).processCommandString(cmds);
						if (results) {
							requestResults['_response'] = results
							if (results[0] && results[0].error) {
								response.error = results[0].error;
							}
						}
						else {
							requestResults['_response'] = '';
						}
					}
					if (message.scrollY != null) {
						this.scrollViewToY = message.scrollY; // to allow same scroll on next view
						this.clearCache();
					}
					break;
					case 'mm_undo': {
						response.undo = actions[action];
					}
						break;
					default:
						(/** @type {any} */ (this)).setError('mmcmd:htmlBadAction', {action: action, path: this.parent.getPath()});
						break;
				}
			}

			if (message.requests) {
				for (let name of Object.keys(message.requests)) {
					if (!name.startsWith('mm_')) {
						// evaluate the request formulas for inclusion in response.results
						const formula = new MMFormula(`_r_${name}`, this.parent);
						formula.formula = message.requests[name];
						const mmResult = formula.value();
						let reqResult;
						if (!mmResult) {
							reqResult = '';
						}
						else if (mmResult instanceof MMTableValue) {
							reqResult = /** @type {Record<string, any>} */ ({});
							const rowCount = mmResult.rowCount;
							for (const column of mmResult.columns) {
								const columnValues = [];
								for (let r = 0; r < rowCount; r++) {
									const value = (/** @type {any} */ (column.value)).valueAtCount(r);
									columnValues.push(value);
								}
								reqResult[column.name] = columnValues;
							}
						}
						else if (mmResult instanceof MMValue) {
							const v = (/** @type {any} */ (mmResult)).values;
							if (mmResult.valueCount === 1) {
								reqResult = v[0];
							}
							else if (mmResult.rowCount > 1 && mmResult.columnCount > 1) {
								reqResult = [];
								const columnCount = mmResult.columnCount;
								for (let r = 0; r < mmResult.rowCount; r++) {
									/** @type {any[]} */
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
			}
			response.results = requestResults;

			return response;
		}
		catch(e) {
			this.parent.setError('mmcmd:htmlBadActionJson', {path: this.parent.getPath(), msg: (/** @type {any} */ (e)).message});
			return '';
		}
	}

	/**
	 * @method htmlForRequestor
	 * @param {MMTool} [requestor]
	 * @param {Boolean} [skipMessageCode]
	 * @returns {String} 
	 */
	htmlForRequestor(requestor, skipMessageCode) {
		if (this.recursionBlockIsOn) {
			return '';
		}
		try {
			const messageCode = skipMessageCode ? '' : MMHtmlMessageCode;
			if (!this.processedHtml) {
				if (!this.rawHtml) {
					this.parent.tagFormulas = [];
					this.rawHtml = this.parent.rawHtml();
				}
				if (this.rawHtml) {
					let regex = RegExp('<mm>.*?</mm>','msig');
					let processedHtml = `<!--#${Math.random()}-->` + this.rawHtml;
					// unique comment to ensure react updates view
					let formulaNumber = 0;
					while (regex.test(processedHtml)) {
						regex.lastIndex = 0;
						let chunks = [];
						const matches = processedHtml.matchAll(regex);
						let includeFrom = 0;
						const tagFormulas = this.parent.tagFormulas;
						for (const match of matches) {
							chunks.push(processedHtml.substring(includeFrom, match.index));
							includeFrom = match.index + match[0].length
							if (formulaNumber >= tagFormulas.length) {
								tagFormulas.push(new MMFormula(`_f${formulaNumber}`, this.parent)); 
							}
							const tagFormula = tagFormulas[formulaNumber];
							tagFormula.nameSpace = this.parent.parent; // make sure correct namespace
							tagFormula.formula = match[0].substring(4, match[0].length - 5);
							formulaNumber++;
							if (tagFormula.formula.length === 0) {
								// if tag is empty assume parent model
								const parentModel = /** @type {any} */ (this.parent.parent);
								try {
									this.recursionBlockIsOn = true;
									chunks.push(parentModel ? parentModel.htmlValue(requestor, true) : '');
								}
								finally {
									this.recursionBlockIsOn = false;
								}
							}
							else {
								const value = tagFormula.value();
								if (value instanceof MMValue) {
									chunks.push((/** @type {any} */ (value)).htmlValue(requestor));
								}
							}
						}
						chunks.push(processedHtml.substring(includeFrom));
						processedHtml = chunks.join('')
					}
					if (this.scrollViewToY) {
						processedHtml += `
						<script>
						const scrollToOptions = {
							left: 0,
							top: ${this.scrollViewToY},
							behavior: 'auto'
						}
						window.scrollTo(scrollToOptions);
						</script>		
						`;
						this.scrollViewToY = null;
					}
			
					this.processedHtml = processedHtml;
				}
			}
			if (this.processedHtml) {
				this.parent.addRequestor(requestor);
			}
			return `
<html>
	<head>
		<style>
			body {
				background-color: rgb(255, 253, 225) !important;
				color: black;
				-webkit-print-color-adjust: exact;
			}
			table {
				width: 100%;
				border-collapse: collapse;
			}
			td, th {
				border: 1px solid black;
				padding: 4px;
			}
			td {
				text-align: center;
			}

			tr:nth-child(odd){background-color: #f2f2f2;}
			tr:nth-child(even){background-color: #ffffff;}

			tr:hover {background-color: #ddd;}

			th {
				text-align: center;
				background-color: #e8e8ff;
				color: black;
			}
			th.col0, td.col0 {
				/* display: none; */
				width: 50px;
			}

			input:focus-visible, textarea:focus-visible {
				outline: 1px solid white;
				border: solid 2px blue;
				border-radius: 5px;
			}
			
			select, button {
				font-size: 12pt;
			}

			.tvalue .col0 {
				display: none;
			}

			.formula {
				color: navy;
				font-weight: bold;
			}

			.model-form {
				margin-top: 10px;
			}

			.model-form__title {
				font-size: 12pt;
				font-weight: bold;
				margin-bottom: 10px;
			}
			.model-form__buttons {
				display: grid;
				grid-template-columns: 1fr 1fr;
				float: right;
				position: sticky;
				top: 10px;
				margin-right: 10px;
				cursor: pointer;
			}
			
			@media print {
				.model-form__print {
					visibility: hidden;
				}
			}
			.model-form__default-name {
				border-bottom: solid 1px black;
				padding: 5px;
				color: blue;
			}
			.model-form__input-row {
				display: grid;
				grid-template-columns: 112px 1fr;
				background-color: #f2f2f2;
				width: 100%;
			}
			.model-form__input-name {
				width:100px;
				border: solid 1px black;
				padding: 5px;
				overflow: scroll;
			}

			.model-form__input	{
				border: solid 1px;
				padding: 5px;
			}

			.model-form__input input {
				width: calc(100% - 10px);
			}

			.model-form__output-row {
				display: grid;
				grid-template-columns: 112px 1fr;
				background-color: #e8e8ff;
				border: solid 1px;
			}
			.model-form__output-name {
				width:100px;
				border: solid 1px black;
				padding: 5px;
				overflow: scroll;
			}
			.model-form__output-table, .model-form__output-tool {
				margin-top: 5px;
			}
			.model-form__output-table .model-form__output-name {
				background-color: #e8e8ff;
			}
			.model-form__output-tool .model-form__output-name {
				background-color: #e8e8ff;
			}
			.model-form__output-row .model-form__output-name {
				width:100px;
				border: solid 1px black;
				padding: 5px;
			}
			.model-form__output-row .model-form__output-value {
				white-space: pre-wrap;
				border: solid 1px black;
				padding: 5px;
			}
			.model-form__input-name:hover, .model-form__output-name:hover, .model-form__default-name:hover, .model-form__multiline-formula:hover {
				cursor: pointer;
			}
			.model-form__output-value	{
				background-color: white;
			}
			.model-form__output-row, .model-form__input-row {
				margin-top: 5px;
			}

			.model-form__output-row, .model-form__output-tool {
				margin-bottom: 10px;
			}

			.model-form__multiline-formula {
				white-space: pre-wrap;
				border: solid 1px;
				padding: 5px;
			}
			.model-form__input-row:hover, .model-form__output-row:hover {background-color: #ddd;}

			.model-form__notes {
				white-space: pre-wrap;
				margin-top: 10px;
				border: solid 1px;
				padding: 5px;
				background-color: #f2f2f2;
				cursor: pointer;
			}

			.model-form-nested .model-form__input-name:hover,
			.model-form-nested .model-form__output-name:hover,
			.model-form-nested .model-form__multiline-formula:hover,
			.model-form-nested .model-form__notes {
				cursor: auto;
			}

			/* .model-form-nested .model-form__output-name:hover {
				cursor: auto;
			} */

			.button-tool {
				margin-top: 10px;
				margin-bottom: 10px;
				text-align: center;
			}

			.graph__svg {
				background-color: white;
			}
		</style>
		${messageCode}
	</head>
	<body>
		${this.processedHtml}
	</body>
</html>
`;
			// return styleCode + messageCode + this.processedHtml;
		}
		catch(e) {
			if ((typeof e === 'string')) {
				return `Error ${e}`
			}
			else if (e instanceof MMCommandMessage) {
				this.parent.setError(e.msgKey, e.args);
			}
			return '<h3>Error occurred rendering page.</h3>';
		}
	}
}

/**
 * @class MMHtmlPage
 * @extends MMTool
 * @property {MMFormula} formula
 * @property {MMHtmlPageProcessor} htmlProcessor
 */
// eslint-disable-next-line no-unused-vars
export class MMHtmlPage extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'HtmlPage');
		this.htmlProcessor = new MMHtmlPageProcessor(this)
		this.formula = new MMFormula('Formula', this);
		this.formula.formula = `'<!-- Html source - see help page -->	
Replace this content in the source formula with your own content.
`
	}

	/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o = /** @type {Record<string, any>} */ (super.saveObject());
		o.Type = 'HTML Form';
		o['Formula'] = {Formula: this.formula.formula};
		this.htmlProcessor.saveObject(o);
		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Record<string, any>} saved 
	 */
	initFromSaved(saved) {
		this.isLoadingCase = true;
		try {
			super.initFromSaved(saved);
			this.formula.formula = saved.Formula.Formula;
			this.htmlProcessor.initFromSaved(saved);
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
	/**
	 * @override
	 * @param {string} command
	 * @returns {string|undefined}
	 */
	getVerbUsageKey(command) {
		let key = {
			htmlaction: 'mmcmd:_htmlAction',
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
	 * @returns {Set<MMTool>} contains tools referenced by this tool
	 */
	inputSources() {
		let sources = super.inputSources();
		this.formula.addInputSourcesToSet(sources);
		this.htmlProcessor.inputSources(sources);		
		return sources;
	}

	/**
	 * @override forgetCalculated
	 */
	forgetCalculated() {
		if (!this.forgetRecursionBlockIsOn) {
			this.forgetRecursionBlockIsOn = true;
			try {
				for (let requestor of this.valueRequestors) {
					requestor.forgetCalculated();
				}
				this.valueRequestors.clear();
				this.htmlProcessor.clearCache();
				super.forgetCalculated();
			}
			finally {
				this.forgetRecursionBlockIsOn = false;
			}
		}
	}

	/**
	 * @override valueDescribedBy
	 * @param {String} [description]
	 * @param {MMTool} [requestor]
	 * @returns {MMValue|null|undefined}
	 */
	valueDescribedBy(description, requestor) {
		if (!description) {
			return super.valueDescribedBy(description, requestor);
		}
		const lcDescription = description.toLowerCase();
		let value = null;
		if (lcDescription === 'html') {
			const html = this.htmlProcessor.htmlForRequestor(requestor);
			if (html) {
				value = MMStringValue.scalarValue(html);
			}
		}
		else if (lcDescription.startsWith('block_')) {
			if ( this.formula.formula ) {
				const rawHtmlValue = this.formula.value();
				if (rawHtmlValue) {
					const rawHtml = (/** @type {MMStringValue} */ (rawHtmlValue)).values[0];
					const blockName = lcDescription.substring(6);
					const re = new RegExp(`(<!--begin_${blockName}-->)(.*)(<!--end_${blockName}-->)`, 'msi');
					const match = rawHtml.match(re);
					if (match && match.length > 2) {
						value = MMStringValue.scalarValue(match[2]);
					}
				}
			}
		}
		else if (this.htmlProcessor.inputs) {
			// return values posted as inputs from the html view
			const inputValue = this.htmlProcessor.inputs[lcDescription];
			if (inputValue != null) {
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
		if (!value && description) {
			return super.valueDescribedBy(description, requestor);
		}
		if (value) {
			this.addRequestor(requestor);
		}
		return value;
	}

	/**
	 * @method parameters
	 * i.e. things that can be appended to a formula value
	 */
	parameters() {
		let p = super.parameters();
		p.push('block_');
		if ((/** @type {any} */ (this)).inputs) {
			p = p.concat(Object.keys((/** @type {any} */ (this)).inputs));
		}
		return p;
	}
	
	/**
	 * @method actionCommand
	 * @param {MMCommand} command
	 */
	async actionCommand(command) {
		command.results = await this.htmlProcessor.action(command.args);
		if (command.results.undo) {
			command.undo = command.results.undo;
		}
	}

	/**
	 * @method rawHtml
	 * @returns {String|undefined}
	 */
	rawHtml() {
		const htmlValue = this.formula.value();
		if (htmlValue) {
			return (/** @type {MMStringValue} */ (htmlValue)).values[0];
		}
	}

	/**
	 * @method htmlValue
	 * @param {MMTool} [requestor]
	 * @returns {String|null}
	 */
	htmlValue(requestor) {
		return this.htmlProcessor.htmlForRequestor(requestor, true);
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
		results.formula = this.formula.formula;
		results.html = this.htmlProcessor.htmlForRequestor();
	}
}