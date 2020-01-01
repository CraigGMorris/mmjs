'use strict';

const e = React.createElement;

/**
 * @class FormulaField
 * common field for displaying and entering formulas
 */
export class FormulaField extends React.Component {
	constructor(props) {
		super(props);
		// need name so there is no conflict in viewInfo between different formula fields
		// in the same tool view
		this.formulaName = this.props.formulaName;

		// check and see if a modified input is saved - may be reshowing view that had another view pushed over it
		let formula
		if (this.props.viewInfo.viewState[this.formulaName]) {
			formula = this.props.viewInfo.viewState[this.formulaName];
		}
		else {
			formula = this.props.formula;
		}
		let state = {};
		state[this.formulaName] = formula;
		this.props.actions.setViewInfoState(state);

		this.handleChange = this.handleChange.bind(this);
		this.handleKeyPress = this.handleKeyPress.bind(this);
	}

	/** @method handleChange
	 * keeps input field in sync
	 * @param {Event} event
	 */
  handleChange(event) {
		const value = event.target.value;
		let state = {};
		state[this.formulaName] = value;
		this.props.actions.setViewInfoState(state);
	}
	
	/** @method handleKeyPress
	 * watches for Enter and sends command when it see it
	 * @param {Event} event
	 */
	handleKeyPress(event) {
		if (event.key == 'Enter') {
			const path = this.props.path;
			const newFormula = this.props.viewInfo.viewState[this.formulaName];
			this.props.actions.doCommand(`${path} set formula ${newFormula}`, (cmds) => {
				this.props.actions.updateViewState(this.props.viewInfo.stackIndex);
			});
		}
	}

	render() {
		let t = this.props.t;
		return e('input', {
			value: this.props.viewInfo.viewState[this.formulaName],
			placeholder: t('react:formulaValueUnknown'),
			onChange: this.handleChange,
			onKeyPress: this.handleKeyPress
		});
	}
}
