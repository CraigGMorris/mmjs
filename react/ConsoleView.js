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
		page: ['Results:'],
		maxCount: 100,
		currentPage: 0,
		show() {
			return this.page[this.currentPage];
		},
		push(s) {
			consoleStacks.push(this,s)
		},
		update(s) {
			this.page[this.currentPage] += s;
		},
		scroll(nLines) {
			consoleStacks.scroll(this, nLines);
		}
	},
	input: {
		page: [''],
		maxCount: 100,
		currentPage: 0,
		show() {
			return this.page[this.currentPage];
		},
		push(s) {
			if (this.page.length < 2 || this.page[this.page.length-2] !== s) {
				this.page[this.page.length-1] = s;
				consoleStacks.push(this,'');
			}
		},
		scroll(nLines) {
			consoleStacks.scroll(this, nLines);
		}
	},
	push(field, s) {
		field.page.push(s);
		while (field.page.length > field.maxCount) {
			field.page.shift();
		}
		field.currentPage = field.page.length - 1;
	},
	scroll(field, nLines) {
		let n = field.currentPage + nLines;
		field.currentPage = Math.min(Math.max(n, 0), field.page.length -1);
	}
}

const pendingOutput = [];

const openAIHistory = {
	chatHistory: [],
	promptTemplate: `You are an assistant for the Math Minion CLI. Only output valid MM commands.`,

	init() {
		openAIHistory.chatHistory = [{ role: "system", content: openAIChat.promptTemplate }];
	},

	pushHistory(role, content) {
		openAIHistory.chatHistory.push({ role, content });
	},
};


/**
 * accepts command line inputs and displays result
 */
