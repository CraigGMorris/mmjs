// @ts-check
/*
	This file is part of Math Minion, a javascript based calculation program
	Copyright 2021, Craig Morris

	Math Minion is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Math Minion is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with Math Minion.  If not, see <https://www.gnu.org/licenses/>.
*/
'use strict';

/** @typedef {import('./MMApp.js').ViewProps} ViewProps */
/** @typedef {import('./MMApp.js').Actions} Actions */
/** @typedef {import('./MMApp.js').ViewInfo} ViewInfo */

/**
 * @typedef {Object} UnitPickerProps
 * @property {(key: string, options?: any) => string} t
 * @property {Actions} actions
 * @property {string} [unitName]
 * @property {string} [unitType]
 * @property {(unit: string, index: number) => void} apply
 * @property {() => void} cancel
 */

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

/**
 * @class UnitsView
 * select unit sets or customize units or unit sets
 * @extends {React.Component<ViewProps, any>}
 */
export class UnitsView extends React.Component {
	/** @param {ViewProps} props */
	constructor(props) {
		super(props);
		this.state = {
			setsList: [],
			defaultSet: ''
		};
	}

	componentDidMount() {
		this.props.actions.setUpdateCommands(this.props.viewInfo.stackIndex,
			`/unitsys.sets list
'''
			/unitsys.sets get defaultSetName`);
	}

	/** @param {any} results */
	setsList(results) {
		let list = [];
		if (results.length > 1 && results[0].results) {
			let defaultName = results[1].results.toLowerCase();
			for(let set of results[0].results) {
				let id = 'radio-' + set;
				const checked = defaultName == set.toLowerCase();
				let comp = e(
					'div', {
						className: 'units__set-select',
						key: set
					},
					e('input', {
						id: id,
						onChange: (/** @type {any} */ event) => {
							let newName = event.target.value;
							this.props.actions.doCommand(`/unitsys.sets set defaultSetName ${newName}`, () => {
									this.props.actions.updateView(this.props.viewInfo.stackIndex);
							});
						},
						checked: checked,
						type: 'radio',
						name: 'defaultSet',
						value: set
					}),
					e('label', {
						className: checked ? 'units__label--checked' : 'units__label',
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
		return e(
			'div', {
				id: 'units',
			},
			e(
				'button', {
					id: 'units__custom-units-button',
					onClick: () => {
						this.props.actions.pushView('userunits', 'react:userUnitsTitle', {path: '/unitsys.units'} );
					}
				},
				t('react:customUnitsButtonValue')
			),
			e(
				'button', {
					id: 'units__custom-sets-button',
					onClick: () => {
						this.props.actions.pushView('unitsets', 'react:unitsSetsTitle', {path: '/unitsys.sets'} );
					}
				},
				t('react:unitsSetsTitle')
			),
			e('div', {
				id: 'units__sets-list',
			},
				this.setsList(this.props.viewInfo.updateResults)
			)
	);
	}
}

/**
 * @class UserUnitsView
 * add or edit user units
 * @extends {React.Component<ViewProps, any>}
 */
export class UserUnitsView extends React.Component {
	/** @param {ViewProps} props */
	constructor(props) {
		super(props);
		this.state = {
			input: '',
		};
		this.handleSelectClick = this.handleSelectClick.bind(this);
	}

	componentDidMount() {
		this.props.actions.setUpdateCommands(this.props.viewInfo.stackIndex,
			`/unitsys.units listuserunits`);
	}

	/** @method handleSelectClick
	* click on unit puts definition in input
	* @param {any} event
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
				let cmp = e(
						'div', {
							className: 'user-units__unit',
						key: unit.name,
					},
					e(
						'div', {
							className: 'user-units__definition',
							onClick: this.handleSelectClick,
							'data-definition': unit.definition	
						},
						unit.definition
					),
					e(
						'div', {
							className: 'user-units__type',
							onClick: this.handleSelectClick,
							'data-definition': unit.definition	
						},
						unit.unitType
					),
					e(
						'button', {
							className: 'user-units__delete',
							onClick: () => {
								this.props.actions.doCommand(`/unitsys.units remove ${unit.name}`, () => {
									this.props.actions.updateView(this.props.viewInfo.stackIndex);
								});
							}						
						}, 
						t('react:userUnitsDelete', {})
					)
				);
				unitList.push(cmp);
			}
		}
		return e(
			'div', {
				id:'user-units',
			},
			e(
				'div', {
					id: 'user-units__input-section',
				},
				e(
					'label', {
						id: 'user-units__input-label',
						htmlFor: 'userunits-input-field'
					}, t('react:userUnitsDefinition')
				),
				e(
					'input', {
						id: 'user-units__input',
						value: this.state.input,
						placeholder: t('react:userUnitsPlaceHolder'),
						onChange: (/** @type {any} */ event) => {
							// keeps input field in sync
							this.setState({input: event.target.value});
						},
						onKeyDown: (/** @type {any} */ event) => {
							// watches for Enter and sends command when it see it
							if (event.code == 'Enter') {
								this.props.actions.doCommand(`/unitsys.units adduserunit ${this.state.input}`, () => {
									this.props.actions.updateView(this.props.viewInfo.stackIndex);
								});
								this.setState({input:''});
							}
						}
					}
				),
				e(
					'div', {
						id: 'user-units__example',
					},
					t('react:userUnitsExample')
				)
			),
			e(
				'div', {
					id: 'user-units__unit-list',
				},
				unitList
			)
		);
	}
}

