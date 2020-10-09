'use strict';

import {ToolView} from './ToolView.js';
import {FormulaField, FormulaEditor} from './FormulaView.js';
import {UnitPicker} from './UnitsView.js';

const e = React.createElement;
const useEffect = React.useEffect;
const useState = React.useState;

/**
 * Enum fordisplay types.
 * @readonly
 * @enum {string}
 */
const DisplayType = Object.freeze({
	input: 0,
	formulaEditor: 1,
	graph: 2,
	unitPicker: 3
});

// copy of MMGraphLineType in MMGraph.js
/**
 * Enum for type of graph line
 * @readonly
 * @enum {Number}
 */
const MMGraphLineType = Object.freeze({
	line: 0,
	dot: 1,
	bar: 2,
	barWithDot: 3
});


/**
 * GraphView
 * info view for graph
 */
export function GraphView(props) {
	const [display, setDisplay] = useState(DisplayType.input);
	const [editFormula, setEditFormula] = useState('');
	const [formulaName, setFormulaName] = useState('');
	const [formulaOffset, setFormulaOffset] = useState(0);
	const [unitLineName, setUnitLineName] = useState('x1');
	const [unitType, setUnitType] = useState('');
	const [plotInfo, setPlotInfo] = useState('');
 
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
				setDisplay(DisplayType.input);
			});
		}
	}

	let displayComponent;
	if (display === DisplayType.formulaEditor) {
		displayComponent = e(
			FormulaEditor, {
				id: 'graph-formula-editor',
				key: 'editor',
				t: t,
				viewInfo: props.viewInfo,
				formula: editFormula,
				formulaOffset: formulaOffset,
				cancelAction: () => {
					setDisplay(DisplayType.input);
				},
				applyChanges: applyChanges(formulaName),
			}
		);
	}
	else if (display === DisplayType.unitPicker) {
		displayComponent = e(
			UnitPicker, {
				key: 'unit',
				t: props.t,
				actions: props.actions,
				unitType: unitType,
				cancel: () => {
					setDisplay(DisplayType.input);
				},
				apply: (unit) => {
					const cmd = `${props.viewInfo.path} setUnit ${unitLineName} ${unit}`;

					props.actions.doCommand(cmd, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
						setDisplay(DisplayType.input);
					});
				},
			}
		);
	}
	else if (display === DisplayType.input) {
		const makeRow = (value) => {
			const name = value.name;
			const typeClick = (type) => {
				props.actions.doCommand(`${props.viewInfo.path} setLineType ${name} ${type}`, () => {
					props.actions.updateView(props.viewInfo.stackIndex);
				})
			}
			const rowButtons = typeof value.lineType !== 'number' ?
				e(
					'div', {
						className: 'graph__input-row-buttons',
					},
					e(
						'div', {
							className: 'graph__row-delete-button',
							onClick: () => {
								props.actions.doCommand(`${props.viewInfo.path} removeaxis ${name}`, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
								})				
							}
						},
						t('react:graphRowDelete')
					)
				)
			:
				e(
					'div', {
						className: 'graph__input-row-buttons',
					},
					e(
						'div', {
							className: 'graph__type-button' + (value.lineType === 0 ? '' : ' graph__type-selected'),
							onClick: () => {typeClick('line');},
						},
						t('react:graphTypeLine')
					),
					e(
						'div', {
							className: 'graph__type-button' + (value.lineType === 1 ? '' : ' graph__type-selected'),
							onClick: () => {typeClick('scatter');},
						},
						t('react:graphTypeScatter')
					),
					e(
						'div', {
							className: 'graph__type-button' + (value.lineType === 2 ? '' : ' graph__type-selected'),
							onClick: () => {typeClick('bar');},
						},
						t('react:graphTypeBar')
					),
					e(
						'div', {
							className: 'graph__type-button' + (value.lineType === 3 ? '' : ' graph__type-selected'),
							onClick: () => {typeClick('bar+dot');},
						},
						t('react:graphTypeBarDot')
					),
					e(
						'div', {
							className: 'graph__row-delete-button',
							onClick: () => {
								props.actions.doCommand(`${props.viewInfo.path} removeaxis ${name}`, () => {
									props.actions.updateView(props.viewInfo.stackIndex);
								})
							}				
						},
						t('react:graphRowDelete')
					),
				);

			return e(
				'div', {
					className: 'graph__input-row',
					key: name
				},
				e(
					'div', {
						className: 'graph__row-inputs'
					},
					e(
						'div', {
							className: 'graph__input-label',
						},
						`${name}:`
					),
					e(
						FormulaField, {
							id: `graph__${name}`,
							className: 'graph__input-formula',
							t: t,
							actions: props.actions,
							path: `${results.path}.${name}`,
							formula: value.v,
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							clickAction: (offset) => {
								setEditFormula(value.v);
								setFormulaOffset(offset);
								setFormulaName(name);
								setDisplay(DisplayType.formulaEditor);
							}
						},
					),
					e(
						'div', {
							className: 'graph__display-unit',
							onClick: () => {
								setUnitType(value.unitType);
								setUnitLineName(name);
								setDisplay(DisplayType.unitPicker);
							}
						},
						value.unit || ''
					),
					e(
						'div', {
							className: 'graph__input-min-label',
						},
						t('react:graphMinLabel')
					),
					e(
						FormulaField, {
							id: `graph__min${name}`,
							className: 'graph__input-min-formula',
							t: t,
							actions: props.actions,
							path: `${results.path}.min${name}`,
							formula: value.vmin,
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							clickAction: (offset) => {
								setEditFormula(value.vmin);
								setFormulaOffset(offset);
								setFormulaName(`min${name}`);
								setDisplay(DisplayType.formulaEditor);
							}
						}
					),
					e(
						'div', {
							className: 'graph__input-minvalue'
						},
						value.min_value
					),
					e(
						'div', {
							className: 'graph__input-vmaxlabel',
						},
						t('react:graphMaxLabel')
					),
					e(
						FormulaField, {
							id: `graph__max${name}`,
							className: 'graph__input-vmaxformula',
							t: t,
							actions: props.actions,
							path: `${results.path}.max${name}`,
							formula: value.vmax,
							viewInfo: props.viewInfo,
							infoWidth: props.infoWidth,
							clickAction: (offset) => {
								setEditFormula(value.vmax);
								setFormulaOffset(offset);
								setFormulaName(`max${name}`);
								setDisplay(DisplayType.formulaEditor);
							}
						}
					),
					e(
						'div', {
							className: 'graph__input-maxvalue'
						},
						value.max_value
					),
				),
				rowButtons
			)
		}
		const rows = [];
		for (let xValue of results.xValues) {
			rows.push(makeRow(xValue));
			for (let yValue of xValue.yValues) {
				rows.push(makeRow(yValue));
			}
			if (xValue.zValue) {
				rows.push(makeRow(xValue.zValue));
			}
		}
		displayComponent = e(
			'div', {
				key: 'input'
			},
			e(
				'div', {
					id: 'graph__button-fields'
				},
				e(
					'button', {
						id: 'graph__addx-button',
						onClick: () => {
							props.actions.doCommand(`${props.viewInfo.path} addaxis x`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							})
						}
					},
					t('react:graphAddButton', {type: 'X'})
				),
				e(
					'button', {
						id: 'graph__addy-button',
						disabled: !results.enableY,
						onClick: () => {
							props.actions.doCommand(`${props.viewInfo.path} addaxis y`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							})
						}
					},
					t('react:graphAddButton', {type: 'Y'})
				),
				e(
					'button', {
						id: 'graph__addz-button',
						disabled: !results.enableZ,
						onClick: () => {
							props.actions.doCommand(`${props.viewInfo.path} addaxis z`, () => {
								props.actions.updateView(props.viewInfo.stackIndex);
							})
						}
					},
					t('react:graphAddButton', {type: 'Z'})
				),
				e(
					'button', {
						id: 'graph__plot-button',
						onClick: () => {
							props.actions.doCommand(`${props.viewInfo.path} plotInfo`, (infoResults) => {
								setPlotInfo(infoResults[0].results);
								setDisplay(DisplayType.graph);						
								props.actions.updateView(props.viewInfo.stackIndex);
							})
						}
					},
					t('react:graphPlotButton')
				),
			),
			e(
				'div', {
					id: 'graph__input-rows'
				},
				rows
			)
		);
	}
	else {
		if (results.xValues[0].zValue) {
			displayComponent = e('div',{key: 'graph'},'3dplot');
		}
		else { // 2d
			displayComponent = e(Plot2D, {
				key: 'graph',
				id: 'graph__plot-view',
				info: plotInfo,
				// onWheel: (e) => {
					// e.preventDefault(); // chrome complains and remvoing seems ok
					// e.stopPropagation();
					// const deltaY = e.deltaY;
					// const pageX = e.pageX;
					// const pageY = e.pageY;
					// const newScale = Math.max(0.1, scale - deltaY/100);
					// setScale(newScale);
					// const newTranslate = {
					// 	x: pageX/newScale - pageX/state.scale + state.translate.x,
					// 	y: pageY/newScale - pageY/state.scale + state.translate.y
					// }
					// console.log(`deltaY ${deltaY} pageX ${pageX} y ${pageY}`);
				// 	props.actions.doCommand(`${props.viewInfo.path} svg ${scale}`, (svgResults) => {
				// 		setSvg(svgResults[0].results);
				// 		setDisplay(DisplayType.graph);						
				// 		props.actions.updateView(props.viewInfo.stackIndex);
				// 	})
				// }
			});
		}
	}

	return e(
		ToolView, {
			id: 'tool-view',
			displayComponent: displayComponent,
			...props,
		},
	);
}