export function ConsoleView(props) {
	const [output, setOutput] = useState(consoleStacks.output.show());
	const [input, setInput] = useState('');
	const [view, setView] = useState('Console');
	const t = props.t;
	const inputRef = React.useRef(null);
	const isMounted = React.useRef(false);

	React.useEffect(() => {
		inputRef.current.focus();
	}, []);

	React.useEffect(() => {
		isMounted.current = true;

		// flush pending output if any
		if (pendingOutput.length > 0) {
			pendingOutput.forEach(s => consoleStacks.output.push(s));
			setOutput(consoleStacks.output.show());
			pendingOutput.length = 0;
		}
	
		inputRef.current?.focus();
	
		return () => {
			isMounted.current = false;
		};
	}, []);

	const pushOutput = (s) => {
		if (isMounted.current) {
			consoleStacks.output.push(s);
			setOutput(consoleStacks.output.show());
		} else {
			pendingOutput.push(s);
		}
	}

	function stringifyError(error) {
		return error?.msgKey ? 
		t(error.msgKey, error.args)
	:
		t(JSON.stringify(error, null, ' '));
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
				else {
					cmdOutput = stringifyError(cmdOutput.results)
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
	function doCommandPromise(cmd, callBack, errorHandler) {
		return new Promise((resolve, reject) => {
			props.actions.doCommand(
				cmd,
				(result) => {
					// Only resolve with callBack if there was no error
					if (!result?.error) {
						resolve(callBack(result));
					}
					else {
						// if result has error, treat as handled and resolve without calling callBack
						resolve();
					}
				},
				errorHandler ?
					(error) => {
						errorHandler(error);
						resolve();
					}
					: null
			);
		});
	}
	
	const performCommand = async (cmd, callBack, errorHandler) => {
		if (cmd.trim().match(/^\/\s+popmodel/)) {
			props.actions.popModel();
			callBack(`popped Model`);
		}
		else if (cmd.trim().match(/^\/\s+pushmodel\s+[A-Za-z][A-Za-z0-9_]+/)) {
			const parts = cmd.trim().split(/\s+/);
			const modelName = parts[2];
			props.actions.pushModel(modelName, callBack, errorHandler);
		}
		else {
			await doCommandPromise(cmd, callBack, errorHandler);
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
					await commandAction(cmd, () => {});
				}
				props.updateDiagram();
				props.actions.toggleConsole();
			};
			r.readAsText(f);
		} else { 
			alert("Failed to load file");
		}
	}

	const openAIChat = {
		outputs: [],
		async sendPrompt(promptText) {
			const mock = await import("../ai/openai/mockAssistant.js");
			return mock.runAssistant(promptText);	
			/*
			openAIChat.pushHistory("user", promptText);
			const response = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${YOUR_API_KEY}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					model: "gpt-4",
					messages: openAIChat.chatHistory,
					temperature: 0.3
				})
			});
		const data = await response.json();
		let parsed;
		try {
			parsed = JSON.parse(data.choices[0].message.content);
			if (!Array.isArray(parsed.commands)) throw new Error("Missing 'commands'");
			if (!Array.isArray(parsed.comments)) parsed.comments = [];
		} catch (err) {
			pushOutput("⚠️ Assistant response not in expected JSON format.");
			pushOutput(data.choices[0].message.content);
			throw err;
		}
		this.pushHistory("assistant", JSON.stringify(parsed));
		return parsed;
			*/
		},
	
		action(userPrompt, successCallback, failureCallback, retryCount = 0) {
			openAIChat.outputs = [];
			openAIChat.sendPrompt(userPrompt).then(parsed => {
				parsed.comments.forEach((comment) => {openAIChat.outputs.push(comment)});
				openAIChat.executeCommands(parsed.commands, userPrompt, successCallback, failureCallback, retryCount);
			}).catch(err => {
				pushOutput(`❌ Failed to parse assistant response: ${err.message}`);
			});
		},
	
		async executeCommands(commandsBlock, originalPrompt, onSuccess, onFailure, retryCount = 0) {
			const lines = Array.isArray(commandsBlock) ? commandsBlock : commandsBlock.split(/\n/).filter(l => l.trim());
	
			const runNext = async () => {
				if (lines.length === 0) {
					onSuccess(openAIChat.outputs.join('\n'));
					// pushOutput(openAIChat.outputs.join('\n'));
					return;
				}
				const cmd = lines.shift();
				performCommand(cmd, async (result) => {	
					if (result) {
						if (typeof result === 'string') {
							openAIChat.outputs.push(`✅ ${cmd} =>\n ${result}`)
						}
						else {
							openAIChat.outputs.push(
								`✅  ${cmd} =>\n ${JSON.stringify(result[0].results)}`
							);
						}
					}
					// if (onSuccess) {
					// 	onSuccess(cmd, result[0]?.results);
					// }
					runNext();
				}, async (error) => {
					const message = error;
					openAIChat.outputs.push(`❌ Error in: ${cmd}\n${message}`);
					if (retryCount++ >= 2) {
						openAIChat.outputs.push("⚠️ Too many errors. Aborting.");
						if (onFailure) onFailure(cmd, message);
						return;
					}

					const retryPrompt = `Original request: ${originalPrompt}\nThat command failed:\n${cmd}\nError: ${message}\nPlease fix it.`;
					openAIHistory.pushHistory("user", retryPrompt);
					try {
						const retry = await openAIChat.sendPrompt(retryPrompt);
						retry.comments.forEach((comment) => {openAIChat.outputs.push(comment)});
						console.log(retry);
						this.executeCommands(retry.commands, originalPrompt, onSuccess, onFailure, retryCount + 1);
					}catch (err) {
            openAIChat.outputs.push("❌ Assistant retry failed.");
          }
					return;
				});
			};
	
			runNext();
		}
		
	};

	let commandAction, successCallBack, failCallBack;
	switch(view) {

		case 'Console':
			commandAction = performCommand;
			successCallBack = consoleCallBack;
			failCallBack = (error) => { pushOutput(stringifyError(error)) };
			break;

		case 'OpenAI':
			commandAction = openAIChat.action;
			successCallBack = (result) => {
				pushOutput(result);
			}
			failCallBack = (error) => {console.log(`OpenAI Fail`);}
			break;
		default:
			alert('invalid view in console - this is a bug');
			break;
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
							commandAction(input, successCallBack, failCallBack);
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