/**
 * @class UnitSetsView
 * clone or edit unit sets
 * @extends {React.Component<ViewProps, any>}
 */
export class UnitSetsView extends React.Component {
	/** @param {ViewProps} props */
	constructor(props) {
		super(props);
		this.state = {
			selected: '',
			input: '',
		};
		this.handleSelectClick = this.handleSelectClick.bind(this);
	}

	componentDidMount() {
		this.props.actions.setUpdateCommands(this.props.viewInfo.stackIndex,
			`/unitsys.sets listsets`);
	}
	
	/** @method handleSelectClick
	* click on set selects it
	* @param {any} event
	*/
	handleSelectClick(event) {
		let name = event.target.dataset.name;
		this.setState({selected: name, input: name});
		event.stopPropagation();
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
				let cmp = e(
					'div', {
						className: `unit-sets__row${this.state.selected == set.name ? ' entry--selected' : ''}`,
						key: set.name,
					},
					e(
						'div', {
							className: 'unit-sets__list-set-name',
							onClick: this.handleSelectClick,
							'data-name': set.name
						},
						set.name
					),
					e(
						'div', {
							className: 'unit-sets__list-set-type',
							onClick: this.handleSelectClick,
							'data-name': set.name
						},
						set.isMaster ? t('react:unitsSetsMaster') : t('react:unitsSetsUser')
					),
					set.isMaster ? '' :
						e(
							'button', {
								id: 'unit-sets__info',
								value: set.name,
								onClick: (/** @type {any} */ event) => {
									let setName = event.target.value;
									this.props.actions.pushView('unitset', setName, {path: `/unitsys.sets.${setName}`});
									event.stopPropagation();
								}						
							},
							t('react:unitsSetsInfo')
						)
				);
				setList.push(cmp);
			}
		}
		return e(
			'div', {
				id:'unit-sets',
			},
			e(
				'div', {
					id: 'unit-sets__input-section',
				},
				e(
					'label', {
						id: 'unitsets__name-label',
						htmlFor: 'usersets-name-field'
					},
					t('react:unitsSetName')
				),
				e(
					'input', {
						id: 'unit-sets__name-field',
						placeholder: '',
						value: this.state.input,
						width: (/** @type {any} */ (this.props.infoWidth)) - 25,
						onChange: (/** @type {any} */ event) => {
							// keeps input field in sync
							this.setState({input: event.target.value});
						},
						onKeyDown: (/** @type {any} */ event) => {
							// watches for Enter and sends command when it see it
							if (event.code == 'Enter') {
								this.props.actions.doCommand(`/unitsys.sets.${this.state.selected} renameto ${this.state.input}`, () => {
									this.props.actions.updateView(this.props.viewInfo.stackIndex);
								})
							}
						},
						readOnly: isMasterSelected
					}
				),
				e(
					'button', {
						id: 'unit-sets__clone-button',
						onClick: (/** @type {any} */ event) => {
							if (this.state.input == this.state.selected) {
								this.props.actions.doCommand(`/unitsys.sets clone ${this.state.input}`, (/** @type {any} */ cmds) => {
									if (cmds.length) {
										let newName = cmds[0].results;
										this.setState({selected: newName, input: newName});
									}
									this.props.actions.updateView(this.props.viewInfo.stackIndex);
								})
							}
							event.stopPropagation()
						},
						disabled: !(this.state.input && this.state.input == this.state.selected)
					},
					t('react:unitsSetsClone')
				)
			),
			e(
				'div', {
					id: 'unit-sets__list',
					onClick: () => {
						// click on list outside of set clears selection
						this.setState({selected: '', input: ''});
					}
				},
				setList
			)
		);
	}
}

