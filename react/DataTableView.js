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
 * Enum for data table display types.
 * @readonly
 * @enum {string}
 */
const DataTableDisplay = Object.freeze({
	table: 0,
	editColumn: 1,
	unitPicker: 2,
	formulaEditor: 3,
	cellEditor: 4,
});

/** EditColumnComponent
 */
function EditColumnView(props) {
	const t = props.t;
	const selectedColumn = props.selectedColumn;
	const columnProperties = props.columnProperties;
	const path = props.path;
	// const name = props.name;

	const [editColumnDisplay, setEditColumnDisplay] = useState(DataTableDisplay.editColumn);
	const [columnName, setColumnName] = useState(columnProperties.name);
	const [columnNumber, setColumnNumber] = useState(columnProperties.columnNumber);
	const [columnFormat, setColumnFormat] = useState(columnProperties.format ? columnProperties.format : '');
	const [formulaOffset, setFormulaOffset] = useState(0);
	const [displayUnit, setDisplayUnit] = useState(columnProperties.displayUnit);
	const [defaultValue, setDefaultValue] = useState(columnProperties.defaultValue);
	const [isCalculated, setIsCalculated] = useState(columnProperties.isCalculated || false);

	const cancelButton = e(
		'button', {
			id: 'datatable__cancel-button',
			onClick: () => {
				props.setDisplay(DataTableDisplay.table);
			},
		},
		t('react:dataCancelButton'),
	);

	let actionButton;  // changes depending on whether defining new column or updating existiong
	let deleteButton;  // not shown for new columns - just cancel if not wanted
	let isCalculatedField;  // has a toggle for isCalculate for new columns
	if (selectedColumn) {
		// has selectedColumn, so is update, not add
		actionButton = e(
			'button', {
				id: 'datatable_action-button',
				onClick: () => {
					if (columnName !== columnProperties.name) {
						columnProperties.newName = columnName;
					}
					columnProperties.defaultValue = defaultValue;
					columnProperties.columnNumber = columnNumber;
					columnProperties.displayUnit = displayUnit;
					columnProperties.format = columnFormat;
					const json = JSON.stringify(columnProperties);
					props.actions.doCommand(`__blob__${path} updatecolumn__blob__${json}`, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
						props.setDisplay(DataTableDisplay.table);
					});
				}
			},
			t('react:dataUpdateButton')
		);
		deleteButton = e(
			'button', {
				id: 'datatable__column-delete-button',
				onClick: () => {
					props.actions.doCommand(`${path} removecolumn ${columnName}`, () => {
						props.setDisplay(DataTableDisplay.table);
						props.actions.updateView(props.viewInfo.stackIndex);
					})
				}
			},
			t('react:dataDeleteColumnButton'),
		);
	}
	else {
		// no selectedColumn, so this is a new column
		actionButton = e(
			'button', {
				id: 'datatable_action-button',
				onClick: () => {
					columnProperties.name = columnName;
					columnProperties.defaultValue = defaultValue;
					columnProperties.columnNumber = columnNumber;
					columnProperties.displayUnit = displayUnit;
					columnProperties.format = columnFormat;
					if (isCalculated) { columnProperties.isCalculated = true; }
					const json = JSON.stringify(columnProperties);
					props.actions.doCommand(`__blob__${path} addcolumn__blob__${json}`, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
						props.setDisplay(DataTableDisplay.table);
					});
				}
			},
			t('react:dataAddColumnButton')
		);
		isCalculatedField = e(
			'span', {
				id: 'datatable__column-iscalculated',
				onClick: () => {
					// toggle isCalculated
					setIsCalculated(!isCalculated);						
				}
			},
			isCalculated ? 'Calculated' : 'Data',
		)
	}

	switch(editColumnDisplay) {
		case DataTableDisplay.formulaEditor:
			return e(
				FormulaEditor, {
					id: 'datatable__column-formula-editor',
					t: t,
					viewInfo: props.viewInfo,
					infoWidth: props.infoWidth,
					actions: props.actions,
					formula: defaultValue,
					formulaOffset: formulaOffset,
					cancelAction: () => {
						setEditColumnDisplay(DataTableDisplay.editColumn);
					},
					applyChanges: (formula) => {
						setDefaultValue(formula);
						setEditColumnDisplay(DataTableDisplay.editColumn);
					}
				}
			);

		case DataTableDisplay.unitPicker:
			return e(
				UnitPicker, {
					key: 'unit',
					t: props.t,
					actions: props.actions,
					unitType: props.unitType,
					cancel: () => {
						setEditColumnDisplay(DataTableDisplay.editColumn);
					},
					apply: (unit) => {
						setDisplayUnit(unit);
						setEditColumnDisplay(DataTableDisplay.editColumn);
					},
				}
			);

		case DataTableDisplay.editColumn:
			return e(
				'div', {
					id: 'datatable__column-view',
				},
				e(
					'div', {
						id: 'datatable__display-buttons'
					},
					cancelButton,
					actionButton,
					),
				e(
					'div', {
						id: 'datatable__column-name-line',
						className: 'datatable__column-edit-section',
					},
					e(
						'label', {
							id: 'datatable__column-name-label',
							htmlFor: 'datatable__column-name-field',
						},
						t('react:dataColumnName'),
					),
					e(
						'input', {
							id: 'datatable__column-name-field',
							value: columnName,
							// width: this.props.infoWidth - 25,
							onChange: (event) => {
								// keeps input field in sync
								setColumnName(event.target.value);
							},
						}
					)
				),
				e(
					'div', {
						id: 'datatable__column-position-line',
						className: 'datatable__column-edit-section',
					},
					e(
						'label', {
							id: 'datatable__column-position-label',
							htmlFor: 'datatable__column-position-field',
						},
						t('react:dataColumnPosition'),
					),
					e(
						'input', {
							id: 'datatable__column-position-field',
							value: columnNumber,
							// width: this.props.infoWidth - 25,
							onChange: (event) => {
								// keeps input field in sync
								setColumnNumber(event.target.value);
							},
						}
					)
				),
				e(
					'div', {
						id: 'datatable__column-value-line',
						className: 'datatable__column-edit-section',
					},
					e(
						'div', {
							id: 'datatable__column-value-header'
						},
						e(
							'label', {
								id: 'datatable__column-value-label',
								htmlFor: 'datatable__formula',
							},
							((selectedColumn && selectedColumn.isCalculated) || isCalculated) ?
								t('react:dataColumnCalcFormula') :
								t('react:dataColumnValue'),
						),
						isCalculatedField,
					),
					e(
						FormulaField, {
							id: 'datatable__formula',
							t: t,
							actions: props.actions,
							path: `${path}.${name}`,
							formula: defaultValue,
							viewInfo: props.viewInfo,
							clickAction: (offset) => {
								setFormulaOffset(offset);
								setEditColumnDisplay(DataTableDisplay.formulaEditor);
							}
						}
					),
				),
				e(
					'div', {
						id: 'datatable__column-unit-line',
						className: 'datatable__column-edit-section',
						onClick: () => {
							setEditColumnDisplay(DataTableDisplay.unitPicker);
						}
					},
					e(
						'label', {
							id: 'datatable__column-unit-label',
							htmlFor: 'datatable__column-unit',
						},
						t('react:dataColumnUnit'),
					),
					e(
						'div', {
							id: 'datatable__column-unit',
						},
						displayUnit,
					),
				),
				e(
					'div', {
						id: 'datatable__column-format-line',
						className: 'datatable__column-edit-section',
					},
					e(
						'label', {
							id: 'datatable__column-format-label',
							htmlFor: 'datatable__column-format-field',
						},
						t('react:dataColumnFormat'),
					),
					e(
						'input', {
							id: 'datatable__column-format-field',
							value: columnFormat,
							onChange: (event) => {
								// keeps input field in sync
								setColumnFormat(event.target.value);
							},
						}
					),
				),
				deleteButton,
			);

		default:
			return e('div', {}, 'Invalid data column display type');
	}
}

