// @ts-check
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

/**
 * @class MMCommandPipe
 * Creates and communicates with the worker
 * @property {Worker} [cmdWorker]
 * @property {boolean} isReady
 * @property {Array<{ command: string, callBack: (result: any) => void }>} pendingCommands
 * @property {((result: any) => void)|null} [currentCallBack]
 */
export class MMCommandPipe {
	/** @constructor */
	constructor() {
		if (window.Worker) { // Check if Browser supports the Worker api.
			this.cmdWorker = new Worker("./mmworker/MMCommandWorker.js", { type: 'module' });
			this.isReady = false;
			/** @type {Array<{ command: string, callBack: (result: any) => void }>} */
			this.pendingCommands = [];
			
			// Set up message handler
			this.cmdWorker.onmessage = (e) => {
				const data = e.data;
				
				// Handle ready signal
				if (data.verb === 'ready') {
					console.log('Worker is ready');
					this.isReady = true;
					
					// Process any pending commands
					while (this.pendingCommands.length > 0) {
						const { command, callBack } = /** @type {{ command: string, callBack: (result: any) => void }} */ (this.pendingCommands.shift());
						this._sendCommand(command, callBack);
					}
					return;
				}
				
				// Handle error signal
				if (data.verb === 'error') {
					console.error('Worker error:', data.results);
					return;
				}
				
				// Handle normal command results
				if (this.currentCallBack) {
					this.currentCallBack(data);
				}
			};
		}
		else {
			alert('No worker support');
		}
	}
	
	/** @method doCommand
	 * @param {string} command
	 * @param {(result: any) => void} callBack
	 */
	doCommand(command, callBack) {
		// console.log(`pipe ${command.cmdString}`);
		
		if (!this.isReady) {
			// Queue the command until worker is ready
			(/** @type {Array<{ command: string, callBack: (result: any) => void }>} */ (this.pendingCommands)).push({ command, callBack });
			return;
		}
		
		this._sendCommand(command, callBack);
	}
	
	/** @private @method _sendCommand
	 * @param {string} command
	 * @param {(result: any) => void} callBack
	 */
	_sendCommand(command, callBack) {
		this.currentCallBack = callBack;
		(/** @type {Worker} */ (this.cmdWorker)).postMessage(command);
	}
}