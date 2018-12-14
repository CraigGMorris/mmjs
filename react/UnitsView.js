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
		this.props.setTitle(this.props.t('react:unitsTitle'));
	}

	render() {
		return e('div', {className:'units-view'},
			e('button', {
				className:'unitsview-customunits-button',
				},
				this.props.t('react:customUnitsButtonValue')
			),
			e('button', {
				className:'unitsview-customsets-button',
				},
				this.props.t('react:customSetsButtonValue')
			),
			e('div', {
				className:'setslist'
			}, 'stuff')
	);
	}
}