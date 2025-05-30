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
 * info view for html page
 * 
 * The html that results from evaluating the formula is displayed in
 * an iframe that is sandboxed with the only communication being by
 * postMessage and a message event listener.
 * 
 * The actual work of generating the processed html and responding to mm_post calls
 * is done by the webworker MMHtmlPage.  Communication with it is also by message
 * passing using the MMApp doCommand in props.actions
 */
export function HtmlPageView(props) {
	const [display, setDisplay] = useState(HtmlPageDisplay.input);
	const [editOptions, setEditOptions] = useState({});
	const [htmlResults, setHtmlResults] = useState(null);

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const t = props.t;
	const updateResults = props.viewInfo.updateResults;

	useEffect(() => {
		if (updateResults && updateResults[0]) {
			setTimeout(() => {
				// for some reason Chromium browsers need a short delay
				setHtmlResults(updateResults[0].results.html);
			}, 20);
		}
	}, [updateResults]);

	const htmlAction = React.useCallback(e => {
		if (!updateResults.error) {
			const results = updateResults.length ? updateResults[0].results : {};
			if (results.path) {
				const source = e.source
				const message = e.data.substring(8)
				props.actions.doCommand(`${results.path} htmlaction ${message}`, (results) => {
					if (results && results[0] && results[0].results) {
						const received = results[0].results;
						if (received.results) {
							// send message to the html page
							source.postMessage(received, '*');
						}
						if (received.didLoad) {
							if (received.resetInfo) {
								props.actions.resetInfoStack('root', received.resetInfo);
								props.actions.updateDiagram(true);
							}
						}
						else if (received.view) {
							// console.log(`view ${received.view.name} ${received.view.type}`);
							props.actions.viewTool(received.view.name, received.view.type);
							props.actions.updateDiagram();
						}
						else if (received.push) {
							// console.log(`push ${received.push.name} ${received.push.type}`);
							props.actions.pushTool(received.push.name, received.push.path, received.push.type);
							props.actions.updateDiagram();
						}
						else if (received.update) {
							// console.log('updating');
							props.actions.updateView(props.viewInfo.stackIndex);
						}
						else if (received.viewurl) {
							const page = received.viewurl.name;
							window.open(page);
							//window.open(`help/${page.toLowerCase()}.html`,'MM Help');
						}
						else {
							props.actions.updateDiagram();
						}
						// setDisplay(HtmlPageDisplay.main);
					}
				});
			}
		}
	}, [updateResults, props.actions, props.viewInfo.stackIndex]);

	useEffect(() => {
		// handle messages from the html page
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
			props.actions.doCommand(`${path} set formula ${formula}`, () => {
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
				infoWidth: props.infoWidth,
				infoHeight: props.infoHeight,
				actions: props.actions,
				editOptions: editOptions,
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
				key: 'htmlpage',
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
						editAction: (editOptions) => {
							setEditOptions(editOptions);
							setDisplay(HtmlPageDisplay.formulaEditor);
						},
						applyChanges: applyChanges(),
					}
				),
			),
			e(
				// rendered html
				'iframe', {
					id: 'htmlpage__iframe',
					srcDoc: htmlResults,
					sandbox: 'allow-scripts allow-modals allow-popups',
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
