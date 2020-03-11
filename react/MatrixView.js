'use strict';

import {ToolView} from './ToolView.js';
import {FormulaField} from './FormulaView.js';
import {TableView} from './TableView.js';

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

/**
 * MatrixView
 * info view for matrix
 */
export function MatrixView(props) {
	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);
	}, []);

	const t = props.t;
	const updateResults = props.viewInfo.updateResults;
	const results = updateResults.length ? updateResults[0].results : {};
	const rowCountFormula = results.rowCountFormula;
	const columnCountFormula = results.columnCountFormula;
  const rowCount = results.rowCount;
  const columnCount = results.columnCount;
	const cellInputs = results.cellInputs;
	const value = results.value;
	const valueUnit = value.unit ? value.unit : '';
	const unitType = value.unitType ? value.unitType : '';
	const nInputHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--input--height'));
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));


	const toolComponent = e(
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
				'label', {
					id: 'matrix__row-count-label',
					htmlFor: 'matrix-row-count-formula'
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
				'label', {
					id: 'matrix__column-count-label',
					htmlFor: 'matrix-column-count-formula'
				}, t('react:matrixColumnCountLabel')
			),
			e(
				FormulaField, {
					id: 'matrix-column-count-formula',
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
				id: 'matrix__unit-fields',
			},
			`${unitType}: ${valueUnit}`,
			e(
				'button', {
					id: 'matrix__unit-info-button'
				},
				'i'
			)
		)
	)

	return e(
		ToolView, {
			id: 'tool-view',
			toolComponent: toolComponent,
			...props,
		},
	);
}