/**
 * DataTableView
 * info view for data table
 */

export function DataTableView(props) {
	const [display, setDisplay] = useState(DataTableDisplay.table);
	const [selectedCell, setSelectedCell] = useState([0,0]);
	const [selectedRows, setSelectedRows] = useState();

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);

		const state = props.viewInfo.dataTableViewState;
		if (state) {
			setDisplay(state.display);
			setSelectedCell(state.selectedCell);
		}
		else {
			props.viewInfo.dataTableViewState = {
				display: display,
				selectedCell: selectedCell,
			};
		}
	
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		props.viewInfo.dataTableViewState.display = display;
	}, [display, props.viewInfo])

	useEffect(() => {
		props.viewInfo.dataTableViewState.selectedCell = selectedCell;
	}, [selectedCell, props.viewInfo])

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
	if (!results.value) {
		return e(
			ToolView, {
				id: 'tool-view',
				displayComponent: null,
				...props,
			},
		);
	}

	const path = results.path;
	const value = results.value;
	const columnNumber = selectedCell[1];
	const selectedColumn = columnNumber > 0 ? value.v[columnNumber - 1] : null;
	const unitType = columnNumber > 0 && columnNumber <= value.v.length ? value.v[columnNumber - 1].unitType : '';
	const nInputHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--input--height'));
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));

	let displayComponent;
	switch (display) {
		case DataTableDisplay.table: {
			const cellClick = (row, column) => {
				if (column === 0 && row > 0) {  // row selection
					let rowSet = new Set()
					if (selectedRows) {
						selectedRows.forEach(v => rowSet.add(v));
					}
					if (rowSet.has(row)) {
						rowSet.delete(row);
					}
					else {
						rowSet.add(row);
					}
					if (rowSet.size === 0) {
						rowSet = null;
					}
					setSelectedRows(rowSet);
					setSelectedCell([row,column]);
				}
				else if (row === 0 && column > 0) {  //column selection
					setSelectedCell([row,column]);
					setSelectedRows();
					setDisplay(DataTableDisplay.editColumn);
				}
				else if (row === 0 && column === 0) {
					setSelectedCell([row,column]);
					setSelectedRows();				
				}
				else {
					if (value && value.nr && value.nc) {
						row = Math.max(0, Math.min(row, value.nr));
						column = Math.max(0, Math.min(column, value.nc));
					}
					else {
						row = column = 0;
					}
					setSelectedCell([row,column]);
					setSelectedRows();
					setDisplay(DataTableDisplay.cellEditor)
				}
			}

			const longPress = (row, column) => {
				if (selectedRows && column === 0 && row > 0) {
					let lastRow = selectedCell[0];
					if (row != lastRow) {
						setSelectedCell([row, column]);
						const rowSet = new Set();
						selectedRows.forEach(v => rowSet.add(v));
						if (row < lastRow) {
							[row, lastRow] = [lastRow, row];
						}
						for (let i = lastRow; i <= row; i++) {
							rowSet.add(i);
						}
						setSelectedRows(rowSet);
					}
				}
				else {
					cellClick(row, column);
				}
			}
			let addColumnButton, addRowButton, deleteRowsButton;

			if (selectedRows) {
				deleteRowsButton = e(
					'button', {
						id: 'deleteRowsButton',
						onClick: () => {
							props.actions.doCommand(`${path} removerows ${[...selectedRows].join(' ')}`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
								setSelectedCell([0, 0]);
								setSelectedRows();
							});		
						}
					},
					t('react:dataDeleteRowsButton', {count: selectedRows.size}),
				)
			}
			else {
				addColumnButton = e(
					'button', {
						id: 'data__add-column-button',
						onClick: () => {
							if (value) {
								setSelectedCell([0, 0]);
								setDisplay(DataTableDisplay.editColumn);
							}
						},
					},
					t('react:dataAddColumnButton'),
				);
		
				addRowButton = e(
					'button', {
						id: 'data__add-row-button',
						disabled: (value && value.nc) ? false : true,
						onClick: () => {
							if (value && value.nc > 0) {
								props.actions.doCommand(`${path} addrow`, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
									setSelectedCell([value.nr + 1, 1]);
									setSelectedRows();
								});
							}
						}
					},
					t('react:dataAddRowButton'),
				)
			}
		
			displayComponent = e(
				'div', {
					id: 'datatable__table',
					key: 'table',
				},
				e(
					'div', {
						id: 'datatable__display-buttons'
					},
					addRowButton,
					addColumnButton,
					deleteRowsButton,
				),
				e(
					TableView, {
						id: 'datatable__value',
						value: results.value,
						actions: props.actions,
						viewInfo: props.viewInfo,
						viewBox: [0, 0, props.infoWidth - 2*nInfoViewPadding, props.infoHeight - 2*nInputHeight - 14],
						selectedRows: selectedRows,
						currentCell: selectedCell[0] === 0 && selectedCell[1] === 0 ? null : selectedCell,
						cellClick: cellClick,
						longPress: longPress,
					}
				)
			)}
			break;

		case DataTableDisplay.editColumn: {
			let columnProperties;
			if (!selectedColumn) {
				// no selectedColumn means it must be add column
				//create defaults

				columnProperties = {
					name: `Field_${value.nc + 1}`,
					defaultValue: '0 Fraction',
				}				
			}
			else {
				columnProperties = {
					name: selectedColumn.name,
					displayUnit: selectedColumn.dUnit,
					defaultValue: selectedColumn.defaultValue,
					columnNumber: selectedCell[1],
					format: selectedColumn.format
				}
			}
				
			displayComponent = e(
				'div', {
					key: 'edit',
					id: 'datatable__edit-column',
				},
				e(
					EditColumnView, {
						t: props.t,
						viewInfo: props.viewInfo,
						path: path,
						columnProperties: columnProperties,
						actions: props.actions,
						selectedColumn: selectedColumn,
						unitType: unitType,
						setDisplay: setDisplay,
					},
				)
			)
		}
			break;
		case DataTableDisplay.cellEditor: {
			const [row, column] = selectedCell;
			let formulaString = '';
			if (column > 0 && row > 0) {
				const tableColumn = value.v[column - 1];
				const v = tableColumn.v.v[row - 1];
				if (typeof v === 'string') {
					formulaString = "'" + v;
				}
				else if (typeof v === 'number') {
					formulaString = `${v.toString().replace(/(\..*)(0+$)/,'$1')} ${tableColumn.dUnit}`;
				}
			}

			return e(
				FormulaEditor, {
					id: 'datatable__column-cell-editor',
					t: t,
					viewInfo: props.viewInfo,
					infoWidth: props.infoWidth,
					actions: props.actions,
					formula: formulaString || '',
					formulaOffset: 0,
					cancelAction: () => {
						setDisplay(DataTableDisplay.table);
					},
					applyChanges: (formula) => {
						const path = props.viewInfo.path;
						props.actions.doCommand(`__blob__${path} setcell ${row} ${column}__blob__${formula}`,() => {
							setDisplay(DataTableDisplay.table);
							props.actions.updateView(props.viewInfo.stackIndex);
						})
					},

				}
			);
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
