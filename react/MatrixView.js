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
	const rowCountFormula = results.rowCountFormula;
	const columnCountFormula = results.columnCountFormula;
	const rowCount = results.rowCount;
  const columnCount = results.columnCount;
	const cellInputs = results.cellInputs || [];

	const value = results.value;

	const [currentCell, setCurrentCell] = useState([0,0]);
	const [display, setDisplay] = useState(MatrixDisplay.table);
	const originInput = cellInputs[currentCell.join('_')];
	const [editFormula, setEditFormula] = useState(originInput ? originInput.input : '')
	const [formulaOffset, setFormulaOffset] = useState(editFormula.length);
	const [applyType, setApplyType] = useState('cell');

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

	if (updateResults.error) {
		// use empty command just to defer popView
		props.actions.doCommand('', () => {
			props.actions.popView();
		});
		return null;
	}

	const valueUnit = (value && value.unit) ? value.unit : '';
	const unitType = (value && value.unitType) ? value.unitType : '';
	const nInputHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--input--height'));
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));

	const applyChanges = (type) => {
		switch(type) {
			case 'cell':
				return (formula) => {
					const path = props.viewInfo.path;
					props.actions.doCommand(`__blob__${path} setcell ${currentCell.join(' ')}__blob__${formula}`, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
						setEditFormula(formula);
						setDisplay(MatrixDisplay.table);
					});
				}
			case 'columns':
				return (formula) => {
					props.actions.doCommand(`__blob__${results.path}.columnCount set formula__blob__${formula}`, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
						setEditFormula(formula);
						setDisplay(MatrixDisplay.table);
					});
				}
				case 'rows':
					return (formula) => {
						props.actions.doCommand(`__blob__${results.path}.rowCount set formula__blob__${formula}`, () => {
							props.actions.updateView(props.viewInfo.stackIndex);
							setEditFormula(formula);
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
					actions: props.actions,
					formula: editFormula,
					formulaOffset: formulaOffset,
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
				setFormulaOffset(formula.length);
				setDisplay(MatrixDisplay.formulaEditor);
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
							clickAction: (offset) => {
								setFormulaOffset(offset);
								setEditFormula(rowCountFormula || '');
								setApplyType('rows');
								setDisplay(MatrixDisplay.formulaEditor);
							}
						}
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
							clickAction: (offset) => {
								setFormulaOffset(offset);
								setEditFormula(columnCountFormula || '');
								setApplyType('columns');
								setDisplay(MatrixDisplay.formulaEditor);
							}
						}
					)
				),
				e(
					'div', {
						id: 'matrix__unit-line',
					},
					e(
						'div', {
							id: 'matrix__current-cell-location',
						},
						`[${currentCell.join(', ')}]`,
					),
					e (
						'div', {
							id: 'matrix__output-unit',
							onClick: () => {
								setDisplay(MatrixDisplay.unitPicker);
							}
						},
						`${unitType}: ${valueUnit}`,
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
							clickAction: (offset) => {
								setFormulaOffset(offset);
								const cellInput = cellInputs[`${currentCell.join('_')}`];
								const formula = cellInput ? cellInput.input : '';
								setEditFormula(formula);
								setApplyType('cell');
								setDisplay(MatrixDisplay.formulaEditor);
							}
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