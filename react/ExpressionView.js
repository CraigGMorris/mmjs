'use strict';

import {ToolNameField} from './MMApp.js';
import {FormulaField} from './FormulaView.js';

const e = React.createElement;

/**
 * @class ExpressionView
 * info view for expression
 */
export class ExpressionView extends React.Component {
	constructor(props) {
		super(props);
		this.setIsInputProperty = this.setIsInputProperty.bind(this);
		this.setIsOutputProperty = this.setIsOutputProperty.bind(this);
	}

	/**
	 * @method setIsInputProperty
	 * @param {Event} event
	 * toggle the isInput property
	 */
	setIsInputProperty(event) {
		const value = this.props.viewInfo.updateResults[0].results.isInput ? 'f' : 't';
		this.props.actions.doCommand(`${this.props.viewInfo.path} set isInput ${value}`, (cmds) => {
			this.props.actions.updateViewState(this.props.viewInfo.stackIndex);
		});
	}

	/**
	 * @method setIsOutputProperty
	 * toggle the isOutput property
	 */
	setIsOutputProperty(event) {
		const value = this.props.viewInfo.updateResults[0].results.isOutput ? 'f' : 't';
		this.props.actions.doCommand(`${this.props.viewInfo.path} set isOutput ${value}`, (cmds) => {
			this.props.actions.updateViewState(this.props.viewInfo.stackIndex);
		});
	}

	render() {
		const t = this.props.t;
		const updateResults = this.props.viewInfo.updateResults;
		const results = updateResults.length ? updateResults[0].results : {};
		const value = results.value;
		const valueUnit = value.unit;
		const unitType = value.unitType ? value.unitType : '';
		const inputHeight = this.props.actions.defaults().grid.inputHeight;
		return e(
			'div', {
				// main vertical sections
				style: {
					paddingLeft: '3px',
					paddingRight: '3px',
					height: '100%',
					display: 'grid',
					gridTemplateColumns: '1fr',
					gridTemplateRows: `${inputHeight} ${inputHeight} ${inputHeight} ${inputHeight} 1fr`,
 				}
			},
			e(
				// name field line
				'div', {
					style: {
						gridArea: '1 / 1 / 1 / 1',
					},
				},
				e(
					ToolNameField, {
						t: t,
						viewInfo: this.props.viewInfo,
						actions: this.props.actions
					}
				),
			),
			e(
				// formula field line
				'div', {
					style: {
						display: 'grid',
						gridArea: '2 / 1 / 2 / 1',
						gridTemplateColumns: '20px 1fr',
						gridTemplateRows: `1fr`,
					}
				},
				e(
					// equal sign preceding formula
					'div', {
						style: {
							gridArea: '1 / 1 / 1 / 1',
							marginLeft: '5px'
						}
					},
					' = '
				),
 				e(
					// the formula input field
					'div', {
						style: {
							gridArea: '1 / 2 / 1 / 2'//'finput'
						},
					},
 					e(
						FormulaField, {
							t: t,
							actions: this.props.actions,
							path: results.formulaPath || '',
							formulaName: 'f_formula',
							formula: results.formula || '',
							viewInfo: this.props.viewInfo,
						}
					)
				)
			),
 			e(
				// line containing isInput and isOutput check boxes
				'div', {
					style: {
						display: 'grid',
						gridArea: '3 / 1 / 3 / 1',
						gridTemplateColumns: '1fr 1fr',
						gridTemplateRows: `1fr`,
					}
				},
				e(
					// isInput check box
					'div', {
						style: {
							gridArea: '1 / 1 / 1 / 1',
						},
					},
					e(
						'label', {
							htmlFor: 'isinput'
						},
						t('react:exprIsInput')
					),
					e(
						'input', {
							type: 'checkbox',
							name: 'isinput',
							checked: results.isInput,
							style: {
								marginLeft: '10px'
							},
							onChange: this.setIsInputProperty
						},
					),
				),
				e(
					// isOutput check box
					'div', {
						style: {
							gridArea: '1 / 2 / 1 / 2',
							marginLeft: '10px'
						},
					},
					e(
						'label', {
							htmlFor: 'isoutput'
						},
						t('react:exprIsOutput')
					),
					e(
						'input', {
							type: 'checkbox',
							name: 'isoutput',
							checked: results.isOutput,
							style: {
								marginLeft: '10px'
							},
							onChange: this.setIsOutputProperty
						},
					),
				),
			),
			e(
				// results unit line
				'div', {
					style: {
						display: 'grid',
						gridArea: '4 / 1 / 4 / 1',
						gridTemplateColumns: '1fr 30px',
						gridTemplateRows: `${inputHeight}`,
					}
				},
				e(
					// unit type and unit
					'div', {
						style: {
							gridArea: '1 / 1 / 1 / 1'
						}
					},
					`${unitType}: ${valueUnit}`
				),
				e(
					// info button
					'button', {
						style: {
							gridArea: '1 / 2 / 1 / 2',
							borderRadius: '10px',
							height: '20px',
							width: '20px',
							fontSize: '10pt',
							border: '1',
							textAlign: 'center'
						}
					},
					'i'
				)
			),
			e(
				'div', {
					style: {
						gridArea: '5 / 1 / 5 / 1'
					}
				}, 'Will be results'
			)
		);
	}
}
