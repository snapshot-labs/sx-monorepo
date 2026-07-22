// include: shell.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var blst = {}; ..generated code..
// 4. External script tag defines var blst.
// We need to check if blst already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use blst
// after the generated code, you will need to define   var blst = {};
// before the code. Then that object will be used in the code, and you
// can continue to use blst afterwards as well.
var blst = typeof blst != 'undefined' ? blst : {};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = typeof window == 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts == 'function';
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE =
    typeof process == 'object' &&
    typeof process.versions == 'object' &&
    typeof process.versions.node == 'string';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (blst['ENVIRONMENT']) {
    throw new Error(
        'blst.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)',
    );
}

if (ENVIRONMENT_IS_NODE) {
    // `require()` is no-op in an ESM module, use `createRequire()` to construct
    // the require()` function.  This is only necessary for multi-environment
    // builds, `-sENVIRONMENT=node` emits a static import declaration instead.
    // TODO: Swap all `require()`'s with `import()`'s?
}

// --pre-jses are emitted after the blst integration code, so that they can
// refer to blst (if they choose; they can also define blst)

// Sometimes an existing blst object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = Object.assign({}, blst);

var arguments_ = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
    throw toThrow;
};

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
    if (blst['locateFile']) {
        return blst['locateFile'](path, scriptDirectory);
    }
    return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var read_, readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {
    if (typeof process == 'undefined' || !process.release || process.release.name !== 'node')
        throw new Error(
            'not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)',
        );

    var nodeVersion = process.versions.node;
    var numericVersion = nodeVersion.split('.').slice(0, 3);
    numericVersion =
        numericVersion[0] * 10000 + numericVersion[1] * 100 + numericVersion[2].split('-')[0] * 1;
    var minVersion = 160000;
    if (numericVersion < 160000) {
        throw new Error(
            'This emscripten-generated code requires node v16.0.0 (detected v' + nodeVersion + ')',
        );
    }

    // These modules will usually be used on Node.js. Load them eagerly to avoid
    // the complexity of lazy-loading.
    var fs = require('fs');
    var nodePath = require('path');

    scriptDirectory = __dirname + '/';

    // include: node_shell_read.js
    read_ = (filename, binary) => {
        // We need to re-wrap `file://` strings to URLs. Normalizing isn't
        // necessary in that case, the path should already be absolute.
        filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
        return fs.readFileSync(filename, binary ? undefined : 'utf8');
    };

    readBinary = (filename) => {
        var ret = read_(filename, true);
        if (!ret.buffer) {
            ret = new Uint8Array(ret);
        }
        assert(ret.buffer);
        return ret;
    };

    readAsync = (filename, onload, onerror, binary = true) => {
        // See the comment in the `read_` function.
        filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
        fs.readFile(filename, binary ? undefined : 'utf8', (err, data) => {
            if (err) onerror(err);
            else onload(binary ? data.buffer : data);
        });
    };
    // end include: node_shell_read.js
    if (!blst['thisProgram'] && process.argv.length > 1) {
        thisProgram = process.argv[1].replace(/\\/g, '/');
    }

    arguments_ = process.argv.slice(2);

    if (typeof module != 'undefined') {
        module['exports'] = blst;
    }

    process.on('uncaughtException', (ex) => {
        // suppress ExitStatus exceptions from showing an error
        if (ex !== 'unwind' && !(ex instanceof ExitStatus) && !(ex.context instanceof ExitStatus)) {
            throw ex;
        }
    });

    quit_ = (status, toThrow) => {
        process.exitCode = status;
        throw toThrow;
    };
} else if (ENVIRONMENT_IS_SHELL) {
    if (
        (typeof process == 'object' && typeof require === 'function') ||
        typeof window == 'object' ||
        typeof importScripts == 'function'
    )
        throw new Error(
            'not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)',
        );
}

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    if (ENVIRONMENT_IS_WORKER) {
        // Check worker, not web, since window could be polyfilled
        scriptDirectory = self.location.href;
    } else if (typeof document != 'undefined' && document.currentScript) {
        // web
        scriptDirectory = document.currentScript.src;
    }
    // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
    // otherwise, slice off the final part of the url to find the script directory.
    // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
    // and scriptDirectory will correctly be replaced with an empty string.
    // If scriptDirectory contains a query (starting with ?) or a fragment (starting with #),
    // they are removed because they could contain a slash.
    if (scriptDirectory.startsWith('blob:')) {
        scriptDirectory = '';
    } else {
        scriptDirectory = scriptDirectory.substr(
            0,
            scriptDirectory.replace(/[?#].*/, '').lastIndexOf('/') + 1,
        );
    }

    if (!(typeof window == 'object' || typeof importScripts == 'function'))
        throw new Error(
            'not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)',
        );

    {
        // include: web_or_worker_shell_read.js
        read_ = (url) => {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            xhr.send(null);
            return xhr.responseText;
        };

        if (ENVIRONMENT_IS_WORKER) {
            readBinary = (url) => {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, false);
                xhr.responseType = 'arraybuffer';
                xhr.send(null);
                return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
            };
        }

        readAsync = (url, onload, onerror) => {
            // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
            // See https://github.com/github/fetch/pull/92#issuecomment-140665932
            // Cordova or Electron apps are typically loaded from a file:// url.
            // So use XHR on webview if URL is a file URL.
            if (isFileURI(url)) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'arraybuffer';
                xhr.onload = () => {
                    if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
                        // file URLs can return 0
                        onload(xhr.response);
                        return;
                    }
                    onerror();
                };
                xhr.onerror = onerror;
                xhr.send(null);
                return;
            }
            fetch(url, { credentials: 'same-origin' })
                .then((response) => {
                    if (response.ok) {
                        return response.arrayBuffer();
                    }
                    return Promise.reject(new Error(response.status + ' : ' + response.url));
                })
                .then(onload, onerror);
        };
        // end include: web_or_worker_shell_read.js
    }
} else {
    throw new Error('environment detection error');
}

var out = blst['print'] || console.log.bind(console);
var err = blst['printErr'] || console.error.bind(console);

// Merge back in the overrides
Object.assign(blst, moduleOverrides);
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used.
moduleOverrides = null;
checkIncomingModuleAPI();

// Emit code to handle expected values on the blst object. This applies blst.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.

if (blst['arguments']) arguments_ = blst['arguments'];
legacyModuleProp('arguments', 'arguments_');

if (blst['thisProgram']) thisProgram = blst['thisProgram'];
legacyModuleProp('thisProgram', 'thisProgram');

if (blst['quit']) quit_ = blst['quit'];
legacyModuleProp('quit', 'quit_');

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// Assertions on removed incoming blst JS APIs.
assert(
    typeof blst['memoryInitializerPrefixURL'] == 'undefined',
    'blst.memoryInitializerPrefixURL option was removed, use blst.locateFile instead',
);
assert(
    typeof blst['pthreadMainPrefixURL'] == 'undefined',
    'blst.pthreadMainPrefixURL option was removed, use blst.locateFile instead',
);
assert(
    typeof blst['cdInitializerPrefixURL'] == 'undefined',
    'blst.cdInitializerPrefixURL option was removed, use blst.locateFile instead',
);
assert(
    typeof blst['filePackagePrefixURL'] == 'undefined',
    'blst.filePackagePrefixURL option was removed, use blst.locateFile instead',
);
assert(typeof blst['read'] == 'undefined', 'blst.read option was removed (modify read_ in JS)');
assert(
    typeof blst['readAsync'] == 'undefined',
    'blst.readAsync option was removed (modify readAsync in JS)',
);
assert(
    typeof blst['readBinary'] == 'undefined',
    'blst.readBinary option was removed (modify readBinary in JS)',
);
assert(
    typeof blst['setWindowTitle'] == 'undefined',
    'blst.setWindowTitle option was removed (modify emscripten_set_window_title in JS)',
);
assert(
    typeof blst['TOTAL_MEMORY'] == 'undefined',
    'blst.TOTAL_MEMORY has been renamed blst.INITIAL_MEMORY',
);
legacyModuleProp('asm', 'wasmExports');
legacyModuleProp('read', 'read_');
legacyModuleProp('readAsync', 'readAsync');
legacyModuleProp('readBinary', 'readBinary');
legacyModuleProp('setWindowTitle', 'setWindowTitle');
var IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
var PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
var WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
var FETCHFS = 'FETCHFS is no longer included by default; build with -lfetchfs.js';
var ICASEFS = 'ICASEFS is no longer included by default; build with -licasefs.js';
var JSFILEFS = 'JSFILEFS is no longer included by default; build with -ljsfilefs.js';
var OPFS = 'OPFS is no longer included by default; build with -lopfs.js';

var NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';

assert(
    !ENVIRONMENT_IS_SHELL,
    'shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable.',
);

// end include: shell.js

// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary;
if (blst['wasmBinary']) wasmBinary = blst['wasmBinary'];
legacyModuleProp('wasmBinary', 'wasmBinary');

if (typeof WebAssembly != 'object') {
    err('no native wasm support detected');
}

// Wasm globals

var wasmMemory;

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert(condition, text) {
    if (!condition) {
        abort('Assertion failed' + (text ? ': ' + text : ''));
    }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.

// Memory management

var HEAP,
    /** @type {!Int8Array} */
    HEAP8,
    /** @type {!Uint8Array} */
    HEAPU8,
    /** @type {!Int16Array} */
    HEAP16,
    /** @type {!Uint16Array} */
    HEAPU16,
    /** @type {!Int32Array} */
    HEAP32,
    /** @type {!Uint32Array} */
    HEAPU32,
    /** @type {!Float32Array} */
    HEAPF32,
    /** @type {!Float64Array} */
    HEAPF64;

// include: runtime_shared.js
function updateMemoryViews() {
    var b = wasmMemory.buffer;
    blst['HEAP8'] = HEAP8 = new Int8Array(b);
    blst['HEAP16'] = HEAP16 = new Int16Array(b);
    blst['HEAPU8'] = HEAPU8 = new Uint8Array(b);
    blst['HEAPU16'] = HEAPU16 = new Uint16Array(b);
    blst['HEAP32'] = HEAP32 = new Int32Array(b);
    blst['HEAPU32'] = HEAPU32 = new Uint32Array(b);
    blst['HEAPF32'] = HEAPF32 = new Float32Array(b);
    blst['HEAPF64'] = HEAPF64 = new Float64Array(b);
}
// end include: runtime_shared.js
assert(
    !blst['STACK_SIZE'],
    'STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time',
);

assert(
    typeof Int32Array != 'undefined' &&
    typeof Float64Array !== 'undefined' &&
    Int32Array.prototype.subarray != undefined &&
    Int32Array.prototype.set != undefined,
    'JS engine does not provide full typed array support',
);

// If memory is defined in wasm, the user can't provide it, or set INITIAL_MEMORY
assert(
    !blst['wasmMemory'],
    'Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally',
);
assert(
    !blst['INITIAL_MEMORY'],
    'Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically',
);

// include: runtime_stack_check.js
// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
    var max = _emscripten_stack_get_end();
    assert((max & 3) == 0);
    // If the stack ends at address zero we write our cookies 4 bytes into the
    // stack.  This prevents interference with SAFE_HEAP and ASAN which also
    // monitor writes to address zero.
    if (max == 0) {
        max += 4;
    }
    // The stack grow downwards towards _emscripten_stack_get_end.
    // We write cookies to the final two words in the stack and detect if they are
    // ever overwritten.
    HEAPU32[max >> 2] = 0x02135467;
    HEAPU32[(max + 4) >> 2] = 0x89bacdfe;
    // Also test the global address 0 for integrity.
    HEAPU32[0 >> 2] = 1668509029;
}

function checkStackCookie() {
    if (ABORT) return;
    var max = _emscripten_stack_get_end();
    // See writeStackCookie().
    if (max == 0) {
        max += 4;
    }
    var cookie1 = HEAPU32[max >> 2];
    var cookie2 = HEAPU32[(max + 4) >> 2];
    if (cookie1 != 0x02135467 || cookie2 != 0x89bacdfe) {
        abort(
            `Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`,
        );
    }
    // Also test the global address 0 for integrity.
    if (HEAPU32[0 >> 2] != 0x63736d65 /* 'emsc' */) {
        abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
    }
}
// end include: runtime_stack_check.js
// include: runtime_assertions.js
// Endianness check
(function () {
    var h16 = new Int16Array(1);
    var h8 = new Int8Array(h16.buffer);
    h16[0] = 0x6373;
    if (h8[0] !== 0x73 || h8[1] !== 0x63)
        throw 'Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)';
})();

// end include: runtime_assertions.js
var __ATPRERUN__ = []; // functions called before the runtime is initialized
var __ATINIT__ = []; // functions called during startup
var __ATEXIT__ = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;

function preRun() {
    if (blst['preRun']) {
        if (typeof blst['preRun'] == 'function') blst['preRun'] = [blst['preRun']];
        while (blst['preRun'].length) {
            addOnPreRun(blst['preRun'].shift());
        }
    }
    callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
    assert(!runtimeInitialized);
    runtimeInitialized = true;

    checkStackCookie();

    callRuntimeCallbacks(__ATINIT__);
}

function postRun() {
    checkStackCookie();

    if (blst['postRun']) {
        if (typeof blst['postRun'] == 'function') blst['postRun'] = [blst['postRun']];
        while (blst['postRun'].length) {
            addOnPostRun(blst['postRun'].shift());
        }
    }

    callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
    __ATINIT__.unshift(cb);
}

function addOnExit(cb) { }

function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb);
}

// include: runtime_math.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc

assert(
    Math.imul,
    'This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill',
);
assert(
    Math.fround,
    'This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill',
);
assert(
    Math.clz32,
    'This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill',
);
assert(
    Math.trunc,
    'This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill',
);
// end include: runtime_math.js
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// blst.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
    var orig = id;
    while (1) {
        if (!runDependencyTracking[id]) return id;
        id = orig + Math.random();
    }
}

function addRunDependency(id) {
    runDependencies++;

    blst['monitorRunDependencies']?.(runDependencies);

    if (id) {
        assert(!runDependencyTracking[id]);
        runDependencyTracking[id] = 1;
        if (runDependencyWatcher === null && typeof setInterval != 'undefined') {
            // Check for missing dependencies every few seconds
            runDependencyWatcher = setInterval(() => {
                if (ABORT) {
                    clearInterval(runDependencyWatcher);
                    runDependencyWatcher = null;
                    return;
                }
                var shown = false;
                for (var dep in runDependencyTracking) {
                    if (!shown) {
                        shown = true;
                        err('still waiting on run dependencies:');
                    }
                    err(`dependency: ${dep}`);
                }
                if (shown) {
                    err('(end of list)');
                }
            }, 10000);
        }
    } else {
        err('warning: run dependency added without ID');
    }
}

