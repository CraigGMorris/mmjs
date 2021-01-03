// eslint-disable-next-line no-unused-vars
const showMenu = (menuName) => {
	const menu = document.getElementById(menuName);
	if (menu.getAttribute('hidden')) {
		menu.removeAttribute('hidden');
	}
	else {
		menu.setAttribute('hidden', true);
	}
}

// eslint-disable-next-line no-unused-vars
function rtSetupHeading(title, sections) {
	const heading = document.getElementById('heading');
	const lines = [];
	lines.push(`<div id="title">${title}</div>`);
	lines.push(`<div id="contentstoggle" onClick="showMenu('contentsmenu')">Help Contents</div>`);
	lines.push(`<div id="sectiontoggle" onClick="showMenu('sectionmenu')">Section Menu</div>`);
	lines.push('<div id="sectionmenu" hidden="true">');
	for (const url of Object.keys(sections)) {
		lines.push('<div class="sectionlink">')
		lines.push(`<a href="#${url}" class="sectionlink">${sections[url]}</a>`);
		lines.push('</div>')
	}
	lines.push('</div>');
	lines.push('<div id="contentsmenu" hidden="true">');
	lines.push(`
	<div class="contentlink"><a href="getstarted.html">Getting Started</a></div>
	<div class="contentlink"><a href="http://www.redtree.com/contact.html">Contact Me</a></div>
	<div class="contentlink"><a href="revisions.html">Revisions</a></div>
	<div>&nbsp;</div>
	<div class="contentlink"><a href="sessions.html">Sessions</a></div>
	<div class="contentlink"><a href="diagram.html">Diagram</a></div>
	<div class="contentlink"><a href="formula.html">Formulas</a></div>
	<div class="contentlink"><a href="formulafield.html">Formula Field</a></div>
	<div class="contentlink"><a href="units.html">Conversion Units</a></div>
	<div class="contentlink"><a href="functionpicker.html">Function Browser</a></div>
	<div class="contentlink"><a href="minionvalue.html">Minion Values</a></div>
	<div class="contentlink"><a href="unitpicker.html">Unit Browser</a></div>
	<div class="contentlink"><a href="objectpicker.html">Value Browser</a></div>
	<div class="contentlink"><a href="notes.html">Notes</a></div>
	<div class="contentlink"><a href="report.html">Reports</a></div>
	<div>&nbsp;</div>
	<div class="contentlink"><a href="tools.html">Calculation Tools</a></div>
	<div class="contentlink"><a href="datatable.html">Data Table</a></div>
	<div class="contentlink"><a href="expression.html">Expression</a></div>
	<div class="contentlink"><a href="solver.html">Equation Solver</a></div>
	<div class="contentlink"><a href="graph.html">Graph</a></div>
	<div class="contentlink"><a href="htmlform.html">HTML Page</a></div>
	<div class="contentlink"><a href="iterator.html">Iterator</a></div>
	<div class="contentlink"><a href="matrix.html">Matrix</a></div>
	<div class="contentlink"><a href="model.html">Model</a></div>
	<div class="contentlink"><a href="modelarray.html">Model Array</a></div>
	<div class="contentlink"><a href="ode.html">Ordinary Differential Equations</a></div>
	<div class="contentlink"><a href="optimize.html">Optimizer</a></div>
	<div>&nbsp;</div>
	<div class="contentlink"><a href="http://www.redtree.com/mm">MM Home Page</a></div>
	<div class="contentlink"><a href="http://www.redtree.com/mmexamples">Examples</a></div>
	<div class="contentlink"><a href="http://www.redtree.com//mm/tutorialv3.html">Tutorial</a></div>
	`);
	lines.push('</div>');
	heading.innerHTML = lines.join('\n');
}
