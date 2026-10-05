// @ts-check
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

/** @typedef {import('./MMApp.js').ViewProps} ViewProps */
/** @typedef {import('./MMApp.js').Actions} Actions */
/** @typedef {import('./MMApp.js').ViewInfo} ViewInfo */

/**
 * @typedef {Object} FormulaFieldProps
 * @property {string} [id]
 * @property {(key: string, options?: any) => string} t
 * @property {Actions} [actions]
 * @property {string} [path]
 * @property {string} [formula]
 * @property {ViewInfo} viewInfo
 * @property {number} [infoWidth]
 * @property {number} [infoHeight]
 * @property {(editOptions: any) => void} [editAction]
 * @property {(formula: string) => void} [applyChanges]
 * @property {any} [selectedCell]
 * @property {() => void} [ctrlEnterAction]
 * @property {() => void} [gotFocusAction]
 */

/**
 * @typedef {Object} FormulaEditorProps
 * @property {string} [id]
 * @property {(key: string, options?: any) => string} t
 * @property {ViewInfo} viewInfo
 * @property {number} [infoWidth]
 * @property {number} [infoHeight]
 * @property {Actions} actions
 * @property {any} [editOptions]
 * @property {() => void} [cancelAction]
 * @property {(formula: string) => void} [applyChanges]
 * @property {string} [key]
 * @property {any} [value]
 */

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

/**
 * Enum for formula display types.
 * @readonly
 * @enum {Number}
 */
const FormulaDisplay = Object.freeze({
	editor: 0,
	units: 1,
	functiions: 2
});

/**
 * @param {string} f
 * @returns {string}
 */
const replaceSmartQuotes = (f) => {
	f = f.replace(/[“”]/g,'"');	// defeat smart quotes
	f = f.replace(/[‘’]/g, "'");
	return f;
}

/**
 * @param {string} targetValue
 * @param {number} selStart
 * @param {string} value
 * @returns {{ newFormula: string, newSelection: number }}
 */
