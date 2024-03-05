// The version of the cache.
const VERSION = "2024.03.05";

// The name of the cache
const CACHE_NAME = `mathminion-${VERSION}`;

// The static resources that the app needs to function.
const APP_STATIC_RESOURCES = [
  "/",
	"PWAManifest.json",
  "index.html",
	"index.js",
	"minion.svg",
	"mmsite.css",
	"run.html",
	"macapp.html",
	"LICENSE.txt",
	"apple-touch-icon.png",
	"examples/Financial.txt",
	"examples/Foot_Inch_Calculator.txt",
	"examples/FormatTime.txt",
	"examples/FrictionFactor.txt",
	"examples/McCabe_Thiele.txt",
	"examples/Predator.txt",
	"examples/Taylor_Series_Expansion.txt",
	"examples/Triangulate.txt",
	"examples/Turbine.txt",
	"examples/examples.txt",
	"examples/htmlpage.css",
	"examples/indexof.txt",
	"examples/number_commas.txt",
	"examples/orbits.txt",
	"examples/weather.csv",
	"help/Getting Started.txt",
	"help/broyden.png",
	"help/button.html",
	"help/button.png",
	"help/complex.html",
	"help/connections.png",
	"help/console.html",
	"help/customunits.png",
	"help/datatable.html",
	"help/datatable.png",
	"help/datatablecharge.png",
	"help/datatablecoledit1.png",
	"help/datatablecoledit2.png",
	"help/datatablecoledit3.png",
	"help/datatabledel.png",
	"help/datatablefilter.png",
	"help/datatablerowedit.png",
	"help/dgmtop.png",
	"help/diagram.html",
	"help/examples.html",
	"help/expression.html",
	"help/expression.png",
	"help/expression2.png",
	"help/formula.html",
	"help/formulaedit.png",
	"help/formulaedit2.png",
	"help/formulaedit3.png",
	"help/formulaedit4.png",
	"help/formulaedit5.png",
	"help/formulaedit6.png",
	"help/formulaedit7.png",
	"help/formulaedit8.png",
	"help/formulaeditor.html",
	"help/formulafield.png",
	"help/freeprivate.html",
	"help/funcbrowser.png",
	"help/functions.html",
	"help/getstarted.html",
	"help/graph.html",
	"help/graph2dinfo.png",
	"help/help.css",
	"help/help.js",
	"help/helppage.html",
	"help/htmlpage.html",
	"help/htmlpage.png",
	"help/imported.png",
	"help/importedmodel.html",
	"help/infotop.png",
	"help/infoview.html",
	"help/iterator.html",
	"help/iterinfo.png",
	"help/matrix.html",
	"help/matrix.png",
	"help/menu.html",
	"help/menu.png",
	"help/minion64.png",
	"help/minionvalue.html",
	"help/mmserver.html",
	"help/model.html",
	"help/model.png",
	"help/news.html",
	"help/notes.html",
	"help/notesview.png",
	"help/ode.html",
	"help/ode.png",
	"help/ode2.png",
	"help/optimizer.html",
	"help/optimizer.png",
	"help/plot2d.png",
	"help/pwa.html",
	"help/sessionmenu.png",
	"help/sessions.html",
	"help/sessions.png",
	"help/seteditor.png",
	"help/solver.html",
	"help/somethingwrong.html",
	"help/subsession.png",
	"help/surface3d.png",
	"help/tablevalue.png",
	"help/toolicons.png",
	"help/tools.html",
	"help/tutorial.html",
	"help/tutorial/phoneinfobtns.png",
	"help/tutorial/phonedgmbtns.png",
	"help/tutorial/infobuttons.png",
	"help/tutorial/sessionstop.png",
	"help/tutorial/blanksession.png",
	"help/tutorial/expression.png",
	"help/tutorial/bmi1.png",
	"help/tutorial/bmi2.png",
	"help/tutorial/bmiweight.png",
	"help/tutorial/bmiheight.png",
	"help/tutorial/bmidgm1.png",
	"help/tutorial/bmifedit1.png",
	"help/tutorial/bmifedit2.png",
	"help/tutorial/bmifedit3.png",
	"help/tutorial/bmifedit4.png",
	"help/tutorial/bmifedit5.png",
	"help/tutorial/bmiunits1.png",
	"help/tutorial/bmifedit6.png",
	"help/tutorial/bmifunc1.png",
	"help/tutorial/bmifunc2.png",
	"help/tutorial/bmifunc3.png",
	"help/tutorial/bmifunc4.png",
	"help/tutorial/bmifedit7.png",
	"help/tutorial/bmifedit8.png",
	"help/tutorial/bmifedit9.png",
	"help/tutorial/bmiroot1.png",
	"help/tutorial/bmiroot2.png",
	"help/tutorial/bmidgm2.png",
	"help/tutorial/bmidgm3.png",
	"help/tutorial/bmiroot3.png",
	"help/tutorial/bmiroot4.png",
	"help/unitbrowser.png",
	"help/units.html",
	"help/units.png",
	"help/unitsets.png",
	"help/videos.html",
	"help/tutorial/getstarted.png",
	"locales/en/cmd.json",
	"locales/en/mmcmd.json",
	"locales/en/mmunit.json",
	"locales/en/react.json",
	"mmworker/MMButton.js",
	"mmworker/MMCommandPipe.js",
	"mmworker/MMCommandProcessor.js",
	"mmworker/MMCommandWorker.js",
	"mmworker/MMDataTable.js",
	"mmworker/MMExpression.js",
	"mmworker/MMFormula.js",
	"mmworker/MMGraph.js",
	"mmworker/MMHtmlPage.js",
	"mmworker/MMIterator.js",
	"mmworker/MMJsonValue.js",
	"mmworker/MMMath.js",
	"mmworker/MMMatrix.js",
	"mmworker/MMMenu.js",
	"mmworker/MMModel.js",
	"mmworker/MMNumberValue.js",
	"mmworker/MMOde.js",
	"mmworker/MMOptimizer.js",
	"mmworker/MMReport.js",
	"mmworker/MMSession.js",
	"mmworker/MMSolver.js",
	"mmworker/MMStringValue.js",
	"mmworker/MMTableValue.js",
	"mmworker/MMTool.js",
	"mmworker/MMToolValue.js",
	"mmworker/MMValue.js",
	"mmworker/mmunits/MMUnitSystem.js",
	"news/MM_News.txt",
	"offline/i18next.js",
	"offline/i18nextXHRBackend.js",
	"offline/react-dom.development.js",
	"offline/react.development.js",
	"react/ButtonView.js",
	"react/Clipboard.js",
	"react/ConsoleView.js",
	"react/DataTableView.js",
	"react/Diagram.js",
	"react/ExpressionView.js",
	"react/FormulaView.js",
	"react/FunctionPickerData.js",
	"react/GraphView.js",
	"react/HtmlPageView.js",
	"react/IteratorView.js",
	"react/MMApp.js",
	"react/MatrixView.js",
	"react/MenuView.js",
	"react/ModelView.js",
	"react/OdeView.js",
	"react/OptimizerView.js",
	"react/SessionsView.js",
	"react/SolverView.js",
	"react/TableView.js",
	"react/ToolView.js",
	"react/UnitsView.js",
	"react/mmjs.css",
];

