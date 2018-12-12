'use strict';

/** @class MMCommand
	 * @member {string} expression 
	 * @member {string} subject 
	 * @member {string} verb 
	 * @member {string} args 
	 * @member {Object} results 
*/
class MMCommand {
	/**
	 * @param {string} expression
	 */
	constructor(expression) {
		this.expression = expression;
		// other members will be supplied by MMCommandProcessor.processCommand
		this.subject = undefined;
		this.verb = undefined;
		this.args = undefined;
		this.results = undefined;
	}
}

/** @class MMCommandMessage
 * encapsulates message key and arguments for i18next
 * @member {string} msgKey
 * @member {Object} args
 */
/* export */ class MMCommandMessage {
	/** @constructs
	 * @param {string} msgKey
	 * @param {Object} args
	 */
	constructor(msgKey, args) {
		this.msgKey = msgKey;
		this.args = args;
	}
}

/** @class MMCommandProcessor
 * @member {MMCommandParent} root
 * @member {boolean} useLineContinuation - if true, an underscore at line end means concatenate next line
 * @member {MMCommandObject} defaultObject
 * @member {string} currentExpression
 * @member {function} statusCallBack - (message: string) => void
 * @member {function} warningCallBack - (message: string) => void
 * @member {function} errorCallBack - (message: string) => void
*/
class MMCommandProcessor {
	/** @constructs */
	constructor() {
		this.root = undefined;
		this.useLineContinuation = true; 
		this.defaultObject = undefined;
		this.currentExpression = undefined;
		this.statusCallBack = undefined;
		this.warningCallBack = undefined;
		this.errorCallBack = undefined;
	}

	/**  @param {MMCommandParent} root - MMCommandParent */
	setRoot(root) {
		this.root = root;
		this.defaultObject = root;
	}

	/**  @param {string} path
	 * @returns {MMCommandObject} MMCommandObject at path
	 */
	setDefaultToPath(path) {
		let newObject = this.getObjectFromPath(path);
		if (newObject) {
			this.defaultObject = newObject;
		}
		else {
			throw(this.t('cmd:cannotChangeDefault', {path: path}));
		}
		
		 return newObject
	}

/**
	 * shortcut translate call
	 * @param {string} key
	 * @param {Object} options
	 * @returns {string}
	 */
	t(key, args) {
		return new MMCommandMessage(key, args);
	}

	/** @param {function} cb - msgKey: string => void */
	setErrorCallBack(cb) {
		this.errorCallBack = cb;
	}

	/** @param {function} cb - msgKey: string => void */
	setStatusCallBack(cb) {
		this.statusCallBack = cb;
	}

	/** @param {function} cb - msgKey: string => void */
	setWarningCallBack(cb) {
		this.warningCallBack = cb;
	}

	/** @param {MMCommand} command
	 * @returns {boolean} true if successful
	 */
	processCommand(command) {
		let expression = command.expression;
		this.currentExpression = expression;
		let terms = this.getNextTerm(expression);

		if (terms[0].length == 0) {
			return false;
		}
		let subjectPath = terms[0];
		// if subjectPath is blank, then there is nothing to do  
		if (subjectPath.length == 0) {
			return false;	
		}

		let subject = this.getObjectFromPath(subjectPath);
		if (subject) {
			// now get verb and arguments
			terms = this.getNextTerm(terms[1]);
		}
		else {
			// subject path is not valid path expression - assume it is command for defaultObject
			// terms will already hold the verb and arguments
			subject = this.defaultObject;
		}

		let verb = terms[0];
		if (verb.length == 0) {
			// use ls - list stuff :-)
			verb = 'list';
		}

		verb = verb.toLowerCase();
		command.subject = subject.name;
		command.verb = verb;
		command.args = terms[1];

		try {
			let localResults = subject.performCommand(verb, terms[1]);
			command.results = localResults;
		}
		catch(e) {
			if (typeof e == 'string' || e instanceof MMCommandMessage) {
				this.errorCallBack(e)
			}
			else {
				this.errorCallBack(e.message);
			}
			return false;
		}
		return true;
	}