function removeRunDependency(id) {
    runDependencies--;

    blst['monitorRunDependencies']?.(runDependencies);

    if (id) {
        assert(runDependencyTracking[id]);
        delete runDependencyTracking[id];
    } else {
        err('warning: run dependency removed without ID');
    }
    if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback(); // can add another dependenciesFulfilled
        }
    }
}

/** @param {string|number=} what */
function abort(what) {
    blst['onAbort']?.(what);

    what = 'Aborted(' + what + ')';
    // TODO(sbc): Should we remove printing and leave it up to whoever
    // catches the exception?
    err(what);

    ABORT = true;
    EXITSTATUS = 1;

    // Use a wasm runtime error, because a JS error might be seen as a foreign
    // exception, which means we'd run destructors on it. We need the error to
    // simply make the program stop.
    // FIXME This approach does not work in Wasm EH because it currently does not assume
    // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
    // a trap or not based on a hidden field within the object. So at the moment
    // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
    // allows this in the wasm spec.

    // Suppress closure compiler warning here. Closure compiler's builtin extern
    // definition for WebAssembly.RuntimeError claims it takes no arguments even
    // though it can.
    // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
    /** @suppress {checkTypes} */
    var e = new WebAssembly.RuntimeError(what);

    // Throw the error whether or not MODULARIZE is set because abort is used
    // in code paths apart from instantiation where an exception is expected
    // to be thrown when abort is called.
    throw e;
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// show errors on likely calls to FS when it was not included
var FS = {
    error() {
        abort(
            'Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with -sFORCE_FILESYSTEM',
        );
    },
    init() {
        FS.error();
    },
    createDataFile() {
        FS.error();
    },
    createPreloadedFile() {
        FS.error();
    },
    createLazyFile() {
        FS.error();
    },
    open() {
        FS.error();
    },
    mkdev() {
        FS.error();
    },
    registerDevice() {
        FS.error();
    },
    analyzePath() {
        FS.error();
    },

    ErrnoError() {
        FS.error();
    },
};
blst['FS_createDataFile'] = FS.createDataFile;
blst['FS_createPreloadedFile'] = FS.createPreloadedFile;

// include: URIUtils.js
// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */
var isDataURI = (filename) => filename.startsWith(dataURIPrefix);

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://');
// end include: URIUtils.js
function createExportWrapper(name, nargs) {
    return (...args) => {
        assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
        var f = wasmExports[name];
        assert(f, `exported native function \`${name}\` not found`);
        // Only assert for too many arguments. Too few can be valid since the missing arguments will be zero filled.
        assert(
            args.length <= nargs,
            `native function \`${name}\` called with ${args.length} args but expects ${nargs}`,
        );
        return f(...args);
    };
}

// include: runtime_exceptions.js
// Base Emscripten EH error class
class EmscriptenEH extends Error { }

class EmscriptenSjLj extends EmscriptenEH { }

class CppException extends EmscriptenEH {
    constructor(excPtr) {
        super(excPtr);
        this.excPtr = excPtr;
        const excInfo = getExceptionMessage(excPtr);
        this.name = excInfo[0];
        this.message = excInfo[1];
    }
}
// end include: runtime_exceptions.js
function findWasmBinary() {
    var f = 'blst.wasm';
    if (!isDataURI(f)) {
        return locateFile(f);
    }
    return f;
}

var wasmBinaryFile;

function getBinarySync(file) {
    if (file == wasmBinaryFile && wasmBinary) {
        return new Uint8Array(wasmBinary);
    }
    if (readBinary) {
        return readBinary(file);
    }
    throw 'both async and sync fetching of the wasm failed';
}

function getBinaryPromise(binaryFile) {
    // If we don't have the binary yet, load it asynchronously using readAsync.
    if (!wasmBinary) {
        // Fetch the binary use readAsync
        return new Promise((resolve, reject) => {
            readAsync(
                binaryFile,
                (response) => resolve(new Uint8Array(/** @type{!ArrayBuffer} */(response))),
                (error) => {
                    try {
                        resolve(getBinarySync(binaryFile));
                    } catch (e) {
                        reject(e);
                    }
                },
            );
        });
    }

    // Otherwise, getBinarySync should be able to get it synchronously
    return Promise.resolve().then(() => getBinarySync(binaryFile));
}

function instantiateArrayBuffer(binaryFile, imports, receiver) {
    return getBinaryPromise(binaryFile)
        .then((binary) => {
            return WebAssembly.instantiate(binary, imports);
        })
        .then(receiver, (reason) => {
            err(`failed to asynchronously prepare wasm: ${reason}`);

            // Warn on some common problems.
            if (isFileURI(wasmBinaryFile)) {
                err(
                    `warning: Loading from a file URI (${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`,
                );
            }
            abort(reason);
        });
}

function instantiateAsync(binary, binaryFile, imports, callback) {
    if (
        !binary &&
        typeof WebAssembly.instantiateStreaming == 'function' &&
        !isDataURI(binaryFile) &&
        // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
        !isFileURI(binaryFile) &&
        // Avoid instantiateStreaming() on Node.js environment for now, as while
        // Node.js v18.1.0 implements it, it does not have a full fetch()
        // implementation yet.
        //
        // Reference:
        //   https://github.com/emscripten-core/emscripten/pull/16917
        !ENVIRONMENT_IS_NODE &&
        typeof fetch == 'function'
    ) {
        return fetch(binaryFile, { credentials: 'same-origin' }).then((response) => {
            // Suppress closure warning here since the upstream definition for
            // instantiateStreaming only allows Promise<Repsponse> rather than
            // an actual Response.
            // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure is fixed.
            /** @suppress {checkTypes} */
            var result = WebAssembly.instantiateStreaming(response, imports);

            return result.then(callback, function (reason) {
                // We expect the most common failure cause to be a bad MIME type for the binary,
                // in which case falling back to ArrayBuffer instantiation should work.
                err(`wasm streaming compile failed: ${reason}`);
                err('falling back to ArrayBuffer instantiation');
                return instantiateArrayBuffer(binaryFile, imports, callback);
            });
        });
    }
    return instantiateArrayBuffer(binaryFile, imports, callback);
}

function getWasmImports() {
    // prepare imports
    return {
        env: wasmImports,
        wasi_snapshot_preview1: wasmImports,
    };
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm() {
    var info = getWasmImports();
    // Load the wasm module and create an instance of using native support in the JS engine.
    // handle a generated wasm instance, receiving its exports and
    // performing other necessary setup
    /** @param {WebAssembly.blst=} module*/
    function receiveInstance(instance, module) {
        wasmExports = instance.exports;

        wasmMemory = wasmExports['memory'];

        assert(wasmMemory, 'memory not found in wasm exports');
        updateMemoryViews();

        wasmTable = wasmExports['__indirect_function_table'];

        assert(wasmTable, 'table not found in wasm exports');

        addOnInit(wasmExports['__wasm_call_ctors']);

        removeRunDependency('wasm-instantiate');
        return wasmExports;
    }
    // wait for the pthread pool (if any)
    addRunDependency('wasm-instantiate');

    // Prefer streaming instantiation if available.
    // Async compilation can be confusing when an error on the page overwrites blst
    // (for example, if the order of elements is wrong, and the one defining blst is
    // later), so we save blst and check it later.
    var trueModule = blst;
    function receiveInstantiationResult(result) {
        // 'result' is a ResultObject object which has both the module and instance.
        // receiveInstance() will swap in the exports (to blst.asm) so they can be called
        assert(
            blst === trueModule,
            'the blst object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?',
        );
        trueModule = null;
        // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
        // When the regression is fixed, can restore the above PTHREADS-enabled path.
        receiveInstance(result['instance']);
    }

    // User shell pages can write their own blst.instantiateWasm = function(imports, successCallback) callback
    // to manually instantiate the Wasm module themselves. This allows pages to
    // run the instantiation parallel to any other async startup actions they are
    // performing.
    // Also pthreads and wasm workers initialize the wasm instance through this
    // path.
    if (blst['instantiateWasm']) {
        try {
            return blst['instantiateWasm'](info, receiveInstance);
        } catch (e) {
            err(`blst.instantiateWasm callback failed with error: ${e}`);
            return false;
        }
    }

    if (!wasmBinaryFile) wasmBinaryFile = findWasmBinary();

    instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult);
    return {}; // no exports yet; we'll fill them in later
}

// Globals used by JS i64 conversions (see makeSetValue)
var tempDouble;
var tempI64;

// include: runtime_debug.js
function legacyModuleProp(prop, newName, incoming = true) {
    if (!Object.getOwnPropertyDescriptor(blst, prop)) {
        Object.defineProperty(blst, prop, {
            configurable: true,
            get() {
                let extra = incoming
                    ? ' (the initial value can be provided on blst, but after startup the value is only looked for on a local variable of that name)'
                    : '';
                abort(`\`blst.${prop}\` has been replaced by \`${newName}\`` + extra);
            },
        });
    }
}

function ignoredModuleProp(prop) {
    if (Object.getOwnPropertyDescriptor(blst, prop)) {
        abort(`\`blst.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
    }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem(name) {
    return (
        name === 'FS_createPath' ||
        name === 'FS_createDataFile' ||
        name === 'FS_createPreloadedFile' ||
        name === 'FS_unlink' ||
        name === 'addRunDependency' ||
        // The old FS has some functionality that WasmFS lacks.
        name === 'FS_createLazyFile' ||
        name === 'FS_createDevice' ||
        name === 'removeRunDependency'
    );
}

function missingGlobal(sym, msg) {
    if (typeof globalThis != 'undefined') {
        Object.defineProperty(globalThis, sym, {
            configurable: true,
            get() {
                warnOnce(`\`${sym}\` is not longer defined by emscripten. ${msg}`);
                return undefined;
            },
        });
    }
}

missingGlobal('buffer', 'Please use HEAP8.buffer or wasmMemory.buffer');
missingGlobal('asm', 'Please use wasmExports instead');

function missingLibrarySymbol(sym) {
    if (typeof globalThis != 'undefined' && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
        Object.defineProperty(globalThis, sym, {
            configurable: true,
            get() {
                // Can't `abort()` here because it would break code that does runtime
                // checks.  e.g. `if (typeof SDL === 'undefined')`.
                var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
                // DEFAULT_LIBRARY_FUNCS_TO_INCLUDE requires the name as it appears in
                // library.js, which means $name for a JS name with no prefix, or name
                // for a JS name like _name.
                var librarySymbol = sym;
                if (!librarySymbol.startsWith('_')) {
                    librarySymbol = '$' + sym;
                }
                msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
                if (isExportedByForceFilesystem(sym)) {
                    msg +=
                        '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
                }
                warnOnce(msg);
                return undefined;
            },
        });
    }
    // Any symbol that is not included from the JS library is also (by definition)
    // not exported on the blst object.
    unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
    if (!Object.getOwnPropertyDescriptor(blst, sym)) {
        Object.defineProperty(blst, sym, {
            configurable: true,
            get() {
                var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
                if (isExportedByForceFilesystem(sym)) {
                    msg +=
                        '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
                }
                abort(msg);
            },
        });
    }
}

// Used by XXXXX_DEBUG settings to output debug messages.
function dbg(...args) {
    // TODO(sbc): Make this configurable somehow.  Its not always convenient for
    // logging to show up as warnings.
    console.warn(...args);
}
// end include: runtime_debug.js
// === Body ===

function blst_exception(code) {
    throw new Error(BLST_ERROR_str[code]);
}

// end include: preamble.js

/** @constructor */
function ExitStatus(status) {
    this.name = 'ExitStatus';
    this.message = `Program terminated with exit(${status})`;
    this.status = status;
}

var callRuntimeCallbacks = (callbacks) => {
    while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(blst);
    }
};

/**
 * @param {number} ptr
 * @param {string} type
 */
function getValue(ptr, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
        case 'i1':
            return HEAP8[ptr];
        case 'i8':
            return HEAP8[ptr];
        case 'i16':
            return HEAP16[ptr >> 1];
        case 'i32':
            return HEAP32[ptr >> 2];
        case 'i64':
            abort('to do getValue(i64) use WASM_BIGINT');
        case 'float':
            return HEAPF32[ptr >> 2];
        case 'double':
            return HEAPF64[ptr >> 3];
        case '*':
            return HEAPU32[ptr >> 2];
        default:
            abort(`invalid type for getValue: ${type}`);
    }
}

var lengthBytesUTF8 = (str) => {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var c = str.charCodeAt(i); // possibly a lead surrogate
        if (c <= 0x7f) {
            len++;
        } else if (c <= 0x7ff) {
            len += 2;
        } else if (c >= 0xd800 && c <= 0xdfff) {
            len += 4;
            ++i;
        } else {
            len += 3;
        }
    }
    return len;
};

var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
    assert(typeof str === 'string', `stringToUTF8Array expects a string (got ${typeof str})`);
    // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
    // undefined and false each don't write out any bytes.
    if (!(maxBytesToWrite > 0)) return 0;

    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
    for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
        // and https://www.ietf.org/rfc/rfc2279.txt
        // and https://tools.ietf.org/html/rfc3629
        var u = str.charCodeAt(i); // possibly a lead surrogate
        if (u >= 0xd800 && u <= 0xdfff) {
            var u1 = str.charCodeAt(++i);
            u = (0x10000 + ((u & 0x3ff) << 10)) | (u1 & 0x3ff);
        }
        if (u <= 0x7f) {
            if (outIdx >= endIdx) break;
            heap[outIdx++] = u;
        } else if (u <= 0x7ff) {
            if (outIdx + 1 >= endIdx) break;
            heap[outIdx++] = 0xc0 | (u >> 6);
            heap[outIdx++] = 0x80 | (u & 63);
        } else if (u <= 0xffff) {
            if (outIdx + 2 >= endIdx) break;
            heap[outIdx++] = 0xe0 | (u >> 12);
            heap[outIdx++] = 0x80 | ((u >> 6) & 63);
            heap[outIdx++] = 0x80 | (u & 63);
        } else {
            if (outIdx + 3 >= endIdx) break;
            if (u > 0x10ffff)
                warnOnce(
                    'Invalid Unicode code point ' +
                    ptrToString(u) +
                    ' encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).',
                );
            heap[outIdx++] = 0xf0 | (u >> 18);
            heap[outIdx++] = 0x80 | ((u >> 12) & 63);
            heap[outIdx++] = 0x80 | ((u >> 6) & 63);
            heap[outIdx++] = 0x80 | (u & 63);
        }
    }
    // Null-terminate the pointer to the buffer.
    heap[outIdx] = 0;
    return outIdx - startIdx;
};
/** @type {function(string, boolean=, number=)} */
function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
}

var noExitRuntime = blst['noExitRuntime'] || true;

var ptrToString = (ptr) => {
    assert(typeof ptr === 'number');
    // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
    ptr >>>= 0;
    return '0x' + ptr.toString(16).padStart(8, '0');
};

/**
 * @param {number} ptr
 * @param {number} value
 * @param {string} type
 */
