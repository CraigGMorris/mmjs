// CoolProp wrapper to handle filesystem issues
export async function loadCoolProp() {
  console.log('Starting CoolProp loading...');
  
  // Test if WASM file is accessible
  try {
    console.log('Testing WASM file accessibility...');
    const wasmResponse = await fetch('./coolprop.wasm');
    if (wasmResponse.ok) {
      console.log('WASM file is accessible, size:', wasmResponse.headers.get('content-length'), 'bytes');
    } else {
      console.error('WASM file not accessible, status:', wasmResponse.status);
    }
  } catch (error) {
    console.error('Error testing WASM file accessibility:', error);
  }
  
  // Preload the WASM file
  console.log('Preloading WASM file...');
  const wasmResponse = await fetch('./coolprop.wasm');
  const wasmBinary = await wasmResponse.arrayBuffer();
  console.log('WASM file preloaded, size:', wasmBinary.byteLength, 'bytes');
  
  // Create a promise that resolves when the runtime is initialized
  let resolveModule, rejectModule;
  const moduleReady = new Promise((resolve, reject) => {
    resolveModule = resolve;
    rejectModule = reject;
  });
  
  // Configure Module before loading coolprop.js
  // Set it as a global variable as Emscripten expects
  self.Module = {
    noFSInit: true,
    wasmBinary: wasmBinary, // Provide the WASM binary directly
    locateFile: function(path) {
      console.log('Locating file:', path);
      return './coolprop.wasm';
    },
    onRuntimeInitialized: function() {
      console.log('CoolProp runtime initialized successfully');
      resolveModule();
    },
    onWasmLoad: function() {
      console.log('WASM file loaded successfully');
    },
    onWasmError: function(error) {
      console.error('WASM loading error:', error);
      rejectModule(error);
    },
    onAbort: function(what) {
      console.error('Module aborted:', what);
      rejectModule(new Error('Module aborted: ' + what));
    }
  };

  // Set a timeout for initialization
  setTimeout(() => {
    // Check if Module is available and has basic functionality
    if (typeof self.Module !== 'undefined' && self.Module.runtimeInitialized) {
      console.log('Module ready via runtimeInitialized flag');
      resolveModule();
    } else if (typeof self.Module !== 'undefined' && self.Module._main) {
      // If Module exists but onRuntimeInitialized didn't fire, assume it's ready
      console.warn('Module available but onRuntimeInitialized not called, proceeding anyway');
      resolveModule();
    } else {
      console.error('Module initialization timeout - Module state:', {
        exists: typeof self.Module !== 'undefined',
        runtimeInitialized: self.Module?.runtimeInitialized,
        hasMain: !!self.Module?._main,
        wasmMemory: !!self.Module?.wasmMemory,
        wasmExports: !!self.Module?.wasmExports,
        wasmBinary: !!self.Module?.wasmBinary
      });
      rejectModule(new Error('Module initialization timeout'));
    }
  }, 30000); // 30 second timeout

  try {
    console.log('Loading coolprop.js script...');
    // Load the coolprop.js script
    const response = await fetch('./coolprop.js');
    const scriptText = await response.text();
    console.log('coolprop.js script loaded, size:', scriptText.length, 'characters');
    
    console.log('Executing coolprop.js script...');
    // Execute the script
    eval(scriptText);
    console.log('coolprop.js script executed');
    
    // Check Module state after script execution
    console.log('Module state after script execution:', {
      exists: typeof self.Module !== 'undefined',
      runtimeInitialized: self.Module?.runtimeInitialized,
      hasMain: !!self.Module?._main,
      wasmMemory: !!self.Module?.wasmMemory,
      wasmExports: !!self.Module?.wasmExports,
      wasmBinary: !!self.Module?.wasmBinary
    });
    
    // Log all Module properties to see what's available
    if (typeof self.Module !== 'undefined') {
      console.log('All Module properties:', Object.keys(self.Module));
      console.log('Available Module functions:', Object.keys(self.Module).filter(key => typeof self.Module[key] === 'function'));
    }
    
    console.log('Waiting for module initialization...');
    // Wait for initialization
    await moduleReady;
    
    console.log('CoolProp loading completed successfully');
    return self.Module;
  } catch (error) {
    console.error('CoolProp loading failed:', error);
    throw error;
  }
} 