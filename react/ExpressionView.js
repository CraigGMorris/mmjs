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

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

/**
 * Enum for expression display types.
 * @readonly
 * @enum {string}
 */
const ExpressionDisplay = Object.freeze({
	expression: 0,
	unitPicker: 1,
	stringValue: 2,
	formulaEditor: 3,
});

/**
 * ExpressionView
 * info view for expression
 */
export function ExpressionView(props) {
	const [display, setDisplay] = useState(ExpressionDisplay.expression);
	const [stringDisplay, setStringDisplay] = useState();
	const [selectedCell, setSelectedCell] = useState([0,0]);
	const [formulaOffset, setFormulaOffset] = useState(0);

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);

		if (props.viewInfo.expressionViewState) {
			setDisplay(props.viewInfo.expressionViewState.display);
		}
		else {
			props.viewInfo.expressionViewState = {
				display: display,
			};
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (props.viewInfo.expressionViewState) {
			props.viewInfo.expressionViewState.display = display;
		}
	}, [display, props.viewInfo])

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
	const path = results.path;
	const value = results.value;
	const isTable = (value && value.t) === 't';
	let unitType;
	let valueUnit;
	if (isTable) {	
		if (selectedCell[0] === 0 && selectedCell[1] > 0) {
			const v = value.v[selectedCell[1] - 1].v;
			unitType = v.unitType;
		}
	}
	else {
		unitType = value.unitType ? value.unitType : '';
		valueUnit = value.unit;
	}
	const formulaName = results.formulaName;
	const nInputHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--input--height'));
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));

	let displayComponent;
	switch (display) {
		case ExpressionDisplay.formulaEditor: {
			displayComponent = e(
				FormulaEditor, {
					id: 'datatable__column-formula-editor',
					key: 'edit',
					t: t,
					viewInfo: props.viewInfo,
					actions: props.actions,
					formula: results.formula || '',
					formulaOffset: formulaOffset,
					cancelAction: () => {
						setDisplay(ExpressionDisplay.expression);
					},
					applyChanges: (formula) => {
						props.actions.doCommand(`__blob__${path}.${formulaName} set formula__blob__${formula}`, () => {
							props.actions.updateView(props.viewInfo.stackIndex);
							setDisplay(ExpressionDisplay.expression);
						});
					}
				}
			);
		}
			break;
		case ExpressionDisplay.unitPicker:
			displayComponent = e(
				UnitPicker, {
					key: 'unit',
					t: props.t,
					actions: props.actions,
					unitType: unitType,
					cancel: () => {
						setDisplay(ExpressionDisplay.expression);
					},
					apply: (unit) => {
						const cmd = isTable ?
							`${props.viewInfo.path} setcolumnunit ${selectedCell[1]} ${unit}`
							:
							`${props.viewInfo.path} set displayUnitName ${unit}`;

						props.actions.doCommand(cmd, () => {
							props.actions.updateView(props.viewInfo.stackIndex);
							setDisplay(ExpressionDisplay.expression);
							setSelectedCell([0,0]);
						});
					},
				}
			);
			break;

		case ExpressionDisplay.stringValue:
			displayComponent = e(
				'div', {
					id: 'expression__string',
					key: 'stringValue',
				},
				e (
					'div', {
						id: 'expression__string-header'
					},
					e(
						'div', {
							id: 'expression__string-cell-coord',
						},
						t('react:exprStringCell'), ` [${selectedCell.join(', ')}]`,
					),
					e(
						'button', {
							id: 'expression__string-done',
							onClick: () => {
								setDisplay(ExpressionDisplay.expression);
							},
						},
						t('react:exprStringDone'),
					),
				),
				e(
					'textarea', {
						id: 'expression__string-text',
						readOnly: true,
						value: stringDisplay,
					},
				)

			)
			break;
		case ExpressionDisplay.expression: {
			const cellClick = (row, column) => {
				if (row === 0 && column === 0) {
					setSelectedCell([0,0]);
					return;
				}
				const value = results.value;
				if (!value || row < 0 || row > value.nr || column < 1 || column > value.nc) {
					return;
				}

				if (row === 0) {
					if (isTable) {
						setSelectedCell([row,column]);
						setDisplay(ExpressionDisplay.unitPicker);
					}
					return;					
				}
	
				// if (value && value.nr && value.nc) {
				// 	row = Math.max(1, Math.min(row, value.nr));
				// 	column = Math.max(1, Math.min(column, value.nc));
				// }
				// else {
				// 	row = column = 1;
				// }
		
				const formatValue = v => {
					if (typeof v === 'string') {
						return v;
					}
					else if (typeof v === 'number') {
						return v.toPrecision(16);
					}
					else {
						return '???';
					}
				}

				const displayV = (row, column) => {
					setSelectedCell([row,column]);
					if (value.t === 't') {
						const tableColumn = value.v[column - 1];
						const v = tableColumn.v.v[row - 1];
						return formatValue(v);
					}
					else {
						const vIndex = (row - 1) * value.nc + column - 1;
						const v = (vIndex >= 0 && vIndex < value.nr * value.nc) ? value.v[vIndex] : '';
						return formatValue(v);
					}
				}
				setStringDisplay(displayV(row, column));
				setDisplay(ExpressionDisplay.stringValue);
			}

			displayComponent = e(
				'div', {
					// main vertical sections
					id: 'expression',
					key: 'expression'
				},
				e(
					// formula field line
					'div', {
						id: 'expression__formula',
					},
					e(
						FormulaField, {
							t: t,
							actions: props.actions,
							path: `${path}.${formulaName}`,
							formula: results.formula || '',
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							clickAction: (offset) => {
								setFormulaOffset(offset);
								setDisplay(ExpressionDisplay.formulaEditor);
							}
	
						}
					)
				),
				e(
					'div', {
						id: 'expression__options',
					},
					e(
						// isInput and isOutput check boxes
						'div', {
							id: 'expression__in-out-boxes',
						},
						e(
							// isInput check box
							'div', {
								id: 'expression__is-input',
								className: 'checkbox-and-label',
							},
							e(
								'label', {
									id: 'expression__is-input-label',
									className: 'checkbox__label',
									htmlFor: 'expression__is-input-checkbox'
								},
								t('react:exprIsInput')
							),
							e(
								'input', {
									id: 'expression__is-input-checkbox',
									className: 'checkbox__input',
									type: 'checkbox',
									checked: results.isInput,
									onChange: () => {
										// toggle the isInput property
										const value = props.viewInfo.updateResults[0].results.isInput ? 'f' : 't';
										props.actions.doCommand(`${props.viewInfo.path} set isInput ${value}`, () => {
											props.actions.updateView(props.viewInfo.stackIndex);
										});						
									}
								},
							),
						),
						e(
							// isOutput check box
							'div', {
								id: 'expression__is-output',
								className: 'checkbox-and-label',
							},
							e(
								'label', {
									id: 'expression__is-output-label',
									className: 'checkbox__label',
									htmlFor: 'expression__is-output-checkbox'
								},
								t('react:exprIsOutput'),
							),
							e(
								'input', {
									id: 'expression__is-output-checkbox',
									className: 'checkbox__input',
									type: 'checkbox',
									checked: results.isOutput,
									onChange: () => {
										// toggle the isOutput property
										const value = props.viewInfo.updateResults[0].results.isOutput ? 'f' : 't';
										props.actions.doCommand(`${props.viewInfo.path} set isOutput ${value}`, () => {
											props.actions.updateView(props.viewInfo.stackIndex);
										});						
									}
								},
							),	
						),
					),
				),
				e(
					// results unit line
					'div', {
						id: 'expression__units',
						onClick: () => {
							if (unitType) {
								setDisplay(ExpressionDisplay.unitPicker);
							}
						}
					},
					unitType && valueUnit ? `${unitType}: ${valueUnit}` : ''
				),
				e(
					TableView, {
						id: 'expression__value',
						value: results.value,
						actions: props.actions,
						viewInfo: props.viewInfo,
						viewBox: [0, 0, props.infoWidth - 2*nInfoViewPadding, props.infoHeight - 4*nInputHeight - 14],
						currentCell: selectedCell[0] === 0 && selectedCell[1] === 0 ? null : selectedCell,
						cellClick: cellClick,
					}
				)
			);
		}
		break;
	}

	return e(
		ToolView, {
			id: 'tool-view',
			displayComponent: displayComponent,
			...props,
		},
	);
}