function setValue(ptr, value, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
        case 'i1':
            HEAP8[ptr] = value;
            break;
        case 'i8':
            HEAP8[ptr] = value;
            break;
        case 'i16':
            HEAP16[ptr >> 1] = value;
            break;
        case 'i32':
            HEAP32[ptr >> 2] = value;
            break;
        case 'i64':
            abort('to do setValue(i64) use WASM_BIGINT');
        case 'float':
            HEAPF32[ptr >> 2] = value;
            break;
        case 'double':
            HEAPF64[ptr >> 3] = value;
            break;
        case '*':
            HEAPU32[ptr >> 2] = value;
            break;
        default:
            abort(`invalid type for setValue: ${type}`);
    }
}

var stackRestore = (val) => __emscripten_stack_restore(val);

var stackSave = () => _emscripten_stack_get_current();

var warnOnce = (text) => {
    warnOnce.shown ||= {};
    if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = 'warning: ' + text;
        err(text);
    }
};

var UTF8Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder('utf8') : undefined;

/**
 * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
 * array that contains uint8 values, returns a copy of that string as a
 * Javascript String object.
 * heapOrArray is either a regular array, or a JavaScript typed array view.
 * @param {number} idx
 * @param {number=} maxBytesToRead
 * @return {string}
 */
var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
    var endIdx = idx + maxBytesToRead;
    var endPtr = idx;
    // TextDecoder needs to know the byte length in advance, it doesn't stop on
    // null terminator by itself.  Also, use the length info to avoid running tiny
    // strings through TextDecoder, since .subarray() allocates garbage.
    // (As a tiny code save trick, compare endPtr against endIdx using a negation,
    // so that undefined means Infinity)
    while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;

    if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
    }
    var str = '';
    // If building with TextDecoder, we have already computed the string length
    // above, so test loop end condition against that
    while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) {
            str += String.fromCharCode(u0);
            continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xe0) == 0xc0) {
            str += String.fromCharCode(((u0 & 31) << 6) | u1);
            continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xf0) == 0xe0) {
            u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
            if ((u0 & 0xf8) != 0xf0)
                warnOnce(
                    'Invalid UTF-8 leading byte ' +
                    ptrToString(u0) +
                    ' encountered when deserializing a UTF-8 string in wasm memory to a JS string!',
                );
            u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }

        if (u0 < 0x10000) {
            str += String.fromCharCode(u0);
        } else {
            var ch = u0 - 0x10000;
            str += String.fromCharCode(0xd800 | (ch >> 10), 0xdc00 | (ch & 0x3ff));
        }
    }
    return str;
};

/**
 * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
 * emscripten HEAP, returns a copy of that string as a Javascript String object.
 *
 * @param {number} ptr
 * @param {number=} maxBytesToRead - An optional length that specifies the
 *   maximum number of bytes to read. You can omit this parameter to scan the
 *   string until the first 0 byte. If maxBytesToRead is passed, and the string
 *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
 *   string will cut short at that byte index (i.e. maxBytesToRead will not
 *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
 *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
 *   JS JIT optimizations off, so it is worth to consider consistently using one
 * @return {string}
 */
var UTF8ToString = (ptr, maxBytesToRead) => {
    assert(typeof ptr == 'number', `UTF8ToString expects a number (got ${typeof ptr})`);
    return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
};
var ___assert_fail = (condition, filename, line, func) => {
    abort(
        `Assertion failed: ${UTF8ToString(condition)}, at: ` +
        [
            filename ? UTF8ToString(filename) : 'unknown filename',
            line,
            func ? UTF8ToString(func) : 'unknown function',
        ],
    );
};

var exceptionCaught = [];

var uncaughtExceptionCount = 0;
var ___cxa_begin_catch = (ptr) => {
    var info = new ExceptionInfo(ptr);
    if (!info.get_caught()) {
        info.set_caught(true);
        uncaughtExceptionCount--;
    }
    info.set_rethrown(false);
    exceptionCaught.push(info);
    ___cxa_increment_exception_refcount(info.excPtr);
    return info.get_exception_ptr();
};

var exceptionLast = 0;

var ___cxa_end_catch = () => {
    // Clear state flag.
    _setThrew(0, 0);
    assert(exceptionCaught.length > 0);
    // Call destructor if one is registered then clear it.
    var info = exceptionCaught.pop();

    ___cxa_decrement_exception_refcount(info.excPtr);
    exceptionLast = 0; // XXX in decRef?
};

class ExceptionInfo {
    // excPtr - Thrown object pointer to wrap. Metadata pointer is calculated from it.
    constructor(excPtr) {
        this.excPtr = excPtr;
        this.ptr = excPtr - 24;
    }

    set_type(type) {
        HEAPU32[(this.ptr + 4) >> 2] = type;
    }

    get_type() {
        return HEAPU32[(this.ptr + 4) >> 2];
    }

    set_destructor(destructor) {
        HEAPU32[(this.ptr + 8) >> 2] = destructor;
    }

    get_destructor() {
        return HEAPU32[(this.ptr + 8) >> 2];
    }

    set_caught(caught) {
        caught = caught ? 1 : 0;
        HEAP8[this.ptr + 12] = caught;
    }

    get_caught() {
        return HEAP8[this.ptr + 12] != 0;
    }

    set_rethrown(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[this.ptr + 13] = rethrown;
    }

    get_rethrown() {
        return HEAP8[this.ptr + 13] != 0;
    }

    // Initialize native structure fields. Should be called once after allocated.
    init(type, destructor) {
        this.set_adjusted_ptr(0);
        this.set_type(type);
        this.set_destructor(destructor);
    }

    set_adjusted_ptr(adjustedPtr) {
        HEAPU32[(this.ptr + 16) >> 2] = adjustedPtr;
    }

    get_adjusted_ptr() {
        return HEAPU32[(this.ptr + 16) >> 2];
    }

    // Get pointer which is expected to be received by catch clause in C++ code. It may be adjusted
    // when the pointer is casted to some of the exception object base classes (e.g. when virtual
    // inheritance is used). When a pointer is thrown this method should return the thrown pointer
    // itself.
    get_exception_ptr() {
        // Work around a fastcomp bug, this code is still included for some reason in a build without
        // exceptions support.
        var isPointer = ___cxa_is_pointer_type(this.get_type());
        if (isPointer) {
            return HEAPU32[this.excPtr >> 2];
        }
        var adjusted = this.get_adjusted_ptr();
        if (adjusted !== 0) return adjusted;
        return this.excPtr;
    }
}

var ___resumeException = (ptr) => {
    if (!exceptionLast) {
        exceptionLast = new CppException(ptr);
    }
    throw exceptionLast;
};

var setTempRet0 = (val) => __emscripten_tempret_set(val);
var findMatchingCatch = (args) => {
    var thrown = exceptionLast?.excPtr;
    if (!thrown) {
        // just pass through the null ptr
        setTempRet0(0);
        return 0;
    }
    var info = new ExceptionInfo(thrown);
    info.set_adjusted_ptr(thrown);
    var thrownType = info.get_type();
    if (!thrownType) {
        // just pass through the thrown ptr
        setTempRet0(0);
        return thrown;
    }

    // can_catch receives a **, add indirection
    // The different catch blocks are denoted by different types.
    // Due to inheritance, those types may not precisely match the
    // type of the thrown object. Find one which matches, and
    // return the type of the catch block which should be called.
    for (var caughtType of args) {
        if (caughtType === 0 || caughtType === thrownType) {
            // Catch all clause matched or exactly the same type is caught
            break;
        }
        var adjusted_ptr_addr = info.ptr + 16;
        if (___cxa_can_catch(caughtType, thrownType, adjusted_ptr_addr)) {
            setTempRet0(caughtType);
            return thrown;
        }
    }
    setTempRet0(thrownType);
    return thrown;
};
var ___cxa_find_matching_catch_2 = () => findMatchingCatch([]);

var ___cxa_find_matching_catch_3 = (arg0) => findMatchingCatch([arg0]);

var ___cxa_throw = (ptr, type, destructor) => {
    var info = new ExceptionInfo(ptr);
    // Initialize ExceptionInfo content after it was allocated in __cxa_allocate_exception.
    info.init(type, destructor);
    exceptionLast = new CppException(ptr);
    uncaughtExceptionCount++;
    throw exceptionLast;
};

var __abort_js = () => {
    abort('native code called abort()');
};

var __emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num);

var getHeapMax = () => 2147483648; // 2 GB max

var _emscripten_resize_heap = (requestedSize) => {
    var oldSize = HEAPU8.length;
    requestedSize >>>= 0;
    var maxHeapSize = getHeapMax();
    if (requestedSize > maxHeapSize) {
        abort(`Cannot enlarge memory, requested ${requestedSize} bytes, max ${maxHeapSize}`);
    }
    var alignUp = (x, multiple) => x + (multiple - (x % multiple)) % multiple;
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = wasmMemory.grow((newSize - oldSize) / 65536);
        if (replacement) {
            updateMemoryViews();
            return true;
        }
    }
    return false;
};

var SYSCALLS = {
    varargs: undefined,
    getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
    },
};
var _fd_close = (fd) => {
    abort('fd_close called without SYSCALLS_REQUIRE_FILESYSTEM');
};

var convertI32PairToI53Checked = (lo, hi) => {
    assert(lo == lo >>> 0 || lo == (lo | 0)); // lo should either be a i32 or a u32
    assert(hi === (hi | 0)); // hi should be a i32
    return (hi + 0x200000) >>> 0 < 0x400001 - !!lo ? (lo >>> 0) + hi * 4294967296 : NaN;
};
function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
    var offset = convertI32PairToI53Checked(offset_low, offset_high);

    return 70;
}

var printCharBuffers = [null, [], []];

var printChar = (stream, curr) => {
    var buffer = printCharBuffers[stream];
    assert(buffer);
    if (curr === 0 || curr === 10) {
        (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
        buffer.length = 0;
    } else {
        buffer.push(curr);
    }
};

var flush_NO_FILESYSTEM = () => {
    // flush anything remaining in the buffers during shutdown
    _fflush(0);
    if (printCharBuffers[1].length) printChar(1, 10);
    if (printCharBuffers[2].length) printChar(2, 10);
};

var _fd_write = (fd, iov, iovcnt, pnum) => {
    // hack to support printf in SYSCALLS_REQUIRE_FILESYSTEM=0
    var num = 0;
    for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[(iov + 4) >> 2];
        iov += 8;
        for (var j = 0; j < len; j++) {
            printChar(fd, HEAPU8[ptr + j]);
        }
        num += len;
    }
    HEAPU32[pnum >> 2] = num;
    return 0;
};

var _llvm_eh_typeid_for = (type) => type;

var alignMemory = (size, alignment) => {
    assert(alignment, 'alignment argument is required');
    return Math.ceil(size / alignment) * alignment;
};

var wasmTableMirror = [];

/** @type {WebAssembly.Table} */
var wasmTable;
var getWasmTableEntry = (funcPtr) => {
    var func = wasmTableMirror[funcPtr];
    if (!func) {
        if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
    }
    assert(
        wasmTable.get(funcPtr) == func,
        'JavaScript-side Wasm function table mirror is out of date!',
    );
    return func;
};

var incrementExceptionRefcount = (ptr) => ___cxa_increment_exception_refcount(ptr);
blst['incrementExceptionRefcount'] = incrementExceptionRefcount;

var decrementExceptionRefcount = (ptr) => ___cxa_decrement_exception_refcount(ptr);
blst['decrementExceptionRefcount'] = decrementExceptionRefcount;

var stackAlloc = (sz) => __emscripten_stack_alloc(sz);

var getExceptionMessageCommon = (ptr) => {
    var sp = stackSave();
    var type_addr_addr = stackAlloc(4);
    var message_addr_addr = stackAlloc(4);
    ___get_exception_message(ptr, type_addr_addr, message_addr_addr);
    var type_addr = HEAPU32[type_addr_addr >> 2];
    var message_addr = HEAPU32[message_addr_addr >> 2];
    var type = UTF8ToString(type_addr);
    _free(type_addr);
    var message;
    if (message_addr) {
        message = UTF8ToString(message_addr);
        _free(message_addr);
    }
    stackRestore(sp);
    return [type, message];
};
var getExceptionMessage = (ptr) => getExceptionMessageCommon(ptr);
blst['getExceptionMessage'] = getExceptionMessage;
function checkIncomingModuleAPI() {
    ignoredModuleProp('fetchSettings');
}
var wasmImports = {
    /** @export */
    __assert_fail: ___assert_fail,
    /** @export */
    __cxa_begin_catch: ___cxa_begin_catch,
    /** @export */
    __cxa_end_catch: ___cxa_end_catch,
    /** @export */
    __cxa_find_matching_catch_2: ___cxa_find_matching_catch_2,
    /** @export */
    __cxa_find_matching_catch_3: ___cxa_find_matching_catch_3,
    /** @export */
    __cxa_throw: ___cxa_throw,
    /** @export */
    __resumeException: ___resumeException,
    /** @export */
    _abort_js: __abort_js,
    /** @export */
    _emscripten_memcpy_js: __emscripten_memcpy_js,
    /** @export */
    blst_exception,
    /** @export */
    emscripten_resize_heap: _emscripten_resize_heap,
    /** @export */
    fd_close: _fd_close,
    /** @export */
    fd_seek: _fd_seek,
    /** @export */
    fd_write: _fd_write,
    /** @export */
    invoke_ii,
    /** @export */
    invoke_iii,
    /** @export */
    invoke_iiii,
    /** @export */
    invoke_iiiii,
    /** @export */
    invoke_iiiiiii,
    /** @export */
    invoke_iiiiiiiii,
    /** @export */
    invoke_v,
    /** @export */
    invoke_vi,
    /** @export */
    invoke_vii,
    /** @export */
    invoke_viii,
    /** @export */
    invoke_viiii,
    /** @export */
    llvm_eh_typeid_for: _llvm_eh_typeid_for,
};
var wasmExports = createWasm();
var ___wasm_call_ctors = createExportWrapper('__wasm_call_ctors', 0);
var _webidl_free = (blst['_webidl_free'] = createExportWrapper('webidl_free', 1));
var _free = (blst['_free'] = createExportWrapper('free', 1));
var _webidl_malloc = (blst['_webidl_malloc'] = createExportWrapper('webidl_malloc', 1));
var _malloc = (blst['_malloc'] = createExportWrapper('malloc', 1));
var _emscripten_bind_VoidPtr___destroy___0 = (blst['_emscripten_bind_VoidPtr___destroy___0'] =
    createExportWrapper('emscripten_bind_VoidPtr___destroy___0', 1));
