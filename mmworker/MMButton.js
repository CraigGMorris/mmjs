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
	theMMSession:readonly
*/

/**
 * @class MMButton
 * @extends MMTool
 */
// eslint-disable-next-line no-unused-vars
export class MMButton extends MMTool {
	/** @constructor
	 * @param {string} name
	 * @param {MMModel} parentModel
	 */
	constructor(name, parentModel) {
		super(name, parentModel, 'Button');
		this._action = 'addrow';
		this.targetFormula = new MMFormula('targetFormula', this);
		this.labelFormula = new MMFormula('labelFormula', this);
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
		o['targetFormula'] = {Formula: this.targetFormula.formula};
		o['labelFormula'] = {Formula: this.labelFormula.formula};
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
			if (saved.targetFormula) {
				this.targetFormula.formula = saved.targetFormula.Formula;
			}
			else if (saved.target) {
				this.targetFormula.formula = "'" + saved.target; // for older beta cases
			}
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
		return d;
	}

	get action() {
		return this._action;
	}
	
	set action(newValue) {
		if (this._action !== newValue) {
			this._action = newValue;
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
		this.targetFormula.addInputSourcesToSet(sources);
		return sources;
	}

	/** @override */
		get verbs() {
			let verbs = super.verbs;
			// verbs['press'] = this.pressCommand;
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
		p.push('label');

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
			case 'target': {
				const targetValue = this.targetFormula.value();
				if (targetValue) {
					this.addRequestor(requestor);
					return targetValue;
				}
			}
				break;
			case 'label': {
				const labelValue = this.labelFormula.value();
				if (labelValue) {
					this.addRequestor(requestor);
					return labelValue;
				}
			}
				break;
		default:
			return super.valueDescribedBy(description, requestor);
		}
	}

	/**
	 * @method htmlValue
	 * @returns {String}
	 */
	htmlValue(requestor) {
		this.addRequestor(requestor);
		const labelValue = this.labelFormula.value();
		const label = labelValue ? labelValue.values[0] : '?';
		const targetValue = this.targetFormula.value();
		if (targetValue instanceof MMStringValue) {
			let target = targetValue ? targetValue.values[0] : '';
			if (target) {
				if (this.action === 'addrow' || this.action === 'push') {
					const pathParts = [target];
					if (this.parent !== theMMSession.currentModel) {
						pathParts.push(this.parent.name);
						let parent = this.parent.parent;
						while (parent !== theMMSession.currentModel) {
							pathParts.push(parent.name);
							parent = parent.parent;
						}
						target = pathParts.reverse().join('.');
					}
				}
				return `<div  class="button-tool"><button id="button__${this.name}"
				onclick="mmpost([], {mm_${this.action}: '${target}', mm_update: true});">
				${label}
				</button></div>`
			}
		}
		else {
			return `<div  class="button-tool"><button id="button__${this.name}" disabled>
				${label}
				</button></div>`
		}
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
		results['action'] = this.action;

		results['labelFormulaName'] = 'labelFormula';
		results['labelFormula'] = this.labelFormula.formula;
		const labelValue = this.labelFormula.value();
		results['label'] = labelValue ? labelValue.values[0] : '';

		results['targetFormulaName'] = 'targetFormula';
		results['targetFormula'] = this.targetFormula.formula;
		const targetValue = this.targetFormula.value();
		if (targetValue instanceof MMStringValue) {
			results['target'] = targetValue ? `=> "${targetValue.values[0]}"` : '';
		}
		else {
			results['target'] = '=> "?"';
		}
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
