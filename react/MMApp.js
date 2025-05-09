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

import {MMCommandPipe} from '../mmworker/MMCommandPipe.js';
import {ConsoleView} from './ConsoleView.js';
import {ClipboardView} from './Clipboard.js';
import {SessionsView} from './SessionsView.js';
import {Diagram} from './Diagram.js';
import {UnitsView, UserUnitsView, UnitSetsView, UnitSetView} from './UnitsView.js';
import {ModelView} from './ModelView.js';
import {ExpressionView} from './ExpressionView.js';
import {MatrixView} from './MatrixView.js';
import {DataTableView} from './DataTableView.js';
import {SolverView} from './SolverView.js';
import {OdeView} from './OdeView.js';
import {OptimizerView} from './OptimizerView.js';
import {IteratorView} from './IteratorView.js';
import {GraphView} from './GraphView.js';
import {FormulaEditor} from './FormulaView.js';
import {HtmlPageView} from './HtmlPageView.js';
import {ButtonView} from './ButtonView.js';
import {MenuView} from './MenuView.js';

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;
const useCallback = React.useCallback;
const useRef = React.useRef;

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

// time value used to avoid multiple alerts from same user operation
let lastErrorTime = 0;

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

	// eslint-disable-next-line no-unused-vars
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
//				this.setState({ hasError: false });
			}
      return e(
				'div', {},
				e('h3', {}, 'Uh oh, something went wrong'),
				e('span', {},
					'Please ',
					e('a', {
						href: './help/somethingwrong.html',
						target: '_blank',
					}, 'click here'),
					' for information on how to recover'
				),
			)
    }

    return this.props.children; 
  }
}

/**
 * MMFormatValue
 * @param {Number | String} v 
 * @param {String} format 
 * @returns {String}
 */
export function MMFormatValue(v, format) {
	if (typeof v === 'string') {
		return v;
	}
	else if (typeof v === 'number') {
		if (format) {
			let leadingPadChar = ' ';
			const parts = format.split('.');	// split on decimal point, if there is one
			let width = 14;
			let prefix = '';  // character before wisth for date format
			format = parts[parts.length - 1];
			if (parts.length && parts[0].length) {
				prefix = parts[0].substring(0,1);
				const widthField = parts[0].replace(/[^\d]+/,'');
				if (widthField.length) {
					width = parseInt(widthField);
					if (widthField.startsWith('0')) {
						leadingPadChar = '0';
					}
				}
			}
			let precision = parseInt(format);
			let precisionDefined = true;
			if (isNaN(precision) || precision < 0 || precision > 36) {
				precision = 8;
				precisionDefined = false;
			}
			let s = ''
			const type = format.slice(-1)  // last character should be format type
			switch (type) {
				case 'c':
				case 'f':
					s = v.toFixed(precision);
					if (type === 'c') {
						const [whole, decimals] = s.split('.');
						s = whole.replace(/\B(?=(\d{3})+(?!\d))/g,',') + (decimals ? '.' + decimals : '');
					}
					break;
				case 'e':
					s = v.toExponential(precision);
					break;
				case 'r':
				case 'x':
					s = `${precision}r` + v.toString(precision);
					break;
				case '/':
				case '-':
					// Create a Date object
					const sParts = v.toFixed(6).padStart(15,'0').split('.');
					const sTime = sParts[1] // skip time colons so string fits in table box
					const regex = prefix === 'd' || prefix === 'm' ?
						/(\d\d)(\d\d)(\d\d\d\d)/ :
						/(\d\d\d\d)(\d\d)(\d\d)/;
					const sDate = sParts[0].replace(regex, `$1${type}$2${type}$3`);
					if (!precisionDefined) {
						precision = 0;
					}
					s = sDate + ' ' + sTime.substring(0, precision);
					break;
			}
			if (width > s.length) {
				s = s.padStart(width, leadingPadChar);
			}
			return s;
		}
		const absV = Math.abs(v);
		if (absV !== 0 && (absV >= 100000000 || absV < 1e-3)) {
			return v.toExponential(8).padStart(14);
		}
		else {
			return v.toFixed(5).padStart(14);
		}
	}
	else {
		return '???';
	}
}

/**
 * MMApp
 * the main Math Minion window
 */
