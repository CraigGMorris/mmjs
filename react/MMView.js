'use strict';

import {MMViewComponent} from './MMViewComponent.js';
import {ConsoleView} from './ConsoleView.js';
import {UnitsView} from './UnitsView.js';

const e = React.createElement;

/**
 * @class MMView
 * the main Math Minion window
 * @member {Object.<string,MMViewComponent>} infoViews
 */
export class MMView extends MMViewComponent {
	constructor(props) {
		super(props);
 		this.infoViews = {
			'console': ConsoleView,
			'units': UnitsView
		}
		this.state = {
			infoView: 'console Console',
			title: 'A Title'
		}
		this.pushView = this.pushView.bind(this);
		this.setTitle = this.setTitle.bind(this);
	}

	/** @method pushView
	 * changes the info view, pushing it onto the infoStack
	 * @param {string} viewName
	 */
	pushView(event) {
		this.setState({infoView: event.target.value});
	}

	setTitle(title) {
		this.setState({title:title});
	}

	render() {
		let infoParts = this.state.infoView.split(' ');
		let infoView = e(this.infoViews[infoParts[0]],
			{
				className: 'mmview-' + this.state.infoView.toLowerCase(),
				doCommand: this.doCommand,
				setTitle: this.setTitle,
				t: this.props.t
			}
		);

		return e('div', {className: 'mmview-wrapper'},
			e('div', {className: 'mmview-diagram'}, 'diagram'),
			e('div', {className: 'mmview-info-nav'},
				this.state.title
			),
			e('div', {className: 'mmview-info-content'},
				infoView
			),
			e('div', {className: 'mmview-info-tools'},
				e('button', {
						id:'mmview-unit-button',
						value:'units Units',
						onClick: this.pushView
					},
					this.props.t('react:unitButtonValue')
				),
				e('button', {
						id:'mmview-console-button',
						value:'console Console',
						onClick: this.pushView
					},
					this.props.t('react:consoleButtonValue')
				)
			)
		);
	}
}