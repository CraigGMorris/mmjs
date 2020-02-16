'use strict';

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

/**
 * common field for displaying and entering formulas
 */
export function FormulaField(props) {
	let t = props.t;

	return e(
		'div', {
			className: 'formula-field'
		},
		e(
			'div', {
				className: 'formula-field__text-display',
				onClick: e => {
					let offset = window.getSelection().anchorOffset;
					offset = offset < 2 ? 0 : offset - 2;
					props.actions.pushView('formulaEditor', props.path, {
						formula: props.formula,
						formulaOffset: offset,
						formulaName: props.formulaName,
						path: props.path,
					});
				}
			},
			'= ' + props.formula
		),
		e(
			'div', {
				className: 'formula-field__refresh',
			},
			'\u21A9'
		)
	);
}

export function FormulaEditor(props) {
	let t = props.t;

	const [formula, setFormula] = useState(props.viewInfo.formula);
	const inputRef = React.useRef(null);

	useEffect(() => {
		const offset = props.viewInfo.formulaOffset
		inputRef.current.setSelectionRange(offset, offset);
		inputRef.current.focus();
	}, []);

	const applyChanges = (formula) => {
		const path = props.viewInfo.path;
		props.actions.doCommand(`__blob__${path} set formula__blob__${formula}`, (cmds) => {
			props.actions.popView();
		});
	}

	const inputField = e(
		'textarea', {
			ref: inputRef,
			value: formula,
			className: "formula-editor__input",
			placeholder: t('react:formulaValueUnknown'),
			onChange: (event) => {
				// keeps input field in sync
				setFormula(event.target.value);
			},
			onKeyDown: event => {
				// watches for Enter and sends command when it see it
				if (event.shiftKey && event.key == 'Enter') {
					applyChanges(formula);
				}
			},
		}
	);

	const wrapper = e(
		'div', {
			id: 'formula-editor',
		},
		e(
			'div', {
				className: 'formula-editor__toolbar',
			},
			e(
				'button', {
					className: 'formula-editor__toolbar-values',
				},
				'<v>'
			),
			e(
				'button', {
					className: 'formula-editor__toolbar-units',
				},
				'"u"'
			),
			e(
				'button', {
					className: 'formula-editor__toolbar-functions',
				},
				'{f}}'
			),
			e(
				'button', {
					className: 'formula-editor__toolbar-editor',
				},
				'Edit'
			),
		),
		inputField,
		e(
			'button', {
				id: 'formula-editor__apply',
				onClick: e => {
					applyChanges(formula);
				}
			},
			t('react:applyChanges')
		)
	);

	return wrapper;
}
