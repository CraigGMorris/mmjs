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
		const value = results.value;
		const valueUnit = value.unit;
		const unitType = value.unitType ? value.unitType : '';
		const nInputHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--input--height'));
		const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));
		return e(
			'div', {
				// main vertical sections
				id: 'expression',
			},
			e(
				// name field line
				'div', {
					id: 'expression__name',
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
					id: 'expression__formula',
				},
				e(
					// equal sign preceding formula
					'div', {
						id: 'expression__formula-equsl',
					},
					' = '
				),
 				e(
					// the formula input field
					'div', {
						id: 'expression__formula-field'
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
					id: 'expression__in-out-boxes',
				},
				e(
					// isInput check box
					'div', {
						id: 'expression__is-input',
					},
					e(
						'label', {
							id: 'expression__is-input-label',
							htmlFor: 'expression__is-input-checkbox'
						},
						t('react:exprIsInput')
					),
					e(
						'input', {
							id: 'expression__is-input-checkbox',
							type: 'checkbox',
							checked: results.isInput,
							onChange: (event) => {
								// toggle the isInput property
								const value = this.props.viewInfo.updateResults[0].results.isInput ? 'f' : 't';
								this.props.actions.doCommand(`${this.props.viewInfo.path} set isInput ${value}`, (cmds) => {
									this.props.actions.updateViewState(this.props.viewInfo.stackIndex);
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
								const value = this.props.viewInfo.updateResults[0].results.isOutput ? 'f' : 't';
								this.props.actions.doCommand(`${this.props.viewInfo.path} set isOutput ${value}`, (cmds) => {
									this.props.actions.updateViewState(this.props.viewInfo.stackIndex);
								});						
							}
						},
					),	

				),
			),
			e(
				// results unit line
				'div', {
					id: 'expression__units',
				},
				e(
					// unit type and unit
					'div', {
						id: 'expression__unit-and-type',
					},
					`${unitType}: ${valueUnit}`
				),
				e(
					// info button
					'button', {
						id: 'expression__info-button',
					},
					'i'
				)
			),
			e(
				ValueView, {
					id: 'expression__value',
					value: results.value,
					actions: this.props.actions,
					viewInfo: this.props.viewInfo,
					viewBox: [0, 0, this.props.infoWidth - 2*nInfoViewPadding, this.props.infoHeight - 4*nInputHeight],
				}
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
//		this.onMouseLeave = this.onMouseLeave.bind(this);
		this.onMouseEnter = this.onMouseEnter.bind(this);
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
			const maxX = viewBox[2];
			const value = this.props.value;
			const nColumns = value.nc;
			deltaX = (deltaX/(maxX - this.rowLabelWidth)) * nColumns * this.cellWidth * 2;
			cellPan(deltaX, 0);
		}

		const fastPanY = (deltaY) => {
			const viewBox = this.props.viewBox;
			const maxY = viewBox[3];
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

/* 	onMouseLeave(e) {
		this.setState({
			dragType: ValueViewDragType.none
		});
	} */

	onMouseEnter(e) {
		if (this.state.dragType != ValueViewDragType.none) {
			if (!e.nativeEvent.buttons) {
				this.setState({
					dragType: ValueViewDragType.none
				});				
			}
		}
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

		const color1 = getComputedStyle(document.documentElement).getPropertyValue('--expression__value--color1');
		const color2 = getComputedStyle(document.documentElement).getPropertyValue('--expression__value--color2');
		const color3 = getComputedStyle(document.documentElement).getPropertyValue('--expression__value--color3');
		const strokeColor = getComputedStyle(document.documentElement).getPropertyValue('--expression__value--stroke-color');
		const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--expression__value--bgcolor');

		const viewBox = this.props.viewBox;
		const offset = this.props.viewInfo.viewState.valueViewOffset;
		const nRowCells = Math.min(Math.floor(viewBox[3] / cellHeight), nRows);
		const rowOrigin = Math.max(0, Math.floor(Math.min(offset.y / cellHeight), nRows - nRowCells));
		const nColumnCells = Math.min(Math.floor(viewBox[2] / cellWidth), nColumns);
		const columnOrigin = Math.max(0, Math.floor(Math.min(offset.x / cellWidth), nColumns - nColumnCells));
		const yPadding = 0; // pixel gap at top
		const xPadding = 0; // pixel gap at left
		let cells = [];
		for (let row = 0; row < Math.min(nRowCells, nRows - rowOrigin); row++) {
			const y = (row + 2) * cellHeight + rowOrigin*cellHeight - offset.y;
			for (let column = 0; column < Math.min(nColumnCells, nColumns - columnOrigin); column++) {
				const x = column * cellWidth + columnOrigin*cellWidth + rowLabelWidth - offset.x + xPadding;
				const color = (row + rowOrigin) % 2 ? (
					(column + columnOrigin) % 2 ? color1 : color2
				) : (
					(column + columnOrigin) % 2 ? color3 : color1
				);
				const cellBox = e(
					'rect', {
						x: x,
						y: y - cellHeight + yPadding,
						width: cellWidth,
						height: cellHeight,
						key: `cellbox${row}-${column}`,
						style: {
							stroke: strokeColor,
							fill: color
						}
					}
				);
				cells.push(cellBox);
				let  displayedV = '';
				if (value.t === 't') {
					const tableColumn = value.v[column];
					const v = tableColumn.v.v[row];
					displayedV = (typeof v === 'string') ? v : v.toFixed(5);
				}
				else {
					const vIndex = (row + rowOrigin) * nColumns + column + columnOrigin;
					const v = vIndex < nValues ? value.v[vIndex] : '';
					displayedV = (typeof v === 'string') ? v : v.toFixed(5);
				}
				const cmp = e('text', {
					x: x + xTextPad,
					y: y - cellHeight * 0.2,
					key: `${row}-${column}`
				}, displayedV);
				cells.push(cmp);
				if (row === 0) {
					const columnLabelBox = e(
						'rect', {
							x: x,
							y: yPadding,
							width: cellWidth,
							height: cellHeight,
							key: `colbox${column}`,
							style: {
								stroke: strokeColor,
								fill: (column + columnOrigin) % 2 ? color1 : color2
							}		
						}
					);
					cells.push(columnLabelBox);
					if (value.t === 't') {
						const tableColumn = value.v[column];
						const columnLabel = e(
							'text', {
								className: 'result-table__column-label',
								x: x + xTextPad,
								y: cellHeight * 0.5,
								key: `col${column}`,
							},
							tableColumn.name
						);
						cells.push(columnLabel);
						const unitLabel = e(
							'text', {
								className: 'result-table__column-label',
								x: x + xTextPad,
								y: cellHeight * 0.9,
								key: `colUnit${column}`,
							},
							tableColumn.dUnit
						);
						cells.push(unitLabel);

					}
					else {
						const columnLabel = e(
							'text', {
								x: x + xTextPad,
								y: cellHeight * 0.8,
								key: `col${column}`
							},
							`${(column + columnOrigin + 1)}`
						);
						cells.push(columnLabel);
					}
				}
			}
			const rowLabelBox = e(
				'rect', {
					x: xPadding,
					y: y - cellHeight,
					width: rowLabelWidth,
					height: cellHeight,
					key: `rowbox${row}`,
					style: {
						stroke: strokeColor,
						fill: (row + rowOrigin) % 2 ? color1 : color3
					}
				}
			);
			cells.push(rowLabelBox);
			const rowLabel = e(
				'text', {
					x: xTextPad,
					y: y - cellHeight * 0.2,
					key: `row${row}`
				},
				`${(row + rowOrigin + 1)}`
			);
			cells.push(rowLabel);
		}
		const originBox = e(
			'rect', {
				x: xPadding,
				y: yPadding,
				width: rowLabelWidth,
				height: cellHeight,
				key: `origin`,
				style: {
					stroke: strokeColor,
					fill: bgColor,
				}
			}
		);
		cells.push(originBox);
		return e(
			'svg', {
				id: 'expression__value-svg',
				style: {
					height: `${viewBox[3]}px`,
				},
				viewBox: viewBox,
				onMouseMove: this.onMouseMove,
				onMouseDown: this.onMouseDown,
				onMouseUp: this.onMouseUp,
				onMouseEnter: this.onMouseEnter,
//				onMouseLeave: this.onMouseLeave
				},
			cells
		);
	}
}
