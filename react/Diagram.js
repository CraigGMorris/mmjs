'use strict';

const e = React.createElement;

/**
 * @class Diagram
 * the main mind map diagram
 */
export class Diagram extends React.Component {
	constructor(props) {
		super(props);
		//this.handleButtonClick = this.handleButtonClick.bind(this);
		this.state = {
			dragging: false,
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
    this.setState({dragging: false})
    e.stopPropagation()
    e.preventDefault()
	}
	
  onMouseMove(e) {
		if (!this.state.dragging) return
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
		const toolX = (0 + this.state.translateX)*this.state.scale;
		const toolY = (0 + this.state.translateY)*this.state.scale;
		/*
		console.log(viewBox);
		console.log(`toolX ${toolX} toolY ${toolY}`);
		console.log(`scale ${this.state.scale} transX ${this.state.translateX} transY ${this.state.translateY}`);
		*/
		return e('div', {id:'dgm-main'},
			e('svg', {
				id: 'dgm-svg-main',
				viewBox: viewBox,
				onMouseDown: this.onMouseDown,
				onWheel: this.onWheel,
			},
				e(ToolIcon, {
					transX: this.state.translateX,
					transY: this.state.translateY,
					scale: this.state.scale
				}),
				e('rect', {
					x: toolX,
					y: toolY,
					width: 10*this.state.scale,
					height: 20*this.state.scale
				})
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
			dragging: false,
			toolClass: 'Expression',
			name: 'x1',
			position: {x: 150, y: 200},
			notes: '',
			formula: 'pi * 2',
			result: '6.28'
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
    this.setState({dragging: false})
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
		}
	}

	render() {
		let t = this.props.t;
		return e('rect', {
			id: 'dgm-svg-bg',
			onMouseDown: this.onMouseDown,
			x: (this.state.position.x + this.props.transX)*this.props.scale,
			y: (this.state.position.y + this.props.transY)*this.props.scale,
			width: 60*this.props.scale,
			height: 20*this.props.scale
		});
	}
}