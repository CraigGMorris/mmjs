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
	const updateResults = props.viewInfo.updateResults;
	const notes = updateResults.length ? updateResults[0].results.notes : '';	
	const [notesText, setNotesText] = useState(notes);
	const diagramNotes = updateResults.length ? updateResults[0].results.diagramNotes : false;

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

	const doSetDiagramNotes = (shouldShow) => {
		props.actions.doCommand(`${props.viewInfo.path} set diagramNotes ${shouldShow ? 't' : 'f'}`, () => {
			props.actions.updateView(props.viewInfo.stackIndex);
		});
	}

	let cmpStack = [];
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
				onKeyPress: (event) => {
					// watches for Enter and sends command when it see it
					if (event.key == 'Enter') {
						doRename()
					}		
				},
				onBlur: () => {
					// watch for loss of focus
					doRename();
					}
				}
		),
		e(
			'button', {
				id: 'tool-view__notes-toggle',
				onClick: () => {
					setShowNotes(!showNotes);
				}
			},
			notesText && notesText.length ? (
				showNotes ? t('react:toolViewHideNotesButton') : t('react:toolViewShowNotesButton')
			) :
			(
				showNotes ? t('react:toolViewHideNotesButton') : t('react:toolViewAddNotesButton')
			)
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
						id: 'tool-view__diagram-notes-toggle',
						onClick: () => {
							doSetDiagramNotes(!diagramNotes);
						}
					},
					diagramNotes ? t('react:toolViewHideDgmNotesButton') : t('react:toolViewShowDgmNotesButton')		
				)	
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
						if (e.key === 'Enter' && e.shiftKey) {
							e.preventDefault();
							e.stopPropagation();
							doSetNotes(notesText);
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
