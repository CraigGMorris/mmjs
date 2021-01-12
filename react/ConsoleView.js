/*
	This file is part of Math Minion, a javascript based calculation program
	Copyright 2021, Craig Morris

	Math Minion is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Math Minion is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with Math Minion.  If not, see <https://www.gnu.org/licenses/>.
*/
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
		const getOutput = (r) => {
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
		for (let r of cmds) {
			getOutput(r);
		}

		if (cmds.error) {
			getOutput(cmds.error);
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
