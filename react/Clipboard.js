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

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;

var clipboardText = '';
var importedFileText = '';
var useNavigator = (navigator.vendor.startsWith('Google') && navigator.clipboard);

export function hasSystemClipboard() { return useNavigator; } 

export async function readClipboard() {
	if (useNavigator) {
		let result = await navigator.clipboard.readText();
		return result;
	}
	else {
		return new Promise((resolve) => {
			if (importedFileText) {
				resolve(importedFileText);
			}
			resolve(clipboardText);
		});
	}
}

export async function writeClipboard(text) {
	if (useNavigator) {
			const result = await navigator.clipboard.writeText(text);
			return result;
		}
		else {
			return new Promise((resolve) => {
				clipboardText = text;
				resolve(clipboardText);
			});
		}
}

export function ClipboardView(props) {
	const [displayedText, setDisplayedText] = useState(clipboardText);
	useEffect(() => {
		clipboardText = displayedText;
	})

	importedFileText = '';
	return e(
		'div', {
			id: 'clipboard',
		},
		e(
			'div', {
				id: 'clipboard__header'
			},
			e(
				'div', {
					id: 'clipboard__header-title'
				},
				props.t('react:clipboardTitle')
			),
			e(
				'label', {
					id: 'clipboard__import-button',
					className: 'input-file-button',
				},
				props.t('react:clipboardImportButton'),
				e(
					'input', {
						id: 'clipboard__import-input',
						type: 'file',
						onChange: event => {
							var f = event.target.files[0];		
							if (f) {
								let r = new FileReader();
								r.onload = (e) => { 
									let contents = e.target.result;
									importedFileText = contents;
									props.close();
								};
								r.readAsText(f);
							} else { 
								alert("Failed to load file");
							}
						},
					}
				),
			)	
		),
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