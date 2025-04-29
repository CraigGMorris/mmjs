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

class openAI {
	constructor() {
		this.previousResponseId = null;
		this.promptTemplate = ``;
		this.apiKey = '';
		// this.model = 'gpt-4.1';
		this.model = 'o4-mini';
		this.retryCount = 0;
		this.maxRetries = 2;
		this.resetCount = 0;
	}
}

const openAIValues = new openAI();

const claudeValues = {
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
	const [isWaiting, setIsWaiting] = useState(false);
	const t = props.t;
	const inputRef = React.useRef(null);
	const isMounted = React.useRef(false);
	const targetRef = React.useRef(null);

	React.useEffect(() => {
		isMounted.current = true;
		console.log(`isMounted: true  isWaiting: ${isWaiting}`);
		setOutput(consoleStacks.output.show());
		setTarget(inputTarget);
	
		inputRef.current?.focus();
	
		return () => {
			isMounted.current = false;
			console.log(`unmounted   isWaiting: ${isWaiting}`);
		};
	}, []);

	React.useEffect(() => {
		const textarea = document.getElementById('console__result');
		if (textarea) {
			textarea.scrollTop = textarea.scrollHeight;
		}
	}, [output]);	

	const pushOutput = (s) => {
		consoleStacks.output.push(s);
		if (isMounted.current) {
			setOutput(consoleStacks.output.show());
		}
		else {
			console.log(`missed pushOutput: ${s}`);
		}
	}

	const updateOutput = (s) => {
		consoleStacks.output.update(s);
		if (isMounted.current) {	
			setOutput(consoleStacks.output.show());
		}
		else {
			console.log(`missed updateOutput: ${s}`);
		}
	}

	function stringifyError(error) {
		return error?.msgKey ? 
		t(error.msgKey, error.args)
	:
		t(JSON.stringify(error, null, ' '));
	}

	function showCountdownTimer(delayMs, onComplete) {
		const totalSeconds = Math.ceil(delayMs / 1000);
		let secondsLeft = totalSeconds;
	
		const intervalId = setInterval(() => {
			if(isMounted.current) {
			setInput(`Waiting for rate limit: ${secondsLeft}s...`);
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
	else 	if (target === 'Claude') {
		if (!openAIValues.promptTemplate) {
			fetch('../ai/openai/APIcontext.txt').then(response => {
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				return response.text();
			})
			.then(text => {
				claudeValues.promptTemplate = text;
			}).catch(error => {
				pushOutput(`Could not fetch system prompt\n${error}`);
			});
		}
		if (!claudeValues.apiKey) {
			props.actions.doCommand(
				'/ aikey claude',
				(results) => {
					claudeValues.apiKey = results?.[0]?.results;
			});
		}
	}

	const performConsoleCommand = async(userPrompt, successCallback, failureCallback) => {
		try {
			const result = await performCommand(userPrompt);
			consoleCallBack(result);
		}
		catch(err) {
			failureCallback(err);
		};
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
	async function doCommandPromise(cmd) {
		return new Promise((resolve, reject) => {
			props.actions.doCommand(
				cmd,
				(result) => {
					// Only resolve with result if there was no error
					if (!result?.error) {
						resolve(result);
					}
					else {
						reject(result.error);
					}
				},
				(error) => {
					reject(error);
				}
			);
		});
	}

	// Wrapper for pushModel
	async function pushModelPromise(modelName) {
		return new Promise((resolve, reject) => {
			props.actions.pushModel(modelName,
				(result) => {
					// console.log('pushModelPromise: result', result);

					// Only resolve with result if there was no error
					if (!result?.error) {
						resolve(result);
					}
					else {
						reject(result.error);
					}
				},
				(error) => {
					// console.log('pushModelPromise: error', error);
					reject(error);
				}
			);
		});
	}
	
	// Wrapper for pushModel
	async function popModelPromise(modelName) {
		return new Promise((resolve, reject) => {
			props.actions.popModel(modelName,
				(result) => {
					// Only resolve with result if there was no error
					if (!result?.error) {
						resolve(result || 'popped Model');
					}
					else {
						reject(result.error);
					}
				},
				(error) => {
					reject(error);
				}
			);
		});
	}		
	
	const performCommand = async (cmd) => {
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
				model: openAIValues.model,
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

			// ⏳ Wait if less than 60 seconds since last call
			const now = Date.now();
			const last = openAIValues.lastPromptTime || 0;
			const elapsed = now - last;
			// const delay = Math.max(0, 1000 - elapsed);
			// if (delay > 0) {
			// 	// console.log(`🕒 Waiting ${Math.round(delay / 1000)}s to avoid rate limit...`);
			// 	await new Promise(resolve => {
			// 		showCountdownTimer(delay, resolve);
			// 	});
			// }
			if(isMounted.current) { setIsWaiting(true); }
			const response = await fetch("https://api.openai.com/v1/responses", {
				method: "POST",
				headers,
				body: JSON.stringify(body)
			});
			if(isMounted.current) { setIsWaiting(false); }
			openAIValues.lastPromptTime = Date.now();

			if (response.status === 429) {
				const text = await response.text();
				updateOutput("❌ 429 Too Many Requests", text);
				if (openAIValues.resetCount < 2) {
					openAIValues.resetCount++;
					updateOutput(`❌ Rate limit exceeded. Resetting assistant...`);	
					openAIValues.previousResponseId = null;
					await doCommandPromise('. dgmInfo', async (result) => {
						let dgminfo = result?.[0].results;
						try {
							dgminfo = JSON.stringify(dgminfo, null, 2);
						}
						catch (err) {
							updateOutput("❌ Failed to stringify dgminfo.");
							return;
						}
						const resetPrompt = `Rate limit reset\nCurrent model dgminfo:\n${dgminfo}`;
						await openAIChat.sendPrompt(resetPrompt);
					});
				}
				else {
					updateOutput("❌ Reset limit exceeded.");
				}
				return;
			}
			
			const data = await response.json();
			openAIValues.previousResponseId = data.id;
			const raw = data.output[1].content[0].text;	// o4-mini
			// const raw = data.output[0].content[0].text;	// gpt-4.1	
			if (!raw) {
				updateOutput("⚠️ No assistant output found.");
				return;
			}
			// Remove code block formatting
			const clean = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
	
			try {
				let parsed = JSON.parse(clean);
				updateOutput('Comments:')
				parsed?.comments?.forEach((comment) => {updateOutput(`${comment}\n`)});
				updateOutput('');
				let maxQueries = 3;
				while (parsed.query && maxQueries > 0) {
					const queryResult = await openAIChat.runQueryCommands(parsed.query);
					parsed = await openAIChat.sendPrompt(
						`Here are the results of your requested queries:\n${JSON.stringify({ queryResponse: queryResult })}`
					);
					maxQueries--;
				}
				return parsed;
			}
			catch (err) {
				updateOutput("❌ Failed to parse assistant response:");
				updateOutput(raw);
				throw err;
			}
		},

		async runQueryCommands(commands, maxRetries = 2) {
			const results = {};
		
			for (let i = 0; i < commands.length; i++) {
				let cmd = commands[i];
				updateOutput(`🟡 Running query: ${cmd}`);
		
				let result;
				let attempt = 0;
				while (attempt <= maxRetries) {
					try {
						result = await performCommand(cmd)
						updateOutput(`✅ Query result: ${cmd} => ${JSON.stringify(result)}`);
					} catch(error) {
						updateOutput(`❌ Error in query: ${cmd}\n${error.message}`);
						result = { error: error.message };
					}
					if (!result?.error) {
						results[cmd] = result;
						break;
					}

					updateOutput(`❌ Query failed (attempt ${attempt + 1}): ${result.message}`);
					attempt++;
		
					if (attempt <= maxRetries) {
						const retryPrompt = `The following query command failed:
${cmd}
Error: ${result.message}
Please suggest a corrected version. Respond ONLY with a JSON array of valid MM query commands.`;
		
						const correction = await openAIChat.sendPrompt(retryPrompt);
						try {
							const suggestions = JSON.parse(correction.output?.[0]?.content?.[0]?.text || "[]");
							if (Array.isArray(suggestions) && suggestions.length > 0) {
								updateOutput(`🔁 Assistant suggested retry: ${suggestions[0]}`);
								cmd = suggestions[0];
							} else {
								updateOutput("⚠️ Assistant did not return a valid query array. Skipping retry.");
								break;
							}
						} catch (err) {
							updateOutput("❌ Failed to parse assistant retry suggestion.");
							break;
						}
					}
				}
			}
			return results;
		},
	
		async action(userPrompt, successCallback, failureCallback) {
			if (!openAIValues.apiKey) {
				pushOutput(`You need an OpenAI API key for this feature\n`+
					`Please enter "/ aikey openai <your API key>"\n`+
					`in the console before proceeding`);
				return;
			}

			pushOutput(`User: ${userPrompt}\n`);
			try {
				openAIValues.retryCount = 0;
				const pathPrompt = `Current path: ${props.viewInfo.path}\n`;
				const parsed = await openAIChat.sendPrompt(pathPrompt + userPrompt);
				if (parsed.commands) {
					try {
						const result = await openAIChat.executeCommands(parsed.commands, userPrompt);
						if (result) {
							console.log('success: Done');
							successCallback('Done');
						}
						else {
							console.log('unexpected return');
						}
					}
					catch(err) {
						updateOutput(`❌ Error in executeCommands: ${err.message}`);
					}
				}
				else {
					successCallback('Done');
				}
			}
			catch(err) {
				updateOutput(`❌ Failed to parse assistant response: ${err.message}`);
			};
		},
	
		async executeCommands(commandsBlock, originalPrompt) {
			if (!commandsBlock) {
				updateOutput('No commands to execute');
				return false;
			}
			const lines = Array.isArray(commandsBlock) ? commandsBlock : commandsBlock.split(/\n/).filter(l => l.trim());

			const runNext = async () => {
				if (lines.length === 0) {
					return true;
				}
				const cmd = lines.shift();
				updateOutput(`Cmd: ${cmd}`);

				const cmdError = async (result) => {
					lines.length = 0;
					const message = (typeof result === 'string') ? result : JSON.stringify(result);
					updateOutput(`❌ Error in: ${cmd}\n${message}`);
					if (openAIValues.retryCount >= 2) {
						updateOutput("⚠️ Retry limit reached.");
						updateOutput(`❌ Error in: ${cmd}\n${message}`);
						return false;
					}
					openAIValues.retryCount++;
					console.log('cmdError: retryCount', openAIValues.retryCount);
	
					const retryPrompt = `Original request: ${originalPrompt}\nThat command failed:\n${cmd}\nError: ${message}\nPlease fix it. Remaining commands have been cleared.`;
					try {
						const retry = await this.sendPrompt(retryPrompt);
						return await openAIChat.executeCommands(retry.commands, originalPrompt);
					} catch (err) {
						updateOutput("❌ Assistant retry failed.");
						throw err;
					}
				}
	
				try {
					console.log('executeCommands: performCommand', cmd);
					const result = await performCommand(cmd);
					console.log('executeCommands: result', result);
					if (cmd.match(/''[^']/)) {
						result.error = true;
						result.message = 'Illegal command separation';
					}

					if (result.error) {
						return await cmdError(result);
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
					const runNextResult = await runNext();
					console.log('executeCommands: runNextResult', runNextResult);
					return runNextResult;
				} catch(error) {
					return cmdError(error);
				}
			};

			const result = await runNext();
			console.log('executeCommands: result', result);
			return result;
		}
	};

	
	// const claudeChat = {
	// 	async sendPrompt(promptText) {
	// 		// const mock = await import("../ai/anthropic/mockAssistant.js");
	// 		// return mock.runAssistant(promptText);
	
	// 		const headers = {
	// 			"x-api-key": `${claudeValues.apiKey}`,
	// 			"Content-Type": "application/json",
	// 			"anthropic-version": "2023-06-01",
	// 			"anthropic-dangerous-direct-browser-access": "true"
	// 		};
	
	// 		const body = {
	// 			model: "claude-3-7-sonnet-20250219",
	// 			max_tokens: 4000
	// 		};
		
	// 		if (!claudeValues.conversationHistory) {
	// 			// First call → initialize conversation history with system prompt and user prompt
	// 			claudeValues.conversationHistory = [
	// 				{ role: "user", content: promptText }
	// 			];
				
	// 			// Add system prompt as a separate field, not part of messages array
	// 			body.system = claudeValues.promptTemplate;
	// 		} else {
	// 			// Follow-up call → add new user message to existing conversation
	// 			claudeValues.conversationHistory.push({ role: "user", content: promptText });
	// 		}
			
	// 		// Always send the full conversation history
	// 		body.messages = claudeValues.conversationHistory;
	
	// 		const response = await fetch("https://api.anthropic.com/v1/messages", {
	// 			method: "POST",
	// 			headers,
	// 			body: JSON.stringify(body)
	// 		});
	
	// 		if (response.status === 429) {
	// 			const body = await response.text();
	// 			console.error("❌ 429 Too Many Requests", body);
	// 			updateOutput(`❌ ${body}`);
	// 			return;
	// 		}
			
	// 		const data = await response.json();
			
	// 		// Store the assistant's response in conversation history for context
	// 		if (data.content && data.content.length > 0) {
	// 			claudeValues.conversationHistory.push({
	// 				role: "assistant",
	// 				content: data.content[0].text
	// 			});
	// 		}
			
	// 		const raw = data.content?.[0]?.text;
	// 		if (!raw) {
	// 			updateOutput("⚠️ No assistant output found.");
	// 			return;
	// 		}
	// 		// Remove code block formatting
	// 		const clean = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
	
	// 		try {
	// 			const parsed = JSON.parse(clean);
	// 			return parsed;
	// 		} catch (err) {
	// 			updateOutput("❌ Failed to parse assistant response:");
	// 			updateOutput(raw);
	// 			throw err;
	// 		}
	// 	},
	
	// 	action(userPrompt, successCallback, failureCallback, retryCount = 0) {
	// 		if (!claudeValues.apiKey) {
	// 			pushOutput(`You need an Anthropic API key for this feature\n`+
	// 				`Please enter "/ aikey claude <your API key>"\n`+
	// 				`in the console before proceeding`);
	// 			return;
	// 		}
	
	// 		pushOutput(`User: ${userPrompt}\n`);
	// 		claudeChat.sendPrompt(userPrompt).then(parsed => {
	// 			parsed.comments.forEach((comment) => {updateOutput(`Comment: ${comment}`)});
	// 			updateOutput('');
	// 			claudeChat.executeCommands(parsed.commands, userPrompt, successCallback, failureCallback, retryCount);
	// 		}).catch(err => {
	// 			updateOutput(`❌ Failed to parse assistant response: ${err.message}`);
	// 		});
	// 	},
	
	// 	async executeCommands(commandsBlock, originalPrompt, onSuccess, onFailure, retryCount = 0) {
	// 		const lines = Array.isArray(commandsBlock) ? commandsBlock : commandsBlock.split(/\n/).filter(l => l.trim());
	
	// 		const runNext = async () => {
	// 			if (lines.length === 0) {
	// 				onSuccess('Done');
	// 				return;
	// 			}
	// 			const cmd = lines.shift();
	// 			updateOutput(`Cmd: ${cmd}`);
	// 			const cmdError = async (result) => {
	// 				const message = (typeof result === 'string') ? result : result?.message;
	// 				updateOutput(`❌ Error in: ${cmd}\n${message}`);
	// 				if (retryCount >= 2) {
	// 					updateOutput("⚠️ Retry limit reached.");
	// 					if (onFailure) onFailure(cmd, message);
	// 					return;
	// 				}
	
	// 				const retryPrompt = `Original request: ${originalPrompt}\nThat command failed:\n${cmd}\nError: ${message}\nPlease fix it.`;
	// 				try {
	// 					const retry = await this.sendPrompt(retryPrompt);
	// 					retry.comments.forEach(updateOutput);
	// 					this.executeCommands(retry.commands, originalPrompt, onSuccess, onFailure, retryCount + 1);
	// 				} catch (err) {
	// 					updateOutput("❌ Assistant retry failed.");
	// 				}
	// 				return;
	// 			}
	
	// 			performCommand(cmd, async (result) => {
	// 				if (result.error) {
	// 					cmdError(result);
	// 					return
	// 				}
	
	// 				if (result.v) {
	// 					const output = result.v;
	// 					if (typeof result === 'string') {
	// 						updateOutput(`✅ ${cmd} =>\n ${result}`)
	// 					}
	// 					else {
	// 						updateOutput(
	// 							`✅  ${cmd} =>\n ${JSON.stringify(output)}`
	// 						);
	// 					}
	// 				}
	// 				runNext();
	// 			}, cmdError);
	// 		};

	// 		runNext();
	// 	}
	// };

	let commandAction, successCallBack, failCallBack;
	switch(target) {
		case 'Console':
			commandAction = performConsoleCommand;
			successCallBack = consoleCallBack;
			failCallBack = (error) => { pushOutput(stringifyError(error)) };
			break;

		case 'OpenAI': {
			commandAction = openAIChat.action;
			successCallBack = (result) => {
				updateOutput(result);
				props.updateDiagram(true);
					// props.actions.toggleConsole();
				}
			failCallBack = (error) => {
				console.log(`OpenAI Fail`);
				updateOutput(`❌ OpenAI Failed: ${error}`);
				props.updateDiagram(true);
			}
			break;
		}
		
	// 	case 'Claude': {
	// 		commandAction = claudeChat.action;
	// 		successCallBack = (result) => {
	// 			updateOutput(result);
	// 		}
	// 		failCallBack = (error) => {console.log(`Claude Fail`);}
	// 	}
	// 		break;			

		default:
			alert('invalid input target in console - this is a bug');
			break;
	}

	let inputPlaceholder = isWaiting ? '🤖 Thinking...' : t('react:consoleReadPlaceHolder');

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
						// e('option', { value: 'Claude' }, 'Claude'),
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
