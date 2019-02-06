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
 * Enum for drag state.
 * @readonly
 * @enum {Number}
 */
const DragState = Object.freeze({
	none: 0,
	pan: 1,
	tool: 2,
	multiple: 3
});

/**
 * @class Diagram
 * the main mind map diagram
 */
export class Diagram extends React.Component {
	constructor(props) {
		super(props);
		//this.handleButtonClick = this.handleButtonClick.bind(this);
		this.state = {
			dragging: DragState.none,
			translateX: 0,
			translateY: 0,
			scale: .5,
			infoWidth: 320
		};

		
		this.touch0 = {x:0, y:0};

		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onWheel = this.onWheel.bind(this);
		this.onTouchStart = this.onTouchStart.bind(this);
		this.onTouchMove = this.onTouchMove.bind(this);
		this.onTouchEnd = this.onTouchEnd.bind(this);
	}

	componentDidUpdate(precProps, prevState) {
		if (this.state.dragging == DragState.pan && prevState.dragging != DragState.pan) {
			document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
		} else if (this.state.dragging != DragState.pan && prevState.dragging == DragState.pan) {
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
	 * @method setDragState
	 * @param {DragState} dragState 
	 */
	setDragState(dragState) {
		this
	}

	onMouseDown(e) {
    // only left mouse button
		if (e.button !== 0) return;
    this.setState({
      dragging: DragState.pan
    })
    e.stopPropagation()
    e.preventDefault()
  }

	onMouseUp(e) {
    this.setState({dragging: DragState.none})
    e.stopPropagation()
    e.preventDefault()
	}
	
  onMouseMove(e) {
		if (this.state.dragging != DragState.pan) {
			return
		}
    this.setState((state) => {
      return {
        translateX: state.translateX + e.movementX/state.scale,
        translateY: state.translateY + e.movementY/state.scale
      }
    })
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
		const width = window.innerWidth - this.state.infoWidth;
		const height = window.innerHeight;
		const viewBox = [0, 0, width, height];
		const tx = this.state.translateX;
		const ty = this.state.translateY;
		const scale = this.state.scale;
		const toolX = (0 + tx)*scale;
		const toolY = (0 + ty)*scale;
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

		return e('div', {id:'dgm-main'},
			e('svg', {
				id: 'dgm-svg-main',
				viewBox: viewBox,
				onMouseDown: this.onMouseDown,
				onWheel: this.onWheel,
			},
				e('text', {
					x: 15,
					y: 15,
					style: {font: '10px sans-serif'}
				}, this.props.dgmInfo.path),
				toolList,
				connectList
			)
		);
	}
}

/**
 * @class ToolIcon
 * the main mind map diagram
 */
export class ToolIcon extends React.Component {
	constructor(props) {
		super(props);
		//this.handleButtonClick = this.handleButtonClick.bind(this);
		this.state = {
			dragging: DragState.none,
			position: this.props.info.position,
		};

		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
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
				x: (x + transX)*scale,
				y: (y + transY)*scale,
				width: objectWidth*scale,
				height: objectHeight*scale
			}),
			textComponents
		);
	}
}