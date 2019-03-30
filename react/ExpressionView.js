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
	}

	render() {
		const t = this.props.t;
		const updateResults = this.props.viewInfo.updateResults;
		const results = updateResults.length ? updateResults[0].results : {};
		const inputHeight = this.props.actions.defaults().grid.inputHeight;
		return e(
			'div', {
				style: {
					paddingLeft: '3px',
					paddingRight: '3px',
					height: '100%',
					display: 'grid',
					gridTemplateColumns: '20px 1fr',
					gridTemplateRows: `${inputHeight} ${inputHeight} 1fr`,
					gridTemplateAreas: `"name name"
						"equal formula"
						"result result"`
				}
			},
			e(
				'div', {
					style: {
						gridArea: 'name',
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
				'div', {
					style: {
						gridArea: 'equal',
						marginLeft: '5px'
					}
				},
				' = '
			),
			e(
				'div', {
					style: {
						gridArea: 'formula'
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
			),
			e(
				'div', {
					style: {
						gridArea: 'result'
					}
				}, 'Will be results'
			)
		);
	}
}
