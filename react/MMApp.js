'use strict';

import {MMCommandPipe} from '/mmworker/MMCommandPipe.js';
import {ConsoleView} from './ConsoleView.js';
import {Diagram} from './Diagram.js';
import {UnitsView, UserUnitsView, UnitSetsView, UnitSetView} from './UnitsView.js';

const e = React.createElement;

/**
 * Enum for view types.
 * @readonly
 * @enum {string}
 */
const ViewType = Object.freeze({
	diagram: 0,
	info: 1,
	twoPanes: 2
});

/**
 * @class MMApp
 * the main Math Minion window
 * @member {MMCommandPipe} pipe - pipe to worker
 * @member {method[]} actions
 * methods passed to components
 * @member {Object} infoViews
 * classes of info views used to construct the react component appearing in the info view
 * @member {string[]} undoStack;
 * @member {string[]} redoStack;
 */
export class MMApp extends React.Component {
	constructor(props) {
		super(props);
		this.pipe = new MMCommandPipe();
		this.actions = {
			doCommand: this.doCommand.bind(this),
			pushView: this.pushView.bind(this),
			popView: this.popView.bind(this),
			setUpdateCommands: this.setUpdateCommands.bind(this),
			updateViewState: this.updateViewState.bind(this)
		};

 		this.infoViews = {
			'console': ConsoleView,
			'units': UnitsView,
			'userunits': UserUnitsView,
			'unitsets': UnitSetsView,
			"unitset": UnitSetView
		}

		// information need to generate an information view component
		let initialInfoState = {
			viewKey: 'console',
			title: 'react:consoleTitle',
			path: '',
			stackIndex: 0,
			updateCommands: '',
			updateResults: [],
		}

		this.undoStack = [];
		this.redoStack = [];

		// calc pane style
		const allow2Pane = document.documentElement.clientWidth >= 640;

		this.state = {
			/** @desc infoStack keeps the information necessary to render all the info views pushed */
			infoStack: [initialInfoState],
			dgmState: {
				dragType: null,
				dragSelection: null,
				selectionBox: null,
				translate: {x: 0, y: 0},
				scale: 1.0,				
			},
			allow2Pane: allow2Pane,
			viewType: allow2Pane ? ViewType.twoPanes : ViewType.diagram
		}

		this.diagram = React.createRef();

		this.setDgmState = this.setDgmState.bind(this);
		this.setInfoState = this.setInfoState.bind(this);


		this.doCommand = this.doCommand.bind(this);
		this.updateDiagram = this.updateDiagram.bind(this);
		this.handleButtonClick = this.handleButtonClick.bind(this);
		this.popView = this.popView.bind(this);
		this.pushView = this.pushView.bind(this);
	}

	componentDidMount() {
		window.addEventListener('resize', (e) => {
			document.body.style.height = `${document.documentElement.clientHeight-15}px`;
			const allow2Pane = document.documentElement.clientWidth >= 640;
			this.setState({
				allow2Pane: allow2Pane,
				viewType: allow2Pane ? ViewType.twoPanes : ViewType.diagram
			});
		});
	}

	/**
	 * @method setDgmState
	 * @param {Function} f (prevState) => newState
	 */
	setDgmState(f) {
		if (typeof f === 'function') {
			this.setState((state) => {
				return {dgmState: Object.assign(this.state.dgmState, f(state.dgmState))};
			});
		}
		else {
			this.setState({dgmState: Object.assign(this.state.dgmState, f)});
		}
	}

	/**
	 * @method setInfoState
	 * @param stackNumber
	 * @param {Function} f (prevState) => newState
	 */
	setInfoState(stackNumber, f) {
		const key = `infoState${stackNumber}`;
		if (typeof f === 'function') {
			this.setState((state) => {
				const oldInfoState = state[key] || {};
				let newInfoState = Object.assign(oldInfoState,f(state[key]));
				let newState = {};
				newState[key] = newInfoState;
				return newState;
			});
		}
		else {
			let newState = {};
			newState[key] = f;
			this.setState(newState);
		}
	}

	/**
	 * @method errorAlert
	 * @param {String} msg
	 */
	errorAlert(msg) {
		let s = `${this.props.t('mmcmd:error')}\n${msg}`;
		alert(s);
	}

