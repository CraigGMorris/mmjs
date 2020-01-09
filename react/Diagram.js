'use strict';

const e = React.createElement;

	/**
	 * @function snapPosition
	 * @param {Object} pos 
	 * @returns {Object}
	 */
	function snapPosition(pos) {
		let newX, newY;
		
		if (pos.x > 0) {
			newX = Math.floor((pos.x + 2.5) / 5);
		}
		else {
			newX = Math.floor((pos.x - 2.5) / 5);
		}
		newX *= 5;
		
		if (pos.y > 0) {
			newY = Math.floor((pos.y + 2) / 5);
		}
		else {
			newY = Math.floor((pos.y - 2) / 5);
		}
		newY *= 5;
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
 * @class Diagram
 * the main mind map diagram
 */
export class Diagram extends React.Component {
	constructor(props) {
		super(props);

		this.panSum = 0;
		this.eventCache = [];
		this.pinch = 0;

		this.setDragType = this.setDragType.bind(this);
		this.draggedTo = this.draggedTo.bind(this);
		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onWheel = this.onWheel.bind(this);

		this.getModelInfo();
	}

	/**
	 * @method getModelInfo
	 * @param {Boolean} rescale
	 */
	getModelInfo(rescale = false) {
		this.props.actions.doCommand('/ dgminfo', (results) => {
			if (results.length && results[0].results) {
				const modelInfo = results[0].results;
				this.props.setDgmState((state) => {
					let newState = {
						path: modelInfo.path,
						tools: modelInfo.tools
					};

					if (rescale) {
						let maxX = -1.e6;
						let maxY = -1.e6;
						let minX = 1.e6;
						let minY = 1.e6;
						for (const toolName in modelInfo.tools) {
							const toolInfo  = modelInfo.tools[toolName];
							const position = toolInfo.position;
							maxX = (position.x > maxX ) ? position.x : maxX;
							maxY = (position.y > maxY ) ? position.y : maxY;
							minX = (position.x > minX ) ? minX : position.x;
							minY = (position.y > minY ) ? minY : position.y;
						}
						if ( maxX != -1.e6 ) { // no objects, don't change
							maxX += 1.5 *objectWidth;
							maxY += 5 * objectHeight;
							
							const box = this.props.diagramBox;
							const widthScale = (box.width -30) / ( maxX - minX );
							const heightScale = (box.height - 40) / ( maxY - minY);
							let scale =  ( widthScale < heightScale ) ? widthScale : heightScale;
							if ( scale > 3.0 ) {
								scale = 3.0;
							}
							newState['scale'] = scale;
							newState['translate'] = {x: -minX + 30.0 / scale, y: -minY + 40.0 /scale};
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
		this.props.actions.doCommand(command, (cmds) => {
			this.getModelInfo(rescale);
		});
	}

	componentDidMount() {
		const domNode = ReactDOM.findDOMNode(this);
		domNode.addEventListener('wheel', this.onWheel, {passive: false});
	}

	componentWillUnmount() {
		const domNode = ReactDOM.findDOMNode(this);
		domNode.removeEventListener('pointermove', this.onPointerMove);
		domNode.removeEventListener('pointerup', this.onPointerUp);
		domNode.removeEventListener('wheel', this.onWheel);
	}

	/**
	 * @method setDragType
	 * @param {DiagramDragType} dragType
	 * @param {Object} lastPointerPosition
	 * @param {Object} options
	 * if type is tool, options should contain tool name
	 */
	setDragType(dragType, lastPointerPosition, options) {
		this.props.setDgmState((state) => {
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
									terms.push(`${name} ${p.x} ${p.y}`);
								}
								this.doCommand(terms.join(' '));
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
				break;
			}
		});
	}

	/**
	 * @method draggedTo
	 * @param {Number} x 
	 * @param {Number} y 
	 */
	draggedTo(x, y) {
		this.props.setDgmState((state) => {
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
						const tools = this.updateToolPositions(dragSelection, state);
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
					const tools = this.updateToolPositions(dragSelection, state);
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
	 * @method updateToolPositions
	 * @param {Map} positions
	 * @param {Object} state
	 * @returns {Object} new tools object
	 */
	updateToolPositions(positions, state) {
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
		this.props.setDgmState((state) => {
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
				dragSelection: dragSelection
			}
		});
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
			const domNode = ReactDOM.findDOMNode(this);
			domNode.addEventListener('pointermove', this.onPointerMove);
			domNode.addEventListener('pointerup', this.onPointerUp);
			e.target.setPointerCapture(e.pointerId);
		}
  }

	onPointerUp(e) {
		e.stopPropagation();
		e.preventDefault();
		let eCache = this.eventCache;
		if ( eCache.length === 1 && this.pinch === 0) {
			if (this.panSum == 0) {
				const t = new Date().getTime();
				if (t - this.pointerStartTime > 500) {
					this.createSelectionBox(e.clientX, e.clientY);
				}
				else {
					if (e.clientY - this.props.diagramBox.top < 15) {
						console.log('should pop menu');
					}
					this.props.setDgmState({
						selectionBox: null,
						dragSelection: null
					});
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
			const domNode = ReactDOM.findDOMNode(this);
			e.target.releasePointerCapture(e.pointerId);
			domNode.removeEventListener('pointermove', this.onPointerMove);
			domNode.removeEventListener('pointerup', this.onPointerUp);	
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

			this.props.setDgmState((state) => {
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

	onWheel(e) {
		e.preventDefault(); // chrome complains and remvoing seems ok
		e.stopPropagation();
		const deltaY = e.deltaY;
		const pageX = e.pageX;
		const pageY = e.pageY;
		this.props.setDgmState((state) => {
			const newScale = Math.max(0.1, state.scale - deltaY/100);
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
		const scale = this.props.dgmState.scale;
		const tools = this.props.dgmState.tools;
		const tx = this.props.dgmState.translate.x;
		const ty = this.props.dgmState.translate.y;
		let toolList = [];
		let connectList = [];
		for (const toolName in tools) {
			const toolInfo  = tools[toolName];
			let highlight = false;
			if (this.props.dgmState.dragSelection && this.props.dgmState.dragSelection.has(toolInfo.name)) {
				highlight = true;
			}

			const cmp = e(ToolIcon, {
				key: toolName,
				info: toolInfo,
				highlight: highlight,
				translate: this.props.dgmState.translate,
				scale: scale,
				setDragType: this.setDragType,
				draggedTo: this.draggedTo,
				pushModel: this.props.actions.pushModel,
				pushTool: this.props.actions.pushTool,
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
				const cmp = e('path', {
					key: `${ox}${oy}-${dx}${dy}`,
					fill: 'transparent',
					stroke: 'black',
					d: `M${ox} ${oy} C${cpox} ${cpoy} ${cpdx} ${cpdy} ${dx} ${dy}`
				});
				connectList.push(cmp);
			}
		}

		let selectionBox = null;
		if (this.props.dgmState.selectionBox) {
			selectionBox = e(SelectionBox, {
				rect: this.props.dgmState.selectionBox,
				setDragType: this.setDragType,
				draggedTo: this.draggedTo,
				translate: this.props.dgmState.translate,
				scale: scale
			})
		}

		let textList = [];
		if (this.props.dgmState.path) {
			const pathParts = this.props.dgmState.path.split('.');
			if (pathParts.length > 2) {
				textList.push(
					e(ClickableDiagramText, {
						key: 'parent',
						x: 15,
						y: 25,
						text:`< ${pathParts[pathParts.length-2]}`,
						textClick: (e) => {
							this.props.actions.popModel();
							this.props.setDgmState({selectionBox: null});
						}
					})
				)
			}
			textList.push(
				e(ClickableDiagramText, {
					key: 'name',
					x: this.props.diagramBox.width/2,
					y: 25,
					text: pathParts[pathParts.length-1],
					textClick: (e) => {this.getModelInfo(true);}
				})
			)
		}

		return e(
			'div', {
				id: '#diagram__wrapper',
				style: {
					height: '100%',
					width: '100%',
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
					onTouchMove: e => {
						e.preventDefault();
						e.stopPropagation();
					},
				},
				toolList,
				connectList,
				selectionBox,
				textList
			),
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
	}

	componentWillUnmount() {
		const domNode = ReactDOM.findDOMNode(this);
		domNode.removeEventListener('pointermove', this.onPointerMove);
		domNode.removeEventListener('pointerup', this.onPointerUp);
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
			if (this.panSum == 0) {
				const t = new Date().getTime();
				if (t - this.pointerStartTime > 500) {
					console.log('tool long press')
				}
				else {
					if (this.props.info.toolTypeName === "Model") {
						this.props.pushModel(this.props.info.name);
					}
					else {
						this.props.pushTool(this.props.info.name, this.props.info.toolTypeName);
					}
				}
			}
		}
		else {
			this.setState((state) => {
				return {
					dragging: false,
				};
			});
			this.props.setDragType(null, null, {name: this.props.info.name});	
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
		}
		const fillColor = toolColors[info.toolTypeName]
		let textComponents;
		if (info.toolTypeName === 'Expression') {
			textComponents = e(
				'g', {
					className: 'diagram__text-components',
				},
				e(
					'text', {
						className: 'diagram__tool-name',
						x: (x + 3 + translate.x)*scale,
						y: (y + 7 + translate.y)*scale,
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
						x: (x + 3 + translate.x)*scale,
						y: (y + 12.5 + translate.y)*scale,
						style: {
							fontSize: `${5*scale}px`,
							fontFamily: 'Helvetica',
							fontWeight: '100',
							fill: textColor,
							stroke: textColor
						}
					}, info.formula
				),
				e(
					'text', {
						className: 'diagram__tool-result',
						x: (x + 3 + translate.x)*scale,
						y: (y + 18 + translate.y)*scale,
						style: {
							fontSize: `${5*scale}px`,
							fontFamily: 'Helvetica',
							fontWeight: '100',
							fill: (info.result) ? textColor : 'red',
							stroke: (info.result) ? textColor : 'red',
						}
					}, info.result ? info.result.trim().substr(0, 20) : '?'
				),
			);
		}
		else {
			textComponents = e(
				'g', {
					className: 'diagram__text-components',
				},
				e(
					'text', {
						//className: 'dgm-tooltype',
						x: (x + 3 + translate.x)*scale,
						y: (y + 8 + translate.y)*scale,
						style: {
							fontSize: `${9*scale}px`,
							fontStyle: 'italic',
							fontFamily: 'Helvetica',
							fontWeight: '100',
							fill: toolTypeColor,
							stroke: toolTypeColor
						}
					},
					info.toolTypeName + ':'
				),
				e(
					'text', {
						x: (x + 3 + translate.x)*scale,
						y: (y + 16 + translate.y)*scale,
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

		return e(
			'g', {
				style: {
					stroke: textColor,
					fill: fillColor
				},
			},
			e(
				'rect', {
 					onPointerDown: this.onPointerDown,
					onClick: this.onClick,
					x: (x + translate.x)*scale,
					y: (y + translate.y)*scale,
					width: objectWidth*scale,
					height: objectHeight*scale
				}),
			textComponents
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
		if (this.panSum === 0) {
			const t = new Date().getTime();
			if (t - this.pointerStartTime > 500) {
				console.log(`sb long press  ${this.panSum}`);
			}
			else {
				console.log(`sb click panSum ${this.panSum}`);
			}	
		}
		else {
			this.setState((state) => {
				return {
					dragging: false,
					};
			});
			this.props.setDragType(null);
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
		let t = this.props.t;
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
		this.onClick = this.onClick.bind(this);
	}

	onClick(e) {
    // only left Pointer button
		if (e.button !== 0) return;
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
				fill: 'blue',
				font: '15px sans-serif',
			},
			x: this.props.x,
			y: this.props.y,
			onClick: this.onClick,
			}, this.props.text);
	}
}