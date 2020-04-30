'use strict';

import {ToolView} from './ToolView.js';
import {FormulaField} from './FormulaView.js';
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
});

/** EditColumnComponent
 */
function EditColumnView(props) {
	const t = props.t;
	const selectedColumn = props.selectedColumn;
	const path = props.path;
	const name = props.name;

	const [columnName, setColumnName] = useState(selectedColumn.name);
	const [columnNumber, setColumnNumber] = useState(props.columnNumber);
	const [columnFormat, setColumnFormat] = useState(selectedColumn.format ? selectedColumn.format : '');
	const doRename = () => {
		props.actions.doCommand(`${path}.${name} renameto ${columnName}`, () => {
			props.actions.updateView(props.viewInfo.stackIndex);
		})
	}

	const reposition = (fromNumber, toNumber) => {
		props.actions.doCommand(`${path} movecolumn ${fromNumber} ${toNumber}`, () => {
			props.actions.updateView(props.viewInfo.stackIndex);
		})
	}

	const defaultValueChange = (formula, callback) => {
		props.actions.doCommand(`__blob__${path}.${name} set defaultValue__blob__${formula}`, callback);
	}

	const changeFormat = () => {
		props.actions.doCommand(`__blob__${path}.${name} set format__blob__${columnFormat}`, () => {
			props.actions.updateView(props.viewInfo.stackIndex);
		})
	}
	
	return e(
		'div', {
			id: 'datatable__column-view',
		},
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
					onKeyPress: (event) => {
						// watches for Enter and sends command when it see it
						if (event.key == 'Enter') {
							doRename();
						}
					},
					onBlur: () => {
						// watch for loss of focus
						doRename();
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
					onKeyPress: (event) => {
						// watches for Enter and sends command when it see it
						if (event.key == 'Enter') {
							reposition(props.columnNumber, columnNumber);
						}
					},
					onBlur: () => {
						// watch for loss of focus
						reposition(props.columnNumber, columnNumber);
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
				'label', {
					id: 'datatable__column-value-label',
					htmlFor: 'datatable__formula',
				},
				t('react:dataColumnValue'),
			),
			e (
				FormulaField, {
					id: 'datatable__formula',
					t: t,
					actions: props.actions,
					path: `${path}.${name}`,
					formula: props.defaultValue || '',
					viewInfo: props.viewInfo,
					infoWidth: props.infoWidth,
					applyChanges: defaultValueChange,
				}
			),
		),
		e(
			'div', {
				id: 'datatable__column-unit-line',
				className: 'datatable__column-edit-section',
				onClick: () => {
					props.setDisplay(DataTableDisplay.unitPicker);
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
				selectedColumn.dUnit,
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
					// width: this.props.infoWidth - 25,
					onChange: (event) => {
						// keeps input field in sync
						setColumnFormat(event.target.value);
					},
					onKeyPress: (event) => {
						// watches for Enter and sends command when it see it
						if (event.key == 'Enter') {
							changeFormat();
						}
					},
					onBlur: () => {
						// watch for loss of focus
						changeFormat();
					},
				}
			),
		),
		e(
			'button', {
				id: 'datatable__column-delete-button',
				onClick: () => {
					props.actions.doCommand(`${path} removecolumn ${name}`, () => {
						props.setDisplay(DataTableDisplay.table);
						props.actions.updateView(props.viewInfo.stackIndex);
					})
				}
			},
			t('react:dataDeleteColumnButton'),
		),
	);
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
		props.actions.popView();
		return null;
	}

	const results = updateResults.length ? updateResults[0].results : {};
	const path = results.path;
	const value = results.value;
	const columnNumber = selectedCell[1];
	const selectedColumn = columnNumber > 0 ? value.v[columnNumber - 1] : null;
	const unitType = columnNumber > 0 && columnNumber <= value.v.length ? value.v[columnNumber - 1].unitType : '';
	const nInputHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--input--height'));
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));

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
						props.actions.doCommand(`${path} addcolumn`, () => {
							props.actions.updateView(props.viewInfo.stackIndex);
							setSelectedRows();
							setSelectedCell([0, value.nc + 1]);
							setDisplay(DataTableDisplay.editColumn);
						});
					}
				},
			},
			t('react:dataAddColumnButton'),
		);

		addRowButton = e(
			'button', {
				id: 'data__add-row-button',
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

	const tableButton = e(
		'button', {
			id: 'data__table-button',
			onClick: () => {
				setDisplay(DataTableDisplay.table);
			},
		},
		t('react:dataTableButton'),
	);

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
			
					let formulaString = '';
					if (column > 0 && row > 0) {
						const tableColumn = value.v[column - 1];
						const v = tableColumn.v.v[row - 1];
						if (typeof v === 'string') {
							formulaString = v;
						}
						else if (typeof v === 'number') {
							formulaString = `${v.toPrecision(8)} ${tableColumn.dUnit}`;
						}
					}

					setSelectedCell([row,column]);
					setSelectedRows();
					const pathParts = path.split('.');
					const tableName = pathParts[pathParts.length - 1];
					const columnName = results.value.v[column - 1].name;
					const formulaTitle = `${tableName}[${row}, "${columnName}"]`;
					props.actions.pushView('formulaEditor', formulaTitle, {
						t: t,
						formula: formulaString || '',
						formulaOffset: 0,
						modelPath: props.viewInfo.modelPath,
						applyChanges: (formula, callBack) => {
							const path = props.viewInfo.path;
							props.actions.doCommand(`__blob__${path} setcell ${row} ${column}__blob__${formula}`, callBack);
						},
					});
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
						viewBox: [0, 0, props.infoWidth - 2*nInfoViewPadding, props.infoHeight - 3*nInputHeight - 14],
						selectedRows: selectedRows,
						cellClick: cellClick,
						longPress: longPress,
					}
				)
			)}
			break;

		case DataTableDisplay.editColumn: {
			if (!selectedColumn) {
				return null;
			}
			displayComponent = e(
				'div', {
					key: 'edit',
					id: 'datatable__edit-column',
				},
				e(
					'div', {
						id: 'datatable__display-buttons'
					},
					tableButton,
				),
				e(
					EditColumnView, {
						t: props.t,
						viewInfo: props.viewInfo,
						path: path,
						name: selectedColumn.name,
						actions: props.actions,
						selectedColumn: selectedColumn,
						columnNumber: selectedCell[1],
						defaultValue: value.v[columnNumber - 1].defaultValue,
						setDisplay: setDisplay,
					},
					`edit column ${columnNumber} ${selectedColumn.name}`,
				)
			)
		}
			break;
	
		case DataTableDisplay.unitPicker:
			displayComponent = e(
				UnitPicker, {
					key: 'unit',
					t: props.t,
					actions: props.actions,
					unitType: unitType,
					cancel: () => {
						setDisplay(DataTableDisplay.editColumn);
					},
					apply: (unit) => {
						props.actions.doCommand(`${path}.${selectedColumn.name} set displayUnit ${unit}`, () => {
							props.actions.updateView(props.viewInfo.stackIndex);
							setDisplay(DataTableDisplay.editColumn);
						});						
					},
				}
			);
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