	/** @param {string} commands
	 * commands is a string that could be made up of many commands separated by newline or semicolon
	 * characters.  This function splits them up and processes them one at a time and returns the
	 *concatenation of all their result strings
	 * @returns {MMCommand[]} a list of MMCommands or null
	 */
	processCommandString(commands) {
		let results = [];
		commands = commands.trim();
		if (commands.length > 0) {
			// cmds are separated by either \n or ;
			// two ; are replaced by a single one
			commands = commands.replace(/([^;]);([^;])/,'$1\n$2');
			commands = commands.replace(/;;/, ';');
			let cmdLines = commands.split('\n');
			let continuedCmd = '';
			for( let cmd of cmdLines) {
				cmd = continuedCmd + cmd.trim();
				if (this.useLineContinuation) {
					continuedCmd = '';
					if (cmd.endsWith('__')) {
						cmd = cmd.substr(0, cmd.length-1);   // escaped end underscore - leave one behind
					}
					else {
						if (cmd.endsWith('_')) {
							continuedCmd = cmd.substr(0, cmd.length-1) + '\n';
							continue;
						}
					}
				}
				
				if (cmd.length > 0) {
					let action = new MMCommand(cmd);
					if (this.processCommand(action)) {
						results.push(action);
					}
					else {
						return null;
					}
				}
			}

			if (continuedCmd.length > 0) {
				let action = new MMCommand(continuedCmd);
				this.processCommand(action);
				results.push(action);
			}
		}

		return results;
	}

	/** @param {string} expression
	 * @returns {string[]} string[next term, rest of expression]
	 */
	getNextTerm(expression) {
		// trim white space
		expression = expression.trim();

		// check first if expression starts with double or single quote
		let firstChar = expression[0];
		if (firstChar == "'" || firstChar == '"') {
			let secondQuotePos = expression.indexOf(firstChar, 1);
			if (secondQuotePos >= 0) {
				return [
					expression.slice(1,secondQuotePos).trim(),
					expression.substr(secondQuotePos+1).trim()
				];
			}
			else {
				// no closing quote, return everything after the first quote
				return [expression.substr(1).trim()];
			}
		}
		  
		// no quotes, so split on first space
		let firstSpacePos = expression.indexOf(' ');
		if (firstSpacePos >= 0) {
			return [
				expression.slice(0,firstSpacePos).trim(),
				expression.substr(firstSpacePos + 1).trim()
			];
		}
		else {
			return [expression, ''];
		}		  
	}

	/**
	 * @param {string} path 
	 * @param {MMCommandObject} startObject 
	 * @returns {MMCommandObject} returns found object or nil
	 */
	followPath(path, startObject) {
		let parts = path.split('.');
		let resultObject = startObject;
		for (let part of parts) {
			if (part.length > 0 && resultObject instanceof MMCommandParent) {
				resultObject = resultObject.childNamed(part);
			}
			if (!resultObject) {
				break;
			}
		}
		return resultObject;
	}

	/**
	 * @param {string} path
	 * @returns {MMCommandObject} found object or nil
	 */
	getObjectFromPath(path) {
		if (path.length > 0) {
			switch(path[0]) {
				case '.':
					return this.followPath(path.substr(1), this.defaultObject);
				case '/':
					return this.followPath(path.substr(1), this.root);
				case '^':
					return this.followPath(path.substr(1), this.defaultObject.parent);
			}
		}
		return undefined;
	}


	/** @param {string} message */
	showError(message) {
		this.errorCallBack(message);
	}

	/** @param {string} message */
	showStatus(messag) {
		this.statusCallBack(message);
	}

	/** @param {string} message */
	showWarning(message) {
		this.warningCallBack(message);
	}
}

/**
 * Enum for property types.
 * @readonly
 * @enum {string}
 */
/* export */ const PropertyType = Object.freeze({
	string: 'string',
	int: 'int',
	float: 'float',
	boolean: 'boolean'
});
/** Interface for property info
 * @interface PropertyInfo	
 * @property {PropertyType} type;
 * @property {boolean} readOnly;
 */

