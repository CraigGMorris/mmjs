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
	functiions: 2
});

const replaceSmartQuotes = (f) => {
	f = f.replace(/[“”]/g,'"');	// defeat smart quotes
	f = f.replace(/[‘’]/g, "'");
	return f;
}

export function FormulaField(props) {
	const [formula, setFormula] = useState(props.formula !== undefined ? props.formula : props.viewInfo.formula);
	const [initialFormula, setInitialFormula] = useState('');
	const [nameSpace, setNameSpace] = useState('');
	const [renameTo, setRenameTo] = useState('');

	const isExpression = props.viewInfo.viewKey === 'Expression';
	useEffect(() => {
		if (props.formula === '' &&
			props.viewInfo &&
			isExpression &&
			fieldInputRef.current)
		{
			fieldInputRef.current.focus();
		}
	}, []);

	useEffect(() => {
		const f = props.formula !== undefined ? props.formula : props.viewInfo.formula;
		setFormula(f);
		setInitialFormula(f);
	}, [props.formula]);

	useEffect(() => {
		const results = props.viewInfo.updateResults[0]
		if (results && results.results) {
			const modelPath = results.results.modelPath;
			setNameSpace(modelPath);
		}
		
	}, [props.viewInfo.updateResults]);

	const latestFormula = React.useRef(null);
  useEffect(() => {
    latestFormula.current = formula;
  }, [formula]);
	const latestInitial = React.useRef(null);
  useEffect(() => {
    latestInitial.current = initialFormula;
  }, [initialFormula]);

	const isSwitchingToEditor = React.useRef(false);

	useEffect(() => {
		return () => {
			if (!isSwitchingToEditor.current && latestFormula.current !== latestInitial.current) {
				const fNew = replaceSmartQuotes(latestFormula.current);
				const f = props.applyChanges ? props.applyChanges : props.viewInfo.applyChanges;
				f(fNew);
			}
		};
	}, []);

	const fieldInputRef = React.useRef(null);

	const applyChanges = (formula) => {
		formula = replaceSmartQuotes(formula);
		if (formula !== initialFormula) { // only apply if changed
			const f = props.applyChanges ? props.applyChanges : props.viewInfo.applyChanges;
			f(formula);
		}
	}

	const editOptions = {
		formula: formula,
		initialFormula: initialFormula,
		nameSpace: nameSpace,
	};

	return e(
		'div', {
			className: 'formula-input-field',
			onBlur: e => {
				applyChanges(formula);
			},
		},
		e(
			'input', {
				className: 'formula-field__text-display',
				ref: fieldInputRef,
				value: formula.slice(0,200) || '',
				width: String(props.infoWidth - 25),
				title: props.t('react:formulaFieldInputHover'),
				onChange: (event) => {
					// keeps input field in sync
					setFormula(event.target.value);
				},
				onKeyDown: e => {
					if (e.code == 'Enter') {
						if (e.shiftKey ) {
							// watches for Shift Enter and sends command when it see it
							e.preventDefault();
							e.stopPropagation();
							let selStart = e.target.selectionStart;
							editOptions.selectionStart = Math.max(0, selStart);
							let selEnd = fieldInputRef.current.selectionEnd;
							editOptions.selectionEnd = Math.max(selStart, selEnd);
							isSwitchingToEditor.current = true;
							if (props.editAction) {
								props.editAction(editOptions);
							}
							return;
						}
						else {
							// watches for Enter and applys changes when it see it
							e.preventDefault();
							applyChanges(formula);
							// fieldInputRef.current.blur();
							return;
						}
					}
				},

				onFocus: e => {
					if (formula.length > 100 || formula.includes('\n')) {
						e.stopPropagation();
						let selStart = e.target.selectionStart;
						editOptions.selectionStart = Math.max(0, selStart);
						let selEnd = fieldInputRef.current.selectionEnd;
						editOptions.selectionEnd = Math.max(selStart, selEnd);
						if (props.editAction) {
							props.editAction(editOptions);
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
					let selStart = fieldInputRef.current.selectionStart;
					editOptions.selectionStart = Math.max(0, selStart);
					let selEnd = fieldInputRef.current.selectionEnd;
					editOptions.selectionEnd = Math.max(selStart, selEnd);
					if (props.editAction) {
						isSwitchingToEditor.current = true;
						props.editAction(editOptions);
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

export function FormulaEditor(props) {
	let t = props.t;
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));

	const [display, setDisplay] = useState(FormulaDisplay.editor);
	const editOptions = props.editOptions || {};
	const [formula, setFormula] = useState(editOptions.formula || '');
	const selStart = editOptions.selectionStart ? editOptions.selectionStart : 0;
	const selEnd = editOptions.selectionEnd ? editOptions.selectionEnd : selStart;
	const [selection, setSelection] = useState([selStart,selEnd]);
	const [previewValue, setPreviewValue] = useState(props.value || '');
	const [previewingCurrent, setPreviewingCurrent] = useState(true);
	const [errorMessage, setErrorMessage] = useState(null);
	const [previewParam, setPreviewParam] = useState(null);
	// following is used to trigger text parsing for preview - updated on anything that
	// could change caret position.
	const [eventHitCount, setEventHitCount] = useState(0);
	const [justTest, setJustTest] = useState(null);

	// reference to editor textarea to keep track of selection and focus
	const editInputRef = React.useRef(null);
//	const normalClose = React.useRef(false);

	useEffect(() => {
		previewCurrent();
		setPreviewingCurrent(true);
	}, []);

	const latestFormula = React.useRef(null);
  useEffect(() => {
    latestFormula.current = formula;
  }, [formula]);

	useEffect(() => {
		return () => {
			if (latestFormula.current !== props.editOptions.initialFormula) {
				const formula = replaceSmartQuotes(latestFormula.current);
				const f = props.applyChanges ? props.applyChanges : props.viewInfo.applyChanges;
				f(formula);
			}
		};
	}, []);

	useEffect(() => {
		if (display === FormulaDisplay.editor) {
			editInputRef.current.focus();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [display]);

	useEffect(() => {
		editInputRef.current.setSelectionRange(selection[0], selection[1]);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selection]);

	const makeParamPreview = (path, start='') => {
		if (editOptions.nameSpace) {
			props.actions.doCommand(`${editOptions.nameSpace}.${path} parampreview ${path}:${start}`, (results) => {
				if (results.length && results[0].results) {
					const eligible = JSON.parse(results[0].results);
					if (eligible.length) {
						setPreviewParam(eligible);
						return;
					}
				}
				setPreviewParam(null);
			});
		}
	}

	const makeUnitPreview = (prefix) => {
		props.actions.doCommand('/unitsys.units list', (results) => {
			if (results.length && results[0].results) {
				const units = results[0].results;
				let eligible = [];
				if (prefix) {
					for (const unit of units) {
						if (unit.toLowerCase().startsWith(prefix.toLowerCase())) {
							eligible.push(unit);
						}
					}
				}
				else {
					eligible = units;
				}
				if (eligible.length) {
					setPreviewParam(eligible);
					return;
				}
			}
			setPreviewParam(null);
		});	
	}

	const makeFunctionPreview = (start) => {
		const data = functionPickerData();
		const prefix = '{' + start;
		const functions = new Set();
		for (const header of data.sections) {
			for (const func of header.functions) {
				if (func.f.startsWith(prefix)) {
					functions.add(func.f);
				}
			}
		}
		if (functions.size) {
			setPreviewParam(Array.from(functions).sort());
		}
		else {
			setPreviewParam(null);
		}
	}

	useEffect(() => {
		const target = editInputRef.current;
		let selStart = target.selectionStart;
		const targetValue = target.value;
		// check that it isn't all string and there is no selection
		if ((targetValue.length && targetValue[0] === "'") || selStart !== target.selectionEnd) {
			setPreviewParam(null);
			return;
		}

		const currentChar = targetValue[selStart-1];

		// see if in conversion unit
		if (targetValue.length) {
			const unitRegex = /[\w^/-]+/;
			let selTemp = selStart - 1;
			while (selTemp >= 0 && targetValue[selTemp].match(unitRegex)) {
				selTemp--;
			}
			if (selTemp >= 0 && targetValue[selTemp] === ' ') {
				selTemp--;
				if (selTemp >= 0 && targetValue[selTemp].match(/[\d.]/)) {
					// probably in unit
					let selTemp = selStart - 1;
					while (selTemp >= 0 && targetValue[selTemp].match(/[\w]/)) {
						selTemp--;
					}
							const prefix = targetValue.substring(selTemp+1, selStart);
					makeUnitPreview(prefix);
					return;
				}
			}
		}
		
		if (currentChar === '?') {
			// maybe looking for function description
			let selTemp = selStart - 2;
			while(selTemp >= 0 && targetValue[selTemp].match(/[\s\w]/)) {
				selTemp--;
			}
			if (selTemp >= 0 && targetValue[selTemp] === '{') {
				// is function
				const fName = targetValue.substring(selTemp + 1, selStart - 2).trim().toLowerCase();
				const data = functionPickerData();
				// search for name
				const re = new RegExp(`^\\{${fName}[ }]`);
				for (const header of data.sections) {
					for (const func of header.functions) {
						if (func.f.match(re)) {
							setPreviewParam([`<p><b>${func.f}</b></p>${func.desc}`]);
							return;
						}
					}
				}
			}
		}
		if (currentChar && currentChar.match(/[,+*:%(\/\-\^\[]/)) {
			// operator or paren or bracket etc - show all
			makeParamPreview('','');
			return;
		}
		
		const pathChars = [];
		const pathRegex = /[\w.]/;
		while (selStart-- > 0) {
			const char = targetValue[selStart];
			if (char.match(pathRegex)) {
				pathChars.push(char);
			}
			else {
				break;
			}
		}
		const originalSelStart = selStart;
		while (selStart >= 0 && targetValue[selStart].match(/\s/)) {
			selStart--;
		}
		if (selStart < originalSelStart) {
			// check to see if in function. if so restore a whitespace
			let fCheck = selStart;
			while (fCheck >= 0 && targetValue[fCheck].match(/\w/)) {
				fCheck--;
			}
			if (fCheck >= 0 && targetValue[fCheck] === '{') {
				selStart++; 
			}
		}

		const prevChar = selStart >= 0 ? targetValue[selStart] : '';
		const pathTokens = pathChars.reverse().join('').split('.');
		const start = pathTokens.pop().toLowerCase();
		const path = pathTokens.join('.');
		// ensure the path is preceded by appropriate operator
		if (prevChar === '{') {
			makeFunctionPreview(start);
			return;
		}
		if (prevChar && !prevChar.match(/[,\s+*:%(\/\-\^\[]/)) {
			setPreviewParam(null);
			return;
		}
		makeParamPreview(path, start);
	},[eventHitCount, formula]);

	const applyChanges = (formula) => {
		formula = replaceSmartQuotes(formula);
		latestFormula.current = props.editOptions.initialFormula; // block the unmount action
		const f = props.applyChanges ? props.applyChanges : props.viewInfo.applyChanges;
		f(formula);
	}

	const previewErrorHandler = (s) => {
		setErrorMessage(s);
	}

	const updatePreview = () => {
		setErrorMessage(null);
		setPreviewParam(null);
		const selStart = editInputRef.current.selectionStart;
		const selEnd = editInputRef.current.selectionEnd;
		let f = (selStart === selEnd) ? formula : editInputRef.current.value.substring(selStart, selEnd);
		f = replaceSmartQuotes(f);
		const nameSpace = editOptions.nameSpace;
		props.actions.doCommand(`__blob__${props.viewInfo.path} fpreview ${nameSpace}__blob__${f}`, (results) => {
			if (results) {
				setPreviewValue(results[0].results);
				setPreviewingCurrent(false);
			}
		}, previewErrorHandler);
	}

	const previewCurrent = () => {
		setErrorMessage(null);
		setPreviewParam(null);
		const f = editOptions.initialFormula;
		const nameSpace = editOptions.nameSpace;
		if (typeof(f) ===  "string") {
			props.actions.doCommand(`__blob__${props.viewInfo.path} fpreview ${nameSpace}__blob__${f}`, (results) => {
				if (results) {
					setPreviewValue(results[0].results);
					setPreviewingCurrent(true);
				}
			}, previewErrorHandler);	
		}
	}

	const pickerButtonClick = (picker) => {
			const selectionStart = editInputRef.current.selectionStart;
			const selectionEnd = editInputRef.current.selectionEnd;
			setSelection([selectionStart, selectionEnd]);
			setDisplay(picker);
	}

	const onFocusHandler = event => {
		if (!event.target.value.length) {
			makeParamPreview('','');
		}
	}

	const onClickHandler = event => {
		setEventHitCount(eventHitCount+1);
	}

	const keyDownHandler = event => {
		if (event.code.startsWith('Arrow')) {
			setEventHitCount(eventHitCount+1);
		}
		if (event.key === 'u' && event.ctrlKey) {
			pickerButtonClick(FormulaDisplay.units);
		}
		else if (event.key === 'f' && event.ctrlKey) {
			pickerButtonClick(FormulaDisplay.functiions);
		}
		else if (event.code === 'Enter') {
			if (event.ctrlKey) {
				event.preventDefault();
				updatePreview();
				return;
			}
			if (event.shiftKey ) {
				// watches for Shift Enter and sends command when it see it
				event.preventDefault();
				applyChanges(formula);
				return;
			}
			else if (event.altKey) {
				event.preventDefault();
				previewCurrent();
				return;
			}
			else {
				const selStart = event.target.selectionStart;
				const selEnd = event.target.selectionEnd;
				if (selStart === selEnd) {
					let sel = selStart;
					const text = event.target.value;
					while (sel > 0 && text[sel - 1] !== '\n') {
						sel--;
					}
					const lineStart = sel;
					while (text[sel] === ' ' || text[sel] === '\t') {
						sel++;
					}
					if (sel > lineStart) {
						// Insert carriage return and indented text
						const insertPoint = selStart
						const insertValue = "\n" + text.substr(lineStart, sel-lineStart);
						const firstPart = text.substring(0, insertPoint);
						const lastPart = text.substring(insertPoint);
						setFormula(firstPart+insertValue+lastPart);
						const newSelection = insertPoint + insertValue.length;
						setSelection([newSelection, newSelection]);
				
						// Scroll caret visible
						event.target.blur();
						event.target.focus();
						event.preventDefault();
						return;
					}
				}
			}
		}
		else if (previewParam && previewParam.length && event.code === 'Period') {
			event.preventDefault();
			insertParam(previewParam[0] + '.');
		}
		else if (event.code === 'Escape') {
			event.preventDefault();
			latestFormula.current = props.editOptions.initialFormula;
			if (props.cancelAction) {
				props.cancelAction();
			}
			else {
				props.actions.popView();
			}
		}
		else if (event.code === 'Tab') {
			let selStart = event.target.selectionStart;
			let selEnd = event.target.selectionEnd;
			const text = event.target.value;
			if (selStart === selEnd) {
				// These single character operations are undoable
				if (!event.shiftKey) {
					if (previewParam && previewParam.length && selStart > 0 && text[selStart-1].match(/[{\w]/)) {
						insertParam(previewParam[0]);
					}
					else {
						const insertPoint = selStart
						const insertValue = "\t";
						const firstPart = text.substring(0, insertPoint);
						const lastPart = text.substring(insertPoint);
						setFormula(firstPart+insertValue+lastPart);
						const newSelection = insertPoint + insertValue.length;
						setSelection([newSelection, newSelection]);
					}
				}
				else {
					if (selStart > 0 && text[selStart-1] === '\t') {
						const firstPart = text.substring(0, selStart-1);
						const lastPart = text.substring(selStart);
						setFormula(firstPart+lastPart);
						const newSelection = selStart - 1;
						setSelection([newSelection, newSelection]);

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
					if (event.shiftKey)
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
				setFormula(text.substr(0, selStart) + lines + text.substr(selEnd));
				setSelection([selStart, selStart + lines.length]);
			}
			event.preventDefault();
			return;
		}
	}

	let previewComponent;
	if (previewParam) {
		if (previewParam[0].startsWith('<')) {
			// function description
			previewComponent = e(
				'div', {
					id: 'formula-editor__preview-func-desc',
					dangerouslySetInnerHTML: {__html: previewParam[0]}
				}
			)
		}
		else {
			const paramCmps = [];
			for (const p of previewParam) {
				paramCmps.push(e(
					'div', {
						className: 'formula-editor__value-preview-item',
						onClick: () => {
							insertParam(p);
						},
						key: p,
					},
					p
				));
			}
			previewComponent = e(
				'div', {
					id: 'formula-editor__preview-param',
				},
				paramCmps
			);
		}
	} else {
		previewComponent = e(
			'div', {
				id: 'formula-editor__preview-table',
			},
			e(
				'div', {
					id: 'formula-editor__preview-unit',
				},
				(previewingCurrent ? t('react:formulaEditorCurrentButton') : t('react:formulaEditorPreviewButton'))
				+
				(previewValue ?
					(previewValue.t === 's' ?
						' = String' : 
						(previewValue.unit ? 
							` = ${previewValue.unitType} : ${previewValue.unit}` :
							''
						)
					) :
					''),
			),
			errorMessage ? errorMessage : e(
				TableView, {
					id: 'formula-editor__previewtable',
					value: previewValue,
					viewInfo: props.viewInfo,
					viewBox: [0, 0, props.infoWidth - 2*nInfoViewPadding, 140],
				}
			),
		);
	}

	const editComponent = e(
		// this is always rendered to keep cursor position/selection, but is hidden if display != editor
		'div', {
			id: 'formula-editor__edit',
			style: {
				display: display === FormulaDisplay.editor ? 'grid' : 'none',
			},
		},
		e(
			'div', {
				id: 'formula-editor__toolbar',
			},
			e(
				'button', {
					id: 'formula-editor__cancel-button',
					title: t('react:formulaEditorCancelKey'),
					onClick: () => {
						latestFormula.current = props.editOptions.initialFormula;
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
					className: 'formula-editor__toolbar-units',
					title: t('react:formulaEditorUnitsHover'),
					onClick: () => { pickerButtonClick(FormulaDisplay.units); }
				},
				t('react:formulaEditorUnitsButton'),
			),
			e(
				'button', {
					className: 'formula-editor__toolbar-functions',
					title: t('react:formulaEditorFunctionsHover'),
					onClick: () => { pickerButtonClick(FormulaDisplay.functiions); }
				},
				t('react:formulaEditorFunctionsButton'),
			),
		),
		e(
			'textarea', {
				ref: editInputRef,
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
				onKeyDown: keyDownHandler,
				onFocus: onFocusHandler,
				onClick: onClickHandler,
			}
		),
		e(
			'div', {
				id: 'formula-editor__actions',
			},
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
		previewComponent,
	);

	const insertParam = (value) => {
		if (!value || value.length === 0) {
			return;
		}
		const targetValue = editInputRef.current.value;
		let selectionStart = editInputRef.current.selectionStart;
		const selectionEnd = Math.max(selectionStart - 1, 0);
		const parts = ['','',''];
		if (selectionStart !== 0) {
			while (selectionStart >= 0) {
				const prevChar = targetValue[--selectionStart];
				if (!prevChar || prevChar.match(/[ \t+*:%.(\/\-\^\[\{}]/)) {
					if (prevChar === '{' && selectionStart >= 0) {
						selectionStart--;
					}
					break;
				}			
			}
			parts[0] = targetValue.substring(0, selectionEnd + 1);
			parts[1] = value.substring(selectionEnd - selectionStart);
			parts[2] = targetValue.substring(selectionEnd + 1);
		}
		else {
			parts[1] = value;
			parts[2] = targetValue;
		}

		const newFormula = parts.join('');
		editInputRef.current.focus();
		setFormula(newFormula);
		let newSelection
		if (value.startsWith('{')) {
			// function - set before first argument
			newSelection = selectionEnd;
			while(newFormula[newSelection].match(/\w/)) { newSelection++; }
			newSelection++;
		}
		else {
			// parameter
			newSelection = parts[0].length + parts[1].length;
		}
		setSelection([newSelection, newSelection]);
	}


	const apply = (value) => {
		const targetValue = editInputRef.current.value;
		const selectionStart = editInputRef.current.selectionStart;
		const selectionEnd = editInputRef.current.selectionEnd;
		if (display === FormulaDisplay.units && !targetValue.endsWith(' ')) {
			value = ' ' + value;
		}
		const newFormula = `${targetValue.substring(0, selectionStart)}${value}${targetValue.substring(selectionEnd)}`;
		setFormula(newFormula);
		setDisplay(FormulaDisplay.editor);
		let newSelection;
		if (value.startsWith('{')) {
			// function - set before first argument
			newSelection = selectionStart + 1;
			while(newFormula[newSelection].match(/\w/)) { newSelection++; }
			newSelection++;
		}
		else {
			newSelection = selectionStart + value.length;
		}
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
