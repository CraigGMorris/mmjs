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
		this.props.actions.setViewInfoState((state) => {
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
		this.props.actions.setViewInfoState({input: value});
	}
	
	/** @method handleKeyPress
	 * watches for Enter and sends command when it see it
	 * @param {Event} event
	 */
	handleKeyPress(event) {
		if (event.key == 'Enter') {
			this.props.actions.doCommand(this.props.viewInfo.viewState.input, this.callBack);
			this.props.actions.setViewInfoState((state) => {
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
		return e('div', {
				style: {
					height: '100%',
					fontSize: '1em',
					display: 'grid',
					gridTemplateColumns: '1fr',
					gridTemplateRows: '1fr 30px 40px',
					gridTemplateAreas: `"result"
						"input"
						"readfile"`					
				}
			},
			e('textarea',{
				style: {
					gridArea: 'result',
					overflow: 'auto',
					textAlign: 'left',
					fontSize: '1em',
					boxSizing: 'border-box',
					whiteSpace: 'pre-wrap',
					tabSize: '4',
					paddingLeft: '5px'
				},
				value: this.props.viewInfo.viewState.output || '',
				readOnly: true
			}),
			e('input', {
				style: {
					gridArea: 'input',
					justifySelf: 'center',
					fontSize: '12pt',
					width: 'calc(100% - 1em)',
					border: 'solid 1px'
				},
				value: this.props.viewInfo.viewState.input || '',
				placeholder: t('react:consoleReadPlaceHolder'),
				onChange: this.handleChange,
				onKeyPress: this.handleKeyPress
			}),
			e('div', {
				style: {
					gridArea: 'readfile',
					display: 'grid',
					gridTemplateColumns: '40px 1fr',
					gridTemplateRows: '1fr',
					gridTemplateAreas: `"readlabel readinput"`,
					backgroundColor: 'rgb(243,243,243)'
				}
			},
				e('label', {
					style: {
						fontSize: '11pt',
						gridArea: 'readlabel',
						alignSelf: 'center',
						justifySelf: 'center'
					},
					htmlFor: 'readfile'
				},
					t('react:readCommands')
				),
				e('input', {
					type: 'file',
					style: {
						fontSize: '10pt',
						gridArea: 'readinput',
						alignSelf: 'center',
						justifySelf: 'center',
						color: 'blue'			
					},
					onChange: this.readCommandFile,
					placeholder: 'Read Command File'
				})
			)
		);
	}
}