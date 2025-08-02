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
	MMToolValue:readonly
	MMToolTypes:readonly
	MMExpression:readonly
	theMMSession:readonly
	MMReport:readonly
	MMPoint:readonly
	MMPropertyType:readonly
	MMNumberValue:readonly
	MMStringValue:readonly
	MMTableValue:readonly
	MMButton:readonly
	MMMenu:readonly
	MMGraph:readonly
	MMHtmlPageProcessor:readonly
	MMFlashPhaseValue:readonly
*/

/**
 * @class MMImportModelInfo - information about imported models
 * @member {String} sessionName
 * @member {Array} inputFormulas
 */
class MMImportModelInfo {
	/**
	 * @constructor
	 * @param {string} sessionName 
	 */
	constructor(sessionName) {
		this.sessionName = sessionName;
		this.inputFormulas = null;
	}

	/**
	 * @method saveObject
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		const o = {'name': this.sessionName}
		if (this.inputFormulas) {
			o.inputs = this.inputFormulas;
		}
		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		this.sessionName = saved.name;
		this.inputFormulas = saved.inputs;
		if (saved.childImportFormulas) {
			this.childImportFormulas = saved.childImportFormulas;
		}
	}
}

/**
 * @class MMModel - Math Minion tool contaioner
 * @extends MMTool
 * @member {Number} nextToolNumber
 * @member {boolean} isMissingObject
 */
// eslint-disable-next-line no-unused-vars
export class MMModel extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Model');
		this.htmlProcessor = new MMHtmlPageProcessor(this)
		this.nextToolNumber = 1;
		this.isMissingObject = false;
		this.lastDefaultUnitSetName = '';
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['addtool'] = this.addToolCommand;
		verbs['removetool'] = this.removeToolCommand;
		verbs['restoretool'] = this.restoreToolCommand;
		verbs['dgminfo'] = this.diagramInfoCommand;
		verbs['setpositions'] = this.setPositions;
		verbs['copytool'] = this.copyToolCommand;
		verbs['copyastable'] = this.copyAsTableCommand;
		verbs['paste'] = this.pasteCommand;
		verbs['import'] = this.importCommand;
		verbs['makelocal'] = this.makeLocalCommand;
		verbs['restoreimport'] = this.restoreImportCommand;
		verbs['htmlaction'] = this.actionCommand;
		verbs['test'] = this.testCommand;

