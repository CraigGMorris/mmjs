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

	const [currentCell, setCurrentCell] = useState([0,0]);
	const [showUnitPicker, setShowUnitPicker] = useState(false);

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);

		if ( props.viewInfo.matrixViewState) {
			const state = props.viewInfo.matrixViewState;
			setCurrentCell(state.currentCell);
			setShowUnitPicker(state.showUnitPicker);
		}
		else {
			props.viewInfo.matrixViewState = {
				currentCell: currentCell,
				showUnitPicker: showUnitPicker,
			}
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		props.viewInfo.matrixViewState.currentCell = currentCell;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const t = props.t;
	const updateResults = props.viewInfo.updateResults;
	if (updateResults.error) {
		props.actions.popView();
		return null;
	}

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

	const cellInput = cellInputs[currentCell.join('_')];
	const cellFormula = cellInput ? cellInput.input : '';

	const applyCellChanges = (formula, callBack) => {
		const path = props.viewInfo.path;
		props.actions.doCommand(`__blob__${path} setcell ${currentCell.join(' ')}__blob__${formula}`, callBack);
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
					props.actions.doCommand(`${props.viewInfo.path} set displayUnitName ${unit}`, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
						setShowUnitPicker(false);
					});						
				},
			}
		);
	}
	else {
		const cellClick = (row, column) => {
			row = Math.min(row, rowCount);
			column = Math.min(column, columnCount);
			setCurrentCell([row, column]);
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
						path: `${results.path}.cell_${currentCell.join('_')}`,
						formula: cellFormula,
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						applyChanges: applyCellChanges,
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

	return e(
		ToolView, {
			id: 'tool-view',
			displayComponent: displayComponent,
			...props,
		},
	);
}