'use strict';

import {ToolView} from './ToolView.js';
import {FormulaField} from './FormulaView.js';
import {TableView} from './TableView.js';
import {UnitPicker} from './UnitsView.js';

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

/**
 * ExpressionView
 * info view for expression
 */
export function ExpressionView(props) {
	const [showUnitPicker, setShowUnitPicker] = useState(false);

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);

		if (props.viewInfo.expressionViewState) {
			setShowUnitPicker(props.viewInfo.expressionViewState.showUnitPicker);
		}
		else {
			props.viewInfo.expressionViewState = { showUnitPicker: showUnitPicker };
		}
	}, []);

	useEffect(() => {
		props.viewInfo.expressionViewState.showUnitPicker = showUnitPicker;
	}, [showUnitPicker])

	const t = props.t;
	const updateResults = props.viewInfo.updateResults;
	const results = updateResults.length ? updateResults[0].results : {};
	const path = results.path;
	const value = results.value;
	const valueUnit = value.unit;
	const unitType = value.unitType ? value.unitType : '';
	const formulaName = results.formulaName;
	const nInputHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--input--height'));
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));
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
				id: 'expression',
				key: 'expression'
			},
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
						unitType: unitType,
					}
				)
			),
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
								checked: results.isInput,
								onChange: (event) => {
									// toggle the isInput property
									const value = props.viewInfo.updateResults[0].results.isInput ? 'f' : 't';
									props.actions.doCommand(`${props.viewInfo.path} set isInput ${value}`, (cmds) => {
										props.actions.updateView(props.viewInfo.stackIndex);
									});						
								}
							},
						),
					),
					e(
						// isOutput check box
						'div', {
							id: 'expression__is-output',
							className: 'checkbox-and-label',
						},
						e(
							'label', {
								id: 'expression__is-output-label',
								className: 'checkbox__label',
								htmlFor: 'expression__is-output-checkbox'
							},
							t('react:exprIsOutput'),
						),
						e(
							'input', {
								id: 'expression__is-output-checkbox',
								className: 'checkbox__input',
								type: 'checkbox',
								checked: results.isOutput,
								onChange: (event) => {
									// toggle the isOutput property
									const value = props.viewInfo.updateResults[0].results.isOutput ? 'f' : 't';
									props.actions.doCommand(`${props.viewInfo.path} set isOutput ${value}`, (cmds) => {
										props.actions.updateView(props.viewInfo.stackIndex);
									});						
								}
							},
						),	
					),
				),
			),
			e(
				// results unit line
				'div', {
					id: 'expression__units',
					onClick: () => {
						setShowUnitPicker(true);
					}
				},
				`${unitType}: ${valueUnit}`
			),
			e(
				TableView, {
					id: 'expression__value',
					value: results.value,
					actions: props.actions,
					viewInfo: props.viewInfo,
					viewBox: [0, 0, props.infoWidth - 2*nInfoViewPadding, props.infoHeight - 4*nInputHeight - 14],
				}
			)
		);
	}

	return e(
		ToolView, {
			id: 'tool-view',
			displayComponent: displayComponent,
			...props,
		},
	);
}