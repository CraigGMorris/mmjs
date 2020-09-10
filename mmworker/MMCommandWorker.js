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
  'mmunits/MMUnitSystem.js',
  "MMMath.js",
  "MMValue.js",
  "MMNumberValue.js",
  "MMStringValue.js",
  "MMTableValue.js",
  "MMToolValue.js",
  'MMModel.js',
  "MMExpression.js",
  "MMMatrix.js",
  "MMFormula.js",
  "MMDataTable.js",
  "MMSolver.js",
  "MMOde.js"
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