'use strict';
import {MMViewComponent} from './MMViewComponent.js';

const e = React.createElement;

/**
 * @class UnitsView
 * select unit sets or customize units or unit sets
 */
export class UnitsView extends MMViewComponent {
	constructor(props) {
		super(props);
		this.state = {
		};
	}

	render() {
		return e('div', {className:'units-view'},
			e('button', {
				className:'unitsview-customunits-button',
				},
				this.t('react:customUnitsButtonValue')
			),
			e('button', {
				className:'unitsview-customsets-button',
				},
				this.t('react:customSetsButtonValue')
			),
			e('div', {
				className:'setslist'
			}, 'stuff')
	);
	}
}