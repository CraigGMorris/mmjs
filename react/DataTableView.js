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
 * Enum for data table display types.
 * @readonly
 * @enum {string}
 */
const DataTableDisplay = Object.freeze({
	table: 0,
	editColumn: 1,
	unitPicker: 2,
	filterEditor: 3,
	defaultEditor: 4,
	editCell: 5,
	editRow: 6,
});

/** Edit Column Component
 */
function EditColumnView(props) {
	const t = props.t;
	const selectedColumn = props.selectedColumn;
	const columnProperties = props.columnProperties;
	const path = props.path;

	const [editColumnDisplay, setEditColumnDisplay] = useState(DataTableDisplay.editColumn);
	const [columnName, setColumnName] = useState(columnProperties.name);
	const [columnNumber, setColumnNumber] = useState(columnProperties.columnNumber);
	const [columnFormat, setColumnFormat] = useState(columnProperties.format ? columnProperties.format : '');
	const [displayUnit, setDisplayUnit] = useState(columnProperties.displayUnit);
	const [defaultValue, setDefaultValue] = useState(columnProperties.defaultValue);
	const [isCalculated, setIsCalculated] = useState(columnProperties.isCalculated || false);
	const [isMenu, setIsMenu] = useState(columnProperties.isMenu || false);
	const [editOptions, setEditOptions] = useState({});

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
	let columnTypeField;  // has a toggle for isCalculated or isMenu for new columns, just data or menu for existing
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
					columnProperties.isMenu = isMenu ? true : false;
					const json = JSON.stringify(columnProperties);
					props.actions.doCommand(`${path} updatecolumn ${json}`, () => {
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
		columnTypeField = e(
			'span', {
				id: 'datatable__column-iscalculated',
				onClick: () => {
					// toggle menu / data type - can't change calculated
					setIsMenu(!isMenu);
				}
			},
			isCalculated ? '': isMenu ? t('react:dataColumnTypeMenu') : t('react:dataColumnTypeData'),
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
					if (isMenu) { columnProperties.isMenu = true;}
					const json = JSON.stringify(columnProperties);
					props.actions.doCommand(`${path} addcolumn ${json}`, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
						props.setDisplay(DataTableDisplay.table);
					});
				}
			},
			t('react:dataAddColumnButton')
		);
		columnTypeField = e(
			'span', {
				id: 'datatable__column-iscalculated',
				onClick: () => {
					// toggle types
					if (isCalculated) {
						setIsCalculated(false);
						setIsMenu(false);
					}
					else if (isMenu) {
						setIsCalculated(true);
						setIsMenu(false);
					}
					else {
						setIsMenu(true);
					}						
				}
			},
			isCalculated ? t('react:dataColumnTypeCalc') : isMenu ? t('react:dataColumnTypeMenu') : t('react:dataColumnTypeData'),
		)
	}

	switch(editColumnDisplay) {
		case DataTableDisplay.defaultEditor:
			return e(
				FormulaEditor, {
					id: 'datatable__column-formula-editor',
					t: t,
					viewInfo: props.viewInfo,
					infoWidth: props.infoWidth,
					infoHeight: props.infoHeight,
					actions: props.actions,
					editOptions: editOptions,
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
					unitName: props.selectedColumn ? props.selectedColumn.dUnit : '',
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
								((selectedColumn && selectedColumn.isMenu) || isMenu) ?
								t('react:dataColumnMenuFormula') :
								t('react:dataColumnValue'),
						),
						columnTypeField,
					),
					e(
						FormulaField, {
							id: 'datatable__formula',
							t: t,
							actions: props.actions,
							path: `${path}.${name}`,
							formula: defaultValue,
							viewInfo: props.viewInfo,
							editAction: (editOptions) => {
								setEditOptions(editOptions);
								setEditColumnDisplay(DataTableDisplay.defaultEditor);
							},
							applyChanges: (formula) => {
								setDefaultValue(formula);
								setEditColumnDisplay(DataTableDisplay.editColumn);
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
 * Edit Row Component
 * 
 */
function EditRowView(props) {
	const [row, column] = props.selectedCell;
	const t = props.t;
	const [editRowDisplay, setEditRowDisplay] = useState(DataTableDisplay.editRow);
	const [selectedField, setSelectedField] = useState(column);
	const [selectedRow, setSelectedRow] = useState(row);
	const [editOptions, setEditOptions] = useState({});
	useEffect(() => {
		const nRows = props.value.nr;
		if (nRows === 0) {
			props.setDisplay(DataTableDisplay.table);
		}
	}, [props])//.value.nr]);

	const displayedRow = Math.min(props.value.nr, selectedRow)
	const value = props.value;
	switch(editRowDisplay) {
		case DataTableDisplay.editRow: {
			const fields = [];
			
			for (let columnNumber = 0; columnNumber < value.nc; columnNumber++) {
				const column = value.v[columnNumber];
				const v = column.v.v[displayedRow - 1];
				let formulaString = '';
				if (typeof v === 'string') {
					formulaString = "'" + v;
				}
				else if (typeof v === 'number') {
					if (column.isCalculated && column.format) {
						formulaString = `${MMFormatValue(v, column.format)} ${column.dUnit}`;
					}
					else {
						formulaString = `${v.toString().replace(/(\..*)(0+$)/,'$1')} ${column.dUnit}`;
					}
				}
				const rowN = column.v.rowN ? column.v.rowN[displayedRow - 1] : displayedRow;
				let valueField;
				let selectValueField;
				if (column.isCalculated) {
					valueField = formulaString;
				}
				else if (column.menu) {
					const options = [];
					const selections = column.menu.selections;
					const values = column.menu.values;
					const nItems = selections.length;
					for (let i = 0; i < nItems; i++) {
						const item = selections[i];
						const value = values[i]
						if (item == v) {
							selectValueField = `: (${value})`;
						}
						options.push(e(
							'option', {
								key: item,
								className: 'datatable__row-menu-option',
								value: value,
							},
							item
						));
					}
					if (!selectValueField) {
						selectValueField = ': ???';
					}
					valueField = e(
						'select', {
							className: 'datatable__row-menu-select',
							value: v,
							onChange: (e) => {
								const newValue = e.target.value;
								if (newValue != v) {
									const replacement = column.v.unit ? newValue + ' ' + column.v.unit : newValue;
									const path = props.viewInfo.path;
									props.actions.doCommand(`${path} setcell ${displayedRow} ${columnNumber + 1} ${replacement}`,() => {
										setEditRowDisplay(DataTableDisplay.editRow);
										props.actions.updateView(props.viewInfo.stackIndex);
									})	
								}
							}
						},
						options
					)
				}
				else {
					valueField = e(
						FormulaField, {
							className: 'datatable__row-formula-field',
							t: t,
							viewInfo: props.viewInfo,
							infoWidth: String(props.infoWidth),
							actions: props.actions,
							formula: formulaString,
							key: rowN, // need to ensure each formula field is unique when moving through rows
							applyChanges: (formula) => {
								const path = props.viewInfo.path;
								props.actions.doCommand(`${path} setcell ${displayedRow} ${selectedField} ${formula}`,() => {
									setEditRowDisplay(DataTableDisplay.editRow);
									props.actions.updateView(props.viewInfo.stackIndex);
								})
							},
							gotFocusAction: () => {
								setSelectedField(columnNumber + 1);
							},

							editAction: (editOptions) => {
								setSelectedField(columnNumber + 1);
								setEditOptions(editOptions);
								setEditRowDisplay(DataTableDisplay.editCell);
							},
						}
					);
				}
				fields.push(
					e(
						'div', {
							className: 'datatable__row-cell',
							key: columnNumber,
						},
						e(
							'div', {
								className: 'datatable__edit-row-name-label',
							},
							column.name,
							selectValueField,
						),
						valueField
					)
				)
			}

			return e(
				'div', {
					id: 'datatable__row-view',
					onKeyDown: e => {
						if (e.code === 'Escape') {
							e.preventDefault();
							props.setDisplay(DataTableDisplay.table);
						}
					}
				},
				e(
					'div', {
						id: 'datatable__edit-row-number',
					},
					t('react:dataRowTitle', {
						row: displayedRow,
						nr: value.nr,
						allNr: (value.allNr ? ` // ${value.allNr}` : '')
					}),
					e(
						'button', {
							id: 'datatable__edit-row-first',
							onClick: () => {
								setSelectedRow(1);
							}							
						},
						t('react:dataRowFirstButton')
					),
					e(
						'button', {
							id: 'datatable__edit-row-prev',
							disabled: displayedRow <= 1,
							onClick: () => {
								if (displayedRow > 1) {
									setSelectedRow(displayedRow-1);
								}
							},
						},
						t('react:dataRowPrevButton')
					),
					e(
						'button', {
							id: 'datatable__edit-row-next',
							disabled: displayedRow >= value.nr,
							onClick: () => {
								if (displayedRow < value.nr) {
									setSelectedRow(displayedRow+1);
								}
							},
						},
						t('react:dataRowNextButton')
					),
					e(
						'button', {
							id: 'datatable__edit-row-last',
							onClick: () => {
								setSelectedRow(value.nr);
							}							
						},
						t('react:dataRowLastButton')
					),
				),
				e(
					'div', {
						id: 'datatable_edit-row-buttons',
					},
					e(
						'button', {
							id: 'datatable__edit-row-add-button',
							disabled: (value && value.nc) ? false : true,
							onClick: () => {
								if (value && value.nc > 0) {
									props.actions.doCommand(`${props.path} addrow ${displayedRow + 1}`, () => {
										props.actions.updateView(props.viewInfo.stackIndex);
										setSelectedRow(displayedRow + 1);
									});
								}
							},
						},	
						t('react:dataRowAddButton')
					),
					e(
						'button', {
							id: 'datatable__edit-row-delete-button',
							onClick: () => {
								props.actions.doCommand(`${props.path} removerows ${displayedRow}`, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
									if (value.nr === 1) {
										props.setDisplay(DataTableDisplay.table);										
									}
									else if (displayedRow >= value.nr) {
										setSelectedRow(value.nr - 1);
									}
								});		
											}
							},
						t('react:dataRowDeleteButton')
					),
					e(
						'button', {
							id: 'datatable__edit-row-done',
							onClick: () => {
								props.setDisplay(DataTableDisplay.table);
							},
						},
						t('react:dataRowDoneButton')
					),
				),
				e(
					'div', {
						id: 'datatable__edit-row-fields',
					},
					fields
				)
			);
		}

		case DataTableDisplay.editCell:
			return e(
				FormulaEditor, {
					id: 'datatable__column-cell-editor',
					t: t,
					viewInfo: props.viewInfo,
					infoWidth: props.infoWidth,
					infoHeight: props.infoHeight,
					actions: props.actions,
					editOptions: editOptions,
					cancelAction: () => {
						setEditRowDisplay(DataTableDisplay.editRow);
					},
					applyChanges: (formula) => {
						const path = props.viewInfo.path;
						props.actions.doCommand(`${path} setcell ${displayedRow} ${selectedField} ${formula}`,() => {
							setEditRowDisplay(DataTableDisplay.editRow);
							props.actions.updateView(props.viewInfo.stackIndex);
						})
					},
				}
			);
	
		default:
			return e('div', {}, 'Invalid row data');
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
	const [editOptions, setEditOptions] = useState({});

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
					setDisplay(DataTableDisplay.editRow);
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
									setDisplay(DataTableDisplay.editRow);
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
					'div', {
						id: "datatable__filter-row",
					},
					t('react:dataFilterLabel'),
					e(
						FormulaField, {
							id: 'datatable__filter-formula',
							t: t,
							actions: props.actions,
							path: `${path}.filterFormula`,
							formula: results.value.filter || '',
							viewInfo: props.viewInfo,
							editAction: (editOptions) => {
								setEditOptions(editOptions);
								setDisplay(DataTableDisplay.filterEditor);
							},
							applyChanges: (formula) => {
								const path = props.viewInfo.path;
								props.actions.doCommand(`${path}.filterFormula set formula ${formula}`,() => {
									props.actions.updateView(props.viewInfo.stackIndex);
								})
							}
						}
					),
				),
				e(
					TableView, {
						id: 'datatable__value',
						value: results.value,
						actions: props.actions,
						viewInfo: props.viewInfo,
						viewBox: [0, 0, props.infoWidth - 2*nInfoViewPadding, props.infoHeight - 3*nInputHeight - 24],
						selectedRows: selectedRows,
						currentCell: selectedCell[0] === 0 && selectedCell[1] === 0 ? null : selectedCell,
						cellClick: cellClick,
						longPress: longPress,
					}
				)
			)}
			break;

		case DataTableDisplay.filterEditor: {
			displayComponent = e(
				FormulaEditor, {
					id: 'datatable__filter-formula-editor',
					t: t,
					viewInfo: props.viewInfo,
					infoWidth: props.infoWidth,
					infoHeight: props.infoHeight,
					actions: props.actions,
					editOptions: editOptions,
					cancelAction: () => {
						setDisplay(DataTableDisplay.table);
					},
					applyChanges: (formula) => {
						const path = props.viewInfo.path;
						props.actions.doCommand(`${path}.filterFormula set formula ${formula}`,() => {
							props.actions.updateView(props.viewInfo.stackIndex);
							setDisplay(DataTableDisplay.table);
						})
					}
				}
			);
		}
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
					isMenu: selectedColumn.menu ? true : false,
					isCalculated: selectedColumn.isCalculated ? true : false,
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
						infoWidth: props.infoWidth,
						infoHeight: props.infoHeight,
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

		case DataTableDisplay.editRow: {			
			displayComponent = e(
				'div', {
					key: 'edit',
					id: 'datatable__edit-row',
				},
				e(
					EditRowView, {
						t: props.t,
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						infoHeight: props.infoHeight,
						value: value,
						path: path,
						actions: props.actions,
						selectedCell: selectedCell,
						setDisplay: setDisplay,
					},
				)
			)
		}
			break;
	
		case DataTableDisplay.editCell: {
			const [row, column] = selectedCell;

			return e(
				FormulaEditor, {
					id: 'datatable__column-cell-editor',
					t: t,
					viewInfo: props.viewInfo,
					infoWidth: props.infoWidth,
					infoHeight: props.infoHeight,
					actions: props.actions,
					editOptions: editOptions,
					cancelAction: () => {
						setDisplay(DataTableDisplay.table);
					},
					applyChanges: (formula) => {
						const path = props.viewInfo.path;
						props.actions.doCommand(`${path} setcell ${row} ${column} ${formula}`,() => {
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
