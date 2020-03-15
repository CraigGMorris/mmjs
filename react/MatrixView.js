'use strict';

import {ToolView} from './ToolView.js';
import {FormulaField} from './FormulaView.js';
import {TableView} from './TableView.js';
import {UnitPicker} from './UnitsView.js';

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

/**
 * MatrixView
 * info view for matrix
 */
export function MatrixView(props) {

	const [currentRow, setCurrentRow] = useState(0);
	const [currentColumn, setCurrentColumn] = useState(0);
	const [showUnitPicker, setShowUnitPicker] = useState(false);

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);

		if ( props.viewInfo.matrixViewState) {
			const state = props.viewInfo.matrixViewState;
			setCurrentRow(state.currentRow);
			setCurrentColumn(state.currentColumn);
			setShowUnitPicker(state.showUnitPicker);
		}
		else {
			props.viewInfo.matrixViewState = {
				currentRow: currentRow,
				currentColumn: currentColumn,
				showUnitPicker: showUnitPicker,
			}
		}
	}, []);

	useEffect(() => {
		props.viewInfo.matrixViewState.currentRow = currentRow;
	}, [currentRow]);

	useEffect(() => {
		props.viewInfo.matrixViewState.currentColumn = currentColumn;
	}, [currentColumn]);

	const t = props.t;
	const updateResults = props.viewInfo.updateResults;
	const results = updateResults.length ? updateResults[0].results : {};
	const rowCountFormula = results.rowCountFormula;
	const columnCountFormula = results.columnCountFormula;
  const rowCount = results.rowCount;
  const columnCount = results.columnCount;
	const cellInputs = results.cellInputs;
	const value = results.value;
	const valueUnit = (value && value.unit) ? value.unit : '';
	const unitType = (value && value.unitType) ? value.unitType : '';
	const nInputHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--input--height'));
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));

	const cellInput = cellInputs[`${currentRow}_${currentColumn}`];
	const cellFormula = cellInput ? cellInput.input : '';

	const applyCellChanges = (formula, callBack) => {
		console.log(`${formula}\n${currentRow} ${currentColumn}`);
		const path = props.viewInfo.path;
		props.actions.doCommand(`__blob__${path} setcell ${currentRow} ${currentColumn}__blob__${formula}`, callBack);
	}

	let displayComponent;
	if (showUnitPicker) {
		displayComponent = e(
			UnitPicker, {
				key: 'unit',
				t: props.t,
				actions: props.actions,
				unitType: unitType,
				cancel: () => {
					setShowUnitPicker(false);
				},
				apply: (unit) => {
					props.actions.doCommand(`${props.viewInfo.path} set displayUnitName ${unit}`, (cmds) => {
						props.actions.updateView(props.viewInfo.stackIndex);
						setShowUnitPicker(false);
					});						
				},
			}
		);
	}
	else {
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
						onClick: () => {
							setCurrentRow(currentRow + 1);
						}
					},
					`[${currentRow}, ${currentColumn}]`,
				),
				e (
					'div', {
						id: 'matrix__output-unit',
						onClick: () => {
							setShowUnitPicker(true);
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
						path: `${results.path}.f_${currentRow}_${currentColumn}`,
						formula: cellFormula,
						viewInfo: props.viewInfo,
						applyChanges: applyCellChanges,
					}

				)
			)
		)
	}

	return e(
		ToolView, {
			id: 'tool-view',
			displayComponent: displayComponent,
			...props,
		},
	);
}