'use strict';

import {ToolView} from './ToolView.js';
import {FormulaField, FormulaEditor} from './FormulaView.js';

const e = React.createElement;
const useEffect = React.useEffect;
const useState = React.useState;

/**
 * Enum for html page display types.
 * @readonly
 * @enum {string}
 */
const HtmlPageDisplay = Object.freeze({
	main: 0,
	formulaEditor: 1
});

/**
 * HtmlPageView
 * info view for equation solver
 */
export function HtmlPageView(props) {
	const [display, setDisplay] = useState(HtmlPageDisplay.input);
	const [formulaOffset, setFormulaOffset] = useState(0);

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const t = props.t;
	const updateResults = props.viewInfo.updateResults;

	const htmlAction = React.useCallback(e => {
		if (!updateResults.error) {
			const results = updateResults.length ? updateResults[0].results : {};
			if (results.path) {
				const source = e.source
				const message = e.data.substring(8)
				props.actions.doCommand(`__blob__${results.path} htmlaction__blob__${message}`, (results) => {
					if (results && results[0] && results[0].results) {
						const received = results[0].results;
						source.postMessage('got results', '*');
						if (received.update) {
							console.log('updating');
							props.actions.updateView(props.viewInfo.stackIndex);
						}
						// setDisplay(HtmlPageDisplay.main);
					}
				});
			}
		}
	}, [updateResults, props.actions, props.viewInfo.stackIndex]);

	useEffect(() => {
		const handleMessage = (e) => {
			if (typeof e.data === "string" && e.data.startsWith('htmlPage')) {
				htmlAction(e);
			}
		}
		window.addEventListener('message', handleMessage);
		return () => {
			window.removeEventListener('message', handleMessage);
		}
	}, [htmlAction]);

	if (updateResults.error) {
		// use empty command just to defer popView
		props.actions.doCommand('', () => {
			props.actions.popView();
		});
		return null;
	}
	const results = updateResults.length ? updateResults[0].results : {};

	const applyChanges = () => {
		const path = `${results.path}.Formula`;
		return (formula) => {
			props.actions.doCommand(`__blob__${path} set formula__blob__${formula}`, () => {
				props.actions.updateView(props.viewInfo.stackIndex);
				setDisplay(HtmlPageDisplay.main);
			});
		}
	}

	let displayComponent;
	if (display === HtmlPageDisplay.formulaEditor) {
		displayComponent = e(
			FormulaEditor, {
				id: 'htmlpage-formula-editor',
				key: 'editor',
				t: t,
				viewInfo: props.viewInfo,
				formula: results.formula,
				formulaOffset: formulaOffset,
				cancelAction: () => {
					setDisplay(HtmlPageDisplay.main);
				},
				applyChanges: applyChanges(),
			}
		);
	}
	else {
		displayComponent = e(
			'div', {
				key: 'htmppage',
				id: 'htmlpage',
			},
			e(
				// formula field line
				'div', {
					id: 'htmlpage__formula',
				},
				e(
					FormulaField, {
						t: t,
						actions: props.actions,
						path: `${results.path}.Formula`,
						formula: results.formula || '',
						viewInfo: props.viewInfo,
						infoWidth: props.infoWidth,
						clickAction: (offset) => {
							setFormulaOffset(offset);
							setDisplay(HtmlPageDisplay.formulaEditor);
						}
					}
				),
			),
			e(
				// rendered html
				'iframe', {
					id: 'htmlpage__iframe',
					srcDoc: results.html,
					sandbox: 'allow-scripts',
				},
			)
		)
	}

	return e(
		ToolView, {
			id: 'tool-view',
			displayComponent: displayComponent,
			...props,
		},
	);
}
