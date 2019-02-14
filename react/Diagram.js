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
 * @class Diagram
 * the main mind map diagram
 */
export class Diagram extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			dragging: null,
			selected: [],
			selectionBox: null,
			translateX: 0,
			translateY: 0,
			scale: 1.0,
			infoWidth: 320
		};

		this.panSum = 0;

		this.setDragObject = this.setDragObject.bind(this);
		this.dragBy = this.dragBy.bind(this);
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
		if (this.state.dragging == this && prevState.dragging != this) {
			document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
		} else if (this.state.dragging != this && prevState.dragging == this) {
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
	 * @method setDragObject
	 * @param {any} dragObject 
	 */
	setDragObject(dragObject) {
		this.setState({dragging: dragObject});
	}

	/**
	 * @method dragBy
	 * @param {Number} dx 
	 * @param {Number} dy 
	 */
	dragBy(dx, dy) {
		if (this.state.dragging == this ) {
			this.setState((state) => {
				return {
					translateX: state.translateX + dx/state.scale,
					translateY: state.translateY + dy/state.scale
				}
			});
		}
		else if (this.state.dragging instanceof SelectionBox) {
			this.setState((state) => {
				const topLeft = state.selectionBox.topLeft;
				const bottomRight = state.selectionBox.bottomRight;
				const scale = state.scale;
				return {
					selectionBox: {
						topLeft: {x: topLeft.x + dx/scale, y: topLeft.y + dy/scale},
						bottomRight: {x: bottomRight.x + dx/scale, y: bottomRight.y + dy/scale}
					}
				}
			});
		}
	}

	onMouseDown(e) {
    // only left mouse button
		if (e.button !== 0) return;
		this.panSum = 0;
    this.setState({
      dragging: this
    })
    e.stopPropagation()
    e.preventDefault()
  }

	onMouseUp(e) {
    this.setState({dragging: null})
    e.stopPropagation()
    e.preventDefault()
	}
	
  onMouseMove(e) {
		if (this.state.dragging != this) {
			return
		}
		console.log(`position ${e.clientX} ${e.clientY}`);
		console.log(`move ${e.movementX} ${e.movementY}`);
		this.panSum += Math.abs(e.movementX) + Math.abs(e.movementY);

		this.dragBy( e.movementX, e.movementY);
    e.stopPropagation()
    e.preventDefault()
	}

	onClick(e) {
		if (this.panSum == 0) {
			const scale = this.state.scale;
			const topLeftX = e.clientX / scale - this.state.translateX;
			const topLeftY = e.clientY / scale - this.state.translateY;
			this.setState((state) => {
				return {
					selectionBox: (state.selectionBox) ? null : {
						topLeft: {x: topLeftX, y: topLeftY},
						bottomRight: {x: topLeftX + 150/scale, y: topLeftY + 80/scale}
					}
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
			const newTransX = pageX/newScale - pageX/state.scale + state.translateX;
			const newTransY = pageY/newScale - pageY/state.scale + state.translateY;
			return {
				scale: newScale,
				translateX: newTransX,
				translateY: newTransY
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
					translateX: state.translateX + deltaX/state.scale,
					translateY: state.translateY + deltaY/state.scale
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
				const newTransX = pageX/newScale - pageX/state.scale + state.translateX;
				const newTransY = pageY/newScale - pageY/state.scale + state.translateY;
				return {
					scale: newScale,
					translateX: newTransX,
					translateY: newTransY
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
		const tx = this.state.translateX;
		const ty = this.state.translateY;
		const scale = this.state.scale;
		const tools = this.props.dgmInfo.tools;
		let toolList = [];
		let connectList = [];
		for (const toolName in tools) {
			const toolInfo  = tools[toolName];
			const cmp = e(ToolIcon, {
				key: toolName,
				info: toolInfo,
				transX: tx,
				transY: ty,
				scale: scale
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
				setDragObject: this.setDragObject,
				dragBy: this.dragBy,
				transX: tx,
				transY: ty,
				scale: scale
			})
		}

		return e('div', {
				id:'dgm-main',
				className: this.state.dragging ? 'hide-cursor' : 'show-cursor'
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
					y: 15,
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
		this.setState({
      dragging: true
    })
    e.stopPropagation()
    e.preventDefault()
  }

	onMouseUp(e) {
		this.setState((state) => {
			const newPosition = snapPosition(state.position);
			return {
				dragging: false,
				position: newPosition
			};
		});
    e.stopPropagation()
    e.preventDefault()
	}
	
  onMouseMove(e) {
		if (!this.state.dragging) return
		this.panSum += Math.abs(e.movementX) + Math.abs(e.movementY);
    this.setState((state) => {
			const x = state.position.x + e.movementX/this.props.scale;
			const y = state.position.y + e.movementY/this.props.scale;
      return {
        position: {x: x, y: y}
      }
    })
    e.stopPropagation()
    e.preventDefault()
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
		const x = this.state.position.x;
		const y = this.state.position.y;
		const transX = this.props.transX;
		const transY = this.props.transY;
		const scale = this.props.scale;
		let textComponents;
		if (info.toolTypeName === 'Expression') {
			textComponents = e('g', {},
				e('text', {
					className: 'dgm-name',
					x: (x + 3 + transX)*scale,
					y: (y + 7 + transY)*scale,
					style: {fontSize: `${6*scale}px`}
					}, info.name
				),
				e('text', {
					className: 'dgm-formula',
					x: (x + 3 + transX)*scale,
					y: (y + 12.5 + transY)*scale,
					style: {fontSize: `${5*scale}px`}
					}, info.formula
				),
				e('text', {
					className: 'dgm-result',
					x: (x + 3 + transX)*scale,
					y: (y + 18 + transY)*scale,
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
				x: (x + 3 + transX)*scale,
				y: (y + 8 + transY)*scale,
				style: {fontSize: `${9*scale}px`}
				}, info.toolTypeName + ':'
			),
			e('text', {
					className: 'dgm-name',
					x: (x + 3 + transX)*scale,
					y: (y + 16 + transY)*scale,
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
				x: (x + transX)*scale,
				y: (y + transY)*scale,
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
		this.props.setDragObject(this);
    e.stopPropagation()
    e.preventDefault()
  }

	onMouseUp(e) {
		this.setState((state) => {
			return {
				dragging: false,
				};
		});
		this.props.setDragObject(null);
    e.stopPropagation()
    e.preventDefault()
	}
	
  onMouseMove(e) {
		if (!this.state.dragging) {
			return;
		}
		this.panSum += Math.abs(e.movementX) + Math.abs(e.movementY);
		this.props.dragBy(e.movementX, e.movementY);
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
			this.props.setDragObject(this);
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
			this.props.setDragObject(null);
		}
	}

	render() {
		let t = this.props.t;
		const box = this.props.selectionBox;
		const scale = this.props.scale;
		const topLeftX = box.topLeft.x;
		const topLeftY = box.topLeft.y;
		const x = (topLeftX + this.props.transX) * scale;
		const y = (topLeftY + this.props.transY) * scale;
		const width = (box.bottomRight.x - topLeftX) * scale;
		const height = (box.bottomRight.y - topLeftY) * scale;

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