export function MMApp(props) {
	const t = props.t;

	// {Object} infoViews - classes of info views used to construct the react component appearing in the info view
	const infoViews = {
		'console': ConsoleView,
		'clipboard': ClipboardView,
		'sessions': SessionsView,
		'units': UnitsView,
		'userunits': UserUnitsView,
		'unitsets': UnitSetsView,
		'unitset': UnitSetView,
		'formulaEditor': FormulaEditor,
		'Model': ModelView,
		'Expression': ExpressionView,
		'Matrix': MatrixView,
		'DataTable': DataTableView,
		'Solver': SolverView,
		'Ode': OdeView,
		'Iterator': IteratorView,
		'Optimizer': OptimizerView,
		'Graph': GraphView,
		'HtmlPage': HtmlPageView,
		'Button' : ButtonView,
		'Menu' : MenuView,
	}

	// information need to generate a console view component
	const consoleInfo = useRef({
		title: 'react:consoleTitle',
		path: '',
		stackIndex: 0,
		updateCommands: '',
		updateResults: [],
		viewKey: 'console',
	});
	
	// calc pane style
	const [autoLoadComplete, setAutoLoadComplete] = useState(false);
	const [docHeight, setDocHeight] = useState(document.documentElement.clientHeight - 16);
	const [docWidth, setDocWidth] = useState(document.documentElement.clientWidth - 16);
	const twoPane = docWidth >= 640;
	const defaultRightPaneWidth = Math.max(320, docWidth/2);
	const [allow2Pane, setAllow2Pane] = useState(twoPane);
	const [viewType, setViewType] = useState(twoPane ? ViewType.twoPanes : ViewType.info);
	const [rightPaneWidth, setRightPaneWidth] = useState(defaultRightPaneWidth);
	const [viewInfo, setViewInfo] = useState(initialInfo);
	const [statusMessage, setStatusMessage] = useState('');
	const [showConsole, setShowConsole] = useState(false);

	const diagramRef = React.useRef(null);

	useEffect(() => {
		const setSize = () => {
			const docElement = document.documentElement;
			const newDocHeight = docElement.clientHeight - 16;
			const newDocWidth = docElement.clientWidth - 8;
			const rightPercent = rightPaneWidth/docWidth;
			setDocHeight(newDocHeight);
			setDocWidth(newDocWidth);
			document.body.style.height = `${newDocHeight}px`;
			document.body.style.width = `${newDocWidth}px`;
			const twoPane = newDocWidth >= 640;
			setAllow2Pane(twoPane);
			if (viewType !== ViewType.info) {
				setViewType(twoPane ? ViewType.twoPanes : ViewType.diagram);
			}
			if(twoPane && rightPaneWidth !== 320) {
				const newRPWidth = newDocWidth * rightPercent;
				if (newRPWidth > 320) {
					setRightPaneWidth(newRPWidth);
				}
				else {
					setRightPaneWidth(320);
				}
			}
		};
		setSize();
		window.addEventListener('resize', setSize);
		return () => {
			window.removeEventListener('resize', setSize);
		}
	}, [viewType]);

	useEffect(() => {
		if (!autoLoadComplete) {
			let cmd = document.baseURI.split('?cmd=').splice(1);
			// console.log(`cmd = "${cmd}"`);
			if (cmd.length) {
				cmd = decodeURI(cmd);
			}
			else {
				cmd = '/ load';
			}
			doCommand(cmd, (results) => {
				const resetInfo = results[0].results;
				if (resetInfo) {
					resetInfoStack('root', resetInfo);
					if (
						viewType === ViewType.diagram &&
						resetInfo.selected &&
						resetInfo.selected.type !== 'Model')
					{
						setViewType(ViewType.info);
					}
				}
				setAutoLoadComplete(true);
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
		}
	}, []);

	/** setStateViewType
	 * sets the actual viewType, but with some additional processing
	 * @param {ViewType} newType
	 */
	const setStateViewType = useCallback((newType) => {
		// save the diagram state when switching to type info
		// so it can be reinitialized when constructed again
		if (newType === viewType) {
			return;
		}
		if (newType === ViewType.info) {
			if (diagramRef.current) {
				dgmStateStack.push({...diagramRef.current.state});
			}
			else {
				dgmStateStack.push(null);
			}
		}
		// console.log(`new view type ${newType}`);
		setViewType(newType);
	}, [viewType]);

	/** resetInfoStack
	 * clears all views and optionally fills infoStack with new view state
	 * - called when new case loaded
	 * @param {string} rootName
	 * @param {string} resetInfo - optional object containing modelStack,
	 * an array of model names to be pushed to the info stack and
	 * an optional selectedTool containing information
	 * for a tool in the top most model to be viewed immediately
	 */
	const resetInfoStack = useCallback((rootName, resetInfo) => {
		let path = `/.${rootName}`;
		let infoState = {
			title: rootName,
			path: path,
			stackIndex: 0,
			updateCommands: `${path} toolViewInfo`,
			updateResults: [],
			viewKey: 'Model',
		};
		infoStack = [infoState];
		let stackIndex = 1;
		if (resetInfo) {
			if (resetInfo.modelStack) {
				const modelStack = resetInfo.modelStack;
				for (let modelName of modelStack) {
					path += '.' + modelName;
					infoState = {
						title: modelName,
						path: path,
						stackIndex: stackIndex++,
						updateCommands: '',
						updateResults: [],
						viewKey: 'Model',
					};
					infoStack.push(infoState);
				}
			}
			if (resetInfo.selected) {
				const modelPath = path;
				const toolName = resetInfo.selected.name;
				path += '.' + toolName;
				const updateCommand = `${path} toolViewInfo`;
				infoState = {
					title: toolName,
					path: path,
					modelPath: modelPath,
					stackIndex: stackIndex++,
					updateCommands: updateCommand,			// commands used to update the view state
					updateResults: [resetInfo.selected.info],		// result of doCommand on the updateCommands
					viewKey: resetInfo.selected.type,
				};
				infoStack.push(infoState);		
			}
			if (resetInfo.new && !allow2Pane) { 
				setViewType(ViewType.diagram);
			}
		}
		setViewInfo(infoState);
		while(dgmStateStack.pop());
		updateView();
	},[]);

	/**
	 * doCommand - sends command to worker
	 * @param {string} cmd
	 * @param {function} callBack - (cmds[]) => {}
	 * @param {function} errorHandler (String) => {} - optional - alert if not provided
	 */
	const doCommand = useCallback((cmd, callBack, errorHandler) => {
		// console.log(`doCommand ${cmd}`);
		/**
		 * errorAlert
		 * @param {String} msg
		 */
		const errorAlert = (msg) => {
			const s = `${props.t('mmcmd:error')}\n${msg}`;

			// avoid multiple alerts
			const t = new Date().getTime();
			if (t - lastErrorTime > 1000) {
				if (errorHandler) {
					errorHandler(s);
				}
				else {
					alert(s);
				}
				lastErrorTime = new Date().getTime();
			}
		}

		/**
		 * warningAlert
		 * @param {String} msg
		 */
		const warningAlert = (msg) => {
			// avoid multiple alerts
			const t = new Date().getTime();
			if (t - lastErrorTime > 1000) {
				const s = `${props.t('mmcmd:alert')}\n\n${msg}`;
				if (errorHandler) {
					errorHandler(s);
				}
				else {
					alert(s);
				}
				lastErrorTime = new Date().getTime();
			}
		}

		// console.log(`cmd ${callBackId} ${cmd}`);
		commandCallBacks.set(callBackId, callBack);
		const timeoutId = setTimeout(() => {
				setStatusMessage(props.t('mmcmd:calculating'));
		}, 500);
		let cmdObject = {cmdString: cmd, id: callBackId++, timeoutId: timeoutId};
		pipe.doCommand(cmdObject, (results) => {
			clearTimeout(results.timeoutId);
			let error = results.error;
			let warning;
			if (!error) {
				for (let result of results) {
					if (result.verb && result.verb === 'status') {
						const msg = props.t(result.results.msgKey, result.results.args);
						setStatusMessage(msg);
						continue;
					}
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
					s = stringify(msg.child) + '\n' + s;
				}
				return s;
			}

			if (error) {
				if (error.msgKey) {
					if (error.msgKey !== 'cmd:subjectNotFound') {
						errorAlert(stringify(error));
					}
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
				setStatusMessage('');
				const savedCallBack = commandCallBacks.get(results.id);
				// console.log(`cmd call back ${results.id} ${results.length ? results[0].expression : 'empty'}`);
				commandCallBacks.delete(results.id);
				if (savedCallBack) {
					savedCallBack(results);
				}
			}
		});
	},[props]);

	/**
	 * updateDiagram
	 * @param {Boolean} rescale - should diagram be rescaled - default false
	 */
	const updateDiagram = useCallback((rescale = false) => {
		if (diagramRef.current) {
			diagramRef.current.getModelInfo(rescale);
		}
	}, []);

	/** updateView
	 * @param {Number} stackIndex = info stack position of view
	 * @param {Boolean} rescaleDiagram - should diagram be rescaled - default false
	 * call doCommand with updateCommands to update th info view state
	 */
	const updateView = useCallback((stackIndex, rescaleDiagram = false, doAutoSave = true) => {
		if (stackIndex == null) {
			// assume top view
			stackIndex = infoStack.length - 1;
		}
		if (stackIndex < infoStack.length && stackIndex >= 0) {
			let top = infoStack[stackIndex];
			setViewInfo(top);
			if (top.updateCommands) {
				doCommand(top.updateCommands, (cmds) => {
					top.updateResults = cmds;
					setViewInfo({...top});
					updateDiagram(rescaleDiagram);
					if (doAutoSave) {
						doCommand('/ autosave');
					}
				});
			}
			else {
				updateDiagram(rescaleDiagram);
			}
		}
	}, [doCommand, updateDiagram]);

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
		setStateViewType(viewType === ViewType.diagram ? ViewType.info : viewType);
	},[viewType, setStateViewType]);

	/** popView
	 * if more than one thing on info stack, it pops the last one
	 */
	const popView = useCallback(() => {
		if (infoStack.length > 1) {
			const oldTop = infoStack.pop();
			switch (oldTop.viewKey) {
				case 'Model':
					doCommand('/ popmodel', () => {
						let rescale = false;
						if (dgmStateStack.length) {
							const dgmState = dgmStateStack.pop();
							if (dgmState && diagramRef.current) {
								diagramRef.current.setState(dgmState);
							}
						}
						else {
							rescale = true;
						}
						updateView(infoStack.length-1, rescale);
					});
					break;

				// case 'console':
				// 	consoleInfo.current = oldTop;
				// 	updateView(infoStack.length-1);
				// 	break;
				
				default:
					updateView(infoStack.length-1);
					break;
			}
			const newView = infoStack[infoStack.length-1];
			setViewInfo(newView);
			return newView?.path;
		}
	},[doCommand, updateView, showConsole]);

	/**
	 * pushModel
	 * pushes model named on to the diagram and infoview
	 * @param {String} modelName 
	 */
	const pushModel = useCallback((modelName, successCallBack, failCallBack) => {
		doCommand(`/ pushmodel ${modelName}`, (cmds) => {
			if (cmds[0].error) {
				if (failCallBack) {
					failCallBack(cmds[0].error);
				}
				return;
			}
			else {
				if (successCallBack) {
					successCallBack(cmds?.[0]?.results?.path);
				}
			}
			if (diagramRef.current) {
				dgmStateStack.push({...diagramRef.current.state});
			}
			else {
				dgmStateStack.push(null);
			}
			if (cmds.length) {
				const path = cmds[0].results.path;
				while (infoStack.length > 1 && infoStack[infoStack.length - 1].viewKey !== 'Model') {
					infoStack.pop();
				}
				const modelInfoState = {
					title: modelName,
					path: path,
					stackIndex: infoStack.length,
					updateCommands: '',
					updateResults: [],
					viewKey: 'Model',
				}
				infoStack.push(modelInfoState);
				const indexTool = cmds[0].results.indexTool;
				if (indexTool) {
					const newInfoState = {
						title: indexTool,
						path: path + '.' + indexTool,
						modelPath: path,
						stackIndex: infoStack.length,
						updateCommands: '',			// commands used to update the view state
						updateResults: [],
						viewKey: cmds[0].results.indexToolType,
					};
					infoStack.push(newInfoState);
					setViewInfo(newInfoState);
				}
				else {
					setViewInfo(modelInfoState);
				}
				updateDiagram(true);
			}
		}, failCallBack);
	},[doCommand, updateDiagram]);

	/**
	 * popModel
	 * on the diagram and infoview
	 */
	const popModel = useCallback(() => {
		while (infoStack.length > 1 && infoStack[infoStack.length-1].viewKey !== 'Model') {
			const oldTop = infoStack.pop();
			if (oldTop.viewKey === 'console') {
				consoleInfo.current = oldTop;
			}
		}
		return popView();
	},[popView]);

const pushTool = useCallback((toolName, path, toolType) => {
	if (toolType === 'Model') {
		pushModel(toolName);
		return;
	}
	const updateCommand = `${path} toolViewInfo`;
	doCommand(updateCommand, (cmds) => {
		if (cmds.error) {
			alert(`${props.t(cmds.error.msgKey, cmds.error.args)}`)
			return;
		}
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
		setStateViewType(viewType === ViewType.diagram ? ViewType.info : viewType);
		updateDiagram();
	});
}, [doCommand, pushModel, setStateViewType, viewType, updateDiagram, props]);

	/**
	 * viewTool
	 * pushes tool named on to the infoview
	 * @param {String} toolName
	 * @param {String} toolType
	 */
	const viewTool = useCallback((toolName, toolType) => {
		let top = infoStack[infoStack.length - 1];
		while (infoStack.length > 1 && top.viewKey !== 'Model') {
			if (toolName && top.title.toLowerCase() === toolName.toLowerCase() && top.viewKey === toolType) {
				infoStack.pop();
				updateView(infoStack.length-1);
				return;
			}
			infoStack.pop();
			top = infoStack[infoStack.length - 1];
		}
		if (!toolName || !toolType) {
			return;  // pushing nothing clears stack to top model
		}
		const path = `${top.path}.${toolName}`;	
		pushTool(toolName, path, toolType);
	}, [updateView, pushTool]);

	/**
	 * toggleConsole
	 * pushes the console onto the info view
	 */
	const toggleConsole = useCallback(() => {
		setShowConsole(prev => !prev);
		// infoStack.push(consoleInfo.current);
		// setViewInfo(consoleInfo.current);
		// setStateViewType(viewType === ViewType.diagram ? ViewType.info : viewType)
	}, [viewType, setStateViewType]);

	/**
	 * showHelp
	 * show help for the current view
	 */
	const showHelp = useCallback(() => {
		let stackLength = infoStack.length;
		let viewKey = stackLength ? infoStack[stackLength - 1].viewKey : 'none';
		window.open(`help/${viewKey.toLowerCase()}.html`,'MM Help');
	}, []);

	/**
	 * renameTool
	 * @param {String} path 
	 * @param {String} newName
	 * renames tool at path to newName (in same parent model)
	 */
	const renameTool = useCallback((path, newName) => {
		if (!newName) {
			return;
		}

		doCommand(`${path} renameto ${newName}`, (results) => {
			// fix up things in the view info to reflect the new name
			if (results.error) {
				return;
			}
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
	}, [doCommand, updateDiagram, updateView]);

	/** setUpdateCommands
	 * @param {Number} stackIndex - index of view in infoStack
	 * @param {string} commands - commands to be run to update state
	 */
	const setUpdateCommands = useCallback((stackIndex, commands) => {
		if (stackIndex < infoStack.length) {
			let top = infoStack[stackIndex];
			doCommand(commands, (cmds) => {
				top.updateCommands = commands;
				top.updateResults = cmds;
				setViewInfo({...top});
				updateDiagram();
			});
		}
	}, [doCommand, updateDiagram]);

	if (!autoLoadComplete) {
		return null;
	}

	// {method[]} actions - methods passed to components
	let actions = {
		doCommand: doCommand,
		pushModel: pushModel,
		popModel: popModel,
		viewTool: viewTool,
		pushTool: pushTool,
		pushView: pushView,
		popView: popView,
		resetInfoStack: resetInfoStack,
		setUpdateCommands: setUpdateCommands,
		updateView: updateView,
		updateDiagram: updateDiagram,
		renameTool: renameTool,
		toggleConsole: toggleConsole,
	};
	
	let previousTitle = '';
	let title = '';
	let infoView = null;
	let infoNav = null;
	const infoWidth = (viewType !== ViewType.info) ? rightPaneWidth : docWidth;
	// console.log(`docWidth ${docWidth} docHeight ${docHeight}`);
	const toolHeight = 40;
	const navHeight = 40;

	const infoHeight = docHeight - navHeight - toolHeight;
	document.documentElement.style.setProperty('--info-height', `${infoHeight}px`);
	let diagramBox = {top: 9, left: 9, height: docHeight, width: docWidth - infoWidth}
	// console.log(`diagramBox ${diagramBox.width} ${diagramBox.height}`);
	if (viewType !== ViewType.diagram) {
		let i = infoStack.length-1;
		previousTitle = i > 0 ? infoStack[i-1].title : '';
		// make sure the top view info is what is displayed
		const topViewInfo = infoStack[i];
		let keyView = infoViews[topViewInfo.viewKey];
		title = topViewInfo.title;
		if (showConsole) {
			keyView = infoViews['console'];
		}
		const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));
		infoView = e(
			'div', {
				id: 'info-view',
				style: {
					width: infoWidth - 2*nInfoViewPadding,
					height: infoHeight,
				}
			},
			e(keyView, {
				key: topViewInfo.path,
				className: 'mmapp-' + topViewInfo.viewKey.toLowerCase(),
				actions: actions,
				viewInfo: topViewInfo,
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
				}, t('react:infoButtonHelp')
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
			diagramBox: diagramBox,
			actions: actions,
			dgmStateStack: dgmStateStack,
			isTwoPane: (viewType === ViewType.twoPanes),
			rightPaneWidth: rightPaneWidth,
			setRightPaneWidth: setRightPaneWidth,
		});
	}

	let expandText = t('react:infoButtonExpand');
	if (viewType === ViewType.info) {
		expandText = t('react:infoButtonDiagram');
	}
	else if (viewType === ViewType.diagram) {
		expandText = t('react:infoButtonInfo');
	}

	let viewKeys = new Set(infoStack.map(v => v.viewKey));
	let infoTools;
	if (statusMessage && statusMessage.length) {
		infoTools = e(
			'div', {
				id: 'worker__status-message'
			},
			statusMessage
		);
	}
	else {
		infoTools = e(
			'div', {
				id: 'info-tools',
			},
			e(
				'button', {
					id:'info-tools__expand-button',
					className: 'info-tools__button',
					tabIndex: -1,
					onClick: () => {
						switch (viewType) {
							case ViewType.twoPanes:
								setStateViewType(ViewType.info);
								break;

							case ViewType.diagram:
								setStateViewType(allow2Pane ? ViewType.twoPanes : ViewType.info);
								break;

							case ViewType.info:
								setStateViewType(allow2Pane ? ViewType.twoPanes : ViewType.diagram);
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
				tabIndex: -1,
				disabled: !undoStack.length,
				onClick: () => {
					let undo = undoStack.pop();
					if (undo) {
						undo = 'undo ' + undo;
						doCommand(undo, () => {
							updateView(infoStack.length - 1);
							updateDiagram();
						});
					}	
				}
				},
				t('react:infoButtonUndo')
			),
			e(
					'button', {
					id:'info-tools__redo-button',
					className: 'info-tools__button',
					tabIndex: -1,
					disabled: !redoStack.length,
					onClick: () => {
						let redo = redoStack.pop();
						if (redo) {
							redo = 'redo ' + redo;
							doCommand(redo, () => {
								updateView(infoStack.length - 1);
								updateDiagram();
							});
						}
					}
				},
				t('react:infoButtonRedo')
			),
			e(
				'button', {
					id:'info-tools__unit-button',
					className: 'info-tools__button',
					tabIndex: -1,
					disabled: viewKeys.has('units'),
					onClick: () => {
						pushView('units', 'react:unitsTitle');
					}
				},
				t('react:infoButtonUnits')
			),
			e(
				'button', {
					id:'info-tools__console-button',
					className: 'info-tools__button',
					tabIndex: -1,
					disabled: viewKeys.has('console'),
					onClick: () => {
						toggleConsole();
					}
				},
				t('react:infoButtonConsole')
			),
			e(
					'button', {
					id:'info-tools__sessions-button',
					className: 'info-tools__button',
					tabIndex: -1,
					disabled: viewKeys.has('sessions'),
					onClick: () => {
						pushView('sessions', 'react:sessionsTitle', {rootFolder: ''});
					}
				},
				t('react:infoButtonSessions')
			),
		);
	}

	let wrapper;
	const onePaneStyle = {
		width: `${docWidth}px`,
		// gridTemplateRows: `${navHeight}px 1fr ${toolHeight}px`,
	};

	switch (viewType) {
		case ViewType.twoPanes:
			wrapper = e(
				'div',{
					id: 'mmapp__wrapper--two-pane',
					style: {
						gridTemplateColumns: `1fr ${infoWidth}px`,
					},
				},
				e(
					'div', {
						id: 'mmapp__diagram--two-pane',
						className: 'mmapp__diagram',
					},
					e(ErrorBoundary, {width: diagramBox.width, height: diagramBox.height}, diagram)
				),
				e(
					'div', {
						id: 'mmapp__info-view',
						style: {
							gridTemplateRows: `${navHeight}px 1fr ${toolHeight}px`,
							// width: infoWidth,
							// height: infoHeight,
						}
					},
					infoNav,
					e(ErrorBoundary, {
						// handleBoundraryError: () => {
						// 	popView();
						// 	alert(t('mmcmd:viewError'));
						// }
					}, infoView),
					infoTools,
				)
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
