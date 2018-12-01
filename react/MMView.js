import {CommandPipe} from '/mmcmd/CommandPipe.js';
import {ConsoleView} from './ConsoleView.js';

const e = React.createElement;

/**
 * @class MMView
 * the main Math Minion window
 */
export class MMView extends React.Component {
	constructor(props) {
		super(props);
		/** @memeber {CommandPipe} - pipe to worker */
		this.pipe = new CommandPipe();
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
				let output = r.results;
				if (typeof output != 'string') {
					output = JSON.stringify(output, null, ' ');
				}
				this.setState((state) => { return {output: output};});
			}
		});
	}
	
	render() {
		let infoView = e(ConsoleView,
			{
				className: 'mmview-info',
				doCommand: this.doCommand,
				output: this.state.output
			}
		);
		return e(
			'div', {className: 'mmview-wrapper'},
			e(
				'div', {className: 'mmview-diagram'}, 'diagram'
			),
			infoView
		);
	}
}