var _const_G1 = (blst['_const_G1'] = createExportWrapper('const_G1', 0));
var _const_G2 = (blst['_const_G2'] = createExportWrapper('const_G2', 0));
var _const_NEG_G1 = (blst['_const_NEG_G1'] = createExportWrapper('const_NEG_G1', 0));
var _const_NEG_G2 = (blst['_const_NEG_G2'] = createExportWrapper('const_NEG_G2', 0));
var _SecretKey_0 = (blst['_SecretKey_0'] = createExportWrapper('SecretKey_0', 0));
var _SecretKey__destroy__0 = (blst['_SecretKey__destroy__0'] = createExportWrapper(
    'SecretKey__destroy__0',
    1,
));
var _SecretKey_keygen_3 = (blst['_SecretKey_keygen_3'] = createExportWrapper(
    'SecretKey_keygen_3',
    4,
));
var _SecretKey_derive_master_eip2333_2 = (blst['_SecretKey_derive_master_eip2333_2'] =
    createExportWrapper('SecretKey_derive_master_eip2333_2', 3));
var _SecretKey_derive_child_eip2333_2 = (blst['_SecretKey_derive_child_eip2333_2'] =
    createExportWrapper('SecretKey_derive_child_eip2333_2', 3));
var _SecretKey_from_bendian_1 = (blst['_SecretKey_from_bendian_1'] = createExportWrapper(
    'SecretKey_from_bendian_1',
    2,
));
var _SecretKey_from_lendian_1 = (blst['_SecretKey_from_lendian_1'] = createExportWrapper(
    'SecretKey_from_lendian_1',
    2,
));
var _SecretKey_to_bendian_0 = (blst['_SecretKey_to_bendian_0'] = createExportWrapper(
    'SecretKey_to_bendian_0',
    1,
));
var _SecretKey_to_lendian_0 = (blst['_SecretKey_to_lendian_0'] = createExportWrapper(
    'SecretKey_to_lendian_0',
    1,
));
var _Scalar_0 = (blst['_Scalar_0'] = createExportWrapper('Scalar_0', 0));
var _Scalar_2 = (blst['_Scalar_2'] = createExportWrapper('Scalar_2', 2));
var _Scalar_3 = (blst['_Scalar_3'] = createExportWrapper('Scalar_3', 3));
var _Scalar__destroy__0 = (blst['_Scalar__destroy__0'] = createExportWrapper(
    'Scalar__destroy__0',
    1,
));
var _Scalar_hash_to_3 = (blst['_Scalar_hash_to_3'] = createExportWrapper('Scalar_hash_to_3', 4));
var _Scalar_dup_0 = (blst['_Scalar_dup_0'] = createExportWrapper('Scalar_dup_0', 1));
var _Scalar_from_bendian_2 = (blst['_Scalar_from_bendian_2'] = createExportWrapper(
    'Scalar_from_bendian_2',
    3,
));
var _Scalar_from_lendian_2 = (blst['_Scalar_from_lendian_2'] = createExportWrapper(
    'Scalar_from_lendian_2',
    3,
));
var _Scalar_to_bendian_0 = (blst['_Scalar_to_bendian_0'] = createExportWrapper(
    'Scalar_to_bendian_0',
    1,
));
var _Scalar_to_lendian_0 = (blst['_Scalar_to_lendian_0'] = createExportWrapper(
    'Scalar_to_lendian_0',
    1,
));
var _Scalar_add_1 = (blst['_Scalar_add_1'] = createExportWrapper('Scalar_add_1', 2));
var _Scalar_sub_1 = (blst['_Scalar_sub_1'] = createExportWrapper('Scalar_sub_1', 2));
var _Scalar_mul_1 = (blst['_Scalar_mul_1'] = createExportWrapper('Scalar_mul_1', 2));
var _Scalar_inverse_0 = (blst['_Scalar_inverse_0'] = createExportWrapper('Scalar_inverse_0', 1));
var _PT_p_affine_1 = (blst['_PT_p_affine_1'] = createExportWrapper('PT_p_affine_1', 1));
var _PT_q_affine_1 = (blst['_PT_q_affine_1'] = createExportWrapper('PT_q_affine_1', 1));
var _PT_pq_affine_2 = (blst['_PT_pq_affine_2'] = createExportWrapper('PT_pq_affine_2', 2));
var _PT_pq_2 = (blst['_PT_pq_2'] = createExportWrapper('PT_pq_2', 2));
var _PT__destroy__0 = (blst['_PT__destroy__0'] = createExportWrapper('PT__destroy__0', 1));
var _PT_dup_0 = (blst['_PT_dup_0'] = createExportWrapper('PT_dup_0', 1));
var _PT_is_one_0 = (blst['_PT_is_one_0'] = createExportWrapper('PT_is_one_0', 1));
var _PT_is_equal_1 = (blst['_PT_is_equal_1'] = createExportWrapper('PT_is_equal_1', 2));
var _PT_sqr_0 = (blst['_PT_sqr_0'] = createExportWrapper('PT_sqr_0', 1));
var _PT_mul_1 = (blst['_PT_mul_1'] = createExportWrapper('PT_mul_1', 2));
var _PT_final_exp_0 = (blst['_PT_final_exp_0'] = createExportWrapper('PT_final_exp_0', 1));
var _PT_in_group_0 = (blst['_PT_in_group_0'] = createExportWrapper('PT_in_group_0', 1));
var _PT_to_bendian_0 = (blst['_PT_to_bendian_0'] = createExportWrapper('PT_to_bendian_0', 1));
var _PT_finalverify_2 = (blst['_PT_finalverify_2'] = createExportWrapper('PT_finalverify_2', 2));
var _PT_one_0 = (blst['_PT_one_0'] = createExportWrapper('PT_one_0', 0));
var _Pairing_2 = (blst['_Pairing_2'] = createExportWrapper('Pairing_2', 2));
var _Pairing__destroy__0 = (blst['_Pairing__destroy__0'] = createExportWrapper(
    'Pairing__destroy__0',
    1,
));
var _Pairing_commit_0 = (blst['_Pairing_commit_0'] = createExportWrapper('Pairing_commit_0', 1));
var _Pairing_sizeof_0 = (blst['_Pairing_sizeof_0'] = createExportWrapper('Pairing_sizeof_0', 0));
var _Pairing_merge_1 = (blst['_Pairing_merge_1'] = createExportWrapper('Pairing_merge_1', 2));
var _Pairing_finalverify_1 = (blst['_Pairing_finalverify_1'] = createExportWrapper(
    'Pairing_finalverify_1',
    2,
));
var _Pairing_raw_aggregate_2 = (blst['_Pairing_raw_aggregate_2'] = createExportWrapper(
    'Pairing_raw_aggregate_2',
    3,
));
var _Pairing_as_fp12_0 = (blst['_Pairing_as_fp12_0'] = createExportWrapper('Pairing_as_fp12_0', 1));
var _P1_Affine_0 = (blst['_P1_Affine_0'] = createExportWrapper('P1_Affine_0', 0));
var _P1_Affine_1 = (blst['_P1_Affine_1'] = createExportWrapper('P1_Affine_1', 1));
var _P1_Affine_2 = (blst['_P1_Affine_2'] = createExportWrapper('P1_Affine_2', 2));
var _P1_Affine__destroy__0 = (blst['_P1_Affine__destroy__0'] = createExportWrapper(
    'P1_Affine__destroy__0',
    1,
));
var _P1_Affine_dup_0 = (blst['_P1_Affine_dup_0'] = createExportWrapper('P1_Affine_dup_0', 1));
var _P1_Affine_to_jacobian_0 = (blst['_P1_Affine_to_jacobian_0'] = createExportWrapper(
    'P1_Affine_to_jacobian_0',
    1,
));
var _P1_Affine_serialize_0 = (blst['_P1_Affine_serialize_0'] = createExportWrapper(
    'P1_Affine_serialize_0',
    1,
));
var _P1_Affine_compress_0 = (blst['_P1_Affine_compress_0'] = createExportWrapper(
    'P1_Affine_compress_0',
    1,
));
var _P1_Affine_on_curve_0 = (blst['_P1_Affine_on_curve_0'] = createExportWrapper(
    'P1_Affine_on_curve_0',
    1,
));
var _P1_Affine_in_group_0 = (blst['_P1_Affine_in_group_0'] = createExportWrapper(
    'P1_Affine_in_group_0',
    1,
));
var _P1_Affine_is_inf_0 = (blst['_P1_Affine_is_inf_0'] = createExportWrapper(
    'P1_Affine_is_inf_0',
    1,
));
var _P1_Affine_is_equal_1 = (blst['_P1_Affine_is_equal_1'] = createExportWrapper(
    'P1_Affine_is_equal_1',
    2,
));
var _P1_Affine_core_verify_7 = (blst['_P1_Affine_core_verify_7'] = createExportWrapper(
    'P1_Affine_core_verify_7',
    8,
));
var _P1_Affine_generator_0 = (blst['_P1_Affine_generator_0'] = createExportWrapper(
    'P1_Affine_generator_0',
    0,
));
var _P1_0 = (blst['_P1_0'] = createExportWrapper('P1_0', 0));
var _P1_affine_1 = (blst['_P1_affine_1'] = createExportWrapper('P1_affine_1', 1));
var _P1_secretkey_1 = (blst['_P1_secretkey_1'] = createExportWrapper('P1_secretkey_1', 1));
var _P1_2 = (blst['_P1_2'] = createExportWrapper('P1_2', 2));
var _P1__destroy__0 = (blst['_P1__destroy__0'] = createExportWrapper('P1__destroy__0', 1));
var _P1_dup_0 = (blst['_P1_dup_0'] = createExportWrapper('P1_dup_0', 1));
var _P1_to_affine_0 = (blst['_P1_to_affine_0'] = createExportWrapper('P1_to_affine_0', 1));
var _P1_serialize_0 = (blst['_P1_serialize_0'] = createExportWrapper('P1_serialize_0', 1));
var _P1_compress_0 = (blst['_P1_compress_0'] = createExportWrapper('P1_compress_0', 1));
var _P1_on_curve_0 = (blst['_P1_on_curve_0'] = createExportWrapper('P1_on_curve_0', 1));
var _P1_in_group_0 = (blst['_P1_in_group_0'] = createExportWrapper('P1_in_group_0', 1));
var _P1_is_inf_0 = (blst['_P1_is_inf_0'] = createExportWrapper('P1_is_inf_0', 1));
var _P1_is_equal_1 = (blst['_P1_is_equal_1'] = createExportWrapper('P1_is_equal_1', 2));
var _P1_aggregate_1 = (blst['_P1_aggregate_1'] = createExportWrapper('P1_aggregate_1', 2));
var _P1_sign_with_1 = (blst['_P1_sign_with_1'] = createExportWrapper('P1_sign_with_1', 2));
var _P1_hash_to_5 = (blst['_P1_hash_to_5'] = createExportWrapper('P1_hash_to_5', 6));
var _P1_encode_to_5 = (blst['_P1_encode_to_5'] = createExportWrapper('P1_encode_to_5', 6));
var _P1_mult_1 = (blst['_P1_mult_1'] = createExportWrapper('P1_mult_1', 2));
var _P1_mult_2 = (blst['_P1_mult_2'] = createExportWrapper('P1_mult_2', 3));
var _P1_cneg_1 = (blst['_P1_cneg_1'] = createExportWrapper('P1_cneg_1', 2));
var _P1_add_1 = (blst['_P1_add_1'] = createExportWrapper('P1_add_1', 2));
var _P1_add_affine_1 = (blst['_P1_add_affine_1'] = createExportWrapper('P1_add_affine_1', 2));
var _P1_dbl_0 = (blst['_P1_dbl_0'] = createExportWrapper('P1_dbl_0', 1));
var _P1_generator_0 = (blst['_P1_generator_0'] = createExportWrapper('P1_generator_0', 0));
var _Pairing_aggregate_pk_in_g1_6 = (blst['_Pairing_aggregate_pk_in_g1_6'] = createExportWrapper(
    'Pairing_aggregate_pk_in_g1_6',
    7,
));
var _Pairing_mul_n_aggregate_pk_in_g1_8 = (blst['_Pairing_mul_n_aggregate_pk_in_g1_8'] =
    createExportWrapper('Pairing_mul_n_aggregate_pk_in_g1_8', 9));
var _P2_Affine_0 = (blst['_P2_Affine_0'] = createExportWrapper('P2_Affine_0', 0));
var _P2_Affine_1 = (blst['_P2_Affine_1'] = createExportWrapper('P2_Affine_1', 1));
var _P2_Affine_2 = (blst['_P2_Affine_2'] = createExportWrapper('P2_Affine_2', 2));
var _P2_Affine__destroy__0 = (blst['_P2_Affine__destroy__0'] = createExportWrapper(
    'P2_Affine__destroy__0',
    1,
));
var _P2_Affine_dup_0 = (blst['_P2_Affine_dup_0'] = createExportWrapper('P2_Affine_dup_0', 1));
var _P2_Affine_to_jacobian_0 = (blst['_P2_Affine_to_jacobian_0'] = createExportWrapper(
    'P2_Affine_to_jacobian_0',
    1,
));
var _P2_Affine_serialize_0 = (blst['_P2_Affine_serialize_0'] = createExportWrapper(
    'P2_Affine_serialize_0',
    1,
));
var _P2_Affine_compress_0 = (blst['_P2_Affine_compress_0'] = createExportWrapper(
    'P2_Affine_compress_0',
    1,
));
var _P2_Affine_on_curve_0 = (blst['_P2_Affine_on_curve_0'] = createExportWrapper(
    'P2_Affine_on_curve_0',
    1,
));
var _P2_Affine_in_group_0 = (blst['_P2_Affine_in_group_0'] = createExportWrapper(
    'P2_Affine_in_group_0',
    1,
));
var _P2_Affine_is_inf_0 = (blst['_P2_Affine_is_inf_0'] = createExportWrapper(
    'P2_Affine_is_inf_0',
    1,
));
var _P2_Affine_is_equal_1 = (blst['_P2_Affine_is_equal_1'] = createExportWrapper(
    'P2_Affine_is_equal_1',
    2,
));
var _P2_Affine_core_verify_7 = (blst['_P2_Affine_core_verify_7'] = createExportWrapper(
    'P2_Affine_core_verify_7',
    8,
));
var _P2_Affine_generator_0 = (blst['_P2_Affine_generator_0'] = createExportWrapper(
    'P2_Affine_generator_0',
    0,
));
var _P2_0 = (blst['_P2_0'] = createExportWrapper('P2_0', 0));
var _P2_affine_1 = (blst['_P2_affine_1'] = createExportWrapper('P2_affine_1', 1));
var _P2_secretkey_1 = (blst['_P2_secretkey_1'] = createExportWrapper('P2_secretkey_1', 1));
var _P2_2 = (blst['_P2_2'] = createExportWrapper('P2_2', 2));
var _P2__destroy__0 = (blst['_P2__destroy__0'] = createExportWrapper('P2__destroy__0', 1));
var _P2_dup_0 = (blst['_P2_dup_0'] = createExportWrapper('P2_dup_0', 1));
var _P2_to_affine_0 = (blst['_P2_to_affine_0'] = createExportWrapper('P2_to_affine_0', 1));
var _P2_serialize_0 = (blst['_P2_serialize_0'] = createExportWrapper('P2_serialize_0', 1));
var _P2_compress_0 = (blst['_P2_compress_0'] = createExportWrapper('P2_compress_0', 1));
var _P2_on_curve_0 = (blst['_P2_on_curve_0'] = createExportWrapper('P2_on_curve_0', 1));
var _P2_in_group_0 = (blst['_P2_in_group_0'] = createExportWrapper('P2_in_group_0', 1));
var _P2_is_inf_0 = (blst['_P2_is_inf_0'] = createExportWrapper('P2_is_inf_0', 1));
var _P2_is_equal_1 = (blst['_P2_is_equal_1'] = createExportWrapper('P2_is_equal_1', 2));
var _P2_aggregate_1 = (blst['_P2_aggregate_1'] = createExportWrapper('P2_aggregate_1', 2));
var _P2_sign_with_1 = (blst['_P2_sign_with_1'] = createExportWrapper('P2_sign_with_1', 2));
var _P2_hash_to_5 = (blst['_P2_hash_to_5'] = createExportWrapper('P2_hash_to_5', 6));
var _P2_encode_to_5 = (blst['_P2_encode_to_5'] = createExportWrapper('P2_encode_to_5', 6));
var _P2_mult_1 = (blst['_P2_mult_1'] = createExportWrapper('P2_mult_1', 2));
var _P2_mult_2 = (blst['_P2_mult_2'] = createExportWrapper('P2_mult_2', 3));
var _P2_cneg_1 = (blst['_P2_cneg_1'] = createExportWrapper('P2_cneg_1', 2));
var _P2_add_1 = (blst['_P2_add_1'] = createExportWrapper('P2_add_1', 2));
var _P2_add_affine_1 = (blst['_P2_add_affine_1'] = createExportWrapper('P2_add_affine_1', 2));
var _P2_dbl_0 = (blst['_P2_dbl_0'] = createExportWrapper('P2_dbl_0', 1));
var _P2_generator_0 = (blst['_P2_generator_0'] = createExportWrapper('P2_generator_0', 0));
var _Pairing_aggregate_pk_in_g2_6 = (blst['_Pairing_aggregate_pk_in_g2_6'] = createExportWrapper(
    'Pairing_aggregate_pk_in_g2_6',
    7,
));
var _Pairing_mul_n_aggregate_pk_in_g2_8 = (blst['_Pairing_mul_n_aggregate_pk_in_g2_8'] =
    createExportWrapper('Pairing_mul_n_aggregate_pk_in_g2_8', 9));
