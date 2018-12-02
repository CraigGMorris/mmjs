/**
 * @class MMCommandPipe
 * Creates and communicates with the worker
 * @member {Worker} cmdWorker
 */
export class MMCommandPipe {
	/** @constructor */
	constructor() {
		if (window.Worker) { // Check if Browser supports the Worker api.
			this.cmdWorker = new Worker("/mmworker/MMCommandWorker.js");
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
		if (this.cmdWorker) {
			this.cmdWorker.postMessage(command); // Sending message as an array to the worker
			console.log('Main (first.onchange): Message posted to worker');

			this.cmdWorker.onmessage = function(e) {
				callBack(e.data);
			}
		}
		else {
			let results = this.processor.processCommandString(command);
			if (results) {
				callBack(results);
			}
		}
	}
}