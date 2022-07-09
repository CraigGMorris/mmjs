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
	MMPropertyType:readonly
	MMStringValue:readonly
	theMMSession:readonly
	MMToolValue:readonly
	MMFormula:readonly
	MMToolTypes:readonly
	MMPoint:readonly
	MMModel:readonly
*/

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
		this._htmlNotes = false;
		this._isOutput = false;
	}

	get properties() {
		let d = super.properties;
		d['displayName'] = {type: MMPropertyType.string, readOnly: true};
		d['description'] = {type: MMPropertyType.string, readOnly: true};
		d['notes'] = {type: MMPropertyType.string, readOnly: false};
		d['diagramNotes'] = {type: MMPropertyType.boolean, readOnly: false};
		d['htmlNotes'] = {type: MMPropertyType.boolean, readOnly: false};
		d['isOutput'] = {type: MMPropertyType.boolean, readOnly: false};
		return d;
	}

	get displayName() {
		let toolType = MMToolTypes[this.typeName];
		return this.t(toolType.displayName);
	}

	get isOutput() {
		return this._isOutput;
	}

	set isOutput(newValue) {
		const oldValue = this._isOutput;
		this._isOutput = (newValue) ? true : false;
		if (oldValue !== this._isOutput) {
			this.forgetCalculated();
			this.parent.forgetCalculated();
		}
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

	get htmlNotes() {
		return this._htmlNotes;
	}

	set htmlNotes(show) {
		const oldShow = this._htmlNotes;
		this._htmlNotes = show;
		if (oldShow !== show) {
			this.forgetCalculated();
		}
	}

	/** @override */
	get verbs() {
		let verbs = super.verbs;
		verbs['toolviewinfo'] = this.toolViewInfo;
		verbs['value'] = this.valueJson;
		verbs['fpreview'] = this.formulaPreview;
		return verbs;
	}

	/** override */
	setValue(propertyName, value) {
		if (propertyName === 'notes' && value !== this.notes) {
			this.forgetCalculated();
		}
		super.setValue(propertyName, value);
	}

	/**
	 * @method parameters
	 * i.e. things that can be appended to a formula value
	 */
	parameters() {
		let p = super.parameters();
		p.push('notes');
		p.push('html');
		return p;
	}
	

	/** @method getVerbUsageKey
	 * @override
	 * @param {string} command - command to get the usage key for
	 * @returns {string} - the i18n key, if it exists
	 */
	getVerbUsageKey(command) {
		let key = {
			toolViewInfo: 'mmcmd:_toolViewInfo',
			value: 'mmcmd:_valueJson',
			fpreview: 'mmcmd:_fpreview',
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
			htmlNotes: this.htmlNotes,
			isOutput: this._isOutput,
		}
	}

	/**
	 * @method valueJson
	 * @param {MMCommand} command
	 * @returns {String} json value for valueDescribedBy(command.args)
	 */
	valueJson(command) {
		const value = this.valueDescribedBy(command.args);
		if (value && value.jsonValue) {
			command.results = value.jsonValue();
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
	forgetCalculated() {
		if (this.parent instanceof MMModel) {
			this.parent.htmlProcessor.clearCache();
		}
	}

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
	valueDescribedBy(rawDescription, requestor) {
		const description = rawDescription ? rawDescription.toLowerCase() : '';
		if (!description || description === 'self') {
			if (requestor) {
				this.valueRequestors.add(requestor);
			}
			return MMToolValue.scalarValue(this);
		}
		else if (description === 'notes') {
			if (requestor) {
				this.valueRequestors.add(requestor);
			}
			return MMStringValue.scalarValue(this.notes);
		}
		else if (description === 'myname') {
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
	htmlValue(requestor) {
		const v = this.valueDescribedBy('table', requestor);
		return v ? this.valueDescribedBy('table', requestor).htmlValue() : null;
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
		const o =  {
			name: this.name,
			Notes: this.notes,
			DiagramX: this.position.x,
			DiagramY: this.position.y,
			HideInfo: this.isHidingInfo ? 'y': 'n',
			DiagramNotes: this.diagramNotes ? 'y' : 'n',
			HtmlNotes: this.htmlNotes ? 'y' : 'n',
		};
		if (this._isOutput)	{ o['isOutput'] = 'y'; }
		return o;
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
		this.htmlNotes = (saved.HtmlNotes === 'y');
		this.isOutput = (saved.isOutput === 'y');
	}
}