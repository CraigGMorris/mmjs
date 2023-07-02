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
	console.log(history.length);
	if (!history.state  &&  typeof(history.replaceState) == "function") {
		history.replaceState({ page: history.length, href: location.href }, "foo");
	}
	console.log(history.state);
	const pageNumber = history.state.page;

	const lines = [];
	lines.push(`<div id="title">`);
	if (pageNumber !== 1) {
		lines.push('<span class="clickable" onClick="history.back();" title="Back">&lt;</span>')
	}
	else {
		lines.push('<span>&nbsp;</span>');
	}
	lines.push(title);
	if (pageNumber !== history.length) {
		lines.push('<span class="clickable" onClick="history.forward();" title="Forward">&gt;</span>');
	}
	else {
		lines.push('<span>&nbsp;</span>');
	}
	lines.push(`<span class="clickable" onClick="window.close();" title="Close">X</span>
		</div>`);
	lines.push(`<div class="clickable" id="contentstoggle" onClick="showMenu('contentsmenu')">Help Contents</div>`);
	lines.push(`<div class="clickable" id="sectiontoggle" onClick="showMenu('sectionmenu')">Section Menu</div>`);
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
	<div class="contentlink"><a href="videos.html">Videos</a></div>
	<div class="contentlink"><a href="tutorial.html">Tutorial</a></div>
	<div class="contentlink"><a href="examples.html">Examples</a></div>
	<div class="contentlink"><a href="http://www.redtree.com/contact.html">Contact Me</a></div>
	<div class="contentlink"><a href="freeprivate.html">License</a></div>
	<div>&nbsp;</div>
	<div class="contentlink"><a href="diagram.html">Diagram</a></div>
	<div class="contentlink"><a href="infoview.html">Information View</a></div>
	<div class="contentlink"><a href="sessions.html">Sessions</a></div>
	<div class="contentlink"><a href="units.html">Conversion Units</a></div>
	<div class="contentlink"><a href="console.html">Console</a></div>
	<div>&nbsp;</div>
	<div class="contentlink"><a href="formula.html">Formulas</a></div>
	<div class="contentlink"><a href="minionvalue.html">Minion Values</a></div>
	<div class="contentlink"><a href="formulaeditor.html">Formula Editor</a></div>
	<div class="contentlink subsection"><a href="formulaeditor.html#vbrowser">Value Browser</a></div>
	<div class="contentlink subsection"><a href="formulaeditor.html#ubrowser">Unit Browser</a></div>
	<div class="contentlink subsection"><a href="formulaeditor.html#fbrowser">Function Browser</a></div>
	<div class="contentlink"><a href="complex.html">Complex Numbers</a></div>
	<div>&nbsp;</div>
	<div class="contentlink"><a href="tools.html">Tools</a></div>
	<div class="contentlink subsection"><a href="expression.html">Expression</a></div>
	<div class="contentlink subsection"><a href="model.html">Model</a></div>
	<div>&nbsp;</div>
	<div class="contentlink subsection"><a href="datatable.html">Data Table</a></div>
	<div class="contentlink subsection"><a href="solver.html">Function Solver</a></div>
	<div class="contentlink subsection"><a href="iterator.html">Iterator</a></div>
	<div class="contentlink subsection"><a href="matrix.html">Matrix</a></div>
	<div class="contentlink subsection"><a href="ode.html">Ordinary Differential Equations</a></div>
	<div class="contentlink subsection"><a href="optimizer.html">Optimizer</a></div>
	<div class="contentlink subsection"><a href="importedmodel.html">Imported Model</a></div>
	<div>&nbsp;</div>
	<div class="contentlink subsection"><a href="graph.html">Graph</a></div>
	<div class="contentlink subsection"><a href="htmlpage.html">HTML Page</a></div>
	<div class="contentlink subsection"><a href="button.html">Button</a></div>
	<div class="contentlink subsection"><a href="menu.html">Menu</a></div>
	<div>&nbsp;</div>
	<div class="contentlink subsection"><a href="notes.html">Tool Notes</a></div>
	<div>&nbsp;</div>
	<div class="contentlink"><a href="mmserver.html">Running a MM Server</a></div>
	<div class="contentlink"><a href="somethingwrong.html">Something Wrong</a></div>
	<div>&nbsp;</div>
	<div class="contentlink"><a href="../index.html">MM Home Page</a></div>
	`);
	lines.push('</div>');
	heading.innerHTML = lines.join('\n');
}
