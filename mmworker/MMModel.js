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
	}
}

/**
 * @class MMModel - Math Minion tool contaioner
 * @extends MMTool
 * @member {Number} nextToolNumber
 * @member {boolean} isMissingObject
 */
// eslint-disable-next-line no-unused-vars
class MMModel extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Model');
		this.nextToolNumber = 1;
		this.isMissingObject = false;
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
				p.push(name + '.');
			}
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
			name = `x${this.nextToolNumber++}`;
			while ( this.childNamed(name) ) {
				name = `x${this.nextToolNumber++}`;
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
				let maxX = 10, maxY = 10;
				for (const key in this.children) {
					const tool = this.children[key];
					if (tool instanceof MMTool) {
						if (tool.position.y > maxY) {
							maxY = tool.position.y;
							maxX = tool.position.x;
						}
						else if (tool.position.y == maxY && tool.position.x > maxX) {
							maxX = tool.position.x;
						}
					}
				}

				if (maxX < 500) {
					newTool.position = {x: maxX + 70, y: maxY};
				}
				else {
					newTool.position = {x: 10, y: maxY + 30};
				}
			}
			if (isImport) {
				newTool.importInfo = new MMImportModelInfo('');
			}
			command.results = name;
			command.undo = this.getPath() + ' removetool ' + name;
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
			command.undo = `__blob__${this.getPath()} restoretool__blob__${json}`;
		}
	}

	/**
	 * @method restoreTool - adds a tool from json - for undo
	 * @param {Object} tool - from json
	 */
	restoreTool(tool) {
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
		newTool.initFromSaved(tool);
	}

	/**
	 * @method restoreToolCommand
	 * @param {MMCommand} command
	 * command.args should be the undo json
	 * in the form __blob__/.x restoretool__blob__ followed by the json text
	 */
	restoreToolCommand(command) {
		const savedTools = JSON.parse(command.args);

		for (let saved of savedTools) {
			this.restoreTool(saved);
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
		if (tool) {
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
	 * in the form __blob__/.x paste x y__blob__ followed by the json text
	 */
	pasteCommand(command) {
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
						newTool.initFromCsv(json);
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
								this.restoreTool(toolInfo);
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
							else if (saved.name) {
								// just a single tool - probably copied from app based minion
								name = saved.name;
								tool = saved;
							}
							else {
								return; // invalid object
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
	 * @method outputExpressions
	 * @returns {Array}
	 * returns the contained expressions marked as outputs
	 */
	outputExpressions() {
		const outputs = [];
		for (const key in this.children) {
			const tool = this.children[key];
			if (tool instanceof MMExpression && tool.isOutput) {
				outputs.push(tool);
			}
		}
		return outputs;
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
			let toolInfo = {
				toolTypeName: tool.className.substring(2),
				name: tool.name,
				position: tool.position,
				requestors: requestors,
				notes: tool.notes,
				diagramNotes: tool.diagramNotes,
			}
			if (tool instanceof MMExpression) {
				toolInfo['formula'] = tool.formula.formula;
				if (tool.cachedValue) {
					const v = tool.cachedValue.stringWithUnit(tool.displayUnit, tool.format);
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

		return o;
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @param {Object} saved 
	 */
	async initFromSaved(saved) {
		super.initFromSaved(saved);
		if (saved.Objects) {
			this.constructToolsFromSaved(saved.Objects);
		}
		else {
			if (saved.import) {
				const importInfo = new MMImportModelInfo();
				importInfo.initFromSaved(saved.import);
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
	}

	/**
	 * @method constructToolsFromSaved
	 * @param {Object} savedTools
	 */
	constructToolsFromSaved(savedTools) {
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
				newTool.initFromSaved(tool);
			}
		}
		theMMSession.popModel();
	}

	htmlInfo(requestor) {
		const results = {};
		const inputs = [];
		const outputs = [];
		const objects = [];
		const others = [];
		for (const key in this.children) {
			const tool = this.children[key];
			if (tool.typeName === 'Expression') {
				if (tool.isInput) {
					let value = tool.valueForRequestor(requestor);
					if (value) {
						value = value.stringWithUnit(tool.displayUnit, tool.format);
					}
					else {
						value = '?';
					}
					const object = {
						name: tool.name,
						type: 'input',
						formula: tool.formula.formula,
						value: value,
					};
					inputs.push(object);
					objects.push(object);
				}
				else if (tool.isOutput) {
					let value = tool.valueForRequestor(requestor);
					if (value) {
						value = value.stringWithUnit(tool.displayUnit, tool.format);
					}
					else {
						value = '?';
					}
					const object = {
						name: tool.name,
						type: 'output',
						value: value,
					};
					outputs.push(object);
					objects.push(object);
				}
				else {
					others.push({
						name: tool.name,
						type: tool.typeName,				
					})
				}
			}
			else {
				others.push({
					name: tool.name,
					type: tool.typeName,				
				});
			}
		}

		const positionSort = (a, b) => {
			// sort by position with left most first and  ties broken by
			// top most first
			const posA = this.childNamed(a.name).position;
			const posB = this.childNamed(b.name).position;
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

		results.inputs = inputs.sort(positionSort);
		results.outputs = outputs.sort(positionSort);
		// results.others = others.sort(positionSort);
		results.objects = objects.sort(positionSort);
		return results;
	}

	/**
	 * @method htmlValue
	 * @returns {String}
	 */
	htmlValue(requestor, isMyNameSpace) {
		const results = this.htmlInfo(requestor);
		const chunks = [];
		chunks.push('		<div class="model-form">');
		const keyPressed = this.name + '_keyPressed';
		const changedInput = this.name + '_changedInput';
		chunks.push('		<script>');
		if (results.inputs.length) {
			const pathPrefix = isMyNameSpace ? "" : this.name + '.'
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
				const outputId = `${this.name}_${output.name}`;
				chunks.push(`					${outputId}: "{html ${pathPrefix}${output.name}}",`);
			}
			chunks.push('					},(result) => {');
			for (const output of results.outputs) {
				const outputId = `${this.name}_${output.name}`;
				chunks.push(`					document.getElementById("${outputId}").innerHTML=result.${outputId};`);
			}
			chunks.push(`				});`);
			chunks.push('			}')
		}
		chunks.push('	onNameClick = (name) => {');
		if (isMyNameSpace) {
				chunks.push(`		mmpost([], {mm_push: name});`);
			}
		chunks.push('		}');
		chunks.push('		</script>');
		chunks.push('		<div class="model-form__objects">')
		chunks.push(`			<div class="model-form__title">${this.name}</div>`)
		for (let object of results.objects) {
			if (object.type === 'input') {
				const input = object;
				chunks.push(`				<div class="model-form__input-row">`);
				chunks.push(`				<div class="model-form__input-name" onClick="onNameClick('${input.name}')">${input.name}</div>`);

				let formula = input.formula.replaceAll('"', '&quot;');
				if (formula.startsWith("'")) {
					formula = '&quot;' + formula.substring(1) +'&quot;';
				}
				chunks.push(`				<div class="model-form__input"><input id="${this.name}_${input.name}"
				value="${formula}" onKeyUp="${keyPressed}(event)" onBlur="${changedInput}(event, '${formula}')"></div>`);
				chunks.push('		</div>');
			}
			else {
				const output = object;
				const tool = this.children[output.name.toLowerCase()];
				let value = tool.valueForRequestor(requestor);
				if (value) {
					const outputId = this.name + '_' + output.name;
					if (value instanceof MMToolValue) {
						value = value.values[0];
						chunks.push(`<div class="model-form__output-tool">`);
						chunks.push(`<div class="model-form__output-name" onClick="onNameClick('${output.name}')">${output.name}</div>`);
						chunks.push(`<div id="${outputId}" class="model-form__output_value">${value.htmlValue(requestor)}</div>`);
						chunks.push('</div>');	
					}
					else if (value.valueCount <= 1) {
						chunks.push(`<div class="model-form__output-row">`);
						chunks.push(`<div class="model-form__output-name" onClick="onNameClick('${output.name}')">${output.name}</div>`);
						chunks.push(`<div id="${outputId}" class="model-form__output-value">${value.htmlValue(requestor)}</div>`);
						chunks.push('</div>');	
					}
					else {
						chunks.push(`<div class="model-form__output-table">`);
						chunks.push(`<div class="model-form__output-name" onClick="onNameClick('${output.name}')">${output.name}</div>`);
						chunks.push(`<div id="${outputId}" class="model-form__output-value">${value.htmlValue(requestor)}</div>`);
						chunks.push('</div>');	
					}
				}
			}
			chunks.push('</div>')
		}
		chunks.push('</div>')
		return chunks.join('\n');
	}

	expressionInfo(results, requestor) {
		const inputs = [];
		const outputs = [];
		const others = [];
		for (const key in this.children) {
			const tool = this.children[key];
			if (tool.typeName === 'Expression') {
				if (tool.isInput) {
					let value = tool.valueForRequestor(requestor);
					if (value) {
						value = value.stringWithUnit(tool.displayUnit, tool.format);
					}
					else {
						value = '?';
					}
					inputs.push({
						name: tool.name,
						formula: tool.formula.formula,
						value: value,
					})
				}
				else if (tool.isOutput) {
					let value = tool.valueForRequestor(requestor);
					if (value) {
						value = value.stringWithUnit(tool.displayUnit, tool.format);
					}
					else {
						value = '?';
					}
					outputs.push({
						name: tool.name,
						value: value,
					})
				}
				else {
					others.push({
						name: tool.name,
						type: tool.typeName,				
					})
				}
			}
			else {
				others.push({
					name: tool.name,
					type: tool.typeName,				
				});
			}
		}

		const positionSort = (a, b) => {
			// sort by position with left most first and  ties broken by
			// top most first
			const posA = this.childNamed(a.name).position;
			const posB = this.childNamed(b.name).position;
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

		results.inputs = inputs.sort(positionSort);
		results.outputs = outputs.sort(positionSort);
		results.others = others.sort(positionSort);
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
		this.expressionInfo(results);
		if (this.importInfo) {
			results.importSource = this.importInfo.sessionName;
		}
		if (this.indexTool) {
			results.indexTool = this.indexTool;
		}
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
		const toolName = toolNameParts.shift().toLowerCase();
		const restOfPath = toolNameParts.join('.');
		const tool = this.children[toolName];
		if (tool instanceof MMTool) {
			value = tool.valueDescribedBy(restOfPath, requestor);
		}
		else {
			value = super.valueDescribedBy(description, requestor);
		}
		return value;
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
			return `__blob__${this.getPath()} restoreimport__blob__${JSON.stringify(savedImport)}`;
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
	 * in the form __blob__/.x restoreimport__blob__ followed by the json text
	 * if importInfo previously existed, or just restoremport if none did
	 */
	async restoreImportCommand(command) {
		if (command.args) {
			const undoCommand = this.makeImportUndo();
			const restoreInfo = JSON.parse(command.args);
			const importToRestore = new MMImportModelInfo();
			importToRestore.initFromSaved(restoreInfo);
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

		// get the session from local storage
		if (importName.startsWith('/')) {
			// absolute path - just strip leading slash
			importName = importName.substring(1);
			importInfo.importPath = importName.replace(/\/[^/]+$/,'/');
		}
		else if (parentImportInfo) {
			// has ancestor import - use its import path
			importName = parentImportInfo.importPath + importName;
			importInfo.importPath = parentImportInfo.importPath;
		}
		else if (theMMSession.storePath.match(/\//) ){
			// relative - prepend current session folder
			importInfo.importPath = theMMSession.storePath.replace(/\/[^/]+$/,'/');
			importName = importInfo.importPath + importName;
		}
		else if (importName.match(/\//)) {
			importInfo.importPath = importName.replace(/\/[^/]+$/,'/');
		}
		else {
			importInfo.importPath = '';
		}

		const savedJson = await theMMSession.storage.load(importName);
		if (!savedJson) {
			this.setError('mmcmd:sessionImportNotFound', {name: importName, path: this.getPath()});
			return;
		}

		removeCurrentContents();

		this.importInfo = importInfo;
		try {
			const savedCase = JSON.parse(savedJson)
			const savedTools = savedCase.RootModel.Objects;
			if (savedTools) {
				this.constructToolsFromSaved(savedTools);
				if (importInfo.inputFormulas) {
					for (const expName of Object.keys(importInfo.inputFormulas)) {
						const exp = this.childNamed(expName);
						exp.formula.formula = importInfo.inputFormulas[expName];
					}
					importInfo.inputFormulas = null;
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
}