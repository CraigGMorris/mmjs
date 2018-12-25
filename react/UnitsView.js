'use strict';

const e = React.createElement;

/**
 * @class UnitsView
 * select unit sets or customize units or unit sets
 */
export class UnitsView extends React.Component {
	constructor(props) {
		super(props);
		this.handleButtonClick = this.handleButtonClick.bind(this);
		this.state = {
			setsList: [],
			defaultSet: ''
		};
	}

	componentDidMount() {
		this.props.actions.setUpdateCommands(this.props.viewInfo.stackIndex,
			`/unitsys.sets list
			/unitsys.sets get default`);
	}

	handleButtonClick(event) {
		let parts = event.target.value.split(' ');
		this.props.actions.pushView(parts[0], parts[1], parts[3], );
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
				value:'userunits react:userUnitsTitle /units',
				onClick: this.handleButtonClick
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

/**
 * @class UserUnitsView
 * add or edit user units
 */
export class UserUnitsView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			unitsList: [],
			input: '',
		};
		this.handleChange = this.handleChange.bind(this);
		this.handleKeyPress = this.handleKeyPress.bind(this);
		this.handleButtonClick = this.handleButtonClick.bind(this);
		this.handleSelectClick = this.handleSelectClick.bind(this);
	}

	componentDidMount() {
		this.props.actions.setUpdateCommands(this.props.viewInfo.stackIndex,
			`/unitsys.units listuserunits`);
	}

	/** @method handleChange
	 * keeps input field in sync
	 * @param {Event} event
	 */
  handleChange(event) {
		this.setState({input: event.target.value});
	}
	
	/** @method handleKeyPress
	 * watches for Enter and sends command when it see it
	 * @param {Event} event
	 */
	handleKeyPress(event) {
		if (event.key == 'Enter') {
			this.props.actions.doCommand(`/unitsys.units adduserunit ${this.state.input}`, (cmds) => {
				this.props.actions.updateViewState(this.props.viewInfo.stackIndex);
			});
			this.setState({input:''});
		}
	}

	/** @method handleButtonClick
	* delete button handler
	*/
	handleButtonClick(event) {
		this.props.actions.doCommand(`/unitsys.units remove ${event.target.value}`, (cmds) => {
			this.props.actions.updateViewState(this.props.viewInfo.stackIndex);
		});
	}

	/** @method handleSelectClick
	* click on unit puts definition in input
	*/
	handleSelectClick(event) {
		this.setState({input: event.target.innerText});
	}

	render() {
		let t = this.props.t;
		let unitList = [];
		let results = this.props.viewInfo.updateResults;
		if (results && results.length) {
			let units = results[0].results;
			for (let i = 0; i < units.length; i++) {
				let unit = units[i];
				let cmp = e('div', {
					key: unit.name,
					className: 'userunits-item-div',
				},
					e('div', {
						className: 'userunits-item-definition',
						onClick: this.handleSelectClick,
						value: unit.definition	
					},
						unit.definition
					),
					e('div', { className: 'userunits-item-type'},
						unit.unitType
					),
					e('button', {
						className: 'userunits-delete',
						value: unit.name,
						onClick: this.handleButtonClick						
					}, t('react:userUnitsDelete', {}))
				);
				unitList.push(cmp);
			}
		}
		return e('div', {id:'userunits-view'},
			e('div', {id: 'userunits-input-section'},
				e('label', {
					id: 'userunits-input-label',
					htmlFor: 'userunits-input-field'
				}, t('react:userUnitsDefinition')
				),
				e('input', {
					id: 'userunits-input-field',
					value: this.state.input,
					placeholder: t('react:userUnitsPlaceHolder'),
					onChange: this.handleChange,
					onKeyPress: this.handleKeyPress	
				}),
				e('div', {
					id: 'userunits-example'
				}, t('react:userUnitsExample')
				)
			),
			e('div', {id: 'userunits-list'},
				unitList
			)
		);
	}
}
