'use strict';

/**
 * @class MMModel - Math Minion tool contaioner
 * @extends MMTool
 * @member {Number} nextToolNumber
 * @member {boolean} isMissingObject
 */
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
		verbs['addtool'] = this.addTool;
		verbs['dgminfo'] = this.diagramInfoCommand;

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
			dgminfo: 'mmcmd:?modelDgmInfo'
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}

	/** @method addTool
	 * creates new Tool with supplied type and name
	 * @param {MMCommand} command
	 * command.args should be typeName and optionally name and x,y position
	 * if second argument starts with a number, it is asumed to be x coordinate
	 * @returns {MMTool}
	 */
	addTool(command) {
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
			const re = /^[\d\.\-]+$/;
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
			command.results = true;
			command.undo = this.getPath() + ' removechild ' + name;
		}
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
	 * @param {MMCommand} command
	 * @returns {Object}
	 * returns object containing the info needed for model diagram
	 */
	diagramInfo() {
		let tools = [];
		for (const key in this.children) {
			const child = this.children[key];
			let toolInfo = {
				toolTypeName: child.className.substring(2),
				name: child.name,
				position: child.position,
				notes: child.notes
			}
			if (child instanceof MMExpression) {
				toolInfo['formula'] = child.formula.formula;
				if (child.cachedValue) {
					const v = child.cachedValue.stringWithUnit(child.displayUnit);
					if (v) {
						toolInfo['result'] = v;
					}
				}
			}
			tools.push(toolInfo);
		}

		return {
			path: this.getPath(),
			tools: tools
		};
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