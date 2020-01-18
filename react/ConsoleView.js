'use strict';
const e = React.createElement;

/**
 * @class ConsoleView
 * accepts command line inputs and displays result
 */
export class ConsoleView extends React.Component {
	constructor(props) {
		super(props);
		this.readCommandFile = this.readCommandFile.bind(this);
		this.callBack = this.callBack.bind(this);
		this.state = {
			output: '',
			input: '',
		};
	}

	/** @method callBack - called when the worker completes command
	 * @param {MMCommand[]} cmds
	 */
	callBack(cmds) {
		let t = this.props.t;
		let lines = [];
		for (let r of cmds) {
			let output = r;
			if (typeof output != 'string') {
				if (output.verb == 'help' && output.args) {
					output = t(output.results.msgKey, output.results.args);
				}
				else if (output.verb == 'error' && output.results.msgKey) {
					output = t(output.results.msgKey, output.results.args);
				}
				else {
					output = JSON.stringify(output, null, ' ');
				}
			}
			lines.push(output);
		}
		this.setState((state) => {
			lines = lines.join('\n');
			if (lines.length > 100000) {
				lines = lines.substr(0, 100000) + '\nTRUNCATED at 100000 chars';
			}
			return {output: lines}
		});

		this.props.updateDiagram();
	}
	
	readCommandFile(event) {
		//Retrieve the first (and only!) File from the FileList object
		var f = event.target.files[0]; 

		if (f) {
			let r = new FileReader();
			r.onload = (e) => { 
				let contents = e.target.result;
				this.props.actions.doCommand(contents, this.callBack);
			};
			r.readAsText(f);
		} else { 
			alert("Failed to load file");
		}
	}
	
	render() {
		let t = this.props.t;
		return e(
			'div', {
				id: 'console',
			},
			e(
				'textarea',{
					id: 'console__result',
					value: this.state.output || '',
					readOnly: true
				}
			),
			e(
				'input', {
					id: 'console__input',
					value: this.state.input || '',
					placeholder: t('react:consoleReadPlaceHolder'),
					onChange: (event) => {
						//keeps input field in sync
						const value = event.target.value;
						this.setState({input: value});				
					},
					onKeyPress: (event) => {
						if (event.key == 'Enter') {
							// watches for Enter and sends command when it see it
							this.props.actions.doCommand(this.state.input, this.callBack);
							this.setState((state) => {
								return {input:''}
							});
						}
					}
				}
			),
			e(
				'div', {
					id: 'console__read-file',
				},
				e(
					'label', {
						id: 'console__read-file-label',
						className: 'input-file-button',
					},
					t('react:consoleReadCommands'),
					e(
						'input', {
							id: 'console__read-file-input',
							type: 'file',
							onChange:  this.readCommandFile,
						}
					),	
				),
			)
		);
	}
}