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

/* global
	i18next:readonly
	i18nextXHRBackend:readonly

*/

import {MMApp} from './react/MMApp.js';

const e = React.createElement;

i18next
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
				loadPath: './locales/{{lng}}/{{ns}}.json',
			}
		},
		(err, t) => {
			document.body.style.overflow = 'hidden';
			// initialized and ready to go!
			const domContainer = document.querySelector('#root');
			domContainer.style.height = '100%';
			domContainer.style.width = '100%';
			ReactDOM.render(e(MMApp, {t: t}), domContainer);
		}
	);

