'use strict';

import {MMCommandPipe} from '/mmworker/MMCommandPipe.js';

/**
 * @class MMViewComponent
 * the main Math Minion window
 * @member {MMCommandPipe} pipe - pipe to worker
 * @member {i18n.i18next} i18n - localization
 */
export class MMViewComponent extends React.Component {
	constructor(props) {
		super(props);
		this.pipe = new MMCommandPipe();
		this.doCommand = this.doCommand.bind(this);
	}

	/**
	 * @method doCommand - sends command to worker
	 * @param {string} cmd
	 * @param {function} callBack - (cmds[]) => {}
	 */
	doCommand(cmd, callBack) {
		this.pipe.doCommand(cmd, (cmds) => {
			// might check here for results needing new view states
			callBack(cmds);
		});
	}

	/** @method
	 * redirect to i18n.t
	 * @param {string} key
	 * @param {Object} args
	 * @returns {string}
	 */
	t(key, args) {
		return this.props.i18n.t(key, args);
	}
}
