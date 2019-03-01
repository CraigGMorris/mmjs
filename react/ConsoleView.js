'use strict';
const e = React.createElement;

/**
 * @class ConsoleView
 * accepts command line inputs and displays result
 */
export class ConsoleView extends React.Component {
	constructor(props) {
		super(props);
		this.handleChange = this.handleChange.bind(this);
		this.handleKeyPress = this.handleKeyPress.bind(this);
		this.readCommandFile = this.readCommandFile.bind(this);
		this.callBack = this.callBack.bind(this);
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
		this.props.setInfoState(this.props.stackNumber, (state) => {
			lines = lines.join('\n');
			if (lines.length > 100000) {
				lines = lines.substr(0, 100000) + '\nTRUNCATED at 100000 chars';
			}
			return {output: lines}
		});

		this.props.updateDiagram();
	}
	
	/** @method handleChange
	 * keeps input field in sync
	 * @param {Event} event
	 */
  handleChange(event) {
		const value = event.target.value;  // event will be null in handler
		this.props.setInfoState(this.props.stackNumber, {input: value});
	}
	
	/** @method handleKeyPress
	 * watches for Enter and sends command when it see it
	 * @param {Event} event
	 */
	handleKeyPress(event) {
		if (event.key == 'Enter') {
			this.props.actions.doCommand(this.props.infoState.input, this.callBack);
			this.props.setInfoState(this.props.stackNumber, (state) => {
				return {input:''}
			});
		}
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
		return e('div', {className:'console-view'},
			e('textarea',{
				id: 'console-result-field',
				value: this.props.infoState.output || '',
				readOnly: true
			}),
			e('input', {
				id: 'console-input-field',
				value: this.props.infoState.input || '',
				placeholder: t('react:consoleReadPlaceHolder'),
				onChange: this.handleChange,
				onKeyPress: this.handleKeyPress
			}),
			e('div', {
				id: 'console-readfile-background'
			},
				e('label', {
					id: 'readlabel',
					htmlFor: 'readfile'
				},
					t('react:readCommands')
				),
				e('input', {
					type: 'file',
					id: 'readfile',
					onChange: this.readCommandFile,
					placeholder: 'Read Command File'
				})
			)
		);
	}
}