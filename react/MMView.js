'use strict';

import {MMViewComponent} from './MMViewComponent.js';
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
 * @class MMView @extends MMViewComponent
 * the main Math Minion window
 * @member {Object.<string,MMViewComponent>} infoViews
 * @member {Object.<string,InfoState>[]} infoStack
 */
export class MMView extends MMViewComponent {
	constructor(props) {
		super(props);
 		this.infoViews = {
			'console': ConsoleView,
			'units': UnitsView
		}

		let initialInfo = {
			viewKey: 'console',
			title: 'react:consoleTitle',
			infoPath: '',
			previousTitle: ''
		}

		this.state = {
			infoState: initialInfo
		}
		this.infoStack = [];
		this.pushView = this.pushView.bind(this);
		this.popView = this.popView.bind(this);
	}

	/** @method pushView
	 * changes the info view, pushing it onto the infoStack
	 * @param {string} viewName
	 */
	pushView(event) {
		let parts = event.target.value.split(' ');
		let newInfoState = {
			viewKey: parts[0],
			title: (parts[1] ? parts[1] : ''),
			infoPath: (parts[2] ? parts[2] : '')
		}

		this.setState((state) => {
			this.infoStack.push(state.infoState);
			newInfoState['previousTitle'] = state.infoState.title;
			return {infoState: newInfoState};
		});
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

	render() {
		let infoView = e(this.infoViews[this.state.infoState.viewKey],
			{
				className: 'mmview-' + this.state.infoState.viewKey.toLowerCase(),
				doCommand: this.doCommand,
				t: this.props.t
			}
		);
		let previousTitle = this.state.infoState.previousTitle;

		return e('div', {className: 'mmview-wrapper'},
			e('div', {className: 'mmview-diagram'}, 'diagram'),
			e('div', {className: 'mmview-info-nav'},
				e('div',{
					className: 'mmview-info-navback',
					onClick: this.popView
				}, previousTitle ? '< ' + this.props.t(previousTitle) : ''),
				e('div',{
					className: 'mmview-info-title'
				}, this.props.t(this.state.infoState.title))				
			),
			e('div', {className: 'mmview-info-content'},
				infoView
			),
			e('div', {className: 'mmview-info-tools'},
				e('button', {
						id:'mmview-unit-button',
						value:'units react:unitsTitle /units',
						onClick: this.pushView
					},
					this.props.t('react:unitButtonValue')
				),
				e('button', {
						id:'mmview-console-button',
						value:'console react:consoleTitle',
						onClick: this.pushView
					},
					this.props.t('react:consoleButtonValue')
				)
			)
		);
	}
}