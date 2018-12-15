'use strict';

import {MMViewComponent} from './MMViewComponent.js';
import {ConsoleView} from './ConsoleView.js';
import {UnitsView} from './UnitsView.js';

const e = React.createElement;

/**
 * @class MMView @extends MMViewCOmponent
 * the main Math Minion window
 * @member {Object.<string,MMViewComponent>} infoViews
 * @member {Object.<string,InfoStackItem>[]} infoStack
 */
export class MMView extends MMViewComponent {
	constructor(props) {
		super(props);
 		this.infoViews = {
			'console': ConsoleView,
			'units': UnitsView
		}
		this.state = {
			viewKey: 'console',
			title: 'react:consoleTitle',
			infoPath: '',
			previousTitle: ''
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
		let stackItem = {
			viewKey: parts[0],
			title: (parts[1] ? parts[1] : ''),
			infoPath: (parts[2] ? parts[2] : '')
		}

		this.setState((state) => {
			this.infoStack.push(state);
			stackItem['previousTitle'] = state.title;
			return stackItem;
		});
	}

	/** @method popView
	 * if more than one thing on info stack, it pops the last one and
	 * makes it the current info view
	 */
		popView() {
			if (this.infoStack.length) {
				let state = this.infoStack.pop();
				this.setState(state);
			}
		}

	render() {
		let infoView = e(this.infoViews[this.state.viewKey],
			{
				className: 'mmview-' + this.state.viewKey.toLowerCase(),
				doCommand: this.doCommand,
				t: this.props.t
			}
		);
		let previousTitle = this.state.previousTitle;

		return e('div', {className: 'mmview-wrapper'},
			e('div', {className: 'mmview-diagram'}, 'diagram'),
			e('div', {className: 'mmview-info-nav'},
				e('div',{
					className: 'mmview-info-navback',
					onClick: this.popView
				}, previousTitle ? '< ' + this.props.t(this.state.previousTitle) : ''),
				e('div',{
					className: 'mmview-info-title'
				}, this.props.t(this.state.title))				
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