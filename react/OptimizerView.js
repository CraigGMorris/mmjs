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
 * Enum for matrix display types.
 * @readonly
 * @enum {string}
 */
const OptimizerDisplay = Object.freeze({
	input: 0,
	formulaEditor: 1
});

/**
 * OptimizerView
 * info view for optimizer
 */
export function OptimizerView(props) {
	const [display, setDisplay] = useState(OptimizerDisplay.input);
	const [formulaName, setFormulaName] = useState('')
	const [formulaOffset, setFormulaOffset] = useState(0);

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
	if (!results.formulas) {
		return e(
			ToolView, {
				id: 'tool-view',
				displayComponent: null,
				...props,
			},
		);
	}

	const applyChanges = (name) => {
		const path = `${results.path}.${name}`;
		return (formula) => {
			props.actions.doCommand(`__blob__${path} set formula__blob__${formula}`, () => {
				props.actions.updateView(props.viewInfo.stackIndex);
				setDisplay(OptimizerDisplay.input);
			});
		}
	}

	let displayComponent;
	if (display === OptimizerDisplay.formulaEditor) {
		displayComponent = e(
			FormulaEditor, {
				id: 'opt__formula-editor',
				key: 'editor',
				t: t,
				viewInfo: props.viewInfo,
				actions: props.actions,
				formula: results.formulas[formulaName],
				formulaOffset: formulaOffset,
				cancelAction: () => {
					setDisplay(OptimizerDisplay.input);
				},
				applyChanges: applyChanges(formulaName),
			}
		);
	}
	else {
		const outputComponents = [];
		const outputs = results.outputs;
		const outputCount = outputs ? outputs.length : 0;
		for (let i = 0; i < outputCount; i++) {
			outputComponents.push(e(
				'div', {
					className: 'opt__line',
					key: i,
				},	
				e(
					'div', {
						className: 'opt__output-number'
					},
						`${i+1}`
				),
				e(
					'div', {
						className: 'opt__output-value'
					},
					outputs[i]
				)
			));
		}
		displayComponent = e(
			'div', {
				key: 'optimizer',
				id: 'opt',
			},
			e(
				'div', {
					id: 'opt__fxformula-line',
					className: 'opt__line'
				},
				e(
					'span', {
						id: 'opt__fxformula-label',
					}, 'f(x)'
				),
				e(
					FormulaField, {
						id: 'opt__fxformula',
						t: t,
						actions: props.actions,
						path: `${results.path}.fx`,
						formula: results.formulas.optFormula,
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						clickAction: (offset) => {
							setFormulaOffset(offset);
							setFormulaName('optFormula');
							setDisplay(OptimizerDisplay.formulaEditor);
						}
					}
				),
			),
			e(
				'div', {
					id: 'opt__fxvalue-line',
					className: 'opt__line'
				},
				e(
					'span', {
						id: 'opt__fxvalue-label',
						// htmlFor: 'matrix-column-count-formula'
					}, '='
				),
				e(
					'div', {
						id: 'opt__fxvalue',
					},
					results.fx
				)	
			),
			e(
				'div', {
					id: 'opt__count-line',
					className: 'opt__line'
				},
				e(
					'span', {
						id: 'opt__count-label',
						// htmlFor: 'matrix-column-count-formula'
					}, '# X'
				),
				e(
					FormulaField, {
						id: 'opt__count-formula',
						t: t,
						actions: props.actions,
						path: `${results.path}.count`,
						formula: results.formulas.countFormula,
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						clickAction: (offset) => {
							setFormulaOffset(offset);
							setFormulaName('countFormula');
							setDisplay(OptimizerDisplay.formulaEditor);
						}
					}
				),
			),
			e(
				'div', {
					id: 'opt__button-fields'
				},
				e(
					'div', {
						id: 'opt__is-enabled',
						className: 'checkbox-and-label'
					},
					e(
						'label', {
							id: 'opt__is-enabled-label',
							className: 'checkbox__label',
							htmlFor: 'opt__is-enabled-checkbox'
						},
						t('react:optIsEnabled'),
					),
					e(
						'input', {
							id: 'opt__is-enabled-checkbox',
							className: 'checkbox__input',
							type: 'checkbox',
							checked: results.isEnabled,
							onChange: () => {
								// toggle the isOutput property
								const value = props.viewInfo.updateResults[0].results.isEnabled ? 'f' : 't';
								props.actions.doCommand(`${props.viewInfo.path} set isEnabled ${value}`, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
								});						
							}
						},
					),
				),
				e(
					'button', {
						id: 'opt__reset-button',
						onClick: () => {
							props.actions.doCommand(`${props.viewInfo.path} reset`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							})
						}
					},
					t('react:optResetButton')
				),
			),
			e(
				'div', {
					id: 'opt__output-header'
				},
				t('react:optOutputHeader')
			),
			e(
				'div', {
					id: 'opt__output-list'
				},
				outputComponents
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
