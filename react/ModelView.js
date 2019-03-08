'use strict';
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
			`${this.props.viewInfo.path} toolInfo`);
	}

	render() {
		let t = this.props.t;
		return e('div', {id:'model-info-view'},
			e(ToolNameField, {
				viewInfo: this.props.viewInfo,
				infoState: this.props.infoState,
				setInfoState: this.props.setInfoState
			})
		);
	}
}
