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
		this.state = {
			dragType: null,
			dragSelection: null,
			selectionBox: null,
			translate: {x: 0, y: 0},
			scale: 1.0,
		};

		this.panSum = 0;

		this.setDragType = this.setDragType.bind(this);
		this.draggedTo = this.draggedTo.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onClick = this.onClick.bind(this);
		this.onWheel = this.onWheel.bind(this);
		this.onTouchStart = this.onTouchStart.bind(this);
		this.onTouchMove = this.onTouchMove.bind(this);
		this.onTouchEnd = this.onTouchEnd.bind(this);
		this.popModel = this.popModel.bind(this);
		this.pushModel = this.pushModel.bind(this);

		this.getModelInfo();
	}

	/**
	 * @method getModelInfo
	 * @param {Boolean} rescale
	 */
	getModelInfo(rescale = false) {
		this.props.doCommand('/ dgminfo', (results) => {
			if (results.length && results[0].results) {
				const modelInfo = results[0].results;
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
						
						const box = this.boundingBox;
						const widthScale = (box.right - box.left -30) / ( maxX - minX );
						const heightScale = (box.bottom - box.top - 40) / ( maxY - minY);
						let scale =  ( widthScale < heightScale ) ? widthScale : heightScale;
						if ( scale > 3.0 ) {
							scale = 3.0;
						}
						newState['scale'] = scale;
						newState['translate'] = {x: -minX + 30 / scale, y: -minY + 40 /scale};
//						newState['translate'] = {x: -minX + objectHeight / 2, y: -minY + 20 / scale};
					}
				}

				this.setState(newState);
			}
		});
	}

	/**
	 * @method doCommand
	 * @param {String} command
	 * @param {Boolean} rescale - true if diagram should be rescaled
	 * shortcut to props.doCommand with automatic getModelInfo
	 */
	doCommand(command, rescale) {
		this.props.doCommand(command, (cmds) => {
			this.getModelInfo(rescale);
		});
	}

	componentDidUpdate(precProps, prevState) {
		if (this.state.dragType == DiagramDragType.pan && prevState.dragType != DiagramDragType.pan) {
			document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
		} else if (this.state.dragType != DiagramDragType.pan && prevState.dragType == DiagramDragType.pan) {
      document.removeEventListener('mousemove', this.onMouseMove);
			document.removeEventListener('mouseup', this.onMouseUp);
		}
	}

	componentDidMount() {
		this.boundingBox = document.getElementById('dgm-main').getBoundingClientRect();
		ReactDOM.findDOMNode(this).addEventListener('touchstart', this.onTouchStart, {passive: false});
		ReactDOM.findDOMNode(this).addEventListener('touchend', this.onTouchEnd, {passive: false});
	}

	componentWillUnmount() {
		ReactDOM.findDOMNode(this).removeEventListener('touchstart', this.onTouchStart);
		ReactDOM.findDOMNode(this).removeEventListener('touchend', this.onTouchEnd);
	}

	/**
	 * @method setDragType
	 * @param {DiagramDragType} dragType
	 * @param {Object} lastMousePosition
	 * @param {Object} options
	 * if type is tool, options should contain tool name
	 * if type is selectionBox, options should contain topLeft and
	 */
	setDragType(dragType, lastMousePosition, options) {
		this.setState((state) => {
			switch (dragType) {
				case DiagramDragType.pan: 
					return {
						dragType: dragType,
						lastMouse: lastMousePosition,
					}
	
				case DiagramDragType.tool: {
					if (options && options.name) {
						const tool = this.state.tools[options.name];
						let dragSelection = new Map();
						dragSelection.set(tool.name, tool.position);
						return {
							dragType: dragType,
							lastMouse: lastMousePosition,
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
						lastMouse: lastMousePosition,
						dragSelectin: dragSelection
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
								lastMouse: null,
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
								this.props.doCommand(terms.join(' '));
							}			
							return {
								dragType: null,
								lastMouse: null
							};
						}
						default: 
							return {
								dragType: null,
								lastMouse: null
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
		this.setState((state) => {
			const dx = x - state.lastMouse.x;
			const dy = y - state.lastMouse.y;
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
						lastMouse: {x: x, y: y}
					};

				case DiagramDragType.tool: 
					if (state.dragSelection) {
						let dragSelection = updateDragSelection(state.dragSelection);
						const tools = this.updateToolPositions(dragSelection, state);
						return {
							tools: tools,
							lastMouse: {x: x, y: y},
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
						lastMouse: {x: x, y: y}
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
						lastMouse: {x: x, y: y}
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
						lastMouse: {x: x, y: y}
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
		this.setState((state) => {
			const scale = state.scale;
			const topLeft = {
				x: x / scale - state.translate.x,
				y: y / scale - state.translate.y
			};
			const sb = {
				left: topLeft.x,
				top: topLeft.y,
				right: topLeft.x + 150/scale,
				bottom: topLeft.y + 80/scale
			}

			const dragSelection = this.toolsInBox(sb, state.tools);
			return {
				selectionBox: (state.selectionBox) ? null : sb,
				dragSelection: dragSelection
			}
		});
	}

	onMouseDown(e) {
    // only left mouse button
		if (e.button !== 0) return;
		this.panSum = 0;
		this.pointerStartTime = new Date().getTime();
    this.setDragType( DiagramDragType.pan, {x: e.clientX, y: e.clientY });
    e.stopPropagation()
    e.preventDefault()
  }

	onMouseUp(e) {
    this.setDragType(null);
    e.stopPropagation()
    e.preventDefault()
	}
	
  onMouseMove(e) {
		this.panSum += Math.abs(e.movementX) + Math.abs(e.movementY);

		this.draggedTo( e.clientX, e.clientY);
    e.stopPropagation()
    e.preventDefault()
	}

	onClick(e) {
    e.stopPropagation()
    e.preventDefault()
		if (this.panSum == 0) {
			const t = new Date().getTime();
			if (t - this.pointerStartTime > 500) {
				this.createSelectionBox(e.clientX, e.clientY);
			}
			else {
				if (e.clientY - this.boundingBox.top < 15) {
					if (e.clientX - this.boundingBox.left < this.boundingBox.width/2) {
						this.popModel();
						this.setState({selectionBox: null});
					}
					else {
						this.getModelInfo(true);
					}
				}
				else {
					console.log('should pop menu');
					this.setState({selectionBox: null});
				}
			}
		}
		this.panSum = 0;
	}

	onWheel(e) {
		e.preventDefault();
		e.stopPropagation();
		const deltaY = e.deltaY;
		const pageX = e.pageX;
		const pageY = e.pageY;
		this.setState((state) => {
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

	onTouchStart(e) {
		e.preventDefault();
		e.stopPropagation();
		if (e.touches.length == 1) {
			this.panSum = 0;
			this.pointerStartTime = new Date().getTime();
			const touch = e.touches[0];
			this.touch0 = {x: touch.clientX, y: touch.clientY};
			this.setDragType( DiagramDragType.pan, this.touch0);
		}
		else if (e.touches.length == 2) {
			const pinch = Math.hypot(
				e.touches[0].clientX - e.touches[1].clientX,
				e.touches[0].clientY - e.touches[1].clientY
			);
			if (pinch > 0) {
				this.pinch = pinch;
			}
		}
		e.target.addEventListener('touchmove', this.onTouchMove, {passive: false});
	}

	onTouchMove(e) {
		e.preventDefault();
		e.stopPropagation();
		if (e.touches.length == 1) {
			const touch = e.touches[0];
			let deltaX = touch.clientX - this.touch0.x;
			let deltaY = touch.clientY - this.touch0.y;
			this.panSum += Math.abs(deltaX) + Math.abs(deltaY);
			this.touch0 = {x: touch.clientX, y: touch.clientY};
			this.draggedTo( touch.clientX, touch.clientY);
		}
		else if (e.touches.length == 2 && this.pinch) {
			const newPinch = Math.hypot(
				e.touches[0].clientX - e.touches[1].clientX,
				e.touches[0].clientY - e.touches[1].clientY
			);

			let ratio = 1;
			if (newPinch) {
				ratio = newPinch/this.pinch;
				this.pinch = newPinch;
				this.panSum += this.pinch;
			}
			const clientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
			const clientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

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

	onTouchEnd(e) {
		e.target.removeEventListener('touchmove', this.onTouchMove);
		console.log(`touch end length ${e.changedTouches.length} pinch ${this.pinch}`);
	if (e.changedTouches.length == 1 && this.pinch == null) {
			this.setDragType(null);
			if (this.panSum <= 5) {
				const touch = e.changedTouches[0];
				const t = new Date().getTime();
				if (t - this.pointerStartTime > 500) {
					this.createSelectionBox(touch.clientX, touch.clientY);
				}
				else {
					if (touch.clientX - this.boundingBox.top < 100 && touch.clientY - this.boundingBox.top < 15) {
						this.popModel();
						this.setState({selectionBox: null});
					}
					else {
						console.log('should pop menu');
						this.setState({selectionBox: null});
					}
				}
			}
		}
		this.pinch = null;
	}

	/**
	 * @method pushModel
	 * @param {string} modelName 
	 */
	pushModel(modelName) {
		this.doCommand(`/ pushmodel ${modelName}`, true);
	}

	/**
	 * @method popModel 
	 */
	popModel() {
		this.doCommand('/ popmodel', true);
	}

	render() {
		let t = this.props.t;
		let viewBox;
		if (this.boundingBox) {
			viewBox = [this.boundingBox.left, this.boundingBox.top, this.boundingBox.width, this.boundingBox.height];
		}
		else {
			const width = window.innerWidth - this.props.infoWidth;
			const height = window.innerHeight;
			viewBox = [0, 0, width, height];
		}
		const scale = this.state.scale;
		const tools = this.state.tools;
		const tx = this.state.translate.x;
		const ty = this.state.translate.y;
		let toolList = [];
		let connectList = [];
		for (const toolName in tools) {
			const toolInfo  = tools[toolName];
			let highlight = false;
			if (this.state.dragSelection && this.state.dragSelection.has(toolInfo.name)) {
				highlight = true;
			}

			const cmp = e(ToolIcon, {
				key: toolName,
				info: toolInfo,
				highlight: highlight,
				translate: this.state.translate,
				scale: scale,
				setDragType: this.setDragType,
				draggedTo: this.draggedTo,
				pushModel: this.pushModel
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
		if (this.state.selectionBox) {
			selectionBox = e(SelectionBox, {
				rect: this.state.selectionBox,
				setDragType: this.setDragType,
				draggedTo: this.draggedTo,
				translate: this.state.translate,
				scale: scale
			})
		}

		let textList = [];
		if (this.state.path) {
			const pathParts = this.state.path.split('.');
			if (pathParts.length > 2) {
				textList.push(
					e('text', {
						id: 'dgm-parent-name',
						key: 'parent',
						x: 15,
						y: 25,
					}, `< ${pathParts[pathParts.length-2]}`)
				)
			}
			textList.push(
				e('text', {
					id: 'dgm-model-name',
					key: 'name',
					x: this.boundingBox.width/2,
					y: 25,
				}, pathParts[pathParts.length-1])
			)
		}

		return e('div', {
				id:'dgm-main',
//				className: this.state.dragType ? 'hide-cursor' : 'show-cursor'
			},
			e('svg', {
				id: 'dgm-svg-main',
				viewBox: viewBox,
				onMouseDown: this.onMouseDown,
				onWheel: this.onWheel,
				onClick: this.onClick,
			},
/*
				e('text', {
					x: 15,
					y: 25,
					style: {font: '15px sans-serif'},
				}, this.state.path),*/
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
		//this.handleButtonClick = this.handleButtonClick.bind(this);
		this.state = {
			dragging: null,
			position: this.props.info.position,
		};

		this.panSum = 0;

		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onClick = this.onClick.bind(this);
		this.onTouchStart = this.onTouchStart.bind(this);
		this.onTouchMove = this.onTouchMove.bind(this);
		this.onTouchEnd = this.onTouchEnd.bind(this);
	}

	componentDidUpdate(props, state) {
		if (this.state.dragging && !state.dragging) {
			document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
		} else if (!this.state.dragging && state.dragging) {
      document.removeEventListener('mousemove', this.onMouseMove);
			document.removeEventListener('mouseup', this.onMouseUp);
		}
	}

	componentDidMount() {
		ReactDOM.findDOMNode(this).addEventListener('touchstart', this.onTouchStart, {passive: false});
		ReactDOM.findDOMNode(this).addEventListener('touchend', this.onTouchEnd, {passive: false});
	}

	componentWillUnmount() {
		ReactDOM.findDOMNode(this).removeEventListener('touchstart', this.onTouchStart);
		ReactDOM.findDOMNode(this).removeEventListener('touchend', this.onTouchEnd);
	}

	onMouseDown(e) {
    // only left mouse button
		if (e.button !== 0) return;
		this.panSum = 0;
		this.pointerStartTime = new Date().getTime();
		this.props.setDragType( DiagramDragType.tool,
			{x: e.clientX, y: e.clientY }, 
			{name: this.props.info.name}
		);
		this.setState({dragging: true});
    e.stopPropagation()
    e.preventDefault()
  }

	onMouseUp(e) {
		this.setState((state) => {
			return {
				dragging: false,
			};
		});
		this.props.setDragType(null, null, {name: this.props.info.name});
    e.stopPropagation()
    e.preventDefault()
	}
	
  onMouseMove(e) {
		if (!this.state.dragging) return
		this.panSum += Math.abs(e.movementX) + Math.abs(e.movementY);
		this.props.draggedTo(e.clientX, e.clientY);

    e.stopPropagation();
    e.preventDefault();
	}

	onClick(e) {
		const t = new Date().getTime();
		if (t - this.pointerStartTime > 500) {
			console.log('tool long press')
		}
		else {
			if (this.props.info.toolTypeName === "Model") {
				this.props.pushModel(this.props.info.name);
			}
			console.log(`Tool click panSum ${this.panSum}`);
		}
		this.panSum = 0;
    e.stopPropagation()
    e.preventDefault()
	}

	onTouchStart(e) {
		e.preventDefault();
		e.stopPropagation();
		if (e.changedTouches.length == 1) {
			this.panSum = 0;
			this.pointerStartTime = new Date().getTime();
			const touch = e.changedTouches[0];
			this.touch0 = {x: touch.clientX, y: touch.clientY};
			this.props.setDragType( DiagramDragType.tool,
				this.touch0, 
				{name: this.props.info.name}
			);
		e.target.addEventListener('touchmove', this.onTouchMove, {passive: false});
		}
	}

	onTouchMove(e) {
		e.preventDefault();
		e.stopPropagation();
		if (e.changedTouches.length == 1) {
			const touch = e.changedTouches[0];
			let deltaX = touch.clientX - this.touch0.x;
			let deltaY = touch.clientY - this.touch0.y;
			this.touch0 = {x: touch.clientX, y: touch.clientY};
			this.panSum += Math.abs(deltaX) + Math.abs(deltaY);
			this.props.draggedTo(touch.clientX, touch.clientY);
		}
	}

	onTouchEnd(e) {
		e.preventDefault();
		e.stopPropagation();
		e.target.removeEventListener('touchmove', this.onTouchMove);
		if (e.changedTouches.length == 1) {
			this.props.setDragType(null, null, {name: this.props.info.name});
			if (this.panSum <= 5) {
				const t = new Date().getTime();
				if (t - this.pointerStartTime > 500) {
					console.log(`tool long touch  ${this.panSum}`);
				}
				else {
					if (this.props.info.toolTypeName === "Model") {
						this.props.pushModel(this.props.info.name);
						console.log(`Tool tap panSum ${this.panSum}`);
					}
				}
			}
		}
		this.panSum = 0;
	}

	render() {
		let t = this.props.t;
		const info = this.props.info;
		const x = info.position.x;
		const y = info.position.y;

		const translate = this.props.translate;
		const scale = this.props.scale;
		let textComponents;
		if (info.toolTypeName === 'Expression') {
			textComponents = e('g', {},
				e('text', {
					x: (x + 3 + translate.x)*scale,
					y: (y + 7 + translate.y)*scale,
					style: {fontSize: `${6*scale}px`}
					}, info.name
				),
				e('text', {
					className: 'dgm-formula',
					x: (x + 3 + translate.x)*scale,
					y: (y + 12.5 + translate.y)*scale,
					style: {fontSize: `${5*scale}px`}
					}, info.formula
				),
				e('text', {
					className: 'dgm-result',
					x: (x + 3 + translate.x)*scale,
					y: (y + 18 + translate.y)*scale,
					style: {
						fontSize: `${5*scale}px`,
						fill: (info.result) ? 'black' : 'red'
					}
					}, info.result ? info.result.trim() : '?'
				),
			);
		}
		else {
			textComponents = e('g', {},
			e('text', {
				className: 'dgm-tooltype',
				x: (x + 3 + translate.x)*scale,
				y: (y + 8 + translate.y)*scale,
				style: {fontSize: `${9*scale}px`}
				}, info.toolTypeName + ':'
			),
			e('text', {
				x: (x + 3 + translate.x)*scale,
					y: (y + 16 + translate.y)*scale,
					style: {fontSize: `${7*scale}px`}
					}, info.name
				),
			);
		}

		this.props.highlight 
		return e('g', {
			className: `${this.props.highlight ? 'dgm-svg-tool-highlight' : 'dgm-svg-tool'} dgm-${info.toolTypeName}`,
		},
			e('rect', {
				onMouseDown: this.onMouseDown,
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

		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onClick = this.onClick.bind(this);
		this.onTouchStart = this.onTouchStart.bind(this);
		this.onTouchMove = this.onTouchMove.bind(this);
		this.onTouchEnd = this.onTouchEnd.bind(this);
	}

	componentDidUpdate(props, state) {
		if (this.state.dragging && !state.dragging) {
			document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
		} else if (!this.state.dragging && state.dragging) {
      document.removeEventListener('mousemove', this.onMouseMove);
			document.removeEventListener('mouseup', this.onMouseUp);
		}
	}

	componentDidMount() {
		ReactDOM.findDOMNode(this).addEventListener('touchstart', this.onTouchStart, {passive: false});
		ReactDOM.findDOMNode(this).addEventListener('touchend', this.onTouchEnd, {passive: false});
	}

	componentWillUnmount() {
		ReactDOM.findDOMNode(this).removeEventListener('touchstart', this.onTouchStart);
		ReactDOM.findDOMNode(this).removeEventListener('touchend', this.onTouchEnd);
	}

	/**
	 * @method determineDragType
	 * @param {Number} clientX 
	 * @param {Number} clientY
	 * @returns {DiagramDragType}
	 */
	determineDragType(clientX, clientY, corner) {
		const scale = this.props.scale;
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

	onMouseDown(e) {
    // only left mouse button
		if (e.button !== 0) return;
		this.panSum = 0;
		this.pointerStartTime = new Date().getTime();
		this.setState({
      dragging: true
		})
		const dragType = this.determineDragType(e.clientX, e.clientY, 20);
		this.props.setDragType(dragType, {x: e.clientX, y: e.clientY});
    e.stopPropagation()
    e.preventDefault()
  }

	onMouseUp(e) {
		this.setState((state) => {
			return {
				dragging: false,
				};
		});
		this.props.setDragType(null);
    e.stopPropagation()
    e.preventDefault()
	}
	
  onMouseMove(e) {
		this.panSum += Math.abs(e.movementX) + Math.abs(e.movementY);
		this.props.draggedTo(e.clientX, e.clientY);
    e.stopPropagation()
    e.preventDefault()
	}

	onClick(e) {
		this.panSum = 0;
    e.stopPropagation()
    e.preventDefault()
		const t = new Date().getTime();
		if (t - this.pointerStartTime > 500) {
			console.log(`sb long press  ${this.panSum}`);
		}
		else {
			console.log(`sb click panSum ${this.panSum}`);
		}
}

	onTouchStart(e) {
		e.preventDefault();
		e.stopPropagation();
		if (e.changedTouches.length == 1) {
			this.panSum = 0;
			this.pointerStartTime = new Date().getTime();
			const touch = e.changedTouches[0];
			this.touch0 = {x: touch.clientX, y: touch.clientY};
			const dragType = this.determineDragType(touch.clientX, touch.clientY, 20);
			this.props.setDragType(dragType, this.touch0);
			e.target.addEventListener('touchmove', this.onTouchMove, {passive: false});
		}
	}

	onTouchMove(e) {
		e.preventDefault();
		e.stopPropagation();
		if (e.changedTouches.length == 1) {
			const touch = e.changedTouches[0];
			let deltaX = touch.clientX - this.touch0.x;
			let deltaY = touch.clientY - this.touch0.y;
			this.touch0 = {x: touch.clientX, y: touch.clientY};
			this.panSum += Math.abs(deltaX) + Math.abs(deltaY);
			this.props.draggedTo(touch.clientX, touch.clientY);
		}
	}

	onTouchEnd(e) {
		e.preventDefault();
		e.stopPropagation();
		if (e.changedTouches.length == 1) {
			e.target.removeEventListener('touchmove', this.onTouchMove);
			this.props.setDragType(null, null);
			if (this.panSum <= 5) {
				const t = new Date().getTime();
				if (t - this.pointerStartTime > 500) {
					console.log(`sb long touch  ${this.panSum}`);
				}
				else {
					console.log(`sb tap panSum ${this.panSum}`);
				}
			}
		}
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
			className: `dgm-svg-selectbox`,
		},
			e('rect', {
				onMouseDown: this.onMouseDown,
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