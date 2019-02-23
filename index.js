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
			// Ugly kludge to try and get around vh not reflecting the true viewport height
			var bMobile =   // will be true if running on a mobile device
				navigator.userAgent.indexOf( "Mobile" ) !== -1 || 
				navigator.userAgent.indexOf( "iPhone" ) !== -1 || 
				navigator.userAgent.indexOf( "Android" ) !== -1 || 
				navigator.userAgent.indexOf( "Windows Phone" ) !== -1;
			if (bMobile) {
				document.body.style.height = 'calc(100vh - 70px)';
			}
			else {
				document.body.style.height = 'calc(100vh - 20px)';
			}
			// initialized and ready to go!
			const domContainer = document.querySelector('#root');
			ReactDOM.render(e(MMApp, {t: t}), domContainer);
		}
	);

