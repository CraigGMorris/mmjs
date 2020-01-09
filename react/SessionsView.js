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
		this.props.actions.setUpdateCommands(this.props.viewInfo.stackIndex,
			`/ listsessions`);
	}

	render() {
		let t = this.props.t;
		let results = this.props.viewInfo.updateResults;
		let sessionPaths = (results.length) ? results[0].results : [];
		let sessionList = [];
		let key = 0;
		let loadSession = async e => {
			await this.props.actions.doCommand(
				`/ load ${e.target.getAttribute('value')}`,
				(cmds) => {
					this.props.actions.resetInfoStack('root');
					this.props.updateDiagram(true);
				}
			);
		}
		for (let path of sessionPaths) {
			let cmp = e(
				'div', {
					className: 'sessions__entry',
					key: key++,
					value: path,
					onClick: loadSession,
				},
				path
			)
			sessionList.push(cmp);
		}
		return e(
			'div', {
				id: 'sessions-wrapper',
			},
			e(
				'div', {
					id: 'sessions-header'
				},
				e(
					'button', {
						id: 'sessions__new-button',
						onClick: async e => {
							await this.props.actions.doCommand(
								`/ new`,
								(cmds) => {
									this.props.actions.resetInfoStack('root');
									this.props.updateDiagram(true);
								}
							);			
						},
					},
					t('react:sessionsNewButton')
				),
				e(
					'button', {
						id: 'sessions__save-button',
						onClick: async e => {
							await this.props.actions.doCommand(
								`/ save`,
								(cmds) => {
									this.props.actions.popView();
								}
							);			
						},
					},
					t('react:sessionsSaveButton')
				)
			),
			e(
				'div', {
					id: 'sessions-list',
				},
				sessionList
			)
		);
	}
}
