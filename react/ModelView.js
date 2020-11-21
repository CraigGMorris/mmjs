'use strict';

import {ToolView} from './ToolView.js';

const e = React.createElement;
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

	const t = props.t;
	const updateResults = props.viewInfo.updateResults;
	if (updateResults.error) {
		// use empty command just to defer popView
		props.actions.doCommand('', () => {
			props.actions.popView();
		});
		return null;
	}

	const fields = [];
	if (updateResults && updateResults.length) {
		const results = updateResults[0].results;
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
		for (let input of results.inputs) {
			const cmp = e(
				'div', {
					key: `input_${input.name}`,
					className: 'model__input-field',
					onClick: () => {
						props.actions.viewTool(input.name, 'Expression');
					},
				},
				e(
					'div', {
						className: 'model__input-field-name',
					},
					input.name,
				),
				e(
					'div', {
						className: 'model__input-field-formula',
					},
					'= ', input.formula
				),
				e(
					'div', {
						className: 'model__input-field-value',
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
			fields,
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
