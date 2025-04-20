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
	barWithDot: 3,
	hidden: 4
});


/**
 * GraphView
 * info view for graph
 */
export function GraphView(props) {

	const [display, setDisplay] = useState(DisplayType.none);
	const [formulaName, setFormulaName] = useState('');
	const [editOptions, setEditOptions] = useState({});
	const [unitLineName, setUnitLineName] = useState('x1');
	const [unitType, setUnitType] = useState('');
	const [unitName, setUnitName] = useState('');
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

	if (!results.xValues) {
		return e(
			ToolView, {
				id: 'tool-view',
				displayComponent: null,
				...props,
			},
		);
	}

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
			props.actions.doCommand(`${path} set formula ${formula}`, () => {
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
				infoWidth: props.infoWidth,
				infoHeight: props.infoHeight,
				actions: props.actions,
				editOptions: editOptions,
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
				unitName: unitName,
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
							className: 'graph__type-button' + (value.lineType === 4 ? '' : ' graph__type-selected'),
							onClick: () => {typeClick('hidden');},
						},
						t('react:graphTypeHidden')
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
							editAction: (editOptions) => {
								setEditOptions(editOptions);
								setFormulaName(name);
								setDisplay(DisplayType.formulaEditor);
							},
							applyChanges: applyChanges(name),
						},
					),
					e(
						'div', {
							className: 'graph__display-unit',
							onClick: () => {
								setUnitType(value.unitType);
								setUnitName(value.unit),
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
							editAction: (editOptions) => {
								setEditOptions(editOptions);
								setFormulaName(`min${name}`);
								setDisplay(DisplayType.formulaEditor);
							},
							applyChanges: applyChanges(`min${name}`),
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
							editAction: (editOptions) => {
								setEditOptions(editOptions);
								setFormulaName(`max${name}`);
								setDisplay(DisplayType.formulaEditor);
							},
							applyChanges: applyChanges(`max${name}`),
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
						tabIndex: -1,
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
						tabIndex: -1,
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
						tabIndex: -1,
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
						tabIndex: -1,
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
			const selected = updateResults && updateResults[0].results && updateResults[0].results.selected ?
			updateResults[0].results.selected : '0_';
			displayComponent = e(Plot3D, {
				key: 'graph',
				id: 'graph__plot-view',
				info: plotInfo,
				selected: selected,
				actions: props.actions,
				viewInfo: props.viewInfo,
				setDisplay: setDisplay,
				t: props.t,
			});
		}
		else { // 2d
			const selected = updateResults && updateResults[0].results && updateResults[0].results.selected ?
			updateResults[0].results.selected : '0_0';
			displayComponent = e(Plot2D, {
				key: 'graph',
				id: 'graph__plot-view',
				info: plotInfo,
				selected: selected,
				actions: props.actions,
				viewInfo: props.viewInfo,
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

const convertDateValue = (seconds, unit) => {
	const date = new Date(seconds * 1000);
	let result = 0;
	let year = date.getUTCFullYear();
	const month = date.getUTCMonth() + 1;
	const day = date.getUTCDate();
	let isBC = false;
	if (year < 0) {
		year = -year;
		isBC = true;
	}
	switch (unit) {
		case 'date':
			result = year * 10000. + month * 100.0 + day;
			break;
		case 'dated':
			result = day * 1000000. + month * 10000.0 + year;
			break;
		case 'datem':
			result = month * 1000000. + day * 10000.0 + year;
			break;
	}
	// result += date.getUTCHours() / 100.0 + date.getUTCMinutes() / 10000. + date.getUTCSeconds() / 1000000.0;
	if (isBC) {
		result = -result;
	}
	return result;
}

/**
 * Plot2D
 * react component that creates svg to display 2d graph
 * implemented as a class in order to use addEventListener with option passive
 * need ref for that
 */
class Plot2D extends React.Component {
	constructor(props) {
		super(props);
		let lineCount = 0;
		const info = this.props.info;
		for (const x of info.xInfo) {
			lineCount += x.yInfo.length;
		}
		this.yLegendSpacing = 20;
		this.yLegendHeight = Math.floor((lineCount - 1)/3) * this.yLegendSpacing;

		this.height = 500.0;// + this.yLegendHeight;
		this.width = 500.0;
		this.leftMargin = 90;
		this.rightMargin = 10;
		this.topMargin = 40 + this.yLegendHeight;
		this.bottomMargin = 60;
		this.plotWidth = this.width - this.leftMargin - this.rightMargin;
		this.plotHeight = this.height - this.topMargin - this.bottomMargin;

		this.panSum = 0;
		this.eventCache = [];
		this.pinch = 0;
		let initialState;
		if (props.selected) {
			const nSelected = props.selected.split('_').map(s => parseInt(s));
			initialState = {
				xAxisIndex: nSelected[0],
				yAxisIndex: nSelected[1]	
			}
		}
		else {
			initialState = this.checkAxis(0,0,0,0);
		}
		initialState.xScale = 1;
		initialState.yScale = 1;
		initialState.translate =  {x: 0, y: 0};
		initialState.cursorPosition = null;
		initialState.highlightTrace = info.xInfo.highlightTrace;
		this.state = initialState;

		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onWheel = this.onWheel.bind(this);
	}

	componentDidMount() {
		this.node.addEventListener('wheel', this.onWheel, {passive: false});
		this.setState((state) => {
			return this.checkAxis(state.xAxisIndex, state.yAxisIndex, state.xAxisIndex, state.yAxisIndex);
		})
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
		this.setState(() => {
			return {
				cursorPosition: null
			}
		})
  }

	onPointerUp(e) {
		e.stopPropagation();
		e.preventDefault();
		let eCache = this.eventCache;
		if (eCache.length === 1 && this.pinch === 0) {
			if (this.panSum < 5) {
				const t = new Date().getTime();
				if (t - this.pointerStartTime > 500) {
					// reset to home
					const svgPoint = this.pointerToSvg({x: e.offsetX, y: e.offsetY})
					let isScalingX = true;
					let isScalingY = true;
					if (svgPoint.y > this.height-40) {
						isScalingY = false;
					}
					else if (svgPoint.x < 40) {
						isScalingX = false;
					}
			
					this.setState({
						xScale: isScalingX ? 1.0 : this.state.xScale,
						yScale: isScalingY ? 1.0 : this.state.yScale,
						translate: (isScalingX && isScalingY) ? { x: 0, y: 0 } :
						{
							x: isScalingX ? 0 : this.state.translate.x, 
							y: isScalingY ? 0 : this.state.translate.y
						}
					})
				}
				else {
					const svgPoint = this.pointerToSvg({x: e.offsetX, y: e.offsetY});
					if (svgPoint.y > this.height - 40 && svgPoint.x > this.width - 50) {
						e.target.releasePointerCapture(e.pointerId);
						this.node.removeEventListener('pointermove', this.onPointerMove);
						this.node.removeEventListener('pointerup', this.onPointerUp);	
						this.props.setDisplay(DisplayType.input);
						return;
					}
					else if (svgPoint.y < this.yLegendHeight + 2 * this.yLegendSpacing) {
						const row = Math.floor(svgPoint.y / this.yLegendSpacing) + 1;
						const col = Math.floor(svgPoint.x * 3 / this.width) + 1;
						const traceNumber = (row - 1) * 3 + col;
						let traceCount = 0;
						const xInfo = this.props.info.xInfo;
						const nX = xInfo.length;
						for (let xNumber = 0; xNumber < nX; xNumber++) {
							const x = xInfo[xNumber];
							if (traceCount + x.yInfo.length >= traceNumber) {
								const yNumber = traceNumber - traceCount - 1;
								const y = x.yInfo[yNumber];
								if (xNumber === this.state.xAxisIndex && yNumber === this.state.yAxisIndex) {
									this.setState((state) => {
										return {
											highlightTrace: !state.highlightTrace
										}
									});			
								} else {
									this.setState((state) => {
										const newState = this.checkAxis(xNumber, yNumber,
												this.state.xAxisIndex, this.state.yAxisIndex
											);
										newState.highlightTrace = true;
										return newState;
									});
								}
								this.props.actions.doCommand(`${this.props.viewInfo.path} sethighlight ${this.state.highlightTrace}`, () => {
								});
		
								break;
							}
							traceCount += x.yInfo.length;
						}
					}
					else {
						const xScale = this.state.xScale;
						const yScale = this.state.yScale;
						const translate = this.state.translate;
						const axisX = this.props.info.xInfo[this.state.xAxisIndex];
						const axisY = axisX.yInfo[this.state.yAxisIndex];
						const width = this.width;
						const height = this.height;
						const xSpan = (axisX.maxLabel - axisX.minLabel)
						const ySpan = (axisY.maxLabel - axisY.minLabel)

						const xLabelTranslate = -xSpan * (translate.x / this.plotWidth) / xScale;
						const yLabelTranslate = ySpan * translate.y / this.plotHeight / yScale;

						let xValue = (axisX.minLabel + xLabelTranslate) + xSpan * (svgPoint.x - this.leftMargin) / this.plotWidth / xScale;
						const xIsDate = (axisX.unit === 'date' || axisX.unit === 'dated' || axisX.unit === 'datem');
						if (xIsDate) {
							xValue = convertDateValue(xValue, axisX.unit);
						}

						let yValue = (axisY.maxLabel + yLabelTranslate) - ySpan * (svgPoint.y - this.topMargin) / this.plotHeight / yScale;
						const yIsDate = (axisY.unit === 'date' || axisY.unit === 'dated' || axisY.unit === 'datem');
						if (yIsDate) {
							yValue = convertDateValue(yValue, axisY.unit);
						}
						this.setState(() => {
							return {
								cursorPosition: {x: xValue, y: yValue}
							}
						});
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

			this.setState((state) => {
				const newXScale = Math.max(0.01, state.xScale * ratio);
				const newYScale = Math.max(0.01, state.yScale * ratio);
				const newTranslate = {
					x: state.translate.x + (this.width/2 - state.translate.x) * (1 - newXScale/state.xScale),
					y: state.translate.y + (this.height/2 - state.translate.y) * (1 - newYScale/state.yScale)
				}
				return {
					xScale: newXScale,
					yScale: newYScale,
					translate: newTranslate
				}
			})	
		}
	}
	
	onWheel(e){
		e.preventDefault();
		e.stopPropagation();
		const deltaY = e.deltaY;
		const svgPoint = this.pointerToSvg({x: e.offsetX, y: e.offsetY})
		let isScalingX = true;
		let isScalingY = true;
		if (svgPoint.y > this.height-40) {
			isScalingY = false;
		}
		else if (svgPoint.x < 40) {
			isScalingX = false;
		}

		this.setState((state) => {
			const rate = Math.sign(deltaY) * Math.min(Math.abs(deltaY), 5*(state.xScale + state.yScale));
			const newXScale = isScalingX ? Math.max(0.01, state.xScale + rate / 100) : state.xScale;
			const newYScale = isScalingY ?  Math.max(0.01, state.yScale + rate / 100) : state.yScale;
			const newTranslate = {
				x: state.translate.x + (svgPoint.x - state.translate.x) * (1 - newXScale/state.xScale),
				y: state.translate.y + (svgPoint.y - state.translate.y) * (1 - newYScale/state.yScale)
			}
			return {
				xScale: newXScale,
				yScale: newYScale,
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
	 * @method checkAxis
	 * check to ensure selected axis isn't hidden. If so move to first unhidden
	 */
	checkAxis(xAxisIndex, yAxisIndex, currentXAxis, currentYAxis) {
		const nXValues = this.props.info.xInfo.length;
		let xIndex = xAxisIndex % nXValues
		let nXChecked = 0;
		while (nXChecked++ < nXValues) {
			const x = this.props.info.xInfo[xIndex];
			const nYValues = x.yInfo.length;
			let nYChecked = 0;
			let yIndex = yAxisIndex % nYValues;
			while (nYChecked++ < nYValues) {
				if (x.yInfo[yIndex].lineType !== MMGraphLineType.hidden) {
					if (xIndex !== currentXAxis || yIndex !== currentYAxis) {
						this.props.actions.doCommand(`${this.props.viewInfo.path} setselected ${xIndex}_${yIndex}`, () => {
							this.props.actions.updateView(this.props.viewInfo.stackIndex);
						});
					}
					return {
						xAxisIndex: xIndex,
						yAxisIndex: yIndex
					}
				}
				yIndex = (yIndex + 1) % nXValues;
			}
			xIndex = (xIndex + 1) % nXValues
		}

		return {	// if one not found, return original
			xAxisIndex: xAxisIndex,
			yAxisIndex: yAxisIndex
		}
	}

	render() {
		const height = this.height;
		const width = this.width;
		const leftMargin = this.leftMargin;
		const rightMargin = this.rightMargin;
		const topMargin = this.topMargin;
		const bottomMargin = this.bottomMargin;
		const plotWidth = this.plotWidth;
		const plotHeight = this.plotHeight;

		const viewBox = [0, 0, width, height];
		const info = this.props.info;
		const xAxisIndex = this.state.xAxisIndex;
		const yAxisIndex = this.state.yAxisIndex;
		const xScale = this.state.xScale;
		const yScale = this.state.yScale;
		const translate = this.state.translate;

		let axisX = info.xInfo[xAxisIndex];

		const lineColors = [
			'Blue', '#009900', 'Brown', '#E58231', 'Purple', '#e60000', '#7D8F9B',
			'#9076C7', '#4994EC', '#684D43',
		];
		const nColors = lineColors.length;

		let colorStart = 0;
		for (let i = 0; i < xAxisIndex; i++) {
			const x = info.xInfo[i];
			colorStart += x.yInfo.length;
		}
		colorStart += yAxisIndex;
		let lineColor = lineColors[colorStart % nColors];

		const elements = [
			e(
				'text', {
					id: 'graph__x-title',
					key: 'xTitle',
					x: leftMargin + plotWidth/2,
					y: plotHeight + topMargin + 30,
					stroke: lineColor,
					fill: lineColor,
					textAnchor: 'middle',
				},
				axisX.title + (axisX.unit &&
					axisX.unit !== 'Fraction' &&
					axisX.unit !=='String' ? ` (${axisX.unit})` : '')
			),
			e(
				'text', {
					id: 'graph__edit-link',
					key: 'edit',
					x: width - 10,
					y: height - 15,
					stroke: 'blue',
					fill: 'blue',
					textAnchor: 'end',
				},
				this.props.t('react:graphEditLink')
			),
		];

		if (axisX.minLabel != null) {
			const labelText = (labelValue) => {
				if (labelValue != 0.0 && (Math.abs(labelValue) > 100000000.0 || Math.abs(labelValue) < 0.01)) {
					return labelValue.toExponential(2);
				}
				else if (Math.abs(labelValue) >= 100000.0) {
					// regex trims trailing zeros
					return labelValue.toFixed(0).trim().replace(/(\.\d[^0]*)(0+$)/,'$1');
				}
				else {
					const decimals = 5 - Math.max(1, Math.floor(Math.log10(Math.abs(labelValue))))
					return labelValue.toFixed(decimals).trim().replace(/(\.\d[^0]*)(0+$)/,'$1');
				}
			}
	
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
			const isXString = axisX.unit === 'String'
			const xLabelCount = isXString ? axisX.values.length : 5;
			let step = plotWidth / (xLabelCount - 1);
			let labelStep = (axisX.maxLabel - axisX.minLabel) / (xLabelCount - 1);
			const xLabelTranslate = (axisX.minLabel - axisX.maxLabel) * (translate.x / plotWidth) / xScale;
			const xIsDate = (axisX.unit === 'date' || axisX.unit === 'dated' || axisX.unit === 'datem');

			for (let i = 0; i < xLabelCount; i++) {
				const centerX = i * step + leftMargin;
				if (!isXString) {
					xLabelElements.push(gridFormat(`${axisX.name}_${i}`, centerX, centerX, topMargin, topMargin + plotHeight));
				}

				let labelX = centerX;
				let labelValue;
				if (isXString) {
					labelValue = axisX.values[i];
					const labelY = height - this.bottomMargin + 15;
					xLabelElements.push(e(
						'text', {
							className: 'graph__svg-xlabel',
							key: i,
							x: labelX,
							y: labelY,
							stroke: lineColor,
							fill: lineColor,
							fontSize: '10pt',
							textAnchor: 'end',
							transform: `rotate(-40, ${labelX}, ${labelY})`
						}, labelValue)
					)
				}
				else {
					let anchor;
					if (i === 0) {
						anchor = 'start';
						labelX = leftMargin;
					}
					else if (i === xLabelCount - 1) {
						anchor = 'end';
					}
					else {
						anchor = 'middle';
					}	
					labelValue = (axisX.minLabel + xLabelTranslate) + i * labelStep / xScale;
					if (xIsDate) {
						labelValue = convertDateValue(labelValue, axisX.unit);
					}
					xLabelElements.push(e(
						'text', {
							className: 'graph__svg-xlabel',
							key: i,
							x: labelX,
							y: height - this.bottomMargin + 15,
							stroke: lineColor,
							fill: lineColor,
							textAnchor: anchor,
						}, labelText(labelValue))
					)
				}
			}

			const yLabelElements = [];
			let y = axisX.yInfo[yAxisIndex];
			const yLabelCount = 5;
			labelStep = (y.maxLabel - y.minLabel) / (yLabelCount - 1);
			const yLabelTranslate = (y.maxLabel - y.minLabel) * (translate.y / plotHeight) / yScale;

			step = plotHeight / ( yLabelCount - 1);
			for (let i = 0; i < yLabelCount; i++) {
				const centerY = i * step + topMargin;
				yLabelElements.push(gridFormat(`${y.name}_${i}`, leftMargin,
					width - rightMargin, centerY, centerY));
				
				const labelValue = (y.maxLabel + yLabelTranslate) - i * labelStep / yScale;
				let yLabelText = labelText(labelValue);
				let labelY = centerY - 5.0;
				if (i === 0) {
					labelY = topMargin + 20.0;
				}
				yLabelElements.push(e(
					'text', {
						className: 'graph__svg-ylabel',
						key: i,
						x: leftMargin - 5,
						y: labelY,
						stroke: lineColor,
						fill: lineColor,
						textAnchor: 'end'
					}, yLabelText
				));
			}

			if (this.state.cursorPosition) {
				let cursorX, cursorY;
				if (isXString) {
					const index = Math.floor(this.state.cursorPosition.x + 0.5) - 1;
					if (index >= 0 && index < axisX.values.length) {
						cursorX = axisX.values[index];
					}
					else {
						cursorX = '';
					}
				}
				else {
					cursorX = labelText(this.state.cursorPosition.x);
				}
				elements.push(e(
					'text', {
						className: 'graph__svg-xyCursor',
						key: 'cursorX',
						x: width - 200,
						y: this.topMargin + 15,
						stroke: lineColor,
						fill: lineColor,
						textAnchor: 'start',
					}, cursorX)
				);
				elements.push(e(
					'text', {
						className: 'graph__svg-xyCursor',
						key: 'cursorY',
						x: width - 100,
						y: this.topMargin + 15,
						stroke: lineColor,
						fill: lineColor,
						textAnchor: 'start',
					}, labelText(this.state.cursorPosition.y))
				)

			}

			// lines
			const lines = [];
			const xCount = info.xInfo.length;
			let colorNumber = 0;
			let yTitleNumber = 0;
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
				const xLineScale = isXString ? 1 : xScale;
				const scaleForX = (minX === maxX) ? 0.1 : xLineScale * plotWidth / (maxX - minX);

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
						const scaleForY = (minY == maxY) ? 0.1 : yScale * plotHeight / (maxY - minY);
						
						lineColor = lineColors[colorNumber++ % nColors];
						let opacity = !this.state.highlightTrace || y === axisX.yInfo[yAxisIndex] ? 1 : .5;
						const strokeWidth = isXString ? 10 : 1;
						for (let col = 0; col < columnCount; col++) {
							const lineClass = `graph__svg_line_${y.name}-${col}`;
							const path = [];
							let barLabel;
							for (let row = 0; row < rowCount; row++) {
								const pointCount = row*columnCount + col;
								if (pointCount < n) {
									const xPoint = isXString ? pointCount + 1 : xValues[pointCount];
									const yPoint = yValues[pointCount];
									
									const scaledY = (topMargin + (maxY - yPoint) * scaleForY + translate.y).toFixed(5);
									const scaledY0 = (topMargin + plotHeight).toFixed(5);
									const translateX = isXString ? 0 : translate.x;
									const scaledX = (leftMargin + (xPoint - minX) * scaleForX + translateX).toFixed(5);
									switch(lineType) {
										case MMGraphLineType.bar:
										case MMGraphLineType.barWithDot: 
											path.push(`M ${scaledX} ${scaledY}`);
											path.push(`L ${scaledX} ${scaledY0}`);
											if (lineType === MMGraphLineType.bar)
												break;
											// fall through and add dot as well for barWithDot
											
										case MMGraphLineType.dot:
											path.push(`M ${scaledX} ${scaledY} m -3 0 a 3,3 0 1,0 6,0 a 3,3 0 1,0 -6,0`);
											break;

										case MMGraphLineType.hidden:
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
							let fill;
							if (lineType === MMGraphLineType.dot || lineType === MMGraphLineType.barWithDot) {
								fill = lineColor;
							}
							else {
								fill = 'none';
							}
							elements.push(e(
								'path', {
									className: lineClass,
									key: lineClass,
									stroke: lineColor,
									fill: fill,
									opacity: opacity,
									strokeWidth: strokeWidth,
									d: path.join(' '),
								}
							));
							if (isXString) {
								elements.push(barLabel);
							}
						}
						let yTitle = y.title;
						if (y.unit && y.unit !== 'Fraction') {
							yTitle += ` (${y.unit})`;
						}
						let titleAnchor = 'start';
						let titleX = 25;
						let titleY = (Math.floor(yTitleNumber/3) + 1) * this.yLegendSpacing;
						const column = yTitleNumber % 3;
						if (column === 1) {
							titleX = leftMargin + plotWidth/2;
							titleAnchor = 'middle';
						}	else if (column === 2) {
							titleX = leftMargin + plotWidth;
							titleAnchor = 'end';
						}

						elements.push(e(
							'text', {
								className: 'graph__ytitle',
								key: `ytitle${yTitleNumber}`,
								x: titleX,
								y: titleY,
								stroke: lineColor,
								fill: lineColor,
								opacity: opacity,
								textAnchor: titleAnchor,
							}, yTitle)
						);
						yTitleNumber++;
					}
				}
			}

			elements.push(e('g', {className: 'graph__svg-lines', key: 'lines'},
				lines
			));

			elements.push(e('g', {className: 'graph__svg-grid', key: 'xLabels'},
				e('g', {className: 'graph__svg-grid'}, xLabelElements),
				e('g', {className: 'graph__svg-gridy'}, yLabelElements)
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

/**
 * Plot3D
 * react component that creates svg to display 3d graph
 * implemented as a class in order to use addEventListener with option passive
 * need ref for that
 */
class Plot3D extends React.Component {
	constructor(props) {
		super(props);
		this.height = 500.0;
		this.width = 500.0;
		this.panSum = 0;
		this.isPanning = false;
		this.eventCache = [];
		this.pinch = 0;
		this.isRotating = false;
		this.lastRotationX = null;

		let nSelected;
		if (props.selected) {
			nSelected = parseInt(props.selected);
		}
		else {
			nSelected = this.checkAxis(0,0);
		}

		this.state = {
			xAxisIndex: nSelected,
			scale: this.height/1.8,
			pan: {x: 0, y: 0, z: 0},
			pinchScale: 1,
			rotation: 0,
		}
		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onWheel = this.onWheel.bind(this);
	}

	componentDidMount() {
		this.node.addEventListener('wheel', this.onWheel, {passive: false});
		this.setState((state) => {
			return {xAxisIndex: this.checkAxis(state.xAxisIndex, state.xAxisIndex)};
		});
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
		if (this.isRotating) {
			this.isRotating = false;
			this.lastRotationX = null;
		}
		else if (this.isPanning) {
			this.isPanning = false;
		}
		else if (eCache.length === 1 && this.pinch === 0) {
			if (this.panSum < 5) {
				const t = new Date().getTime();
				if (t - this.pointerStartTime > 500) {
					// reset to home
					this.setState({
						pinchScale: 1.0,
						pan: {x: 0, y: 0, z: 0},
						rotation: 0,
					})
				}
				else {
					const svgPoint = this.pointerToSvg({x: e.offsetX, y: e.offsetY})
					if (!this.isRotating && svgPoint.y > this.height - 40 && svgPoint.x > this.width - 50) {
						e.target.releasePointerCapture(e.pointerId);
						this.node.removeEventListener('pointermove', this.onPointerMove);
						this.node.removeEventListener('pointerup', this.onPointerUp);	
						this.props.setDisplay(DisplayType.input);
						return;
					}
					else if (svgPoint.y > this.height - 40) {
						this.incrementXAxis();
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
		if (eCache.length == 1 && this.pinch === 0) {
			// panning
			let deltaX = e.clientX - eCache[0].x;
			let deltaY = e.clientY - eCache[0].y;
			this.panSum += Math.abs(deltaX) + Math.abs(deltaY);
			this.touch0 = {x: e.clientX, y: e.clientY};
			const svgPoint = this.pointerToSvg({x: e.offsetX, y: e.offsetY})
			if (!this.isPanning && (this.isRotating || svgPoint.y < 50)) {
				this.isRotating = true;
				if (this.lastRotationX !== null) {
					this.setState((state) => {
						return {
							rotation: state.rotation + (e.clientX - this.lastRotationX) / 100.0,
						}
					});
				}
				this.lastRotationX = e.clientX;
			}
			else {
				this.isPanning = true;
				this.setState((state) => {
					let dx = e.clientX - state.lastPointer.x;
					let dy = e.clientY - state.lastPointer.y;
					let dz = 0;
					const angle = Math.atan2(-dy,dx)*180/Math.PI;
					const r = Math.sqrt(dx*dx + dy*dy) * Math.sign(angle);
					if (angle < -120 || (angle > 0 && angle < 60)) {
						dy = 0;
						dx = r;
					}
					else if (angle > 120 || (angle < 0 && angle > -60))
					{
						dx = 0;
						dy = r;
					}
					else {
						dx = dy = 0;
						dz = r;
					}
					return {
						pan: {
							x: state.pan.x + dx / this.width, // * this.width / boxWidth,
							y: state.pan.y + dy / this.height, // * this.height / boxWidth,
							z: state.pan.z + dz / this.height, // * this.height / boxWidth,
						},
						lastPointer: {x: e.clientX, y: e.clientY}
					};
				});
			}
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

			this.setState((state) => {
				const newScale = Math.max(0.01, state.pinchScale * ratio);
				return {
					pinchScale: newScale,
				}
			})	
		}
	}
	
	onWheel(e){
		e.preventDefault();
		e.stopPropagation();
		const deltaY = e.deltaY;
		this.setState((state) => {
			const rate = Math.sign(deltaY) * Math.min(Math.abs(deltaY), 10*state.pinchScale);
			const newScale = Math.max(0.01, state.pinchScale + rate/100);
			return {
				pinchScale: newScale,
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
	 * @method checkAxis
	 */
	checkAxis(xAxisIndex, currentXAxis) {
		const nXValues = this.props.info.xInfo.length;
		let xIndex = xAxisIndex % nXValues
		let nChecked = 0;
		while (nChecked++ < nXValues) {
			const x = this.props.info.xInfo[xIndex];
			if (x.zInfo.lineType !== MMGraphLineType.hidden) {
				if (xIndex !== currentXAxis) {
					this.props.actions.doCommand(`${this.props.viewInfo.path} setselected ${xIndex}`, () => {
						this.props.actions.updateView(this.props.viewInfo.stackIndex);
						});
				}
				return xIndex;
			}
			xIndex = (xIndex + 1) % nXValues;
		}
		return  xAxisIndex;
	}

	/**
	 * @method incrementXAxis
	 */
	incrementXAxis() {
		this.setState((state) => {
			const nXValues = this.props.info.xInfo.length;
			const newIndex = (state.xAxisIndex + 1) % nXValues;
			return {xAxisIndex: this.checkAxis(newIndex, state.xAxisIndex)};
		});
	}
	
	render() {
		const height = this.height;
		const width = this.width;
		const viewBox = [0, 0, width, height];
		const info = this.props.info;
		const xAxisIndex = this.state.xAxisIndex;
		const scale = this.state.scale;
		const pan = this.state.pan;
		const pinchScale = this.state.pinchScale;
		const rotation = this.state.rotation;

		const xValue = info.xInfo[xAxisIndex];
		const yValue = xValue.yInfo[0];
		const zValue = xValue.zInfo;

		const lineColors =  ['Blue', '#009900', 'Brown', 'Orange', 'Purple', '#e60000', '#cccc00'];
		const nColors = lineColors.length;

		let lineColor = lineColors[xAxisIndex % nColors];

		const elements = [
			e(
				'text', {
					id: 'graph__edit-link',
					key: 'edit',
					x: width - 10,
					y: height - 15,
					stroke: 'blue',
					fill: 'blue',
					textAnchor: 'end',
				},
				this.props.t('react:graphEditLink')
			),
		];

		// define transform functions needed
		const pitchForAngle = (angle) => {
			const v = new Float64Array(16);
			v[0] = 1.0;	// [1,1] (1 based)
			v[5] = Math.cos( angle );	// [2,2]
			v[6] = Math.sin( angle );	// [2,3]
			v[9] = -Math.sin( angle );	// [3,2]
			v[10] = Math.cos( angle );	// [3,3]
			v[15] = 1.0;	// [4,4]			
			return v;
		}

		const rollForAngle = (angle) => {
			const v = new Float64Array(16);
			v[0] = Math.cos( angle );	// [1,1] (1 based)
			v[1] = Math.sin( angle );	// [1,2]
			v[4] = -Math.sin( angle );	// [2,1]
			v[5] = Math.cos( angle );	// [2,2]
			v[10] = 1.0;	// [3,3]
			v[15] = 1.0;	// [4,4]		
			return v;	
		}

		// dot product of two 4x4 matricies represented as Float64Arrays
		const matrixMultiply4x4 = (a, b) => {
			const nRows = 4;
			const nColumns = 4;
			const v = new Float64Array(nRows*nColumns);	
			for (let i = 0; i < nRows; i++) {
				for (let j = 0; j < nColumns; j++) {
					let sum = 0.0;
					for (let k = 0; k < nColumns; k++) {
						sum += a[nColumns * i + k] * b[nColumns * k + j];
					}
					v[nColumns * i + j] = sum;
				}
			}
			return v;
		}

		// Creates a 4x4 transformation matrix corresponding to an x, y, z translation
		// using the three coordinates of the a array.
		const translateArray = (a) => {
			const v = new Float64Array(16);
			v[3] = a[0];	// [1,4] (1 based)
			v[7] = a[1];	// [2,4]
			v[11] = a[2];	// [3,4]
			v[0] = 1.0;		// [1,1]
			v[5] = 1.0;		// [2,2]
			v[10] = 1.0;	// [3,3]
			v[15] = 1.0;	// [4,4]
			return v;
		}

		/**
		 * Applies the 4x4 transform matrix in the first parameter to the x, y and z coordinates
		 * in the second parameter.
		 * The result is an x,y,z array with the transformation applied.
		 * Coords can have a multiple of 3 values and the result will correspond with the
		 * transform applies to each group of 3
		 * @param {Float64Array} transform
		 * @param {Float64Array} coords
		 * @returns {Float64Array}
		 */
		const transformCoords = (transform, coords) => {
			const nRows = coords.length / 3;	
			const v = new Float64Array(3 * nRows);
			for (let rowNumber = 0; rowNumber < nRows; rowNumber++) {
				for (let i = 0; i < 3; i++) {
					let sum = 0.0;
					for (let k = 0; k < 3; k++ ) {
						sum += transform[i * 4 + k] * coords[rowNumber*3 + k];
					}
					sum += transform[i * 4 + 3];
					v[rowNumber*3 + i] = sum;
				}
			}
			return v;
		}

		/**
		 * multiple Float64Array a by Number b returning new Float64Arra
		 */
		const multiply = (a, b) => {
			const l = a.length;
			const v = new Float64Array(l);
			for (let i = 0; i < l; i++) {
				v[i] = a[i] * b;
			}
			return v;
		}

		/**
		 * subtract scalar b from Float64Array a returning new Float64Arra
		 */
		const subtract = (a, b) => {
			const l = a.length;
			const v = new Float64Array(l);
			for (let i = 0; i < l; i++) {
				v[i] = a[i] - b;
			}
			return v;
		}

		/**
		 * append column b to matrix a, where rowCount is the number of rows
		 */
		const append = (rowCount, a, b) => {
			const aColumnCount = a.length / rowCount;
			const bColumnCount = b.length / rowCount;
			const columnCount = aColumnCount + bColumnCount;
	
			const v = new Float64Array(rowCount * columnCount);	
			let column = 0;
			// copy a to new value
			for (let aColumn = 0; aColumn < aColumnCount; aColumn++) {
				for (let row = 0; row < rowCount; row++) {
					v[row * columnCount + column] = a[row * aColumnCount + aColumn];
				}
				column++;
			}
	
			// copy the b values
			for (let bColumn = 0; bColumn < bColumnCount; bColumn++) {
				for (let row = 0; row < rowCount; row++) {
					v[row * columnCount + column] = b[(row % rowCount) * bColumnCount + bColumn];
				}
				column++;
			}
		
			return v;
		}

		const pitch = pitchForAngle(Math.PI * 0.4);
		const roll = rollForAngle(Math.PI * -0.22);
		let transform = matrixMultiply4x4(pitch, roll);
		const translate = new Float64Array(3);
		const labelPos = new Float64Array(3);
		translate[0] = 1.2;
		translate[1] = 0.0;
		translate[2] = 0.0;
		transform = matrixMultiply4x4(transform, translateArray(translate));
		if (rotation != 0.0) {
			translate[0] = 0.5;
			translate[1] = 0.5;
			translate[2] = 0.0;
			transform = matrixMultiply4x4(transform, translateArray(translate));
			transform = matrixMultiply4x4(transform, rollForAngle(rotation));
			translate[0] = -0.5;
			translate[1] = -0.5;
			transform = matrixMultiply4x4(transform, translateArray(translate));
		}
	
		const coords = new Float64Array(9);
		const gridFormat = (key, x1, y1, x2, y2, x3, y3) => {
			return e(
				'path', {
					className: "svg_gridlines",
					key: key,
					fill: "none",
					d: `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}`
				}
			)
		}

		const textFormat = (key, className, x, y, color, anchor, text) => {
			return e(
				'text', {
					className: className,
					key: key,
					x: x,
					y: y,
					stroke: color,
					fill: color,
					textAnchor: anchor
				}, text
			)
		}

		const labelFormat = (key, x, y, color, anchor, text) => {
			return textFormat(key, 'svg_label', x, y, color, anchor, text)
		}
		const titleFormat = (key, x, y, color, anchor, text) => {
			return textFormat(key, 'svg_title', x, y, color, anchor, text)
		}
		const unitFormat = (key, x, y, color, anchor, text) => {
			return textFormat(key, 'svg_unit', x, y, color, anchor, text)
		}
		
		const labelValues = (labelPan, minLabel, maxLabel, nLabels, unit) => {
			const labels = [];
			const labelScale = (minLabel === maxLabel) ? 0.1 : pinchScale / (maxLabel - minLabel);
			const isDate = (unit === 'date' || unit === 'dated' || unit === 'datem');
			for (let i = 0; i < nLabels; i++) {
				const labelValue = i * (maxLabel - minLabel) / pinchScale / (nLabels - 1) + minLabel - labelPan / labelScale;
				if (isDate) {
					const dateValue = convertDateValue(labelValue, unit);
					labels.push(dateValue.toFixed(0).trim().replace(/(\.\d[^0]*)(0+$)/,'$1'));
				}
				else if (labelValue != 0.0 && (Math.abs(labelValue) > 100000000.0 || Math.abs(labelValue) < 0.01)) {
					labels.push(labelValue.toExponential(2));
				}
				else {
					labels.push(labelValue.toFixed(3).trim().replace(/(\.\d[^0]*)(0+$)/,'$1'));
				}
			}
			return labels;
		}
		
		const gridElements = [];

		// x labels and grid
		let gridXElements = [];
		labelPos[0] = 0.3;
		labelPos[1] = -0.5;
		labelPos[2] = -0.05;
		let labelCoords = multiply(transformCoords(transform, labelPos), scale);
		gridXElements.push(titleFormat('xtitle',
			labelCoords[0], // x
			height - labelCoords[1], // y
			lineColor, 'middle', xValue.title
		));

		labelPos[0] = 0.3;
		labelPos[1] = -0.5;
		labelPos[2] = -0.12;
		labelCoords = transformCoords(transform, labelPos);
		labelCoords = multiply(labelCoords, scale);
		gridXElements.push(unitFormat('xunit',
			labelCoords[0], // x
			height - labelCoords[1], // y
			lineColor, 'middle', xValue.unit
		));

		let nLabels = 5;
		const nGrid = 5;
		for (let i = 0; i < nGrid; i++) {
			const x = i / (nGrid - 1);
			coords[0] = x; coords[1] = 0; coords[2] = 0;
			coords[3] = x; coords[4] = 1; coords[5] = 0;
			coords[6] = x; coords[7] = 1; coords[8] = 1;
			
			const transformed = multiply(transformCoords(transform, coords), scale);
			gridXElements.push(gridFormat(
				`gridx${i}`,							// key
				transformed[0],						// x1
				height - transformed[1],	// y1
				transformed[3],						// x2
				height - transformed[4],	// y2
				transformed[6],						// x3
				height - transformed[7],	// y3
			))
		}

		const xLabels = labelValues(pan.x, xValue.minLabel, xValue.maxLabel, nLabels, xValue.unit);
		for (let i = 0; i < nLabels; i++) {
			const xLabel = xLabels[i];
			labelPos[0] = i / (nLabels - 1);
			labelPos[1] = 0.0;
			labelPos[2] = -0.12;
			labelCoords = multiply(transformCoords(transform, labelPos), scale);
			gridXElements.push(labelFormat(`xlabel${i}`,
				labelCoords[0], // x
				height - labelCoords[1], // y
				lineColor, 'middle', xLabel
			));
		}

		// y labels and grid
		let gridYElements = [];
		labelPos[0] = -0.2;
		labelPos[1] = 0.5;
		labelPos[2] = -0.2;
		labelCoords = multiply(transformCoords(transform, labelPos), scale);
		gridYElements.push(titleFormat('ytitle',
			labelCoords[0], // x
			height - labelCoords[1], // y
			lineColor, 'middle', yValue.title
		));

		labelPos[0] = -0.2;
		labelPos[1] = 0.5;
		labelPos[2] = -0.27;
		labelCoords = transformCoords(transform, labelPos);
		labelCoords = multiply(labelCoords, scale);
		gridYElements.push(unitFormat('xunit',
			labelCoords[0], // x
			height - labelCoords[1], // y
			lineColor, 'middle', yValue.unit
		));

		for (let i = 0; i < nGrid; i++) {
			const y = i / (nGrid - 1);
			coords[0] = 0; coords[1] = y; coords[2] = 0;
			coords[3] = 1; coords[4] = y; coords[5] = 0;
			coords[6] = 1; coords[7] = y; coords[8] = 1;
			
			const transformed = multiply(transformCoords(transform, coords), scale);
			gridYElements.push(gridFormat(
				`gridy${i}`,							// key
				transformed[0],						// x1
				height - transformed[1],	// y1
				transformed[3],						// x2
				height - transformed[4],	// y2
				transformed[6],						// x3
				height - transformed[7],	// y3
			))
		}

		const yLabels = labelValues(pan.y, yValue.minLabel, yValue.maxLabel, nLabels, yValue.unit);
		for (let i = 0; i < nLabels; i++) {
			const yLabel = yLabels[i];
			labelPos[0] = -0.05;
			labelPos[1] = i / (nLabels - 1);
			labelPos[2] = -0.05;
			labelCoords = multiply(transformCoords(transform, labelPos), scale);
			gridYElements.push(labelFormat(`ylabel${i}`,
				labelCoords[0], // x
				height - labelCoords[1], // y
				lineColor, 'end', yLabel
			));
		}

		// z labels and grid
		let gridZElements = [];
		labelPos[0] = -.3;
		labelPos[1] = 1.0;
		labelPos[2] = 1.18;//0.4;
		labelCoords = multiply(transformCoords(transform, labelPos), scale);
		gridZElements.push(titleFormat('ztitle',
			labelCoords[0], // x
			height - labelCoords[1], // y
			lineColor, 'start', zValue.title
		));

		labelPos[0] = -0.3;
		labelPos[1] = 1.0;
		labelPos[2] = 1.12;//0.35;
		labelCoords = transformCoords(transform, labelPos);
		labelCoords = multiply(labelCoords, scale);
		gridYElements.push(unitFormat('zunit',
			labelCoords[0], // x
			height - labelCoords[1], // y
			lineColor, 'start', zValue.unit
		));

		for (let i = 0; i < nGrid; i++) {
			const z = i / (nGrid - 1);
			coords[0] = 0; coords[1] = 1; coords[2] = z;
			coords[3] = 1; coords[4] = 1; coords[5] = z;
			coords[6] = 1; coords[7] = 0; coords[8] = z;
			
			const transformed = multiply(transformCoords(transform, coords), scale);
			gridYElements.push(gridFormat(
				`gridz${i}`,							// key
				transformed[0],						// x1
				height - transformed[1],	// y1
				transformed[3],						// x2
				height - transformed[4],	// y2
				transformed[6],						// x3
				height - transformed[7],	// y3
			))
		}

		nLabels = 5;
		const zLabels = labelValues(pan.z, zValue.minLabel, zValue.maxLabel, nLabels, zValue.unit);
		for (let i = 0; i < nLabels; i++) {
			const zLabel = zLabels[i];
			labelPos[0] = -0.02;
			labelPos[1] = 1;
			labelPos[2] = i / (nLabels - 1);
			labelCoords = multiply(transformCoords(transform, labelPos), scale);
			gridZElements.push(labelFormat(`zlabel${i}`,
				labelCoords[0], // x
				height - labelCoords[1], // y
				lineColor, 'end', zLabel
			));
		}

		// add the lines

		const renderLines = (lines, height, lineColor, lineClass, lineType, lineOpacity, output) => {
			const isnormal = (n) => {
				return !isNaN(n) && n !== Infinity && n !== -Infinity;
			}
			const v = lines;
			switch (lineType) {
				case MMGraphLineType.bar:
				case MMGraphLineType.barWithDot:
				case MMGraphLineType.dot: {
					const radius = 3.0;
					const count = lines.length/3;
					for (let row = 0; row < count; row++) {
						const offset = row * 3;
						const x = v[offset];
						const y = v[offset + 1];
						if (isnormal(x) && isnormal(y)) {
							output.push(e(
								'circle', {
									className: lineClass,
									key: `${lineClass}_${row}`,
									stroke: lineColor,
									fill: lineColor,
									opacity: lineOpacity,
									cx: x + radius,
									cy: height - y,
									r: radius
								}
							))
						}
					}
				}
					break;
				
				case MMGraphLineType.hidden:
					break;

				default: {
					const v = lines;
					let x = v[0];
					let y = v[1];
					if (isnormal(x) && isnormal(y)) {
						const count = lines.length/3;
						const path = [`M ${x} ${height - y}`];
						for (let row = 1; row < count; row++) {
							const offset = row * 3;
							x = v[offset];
							y = v[offset + 1];
							if (isnormal(x) && isnormal(y)) {
								path.push(`L ${x} ${height - y}`);
							}
						}
						output.push(e(
							'path', {
								className: lineClass,
								key: lineClass,
								stroke: lineColor,
								opacity: lineOpacity,
								fill: 'none',
								d: path.join(' ')
							}
						))
					}
				}
					break;
			}
		}

		const lineElements = [];
		let colorNumber = 0;						
		for (let xNumber = 0; xNumber < info.xInfo.length; xNumber++) {
			const xValue = info.xInfo[xNumber];
			const lineOpacity = info.xInfo[xAxisIndex] === xValue ? 1 : 0.5;
			if (!xValue.values) { break; }
			let xValues = Float64Array.from(xValue.values);
			const lineClass = `svg_line_${xNumber+1}`;
			lineColor = lineColors[colorNumber++ % nColors];
			const minX = xValue.minValue;
			const maxX = xValue.maxValue;
			const scaleForX = (minX === maxX) ? 0.1 : pinchScale / (maxX - minX);
			const scaledMinX = minX - pan.x / scaleForX;
			xValues = multiply(subtract(xValues, scaledMinX), scaleForX);

			const yValue = xValue.yInfo[0];
			if (!yValue.values) { break; }
			let yValues = Float64Array.from(yValue.values);
			const minY = yValue.minValue;
			const maxY = yValue.maxValue;
			const scaleForY = (minY === maxY) ? 0.1 : pinchScale / (maxY - minY);
			const scaledMinY = minY - pan.y / scaleForY;
			yValues = multiply(subtract(yValues, scaledMinY), scaleForY);

			const zValue = xValue.zInfo;
			if (!zValue.values) { break; }
			let zValues = Float64Array.from(zValue.values);
			const lineType = zValue.lineType;
			const minZ = zValue.minValue;
			const maxZ = zValue.maxValue;
			const scaleForZ = (minZ === maxZ) ? 0.1 : pinchScale / (maxZ - minZ);
			const scaledMinZ = minZ - pan.z / scaleForZ;
			zValues = multiply(subtract(zValues, scaledMinZ), scaleForZ);

			if (zValues.length == xValues.length * yValues.length) {
				// surface plot
				const columnCount = yValues.length;
				const rowCount = xValues.length;
				// x lines
				let zTemp = new Float64Array(columnCount);
				for (let row = 0; row < rowCount; row++) {
					const xConst = new Float64Array(columnCount);						
					const xRow = xValues[row];
					for (let col = 0; col < columnCount; col++) {
						xConst[col] = xRow;
						zTemp[col] = zValues[columnCount*row + col];
					}
					let coords = append(columnCount, xConst, append(columnCount, yValues, zTemp));
					coords = multiply(transformCoords(transform, coords), scale);
					const areaClass = `svg_xarea_${xNumber+1}_${row}`
					renderLines(coords, height, lineColor, areaClass, lineType, lineOpacity, lineElements);			
				}
				
				// y lines
				zTemp = new Float64Array(rowCount);
				for (let col = 0; col < columnCount; col++) {
					const yConst = new Float64Array(rowCount);					
					const yCol = yValues[col];
					for (let row = 0; row < rowCount; row++) {
						yConst[row] = yCol;
						zTemp[row] = zValues[row * columnCount + col];
					}
					let coords = append(rowCount, xValues, append(rowCount, yConst, zTemp));
					coords = multiply(transformCoords(transform, coords), scale);
					const areaClass = `svg_yarea_${xNumber+1}_${col}`
					renderLines(coords, height, lineColor, areaClass, lineType, lineOpacity, lineElements);			
				}				
			}
			else if (xValue.columnCount > 1 && xValue.columnCount === yValue.columnCount && xValue.columnCount === zValue.columnCount) {
				// each column is represented by a separate set of lines
				const  columnCount = xValue.columnCount;
				const rowCount = xValues.length / columnCount;
				let coords = new Float64Array(rowCount * 3);
				for (let column = 0; column < columnCount; column++) {
					for (let row = 0; row < rowCount; row++) {
						coords[row * 3] = xValues[row * columnCount + column];
						coords[row * 3 + 1] = yValues[row * columnCount + column];
						coords[row * 3 + 2] = zValues[row * columnCount + column];
					}
					coords = multiply(transformCoords(transform, coords), scale);
					renderLines(coords, height, lineColor, `svg_column_${column}`, lineType, lineOpacity, lineElements);			
				}
			}
			else if (xValues.length !== yValues.length || yValues.length !== zValues.length) {
				lineElements.push(
					e(
						'text', {
							key: 'axisError',
							x: 30,
							y: 30,
							stroke: 'red',
							fill: 'red',
							fontSize: '20pt',
							textAnchor: 'start'
						}, 'Axis count mismatch'
					)
				)
			}			
			else {
				// line plot
				let rowCount = xValues.length;
				let coords = append(rowCount, append(rowCount, xValues, yValues), zValues);
				coords = multiply(transformCoords(transform,coords), scale);
				renderLines(coords, height, lineColor, lineClass, lineType, lineOpacity, lineElements);			
			}
		}

		elements.push(e('g', {
			className: 'svg_grid',
			key: 'grid',
			stroke: "#b3b3b3",
			fill: "#b3b3b3"
		}, gridElements));

		elements.push(e(
			'g', {
				className: 'svg_lines',
				key: 'lines',
			}, lineElements)
		)

		gridElements.push(e('g', { className: 'svg_gridx', key: 'gridx'}, gridXElements));
		gridElements.push(e('g', { className: 'svg_gridy', key: 'gridy'}, gridYElements));
		gridElements.push(e('g', { className: 'svg_gridz', key: 'gridz'}, gridZElements));

		const svg = e(
			'svg', {
				id: 'graph__svg-plot3d',
				style: {
					height: '100%',
					width: '100%',
				},
				viewBox: viewBox,
				ref: node => this.node = node,
				onPointerDown: this.onPointerDown,
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