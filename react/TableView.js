'use strict';

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


	const cellHeight = 30;
	const cellWidth = 110;
	const rowLabelWidth = 50;

	const value = props.value;
	const nRows = value.nr ? value.nr : 0;
	const [lastRow, setLastRow] = useState(nRows);
	const nColumns = value.nc ? value.nc : 0;
	const nValues = nRows * nColumns;

	const cellInputs = props.cellInputs;
	const currentCell = props.currentCell;
	const selectedRows = props.selectedRows;
	const cellClick = props.cellClick;
	const longPress = props.longPress;
	const viewBox = props.viewBox;
	const maxDisplayedRows = Math.floor(viewBox[3] / cellHeight) + 1;

	useEffect(() => {
		if (value.t === 't' && nRows > lastRow && nRows > maxDisplayedRows - 2) {
			const y = (currentCell[0] + 2 - maxDisplayedRows) * cellHeight;
			const newOffset = {x: 0, y: y};
			setTableViewOffset(newOffset)
			setInitialOffset(newOffset);
			setLastRow(nRows);
		}
	}, [value.t, currentCell, nRows, lastRow, maxDisplayedRows]);

	const xTextPad = 5;

	const offset = tableViewOffset;
	const nRowCells = Math.min(maxDisplayedRows, nRows);
	const rowOrigin = Math.max(0, Math.floor(Math.min(offset.y / cellHeight), nRows - nRowCells));
	const nColumnCells = Math.min(Math.floor((viewBox[2]- rowLabelWidth) / cellWidth) + 1, nColumns);
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
	}, [tableViewOffset]);

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
			column = Math.floor((x + tableViewOffset.x + rowLabelWidth) / cellWidth);
		}
		return [row, column];
	},[tableViewOffset]);

	const pointerEnd = useCallback(e => {
		const x = e.nativeEvent.offsetX;
		const y = e.nativeEvent.offsetY;
		e.stopPropagation();
		e.preventDefault();

		if (pointerCaptured) {
			const en = e.nativeEvent;
			en.target.releasePointerCapture(en.pointerId);
			setPointerCaptured(false);
		}

		setDragType(TableViewDragType.none);
		const panSum = Math.abs(dragOrigin.x - x) + Math.abs(dragOrigin.y - y);
		if (panSum < 1.0 ) {
			const [row, column] = xyToRowColumn(x, y);
			const t = new Date().getTime();
			if (longPress && (t - pointerStartTime > 500)) {
				longPress(row, column);
			}
			else if (cellClick) {
				cellClick(row, column);
			}
		}
	}, [pointerCaptured, dragOrigin.x, dragOrigin.y, cellClick, longPress, xyToRowColumn])

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
			const nRows = Math.max(0,value.nr - maxY/cellHeight + 1);
			const nColumns = Math.max(0,value.nc - maxX/cellWidth + 1);	
			offsetX = Math.min(offsetX, nColumns*cellWidth)
			offsetY = Math.min(offsetY, nRows*cellHeight);
			setTableViewOffset({x: offsetX, y: offsetY});
		}

		const fastPanX = (deltaX) => {
			const maxX = viewBox[2];
			const nColumns = value.nc;
			deltaX = (deltaX/(maxX - rowLabelWidth)) * nColumns * cellWidth * 2;
			cellPan(deltaX, 0);
		}

		const fastPanY = (deltaY) => {
			const maxY = viewBox[3];
			const nRows = value.nr;
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
	}, [dragOrigin, dragType, pointerCaptured, initialOffset, viewBox, value])

	const pointerEnter = useCallback(e => {
		if (dragType != TableViewDragType.none) {
			if (!e.nativeEvent.buttons) {
				setDragType(TableViewDragType.none);
			}
		}
	}, [dragType]);

	const formatValue = useCallback(v => {
		if (typeof v === 'string') {
			return v;
		}
		else if (typeof v === 'number') {
			return v.toPrecision(8);
		}
		else {
			return '???';
		}
	}, []);

	let cells = [];
	let colorClass;
	const nDisplayedRows = Math.min(nRowCells, nRows - rowOrigin);
	const nDisplayedColumns = Math.min(nColumnCells, nColumns - columnOrigin);
	const nDisplayedTotal = nRowCells * nColumnCells;
	for (let row = 0; row < nDisplayedRows; row++) {
		const offsetRow = row + rowOrigin + 1;
		const y = (row + 2) * cellHeight + rowOrigin*cellHeight - offset.y;
		for (let column = 0; column < nDisplayedColumns; column++) {
			const x = column * cellWidth + columnOrigin*cellWidth + rowLabelWidth - offset.x + xPadding;

			const offsetColumn = column + columnOrigin + 1;
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
			if (nDisplayedTotal <= 60 || dragType === TableViewDragType.none) {
				let  displayedV = '';
				let v;
				if (value.t === 't') {
					const tableColumn = value.v[column + columnOrigin];
					v = tableColumn.v.v[row + rowOrigin];
					displayedV = formatValue(v);
				}
				else {
					const vIndex = (row + rowOrigin) * nColumns + column + columnOrigin;
					v = vIndex < nValues ? value.v[vIndex] : '';
					displayedV = formatValue(v);
				}
				let cmp;
				// use sub svg to clip long strings - only doing for string values at this point
				if (typeof v === 'string') {
					cmp = e(
						'svg', {
							className: 'tableview__cell-text',
							x: x,
							y: y - cellHeight,
							width: cellWidth,
							height: cellHeight,
							key: `${row}-${column}`,
						},
						e(
							'text', {
								x: xTextPad,
								y: cellHeight * 0.8,
							},
							displayedV
						)
					);	
				}
				else {
					cmp = e('text', {
						className: 'tableview__cell-text',
						x: x + xTextPad,
						y: y - cellHeight * 0.2,
						key: `${row}-${column}`,
					}, displayedV);
				}

				cells.push(cmp);
			}

			if (row === 0) {
				if (currentCell && currentCell[0] === 0 && currentCell[1] === offsetColumn) {
					colorClass = 'tableview__cell--selected';
				}
				else if (cellInputs && cellInputs[`0_${offsetColumn}`]) {
					colorClass = 'tableview__cell--input';
				}
				else {
					colorClass = 'tableview__cell--' + ((column + columnOrigin) % 2 ? 'color1' : 'color2');
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
				if (value.t === 't') {
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
							key: `col${column}`
						},
						`${(column + columnOrigin + 1)}`
					);
					cells.push(columnLabel);
				}
			}
		}

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
			viewBox: viewBox,
			onPointerDown: pointerStart,
			onPointerUp: pointerEnd,
			onPointerMove: pointerMove,
			onPointerEnter: pointerEnter,
		},
		cells
	);
}
