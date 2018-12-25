'use strict';

import {MMCommandPipe} from '/mmworker/MMCommandPipe.js';
import {ConsoleView} from './ConsoleView.js';
import {UnitsView, UserUnitsView} from './UnitsView.js';

const e = React.createElement;

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
		//this.doCommand = this.doCommand.bind(this);
		//this.setUpdateCommands = this.setUpdateCommands.bind(this);
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
			'userunits': UserUnitsView
		}

		// information need to generate an information view component
		let initialInfoState = {
			viewKey: 'console',
			title: 'react:consoleTitle',
			path: '',
			stackIndex: 0,
			updateCommands: '',
			updateResults: []
		}

		this.undoStack = [];
		this.redoStack = [];

		this.state = {
			/** @desc infoStack keeps the information necessary to render all the info views pushed */
			infoStack: [initialInfoState]
		}

		this.handleButtonClick = this.handleButtonClick.bind(this);
		this.popView = this.popView.bind(this);
		this.pushView = this.pushView.bind(this);
	}

		/**
	 * @method doCommand - sends command to worker
	 * @param {string} cmd
	 * @param {function} callBack - (cmds[]) => {}
	 */
	doCommand(cmd, callBack) {
		this.pipe.doCommand(cmd, (cmds) => {
			// might check here for results needing new view states
			if (callBack) {
				callBack(cmds);
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

	/** @method popView
	 * if more than one thing on info stack, it pops the last one
	 */
	popView() {
		let stack = this.state.infoStack;
		if (stack.length) {
			stack.pop();
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
		this.pushView(parts[0], parts[1], parts[3], );
	}

	render() {
		let t = this.props.t;
		/** @desc infoComponents is array of info views created from the information on the state.infoStack
		 * Only the last one will be visible, but the others will retain their information when popped back to
		 */
		let infoComponents = [];
		let previousTitle = '';
		let title = '';
		let infoStack = this.state.infoStack;
		for (let i = 0; i < infoStack.length; i++) {
			previousTitle = i > 0 ? infoStack[i-1].title : '';
			let viewInfo = this.state.infoStack[i];
			title = viewInfo.title;
			let infoView = e('div', {
					className: 'mmapp-info-content',
					key: i,
					style: {
						zIndex: i,
						/** @desc hide lower views in case upper one has transparent areas */
						visibility: i < infoStack.length - 1 ? 'hidden' : 'visible'
					}
				},
				e(this.infoViews[viewInfo.viewKey],
					{
						className: 'mmapp-' + viewInfo.viewKey.toLowerCase(),
						actions: this.actions,
						viewInfo: viewInfo,
						t: t
					})
			);
			infoComponents.push(infoView);
		}

		return e('div', {className: 'mmapp-wrapper'},
			e('div', {className: 'mmapp-diagram'}, 'diagram'),
			e('div', {className: 'mmapp-info-nav'},
				e('div',{
					className: 'mmapp-info-navback',
					onClick: this.popView
				}, previousTitle ? '< ' + t(previousTitle) : ''),
				e('div',{
					className: 'mmapp-info-title'
				}, t(title))				
			),
			infoComponents,
			e('div', {className: 'mmapp-info-tools'},
				e('button', {
					id:'mmapp-expand-button',
					value:'expand',
					onClick: this.handleButtonClick
					},
					'⇤'
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
			)
		);
	}
}