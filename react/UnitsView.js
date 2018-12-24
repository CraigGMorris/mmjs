'use strict';

const e = React.createElement;

/**
 * @class UnitsView
 * select unit sets or customize units or unit sets
 */
export class UnitsView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			setsList: [],
			defaultSet: ''
		};
		this.handleUpdateState = this.handleUpdateState.bind(this);
		this.updateState();

	}

	updateState() {
		this.props.actions.doCommand(
			`/unitsys.sets list
			/unitsys.sets get default`,
			(cmd) => {
			if (cmd.length > 1 && cmd[0].results) {
				let defaultName = cmd[1].results;
				this.setState({defaultSet: (defaultName) ? defaultName.toLowerCase() : ''});
				let list = [];
				let handleChange = (event) => {
					let newName = event.target.value;
					this.props.actions.doCommand(`/unitsys.sets set default ${newName}`, (cmd) => {
						this.updateState();
					});
				}
				for(let set of cmd[0].results) {
					let id = 'radio-' + set;
					let comp = e('div', { key: set },
						e('input', {
							id: id,
							onChange: handleChange,
							checked: (this.state.defaultSet == set.toLowerCase()),
							type: 'radio',
							name: 'defaultSet',
							className: 'unitsview-defaultset',
							value: set
						}),
						e('label', {
							id: 'readlabel',
							htmlFor: id
						}, set)
					);
					list.push(comp);
				}
				this.setState({setsList: list});
			}
		})
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
			},
				this.state.setsList
			)
	);
	}
}