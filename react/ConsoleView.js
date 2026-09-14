// @ts-check
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
		page: [['...']],
		maxCount: 100,
		currentPage: 0,
		show() {
			return this.page[this.currentPage].join('\n');
		},
		push(/** @type {any} */ s) {
			this.page.push([s]);
			while (this.page.length > this.maxCount) {
				this.page.shift();
			}
			this.currentPage = this.page.length - 1;
		},
		update(/** @type {any} */ s) {
			this.page[this.currentPage].push(s);
		},
		scroll(/** @type {any} */ nLines) {
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
		push(/** @type {any} */ s) {
			if (this.page.length < 2 || this.page[this.page.length-2] !== s) {
				this.page[this.page.length-1] = s;
				this.page.push('');
				while (this.page.length > this.maxCount) {
					this.page.shift();
				}
				this.currentPage = this.page.length - 1;
			}
		},
		/**
		 * @param {any} nLines
		 * @param {any} [input]
		 */
		scroll(nLines, input) {
			let n = this.currentPage + nLines;
			this.currentPage = Math.min(Math.max(n, 0), this.page.length -1);
			}
	},
}

class aiClass {
	constructor() {
		/** @type {any[]} */
		this.messages = [];
		this.promptTemplate = ``;
		this.apiKey = '';
		this.model = '';
		this.url = "https://openrouter.ai/api/v1/chat/completions";
		this.retryCount = 0;
		this.maxRetries = 2;
		this.resetCount = 0;
		/** @type {number} */
		this.lastPromptTime = 0;
	}
}

const aiValues = new aiClass();

let inputTarget = 'AI';

/**
 * accepts command line inputs and displays result
 * @param {import('./MMApp.js').ViewProps} props
 */
