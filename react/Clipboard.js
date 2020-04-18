'use strict';
const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

var clipboardText = '';
var useNavigator = (navigator.vendor.startsWith('Google') && navigator.clipboard);

export function hasSystemClipboard() { return useNavigator; } 

export async function readClipboard() {
	if (useNavigator) {
		return navigator.clipboard.readText();
	}
	else {
		return new Promise((resolve) => {
			resolve(clipboardText);
		});
	}
}

export async function writeClipboard(text) {
	if (useNavigator) {
			return navigator.clipboard.writeText(text);
		}
		else {
			return new Promise((resolve) => {
				clipboardText = text;
				resolve(clipboardText);
			});
		}
}

export function ClipboardView() {
	const [displayedText, setDisplayedText] = useState(clipboardText);
	useEffect(() => {
		clipboardText = displayedText;
	})

	return e(
		'div', {
			id: 'clipboard',
		},
		e(
			'textarea',{
				id: 'clipboard__display',
				value: displayedText,
				onChange: (event) => {
					// keeps input field in sync
					setDisplayedText(event.target.value);	
				},
			}
		),
	)
}