	/**
	 * @method warningAlert
	 * @param {String} msg
	 */
	warningAlert(msg) {
		let s = `${this.props.t('mmcmd:warning')}\n${msg}`;
		alert(s);
	}

	/**
	 * @method doCommand - sends command to worker
	 * @param {string} cmd
	 * @param {function} callBack - (cmds[]) => {}
	 */
	doCommand(cmd, callBack) {
		this.pipe.doCommand(cmd, (results) => {
			let error = results.error;
			let warning;
			if (!error) {
				for (let result of results) {
					if (result.error) {
						error = result.error;
						break;
					}
					if (!warning && result.warning) {
						warning = result.warning;
					}
					if (!warning) {
						if (result.undo) {
							if (result.expression && result.expression.startsWith("undo ")) {
								this.redoStack.push(result.undo);
							}
							else {
								if (!result.expression || !result.expression.startsWith("redo ")) {
									this.redoStack = [];
								}
									this.undoStack.push(result.undo);
							}
						}
					}
				}
			}
			let stringify = (msg) => {
				let s = this.props.t(msg.msgKey, msg.args);
				if (msg.child) {
					s += '\n' + stringify(msg.child);
				}
				return s;
			}

			if (error) {
				if (error.msgKey) {
					this.errorAlert(stringify(error));
				}
				else {
					this.errorAlert(error);
				}
			}
			else if (warning) {
				if (warning.msgKey) {
					this.warningAlert(stringify(warning));
				}
				else {
					this.warningAlert(warning);
				}
			}
			if (callBack) {
				callBack(results);
			}
		});
	}

	/** @method pushView
	 * pushes the creation information for a new info view onto the infoStack
	 * @param {string} viewKey - key to view class in infoViews
	 * @param {string} title
	 * @param	{string} path - command path to object to display (if applicable)
	 */
	pushView(viewKey, title, path) {
		let newInfoState = {
			viewKey: viewKey,
			title: (title ? title : ''),
			path: (path ? path : ''),
			stackIndex: this.state.infoStack.length,
			updateCommands: '',			// commands used to update the view state
			updateResults: []		// result of doCommand on the updateCommands
		};
		this.setState((state) => {
			let stack = state.infoStack;
			stack.push(newInfoState);
			return {infoStack: stack};
		})
	}

	/** @method updateViewState
	 * @param {Number} stackIndex = info stack position of view
	 * call doCommand with updateCommands to update th info view state
	 */
	updateViewState(stackIndex) {
		let stack = this.state.infoStack;
		if (stackIndex < stack.length) {
			let top = stack[stackIndex];
			if (top.updateCommands) {
				this.doCommand(top.updateCommands, (cmds) => {
					top.updateResults = cmds;
					this.setState({infoStack: stack});
				});
			}
			else {
				this.setState({infoStack: stack});
			}
		}
	}

	/**
	 * @method updateDiagram
	 */
	updateDiagram() {
		if (this.diagram.current) {
			this.diagram.current.getModelInfo();
		}
	}

	/** @method popView
	 * if more than one thing on info stack, it pops the last one
	 */
	popView() {
		let stack = this.state.infoStack;
		if (stack.length) {
			stack.pop();
			this.setInfoState(stack.length, {});
			this.updateViewState(stack.length-1);
		}
	}

	/** @method setUpdateCommands
	 * @param {Number} stackIndex - index of view in infoStack
	 * @param {string} commands - commands to be run to update state
	 */
	setUpdateCommands(stackIndex, commands) {
		let stack = this.state.infoStack;
		if (stackIndex < stack.length) {
			let top = stack[stack.length-1];
			this.doCommand(commands, (cmds) => {
				top.updateCommands = commands;
				top.updateResults = cmds;
				this.setState({infoStack: stack});
			});
		}
	}

	handleButtonClick(event) {
		let parts = event.target.value.split(' ');
		switch (parts[0]) {
			case 'undo':
				const undo = this.undoStack.pop();
				if (undo) {
					this.doCommand('undo ' + undo, (results) => {
						this.updateDiagram();
					});
				}
				break;
			case 'redo':
				const redo = this.redoStack.pop();
				if (redo) {
					this.doCommand('redo ' + redo, (results) => {
						this.updateDiagram();
					});
				}
				break;
			case 'expand':
				this.setState((state) => {
					switch (state.viewType) {
						case ViewType.twoPanes:
							return {viewType: ViewType.info};

						case ViewType.diagram:
							return {viewType: (state.allow2Pane) ? ViewType.twoPanes : ViewType.info};

						case ViewType.info:
							return {viewType: (state.allow2Pane) ? ViewType.twoPanes : ViewType.diagram}
					}
				})
				break;
			default:
				this.pushView(parts[0], parts[1], parts[3], );
				break;
		}
	}