export function ConsoleView(props) {
	const t = props.t;
	const [output, setOutput] = useState(consoleStacks.output.show());
	const [input, setInput] = useState('');
	const [target, setTarget] = useState(inputTarget);
	const [inputPlaceholder, setInputPlaceholder] = useState(t('react:consoleReadPlaceHolder'));
	/** @type {React.MutableRefObject<any>} */ const inputRef = React.useRef(null);
	const isMounted = React.useRef(false);
	/** @type {React.MutableRefObject<any>} */ const targetRef = React.useRef(null);

	React.useEffect(() => {
		isMounted.current = true;
		setOutput(consoleStacks.output.show());
		setTarget(inputTarget);	
		inputRef.current?.focus();
	
		const pollInterval = setInterval(() => {
			if (!isMounted.current) return;
			const latest = consoleStacks.output.show();
			setOutput(prev => (prev !== latest ? latest : prev));
		}, 1000); // adjust interval if needed

		return () => {
			isMounted.current = false;
			clearInterval(pollInterval);
		};
	}, []);

	React.useEffect(() => {
		const textarea = document.getElementById('console__result');
		if (textarea) {
			textarea.scrollTop = textarea.scrollHeight;
		}
	}, [output]);	

	const pushOutput = (/** @type {any} */ s) => {
		consoleStacks.output.push(s);
		if (isMounted.current) {
			setOutput(consoleStacks.output.show());
		}
	}

	/**
	 * @param {any} s
	 * @param {any} [extra]
	 */
	const updateOutput = (s, extra) => {
		consoleStacks.output.update(s);
		if (isMounted.current) {	
			setOutput(consoleStacks.output.show());
		}
	}

	function stringifyError(/** @type {any} */ error) {
		return error?.msgKey ? 
		t(error.msgKey, error.args)
	:
		t(JSON.stringify(error, null, ' '));
	}

	function showCountdownTimer(/** @type {any} */ delayMs, /** @type {any} */ onComplete) {
		const totalSeconds = Math.ceil(delayMs / 1000);
		let secondsLeft = totalSeconds;
	
		const intervalId = setInterval(() => {
			if(isMounted.current) {
			setInput(t('react:consoleWaitingForRateLimit', { seconds: secondsLeft }));
			}
			secondsLeft--;
	
			if (secondsLeft < 0) {
				clearInterval(intervalId);
				if(isMounted.current) {
					setInput("");
				}
				if (typeof onComplete === "function") {
					onComplete();
				}
			}
		}, 1000);
	}
	

	if (target === 'AI') {
		if (!aiValues.promptTemplate) {
			// Determine the base path from the current location
			const basePath = window.location.pathname.split('/').slice(0, -1).join('/');	
			fetch(`${basePath}/ai/openai/APIcontext.txt`).then(response => {
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				return response.text();
			})
			.then(text => {
				aiValues.promptTemplate = text;
			}).catch(error => {
				pushOutput(t('react:consoleCouldNotFetchSystemPrompt', { error }));
			});
		}
		if (!aiValues.apiKey) {
			props.actions.doCommand(
				'/ aikey',
				(results) => {
					const apiKey = results?.[0]?.results;
					const parts = apiKey.split(' ');
					aiValues.apiKey = parts[0];
					if (parts.length > 1) {
						aiValues.url = parts[1];
					}
				});
		}

		if (!aiValues.model) {
			props.actions.doCommand(
				'/ aimodel',
				(results) => {
					const modelName = results?.[0]?.results;
					aiValues.model = modelName || '~google/gemini-3.7-flash';
				});
		}
	}

	const performConsoleCommand = async(/** @type {any} */ userPrompt, /** @type {any} */ successCallback, /** @type {any} */ failureCallback) => {
		try {
			const result = await performCommand(userPrompt);
			consoleCallBack(result);
		}
		catch(err) {
			failureCallback(err);
		};
	}


	/** function consoleCallBack - called when the worker completes console command
	 * @param {any} cmds
	 */
	let consoleCallBack = (/** @type {any} */ cmds) => {
		/** @type {any} */ let lines = [];
		const getOutput = (/** @type {any} */ r) => {
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

		(/** @type {any} */ (props.updateDiagram))();
	}

	// Wrapper for doCommand
	/**
	 * @param {any} cmd
	 * @param {any} [extraCallback]
	 */
	async function doCommandPromise(cmd, extraCallback) {
		return new Promise((resolve, reject) => {
			props.actions.doCommand(
				cmd,
				(/** @type {any} */ result) => {
					// Only resolve with result if there was no error
					if (!result?.error) {
						resolve(result);
					}
					else {
						reject(result.error);
					}
				},
				(/** @type {any} */ error) => {
					reject(error);
				}
			);
		});
	}

	// Wrapper for pushModel
	async function pushModelPromise(/** @type {any} */ modelName) {
		return new Promise((resolve, reject) => {
			props.actions.pushModel(modelName,
				(/** @type {any} */ result) => {
					// console.log('pushModelPromise: result', result);

					// Only resolve with result if there was no error
					if (!result?.error) {
						resolve([result]);
					}
					else {
						reject(result.error);
					}
				},
				(/** @type {any} */ error) => {
					// console.log('pushModelPromise: error', error);
					reject(error);
				}
			);
		});
	}
	
	// Wrapper for popModel
	/**
	 * @param {any} [modelName]
	 */
	async function popModelPromise(modelName) {
		return new Promise((resolve, reject) => {
			try {
				const newPath = props.actions.popModel(modelName);
				(/** @type {any} */ (props.updateDiagram))(true);
				resolve([newPath]);
			} catch(error) {
				reject(error);
			}
		});
	}		
	
	const performCommand = async (/** @type {any} */ cmd) => {
		if (cmd.trim().match(/^\/\s+popmodel/)) {   	
			return await popModelPromise();
		}
		else if (cmd.trim().match(/^\/\s+pushmodel\s+[A-Za-z][A-Za-z0-9_]+/)) {
			const parts = cmd.trim().split(/\s+/);
			const modelName = parts[2];
			return await pushModelPromise(modelName);
		}
		else {
			return await doCommandPromise(cmd);
		}
	}
	
	let readCommandFile = (/** @type {any} */ event) => {
		//Retrieve the first (and only!) File from the FileList object
		var f = event.target.files[0]; 

		if (f) {
			let r = new FileReader();
			r.onload = async (/** @type {any} */ e) => { 
				const contents = /** @type {string} */ (e.target.result);
				const cmds = contents.split(`\n'''`);
				pushOutput('');
				for (const cmd of cmds) {
					updateOutput(t('react:consoleCommand', { cmd:cmd }));
					await (/** @type {any} */ (commandAction))(cmd, (/** @type {any} */ result) => {
						updateOutput(t('react:consoleCommandResult', { result: result?.[0]?.results }))
					});
				}
				(/** @type {any} */ (props.updateDiagram))();
			};
			r.readAsText(f);
		} else { 
			alert(t('react:consoleFailedToLoadFile'));
		}
	}

	const aiChat = {
		async sendPrompt(/** @type {any} */ promptText) {
			const headers = {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${aiValues.apiKey}`
			};

			if (aiValues.messages.length === 0 && aiValues.promptTemplate) {
				aiValues.messages.push(
					{ role: "system", content: aiValues.promptTemplate }
				);
			}
			aiValues.messages.push({ role: "user", content: promptText });
	
			// console.log('model: ', aiValues.model);
			// console.log('url: ', aiValues.url);
			
			const body = {
				model: aiValues.model,
				temperature: 0.2,
				messages: aiValues.messages
			};

			const now = Date.now();
			const last = aiValues.lastPromptTime || 0;
			const elapsed = now - last;
			if(isMounted.current) { setInputPlaceholder(t('react:consoleThinking')); }
			const response = await fetch(aiValues.url, {
				method: "POST",
				headers,
				body: JSON.stringify(body)
			});
			aiValues.lastPromptTime = Date.now();

			if (response.status === 429) {
				if(isMounted.current) { setInputPlaceholder(t('react:consoleReadPlaceHolder')); }
				const text = await response.text();
				updateOutput(t('react:consoleTooManyRequests'), text);
				if (aiValues.resetCount < 2) {
					aiValues.resetCount++;
					updateOutput(t('react:consoleRateLimitExceeded'));	
					aiValues.messages = [];
					await doCommandPromise('. dgmInfo', async (/** @type {any} */ result) => {
						let dgminfo = result?.[0].results;
						try {
							dgminfo = JSON.stringify(dgminfo, null, 2);
						}
						catch (err) {
							updateOutput(t('react:consoleFailedToStringify'));
							return;
						}
						const resetPrompt = `Rate limit reset\nCurrent model dgminfo:\n${dgminfo}`;
						await aiChat.sendPrompt(resetPrompt);
					});
				}
				else {
					updateOutput(t('react:consoleResetLimitExceeded'));
				}
				return;
			}
			const data = await response.json();
			if(isMounted.current) { setInputPlaceholder(t('react:consoleReadPlaceHolder')); }
			const raw = data?.choices?.[0]?.message?.content;
			if (!raw) {
				console.log(`aiChat: no assistant output ${JSON.stringify(data)}`);
				updateOutput(t('react:consoleNoAssistantOutput', { msg: JSON.stringify(data) }));
				return;
			}
			aiValues.messages.push({ role: "assistant", content: raw });
			// Remove code block formatting
			const clean = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
	
			try {
				let parsed = JSON.parse(clean);
				updateOutput(t('react:consoleComments'))
				parsed?.comments?.forEach((/** @type {any} */ comment) => {updateOutput(`${comment}\n`)});
				updateOutput('');
				let maxQueries = 3;
				while (parsed.query && maxQueries > 0) {
					const queryResult = await aiChat.runQueryCommands(parsed.query);
					parsed = await aiChat.sendPrompt(
						`Here are the results of your requested queries:\n${JSON.stringify({ queryResponse: queryResult })}`
					);
					maxQueries--;
				}
				return parsed;
			}
			catch (err) {
				updateOutput("❌ sendPrompt: failed to parse assistant response:");
				updateOutput(raw);
				throw err;
			}
		},

		async runQueryCommands(/** @type {any} */ commands, maxRetries = 2) {
			/** @type {any} */ const results = {};
		
			for (let i = 0; i < commands.length; i++) {
				let cmd = commands[i];
				updateOutput(t('react:consoleRunningQuery', { cmd }));
		
				let result;
				let attempt = 0;
				while (attempt <= maxRetries) {
					try {
						result = await performCommand(cmd)
						updateOutput(t('react:consoleQueryResult', { cmd:cmd, result: JSON.stringify(result) }));
					} catch(/** @type {any} */ error) {
						updateOutput(t('react:consoleErrorInQuery', { cmd:cmd, error: error.message }));
						result = { error: error.message };
					}
					if (!result?.error) {
						results[cmd] = result;
						break;
					}

					updateOutput(t('react:consoleQueryFailed', { attempt: attempt + 1, message: result.message }));
					attempt++;
		
					if (attempt <= maxRetries) {
						const retryPrompt = `The following query command failed:
${cmd}
Error: ${result.message}
Please suggest a corrected version. Respond ONLY with a JSON array of valid MM query commands.`;
		
						const correction = await aiChat.sendPrompt(retryPrompt);
						try {
							let suggestions = [];
							if (Array.isArray(correction)) {
								suggestions = correction;
							} else if (correction && typeof correction === 'object') {
								if (Array.isArray(correction.query)) {
									suggestions = correction.query;
								} else if (Array.isArray(correction.commands)) {
									suggestions = correction.commands;
								}
							}
							if (Array.isArray(suggestions) && suggestions.length > 0) {
								updateOutput(t('react:consoleAssistantSuggestedRetry', { suggestion: suggestions[0] }));
								cmd = suggestions[0];
							} else {
								updateOutput(t('react:consoleNoValidQueryArray'));
								break;
							}
						} catch (err) {
							updateOutput(t('react:consoleFailedToParseRetry'));
							break;
						}
					}
				}
			}
			return results;
		},
	
		async action(/** @type {any} */ userPrompt, /** @type {any} */ successCallback, /** @type {any} */ failureCallback) {
			if (!aiValues.apiKey) {
				pushOutput(t('react:consoleNeedAIApiKey'));
				return;
			}

			pushOutput(t('react:consoleUserPrompt', { prompt: userPrompt }));
			try {
				aiValues.retryCount = 0;
				const pathPrompt = t('You are currently in model ', { path: props.viewInfo.path });
				const parsed = await aiChat.sendPrompt(pathPrompt + userPrompt);
				if (parsed.commands) {
					try {
						const result = await aiChat.executeCommands(parsed.commands, userPrompt);
						if (result) {
							console.log(t('react:consoleSuccessDone'));
							successCallback(t('react:consoleSuccessDone'));
						}
						else {
							console.log(t('react:consoleUnexpectedReturn'));
							failureCallback(t('react:consoleCommandFailed'));
						}
					}
					catch(/** @type {any} */ err) {
						updateOutput(t('react:consoleErrorInExecuteCommands'));
						failureCallback(err.message);
					}
				}
				else {
					updateOutput(t('react:consoleSuccessDone'));
				}
			}
			catch(/** @type {any} */ err) {
				failureCallback(err.message);
			};
		},
	
		/**
		 * @param {any} commandsBlock
		 * @param {any} originalPrompt
		 * @returns {Promise<any>}
		 */
		async executeCommands(commandsBlock, originalPrompt) {
			if (!commandsBlock) {
				updateOutput(t('react:consoleNoCommandsToExecute'));
				return false;
			}
			const lines = Array.isArray(commandsBlock) ? commandsBlock : commandsBlock.split(/\n/).filter((/** @type {any} */ l) => l.trim());

			/** @returns {Promise<any>} */
			const runNext = async () => {
				if (lines.length === 0) {
					return true;
				}
				const cmd = lines.shift();
				updateOutput(t('react:consoleCmd', { cmd:cmd }));

				/** @param {any} result @returns {Promise<any>} */
				const cmdError = async (result) => {
					lines.length = 0;
					const message = (typeof result === 'string') ? result : JSON.stringify(result);
					updateOutput(t('react:consoleErrorInCmd', { cmd:cmd, message:message }));
					if (aiValues.retryCount >= 2) {
						updateOutput(t('react:consoleRetryLimitReached'));
						updateOutput(t('react:consoleErrorInCmd', { cmd:cmd, message:message }));
						return false;
					}
					aiValues.retryCount++;
					console.log('cmdError: retryCount', aiValues.retryCount);
	
					const retryPrompt = `Original request: ${originalPrompt}\nThat command failed:\n${cmd}\nError: ${message}\nPlease fix it. Remaining commands have been cleared.`;
					try {
						const retry = await this.sendPrompt(retryPrompt);
						return await aiChat.executeCommands(retry.commands, originalPrompt);
					} catch (err) {
						updateOutput(t('react:consoleAssistantRetryFailed'));
						throw err;
					}
				}
	
				try {
					const result = await performCommand(cmd);
					if (result.error) {
						return await cmdError(result);
					}
	
					if (result.v) {
						const output = result.v;
						if (typeof result === 'string') {
							updateOutput(t('react:consoleCmdSuccess', { cmd:cmd, result:result }))
						}
						else {
							updateOutput(t('react:consoleCmdSuccessJson', { cmd:cmd, output: JSON.stringify(output) }))
						}
					}
					const runNextResult = await runNext();
					return runNextResult;
				} catch(error) {
					return cmdError(error);
				}
			};

			const result = await runNext();
			return result;
		}
	};

	let commandAction = (/** @type {any} */ (null));
	let successCallBack = (/** @type {any} */ (null));
	let failCallBack = (/** @type {any} */ (null));
	switch(target) {
		case 'Console':
			commandAction = performConsoleCommand;
			successCallBack = consoleCallBack;
			failCallBack = (/** @type {any} */ error) => { pushOutput(stringifyError(error)) };
			break;

		case 'AI': {
			commandAction = aiChat.action;
			successCallBack = (/** @type {any} */ result) => {
				updateOutput(result);
				(/** @type {any} */ (props.updateDiagram))(true);
				props.actions.toggleConsole();
			}
			failCallBack = (/** @type {any} */ error) => {
				console.log(t('react:consoleAIFail'));
				updateOutput(t('react:consoleAIFailed', { error }));
				(/** @type {any} */ (props.updateDiagram))(true);
			}
			break;
		}
		
		default:
			alert(t('react:consoleInvalidInputTarget'));
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
				placeholder: inputPlaceholder,
				ref: inputRef,
				onChange: (/** @type {any} */ event) => {
					//keeps input field in sync
					const value = event.target.value;
					setInput(value);				
				},
				onKeyDown: (/** @type {any} */ event) => {
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
							onChange: (/** @type {any} */ event) => {
								inputTarget = event.target.value;
								setTarget(event.target.value);
								inputRef.current?.focus();
							},
						},
						e('option', { value: 'AI' }, 'AI'),
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
