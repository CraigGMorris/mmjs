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

import {ToolView} from './ToolView.js';
import {FormulaField, FormulaEditor} from './FormulaView.js';

const e = React.createElement;
const useEffect = React.useEffect;
const useState = React.useState;

/**
 * Enum for menu page display types.
 * @readonly
 * @enum {string}
 */
const MenuDisplay = Object.freeze({
	main: 0,
	formulaEditor: 1
});

/**
 * MenuView
 * info view for menu tool
 */
export function MenuView(props) {
	const [display, setDisplay] = useState(MenuDisplay.main);
	const [editOptions, setEditOptions] = useState({});
	const [optionLabels, setOptionLabels] = useState([]);
	const [optionValues, setOptionValues] = useState([]);
	const [selected, setSelected] = useState(-1);

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const updateResults = props.viewInfo.updateResults;
		const results = updateResults.length ? updateResults[0].results : {};
		setSelected(results.selected != null ? results.selected : -10);
		setOptionLabels(results.optionLabels || []);
		setOptionValues(results.optionValues || []);
	}, props.viewInfo.updateResults);

	const t = props.t;
	const updateResults = props.viewInfo.updateResults;

	if (updateResults.error) {
		// use empty command just to defer popView
		props.actions.doCommand('', () => {
			props.actions.popView();
		});
		return null;
	}
	const results = updateResults.length ? updateResults[0].results : {};

	const applyOptionChanges = () => {
		const path = `${results.path}.options`;
		return (formula) => {
			props.actions.doCommand(`__blob__${path} set formula__blob__${formula}`, () => {
				props.actions.updateView(props.viewInfo.stackIndex);
				setDisplay(MenuDisplay.main);
			});
		}
	}

	let displayComponent;
	if (display === MenuDisplay.formulaEditor) {
		displayComponent = e(
			FormulaEditor, {
				id: 'menu-options-formula-editor',
				key: 'editor',
				t: t,
				viewInfo: props.viewInfo,
				infoWidth: props.infoWidth,
				actions: props.actions,
				editOptions: editOptions,
				cancelAction: () => {
					setDisplay(MenuDisplay.main);
				},
				applyChanges: applyOptionChanges(),
			}
		);
	}
	else {	// main display
		let selectedValueField;
		const menuOptions = [];
		const optionCount = optionLabels.length
		const selectedValue = (selected >= 0 && selected < optionCount) ? optionValues[selected] : '';
		if (optionCount) {
			const menuOption = (value, label) => {
				menuOptions.push(e(
					'option', {
						className: 'menu__option',
						key: label,
						value: value,
					},
					label
				));
			}

			for (let i = 0; i < optionCount; i++) {
				menuOptions.push(menuOption(optionValues[i], optionLabels[i]));
			}
		}

		selectedValueField = e(
			'span', {
				id: 'menu__selected-value',
			},
			selectedValue
		)

		const menuField = e(
			'div',	 {
				className: 'menu__select-row',
			},
			e(
				'select', {
					className: 'menu__select',
					value: selectedValue,
					onChange: (e) => {
						const newValue = e.target.selectedIndex;
						if (newValue >= 0 && newValue !== selected) {
							const path = props.viewInfo.path;
							props.actions.doCommand(`${path} set selected ${newValue}`,() => {
								props.actions.updateView(props.viewInfo.stackIndex);
							})	
						}
					}
				},
				menuOptions
			),
		)

		displayComponent = e(
			'div', {
				key: 'menu',
				id: 'menutool',
			},
			e(
				// label formula field line
				'div', {
					id: 'menu__options_formula-row',
				},
				e(
					'label', {
						id: 'menu__options_label',
						htmlFor: 'menu__options_formula'
					},
					t('react:menuOptionsLabel')
				),
				e(
					FormulaField, {
						id: 'menu__options_formula',
						t: t,
						actions: props.actions,
						path: `${results.path}.options`,
						formula: results.optionsFormula || '',
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						editAction: (editOptions) => {
							setEditOptions(editOptions);
							setDisplay(MenuDisplay.formulaEditor);
						},
						applyChanges: applyOptionChanges(),
					}
				),
			),
			menuField,
			e(
				'div', {
					id: 'menu__selected-value-row',
				},
				e(
					'span', {
						id: 'menu__selected-value-label',
					},
					t('react:menuSelectdValueLabel')
				),
				selectedValueField,
			)
		)
	}

	return e(
		ToolView, {
			id: 'tool-view',
			displayComponent: displayComponent,
			...props,
		},
	);
}
