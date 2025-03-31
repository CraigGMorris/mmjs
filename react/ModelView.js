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
import {FormulaEditor} from './FormulaView.js';

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

/**
 * Enum for model display types.
 * @readonly
 * @enum {string}
 */
 const ModelDisplay = Object.freeze({
	model: 0,
	formulaEditor: 1,
});


/**
 * ModelView
 * info view for model
 */
export function ModelView(props) {

	const t = props.t;
	const updateResults = props.viewInfo.updateResults;

	const [importSource, setImportSource] = useState('');
	const [indexToolName, setIndexToolName] = useState('');
	const [display, setDisplay] = useState(ModelDisplay.model);

	const editOptions = {}
	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (updateResults && updateResults[0]) {
			setImportSource(updateResults[0].results.importSource || '');
			setIndexToolName(updateResults[0].results.indexTool || '');
		}
	}, [updateResults]);

	if (updateResults.error) {
		// use empty command just to defer popView
		props.actions.doCommand('', () => {
			props.actions.popView();
		});
		// return null; // removed this to prevent error on undo of new model Why originally needed?
	}

	const htmlAction = React.useCallback(e => {
		if (!updateResults.error) {
			const results = updateResults.length ? updateResults[0].results : {};
			if (results.path) {
				const source = e.source
				const message = e.data.substring(8)
				props.actions.doCommand(`${results.path} htmlaction${message}`, (results) => {
					if (results && results[0] && results[0].results) {
						const received = results[0].results;
						if (received.results) {
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

	const applyInputChanges = (formula, path) => {
		props.actions.doCommand(`${path} set formula${formula}`, () => {
			props.actions.updateView(props.viewInfo.stackIndex);
			setDisplay(ModelDisplay.model);
		});
	}

	let viewComponent;
	switch (display) {
		case ModelDisplay.formulaEditor: {
			viewComponent = e(
				FormulaEditor, {
					id: 'datatable__column-formula-editor',
					key: 'edit',
					t: t,
					viewInfo: props.viewInfo,
					infoWidth: props.infoWidth,
					infoHeight: props.infoHeight,
					actions: props.actions,
					editOptions: editOptions,
					cancelAction: () => {
						setDisplay(ModelDisplay.model);
					},
					applyChanges: (formula) => {
						applyInputChanges(formula, editOptions.path)
					},	
				}
			);
		}
			break;
		case ModelDisplay.model: {

			const fields = [];
			if (updateResults && updateResults.length) {
				const results = updateResults[0].results;
				if (results.importSource != null) {
					fields.push(
						e(
							'div', {
								id: 'model__import-source',
								key: 'importSource'
							},
							e(
								'div', {
									id: 'model__import-label'
								},
								t('react:modelImportLabel')
							),
							e(
								'button', {
									id: 'model__import-makelocal',
									onClick: () => {
										props.actions.doCommand(`${results.path} makelocal`, () => {
											props.actions.updateView(props.viewInfo.stackIndex);
										})
									},
								},
								t('react:modelMakeLocal')
							),
							e(
								'input', {
									id: 'model__import-input',
									value: importSource,
									onChange: (event) => {
										setImportSource(event.target.value);
									},
									onKeyDown: (event) => {
										// watches for Enter and sends command when it see it
										if (event.code == 'Enter') {
											props.actions.doCommand(`${results.path} import ${importSource}`, () => {
												props.actions.updateView(props.viewInfo.stackIndex);
											})
										}
									}
								}
							)
						)
					)
				}
				
					const indexToolInput = e(
					'input', {
						id: 'model__indextool-input',
						value: indexToolName,
						onChange: (event) => {
							// keeps input field in sync
							setIndexToolName(event.target.value);
						},
						onKeyDown: (event) => {
							// watches for Enter and sends command when it see it
							if (event.code == 'Enter') {
								props.actions.doCommand(`${props.viewInfo.path} set indexTool ${indexToolName}`, () => {
									event.target.blur();
									props.actions.updateView(props.viewInfo.stackIndex);
								});
							}
						}
					}
				)

				fields.push(e(
						// rendered html
						'iframe', {
							id: 'htmlpage__iframe',
							srcDoc: results.html,
							sandbox: 'allow-scripts allow-modals allow-popups',
							key: 'iframe',
						},
					)
				);
	
				const indexToolFields = e(
					'div', {
						id: 'model__indextool-fields',
						key: '_indextool',
						title: t('react:modelIndexToolTitle'),
					},
					e(
						'div', {
							id: 'model__indextool-label',
						},
						t('react:modelIndexToolLabel')
					),
					indexToolInput
				);
				fields.push(indexToolFields);	
			}
			viewComponent = fields;
		}
		break;
	}


	let displayComponent = e(
		'div', {
			key: 'model',
			id: 'model',
		},
		e(
			'div', {
				id: 'model__fields-list',
			},
			viewComponent,
		),
	);

	return e(
		ToolView, {
			id: 'tool-view',
			displayComponent: displayComponent,
			...props,
		},
	);
}
