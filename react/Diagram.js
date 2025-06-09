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

import { writeClipboard, readClipboard, hasSystemClipboard, ClipboardView } from "./Clipboard.js";

// this works better as a class component as one can then have a ref to it
// and call getModelInfo with the appropriate scaling argument to update it
// on session and model changes

const e = React.createElement;

/**
 * @function snapPosition
 * @param {Object} pos 
 * @returns {Object}
 */
function snapPosition(pos) {
	let newX, newY;
	
	newX = Math.floor((pos.x + 2.5) / 5)*5;
	newY = Math.floor((pos.y + 2.5) / 5)*5;
	return {x: newX, y: newY};
}
	
const objectHeight = 20;
const objectWidth = 60;

/**
 * Enum for diagram drag types.
 * @readonly
 * @enum {string}
 */
const DiagramDragType = Object.freeze({
	pan: 'pan',
	selectionBox: 'sel',
	topLeftSB: 'tlSB',
	bottomRightSB: 'brSB',
	tool: 'tool'
});

/**
 * Enum for context menu display.
 * @readonly
 * @enum {string}
 */
const ContextMenuType = Object.freeze({
	none: 'none',
	background: 'bg',
	tool: 'tool',
	addTool: 'addTool',
	addDisplayTool: 'addDisplay',
	selection: 'sel',
});


/**
 * @class Diagram
 * the main mind map diagram
 */
export class Diagram extends React.Component {
	constructor(props) {
		super(props);

		this.panSum = 0;
		this.eventCache = [];
		this.pinch = 0;
		this.maxIcons = 300;

		const savedState = props.dgmStateStack.pop();
		if (savedState) {
			// if the diagram is being reconstructed after an expand, use the pushed state
			this.state = savedState;
		}
		else {
			// create a default state
			this.state = {
				dragType: null,
				dragSelection: null,
				selectionBox: null,
				translate: {x: 0, y: 0},
				scale: 1.0,
				showContext: null,
				showClipboard: false,				
				toolHover: null,
			}
		}

		this.setDragType = this.setDragType.bind(this);
		this.draggedTo = this.draggedTo.bind(this);
		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onWheel = this.onWheel.bind(this);
	}

	/**
	 * @method getModelInfo
	 * @param {Boolean} rescale
	 */
	getModelInfo(rescale = false) {
		this.props.actions.doCommand('/ dgminfo', (results) => {
			if (results.length && results[0].results) {
				const modelInfo = results[0].results;
				this.setState(() => {
					let newState = {
						path: modelInfo.path,
						tools: modelInfo.tools,
						selectedObject: modelInfo.selectedObject,
					};

					newState.import = modelInfo.import;

					if (rescale) {
						let maxX = -1.e6;
						let maxY = -1.e6;
						let minX = 1.e6;
						let minY = 1.e6;
						let iconCount = 0;
						for (const toolName in modelInfo.tools) {
							if (iconCount++ >= this.maxIcons) {
								break;
							}
							const toolInfo  = modelInfo.tools[toolName];
							const position = toolInfo.position;
							maxX = (position.x > maxX ) ? position.x : maxX;
							maxY = (position.y > maxY ) ? position.y : maxY;
							minX = (position.x > minX ) ? minX : position.x;
							minY = (position.y > minY ) ? minY : position.y;
						}
						if ( maxX != -1.e6 ) { // no objects, don't change
							maxX += 1.5 *objectWidth;
							maxY += 2 * objectHeight;
							
							const box = this.props.diagramBox;
							const widthScale = (box.width -30) / ( maxX - minX );
							const heightScale = (box.height - 40) / ( maxY - minY);
							let scale =  ( widthScale < heightScale ) ? widthScale : heightScale;
							scale = Math.min(3.0, Math.max(0.2, scale));
							newState['scale'] = scale;
							const yOffset = 45; 
							newState['translate'] = {x: -minX + 30.0 / scale, y: -minY + yOffset /scale};
						}
					}
					return newState;
				})
			}
		});
	}

	/**
	 * @method doCommand
	 * @param {String} command
	 * @param {Boolean} rescale - true if diagram should be rescaled
	 * shortcut to props.actions.doCommand with automatic getModelInfo
	 */
	doCommand(command, rescale) {
		this.props.actions.doCommand(command, () => {
			this.getModelInfo(rescale);
		});
	}

	componentDidMount() {
		this.node.addEventListener('wheel', this.onWheel, {passive: false});
		this.getModelInfo(true);
	}

	componentWillUnmount() {
		this.node.removeEventListener('pointermove', this.onPointerMove);
		this.node.removeEventListener('pointerup', this.onPointerUp);
		this.node.removeEventListener('wheel', this.onWheel);
	}

	/**
	 * @method setDragType
	 * @param {DiagramDragType} dragType
	 * @param {Object} lastPointerPosition
	 * @param {Object} options
	 * if type is tool, options should contain tool name
	 */
	setDragType(dragType, lastPointerPosition, options) {
		this.setState((state) => {
			switch (dragType) {
				case DiagramDragType.pan: 
					return {
						dragType: dragType,
						lastPointer: lastPointerPosition,
					}
	
				case DiagramDragType.tool: {
					if (options && options.name) {
						const tool = state.tools[options.name];
						let dragSelection = new Map();
						dragSelection.set(tool.name, tool.position);
						return {
							dragType: dragType,
							lastPointer: lastPointerPosition,
							selectionBox: null,
							dragSelection: dragSelection
						}
					}
				}
				break;

				case DiagramDragType.selectionBox: 
				case DiagramDragType.topLeftSB:
				case DiagramDragType.bottomRightSB: {
					const dragSelection = this.toolsInBox(state.selectionBox, state.tools);
					return {
						dragType: dragType,
						lastPointer: lastPointerPosition,
						dragSelection: dragSelection
					}
				}

				default: {
					switch (state.dragType) {
						case DiagramDragType.tool: {
							let terms = [`${state.path} setpositions`];
							if (state.dragSelection) {
								for (const [name, position] of state.dragSelection) {
									const p = snapPosition(position);
									let oldPosition = this.state.tools[name].position;
									if (p.x !== oldPosition.x || p.y !== oldPosition.y) {
										terms.push(`${name} ${p.x} ${p.y}`);
									}
								}
								if (terms.length > 1) {
									this.doCommand(terms.join(' '));
								}
							}			
							return {
								dragType: null,
								lastPointer: null,
								dragSelection: null
							};
						}
						case DiagramDragType.selectionBox: {
							let terms = [`${state.path} setpositions`];
							if (state.dragSelection) {
								for (const [name, position] of state.dragSelection) {
									const p = snapPosition(position);
									terms.push(`${name} ${p.x} ${p.y}`);
								}
								this.doCommand(terms.join(' '));
							}			
							return {
								dragType: null,
								lastPointer: null
							};
						}
						default: 
							return {
								dragType: null,
								lastPointer: null
							};
					}
				}
			}
		});
	}