/**
 * @class UnitSetView
 * edit user unit set
 * @extends {React.Component<ViewProps, any>}
 */
export class UnitSetView extends React.Component {
	/** @param {ViewProps} props */
	constructor(props) {
		super(props);
		this.state = {
			selected: '',
			nameInput: '',
			unitInput: ''
		};
		this.handleKeyDown = this.handleKeyDown.bind(this);
		this.handleSelectClick = this.handleSelectClick.bind(this);
	}

	componentDidMount() {
		let viewInfo = this.props.viewInfo;
		this.props.actions.setUpdateCommands(viewInfo.stackIndex,
			`${viewInfo.path} listtypes`);
	}

	/** @method handleKeyDown
	 * watches for Enter and sends command when it see it
	 * @param {any} event
	 */
	handleKeyDown(event) {
		if (event.code == 'Enter') {
			let name = this.state.nameInput;
			let unit = this.state.unitInput;
			if (name.length && unit.length) {
				this.props.actions.doCommand(`${this.props.viewInfo.path} addtype ${name} ${unit}`, (/** @type {any} */ cmds) => {
					if (!cmds.error) {
						this.setState({
							selected: '',
							nameInput: '',
							unitInput: ''				
						});
					}
					this.props.actions.updateView(this.props.viewInfo.stackIndex);
				});
			}
		}
	}

	/** @method handleSelectClick
	* click to select the unit type and fill in the input fields
	* @param {any} event
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

	render() {
		let t = this.props.t;
		let typeList = [];
		let results = this.props.viewInfo.updateResults;
		if (results && results.length) {
			let types = results[0].results;
			for (let i = 0; i < types.length; i++) {
				let unitType = types[i];
				let cmp = e(
					'div', {
						className: `unit-set__row${this.state.selected == unitType.name ? ' entry--selected' : ''}`,
						key: unitType.name,
						},
						e(
							'div', {
								className: 'unit-set__name',
								'data-name': unitType.name,
								'data-unit': unitType.unit,
								onClick: this.handleSelectClick,
							},
							unitType.name
						),
						e(
							'div', {
								className: 'unit-set__unit',
								'data-name': unitType.name,
								'data-unit': unitType.unit,
								onClick: this.handleSelectClick,
							},
							unitType.unit
						),
						e(
							'button', {
								className: 'unit-set__delete',
								value: unitType.name,
								onClick: (/** @type {any} */ event) => {
									// click to delete the unit type
									let name = event.target.value;
									if (name == this.state.selected) {
										this.setState({selected: '',
											nameInput: '',
											unitInput: ''
										});
									}
									this.props.actions.doCommand(`${this.props.viewInfo.path} removetype ${name}`, () => {
										this.props.actions.updateView(this.props.viewInfo.stackIndex);
									});
									event.stopPropagation();
								}						
							},
							t('react:unitsSetDeleteType')
						)
				);
				typeList.push(cmp);
			}
		}

		return e(
			'div', {
				id:'unit-set',
			},
			e(
				'div', {
					id: 'unit-set__input-section',
				},
				e(
					'label', {
						id: 'unit-set__name-label',
						htmlFor: 'userset-name-field'
					}, t('react:unitsSetTypeName')
				),
				e(
					'input', {
						id: 'unit-set___name-field',
						value: this.state.nameInput,
						placeholder: '',
						onChange: (/** @type {any} */ event) => {
							// keeps input field in sync
							this.setState({nameInput: event.target.value});
						},
						onKeyDown: this.handleKeyDown,
					}
				),
				e(
					'label', {
						id: 'unit-set__unit-label',
						htmlFor: 'userset-unit-field'
					},
					t('react:unitsSetUnitName')
				),
				e(
					'input', {
						id: 'unitset__unit-field',
						value: this.state.unitInput,
						placeholder: '',
						onChange: (/** @type {any} */ event) => {
							// keeps input field in sync
							this.setState({unitInput: event.target.value});
						},
						onKeyDown: this.handleKeyDown,
					}
				),
				e(
					'div', {
						id: 'unit-set__buttons',
					},
					e(
						'button', {
							id: 'unit-set__delete-set',
							onClick: (/** @type {any} */ event) => {
								// click to delete the user set
								let pathParts = this.props.viewInfo.path.split('.');
								let name = pathParts[pathParts.length - 1];
								this.props.actions.doCommand(`/unitsys.sets remove ${name}`, () => {
									this.props.actions.popView();
								});
								event.stopPropagation();
							},
						},
						t('react:unitsSetDeleteSet')
					),
					e(
						'button', {
							id: 'unit-set__clear-selection',
							onClick: (/** @type {any} */ event) => {
								// click to clear the input fields so new type can be defined
								this.setState({
									selected: '',
									nameInput: '',
									unitInput: ''
								});
								event.stopPropagation();
							},
						},
						t('react:unitsSetAddType')
					)
				)
			),
			e(
				'div', {
					id: 'unit-set__list',
				},
				typeList
			)
		);
	}
}



