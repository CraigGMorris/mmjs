'use strict';

import {MMCommandPipe} from '/mmworker/MMCommandPipe.js';
import {ConsoleView} from './ConsoleView.js';

const e = React.createElement;

/**
 * @class MMView
 * the main Math Minion window
 * @member {MMCommandPipe} pipe - pipe to worker
 * @member {i18ni18next} i18n - localization
 */
export class MMView extends React.Component {
	constructor(props) {
		super(props);
		this.pipe = new MMCommandPipe();
		this.doCommand = this.doCommand.bind(this);
 		this.views = {
			'console': ConsoleView
		}
		this.state = {
			infoView: 'console',
		}
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
	
	render() {
		let infoView = e(this.views[this.state.infoView],
			{
				className: 'mmview-' + this.state.infoView.toLowerCase(),
				doCommand: this.doCommand,
				i18n: this.props.i18n
			}
		);
		return e('div', {className: 'mmview-wrapper'},
			e('div', {className: 'mmview-diagram'}, 'diagram'),
			e('div', {className: 'mmview-info-wrapper'},
				e('div', {className: 'mmview-info-content'},
					infoView
				),
				e('div', {className: 'mmview-info-tools'},
					e('button', {
						className:'mmview-unit-button',
						value:'Units'}, 'Units'),
					e('button', {
						className:'mmview-console-button',
						type	:'button'}, 'Console')
				)
			)
		);
	}
}