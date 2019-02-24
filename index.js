'use strict';

import {MMCommandPipe} from '/mmworker/MMCommandPipe.js';
import {MMApp} from '/react/MMApp.js';

const e = React.createElement;

let i18n = i18next
	.use(i18nextXHRBackend)
	.init(
		{
			lng: 'en',
			fallbackLng: 'en',
			debug: false,
			ns: ['cmd', 'mmcmd', 'mmunit', 'react'],
			defaultNS: 'cmd',
			interpolation: { escapeValue: false },	// not html - if output is used for html, then escape
			backend: {
				loadPath: '/locales/{{lng}}/{{ns}}.json',
			}
		},
		(err, t) => {
			document.body.style.height = `${document.documentElement.clientHeight-15}px`;
			window.addEventListener('resize', (e) => {
				document.body.style.height = `${document.documentElement.clientHeight-15}px`;
			})
			// initialized and ready to go!
			const domContainer = document.querySelector('#root');
			ReactDOM.render(e(MMApp, {t: t}), domContainer);
		}
	);

