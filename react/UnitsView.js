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
			/unitsys.sets get defaultSetName`);
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
				this.props.actions.doCommand(`/unitsys.sets set defaultSetName ${newName}`, (cmd) => {
						this.props.actions.updateViewState(this.props.viewInfo.stackIndex);
				});
			}
			for(let set of results[0].results) {
				let id = 'radio-' + set;
				const checked = defaultName == set.toLowerCase();
				let comp = e('div', { key: set },
					e('input', {
						id: id,
						style: {
							marginLeft: '15px',
							marginRight: '25px'
						},
						onChange: handleChange,
						checked: checked,
						type: 'radio',
						name: 'defaultSet',
						value: set
					}),
					e('label', {
						style: {
							color: checked ? 'black' : 'blue',
							fontWeight: checked ? 'bold' : 'normal',
							width: '100%'
						},
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
		const buttonStyle = (area) => {
			return {
				gridArea: area,
				color: 'blue',
				justifySelf: 'center',
				alignSelf: 'center',
				fontSize: '10pt',
				height: '30px'
			}
		}
		return e('div', {
				style: {
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gridTemplateRows: '40px 1fr',
					gridTemplateAreas: `"customunits customsets"
						"setslist setslist"`,
					gap: '10px 10px'					
				}
			},
			e('button', {
				style: buttonStyle('customunits'),
				value:'userunits react:userUnitsTitle /unitsys.units',
				onClick: this.handleButtonClick
			},
				t('react:customUnitsButtonValue')
			),
			e('button', {
				style: buttonStyle('customsets'),
				value: 'unitsets react:unitsSetsTitle /unitsys.sets',
				onClick: this.handleButtonClick
				},
				t('react:unitsSetsTitle')
			),
			e('div', {
				style: {area: 'setslist'}
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
		this.setState({input: event.target.dataset.definition});
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
					style: {
						borderBottom: 'solid 1px',
						display: 'grid',
						gridTemplateColumns: '1fr 80px',
						gridTemplateRows: '1fr 1fr',
						gridTemplateAreas: `"definition delete"
							"unittype delete"`
					},
				},
					e('div', {
						style: {
							color: 'blue',
							gridArea: 'definition',
							marginLeft: '10px'						
						},
						onClick: this.handleSelectClick,
						'data-definition': unit.definition	
					},
						unit.definition
					),
					e('div', {
						style: {
							color: 'blue',
							gridArea: 'unittype',
							marginLeft: '10px'
						},
						onClick: this.handleSelectClick,
						'data-definition': unit.definition	
					},
						unit.unitType
					),
					e('button', {
						style: {
							gridArea: 'delete',
							fontSize: '10pt',
							color: 'blue'
						},
						value: unit.name,
						onClick: this.handleButtonClick						
					}, t('react:userUnitsDelete', {}))
				);
				unitList.push(cmp);
			}
		}
		return e('div', {
				id:'userunits-view',
				style: {
					display: 'grid',
					gridTemplateColumns: '1fr',
					gridTemplateRows: '60px 1fr',
					gridTemplateAreas: `"inputsection"
						"unitslist"`,
					height: '100%'					
				}
			},
			e('div', {
					id: 'userunits-input-section',
					style: {
						gridArea: 'inputsection',
						display: 'grid',
						gridTemplateColumns: '80px 1fr',
						gridTemplateRows: '1fr 1fr',
						gridTemplateAreas: `"label input"
							"example example"`						
					}
				},
				e('label', {
						id: 'userunits-input-label',
						style: {
							gridArea: 'label',
							marginLeft: '10px',
							marginTop: '10px'						
						},
						htmlFor: 'userunits-input-field'
					}, t('react:userUnitsDefinition')
				),
				e('input', {
					id: 'userunits-input-field',
					style: {
						gridArea: 'input',
						justifySelf: 'center',
						fontSize: '10pt',
						width: 'calc(100% - 25px)',
						paddingLeft: '5px',
						marginLeft: '10px',
						marginTop: '5px',
						border: 'solid 1px'
					},
					value: this.state.input,
					placeholder: t('react:userUnitsPlaceHolder'),
					onChange: this.handleChange,
					onKeyPress: this.handleKeyPress	
				}),
				e('div', {
					style: {
						gridArea: 'example',
						marginLeft: '10px',
						marginTop: '5px'
					}
				}, t('react:userUnitsExample')
				)
			),
			e('div', {
					style: {
						backgroundColor: 'white',
						height: '100%',
						borderTop: 'solid 1px'
					}	
				},
				unitList
			)
		);
	}
}

/**
 * @class UnitSetsView
 * clone or edit unit sets
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
			`/unitsys.sets listsets`);
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
		let name = event.target.dataset.name;
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
				if (this.state.selected == set.name) 	{
					if (set.isMaster) {
						isMasterSelected = true;
					}
				}
				let cmp = e('div', {
					key: set.name,
					style: {
						borderBottom: 'solid 1px',
						display: 'grid',
						backgroundColor: this.state.selected == set.name ? 'lightgray' : 'white',
						gridTemplateColumns: '1fr 40px',
						gridTemplateRows: '1fr 1fr',
						gridTemplateAreas: `"name info"
							"settype info"`						
					}
				},
					e('div', {
						style: {
							color: 'blue',
							gridArea: 'name',
							marginLeft: '10px',
							fontSize: '14pt'
						},
						onClick: this.handleSelectClick,
						'data-name': set.name
					},
						set.name
					),
					e('div', {
						style: {
							gridArea: 'settype',
							marginLeft: '10px',
							color: 'darkgray'
						},
						onClick: this.handleSelectClick,
						'data-name': set.name
					},
						set.isMaster ? t('react:unitsSetsMaster') : t('react:unitsSetsUser')
					),
					set.isMaster ? '' :
						e('div', {
							style: { gridArea: 'info'},
						},
							e('button', {
								style: {
									marginTop: '15px',
									fontSize: '10pt',
									fontWeight: 'bold',
									color: 'blue'
								},
								value: set.name,
								onClick: this.handleInfoClick						
							}, t('react:unitsSetsInfo'))
						)
				);
				setList.push(cmp);
			}
		}
		return e('div', {
				id:'usersets-view',
				style: {
					display: 'grid',
					gridTemplateColumns: '1fr',
					gridTemplateRows: '60px 1fr',
					gridTemplateAreas: `"inputsection"
						"unitslist"`,
					height: '100%'
				}
			},
			e('div', {
					id: 'usersets-input-section',
					style: {
						gridArea: 'inputsection',
						display: 'grid',
						gridTemplateColumns: '1fr 5fr 1f',
						gridTemplateRows: '30px',
						gridTemplateAreas: `"label input clone"`						
					}
				},
				e('label', {
					id: 'usersets-name-label',
					style: {
						gridArea: 'label',
						marginLeft: '10px',
						marginTop: '10px'
					},
					htmlFor: 'usersets-name-field'
				}, t('react:unitsSetName')
				),
				e('input', {
					id: 'usersets-name-field',
					style: {
						gridArea: 'input',
						justifySelf: 'center',
						fontSize: '10pt',
						width: 'calc(100% - 25px)',
						paddingLeft: '5px',
						marginLeft: '10px',
						marginTop: '5px',
						border: 'solid 1px'
					},
					value: this.state.input,
					placeholder: '',
					onChange: this.handleChange,
					onKeyPress: this.handleKeyPress,
					readOnly: isMasterSelected
				}),
				e('button', {
					id: 'usersets-clone-button',
					style: {
						color: 'blue',
						fontSize: '10pt'
					},
					onClick: this.handleCloneClick,
					disabled: !(this.state.input && this.state.input == this.state.selected)
				}, t('react:unitsSetsClone')
				)
			),
			e('div', {
				id: 'usersets-list',
				style: {
					backgroundColor: 'white',
					height: '100%',
					borderTop: "solid 1px"
				},
				onClick: this.handleClearClick
			},
				setList
			)
		);
	}
}

/**
 * @class UnitSetView
 * edit user unit set
 */
export class UnitSetView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			selected: '',
			nameInput: '',
			unitInput: ''
		};
		this.handleChange = this.handleChange.bind(this);
		this.handleKeyPress = this.handleKeyPress.bind(this);
		this.handleAddTypeClick = this.handleAddTypeClick.bind(this);
		this.handleDeleteSetClick = this.handleDeleteSetClick.bind(this);
		this.handleDeleteTypeClick = this.handleDeleteTypeClick.bind(this);
		this.handleSelectClick = this.handleSelectClick.bind(this);
	}

	componentDidMount() {
		let viewInfo = this.props.viewInfo;
		this.props.actions.setUpdateCommands(viewInfo.stackIndex,
			`${viewInfo.path} listtypes`);
	}

		/** @method handleChange
	 * keeps input field in sync
	 * @param {Event} event
	 */
  handleChange(event) {
		if (event.target.id == 'userset-name-field') {
			this.setState({nameInput: event.target.value});
		}
		else {
			this.setState({unitInput: event.target.value});
		}
	}

	/** @method handleKeyPress
	 * watches for Enter and sends command when it see it
	 * @param {Event} event
	 */
	handleKeyPress(event) {
		if (event.key == 'Enter') {
			let name = this.state.nameInput;
			let unit = this.state.unitInput;
			if (name.length && unit.length) {
				this.props.actions.doCommand(`${this.props.viewInfo.path} addtype ${name} ${unit}`, (cmds) => {
					if (!cmds.error) {
						this.setState({
							selected: '',
							nameInput: '',
							unitInput: ''				
						});
					}
					this.props.actions.updateViewState(this.props.viewInfo.stackIndex);
				});
			}
		}
	}

	/** @method handleAddTypeClick
	* click to clear the input fields so new type can be defined
	*/
	handleAddTypeClick(event) {
		this.setState({
			selected: '',
			nameInput: '',
			unitInput: ''
		});
		event.stopPropagation();
	}

	/** @method handleDeleteSetClick
	* click to delete the user set
	*/
	handleDeleteSetClick(event) {
		let pathParts = this.props.viewInfo.path.split('.');
		let name = pathParts[pathParts.length - 1];
		this.props.actions.doCommand(`/unitsys.sets remove ${name}`, (cmds) => {
			this.props.actions.popView();
		});
		event.stopPropagation();
	}

	/** @method handleSelectClick
	* click to select the unit type and fill in the input fields
	*/
	handleSelectClick(event) {
		let name = event.target.dataset.name;
		let unit = event.target.dataset.unit;
		this.setState({
			selected: name,
			nameInput: name,
			unitInput: unit
		});
		event.stopPropagation();
	}

	/** @method handleDeleteTypeClick
	* click to delete the unit type
	*/
	handleDeleteTypeClick(event) {
		let name = event.target.value;
		if (name == this.state.selected) {
			this.setState({selected: '',
				nameInput: '',
				unitInput: ''
			});
		}
		this.props.actions.doCommand(`${this.props.viewInfo.path} removetype ${name}`, (cmds) => {
			this.props.actions.updateViewState(this.props.viewInfo.stackIndex);
		});
		event.stopPropagation();
	}

	render() {
		let t = this.props.t;
		let typeList = [];
		let results = this.props.viewInfo.updateResults;
		const inputHeight = 100;
		const listHeight = this.props.infoHeight - inputHeight - 10;
		if (results && results.length) {
			let types = results[0].results;
			for (let i = 0; i < types.length; i++) {
				let unitType = types[i];
				let containerStyle = {
					borderBottom: 'solid 1px',
					display: 'grid',
					gridTemplateColumns: '1fr 80px',
					gridTemplateRows: '1fr 1fr',
					gridTemplateAreas: `"name delete"
						"unit delete"`,
				};
				if (this.state.selected == unitType.name) 	{
					containerStyle['backgroundColor'] = ' lightgray';
				}
				let cmp = e('div', {
					key: unitType.name,
					style: containerStyle,
					},
					e('div', {
						style: {
							gridArea: 'name',
							marginLeft: '5px',
							fontSize: '14pt',
							color: 'blue'
						},
						'data-name': unitType.name,
						'data-unit': unitType.unit,
						onClick: this.handleSelectClick,
					},
						unitType.name
					),
					e('div', {
						style: {
							gridArea: 'unit',
							marginLeft: '5px',
							color: 'blue'
						},
						'data-name': unitType.name,
						'data-unit': unitType.unit,
						onClick: this.handleSelectClick,
					},
						unitType.unit
					),
					e('div', {
						style: {
							gridArea: 'delete',
							alignSelf: 'center',
							height: '100%'
						},
					},
						e('button', {
							style: {
								fontSize: '10pt',
								fontWeight: 'bold',
								marginTop: '10px',
								color: 'blue'
							},
							value: unitType.name,
							onClick: this.handleDeleteTypeClick						
						}, t('react:unitsSetDeleteType'))
					)
				);
				typeList.push(cmp);
			}
		}
		const inputButtonStyle = {
			fontSize: '12pt',
			width: '140px',
			marginRight: '10px',
			color: 'blue'
		}

		const inputStyle = (area) => {
			return {
				gridArea: area,
				justifySelf: 'center',
				fontSize: '10pt',
				width: 'calc(100% - 25px)',
				height: '25px',
				paddingLeft: "5px",
				border: 'solid 1px'
			}
		};

		return e('div', {
				id:'userset-view',
				style: {
					display: 'grid',
					gridTemplateColumns: '1fr',
					gridTemplateRows: '100px 1fr',
					gridGap: '5px',
					gridTemplateAreas: `"inputsection"
						"unitslist"`,
					height: '100%'
				}
			},
			e('div', {
					id: 'userset-input-section',
					style: {
						gridArea: 'inputsection',
						display: 'grid',
						gridTemplateColumns: '60px 1fr',
						gridTemplateRows: '1fr 1fr 1fr',
						gridTemplateAreas: `"buttons buttons"
							"namelabel namefield"
							"unitlabel unitfield"`						
					}
				},
				e('label', {
						style: {
							gridArea: 'namelabel',
							paddingLeft: '5px'
						},
						htmlFor: 'userset-name-field'
					}, t('react:unitsSetTypeName')
				),
				e('input', {
					id: 'userset-name-field',
					style: inputStyle('namefield'),
					value: this.state.nameInput,
					placeholder: '',
					onChange: this.handleChange,
					onKeyPress: this.handleKeyPress,
				}),
				e('label', {
					id: 'userset-unit-label',
					style: {
						gridArea: 'unitlabel',
						paddingLeft: '5px'
					},
					htmlFor: 'userset-unit-field'
				}, t('react:unitsSetUnitName')
				),
				e('input', {
					id: 'userset-unit-field',
					style: inputStyle('unitfield'),
					value: this.state.unitInput,
					placeholder: '',
					onChange: this.handleChange,
					onKeyPress: this.handleKeyPress,
				}),
				e('div', {
					id: 'userset-buttons',
					style: {
						gridArea: 'buttons',
						justifySelf: 'end',
						alignSelf: 'center'
					}
				},
					e('button', {
						style: inputButtonStyle,
						onClick: this.handleDeleteSetClick,
					}, t('react:unitsSetDeleteSet')
					),
					e('button', {
						style: inputButtonStyle,
						onClick: this.handleAddTypeClick,
					}, t('react:unitsSetAddType')
					)
				)
			),
			e('div', {
				id: 'userset-list',
				style: {
					gridArea: 'unitslist',
					backgroundColor: 'white',
					height: `${listHeight}px`,
					borderTop: 'solid 1px',
					overflow: 'auto',
					boxSizing: 'border-box'
				}
			},	typeList)
		);
	}
}
