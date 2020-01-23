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
	const doRename = () => {
		const path = props.viewInfo.path;
		if (path.split('.').pop() != toolName) {
			props.actions.renameTool(path, toolName);
		}
	}

	return e(
		'div', {
			id: 'tool-view',
		},
		e(
			'input', {
				id: 'tool-view__name',
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
		[props.toolComponent]
	)
}