var _fflush = createExportWrapper('fflush', 1);
var _setThrew = createExportWrapper('setThrew', 2);
var __emscripten_tempret_set = createExportWrapper('_emscripten_tempret_set', 1);
var _emscripten_stack_init = () =>
    (_emscripten_stack_init = wasmExports['emscripten_stack_init'])();
var _emscripten_stack_get_free = () =>
    (_emscripten_stack_get_free = wasmExports['emscripten_stack_get_free'])();
var _emscripten_stack_get_base = () =>
    (_emscripten_stack_get_base = wasmExports['emscripten_stack_get_base'])();
var _emscripten_stack_get_end = () =>
    (_emscripten_stack_get_end = wasmExports['emscripten_stack_get_end'])();
var __emscripten_stack_restore = (a0) =>
    (__emscripten_stack_restore = wasmExports['_emscripten_stack_restore'])(a0);
var __emscripten_stack_alloc = (a0) =>
    (__emscripten_stack_alloc = wasmExports['_emscripten_stack_alloc'])(a0);
var _emscripten_stack_get_current = () =>
    (_emscripten_stack_get_current = wasmExports['emscripten_stack_get_current'])();
var ___cxa_free_exception = createExportWrapper('__cxa_free_exception', 1);
var ___cxa_increment_exception_refcount = createExportWrapper(
    '__cxa_increment_exception_refcount',
    1,
);
var ___cxa_decrement_exception_refcount = createExportWrapper(
    '__cxa_decrement_exception_refcount',
    1,
);
var ___get_exception_message = createExportWrapper('__get_exception_message', 3);
var ___cxa_can_catch = createExportWrapper('__cxa_can_catch', 3);
var ___cxa_is_pointer_type = createExportWrapper('__cxa_is_pointer_type', 1);
var dynCall_jiji = (blst['dynCall_jiji'] = createExportWrapper('dynCall_jiji', 5));

function invoke_viiii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4);
    } catch (e) {
        stackRestore(sp);
        if (!(e instanceof EmscriptenEH)) throw e;
        _setThrew(1, 0);
    }
}

function invoke_iiii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3);
    } catch (e) {
        stackRestore(sp);
        if (!(e instanceof EmscriptenEH)) throw e;
        _setThrew(1, 0);
    }
}

function invoke_iii(index, a1, a2) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2);
    } catch (e) {
        stackRestore(sp);
        if (!(e instanceof EmscriptenEH)) throw e;
        _setThrew(1, 0);
    }
}

function invoke_iiiii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4);
    } catch (e) {
        stackRestore(sp);
        if (!(e instanceof EmscriptenEH)) throw e;
        _setThrew(1, 0);
    }
}

function invoke_vi(index, a1) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1);
    } catch (e) {
        stackRestore(sp);
        if (!(e instanceof EmscriptenEH)) throw e;
        _setThrew(1, 0);
    }
}

function invoke_ii(index, a1) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1);
    } catch (e) {
        stackRestore(sp);
        if (!(e instanceof EmscriptenEH)) throw e;
        _setThrew(1, 0);
    }
}

function invoke_vii(index, a1, a2) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2);
    } catch (e) {
        stackRestore(sp);
        if (!(e instanceof EmscriptenEH)) throw e;
        _setThrew(1, 0);
    }
}

function invoke_iiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8);
    } catch (e) {
        stackRestore(sp);
        if (!(e instanceof EmscriptenEH)) throw e;
        _setThrew(1, 0);
    }
}

function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
    } catch (e) {
        stackRestore(sp);
        if (!(e instanceof EmscriptenEH)) throw e;
        _setThrew(1, 0);
    }
}

function invoke_v(index) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)();
    } catch (e) {
        stackRestore(sp);
        if (!(e instanceof EmscriptenEH)) throw e;
        _setThrew(1, 0);
    }
}

function invoke_viii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3);
    } catch (e) {
        stackRestore(sp);
        if (!(e instanceof EmscriptenEH)) throw e;
        _setThrew(1, 0);
    }
}

// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

var missingLibrarySymbols = [
    'writeI53ToI64',
    'writeI53ToI64Clamped',
    'writeI53ToI64Signaling',
    'writeI53ToU64Clamped',
    'writeI53ToU64Signaling',
    'readI53FromI64',
    'readI53FromU64',
    'convertI32PairToI53',
    'convertU32PairToI53',
    'getTempRet0',
    'zeroMemory',
    'exitJS',
    'growMemory',
    'isLeapYear',
    'ydayFromDate',
    'arraySum',
    'addDays',
    'inetPton4',
    'inetNtop4',
    'inetPton6',
    'inetNtop6',
    'readSockaddr',
    'writeSockaddr',
    'initRandomFill',
    'randomFill',
    'emscriptenLog',
    'readEmAsmArgs',
    'jstoi_q',
    'getExecutableName',
    'listenOnce',
    'autoResumeAudioContext',
    'dynCallLegacy',
    'getDynCaller',
    'dynCall',
    'handleException',
    'keepRuntimeAlive',
    'runtimeKeepalivePush',
    'runtimeKeepalivePop',
    'callUserCallback',
    'maybeExit',
    'asmjsMangle',
    'asyncLoad',
    'mmapAlloc',
    'HandleAllocator',
    'getNativeTypeSize',
    'STACK_SIZE',
    'STACK_ALIGN',
    'POINTER_SIZE',
    'ASSERTIONS',
    'getCFunc',
    'ccall',
    'cwrap',
    'uleb128Encode',
    'sigToWasmTypes',
    'generateFuncType',
    'convertJsFunctionToWasm',
    'getEmptyTableSlot',
    'updateTableMap',
    'getFunctionAddress',
    'addFunction',
    'removeFunction',
    'reallyNegative',
    'unSign',
    'strLen',
    'reSign',
    'formatString',
    'stringToUTF8',
    'intArrayToString',
    'AsciiToString',
    'stringToAscii',
    'UTF16ToString',
    'stringToUTF16',
    'lengthBytesUTF16',
    'UTF32ToString',
    'stringToUTF32',
    'lengthBytesUTF32',
    'stringToNewUTF8',
    'stringToUTF8OnStack',
    'writeArrayToMemory',
    'registerKeyEventCallback',
    'maybeCStringToJsString',
    'findEventTarget',
    'getBoundingClientRect',
    'fillMouseEventData',
    'registerMouseEventCallback',
    'registerWheelEventCallback',
    'registerUiEventCallback',
    'registerFocusEventCallback',
    'fillDeviceOrientationEventData',
    'registerDeviceOrientationEventCallback',
    'fillDeviceMotionEventData',
    'registerDeviceMotionEventCallback',
    'screenOrientation',
    'fillOrientationChangeEventData',
    'registerOrientationChangeEventCallback',
    'fillFullscreenChangeEventData',
    'registerFullscreenChangeEventCallback',
    'JSEvents_requestFullscreen',
    'JSEvents_resizeCanvasForFullscreen',
    'registerRestoreOldStyle',
    'hideEverythingExceptGivenElement',
    'restoreHiddenElements',
    'setLetterbox',
    'softFullscreenResizeWebGLRenderTarget',
    'doRequestFullscreen',
    'fillPointerlockChangeEventData',
    'registerPointerlockChangeEventCallback',
    'registerPointerlockErrorEventCallback',
    'requestPointerLock',
    'fillVisibilityChangeEventData',
    'registerVisibilityChangeEventCallback',
    'registerTouchEventCallback',
    'fillGamepadEventData',
    'registerGamepadEventCallback',
    'registerBeforeUnloadEventCallback',
    'fillBatteryEventData',
    'battery',
    'registerBatteryEventCallback',
    'setCanvasElementSize',
    'getCanvasElementSize',
    'jsStackTrace',
    'getCallstack',
    'convertPCtoSourceLocation',
    'getEnvStrings',
    'checkWasiClock',
    'wasiRightsToMuslOFlags',
    'wasiOFlagsToMuslOFlags',
    'createDyncallWrapper',
    'safeSetTimeout',
    'setImmediateWrapped',
    'clearImmediateWrapped',
    'polyfillSetImmediate',
    'getPromise',
    'makePromise',
    'idsToPromises',
    'makePromiseCallback',
    'Browser_asyncPrepareDataCounter',
    'setMainLoop',
    'getSocketFromFD',
    'getSocketAddress',
    'FS_createPreloadedFile',
    'FS_modeStringToFlags',
    'FS_getMode',
    'FS_stdin_getChar',
    'FS_unlink',
    'FS_createDataFile',
    'FS_mkdirTree',
    '_setNetworkCallback',
    'heapObjectForWebGLType',
    'toTypedArrayIndex',
    'webgl_enable_ANGLE_instanced_arrays',
    'webgl_enable_OES_vertex_array_object',
    'webgl_enable_WEBGL_draw_buffers',
    'webgl_enable_WEBGL_multi_draw',
    'emscriptenWebGLGet',
    'computeUnpackAlignedImageSize',
    'colorChannelsInGlTextureFormat',
    'emscriptenWebGLGetTexPixelData',
    'emscriptenWebGLGetUniform',
    'webglGetUniformLocation',
    'webglPrepareUniformLocationsBeforeFirstUse',
    'webglGetLeftBracePos',
    'emscriptenWebGLGetVertexAttrib',
    '__glGetActiveAttribOrUniform',
    'writeGLArray',
    'registerWebGlEventCallback',
    'runAndAbortIfError',
    'ALLOC_NORMAL',
    'ALLOC_STACK',
    'allocate',
    'writeStringToMemory',
    'writeAsciiToMemory',
    'setErrNo',
    'demangle',
    'stackTrace',
];
missingLibrarySymbols.forEach(missingLibrarySymbol);

var unexportedSymbols = [
    'run',
    'addOnPreRun',
    'addOnInit',
    'addOnPreMain',
    'addOnExit',
    'addOnPostRun',
    'addRunDependency',
    'removeRunDependency',
    'out',
    'err',
    'callMain',
    'abort',
    'wasmMemory',
    'wasmExports',
    'writeStackCookie',
    'checkStackCookie',
    'convertI32PairToI53Checked',
    'stackSave',
    'stackRestore',
    'stackAlloc',
    'setTempRet0',
    'ptrToString',
    'getHeapMax',
    'abortOnCannotGrowMemory',
    'ENV',
    'MONTH_DAYS_REGULAR',
    'MONTH_DAYS_LEAP',
    'MONTH_DAYS_REGULAR_CUMULATIVE',
    'MONTH_DAYS_LEAP_CUMULATIVE',
    'ERRNO_CODES',
    'ERRNO_MESSAGES',
    'DNS',
    'Protocols',
    'Sockets',
    'timers',
    'warnOnce',
    'readEmAsmArgsArray',
    'jstoi_s',
    'alignMemory',
    'wasmTable',
    'noExitRuntime',
    'freeTableIndexes',
    'functionsInTableMap',
    'setValue',
    'getValue',
    'PATH',
    'PATH_FS',
    'UTF8Decoder',
    'UTF8ArrayToString',
    'UTF8ToString',
    'stringToUTF8Array',
    'lengthBytesUTF8',
    'intArrayFromString',
    'UTF16Decoder',
    'JSEvents',
    'specialHTMLTargets',
    'findCanvasEventTarget',
    'currentFullscreenStrategy',
    'restoreOldWindowedStyle',
    'UNWIND_CACHE',
    'ExitStatus',
    'flush_NO_FILESYSTEM',
    'promiseMap',
    'uncaughtExceptionCount',
    'exceptionLast',
    'exceptionCaught',
    'ExceptionInfo',
    'findMatchingCatch',
    'getExceptionMessageCommon',
    'incrementExceptionRefcount',
    'decrementExceptionRefcount',
    'getExceptionMessage',
    'Browser',
    'getPreloadedImageData__data',
    'wget',
    'SYSCALLS',
    'preloadPlugins',
    'FS_stdin_getChar_buffer',
    'FS_createPath',
    'FS_createDevice',
    'FS_readFile',
    'FS',
    'FS_createLazyFile',
    'MEMFS',
    'TTY',
    'PIPEFS',
    'SOCKFS',
    'tempFixedLengthArray',
    'miniTempWebGLFloatBuffers',
    'miniTempWebGLIntBuffers',
    'GL',
    'AL',
    'GLUT',
    'EGL',
    'GLEW',
    'IDBStore',
    'SDL',
    'SDL_gfx',
    'allocateUTF8',
    'allocateUTF8OnStack',
    'print',
    'printErr',
];
unexportedSymbols.forEach(unexportedRuntimeSymbol);

