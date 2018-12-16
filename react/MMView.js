'use strict';

import {MMCommandPipe} from '/mmworker/MMCommandPipe.js';
import {ConsoleView} from './ConsoleView.js';
import {UnitsView} from './UnitsView.js';

const e = React.createElement;

/** @interface InfoState
 * item used to keep track of views pushed and pop on info pane
 * @member {string} viewKey
 * @member {string} title
 * @member {string} infoPath
 * @member {string} previousTitle
 */

/**
 * @class MMView
 * the main Math Minion window
 * @member {MMCommandPipe} pipe - pipe to worker
 * @member {method[]} actions
 * @member {Object.<string,MMViewComponent>} infoViews
 * @member {Object.<string,InfoState>[]} infoStack
 */
export class MMView extends React.Component {
	constructor(props) {
		super(props);
		this.pipe = new MMCommandPipe();
		this.doCommand = this.doCommand.bind(this);
		this.actions = {
			doCommand: this.doCommand
		};

 		this.infoViews = {
			'console': ConsoleView,
			'units': UnitsView
		}

		let initialInfo = {
			viewKey: 'console',
			title: 'react:consoleTitle',
			path: ''
		}

		this.state = {
			infoState: initialInfo
		}
		this.infoStack = [];
		this.handleButtonClick = this.handleButtonClick.bind(this);
		this.popView = this.popView.bind(this);
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

	/** @method pushInfoView
	 * changes the info view, pushing it onto the infoStack
	 * @param {string} viewKey - key to view class in infoViews
	 * @param {string} title
	 * @param	{string} path - command path to object to display (if applicable)
	 */
	pushInfoView(viewKey, title, path) {
		let newInfoState = {
			viewKey: viewKey,
			title: (title ? title : ''),
			path: (path ? path : '')
		};
		this.setState((state) => {
			this.infoStack.push(state.infoState);
			newInfoState['previousTitle'] = this.state.infoState.title;
			return {infoState: newInfoState};
		})
	}

	/** @method popView
	 * if more than one thing on info stack, it pops the last one and
	 * makes it the current info view
	 */
		popView() {
			if (this.infoStack.length) {
				let state = this.infoStack.pop();
				this.setState({infoState: state});
			}
		}

	handleButtonClick(event) {
		let parts = event.target.value.split(' ');
		this.pushInfoView(parts[0], parts[1], parts[3], );
	}

	render() {
		let t = this.props.t;
		let infoView = e(this.infoViews[this.state.infoState.viewKey],
			{
				className: 'mmview-' + this.state.infoState.viewKey.toLowerCase(),
				actions: this.actions,
				t: t
			}
		);
		let previousTitle = this.state.infoState.previousTitle;

		return e('div', {className: 'mmview-wrapper'},
			e('div', {className: 'mmview-diagram'}, 'diagram'),
			e('div', {className: 'mmview-info-nav'},
				e('div',{
					className: 'mmview-info-navback',
					onClick: this.popView
				}, previousTitle ? '< ' + t(previousTitle) : ''),
				e('div',{
					className: 'mmview-info-title'
				}, t(this.state.infoState.title))				
			),
			e('div', {className: 'mmview-info-content'},
				infoView
			),
			e('div', {className: 'mmview-info-tools'},
				e('button', {
						id:'mmview-unit-button',
						value:'units react:unitsTitle /units',
						onClick: this.handleButtonClick
					},
					t('react:unitButtonValue')
				),
				e('button', {
						id:'mmview-console-button',
						value:'console react:consoleTitle',
						onClick: this.handleButtonClick
					},
					t('react:consoleButtonValue')
				)
			)
		);
	}
}