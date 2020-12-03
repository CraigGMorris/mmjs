'use strict';

/* global
	MMCommandParent:readonly
	MMUnitSystem:readonly
	MMPropertyType:readonly
	MMModel:readonly
	MMNumberValue:readonly
	MMStringValue:readonly
	MMConstantOperator:readonly
	MMFormulaOpDictionary:readonly
	MMExpression:readonly
	MMCommandMessage:readonly
	MMMatrix:readonly
	MMDataTable:readonly
	MMSolver:readonly
	MMOde:readonly
	MMIterator:readonly
	MMOptimizer:readonly
	MMGraph:readonly
	MMHtmlPage:readonly
	theMMSession:readonly
	MMToolValue:readonly
*/

/** @class MMPoint
 * simple point class
 * @member {number} x
 * @member {number} y
 */
class MMPoint {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}

/**
 * @class MMSessionStorage - persistent storage for session
 */
class MMSessionStorage  {
	constructor() {
		this.isSetup = false;
	}
	
	/**
	 * @method setup - prepare db for storage
	 */
	async setup() {
		let storage = this;
		return new Promise((resolve, reject) => {
			if (this.isSetup) { // already set up
				resolve();
				return;
			}

			let dbReq = indexedDB.open('MMSessions', 1);
			dbReq.onupgradeneeded = function(event) {
				storage.db = event.target.result;
				if (!storage.db.objectStoreNames.contains('sessions')) {
					storage.db.createObjectStore('sessions', {keyPath: 'id'});
				} 
			}

			dbReq.onsuccess = function(event) {
				storage.db = event.target.result;
				storage.isSetup = true;
				resolve();
			}

			dbReq.onerror = function(event) {
				reject(event.target.errorCode);
			}
		});
	}

	/**
	 * @method save
	 * @param {String} path - persistent storage path
	 * @param {String} json - json representation of session
	 */
	async save(path, json) {
		let storage = this;
		await this.setup();
		return new Promise((resolve, reject) =>  {
			// Start a database transaction and get the sessions object store
			let tx = storage.db.transaction(['sessions'], 'readwrite');
			let store = tx.objectStore('sessions');
			// add the json with the path as the key
			let request = store.put({id: path, session: json});
//			tx.oncomplete = resolve;
//			tx.onerror = (event) => {
			request.onsuccess = () => {
				resolve(path);
			}
			request.onerror = event => {
				reject(event.target.errorCode);
			}
		});
	}

	/**
	 * @method load
	 * @param {String} path - persistent storage path
	 */
	async load(path) {
		let storage = this;
		await this.setup();
		return new Promise((resolve, reject) =>  {
			// Start a database transaction and get the sessions object store
			let tx = storage.db.transaction(['sessions'], 'readonly');
			let store = tx.objectStore('sessions');
			let request = store.get(path);
			request.onsuccess = () => {
				if (request.result) {
					resolve(request.result.session);
				}
				else {
					resolve(null);
				}
			};
			request.onerror = (event) => {
				reject(event.target.errorCode);
			}
		});
	}

	/**
	 * @method delete
	 * @param {String} path - persistent storage path to delete
	 */
	async delete(path) {
		let storage = this;
		await this.setup();
		return new Promise((resolve, reject) =>  {
			// Start a database transaction and get the sessions object store
			let tx = storage.db.transaction(['sessions'], 'readwrite');
			let store = tx.objectStore('sessions');
			let request = store.delete(path);
			request.onsuccess = () => {
					resolve(path);
			};
			request.onerror = (event) => {
				reject(event.target.errorCode);
			}
		});
	}

	/**
	 * @emethod copy
	 * @param {String} oldPath
	 * @param {String} newPath
	 */
	async copy(oldPath, newPath) {
		let session = await this.load(oldPath);
		if (session) {
			await this.save(newPath, session);
			return newPath;
		}
	}

	/**
	 * @method listSessions
	 */
	async listSessions() {
		let storage = this;
		await this.setup();
		return new Promise((resolve, reject) =>  {
			// Start a database transaction and get the sessions object store
			let tx = storage.db.transaction(['sessions'], 'readonly');
			let store = tx.objectStore('sessions');
			let request = store.getAllKeys();
			request.onsuccess = (event) => {
				if (request.result) {
					resolve(request.result);
				}
				else {
					console.log(`list sessions failed ${event}`);
					resolve(null);
				}
			};
			request.onerror = (event) => {
				reject(event.target.errorCode);
			}
		});
	}
}

/**
 * @class MMSession - base Math Minion class
 * @extends MMCommandParent
 * @member {MMUnitSystem} unitSystem
 * @member {MMModel} rootModel
 * @member {MMModel} currentModel
 * @member {MMModel[]} modelStack
 * @member {string} storePath - path to persistent storage
 * @member {MMPoint} unknownPosition
 * @member {MMPoint} nextToolLocation
 * @member {MMSessionStorage} storage
 */
// eslint-disable-next-line no-unused-vars
class MMSession extends MMCommandParent {
	// session creation and storage commands

	/**
	 * @constructor
	 * @param {Object} processor - MMCommandProcessor
	 */
	constructor(processor) {
		super('session',  processor, 'MMSession');
		// construct the unit system - it will add itself to my children
		new MMUnitSystem(this);
		this.storage = new MMSessionStorage();
		this.savedLastPathId = '(lastPath)';
		this.loadAutoSaved();
	}

