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
		page: [['Results:']],
		maxCount: 100,
		currentPage: 0,
		show() {
			return this.page[this.currentPage].join('\n');
		},
		push(s) {
			this.page.push([s]);
			while (this.page.length > this.maxCount) {
				this.page.shift();
			}
			this.currentPage = this.page.length - 1;
		},
		update(s) {
			this.page[this.currentPage].push(s);
		},
		scroll(nLines) {
			let n = this.currentPage + nLines;
			this.currentPage = Math.min(Math.max(n, 0), this.page.length -1);
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
				this.page.push('');
				while (this.page.length > this.maxCount) {
					this.page.shift();
				}
				this.currentPage = this.page.length - 1;
			}
		},
		scroll(nLines, input) {
			let n = this.currentPage + nLines;
			this.currentPage = Math.min(Math.max(n, 0), this.page.length -1);
			}
	},
}

const openAIValues = {
	previousResponseId: null,
	promptTemplate: ``,
	apiKey: '',
};

let inputTarget = 'Console';

/**
 * accepts command line inputs and displays result
 */
export function ConsoleView(props) {
	const [output, setOutput] = useState(consoleStacks.output.show());
	const [input, setInput] = useState('');
	const [target, setTarget] = useState(inputTarget);
	const t = props.t;
	const inputRef = React.useRef(null);
	const isMounted = React.useRef(false);
	const targetRef = React.useRef(null);

	React.useEffect(() => {
		isMounted.current = true;
		setOutput(consoleStacks.output.show());
		setTarget(inputTarget);
	
		inputRef.current?.focus();
	
		return () => {
			isMounted.current = false;
		};
	}, []);

	const pushOutput = (s) => {
		consoleStacks.output.push(s);
		if (isMounted.current) {
			setOutput(consoleStacks.output.show());
		}
	}

	const updateOutput = (s) => {
		consoleStacks.output.update(s);
		if (isMounted.current) {
			setOutput(consoleStacks.output.show());
		}
	}

	function stringifyError(error) {
		return error?.msgKey ? 
		t(error.msgKey, error.args)
	:
		t(JSON.stringify(error, null, ' '));
	}

	if (target === 'OpenAI') {
		if (!openAIValues.promptTemplate) {
			fetch('../ai/openai/APIcontext.txt').then(response => {
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				return response.text();
			})
			.then(text => {
				openAIValues.promptTemplate = text;
			}).catch(error => {
				pushOutput(`Could not fetch system prompt\n${error}`);
			});
		}
		if (!openAIValues.apiKey) {
			props.actions.doCommand(
				'/ aikey openai',
				(results) => {
					openAIValues.apiKey = results?.[0]?.results;
			});
		}
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
			if (r.error) {
				lines.push(stringifyError(r.error));
			}
			else {
				getOutput(r);
			}
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
						errorHandler(result.error);
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
				pushOutput('');
				for (const cmd of cmds) {
					updateOutput(`Command: ${cmd}`);
					await commandAction(cmd, (result) => {
						updateOutput(`=> ${result?.[0]?.results}`)
					});
				}
				props.updateDiagram();
				// props.actions.toggleConsole();
			};
			r.readAsText(f);
		} else { 
			alert("Failed to load file");
		}
	}

	const openAIChat = {
		async sendPrompt(promptText) {
			// const mock = await import("../ai/openai/mockAssistant.js");
			// return mock.runAssistant(promptText);

			const headers = {
				"Authorization": `Bearer ${openAIValues.apiKey}`,
				"Content-Type": "application/json"
			};
	
			const body = {
				model: "gpt-4o",
				input: []
			};
		
			if (!openAIValues.previousResponseId) {
				// First call → include system prompt and user prompt
				body.input.push(
					{ role: "system", content: openAIValues.promptTemplate },
					{ role: "user", content: promptText }
				);
			} else {
				// Follow-up call → reference last response, only include user correction
				body.previous_response_id = openAIValues.previousResponseId;
				body.input.push({ role: "user", content: promptText });
			}
	
			const response = await fetch("https://api.openai.com/v1/responses", {
				method: "POST",
				headers,
				body: JSON.stringify(body)
			});

			if (response.status === 429) {
				const body = await response.text();
				console.error("❌ 429 Too Many Requests", body);
				updateOutput(`❌ ${body}`);
				return;
			}
			
			const data = await response.json();
			openAIValues.previousResponseId = data.id;
			const raw = data.output[0].content[0].text;
			if (!raw) {
				updateOutput("⚠️ No assistant output found.");
				return;
			}
			// Remove code block formatting
			const clean = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
	
			try {
				const parsed = JSON.parse(clean);
				return parsed;
			} catch (err) {
				updateOutput("❌ Failed to parse assistant response:");
				updateOutput(raw);
				throw err;
			}
		},
	
		action(userPrompt, successCallback, failureCallback, retryCount = 0) {
			if (!openAIValues.apiKey) {
				pushOutput(`You need an OpenAI API key for this feature\n`+
					`Please enter "/ set openaikey <your API key>"\n`+
					`in the console before proceeding`);
				return;
			}

			pushOutput(`User: ${userPrompt}\n`);
			openAIChat.sendPrompt(userPrompt).then(parsed => {
				parsed.comments.forEach((comment) => {updateOutput(`Comment: ${comment}`)});
				updateOutput('');
				openAIChat.executeCommands(parsed.commands, userPrompt, successCallback, failureCallback, retryCount);
			}).catch(err => {
				updateOutput(`❌ Failed to parse assistant response: ${err.message}`);
			});
		},
	
		async executeCommands(commandsBlock, originalPrompt, onSuccess, onFailure, retryCount = 0) {
			const lines = Array.isArray(commandsBlock) ? commandsBlock : commandsBlock.split(/\n/).filter(l => l.trim());
	
				const runNext = async () => {
				if (lines.length === 0) {
					onSuccess('Done');
					return;
				}
				const cmd = lines.shift();
				const cmdError = async (result) => {
					const message = (typeof result === 'string') ? result : result?.message;
					updateOutput(`❌ Error in: ${cmd}\n${message}`);
					if (retryCount >= 2) {
						updateOutput("⚠️ Retry limit reached.");
						if (onFailure) onFailure(cmd, message);
						return;
					}
	
					const retryPrompt = `Original request: ${originalPrompt}\nThat command failed:\n${cmd}\nError: ${message}\nPlease fix it.`;
					function sleep(ms) {
						return new Promise(resolve => setTimeout(resolve, ms));
					}					
					await sleep(50000);
					try {
						const retry = await this.sendPrompt(retryPrompt);
						retry.comments.forEach(pushOutput);
						this.executeCommands(retry.commands, originalPrompt, onSuccess, onFailure, retryCount + 1);
					} catch (err) {
						updateOutput("❌ Assistant retry failed.");
					}
					return;
				}
	
					performCommand(cmd, async (result) => {
					if (cmd.match(/''[^']/)) {
						result.error = true;
						result.message = 'Illegal command separation';
					}

					if (result.error) {
						cmdError(result);
						return
					}
	
					if (result.v) {
						const output = result.v;
						if (typeof result === 'string') {
							updateOutput(`✅ ${cmd} =>\n ${result}`)
						}
						else {
							updateOutput(
								`✅  ${cmd} =>\n ${JSON.stringify(output)}`
							);
						}
					}
					runNext();
				}, cmdError);
			};

			runNext();
		}	
	};

	let commandAction, successCallBack, failCallBack;
	switch(target) {

		case 'Console':
			commandAction = performCommand;
			successCallBack = consoleCallBack;
			failCallBack = (error) => { pushOutput(stringifyError(error)) };
			break;

		case 'OpenAI':
			commandAction = openAIChat.action;
			successCallBack = (result) => {
				updateOutput(result);
			}
			failCallBack = (error) => {console.log(`OpenAI Fail`);}
			break;
		default:
			alert('invalid input target in console - this is a bug');
			break;
	}

	let mainElement = e(
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
		mainElement,
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
							value: target,
							ref: targetRef,
							onChange: (event) => {
								inputTarget = event.target.value;
								setTarget(event.target.value);
								inputRef.current?.focus();
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