	render() {
		console.log(`body height ${document.documentElement.clientHeight}`);
		let t = this.props.t;
		let previousTitle = '';
		let title = '';
		let infoStack = this.state.infoStack;
		let infoView = null;
		let infoNav = null;
		const viewType = this.state.viewType;
		let diagramHeight = document.documentElement.clientHeight-15;
		if (viewType !== ViewType.diagram) {
			let i = infoStack.length-1;
			previousTitle = i > 0 ? infoStack[i-1].title : '';
			let viewInfo = this.state.infoStack[i];
			let infoState = this.state[`infoState${i}`] || {};
			title = viewInfo.title;
			infoView = e('div', {
					className: 'mmapp-info-content',
				},
				e(this.infoViews[viewInfo.viewKey], {
					className: 'mmapp-' + viewInfo.viewKey.toLowerCase(),
					actions: this.actions,
					viewInfo: viewInfo,
					updateDiagram: this.updateDiagram,
					stackNumber: i,
					infoState: infoState,
					setInfoState: this.setInfoState,
					t: t
				})
			);
			infoNav = e('div', {
				className: 'mmapp-info-nav',
				},
				e('div',{
					className: 'mmapp-info-navback clickable',
					onClick: this.popView
				}, previousTitle ? '< ' + t(previousTitle) : ''),
				e('div',{
					className: 'mmapp-info-title'
				}, t(title))				
			);
		}
		else {
			diagramHeight -= 80;
		}

		let diagram = null;
	
		if (viewType !== ViewType.info) {
			diagram = e(Diagram, {
				ref: this.diagram,
				infoWidth: infoView ? 320 : 0,
				dgmState: this.state.dgmState,
				diagramHeight: diagramHeight,
				setDgmState: this.setDgmState,
				doCommand: this.doCommand
			});
		}

		let expandText = 'Expand'; //'⇤';
		if (viewType === ViewType.info) {
			expandText = 'Dgm';
		}
		else if (viewType === ViewType.diagram) {
			expandText = 'Info';
		}

		const infoTools = e('div', {className: 'mmapp-info-tools'},
			e('button', {
				id:'mmapp-expand-button',
				value:'expand',
				onClick: this.handleButtonClick
				},
				expandText
			),
			e('button', {
				id:'mmapp-undo-button',
				value:'undo',
				onClick: this.handleButtonClick
				},
				'Undo'
			),
			e('button', {
				id:'mmapp-redo-button',
				value:'redo',
				onClick: this.handleButtonClick
				},
				'Redo'
			),
			e('button', {
					id:'mmapp-unit-button',
					value:'units react:unitsTitle /units',
					onClick: this.handleButtonClick
				},
				t('react:unitButtonValue')
			),
			e('button', {
					id:'mmapp-console-button',
					value:'console react:consoleTitle',
					onClick: this.handleButtonClick
				},
				t('react:consoleButtonValue')
			),
		);

		let wrapper;
		switch (viewType) {
			case ViewType.twoPanes:
				wrapper = e('div',{
					id: 'mmapp-wrapper-twopane',
					style: {gridTemplateColumns: '1fr 320px'},
				},
				e('div', {
						className: 'mmapp-diagram',
						style: {gridArea: 'diagram'}
					},
					diagram
				),
				infoNav,
				infoView,
				infoTools,
				);
				break;

			case ViewType.diagram:
				wrapper = e('div', {
					id: 'mmapp-wrapper-onepane',
				},
				e('div', {
						className: 'mmapp-diagram-single',
						style: {gridArea: 'nav / 1 / info / 1'}
					},
					diagram
				),
				infoTools,
				);
				break;	
				
			case ViewType.info:
				wrapper = e('div',{
					id: 'mmapp-wrapper-onepane',
				},
				infoNav,
				infoView,
				infoTools,
				);
			break;
		}

		return wrapper;
	}
}