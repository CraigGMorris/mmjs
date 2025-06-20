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
	MMParent:readonly
	MMUnitSystem:readonly
	MMPropertyType:readonly
	MMModel:readonly
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
	MMButton:readonly
	MMMenu:readonly
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
		path = path.trim();
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
	 * @emethod areTheSame
	 * @param {String} firstPath
	 * @param {String} secondPath
	 */
	async areTheSame(firstPath, secondPath) {
		const first = await this.load(firstPath);
		if (!first) {
			return false;
		}
		const second = await this.load(secondPath);
		return (first == second);
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
 * @extends MMParent
 * @member {MMUnitSystem} unitSystem
 * @member {MMModel} rootModel
 * @member {MMModel} currentModel
 * @member {MMModel[]} modelStack
 * @member {string} storePath - path to persistent storage
 * @member {MMPoint} unknownPosition
 * @member {MMPoint} nextToolLocation
 * @member {MMIndexedDBStorage} storage
 */
// eslint-disable-next-line no-unused-vars
class MMSession extends MMParent {
	// session creation and storage commands

	/**
	 * @constructor
	 * @param {Object} processor - MMCommandProcessor
	 */
	constructor(processor) {
		super('session',  processor, 'MMSession');
		// construct the unit system - it will add itself to my children
		new MMUnitSystem(this);
		this.storage = new MMIndexedDBStorage();
		this.savedLastPathId = '(lastPath)';
		this.savedLastNewsId = '(lastNews)';
		this.savedStorageVersionId = '(storageVersion)';
		this.openAIKey = '(openAIKey)';
		this.anthropicKey = '(anthropicKey)';
		this.lastNews = '20250526';
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
		this.modelStack = [];
		this.storePath = storePath;
		this.noRun = false;
		this.processor.defaultObject = this.rootModel;
		this.selectedObject = '';
	}

	get properties() {
		let d = super.properties;
		d['storePath'] = {type: MMPropertyType.string, readOnly: false};
		d['noRun'] = {type: MMPropertyType.boolean, readOnly: false};
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
		this.modelStack = [];
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

	/** @method loadAutoSaved
	 * load the autosaved session from persistent storage
	 */
	async loadAutoSaved() {
		const storageVersion = await this.storage.load(this.savedStorageVersionId);
		// console.log(`storage version ${storageVersion}`);
		if (!storageVersion) {
			// await this.importOldStorage();
			await this.storage.save(this.savedStorageVersionId, '1');
		}
		// this.remoteCouch = await indexedDB.load('(remoteCouch)');
		// this.couchDBSync();
		try {
			this.isLoadingCase = true;
			this.newSession();
			const lastNews = await this.storage.load(this.savedLastNewsId);
			const lastPath = await this.storage.load(this.savedLastPathId);
			const newsUrl = '../news/MM_News.txt';
			if (
				(lastNews && lastNews != this.lastNews) ||
				(!lastNews && lastPath)
			) {
				// let things settle before loading news
				function sleepAsync(ms) {
					return new Promise(resolve => setTimeout(resolve, ms));
				}
				await sleepAsync(1000);
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

	/** @method deleteAllSessions
	 * delete every session from the permenent storage
	 */
	async deleteAllSessions() {
		const sessionPaths = await this.storage.listSessions();
		for (const existingPath of sessionPaths) {
			if (!existingPath.startsWith('(')) {
				await this.storage.delete(existingPath);
				if (this.storePath === existingPath) {
					this.storePath = '(unnamed)';
					await this.saveLastSessionPath()
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
		newPath = newPath.trim();
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
				let theSame = false;
				if (existingPath.startsWith(oldPath)) {
					let newSessionPath = newPath + existingPath.substring(oldPath.length);
					let n = 2;
					if (setOfPaths.has(newSessionPath)) {
						theSame = await this.storage.areTheSame(newSessionPath, existingPath);
						if (!theSame) {
							do {
								newSessionPath = newPath + `All_Replaced-${n++}/` +existingPath.substring(oldPath.length);
							} while (setOfPaths.has(newSessionPath))
						}
					}
					try {
						if (!theSame) {
							await this.storage.copy(existingPath, newSessionPath);
						}
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
		verbs['deleteallsessions'] = this.deleteAllSessionsCommand;
		verbs['rename'] = this.renameSessionCommand;
		verbs['getjson'] = this.getJsonCommand;
		verbs['pushmodel'] = this.pushModelCommand;
		verbs['popmodel'] = this.popModelCommand;
		verbs['import'] = this.importCommand;
		verbs['remote'] = this.remoteDBCommand;
		verbs['getmodelstack'] = this.getModelStackCommand;
		verbs['aikey'] = this.aiKeyCommand;
		verbs['aiquery'] = this.aiQueryCommand;
		return verbs;
	}

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			dgminfo: 'mmcmd:_modelDgmInfo',
			listsessions: 'mmcmd:_sessionList',
			new: 'mmcmd:_sessionNew',
			load: 'mmcmd:_sessionLoad',
			loadurl: 'mmcmd:_sessionLoadUrl',
			save: 'mmcmd:_sessionSave',
			copy: 'mmcmd:_sessionCopy',
			delete: 'mmcmd:_sessionDelete',
			deleteAllSessions: 'mmcmd:_sessionDeleteAll',
			rename: 'mmcmd:_sessionRename',
			getjson: 'mmcmd:_sessionGetJson',
			pushmodel: 'mmcmd:_sessionPushModel',
			popmodel: 'mmcmd:_sessionPopModel',
			import: 'mmcmd:_sessionImport',
			remote: 'mmcmd:_sessionRemote',
			getmodelstack: 'mmcmd:_sessionGetModelStack',
			aikey: 'mmcmd:_aikey',
			aiinfo: 'mmcmd:_aiinfo',
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
		this.processor.defaultObject = model;
	}

	/**
	 * @method popModel
	 * @param count - the number of times to pop
	 */
	popModel(count=1) {
		while (this.modelStack.length > 0 && count-- > 0) {
			this.currentModel = this.modelStack.pop();
			this.processor.defaultObject = this.currentModel;
		}
	}

	/** @method listSessionsCommand
	 * list all the stored sessions
	 */
	async listSessionsCommand(command) {
		const result = await this.storage.listSessions();
		command.results = {paths: result, currentPath: this.storePath};
		// const indexedDB = new MMIndexedDBStorage();
		// const remote = await indexedDB.load('(remoteCouch)');
		// if (remote) {
		// 	command.results.remote = remote.split('@')[1];
		// }
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
	 * @method deleteAllSessionsCommand
	 * verb
	 * @param {MMCommand} command
	 */
	async deleteAllSessionsCommand(command) {
		if (!indexedDB) {
			this.setError('mmcmd:noIndexedDB', {});
			return;
		}
		let result = await this.deleteAllSessions(command.args);
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
			const folderName = archive.folderName;
			const sessions = archive.sessions;

			let newFolderPath = "";
			let newFolderName = folderName;
			if (!folderName.endsWith('/')) {
				newFolderName += '/';
			}
			if (folderName === 'root/') {
				newFolderName = 'All Imported/';
			}
			else if (rootPath === '') {
				// if importing into root and folder isn't root
				// then set the path to folderName in case there aren't any other sessions
				newFolderPath = folderName;
			}
			for (const path of existingPaths) {
				// see if there are any real sessions
				if (!path.startsWith('(')) {
					let n = 2;
					newFolderPath = rootPath + newFolderName;
					while (pathAlreadyUsed(newFolderPath)) {
						newFolderPath =  newFolderName + `-${n++}`;
					}
					break;
				}
			}

			for (const path of Object.keys(sessions)) {
				const fullPath = newFolderPath + (path.startsWith('/') ? path.substring(1) : path);
				await this.storage.save(fullPath, sessions[path]);
			}
		}
		else {
			// assume session import
			try {
				new MMUnitSystem(this);  // clear any user units and sets
				this.isLoadingCase = true;
				try {
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
				finally {
					this.isLoadingCase = false;
				}
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
	// async remoteDBCommand(command) {
	// 	this.remoteCouch = command.args;
	// 	const indexedDB = new MMIndexedDBStorage();
	// 	await indexedDB.save('(remoteCouch)', this.remoteCouch);
	// }

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
		const names = command.args.toLowerCase().split('.');
		let model = this.currentModel;
		for (let name of names){
			name = name.startsWith('.') ? name.substring(1) : name; // remove dot prefix if present
			model = model?.children[name];
		}
		// const model = this.currentModel.childNamed(command.args);
		if (model instanceof MMModel) {
			this.pushModel(model);
			await this.autoSaveSession();
		}
		else {
			this.setError('mmcmd:sessionPushModelFailed', {path: command.args});
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
	 * @method getModelStackCommand
	 * verb
	 * @param {MMCommand} command - returns model stack array
	 */
	async getModelStackCommand(command) {
		let modelStack = this.modelStack.map(m => m.name);
		modelStack.push(this.currentModel.name);
		command.results = {modelStack: modelStack};
	}

	// testing method - place to easily try things out
	async test(command) {
		let results = ['no test implemented']
		// let test = command.args;

		command.results = results;
	}

	/**
	 * @method aikeyCommand
	 * verb
	 * @param {MMCommand} command - sets, gets or clears aikey
	 */
	async aiKeyCommand(command) {
		if (!indexedDB) {
			this.setError('mmcmd:noIndexedDB', {});
			return;
		}
		const args = this.splitArgsString(command.args);
		if (args.length === 0) {
			this.setError('mmcmd:_aikey', {});
			return;
		}
		else if (args.length === 1) {
			switch (args[0].toLowerCase()) {
				case 'openai':
					command.results = await this.storage.load(this.openAIKey);
					return;
				case 'claude':
					command.results = await this.storage.load(this.anthropicKey);
					return;
				default:
					this.setError('No AI model', {model: args[0]});
			}
		}
		else {
			switch (args[0].toLowerCase()) {
				case 'openai': {
					let key = args[1];
					if (key.toLowerCase() === 'x') {
						await this.storage.save(this.openAIKey, '');
						command.results = 'key cleared';
					}
					else {
						await this.storage.save(this.openAIKey, key);
						command.results = 'key saved';
					}
					return;
				}
				case 'claude': {
					let key = args[1];
					if (key.toLowerCase() === 'x') {
						await this.storage.save(this.anthropicKey, '');
						command.results = 'key cleared';
					}
					else {
						await this.storage.save(this.anthropicKey, key);
						command.results = 'key saved';
					}
					return;
				}
				default:
					this.setError('No AI model', {model: args[0]});
			}
		}

	}

	/**
	 * @method aiQueryCommand
	 * verb
	 * @param {MMCommand} command - returns information about the arguments
	 */
	async aiQueryCommand(command) {
		const args = this.splitArgsString(command.args);
		if (args.length === 0) {
			this.setError('mmcmd:_aiquery', {});
			return;
		}
		const results = {};
		for (const arg of args) {
			const key = arg.toLowerCase();
			const workerUrl = self.location.href;// window.location.pathname.split('/').slice(0, -1).join('/');
			const basePath = workerUrl.split('/').slice(0, -2).join('/');
			await fetch(`${basePath}/ai/openai/info/${key}.yml`).then(response => {
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				return response.text();
			})
			.then(text => {
				results[key] = text;
			}).catch(error => {
				console.error(error);
			});
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
	"Button": {
		factory: (name, parent) => {return new MMButton(name, parent)},
		displayName: new MMCommandMessage('mmcmd:buttonDisplayName'),
	},
	"Menu": {
		factory: (name, parent) => {return new MMMenu(name, parent)},
		displayName: new MMCommandMessage('mmcmd:menuDisplayName'),
	},
};