	/** @method newSession
	 * initialize to new empty session
	 * @param {string} storePath - the storage path
	 */
	newSession(storePath) {
		if (!storePath) {
			storePath = '(unnamed)';
		}
		this.nextToolLocation = this.unknownPosition;
		this.rootModel = MMToolTypes['Model'].factory('root', this);
		this.currentModel = this.rootModel;
		this.modelStack = [this.currentModel];
		this.storePath = storePath;
		this.processor.defaultObject = this.rootModel;
		this.selectedObject = '';
	}

	get properties() {
		let d = super.properties;
		d['storePath'] = {type: MMPropertyType.string, readOnly: false};
		return d;
	}


	/**
	 * create a new session from json (stored case)
	 * @param {string} json 
	 * @param {string} storePath - default storage location
	 */
	async initializeFromJson(json, storePath) {
		let saveObject;
		try {
			saveObject = JSON.parse(json);
		}
		catch(e) {
			const msg = (typeof e === 'string') ? e : e.message;
			this.setError('mmcmd:parseSessionError', {error: msg});
			return;
		}

		if (saveObject.UserUnitSets) {
			this.unitSystem.sets.loadFromJsonObject(saveObject.UserUnitSets, false);
		}

		if (saveObject.UserUnits) {
			this.unitSystem.units.loadFromJsonObject(saveObject.UserUnits);
		}

		let rootModel = MMToolTypes['Model'].factory('root', this);
		if (storePath) {
			this.storePath = storePath;
		}
		await rootModel.initFromSaved(saveObject.RootModel);

		this.nextToolLocation = this.unknownPosition;
		this.rootModel = rootModel;
		this.currentModel = rootModel;
		this.modelStack = [rootModel];
		if (!storePath) {
			this.storePath = saveObject.CaseName;
		}
		this.processor.defaultObject = rootModel;
	}

	/** @method sessionAsJson
	 * returns the json needed to save the session
	 * @param {string} path - the path to store to
	 */
	sessionAsJson(path=null) {
		let detailWidth = this['detailWidth'] ? this['detailWidth'] : 320;
		let deviceWidth = this['deviceWidth'] ? this['deviceWidth'] : 1024;
		if (path) {
			this.storePath = path;
		}
		let pathParts = this.storePath.split('/');
		let caseName = pathParts.pop()
		let rootSave = this.rootModel.saveObject();
		let modelPath = this.currentModel.getPath();
		let userSets = this.unitSystem.sets.userSetsAsJsonObject();
		let userUnits = this.unitSystem.units.userUnitsAsJsonObject();
		let sessionSave = {
			Program : 'Rtm',
			Version: 3.0,
			DetailWidth: detailWidth,
			DeviceWidth: deviceWidth,
			UserUnitSets: userSets,
			UserUnits: userUnits,
			CaseName: caseName,
			DefaultUnitSet: this.unitSystem.defaultSet().name,
			SelectedObject: this.selectedObject,
			ModelPath: modelPath,
			RootModel: rootSave,
		}
		return JSON.stringify(sessionSave, null, '\t');
	}

	/** @method saveSession
	 * save the session in persistent storage
	 * @param {string} path - the path to store to
	 * if blank, the storePath used when the session was created will be used 
	 */
	async saveSession(path) {
		let caseJson = this.sessionAsJson(path);
		try {
			await this.storage.save(this.storePath, caseJson);
			return this.storePath;
		}
		catch(e) {
			const msg = (typeof e === 'string') ? e : e.message;
			this.setError('mmcmd:sessionSaveFailed', {path: this.storePath, error: msg});
		}
	}

	/** @method autoSaveSession
	 * save the session in persistent storage 
	 * returns the autosave path
	 */
	async autoSaveSession() {
		if (!this.isLoadingCase) {
			const caseJson = this.sessionAsJson();
			try {
				await this.storage.save(this.storePath, caseJson);
			}
			catch(e) {
				const msg = (typeof e === 'string') ? e : e.message;
				this.setError('mmcmd:sessionSaveFailed', {path: this.storePath, error: msg});
			}
			return this.storePath;
		}
		else {
			return 'skipped';
		}
	}

	/**
	 * @method saveLastSessionPath
	 */
	async saveLastSessionPath() {
		if (this.storePath) {
			try {
				await this.storage.save(this.savedLastPathId, this.storePath);
			}
			catch(e) {
				const msg = (typeof e === 'string') ? e : e.message;
				console.log(msg);
			}
		}
	}

	/** @method loadSession
	 * load the session from persistent storage
	 * @param {String} path - the path to load from
	 */
	async loadSession(path) {
		try {
			this.isLoadingCase = true;
			let result = await this.storage.load(path);
			new MMUnitSystem(this);  // clear any user units and sets
			await this.initializeFromJson(result, path);
			this.storePath = path;
			return result;
		}
		catch(e) {
			const msg = (typeof e === 'string') ? e : e.message;
			this.setError('mmcmd:sessionLoadFailed', {path: path, error: msg});
		}
		finally {
			this.isLoadingCase = false;
			await this.saveLastSessionPath()
		}
	}

	/** @method loadAutoSaved
	 * load the autosaved session from persistent storage
	 */
	async loadAutoSaved() {
		try {
			this.isLoadingCase = true;
			this.newSession();
			const lastPath = await this.storage.load(this.savedLastPathId);
			if (lastPath) {
				let result = await this.storage.load(lastPath);
				if (result) {
					new MMUnitSystem(this);  // clear any user units and sets
					await this.initializeFromJson(result, lastPath);
					this.storePath = lastPath;
				}
				return result;
			}
		}
		catch(e) {
			this.newSession();
		}
		finally {
			this.isLoadingCase = false;
		}
	}

