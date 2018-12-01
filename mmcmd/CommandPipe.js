/**
 * @class CommandPipe
 * sends MM commands to the CommandWorker
 */
export class CommandPipe {
	/** @constructor */
	constructor() {
		if (window.Worker) { // Check if Browser supports the Worker api.
			/** @member {Worker} cmdWorker */
			this.cmdWorker = new Worker("/mmcmd/CommandWorker.js");
		}
		else {
			alert('No worker supper');
		}
	}
	/** @method doCommand
	 * @param {string} command
	 * @param {function} callBack
	 */
	doCommand(command, callBack) {
		this.cmdWorker.postMessage(command); // Sending message as an array to the worker
		console.log('Main (first.onchange): Message posted to worker');

		this.cmdWorker.onmessage = function(e) {
			callBack(e.data);
		}
	}
}