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
import {TableView} from './TableView.js';

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

/**
 * Enum for matrix display types.
 * @readonly
 * @enum {string}
 */
const FlashDisplay = Object.freeze({
	input: 0,
	formulaEditor: 1
});

/**
 * MatrixView
 * info view for matrix
 */
export function FlashView(props) {

	const [display, setDisplay] = useState(FlashDisplay.input);
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

	const applyChanges = (name) => {
		const path = `${results.path}.${name}`;
		return (formula) => {
			props.actions.doCommand(`__blob__${path} set formula__blob__${formula}`, () => {
				props.actions.updateView(props.viewInfo.stackIndex);
				setDisplay(FlashDisplay.input);
			});
		}
	}

	let displayComponent;

	switch (display) {
		case FlashDisplay.formulaEditor:
			displayComponent = e(
				FormulaEditor, {
					id: 'flash-formula-editor',
					key: 'editor',
					t: t,
					viewInfo: props.viewInfo,
					actions: props.actions,
					formula: results[formulaName],
					formulaOffset: formulaOffset,
					cancelAction: () => {
						setDisplay(FlashDisplay.input);
					},
					applyChanges: applyChanges(formulaName),
				}
			);
			break;

		case FlashDisplay.input: {
			displayComponent = e(
				'div', {
					// main vertical sections
					id: 'flash',
					key: 'flash'
				},
				e(
					'div', {
						id: 'flash__formulas'
					},
					e(
						'div', {
							id: 'flash__thermo-label',
						},
						t('mmcool:flashThermoLabel')
					),
					e(
						FormulaField, {
							id: 'flash__thermo-formula',
							t: t,
							actions: props.actions,
							path: `${results.path}.thermoFormula`,
							formula: results.thermoFormula,
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							clickAction: (offset) => {
								setFormulaOffset(offset);
								setFormulaName('thermoFormula');
								setDisplay(FlashDisplay.formulaEditor);
							}
						}
					),
					e(
						'div', {
							id: 'flash__t-or-p-label',
						},
						t('mmcool:flashTorPLabel')
					),
					e(
						FormulaField, {
							id: 'flash__t-or-p-formula',
							t: t,
							actions: props.actions,
							path: `${results.path}.firstPropFormula`,
							formula: results.firstPropFormula,
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							clickAction: (offset) => {
								setFormulaOffset(offset);
								setFormulaName('firstPropFormula');
								setDisplay(FlashDisplay.formulaEditor);
							}
						}
					),
					e(
						'div', {
							id: 'flash__2nd-prop-label',
						},
						t('mmcool:flash2ndPropLabel')
					),
					e(
						FormulaField, {
							id: 'flash__2nd-prop-formula',
							t: t,
							actions: props.actions,
							path: `${results.path}.secondPropFormula`,
							formula: results.secondPropFormula,
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							clickAction: (offset) => {
								setFormulaOffset(offset);
								setFormulaName('secondPropFormula');
								setDisplay(FlashDisplay.formulaEditor);
							}
						}
					),
					e(
						'div', {
							id: 'flash__molefrac-label',
						},
						t('mmcool:flashMoleFracPropLabel')
					),
					e(
						FormulaField, {
							id: 'flash__molefrac-formula',
							t: t,
							actions: props.actions,
							path: `${results.path}.moleFracFormula`,
							formula: results.moleFracFormula,
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							clickAction: (offset) => {
								setFormulaOffset(offset);
								setFormulaName('moleFracFormula');
								setDisplay(FlashDisplay.formulaEditor);
							}
						}
					),
					e(
						'div', {
							id: 'flash__massfrac-label',
						},
						t('mmcool:flashMassFracPropLabel')
					),
					e(
						FormulaField, {
							id: 'flash__massfrac-formula',
							t: t,
							actions: props.actions,
							path: `${results.path}.massFracFormula`,
							formula: results.massFracFormula,
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							clickAction: (offset) => {
								setFormulaOffset(offset);
								setFormulaName('massFracFormula');
								setDisplay(FlashDisplay.formulaEditor);
							}
						}
					),
				),
			// 	e(
			// 		TableView, {
			// 			id: 'matrix__value',
			// 			value: results.value,
			// 			actions: props.actions,
			// 			viewInfo: props.viewInfo,
			// 			viewBox: [0, 0, props.infoWidth - 2*nInfoViewPadding, props.infoHeight - 4*nInputHeight - 14],
			// 			cellClick: cellClick,
			// 			cellInputs: cellInputs,
			// 			currentCell: currentCell,
			// 		}
			// 	),
			)
		}
	}

	return e(
		ToolView, {
			id: 'tool-view',
			displayComponent: displayComponent,
			...props,
		},
	);
}