	/**
	 * @method draggedTo
	 * @param {Number} x 
	 * @param {Number} y 
	 */
	draggedTo(x, y) {
		this.setState((state) => {
			if (state.dragType == null) {
				return {};
			}
			const dx = x - state.lastPointer.x;
			const dy = y - state.lastPointer.y;
			function updateDragSelection(dragSelection) {
				if (!dragSelection) {
					return null;
				}
				let newSelection = new Map();
				for (const [name, position] of dragSelection) {
					const newPosition = {
						x: position.x + dx/state.scale,
						y: position.y + dy/state.scale
					}
					newSelection.set(name, newPosition);
				}
				return newSelection;
			}

			switch (state.dragType) { 
				case DiagramDragType.pan:
					return {
						translate: {
							x: state.translate.x + dx/state.scale,
							y: state.translate.y + dy/state.scale,
						},
						lastPointer: {x: x, y: y}
					};

				case DiagramDragType.tool: 
					if (state.dragSelection) {
						let dragSelection = updateDragSelection(state.dragSelection);
						const tools = this.updateToolInfoPositions(dragSelection, state);
						return {
							tools: tools,
							lastPointer: {x: x, y: y},
							dragSelection: dragSelection
						}
					}
					break;

				case DiagramDragType.selectionBox: {
					const sb = state.selectionBox;
					const scale = state.scale;
					const dragSelection = updateDragSelection(state.dragSelection);
					const tools = this.updateToolInfoPositions(dragSelection, state);
					return {
						tools: tools,
						dragSelection: dragSelection,
						selectionBox: {
							left: sb.left + dx/scale,
							top: sb.top + dy/scale,
							right: sb.right + dx/scale,
							bottom: sb.bottom + dy/scale
						},
						lastPointer: {x: x, y: y}
					};
				}

				case DiagramDragType.topLeftSB: {
					let sb = state.selectionBox;
					const scale = state.scale;
					sb.left = Math.min(sb.left + dx/scale, sb.right - 60);
					sb.top = Math.min(sb.top + dy/scale, sb.bottom - 40);
					const dragSelection = this.toolsInBox(sb, state.tools);
					return {
						dragSelection: dragSelection,
						selectionBox: sb,
						lastPointer: {x: x, y: y}
					}
				}

				case DiagramDragType.bottomRightSB: {
					let sb = state.selectionBox;
					const scale = state.scale;
					sb.right = Math.max(sb.right + dx/scale, sb.left + 60);
					sb.bottom = Math.max(sb.bottom + dy/scale, sb.top + 40);
					const dragSelection = this.toolsInBox(sb, state.tools);
					return {
						dragSelection: dragSelection,
						selectionBox: sb,
						lastPointer: {x: x, y: y}
					}
				}

				default:
					return {};
			}
		})
	}

	/**
	 * @method toolsInBox
	 * @param {Object} selectionBox
	 * @param {Object} tools - toolInfos
	 * @returns {Map}
	 * returns a drag selection map of all tools found in rectangle
	 * described by top left and bottom positions
	 */
	toolsInBox(selectionBox, tools) {
		function intersectRect(r1, r2) {
			return !(r2.left > r1.right || 
				r2.right < r1.left || 
				r2.top > r1.bottom ||
				r2.bottom < r1.top);
			}

		let dragSelection = new Map();
		for (const toolName in tools) {
			const toolInfo  = tools[toolName];
			const x = toolInfo.position.x;
			const y = toolInfo.position.y;
			const toolRect = {
				left: x,
				top: y,
				right: x + objectWidth,
				bottom: y + objectHeight
			}
			if (intersectRect(selectionBox, toolRect)) {
				dragSelection.set(toolName, {x: x, y: y});
			}
		}
		return dragSelection;
	}

	/**
	 * @method updateToolInfoPositions
	 * @param {Map} positions
	 * @param {Object} state
	 * @returns {Object} new tools object
	 */
	updateToolInfoPositions(positions, state) {
		let tools = Object.assign({}, state.tools);
		if (positions) {
			for (const [name, position] of positions) {
				const toolInfo  = tools[name];
				if (toolInfo) {
					toolInfo.position = position;
				}
			}
		}
		return tools;
	}

	/**
	 * @method createSelectionBox
	 * @param {Number} x 
	 * @param {Number} y 
	 * x, y is top left corner
	 */
	createSelectionBox(x, y) {
		this.setState((state) => {
			const scale = state.scale;
			const topLeft = {
				x: x / scale - state.translate.x,
				y: y / scale - state.translate.y
			};
			const sb = {
				left: topLeft.x,
				top: topLeft.y,
				right: topLeft.x + 150.0/scale,
				bottom: topLeft.y + 80.0/scale
			}

			const dragSelection = this.toolsInBox(sb, state.tools);
			return {
				selectionBox: (state.selectionBox) ? null : sb,
				dragSelection: dragSelection,
				showContext: null
			}
		});
	}

