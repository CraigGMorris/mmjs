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
		/*
		this.handleChange = this.handleChange.bind(this);
		this.handleKeyPress = this.handleKeyPress.bind(this);
		this.readCommandFile = this.readCommandFile.bind(this);
		this.callBack = this.callBack.bind(this);
		this.props.doCommand('info', this.callBack);
		*/
	}

	render() {
		return e('div', {className:'units-view'},
			e('div', {className:'unitsview-custom'},
				e('button', {
					className:'unitsview-customunits-button',
					},
					this.t('react:customUnitsButtonValue')
				),
				e('button', {
					className:'unitsview-customsets-button',
					},
					this.t('react:customSetsButtonValue')
				)
			)
		);
	}
}