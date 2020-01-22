'use strict';

import {ToolNameField} from './MMApp.js';

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
	}, []);

	let t = props.t;
	return e(
		'div', {
			id: 'model',
		},
		e(
			'div', {
				style: {
					gridArea: 'name'
				},
			},
			e(
				ToolNameField, {
					t: t,
					viewInfo: props.viewInfo,
					actions: props.actions
				}
			)
		),
		e('div', {}, 'Some stuff')
	);
}