	/** @method deleteSession
	 * delete the session from persistent storage
	 * @param {String} path - the path to delete
	 */
	async deleteSession(path) {
		try {
			await this.storage.delete(path);
			return path;
		}
		catch(e) {
			const msg = (typeof e === 'string') ? e : e.message;
			this.setError('mmcmd:sessionDeleteFailed', {path: path, error: msg});
		}
	}

	/** @method copySession
	 * make a copy of the session in persistent storage
	 * @param {string} oldPath - the path to load from
	 * @param {string} newPath - the path for the copy
	 */
	async copySession(oldPath, newPath) {
		try {
			await this.storage.copy(oldPath, newPath);
			return newPath;
		}
		catch(e) {
			const msg = (typeof e === 'string') ? e : e.message;
			this.setError('mmcmd:sessionCopyfailed', {oldPath: oldPath, newPath: newPath, error: msg});
		}
	}

	/** @method renameSession
	 * rename a session in persistent storage
	 * (just copy and delete)
	 * @param {string} oldPath - the path to load from
	 * @param {string} newPath - the path for the copy
	 */
	async renameSession(oldPath, newPath) {
		try {
			await this.storage.copy(oldPath, newPath);
			await this.storage.delete(oldPath);
			return newPath;
		}
		catch(e) {
			const msg = (typeof e === 'string') ? e : e.message;
			this.setError('mmcmd:sessionRenamefailed', {oldPath: oldPath, newPath: newPath, error: msg});
		}
	}

