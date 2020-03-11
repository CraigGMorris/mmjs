'use strict';

import {MMCommandPipe} from '/mmworker/MMCommandPipe.js';
import {ConsoleView} from './ConsoleView.js';
import {SessionsView} from './SessionsView.js';
import {Diagram} from './Diagram.js';
import {UnitsView, UserUnitsView, UnitSetsView, UnitSetView} from './UnitsView.js';
import {ModelView} from './ModelView.js';
import {ExpressionView} from './ExpressionView.js';
import {MatrixView} from './MatrixView.js';
import {FormulaEditor} from './FormulaView.js';

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;
const useCallback = React.useCallback;

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

// {MMCommandPipe} pipe - pipe to worker
const pipe = new MMCommandPipe();

// {Integer} tag to ensure correct callback is used with doCommand
let callBackId = 1;

// {Array} commandCallBacks - a Map keyed by and id so callbacks are called in correct order
const commandCallBacks = new Map();

// {Array} dgmStateStack - keeps diagram state when model is pushed over it
let dgmStateStack = [];

// information need to generate initial root view component
const initialInfo = {
	title: 'root',
	path: '/.root',
	stackIndex: 0,
	updateCommands: '',
	updateResults: [],
	viewKey: 'Model',
};

// stacks for undo and redo
let undoStack = [];
let redoStack = [];

// infoStack keeps the information necessary to render all the info views pushed 
let infoStack = [initialInfo];

/**
 * @class ErrorBoundary
 * slightly modified boiler plate from react
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
		//logErrorToMyService(error, errorInfo);
		console.log(`error:\n${error}\nerrorInfo:\n${errorInfo}`);
  }

  render() {
    if (this.state.hasError) {
			// You can render any custom fallback UI
			if (this.props.handleBoundraryError) {
				this.props.handleBoundraryError();
				this.state = { hasError: false };
			}
      return e('h1', {}, 'Something went wrong');
    }

    return this.props.children; 
  }
}

/**
 * MMApp
 * the main Math Minion window
 */
