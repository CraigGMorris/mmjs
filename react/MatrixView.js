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
 * Enum for matrix display types.
 * @readonly
 * @enum {string}
 */
const MatrixDisplay = Object.freeze({
	table: 0,
	unitPicker: 2,
	formulaEditor: 3
});

/**
 * MatrixView
 * info view for matrix
 */
export function MatrixView(props) {

	const t = props.t;
	const updateResults = props.viewInfo.updateResults;
	const results = updateResults.length ? updateResults[0].results : {};
	const rowCount = results.rowCount;
  const columnCount = results.columnCount;
	const cellInputs = results.cellInputs || [];

	const value = results.value;

	const [currentCell, setCurrentCell] = useState([0,0]);
	const [display, setDisplay] = useState(MatrixDisplay.table);
	const originInput = cellInputs[currentCell.join('_')];
	const [editFormula, setEditFormula] = useState(originInput ? originInput.input : '')
	const [rowCountFormula, setRowCountFormula] = useState(results.rowCountFormula);
	const [columnCountFormula, setColumnCountFormula] = useState(results.columnCountFormula);

	const [editOptions, setEditOptions] = useState({})
	const [applyType, setApplyType] = useState('cell');
	const [formatString, setFormatString] = useState('');

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);

		if ( props.viewInfo.matrixViewState) {
			const state = props.viewInfo.matrixViewState;
			setCurrentCell(state.currentCell);
			setEditFormula(state.editFormula);
			setDisplay(state.display);
		}
		else {
			props.viewInfo.matrixViewState = {
				currentCell: currentCell,
				editFormula: editFormula,
				display: display,
			}
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		props.viewInfo.matrixViewState.currentCell = currentCell;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const results = updateResults.length ? updateResults[0].results : {};
		if (results.value && results.value.format) {
			setFormatString(results.value.format);
		}
		else {
			setFormatString('');
		}
		if (results.columnCountFormula) {
			setColumnCountFormula(results.columnCountFormula);
		}
		if (results.rowCountFormula) {
			setRowCountFormula(results.rowCountFormula);
		}
	}, [updateResults])


	if (updateResults.error) {
		// use empty command just to defer popView
		props.actions.doCommand('', () => {
			props.actions.popView();
		});
		return null;
	}

	if (!value) {
		return e(
			ToolView, {
				id: 'tool-view',
				displayComponent: null,
				...props,
			},
		);
	}

	const valueUnit = (value && value.unit) ? value.unit : '';
	const unitType = (value && value.unitType) ? value.unitType : '';
	const unitName = value ? value.unit : '';
	const nInputHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--input--height'));
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));

	const applyChanges = (type) => {
		switch(type) {
			case 'cell':
				return (formula) => {
					const path = props.viewInfo.path;
					props.actions.doCommand(`${path} setcell ${currentCell.join(' ')} ${formula}`, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
						setEditFormula(formula);
						setDisplay(MatrixDisplay.table);
					});
				}
			case 'columns':
				return (formula) => {
					props.actions.doCommand(`${results.path}.columnCount set formula ${formula}`, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
						setColumnCountFormula(formula);
						setDisplay(MatrixDisplay.table);
					});
				}
				case 'rows':
					return (formula) => {
						props.actions.doCommand(`${results.path}.rowCount set formula ${formula}`, () => {
							props.actions.updateView(props.viewInfo.stackIndex);
							setRowCountFormula(formula);
							setDisplay(MatrixDisplay.table);
						});
					}
			}
	}

	let displayComponent;

	switch (display) {
		case MatrixDisplay.unitPicker:
			displayComponent = e(
				UnitPicker, {
					key: 'unit',
					t: props.t,
					actions: props.actions,
					unitType: unitType,
					unitName: unitName,
					cancel: () => {
						setDisplay(MatrixDisplay.table);
					},
					apply: (unit) => {
						props.actions.doCommand(`${props.viewInfo.path} set displayUnitName ${unit}`, () => {
							props.actions.updateView(props.viewInfo.stackIndex);
							setDisplay(MatrixDisplay.table);
						});						
					},
				}
			);
			break;

		case MatrixDisplay.formulaEditor:
			displayComponent = e(
				FormulaEditor, {
					id: 'matrix-cell-formula-editor',
					key: 'editor',
					t: t,
					viewInfo: props.viewInfo,
					infoWidth: props.infoWidth,
					infoHeight: props.infoHeight,
					actions: props.actions,
					editOptions: editOptions,
					cancelAction: () => {
						setDisplay(MatrixDisplay.table);
					},
					applyChanges: applyChanges(applyType),
				}
			);
			break;

		case MatrixDisplay.table: {
			const cellClick = (row, column) => {
				row = Math.min(row, rowCount);
				column = Math.min(column, columnCount);
				setCurrentCell([row, column]);
				const cellInput = cellInputs[`${row}_${column}`];
				const formula = cellInput ? cellInput.input : '';
				setEditFormula(formula);
				setApplyType('cell');
			}

			displayComponent = e(
				'div', {
					// main vertical sections
					id: 'matrix',
					key: 'matrix'
				},
				e(
					'div', {
						id: 'matrix__size-fields'
					},
					e(
						'span', {
							id: 'matrix__row-count-label',
							// htmlFor: 'matrix-row-count-formula'
						}, t('react:matrixRowCountLabel')
					),
					e(
						FormulaField, {
							id: 'matrix-row-count-formula',
							t: t,
							actions: props.actions,
							path: `${results.path}.rowCount`,
							formula: rowCountFormula || '',
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							editAction: (editOptions) => {
								setEditOptions(editOptions);
								setApplyType('rows');
								setDisplay(MatrixDisplay.formulaEditor);
							},
							applyChanges: applyChanges('rows'),
						},
					),
					e(
						'span', {
							id: 'matrix__column-count-label',
							// htmlFor: 'matrix-column-count-formula'
						}, t('react:matrixColumnCountLabel')
					),
					e(
						FormulaField, {
							id: 'matrix__column-count-formula',
							t: t,
							actions: props.actions,
							path: `${results.path}.columnCount`,
							formula: columnCountFormula || '',
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							editAction: (editOptions) => {
								setEditOptions(editOptions);
								setApplyType('columns');
								setDisplay(MatrixDisplay.formulaEditor);
							},
							applyChanges: applyChanges('columns'),
						}
					)
				),
				e(
					'div', {
						id: 'matrix__unit-line',
					},
					e (
						'div', {
							id: 'matrix__output-unit',
							onClick: () => {
								setDisplay(MatrixDisplay.unitPicker);
							}
						},
						`${unitType}: ${valueUnit}`,
					),
					e(
						'input', {
							id: 'matrix__format-input',
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
								// set the expression format
								const cmd = `${props.viewInfo.path} set format ${formatString}`;
								props.actions.doCommand(cmd, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
								});
							},		
						}
					),
				),
				e(
					'div', {
						id: 'matrix__formula-line'
					},
					e(
						FormulaField, {
							id: 'matrix__cell-formula',
							t: t,
							actions: props.actions,
							path: `${results.path}.cell_${currentCell.join('_')}`,
							formula: editFormula,
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							editAction: (editOptions) => {
								setEditOptions(editOptions);
								setApplyType('cell');
								setDisplay(MatrixDisplay.formulaEditor);
							},
							applyChanges: applyChanges('cell'),
						}

					)
				),
				e(
					TableView, {
						id: 'matrix__value',
						value: results.value,
						actions: props.actions,
						viewInfo: props.viewInfo,
						viewBox: [0, 0, props.infoWidth - 2*nInfoViewPadding, props.infoHeight - 4*nInputHeight - 14],
						cellClick: cellClick,
						cellInputs: cellInputs,
						currentCell: currentCell,
					}
				),
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