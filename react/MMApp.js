'use strict';

import {MMCommandPipe} from '/mmworker/MMCommandPipe.js';
import {ConsoleView} from './ConsoleView.js';
import {Diagram} from './Diagram.js';
import {UnitsView, UserUnitsView, UnitSetsView, UnitSetView} from './UnitsView.js';
import {ModelView} from './ModelView.js';
import {ExpressionView} from './ExpressionView.js';

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
 * @member {Array} callBackStack - makes sure callbacks are called in correct order
 * @member {Array} dgmStateStack - keeps diagram state when model is pushed over it
 * @member {method[]} actions - methods passed to components
 * @member {Object} infoViews - classes of info views used to construct the react component appearing in the info view
 * @member {string[]} undoStack;
 * @member {string[]} redoStack;
 */
export class MMApp extends React.Component {
	constructor(props) {
		super(props);
		this.pipe = new MMCommandPipe();
		this.callBackStack = [];
		this.dgmStateStack = [];
		this.actions = {
			doCommand: this.doCommand.bind(this),
			pushModel: this.pushModel.bind(this),
			popModel: this.popModel.bind(this),
			pushTool: this.pushTool.bind(this),
			pushView: this.pushView.bind(this),
			popView: this.popView.bind(this),
			setUpdateCommands: this.setUpdateCommands.bind(this),
			setViewInfoState: this.setViewInfoState.bind(this),
			updateViewState: this.updateViewState.bind(this),
			updateDiagram: this.updateDiagram.bind(this),
			renameTool: this.renameTool.bind(this),
			defaults: this.defaults.bind(this)
		};

 		this.infoViews = {
			'console': ConsoleView,
			'units': UnitsView,
			'userunits': UserUnitsView,
			'unitsets': UnitSetsView,
			'unitset': UnitSetView,
			'Model': ModelView,
			'Expression': ExpressionView
		}

		// information need to generate an console view component
		this.consoleInfo = {
			title: 'react:consoleTitle',
			path: '',
			stackIndex: 0,
			updateCommands: '',
			updateResults: [],
			viewKey: 'console',
			viewState: {},
		};

		// information need to generate initial root view component
		const initialInfoState = {
			title: 'root',
			path: '/.root',
			stackIndex: 0,
			updateCommands: '',
			updateResults: [],
			viewKey: 'Model',
			viewState: {}
		};

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

		this.doCommand = this.doCommand.bind(this);
		this.updateDiagram = this.updateDiagram.bind(this);
		this.handleButtonClick = this.handleButtonClick.bind(this);
		this.popView = this.popView.bind(this);
		this.pushView = this.pushView.bind(this);
		this.pushConsole = this.pushConsole.bind(this);
		this.setDgmState = this.setDgmState.bind(this);
		this.setViewInfoState = this.setViewInfoState.bind(this);
	}

	componentDidMount() {
		const setSize = () => {
			const docElement = document.documentElement;
			const docHeight = docElement.clientHeight;
			const docWidth = docElement.clientWidth;
			document.body.style.height = `${docHeight-16}px`;
			document.body.style.width = `${docWidth-16}px`;
			const allow2Pane = docWidth >= 640;
			this.setState({
				allow2Pane: allow2Pane,
				viewType: allow2Pane ? ViewType.twoPanes : ViewType.diagram,
			});
		};
		setSize();
		window.addEventListener('resize', setSize);
	}

