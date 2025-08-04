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
import {UnitPicker} from './UnitsView.js';
import {MMFormatValue} from './MMApp.js';

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
	unitPicker: 1,
	formulaEditor: 2,
});

/**
 * MatrixView
 * info view for matrix
 */
export function FlashView(props) {

	const [display, setDisplay] = useState(FlashDisplay.input);
	const [formulaName, setFormulaName] = useState('')
	const [editOptions, setEditOptions] = useState({});
	const [selectedCell, setSelectedCell] = useState([0,0]);
	const [formatString, setFormatString] = useState('');
	const [displayedUnit, setDisplayedUnit] = useState('');
	const [unitType, setUnitType] = useState('');

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

	useEffect(() => {
		const results = updateResults.length ? updateResults[0].results : {};
		const displayTable = results.displayTable;
		if (displayTable) {
			const row = selectedCell[0] - 1;
			if (row >= 0) {
				const unit = displayTable?.v?.[1]?.v?.v?.[row];
				if (unit) {
					setDisplayedUnit(unit);
				}
				else {
					setDisplayedUnit('');
				}
				const unitTypes = results.unitTypes;
				const propName = displayTable?.v?.[0]?.v?.v?.[row];
				setUnitType(unitTypes?.[propName] || '');
				setFormatString(results.formatStrings?.[propName] || '');
			}
			else {
				setDisplayedUnit('');
				setFormatString('');
			}
		}
	}, [props.viewInfo.updateResults, selectedCell, updateResults])

	const applyChanges = (name) => {
		const path = `${results.path}.${name}`;
		return (formula) => {
			props.actions.doCommand(`${path} set formula ${formula}`, () => {
				props.actions.updateView(props.viewInfo.stackIndex);
				setDisplay(FlashDisplay.input);
			});
		}
	}

	const nInputHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--input--height'));
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));

	let displayComponent;
	let displayTable = null;
	if (results.displayTable) {
		displayTable = e(
			TableView, {
				id: 'flash__display-table',
				value: results.displayTable,
				actions: props.actions,
				viewInfo: props.viewInfo,
				viewBox: [0, 0, props.infoWidth - 2*nInfoViewPadding, props.infoHeight - 7*nInputHeight - 70],
				cellClick: (row, column) => {
					const displayTable = results.displayTable;
					if (results.displayTable && column >= 0 && column < displayTable.nc && row > 0 && row <= displayTable.nr) {
						setSelectedCell([row,column]);
					}
					else {
						setSelectedCell([0,0]);
					}
				},
			}
		);
	}

	switch (display) {
		case FlashDisplay.formulaEditor:
			displayComponent = e(
				FormulaEditor, {
					id: 'flash-formula-editor',
					key: 'editor',
					t: t,
					viewInfo: props.viewInfo,
					infoWidth: props.infoWidth,
					infoHeight: props.infoHeight,
					actions: props.actions,
					editOptions: editOptions,
					cancelAction: () => {
						setDisplay(FlashDisplay.input);
					},
					applyChanges: applyChanges(formulaName),
				}
			);
			break;

			case FlashDisplay.unitPicker:				
				displayComponent = e(
					UnitPicker, {
						key: 'unit',
						t: props.t,
						actions: props.actions,
						unitType: unitType,
						unitName: displayedUnit,
						cancel: () => {
							setDisplay(FlashDisplay.input);
						},
						apply: (unit) => {
							const displayTable = results.displayTable;
							if (displayTable && selectedCell[0] > 0 && selectedCell[0] <= displayTable.nr) {
								const propName = displayTable?.v?.[0]?.v?.v?.[selectedCell[0] - 1];
								const cmd = `${props.viewInfo.path} setpropunit ${propName} ${unit}`;
								props.actions.doCommand(cmd, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
									setDisplay(FlashDisplay.input);
								});
							}
						},
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
							applyChanges: applyChanges('thermoFormula'),
							editAction: (editOptions) => {
								setEditOptions(editOptions);
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
							applyChanges: applyChanges('firstPropFormula'),
							editAction: (editOptions) => {
								setEditOptions(editOptions);
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
							applyChanges: applyChanges('secondPropFormula'),
							editAction: (editOptions) => {
								setEditOptions(editOptions);
								setFormulaName('secondPropFormula');
								setDisplay(FlashDisplay.formulaEditor);
							}
						}
					),
					e(
						'div', {
							id: 'flash__flow-label',
						},
						t('mmcool:flashFlowLabel')
					),
					e(
						FormulaField, {
							id: 'flash__flow-formula',
							t: t,
							actions: props.actions,
							path: `${results.path}.flowFormula`,
							formula: results.flowFormula,
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							applyChanges: applyChanges('flowFormula'),
							editAction: (editOptions) => {
								setEditOptions(editOptions);
								setFormulaName('flowFormula');
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
							applyChanges: applyChanges('moleFracFormula'),
							editAction: (editOptions) => {
								setEditOptions(editOptions);
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
							applyChanges: applyChanges('massFracFormula'),
							editAction: (editOptions) => {
								setEditOptions(editOptions);
								setFormulaName('massFracFormula');
								setDisplay(FlashDisplay.formulaEditor);
							}
						}
					),
				),
				e(
					'div', {
						id: 'flash__units-format',						
					},
					e(
						// results unit line
						'div', {
							id: 'flash__units',
							onClick: () => {
								if (unitType) {
									setDisplay(FlashDisplay.unitPicker);
								}
							}
						},
						`${unitType}: ${displayedUnit}`
					),
					e(
						'input', {
							id: 'flash__format-input',
							tabIndex: -1,
							placeholder: 'format',
							value: formatString,
							onChange: (event) => {
									// keeps input field in sync
									setFormatString(event.target.value);
							},
							onKeyDown: e => {
								if (e.code == 'Enter') {
									e.target.blur();
								}
							},
							onBlur: () => {
								const displayTable = results.displayTable;
								if (displayTable && selectedCell[0] > 0 && selectedCell[0] <= displayTable.nr) {
									const propName = displayTable?.v?.[0]?.v?.v?.[selectedCell[0] - 1];
									let cmd = `${props.viewInfo.path} setpropformat ${propName} ${formatString}`
									props.actions.doCommand(cmd, () => {
										props.actions.updateView(props.viewInfo.stackIndex);
									});
								}
							},		
						}
					),
	
					e(
						'div', {
							id: 'flash__format',
						},
					),
				),
				displayTable
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