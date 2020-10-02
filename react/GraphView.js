'use strict';

import {ToolView} from './ToolView.js';
import {FormulaField, FormulaEditor} from './FormulaView.js';
import {UnitPicker} from './UnitsView.js';

const e = React.createElement;
const useEffect = React.useEffect;
const useState = React.useState;

/**
 * Enum fordisplay types.
 * @readonly
 * @enum {string}
 */
const DisplayType = Object.freeze({
	input: 0,
	formulaEditor: 1,
	graph: 2,
	unitPicker: 3
});

/**
 * IteratorView
 * info view for iterator
 */
export function GraphView(props) {
	const [display, setDisplay] = useState(DisplayType.input);
	const [editFormula, setEditFormula] = useState('');
	const [formulaName, setFormulaName] = useState('');
	const [formulaOffset, setFormulaOffset] = useState(0);
	const [unitLineName, setUnitLineName] = useState('x1');
	const [unitType, setUnitType] = useState('');
 
	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
	const applyChanges = (name) => {
		const path = `${results.path}.${name}`;
		return (formula) => {
			props.actions.doCommand(`__blob__${path} set formula__blob__${formula}`, () => {
				props.actions.updateView(props.viewInfo.stackIndex);
				setDisplay(DisplayType.input);
			});
		}
	}

	let displayComponent;
	if (display === DisplayType.formulaEditor) {
		displayComponent = e(
			FormulaEditor, {
				id: 'graph-formula-editor',
				key: 'editor',
				t: t,
				viewInfo: props.viewInfo,
				formula: editFormula,
				formulaOffset: formulaOffset,
				cancelAction: () => {
					setDisplay(DisplayType.input);
				},
				applyChanges: applyChanges(formulaName),
			}
		);
	}
	else if (display === DisplayType.unitPicker) {
		displayComponent = e(
			UnitPicker, {
				key: 'unit',
				t: props.t,
				actions: props.actions,
				unitType: unitType,
				cancel: () => {
					setDisplay(DisplayType.input);
				},
				apply: (unit) => {
					const cmd = `${props.viewInfo.path} setUnit ${unitLineName} ${unit}`;

					props.actions.doCommand(cmd, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
						setDisplay(DisplayType.input);
					});
				},
			}
		);
	}
	else if (display === DisplayType.input) {
		const makeRow = (value) => {
			const name = value.name;
			const typeClick = (type) => {
				props.actions.doCommand(`${props.viewInfo.path} setLineType ${name} ${type}`, () => {
					props.actions.updateView(props.viewInfo.stackIndex);
				})
			}
			const rowButtons = typeof value.lineType !== 'number' ?
				e(
					'div', {
						className: 'graph__input-row-buttons',
					},
					e(
						'div', {
							className: 'graph__row-delete-button',
							onClick: () => {
								props.actions.doCommand(`${props.viewInfo.path} removeaxis ${name}`, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
								})				
							}
						},
						t('react:graphRowDelete')
					)
				)
			:
				e(
					'div', {
						className: 'graph__input-row-buttons',
					},
					e(
						'div', {
							className: 'graph__type-button' + (value.lineType === 0 ? '' : ' graph__type-selected'),
							onClick: () => {typeClick('line');},
						},
						t('react:graphTypeLine')
					),
					e(
						'div', {
							className: 'graph__type-button' + (value.lineType === 1 ? '' : ' graph__type-selected'),
							onClick: () => {typeClick('scatter');},
						},
						t('react:graphTypeScatter')
					),
					e(
						'div', {
							className: 'graph__type-button' + (value.lineType === 2 ? '' : ' graph__type-selected'),
							onClick: () => {typeClick('bar');},
						},
						t('react:graphTypeBar')
					),
					e(
						'div', {
							className: 'graph__type-button' + (value.lineType === 3 ? '' : ' graph__type-selected'),
							onClick: () => {typeClick('bar+dot');},
						},
						t('react:graphTypeBarDot')
					),
					e(
						'div', {
							className: 'graph__row-delete-button',
							onClick: () => {
								props.actions.doCommand(`${props.viewInfo.path} removeaxis ${name}`, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
								})
							}				
						},
						t('react:graphRowDelete')
					),
				);

			return e(
				'div', {
					className: 'graph__input-row',
					key: name
				},
				e(
					'div', {
						className: 'graph__row-inputs'
					},
					e(
						'div', {
							className: 'graph__input-label',
						},
						`${name}:`
					),
					e(
						FormulaField, {
							id: `graph__${name}`,
							className: 'graph__input-formula',
							t: t,
							actions: props.actions,
							path: `${results.path}.${name}`,
							formula: value.v,
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							clickAction: (offset) => {
								setEditFormula(value.v);
								setFormulaOffset(offset);
								setFormulaName(name);
								setDisplay(DisplayType.formulaEditor);
							}
						},
					),
					e(
						'div', {
							className: 'graph__display-unit',
							onClick: () => {
								setUnitType(value.unitType);
								setUnitLineName(name);
								setDisplay(DisplayType.unitPicker);
							}
						},
						value.unit || ''
					),
					e(
						'div', {
							className: 'graph__input-min-label',
						},
						t('react:graphMinLabel')
					),
					e(
						FormulaField, {
							id: `graph__min${name}`,
							className: 'graph__input-min-formula',
							t: t,
							actions: props.actions,
							path: `${results.path}.min${name}`,
							formula: value.vmin,
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							clickAction: (offset) => {
								setEditFormula(value.vmin);
								setFormulaOffset(offset);
								setFormulaName(`min${name}`);
								setDisplay(DisplayType.formulaEditor);
							}
						}
					),
					e(
						'div', {
							className: 'graph__input-minvalue'
						},
						value.min_value
					),
					e(
						'div', {
							className: 'graph__input-vmaxlabel',
						},
						t('react:graphMaxLabel')
					),
					e(
						FormulaField, {
							id: `graph__max${name}`,
							className: 'graph__input-vmaxformula',
							t: t,
							actions: props.actions,
							path: `${results.path}.max${name}`,
							formula: value.vmax,
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							clickAction: (offset) => {
								setEditFormula(value.vmax);
								setFormulaOffset(offset);
								setFormulaName(`max${name}`);
								setDisplay(DisplayType.formulaEditor);
							}
						}
					),
					e(
						'div', {
							className: 'graph__input-maxvalue'
						},
						value.max_value
					),
				),
				rowButtons
			)
		}
		const rows = [];
		for (let xValue of results.xValues) {
			rows.push(makeRow(xValue));
			for (let yValue of xValue.yValues) {
				rows.push(makeRow(yValue));
			}
			if (xValue.zValue) {
				rows.push(makeRow(xValue.zValue));
			}
		}
		displayComponent = e(
			'div', {
				key: 'input'
			},
			e(
				'div', {
					id: 'graph__button-fields'
				},
				e(
					'button', {
						id: 'graph__addx-button',
						onClick: () => {
							props.actions.doCommand(`${props.viewInfo.path} addaxis x`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							})
						}
					},
					t('react:graphAddButton', {type: 'X'})
				),
				e(
					'button', {
						id: 'graph__addy-button',
						disabled: !results.enableY,
						onClick: () => {
							props.actions.doCommand(`${props.viewInfo.path} addaxis y`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							})
						}
					},
					t('react:graphAddButton', {type: 'Y'})
				),
				e(
					'button', {
						id: 'graph__addz-button',
						disabled: !results.enableZ,
						onClick: () => {
							props.actions.doCommand(`${props.viewInfo.path} addaxis z`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							})
						}
					},
					t('react:graphAddButton', {type: 'Z'})
				),
				e(
					'button', {
						id: 'graph__plot-button',
						onClick: () => {
							setDisplay(DisplayType.graph);						
						}
					},
					t('react:graphPlotButton')
				),
			),
			e(
				'div', {
					id: 'graph__input-rows'
				},
				rows
			)
		);
	}
	else {
		displayComponent = e('div', {key: 'graph'}, 'graph');
	}

	return e(
		ToolView, {
			id: 'tool-view',
			displayComponent: displayComponent,
			...props,
		},
	);
}