export function MMApp(props) {
	let t = props.t;

	/**
	 * errorAlert
	 * @param {String} msg
	 */
	const errorAlert = (msg) => {
		let s = `${props.t('mmcmd:error')}\n${msg}`;
		alert(s);
	}

	/**
	 * warningAlert
	 * @param {String} msg
	 */
	const warningAlert = (msg) => {
		let s = `${props.t('mmcmd:warning')}\n${msg}`;
		alert(s);
	}

	// {Object} infoViews - classes of info views used to construct the react component appearing in the info view
	const infoViews = {
		'console': ConsoleView,
		'sessions': SessionsView,
		'units': UnitsView,
		'userunits': UserUnitsView,
		'unitsets': UnitSetsView,
		'unitset': UnitSetView,
		'formulaEditor': FormulaEditor,
		'Model': ModelView,
		'Expression': ExpressionView,
		'Matrix': MatrixView,
	}

	// information need to generate an console view component
	let consoleInfo = {
		title: 'react:consoleTitle',
		path: '',
		stackIndex: 0,
		updateCommands: '',
		updateResults: [],
		viewKey: 'console',
	};

	// diagram state variables
	const [dgmState, setDgmState] = useState({
		dragType: null,
		dragSelection: null,
		selectionBox: null,
		translate: {x: 0, y: 0},
		scale: 1.0,				
	});
	
	// calc pane style
	const twoPane = document.documentElement.clientWidth >= 640;
	const [allow2Pane, setAllow2Pane] = useState(twoPane);

	const [viewType, setViewType] = useState(twoPane ? ViewType.twoPanes : ViewType.diagram);

	const [viewInfo, setViewInfo] = useState(initialInfo);

	const diagramRef = React.useRef(null);

	useEffect(() => {
		const setSize = () => {
			const docElement = document.documentElement;
			const docHeight = docElement.clientHeight;
			const docWidth = docElement.clientWidth;
			document.body.style.height = `${docHeight-16}px`;
			document.body.style.width = `${docWidth-16}px`;
			const twoPane = docWidth >= 640;
			setAllow2Pane(twoPane);
			setViewType(twoPane ? ViewType.twoPanes : ViewType.diagram);
		};
		setSize();
		window.addEventListener('resize', setSize);
		return () => {
			window.removeEventListener('resize', setSize);
		}
	}, []);

	/** resetInfoStack
	 * @param {string} rootName
	 * clears all views - called when new case loaded
	 */
	const resetInfoStack = useCallback((rootName) => {
		const infoState = {
			title: rootName,
			path: `/.${rootName}`,
			stackIndex: 0,
			updateCommands: '',
			updateResults: [],
			viewKey: 'Model',
		};
		infoStack = [infoState];
		setViewInfo(infoState);
	});

	/**
	 * updateDgmState
	 * @param {Function} f (prevState) => newState
	 */
	const updateDgmState = useCallback((f) => {
		let newState;
		if (typeof f === 'function') {
			newState = {...dgmState, ...f(dgmState)};
		}
		else {
			newState = {...dgmState, ...f};
		}
		// console.log(`newState drag ${newState.dragType}`);
		setDgmState(newState);
	});

	/**
	 * doCommand - sends command to worker
	 * @param {string} cmd
	 * @param {function} callBack - (cmds[]) => {}
	 */
	const doCommand = useCallback((cmd, callBack) => {
		commandCallBacks.set(callBackId, callBack);
		let cmdObject = {cmdString: cmd, id: callBackId++};
		pipe.doCommand(cmdObject, (results) => {
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
								redoStack.push(result.undo);
							}
							else {
								if (!result.expression || !result.expression.startsWith("redo ")) {
									redoStack = [];
								}
									undoStack.push(result.undo);
							}
						}
					}
				}
			}
			let stringify = (msg) => {
				let s = props.t(msg.msgKey, msg.args);
				if (msg.child) {
					s += '\n' + stringify(msg.child);
				}
				return s;
			}

			if (error) {
				if (error.msgKey) {
					errorAlert(stringify(error));
				}
				else {
					errorAlert(error);
				}
			}
			else if (warning) {
				if (warning.msgKey) {
					warningAlert(stringify(warning));
				}
				else {
					warningAlert(warning);
				}
			}
			if (results.id) {
				const savedCallBack = commandCallBacks.get(results.id);
				commandCallBacks.delete(results.id);
				if (savedCallBack) {
					savedCallBack(results);
				}
			}
		});
	});

	/** pushView
	 * pushes the creation information for a new info view onto the infoStack
	 * @param {string} viewKey - key to view class in infoViews
	 * @param {string} title
	 * @param	{Object} options - options to append to infoState
	 */
	const pushView = useCallback((viewKey, title, options = {}) => {
		let newInfoState = {
			title: (title ? title : ''),
			path: '',
			stackIndex: infoStack.length,
			updateCommands: '',			// commands used to update the view state
			updateResults: [],		// result of doCommand on the updateCommands
			viewKey: viewKey,
			...options
		};
		infoStack.push(newInfoState);
		setViewInfo(newInfoState);
		setViewType(viewType === ViewType.diagram ? ViewType.info : viewType);
	});

	/** popView
	 * if more than one thing on info stack, it pops the last one
	 */
	const popView = useCallback(() => {
		if (infoStack.length > 1) {
			const oldTop = infoStack.pop();
			switch (oldTop.viewKey) {
				case 'Model':
					doCommand('/ popmodel', (cmds) => {
						if (dgmStateStack.length) {
							setDgmState(dgmStateStack.pop());
						}
						updateView(infoStack.length-1, false);
					});
					break;

				case 'console':
					consoleInfo = oldTop;
					updateView(infoStack.length-1);
					break;
				
				default:
					updateView(infoStack.length-1);
					break;
			}
			setViewInfo(infoStack[infoStack.length-1]);
		}
	});

	/**
	 * pushModel
	 * pushes model named on to the diagram and infoview
	 * @param {String} modelName 
	 */
	const pushModel = useCallback((modelName) => {
		doCommand(`/ pushmodel ${modelName}`, (cmds) => {
			dgmStateStack.push({...dgmState});
			const path = cmds[0].results;
			if (cmds.length) {
				const modelInfoState = {
					title: modelName,
					path: path,
					stackIndex: infoStack.length,
					updateCommands: '',
					updateResults: [],
					viewKey: 'Model',
				}
				while (infoStack.length > 1 && infoStack[infoStack.length - 1].viewKey !== 'Model') {
					infoStack.pop();
				}
				infoStack.push(modelInfoState);
				setViewInfo(modelInfoState);
				updateDiagram(true);
			}
		});
	});

	/**
	 * popModel
	 * on the diagram and infoview
	 */
	const popModel = useCallback(() => {
		while (infoStack.length > 1 && infoStack[infoStack.length-1].viewKey !== 'Model') {
			const oldTop = infoStack.pop();
			if (oldTop.viewKey === 'console') {
				consoleInfo = oldTop;
			}
		}
		popView();
	});


	/**
	 * pushTool
	 * pushes tool named on to the infoview
	 * @param {String} toolName
	 * @param {String} toolType
	 */
	const pushTool = useCallback((toolName, toolType) => {
		let top = infoStack[infoStack.length - 1];
		while (infoStack.length > 1 && top.viewKey !== 'Model') {
			if (top.title === toolName && top.viewKey === toolType) {
				infoStack.pop();
				updateView(infoStack.length-1);
				return;
			}
			infoStack.pop();
			top = infoStack[infoStack.length - 1];
		}
		top = infoStack[infoStack.length - 1];
		const path = `${top.path}.${toolName}`;
		const updateCommand = `${path} toolViewInfo`;
		doCommand(updateCommand, (cmds) => {
			let newInfoState = {
				title: (toolName ? toolName : ''),
				path: (path ? path : ''),
				modelPath: cmds[0].results.modelPath,
				stackIndex: infoStack.length,
				updateCommands: updateCommand,			// commands used to update the view state
				updateResults: cmds,		// result of doCommand on the updateCommands
				viewKey: toolType,
			};
			infoStack.push(newInfoState);
			setViewInfo(newInfoState);
			setViewType(viewType === ViewType.diagram ? ViewType.info : viewType);
			updateDiagram();
		});
	});

	/**
	 * pushConsole
	 * pushes the console onto the info view
	 */
	const pushConsole = useCallback(() => {
		infoStack.push(consoleInfo);
		setViewInfo(consoleInfo);
		setViewType(viewType === ViewType.diagram ? ViewType.info : viewType)
	});

	/**
	 * showHelp
	 * show help for the current view
	 */
	const showHelp = useCallback(() => {
		let stackLength = infoStack.length;
		let viewKey = stackLength ? infoStack[stackLength - 1].viewKey : 'none';
		console.log(`show help ${viewKey}`);
	});

	/** updateView
	 * @param {Number} stackIndex = info stack position of view
	 * @param {Boolean} rescaleDiagram - should diagram be rescaled - default false
	 * call doCommand with updateCommands to update th info view state
	 */
	const updateView = useCallback((stackIndex, rescaleDiagram = false) => {
		if (stackIndex < infoStack.length) {
			let top = infoStack[stackIndex];
			setViewInfo(top);
			if (top.updateCommands) {
				doCommand(top.updateCommands, (cmds) => {
					top.updateResults = cmds;
					setViewInfo({...top});
					updateDiagram(rescaleDiagram);
				});
			}
			else {
				updateDiagram(rescaleDiagram);
			}
		}
	});

	/**
	 * updateDiagram
	 * @param {Boolean} rescale - should diagram be rescaled - default false
	 */
	const updateDiagram = useCallback((rescale = false) => {
		if (diagramRef.current) {
			diagramRef.current.getModelInfo(rescale);
		}
	});

	/**
	 * renameTool
	 * @param {String} path 
	 * @param {String} newName
	 * renames tool at path to newName (in same parent model)
	 */
	const renameTool = useCallback((path, newName) => {
		doCommand(`${path} renameto ${newName}`, (cmd) => {
			// fix up things in the view info to reflect the new name
			let parts = path.split('.');
			const oldName = parts.pop();
			parts.push(newName);
			const newPath = parts.join('.');
			const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const re = new RegExp(`^${escapedPath} `, 'gi');
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
			updateDiagram();
			updateView(infoStack.length-1)
		});
	});

	/** setUpdateCommands
	 * @param {Number} stackIndex - index of view in infoStack
	 * @param {string} commands - commands to be run to update state
	 */
	const setUpdateCommands = useCallback((stackIndex, commands) => {
		if (stackIndex < infoStack.length) {
			let top = infoStack[infoStack.length-1];
			doCommand(commands, (cmds) => {
				top.updateCommands = commands;
				top.updateResults = cmds;
				setViewInfo(top);
				updateView(stackIndex);
			});
		}
	});

	const handleButtonClick = useCallback((event) => {
		let parts = event.target.value.split(' ');
		switch (parts[0]) {
			case 'undo':
				const undo = undoStack.pop();
				if (undo) {
					doCommand('undo ' + undo, (results) => {
						updateDiagram();
					});
				}
				break;
			case 'redo':
				const redo = redoStack.pop();
				if (redo) {
					doCommand('redo ' + redo, (results) => {
						updateDiagram();
					});
				}
				break;
			case 'expand':
				switch (viewType) {
					case ViewType.twoPanes:
						setViewType(ViewType.info);
						break;

					case ViewType.diagram:
						setViewType(allow2Pane ? ViewType.twoPanes : ViewType.info);
						break;

					case ViewType.info:
						setViewType(allow2Pane ? ViewType.twoPanes : ViewType.diagram);
						break;
					default:
						break;
				}
				break;
			case 'console':
				pushConsole();
				break;
			default:
				pushView(parts[0], parts[1], {path: parts[2]} );
				break;
		}
	});

	// {method[]} actions - methods passed to components
	let actions = {
		doCommand: doCommand,
		pushModel: pushModel,
		popModel: popModel,
		pushTool: pushTool,
		pushView: pushView,
		popView: popView,
		resetInfoStack: resetInfoStack,
		setUpdateCommands: setUpdateCommands,
		updateView: updateView,
		updateDiagram: updateDiagram,
		renameTool: renameTool,
	};
	
	let previousTitle = '';
	let title = '';
	let infoView = null;
	let infoNav = null;
	const docElement = document.documentElement;
	const docHeight = docElement.clientHeight-16;
	const docWidth = docElement.clientWidth-16;
	const infoWidth = (viewType !== ViewType.info) ? 320 : docWidth;
	const toolHeight = 40;
	const navHeight = 40;
	const infoHeight = docHeight - navHeight - toolHeight;
	document.documentElement.style.setProperty('--info-height', `${infoHeight}px`);
	let diagramBox = {top: 9, left: 9, height: docHeight, width: docWidth - infoWidth}
	if (viewType !== ViewType.diagram) {
		let i = infoStack.length-1;
		previousTitle = i > 0 ? infoStack[i-1].title : '';
		title = viewInfo.title;
		infoView = e(
			'div', {
				id: 'info-view',
			},
			e(infoViews[viewInfo.viewKey], {
				key: viewInfo.path,
				className: 'mmapp-' + viewInfo.viewKey.toLowerCase(),
				actions: actions,
				viewInfo: viewInfo,
				infoWidth: infoWidth,
				infoHeight: infoHeight,
				updateDiagram: updateDiagram,
				stackNumber: i,
				t: t
			})
		);
		infoNav = e(
			'div', {
				id: 'info-nav',
				className: previousTitle ? 'three-column' : 'two-column',
			},
			e(
				'div',{
					id: 'info-nav__back',
					onClick: popView
				}, previousTitle ? '< ' + t(previousTitle) : ''),
			e(
				'div',{
					id: 'info-nav__title',
				},t(title)),
			e(
				'div', {
					id: 'info-nav__help',
					onClick: showHelp
				}, '?'
			)			
		);
	}
	else {
		diagramBox = {top: 9, left: 9, height: docHeight-toolHeight, width: docWidth}
	}

	let diagram = null;

	if (viewType !== ViewType.info) {
		diagram = e(Diagram, {
			t: t,
			ref: diagramRef,
			infoWidth: infoView ? infoWidth : 0,
			dgmState: dgmState,
			diagramBox: diagramBox,
			setDgmState: updateDgmState,
			actions: actions,
		});
	}

	let expandText = t('react:dgmButtonExpand');
	if (viewType === ViewType.info) {
		expandText = t('react:dgmButtonDiagram');
	}
	else if (viewType === ViewType.diagram) {
		expandText = t('react:dgmButtonInfo');
	}

	let viewKeys = new Set(infoStack.map(v => v.viewKey));		
	const infoTools = e(
		'div', {
			id: 'info-tools',
		},
		e(
			'button', {
				id:'info-tools__expand-button',
				className: 'info-tools__button',
				onClick: (event) => {
					switch (viewType) {
						case ViewType.twoPanes:
							setViewType(ViewType.info);
							break;

						case ViewType.diagram:
							setViewType(allow2Pane ? ViewType.twoPanes : ViewType.info);
							break;

						case ViewType.info:
							setViewType(allow2Pane ? ViewType.twoPanes : ViewType.diagram);
							break;
						default:
							break;
					}
				}
			},
			expandText
		),
		e('button', {
			id:'info-tools__undo-button',
			className: 'info-tools__button',
			disabled: !undoStack.length,
			onClick: (event) => {
				const undo = undoStack.pop();
				if (undo) {
					doCommand('undo ' + undo, (results) => {
						updateView(infoStack.length - 1);
						updateDiagram();
					});
				}	
			}
			},
			t('react:dgmButtonUndo')
		),
		e(
				'button', {
				id:'info-tools__redo-button',
				className: 'info-tools__button',
				disabled: !redoStack.length,
				onClick: (event) => {
					const redo = redoStack.pop();
					if (redo) {
						doCommand('redo ' + redo, (results) => {
							updateView(infoStack.length - 1);
							updateDiagram();
						});
					}
				}
			},
			t('react:dgmButtonRedo')
		),
		e(
			'button', {
				id:'info-tools__unit-button',
				className: 'info-tools__button',
				disabled: viewKeys.has('units'),
				onClick: (event) => {
					pushView('units', 'react:unitsTitle');
				}
			},
			t('react:dgmButtonUnits')
		),
		e(
			'button', {
				id:'info-tools__console-button',
				className: 'info-tools__button',
				disabled: viewKeys.has('console'),
				onClick: (event) => {
					pushConsole();
				}
			},
			t('react:dgmButtonConsole')
		),
		e(
				'button', {
				id:'info-tools__sessions-button',
				className: 'info-tools__button',
				disabled: viewKeys.has('sessions'),
				onClick: (event) => {
					pushView('sessions', 'react:sessionsTitle');
				}
			},
			t('react:dgmButtonSessions')
		),
	);

	let wrapper;
	const onePaneStyle = {
		width: `${docWidth}px`,
		gridTemplateRows: `${navHeight}px 1fr ${toolHeight}px`,
	};

	switch (viewType) {
		case ViewType.twoPanes:
			wrapper = e(
				'div',{
					id: 'mmapp__wrapper--two-pane',
					style: {
						gridTemplateColumns: `1fr ${infoWidth}px`,
						gridTemplateRows: `${navHeight}px 1fr ${toolHeight}px`,
					},
				},
				e(
					'div', {
						id: 'mmapp__diagram--two-pane',
						className: 'mmapp__diagram',
					},
					e(ErrorBoundary, {}, diagram)
				),
				infoNav,
				e(ErrorBoundary, {
					handleBoundraryError: () => {
						popView();
						alert(t('mmcmd:viewError'));
					}
				}, infoView),
				infoTools,
			);
			break;

		case ViewType.diagram:
			wrapper = e(
				'div', {
					id: 'mmapp__wrapper--one-pane',
					className: 'mmapp__wrapper--one-pane',
					style: onePaneStyle
				},
				e(
					'div', {
						id: 'mmapp__diagram--one-pane',
						className: 'mmapp__diagram',
					},
					e(ErrorBoundary, {}, diagram)
				),
				infoTools,
			);
			break;	
			
		case ViewType.info:
			wrapper = e(
				ErrorBoundary, {},
				e(
				'div', {
					id: 'mmapp__info--one-pane',
					className: 'mmapp__wrapper--one-pane',
					style: onePaneStyle,
				},
				infoNav,
				e(ErrorBoundary, {}, infoView),
				infoTools,
				)
			);
		break;
	}

	return e(ErrorBoundary, {}, wrapper);
}