	defaults() {
		return {
			styles: {
				input: {
					fontSize: '12pt',
					width: 'calc(100% - 8px)',
					paddingLeft: '3px',
					paddingRight: '3px',
					border: '0px'
				}
			},
			grid: {
				inputHeight: 30,  // px
			}
		};
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
	 * @method setViewInfoState
	 * @param stackNumber
	 * @param {Function} f (prevState) => newState | just Object
	 * this method allows included components to save their state in a stack reflecting the pushed
	 * info views.  That way the state is preserved if another view is pushed over it and can
	 * be restored when the overlaying view is popped.
	 */
	setViewInfoState(f) {
		let stack = this.state.infoStack;
		if (stack.length) {
			let top = stack[stack.length-1];
			let viewState = top.viewState;
			top.viewState = Object.assign(viewState,(typeof f === 'function') ? f(viewState) : f);
			this.setState({infoStack: stack});
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
		this.callBackStack.push(callBack);
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
			const stackedCallBack = this.callBackStack.shift();
			if (stackedCallBack) {
				stackedCallBack(results);
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
			title: (title ? title : ''),
			path: (path ? path : ''),
			stackIndex: this.state.infoStack.length,
			updateCommands: '',			// commands used to update the view state
			updateResults: [],		// result of doCommand on the updateCommands
			viewKey: viewKey,
			viewState: {},
		};
		this.setState((state) => {
			let stack = state.infoStack;
			stack.push(newInfoState);
			return {
				infoStack: stack,
				viewType: state.viewType === ViewType.diagram ? ViewType.info : state.viewType
			};
		})
	}

	/** @method popView
	 * if more than one thing on info stack, it pops the last one
	 */
	popView() {
		let stack = this.state.infoStack;
		if (stack.length > 1) {
			const oldTop = stack.pop();
			switch (oldTop.viewKey) {
				case 'Model':
					this.doCommand('/ popmodel', (cmds) => {
						if (this.dgmStateStack.length) {
							this.setState({dgmState: this.dgmStateStack.pop()});
						}
						this.updateViewState(stack.length-1, true);
					});
					break;

				case 'console':
					this.consoleInfo = oldTop;
					this.updateViewState(stack.length-1);
					break;
				
				default:
					this.updateViewState(stack.length-1);
					break;
			}
		}
	}

	/**
	 * @method pushModel
	 * pushes model named on to the diagram and infoview
	 * @param {String} modelName 
	 */
	pushModel(modelName) {
		this.doCommand(`/ pushmodel ${modelName}`, (cmds) => {
			this.dgmStateStack.push(Object.assign({}, this.state.dgmState));
			if (cmds.length) {
				const modelInfoState = {
					title: modelName,
					path: cmds[0].results,
					stackIndex: 0,
					updateCommands: '',
					updateResults: [],
					viewKey: 'Model',
					viewState: {}
				}
				let infoStack = this.state.infoStack;
				while (infoStack.length > 1 && infoStack[infoStack.length - 1].viewKey !== 'Model') {
					infoStack.pop();
				}
				infoStack.push(modelInfoState);
				this.setState({infoStack: infoStack});
				this.updateDiagram(true);
			}
		});
	}

	/**
	 * @method popModel
	 * on the diagram and infoview
	 */
	popModel() {
		let stack = this.state.infoStack;
		while (stack.length > 1 && stack[stack.length-1].viewKey !== 'Model') {
			const oldTop = stack.pop();
			if (oldTop.viewKey === 'console') {
				this.consoleInfo = oldTop;
			}
		}
		this.popView();
	}

	/**
	 * @method pushTool
	 * pushes tool named on to the infoview
	 * @param {String} toolName
	 * @param {String} toolType
	 */
	pushTool(toolName, toolType) {
		let infoStack = this.state.infoStack;
		while (infoStack.length > 1 && infoStack[infoStack.length - 1].viewKey !== 'Model') {
			infoStack.pop();
		}
		let top = infoStack[infoStack.length - 1];
		const path = `${top.path}.${toolName}`;
		const updateCommand = `${path} toolViewInfo`;
		this.doCommand(updateCommand, (cmds) => {
			let newInfoState = {
				title: (toolName ? toolName : ''),
				path: (path ? path : ''),
				stackIndex: this.state.infoStack.length,
				updateCommands: updateCommand,			// commands used to update the view state
				updateResults: cmds,		// result of doCommand on the updateCommands
				viewKey: toolType,
				viewState: {},
			};
			this.setState((state) => {
				let stack = state.infoStack;
				stack.push(newInfoState);
				return {
					infoStack: stack,
					viewType: state.viewType === ViewType.diagram ? ViewType.info : state.viewType
				};
			})
		});
	}

	/**
	 * @method pushConsole
	 * pushes the console onto the info view
	 */
	pushConsole() {
		this.setState((state) => {
			let stack = state.infoStack;
			stack.push(this.consoleInfo);
			return {
				infoStack: stack,
				viewType: state.viewType === ViewType.diagram ? ViewType.info : state.viewType
			};
		})

	}

	/** @method updateViewState
	 * @param {Number} stackIndex = info stack position of view
	 * @param {Boolean} rescaleDiagram - should diagram be rescaled - default false
	 * call doCommand with updateCommands to update th info view state
	 */
	updateViewState(stackIndex, rescaleDiagram = false) {
		let stack = this.state.infoStack;
		if (stackIndex < stack.length) {
			let top = stack[stackIndex];
			if (top.updateCommands) {
				this.doCommand(top.updateCommands, (cmds) => {
					top.updateResults = cmds;
					this.setState({infoStack: stack});
					this.updateDiagram(rescaleDiagram);
				});
			}
			else {
				this.setState({infoStack: stack});
				this.updateDiagram(rescaleDiagram);
			}
		}
	}

	/**
	 * @method updateDiagram
	 * @param {Boolean} rescale - should diagram be rescaled - default false
	 */
	updateDiagram(rescale = false) {
		if (this.diagram.current) {
			this.diagram.current.getModelInfo(rescale);
		}
	}

	/**
	 * @method renameTool
	 * @param {String} path 
	 * @param {String} newName
	 * renames tool at path to newName (in same parent model)
	 */
	renameTool(path, newName) {
		this.doCommand(`${path} renameto ${newName}`, (cmd) => {
			// fix up things in the view info to reflect the new name
			let parts = path.split('.');
			const oldName = parts.pop();
			parts.push(newName);
			const newPath = parts.join('.');
			const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const re = new RegExp(`^${escapedPath} `, 'gi');
			let infoStack = this.state.infoStack;
			for (let i = 0; i < infoStack.length; i++) {
				let viewInfo = infoStack[i];
				if (viewInfo.path === path) {
					viewInfo.path = newPath;
					viewInfo.updateCommands = viewInfo.updateCommands.replace(re, newPath + ' ');
					if (viewInfo.title === oldName) {
						viewInfo.title = newName;
					}
					infoStack[i] = viewInfo;
				}
			}
			this.setState({infoStack: infoStack});
			this.updateDiagram();
			this.updateViewState(infoStack.length-1)
		});
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
			case 'console':
				this.pushConsole();
				break;
			default:
				this.pushView(parts[0], parts[1], parts[3], );
				break;
		}
	}

	render() {
		let t = this.props.t;
		let previousTitle = '';
		let title = '';
		let infoStack = this.state.infoStack;
		let infoView = null;
		let infoNav = null;
		const viewType = this.state.viewType;
		const docElement = document.documentElement;
		const docHeight = docElement.clientHeight-16;
		const docWidth = docElement.clientWidth-16;
		console.log(`docWidth ${docWidth}`);
		const infoWidth = (viewType !== ViewType.info) ? 320 : docWidth;
		const toolHeight = 40;
		const navHeight = 40;
		const infoHeight = docHeight - navHeight - toolHeight;
		let diagramBox = {top: 9, left: 9, height: docHeight, width: docWidth - infoWidth}
		if (viewType !== ViewType.diagram) {
			let i = infoStack.length-1;
			previousTitle = i > 0 ? infoStack[i-1].title : '';
			let viewInfo = this.state.infoStack[i];
			title = viewInfo.title;
			infoView = e('div', {
					style: {
						height: '100%',
						gridArea: 'info'
					},
				},
				e(this.infoViews[viewInfo.viewKey], {
					key: viewInfo.path,
					className: 'mmapp-' + viewInfo.viewKey.toLowerCase(),
					actions: this.actions,
					viewInfo: viewInfo,
					infoWidth: infoWidth,
					infoHeight: infoHeight,
					updateDiagram: this.updateDiagram,
					stackNumber: i,
					t: t
				})
			);
			infoNav = e('div', {
				style: {
					gridArea: 'nav',
					display: 'grid',
					gridTemplateColumns: previousTitle ? '1fr 2fr' : '0px 1fr',
					gridTemplateRows: '1fr',
					gridTemplateAreas: `"back title"`,
					alignItems: 'center',
					backgroundColor: 'rgb(243,243,243)',
					borderBottom: 'solid 1px black'
				},
				},
				e('div',{
					style: {
						gridArea: 'back',
						marginLeft: '10px',
						color: 'blue'
					},
					onClick: this.popView
				}, previousTitle ? '< ' + t(previousTitle) : ''),
				e('div',{
					style: {
						gridArea: 'title',
						justifySelf: 'center'
					}
				}, t(title))				
			);
		}
		else {
			diagramBox = {top: 9, left: 9, height: docHeight-toolHeight, width: docWidth}
		}

		let diagram = null;
	
		if (viewType !== ViewType.info) {
			diagram = e(Diagram, {
				ref: this.diagram,
				infoWidth: infoView ? infoWidth : 0,
				dgmState: this.state.dgmState,
				diagramBox: diagramBox,
				setDgmState: this.setDgmState,
				actions: this.actions,
			});
		}

		let expandText = t('react:dgmButtonExpand');
		if (viewType === ViewType.info) {
			expandText = t('react:dgmButtonDiagram');
		}
		else if (viewType === ViewType.diagram) {
			expandText = t('react:dgmButtonInfo');
		}

		const infoButtonStyle = (area) => {
			return {
				gridArea: area,
				padding: '0',
				width: '100%',
				background: 'transparent',
				border: '0',
				fontSize: '10pt',
				color: 'blue'
			}
		};
		const infoTools = e('div', {
				style: {
					gridArea: 'infotools',
					display: 'grid',
					gridTemplateColumns: 'repeat(5, 1fr)',
					gridTemplateRows: '1fr',
					gridTemplateAreas: `"expand sessions undo redo units"`,
					justifyTtems: 'center',
					alignItems: 'center',
					borderTop: 'solid 1px black'
				}
			},
			e('button', {
				id:'mmapp-expand-button',
				style: infoButtonStyle('expand'),
				value:'expand',
				onClick: this.handleButtonClick
				},
				expandText
			),
			e('button', {
				id:'mmapp-undo-button',
				style: infoButtonStyle('undo'),
				value:'undo',
				onClick: this.handleButtonClick
				},
				t('react:dgmButtonUndo')
			),
			e('button', {
				id:'mmapp-redo-button',
				style: infoButtonStyle('redo'),
				value:'redo',
				onClick: this.handleButtonClick
				},
				t('react:dgmButtonRedo')
			),
			e('button', {
					id:'mmapp-unit-button',
					style: infoButtonStyle('units'),
					value:'units react:unitsTitle /units',
					onClick: this.handleButtonClick
				},
				t('react:dgmButtonUnits')
			),
			e('button', {
					id:'mmapp-console-button',
					style: infoButtonStyle('sessions'),
					value:'console react:consoleTitle',
					onClick: this.handleButtonClick
				},
				t('react:dgmButtonConsole')
			),
		);

		let wrapper;
		const onePaneStyle = {
			fontSize: '1em',
			height: '100%',
			width: `${docWidth}px`,
			display: 'grid',
			gridTemplateColumns: '1fr',
			gridTemplateRows: `${navHeight}px 1fr ${toolHeight}px`,
			gridTemplateAreas: `"nav"
				"info"
				"infotools"`,
			backgroundColor: 'rgb(243,243,243)'
		};

		switch (viewType) {
			case ViewType.twoPanes:
				wrapper = e('div',{
					id: 'mmapp-wrapper-twopane',
					style: {
						gridTemplateColumns: `1fr ${infoWidth}px`,
						fontSize: '1em',
						height: '100%',
						width: '100%',
						display: 'grid',
						gridTemplateColumns: `1fr ${infoWidth}px`,
						gridTemplateRows: `${navHeight}px 1fr ${toolHeight}px`,
						gridTemplateAreas: `"diagram nav"
							"diagram info"
							"diagram infotools"`,
						backgroundColor: 'rgb(243,243,243)'
					},
				},
				e('div', {
						className: 'mmapp-diagram',
						style: {
							gridArea: 'diagram',
							backgroundColor: 'rgb(238,255,238)',
							borderRight: '1px solid'
						}
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
					style: onePaneStyle
				},
				e('div', {
						style: {
							gridArea: 'nav / 1 / info / 1',
						}
					},
					diagram
				),
				infoTools,
				);
				break;	
				
			case ViewType.info:
				wrapper = e('div',{
					style: onePaneStyle,
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

/**
 * @class ToolNameField
 * common field for tool name in tool info views
 */
export class ToolNameField extends React.Component {
	constructor(props) {
		super(props);
		let name;
		if (this.props.viewInfo.viewState.toolName) {
			name = this.props.viewInfo.viewState.toolName;
		}
		else {
			const pathParts = this.props.viewInfo.path.split('.');
			name = pathParts[pathParts.length - 1];
		}
		this.props.actions.setViewInfoState({toolName: name});
		this.handleChange = this.handleChange.bind(this);
		this.handleKeyPress = this.handleKeyPress.bind(this);
	}

	/** @method handleChange
	 * keeps input field in sync
	 * @param {Event} event
	 */
  handleChange(event) {
		const value = event.target.value;  // event will be null in handler
		this.props.actions.setViewInfoState({toolName: value});
	}
	
	/** @method handleKeyPress
	 * watches for Enter and sends command when it see it
	 * @param {Event} event
	 */
	handleKeyPress(event) {
		if (event.key == 'Enter') {
			const path = this.props.viewInfo.path;
			const newName = this.props.viewInfo.viewState.toolName;
			this.props.actions.renameTool(path, newName);
		}
	}

	render() {
		let t = this.props.t;
		const inputHeight = `${this.props.actions.defaults().grid.inputHeight}px`;
		return e('input', {
			style: this.props.actions.defaults().styles.input,
			value: this.props.viewInfo.viewState.toolName || '',
			placeholder: t('react:toolNamePlaceHolder'),
			onChange: this.handleChange,
			onKeyPress: this.handleKeyPress
		});
	}
}
