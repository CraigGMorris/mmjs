const e = React.createElement;

/**
 * @class ConsoleView
 * accepts command line inputs and displays result
 */
export class ConsoleView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			input: '',
			output: ''
		};
		this.handleChange = this.handleChange.bind(this);
		this.handleKeyPress = this.handleKeyPress.bind(this);
		this.callBack = this.callBack.bind(this);
		this.props.doCommand('info', this.callBack);
	}

	/** @method callBack - called when the worker completes command
	 * @param {MMCommand[]} cmds
	 */
	callBack(cmds) {
		let lines = []
		for (let r of cmds) {
			let output = r;
			if (typeof output != 'string') {
				output = JSON.stringify(output, null, ' ');
			}
			lines.push(output);
		}
		this.setState((state) => { return {output: lines.join('\n')};});
	}
	
	/** @method handleChange
	 * keeps input field in sync
	 * @param {Event} event
	 */
  handleChange(event) {
    this.setState({input: event.target.value});
	}
	
	/** @method handleKeyPress
	 * watches for Enter and sends command when it see it
	 * @param {Event} event
	 */
	handleKeyPress(event) {
		if (event.key == 'Enter') {
			this.props.doCommand(this.state.input, (cmds) => {
				let lines = []
				for (let r of cmds) {
					let output = r;
					if (typeof output != 'string') {
						output = JSON.stringify(output, null, ' ');
					}
					lines.push(output);
				}
				this.setState((state) => { return {output: lines.join('\n')};});
			});
			this.setState({input:''});
		}
	}
	
	render() {
		return e('div', {className:'console-view'},
			e('div', {className:'console-result'},
				this.state.output,
			),
			e('div', {className:'console-input'},
				e('input', {
					id: 'console-input-field',
					value: this.state.input,
					onChange: this.handleChange,
					onKeyPress: this.handleKeyPress
				})
			)
		);
	}
}