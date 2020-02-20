'use strict';

import {UnitPicker} from './UnitsView.js';

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

/**
 * Enum for formula display types.
 * @readonly
 * @enum {string}
 */
const FormulaDisplay = Object.freeze({
	editor: 0,
	units: 1,
	functiions: 2,
	values: 3
});


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
	const [display, setDisplay] = useState(FormulaDisplay.editor);
	const offset = props.viewInfo.formulaOffset
	const [selection, setSelection] = useState([offset,offset]);
	const inputRef = React.useRef(null);

	// useEffect(() => {
	// 	const offset = props.viewInfo.formulaOffset
	// 	inputRef.current.setSelectionRange(offset, offset);
	// 	inputRef.current.focus();
	// }, []);

	useEffect(() => {
		if (display === FormulaDisplay.editor) {
			inputRef.current.focus();
		}
	}, [display]);

	useEffect(() => {
		inputRef.current.setSelectionRange(selection[0], selection[1]);
	}, [selection]);

	const applyChanges = (formula) => {
		const path = props.viewInfo.path;
		props.actions.doCommand(`__blob__${path} set formula__blob__${formula}`, (cmds) => {
			props.actions.popView();
		});
	}

	const editComponent = e(
		'div', {
			id: 'formula-editor__edit',
			style: {
				display: display === FormulaDisplay.editor ? 'grid' : 'none',
			}
		},
		e(
			'div', {
				id: 'formula-editor__toolbar',
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
					onClick: e => {
						const selectionStart = inputRef.current.selectionStart;
						const selectionEnd = inputRef.current.selectionEnd;
						setSelection([selectionStart, selectionEnd]);
						setDisplay(FormulaDisplay.units);
					}
				},
				'"u"'
			),
			e(
				'button', {
					className: 'formula-editor__toolbar-functions',
				},
				'{f}}'
			),
		),
		e(
			'textarea', {
				ref: inputRef,
				value: formula,
				id: "formula-editor__editor",
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
		),
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

	let displayComponent;
	switch (display) {
		case FormulaDisplay.units:
			displayComponent = e(
				UnitPicker, {
					t: props.t,
					actions: props.actions,
					cancel: () => {
						setDisplay(FormulaDisplay.editor);
					},
					apply: (unit) => {
						const current = formula;
						const selectionStart = inputRef.current.selectionStart;
						const selectionEnd = inputRef.current.selectionEnd;
						const newFormula = `${current.substring(0, selectionStart)}"${unit}"${current.substring(selectionEnd)}`;
						setFormula(newFormula);
						setDisplay(FormulaDisplay.editor);
						const newSelection = selectionStart + unit.length + 2;
						setSelection([newSelection, newSelection]);
					}
				}
			);
			break;
	}


	const wrapper = e(
		'div', {
			id: 'formula-editor',
		},
		editComponent,
		displayComponent
	);

	return wrapper;
}
