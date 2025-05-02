/*
	This file is part of Math Minion, a javascript based calculation program
	Copyright 2021, Craig Morris

	Math Minion is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Math Minion is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with Math Minion.  If not, see <https://www.gnu.org/licenses/>.
*/
'use strict';
import {MMFormatValue} from './MMApp.js';

const e = React.createElement;
const useState = React.useState;
const useCallback = React.useCallback;
const useEffect = React.useEffect;

/**
 * Enum for TableView drag type.
 * @readonly
 * @enum {string}
 */
const TableViewDragType = Object.freeze({
	none: 'none',
	origin: 'origin',
	row: 'row',
	column: 'column',
	cell: 'cell',
	pan: 'pan',
	fastX: 'fastX',
	fastY: 'fastY'
});

let pointerStartTime;

/**
 * TableView
 * view for MMValue as a table
 */
export function TableView(props) {
	const [dragType, setDragType] = useState(TableViewDragType.none);
	const [dragOrigin, setDragOrigin] = useState({x: 0, y: 0});
	const [pointerCaptured, setPointerCaptured] = useState(false);
	const [initialOffset, setInitialOffset] = useState({x: 0, y: 0});
	const [tableViewOffset, setTableViewOffset] = useState({x: 0, y: 0});

	// reference to svg to allow addlisterner for wheel
	const svgRef = React.useRef(null);

	const cellHeight = 30;
	let cellWidth = 120;

	const value = props.value;
	let scalarString;
	let maxStringLength = 14;
	document.documentElement.style.setProperty('--tableview-height', `${props.viewBox[3]}px`);
	if (value.t === 's' || value.t === 'j') {
		if (value.nc === 1) {
			if (value.nr === 1 && value.v[0].length <= 1000000) {
				// display entire string
					scalarString = e(
					'div', {
						id: 'tableview__scalar-string',
						key: 'stringValue',
					},
					e(
						'textarea', {
							id: 'tableview__string-text',
							readOnly: true,
							value: value.v[0],
						}
					)
				)
			}
			else {
				cellWidth = props.viewBox[2] - 50;
				maxStringLength = cellWidth / 8;
			}
		}
	}

	const isTransposed = value ? value.isTransposed : false;
	const rowLabelWidth = isTransposed ? cellWidth : 50;

	const nRows = isTransposed ? 
		(value.nc ? value.nc : 0)
		:
		(value.nr ? value.nr : 0);
	const [lastRow, setLastRow] = useState(nRows);
	const nColumns = isTransposed ? 
	(value.nr ? value.nr : 0)
	:
	(value.nc ? value.nc : 0);
	const nValues = nRows * nColumns;

	const cellInputs = props.cellInputs;
	const currentCell = props.currentCell;
	const selectedRows = props.selectedRows;
	const cellClick = props.cellClick;
	const longPress = props.longPress;
	const viewBox = props.viewBox;
	const maxDisplayedRows = Math.floor(viewBox[3] / cellHeight) + 1;
	const maxDisplayedCols = Math.floor((viewBox[2] - rowLabelWidth)/cellWidth);

	useEffect(() => {
		if (currentCell) {
			const newOffset = {x: 0, y: 0};
			let [cellRow, cellCol] = currentCell;
			if (isTransposed) {
				const temp = cellRow;
				cellRow = cellCol;
				cellCol = temp;
			}
			if (cellCol > maxDisplayedCols) {
				newOffset.x = (cellCol - maxDisplayedCols) * cellWidth;
			}
			if (cellRow > maxDisplayedRows) {
				newOffset.y = (cellRow + 2 - maxDisplayedRows) * cellHeight;
			}
			setTableViewOffset(newOffset)
			setInitialOffset(newOffset);
			setLastRow(nRows);
		}
	}, [
			value.t, currentCell, nRows, lastRow,
			maxDisplayedRows, maxDisplayedCols, cellWidth,
			isTransposed
		]);

	useEffect(() => {
		// make sure at least one row and column appear
		const maxY = props.viewBox[3];
		const maxX = props.viewBox[2];
		const nMaxRows = Math.max(0,nRows - maxY/cellHeight + 1);
		const nMaxColumns = Math.max(0,nColumns - maxX/cellWidth + 1);
		if (tableViewOffset.x > nMaxColumns*cellWidth || tableViewOffset.y > nMaxRows*cellHeight) {
			setTableViewOffset({x: 0, y: 0});
			setInitialOffset({x: 0, y: 0});		
		}	
	}, [
			props.value, props.viewBox, cellWidth, nRows, nColumns,
			tableViewOffset
		]);

	const xTextPad = 5;

	const offset = tableViewOffset;
	const nRowCells = Math.min(maxDisplayedRows, nRows);
	const rowOrigin = Math.max(0, Math.floor(Math.min(offset.y / cellHeight), nRows - nRowCells));
	const nColumnCells = Math.min(Math.floor((viewBox[2]- rowLabelWidth) / cellWidth) + 2, nColumns);
	const columnOrigin = Math.max(0, Math.floor(Math.min(offset.x / cellWidth), nColumns - nColumnCells));
	const yPadding = 0; // pixel gap at top
	const xPadding = 0; // pixel gap at left

	const pointerStart = useCallback(e => {
		const x = e.nativeEvent.offsetX;
		const y = e.nativeEvent.offsetY;
		e.stopPropagation();
		e.preventDefault();

		pointerStartTime = new Date().getTime();
		let newDragType = TableViewDragType.cell;
		if (y < cellHeight) {
			if (x < rowLabelWidth) {
				newDragType = TableViewDragType.origin;
			} else {
					newDragType = TableViewDragType.column;
			}
		}
		else if (x < rowLabelWidth) {
			newDragType = TableViewDragType.row;
		}
		setDragType(newDragType);
		setDragOrigin({x: x, y: y});
		setInitialOffset({
				x: tableViewOffset.x,
				y: tableViewOffset.y
			});
	}, [tableViewOffset, rowLabelWidth]);

	const xyToRowColumn = useCallback((x, y) => {
		let row, column;
		if (y < cellHeight) {
			row = 0;
		}
		else {
			row = Math.floor((y + tableViewOffset.y) / cellHeight);
		}
		if (x < rowLabelWidth) {
			column = 0;
		}
		else {
			column = 1 + Math.floor((x + tableViewOffset.x - rowLabelWidth) / cellWidth);
		}
		return [row, column];
	},[tableViewOffset, cellWidth, rowLabelWidth]);

	const pointerEnd = useCallback(e => {
		const x = e.nativeEvent.offsetX;
		const y = e.nativeEvent.offsetY;
		e.stopPropagation();
		e.preventDefault();

		if (pointerCaptured) {
			const en = e.nativeEvent;
			en.target.releasePointerCapture(en.pointerId);
			setPointerCaptured(false);
			setInitialOffset({
				x: tableViewOffset.x,
				y: tableViewOffset.y
			});
		}

		setDragType(TableViewDragType.none);
		const panSum = Math.abs(dragOrigin.x - x) + Math.abs(dragOrigin.y - y);
		if (panSum < 5 ) {
			let [row, column] = xyToRowColumn(x, y);
			if (isTransposed) {
				const temp = row;
				row = column;
				column = temp;
			}
			const t = new Date().getTime();
			if (longPress && (t - pointerStartTime > 500)) {
				longPress(row, column);
			}
			else if (cellClick) {
				cellClick(row, column);
			}
		}
	}, [
			pointerCaptured, dragOrigin.x, dragOrigin.y, cellClick,
			longPress, xyToRowColumn, isTransposed, tableViewOffset
		])

const pointerMove = useCallback(e => {
		if (dragType === TableViewDragType.none) {
			return;
		}
		if (!pointerCaptured) {
			const en = e.nativeEvent;
			en.target.setPointerCapture(en.pointerId);
			setPointerCaptured(true);
		}
		const x = e.nativeEvent.offsetX;
		const y = e.nativeEvent.offsetY;
		e.stopPropagation();
		e.preventDefault();

		const cellPan = (deltaX, deltaY) => {
			let offsetX = Math.max(0, deltaX + initialOffset.x);
			let offsetY = Math.max(0, deltaY + initialOffset.y);
			const maxY = viewBox[3];
			const maxX = viewBox[2];
	
			// make sure at least one row and column appear
			const nMaxRows = Math.max(0,nRows - maxY/cellHeight + 1);
			const nMaxColumns = Math.max(0,nColumns- maxX/cellWidth + 1);	
			offsetX = Math.min(offsetX, nMaxColumns*cellWidth)
			offsetY = Math.min(offsetY, nMaxRows*cellHeight);
			setTableViewOffset({x: offsetX, y: offsetY});
		}

		const fastPanX = (deltaX) => {
			const maxX = viewBox[2];
			//const nColumns = value.nc;
			deltaX = (deltaX/(maxX - rowLabelWidth)) * nColumns * cellWidth * 2;
			cellPan(deltaX, 0);
		}

		const fastPanY = (deltaY) => {
			const maxY = viewBox[3];
			//const nRows = value.nr;
			deltaY = (deltaY/(maxY - cellHeight)) * nRows * cellHeight * 2;
			cellPan(0, deltaY);
		}

		if (dragType != TableViewDragType.none) {
			const deltaX = dragOrigin.x - x;
			const deltaY = dragOrigin.y - y;
			switch (dragType) {
				case TableViewDragType.pan:
					cellPan(deltaX, deltaY);
					break;

				case TableViewDragType.fastX:
					fastPanX(deltaX);
					break;

				case TableViewDragType.fastY:
					fastPanY(deltaY);
					break;

				case TableViewDragType.column:
					if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
						setDragType(TableViewDragType.fastX);
						fastPanX(deltaX);
					}
					break;
		
					case TableViewDragType.row:
					if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
						setDragType(TableViewDragType.fastY);
						fastPanY(deltaY);
					}
					break;
		
				case TableViewDragType.cell:
					if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
						setDragType(TableViewDragType.pan);
						cellPan(deltaX, deltaY);
					}
					break;
				default:
					break;
			}	
		}
	}, [
			dragOrigin, dragType, pointerCaptured, initialOffset,
			viewBox, cellWidth, nRows, nColumns,
			rowLabelWidth
		])

	const wheel = useCallback(e => {
		let offsetX = Math.max(0, e.deltaX + initialOffset.x);
		let offsetY = Math.max(0, e.deltaY + initialOffset.y);
		// console.log(`wheel ix ${initialOffset.x} iy ${initialOffset.y}`);
		const maxY = viewBox[3];
		const maxX = viewBox[2];

		// make sure at least one row and column appear
		const nMaxRows = Math.max(0,nRows - maxY/cellHeight + 1);
		const nMaxColumns = Math.max(0,nColumns - maxX/cellWidth + 1);
		offsetX = Math.min(offsetX, nMaxColumns*cellWidth)
		offsetY = Math.min(offsetY, nMaxRows*cellHeight);
		// console.log(`wheel x ${offsetX} y ${offsetY}`);
		setTableViewOffset({x: offsetX, y: offsetY});
		setInitialOffset({x: offsetX, y: offsetY});
		e.stopPropagation();
		e.preventDefault();
	}, [initialOffset, cellWidth, nRows, nColumns, viewBox]);

	const pointerEnter = useCallback(e => {
		if (dragType != TableViewDragType.none) {
			if (!e.nativeEvent.buttons) {
				setDragType(TableViewDragType.none);
			}
		}
	}, [dragType]);

	const formatValue = useCallback((v, format) => {
		return MMFormatValue(v, format);
	}, []);

	if (scalarString) {
		return scalarString;
	}

	let cells = [];
	let colorClass;
	const nDisplayedRows = Math.min(nRowCells, nRows - rowOrigin);
	const nDisplayedColumns = Math.min(nColumnCells, nColumns - columnOrigin);
	const nDisplayedTotal = nRowCells * nColumnCells;
	for (let column = 0; column < nDisplayedColumns; column++) {
		const x = column * cellWidth + columnOrigin*cellWidth + rowLabelWidth - offset.x + xPadding;
		const offsetColumn = column + columnOrigin + 1;

		for (let row = 0; row < nDisplayedRows; row++) {
			const offsetRow = row + rowOrigin + 1;
			const y = (row + 2) * cellHeight + rowOrigin*cellHeight - offset.y;

			if (isTransposed) {
				// should never have selected rows or cell inputs, just current cell
				if (currentCell && currentCell[0] === offsetColumn && currentCell[1] === offsetRow) {
					colorClass = 'tableview__cell--selected';
				} else {
					colorClass = 'tableview__cell--' + ((row + rowOrigin) % 2 ? (
						(column + columnOrigin) % 2 ? 'color1' : 'color2'
					) : (
						(column + columnOrigin) % 2 ? 'color3' : 'color1')
					);
				}
			}
			else {
				if ((selectedRows && selectedRows.has(offsetRow)) ||
					(currentCell && currentCell[0] === offsetRow && currentCell[1] === offsetColumn))
				{
					colorClass = 'tableview__cell--selected';
				}
				else if (cellInputs && cellInputs[`${offsetRow}_${offsetColumn}`]) {
					colorClass = 'tableview__cell--input';
				}
				else {
					colorClass = 'tableview__cell--' + ((row + rowOrigin) % 2 ? (
						(column + columnOrigin) % 2 ? 'color1' : 'color2'
					) : (
						(column + columnOrigin) % 2 ? 'color3' : 'color1')
					);
				}
			}

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

			// if dragging and there are lots of cells, skip filling them in to make things smoother
			const fillAll = true; // fills all cells when dragging. Set to false is dragging big tables is problem
			if (fillAll || column === 0 || nDisplayedTotal <= 60 || dragType === TableViewDragType.none) {
				let  displayedV = '';
				let v;
				if (value.t === 't') {
					if (isTransposed) {
						if (value.v) {
							const tableColumn = value.v[row + rowOrigin];
							v = tableColumn.v.v[column + columnOrigin];
							displayedV = formatValue(v, tableColumn.format);
						} else {
							displayedV = '';
						}
					}
					else {
						const tableColumn = value.v[column + columnOrigin];
						v = tableColumn.v.v[row + rowOrigin];
						displayedV = formatValue(v, tableColumn.format);
					}
				}
				else {
					const vIndex = (row + rowOrigin) * nColumns + column + columnOrigin;
					if (value.v) {
						v = vIndex < nValues ? value.v[vIndex] : '';
						if (value.t === 'tool') {
							displayedV = v.t.substring(0,3) + ': ' + v.n;
							displayedV = displayedV.substring(0,maxStringLength);
						}
						else {
							displayedV = formatValue(v, value.format);
						}
					}
					else {
						displayedV = '';
					}
				}
				let cmp;
				if (typeof v === 'string') {
					displayedV = displayedV.substring(0,maxStringLength);
				}
				cmp = e('text', {
					className: 'tableview__cell-text',
					x: x + xTextPad,
					y: y - cellHeight * 0.2,
					key: `${row}-${column}`,
				}, displayedV);

				cells.push(cmp);
			}

			if (column === 0) {
				if (isTransposed) {
					if (currentCell && currentCell[0] === 0 && currentCell[1] === offsetRow) {
						colorClass = 'tableview__cell--selected';
					}
					else {
						colorClass = 'tableview__cell--' + ((row + rowOrigin) % 2 ? 'color1' : 'color3');
					}
				}
				else {
					if (selectedRows && selectedRows.has(offsetRow)) {
						colorClass = 'tableview__cell--selected';
					}
					else if	(!selectedRows && currentCell && currentCell[1] === 0 && currentCell[0] === offsetRow) {
						colorClass = 'tableview__cell--selected';
					}
					else if (cellInputs && cellInputs[`${offsetRow}_0`]) {
						colorClass = 'tableview__cell--input';
					}
					else {
						colorClass = 'tableview__cell--' + ((row + rowOrigin) % 2 ? 'color1' : 'color3');
					}
				}
				const rowLabelBox = e(
					'rect', {
						className: colorClass,
						x: xPadding,
						y: y - cellHeight,
						width: rowLabelWidth,
						height: cellHeight,
						key: `rowbox${row}`,
					}
				);
				cells.push(rowLabelBox);
				if (value.t === 't' && isTransposed) {
					const tableColumn = value.v[row + rowOrigin];
					const columnLabel = e(
						'text', {
							className: 'result-table__column-label',
							x: xTextPad,
							y: y - cellHeight * 0.5,
							key: `col${row}`,
						},
						tableColumn.name
					);
					cells.push(columnLabel);
					const unitLabel = e(
						'text', {
							className: 'result-table__column-label',
							x: xTextPad,
							y: y - cellHeight * 0.1,
							key: `colUnit${row}`,
						},
						tableColumn.dUnit
					);
					cells.push(unitLabel);		
				}
				else {
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
			}
		}

		if (isTransposed) {
			colorClass = 'tableview__cell--' + ((column + columnOrigin) % 2 ? 'color1' : 'color2');
		} else {
			if (currentCell && currentCell[0] === 0 && currentCell[1] === offsetColumn) {
				colorClass = 'tableview__cell--selected';
			}
			else if (cellInputs && cellInputs[`0_${offsetColumn}`]) {
				colorClass = 'tableview__cell--input';
			}
			else {
				colorClass = 'tableview__cell--' + ((column + columnOrigin) % 2 ? 'color1' : 'color2');
			}
		}

		const columnLabelBox = e(
			'rect', {
				className: colorClass,
				x: x,
				y: yPadding,
				width: cellWidth,
				height: cellHeight,
				key: `colbox${column}`,
			}
		);
		cells.push(columnLabelBox);
		if (value.t === 't' && !isTransposed) {
			const tableColumn = value.v[column + columnOrigin];
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
					key: `colt${column}`
				},
				`${(column + columnOrigin + 1)}`
			);
			cells.push(columnLabel);
		}
	}

	if (currentCell && currentCell[0] === 0 && currentCell[1] === 0) {
		colorClass = 'tableview__cell--selected';
	}
	else if (cellInputs && cellInputs['0_0']) {
		colorClass = 'tableview__cell--input';
	}
	else {
		colorClass = 'tableview__cell--color1';
	}
	const originBox = e(
		'rect', {
			id: 'tableview__origin-box',
			className: colorClass,
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
			id: 'tableview__value-svg',
			ref: svgRef,
			viewBox: viewBox,
			onPointerDown: pointerStart,
			onPointerUp: pointerEnd,
			onPointerMove: pointerMove,
			onPointerEnter: pointerEnter,
			onWheel: wheel,
		},
		cells
	);
}
