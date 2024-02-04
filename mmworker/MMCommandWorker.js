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
  importScripts:readonly
  MMCommandProcessor:readonly
  MMSession:readonly
*/

/**
 * @global theMMSession
 */
// eslint-disable-next-line no-unused-vars
var theMMSession;

importScripts(
  'MMCommandProcessor.js',
  'MMSession.js',
  "MMReport.js",
  'mmunits/MMUnitSystem.js',
  "MMMath.js",
  "MMValue.js",
  "MMNumberValue.js",
  "MMStringValue.js",
  "MMTableValue.js",
  "MMJsonValue.js",
  "MMToolValue.js",
  "MMTool.js",
  'MMModel.js',
  "MMExpression.js",
  "MMMatrix.js",
  "MMFormula.js",
  "MMDataTable.js",
  "MMSolver.js",
  "MMOde.js",
  "MMIterator.js",
  "MMOptimizer.js",
  "MMGraph.js",
  "MMHtmlPage.js",
  "MMButton.js",
  "MMMenu.js"
);

class MMCommandWorker {
  constructor() {
    this.processor = new MMCommandProcessor();
    theMMSession = new MMSession(this.processor)

    this.processor.setStatusCallBack((message) => {
      const msg = {
        verb: 'status',
        results: message
      }
      postMessage([msg]);
    });  
  }
}

var worker = new MMCommandWorker();

onmessage = async function(e) {
  // console.log('Worker: Message received from main script');
  let result = await worker.processor.processCommandString(e.data);
  if (result) {
    // console.log('Worker: Posting message back to main script');
    postMessage(result);
  } else {
    // console.log('Worker: No result');
  }
}