function calculateInsertedParam(targetValue, selStart, value) {
	if (!value || value.length === 0) {
		return { newFormula: targetValue, newSelection: selStart };
	}
	if (value.startsWith('{')) {
		let braceIndex = -1;
		for (let i = selStart - 1; i >= 0; i--) {
			if (targetValue[i] === '{') {
				braceIndex = i;
				break;
			}
			if (targetValue[i] === '}' || targetValue[i] === '\n') {
				break;
			}
		}
		if (braceIndex >= 0) {
			const parts = [
				targetValue.substring(0, braceIndex),
				value,
				targetValue.substring(selStart)
			];
			const newFormula = parts.join('');
			let newSelection = parts[0].length + 1;
			while (newSelection < newFormula.length && /[\w]/.test(newFormula[newSelection])) {
				newSelection++;
			}
			if (newSelection < newFormula.length && newFormula[newSelection] === ' ') {
				newSelection++;
			}
			return { newFormula, newSelection };
		}
	}
	let selectionStart = selStart;
	const selectionEnd = Math.max(selectionStart - 1, 0);
	const parts = ['', '', ''];
	if (selectionStart !== 0) {
		while (selectionStart >= 0) {
			const prevChar = targetValue[--selectionStart];
			if (!prevChar || prevChar.match(/[ \t\n+*:%.(/\-^[{}]/)) {
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
	const newSelection = parts[0].length + parts[1].length;
	return { newFormula, newSelection };
}

/**
 * @param {string[] | null} previewParam
 * @returns {string | null}
 */
function getFunctionFromPreview(previewParam) {
	if (!previewParam || !previewParam.length) {
		return null;
	}
	if (typeof previewParam[0] === 'string' && previewParam[0].startsWith('<')) {
		const match = previewParam[0].match(/<b[^>]*>(.*?)<\/b>/);
		if (match) {
			return match[1];
		}
	}
	return null;
}

/**
 * @param {string[] | null} list
 * @param {string} [prefix]
 * @returns {string[] | null}
 */
function sortCompletions(list, prefix = '') {
	if (!list || list.length <= 1 || list[0].startsWith('<')) {
		return list;
	}
	const pLower = prefix.toLowerCase();
	return [...list].sort((a, b) => {
		const aExact = a === prefix;
		const bExact = b === prefix;
		if (aExact !== bExact) {
			return aExact ? -1 : 1;
		}
		const aExactCi = a.toLowerCase() === pLower;
		const bExactCi = b.toLowerCase() === pLower;
		if (aExactCi !== bExactCi) {
			return aExactCi ? -1 : 1;
		}
		if (a.length !== b.length) {
			return a.length - b.length;
		}
		return a.localeCompare(b);
	});
}

/**
 * @param {string} targetValue
 * @param {number} selStart
 * @param {number} selEnd
 * @param {any} actions
 * @param {string} nameSpace
 * @param {(results: string[] | null) => void} callback
 */
function fetchFormulaCompletions(targetValue, selStart, selEnd, actions, nameSpace, callback) {
	if (targetValue === undefined || targetValue === null || (targetValue.length && targetValue[0] === "'") || selStart !== selEnd) {
		callback(null);
		return;
	}

	const currentChar = targetValue[selStart - 1];

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
				let selTemp2 = selStart - 1;
				while (selTemp2 >= 0 && targetValue[selTemp2].match(/[\w]/)) {
					selTemp2--;
				}
				const prefix = targetValue.substring(selTemp2 + 1, selStart);
				if (actions) {
					actions.doCommand('/unitsys.units list', (/** @type {any} */ results) => {
						if (results && results.length && results[0].results) {
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
								callback(sortCompletions(eligible, prefix));
								return;
							}
						}
						callback(null);
					});
				}
				else {
					callback(null);
				}
				return;
			}
		}
	}

	if (currentChar === '?') {
		// maybe looking for function description
		let selTemp = selStart - 2;
		while (selTemp >= 0 && targetValue[selTemp].match(/[\s\w]/)) {
			selTemp--;
		}
		if (selTemp >= 0 && targetValue[selTemp] === '{') {
			// is function
			const fName = targetValue.substring(selTemp + 1, selStart - 1).trim().toLowerCase();
			const data = functionPickerData();
			// search for name
			const re = new RegExp(`^\\{${fName}[ }]`);
			for (const header of data.sections) {
				for (const func of header.functions) {
					if (func.f.match(re)) {
						callback([`<p><b class="formula-func-name" title="Click to insert">${func.f}</b></p>${func.desc}`]);
						return;
					}
				}
			}
		}
	}

	const makeParamPreview = (/** @type {string} */ path, /** @type {string} */ start) => {
		if (nameSpace && actions) {
			actions.doCommand(`${nameSpace}.${path} parampreview ${path}:${start}`, (/** @type {any} */ results) => {
				if (results && results.length && results[0].results) {
					const eligible = JSON.parse(results[0].results);
					if (eligible.length) {
						callback(sortCompletions(eligible, start));
						return;
					}
				}
				callback(null);
			});
		}
		else {
			callback(null);
		}
	};

	if (currentChar && currentChar.match(/[,+*:%(/\-^[]/)) {
		// operator or paren or bracket etc - show all
		makeParamPreview('', '');
		return;
	}

	let curPos = selStart;
	const pathChars = [];
	const pathRegex = /[\w.]/;
	while (curPos-- > 0) {
		const char = targetValue[curPos];
		if (char.match(pathRegex)) {
			pathChars.push(char);
		}
		else {
			break;
		}
	}
	const originalCurPos = curPos;
	while (curPos >= 0 && targetValue[curPos].match(/\s/)) {
		curPos--;
	}
	if (curPos < originalCurPos) {
		// check to see if in function. if so restore a whitespace
		let fCheck = curPos;
		while (fCheck >= 0 && targetValue[fCheck].match(/\w/)) {
			fCheck--;
		}
		if (fCheck >= 0 && targetValue[fCheck] === '{') {
			curPos++;
		}
	}

	const prevChar = curPos >= 0 ? targetValue[curPos] : '';
	const pathTokens = pathChars.reverse().join('').split('.');
	const start = (/** @type {string} */ (pathTokens.pop())).toLowerCase();
	const path = pathTokens.join('.');

	// ensure the path is preceded by appropriate operator
	if (prevChar === '{') {
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
			callback(sortCompletions(Array.from(functions), prefix));
		}
		else {
			callback(null);
		}
		return;
	}

	if (prevChar && !prevChar.match(/[,\s+*:%(/\-^[]/)) {
		callback(null);
		return;
	}

	makeParamPreview(path, start);
}

/**
 * @param {FormulaFieldProps} props
 */
export function FormulaField(props) {
	const [formula, setFormula] = useState(/** @type {string} */ (props.formula !== undefined ? props.formula : props.viewInfo.formula));
	const [initialFormula, setInitialFormula] = useState('');
	const initialModelPath = props.viewInfo?.updateResults?.[0]?.results?.modelPath || '';
	const [nameSpace, setNameSpace] = useState(initialModelPath);
	const [previewParam, setPreviewParam] = useState(/** @type {any} */ (null));
	const [selectedIndex, setSelectedIndex] = useState(-1);
	const [selection, setSelection] = useState(/** @type {[number, number] | null} */ (null));
	const [eventHitCount, setEventHitCount] = useState(0);
	const [isFocused, setIsFocused] = useState(false);

	const isExpression = props.viewInfo.viewKey === 'Expression';
	const pFormula = props.formula;
	const pViewInfo = props.viewInfo;
	const pActions = props.actions ? props.actions : (/** @type {any} */ (pViewInfo))?.actions;
	const pApplyChanges = props.applyChanges ? props.applyChanges : props.viewInfo.applyChanges;

	useEffect(() => {
		if (pFormula === '' &&
			pViewInfo &&
			isExpression &&
			fieldInputRef.current)
		{
			fieldInputRef.current.focus();
		}
	}, [isExpression, pFormula, pViewInfo]);

	useEffect(() => {
		const f = pFormula !== undefined ? pFormula : pViewInfo.formula;
		setFormula(/** @type {string} */ (f));
		setInitialFormula(/** @type {string} */ (f));
	}, [pFormula, pViewInfo]);

	useEffect(() => {
		const results = props.viewInfo?.updateResults?.[0];
		if (results && results.results) {
			const modelPath = results.results.modelPath;
			if (modelPath && modelPath !== nameSpace) {
				setNameSpace(modelPath);
			}
		}
	}, [props.viewInfo?.updateResults, nameSpace]);

	useEffect(() => {
		if (selection && fieldInputRef.current) {
			fieldInputRef.current.setSelectionRange(selection[0], selection[1]);
		}
	}, [selection]);

	/** @type {React.MutableRefObject<any>} */
	const latestFormula = React.useRef(null);
	useEffect(() => {
		latestFormula.current = formula;
	}, [formula]);
	/** @type {React.MutableRefObject<any>} */
	const latestInitial = React.useRef(null);
	useEffect(() => {
		latestInitial.current = initialFormula;
	}, [initialFormula]);

	const isSwitchingToEditor = React.useRef(false);
	useEffect(() => {
		return () => {
			if (!isSwitchingToEditor.current && latestFormula.current !== latestInitial.current) {
				const fNew = replaceSmartQuotes(latestFormula.current);
				pApplyChanges(fNew);
			}
		};
	}, []);

	/** @type {React.MutableRefObject<any>} */
	const fieldInputRef = React.useRef(null);

	const fieldQueryIdRef = React.useRef(0);
	useEffect(() => {
		if (!isFocused || !fieldInputRef.current || document.activeElement !== fieldInputRef.current) {
			setPreviewParam(null);
			setSelectedIndex(-1);
			return;
		}
		const target = fieldInputRef.current;
		const selStart = target.selectionStart;
		const selEnd = target.selectionEnd;
		const queryId = ++fieldQueryIdRef.current;
		fetchFormulaCompletions(formula, selStart, selEnd, pActions, nameSpace, (results) => {
			if (queryId === fieldQueryIdRef.current && fieldInputRef.current && document.activeElement === fieldInputRef.current) {
				setPreviewParam(results);
				setSelectedIndex(results && results.length && !results[0].startsWith('<') ? 0 : -1);
			}
		});
	}, [isFocused, eventHitCount, formula, nameSpace, pActions]);

	/** @type {React.MutableRefObject<any>} */
	const appliedFormula = React.useRef(props.formula);
	useEffect(() => {
		appliedFormula.current = props.formula;
	}, [props.formula]);

	/** @param {string} formula */
	const applyChanges = (formula) => {
		formula = replaceSmartQuotes(formula);
		if (formula !== appliedFormula.current) { // only apply if changed
			appliedFormula.current = formula;
			pApplyChanges(formula);
		}
	};

	/** @type {{ formula: string, initialFormula: string, nameSpace: string, selectionStart?: number, selectionEnd?: number }} */
	const editOptions = {
		formula: formula,
		initialFormula: initialFormula,
		nameSpace: nameSpace,
	};

	/** @param {string} value */
	const insertParam = (value) => {
		if (!value || value.length === 0 || !fieldInputRef.current) {
			return;
		}
		const { newFormula, newSelection } = calculateInsertedParam(
			fieldInputRef.current.value,
			fieldInputRef.current.selectionStart,
			value
		);
		setFormula(newFormula);
		setSelection([newSelection, newSelection]);
		if (!value.endsWith('.')) {
			setPreviewParam(null);
			setSelectedIndex(-1);
		}
		else {
			setEventHitCount((c) => c + 1);
		}
		fieldInputRef.current.focus();
	};

	let showEditor = false;

	let autocompleteCmp = null;
	if (isFocused && previewParam && previewParam.length > 0) {
		if (previewParam[0].startsWith('<')) {
			const funcToInsert = getFunctionFromPreview(previewParam);
			autocompleteCmp = e(
				'div', {
					className: 'formula-field__autocomplete formula-field__autocomplete--func-desc',
					onMouseDown: (/** @type {any} */ e) => e.preventDefault(),
					onClick: (/** @type {any} */ e) => {
						if (funcToInsert) {
							const b = e.target.closest('b') || e.target.closest('.formula-func-name');
							if (b || (e.target.tagName === 'P' && e.target.querySelector('b'))) {
								e.stopPropagation();
								insertParam(funcToInsert);
							}
						}
					},
					dangerouslySetInnerHTML: { __html: previewParam[0] }
				}
			);
		}
		else {
			const items = previewParam.map((/** @type {string} */ p, /** @type {number} */ idx) => {
				const isSelected = idx === selectedIndex;
				return e(
					'div', {
						key: p,
						className: 'formula-field__autocomplete-item' + (isSelected ? ' formula-field__autocomplete-item--selected' : ''),
						onMouseDown: (/** @type {any} */ e) => e.preventDefault(),
						onClick: (/** @type {any} */ e) => {
							e.stopPropagation();
							insertParam(p);
						},
						onMouseEnter: () => {
							setSelectedIndex(idx);
						},
						ref: (/** @type {any} */ el) => {
							if (isSelected && el) {
								el.scrollIntoView({ block: 'nearest' });
							}
						}
					},
					p
				);
			});
			autocompleteCmp = e(
				'div', {
					className: 'formula-field__autocomplete',
					onMouseDown: (/** @type {any} */ e) => e.preventDefault(),
				},
				items
			);
		}
	}

	return e(
		'div', {
			className: 'formula-input-field',
			onBlur: () => {
				const currentVal = fieldInputRef.current ? fieldInputRef.current.value : formula;
				applyChanges(currentVal);
			},
			tabIndex: -1,
			onClick: (/** @type {any} */ event) => {
				event.preventDefault();
				event.stopPropagation();
			}
		},
		e(
			'input', {
				id: props.id ? props.id : 'formula-field',
				type: 'text',
				ref: fieldInputRef,
				value: formula,
				onChange: (/** @type {any} */ event) => {
					setFormula(event.target.value);
					setEventHitCount((c) => c + 1);
				},
				onClick: () => {
					setEventHitCount((c) => c + 1);
				},
				onKeyDown: (/** @type {any} */ e) => {
					if (e.code === 'ArrowDown') {
						if (previewParam && previewParam.length && !previewParam[0].startsWith('<')) {
							e.preventDefault();
							setSelectedIndex((prev) => (prev + 1) % previewParam.length);
							return;
						}
					}
					else if (e.code === 'ArrowUp') {
						if (previewParam && previewParam.length && !previewParam[0].startsWith('<')) {
							e.preventDefault();
							setSelectedIndex((prev) => (prev - 1 + previewParam.length) % previewParam.length);
							return;
						}
					}
					else if (e.code === 'Enter') {
						if (e.shiftKey) {
							// watches for Shift Enter and sends command when it see it
							e.preventDefault();
							e.stopPropagation();
							setPreviewParam(null);
							setSelectedIndex(-1);
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
							e.preventDefault();
							let finalFormula = fieldInputRef.current ? fieldInputRef.current.value : formula;
							const funcToInsert = getFunctionFromPreview(previewParam);
							if (previewParam && previewParam.length) {
								let toInsert = null;
								if (selectedIndex >= 0 && !previewParam[0].startsWith('<')) {
									toInsert = previewParam[selectedIndex];
								}
								else if (funcToInsert) {
									toInsert = funcToInsert;
								}
								if (toInsert) {
									const { newFormula } = calculateInsertedParam(
										fieldInputRef.current.value,
										fieldInputRef.current.selectionStart,
										toInsert
									);
									finalFormula = newFormula;
									setFormula(newFormula);
									fieldInputRef.current.value = newFormula;
								}
							}
							setPreviewParam(null);
							setSelectedIndex(-1);
							applyChanges(finalFormula);
							if (fieldInputRef.current) {
								fieldInputRef.current.blur();
							}
							if (e.ctrlKey) {
								if (props.ctrlEnterAction) {
									e.stopPropagation();
									props.ctrlEnterAction();
								}
							}
							return;
						}
					}
					else if (e.code === 'Tab') {
						const funcToInsert = getFunctionFromPreview(previewParam);
						if (previewParam && previewParam.length) {
							if (selectedIndex >= 0 && !previewParam[0].startsWith('<')) {
								e.preventDefault();
								insertParam(previewParam[selectedIndex]);
								return;
							}
							else if (funcToInsert) {
								e.preventDefault();
								insertParam(funcToInsert);
								return;
							}
						}
					}
					else if (e.code === 'Period' && previewParam && previewParam.length && selectedIndex >= 0 && !previewParam[0].startsWith('<')) {
						e.preventDefault();
						insertParam(previewParam[selectedIndex] + '.');
						return;
					}
					else if (e.code === 'Escape') {
						if (previewParam) {
							e.preventDefault();
							e.stopPropagation();
							setPreviewParam(null);
							setSelectedIndex(-1);
							return;
						}
					}
					else if (e.code.startsWith('Arrow')) {
						setEventHitCount((c) => c + 1);
					}
				},

				onFocus: (/** @type {any} */ e) => {
					setIsFocused(true);
					if (!showEditor) {
						// focus not from clicking in field
						if (formula?.length > 100 || formula?.includes('\n')) {
							if (props.editAction) {
								e.stopPropagation();
								props.editAction(editOptions);
							}
						}
						else {
							setEventHitCount((c) => c + 1);
							if (props.gotFocusAction) {
								props.gotFocusAction();
							}
						}
					}
				},
				onBlur: () => {
					setIsFocused(false);
					setPreviewParam(null);
					setSelectedIndex(-1);
				},
				onPointerDown: () => {
					if (props.editAction && (formula?.length > 100 || formula?.includes('\n'))) {
						// set so focus knows it is because of a click in the field
						// need to get to pointer up where the selection start is known
						showEditor = true;
					}
				},
				onPointerUp: () => {
					if (showEditor && props.editAction) {
						// we need to switch to editor because of pointer click
						// get the selection start so it is maintained in editor
						let selStart = Math.max(0, fieldInputRef.current.selectionStart);
						let newLineCount = 0;
						for (let i = 0; i < selStart; i++) {
							if (formula[i] === '\n') {
								newLineCount++;
							}
						}
						editOptions.selectionStart = selStart + newLineCount;
						props.editAction(editOptions);
					}
				}
			}
		),
		e(
			'div', {
				className: 'formula-field__refresh',
				onClick: (/** @type {any} */ e) => {
					e.stopPropagation();
					(/** @type {any} */ (props.actions)).doCommand(`${props.path} refresh`, () => {
						(/** @type {any} */ (props.actions)).updateView(props.viewInfo.stackIndex);
					});
				},
			},
			'='
		),
		e(
			'div', {
				className: 'formula-field__edit-button',
				onClick: (/** @type {any} */ e) => {
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
		),
		autocompleteCmp
	);
}

/**
 * @param {any} props
 */
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
					onClick: (/** @type {any} */ e) => {
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

/**
 * Enum for formula editor preview calc types.
 * @readonly
 * @enum {Number}
 */
const FormulaPreviewCalcType = Object.freeze({
	current: 0,
	preview: 1,
	selection: 2
});


/**
 * @param {FormulaEditorProps} props
 */
export function FormulaEditor(props) {
	let t = props.t;
	const nInfoViewPadding = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--info-view--padding'));

	const [display, setDisplay] = useState(/** @type {number} */ (FormulaDisplay.editor));
	const editOptions = props.editOptions || {};
	const [formula, setFormula] = useState(editOptions.formula || '');
	const selStart = editOptions.selectionStart ? editOptions.selectionStart : 0;
	const selEnd = editOptions.selectionEnd ? editOptions.selectionEnd : selStart;
	const [selection, setSelection] = useState([selStart,selEnd]);
	const [previewValue, setPreviewValue] = useState(props.value || '');
	const [previewCalcType, setPreviewCalcType] = useState(/** @type {number} */ (FormulaPreviewCalcType.current));
	const [errorMessage, setErrorMessage] = useState(/** @type {any} */ (null));

	// parameters to allow resizing the editor preview
	const [previewParam, setPreviewParam] = useState(/** @type {any} */ (null));
	const [previewHeight, setPreviewHeight] = useState(Math.min(300, (/** @type {any} */ (props.infoHeight)) - 150));
	const [dividerPointer, setDividerPointer] = useState(/** @type {any} */ (null));

	// following is used to trigger text parsing for preview - updated on anything that
	// could change caret position.
	const [eventHitCount, setEventHitCount] = useState(0);

	// reference to editor textarea to keep track of selection and focus
	/** @type {React.MutableRefObject<any>} */
	const editInputRef = React.useRef(null);
//	const normalClose = React.useRef(false);

	document.documentElement.style.setProperty('--preview-height', `${previewHeight}px`);

	const pApplyChanges = props.applyChanges ? props.applyChanges : props.viewInfo.applyChanges;
	const pEditOptions = props.editOptions;
	const pViewInfo = props.viewInfo;
	const pActions = props.actions;

	const previewCurrent = React.useCallback(() => {
		setErrorMessage(null);
		setPreviewParam(null);
		const f = pEditOptions.initialFormula;
		const nameSpace = pEditOptions.nameSpace;
		if (typeof(f) ===  "string") {
			pActions.doCommand(`${pViewInfo.path} fpreview ${nameSpace} ${f}`, (/** @type {any} */ results) => {
				if (results) {
					setPreviewValue(results[0].results);
					setPreviewCalcType(FormulaPreviewCalcType.current);
					if (editInputRef.current) {
						editInputRef.current.focus();
					}
				}
			}, previewErrorHandler);	
		}
	},[pEditOptions, pActions,pViewInfo]);


	useEffect(() => {
		previewCurrent();
		setPreviewCalcType(FormulaPreviewCalcType.current);
	}, []);

	/** @type {React.MutableRefObject<any>} */
	const latestFormula = React.useRef(null);
  useEffect(() => {
    latestFormula.current = formula;
  }, [formula]);

	useEffect(() => {
		return () => {
			if (latestFormula.current !== pEditOptions.initialFormula) {
				const formula = replaceSmartQuotes(latestFormula.current);
				pApplyChanges(formula);
			}
		};
	}, [pApplyChanges, pEditOptions]);

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

	const editorQueryIdRef = React.useRef(0);
	useEffect(() => {
		const target = editInputRef.current;
		if (!target) {
			return;
		}
		let selStart = target.selectionStart;
		let selEnd = target.selectionEnd;
		const queryId = ++editorQueryIdRef.current;
		fetchFormulaCompletions(target.value, selStart, selEnd, pActions, pEditOptions.nameSpace, (results) => {
			if (queryId === editorQueryIdRef.current) {
				setPreviewParam(results);
			}
		});
	}, [eventHitCount, formula, pActions, pEditOptions.nameSpace]);


	/** @param {string} formula */
	const applyChanges = (formula) => {
		formula = replaceSmartQuotes(formula);
		latestFormula.current = props.editOptions.initialFormula; // block the unmount action
		const f = props.applyChanges ? props.applyChanges : props.viewInfo.applyChanges;
		f(formula);
	}

	/** @param {any} s */
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
		props.actions.doCommand(`${props.viewInfo.path} fpreview ${nameSpace} ${f}`, (/** @type {any} */ results) => {
			if (results) {
				setPreviewValue(results[0].results);
				setPreviewCalcType((selStart === selEnd) ?
					FormulaPreviewCalcType.preview :
					FormulaPreviewCalcType.selection);
				editInputRef.current.focus();
			}
		}, previewErrorHandler);
	}

	let importFile = (/** @type {any} */ event) => {
		//Retrieve the first (and only!) File from the FileList object
		var f = event.target.files[0]; 

		if (f) {
			let r = new FileReader();
			r.onload = (/** @type {any} */ e) => {
				let contents = e.target.result;
				setFormula("'" + contents);
			};
			r.readAsText(f);
		} else { 
			alert("Failed to load file");
		}
	}

	const pickerButtonClick = (/** @type {any} */ picker) => {
			const selectionStart = editInputRef.current.selectionStart;
			const selectionEnd = editInputRef.current.selectionEnd;
			setSelection([selectionStart, selectionEnd]);
			setDisplay(picker);
	}

	const onFocusHandler = (/** @type {any} */ event) => {
		if (!event.target.value.length) {
			fetchFormulaCompletions('', 0, 0, pActions, pEditOptions.nameSpace, (results) => {
				setPreviewParam(results);
			});
		}
	}

	const onClickHandler = () => {
		setEventHitCount(eventHitCount+1);
	}

	const keyDownHandler = (/** @type {any} */ event) => {
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
				const funcToInsert = getFunctionFromPreview(previewParam);
				if (funcToInsert) {
					event.preventDefault();
					insertParam(funcToInsert);
					return;
				}
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
					const funcToInsert = getFunctionFromPreview(previewParam);
					if (funcToInsert) {
						event.preventDefault();
						insertParam(funcToInsert);
						return;
					}
					else if (previewParam && previewParam.length && selStart > 0 && text[selStart-1].match(/[{\w]/)) {
						insertParam(previewParam[0]);
						event.preventDefault();
						return;
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
			const funcToInsert = getFunctionFromPreview(previewParam);
			// function description
			previewComponent = e(
				'div', {
					id: 'formula-editor__preview-func-desc',
					onClick: (/** @type {any} */ e) => {
						if (funcToInsert) {
							const b = e.target.closest('b') || e.target.closest('.formula-func-name');
							if (b || (e.target.tagName === 'P' && e.target.querySelector('b'))) {
								e.stopPropagation();
								insertParam(funcToInsert);
							}
						}
					},
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
		let calcType;
		switch (previewCalcType) {
			case FormulaPreviewCalcType.current:
				calcType = t('react:formulaEditorCurrentButton');
				break;
			case FormulaPreviewCalcType.preview:
				calcType = t('react:formulaEditorPreviewButton');
				break;
			case FormulaPreviewCalcType.selection:
				calcType = t('react:formulaEditorSelectionType');
				break;						
		}
		previewComponent = e(
			'div', {
				id: 'formula-editor__preview-table',
			},
			e(
				'div', {
					id: 'formula-editor__preview-unit',
				},
				calcType
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
					viewBox: [0, 0,
						(/** @type {any} */ (props.infoWidth)) - 2*nInfoViewPadding,
						previewHeight - 20],
				}
			),
		);
	}

	let previewButton;
	if (formula === "'") {
		previewButton = e(
			'label', {
				id: 'formula-editor__preview-button',
				className: 'input-file-button',
			},
			t('react:formulaEditorImportButton'),
			e(
				'input', {
					id: 'formula-editor__import-input',
					type: 'file',
					onChange: (/** @type {any} */ e) => {
						importFile(e);
					},
				}
			),	
		)
	}
	else {
		previewButton = e(
			'button', {
				id: 'formula-editor__preview-button',
				title: t('react:formulaEditorPreviewKey'),
				onClick: updatePreview,
			},
			t('react:formulaEditorPreviewButton'),
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
				onChange: (/** @type {any} */ e) => {
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
			previewButton,
			e(
				'button', {
					id: 'formula-editor__current-button',
					title: t('react:formulaEditorCurrentKey'),
					onClick: previewCurrent,
				},
				t('react:formulaEditorCurrentButton'),
			),
			e(	// draggable resize icon for preview area
				'div', {
					id: 'formula-editor__preview-resize',
					title: t('react:formulaEditorPreviewResize'),

					onPointerDown: (/** @type {any} */ e) => {
						e.stopPropagation();
						e.preventDefault();
						setDividerPointer(e.clientY);
						e.target.setPointerCapture(e.pointerId);
					},
				
					onPointerMove: (/** @type {any} */ e) => {
						if (dividerPointer) {
							e.stopPropagation();
							e.preventDefault();
							const change = dividerPointer - e.clientY;
							let newPreviewHeight = Math.max(80, previewHeight + change);
							newPreviewHeight = Math.min((/** @type {any} */ (props.infoHeight)) - 150, newPreviewHeight);
							setPreviewHeight(newPreviewHeight);
							setDividerPointer(e.clientY);
						}		
					},
				
					onPointerUp: (/** @type {any} */ e) => {
						e.stopPropagation();
						e.preventDefault();
						e.target.releasePointerCapture(e.pointerId);
						setDividerPointer(null);
					}
				},
				'↕'
			)
		),
		previewComponent,
	);

	/** @param {string} value */
	const insertParam = (value) => {
		if (!value || value.length === 0 || !editInputRef.current) {
			return;
		}
		const { newFormula, newSelection } = calculateInsertedParam(
			editInputRef.current.value,
			editInputRef.current.selectionStart,
			value
		);
		editInputRef.current.focus();
		setFormula(newFormula);
		setSelection([newSelection, newSelection]);
		setPreviewParam(null);
	}


	/** @param {string} value */
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
