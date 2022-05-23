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
 * Enum for button page display types.
 * @readonly
 * @enum {string}
 */
const ButtonDisplay = Object.freeze({
	main: 0,
	formulaEditor: 1
});

/**
 * ButtonView
 * info view for button tool
 */
export function ButtonView(props) {
	const [display, setDisplay] = useState(ButtonDisplay.input);
	const [editOptions, setEditOptions] = useState({});

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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

	const applyLabelChanges = () => {
		const path = `${results.path}.label`;
		return (formula) => {
			props.actions.doCommand(`__blob__${path} set formula__blob__${formula}`, () => {
				props.actions.updateView(props.viewInfo.stackIndex);
				setDisplay(ButtonDisplay.main);
			});
		}
	}

	let displayComponent;
	if (display === ButtonDisplay.formulaEditor) {
		displayComponent = e(
			FormulaEditor, {
				id: 'button-label-formula-editor',
				key: 'editor',
				t: t,
				viewInfo: props.viewInfo,
				infoWidth: props.infoWidth,
				actions: props.actions,
				editOptions: editOptions,
				cancelAction: () => {
					setDisplay(ButtonDisplay.main);
				},
				applyChanges: applyLabelChanges(),
			}
		);
	}
	else {	// main display
		const actionOptions = [];
		const actionOption = (action, label) => {
			actionOptions.push(e(
				'option', {
					class: 'button__action-option',
					key: action,
					value: action,
					selected: action === results.action,
				},
				label
			));
		}

		actionOptions.push(actionOption('addrow', t('react:buttonAddRow')))
		actionOptions.push(actionOption('push', t('react:buttonPushView')))
		actionOptions.push(actionOption('refresh', t('react:buttonRefresh')))

		const actionField = e(
			'div',	 {
				class: 'button__action_select-row',
			},
			e(
				'label', {
					class: 'button__action-label',
					htmlFor: 'button__action_select',
				},
				t('react:buttonActionLabel')
			),
			e(
				'select', {
					className: 'button__action_select',
					onChange: (e) => {
						const newValue = e.target.value;
						if (newValue !== results.action) {
							const path = props.viewInfo.path;
							props.actions.doCommand(`${path} set action ${newValue}`,() => {
								props.actions.updateView(props.viewInfo.stackIndex);
							})	
						}
					}
				},
				actionOptions
			),
		)

		let targetField;
		if (results.targets) {
			const targetOptions = [];
			for (const target of results.targets) {
				targetOptions.push(e(
					'option', {
						class: 'button__target-option',
						key: target,
						value: target,
						selected: target === results.target,
					},
					target
				));
			}
			targetField = e(
				'div',	 {
					class: 'button__target_select-row',
				},
				e(
					'label', {
						class: 'button__target-label',
						htmlFor: 'button__target_select',
					},
					t('react:buttonTargetLabel')
				),
				e(
					'select', {
						className: 'button__target_select',
						onChange: (e) => {
							const newValue = e.target.value;
							if (newValue !== results.target) {
								const path = props.viewInfo.path;
								props.actions.doCommand(`${path} set target ${newValue}`,() => {
									props.actions.updateView(props.viewInfo.stackIndex);
								})	
							}
						}
					},
					targetOptions
				),
			)
		}
		displayComponent = e(
			'div', {
				key: 'button',
				id: 'button',
			},
			e(
				// label formula field line
				'div', {
					id: 'button__label_formula-row',
				},
				e(
					'label', {
						id: 'button__label_label',
						htmlFor: 'button__label_formula'
					},
					t('react:buttonLabelLabel')
				),
				e(
					FormulaField, {
						id: 'button__label_formula',
						t: t,
						actions: props.actions,
						path: `${results.path}.label`,
						formula: results.labelFormula || '',
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						editAction: (editOptions) => {
							setEditOptions(editOptions);
							setDisplay(ButtonDisplay.formulaEditor);
						},
						applyChanges: applyLabelChanges(),
					}
				),
			),
			actionField,
			targetField,
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
