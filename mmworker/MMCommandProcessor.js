'use strict';

/** @class MMCommand
	 * @member {string} expression 
	 * @member {string} subject 
	 * @member {string} verb 
	 * @member {string} args
	 * @member {string} error - undefined if no error
	 * @member {string} warning - undefined if no warning
	 * @member {Object} results 
*/
class MMCommand {
	/**
	 * @param {string} expression
	 */
	constructor(expression) {
		this.expression = expression;
		// other members will be supplied by MMCommandProcessor.processCommand
	}
}

/** @class MMCommandMessage
 * encapsulates message key and arguments for i18next
 * @member {string} msgKey
 * @member {Object} args
 * @member {MMCommandMessage} child - optional
 */
/* export */ class MMCommandMessage {
	/** @constructs
	 * @param {string} msgKey
	 * @param {Object} args
	 * @param {MMCommandMessage} child - optional
	 */
	constructor(msgKey, args, child) {
		this.msgKey = msgKey;
		this.args = args;
		if (child) {
			this.child = child;
		}
	}
}

/** @class MMCommandProcessor
 * @member {MMCommandParent} root
 * @member {boolean} useLineContinuation - if true, an underscore at line end means concatenate next line
 * @member {MMCommandObject} defaultObject
 * @member {string} currentExpression
 * @member {function} statusCallBack - (message: string) => void
*/
class MMCommandProcessor {
	/** @constructs */
	constructor() {
		this.root = undefined;
		this.useLineContinuation = true; 
		this.defaultObject = undefined;
		this.currentExpression = undefined;
		this.statusCallBack = undefined;
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
	setStatusCallBack(cb) {
		this.statusCallBack = cb;
	}

	/** @param {MMCommand} command
	 * @returns {boolean} true if successful
	 */
	async processCommand(command) {
		let expression = command.expression;
		this.currentExpression = expression;
		let terms = this.getNextTerm(expression);

		if (terms[0] === 'undo' || terms[0] === 'redo') {
			// these are used to tag undone and redone commands
			terms = this.getNextTerm(terms[1])
		}

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
		else if(subjectPath.startsWith('/') || subjectPath.startsWith('.')) {
			throw(this.t('cmd:subjectNotFound', {className: this.className, path: this.defaultObject.getPath(), subject: subjectPath}));
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

		await subject.performCommand(command);
		return true;
	}

	/** @param {string} commands
	 * commands is normally an object containing a cmdString and an id, but it can be just a plain string
	 * cmdString (or the plain string) can be made up of many commands separated by newline or semicolon
	 * characters.  This function splits them up and processes them one at a time and returns the
	 * concatenation of all their result strings.
	 * If an id is provided, it is returned as a property of the results array
	 * @returns {MMCommand[]} a list of MMCommands or null
	 */
	async processCommandString(commands) {
		let results = [];
		if (typeof commands === 'object') {
			results.id = commands.id;
			results.timeoutId = commands.timeoutId;
			commands = commands.cmdString;
		}
		try {
			commands = commands.trim();
			if (commands.length > 0) {
				if (commands.startsWith('__blob__')) {
					// the command has subject and verb surrounded by '__blob__' with everything
					// following the second __blob__ being a single argument
					let endBlob = commands.indexOf('__blob__',7);
					let subjectAndVerb = commands.substring(8, endBlob);
					let arg = commands.substring(endBlob + 8);
					let action = new MMCommand(subjectAndVerb + ' ' + arg);
					if (await this.processCommand(action)) {
						results.push(action);
					}
					return results;
				}
				// cmds are separated by either \n or ;
				// two ; are replaced by a single one
				commands = commands.replace(/([^;]);([^;])/,'$1\n$2');
				commands = commands.replace(/;;/, ';');
				let cmdLines = commands.split('\n');
				let continuedCmd = '';
				for( let cmd of cmdLines) {
					if (cmd.startsWith("'") && !continuedCmd) {  // comment
						continue;
					}
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
						if (await this.processCommand(action)) {
							results.push(action);
						}
						else {
							continue;
						}
					}
				}

				if (continuedCmd.length > 0) {
					let action = new MMCommand(continuedCmd);
					if (await this.processCommand(action)) {
						results.push(action);
					}
				}
			}
		}
		catch(e) {
			let message = (e instanceof Error) ? `Internal Error\n${e.message}` : e;
			results.error = message;
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
	showStatus(message) {
		this.statusCallBack(message);
	}
}

/**
 * Enum for property types.
 * @readonly
 * @enum {string}
 */
/* export */ const MMPropertyType = Object.freeze({
	string: 'string',
	int: 'int',
	float: 'float',
	boolean: 'boolean'
});
/** Interface for property info
 * @interface PropertyInfo	
 * @property {MMPropertyType} type;
 * @property {boolean} readOnly;
 */

/** @class MMCommandObject
 *	@member {string} name
 *	@member {string} className
 *	@member {MMCommandProcessor} processor - can be nil
 *	@member {MMCommandParent} parent - can be nil
 *	@member {Object} properties - {string: PropertyInfo}
 *	@member {Object} setProperties - {string: PropertyInfo}
 * properties added with set command
 *	@member {Object} verbs - [string]: (string) => any
 *	@member {MMCommand} _command
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
		this.setProperties = {};
//		this._command = undefined;

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
		return Object.assign({},
			{
			'name': {type: MMPropertyType.string, readOnly: true},
			'className': {type: MMPropertyType.string, readOnly: true}
			},
			this.setProperties
		);
	}

	get command() {
		if (!this._command && this.parent) {
			return this.parent.command;
		}
		return this._command;
	}

	/**
	 * shortcut translate call
	 * @param {string} key
	 * @param {Object} args - optional
	 * @param {MMCommandObject} child - optional
	 * @returns {string}
	 */
	t(key, args, child) {
		return new MMCommandMessage(key, args, child);
	}

	/**
	 * @method setError
	 * @param {String} key
	 * @param {Object} args - optional
	 * @param {MMCommandMessage} child - optional
	 */
	setError(key, args, child) {
		// ignore if error already set so first error is reported
		if (this.command && !this.command.error) {
			this.command.error = this.t(key, args, child);
		}
	}

	/**
	 * @method setWarning
	 * @param {String} key
	 * @param {Object} args
	 */
	setWarning(key, args) {
		// ignore if error already set so first error is reported
		if (this.command && !this.command.warning) {
			this.command.warning = this.t(key, args);
		}
	}

	/**
	 * @method caughtException
	 * @param {Error} e
	 */
	caughtException(e) {
		let message = (e instanceof Error) ? `${e.message}` : `${e}`;
		this.command.error = this.t('cmd:caughtException', {e: message});
	}

	/**
	 * @method parameters
	 * overridden by objects that have formula value parameters
	 * i.e. things that can be appended to a formula value
	 * e.g. aModel.anExpression.table
	 */
	parameters() {
		return [];
	}

	/**
	 * @method renameTo
	 * @param {MMCommand} command 
	 */
	renameto(command) {
		let newName = command.args;
		if (this.parent) {
			let oldPath = this.getPath()
			let oldName = this.name;
			this.parent.renameChild(this.name, newName);
			command.results = this.t('cmd:childRenamed', {fromPath: oldPath, toName: this.name});
			command.undo = this.getPath() + ' renameTo ' + oldName;
		}
		else {
			command.results = this.t('cmd:cannotRenameTo', {name: this.name, newName: newName});
		}	
	}

	/**
	 * @method getProperty
	 * @param {MMCommand} command 
	 */
	getProperty(command) {
		if (command.args === 'properties') {
			let props = {};
			for (let key in this.properties) {
				props[key] = this[key];
			}
			command.results = props;
		}
		else if (command.args === 'parameters') {
			command.results = this.parameters();
		}
		else {
			command.results = this.getValue(command.args);
		}
	}

	/**
	 * @method setProperty
	 * @param {MMCommand} command 
	 */
	setProperty(command) {
		let args = command.args;
		if (!args) {
			throw(this.t('cmd:?set'));
		}
		let firstSpace = args.indexOf(' ');
		let propertyName;
		let valueString;
		if (firstSpace == -1) {
			propertyName = args;
			valueString = '';
		}
		else {
			propertyName = args.slice(0, firstSpace);
			valueString = args.slice(firstSpace + 1);
		}
		
		let oldValue;
		if (propertyName.length > 0 && propertyName[0] == "_") {
			oldValue = this[propertyName.substring(1)];
		}
		else {
			oldValue = this[propertyName];
		}
		if (oldValue == undefined || oldValue == null) {
			oldValue = '';
		}
		this.setValue(propertyName, valueString);
		command.results = propertyName + ' = ' + valueString;
		command.undo = `__blob__${this.getPath()} set ${propertyName}__blob__${oldValue}`;
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
				this.setProperties[propertyName] = { type: MMPropertyType.string, readOnly: false};
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
					case MMPropertyType.string:
						this[propertyName] = value;
						break;
					case MMPropertyType.int:
						this[propertyName] = parseInt(value);
						break;
					case MMPropertyType.float:
						this[propertyName] = parseFloat(value);
						break;
					case MMPropertyType.boolean:
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
	 * @param {MMCommand} command
	 * @returns {Object} 
	 */
	getInfo(command) {
		let argument = command.args;
		let fields = argument.split(".");
		switch(fields[0]) {
			case "properties": {
				let returnValue = {};
				for (let propName in this.properties) {
					let info = this.properties[propName];
					returnValue[propName] = {
						type: info.type,
						readOnly: info.readOnly,
						value: this[propName]
					};
				}
				command.results = returnValue;
			}
				break;
			default:
				command.results = this.t('cmd:classAndPath', {className: this.className, path: this.getPath()});
		}
	}

	/**
	 * @param {string} newPath
	 * @returns {string}
	 */
	changeDefaultTo(command) {
		let undoCmd = 'cd ' + this.processor.defaultObject.getPath();
		let newObject = this.processor.setDefaultToPath(command.args);
		command['undo'] = undoCmd;
		command.results = this.t('cmd:changedDefault', {path: newObject.getPath()});
	}

	/**
	 * @param {MMCommand} command
	 */
	help(command) {
		let cmd = command.args;
		if (cmd.length > 0) {
			let key = this.getVerbUsageKey(cmd.toLowerCase());
			if (key) {
				command.results = this.t(key);
			}
			else {
				command.results = this.t('cmd:unknownCommand', {command: cmd});
			}
		}
		else {
			command.results = Object.keys(this.verbs).sort();
		}
	}

	/**
	 * @param {string} args
	 * @returns {string[]}
	 */
	splitArgsString(args) {
		// reduce whitespace separators to single spaces
		if (/["']/.test(args)) {
			let start = 0;
			let i = 0;
			const parts = [];
			while (i < args.length) {
				const c = args[i];
				if (c === '"' || c === "'") {
					if (i > start + 1) {
						parts.push(args.substring(start, i))
					}
					start = ++i;
					while (i < args.length && args[i] !== c) { i++; }
					if (i > start + 1) {
							parts.push(args.substring(start, i));
							start = ++i;
					}
				}
				else if (c === ' ') {
					if (i > start + 1) {
						parts.push(args.substring(start, i))
					}
					while (i < args.length && args[i] === ' ') { i++; }  // trim extra spaces
					start = i; 
				} else {
					i++;
				}
			}
			if (i > start + 1) {
				parts.push(args.substring(start, i))
			}
			return parts;
		}
		else {
			args = args.replace(/%s+/, ' ');
			return args.split(' ');
		}
	}

	/**
	 * @method performCommand
	 * this will overridden by derived classes, but they should call the super method if they can't
	 * respond to the command
	 * @param {MMCommand} command 
	 * @returns {Object} 
	 */
	async performCommand(command) {
		this._command = command; // temporary so warnings can be set
		try {
			let f = this.verbs[command.verb];
			if (!f) {
				throw(this.t('cmd:commandNotFound', {className: this.className, path: this.getPath(), cmd: command.verb}));
			}
			f = f.bind(this);
			await f(command);
		}
		finally {
			delete this._command;  // remove temporary assignment
		}
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
	// eslint-disable-next-line constructor-super
	constructor(name, anyParam, className) {
		if (anyParam instanceof MMCommandProcessor) {
			super(name, undefined, className);  // doesn't have parent
			let cmdProcessor = anyParam;
			this.processor = cmdProcessor;
			cmdProcessor.setRoot(this);			// no parent so this must be root
			this.children = {};
		}
		else if (anyParam instanceof MMCommandParent) {
			super(name, anyParam, className);
			this.children = {};
		}
	}

	/** @override */
	get verbs() {
		let actions = super.verbs;
		actions['list'] = this.listChildNames;
		actions['createchild'] = this.createChildFromArgs;
		actions['removechild'] = this.removeChildNamedCommand;
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
	 * @param {MMCommand} command 
	 */
	createChildFromArgs(command) {
		let argValues = this.splitArgsString(command.args);
		if (argValues.length < 2) {
			throw(this.t('cmd:?createchild'));
		}
		let name = argValues[1];
		this.createChild(argValues[0], name);
		command.results = [this.t('cmd:createdChild', {className: argValues[0], name: argValues[1]})];
		command.undo = this.getPath() + ' removechild ' + name;			
	}

	/**
	 * @method removeChildNamed
	 * @param {String} name
	 * returns true if successful
	 */
	removeChildNamed(name) {
		let lcName = name.toLowerCase();
		if (this.children[lcName]) {
			delete this.children[lcName];
			return true;
		}
		return false;
	}

	/**
	 * @param {MMCommand} command
	 * command.args should be the child name
	 */
	removeChildNamedCommand(command) {
		let name = command.args;
		if (this.removeChildNamed(name)) {
			command.results = this.t('cmd:removedChild', {name: name})
		}
		else {
			throw(this.t('cmd:childNotFound', {parent: this.getPath(), child: name}));
		}
	}

	/**
	 * @param {MMCommand} command
	 */
	listChildNames(command) {
		let pattern = command.args;
		let names = [];
		let re = new RegExp(pattern);
		for (let name in this.children) {
			let child = this.children[name];
			if (pattern.length == 0) {
				names.push(child.name);
			}
			else if (name.search(re) != -1) {
				names.push(child.name);
			}				
		}
		command.results = names.sort();
	}

	/**
	 * @param {string} fromName 
	 * @param {string} toName 
	 */
	renameChild(fromName, toName) {
		let lcFromName = fromName.toLowerCase();
		let lcToName = toName.toLowerCase();
		if (lcToName == lcFromName) {
			return;
		}
		
		let child = this.children[lcFromName];
		if (!child) {
			throw(this.t('cmd:childNotFound', {parent: this.getPath(), fromName}));
		}

		let newChild = this.children[lcToName];
		if (newChild) {
			throw(this.t('cmd:nameAlreadyUsed', {name: toName, parent: this.getPath()}));
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

