'use strict';

import {ToolView} from './ToolView.js';
import {FormulaField} from './FormulaView.js';

const e = React.createElement;
const useState = React.useState;

/**
 * ExpressionView
 * info view for expression
 */
export function ExpressionView(props) {
	const t = props.t;
	const updateResults = props.viewInfo.updateResults;
	const results = updateResults.length ? updateResults[0].results : {};
	const value = results.value;
	const valueUnit = value.unit;
	const unitType = value.unitType ? value.unitType : '';
	const nInputHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--input--height'));
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));
	const toolComponent = e(
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
					path: results.formulaPath || '',
					formulaName: 'f_formula',
					formula: results.formula || '',
					viewInfo: props.viewInfo,
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
				actions: props.actions,
				viewInfo: props.viewInfo,
				viewBox: [0, 0, props.infoWidth - 2*nInfoViewPadding, props.infoHeight - 4*nInputHeight - 14],
			}
		)
	);

	return e(
		ToolView, {
			id: 'tool-view',
			toolComponent: toolComponent,
			...props,
		},
	);
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
 * ValueView
 * view for MMValue as a table
 */
export function ValueView(props) {
	const [dragType, setDragType] = useState(ValueViewDragType.none);
	const [dragOrigin, setDragOrigin] = useState({x: 0, y: 0});
	const [initialOffset, setInitialOffset] = useState({x: 0, y: 0});
	const	[selectedCell, setSelectedCell] = useState({row: 0, column: 0});
	const [valueViewOffset, setValueViewOffset] = useState({x: 0, y: 0});
	const cellHeight = 30;
	const cellWidth = 110;
	const rowLabelWidth = 50;

	const pointerStart = (x, y) => {
		let newDragType = ValueViewDragType.cell;
		if (y < cellHeight) {
			if (x < rowLabelWidth) {
				newDragType = ValueViewDragType.origin;
			} else {
					newDragType = ValueViewDragType.column;
			}
		}
		else if (x < rowLabelWidth) {
			newDragType = ValueViewDragType.row;
		}
		setDragType(newDragType);
		setDragOrigin({x: x, y: y});
		setInitialOffset({
				x: valueViewOffset.x,
				y: valueViewOffset.y
			});
	}

	const pointerEnd = () => {
		switch (dragType) {
			case ValueViewDragType.origin:
				setDragType(ValueViewDragType.none);
				setDragOrigin({x: 0, y: 0})
				setInitialOffset({x: 0, y: 0});
				setValueViewOffset({x: 0, y: 0});
				break;
			default:
				setDragType(ValueViewDragType.none);
				break;
		}
	}

	const pointerMove = (x, y) => {
		const cellPan = (deltaX, deltaY) => {
			let offsetX = Math.max(0, deltaX + initialOffset.x);
			let offsetY = Math.max(0, deltaY + initialOffset.y);

			// make sure at least one row and column appear
			const value = props.value;
			const nRows = value.nr;
			const nColumns = value.nc;	
			offsetX = Math.min(offsetX, (nColumns - 1)*cellWidth)
			offsetY = Math.min(offsetY, (nRows - 1)*cellHeight);
			setValueViewOffset({x: offsetX, y: offsetY});
		}

		const fastPanX = (deltaX) => {
			const viewBox = props.viewBox;
			const maxX = viewBox[2];
			const value = props.value;
			const nColumns = value.nc;
			deltaX = (deltaX/(maxX - rowLabelWidth)) * nColumns * cellWidth * 2;
			cellPan(deltaX, 0);
		}

		const fastPanY = (deltaY) => {
			const viewBox = props.viewBox;
			const maxY = viewBox[3];
			const value = props.value;
			const nRows = value.nr;
			deltaY = (deltaY/(maxY - cellHeight)) * nRows * cellHeight * 2;
			cellPan(0, deltaY);
		}

		if (dragType != ValueViewDragType.none) {
			const deltaX = dragOrigin.x - x;
			const deltaY = dragOrigin.y - y;
			switch (dragType) {
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
						setDragType(ValueViewDragType.fastX);
						fastPanX(deltaX);
					}
					break;
		
					case ValueViewDragType.row:
					if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
						setDragType(ValueViewDragType.fastY);
						fastPanY(deltaY);
					}
					break;
		
				case ValueViewDragType.cell:
					if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
						setDragType(ValueViewDragType.pan);
						cellPan(deltaX, deltaY);
					}
					break;
				default:
					break;
			}	
		}
	}

	const value = props.value;
	const nRows = value.nr;
	const nColumns = value.nc;
	const nValues = nRows * nColumns;
	const xTextPad = 5;

	const viewBox = props.viewBox;
	const offset = valueViewOffset;
	const nRowCells = Math.min(Math.floor(viewBox[3] / cellHeight), nRows);
	const rowOrigin = Math.max(0, Math.floor(Math.min(offset.y / cellHeight), nRows - nRowCells));
	const nColumnCells = Math.min(Math.floor(viewBox[2] / cellWidth) + 2, nColumns);
	const columnOrigin = Math.max(0, Math.floor(Math.min(offset.x / cellWidth), nColumns - nColumnCells));
	const yPadding = 0; // pixel gap at top
	const xPadding = 0; // pixel gap at left
	const formatValue = v => {
		if (typeof v === 'string') {
			return v;
		}
		else {
			return v.toPrecision(8);
		}
	}
	let cells = [];
	for (let row = 0; row < Math.min(nRowCells, nRows - rowOrigin); row++) {
		const y = (row + 2) * cellHeight + rowOrigin*cellHeight - offset.y;
		for (let column = 0; column < Math.min(nColumnCells, nColumns - columnOrigin); column++) {
			const x = column * cellWidth + columnOrigin*cellWidth + rowLabelWidth - offset.x + xPadding;
			const colorClass = 'expression__cell--' + ((row + rowOrigin) % 2 ? (
				(column + columnOrigin) % 2 ? 'color1' : 'color2'
			) : (
				(column + columnOrigin) % 2 ? 'color3' : 'color1')
			);
			const cellBox = e(
				'rect', {
					className: colorClass,
					x: x,
					y: y - cellHeight + yPadding,
					width: cellWidth,
					height: cellHeight,
					key: `cellbox${row}-${column}`,
				}
			);
			cells.push(cellBox);
			let  displayedV = '';
			if (value.t === 't') {
				const tableColumn = value.v[column];
				const v = tableColumn.v.v[row];
				displayedV = formatValue(v);
			}
			else {
				const vIndex = (row + rowOrigin) * nColumns + column + columnOrigin;
				const v = vIndex < nValues ? value.v[vIndex] : '';
				displayedV = formatValue(v);
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
						className: 'expression__cell--' + ((column + columnOrigin) % 2 ? 'color1' : 'color2'),
						x: x,
						y: yPadding,
						width: cellWidth,
						height: cellHeight,
						key: `colbox${column}`,
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
				className: 'expression__cell--' + ((row + rowOrigin) % 2 ? 'color1' : 'color3'),
				x: xPadding,
				y: y - cellHeight,
				width: rowLabelWidth,
				height: cellHeight,
				key: `rowbox${row}`,
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
			id: 'expression__origin-box',
			x: xPadding,
			y: yPadding,
			width: rowLabelWidth,
			height: cellHeight,
			key: `origin`,
		}
	);
	cells.push(originBox);
	return e(
		'svg', {
			id: 'expression__value-svg',
			viewBox: viewBox,
			onPointerDown: (e) => {
				const x = e.nativeEvent.offsetX;
				const y = e.nativeEvent.offsetY;
					e.stopPropagation()
				e.preventDefault()
				pointerStart(x, y);
			},

			onPointerUp: (e) => {
				e.stopPropagation();
				e.preventDefault();
				pointerEnd();
			},
			onPointerMove: (e) => {
				const x = e.nativeEvent.offsetX;
				const y = e.nativeEvent.offsetY;
				e.stopPropagation();
				e.preventDefault();
				pointerMove(x, y);
			},
			onPointerEnter: (e) => {
				if (dragType != ValueViewDragType.none) {
					if (!e.nativeEvent.buttons) {
						setDragType(ValueViewDragType.none);
					}
				}
			},
		},
		cells
	);
}

