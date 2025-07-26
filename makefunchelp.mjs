import { writeFileSync } from 'node:fs';

// creates or updates the functions.html help file from the FunctionPickerData.js
// file.
// Inorder to get around module import problems with node, a link is made to
// FunctionPickerData.js from FunctionPickerData.mjs
async function main() {
	const pkg = await import('./FunctionPickerData.mjs');
	const functionPickerData = pkg.functionPickerData;
	const data = functionPickerData();
	const lines = [
		`<!DOCTYPE html>
		<html lang="en">
		<head>
		<meta name="viewport" content="initial-scale=1.0">
		<link rel="stylesheet" href="help.css" type="text/css">
		<script type="text/javascript" src="help.js"></script>
		<script type="text/javascript">
			window.onload = () => {
				rtSetupHeading('Formula Functions',{`
			];
	for (const section of data.sections) {
		const header = section.header;
		const tag = header.replace(/[\d\s]*/g, '');
		lines.push(`${tag}: "${header}",`);
	}				
	lines.push(`});
			};			
		</script>
		<style>
			.f-picker__f-def {
				color: blue;
				border-top: solid 1px black;
				padding: 3px 0;
				font-size: 16pt;
			}
			.f-desc {
				margin-bottom: 10px;
			}
		</style>
		<title>Formula Functions</title>
		</head>
		<body>
		<div id="page">
		<div id="heading"></div>
		<div id="menubody"></div>`);
	lines.push('<div id="header">Formula Functions</div>');
	for (let section of data.sections) {
		lines.push(`<div id="${section.header.replace(/[\d\s]*/g,'')}" class="section">`);
		lines.push(`<h3 class="f-picker__section-header">${section.header}</h3>`);
		if (section.comment) {
			lines.push('<div class="f-picker__comment">');
			lines.push(section.comment);
			lines.push('</div>');
		}

		for (let f of section.functions) {
			lines.push(`<div class="f-picker__f-def">${f.f}</div>`)
			lines.push(`<div class="f-desc">${f.desc}</div>`)
		}
	}
	lines.push('</body');
	lines.push('</html');
	writeFileSync('help/functions.html', lines.join('\n'));
}

main();
			
