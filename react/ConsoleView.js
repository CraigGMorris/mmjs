'use strict';
const e = React.createElement;
const useState = React.useState;

/**
 * accepts command line inputs and displays result
 */
export function ConsoleView(props) {
	const [output, setOutput] = useState('');
	const [input, setInput] = useState('');
	const t = props.t;

	/** function callBack - called when the worker completes command
	 * @param {MMCommand[]} cmds
	 */
	let callBack = cmds => {
		let lines = [];
		for (let r of cmds) {
			let cmdOutput = r;
			if (typeof cmdOutput != 'string') {
				if (cmdOutput.verb == 'help' && cmdOutput.args) {
					cmdOutput = t(cmdOutput.results.msgKey, cmdOutput.results.args);
				}
				else if (cmdOutput.verb == 'error' && cmdOutput.results.msgKey) {
					cmdOutput = t(cmdOutput.results.msgKey, cmdOutput.results.args);
				}
				else {
					cmdOutput = JSON.stringify(cmdOutput, null, ' ');
				}
			}
			lines.push(cmdOutput);
		}

		lines = lines.join('\n');
		if (lines.length > 100000) {
			lines = lines.substr(0, 100000) + '\nTRUNCATED at 100000 chars';
		}
		setOutput(lines);

		props.updateDiagram();
	}
	
	let readCommandFile = event => {
		//Retrieve the first (and only!) File from the FileList object
		var f = event.target.files[0]; 

		if (f) {
			let r = new FileReader();
			r.onload = (e) => { 
				let contents = e.target.result;
				props.actions.doCommand(contents, callBack);
			};
			r.readAsText(f);
		} else { 
			alert("Failed to load file");
		}
	}
	
	return e(
		'div', {
			id: 'console',
		},
		e(
			'textarea',{
				id: 'console__result',
				value: output || '',
				readOnly: true
			}
		),
		e(
			'input', {
				id: 'console__input',
				value: input || '',
				placeholder: t('react:consoleReadPlaceHolder'),
				onChange: event => {
					//keeps input field in sync
					const value = event.target.value;
					setInput(value);				
				},
				onKeyPress: event => {
					if (event.key == 'Enter') {
						// watches for Enter and sends command when it see it
						props.actions.doCommand(input, callBack);
						setInput('');
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
						onChange:  readCommandFile,
					}
				),	
			),
		)
	);
}