/** @class MMCommandObject
 *	@member {string} name
 *	@member {string} className
 *	@member {MMCommandProcessor} processor - can be nil
 *	@member {MMCommandParent} parent - can be nil
 *	@member {Object} properties - {string: PropertyInfo}
 *	@member {Object} verbs - [string]: (string) => any
*/
/* export */ class MMCommandObject {
	/** @constructor
	 * @param {string} name
	 * @param {MMCommandParent} parent
	 * @param {string} className
	*/
	constructor( name, parent, className) {
		this.name = name;
		this.className = className;
		this.processor = undefined;

		this.parent = parent;
		if (parent) {
			this.processor = parent.processor;
			parent.addChild(name.toLowerCase(), this);
		}
	}

	get verbs() {
		return {
			help: this.help,
			cd: this.changeDefaultTo,
			info: this.getInfo,
			renameto: this.renameto,
			get: this.getProperty,
			set: this.setProperty
		}
	}
	
	/** @method getVerbUsageKey
	 * derived classes that have verbs should override and call
	 * super if they don't have a matching command
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		return {
			help: 		"cmd:?help",
			cd: 			"cmd:?cd",
			info: 		"cmd:?info",
			renameto:	"cmd:?renameto",
			get: 			"cmd:?get",
			set: 			"cmd:?set"
		}[command];
	}

	get properties() {
		return {
			/** @property {PropertyInfo} name  */
			'name': {type: PropertyType.string, readOnly: true},
			/** @property {PropertyInfo} className */
			'className': {type: PropertyType.string, readOnly: true}
		}
	}

	/**
	 * shortcut translate call
	 * @param {string} key
	 * @param {Object} options
	 * @returns {string}
	 */
	t(key, args) {
		return new MMCommandMessage(key, args);
	}

	/**
	 * @method renameTo
	 * @param {string} newName 
	 */
	renameto(newName) {
		if (this.parent) {
			let oldPath = this.getPath()
			this.parent.renameChild(this.name, newName);
			return this.t('cmd:childRenamed', {fromPath: oldPath, toName: this.name});
		}
		else {
			return this.t('cmd:cannotRenameTo', {name: this.name, newName: newName});
		}	
	}

	/**
	 * @method getProperty
	 * @param {string} args 
	 */
	getProperty(args) {
		if (args === 'properties') {
			let props = {};
			for (let key in this.properties) {
				props[key] = this[key];
			}
			return props;
		}
		return this.getValue(args);
	}

	/**
	 * @method setProperty
	 * @param {string} args 
	 */
	setProperty(args) {
		let argValues = this.splitArgsString(args);
		/** @var {string} propertyName */
		let propertyName;
		/** @var {string valueString} */
		let valueString;
		switch(argValues.length) {
			case 0:
				throw(this.t('usage:?setValue'));
			case 1:
				propertyName = argValues[0];
				valueString = '';
				break;
			default:
				propertyName = argValues[0];
				valueString = argValues[1];
		}
		if (propertyName === 'properties') {
			// console.log(valueString);
			let props = JSON.parse(valueString);
			for (let propName in props) {
				if (this.properties[propName]) {
					this[propName] = props[propName];
				}
			}
			return propertyName + ' set';
		}

		this.setValue(propertyName, valueString);
		return propertyName + ' = ' + valueString;
	}

	/** @returns {string} returns path of this object */
	getPath() {
		if (!this.parent) {
			return '/';
		}
		else {
			return this.parent.getPath() + '.' + this.name;
		}
	}

	/**
	 * takes a string representation of the property named propertyName
	 * and sets the property value appropriately
	 * Derived classes may override this
	 * new variables can be created by starting the variable name with a _ character
	 * @param {string} propertyName 
	 * @param {string} value 
	 */
	setValue(propertyName, value) {
		if (propertyName.length > 0 && propertyName[0] == "_") {
			propertyName = propertyName.substring(1);
			if ( value.length > 0) {
				this[propertyName] = value;
				this.properties[propertyName] = { type: PropertyType.string, readOnly: false};
			}
			else {
				delete this[propertyName];
				delete this.properties[propertyName];
			}
		}
		else {
			let propInfo = this.properties[propertyName];
			if (propInfo && !propInfo.readOnly) {
				switch (propInfo.type) {
					case PropertyType.string:
						this[propertyName] = value;
						break;
					case PropertyType.int:
						this[propertyName] = parseInt(value);
						break;
					case PropertyType.float:
						this[propertyName] = parseFloat(value);
						break;
					case PropertyType.boolean:
						if (value.length > 0 && value.toLocaleLowerCase()[0] == 't') {
							this[propertyName] = true;
						}
						else {
							this[propertyName] = false;
						}
						
				}
				return;
			}
			throw(this.t('cmd:propertyNotFound', {name: this.name, propName: propertyName}));
		}
	}

	/**
	 * returns the property named propertyName
	 * @param {string} propertyName
	 * @returns {string|number|boolean}
	 */
	getValue(propertyName) {
		if (propertyName.length > 0 && propertyName[0] == "_") {
			let v = this[propertyName.substring(1)];
			if (v)
				return v;
		}
		else {
			let propInfo = this.properties[propertyName];
			if (propInfo) {
				return this[propertyName];
			}
		}
		throw(this.t('cmd:propertyNotFound', {name: this.name, propName: propertyName}));
	}

	/**
	 * 
	 * @param {string} argument
	 * @returns {Object} 
	 */
	getInfo(argument) {
		let fields = argument.split(".");
		switch(fields[0]) {
			case "properties":
				let returnValue = {};
				for (let propName in this.properties) {
					let info = this.properties[propName];
					returnValue[propName] = {
						type: info.type,
						readOnly: info.readOnly,
						value: this[propName]
					};
				}
				return returnValue;
			default:
				return this.t('cmd:classAndPath', {className: this.className, path: this.getPath()});
		}
	}

	/**
	 * @param {string} newPath
	 * @returns {string}
	 */
	changeDefaultTo(newPath) {
		let newObject = this.processor.setDefaultToPath(newPath);
		return this.t('cmd:changedDefault', {path: newObject.getPath()});
	}

	/**
	 * @param {string} cmd
	 * @returns {string}
	 */
	help(cmd) {
		if (cmd.length > 0) {
			let key = this.getVerbUsageKey(cmd.toLowerCase());
			if (key) {
				return this.t(key);
			}
			else {
				return this.t('cmd:unknownCommand', {command: cmd});
			}
		}
		return Object.keys(this.verbs).sort();
	}

	/**
	 * @param {string} args
	 * @returns {string[]}
	 */
	splitArgsString(args) {
		// reduce whitespace separators to single spaces
		args = args.replace(/%s+/, ' ');
		return args.split(' ');
	}

	/**
	 * this will overridden by derived classes, but they should call the super method if they can't
	 * respond to the command
	 * @param {string} verb 
	 * @param {string} args
	 * @returns {Object} 
	 */
	performCommand(verb, args) {
		let f = this.verbs[verb];
		if (f) {
			f = f.bind(this);
			return f(args);
		}

		throw(this.t('cmd:commandNotFound', {className: this.className, path: this.getPath(), cmd: verb}));
	}
}

