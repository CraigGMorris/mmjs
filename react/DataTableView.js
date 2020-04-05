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
	columns: 1,
	editColumn: 2,
	unitPicker: 3,
});

/**
 * DataTableView
 * info view for data table
 */

export function DataTableView(props) {
	const [display, setDisplay] = useState(DataTableDisplay.table);
	const [selectedCell, setSelectedCell] = useState([0,0]);
	const [cellFormula, setCellFormula] = useState('');

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);

		const state = props.viewInfo.dataTableViewState;
		if (state) {
			setDisplay(state.display);
			setSelectedCell(state.selectedCell);
			setCellFormula(state.cellFormula);
		}
		else {
			props.viewInfo.dataTableViewState = {
				display: display,
				selectedCell: selectedCell,
				cellFormula: cellFormula,
			};
		}
	
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		props.viewInfo.dataTableViewState.display = display;
	}, [display, props.viewInfo])

	useEffect(() => {
		props.viewInfo.dataTableViewState.selectedColumn = selectedCell;
		props.viewInfo.dataTableViewState.cellFormula = cellFormula;
	}, [selectedCell, cellFormula, props.viewInfo])

	const t = props.t;
	const updateResults = props.viewInfo.updateResults;
	const results = updateResults.length ? updateResults[0].results : {};
	const path = results.path;
	const value = results.value;
	const formulaName = 'formula'; //`${selectedCell[0]}_${selectedCell[1]}_f`;
	const selectedColumn = selectedCell[1] > 0 ? value.v[selectedCell[1] - 1] : null;
	const unitType = selectedColumn ? selectedColumn.unitType : null;
	const nInputHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--input--height'));
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));

	const addColumnButton = e(
		'button', {
			id: 'data__add-column-button',
			onClick: () => {
				setDisplay(DataTableDisplay.editColumn);
			},
		},
		t('react:dataAddColumnButton'),
	);

	const addRowButton = e(
		'button', {
			id: 'data__add-row-button',
			onClick: () => {
				if (value && value.nc > 0) {
					props.actions.doCommand(`${path} addrow`, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
						setSelectedCell([value.nr + 1, 1]);
						setCellFormula(results.defaultValues[0]);
					});
				}
			}
		},
		t('react:dataAddRowButton'),
	)

	const tableButton = e(
		'button', {
			id: 'data__table-button',
			onClick: () => {
				setDisplay(DataTableDisplay.table);
			},
		},
		t('react:dataTableButton'),
	);

	const columnsButton = e(
		'button', {
			id: 'data__columns-button',
			onClick: () => {
				setDisplay(DataTableDisplay.columns);
			},
		},
		t('react:dataColumnsButton'),
	);

	const applyCellChanges = (formula, callBack) => {
		setCellFormula(formula);
		const path = props.viewInfo.path;
		props.actions.doCommand(`__blob__${path} setcell ${selectedCell.join(' ')}__blob__${formula}`, callBack);
	}


	let displayComponent;
	switch (display) {
		case DataTableDisplay.table: {
			const cellClick = (row, column) => {
				// if (row === 0 && column === 0) {
				// 	if (value && value.nc > 0) {
				// 		props.actions.doCommand(`${path} addrow`, () => {
				// 			props.actions.updateView(props.viewInfo.stackIndex);
				// 			setSelectedCell([value.nr + 1, 1]);
				// 			setCellFormula(results.defaultValues[0]);
				// 		});
				// 		return;
				// 	}
				// }
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
				setCellFormula(formulaString);
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
					columnsButton,
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
							formula: cellFormula || '',
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							unitType: unitType,
							applyChanges: applyCellChanges,
						}
					)
				),				
				e(
					TableView, {
						id: 'datatable__value',
						value: results.value,
						actions: props.actions,
						viewInfo: props.viewInfo,
						viewBox: [0, 0, props.infoWidth - 2*nInfoViewPadding, props.infoHeight - 4*nInputHeight - 14],
						currentCell: selectedCell,
						cellClick: cellClick,
					}
				)
			)}
			break;

		case DataTableDisplay.columns:
			displayComponent = e(
				'div', {
					id: 'datatable__columns',
					key: 'columns'
				},
				e(
					'div', {
						id: 'datatable__display-buttons'
					},
					tableButton,
					addColumnButton,
				),
				'display columns'
			);
			break;

		case DataTableDisplay.editColumn:
			displayComponent = e(
				'div', {

					key: 'edit'
				},
				e(
					'div', {
						id: 'datatable__display-buttons'
					},
					tableButton,
					columnsButton,
				),	
				`edit column ${selectedCell[1]}`,
			);
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
						props.actions.doCommand(`${props.viewInfo.path} set displayUnitName ${unit}`, () => {
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
