'use strict';

import {UnitPicker} from './UnitsView.js';
import {functionPickerData} from './FunctionPickerData.js';

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
						t: t,
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

function FunctionPicker(props) {
	let t = props.t;
	let sections = [];
	const data = functionPickerData();
	let sectionKey = 0;
	const [selectedSection, setSelectedSection] = useState('');
	const [selectedFunction, setSelectedFunction] = useState('');
	for (let section of data.sections) {
		let commentCmp;
		let functions = [];
		if (section.header === selectedSection) {
			if (section.comment) {
				commentCmp = e(
					'div', {
						className: 'f-picker__comment',
						dangerouslySetInnerHTML: {__html: section.comment}
					}
				)
			}
			let fKey = 0;
			for (let f of section.functions) {
				let functionDescription;
				if (f.f === selectedFunction) {
					functionDescription = [
						e(
							'div', {
								id: 'f-picker__f-desc',
								key: 'desc',
								dangerouslySetInnerHTML: {__html: f.desc},
							},
						),
						e(
							'div', {
								id: 'f-picker__insert',
								key: 'button',
							},
							e(
								'button', {
									onClick: e => {
										props.apply(f.f);
									}
								},
								t('react:funcPickerInsert'),
							)
							)
					];
				}
				const funcCmp = e(
					'div', {
						className: 'f-picker__f',
						key: fKey++,
						onClick: e => {
							if (f.f === selectedFunction) {
								setSelectedFunction('');
							}
							else {
								setSelectedFunction(f.f);
							}
						}
					},
					e(
						'div', {
							className: 'f-picker__f-def',
						},
						f.f,
					),
					functionDescription
				)
				functions.push(funcCmp);
			}
		}
		const sectionCmp = e(
			'div', {
				className: 'f-picker__section',
				key: sectionKey++,
			},
			e(
				'div', {
					className: 'f-picker__section-header',
					onClick: e => {
						if (section.header === selectedSection) {
							setSelectedSection('');
						}
						else {
							setSelectedSection(section.header);
						}
						setSelectedFunction('');
					}
				},
				section.header,
			),
			commentCmp,
			functions
		);
		sections.push(sectionCmp);
	}

	return e(
		'div', {
			id: 'f-picker',
		},
		e(
			'div', {
				id: 'f-picker__header',
			},
			e(
				'div', {
					id: 'f-picker__title',
				},
				data.title,
			),
			e(
				'button', {
					id: 'f-picker__cancel',
					onClick: e => {
						e.preventDefault();
						props.cancel();
					},
				},
				t('react:cancel'),
			),	
		),
		e(
			'div', {
				id: 'f-picker__scroll-area',
			},
			e(
				'div', {
					id: 'f-picker__instructions',
					dangerouslySetInnerHTML: { __html: data.instructions},
				}
			),
			sections
		)
	)
}

export function FormulaEditor(props) {
	let t = props.t;

	const [formula, setFormula] = useState(props.viewInfo.formula);
	const [display, setDisplay] = useState(FormulaDisplay.editor);
	const offset = props.viewInfo.formulaOffset
	const [selection, setSelection] = useState([offset,offset]);
	const inputRef = React.useRef(null);

	/* Need to save state when this component is unmounted when view pushed over it
		or the info view is expanded or diagram shown. A useEffect will use information
		stored in saveRef to save the state in the viewInfo
	*/
	const saveRef = React.useRef({});

	useEffect(() => {
		if (display === FormulaDisplay.editor) {
			inputRef.current.focus();
		}
		saveRef.current.display = display;
	}, [display]);

	useEffect(() => {
		inputRef.current.setSelectionRange(selection[0], selection[1]);
		saveRef.current.selection = selection;
	}, [selection]);

	useEffect(() => {
		saveRef.current.formula = formula;
	}, [formula]);

	useEffect(() => {
		// recover state on mount if it was saved in viewInfo
		if (props.viewInfo.savedState) {
			const saved = props.viewInfo.savedState;
			setFormula(saved.formula);
			setDisplay(saved.display);
			setSelection(saved.selection);
		}
		return () => {
			// save state in viewInfo

			// get the selection from the inputRef
			const selectionStart = inputRef.current.selectionStart;
			const selectionEnd = inputRef.current.selectionEnd;

			props.viewInfo.savedState = {
				formula: saveRef.current.formula,
				display: saveRef.current.display,
				selection: [selectionStart, selectionEnd]
			};
		}
	}, []);

	const applyChanges = (formula) => {
		const path = props.viewInfo.path;
		props.actions.doCommand(`__blob__${path} set formula__blob__${formula}`, (cmds) => {
			props.actions.popView();
		});
	}

	const editComponent = e(
		// this is always rendered to keep cursor position/selection, but is hidden if display != editor
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
					onClick: e => {
						const selectionStart = inputRef.current.selectionStart;
						const selectionEnd = inputRef.current.selectionEnd;
						setSelection([selectionStart, selectionEnd]);
						setDisplay(FormulaDisplay.functiions);
					}
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
				onChange: (e) => {
					// keeps input field in sync
					setFormula(e.target.value);
				},
				onKeyDown: e => {
					// watches for Shift Enter and sends command when it see it
					if (e.shiftKey && e.key == 'Enter') {
						e.preventDefault();
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
		case FormulaDisplay.functiions:
			displayComponent = e(
				FunctionPicker, {
					t: props.t,
					actions: props.actions,
					cancel: () => {
						setDisplay(FormulaDisplay.editor);
					},
					apply: (f) => {
						const current = formula;
						const selectionStart = inputRef.current.selectionStart;
						const selectionEnd = inputRef.current.selectionEnd;
						const newFormula = `${current.substring(0, selectionStart)}${f}${current.substring(selectionEnd)}`;
						setFormula(newFormula);
						setDisplay(FormulaDisplay.editor);
						const newSelection = selectionStart + f.length -1;
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
