'use strict';

import {ToolView} from './ToolView.js';
import {FormulaField, FormulaEditor} from './FormulaView.js';
import {UnitPicker} from './UnitsView.js';

const e = React.createElement;
const useEffect = React.useEffect;
const useState = React.useState;
// const useCallback = React.useCallback;

/**
 * Enum fordisplay types.
 * @readonly
 * @enum {string}
 */
const DisplayType = Object.freeze({
	none: 0,
	input: 1,
	formulaEditor: 2,
	graph: 3,
	unitPicker: 4
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

	const [display, setDisplay] = useState(DisplayType.none);
	const [editFormula, setEditFormula] = useState('');
	const [formulaName, setFormulaName] = useState('');
	const [formulaOffset, setFormulaOffset] = useState(0);
	const [unitLineName, setUnitLineName] = useState('x1');
	const [unitType, setUnitType] = useState('');
	const [plotInfo, setPlotInfo] = useState('');
 
	const updateResults = props.viewInfo.updateResults;
	const results = (!updateResults.error &&updateResults.length) ? updateResults[0].results : {};
	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);

		// figure out what view to show first - graph if at least x has formula
		if (results.isKnown) {
			props.actions.doCommand(`${props.viewInfo.path} plotInfo`, (infoResults) => {
				setPlotInfo(infoResults[0].results);
				setDisplay(DisplayType.graph);						
				props.actions.updateView(props.viewInfo.stackIndex);
			})
		}
		else {
			setDisplay(DisplayType.input);
		}
	
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const t = props.t;
	if (updateResults.error) {
		// use empty command just to defer popView
		props.actions.doCommand('', () => {
			props.actions.popView();
		});
		return null;
	}
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
	else if (display === DisplayType.graph) {
		if (results.xValues[0].zValue) {
			displayComponent = e('div',{key: 'graph'},'3dplot');
		}
		else { // 2d
			displayComponent = e(Plot2D, {
				key: 'graph',
				id: 'graph__plot-view',
				info: plotInfo,
				setDisplay: setDisplay,
				t: props.t,
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
 * implemented as a class in order to use addEventListener with option passive
 * need ref for that
 */
class Plot2D extends React.Component {
	constructor(props) {
		super(props);
		this.height = 500.0;
		this.width = 500.0;
		this.panSum = 0;
		this.eventCache = [];
		this.pinch = 0;
		this.state = {
			xAxisIndex: 0,
			yAxisIndex: 0,
			scale: 1,
			translate: {x: 0, y: 0},
		}
		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onWheel = this.onWheel.bind(this);
	}

	componentDidMount() {
		this.node.addEventListener('wheel', this.onWheel, {passive: false});
	}

	componentWillUnmount() {
		this.node.removeEventListener('pointermove', this.onPointerMove);
		this.node.removeEventListener('pointerup', this.onPointerUp);
		this.node.removeEventListener('wheel', this.onWheel);
	}

	onPointerDown(e) {
    e.stopPropagation();
    e.preventDefault();
		this.pointerStartTime = new Date().getTime();
		this.eventCache.push({
			x: e.clientX,
			y: e.clientY,
			id: e.pointerId
		});
		if (this.eventCache.length === 1) {
			this.panSum = 0;
			this.lastPointer = {x: e.clientX, y: e.clientY};
			this.setState({
					lastPointer: this.lastPointer
			});
		}
		else if (this.eventCache.length == 2) {
			const pinch = Math.hypot(
				this.eventCache[0].x - e.clientX,
				this.eventCache[0].y - e.clientY
			);
			if (pinch > 0) {
				this.pinch = pinch;
			}
		}
		if (this.eventCache.length) {
			this.node.addEventListener('pointermove', this.onPointerMove);
			this.node.addEventListener('pointerup', this.onPointerUp);
			e.target.setPointerCapture(e.pointerId);
		}
  }

	onPointerUp(e) {
		e.stopPropagation();
		e.preventDefault();
		let eCache = this.eventCache;
		if (eCache.length === 1 && this.pinch === 0) {
			if (this.panSum < 1) {
				const t = new Date().getTime();
				if (t - this.pointerStartTime > 500) {
					// reset to home
					this.setState({
						scale: 1.0,
						translate: {x: 0, y: 0}
					})
				}
				else {
					const svgPoint = this.pointerToSvg({x: e.offsetX, y: e.offsetY})
					if (svgPoint.y > this.height - 40) {
						this.incrementXAxis();
					}
					else if (svgPoint.x < 40) {
						this.incrementYAxis();
					}
					else if (svgPoint.y < 40 && svgPoint.x > 400) {
						e.target.releasePointerCapture(e.pointerId);
						this.node.removeEventListener('pointermove', this.onPointerMove);
						this.node.removeEventListener('pointerup', this.onPointerUp);	
						this.props.setDisplay(DisplayType.input);
						return;
					}
				}
			}
			this.panSum = 0;
		}

		for (var i = 0; i < eCache.length; i++) {
			if (eCache[i].id == e.pointerId) {
				eCache.splice(i, 1);
				break;
			}
		}

		if (eCache.length === 0) {
			this.panSum = 0;
			this.pinch = 0;
			e.target.releasePointerCapture(e.pointerId);
			this.node.removeEventListener('pointermove', this.onPointerMove);
			this.node.removeEventListener('pointerup', this.onPointerUp);	
		}
	}
	
  onPointerMove(e) {
		e.stopPropagation();
		e.preventDefault();
		let eCache = this.eventCache;
		// console.log(`moving ${e.clientX} ${e.clientY} ${eCache.length}`);
		if (eCache.length == 1 && this.pinch === 0) {
			// panning
			let deltaX = e.clientX - eCache[0].x;
			let deltaY = e.clientY - eCache[0].y;
			this.panSum += Math.abs(deltaX) + Math.abs(deltaY);
			this.touch0 = {x: e.clientX, y: e.clientY};
			const boxWidth = this.node.width.baseVal.value;

			this.setState((state) => {
				const dx = e.clientX - state.lastPointer.x;
				const dy = e.clientY - state.lastPointer.y;
				return {
					translate: {
						x: state.translate.x + dx * this.width / boxWidth,
						y: state.translate.y + dy * this.height / boxWidth,
					},
					lastPointer: {x: e.clientX, y: e.clientY}
				};
			});
		}
		else if (eCache.length == 2 && this.pinch) {
			// Find this event in the cache and update its record with this event
			for (let i = 0; i < eCache.length; i++) {
				if (eCache[i].id === e.pointerId) {
					eCache[i].x = e.clientX;
					eCache[i].y = e.clientY;
				}
			}
			const newPinch = Math.hypot(
				eCache[0].x - eCache[1].x,
				eCache[0].y - eCache[1].y
			);

			let ratio = 1;
			if (newPinch) {
				ratio = newPinch/this.pinch;
				this.pinch = newPinch;
				this.panSum += this.pinch;
			}
			const clientX = (eCache[0].x + eCache[1].x) / 2;
			const clientY = (eCache[0].y + eCache[1].y) / 2;

			this.setState((state) => {
				const newScale = Math.max(0.1, state.scale * ratio);
				const newTranslate = {
					x: clientX/newScale - clientX/state.scale + state.translate.x,
					y: clientY/newScale - clientY/state.scale + state.translate.y
				}
				return {
					scale: newScale,
					translate: newTranslate
				}
			})	
		}
	}
	
	onWheel(e){
		e.preventDefault();
		e.stopPropagation();
		const deltaY = e.deltaY;
		this.setState((state) => {
			const newScale = Math.max(0.1, state.scale - deltaY/100);
			const newTranslate = {
				x: state.translate.x + (this.width/2 - state.translate.x) * (1 - newScale/state.scale),
				y: state.translate.y + (this.height/2 - state.translate.y) * (1 - newScale/state.scale)
			}
			// console.log(`trans x ${newTranslate.x} y ${newTranslate.y}`);
			return {
				scale: newScale,
				translate: newTranslate
			};
		});
	}

	/**
	 * @method pointerToSvg(point)
	 * converts pointer click to svg location
	 * @param {Object} point - {x, y} from pointer event
	 * @returns {Object} - {x, y} location in svg
	 */
	pointerToSvg(point) {
		// determine if container width if greater than height
		const offset = {x: 0, y:0};
		const svgWidth = this.node.width.baseVal.value;
		const svgHeight = this.node.height.baseVal.value;
		const axisDifference = svgWidth - svgHeight;
		let boxSize = 0;
		if (axisDifference > 0) {
			// wider that tall - svg height will be infoHeight
			boxSize = svgHeight;
			offset.x = axisDifference / 2; // svg will be centered
		}
		else {
			boxSize = svgWidth;
			offset.y = -axisDifference / 2;
		}
		return {
			x: (point.x - offset.x) * this.width / boxSize,
			y: (point.y - offset.y) * this.width / boxSize
		}
	}

	/**
	 * @method incrementXAxis
	 */
	incrementXAxis() {
		this.setState((state) => {
			const nXValues = this.props.info.xInfo.length;
			if (nXValues > 1) {
				return {
					xAxisIndex: (state.xAxisIndex + 1) % nXValues,
					yAxisIndex: 0
				}
			}
		})
	}

		/**
	 * @method incrementYAxis
	 */
	incrementYAxis() {
		this.setState((state) => {
			const x = this.props.info.xInfo[state.xAxisIndex];
			const nYValues = x.yInfo.length;
			if (nYValues > 1) {
				return {
					yAxisIndex: (state.yAxisIndex + 1) % nYValues
				}
			}
		})
	}

	render() {
		const height = this.height;
		const width = this.width;
		const viewBox = [0, 0, width, height];
		const info = this.props.info;
		const xAxisIndex = this.state.xAxisIndex;
		const yAxisIndex = this.state.yAxisIndex;
		const scale = this.state.scale;
		const translate = this.state.translate;

		let axisX = info.xInfo[xAxisIndex];

		const lineColors =  ['Blue', '#009900', 'Brown', 'Orange', 'Purple', '#e60000', '#cccc00'];
		const nColors = lineColors.length;

		let colorStart = 0;
		for (let i = 0; i < xAxisIndex; i++) {
			const x = info.xInfo[i];
			colorStart += x.yInfo.length;
		}
		let lineColor = lineColors[xAxisIndex % nColors];

		const elements = [
			e('text', {
				id: 'graph__x-title',
				key: 'xTitle',
				x: width - 10,
				y: height - 25,
				stroke: lineColor,
				textAnchor: 'end',
			},
			axisX.title + (axisX.unit ? ` (${axisX.unit})` : '')
		),
		e('text', {
			id: 'graph__edit-link',
			key: 'edit',
			x: width - 10,
			y: 25,
			stroke: 'blue',
			textAnchor: 'end',
		},
		this.props.t('react:graphEditLink')
	),
];

		if (axisX.minLabel != null) {
			const xLabelCount = 5;
			let step = width / (xLabelCount - 1);
			let labelStep = (axisX.maxLabel - axisX.minLabel) / (xLabelCount - 1);
			const xLabelTranslate = (axisX.minLabel - axisX.maxLabel) * (translate.x / width) / scale;
			// console.log(`xTrans ${translate.x} ${xLabelTranslate} ${scale}`)

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

			const labelText = (labelValue) => {
				if (labelValue != 0.0 && (Math.abs(labelValue) > 100000000.0 || Math.abs(labelValue) < 0.01)) {
					return labelValue.toExponential(2);
				}
				else {
					return labelValue.toFixed(3).trim().replace(/(\.\d[^0]*)(0+$)/,'$1');
				}
			}

			const xLabelElements = [];
			for (let i = 0; i < xLabelCount; i++) {
				const centerX = i * step;
				xLabelElements.push(gridFormat(`${axisX.name}_${i}`, centerX, centerX, height, 0.0));
				
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
				const labelValue = (axisX.minLabel + xLabelTranslate) + i * labelStep / scale;
				xLabelElements.push(e(
					'text', {
						className: 'graph__svg-xlabel',
						key: i,
						x: labelX,
						y: height - 5,
						stroke: lineColor,
						textAnchor: anchor,
					}, labelText(labelValue))
				)
			}

			const yLabelElements = [];
			let y = axisX.yInfo[yAxisIndex];
			const yLabelCount = 5;
			labelStep = (y.maxLabel - y.minLabel) / (yLabelCount - 1);
			const yLabelTranslate = (y.maxLabel - y.minLabel) * (translate.y / height) / scale;
			// console.log(`yTrans ${translate.y} ${yLabelTranslate} ${scale}`)

			lineColor = lineColors[(yAxisIndex + colorStart) % nColors];
			step = height / ( yLabelCount - 1);
			for (let i = 0; i < yLabelCount; i++) {
				const centerY = i * step;
				yLabelElements.push(gridFormat(`${y.name}_${i}`, 0.0, width, centerY, centerY));
				
				const labelValue = (y.maxLabel + yLabelTranslate) - i * labelStep / scale;
				let yLabelText = labelText(labelValue);
				if (i === 0) {
					if (y.title ) {
						yLabelText += ' '+ y.title;
					}
					if (y.unit) {
						yLabelText += ` (${y.unit})`;
					}
				}
				let labelY = centerY - 5.0;
				if (i === 0) {
					labelY = 20.0;
				}
				else if (i === yLabelCount - 1) {
					labelY -= 20.0;
				}
				yLabelElements.push(e(
					'text', {
						className: 'graph__svg-ylabel',
						key: i,
						x: 5,
						y: labelY,
						stroke: lineColor,
						textAnchor: 'start'
					}, yLabelText
				));
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
				if (!xValues) {
					continue;
				}					
				const nLines = x.yInfo.length;
				const nPoints = xValues.length;
				const minX = x.minValue;
				const maxX = x.maxValue;
				const columnCount = x.columnCount || 1;
				const rowCount = nPoints / columnCount;

				const scaleForX = (minX === maxX) ? 0.1 : scale * width / (maxX - minX);

				for (let lineNumber = 0; lineNumber < nLines; lineNumber++) {
					const y = x.yInfo[lineNumber];
					
					let yValues = y.values;
					if (!yValues) {
						continue;
					}
					const lineType = y.lineType;
					if (yValues && yValues.length) {
						const n = Math.min(nPoints, yValues.length);
						const minY = y.minValue;
						const maxY = y.maxValue;
						const scaleForY = (minY == maxY) ? 0.1 : scale * height / (maxY - minY);
						
						for (let col = 0; col < columnCount; col++) {
							const lineClass = `graph__svg_line_${y.name}-${col}`;
							lineColor = lineColors[colorNumber++ % nColors];
							const path = [];

							for (let row = 0; row < rowCount; row++) {
								const pointCount = row*columnCount + col;
								if (pointCount < n) {
									const xPoint = xValues[pointCount];
									const yPoint = yValues[pointCount];
									
									// const scaledY = (-(yPoint - minY) * scaleForY + height + translate.y).toFixed(5);
									// const scaledY0 = (minY * scaleForY + height).toFixed(5);
									const scaledY = ((maxY - yPoint) * scaleForY + translate.y).toFixed(5);
									const scaledY0 = (maxY * scaleForY).toFixed(5);

									const scaledX = ((xPoint - minX) * scaleForX + translate.x).toFixed(5);

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
				ref: node => this.node = node,
				onPointerDown: this.onPointerDown,
				onTouchMove: e => {
					e.preventDefault();
					e.stopPropagation();
				},
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
}
