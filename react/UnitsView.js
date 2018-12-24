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
		//this.updateState();
	}

	componentDidMount() {
		this.props.actions.setUpdateCommands(this.props.viewInfo.stackIndex,
			`/unitsys.sets list
			/unitsys.sets get default`);
	}

	setsList(results) {
		let list = [];
		if (results.length > 1 && results[0].results) {
			let defaultName = results[1].results.toLowerCase();
			let handleChange = (event) => {
				let newName = event.target.value;
				this.props.actions.doCommand(`/unitsys.sets set default ${newName}`, (cmd) => {
						this.props.actions.updateViewState(this.props.viewInfo.stackIndex);
				});
			}
			for(let set of results[0].results) {
				let id = 'radio-' + set;
				let comp = e('div', { key: set },
					e('input', {
						id: id,
						onChange: handleChange,
						checked: (defaultName == set.toLowerCase()),
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
		}
		return list;
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
				this.setsList(this.props.viewInfo.updateResults)
			)
	);
	}
}