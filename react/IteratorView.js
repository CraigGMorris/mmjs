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
 * Enum fordisplay types.
 * @readonly
 * @enum {string}
 */
const DisplayType = Object.freeze({
	input: 0,
	formulaEditor: 1
});

/**
 * IteratorView
 * info view for iterator
 */
export function IteratorView(props) {
	const [display, setDisplay] = useState(DisplayType.input);
	const [formulaIndex, setFormulaIndex] = useState('')
	const [editOptions, setEditOptions] = useState('');

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

	const applyChanges = (name) => {
		const path = `${results.path}.${name}`;
		return (formula) => {
			props.actions.doCommand(`__blob__${path} set formula__blob__${formula}`, () => {
				props.actions.updateView(props.viewInfo.stackIndex);
				setDisplay(DisplayType.input);
			});
		}
	}

	const formulas = results.formulas;
	const formulaCount = formulas ? formulas.length : 0;
	let displayComponent;
	if (display === DisplayType.formulaEditor && formulaIndex < formulaCount) {
		const formulaName = formulas[formulaIndex][0];
		displayComponent = e(
			FormulaEditor, {
				id: 'iter__formula-editor',
				key: 'editor',
				t: t,
				viewInfo: props.viewInfo,
				infoWidth: props.infoWidth,
				actions: props.actions,
				editOptions: editOptions,
				cancelAction: () => {
					setDisplay(DisplayType.input);
				},
				applyChanges: applyChanges(formulaName),
			}
		);
	}
	else {
		const inputComponents = [];
		let recordedCount = 1;
		for (let i = 0; i < formulaCount; i++) {
			const formulaInfo = formulas[i];
			const name = formulaInfo[0];
			const formula = formulaInfo[1];
			const displayString = formulaInfo[2]
			let description;
			if (name.match(/^r\d+$/)) {
				const localCount = recordedCount++; // need value in this scope for click handler
				description = e(
					'div', {
						className: 'iter__record-desc-line',
					},
					e(
						'div', {
							className: 'iter__recorded-desc'
						},
						t('react:iterInput-recorded', {n: localCount})
					),
					e(
						'div', {
							className: 'iter__recorded-delete',
							onClick: () => {
								props.actions.doCommand(`${props.viewInfo.path} removerecorded ${localCount}`, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
								})								
							}
						}, t('react:removeRecorded')
					)
				);
			}
			else {
				description = t(`react:iterInput-${name}`);
			}
			inputComponents.push(e(
				'div', {
					className: 'iter__input',
					key: name,
				},
				e(
					'div', {
						className: 'input__formula-label'
					},
					description
				),
				e(
					FormulaField, {
						className: 'input__input-formula',
						t: t,
						actions: props.actions,
						path: `${results.path}.name`,
						formula: formula,
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						editAction: (editOptions) => {
							setEditOptions(editOptions);
							setFormulaIndex(i);
							setDisplay(DisplayType.formulaEditor);
						},
						applyChanges: applyChanges(name),
					}
				),
				e(
					'div', {
						className: 'input__input-display'
					},
					displayString
				)
			));
		}
		displayComponent = e(
			'div', {
				key: 'iter',
				id: 'iter',
			},
			e(
				// enabled check boxe and add recorded button
				'div', {
					id: 'iter__control-line',
				},
				e(
					// autorun check box
					'div', {
						id: 'iter__autorun',
						className: 'checkbox-and-label',
					},
					e(
						'label', {
							id: 'iter__autorun-label',
							className: 'checkbox__label',
							htmlFor: 'iter__autorun-checkbox'
						},
						t('react:iterAutoRun'),
					),
					e(
						'input', {
							id: 'iter__autorun-checkbox',
							className: 'checkbox__input',
							tabIndex: -1,
							type: 'checkbox',
							checked: results.shouldAutoRun,
							onChange: () => {
								// toggle the isOutput property
								const value = results.shouldAutoRun ? 'f' : 't';
								props.actions.doCommand(`${props.viewInfo.path} set shouldAutoRun ${value}`, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
								});						
							}
						},
					),
				),
				e(
					'button', {
						id: 'iter__addrecord-button',
						tabIndex: -1,
						onClick: () => {
							props.actions.doCommand(`${props.viewInfo.path} addrecorded`, () => {
								setFormulaIndex(formulaCount);
								// setDisplay(DisplayType.formulaEditor);	
								props.actions.updateView(props.viewInfo.stackIndex);
							})
						}
					},
					t('react:iterAddRecordButton')
				),		
			),
			e(
				'div', {
					id: 'iter__current-i-x',
				},
				e(
					'div', {
						id: 'iter__i-value'
					},
					`i = ${results.i}`
				),
				e(
					'div', {
						id: 'iter__x-value'
					},
					`x = ${results.x}`
				),
			),
			e(
				'div', {
					id: 'iter__input-list'
				},
				inputComponents
			)
		);
	}
	return e(
		ToolView, {
			id: 'tool-view',
			displayComponent: displayComponent,
			...props,
		},
	);
}