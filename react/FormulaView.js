'use strict';

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

/**
 * common field for displaying and entering formulas
 */
export function FormulaField(props) {
	let t = props.t;

	const [formula, setFormula] = useState(props.formula);
	const [inputHasFocus, setInputHasFocus] = useState(false);

	// need to update state formula if component updated when focus is not on input
	// undo and redo could change the formula without the input field knowing
	useEffect(() => {
		if (!inputHasFocus && formula !== props.formula) {
			setFormula(props.formula);
		}
	});

	return e(
		'input', {
			value: formula,
			placeholder: t('react:formulaValueUnknown'),
			onChange: (event) => {
				// keeps input field in sync
				setFormula(event.target.value);
			},
			onKeyPress: event => {
				// watches for Enter and sends command when it see it
				if (event.key == 'Enter') {
					const path = props.path;
					props.actions.doCommand(`${path} set formula ${formula}`, (cmds) => {
						props.actions.updateView(props.viewInfo.stackIndex);
					});
				}
			},
			onFocus: e => {
				setInputHasFocus(true);
			},
			onBlur: e => { setInputHasFocus(false) }
		}
	);
}
