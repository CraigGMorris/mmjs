'use strict';

/**
 * @global theMMSession
 */
var theMMSession;

importScripts(
  'MMCommandProcessor.js',
  'MMSession.js',
  'mmunits/MMUnitSystem.js',
  'MMModel.js',
  "MMExpression.js",
  "MMMatrix.js",
  "MMFormula.js",
  "MMValue.js"
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