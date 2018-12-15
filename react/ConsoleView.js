'use strict';
import {MMViewComponent} from './MMViewComponent.js';

const e = React.createElement;

/**
 * @class ConsoleView
 * accepts command line inputs and displays result
 */
export class ConsoleView extends MMViewComponent {
	constructor(props) {
		super(props);
		this.state = {
			input: '',
			output: ''
		};
		this.handleChange = this.handleChange.bind(this);
		this.handleKeyPress = this.handleKeyPress.bind(this);
		this.readCommandFile = this.readCommandFile.bind(this);
		this.callBack = this.callBack.bind(this);
	}

	/** @method callBack - called when the worker completes command
	 * @param {MMCommand[]} cmds
	 */
	callBack(cmds) {
		let lines = []
		for (let r of cmds) {
			let output = r;
			if (typeof output != 'string') {
				if (output.verb == 'help' && output.args) {
					output = this.props.t(output.results.msgKey, output.results.args);
				}
				else if (output.verb == 'error' && output.results.msgKey) {
					output = this.props.t(output.results.msgKey, output.results.args);
				}
				else {
					output = JSON.stringify(output, null, ' ');
				}
			}
			lines.push(output);
		}
		this.setState((state) => { return {output: lines.join('\n')};});
	}
	
	/** @method handleChange
	 * keeps input field in sync
	 * @param {Event} event
	 */
  handleChange(event) {
    this.setState({input: event.target.value});
	}
	
	/** @method handleKeyPress
	 * watches for Enter and sends command when it see it
	 * @param {Event} event
	 */
	handleKeyPress(event) {
		if (event.key == 'Enter') {
			this.props.doCommand(this.state.input, this.callBack);
			this.setState({input:''});
		}
	}

	readCommandFile(event) {
		//Retrieve the first (and only!) File from the FileList object
		var f = event.target.files[0]; 

		if (f) {
			let r = new FileReader();
			r.onload = (e) => { 
				let contents = e.target.result;
				this.props.doCommand(contents, this.callBack);
			};
			r.readAsText(f);
		} else { 
			alert("Failed to load file");
		}
	}
	
	render() {
		return e('div', {className:'console-view'},
			e('textarea',{
				id: 'console-result-field',
				value: this.state.output,
				readOnly: true
			}),
			e('input', {
				id: 'console-input-field',
				value: this.state.input,
				placeholder: this.props.t('react:consoleReadPlaceHolder'),
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
					this.props.t('react:readCommands')
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