	// get methods

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['test'] = this.test;
		verbs['dgminfo'] = this.diagramInfo;
		verbs['listsessions'] = this.listSessionsCommand;
		verbs['new'] = this.newSessionCommand;
		verbs['save'] =  this.saveSessionCommand;
		verbs['autosave'] = this.autoSaveCommand;
		verbs['load'] = this.loadSessionCommand;
		verbs['copy'] = this.copySessionCommand;
		verbs['delete'] = this.deleteSessionCommand;
		verbs['rename'] = this.renameSessionCommand;
		verbs['getjson'] = this.getJsonCommand;
		verbs['pushmodel'] = this.pushModelCommand;
		verbs['popmodel'] = this.popModelCommand;
		verbs['import'] =this.importCommand;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			dgminfo: 'mmcmd:?modelDgmInfo',
			listsessions: 'mmcmd:?sessionList',
			new: 'mmcmd:?sessionNew',
			load: 'mmcmd:?sessionLoad',
			save: 'mmcmd:?sessionSave',
			copy: 'mmcmd:?sessionCopy',
			delete: 'mmcmd:?sessionDelete',
			getjson: 'mmcmd:?sessionGetJson',
			pushmodel: 'mmcmd:?sessionPushModel',
			popmodel: 'mmcmd:?sessionPopModel'
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}
	
	get	session() {
		return this;
	}

	get unitSystem() {
		return this.childNamed('unitsys');
	}

	get unknownPosition() {
		return new MMPoint(0, 0);
	}

	// MMModel related methods

	/**
	 * @method pushModel
	 * @param {MMModel} model
	 */
	pushModel(model) {
		if (this.currentModel) {
			this.modelStack.push(this.currentModel);
		}
		this.currentModel = model;
	}

	/**
	 * @method popModel
	 * @param count - the number of times to pop
	 */
	popModel(count=1) {
		while (this.modelStack.length > 0 && count-- > 0) {
			this.currentModel = this.modelStack.pop();
		}
	}

	/** @method listSessionsCommand
	 * list all the stored sessions
	 */
	async listSessionsCommand(command) {
		let result = await this.storage.listSessions();
		command.results = {paths: result, currentPath: this.storePath};
	}

	/**
	 * @method newSessionCommand
	 * verb
	 * @param {MMCommand} command
	 * command.args contains the store path for the new session
	 */
	newSessionCommand(command) {
		this.newSession(command.args);
		this.saveLastSessionPath();
		command.results = this.storePath;
	}

	/**
	 * @method saveSessionCommand
	 * verb
	 * @param {MMCommand} command
	 * command.args contains the store path for the new session
	 */
	async saveSessionCommand(command) {
		if (!indexedDB) {
			this.setError('mmcmd:noIndexedDB', {});
			return;
		}
		await this.saveSession(command.args);
		command.results = `copied to: ${this.storePath}`;
	}

	/**
	 * @method autoSaveCommand
	 * verb
	 */
	async autoSaveCommand(command) {
		if (!indexedDB) {
			this.setError('mmcmd:noIndexedDB', {});
			return;
		}
		const path = await this.autoSaveSession();
		command.results = `copied to: ${path}`;
	}

	/**
	 * @method loadSessionCommand
	 * verb
	 * @param {MMCommand} command
	 * command.args contains the store path for the session to load
	 */
	async loadSessionCommand(command) {
		if (!indexedDB) {
			this.setError('mmcmd:noIndexedDB', {});
			return;
		}
		await this.loadSession(command.args);
		command.results = this.storePath;
	}

	/**
	 * @method deleteSessionCommand
	 * verb
	 * @param {MMCommand} command
	 * command.args contains the store path for the session to delete
	 */
	async deleteSessionCommand(command) {
		if (!indexedDB) {
			this.setError('mmcmd:noIndexedDB', {});
			return;
		}
		let result = await this.deleteSession(command.args);
		command.results = `deleted: ${result}`;
	}

	/**
	 * @method copySessionCommand
	 * verb
	 * @param {MMCommand} command
	 * command.args contains the oldPath and newPath for the session copy
	 */
	async copySessionCommand(command) {
		if (!indexedDB) {
			this.setError('mmcmd:noIndexedDB', {});
			return;
		}
		const paths = this.splitArgsString(command.args);
		let result = await this.copySession(paths[0], paths[1]);
		command.results = result;
	}

	/**
	 * @method renameSessionCommand
	 * verb
	 * @param {MMCommand} command
	 * command.args contains the oldPath and newPath for the session
	 */
	async renameSessionCommand(command) {
		if (!indexedDB) {
			this.setError('mmcmd:noIndexedDB', {});
			return;
		}
		const paths = this.splitArgsString(command.args);
		let result = await this.renameSession(paths[0], paths[1]);
		command.results = result;
	}

	/**
	 * @method getJsonCommand
	 * verb
	 * @param {MMCommand} command
	 * command.args optional contains the path of a stored session to get json for
	 */
	async getJsonCommand(command) {
		if (command.args) {
			try {
				let result = await this.storage.load(command.args);
				command.results = result;
			}
			catch(e) {
				const msg = (typeof e === 'string') ? e : e.message;
				this.setError('mmcmd:sessionLoadFailed', {path: command.args, error: msg});
			}
		}
		else {
			command.results = this.sessionAsJson();
		}
	}

	/**
	 * @method importCommand
	 * verb
	 * @param {MMCommand} command
	 * command.args contains json to construct session from
	 */
	async importCommand(command) {
		try {
			new MMUnitSystem(this);  // clear any user units and sets
			await this.initializeFromJson(command.args);
			command.results = this.storePath;
		}
		catch(e) {
			const msg = (typeof e === 'string') ? e : e.message;
			this.setError('mmcmd:jsonImportFailed', {error: msg});
		}
	}

	/**
	 * @method diagramInfo
	 * verb
	 * @param {MMCommand} command
	 * command.results contains the info needed for model diagram
	 */
	diagramInfo(command) {
		command.results = this.currentModel.diagramInfo();
		command.results.selectedObject = this.selectedObject;
	}

	/**
	 * @method pushModelCommand
	 * verb
	 * @param {MMCommand} command
	 * command.args contains the name of the model to be pushed
	 * command.results contains name new current model
	 */
	pushModelCommand(command) {
		const model = this.currentModel.childNamed(command.args);
		if (model instanceof MMModel) {
			this.pushModel(model);	
		}

		command.results = this.currentModel.getPath();
	}

	/**
	 * @method popModelCommand
	 * verb
	 * @param {MMCommand} command
	 * command.results contains name new current model
	 */
	popModelCommand(command) {
		if (command.args) {
			this.popModel(command.args);
		}
		else {
			this.popModel();
		}	
		command.results = this.currentModel.getPath();
	}

	// testing method
	test(command) {
		let results = []
		let test = command.args;
		let unitSystem = this.session.unitSystem;
		switch(test) {
			case 'all':
			case 'units': {
				let unitSystem = this.session.unitSystem;
				let u = unitSystem.unitNamed('lb');
				u.dimensionString = '1 0 -1 0 0 0 0';
				results.push(`Unit2 ${u.name} dims ${u.dimensionString}`);

				u = unitSystem.unitNamed('ft');
				let v = u.convertToBase(1);
				results.push(`1 ft = ${v.toFixed(5)} m`);
				v = u.convertFromBase(v);
				results.push(`back to ft ${v.toFixed(5)}`);

				u = unitSystem.unitNamed('ft/s');
				v = u.convertToBase(1);
				results.push(`1 ft/s = ${v.toFixed(5)} m/s`);
				v = u.convertFromBase(v);
				results.push(`back to ft/s ${v.toFixed(5)}`);

				u = unitSystem.unitNamed('degf');
				v = u.convertToBase(32);
				results.push(`32 F = ${v.toFixed(5)} K`);
				v = u.convertFromBase(v);
				results.push(`back to F ${v.toFixed(5)}`);

				u = unitSystem.unitNamed('API60');
				v = u.convertToBase(10);
				results.push(`10 API60 = ${v.toFixed(5)} kg/m3`);
				v = u.convertFromBase(v);
				results.push(`back to API60 ${v.toFixed(5)}`);

				u = unitSystem.unitNamed('date');
				v = u.convertToBase(20190114.101010);
				results.push(`20190114.101010 date = ${v.toFixed(0)} s`);
				v = u.convertFromBase(v);
				results.push(`back to date ${v.toFixed(6)}`);

				u = unitSystem.unitNamed('date');
				v = u.convertToBase(20190114.101010);
				results.push(`20190114.101010 date = ${v.toFixed(0)} s`);
				v = u.convertFromBase(v);
				results.push(`back to date ${v.toFixed(6)}`);

				u = unitSystem.unitNamed('dated');
				v = u.convertToBase(14012019.101010);
				results.push(`14012019.101010 dated = ${v.toFixed(0)} s`);
				v = u.convertFromBase(v);
				results.push(`back to dated ${v.toFixed(6)}`);

				u = unitSystem.unitNamed('datem');
				v = u.convertToBase(1142019.101010);
				results.push(`1142019.101010 datedm = ${v.toFixed(0)} s`);
				v = u.convertFromBase(v);
				results.push(`back to datem ${v.toFixed(6)}`);

				results.push(`displayName for datem: '${u.displayName}'`);
				results.push(`displayName for fraction: '${unitSystem.unitNamed('Fraction').displayName}'`);
				u = unitSystem.unitNamed('degf')
				results.push(`100 degf stringForValue '${u.stringForValue(373.15)}'`);
				results.push(`100 degf stringForValueWithUnit '${u.stringForValueWithUnit(373.15)}'`);
			}
				if (test != 'all') {
					break;
				}

			// eslint-disable-next-line no-fallthrough
			case 'values': {
				let v = new MMNumberValue(3, 4);
				let unitSet = unitSystem.sets.defaultSet;

				let u = unitSystem.unitNamed('m/s');
				v.setUnitDimensions(u.dimensions);
				for(let i = 1; i <= v.rowCount; i++) {
					for(let j = 1; j <= v.columnCount; j++) {
						v.setValue(i+j/10., i, j);
					}
				}
				let v2 = v.copyOf();
				v2.logValueWithHeader(`NumberValue ${unitSet.typeNameForDimensions(v2.unitDimensions)}`, results);
				let v3 = MMNumberValue.scalarValue(123, unitSystem.unitNamed('ft^2').dimensions);
				v3.logValueWithHeader(`V3 ft2 ${unitSet.typeNameForDimensions(v3.unitDimensions)}`, results);
				v3.multiplyUnitDimensions(0.5);
				v3.logValueWithHeader(`V3 ft ${unitSet.typeNameForDimensions(v3.unitDimensions)}`, results);
				v3.subtractUnitDimensions(unitSystem.unitNamed('s^2').dimensions)
				v3.logValueWithHeader(`V3 ft/s2 ${unitSet.typeNameForDimensions(v3.unitDimensions)}`, results);
				v3.addUnitDimensions(unitSystem.unitNamed('s').dimensions)
				v3.logValueWithHeader(`V3 ft/s ${unitSet.typeNameForDimensions(v3.unitDimensions)}`, results);
				results.push(`has dimensions ${v3.hasUnitDimensions()}`);
				v3.addUnitDimensions([-1,0,1,0,0,0,0,]);
				v3.logValueWithHeader(`V3 frac ${unitSet.typeNameForDimensions(v3.unitDimensions)}`, results);
				results.push(`has dimensions ${v3.hasUnitDimensions()}`);
				try {
					v3.checkUnitDimensionsAreEqualTo(v.unitDimensions);
				}
				catch(e) {
					results.push(e);
				}
				try {
					v3.checkBounds(12,3);
				}
				catch(e) {
					results.push(e);
				}
				let v4 = MMNumberValue.numberArrayValue([600,700,800], unitSystem.unitNamed('lb/ft^3').dimensions)
				v4.logValueWithHeader(`V4 density ${unitSet.typeNameForDimensions(v4.unitDimensions)}`, results);
				v4.setAllValuesTo(987.654);
				v4.logValueWithHeader(`V4 density ${unitSet.typeNameForDimensions(v4.unitDimensions)}`, results);

				u = v4.defaultUnit;
				results.push(`V4 default unit ${u.name} dims ${u.dimensionString}`);
				results.push(`Unit descriptionString ${u.descriptionString}`);
				u = unitSystem.unitNamed('lb/ft^3');
				results.push(`V4 stringUsingUnit ${u.name} = ${v4.stringUsingUnit(v4.defaultUnit)}`)
				results.push(`V4 stringWithUnit ${u.name} = ${v4.stringWithUnit(v4.defaultUnit)}`)
				v4.setValue(1000, 2, 1);
				results.push('V4[2,1] set to 1000 kg/m^3');
				results.push(`stringForRowColumnUnit 2, 1, lb/ft^3: ${v4.stringForRowColumnUnit(2, 1, u)}`);
				results.push(`stringForRowColumnWithUnit 2, 1, lb/ft^3: ${v4.stringForRowColumnWithUnit(2, 1, u)}`);

				let vr = MMNumberValue.scalarValue(2);
				let vc = MMNumberValue.scalarValue(3);
				let v5 = v.valueForIndexRowColumn(vr,vc);
				v5.logValueWithHeader(`v[2,3]`, results);

				vr = MMNumberValue.scalarValue(0);
				v5 = v.valueForIndexRowColumn(vr,vc);
				v5.logValueWithHeader(`v[0,3]`, results);

				vr = MMNumberValue.scalarValue(-2);
				v5 = v.valueForIndexRowColumn(vr,vc);
				v5.logValueWithHeader(`v[-2,3]`, results);

				vc = MMNumberValue.scalarValue(-4);
				v5 = v.valueForIndexRowColumn(vr,vc);
				v5.logValueWithHeader(`v[-2,-4]`, results);

				v5 = v.valueForIndexRowColumn(vr);
				v5.logValueWithHeader(`v[-2]`, results);

				vr = MMNumberValue.scalarValue(1);
				vc = MMNumberValue.numberArrayValue([1,3,4]);
				v5 = v.valueForIndexRowColumn(vr,vc);
				v5.logValueWithHeader(`v[1,[1,3,4]]`, results);

				vr = MMNumberValue.numberArrayValue([1,3]);
				v5 = v.valueForIndexRowColumn(vr,vc);
				v5.logValueWithHeader(`v[[1,3],[1,3,4]]`, results);

				// tests for add and subtract
				u = unitSystem.unitNamed('m/s');
				let x = MMNumberValue.numberArrayValue([1,2,3], u.dimensions);
				x.logValueWithHeader('Add and subtract: x column array', results);
				results.push(`x = ${x.stringWithUnit(x.defaultUnit)}`);
				let y = MMNumberValue.numberArrayValue([4,5,6], u.dimensions)
				y.logValueWithHeader('y row array', results);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);

				let r = x.add(y);
				r.logValueWithHeader(`x+y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.subtract(y);
				r.logValueWithHeader(`x-y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.add(x);
				r.logValueWithHeader(`y+x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.subtract(x);
				r.logValueWithHeader(`y-x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				y = MMNumberValue.scalarValue(10,u.dimensions);
				y.logValueWithHeader('y row array', results);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);

				r = x.add(y);
				r.logValueWithHeader(`x+y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.subtract(y);
				r.logValueWithHeader(`x-y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.add(x);
				r.logValueWithHeader(`y+x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.subtract(x);
				r.logValueWithHeader(`y-x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				y = new MMNumberValue(1,2,u.dimensions);
				y.setValue(20, 1, 1);
				y.setValue(30, 1, 2);
				y.logValueWithHeader('y column array', results);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);

				r = x.add(y);
				r.logValueWithHeader(`x+y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.subtract(y);
				r.logValueWithHeader(`x-y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.add(x);
				r.logValueWithHeader(`y+x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.subtract(x);
				r.logValueWithHeader(`y-x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				// tests for multiply, divide and mod
				let u2 = unitSystem.unitNamed('s');
				x = MMNumberValue.numberArrayValue([1,2,3], u.dimensions);
				x.logValueWithHeader('Multiply, divide and mod: x row array', results);
				results.push(`x = ${x.stringWithUnit(x.defaultUnit)}`);
				y = MMNumberValue.numberArrayValue([4,5,6], u2.dimensions)
				y.logValueWithHeader('y row array', results);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);

				r = x.multiply(y);
				r.logValueWithHeader(`x*y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.divideBy(y);
				r.logValueWithHeader(`x/y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.mod(y);
				r.logValueWithHeader(`x%y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.multiply(x);
				r.logValueWithHeader(`y*x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.divideBy(x);
				r.logValueWithHeader(`y/x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.mod(x);
				r.logValueWithHeader(`y%x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				y = MMNumberValue.scalarValue(10,u2.dimensions);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);

				r = x.multiply(y);
				r.logValueWithHeader(`x*y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.divideBy(y);
				r.logValueWithHeader(`x/y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.mod(y);
				r.logValueWithHeader(`x%y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.multiply(x);
				r.logValueWithHeader(`y*x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.divideBy(x);
				r.logValueWithHeader(`y/x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.mod(x);
				r.logValueWithHeader(`y%x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				y = new MMNumberValue(1,2,u2.dimensions);
				y.setValue(20, 1, 1);
				y.setValue(30, 1, 2);
				y.logValueWithHeader('y column array', results);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);

				r = x.multiply(y);
				r.logValueWithHeader(`x*y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.divideBy(y);
				r.logValueWithHeader(`x/y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = x.mod(y);
				r.logValueWithHeader(`x%y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.multiply(x);
				r.logValueWithHeader(`y*x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.divideBy(x);
				r.logValueWithHeader(`y/x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				r = y.mod(x);
				r.logValueWithHeader(`y%x`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				// tests for power
				y = MMNumberValue.scalarValue(2);
				x.logValueWithHeader('Power tests: x row array', results);
				results.push(`x = ${x.stringWithUnit(x.defaultUnit)}`);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);

				r = x.power(y);
				r.logValueWithHeader(`x^y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				y = MMNumberValue.scalarValue(2, u2.dimensions);
				y.logValueWithHeader('y scalar with unit', results);
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);
				try {
					r = x.power(y);
				} catch(e) {
					results.push(e);
				}

				y = new MMNumberValue(1,2);
				y.setValue(2, 1, 1);
				y.setValue(3, 1, 2);
				y.logValueWithHeader('y unitless column array', results)
				results.push(`y = ${y.stringWithUnit(y.defaultUnit)}`);
				try {
					r = x.power(y);
				} catch(e) {
					results.push(e);
				}

				x =  MMNumberValue.numberArrayValue([5, 10, 20]);
				x.logValueWithHeader('x unitless row array', results);
				r = x.power(y);
				r.logValueWithHeader(`x^y`, results);
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				let s1 = new MMStringValue(3,2);
				s1.setValue('a',2,1);
				s1.setValue('b',2,2);
				vr = MMNumberValue.scalarValue(2);
				vc = MMNumberValue.scalarValue(2);
				let s2 = s1.valueForIndexRowColumn(vr,vc);
				s2.logValueWithHeader(`s1[2,2]`, results);
				let s3 = s1.add(s2);
				s3.logValueWithHeader(`s1 + s2`, results);

			}
				break;

			case 'formula': {
				let x = MMNumberValue.scalarValue(2);
				let y = MMNumberValue.scalarValue(3);
				let v1 = new MMConstantOperator(x);
				let v2 = new MMConstantOperator(y);
				let op = MMFormulaOpDictionary['+']();
				op.setInputs(v1,v2);
				let r = op.value();
				results.push(`r = ${r.stringWithUnit(r.defaultUnit)}`);

				let expr = new MMExpression('x1', this.rootModel);
				let expr2 = new MMExpression('x2', this.rootModel);
				this.rootModel.forgetAllCalculations();

				let f = expr.childNamed('formula');
				let f2 = expr2.childNamed('formula');
				f.formula = '2 + 3';
				f2.formula = '2 + 3'
				results.push(`f == f: ${f.isEqualToFormula(f)}`);
				results.push(`f == f2: ${f.isEqualToFormula(f2)}`);
				f2.formula = '2 h + -3 s';
				results.push(`f == f2: ${f.isEqualToFormula(f2)}`);
				let u = unitSystem.unitNamed('s');
				results.push(`f2 value: ${f2.value().stringWithUnit(u)}`);
				f2.formula = "' just a comment which should become string";
				results.push(`f2 string: ${f2.value().valueAtRowColumn(1,1)}`);
				f2.formula = '10^2 + 3';
				results.push(`f2 10^2 + 3: ${f2.value().valueAtRowColumn(1,1)}`);
				f2.formula = '10 * (2 + 3)';
				results.push(`f2 10 * (2 + 3): ${f2.value().valueAtRowColumn(1,1)}`);
				f2.formula = '10 / (5-3)';
				results.push(`f2 10 / (5-3): ${f2.value().valueAtRowColumn(1,1)}`);
				f2.formula = '10 % (5-2)';
				results.push(`f2 10 % (5-2): ${f2.value().valueAtRowColumn(1,1)}`);
				f2.formula = 'x1';
				results.push(`f2 x1: ${f2.value().valueAtRowColumn(1,1)}`);
				f2.formula = 'x1.myName';
				results.push(`f2 x1.myName: ${f2.value().valueAtRowColumn(1,1)}`);
				f2.formula = "10 + x1^2 ' with comment";
				results.push(`f2 10 + x1^210 + x1^2 ' with comment: ${f2.value().valueAtRowColumn(1,1)}`);
				f2.formula = '"string constant"';
				results.push(`f2 "string constant": ${f2.value().valueAtRowColumn(1,1)}`);

				f2.formula = '{ln 5*2}';
				r = f2.value();
				if (r) results.push(`f2 {ln 10}: r.valueAtRowColumn(1,1)}`);

				f2.formula = '3:5';
				r = f2.value();
				if (r) r.logValueWithHeader(`3:5`, results);

				f2.formula = '5:3';
				r = f2.value();
				if (r) r.logValueWithHeader(`5:3`, results);

				f2.formula = '{array 3, 2, 5}';
				r = f2.value();
				if (r) r.logValueWithHeader(`{array 5, 3, 2}`, results);

				f2.formula = '{array 3, 2, 21:23}';
				r = f2.value();
				if (r) r.logValueWithHeader(`x2 = {array 5, 3, 21:23}`, results);

				f.formula = 'x2[3,2]';
				r = f.value();
				if (r) r.logValueWithHeader(`x2[3,2]`, results);
				
			}
				break;

			case 'bigmult': {
				let length = 10000;
				results.push(`start - length ${length}`);
				let a = new Float64Array(length);
				let b = new Float64Array(length);
				a.fill(123.345, 0, length);
				b = a.map((v, i) => v * i);
				let c = new Float64Array(length*length);
				c.map((v,i) => a[i%length] * b[i%length]);
				results.push('done');
				command.results = true;
			}
				break;
		}
		command.results = results;
	}
}

const MMToolTypes = {
	'Model': {
		factory: (name, parent) => { return new MMModel(name, parent)},
		displayName: new MMCommandMessage('mmcmd:modelDisplayName'),
	},
	"Expression": {
		factory: (name, parent) => {return new MMExpression(name, parent)},
		displayName: new MMCommandMessage('mmcmd:exprDisplayName'),
	},
	"Matrix": {
		factory: (name, parent) => {return new MMMatrix(name, parent)},
		displayName: new MMCommandMessage('mmcmd:matrixDisplayName'),
	},
	"DataTable": {
		factory: (name, parent) => {return new MMDataTable(name, parent)},
		displayName: new MMCommandMessage('mmcmd:dataTableDisplayName'),
	},
	"Solver": {
		factory: (name, parent) => {return new MMSolver(name, parent)},
		displayName: new MMCommandMessage('mmcmd:solverDisplayName'),
	},
	"Ode": {
		factory: (name, parent) => {return new MMOde(name, parent)},
		displayName: new MMCommandMessage('mmcmd:odeDisplayName'),
	},
	"Iterator": {
		factory: (name, parent) => {return new MMIterator(name, parent)},
		displayName: new MMCommandMessage('mmcmd:iterDisplayName'),
	},
	"Optimizer": {
		factory: (name, parent) => {return new MMOptimizer(name, parent)},
		displayName: new MMCommandMessage('mmcmd:optDisplayName'),
	},
	"Graph": {
		factory: (name, parent) => {return new MMGraph(name, parent)},
		displayName: new MMCommandMessage('mmcmd:graphDisplayName'),
	},
	"HtmlPage": {
		factory: (name, parent) => {return new MMHtmlPage(name, parent)},
		displayName: new MMCommandMessage('mmcmd:htmlPageDisplayName'),
	},
};

/**
 * @class MMTool - base class for all calculation tools
 * @extends MMCommandParent
 * @member {MMSession} session;
 * @member {string} notes
 * @member {string} description
 * @member {string} displayName
 * @member {string} typeName
 * @member {boolean} forgetRecursionBlockIsOn;
 * @member {boolean} isHidingInfo;
 * @member {Set<MMTool>} valueRequestors;
 * @member {MMPoint} position;
 * @member {boolean} diagramNotes;
 */
// eslint-disable-next-line no-unused-vars
class MMTool extends MMCommandParent {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 * @param {string} typeName
	 */
	constructor(name, parentModel, typeName) {
		super(name, parentModel, 'MM' + typeName);
		this.typeName = typeName;  // temporary until objectTypes is defined
		this.notes = '';
		this.valueRequestors = new Set([]);
		this.forgetRecursionBlockIsOn = false;
		this.isHidingConnections = false;
		this.position = this.session.nextToolLocation;
		this.session.nextToolLocation = this.session.unknownPosition;
		this.isHidingInfo = false;
		this.diagramNotes = false;
	}

	get properties() {
		let d = super.properties;
		d['displayName'] = {type: MMPropertyType.string, readOnly: true};
		d['description'] = {type: MMPropertyType.string, readOnly: true};
		d['notes'] = {type: MMPropertyType.string, readOnly: false};
		d['diagramNotes'] = {type: MMPropertyType.boolean, readOnly: false};
		return d;
	}

	get displayName() {
		let toolType = MMToolTypes[this.typeName];
		return this.t(toolType.displayName);
	}

	get description() {
		if (this.notes) {
			let maxLength = 50;
			if ( this.notes.length <= maxLength) {
				return this.notes;
			}	else {
				return this.notes.substring(0, maxLength-1);
			}
		}
		return this.notes;
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['toolviewinfo'] = this.toolViewInfo;
		verbs['value'] = this.valueJson;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			toolViewInfo: 'mmcmd:?toolViewInfo',
			value: 'mmcmd:?valueJson',
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
		p.push('myName');
		return p;
	}

	/**
	 * @method toolViewInfo
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 * should be overridden by derived classes
	 */
	toolViewInfo(command) {
		let parent = this;
		this.session.selectedObject = this.name;
		while (parent.typeName !== 'Model') {
			parent = parent.parent;
		}

		command.results = {
			path: this.getPath(),
			modelPath: parent.getPath(),
			notes: this.notes,
			diagramNotes: this.diagramNotes,
		}
	}

	/**
	 * @method valueJson
	 * @returns {String} json value for valueDescribedBy
	 */
	valueJson(command) {
		const value = this.valueDescribedBy(command.args);
		if (value) {
			command.results = JSON.stringify(value);
		}
		else {
			command.results = '';
		}
	}

	/**
	 * @method orderOfCopy
	 * @returns {string} string position representation for sorting
	 */
	orderOfCopy() {
		let x = this.position.x + 1e6;
		let y = this.position.y + 1e6;
		return `${x}${y}`;
	}

	get	session() {
		return this.parent.session;
	}

	/**
	 * @virtual forgetCalculated
	 */
	forgetCalculated() {}

	/**
	 * @method forgetAllCalculations
	 */
	forgetAllCalculations() {
		this.forgetCalculated();
	}

	/**
	 * @method changedFormula
	 * @param {MMFormula} formula
	 */
	// eslint-disable-next-line no-unused-vars
	changedFormula(formula) {
		if (!theMMSession.isLoadingCase) {
			this.forgetCalculated();
		}
	}

	/**
	 * @method defaultFormulaUnit
	 * returns null or a unit to be used for a bare numeric constant in the named formula
	 * @param {String} formulaName
	 * @returns {MMUnit}
	 */
	// eslint-disable-next-line no-unused-vars
	defaultFormulaUnit(formulaName) {
		return null;
	}

	/**
	 * @method addRequestor
	 * @param {MMTool} requestor
	 * short cut method
	 */
	addRequestor(requestor) {
		if (requestor) {
			this.valueRequestors.add(requestor);
		}
	}

	/**
	 * override by appropriate tools - should call super if no match with description
	 * @method valueDescribedBy
	 * @param {String} description
	 * @param {MMTool} requestor
	 * @returns {MMValue}
	 */
	valueDescribedBy(description, requestor) {
		if (!description || description == 'self') {
			return MMToolValue.scalarValue(this);
		}
		else if (description == 'myName') {
			if (requestor) {
				this.valueRequestors.add(requestor);
			}
			return MMStringValue.scalarValue(this.name);
		}
		return null;
	}

	/**
	 * @method inputSources
	 * @returns {Set} contains tools referenced by this tool - filled in by derived classes
	 */
	inputSources() {
		return new Set([]);
	}

	/**
	 * @method saveObject
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		return {
			name: this.name,
			Notes: this.notes,
			DiagramX: this.position.x,
			DiagramY: this.position.y,
			HideInfo: this.isHidingInfo ? 'y': 'n',
			DiagramNotes: this.diagramNotes ? 'y' : 'n', 
		};
	}

	/**
	 * @method renameTo
	 * @param {MMCommand} command 
	 */
	renameto(command) {
		this.forgetCalculated();
		super.renameto(command);
	}

	/**
	 * @method initFromSaved - initialize from stored object
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		this.notes = saved.Notes;
		this.position = new MMPoint(saved.DiagramX, saved.DiagramY);
		this.isHidingInfo = (saved.HideInfo === 'y');
		this.diagramNotes = (saved.DiagramNotes === 'y');
	}
}