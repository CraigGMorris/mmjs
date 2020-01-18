'use strict';

const e = React.createElement;

/**
 * @class FormulaField
 * common field for displaying and entering formulas
 */
export class FormulaField extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			formula: this.props.formula,
			formulaHasFocus: false
		};
		this.handleChange = this.handleChange.bind(this);
		this.handleKeyPress = this.handleKeyPress.bind(this);
	}

	// need to update state formula if component updated when focus is not on input
	// undo and redo could change the formula without the input field knowing
	componentDidUpdate() {
		if (!this.state.formulaHasFocus && this.state.formula !== this.props.formula) {
			this.setState({formula: this.props.formula});
		}
	}

	/** @method handleChange
	 * keeps input field in sync
	 * @param {Event} event
	 */
  handleChange(event) {
		const value = event.target.value;
		this.setState({formula: value});
	}
	
	/** @method handleKeyPress
	 * watches for Enter and sends command when it see it
	 * @param {Event} event
	 */
	handleKeyPress(event) {
		if (event.key == 'Enter') {
			const path = this.props.path;
			const newFormula = this.state.formula;
			this.props.actions.doCommand(`${path} set formula ${newFormula}`, (cmds) => {
				this.props.actions.updateView(this.props.viewInfo.stackIndex);
			});
		}
	}

	render() {
		let t = this.props.t;
		return e('input', {
			// value: this.state.formulaHasFocus ? this.state.formula : this.props.formula,
			value: this.state.formula,
			placeholder: t('react:formulaValueUnknown'),
			onChange: this.handleChange,
			onKeyPress: this.handleKeyPress,
			onFocus: e => {
				this.setState({formulaHasFocus: true});
			},
			onBlur: e => {this.setState({formulaHasFocus: false})}
		});
	}
}