var calledRun;

dependenciesFulfilled = function runCaller() {
    // If run has never been called, and we should call run (INVOKE_RUN is true, and blst.noInitialRun is not false)
    if (!calledRun) run();
    if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
};

function stackCheckInit() {
    // This is normally called automatically during __wasm_call_ctors but need to
    // get these values before even running any of the ctors so we call it redundantly
    // here.
    _emscripten_stack_init();
    // TODO(sbc): Move writeStackCookie to native to to avoid this.
    writeStackCookie();
}

function run() {
    if (runDependencies > 0) {
        return;
    }

    stackCheckInit();

    preRun();

    // a preRun added a dependency, run will be called later
    if (runDependencies > 0) {
        return;
    }

    function doRun() {
        // run may have just been called through dependencies being fulfilled just in this very frame,
        // or while the async setStatus time below was happening
        if (calledRun) return;
        calledRun = true;
        blst['calledRun'] = true;

        if (ABORT) return;

        initRuntime();

        if (blst['onRuntimeInitialized']) blst['onRuntimeInitialized']();

        assert(
            !blst['_main'],
            'compiled without a main, but one is present. if you added it from JS, use blst["onRuntimeInitialized"]',
        );

        postRun();
    }

    if (blst['setStatus']) {
        blst['setStatus']('Running...');
        setTimeout(function () {
            setTimeout(function () {
                blst['setStatus']('');
            }, 1);
            doRun();
        }, 1);
    } else {
        doRun();
    }
    checkStackCookie();
}

function checkUnflushedContent() {
    // Compiler settings do not allow exiting the runtime, so flushing
    // the streams is not possible. but in ASSERTIONS mode we check
    // if there was something to flush, and if so tell the user they
    // should request that the runtime be exitable.
    // Normally we would not even include flush() at all, but in ASSERTIONS
    // builds we do so just for this check, and here we see if there is any
    // content to flush, that is, we check if there would have been
    // something a non-ASSERTIONS build would have not seen.
    // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
    // mode (which has its own special function for this; otherwise, all
    // the code is inside libc)
    var oldOut = out;
    var oldErr = err;
    var has = false;
    out = err = (x) => {
        has = true;
    };
    try {
        // it doesn't matter if it fails
        flush_NO_FILESYSTEM();
    } catch (e) { }
    out = oldOut;
    err = oldErr;
    if (has) {
        warnOnce(
            'stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.',
        );
        warnOnce(
            '(this may also be due to not including full filesystem support - try building with -sFORCE_FILESYSTEM)',
        );
    }
}

if (blst['preInit']) {
    if (typeof blst['preInit'] == 'function') blst['preInit'] = [blst['preInit']];
    while (blst['preInit'].length > 0) {
        blst['preInit'].pop()();
    }
}

run();

// end include: postamble.js

// include: /Users/tatiana/Documents/_dev/GNOSIS/shutter-encryption/blst/bindings/emscripten/null_bind.js

// Bindings utilities

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function WrapperObject() { }
WrapperObject.prototype = Object.create(WrapperObject.prototype);
WrapperObject.prototype.constructor = WrapperObject;
WrapperObject.prototype.__class__ = WrapperObject;
WrapperObject.__cache__ = {};
blst['WrapperObject'] = WrapperObject;

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant)
    @param {*=} __class__ */
function getCache(__class__) {
    return (__class__ || WrapperObject).__cache__;
}
blst['getCache'] = getCache;

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant)
    @param {*=} __class__ */
function wrapPointer(ptr, __class__) {
    var cache = getCache(__class__);
    var ret = cache[ptr];
    if (ret) return ret;
    ret = Object.create((__class__ || WrapperObject).prototype);
    ret.ptr = ptr;
    return (cache[ptr] = ret);
}
blst['wrapPointer'] = wrapPointer;

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function castObject(obj, __class__) {
    return wrapPointer(obj.ptr, __class__);
}
blst['castObject'] = castObject;

blst['NULL'] = wrapPointer(0);

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function destroy(obj) {
    if (!obj['__destroy__']) throw 'Error: Cannot destroy object. (Did you create it yourself?)';
    obj['__destroy__']();
    // Remove from cache, so the object can be GC'd and refs added onto it released
    delete getCache(obj.__class__)[obj.ptr];
}
blst['destroy'] = destroy;

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function compare(obj1, obj2) {
    return obj1.ptr === obj2.ptr;
}
blst['compare'] = compare;

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function getPointer(obj) {
    return obj.ptr;
}
blst['getPointer'] = getPointer;

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function getClass(obj) {
    return obj.__class__;
}
blst['getClass'] = getClass;

// Converts big (string or array) values into a C-style storage, in temporary space

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
var ensureCache = {
    buffer: 0, // the main buffer of temporary storage
    size: 0, // the size of buffer
    pos: 0, // the next free offset in buffer
    temps: [], // extra allocations
    needed: 0, // the total size we need next time

    prepare() {
        if (ensureCache.needed) {
            // clear the temps
            for (var i = 0; i < ensureCache.temps.length; i++) {
                blst['_webidl_free'](ensureCache.temps[i]);
            }
            ensureCache.temps.length = 0;
            // prepare to allocate a bigger buffer
            blst['_webidl_free'](ensureCache.buffer);
            ensureCache.buffer = 0;
            ensureCache.size += ensureCache.needed;
            // clean up
            ensureCache.needed = 0;
        }
        if (!ensureCache.buffer) {
            // happens first time, or when we need to grow
            ensureCache.size += 128; // heuristic, avoid many small grow events
            ensureCache.buffer = blst['_webidl_malloc'](ensureCache.size);
            assert(ensureCache.buffer);
        }
        ensureCache.pos = 0;
    },
    alloc(array, view) {
        assert(ensureCache.buffer);
        var bytes = view.BYTES_PER_ELEMENT;
        var len = array.length * bytes;
        len = alignMemory(len, 8); // keep things aligned to 8 byte boundaries
        var ret;
        if (ensureCache.pos + len >= ensureCache.size) {
            // we failed to allocate in the buffer, ensureCache time around :(
            assert(len > 0); // null terminator, at least
            ensureCache.needed += len;
            ret = blst['_webidl_malloc'](len);
            ensureCache.temps.push(ret);
        } else {
            // we can allocate in the buffer
            ret = ensureCache.buffer + ensureCache.pos;
            ensureCache.pos += len;
        }
        return ret;
    },
    copy(array, view, offset) {
        offset /= view.BYTES_PER_ELEMENT;
        for (var i = 0; i < array.length; i++) {
            view[offset + i] = array[i];
        }
    },
};

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function ensureString(value) {
    if (typeof value === 'string') {
        var intArray = intArrayFromString(value);
        var offset = ensureCache.alloc(intArray, HEAP8);
        ensureCache.copy(intArray, HEAP8, offset);
        return offset;
    }
    return value;
}

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function ensureInt8(value) {
    if (typeof value === 'object') {
        var offset = ensureCache.alloc(value, HEAP8);
        ensureCache.copy(value, HEAP8, offset);
        return offset;
    }
    return value;
}

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function ensureInt16(value) {
    if (typeof value === 'object') {
        var offset = ensureCache.alloc(value, HEAP16);
        ensureCache.copy(value, HEAP16, offset);
        return offset;
    }
    return value;
}

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function ensureInt32(value) {
    if (typeof value === 'object') {
        var offset = ensureCache.alloc(value, HEAP32);
        ensureCache.copy(value, HEAP32, offset);
        return offset;
    }
    return value;
}

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function ensureFloat32(value) {
    if (typeof value === 'object') {
        var offset = ensureCache.alloc(value, HEAPF32);
        ensureCache.copy(value, HEAPF32, offset);
        return offset;
    }
    return value;
}

/** @suppress {duplicate} (TODO: avoid emitting this multiple times, it is redundant) */
function ensureFloat64(value) {
    if (typeof value === 'object') {
        var offset = ensureCache.alloc(value, HEAPF64);
        ensureCache.copy(value, HEAPF64, offset);
        return offset;
    }
    return value;
}

// Interface: VoidPtr

/** @suppress {undefinedVars, duplicate} @this{Object} */
function VoidPtr() {
    throw 'cannot construct a VoidPtr, no constructor in IDL';
}
VoidPtr.prototype = Object.create(WrapperObject.prototype);
VoidPtr.prototype.constructor = VoidPtr;
VoidPtr.prototype.__class__ = VoidPtr;
VoidPtr.__cache__ = {};
blst['VoidPtr'] = VoidPtr;

/** @suppress {undefinedVars, duplicate} @this{Object} */
VoidPtr.prototype['__destroy__'] = VoidPtr.prototype.__destroy__ = function () {
    var self = this.ptr;
    _emscripten_bind_VoidPtr___destroy___0(self);
};
// end include: /Users/tatiana/Documents/_dev/GNOSIS/shutter-encryption/blst/bindings/emscripten/null_bind.js

// include: /Users/tatiana/Documents/_dev/GNOSIS/shutter-encryption/blst/bindings/emscripten/blst_bind.js
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// DO NOT EDIT THIS FILE!!!
// The file is auto-generated by build.py
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

const BLST_ERROR_str = [
    'BLST_ERROR: success',
    'BLST_ERROR: bad point encoding',
    'BLST_ERROR: point is not on curve',
    'BLST_ERROR: point is not in group',
    'BLST_ERROR: context type mismatch',
    'BLST_ERROR: verify failed',
    'BLST_ERROR: public key is infinite',
    'BLST_ERROR: bad scalar',
];

function unsupported(type, extra) {
    if (typeof extra === 'undefined')
        return `${type ? type.constructor.name : 'none'}: unsupported type`;
    else
        return `${type ? type.constructor.name : 'none'}/${extra ? extra.constructor.name : 'none'}: unsupported types or combination thereof`;
}

function ensureAny(value) {
    if (value === null) return [0, 0];

    switch (value.constructor) {
        case String:
            return [ensureString(value), lengthBytesUTF8(value)];
        case ArrayBuffer:
            return [ensureInt8(new Uint8Array(value)), value.byteLength];
        case BigInt:
            if (value < 0) throw new Error('expecting unsigned BigInt value');
            var temp = [];
            while (value != 0) {
                temp.push(Number(value & 255n));
                value >>= 8n;
            }
            return [ensureInt8(temp), temp.length];
        case Uint8Array:
        case Buffer:
            return [ensureInt8(value), value.length];
        default:
            throw new Error(unsupported(value));
    }
}

(function () {
    function setupConsts() {
        var i = 0;
        blst['BLST_SUCCESS'] = i++;
        blst['BLST_BAD_ENCODING'] = i++;
        blst['BLST_POINT_NOT_ON_CURVE'] = i++;
        blst['BLST_POINT_NOT_IN_GROUP'] = i++;
        blst['BLST_AGGR_TYPE_MISMATCH'] = i++;
        blst['BLST_VERIFY_FAIL'] = i++;
        blst['BLST_PK_IS_INFINITY'] = i++;
        blst['BLST_BAD_SCALAR'] = i++;
        blst['BLS12_381_G1'] = wrapPointer(_const_G1(), P1_Affine);
        blst['BLS12_381_G2'] = wrapPointer(_const_G2(), P2_Affine);
        blst['BLS12_381_NEG_G1'] = wrapPointer(_const_NEG_G1(), P1_Affine);
        blst['BLS12_381_NEG_G2'] = wrapPointer(_const_NEG_G2(), P2_Affine);
    }
    if (runtimeInitialized) setupConsts();
    else addOnInit(setupConsts);
})();

/** @this{Object} */
function SecretKey() {
    this.ptr = _SecretKey_0();
    getCache(SecretKey)[this.ptr] = this;
}
SecretKey.prototype = Object.create(WrapperObject.prototype);
SecretKey.prototype.constructor = SecretKey;
SecretKey.prototype.__class__ = SecretKey;
SecretKey.__cache__ = {};
blst['SecretKey'] = SecretKey;
SecretKey.prototype['__destroy__'] = SecretKey.prototype.__destroy__ =
    /** @this{Object} */
    function () {
        _SecretKey__destroy__0(this.ptr);
        this.ptr = 0;
    };

SecretKey.prototype['keygen'] = SecretKey.prototype.keygen =
    /** @this{Object} */
    function (IKM, info) {
        ensureCache.prepare();
        const [_IKM, IKM_len] = ensureAny(IKM);
        if (IKM_len < 32) throw new Error('BLST_ERROR: bad scalar');
        info = ensureString(info);
        _SecretKey_keygen_3(this.ptr, _IKM, IKM_len, info);
        HEAP8.fill(0, _IKM, _IKM + IKM_len);
    };

SecretKey.prototype['derive_master_eip2333'] = SecretKey.prototype.derive_master_eip2333 =
    /** @this{Object} */
    function (IKM) {
        ensureCache.prepare();
        const [_IKM, IKM_len] = ensureAny(IKM);
        if (IKM_len < 32) throw new Error('BLST_ERROR: bad scalar');
        _SecretKey_derive_master_eip2333_2(this.ptr, _IKM, IKM_len);
        HEAP8.fill(0, _IKM, _IKM + IKM_len);
    };

SecretKey.prototype['derive_child_eip2333'] = SecretKey.prototype.derive_child_eip2333 =
    /** @this{Object} */
    function (sk, child_index) {
        if (!(sk instanceof SecretKey)) throw new Error(unsupported(sk));
        _SecretKey_derive_child_eip2333_2(this.ptr, sk.ptr, child_index);
    };

SecretKey.prototype['from_bendian'] = SecretKey.prototype.from_bendian =
    /** @this{Object} */
    function (sk) {
        if (!(sk instanceof Uint8Array) || sk.length != 32) throw new Error(unsupported(sk));
        ensureCache.prepare();
        sk = ensureInt8(sk);
        _SecretKey_from_bendian_1(this.ptr, sk);
        HEAP8.fill(0, sk, sk + 32);
    };

SecretKey.prototype['from_lendian'] = SecretKey.prototype.from_lendian =
    /** @this{Object} */
    function (sk) {
        if (!(sk instanceof Uint8Array) || sk.length != 32) throw new Error(unsupported(sk));
        ensureCache.prepare();
        sk = ensureInt8(sk);
        _SecretKey_from_lendian_1(this.ptr, sk);
        HEAP8.fill(0, sk, sk + 32);
    };

SecretKey.prototype['to_bendian'] = SecretKey.prototype.to_bendian =
    /** @this{Object} */
    function () {
        var out = _SecretKey_to_bendian_0(this.ptr);
        var ret = new Uint8Array(HEAPU8.subarray(out, out + 32));
        HEAP8.fill(0, out, out + 32);
        return ret;
    };

