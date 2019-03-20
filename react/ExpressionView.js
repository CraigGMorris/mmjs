'use strict';

import {ToolNameField} from './MMApp.js';

const e = React.createElement;

/**
 * @class ExpressionView
 * info view for expression
 */
export class ExpressionView extends React.Component {
	constructor(props) {
		super(props);
	}

	componentDidMount() {
		this.props.actions.setUpdateCommands(this.props.viewInfo.stackIndex,
			`${this.props.viewInfo.path} toolViewInfo`);
	}

	render() {
		let t = this.props.t;
		return e('div', {
			style: {
				height: '100%',
				fontSize: '1em',
				display: 'grid',
				gridTemplateColumns: '1fr',
				gridTemplateRows: '50px 1fr',
				gridTemplateAreas: `"name"
					"other"`
			}
		},
			e(ToolNameField, {
				style: {
					gridArea: 'name'
				},
				t: t,
				viewInfo: this.props.viewInfo,
				actions: this.props.actions
			}),
			e('div', {}, 'Some Expression stuff')
		);
	}
}
