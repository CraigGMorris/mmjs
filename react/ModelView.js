'use strict';

import {ToolView} from './ToolView.js';
import {readClipboard, writeClipboard} from './Clipboard.js'

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

/**
 * ModelView
 * info view for model
 */
export function ModelView(props) {

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const [testPaste, setTestPaste] = useState('Nothing pasted yet!');
	const t = props.t;
	const updateResults = props.viewInfo.updateResults;
	if (updateResults.error) {
		return e(
			'div', {
				id: 'result-error'
			},
			t(updateResults.error.msgKey, updateResults.error.args)
		);
	}

//	let t = props.t;
	let displayComponent = e(
		'div', {
			key: 'model'
		},
		e(
			'button', {
				onClick: () => {
					// navigator.clipboard.writeText('Hi Charlie');
					writeClipboard('one two three');
				}
			},
			'Test Copy'
		),
		e(
			'button', {
				onClick: () => {
					readClipboard().then(clipText => {
						setTestPaste(clipText);
					})
				}
			},
			'Test Paste'
		),
		e(
			'div', {},
			testPaste
		)
	);
	return e(
		ToolView, {
			id: 'tool-view',
			displayComponent: displayComponent,
			...props,
		},
	);
}
