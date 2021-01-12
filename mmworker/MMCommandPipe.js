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
 * @member {Worker} cmdWorker
 */
export class MMCommandPipe {
	/** @constructor */
	constructor() {
		if (window.Worker) { // Check if Browser supports the Worker api.
			this.cmdWorker = new Worker("./mmworker/MMCommandWorker.js");
		}
		else {
			alert('No worker support');
		}
	}
	/** @method doCommand
	 * @param {string} command
	 * @param {function} callBack
	 */
	doCommand(command, callBack) {
		// console.log(`pipe ${command.cmdString}`);
		this.cmdWorker.postMessage(command); // Sending message as an array to the worker

		this.cmdWorker.onmessage = function(e) {
			callBack(e.data);
		}
	}
}