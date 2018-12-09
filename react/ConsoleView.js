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
		};
		this.handleChange = this.handleChange.bind(this);
		this.handleKeyPress = this.handleKeyPress.bind(this);
	}
		
  handleChange(event) {
    this.setState({input: event.target.value});
	}
	
	handleKeyPress(event) {
		if (event.key == 'Enter') {
			this.props.doCommand(this.state.input);
			this.setState({input:''});
		}
	}
	
	render() {
		return e('div', {className:'console-view'},
			e('div', {className:'console-result'},
				this.props.output,
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