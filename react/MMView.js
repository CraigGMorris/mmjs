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
			infoView: 'console',
		}
		this.switchView = this.switchView.bind(this);
	}

	/** @method switchView
	 * changes the info view
	 * @param {string} viewName
	 */
	switchView(event) {
		this.setState({infoView: event.target.value});
	}
	
	render() {
		let infoView = e(this.infoViews[this.state.infoView],
			{
				className: 'mmview-' + this.state.infoView.toLowerCase(),
				doCommand: this.doCommand,
				i18n: this.props.i18n
			}
		);

		return e('div', {className: 'mmview-wrapper'},
			e('div', {className: 'mmview-diagram'}, 'diagram'),
				e('div', {className: 'mmview-info-content'},
					infoView
				),
				e('div', {className: 'mmview-info-tools'},
					e('button', {
							id:'mmview-unit-button',
							value:'units',
							onClick: this.switchView
						},
						this.t('react:unitButtonValue')
					),
					e('button', {
							id:'mmview-console-button',
							value:'console',
							onClick: this.switchView
						},
						this.t('react:consoleButtonValue')
					)
				)
		);
	}
}