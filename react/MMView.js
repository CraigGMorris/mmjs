'use strict';

import {MMViewComponent} from './MMViewComponent.js';
import {ConsoleView} from './ConsoleView.js';

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
			'console': ConsoleView
		}
		this.state = {
			infoView: 'console',
		}
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
			e('div', {className: 'mmview-info-wrapper'},
				e('div', {className: 'mmview-info-content'},
					infoView
				),
				e('div', {className: 'mmview-info-tools'},
					e('button', {
						className:'mmview-unit-button',
						value:'Units'}, this.t('react:unitButtonValue')),
					e('button', {
						className:'mmview-console-button',
						type	:'button'}, this.t('react:consoleButtonValue'))
				)
			)
		);
	}
}