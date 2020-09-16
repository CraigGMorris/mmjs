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
const OdeDisplay = Object.freeze({
	input: 0,
	formulaEditor: 1
});

/**
 * OdeView
 * info view for ode
 */
export function OdeView(props) {
	const [display, setDisplay] = useState(OdeDisplay.input);
	const [formulaIndex, setFormulaIndex] = useState('')
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
				setDisplay(OdeDisplay.input);
			});
		}
	}

	let displayComponent;
	if (display === OdeDisplay.formulaEditor) {
		const formulaName = results.formulas[formulaIndex][0];
		displayComponent = e(
			FormulaEditor, {
				id: 'ode-formula-editor',
				key: 'editor',
				t: t,
				viewInfo: props.viewInfo,
				formula: results.formulas[formulaIndex][1],
				formulaOffset: formulaOffset,
				cancelAction: () => {
					setDisplay(OdeDisplay.input);
				},
				applyChanges: applyChanges(formulaName),
			}
		);
	}
	else {
		const inputComponents = [];
		const formulas = results.formulas;
		const formulaCount = formulas ? formulas.length : 0;
		let recordedCount = 1;
		for (let i = 0; i < formulaCount; i++) {
			const formulaInfo = formulas[i];
			const name = formulaInfo[0];
			const formula = formulaInfo[1];
			const displayString = formulaInfo[2]
			let description;
			if (name.match(/^r\d+$/)) {
				const localCount = recordedCount++; // need value in this scope for click handler
				description = e(
					'div', {
						className: 'ode__record-desc-line',
					},
					e(
						'div', {
							className: 'ode__recorded-desc'
						},
						t('mmcmd:odeInput-recorded', {n: localCount})
					),
					e(
						'button', {
							className: 'ode__recorded-delete',
							onClick: () => {
								props.actions.doCommand(`${props.viewInfo.path} removerecorded ${localCount}`, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
								})								
							}
						}, t('mmcmd:odeRemoveRecorded')
					)
				);
			}
			else {
				description = t(`mmcmd:odeInput-${name}`);
			}
			inputComponents.push(e(
				'div', {
					className: 'ode__input',
					key: name,
				},
				e(
					'div', {
						className: 'ode__formula-label'
					},
					description
				),
				e(
					FormulaField, {
						className: 'ode__input-formula',
						t: t,
						actions: props.actions,
						path: `${results.path}.name`,
						formula: formula,
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						clickAction: (offset) => {
							setFormulaOffset(offset);
							setFormulaIndex(i);
							setDisplay(OdeDisplay.formulaEditor);
						}
					}
				),
				e(
					'div', {
						className: 'ode__input-display'
					},
					displayString
				)
			));
		}
		displayComponent = e(
			'div', {
				key: 'ode',
				id: 'ode',
			},
			e(
				// stiff and auto runcheck boxes
				'div', {
					id: 'ode__check-boxes',
				},
				e(
					// stiff check box
					'div', {
						id: 'ode__is-stiff',
						className: 'checkbox-and-label',
					},
					e(
						'label', {
							id: 'ode__is-stiff-label',
							className: 'checkbox__label',
							htmlFor: 'ode__is-stiff-checkbox'
						},
						t('react:odeIsStiff')
					),
					e(
						'input', {
							id: 'ode__is-stiff-checkbox',
							className: 'checkbox__input',
							type: 'checkbox',
							checked: results.isStiff,
							onChange: () => {
								// toggle the isStiff property
								const value = results.isStiff ? 'f' : 't';
								props.actions.doCommand(`${props.viewInfo.path} set isStiff ${value}`, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
								});						
							}
						},
					),
				),
				e(
					// autorun check box
					'div', {
						id: 'ode__autorun',
						className: 'checkbox-and-label',
					},
					e(
						'label', {
							id: 'ode__autorun-label',
							className: 'checkbox__label',
							htmlFor: 'ode__autorun-checkbox'
						},
						t('react:odeAutoRun'),
					),
					e(
						'input', {
							id: 'ode__autorun-checkbox',
							className: 'checkbox__input',
							type: 'checkbox',
							checked: results.shouldAutoRun,
							onChange: () => {
								// toggle the isOutput property
								const value = results.shouldAutoRun ? 'f' : 't';
								props.actions.doCommand(`${props.viewInfo.path} set shouldAutoRun ${value}`, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
								});						
							}
						},
					),	
				),
			),
			e(
				'div', {
					id: 'ode__current-t',
				},
				`T = ${results.t} ${results.tunit}`
			),
			e(
				'div', {
					id: 'ode__button-fields'
				},
				e(
					'button', {
						id: 'ode__addrecord-button',
						onClick: () => {
							props.actions.doCommand(`${props.viewInfo.path} addrecorded`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							})
						}
					},
					t('react:odeAddRecordButton')
				),
				e(
					'button', {
						id: 'ode__reset-button',
						onClick: () => {
							props.actions.doCommand(`${props.viewInfo.path} reset`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							})
						}
					},
					t('react:odeResetButton')
				),
				e(
					'button', {
						id: 'ode__run-button',
						onClick: () => {
							props.actions.doCommand(`${props.viewInfo.path} run`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							});							
						}
					},
					t('react:odeRunButton')
				),
			),
			e(
				'div', {
					id: 'ode__input-list'
				},
				inputComponents
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