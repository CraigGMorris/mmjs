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
	MMFormula:readonly
	MMPropertyType:readonly
	MMStringValue:readonly
	MMDataTable:readonly
	theMMSession:readonly
*/

/**
 * @class MMButton
 * @extends MMTool
 */
// eslint-disable-next-line no-unused-vars
class MMButton extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Button');
		this._action = 'addrow';
		this._target = '';
		this.labelFormula = new MMFormula('label', this);
		this.isLoadingCase = false;
		this.isOutput = true;
	}

		/**
	 * @method saveObject
	 * @override
	 * @returns {Object} object that can be converted to json for save file
	 */
	saveObject() {
		let o = super.saveObject();
		o['Type'] = 'Button';
		o['action'] = this.action;
		o['target'] = this.target;
		o['labelFormula'] = {Formula: this.labelFormula.formula}
		return o;
	}	

	/**
	 * @method initFromSaved - initialize from stored object
	 * @override
	 * @param {Object} saved 
	 */
	initFromSaved(saved) {
		this.isLoadingCase = true;
		try {
			super.initFromSaved(saved);
			this._action = saved.action;
			this._target = saved.target;
			this.labelFormula.formula = saved.labelFormula.Formula;
		}
		finally {
			this.isLoadingCase = false;
		}
	}
	
	/** @override */
	get properties() {
		let d = super.properties;
		d['action'] = {type: MMPropertyType.string, readOnly: false};
		d['target'] = {type: MMPropertyType.string, readOnly: false};
		return d;
	}

	get target() {
		return this._target;
	}
	
	set target(newValue) {
		if (this._target !== newValue) {
			this._target = newValue;
			this.forgetCalculated();
		}
	}

	get action() {
		return this._action;
	}
	
	set action(newValue) {
		if (this._action !== newValue) {
			this._action = newValue;
			this._target = '';
			this.forgetCalculated();
		}
	}

	/**
	 * @method inputSources
	 * @override
	 * @returns {Set} contains tools referenced by this tool
	 */
	inputSources() {
		let sources = super.inputSources();
		this.labelFormula.addInputSourcesToSet(sources);
		if (this.action !== 'load' && this.target) {
			const tool = this.parent.childNamed(this.target);
			if (tool) {
				sources.add(tool);
			}
		}	
		return sources;
	}

	/** @override */
		get verbs() {
			let verbs = super.verbs;
			verbs['press'] = this.pressCommand;
			return verbs;
		}
	
		/** @method getVerbUsageKey
		 * @override
		 * @param {string} command - command to get the usage key for
		 * @returns {string} - the i18n key, if it exists
		 */
		getVerbUsageKey(command) {
			let key = {
				press: 'mmcmd:_buttonPress',
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
		p.push('action');
		p.push('target');

		return p;
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
		const lcDescription = description.toLowerCase();
		switch (lcDescription) {
			case 'action':
				if (this.action) {
					this.addRequestor(requestor);
					return MMStringValue.scalarValue(this.action);
				}
				break;
			case 'target':
				if (this.target) {
					this.addRequestor(requestor);
					return MMStringValue.scalarValue(this.target);
				}
				break;
			case 'html': {
				const value = this.htmlValue(requestor);
				if (value) {
					return MMStringValue.scalarValue(value);
				}
			}
				break;
			default:
				break;
			}
			return null;
	}
	
	/**
	 * @method htmlValue
	 * @returns {String}
	 */
	htmlValue(requestor) {
		this.addRequestor(requestor);
		const labelValue = this.labelFormula.value();
		const label = labelValue ? labelValue.values[0] : '?';
		return `<div  class="button-tool"><button id="button__${this.name}"
onclick="mmpost([], {mm_${this.action}: '${this.target}', mm_update: true});">
${label}
</button></div>`
	}

	/**
	 * @method toolViewInfo
	 * @override
	 * @param {MMCommand} command
	 * command.results contains the info for tool info view
	 */
	async toolViewInfo(command) {
		await super.toolViewInfo(command);
		const results = command.results;
		results['labelFormulaName'] = 'labelFormula';
		results['labelFormula'] = this.labelFormula.formula;
		const labelValue = this.labelFormula.value();
		results['label'] = labelValue ? labelValue.values[0] : '';
		results['action'] = this.action;
		results['target'] = this.target;
		const targets = [''];
		switch (this.action) {
			case 'addrow': {
				for (const targetName in this.parent.children) {
					if (this.parent.children[targetName] instanceof MMDataTable) {
						targets.push(targetName);
					}
				}
			}
			break;
			case 'refresh':
			case 'push': {
				for (const targetName in this.parent.children) {
					if (targetName !== this.name) {
						targets.push(targetName);
					}
				}
			}
			break;
			case "load": {
				const command = {};
				await theMMSession.listSessionsCommand(command);
				for (const targetName of command.results.paths) {
					if (!targetName.startsWith('(')) {
						targets.push(targetName);
					}
				}	
			}
			break;
		}
		results['targets'] = targets;
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
				super.forgetCalculated();
			}
			finally {
				this.forgetRecursionBlockIsOn = false;
			}
		}
	}	
}
