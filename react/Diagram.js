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
			infoWidth: 320
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
						const tool = this.props.dgmInfo.tools[options.name];
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

				case DiagramDragType.selectionBox: {
					return {
						dragType: dragType,
						lastMouse: lastMousePosition,
					}
				}
				break;

				default: {
					if (state.dragType === 'tool') {
						const toolInfo = this.props.dgmInfo.tools[options.name];
						const position = toolInfo.position;

						if (toolInfo && position) {
							const command = `${this.props.dgmInfo.path} setpositions ${options.name} ${position.x} ${position.y}`
							this.props.doCommand(command, (cmds) => {
								this.props.updateDiagram();
							})
						}
						return {
							dragType: null,
							lastMouse: null,
							dragSelection: null
						};
					}
					else {
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
					if (this.state.dragSelection) {
						let dragSelection = updateDragSelection(this.state.dragSelection);
						this.props.updateDiagramPositions(dragSelection);
					}
					break;

				case DiagramDragType.selectionBox: {
					const sb = state.selectionBox;
					const scale = state.scale;
					let dragSelection = updateDragSelection(this.state.dragSelection);
					this.props.updateDiagramPositions(dragSelection);
					return {
						selectionBox: {
							left: sb.left + dx/scale,
							top: sb.top + dy/scale,
							right: sb.right + dx/scale,
							bottom: sb.bottom + dy/scale
						},
						lastMouse: {x: x, y: y}
					};
				}
				break;

				default:
					return {};
			}
		})
	}

	/**
	 * @method toolsInBox
	 * @param {Object} selectionBox 
	 * @returns {Map}
	 * returns a drag selection map of all tools found in rectangle
	 * described by top left and bottom positions
	 */
	toolsInBox(selectionBox) {
		function intersectRect(r1, r2) {
			return !(r2.left > r1.right || 
							 r2.right < r1.left || 
							 r2.top > r1.bottom ||
							 r2.bottom < r1.top);
		}

		const tools = this.props.dgmInfo.tools;
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

	onMouseDown(e) {
    // only left mouse button
		if (e.button !== 0) return;
		this.panSum = 0;
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
		console.log(`position ${e.clientX} ${e.clientY}`);
		console.log(`move ${e.movementX} ${e.movementY}`);
		this.panSum += Math.abs(e.movementX) + Math.abs(e.movementY);

		this.draggedTo( e.clientX, e.clientY);
    e.stopPropagation()
    e.preventDefault()
	}

	onClick(e) {
		if (this.panSum == 0) {
			const scale = this.state.scale;
			const topLeft = {
				x: e.clientX / scale - this.state.translate.x,
				y: e.clientY / scale - this.state.translate.y
			};
			const sb = {
				left: topLeft.x,
				top: topLeft.y,
				right: topLeft.x + 150/scale,
				bottom: topLeft.y + 80/scale
			}

			const dragSelection = this.toolsInBox(sb);
			this.setState((state) => {
				return {
					selectionBox: (state.selectionBox) ? null : sb,
					dragSelection: dragSelection
				}
			});
		}
		this.panSum = 0;
    e.stopPropagation()
    e.preventDefault()
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
			const touch = e.touches[0];
			this.touch0 = {x: touch.pageX, y: touch.pageY};
			e.target.addEventListener('touchmove', this.onTouchMove, {passive: false});
		}
		else if (e.touches.length == 2) {
			const pinch = Math.hypot(
				e.touches[0].pageX - e.touches[1].pageX,
				e.touches[0].pageY - e.touches[1].pageY
			);
			if (pinch > 0) {
				this.pinch = pinch;
			}
		}
	}

	onTouchMove(e) {
		e.preventDefault();
		e.stopPropagation();
		if (e.touches.length == 1) {
			const touch = e.touches[0];
			let deltaX = touch.pageX - this.touch0.x;
			let deltaY = touch.pageY - this.touch0.y;
			this.touch0 = {x: touch.pageX, y: touch.pageY};
			this.setState((state) => {
				return {
					translate: {
						x: state.translate.x + deltaX/state.scale,
						y: state.translate.y + deltaY/state.scale
					}
				}
			});
		}
		else if (e.touches.length == 2 && this.pinch) {
			const newPinch = Math.hypot(
				e.touches[0].pageX - e.touches[1].pageX,
				e.touches[0].pageY - e.touches[1].pageY
			);

			let ratio = 1;
			if (newPinch) {
				ratio = newPinch/this.pinch;
				this.pinch = newPinch;
			}
			const pageX = (e.touches[0].pageX + e.touches[1].pageX) / 2;
			const pageY = (e.touches[0].pageY + e.touches[1].pageY) / 2;

			this.setState((state) => {
				const newScale = Math.max(0.1, state.scale * ratio);
				const newTranslate = {
					x: pageX/newScale - pageX/state.scale + state.translate.x,
					y: pageY/newScale - pageY/state.scale + state.translate.y
				}
				return {
					scale: newScale,
					translate: newTranslate
				}
			})	
		}
	}

	onTouchEnd(e) {
		if (e.touches.length == 1) {
			e.target.removeEventListener('touchmove', this.onTouchMove);
		}
		else if (e.touches.length == 2) {
			this.pinch = null;
		}
	}

	render() {
		let t = this.props.t;
		let viewBox;
		if (this.boundingBox) {
			viewBox = [this.boundingBox.left, this.boundingBox.top, this.boundingBox.width, this.boundingBox.height];
		}
		else {
			const width = window.innerWidth - this.state.infoWidth;
			const height = window.innerHeight;
			viewBox = [0, 0, width, height];
		}
		const scale = this.state.scale;
		const tools = this.props.dgmInfo.tools;
		const tx = this.state.translate.x;
		const ty = this.state.translate.y;
		let toolList = [];
		let connectList = [];
		for (const toolName in tools) {
			const toolInfo  = tools[toolName];
			const cmp = e(ToolIcon, {
				key: toolName,
				info: toolInfo,
				translate: this.state.translate,
				scale: scale,
				setDragType: this.setDragType,
				draggedTo: this.draggedTo,	
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
				selectionBox: this.state.selectionBox,
				setDragType: this.setDragType,
				draggedTo: this.draggedTo,
				translate: this.state.translate,
				scale: scale
			})
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
				e('text', {
					x: 15,
					y: 25,
					style: {font: '10px sans-serif'}
				}, this.props.dgmInfo.path),
				toolList,
				connectList,
				selectionBox
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
		/*
    this.setState((state) => {
			const x = state.position.x + e.movementX/this.props.scale;
			const y = state.position.y + e.movementY/this.props.scale;
      return {
        position: {x: x, y: y}
      }
    })*/
    e.stopPropagation();
    e.preventDefault();
	}

	onClick(e) {
		console.log(`Tool click panSum ${this.panSum}`);
		this.panSum = 0;
    e.stopPropagation()
    e.preventDefault()
	}

	onTouchStart(e) {
		e.preventDefault();
		e.stopPropagation();
		if (e.changedTouches.length == 1) {
			const touch = e.changedTouches[0];
			this.touch0 = {x: touch.pageX, y: touch.pageY};
			e.target.addEventListener('touchmove', this.onTouchMove, {passive: false});
		}
	}

	onTouchMove(e) {
		e.preventDefault();
		e.stopPropagation();
		if (e.changedTouches.length == 1) {
			const touch = e.changedTouches[0];
			let deltaX = touch.pageX - this.touch0.x;
			let deltaY = touch.pageY - this.touch0.y;
			this.touch0 = {x: touch.pageX, y: touch.pageY};
			this.setState((state) => {
				const x = state.position.x + deltaX/this.props.scale;
				const y = state.position.y + deltaY/this.props.scale;
				return {
					position: {x: x, y: y}
				}
			});
		}
	}

	onTouchEnd(e) {
		if (e.changedTouches.length == 1) {
			e.target.removeEventListener('touchmove', this.onTouchMove);
			this.setState((state) => {
				const newPosition = snapPosition(state.position);
				return newPosition;
			});
		}
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
					className: 'dgm-name',
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
					className: 'dgm-name',
					x: (x + 3 + translate.x)*scale,
					y: (y + 16 + translate.y)*scale,
					style: {fontSize: `${7*scale}px`}
					}, info.name
				),
			);
		}

		return e('g', {
			className: `dgm-svg-tool dgm-${info.toolTypeName}`,
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

	onMouseDown(e) {
    // only left mouse button
		if (e.button !== 0) return;
		this.panSum = 0;
		this.setState({
      dragging: true
		})
		this.props.setDragType(DiagramDragType.selectionBox, {x: e.clientX, y: e.clientY});
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
		console.log(`selection box click panSum ${this.panSum}`);
		this.panSum = 0;
    e.stopPropagation()
    e.preventDefault()
	}

	onTouchStart(e) {
		e.preventDefault();
		e.stopPropagation();
		if (e.changedTouches.length == 1) {
			const touch = e.changedTouches[0];
			this.touch0 = {x: touch.pageX, y: touch.pageY};
			e.target.addEventListener('touchmove', this.onTouchMove, {passive: false});
			this.props.setDragType(DiagramDragType, this.touch0);
		}
	}

	onTouchMove(e) {
		e.preventDefault();
		e.stopPropagation();
		if (e.changedTouches.length == 1) {
			const touch = e.changedTouches[0];
			let deltaX = touch.pageX - this.touch0.x;
			let deltaY = touch.pageY - this.touch0.y;
			this.touch0 = {x: touch.pageX, y: touch.pageY};
			this.props.dragBy(deltaX, deltaY);
		}
	}

	onTouchEnd(e) {
		if (e.changedTouches.length == 1) {
			e.target.removeEventListener('touchmove', this.onTouchMove);
			this.props.setDragType(null, null);
		}
	}

	render() {
		let t = this.props.t;
		const box = this.props.selectionBox;
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