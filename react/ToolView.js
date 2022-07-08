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

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

/**
 * ToolView
 * container for all tools views
 */

export function ToolView(props) {
	const t = props.t;
	let name;
	useEffect(() => {
		const updateResults = props.viewInfo.updateResults;
		const notes = updateResults.length ? updateResults[0].results.notes : '';		
		setNotesText(notes);
	}, [props.viewInfo.updateResults]);

	const pathParts = props.viewInfo.path.split('.');
	name = pathParts[pathParts.length - 1];
	const [toolName, setToolName] = useState(name);
	const [showNotes, setShowNotes] = useState(false);
	const [isDisplayed, setIsDisplayed] = useState(false);
	const updateResults = props.viewInfo.updateResults;
	const results = updateResults[0] ? updateResults[0].results : {};
	const notes = updateResults.length ? results.notes : '';	
	const [notesText, setNotesText] = useState(notes);
	const diagramNotes = updateResults.length ? results.diagramNotes : false;
	const htmlNotes = updateResults.length ? results.htmlNotes : false;

	useEffect(() => {
		const results = updateResults.length ? updateResults[0].results : {};
		if (results.isOutput) {
			setIsDisplayed(true);
		}
		else {
			setIsDisplayed(false);
		}
	}, [props.viewInfo.updateResults]);

	const doRename = () => {
		const path = props.viewInfo.path;
		if (path.split('.').pop() != toolName) {
			props.actions.renameTool(path, toolName);
		}
	}

	const doSetNotes = (newNotes) => {
		props.actions.doCommand(`__blob__${props.viewInfo.path} set notes__blob__${newNotes}`, () => {
			props.actions.updateView(props.viewInfo.stackIndex);
		});
	}

	const doSetHtmlNotes = (shouldShow) => {
		props.actions.doCommand(`${props.viewInfo.path} set htmlNotes ${shouldShow ? 't' : 'f'}`, () => {
			props.actions.updateView(props.viewInfo.stackIndex);
		});
	}

	const doSetDiagramNotes = (shouldShow) => {
		props.actions.doCommand(`${props.viewInfo.path} set diagramNotes ${shouldShow ? 't' : 'f'}`, () => {
			props.actions.updateView(props.viewInfo.stackIndex);
		});
	}

	let cmpStack = [];

	// const inputCheckBox = !props.isExpression ? '' : e(
	// 	// isInput check box
	// 	'div', {
	// 		id: 'tool-view__is-input',
	// 		className: 'checkbox-and-label',
	// 	},
	// 	e(
	// 		'label', {
	// 			id: 'tool-view__is-input-label',
	// 			className: 'checkbox__label',
	// 			htmlFor: 'tool-view__is-input-checkbox'
	// 		},
	// 		t('react:exprIsInput')
	// 	),
	// 	e(
	// 		'input', {
	// 			id: 'tool-view__is-input-checkbox',
	// 			className: 'checkbox__input',
	// 			type: 'checkbox',
	// 			checked: results.isInput,
	// 			onChange: () => {
	// 				// toggle the isInput property
	// 				const value = results.isInput ? 'f' : 't';
	// 				props.actions.doCommand(`${props.viewInfo.path} set isInput ${value}`, () => {
	// 					props.actions.updateView(props.viewInfo.stackIndex);
	// 				});						
	// 			}
	// 		},
	// 	),
	// );

	const nameArea = e(
		'div', {
			id: 'tool-view__name-area',
			key: 'name-area',
		},
		e(
			'input', {
				id: 'tool-view__name-input',
				value: toolName || '',
				placeholder: t('react:toolNamePlaceHolder'),
				onChange: (event) => {
					// keeps input field in sync
					const value = event.target.value;
					setToolName(value);	
				},
				onKeyDown: (event) => {
					// watches for Enter and sends command when it see it
					if (event.code == 'Enter') {
						doRename()
					}		
				},
				onBlur: () => {
					// watch for loss of focus
					doRename();
					}
				}
		),
		// inputCheckBox,
		e(
			// isOutput check box
			'div', {
				id: 'tool-view__is-output',
				className: 'checkbox-and-label',
			},
			e(
				'label', {
					id: 'tool-view__is-output-label',
					className: 'checkbox__label',
					htmlFor: 'tool-view__is-output-checkbox'
				},
				t('react:exprIsOutput'),
			),
			e(
				'input', {
					id: 'tool-view__is-output-checkbox',
					className: 'checkbox__input',
					type: 'checkbox',
					checked: isDisplayed,
					onChange: () => {
						// toggle the isOutput property
						const value = results.isOutput ? 'f' : 't';
						props.actions.doCommand(`${props.viewInfo.path} set isOutput ${value}`, () => {
							props.actions.updateView(props.viewInfo.stackIndex);
						});						
					}
				},
			),	
		),
		e(
			'button', {
				id: 'tool-view__notes-toggle',
				onClick: () => {
					setShowNotes(!showNotes);
				}
			},
			showNotes ? t('react:toolViewNotesDoneButton') : t('react:toolViewNotesButton')
		)
	);
	cmpStack.push(nameArea);
	if (showNotes) {
		const notesArea = e(
			'div', {
				id: 'tool-view__notes',
				key: 'notes'
			},
			e(
				'div', {
					id: 'tool-view__notes-header'
				},
				e(
					'div', {
						id: 'tool-view__notes-title'
					},
					t('react:toolViewNotesTitle', {name: name}),
				),
				e(
					'button', {
						id: 'tool-view__html-notes-toggle',
						class: 'tool-view__show-notes-toggle',
						onClick: () => {
							doSetHtmlNotes(!htmlNotes);
						}
					},
					htmlNotes ? t('react:toolViewHideHtmlNotesButton') : t('react:toolViewShowHtmlNotesButton')		
				),
				e(
					'button', {
						id: 'tool-view__diagram-notes-toggle',
						class: 'tool-view__show-notes-toggle',
						onClick: () => {
							doSetDiagramNotes(!diagramNotes);
						}
					},
					diagramNotes ? t('react:toolViewHideDgmNotesButton') : t('react:toolViewShowDgmNotesButton')		
				),
			),
			e(
				'textarea', {
					id: 'tool-view__notes-input',
					value: notesText,
					onChange: (event) => {
						// keeps input field in sync
						const value = event.target.value;
						setNotesText(value);
					},
					onKeyDown: (e) => {
						if (e.code === 'Enter' && e.shiftKey) {
							e.preventDefault();
							e.stopPropagation();
							doSetNotes(notesText);
							setShowNotes(false);
						}
					},
					onBlur: () => {
						// watch for loss of focus
						doSetNotes(notesText);
					}
				},
			)
		);
		cmpStack.push(notesArea);
	}
	else {

		cmpStack.push(props.displayComponent);
	}

	return e(
		'div', {
			id: 'tool-view',
		},
		cmpStack,
	)
}