SecretKey.prototype['to_lendian'] = SecretKey.prototype.to_lendian =
    /** @this{Object} */
    function () {
        var out = _SecretKey_to_lendian_0(this.ptr);
        var ret = new Uint8Array(HEAPU8.subarray(out, out + 32));
        HEAP8.fill(0, out, out + 32);
        return ret;
    };

/** @this{Object} */
function Scalar(scalar, DST) {
    if (typeof scalar === 'undefined' || scalar === null) {
        this.ptr = _Scalar_0();
    } else {
        ensureCache.prepare();
        const [_scalar, len] = ensureAny(scalar);
        if (typeof DST === 'string' || DST === null) {
            DST = ensureString(DST);
            this.ptr = _Scalar_3(_scalar, len, DST);
        } else {
            this.ptr = _Scalar_2(_scalar, len * 8);
        }
    }
    getCache(Scalar)[this.ptr] = this;
}
Scalar.prototype = Object.create(WrapperObject.prototype);
Scalar.prototype.constructor = Scalar;
Scalar.prototype.__class__ = Scalar;
Scalar.__cache__ = {};
blst['Scalar'] = Scalar;
Scalar.prototype['__destroy__'] = Scalar.prototype.__destroy__ =
    /** @this{Object} */
    function () {
        _Scalar__destroy__0(this.ptr);
        this.ptr = 0;
    };

Scalar.prototype['hash_to'] = Scalar.prototype.hash_to =
    /** @this{Object} */
    function (msg, DST) {
        ensureCache.prepare();
        const [_msg, msg_len] = ensureAny(msg);
        DST = ensureString(DST);
        _Scalar_hash_to_3(this.ptr, _msg, msg_len, DST);
        return this;
    };

Scalar.prototype['dup'] = Scalar.prototype.dup =
    /** @this{Object} */
    function () {
        return wrapPointer(_Scalar_dup_0(this.ptr), Scalar);
    };

Scalar.prototype['from_bendian'] = Scalar.prototype.from_bendian =
    /** @this{Object} */
    function (msg) {
        ensureCache.prepare();
        const [_msg, msg_len] = ensureAny(msg);
        _Scalar_from_bendian_2(this.ptr, _msg, msg_len);
        return this;
    };

Scalar.prototype['from_lendian'] = Scalar.prototype.from_lendian =
    /** @this{Object} */
    function (msg) {
        ensureCache.prepare();
        const [_msg, msg_len] = ensureAny(msg);
        _Scalar_from_lendian_2(this.ptr, _msg, msg_len);
        return this;
    };

Scalar.prototype['to_bendian'] = Scalar.prototype.to_bendian =
    /** @this{Object} */
    function () {
        var out = _Scalar_to_bendian_0(this.ptr);
        return new Uint8Array(HEAPU8.subarray(out, out + 32));
    };

Scalar.prototype['to_lendian'] = Scalar.prototype.to_lendian =
    /** @this{Object} */
    function () {
        var out = _Scalar_to_lendian_0(this.ptr);
        return new Uint8Array(HEAPU8.subarray(out, out + 32));
    };

Scalar.prototype['add'] = Scalar.prototype.add =
    /** @this{Object} */
    function (a) {
        if (!(a instanceof Scalar || a instanceof SecretKey)) throw new Error(unsupported(a));
        _Scalar_add_1(this.ptr, a.ptr);
        return this;
    };

Scalar.prototype['sub'] = Scalar.prototype.sub =
    /** @this{Object} */
    function (a) {
        if (!(a instanceof Scalar)) throw new Error(unsupported(a));
        _Scalar_sub_1(this.ptr, a.ptr);
        return this;
    };

Scalar.prototype['mul'] = Scalar.prototype.mul =
    /** @this{Object} */
    function (a) {
        if (!(a instanceof Scalar)) throw new Error(unsupported(a));
        _Scalar_mul_1(this.ptr, a.ptr);
        return this;
    };

Scalar.prototype['inverse'] = Scalar.prototype.inverse =
    /** @this{Object} */
    function () {
        _Scalar_inverse_0(this.ptr);
        return this;
    };

/** @this{Object} */
function PT(p, q) {
    if (typeof q === 'undefined' || q === null) {
        if (p instanceof P1_Affine) this.ptr = _PT_p_affine_1(p.ptr);
        else if (p instanceof P2_Affine) this.ptr = _PT_q_affine_1(p.ptr);
        else throw new Error(unsupported(p));
    } else if (p instanceof P1_Affine && q instanceof P2_Affine) {
        this.ptr = _PT_pq_affine_2(p.ptr, q.ptr);
    } else if (p instanceof P2_Affine && q instanceof P1_Affine) {
        this.ptr = _PT_pq_affine_2(q.ptr, p.ptr);
    } else if (p instanceof P1 && q instanceof P2) {
        this.ptr = _PT_pq_2(p.ptr, q.ptr);
    } else if (p instanceof P2 && q instanceof P1) {
        this.ptr = _PT_pq_2(q.ptr, p.ptr);
    } else {
        throw new Error(unsupported(p, q));
    }
    getCache(PT)[this.ptr] = this;
}
PT.prototype = Object.create(WrapperObject.prototype);
PT.prototype.constructor = PT;
PT.prototype.__class__ = PT;
PT.__cache__ = {};
blst['PT'] = PT;
PT.prototype['__destroy__'] = PT.prototype.__destroy__ =
    /** @this{Object} */
    function () {
        _PT__destroy__0(this.ptr);
        this.ptr = 0;
    };

PT.prototype['dup'] = PT.prototype.dup =
    /** @this{Object} */
    function () {
        return wrapPointer(_PT_dup_0(this.ptr), PT);
    };

PT.prototype['is_one'] = PT.prototype.is_one =
    /** @this{Object} */
    function () {
        return !!_PT_is_one_0(this.ptr);
    };

PT.prototype['is_equal'] = PT.prototype.is_equal =
    /** @this{Object} */
    function (p) {
        if (p instanceof PT) return !!_PT_is_equal_1(this.ptr, p.ptr);
        throw new Error(unsupported(p));
    };

PT.prototype['sqr'] = PT.prototype.sqr =
    /** @this{Object} */
    function () {
        _PT_sqr_0(this.ptr);
        return this;
    };

PT.prototype['mul'] = PT.prototype.mul =
    /** @this{Object} */
    function (p) {
        if (p instanceof PT) _PT_mul_1(this.ptr, p.ptr);
        else throw new Error(unsupported(p));
        return this;
    };

PT.prototype['final_exp'] = PT.prototype.final_exp =
    /** @this{Object} */
    function () {
        _PT_final_exp_0(this.ptr);
        return this;
    };

PT.prototype['in_group'] = PT.prototype.in_group =
    /** @this{Object} */
    function () {
        return !!_PT_in_group_0(this.ptr);
    };

PT.prototype['to_bendian'] = PT.prototype.to_bendian =
    /** @this{Object} */
    function () {
        var out = _PT_to_bendian_0(this.ptr);
        return new Uint8Array(HEAPU8.subarray(out, out + 48 * 12));
    };

PT['finalverify'] = PT.finalverify = function (gt1, gt2) {
    if (gt1 instanceof PT && gt2 instanceof PT) return !!_PT_finalverify_2(gt1.ptr, gt2.ptr);
    throw new Error(unsupported(gt1, gt2));
};

PT['one'] = PT.one = function () {
    return wrapPointer(_PT_one_0(), PT);
};

/** @this{Object} */
function Pairing(hash_or_encode, DST) {
    ensureCache.prepare();
    DST = ensureString(DST);
    this.ptr = _Pairing_2(!!hash_or_encode, DST);
    getCache(SecretKey)[this.ptr] = this;
}
Pairing.prototype = Object.create(WrapperObject.prototype);
Pairing.prototype.constructor = Pairing;
Pairing.prototype.__class__ = Pairing;
Pairing.__cache__ = {};
blst['Pairing'] = Pairing;
Pairing.prototype['__destroy__'] = Pairing.prototype.__destroy__ =
    /** @this{Object} */
    function () {
        _Pairing__destroy__0(this.ptr);
        this.ptr = 0;
    };

Pairing.prototype['aggregate'] = Pairing.prototype.aggregate =
    /** @this{Object} */
    function (pk, sig, msg, aug) {
        ensureCache.prepare();
        const [_msg, msg_len] = ensureAny(msg);
        const [_aug, aug_len] = ensureAny(aug);
        if (pk instanceof P1_Affine && sig instanceof P2_Affine)
            return _Pairing_aggregate_pk_in_g1_6(this.ptr, pk.ptr, sig.ptr, _msg, msg_len, _aug, aug_len);
        else if (pk instanceof P2_Affine && sig instanceof P1_Affine)
            return _Pairing_aggregate_pk_in_g2_6(this.ptr, pk.ptr, sig.ptr, _msg, msg_len, _aug, aug_len);
        else throw new Error(unsupported(pk, sig));
        return -1;
    };

Pairing.prototype['mul_n_aggregate'] = Pairing.prototype.mul_n_aggregate =
    /** @this{Object} */
    function (pk, sig, scalar, msg, aug) {
        if (typeof scalar === 'undefined' || scalar === null)
            throw new Error('missing |scalar| argument');
        ensureCache.prepare();
        const [_scalar, len] = ensureAny(scalar);
        const [_msg, msg_len] = ensureAny(msg);
        const [_aug, aug_len] = ensureAny(aug);
        if (pk instanceof P1_Affine && sig instanceof P2_Affine)
            return _Pairing_mul_n_aggregate_pk_in_g1_8(
                this.ptr,
                pk.ptr,
                sig.ptr,
                _scalar,
                len * 8,
                _msg,
                msg_len,
                _aug,
                aug_len,
            );
        else if (pk instanceof P2_Affine && sig instanceof P1_Affine)
            return _Pairing_mul_n_aggregate_pk_in_g2_8(
                this.ptr,
                pk.ptr,
                sig.ptr,
                _scalar,
                len * 8,
                _msg,
                msg_len,
                _aug,
                aug_len,
            );
        else throw new Error(unsupported(pk, sig));
        return -1;
    };

Pairing.prototype['commit'] = Pairing.prototype.commit =
    /** @this{Object} */
    function () {
        _Pairing_commit_0(this.ptr);
    };

Pairing.prototype['asArrayBuffer'] = Pairing.prototype.asArrayBuffer =
    /** @this{Object} */
    function () {
        return HEAP8.buffer.slice(this.ptr, this.ptr + _Pairing_sizeof_0());
    };

Pairing.prototype['merge'] = Pairing.prototype.merge =
    /** @this{Object} */
    function (ctx) {
        if (ctx instanceof Pairing) return _Pairing_merge_1(this.ptr, ctx.ptr);
        else if (ctx instanceof ArrayBuffer && ctx.byteLength == _Pairing_sizeof_0())
            return _Pairing_merge_1(this.ptr, ensureAny(ctx)[0]);
        throw new Error(unsupported(ctx));
    };

Pairing.prototype['finalverify'] = Pairing.prototype.finalverify =
    /** @this{Object} */
    function (sig) {
        if (typeof sig === 'undefined' || sig === null) return !!_Pairing_finalverify_1(this.ptr, 0);
        else if (sig instanceof PT) return !!_Pairing_finalverify_1(this.ptr, sig.ptr);
        else throw new Error(unsupported(sig));
    };

Pairing.prototype['raw_aggregate'] = Pairing.prototype.raw_aggregate =
    /** @this{Object} */
    function (q, p) {
        if (q instanceof P2_Affine && p instanceof P1_Affine)
            _Pairing_raw_aggregate_2(this.ptr, q.ptr, p.ptr);
        else throw new Error(unsupported(q, p));
    };

Pairing.prototype['as_fp12'] = Pairing.prototype.as_fp12 =
    /** @this{Object} */
    function () {
        return wrapPointer(_Pairing_as_fp12_0(this.ptr), PT);
    };

/** @this{Object} */
function P1_Affine(input) {
    ensureCache.prepare();
    if (typeof input === 'undefined' || input === null) this.ptr = _P1_Affine_0();
    else if (input instanceof Uint8Array) this.ptr = _P1_Affine_2(ensureInt8(input), input.length);
    else if (input instanceof P1) this.ptr = _P1_Affine_1(input.ptr);
    else throw new Error(unsupported(input));
    getCache(P1_Affine)[this.ptr] = this;
}
P1_Affine.prototype = Object.create(WrapperObject.prototype);
P1_Affine.prototype.constructor = P1_Affine;
P1_Affine.prototype.__class__ = P1_Affine;
P1_Affine.__cache__ = {};
blst['P1_Affine'] = P1_Affine;
P1_Affine.prototype['__destroy__'] = P1_Affine.prototype.__destroy__ =
    /** @this{Object} */
    function () {
        _P1_Affine__destroy__0(this.ptr);
        this.ptr = 0;
    };

P1_Affine.prototype['dup'] = P1_Affine.prototype.dup =
    /** @this{Object} */
    function () {
        return wrapPointer(_P1_Affine_dup_0(this.ptr), P1_Affine);
    };

P1_Affine.prototype['to_jacobian'] = P1_Affine.prototype.to_jacobian =
    /** @this{Object} */
    function () {
        return wrapPointer(_P1_Affine_to_jacobian_0(this.ptr), P1);
    };

P1_Affine.prototype['serialize'] = P1_Affine.prototype.serialize =
    /** @this{Object} */
    function () {
        var out = _P1_Affine_serialize_0(this.ptr);
        return new Uint8Array(HEAPU8.subarray(out, out + 96 * 1));
    };

P1_Affine.prototype['compress'] = P1_Affine.prototype.compress =
    /** @this{Object} */
    function () {
        var out = _P1_Affine_compress_0(this.ptr);
        return new Uint8Array(HEAPU8.subarray(out, out + 48 * 1));
    };

P1_Affine.prototype['on_curve'] = P1_Affine.prototype.on_curve =
    /** @this{Object} */
    function () {
        return !!_P1_Affine_on_curve_0(this.ptr);
    };

P1_Affine.prototype['in_group'] = P1_Affine.prototype.in_group =
    /** @this{Object} */
    function () {
        return !!_P1_Affine_in_group_0(this.ptr);
    };

P1_Affine.prototype['is_inf'] = P1_Affine.prototype.is_inf =
    /** @this{Object} */
    function () {
        return !!_P1_Affine_is_inf_0(this.ptr);
    };

P1_Affine.prototype['is_equal'] = P1_Affine.prototype.is_equal =
    /** @this{Object} */
    function (p) {
        if (p instanceof P1_Affine) return !!_P1_Affine_is_equal_1(this.ptr, p.ptr);
        throw new Error(unsupported(p));
    };

