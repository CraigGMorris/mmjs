
importScripts('MMCommandProcessor.js');

class MMCommandWorker {
  constructor() {
    this.processor = new MMCommandProcessor();
    let root = new MMCommandParent('root', this.processor, 'MMCommandParent')

 	  this.processor.setErrorCallBack((message) => {
      const msg = {
        verb: 'error',
        results: message
      }
      postMessage([msg]);
    });

	  this.processor.setWarningCallBack((message) => {
      const msg = {
        verb: 'warning',
        results: message
      }
      postMessage([msg]);
    });

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
;
onmessage = function(e) {
  console.log('Worker: Message received from main script');
  let result = worker.processor.processCommandString(e.data);
  if (result) {
    console.log('Worker: Posting message back to main script');
    postMessage(result);
  } else {
    console.log('Worker: No result');
  }
}