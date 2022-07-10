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
	const [editOptions, setEditOptions] = useState({});
	const [formatString, setFormatString] = useState('');

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const results = updateResults.length ? updateResults[0].results : {};
		if (results.value) {
			if (results.value.t === 't') {
				const column = selectedCell[1] - 1;
				if (column >= 0) {
					const v = results.value.v;
					if (v[column] && v[column].format) {
						setFormatString(v[column].format);
					}
					else {
						setFormatString('');
					}
				}
			}
			else if (results.value.format) {
				setFormatString(results.value.format);
			}
		}
	}, [props.viewInfo.updateResults, selectedCell])

	const t = props.t;
	const updateResults = props.viewInfo.updateResults;
	if (updateResults.error) {
		// use empty command just to defer popView
		props.actions.doCommand('', () => {
			props.actions.popView();
		});
		return null;
	}

	const applyChanges = (formula) => {
		props.actions.doCommand(`__blob__${path}.${formulaName} set formula__blob__${formula}`, () => {
			props.actions.updateView(props.viewInfo.stackIndex);
			setDisplay(ExpressionDisplay.expression);
		});
	}

	const results = updateResults.length ? updateResults[0].results : {};
	const path = results.path;
	const value = results.value;
	if (!value) {
		return e(
			ToolView, {
				id: 'tool-view',
				displayComponent: null,
				...props,
			},
		);
	}
	const isTable = (value && value.t) === 't';
	let unitType;
	let valueUnit;
	if (isTable) {	
		if (selectedCell[0] === 0 && selectedCell[1] > 0) {
			const v = value.v[selectedCell[1] - 1].v;
			unitType = v.unitType;
			valueUnit = v.unit;
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
					infoWidth: props.infoWidth,
					actions: props.actions,
					editOptions: editOptions,
					cancelAction: () => {
						setDisplay(ExpressionDisplay.expression);
					},
					applyChanges: applyChanges,
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
					setSelectedCell([row,column]);
					// if (isTable) {
					// 	setSelectedCell([row,column]);
					// 	setDisplay(ExpressionDisplay.unitPicker);
					// }
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

			let displayedUnit = '';
			let formatInput = '';
			if (unitType && valueUnit) {
				displayedUnit = `${unitType}: ${valueUnit}`;
				formatInput = e(
					'input', {
						id: 'expression__format-input',
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
							// set the expression format
							let cmd;
							if (isTable) {
								cmd = `${props.viewInfo.path} setcolumnformat ${selectedCell[1]} ${formatString}`
							}
							else {
								cmd = `${props.viewInfo.path} set format ${formatString}`;
							}
							props.actions.doCommand(cmd, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							});
						},		
					}
				);
			}
			else if (value.t === 's') {
				displayedUnit = 'String';
			}
			displayComponent = e(
				'div', {
					// main vertical sections
					id: 'expression',
					key: 'expression'
				},
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
									checked: results.isInput || false,
									onChange: (event) => {
										// toggle the isInput property
										event.stopPropagation();
										event.preventDefault();					
										const value = props.viewInfo.updateResults[0].results.isInput ? 'f' : 't';
										props.actions.doCommand(`${props.viewInfo.path} set isInput ${value}`, () => {
											props.actions.updateView(props.viewInfo.stackIndex);
										});						
									}
								},
							),
						),
						e(
							// showInput check box
							'div', {
								id: 'expression__show-input',
								className: 'checkbox-and-label',
							},
							e(
								'label', {
									id: 'expression__show-input-label',
									className: 'checkbox__label',
									htmlFor: 'expression__show-input-checkbox'
								},
								t('react:exprShowInput'),
							),
							e(
								'input', {
									id: 'expression__show-input-checkbox',
									className: 'checkbox__input',
									type: 'checkbox',
									checked: results.showInput || false,
									onChange: (event) => {
										// toggle the isOutput property
										event.stopPropagation();
										event.preventDefault();					
										const value = props.viewInfo.updateResults[0].results.showInput ? 'f' : 't';
										props.actions.doCommand(`${props.viewInfo.path} set showInput ${value}`, () => {
											props.actions.updateView(props.viewInfo.stackIndex);
										});						
									}
								},
							),	
						),
					),
				),
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
							editAction: (editOptions) => {
								setEditOptions(editOptions);
								setDisplay(ExpressionDisplay.formulaEditor);
							},
							applyChanges: applyChanges,	
						}
					)
				),
				e(
					'div', {
						id: 'expression__units-format',						
					},
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
						displayedUnit
					),
					e(
						'div', {
							id: 'expression__format',
						},
						formatInput,
					),
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
			isExpression: true,
			displayComponent: displayComponent,
			...props,
		},
	);
}