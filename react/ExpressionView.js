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
		const nInputHeight = this.props.actions.defaults().grid.inputHeight;
		const inputHeight = `${nInputHeight}px`;
		return e(
			'div', {
				// main vertical sections
				style: {
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
						gridTemplateRows: inputHeight,
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
				},
				e(
					ValueView, {
						value: results.value,
						viewBox: [0, 0, this.props.infoWidth, this.props.infoHeight - 4*nInputHeight]
					}
				)
			)
		);
	}
}

/**
 * @class ValueView
 * view for MMValue as a table
 */
export class ValueView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			rowOffset: 0,
			columnOffset: 0
		};
	}

	render() {
		const value = this.props.value;
		const nRows = value.nr;
		const nColumns = value.nc;
		const cellHeight = 25;
		const cellWidth = 100;
		const xTextPad = 5;
		const rowLabelWidth = 40;
		const color1 = 'white';
		const color2 = 'rgba(255,255,230,1)';
		const color3 = 'rgba(240,240,255,1)';
		const viewBox = this.props.viewBox;
		const nRowCells = Math.min(viewBox[3] / cellHeight, nRows);
		const nColumnCells = Math.min(viewBox[2] / cellWidth, nColumns);
		let cells = [];
		for (let row = 0; row < nRowCells; row++) {
			const y = (row + 2) * cellHeight;
			const rowLabelBox = e('rect', {
				x: 0,
				y: y - cellHeight * 0.75,
				width: rowLabelWidth,
				height: cellHeight,
				style: {
					stroke: 'black',
					fill: row % 2 ? color1 : color3
				}
			});
			cells.push(rowLabelBox);
			const rowLabel = e('text', {
				x: xTextPad,
				y: y,
				key: `row${row}`
			}, `${(row + 1)}`);
			cells.push(rowLabel);
			for (let column = 0; column < nColumnCells; column++) {
				const x = column * cellWidth  + rowLabelWidth;
				if (row === 0) {
					const columnLabelBox = e('rect', {
						x: x,
						y: cellHeight* 0.25,
						width: cellWidth,
						height: cellHeight,
						style: {
							stroke: 'black',
							fill: column % 2 ? color1 : color2
						}		
					});
					cells.push(columnLabelBox);
					const columnLabel = e('text', {
						x: x + xTextPad,
						y: cellHeight,
						key: `col${column}`
					}, `${(column+1)}`);
					cells.push(columnLabel);
				}
				const color = row % 2 ? (
					column % 2 ? color1 : color2
				) : (
					column % 2 ? color3 : color1
				);
				const cellBox = e('rect', {
					x: x,
					y: y - cellHeight * 0.75,
					width: cellWidth,
					height: cellHeight,
					style: {
						stroke: 'black',
						fill: color
					}
				});
				cells.push(cellBox);
				const cmp = e('text', {
					x: x + xTextPad,
					y: y,
					key: `${row}-${column}`
				}, `${value.v[row * nColumns + column].toFixed(5)}`);
				cells.push(cmp)
			}
		}
		return e(
			'div', {
				style: {
					height: `${viewBox[3]}px`,
					width: `${viewBox[2]}px`
				}
			},
			e(
				'svg', {
					style: {
						backgroundColor: 'rgba(238,255,238,1)',
						height: '100%',
						width: '100%'
					},
					viewBox: viewBox,
/* 					onMouseDown: this.onMouseDown,
					onWheel: this.onWheel,
					onClick: this.onClick,
 */			},

				 cells
			),
		);

	}
}
