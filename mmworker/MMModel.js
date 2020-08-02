'use strict';
/* global
	MMTool:readonly
	MMToolValue:readonly
	MMToolTypes:readonly
	MMExpression:readonly
	theMMSession:readonly
	MMPoint:readonly
*/

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
		verbs['paste'] = this.pasteCommand;

		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			addtool: 'mmcmd:?modelAddTool',
			removetool: 'mmcmd:?modelRemoveTool',
			restoretool: 'mmcmd:?modelRestoreTool',
			dgminfo: 'mmcmd:?modelDgmInfo',
			setpositions: 'mmcmd:?modelSetPositions',
			copytool: 'mmcmd:?modelCopyTool',
			paste: 'mmcmd:?modelPaste'
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
			p.push(name + '.');
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
					if (tool.position.y > maxY) {
						maxY = tool.position.y;
						maxX = tool.position.x;
					}
					else if (tool.position.y == maxY && tool.position.x > maxX) {
						maxX = tool.position.x;
					}
				}

				if (maxX < 500) {
					newTool.position = {x: maxX + 70, y: maxY};
				}
				else {
					newTool.position = {x: 10, y: maxY + 30};
				}
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
			if (tool) {
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
		const typeName = tool.Type.replace(' ','').replace('Equation','');
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
			if (tool) {
				savedTools.push(tool.saveObject());
			}
		}
		const json = `{"CopyObjects": ${JSON.stringify(savedTools, null, '\t')}}`;
		command.results = json;
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
					const saved = JSON.parse(json);
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
						// just a single tool - probably copied from app based minion
						saved.DiagramX = originX;
						saved.DiagramY = originY;
						let number = 1;
						while ( this.childNamed(saved.name) ) {
							saved.name = `${name}_${number++}`;
						}
						this.restoreTool(saved);
						command.undo = `${this.getPath()} removetool ${saved.name}`
					}
					command.results = true;
				}
			}
		}
	}

	/**
	 * @method inputSources
	 * @override
	 * @returns {Set} contains tools referenced by this tool
	 */
	inputSources() {
		let sources = super.inputSources();
		for (const key in this.children) {
			const tool = this.children[key];
			if (tool instanceof MMExpression && tool.isInput) {
				tool.formula.addInputSourcesToSet(sources);
			}
		}
		return sources;
	}

	/**
	 * @method diagramInfo
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
			let requestors = [];
			const tool = this.children[key];
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
					const v = tool.cachedValue.stringWithUnit(tool.displayUnit);
					if (v) {
						toolInfo['result'] = v;
					}
				}
			}
			tools[tool.name] = toolInfo;
		}

		return {
			path: this.getPath(),
			tools: tools,
		};
	}

	/**
	 * @method saveObject
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let tools = [];
		for (const key in this.children) {
			const tool = this.children[key];
			let saveTool = tool.saveObject();
			tools.push(saveTool);
		}

		return Object.assign({}, super.saveObject(), {
			Type: 'Model',
			diagramScale: 1,  // need to fix this - get from interface
			Objects: tools
		});
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		super.initFromSaved(saved);
		theMMSession.pushModel(this);
		let tools = saved.Objects;
		for (let tool of tools) {
			const name = tool.name;
			const typeName = tool.Type.replace(' ','').replace('Equation','');
			const toolType = MMToolTypes[typeName];
			if(!toolType) {
				throw(this.t('mmcmd:modelInvalidToolType', {name: name, typeName: tool.Type}));
			}
			let newTool = toolType.factory(name, this);
			newTool.initFromSaved(tool);
		}
		theMMSession.popModel();
	}

	/**
	 * @method toolViewInfo
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	toolViewInfo(command) {
		super.toolViewInfo(command);
		this.session.selectedObject = '';
		const inputs = [];
		const outputs = [];
		const others = [];
		for (const key in this.children) {
			const tool = this.children[key];
			if (tool.typeName === 'Expression') {
				if (tool.isInput) {
					let value = tool.valueForRequestor();
					if (value) {
						value = value.stringWithUnit(tool.displayUnit);
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
					let value = tool.valueForRequestor();
					if (value) {
						value = value.stringWithUnit(tool.displayUnit);
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
				})
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

		const results = command.results;
		results.inputs = inputs.sort(positionSort);
		results.outputs = outputs.sort(positionSort);
		results.others = others.sort(positionSort);
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

		/**
	 * @override valueDescribedBy
	 * @param {String} description
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueDescribedBy(description, requestor) {
		let value;
		if (description) {
			if (description.length === 0) {
				return MMToolValue.scalarValue(this);
			}
			let toolName = description.split('.', 1);
			let restOfPath;
			if (toolName.length === 2) {
				[toolName, restOfPath] = toolName;
			}
			else {
				toolName = toolName[0];
			}
			toolName = toolName.toLowerCase();
			const tool = this.children[toolName];
			if (tool) {
				value = tool.valueDescribedBy(restOfPath, requestor);
			}
			else {
				value = super.valueDescribedBy(description, requestor);
			}
		}
		return value;
	}

	/**
	 * @method forgetAllCalculations
	 */
	forgetAllCalculations() {
		super.forgetAllCalculations();
		for(let key in this.children) {
			this.children[key].forgetAllCalculations();
		}
	}
}