/**
 * Plot2D
 * react component that creates svg to display graph
 */
function Plot2D(props) {
	const info = props.info;
	const [xAxisIndex, setXAxisIndex] = useState(0);
	const [yAxisIndex, setYAxisIndex] = useState(0);
	const [scale, setScale] = useState(1);

	const height = 500.0;
	const width = 500.0;
	const viewBox = [0, 0, width, height];

	let axisX = info.xInfo[xAxisIndex];

	const lineColors =  ['Blue', '#009900', 'Brown', 'Orange', 'Purple', '#e60000', '#cccc00'];
	const nColors = lineColors.length;

	let colorStart = 0;
	for (let i = 0; i < xAxisIndex; i++) {
		const x = info.xInfo[i];
		colorStart += x.yInfo.length;
	}
	let lineColor = lineColors[xAxisIndex % nColors];

	const elements = [e(
		'text', {
			key: 'xTitle',
			x: width,
			y: height - 25,
			stroke: lineColor,
			textAnchor: 'end',
		},
		axisX.title
	)];

	if (axisX.labels) {
		const xLabels = axisX.labels;
		const xLabelCount = xLabels.length;
		let step = width / (xLabelCount - 1);

		const gridFormat = (key, x1, x2, y1, y2) => {
			return e(
				'line', {
					className: 'svg_gridlines',
					key: key,
					x1: x1,
					x2: x2,
					y1: y1,
					y2: y2,
					stroke: 'black'
				}
			)
		}

		const xLabelElements = [];
		for (let i = 0; i < xLabelCount; i++) {
			const centerX = i * step;
			xLabelElements.push(gridFormat(`${axisX.name}_${i}`, centerX, centerX, height, 0.0));
			
			const labelText = xLabels[i];
			let anchor;
			let labelX = centerX;
			if (i === 0) {
				anchor = 'start';
				labelX = 5.0;
			}
			else if (i === xLabelCount - 1) {
				anchor = 'end';
			}
			else {
				anchor = 'middle';
			}
			xLabelElements.push(e(
				'text', {
					className: 'graph__svg-xlabel',
					key: i,
					x: labelX,
					y: height - 5,
					stroke: lineColor,
					textAnchor: anchor
				}, labelText)
			)
		}

		const yLabelElements = [];
		let y = axisX.yInfo[yAxisIndex];
		const yLabels = y.labels;
		const yLabelCount = yLabels.length;
		lineColor = lineColors[(yAxisIndex + colorStart) % nColors];
		step = height / ( yLabelCount - 1);
		for (let i = 0; i < yLabelCount; i++) {
			const centerY = i * step;
			yLabelElements.push(gridFormat(`${y.name}_${i}`, 0.0, width, centerY, centerY));
	
			let labelText = yLabels[i];
			if (i == 0 && y.title ) {
				labelText += ' '+ y.title;
			}
			let labelY = centerY - 5.0;
			if (i == yLabelCount - 1) {
				labelY -= 20.0;
			}
			else if (i == 0) {
				labelY = 20.0;
			}
			yLabelElements.push(e(
				'text', {
					className: 'graph__svg-ylabel',
					key: i,
					x: 5,
					y: labelY,
					stroke: lineColor,
					textAnchor: 'start'
				}, labelText)
			)
		}

		elements.push(e('g', {className: 'graph__svg-grid', key: 'xLabels'},
			e('g', {className: 'graph__svg-grid'}, xLabelElements),
			e('g', {className: 'graph__svg-gridy'}, yLabelElements)
		));

		// lines
		const lines = [];
		const xCount = info.xInfo.length;
		let colorNumber = 0;
		for (let xNumber = 0; xNumber < xCount; xNumber++) {
			const x = info.xInfo[xNumber];
			const xValues = x.values;					
			const nLines = x.yInfo.length;
			const nPoints = xValues.length;
			const minX = x.minValue;
			const maxX = x.maxValue;
			const columnCount = x.columnCount || 1;
			const rowCount = nPoints / columnCount;

			const scaleForX = (minX === maxX) ? 0.1 : scale * width / (maxX - minX);

			for (let lineNumber = 0; lineNumber < nLines; lineNumber++) {
				const y = x.yInfo[lineNumber];
				const lineClass = `graph__svg_line_${y.name}`;
				
				let yValues = y.values;
				const lineType = y.lineType;
				if (yValues && yValues.length) {
					const n = Math.min(nPoints, yValues.length);
					const minY = y.minValue;
					const maxY = y.maxValue;
					const scaleForY = (minY == maxY) ? 0.1 : scale * height / (maxY - minY);
					
					for (let col = 0; col < columnCount; col++) {
						lineColor = lineColors[colorNumber++ % nColors];
						const path = [];

						for (let row = 0; row < rowCount; row++) {
							const pointCount = row*columnCount + col;
							if (pointCount < n) {
								const xPoint = xValues[pointCount];
								const yPoint = yValues[pointCount];
								
								const scaledY = (-(yPoint - minY) * scaleForY + height).toFixed(5);
								const scaledY0 = (minY * scaleForY + height).toFixed(5);
								const scaledX = ((xPoint - minX) * scaleForX).toFixed(5);

								switch(lineType) {
									case MMGraphLineType.bar:
									case MMGraphLineType.barWithDot: 
										path.push(`M ${scaledX} ${scaledY}`);
										path.push(`L ${scaledX} ${scaledY0}`);
										if (lineType === MMGraphLineType.bar)
											break;
										// fall through and add dot as well for barWithDot
										
									case MMGraphLineType.dot:
										path.push(`M ${scaledX} ${scaledY} m -1 0 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0`);
										break;
										
									default:
										if (row == 0) {
											path.push(`M ${scaledX} ${scaledY}`);
										}
										else {
											path.push(`L ${scaledX} ${scaledY}`);
										}
										break;
								}		
							}
						}															
						let fill, opacity;
						if (lineType === MMGraphLineType.dot || lineType === MMGraphLineType.barWithDot) {
							fill = lineColor;
							opacity = 0.4;
							// path.push(`<path class="${lineClass}" stroke="${lineColor}" fill="${lineColor}" opacity="0.4" d="`);
						}
						else {
							fill = 'none';
							opacity = 1;
							// path.push(`<path class="${lineClass}" stroke="${lineColor}" fill="none" d="`);
						}
						elements.push(e(
							'path', {
								className: lineClass,
								key: lineClass,
								stroke: lineColor,
								fill: fill,
								opacity: opacity,
								d: path.join(' '),
							}
						))
					}
				}
			}
		}

		elements.push(e('g', {className: 'graph__svg-lines', key: 'lines'},
			lines
		));
	}

	const svg = e(
		'svg', {
			id: 'graph__svg-plot2d',
			style: {
				height: '100%',
				width: '100%',
			},
			viewBox: viewBox,
		},
		e(
			'rect', {
				x: 1, y: 1,
				width: width - 2,
				height: height - 2,
				fill: 'white',
				stroke: 'blue',
			}
		),
		elements
	);

	return svg;
 }
