(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var socket       = require("./socket");
var shims        = require("./client-shims");
var notify       = require("./notify");
var codeSync     = require("./code-sync");
var BrowserSync  = require("./browser-sync");
var ghostMode    = require("./ghostmode");
var emitter      = require("./emitter");
var events       = require("./events");
var utils        = require("./browser.utils");

var shouldReload = false;
var initialised    = false;

/**
 * @param options
 */
exports.init = function (options) {
    if (shouldReload && options.reloadOnRestart) {
        utils.reloadBrowser();
    }

    var BS = window.___browserSync___ || {};

    if (!BS.client) {

        BS.client = true;

        var browserSync = new BrowserSync(options);

        // Always init on page load
        ghostMode.init(browserSync);
        codeSync.init(browserSync);

        notify.init(browserSync);

        if (options.notify) {
            notify.flash("Connected to BrowserSync");
        }
    }

    if (!initialised) {
        socket.on("disconnect", function () {
            if (options.notify) {
                notify.flash("Disconnected from BrowserSync");
            }
            shouldReload = true;
        });
        initialised = true;
    }
};

/**
 * Handle individual socket connections
 */
socket.on("connection", exports.init);

/**debug:start**/
if (window.__karma__) {
    window.__bs_scroll__     = require("./ghostmode.scroll");
    window.__bs_clicks__     = require("./ghostmode.clicks");
    window.__bs_location__   = require("./ghostmode.location");
    window.__bs_inputs__     = require("./ghostmode.forms.input");
    window.__bs_toggles__    = require("./ghostmode.forms.toggles");
    window.__bs_submit__     = require("./ghostmode.forms.submit");
    window.__bs_forms__      = require("./ghostmode.forms");
    window.__bs_utils__      = require("./browser.utils");
    window.__bs_emitter__    = emitter;
    window.__bs              = BrowserSync;
    window.__bs_notify__     = notify;
    window.__bs_code_sync__  = codeSync;
    window.__bs_ghost_mode__ = ghostMode;
    window.__bs_socket__     = socket;
    window.__bs_index__      = exports;
}
/**debug:end**/
},{"./browser-sync":2,"./browser.utils":3,"./client-shims":4,"./code-sync":5,"./emitter":6,"./events":7,"./ghostmode":13,"./ghostmode.clicks":8,"./ghostmode.forms":10,"./ghostmode.forms.input":9,"./ghostmode.forms.submit":11,"./ghostmode.forms.toggles":12,"./ghostmode.location":14,"./ghostmode.scroll":15,"./notify":16,"./socket":17}],2:[function(require,module,exports){
"use strict";

var socket       = require("./socket");
var emitter      = require("./emitter");
var notify       = require("./notify");
var utils        = require("./browser.utils");

/**
 * @constructor
 */
var BrowserSync = function (options) {

    this.options = options;
    this.socket  = socket;
    this.emitter = emitter;
    this.utils   = utils;

    var _this = this;

    /**
     * Options set
     */
    socket.on("options:set", function (data) {
        emitter.emit("notify", "Setting options...");
        _this.options = data.options;
    });
};

/**
 * Helper to check if syncing is allowed
 * @param data
 * @param optPath
 * @returns {boolean}
 */
BrowserSync.prototype.canSync = function (data, optPath) {

    data = data || {};

    if (data.override) {
        return true;
    }

    var canSync = true;

    if (optPath) {
        canSync = this.getOption(optPath);
    }

    return canSync && data.url === window.location.pathname;
};

/**
 * Helper to check if syncing is allowed
 * @returns {boolean}
 */
BrowserSync.prototype.getOption = function (path) {

    if (path && path.match(/\./)) {

        return getByPath(this.options, path);

    } else {

        var opt = this.options[path];

        if (isUndefined(opt)) {
            return false;
        } else {
            return opt;
        }
    }
};

/**
 * @type {Function}
 */
module.exports = BrowserSync;

/**
 * @param {String} val
 * @returns {boolean}
 */
function isUndefined(val) {

    return "undefined" === typeof val;
}

/**
 * @param obj
 * @param path
 */
function getByPath(obj, path) {

    for(var i = 0, tempPath = path.split("."), len = tempPath.length; i < len; i++){
        if(!obj || typeof obj !== "object") {
            return false;
        }
        obj = obj[tempPath[i]];
    }

    if(typeof obj === "undefined") {
        return false;
    }

    return obj;
}
},{"./browser.utils":3,"./emitter":6,"./notify":16,"./socket":17}],3:[function(require,module,exports){
"use strict";

var utils = exports;

/**
 * @returns {window}
 */
utils.getWindow = function () {
    return window;
};

/**
 *
 * @returns {HTMLDocument}
 */
utils.getDocument = function () {
    return document;
};

/**
 * Get the current x/y position crossbow
 * @returns {{x: *, y: *}}
 */
utils.getBrowserScrollPosition = function () {

    var $window = exports.getWindow();
    var $document = exports.getDocument();
    var scrollX;
    var scrollY;
    var dElement = $document.documentElement;
    var dBody = $document.body;

    if ($window.pageYOffset !== undefined) {
        scrollX = $window.pageXOffset;
        scrollY = $window.pageYOffset;
    } else {
        scrollX = dElement.scrollLeft || dBody.scrollLeft || 0;
        scrollY = dElement.scrollTop || dBody.scrollTop || 0;
    }

    return {
        x: scrollX,
        y: scrollY
    };
};

/**
 * @returns {{x: number, y: number}}
 */
utils.getScrollSpace = function () {
    var $document = exports.getDocument();
    var dElement = $document.documentElement;
    var dBody = $document.body;
    return {
        x: dBody.scrollHeight - dElement.clientWidth,
        y: dBody.scrollHeight - dElement.clientHeight
    };
};

/**
 * Saves scroll position into cookies
 */
utils.saveScrollPosition = function () {
    var pos = utils.getBrowserScrollPosition();
    pos = [pos.x, pos.y];
    utils.getDocument.cookie = "bs_scroll_pos=" + pos.join(",");
};

/**
 * Restores scroll position from cookies
 */
utils.restoreScrollPosition = function () {
    var pos = utils.getDocument().cookie.replace(/(?:(?:^|.*;\s*)bs_scroll_pos\s*\=\s*([^;]*).*$)|^.*$/, "$1").split(",");
    utils.getWindow().scrollTo(pos[0], pos[1]);
};

/**
 * @param tagName
 * @param elem
 * @returns {*|number}
 */
utils.getElementIndex = function (tagName, elem) {
    var allElems = utils.getDocument().getElementsByTagName(tagName);
    return Array.prototype.indexOf.call(allElems, elem);
};

/**
 * Force Change event on radio & checkboxes (IE)
 */
utils.forceChange = function (elem) {
    elem.blur();
    elem.focus();
};

/**
 * @param elem
 * @returns {{tagName: (elem.tagName|*), index: *}}
 */
utils.getElementData = function (elem) {
    var tagName = elem.tagName;
    var index = utils.getElementIndex(tagName, elem);
    return {
        tagName: tagName,
        index:   index
    };
};

/**
 * @param {string} tagName
 * @param {number} index
 */
utils.getSingleElement = function (tagName, index) {
    var elems = utils.getDocument().getElementsByTagName(tagName);
    return elems[index];
};

/**
 * Get the body element
 */
utils.getBody = function () {
    return utils.getDocument().getElementsByTagName("body")[0];
};

/**
 * @param {{x: number, y: number}} pos
 */
utils.setScroll = function (pos) {
    utils.getWindow().scrollTo(pos.x, pos.y);
};

/**
 * Hard reload
 */
utils.reloadBrowser = function () {
    utils.getWindow().location.reload();
};

/**
 * Are we dealing with old IE?
 * @returns {boolean}
 */
utils.isOldIe = function () {
    return typeof utils.getWindow().attachEvent !== "undefined";
};
},{}],4:[function(require,module,exports){
if (!("indexOf" in Array.prototype)) {

    Array.prototype.indexOf= function(find, i) {
        if (i === undefined) {
            i = 0;
        }
        if (i < 0) {
            i += this.length;
        }
        if (i < 0) {
            i= 0;
        }
        for (var n = this.length; i < n; i += 1) {
            if (i in this && this[i]===find) {
                return i;
            }
        }
        return -1;
    };
}
},{}],5:[function(require,module,exports){
"use strict";
var events  = require("./events");
var utils   = require("./browser.utils");
var emitter = require("./emitter");
var sync    = exports;

var options = {

    tagNames: {
        "css":  "link",
        "jpg":  "img",
        "jpeg": "img",
        "png":  "img",
        "svg":  "img",
        "gif":  "img",
        "js":   "script"
    },
    attrs: {
        "link":   "href",
        "img":    "src",
        "script": "src"
    }
};

var hiddenElem;
var OPT_PATH = "codeSync";

var current = function () {
    return window.location.pathname;
};

/**
 * @param {BrowserSync} bs
 */
sync.init = function (bs) {

    if (bs.options.tagNames) {
        options.tagNames = bs.options.tagNames;
    }

    if (bs.options.scrollRestoreTechnique === "window.name") {
        sync.saveScrollInName(bs);
    } else {
        sync.saveScrollInCookie(utils.getWindow(), utils.getDocument());
    }

    bs.socket.on("file:reload", sync.reload(bs));
    bs.socket.on("browser:reload", function () {
        if (bs.canSync({url: current()}, OPT_PATH)) {
            sync.reloadBrowser(true, bs);
        }
    });
};

/**
 * Use window.name to store/restore scroll position
 */
sync.saveScrollInName = function () {

    var $window = utils.getWindow();
    var saved   = {};

    /**
     * Register the save event for whenever we call
     * a hard reload
     */
    emitter.on("browser:hardReload", function () {
        $window.name = $window.name + "bs=" + JSON.stringify({
            bs: {
                hardReload: true,
                scroll:     utils.getBrowserScrollPosition()
            }
        });
    });

    /**
     * window.name is always a string, even when never set.
     */
    try {
        var json = $window.name.match(/bs=(.+)$/);
        if (json) {
            saved = JSON.parse(json[1]);
        }
    } catch (e) {
        saved = {};
    }

    /**
     * if the JSON was parsed correctly, try to
     * find a scroll property and restore it.
     */
    if (saved.bs && saved.bs.hardReload && saved.bs.scroll) {
        utils.setScroll(saved.bs.scroll);
    }

    $window.name = "";
};

/**
 * Use a cookie-drop to save scroll position of
 * @param $window
 * @param $document
 */
sync.saveScrollInCookie = function ($window, $document) {

    if (!utils.isOldIe()) {
        return;
    }

    if ($document.readyState === "complete") {
        utils.restoreScrollPosition();
    } else {
        events.manager.addEvent($document, "readystatechange", function() {
            if ($document.readyState === "complete") {
                utils.restoreScrollPosition();
            }
        });
    }

    emitter.on("browser:hardReload", utils.saveScrollPosition);
};

/**
 * @param elem
 * @param attr
 * @param options
 * @returns {{elem: HTMLElement, timeStamp: number}}
 */
sync.swapFile = function (elem, attr, options) {

    var currentValue = elem[attr];
    var timeStamp = new Date().getTime();
    var suffix = "?rel=" + timeStamp;

    var justUrl = sync.getFilenameOnly(currentValue);

    if (justUrl) {
        currentValue = justUrl[0];
    }

    if (options) {
        if (!options.timestamps) {
            suffix = "";
        }
    }

    elem[attr] = currentValue + suffix;

    var body = document.body;

    setTimeout(function () {
        if (!hiddenElem) {
            hiddenElem = document.createElement("DIV");
            body.appendChild(hiddenElem);
        } else {
            hiddenElem.style.display = "none";
            hiddenElem.style.display = "block";
        }
    }, 200);

    return {
        elem: elem,
        timeStamp: timeStamp
    };
};

sync.getFilenameOnly = function (url) {
    return /^[^\?]+(?=\?)/.exec(url);
};

/**
 * @param {BrowserSync} bs
 * @returns {*}
 */
sync.reload = function (bs) {

    /**
     * @param data - from socket
     */
    return function (data) {

        if (!bs.canSync({url: current()}, OPT_PATH)) {
            return;
        }
        var transformedElem;
        var options    = bs.options;
        var emitter = bs.emitter;

        if (data.url || !options.injectChanges) {
            sync.reloadBrowser(true);
        }

        if (data.basename && data.ext) {

            var domData = sync.getElems(data.ext);
            var elems   = sync.getMatches(domData.elems, data.basename, domData.attr);

            if (elems.length && options.notify) {
                emitter.emit("notify", {message: "Injected: " + data.basename});
            }

            for (var i = 0, n = elems.length; i < n; i += 1) {
                transformedElem = sync.swapFile(elems[i], domData.attr, options);
            }
        }

        return transformedElem;
    };
};

/**
 * @param fileExtension
 * @returns {*}
 */
sync.getTagName = function (fileExtension) {
    return options.tagNames[fileExtension];
};

/**
 * @param tagName
 * @returns {*}
 */
sync.getAttr = function (tagName) {
    return options.attrs[tagName];
};

/**
 * @param elems
 * @param url
 * @param attr
 * @returns {Array}
 */
sync.getMatches = function (elems, url, attr) {

    if (url[0] === "*") {
        return elems;
    }

    var matches = [];

    for (var i = 0, len = elems.length; i < len; i += 1) {
        if (elems[i][attr].indexOf(url) !== -1) {
            matches.push(elems[i]);
        }
    }

    return matches;
};

/**
 * @param fileExtension
 * @returns {{elems: NodeList, attr: *}}
 */
sync.getElems = function(fileExtension) {

    var tagName = sync.getTagName(fileExtension);
    var attr    = sync.getAttr(tagName);

    return {
        elems: document.getElementsByTagName(tagName),
        attr: attr
    };
};

/**
 * @param confirm
 */
sync.reloadBrowser = function (confirm) {
    emitter.emit("browser:hardReload");
    if (confirm) {
        utils.reloadBrowser();
    }
};
},{"./browser.utils":3,"./emitter":6,"./events":7}],6:[function(require,module,exports){
"use strict";

exports.events = {};

/**
 * @param name
 * @param data
 */
exports.emit = function (name, data) {
    var event = exports.events[name];
    var listeners;
    if (event && event.listeners) {
        listeners = event.listeners;
        for (var i = 0, n = listeners.length; i < n; i += 1) {
            listeners[i](data);
        }
    }
};

/**
 * @param name
 * @param func
 */
exports.on = function (name, func) {
    var events = exports.events;
    if (!events[name]) {
        events[name] = {
            listeners: [func]
        };
    } else {
        events[name].listeners.push(func);
    }
};
},{}],7:[function(require,module,exports){
exports._ElementCache = function () {

    var cache = {},
        guidCounter = 1,
        expando = "data" + (new Date).getTime();

    this.getData = function (elem) {
        var guid = elem[expando];
        if (!guid) {
            guid = elem[expando] = guidCounter++;
            cache[guid] = {};
        }
        return cache[guid];
    };

    this.removeData = function (elem) {
        var guid = elem[expando];
        if (!guid) return;
        delete cache[guid];
        try {
            delete elem[expando];
        }
        catch (e) {
            if (elem.removeAttribute) {
                elem.removeAttribute(expando);
            }
        }
    };
};

/**
 * Fix an event
 * @param event
 * @returns {*}
 */
exports._fixEvent = function (event) {

    function returnTrue() {
        return true;
    }

    function returnFalse() {
        return false;
    }

    if (!event || !event.stopPropagation) {
        var old = event || window.event;

        // Clone the old object so that we can modify the values
        event = {};

        for (var prop in old) {
            event[prop] = old[prop];
        }

        // The event occurred on this element
        if (!event.target) {
            event.target = event.srcElement || document;
        }

        // Handle which other element the event is related to
        event.relatedTarget = event.fromElement === event.target ?
            event.toElement :
            event.fromElement;

        // Stop the default browser action
        event.preventDefault = function () {
            event.returnValue = false;
            event.isDefaultPrevented = returnTrue;
        };

        event.isDefaultPrevented = returnFalse;

        // Stop the event from bubbling
        event.stopPropagation = function () {
            event.cancelBubble = true;
            event.isPropagationStopped = returnTrue;
        };

        event.isPropagationStopped = returnFalse;

        // Stop the event from bubbling and executing other handlers
        event.stopImmediatePropagation = function () {
            this.isImmediatePropagationStopped = returnTrue;
            this.stopPropagation();
        };

        event.isImmediatePropagationStopped = returnFalse;

        // Handle mouse position
        if (event.clientX != null) {
            var doc = document.documentElement, body = document.body;

            event.pageX = event.clientX +
            (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
            (doc && doc.clientLeft || body && body.clientLeft || 0);
            event.pageY = event.clientY +
            (doc && doc.scrollTop || body && body.scrollTop || 0) -
            (doc && doc.clientTop || body && body.clientTop || 0);
        }

        // Handle key presses
        event.which = event.charCode || event.keyCode;

        // Fix button for mouse clicks:
        // 0 == left; 1 == middle; 2 == right
        if (event.button != null) {
            event.button = (event.button & 1 ? 0 :
                (event.button & 4 ? 1 :
                    (event.button & 2 ? 2 : 0)));
        }
    }

    return event;
};

/**
 * @constructor
 */
exports._EventManager = function (cache) {

    var nextGuid = 1;

    this.addEvent = function (elem, type, fn) {

        var data = cache.getData(elem);

        if (!data.handlers) data.handlers = {};

        if (!data.handlers[type])
            data.handlers[type] = [];

        if (!fn.guid) fn.guid = nextGuid++;

        data.handlers[type].push(fn);

        if (!data.dispatcher) {
            data.disabled = false;
            data.dispatcher = function (event) {

                if (data.disabled) return;
                event = exports._fixEvent(event);

                var handlers = data.handlers[event.type];
                if (handlers) {
                    for (var n = 0; n < handlers.length; n++) {
                        handlers[n].call(elem, event);
                    }
                }
            };
        }

        if (data.handlers[type].length == 1) {
            if (document.addEventListener) {
                elem.addEventListener(type, data.dispatcher, false);
            }
            else if (document.attachEvent) {
                elem.attachEvent("on" + type, data.dispatcher);
            }
        }

    };

    function tidyUp(elem, type) {

        function isEmpty(object) {
            for (var prop in object) {
                return false;
            }
            return true;
        }

        var data = cache.getData(elem);

        if (data.handlers[type].length === 0) {

            delete data.handlers[type];

            if (document.removeEventListener) {
                elem.removeEventListener(type, data.dispatcher, false);
            }
            else if (document.detachEvent) {
                elem.detachEvent("on" + type, data.dispatcher);
            }
        }

        if (isEmpty(data.handlers)) {
            delete data.handlers;
            delete data.dispatcher;
        }

        if (isEmpty(data)) {
            cache.removeData(elem);
        }
    }

    this.removeEvent = function (elem, type, fn) {

        var data = cache.getData(elem);

        if (!data.handlers) return;

        var removeType = function (t) {
            data.handlers[t] = [];
            tidyUp(elem, t);
        };

        if (!type) {
            for (var t in data.handlers) removeType(t);
            return;
        }

        var handlers = data.handlers[type];
        if (!handlers) return;

        if (!fn) {
            removeType(type);
            return;
        }

        if (fn.guid) {
            for (var n = 0; n < handlers.length; n++) {
                if (handlers[n].guid === fn.guid) {
                    handlers.splice(n--, 1);
                }
            }
        }
        tidyUp(elem, type);

    };

    this.proxy = function (context, fn) {
        if (!fn.guid) {
            fn.guid = nextGuid++;
        }
        var ret = function () {
            return fn.apply(context, arguments);
        };
        ret.guid = fn.guid;
        return ret;
    };
};



/**
 * Trigger a click on an element
 * @param elem
 */
exports.triggerClick = function (elem) {

    var evObj;

    if (document.createEvent) {
        window.setTimeout(function () {
            evObj = document.createEvent("MouseEvents");
            evObj.initEvent("click", true, true);
            elem.dispatchEvent(evObj);
        }, 0);
    } else {
        window.setTimeout(function () {
            if (document.createEventObject) {
                evObj = document.createEventObject();
                evObj.cancelBubble = true;
                elem.fireEvent("on" + "click", evObj);
            }
        }, 0);
    }
};

var cache = new exports._ElementCache();
var eventManager = new exports._EventManager(cache);

eventManager.triggerClick = exports.triggerClick;

exports.manager = eventManager;




},{}],8:[function(require,module,exports){
"use strict";

/**
 * This is the plugin for syncing clicks between browsers
 * @type {string}
 */
var EVENT_NAME  = "click";
var OPT_PATH    = "ghostMode.clicks";
exports.canEmitEvents = true;

/**
 * @param {BrowserSync} bs
 * @param eventManager
 */
exports.init = function (bs, eventManager) {
    eventManager.addEvent(document.body, EVENT_NAME, exports.browserEvent(bs));
    bs.socket.on(EVENT_NAME, exports.socketEvent(bs, eventManager));
};

/**
 * Uses event delegation to determine the clicked element
 * @param {BrowserSync} bs
 * @returns {Function}
 */
exports.browserEvent = function (bs) {

    return function (event) {

        if (exports.canEmitEvents) {

            var elem = event.target || event.srcElement;

            if (elem.type === "checkbox" || elem.type === "radio") {
                bs.utils.forceChange(elem);
                return;
            }

            bs.socket.emit(EVENT_NAME, bs.utils.getElementData(elem));

        } else {
            exports.canEmitEvents = true;
        }
    };
};

/**
 * @param {BrowserSync} bs
 * @param {manager} eventManager
 * @returns {Function}
 */
exports.socketEvent = function (bs, eventManager) {

    return function (data) {

        if (!bs.canSync(data, OPT_PATH)) {
            return false;
        }

        var elem = bs.utils.getSingleElement(data.tagName, data.index);

        if (elem) {
            exports.canEmitEvents = false;
            eventManager.triggerClick(elem);
        }
    };
};
},{}],9:[function(require,module,exports){
"use strict";

/**
 * This is the plugin for syncing clicks between browsers
 * @type {string}
 */
var EVENT_NAME  = "input:text";
var OPT_PATH    = "ghostMode.forms.inputs";
exports.canEmitEvents = true;

/**
 * @param {BrowserSync} bs
 * @param eventManager
 */
exports.init = function (bs, eventManager) {
    eventManager.addEvent(document.body, "keyup", exports.browserEvent(bs));
    bs.socket.on(EVENT_NAME, exports.socketEvent(bs, eventManager));
};

/**
 * @param {BrowserSync} bs
 * @returns {Function}
 */
exports.browserEvent = function (bs) {

    return function (event) {

        var elem = event.target || event.srcElement;
        var data;

        if (exports.canEmitEvents) {

            if (elem.tagName === "INPUT" || elem.tagName === "TEXTAREA") {

                data = bs.utils.getElementData(elem);
                data.value = elem.value;

                bs.socket.emit(EVENT_NAME, data);
            }

        } else {
            exports.canEmitEvents = true;
        }
    };
};

/**
 * @param {BrowserSync} bs
 * @returns {Function}
 */
exports.socketEvent = function (bs) {

    return function (data) {

        if (!bs.canSync(data, OPT_PATH)) {
            return false;
        }

        var elem = bs.utils.getSingleElement(data.tagName, data.index);

        if (elem) {
            elem.value = data.value;
            return elem;
        }

        return false;
    };
};
},{}],10:[function(require,module,exports){
"use strict";

exports.plugins = {
    "inputs":  require("./ghostmode.forms.input"),
    "toggles": require("./ghostmode.forms.toggles"),
    "submit":  require("./ghostmode.forms.submit")
};

/**
 * Load plugins for enabled options
 * @param bs
 */
exports.init = function (bs, eventManager) {

    var checkOpt = true;
    var options = bs.options.ghostMode.forms;

    if (options === true) {
        checkOpt = false;
    }

    function init(name) {
        exports.plugins[name].init(bs, eventManager);
    }

    for (var name in exports.plugins) {
        if (!checkOpt) {
            init(name);
        } else {
            if (options[name]) {
                init(name);
            }
        }
    }
};
},{"./ghostmode.forms.input":9,"./ghostmode.forms.submit":11,"./ghostmode.forms.toggles":12}],11:[function(require,module,exports){
"use strict";

/**
 * This is the plugin for syncing clicks between browsers
 * @type {string}
 */
var EVENT_NAME  = "form:submit";
var OPT_PATH    = "ghostMode.forms.submit";
exports.canEmitEvents = true;

/**
 * @param {BrowserSync} bs
 * @param eventManager
 */
exports.init = function (bs, eventManager) {
    var browserEvent = exports.browserEvent(bs);
    eventManager.addEvent(document.body, "submit", browserEvent);
    eventManager.addEvent(document.body, "reset", browserEvent);
    bs.socket.on(EVENT_NAME, exports.socketEvent(bs, eventManager));
};

/**
 * @param {BrowserSync} bs
 * @returns {Function}
 */
exports.browserEvent = function (bs) {

    return function (event) {
        if (exports.canEmitEvents) {
            var elem = event.target || event.srcElement;
            var data = bs.utils.getElementData(elem);
            data.type = event.type;
            bs.socket.emit(EVENT_NAME, data);
        } else {
            exports.canEmitEvents = true;
        }
    };
};

/**
 * @param {BrowserSync} bs
 * @returns {Function}
 */
exports.socketEvent = function (bs) {

    return function (data) {

        if (!bs.canSync(data, OPT_PATH)) {
            return false;
        }

        var elem = bs.utils.getSingleElement(data.tagName, data.index);

        exports.canEmitEvents = false;

        if (elem && data.type === "submit") {
            elem.submit();
        }

        if (elem && data.type === "reset") {
            elem.reset();
        }
        return false;
    };
};
},{}],12:[function(require,module,exports){
"use strict";

/**
 * This is the plugin for syncing clicks between browsers
 * @type {string}
 */
var EVENT_NAME  = "input:toggles";
var OPT_PATH    = "ghostMode.forms.toggles";
exports.canEmitEvents = true;

/**
 * @param {BrowserSync} bs
 * @param eventManager
 */
exports.init = function (bs, eventManager) {
    var browserEvent = exports.browserEvent(bs);
    exports.addEvents(eventManager, browserEvent);
    bs.socket.on(EVENT_NAME, exports.socketEvent(bs, eventManager));
};

/**
 * @param eventManager
 * @param event
 */
exports.addEvents = function (eventManager, event) {

    var elems   = document.getElementsByTagName("select");
    var inputs  = document.getElementsByTagName("input");

    addEvents(elems);
    addEvents(inputs);

    function addEvents(domElems) {
        for (var i = 0, n = domElems.length; i < n; i += 1) {
            eventManager.addEvent(domElems[i], "change", event);
        }
    }
};

/**
 * @param {BrowserSync} bs
 * @returns {Function}
 */
exports.browserEvent = function (bs) {

    return function (event) {

        if (exports.canEmitEvents) {
            var elem = event.target || event.srcElement;
            var data;
            if (elem.type === "radio" || elem.type === "checkbox" || elem.tagName === "SELECT") {
                data = bs.utils.getElementData(elem);
                data.type    = elem.type;
                data.value   = elem.value;
                data.checked = elem.checked;
                bs.socket.emit(EVENT_NAME, data);
            }
        } else {
            exports.canEmitEvents = true;
        }

    };
};

/**
 * @param {BrowserSync} bs
 * @returns {Function}
 */
exports.socketEvent = function (bs) {

    return function (data) {

        if (!bs.canSync(data, OPT_PATH)) {
            return false;
        }

        exports.canEmitEvents = false;

        var elem = bs.utils.getSingleElement(data.tagName, data.index);

        if (elem) {
            if (data.type === "radio") {
                elem.checked = true;
            }
            if (data.type === "checkbox") {
                elem.checked = data.checked;
            }
            if (data.tagName === "SELECT") {
                elem.value = data.value;
            }
            return elem;
        }
        return false;
    };
};
},{}],13:[function(require,module,exports){
"use strict";

var eventManager = require("./events").manager;

exports.plugins = {
    "scroll":   require("./ghostmode.scroll"),
    "clicks":   require("./ghostmode.clicks"),
    "forms":    require("./ghostmode.forms"),
    "location": require("./ghostmode.location")
};

/**
 * Load plugins for enabled options
 * @param bs
 */
exports.init = function (bs) {
    for (var name in exports.plugins) {
        exports.plugins[name].init(bs, eventManager);
    }
};
},{"./events":7,"./ghostmode.clicks":8,"./ghostmode.forms":10,"./ghostmode.location":14,"./ghostmode.scroll":15}],14:[function(require,module,exports){
"use strict";

/**
 * This is the plugin for syncing location
 * @type {string}
 */
var EVENT_NAME = "browser:location";
var OPT_PATH   = "ghostMode.location";
exports.canEmitEvents = true;

/**
 * @param {BrowserSync} bs
 */
exports.init = function (bs) {
    bs.socket.on(EVENT_NAME, exports.socketEvent(bs));
};

/**
 * Respond to socket event
 */
exports.socketEvent = function (bs) {

    return function (data) {

        if (!bs.canSync(data, OPT_PATH)) {
            return false;
        }

        if (data.path) {
            exports.setPath(data.path);
        } else {
            exports.setUrl(data.url);
        }
    };
};

/**
 * @param url
 */
exports.setUrl = function (url) {
    window.location = url;
};

/**
 * @param path
 */
exports.setPath = function (path) {
    window.location = window.location.protocol + "//" + window.location.host + path;
};
},{}],15:[function(require,module,exports){
"use strict";

/**
 * This is the plugin for syncing scroll between devices
 * @type {string}
 */
var EVENT_NAME = "scroll";
var OPT_PATH   = "ghostMode.scroll";
var utils;

exports.canEmitEvents = true;

/**
 * @param {BrowserSync} bs
 * @param eventManager
 */
exports.init = function (bs, eventManager) {
    utils = bs.utils;
    eventManager.addEvent(window, EVENT_NAME, exports.browserEvent(bs));
    bs.socket.on(EVENT_NAME, exports.socketEvent(bs));
};

/**
 * @param {BrowserSync} bs
 */
exports.socketEvent = function (bs) {

    return function (data) {

        if (!bs.canSync(data, OPT_PATH)) {
            return false;
        }

        var scrollSpace = utils.getScrollSpace();

        exports.canEmitEvents = false;

        if (bs.options && bs.options.scrollProportionally) {
            return window.scrollTo(0, scrollSpace.y * data.position.proportional); // % of y axis of scroll to px
        } else {
            return window.scrollTo(0, data.position.raw);
        }
    };
};

/**
 * @param bs
 */
exports.browserEvent = function (bs) {

    return function () {

        var canSync = exports.canEmitEvents;

        if (canSync) {
            bs.socket.emit(EVENT_NAME, {
                position: exports.getScrollPosition()
            });
        }

        exports.canEmitEvents = true;
    };
};


/**
 * @returns {{raw: number, proportional: number}}
 */
exports.getScrollPosition = function () {
    var pos = utils.getBrowserScrollPosition();
    return {
        raw: pos, // Get px of y axis of scroll
        proportional: exports.getScrollTopPercentage(pos) // Get % of y axis of scroll
    };
};

/**
 * @param {{x: number, y: number}} scrollSpace
 * @param scrollPosition
 * @returns {{x: number, y: number}}
 */
exports.getScrollPercentage = function (scrollSpace, scrollPosition) {

    var x = scrollPosition.x / scrollSpace.x;
    var y = scrollPosition.y / scrollSpace.y;

    return {
        x: x || 0,
        y: y
    };
};

/**
 * Get just the percentage of Y axis of scroll
 * @returns {number}
 */
exports.getScrollTopPercentage = function (pos) {
    var scrollSpace = utils.getScrollSpace();
    var percentage  = exports.getScrollPercentage(scrollSpace, pos);
    return percentage.y;
};
},{}],16:[function(require,module,exports){
"use strict";

var scroll = require("./ghostmode.scroll");

var styles = [
    "display: none",
    "padding: 15px",
    "font-family: sans-serif",
    "position: fixed",
    "font-size: 0.9em",
    "z-index: 9999",
    "right: 0px",
    "top: 0px",
    "border-bottom-left-radius: 5px",
    "background-color: #1B2032",
    "margin: 0",
    "color: white",
    "text-align: center"

];

var browserSync;
var elem;
var options;
var timeoutInt;

/**
 * @param {BrowserSync} bs
 * @returns {*}
 */
exports.init = function (bs) {

    browserSync = bs;
    options = bs.options;

    var cssStyles = styles;

    if (options.notify.styles) {
        cssStyles = options.notify.styles;
    }

    elem = document.createElement("DIV");
    elem.id = "__bs_notify__";
    elem.style.cssText = cssStyles.join(";");
    document.getElementsByTagName("body")[0].appendChild(elem);

    var flashFn = exports.watchEvent();

    browserSync.emitter.on("notify", flashFn);
    browserSync.socket.on("browser:notify", flashFn);

    return elem;
};

/**
 * @returns {Function}
 */
exports.watchEvent = function () {
    return function (data) {
        if (typeof data === "string") {
            return exports.flash(data);
        }
        exports.flash(data.message, data.timeout);
    };
};

/**
 *
 */
exports.getElem = function () {
    return elem;
};

/**
 * @returns {number|*}
 */
exports.getScrollTop = function () {
    return browserSync.utils.getBrowserScrollPosition().y;
};

/**
 * @param message
 * @param [timeout]
 * @returns {*}
 */
exports.flash = function (message, timeout) {

    var elem = exports.getElem();

    // return if notify was never initialised
    if (!elem) {
        return false;
    }

    elem.innerHTML = message;
    elem.style.display = "block";

    if (timeoutInt) {
        clearTimeout(timeoutInt);
        timeoutInt = undefined;
    }

    timeoutInt = window.setTimeout(function () {
        elem.style.display = "none";
    }, timeout || 2000);

    return elem;
};
},{"./ghostmode.scroll":15}],17:[function(require,module,exports){
"use strict";

/**
 * @type {{emit: emit, on: on}}
 */
var BS = window.___browserSync___ || {};
exports.socket = BS.socket || {
    emit: function(){},
    on: function(){}
};


/**
 * @returns {string}
 */
exports.getPath = function () {
    return window.location.pathname;
};
/**
 * Alias for socket.emit
 * @param name
 * @param data
 */
exports.emit = function (name, data) {
    var socket = exports.socket;
    if (socket && socket.emit) {
        // send relative path of where the event is sent
        data.url = exports.getPath();
        socket.emit(name, data);
    }
};

/**
 * Alias for socket.on
 * @param name
 * @param func
 */
exports.on = function (name, func) {
    exports.socket.on(name, func);
};
},{}]},{},[1]);
