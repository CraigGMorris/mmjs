'use strict';

import {MMCommandPipe} from '/mmworker/MMCommandPipe.js';
import {ConsoleView} from './ConsoleView.js';
import {UnitsView} from './UnitsView.js';

const e = React.createElement;

/**
 * @class MMApp
 * the main Math Minion window
 * @member {MMCommandPipe} pipe - pipe to worker
 * @member {method[]} actions
 * methods passed to components
 * @member {Object} infoViews
 * classes of info views used to construct the react component appearing in the info view
 */
export class MMApp extends React.Component {
	constructor(props) {
		super(props);
		this.pipe = new MMCommandPipe();
		this.doCommand = this.doCommand.bind(this);
		this.actions = {
			doCommand: this.doCommand,
			pushView: this.pushView,
			popView: this.popView
		};

 		this.infoViews = {
			'console': ConsoleView,
			'units': UnitsView
		}

		// information need to generate an information view component
		let initialInfoState = {
			viewKey: 'console',
			title: 'react:consoleTitle',
			path: ''
		}

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
			callBack(cmds);
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
			path: (path ? path : '')
		};
		this.setState((state) => {
			let stack = state.infoStack;
			stack.push(newInfoState);
			return {infoStack: stack};
		})
	}

	/** @method popView
	 * if more than one thing on info stack, it pops the last one
	 */
		popView() {
			let stack = this.state.infoStack;
			if (stack.length) {
				stack.pop();
				this.setState({infoStack: stack});
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
			let viewInfo =this.state.infoStack[i];
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