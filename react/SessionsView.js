'use strict';

const e = React.createElement;

/**
 * @class SessionsView
 * view for managing sessions
 */
export class SessionsView extends React.Component {
	constructor(props) {
		super(props);
	}

	componentDidMount() {
//		this.props.actions.setUpdateCommands(this.props.viewInfo.stackIndex,
//			`${this.props.viewInfo.path} toolViewInfo`);
	}

	render() {
		let t = this.props.t;
		return e(
			'div', {},
				e('div', {}, 'Some stuff')
		);
	}
}
