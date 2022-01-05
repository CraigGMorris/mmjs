/*
	This file is part of Math Minion, a javascript based calculation program
	Copyright 2021, Craig Morris

	Math Minion is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Math Minion is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with Math Minion.  If not, see <https://www.gnu.org/licenses/>.
*/
'use strict';

import {UnitPicker} from './UnitsView.js';
import {functionPickerData} from './FunctionPickerData.js';
import {TableView} from './TableView.js';

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
	return e(
		'div', {
			className: 'formula-field',
		},
		e(
			'div', {
				className: 'formula-field__text-display',
				onClick: e => {
					e.stopPropagation();
					let offset = window.getSelection().anchorOffset;
					offset = Math.max(0, offset);
					if (props.clickAction) {
						props.clickAction(offset);
					}
				}
				},
			props.formula.slice(0,200)
		),
		e(
			'div', {
				className: 'formula-field__refresh',
				onClick: e => {
					e.stopPropagation();
					props.actions.doCommand(`${props.path} refresh`, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
					});
				},
			},
			'='
		)
	);
}

export function FormulaInputField(props) {
	const [formula, setFormula] = useState(props.formula !== undefined ? props.formula : props.viewInfo.formula);

	useEffect(() => {
		setFormula(props.formula !== undefined ? props.formula : props.viewInfo.formula);
	}, [props.formula]);

	const applyChanges = (formula) => {
		formula = formula.replace(/[“”]/g,'"');	// defeat smart quotes
		const f = props.applyChanges ? props.applyChanges : props.viewInfo.applyChanges;
		f(formula);
	}

	return e(
		'div', {
			className: 'formula-input-field',
		},
		e(
			'input', {
				className: 'formula-field__text-display',
				value: formula.slice(0,200) || '',
				width: props.infoWidth - 25,
				title: props.t('react:formulaFieldInputHover'),
				onChange: (event) => {
					// keeps input field in sync
					setFormula(event.target.value);
				},
				onKeyDown: e => {
					if (e.key == 'Enter') {
						if (e.shiftKey ) {
							// watches for Shift Enter and sends command when it see it
							e.preventDefault();
							e.stopPropagation();
							let offset = window.getSelection().anchorOffset;
							offset = Math.max(0, offset);
							if (props.editAction) {
								props.editAction(offset);
							}
								return;
						}
						else {
							// watches for Enter and applys changes when it see it
							e.preventDefault();
							applyChanges(formula);
							return;
						}
					}
				},
				onBlur: e => {
					applyChanges(formula);
				},

				onFocus: e => {
					if (formula.length > 100 || formula.includes('\n')) {
						e.stopPropagation();
						let offset = window.getSelection().anchorOffset;
						offset = Math.max(0, offset);
						if (props.editAction) {
							props.editAction(offset);
						}
					}
					else {
						if (props.gotFocusAction) {
							props.gotFocusAction();
						}
					}
				}
			},
		),
		e(
			'div', {
				className: 'formula-field__refresh',
				onClick: e => {
					e.stopPropagation();
					props.actions.doCommand(`${props.path} refresh`, () => {
						props.actions.updateView(props.viewInfo.stackIndex);
					});
				},
			},
			'='
		),
		e(
			'div', {
				className: 'formula-field__edit-button',
				onClick: e => {
					e.stopPropagation();
					let offset = window.getSelection().anchorOffset;
					offset = Math.max(0, offset);
					if (props.editAction) {
						props.editAction(offset);
					}
				},
			},
			'⤢'			
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
									onClick: () => {
										props.apply(f.f, -1);
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
						onClick: () => {
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
					onClick: () => {
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

function ValuePicker(props) {
	const t = props.t;
	const [paramList, setParamList] = useState([]);
	const [selected, setSelected] = useState([]);
	useEffect(() => {
		const path = selected.join('');

		if (selected.length === 0 || path.endsWith('.')) {
			props.actions.doCommand(`${props.modelPath}.${path} get parameters`, (results) => {
				if (results.length && results[0].results) {
					setParamList(results[0].results);
				}
			});
		}
		else {
			setParamList([]);
		}
	},[props.actions, props.modelPath, selected])

	const selectParam = param => {
		setSelected([...selected, param]);
	}

	const selectSelection = targetSelection => {
		const newSelected = [];
		for (let s of selected) {
			newSelected.push(s);
			if (s === targetSelection) {
				break
			}
		}
		setSelected(newSelected);
	}

	const selectedCmps = [];
	for (let s of selected) {
		const cmp = e(
			'span', {
				className: 'value-picker__selection',
				key: s,
				onClick: () => {
					selectSelection(s)
				},
			},
			s
		)
		selectedCmps.push(cmp);
	}

	let paramCmps = [];
	for (let param of paramList) {
		const cmp = e(
			'div', {
				className: 'value-picker__param',
				key: param,
				onClick: () => {
					selectParam(param)
				},
			},
			param
		)
		paramCmps.push(cmp);
	}

	return e(
		'div', {
			id: 'value-picker',
		},
		e(
			'div', {
				id: 'value-picker__path-list'
			},
			e(
				'div', {
					id: 'value-picker__path-header',
				},
				t('react:valuePickerPathHeader')
			),
			e(
				'div', {
					id: 'value-picker__buttons'
				},
				e(
					'button', {
						id: 'value-picker__buttons-clear',
						onClick: () => {
							setSelected([]);
						}
					},
					t('react:valuePickerClearButton')
				),
				e(
					'button', {
						id: 'value-picker__buttons-cancel',
						onClick: e => {
							e.preventDefault();
							props.cancel();
						}
					},
					t('react:cancel'),
				),
				e(
					'button', {
						onClick: () => {
							let path = selected.join('');
							if (path.endsWith('.')) {
								path = path.substring(0, path.length - 1);
							}					
							props.apply(path, 0);
						}
					},
					t('react:valuePickerInsert'),
				),
			),
			selectedCmps,
		),
		e(
			'div', {
				id: 'value-picker__param-list'
			},
			e(
				'div', {
					id: 'value-picker__param-header',
				},
				t('react:valuePickerParamHeader')
			),
			paramCmps,
		)
	);
}

export function FormulaEditor(props) {
	let t = props.t;
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));

	const [formula, setFormula] = useState(props.formula !== undefined ? props.formula : props.viewInfo.formula);
	const [display, setDisplay] = useState(FormulaDisplay.editor);
	const offset = props.formulaOffset ? props.formulaOffset : props.viewInfo.formulaOffset
	const [selection, setSelection] = useState([offset,offset]);
	const [previewValue, setPreviewValue] = useState(props.value || '');
	const [errorMessage, setErrorMessage] = useState(null);

	// reference to editor textarea to keep track of selection and focus
	const inputRef = React.useRef(null);

	useEffect(() => {
		previewCurrent();
	}, []);

	useEffect(() => {
		if (display === FormulaDisplay.editor) {
			inputRef.current.focus();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [display]);

	useEffect(() => {
		inputRef.current.setSelectionRange(selection[0], selection[1]);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selection]);

	// useEffect(() => {
	// // eslint-disable-next-line react-hooks/exhaustive-deps
	// }, [formula]);

	const applyChanges = (formula) => {
		formula = formula.replace(/[“”]/g,'"');	// defeat smart quotes
		const f = props.applyChanges ? props.applyChanges : props.viewInfo.applyChanges;
		f(formula, () => {
			props.actions.popView();
		});
	}

	const previewErrorHandler = (s) => {
		setErrorMessage(s);
	}

	const updatePreview = () => {
		setErrorMessage(null);
		const selStart = inputRef.current.selectionStart;
		const selEnd = inputRef.current.selectionEnd;
		const f = (selStart === selEnd) ? formula : inputRef.current.value.substring(selStart, selEnd);
		props.actions.doCommand(`__blob__${props.viewInfo.path} fpreview__blob__${f}`, (results) => {
			if (results) {
				setPreviewValue(results[0].results);
			}
		}, previewErrorHandler);
	}

	const previewCurrent = () => {
		setErrorMessage(null);
		const f = props.formula !== undefined ? props.formula : props.viewInfo.formula;
		// setPreviewValue(props.value || '');
		if (f) {
			props.actions.doCommand(`__blob__${props.viewInfo.path} fpreview__blob__${f}`, (results) => {
				if (results) {
					setPreviewValue(results[0].results);
				}
			}, previewErrorHandler);	
		}
	}

	const pickerButtonClick = (picker) => {
			const selectionStart = inputRef.current.selectionStart;
			const selectionEnd = inputRef.current.selectionEnd;
			setSelection([selectionStart, selectionEnd]);
			setDisplay(picker);
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
					onClick: () => { pickerButtonClick(FormulaDisplay.values); }
				},
				'<v>'
			),
			e(
				'button', {
					className: 'formula-editor__toolbar-units',
					onClick: () => { pickerButtonClick(FormulaDisplay.units); }
				},
				'"u"'
			),
			e(
				'button', {
					className: 'formula-editor__toolbar-functions',
					onClick: () => { pickerButtonClick(FormulaDisplay.functiions); }
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
				spellCheck: "false",
				autoCorrect: "off",
				autoCapitalize: "none",
				autoComplete: "off",
				onChange: (e) => {
					// keeps input field in sync
					setFormula(e.target.value);
				},
				onKeyDown: e => {

					if (e.key == 'Enter') {
						if (e.shiftKey ) {
							// watches for Shift Enter and sends command when it see it
							e.preventDefault();
							applyChanges(formula);
							return;
						}
						else if (e.ctrlKey) {
							e.preventDefault();
							updatePreview();
							return;
						}
						else if (e.altKey) {
							e.preventDefault();
							previewCurrent();
							return;
						}
						else {
							const selStart = e.target.selectionStart;
							const selEnd = e.target.selectionEnd;
							if (selStart === selEnd) {
								let sel = selStart;
								const text = e.target.value;
								while (sel > 0 && text[sel - 1] !== '\n') {
									sel--;
								}
								const lineStart = sel;
								while (text[sel] === ' ' || text[sel] === '\t') {
									sel++;
								}
								if (sel > lineStart) {
									// Insert carriage return and indented text
									document.execCommand('insertText', false, "\n" + text.substr(lineStart, sel-lineStart));

									// Scroll caret visible
									e.target.blur();
									e.target.focus();
									e.preventDefault();
									return;
								}
							}
						}
					}
					else if (e.key === 'Escape') {
						e.preventDefault();
						if (props.cancelAction) {
							props.cancelAction();
						}
						else {
							props.actions.popView();
						}
					}
					else if (e.key === 'Tab') {
						let selStart = e.target.selectionStart;
						let selEnd = e.target.selectionEnd;
						const text = e.target.value;
						if (selStart === selEnd) {
							// These single character operations are undoable
							if (!e.shiftKey) {
								document.execCommand('insertText', false, "\t");
							} else {
								if (selStart > 0 && text[selStart-1] === '\t') {
									document.execCommand('delete');
								}
							}
						}
						else {
							// Block indent/unindent trashes undo stack.
							// Select whole lines
							while (selStart > 0 && text[selStart-1] != '\n') {
								selStart--;
							}
							while (selEnd > 0 && text[selEnd-1]!='\n' && selEnd < text.length) {
								selEnd++;
							}

							// Get selected text
							let lines = text.substr(selStart, selEnd - selStart).split('\n');

							// Insert tabs
							for (let i = 0; i < lines.length; i++) {
								// Don't indent last line if cursor at start of line
								if (i === lines.length-1 && lines[i].length === 0) {
									continue;
								}

								// Tab or Shift+Tab?
								if (e.shiftKey)
								{
									if (lines[i].startsWith('\t')) {
										lines[i] = lines[i].substr(1);
									} else if (lines[i].startsWith("    ")) {
										lines[i] = lines[i].substr(4);
									}
								}
								else
									lines[i] = "\t" + lines[i];
							}
							lines = lines.join('\n');

							// Update the text area
							e.target.value = text.substr(0, selStart) + lines + text.substr(selEnd);
							e.target.selectionStart = selStart;
							e.target.selectionEnd = selStart + lines.length; 
						}
						e.preventDefault();
						return;
					}
					// console.log(`key=${e.key}`);
				},
			}
		),
		e(
			'div', {
				id: 'formula-editor__actions',
			},
			e(
				'button', {
					id: 'formula-editor__cancel-button',
					title: t('react:formulaEditorCancelKey'),
					onClick: () => {
						if (props.cancelAction) {
							props.cancelAction();
						}
						else {
							props.actions.popView();
						}
					}
				},
				t('react:cancel')
			),
			e(
				'button', {
					id: 'formula-editor__apply-button',
					title: t('react:formulaEditorApplyKey'),
					onClick: () => {
						applyChanges(formula);
					}
				},
				t('react:formulaEditorApplyButton')
			),
			e(
				'button', {
					id: 'formula-editor__preview-button',
					title: t('react:formulaEditorPreviewKey'),
					onClick: updatePreview,
				},
				t('react:formulaEditorPreviewButton'),
			),
			e(
				'button', {
					id: 'formula-editor__current-button',
					title: t('react:formulaEditorCurrentKey'),
					onClick: previewCurrent,
				},
				t('react:formulaEditorCurrentButton'),
			)
		),
		e(
			'div', {
				id: 'formula-editor__preview-table',
			},
			errorMessage ? errorMessage : e(
				TableView, {
					id: 'formula-editor__previewtable',
					value: previewValue,
					viewInfo: props.viewInfo,
					viewBox: [0, 0, props.infoWidth - 2*nInfoViewPadding, 100],
				}
			),
		)
	);

	const apply = (value, cursorOffset) => {
		const current = formula;
		const selectionStart = inputRef.current.selectionStart;
		const selectionEnd = inputRef.current.selectionEnd;
		if (display === FormulaDisplay.units) {
			if (value.includes('-') || value.includes('/') || value.includes('^')) {
				value = `"${value}"`;
			}
		}
		const newFormula = `${current.substring(0, selectionStart)}${value}${current.substring(selectionEnd)}`;
		setFormula(newFormula);
		setDisplay(FormulaDisplay.editor);
		const newSelection = selectionStart + value.length + cursorOffset;
		setSelection([newSelection, newSelection]);
	}

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
					apply: apply,
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
					apply: apply,
				}
			);			
			break;

		case FormulaDisplay.values:
			displayComponent= e(
				ValuePicker, {
					t: props.t,
					actions: props.actions,
					modelPath: props.viewInfo.modelPath,
					cancel: () => {
						setDisplay(FormulaDisplay.editor);
					},
					apply: apply,
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