		return verbs;
	}

	/** @override */
	get properties() {
		let d = super.properties;
		// to designate a tool to be viewed when a model is pushed
		d['indexTool'] = {type: MMPropertyType.string, readOnly: false};
		return d;
	}

	get indexTool() {
		return this._indexTool;
	}

	set indexTool(newValue) {
		this._indexTool = newValue;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			addtool: 'mmcmd:_modelAddTool',
			removetool: 'mmcmd:_modelRemoveTool',
			restoretool: 'mmcmd:_modelRestoreTool',
			dgminfo: 'mmcmd:_modelDgmInfo',
			setpositions: 'mmcmd:_modelSetPositions',
			copytool: 'mmcmd:_modelCopyTool',
			copyastable: 'mmcmd:_modelCopyAsTable',
			paste: 'mmcmd:_modelPaste',
			import: 'mmcmd:_modelImport',
			makelocal: 'mmcmd:_modelMakeLocal',
			restoreimport: 'mmcmd:_modelRestoreImport'
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
		for (const name in this.children) {
			const child = this.children[name];
			if (child instanceof MMTool) {
				p.push(child.name + '.');
			}
		}
		// note these will be removed by the MMTools parameter preview
		// if the path is blank. This counts on them being last in the list
		if (!this.children.toolnames) {
			p.push('toolnames');
		}
		if (!this.children.tools) {
			p.push('tools');
		}
		return p;
	}

	/** @method addToolCommand
	 * creates new Tool with supplied type and name
	 * @param {MMCommand} command
	 * command.args should be typeName and optionally name and x,y position
	 * if second argument starts with a number, it is asumed to be x coordinate
	 * command.results = the tool name if successful
	 */
	addToolCommand(command) {
		let parts = command.args.split(/\s/);
		let typeName = parts[0];
		let name;
		let position;

		/**
		 * @function valueArg
		 * @param {Number} i
		 * @returns name or position or null
		 * sees if value at parts[i] is MMPoint position value or name value
		 * returns null if neither
		 */
		const valueAtArg = (i) => {
			const re = /^[\d.-]+$/;
			if (parts.length >= i+1 && re.test(parts[i]) && re.test(parts[i+1])) {
				const x = parseFloat(parts[i]);
				const y = parseFloat(parts[i+1]);
				if (!isNaN(x) && !isNaN(y)) {
					return new MMPoint(x, y); // position
				}
			}
			else if (/^[\w]+$/.test(parts[i])) {
				return parts[i];  // name
			}
			return null;
		}
		if (parts.length > 1) {
			const argValue = valueAtArg(1);
			if (argValue) {
				if (typeof argValue == 'string') {
					name = argValue;
					position = valueAtArg(2);
					if (position && !(position instanceof MMPoint)) {
						throw(this.t('mmcmd:modelInvalidPosition', {name: name, pos: position}));
					}
				}
				else {	// not null or string, so must be position
					position = argValue
				}
			}
			else {
				throw(this.t('mmcmd:modelInvalidToolName', {name: parts[1]}));
			}
		}

		if (!name) {
			const baseName = (typeName === 'Expression') ? 'x' : typeName;
			let n = 2;
			name = baseName + '1';
			while ( this.childNamed(name) ) {
				name = `${baseName}${n++}`;
			}
		}
		let isImport = false;
		if (typeName === 'Import') {
			typeName = 'Model';
			isImport = true;
		}
		let toolType = MMToolTypes[typeName];
		if(!toolType) {
			throw(this.t('mmcmd:modelInvalidToolType', {name: name, typeName: typeName}));
		}
		let newTool = toolType.factory(name, this);
		if (newTool) {
			if (position) {
				newTool.position = position;
			}
			else {
				if (Object.keys(this.children).length === 1) {
					// no previous tools
					newTool.position = {x: 10, y: 10}
				}
				else {
					// position newTool under left most tools
					let minX = 10000000, maxY = -10000000;
					// find left most and bottom most
					for (const key in this.children) {
						const tool = this.children[key];
						if (tool instanceof MMTool && tool !== newTool) {
							minX = Math.min(minX, tool.position.x);
							maxY = Math.max(maxY, tool.position.y);
						}
					}

					// now check if there is room to the right of the bottom - left most tool
					let useRightColumn = true;
					for (const key in this.children) {
						const tool = this.children[key];
						if (tool instanceof MMTool && tool !== newTool) {
							const y = tool.position.y
							if (y > maxY - 30 && tool.position.x > minX) {
								useRightColumn = false;
								break;
							}
						}
					}

					if (useRightColumn) {
						minX += 150;
					}
					else {
						maxY += 30;
					}
					newTool.position = {x: minX, y: maxY};
				}
			}
			if (isImport) {
				newTool.importInfo = new MMImportModelInfo('');
			}
			newTool.justAdded = true;
			command.results = name;
			command.undo = this.getPath() + ' removetool ' + name;
			this.forgetCalculated();
		}
	}

	/** @method removeToolCommand
	 * removes named tool from the model
	 * @param {MMCommand} command
	 * command.args should be the tool name(s)
	 * @returns {boolean} success
	 */
	removeToolCommand(command) {
		const names = command.args.split(/\s/);
		const savedTools = [];
		for (let name of names) {
			const tool = this.childNamed(name);
			if (tool instanceof MMTool) {
				let savedTool;
				try {
					savedTool = tool.saveObject();
				}
				catch(e) {
					savedTool = null;
				}
				try {
					tool.forgetCalculated();
				}
				finally {
					if (this.removeChildNamed(name) && savedTool) {
						savedTools.push(savedTool);
					}
				}
			}
		}
		if (savedTools.length) {
			const json = JSON.stringify(savedTools);
			command.undo = `${this.getPath()} restoretool ${json}`;
		}
		this.htmlProcessor.clearCache();
		this.forgetCalculated();
	}

	/**
	 * @method restoreTool - adds a tool from json - for undo
	 * @param {Object} tool - from json
	 */
	async restoreTool(tool) {
		const name = tool.name;
		const typeName = tool.Type
			.replace('ODE Solver','Ode')
			.replace('HTML Form', 'HtmlPage')
			.replace(' ','')
			.replace('Equation','')
			.replace('ModelArray', 'Model');
		const toolType = MMToolTypes[typeName];
		if(!toolType) {
			throw(this.t('mmcmd:modelInvalidToolType', {name: name, typeName: tool.Type}));
		}
		let newTool = toolType.factory(name, this);
		await newTool.initFromSaved(tool);
	}

	/**
	 * @method restoreToolCommand
	 * @param {MMCommand} command
	 * command.args should be the undo json
	 * in the form  /.x restoretool  followed by the json text
	 */
	async restoreToolCommand(command) {
		const savedTools = JSON.parse(command.args);

		for (let saved of savedTools) {
			await this.restoreTool(saved);
		}
		const names = savedTools.map(t => t.name);
		command.undo = `${this.getPath()} removetool ${names.join(' ')}`
		command.results = true;
	}

	/** @method copyToolCommand
	 * collects saveObject infomation about the tool(s) and assigns it as json to command.results
	 * @param {MMCommand} command
	 * command.args should be the tool name(s)
	 * @returns {String} json
	 */
	copyToolCommand(command) {
		const names = command.args.split(/\s/);
		const savedTools = [];
		for (let name of names) {
			const tool = this.childNamed(name);
			if (tool instanceof MMTool) {
				savedTools.push(tool.saveObject());
			}
		}
		const json = `{"CopyObjects": ${JSON.stringify(savedTools, null, '\t')}}`;
		command.results = json;
	}

	contentsFromJsonObject(obj) {
		const makeExpression = (name) => {
			const toolType = MMToolTypes["Expression"];
			return toolType.factory(name, this);
		}

		const makeModel = (name, contents) => {
			const toolType = MMToolTypes["Model"];
			const model = toolType.factory(name, this);
			model.contentsFromJsonObject(contents);
			return model;
		}

		const autoPosition = (tool) => {
			const n = Object.keys(this.children).length - 1;
			if (n === 0) {
				tool.position = {x: 10, y: 10}
			}
			else {
				const toolsPerRow = 10;
				const row = (n / toolsPerRow - 0.5).toFixed();
				const column = n % toolsPerRow;
				tool.position = {
					x: 10 + column * 70,
					y: 10 + row * 30
				}
			}
		}
	

		for (const childName of Object.keys(obj)) {
			const child = obj[childName];
			if (typeof(child) === 'string') {
				const expr = makeExpression(childName);
				if (expr) {
					autoPosition(expr);
					expr.formula.formula = "'" + child;
				}		
			}
			else if (typeof(child) === 'number') {
				const expr = makeExpression(childName);
				if (expr) {
					autoPosition(expr);
					expr.formula.formula = child.toString();
				}		
			}
			else if (child instanceof Array ) {
				if (child.length === 0) {
					continue;
				}
				const first = child[0];
				const parts = [];
				if (typeof(first) === 'string') {
					parts.push('{cc `' + first + '`');
					for (let i = 1; i < child.length; i++) {
						parts.push(',`'+ child[i] + '`');
					}
					parts.push('}')
					const expr = makeExpression(childName);
					if (expr) {
						autoPosition(expr);
						expr.formula.formula = parts.join('');
					}
				}
				else if (typeof(first) === 'number') {
					parts.push('{cc `' + first.toString() + '`');
					for (let i = 1; i < child.length; i++) {
						parts.push(',`'+ child[i].toString() + '`');
					}
					parts.push('}')
					const expr = makeExpression(childName);
					if (expr) {
						autoPosition(expr);
						expr.formula.formula = parts.join('');
					}
				}
				else {
					// Array of objects - use first as template to make a table with
					// each of its children being a column. If one of them isn't a scalar
					// string or number, then just create an expression with json string
					const columnValues = [];
					let dataOkay = true;
					for (const columnName of Object.keys(first)) {
						const columnFirst = first[columnName];
						if (typeof(columnFirst) === 'string') {
							columnValues.push({name: columnName, type: 'string', values: []});
						}
						else if (typeof(columnFirst) === 'number') {
							columnValues.push({name: columnName, type: 'number', values: []});
						}
						else {
							dataOkay = false;
							break;
						}
					}
					for (let i = 0; dataOkay && i < child.length; i++) {
						const element = child[i];
						for (let j = 0; dataOkay && j < columnValues.length; j++) {
							const columnValue = columnValues[j];
							const value = element[columnValue.name];
							if (typeof(value) === columnValue.type) {
								columnValue.values.push(value);
							}
							else {
								dataOkay = false;
							}
						} 
					}
					if (dataOkay) {
						const toolType = MMToolTypes["DataTable"];
						const table = toolType.factory(childName, this);
						autoPosition(table);

						// add columns
						for (const v of columnValues) {
							const options = {
								name: v.name,
							};
							if (v.type === 'string') {
								options.displayUnit = 'string';
								options.defaultValue = '""';
							}
							else {
								options.defaultValue = '"0"';
							}
							table.addColumn(JSON.stringify(options));
						}

						// add rows
						for (const rowValue of child) {
							table.addRow(0, rowValue);
						}
					}
					else {
						const expr = makeExpression(childName);
						if (expr) {
							autoPosition(expr);
							expr.formula.formula = "'" + JSON.stringify(child, null, '\t');
						}				
					}
				}
			}
			else if (child && typeof(child) === 'object') {
				const model = makeModel(childName, child);
				if (model) {
					autoPosition(model);
				}
			}
		}
	}

	// testing method - place to easily try things out
	async testCommand(command) {
		let results = ['test function for model']
		command.results = results;
	}

	/** @method copyAsTableCommand
	 * returns text representation of tools table value
	 * @param {MMCommand} command
	 * command.args should be the tool name
	 * @returns {String} json
	 */
	copyAsTableCommand(command) {
		if (!command.args.length) {
			throw(this.t('mmcmd:modelMissingToolName'));
		}
		const toolName = command.args;
		const tool = this.childNamed(toolName);
		if (tool instanceof MMTool) {
			const tableValue = tool.valueDescribedBy('table');
			if (tableValue) {
				command.results = MMReport.forToolValue(tool, tableValue, null, {isTableCopy: true});
			}
		}
	}

	/**
	 * @method pasteCommand
	 * @param {MMCommand} command
	 * command.args should be the tool x y toolJson
	 * in the form  /.x paste x y  followed by the json text
	 */
	async pasteCommand(command) {
		const indicesMatch = command.args.match(/^-*?[\d.]+\s+-*?[\d.]+\s+/);
		if (indicesMatch) {
			const parts = indicesMatch[0].split(/\s+/,2);
			if (parts.length === 2) {
				const originX = parseFloat(parts[0]);
				const originY = parseFloat(parts[1]);
				const json = command.args.substring(indicesMatch[0].length);
				const c = json[0];
				if (c.match(/[-\d]/) || json.startsWith('matrix')) {
					// starts with number or word matrix - assume matrix
					let toolType = MMToolTypes["Matrix"];
					if(!toolType) {
						throw(this.t('mmcmd:modelInvalidToolType', {name: "Unknown", typeName: "Matrix"}));
					}
					let name = `x${this.nextToolNumber++}`;
					while ( this.childNamed(name) ) {
						name = `x${this.nextToolNumber++}`;
					}	
					let newTool = toolType.factory(name, this);
					if (newTool) {
						newTool.position = new MMPoint(originX, originY);
						if (json.startsWith('matrix')) {
							newTool.initFromNumberString(json.substring(6))
						}
						else {
							newTool.initFromNumberString(json);
						}
						command.results = true;
					}
				}
				else if (json.startsWith('table')) {
					// starts with word table - assume table csv
					const tableValue = new MMTableValue({csv: json});
					let toolType = MMToolTypes["DataTable"];
					if(!toolType) {
						throw(this.t('mmcmd:modelInvalidToolType', {name: "Unknown", typeName: "DataTable"}));
					}
					let name = `x${this.nextToolNumber++}`;
					while ( this.childNamed(name) ) {
						name = `x${this.nextToolNumber++}`;
					}	
					let newTool = toolType.factory(name, this);
					if (newTool) {
						newTool.position = new MMPoint(originX, originY);
						newTool.initFromTableValue(tableValue);
						command.results = true;
					}
				}
				else {
					let saved = null;
					try {
						saved = JSON.parse(json);
					}
					catch(e) {
						saved = null;
					}
					if (saved) {
						if (saved.CopyObjects) {
							const tools = saved.CopyObjects;

							// need to adjust positions to offset from the supplied upper left
							let minX = null;
							let minY = null;
							for(let toolInfo of tools) {
								if (minX === null) {
									minX = toolInfo.DiagramX;
									minY = toolInfo.DiagramY;
								}
								else {
									minX = Math.min(minX, toolInfo.DiagramX);
									minY = Math.min(minY, toolInfo.DiagramY);
								}
							}

							const names = [];
							for(let toolInfo of tools) {
								toolInfo.DiagramX += originX - minX;
								toolInfo.DiagramY += originY - minY;
								const name = toolInfo.name;
								let number = 1;
								while ( this.childNamed(toolInfo.name) ) {
									toolInfo.name = `${name}_${number++}`;
								}
								names.push(toolInfo.name);
								await this.restoreTool(toolInfo);
							}
							command.undo = `${this.getPath()} removetool ${names.join(' ')}`
						}
						else {
							let name;
							let tool
							if (saved.CaseName && saved.RootModel) {
								// it is a copied session paste the root model with name CaseName
								name = saved.CaseName.replace(/\s/g,'_');
								while ( this.childNamed(name) ) {
									name = `x${this.nextToolNumber++}`;
								}	
			
								tool = saved.RootModel;
								tool.name = name;
							}
							// else if (saved.name) {
							// 	// just a single tool - probably copied from app based minion
							// 	name = saved.name;
							// 	tool = saved;
							// }
							else {
								// try making model from json
								const toolType = MMToolTypes["Model"];
								let name = `x${this.nextToolNumber++}`;
								while ( this.childNamed(name) ) {
									name = `x${this.nextToolNumber++}`;
								}	
								let model = toolType.factory(name, this);
								if (model) {
									model.position = new MMPoint(originX, originY);
									model.contentsFromJsonObject(saved);
								}
								return;
								// return; // invalid object
							}
							tool.DiagramX = originX;
							tool.DiagramY = originY;
							let number = 1;
							while ( this.childNamed(name) ) {
								name = `${name}_${number++}`;
							}
							tool.name = name;
							this.restoreTool(tool);
							command.undo = `${this.getPath()} removetool ${name}`
						}
						command.results = true;
					}
					else {
						// don't know what it is, so create expression with string
						let name = `x${this.nextToolNumber++}`;
						while ( this.childNamed(name) ) {
							name = `x${this.nextToolNumber++}`;
						}	
						const exp = new MMExpression(name, this);
						exp.position = new MMPoint(originX, originY)
						exp.formula.formula = "'" + json;
						command.undo = `${this.getPath()} removetool ${name}`			
					}
				}
			}
		}
	}

	/**
	 * @method inputExpressions
	 * @returns {Array}
	 * returns the contained expressions marked as inputs
	 */
	inputExpressions() {
		const inputs = [];
		for (const key in this.children) {
			const tool = this.children[key];
			if (tool instanceof MMExpression && tool.isInput) {
				inputs.push(tool);
			}
		}
		return inputs;
	}

	/**
	 * @method inputSources
	 * @override
	 * @returns {Set} contains tools referenced by this tool
	 */
	inputSources() {
		const sources = super.inputSources();
		const inputs = this.inputExpressions();
		for (const exp of inputs) {
			exp.formula.addInputSourcesToSet(sources);
		}
		return sources;
	}

	/**
	 * @method diagramInfoCommand
	 * @param {MMCommand} command
	 * command.results contains the info needed for model diagram
	 */
	diagramInfoCommand(command) {
		command.results = this.diagramInfo()
	}

	/**
	 * @method diagramInfo
	 * @returns {Object}
	 * returns object containing the info needed for model diagram
	 */
	diagramInfo() {
		let tools = {};
		for (const key in this.children) {
			const tool = this.children[key];
			if (!(tool instanceof MMTool)) {
				continue;
			}
			let requestors = [];
			const sources = tool.inputSources();
			for (const source of sources) {
				if (source !== tool) {
					requestors.push(source.name);
				}
			}
			const notes = tool.notes ? tool.notes.replace(/<\/*\w+>/g,'') : '';
			let toolInfo = {
				toolTypeName: tool.className.substring(2),
				name: tool.name,
				position: tool.position,
				requestors: requestors,
				notes: notes,
				diagramNotes: tool.diagramNotes,
			}
			if (tool instanceof MMExpression) {
				toolInfo['formula'] = tool.formula.formula;
				if (tool.cachedValue) {
					const unit = tool.displayUnit || tool.cachedValue.displayUnit;
					const format = tool.format || tool.cachedValue.displayFormat;
					const v = tool.cachedValue.stringWithUnit(unit, format);
					if (v) {
						toolInfo['result'] = v;
						toolInfo['resultType'] =
							tool.cachedValue instanceof MMNumberValue ? 'n' :
							tool.cachedValue instanceof MMStringValue ? 's' :
							tool.cachedValue instanceof MMTableValue ? 't' : ''
					}
				}
			}
			if (tool instanceof MMModel && tool.importInfo != null) {
				toolInfo.import = tool.importInfo.sessionName;
			}

			tools[tool.name] = toolInfo;
		}

		const info = {
			path: this.getPath(),
			tools: tools,
		};
		if (this.importInfo) {
			info.import = this.importInfo.sessionName;
		}
		return info;
	}

	/**
	 * @method saveObject
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		const o = super.saveObject();
		o.Type = 'Model';
		o.diagramScale = 1;	// need to fix this - get from interface?
		if (this.indexTool) {
			o.indexTool = this.indexTool;
		}

		if (this.importInfo) {
			this.determineImportInputFormulas();
			o.import = this.importInfo.saveObject();
			const childImportFormulas = {};
			this.getChildImportFormulas('', childImportFormulas);
			if (Object.keys(childImportFormulas).length) {
				o.import.childImportFormulas = childImportFormulas;
				// console.log('childImportFormulas', childImportFormulas);
			}
		}
		else {
			let tools = [];
			for (const key in this.children) {
				const tool = this.children[key];
				if (tool instanceof MMTool) {
					let saveTool = tool.saveObject();
					tools.push(saveTool);
				}
			}
			o.Objects = tools;
		}

		this.htmlProcessor.saveObject(o);
		return o;
	}

	getChildImportFormulas(parentName,childImportFormulas) {
		for (const toolName in this.children) {
			const tool = this.children[toolName];
			if (tool instanceof MMTool) {
				if (tool.importInfo) {
					tool.determineImportInputFormulas();
					childImportFormulas[`${parentName}.${toolName}`] = tool.importInfo.inputFormulas;
					tool.getChildImportFormulas(`${parentName}.${toolName}`, childImportFormulas);
				}
			}
		}
		return childImportFormulas;
	}
	async initFromSaved(saved) {
		super.initFromSaved(saved);
		if (saved.Objects) {
			await this.constructToolsFromSaved(saved.Objects);
		}
		else {
			if (saved.import) {
				const importInfo = new MMImportModelInfo();
				await importInfo.initFromSaved(saved.import);
				// check for recursion
				let parent = this.parent;
				const lcImportName = theMMSession.storePath + '/' + importInfo.sessionName.toLowerCase();
				let alreadyImported = lcImportName === theMMSession.storePath.toLowerCase();
				while (parent) {
					if (parent.importInfo && parent.importInfo.sessionName.toLowerCase() === lcImportName) {
						alreadyImported = true;
						this.setError('mmcmd:modelRecursiveImport', {importName: importInfo.sessionName, path: this.getPath()});
						break;
					}
					parent = parent.parent;
				}
				if (!alreadyImported) {
					await this.setImportInfo(importInfo);
				}
			}
		}
		if (saved.indexTool) {
			this.indexTool = saved.indexTool;
		}
		this.htmlProcessor.initFromSaved(saved);
	}

	/**
	 * @method constructToolsFromSaved
	 * @param {Object} savedTools
	 */
	async constructToolsFromSaved(savedTools) {
		 //console.log(`constructToolsFromSaved ${this.name}`);
		theMMSession.pushModel(this);
		for (let tool of savedTools) {
			const name = tool.name;
			const typeName = tool.Type
				.replace('ODE Solver', 'Ode')
				.replace('HTML Form', 'HtmlPage')
				.replace(' ','')
				.replace('Equation','')
				.replace('ModelArray', 'Model')
				.replace('Graph/Table', 'Graph');
			const toolType = MMToolTypes[typeName];
			if(!toolType) {
				const newTool = new MMExpression(name, this);
				newTool.formula.formula = `'Invalid Tool ${typeName}\n\nJSON:\n${JSON.stringify(tool, null, ' ')}`;
				newTool.savedInvalid = true;
			}
			else {
				let newTool = toolType.factory(name, this);
				// console.log(`newTool ${newTool.name} ${JSON.stringify(tool)}`);
				await newTool.initFromSaved(tool);
			}
		}
		theMMSession.popModel();
	}

	positionSort(a, b) {
		// sort by position with left most first and  ties broken by
		// top most first
		const posA = a.position;
		const posB = b.position;
		if (posA.x < posB.x) {
			return -1
		}
		if (posA.x > posB.x) {
			return 1;
		}
		if (posA.y < posB.y) {
			return -1;
		}
		if (posA.y > posB.y) {
			return 1
		}
		return 0;	
	}

	positionSortedChildren() {
		const tools = []
		for (const t of Object.values(this.children)) {
			if (t instanceof MMTool) {
				tools.push(t);
			}
		}
		return tools.sort(this.positionSort);
	}

	htmlInfo() {
		const results = {};
		const inputs = [];
		const outputs = [];
		const objects = [];
		for (const key in this.children) {
			const tool = this.children[key];
			if (!(tool instanceof MMTool)) {
				continue;
			}
			if (tool.showInput && tool.typeName === 'Expression') {
				inputs.push(tool);
			}
			if (tool.isOutput) {
					outputs.push(tool);
			}
			objects.push(tool);
		}

		results.inputs = inputs.sort(this.positionSort);
		results.outputs = outputs.sort(this.positionSort);
		results.objects = objects.sort(this.positionSort);
		return results;
	}

	/**
	 * @method htmlValue
	 * @returns {String}
	 */
	htmlValue(requestor, isMyNameSpace) {
		const results = this.htmlInfo(requestor);
		const onNameClick = `on${this.name}NameClick`;
		const chunks = [];
		if (isMyNameSpace) {
			chunks.push('		<div class="model-form">');
		}
		else {
			chunks.push('		<div class="model-form model-form-nested">');
		}
		const keyPressed = this.name + '_keyPressed';
		const changedInput = this.name + '_changedInput';
		let isAnyOutput = false;
		chunks.push('		<script>');
		const pathParts = [];
		if (this !== theMMSession.currentModel) {
			pathParts.push(this.name);
			let parent = this.parent;
			while (parent && parent !== theMMSession.currentModel) {
				pathParts.push(parent.name);
				parent = parent.parent;
			}
		}
		const pathPrefix = pathParts.length ? pathParts.reverse().join('.') + '.' : '';
		if (results.inputs.length) {
			isAnyOutput = true;
			chunks.push(`			const ${keyPressed} = (e) => {
					if (e.key === 'Enter') {
						e.target.blur();
					}
				}
				const ${changedInput} = (e, oldValue) => {
					const value = e.target.value;
					const inputId = e.target.id;
					const inputName = inputId.substring(${this.name.length + 1});
					mmpost([], {`);
			chunks.push('					mm_cmd: `.' + pathPrefix + '${inputName}.formula set formula ${value}`,');
			chunks.push('					mm_undo:`.' + pathPrefix + '${inputName}.formula set formula ${oldValue}`,');
			for (const output of results.outputs) {
				isAnyOutput = true;
				const outputId = `o_${this.name}_${output.name}`;
				chunks.push(`					${outputId}: "{html ${pathPrefix}${output.name}}",`);
			}
			chunks.push('					},(result) => {');
			for (const output of results.outputs) {
				if (output instanceof MMButton || output instanceof MMMenu) {
					continue;
				}
				const outputId = `o_${this.name}_${output.name}`;
				chunks.push(`					if (result.${outputId} !== null) {`)
				chunks.push(`						const element = document.getElementById("${outputId}")`);
				chunks.push(`						if (element) {`);
				chunks.push(`							element.innerHTML=result.${outputId};}`);
				chunks.push(`						}`);
			}
			chunks.push(`				});`);
			chunks.push('			}')
		}
		chunks.push(`	${onNameClick} = (name) => {`);
		chunks.push(`		mmpost([], {mm_push: '${pathPrefix}'+name});`);
		chunks.push('		}');
		chunks.push('		</script>');
		chunks.push('		<div class="model-form__objects">')
		if (isMyNameSpace) {
			chunks.push('	  <div class="model-form__buttons">');
			chunks.push(`   <div class="model-form__refresh" title="Refresh" onClick="mmpost([], {mm_cmd: '${this.getPath()} refresh'});">&nbsp;🔄</div>`);
			chunks.push('	  <div class="model-form__print" title="Print" onClick="window.print();">&nbsp;🖨️</div>')
			chunks.push('	  </div>');
		}
		for (let object of results.objects) {
			if (object.htmlNotes && object.notes) {
				isAnyOutput = true;
				chunks.push(`<div class="model-form__notes" onClick="${onNameClick}('${object.name}')">${object.notes}</div>`);
			}	
			if (object.showInput) {
				isAnyOutput = true;
				const input = object;
				chunks.push(`				<div class="model-form__input-row">`);
				chunks.push(`				<div class="model-form__input-name" onClick="${onNameClick}('${input.name}')">${input.name}</div>`);

				let formula = '';
				if (input.formula && input.formula.formula) {
					formula = input.formula.formula.replaceAll('"', '&quot;');
				}
				if (formula.startsWith("'")) {
					formula = '&quot;' + formula.substring(1) +'&quot;';
				}
				if (formula.indexOf('\n') !== -1) {
					chunks.push(`<div id="${this.name}_${input.name}" class="model-form__multiline-formula"  onClick="${onNameClick}('${input.name}')">${formula}</div>`);				}
				else {
					chunks.push(`				<div class="model-form__input">
					<input id="${this.name}_${input.name}"
					value="${formula}" onKeyUp="${keyPressed}(event)" onBlur="${changedInput}(event, '${formula}')"></div>`);
				}
				chunks.push('		</div>');
			}
			if (object.isOutput) {
				isAnyOutput = true;
				const output = object;
				let value;
				if (output instanceof MMMenu) {
					value = output.valueDescribedBy('self')
				}
				else {
					value = output.valueDescribedBy('', requestor);
				}
				const outputId = 'o_' + this.name + '_' + output.name;
				const enableClick =  output instanceof MMGraph ?
					` style="cursor:pointer;" onClick="${onNameClick}('${object.name}')"` : '';

				if (value) {
					if (value instanceof MMToolValue) {
						const nValues = value.valueCount;
						let headerDone = false;
						for (let i = 0; i < nValues; i++) {
							const toolValue = value.values[i];
							if (toolValue instanceof MMButton) {
								chunks.push(toolValue.htmlValue(requestor));
							}
							else if (toolValue instanceof MMMenu) {
								chunks.push(`<div class="model-form__input-row">`);
								chunks.push(`<div class="model-form__input-name" onClick="${onNameClick}('${output.name}')">${output.name}</div>`);
								chunks.push(`<div id="${outputId}" class="model-form__input">${toolValue.htmlValue(requestor)}</div>`);
								chunks.push('</div>');	
							}
							else {
								if (!headerDone) {
									chunks.push(`<div class="model-form__output-tool">`);
									chunks.push(`<div class="model-form__output-name" onClick="${onNameClick}('${output.name}')">${output.name}</div>`);
								}
								let displayValue;
								if (toolValue === this) {
									displayValue = this.name;
								}
								else {
									displayValue = toolValue.htmlValue(requestor);
								}
								chunks.push(`<div id="${outputId}" class="model-form__output_value"${enableClick}>${displayValue}</div>`);
								if (!headerDone) {
									chunks.push('</div>');	
									headerDone = true;
								}
							}
						}
					}
					else if (value.valueCount <= 1 && !(value instanceof MMTableValue) && !(value instanceof MMFlashPhaseValue)) {
						chunks.push(`<div class="model-form__output-row">`);
						chunks.push(`<div class="model-form__output-name" onClick="${onNameClick}('${output.name}')">${output.name}</div>`);
						chunks.push(`<div id="${outputId}" class="model-form__output-value model-form__1output-value">${value.htmlValue(requestor)}</div>`);
						chunks.push('</div>');	
					}
					else {
						chunks.push(`<div class="model-form__output-table">`);
						chunks.push(`<div class="model-form__output-name" onClick="${onNameClick}('${output.name}')">${output.name}</div>`);
						chunks.push(`<div id="${outputId}" class="model-form__output-value">${value.htmlValue(requestor)}</div>`);
						chunks.push('</div>');	
					}
				}
				else {
					chunks.push(`<div class="model-form__output-row">`);
					chunks.push(`<div class="model-form__output-name" onClick="${onNameClick}('${output.name}')">${output.name}</div>`);
					chunks.push(`<div id="${outputId}" class="model-form__output-value"></div>`);
					chunks.push('</div>');	
				}
			}
		}

		if (!isAnyOutput) {
			chunks.push('<div class="model-form__default">');
			for (const object of results.objects) {
				chunks.push(`<div class="model-form__default-name" onClick="${onNameClick}('${object.name}')">${object.typeName}: ${object.name}</div>`);
			}
			chunks.push('</div>');
		}
		chunks.push('</div>')
		return chunks.join('\n');
	}

	/**
	 * @method actionCommand
	 * @param {MMCommand} command
	 */
	async actionCommand(command) {
		command.results = await this.htmlProcessor.action(command.args);
		await this.session.autoSaveSession();
		if (command.results.undo) {
			command.undo = command.results.undo;
		}
		if (command.results.error) {
			command.error = command.results.error;
		}
	}

	/**
	 * @method rawHtml
	 * @returns {String}
	 */
	rawHtml() {
		return this.htmlValue(null, true);
	}

	/**
	 * @method toolViewInfo
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	async toolViewInfo(command) {
		await super.toolViewInfo(command);
		this.session.selectedObject = '';
		const results = command.results;
		if (this.importInfo) {
			results.importSource = this.importInfo.sessionName;
		}
		if (this.indexTool) {
			results.indexTool = this.indexTool;
		}
		if (this.lastDefaultUnitSetName !== theMMSession.unitSystem.sets.defaultSetName) {
			this.lastDefaultUnitSetName = theMMSession.unitSystem.sets.defaultSetName;
			this.htmlProcessor.clearCache();
		}
		results.html = this.htmlProcessor.htmlForRequestor();
	}

	/**
	 * @method setPositions
	 * @param {String} command
	 * command should be a series of toolname x y values 
	 */
	setPositions(command) {
		let parts = command.args.split(/\s/);
		let i = 0;
		let undoParts = [`${this.getPath()} setpositions`];
		while (i + 2 < parts.length) {
			const toolName = parts[i++];
			let tool = this.children[toolName.toLowerCase()];
			if (tool instanceof MMTool) {
				const x = parseFloat(parts[i++]);
				const y = parseFloat(parts[i++]);
				if (tool && !isNaN(x) && !isNaN(y)) {
					undoParts.push(`${toolName} ${tool.position.x} ${tool.position.y}`);
					tool.position = new MMPoint(x, y);
				}
				else {
					throw(this.t('mmcmd:modelSetPosition', {command: command, tool: toolName}));
				}
			}
			command.undo = undoParts.join(' ');
		}
		this.htmlProcessor.clearCache();
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
		let value;
		if (description.length === 0) {
			return MMToolValue.scalarValue(this);
		}
		const toolNameParts = description.split('.');
		let toolName = toolNameParts.shift().toLowerCase();
		const restOfPath = toolNameParts.join('.');
		const tool = this.children[toolName];
		if (tool instanceof MMTool) {
			value = tool.valueDescribedBy(restOfPath, requestor);
		}
		else if (toolName === 'html') {
			return MMStringValue.scalarValue(this.htmlValue());
		}
		else if (toolName === 'toolnames') {
			const names = this.positionSortedChildren().map( t => t.name);
			if (names.length) {
				value = MMStringValue.stringArrayValue(names);
			}
		}
		else if (toolName === 'tools') {
			const tools = this.positionSortedChildren();
			if (tools.length) {
				value = MMToolValue.toolArrayValue(tools);
				if (restOfPath && restOfPath.length) {
					value = value.valueDescribedBy(restOfPath, requestor);
				}
			}
		}
		else if (toolName === 'formulae') {
			value = MMStringValue.scalarValue(this.formulae());
		}
		else {
			// check for search type prefix
			let type = 'name';
			if (toolName.startsWith('type:')) {
				type = 'className';
				toolName = toolName.substring(5);
			}
			else if (toolName.startsWith('notes:')) {
				type = 'notes';
				toolName = toolName.substring(6);
			}
			// check for wild card characters
			// Replace '*' in the pattern with '.*' to create a regular expression
			const regexPattern = new RegExp("^" + toolName.split("*").join(".*") + "$", 'm');
			const tools = [];
			const children = this.positionSortedChildren()
			for (const child of children) {
				// if search for class name, remove the leading MM
				const testValue = type === "className" ? child.className.substring(2) : child[type];
				if (regexPattern.test(testValue.toLowerCase())) {
					tools.push(child);
				}
			}
			if (tools.length) {
				value = MMToolValue.toolArrayValue(tools);
				if (restOfPath && restOfPath.length) {
					value = value.valueDescribedBy(restOfPath, requestor);
				}
			}		
			else {
				value = super.valueDescribedBy(description, requestor);
			}
		}
		if (requestor && value) {
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
	 * @method forgetAllCalculations
	 */
	forgetAllCalculations() {
		super.forgetAllCalculations();
		for(let key in this.children) {
			const tool = this.children[key];
			if (tool instanceof MMTool) {
				tool.forgetAllCalculations();
			}
		}
	}

	/**
	 * @method makeImportUndo
	 * @returns {String} undo command
	 * makes an undo command for import
	 */
	makeImportUndo() {
		const savedImport = this.importInfo ? this.importInfo.saveObject() : null;
		if (savedImport) {
			return `${this.getPath()} restoreimport ${JSON.stringify(savedImport)}`;
		}
		else {
			return `${this.getPath()} makelocal`;
		}
	}

	/**
	 * @method importCommand
	 * @param {MMCommand} command
	 * command.results equal importInfo
	 */
	async importCommand(command) {
		const undoCommand = this.makeImportUndo();
		const importInfo = new MMImportModelInfo(command.args);
		await this.setImportInfo(importInfo);
		command.undo = undoCommand;
		command.results = this.importInfo;
	}

	/**
	 * @method makeLocalCommand
	 * @param {MMCommand} command
	 * command.results equal importInfo
	 */
	async makeLocalCommand(command) {
		if (this.importInfo) {
			command.undo = this.makeImportUndo();
			command.results = this.importInfo;
			this.importInfo = null;
			}
	}

	/**
	 * @method restoreImportCommand
	 * @param {MMCommand} command
	 * command.args should be the undo json
	 * in the form  /.x restoreimport  followed by the json text
	 * if importInfo previously existed, or just restoremport if none did
	 */
	async restoreImportCommand(command) {
		if (command.args) {
			const undoCommand = this.makeImportUndo();
			const restoreInfo = JSON.parse(command.args);
			const importToRestore = new MMImportModelInfo();
			await importToRestore.initFromSaved(restoreInfo);
			await this.setImportInfo(importToRestore);
			command.undo = undoCommand;
			command.results = importToRestore;
		}
	}

	/**
	 * @method determineImportInputFormulas
	 */
	determineImportInputFormulas() {
		const formulas = {};
		const inputs = this.inputExpressions();
		for (const exp of inputs) {
			if (exp.formula.formula )
				formulas[exp.name] = exp.formula.formula;
		}
		this.importInfo.inputFormulas = formulas;	
	}

	async setImportInfo(importInfo) {
		if (importInfo === null) { // make it local
			this.importInfo = importInfo;
			return;
		}
		// console.log(`setImportInfo ${this.name} ${JSON.stringify(importInfo)}`);
	
		if (!this.parent || this.importInfo == importInfo) {
			return;  // can't set on root
		}

		if (Object.keys(this.children).length && importInfo.inputFormulas === null) {
			// resetting source and no new input formulas - retain old
			if (!this.importInfo ) {
				this.importInfo = new MMImportModelInfo();
			}
			this.determineImportInputFormulas();
			importInfo.inputFormulas = this.importInfo.inputFormulas;
		}

		const removeCurrentContents = () => {
			// remove current contents
			for (const name of Object.keys(this.children)) {
				const tool = this.childNamed(name);
				if (tool instanceof MMTool) {
					try {
						tool.forgetCalculated();
					}
					finally {
						this.removeChildNamed(name);
					}
				}
			}
		}
	
		let importName = importInfo.sessionName;
		if (!importName) {
			removeCurrentContents();
			this.importInfo = importInfo;
			return;
		}

		// see if there is a parent import
		let parentWithImport = this.parent;
		while(parentWithImport && !parentWithImport.importInfo) {
			parentWithImport = parentWithImport.parent;
		}
		const parentImportInfo = parentWithImport ? parentWithImport.importInfo : null;

		// get the session folder for the current session
		const sessionFolder = theMMSession.storePath.match(/\//) ? theMMSession.storePath.replace(/\/[^/]+$/,'/') : '';
		let isAbsolute = false;
		if (importName.startsWith('/')) {
			// strip off leading /
			importName = importName.substring(1);
			// see if it is relative to the session folder
			if (importName.startsWith(sessionFolder)) {
				// remove the store path
				importName = importName.substring(sessionFolder.length);
				importInfo.importPath = sessionFolder;
				importInfo.sessionName = importName;
			}
			else {
				// it will be an absolute path
				isAbsolute = true;
				// add leading / bacto the session name
				importInfo.sessionName = '/' + importName;
				// see it import name is a folder path
				if (importName.match(/\//)) {
					// separate the folder path from the file name
					importInfo.importPath = importName.replace(/\/[^/]+$/,'/');
					importName = importName.replace(/.*\//,'');		
				}
				else {
					importInfo.importPath = '';
				}
			}
		}
		if (!isAbsolute) {
			importInfo.sessionName = importName;
			// see it import name is a folder path
			if (importName.match(/\//)) {
				// separate the folder path from the file name
				importInfo.importPath = sessionFolder + importName.replace(/\/[^/]+$/,'/');
				importName = importName.replace(/.*\//,'');		
			}
			else {
				importInfo.importPath = sessionFolder;
			}
			if (parentImportInfo) {
				// has ancestor import - use its import path
				importInfo.importPath = parentImportInfo.importPath;
			}	
		}

		const savedJson = await theMMSession.storage.load(importInfo.importPath + importName);
		if (!savedJson) {
			this.setError('mmcmd:sessionImportNotFound', {name: importName, path: this.getPath()});
			this.importInfo = importInfo;
			return;
		}
		this.importInfo = importInfo;

		removeCurrentContents();

		try {
			const savedCase = JSON.parse(savedJson)
			const savedTools = savedCase.RootModel.Objects;
			if (savedTools) {
				await this.constructToolsFromSaved(savedTools);
				if (importInfo.inputFormulas) {
					for (const expName of Object.keys(importInfo.inputFormulas)) {
						const exp = this.childNamed(expName);
						if (exp) {
							exp.formula.formula = importInfo.inputFormulas[expName];
						}
					}
					importInfo.inputFormulas = null;
				}
				if (importInfo.childImportFormulas) {
					for (const childPath of Object.keys(importInfo.childImportFormulas)) {
						const childNames = childPath.split('.');
						childNames.shift();
						let child = this;
						for (const childName of childNames) {
							child = child.childNamed(childName);
						}
						if (child) {
							const inputFormulas = importInfo.childImportFormulas[childPath];
							for (const expName of Object.keys(inputFormulas)) {
								const exp = child.childNamed(expName);
								if (exp) {
									exp.formula.formula = inputFormulas[expName];
								}
							}
						}
					}
				}
			}
		}
		catch (e) {
			this.setError('mmcmd:modelImportJsonError', {name: importName, path: this.getPath()});
			let exprName = `x${this.nextToolNumber++}`;
			while (this.childNamed(exprName)) {
				exprName = `x${this.nextToolNumber++}`;
			}	

			const expr = new MMExpression(exprName, this);
			expr.formula.formula = "'" + savedJson;
		}
	}

	/**
	 * @method formulae
	 * @returns String contains html listing of formulae
	 */
	formulae(isChild) {
		const chunks = [];
		if (!isChild) {
			chunks.push(`<style>
				.formula-list__path {
					font-size: 1.2em;
					font-weight: bold;
				}
				.formula-list__fname {
					font-size: 1.1em;
					font-weight: bold;
					margin: 0.1em;
				}
				.formula-list__formula {
					font-size: 1em;
					margin: 0.1em;
				}
				h4 {
					margin: 0.1em;
				}
			</style>`);
			chunks.push(`<script>
				document.addEventListener('click', e => {
					const a = e.target.closest('a[href^="#"]');
					if (!a) return;
					e.preventDefault();
					const id = a.hash.slice(1);
					document.getElementById(id)?.scrollIntoView({behavior:'smooth'});
				});
				</script>`)
		}
		const tools = [...(Object.values(this.children))]
		tools.sort((a, b) => a.name.localeCompare(b.name));

		const reverseLookup = {};

		// First pass: for each tool, for each input source, record that tool as a dependent
		tools.forEach(tool => {
			tool.inputSources().forEach(inputSource => {
				const key = inputSource.name;
				if (!reverseLookup[key]) {
					reverseLookup[key] = [];
				}
				reverseLookup[key].push(tool);
			});
		});

		for (const tool of tools) {
			if(tool instanceof MMTool) {
				const formulaList = tool.formulaList();
				if (formulaList.length || tool instanceof MMModel) {
					const path = tool.getPath().substring(7);
					const id = path.replace(/[^a-zA-Z0-9]/g, '_');
					chunks.push(`<h4 class="formula-list__path" id="${id}">${path}</h4>`);
					if (tool instanceof MMModel) {
						chunks.push(tool.formulae(true));
					}
					else {
						for (const formula of tool.formulaList()) {
							chunks.push(`<div class="formula-list__fname">${formula.name}</div>`);
							chunks.push(`<pre class="formula-list__formula"><code>${formula.formula}</code></pre>`);
						}						
					}
					const inputs = tool.inputSources();
					if (inputs.size) {
						chunks.push('<h4>Inputs</h4>');
						for (const input of inputs) {
							const inputId = input.getPath().substring(7).replace(/[^a-zA-Z0-9]/g, '_');
							chunks.push(`<div class="formula-list__reference"><a href="#${inputId}">${input.getPath()}</a></div>`);
						}
					}

					const references = reverseLookup[tool.name];
					if (references) {
						chunks.push('<h4>References</h4>');
						for (const reference of references) {
							const refId = reference.getPath().substring(7).replace(/[^a-zA-Z0-9]/g, '_');
							chunks.push(`<div class="formula-list__reference"><a href="#${refId}">${reference.getPath()}</a>	</div>`);
						}
					}

					chunks.push('<hr>');
				}
			}
		}
		return chunks.join('\n');
	}
}