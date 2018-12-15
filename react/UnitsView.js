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
		let t = this.props.t;
		return e('div', {className:'units-view'},
			e('button', {
				id:'unitsview-customunits-button',
				},
				t('react:customUnitsButtonValue')
			),
			e('button', {
				id:'unitsview-customsets-button',
				},
				t('react:customSetsButtonValue')
			),
			e('div', {
				id:'unitsview-setslist'
			}, 'stuff')
	);
	}
}