	onPointerDown(e) {
		e.stopPropagation();
		e.preventDefault();
		// console.log(`down ${this.eventCache.length}`);
		this.pointerStartTime = new Date().getTime();
		this.eventCache.push({
			x: e.clientX,
			y: e.clientY,
			id: e.pointerId
		});
		if (this.eventCache.length === 1) {
			this.panSum = 0;
			this.touch0 = {x: e.clientX, y: e.clientY};
			this.setDragType( DiagramDragType.pan, this.touch0);
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
		if ( this.eventCache.length) {
			this.node.addEventListener('pointermove', this.onPointerMove);
			this.node.addEventListener('pointerup', this.onPointerUp);
			e.target.setPointerCapture(e.pointerId);
			// console.log(`capture ${e.pointerId}`);
		}
  }

	onPointerUp(e) {
		// console.log(`up ${this.eventCache.length}`);
		e.stopPropagation();
		e.preventDefault();
		let eCache = this.eventCache;
		if ( eCache.length === 1 && this.pinch === 0) {
			if (this.panSum < 5) {
				const t = new Date().getTime();
				if (t - this.pointerStartTime > 500) {
					this.createSelectionBox(e.clientX, e.clientY);
				}
				else {
					if (this.state.showClipboard) {
						this.setState({showClipboard: false});
					}
					else if (e.clientY - this.props.diagramBox.top > 25) {
						// bring up context menu, but only if click is below title and return text
						this.setState((state) => {
							const scale = state.scale;
							let position = {
								x: state.lastPointer.x / scale - state.translate.x,
								y: state.lastPointer.y / scale - state.translate.y
							};
							position = snapPosition(position);
				
							return {
								selectionBox: null,
								dragSelection: null,
								showContext: (state.showContext === null && !state.selectionBox) ?
									{
										type: ContextMenuType.background,
										info: position,
									}
									:
									null,
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
			// console.log(`release ${e.pointerId}`);
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
			this.draggedTo( e.clientX, e.clientY);
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
				const newScale = Math.min(5.0, Math.max(0.2, state.scale * ratio));
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

	onWheel(e) {
		if (this.state.showClipboard) {
			return;
		}

		e.preventDefault(); // chrome complains and remvoing seems ok
		e.stopPropagation();
		const deltaY = e.deltaY;
		const pageX = e.pageX;
		const pageY = e.pageY;
		this.setState((state) => {
			const rate = Math.sign(deltaY) * Math.min(Math.abs(deltaY), 10*state.scale);
			const newScale = Math.min(5.0, Math.max(0.2, state.scale - rate / 100));
			const newTranslate = {
				x: pageX/newScale - pageX/state.scale + state.translate.x,
				y: pageY/newScale - pageY/state.scale + state.translate.y
			};
			return {
				scale: newScale,
				translate: newTranslate
			}
		})
	}

	render() {
		let t = this.props.t;
		const dgmBox = this.props.diagramBox;
		const viewBox = [dgmBox.left, dgmBox.top, dgmBox.width, dgmBox.height];
		const scale = this.state.scale;
		const tools = this.state.tools;
		const tx = this.state.translate.x;
		const ty = this.state.translate.y;
		let toolList = [];
		let connectList = [];
		let iconCount = 0;
		for (const toolName in tools) {
			if (iconCount++ >= this.maxIcons) {
				break;
			}

			const toolInfo  = tools[toolName];
			let highlight = false;
			if (this.state.dragSelection && this.state.dragSelection.has(toolInfo.name)) {
				highlight = true;
			}

			const setToolHover = (toolName) => {
				this.setState({toolHover: toolName});
			}

			const cmp = e(ToolIcon, {
				t: t,
				key: toolName,
				info: toolInfo,
				highlight: highlight,
				translate: this.state.translate,
				scale: scale,
				setDragType: this.setDragType,
				draggedTo: this.draggedTo,
				pushModel: this.props.actions.pushModel,
				viewTool: this.props.actions.viewTool,
				updateView: this.props.actions.updateView,
				dimmed: this.state.selectedObject && toolName !== this.state.selectedObject,
				setToolHover: setToolHover,
				showContext: (shouldShow) => {
					this.setState({
						showContext: shouldShow,
					});
				}
			});
			toolList.push(cmp);

			const d = toolInfo.position;
			for (const requestorName of toolInfo.requestors) {
				const o = tools[requestorName].position;

				let ox, oy, dx, dy, deltay;
				let cpox, cpoy, cpdx, cpdy;
				let cpx = objectHeight / 2;
				let cpy = cpx;

				if (d.x > o.x + objectWidth) {
					// tool is completely to right of origin
					ox = o.x + objectWidth;
					oy = o.y;
					dx = d.x;
					dy = d.y + cpy;
					if (dy > oy + cpy) {
						oy += objectHeight;
					}

					cpox = ox + cpx;
					cpdx = dx - cpx;
					
					if (oy == dy) {
						cpoy = oy;
						cpdy = dy;
					}
					else if (oy > dy) {
						cpoy = oy - cpy;
						cpdy = dy + cpy;
					}
					else {
						cpoy = oy + cpy;
						cpdy = dy - cpy;
					}
				}
				else if (d.x + objectWidth < o.x) {
					// tool is completely to the left of origin
					ox = o.x;
					oy = o.y;
					dx = d.x + objectWidth;
					dy = d.y + objectHeight/2;
					
					if (dy > oy + cpy) {
						oy += objectHeight;
					}
					
					cpox = ox - cpx;
					cpdx = dx + cpx;
					
					if (oy == dy) {
						cpoy = oy;
						cpdy = dy;
					}
					else if (oy > dy) {
						cpoy = oy - cpy;
						cpdy = dy + cpy;
					}
					else {
						cpoy = oy + cpy;
						cpdy = dy - cpy;
					}
				}
				else if (d.y < o.y) {
					// tool is above origin
					ox = o.x;
					oy = o.y;
					dx = d.x;
					dy = d.y + cpy;
					deltay = (oy - dy);
					
					// switch sides if destination is to left of source
					let correction = 1.0;
					if (dx > ox) {
						ox = o.x + objectWidth;
						dx = d.x + objectWidth;
						correction = -1.0;
					}
					if (deltay < objectHeight) {
						cpx = deltay * 0.8 * correction;
						cpox = ox - cpx;
						cpdx = dx - cpx;
						cpoy = oy;
						cpdy = dy;
					}
					else {
						cpx = deltay * 0.2 * correction;
						cpox = ox - cpx;
						cpdx = dx - cpx;
						cpoy = oy - cpy;
						cpdy = dy + cpy;
					}
				}
				else {
					// assume tool is below origin
					ox = o.x + objectWidth;
					oy = o.y + objectHeight;
					dx = d.x + objectWidth;
					dy = d.y + cpy;
					deltay = (dy - oy);
					
					// switch sides if destination is to right of origin
					let correction = 1.0;
					if (dx > ox) {
						ox = o.x;
						dx = d.x;
						correction = -1.0;
					}

					if (deltay < objectHeight) {
						cpx = deltay * 0.8 * correction;
						cpox = ox + cpx;
						cpdx = dx + cpx;
						cpoy = oy;
						cpdy = dy;
					}
					else {
						cpx = deltay * 0.2 * correction;
						cpox = ox + cpx;
						cpdx = dx + cpx;
						cpoy = oy + cpy;
						cpdy = dy - cpy;
					}
				}
				
				ox = (ox + tx)*scale;
				oy = (oy + ty)*scale;
				cpox = (cpox + tx)*scale;
				cpoy = (cpoy + ty)*scale;
				dx = (dx + tx)*scale;
				dy = (dy + ty)*scale;
				cpdx = (cpdx + tx)*scale;
				cpdy = (cpdy + ty)*scale;
				const key = `${requestorName}->${toolName}`;
				let connectColor = this.state.selectedObject ? 'grey' : 'black';
				let strokeWidth = 1;
				const highlightName = this.state.toolHover || this.state.selectedObject;
				if (highlightName) {
					if (requestorName === highlightName) {
						connectColor = 'blue'
						strokeWidth = 2;
					}
					else if (toolName === highlightName) {
						connectColor = 'green';
						strokeWidth = 2;
					}
				}
				const cmp = e('path', {
					key: key,
					fill: 'transparent',
					stroke: connectColor,
					strokeWidth: strokeWidth,
					d: `M${ox} ${oy} C${cpox} ${cpoy} ${cpdx} ${cpdy} ${dx} ${dy}`
				});
				connectList.push(cmp);
			}
		}

		let selectionBox = null;
		if (this.state.selectionBox) {
			selectionBox = e(SelectionBox, {
				rect: this.state.selectionBox,
				setDragType: this.setDragType,
				draggedTo: this.draggedTo,
				updateView: this.props.actions.updateView,
				translate: this.state.translate,
				scale: scale,
				showContext: (shouldShow) => {
					this.setState({
						showContext: shouldShow,
					});
				}
			})
		}

		let textList = [];
		const toolCount = tools ? Object.keys(tools).length : 0;
		if (toolCount > this.maxIcons) {
			textList.push(
				e(
					'text', {
						className: 'diagram__maxicons_warning',
						key: 'maxicons',
						x: (this.props.diagramBox.width - (this.props.isTwoPane ? 180 : 130))/2,
						y: 40,
					},
					this.props.t('react:dgmMaxIconsWarnign', {max: this.maxIcons, count: toolCount})
				)
			)
		}
		if (this.state.path) {
			const pathParts = this.state.path.split('.');
			const nameHeaderX = (this.props.diagramBox.width - (this.props.isTwoPane ? 180 : 130))/2;
			if (pathParts.length > 2) {
				const maxCharacters = nameHeaderX / 12 - 3.;
				textList.push(
					e(ClickableDiagramText, {
						key: 'parent',
						x: 15,
						y: 25,
						text:`< ${pathParts[pathParts.length-2].substring(0, maxCharacters)}`,
						textClick: () => {
							this.props.actions.popModel();
							this.setState({selectionBox: null});
						}
					})
				)
			}
			textList.push(
				e(ClickableDiagramText, {
					key: 'name',
					x: (this.props.diagramBox.width - (this.props.isTwoPane ? 180 : 130))/2,
					y: 25,
					text: pathParts[pathParts.length-1] + ' ⌂',
					textClick: () => {this.getModelInfo(true);}
				})
			);
			const boxWidth = this.props.diagramBox.width;
			const boxHeight = this.props.diagramBox.height;
			textList.push(
				e(ClickableDiagramText, {
					key: 'zoomin',
					x: boxWidth - (this.props.isTwoPane ? 130 : 80),
					y: 30,
					text: '+',
					size: 30,
					textClick: () => {
						this.setState((state) => {
							const newScale = Math.max(0.1, state.scale * 1.2);
							const clientX = boxWidth/2;
							const clientY = boxHeight/2;
							const newTranslate = {
								x: clientX/newScale - clientX/state.scale + state.translate.x,
								y: clientY/newScale - clientY/state.scale + state.translate.y
							}
						
							return {
								scale: newScale,
								translate: newTranslate,
							}
						})
					}
				})
			)
			textList.push(
				e(ClickableDiagramText, {
					key: 'zoomout',
					x: boxWidth - (this.props.isTwoPane ? 80 : 30),
					y: 35,
					text: '-',
					size: 50,
					textClick: () => {
						this.setState((state) => {
							const newScale = Math.max(0.1, state.scale / 1.2);
							const clientX = boxWidth/2;
							const clientY = boxHeight/2;
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
				})
			);
			if (this.props.isTwoPane) {
				textList.push(
					e(Divider, {
						key: 'divider',
						x: boxWidth - 30,
						y: 30,
						setRightPaneWidth: this.props.setRightPaneWidth,
						rightPaneWidth: this.props.rightPaneWidth,
						diagramWidth: this.props.diagramBox.width,
					})
				);
			}
			if (this.state.import != null) {
				textList.push(
					e(
						'text', {
							className: 'diagram__import-warning',
							key: 'import1',
							x: 20,
							y: this.props.diagramBox.height - 50,
						},
						this.props.t('react:dgmImportWarning1', {source: this.state.import})
					),
					e(
						'text', {
							className: 'diagram__import-warning',
							key: 'import2',
							x: 20,
							y: this.props.diagramBox.height - 25,
						},
						this.props.t('react:dgmImportWarning2', {source: this.state.import})
					)
				);
			}	
		}

		let contextMenu;
		if (this.state.showContext) {
			const addTool = (type) => {
				const position = this.state.showContext.info;
				this.props.actions.doCommand(`${this.state.path} addtool ${type} ${position.x} ${position.y}`, (results) => {
					this.setState({showContext: null});
					const toolName = results[0].results;
					if (type === 'Import') {
						type = 'Model';
					}
					if (type === 'Model') {
						this.props.actions.pushModel(toolName);
					}
					else {
						this.props.actions.viewTool(toolName, type);
					}
				})
				this.setState({showContext: null});
			}

			switch (this.state.showContext.type) {
				case ContextMenuType.background: {
					const menu = [
						{
							text: this.props.t('react:dgmButtonMenuClose'),
							action: () => {
								this.setState({
									showContext: null
								})
							}
						},
						{
							text: this.props.t('react:dgmButtonAddExpr'),
							action: () => {
								addTool('Expression');
							}
						},
						{
							text: this.props.t('react:dgmButtonAddModel'),
							action: () => {
								addTool('Model');
							}
						},
						{
							text: this.props.t('react:dgmButtonAddTool'),
							action: () => {
								this.setState({
									showContext: {
										type: ContextMenuType.addTool,
										info: this.state.showContext.info,
									}
								})
							}
						},
						{
							text: this.props.t('react:dgmButtonAddDisplay'),
							action: () => {
								this.setState({
									showContext: {
										type: ContextMenuType.addDisplayTool,
										info: this.state.showContext.info,
									}
								})
							}
						},
						{
							text: this.props.t('react:dgmButtonPaste'),
							action: () => {
								readClipboard().then(clipText => {
									const position = this.state.showContext.info;
									this.props.actions.doCommand(`${this.state.path} paste ${position.x} ${position.y} ${clipText}`, () => {
										this.setState({showContext: null});
										this.props.actions.updateView();
									});
								});
							}
						},
						{
							text: this.props.t('react:dgmButtonHelp'),
							action: () => {
								window.open(`./help/helppage.html`,'MM Help');
								this.setState({showContext: null});
								this.props.actions.updateView();
					}
						}
					];

					if (!hasSystemClipboard()) {
						menu.push({
							text: this.props.t('react:dgmButtonClipboard'),
							action: () => {
								// this.props.actions.pushView('clipboard', 'react:clipboardTitle');
								this.setState({showContext: null, showClipboard: true});
							}
						});
					}

					contextMenu = e(
						ContextMenu, {
							key: 'context',
							t: t,
							menu: menu,
						}
					)
				}
					break;
				case ContextMenuType.tool: {
					const deleteTool = (info) => {
						if (info.name === this.state.selectedObject) {
							this.props.actions.viewTool();  // empty parameters clears infostack
						}
						this.props.actions.doCommand(`${this.state.path} removetool ${info.name}`, () => {
							this.setState({showContext: null});
							this.props.actions.updateView();
						});
					}

					const toolsWithTable = new Set(['Expression','Matrix','DataTable','Graph','Iterator','Ode']);
					const menuEntries = [
						{
							text: this.props.t('react:dgmButtonDelete'),
							info: this.state.showContext.info,
							action: deleteTool,
						},
						{
							text: this.props.t('react:dgmButtonCopy'),
							info: this.state.showContext.info,
							action: (info) => {
								this.props.actions.doCommand(`${this.state.path} copytool ${info.name}`, (results) => {
									if (!results.error) {
										writeClipboard(results[0].results);
									}
									this.setState({showContext: null});
								});
							}
						},
						{
							text: this.props.t('react:dgmButtonCut'),
							info: this.state.showContext.info,
							action: (info) => {
								this.props.actions.doCommand(`${this.state.path} copytool  ${info.name}`, (results) => {
									if (!results.error) {
										writeClipboard(results[0].results).then(() => {
											deleteTool(info);
										});
									}
								});
							}
						},
					];
					if (toolsWithTable.has(this.state.showContext.info.toolTypeName)) {
						menuEntries.push({
							text: this.props.t('react:dgmButtonCopyTable'),
							info: this.state.showContext.info,
							action: (info) => {
								this.props.actions.doCommand(`${this.state.path} copyastable ${info.name}`, (results) => {
									if (!results.error) {
										writeClipboard(results[0].results);
									}
									this.setState({showContext: null});
								});
							}
						});
					}
					if (this.state.showContext.info.notes) {
						menuEntries.push({
							text: this.props.t('react:dgmShowNotes'),
							info: this.state.showContext.info,
							action: (info) => {
								this.setState({showContext: null});
								alert(info.notes);
							}
						})
					}
					
					contextMenu = e(
						ContextMenu, {
							key: 'context',
							t: t,
							menu: menuEntries
						}
					)
				}
					break;

				case ContextMenuType.addTool: {
					contextMenu = e(
						ContextMenu, {
							key: 'add',
							t: t,
							menu: [
								{
									text: this.props.t('react:dgmButtonMenuBack'),
									action: () => {
										this.setState({
											showContext: {
												type: ContextMenuType.background,
												info: this.state.showContext.info,
											}
										})
									}
								},
								{
									text: this.props.t('mmcmd:dataTableDisplayName'),
									action: () => {
										addTool('DataTable');
									}
								},
								{
									text: this.props.t('mmcmd:matrixDisplayName'),
									action: () => {
										addTool('Matrix');
									}
								},
								{
									text: this.props.t('mmcmd:solverDisplayName'),
									action: () => {
										addTool('Solver');
									}
								},
								{
									text: this.props.t('mmcmd:odeDisplayName'),
									action: () => {
										addTool('Ode');
									}
								},
								{
									text: this.props.t('mmcmd:iterDisplayName'),
									action: () => {
										addTool('Iterator');
									}
								},
								{
									text: this.props.t('mmcmd:optDisplayName'),
									action: () => {
										addTool('Optimizer');
									}
								},
								{
									text: this.props.t('mmcmd:modelImportDisplayName'),
									action: () => {
										addTool('Import');
									}
								},
							]
						}
					)
				}
					break;
				
					case ContextMenuType.addDisplayTool: {
						contextMenu = e(
							ContextMenu, {
								key: 'adddisplay',
								t: t,
								menu: [
									{
										text: this.props.t('react:dgmButtonMenuBack'),
										action: () => {
											this.setState({
												showContext: {
													type: ContextMenuType.background,
													info: this.state.showContext.info,
												}
											})
										}
									},
									{
										text: this.props.t('mmcmd:graphDisplayName'),
										action: () => {
											addTool('Graph');
										}
									},
									{
										text: this.props.t('mmcmd:htmlPageDisplayName'),
										action: () => {
											addTool('HtmlPage');
										}
									},
									{
										text: this.props.t('mmcmd:buttonDisplayName'),
										action: () => {
											addTool('Button');
										}
									},
									{
										text: this.props.t('mmcmd:menuDisplayName'),
										action: () => {
											addTool('Menu');
										}
									},
								]
							}
						)
					}
						break;

					case ContextMenuType.selection: {
					const copyTools = (deleteAfterCopy) => {
						const sel = this.toolsInBox(this.state.selectionBox, this.state.tools);
						const names = [];
						for (let name of sel.keys()) {
							names.push(name);
						}
						this.props.actions.doCommand(`${this.state.path} copytool ${names.join(' ')}`, (results) => {
							if (!results.error) {
								writeClipboard(results[0].results);
								if (deleteAfterCopy) {
									deleteTools();
								}
							}
							this.setState({
								showContext: null,
								selectionBox: null,
							});
						});
					}
					const deleteTools = () => {
						const sel = this.toolsInBox(this.state.selectionBox, this.state.tools);
						const names = [];
						for (let name of sel.keys()) {
							names.push(name);
							if (name === this.state.selectedObject) {
								this.props.actions.viewTool();  // empty parameters clears infostack
							}
						}

						this.props.actions.doCommand(`${this.state.path} removetool ${names.join(' ')}`, () => {
							this.setState({
								showContext: null,
								selectionBox: null,
							});
							this.props.actions.updateView();
						});
					}

					contextMenu = e(
						ContextMenu, {
							key: 'sel',
							t: t,
							menu: [
								{
									text: this.props.t('react:dgmButtonMenuClose'),
									action: () => {
										this.setState({
											showContext: null
										})
									}
								},
								{
									text: this.props.t('react:dgmButtonDeleteSel'),
									action: deleteTools
								},
								{
									text: this.props.t('react:dgmButtonCopySel'),
									action: copyTools
								},
								{
									text: this.props.t('react:dgmButtonCutSel'),
									action: () => {
										copyTools(true);
									}
								}
							],
						}
					)
				}
					break;
			}
		}
		let clipboardComponent;
		if (this.state.showClipboard) {
			clipboardComponent = e(
				ClipboardView, {
					t: t,
					close: () => {
						this.setState({showClipboard: false});
					}
				}
			)
		}
		return e(
			'div', {
				id: 'diagram__wrapper',
				ref: node => this.node = node,
				onContextMenu: event => event.preventDefault(),
				style: {
					height: dgmBox.height,
					width: dgmBox.width,
				},
			},
			e(
				'svg', {
					id: 'diagram__svg',
					style: {
						height: '100%',
						width: '100%',
					},
					viewBox: viewBox,
					onPointerDown: this.onPointerDown,
					// tried below to try and prevent touch move disabling pointer events on iPad - no joy
					// onTouchStart: e => {
					// 	e.preventDefault();
					// 	e.stopPropagation();
					// },
				},
				toolList,
				connectList,
				selectionBox,
				contextMenu,
				textList,
			),
			clipboardComponent,
		);
	}
}

/**
 * @class ToolIcon
 * the main mind map diagram
 */
class ToolIcon extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			dragging: null,
			position: this.props.info.position,
		};

		this.panSum = 0;
		this.eventCache = [];

		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onPointerEnter = this.onPointerEnter.bind(this);
		this.onPointerLeave = this.onPointerLeave.bind(this);
	}

	componentWillUnmount() {
		this.node.removeEventListener('pointermove', this.onPointerMove);
		this.node.removeEventListener('pointerup', this.onPointerUp);
	}

	onPointerDown(e) {
    e.stopPropagation();
    e.preventDefault();
		this.eventCache.push({
			x: e.clientX,
			y: e.clientY,
			id: e.pointerId
		});
		this.pointerStartTime = new Date().getTime();

		if (this.eventCache.length == 1) {
			this.panSum = 0;
			this.props.setDragType( DiagramDragType.tool,
				{x: e.clientX, y: e.clientY }, 
				{name: this.props.info.name}
			);
			e.target.addEventListener('pointerup', this.onPointerUp);
			e.target.addEventListener('pointermove', this.onPointerMove)
			e.target.setPointerCapture(e.pointerId);
			this.setState({dragging: true});
		}
  }

	onPointerUp(e) {
		let eCache = this.eventCache;
		e.stopPropagation();
		e.preventDefault();
		if ( eCache.length === 1) {
			if (this.panSum < 5) {
				const t = new Date().getTime();
				if (t - this.pointerStartTime > 500) {
					this.props.showContext({
						type: ContextMenuType.tool,
						info: this.props.info,
					});
				}
				else {
					this.props.showContext(null);
					if (this.props.info.toolTypeName === "Model") {
						this.props.pushModel(this.props.info.name);
					}
					else {
						this.props.viewTool(this.props.info.name, this.props.info.toolTypeName);
					}
				}
			}
		}
		this.setState({ dragging: false });
		this.props.setDragType(null, null, {name: this.props.info.name});	
		if (this.panSum >= 5) {
			this.props.updateView();  // to update model view input and output positions after tools dragged
		}
	
		for (var i = 0; i < eCache.length; i++) {
			if (eCache[i].id == e.pointerId) {
				eCache.splice(i, 1);
				break;
			}
		}

		if (eCache.length === 0) {
			this.panSum = 0;
			e.target.releasePointerCapture(e.pointerId);
			e.target.removeEventListener('pointermove', this.onPointerMove);
			e.target.removeEventListener('pointerup', this.onPointerUp);
		}

	}
	
  onPointerMove(e) {
		e.stopPropagation();
		e.preventDefault();
		if (!this.state.dragging) return

		let eCache = this.eventCache;
		if (eCache.length == 1) {
			// panning
			let deltaX = e.clientX - eCache[0].x;
			let deltaY = e.clientY - eCache[0].y;
			this.panSum += Math.abs(deltaX) + Math.abs(deltaY);
			this.props.draggedTo( e.clientX, e.clientY);
		}
	}

	onPointerEnter(e) {
		console.log('onPointerEnter');
		this.props.setToolHover(this.props.info.name);
	}
	
	onPointerLeave(e) {
		console.log('onPointerLeave');
		this.props.setToolHover(null);
	}

	render() {
		let t = this.props.t;
		const info = this.props.info;
		const x = info.position.x;
		const y = info.position.y;

		const translate = this.props.translate;
		const scale = this.props.scale;
		const textColor = this.props.highlight ? 'blue' : 'black';
		const toolTypeColor = this.props.highlight ? textColor : 'rgb(0,102,0)';
		const toolColors = {
			Expression: 'rgba(247,247,230,.8)',
			Model: 'rgba(230,255,255,.8)',
			Matrix: 'rgba(223,233,223,.8)',
			DataTable: 'rgba(231,235,231,.8)',
			Solver: 'rgba(225,237,250,.8)',
			Ode: 'rgba(216,221,250,.8)',
			Iterator: 'rgba(255,232,217,.8)',
			Optimizer: 'rgba(237,212,217,.8)',
			Graph: 'rgba(224,247,247,.8)',
			HtmlPage: 'rgba(217,204,230,.8)',
			Button: 'rgba(239,239,255,.8)',
			Menu: 'rgba(255, 255, 255, .8)'
		}
		const fillColor = toolColors[info.toolTypeName]
		let textComponents;
		if (info.toolTypeName === 'Expression') {
			const resultColor = info.resultType ? {
				n: textColor,
				s: 'green',
				t: 'blue'
			}[info.resultType]
				: textColor;
			textComponents = e(
				'svg', {
					className: 'diagram__text-components',
					x: (x + translate.x)*scale,
					y: (y + translate.y)*scale,
					width: objectWidth*scale,
					height: objectHeight*scale,
					opacity: this.props.dimmed ? 0.5 : 1.0,
				},
				e(
					'text', {
						className: 'diagram__tool-name',
						x: 3*scale,
						y: 7*scale,
						style: {
							fontSize: `${6*scale}px`,
							fontFamily: 'Helvetica',
							fontWeight: '100',
							fill: textColor,
							stroke: textColor
						}
					}, info.name
				),
				e(
					'text', {
						className: 'diagram__tool-formula',
						x: 3*scale,
						y: 12.5*scale,
						style: {
							fontSize: `${5*scale}px`,
							fontFamily: 'Helvetica',
							fontWeight: '100',
							fill: textColor,
							stroke: textColor
						}
					}, info.formula ? info.formula.substring(0,30) : ''
				),
				e(
					'text', {
						className: 'diagram__tool-result',
						x: 3*scale,
						y: 18*scale,
						style: {
							fontSize: `${5*scale}px`,
							fontFamily: 'Helvetica',
							fontWeight: '100',
							fill: (info.result) ? resultColor : 'red',
							stroke: (info.result) ? resultColor : 'red',
						}
					}, info.result ? (
						info.result.substring(0,30)
					) :	'?'
				),
			);
		}
		else {
			const typeName = info.import != null ? 'Imported' : info.toolTypeName;
			textComponents = e(
				'svg', {
					className: 'diagram__text-components',
					x: (x + translate.x)*scale,
					y: (y + translate.y)*scale,
					width: objectWidth*scale,
					height: objectHeight*scale,
					opacity: this.props.dimmed ? 0.5 : 1.0,
				},
				e(
					'text', {
						//className: 'dgm-tooltype',
						x: 3*scale,
						y: 8*scale,
						style: {
							fontSize: `${9*scale}px`,
							fontStyle: 'italic',
							fontFamily: 'Helvetica',
							fontWeight: '100',
							fill: toolTypeColor,
							stroke: toolTypeColor
						}
					},
					typeName + ':'
				),
				e(
					'text', {
						x: 3*scale,
						y: 16*scale,
						style: {
							fontSize: `${7*scale}px`,
							fontFamily: 'Helvetica',
							fontWeight: '100',
							fill: textColor,
							stroke: textColor
						}
					},
					info.name
				),
			);
		}

		let notesLineComponents = [];
		let notesComponent;
		if (info.notes && info.notes.length) {
			if (info.diagramNotes) {
				const lines = info.notes.split('\n');
				let maxLineChars = 30;
				let wrappedLines = [];
				for (let line of lines) {
					let words = line.split(' ');
					let wrappedLineWords = [];
					let wrappedLineLength = 0;
					for (let word of words) {
						if (wrappedLineLength && wrappedLineLength + word.length >= maxLineChars) {
							wrappedLines.push(wrappedLineWords.join(' '));
							wrappedLineWords = [];
							wrappedLineLength = 0;
						}
						if (word.length > maxLineChars) {
							wrappedLines.push(word.substring(0, maxLineChars));
							wrappedLineWords = [];
							wrappedLineLength = 0;
						}
						else {
							wrappedLineWords.push(word);
							wrappedLineLength += word.length + 1;	
						}
					}
					if (wrappedLineWords.length) {
						wrappedLines.push(wrappedLineWords.join(' '));
					}
				}
				let lineNumber = 0;
				for (let wrappedLine of wrappedLines) {
					const lineComponent = e(
						'tspan', {
							key: lineNumber,
							x: (x - 5 + translate.x)*scale,
							y: (y + objectHeight + 6 + lineNumber++ * 6 + translate.y)*scale,
						},
						wrappedLine
					);
					notesLineComponents.push(lineComponent);
					if (lineNumber > 32) {
						if (wrappedLine.length) {
							notesLineComponents.push(
								e(
									'tspan', {
										key: lineNumber,
										x: (x - 6 + translate.x)*scale,
										dy: 5 * scale,
									},
									'...'
								)
							);
						}
						break;
					}
				}
			}
			else {
				notesLineComponents.push(
					e(
						'tspan', {
							key: 0,
							x: (x + 25 + translate.x)*scale,
							y: (y + objectHeight + 6 + translate.y)*scale,
						},
						t('react:dgmToolHasNote')
					)
				);
			}
		notesComponent = e(
				'text', {
					style: {
						fontSize: `${5*scale}px`,
						fontFamily: 'Helvetica',
						fontWeight: '100',
						fill: textColor,
						stroke: textColor
					},
				},
				notesLineComponents
			);
		}

		return e(
			'g', {
				className: 'diagram__toolicon',
				style: {
					stroke: textColor,
					fill: fillColor
				},
				ref: node => this.node = node,
			},
			e(
				'rect', {
					onPointerDown: this.onPointerDown,
					onPointerEnter: this.onPointerEnter,
					onPointerLeave: this.onPointerLeave,
					x: (x + translate.x)*scale,
					y: (y + translate.y)*scale,
					width: objectWidth*scale,
					height: objectHeight*scale
				},
			),				
			textComponents,
			notesComponent,
			info.notes ? e(
				'rect', {
					x: (x + translate.x)*scale,
					y: (y + translate.y + objectHeight)*scale,
					width: objectWidth*scale,
					height: 0.4* objectHeight*scale,
					style: {
						stroke: "transparent",
						fill: "transparent"
					},
					onPointerDown: (e) => {
						e.stopPropagation();
						e.preventDefault();
						alert(info.notes);
					}
				}
			) : null,
		);
	}
}

/**
 * @class SelectionBox
 * the main mind map diagram
 */
class SelectionBox extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			dragging: null,
		};

		this.panSum = 0;
		this.eventCache = [];

		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
	}

	componentWillUnmount() {
		document.removeEventListener('pointermove', this.onPointerMove);
		document.removeEventListener('pointerup', this.onPointerUp);
	}

	/**
	 * @method determineDragType
	 * @param {Number} clientX 
	 * @param {Number} clientY
	 * @returns {DiagramDragType}
	 */
	determineDragType(clientX, clientY, corner) {
		const scale = this.props.scale;
		corner /= scale;
		const x = clientX/scale - this.props.translate.x;
		const y = clientY/scale - this.props.translate.y;
		const box = this.props.rect;
		let dragType;
		if (x >= box.left && x <= box.left + corner && y >= box.top && y <= box.top + corner) {
			dragType = DiagramDragType.topLeftSB
		}
		else if (x <= box.right && x >= box.right - corner && y <= box.bottom && y >= box.bottom - corner) {
			dragType = DiagramDragType.bottomRightSB;
		}
		else {
			dragType = DiagramDragType.selectionBox;
		}
		return dragType
	}

	onPointerDown(e) {
    e.stopPropagation();
		e.preventDefault();
		this.eventCache.push({
			x: e.clientX,
			y: e.clientY,
			id: e.pointerId
		});
		this.pointerStartTime = new Date().getTime();

		if (this.eventCache.length == 1) {
			this.panSum = 0;
			this.props.setDragType( DiagramDragType.tool, {x: e.clientX, y: e.clientY });
			e.target.addEventListener('pointerup', this.onPointerUp);
			e.target.addEventListener('pointermove', this.onPointerMove)
			e.target.setPointerCapture(e.pointerId);
			this.setState({dragging: true});
			const dragType = this.determineDragType(e.clientX, e.clientY, 30);
			this.props.setDragType(dragType, {x: e.clientX, y: e.clientY});
		}
  }

	onPointerUp(e) {
    e.stopPropagation();
		e.preventDefault();
		if (this.panSum < 5) {
			this.props.showContext({
				type: ContextMenuType.selection,
				info: this.props.info,
			});
		}
		else {
			this.setState({ dragging: false });
			this.props.setDragType(null);
			this.props.updateView();   // to update model view input and output positions after tools dragged
		}

		let eCache = this.eventCache;
		for (var i = 0; i < eCache.length; i++) {
			if (eCache[i].id == e.pointerId) {
				eCache.splice(i, 1);
				break;
			}
		}

		if (eCache.length === 0) {
			this.panSum = 0;
			e.target.releasePointerCapture(e.pointerId);
			e.target.removeEventListener('pointermove', this.onPointerMove);
			e.target.removeEventListener('pointerup', this.onPointerUp);
		}
	}
	
  onPointerMove(e) {
		this.panSum += Math.abs(e.movementX) + Math.abs(e.movementY);
		this.props.draggedTo(e.clientX, e.clientY);
    e.stopPropagation()
    e.preventDefault()
	}

	render() {
		// let t = this.props.t;
		const box = this.props.rect;
		const scale = this.props.scale;
		const x = (box.left + this.props.translate.x) * scale;
		const y = (box.top + this.props.translate.y) * scale;
		const width = (box.right - box.left) * scale;
		const height = (box.bottom - box.top) * scale;

		return e('g', {
			style: {
				stroke: 'blue',
				fill: 'transparent'
			},
		},
			e('rect', {
				onPointerDown: this.onPointerDown,
				onClick: this.onClick,
				x: x,
				y: y,
				width: width,
				height: height
			}),
			e('line', {
				x1: x + 8,
				x2: x,
				y1: y,
				y2: y + 8
			}),
			e('line', {
				x1: x + width - 8,
				x2: x + width,
				y1: y + height,
				y2: y + height - 8
			}),
		);
	}
}

/**
 * @class ClickableDiagramText
 * the main mind map diagram
 */
class ClickableDiagramText extends React.Component {
	constructor(props) {
		super(props);
		// this.onClick = this.onClick.bind(this);
		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.onPointerLeave = this.onPointerLeave.bind(this);
		this.pointerDown = false;
		this.size = props.size || 20;
	}

	onPointerDown(e) {
		this.pointerDown = true;
		e.stopPropagation();
		e.preventDefault();
	}

	onPointerLeave(e) {
		this.pointerDown = false;
		e.stopPropagation();
		e.preventDefault();
	}

	onPointerUp(e) {
	// only left Pointer button
		if (!this.pointerDown) { 
			return;
		}
		this.pointerDown = false;
		this.props.textClick(e);
    e.stopPropagation()
    e.preventDefault()
	}


	render() {
		return e('text', {
			id: this.props.id,
			className: 'diagram__clickable-text',
			style: {
				pointerEvents: 'auto',
				cursor: 'pointer',
				fill: 'blue',
				font: `${this.size}px sans-serif`,
			},
			x: this.props.x,
			y: this.props.y,
			// onClick: this.onClick,
			onPointerDown: this.onPointerDown,
			onPointerUp: this.onPointerUp,
			onPointerLeave: this.onPointerLeave,
			}, this.props.text);
	}
}

class Divider extends React.Component {
	constructor(props) {
		super(props);
		// this.onClick = this.onClick.bind(this);
		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
	}

	onPointerDown(e) {
		e.stopPropagation();
		e.preventDefault();					
		this.dividerPointer = e.clientX;
		e.target.setPointerCapture(e.pointerId);
	}

	onPointerMove(e) {
		if (this.dividerPointer) {
			e.stopPropagation();
			e.preventDefault();
			const change = this.dividerPointer - e.clientX;
			const newX = this.props.rightPaneWidth + change;
			const newDiagramWidth = this.props.diagramWidth - change;
			if (newX < 320) {
				this.props.setRightPaneWidth(320);
				this.dividerPointer = e.clientX;
			}
			else if (newX > 320 && newDiagramWidth > 50) {
				this.props.setRightPaneWidth(newX);
				this.dividerPointer = e.clientX;
			}
		}		
	}

	onPointerUp(e) {
		e.stopPropagation();
		e.preventDefault();					
		e.target.releasePointerCapture(e.pointerId);
		this.dividerPointer = null;
	}


	render() {
		return e('text', {
			id: this.props.id,
			className: 'diagram__divider-icon',
			style: {
				pointerEvents: 'auto',
				fill: 'blue',
				font: '30px sans-serif',
				cursor: 'col-resize'
			},
			x: this.props.x,
			y: this.props.y,
			// onClick: this.onClick,
			onPointerDown: this.onPointerDown,
			onPointerUp: this.onPointerUp,
			onPointerMove: this.onPointerMove,
		}, '⇔');
	}
}

class ContextMenu extends React.Component {
	constructor(props) {
		super(props);
		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.config = {
			offset: {
				x: 20,
				y: 30,
			},
			size: {
				height: 500,
				width: 250,
			},
			itemHeight: 30,
		}
	}

	componentWillUnmount() {
		// this.node.removeEventListener('pointermove', this.onPointerMove);
		this.node.removeEventListener('pointerup', this.onPointerUp);
	}

	onPointerDown(e) {
    e.stopPropagation();
    e.preventDefault();
		e.target.addEventListener('pointerup', this.onPointerUp);
		this.lineNumberDown = Math.floor((e.clientY - this.config.offset.y - 10) / this.config.itemHeight);
	}

	onPointerUp(e) {
		e.stopPropagation();
		e.preventDefault();
		e.target.removeEventListener('pointerup', this.onPointerUp);
		const lineNumber = this.lineNumberDown;
		if (lineNumber >= 0 && lineNumber < this.props.menu.length) {
			const menuItem = this.props.menu[lineNumber];
			menuItem.action(menuItem.info);
		}
	}	

	render() {
		const menu = this.props.menu;
		const items = [];
		let lineNumber = 0;
		for (let item of menu) {
			const cmp = e(
				'text', {
					key: lineNumber,
					className: 'diagram__context-menu-text',
					x: 20 + this.config.offset.x,
					y: this.config.offset.y + (lineNumber + 1) * this.config.itemHeight,
				},
				item.text
			)
			items.push(cmp);
			lineNumber++;
		}
		const height = Math.min(this.config.size.height, this.config.itemHeight * menu.length + 10);
		return e(
			'g', {
				id: 'diagram__context-menu',
				ref: node => this.node = node,
			},
			e(
				'rect', {
					id: 'diagram__context-menu-rect',
					onPointerDown: this.onPointerDown,
					// onClick: this.onClick,
					x: this.config.offset.x,
					y: this.config.offset.y,
					width: this.config.size.width,
					height: height,
				}
			),
			items,
		);
	}
}
