import {MMCommandPipe} from '/mmworker/MMCommandPipe.js';
import {ConsoleView} from './ConsoleView.js';

const e = React.createElement;

/**
 * @class MMView
 * the main Math Minion window
 */
export class MMView extends React.Component {
	constructor(props) {
		super(props);
		/** @memeber {MMCommandPipe} - pipe to worker */
		this.pipe = new MMCommandPipe();
		this.state = {
			output: '',
		}
		this.doCommand = this.doCommand.bind(this);
	}

	/**
	 * @method doCommand - sends command to worker
	 * @param {string} cmd
	 * @param {function} - (cmds[]) => {}
	 */
	doCommand(cmd) {
		this.pipe.doCommand(cmd, (cmds) => {
			console.log('Main (myWorker.onmessage): Message received from worker');
			for (let r of cmds) {
				let output = r;
				if (typeof output != 'string') {
					output = JSON.stringify(output, null, ' ');
				}
				this.setState((state) => { return {output: output};});
			}
		});
	}
	
	render() {
		let consoleView = e(ConsoleView,
			{
				className: 'mmview-console',
				doCommand: this.doCommand,
				output: this.state.output
			}
		);
		return e('div', {className: 'mmview-wrapper'},
			e('div', {className: 'mmview-diagram'}, 'diagram'),
			e('div', {className: 'mmview-info-wrapper'},
				e('div', {className: 'mmview-info-content'},
					consoleView
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