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
						actions: this.props.actions,
						viewInfo: this.props.viewInfo,
						viewBox: [0, 0, this.props.infoWidth, this.props.infoHeight - 4*nInputHeight]
					}
				)
			)
		);
	}
}

/**
 * Enum for ValueView drag type.
 * @readonly
 * @enum {string}
 */
const ValueViewDragType = Object.freeze({
	none: 'none',
	origin: 'origin',
	row: 'row',
	column: 'column',
	cell: 'cell',
	pan: 'pan',
	fastX: 'fastX',
	fastY: 'fastY'
});

/**
 * @class ValueView
 * view for MMValue as a table
 */
export class ValueView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			dragType: ValueViewDragType.none,
			dragOrigin: {x: 0, y: 0},
			initialOffset: {x: 0, y: 0},
			selectedCell: {row: 0, column: 0}
		};
		this.cellHeight = 25;
		this.cellWidth = 100;
		this.rowLabelWidth = 50;
		this.props.actions.setViewInfoState({valueViewOffset: {x: 0, y: 0}});
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseLeave = this.onMouseLeave.bind(this);
	}

	onMouseDown(e) {
		const x = e.nativeEvent.offsetX;
		const y = e.nativeEvent.offsetY;
		let dragType = ValueViewDragType.cell;
		if (y < this.cellHeight) {
			if (x < this.rowLabelWidth) {
				dragType = ValueViewDragType.origin;
			} else {
					dragType = ValueViewDragType.column;
			}
		}
		else if (x < this.rowLabelWidth) {
			dragType = ValueViewDragType.row;
		}
		this.setState({
			dragType: dragType,
			dragOrigin: {x: x, y: y},
			initialOffset: {
				x: this.props.viewInfo.viewState.valueViewOffset.x,
				y: this.props.viewInfo.viewState.valueViewOffset.y
			}
		});
 		e.stopPropagation()
    e.preventDefault()
	}

	onMouseUp(e) {
		// const column = Math.floor((x - this.rowLabelWidth)/this.cellWidth + 1);  // column number starting at 1

		switch (this.state.dragType) {
			case ValueViewDragType.origin:
				this.setState( {
					dragType: ValueViewDragType.none,
					dragOrigin: {x: 0, y: 0},
					initialOffset: {
						x: 0,
						y: 0
					}
				});
				this.props.actions.setViewInfoState({valueViewOffset: {x: 0, y: 0}});
				break;
			default:
				this.setState({
					dragType: ValueViewDragType.none
				})
				break;
		}
		e.stopPropagation()
    e.preventDefault()
	}

	onMouseMove(e) {
		const cellPan = (deltaX, deltaY) => {
			let offsetX = Math.max(0, deltaX + this.state.initialOffset.x);
			let offsetY = Math.max(0, deltaY + this.state.initialOffset.y);

			// make sure at least one row and column appear
			const value = this.props.value;
			const nRows = value.nr;
			const nColumns = value.nc;	
			offsetX = Math.min(offsetX, (nColumns - 1)*this.cellWidth)
			offsetY = Math.min(offsetY, (nRows - 1)*this.cellHeight);
			this.props.actions.setViewInfoState({valueViewOffset: {x: offsetX, y: offsetY}});
		}

		const fastPanX = (deltaX) => {
			const viewBox = this.props.viewBox;
			const maxX = viewBox[3];
			const value = this.props.value;
			const nColumns = value.nc;
			deltaX = (deltaX/(maxX - this.rowLabelWidth)) * nColumns * this.cellWidth * 2;
			cellPan(deltaX, 0);
		}

		const fastPanY = (deltaY) => {
			const viewBox = this.props.viewBox;
			const maxY = viewBox[2];
			const value = this.props.value;
			const nRows = value.nr;
			deltaY = (deltaY/(maxY - this.cellHeight)) * nRows * this.cellHeight * 2;
			cellPan(0, deltaY);
		}

		if (this.state.dragType != ValueViewDragType.none) {
			const deltaX = this.state.dragOrigin.x - e.nativeEvent.offsetX;
			const deltaY = this.state.dragOrigin.y - e.nativeEvent.offsetY;
			switch (this.state.dragType) {
				case ValueViewDragType.pan:
					cellPan(deltaX, deltaY);
					break;

				case ValueViewDragType.fastX:
					fastPanX(deltaX);
					break;

				case ValueViewDragType.fastY:
					fastPanY(deltaY);
					break;

				case ValueViewDragType.column:
					if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
						this.setState({dragType: ValueViewDragType.fastX});
						fastPanX(deltaX);
					}
					break;
		
					case ValueViewDragType.row:
					if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
						this.setState({dragType: ValueViewDragType.fastY});
						fastPanY(deltaY);
					}
					break;
		
				case ValueViewDragType.cell:
					if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
						this.setState({dragType: ValueViewDragType.pan});
						cellPan(deltaX, deltaY);
					}
					break;
				default:
					break;
			}	
		}
		e.stopPropagation()
    e.preventDefault()
	}

	onMouseLeave(e) {
		this.setState({
			dragType: ValueViewDragType.none
		});
	}

	render() {
		const value = this.props.value;
		const nRows = value.nr;
		const nColumns = value.nc;
		const nValues = nRows * nColumns;
		const cellHeight = this.cellHeight;
		const cellWidth = this.cellWidth;
		const xTextPad = 5;
		const rowLabelWidth = this.rowLabelWidth;
		const color1 = 'white';
		const color2 = 'rgba(255,255,230,1)';
		const color3 = 'rgba(240,240,255,1)';
		const viewBox = this.props.viewBox;
		const offset = this.props.viewInfo.viewState.valueViewOffset;
		const nRowCells = Math.min(Math.floor(viewBox[3] / cellHeight), nRows);
		const rowOrigin = Math.max(0, Math.floor(Math.min(offset.y / cellHeight), nRows - nRowCells));
		const nColumnCells = Math.min(viewBox[2] / cellWidth, nColumns);
		const columnOrigin = Math.max(0, Math.floor(Math.min(offset.x / cellWidth), nColumns - nColumnCells));
		let cells = [];
		for (let row = 0; row < Math.min(nRowCells, nRows - rowOrigin); row++) {
			const y = (row + 2) * cellHeight + rowOrigin*cellHeight - offset.y;
			for (let column = 0; column < Math.min(nColumnCells, nColumns - columnOrigin); column++) {
				const x = column * cellWidth + columnOrigin*cellWidth + rowLabelWidth - offset.x;
				const color = (row + rowOrigin) % 2 ? (
					(column + columnOrigin) % 2 ? color1 : color2
				) : (
					(column + columnOrigin) % 2 ? color3 : color1
				);
				const cellBox = e('rect', {
					x: x,
					y: y - cellHeight * 0.75,
					width: cellWidth,
					height: cellHeight,
					key: `cellbox${row}-${column}`,
					style: {
						stroke: 'black',
						fill: color
					}
				});
				cells.push(cellBox);
				const vIndex = (row + rowOrigin) * nColumns + column + columnOrigin;
				const v = vIndex < nValues ? value.v[vIndex] : '';
				const displayedV = (typeof v === 'string') ? v : v.toFixed(5);
				const cmp = e('text', {
					x: x + xTextPad,
					y: y,
					key: `${row}-${column}`
				}, displayedV);
				cells.push(cmp);
				if (row === 0) {
					const columnLabelBox = e('rect', {
						x: x,
						y: cellHeight* 0.25,
						width: cellWidth,
						height: cellHeight,
						key: `colbox${column}`,
						style: {
							stroke: 'black',
							fill: (column + columnOrigin) % 2 ? color1 : color2
						}		
					});
					cells.push(columnLabelBox);
					const columnLabel = e('text', {
						x: x + xTextPad,
						y: cellHeight,
						key: `col${column}`
					}, `${(column + columnOrigin + 1)}`);
					cells.push(columnLabel);
				}
			}
			const rowLabelBox = e('rect', {
				x: 0,
				y: y - cellHeight * 0.75,
				width: rowLabelWidth,
				height: cellHeight,
				key: `rowbox${row}`,
				style: {
					stroke: 'black',
					fill: (row + rowOrigin) % 2 ? color1 : color3
				}
			});
			cells.push(rowLabelBox);
			const rowLabel = e('text', {
				x: xTextPad,
				y: y,
				key: `row${row}`
			}, `${(row + rowOrigin + 1)}`);
			cells.push(rowLabel);
		}
		const originBox = e('rect', {
			x: 0,
			y: cellHeight* 0.25,
			width: rowLabelWidth,
			height: cellHeight,
			key: `origin`,
			style: {
				stroke: 'black',
				fill: 'rgba(238,255,238,1)'
			}
		});
		cells.push(originBox);
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
						onMouseMove: this.onMouseMove,
						onMouseDown: this.onMouseDown,
						onMouseUp: this.onMouseUp,
						onMouseLeave: this.onMouseLeave
/*					onWheel: this.onWheel,
					onClick: this.onClick,
 */			},

				 cells
			),
		);

	}
}
