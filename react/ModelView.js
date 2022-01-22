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
	const [editOptions, setEditOptions] = useState({});

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
		return null;
	}

	const applyInputChanges = (formula, path) => {
		props.actions.doCommand(`__blob__${path} set formula__blob__${formula}`, () => {
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
									onKeyPress: (event) => {
										// watches for Enter and sends command when it see it
										if (event.key == 'Enter') {
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
				if (results.inputs.length) {
					fields.push(
						e(
							'div', {
								id: 'model__inputs-title',
								key: 'inputsTitle',
							},
							t('react:modelInputsTitle'),
						)
					);
				}
				let nameSpace = results.modelPath;
				if (nameSpace) {
					const inputPathParts = nameSpace.split('.');
					if (inputPathParts.length > 2) {
						nameSpace = nameSpace.replace(/\.[^\.]*$/,'')
					}	
				}
				for (let input of results.inputs) {
					const inputPath = `${results.path}.${input.name}.formula`;
					const cmp = e(
						'div', {
							key: `input_${input.name}`,
							className: 'model__input-field',
						},
						e(
							'div', {
								className: 'model__input-field-name',
								onClick: () => {
									props.actions.viewTool(input.name, 'Expression');
								},
							},
							input.name,
						),
						e(
							FormulaField, {
								t: t,
								actions: props.actions,
								path: inputPath,
								formula: input.formula || '',
								viewInfo: props.viewInfo,
								infoWidth: props.infoWidth,
								editAction: (editOptions) => {
									editOptions.path = inputPath;
									editOptions.nameSpace = nameSpace;
									setEditOptions(editOptions);
									setDisplay(ModelDisplay.formulaEditor);
								},
								applyChanges: (formula) => {
									applyInputChanges(formula, inputPath)
								},	
							}
						),
						e(
							'div', {
								className: 'model__input-field-value',
								onClick: () => {
									props.actions.viewTool(input.name, 'Expression');
								},
							},
							'=> ',
							input.value
						)
					);
					fields.push(cmp);
				}

				if (results.outputs.length) {
					fields.push(
						e(
							'div', {
								id: 'model__outputs-title',
								key: 'outputsTitle'
							},
							t('react:modelOutputsTitle'),
						)
					);
				}

				for (let output of results.outputs) {
					const cmp = e(
						'div', {
							key: `output_${output.name}`,
							className: 'model__output-field',
							onClick: () => {
								props.actions.viewTool(output.name, 'Expression');
							},
						},
						e(
							'div', {
								className: 'model__output-field-name',
							},
							output.name,
						),
						e(
							'div', {
								className: 'model__output-field-value',
							},
							'=> ', output.value
						)
					);
					fields.push(cmp);
				}

				if (results.others.length) {
					fields.push(
						e(
							'div', {
								id: 'model__others-title',
								key: 'othersTitle'
							},
							t('react:modelOthersTitle'),
						)
					);
				}
				for (let other of results.others) {
					const cmp = e(
						'div', {
							key: `other${other.name}`,
							className: 'model__other-field',
							onClick: () => {
								if (other.type === 'Model') {
									props.actions.pushModel(other.name)
								}
								else {
									props.actions.viewTool(other.name, other.type);
								}
							},
						},
						e(
							'div', {
								className: 'model__other-field-type',
							},
							other.type, ': ',
						),
						e(
							'div', {
								className: 'model__other-field-name',
							},
							other.name
						),
					);
					fields.push(cmp);
				}
				const indexToolInput = e(
					'input', {
						id: 'model__indextool-input',
						value: indexToolName,
						onChange: (event) => {
							// keeps input field in sync
							setIndexToolName(event.target.value);
						},
						onKeyPress: (event) => {
							// watches for Enter and sends command when it see it
							if (event.key == 'Enter') {
								props.actions.doCommand(`${props.viewInfo.path} set indexTool ${indexToolName}`, () => {
									event.target.blur();
									props.actions.updateView(props.viewInfo.stackIndex);
								});
							}
						}
					}
				)

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
