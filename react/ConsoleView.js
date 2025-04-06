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

const consoleStacks = {
	output: {
		stack: ['Results:'],
		maxCount: 100,
		currentFrame: 0,
		show() {
			return this.stack[this.currentFrame];
		},
		push(s) {
			consoleStacks.push(this,s)
		},
		scroll(nLines) {
			consoleStacks.scroll(this, nLines);
		}
	},
	input: {
		stack: [''],
		maxCount: 100,
		currentFrame: 0,
		show() {
			return this.stack[this.currentFrame];
		},
		push(s) {
			if (this.stack.length < 2 || this.stack[this.stack.length-2] !== s) {
				this.stack[this.stack.length-1] = s;
				consoleStacks.push(this,'');
			}
		},
		scroll(nLines) {
			consoleStacks.scroll(this, nLines);
		}
	},
	push(stack, s) {
		stack.stack.push(s);
		while (stack.stack.length > stack.maxCount) {
			stack.stack.shift();
		}
		stack.currentFrame = stack.stack.length - 1;
	},
	scroll(stack, nLines) {
		let n = stack.currentFrame + nLines;
		stack.currentFrame = Math.min(Math.max(n, 0), stack.stack.length -1);
	}

}

/**
 * accepts command line inputs and displays result
 */
export function ConsoleView(props) {
	const [output, setOutput] = useState(consoleStacks.output.show());
	const [input, setInput] = useState('');
	const [view, setView] = useState('OpenAI');
	const t = props.t;
	const inputRef = React.useRef(null);

	React.useEffect(() => {
		if (view === 'Console') {
			inputRef.current.focus();
		}
	}, []);

	const pushOutput = (s) => {
		consoleStacks.output.push(s)
		setOutput(consoleStacks.output.show());
	}

	/** function consoleCallBack - called when the worker completes console command
	 * @param {MMCommand[]} cmds
	 */
	let consoleCallBack = cmds => {
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
		pushOutput(lines);

		props.updateDiagram();
	}

	// Wrapper for doCommand
	function doCommandPromise(cmd, callBack) {
		return new Promise((resolve) => {
			props.actions.doCommand(cmd, (result) => {
				resolve(callBack(result));
			});
		});
	}
	
	const performCommand = async (cmd, callBack) => {
		if (cmd.trim().match(/^\/\s+popmodel/)) {
			props.actions.popModel()
		}
		else if (cmd.trim().match(/^\/\s+pushmodel\s+[A-Za-z][A-Za-z0-9_]+/)) {
			const parts = cmd.trim().split(/\s+/);
			const modelName = parts[2];
			props.actions.pushModel(modelName);
		}
		else {
			await doCommandPromise(cmd, callBack);
		}
	}

	let commandAction;

	switch(view) {
		case 'OpenAI':
			commandAction = (cmd, callBack) => {

			}
	}

	
	let readCommandFile = event => {
		//Retrieve the first (and only!) File from the FileList object
		var f = event.target.files[0]; 

		if (f) {
			let r = new FileReader();
			r.onload = async (e) => { 
				const contents = e.target.result;
				const cmds = contents.split(`\n'''`);
				for (const cmd of cmds) {
					await performCommand(cmd, () => {});
				}
				props.updateDiagram();
				props.actions.toggleConsole();
			};
			r.readAsText(f);
		} else { 
			alert("Failed to load file");
		}
	}

	let viewElement = e(
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
			'textarea', {
				id: 'console__input',
				value: input || '',
				placeholder: t('react:consoleReadPlaceHolder'),
				ref: inputRef,
				onChange: event => {
					//keeps input field in sync
					const value = event.target.value;
					setInput(value);				
				},
				onKeyDown: event => {
					if (event.code == 'Enter' && !event.shiftKey) {
						event.preventDefault();
						if (input) {
							// watches for Enter and sends command when it see it
							performCommand(input, consoleCallBack);
							consoleStacks.input.push(input);
							setInput('');
						}
					}
					else if (event.code === 'ArrowUp') {
						event.stopPropagation();
						event.preventDefault();
						if (event.shiftKey) {
							// change results frame
							consoleStacks.output.scroll(-1);
							setOutput(consoleStacks.output.show());
						}
						else {
							// scroll through command history	
							consoleStacks.input.scroll(-1);
							setInput(consoleStacks.input.show());		
						}
					}
					else if (event.code === 'ArrowDown') {
						event.stopPropagation();
						event.preventDefault();					
						if (event.shiftKey) {
							// change results frame
							consoleStacks.output.scroll(1);
							setOutput(consoleStacks.output.show());
						}
						else {
							consoleStacks.input.scroll(1)
							setInput(consoleStacks.input.show())
						}
					}
				}
			}
		)
	);
	
	return e(
		'div', {
			id: 'console__main',
		},
		viewElement,
		e(
			'div', {
				id: 'console__footer',
			},
			e(
				'div', {
					id: 'console__toggle'
				},
				e(
					'select', {
							value: view,
							onChange: (event) => {
								setView(event.target.value);
							},
						},
						e('option', { value: 'OpenAI' }, 'OpenAI'),
						e('option', { value: 'Console' }, 'Console')
				)
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
			),
			e(
				'div', {
					id: 'console__spare'
				}
			)
		)
	);
}
