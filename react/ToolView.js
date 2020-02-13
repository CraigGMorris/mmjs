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
	const pathParts = props.viewInfo.path.split('.');
	name = pathParts[pathParts.length - 1];
	const [toolName, setToolName] = useState(name);
	const [showNotes, setShowNotes] = useState(false);
	const updateResults = props.viewInfo.updateResults;
	
	const [notesText, setNotesText] = useState(updateResults.length ? updateResults[0].results.notes : '');
	const diagramNotes = updateResults.length ? updateResults[0].results.diagramNotes : false;
	const doRename = () => {
		const path = props.viewInfo.path;
		if (path.split('.').pop() != toolName) {
			props.actions.renameTool(path, toolName);
		}
	}

	const doSetNotes = (newNotes) => {
		props.actions.doCommand(`__blob__${props.viewInfo.path} set notes__blob__${newNotes}`, (cmds) => {
			props.actions.updateView(props.viewInfo.stackIndex);
		});
	}

	const doSetDiagramNotes = (shouldShow) => {
		props.actions.doCommand(`${props.viewInfo.path} set diagramNotes ${shouldShow ? 't' : 'f'}`, (cmds) => {
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
				onBlur: (event) => {
					// watch for loss of focus
					doRename();
					}
				}
		),
		e(
			'div', {
				id: 'tool-view__notes-toggle',
				onClick: (e) => {
					setShowNotes(!showNotes);
				}
			},
			showNotes ? t('react:toolViewHideNotesButton') : t('react:toolViewShowNotesButton')
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
					'div', {
						id: 'tool-view__diagram-notes-toggle',
						onClick: (e) => {
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
					onBlur: (event) => {
						// watch for loss of focus
						doSetNotes(notesText);
					}
				},
			)
		);
		cmpStack.push(notesArea);
	}
	else {

		cmpStack.push(props.toolComponent);
	}

	return e(
		'div', {
			id: 'tool-view',
		},
		cmpStack,
	)
}
