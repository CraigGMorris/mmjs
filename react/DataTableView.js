'use strict';

import {ToolView} from './ToolView.js';

const e = React.createElement;
// const useState = React.useState;
const useEffect = React.useEffect;

/**
 * DataTableView
 * info view for data table
 */

export function DataTableView(props) {

	useEffect(() => {
		props.actions.setUpdateCommands(props.viewInfo.stackIndex,
			`${props.viewInfo.path} toolViewInfo`);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

//	let t = props.t;
	let displayComponent = e('div', {key: 'datatable'}, 'Some stuff');
	return e(
		ToolView, {
			id: 'tool-view',
			displayComponent: displayComponent,
			...props,
		},
	);
}
