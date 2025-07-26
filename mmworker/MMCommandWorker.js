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

import { setupImports } from './aggregator.js';

/**
 * @global theMMSession
 */
// eslint-disable-next-line no-unused-vars
// var theMMSession;

class MMCommandWorker {
  constructor() {
    this.processor = new MMCommandProcessor();
    self.theMMSession = new MMSession(this.processor)

    this.processor.setStatusCallBack((message) => {
      const msg = {
        verb: 'status',
        results: message
      }
      postMessage([msg]);
    }); 
  }
}

var worker;

// Initialize everything before creating the worker
(async function() {
  try {
    await setupImports();
    worker = new MMCommandWorker();
    console.log('Worker initialized successfully');
    
    // Send ready signal to main thread
    postMessage({
      verb: 'ready',
      results: 'Worker is ready to process commands'
    });
  } catch (error) {
    console.error('Failed to initialize worker:', error);
    
    // Send error signal to main thread
    postMessage({
      verb: 'error',
      results: 'Failed to initialize worker: ' + error.message
    });
  }
})();

onmessage = async function(e) {
  // console.log('Worker: Message received from main script');
  if (!worker) {
    console.error('Worker not yet initialized');
    return;
  }
  let result = await worker.processor.processCommandString(e.data);
  if (result) {
    // console.log('Worker: Posting message back to main script');
    postMessage(result);
  } else {
    // console.log('Worker: No result');
  }
}