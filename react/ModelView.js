'use strict';

import {ToolNameField} from './MMApp.js';

const e = React.createElement;

/**
 * @class ModelView
 * info view for model
 */
export class ModelView extends React.Component {
	constructor(props) {
		super(props);
	}

	componentDidMount() {
		this.props.actions.setUpdateCommands(this.props.viewInfo.stackIndex,
			`${this.props.viewInfo.path} toolViewInfo`);
	}

	render() {
		let t = this.props.t;
		const inputHeight = this.props.actions.defaults().grid.inputHeight;
		return e(
			'div', {
				style: {
					paddingLeft: '3px',
					paddingRight: '3px',
					height: '100%',
					fontSize: '1em',
					display: 'grid',
					gridTemplateColumns: '1fr',
					gridTemplateRows: `${inputHeight} 1fr`,
					gridTemplateAreas: `"name"
						"other"`
				}
			},
			e(
				'div', {
					style: {
						gridArea: 'name'
					},
				},
				e(
					ToolNameField, {
						t: t,
						viewInfo: this.props.viewInfo,
						actions: this.props.actions
					}
				)
			),
			e('div', {}, 'Some stuff')
		);
	}
}
