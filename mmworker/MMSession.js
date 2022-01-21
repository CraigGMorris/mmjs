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
	MMCommandParent:readonly
	MMUnitSystem:readonly
	MMPropertyType:readonly
	MMModel:readonly
	MMStringValue:readonly
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
	MMFormula:readonly
	PouchDB:readonly
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
 * @class MMIndexedDBStorage - original indexedDB persistent storage for session
 */
class MMIndexedDBStorage  {
	constructor() {
		this.isSetup = false;
		this._exists = true;
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
 * @class MMPouchDBStorage - persistent storage for session using pouchdb
 */
class MMPouchDBStorage {
	/**
	 * @method save
	 * @param {String} path - persistent storage path
	 * @param {String} json - json representation of session
	*/
	constructor() {
		this.db = new PouchDB('MMSessions', {auto_compaction: true});
		this.revs = {};
	}

	async save(path, json) {
		const record = {
			_id: path,
			_rev: this.revs[path],
			json: json
		}
		// console.log(`saving ${path} rev ${record._rev}`);
		const result = await this.db.put(record);
		// console.log(`saved ${path} rev ${result.rev}`);
		this.revs[path] = result.rev;
		return result.json;	
	}

	/**
	 * @method load
	 * @param {String} path - persistent storage path
	 */
	async load(path) {
		try {
			const result = await this.db.get(path);
			this.revs[path] = result._rev;
			return result.json;
		}
		catch(e) {
			console.log(e.message);
			return;
		}
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
	 * @method delete
	 * @param {String} path - persistent storage path to delete
	*/
	async delete(path) {
		await this.db.remove(path, this.revs[path]);
		delete this.revs[path];
	}

	/**
	 * @method listSessions
	 */
	async listSessions() {
		const result = await this.db.allDocs();
		if (result) {
			const docIds = [];
			for (const row of result.rows) {
				docIds.push(row.id);
				this.revs[row.id] = row.value.rev;
			}
			// const docIds = result.rows.map(row => row.id);
			return docIds;
		}

		return [];
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
 * @member {MMPouchDBStorage} pouchStorage
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
		this.storage = new MMPouchDBStorage();
		this.savedLastPathId = '(lastPath)';
		this.savedLastNewsId = '(lastNews)';
		this.lastNews = '2021216';
		this.newSession();
		this.couchError = null;
	}

	/**
	 * @method couchDBSync
	 * if this.remoteCouch is set up, sync session database
	 */
	couchDBSync() {
		if (this.remoteCouch) {
			var opts = {live: true, retry: true};
			this.storage.db.replicate.to(this.remoteCouch, opts, (err) => {
				const destination = this.remoteCouch.split('@')[1]
				console.log(`There was an error syncing to ${destination}\n${err.error}`);
				this.couchError = {key: 'mmcmd:couchToError', options: {dest: destination, msg: err.error}};
			});
			this.storage.db.replicate.from(this.remoteCouch, opts, (err) => {
				const destination = this.remoteCouch.split('@')[1]
				console.log(`There was an error syncing from ${destination}\n${err.error}`);
				this.couchError = {key: 'mmcmd:couchFromError', options: {dest: destination, msg: err.error}};
			}).on('change', (info) => {
				for(const record of info.docs) {
					if (record._id === this.storePath) {
						this.storage.load(this.storePath).then(result => {
							if (result) {
								new MMUnitSystem(this);  // clear any user units and sets
								this.initializeFromJson(result, this.storePath);
							}
						});
						break;
					}
				}
			});
		}
	}


	/** @method newSession
	 * initialize to new empty session
	 * @param {string} storePath - the storage path
	 */
	newSession(storePath) {
		if (!storePath) {
			storePath = '(unnamed)';
		}
		new MMUnitSystem(this);  // clear any user units and sets
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
		if (saveObject.DefaultUnitSet) {
			this.unitSystem.sets.defaultSet = this.unitSystem.sets.childNamed(saveObject.DefaultUnitSet);
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

		const returnValue = {
			storePath: this.storePath,
		};

		if (saveObject.ModelPath) {
				const modelStack = [];
			const pathModels = saveObject.ModelPath.split('.');
			if (pathModels.length > 2) {
				for (let i = 2; i < pathModels.length; i++) {
					const childModel = this.currentModel.childNamed(pathModels[i]);
					if (!childModel) { break; }
					this.pushModel(childModel);
					modelStack.push(childModel.name);
				}
				returnValue.modelStack = modelStack
			}
		}

		if (saveObject.SelectedObject) {
			const toolName = saveObject.SelectedObject;
			const tool = this.currentModel.childNamed(toolName);
			if (tool) {
				const toolType = tool.className.substring(2);
				if (toolType !== 'Model') {
					const fakeCommand = {results: {}};
					try {
						returnValue.selected = {
							name: toolName,
							type: toolType,
							info: fakeCommand
						}
					}
					catch(e) {
						this.setError()
					}
				}
			}
		}


		return returnValue;
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
		if (!this.isLoadingCase && !this.isAutoSaving) {
			const caseJson = this.sessionAsJson();
			try {
				this.isAutoSaving = true;
				await this.storage.save(this.storePath, caseJson);
				if (this.couchError) {
					this.setError(this.couchError.key, this.couchError.options);
					this.couchError = null;
				}
			}
			catch(e) {
				const msg = (typeof e === 'string') ? e : e.message;
				this.setError('mmcmd:sessionSaveFailed', {path: this.storePath, error: msg});
			}
			finally {
				this.isAutoSaving = false;
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
				const indexedDB = new MMIndexedDBStorage();
				await indexedDB.save(this.savedLastPathId, this.storePath);
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
			const returnValue =await this.initializeFromJson(result, path);
			this.storePath = path;
			return returnValue;
		}
		catch(e) {
			const msg = (typeof e === 'string') ? e : e.message;
			this.setError('mmcmd:sessionLoadFailed', {path: path, error: msg});
			this.newSession();
		}
		finally {
			this.isLoadingCase = false;
			await this.saveLastSessionPath()
		}
	}

	async importOldStorage(indexedDB) {
		const paths = await indexedDB.listSessions();
		for (const path of paths) {
			// console.log(`importing ${path}`);
			const session = await indexedDB.load(path);
			await this.storage.save(path, session);
		}
	}

	/** @method loadAutoSaved
	 * load the autosaved session from persistent storage
	 */
	async loadAutoSaved() {
		const indexedDB = new MMIndexedDBStorage();
		const sessionPaths = await this.storage.listSessions();
		if (sessionPaths.length === 0) {
			await this.importOldStorage(indexedDB);
		}
		this.remoteCouch = await indexedDB.load('(remoteCouch)');
		this.couchDBSync();
		try {
			this.isLoadingCase = true;
			this.newSession();
			const lastNews = await this.storage.load(this.savedLastNewsId);
			const lastPath = await indexedDB.load(this.savedLastPathId);
			const newsUrl = '../news/MM_News.txt';
			if (
				(lastNews && lastNews != this.lastNews) ||
				(!lastNews && lastPath)
			) {
				const returnValue = await this.loadUrl(newsUrl);
				await this.storage.save(this.savedLastNewsId, this.lastNews);
				return returnValue;
			}
			else {
				if (!lastNews) {
					await this.storage.save(this.savedLastNewsId, this.lastNews);
				}
				if (lastPath) {
					let returnValue;
					let result = await this.storage.load(lastPath);
					if (result) {
						new MMUnitSystem(this);  // clear any user units and sets
						returnValue = await this.initializeFromJson(result, lastPath);
						this.storePath = lastPath;
					}
					return returnValue;
				}
				let result = await this.loadUrl('../help/Getting%20Started.txt');
				if (result && result.storePath && result.storePath.length) {
					await this.saveSession(result.storePath);
				}
				return result;
			}
		}
		catch(e) {
			const msg = (typeof e === 'string') ? e : e.message;
			this.setError('mmcmd:sessionAutoLoadFailed', {error: msg});
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
		if (path) {
			if (path.endsWith('/')) {
				const sessionPaths = await this.storage.listSessions();
				for (const existingPath of sessionPaths) {
					if (existingPath.startsWith(path)) {
						await this.storage.delete(existingPath);
						if (this.storePath === existingPath) {
							this.storePath = '(unnamed)';
							await this.saveLastSessionPath()
						}
					}
				}
			}
			else {
				try {
					await this.storage.delete(path);
					if (this.storePath === path) {
						this.storePath = '(unnamed)';
						await this.saveLastSessionPath()
					}
					return path;
				}
				catch(e) {
					const msg = (typeof e === 'string') ? e : e.message;
					this.setError('mmcmd:sessionDeleteFailed', {path: path, error: msg});
				}
			}
		}
	}

	/** @method copySession
	 * make a copy of the session in persistent storage
	 * @param {string} oldPath - the path to load from
	 * @param {string} newPath - the path for the copy
	 */
	async copySession(oldPath, newPath) {
		if (oldPath.endsWith('/')) {
			if (!newPath.endsWith('/')) {
				newPath += '/';
			}
			const sessionPaths = await this.storage.listSessions();
			for (const existingPath of sessionPaths) {
				if (existingPath.startsWith(oldPath)) {
					const newSessionPath = newPath + existingPath.substring(oldPath.length);
					try {
						await this.storage.copy(existingPath, newSessionPath);
					}
					catch(e) {
						const msg = (typeof e === 'string') ? e : e.message;
						this.setError('mmcmd:sessionCopyfailed', {oldPath: oldPath, newPath: newPath, error: msg});
						return;
						}
					}
			}
			if (this.storePath.startsWith(oldPath)) {
				this.storePath = newPath + this.storePath.substring(oldPath.length);
				await this.saveLastSessionPath();
			}
			return newPath;
		}
		else {
			try {
				const sessionJson = await this.storage.load(oldPath);
				if (sessionJson) {
					const session = JSON.parse(sessionJson);
					session.CaseName = newPath.split('/').pop();
					await this.storage.save(newPath, JSON.stringify(session, null, '\t'));
				}		
				return newPath;
			}
			catch(e) {
				const msg = (typeof e === 'string') ? e : e.message;
				this.setError('mmcmd:sessionCopyfailed', {oldPath: oldPath, newPath: newPath, error: msg});
			}
		}
	}

	/** @method renameSession
	 * rename a session in persistent storage
	 * (just copy and delete)
	 * @param {string} oldPath - the path to load from
	 * @param {string} newPath - the path for the copy
	 */
	async renameSession(oldPath, newPath) {
		if (oldPath.endsWith('/')) {
			if (!newPath.endsWith('/')) {
				newPath += '/';
			}
			if (newPath === '/') {
				newPath = ''; // renaming to root;
			}
			const sessionPaths = await this.storage.listSessions();
			const setOfPaths = new Set(sessionPaths);
			for (const existingPath of sessionPaths) {
				if (existingPath.startsWith(oldPath)) {
					let newSessionPath = newPath + existingPath.substring(oldPath.length);
					let n = 2;
					while (setOfPaths.has(newSessionPath)) {
						newSessionPath = newPath + `copy-${n++}/` +existingPath.substring(oldPath.length);
					}
					try {
						await this.storage.copy(existingPath, newSessionPath);
						await this.storage.delete(existingPath);
					}
					catch(e) {
						const msg = (typeof e === 'string') ? e : e.message;
						this.setError('mmcmd:sessionRenamefailed', {oldPath: oldPath, newPath: newPath, error: msg});
						return;
					}
				}
			}
			if (this.storePath.startsWith(oldPath)) {
				this.storePath = newPath + this.storePath.substring(oldPath.length);
				await this.saveLastSessionPath();
			}
			return newPath;
		}
		else {
			try {
				const sessionJson = await this.storage.load(oldPath);
				if (sessionJson) {
					const session = JSON.parse(sessionJson);
					session.CaseName = newPath.split('/').pop();
					await this.storage.save(newPath, JSON.stringify(session, null, '\t'));
				}		
				else {
					throw('Load failed');
				}			
				// await this.storage.copy(oldPath, newPath);
				await this.storage.delete(oldPath);
				if (this.storePath === oldPath) {
					this.storePath = newPath;
					await this.saveLastSessionPath();
				}
				return newPath;
			}
			catch(e) {
				const msg = (typeof e === 'string') ? e : e.message;
				this.setError('mmcmd:sessionRenamefailed', {oldPath: oldPath, newPath: newPath, error: msg});
				return;
			}
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
		verbs['loadurl'] = this.loadUrlCommand;
		verbs['copy'] = this.copySessionCommand;
		verbs['delete'] = this.deleteSessionCommand;
		verbs['rename'] = this.renameSessionCommand;
		verbs['getjson'] = this.getJsonCommand;
		verbs['pushmodel'] = this.pushModelCommand;
		verbs['popmodel'] = this.popModelCommand;
		verbs['import'] = this.importCommand;
		verbs['remote'] = this.remoteDBCommand;
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
			loadurl: 'mmcmd:?sessionLoadUrl',
			save: 'mmcmd:?sessionSave',
			copy: 'mmcmd:?sessionCopy',
			delete: 'mmcmd:?sessionDelete',
			getjson: 'mmcmd:?sessionGetJson',
			pushmodel: 'mmcmd:?sessionPushModel',
			popmodel: 'mmcmd:?sessionPopModel',
			import: 'mmcmd:?sessionImport',
			remote: 'mmcmd:?sessionRemote'
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
		const result = await this.storage.listSessions();
		command.results = {paths: result, currentPath: this.storePath};
	}

	/**
	 * @method newSessionCommand
	 * verb
	 * @param {MMCommand} command
	 * command.args contains the store path for the new session
	 */
	async newSessionCommand(command) {
		this.newSession(command.args);
		await this.saveLastSessionPath();
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
		if (command.args) {
			command.results = await this.loadSession(command.args);
		}
		else {
			command.results = await this.loadAutoSaved();
		}
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
		const args = command.args;
		if (args) {
			if (args.endsWith('/')) {
				const sessionPaths = await this.storage.listSessions();
				const pathParts = args.split('/');
				pathParts.pop();
				const isRootFolder = args === '/';
				const folderName = isRootFolder ? 'root/' : pathParts.pop();
				const archive = {}
				for (const path of sessionPaths) {
					if (!path.startsWith('(') && (isRootFolder || path.startsWith(args))) {
						let sessionJson = await this.storage.load(path);
						let pathName = path.substring(args.length-1);
						archive[pathName] = sessionJson;
					}
				}
				command.results = {folderName: folderName, sessions: archive}
			}
			else {
				try {
					let result = await this.storage.load(args);
					command.results = result;
				}
				catch(e) {
					const msg = (typeof e === 'string') ? e : e.message;
					this.setError('mmcmd:sessionLoadFailed', {path: command.args, error: msg});
				}
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
		const rootPathLength = command.args.indexOf(':');
		const rootPath = command.args.substring(0, rootPathLength);
		const existingPaths = await this.storage.listSessions();
		const pathAlreadyUsed = (newPath) => {
			for (const path of existingPaths) {
				if (path.startsWith(newPath)) {
					return true;
				}
			}
			return false;
		}
		const json = command.args.substring(rootPathLength+1);
		if (json.startsWith('{"folderName":')) {
			// importing a folder archive
			const archive = JSON.parse(json);
			const sessions = archive.sessions;

			let n = 2;
			let newFolderPath = rootPath + archive.folderName;
			while (pathAlreadyUsed(newFolderPath)) {
				newFolderPath =  archive.folderName + `-${n++}`;
			}

			for (const path of Object.keys(sessions)) {
				const fullPath = newFolderPath + path;
				await this.storage.save(fullPath, sessions[path]);
			}

		}
		else {
			// assume session import
			try {
				new MMUnitSystem(this);  // clear any user units and sets
				const returnValue = await this.initializeFromJson(json);
				let storePath = rootPath + this.storePath;
				let n = 2;
				while (pathAlreadyUsed(storePath)) {
					storePath = rootPath + this.storePath + `-${n++}`;
				}
				await this.saveSession(storePath);
				returnValue.storePath = this.storePath;
				command.results = returnValue;
			}
			catch(e) {
				const msg = (typeof e === 'string') ? e : e.message;
				this.setError('mmcmd:jsonImportFailed', {error: msg});
			}
		}
	}

	/**
	 * @method loadUrl
	 * @param {String} url
	 * @return {String} the storePath of the new session
	 * load a web file from url to construct a session from
	 */
	async loadUrl(url) {
		let returnValue = '';
		if (url) {
			try {
				const response = await fetch(url);
				if (response.ok) {
					const json = await response.text();
					try {
						this.isLoadingCase = true;
						new MMUnitSystem(this);  // clear any user units and sets
						returnValue = await this.initializeFromJson(json);
					}
					finally {
						this.isLoadingCase = false;
						await this.saveLastSessionPath()
					}
						}
				else {
					this.setError('mmcmd:sessionLoadUrlFailed', {url: url, error: response.statusText});
				}
			}
			catch(e) {
				const msg = (typeof e === 'string') ? e : e.message;
				this.setError('mmcmd:sessionLoadUrlFailed', {url: url, error: msg});
			}	
		}
		return returnValue;	
	}

	/**
	 * @method loadUrlCommand
	 * verb
	 * @param {MMCommand} command
	 * command.args contains url of web file to construct session from
	 */
	async loadUrlCommand(command) {
		command.results = await this.loadUrl(command.args);
	}

	/**
	 * @method remoteDBCommand
	 * @param {MMCommand} command 
	 * command.args should contain the url (including name and pw) of the couchDB to sync with
	 * an empty argument will turn off syncing
	 */
	async remoteDBCommand(command) {
		this.remoteCouch = command.args;
		const indexedDB = new MMIndexedDBStorage();
		await indexedDB.save('(remoteCouch)', this.remoteCouch);
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
	async pushModelCommand(command) {
		const model = this.currentModel.childNamed(command.args);
		if (model instanceof MMModel) {
			this.pushModel(model);
			await this.autoSaveSession();
		}

		command.results = {path: this.currentModel.getPath()};
		const indexToolName = this.currentModel.indexTool;
		if (indexToolName) {
			const indexTool = this.currentModel.childNamed(indexToolName);
			if (indexTool) {
				command.results.indexTool = indexToolName;
				command.results.indexToolType = indexTool.typeName;
			}
		}
	}

	/**
	 * @method popModelCommand
	 * verb
	 * @param {MMCommand} command - args can be count of how many to pop - default 1
	 * command.results contains name new current model
	 */
	async popModelCommand(command) {
		if (command.args) {
			this.popModel(command.args);
		}
		else {
			this.popModel();
		}
		await this.autoSaveSession();
		command.results = this.currentModel.getPath();
	}

	// testing method - place to easily try things out
	async test(command) {
		let results = ['no test implemented']
		// let test = command.args;

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
		verbs['fpreview'] = this.formulaPreview;
		return verbs;
	}

	/**
	 * @method parameters
	 * i.e. things that can be appended to a formula value
	 */
	parameters() {
		let p = super.parameters();
		p.push('notes');
		return p;
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
			fpreview: 'mmcmd:?fpreview',
		}[command];
		if (key) {
			return key;
		}
		else {
			return super.getVerbUsageKey(command);
		}
	}

	/**
	 * @method toolViewInfo
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 * should be overridden by derived classes
	 */
	async toolViewInfo(command) {
		// console.log(`toolviewinfo ${this.getPath()} ${this.session.selectedObject}`);
		let parent = this;
		const oldSelected = this.session.selectedObject;
		this.session.selectedObject = this.name;
		if (oldSelected !== this.name) {
			await this.session.autoSaveSession();
		}
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
	 * @param {MMCommand} command
	 * @returns {String} json value for valueDescribedBy(command.args)
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
	 * @method formulaPreview
	 * @param {MMCommand} command
	 * @returns {String} json value from evaluating the formula in command.args
	 */
	formulaPreview(command) {
		const args = command.args;
		command.results = '';
		const pathEnd = args.indexOf(' ');
		if (pathEnd !== -1) {
			const formulaName = '_fpreview';
			const f = new MMFormula(formulaName, this);
			f.formula = args.substring(pathEnd+1);
			f.nameSpace = this.processor.getObjectFromPath(args.substring(0, pathEnd));
			const value = f.value();
			if (value) {
				command.results = value.jsonValue();
			}
			this.removeChildNamed(formulaName);
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
		if (!description || description === 'self') {
			return MMToolValue.scalarValue(this);
		}
		else if (description === 'notes') {
			return MMStringValue.scalarValue(this.notes);
		}
		else if (description === 'myName') { // deprecated, but kept for old files
			if (requestor) {
				this.valueRequestors.add(requestor);
			}
			return MMStringValue.scalarValue(this.name);
		}
		return null;
	}

	/**
	 * @method htmlValue
	 * @returns {String}
	 */
	htmlValue() {
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
		if (command.args.search(/[^\w]/) !== -1 || command.args.search(/^\d/) !== -1) {
			this.setError('mmcmd:toolBadName', {name: command.args});
			return;
		}
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