/**
 * unit picker component
 * @param {UnitPickerProps} props
 */
export function UnitPicker(props) {
	/** @type {React.MutableRefObject<any>} */
	const inputRef = React.useRef();
	let t = props.t;

	const [unitTypes, setUnitTypes] = useState(/** @type {any[]} */ ([]));
	const [defaultSetName, setDefaultSetName] = useState('');
	const [selectedType, setSelectedType] = useState('');
	const [unitNames, setUnitNames] = useState(/** @type {any[]} */ ([]));
	const [selectedUnit, setSelectedUnit] = useState('');

	useEffect(() => {
		if (defaultSetName) {
			props.actions.doCommand(`/unitsys.sets.${defaultSetName} listTypes`, (/** @type {any} */ cmds) => {
				setUnitTypes(cmds[0].results);
			});
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	},[defaultSetName]);

	useEffect(() => {
		props.actions.doCommand('/unitsys.sets get defaultSetName', (/** @type {any} */ cmds) => {
			setDefaultSetName(cmds[0].results);
		});
		if (inputRef.current) {
			inputRef.current.focus();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	},[]);

	useEffect(() => {
		if (selectedType) {
			let foundType = false;
			for (let type of unitTypes) {
				if (type.name === selectedType) {
					props.actions.doCommand(`/unitsys.units unitsfordim ${type.dim}`, (/** @type {any} */ cmds) => {
						setUnitNames(cmds[0].results);
					});
					foundType = true;
					break;
				}
			}
			if (!foundType && props.unitName) {
				props.actions.doCommand(`/unitsys.units unitsofsametype ${props.unitName}`, (/** @type {any} */ cmds) => {
					setUnitNames(cmds[0].results);
				});
			}
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	},[selectedType, unitTypes]);

	let typeComponents = [];
	for (let type of unitTypes) {
		const cmp = e(
			'div', {
				className: `unit-picker__type-name${selectedType == type.name ?  ' entry--selected' : ''}`,
				key: type.name,
				onClick: () => {
					setSelectedType(type.name);
					if (inputRef.current) {
						inputRef.current.focus();
					}			
				}
			},
			type.name
		);
		typeComponents.push(cmp);
	}

	useEffect(() => {
		if (props.unitType) {
			setSelectedType(props.unitType);
		}
	},[props.unitType]);

	let unitComponents = [];
	for (let unitName of unitNames) {
		const cmp = e(
			'div', {
				className: 'unit-picker__unit-name',
				key: unitName,
				onClick: () => {
					if (selectedUnit.endsWith('/') || selectedUnit.endsWith('-')) {
						unitName = selectedUnit + unitName;
					}
					setSelectedUnit(unitName);
					if (inputRef.current) {
						inputRef.current.focus();
					}
				}
			},
			unitName
		);
		unitComponents.push(cmp);
	}

	const wrapper = e(
		'div', {
			id: 'unit-picker'
		},
		e(
			'div', {
				id: 'unit-picker__list'
			},
			e(
				'div', {
					id: 'unit-picker__list-types'
				},
				typeComponents
			),
			e(
				'div', {
					id: 'unit-picker__list-units',
				},
				unitComponents
			),
		),
		e(
			'input', {
				id: 'unit-picker__input',
				ref: inputRef,
				value: selectedUnit,
				onChange: (/** @type {any} */ event) => {
					// keeps input field in sync
					setSelectedUnit(event.target.value);
				},
				onKeyDown: (/** @type {any} */ e) => {
					if (e.code == 'Enter') {
						props.apply(`${selectedUnit}`, 0);
					}
					else if (e.code === 'Escape') {
						props.cancel();
					}
				}
			}
		),
		e(
			'div', {
				id: 'unit-picker__buttons',
			},
			e(
				'button', {
					id: 'unit-picker__cancel',
					title: 'Escape',
					onClick: () => {
						props.cancel();
					}
				},
				t('react:cancel')
			),
			e(
				'button', {
					id: 'unit-picker__apply',
					title: 'Return',
					onClick: () => {
							props.apply(`${selectedUnit}`, 0);
					}
				},
				t('react:unitPickerApply')
			)
		)
	);

	return wrapper;
}