// On install, cache the static resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_STATIC_RESOURCES);
			// console.log('addAll finished');
    })()
  );
});

// delete old caches on activate
self.addEventListener("activate", (event) => {
	// console.log('in activate');
  event.waitUntil(
    (async () => {
			// console.log('in waitUntil');
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
					// console.log(`activate map ${name}`)
          if (name !== CACHE_NAME) {
						// console.log(`deleting ${name}`);
            return caches.delete(name);
          }
        })
      );
      await clients.claim();
    })()
  );
});

// On fetch, intercept server requests
// and respond with cached responses instead of going to network
self.addEventListener("fetch", (event) => {
	// console.log('in fetch');
	// Check if the request is for a directory we don't want to cache
	if (event.request.url.includes('/video/') || event.request.url.includes('/downloads/')) {
		// Use network only strategy for these directories
		event.respondWith(fetch(event.request));
		return;
	}

  // For all other requests, go to the cache first, and then the network.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        // Return the cached response if it's available.
				// console.log(`found cached ${event.request.url}`);
        return cachedResponse;
      }
			try {
				// console.log(`trying network for ${event.request.url}`);
				const networkResponse = await fetch(event.request);
				if (networkResponse.ok && !event.request.url.includes('?')) {
					// console.log(`network got ${event.request.url}`);
					cache.put(event.request, networkResponse.clone());
				}
				return networkResponse;
			} catch (error) {
				console.log(`could not get ${event.request.url}`);
	      return new Response(null, { status: 404 });
			}
    })()
  );
});
