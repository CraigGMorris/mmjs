'use strict';

import {ToolView} from './ToolView.js';
import {FormulaField, FormulaEditor} from './FormulaView.js';

const e = React.createElement;
const useEffect = React.useEffect;
const useState = React.useState;

/**
 * Enum for matrix display types.
 * @readonly
 * @enum {string}
 */
const SolverDisplay = Object.freeze({
	input: 0,
	formulaEditor: 1
});

/**
 * SolverView
 * info view for model
 */
export function SolverView(props) {
	const [display, setDisplay] = useState(SolverDisplay.input);
	const [formulaName, setFormulaName] = useState('')
	const [formulaOffset, setFormulaOffset] = useState(0);

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
				setDisplay(SolverDisplay.input);
			});
		}
	}

	let displayComponent;
	if (display === SolverDisplay.formulaEditor) {
		displayComponent = e(
			FormulaEditor, {
				id: 'solver-formula-editor',
				key: 'editor',
				t: t,
				viewInfo: props.viewInfo,
				formula: results.formulas[formulaName],
				formulaOffset: formulaOffset,
				cancelAction: () => {
					setDisplay(SolverDisplay.input);
				},
				applyChanges: applyChanges(formulaName),
			}
		);
	}
	else {
		const funcComponents = [];
		const fv = results.fv;
		const funcCount = fv.length;
		for (let i = 0; i < funcCount; i++) {
			const funcName = `formula_${i + 1}`;
			const countName = `count_${i+1}`;
			funcComponents.push(e(
				'div', {
					id: `solver__function-${i+1}`,
					className: 'solver__function',
					key: i,
				},
				e(
					'div', {
						className: 'solver__formula-label'
					},
					t('mmcmd:solverFormulaLabel', {n: i+1})
				),
				e(
					FormulaField, {
						id: `solver__${funcName}`,
						className: 'solver__func-formula',
						t: t,
						actions: props.actions,
						path: `${results.path}.${funcName}`,
						formula: results.formulas[funcName],
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						clickAction: (offset) => {
							setFormulaOffset(offset);
							setFormulaName(funcName);
							setDisplay(SolverDisplay.formulaEditor);
						}
					}
				),
				e(
					'div', {
						className: 'solver__count-label'
					},
					t('mmcmd:solverCountLabel')
				),
				e(
					FormulaField, {
						id: `solver__${countName}`,
						className: 'solver__func-count',
						t: t,
						actions: props.actions,
						path: `${results.path}.${countName}`,
						formula: results.formulas[countName],
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						clickAction: (offset) => {
							setFormulaOffset(offset);
							setFormulaName(countName);
							setDisplay(SolverDisplay.formulaEditor);
						}
					}
				),
				e(
					'div', {
						className: 'solver__x-label'
					},
					t('mmcmd:solverXLabel', {n: i+1})
				),
				e(
					'div', {
						className: 'solver__x'
					},
					`= ${fv[i].x}`
				),
				e(
					'div', {
						className: 'solver__fx-label'
					},
					t('mmcmd:solverFxLabel', {n: i+1})
				),
				e(
					'div', {
						className: 'solver__fx-and-rm'
					},
					e(
						'div', {
							className: 'solver__fx'
						},
						`= ${fv[i].fx}`
					),
					(funcCount === 1) ? ' ' : e(
						'div', {
							className: 'solver__delete-button',
							onClick: () => {
								props.actions.doCommand(`${results.path} removefunction ${i+1}`, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
								})
							}
						},
						'X'
					)
				)
			));
		}
		displayComponent = e(
			'div', {
				key: 'solver',
				id: 'solver',
			},
			e(
				'div', {
					id: 'solver__max-fields'
				},
				e(
					'span', {
						id: 'solver__max-iter-label',
					}, t('react:solverMaxIterLabel')
				),
				e(
					FormulaField, {
						id: 'solver__max-iter-formula',
						t: t,
						actions: props.actions,
						path: `${results.path}.maxIter`,
						formula: results.formulas.maxIter,
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						clickAction: (offset) => {
							setFormulaOffset(offset);
							setFormulaName('maxIter');
							setDisplay(SolverDisplay.formulaEditor);
						}
					}
				),
				e(
					'span', {
						id: 'solver__max-jacobian-label',
						// htmlFor: 'matrix-column-count-formula'
					}, t('react:solverMaxJacobiantLabel')
				),
				e(
					FormulaField, {
						id: 'solver__max-jacobian-formula',
						t: t,
						actions: props.actions,
						path: `${results.path}.maxJacobian`,
						formula: results.formulas.maxJacobian,
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						clickAction: (offset) => {
							setFormulaOffset(offset);
							setFormulaName('maxJacobian');
							setDisplay(SolverDisplay.formulaEditor);
						}
					}
				),
			),
			e(
				'div', {
					id: 'solver__button-fields'
				},
				e(
					'div', {
						id: 'solver__is-enabled',
						className: 'checkbox-and-label'
					},
					e(
						'label', {
							id: 'solver__is-enabled-label',
							className: 'checkbox__label',
							htmlFor: 'solver__is-enabled-checkbox'
						},
						t('react:solverIsEnabled'),
					),
					e(
						'input', {
							id: 'solver__is-enabled-checkbox',
							className: 'checkbox__input',
							type: 'checkbox',
							checked: results.isEnabled,
							onChange: () => {
								// toggle the isOutput property
								const value = props.viewInfo.updateResults[0].results.isEnabled ? 'f' : 't';
								props.actions.doCommand(`${props.viewInfo.path} set isEnabled ${value}`, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
								});						
							}
						},
					),
				),
				e(
					'button', {
						id: 'solver__reset-button',
						onClick: () => {
							props.actions.doCommand(`${props.viewInfo.path} reset`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							})
						}
					},
					t('react:solverResetButton')
				),
				e(
					'button', {
						id: 'solver__add-function-button',
						onClick: () => {
							props.actions.doCommand(`${props.viewInfo.path} addfunction`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							});							
						}
					},
					t('react:solverAddFunctionButton')
				),
			),
			e(
				'div', {
					id: 'solver__function-list'
				},
				funcComponents
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