/** @class MMCommandParent
 * @member {Object} children - {string: MMCommandObject}
*/
/* export */ class MMCommandParent extends MMCommandObject {

	/**
	 * @constructor
	 * @param {string} name 
	 * @param {Object} anyParam - can be MMCommandProcessor or MMCommandParent
	 * should be MMCommandProcessor for root object, otherwise the parent object
	 * @param {string} className 
	 */
	constructor(name, anyParam, className) {
		if (anyParam instanceof MMCommandProcessor) {
			super(name, undefined, className);  // doesn't have parent
			let cmdProcessor = anyParam;
			this.processor = cmdProcessor;
			cmdProcessor.setRoot(this);			// no parent so this must be root
		}
		else if (anyParam instanceof MMCommandParent) {
			super(name, anyParam, className);
		}
		this.children = {};
	}

	/** @override */
	get verbs() {
		let actions = super.verbs;
		actions['list'] = this.listChildNames;
		actions['createChild'] = this.createChildFromArgs;
		actions['removeChild'] = this.removeChild;
		return actions;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			list:					'cmd:?list',
			createchild:	'cmd:?createchild',
			removechild:	'cmd:?removechild'
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}

	/**
	 * will be overridden by derived classes
	 * as implemented here, only useful for testing
	 * @param {string} className 
	 * @param {string} name 
	 * @returns {MMCommandObject} - MMCommandObject created
	 */
	createChild(className, name) {
		switch(className) {
			case 'MMCommandObject':
				return new MMCommandObject(name, this, className);
			case 'MMCommandParent':
				return new MMCommandParent(name, this, className);
			default:
				throw(this.t('cmd:unknownClass', {className: className}));
		}
	}

	/**
	 * @method createChildFromArgs
	 * parses args string and then calls createChild
	 * @param {string} args 
	 */
	createchildFromArgs(args) {
		let argValues = this.splitArgsString(args);
		if (argValues.length < 2) {
			throw(this.t('usage:?createChild'));
		}
		let child = this.createChild(argValues[0], argValues[1]);
		return [this.t('cmd:createdChild', {className: argValues[0], name: argValues[1]})];				
	}


	/**
	 * @param {string} name 
	 */
	removeChildNamed(name) {
		let lcName = name.toLowerCase();
		if (this.children[lcName]) {
			delete this.children[lcName];
		}
		else {
			throw(this.t('cmd:childNotFound', {parent: this.getPath(), child: name}));
		}
	}

	/**
	 * @param {string} pattern
	 * @returns {string[]} 
	 */
	listChildNames(pattern) {
		let names = [];
		let re = new RegExp(pattern);
		for (let name in this.children) {
			if (pattern.length == 0) {
				names.push(name);
			}
			else if (name.search(re) != -1) {
				names.push(name);
			}				
		}
		return names.sort();
	}

	/**
	 * @param {string} fromName 
	 * @param {string} toName 
	 */
	renameChild(fromName, toName) {
		let lcFromName = fromName.toLowerCase();
		let lcToName = toName.toLowerCase();
		let child = this.children[lcFromName];
		if (!child) {
			throw(this.t('childNotFound', {parent: this.getPath(), fromName}));
		}

		let newChild = this.children[lcToName];
		if (newChild) {
			throw(this.t('nameAlreadyUsed', {name: toName, parent: this.getPath()}));
		}

		this.children[lcToName] = child;
		child.name = toName;
		delete this.children[lcFromName];
	}

	/**
	 * adds child to the children of this object
	 * @param {string} name 
	 * @param {MMCommandObject} child 
	 */
	addChild(name, child) {
		this.children[name.toLowerCase()] = child;
	}

	/**
	 * @param {string} name
	 * @returns {MMCommandObject} - returns child MMCommandObject or nil
	 */
	childNamed(name) {
		return this.children[name.toLowerCase()];
	}
}

