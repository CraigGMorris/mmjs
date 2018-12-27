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
						id: 'readlabel clickable',
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
				value:'userunits react:userUnitsTitle /unitsys.units',
				onClick: this.handleButtonClick
			},
				t('react:customUnitsButtonValue')
			),
			e('button', {
				id:'unitsview-customsets-button',
				value: 'unitsets react:unitsSetsTitle /unitsys.sets',
				onClick: this.handleButtonClick
				},
				t('react:unitsSetsTitle')
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
						className: 'userunits-item-definition clickable',
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

/**
 * @class UnitSetsView
 * add or edit user units
 */
export class UnitSetsView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			selected: '',
			input: '',
		};
		this.handleChange = this.handleChange.bind(this);
		this.handleKeyPress = this.handleKeyPress.bind(this);
		this.handleInfoClick = this.handleInfoClick.bind(this);
		this.handleCloneClick = this.handleCloneClick.bind(this);
		this.handleSelectClick = this.handleSelectClick.bind(this);
		this.handleClearClick = this.handleClearClick.bind(this);
	}

	componentDidMount() {
		this.props.actions.setUpdateCommands(this.props.viewInfo.stackIndex,
			`/unitsys.sets listsettypes`);
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
			this.props.actions.doCommand(`/unitsys.sets.${this.state.selected} renameto ${this.state.input}`, (cmds) => {
				this.props.actions.updateViewState(this.props.viewInfo.stackIndex);
			});
		}
	}

	/** @method handleInfoClick
	* info button handler
	*/
	handleInfoClick(event) {
		let setName = event.target.value;
		this.props.actions.pushView('unitset', setName, `/unitsys.sets.${setName}`);
		event.stopPropagation();
	}

	/** @method handleCloneClick
	* clone button handler
	*/
	handleCloneClick(event) {
		if (this.state.input == this.state.selected) {
			this.props.actions.doCommand(`/unitsys.sets clone ${this.state.input}`, (cmds) => {
				if (cmds.length) {
					let newName = cmds[0].results;
					this.setState({selected: newName, input: newName});
				}
				this.props.actions.updateViewState(this.props.viewInfo.stackIndex);
			})
		}
		event.stopPropagation()
	}

	/** @method handleSelectClick
	* click on set selects it
	*/
	handleSelectClick(event) {
		let name = event.target.innerText;
		this.setState({selected: name, input: name});
		event.stopPropagation();
	}

	/** @method handleClearClick
	* click on list outside of set clears selection
	*/
	handleClearClick(event) {
		this.setState({selected: '', input: ''});
	}

	render() {
		let t = this.props.t;
		let setList = [];
		let results = this.props.viewInfo.updateResults;
		let isMasterSelected = false;
		if (results && results.length) {
			let sets = results[0].results;
			for (let i = 0; i < sets.length; i++) {
				let set = sets[i];
				let containerClass = 'usersets-item-div';
				if (this.state.selected == set.name) 	{
					containerClass += ' usersets-selected';
					if (set.isMaster) {
						isMasterSelected = true;
					}
				}
				let cmp = e('div', {
					key: set.name,
					className: containerClass,
				},
					e('div', {
						className: 'usersets-item-name clickable',
						onClick: this.handleSelectClick,
					},
						set.name
					),
					e('div', { className: 'usersets-item-type'},
						set.isMaster ? t('react:unitsSetsMaster') : t('react:unitsSetsUser')
					),
					set.isMaster ? '' :
						e('div', {
							className: 'usersets-info',
						},
							e('button', {
								value: set.name,
								onClick: this.handleInfoClick						
							}, t('react:unitsSetsInfo'))
						)
				);
				setList.push(cmp);
			}
		}
		return e('div', {id:'usersets-view'},
			e('div', {id: 'usersets-input-section'},
				e('label', {
					id: 'usersets-name-label',
					htmlFor: 'usersets-name-field'
				}, t('react:unitsSetName')
				),
				e('input', {
					id: 'usersets-name-field',
					value: this.state.input,
					placeholder: '',
					onChange: this.handleChange,
					onKeyPress: this.handleKeyPress,
					readOnly: isMasterSelected
				}),
				e('button', {
					id: 'usersets-clone-button',
					onClick: this.handleCloneClick,
					disabled: !(this.state.input && this.state.input == this.state.selected)
				}, t('react:unitsSetsClone')
				)
			),
			e('div', {
				id: 'usersets-list',
				onClick: this.handleClearClick
			},
				setList
			)
		);
	}
}