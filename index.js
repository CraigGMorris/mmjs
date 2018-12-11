'use strict';

import {MMCommandPipe} from '/mmworker/MMCommandPipe.js';
import {MMView} from '/react/MMView.js';

const e = React.createElement;

let i18n = i18next
	.use(i18nextXHRBackend)
	.init(
		{
			lng: 'en',
			fallbackLng: 'en',
			debug: false,
			ns: ['cmd', 'mmcmd', 'usage'],
			defaultNS: 'cmd',
			interpolation: { escapeValue: false },	// not html - if output is used for html, then escape
			backend: {
				loadPath: '/locales/{{lng}}/{{ns}}.json',
			}
		},
		(err, t) => {
			// initialized and ready to go!
			const domContainer = document.querySelector('#root');
			ReactDOM.render(e(MMView, {i18n: i18n}), domContainer);
		}
	);

// early test code of Worker - just keeping it for reference until actual code implemented

class LikeButton extends React.Component {
	constructor(props) {
		super(props);
		this.state = { liked: false };
	}

	render() {
		if (this.state.liked) {
			let pipe = new MMCommandPipe();
			pipe.doCommand('list', (msg) => {
				// console.log('Main (myWorker.onmessage): Message received from worker');
				// console.log(msg.data); 
			});
			return e(
				'h2', null, i18n.t('cmd:hello', {world: 'craig'})
			);
		}

		return e(
			'div', null,
				e(
					'button',
					{ onClick: () => this.setState({ liked: true }) },
					'Like'
				),
				e(
					'p', null, 'A paragraph'
				)
		);
	}
}