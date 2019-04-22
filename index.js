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
			document.body.style.overflow = 'hidden';
 			// initialized and ready to go!
			const domContainer = document.querySelector('#root');
			domContainer.style.height = '100%';
			domContainer.style.width = '100%';
			domContainer.style.border = 'solid 1px';
			ReactDOM.render(e(MMApp, {t: t}), domContainer);
		}
	);