P1_Affine.prototype['core_verify'] = P1_Affine.prototype.core_verify =
    /** @this{Object} */
    function (pk, hash_or_encode, msg, DST, aug) {
        if (!(pk instanceof P2_Affine)) throw new Error(unsupported(pk));
        ensureCache.prepare();
        const [_msg, msg_len] = ensureAny(msg);
        DST = ensureString(DST);
        const [_aug, aug_len] = ensureAny(aug);
        return _P1_Affine_core_verify_7(
            this.ptr,
            pk.ptr,
            !!hash_or_encode,
            _msg,
            msg_len,
            DST,
            _aug,
            aug_len,
        );
    };

P1_Affine['generator'] = P1_Affine.generator = function () {
    return wrapPointer(_P1_Affine_generator_0(), P1_Affine);
};

/** @this{Object} */
function P1(input) {
    ensureCache.prepare();
    if (typeof input === 'undefined' || input === null) this.ptr = _P1_0();
    else if (input instanceof Uint8Array) this.ptr = _P1_2(ensureInt8(input), input.length);
    else if (input instanceof P1_Affine) this.ptr = _P1_affine_1(input.ptr);
    else if (input instanceof SecretKey) this.ptr = _P1_secretkey_1(input.ptr);
    else throw new Error(unsupported(input));
    getCache(P1)[this.ptr] = this;
}
P1.prototype = Object.create(WrapperObject.prototype);
P1.prototype.constructor = P1;
P1.prototype.__class__ = P1;
P1.__cache__ = {};
blst['P1'] = P1;
P1.prototype['__destroy__'] = P1.prototype.__destroy__ =
    /** @this{Object} */
    function () {
        _P1__destroy__0(this.ptr);
        this.ptr = 0;
    };

P1.prototype['dup'] = P1.prototype.dup =
    /** @this{Object} */
    function () {
        return wrapPointer(_P1_dup_0(this.ptr), P1);
    };

P1.prototype['to_affine'] = P1.prototype.to_affine =
    /** @this{Object} */
    function () {
        return wrapPointer(_P1_to_affine_0(this.ptr), P1_Affine);
    };

P1.prototype['serialize'] = P1.prototype.serialize =
    /** @this{Object} */
    function () {
        var out = _P1_serialize_0(this.ptr);
        return new Uint8Array(HEAPU8.subarray(out, out + 96 * 1));
    };

P1.prototype['compress'] = P1.prototype.compress =
    /** @this{Object} */
    function () {
        var out = _P1_compress_0(this.ptr);
        return new Uint8Array(HEAPU8.subarray(out, out + 48 * 1));
    };

P1.prototype['on_curve'] = P1.prototype.on_curve =
    /** @this{Object} */
    function () {
        return !!_P1_on_curve_0(this.ptr);
    };

P1.prototype['in_group'] = P1.prototype.in_group =
    /** @this{Object} */
    function () {
        return !!_P1_in_group_0(this.ptr);
    };

P1.prototype['is_inf'] = P1.prototype.is_inf =
    /** @this{Object} */
    function () {
        return !!_P1_is_inf_0(this.ptr);
    };

P1.prototype['is_equal'] = P1.prototype.is_equal =
    /** @this{Object} */
    function (p) {
        if (p instanceof P1) return !!_P1_is_equal_1(this.ptr, p.ptr);
        throw new Error(unsupported(p));
    };

P1.prototype['aggregate'] = P1.prototype.aggregate =
    /** @this{Object} */
    function (p) {
        if (p instanceof P1_Affine) _P1_aggregate_1(this.ptr, p.ptr);
        else throw new Error(unsupported(p));
    };

P1.prototype['sign_with'] = P1.prototype.sign_with =
    /** @this{Object} */
    function (sk) {
        if (sk instanceof SecretKey) _P1_sign_with_1(this.ptr, sk.ptr);
        else throw new Error(unsupported(sk));
        return this;
    };

P1.prototype['hash_to'] = P1.prototype.hash_to =
    /** @this{Object} */
    function (msg, DST, aug) {
        ensureCache.prepare();
        const [_msg, msg_len] = ensureAny(msg);
        DST = ensureString(DST);
        const [_aug, aug_len] = ensureAny(aug);
        _P1_hash_to_5(this.ptr, _msg, msg_len, DST, _aug, aug_len);
        return this;
    };

P1.prototype['encode_to'] = P1.prototype.encode_to =
    /** @this{Object} */
    function (msg, DST, aug) {
        ensureCache.prepare();
        const [_msg, msg_len] = ensureAny(msg);
        DST = ensureString(DST);
        const [_aug, aug_len] = ensureAny(aug);
        _P1_encode_to_5(this.ptr, _msg, msg_len, DST, _aug, aug_len);
        return this;
    };

P1.prototype['mult'] = P1.prototype.mult =
    /** @this{Object} */
    function (scalar) {
        if (scalar instanceof Scalar) {
            _P1_mult_1(this.ptr, scalar.ptr);
        } else if (typeof scalar !== 'string') {
            ensureCache.prepare();
            const [_scalar, len] = ensureAny(scalar);
            _P1_mult_2(this.ptr, _scalar, len * 8);
        } else {
            throw new Error(unsupported(scalar));
        }
        return this;
    };

P1.prototype['cneg'] = P1.prototype.cneg =
    /** @this{Object} */
    function (flag) {
        _P1_cneg_1(this.ptr, !!flag);
        return this;
    };
P1.prototype['neg'] = P1.prototype.neg =
    /** @this{Object} */
    function () {
        _P1_cneg_1(this.ptr, true);
        return this;
    };

P1.prototype['add'] = P1.prototype.add =
    /** @this{Object} */
    function (p) {
        if (p instanceof P1) _P1_add_1(this.ptr, p.ptr);
        else if (p instanceof P1_Affine) _P1_add_affine_1(this.ptr, p.ptr);
        else throw new Error(unsupported(p));
        return this;
    };

P1.prototype['dbl'] = P1.prototype.dbl =
    /** @this{Object} */
    function () {
        _P1_dbl_0(this.ptr);
        return this;
    };

blst['G1'] =
    P1['generator'] =
    P1.generator =
    function () {
        return wrapPointer(_P1_generator_0(), P1);
    };

/** @this{Object} */
function P2_Affine(input) {
    ensureCache.prepare();
    if (typeof input === 'undefined' || input === null) this.ptr = _P2_Affine_0();
    else if (input instanceof Uint8Array) this.ptr = _P2_Affine_2(ensureInt8(input), input.length);
    else if (input instanceof P2) this.ptr = _P2_Affine_1(input.ptr);
    else throw new Error(unsupported(input));
    getCache(P2_Affine)[this.ptr] = this;
}
P2_Affine.prototype = Object.create(WrapperObject.prototype);
P2_Affine.prototype.constructor = P2_Affine;
P2_Affine.prototype.__class__ = P2_Affine;
P2_Affine.__cache__ = {};
blst['P2_Affine'] = P2_Affine;
P2_Affine.prototype['__destroy__'] = P2_Affine.prototype.__destroy__ =
    /** @this{Object} */
    function () {
        _P2_Affine__destroy__0(this.ptr);
        this.ptr = 0;
    };

P2_Affine.prototype['dup'] = P2_Affine.prototype.dup =
    /** @this{Object} */
    function () {
        return wrapPointer(_P2_Affine_dup_0(this.ptr), P2_Affine);
    };

P2_Affine.prototype['to_jacobian'] = P2_Affine.prototype.to_jacobian =
    /** @this{Object} */
    function () {
        return wrapPointer(_P2_Affine_to_jacobian_0(this.ptr), P2);
    };

P2_Affine.prototype['serialize'] = P2_Affine.prototype.serialize =
    /** @this{Object} */
    function () {
        var out = _P2_Affine_serialize_0(this.ptr);
        return new Uint8Array(HEAPU8.subarray(out, out + 96 * 2));
    };

P2_Affine.prototype['compress'] = P2_Affine.prototype.compress =
    /** @this{Object} */
    function () {
        var out = _P2_Affine_compress_0(this.ptr);
        return new Uint8Array(HEAPU8.subarray(out, out + 48 * 2));
    };

P2_Affine.prototype['on_curve'] = P2_Affine.prototype.on_curve =
    /** @this{Object} */
    function () {
        return !!_P2_Affine_on_curve_0(this.ptr);
    };

P2_Affine.prototype['in_group'] = P2_Affine.prototype.in_group =
    /** @this{Object} */
    function () {
        return !!_P2_Affine_in_group_0(this.ptr);
    };

P2_Affine.prototype['is_inf'] = P2_Affine.prototype.is_inf =
    /** @this{Object} */
    function () {
        return !!_P2_Affine_is_inf_0(this.ptr);
    };

P2_Affine.prototype['is_equal'] = P2_Affine.prototype.is_equal =
    /** @this{Object} */
    function (p) {
        if (p instanceof P2_Affine) return !!_P2_Affine_is_equal_1(this.ptr, p.ptr);
        throw new Error(unsupported(p));
    };

P2_Affine.prototype['core_verify'] = P2_Affine.prototype.core_verify =
    /** @this{Object} */
    function (pk, hash_or_encode, msg, DST, aug) {
        if (!(pk instanceof P1_Affine)) throw new Error(unsupported(pk));
        ensureCache.prepare();
        const [_msg, msg_len] = ensureAny(msg);
        DST = ensureString(DST);
        const [_aug, aug_len] = ensureAny(aug);
        return _P2_Affine_core_verify_7(
            this.ptr,
            pk.ptr,
            !!hash_or_encode,
            _msg,
            msg_len,
            DST,
            _aug,
            aug_len,
        );
    };

P2_Affine['generator'] = P2_Affine.generator = function () {
    return wrapPointer(_P2_Affine_generator_0(), P2_Affine);
};

/** @this{Object} */
function P2(input) {
    ensureCache.prepare();
    if (typeof input === 'undefined' || input === null) this.ptr = _P2_0();
    else if (input instanceof Uint8Array) this.ptr = _P2_2(ensureInt8(input), input.length);
    else if (input instanceof P2_Affine) this.ptr = _P2_affine_1(input.ptr);
    else if (input instanceof SecretKey) this.ptr = _P2_secretkey_1(input.ptr);
    else throw new Error(unsupported(input));
    getCache(P2)[this.ptr] = this;
}
P2.prototype = Object.create(WrapperObject.prototype);
P2.prototype.constructor = P2;
P2.prototype.__class__ = P2;
P2.__cache__ = {};
blst['P2'] = P2;
P2.prototype['__destroy__'] = P2.prototype.__destroy__ =
    /** @this{Object} */
    function () {
        _P2__destroy__0(this.ptr);
        this.ptr = 0;
    };

P2.prototype['dup'] = P2.prototype.dup =
    /** @this{Object} */
    function () {
        return wrapPointer(_P2_dup_0(this.ptr), P2);
    };

P2.prototype['to_affine'] = P2.prototype.to_affine =
    /** @this{Object} */
    function () {
        return wrapPointer(_P2_to_affine_0(this.ptr), P2_Affine);
    };

P2.prototype['serialize'] = P2.prototype.serialize =
    /** @this{Object} */
    function () {
        var out = _P2_serialize_0(this.ptr);
        return new Uint8Array(HEAPU8.subarray(out, out + 96 * 2));
    };

P2.prototype['compress'] = P2.prototype.compress =
    /** @this{Object} */
    function () {
        var out = _P2_compress_0(this.ptr);
        return new Uint8Array(HEAPU8.subarray(out, out + 48 * 2));
    };

P2.prototype['on_curve'] = P2.prototype.on_curve =
    /** @this{Object} */
    function () {
        return !!_P2_on_curve_0(this.ptr);
    };

P2.prototype['in_group'] = P2.prototype.in_group =
    /** @this{Object} */
    function () {
        return !!_P2_in_group_0(this.ptr);
    };

P2.prototype['is_inf'] = P2.prototype.is_inf =
    /** @this{Object} */
    function () {
        return !!_P2_is_inf_0(this.ptr);
    };

P2.prototype['is_equal'] = P2.prototype.is_equal =
    /** @this{Object} */
    function (p) {
        if (p instanceof P2) return !!_P2_is_equal_1(this.ptr, p.ptr);
        throw new Error(unsupported(p));
    };

P2.prototype['aggregate'] = P2.prototype.aggregate =
    /** @this{Object} */
    function (p) {
        if (p instanceof P2_Affine) _P2_aggregate_1(this.ptr, p.ptr);
        else throw new Error(unsupported(p));
    };

P2.prototype['sign_with'] = P2.prototype.sign_with =
    /** @this{Object} */
    function (sk) {
        if (sk instanceof SecretKey) _P2_sign_with_1(this.ptr, sk.ptr);
        else throw new Error(unsupported(sk));
        return this;
    };

P2.prototype['hash_to'] = P2.prototype.hash_to =
    /** @this{Object} */
    function (msg, DST, aug) {
        ensureCache.prepare();
        const [_msg, msg_len] = ensureAny(msg);
        DST = ensureString(DST);
        const [_aug, aug_len] = ensureAny(aug);
        _P2_hash_to_5(this.ptr, _msg, msg_len, DST, _aug, aug_len);
        return this;
    };

P2.prototype['encode_to'] = P2.prototype.encode_to =
    /** @this{Object} */
    function (msg, DST, aug) {
        ensureCache.prepare();
        const [_msg, msg_len] = ensureAny(msg);
        DST = ensureString(DST);
        const [_aug, aug_len] = ensureAny(aug);
        _P2_encode_to_5(this.ptr, _msg, msg_len, DST, _aug, aug_len);
        return this;
    };

P2.prototype['mult'] = P2.prototype.mult =
    /** @this{Object} */
    function (scalar) {
        if (scalar instanceof Scalar) {
            _P2_mult_1(this.ptr, scalar.ptr);
        } else if (typeof scalar !== 'string') {
            ensureCache.prepare();
            const [_scalar, len] = ensureAny(scalar);
            _P2_mult_2(this.ptr, _scalar, len * 8);
        } else {
            throw new Error(unsupported(scalar));
        }
        return this;
    };

P2.prototype['cneg'] = P2.prototype.cneg =
    /** @this{Object} */
    function (flag) {
        _P2_cneg_1(this.ptr, !!flag);
        return this;
    };
P2.prototype['neg'] = P2.prototype.neg =
    /** @this{Object} */
    function () {
        _P2_cneg_1(this.ptr, true);
        return this;
    };

P2.prototype['add'] = P2.prototype.add =
    /** @this{Object} */
    function (p) {
        if (p instanceof P2) _P2_add_1(this.ptr, p.ptr);
        else if (p instanceof P2_Affine) _P2_add_affine_1(this.ptr, p.ptr);
        else throw new Error(unsupported(p));
        return this;
    };

P2.prototype['dbl'] = P2.prototype.dbl =
    /** @this{Object} */
    function () {
        _P2_dbl_0(this.ptr);
        return this;
    };

blst['G2'] =
    P2['generator'] =
    P2.generator =
    function () {
        return wrapPointer(_P2_generator_0(), P2);
    };

// end include: /Users/tatiana/Documents/_dev/GNOSIS/shutter-encryption/blst/bindings/emscripten/blst_bind.js