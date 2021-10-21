"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/**
* jquery-match-height 0.7.2 by @liabru
* http://brm.io/jquery-match-height/
* License: MIT
*/
;

(function (factory) {
  // eslint-disable-line no-extra-semi
  'use strict';

  if (typeof define === 'function' && define.amd) {
    // AMD
    define(['jquery'], factory);
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS
    module.exports = factory(require('jquery'));
  } else {
    // Global
    factory(jQuery);
  }
})(function ($) {
  /*
  *  internal
  */
  var _previousResizeWidth = -1,
      _updateTimeout = -1;
  /*
  *  _parse
  *  value parse utility function
  */


  var _parse = function _parse(value) {
    // parse value and convert NaN to 0
    return parseFloat(value) || 0;
  };
  /*
  *  _rows
  *  utility function returns array of jQuery selections representing each row
  *  (as displayed after float wrapping applied by browser)
  */


  var _rows = function _rows(elements) {
    var tolerance = 1,
        $elements = $(elements),
        lastTop = null,
        rows = []; // group elements by their top position

    $elements.each(function () {
      var $that = $(this),
          top = $that.offset().top - _parse($that.css('margin-top')),
          lastRow = rows.length > 0 ? rows[rows.length - 1] : null;

      if (lastRow === null) {
        // first item on the row, so just push it
        rows.push($that);
      } else {
        // if the row top is the same, add to the row group
        if (Math.floor(Math.abs(lastTop - top)) <= tolerance) {
          rows[rows.length - 1] = lastRow.add($that);
        } else {
          // otherwise start a new row group
          rows.push($that);
        }
      } // keep track of the last row top


      lastTop = top;
    });
    return rows;
  };
  /*
  *  _parseOptions
  *  handle plugin options
  */


  var _parseOptions = function _parseOptions(options) {
    var opts = {
      byRow: true,
      property: 'height',
      target: null,
      remove: false
    };

    if (_typeof(options) === 'object') {
      return $.extend(opts, options);
    }

    if (typeof options === 'boolean') {
      opts.byRow = options;
    } else if (options === 'remove') {
      opts.remove = true;
    }

    return opts;
  };
  /*
  *  matchHeight
  *  plugin definition
  */


  var matchHeight = $.fn.matchHeight = function (options) {
    var opts = _parseOptions(options); // handle remove


    if (opts.remove) {
      var that = this; // remove fixed height from all selected elements

      this.css(opts.property, ''); // remove selected elements from all groups

      $.each(matchHeight._groups, function (key, group) {
        group.elements = group.elements.not(that);
      }); // TODO: cleanup empty groups

      return this;
    }

    if (this.length <= 1 && !opts.target) {
      return this;
    } // keep track of this group so we can re-apply later on load and resize events


    matchHeight._groups.push({
      elements: this,
      options: opts
    }); // match each element's height to the tallest element in the selection


    matchHeight._apply(this, opts);

    return this;
  };
  /*
  *  plugin global options
  */


  matchHeight.version = '0.7.2';
  matchHeight._groups = [];
  matchHeight._throttle = 80;
  matchHeight._maintainScroll = false;
  matchHeight._beforeUpdate = null;
  matchHeight._afterUpdate = null;
  matchHeight._rows = _rows;
  matchHeight._parse = _parse;
  matchHeight._parseOptions = _parseOptions;
  /*
  *  matchHeight._apply
  *  apply matchHeight to given elements
  */

  matchHeight._apply = function (elements, options) {
    var opts = _parseOptions(options),
        $elements = $(elements),
        rows = [$elements]; // take note of scroll position


    var scrollTop = $(window).scrollTop(),
        htmlHeight = $('html').outerHeight(true); // get hidden parents

    var $hiddenParents = $elements.parents().filter(':hidden'); // cache the original inline style

    $hiddenParents.each(function () {
      var $that = $(this);
      $that.data('style-cache', $that.attr('style'));
    }); // temporarily must force hidden parents visible

    $hiddenParents.css('display', 'block'); // get rows if using byRow, otherwise assume one row

    if (opts.byRow && !opts.target) {
      // must first force an arbitrary equal height so floating elements break evenly
      $elements.each(function () {
        var $that = $(this),
            display = $that.css('display'); // temporarily force a usable display value

        if (display !== 'inline-block' && display !== 'flex' && display !== 'inline-flex') {
          display = 'block';
        } // cache the original inline style


        $that.data('style-cache', $that.attr('style'));
        $that.css({
          'display': display,
          'padding-top': '0',
          'padding-bottom': '0',
          'margin-top': '0',
          'margin-bottom': '0',
          'border-top-width': '0',
          'border-bottom-width': '0',
          'height': '100px',
          'overflow': 'hidden'
        });
      }); // get the array of rows (based on element top position)

      rows = _rows($elements); // revert original inline styles

      $elements.each(function () {
        var $that = $(this);
        $that.attr('style', $that.data('style-cache') || '');
      });
    }

    $.each(rows, function (key, row) {
      var $row = $(row),
          targetHeight = 0;

      if (!opts.target) {
        // skip apply to rows with only one item
        if (opts.byRow && $row.length <= 1) {
          $row.css(opts.property, '');
          return;
        } // iterate the row and find the max height


        $row.each(function () {
          var $that = $(this),
              style = $that.attr('style'),
              display = $that.css('display'); // temporarily force a usable display value

          if (display !== 'inline-block' && display !== 'flex' && display !== 'inline-flex') {
            display = 'block';
          } // ensure we get the correct actual height (and not a previously set height value)


          var css = {
            'display': display
          };
          css[opts.property] = '';
          $that.css(css); // find the max height (including padding, but not margin)

          if ($that.outerHeight(false) > targetHeight) {
            targetHeight = $that.outerHeight(false);
          } // revert styles


          if (style) {
            $that.attr('style', style);
          } else {
            $that.css('display', '');
          }
        });
      } else {
        // if target set, use the height of the target element
        targetHeight = opts.target.outerHeight(false);
      } // iterate the row and apply the height to all elements


      $row.each(function () {
        var $that = $(this),
            verticalPadding = 0; // don't apply to a target

        if (opts.target && $that.is(opts.target)) {
          return;
        } // handle padding and border correctly (required when not using border-box)


        if ($that.css('box-sizing') !== 'border-box') {
          verticalPadding += _parse($that.css('border-top-width')) + _parse($that.css('border-bottom-width'));
          verticalPadding += _parse($that.css('padding-top')) + _parse($that.css('padding-bottom'));
        } // set the height (accounting for padding and border)


        $that.css(opts.property, targetHeight - verticalPadding + 'px');
      });
    }); // revert hidden parents

    $hiddenParents.each(function () {
      var $that = $(this);
      $that.attr('style', $that.data('style-cache') || null);
    }); // restore scroll position if enabled

    if (matchHeight._maintainScroll) {
      $(window).scrollTop(scrollTop / htmlHeight * $('html').outerHeight(true));
    }

    return this;
  };
  /*
  *  matchHeight._applyDataApi
  *  applies matchHeight to all elements with a data-match-height attribute
  */


  matchHeight._applyDataApi = function () {
    var groups = {}; // generate groups by their groupId set by elements using data-match-height

    $('[data-match-height], [data-mh]').each(function () {
      var $this = $(this),
          groupId = $this.attr('data-mh') || $this.attr('data-match-height');

      if (groupId in groups) {
        groups[groupId] = groups[groupId].add($this);
      } else {
        groups[groupId] = $this;
      }
    }); // apply matchHeight to each group

    $.each(groups, function () {
      this.matchHeight(true);
    });
  };
  /*
  *  matchHeight._update
  *  updates matchHeight on all current groups with their correct options
  */


  var _update = function _update(event) {
    if (matchHeight._beforeUpdate) {
      matchHeight._beforeUpdate(event, matchHeight._groups);
    }

    $.each(matchHeight._groups, function () {
      matchHeight._apply(this.elements, this.options);
    });

    if (matchHeight._afterUpdate) {
      matchHeight._afterUpdate(event, matchHeight._groups);
    }
  };

  matchHeight._update = function (throttle, event) {
    // prevent update if fired from a resize event
    // where the viewport width hasn't actually changed
    // fixes an event looping bug in IE8
    if (event && event.type === 'resize') {
      var windowWidth = $(window).width();

      if (windowWidth === _previousResizeWidth) {
        return;
      }

      _previousResizeWidth = windowWidth;
    } // throttle updates


    if (!throttle) {
      _update(event);
    } else if (_updateTimeout === -1) {
      _updateTimeout = setTimeout(function () {
        _update(event);

        _updateTimeout = -1;
      }, matchHeight._throttle);
    }
  };
  /*
  *  bind events
  */
  // apply on DOM ready event


  $(matchHeight._applyDataApi); // use on or bind where supported

  var on = $.fn.on ? 'on' : 'bind'; // update heights on load and resize events

  $(window)[on]('load', function (event) {
    matchHeight._update(false, event);
  }); // throttled update heights on resize events

  $(window)[on]('resize orientationchange', function (event) {
    matchHeight._update(true, event);
  });
});;"use strict";

/*! matchMedia() polyfill - Test a CSS media type/query in JS. Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license */
window.matchMedia || (window.matchMedia = function () {
  "use strict"; // For browsers that support matchMedium api such as IE 9 and webkit

  var styleMedia = window.styleMedia || window.media; // For those that don't support matchMedium

  if (!styleMedia) {
    var style = document.createElement('style'),
        script = document.getElementsByTagName('script')[0],
        info = null;
    style.type = 'text/css';
    style.id = 'matchmediajs-test';
    script.parentNode.insertBefore(style, script); // 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers

    info = 'getComputedStyle' in window && window.getComputedStyle(style, null) || style.currentStyle;
    styleMedia = {
      matchMedium: function matchMedium(media) {
        var text = '@media ' + media + '{ #matchmediajs-test { width: 1px; } }'; // 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers

        if (style.styleSheet) {
          style.styleSheet.cssText = text;
        } else {
          style.textContent = text;
        } // Test if media query is true or false


        return info.width === '1px';
      }
    };
  }

  return function (media) {
    return {
      matches: styleMedia.matchMedium(media || 'all'),
      media: media || 'all'
    };
  };
}());;"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*!
 * Flickity PACKAGED v2.2.0
 * Touch, responsive, flickable carousels
 *
 * Licensed GPLv3 for open source use
 * or Flickity Commercial License for commercial use
 *
 * https://flickity.metafizzy.co
 * Copyright 2015-2018 Metafizzy
 */

/**
 * Bridget makes jQuery widgets
 * v2.0.1
 * MIT license
 */

/* jshint browser: true, strict: true, undef: true, unused: true */
(function (window, factory) {
  // universal module definition

  /*jshint strict: false */

  /* globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('jquery-bridget/jquery-bridget', ['jquery'], function (jQuery) {
      return factory(window, jQuery);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('jquery'));
  } else {
    // browser global
    window.jQueryBridget = factory(window, window.jQuery);
  }
})(window, function factory(window, jQuery) {
  'use strict'; // ----- utils ----- //

  var arraySlice = Array.prototype.slice; // helper function for logging errors
  // $.error breaks jQuery chaining

  var console = window.console;
  var logError = typeof console == 'undefined' ? function () {} : function (message) {
    console.error(message);
  }; // ----- jQueryBridget ----- //

  function jQueryBridget(namespace, PluginClass, $) {
    $ = $ || jQuery || window.jQuery;

    if (!$) {
      return;
    } // add option method -> $().plugin('option', {...})


    if (!PluginClass.prototype.option) {
      // option setter
      PluginClass.prototype.option = function (opts) {
        // bail out if not an object
        if (!$.isPlainObject(opts)) {
          return;
        }

        this.options = $.extend(true, this.options, opts);
      };
    } // make jQuery plugin


    $.fn[namespace] = function (arg0
    /*, arg1 */
    ) {
      if (typeof arg0 == 'string') {
        // method call $().plugin( 'methodName', { options } )
        // shift arguments by 1
        var args = arraySlice.call(arguments, 1);
        return methodCall(this, arg0, args);
      } // just $().plugin({ options })


      plainCall(this, arg0);
      return this;
    }; // $().plugin('methodName')


    function methodCall($elems, methodName, args) {
      var returnValue;
      var pluginMethodStr = '$().' + namespace + '("' + methodName + '")';
      $elems.each(function (i, elem) {
        // get instance
        var instance = $.data(elem, namespace);

        if (!instance) {
          logError(namespace + ' not initialized. Cannot call methods, i.e. ' + pluginMethodStr);
          return;
        }

        var method = instance[methodName];

        if (!method || methodName.charAt(0) == '_') {
          logError(pluginMethodStr + ' is not a valid method');
          return;
        } // apply method, get return value


        var value = method.apply(instance, args); // set return value if value is returned, use only first value

        returnValue = returnValue === undefined ? value : returnValue;
      });
      return returnValue !== undefined ? returnValue : $elems;
    }

    function plainCall($elems, options) {
      $elems.each(function (i, elem) {
        var instance = $.data(elem, namespace);

        if (instance) {
          // set options & init
          instance.option(options);

          instance._init();
        } else {
          // initialize new instance
          instance = new PluginClass(elem, options);
          $.data(elem, namespace, instance);
        }
      });
    }

    updateJQuery($);
  } // ----- updateJQuery ----- //
  // set $.bridget for v1 backwards compatibility


  function updateJQuery($) {
    if (!$ || $ && $.bridget) {
      return;
    }

    $.bridget = jQueryBridget;
  }

  updateJQuery(jQuery || window.jQuery); // -----  ----- //

  return jQueryBridget;
});
/**
 * EvEmitter v1.1.0
 * Lil' event emitter
 * MIT License
 */

/* jshint unused: true, undef: true, strict: true */


(function (global, factory) {
  // universal module definition

  /* jshint strict: false */

  /* globals define, module, window */
  if (typeof define == 'function' && define.amd) {
    // AMD - RequireJS
    define('ev-emitter/ev-emitter', factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS - Browserify, Webpack
    module.exports = factory();
  } else {
    // Browser globals
    global.EvEmitter = factory();
  }
})(typeof window != 'undefined' ? window : void 0, function () {
  function EvEmitter() {}

  var proto = EvEmitter.prototype;

  proto.on = function (eventName, listener) {
    if (!eventName || !listener) {
      return;
    } // set events hash


    var events = this._events = this._events || {}; // set listeners array

    var listeners = events[eventName] = events[eventName] || []; // only add once

    if (listeners.indexOf(listener) == -1) {
      listeners.push(listener);
    }

    return this;
  };

  proto.once = function (eventName, listener) {
    if (!eventName || !listener) {
      return;
    } // add event


    this.on(eventName, listener); // set once flag
    // set onceEvents hash

    var onceEvents = this._onceEvents = this._onceEvents || {}; // set onceListeners object

    var onceListeners = onceEvents[eventName] = onceEvents[eventName] || {}; // set flag

    onceListeners[listener] = true;
    return this;
  };

  proto.off = function (eventName, listener) {
    var listeners = this._events && this._events[eventName];

    if (!listeners || !listeners.length) {
      return;
    }

    var index = listeners.indexOf(listener);

    if (index != -1) {
      listeners.splice(index, 1);
    }

    return this;
  };

  proto.emitEvent = function (eventName, args) {
    var listeners = this._events && this._events[eventName];

    if (!listeners || !listeners.length) {
      return;
    } // copy over to avoid interference if .off() in listener


    listeners = listeners.slice(0);
    args = args || []; // once stuff

    var onceListeners = this._onceEvents && this._onceEvents[eventName];

    for (var i = 0; i < listeners.length; i++) {
      var listener = listeners[i];
      var isOnce = onceListeners && onceListeners[listener];

      if (isOnce) {
        // remove listener
        // remove before trigger to prevent recursion
        this.off(eventName, listener); // unset once flag

        delete onceListeners[listener];
      } // trigger listener


      listener.apply(this, args);
    }

    return this;
  };

  proto.allOff = function () {
    delete this._events;
    delete this._onceEvents;
  };

  return EvEmitter;
});
/*!
 * getSize v2.0.3
 * measure size of elements
 * MIT license
 */

/* jshint browser: true, strict: true, undef: true, unused: true */

/* globals console: false */


(function (window, factory) {
  /* jshint strict: false */

  /* globals define, module */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('get-size/get-size', factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // browser global
    window.getSize = factory();
  }
})(window, function factory() {
  'use strict'; // -------------------------- helpers -------------------------- //
  // get a number from a string, not a percentage

  function getStyleSize(value) {
    var num = parseFloat(value); // not a percent like '100%', and a number

    var isValid = value.indexOf('%') == -1 && !isNaN(num);
    return isValid && num;
  }

  function noop() {}

  var logError = typeof console == 'undefined' ? noop : function (message) {
    console.error(message);
  }; // -------------------------- measurements -------------------------- //

  var measurements = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom', 'borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth'];
  var measurementsLength = measurements.length;

  function getZeroSize() {
    var size = {
      width: 0,
      height: 0,
      innerWidth: 0,
      innerHeight: 0,
      outerWidth: 0,
      outerHeight: 0
    };

    for (var i = 0; i < measurementsLength; i++) {
      var measurement = measurements[i];
      size[measurement] = 0;
    }

    return size;
  } // -------------------------- getStyle -------------------------- //

  /**
   * getStyle, get style of element, check for Firefox bug
   * https://bugzilla.mozilla.org/show_bug.cgi?id=548397
   */


  function getStyle(elem) {
    var style = getComputedStyle(elem);

    if (!style) {
      logError('Style returned ' + style + '. Are you running this code in a hidden iframe on Firefox? ' + 'See https://bit.ly/getsizebug1');
    }

    return style;
  } // -------------------------- setup -------------------------- //


  var isSetup = false;
  var isBoxSizeOuter;
  /**
   * setup
   * check isBoxSizerOuter
   * do on first getSize() rather than on page load for Firefox bug
   */

  function setup() {
    // setup once
    if (isSetup) {
      return;
    }

    isSetup = true; // -------------------------- box sizing -------------------------- //

    /**
     * Chrome & Safari measure the outer-width on style.width on border-box elems
     * IE11 & Firefox<29 measures the inner-width
     */

    var div = document.createElement('div');
    div.style.width = '200px';
    div.style.padding = '1px 2px 3px 4px';
    div.style.borderStyle = 'solid';
    div.style.borderWidth = '1px 2px 3px 4px';
    div.style.boxSizing = 'border-box';
    var body = document.body || document.documentElement;
    body.appendChild(div);
    var style = getStyle(div); // round value for browser zoom. desandro/masonry#928

    isBoxSizeOuter = Math.round(getStyleSize(style.width)) == 200;
    getSize.isBoxSizeOuter = isBoxSizeOuter;
    body.removeChild(div);
  } // -------------------------- getSize -------------------------- //


  function getSize(elem) {
    setup(); // use querySeletor if elem is string

    if (typeof elem == 'string') {
      elem = document.querySelector(elem);
    } // do not proceed on non-objects


    if (!elem || _typeof(elem) != 'object' || !elem.nodeType) {
      return;
    }

    var style = getStyle(elem); // if hidden, everything is 0

    if (style.display == 'none') {
      return getZeroSize();
    }

    var size = {};
    size.width = elem.offsetWidth;
    size.height = elem.offsetHeight;
    var isBorderBox = size.isBorderBox = style.boxSizing == 'border-box'; // get all measurements

    for (var i = 0; i < measurementsLength; i++) {
      var measurement = measurements[i];
      var value = style[measurement];
      var num = parseFloat(value); // any 'auto', 'medium' value will be 0

      size[measurement] = !isNaN(num) ? num : 0;
    }

    var paddingWidth = size.paddingLeft + size.paddingRight;
    var paddingHeight = size.paddingTop + size.paddingBottom;
    var marginWidth = size.marginLeft + size.marginRight;
    var marginHeight = size.marginTop + size.marginBottom;
    var borderWidth = size.borderLeftWidth + size.borderRightWidth;
    var borderHeight = size.borderTopWidth + size.borderBottomWidth;
    var isBorderBoxSizeOuter = isBorderBox && isBoxSizeOuter; // overwrite width and height if we can get it from style

    var styleWidth = getStyleSize(style.width);

    if (styleWidth !== false) {
      size.width = styleWidth + ( // add padding and border unless it's already including it
      isBorderBoxSizeOuter ? 0 : paddingWidth + borderWidth);
    }

    var styleHeight = getStyleSize(style.height);

    if (styleHeight !== false) {
      size.height = styleHeight + ( // add padding and border unless it's already including it
      isBorderBoxSizeOuter ? 0 : paddingHeight + borderHeight);
    }

    size.innerWidth = size.width - (paddingWidth + borderWidth);
    size.innerHeight = size.height - (paddingHeight + borderHeight);
    size.outerWidth = size.width + marginWidth;
    size.outerHeight = size.height + marginHeight;
    return size;
  }

  return getSize;
});
/**
 * matchesSelector v2.0.2
 * matchesSelector( element, '.selector' )
 * MIT license
 */

/*jshint browser: true, strict: true, undef: true, unused: true */


(function (window, factory) {
  /*global define: false, module: false */
  'use strict'; // universal module definition

  if (typeof define == 'function' && define.amd) {
    // AMD
    define('desandro-matches-selector/matches-selector', factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // browser global
    window.matchesSelector = factory();
  }
})(window, function factory() {
  'use strict';

  var matchesMethod = function () {
    var ElemProto = window.Element.prototype; // check for the standard method name first

    if (ElemProto.matches) {
      return 'matches';
    } // check un-prefixed


    if (ElemProto.matchesSelector) {
      return 'matchesSelector';
    } // check vendor prefixes


    var prefixes = ['webkit', 'moz', 'ms', 'o'];

    for (var i = 0; i < prefixes.length; i++) {
      var prefix = prefixes[i];
      var method = prefix + 'MatchesSelector';

      if (ElemProto[method]) {
        return method;
      }
    }
  }();

  return function matchesSelector(elem, selector) {
    return elem[matchesMethod](selector);
  };
});
/**
 * Fizzy UI utils v2.0.7
 * MIT license
 */

/*jshint browser: true, undef: true, unused: true, strict: true */


(function (window, factory) {
  // universal module definition

  /*jshint strict: false */

  /*globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('fizzy-ui-utils/utils', ['desandro-matches-selector/matches-selector'], function (matchesSelector) {
      return factory(window, matchesSelector);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('desandro-matches-selector'));
  } else {
    // browser global
    window.fizzyUIUtils = factory(window, window.matchesSelector);
  }
})(window, function factory(window, matchesSelector) {
  var utils = {}; // ----- extend ----- //
  // extends objects

  utils.extend = function (a, b) {
    for (var prop in b) {
      a[prop] = b[prop];
    }

    return a;
  }; // ----- modulo ----- //


  utils.modulo = function (num, div) {
    return (num % div + div) % div;
  }; // ----- makeArray ----- //


  var arraySlice = Array.prototype.slice; // turn element or nodeList into an array

  utils.makeArray = function (obj) {
    if (Array.isArray(obj)) {
      // use object if already an array
      return obj;
    } // return empty array if undefined or null. #6


    if (obj === null || obj === undefined) {
      return [];
    }

    var isArrayLike = _typeof(obj) == 'object' && typeof obj.length == 'number';

    if (isArrayLike) {
      // convert nodeList to array
      return arraySlice.call(obj);
    } // array of single index


    return [obj];
  }; // ----- removeFrom ----- //


  utils.removeFrom = function (ary, obj) {
    var index = ary.indexOf(obj);

    if (index != -1) {
      ary.splice(index, 1);
    }
  }; // ----- getParent ----- //


  utils.getParent = function (elem, selector) {
    while (elem.parentNode && elem != document.body) {
      elem = elem.parentNode;

      if (matchesSelector(elem, selector)) {
        return elem;
      }
    }
  }; // ----- getQueryElement ----- //
  // use element as selector string


  utils.getQueryElement = function (elem) {
    if (typeof elem == 'string') {
      return document.querySelector(elem);
    }

    return elem;
  }; // ----- handleEvent ----- //
  // enable .ontype to trigger from .addEventListener( elem, 'type' )


  utils.handleEvent = function (event) {
    var method = 'on' + event.type;

    if (this[method]) {
      this[method](event);
    }
  }; // ----- filterFindElements ----- //


  utils.filterFindElements = function (elems, selector) {
    // make array of elems
    elems = utils.makeArray(elems);
    var ffElems = [];
    elems.forEach(function (elem) {
      // check that elem is an actual element
      if (!(elem instanceof HTMLElement)) {
        return;
      } // add elem if no selector


      if (!selector) {
        ffElems.push(elem);
        return;
      } // filter & find items if we have a selector
      // filter


      if (matchesSelector(elem, selector)) {
        ffElems.push(elem);
      } // find children


      var childElems = elem.querySelectorAll(selector); // concat childElems to filterFound array

      for (var i = 0; i < childElems.length; i++) {
        ffElems.push(childElems[i]);
      }
    });
    return ffElems;
  }; // ----- debounceMethod ----- //


  utils.debounceMethod = function (_class, methodName, threshold) {
    threshold = threshold || 100; // original method

    var method = _class.prototype[methodName];
    var timeoutName = methodName + 'Timeout';

    _class.prototype[methodName] = function () {
      var timeout = this[timeoutName];
      clearTimeout(timeout);
      var args = arguments;

      var _this = this;

      this[timeoutName] = setTimeout(function () {
        method.apply(_this, args);
        delete _this[timeoutName];
      }, threshold);
    };
  }; // ----- docReady ----- //


  utils.docReady = function (callback) {
    var readyState = document.readyState;

    if (readyState == 'complete' || readyState == 'interactive') {
      // do async to allow for other scripts to run. metafizzy/flickity#441
      setTimeout(callback);
    } else {
      document.addEventListener('DOMContentLoaded', callback);
    }
  }; // ----- htmlInit ----- //
  // http://jamesroberts.name/blog/2010/02/22/string-functions-for-javascript-trim-to-camel-case-to-dashed-and-to-underscore/


  utils.toDashed = function (str) {
    return str.replace(/(.)([A-Z])/g, function (match, $1, $2) {
      return $1 + '-' + $2;
    }).toLowerCase();
  };

  var console = window.console;
  /**
   * allow user to initialize classes via [data-namespace] or .js-namespace class
   * htmlInit( Widget, 'widgetName' )
   * options are parsed from data-namespace-options
   */

  utils.htmlInit = function (WidgetClass, namespace) {
    utils.docReady(function () {
      var dashedNamespace = utils.toDashed(namespace);
      var dataAttr = 'data-' + dashedNamespace;
      var dataAttrElems = document.querySelectorAll('[' + dataAttr + ']');
      var jsDashElems = document.querySelectorAll('.js-' + dashedNamespace);
      var elems = utils.makeArray(dataAttrElems).concat(utils.makeArray(jsDashElems));
      var dataOptionsAttr = dataAttr + '-options';
      var jQuery = window.jQuery;
      elems.forEach(function (elem) {
        var attr = elem.getAttribute(dataAttr) || elem.getAttribute(dataOptionsAttr);
        var options;

        try {
          options = attr && JSON.parse(attr);
        } catch (error) {
          // log error, do not initialize
          if (console) {
            console.error('Error parsing ' + dataAttr + ' on ' + elem.className + ': ' + error);
          }

          return;
        } // initialize


        var instance = new WidgetClass(elem, options); // make available via $().data('namespace')

        if (jQuery) {
          jQuery.data(elem, namespace, instance);
        }
      });
    });
  }; // -----  ----- //


  return utils;
}); // Flickity.Cell


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('flickity/js/cell', ['get-size/get-size'], function (getSize) {
      return factory(window, getSize);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('get-size'));
  } else {
    // browser global
    window.Flickity = window.Flickity || {};
    window.Flickity.Cell = factory(window, window.getSize);
  }
})(window, function factory(window, getSize) {
  function Cell(elem, parent) {
    this.element = elem;
    this.parent = parent;
    this.create();
  }

  var proto = Cell.prototype;

  proto.create = function () {
    this.element.style.position = 'absolute';
    this.element.setAttribute('aria-hidden', 'true');
    this.x = 0;
    this.shift = 0;
  };

  proto.destroy = function () {
    // reset style
    this.unselect();
    this.element.style.position = '';
    var side = this.parent.originSide;
    this.element.style[side] = '';
  };

  proto.getSize = function () {
    this.size = getSize(this.element);
  };

  proto.setPosition = function (x) {
    this.x = x;
    this.updateTarget();
    this.renderPosition(x);
  }; // setDefaultTarget v1 method, backwards compatibility, remove in v3


  proto.updateTarget = proto.setDefaultTarget = function () {
    var marginProperty = this.parent.originSide == 'left' ? 'marginLeft' : 'marginRight';
    this.target = this.x + this.size[marginProperty] + this.size.width * this.parent.cellAlign;
  };

  proto.renderPosition = function (x) {
    // render position of cell with in slider
    var side = this.parent.originSide;
    this.element.style[side] = this.parent.getPositionValue(x);
  };

  proto.select = function () {
    this.element.classList.add('is-selected');
    this.element.removeAttribute('aria-hidden');
  };

  proto.unselect = function () {
    this.element.classList.remove('is-selected');
    this.element.setAttribute('aria-hidden', 'true');
  };
  /**
   * @param {Integer} factor - 0, 1, or -1
  **/


  proto.wrapShift = function (shift) {
    this.shift = shift;
    this.renderPosition(this.x + this.parent.slideableWidth * shift);
  };

  proto.remove = function () {
    this.element.parentNode.removeChild(this.element);
  };

  return Cell;
}); // slide


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('flickity/js/slide', factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // browser global
    window.Flickity = window.Flickity || {};
    window.Flickity.Slide = factory();
  }
})(window, function factory() {
  'use strict';

  function Slide(parent) {
    this.parent = parent;
    this.isOriginLeft = parent.originSide == 'left';
    this.cells = [];
    this.outerWidth = 0;
    this.height = 0;
  }

  var proto = Slide.prototype;

  proto.addCell = function (cell) {
    this.cells.push(cell);
    this.outerWidth += cell.size.outerWidth;
    this.height = Math.max(cell.size.outerHeight, this.height); // first cell stuff

    if (this.cells.length == 1) {
      this.x = cell.x; // x comes from first cell

      var beginMargin = this.isOriginLeft ? 'marginLeft' : 'marginRight';
      this.firstMargin = cell.size[beginMargin];
    }
  };

  proto.updateTarget = function () {
    var endMargin = this.isOriginLeft ? 'marginRight' : 'marginLeft';
    var lastCell = this.getLastCell();
    var lastMargin = lastCell ? lastCell.size[endMargin] : 0;
    var slideWidth = this.outerWidth - (this.firstMargin + lastMargin);
    this.target = this.x + this.firstMargin + slideWidth * this.parent.cellAlign;
  };

  proto.getLastCell = function () {
    return this.cells[this.cells.length - 1];
  };

  proto.select = function () {
    this.cells.forEach(function (cell) {
      cell.select();
    });
  };

  proto.unselect = function () {
    this.cells.forEach(function (cell) {
      cell.unselect();
    });
  };

  proto.getCellElements = function () {
    return this.cells.map(function (cell) {
      return cell.element;
    });
  };

  return Slide;
}); // animate


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('flickity/js/animate', ['fizzy-ui-utils/utils'], function (utils) {
      return factory(window, utils);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('fizzy-ui-utils'));
  } else {
    // browser global
    window.Flickity = window.Flickity || {};
    window.Flickity.animatePrototype = factory(window, window.fizzyUIUtils);
  }
})(window, function factory(window, utils) {
  // -------------------------- animate -------------------------- //
  var proto = {};

  proto.startAnimation = function () {
    if (this.isAnimating) {
      return;
    }

    this.isAnimating = true;
    this.restingFrames = 0;
    this.animate();
  };

  proto.animate = function () {
    this.applyDragForce();
    this.applySelectedAttraction();
    var previousX = this.x;
    this.integratePhysics();
    this.positionSlider();
    this.settle(previousX); // animate next frame

    if (this.isAnimating) {
      var _this = this;

      requestAnimationFrame(function animateFrame() {
        _this.animate();
      });
    }
  };

  proto.positionSlider = function () {
    var x = this.x; // wrap position around

    if (this.options.wrapAround && this.cells.length > 1) {
      x = utils.modulo(x, this.slideableWidth);
      x = x - this.slideableWidth;
      this.shiftWrapCells(x);
    }

    this.setTranslateX(x, this.isAnimating);
    this.dispatchScrollEvent();
  };

  proto.setTranslateX = function (x, is3d) {
    x += this.cursorPosition; // reverse if right-to-left and using transform

    x = this.options.rightToLeft ? -x : x;
    var translateX = this.getPositionValue(x); // use 3D tranforms for hardware acceleration on iOS
    // but use 2D when settled, for better font-rendering

    this.slider.style.transform = is3d ? 'translate3d(' + translateX + ',0,0)' : 'translateX(' + translateX + ')';
  };

  proto.dispatchScrollEvent = function () {
    var firstSlide = this.slides[0];

    if (!firstSlide) {
      return;
    }

    var positionX = -this.x - firstSlide.target;
    var progress = positionX / this.slidesWidth;
    this.dispatchEvent('scroll', null, [progress, positionX]);
  };

  proto.positionSliderAtSelected = function () {
    if (!this.cells.length) {
      return;
    }

    this.x = -this.selectedSlide.target;
    this.velocity = 0; // stop wobble

    this.positionSlider();
  };

  proto.getPositionValue = function (position) {
    if (this.options.percentPosition) {
      // percent position, round to 2 digits, like 12.34%
      return Math.round(position / this.size.innerWidth * 10000) * 0.01 + '%';
    } else {
      // pixel positioning
      return Math.round(position) + 'px';
    }
  };

  proto.settle = function (previousX) {
    // keep track of frames where x hasn't moved
    if (!this.isPointerDown && Math.round(this.x * 100) == Math.round(previousX * 100)) {
      this.restingFrames++;
    } // stop animating if resting for 3 or more frames


    if (this.restingFrames > 2) {
      this.isAnimating = false;
      delete this.isFreeScrolling; // render position with translateX when settled

      this.positionSlider();
      this.dispatchEvent('settle', null, [this.selectedIndex]);
    }
  };

  proto.shiftWrapCells = function (x) {
    // shift before cells
    var beforeGap = this.cursorPosition + x;

    this._shiftCells(this.beforeShiftCells, beforeGap, -1); // shift after cells


    var afterGap = this.size.innerWidth - (x + this.slideableWidth + this.cursorPosition);

    this._shiftCells(this.afterShiftCells, afterGap, 1);
  };

  proto._shiftCells = function (cells, gap, shift) {
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var cellShift = gap > 0 ? shift : 0;
      cell.wrapShift(cellShift);
      gap -= cell.size.outerWidth;
    }
  };

  proto._unshiftCells = function (cells) {
    if (!cells || !cells.length) {
      return;
    }

    for (var i = 0; i < cells.length; i++) {
      cells[i].wrapShift(0);
    }
  }; // -------------------------- physics -------------------------- //


  proto.integratePhysics = function () {
    this.x += this.velocity;
    this.velocity *= this.getFrictionFactor();
  };

  proto.applyForce = function (force) {
    this.velocity += force;
  };

  proto.getFrictionFactor = function () {
    return 1 - this.options[this.isFreeScrolling ? 'freeScrollFriction' : 'friction'];
  };

  proto.getRestingPosition = function () {
    // my thanks to Steven Wittens, who simplified this math greatly
    return this.x + this.velocity / (1 - this.getFrictionFactor());
  };

  proto.applyDragForce = function () {
    if (!this.isDraggable || !this.isPointerDown) {
      return;
    } // change the position to drag position by applying force


    var dragVelocity = this.dragX - this.x;
    var dragForce = dragVelocity - this.velocity;
    this.applyForce(dragForce);
  };

  proto.applySelectedAttraction = function () {
    // do not attract if pointer down or no slides
    var dragDown = this.isDraggable && this.isPointerDown;

    if (dragDown || this.isFreeScrolling || !this.slides.length) {
      return;
    }

    var distance = this.selectedSlide.target * -1 - this.x;
    var force = distance * this.options.selectedAttraction;
    this.applyForce(force);
  };

  return proto;
}); // Flickity main


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('flickity/js/flickity', ['ev-emitter/ev-emitter', 'get-size/get-size', 'fizzy-ui-utils/utils', './cell', './slide', './animate'], function (EvEmitter, getSize, utils, Cell, Slide, animatePrototype) {
      return factory(window, EvEmitter, getSize, utils, Cell, Slide, animatePrototype);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('ev-emitter'), require('get-size'), require('fizzy-ui-utils'), require('./cell'), require('./slide'), require('./animate'));
  } else {
    // browser global
    var _Flickity = window.Flickity;
    window.Flickity = factory(window, window.EvEmitter, window.getSize, window.fizzyUIUtils, _Flickity.Cell, _Flickity.Slide, _Flickity.animatePrototype);
  }
})(window, function factory(window, EvEmitter, getSize, utils, Cell, Slide, animatePrototype) {
  // vars
  var jQuery = window.jQuery;
  var getComputedStyle = window.getComputedStyle;
  var console = window.console;

  function moveElements(elems, toElem) {
    elems = utils.makeArray(elems);

    while (elems.length) {
      toElem.appendChild(elems.shift());
    }
  } // -------------------------- Flickity -------------------------- //
  // globally unique identifiers


  var GUID = 0; // internal store of all Flickity intances

  var instances = {};

  function Flickity(element, options) {
    var queryElement = utils.getQueryElement(element);

    if (!queryElement) {
      if (console) {
        console.error('Bad element for Flickity: ' + (queryElement || element));
      }

      return;
    }

    this.element = queryElement; // do not initialize twice on same element

    if (this.element.flickityGUID) {
      var instance = instances[this.element.flickityGUID];
      instance.option(options);
      return instance;
    } // add jQuery


    if (jQuery) {
      this.$element = jQuery(this.element);
    } // options


    this.options = utils.extend({}, this.constructor.defaults);
    this.option(options); // kick things off

    this._create();
  }

  Flickity.defaults = {
    accessibility: true,
    // adaptiveHeight: false,
    cellAlign: 'center',
    // cellSelector: undefined,
    // contain: false,
    freeScrollFriction: 0.075,
    // friction when free-scrolling
    friction: 0.28,
    // friction when selecting
    namespaceJQueryEvents: true,
    // initialIndex: 0,
    percentPosition: true,
    resize: true,
    selectedAttraction: 0.025,
    setGallerySize: true // watchCSS: false,
    // wrapAround: false

  }; // hash of methods triggered on _create()

  Flickity.createMethods = [];
  var proto = Flickity.prototype; // inherit EventEmitter

  utils.extend(proto, EvEmitter.prototype);

  proto._create = function () {
    // add id for Flickity.data
    var id = this.guid = ++GUID;
    this.element.flickityGUID = id; // expando

    instances[id] = this; // associate via id
    // initial properties

    this.selectedIndex = 0; // how many frames slider has been in same position

    this.restingFrames = 0; // initial physics properties

    this.x = 0;
    this.velocity = 0;
    this.originSide = this.options.rightToLeft ? 'right' : 'left'; // create viewport & slider

    this.viewport = document.createElement('div');
    this.viewport.className = 'flickity-viewport';

    this._createSlider();

    if (this.options.resize || this.options.watchCSS) {
      window.addEventListener('resize', this);
    } // add listeners from on option


    for (var eventName in this.options.on) {
      var listener = this.options.on[eventName];
      this.on(eventName, listener);
    }

    Flickity.createMethods.forEach(function (method) {
      this[method]();
    }, this);

    if (this.options.watchCSS) {
      this.watchCSS();
    } else {
      this.activate();
    }
  };
  /**
   * set options
   * @param {Object} opts
   */


  proto.option = function (opts) {
    utils.extend(this.options, opts);
  };

  proto.activate = function () {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.element.classList.add('flickity-enabled');

    if (this.options.rightToLeft) {
      this.element.classList.add('flickity-rtl');
    }

    this.getSize(); // move initial cell elements so they can be loaded as cells

    var cellElems = this._filterFindCellElements(this.element.children);

    moveElements(cellElems, this.slider);
    this.viewport.appendChild(this.slider);
    this.element.appendChild(this.viewport); // get cells from children

    this.reloadCells();

    if (this.options.accessibility) {
      // allow element to focusable
      this.element.tabIndex = 0; // listen for key presses

      this.element.addEventListener('keydown', this);
    }

    this.emitEvent('activate');
    this.selectInitialIndex(); // flag for initial activation, for using initialIndex

    this.isInitActivated = true; // ready event. #493

    this.dispatchEvent('ready');
  }; // slider positions the cells


  proto._createSlider = function () {
    // slider element does all the positioning
    var slider = document.createElement('div');
    slider.className = 'flickity-slider';
    slider.style[this.originSide] = 0;
    this.slider = slider;
  };

  proto._filterFindCellElements = function (elems) {
    return utils.filterFindElements(elems, this.options.cellSelector);
  }; // goes through all children


  proto.reloadCells = function () {
    // collection of item elements
    this.cells = this._makeCells(this.slider.children);
    this.positionCells();

    this._getWrapShiftCells();

    this.setGallerySize();
  };
  /**
   * turn elements into Flickity.Cells
   * @param {Array or NodeList or HTMLElement} elems
   * @returns {Array} items - collection of new Flickity Cells
   */


  proto._makeCells = function (elems) {
    var cellElems = this._filterFindCellElements(elems); // create new Flickity for collection


    var cells = cellElems.map(function (cellElem) {
      return new Cell(cellElem, this);
    }, this);
    return cells;
  };

  proto.getLastCell = function () {
    return this.cells[this.cells.length - 1];
  };

  proto.getLastSlide = function () {
    return this.slides[this.slides.length - 1];
  }; // positions all cells


  proto.positionCells = function () {
    // size all cells
    this._sizeCells(this.cells); // position all cells


    this._positionCells(0);
  };
  /**
   * position certain cells
   * @param {Integer} index - which cell to start with
   */


  proto._positionCells = function (index) {
    index = index || 0; // also measure maxCellHeight
    // start 0 if positioning all cells

    this.maxCellHeight = index ? this.maxCellHeight || 0 : 0;
    var cellX = 0; // get cellX

    if (index > 0) {
      var startCell = this.cells[index - 1];
      cellX = startCell.x + startCell.size.outerWidth;
    }

    var len = this.cells.length;

    for (var i = index; i < len; i++) {
      var cell = this.cells[i];
      cell.setPosition(cellX);
      cellX += cell.size.outerWidth;
      this.maxCellHeight = Math.max(cell.size.outerHeight, this.maxCellHeight);
    } // keep track of cellX for wrap-around


    this.slideableWidth = cellX; // slides

    this.updateSlides(); // contain slides target

    this._containSlides(); // update slidesWidth


    this.slidesWidth = len ? this.getLastSlide().target - this.slides[0].target : 0;
  };
  /**
   * cell.getSize() on multiple cells
   * @param {Array} cells
   */


  proto._sizeCells = function (cells) {
    cells.forEach(function (cell) {
      cell.getSize();
    });
  }; // --------------------------  -------------------------- //


  proto.updateSlides = function () {
    this.slides = [];

    if (!this.cells.length) {
      return;
    }

    var slide = new Slide(this);
    this.slides.push(slide);
    var isOriginLeft = this.originSide == 'left';
    var nextMargin = isOriginLeft ? 'marginRight' : 'marginLeft';

    var canCellFit = this._getCanCellFit();

    this.cells.forEach(function (cell, i) {
      // just add cell if first cell in slide
      if (!slide.cells.length) {
        slide.addCell(cell);
        return;
      }

      var slideWidth = slide.outerWidth - slide.firstMargin + (cell.size.outerWidth - cell.size[nextMargin]);

      if (canCellFit.call(this, i, slideWidth)) {
        slide.addCell(cell);
      } else {
        // doesn't fit, new slide
        slide.updateTarget();
        slide = new Slide(this);
        this.slides.push(slide);
        slide.addCell(cell);
      }
    }, this); // last slide

    slide.updateTarget(); // update .selectedSlide

    this.updateSelectedSlide();
  };

  proto._getCanCellFit = function () {
    var groupCells = this.options.groupCells;

    if (!groupCells) {
      return function () {
        return false;
      };
    } else if (typeof groupCells == 'number') {
      // group by number. 3 -> [0,1,2], [3,4,5], ...
      var number = parseInt(groupCells, 10);
      return function (i) {
        return i % number !== 0;
      };
    } // default, group by width of slide
    // parse '75%


    var percentMatch = typeof groupCells == 'string' && groupCells.match(/^(\d+)%$/);
    var percent = percentMatch ? parseInt(percentMatch[1], 10) / 100 : 1;
    return function (i, slideWidth) {
      return slideWidth <= (this.size.innerWidth + 1) * percent;
    };
  }; // alias _init for jQuery plugin .flickity()


  proto._init = proto.reposition = function () {
    this.positionCells();
    this.positionSliderAtSelected();
  };

  proto.getSize = function () {
    this.size = getSize(this.element);
    this.setCellAlign();
    this.cursorPosition = this.size.innerWidth * this.cellAlign;
  };

  var cellAlignShorthands = {
    // cell align, then based on origin side
    center: {
      left: 0.5,
      right: 0.5
    },
    left: {
      left: 0,
      right: 1
    },
    right: {
      right: 0,
      left: 1
    }
  };

  proto.setCellAlign = function () {
    var shorthand = cellAlignShorthands[this.options.cellAlign];
    this.cellAlign = shorthand ? shorthand[this.originSide] : this.options.cellAlign;
  };

  proto.setGallerySize = function () {
    if (this.options.setGallerySize) {
      var height = this.options.adaptiveHeight && this.selectedSlide ? this.selectedSlide.height : this.maxCellHeight;
      this.viewport.style.height = height + 'px';
    }
  };

  proto._getWrapShiftCells = function () {
    // only for wrap-around
    if (!this.options.wrapAround) {
      return;
    } // unshift previous cells


    this._unshiftCells(this.beforeShiftCells);

    this._unshiftCells(this.afterShiftCells); // get before cells
    // initial gap


    var gapX = this.cursorPosition;
    var cellIndex = this.cells.length - 1;
    this.beforeShiftCells = this._getGapCells(gapX, cellIndex, -1); // get after cells
    // ending gap between last cell and end of gallery viewport

    gapX = this.size.innerWidth - this.cursorPosition; // start cloning at first cell, working forwards

    this.afterShiftCells = this._getGapCells(gapX, 0, 1);
  };

  proto._getGapCells = function (gapX, cellIndex, increment) {
    // keep adding cells until the cover the initial gap
    var cells = [];

    while (gapX > 0) {
      var cell = this.cells[cellIndex];

      if (!cell) {
        break;
      }

      cells.push(cell);
      cellIndex += increment;
      gapX -= cell.size.outerWidth;
    }

    return cells;
  }; // ----- contain ----- //
  // contain cell targets so no excess sliding


  proto._containSlides = function () {
    if (!this.options.contain || this.options.wrapAround || !this.cells.length) {
      return;
    }

    var isRightToLeft = this.options.rightToLeft;
    var beginMargin = isRightToLeft ? 'marginRight' : 'marginLeft';
    var endMargin = isRightToLeft ? 'marginLeft' : 'marginRight';
    var contentWidth = this.slideableWidth - this.getLastCell().size[endMargin]; // content is less than gallery size

    var isContentSmaller = contentWidth < this.size.innerWidth; // bounds

    var beginBound = this.cursorPosition + this.cells[0].size[beginMargin];
    var endBound = contentWidth - this.size.innerWidth * (1 - this.cellAlign); // contain each cell target

    this.slides.forEach(function (slide) {
      if (isContentSmaller) {
        // all cells fit inside gallery
        slide.target = contentWidth * this.cellAlign;
      } else {
        // contain to bounds
        slide.target = Math.max(slide.target, beginBound);
        slide.target = Math.min(slide.target, endBound);
      }
    }, this);
  }; // -----  ----- //

  /**
   * emits events via eventEmitter and jQuery events
   * @param {String} type - name of event
   * @param {Event} event - original event
   * @param {Array} args - extra arguments
   */


  proto.dispatchEvent = function (type, event, args) {
    var emitArgs = event ? [event].concat(args) : args;
    this.emitEvent(type, emitArgs);

    if (jQuery && this.$element) {
      // default trigger with type if no event
      type += this.options.namespaceJQueryEvents ? '.flickity' : '';
      var $event = type;

      if (event) {
        // create jQuery event
        var jQEvent = jQuery.Event(event);
        jQEvent.type = type;
        $event = jQEvent;
      }

      this.$element.trigger($event, args);
    }
  }; // -------------------------- select -------------------------- //

  /**
   * @param {Integer} index - index of the slide
   * @param {Boolean} isWrap - will wrap-around to last/first if at the end
   * @param {Boolean} isInstant - will immediately set position at selected cell
   */


  proto.select = function (index, isWrap, isInstant) {
    if (!this.isActive) {
      return;
    }

    index = parseInt(index, 10);

    this._wrapSelect(index);

    if (this.options.wrapAround || isWrap) {
      index = utils.modulo(index, this.slides.length);
    } // bail if invalid index


    if (!this.slides[index]) {
      return;
    }

    var prevIndex = this.selectedIndex;
    this.selectedIndex = index;
    this.updateSelectedSlide();

    if (isInstant) {
      this.positionSliderAtSelected();
    } else {
      this.startAnimation();
    }

    if (this.options.adaptiveHeight) {
      this.setGallerySize();
    } // events


    this.dispatchEvent('select', null, [index]); // change event if new index

    if (index != prevIndex) {
      this.dispatchEvent('change', null, [index]);
    } // old v1 event name, remove in v3


    this.dispatchEvent('cellSelect');
  }; // wraps position for wrapAround, to move to closest slide. #113


  proto._wrapSelect = function (index) {
    var len = this.slides.length;
    var isWrapping = this.options.wrapAround && len > 1;

    if (!isWrapping) {
      return index;
    }

    var wrapIndex = utils.modulo(index, len); // go to shortest

    var delta = Math.abs(wrapIndex - this.selectedIndex);
    var backWrapDelta = Math.abs(wrapIndex + len - this.selectedIndex);
    var forewardWrapDelta = Math.abs(wrapIndex - len - this.selectedIndex);

    if (!this.isDragSelect && backWrapDelta < delta) {
      index += len;
    } else if (!this.isDragSelect && forewardWrapDelta < delta) {
      index -= len;
    } // wrap position so slider is within normal area


    if (index < 0) {
      this.x -= this.slideableWidth;
    } else if (index >= len) {
      this.x += this.slideableWidth;
    }
  };

  proto.previous = function (isWrap, isInstant) {
    this.select(this.selectedIndex - 1, isWrap, isInstant);
  };

  proto.next = function (isWrap, isInstant) {
    this.select(this.selectedIndex + 1, isWrap, isInstant);
  };

  proto.updateSelectedSlide = function () {
    var slide = this.slides[this.selectedIndex]; // selectedIndex could be outside of slides, if triggered before resize()

    if (!slide) {
      return;
    } // unselect previous selected slide


    this.unselectSelectedSlide(); // update new selected slide

    this.selectedSlide = slide;
    slide.select();
    this.selectedCells = slide.cells;
    this.selectedElements = slide.getCellElements(); // HACK: selectedCell & selectedElement is first cell in slide, backwards compatibility
    // Remove in v3?

    this.selectedCell = slide.cells[0];
    this.selectedElement = this.selectedElements[0];
  };

  proto.unselectSelectedSlide = function () {
    if (this.selectedSlide) {
      this.selectedSlide.unselect();
    }
  };

  proto.selectInitialIndex = function () {
    var initialIndex = this.options.initialIndex; // already activated, select previous selectedIndex

    if (this.isInitActivated) {
      this.select(this.selectedIndex, false, true);
      return;
    } // select with selector string


    if (initialIndex && typeof initialIndex == 'string') {
      var cell = this.queryCell(initialIndex);

      if (cell) {
        this.selectCell(initialIndex, false, true);
        return;
      }
    }

    var index = 0; // select with number

    if (initialIndex && this.slides[initialIndex]) {
      index = initialIndex;
    } // select instantly


    this.select(index, false, true);
  };
  /**
   * select slide from number or cell element
   * @param {Element or Number} elem
   */


  proto.selectCell = function (value, isWrap, isInstant) {
    // get cell
    var cell = this.queryCell(value);

    if (!cell) {
      return;
    }

    var index = this.getCellSlideIndex(cell);
    this.select(index, isWrap, isInstant);
  };

  proto.getCellSlideIndex = function (cell) {
    // get index of slides that has cell
    for (var i = 0; i < this.slides.length; i++) {
      var slide = this.slides[i];
      var index = slide.cells.indexOf(cell);

      if (index != -1) {
        return i;
      }
    }
  }; // -------------------------- get cells -------------------------- //

  /**
   * get Flickity.Cell, given an Element
   * @param {Element} elem
   * @returns {Flickity.Cell} item
   */


  proto.getCell = function (elem) {
    // loop through cells to get the one that matches
    for (var i = 0; i < this.cells.length; i++) {
      var cell = this.cells[i];

      if (cell.element == elem) {
        return cell;
      }
    }
  };
  /**
   * get collection of Flickity.Cells, given Elements
   * @param {Element, Array, NodeList} elems
   * @returns {Array} cells - Flickity.Cells
   */


  proto.getCells = function (elems) {
    elems = utils.makeArray(elems);
    var cells = [];
    elems.forEach(function (elem) {
      var cell = this.getCell(elem);

      if (cell) {
        cells.push(cell);
      }
    }, this);
    return cells;
  };
  /**
   * get cell elements
   * @returns {Array} cellElems
   */


  proto.getCellElements = function () {
    return this.cells.map(function (cell) {
      return cell.element;
    });
  };
  /**
   * get parent cell from an element
   * @param {Element} elem
   * @returns {Flickit.Cell} cell
   */


  proto.getParentCell = function (elem) {
    // first check if elem is cell
    var cell = this.getCell(elem);

    if (cell) {
      return cell;
    } // try to get parent cell elem


    elem = utils.getParent(elem, '.flickity-slider > *');
    return this.getCell(elem);
  };
  /**
   * get cells adjacent to a slide
   * @param {Integer} adjCount - number of adjacent slides
   * @param {Integer} index - index of slide to start
   * @returns {Array} cells - array of Flickity.Cells
   */


  proto.getAdjacentCellElements = function (adjCount, index) {
    if (!adjCount) {
      return this.selectedSlide.getCellElements();
    }

    index = index === undefined ? this.selectedIndex : index;
    var len = this.slides.length;

    if (1 + adjCount * 2 >= len) {
      return this.getCellElements();
    }

    var cellElems = [];

    for (var i = index - adjCount; i <= index + adjCount; i++) {
      var slideIndex = this.options.wrapAround ? utils.modulo(i, len) : i;
      var slide = this.slides[slideIndex];

      if (slide) {
        cellElems = cellElems.concat(slide.getCellElements());
      }
    }

    return cellElems;
  };
  /**
   * select slide from number or cell element
   * @param {Element, Selector String, or Number} selector
   */


  proto.queryCell = function (selector) {
    if (typeof selector == 'number') {
      // use number as index
      return this.cells[selector];
    }

    if (typeof selector == 'string') {
      // do not select invalid selectors from hash: #123, #/. #791
      if (selector.match(/^[#\.]?[\d\/]/)) {
        return;
      } // use string as selector, get element


      selector = this.element.querySelector(selector);
    } // get cell from element


    return this.getCell(selector);
  }; // -------------------------- events -------------------------- //


  proto.uiChange = function () {
    this.emitEvent('uiChange');
  }; // keep focus on element when child UI elements are clicked


  proto.childUIPointerDown = function (event) {
    // HACK iOS does not allow touch events to bubble up?!
    if (event.type != 'touchstart') {
      event.preventDefault();
    }

    this.focus();
  }; // ----- resize ----- //


  proto.onresize = function () {
    this.watchCSS();
    this.resize();
  };

  utils.debounceMethod(Flickity, 'onresize', 150);

  proto.resize = function () {
    if (!this.isActive) {
      return;
    }

    this.getSize(); // wrap values

    if (this.options.wrapAround) {
      this.x = utils.modulo(this.x, this.slideableWidth);
    }

    this.positionCells();

    this._getWrapShiftCells();

    this.setGallerySize();
    this.emitEvent('resize'); // update selected index for group slides, instant
    // TODO: position can be lost between groups of various numbers

    var selectedElement = this.selectedElements && this.selectedElements[0];
    this.selectCell(selectedElement, false, true);
  }; // watches the :after property, activates/deactivates


  proto.watchCSS = function () {
    var watchOption = this.options.watchCSS;

    if (!watchOption) {
      return;
    }

    var afterContent = getComputedStyle(this.element, ':after').content; // activate if :after { content: 'flickity' }

    if (afterContent.indexOf('flickity') != -1) {
      this.activate();
    } else {
      this.deactivate();
    }
  }; // ----- keydown ----- //
  // go previous/next if left/right keys pressed


  proto.onkeydown = function (event) {
    // only work if element is in focus
    var isNotFocused = document.activeElement && document.activeElement != this.element;

    if (!this.options.accessibility || isNotFocused) {
      return;
    }

    var handler = Flickity.keyboardHandlers[event.keyCode];

    if (handler) {
      handler.call(this);
    }
  };

  Flickity.keyboardHandlers = {
    // left arrow
    37: function _() {
      var leftMethod = this.options.rightToLeft ? 'next' : 'previous';
      this.uiChange();
      this[leftMethod]();
    },
    // right arrow
    39: function _() {
      var rightMethod = this.options.rightToLeft ? 'previous' : 'next';
      this.uiChange();
      this[rightMethod]();
    }
  }; // ----- focus ----- //

  proto.focus = function () {
    // TODO remove scrollTo once focus options gets more support
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus#Browser_compatibility
    var prevScrollY = window.pageYOffset;
    this.element.focus({
      preventScroll: true
    }); // hack to fix scroll jump after focus, #76

    if (window.pageYOffset != prevScrollY) {
      window.scrollTo(window.pageXOffset, prevScrollY);
    }
  }; // -------------------------- destroy -------------------------- //
  // deactivate all Flickity functionality, but keep stuff available


  proto.deactivate = function () {
    if (!this.isActive) {
      return;
    }

    this.element.classList.remove('flickity-enabled');
    this.element.classList.remove('flickity-rtl');
    this.unselectSelectedSlide(); // destroy cells

    this.cells.forEach(function (cell) {
      cell.destroy();
    });
    this.element.removeChild(this.viewport); // move child elements back into element

    moveElements(this.slider.children, this.element);

    if (this.options.accessibility) {
      this.element.removeAttribute('tabIndex');
      this.element.removeEventListener('keydown', this);
    } // set flags


    this.isActive = false;
    this.emitEvent('deactivate');
  };

  proto.destroy = function () {
    this.deactivate();
    window.removeEventListener('resize', this);
    this.allOff();
    this.emitEvent('destroy');

    if (jQuery && this.$element) {
      jQuery.removeData(this.element, 'flickity');
    }

    delete this.element.flickityGUID;
    delete instances[this.guid];
  }; // -------------------------- prototype -------------------------- //


  utils.extend(proto, animatePrototype); // -------------------------- extras -------------------------- //

  /**
   * get Flickity instance from element
   * @param {Element} elem
   * @returns {Flickity}
   */

  Flickity.data = function (elem) {
    elem = utils.getQueryElement(elem);
    var id = elem && elem.flickityGUID;
    return id && instances[id];
  };

  utils.htmlInit(Flickity, 'flickity');

  if (jQuery && jQuery.bridget) {
    jQuery.bridget('flickity', Flickity);
  } // set internal jQuery, for Webpack + jQuery v3, #478


  Flickity.setJQuery = function (jq) {
    jQuery = jq;
  };

  Flickity.Cell = Cell;
  Flickity.Slide = Slide;
  return Flickity;
});
/*!
 * Unipointer v2.3.0
 * base class for doing one thing with pointer event
 * MIT license
 */

/*jshint browser: true, undef: true, unused: true, strict: true */


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */

  /*global define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('unipointer/unipointer', ['ev-emitter/ev-emitter'], function (EvEmitter) {
      return factory(window, EvEmitter);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('ev-emitter'));
  } else {
    // browser global
    window.Unipointer = factory(window, window.EvEmitter);
  }
})(window, function factory(window, EvEmitter) {
  function noop() {}

  function Unipointer() {} // inherit EvEmitter


  var proto = Unipointer.prototype = Object.create(EvEmitter.prototype);

  proto.bindStartEvent = function (elem) {
    this._bindStartEvent(elem, true);
  };

  proto.unbindStartEvent = function (elem) {
    this._bindStartEvent(elem, false);
  };
  /**
   * Add or remove start event
   * @param {Boolean} isAdd - remove if falsey
   */


  proto._bindStartEvent = function (elem, isAdd) {
    // munge isAdd, default to true
    isAdd = isAdd === undefined ? true : isAdd;
    var bindMethod = isAdd ? 'addEventListener' : 'removeEventListener'; // default to mouse events

    var startEvent = 'mousedown';

    if (window.PointerEvent) {
      // Pointer Events
      startEvent = 'pointerdown';
    } else if ('ontouchstart' in window) {
      // Touch Events. iOS Safari
      startEvent = 'touchstart';
    }

    elem[bindMethod](startEvent, this);
  }; // trigger handler methods for events


  proto.handleEvent = function (event) {
    var method = 'on' + event.type;

    if (this[method]) {
      this[method](event);
    }
  }; // returns the touch that we're keeping track of


  proto.getTouch = function (touches) {
    for (var i = 0; i < touches.length; i++) {
      var touch = touches[i];

      if (touch.identifier == this.pointerIdentifier) {
        return touch;
      }
    }
  }; // ----- start event ----- //


  proto.onmousedown = function (event) {
    // dismiss clicks from right or middle buttons
    var button = event.button;

    if (button && button !== 0 && button !== 1) {
      return;
    }

    this._pointerDown(event, event);
  };

  proto.ontouchstart = function (event) {
    this._pointerDown(event, event.changedTouches[0]);
  };

  proto.onpointerdown = function (event) {
    this._pointerDown(event, event);
  };
  /**
   * pointer start
   * @param {Event} event
   * @param {Event or Touch} pointer
   */


  proto._pointerDown = function (event, pointer) {
    // dismiss right click and other pointers
    // button = 0 is okay, 1-4 not
    if (event.button || this.isPointerDown) {
      return;
    }

    this.isPointerDown = true; // save pointer identifier to match up touch events

    this.pointerIdentifier = pointer.pointerId !== undefined ? // pointerId for pointer events, touch.indentifier for touch events
    pointer.pointerId : pointer.identifier;
    this.pointerDown(event, pointer);
  };

  proto.pointerDown = function (event, pointer) {
    this._bindPostStartEvents(event);

    this.emitEvent('pointerDown', [event, pointer]);
  }; // hash of events to be bound after start event


  var postStartEvents = {
    mousedown: ['mousemove', 'mouseup'],
    touchstart: ['touchmove', 'touchend', 'touchcancel'],
    pointerdown: ['pointermove', 'pointerup', 'pointercancel']
  };

  proto._bindPostStartEvents = function (event) {
    if (!event) {
      return;
    } // get proper events to match start event


    var events = postStartEvents[event.type]; // bind events to node

    events.forEach(function (eventName) {
      window.addEventListener(eventName, this);
    }, this); // save these arguments

    this._boundPointerEvents = events;
  };

  proto._unbindPostStartEvents = function () {
    // check for _boundEvents, in case dragEnd triggered twice (old IE8 bug)
    if (!this._boundPointerEvents) {
      return;
    }

    this._boundPointerEvents.forEach(function (eventName) {
      window.removeEventListener(eventName, this);
    }, this);

    delete this._boundPointerEvents;
  }; // ----- move event ----- //


  proto.onmousemove = function (event) {
    this._pointerMove(event, event);
  };

  proto.onpointermove = function (event) {
    if (event.pointerId == this.pointerIdentifier) {
      this._pointerMove(event, event);
    }
  };

  proto.ontouchmove = function (event) {
    var touch = this.getTouch(event.changedTouches);

    if (touch) {
      this._pointerMove(event, touch);
    }
  };
  /**
   * pointer move
   * @param {Event} event
   * @param {Event or Touch} pointer
   * @private
   */


  proto._pointerMove = function (event, pointer) {
    this.pointerMove(event, pointer);
  }; // public


  proto.pointerMove = function (event, pointer) {
    this.emitEvent('pointerMove', [event, pointer]);
  }; // ----- end event ----- //


  proto.onmouseup = function (event) {
    this._pointerUp(event, event);
  };

  proto.onpointerup = function (event) {
    if (event.pointerId == this.pointerIdentifier) {
      this._pointerUp(event, event);
    }
  };

  proto.ontouchend = function (event) {
    var touch = this.getTouch(event.changedTouches);

    if (touch) {
      this._pointerUp(event, touch);
    }
  };
  /**
   * pointer up
   * @param {Event} event
   * @param {Event or Touch} pointer
   * @private
   */


  proto._pointerUp = function (event, pointer) {
    this._pointerDone();

    this.pointerUp(event, pointer);
  }; // public


  proto.pointerUp = function (event, pointer) {
    this.emitEvent('pointerUp', [event, pointer]);
  }; // ----- pointer done ----- //
  // triggered on pointer up & pointer cancel


  proto._pointerDone = function () {
    this._pointerReset();

    this._unbindPostStartEvents();

    this.pointerDone();
  };

  proto._pointerReset = function () {
    // reset properties
    this.isPointerDown = false;
    delete this.pointerIdentifier;
  };

  proto.pointerDone = noop; // ----- pointer cancel ----- //

  proto.onpointercancel = function (event) {
    if (event.pointerId == this.pointerIdentifier) {
      this._pointerCancel(event, event);
    }
  };

  proto.ontouchcancel = function (event) {
    var touch = this.getTouch(event.changedTouches);

    if (touch) {
      this._pointerCancel(event, touch);
    }
  };
  /**
   * pointer cancel
   * @param {Event} event
   * @param {Event or Touch} pointer
   * @private
   */


  proto._pointerCancel = function (event, pointer) {
    this._pointerDone();

    this.pointerCancel(event, pointer);
  }; // public


  proto.pointerCancel = function (event, pointer) {
    this.emitEvent('pointerCancel', [event, pointer]);
  }; // -----  ----- //
  // utility function for getting x/y coords from event


  Unipointer.getPointerPoint = function (pointer) {
    return {
      x: pointer.pageX,
      y: pointer.pageY
    };
  }; // -----  ----- //


  return Unipointer;
});
/*!
 * Unidragger v2.3.0
 * Draggable base class
 * MIT license
 */

/*jshint browser: true, unused: true, undef: true, strict: true */


(function (window, factory) {
  // universal module definition

  /*jshint strict: false */

  /*globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('unidragger/unidragger', ['unipointer/unipointer'], function (Unipointer) {
      return factory(window, Unipointer);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('unipointer'));
  } else {
    // browser global
    window.Unidragger = factory(window, window.Unipointer);
  }
})(window, function factory(window, Unipointer) {
  // -------------------------- Unidragger -------------------------- //
  function Unidragger() {} // inherit Unipointer & EvEmitter


  var proto = Unidragger.prototype = Object.create(Unipointer.prototype); // ----- bind start ----- //

  proto.bindHandles = function () {
    this._bindHandles(true);
  };

  proto.unbindHandles = function () {
    this._bindHandles(false);
  };
  /**
   * Add or remove start event
   * @param {Boolean} isAdd
   */


  proto._bindHandles = function (isAdd) {
    // munge isAdd, default to true
    isAdd = isAdd === undefined ? true : isAdd; // bind each handle

    var bindMethod = isAdd ? 'addEventListener' : 'removeEventListener';
    var touchAction = isAdd ? this._touchActionValue : '';

    for (var i = 0; i < this.handles.length; i++) {
      var handle = this.handles[i];

      this._bindStartEvent(handle, isAdd);

      handle[bindMethod]('click', this); // touch-action: none to override browser touch gestures. metafizzy/flickity#540

      if (window.PointerEvent) {
        handle.style.touchAction = touchAction;
      }
    }
  }; // prototype so it can be overwriteable by Flickity


  proto._touchActionValue = 'none'; // ----- start event ----- //

  /**
   * pointer start
   * @param {Event} event
   * @param {Event or Touch} pointer
   */

  proto.pointerDown = function (event, pointer) {
    var isOkay = this.okayPointerDown(event);

    if (!isOkay) {
      return;
    } // track start event position


    this.pointerDownPointer = pointer;
    event.preventDefault();
    this.pointerDownBlur(); // bind move and end events

    this._bindPostStartEvents(event);

    this.emitEvent('pointerDown', [event, pointer]);
  }; // nodes that have text fields


  var cursorNodes = {
    TEXTAREA: true,
    INPUT: true,
    SELECT: true,
    OPTION: true
  }; // input types that do not have text fields

  var clickTypes = {
    radio: true,
    checkbox: true,
    button: true,
    submit: true,
    image: true,
    file: true
  }; // dismiss inputs with text fields. flickity#403, flickity#404

  proto.okayPointerDown = function (event) {
    var isCursorNode = cursorNodes[event.target.nodeName];
    var isClickType = clickTypes[event.target.type];
    var isOkay = !isCursorNode || isClickType;

    if (!isOkay) {
      this._pointerReset();
    }

    return isOkay;
  }; // kludge to blur previously focused input


  proto.pointerDownBlur = function () {
    var focused = document.activeElement; // do not blur body for IE10, metafizzy/flickity#117

    var canBlur = focused && focused.blur && focused != document.body;

    if (canBlur) {
      focused.blur();
    }
  }; // ----- move event ----- //

  /**
   * drag move
   * @param {Event} event
   * @param {Event or Touch} pointer
   */


  proto.pointerMove = function (event, pointer) {
    var moveVector = this._dragPointerMove(event, pointer);

    this.emitEvent('pointerMove', [event, pointer, moveVector]);

    this._dragMove(event, pointer, moveVector);
  }; // base pointer move logic


  proto._dragPointerMove = function (event, pointer) {
    var moveVector = {
      x: pointer.pageX - this.pointerDownPointer.pageX,
      y: pointer.pageY - this.pointerDownPointer.pageY
    }; // start drag if pointer has moved far enough to start drag

    if (!this.isDragging && this.hasDragStarted(moveVector)) {
      this._dragStart(event, pointer);
    }

    return moveVector;
  }; // condition if pointer has moved far enough to start drag


  proto.hasDragStarted = function (moveVector) {
    return Math.abs(moveVector.x) > 3 || Math.abs(moveVector.y) > 3;
  }; // ----- end event ----- //

  /**
   * pointer up
   * @param {Event} event
   * @param {Event or Touch} pointer
   */


  proto.pointerUp = function (event, pointer) {
    this.emitEvent('pointerUp', [event, pointer]);

    this._dragPointerUp(event, pointer);
  };

  proto._dragPointerUp = function (event, pointer) {
    if (this.isDragging) {
      this._dragEnd(event, pointer);
    } else {
      // pointer didn't move enough for drag to start
      this._staticClick(event, pointer);
    }
  }; // -------------------------- drag -------------------------- //
  // dragStart


  proto._dragStart = function (event, pointer) {
    this.isDragging = true; // prevent clicks

    this.isPreventingClicks = true;
    this.dragStart(event, pointer);
  };

  proto.dragStart = function (event, pointer) {
    this.emitEvent('dragStart', [event, pointer]);
  }; // dragMove


  proto._dragMove = function (event, pointer, moveVector) {
    // do not drag if not dragging yet
    if (!this.isDragging) {
      return;
    }

    this.dragMove(event, pointer, moveVector);
  };

  proto.dragMove = function (event, pointer, moveVector) {
    event.preventDefault();
    this.emitEvent('dragMove', [event, pointer, moveVector]);
  }; // dragEnd


  proto._dragEnd = function (event, pointer) {
    // set flags
    this.isDragging = false; // re-enable clicking async

    setTimeout(function () {
      delete this.isPreventingClicks;
    }.bind(this));
    this.dragEnd(event, pointer);
  };

  proto.dragEnd = function (event, pointer) {
    this.emitEvent('dragEnd', [event, pointer]);
  }; // ----- onclick ----- //
  // handle all clicks and prevent clicks when dragging


  proto.onclick = function (event) {
    if (this.isPreventingClicks) {
      event.preventDefault();
    }
  }; // ----- staticClick ----- //
  // triggered after pointer down & up with no/tiny movement


  proto._staticClick = function (event, pointer) {
    // ignore emulated mouse up clicks
    if (this.isIgnoringMouseUp && event.type == 'mouseup') {
      return;
    }

    this.staticClick(event, pointer); // set flag for emulated clicks 300ms after touchend

    if (event.type != 'mouseup') {
      this.isIgnoringMouseUp = true; // reset flag after 300ms

      setTimeout(function () {
        delete this.isIgnoringMouseUp;
      }.bind(this), 400);
    }
  };

  proto.staticClick = function (event, pointer) {
    this.emitEvent('staticClick', [event, pointer]);
  }; // ----- utils ----- //


  Unidragger.getPointerPoint = Unipointer.getPointerPoint; // -----  ----- //

  return Unidragger;
}); // drag


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('flickity/js/drag', ['./flickity', 'unidragger/unidragger', 'fizzy-ui-utils/utils'], function (Flickity, Unidragger, utils) {
      return factory(window, Flickity, Unidragger, utils);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('./flickity'), require('unidragger'), require('fizzy-ui-utils'));
  } else {
    // browser global
    window.Flickity = factory(window, window.Flickity, window.Unidragger, window.fizzyUIUtils);
  }
})(window, function factory(window, Flickity, Unidragger, utils) {
  // ----- defaults ----- //
  utils.extend(Flickity.defaults, {
    draggable: '>1',
    dragThreshold: 3
  }); // ----- create ----- //

  Flickity.createMethods.push('_createDrag'); // -------------------------- drag prototype -------------------------- //

  var proto = Flickity.prototype;
  utils.extend(proto, Unidragger.prototype);
  proto._touchActionValue = 'pan-y'; // --------------------------  -------------------------- //

  var isTouch = 'createTouch' in document;
  var isTouchmoveScrollCanceled = false;

  proto._createDrag = function () {
    this.on('activate', this.onActivateDrag);
    this.on('uiChange', this._uiChangeDrag);
    this.on('deactivate', this.onDeactivateDrag);
    this.on('cellChange', this.updateDraggable); // TODO updateDraggable on resize? if groupCells & slides change
    // HACK - add seemingly innocuous handler to fix iOS 10 scroll behavior
    // #457, RubaXa/Sortable#973

    if (isTouch && !isTouchmoveScrollCanceled) {
      window.addEventListener('touchmove', function () {});
      isTouchmoveScrollCanceled = true;
    }
  };

  proto.onActivateDrag = function () {
    this.handles = [this.viewport];
    this.bindHandles();
    this.updateDraggable();
  };

  proto.onDeactivateDrag = function () {
    this.unbindHandles();
    this.element.classList.remove('is-draggable');
  };

  proto.updateDraggable = function () {
    // disable dragging if less than 2 slides. #278
    if (this.options.draggable == '>1') {
      this.isDraggable = this.slides.length > 1;
    } else {
      this.isDraggable = this.options.draggable;
    }

    if (this.isDraggable) {
      this.element.classList.add('is-draggable');
    } else {
      this.element.classList.remove('is-draggable');
    }
  }; // backwards compatibility


  proto.bindDrag = function () {
    this.options.draggable = true;
    this.updateDraggable();
  };

  proto.unbindDrag = function () {
    this.options.draggable = false;
    this.updateDraggable();
  };

  proto._uiChangeDrag = function () {
    delete this.isFreeScrolling;
  }; // -------------------------- pointer events -------------------------- //


  proto.pointerDown = function (event, pointer) {
    if (!this.isDraggable) {
      this._pointerDownDefault(event, pointer);

      return;
    }

    var isOkay = this.okayPointerDown(event);

    if (!isOkay) {
      return;
    }

    this._pointerDownPreventDefault(event);

    this.pointerDownFocus(event); // blur

    if (document.activeElement != this.element) {
      // do not blur if already focused
      this.pointerDownBlur();
    } // stop if it was moving


    this.dragX = this.x;
    this.viewport.classList.add('is-pointer-down'); // track scrolling

    this.pointerDownScroll = getScrollPosition();
    window.addEventListener('scroll', this);

    this._pointerDownDefault(event, pointer);
  }; // default pointerDown logic, used for staticClick


  proto._pointerDownDefault = function (event, pointer) {
    // track start event position
    // Safari 9 overrides pageX and pageY. These values needs to be copied. #779
    this.pointerDownPointer = {
      pageX: pointer.pageX,
      pageY: pointer.pageY
    }; // bind move and end events

    this._bindPostStartEvents(event);

    this.dispatchEvent('pointerDown', event, [pointer]);
  };

  var focusNodes = {
    INPUT: true,
    TEXTAREA: true,
    SELECT: true
  };

  proto.pointerDownFocus = function (event) {
    var isFocusNode = focusNodes[event.target.nodeName];

    if (!isFocusNode) {
      this.focus();
    }
  };

  proto._pointerDownPreventDefault = function (event) {
    var isTouchStart = event.type == 'touchstart';
    var isTouchPointer = event.pointerType == 'touch';
    var isFocusNode = focusNodes[event.target.nodeName];

    if (!isTouchStart && !isTouchPointer && !isFocusNode) {
      event.preventDefault();
    }
  }; // ----- move ----- //


  proto.hasDragStarted = function (moveVector) {
    return Math.abs(moveVector.x) > this.options.dragThreshold;
  }; // ----- up ----- //


  proto.pointerUp = function (event, pointer) {
    delete this.isTouchScrolling;
    this.viewport.classList.remove('is-pointer-down');
    this.dispatchEvent('pointerUp', event, [pointer]);

    this._dragPointerUp(event, pointer);
  };

  proto.pointerDone = function () {
    window.removeEventListener('scroll', this);
    delete this.pointerDownScroll;
  }; // -------------------------- dragging -------------------------- //


  proto.dragStart = function (event, pointer) {
    if (!this.isDraggable) {
      return;
    }

    this.dragStartPosition = this.x;
    this.startAnimation();
    window.removeEventListener('scroll', this);
    this.dispatchEvent('dragStart', event, [pointer]);
  };

  proto.pointerMove = function (event, pointer) {
    var moveVector = this._dragPointerMove(event, pointer);

    this.dispatchEvent('pointerMove', event, [pointer, moveVector]);

    this._dragMove(event, pointer, moveVector);
  };

  proto.dragMove = function (event, pointer, moveVector) {
    if (!this.isDraggable) {
      return;
    }

    event.preventDefault();
    this.previousDragX = this.dragX; // reverse if right-to-left

    var direction = this.options.rightToLeft ? -1 : 1;

    if (this.options.wrapAround) {
      // wrap around move. #589
      moveVector.x = moveVector.x % this.slideableWidth;
    }

    var dragX = this.dragStartPosition + moveVector.x * direction;

    if (!this.options.wrapAround && this.slides.length) {
      // slow drag
      var originBound = Math.max(-this.slides[0].target, this.dragStartPosition);
      dragX = dragX > originBound ? (dragX + originBound) * 0.5 : dragX;
      var endBound = Math.min(-this.getLastSlide().target, this.dragStartPosition);
      dragX = dragX < endBound ? (dragX + endBound) * 0.5 : dragX;
    }

    this.dragX = dragX;
    this.dragMoveTime = new Date();
    this.dispatchEvent('dragMove', event, [pointer, moveVector]);
  };

  proto.dragEnd = function (event, pointer) {
    if (!this.isDraggable) {
      return;
    }

    if (this.options.freeScroll) {
      this.isFreeScrolling = true;
    } // set selectedIndex based on where flick will end up


    var index = this.dragEndRestingSelect();

    if (this.options.freeScroll && !this.options.wrapAround) {
      // if free-scroll & not wrap around
      // do not free-scroll if going outside of bounding slides
      // so bounding slides can attract slider, and keep it in bounds
      var restingX = this.getRestingPosition();
      this.isFreeScrolling = -restingX > this.slides[0].target && -restingX < this.getLastSlide().target;
    } else if (!this.options.freeScroll && index == this.selectedIndex) {
      // boost selection if selected index has not changed
      index += this.dragEndBoostSelect();
    }

    delete this.previousDragX; // apply selection
    // TODO refactor this, selecting here feels weird
    // HACK, set flag so dragging stays in correct direction

    this.isDragSelect = this.options.wrapAround;
    this.select(index);
    delete this.isDragSelect;
    this.dispatchEvent('dragEnd', event, [pointer]);
  };

  proto.dragEndRestingSelect = function () {
    var restingX = this.getRestingPosition(); // how far away from selected slide

    var distance = Math.abs(this.getSlideDistance(-restingX, this.selectedIndex)); // get closet resting going up and going down

    var positiveResting = this._getClosestResting(restingX, distance, 1);

    var negativeResting = this._getClosestResting(restingX, distance, -1); // use closer resting for wrap-around


    var index = positiveResting.distance < negativeResting.distance ? positiveResting.index : negativeResting.index;
    return index;
  };
  /**
   * given resting X and distance to selected cell
   * get the distance and index of the closest cell
   * @param {Number} restingX - estimated post-flick resting position
   * @param {Number} distance - distance to selected cell
   * @param {Integer} increment - +1 or -1, going up or down
   * @returns {Object} - { distance: {Number}, index: {Integer} }
   */


  proto._getClosestResting = function (restingX, distance, increment) {
    var index = this.selectedIndex;
    var minDistance = Infinity;
    var condition = this.options.contain && !this.options.wrapAround ? // if contain, keep going if distance is equal to minDistance
    function (d, md) {
      return d <= md;
    } : function (d, md) {
      return d < md;
    };

    while (condition(distance, minDistance)) {
      // measure distance to next cell
      index += increment;
      minDistance = distance;
      distance = this.getSlideDistance(-restingX, index);

      if (distance === null) {
        break;
      }

      distance = Math.abs(distance);
    }

    return {
      distance: minDistance,
      // selected was previous index
      index: index - increment
    };
  };
  /**
   * measure distance between x and a slide target
   * @param {Number} x
   * @param {Integer} index - slide index
   */


  proto.getSlideDistance = function (x, index) {
    var len = this.slides.length; // wrap around if at least 2 slides

    var isWrapAround = this.options.wrapAround && len > 1;
    var slideIndex = isWrapAround ? utils.modulo(index, len) : index;
    var slide = this.slides[slideIndex];

    if (!slide) {
      return null;
    } // add distance for wrap-around slides


    var wrap = isWrapAround ? this.slideableWidth * Math.floor(index / len) : 0;
    return x - (slide.target + wrap);
  };

  proto.dragEndBoostSelect = function () {
    // do not boost if no previousDragX or dragMoveTime
    if (this.previousDragX === undefined || !this.dragMoveTime || // or if drag was held for 100 ms
    new Date() - this.dragMoveTime > 100) {
      return 0;
    }

    var distance = this.getSlideDistance(-this.dragX, this.selectedIndex);
    var delta = this.previousDragX - this.dragX;

    if (distance > 0 && delta > 0) {
      // boost to next if moving towards the right, and positive velocity
      return 1;
    } else if (distance < 0 && delta < 0) {
      // boost to previous if moving towards the left, and negative velocity
      return -1;
    }

    return 0;
  }; // ----- staticClick ----- //


  proto.staticClick = function (event, pointer) {
    // get clickedCell, if cell was clicked
    var clickedCell = this.getParentCell(event.target);
    var cellElem = clickedCell && clickedCell.element;
    var cellIndex = clickedCell && this.cells.indexOf(clickedCell);
    this.dispatchEvent('staticClick', event, [pointer, cellElem, cellIndex]);
  }; // ----- scroll ----- //


  proto.onscroll = function () {
    var scroll = getScrollPosition();
    var scrollMoveX = this.pointerDownScroll.x - scroll.x;
    var scrollMoveY = this.pointerDownScroll.y - scroll.y; // cancel click/tap if scroll is too much

    if (Math.abs(scrollMoveX) > 3 || Math.abs(scrollMoveY) > 3) {
      this._pointerDone();
    }
  }; // ----- utils ----- //


  function getScrollPosition() {
    return {
      x: window.pageXOffset,
      y: window.pageYOffset
    };
  } // -----  ----- //


  return Flickity;
}); // prev/next buttons


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('flickity/js/prev-next-button', ['./flickity', 'unipointer/unipointer', 'fizzy-ui-utils/utils'], function (Flickity, Unipointer, utils) {
      return factory(window, Flickity, Unipointer, utils);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('./flickity'), require('unipointer'), require('fizzy-ui-utils'));
  } else {
    // browser global
    factory(window, window.Flickity, window.Unipointer, window.fizzyUIUtils);
  }
})(window, function factory(window, Flickity, Unipointer, utils) {
  'use strict';

  var svgURI = 'http://www.w3.org/2000/svg'; // -------------------------- PrevNextButton -------------------------- //

  function PrevNextButton(direction, parent) {
    this.direction = direction;
    this.parent = parent;

    this._create();
  }

  PrevNextButton.prototype = Object.create(Unipointer.prototype);

  PrevNextButton.prototype._create = function () {
    // properties
    this.isEnabled = true;
    this.isPrevious = this.direction == -1;
    var leftDirection = this.parent.options.rightToLeft ? 1 : -1;
    this.isLeft = this.direction == leftDirection;
    var element = this.element = document.createElement('button');
    element.className = 'flickity-button flickity-prev-next-button';
    element.className += this.isPrevious ? ' previous' : ' next'; // prevent button from submitting form http://stackoverflow.com/a/10836076/182183

    element.setAttribute('type', 'button'); // init as disabled

    this.disable();
    element.setAttribute('aria-label', this.isPrevious ? 'Previous' : 'Next'); // create arrow

    var svg = this.createSVG();
    element.appendChild(svg); // events

    this.parent.on('select', this.update.bind(this));
    this.on('pointerDown', this.parent.childUIPointerDown.bind(this.parent));
  };

  PrevNextButton.prototype.activate = function () {
    this.bindStartEvent(this.element);
    this.element.addEventListener('click', this); // add to DOM

    this.parent.element.appendChild(this.element);
  };

  PrevNextButton.prototype.deactivate = function () {
    // remove from DOM
    this.parent.element.removeChild(this.element); // click events

    this.unbindStartEvent(this.element);
    this.element.removeEventListener('click', this);
  };

  PrevNextButton.prototype.createSVG = function () {
    var svg = document.createElementNS(svgURI, 'svg');
    svg.setAttribute('class', 'flickity-button-icon');
    svg.setAttribute('viewBox', '0 0 100 100');
    var path = document.createElementNS(svgURI, 'path');
    var pathMovements = getArrowMovements(this.parent.options.arrowShape);
    path.setAttribute('d', pathMovements);
    path.setAttribute('class', 'arrow'); // rotate arrow

    if (!this.isLeft) {
      path.setAttribute('transform', 'translate(100, 100) rotate(180) ');
    }

    svg.appendChild(path);
    return svg;
  }; // get SVG path movmement


  function getArrowMovements(shape) {
    // use shape as movement if string
    if (typeof shape == 'string') {
      return shape;
    } // create movement string


    return 'M ' + shape.x0 + ',50' + ' L ' + shape.x1 + ',' + (shape.y1 + 50) + ' L ' + shape.x2 + ',' + (shape.y2 + 50) + ' L ' + shape.x3 + ',50 ' + ' L ' + shape.x2 + ',' + (50 - shape.y2) + ' L ' + shape.x1 + ',' + (50 - shape.y1) + ' Z';
  }

  PrevNextButton.prototype.handleEvent = utils.handleEvent;

  PrevNextButton.prototype.onclick = function () {
    if (!this.isEnabled) {
      return;
    }

    this.parent.uiChange();
    var method = this.isPrevious ? 'previous' : 'next';
    this.parent[method]();
  }; // -----  ----- //


  PrevNextButton.prototype.enable = function () {
    if (this.isEnabled) {
      return;
    }

    this.element.disabled = false;
    this.isEnabled = true;
  };

  PrevNextButton.prototype.disable = function () {
    if (!this.isEnabled) {
      return;
    }

    this.element.disabled = true;
    this.isEnabled = false;
  };

  PrevNextButton.prototype.update = function () {
    // index of first or last slide, if previous or next
    var slides = this.parent.slides; // enable is wrapAround and at least 2 slides

    if (this.parent.options.wrapAround && slides.length > 1) {
      this.enable();
      return;
    }

    var lastIndex = slides.length ? slides.length - 1 : 0;
    var boundIndex = this.isPrevious ? 0 : lastIndex;
    var method = this.parent.selectedIndex == boundIndex ? 'disable' : 'enable';
    this[method]();
  };

  PrevNextButton.prototype.destroy = function () {
    this.deactivate();
    this.allOff();
  }; // -------------------------- Flickity prototype -------------------------- //


  utils.extend(Flickity.defaults, {
    prevNextButtons: true,
    arrowShape: {
      x0: 10,
      x1: 60,
      y1: 50,
      x2: 70,
      y2: 40,
      x3: 30
    }
  });
  Flickity.createMethods.push('_createPrevNextButtons');
  var proto = Flickity.prototype;

  proto._createPrevNextButtons = function () {
    if (!this.options.prevNextButtons) {
      return;
    }

    this.prevButton = new PrevNextButton(-1, this);
    this.nextButton = new PrevNextButton(1, this);
    this.on('activate', this.activatePrevNextButtons);
  };

  proto.activatePrevNextButtons = function () {
    this.prevButton.activate();
    this.nextButton.activate();
    this.on('deactivate', this.deactivatePrevNextButtons);
  };

  proto.deactivatePrevNextButtons = function () {
    this.prevButton.deactivate();
    this.nextButton.deactivate();
    this.off('deactivate', this.deactivatePrevNextButtons);
  }; // --------------------------  -------------------------- //


  Flickity.PrevNextButton = PrevNextButton;
  return Flickity;
}); // page dots


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('flickity/js/page-dots', ['./flickity', 'unipointer/unipointer', 'fizzy-ui-utils/utils'], function (Flickity, Unipointer, utils) {
      return factory(window, Flickity, Unipointer, utils);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('./flickity'), require('unipointer'), require('fizzy-ui-utils'));
  } else {
    // browser global
    factory(window, window.Flickity, window.Unipointer, window.fizzyUIUtils);
  }
})(window, function factory(window, Flickity, Unipointer, utils) {
  // -------------------------- PageDots -------------------------- //
  function PageDots(parent) {
    this.parent = parent;

    this._create();
  }

  PageDots.prototype = Object.create(Unipointer.prototype);

  PageDots.prototype._create = function () {
    // create holder element
    this.holder = document.createElement('ol');
    this.holder.className = 'flickity-page-dots'; // create dots, array of elements

    this.dots = []; // events

    this.handleClick = this.onClick.bind(this);
    this.on('pointerDown', this.parent.childUIPointerDown.bind(this.parent));
  };

  PageDots.prototype.activate = function () {
    this.setDots();
    this.holder.addEventListener('click', this.handleClick);
    this.bindStartEvent(this.holder); // add to DOM

    this.parent.element.appendChild(this.holder);
  };

  PageDots.prototype.deactivate = function () {
    this.holder.removeEventListener('click', this.handleClick);
    this.unbindStartEvent(this.holder); // remove from DOM

    this.parent.element.removeChild(this.holder);
  };

  PageDots.prototype.setDots = function () {
    // get difference between number of slides and number of dots
    var delta = this.parent.slides.length - this.dots.length;

    if (delta > 0) {
      this.addDots(delta);
    } else if (delta < 0) {
      this.removeDots(-delta);
    }
  };

  PageDots.prototype.addDots = function (count) {
    var fragment = document.createDocumentFragment();
    var newDots = [];
    var length = this.dots.length;
    var max = length + count;

    for (var i = length; i < max; i++) {
      var dot = document.createElement('li');
      dot.className = 'dot';
      dot.setAttribute('aria-label', 'Page dot ' + (i + 1));
      fragment.appendChild(dot);
      newDots.push(dot);
    }

    this.holder.appendChild(fragment);
    this.dots = this.dots.concat(newDots);
  };

  PageDots.prototype.removeDots = function (count) {
    // remove from this.dots collection
    var removeDots = this.dots.splice(this.dots.length - count, count); // remove from DOM

    removeDots.forEach(function (dot) {
      this.holder.removeChild(dot);
    }, this);
  };

  PageDots.prototype.updateSelected = function () {
    // remove selected class on previous
    if (this.selectedDot) {
      this.selectedDot.className = 'dot';
      this.selectedDot.removeAttribute('aria-current');
    } // don't proceed if no dots


    if (!this.dots.length) {
      return;
    }

    this.selectedDot = this.dots[this.parent.selectedIndex];
    this.selectedDot.className = 'dot is-selected';
    this.selectedDot.setAttribute('aria-current', 'step');
  };

  PageDots.prototype.onTap = // old method name, backwards-compatible
  PageDots.prototype.onClick = function (event) {
    var target = event.target; // only care about dot clicks

    if (target.nodeName != 'LI') {
      return;
    }

    this.parent.uiChange();
    var index = this.dots.indexOf(target);
    this.parent.select(index);
  };

  PageDots.prototype.destroy = function () {
    this.deactivate();
    this.allOff();
  };

  Flickity.PageDots = PageDots; // -------------------------- Flickity -------------------------- //

  utils.extend(Flickity.defaults, {
    pageDots: true
  });
  Flickity.createMethods.push('_createPageDots');
  var proto = Flickity.prototype;

  proto._createPageDots = function () {
    if (!this.options.pageDots) {
      return;
    }

    this.pageDots = new PageDots(this); // events

    this.on('activate', this.activatePageDots);
    this.on('select', this.updateSelectedPageDots);
    this.on('cellChange', this.updatePageDots);
    this.on('resize', this.updatePageDots);
    this.on('deactivate', this.deactivatePageDots);
  };

  proto.activatePageDots = function () {
    this.pageDots.activate();
  };

  proto.updateSelectedPageDots = function () {
    this.pageDots.updateSelected();
  };

  proto.updatePageDots = function () {
    this.pageDots.setDots();
  };

  proto.deactivatePageDots = function () {
    this.pageDots.deactivate();
  }; // -----  ----- //


  Flickity.PageDots = PageDots;
  return Flickity;
}); // player & autoPlay


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('flickity/js/player', ['ev-emitter/ev-emitter', 'fizzy-ui-utils/utils', './flickity'], function (EvEmitter, utils, Flickity) {
      return factory(EvEmitter, utils, Flickity);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(require('ev-emitter'), require('fizzy-ui-utils'), require('./flickity'));
  } else {
    // browser global
    factory(window.EvEmitter, window.fizzyUIUtils, window.Flickity);
  }
})(window, function factory(EvEmitter, utils, Flickity) {
  // -------------------------- Player -------------------------- //
  function Player(parent) {
    this.parent = parent;
    this.state = 'stopped'; // visibility change event handler

    this.onVisibilityChange = this.visibilityChange.bind(this);
    this.onVisibilityPlay = this.visibilityPlay.bind(this);
  }

  Player.prototype = Object.create(EvEmitter.prototype); // start play

  Player.prototype.play = function () {
    if (this.state == 'playing') {
      return;
    } // do not play if page is hidden, start playing when page is visible


    var isPageHidden = document.hidden;

    if (isPageHidden) {
      document.addEventListener('visibilitychange', this.onVisibilityPlay);
      return;
    }

    this.state = 'playing'; // listen to visibility change

    document.addEventListener('visibilitychange', this.onVisibilityChange); // start ticking

    this.tick();
  };

  Player.prototype.tick = function () {
    // do not tick if not playing
    if (this.state != 'playing') {
      return;
    }

    var time = this.parent.options.autoPlay; // default to 3 seconds

    time = typeof time == 'number' ? time : 3000;

    var _this = this; // HACK: reset ticks if stopped and started within interval


    this.clear();
    this.timeout = setTimeout(function () {
      _this.parent.next(true);

      _this.tick();
    }, time);
  };

  Player.prototype.stop = function () {
    this.state = 'stopped';
    this.clear(); // remove visibility change event

    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  };

  Player.prototype.clear = function () {
    clearTimeout(this.timeout);
  };

  Player.prototype.pause = function () {
    if (this.state == 'playing') {
      this.state = 'paused';
      this.clear();
    }
  };

  Player.prototype.unpause = function () {
    // re-start play if paused
    if (this.state == 'paused') {
      this.play();
    }
  }; // pause if page visibility is hidden, unpause if visible


  Player.prototype.visibilityChange = function () {
    var isPageHidden = document.hidden;
    this[isPageHidden ? 'pause' : 'unpause']();
  };

  Player.prototype.visibilityPlay = function () {
    this.play();
    document.removeEventListener('visibilitychange', this.onVisibilityPlay);
  }; // -------------------------- Flickity -------------------------- //


  utils.extend(Flickity.defaults, {
    pauseAutoPlayOnHover: true
  });
  Flickity.createMethods.push('_createPlayer');
  var proto = Flickity.prototype;

  proto._createPlayer = function () {
    this.player = new Player(this);
    this.on('activate', this.activatePlayer);
    this.on('uiChange', this.stopPlayer);
    this.on('pointerDown', this.stopPlayer);
    this.on('deactivate', this.deactivatePlayer);
  };

  proto.activatePlayer = function () {
    if (!this.options.autoPlay) {
      return;
    }

    this.player.play();
    this.element.addEventListener('mouseenter', this);
  }; // Player API, don't hate the ... thanks I know where the door is


  proto.playPlayer = function () {
    this.player.play();
  };

  proto.stopPlayer = function () {
    this.player.stop();
  };

  proto.pausePlayer = function () {
    this.player.pause();
  };

  proto.unpausePlayer = function () {
    this.player.unpause();
  };

  proto.deactivatePlayer = function () {
    this.player.stop();
    this.element.removeEventListener('mouseenter', this);
  }; // ----- mouseenter/leave ----- //
  // pause auto-play on hover


  proto.onmouseenter = function () {
    if (!this.options.pauseAutoPlayOnHover) {
      return;
    }

    this.player.pause();
    this.element.addEventListener('mouseleave', this);
  }; // resume auto-play on hover off


  proto.onmouseleave = function () {
    this.player.unpause();
    this.element.removeEventListener('mouseleave', this);
  }; // -----  ----- //


  Flickity.Player = Player;
  return Flickity;
}); // add, remove cell


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('flickity/js/add-remove-cell', ['./flickity', 'fizzy-ui-utils/utils'], function (Flickity, utils) {
      return factory(window, Flickity, utils);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('./flickity'), require('fizzy-ui-utils'));
  } else {
    // browser global
    factory(window, window.Flickity, window.fizzyUIUtils);
  }
})(window, function factory(window, Flickity, utils) {
  // append cells to a document fragment
  function getCellsFragment(cells) {
    var fragment = document.createDocumentFragment();
    cells.forEach(function (cell) {
      fragment.appendChild(cell.element);
    });
    return fragment;
  } // -------------------------- add/remove cell prototype -------------------------- //


  var proto = Flickity.prototype;
  /**
   * Insert, prepend, or append cells
   * @param {Element, Array, NodeList} elems
   * @param {Integer} index
   */

  proto.insert = function (elems, index) {
    var cells = this._makeCells(elems);

    if (!cells || !cells.length) {
      return;
    }

    var len = this.cells.length; // default to append

    index = index === undefined ? len : index; // add cells with document fragment

    var fragment = getCellsFragment(cells); // append to slider

    var isAppend = index == len;

    if (isAppend) {
      this.slider.appendChild(fragment);
    } else {
      var insertCellElement = this.cells[index].element;
      this.slider.insertBefore(fragment, insertCellElement);
    } // add to this.cells


    if (index === 0) {
      // prepend, add to start
      this.cells = cells.concat(this.cells);
    } else if (isAppend) {
      // append, add to end
      this.cells = this.cells.concat(cells);
    } else {
      // insert in this.cells
      var endCells = this.cells.splice(index, len - index);
      this.cells = this.cells.concat(cells).concat(endCells);
    }

    this._sizeCells(cells);

    this.cellChange(index, true);
  };

  proto.append = function (elems) {
    this.insert(elems, this.cells.length);
  };

  proto.prepend = function (elems) {
    this.insert(elems, 0);
  };
  /**
   * Remove cells
   * @param {Element, Array, NodeList} elems
   */


  proto.remove = function (elems) {
    var cells = this.getCells(elems);

    if (!cells || !cells.length) {
      return;
    }

    var minCellIndex = this.cells.length - 1; // remove cells from collection & DOM

    cells.forEach(function (cell) {
      cell.remove();
      var index = this.cells.indexOf(cell);
      minCellIndex = Math.min(index, minCellIndex);
      utils.removeFrom(this.cells, cell);
    }, this);
    this.cellChange(minCellIndex, true);
  };
  /**
   * logic to be run after a cell's size changes
   * @param {Element} elem - cell's element
   */


  proto.cellSizeChange = function (elem) {
    var cell = this.getCell(elem);

    if (!cell) {
      return;
    }

    cell.getSize();
    var index = this.cells.indexOf(cell);
    this.cellChange(index);
  };
  /**
   * logic any time a cell is changed: added, removed, or size changed
   * @param {Integer} changedCellIndex - index of the changed cell, optional
   */


  proto.cellChange = function (changedCellIndex, isPositioningSlider) {
    var prevSelectedElem = this.selectedElement;

    this._positionCells(changedCellIndex);

    this._getWrapShiftCells();

    this.setGallerySize(); // update selectedIndex
    // try to maintain position & select previous selected element

    var cell = this.getCell(prevSelectedElem);

    if (cell) {
      this.selectedIndex = this.getCellSlideIndex(cell);
    }

    this.selectedIndex = Math.min(this.slides.length - 1, this.selectedIndex);
    this.emitEvent('cellChange', [changedCellIndex]); // position slider

    this.select(this.selectedIndex); // do not position slider after lazy load

    if (isPositioningSlider) {
      this.positionSliderAtSelected();
    }
  }; // -----  ----- //


  return Flickity;
}); // lazyload


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('flickity/js/lazyload', ['./flickity', 'fizzy-ui-utils/utils'], function (Flickity, utils) {
      return factory(window, Flickity, utils);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('./flickity'), require('fizzy-ui-utils'));
  } else {
    // browser global
    factory(window, window.Flickity, window.fizzyUIUtils);
  }
})(window, function factory(window, Flickity, utils) {
  'use strict';

  Flickity.createMethods.push('_createLazyload');
  var proto = Flickity.prototype;

  proto._createLazyload = function () {
    this.on('select', this.lazyLoad);
  };

  proto.lazyLoad = function () {
    var lazyLoad = this.options.lazyLoad;

    if (!lazyLoad) {
      return;
    } // get adjacent cells, use lazyLoad option for adjacent count


    var adjCount = typeof lazyLoad == 'number' ? lazyLoad : 0;
    var cellElems = this.getAdjacentCellElements(adjCount); // get lazy images in those cells

    var lazyImages = [];
    cellElems.forEach(function (cellElem) {
      var lazyCellImages = getCellLazyImages(cellElem);
      lazyImages = lazyImages.concat(lazyCellImages);
    }); // load lazy images

    lazyImages.forEach(function (img) {
      new LazyLoader(img, this);
    }, this);
  };

  function getCellLazyImages(cellElem) {
    // check if cell element is lazy image
    if (cellElem.nodeName == 'IMG') {
      var lazyloadAttr = cellElem.getAttribute('data-flickity-lazyload');
      var srcAttr = cellElem.getAttribute('data-flickity-lazyload-src');
      var srcsetAttr = cellElem.getAttribute('data-flickity-lazyload-srcset');

      if (lazyloadAttr || srcAttr || srcsetAttr) {
        return [cellElem];
      }
    } // select lazy images in cell


    var lazySelector = 'img[data-flickity-lazyload], ' + 'img[data-flickity-lazyload-src], img[data-flickity-lazyload-srcset]';
    var imgs = cellElem.querySelectorAll(lazySelector);
    return utils.makeArray(imgs);
  } // -------------------------- LazyLoader -------------------------- //

  /**
   * class to handle loading images
   */


  function LazyLoader(img, flickity) {
    this.img = img;
    this.flickity = flickity;
    this.load();
  }

  LazyLoader.prototype.handleEvent = utils.handleEvent;

  LazyLoader.prototype.load = function () {
    this.img.addEventListener('load', this);
    this.img.addEventListener('error', this); // get src & srcset

    var src = this.img.getAttribute('data-flickity-lazyload') || this.img.getAttribute('data-flickity-lazyload-src');
    var srcset = this.img.getAttribute('data-flickity-lazyload-srcset'); // set src & serset

    this.img.src = src;

    if (srcset) {
      this.img.setAttribute('srcset', srcset);
    } // remove attr


    this.img.removeAttribute('data-flickity-lazyload');
    this.img.removeAttribute('data-flickity-lazyload-src');
    this.img.removeAttribute('data-flickity-lazyload-srcset');
  };

  LazyLoader.prototype.onload = function (event) {
    this.complete(event, 'flickity-lazyloaded');
  };

  LazyLoader.prototype.onerror = function (event) {
    this.complete(event, 'flickity-lazyerror');
  };

  LazyLoader.prototype.complete = function (event, className) {
    // unbind events
    this.img.removeEventListener('load', this);
    this.img.removeEventListener('error', this);
    var cell = this.flickity.getParentCell(this.img);
    var cellElem = cell && cell.element;
    this.flickity.cellSizeChange(cellElem);
    this.img.classList.add(className);
    this.flickity.dispatchEvent('lazyLoad', event, cellElem);
  }; // -----  ----- //


  Flickity.LazyLoader = LazyLoader;
  return Flickity;
});
/*!
 * Flickity v2.2.0
 * Touch, responsive, flickable carousels
 *
 * Licensed GPLv3 for open source use
 * or Flickity Commercial License for commercial use
 *
 * https://flickity.metafizzy.co
 * Copyright 2015-2018 Metafizzy
 */


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('flickity/js/index', ['./flickity', './drag', './prev-next-button', './page-dots', './player', './add-remove-cell', './lazyload'], factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(require('./flickity'), require('./drag'), require('./prev-next-button'), require('./page-dots'), require('./player'), require('./add-remove-cell'), require('./lazyload'));
  }
})(window, function factory(Flickity) {
  /*jshint strict: false*/
  return Flickity;
});
/*!
 * Flickity asNavFor v2.0.1
 * enable asNavFor for Flickity
 */

/*jshint browser: true, undef: true, unused: true, strict: true*/


(function (window, factory) {
  // universal module definition

  /*jshint strict: false */

  /*globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('flickity-as-nav-for/as-nav-for', ['flickity/js/index', 'fizzy-ui-utils/utils'], factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(require('flickity'), require('fizzy-ui-utils'));
  } else {
    // browser global
    window.Flickity = factory(window.Flickity, window.fizzyUIUtils);
  }
})(window, function factory(Flickity, utils) {
  // -------------------------- asNavFor prototype -------------------------- //
  // Flickity.defaults.asNavFor = null;
  Flickity.createMethods.push('_createAsNavFor');
  var proto = Flickity.prototype;

  proto._createAsNavFor = function () {
    this.on('activate', this.activateAsNavFor);
    this.on('deactivate', this.deactivateAsNavFor);
    this.on('destroy', this.destroyAsNavFor);
    var asNavForOption = this.options.asNavFor;

    if (!asNavForOption) {
      return;
    } // HACK do async, give time for other flickity to be initalized


    var _this = this;

    setTimeout(function initNavCompanion() {
      _this.setNavCompanion(asNavForOption);
    });
  };

  proto.setNavCompanion = function (elem) {
    elem = utils.getQueryElement(elem);
    var companion = Flickity.data(elem); // stop if no companion or companion is self

    if (!companion || companion == this) {
      return;
    }

    this.navCompanion = companion; // companion select

    var _this = this;

    this.onNavCompanionSelect = function () {
      _this.navCompanionSelect();
    };

    companion.on('select', this.onNavCompanionSelect); // click

    this.on('staticClick', this.onNavStaticClick);
    this.navCompanionSelect(true);
  };

  proto.navCompanionSelect = function (isInstant) {
    if (!this.navCompanion) {
      return;
    } // select slide that matches first cell of slide


    var selectedCell = this.navCompanion.selectedCells[0];
    var firstIndex = this.navCompanion.cells.indexOf(selectedCell);
    var lastIndex = firstIndex + this.navCompanion.selectedCells.length - 1;
    var selectIndex = Math.floor(lerp(firstIndex, lastIndex, this.navCompanion.cellAlign));
    this.selectCell(selectIndex, false, isInstant); // set nav selected class

    this.removeNavSelectedElements(); // stop if companion has more cells than this one

    if (selectIndex >= this.cells.length) {
      return;
    }

    var selectedCells = this.cells.slice(firstIndex, lastIndex + 1);
    this.navSelectedElements = selectedCells.map(function (cell) {
      return cell.element;
    });
    this.changeNavSelectedClass('add');
  };

  function lerp(a, b, t) {
    return (b - a) * t + a;
  }

  proto.changeNavSelectedClass = function (method) {
    this.navSelectedElements.forEach(function (navElem) {
      navElem.classList[method]('is-nav-selected');
    });
  };

  proto.activateAsNavFor = function () {
    this.navCompanionSelect(true);
  };

  proto.removeNavSelectedElements = function () {
    if (!this.navSelectedElements) {
      return;
    }

    this.changeNavSelectedClass('remove');
    delete this.navSelectedElements;
  };

  proto.onNavStaticClick = function (event, pointer, cellElement, cellIndex) {
    if (typeof cellIndex == 'number') {
      this.navCompanion.selectCell(cellIndex);
    }
  };

  proto.deactivateAsNavFor = function () {
    this.removeNavSelectedElements();
  };

  proto.destroyAsNavFor = function () {
    if (!this.navCompanion) {
      return;
    }

    this.navCompanion.off('select', this.onNavCompanionSelect);
    this.off('staticClick', this.onNavStaticClick);
    delete this.navCompanion;
  }; // -----  ----- //


  return Flickity;
});
/*!
 * imagesLoaded v4.1.4
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */


(function (window, factory) {
  'use strict'; // universal module definition

  /*global define: false, module: false, require: false */

  if (typeof define == 'function' && define.amd) {
    // AMD
    define('imagesloaded/imagesloaded', ['ev-emitter/ev-emitter'], function (EvEmitter) {
      return factory(window, EvEmitter);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('ev-emitter'));
  } else {
    // browser global
    window.imagesLoaded = factory(window, window.EvEmitter);
  }
})(typeof window !== 'undefined' ? window : void 0, // --------------------------  factory -------------------------- //
function factory(window, EvEmitter) {
  var $ = window.jQuery;
  var console = window.console; // -------------------------- helpers -------------------------- //
  // extend objects

  function extend(a, b) {
    for (var prop in b) {
      a[prop] = b[prop];
    }

    return a;
  }

  var arraySlice = Array.prototype.slice; // turn element or nodeList into an array

  function makeArray(obj) {
    if (Array.isArray(obj)) {
      // use object if already an array
      return obj;
    }

    var isArrayLike = _typeof(obj) == 'object' && typeof obj.length == 'number';

    if (isArrayLike) {
      // convert nodeList to array
      return arraySlice.call(obj);
    } // array of single index


    return [obj];
  } // -------------------------- imagesLoaded -------------------------- //

  /**
   * @param {Array, Element, NodeList, String} elem
   * @param {Object or Function} options - if function, use as callback
   * @param {Function} onAlways - callback function
   */


  function ImagesLoaded(elem, options, onAlways) {
    // coerce ImagesLoaded() without new, to be new ImagesLoaded()
    if (!(this instanceof ImagesLoaded)) {
      return new ImagesLoaded(elem, options, onAlways);
    } // use elem as selector string


    var queryElem = elem;

    if (typeof elem == 'string') {
      queryElem = document.querySelectorAll(elem);
    } // bail if bad element


    if (!queryElem) {
      console.error('Bad element for imagesLoaded ' + (queryElem || elem));
      return;
    }

    this.elements = makeArray(queryElem);
    this.options = extend({}, this.options); // shift arguments if no options set

    if (typeof options == 'function') {
      onAlways = options;
    } else {
      extend(this.options, options);
    }

    if (onAlways) {
      this.on('always', onAlways);
    }

    this.getImages();

    if ($) {
      // add jQuery Deferred object
      this.jqDeferred = new $.Deferred();
    } // HACK check async to allow time to bind listeners


    setTimeout(this.check.bind(this));
  }

  ImagesLoaded.prototype = Object.create(EvEmitter.prototype);
  ImagesLoaded.prototype.options = {};

  ImagesLoaded.prototype.getImages = function () {
    this.images = []; // filter & find items if we have an item selector

    this.elements.forEach(this.addElementImages, this);
  };
  /**
   * @param {Node} element
   */


  ImagesLoaded.prototype.addElementImages = function (elem) {
    // filter siblings
    if (elem.nodeName == 'IMG') {
      this.addImage(elem);
    } // get background image on element


    if (this.options.background === true) {
      this.addElementBackgroundImages(elem);
    } // find children
    // no non-element nodes, #143


    var nodeType = elem.nodeType;

    if (!nodeType || !elementNodeTypes[nodeType]) {
      return;
    }

    var childImgs = elem.querySelectorAll('img'); // concat childElems to filterFound array

    for (var i = 0; i < childImgs.length; i++) {
      var img = childImgs[i];
      this.addImage(img);
    } // get child background images


    if (typeof this.options.background == 'string') {
      var children = elem.querySelectorAll(this.options.background);

      for (i = 0; i < children.length; i++) {
        var child = children[i];
        this.addElementBackgroundImages(child);
      }
    }
  };

  var elementNodeTypes = {
    1: true,
    9: true,
    11: true
  };

  ImagesLoaded.prototype.addElementBackgroundImages = function (elem) {
    var style = getComputedStyle(elem);

    if (!style) {
      // Firefox returns null if in a hidden iframe https://bugzil.la/548397
      return;
    } // get url inside url("...")


    var reURL = /url\((['"])?(.*?)\1\)/gi;
    var matches = reURL.exec(style.backgroundImage);

    while (matches !== null) {
      var url = matches && matches[2];

      if (url) {
        this.addBackground(url, elem);
      }

      matches = reURL.exec(style.backgroundImage);
    }
  };
  /**
   * @param {Image} img
   */


  ImagesLoaded.prototype.addImage = function (img) {
    var loadingImage = new LoadingImage(img);
    this.images.push(loadingImage);
  };

  ImagesLoaded.prototype.addBackground = function (url, elem) {
    var background = new Background(url, elem);
    this.images.push(background);
  };

  ImagesLoaded.prototype.check = function () {
    var _this = this;

    this.progressedCount = 0;
    this.hasAnyBroken = false; // complete if no images

    if (!this.images.length) {
      this.complete();
      return;
    }

    function onProgress(image, elem, message) {
      // HACK - Chrome triggers event before object properties have changed. #83
      setTimeout(function () {
        _this.progress(image, elem, message);
      });
    }

    this.images.forEach(function (loadingImage) {
      loadingImage.once('progress', onProgress);
      loadingImage.check();
    });
  };

  ImagesLoaded.prototype.progress = function (image, elem, message) {
    this.progressedCount++;
    this.hasAnyBroken = this.hasAnyBroken || !image.isLoaded; // progress event

    this.emitEvent('progress', [this, image, elem]);

    if (this.jqDeferred && this.jqDeferred.notify) {
      this.jqDeferred.notify(this, image);
    } // check if completed


    if (this.progressedCount == this.images.length) {
      this.complete();
    }

    if (this.options.debug && console) {
      console.log('progress: ' + message, image, elem);
    }
  };

  ImagesLoaded.prototype.complete = function () {
    var eventName = this.hasAnyBroken ? 'fail' : 'done';
    this.isComplete = true;
    this.emitEvent(eventName, [this]);
    this.emitEvent('always', [this]);

    if (this.jqDeferred) {
      var jqMethod = this.hasAnyBroken ? 'reject' : 'resolve';
      this.jqDeferred[jqMethod](this);
    }
  }; // --------------------------  -------------------------- //


  function LoadingImage(img) {
    this.img = img;
  }

  LoadingImage.prototype = Object.create(EvEmitter.prototype);

  LoadingImage.prototype.check = function () {
    // If complete is true and browser supports natural sizes,
    // try to check for image status manually.
    var isComplete = this.getIsImageComplete();

    if (isComplete) {
      // report based on naturalWidth
      this.confirm(this.img.naturalWidth !== 0, 'naturalWidth');
      return;
    } // If none of the checks above matched, simulate loading on detached element.


    this.proxyImage = new Image();
    this.proxyImage.addEventListener('load', this);
    this.proxyImage.addEventListener('error', this); // bind to image as well for Firefox. #191

    this.img.addEventListener('load', this);
    this.img.addEventListener('error', this);
    this.proxyImage.src = this.img.src;
  };

  LoadingImage.prototype.getIsImageComplete = function () {
    // check for non-zero, non-undefined naturalWidth
    // fixes Safari+InfiniteScroll+Masonry bug infinite-scroll#671
    return this.img.complete && this.img.naturalWidth;
  };

  LoadingImage.prototype.confirm = function (isLoaded, message) {
    this.isLoaded = isLoaded;
    this.emitEvent('progress', [this, this.img, message]);
  }; // ----- events ----- //
  // trigger specified handler for event type


  LoadingImage.prototype.handleEvent = function (event) {
    var method = 'on' + event.type;

    if (this[method]) {
      this[method](event);
    }
  };

  LoadingImage.prototype.onload = function () {
    this.confirm(true, 'onload');
    this.unbindEvents();
  };

  LoadingImage.prototype.onerror = function () {
    this.confirm(false, 'onerror');
    this.unbindEvents();
  };

  LoadingImage.prototype.unbindEvents = function () {
    this.proxyImage.removeEventListener('load', this);
    this.proxyImage.removeEventListener('error', this);
    this.img.removeEventListener('load', this);
    this.img.removeEventListener('error', this);
  }; // -------------------------- Background -------------------------- //


  function Background(url, element) {
    this.url = url;
    this.element = element;
    this.img = new Image();
  } // inherit LoadingImage prototype


  Background.prototype = Object.create(LoadingImage.prototype);

  Background.prototype.check = function () {
    this.img.addEventListener('load', this);
    this.img.addEventListener('error', this);
    this.img.src = this.url; // check if image is already complete

    var isComplete = this.getIsImageComplete();

    if (isComplete) {
      this.confirm(this.img.naturalWidth !== 0, 'naturalWidth');
      this.unbindEvents();
    }
  };

  Background.prototype.unbindEvents = function () {
    this.img.removeEventListener('load', this);
    this.img.removeEventListener('error', this);
  };

  Background.prototype.confirm = function (isLoaded, message) {
    this.isLoaded = isLoaded;
    this.emitEvent('progress', [this, this.element, message]);
  }; // -------------------------- jQuery -------------------------- //


  ImagesLoaded.makeJQueryPlugin = function (jQuery) {
    jQuery = jQuery || window.jQuery;

    if (!jQuery) {
      return;
    } // set local variable


    $ = jQuery; // $().imagesLoaded()

    $.fn.imagesLoaded = function (options, callback) {
      var instance = new ImagesLoaded(this, options, callback);
      return instance.jqDeferred.promise($(this));
    };
  }; // try making plugin


  ImagesLoaded.makeJQueryPlugin(); // --------------------------  -------------------------- //

  return ImagesLoaded;
});
/*!
 * Flickity imagesLoaded v2.0.0
 * enables imagesLoaded option for Flickity
 */

/*jshint browser: true, strict: true, undef: true, unused: true */


(function (window, factory) {
  // universal module definition

  /*jshint strict: false */

  /*globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define(['flickity/js/index', 'imagesloaded/imagesloaded'], function (Flickity, imagesLoaded) {
      return factory(window, Flickity, imagesLoaded);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('flickity'), require('imagesloaded'));
  } else {
    // browser global
    window.Flickity = factory(window, window.Flickity, window.imagesLoaded);
  }
})(window, function factory(window, Flickity, imagesLoaded) {
  'use strict';

  Flickity.createMethods.push('_createImagesLoaded');
  var proto = Flickity.prototype;

  proto._createImagesLoaded = function () {
    this.on('activate', this.imagesLoaded);
  };

  proto.imagesLoaded = function () {
    if (!this.options.imagesLoaded) {
      return;
    }

    var _this = this;

    function onImagesLoadedProgress(instance, image) {
      var cell = _this.getParentCell(image.img);

      _this.cellSizeChange(cell && cell.element);

      if (!_this.options.freeScroll) {
        _this.positionSliderAtSelected();
      }
    }

    imagesLoaded(this.slider).on('progress', onImagesLoadedProgress);
  };

  return Flickity;
});;"use strict";

/*
 * Copyright (c) 2013 Shane Carr
 *
 * https://github.com/vote539/placeholdr
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function ($, ns, placeholderAttribute, origValFn) {
  // Utility functions
  var putPlaceholder = function putPlaceholder() {
    var $this = $(this);

    if (!$this[origValFn]()) {
      $this.addClass(ns);

      if ($this.attr("type") === "password") {
        $this.attr("type", "text");
        $this.data(ns + "-pwd", true);
      }

      $this[origValFn]($this.attr(placeholderAttribute));
    }
  };

  var clearPlaceholder = function clearPlaceholder() {
    var $this = $(this);
    $this.removeClass(ns);

    if ($this.data(ns + "-pwd")) {
      $this.attr("type", "password");
    }

    if ($this[origValFn]() === $this.attr(placeholderAttribute)) {
      $this[origValFn]("");
    }
  };

  var clearPlaceholdersInForm = function clearPlaceholdersInForm() {
    $(this).find("[" + placeholderAttribute + "]").each(function () {
      if ($(this).data(ns)) clearPlaceholder.call(this);
    });
  };

  $.fn.placeholdr = function () {
    // Don't evaluate the polyfill if the browser supports placeholders
    if (placeholderAttribute in document.createElement("input")) return this; // Find and iterate through all inputs that have a placeholder attribute

    $(this).find("[" + placeholderAttribute + "]").each(function () {
      var $this = $(this); // leave now if we've polyfilled this element before

      if ($this.data(ns)) return;
      $this.data(ns, true); // put the placeholder into the value

      putPlaceholder.call(this); // handle focus and blur events

      $this.focus(clearPlaceholder);
      $this.blur(putPlaceholder);
    }); // Find and iterate through all form elements in order to prevent
    // placeholders from being submitted in forms.

    $(this).find("form").each(function () {
      var $this = $(this); // leave now if we've polyfilled this element before

      if ($this.data(ns)) return;
      $this.data(ns, true);
      $this.submit(clearPlaceholdersInForm);
    });
    return this;
  }; // Overwrite the existing jQuery val() function


  $.fn[origValFn] = $.fn.val;

  $.fn.val = function (txt) {
    var $this = $(this);

    if ($.type(txt) === "undefined" && $this.data(ns) && $this[origValFn]() === $this.attr(placeholderAttribute)) {
      return "";
    }

    var isstr = $.type(txt) === "string";

    if (isstr) {
      clearPlaceholder.call(this);
    }

    var ret = $.fn[origValFn].apply(this, arguments);

    if (isstr && !txt) {
      putPlaceholder.call(this);
    }

    return ret;
  }; // Evaluate the script on page ready


  $(function () {
    $(document).placeholdr();
  }); // Add default CSS rule

  document.write("<style>.placeholdr{color:#AAA;}</style>");
})(jQuery, "placeholdr", "placeholder", "placeholdrVal");;!function (root, name, make) {
  if (typeof module != 'undefined' && module['exports']) module['exports'] = make();else root[name] = make();
}(this, 'verge', function () {
  var xports = {},
      win = typeof window != 'undefined' && window,
      doc = typeof document != 'undefined' && document,
      docElem = doc && doc.documentElement,
      matchMedia = win['matchMedia'] || win['msMatchMedia'],
      mq = matchMedia ? function (q) {
    return !!matchMedia.call(win, q).matches;
  } : function () {
    return false;
  },
      viewportW = xports['viewportW'] = function () {
    var a = docElem['clientWidth'],
        b = win['innerWidth'];
    return a < b ? b : a;
  },
      viewportH = xports['viewportH'] = function () {
    var a = docElem['clientHeight'],
        b = win['innerHeight'];
    return a < b ? b : a;
  };
  /**
   * Test if a media query is active. Like Modernizr.mq
   * @since 1.6.0
   * @return {boolean}
   */


  xports['mq'] = mq;
  /**
   * Normalized matchMedia
   * @since 1.6.0
   * @return {MediaQueryList|Object}
   */

  xports['matchMedia'] = matchMedia ? function () {
    // matchMedia must be binded to window
    return matchMedia.apply(win, arguments);
  } : function () {
    // Gracefully degrade to plain object
    return {};
  };
  /**
   * @since 1.8.0
   * @return {{width:number, height:number}}
   */

  function viewport() {
    return {
      'width': viewportW(),
      'height': viewportH()
    };
  }

  xports['viewport'] = viewport;
  /**
   * Cross-browser window.scrollX
   * @since 1.0.0
   * @return {number}
   */

  xports['scrollX'] = function () {
    return win.pageXOffset || docElem.scrollLeft;
  };
  /**
   * Cross-browser window.scrollY
   * @since 1.0.0
   * @return {number}
   */


  xports['scrollY'] = function () {
    return win.pageYOffset || docElem.scrollTop;
  };
  /**
   * @param {{top:number, right:number, bottom:number, left:number}} coords
   * @param {number=} cushion adjustment
   * @return {Object}
   */


  function calibrate(coords, cushion) {
    var o = {};
    cushion = +cushion || 0;
    o['width'] = (o['right'] = coords['right'] + cushion) - (o['left'] = coords['left'] - cushion);
    o['height'] = (o['bottom'] = coords['bottom'] + cushion) - (o['top'] = coords['top'] - cushion);
    return o;
  }
  /**
   * Cross-browser element.getBoundingClientRect plus optional cushion.
   * Coords are relative to the top-left corner of the viewport.
   * @since 1.0.0
   * @param {Element|Object} el element or stack (uses first item)
   * @param {number=} cushion +/- pixel adjustment amount
   * @return {Object|boolean}
   */


  function rectangle(el, cushion) {
    el = el && !el.nodeType ? el[0] : el;
    if (!el || 1 !== el.nodeType) return false;
    return calibrate(el.getBoundingClientRect(), cushion);
  }

  xports['rectangle'] = rectangle;
  /**
   * Get the viewport aspect ratio (or the aspect ratio of an object or element)
   * @since 1.7.0
   * @param {(Element|Object)=} o optional object with width/height props or methods
   * @return {number}
   * @link http://w3.org/TR/css3-mediaqueries/#orientation
   */

  function aspect(o) {
    o = null == o ? viewport() : 1 === o.nodeType ? rectangle(o) : o;
    var h = o['height'],
        w = o['width'];
    h = typeof h == 'function' ? h.call(o) : h;
    w = typeof w == 'function' ? w.call(o) : w;
    return w / h;
  }

  xports['aspect'] = aspect;
  /**
   * Test if an element is in the same x-axis section as the viewport.
   * @since 1.0.0
   * @param {Element|Object} el
   * @param {number=} cushion
   * @return {boolean}
   */

  xports['inX'] = function (el, cushion) {
    var r = rectangle(el, cushion);
    return !!r && r.right >= 0 && r.left <= viewportW();
  };
  /**
   * Test if an element is in the same y-axis section as the viewport.
   * @since 1.0.0
   * @param {Element|Object} el
   * @param {number=} cushion
   * @return {boolean}
   */


  xports['inY'] = function (el, cushion) {
    var r = rectangle(el, cushion);
    return !!r && r.bottom >= 0 && r.top <= viewportH();
  };
  /**
   * Test if an element is in the viewport.
   * @since 1.0.0
   * @param {Element|Object} el
   * @param {number=} cushion
   * @return {boolean}
   */


  xports['inViewport'] = function (el, cushion) {
    // Equiv to `inX(el, cushion) && inY(el, cushion)` but just manually do both
    // to avoid calling rectangle() twice. It gzips just as small like this.
    var r = rectangle(el, cushion);
    return !!r && r.bottom >= 0 && r.right >= 0 && r.top <= viewportH() && r.left <= viewportW();
  };

  return xports;
});;"use strict";

/**
 * Pure JavaScript implementation of zoom.js.
 *
 * Original preamble:
 * zoom.js - It's the best way to zoom an image
 * @version v0.0.2
 * @link https://github.com/fat/zoom.js
 * @license MIT
 *
 * This is a fork of the original zoom.js implementation by @fat.
 * Copyrights for the original project are held by @fat. All other copyright
 * for changes in the fork are held by Nishanth Shanmugham.
 *
 * Copyright (c) 2013 @fat
 * The MIT License. Copyright © 2016 Nishanth Shanmugham.
 */
(function () {
  "use strict";

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  (function (modules) {
    var installedModules = {};

    function __webpack_require__(moduleId) {
      if (installedModules[moduleId]) return installedModules[moduleId].exports;
      var module = installedModules[moduleId] = {
        i: moduleId,
        l: false,
        exports: {}
      };
      modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
      module.l = true;
      return module.exports;
    }

    __webpack_require__.m = modules;
    __webpack_require__.c = installedModules;

    __webpack_require__.i = function (value) {
      return value;
    };

    __webpack_require__.d = function (exports, name, getter) {
      if (!__webpack_require__.o(exports, name)) {
        Object.defineProperty(exports, name, {
          configurable: false,
          enumerable: true,
          get: getter
        });
      }
    };

    __webpack_require__.n = function (module) {
      var getter = module && module.__esModule ? function getDefault() {
        return module["default"];
      } : function getModuleExports() {
        return module;
      };

      __webpack_require__.d(getter, "a", getter);

      return getter;
    };

    __webpack_require__.o = function (object, property) {
      return Object.prototype.hasOwnProperty.call(object, property);
    };

    __webpack_require__.p = "";
    return __webpack_require__(__webpack_require__.s = 3);
  })([function (module, exports, __webpack_require__) {
    "use strict";

    __webpack_require__.d(exports, "a", function () {
      return windowWidth;
    });

    __webpack_require__.d(exports, "b", function () {
      return windowHeight;
    });

    __webpack_require__.d(exports, "c", function () {
      return elemOffset;
    });

    __webpack_require__.d(exports, "d", function () {
      return once;
    });

    var windowWidth = function windowWidth() {
      return document.documentElement.clientWidth;
    };

    var windowHeight = function windowHeight() {
      return document.documentElement.clientHeight;
    };

    var elemOffset = function elemOffset(elem) {
      var rect = elem.getBoundingClientRect();
      var docElem = document.documentElement;
      var win = window;
      return {
        top: rect.top + win.pageYOffset - docElem.clientTop,
        left: rect.left + win.pageXOffset - docElem.clientLeft
      };
    };

    var once = function once(elem, type, handler) {
      var fn = function fn(e) {
        e.target.removeEventListener(type, fn);
        handler();
      };

      elem.addEventListener(type, fn);
    };
  }, function (module, exports, __webpack_require__) {
    "use strict";

    var __WEBPACK_IMPORTED_MODULE_0__zoom_image_js__ = __webpack_require__(2);

    var __WEBPACK_IMPORTED_MODULE_1__utils_js__ = __webpack_require__(0);

    __webpack_require__.d(exports, "a", function () {
      return zoom;
    });

    var current = null;
    var offset = 80;
    var initialScrollPos = -1;
    var initialTouchPos = -1;

    var setup = function setup(elem) {
      elem.addEventListener("click", prepareZoom);
    };

    var prepareZoom = function prepareZoom(e) {
      if (document.body.classList.contains("zoom-overlay-open")) {
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        window.open(e.target.getAttribute("data-original") || e.target.src, "_blank");
        return;
      }

      if (e.target.width >= __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__utils_js__["a"])() - offset) {
        return;
      }

      closeCurrent(true);
      current = new __WEBPACK_IMPORTED_MODULE_0__zoom_image_js__["a"](e.target, offset);
      current.zoom();
      addCloseListeners();
    };

    var closeCurrent = function closeCurrent(force) {
      if (current == null) {
        return;
      }

      if (force) {
        current.dispose();
      } else {
        current.close();
      }

      removeCloseListeners();
      current = null;
    };

    var addCloseListeners = function addCloseListeners() {
      document.addEventListener("scroll", handleScroll);
      document.addEventListener("keyup", handleKeyup);
      document.addEventListener("touchstart", handleTouchStart);
      document.addEventListener("click", handleClick, true);
    };

    var removeCloseListeners = function removeCloseListeners() {
      document.removeEventListener("scroll", handleScroll);
      document.removeEventListener("keyup", handleKeyup);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("click", handleClick, true);
    };

    var handleScroll = function handleScroll() {
      if (initialScrollPos == -1) {
        initialScrollPos = window.pageYOffset;
      }

      var deltaY = Math.abs(initialScrollPos - window.pageYOffset);

      if (deltaY >= 40) {
        closeCurrent();
      }
    };

    var handleKeyup = function handleKeyup(e) {
      if (e.keyCode == 27) {
        closeCurrent();
      }
    };

    var handleTouchStart = function handleTouchStart(e) {
      var t = e.touches[0];

      if (t == null) {
        return;
      }

      initialTouchPos = t.pageY;
      e.target.addEventListener("touchmove", handleTouchMove);
    };

    var handleTouchMove = function handleTouchMove(e) {
      var t = e.touches[0];

      if (t == null) {
        return;
      }

      if (Math.abs(t.pageY - initialTouchPos) > 10) {
        closeCurrent();
        e.target.removeEventListener("touchmove", handleTouchMove);
      }
    };

    var handleClick = function handleClick() {
      closeCurrent();
    };

    var zoom = Object.create(null);
    zoom.setup = setup;
  }, function (module, exports, __webpack_require__) {
    "use strict";

    var __WEBPACK_IMPORTED_MODULE_0__utils_js__ = __webpack_require__(0);

    var Size = function Size(w, h) {
      _classCallCheck(this, Size);

      this.w = w;
      this.h = h;
    };

    var ZoomImage = function () {
      function ZoomImage(img, offset) {
        _classCallCheck(this, ZoomImage);

        this.img = img;
        this.preservedTransform = img.style.transform;
        this.wrap = null;
        this.overlay = null;
        this.offset = offset;
      }

      _createClass(ZoomImage, [{
        key: "forceRepaint",
        value: function forceRepaint() {
          var _ = this.img.offsetWidth;
          return;
        }
      }, {
        key: "zoom",
        value: function zoom() {
          var size = new Size(this.img.naturalWidth, this.img.naturalHeight);
          this.wrap = document.createElement("div");
          this.wrap.classList.add("zoom-img-wrap");
          this.img.parentNode.insertBefore(this.wrap, this.img);
          this.wrap.appendChild(this.img);
          this.img.classList.add("zoom-img");
          this.img.setAttribute("data-action", "zoom-out");
          this.overlay = document.createElement("div");
          this.overlay.classList.add("zoom-overlay");
          document.body.appendChild(this.overlay);
          this.forceRepaint();
          var scale = this.calculateScale(size);
          this.forceRepaint();
          this.animate(scale);
          document.body.classList.add("zoom-overlay-open");
        }
      }, {
        key: "calculateScale",
        value: function calculateScale(size) {
          var maxScaleFactor = size.w / this.img.width;
          var viewportWidth = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__utils_js__["a"])() - this.offset;
          var viewportHeight = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__utils_js__["b"])() - this.offset;
          var imageAspectRatio = size.w / size.h;
          var viewportAspectRatio = viewportWidth / viewportHeight;

          if (size.w < viewportWidth && size.h < viewportHeight) {
            return maxScaleFactor;
          } else if (imageAspectRatio < viewportAspectRatio) {
            return viewportHeight / size.h * maxScaleFactor;
          } else {
            return viewportWidth / size.w * maxScaleFactor;
          }
        }
      }, {
        key: "animate",
        value: function animate(scale) {
          var imageOffset = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__utils_js__["c"])(this.img);

          var scrollTop = window.pageYOffset;
          var viewportX = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__utils_js__["a"])() / 2;
          var viewportY = scrollTop + __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__utils_js__["b"])() / 2;
          var imageCenterX = imageOffset.left + this.img.width / 2;
          var imageCenterY = imageOffset.top + this.img.height / 2;
          var tx = viewportX - imageCenterX;
          var ty = viewportY - imageCenterY;
          var tz = 0;
          var imgTr = "scale(" + scale + ")";
          var wrapTr = "translate3d(" + tx + "px, " + ty + "px, " + tz + "px)";
          this.img.style.transform = imgTr;
          this.wrap.style.transform = wrapTr;
        }
      }, {
        key: "dispose",
        value: function dispose() {
          if (this.wrap == null || this.wrap.parentNode == null) {
            return;
          }

          this.img.classList.remove("zoom-img");
          this.img.setAttribute("data-action", "zoom");
          this.wrap.parentNode.insertBefore(this.img, this.wrap);
          this.wrap.parentNode.removeChild(this.wrap);
          document.body.removeChild(this.overlay);
          document.body.classList.remove("zoom-overlay-transitioning");
        }
      }, {
        key: "close",
        value: function close() {
          var _this = this;

          document.body.classList.add("zoom-overlay-transitioning");
          this.img.style.transform = this.preservedTransform;

          if (this.img.style.length === 0) {
            this.img.removeAttribute("style");
          }

          this.wrap.style.transform = "none";

          __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__utils_js__["d"])(this.img, "transitionend", function () {
            _this.dispose();

            document.body.classList.remove("zoom-overlay-open");
          });
        }
      }]);

      return ZoomImage;
    }();

    exports["a"] = ZoomImage;
  }, function (module, exports, __webpack_require__) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var __WEBPACK_IMPORTED_MODULE_0__src_zoom_js__ = __webpack_require__(1);

    document.addEventListener("DOMContentLoaded", function () {
      var elems = document.querySelectorAll("img[data-action='zoom']");

      for (var i = 0; i < elems.length; i++) {
        __WEBPACK_IMPORTED_MODULE_0__src_zoom_js__["a"].setup(elems[i]);
      }
    });
  }]);
})();;"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*! picturefill - v3.0.2 - 2016-02-12
 * https://scottjehl.github.io/picturefill/
 * Copyright (c) 2016 https://github.com/scottjehl/picturefill/blob/master/Authors.txt; Licensed MIT
 */
!function (a) {
  var b = navigator.userAgent;
  a.HTMLPictureElement && /ecko/.test(b) && b.match(/rv\:(\d+)/) && RegExp.$1 < 45 && addEventListener("resize", function () {
    var b,
        c = document.createElement("source"),
        d = function d(a) {
      var b,
          d,
          e = a.parentNode;
      "PICTURE" === e.nodeName.toUpperCase() ? (b = c.cloneNode(), e.insertBefore(b, e.firstElementChild), setTimeout(function () {
        e.removeChild(b);
      })) : (!a._pfLastSize || a.offsetWidth > a._pfLastSize) && (a._pfLastSize = a.offsetWidth, d = a.sizes, a.sizes += ",100vw", setTimeout(function () {
        a.sizes = d;
      }));
    },
        e = function e() {
      var a,
          b = document.querySelectorAll("picture > img, img[srcset][sizes]");

      for (a = 0; a < b.length; a++) {
        d(b[a]);
      }
    },
        f = function f() {
      clearTimeout(b), b = setTimeout(e, 99);
    },
        g = a.matchMedia && matchMedia("(orientation: landscape)"),
        h = function h() {
      f(), g && g.addListener && g.addListener(f);
    };

    return c.srcset = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", /^[c|i]|d$/.test(document.readyState || "") ? h() : document.addEventListener("DOMContentLoaded", h), f;
  }());
}(window), function (a, b, c) {
  "use strict";

  function d(a) {
    return " " === a || "	" === a || "\n" === a || "\f" === a || "\r" === a;
  }

  function e(b, c) {
    var d = new a.Image();
    return d.onerror = function () {
      A[b] = !1, ba();
    }, d.onload = function () {
      A[b] = 1 === d.width, ba();
    }, d.src = c, "pending";
  }

  function f() {
    M = !1, P = a.devicePixelRatio, N = {}, O = {}, s.DPR = P || 1, Q.width = Math.max(a.innerWidth || 0, z.clientWidth), Q.height = Math.max(a.innerHeight || 0, z.clientHeight), Q.vw = Q.width / 100, Q.vh = Q.height / 100, r = [Q.height, Q.width, P].join("-"), Q.em = s.getEmValue(), Q.rem = Q.em;
  }

  function g(a, b, c, d) {
    var e, f, g, h;
    return "saveData" === B.algorithm ? a > 2.7 ? h = c + 1 : (f = b - c, e = Math.pow(a - .6, 1.5), g = f * e, d && (g += .1 * e), h = a + g) : h = c > 1 ? Math.sqrt(a * b) : a, h > c;
  }

  function h(a) {
    var b,
        c = s.getSet(a),
        d = !1;
    "pending" !== c && (d = r, c && (b = s.setRes(c), s.applySetCandidate(b, a))), a[s.ns].evaled = d;
  }

  function i(a, b) {
    return a.res - b.res;
  }

  function j(a, b, c) {
    var d;
    return !c && b && (c = a[s.ns].sets, c = c && c[c.length - 1]), d = k(b, c), d && (b = s.makeUrl(b), a[s.ns].curSrc = b, a[s.ns].curCan = d, d.res || aa(d, d.set.sizes)), d;
  }

  function k(a, b) {
    var c, d, e;
    if (a && b) for (e = s.parseSet(b), a = s.makeUrl(a), c = 0; c < e.length; c++) {
      if (a === s.makeUrl(e[c].url)) {
        d = e[c];
        break;
      }
    }
    return d;
  }

  function l(a, b) {
    var c,
        d,
        e,
        f,
        g = a.getElementsByTagName("source");

    for (c = 0, d = g.length; d > c; c++) {
      e = g[c], e[s.ns] = !0, f = e.getAttribute("srcset"), f && b.push({
        srcset: f,
        media: e.getAttribute("media"),
        type: e.getAttribute("type"),
        sizes: e.getAttribute("sizes")
      });
    }
  }

  function m(a, b) {
    function c(b) {
      var c,
          d = b.exec(a.substring(m));
      return d ? (c = d[0], m += c.length, c) : void 0;
    }

    function e() {
      var a,
          c,
          d,
          e,
          f,
          i,
          j,
          k,
          l,
          m = !1,
          o = {};

      for (e = 0; e < h.length; e++) {
        f = h[e], i = f[f.length - 1], j = f.substring(0, f.length - 1), k = parseInt(j, 10), l = parseFloat(j), X.test(j) && "w" === i ? ((a || c) && (m = !0), 0 === k ? m = !0 : a = k) : Y.test(j) && "x" === i ? ((a || c || d) && (m = !0), 0 > l ? m = !0 : c = l) : X.test(j) && "h" === i ? ((d || c) && (m = !0), 0 === k ? m = !0 : d = k) : m = !0;
      }

      m || (o.url = g, a && (o.w = a), c && (o.d = c), d && (o.h = d), d || c || a || (o.d = 1), 1 === o.d && (b.has1x = !0), o.set = b, n.push(o));
    }

    function f() {
      for (c(T), i = "", j = "in descriptor";;) {
        if (k = a.charAt(m), "in descriptor" === j) {
          if (d(k)) i && (h.push(i), i = "", j = "after descriptor");else {
            if ("," === k) return m += 1, i && h.push(i), void e();
            if ("(" === k) i += k, j = "in parens";else {
              if ("" === k) return i && h.push(i), void e();
              i += k;
            }
          }
        } else if ("in parens" === j) {
          if (")" === k) i += k, j = "in descriptor";else {
            if ("" === k) return h.push(i), void e();
            i += k;
          }
        } else if ("after descriptor" === j) if (d(k)) ;else {
          if ("" === k) return void e();
          j = "in descriptor", m -= 1;
        }
        m += 1;
      }
    }

    for (var g, h, i, j, k, l = a.length, m = 0, n = [];;) {
      if (c(U), m >= l) return n;
      g = c(V), h = [], "," === g.slice(-1) ? (g = g.replace(W, ""), e()) : f();
    }
  }

  function n(a) {
    function b(a) {
      function b() {
        f && (g.push(f), f = "");
      }

      function c() {
        g[0] && (h.push(g), g = []);
      }

      for (var e, f = "", g = [], h = [], i = 0, j = 0, k = !1;;) {
        if (e = a.charAt(j), "" === e) return b(), c(), h;

        if (k) {
          if ("*" === e && "/" === a[j + 1]) {
            k = !1, j += 2, b();
            continue;
          }

          j += 1;
        } else {
          if (d(e)) {
            if (a.charAt(j - 1) && d(a.charAt(j - 1)) || !f) {
              j += 1;
              continue;
            }

            if (0 === i) {
              b(), j += 1;
              continue;
            }

            e = " ";
          } else if ("(" === e) i += 1;else if (")" === e) i -= 1;else {
            if ("," === e) {
              b(), c(), j += 1;
              continue;
            }

            if ("/" === e && "*" === a.charAt(j + 1)) {
              k = !0, j += 2;
              continue;
            }
          }

          f += e, j += 1;
        }
      }
    }

    function c(a) {
      return k.test(a) && parseFloat(a) >= 0 ? !0 : l.test(a) ? !0 : "0" === a || "-0" === a || "+0" === a ? !0 : !1;
    }

    var e,
        f,
        g,
        h,
        i,
        j,
        k = /^(?:[+-]?[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?(?:ch|cm|em|ex|in|mm|pc|pt|px|rem|vh|vmin|vmax|vw)$/i,
        l = /^calc\((?:[0-9a-z \.\+\-\*\/\(\)]+)\)$/i;

    for (f = b(a), g = f.length, e = 0; g > e; e++) {
      if (h = f[e], i = h[h.length - 1], c(i)) {
        if (j = i, h.pop(), 0 === h.length) return j;
        if (h = h.join(" "), s.matchesMedia(h)) return j;
      }
    }

    return "100vw";
  }

  b.createElement("picture");

  var o,
      p,
      q,
      r,
      s = {},
      t = !1,
      u = function u() {},
      v = b.createElement("img"),
      w = v.getAttribute,
      x = v.setAttribute,
      y = v.removeAttribute,
      z = b.documentElement,
      A = {},
      B = {
    algorithm: ""
  },
      C = "data-pfsrc",
      D = C + "set",
      E = navigator.userAgent,
      F = /rident/.test(E) || /ecko/.test(E) && E.match(/rv\:(\d+)/) && RegExp.$1 > 35,
      G = "currentSrc",
      H = /\s+\+?\d+(e\d+)?w/,
      I = /(\([^)]+\))?\s*(.+)/,
      J = a.picturefillCFG,
      K = "position:absolute;left:0;visibility:hidden;display:block;padding:0;border:none;font-size:1em;width:1em;overflow:hidden;clip:rect(0px, 0px, 0px, 0px)",
      L = "font-size:100%!important;",
      M = !0,
      N = {},
      O = {},
      P = a.devicePixelRatio,
      Q = {
    px: 1,
    "in": 96
  },
      R = b.createElement("a"),
      S = !1,
      T = /^[ \t\n\r\u000c]+/,
      U = /^[, \t\n\r\u000c]+/,
      V = /^[^ \t\n\r\u000c]+/,
      W = /[,]+$/,
      X = /^\d+$/,
      Y = /^-?(?:[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/,
      Z = function Z(a, b, c, d) {
    a.addEventListener ? a.addEventListener(b, c, d || !1) : a.attachEvent && a.attachEvent("on" + b, c);
  },
      $ = function $(a) {
    var b = {};
    return function (c) {
      return c in b || (b[c] = a(c)), b[c];
    };
  },
      _ = function () {
    var a = /^([\d\.]+)(em|vw|px)$/,
        b = function b() {
      for (var a = arguments, b = 0, c = a[0]; ++b in a;) {
        c = c.replace(a[b], a[++b]);
      }

      return c;
    },
        c = $(function (a) {
      return "return " + b((a || "").toLowerCase(), /\band\b/g, "&&", /,/g, "||", /min-([a-z-\s]+):/g, "e.$1>=", /max-([a-z-\s]+):/g, "e.$1<=", /calc([^)]+)/g, "($1)", /(\d+[\.]*[\d]*)([a-z]+)/g, "($1 * e.$2)", /^(?!(e.[a-z]|[0-9\.&=|><\+\-\*\(\)\/])).*/gi, "") + ";";
    });

    return function (b, d) {
      var e;
      if (!(b in N)) if (N[b] = !1, d && (e = b.match(a))) N[b] = e[1] * Q[e[2]];else try {
        N[b] = new Function("e", c(b))(Q);
      } catch (f) {}
      return N[b];
    };
  }(),
      aa = function aa(a, b) {
    return a.w ? (a.cWidth = s.calcListLength(b || "100vw"), a.res = a.w / a.cWidth) : a.res = a.d, a;
  },
      ba = function ba(a) {
    if (t) {
      var c,
          d,
          e,
          f = a || {};

      if (f.elements && 1 === f.elements.nodeType && ("IMG" === f.elements.nodeName.toUpperCase() ? f.elements = [f.elements] : (f.context = f.elements, f.elements = null)), c = f.elements || s.qsa(f.context || b, f.reevaluate || f.reselect ? s.sel : s.selShort), e = c.length) {
        for (s.setupRun(f), S = !0, d = 0; e > d; d++) {
          s.fillImg(c[d], f);
        }

        s.teardownRun(f);
      }
    }
  };

  o = a.console && console.warn ? function (a) {
    console.warn(a);
  } : u, G in v || (G = "src"), A["image/jpeg"] = !0, A["image/gif"] = !0, A["image/png"] = !0, A["image/svg+xml"] = b.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1"), s.ns = ("pf" + new Date().getTime()).substr(0, 9), s.supSrcset = "srcset" in v, s.supSizes = "sizes" in v, s.supPicture = !!a.HTMLPictureElement, s.supSrcset && s.supPicture && !s.supSizes && !function (a) {
    v.srcset = "data:,a", a.src = "data:,a", s.supSrcset = v.complete === a.complete, s.supPicture = s.supSrcset && s.supPicture;
  }(b.createElement("img")), s.supSrcset && !s.supSizes ? !function () {
    var a = "data:image/gif;base64,R0lGODlhAgABAPAAAP///wAAACH5BAAAAAAALAAAAAACAAEAAAICBAoAOw==",
        c = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
        d = b.createElement("img"),
        e = function e() {
      var a = d.width;
      2 === a && (s.supSizes = !0), q = s.supSrcset && !s.supSizes, t = !0, setTimeout(ba);
    };

    d.onload = e, d.onerror = e, d.setAttribute("sizes", "9px"), d.srcset = c + " 1w," + a + " 9w", d.src = c;
  }() : t = !0, s.selShort = "picture>img,img[srcset]", s.sel = s.selShort, s.cfg = B, s.DPR = P || 1, s.u = Q, s.types = A, s.setSize = u, s.makeUrl = $(function (a) {
    return R.href = a, R.href;
  }), s.qsa = function (a, b) {
    return "querySelector" in a ? a.querySelectorAll(b) : [];
  }, s.matchesMedia = function () {
    return a.matchMedia && (matchMedia("(min-width: 0.1em)") || {}).matches ? s.matchesMedia = function (a) {
      return !a || matchMedia(a).matches;
    } : s.matchesMedia = s.mMQ, s.matchesMedia.apply(this, arguments);
  }, s.mMQ = function (a) {
    return a ? _(a) : !0;
  }, s.calcLength = function (a) {
    var b = _(a, !0) || !1;
    return 0 > b && (b = !1), b;
  }, s.supportsType = function (a) {
    return a ? A[a] : !0;
  }, s.parseSize = $(function (a) {
    var b = (a || "").match(I);
    return {
      media: b && b[1],
      length: b && b[2]
    };
  }), s.parseSet = function (a) {
    return a.cands || (a.cands = m(a.srcset, a)), a.cands;
  }, s.getEmValue = function () {
    var a;

    if (!p && (a = b.body)) {
      var c = b.createElement("div"),
          d = z.style.cssText,
          e = a.style.cssText;
      c.style.cssText = K, z.style.cssText = L, a.style.cssText = L, a.appendChild(c), p = c.offsetWidth, a.removeChild(c), p = parseFloat(p, 10), z.style.cssText = d, a.style.cssText = e;
    }

    return p || 16;
  }, s.calcListLength = function (a) {
    if (!(a in O) || B.uT) {
      var b = s.calcLength(n(a));
      O[a] = b ? b : Q.width;
    }

    return O[a];
  }, s.setRes = function (a) {
    var b;

    if (a) {
      b = s.parseSet(a);

      for (var c = 0, d = b.length; d > c; c++) {
        aa(b[c], a.sizes);
      }
    }

    return b;
  }, s.setRes.res = aa, s.applySetCandidate = function (a, b) {
    if (a.length) {
      var c,
          d,
          e,
          f,
          h,
          k,
          l,
          m,
          n,
          o = b[s.ns],
          p = s.DPR;
      if (k = o.curSrc || b[G], l = o.curCan || j(b, k, a[0].set), l && l.set === a[0].set && (n = F && !b.complete && l.res - .1 > p, n || (l.cached = !0, l.res >= p && (h = l))), !h) for (a.sort(i), f = a.length, h = a[f - 1], d = 0; f > d; d++) {
        if (c = a[d], c.res >= p) {
          e = d - 1, h = a[e] && (n || k !== s.makeUrl(c.url)) && g(a[e].res, c.res, p, a[e].cached) ? a[e] : c;
          break;
        }
      }
      h && (m = s.makeUrl(h.url), o.curSrc = m, o.curCan = h, m !== k && s.setSrc(b, h), s.setSize(b));
    }
  }, s.setSrc = function (a, b) {
    var c;
    a.src = b.url, "image/svg+xml" === b.set.type && (c = a.style.width, a.style.width = a.offsetWidth + 1 + "px", a.offsetWidth + 1 && (a.style.width = c));
  }, s.getSet = function (a) {
    var b,
        c,
        d,
        e = !1,
        f = a[s.ns].sets;

    for (b = 0; b < f.length && !e; b++) {
      if (c = f[b], c.srcset && s.matchesMedia(c.media) && (d = s.supportsType(c.type))) {
        "pending" === d && (c = d), e = c;
        break;
      }
    }

    return e;
  }, s.parseSets = function (a, b, d) {
    var e,
        f,
        g,
        h,
        i = b && "PICTURE" === b.nodeName.toUpperCase(),
        j = a[s.ns];
    (j.src === c || d.src) && (j.src = w.call(a, "src"), j.src ? x.call(a, C, j.src) : y.call(a, C)), (j.srcset === c || d.srcset || !s.supSrcset || a.srcset) && (e = w.call(a, "srcset"), j.srcset = e, h = !0), j.sets = [], i && (j.pic = !0, l(b, j.sets)), j.srcset ? (f = {
      srcset: j.srcset,
      sizes: w.call(a, "sizes")
    }, j.sets.push(f), g = (q || j.src) && H.test(j.srcset || ""), g || !j.src || k(j.src, f) || f.has1x || (f.srcset += ", " + j.src, f.cands.push({
      url: j.src,
      d: 1,
      set: f
    }))) : j.src && j.sets.push({
      srcset: j.src,
      sizes: null
    }), j.curCan = null, j.curSrc = c, j.supported = !(i || f && !s.supSrcset || g && !s.supSizes), h && s.supSrcset && !j.supported && (e ? (x.call(a, D, e), a.srcset = "") : y.call(a, D)), j.supported && !j.srcset && (!j.src && a.src || a.src !== s.makeUrl(j.src)) && (null === j.src ? a.removeAttribute("src") : a.src = j.src), j.parsed = !0;
  }, s.fillImg = function (a, b) {
    var c,
        d = b.reselect || b.reevaluate;
    a[s.ns] || (a[s.ns] = {}), c = a[s.ns], (d || c.evaled !== r) && ((!c.parsed || b.reevaluate) && s.parseSets(a, a.parentNode, b), c.supported ? c.evaled = r : h(a));
  }, s.setupRun = function () {
    (!S || M || P !== a.devicePixelRatio) && f();
  }, s.supPicture ? (ba = u, s.fillImg = u) : !function () {
    var c,
        d = a.attachEvent ? /d$|^c/ : /d$|^c|^i/,
        e = function e() {
      var a = b.readyState || "";
      f = setTimeout(e, "loading" === a ? 200 : 999), b.body && (s.fillImgs(), c = c || d.test(a), c && clearTimeout(f));
    },
        f = setTimeout(e, b.body ? 9 : 99),
        g = function g(a, b) {
      var c,
          d,
          e = function e() {
        var f = new Date() - d;
        b > f ? c = setTimeout(e, b - f) : (c = null, a());
      };

      return function () {
        d = new Date(), c || (c = setTimeout(e, b));
      };
    },
        h = z.clientHeight,
        i = function i() {
      M = Math.max(a.innerWidth || 0, z.clientWidth) !== Q.width || z.clientHeight !== h, h = z.clientHeight, M && s.fillImgs();
    };

    Z(a, "resize", g(i, 99)), Z(b, "readystatechange", e);
  }(), s.picturefill = ba, s.fillImgs = ba, s.teardownRun = u, ba._ = s, a.picturefillCFG = {
    pf: s,
    push: function push(a) {
      var b = a.shift();
      "function" == typeof s[b] ? s[b].apply(s, a) : (B[b] = a[0], S && s.fillImgs({
        reselect: !0
      }));
    }
  };

  for (; J && J.length;) {
    a.picturefillCFG.push(J.shift());
  }

  a.picturefill = ba, "object" == (typeof module === "undefined" ? "undefined" : _typeof(module)) && "object" == _typeof(module.exports) ? module.exports = ba : "function" == typeof define && define.amd && define("picturefill", function () {
    return ba;
  }), s.supPicture || (A["image/webp"] = e("image/webp", "data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAABBxAR/Q9ERP8DAABWUDggGAAAADABAJ0BKgEAAQADADQlpAADcAD++/1QAA=="));
}(window, document);;"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*!
 * Isotope PACKAGED v3.0.6
 *
 * Licensed GPLv3 for open source use
 * or Isotope Commercial License for commercial use
 *
 * https://isotope.metafizzy.co
 * Copyright 2010-2018 Metafizzy
 */

/**
 * Bridget makes jQuery widgets
 * v2.0.1
 * MIT license
 */

/* jshint browser: true, strict: true, undef: true, unused: true */
(function (window, factory) {
  // universal module definition

  /*jshint strict: false */

  /* globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('jquery-bridget/jquery-bridget', ['jquery'], function (jQuery) {
      return factory(window, jQuery);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('jquery'));
  } else {
    // browser global
    window.jQueryBridget = factory(window, window.jQuery);
  }
})(window, function factory(window, jQuery) {
  'use strict'; // ----- utils ----- //

  var arraySlice = Array.prototype.slice; // helper function for logging errors
  // $.error breaks jQuery chaining

  var console = window.console;
  var logError = typeof console == 'undefined' ? function () {} : function (message) {
    console.error(message);
  }; // ----- jQueryBridget ----- //

  function jQueryBridget(namespace, PluginClass, $) {
    $ = $ || jQuery || window.jQuery;

    if (!$) {
      return;
    } // add option method -> $().plugin('option', {...})


    if (!PluginClass.prototype.option) {
      // option setter
      PluginClass.prototype.option = function (opts) {
        // bail out if not an object
        if (!$.isPlainObject(opts)) {
          return;
        }

        this.options = $.extend(true, this.options, opts);
      };
    } // make jQuery plugin


    $.fn[namespace] = function (arg0
    /*, arg1 */
    ) {
      if (typeof arg0 == 'string') {
        // method call $().plugin( 'methodName', { options } )
        // shift arguments by 1
        var args = arraySlice.call(arguments, 1);
        return methodCall(this, arg0, args);
      } // just $().plugin({ options })


      plainCall(this, arg0);
      return this;
    }; // $().plugin('methodName')


    function methodCall($elems, methodName, args) {
      var returnValue;
      var pluginMethodStr = '$().' + namespace + '("' + methodName + '")';
      $elems.each(function (i, elem) {
        // get instance
        var instance = $.data(elem, namespace);

        if (!instance) {
          logError(namespace + ' not initialized. Cannot call methods, i.e. ' + pluginMethodStr);
          return;
        }

        var method = instance[methodName];

        if (!method || methodName.charAt(0) == '_') {
          logError(pluginMethodStr + ' is not a valid method');
          return;
        } // apply method, get return value


        var value = method.apply(instance, args); // set return value if value is returned, use only first value

        returnValue = returnValue === undefined ? value : returnValue;
      });
      return returnValue !== undefined ? returnValue : $elems;
    }

    function plainCall($elems, options) {
      $elems.each(function (i, elem) {
        var instance = $.data(elem, namespace);

        if (instance) {
          // set options & init
          instance.option(options);

          instance._init();
        } else {
          // initialize new instance
          instance = new PluginClass(elem, options);
          $.data(elem, namespace, instance);
        }
      });
    }

    updateJQuery($);
  } // ----- updateJQuery ----- //
  // set $.bridget for v1 backwards compatibility


  function updateJQuery($) {
    if (!$ || $ && $.bridget) {
      return;
    }

    $.bridget = jQueryBridget;
  }

  updateJQuery(jQuery || window.jQuery); // -----  ----- //

  return jQueryBridget;
});
/**
 * EvEmitter v1.1.0
 * Lil' event emitter
 * MIT License
 */

/* jshint unused: true, undef: true, strict: true */


(function (global, factory) {
  // universal module definition

  /* jshint strict: false */

  /* globals define, module, window */
  if (typeof define == 'function' && define.amd) {
    // AMD - RequireJS
    define('ev-emitter/ev-emitter', factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS - Browserify, Webpack
    module.exports = factory();
  } else {
    // Browser globals
    global.EvEmitter = factory();
  }
})(typeof window != 'undefined' ? window : void 0, function () {
  function EvEmitter() {}

  var proto = EvEmitter.prototype;

  proto.on = function (eventName, listener) {
    if (!eventName || !listener) {
      return;
    } // set events hash


    var events = this._events = this._events || {}; // set listeners array

    var listeners = events[eventName] = events[eventName] || []; // only add once

    if (listeners.indexOf(listener) == -1) {
      listeners.push(listener);
    }

    return this;
  };

  proto.once = function (eventName, listener) {
    if (!eventName || !listener) {
      return;
    } // add event


    this.on(eventName, listener); // set once flag
    // set onceEvents hash

    var onceEvents = this._onceEvents = this._onceEvents || {}; // set onceListeners object

    var onceListeners = onceEvents[eventName] = onceEvents[eventName] || {}; // set flag

    onceListeners[listener] = true;
    return this;
  };

  proto.off = function (eventName, listener) {
    var listeners = this._events && this._events[eventName];

    if (!listeners || !listeners.length) {
      return;
    }

    var index = listeners.indexOf(listener);

    if (index != -1) {
      listeners.splice(index, 1);
    }

    return this;
  };

  proto.emitEvent = function (eventName, args) {
    var listeners = this._events && this._events[eventName];

    if (!listeners || !listeners.length) {
      return;
    } // copy over to avoid interference if .off() in listener


    listeners = listeners.slice(0);
    args = args || []; // once stuff

    var onceListeners = this._onceEvents && this._onceEvents[eventName];

    for (var i = 0; i < listeners.length; i++) {
      var listener = listeners[i];
      var isOnce = onceListeners && onceListeners[listener];

      if (isOnce) {
        // remove listener
        // remove before trigger to prevent recursion
        this.off(eventName, listener); // unset once flag

        delete onceListeners[listener];
      } // trigger listener


      listener.apply(this, args);
    }

    return this;
  };

  proto.allOff = function () {
    delete this._events;
    delete this._onceEvents;
  };

  return EvEmitter;
});
/*!
 * getSize v2.0.3
 * measure size of elements
 * MIT license
 */

/* jshint browser: true, strict: true, undef: true, unused: true */

/* globals console: false */


(function (window, factory) {
  /* jshint strict: false */

  /* globals define, module */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('get-size/get-size', factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // browser global
    window.getSize = factory();
  }
})(window, function factory() {
  'use strict'; // -------------------------- helpers -------------------------- //
  // get a number from a string, not a percentage

  function getStyleSize(value) {
    var num = parseFloat(value); // not a percent like '100%', and a number

    var isValid = value.indexOf('%') == -1 && !isNaN(num);
    return isValid && num;
  }

  function noop() {}

  var logError = typeof console == 'undefined' ? noop : function (message) {
    console.error(message);
  }; // -------------------------- measurements -------------------------- //

  var measurements = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom', 'borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth'];
  var measurementsLength = measurements.length;

  function getZeroSize() {
    var size = {
      width: 0,
      height: 0,
      innerWidth: 0,
      innerHeight: 0,
      outerWidth: 0,
      outerHeight: 0
    };

    for (var i = 0; i < measurementsLength; i++) {
      var measurement = measurements[i];
      size[measurement] = 0;
    }

    return size;
  } // -------------------------- getStyle -------------------------- //

  /**
   * getStyle, get style of element, check for Firefox bug
   * https://bugzilla.mozilla.org/show_bug.cgi?id=548397
   */


  function getStyle(elem) {
    var style = getComputedStyle(elem);

    if (!style) {
      logError('Style returned ' + style + '. Are you running this code in a hidden iframe on Firefox? ' + 'See https://bit.ly/getsizebug1');
    }

    return style;
  } // -------------------------- setup -------------------------- //


  var isSetup = false;
  var isBoxSizeOuter;
  /**
   * setup
   * check isBoxSizerOuter
   * do on first getSize() rather than on page load for Firefox bug
   */

  function setup() {
    // setup once
    if (isSetup) {
      return;
    }

    isSetup = true; // -------------------------- box sizing -------------------------- //

    /**
     * Chrome & Safari measure the outer-width on style.width on border-box elems
     * IE11 & Firefox<29 measures the inner-width
     */

    var div = document.createElement('div');
    div.style.width = '200px';
    div.style.padding = '1px 2px 3px 4px';
    div.style.borderStyle = 'solid';
    div.style.borderWidth = '1px 2px 3px 4px';
    div.style.boxSizing = 'border-box';
    var body = document.body || document.documentElement;
    body.appendChild(div);
    var style = getStyle(div); // round value for browser zoom. desandro/masonry#928

    isBoxSizeOuter = Math.round(getStyleSize(style.width)) == 200;
    getSize.isBoxSizeOuter = isBoxSizeOuter;
    body.removeChild(div);
  } // -------------------------- getSize -------------------------- //


  function getSize(elem) {
    setup(); // use querySeletor if elem is string

    if (typeof elem == 'string') {
      elem = document.querySelector(elem);
    } // do not proceed on non-objects


    if (!elem || _typeof(elem) != 'object' || !elem.nodeType) {
      return;
    }

    var style = getStyle(elem); // if hidden, everything is 0

    if (style.display == 'none') {
      return getZeroSize();
    }

    var size = {};
    size.width = elem.offsetWidth;
    size.height = elem.offsetHeight;
    var isBorderBox = size.isBorderBox = style.boxSizing == 'border-box'; // get all measurements

    for (var i = 0; i < measurementsLength; i++) {
      var measurement = measurements[i];
      var value = style[measurement];
      var num = parseFloat(value); // any 'auto', 'medium' value will be 0

      size[measurement] = !isNaN(num) ? num : 0;
    }

    var paddingWidth = size.paddingLeft + size.paddingRight;
    var paddingHeight = size.paddingTop + size.paddingBottom;
    var marginWidth = size.marginLeft + size.marginRight;
    var marginHeight = size.marginTop + size.marginBottom;
    var borderWidth = size.borderLeftWidth + size.borderRightWidth;
    var borderHeight = size.borderTopWidth + size.borderBottomWidth;
    var isBorderBoxSizeOuter = isBorderBox && isBoxSizeOuter; // overwrite width and height if we can get it from style

    var styleWidth = getStyleSize(style.width);

    if (styleWidth !== false) {
      size.width = styleWidth + ( // add padding and border unless it's already including it
      isBorderBoxSizeOuter ? 0 : paddingWidth + borderWidth);
    }

    var styleHeight = getStyleSize(style.height);

    if (styleHeight !== false) {
      size.height = styleHeight + ( // add padding and border unless it's already including it
      isBorderBoxSizeOuter ? 0 : paddingHeight + borderHeight);
    }

    size.innerWidth = size.width - (paddingWidth + borderWidth);
    size.innerHeight = size.height - (paddingHeight + borderHeight);
    size.outerWidth = size.width + marginWidth;
    size.outerHeight = size.height + marginHeight;
    return size;
  }

  return getSize;
});
/**
 * matchesSelector v2.0.2
 * matchesSelector( element, '.selector' )
 * MIT license
 */

/*jshint browser: true, strict: true, undef: true, unused: true */


(function (window, factory) {
  /*global define: false, module: false */
  'use strict'; // universal module definition

  if (typeof define == 'function' && define.amd) {
    // AMD
    define('desandro-matches-selector/matches-selector', factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // browser global
    window.matchesSelector = factory();
  }
})(window, function factory() {
  'use strict';

  var matchesMethod = function () {
    var ElemProto = window.Element.prototype; // check for the standard method name first

    if (ElemProto.matches) {
      return 'matches';
    } // check un-prefixed


    if (ElemProto.matchesSelector) {
      return 'matchesSelector';
    } // check vendor prefixes


    var prefixes = ['webkit', 'moz', 'ms', 'o'];

    for (var i = 0; i < prefixes.length; i++) {
      var prefix = prefixes[i];
      var method = prefix + 'MatchesSelector';

      if (ElemProto[method]) {
        return method;
      }
    }
  }();

  return function matchesSelector(elem, selector) {
    return elem[matchesMethod](selector);
  };
});
/**
 * Fizzy UI utils v2.0.7
 * MIT license
 */

/*jshint browser: true, undef: true, unused: true, strict: true */


(function (window, factory) {
  // universal module definition

  /*jshint strict: false */

  /*globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('fizzy-ui-utils/utils', ['desandro-matches-selector/matches-selector'], function (matchesSelector) {
      return factory(window, matchesSelector);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('desandro-matches-selector'));
  } else {
    // browser global
    window.fizzyUIUtils = factory(window, window.matchesSelector);
  }
})(window, function factory(window, matchesSelector) {
  var utils = {}; // ----- extend ----- //
  // extends objects

  utils.extend = function (a, b) {
    for (var prop in b) {
      a[prop] = b[prop];
    }

    return a;
  }; // ----- modulo ----- //


  utils.modulo = function (num, div) {
    return (num % div + div) % div;
  }; // ----- makeArray ----- //


  var arraySlice = Array.prototype.slice; // turn element or nodeList into an array

  utils.makeArray = function (obj) {
    if (Array.isArray(obj)) {
      // use object if already an array
      return obj;
    } // return empty array if undefined or null. #6


    if (obj === null || obj === undefined) {
      return [];
    }

    var isArrayLike = _typeof(obj) == 'object' && typeof obj.length == 'number';

    if (isArrayLike) {
      // convert nodeList to array
      return arraySlice.call(obj);
    } // array of single index


    return [obj];
  }; // ----- removeFrom ----- //


  utils.removeFrom = function (ary, obj) {
    var index = ary.indexOf(obj);

    if (index != -1) {
      ary.splice(index, 1);
    }
  }; // ----- getParent ----- //


  utils.getParent = function (elem, selector) {
    while (elem.parentNode && elem != document.body) {
      elem = elem.parentNode;

      if (matchesSelector(elem, selector)) {
        return elem;
      }
    }
  }; // ----- getQueryElement ----- //
  // use element as selector string


  utils.getQueryElement = function (elem) {
    if (typeof elem == 'string') {
      return document.querySelector(elem);
    }

    return elem;
  }; // ----- handleEvent ----- //
  // enable .ontype to trigger from .addEventListener( elem, 'type' )


  utils.handleEvent = function (event) {
    var method = 'on' + event.type;

    if (this[method]) {
      this[method](event);
    }
  }; // ----- filterFindElements ----- //


  utils.filterFindElements = function (elems, selector) {
    // make array of elems
    elems = utils.makeArray(elems);
    var ffElems = [];
    elems.forEach(function (elem) {
      // check that elem is an actual element
      if (!(elem instanceof HTMLElement)) {
        return;
      } // add elem if no selector


      if (!selector) {
        ffElems.push(elem);
        return;
      } // filter & find items if we have a selector
      // filter


      if (matchesSelector(elem, selector)) {
        ffElems.push(elem);
      } // find children


      var childElems = elem.querySelectorAll(selector); // concat childElems to filterFound array

      for (var i = 0; i < childElems.length; i++) {
        ffElems.push(childElems[i]);
      }
    });
    return ffElems;
  }; // ----- debounceMethod ----- //


  utils.debounceMethod = function (_class, methodName, threshold) {
    threshold = threshold || 100; // original method

    var method = _class.prototype[methodName];
    var timeoutName = methodName + 'Timeout';

    _class.prototype[methodName] = function () {
      var timeout = this[timeoutName];
      clearTimeout(timeout);
      var args = arguments;

      var _this = this;

      this[timeoutName] = setTimeout(function () {
        method.apply(_this, args);
        delete _this[timeoutName];
      }, threshold);
    };
  }; // ----- docReady ----- //


  utils.docReady = function (callback) {
    var readyState = document.readyState;

    if (readyState == 'complete' || readyState == 'interactive') {
      // do async to allow for other scripts to run. metafizzy/flickity#441
      setTimeout(callback);
    } else {
      document.addEventListener('DOMContentLoaded', callback);
    }
  }; // ----- htmlInit ----- //
  // http://jamesroberts.name/blog/2010/02/22/string-functions-for-javascript-trim-to-camel-case-to-dashed-and-to-underscore/


  utils.toDashed = function (str) {
    return str.replace(/(.)([A-Z])/g, function (match, $1, $2) {
      return $1 + '-' + $2;
    }).toLowerCase();
  };

  var console = window.console;
  /**
   * allow user to initialize classes via [data-namespace] or .js-namespace class
   * htmlInit( Widget, 'widgetName' )
   * options are parsed from data-namespace-options
   */

  utils.htmlInit = function (WidgetClass, namespace) {
    utils.docReady(function () {
      var dashedNamespace = utils.toDashed(namespace);
      var dataAttr = 'data-' + dashedNamespace;
      var dataAttrElems = document.querySelectorAll('[' + dataAttr + ']');
      var jsDashElems = document.querySelectorAll('.js-' + dashedNamespace);
      var elems = utils.makeArray(dataAttrElems).concat(utils.makeArray(jsDashElems));
      var dataOptionsAttr = dataAttr + '-options';
      var jQuery = window.jQuery;
      elems.forEach(function (elem) {
        var attr = elem.getAttribute(dataAttr) || elem.getAttribute(dataOptionsAttr);
        var options;

        try {
          options = attr && JSON.parse(attr);
        } catch (error) {
          // log error, do not initialize
          if (console) {
            console.error('Error parsing ' + dataAttr + ' on ' + elem.className + ': ' + error);
          }

          return;
        } // initialize


        var instance = new WidgetClass(elem, options); // make available via $().data('namespace')

        if (jQuery) {
          jQuery.data(elem, namespace, instance);
        }
      });
    });
  }; // -----  ----- //


  return utils;
});
/**
 * Outlayer Item
 */


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */

  /* globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD - RequireJS
    define('outlayer/item', ['ev-emitter/ev-emitter', 'get-size/get-size'], factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS - Browserify, Webpack
    module.exports = factory(require('ev-emitter'), require('get-size'));
  } else {
    // browser global
    window.Outlayer = {};
    window.Outlayer.Item = factory(window.EvEmitter, window.getSize);
  }
})(window, function factory(EvEmitter, getSize) {
  'use strict'; // ----- helpers ----- //

  function isEmptyObj(obj) {
    for (var prop in obj) {
      return false;
    }

    prop = null;
    return true;
  } // -------------------------- CSS3 support -------------------------- //


  var docElemStyle = document.documentElement.style;
  var transitionProperty = typeof docElemStyle.transition == 'string' ? 'transition' : 'WebkitTransition';
  var transformProperty = typeof docElemStyle.transform == 'string' ? 'transform' : 'WebkitTransform';
  var transitionEndEvent = {
    WebkitTransition: 'webkitTransitionEnd',
    transition: 'transitionend'
  }[transitionProperty]; // cache all vendor properties that could have vendor prefix

  var vendorProperties = {
    transform: transformProperty,
    transition: transitionProperty,
    transitionDuration: transitionProperty + 'Duration',
    transitionProperty: transitionProperty + 'Property',
    transitionDelay: transitionProperty + 'Delay'
  }; // -------------------------- Item -------------------------- //

  function Item(element, layout) {
    if (!element) {
      return;
    }

    this.element = element; // parent layout class, i.e. Masonry, Isotope, or Packery

    this.layout = layout;
    this.position = {
      x: 0,
      y: 0
    };

    this._create();
  } // inherit EvEmitter


  var proto = Item.prototype = Object.create(EvEmitter.prototype);
  proto.constructor = Item;

  proto._create = function () {
    // transition objects
    this._transn = {
      ingProperties: {},
      clean: {},
      onEnd: {}
    };
    this.css({
      position: 'absolute'
    });
  }; // trigger specified handler for event type


  proto.handleEvent = function (event) {
    var method = 'on' + event.type;

    if (this[method]) {
      this[method](event);
    }
  };

  proto.getSize = function () {
    this.size = getSize(this.element);
  };
  /**
   * apply CSS styles to element
   * @param {Object} style
   */


  proto.css = function (style) {
    var elemStyle = this.element.style;

    for (var prop in style) {
      // use vendor property if available
      var supportedProp = vendorProperties[prop] || prop;
      elemStyle[supportedProp] = style[prop];
    }
  }; // measure position, and sets it


  proto.getPosition = function () {
    var style = getComputedStyle(this.element);

    var isOriginLeft = this.layout._getOption('originLeft');

    var isOriginTop = this.layout._getOption('originTop');

    var xValue = style[isOriginLeft ? 'left' : 'right'];
    var yValue = style[isOriginTop ? 'top' : 'bottom'];
    var x = parseFloat(xValue);
    var y = parseFloat(yValue); // convert percent to pixels

    var layoutSize = this.layout.size;

    if (xValue.indexOf('%') != -1) {
      x = x / 100 * layoutSize.width;
    }

    if (yValue.indexOf('%') != -1) {
      y = y / 100 * layoutSize.height;
    } // clean up 'auto' or other non-integer values


    x = isNaN(x) ? 0 : x;
    y = isNaN(y) ? 0 : y; // remove padding from measurement

    x -= isOriginLeft ? layoutSize.paddingLeft : layoutSize.paddingRight;
    y -= isOriginTop ? layoutSize.paddingTop : layoutSize.paddingBottom;
    this.position.x = x;
    this.position.y = y;
  }; // set settled position, apply padding


  proto.layoutPosition = function () {
    var layoutSize = this.layout.size;
    var style = {};

    var isOriginLeft = this.layout._getOption('originLeft');

    var isOriginTop = this.layout._getOption('originTop'); // x


    var xPadding = isOriginLeft ? 'paddingLeft' : 'paddingRight';
    var xProperty = isOriginLeft ? 'left' : 'right';
    var xResetProperty = isOriginLeft ? 'right' : 'left';
    var x = this.position.x + layoutSize[xPadding]; // set in percentage or pixels

    style[xProperty] = this.getXValue(x); // reset other property

    style[xResetProperty] = ''; // y

    var yPadding = isOriginTop ? 'paddingTop' : 'paddingBottom';
    var yProperty = isOriginTop ? 'top' : 'bottom';
    var yResetProperty = isOriginTop ? 'bottom' : 'top';
    var y = this.position.y + layoutSize[yPadding]; // set in percentage or pixels

    style[yProperty] = this.getYValue(y); // reset other property

    style[yResetProperty] = '';
    this.css(style);
    this.emitEvent('layout', [this]);
  };

  proto.getXValue = function (x) {
    var isHorizontal = this.layout._getOption('horizontal');

    return this.layout.options.percentPosition && !isHorizontal ? x / this.layout.size.width * 100 + '%' : x + 'px';
  };

  proto.getYValue = function (y) {
    var isHorizontal = this.layout._getOption('horizontal');

    return this.layout.options.percentPosition && isHorizontal ? y / this.layout.size.height * 100 + '%' : y + 'px';
  };

  proto._transitionTo = function (x, y) {
    this.getPosition(); // get current x & y from top/left

    var curX = this.position.x;
    var curY = this.position.y;
    var didNotMove = x == this.position.x && y == this.position.y; // save end position

    this.setPosition(x, y); // if did not move and not transitioning, just go to layout

    if (didNotMove && !this.isTransitioning) {
      this.layoutPosition();
      return;
    }

    var transX = x - curX;
    var transY = y - curY;
    var transitionStyle = {};
    transitionStyle.transform = this.getTranslate(transX, transY);
    this.transition({
      to: transitionStyle,
      onTransitionEnd: {
        transform: this.layoutPosition
      },
      isCleaning: true
    });
  };

  proto.getTranslate = function (x, y) {
    // flip cooridinates if origin on right or bottom
    var isOriginLeft = this.layout._getOption('originLeft');

    var isOriginTop = this.layout._getOption('originTop');

    x = isOriginLeft ? x : -x;
    y = isOriginTop ? y : -y;
    return 'translate3d(' + x + 'px, ' + y + 'px, 0)';
  }; // non transition + transform support


  proto.goTo = function (x, y) {
    this.setPosition(x, y);
    this.layoutPosition();
  };

  proto.moveTo = proto._transitionTo;

  proto.setPosition = function (x, y) {
    this.position.x = parseFloat(x);
    this.position.y = parseFloat(y);
  }; // ----- transition ----- //

  /**
   * @param {Object} style - CSS
   * @param {Function} onTransitionEnd
   */
  // non transition, just trigger callback


  proto._nonTransition = function (args) {
    this.css(args.to);

    if (args.isCleaning) {
      this._removeStyles(args.to);
    }

    for (var prop in args.onTransitionEnd) {
      args.onTransitionEnd[prop].call(this);
    }
  };
  /**
   * proper transition
   * @param {Object} args - arguments
   *   @param {Object} to - style to transition to
   *   @param {Object} from - style to start transition from
   *   @param {Boolean} isCleaning - removes transition styles after transition
   *   @param {Function} onTransitionEnd - callback
   */


  proto.transition = function (args) {
    // redirect to nonTransition if no transition duration
    if (!parseFloat(this.layout.options.transitionDuration)) {
      this._nonTransition(args);

      return;
    }

    var _transition = this._transn; // keep track of onTransitionEnd callback by css property

    for (var prop in args.onTransitionEnd) {
      _transition.onEnd[prop] = args.onTransitionEnd[prop];
    } // keep track of properties that are transitioning


    for (prop in args.to) {
      _transition.ingProperties[prop] = true; // keep track of properties to clean up when transition is done

      if (args.isCleaning) {
        _transition.clean[prop] = true;
      }
    } // set from styles


    if (args.from) {
      this.css(args.from); // force redraw. http://blog.alexmaccaw.com/css-transitions

      var h = this.element.offsetHeight; // hack for JSHint to hush about unused var

      h = null;
    } // enable transition


    this.enableTransition(args.to); // set styles that are transitioning

    this.css(args.to);
    this.isTransitioning = true;
  }; // dash before all cap letters, including first for
  // WebkitTransform => -webkit-transform


  function toDashedAll(str) {
    return str.replace(/([A-Z])/g, function ($1) {
      return '-' + $1.toLowerCase();
    });
  }

  var transitionProps = 'opacity,' + toDashedAll(transformProperty);

  proto.enableTransition = function ()
  /* style */
  {
    // HACK changing transitionProperty during a transition
    // will cause transition to jump
    if (this.isTransitioning) {
      return;
    } // make `transition: foo, bar, baz` from style object
    // HACK un-comment this when enableTransition can work
    // while a transition is happening
    // var transitionValues = [];
    // for ( var prop in style ) {
    //   // dash-ify camelCased properties like WebkitTransition
    //   prop = vendorProperties[ prop ] || prop;
    //   transitionValues.push( toDashedAll( prop ) );
    // }
    // munge number to millisecond, to match stagger


    var duration = this.layout.options.transitionDuration;
    duration = typeof duration == 'number' ? duration + 'ms' : duration; // enable transition styles

    this.css({
      transitionProperty: transitionProps,
      transitionDuration: duration,
      transitionDelay: this.staggerDelay || 0
    }); // listen for transition end event

    this.element.addEventListener(transitionEndEvent, this, false);
  }; // ----- events ----- //


  proto.onwebkitTransitionEnd = function (event) {
    this.ontransitionend(event);
  };

  proto.onotransitionend = function (event) {
    this.ontransitionend(event);
  }; // properties that I munge to make my life easier


  var dashedVendorProperties = {
    '-webkit-transform': 'transform'
  };

  proto.ontransitionend = function (event) {
    // disregard bubbled events from children
    if (event.target !== this.element) {
      return;
    }

    var _transition = this._transn; // get property name of transitioned property, convert to prefix-free

    var propertyName = dashedVendorProperties[event.propertyName] || event.propertyName; // remove property that has completed transitioning

    delete _transition.ingProperties[propertyName]; // check if any properties are still transitioning

    if (isEmptyObj(_transition.ingProperties)) {
      // all properties have completed transitioning
      this.disableTransition();
    } // clean style


    if (propertyName in _transition.clean) {
      // clean up style
      this.element.style[event.propertyName] = '';
      delete _transition.clean[propertyName];
    } // trigger onTransitionEnd callback


    if (propertyName in _transition.onEnd) {
      var onTransitionEnd = _transition.onEnd[propertyName];
      onTransitionEnd.call(this);
      delete _transition.onEnd[propertyName];
    }

    this.emitEvent('transitionEnd', [this]);
  };

  proto.disableTransition = function () {
    this.removeTransitionStyles();
    this.element.removeEventListener(transitionEndEvent, this, false);
    this.isTransitioning = false;
  };
  /**
   * removes style property from element
   * @param {Object} style
  **/


  proto._removeStyles = function (style) {
    // clean up transition styles
    var cleanStyle = {};

    for (var prop in style) {
      cleanStyle[prop] = '';
    }

    this.css(cleanStyle);
  };

  var cleanTransitionStyle = {
    transitionProperty: '',
    transitionDuration: '',
    transitionDelay: ''
  };

  proto.removeTransitionStyles = function () {
    // remove transition
    this.css(cleanTransitionStyle);
  }; // ----- stagger ----- //


  proto.stagger = function (delay) {
    delay = isNaN(delay) ? 0 : delay;
    this.staggerDelay = delay + 'ms';
  }; // ----- show/hide/remove ----- //
  // remove element from DOM


  proto.removeElem = function () {
    this.element.parentNode.removeChild(this.element); // remove display: none

    this.css({
      display: ''
    });
    this.emitEvent('remove', [this]);
  };

  proto.remove = function () {
    // just remove element if no transition support or no transition
    if (!transitionProperty || !parseFloat(this.layout.options.transitionDuration)) {
      this.removeElem();
      return;
    } // start transition


    this.once('transitionEnd', function () {
      this.removeElem();
    });
    this.hide();
  };

  proto.reveal = function () {
    delete this.isHidden; // remove display: none

    this.css({
      display: ''
    });
    var options = this.layout.options;
    var onTransitionEnd = {};
    var transitionEndProperty = this.getHideRevealTransitionEndProperty('visibleStyle');
    onTransitionEnd[transitionEndProperty] = this.onRevealTransitionEnd;
    this.transition({
      from: options.hiddenStyle,
      to: options.visibleStyle,
      isCleaning: true,
      onTransitionEnd: onTransitionEnd
    });
  };

  proto.onRevealTransitionEnd = function () {
    // check if still visible
    // during transition, item may have been hidden
    if (!this.isHidden) {
      this.emitEvent('reveal');
    }
  };
  /**
   * get style property use for hide/reveal transition end
   * @param {String} styleProperty - hiddenStyle/visibleStyle
   * @returns {String}
   */


  proto.getHideRevealTransitionEndProperty = function (styleProperty) {
    var optionStyle = this.layout.options[styleProperty]; // use opacity

    if (optionStyle.opacity) {
      return 'opacity';
    } // get first property


    for (var prop in optionStyle) {
      return prop;
    }
  };

  proto.hide = function () {
    // set flag
    this.isHidden = true; // remove display: none

    this.css({
      display: ''
    });
    var options = this.layout.options;
    var onTransitionEnd = {};
    var transitionEndProperty = this.getHideRevealTransitionEndProperty('hiddenStyle');
    onTransitionEnd[transitionEndProperty] = this.onHideTransitionEnd;
    this.transition({
      from: options.visibleStyle,
      to: options.hiddenStyle,
      // keep hidden stuff hidden
      isCleaning: true,
      onTransitionEnd: onTransitionEnd
    });
  };

  proto.onHideTransitionEnd = function () {
    // check if still hidden
    // during transition, item may have been un-hidden
    if (this.isHidden) {
      this.css({
        display: 'none'
      });
      this.emitEvent('hide');
    }
  };

  proto.destroy = function () {
    this.css({
      position: '',
      left: '',
      right: '',
      top: '',
      bottom: '',
      transition: '',
      transform: ''
    });
  };

  return Item;
});
/*!
 * Outlayer v2.1.1
 * the brains and guts of a layout library
 * MIT license
 */


(function (window, factory) {
  'use strict'; // universal module definition

  /* jshint strict: false */

  /* globals define, module, require */

  if (typeof define == 'function' && define.amd) {
    // AMD - RequireJS
    define('outlayer/outlayer', ['ev-emitter/ev-emitter', 'get-size/get-size', 'fizzy-ui-utils/utils', './item'], function (EvEmitter, getSize, utils, Item) {
      return factory(window, EvEmitter, getSize, utils, Item);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS - Browserify, Webpack
    module.exports = factory(window, require('ev-emitter'), require('get-size'), require('fizzy-ui-utils'), require('./item'));
  } else {
    // browser global
    window.Outlayer = factory(window, window.EvEmitter, window.getSize, window.fizzyUIUtils, window.Outlayer.Item);
  }
})(window, function factory(window, EvEmitter, getSize, utils, Item) {
  'use strict'; // ----- vars ----- //

  var console = window.console;
  var jQuery = window.jQuery;

  var noop = function noop() {}; // -------------------------- Outlayer -------------------------- //
  // globally unique identifiers


  var GUID = 0; // internal store of all Outlayer intances

  var instances = {};
  /**
   * @param {Element, String} element
   * @param {Object} options
   * @constructor
   */

  function Outlayer(element, options) {
    var queryElement = utils.getQueryElement(element);

    if (!queryElement) {
      if (console) {
        console.error('Bad element for ' + this.constructor.namespace + ': ' + (queryElement || element));
      }

      return;
    }

    this.element = queryElement; // add jQuery

    if (jQuery) {
      this.$element = jQuery(this.element);
    } // options


    this.options = utils.extend({}, this.constructor.defaults);
    this.option(options); // add id for Outlayer.getFromElement

    var id = ++GUID;
    this.element.outlayerGUID = id; // expando

    instances[id] = this; // associate via id
    // kick it off

    this._create();

    var isInitLayout = this._getOption('initLayout');

    if (isInitLayout) {
      this.layout();
    }
  } // settings are for internal use only


  Outlayer.namespace = 'outlayer';
  Outlayer.Item = Item; // default options

  Outlayer.defaults = {
    containerStyle: {
      position: 'relative'
    },
    initLayout: true,
    originLeft: true,
    originTop: true,
    resize: true,
    resizeContainer: true,
    // item options
    transitionDuration: '0.4s',
    hiddenStyle: {
      opacity: 0,
      transform: 'scale(0.001)'
    },
    visibleStyle: {
      opacity: 1,
      transform: 'scale(1)'
    }
  };
  var proto = Outlayer.prototype; // inherit EvEmitter

  utils.extend(proto, EvEmitter.prototype);
  /**
   * set options
   * @param {Object} opts
   */

  proto.option = function (opts) {
    utils.extend(this.options, opts);
  };
  /**
   * get backwards compatible option value, check old name
   */


  proto._getOption = function (option) {
    var oldOption = this.constructor.compatOptions[option];
    return oldOption && this.options[oldOption] !== undefined ? this.options[oldOption] : this.options[option];
  };

  Outlayer.compatOptions = {
    // currentName: oldName
    initLayout: 'isInitLayout',
    horizontal: 'isHorizontal',
    layoutInstant: 'isLayoutInstant',
    originLeft: 'isOriginLeft',
    originTop: 'isOriginTop',
    resize: 'isResizeBound',
    resizeContainer: 'isResizingContainer'
  };

  proto._create = function () {
    // get items from children
    this.reloadItems(); // elements that affect layout, but are not laid out

    this.stamps = [];
    this.stamp(this.options.stamp); // set container style

    utils.extend(this.element.style, this.options.containerStyle); // bind resize method

    var canBindResize = this._getOption('resize');

    if (canBindResize) {
      this.bindResize();
    }
  }; // goes through all children again and gets bricks in proper order


  proto.reloadItems = function () {
    // collection of item elements
    this.items = this._itemize(this.element.children);
  };
  /**
   * turn elements into Outlayer.Items to be used in layout
   * @param {Array or NodeList or HTMLElement} elems
   * @returns {Array} items - collection of new Outlayer Items
   */


  proto._itemize = function (elems) {
    var itemElems = this._filterFindItemElements(elems);

    var Item = this.constructor.Item; // create new Outlayer Items for collection

    var items = [];

    for (var i = 0; i < itemElems.length; i++) {
      var elem = itemElems[i];
      var item = new Item(elem, this);
      items.push(item);
    }

    return items;
  };
  /**
   * get item elements to be used in layout
   * @param {Array or NodeList or HTMLElement} elems
   * @returns {Array} items - item elements
   */


  proto._filterFindItemElements = function (elems) {
    return utils.filterFindElements(elems, this.options.itemSelector);
  };
  /**
   * getter method for getting item elements
   * @returns {Array} elems - collection of item elements
   */


  proto.getItemElements = function () {
    return this.items.map(function (item) {
      return item.element;
    });
  }; // ----- init & layout ----- //

  /**
   * lays out all items
   */


  proto.layout = function () {
    this._resetLayout();

    this._manageStamps(); // don't animate first layout


    var layoutInstant = this._getOption('layoutInstant');

    var isInstant = layoutInstant !== undefined ? layoutInstant : !this._isLayoutInited;
    this.layoutItems(this.items, isInstant); // flag for initalized

    this._isLayoutInited = true;
  }; // _init is alias for layout


  proto._init = proto.layout;
  /**
   * logic before any new layout
   */

  proto._resetLayout = function () {
    this.getSize();
  };

  proto.getSize = function () {
    this.size = getSize(this.element);
  };
  /**
   * get measurement from option, for columnWidth, rowHeight, gutter
   * if option is String -> get element from selector string, & get size of element
   * if option is Element -> get size of element
   * else use option as a number
   *
   * @param {String} measurement
   * @param {String} size - width or height
   * @private
   */


  proto._getMeasurement = function (measurement, size) {
    var option = this.options[measurement];
    var elem;

    if (!option) {
      // default to 0
      this[measurement] = 0;
    } else {
      // use option as an element
      if (typeof option == 'string') {
        elem = this.element.querySelector(option);
      } else if (option instanceof HTMLElement) {
        elem = option;
      } // use size of element, if element


      this[measurement] = elem ? getSize(elem)[size] : option;
    }
  };
  /**
   * layout a collection of item elements
   * @api public
   */


  proto.layoutItems = function (items, isInstant) {
    items = this._getItemsForLayout(items);

    this._layoutItems(items, isInstant);

    this._postLayout();
  };
  /**
   * get the items to be laid out
   * you may want to skip over some items
   * @param {Array} items
   * @returns {Array} items
   */


  proto._getItemsForLayout = function (items) {
    return items.filter(function (item) {
      return !item.isIgnored;
    });
  };
  /**
   * layout items
   * @param {Array} items
   * @param {Boolean} isInstant
   */


  proto._layoutItems = function (items, isInstant) {
    this._emitCompleteOnItems('layout', items);

    if (!items || !items.length) {
      // no items, emit event with empty array
      return;
    }

    var queue = [];
    items.forEach(function (item) {
      // get x/y object from method
      var position = this._getItemLayoutPosition(item); // enqueue


      position.item = item;
      position.isInstant = isInstant || item.isLayoutInstant;
      queue.push(position);
    }, this);

    this._processLayoutQueue(queue);
  };
  /**
   * get item layout position
   * @param {Outlayer.Item} item
   * @returns {Object} x and y position
   */


  proto._getItemLayoutPosition = function ()
  /* item */
  {
    return {
      x: 0,
      y: 0
    };
  };
  /**
   * iterate over array and position each item
   * Reason being - separating this logic prevents 'layout invalidation'
   * thx @paul_irish
   * @param {Array} queue
   */


  proto._processLayoutQueue = function (queue) {
    this.updateStagger();
    queue.forEach(function (obj, i) {
      this._positionItem(obj.item, obj.x, obj.y, obj.isInstant, i);
    }, this);
  }; // set stagger from option in milliseconds number


  proto.updateStagger = function () {
    var stagger = this.options.stagger;

    if (stagger === null || stagger === undefined) {
      this.stagger = 0;
      return;
    }

    this.stagger = getMilliseconds(stagger);
    return this.stagger;
  };
  /**
   * Sets position of item in DOM
   * @param {Outlayer.Item} item
   * @param {Number} x - horizontal position
   * @param {Number} y - vertical position
   * @param {Boolean} isInstant - disables transitions
   */


  proto._positionItem = function (item, x, y, isInstant, i) {
    if (isInstant) {
      // if not transition, just set CSS
      item.goTo(x, y);
    } else {
      item.stagger(i * this.stagger);
      item.moveTo(x, y);
    }
  };
  /**
   * Any logic you want to do after each layout,
   * i.e. size the container
   */


  proto._postLayout = function () {
    this.resizeContainer();
  };

  proto.resizeContainer = function () {
    var isResizingContainer = this._getOption('resizeContainer');

    if (!isResizingContainer) {
      return;
    }

    var size = this._getContainerSize();

    if (size) {
      this._setContainerMeasure(size.width, true);

      this._setContainerMeasure(size.height, false);
    }
  };
  /**
   * Sets width or height of container if returned
   * @returns {Object} size
   *   @param {Number} width
   *   @param {Number} height
   */


  proto._getContainerSize = noop;
  /**
   * @param {Number} measure - size of width or height
   * @param {Boolean} isWidth
   */

  proto._setContainerMeasure = function (measure, isWidth) {
    if (measure === undefined) {
      return;
    }

    var elemSize = this.size; // add padding and border width if border box

    if (elemSize.isBorderBox) {
      measure += isWidth ? elemSize.paddingLeft + elemSize.paddingRight + elemSize.borderLeftWidth + elemSize.borderRightWidth : elemSize.paddingBottom + elemSize.paddingTop + elemSize.borderTopWidth + elemSize.borderBottomWidth;
    }

    measure = Math.max(measure, 0);
    this.element.style[isWidth ? 'width' : 'height'] = measure + 'px';
  };
  /**
   * emit eventComplete on a collection of items events
   * @param {String} eventName
   * @param {Array} items - Outlayer.Items
   */


  proto._emitCompleteOnItems = function (eventName, items) {
    var _this = this;

    function onComplete() {
      _this.dispatchEvent(eventName + 'Complete', null, [items]);
    }

    var count = items.length;

    if (!items || !count) {
      onComplete();
      return;
    }

    var doneCount = 0;

    function tick() {
      doneCount++;

      if (doneCount == count) {
        onComplete();
      }
    } // bind callback


    items.forEach(function (item) {
      item.once(eventName, tick);
    });
  };
  /**
   * emits events via EvEmitter and jQuery events
   * @param {String} type - name of event
   * @param {Event} event - original event
   * @param {Array} args - extra arguments
   */


  proto.dispatchEvent = function (type, event, args) {
    // add original event to arguments
    var emitArgs = event ? [event].concat(args) : args;
    this.emitEvent(type, emitArgs);

    if (jQuery) {
      // set this.$element
      this.$element = this.$element || jQuery(this.element);

      if (event) {
        // create jQuery event
        var $event = jQuery.Event(event);
        $event.type = type;
        this.$element.trigger($event, args);
      } else {
        // just trigger with type if no event available
        this.$element.trigger(type, args);
      }
    }
  }; // -------------------------- ignore & stamps -------------------------- //

  /**
   * keep item in collection, but do not lay it out
   * ignored items do not get skipped in layout
   * @param {Element} elem
   */


  proto.ignore = function (elem) {
    var item = this.getItem(elem);

    if (item) {
      item.isIgnored = true;
    }
  };
  /**
   * return item to layout collection
   * @param {Element} elem
   */


  proto.unignore = function (elem) {
    var item = this.getItem(elem);

    if (item) {
      delete item.isIgnored;
    }
  };
  /**
   * adds elements to stamps
   * @param {NodeList, Array, Element, or String} elems
   */


  proto.stamp = function (elems) {
    elems = this._find(elems);

    if (!elems) {
      return;
    }

    this.stamps = this.stamps.concat(elems); // ignore

    elems.forEach(this.ignore, this);
  };
  /**
   * removes elements to stamps
   * @param {NodeList, Array, or Element} elems
   */


  proto.unstamp = function (elems) {
    elems = this._find(elems);

    if (!elems) {
      return;
    }

    elems.forEach(function (elem) {
      // filter out removed stamp elements
      utils.removeFrom(this.stamps, elem);
      this.unignore(elem);
    }, this);
  };
  /**
   * finds child elements
   * @param {NodeList, Array, Element, or String} elems
   * @returns {Array} elems
   */


  proto._find = function (elems) {
    if (!elems) {
      return;
    } // if string, use argument as selector string


    if (typeof elems == 'string') {
      elems = this.element.querySelectorAll(elems);
    }

    elems = utils.makeArray(elems);
    return elems;
  };

  proto._manageStamps = function () {
    if (!this.stamps || !this.stamps.length) {
      return;
    }

    this._getBoundingRect();

    this.stamps.forEach(this._manageStamp, this);
  }; // update boundingLeft / Top


  proto._getBoundingRect = function () {
    // get bounding rect for container element
    var boundingRect = this.element.getBoundingClientRect();
    var size = this.size;
    this._boundingRect = {
      left: boundingRect.left + size.paddingLeft + size.borderLeftWidth,
      top: boundingRect.top + size.paddingTop + size.borderTopWidth,
      right: boundingRect.right - (size.paddingRight + size.borderRightWidth),
      bottom: boundingRect.bottom - (size.paddingBottom + size.borderBottomWidth)
    };
  };
  /**
   * @param {Element} stamp
  **/


  proto._manageStamp = noop;
  /**
   * get x/y position of element relative to container element
   * @param {Element} elem
   * @returns {Object} offset - has left, top, right, bottom
   */

  proto._getElementOffset = function (elem) {
    var boundingRect = elem.getBoundingClientRect();
    var thisRect = this._boundingRect;
    var size = getSize(elem);
    var offset = {
      left: boundingRect.left - thisRect.left - size.marginLeft,
      top: boundingRect.top - thisRect.top - size.marginTop,
      right: thisRect.right - boundingRect.right - size.marginRight,
      bottom: thisRect.bottom - boundingRect.bottom - size.marginBottom
    };
    return offset;
  }; // -------------------------- resize -------------------------- //
  // enable event handlers for listeners
  // i.e. resize -> onresize


  proto.handleEvent = utils.handleEvent;
  /**
   * Bind layout to window resizing
   */

  proto.bindResize = function () {
    window.addEventListener('resize', this);
    this.isResizeBound = true;
  };
  /**
   * Unbind layout to window resizing
   */


  proto.unbindResize = function () {
    window.removeEventListener('resize', this);
    this.isResizeBound = false;
  };

  proto.onresize = function () {
    this.resize();
  };

  utils.debounceMethod(Outlayer, 'onresize', 100);

  proto.resize = function () {
    // don't trigger if size did not change
    // or if resize was unbound. See #9
    if (!this.isResizeBound || !this.needsResizeLayout()) {
      return;
    }

    this.layout();
  };
  /**
   * check if layout is needed post layout
   * @returns Boolean
   */


  proto.needsResizeLayout = function () {
    var size = getSize(this.element); // check that this.size and size are there
    // IE8 triggers resize on body size change, so they might not be

    var hasSizes = this.size && size;
    return hasSizes && size.innerWidth !== this.size.innerWidth;
  }; // -------------------------- methods -------------------------- //

  /**
   * add items to Outlayer instance
   * @param {Array or NodeList or Element} elems
   * @returns {Array} items - Outlayer.Items
  **/


  proto.addItems = function (elems) {
    var items = this._itemize(elems); // add items to collection


    if (items.length) {
      this.items = this.items.concat(items);
    }

    return items;
  };
  /**
   * Layout newly-appended item elements
   * @param {Array or NodeList or Element} elems
   */


  proto.appended = function (elems) {
    var items = this.addItems(elems);

    if (!items.length) {
      return;
    } // layout and reveal just the new items


    this.layoutItems(items, true);
    this.reveal(items);
  };
  /**
   * Layout prepended elements
   * @param {Array or NodeList or Element} elems
   */


  proto.prepended = function (elems) {
    var items = this._itemize(elems);

    if (!items.length) {
      return;
    } // add items to beginning of collection


    var previousItems = this.items.slice(0);
    this.items = items.concat(previousItems); // start new layout

    this._resetLayout();

    this._manageStamps(); // layout new stuff without transition


    this.layoutItems(items, true);
    this.reveal(items); // layout previous items

    this.layoutItems(previousItems);
  };
  /**
   * reveal a collection of items
   * @param {Array of Outlayer.Items} items
   */


  proto.reveal = function (items) {
    this._emitCompleteOnItems('reveal', items);

    if (!items || !items.length) {
      return;
    }

    var stagger = this.updateStagger();
    items.forEach(function (item, i) {
      item.stagger(i * stagger);
      item.reveal();
    });
  };
  /**
   * hide a collection of items
   * @param {Array of Outlayer.Items} items
   */


  proto.hide = function (items) {
    this._emitCompleteOnItems('hide', items);

    if (!items || !items.length) {
      return;
    }

    var stagger = this.updateStagger();
    items.forEach(function (item, i) {
      item.stagger(i * stagger);
      item.hide();
    });
  };
  /**
   * reveal item elements
   * @param {Array}, {Element}, {NodeList} items
   */


  proto.revealItemElements = function (elems) {
    var items = this.getItems(elems);
    this.reveal(items);
  };
  /**
   * hide item elements
   * @param {Array}, {Element}, {NodeList} items
   */


  proto.hideItemElements = function (elems) {
    var items = this.getItems(elems);
    this.hide(items);
  };
  /**
   * get Outlayer.Item, given an Element
   * @param {Element} elem
   * @param {Function} callback
   * @returns {Outlayer.Item} item
   */


  proto.getItem = function (elem) {
    // loop through items to get the one that matches
    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];

      if (item.element == elem) {
        // return item
        return item;
      }
    }
  };
  /**
   * get collection of Outlayer.Items, given Elements
   * @param {Array} elems
   * @returns {Array} items - Outlayer.Items
   */


  proto.getItems = function (elems) {
    elems = utils.makeArray(elems);
    var items = [];
    elems.forEach(function (elem) {
      var item = this.getItem(elem);

      if (item) {
        items.push(item);
      }
    }, this);
    return items;
  };
  /**
   * remove element(s) from instance and DOM
   * @param {Array or NodeList or Element} elems
   */


  proto.remove = function (elems) {
    var removeItems = this.getItems(elems);

    this._emitCompleteOnItems('remove', removeItems); // bail if no items to remove


    if (!removeItems || !removeItems.length) {
      return;
    }

    removeItems.forEach(function (item) {
      item.remove(); // remove item from collection

      utils.removeFrom(this.items, item);
    }, this);
  }; // ----- destroy ----- //
  // remove and disable Outlayer instance


  proto.destroy = function () {
    // clean up dynamic styles
    var style = this.element.style;
    style.height = '';
    style.position = '';
    style.width = ''; // destroy items

    this.items.forEach(function (item) {
      item.destroy();
    });
    this.unbindResize();
    var id = this.element.outlayerGUID;
    delete instances[id]; // remove reference to instance by id

    delete this.element.outlayerGUID; // remove data for jQuery

    if (jQuery) {
      jQuery.removeData(this.element, this.constructor.namespace);
    }
  }; // -------------------------- data -------------------------- //

  /**
   * get Outlayer instance from element
   * @param {Element} elem
   * @returns {Outlayer}
   */


  Outlayer.data = function (elem) {
    elem = utils.getQueryElement(elem);
    var id = elem && elem.outlayerGUID;
    return id && instances[id];
  }; // -------------------------- create Outlayer class -------------------------- //

  /**
   * create a layout class
   * @param {String} namespace
   */


  Outlayer.create = function (namespace, options) {
    // sub-class Outlayer
    var Layout = subclass(Outlayer); // apply new options and compatOptions

    Layout.defaults = utils.extend({}, Outlayer.defaults);
    utils.extend(Layout.defaults, options);
    Layout.compatOptions = utils.extend({}, Outlayer.compatOptions);
    Layout.namespace = namespace;
    Layout.data = Outlayer.data; // sub-class Item

    Layout.Item = subclass(Item); // -------------------------- declarative -------------------------- //

    utils.htmlInit(Layout, namespace); // -------------------------- jQuery bridge -------------------------- //
    // make into jQuery plugin

    if (jQuery && jQuery.bridget) {
      jQuery.bridget(namespace, Layout);
    }

    return Layout;
  };

  function subclass(Parent) {
    function SubClass() {
      Parent.apply(this, arguments);
    }

    SubClass.prototype = Object.create(Parent.prototype);
    SubClass.prototype.constructor = SubClass;
    return SubClass;
  } // ----- helpers ----- //
  // how many milliseconds are in each unit


  var msUnits = {
    ms: 1,
    s: 1000
  }; // munge time-like parameter into millisecond number
  // '0.4s' -> 40

  function getMilliseconds(time) {
    if (typeof time == 'number') {
      return time;
    }

    var matches = time.match(/(^\d*\.?\d*)(\w*)/);
    var num = matches && matches[1];
    var unit = matches && matches[2];

    if (!num.length) {
      return 0;
    }

    num = parseFloat(num);
    var mult = msUnits[unit] || 1;
    return num * mult;
  } // ----- fin ----- //
  // back in global


  Outlayer.Item = Item;
  return Outlayer;
});
/**
 * Isotope Item
**/


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */

  /*globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('isotope-layout/js/item', ['outlayer/outlayer'], factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(require('outlayer'));
  } else {
    // browser global
    window.Isotope = window.Isotope || {};
    window.Isotope.Item = factory(window.Outlayer);
  }
})(window, function factory(Outlayer) {
  'use strict'; // -------------------------- Item -------------------------- //
  // sub-class Outlayer Item

  function Item() {
    Outlayer.Item.apply(this, arguments);
  }

  var proto = Item.prototype = Object.create(Outlayer.Item.prototype);
  var _create = proto._create;

  proto._create = function () {
    // assign id, used for original-order sorting
    this.id = this.layout.itemGUID++;

    _create.call(this);

    this.sortData = {};
  };

  proto.updateSortData = function () {
    if (this.isIgnored) {
      return;
    } // default sorters


    this.sortData.id = this.id; // for backward compatibility

    this.sortData['original-order'] = this.id;
    this.sortData.random = Math.random(); // go thru getSortData obj and apply the sorters

    var getSortData = this.layout.options.getSortData;
    var sorters = this.layout._sorters;

    for (var key in getSortData) {
      var sorter = sorters[key];
      this.sortData[key] = sorter(this.element, this);
    }
  };

  var _destroy = proto.destroy;

  proto.destroy = function () {
    // call super
    _destroy.apply(this, arguments); // reset display, #741


    this.css({
      display: ''
    });
  };

  return Item;
});
/**
 * Isotope LayoutMode
 */


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */

  /*globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('isotope-layout/js/layout-mode', ['get-size/get-size', 'outlayer/outlayer'], factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(require('get-size'), require('outlayer'));
  } else {
    // browser global
    window.Isotope = window.Isotope || {};
    window.Isotope.LayoutMode = factory(window.getSize, window.Outlayer);
  }
})(window, function factory(getSize, Outlayer) {
  'use strict'; // layout mode class

  function LayoutMode(isotope) {
    this.isotope = isotope; // link properties

    if (isotope) {
      this.options = isotope.options[this.namespace];
      this.element = isotope.element;
      this.items = isotope.filteredItems;
      this.size = isotope.size;
    }
  }

  var proto = LayoutMode.prototype;
  /**
   * some methods should just defer to default Outlayer method
   * and reference the Isotope instance as `this`
  **/

  var facadeMethods = ['_resetLayout', '_getItemLayoutPosition', '_manageStamp', '_getContainerSize', '_getElementOffset', 'needsResizeLayout', '_getOption'];
  facadeMethods.forEach(function (methodName) {
    proto[methodName] = function () {
      return Outlayer.prototype[methodName].apply(this.isotope, arguments);
    };
  }); // -----  ----- //
  // for horizontal layout modes, check vertical size

  proto.needsVerticalResizeLayout = function () {
    // don't trigger if size did not change
    var size = getSize(this.isotope.element); // check that this.size and size are there
    // IE8 triggers resize on body size change, so they might not be

    var hasSizes = this.isotope.size && size;
    return hasSizes && size.innerHeight != this.isotope.size.innerHeight;
  }; // ----- measurements ----- //


  proto._getMeasurement = function () {
    this.isotope._getMeasurement.apply(this, arguments);
  };

  proto.getColumnWidth = function () {
    this.getSegmentSize('column', 'Width');
  };

  proto.getRowHeight = function () {
    this.getSegmentSize('row', 'Height');
  };
  /**
   * get columnWidth or rowHeight
   * segment: 'column' or 'row'
   * size 'Width' or 'Height'
  **/


  proto.getSegmentSize = function (segment, size) {
    var segmentName = segment + size;
    var outerSize = 'outer' + size; // columnWidth / outerWidth // rowHeight / outerHeight

    this._getMeasurement(segmentName, outerSize); // got rowHeight or columnWidth, we can chill


    if (this[segmentName]) {
      return;
    } // fall back to item of first element


    var firstItemSize = this.getFirstItemSize();
    this[segmentName] = firstItemSize && firstItemSize[outerSize] || // or size of container
    this.isotope.size['inner' + size];
  };

  proto.getFirstItemSize = function () {
    var firstItem = this.isotope.filteredItems[0];
    return firstItem && firstItem.element && getSize(firstItem.element);
  }; // ----- methods that should reference isotope ----- //


  proto.layout = function () {
    this.isotope.layout.apply(this.isotope, arguments);
  };

  proto.getSize = function () {
    this.isotope.getSize();
    this.size = this.isotope.size;
  }; // -------------------------- create -------------------------- //


  LayoutMode.modes = {};

  LayoutMode.create = function (namespace, options) {
    function Mode() {
      LayoutMode.apply(this, arguments);
    }

    Mode.prototype = Object.create(proto);
    Mode.prototype.constructor = Mode; // default options

    if (options) {
      Mode.options = options;
    }

    Mode.prototype.namespace = namespace; // register in Isotope

    LayoutMode.modes[namespace] = Mode;
    return Mode;
  };

  return LayoutMode;
});
/*!
 * Masonry v4.2.1
 * Cascading grid layout library
 * https://masonry.desandro.com
 * MIT License
 * by David DeSandro
 */


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */

  /*globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('masonry-layout/masonry', ['outlayer/outlayer', 'get-size/get-size'], factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(require('outlayer'), require('get-size'));
  } else {
    // browser global
    window.Masonry = factory(window.Outlayer, window.getSize);
  }
})(window, function factory(Outlayer, getSize) {
  // -------------------------- masonryDefinition -------------------------- //
  // create an Outlayer layout class
  var Masonry = Outlayer.create('masonry'); // isFitWidth -> fitWidth

  Masonry.compatOptions.fitWidth = 'isFitWidth';
  var proto = Masonry.prototype;

  proto._resetLayout = function () {
    this.getSize();

    this._getMeasurement('columnWidth', 'outerWidth');

    this._getMeasurement('gutter', 'outerWidth');

    this.measureColumns(); // reset column Y

    this.colYs = [];

    for (var i = 0; i < this.cols; i++) {
      this.colYs.push(0);
    }

    this.maxY = 0;
    this.horizontalColIndex = 0;
  };

  proto.measureColumns = function () {
    this.getContainerWidth(); // if columnWidth is 0, default to outerWidth of first item

    if (!this.columnWidth) {
      var firstItem = this.items[0];
      var firstItemElem = firstItem && firstItem.element; // columnWidth fall back to item of first element

      this.columnWidth = firstItemElem && getSize(firstItemElem).outerWidth || // if first elem has no width, default to size of container
      this.containerWidth;
    }

    var columnWidth = this.columnWidth += this.gutter; // calculate columns

    var containerWidth = this.containerWidth + this.gutter;
    var cols = containerWidth / columnWidth; // fix rounding errors, typically with gutters

    var excess = columnWidth - containerWidth % columnWidth; // if overshoot is less than a pixel, round up, otherwise floor it

    var mathMethod = excess && excess < 1 ? 'round' : 'floor';
    cols = Math[mathMethod](cols);
    this.cols = Math.max(cols, 1);
  };

  proto.getContainerWidth = function () {
    // container is parent if fit width
    var isFitWidth = this._getOption('fitWidth');

    var container = isFitWidth ? this.element.parentNode : this.element; // check that this.size and size are there
    // IE8 triggers resize on body size change, so they might not be

    var size = getSize(container);
    this.containerWidth = size && size.innerWidth;
  };

  proto._getItemLayoutPosition = function (item) {
    item.getSize(); // how many columns does this brick span

    var remainder = item.size.outerWidth % this.columnWidth;
    var mathMethod = remainder && remainder < 1 ? 'round' : 'ceil'; // round if off by 1 pixel, otherwise use ceil

    var colSpan = Math[mathMethod](item.size.outerWidth / this.columnWidth);
    colSpan = Math.min(colSpan, this.cols); // use horizontal or top column position

    var colPosMethod = this.options.horizontalOrder ? '_getHorizontalColPosition' : '_getTopColPosition';
    var colPosition = this[colPosMethod](colSpan, item); // position the brick

    var position = {
      x: this.columnWidth * colPosition.col,
      y: colPosition.y
    }; // apply setHeight to necessary columns

    var setHeight = colPosition.y + item.size.outerHeight;
    var setMax = colSpan + colPosition.col;

    for (var i = colPosition.col; i < setMax; i++) {
      this.colYs[i] = setHeight;
    }

    return position;
  };

  proto._getTopColPosition = function (colSpan) {
    var colGroup = this._getTopColGroup(colSpan); // get the minimum Y value from the columns


    var minimumY = Math.min.apply(Math, colGroup);
    return {
      col: colGroup.indexOf(minimumY),
      y: minimumY
    };
  };
  /**
   * @param {Number} colSpan - number of columns the element spans
   * @returns {Array} colGroup
   */


  proto._getTopColGroup = function (colSpan) {
    if (colSpan < 2) {
      // if brick spans only one column, use all the column Ys
      return this.colYs;
    }

    var colGroup = []; // how many different places could this brick fit horizontally

    var groupCount = this.cols + 1 - colSpan; // for each group potential horizontal position

    for (var i = 0; i < groupCount; i++) {
      colGroup[i] = this._getColGroupY(i, colSpan);
    }

    return colGroup;
  };

  proto._getColGroupY = function (col, colSpan) {
    if (colSpan < 2) {
      return this.colYs[col];
    } // make an array of colY values for that one group


    var groupColYs = this.colYs.slice(col, col + colSpan); // and get the max value of the array

    return Math.max.apply(Math, groupColYs);
  }; // get column position based on horizontal index. #873


  proto._getHorizontalColPosition = function (colSpan, item) {
    var col = this.horizontalColIndex % this.cols;
    var isOver = colSpan > 1 && col + colSpan > this.cols; // shift to next row if item can't fit on current row

    col = isOver ? 0 : col; // don't let zero-size items take up space

    var hasSize = item.size.outerWidth && item.size.outerHeight;
    this.horizontalColIndex = hasSize ? col + colSpan : this.horizontalColIndex;
    return {
      col: col,
      y: this._getColGroupY(col, colSpan)
    };
  };

  proto._manageStamp = function (stamp) {
    var stampSize = getSize(stamp);

    var offset = this._getElementOffset(stamp); // get the columns that this stamp affects


    var isOriginLeft = this._getOption('originLeft');

    var firstX = isOriginLeft ? offset.left : offset.right;
    var lastX = firstX + stampSize.outerWidth;
    var firstCol = Math.floor(firstX / this.columnWidth);
    firstCol = Math.max(0, firstCol);
    var lastCol = Math.floor(lastX / this.columnWidth); // lastCol should not go over if multiple of columnWidth #425

    lastCol -= lastX % this.columnWidth ? 0 : 1;
    lastCol = Math.min(this.cols - 1, lastCol); // set colYs to bottom of the stamp

    var isOriginTop = this._getOption('originTop');

    var stampMaxY = (isOriginTop ? offset.top : offset.bottom) + stampSize.outerHeight;

    for (var i = firstCol; i <= lastCol; i++) {
      this.colYs[i] = Math.max(stampMaxY, this.colYs[i]);
    }
  };

  proto._getContainerSize = function () {
    this.maxY = Math.max.apply(Math, this.colYs);
    var size = {
      height: this.maxY
    };

    if (this._getOption('fitWidth')) {
      size.width = this._getContainerFitWidth();
    }

    return size;
  };

  proto._getContainerFitWidth = function () {
    var unusedCols = 0; // count unused columns

    var i = this.cols;

    while (--i) {
      if (this.colYs[i] !== 0) {
        break;
      }

      unusedCols++;
    } // fit container to columns that have been used


    return (this.cols - unusedCols) * this.columnWidth - this.gutter;
  };

  proto.needsResizeLayout = function () {
    var previousWidth = this.containerWidth;
    this.getContainerWidth();
    return previousWidth != this.containerWidth;
  };

  return Masonry;
});
/*!
 * Masonry layout mode
 * sub-classes Masonry
 * https://masonry.desandro.com
 */


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */

  /*globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('isotope-layout/js/layout-modes/masonry', ['../layout-mode', 'masonry-layout/masonry'], factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(require('../layout-mode'), require('masonry-layout'));
  } else {
    // browser global
    factory(window.Isotope.LayoutMode, window.Masonry);
  }
})(window, function factory(LayoutMode, Masonry) {
  'use strict'; // -------------------------- masonryDefinition -------------------------- //
  // create an Outlayer layout class

  var MasonryMode = LayoutMode.create('masonry');
  var proto = MasonryMode.prototype;
  var keepModeMethods = {
    _getElementOffset: true,
    layout: true,
    _getMeasurement: true
  }; // inherit Masonry prototype

  for (var method in Masonry.prototype) {
    // do not inherit mode methods
    if (!keepModeMethods[method]) {
      proto[method] = Masonry.prototype[method];
    }
  }

  var measureColumns = proto.measureColumns;

  proto.measureColumns = function () {
    // set items, used if measuring first item
    this.items = this.isotope.filteredItems;
    measureColumns.call(this);
  }; // point to mode options for fitWidth


  var _getOption = proto._getOption;

  proto._getOption = function (option) {
    if (option == 'fitWidth') {
      return this.options.isFitWidth !== undefined ? this.options.isFitWidth : this.options.fitWidth;
    }

    return _getOption.apply(this.isotope, arguments);
  };

  return MasonryMode;
});
/**
 * fitRows layout mode
 */


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */

  /*globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('isotope-layout/js/layout-modes/fit-rows', ['../layout-mode'], factory);
  } else if ((typeof exports === "undefined" ? "undefined" : _typeof(exports)) == 'object') {
    // CommonJS
    module.exports = factory(require('../layout-mode'));
  } else {
    // browser global
    factory(window.Isotope.LayoutMode);
  }
})(window, function factory(LayoutMode) {
  'use strict';

  var FitRows = LayoutMode.create('fitRows');
  var proto = FitRows.prototype;

  proto._resetLayout = function () {
    this.x = 0;
    this.y = 0;
    this.maxY = 0;

    this._getMeasurement('gutter', 'outerWidth');
  };

  proto._getItemLayoutPosition = function (item) {
    item.getSize();
    var itemWidth = item.size.outerWidth + this.gutter; // if this element cannot fit in the current row

    var containerWidth = this.isotope.size.innerWidth + this.gutter;

    if (this.x !== 0 && itemWidth + this.x > containerWidth) {
      this.x = 0;
      this.y = this.maxY;
    }

    var position = {
      x: this.x,
      y: this.y
    };
    this.maxY = Math.max(this.maxY, this.y + item.size.outerHeight);
    this.x += itemWidth;
    return position;
  };

  proto._getContainerSize = function () {
    return {
      height: this.maxY
    };
  };

  return FitRows;
});
/**
 * vertical layout mode
 */


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */

  /*globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define('isotope-layout/js/layout-modes/vertical', ['../layout-mode'], factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(require('../layout-mode'));
  } else {
    // browser global
    factory(window.Isotope.LayoutMode);
  }
})(window, function factory(LayoutMode) {
  'use strict';

  var Vertical = LayoutMode.create('vertical', {
    horizontalAlignment: 0
  });
  var proto = Vertical.prototype;

  proto._resetLayout = function () {
    this.y = 0;
  };

  proto._getItemLayoutPosition = function (item) {
    item.getSize();
    var x = (this.isotope.size.innerWidth - item.size.outerWidth) * this.options.horizontalAlignment;
    var y = this.y;
    this.y += item.size.outerHeight;
    return {
      x: x,
      y: y
    };
  };

  proto._getContainerSize = function () {
    return {
      height: this.y
    };
  };

  return Vertical;
});
/*!
 * Isotope v3.0.6
 *
 * Licensed GPLv3 for open source use
 * or Isotope Commercial License for commercial use
 *
 * https://isotope.metafizzy.co
 * Copyright 2010-2018 Metafizzy
 */


(function (window, factory) {
  // universal module definition

  /* jshint strict: false */

  /*globals define, module, require */
  if (typeof define == 'function' && define.amd) {
    // AMD
    define(['outlayer/outlayer', 'get-size/get-size', 'desandro-matches-selector/matches-selector', 'fizzy-ui-utils/utils', 'isotope-layout/js/item', 'isotope-layout/js/layout-mode', // include default layout modes
    'isotope-layout/js/layout-modes/masonry', 'isotope-layout/js/layout-modes/fit-rows', 'isotope-layout/js/layout-modes/vertical'], function (Outlayer, getSize, matchesSelector, utils, Item, LayoutMode) {
      return factory(window, Outlayer, getSize, matchesSelector, utils, Item, LayoutMode);
    });
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) == 'object' && module.exports) {
    // CommonJS
    module.exports = factory(window, require('outlayer'), require('get-size'), require('desandro-matches-selector'), require('fizzy-ui-utils'), require('isotope-layout/js/item'), require('isotope-layout/js/layout-mode'), // include default layout modes
    require('isotope-layout/js/layout-modes/masonry'), require('isotope-layout/js/layout-modes/fit-rows'), require('isotope-layout/js/layout-modes/vertical'));
  } else {
    // browser global
    window.Isotope = factory(window, window.Outlayer, window.getSize, window.matchesSelector, window.fizzyUIUtils, window.Isotope.Item, window.Isotope.LayoutMode);
  }
})(window, function factory(window, Outlayer, getSize, matchesSelector, utils, Item, LayoutMode) {
  // -------------------------- vars -------------------------- //
  var jQuery = window.jQuery; // -------------------------- helpers -------------------------- //

  var trim = String.prototype.trim ? function (str) {
    return str.trim();
  } : function (str) {
    return str.replace(/^\s+|\s+$/g, '');
  }; // -------------------------- isotopeDefinition -------------------------- //
  // create an Outlayer layout class

  var Isotope = Outlayer.create('isotope', {
    layoutMode: 'masonry',
    isJQueryFiltering: true,
    sortAscending: true
  });
  Isotope.Item = Item;
  Isotope.LayoutMode = LayoutMode;
  var proto = Isotope.prototype;

  proto._create = function () {
    this.itemGUID = 0; // functions that sort items

    this._sorters = {};

    this._getSorters(); // call super


    Outlayer.prototype._create.call(this); // create layout modes


    this.modes = {}; // start filteredItems with all items

    this.filteredItems = this.items; // keep of track of sortBys

    this.sortHistory = ['original-order']; // create from registered layout modes

    for (var name in LayoutMode.modes) {
      this._initLayoutMode(name);
    }
  };

  proto.reloadItems = function () {
    // reset item ID counter
    this.itemGUID = 0; // call super

    Outlayer.prototype.reloadItems.call(this);
  };

  proto._itemize = function () {
    var items = Outlayer.prototype._itemize.apply(this, arguments); // assign ID for original-order


    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      item.id = this.itemGUID++;
    }

    this._updateItemsSortData(items);

    return items;
  }; // -------------------------- layout -------------------------- //


  proto._initLayoutMode = function (name) {
    var Mode = LayoutMode.modes[name]; // set mode options
    // HACK extend initial options, back-fill in default options

    var initialOpts = this.options[name] || {};
    this.options[name] = Mode.options ? utils.extend(Mode.options, initialOpts) : initialOpts; // init layout mode instance

    this.modes[name] = new Mode(this);
  };

  proto.layout = function () {
    // if first time doing layout, do all magic
    if (!this._isLayoutInited && this._getOption('initLayout')) {
      this.arrange();
      return;
    }

    this._layout();
  }; // private method to be used in layout() & magic()


  proto._layout = function () {
    // don't animate first layout
    var isInstant = this._getIsInstant(); // layout flow


    this._resetLayout();

    this._manageStamps();

    this.layoutItems(this.filteredItems, isInstant); // flag for initalized

    this._isLayoutInited = true;
  }; // filter + sort + layout


  proto.arrange = function (opts) {
    // set any options pass
    this.option(opts);

    this._getIsInstant(); // filter, sort, and layout
    // filter


    var filtered = this._filter(this.items);

    this.filteredItems = filtered.matches;

    this._bindArrangeComplete();

    if (this._isInstant) {
      this._noTransition(this._hideReveal, [filtered]);
    } else {
      this._hideReveal(filtered);
    }

    this._sort();

    this._layout();
  }; // alias to _init for main plugin method


  proto._init = proto.arrange;

  proto._hideReveal = function (filtered) {
    this.reveal(filtered.needReveal);
    this.hide(filtered.needHide);
  }; // HACK
  // Don't animate/transition first layout
  // Or don't animate/transition other layouts


  proto._getIsInstant = function () {
    var isLayoutInstant = this._getOption('layoutInstant');

    var isInstant = isLayoutInstant !== undefined ? isLayoutInstant : !this._isLayoutInited;
    this._isInstant = isInstant;
    return isInstant;
  }; // listen for layoutComplete, hideComplete and revealComplete
  // to trigger arrangeComplete


  proto._bindArrangeComplete = function () {
    // listen for 3 events to trigger arrangeComplete
    var isLayoutComplete, isHideComplete, isRevealComplete;

    var _this = this;

    function arrangeParallelCallback() {
      if (isLayoutComplete && isHideComplete && isRevealComplete) {
        _this.dispatchEvent('arrangeComplete', null, [_this.filteredItems]);
      }
    }

    this.once('layoutComplete', function () {
      isLayoutComplete = true;
      arrangeParallelCallback();
    });
    this.once('hideComplete', function () {
      isHideComplete = true;
      arrangeParallelCallback();
    });
    this.once('revealComplete', function () {
      isRevealComplete = true;
      arrangeParallelCallback();
    });
  }; // -------------------------- filter -------------------------- //


  proto._filter = function (items) {
    var filter = this.options.filter;
    filter = filter || '*';
    var matches = [];
    var hiddenMatched = [];
    var visibleUnmatched = [];

    var test = this._getFilterTest(filter); // test each item


    for (var i = 0; i < items.length; i++) {
      var item = items[i];

      if (item.isIgnored) {
        continue;
      } // add item to either matched or unmatched group


      var isMatched = test(item); // item.isFilterMatched = isMatched;
      // add to matches if its a match

      if (isMatched) {
        matches.push(item);
      } // add to additional group if item needs to be hidden or revealed


      if (isMatched && item.isHidden) {
        hiddenMatched.push(item);
      } else if (!isMatched && !item.isHidden) {
        visibleUnmatched.push(item);
      }
    } // return collections of items to be manipulated


    return {
      matches: matches,
      needReveal: hiddenMatched,
      needHide: visibleUnmatched
    };
  }; // get a jQuery, function, or a matchesSelector test given the filter


  proto._getFilterTest = function (filter) {
    if (jQuery && this.options.isJQueryFiltering) {
      // use jQuery
      return function (item) {
        return jQuery(item.element).is(filter);
      };
    }

    if (typeof filter == 'function') {
      // use filter as function
      return function (item) {
        return filter(item.element);
      };
    } // default, use filter as selector string


    return function (item) {
      return matchesSelector(item.element, filter);
    };
  }; // -------------------------- sorting -------------------------- //

  /**
   * @params {Array} elems
   * @public
   */


  proto.updateSortData = function (elems) {
    // get items
    var items;

    if (elems) {
      elems = utils.makeArray(elems);
      items = this.getItems(elems);
    } else {
      // update all items if no elems provided
      items = this.items;
    }

    this._getSorters();

    this._updateItemsSortData(items);
  };

  proto._getSorters = function () {
    var getSortData = this.options.getSortData;

    for (var key in getSortData) {
      var sorter = getSortData[key];
      this._sorters[key] = mungeSorter(sorter);
    }
  };
  /**
   * @params {Array} items - of Isotope.Items
   * @private
   */


  proto._updateItemsSortData = function (items) {
    // do not update if no items
    var len = items && items.length;

    for (var i = 0; len && i < len; i++) {
      var item = items[i];
      item.updateSortData();
    }
  }; // ----- munge sorter ----- //
  // encapsulate this, as we just need mungeSorter
  // other functions in here are just for munging


  var mungeSorter = function () {
    // add a magic layer to sorters for convienent shorthands
    // `.foo-bar` will use the text of .foo-bar querySelector
    // `[foo-bar]` will use attribute
    // you can also add parser
    // `.foo-bar parseInt` will parse that as a number
    function mungeSorter(sorter) {
      // if not a string, return function or whatever it is
      if (typeof sorter != 'string') {
        return sorter;
      } // parse the sorter string


      var args = trim(sorter).split(' ');
      var query = args[0]; // check if query looks like [an-attribute]

      var attrMatch = query.match(/^\[(.+)\]$/);
      var attr = attrMatch && attrMatch[1];
      var getValue = getValueGetter(attr, query); // use second argument as a parser

      var parser = Isotope.sortDataParsers[args[1]]; // parse the value, if there was a parser

      sorter = parser ? function (elem) {
        return elem && parser(getValue(elem));
      } : // otherwise just return value
      function (elem) {
        return elem && getValue(elem);
      };
      return sorter;
    } // get an attribute getter, or get text of the querySelector


    function getValueGetter(attr, query) {
      // if query looks like [foo-bar], get attribute
      if (attr) {
        return function getAttribute(elem) {
          return elem.getAttribute(attr);
        };
      } // otherwise, assume its a querySelector, and get its text


      return function getChildText(elem) {
        var child = elem.querySelector(query);
        return child && child.textContent;
      };
    }

    return mungeSorter;
  }(); // parsers used in getSortData shortcut strings


  Isotope.sortDataParsers = {
    'parseInt': function (_parseInt) {
      function parseInt(_x) {
        return _parseInt.apply(this, arguments);
      }

      parseInt.toString = function () {
        return _parseInt.toString();
      };

      return parseInt;
    }(function (val) {
      return parseInt(val, 10);
    }),
    'parseFloat': function (_parseFloat) {
      function parseFloat(_x2) {
        return _parseFloat.apply(this, arguments);
      }

      parseFloat.toString = function () {
        return _parseFloat.toString();
      };

      return parseFloat;
    }(function (val) {
      return parseFloat(val);
    })
  }; // ----- sort method ----- //
  // sort filteredItem order

  proto._sort = function () {
    if (!this.options.sortBy) {
      return;
    } // keep track of sortBy History


    var sortBys = utils.makeArray(this.options.sortBy);

    if (!this._getIsSameSortBy(sortBys)) {
      // concat all sortBy and sortHistory, add to front, oldest goes in last
      this.sortHistory = sortBys.concat(this.sortHistory);
    } // sort magic


    var itemSorter = getItemSorter(this.sortHistory, this.options.sortAscending);
    this.filteredItems.sort(itemSorter);
  }; // check if sortBys is same as start of sortHistory


  proto._getIsSameSortBy = function (sortBys) {
    for (var i = 0; i < sortBys.length; i++) {
      if (sortBys[i] != this.sortHistory[i]) {
        return false;
      }
    }

    return true;
  }; // returns a function used for sorting


  function getItemSorter(sortBys, sortAsc) {
    return function sorter(itemA, itemB) {
      // cycle through all sortKeys
      for (var i = 0; i < sortBys.length; i++) {
        var sortBy = sortBys[i];
        var a = itemA.sortData[sortBy];
        var b = itemB.sortData[sortBy];

        if (a > b || a < b) {
          // if sortAsc is an object, use the value given the sortBy key
          var isAscending = sortAsc[sortBy] !== undefined ? sortAsc[sortBy] : sortAsc;
          var direction = isAscending ? 1 : -1;
          return (a > b ? 1 : -1) * direction;
        }
      }

      return 0;
    };
  } // -------------------------- methods -------------------------- //
  // get layout mode


  proto._mode = function () {
    var layoutMode = this.options.layoutMode;
    var mode = this.modes[layoutMode];

    if (!mode) {
      // TODO console.error
      throw new Error('No layout mode: ' + layoutMode);
    } // HACK sync mode's options
    // any options set after init for layout mode need to be synced


    mode.options = this.options[layoutMode];
    return mode;
  };

  proto._resetLayout = function () {
    // trigger original reset layout
    Outlayer.prototype._resetLayout.call(this);

    this._mode()._resetLayout();
  };

  proto._getItemLayoutPosition = function (item) {
    return this._mode()._getItemLayoutPosition(item);
  };

  proto._manageStamp = function (stamp) {
    this._mode()._manageStamp(stamp);
  };

  proto._getContainerSize = function () {
    return this._mode()._getContainerSize();
  };

  proto.needsResizeLayout = function () {
    return this._mode().needsResizeLayout();
  }; // -------------------------- adding & removing -------------------------- //
  // HEADS UP overwrites default Outlayer appended


  proto.appended = function (elems) {
    var items = this.addItems(elems);

    if (!items.length) {
      return;
    } // filter, layout, reveal new items


    var filteredItems = this._filterRevealAdded(items); // add to filteredItems


    this.filteredItems = this.filteredItems.concat(filteredItems);
  }; // HEADS UP overwrites default Outlayer prepended


  proto.prepended = function (elems) {
    var items = this._itemize(elems);

    if (!items.length) {
      return;
    } // start new layout


    this._resetLayout();

    this._manageStamps(); // filter, layout, reveal new items


    var filteredItems = this._filterRevealAdded(items); // layout previous items


    this.layoutItems(this.filteredItems); // add to items and filteredItems

    this.filteredItems = filteredItems.concat(this.filteredItems);
    this.items = items.concat(this.items);
  };

  proto._filterRevealAdded = function (items) {
    var filtered = this._filter(items);

    this.hide(filtered.needHide); // reveal all new items

    this.reveal(filtered.matches); // layout new items, no transition

    this.layoutItems(filtered.matches, true);
    return filtered.matches;
  };
  /**
   * Filter, sort, and layout newly-appended item elements
   * @param {Array or NodeList or Element} elems
   */


  proto.insert = function (elems) {
    var items = this.addItems(elems);

    if (!items.length) {
      return;
    } // append item elements


    var i, item;
    var len = items.length;

    for (i = 0; i < len; i++) {
      item = items[i];
      this.element.appendChild(item.element);
    } // filter new stuff


    var filteredInsertItems = this._filter(items).matches; // set flag


    for (i = 0; i < len; i++) {
      items[i].isLayoutInstant = true;
    }

    this.arrange(); // reset flag

    for (i = 0; i < len; i++) {
      delete items[i].isLayoutInstant;
    }

    this.reveal(filteredInsertItems);
  };

  var _remove = proto.remove;

  proto.remove = function (elems) {
    elems = utils.makeArray(elems);
    var removeItems = this.getItems(elems); // do regular thing

    _remove.call(this, elems); // bail if no items to remove


    var len = removeItems && removeItems.length; // remove elems from filteredItems

    for (var i = 0; len && i < len; i++) {
      var item = removeItems[i]; // remove item from collection

      utils.removeFrom(this.filteredItems, item);
    }
  };

  proto.shuffle = function () {
    // update random sortData
    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      item.sortData.random = Math.random();
    }

    this.options.sortBy = 'random';

    this._sort();

    this._layout();
  };
  /**
   * trigger fn without transition
   * kind of hacky to have this in the first place
   * @param {Function} fn
   * @param {Array} args
   * @returns ret
   * @private
   */


  proto._noTransition = function (fn, args) {
    // save transitionDuration before disabling
    var transitionDuration = this.options.transitionDuration; // disable transition

    this.options.transitionDuration = 0; // do it

    var returnValue = fn.apply(this, args); // re-enable transition for reveal

    this.options.transitionDuration = transitionDuration;
    return returnValue;
  }; // ----- helper methods ----- //

  /**
   * getter method for getting filtered item elements
   * @returns {Array} elems - collection of item elements
   */


  proto.getFilteredItemElements = function () {
    return this.filteredItems.map(function (item) {
      return item.element;
    });
  }; // -----  ----- //


  return Isotope;
});;"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

// ------------------------------------------
// Rellax.js
// Buttery smooth parallax library
// Copyright (c) 2016 Moe Amaya (@moeamaya)
// MIT license
//
// Thanks to Paraxify.js and Jaime Cabllero
// for parallax concepts
// ------------------------------------------
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if ((typeof module === "undefined" ? "undefined" : _typeof(module)) === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.Rellax = factory();
  }
})(typeof window !== "undefined" ? window : global, function () {
  var Rellax = function Rellax(el, options) {
    "use strict";

    var self = Object.create(Rellax.prototype);
    var posY = 0;
    var screenY = 0;
    var posX = 0;
    var screenX = 0;
    var blocks = [];
    var pause = true; // check what requestAnimationFrame to use, and if
    // it's not supported, use the onscroll event

    var loop = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame || window.oRequestAnimationFrame || function (callback) {
      return setTimeout(callback, 1000 / 60);
    }; // store the id for later use


    var loopId = null; // Test via a getter in the options object to see if the passive property is accessed

    var supportsPassive = false;

    try {
      var opts = Object.defineProperty({}, 'passive', {
        get: function get() {
          supportsPassive = true;
        }
      });
      window.addEventListener("testPassive", null, opts);
      window.removeEventListener("testPassive", null, opts);
    } catch (e) {} // check what cancelAnimation method to use


    var clearLoop = window.cancelAnimationFrame || window.mozCancelAnimationFrame || clearTimeout; // check which transform property to use

    var transformProp = window.transformProp || function () {
      var testEl = document.createElement('div');

      if (testEl.style.transform === null) {
        var vendors = ['Webkit', 'Moz', 'ms'];

        for (var vendor in vendors) {
          if (testEl.style[vendors[vendor] + 'Transform'] !== undefined) {
            return vendors[vendor] + 'Transform';
          }
        }
      }

      return 'transform';
    }(); // Default Settings


    self.options = {
      speed: -2,
      verticalSpeed: null,
      horizontalSpeed: null,
      breakpoints: [576, 768, 1201],
      center: false,
      wrapper: null,
      relativeToWrapper: false,
      round: true,
      vertical: true,
      horizontal: false,
      verticalScrollAxis: "y",
      horizontalScrollAxis: "x",
      callback: function callback() {}
    }; // User defined options (might have more in the future)

    if (options) {
      Object.keys(options).forEach(function (key) {
        self.options[key] = options[key];
      });
    }

    function validateCustomBreakpoints() {
      if (self.options.breakpoints.length === 3 && Array.isArray(self.options.breakpoints)) {
        var isAscending = true;
        var isNumerical = true;
        var lastVal;
        self.options.breakpoints.forEach(function (i) {
          if (typeof i !== 'number') isNumerical = false;

          if (lastVal !== null) {
            if (i < lastVal) isAscending = false;
          }

          lastVal = i;
        });
        if (isAscending && isNumerical) return;
      } // revert defaults if set incorrectly


      self.options.breakpoints = [576, 768, 1201];
      console.warn("Rellax: You must pass an array of 3 numbers in ascending order to the breakpoints option. Defaults reverted");
    }

    if (options.breakpoints) {
      validateCustomBreakpoints();
    } // By default, rellax class


    if (!el) {
      el = '.rellax';
    } // check if el is a className or a node


    var elements = typeof el === 'string' ? document.querySelectorAll(el) : [el]; // Now query selector

    if (elements.length > 0) {
      self.elems = elements;
    } // The elements don't exist
    else {
        console.warn("Rellax: The elements you're trying to select don't exist.");
        return;
      } // Has a wrapper and it exists


    if (self.options.wrapper) {
      if (!self.options.wrapper.nodeType) {
        var wrapper = document.querySelector(self.options.wrapper);

        if (wrapper) {
          self.options.wrapper = wrapper;
        } else {
          console.warn("Rellax: The wrapper you're trying to use doesn't exist.");
          return;
        }
      }
    } // set a placeholder for the current breakpoint


    var currentBreakpoint; // helper to determine current breakpoint

    var getCurrentBreakpoint = function getCurrentBreakpoint(w) {
      var bp = self.options.breakpoints;
      if (w < bp[0]) return 'xs';
      if (w >= bp[0] && w < bp[1]) return 'sm';
      if (w >= bp[1] && w < bp[2]) return 'md';
      return 'lg';
    }; // Get and cache initial position of all elements


    var cacheBlocks = function cacheBlocks() {
      for (var i = 0; i < self.elems.length; i++) {
        var block = createBlock(self.elems[i]);
        blocks.push(block);
      }
    }; // Let's kick this script off
    // Build array for cached element values


    var init = function init() {
      for (var i = 0; i < blocks.length; i++) {
        self.elems[i].style.cssText = blocks[i].style;
      }

      blocks = [];
      screenY = window.innerHeight;
      screenX = window.innerWidth;
      currentBreakpoint = getCurrentBreakpoint(screenX);
      setPosition();
      cacheBlocks();
      animate(); // If paused, unpause and set listener for window resizing events

      if (pause) {
        window.addEventListener('resize', init);
        pause = false; // Start the loop

        update();
      }
    }; // We want to cache the parallax blocks'
    // values: base, top, height, speed
    // el: is dom object, return: el cache values


    var createBlock = function createBlock(el) {
      var dataPercentage = el.getAttribute('data-rellax-percentage');
      var dataSpeed = el.getAttribute('data-rellax-speed');
      var dataXsSpeed = el.getAttribute('data-rellax-xs-speed');
      var dataMobileSpeed = el.getAttribute('data-rellax-mobile-speed');
      var dataTabletSpeed = el.getAttribute('data-rellax-tablet-speed');
      var dataDesktopSpeed = el.getAttribute('data-rellax-desktop-speed');
      var dataVerticalSpeed = el.getAttribute('data-rellax-vertical-speed');
      var dataHorizontalSpeed = el.getAttribute('data-rellax-horizontal-speed');
      var dataVericalScrollAxis = el.getAttribute('data-rellax-vertical-scroll-axis');
      var dataHorizontalScrollAxis = el.getAttribute('data-rellax-horizontal-scroll-axis');
      var dataZindex = el.getAttribute('data-rellax-zindex') || 0;
      var dataMin = el.getAttribute('data-rellax-min');
      var dataMax = el.getAttribute('data-rellax-max');
      var dataMinX = el.getAttribute('data-rellax-min-x');
      var dataMaxX = el.getAttribute('data-rellax-max-x');
      var dataMinY = el.getAttribute('data-rellax-min-y');
      var dataMaxY = el.getAttribute('data-rellax-max-y');
      var mapBreakpoints;
      var breakpoints = true;

      if (!dataXsSpeed && !dataMobileSpeed && !dataTabletSpeed && !dataDesktopSpeed) {
        breakpoints = false;
      } else {
        mapBreakpoints = {
          'xs': dataXsSpeed,
          'sm': dataMobileSpeed,
          'md': dataTabletSpeed,
          'lg': dataDesktopSpeed
        };
      } // initializing at scrollY = 0 (top of browser), scrollX = 0 (left of browser)
      // ensures elements are positioned based on HTML layout.
      //
      // If the element has the percentage attribute, the posY and posX needs to be
      // the current scroll position's value, so that the elements are still positioned based on HTML layout


      var wrapperPosY = self.options.wrapper ? self.options.wrapper.scrollTop : window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop; // If the option relativeToWrapper is true, use the wrappers offset to top, subtracted from the current page scroll.

      if (self.options.relativeToWrapper) {
        var scrollPosY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
        wrapperPosY = scrollPosY - self.options.wrapper.offsetTop;
      }

      var posY = self.options.vertical ? dataPercentage || self.options.center ? wrapperPosY : 0 : 0;
      var posX = self.options.horizontal ? dataPercentage || self.options.center ? self.options.wrapper ? self.options.wrapper.scrollLeft : window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft : 0 : 0;
      var blockTop = posY + el.getBoundingClientRect().top;
      var blockHeight = el.clientHeight || el.offsetHeight || el.scrollHeight;
      var blockLeft = posX + el.getBoundingClientRect().left;
      var blockWidth = el.clientWidth || el.offsetWidth || el.scrollWidth; // apparently parallax equation everyone uses

      var percentageY = dataPercentage ? dataPercentage : (posY - blockTop + screenY) / (blockHeight + screenY);
      var percentageX = dataPercentage ? dataPercentage : (posX - blockLeft + screenX) / (blockWidth + screenX);

      if (self.options.center) {
        percentageX = 0.5;
        percentageY = 0.5;
      } // Optional individual block speed as data attr, otherwise global speed


      var speed = breakpoints && mapBreakpoints[currentBreakpoint] !== null ? Number(mapBreakpoints[currentBreakpoint]) : dataSpeed ? dataSpeed : self.options.speed;
      var verticalSpeed = dataVerticalSpeed ? dataVerticalSpeed : self.options.verticalSpeed;
      var horizontalSpeed = dataHorizontalSpeed ? dataHorizontalSpeed : self.options.horizontalSpeed; // Optional individual block movement axis direction as data attr, otherwise gobal movement direction

      var verticalScrollAxis = dataVericalScrollAxis ? dataVericalScrollAxis : self.options.verticalScrollAxis;
      var horizontalScrollAxis = dataHorizontalScrollAxis ? dataHorizontalScrollAxis : self.options.horizontalScrollAxis;
      var bases = updatePosition(percentageX, percentageY, speed, verticalSpeed, horizontalSpeed); // ~~Store non-translate3d transforms~~
      // Store inline styles and extract transforms

      var style = el.style.cssText;
      var transform = ''; // Check if there's an inline styled transform

      var searchResult = /transform\s*:/i.exec(style);

      if (searchResult) {
        // Get the index of the transform
        var index = searchResult.index; // Trim the style to the transform point and get the following semi-colon index

        var trimmedStyle = style.slice(index);
        var delimiter = trimmedStyle.indexOf(';'); // Remove "transform" string and save the attribute

        if (delimiter) {
          transform = " " + trimmedStyle.slice(11, delimiter).replace(/\s/g, '');
        } else {
          transform = " " + trimmedStyle.slice(11).replace(/\s/g, '');
        }
      }

      return {
        baseX: bases.x,
        baseY: bases.y,
        top: blockTop,
        left: blockLeft,
        height: blockHeight,
        width: blockWidth,
        speed: speed,
        verticalSpeed: verticalSpeed,
        horizontalSpeed: horizontalSpeed,
        verticalScrollAxis: verticalScrollAxis,
        horizontalScrollAxis: horizontalScrollAxis,
        style: style,
        transform: transform,
        zindex: dataZindex,
        min: dataMin,
        max: dataMax,
        minX: dataMinX,
        maxX: dataMaxX,
        minY: dataMinY,
        maxY: dataMaxY
      };
    }; // set scroll position (posY, posX)
    // side effect method is not ideal, but okay for now
    // returns true if the scroll changed, false if nothing happened


    var setPosition = function setPosition() {
      var oldY = posY;
      var oldX = posX;
      posY = self.options.wrapper ? self.options.wrapper.scrollTop : (document.documentElement || document.body.parentNode || document.body).scrollTop || window.pageYOffset;
      posX = self.options.wrapper ? self.options.wrapper.scrollLeft : (document.documentElement || document.body.parentNode || document.body).scrollLeft || window.pageXOffset; // If option relativeToWrapper is true, use relative wrapper value instead.

      if (self.options.relativeToWrapper) {
        var scrollPosY = (document.documentElement || document.body.parentNode || document.body).scrollTop || window.pageYOffset;
        posY = scrollPosY - self.options.wrapper.offsetTop;
      }

      if (oldY != posY && self.options.vertical) {
        // scroll changed, return true
        return true;
      }

      if (oldX != posX && self.options.horizontal) {
        // scroll changed, return true
        return true;
      } // scroll did not change


      return false;
    }; // Ahh a pure function, gets new transform value
    // based on scrollPosition and speed
    // Allow for decimal pixel values


    var updatePosition = function updatePosition(percentageX, percentageY, speed, verticalSpeed, horizontalSpeed) {
      var result = {};
      var valueX = (horizontalSpeed ? horizontalSpeed : speed) * (100 * (1 - percentageX));
      var valueY = (verticalSpeed ? verticalSpeed : speed) * (100 * (1 - percentageY));
      result.x = self.options.round ? Math.round(valueX) : Math.round(valueX * 100) / 100;
      result.y = self.options.round ? Math.round(valueY) : Math.round(valueY * 100) / 100;
      return result;
    }; // Remove event listeners and loop again


    var deferredUpdate = function deferredUpdate() {
      window.removeEventListener('resize', deferredUpdate);
      window.removeEventListener('orientationchange', deferredUpdate);
      (self.options.wrapper ? self.options.wrapper : window).removeEventListener('scroll', deferredUpdate);
      (self.options.wrapper ? self.options.wrapper : document).removeEventListener('touchmove', deferredUpdate); // loop again

      loopId = loop(update);
    }; // Loop


    var update = function update() {
      if (setPosition() && pause === false) {
        animate(); // loop again

        loopId = loop(update);
      } else {
        loopId = null; // Don't animate until we get a position updating event

        window.addEventListener('resize', deferredUpdate);
        window.addEventListener('orientationchange', deferredUpdate);
        (self.options.wrapper ? self.options.wrapper : window).addEventListener('scroll', deferredUpdate, supportsPassive ? {
          passive: true
        } : false);
        (self.options.wrapper ? self.options.wrapper : document).addEventListener('touchmove', deferredUpdate, supportsPassive ? {
          passive: true
        } : false);
      }
    }; // Transform3d on parallax element


    var animate = function animate() {
      var positions;

      for (var i = 0; i < self.elems.length; i++) {
        // Determine relevant movement directions
        var verticalScrollAxis = blocks[i].verticalScrollAxis.toLowerCase();
        var horizontalScrollAxis = blocks[i].horizontalScrollAxis.toLowerCase();
        var verticalScrollX = verticalScrollAxis.indexOf("x") != -1 ? posY : 0;
        var verticalScrollY = verticalScrollAxis.indexOf("y") != -1 ? posY : 0;
        var horizontalScrollX = horizontalScrollAxis.indexOf("x") != -1 ? posX : 0;
        var horizontalScrollY = horizontalScrollAxis.indexOf("y") != -1 ? posX : 0;
        var percentageY = (verticalScrollY + horizontalScrollY - blocks[i].top + screenY) / (blocks[i].height + screenY);
        var percentageX = (verticalScrollX + horizontalScrollX - blocks[i].left + screenX) / (blocks[i].width + screenX); // Subtracting initialize value, so element stays in same spot as HTML

        positions = updatePosition(percentageX, percentageY, blocks[i].speed, blocks[i].verticalSpeed, blocks[i].horizontalSpeed);
        var positionY = positions.y - blocks[i].baseY;
        var positionX = positions.x - blocks[i].baseX; // The next two "if" blocks go like this:
        // Check if a limit is defined (first "min", then "max");
        // Check if we need to change the Y or the X
        // (Currently working only if just one of the axes is enabled)
        // Then, check if the new position is inside the allowed limit
        // If so, use new position. If not, set position to limit.
        // Check if a min limit is defined

        if (blocks[i].min !== null) {
          if (self.options.vertical && !self.options.horizontal) {
            positionY = positionY <= blocks[i].min ? blocks[i].min : positionY;
          }

          if (self.options.horizontal && !self.options.vertical) {
            positionX = positionX <= blocks[i].min ? blocks[i].min : positionX;
          }
        } // Check if directional min limits are defined


        if (blocks[i].minY != null) {
          positionY = positionY <= blocks[i].minY ? blocks[i].minY : positionY;
        }

        if (blocks[i].minX != null) {
          positionX = positionX <= blocks[i].minX ? blocks[i].minX : positionX;
        } // Check if a max limit is defined


        if (blocks[i].max !== null) {
          if (self.options.vertical && !self.options.horizontal) {
            positionY = positionY >= blocks[i].max ? blocks[i].max : positionY;
          }

          if (self.options.horizontal && !self.options.vertical) {
            positionX = positionX >= blocks[i].max ? blocks[i].max : positionX;
          }
        } // Check if directional max limits are defined


        if (blocks[i].maxY != null) {
          positionY = positionY >= blocks[i].maxY ? blocks[i].maxY : positionY;
        }

        if (blocks[i].maxX != null) {
          positionX = positionX >= blocks[i].maxX ? blocks[i].maxX : positionX;
        }

        var zindex = blocks[i].zindex; // Move that element
        // (Set the new translation and append initial inline transforms.)

        var translate = 'translate3d(' + (self.options.horizontal ? positionX : '0') + 'px,' + (self.options.vertical ? positionY : '0') + 'px,' + zindex + 'px) ' + blocks[i].transform;
        self.elems[i].style[transformProp] = translate;
      }

      self.options.callback(positions);
    };

    self.destroy = function () {
      for (var i = 0; i < self.elems.length; i++) {
        self.elems[i].style.cssText = blocks[i].style;
      } // Remove resize event listener if not pause, and pause


      if (!pause) {
        window.removeEventListener('resize', init);
        pause = true;
      } // Clear the animation loop to prevent possible memory leak


      clearLoop(loopId);
      loopId = null;
    }; // Init


    init(); // Allow to recalculate the initial values whenever we want

    self.refresh = init;
    return self;
  };

  return Rellax;
});;"use strict";

/*

 MyFonts Webfont Build ID 3844430, 2019-12-05T10:12:40-0500

 The fonts listed in this notice are subject to the End User License
 Agreement(s) entered into by the website owner. All other parties are
 explicitly restricted from using the Licensed Webfonts(s).

 You may obtain a valid license at the URLs below.

 Webfont: Gilroy-SemiBoldItalic by Radomir Tinkov
 URL: https://www.myfonts.com/fonts/radomir-tinkov/gilroy/semi-bold-italic/
 Copyright: Copyright &#x00A9; 2015 by Radomir Tinkov. All rights reserved.

 Webfont: Gilroy-SemiBold by Radomir Tinkov
 URL: https://www.myfonts.com/fonts/radomir-tinkov/gilroy/semi-bold/
 Copyright: Copyright &#x00A9; 2016 by Radomir Tinkov. All rights reserved.

 Webfont: Gilroy-BoldItalic by Radomir Tinkov
 URL: https://www.myfonts.com/fonts/radomir-tinkov/gilroy/bold-italic/
 Copyright: Copyright &#x00A9; 2015 by Radomir Tinkov. All rights reserved.

 Webfont: Gilroy-Bold by Radomir Tinkov
 URL: https://www.myfonts.com/fonts/radomir-tinkov/gilroy/bold/
 Copyright: Copyright &#x00A9; 2016 by Radomir Tinkov. All rights reserved.


 Licensed pageviews: 20,000

 ? 2019 MyFonts Inc
*/
var protocol = document.location.protocol;
"https:" != protocol && (protocol = "http:");
var count = document.createElement("script");
count.type = "text/javascript";
count.async = !0;
count.src = protocol + "//hello.myfonts.net/count/3aa94e";
var s = document.getElementsByTagName("script")[0];
s.parentNode.insertBefore(count, s);
var browserName, browserVersion, webfontType;
if ("undefined" == typeof woffEnabled) var woffEnabled = !0;
var svgEnabled = 1,
    woff2Enabled = 1;
if ("undefined" != typeof customPath) var path = customPath;else {
  var scripts = document.getElementsByTagName("SCRIPT"),
      script = scripts[scripts.length - 1].src;
  script.match("://") || "/" == script.charAt(0) || (script = "./" + script);
  path = script.replace(/\\/g, "/").replace(/\/[^\/]*\/?$/, "");
}
var wfpath = path + "/fonts/",
    browsers = [{
  regex: "MSIE (\\d+\\.\\d+)",
  versionRegex: "new Number(RegExp.$1)",
  type: [{
    version: 9,
    type: "woff"
  }, {
    version: 5,
    type: "eot"
  }]
}, {
  regex: "Trident/(\\d+\\.\\d+); (.+)?rv:(\\d+\\.\\d+)",
  versionRegex: "new Number(RegExp.$3)",
  type: [{
    version: 11,
    type: "woff"
  }]
}, {
  regex: "Firefox[/s](\\d+\\.\\d+)",
  versionRegex: "new Number(RegExp.$1)",
  type: [{
    version: 3.6,
    type: "woff"
  }, {
    version: 3.5,
    type: "ttf"
  }]
}, {
  regex: "Edge/(\\d+\\.\\d+)",
  versionRegex: "new Number(RegExp.$1)",
  type: [{
    version: 12,
    type: "woff"
  }]
}, {
  regex: "Chrome/(\\d+\\.\\d+)",
  versionRegex: "new Number(RegExp.$1)",
  type: [{
    version: 36,
    type: "woff2"
  }, {
    version: 6,
    type: "woff"
  }, {
    version: 4,
    type: "ttf"
  }]
}, {
  regex: "Mozilla.*Android (\\d+\\.\\d+).*AppleWebKit.*Safari",
  versionRegex: "new Number(RegExp.$1)",
  type: [{
    version: 4.1,
    type: "woff"
  }, {
    version: 3.1,
    type: "svg#wf"
  }, {
    version: 2.2,
    type: "ttf"
  }]
}, {
  regex: "Mozilla.*(iPhone|iPad).* OS (\\d+)_(\\d+).* AppleWebKit.*Safari",
  versionRegex: "new Number(RegExp.$2) + (new Number(RegExp.$3) / 10)",
  unhinted: !0,
  type: [{
    version: 5,
    type: "woff"
  }, {
    version: 4.2,
    type: "ttf"
  }, {
    version: 1,
    type: "svg#wf"
  }]
}, {
  regex: "Mozilla.*(iPhone|iPad|BlackBerry).*AppleWebKit.*Safari",
  versionRegex: "1.0",
  type: [{
    version: 1,
    type: "svg#wf"
  }]
}, {
  regex: "Version/(\\d+\\.\\d+)(\\.\\d+)? Safari/(\\d+\\.\\d+)",
  versionRegex: "new Number(RegExp.$1)",
  type: [{
    version: 5.1,
    type: "woff"
  }, {
    version: 3.1,
    type: "ttf"
  }]
}, {
  regex: "Opera/(\\d+\\.\\d+)(.+)Version/(\\d+\\.\\d+)(\\.\\d+)?",
  versionRegex: "new Number(RegExp.$3)",
  type: [{
    version: 24,
    type: "woff2"
  }, {
    version: 11.1,
    type: "woff"
  }, {
    version: 10.1,
    type: "ttf"
  }]
}],
    browLen = browsers.length,
    suffix = "",
    i = 0;

a: for (; i < browLen; i++) {
  var regex = new RegExp(browsers[i].regex);

  if (regex.test(navigator.userAgent)) {
    browserVersion = eval(browsers[i].versionRegex);
    var typeLen = browsers[i].type.length;

    for (var j = 0; j < typeLen; j++) {
      if (browserVersion >= browsers[i].type[j].version && (1 == browsers[i].unhinted && (suffix = "_unhinted"), webfontType = browsers[i].type[j].type, "woff" != webfontType || woffEnabled) && ("woff2" != webfontType || woff2Enabled) && ("svg#wf" != webfontType || svgEnabled)) break a;
    }
  } else webfontType = "woff";
}

/(Macintosh|Android)/.test(navigator.userAgent) && "svg#wf" != webfontType && (suffix = "_unhinted");
var head = document.getElementsByTagName("head")[0],
    stylesheet = document.createElement("style");
stylesheet.setAttribute("type", "text/css");
head.appendChild(stylesheet);

for (var fonts = [{
  fontFamily: "Gilroy-SemiBoldItalic",
  url: wfpath + "3AA94E_0" + suffix + "_0." + webfontType
}, {
  fontFamily: "Gilroy-SemiBold",
  url: wfpath + "3AA94E_1" + suffix + "_0." + webfontType
}, {
  fontFamily: "Gilroy-BoldItalic",
  url: wfpath + "3AA94E_2" + suffix + "_0." + webfontType
}, {
  fontFamily: "Gilroy-Bold",
  url: wfpath + "3AA94E_3" + suffix + "_0." + webfontType
}], len = fonts.length, css = "", i = 0; i < len; i++) {
  var format = "svg#wf" == webfontType ? 'format("svg")' : "ttf" == webfontType ? 'format("truetype")' : "eot" == webfontType ? "" : 'format("' + webfontType + '")',
      css = css + ("@font-face{font-family: " + fonts[i].fontFamily + ";src:url(" + fonts[i].url + ")" + format + ";");
  fonts[i].fontWeight && (css += "font-weight: " + fonts[i].fontWeight + ";");
  fonts[i].fontStyle && (css += "font-style: " + fonts[i].fontStyle + ";");
  css += "}";
}

stylesheet.styleSheet ? stylesheet.styleSheet.cssText = css : stylesheet.innerHTML = css;;"use strict";

/**
 * Global variables and objects
 */
var html = document.getElementsByTagName('html')[0];
var body = document.body;
/**
 * Breakpoints
 *
 * @type     {Object}
 */

var breakpoints = {
  mobile: 600,
  tablet: 960,
  desktop: 1020
};
/**
 * Site sections
 *
 * @type     {Object}
 */

var site = {
  site: document.querySelector('.site'),
  header: document.querySelector('.site-header'),
  main: document.querySelector('.site-main'),
  footer: document.querySelector('.site-footer')
};
/**
 * Menu toggle
 *
 * @type     {Object}
 * @property {HTMLElement} toggle     - Menu button
 * @property {HTMLElement} navigation - Menu container
 */

var menu = {
  toggle: document.querySelectorAll('.js-menu-toggle'),
  navigation: document.getElementById('js-menu'),
  text: document.querySelector('.js-menu-toggle .button__text')
};
/**
 * Search toggle
 *
 * @type     {Object}
 * @property {HTMLElement} toggle     - Search button
 * @property {HTMLElement} navigation - Search container
 */

var search = {
  toggle: document.querySelectorAll('.js-search-toggle')[0],
  navigation: document.getElementById('js-search'),
  text: document.querySelector('.js-search-toggle .button__text')
};
/**
 * Pages-in toggle
 *
 * @type     {Object}
 * @property {HTMLElement} toggle     - Pages in button
 * @property {HTMLElement} navigation - Pages in list
 */

var pagesIn = {
  toggle: document.querySelectorAll('.js-pages-in-toggle'),
  navigation: document.getElementById('pages-in-list')
};
/**
 * All header toggles
 *
 * @property {HTMLElement} toggle     - Toggle buttons
 */

var headerToggles = site.header.querySelectorAll('.js-toggle');
/**
 * Viewport widths
 *
 * @type     {Object}
 */

var viewports = {
  width: verge.viewportW(),
  height: verge.viewportH()
};
/**
 * iOSDevice
 *
 * @type     {Boolean}
 */

var iOSDevice = !!navigator.platform.match(/iPhone|iPod|iPad/);
/**
 * Embedded Maps
 *
 */

var map = null;
var embeddedMaps = site.main.querySelectorAll('.map');
var skipEmbeddedMapsForwards = site.main.querySelectorAll('.js-map-skip-forwards');
var skipEmbeddedMapsBackwards = site.main.querySelectorAll('.js-map-skip-backwards');
/**
 * jQuery
 */

var $siteMain = $(site.main);
var $siteHeader = $(site.header);
var $forms = $siteMain.find('.form');
var $body = $(body);
var $html = $(html);
var $window = $(window);
var $menuNav = $(menu.navigation);;"use strict";

function debounce(func, wait, immediate) {
  'use strict';

  var timeout;
  return function () {
    var context = this,
        args = arguments;

    var later = function later() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

;;"use strict";

/**
 * More performant forEach function
 *
 * @param {Array}    array    - The array / node list
 * @param {Function} callback - The callback
 */
function forEach(array, callback, scope) {
  for (var i = 0; i < array.length; i++) {
    callback.call(scope, i, array[i]); // passes back stuff we need
  }
}

;
/**
 * Calculates the height of a given element.
 *
 * @param {HTMLElement} elem - The element
 *
 * @return {string} The height in px.
 */

function getHeight(elem) {
  if (!elem) return;
  var elemHeight = elem.scrollHeight + 'px';
  return elemHeight;
}

;
/**
 * Scroll Lock
 *
 * This function is applied to lock the window scrolling.
 * This should be applied when showing popups and full height models to allow the user to scroll the top layer.
 *
 * Call using scrollLock() to lock and scrollLock(false) to unlock;
 *
 */

function scrollLock() {
  var lockingScroll = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
  if (!$(site.site).length) return;

  if (lockingScroll == true) {
    $(site.site).css('top', -$(window).scrollTop());
    $html.attr('data-scroll-lock', 'true');
  } else {
    if (!$html.attr('data-scroll-lock').length) return;
    var resetScroll = parseInt($(site.site).css('top')) * -1;
    $html.removeAttr('data-scroll-lock');
    $(site.site).css('top', 'auto');
    $('html, body').animate({
      scrollTop: resetScroll
    }, 0);
  }
}

;
/**
 * Scrolls to element.
 *
 * Immediately invoked function expression
 *
 * Apply data attribute 'data-scroll-to' to an element button with an ID of
 * the selector you want to scroll to.
 *
 * Uses jQuery selectors as 'animate' isn't widely
 * supported with vanilla JS.
 */

(function () {
  $('[data-scroll-to]').on('click', function (event) {
    var $this = $(this),
        targetData = $this.attr('data-scroll-to'),
        $target = $(targetData);
    if ($target.offset() === undefined) return;
    $('html, body').animate({
      scrollTop: $target.offset().top
    }, 500);
  });
})();
/**
 * Resets the tabbing focus
 *
 * Immediately invoked function expression
 *
 * Apply data attribute to a hidden button with an ID of
 * the selector you want to focus to.
 */


(function () {
  $('[data-focus]').on('focus', function () {
    var id = $(this).attr('data-focus');
    $('#' + id).focus();
  });
})();
/*
 * Match height using data attribute
 */


(function () {
  $('[data-matchHeight]').each(function () {
    var $this = $(this);
    var matchHeightTarget = $this.attr('data-matchHeight');
    $this.find(matchHeightTarget).matchHeight();
  });
  $('[data-matchHeight-parent]').each(function () {
    var $this = $(this);
    var $matchHeightParent = $this.closest($this.attr('data-matchHeight-parent'));
    var $matchHeightTargetObj = $matchHeightParent.find($this.attr('data-matchHeight-with'));

    if (!$matchHeightTargetObj.length) {
      return;
    }

    $this.add($matchHeightTargetObj).matchHeight();
  });
})();
/*
 * Toggle body class
 */


function toggleBodyClass($class) {
  var $state = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'add';

  if ($state === 'add') {
    $body.addClass($class);
  } else {
    $body.removeClass($class);
  }
};"use strict";

if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
  Element.prototype.closest = function (s) {
    var el = this;

    do {
      if (el.matches(s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);

    return null;
  };
};"use strict";

/*
*   Custom version of a11y-toggle - https://github.com/edenspiekermann/a11y-toggle
*
*   Full docs here: http://edenspiekermann.github.io/a11y-toggle/
*
*   Example to watch for callback events, do the following:
*   <button class="button" data-a11y-toggle="target" data-a11y-callback="targetCallback"></button>
*
*   To avoid duplication of the 'DOMContentLoaded' listener, initA11yToggle() is now called from within main.js
*   If you do not want to reinitialise everything, you can pass a context to the a11yToggle function which will be used as a root for .querySelectorAll.
*   i.e. window.a11yToggle(myContainer);
*
*   Initialisation event listener:
*
*   $(window).on('a11y-toggle:targetCallback', function(event) {
*     console.log('a11y-toggle callback loaded');
*   });
*
*   Hide event listener:
*
*   $(window).on('a11y-toggle-hide:targetCallback', function(event) {
*     console.log('a11y-toggle callback hide');
*   });
*
*   Show event listener:
*
*   $(window).on('a11y-toggle-show:targetCallback', function(event) {
*     console.log('a11y-toggle callback show');
*   });
*
*/
var initA11yToggle = function initA11yToggle() {};

(function () {
  'use strict';

  var internalId = 0;
  var togglesMap = {};
  var targetsMap = {};

  function $(selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  }

  function getClosestToggle(element) {
    if (element.closest) {
      return element.closest('[data-a11y-toggle]');
    }

    while (element) {
      if (element.nodeType === 1 && element.hasAttribute('data-a11y-toggle')) {
        return element;
      }

      element = element.parentNode;
    }

    return null;
  }

  function handleToggle(toggle) {
    var target = toggle && targetsMap[toggle.getAttribute('aria-controls')];

    if (!target) {
      return false;
    }

    var toggles = togglesMap['#' + target.id];
    var isExpanded = target.getAttribute('aria-hidden') === 'false';
    target.setAttribute('aria-hidden', isExpanded);
    toggles.forEach(function (toggle) {
      toggle.setAttribute('aria-expanded', !isExpanded);
    });

    if (toggle.hasAttribute('data-a11y-callback')) {
      var toggleCallbackEvent = document.createEvent('Event');

      if (isExpanded) {
        toggleCallbackEvent.initEvent('a11y-toggle-hide:' + toggle.getAttribute('data-a11y-callback'), true, true);
      } else {
        toggleCallbackEvent.initEvent('a11y-toggle-show:' + toggle.getAttribute('data-a11y-callback'), true, true);
      }

      window.dispatchEvent(toggleCallbackEvent);
    }
  }

  initA11yToggle = function initA11yToggle(context) {
    togglesMap = $('[data-a11y-toggle]', context).reduce(function (acc, toggle) {
      var selector = '#' + toggle.getAttribute('data-a11y-toggle');
      acc[selector] = acc[selector] || [];
      acc[selector].push(toggle);
      return acc;
    }, togglesMap);
    var targets = Object.keys(togglesMap);
    targets.length && $(targets).forEach(function (target) {
      var toggles = togglesMap['#' + target.id];
      var isExpanded = target.hasAttribute('data-a11y-toggle-open');
      var labelledby = [];
      toggles.forEach(function (toggle) {
        toggle.id || toggle.setAttribute('id', 'a11y-toggle-' + internalId++);
        toggle.setAttribute('aria-controls', target.id);
        toggle.setAttribute('aria-expanded', isExpanded);
        labelledby.push(toggle.id);

        if (toggle.hasAttribute('data-a11y-callback')) {
          var toggleInit = document.createEvent('Event');
          toggleInit.initEvent('a11y-toggle:' + toggle.getAttribute('data-a11y-callback'), true, true);
          window.dispatchEvent(toggleInit);
        }
      });
      target.setAttribute('aria-hidden', !isExpanded);
      target.hasAttribute('aria-labelledby') || target.setAttribute('aria-labelledby', labelledby.join(' '));
      targetsMap[target.id] = target;
    });
  };

  document.addEventListener('click', function (event) {
    var toggle = getClosestToggle(event.target);
    handleToggle(toggle);
  });
  window && (window.a11yToggle = initA11yToggle);
})();;"use strict";

(function () {
  // a11y-toggle connected toggle functions
  // ======================================
  function collapse(toggle) {
    var id = toggle.getAttribute('data-a11y-toggle');
    var collapsibleBox = document.getElementById(id);
    collapsibleBox.setAttribute('aria-hidden', true);
    toggle.setAttribute('aria-expanded', false);
  }

  ;

  function getToggleFromTarget(element) {
    while (!element.hasAttribute('data-a11y-toggle')) {
      element = element.parentNode;
    }

    return element;
  }

  ;

  function collapseAll(event) {
    var target = event.target;
    var container = target.closest('.connected-toggles');
    var toggles = container.querySelectorAll('[data-a11y-toggle]');
    Array.prototype.slice.call(toggles).filter(function (toggle) {
      return toggle !== getToggleFromTarget(event.target);
    }).forEach(collapse);
  }

  var groupedToggles = Array.prototype.slice.call(document.querySelectorAll('.connected-toggles [data-a11y-toggle]'));
  groupedToggles.forEach(function (toggle) {
    toggle.addEventListener('click', collapseAll);
  });
  $('a[data-a11y-toggle]').on('click', function (event) {
    event.preventDefault();
  });
})();;"use strict";

/**
 * External Link Check
 *
 * Check for extenal links within .editor and add a class.
 *
 * To ignore external links, add the following
 * data attribute to your markup:
 * [data-external-link="false"]
 */
(function () {
  'use strict';

  var links = document.querySelectorAll('.editor a');
  [].forEach.call(links, function (elem) {
    if (location.hostname === elem.hostname || !elem.hostname.length) return;
    if (elem.getAttribute('data-external-link') === 'false' || elem.classList.contains('button')) return;
    elem.classList.add('link-external');
  });
})();;"use strict";

// Custom file upload form fields
// ========================================================
// See demo at http://tympanus.net/codrops/2015/09/15/styling-customizing-file-inputs-smart-way/
// ========================================================
(function () {
  if (!$forms.length) return;
  $forms.find('.form__field--upload, .form__field--image-upload').each(function () {
    var $input = $(this),
        $label = $input.closest('.form__control').find('.form__label'),
        labelVal = $label.text(),
        clonedLabelClass = 'form__label--upload'; // Only apply the following javascript if we're NOT using dropzone

    if (!$input.parent('.form__component--file').length && !$input.parent('.form__component--image-upload').length) return;

    if ($(this).hasClass('form__field--image-upload')) {
      clonedLabelClass = 'form__label--image-upload';
    }

    $input.after($label.clone().addClass(clonedLabelClass));
    $label.replaceWith(function () {
      return '<span class="form__label">' + this.innerHTML + '</span>';
    });
    $label = $input.next(clonedLabelClass);
    $input.on('change', function (event) {
      var fileName = '';

      if (event.target.value) {
        fileName = event.target.value.split('\\').pop();
      }

      if (fileName !== '') {
        $label.text(fileName);
      } else {
        $label.text(labelVal);
      }
    });
    $input.on('focus', function () {
      $input.addClass('has-focus');
    }).on('focusout', function () {
      $input.removeClass('has-focus');
    });
  });
})();;"use strict";

/**
 * Toggles elements between desktop and mobile
 *
 * Useful if elements need to be shown
 * on desktop and hidden on mobile
 *
 * Add on DOMContentLoaded and Resize
 *
 * @param {HTMLElement} elem   - The element
 * @param {HTMLElement} toggle - The toggle
 * @param {HTMLElement} breakpoint - integer viewport size value (set in globals.js - default 600px)
 * @param {HTMLElement} resize - boolean value to differentiate between first page load and on browser resize event (triggered from main.js).
 *
 * @return {function} A debounce function
 */
function toggleMobileSwap(elem, toggle, breakpoint) {
  var resize = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  if (!elem) return;
  if (!toggle) return;
  breakpoint = typeof breakpoint === 'undefined' ? breakpoints.mobile : breakpoint;
  jQuery.extend(verge);

  if (verge.viewportW() >= breakpoint) {
    elem.setAttribute('aria-hidden', 'false');
    elem.setAttribute('data-toggle-mobile-swap', 'above-' + breakpoint);
    [].forEach.call(toggle, function (button) {
      button.setAttribute('aria-expanded', 'true');
    });
  } else {
    if (resize === false) {
      elem.setAttribute('data-toggle-mobile-swap', 'below-' + breakpoint);
    }

    if (elem.getAttribute('data-toggle-mobile-swap') === 'above-' + breakpoint) {
      elem.setAttribute('aria-hidden', 'true');
      [].forEach.call(toggle, function (button) {
        button.setAttribute('aria-expanded', 'false');
      });
      elem.setAttribute('data-toggle-mobile-swap', 'below-' + breakpoint);
    }
  }

  return debounce(function () {
    toggleMobileSwap(elem, toggle, breakpoint);
  }, 100);
}

;;"use strict";

var navigation = function () {
  /**
   * Toggle Menu.
   *
   * @param {Object} toggleType - menu / search / pagesIn
   *
   * Refer to globals.js for properties within these objects
   */
  var menuToggle = function menuToggle(toggleType) {
    /**
     * Looping through toggles in case there are multiple
     * buttons toggling the same content
     */
    [].forEach.call(toggleType.toggle, function (elem) {
      elem.addEventListener('click', function () {
        if (toggleType.navigation.getAttribute('aria-hidden') === 'true') {
          openMenu(toggleType);
        } else {
          closeMenu(toggleType);
        }
      });
    });
  };
  /**
   * Opens the menu.
   * If Menu is closed, add class
   *
   * @param {Object} toggleType  - passed from 'menuToggle()'
   */


  var openMenu = function openMenu(toggleType) {
    scrollLock(); // Lock scroll

    $menuNav.css('height', $window.height() - $siteHeader.height());
    $body.css('height', $window.height());
    setTimeout(function () {
      toggleType.navigation.classList.add('is-open');
      toggleBodyClass('menu-is-open');
    }, 5);
  };
  /**
   * Closes the menu.
   * If Menu is open, remove class
   *
   * @param {Object} toggleType  - passed from 'menuToggle()'
   */


  var closeMenu = function closeMenu(toggleType) {
    scrollLock(false); // Unlock scroll lock

    toggleBodyClass('menu-is-open', 'remove');
    setTimeout(function () {
      toggleType.navigation.classList.remove('is-open');
      $menuNav.css('height', '');
      $body.css('height', '');
    }, 200);
  };
  /**
   * Close all menus.
   *
   * @param {HTMLElement} elem - The toggle button
   *
   * Argument is passed from forEach in 'menuToggle()'
   */


  var closeAllMenus = function closeAllMenus(elem) {
    if (elem.getAttribute('aria-expanded') === 'false') {
      [].forEach.call(headerToggles, function (toggle) {
        var containerClass = toggle.getAttribute('data-a11y-toggle'),
            container = document.getElementById(containerClass);
        toggle.setAttribute('aria-expanded', 'false');
        container.setAttribute('aria-hidden', 'true');
        container.classList.remove('is-open');
      });
    }
  };
  /**
   * Toggle the search form in header
   */


  var searchToggle = function searchToggle() {
    search.navigation.classList.toggle('is-active');
    var searchExpanded = search.navigation.classList.contains('is-active');

    if (searchExpanded) {
      setTimeout(function () {
        var searchHeight = search.navigation.offsetHeight;
        body.classList.add('search-is-open');
        body.style.transform = 'translateY(' + searchHeight + 'px)';
        search.navigation.classList.add('is-open');
      }, 50);
    } else {
      body.style.transform = 'translateY(0)';
      setTimeout(function () {
        body.classList.remove('search-is-open');
        search.navigation.classList.remove('is-open');
      }, 200);
    }
  };
  /**
   * Exposes the methods
   */


  return {
    toggle: menuToggle,
    searchToggle: searchToggle
  };
}();;"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

//  Siteimprove fixes for embedded maps
// ========================================================
function initMaps() {
  // ORBIT-130 - We will no longer try to fix Siteimprove errors on Google Maps
  // https://issuetracker.google.com/issues/69541792
  // Advice for clients to conform with WCAG 2.1 AA standard is to provide text alternatives for the information in the map.
  return;
}

function skipMaps() {
  if ((typeof skipEmbeddedMapsForwards === "undefined" ? "undefined" : _typeof(skipEmbeddedMapsForwards)) !== 'object' || (typeof skipEmbeddedMapsBackwards === "undefined" ? "undefined" : _typeof(skipEmbeddedMapsBackwards)) !== 'object') {
    return;
  }

  var $skipMapButtonForwards = $(skipEmbeddedMapsForwards);
  var $skipMapButtonBackwards = $(skipEmbeddedMapsBackwards);
  var $skipMapButtons = $skipMapButtonForwards.add($skipMapButtonBackwards);
  $skipMapButtons.focus(function () {
    $(this).removeClass('visually-hidden');
  });
  $skipMapButtons.blur(function () {
    $(this).addClass('visually-hidden');
  });
  $skipMapButtons.on('click', function (event) {
    event.preventDefault();
    var $thisButton = $(this),
        $parentWrapper = $thisButton.closest('.form__component--google_map, .definition__content--google-map');
    $this.on('click', function () {
      $allButtons[index + 1].focus();
    });

    if ($thisButton.hasClass('js-map-skip-forwards')) {
      var $targetButton = $parentWrapper.find('.js-map-skip-backwards');
    } else {
      var $targetButton = $parentWrapper.find('.js-map-skip-forwards');
    }

    if (!$targetButton.length) return;
    $targetButton.focus();
  });
};"use strict";

/**
 * Lightbox effect for images
 *
 * @param {...string} - Containers for zoomable images
 *
 * https://www.npmjs.com/package/@nishanths/zoom.js
 * Supports IE10 and above.
 *
 * Forked from https://github.com/fat/zoom.js
 * Use the original instead if you need IE9 support (not on NPM) - Keep this init file the same
 *
 * Usage:
 * zoomImage('.widget--image', '.widget--top-tasks');
 */
var zoomImage = function zoomImage() {
  var args = [].slice.call(arguments),
      argsLength = args.length,
      selectors = "";

  for (var i = 0; i < argsLength; i++) {
    selectors += ", " + args[i];
  }

  var imgContainers = document.querySelectorAll('.editor' + selectors);

  var addZoom = function addZoom(image) {
    [].forEach.call(image, function (el) {
      if (el.parentNode.nodeName.toLowerCase() === 'a') {
        return;
      }

      el.setAttribute('data-action', 'zoom');
    });
  };

  [].forEach.call(imgContainers, function (container) {
    var zoomableImgs = container.querySelectorAll('img');
    addZoom(zoomableImgs);
  });
};;'use strict';
/*
 * CAROUSEL
 * ==========
 *
 * Uses Flickity v.^2 – https://flickity.metafizzy.co/options.html
 * Includes customisations to mimic the functionality of https://www.w3.org/WAI/tutorials/carousels/working-example/
 *
 * Example:
 *
 * carouselInit('.js-carousel', '.slide');
 *
 * Options (can be altered in the markup):
 *
 * <div class="carousel js-carousel" data-carousel-title="My Carousel"> // A descriptive name of the carousel for screenreaders. Will default to the first H1, H2 or .widget__heading - with "Slideshow X" as a fallback
 *
 * <div class="carousel js-carousel" data-carousel-autoplay="true">
 * OR
 * <div class="carousel js-carousel" data-carousel-autoplay="1500"> (in milliseconds)
 *
 * <div class="carousel js-carousel" data-carousel-dots="false"> // To remove the dots
 * OR
 * <div class="carousel js-carousel" data-carousel-dots="$x $y $stack"> // Optional CSS overrides - positions the dots 'center bottom horizontal' (default), 'right top vertical', 'left bottom horizontal'
 *
 * <div class="carousel js-carousel" data-carousel-arrows="false"> // To remove the previous and next buttons
 * OR
 * <div class="carousel js-carousel" data-carousel-arrows="$x $y"> // Optional CSS overrides - positions the arrows 'opposite center' (default), 'right top', 'left bottom'
 *
 * <div class="carousel js-carousel" data-carousel-draggable="false"> // disable flickity's draggable option: https://flickity.metafizzy.co/options.html#draggable
 *
 * <div class="carousel js-carousel" data-adaptive-height="true"> // Set flickity's adaptiveHeight option https://flickity.metafizzy.co/options.html#adaptiveheight
 *
*/

function pauseCurrentCarousel(element) {
  $(element).closest('.flickity-enabled').flickity('stopPlayer');
} // Add text to buttons


function flickityPaginationText($el, carouselName) {
  $el.find('.flickity-prev-next-button.next').attr('aria-label', 'Next slide: ' + carouselName).append('<span class="flickity-button__text">Next</span><span class="visually-hidden"> slide: ' + carouselName + '</span>');
  $el.find('.flickity-prev-next-button.previous').attr('aria-label', 'Previous slide: ' + carouselName).append('<span class="flickity-button__text">Prev</span><span class="visually-hidden"> slide: ' + carouselName + '</span>');
  $el.find('.flickity-button-icon').attr('focusable', 'false');
}

function wrapFlickityPageDots($currentCarousel, showDots, carouselName) {
  if (!showDots || !$currentCarousel.length) return;
  var $pageDots = $currentCarousel.find('.flickity-page-dots'),
      $dots = $pageDots.find('.dot');
  $pageDots.wrap('<div class="flickity-page-dots-wrapper"></div>');
  $dots.removeAttr('aria-label').each(function (index) {
    var $dot = $(this),
        $newButton = $('<button class="flickity-page-dots__button"><span class="visually-hidden">View slide ' + (index + 1) + ': ' + carouselName + '</span></button>');
    $dot.append($newButton);
    $newButton.on('click', function (event) {
      event.preventDefault();
      $(this).closest('.dot').trigger('click');
    });
  });
}

function wrapFlickityPrevNextButtons($currentCarousel, showArrows) {
  if (!showArrows || !$currentCarousel.length) return;
  var $prevButton = $currentCarousel.find('.flickity-prev-next-button.previous'),
      $nextButton = $currentCarousel.find('.flickity-prev-next-button.next'),
      $viewport = $currentCarousel.find('.flickity-viewport');
  $prevButton.add($nextButton).wrapAll('<div class="flickity-buttons-wrapper"></div>');
  $prevButton.insertAfter($nextButton); // Flip the tabbing order so that the next button comes first()

  $currentCarousel.find('.flickity-buttons-wrapper').insertBefore($viewport); // Move the buttons before the content in the tabbing order
}

function carouselTabbingControl($currentCarousel, index, carouselSlideClass) {
  if (!$currentCarousel.length) return;
  var carouselSlideClass = typeof carouselSlideClass !== 'undefined' ? carouselSlideClass : '.slide',
      $slides = $currentCarousel.find(carouselSlideClass),
      $slideLinks = $slides.find('a, button, input:not([type="hidden"]), textarea, select'),
      $pageDotWrapper = $currentCarousel.find('.flickity-page-dots-wrapper');
  $slideLinks.attr('tabindex', '-1');
  $slides.eq(index).find('a, button, input:not([type="hidden"]), textarea, select').removeAttr('tabindex');
  $pageDotWrapper.find('.flickity-page-dots__button').removeAttr('disabled tabindex');
  $pageDotWrapper.find('.dot.is-selected .flickity-page-dots__button').attr({
    'disabled': '',
    'tabindex': -1
  });
}
/*
 * If update is false (default), create a new aria-live region for the carousel, or re-use one that is in the markup with the classname .js-aria-live
 * If update is set to true then amend the aria-live message to read "Now viewing slide X of X"
 *
*/


function carouselAriaLive() {
  var update = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  var $ariaLive = arguments.length > 1 ? arguments[1] : undefined;
  var carouselName = arguments.length > 2 ? arguments[2] : undefined;
  var carouselId = arguments.length > 3 ? arguments[3] : undefined;
  var $currentCarousel = arguments.length > 4 ? arguments[4] : undefined;
  var slideCount = arguments.length > 5 ? arguments[5] : undefined;
  var flktyStandard = arguments.length > 6 ? arguments[6] : undefined;
  if (!$currentCarousel.length || slideCount < 2 || typeof carouselName === 'undefined') return;

  if (!update) {
    // If aria live element is detected in the markup, use that. Otherwise create one.
    if (!$ariaLive.length) {
      $ariaLive = $('<div class="carousel__aria-live js-aria-live" id="slideshow-' + carouselId + '" aria-live="polite" aria-atomic="true" role="status">Now viewing slide <span class="js-aria-live__text">1 of ' + slideCount + '</span>: ' + carouselName + '</div>');
      $currentCarousel.attr('aria-labelledby', 'slideshow-' + carouselId).prepend($ariaLive);
      $currentCarousel.attr('role', 'article');
    }

    return $ariaLive;
  }

  if (typeof flktyStandard == 'undefined') return $ariaLive;
  $ariaLive.find('.js-aria-live__text').html(flktyStandard.selectedIndex + 1 + ' of ' + flktyStandard.slides.length);
  return $ariaLive;
}

function carouselInit(carouselClass, carouselSlideClass) {
  var $carousels = $(carouselClass),
      carouselSlideClass = typeof carouselSlideClass !== 'undefined' ? carouselSlideClass : '.slide';
  if (!$carousels.length) return;
  $carousels.each(function (index) {
    var $currentCarousel = $(this),
        carouselId = index + 1,
        slideCount = $currentCarousel.find(carouselSlideClass).length,
        autoPlaySpeed = typeof $currentCarousel.attr('data-carousel-autoplay') !== 'undefined' ? $currentCarousel.attr('data-carousel-autoplay') : false,
        showDots = $currentCarousel.attr('data-carousel-dots') === 'false' ? false : true,
        showArrows = $currentCarousel.attr('data-carousel-arrows') === 'false' ? false : true,
        draggable = $currentCarousel.attr('data-carousel-draggable') === 'false' ? false : true,
        adaptiveHeight = $currentCarousel.attr('data-adaptive-height') === 'true' ? true : false,
        $ariaLive = $currentCarousel.find('.js-aria-live');

    if (typeof $currentCarousel.attr('data-carousel-title') === 'undefined') {
      var fallbackTitle = $currentCarousel.add($currentCarousel.closest('.widget')).find('h1, h2, .widget__heading').first().text().trim();
      var carouselName = typeof fallbackTitle === 'undefined' ? 'Slideshow ' + carouselId : fallbackTitle;
    } else {
      var carouselName = $currentCarousel.attr('data-carousel-title');
    }

    if (slideCount < 2) return;
    $ariaLive = carouselAriaLive(false, $ariaLive, carouselName, carouselId, $currentCarousel, slideCount);
    $currentCarousel.on('ready.flickity', function () {
      wrapFlickityPageDots($currentCarousel, showDots, carouselName);
      wrapFlickityPrevNextButtons($currentCarousel, showArrows);
      carouselTabbingControl($currentCarousel, 0, carouselSlideClass);
      $currentCarousel.addClass('ready');
    });
    $currentCarousel.on('select.flickity', function (event, index) {
      carouselTabbingControl($currentCarousel, index, carouselSlideClass);
      $ariaLive = carouselAriaLive(true, $ariaLive, carouselName, carouselId, $currentCarousel, slideCount, flktyStandard); // the below code adds aria hidden to the images on hidden slides, as these were causing issues with the screenreader when switching slides and back tabbing

      $currentCarousel.find('.slide').each(function () {
        var $this = $(this);

        if ($this.attr('aria-hidden') == 'true') {
          $this.find('img, .hero__content').attr('aria-hidden', 'true');
        } else {
          $this.find('img, .hero__content').attr('aria-hidden', 'false');
        }
      });
    });
    $currentCarousel.flickity({
      accessibility: false,
      autoPlay: autoPlaySpeed,
      cellSelector: carouselSlideClass,
      draggable: draggable,
      imagesLoaded: true,
      adaptiveHeight: adaptiveHeight,
      pageDots: showDots,
      prevNextButtons: showArrows,
      wrapAround: true,
      selectedAttraction: .02
    });
    var flktyStandard = $currentCarousel.data('flickity'),
        $flickitySlider = $currentCarousel.find('.flickity-slider'),
        $slideLinks = $currentCarousel.find('a, iframe');
    flickityPaginationText($currentCarousel, carouselName);
  });
}

;;"use strict";

/**
 * Responsive tables
 *
 * Apply responsive class if the table is larger than the container
 * Copy table headings into each data cell, wrap table in a container
 */
var responsiveTables = function () {
  /**
   * Responsive check
   *
   * Apply responsive class if the table is larger than the container
   */
  var responsiveCheck = debounce(function () {
    $siteMain.find('table:not(.calendar__table):not(.form__matrix)').each(function () {
      var $this = $(this);
      var $tableWrapper = $this.closest('.table-wrapper');
      $tableWrapper.removeClass('responsive');

      if ($this.outerWidth() > $tableWrapper.outerWidth()) {
        $tableWrapper.addClass('responsive');
      }
    });
  }, 250);
  /**
   * Amend table markup
   *
   * Copy table headings into each data cell, wrap table in a container
   */

  var tableMarkUp = function tableMarkUp() {
    $siteMain.find('table:not(.calendar__table):not(.form__matrix)').each(function () {
      var $table = $(this);
      $table.find('thead th, thead td').each(function (index) {
        var $th = $(this).html().trim();
        var $count = index + 1;
        if (!$th.length || $th == '&nbsp;') return;
        $table.find('tbody td:nth-child(' + $count + ')').prepend('<span class="mobile-th">' + $th + '<span class="mobile-th__seperator">:</span> </span>');
      });
      $table.wrap('<div class="table-wrapper"></div>');
    });
  };
  /**
   * Exposes the methods
   */


  return {
    check: responsiveCheck,
    amendMarkUp: tableMarkUp
  };
}();;"use strict";

//  Isotope layout using data attribute
//  https://isotope.metafizzy.co/
// ==================================
(function () {
  'use strict';

  $('[data-enable-masonry]').each(function () {
    var $this = $(this),
        $isotopeTarget = $this.attr('data-enable-masonry');
    $this.isotope({
      itemSelector: $isotopeTarget,
      layoutMode: 'masonry'
    });

    if (imagesLoaded) {
      $this.imagesLoaded().progress(function () {
        $this.isotope('layout');
      });
    }
  });
})();;'use strict';

(function ($) {
  zoomImage();
  var $rellax;
  var $rellaxPresent; // On document ready...

  document.addEventListener("DOMContentLoaded", function () {
    initA11yToggle();
    navigation.toggle(menu);
    navigation.toggle(pagesIn);

    if (search.toggle !== undefined) {
      search.toggle.addEventListener('click', function () {
        navigation.searchToggle();
      });
    }

    toggleMobileSwap(pagesIn.navigation, pagesIn.toggle, breakpoints.tablet);
    responsiveTables.amendMarkUp();
    responsiveTables.check(); // temporary scroller for matrix table

    $('.form__matrix').each(function () {
      var table = $(this);
      $(this).wrap('<div class="table-wrapper-matrix"></div>').wrap('<div class="scroller"></div>');

      if (table.outerWidth() > table.parent().parent().outerWidth()) {
        table.parent().parent().addClass('has-scroll');
      }

      $(window).on('resize orientationchange', function () {
        if (table.outerWidth() > table.parent().parent().outerWidth()) {
          table.parent().parent().addClass('has-scroll');
        } else {
          table.parent().parent().removeClass('has-scroll');
        }
      });
    }); //  Re-focus to the last link in the menu on back-tab
    //  Close menu when esc key is pressed
    // ========================================================

    var $navigation = $(menu.navigation);
    var $menuClose = $(menu.toggle);
    var $navigationLinks = $navigation.find('a');
    var $navigationLastLink = $navigationLinks.last();
    var $searchClose = $(search.toggle);
    var $searchNav = $(search.navigation);
    var $searchBtn = $searchNav.find('.form__append-group .button');
    var $searchInput = $searchNav.find('.form__append-group .form__field');
    $body.on('keydown', function (event) {
      if ($menuClose.attr('aria-expanded') == 'true') {
        if (event.keyCode === 9 && $menuClose.is(':focus')) {
          if (event.shiftKey) {
            event.preventDefault();
            $navigationLastLink.focus();
          }
        }

        if (event.keyCode === 27) {
          $menuClose.attr('aria-expanded', 'false');
          $navigation.attr('aria-hidden', 'true');
          $menuClose.focus();
          setTimeout(function () {
            $navigation.removeClass('is-open');
          }, 200);
        }
      }

      if ($searchClose.attr('aria-expanded') == 'true') {
        if (event.keyCode === 9 && $searchClose.is(':focus')) {
          if (event.shiftKey) {
            event.preventDefault();
            $searchBtn.focus();
          }
        }

        if (event.keyCode === 9 && $searchInput.is(':focus')) {
          if (event.shiftKey) {
            event.preventDefault();
            $searchClose.focus();
          }
        }

        if (event.keyCode === 27) {
          $searchNav.removeClass('is-active');
          $searchNav.attr('aria-hidden', 'true');
          $searchClose.attr('aria-expanded', 'false');
          $body.css('transform', '');
          $searchClose.focus();
          setTimeout(function () {
            $searchNav.removeClass('is-open');
            $body.removeClass('search-is-open');
          }, 200);
        }
      }
    }); // swap object-fit for background image if not supported

    if (!Modernizr.objectfit) {
      $('.listing__image-container, .hero__image-container, .banner__image-container').each(function () {
        var $container = $(this),
            imgUrl = $container.find('img').prop('src');

        if (imgUrl) {
          $container.css('backgroundImage', 'url(' + imgUrl + ')').addClass('compat-object-fit');
        }
      });
    }
  }); // On window load...

  window.addEventListener('load', function () {
    carouselInit('.js-carousel');
    skipMaps();

    if ($('.rellax').length) {
      $rellaxPresent = true;
      $rellax = new Rellax('.rellax', {
        breakpoints: [breakpoints.mobile, breakpoints.tablet, breakpoints.desktop]
      });
    }
  }); // On window resize...

  window.addEventListener('resize', function () {
    toggleMobileSwap(pagesIn.navigation, pagesIn.toggle, breakpoints.tablet, true);
    responsiveTables.check();
  });

  function alterMenu() {
    if ($body.hasClass('menu-is-open') && verge.viewportW() >= breakpoints.tablet) {
      $(menu.toggle).attr('aria-expanded', 'false');
      $(menu.navigation).attr('aria-hidden', 'true');
      scrollLock(false);
      toggleBodyClass('menu-is-open', 'remove');
      setTimeout(function () {
        $(menu.navigation).removeClass('is-open');
      }, 200);
    }

    if ($body.hasClass('menu-is-open') && verge.viewportW() <= breakpoints.tablet) {
      $menuNav.css('height', $window.height() - $siteHeader.height());
      $body.css('height', $window.height());
    }
  }

  $window.on('resize orientationchange', debounce(alterMenu, 50));

  function refreshRellax() {
    if ($rellaxPresent == true) {
      $rellax.refresh();
    }
  }

  $window.on('resize orientationchange', debounce(refreshRellax, 250));
  /**
   * On orientation change
   */

  window.addEventListener('orientationchange', function () {
    responsiveTables.check();
  });
})(jQuery);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpxdWVyeS5tYXRjaEhlaWdodC5qcyIsIm1hdGNoTWVkaWEuanMiLCJmbGlja2l0eS5wa2dkLmpzIiwicGxhY2Vob2xkci5qcyIsInZlcmdlLmpzIiwiem9vbS5qcyIsInBpY3R1cmVmaWxsLm1pbi5qcyIsImlzb3RvcGUucGtnZC5qcyIsInJlbGxheC5qcyIsIndlYmZvbnRzLmpzIiwiZ2xvYmFscy5qcyIsImRlYm91bmNlLmpzIiwiaGVscGVycy5qcyIsImNsb3Nlc3QtcG9seWZpbGwuanMiLCJhMTF5LXRvZ2dsZS13aXRoLWNhbGxiYWNrLmpzIiwiYTExeS10b2dnbGUtY29ubmVjdGVkLmpzIiwiZXh0ZXJuYWwtbGluay1jaGVja2VyLmpzIiwiZmlsZS11cGxvYWQuanMiLCJ0b2dnbGUtbW9iaWxlLXN3YXAuanMiLCJuYXZpZ2F0aW9uLmpzIiwiZW1iZWRkZWQtbWFwcy5qcyIsInpvb20taW5pdC5qcyIsImNhcm91c2VsLWluaXQuanMiLCJyZXNwb25zaXZlLXRhYmxlcy5qcyIsImlzb3RvcGUtaW5pdC5qcyIsIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElDblhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1DdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQzkwSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDBEQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQzdZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJDMWZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUNqN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUNqZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDBGQ3hNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtQ0MvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxFQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRUN0SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEVDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1DNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0NsSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEVDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRUN0TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1DdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im9yYml0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbi8qKlxuKiBqcXVlcnktbWF0Y2gtaGVpZ2h0IDAuNy4yIGJ5IEBsaWFicnVcbiogaHR0cDovL2JybS5pby9qcXVlcnktbWF0Y2gtaGVpZ2h0L1xuKiBMaWNlbnNlOiBNSVRcbiovXG47XG5cbihmdW5jdGlvbiAoZmFjdG9yeSkge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWV4dHJhLXNlbWlcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTURcbiAgICBkZWZpbmUoWydqcXVlcnknXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCdqcXVlcnknKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gR2xvYmFsXG4gICAgZmFjdG9yeShqUXVlcnkpO1xuICB9XG59KShmdW5jdGlvbiAoJCkge1xuICAvKlxuICAqICBpbnRlcm5hbFxuICAqL1xuICB2YXIgX3ByZXZpb3VzUmVzaXplV2lkdGggPSAtMSxcbiAgICAgIF91cGRhdGVUaW1lb3V0ID0gLTE7XG4gIC8qXG4gICogIF9wYXJzZVxuICAqICB2YWx1ZSBwYXJzZSB1dGlsaXR5IGZ1bmN0aW9uXG4gICovXG5cblxuICB2YXIgX3BhcnNlID0gZnVuY3Rpb24gX3BhcnNlKHZhbHVlKSB7XG4gICAgLy8gcGFyc2UgdmFsdWUgYW5kIGNvbnZlcnQgTmFOIHRvIDBcbiAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWx1ZSkgfHwgMDtcbiAgfTtcbiAgLypcbiAgKiAgX3Jvd3NcbiAgKiAgdXRpbGl0eSBmdW5jdGlvbiByZXR1cm5zIGFycmF5IG9mIGpRdWVyeSBzZWxlY3Rpb25zIHJlcHJlc2VudGluZyBlYWNoIHJvd1xuICAqICAoYXMgZGlzcGxheWVkIGFmdGVyIGZsb2F0IHdyYXBwaW5nIGFwcGxpZWQgYnkgYnJvd3NlcilcbiAgKi9cblxuXG4gIHZhciBfcm93cyA9IGZ1bmN0aW9uIF9yb3dzKGVsZW1lbnRzKSB7XG4gICAgdmFyIHRvbGVyYW5jZSA9IDEsXG4gICAgICAgICRlbGVtZW50cyA9ICQoZWxlbWVudHMpLFxuICAgICAgICBsYXN0VG9wID0gbnVsbCxcbiAgICAgICAgcm93cyA9IFtdOyAvLyBncm91cCBlbGVtZW50cyBieSB0aGVpciB0b3AgcG9zaXRpb25cblxuICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciAkdGhhdCA9ICQodGhpcyksXG4gICAgICAgICAgdG9wID0gJHRoYXQub2Zmc2V0KCkudG9wIC0gX3BhcnNlKCR0aGF0LmNzcygnbWFyZ2luLXRvcCcpKSxcbiAgICAgICAgICBsYXN0Um93ID0gcm93cy5sZW5ndGggPiAwID8gcm93c1tyb3dzLmxlbmd0aCAtIDFdIDogbnVsbDtcblxuICAgICAgaWYgKGxhc3RSb3cgPT09IG51bGwpIHtcbiAgICAgICAgLy8gZmlyc3QgaXRlbSBvbiB0aGUgcm93LCBzbyBqdXN0IHB1c2ggaXRcbiAgICAgICAgcm93cy5wdXNoKCR0aGF0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGlmIHRoZSByb3cgdG9wIGlzIHRoZSBzYW1lLCBhZGQgdG8gdGhlIHJvdyBncm91cFxuICAgICAgICBpZiAoTWF0aC5mbG9vcihNYXRoLmFicyhsYXN0VG9wIC0gdG9wKSkgPD0gdG9sZXJhbmNlKSB7XG4gICAgICAgICAgcm93c1tyb3dzLmxlbmd0aCAtIDFdID0gbGFzdFJvdy5hZGQoJHRoYXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIG90aGVyd2lzZSBzdGFydCBhIG5ldyByb3cgZ3JvdXBcbiAgICAgICAgICByb3dzLnB1c2goJHRoYXQpO1xuICAgICAgICB9XG4gICAgICB9IC8vIGtlZXAgdHJhY2sgb2YgdGhlIGxhc3Qgcm93IHRvcFxuXG5cbiAgICAgIGxhc3RUb3AgPSB0b3A7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJvd3M7XG4gIH07XG4gIC8qXG4gICogIF9wYXJzZU9wdGlvbnNcbiAgKiAgaGFuZGxlIHBsdWdpbiBvcHRpb25zXG4gICovXG5cblxuICB2YXIgX3BhcnNlT3B0aW9ucyA9IGZ1bmN0aW9uIF9wYXJzZU9wdGlvbnMob3B0aW9ucykge1xuICAgIHZhciBvcHRzID0ge1xuICAgICAgYnlSb3c6IHRydWUsXG4gICAgICBwcm9wZXJ0eTogJ2hlaWdodCcsXG4gICAgICB0YXJnZXQ6IG51bGwsXG4gICAgICByZW1vdmU6IGZhbHNlXG4gICAgfTtcblxuICAgIGlmIChfdHlwZW9mKG9wdGlvbnMpID09PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuICQuZXh0ZW5kKG9wdHMsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICBvcHRzLmJ5Um93ID0gb3B0aW9ucztcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMgPT09ICdyZW1vdmUnKSB7XG4gICAgICBvcHRzLnJlbW92ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdHM7XG4gIH07XG4gIC8qXG4gICogIG1hdGNoSGVpZ2h0XG4gICogIHBsdWdpbiBkZWZpbml0aW9uXG4gICovXG5cblxuICB2YXIgbWF0Y2hIZWlnaHQgPSAkLmZuLm1hdGNoSGVpZ2h0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgb3B0cyA9IF9wYXJzZU9wdGlvbnMob3B0aW9ucyk7IC8vIGhhbmRsZSByZW1vdmVcblxuXG4gICAgaWYgKG9wdHMucmVtb3ZlKSB7XG4gICAgICB2YXIgdGhhdCA9IHRoaXM7IC8vIHJlbW92ZSBmaXhlZCBoZWlnaHQgZnJvbSBhbGwgc2VsZWN0ZWQgZWxlbWVudHNcblxuICAgICAgdGhpcy5jc3Mob3B0cy5wcm9wZXJ0eSwgJycpOyAvLyByZW1vdmUgc2VsZWN0ZWQgZWxlbWVudHMgZnJvbSBhbGwgZ3JvdXBzXG5cbiAgICAgICQuZWFjaChtYXRjaEhlaWdodC5fZ3JvdXBzLCBmdW5jdGlvbiAoa2V5LCBncm91cCkge1xuICAgICAgICBncm91cC5lbGVtZW50cyA9IGdyb3VwLmVsZW1lbnRzLm5vdCh0aGF0KTtcbiAgICAgIH0pOyAvLyBUT0RPOiBjbGVhbnVwIGVtcHR5IGdyb3Vwc1xuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAodGhpcy5sZW5ndGggPD0gMSAmJiAhb3B0cy50YXJnZXQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gLy8ga2VlcCB0cmFjayBvZiB0aGlzIGdyb3VwIHNvIHdlIGNhbiByZS1hcHBseSBsYXRlciBvbiBsb2FkIGFuZCByZXNpemUgZXZlbnRzXG5cblxuICAgIG1hdGNoSGVpZ2h0Ll9ncm91cHMucHVzaCh7XG4gICAgICBlbGVtZW50czogdGhpcyxcbiAgICAgIG9wdGlvbnM6IG9wdHNcbiAgICB9KTsgLy8gbWF0Y2ggZWFjaCBlbGVtZW50J3MgaGVpZ2h0IHRvIHRoZSB0YWxsZXN0IGVsZW1lbnQgaW4gdGhlIHNlbGVjdGlvblxuXG5cbiAgICBtYXRjaEhlaWdodC5fYXBwbHkodGhpcywgb3B0cyk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbiAgLypcbiAgKiAgcGx1Z2luIGdsb2JhbCBvcHRpb25zXG4gICovXG5cblxuICBtYXRjaEhlaWdodC52ZXJzaW9uID0gJzAuNy4yJztcbiAgbWF0Y2hIZWlnaHQuX2dyb3VwcyA9IFtdO1xuICBtYXRjaEhlaWdodC5fdGhyb3R0bGUgPSA4MDtcbiAgbWF0Y2hIZWlnaHQuX21haW50YWluU2Nyb2xsID0gZmFsc2U7XG4gIG1hdGNoSGVpZ2h0Ll9iZWZvcmVVcGRhdGUgPSBudWxsO1xuICBtYXRjaEhlaWdodC5fYWZ0ZXJVcGRhdGUgPSBudWxsO1xuICBtYXRjaEhlaWdodC5fcm93cyA9IF9yb3dzO1xuICBtYXRjaEhlaWdodC5fcGFyc2UgPSBfcGFyc2U7XG4gIG1hdGNoSGVpZ2h0Ll9wYXJzZU9wdGlvbnMgPSBfcGFyc2VPcHRpb25zO1xuICAvKlxuICAqICBtYXRjaEhlaWdodC5fYXBwbHlcbiAgKiAgYXBwbHkgbWF0Y2hIZWlnaHQgdG8gZ2l2ZW4gZWxlbWVudHNcbiAgKi9cblxuICBtYXRjaEhlaWdodC5fYXBwbHkgPSBmdW5jdGlvbiAoZWxlbWVudHMsIG9wdGlvbnMpIHtcbiAgICB2YXIgb3B0cyA9IF9wYXJzZU9wdGlvbnMob3B0aW9ucyksXG4gICAgICAgICRlbGVtZW50cyA9ICQoZWxlbWVudHMpLFxuICAgICAgICByb3dzID0gWyRlbGVtZW50c107IC8vIHRha2Ugbm90ZSBvZiBzY3JvbGwgcG9zaXRpb25cblxuXG4gICAgdmFyIHNjcm9sbFRvcCA9ICQod2luZG93KS5zY3JvbGxUb3AoKSxcbiAgICAgICAgaHRtbEhlaWdodCA9ICQoJ2h0bWwnKS5vdXRlckhlaWdodCh0cnVlKTsgLy8gZ2V0IGhpZGRlbiBwYXJlbnRzXG5cbiAgICB2YXIgJGhpZGRlblBhcmVudHMgPSAkZWxlbWVudHMucGFyZW50cygpLmZpbHRlcignOmhpZGRlbicpOyAvLyBjYWNoZSB0aGUgb3JpZ2luYWwgaW5saW5lIHN0eWxlXG5cbiAgICAkaGlkZGVuUGFyZW50cy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciAkdGhhdCA9ICQodGhpcyk7XG4gICAgICAkdGhhdC5kYXRhKCdzdHlsZS1jYWNoZScsICR0aGF0LmF0dHIoJ3N0eWxlJykpO1xuICAgIH0pOyAvLyB0ZW1wb3JhcmlseSBtdXN0IGZvcmNlIGhpZGRlbiBwYXJlbnRzIHZpc2libGVcblxuICAgICRoaWRkZW5QYXJlbnRzLmNzcygnZGlzcGxheScsICdibG9jaycpOyAvLyBnZXQgcm93cyBpZiB1c2luZyBieVJvdywgb3RoZXJ3aXNlIGFzc3VtZSBvbmUgcm93XG5cbiAgICBpZiAob3B0cy5ieVJvdyAmJiAhb3B0cy50YXJnZXQpIHtcbiAgICAgIC8vIG11c3QgZmlyc3QgZm9yY2UgYW4gYXJiaXRyYXJ5IGVxdWFsIGhlaWdodCBzbyBmbG9hdGluZyBlbGVtZW50cyBicmVhayBldmVubHlcbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICR0aGF0ID0gJCh0aGlzKSxcbiAgICAgICAgICAgIGRpc3BsYXkgPSAkdGhhdC5jc3MoJ2Rpc3BsYXknKTsgLy8gdGVtcG9yYXJpbHkgZm9yY2UgYSB1c2FibGUgZGlzcGxheSB2YWx1ZVxuXG4gICAgICAgIGlmIChkaXNwbGF5ICE9PSAnaW5saW5lLWJsb2NrJyAmJiBkaXNwbGF5ICE9PSAnZmxleCcgJiYgZGlzcGxheSAhPT0gJ2lubGluZS1mbGV4Jykge1xuICAgICAgICAgIGRpc3BsYXkgPSAnYmxvY2snO1xuICAgICAgICB9IC8vIGNhY2hlIHRoZSBvcmlnaW5hbCBpbmxpbmUgc3R5bGVcblxuXG4gICAgICAgICR0aGF0LmRhdGEoJ3N0eWxlLWNhY2hlJywgJHRoYXQuYXR0cignc3R5bGUnKSk7XG4gICAgICAgICR0aGF0LmNzcyh7XG4gICAgICAgICAgJ2Rpc3BsYXknOiBkaXNwbGF5LFxuICAgICAgICAgICdwYWRkaW5nLXRvcCc6ICcwJyxcbiAgICAgICAgICAncGFkZGluZy1ib3R0b20nOiAnMCcsXG4gICAgICAgICAgJ21hcmdpbi10b3AnOiAnMCcsXG4gICAgICAgICAgJ21hcmdpbi1ib3R0b20nOiAnMCcsXG4gICAgICAgICAgJ2JvcmRlci10b3Atd2lkdGgnOiAnMCcsXG4gICAgICAgICAgJ2JvcmRlci1ib3R0b20td2lkdGgnOiAnMCcsXG4gICAgICAgICAgJ2hlaWdodCc6ICcxMDBweCcsXG4gICAgICAgICAgJ292ZXJmbG93JzogJ2hpZGRlbidcbiAgICAgICAgfSk7XG4gICAgICB9KTsgLy8gZ2V0IHRoZSBhcnJheSBvZiByb3dzIChiYXNlZCBvbiBlbGVtZW50IHRvcCBwb3NpdGlvbilcblxuICAgICAgcm93cyA9IF9yb3dzKCRlbGVtZW50cyk7IC8vIHJldmVydCBvcmlnaW5hbCBpbmxpbmUgc3R5bGVzXG5cbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICR0aGF0ID0gJCh0aGlzKTtcbiAgICAgICAgJHRoYXQuYXR0cignc3R5bGUnLCAkdGhhdC5kYXRhKCdzdHlsZS1jYWNoZScpIHx8ICcnKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgICQuZWFjaChyb3dzLCBmdW5jdGlvbiAoa2V5LCByb3cpIHtcbiAgICAgIHZhciAkcm93ID0gJChyb3cpLFxuICAgICAgICAgIHRhcmdldEhlaWdodCA9IDA7XG5cbiAgICAgIGlmICghb3B0cy50YXJnZXQpIHtcbiAgICAgICAgLy8gc2tpcCBhcHBseSB0byByb3dzIHdpdGggb25seSBvbmUgaXRlbVxuICAgICAgICBpZiAob3B0cy5ieVJvdyAmJiAkcm93Lmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgJHJvdy5jc3Mob3B0cy5wcm9wZXJ0eSwgJycpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSAvLyBpdGVyYXRlIHRoZSByb3cgYW5kIGZpbmQgdGhlIG1heCBoZWlnaHRcblxuXG4gICAgICAgICRyb3cuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyICR0aGF0ID0gJCh0aGlzKSxcbiAgICAgICAgICAgICAgc3R5bGUgPSAkdGhhdC5hdHRyKCdzdHlsZScpLFxuICAgICAgICAgICAgICBkaXNwbGF5ID0gJHRoYXQuY3NzKCdkaXNwbGF5Jyk7IC8vIHRlbXBvcmFyaWx5IGZvcmNlIGEgdXNhYmxlIGRpc3BsYXkgdmFsdWVcblxuICAgICAgICAgIGlmIChkaXNwbGF5ICE9PSAnaW5saW5lLWJsb2NrJyAmJiBkaXNwbGF5ICE9PSAnZmxleCcgJiYgZGlzcGxheSAhPT0gJ2lubGluZS1mbGV4Jykge1xuICAgICAgICAgICAgZGlzcGxheSA9ICdibG9jayc7XG4gICAgICAgICAgfSAvLyBlbnN1cmUgd2UgZ2V0IHRoZSBjb3JyZWN0IGFjdHVhbCBoZWlnaHQgKGFuZCBub3QgYSBwcmV2aW91c2x5IHNldCBoZWlnaHQgdmFsdWUpXG5cblxuICAgICAgICAgIHZhciBjc3MgPSB7XG4gICAgICAgICAgICAnZGlzcGxheSc6IGRpc3BsYXlcbiAgICAgICAgICB9O1xuICAgICAgICAgIGNzc1tvcHRzLnByb3BlcnR5XSA9ICcnO1xuICAgICAgICAgICR0aGF0LmNzcyhjc3MpOyAvLyBmaW5kIHRoZSBtYXggaGVpZ2h0IChpbmNsdWRpbmcgcGFkZGluZywgYnV0IG5vdCBtYXJnaW4pXG5cbiAgICAgICAgICBpZiAoJHRoYXQub3V0ZXJIZWlnaHQoZmFsc2UpID4gdGFyZ2V0SGVpZ2h0KSB7XG4gICAgICAgICAgICB0YXJnZXRIZWlnaHQgPSAkdGhhdC5vdXRlckhlaWdodChmYWxzZSk7XG4gICAgICAgICAgfSAvLyByZXZlcnQgc3R5bGVzXG5cblxuICAgICAgICAgIGlmIChzdHlsZSkge1xuICAgICAgICAgICAgJHRoYXQuYXR0cignc3R5bGUnLCBzdHlsZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICR0aGF0LmNzcygnZGlzcGxheScsICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgdGFyZ2V0IHNldCwgdXNlIHRoZSBoZWlnaHQgb2YgdGhlIHRhcmdldCBlbGVtZW50XG4gICAgICAgIHRhcmdldEhlaWdodCA9IG9wdHMudGFyZ2V0Lm91dGVySGVpZ2h0KGZhbHNlKTtcbiAgICAgIH0gLy8gaXRlcmF0ZSB0aGUgcm93IGFuZCBhcHBseSB0aGUgaGVpZ2h0IHRvIGFsbCBlbGVtZW50c1xuXG5cbiAgICAgICRyb3cuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciAkdGhhdCA9ICQodGhpcyksXG4gICAgICAgICAgICB2ZXJ0aWNhbFBhZGRpbmcgPSAwOyAvLyBkb24ndCBhcHBseSB0byBhIHRhcmdldFxuXG4gICAgICAgIGlmIChvcHRzLnRhcmdldCAmJiAkdGhhdC5pcyhvcHRzLnRhcmdldCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gLy8gaGFuZGxlIHBhZGRpbmcgYW5kIGJvcmRlciBjb3JyZWN0bHkgKHJlcXVpcmVkIHdoZW4gbm90IHVzaW5nIGJvcmRlci1ib3gpXG5cblxuICAgICAgICBpZiAoJHRoYXQuY3NzKCdib3gtc2l6aW5nJykgIT09ICdib3JkZXItYm94Jykge1xuICAgICAgICAgIHZlcnRpY2FsUGFkZGluZyArPSBfcGFyc2UoJHRoYXQuY3NzKCdib3JkZXItdG9wLXdpZHRoJykpICsgX3BhcnNlKCR0aGF0LmNzcygnYm9yZGVyLWJvdHRvbS13aWR0aCcpKTtcbiAgICAgICAgICB2ZXJ0aWNhbFBhZGRpbmcgKz0gX3BhcnNlKCR0aGF0LmNzcygncGFkZGluZy10b3AnKSkgKyBfcGFyc2UoJHRoYXQuY3NzKCdwYWRkaW5nLWJvdHRvbScpKTtcbiAgICAgICAgfSAvLyBzZXQgdGhlIGhlaWdodCAoYWNjb3VudGluZyBmb3IgcGFkZGluZyBhbmQgYm9yZGVyKVxuXG5cbiAgICAgICAgJHRoYXQuY3NzKG9wdHMucHJvcGVydHksIHRhcmdldEhlaWdodCAtIHZlcnRpY2FsUGFkZGluZyArICdweCcpO1xuICAgICAgfSk7XG4gICAgfSk7IC8vIHJldmVydCBoaWRkZW4gcGFyZW50c1xuXG4gICAgJGhpZGRlblBhcmVudHMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgJHRoYXQgPSAkKHRoaXMpO1xuICAgICAgJHRoYXQuYXR0cignc3R5bGUnLCAkdGhhdC5kYXRhKCdzdHlsZS1jYWNoZScpIHx8IG51bGwpO1xuICAgIH0pOyAvLyByZXN0b3JlIHNjcm9sbCBwb3NpdGlvbiBpZiBlbmFibGVkXG5cbiAgICBpZiAobWF0Y2hIZWlnaHQuX21haW50YWluU2Nyb2xsKSB7XG4gICAgICAkKHdpbmRvdykuc2Nyb2xsVG9wKHNjcm9sbFRvcCAvIGh0bWxIZWlnaHQgKiAkKCdodG1sJykub3V0ZXJIZWlnaHQodHJ1ZSkpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuICAvKlxuICAqICBtYXRjaEhlaWdodC5fYXBwbHlEYXRhQXBpXG4gICogIGFwcGxpZXMgbWF0Y2hIZWlnaHQgdG8gYWxsIGVsZW1lbnRzIHdpdGggYSBkYXRhLW1hdGNoLWhlaWdodCBhdHRyaWJ1dGVcbiAgKi9cblxuXG4gIG1hdGNoSGVpZ2h0Ll9hcHBseURhdGFBcGkgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGdyb3VwcyA9IHt9OyAvLyBnZW5lcmF0ZSBncm91cHMgYnkgdGhlaXIgZ3JvdXBJZCBzZXQgYnkgZWxlbWVudHMgdXNpbmcgZGF0YS1tYXRjaC1oZWlnaHRcblxuICAgICQoJ1tkYXRhLW1hdGNoLWhlaWdodF0sIFtkYXRhLW1oXScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICR0aGlzID0gJCh0aGlzKSxcbiAgICAgICAgICBncm91cElkID0gJHRoaXMuYXR0cignZGF0YS1taCcpIHx8ICR0aGlzLmF0dHIoJ2RhdGEtbWF0Y2gtaGVpZ2h0Jyk7XG5cbiAgICAgIGlmIChncm91cElkIGluIGdyb3Vwcykge1xuICAgICAgICBncm91cHNbZ3JvdXBJZF0gPSBncm91cHNbZ3JvdXBJZF0uYWRkKCR0aGlzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGdyb3Vwc1tncm91cElkXSA9ICR0aGlzO1xuICAgICAgfVxuICAgIH0pOyAvLyBhcHBseSBtYXRjaEhlaWdodCB0byBlYWNoIGdyb3VwXG5cbiAgICAkLmVhY2goZ3JvdXBzLCBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLm1hdGNoSGVpZ2h0KHRydWUpO1xuICAgIH0pO1xuICB9O1xuICAvKlxuICAqICBtYXRjaEhlaWdodC5fdXBkYXRlXG4gICogIHVwZGF0ZXMgbWF0Y2hIZWlnaHQgb24gYWxsIGN1cnJlbnQgZ3JvdXBzIHdpdGggdGhlaXIgY29ycmVjdCBvcHRpb25zXG4gICovXG5cblxuICB2YXIgX3VwZGF0ZSA9IGZ1bmN0aW9uIF91cGRhdGUoZXZlbnQpIHtcbiAgICBpZiAobWF0Y2hIZWlnaHQuX2JlZm9yZVVwZGF0ZSkge1xuICAgICAgbWF0Y2hIZWlnaHQuX2JlZm9yZVVwZGF0ZShldmVudCwgbWF0Y2hIZWlnaHQuX2dyb3Vwcyk7XG4gICAgfVxuXG4gICAgJC5lYWNoKG1hdGNoSGVpZ2h0Ll9ncm91cHMsIGZ1bmN0aW9uICgpIHtcbiAgICAgIG1hdGNoSGVpZ2h0Ll9hcHBseSh0aGlzLmVsZW1lbnRzLCB0aGlzLm9wdGlvbnMpO1xuICAgIH0pO1xuXG4gICAgaWYgKG1hdGNoSGVpZ2h0Ll9hZnRlclVwZGF0ZSkge1xuICAgICAgbWF0Y2hIZWlnaHQuX2FmdGVyVXBkYXRlKGV2ZW50LCBtYXRjaEhlaWdodC5fZ3JvdXBzKTtcbiAgICB9XG4gIH07XG5cbiAgbWF0Y2hIZWlnaHQuX3VwZGF0ZSA9IGZ1bmN0aW9uICh0aHJvdHRsZSwgZXZlbnQpIHtcbiAgICAvLyBwcmV2ZW50IHVwZGF0ZSBpZiBmaXJlZCBmcm9tIGEgcmVzaXplIGV2ZW50XG4gICAgLy8gd2hlcmUgdGhlIHZpZXdwb3J0IHdpZHRoIGhhc24ndCBhY3R1YWxseSBjaGFuZ2VkXG4gICAgLy8gZml4ZXMgYW4gZXZlbnQgbG9vcGluZyBidWcgaW4gSUU4XG4gICAgaWYgKGV2ZW50ICYmIGV2ZW50LnR5cGUgPT09ICdyZXNpemUnKSB7XG4gICAgICB2YXIgd2luZG93V2lkdGggPSAkKHdpbmRvdykud2lkdGgoKTtcblxuICAgICAgaWYgKHdpbmRvd1dpZHRoID09PSBfcHJldmlvdXNSZXNpemVXaWR0aCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIF9wcmV2aW91c1Jlc2l6ZVdpZHRoID0gd2luZG93V2lkdGg7XG4gICAgfSAvLyB0aHJvdHRsZSB1cGRhdGVzXG5cblxuICAgIGlmICghdGhyb3R0bGUpIHtcbiAgICAgIF91cGRhdGUoZXZlbnQpO1xuICAgIH0gZWxzZSBpZiAoX3VwZGF0ZVRpbWVvdXQgPT09IC0xKSB7XG4gICAgICBfdXBkYXRlVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICBfdXBkYXRlKGV2ZW50KTtcblxuICAgICAgICBfdXBkYXRlVGltZW91dCA9IC0xO1xuICAgICAgfSwgbWF0Y2hIZWlnaHQuX3Rocm90dGxlKTtcbiAgICB9XG4gIH07XG4gIC8qXG4gICogIGJpbmQgZXZlbnRzXG4gICovXG4gIC8vIGFwcGx5IG9uIERPTSByZWFkeSBldmVudFxuXG5cbiAgJChtYXRjaEhlaWdodC5fYXBwbHlEYXRhQXBpKTsgLy8gdXNlIG9uIG9yIGJpbmQgd2hlcmUgc3VwcG9ydGVkXG5cbiAgdmFyIG9uID0gJC5mbi5vbiA/ICdvbicgOiAnYmluZCc7IC8vIHVwZGF0ZSBoZWlnaHRzIG9uIGxvYWQgYW5kIHJlc2l6ZSBldmVudHNcblxuICAkKHdpbmRvdylbb25dKCdsb2FkJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgbWF0Y2hIZWlnaHQuX3VwZGF0ZShmYWxzZSwgZXZlbnQpO1xuICB9KTsgLy8gdGhyb3R0bGVkIHVwZGF0ZSBoZWlnaHRzIG9uIHJlc2l6ZSBldmVudHNcblxuICAkKHdpbmRvdylbb25dKCdyZXNpemUgb3JpZW50YXRpb25jaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBtYXRjaEhlaWdodC5fdXBkYXRlKHRydWUsIGV2ZW50KTtcbiAgfSk7XG59KTsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyohIG1hdGNoTWVkaWEoKSBwb2x5ZmlsbCAtIFRlc3QgYSBDU1MgbWVkaWEgdHlwZS9xdWVyeSBpbiBKUy4gQXV0aG9ycyAmIGNvcHlyaWdodCAoYykgMjAxMjogU2NvdHQgSmVobCwgUGF1bCBJcmlzaCwgTmljaG9sYXMgWmFrYXMsIERhdmlkIEtuaWdodC4gRHVhbCBNSVQvQlNEIGxpY2Vuc2UgKi9cbndpbmRvdy5tYXRjaE1lZGlhIHx8ICh3aW5kb3cubWF0Y2hNZWRpYSA9IGZ1bmN0aW9uICgpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7IC8vIEZvciBicm93c2VycyB0aGF0IHN1cHBvcnQgbWF0Y2hNZWRpdW0gYXBpIHN1Y2ggYXMgSUUgOSBhbmQgd2Via2l0XG5cbiAgdmFyIHN0eWxlTWVkaWEgPSB3aW5kb3cuc3R5bGVNZWRpYSB8fCB3aW5kb3cubWVkaWE7IC8vIEZvciB0aG9zZSB0aGF0IGRvbid0IHN1cHBvcnQgbWF0Y2hNZWRpdW1cblxuICBpZiAoIXN0eWxlTWVkaWEpIHtcbiAgICB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpLFxuICAgICAgICBzY3JpcHQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JylbMF0sXG4gICAgICAgIGluZm8gPSBudWxsO1xuICAgIHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuICAgIHN0eWxlLmlkID0gJ21hdGNobWVkaWFqcy10ZXN0JztcbiAgICBzY3JpcHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3R5bGUsIHNjcmlwdCk7IC8vICdzdHlsZS5jdXJyZW50U3R5bGUnIGlzIHVzZWQgYnkgSUUgPD0gOCBhbmQgJ3dpbmRvdy5nZXRDb21wdXRlZFN0eWxlJyBmb3IgYWxsIG90aGVyIGJyb3dzZXJzXG5cbiAgICBpbmZvID0gJ2dldENvbXB1dGVkU3R5bGUnIGluIHdpbmRvdyAmJiB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShzdHlsZSwgbnVsbCkgfHwgc3R5bGUuY3VycmVudFN0eWxlO1xuICAgIHN0eWxlTWVkaWEgPSB7XG4gICAgICBtYXRjaE1lZGl1bTogZnVuY3Rpb24gbWF0Y2hNZWRpdW0obWVkaWEpIHtcbiAgICAgICAgdmFyIHRleHQgPSAnQG1lZGlhICcgKyBtZWRpYSArICd7ICNtYXRjaG1lZGlhanMtdGVzdCB7IHdpZHRoOiAxcHg7IH0gfSc7IC8vICdzdHlsZS5zdHlsZVNoZWV0JyBpcyB1c2VkIGJ5IElFIDw9IDggYW5kICdzdHlsZS50ZXh0Q29udGVudCcgZm9yIGFsbCBvdGhlciBicm93c2Vyc1xuXG4gICAgICAgIGlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gdGV4dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHlsZS50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIH0gLy8gVGVzdCBpZiBtZWRpYSBxdWVyeSBpcyB0cnVlIG9yIGZhbHNlXG5cblxuICAgICAgICByZXR1cm4gaW5mby53aWR0aCA9PT0gJzFweCc7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAobWVkaWEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbWF0Y2hlczogc3R5bGVNZWRpYS5tYXRjaE1lZGl1bShtZWRpYSB8fCAnYWxsJyksXG4gICAgICBtZWRpYTogbWVkaWEgfHwgJ2FsbCdcbiAgICB9O1xuICB9O1xufSgpKTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuLyohXG4gKiBGbGlja2l0eSBQQUNLQUdFRCB2Mi4yLjBcbiAqIFRvdWNoLCByZXNwb25zaXZlLCBmbGlja2FibGUgY2Fyb3VzZWxzXG4gKlxuICogTGljZW5zZWQgR1BMdjMgZm9yIG9wZW4gc291cmNlIHVzZVxuICogb3IgRmxpY2tpdHkgQ29tbWVyY2lhbCBMaWNlbnNlIGZvciBjb21tZXJjaWFsIHVzZVxuICpcbiAqIGh0dHBzOi8vZmxpY2tpdHkubWV0YWZpenp5LmNvXG4gKiBDb3B5cmlnaHQgMjAxNS0yMDE4IE1ldGFmaXp6eVxuICovXG5cbi8qKlxuICogQnJpZGdldCBtYWtlcyBqUXVlcnkgd2lkZ2V0c1xuICogdjIuMC4xXG4gKiBNSVQgbGljZW5zZVxuICovXG5cbi8qIGpzaGludCBicm93c2VyOiB0cnVlLCBzdHJpY3Q6IHRydWUsIHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cbihmdW5jdGlvbiAod2luZG93LCBmYWN0b3J5KSB7XG4gIC8vIHVuaXZlcnNhbCBtb2R1bGUgZGVmaW5pdGlvblxuXG4gIC8qanNoaW50IHN0cmljdDogZmFsc2UgKi9cblxuICAvKiBnbG9iYWxzIGRlZmluZSwgbW9kdWxlLCByZXF1aXJlICovXG4gIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRFxuICAgIGRlZmluZSgnanF1ZXJ5LWJyaWRnZXQvanF1ZXJ5LWJyaWRnZXQnLCBbJ2pxdWVyeSddLCBmdW5jdGlvbiAoalF1ZXJ5KSB7XG4gICAgICByZXR1cm4gZmFjdG9yeSh3aW5kb3csIGpRdWVyeSk7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBtb2R1bGUgPT09IFwidW5kZWZpbmVkXCIgPyBcInVuZGVmaW5lZFwiIDogX3R5cGVvZihtb2R1bGUpKSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHdpbmRvdywgcmVxdWlyZSgnanF1ZXJ5JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIGJyb3dzZXIgZ2xvYmFsXG4gICAgd2luZG93LmpRdWVyeUJyaWRnZXQgPSBmYWN0b3J5KHdpbmRvdywgd2luZG93LmpRdWVyeSk7XG4gIH1cbn0pKHdpbmRvdywgZnVuY3Rpb24gZmFjdG9yeSh3aW5kb3csIGpRdWVyeSkge1xuICAndXNlIHN0cmljdCc7IC8vIC0tLS0tIHV0aWxzIC0tLS0tIC8vXG5cbiAgdmFyIGFycmF5U2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7IC8vIGhlbHBlciBmdW5jdGlvbiBmb3IgbG9nZ2luZyBlcnJvcnNcbiAgLy8gJC5lcnJvciBicmVha3MgalF1ZXJ5IGNoYWluaW5nXG5cbiAgdmFyIGNvbnNvbGUgPSB3aW5kb3cuY29uc29sZTtcbiAgdmFyIGxvZ0Vycm9yID0gdHlwZW9mIGNvbnNvbGUgPT0gJ3VuZGVmaW5lZCcgPyBmdW5jdGlvbiAoKSB7fSA6IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgY29uc29sZS5lcnJvcihtZXNzYWdlKTtcbiAgfTsgLy8gLS0tLS0galF1ZXJ5QnJpZGdldCAtLS0tLSAvL1xuXG4gIGZ1bmN0aW9uIGpRdWVyeUJyaWRnZXQobmFtZXNwYWNlLCBQbHVnaW5DbGFzcywgJCkge1xuICAgICQgPSAkIHx8IGpRdWVyeSB8fCB3aW5kb3cualF1ZXJ5O1xuXG4gICAgaWYgKCEkKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBhZGQgb3B0aW9uIG1ldGhvZCAtPiAkKCkucGx1Z2luKCdvcHRpb24nLCB7Li4ufSlcblxuXG4gICAgaWYgKCFQbHVnaW5DbGFzcy5wcm90b3R5cGUub3B0aW9uKSB7XG4gICAgICAvLyBvcHRpb24gc2V0dGVyXG4gICAgICBQbHVnaW5DbGFzcy5wcm90b3R5cGUub3B0aW9uID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgICAgICAgLy8gYmFpbCBvdXQgaWYgbm90IGFuIG9iamVjdFxuICAgICAgICBpZiAoISQuaXNQbGFpbk9iamVjdChvcHRzKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHRoaXMub3B0aW9ucywgb3B0cyk7XG4gICAgICB9O1xuICAgIH0gLy8gbWFrZSBqUXVlcnkgcGx1Z2luXG5cblxuICAgICQuZm5bbmFtZXNwYWNlXSA9IGZ1bmN0aW9uIChhcmcwXG4gICAgLyosIGFyZzEgKi9cbiAgICApIHtcbiAgICAgIGlmICh0eXBlb2YgYXJnMCA9PSAnc3RyaW5nJykge1xuICAgICAgICAvLyBtZXRob2QgY2FsbCAkKCkucGx1Z2luKCAnbWV0aG9kTmFtZScsIHsgb3B0aW9ucyB9IClcbiAgICAgICAgLy8gc2hpZnQgYXJndW1lbnRzIGJ5IDFcbiAgICAgICAgdmFyIGFyZ3MgPSBhcnJheVNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgcmV0dXJuIG1ldGhvZENhbGwodGhpcywgYXJnMCwgYXJncyk7XG4gICAgICB9IC8vIGp1c3QgJCgpLnBsdWdpbih7IG9wdGlvbnMgfSlcblxuXG4gICAgICBwbGFpbkNhbGwodGhpcywgYXJnMCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9OyAvLyAkKCkucGx1Z2luKCdtZXRob2ROYW1lJylcblxuXG4gICAgZnVuY3Rpb24gbWV0aG9kQ2FsbCgkZWxlbXMsIG1ldGhvZE5hbWUsIGFyZ3MpIHtcbiAgICAgIHZhciByZXR1cm5WYWx1ZTtcbiAgICAgIHZhciBwbHVnaW5NZXRob2RTdHIgPSAnJCgpLicgKyBuYW1lc3BhY2UgKyAnKFwiJyArIG1ldGhvZE5hbWUgKyAnXCIpJztcbiAgICAgICRlbGVtcy5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtKSB7XG4gICAgICAgIC8vIGdldCBpbnN0YW5jZVxuICAgICAgICB2YXIgaW5zdGFuY2UgPSAkLmRhdGEoZWxlbSwgbmFtZXNwYWNlKTtcblxuICAgICAgICBpZiAoIWluc3RhbmNlKSB7XG4gICAgICAgICAgbG9nRXJyb3IobmFtZXNwYWNlICsgJyBub3QgaW5pdGlhbGl6ZWQuIENhbm5vdCBjYWxsIG1ldGhvZHMsIGkuZS4gJyArIHBsdWdpbk1ldGhvZFN0cik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG1ldGhvZCA9IGluc3RhbmNlW21ldGhvZE5hbWVdO1xuXG4gICAgICAgIGlmICghbWV0aG9kIHx8IG1ldGhvZE5hbWUuY2hhckF0KDApID09ICdfJykge1xuICAgICAgICAgIGxvZ0Vycm9yKHBsdWdpbk1ldGhvZFN0ciArICcgaXMgbm90IGEgdmFsaWQgbWV0aG9kJyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IC8vIGFwcGx5IG1ldGhvZCwgZ2V0IHJldHVybiB2YWx1ZVxuXG5cbiAgICAgICAgdmFyIHZhbHVlID0gbWV0aG9kLmFwcGx5KGluc3RhbmNlLCBhcmdzKTsgLy8gc2V0IHJldHVybiB2YWx1ZSBpZiB2YWx1ZSBpcyByZXR1cm5lZCwgdXNlIG9ubHkgZmlyc3QgdmFsdWVcblxuICAgICAgICByZXR1cm5WYWx1ZSA9IHJldHVyblZhbHVlID09PSB1bmRlZmluZWQgPyB2YWx1ZSA6IHJldHVyblZhbHVlO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmV0dXJuVmFsdWUgIT09IHVuZGVmaW5lZCA/IHJldHVyblZhbHVlIDogJGVsZW1zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBsYWluQ2FsbCgkZWxlbXMsIG9wdGlvbnMpIHtcbiAgICAgICRlbGVtcy5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtKSB7XG4gICAgICAgIHZhciBpbnN0YW5jZSA9ICQuZGF0YShlbGVtLCBuYW1lc3BhY2UpO1xuXG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgIC8vIHNldCBvcHRpb25zICYgaW5pdFxuICAgICAgICAgIGluc3RhbmNlLm9wdGlvbihvcHRpb25zKTtcblxuICAgICAgICAgIGluc3RhbmNlLl9pbml0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gaW5pdGlhbGl6ZSBuZXcgaW5zdGFuY2VcbiAgICAgICAgICBpbnN0YW5jZSA9IG5ldyBQbHVnaW5DbGFzcyhlbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAkLmRhdGEoZWxlbSwgbmFtZXNwYWNlLCBpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHVwZGF0ZUpRdWVyeSgkKTtcbiAgfSAvLyAtLS0tLSB1cGRhdGVKUXVlcnkgLS0tLS0gLy9cbiAgLy8gc2V0ICQuYnJpZGdldCBmb3IgdjEgYmFja3dhcmRzIGNvbXBhdGliaWxpdHlcblxuXG4gIGZ1bmN0aW9uIHVwZGF0ZUpRdWVyeSgkKSB7XG4gICAgaWYgKCEkIHx8ICQgJiYgJC5icmlkZ2V0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgJC5icmlkZ2V0ID0galF1ZXJ5QnJpZGdldDtcbiAgfVxuXG4gIHVwZGF0ZUpRdWVyeShqUXVlcnkgfHwgd2luZG93LmpRdWVyeSk7IC8vIC0tLS0tICAtLS0tLSAvL1xuXG4gIHJldHVybiBqUXVlcnlCcmlkZ2V0O1xufSk7XG4vKipcbiAqIEV2RW1pdHRlciB2MS4xLjBcbiAqIExpbCcgZXZlbnQgZW1pdHRlclxuICogTUlUIExpY2Vuc2VcbiAqL1xuXG4vKiBqc2hpbnQgdW51c2VkOiB0cnVlLCB1bmRlZjogdHJ1ZSwgc3RyaWN0OiB0cnVlICovXG5cblxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgLy8gdW5pdmVyc2FsIG1vZHVsZSBkZWZpbml0aW9uXG5cbiAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cblxuICAvKiBnbG9iYWxzIGRlZmluZSwgbW9kdWxlLCB3aW5kb3cgKi9cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EIC0gUmVxdWlyZUpTXG4gICAgZGVmaW5lKCdldi1lbWl0dGVyL2V2LWVtaXR0ZXInLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIG1vZHVsZSA9PT0gXCJ1bmRlZmluZWRcIiA/IFwidW5kZWZpbmVkXCIgOiBfdHlwZW9mKG1vZHVsZSkpID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMgLSBCcm93c2VyaWZ5LCBXZWJwYWNrXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzXG4gICAgZ2xvYmFsLkV2RW1pdHRlciA9IGZhY3RvcnkoKTtcbiAgfVxufSkodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHZvaWQgMCwgZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBFdkVtaXR0ZXIoKSB7fVxuXG4gIHZhciBwcm90byA9IEV2RW1pdHRlci5wcm90b3R5cGU7XG5cbiAgcHJvdG8ub24gPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBsaXN0ZW5lcikge1xuICAgIGlmICghZXZlbnROYW1lIHx8ICFsaXN0ZW5lcikge1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gc2V0IGV2ZW50cyBoYXNoXG5cblxuICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307IC8vIHNldCBsaXN0ZW5lcnMgYXJyYXlcblxuICAgIHZhciBsaXN0ZW5lcnMgPSBldmVudHNbZXZlbnROYW1lXSA9IGV2ZW50c1tldmVudE5hbWVdIHx8IFtdOyAvLyBvbmx5IGFkZCBvbmNlXG5cbiAgICBpZiAobGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpID09IC0xKSB7XG4gICAgICBsaXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgcHJvdG8ub25jZSA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGxpc3RlbmVyKSB7XG4gICAgaWYgKCFldmVudE5hbWUgfHwgIWxpc3RlbmVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBhZGQgZXZlbnRcblxuXG4gICAgdGhpcy5vbihldmVudE5hbWUsIGxpc3RlbmVyKTsgLy8gc2V0IG9uY2UgZmxhZ1xuICAgIC8vIHNldCBvbmNlRXZlbnRzIGhhc2hcblxuICAgIHZhciBvbmNlRXZlbnRzID0gdGhpcy5fb25jZUV2ZW50cyA9IHRoaXMuX29uY2VFdmVudHMgfHwge307IC8vIHNldCBvbmNlTGlzdGVuZXJzIG9iamVjdFxuXG4gICAgdmFyIG9uY2VMaXN0ZW5lcnMgPSBvbmNlRXZlbnRzW2V2ZW50TmFtZV0gPSBvbmNlRXZlbnRzW2V2ZW50TmFtZV0gfHwge307IC8vIHNldCBmbGFnXG5cbiAgICBvbmNlTGlzdGVuZXJzW2xpc3RlbmVyXSA9IHRydWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgcHJvdG8ub2ZmID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgbGlzdGVuZXIpIHtcbiAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzICYmIHRoaXMuX2V2ZW50c1tldmVudE5hbWVdO1xuXG4gICAgaWYgKCFsaXN0ZW5lcnMgfHwgIWxpc3RlbmVycy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSBsaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XG5cbiAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgIGxpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIHByb3RvLmVtaXRFdmVudCA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGFyZ3MpIHtcbiAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzICYmIHRoaXMuX2V2ZW50c1tldmVudE5hbWVdO1xuXG4gICAgaWYgKCFsaXN0ZW5lcnMgfHwgIWxpc3RlbmVycy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIGNvcHkgb3ZlciB0byBhdm9pZCBpbnRlcmZlcmVuY2UgaWYgLm9mZigpIGluIGxpc3RlbmVyXG5cblxuICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5zbGljZSgwKTtcbiAgICBhcmdzID0gYXJncyB8fCBbXTsgLy8gb25jZSBzdHVmZlxuXG4gICAgdmFyIG9uY2VMaXN0ZW5lcnMgPSB0aGlzLl9vbmNlRXZlbnRzICYmIHRoaXMuX29uY2VFdmVudHNbZXZlbnROYW1lXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbGlzdGVuZXIgPSBsaXN0ZW5lcnNbaV07XG4gICAgICB2YXIgaXNPbmNlID0gb25jZUxpc3RlbmVycyAmJiBvbmNlTGlzdGVuZXJzW2xpc3RlbmVyXTtcblxuICAgICAgaWYgKGlzT25jZSkge1xuICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXJcbiAgICAgICAgLy8gcmVtb3ZlIGJlZm9yZSB0cmlnZ2VyIHRvIHByZXZlbnQgcmVjdXJzaW9uXG4gICAgICAgIHRoaXMub2ZmKGV2ZW50TmFtZSwgbGlzdGVuZXIpOyAvLyB1bnNldCBvbmNlIGZsYWdcblxuICAgICAgICBkZWxldGUgb25jZUxpc3RlbmVyc1tsaXN0ZW5lcl07XG4gICAgICB9IC8vIHRyaWdnZXIgbGlzdGVuZXJcblxuXG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBwcm90by5hbGxPZmYgPSBmdW5jdGlvbiAoKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50cztcbiAgICBkZWxldGUgdGhpcy5fb25jZUV2ZW50cztcbiAgfTtcblxuICByZXR1cm4gRXZFbWl0dGVyO1xufSk7XG4vKiFcbiAqIGdldFNpemUgdjIuMC4zXG4gKiBtZWFzdXJlIHNpemUgb2YgZWxlbWVudHNcbiAqIE1JVCBsaWNlbnNlXG4gKi9cblxuLyoganNoaW50IGJyb3dzZXI6IHRydWUsIHN0cmljdDogdHJ1ZSwgdW5kZWY6IHRydWUsIHVudXNlZDogdHJ1ZSAqL1xuXG4vKiBnbG9iYWxzIGNvbnNvbGU6IGZhbHNlICovXG5cblxuKGZ1bmN0aW9uICh3aW5kb3csIGZhY3RvcnkpIHtcbiAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cblxuICAvKiBnbG9iYWxzIGRlZmluZSwgbW9kdWxlICovXG4gIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRFxuICAgIGRlZmluZSgnZ2V0LXNpemUvZ2V0LXNpemUnLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIG1vZHVsZSA9PT0gXCJ1bmRlZmluZWRcIiA/IFwidW5kZWZpbmVkXCIgOiBfdHlwZW9mKG1vZHVsZSkpID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBicm93c2VyIGdsb2JhbFxuICAgIHdpbmRvdy5nZXRTaXplID0gZmFjdG9yeSgpO1xuICB9XG59KSh3aW5kb3csIGZ1bmN0aW9uIGZhY3RvcnkoKSB7XG4gICd1c2Ugc3RyaWN0JzsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gaGVscGVycyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuICAvLyBnZXQgYSBudW1iZXIgZnJvbSBhIHN0cmluZywgbm90IGEgcGVyY2VudGFnZVxuXG4gIGZ1bmN0aW9uIGdldFN0eWxlU2l6ZSh2YWx1ZSkge1xuICAgIHZhciBudW0gPSBwYXJzZUZsb2F0KHZhbHVlKTsgLy8gbm90IGEgcGVyY2VudCBsaWtlICcxMDAlJywgYW5kIGEgbnVtYmVyXG5cbiAgICB2YXIgaXNWYWxpZCA9IHZhbHVlLmluZGV4T2YoJyUnKSA9PSAtMSAmJiAhaXNOYU4obnVtKTtcbiAgICByZXR1cm4gaXNWYWxpZCAmJiBudW07XG4gIH1cblxuICBmdW5jdGlvbiBub29wKCkge31cblxuICB2YXIgbG9nRXJyb3IgPSB0eXBlb2YgY29uc29sZSA9PSAndW5kZWZpbmVkJyA/IG5vb3AgOiBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSk7XG4gIH07IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIG1lYXN1cmVtZW50cyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG4gIHZhciBtZWFzdXJlbWVudHMgPSBbJ3BhZGRpbmdMZWZ0JywgJ3BhZGRpbmdSaWdodCcsICdwYWRkaW5nVG9wJywgJ3BhZGRpbmdCb3R0b20nLCAnbWFyZ2luTGVmdCcsICdtYXJnaW5SaWdodCcsICdtYXJnaW5Ub3AnLCAnbWFyZ2luQm90dG9tJywgJ2JvcmRlckxlZnRXaWR0aCcsICdib3JkZXJSaWdodFdpZHRoJywgJ2JvcmRlclRvcFdpZHRoJywgJ2JvcmRlckJvdHRvbVdpZHRoJ107XG4gIHZhciBtZWFzdXJlbWVudHNMZW5ndGggPSBtZWFzdXJlbWVudHMubGVuZ3RoO1xuXG4gIGZ1bmN0aW9uIGdldFplcm9TaXplKCkge1xuICAgIHZhciBzaXplID0ge1xuICAgICAgd2lkdGg6IDAsXG4gICAgICBoZWlnaHQ6IDAsXG4gICAgICBpbm5lcldpZHRoOiAwLFxuICAgICAgaW5uZXJIZWlnaHQ6IDAsXG4gICAgICBvdXRlcldpZHRoOiAwLFxuICAgICAgb3V0ZXJIZWlnaHQ6IDBcbiAgICB9O1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZWFzdXJlbWVudHNMZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG1lYXN1cmVtZW50ID0gbWVhc3VyZW1lbnRzW2ldO1xuICAgICAgc2l6ZVttZWFzdXJlbWVudF0gPSAwO1xuICAgIH1cblxuICAgIHJldHVybiBzaXplO1xuICB9IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGdldFN0eWxlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cbiAgLyoqXG4gICAqIGdldFN0eWxlLCBnZXQgc3R5bGUgb2YgZWxlbWVudCwgY2hlY2sgZm9yIEZpcmVmb3ggYnVnXG4gICAqIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTU0ODM5N1xuICAgKi9cblxuXG4gIGZ1bmN0aW9uIGdldFN0eWxlKGVsZW0pIHtcbiAgICB2YXIgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGVsZW0pO1xuXG4gICAgaWYgKCFzdHlsZSkge1xuICAgICAgbG9nRXJyb3IoJ1N0eWxlIHJldHVybmVkICcgKyBzdHlsZSArICcuIEFyZSB5b3UgcnVubmluZyB0aGlzIGNvZGUgaW4gYSBoaWRkZW4gaWZyYW1lIG9uIEZpcmVmb3g/ICcgKyAnU2VlIGh0dHBzOi8vYml0Lmx5L2dldHNpemVidWcxJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0eWxlO1xuICB9IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIHNldHVwIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cblxuICB2YXIgaXNTZXR1cCA9IGZhbHNlO1xuICB2YXIgaXNCb3hTaXplT3V0ZXI7XG4gIC8qKlxuICAgKiBzZXR1cFxuICAgKiBjaGVjayBpc0JveFNpemVyT3V0ZXJcbiAgICogZG8gb24gZmlyc3QgZ2V0U2l6ZSgpIHJhdGhlciB0aGFuIG9uIHBhZ2UgbG9hZCBmb3IgRmlyZWZveCBidWdcbiAgICovXG5cbiAgZnVuY3Rpb24gc2V0dXAoKSB7XG4gICAgLy8gc2V0dXAgb25jZVxuICAgIGlmIChpc1NldHVwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaXNTZXR1cCA9IHRydWU7IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGJveCBzaXppbmcgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cblxuICAgIC8qKlxuICAgICAqIENocm9tZSAmIFNhZmFyaSBtZWFzdXJlIHRoZSBvdXRlci13aWR0aCBvbiBzdHlsZS53aWR0aCBvbiBib3JkZXItYm94IGVsZW1zXG4gICAgICogSUUxMSAmIEZpcmVmb3g8MjkgbWVhc3VyZXMgdGhlIGlubmVyLXdpZHRoXG4gICAgICovXG5cbiAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2LnN0eWxlLndpZHRoID0gJzIwMHB4JztcbiAgICBkaXYuc3R5bGUucGFkZGluZyA9ICcxcHggMnB4IDNweCA0cHgnO1xuICAgIGRpdi5zdHlsZS5ib3JkZXJTdHlsZSA9ICdzb2xpZCc7XG4gICAgZGl2LnN0eWxlLmJvcmRlcldpZHRoID0gJzFweCAycHggM3B4IDRweCc7XG4gICAgZGl2LnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcbiAgICB2YXIgYm9keSA9IGRvY3VtZW50LmJvZHkgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgIGJvZHkuYXBwZW5kQ2hpbGQoZGl2KTtcbiAgICB2YXIgc3R5bGUgPSBnZXRTdHlsZShkaXYpOyAvLyByb3VuZCB2YWx1ZSBmb3IgYnJvd3NlciB6b29tLiBkZXNhbmRyby9tYXNvbnJ5IzkyOFxuXG4gICAgaXNCb3hTaXplT3V0ZXIgPSBNYXRoLnJvdW5kKGdldFN0eWxlU2l6ZShzdHlsZS53aWR0aCkpID09IDIwMDtcbiAgICBnZXRTaXplLmlzQm94U2l6ZU91dGVyID0gaXNCb3hTaXplT3V0ZXI7XG4gICAgYm9keS5yZW1vdmVDaGlsZChkaXYpO1xuICB9IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGdldFNpemUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cblxuXG4gIGZ1bmN0aW9uIGdldFNpemUoZWxlbSkge1xuICAgIHNldHVwKCk7IC8vIHVzZSBxdWVyeVNlbGV0b3IgaWYgZWxlbSBpcyBzdHJpbmdcblxuICAgIGlmICh0eXBlb2YgZWxlbSA9PSAnc3RyaW5nJykge1xuICAgICAgZWxlbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbSk7XG4gICAgfSAvLyBkbyBub3QgcHJvY2VlZCBvbiBub24tb2JqZWN0c1xuXG5cbiAgICBpZiAoIWVsZW0gfHwgX3R5cGVvZihlbGVtKSAhPSAnb2JqZWN0JyB8fCAhZWxlbS5ub2RlVHlwZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzdHlsZSA9IGdldFN0eWxlKGVsZW0pOyAvLyBpZiBoaWRkZW4sIGV2ZXJ5dGhpbmcgaXMgMFxuXG4gICAgaWYgKHN0eWxlLmRpc3BsYXkgPT0gJ25vbmUnKSB7XG4gICAgICByZXR1cm4gZ2V0WmVyb1NpemUoKTtcbiAgICB9XG5cbiAgICB2YXIgc2l6ZSA9IHt9O1xuICAgIHNpemUud2lkdGggPSBlbGVtLm9mZnNldFdpZHRoO1xuICAgIHNpemUuaGVpZ2h0ID0gZWxlbS5vZmZzZXRIZWlnaHQ7XG4gICAgdmFyIGlzQm9yZGVyQm94ID0gc2l6ZS5pc0JvcmRlckJveCA9IHN0eWxlLmJveFNpemluZyA9PSAnYm9yZGVyLWJveCc7IC8vIGdldCBhbGwgbWVhc3VyZW1lbnRzXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lYXN1cmVtZW50c0xlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbWVhc3VyZW1lbnQgPSBtZWFzdXJlbWVudHNbaV07XG4gICAgICB2YXIgdmFsdWUgPSBzdHlsZVttZWFzdXJlbWVudF07XG4gICAgICB2YXIgbnVtID0gcGFyc2VGbG9hdCh2YWx1ZSk7IC8vIGFueSAnYXV0bycsICdtZWRpdW0nIHZhbHVlIHdpbGwgYmUgMFxuXG4gICAgICBzaXplW21lYXN1cmVtZW50XSA9ICFpc05hTihudW0pID8gbnVtIDogMDtcbiAgICB9XG5cbiAgICB2YXIgcGFkZGluZ1dpZHRoID0gc2l6ZS5wYWRkaW5nTGVmdCArIHNpemUucGFkZGluZ1JpZ2h0O1xuICAgIHZhciBwYWRkaW5nSGVpZ2h0ID0gc2l6ZS5wYWRkaW5nVG9wICsgc2l6ZS5wYWRkaW5nQm90dG9tO1xuICAgIHZhciBtYXJnaW5XaWR0aCA9IHNpemUubWFyZ2luTGVmdCArIHNpemUubWFyZ2luUmlnaHQ7XG4gICAgdmFyIG1hcmdpbkhlaWdodCA9IHNpemUubWFyZ2luVG9wICsgc2l6ZS5tYXJnaW5Cb3R0b207XG4gICAgdmFyIGJvcmRlcldpZHRoID0gc2l6ZS5ib3JkZXJMZWZ0V2lkdGggKyBzaXplLmJvcmRlclJpZ2h0V2lkdGg7XG4gICAgdmFyIGJvcmRlckhlaWdodCA9IHNpemUuYm9yZGVyVG9wV2lkdGggKyBzaXplLmJvcmRlckJvdHRvbVdpZHRoO1xuICAgIHZhciBpc0JvcmRlckJveFNpemVPdXRlciA9IGlzQm9yZGVyQm94ICYmIGlzQm94U2l6ZU91dGVyOyAvLyBvdmVyd3JpdGUgd2lkdGggYW5kIGhlaWdodCBpZiB3ZSBjYW4gZ2V0IGl0IGZyb20gc3R5bGVcblxuICAgIHZhciBzdHlsZVdpZHRoID0gZ2V0U3R5bGVTaXplKHN0eWxlLndpZHRoKTtcblxuICAgIGlmIChzdHlsZVdpZHRoICE9PSBmYWxzZSkge1xuICAgICAgc2l6ZS53aWR0aCA9IHN0eWxlV2lkdGggKyAoIC8vIGFkZCBwYWRkaW5nIGFuZCBib3JkZXIgdW5sZXNzIGl0J3MgYWxyZWFkeSBpbmNsdWRpbmcgaXRcbiAgICAgIGlzQm9yZGVyQm94U2l6ZU91dGVyID8gMCA6IHBhZGRpbmdXaWR0aCArIGJvcmRlcldpZHRoKTtcbiAgICB9XG5cbiAgICB2YXIgc3R5bGVIZWlnaHQgPSBnZXRTdHlsZVNpemUoc3R5bGUuaGVpZ2h0KTtcblxuICAgIGlmIChzdHlsZUhlaWdodCAhPT0gZmFsc2UpIHtcbiAgICAgIHNpemUuaGVpZ2h0ID0gc3R5bGVIZWlnaHQgKyAoIC8vIGFkZCBwYWRkaW5nIGFuZCBib3JkZXIgdW5sZXNzIGl0J3MgYWxyZWFkeSBpbmNsdWRpbmcgaXRcbiAgICAgIGlzQm9yZGVyQm94U2l6ZU91dGVyID8gMCA6IHBhZGRpbmdIZWlnaHQgKyBib3JkZXJIZWlnaHQpO1xuICAgIH1cblxuICAgIHNpemUuaW5uZXJXaWR0aCA9IHNpemUud2lkdGggLSAocGFkZGluZ1dpZHRoICsgYm9yZGVyV2lkdGgpO1xuICAgIHNpemUuaW5uZXJIZWlnaHQgPSBzaXplLmhlaWdodCAtIChwYWRkaW5nSGVpZ2h0ICsgYm9yZGVySGVpZ2h0KTtcbiAgICBzaXplLm91dGVyV2lkdGggPSBzaXplLndpZHRoICsgbWFyZ2luV2lkdGg7XG4gICAgc2l6ZS5vdXRlckhlaWdodCA9IHNpemUuaGVpZ2h0ICsgbWFyZ2luSGVpZ2h0O1xuICAgIHJldHVybiBzaXplO1xuICB9XG5cbiAgcmV0dXJuIGdldFNpemU7XG59KTtcbi8qKlxuICogbWF0Y2hlc1NlbGVjdG9yIHYyLjAuMlxuICogbWF0Y2hlc1NlbGVjdG9yKCBlbGVtZW50LCAnLnNlbGVjdG9yJyApXG4gKiBNSVQgbGljZW5zZVxuICovXG5cbi8qanNoaW50IGJyb3dzZXI6IHRydWUsIHN0cmljdDogdHJ1ZSwgdW5kZWY6IHRydWUsIHVudXNlZDogdHJ1ZSAqL1xuXG5cbihmdW5jdGlvbiAod2luZG93LCBmYWN0b3J5KSB7XG4gIC8qZ2xvYmFsIGRlZmluZTogZmFsc2UsIG1vZHVsZTogZmFsc2UgKi9cbiAgJ3VzZSBzdHJpY3QnOyAvLyB1bml2ZXJzYWwgbW9kdWxlIGRlZmluaXRpb25cblxuICBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTURcbiAgICBkZWZpbmUoJ2Rlc2FuZHJvLW1hdGNoZXMtc2VsZWN0b3IvbWF0Y2hlcy1zZWxlY3RvcicsIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgbW9kdWxlID09PSBcInVuZGVmaW5lZFwiID8gXCJ1bmRlZmluZWRcIiA6IF90eXBlb2YobW9kdWxlKSkgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9IGVsc2Uge1xuICAgIC8vIGJyb3dzZXIgZ2xvYmFsXG4gICAgd2luZG93Lm1hdGNoZXNTZWxlY3RvciA9IGZhY3RvcnkoKTtcbiAgfVxufSkod2luZG93LCBmdW5jdGlvbiBmYWN0b3J5KCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIG1hdGNoZXNNZXRob2QgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIEVsZW1Qcm90byA9IHdpbmRvdy5FbGVtZW50LnByb3RvdHlwZTsgLy8gY2hlY2sgZm9yIHRoZSBzdGFuZGFyZCBtZXRob2QgbmFtZSBmaXJzdFxuXG4gICAgaWYgKEVsZW1Qcm90by5tYXRjaGVzKSB7XG4gICAgICByZXR1cm4gJ21hdGNoZXMnO1xuICAgIH0gLy8gY2hlY2sgdW4tcHJlZml4ZWRcblxuXG4gICAgaWYgKEVsZW1Qcm90by5tYXRjaGVzU2VsZWN0b3IpIHtcbiAgICAgIHJldHVybiAnbWF0Y2hlc1NlbGVjdG9yJztcbiAgICB9IC8vIGNoZWNrIHZlbmRvciBwcmVmaXhlc1xuXG5cbiAgICB2YXIgcHJlZml4ZXMgPSBbJ3dlYmtpdCcsICdtb3onLCAnbXMnLCAnbyddO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHByZWZpeCA9IHByZWZpeGVzW2ldO1xuICAgICAgdmFyIG1ldGhvZCA9IHByZWZpeCArICdNYXRjaGVzU2VsZWN0b3InO1xuXG4gICAgICBpZiAoRWxlbVByb3RvW21ldGhvZF0pIHtcbiAgICAgICAgcmV0dXJuIG1ldGhvZDtcbiAgICAgIH1cbiAgICB9XG4gIH0oKTtcblxuICByZXR1cm4gZnVuY3Rpb24gbWF0Y2hlc1NlbGVjdG9yKGVsZW0sIHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGVsZW1bbWF0Y2hlc01ldGhvZF0oc2VsZWN0b3IpO1xuICB9O1xufSk7XG4vKipcbiAqIEZpenp5IFVJIHV0aWxzIHYyLjAuN1xuICogTUlUIGxpY2Vuc2VcbiAqL1xuXG4vKmpzaGludCBicm93c2VyOiB0cnVlLCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlLCBzdHJpY3Q6IHRydWUgKi9cblxuXG4oZnVuY3Rpb24gKHdpbmRvdywgZmFjdG9yeSkge1xuICAvLyB1bml2ZXJzYWwgbW9kdWxlIGRlZmluaXRpb25cblxuICAvKmpzaGludCBzdHJpY3Q6IGZhbHNlICovXG5cbiAgLypnbG9iYWxzIGRlZmluZSwgbW9kdWxlLCByZXF1aXJlICovXG4gIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRFxuICAgIGRlZmluZSgnZml6enktdWktdXRpbHMvdXRpbHMnLCBbJ2Rlc2FuZHJvLW1hdGNoZXMtc2VsZWN0b3IvbWF0Y2hlcy1zZWxlY3RvciddLCBmdW5jdGlvbiAobWF0Y2hlc1NlbGVjdG9yKSB7XG4gICAgICByZXR1cm4gZmFjdG9yeSh3aW5kb3csIG1hdGNoZXNTZWxlY3Rvcik7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBtb2R1bGUgPT09IFwidW5kZWZpbmVkXCIgPyBcInVuZGVmaW5lZFwiIDogX3R5cGVvZihtb2R1bGUpKSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHdpbmRvdywgcmVxdWlyZSgnZGVzYW5kcm8tbWF0Y2hlcy1zZWxlY3RvcicpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBicm93c2VyIGdsb2JhbFxuICAgIHdpbmRvdy5maXp6eVVJVXRpbHMgPSBmYWN0b3J5KHdpbmRvdywgd2luZG93Lm1hdGNoZXNTZWxlY3Rvcik7XG4gIH1cbn0pKHdpbmRvdywgZnVuY3Rpb24gZmFjdG9yeSh3aW5kb3csIG1hdGNoZXNTZWxlY3Rvcikge1xuICB2YXIgdXRpbHMgPSB7fTsgLy8gLS0tLS0gZXh0ZW5kIC0tLS0tIC8vXG4gIC8vIGV4dGVuZHMgb2JqZWN0c1xuXG4gIHV0aWxzLmV4dGVuZCA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgZm9yICh2YXIgcHJvcCBpbiBiKSB7XG4gICAgICBhW3Byb3BdID0gYltwcm9wXTtcbiAgICB9XG5cbiAgICByZXR1cm4gYTtcbiAgfTsgLy8gLS0tLS0gbW9kdWxvIC0tLS0tIC8vXG5cblxuICB1dGlscy5tb2R1bG8gPSBmdW5jdGlvbiAobnVtLCBkaXYpIHtcbiAgICByZXR1cm4gKG51bSAlIGRpdiArIGRpdikgJSBkaXY7XG4gIH07IC8vIC0tLS0tIG1ha2VBcnJheSAtLS0tLSAvL1xuXG5cbiAgdmFyIGFycmF5U2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7IC8vIHR1cm4gZWxlbWVudCBvciBub2RlTGlzdCBpbnRvIGFuIGFycmF5XG5cbiAgdXRpbHMubWFrZUFycmF5ID0gZnVuY3Rpb24gKG9iaikge1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICAgIC8vIHVzZSBvYmplY3QgaWYgYWxyZWFkeSBhbiBhcnJheVxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9IC8vIHJldHVybiBlbXB0eSBhcnJheSBpZiB1bmRlZmluZWQgb3IgbnVsbC4gIzZcblxuXG4gICAgaWYgKG9iaiA9PT0gbnVsbCB8fCBvYmogPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHZhciBpc0FycmF5TGlrZSA9IF90eXBlb2Yob2JqKSA9PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2JqLmxlbmd0aCA9PSAnbnVtYmVyJztcblxuICAgIGlmIChpc0FycmF5TGlrZSkge1xuICAgICAgLy8gY29udmVydCBub2RlTGlzdCB0byBhcnJheVxuICAgICAgcmV0dXJuIGFycmF5U2xpY2UuY2FsbChvYmopO1xuICAgIH0gLy8gYXJyYXkgb2Ygc2luZ2xlIGluZGV4XG5cblxuICAgIHJldHVybiBbb2JqXTtcbiAgfTsgLy8gLS0tLS0gcmVtb3ZlRnJvbSAtLS0tLSAvL1xuXG5cbiAgdXRpbHMucmVtb3ZlRnJvbSA9IGZ1bmN0aW9uIChhcnksIG9iaikge1xuICAgIHZhciBpbmRleCA9IGFyeS5pbmRleE9mKG9iaik7XG5cbiAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgIGFyeS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgfTsgLy8gLS0tLS0gZ2V0UGFyZW50IC0tLS0tIC8vXG5cblxuICB1dGlscy5nZXRQYXJlbnQgPSBmdW5jdGlvbiAoZWxlbSwgc2VsZWN0b3IpIHtcbiAgICB3aGlsZSAoZWxlbS5wYXJlbnROb2RlICYmIGVsZW0gIT0gZG9jdW1lbnQuYm9keSkge1xuICAgICAgZWxlbSA9IGVsZW0ucGFyZW50Tm9kZTtcblxuICAgICAgaWYgKG1hdGNoZXNTZWxlY3RvcihlbGVtLCBzZWxlY3RvcikpIHtcbiAgICAgICAgcmV0dXJuIGVsZW07XG4gICAgICB9XG4gICAgfVxuICB9OyAvLyAtLS0tLSBnZXRRdWVyeUVsZW1lbnQgLS0tLS0gLy9cbiAgLy8gdXNlIGVsZW1lbnQgYXMgc2VsZWN0b3Igc3RyaW5nXG5cblxuICB1dGlscy5nZXRRdWVyeUVsZW1lbnQgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgIGlmICh0eXBlb2YgZWxlbSA9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsZW07XG4gIH07IC8vIC0tLS0tIGhhbmRsZUV2ZW50IC0tLS0tIC8vXG4gIC8vIGVuYWJsZSAub250eXBlIHRvIHRyaWdnZXIgZnJvbSAuYWRkRXZlbnRMaXN0ZW5lciggZWxlbSwgJ3R5cGUnIClcblxuXG4gIHV0aWxzLmhhbmRsZUV2ZW50ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdmFyIG1ldGhvZCA9ICdvbicgKyBldmVudC50eXBlO1xuXG4gICAgaWYgKHRoaXNbbWV0aG9kXSkge1xuICAgICAgdGhpc1ttZXRob2RdKGV2ZW50KTtcbiAgICB9XG4gIH07IC8vIC0tLS0tIGZpbHRlckZpbmRFbGVtZW50cyAtLS0tLSAvL1xuXG5cbiAgdXRpbHMuZmlsdGVyRmluZEVsZW1lbnRzID0gZnVuY3Rpb24gKGVsZW1zLCBzZWxlY3Rvcikge1xuICAgIC8vIG1ha2UgYXJyYXkgb2YgZWxlbXNcbiAgICBlbGVtcyA9IHV0aWxzLm1ha2VBcnJheShlbGVtcyk7XG4gICAgdmFyIGZmRWxlbXMgPSBbXTtcbiAgICBlbGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAvLyBjaGVjayB0aGF0IGVsZW0gaXMgYW4gYWN0dWFsIGVsZW1lbnRcbiAgICAgIGlmICghKGVsZW0gaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSAvLyBhZGQgZWxlbSBpZiBubyBzZWxlY3RvclxuXG5cbiAgICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgICAgZmZFbGVtcy5wdXNoKGVsZW0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IC8vIGZpbHRlciAmIGZpbmQgaXRlbXMgaWYgd2UgaGF2ZSBhIHNlbGVjdG9yXG4gICAgICAvLyBmaWx0ZXJcblxuXG4gICAgICBpZiAobWF0Y2hlc1NlbGVjdG9yKGVsZW0sIHNlbGVjdG9yKSkge1xuICAgICAgICBmZkVsZW1zLnB1c2goZWxlbSk7XG4gICAgICB9IC8vIGZpbmQgY2hpbGRyZW5cblxuXG4gICAgICB2YXIgY2hpbGRFbGVtcyA9IGVsZW0ucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7IC8vIGNvbmNhdCBjaGlsZEVsZW1zIHRvIGZpbHRlckZvdW5kIGFycmF5XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRFbGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBmZkVsZW1zLnB1c2goY2hpbGRFbGVtc1tpXSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGZmRWxlbXM7XG4gIH07IC8vIC0tLS0tIGRlYm91bmNlTWV0aG9kIC0tLS0tIC8vXG5cblxuICB1dGlscy5kZWJvdW5jZU1ldGhvZCA9IGZ1bmN0aW9uIChfY2xhc3MsIG1ldGhvZE5hbWUsIHRocmVzaG9sZCkge1xuICAgIHRocmVzaG9sZCA9IHRocmVzaG9sZCB8fCAxMDA7IC8vIG9yaWdpbmFsIG1ldGhvZFxuXG4gICAgdmFyIG1ldGhvZCA9IF9jbGFzcy5wcm90b3R5cGVbbWV0aG9kTmFtZV07XG4gICAgdmFyIHRpbWVvdXROYW1lID0gbWV0aG9kTmFtZSArICdUaW1lb3V0JztcblxuICAgIF9jbGFzcy5wcm90b3R5cGVbbWV0aG9kTmFtZV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgdGltZW91dCA9IHRoaXNbdGltZW91dE5hbWVdO1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgIHRoaXNbdGltZW91dE5hbWVdID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1ldGhvZC5hcHBseShfdGhpcywgYXJncyk7XG4gICAgICAgIGRlbGV0ZSBfdGhpc1t0aW1lb3V0TmFtZV07XG4gICAgICB9LCB0aHJlc2hvbGQpO1xuICAgIH07XG4gIH07IC8vIC0tLS0tIGRvY1JlYWR5IC0tLS0tIC8vXG5cblxuICB1dGlscy5kb2NSZWFkeSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciByZWFkeVN0YXRlID0gZG9jdW1lbnQucmVhZHlTdGF0ZTtcblxuICAgIGlmIChyZWFkeVN0YXRlID09ICdjb21wbGV0ZScgfHwgcmVhZHlTdGF0ZSA9PSAnaW50ZXJhY3RpdmUnKSB7XG4gICAgICAvLyBkbyBhc3luYyB0byBhbGxvdyBmb3Igb3RoZXIgc2NyaXB0cyB0byBydW4uIG1ldGFmaXp6eS9mbGlja2l0eSM0NDFcbiAgICAgIHNldFRpbWVvdXQoY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgY2FsbGJhY2spO1xuICAgIH1cbiAgfTsgLy8gLS0tLS0gaHRtbEluaXQgLS0tLS0gLy9cbiAgLy8gaHR0cDovL2phbWVzcm9iZXJ0cy5uYW1lL2Jsb2cvMjAxMC8wMi8yMi9zdHJpbmctZnVuY3Rpb25zLWZvci1qYXZhc2NyaXB0LXRyaW0tdG8tY2FtZWwtY2FzZS10by1kYXNoZWQtYW5kLXRvLXVuZGVyc2NvcmUvXG5cblxuICB1dGlscy50b0Rhc2hlZCA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoLyguKShbQS1aXSkvZywgZnVuY3Rpb24gKG1hdGNoLCAkMSwgJDIpIHtcbiAgICAgIHJldHVybiAkMSArICctJyArICQyO1xuICAgIH0pLnRvTG93ZXJDYXNlKCk7XG4gIH07XG5cbiAgdmFyIGNvbnNvbGUgPSB3aW5kb3cuY29uc29sZTtcbiAgLyoqXG4gICAqIGFsbG93IHVzZXIgdG8gaW5pdGlhbGl6ZSBjbGFzc2VzIHZpYSBbZGF0YS1uYW1lc3BhY2VdIG9yIC5qcy1uYW1lc3BhY2UgY2xhc3NcbiAgICogaHRtbEluaXQoIFdpZGdldCwgJ3dpZGdldE5hbWUnIClcbiAgICogb3B0aW9ucyBhcmUgcGFyc2VkIGZyb20gZGF0YS1uYW1lc3BhY2Utb3B0aW9uc1xuICAgKi9cblxuICB1dGlscy5odG1sSW5pdCA9IGZ1bmN0aW9uIChXaWRnZXRDbGFzcywgbmFtZXNwYWNlKSB7XG4gICAgdXRpbHMuZG9jUmVhZHkoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGRhc2hlZE5hbWVzcGFjZSA9IHV0aWxzLnRvRGFzaGVkKG5hbWVzcGFjZSk7XG4gICAgICB2YXIgZGF0YUF0dHIgPSAnZGF0YS0nICsgZGFzaGVkTmFtZXNwYWNlO1xuICAgICAgdmFyIGRhdGFBdHRyRWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbJyArIGRhdGFBdHRyICsgJ10nKTtcbiAgICAgIHZhciBqc0Rhc2hFbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5qcy0nICsgZGFzaGVkTmFtZXNwYWNlKTtcbiAgICAgIHZhciBlbGVtcyA9IHV0aWxzLm1ha2VBcnJheShkYXRhQXR0ckVsZW1zKS5jb25jYXQodXRpbHMubWFrZUFycmF5KGpzRGFzaEVsZW1zKSk7XG4gICAgICB2YXIgZGF0YU9wdGlvbnNBdHRyID0gZGF0YUF0dHIgKyAnLW9wdGlvbnMnO1xuICAgICAgdmFyIGpRdWVyeSA9IHdpbmRvdy5qUXVlcnk7XG4gICAgICBlbGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIHZhciBhdHRyID0gZWxlbS5nZXRBdHRyaWJ1dGUoZGF0YUF0dHIpIHx8IGVsZW0uZ2V0QXR0cmlidXRlKGRhdGFPcHRpb25zQXR0cik7XG4gICAgICAgIHZhciBvcHRpb25zO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgb3B0aW9ucyA9IGF0dHIgJiYgSlNPTi5wYXJzZShhdHRyKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAvLyBsb2cgZXJyb3IsIGRvIG5vdCBpbml0aWFsaXplXG4gICAgICAgICAgaWYgKGNvbnNvbGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHBhcnNpbmcgJyArIGRhdGFBdHRyICsgJyBvbiAnICsgZWxlbS5jbGFzc05hbWUgKyAnOiAnICsgZXJyb3IpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSAvLyBpbml0aWFsaXplXG5cblxuICAgICAgICB2YXIgaW5zdGFuY2UgPSBuZXcgV2lkZ2V0Q2xhc3MoZWxlbSwgb3B0aW9ucyk7IC8vIG1ha2UgYXZhaWxhYmxlIHZpYSAkKCkuZGF0YSgnbmFtZXNwYWNlJylcblxuICAgICAgICBpZiAoalF1ZXJ5KSB7XG4gICAgICAgICAgalF1ZXJ5LmRhdGEoZWxlbSwgbmFtZXNwYWNlLCBpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9OyAvLyAtLS0tLSAgLS0tLS0gLy9cblxuXG4gIHJldHVybiB1dGlscztcbn0pOyAvLyBGbGlja2l0eS5DZWxsXG5cblxuKGZ1bmN0aW9uICh3aW5kb3csIGZhY3RvcnkpIHtcbiAgLy8gdW5pdmVyc2FsIG1vZHVsZSBkZWZpbml0aW9uXG5cbiAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EXG4gICAgZGVmaW5lKCdmbGlja2l0eS9qcy9jZWxsJywgWydnZXQtc2l6ZS9nZXQtc2l6ZSddLCBmdW5jdGlvbiAoZ2V0U2l6ZSkge1xuICAgICAgcmV0dXJuIGZhY3Rvcnkod2luZG93LCBnZXRTaXplKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIG1vZHVsZSA9PT0gXCJ1bmRlZmluZWRcIiA/IFwidW5kZWZpbmVkXCIgOiBfdHlwZW9mKG1vZHVsZSkpID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnkod2luZG93LCByZXF1aXJlKCdnZXQtc2l6ZScpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBicm93c2VyIGdsb2JhbFxuICAgIHdpbmRvdy5GbGlja2l0eSA9IHdpbmRvdy5GbGlja2l0eSB8fCB7fTtcbiAgICB3aW5kb3cuRmxpY2tpdHkuQ2VsbCA9IGZhY3Rvcnkod2luZG93LCB3aW5kb3cuZ2V0U2l6ZSk7XG4gIH1cbn0pKHdpbmRvdywgZnVuY3Rpb24gZmFjdG9yeSh3aW5kb3csIGdldFNpemUpIHtcbiAgZnVuY3Rpb24gQ2VsbChlbGVtLCBwYXJlbnQpIHtcbiAgICB0aGlzLmVsZW1lbnQgPSBlbGVtO1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMuY3JlYXRlKCk7XG4gIH1cblxuICB2YXIgcHJvdG8gPSBDZWxsLnByb3RvdHlwZTtcblxuICBwcm90by5jcmVhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgdGhpcy54ID0gMDtcbiAgICB0aGlzLnNoaWZ0ID0gMDtcbiAgfTtcblxuICBwcm90by5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIHJlc2V0IHN0eWxlXG4gICAgdGhpcy51bnNlbGVjdCgpO1xuICAgIHRoaXMuZWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9ICcnO1xuICAgIHZhciBzaWRlID0gdGhpcy5wYXJlbnQub3JpZ2luU2lkZTtcbiAgICB0aGlzLmVsZW1lbnQuc3R5bGVbc2lkZV0gPSAnJztcbiAgfTtcblxuICBwcm90by5nZXRTaXplID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2l6ZSA9IGdldFNpemUodGhpcy5lbGVtZW50KTtcbiAgfTtcblxuICBwcm90by5zZXRQb3NpdGlvbiA9IGZ1bmN0aW9uICh4KSB7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnVwZGF0ZVRhcmdldCgpO1xuICAgIHRoaXMucmVuZGVyUG9zaXRpb24oeCk7XG4gIH07IC8vIHNldERlZmF1bHRUYXJnZXQgdjEgbWV0aG9kLCBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSwgcmVtb3ZlIGluIHYzXG5cblxuICBwcm90by51cGRhdGVUYXJnZXQgPSBwcm90by5zZXREZWZhdWx0VGFyZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBtYXJnaW5Qcm9wZXJ0eSA9IHRoaXMucGFyZW50Lm9yaWdpblNpZGUgPT0gJ2xlZnQnID8gJ21hcmdpbkxlZnQnIDogJ21hcmdpblJpZ2h0JztcbiAgICB0aGlzLnRhcmdldCA9IHRoaXMueCArIHRoaXMuc2l6ZVttYXJnaW5Qcm9wZXJ0eV0gKyB0aGlzLnNpemUud2lkdGggKiB0aGlzLnBhcmVudC5jZWxsQWxpZ247XG4gIH07XG5cbiAgcHJvdG8ucmVuZGVyUG9zaXRpb24gPSBmdW5jdGlvbiAoeCkge1xuICAgIC8vIHJlbmRlciBwb3NpdGlvbiBvZiBjZWxsIHdpdGggaW4gc2xpZGVyXG4gICAgdmFyIHNpZGUgPSB0aGlzLnBhcmVudC5vcmlnaW5TaWRlO1xuICAgIHRoaXMuZWxlbWVudC5zdHlsZVtzaWRlXSA9IHRoaXMucGFyZW50LmdldFBvc2l0aW9uVmFsdWUoeCk7XG4gIH07XG5cbiAgcHJvdG8uc2VsZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdpcy1zZWxlY3RlZCcpO1xuICAgIHRoaXMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJyk7XG4gIH07XG5cbiAgcHJvdG8udW5zZWxlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXNlbGVjdGVkJyk7XG4gICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICB9O1xuICAvKipcbiAgICogQHBhcmFtIHtJbnRlZ2VyfSBmYWN0b3IgLSAwLCAxLCBvciAtMVxuICAqKi9cblxuXG4gIHByb3RvLndyYXBTaGlmdCA9IGZ1bmN0aW9uIChzaGlmdCkge1xuICAgIHRoaXMuc2hpZnQgPSBzaGlmdDtcbiAgICB0aGlzLnJlbmRlclBvc2l0aW9uKHRoaXMueCArIHRoaXMucGFyZW50LnNsaWRlYWJsZVdpZHRoICogc2hpZnQpO1xuICB9O1xuXG4gIHByb3RvLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICB9O1xuXG4gIHJldHVybiBDZWxsO1xufSk7IC8vIHNsaWRlXG5cblxuKGZ1bmN0aW9uICh3aW5kb3csIGZhY3RvcnkpIHtcbiAgLy8gdW5pdmVyc2FsIG1vZHVsZSBkZWZpbml0aW9uXG5cbiAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EXG4gICAgZGVmaW5lKCdmbGlja2l0eS9qcy9zbGlkZScsIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgbW9kdWxlID09PSBcInVuZGVmaW5lZFwiID8gXCJ1bmRlZmluZWRcIiA6IF90eXBlb2YobW9kdWxlKSkgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9IGVsc2Uge1xuICAgIC8vIGJyb3dzZXIgZ2xvYmFsXG4gICAgd2luZG93LkZsaWNraXR5ID0gd2luZG93LkZsaWNraXR5IHx8IHt9O1xuICAgIHdpbmRvdy5GbGlja2l0eS5TbGlkZSA9IGZhY3RvcnkoKTtcbiAgfVxufSkod2luZG93LCBmdW5jdGlvbiBmYWN0b3J5KCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgZnVuY3Rpb24gU2xpZGUocGFyZW50KSB7XG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5pc09yaWdpbkxlZnQgPSBwYXJlbnQub3JpZ2luU2lkZSA9PSAnbGVmdCc7XG4gICAgdGhpcy5jZWxscyA9IFtdO1xuICAgIHRoaXMub3V0ZXJXaWR0aCA9IDA7XG4gICAgdGhpcy5oZWlnaHQgPSAwO1xuICB9XG5cbiAgdmFyIHByb3RvID0gU2xpZGUucHJvdG90eXBlO1xuXG4gIHByb3RvLmFkZENlbGwgPSBmdW5jdGlvbiAoY2VsbCkge1xuICAgIHRoaXMuY2VsbHMucHVzaChjZWxsKTtcbiAgICB0aGlzLm91dGVyV2lkdGggKz0gY2VsbC5zaXplLm91dGVyV2lkdGg7XG4gICAgdGhpcy5oZWlnaHQgPSBNYXRoLm1heChjZWxsLnNpemUub3V0ZXJIZWlnaHQsIHRoaXMuaGVpZ2h0KTsgLy8gZmlyc3QgY2VsbCBzdHVmZlxuXG4gICAgaWYgKHRoaXMuY2VsbHMubGVuZ3RoID09IDEpIHtcbiAgICAgIHRoaXMueCA9IGNlbGwueDsgLy8geCBjb21lcyBmcm9tIGZpcnN0IGNlbGxcblxuICAgICAgdmFyIGJlZ2luTWFyZ2luID0gdGhpcy5pc09yaWdpbkxlZnQgPyAnbWFyZ2luTGVmdCcgOiAnbWFyZ2luUmlnaHQnO1xuICAgICAgdGhpcy5maXJzdE1hcmdpbiA9IGNlbGwuc2l6ZVtiZWdpbk1hcmdpbl07XG4gICAgfVxuICB9O1xuXG4gIHByb3RvLnVwZGF0ZVRhcmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZW5kTWFyZ2luID0gdGhpcy5pc09yaWdpbkxlZnQgPyAnbWFyZ2luUmlnaHQnIDogJ21hcmdpbkxlZnQnO1xuICAgIHZhciBsYXN0Q2VsbCA9IHRoaXMuZ2V0TGFzdENlbGwoKTtcbiAgICB2YXIgbGFzdE1hcmdpbiA9IGxhc3RDZWxsID8gbGFzdENlbGwuc2l6ZVtlbmRNYXJnaW5dIDogMDtcbiAgICB2YXIgc2xpZGVXaWR0aCA9IHRoaXMub3V0ZXJXaWR0aCAtICh0aGlzLmZpcnN0TWFyZ2luICsgbGFzdE1hcmdpbik7XG4gICAgdGhpcy50YXJnZXQgPSB0aGlzLnggKyB0aGlzLmZpcnN0TWFyZ2luICsgc2xpZGVXaWR0aCAqIHRoaXMucGFyZW50LmNlbGxBbGlnbjtcbiAgfTtcblxuICBwcm90by5nZXRMYXN0Q2VsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5jZWxsc1t0aGlzLmNlbGxzLmxlbmd0aCAtIDFdO1xuICB9O1xuXG4gIHByb3RvLnNlbGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmNlbGxzLmZvckVhY2goZnVuY3Rpb24gKGNlbGwpIHtcbiAgICAgIGNlbGwuc2VsZWN0KCk7XG4gICAgfSk7XG4gIH07XG5cbiAgcHJvdG8udW5zZWxlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5jZWxscy5mb3JFYWNoKGZ1bmN0aW9uIChjZWxsKSB7XG4gICAgICBjZWxsLnVuc2VsZWN0KCk7XG4gICAgfSk7XG4gIH07XG5cbiAgcHJvdG8uZ2V0Q2VsbEVsZW1lbnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmNlbGxzLm1hcChmdW5jdGlvbiAoY2VsbCkge1xuICAgICAgcmV0dXJuIGNlbGwuZWxlbWVudDtcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gU2xpZGU7XG59KTsgLy8gYW5pbWF0ZVxuXG5cbihmdW5jdGlvbiAod2luZG93LCBmYWN0b3J5KSB7XG4gIC8vIHVuaXZlcnNhbCBtb2R1bGUgZGVmaW5pdGlvblxuXG4gIC8qIGpzaGludCBzdHJpY3Q6IGZhbHNlICovXG4gIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRFxuICAgIGRlZmluZSgnZmxpY2tpdHkvanMvYW5pbWF0ZScsIFsnZml6enktdWktdXRpbHMvdXRpbHMnXSwgZnVuY3Rpb24gKHV0aWxzKSB7XG4gICAgICByZXR1cm4gZmFjdG9yeSh3aW5kb3csIHV0aWxzKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIG1vZHVsZSA9PT0gXCJ1bmRlZmluZWRcIiA/IFwidW5kZWZpbmVkXCIgOiBfdHlwZW9mKG1vZHVsZSkpID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnkod2luZG93LCByZXF1aXJlKCdmaXp6eS11aS11dGlscycpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBicm93c2VyIGdsb2JhbFxuICAgIHdpbmRvdy5GbGlja2l0eSA9IHdpbmRvdy5GbGlja2l0eSB8fCB7fTtcbiAgICB3aW5kb3cuRmxpY2tpdHkuYW5pbWF0ZVByb3RvdHlwZSA9IGZhY3Rvcnkod2luZG93LCB3aW5kb3cuZml6enlVSVV0aWxzKTtcbiAgfVxufSkod2luZG93LCBmdW5jdGlvbiBmYWN0b3J5KHdpbmRvdywgdXRpbHMpIHtcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gYW5pbWF0ZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuICB2YXIgcHJvdG8gPSB7fTtcblxuICBwcm90by5zdGFydEFuaW1hdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pc0FuaW1hdGluZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuaXNBbmltYXRpbmcgPSB0cnVlO1xuICAgIHRoaXMucmVzdGluZ0ZyYW1lcyA9IDA7XG4gICAgdGhpcy5hbmltYXRlKCk7XG4gIH07XG5cbiAgcHJvdG8uYW5pbWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmFwcGx5RHJhZ0ZvcmNlKCk7XG4gICAgdGhpcy5hcHBseVNlbGVjdGVkQXR0cmFjdGlvbigpO1xuICAgIHZhciBwcmV2aW91c1ggPSB0aGlzLng7XG4gICAgdGhpcy5pbnRlZ3JhdGVQaHlzaWNzKCk7XG4gICAgdGhpcy5wb3NpdGlvblNsaWRlcigpO1xuICAgIHRoaXMuc2V0dGxlKHByZXZpb3VzWCk7IC8vIGFuaW1hdGUgbmV4dCBmcmFtZVxuXG4gICAgaWYgKHRoaXMuaXNBbmltYXRpbmcpIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbiBhbmltYXRlRnJhbWUoKSB7XG4gICAgICAgIF90aGlzLmFuaW1hdGUoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICBwcm90by5wb3NpdGlvblNsaWRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgeCA9IHRoaXMueDsgLy8gd3JhcCBwb3NpdGlvbiBhcm91bmRcblxuICAgIGlmICh0aGlzLm9wdGlvbnMud3JhcEFyb3VuZCAmJiB0aGlzLmNlbGxzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHggPSB1dGlscy5tb2R1bG8oeCwgdGhpcy5zbGlkZWFibGVXaWR0aCk7XG4gICAgICB4ID0geCAtIHRoaXMuc2xpZGVhYmxlV2lkdGg7XG4gICAgICB0aGlzLnNoaWZ0V3JhcENlbGxzKHgpO1xuICAgIH1cblxuICAgIHRoaXMuc2V0VHJhbnNsYXRlWCh4LCB0aGlzLmlzQW5pbWF0aW5nKTtcbiAgICB0aGlzLmRpc3BhdGNoU2Nyb2xsRXZlbnQoKTtcbiAgfTtcblxuICBwcm90by5zZXRUcmFuc2xhdGVYID0gZnVuY3Rpb24gKHgsIGlzM2QpIHtcbiAgICB4ICs9IHRoaXMuY3Vyc29yUG9zaXRpb247IC8vIHJldmVyc2UgaWYgcmlnaHQtdG8tbGVmdCBhbmQgdXNpbmcgdHJhbnNmb3JtXG5cbiAgICB4ID0gdGhpcy5vcHRpb25zLnJpZ2h0VG9MZWZ0ID8gLXggOiB4O1xuICAgIHZhciB0cmFuc2xhdGVYID0gdGhpcy5nZXRQb3NpdGlvblZhbHVlKHgpOyAvLyB1c2UgM0QgdHJhbmZvcm1zIGZvciBoYXJkd2FyZSBhY2NlbGVyYXRpb24gb24gaU9TXG4gICAgLy8gYnV0IHVzZSAyRCB3aGVuIHNldHRsZWQsIGZvciBiZXR0ZXIgZm9udC1yZW5kZXJpbmdcblxuICAgIHRoaXMuc2xpZGVyLnN0eWxlLnRyYW5zZm9ybSA9IGlzM2QgPyAndHJhbnNsYXRlM2QoJyArIHRyYW5zbGF0ZVggKyAnLDAsMCknIDogJ3RyYW5zbGF0ZVgoJyArIHRyYW5zbGF0ZVggKyAnKSc7XG4gIH07XG5cbiAgcHJvdG8uZGlzcGF0Y2hTY3JvbGxFdmVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZmlyc3RTbGlkZSA9IHRoaXMuc2xpZGVzWzBdO1xuXG4gICAgaWYgKCFmaXJzdFNsaWRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHBvc2l0aW9uWCA9IC10aGlzLnggLSBmaXJzdFNsaWRlLnRhcmdldDtcbiAgICB2YXIgcHJvZ3Jlc3MgPSBwb3NpdGlvblggLyB0aGlzLnNsaWRlc1dpZHRoO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnc2Nyb2xsJywgbnVsbCwgW3Byb2dyZXNzLCBwb3NpdGlvblhdKTtcbiAgfTtcblxuICBwcm90by5wb3NpdGlvblNsaWRlckF0U2VsZWN0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmNlbGxzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMueCA9IC10aGlzLnNlbGVjdGVkU2xpZGUudGFyZ2V0O1xuICAgIHRoaXMudmVsb2NpdHkgPSAwOyAvLyBzdG9wIHdvYmJsZVxuXG4gICAgdGhpcy5wb3NpdGlvblNsaWRlcigpO1xuICB9O1xuXG4gIHByb3RvLmdldFBvc2l0aW9uVmFsdWUgPSBmdW5jdGlvbiAocG9zaXRpb24pIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLnBlcmNlbnRQb3NpdGlvbikge1xuICAgICAgLy8gcGVyY2VudCBwb3NpdGlvbiwgcm91bmQgdG8gMiBkaWdpdHMsIGxpa2UgMTIuMzQlXG4gICAgICByZXR1cm4gTWF0aC5yb3VuZChwb3NpdGlvbiAvIHRoaXMuc2l6ZS5pbm5lcldpZHRoICogMTAwMDApICogMC4wMSArICclJztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gcGl4ZWwgcG9zaXRpb25pbmdcbiAgICAgIHJldHVybiBNYXRoLnJvdW5kKHBvc2l0aW9uKSArICdweCc7XG4gICAgfVxuICB9O1xuXG4gIHByb3RvLnNldHRsZSA9IGZ1bmN0aW9uIChwcmV2aW91c1gpIHtcbiAgICAvLyBrZWVwIHRyYWNrIG9mIGZyYW1lcyB3aGVyZSB4IGhhc24ndCBtb3ZlZFxuICAgIGlmICghdGhpcy5pc1BvaW50ZXJEb3duICYmIE1hdGgucm91bmQodGhpcy54ICogMTAwKSA9PSBNYXRoLnJvdW5kKHByZXZpb3VzWCAqIDEwMCkpIHtcbiAgICAgIHRoaXMucmVzdGluZ0ZyYW1lcysrO1xuICAgIH0gLy8gc3RvcCBhbmltYXRpbmcgaWYgcmVzdGluZyBmb3IgMyBvciBtb3JlIGZyYW1lc1xuXG5cbiAgICBpZiAodGhpcy5yZXN0aW5nRnJhbWVzID4gMikge1xuICAgICAgdGhpcy5pc0FuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgZGVsZXRlIHRoaXMuaXNGcmVlU2Nyb2xsaW5nOyAvLyByZW5kZXIgcG9zaXRpb24gd2l0aCB0cmFuc2xhdGVYIHdoZW4gc2V0dGxlZFxuXG4gICAgICB0aGlzLnBvc2l0aW9uU2xpZGVyKCk7XG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3NldHRsZScsIG51bGwsIFt0aGlzLnNlbGVjdGVkSW5kZXhdKTtcbiAgICB9XG4gIH07XG5cbiAgcHJvdG8uc2hpZnRXcmFwQ2VsbHMgPSBmdW5jdGlvbiAoeCkge1xuICAgIC8vIHNoaWZ0IGJlZm9yZSBjZWxsc1xuICAgIHZhciBiZWZvcmVHYXAgPSB0aGlzLmN1cnNvclBvc2l0aW9uICsgeDtcblxuICAgIHRoaXMuX3NoaWZ0Q2VsbHModGhpcy5iZWZvcmVTaGlmdENlbGxzLCBiZWZvcmVHYXAsIC0xKTsgLy8gc2hpZnQgYWZ0ZXIgY2VsbHNcblxuXG4gICAgdmFyIGFmdGVyR2FwID0gdGhpcy5zaXplLmlubmVyV2lkdGggLSAoeCArIHRoaXMuc2xpZGVhYmxlV2lkdGggKyB0aGlzLmN1cnNvclBvc2l0aW9uKTtcblxuICAgIHRoaXMuX3NoaWZ0Q2VsbHModGhpcy5hZnRlclNoaWZ0Q2VsbHMsIGFmdGVyR2FwLCAxKTtcbiAgfTtcblxuICBwcm90by5fc2hpZnRDZWxscyA9IGZ1bmN0aW9uIChjZWxscywgZ2FwLCBzaGlmdCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2VsbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjZWxsID0gY2VsbHNbaV07XG4gICAgICB2YXIgY2VsbFNoaWZ0ID0gZ2FwID4gMCA/IHNoaWZ0IDogMDtcbiAgICAgIGNlbGwud3JhcFNoaWZ0KGNlbGxTaGlmdCk7XG4gICAgICBnYXAgLT0gY2VsbC5zaXplLm91dGVyV2lkdGg7XG4gICAgfVxuICB9O1xuXG4gIHByb3RvLl91bnNoaWZ0Q2VsbHMgPSBmdW5jdGlvbiAoY2VsbHMpIHtcbiAgICBpZiAoIWNlbGxzIHx8ICFjZWxscy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNlbGxzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjZWxsc1tpXS53cmFwU2hpZnQoMCk7XG4gICAgfVxuICB9OyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBwaHlzaWNzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cblxuICBwcm90by5pbnRlZ3JhdGVQaHlzaWNzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMueCArPSB0aGlzLnZlbG9jaXR5O1xuICAgIHRoaXMudmVsb2NpdHkgKj0gdGhpcy5nZXRGcmljdGlvbkZhY3RvcigpO1xuICB9O1xuXG4gIHByb3RvLmFwcGx5Rm9yY2UgPSBmdW5jdGlvbiAoZm9yY2UpIHtcbiAgICB0aGlzLnZlbG9jaXR5ICs9IGZvcmNlO1xuICB9O1xuXG4gIHByb3RvLmdldEZyaWN0aW9uRmFjdG9yID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAxIC0gdGhpcy5vcHRpb25zW3RoaXMuaXNGcmVlU2Nyb2xsaW5nID8gJ2ZyZWVTY3JvbGxGcmljdGlvbicgOiAnZnJpY3Rpb24nXTtcbiAgfTtcblxuICBwcm90by5nZXRSZXN0aW5nUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gbXkgdGhhbmtzIHRvIFN0ZXZlbiBXaXR0ZW5zLCB3aG8gc2ltcGxpZmllZCB0aGlzIG1hdGggZ3JlYXRseVxuICAgIHJldHVybiB0aGlzLnggKyB0aGlzLnZlbG9jaXR5IC8gKDEgLSB0aGlzLmdldEZyaWN0aW9uRmFjdG9yKCkpO1xuICB9O1xuXG4gIHByb3RvLmFwcGx5RHJhZ0ZvcmNlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5pc0RyYWdnYWJsZSB8fCAhdGhpcy5pc1BvaW50ZXJEb3duKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBjaGFuZ2UgdGhlIHBvc2l0aW9uIHRvIGRyYWcgcG9zaXRpb24gYnkgYXBwbHlpbmcgZm9yY2VcblxuXG4gICAgdmFyIGRyYWdWZWxvY2l0eSA9IHRoaXMuZHJhZ1ggLSB0aGlzLng7XG4gICAgdmFyIGRyYWdGb3JjZSA9IGRyYWdWZWxvY2l0eSAtIHRoaXMudmVsb2NpdHk7XG4gICAgdGhpcy5hcHBseUZvcmNlKGRyYWdGb3JjZSk7XG4gIH07XG5cbiAgcHJvdG8uYXBwbHlTZWxlY3RlZEF0dHJhY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gZG8gbm90IGF0dHJhY3QgaWYgcG9pbnRlciBkb3duIG9yIG5vIHNsaWRlc1xuICAgIHZhciBkcmFnRG93biA9IHRoaXMuaXNEcmFnZ2FibGUgJiYgdGhpcy5pc1BvaW50ZXJEb3duO1xuXG4gICAgaWYgKGRyYWdEb3duIHx8IHRoaXMuaXNGcmVlU2Nyb2xsaW5nIHx8ICF0aGlzLnNsaWRlcy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZGlzdGFuY2UgPSB0aGlzLnNlbGVjdGVkU2xpZGUudGFyZ2V0ICogLTEgLSB0aGlzLng7XG4gICAgdmFyIGZvcmNlID0gZGlzdGFuY2UgKiB0aGlzLm9wdGlvbnMuc2VsZWN0ZWRBdHRyYWN0aW9uO1xuICAgIHRoaXMuYXBwbHlGb3JjZShmb3JjZSk7XG4gIH07XG5cbiAgcmV0dXJuIHByb3RvO1xufSk7IC8vIEZsaWNraXR5IG1haW5cblxuXG4oZnVuY3Rpb24gKHdpbmRvdywgZmFjdG9yeSkge1xuICAvLyB1bml2ZXJzYWwgbW9kdWxlIGRlZmluaXRpb25cblxuICAvKiBqc2hpbnQgc3RyaWN0OiBmYWxzZSAqL1xuICBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTURcbiAgICBkZWZpbmUoJ2ZsaWNraXR5L2pzL2ZsaWNraXR5JywgWydldi1lbWl0dGVyL2V2LWVtaXR0ZXInLCAnZ2V0LXNpemUvZ2V0LXNpemUnLCAnZml6enktdWktdXRpbHMvdXRpbHMnLCAnLi9jZWxsJywgJy4vc2xpZGUnLCAnLi9hbmltYXRlJ10sIGZ1bmN0aW9uIChFdkVtaXR0ZXIsIGdldFNpemUsIHV0aWxzLCBDZWxsLCBTbGlkZSwgYW5pbWF0ZVByb3RvdHlwZSkge1xuICAgICAgcmV0dXJuIGZhY3Rvcnkod2luZG93LCBFdkVtaXR0ZXIsIGdldFNpemUsIHV0aWxzLCBDZWxsLCBTbGlkZSwgYW5pbWF0ZVByb3RvdHlwZSk7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBtb2R1bGUgPT09IFwidW5kZWZpbmVkXCIgPyBcInVuZGVmaW5lZFwiIDogX3R5cGVvZihtb2R1bGUpKSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHdpbmRvdywgcmVxdWlyZSgnZXYtZW1pdHRlcicpLCByZXF1aXJlKCdnZXQtc2l6ZScpLCByZXF1aXJlKCdmaXp6eS11aS11dGlscycpLCByZXF1aXJlKCcuL2NlbGwnKSwgcmVxdWlyZSgnLi9zbGlkZScpLCByZXF1aXJlKCcuL2FuaW1hdGUnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gYnJvd3NlciBnbG9iYWxcbiAgICB2YXIgX0ZsaWNraXR5ID0gd2luZG93LkZsaWNraXR5O1xuICAgIHdpbmRvdy5GbGlja2l0eSA9IGZhY3Rvcnkod2luZG93LCB3aW5kb3cuRXZFbWl0dGVyLCB3aW5kb3cuZ2V0U2l6ZSwgd2luZG93LmZpenp5VUlVdGlscywgX0ZsaWNraXR5LkNlbGwsIF9GbGlja2l0eS5TbGlkZSwgX0ZsaWNraXR5LmFuaW1hdGVQcm90b3R5cGUpO1xuICB9XG59KSh3aW5kb3csIGZ1bmN0aW9uIGZhY3Rvcnkod2luZG93LCBFdkVtaXR0ZXIsIGdldFNpemUsIHV0aWxzLCBDZWxsLCBTbGlkZSwgYW5pbWF0ZVByb3RvdHlwZSkge1xuICAvLyB2YXJzXG4gIHZhciBqUXVlcnkgPSB3aW5kb3cualF1ZXJ5O1xuICB2YXIgZ2V0Q29tcHV0ZWRTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlO1xuICB2YXIgY29uc29sZSA9IHdpbmRvdy5jb25zb2xlO1xuXG4gIGZ1bmN0aW9uIG1vdmVFbGVtZW50cyhlbGVtcywgdG9FbGVtKSB7XG4gICAgZWxlbXMgPSB1dGlscy5tYWtlQXJyYXkoZWxlbXMpO1xuXG4gICAgd2hpbGUgKGVsZW1zLmxlbmd0aCkge1xuICAgICAgdG9FbGVtLmFwcGVuZENoaWxkKGVsZW1zLnNoaWZ0KCkpO1xuICAgIH1cbiAgfSAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBGbGlja2l0eSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuICAvLyBnbG9iYWxseSB1bmlxdWUgaWRlbnRpZmllcnNcblxuXG4gIHZhciBHVUlEID0gMDsgLy8gaW50ZXJuYWwgc3RvcmUgb2YgYWxsIEZsaWNraXR5IGludGFuY2VzXG5cbiAgdmFyIGluc3RhbmNlcyA9IHt9O1xuXG4gIGZ1bmN0aW9uIEZsaWNraXR5KGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB2YXIgcXVlcnlFbGVtZW50ID0gdXRpbHMuZ2V0UXVlcnlFbGVtZW50KGVsZW1lbnQpO1xuXG4gICAgaWYgKCFxdWVyeUVsZW1lbnQpIHtcbiAgICAgIGlmIChjb25zb2xlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0JhZCBlbGVtZW50IGZvciBGbGlja2l0eTogJyArIChxdWVyeUVsZW1lbnQgfHwgZWxlbWVudCkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5lbGVtZW50ID0gcXVlcnlFbGVtZW50OyAvLyBkbyBub3QgaW5pdGlhbGl6ZSB0d2ljZSBvbiBzYW1lIGVsZW1lbnRcblxuICAgIGlmICh0aGlzLmVsZW1lbnQuZmxpY2tpdHlHVUlEKSB7XG4gICAgICB2YXIgaW5zdGFuY2UgPSBpbnN0YW5jZXNbdGhpcy5lbGVtZW50LmZsaWNraXR5R1VJRF07XG4gICAgICBpbnN0YW5jZS5vcHRpb24ob3B0aW9ucyk7XG4gICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfSAvLyBhZGQgalF1ZXJ5XG5cblxuICAgIGlmIChqUXVlcnkpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQgPSBqUXVlcnkodGhpcy5lbGVtZW50KTtcbiAgICB9IC8vIG9wdGlvbnNcblxuXG4gICAgdGhpcy5vcHRpb25zID0gdXRpbHMuZXh0ZW5kKHt9LCB0aGlzLmNvbnN0cnVjdG9yLmRlZmF1bHRzKTtcbiAgICB0aGlzLm9wdGlvbihvcHRpb25zKTsgLy8ga2ljayB0aGluZ3Mgb2ZmXG5cbiAgICB0aGlzLl9jcmVhdGUoKTtcbiAgfVxuXG4gIEZsaWNraXR5LmRlZmF1bHRzID0ge1xuICAgIGFjY2Vzc2liaWxpdHk6IHRydWUsXG4gICAgLy8gYWRhcHRpdmVIZWlnaHQ6IGZhbHNlLFxuICAgIGNlbGxBbGlnbjogJ2NlbnRlcicsXG4gICAgLy8gY2VsbFNlbGVjdG9yOiB1bmRlZmluZWQsXG4gICAgLy8gY29udGFpbjogZmFsc2UsXG4gICAgZnJlZVNjcm9sbEZyaWN0aW9uOiAwLjA3NSxcbiAgICAvLyBmcmljdGlvbiB3aGVuIGZyZWUtc2Nyb2xsaW5nXG4gICAgZnJpY3Rpb246IDAuMjgsXG4gICAgLy8gZnJpY3Rpb24gd2hlbiBzZWxlY3RpbmdcbiAgICBuYW1lc3BhY2VKUXVlcnlFdmVudHM6IHRydWUsXG4gICAgLy8gaW5pdGlhbEluZGV4OiAwLFxuICAgIHBlcmNlbnRQb3NpdGlvbjogdHJ1ZSxcbiAgICByZXNpemU6IHRydWUsXG4gICAgc2VsZWN0ZWRBdHRyYWN0aW9uOiAwLjAyNSxcbiAgICBzZXRHYWxsZXJ5U2l6ZTogdHJ1ZSAvLyB3YXRjaENTUzogZmFsc2UsXG4gICAgLy8gd3JhcEFyb3VuZDogZmFsc2VcblxuICB9OyAvLyBoYXNoIG9mIG1ldGhvZHMgdHJpZ2dlcmVkIG9uIF9jcmVhdGUoKVxuXG4gIEZsaWNraXR5LmNyZWF0ZU1ldGhvZHMgPSBbXTtcbiAgdmFyIHByb3RvID0gRmxpY2tpdHkucHJvdG90eXBlOyAvLyBpbmhlcml0IEV2ZW50RW1pdHRlclxuXG4gIHV0aWxzLmV4dGVuZChwcm90bywgRXZFbWl0dGVyLnByb3RvdHlwZSk7XG5cbiAgcHJvdG8uX2NyZWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBhZGQgaWQgZm9yIEZsaWNraXR5LmRhdGFcbiAgICB2YXIgaWQgPSB0aGlzLmd1aWQgPSArK0dVSUQ7XG4gICAgdGhpcy5lbGVtZW50LmZsaWNraXR5R1VJRCA9IGlkOyAvLyBleHBhbmRvXG5cbiAgICBpbnN0YW5jZXNbaWRdID0gdGhpczsgLy8gYXNzb2NpYXRlIHZpYSBpZFxuICAgIC8vIGluaXRpYWwgcHJvcGVydGllc1xuXG4gICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gMDsgLy8gaG93IG1hbnkgZnJhbWVzIHNsaWRlciBoYXMgYmVlbiBpbiBzYW1lIHBvc2l0aW9uXG5cbiAgICB0aGlzLnJlc3RpbmdGcmFtZXMgPSAwOyAvLyBpbml0aWFsIHBoeXNpY3MgcHJvcGVydGllc1xuXG4gICAgdGhpcy54ID0gMDtcbiAgICB0aGlzLnZlbG9jaXR5ID0gMDtcbiAgICB0aGlzLm9yaWdpblNpZGUgPSB0aGlzLm9wdGlvbnMucmlnaHRUb0xlZnQgPyAncmlnaHQnIDogJ2xlZnQnOyAvLyBjcmVhdGUgdmlld3BvcnQgJiBzbGlkZXJcblxuICAgIHRoaXMudmlld3BvcnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLnZpZXdwb3J0LmNsYXNzTmFtZSA9ICdmbGlja2l0eS12aWV3cG9ydCc7XG5cbiAgICB0aGlzLl9jcmVhdGVTbGlkZXIoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMucmVzaXplIHx8IHRoaXMub3B0aW9ucy53YXRjaENTUykge1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMpO1xuICAgIH0gLy8gYWRkIGxpc3RlbmVycyBmcm9tIG9uIG9wdGlvblxuXG5cbiAgICBmb3IgKHZhciBldmVudE5hbWUgaW4gdGhpcy5vcHRpb25zLm9uKSB7XG4gICAgICB2YXIgbGlzdGVuZXIgPSB0aGlzLm9wdGlvbnMub25bZXZlbnROYW1lXTtcbiAgICAgIHRoaXMub24oZXZlbnROYW1lLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgRmxpY2tpdHkuY3JlYXRlTWV0aG9kcy5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICAgIHRoaXNbbWV0aG9kXSgpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy53YXRjaENTUykge1xuICAgICAgdGhpcy53YXRjaENTUygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFjdGl2YXRlKCk7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogc2V0IG9wdGlvbnNcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHNcbiAgICovXG5cblxuICBwcm90by5vcHRpb24gPSBmdW5jdGlvbiAob3B0cykge1xuICAgIHV0aWxzLmV4dGVuZCh0aGlzLm9wdGlvbnMsIG9wdHMpO1xuICB9O1xuXG4gIHByb3RvLmFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2ZsaWNraXR5LWVuYWJsZWQnKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMucmlnaHRUb0xlZnQpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdmbGlja2l0eS1ydGwnKTtcbiAgICB9XG5cbiAgICB0aGlzLmdldFNpemUoKTsgLy8gbW92ZSBpbml0aWFsIGNlbGwgZWxlbWVudHMgc28gdGhleSBjYW4gYmUgbG9hZGVkIGFzIGNlbGxzXG5cbiAgICB2YXIgY2VsbEVsZW1zID0gdGhpcy5fZmlsdGVyRmluZENlbGxFbGVtZW50cyh0aGlzLmVsZW1lbnQuY2hpbGRyZW4pO1xuXG4gICAgbW92ZUVsZW1lbnRzKGNlbGxFbGVtcywgdGhpcy5zbGlkZXIpO1xuICAgIHRoaXMudmlld3BvcnQuYXBwZW5kQ2hpbGQodGhpcy5zbGlkZXIpO1xuICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLnZpZXdwb3J0KTsgLy8gZ2V0IGNlbGxzIGZyb20gY2hpbGRyZW5cblxuICAgIHRoaXMucmVsb2FkQ2VsbHMoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzaWJpbGl0eSkge1xuICAgICAgLy8gYWxsb3cgZWxlbWVudCB0byBmb2N1c2FibGVcbiAgICAgIHRoaXMuZWxlbWVudC50YWJJbmRleCA9IDA7IC8vIGxpc3RlbiBmb3Iga2V5IHByZXNzZXNcblxuICAgICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzKTtcbiAgICB9XG5cbiAgICB0aGlzLmVtaXRFdmVudCgnYWN0aXZhdGUnKTtcbiAgICB0aGlzLnNlbGVjdEluaXRpYWxJbmRleCgpOyAvLyBmbGFnIGZvciBpbml0aWFsIGFjdGl2YXRpb24sIGZvciB1c2luZyBpbml0aWFsSW5kZXhcblxuICAgIHRoaXMuaXNJbml0QWN0aXZhdGVkID0gdHJ1ZTsgLy8gcmVhZHkgZXZlbnQuICM0OTNcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgncmVhZHknKTtcbiAgfTsgLy8gc2xpZGVyIHBvc2l0aW9ucyB0aGUgY2VsbHNcblxuXG4gIHByb3RvLl9jcmVhdGVTbGlkZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gc2xpZGVyIGVsZW1lbnQgZG9lcyBhbGwgdGhlIHBvc2l0aW9uaW5nXG4gICAgdmFyIHNsaWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHNsaWRlci5jbGFzc05hbWUgPSAnZmxpY2tpdHktc2xpZGVyJztcbiAgICBzbGlkZXIuc3R5bGVbdGhpcy5vcmlnaW5TaWRlXSA9IDA7XG4gICAgdGhpcy5zbGlkZXIgPSBzbGlkZXI7XG4gIH07XG5cbiAgcHJvdG8uX2ZpbHRlckZpbmRDZWxsRWxlbWVudHMgPSBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICByZXR1cm4gdXRpbHMuZmlsdGVyRmluZEVsZW1lbnRzKGVsZW1zLCB0aGlzLm9wdGlvbnMuY2VsbFNlbGVjdG9yKTtcbiAgfTsgLy8gZ29lcyB0aHJvdWdoIGFsbCBjaGlsZHJlblxuXG5cbiAgcHJvdG8ucmVsb2FkQ2VsbHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY29sbGVjdGlvbiBvZiBpdGVtIGVsZW1lbnRzXG4gICAgdGhpcy5jZWxscyA9IHRoaXMuX21ha2VDZWxscyh0aGlzLnNsaWRlci5jaGlsZHJlbik7XG4gICAgdGhpcy5wb3NpdGlvbkNlbGxzKCk7XG5cbiAgICB0aGlzLl9nZXRXcmFwU2hpZnRDZWxscygpO1xuXG4gICAgdGhpcy5zZXRHYWxsZXJ5U2l6ZSgpO1xuICB9O1xuICAvKipcbiAgICogdHVybiBlbGVtZW50cyBpbnRvIEZsaWNraXR5LkNlbGxzXG4gICAqIEBwYXJhbSB7QXJyYXkgb3IgTm9kZUxpc3Qgb3IgSFRNTEVsZW1lbnR9IGVsZW1zXG4gICAqIEByZXR1cm5zIHtBcnJheX0gaXRlbXMgLSBjb2xsZWN0aW9uIG9mIG5ldyBGbGlja2l0eSBDZWxsc1xuICAgKi9cblxuXG4gIHByb3RvLl9tYWtlQ2VsbHMgPSBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICB2YXIgY2VsbEVsZW1zID0gdGhpcy5fZmlsdGVyRmluZENlbGxFbGVtZW50cyhlbGVtcyk7IC8vIGNyZWF0ZSBuZXcgRmxpY2tpdHkgZm9yIGNvbGxlY3Rpb25cblxuXG4gICAgdmFyIGNlbGxzID0gY2VsbEVsZW1zLm1hcChmdW5jdGlvbiAoY2VsbEVsZW0pIHtcbiAgICAgIHJldHVybiBuZXcgQ2VsbChjZWxsRWxlbSwgdGhpcyk7XG4gICAgfSwgdGhpcyk7XG4gICAgcmV0dXJuIGNlbGxzO1xuICB9O1xuXG4gIHByb3RvLmdldExhc3RDZWxsID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmNlbGxzW3RoaXMuY2VsbHMubGVuZ3RoIC0gMV07XG4gIH07XG5cbiAgcHJvdG8uZ2V0TGFzdFNsaWRlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnNsaWRlc1t0aGlzLnNsaWRlcy5sZW5ndGggLSAxXTtcbiAgfTsgLy8gcG9zaXRpb25zIGFsbCBjZWxsc1xuXG5cbiAgcHJvdG8ucG9zaXRpb25DZWxscyA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBzaXplIGFsbCBjZWxsc1xuICAgIHRoaXMuX3NpemVDZWxscyh0aGlzLmNlbGxzKTsgLy8gcG9zaXRpb24gYWxsIGNlbGxzXG5cblxuICAgIHRoaXMuX3Bvc2l0aW9uQ2VsbHMoMCk7XG4gIH07XG4gIC8qKlxuICAgKiBwb3NpdGlvbiBjZXJ0YWluIGNlbGxzXG4gICAqIEBwYXJhbSB7SW50ZWdlcn0gaW5kZXggLSB3aGljaCBjZWxsIHRvIHN0YXJ0IHdpdGhcbiAgICovXG5cblxuICBwcm90by5fcG9zaXRpb25DZWxscyA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgIGluZGV4ID0gaW5kZXggfHwgMDsgLy8gYWxzbyBtZWFzdXJlIG1heENlbGxIZWlnaHRcbiAgICAvLyBzdGFydCAwIGlmIHBvc2l0aW9uaW5nIGFsbCBjZWxsc1xuXG4gICAgdGhpcy5tYXhDZWxsSGVpZ2h0ID0gaW5kZXggPyB0aGlzLm1heENlbGxIZWlnaHQgfHwgMCA6IDA7XG4gICAgdmFyIGNlbGxYID0gMDsgLy8gZ2V0IGNlbGxYXG5cbiAgICBpZiAoaW5kZXggPiAwKSB7XG4gICAgICB2YXIgc3RhcnRDZWxsID0gdGhpcy5jZWxsc1tpbmRleCAtIDFdO1xuICAgICAgY2VsbFggPSBzdGFydENlbGwueCArIHN0YXJ0Q2VsbC5zaXplLm91dGVyV2lkdGg7XG4gICAgfVxuXG4gICAgdmFyIGxlbiA9IHRoaXMuY2VsbHMubGVuZ3RoO1xuXG4gICAgZm9yICh2YXIgaSA9IGluZGV4OyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZhciBjZWxsID0gdGhpcy5jZWxsc1tpXTtcbiAgICAgIGNlbGwuc2V0UG9zaXRpb24oY2VsbFgpO1xuICAgICAgY2VsbFggKz0gY2VsbC5zaXplLm91dGVyV2lkdGg7XG4gICAgICB0aGlzLm1heENlbGxIZWlnaHQgPSBNYXRoLm1heChjZWxsLnNpemUub3V0ZXJIZWlnaHQsIHRoaXMubWF4Q2VsbEhlaWdodCk7XG4gICAgfSAvLyBrZWVwIHRyYWNrIG9mIGNlbGxYIGZvciB3cmFwLWFyb3VuZFxuXG5cbiAgICB0aGlzLnNsaWRlYWJsZVdpZHRoID0gY2VsbFg7IC8vIHNsaWRlc1xuXG4gICAgdGhpcy51cGRhdGVTbGlkZXMoKTsgLy8gY29udGFpbiBzbGlkZXMgdGFyZ2V0XG5cbiAgICB0aGlzLl9jb250YWluU2xpZGVzKCk7IC8vIHVwZGF0ZSBzbGlkZXNXaWR0aFxuXG5cbiAgICB0aGlzLnNsaWRlc1dpZHRoID0gbGVuID8gdGhpcy5nZXRMYXN0U2xpZGUoKS50YXJnZXQgLSB0aGlzLnNsaWRlc1swXS50YXJnZXQgOiAwO1xuICB9O1xuICAvKipcbiAgICogY2VsbC5nZXRTaXplKCkgb24gbXVsdGlwbGUgY2VsbHNcbiAgICogQHBhcmFtIHtBcnJheX0gY2VsbHNcbiAgICovXG5cblxuICBwcm90by5fc2l6ZUNlbGxzID0gZnVuY3Rpb24gKGNlbGxzKSB7XG4gICAgY2VsbHMuZm9yRWFjaChmdW5jdGlvbiAoY2VsbCkge1xuICAgICAgY2VsbC5nZXRTaXplKCk7XG4gICAgfSk7XG4gIH07IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG5cbiAgcHJvdG8udXBkYXRlU2xpZGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2xpZGVzID0gW107XG5cbiAgICBpZiAoIXRoaXMuY2VsbHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHNsaWRlID0gbmV3IFNsaWRlKHRoaXMpO1xuICAgIHRoaXMuc2xpZGVzLnB1c2goc2xpZGUpO1xuICAgIHZhciBpc09yaWdpbkxlZnQgPSB0aGlzLm9yaWdpblNpZGUgPT0gJ2xlZnQnO1xuICAgIHZhciBuZXh0TWFyZ2luID0gaXNPcmlnaW5MZWZ0ID8gJ21hcmdpblJpZ2h0JyA6ICdtYXJnaW5MZWZ0JztcblxuICAgIHZhciBjYW5DZWxsRml0ID0gdGhpcy5fZ2V0Q2FuQ2VsbEZpdCgpO1xuXG4gICAgdGhpcy5jZWxscy5mb3JFYWNoKGZ1bmN0aW9uIChjZWxsLCBpKSB7XG4gICAgICAvLyBqdXN0IGFkZCBjZWxsIGlmIGZpcnN0IGNlbGwgaW4gc2xpZGVcbiAgICAgIGlmICghc2xpZGUuY2VsbHMubGVuZ3RoKSB7XG4gICAgICAgIHNsaWRlLmFkZENlbGwoY2VsbCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHNsaWRlV2lkdGggPSBzbGlkZS5vdXRlcldpZHRoIC0gc2xpZGUuZmlyc3RNYXJnaW4gKyAoY2VsbC5zaXplLm91dGVyV2lkdGggLSBjZWxsLnNpemVbbmV4dE1hcmdpbl0pO1xuXG4gICAgICBpZiAoY2FuQ2VsbEZpdC5jYWxsKHRoaXMsIGksIHNsaWRlV2lkdGgpKSB7XG4gICAgICAgIHNsaWRlLmFkZENlbGwoY2VsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBkb2Vzbid0IGZpdCwgbmV3IHNsaWRlXG4gICAgICAgIHNsaWRlLnVwZGF0ZVRhcmdldCgpO1xuICAgICAgICBzbGlkZSA9IG5ldyBTbGlkZSh0aGlzKTtcbiAgICAgICAgdGhpcy5zbGlkZXMucHVzaChzbGlkZSk7XG4gICAgICAgIHNsaWRlLmFkZENlbGwoY2VsbCk7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7IC8vIGxhc3Qgc2xpZGVcblxuICAgIHNsaWRlLnVwZGF0ZVRhcmdldCgpOyAvLyB1cGRhdGUgLnNlbGVjdGVkU2xpZGVcblxuICAgIHRoaXMudXBkYXRlU2VsZWN0ZWRTbGlkZSgpO1xuICB9O1xuXG4gIHByb3RvLl9nZXRDYW5DZWxsRml0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBncm91cENlbGxzID0gdGhpcy5vcHRpb25zLmdyb3VwQ2VsbHM7XG5cbiAgICBpZiAoIWdyb3VwQ2VsbHMpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZ3JvdXBDZWxscyA9PSAnbnVtYmVyJykge1xuICAgICAgLy8gZ3JvdXAgYnkgbnVtYmVyLiAzIC0+IFswLDEsMl0sIFszLDQsNV0sIC4uLlxuICAgICAgdmFyIG51bWJlciA9IHBhcnNlSW50KGdyb3VwQ2VsbHMsIDEwKTtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoaSkge1xuICAgICAgICByZXR1cm4gaSAlIG51bWJlciAhPT0gMDtcbiAgICAgIH07XG4gICAgfSAvLyBkZWZhdWx0LCBncm91cCBieSB3aWR0aCBvZiBzbGlkZVxuICAgIC8vIHBhcnNlICc3NSVcblxuXG4gICAgdmFyIHBlcmNlbnRNYXRjaCA9IHR5cGVvZiBncm91cENlbGxzID09ICdzdHJpbmcnICYmIGdyb3VwQ2VsbHMubWF0Y2goL14oXFxkKyklJC8pO1xuICAgIHZhciBwZXJjZW50ID0gcGVyY2VudE1hdGNoID8gcGFyc2VJbnQocGVyY2VudE1hdGNoWzFdLCAxMCkgLyAxMDAgOiAxO1xuICAgIHJldHVybiBmdW5jdGlvbiAoaSwgc2xpZGVXaWR0aCkge1xuICAgICAgcmV0dXJuIHNsaWRlV2lkdGggPD0gKHRoaXMuc2l6ZS5pbm5lcldpZHRoICsgMSkgKiBwZXJjZW50O1xuICAgIH07XG4gIH07IC8vIGFsaWFzIF9pbml0IGZvciBqUXVlcnkgcGx1Z2luIC5mbGlja2l0eSgpXG5cblxuICBwcm90by5faW5pdCA9IHByb3RvLnJlcG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wb3NpdGlvbkNlbGxzKCk7XG4gICAgdGhpcy5wb3NpdGlvblNsaWRlckF0U2VsZWN0ZWQoKTtcbiAgfTtcblxuICBwcm90by5nZXRTaXplID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2l6ZSA9IGdldFNpemUodGhpcy5lbGVtZW50KTtcbiAgICB0aGlzLnNldENlbGxBbGlnbigpO1xuICAgIHRoaXMuY3Vyc29yUG9zaXRpb24gPSB0aGlzLnNpemUuaW5uZXJXaWR0aCAqIHRoaXMuY2VsbEFsaWduO1xuICB9O1xuXG4gIHZhciBjZWxsQWxpZ25TaG9ydGhhbmRzID0ge1xuICAgIC8vIGNlbGwgYWxpZ24sIHRoZW4gYmFzZWQgb24gb3JpZ2luIHNpZGVcbiAgICBjZW50ZXI6IHtcbiAgICAgIGxlZnQ6IDAuNSxcbiAgICAgIHJpZ2h0OiAwLjVcbiAgICB9LFxuICAgIGxlZnQ6IHtcbiAgICAgIGxlZnQ6IDAsXG4gICAgICByaWdodDogMVxuICAgIH0sXG4gICAgcmlnaHQ6IHtcbiAgICAgIHJpZ2h0OiAwLFxuICAgICAgbGVmdDogMVxuICAgIH1cbiAgfTtcblxuICBwcm90by5zZXRDZWxsQWxpZ24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNob3J0aGFuZCA9IGNlbGxBbGlnblNob3J0aGFuZHNbdGhpcy5vcHRpb25zLmNlbGxBbGlnbl07XG4gICAgdGhpcy5jZWxsQWxpZ24gPSBzaG9ydGhhbmQgPyBzaG9ydGhhbmRbdGhpcy5vcmlnaW5TaWRlXSA6IHRoaXMub3B0aW9ucy5jZWxsQWxpZ247XG4gIH07XG5cbiAgcHJvdG8uc2V0R2FsbGVyeVNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zZXRHYWxsZXJ5U2l6ZSkge1xuICAgICAgdmFyIGhlaWdodCA9IHRoaXMub3B0aW9ucy5hZGFwdGl2ZUhlaWdodCAmJiB0aGlzLnNlbGVjdGVkU2xpZGUgPyB0aGlzLnNlbGVjdGVkU2xpZGUuaGVpZ2h0IDogdGhpcy5tYXhDZWxsSGVpZ2h0O1xuICAgICAgdGhpcy52aWV3cG9ydC5zdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyAncHgnO1xuICAgIH1cbiAgfTtcblxuICBwcm90by5fZ2V0V3JhcFNoaWZ0Q2VsbHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gb25seSBmb3Igd3JhcC1hcm91bmRcbiAgICBpZiAoIXRoaXMub3B0aW9ucy53cmFwQXJvdW5kKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyB1bnNoaWZ0IHByZXZpb3VzIGNlbGxzXG5cblxuICAgIHRoaXMuX3Vuc2hpZnRDZWxscyh0aGlzLmJlZm9yZVNoaWZ0Q2VsbHMpO1xuXG4gICAgdGhpcy5fdW5zaGlmdENlbGxzKHRoaXMuYWZ0ZXJTaGlmdENlbGxzKTsgLy8gZ2V0IGJlZm9yZSBjZWxsc1xuICAgIC8vIGluaXRpYWwgZ2FwXG5cblxuICAgIHZhciBnYXBYID0gdGhpcy5jdXJzb3JQb3NpdGlvbjtcbiAgICB2YXIgY2VsbEluZGV4ID0gdGhpcy5jZWxscy5sZW5ndGggLSAxO1xuICAgIHRoaXMuYmVmb3JlU2hpZnRDZWxscyA9IHRoaXMuX2dldEdhcENlbGxzKGdhcFgsIGNlbGxJbmRleCwgLTEpOyAvLyBnZXQgYWZ0ZXIgY2VsbHNcbiAgICAvLyBlbmRpbmcgZ2FwIGJldHdlZW4gbGFzdCBjZWxsIGFuZCBlbmQgb2YgZ2FsbGVyeSB2aWV3cG9ydFxuXG4gICAgZ2FwWCA9IHRoaXMuc2l6ZS5pbm5lcldpZHRoIC0gdGhpcy5jdXJzb3JQb3NpdGlvbjsgLy8gc3RhcnQgY2xvbmluZyBhdCBmaXJzdCBjZWxsLCB3b3JraW5nIGZvcndhcmRzXG5cbiAgICB0aGlzLmFmdGVyU2hpZnRDZWxscyA9IHRoaXMuX2dldEdhcENlbGxzKGdhcFgsIDAsIDEpO1xuICB9O1xuXG4gIHByb3RvLl9nZXRHYXBDZWxscyA9IGZ1bmN0aW9uIChnYXBYLCBjZWxsSW5kZXgsIGluY3JlbWVudCkge1xuICAgIC8vIGtlZXAgYWRkaW5nIGNlbGxzIHVudGlsIHRoZSBjb3ZlciB0aGUgaW5pdGlhbCBnYXBcbiAgICB2YXIgY2VsbHMgPSBbXTtcblxuICAgIHdoaWxlIChnYXBYID4gMCkge1xuICAgICAgdmFyIGNlbGwgPSB0aGlzLmNlbGxzW2NlbGxJbmRleF07XG5cbiAgICAgIGlmICghY2VsbCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY2VsbHMucHVzaChjZWxsKTtcbiAgICAgIGNlbGxJbmRleCArPSBpbmNyZW1lbnQ7XG4gICAgICBnYXBYIC09IGNlbGwuc2l6ZS5vdXRlcldpZHRoO1xuICAgIH1cblxuICAgIHJldHVybiBjZWxscztcbiAgfTsgLy8gLS0tLS0gY29udGFpbiAtLS0tLSAvL1xuICAvLyBjb250YWluIGNlbGwgdGFyZ2V0cyBzbyBubyBleGNlc3Mgc2xpZGluZ1xuXG5cbiAgcHJvdG8uX2NvbnRhaW5TbGlkZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuY29udGFpbiB8fCB0aGlzLm9wdGlvbnMud3JhcEFyb3VuZCB8fCAhdGhpcy5jZWxscy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgaXNSaWdodFRvTGVmdCA9IHRoaXMub3B0aW9ucy5yaWdodFRvTGVmdDtcbiAgICB2YXIgYmVnaW5NYXJnaW4gPSBpc1JpZ2h0VG9MZWZ0ID8gJ21hcmdpblJpZ2h0JyA6ICdtYXJnaW5MZWZ0JztcbiAgICB2YXIgZW5kTWFyZ2luID0gaXNSaWdodFRvTGVmdCA/ICdtYXJnaW5MZWZ0JyA6ICdtYXJnaW5SaWdodCc7XG4gICAgdmFyIGNvbnRlbnRXaWR0aCA9IHRoaXMuc2xpZGVhYmxlV2lkdGggLSB0aGlzLmdldExhc3RDZWxsKCkuc2l6ZVtlbmRNYXJnaW5dOyAvLyBjb250ZW50IGlzIGxlc3MgdGhhbiBnYWxsZXJ5IHNpemVcblxuICAgIHZhciBpc0NvbnRlbnRTbWFsbGVyID0gY29udGVudFdpZHRoIDwgdGhpcy5zaXplLmlubmVyV2lkdGg7IC8vIGJvdW5kc1xuXG4gICAgdmFyIGJlZ2luQm91bmQgPSB0aGlzLmN1cnNvclBvc2l0aW9uICsgdGhpcy5jZWxsc1swXS5zaXplW2JlZ2luTWFyZ2luXTtcbiAgICB2YXIgZW5kQm91bmQgPSBjb250ZW50V2lkdGggLSB0aGlzLnNpemUuaW5uZXJXaWR0aCAqICgxIC0gdGhpcy5jZWxsQWxpZ24pOyAvLyBjb250YWluIGVhY2ggY2VsbCB0YXJnZXRcblxuICAgIHRoaXMuc2xpZGVzLmZvckVhY2goZnVuY3Rpb24gKHNsaWRlKSB7XG4gICAgICBpZiAoaXNDb250ZW50U21hbGxlcikge1xuICAgICAgICAvLyBhbGwgY2VsbHMgZml0IGluc2lkZSBnYWxsZXJ5XG4gICAgICAgIHNsaWRlLnRhcmdldCA9IGNvbnRlbnRXaWR0aCAqIHRoaXMuY2VsbEFsaWduO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gY29udGFpbiB0byBib3VuZHNcbiAgICAgICAgc2xpZGUudGFyZ2V0ID0gTWF0aC5tYXgoc2xpZGUudGFyZ2V0LCBiZWdpbkJvdW5kKTtcbiAgICAgICAgc2xpZGUudGFyZ2V0ID0gTWF0aC5taW4oc2xpZGUudGFyZ2V0LCBlbmRCb3VuZCk7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG4gIH07IC8vIC0tLS0tICAtLS0tLSAvL1xuXG4gIC8qKlxuICAgKiBlbWl0cyBldmVudHMgdmlhIGV2ZW50RW1pdHRlciBhbmQgalF1ZXJ5IGV2ZW50c1xuICAgKiBAcGFyYW0ge1N0cmluZ30gdHlwZSAtIG5hbWUgb2YgZXZlbnRcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgLSBvcmlnaW5hbCBldmVudFxuICAgKiBAcGFyYW0ge0FycmF5fSBhcmdzIC0gZXh0cmEgYXJndW1lbnRzXG4gICAqL1xuXG5cbiAgcHJvdG8uZGlzcGF0Y2hFdmVudCA9IGZ1bmN0aW9uICh0eXBlLCBldmVudCwgYXJncykge1xuICAgIHZhciBlbWl0QXJncyA9IGV2ZW50ID8gW2V2ZW50XS5jb25jYXQoYXJncykgOiBhcmdzO1xuICAgIHRoaXMuZW1pdEV2ZW50KHR5cGUsIGVtaXRBcmdzKTtcblxuICAgIGlmIChqUXVlcnkgJiYgdGhpcy4kZWxlbWVudCkge1xuICAgICAgLy8gZGVmYXVsdCB0cmlnZ2VyIHdpdGggdHlwZSBpZiBubyBldmVudFxuICAgICAgdHlwZSArPSB0aGlzLm9wdGlvbnMubmFtZXNwYWNlSlF1ZXJ5RXZlbnRzID8gJy5mbGlja2l0eScgOiAnJztcbiAgICAgIHZhciAkZXZlbnQgPSB0eXBlO1xuXG4gICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgLy8gY3JlYXRlIGpRdWVyeSBldmVudFxuICAgICAgICB2YXIgalFFdmVudCA9IGpRdWVyeS5FdmVudChldmVudCk7XG4gICAgICAgIGpRRXZlbnQudHlwZSA9IHR5cGU7XG4gICAgICAgICRldmVudCA9IGpRRXZlbnQ7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigkZXZlbnQsIGFyZ3MpO1xuICAgIH1cbiAgfTsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gc2VsZWN0IC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7SW50ZWdlcn0gaW5kZXggLSBpbmRleCBvZiB0aGUgc2xpZGVcbiAgICogQHBhcmFtIHtCb29sZWFufSBpc1dyYXAgLSB3aWxsIHdyYXAtYXJvdW5kIHRvIGxhc3QvZmlyc3QgaWYgYXQgdGhlIGVuZFxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGlzSW5zdGFudCAtIHdpbGwgaW1tZWRpYXRlbHkgc2V0IHBvc2l0aW9uIGF0IHNlbGVjdGVkIGNlbGxcbiAgICovXG5cblxuICBwcm90by5zZWxlY3QgPSBmdW5jdGlvbiAoaW5kZXgsIGlzV3JhcCwgaXNJbnN0YW50KSB7XG4gICAgaWYgKCF0aGlzLmlzQWN0aXZlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaW5kZXggPSBwYXJzZUludChpbmRleCwgMTApO1xuXG4gICAgdGhpcy5fd3JhcFNlbGVjdChpbmRleCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLndyYXBBcm91bmQgfHwgaXNXcmFwKSB7XG4gICAgICBpbmRleCA9IHV0aWxzLm1vZHVsbyhpbmRleCwgdGhpcy5zbGlkZXMubGVuZ3RoKTtcbiAgICB9IC8vIGJhaWwgaWYgaW52YWxpZCBpbmRleFxuXG5cbiAgICBpZiAoIXRoaXMuc2xpZGVzW2luZGV4XSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBwcmV2SW5kZXggPSB0aGlzLnNlbGVjdGVkSW5kZXg7XG4gICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gaW5kZXg7XG4gICAgdGhpcy51cGRhdGVTZWxlY3RlZFNsaWRlKCk7XG5cbiAgICBpZiAoaXNJbnN0YW50KSB7XG4gICAgICB0aGlzLnBvc2l0aW9uU2xpZGVyQXRTZWxlY3RlZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0YXJ0QW5pbWF0aW9uKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hZGFwdGl2ZUhlaWdodCkge1xuICAgICAgdGhpcy5zZXRHYWxsZXJ5U2l6ZSgpO1xuICAgIH0gLy8gZXZlbnRzXG5cblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnc2VsZWN0JywgbnVsbCwgW2luZGV4XSk7IC8vIGNoYW5nZSBldmVudCBpZiBuZXcgaW5kZXhcblxuICAgIGlmIChpbmRleCAhPSBwcmV2SW5kZXgpIHtcbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnY2hhbmdlJywgbnVsbCwgW2luZGV4XSk7XG4gICAgfSAvLyBvbGQgdjEgZXZlbnQgbmFtZSwgcmVtb3ZlIGluIHYzXG5cblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnY2VsbFNlbGVjdCcpO1xuICB9OyAvLyB3cmFwcyBwb3NpdGlvbiBmb3Igd3JhcEFyb3VuZCwgdG8gbW92ZSB0byBjbG9zZXN0IHNsaWRlLiAjMTEzXG5cblxuICBwcm90by5fd3JhcFNlbGVjdCA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgIHZhciBsZW4gPSB0aGlzLnNsaWRlcy5sZW5ndGg7XG4gICAgdmFyIGlzV3JhcHBpbmcgPSB0aGlzLm9wdGlvbnMud3JhcEFyb3VuZCAmJiBsZW4gPiAxO1xuXG4gICAgaWYgKCFpc1dyYXBwaW5nKSB7XG4gICAgICByZXR1cm4gaW5kZXg7XG4gICAgfVxuXG4gICAgdmFyIHdyYXBJbmRleCA9IHV0aWxzLm1vZHVsbyhpbmRleCwgbGVuKTsgLy8gZ28gdG8gc2hvcnRlc3RcblxuICAgIHZhciBkZWx0YSA9IE1hdGguYWJzKHdyYXBJbmRleCAtIHRoaXMuc2VsZWN0ZWRJbmRleCk7XG4gICAgdmFyIGJhY2tXcmFwRGVsdGEgPSBNYXRoLmFicyh3cmFwSW5kZXggKyBsZW4gLSB0aGlzLnNlbGVjdGVkSW5kZXgpO1xuICAgIHZhciBmb3Jld2FyZFdyYXBEZWx0YSA9IE1hdGguYWJzKHdyYXBJbmRleCAtIGxlbiAtIHRoaXMuc2VsZWN0ZWRJbmRleCk7XG5cbiAgICBpZiAoIXRoaXMuaXNEcmFnU2VsZWN0ICYmIGJhY2tXcmFwRGVsdGEgPCBkZWx0YSkge1xuICAgICAgaW5kZXggKz0gbGVuO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMuaXNEcmFnU2VsZWN0ICYmIGZvcmV3YXJkV3JhcERlbHRhIDwgZGVsdGEpIHtcbiAgICAgIGluZGV4IC09IGxlbjtcbiAgICB9IC8vIHdyYXAgcG9zaXRpb24gc28gc2xpZGVyIGlzIHdpdGhpbiBub3JtYWwgYXJlYVxuXG5cbiAgICBpZiAoaW5kZXggPCAwKSB7XG4gICAgICB0aGlzLnggLT0gdGhpcy5zbGlkZWFibGVXaWR0aDtcbiAgICB9IGVsc2UgaWYgKGluZGV4ID49IGxlbikge1xuICAgICAgdGhpcy54ICs9IHRoaXMuc2xpZGVhYmxlV2lkdGg7XG4gICAgfVxuICB9O1xuXG4gIHByb3RvLnByZXZpb3VzID0gZnVuY3Rpb24gKGlzV3JhcCwgaXNJbnN0YW50KSB7XG4gICAgdGhpcy5zZWxlY3QodGhpcy5zZWxlY3RlZEluZGV4IC0gMSwgaXNXcmFwLCBpc0luc3RhbnQpO1xuICB9O1xuXG4gIHByb3RvLm5leHQgPSBmdW5jdGlvbiAoaXNXcmFwLCBpc0luc3RhbnQpIHtcbiAgICB0aGlzLnNlbGVjdCh0aGlzLnNlbGVjdGVkSW5kZXggKyAxLCBpc1dyYXAsIGlzSW5zdGFudCk7XG4gIH07XG5cbiAgcHJvdG8udXBkYXRlU2VsZWN0ZWRTbGlkZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2xpZGUgPSB0aGlzLnNsaWRlc1t0aGlzLnNlbGVjdGVkSW5kZXhdOyAvLyBzZWxlY3RlZEluZGV4IGNvdWxkIGJlIG91dHNpZGUgb2Ygc2xpZGVzLCBpZiB0cmlnZ2VyZWQgYmVmb3JlIHJlc2l6ZSgpXG5cbiAgICBpZiAoIXNsaWRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyB1bnNlbGVjdCBwcmV2aW91cyBzZWxlY3RlZCBzbGlkZVxuXG5cbiAgICB0aGlzLnVuc2VsZWN0U2VsZWN0ZWRTbGlkZSgpOyAvLyB1cGRhdGUgbmV3IHNlbGVjdGVkIHNsaWRlXG5cbiAgICB0aGlzLnNlbGVjdGVkU2xpZGUgPSBzbGlkZTtcbiAgICBzbGlkZS5zZWxlY3QoKTtcbiAgICB0aGlzLnNlbGVjdGVkQ2VsbHMgPSBzbGlkZS5jZWxscztcbiAgICB0aGlzLnNlbGVjdGVkRWxlbWVudHMgPSBzbGlkZS5nZXRDZWxsRWxlbWVudHMoKTsgLy8gSEFDSzogc2VsZWN0ZWRDZWxsICYgc2VsZWN0ZWRFbGVtZW50IGlzIGZpcnN0IGNlbGwgaW4gc2xpZGUsIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XG4gICAgLy8gUmVtb3ZlIGluIHYzP1xuXG4gICAgdGhpcy5zZWxlY3RlZENlbGwgPSBzbGlkZS5jZWxsc1swXTtcbiAgICB0aGlzLnNlbGVjdGVkRWxlbWVudCA9IHRoaXMuc2VsZWN0ZWRFbGVtZW50c1swXTtcbiAgfTtcblxuICBwcm90by51bnNlbGVjdFNlbGVjdGVkU2xpZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuc2VsZWN0ZWRTbGlkZSkge1xuICAgICAgdGhpcy5zZWxlY3RlZFNsaWRlLnVuc2VsZWN0KCk7XG4gICAgfVxuICB9O1xuXG4gIHByb3RvLnNlbGVjdEluaXRpYWxJbmRleCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW5pdGlhbEluZGV4ID0gdGhpcy5vcHRpb25zLmluaXRpYWxJbmRleDsgLy8gYWxyZWFkeSBhY3RpdmF0ZWQsIHNlbGVjdCBwcmV2aW91cyBzZWxlY3RlZEluZGV4XG5cbiAgICBpZiAodGhpcy5pc0luaXRBY3RpdmF0ZWQpIHtcbiAgICAgIHRoaXMuc2VsZWN0KHRoaXMuc2VsZWN0ZWRJbmRleCwgZmFsc2UsIHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gc2VsZWN0IHdpdGggc2VsZWN0b3Igc3RyaW5nXG5cblxuICAgIGlmIChpbml0aWFsSW5kZXggJiYgdHlwZW9mIGluaXRpYWxJbmRleCA9PSAnc3RyaW5nJykge1xuICAgICAgdmFyIGNlbGwgPSB0aGlzLnF1ZXJ5Q2VsbChpbml0aWFsSW5kZXgpO1xuXG4gICAgICBpZiAoY2VsbCkge1xuICAgICAgICB0aGlzLnNlbGVjdENlbGwoaW5pdGlhbEluZGV4LCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSAwOyAvLyBzZWxlY3Qgd2l0aCBudW1iZXJcblxuICAgIGlmIChpbml0aWFsSW5kZXggJiYgdGhpcy5zbGlkZXNbaW5pdGlhbEluZGV4XSkge1xuICAgICAgaW5kZXggPSBpbml0aWFsSW5kZXg7XG4gICAgfSAvLyBzZWxlY3QgaW5zdGFudGx5XG5cblxuICAgIHRoaXMuc2VsZWN0KGluZGV4LCBmYWxzZSwgdHJ1ZSk7XG4gIH07XG4gIC8qKlxuICAgKiBzZWxlY3Qgc2xpZGUgZnJvbSBudW1iZXIgb3IgY2VsbCBlbGVtZW50XG4gICAqIEBwYXJhbSB7RWxlbWVudCBvciBOdW1iZXJ9IGVsZW1cbiAgICovXG5cblxuICBwcm90by5zZWxlY3RDZWxsID0gZnVuY3Rpb24gKHZhbHVlLCBpc1dyYXAsIGlzSW5zdGFudCkge1xuICAgIC8vIGdldCBjZWxsXG4gICAgdmFyIGNlbGwgPSB0aGlzLnF1ZXJ5Q2VsbCh2YWx1ZSk7XG5cbiAgICBpZiAoIWNlbGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSB0aGlzLmdldENlbGxTbGlkZUluZGV4KGNlbGwpO1xuICAgIHRoaXMuc2VsZWN0KGluZGV4LCBpc1dyYXAsIGlzSW5zdGFudCk7XG4gIH07XG5cbiAgcHJvdG8uZ2V0Q2VsbFNsaWRlSW5kZXggPSBmdW5jdGlvbiAoY2VsbCkge1xuICAgIC8vIGdldCBpbmRleCBvZiBzbGlkZXMgdGhhdCBoYXMgY2VsbFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zbGlkZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzbGlkZSA9IHRoaXMuc2xpZGVzW2ldO1xuICAgICAgdmFyIGluZGV4ID0gc2xpZGUuY2VsbHMuaW5kZXhPZihjZWxsKTtcblxuICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgfTsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gZ2V0IGNlbGxzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cbiAgLyoqXG4gICAqIGdldCBGbGlja2l0eS5DZWxsLCBnaXZlbiBhbiBFbGVtZW50XG4gICAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbVxuICAgKiBAcmV0dXJucyB7RmxpY2tpdHkuQ2VsbH0gaXRlbVxuICAgKi9cblxuXG4gIHByb3RvLmdldENlbGwgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgIC8vIGxvb3AgdGhyb3VnaCBjZWxscyB0byBnZXQgdGhlIG9uZSB0aGF0IG1hdGNoZXNcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY2VsbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjZWxsID0gdGhpcy5jZWxsc1tpXTtcblxuICAgICAgaWYgKGNlbGwuZWxlbWVudCA9PSBlbGVtKSB7XG4gICAgICAgIHJldHVybiBjZWxsO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIGdldCBjb2xsZWN0aW9uIG9mIEZsaWNraXR5LkNlbGxzLCBnaXZlbiBFbGVtZW50c1xuICAgKiBAcGFyYW0ge0VsZW1lbnQsIEFycmF5LCBOb2RlTGlzdH0gZWxlbXNcbiAgICogQHJldHVybnMge0FycmF5fSBjZWxscyAtIEZsaWNraXR5LkNlbGxzXG4gICAqL1xuXG5cbiAgcHJvdG8uZ2V0Q2VsbHMgPSBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICBlbGVtcyA9IHV0aWxzLm1ha2VBcnJheShlbGVtcyk7XG4gICAgdmFyIGNlbGxzID0gW107XG4gICAgZWxlbXMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgdmFyIGNlbGwgPSB0aGlzLmdldENlbGwoZWxlbSk7XG5cbiAgICAgIGlmIChjZWxsKSB7XG4gICAgICAgIGNlbGxzLnB1c2goY2VsbCk7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG4gICAgcmV0dXJuIGNlbGxzO1xuICB9O1xuICAvKipcbiAgICogZ2V0IGNlbGwgZWxlbWVudHNcbiAgICogQHJldHVybnMge0FycmF5fSBjZWxsRWxlbXNcbiAgICovXG5cblxuICBwcm90by5nZXRDZWxsRWxlbWVudHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2VsbHMubWFwKGZ1bmN0aW9uIChjZWxsKSB7XG4gICAgICByZXR1cm4gY2VsbC5lbGVtZW50O1xuICAgIH0pO1xuICB9O1xuICAvKipcbiAgICogZ2V0IHBhcmVudCBjZWxsIGZyb20gYW4gZWxlbWVudFxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1cbiAgICogQHJldHVybnMge0ZsaWNraXQuQ2VsbH0gY2VsbFxuICAgKi9cblxuXG4gIHByb3RvLmdldFBhcmVudENlbGwgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgIC8vIGZpcnN0IGNoZWNrIGlmIGVsZW0gaXMgY2VsbFxuICAgIHZhciBjZWxsID0gdGhpcy5nZXRDZWxsKGVsZW0pO1xuXG4gICAgaWYgKGNlbGwpIHtcbiAgICAgIHJldHVybiBjZWxsO1xuICAgIH0gLy8gdHJ5IHRvIGdldCBwYXJlbnQgY2VsbCBlbGVtXG5cblxuICAgIGVsZW0gPSB1dGlscy5nZXRQYXJlbnQoZWxlbSwgJy5mbGlja2l0eS1zbGlkZXIgPiAqJyk7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q2VsbChlbGVtKTtcbiAgfTtcbiAgLyoqXG4gICAqIGdldCBjZWxscyBhZGphY2VudCB0byBhIHNsaWRlXG4gICAqIEBwYXJhbSB7SW50ZWdlcn0gYWRqQ291bnQgLSBudW1iZXIgb2YgYWRqYWNlbnQgc2xpZGVzXG4gICAqIEBwYXJhbSB7SW50ZWdlcn0gaW5kZXggLSBpbmRleCBvZiBzbGlkZSB0byBzdGFydFxuICAgKiBAcmV0dXJucyB7QXJyYXl9IGNlbGxzIC0gYXJyYXkgb2YgRmxpY2tpdHkuQ2VsbHNcbiAgICovXG5cblxuICBwcm90by5nZXRBZGphY2VudENlbGxFbGVtZW50cyA9IGZ1bmN0aW9uIChhZGpDb3VudCwgaW5kZXgpIHtcbiAgICBpZiAoIWFkakNvdW50KSB7XG4gICAgICByZXR1cm4gdGhpcy5zZWxlY3RlZFNsaWRlLmdldENlbGxFbGVtZW50cygpO1xuICAgIH1cblxuICAgIGluZGV4ID0gaW5kZXggPT09IHVuZGVmaW5lZCA/IHRoaXMuc2VsZWN0ZWRJbmRleCA6IGluZGV4O1xuICAgIHZhciBsZW4gPSB0aGlzLnNsaWRlcy5sZW5ndGg7XG5cbiAgICBpZiAoMSArIGFkakNvdW50ICogMiA+PSBsZW4pIHtcbiAgICAgIHJldHVybiB0aGlzLmdldENlbGxFbGVtZW50cygpO1xuICAgIH1cblxuICAgIHZhciBjZWxsRWxlbXMgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSBpbmRleCAtIGFkakNvdW50OyBpIDw9IGluZGV4ICsgYWRqQ291bnQ7IGkrKykge1xuICAgICAgdmFyIHNsaWRlSW5kZXggPSB0aGlzLm9wdGlvbnMud3JhcEFyb3VuZCA/IHV0aWxzLm1vZHVsbyhpLCBsZW4pIDogaTtcbiAgICAgIHZhciBzbGlkZSA9IHRoaXMuc2xpZGVzW3NsaWRlSW5kZXhdO1xuXG4gICAgICBpZiAoc2xpZGUpIHtcbiAgICAgICAgY2VsbEVsZW1zID0gY2VsbEVsZW1zLmNvbmNhdChzbGlkZS5nZXRDZWxsRWxlbWVudHMoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNlbGxFbGVtcztcbiAgfTtcbiAgLyoqXG4gICAqIHNlbGVjdCBzbGlkZSBmcm9tIG51bWJlciBvciBjZWxsIGVsZW1lbnRcbiAgICogQHBhcmFtIHtFbGVtZW50LCBTZWxlY3RvciBTdHJpbmcsIG9yIE51bWJlcn0gc2VsZWN0b3JcbiAgICovXG5cblxuICBwcm90by5xdWVyeUNlbGwgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09ICdudW1iZXInKSB7XG4gICAgICAvLyB1c2UgbnVtYmVyIGFzIGluZGV4XG4gICAgICByZXR1cm4gdGhpcy5jZWxsc1tzZWxlY3Rvcl07XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBzZWxlY3RvciA9PSAnc3RyaW5nJykge1xuICAgICAgLy8gZG8gbm90IHNlbGVjdCBpbnZhbGlkIHNlbGVjdG9ycyBmcm9tIGhhc2g6ICMxMjMsICMvLiAjNzkxXG4gICAgICBpZiAoc2VsZWN0b3IubWF0Y2goL15bI1xcLl0/W1xcZFxcL10vKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9IC8vIHVzZSBzdHJpbmcgYXMgc2VsZWN0b3IsIGdldCBlbGVtZW50XG5cblxuICAgICAgc2VsZWN0b3IgPSB0aGlzLmVsZW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgfSAvLyBnZXQgY2VsbCBmcm9tIGVsZW1lbnRcblxuXG4gICAgcmV0dXJuIHRoaXMuZ2V0Q2VsbChzZWxlY3Rvcik7XG4gIH07IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGV2ZW50cyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG5cbiAgcHJvdG8udWlDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbWl0RXZlbnQoJ3VpQ2hhbmdlJyk7XG4gIH07IC8vIGtlZXAgZm9jdXMgb24gZWxlbWVudCB3aGVuIGNoaWxkIFVJIGVsZW1lbnRzIGFyZSBjbGlja2VkXG5cblxuICBwcm90by5jaGlsZFVJUG9pbnRlckRvd24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAvLyBIQUNLIGlPUyBkb2VzIG5vdCBhbGxvdyB0b3VjaCBldmVudHMgdG8gYnViYmxlIHVwPyFcbiAgICBpZiAoZXZlbnQudHlwZSAhPSAndG91Y2hzdGFydCcpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgdGhpcy5mb2N1cygpO1xuICB9OyAvLyAtLS0tLSByZXNpemUgLS0tLS0gLy9cblxuXG4gIHByb3RvLm9ucmVzaXplID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMud2F0Y2hDU1MoKTtcbiAgICB0aGlzLnJlc2l6ZSgpO1xuICB9O1xuXG4gIHV0aWxzLmRlYm91bmNlTWV0aG9kKEZsaWNraXR5LCAnb25yZXNpemUnLCAxNTApO1xuXG4gIHByb3RvLnJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuaXNBY3RpdmUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmdldFNpemUoKTsgLy8gd3JhcCB2YWx1ZXNcblxuICAgIGlmICh0aGlzLm9wdGlvbnMud3JhcEFyb3VuZCkge1xuICAgICAgdGhpcy54ID0gdXRpbHMubW9kdWxvKHRoaXMueCwgdGhpcy5zbGlkZWFibGVXaWR0aCk7XG4gICAgfVxuXG4gICAgdGhpcy5wb3NpdGlvbkNlbGxzKCk7XG5cbiAgICB0aGlzLl9nZXRXcmFwU2hpZnRDZWxscygpO1xuXG4gICAgdGhpcy5zZXRHYWxsZXJ5U2l6ZSgpO1xuICAgIHRoaXMuZW1pdEV2ZW50KCdyZXNpemUnKTsgLy8gdXBkYXRlIHNlbGVjdGVkIGluZGV4IGZvciBncm91cCBzbGlkZXMsIGluc3RhbnRcbiAgICAvLyBUT0RPOiBwb3NpdGlvbiBjYW4gYmUgbG9zdCBiZXR3ZWVuIGdyb3VwcyBvZiB2YXJpb3VzIG51bWJlcnNcblxuICAgIHZhciBzZWxlY3RlZEVsZW1lbnQgPSB0aGlzLnNlbGVjdGVkRWxlbWVudHMgJiYgdGhpcy5zZWxlY3RlZEVsZW1lbnRzWzBdO1xuICAgIHRoaXMuc2VsZWN0Q2VsbChzZWxlY3RlZEVsZW1lbnQsIGZhbHNlLCB0cnVlKTtcbiAgfTsgLy8gd2F0Y2hlcyB0aGUgOmFmdGVyIHByb3BlcnR5LCBhY3RpdmF0ZXMvZGVhY3RpdmF0ZXNcblxuXG4gIHByb3RvLndhdGNoQ1NTID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3YXRjaE9wdGlvbiA9IHRoaXMub3B0aW9ucy53YXRjaENTUztcblxuICAgIGlmICghd2F0Y2hPcHRpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgYWZ0ZXJDb250ZW50ID0gZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmVsZW1lbnQsICc6YWZ0ZXInKS5jb250ZW50OyAvLyBhY3RpdmF0ZSBpZiA6YWZ0ZXIgeyBjb250ZW50OiAnZmxpY2tpdHknIH1cblxuICAgIGlmIChhZnRlckNvbnRlbnQuaW5kZXhPZignZmxpY2tpdHknKSAhPSAtMSkge1xuICAgICAgdGhpcy5hY3RpdmF0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRlYWN0aXZhdGUoKTtcbiAgICB9XG4gIH07IC8vIC0tLS0tIGtleWRvd24gLS0tLS0gLy9cbiAgLy8gZ28gcHJldmlvdXMvbmV4dCBpZiBsZWZ0L3JpZ2h0IGtleXMgcHJlc3NlZFxuXG5cbiAgcHJvdG8ub25rZXlkb3duID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgLy8gb25seSB3b3JrIGlmIGVsZW1lbnQgaXMgaW4gZm9jdXNcbiAgICB2YXIgaXNOb3RGb2N1c2VkID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCAmJiBkb2N1bWVudC5hY3RpdmVFbGVtZW50ICE9IHRoaXMuZWxlbWVudDtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLmFjY2Vzc2liaWxpdHkgfHwgaXNOb3RGb2N1c2VkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZXIgPSBGbGlja2l0eS5rZXlib2FyZEhhbmRsZXJzW2V2ZW50LmtleUNvZGVdO1xuXG4gICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICB9XG4gIH07XG5cbiAgRmxpY2tpdHkua2V5Ym9hcmRIYW5kbGVycyA9IHtcbiAgICAvLyBsZWZ0IGFycm93XG4gICAgMzc6IGZ1bmN0aW9uIF8oKSB7XG4gICAgICB2YXIgbGVmdE1ldGhvZCA9IHRoaXMub3B0aW9ucy5yaWdodFRvTGVmdCA/ICduZXh0JyA6ICdwcmV2aW91cyc7XG4gICAgICB0aGlzLnVpQ2hhbmdlKCk7XG4gICAgICB0aGlzW2xlZnRNZXRob2RdKCk7XG4gICAgfSxcbiAgICAvLyByaWdodCBhcnJvd1xuICAgIDM5OiBmdW5jdGlvbiBfKCkge1xuICAgICAgdmFyIHJpZ2h0TWV0aG9kID0gdGhpcy5vcHRpb25zLnJpZ2h0VG9MZWZ0ID8gJ3ByZXZpb3VzJyA6ICduZXh0JztcbiAgICAgIHRoaXMudWlDaGFuZ2UoKTtcbiAgICAgIHRoaXNbcmlnaHRNZXRob2RdKCk7XG4gICAgfVxuICB9OyAvLyAtLS0tLSBmb2N1cyAtLS0tLSAvL1xuXG4gIHByb3RvLmZvY3VzID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIFRPRE8gcmVtb3ZlIHNjcm9sbFRvIG9uY2UgZm9jdXMgb3B0aW9ucyBnZXRzIG1vcmUgc3VwcG9ydFxuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9IVE1MRWxlbWVudC9mb2N1cyNCcm93c2VyX2NvbXBhdGliaWxpdHlcbiAgICB2YXIgcHJldlNjcm9sbFkgPSB3aW5kb3cucGFnZVlPZmZzZXQ7XG4gICAgdGhpcy5lbGVtZW50LmZvY3VzKHtcbiAgICAgIHByZXZlbnRTY3JvbGw6IHRydWVcbiAgICB9KTsgLy8gaGFjayB0byBmaXggc2Nyb2xsIGp1bXAgYWZ0ZXIgZm9jdXMsICM3NlxuXG4gICAgaWYgKHdpbmRvdy5wYWdlWU9mZnNldCAhPSBwcmV2U2Nyb2xsWSkge1xuICAgICAgd2luZG93LnNjcm9sbFRvKHdpbmRvdy5wYWdlWE9mZnNldCwgcHJldlNjcm9sbFkpO1xuICAgIH1cbiAgfTsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gZGVzdHJveSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuICAvLyBkZWFjdGl2YXRlIGFsbCBGbGlja2l0eSBmdW5jdGlvbmFsaXR5LCBidXQga2VlcCBzdHVmZiBhdmFpbGFibGVcblxuXG4gIHByb3RvLmRlYWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmlzQWN0aXZlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ2ZsaWNraXR5LWVuYWJsZWQnKTtcbiAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnZmxpY2tpdHktcnRsJyk7XG4gICAgdGhpcy51bnNlbGVjdFNlbGVjdGVkU2xpZGUoKTsgLy8gZGVzdHJveSBjZWxsc1xuXG4gICAgdGhpcy5jZWxscy5mb3JFYWNoKGZ1bmN0aW9uIChjZWxsKSB7XG4gICAgICBjZWxsLmRlc3Ryb3koKTtcbiAgICB9KTtcbiAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy52aWV3cG9ydCk7IC8vIG1vdmUgY2hpbGQgZWxlbWVudHMgYmFjayBpbnRvIGVsZW1lbnRcblxuICAgIG1vdmVFbGVtZW50cyh0aGlzLnNsaWRlci5jaGlsZHJlbiwgdGhpcy5lbGVtZW50KTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzaWJpbGl0eSkge1xuICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgndGFiSW5kZXgnKTtcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdGhpcyk7XG4gICAgfSAvLyBzZXQgZmxhZ3NcblxuXG4gICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuZW1pdEV2ZW50KCdkZWFjdGl2YXRlJyk7XG4gIH07XG5cbiAgcHJvdG8uZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRlYWN0aXZhdGUoKTtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcyk7XG4gICAgdGhpcy5hbGxPZmYoKTtcbiAgICB0aGlzLmVtaXRFdmVudCgnZGVzdHJveScpO1xuXG4gICAgaWYgKGpRdWVyeSAmJiB0aGlzLiRlbGVtZW50KSB7XG4gICAgICBqUXVlcnkucmVtb3ZlRGF0YSh0aGlzLmVsZW1lbnQsICdmbGlja2l0eScpO1xuICAgIH1cblxuICAgIGRlbGV0ZSB0aGlzLmVsZW1lbnQuZmxpY2tpdHlHVUlEO1xuICAgIGRlbGV0ZSBpbnN0YW5jZXNbdGhpcy5ndWlkXTtcbiAgfTsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gcHJvdG90eXBlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cblxuICB1dGlscy5leHRlbmQocHJvdG8sIGFuaW1hdGVQcm90b3R5cGUpOyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBleHRyYXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cblxuICAvKipcbiAgICogZ2V0IEZsaWNraXR5IGluc3RhbmNlIGZyb20gZWxlbWVudFxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1cbiAgICogQHJldHVybnMge0ZsaWNraXR5fVxuICAgKi9cblxuICBGbGlja2l0eS5kYXRhID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICBlbGVtID0gdXRpbHMuZ2V0UXVlcnlFbGVtZW50KGVsZW0pO1xuICAgIHZhciBpZCA9IGVsZW0gJiYgZWxlbS5mbGlja2l0eUdVSUQ7XG4gICAgcmV0dXJuIGlkICYmIGluc3RhbmNlc1tpZF07XG4gIH07XG5cbiAgdXRpbHMuaHRtbEluaXQoRmxpY2tpdHksICdmbGlja2l0eScpO1xuXG4gIGlmIChqUXVlcnkgJiYgalF1ZXJ5LmJyaWRnZXQpIHtcbiAgICBqUXVlcnkuYnJpZGdldCgnZmxpY2tpdHknLCBGbGlja2l0eSk7XG4gIH0gLy8gc2V0IGludGVybmFsIGpRdWVyeSwgZm9yIFdlYnBhY2sgKyBqUXVlcnkgdjMsICM0NzhcblxuXG4gIEZsaWNraXR5LnNldEpRdWVyeSA9IGZ1bmN0aW9uIChqcSkge1xuICAgIGpRdWVyeSA9IGpxO1xuICB9O1xuXG4gIEZsaWNraXR5LkNlbGwgPSBDZWxsO1xuICBGbGlja2l0eS5TbGlkZSA9IFNsaWRlO1xuICByZXR1cm4gRmxpY2tpdHk7XG59KTtcbi8qIVxuICogVW5pcG9pbnRlciB2Mi4zLjBcbiAqIGJhc2UgY2xhc3MgZm9yIGRvaW5nIG9uZSB0aGluZyB3aXRoIHBvaW50ZXIgZXZlbnRcbiAqIE1JVCBsaWNlbnNlXG4gKi9cblxuLypqc2hpbnQgYnJvd3NlcjogdHJ1ZSwgdW5kZWY6IHRydWUsIHVudXNlZDogdHJ1ZSwgc3RyaWN0OiB0cnVlICovXG5cblxuKGZ1bmN0aW9uICh3aW5kb3csIGZhY3RvcnkpIHtcbiAgLy8gdW5pdmVyc2FsIG1vZHVsZSBkZWZpbml0aW9uXG5cbiAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cblxuICAvKmdsb2JhbCBkZWZpbmUsIG1vZHVsZSwgcmVxdWlyZSAqL1xuICBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTURcbiAgICBkZWZpbmUoJ3VuaXBvaW50ZXIvdW5pcG9pbnRlcicsIFsnZXYtZW1pdHRlci9ldi1lbWl0dGVyJ10sIGZ1bmN0aW9uIChFdkVtaXR0ZXIpIHtcbiAgICAgIHJldHVybiBmYWN0b3J5KHdpbmRvdywgRXZFbWl0dGVyKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIG1vZHVsZSA9PT0gXCJ1bmRlZmluZWRcIiA/IFwidW5kZWZpbmVkXCIgOiBfdHlwZW9mKG1vZHVsZSkpID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnkod2luZG93LCByZXF1aXJlKCdldi1lbWl0dGVyJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIGJyb3dzZXIgZ2xvYmFsXG4gICAgd2luZG93LlVuaXBvaW50ZXIgPSBmYWN0b3J5KHdpbmRvdywgd2luZG93LkV2RW1pdHRlcik7XG4gIH1cbn0pKHdpbmRvdywgZnVuY3Rpb24gZmFjdG9yeSh3aW5kb3csIEV2RW1pdHRlcikge1xuICBmdW5jdGlvbiBub29wKCkge31cblxuICBmdW5jdGlvbiBVbmlwb2ludGVyKCkge30gLy8gaW5oZXJpdCBFdkVtaXR0ZXJcblxuXG4gIHZhciBwcm90byA9IFVuaXBvaW50ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdkVtaXR0ZXIucHJvdG90eXBlKTtcblxuICBwcm90by5iaW5kU3RhcnRFdmVudCA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgdGhpcy5fYmluZFN0YXJ0RXZlbnQoZWxlbSwgdHJ1ZSk7XG4gIH07XG5cbiAgcHJvdG8udW5iaW5kU3RhcnRFdmVudCA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgdGhpcy5fYmluZFN0YXJ0RXZlbnQoZWxlbSwgZmFsc2UpO1xuICB9O1xuICAvKipcbiAgICogQWRkIG9yIHJlbW92ZSBzdGFydCBldmVudFxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGlzQWRkIC0gcmVtb3ZlIGlmIGZhbHNleVxuICAgKi9cblxuXG4gIHByb3RvLl9iaW5kU3RhcnRFdmVudCA9IGZ1bmN0aW9uIChlbGVtLCBpc0FkZCkge1xuICAgIC8vIG11bmdlIGlzQWRkLCBkZWZhdWx0IHRvIHRydWVcbiAgICBpc0FkZCA9IGlzQWRkID09PSB1bmRlZmluZWQgPyB0cnVlIDogaXNBZGQ7XG4gICAgdmFyIGJpbmRNZXRob2QgPSBpc0FkZCA/ICdhZGRFdmVudExpc3RlbmVyJyA6ICdyZW1vdmVFdmVudExpc3RlbmVyJzsgLy8gZGVmYXVsdCB0byBtb3VzZSBldmVudHNcblxuICAgIHZhciBzdGFydEV2ZW50ID0gJ21vdXNlZG93bic7XG5cbiAgICBpZiAod2luZG93LlBvaW50ZXJFdmVudCkge1xuICAgICAgLy8gUG9pbnRlciBFdmVudHNcbiAgICAgIHN0YXJ0RXZlbnQgPSAncG9pbnRlcmRvd24nO1xuICAgIH0gZWxzZSBpZiAoJ29udG91Y2hzdGFydCcgaW4gd2luZG93KSB7XG4gICAgICAvLyBUb3VjaCBFdmVudHMuIGlPUyBTYWZhcmlcbiAgICAgIHN0YXJ0RXZlbnQgPSAndG91Y2hzdGFydCc7XG4gICAgfVxuXG4gICAgZWxlbVtiaW5kTWV0aG9kXShzdGFydEV2ZW50LCB0aGlzKTtcbiAgfTsgLy8gdHJpZ2dlciBoYW5kbGVyIG1ldGhvZHMgZm9yIGV2ZW50c1xuXG5cbiAgcHJvdG8uaGFuZGxlRXZlbnQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgbWV0aG9kID0gJ29uJyArIGV2ZW50LnR5cGU7XG5cbiAgICBpZiAodGhpc1ttZXRob2RdKSB7XG4gICAgICB0aGlzW21ldGhvZF0oZXZlbnQpO1xuICAgIH1cbiAgfTsgLy8gcmV0dXJucyB0aGUgdG91Y2ggdGhhdCB3ZSdyZSBrZWVwaW5nIHRyYWNrIG9mXG5cblxuICBwcm90by5nZXRUb3VjaCA9IGZ1bmN0aW9uICh0b3VjaGVzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b3VjaGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdG91Y2ggPSB0b3VjaGVzW2ldO1xuXG4gICAgICBpZiAodG91Y2guaWRlbnRpZmllciA9PSB0aGlzLnBvaW50ZXJJZGVudGlmaWVyKSB7XG4gICAgICAgIHJldHVybiB0b3VjaDtcbiAgICAgIH1cbiAgICB9XG4gIH07IC8vIC0tLS0tIHN0YXJ0IGV2ZW50IC0tLS0tIC8vXG5cblxuICBwcm90by5vbm1vdXNlZG93biA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIC8vIGRpc21pc3MgY2xpY2tzIGZyb20gcmlnaHQgb3IgbWlkZGxlIGJ1dHRvbnNcbiAgICB2YXIgYnV0dG9uID0gZXZlbnQuYnV0dG9uO1xuXG4gICAgaWYgKGJ1dHRvbiAmJiBidXR0b24gIT09IDAgJiYgYnV0dG9uICE9PSAxKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fcG9pbnRlckRvd24oZXZlbnQsIGV2ZW50KTtcbiAgfTtcblxuICBwcm90by5vbnRvdWNoc3RhcnQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLl9wb2ludGVyRG93bihldmVudCwgZXZlbnQuY2hhbmdlZFRvdWNoZXNbMF0pO1xuICB9O1xuXG4gIHByb3RvLm9ucG9pbnRlcmRvd24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLl9wb2ludGVyRG93bihldmVudCwgZXZlbnQpO1xuICB9O1xuICAvKipcbiAgICogcG9pbnRlciBzdGFydFxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudFxuICAgKiBAcGFyYW0ge0V2ZW50IG9yIFRvdWNofSBwb2ludGVyXG4gICAqL1xuXG5cbiAgcHJvdG8uX3BvaW50ZXJEb3duID0gZnVuY3Rpb24gKGV2ZW50LCBwb2ludGVyKSB7XG4gICAgLy8gZGlzbWlzcyByaWdodCBjbGljayBhbmQgb3RoZXIgcG9pbnRlcnNcbiAgICAvLyBidXR0b24gPSAwIGlzIG9rYXksIDEtNCBub3RcbiAgICBpZiAoZXZlbnQuYnV0dG9uIHx8IHRoaXMuaXNQb2ludGVyRG93bikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuaXNQb2ludGVyRG93biA9IHRydWU7IC8vIHNhdmUgcG9pbnRlciBpZGVudGlmaWVyIHRvIG1hdGNoIHVwIHRvdWNoIGV2ZW50c1xuXG4gICAgdGhpcy5wb2ludGVySWRlbnRpZmllciA9IHBvaW50ZXIucG9pbnRlcklkICE9PSB1bmRlZmluZWQgPyAvLyBwb2ludGVySWQgZm9yIHBvaW50ZXIgZXZlbnRzLCB0b3VjaC5pbmRlbnRpZmllciBmb3IgdG91Y2ggZXZlbnRzXG4gICAgcG9pbnRlci5wb2ludGVySWQgOiBwb2ludGVyLmlkZW50aWZpZXI7XG4gICAgdGhpcy5wb2ludGVyRG93bihldmVudCwgcG9pbnRlcik7XG4gIH07XG5cbiAgcHJvdG8ucG9pbnRlckRvd24gPSBmdW5jdGlvbiAoZXZlbnQsIHBvaW50ZXIpIHtcbiAgICB0aGlzLl9iaW5kUG9zdFN0YXJ0RXZlbnRzKGV2ZW50KTtcblxuICAgIHRoaXMuZW1pdEV2ZW50KCdwb2ludGVyRG93bicsIFtldmVudCwgcG9pbnRlcl0pO1xuICB9OyAvLyBoYXNoIG9mIGV2ZW50cyB0byBiZSBib3VuZCBhZnRlciBzdGFydCBldmVudFxuXG5cbiAgdmFyIHBvc3RTdGFydEV2ZW50cyA9IHtcbiAgICBtb3VzZWRvd246IFsnbW91c2Vtb3ZlJywgJ21vdXNldXAnXSxcbiAgICB0b3VjaHN0YXJ0OiBbJ3RvdWNobW92ZScsICd0b3VjaGVuZCcsICd0b3VjaGNhbmNlbCddLFxuICAgIHBvaW50ZXJkb3duOiBbJ3BvaW50ZXJtb3ZlJywgJ3BvaW50ZXJ1cCcsICdwb2ludGVyY2FuY2VsJ11cbiAgfTtcblxuICBwcm90by5fYmluZFBvc3RTdGFydEV2ZW50cyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIGlmICghZXZlbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIGdldCBwcm9wZXIgZXZlbnRzIHRvIG1hdGNoIHN0YXJ0IGV2ZW50XG5cblxuICAgIHZhciBldmVudHMgPSBwb3N0U3RhcnRFdmVudHNbZXZlbnQudHlwZV07IC8vIGJpbmQgZXZlbnRzIHRvIG5vZGVcblxuICAgIGV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChldmVudE5hbWUpIHtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgdGhpcyk7XG4gICAgfSwgdGhpcyk7IC8vIHNhdmUgdGhlc2UgYXJndW1lbnRzXG5cbiAgICB0aGlzLl9ib3VuZFBvaW50ZXJFdmVudHMgPSBldmVudHM7XG4gIH07XG5cbiAgcHJvdG8uX3VuYmluZFBvc3RTdGFydEV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBjaGVjayBmb3IgX2JvdW5kRXZlbnRzLCBpbiBjYXNlIGRyYWdFbmQgdHJpZ2dlcmVkIHR3aWNlIChvbGQgSUU4IGJ1ZylcbiAgICBpZiAoIXRoaXMuX2JvdW5kUG9pbnRlckV2ZW50cykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX2JvdW5kUG9pbnRlckV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChldmVudE5hbWUpIHtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgdGhpcyk7XG4gICAgfSwgdGhpcyk7XG5cbiAgICBkZWxldGUgdGhpcy5fYm91bmRQb2ludGVyRXZlbnRzO1xuICB9OyAvLyAtLS0tLSBtb3ZlIGV2ZW50IC0tLS0tIC8vXG5cblxuICBwcm90by5vbm1vdXNlbW92ZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuX3BvaW50ZXJNb3ZlKGV2ZW50LCBldmVudCk7XG4gIH07XG5cbiAgcHJvdG8ub25wb2ludGVybW92ZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIGlmIChldmVudC5wb2ludGVySWQgPT0gdGhpcy5wb2ludGVySWRlbnRpZmllcikge1xuICAgICAgdGhpcy5fcG9pbnRlck1vdmUoZXZlbnQsIGV2ZW50KTtcbiAgICB9XG4gIH07XG5cbiAgcHJvdG8ub250b3VjaG1vdmUgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgdG91Y2ggPSB0aGlzLmdldFRvdWNoKGV2ZW50LmNoYW5nZWRUb3VjaGVzKTtcblxuICAgIGlmICh0b3VjaCkge1xuICAgICAgdGhpcy5fcG9pbnRlck1vdmUoZXZlbnQsIHRvdWNoKTtcbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBwb2ludGVyIG1vdmVcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnRcbiAgICogQHBhcmFtIHtFdmVudCBvciBUb3VjaH0gcG9pbnRlclxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIHByb3RvLl9wb2ludGVyTW92ZSA9IGZ1bmN0aW9uIChldmVudCwgcG9pbnRlcikge1xuICAgIHRoaXMucG9pbnRlck1vdmUoZXZlbnQsIHBvaW50ZXIpO1xuICB9OyAvLyBwdWJsaWNcblxuXG4gIHByb3RvLnBvaW50ZXJNb3ZlID0gZnVuY3Rpb24gKGV2ZW50LCBwb2ludGVyKSB7XG4gICAgdGhpcy5lbWl0RXZlbnQoJ3BvaW50ZXJNb3ZlJywgW2V2ZW50LCBwb2ludGVyXSk7XG4gIH07IC8vIC0tLS0tIGVuZCBldmVudCAtLS0tLSAvL1xuXG5cbiAgcHJvdG8ub25tb3VzZXVwID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdGhpcy5fcG9pbnRlclVwKGV2ZW50LCBldmVudCk7XG4gIH07XG5cbiAgcHJvdG8ub25wb2ludGVydXAgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQucG9pbnRlcklkID09IHRoaXMucG9pbnRlcklkZW50aWZpZXIpIHtcbiAgICAgIHRoaXMuX3BvaW50ZXJVcChldmVudCwgZXZlbnQpO1xuICAgIH1cbiAgfTtcblxuICBwcm90by5vbnRvdWNoZW5kID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdmFyIHRvdWNoID0gdGhpcy5nZXRUb3VjaChldmVudC5jaGFuZ2VkVG91Y2hlcyk7XG5cbiAgICBpZiAodG91Y2gpIHtcbiAgICAgIHRoaXMuX3BvaW50ZXJVcChldmVudCwgdG91Y2gpO1xuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIHBvaW50ZXIgdXBcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnRcbiAgICogQHBhcmFtIHtFdmVudCBvciBUb3VjaH0gcG9pbnRlclxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIHByb3RvLl9wb2ludGVyVXAgPSBmdW5jdGlvbiAoZXZlbnQsIHBvaW50ZXIpIHtcbiAgICB0aGlzLl9wb2ludGVyRG9uZSgpO1xuXG4gICAgdGhpcy5wb2ludGVyVXAoZXZlbnQsIHBvaW50ZXIpO1xuICB9OyAvLyBwdWJsaWNcblxuXG4gIHByb3RvLnBvaW50ZXJVcCA9IGZ1bmN0aW9uIChldmVudCwgcG9pbnRlcikge1xuICAgIHRoaXMuZW1pdEV2ZW50KCdwb2ludGVyVXAnLCBbZXZlbnQsIHBvaW50ZXJdKTtcbiAgfTsgLy8gLS0tLS0gcG9pbnRlciBkb25lIC0tLS0tIC8vXG4gIC8vIHRyaWdnZXJlZCBvbiBwb2ludGVyIHVwICYgcG9pbnRlciBjYW5jZWxcblxuXG4gIHByb3RvLl9wb2ludGVyRG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9wb2ludGVyUmVzZXQoKTtcblxuICAgIHRoaXMuX3VuYmluZFBvc3RTdGFydEV2ZW50cygpO1xuXG4gICAgdGhpcy5wb2ludGVyRG9uZSgpO1xuICB9O1xuXG4gIHByb3RvLl9wb2ludGVyUmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gcmVzZXQgcHJvcGVydGllc1xuICAgIHRoaXMuaXNQb2ludGVyRG93biA9IGZhbHNlO1xuICAgIGRlbGV0ZSB0aGlzLnBvaW50ZXJJZGVudGlmaWVyO1xuICB9O1xuXG4gIHByb3RvLnBvaW50ZXJEb25lID0gbm9vcDsgLy8gLS0tLS0gcG9pbnRlciBjYW5jZWwgLS0tLS0gLy9cblxuICBwcm90by5vbnBvaW50ZXJjYW5jZWwgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQucG9pbnRlcklkID09IHRoaXMucG9pbnRlcklkZW50aWZpZXIpIHtcbiAgICAgIHRoaXMuX3BvaW50ZXJDYW5jZWwoZXZlbnQsIGV2ZW50KTtcbiAgICB9XG4gIH07XG5cbiAgcHJvdG8ub250b3VjaGNhbmNlbCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciB0b3VjaCA9IHRoaXMuZ2V0VG91Y2goZXZlbnQuY2hhbmdlZFRvdWNoZXMpO1xuXG4gICAgaWYgKHRvdWNoKSB7XG4gICAgICB0aGlzLl9wb2ludGVyQ2FuY2VsKGV2ZW50LCB0b3VjaCk7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogcG9pbnRlciBjYW5jZWxcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnRcbiAgICogQHBhcmFtIHtFdmVudCBvciBUb3VjaH0gcG9pbnRlclxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIHByb3RvLl9wb2ludGVyQ2FuY2VsID0gZnVuY3Rpb24gKGV2ZW50LCBwb2ludGVyKSB7XG4gICAgdGhpcy5fcG9pbnRlckRvbmUoKTtcblxuICAgIHRoaXMucG9pbnRlckNhbmNlbChldmVudCwgcG9pbnRlcik7XG4gIH07IC8vIHB1YmxpY1xuXG5cbiAgcHJvdG8ucG9pbnRlckNhbmNlbCA9IGZ1bmN0aW9uIChldmVudCwgcG9pbnRlcikge1xuICAgIHRoaXMuZW1pdEV2ZW50KCdwb2ludGVyQ2FuY2VsJywgW2V2ZW50LCBwb2ludGVyXSk7XG4gIH07IC8vIC0tLS0tICAtLS0tLSAvL1xuICAvLyB1dGlsaXR5IGZ1bmN0aW9uIGZvciBnZXR0aW5nIHgveSBjb29yZHMgZnJvbSBldmVudFxuXG5cbiAgVW5pcG9pbnRlci5nZXRQb2ludGVyUG9pbnQgPSBmdW5jdGlvbiAocG9pbnRlcikge1xuICAgIHJldHVybiB7XG4gICAgICB4OiBwb2ludGVyLnBhZ2VYLFxuICAgICAgeTogcG9pbnRlci5wYWdlWVxuICAgIH07XG4gIH07IC8vIC0tLS0tICAtLS0tLSAvL1xuXG5cbiAgcmV0dXJuIFVuaXBvaW50ZXI7XG59KTtcbi8qIVxuICogVW5pZHJhZ2dlciB2Mi4zLjBcbiAqIERyYWdnYWJsZSBiYXNlIGNsYXNzXG4gKiBNSVQgbGljZW5zZVxuICovXG5cbi8qanNoaW50IGJyb3dzZXI6IHRydWUsIHVudXNlZDogdHJ1ZSwgdW5kZWY6IHRydWUsIHN0cmljdDogdHJ1ZSAqL1xuXG5cbihmdW5jdGlvbiAod2luZG93LCBmYWN0b3J5KSB7XG4gIC8vIHVuaXZlcnNhbCBtb2R1bGUgZGVmaW5pdGlvblxuXG4gIC8qanNoaW50IHN0cmljdDogZmFsc2UgKi9cblxuICAvKmdsb2JhbHMgZGVmaW5lLCBtb2R1bGUsIHJlcXVpcmUgKi9cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EXG4gICAgZGVmaW5lKCd1bmlkcmFnZ2VyL3VuaWRyYWdnZXInLCBbJ3VuaXBvaW50ZXIvdW5pcG9pbnRlciddLCBmdW5jdGlvbiAoVW5pcG9pbnRlcikge1xuICAgICAgcmV0dXJuIGZhY3Rvcnkod2luZG93LCBVbmlwb2ludGVyKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIG1vZHVsZSA9PT0gXCJ1bmRlZmluZWRcIiA/IFwidW5kZWZpbmVkXCIgOiBfdHlwZW9mKG1vZHVsZSkpID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnkod2luZG93LCByZXF1aXJlKCd1bmlwb2ludGVyJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIGJyb3dzZXIgZ2xvYmFsXG4gICAgd2luZG93LlVuaWRyYWdnZXIgPSBmYWN0b3J5KHdpbmRvdywgd2luZG93LlVuaXBvaW50ZXIpO1xuICB9XG59KSh3aW5kb3csIGZ1bmN0aW9uIGZhY3Rvcnkod2luZG93LCBVbmlwb2ludGVyKSB7XG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFVuaWRyYWdnZXIgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cbiAgZnVuY3Rpb24gVW5pZHJhZ2dlcigpIHt9IC8vIGluaGVyaXQgVW5pcG9pbnRlciAmIEV2RW1pdHRlclxuXG5cbiAgdmFyIHByb3RvID0gVW5pZHJhZ2dlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFVuaXBvaW50ZXIucHJvdG90eXBlKTsgLy8gLS0tLS0gYmluZCBzdGFydCAtLS0tLSAvL1xuXG4gIHByb3RvLmJpbmRIYW5kbGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2JpbmRIYW5kbGVzKHRydWUpO1xuICB9O1xuXG4gIHByb3RvLnVuYmluZEhhbmRsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fYmluZEhhbmRsZXMoZmFsc2UpO1xuICB9O1xuICAvKipcbiAgICogQWRkIG9yIHJlbW92ZSBzdGFydCBldmVudFxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGlzQWRkXG4gICAqL1xuXG5cbiAgcHJvdG8uX2JpbmRIYW5kbGVzID0gZnVuY3Rpb24gKGlzQWRkKSB7XG4gICAgLy8gbXVuZ2UgaXNBZGQsIGRlZmF1bHQgdG8gdHJ1ZVxuICAgIGlzQWRkID0gaXNBZGQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBpc0FkZDsgLy8gYmluZCBlYWNoIGhhbmRsZVxuXG4gICAgdmFyIGJpbmRNZXRob2QgPSBpc0FkZCA/ICdhZGRFdmVudExpc3RlbmVyJyA6ICdyZW1vdmVFdmVudExpc3RlbmVyJztcbiAgICB2YXIgdG91Y2hBY3Rpb24gPSBpc0FkZCA/IHRoaXMuX3RvdWNoQWN0aW9uVmFsdWUgOiAnJztcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5oYW5kbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgaGFuZGxlID0gdGhpcy5oYW5kbGVzW2ldO1xuXG4gICAgICB0aGlzLl9iaW5kU3RhcnRFdmVudChoYW5kbGUsIGlzQWRkKTtcblxuICAgICAgaGFuZGxlW2JpbmRNZXRob2RdKCdjbGljaycsIHRoaXMpOyAvLyB0b3VjaC1hY3Rpb246IG5vbmUgdG8gb3ZlcnJpZGUgYnJvd3NlciB0b3VjaCBnZXN0dXJlcy4gbWV0YWZpenp5L2ZsaWNraXR5IzU0MFxuXG4gICAgICBpZiAod2luZG93LlBvaW50ZXJFdmVudCkge1xuICAgICAgICBoYW5kbGUuc3R5bGUudG91Y2hBY3Rpb24gPSB0b3VjaEFjdGlvbjtcbiAgICAgIH1cbiAgICB9XG4gIH07IC8vIHByb3RvdHlwZSBzbyBpdCBjYW4gYmUgb3ZlcndyaXRlYWJsZSBieSBGbGlja2l0eVxuXG5cbiAgcHJvdG8uX3RvdWNoQWN0aW9uVmFsdWUgPSAnbm9uZSc7IC8vIC0tLS0tIHN0YXJ0IGV2ZW50IC0tLS0tIC8vXG5cbiAgLyoqXG4gICAqIHBvaW50ZXIgc3RhcnRcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnRcbiAgICogQHBhcmFtIHtFdmVudCBvciBUb3VjaH0gcG9pbnRlclxuICAgKi9cblxuICBwcm90by5wb2ludGVyRG93biA9IGZ1bmN0aW9uIChldmVudCwgcG9pbnRlcikge1xuICAgIHZhciBpc09rYXkgPSB0aGlzLm9rYXlQb2ludGVyRG93bihldmVudCk7XG5cbiAgICBpZiAoIWlzT2theSkge1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gdHJhY2sgc3RhcnQgZXZlbnQgcG9zaXRpb25cblxuXG4gICAgdGhpcy5wb2ludGVyRG93blBvaW50ZXIgPSBwb2ludGVyO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdGhpcy5wb2ludGVyRG93bkJsdXIoKTsgLy8gYmluZCBtb3ZlIGFuZCBlbmQgZXZlbnRzXG5cbiAgICB0aGlzLl9iaW5kUG9zdFN0YXJ0RXZlbnRzKGV2ZW50KTtcblxuICAgIHRoaXMuZW1pdEV2ZW50KCdwb2ludGVyRG93bicsIFtldmVudCwgcG9pbnRlcl0pO1xuICB9OyAvLyBub2RlcyB0aGF0IGhhdmUgdGV4dCBmaWVsZHNcblxuXG4gIHZhciBjdXJzb3JOb2RlcyA9IHtcbiAgICBURVhUQVJFQTogdHJ1ZSxcbiAgICBJTlBVVDogdHJ1ZSxcbiAgICBTRUxFQ1Q6IHRydWUsXG4gICAgT1BUSU9OOiB0cnVlXG4gIH07IC8vIGlucHV0IHR5cGVzIHRoYXQgZG8gbm90IGhhdmUgdGV4dCBmaWVsZHNcblxuICB2YXIgY2xpY2tUeXBlcyA9IHtcbiAgICByYWRpbzogdHJ1ZSxcbiAgICBjaGVja2JveDogdHJ1ZSxcbiAgICBidXR0b246IHRydWUsXG4gICAgc3VibWl0OiB0cnVlLFxuICAgIGltYWdlOiB0cnVlLFxuICAgIGZpbGU6IHRydWVcbiAgfTsgLy8gZGlzbWlzcyBpbnB1dHMgd2l0aCB0ZXh0IGZpZWxkcy4gZmxpY2tpdHkjNDAzLCBmbGlja2l0eSM0MDRcblxuICBwcm90by5va2F5UG9pbnRlckRvd24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgaXNDdXJzb3JOb2RlID0gY3Vyc29yTm9kZXNbZXZlbnQudGFyZ2V0Lm5vZGVOYW1lXTtcbiAgICB2YXIgaXNDbGlja1R5cGUgPSBjbGlja1R5cGVzW2V2ZW50LnRhcmdldC50eXBlXTtcbiAgICB2YXIgaXNPa2F5ID0gIWlzQ3Vyc29yTm9kZSB8fCBpc0NsaWNrVHlwZTtcblxuICAgIGlmICghaXNPa2F5KSB7XG4gICAgICB0aGlzLl9wb2ludGVyUmVzZXQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaXNPa2F5O1xuICB9OyAvLyBrbHVkZ2UgdG8gYmx1ciBwcmV2aW91c2x5IGZvY3VzZWQgaW5wdXRcblxuXG4gIHByb3RvLnBvaW50ZXJEb3duQmx1ciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZm9jdXNlZCA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQ7IC8vIGRvIG5vdCBibHVyIGJvZHkgZm9yIElFMTAsIG1ldGFmaXp6eS9mbGlja2l0eSMxMTdcblxuICAgIHZhciBjYW5CbHVyID0gZm9jdXNlZCAmJiBmb2N1c2VkLmJsdXIgJiYgZm9jdXNlZCAhPSBkb2N1bWVudC5ib2R5O1xuXG4gICAgaWYgKGNhbkJsdXIpIHtcbiAgICAgIGZvY3VzZWQuYmx1cigpO1xuICAgIH1cbiAgfTsgLy8gLS0tLS0gbW92ZSBldmVudCAtLS0tLSAvL1xuXG4gIC8qKlxuICAgKiBkcmFnIG1vdmVcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnRcbiAgICogQHBhcmFtIHtFdmVudCBvciBUb3VjaH0gcG9pbnRlclxuICAgKi9cblxuXG4gIHByb3RvLnBvaW50ZXJNb3ZlID0gZnVuY3Rpb24gKGV2ZW50LCBwb2ludGVyKSB7XG4gICAgdmFyIG1vdmVWZWN0b3IgPSB0aGlzLl9kcmFnUG9pbnRlck1vdmUoZXZlbnQsIHBvaW50ZXIpO1xuXG4gICAgdGhpcy5lbWl0RXZlbnQoJ3BvaW50ZXJNb3ZlJywgW2V2ZW50LCBwb2ludGVyLCBtb3ZlVmVjdG9yXSk7XG5cbiAgICB0aGlzLl9kcmFnTW92ZShldmVudCwgcG9pbnRlciwgbW92ZVZlY3Rvcik7XG4gIH07IC8vIGJhc2UgcG9pbnRlciBtb3ZlIGxvZ2ljXG5cblxuICBwcm90by5fZHJhZ1BvaW50ZXJNb3ZlID0gZnVuY3Rpb24gKGV2ZW50LCBwb2ludGVyKSB7XG4gICAgdmFyIG1vdmVWZWN0b3IgPSB7XG4gICAgICB4OiBwb2ludGVyLnBhZ2VYIC0gdGhpcy5wb2ludGVyRG93blBvaW50ZXIucGFnZVgsXG4gICAgICB5OiBwb2ludGVyLnBhZ2VZIC0gdGhpcy5wb2ludGVyRG93blBvaW50ZXIucGFnZVlcbiAgICB9OyAvLyBzdGFydCBkcmFnIGlmIHBvaW50ZXIgaGFzIG1vdmVkIGZhciBlbm91Z2ggdG8gc3RhcnQgZHJhZ1xuXG4gICAgaWYgKCF0aGlzLmlzRHJhZ2dpbmcgJiYgdGhpcy5oYXNEcmFnU3RhcnRlZChtb3ZlVmVjdG9yKSkge1xuICAgICAgdGhpcy5fZHJhZ1N0YXJ0KGV2ZW50LCBwb2ludGVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbW92ZVZlY3RvcjtcbiAgfTsgLy8gY29uZGl0aW9uIGlmIHBvaW50ZXIgaGFzIG1vdmVkIGZhciBlbm91Z2ggdG8gc3RhcnQgZHJhZ1xuXG5cbiAgcHJvdG8uaGFzRHJhZ1N0YXJ0ZWQgPSBmdW5jdGlvbiAobW92ZVZlY3Rvcikge1xuICAgIHJldHVybiBNYXRoLmFicyhtb3ZlVmVjdG9yLngpID4gMyB8fCBNYXRoLmFicyhtb3ZlVmVjdG9yLnkpID4gMztcbiAgfTsgLy8gLS0tLS0gZW5kIGV2ZW50IC0tLS0tIC8vXG5cbiAgLyoqXG4gICAqIHBvaW50ZXIgdXBcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnRcbiAgICogQHBhcmFtIHtFdmVudCBvciBUb3VjaH0gcG9pbnRlclxuICAgKi9cblxuXG4gIHByb3RvLnBvaW50ZXJVcCA9IGZ1bmN0aW9uIChldmVudCwgcG9pbnRlcikge1xuICAgIHRoaXMuZW1pdEV2ZW50KCdwb2ludGVyVXAnLCBbZXZlbnQsIHBvaW50ZXJdKTtcblxuICAgIHRoaXMuX2RyYWdQb2ludGVyVXAoZXZlbnQsIHBvaW50ZXIpO1xuICB9O1xuXG4gIHByb3RvLl9kcmFnUG9pbnRlclVwID0gZnVuY3Rpb24gKGV2ZW50LCBwb2ludGVyKSB7XG4gICAgaWYgKHRoaXMuaXNEcmFnZ2luZykge1xuICAgICAgdGhpcy5fZHJhZ0VuZChldmVudCwgcG9pbnRlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHBvaW50ZXIgZGlkbid0IG1vdmUgZW5vdWdoIGZvciBkcmFnIHRvIHN0YXJ0XG4gICAgICB0aGlzLl9zdGF0aWNDbGljayhldmVudCwgcG9pbnRlcik7XG4gICAgfVxuICB9OyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBkcmFnIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG4gIC8vIGRyYWdTdGFydFxuXG5cbiAgcHJvdG8uX2RyYWdTdGFydCA9IGZ1bmN0aW9uIChldmVudCwgcG9pbnRlcikge1xuICAgIHRoaXMuaXNEcmFnZ2luZyA9IHRydWU7IC8vIHByZXZlbnQgY2xpY2tzXG5cbiAgICB0aGlzLmlzUHJldmVudGluZ0NsaWNrcyA9IHRydWU7XG4gICAgdGhpcy5kcmFnU3RhcnQoZXZlbnQsIHBvaW50ZXIpO1xuICB9O1xuXG4gIHByb3RvLmRyYWdTdGFydCA9IGZ1bmN0aW9uIChldmVudCwgcG9pbnRlcikge1xuICAgIHRoaXMuZW1pdEV2ZW50KCdkcmFnU3RhcnQnLCBbZXZlbnQsIHBvaW50ZXJdKTtcbiAgfTsgLy8gZHJhZ01vdmVcblxuXG4gIHByb3RvLl9kcmFnTW92ZSA9IGZ1bmN0aW9uIChldmVudCwgcG9pbnRlciwgbW92ZVZlY3Rvcikge1xuICAgIC8vIGRvIG5vdCBkcmFnIGlmIG5vdCBkcmFnZ2luZyB5ZXRcbiAgICBpZiAoIXRoaXMuaXNEcmFnZ2luZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZHJhZ01vdmUoZXZlbnQsIHBvaW50ZXIsIG1vdmVWZWN0b3IpO1xuICB9O1xuXG4gIHByb3RvLmRyYWdNb3ZlID0gZnVuY3Rpb24gKGV2ZW50LCBwb2ludGVyLCBtb3ZlVmVjdG9yKSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB0aGlzLmVtaXRFdmVudCgnZHJhZ01vdmUnLCBbZXZlbnQsIHBvaW50ZXIsIG1vdmVWZWN0b3JdKTtcbiAgfTsgLy8gZHJhZ0VuZFxuXG5cbiAgcHJvdG8uX2RyYWdFbmQgPSBmdW5jdGlvbiAoZXZlbnQsIHBvaW50ZXIpIHtcbiAgICAvLyBzZXQgZmxhZ3NcbiAgICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTsgLy8gcmUtZW5hYmxlIGNsaWNraW5nIGFzeW5jXG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmlzUHJldmVudGluZ0NsaWNrcztcbiAgICB9LmJpbmQodGhpcykpO1xuICAgIHRoaXMuZHJhZ0VuZChldmVudCwgcG9pbnRlcik7XG4gIH07XG5cbiAgcHJvdG8uZHJhZ0VuZCA9IGZ1bmN0aW9uIChldmVudCwgcG9pbnRlcikge1xuICAgIHRoaXMuZW1pdEV2ZW50KCdkcmFnRW5kJywgW2V2ZW50LCBwb2ludGVyXSk7XG4gIH07IC8vIC0tLS0tIG9uY2xpY2sgLS0tLS0gLy9cbiAgLy8gaGFuZGxlIGFsbCBjbGlja3MgYW5kIHByZXZlbnQgY2xpY2tzIHdoZW4gZHJhZ2dpbmdcblxuXG4gIHByb3RvLm9uY2xpY2sgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBpZiAodGhpcy5pc1ByZXZlbnRpbmdDbGlja3MpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICB9OyAvLyAtLS0tLSBzdGF0aWNDbGljayAtLS0tLSAvL1xuICAvLyB0cmlnZ2VyZWQgYWZ0ZXIgcG9pbnRlciBkb3duICYgdXAgd2l0aCBuby90aW55IG1vdmVtZW50XG5cblxuICBwcm90by5fc3RhdGljQ2xpY2sgPSBmdW5jdGlvbiAoZXZlbnQsIHBvaW50ZXIpIHtcbiAgICAvLyBpZ25vcmUgZW11bGF0ZWQgbW91c2UgdXAgY2xpY2tzXG4gICAgaWYgKHRoaXMuaXNJZ25vcmluZ01vdXNlVXAgJiYgZXZlbnQudHlwZSA9PSAnbW91c2V1cCcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnN0YXRpY0NsaWNrKGV2ZW50LCBwb2ludGVyKTsgLy8gc2V0IGZsYWcgZm9yIGVtdWxhdGVkIGNsaWNrcyAzMDBtcyBhZnRlciB0b3VjaGVuZFxuXG4gICAgaWYgKGV2ZW50LnR5cGUgIT0gJ21vdXNldXAnKSB7XG4gICAgICB0aGlzLmlzSWdub3JpbmdNb3VzZVVwID0gdHJ1ZTsgLy8gcmVzZXQgZmxhZyBhZnRlciAzMDBtc1xuXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuaXNJZ25vcmluZ01vdXNlVXA7XG4gICAgICB9LmJpbmQodGhpcyksIDQwMCk7XG4gICAgfVxuICB9O1xuXG4gIHByb3RvLnN0YXRpY0NsaWNrID0gZnVuY3Rpb24gKGV2ZW50LCBwb2ludGVyKSB7XG4gICAgdGhpcy5lbWl0RXZlbnQoJ3N0YXRpY0NsaWNrJywgW2V2ZW50LCBwb2ludGVyXSk7XG4gIH07IC8vIC0tLS0tIHV0aWxzIC0tLS0tIC8vXG5cblxuICBVbmlkcmFnZ2VyLmdldFBvaW50ZXJQb2ludCA9IFVuaXBvaW50ZXIuZ2V0UG9pbnRlclBvaW50OyAvLyAtLS0tLSAgLS0tLS0gLy9cblxuICByZXR1cm4gVW5pZHJhZ2dlcjtcbn0pOyAvLyBkcmFnXG5cblxuKGZ1bmN0aW9uICh3aW5kb3csIGZhY3RvcnkpIHtcbiAgLy8gdW5pdmVyc2FsIG1vZHVsZSBkZWZpbml0aW9uXG5cbiAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EXG4gICAgZGVmaW5lKCdmbGlja2l0eS9qcy9kcmFnJywgWycuL2ZsaWNraXR5JywgJ3VuaWRyYWdnZXIvdW5pZHJhZ2dlcicsICdmaXp6eS11aS11dGlscy91dGlscyddLCBmdW5jdGlvbiAoRmxpY2tpdHksIFVuaWRyYWdnZXIsIHV0aWxzKSB7XG4gICAgICByZXR1cm4gZmFjdG9yeSh3aW5kb3csIEZsaWNraXR5LCBVbmlkcmFnZ2VyLCB1dGlscyk7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBtb2R1bGUgPT09IFwidW5kZWZpbmVkXCIgPyBcInVuZGVmaW5lZFwiIDogX3R5cGVvZihtb2R1bGUpKSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHdpbmRvdywgcmVxdWlyZSgnLi9mbGlja2l0eScpLCByZXF1aXJlKCd1bmlkcmFnZ2VyJyksIHJlcXVpcmUoJ2Zpenp5LXVpLXV0aWxzJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIGJyb3dzZXIgZ2xvYmFsXG4gICAgd2luZG93LkZsaWNraXR5ID0gZmFjdG9yeSh3aW5kb3csIHdpbmRvdy5GbGlja2l0eSwgd2luZG93LlVuaWRyYWdnZXIsIHdpbmRvdy5maXp6eVVJVXRpbHMpO1xuICB9XG59KSh3aW5kb3csIGZ1bmN0aW9uIGZhY3Rvcnkod2luZG93LCBGbGlja2l0eSwgVW5pZHJhZ2dlciwgdXRpbHMpIHtcbiAgLy8gLS0tLS0gZGVmYXVsdHMgLS0tLS0gLy9cbiAgdXRpbHMuZXh0ZW5kKEZsaWNraXR5LmRlZmF1bHRzLCB7XG4gICAgZHJhZ2dhYmxlOiAnPjEnLFxuICAgIGRyYWdUaHJlc2hvbGQ6IDNcbiAgfSk7IC8vIC0tLS0tIGNyZWF0ZSAtLS0tLSAvL1xuXG4gIEZsaWNraXR5LmNyZWF0ZU1ldGhvZHMucHVzaCgnX2NyZWF0ZURyYWcnKTsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gZHJhZyBwcm90b3R5cGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cblxuICB2YXIgcHJvdG8gPSBGbGlja2l0eS5wcm90b3R5cGU7XG4gIHV0aWxzLmV4dGVuZChwcm90bywgVW5pZHJhZ2dlci5wcm90b3R5cGUpO1xuICBwcm90by5fdG91Y2hBY3Rpb25WYWx1ZSA9ICdwYW4teSc7IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG4gIHZhciBpc1RvdWNoID0gJ2NyZWF0ZVRvdWNoJyBpbiBkb2N1bWVudDtcbiAgdmFyIGlzVG91Y2htb3ZlU2Nyb2xsQ2FuY2VsZWQgPSBmYWxzZTtcblxuICBwcm90by5fY3JlYXRlRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLm9uKCdhY3RpdmF0ZScsIHRoaXMub25BY3RpdmF0ZURyYWcpO1xuICAgIHRoaXMub24oJ3VpQ2hhbmdlJywgdGhpcy5fdWlDaGFuZ2VEcmFnKTtcbiAgICB0aGlzLm9uKCdkZWFjdGl2YXRlJywgdGhpcy5vbkRlYWN0aXZhdGVEcmFnKTtcbiAgICB0aGlzLm9uKCdjZWxsQ2hhbmdlJywgdGhpcy51cGRhdGVEcmFnZ2FibGUpOyAvLyBUT0RPIHVwZGF0ZURyYWdnYWJsZSBvbiByZXNpemU/IGlmIGdyb3VwQ2VsbHMgJiBzbGlkZXMgY2hhbmdlXG4gICAgLy8gSEFDSyAtIGFkZCBzZWVtaW5nbHkgaW5ub2N1b3VzIGhhbmRsZXIgdG8gZml4IGlPUyAxMCBzY3JvbGwgYmVoYXZpb3JcbiAgICAvLyAjNDU3LCBSdWJhWGEvU29ydGFibGUjOTczXG5cbiAgICBpZiAoaXNUb3VjaCAmJiAhaXNUb3VjaG1vdmVTY3JvbGxDYW5jZWxlZCkge1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIGZ1bmN0aW9uICgpIHt9KTtcbiAgICAgIGlzVG91Y2htb3ZlU2Nyb2xsQ2FuY2VsZWQgPSB0cnVlO1xuICAgIH1cbiAgfTtcblxuICBwcm90by5vbkFjdGl2YXRlRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmhhbmRsZXMgPSBbdGhpcy52aWV3cG9ydF07XG4gICAgdGhpcy5iaW5kSGFuZGxlcygpO1xuICAgIHRoaXMudXBkYXRlRHJhZ2dhYmxlKCk7XG4gIH07XG5cbiAgcHJvdG8ub25EZWFjdGl2YXRlRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnVuYmluZEhhbmRsZXMoKTtcbiAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnaXMtZHJhZ2dhYmxlJyk7XG4gIH07XG5cbiAgcHJvdG8udXBkYXRlRHJhZ2dhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGRpc2FibGUgZHJhZ2dpbmcgaWYgbGVzcyB0aGFuIDIgc2xpZGVzLiAjMjc4XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kcmFnZ2FibGUgPT0gJz4xJykge1xuICAgICAgdGhpcy5pc0RyYWdnYWJsZSA9IHRoaXMuc2xpZGVzLmxlbmd0aCA+IDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaXNEcmFnZ2FibGUgPSB0aGlzLm9wdGlvbnMuZHJhZ2dhYmxlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzRHJhZ2dhYmxlKSB7XG4gICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnaXMtZHJhZ2dhYmxlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdpcy1kcmFnZ2FibGUnKTtcbiAgICB9XG4gIH07IC8vIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XG5cblxuICBwcm90by5iaW5kRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLm9wdGlvbnMuZHJhZ2dhYmxlID0gdHJ1ZTtcbiAgICB0aGlzLnVwZGF0ZURyYWdnYWJsZSgpO1xuICB9O1xuXG4gIHByb3RvLnVuYmluZERyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5vcHRpb25zLmRyYWdnYWJsZSA9IGZhbHNlO1xuICAgIHRoaXMudXBkYXRlRHJhZ2dhYmxlKCk7XG4gIH07XG5cbiAgcHJvdG8uX3VpQ2hhbmdlRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICBkZWxldGUgdGhpcy5pc0ZyZWVTY3JvbGxpbmc7XG4gIH07IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIHBvaW50ZXIgZXZlbnRzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cblxuICBwcm90by5wb2ludGVyRG93biA9IGZ1bmN0aW9uIChldmVudCwgcG9pbnRlcikge1xuICAgIGlmICghdGhpcy5pc0RyYWdnYWJsZSkge1xuICAgICAgdGhpcy5fcG9pbnRlckRvd25EZWZhdWx0KGV2ZW50LCBwb2ludGVyKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBpc09rYXkgPSB0aGlzLm9rYXlQb2ludGVyRG93bihldmVudCk7XG5cbiAgICBpZiAoIWlzT2theSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3BvaW50ZXJEb3duUHJldmVudERlZmF1bHQoZXZlbnQpO1xuXG4gICAgdGhpcy5wb2ludGVyRG93bkZvY3VzKGV2ZW50KTsgLy8gYmx1clxuXG4gICAgaWYgKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgIT0gdGhpcy5lbGVtZW50KSB7XG4gICAgICAvLyBkbyBub3QgYmx1ciBpZiBhbHJlYWR5IGZvY3VzZWRcbiAgICAgIHRoaXMucG9pbnRlckRvd25CbHVyKCk7XG4gICAgfSAvLyBzdG9wIGlmIGl0IHdhcyBtb3ZpbmdcblxuXG4gICAgdGhpcy5kcmFnWCA9IHRoaXMueDtcbiAgICB0aGlzLnZpZXdwb3J0LmNsYXNzTGlzdC5hZGQoJ2lzLXBvaW50ZXItZG93bicpOyAvLyB0cmFjayBzY3JvbGxpbmdcblxuICAgIHRoaXMucG9pbnRlckRvd25TY3JvbGwgPSBnZXRTY3JvbGxQb3NpdGlvbigpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCB0aGlzKTtcblxuICAgIHRoaXMuX3BvaW50ZXJEb3duRGVmYXVsdChldmVudCwgcG9pbnRlcik7XG4gIH07IC8vIGRlZmF1bHQgcG9pbnRlckRvd24gbG9naWMsIHVzZWQgZm9yIHN0YXRpY0NsaWNrXG5cblxuICBwcm90by5fcG9pbnRlckRvd25EZWZhdWx0ID0gZnVuY3Rpb24gKGV2ZW50LCBwb2ludGVyKSB7XG4gICAgLy8gdHJhY2sgc3RhcnQgZXZlbnQgcG9zaXRpb25cbiAgICAvLyBTYWZhcmkgOSBvdmVycmlkZXMgcGFnZVggYW5kIHBhZ2VZLiBUaGVzZSB2YWx1ZXMgbmVlZHMgdG8gYmUgY29waWVkLiAjNzc5XG4gICAgdGhpcy5wb2ludGVyRG93blBvaW50ZXIgPSB7XG4gICAgICBwYWdlWDogcG9pbnRlci5wYWdlWCxcbiAgICAgIHBhZ2VZOiBwb2ludGVyLnBhZ2VZXG4gICAgfTsgLy8gYmluZCBtb3ZlIGFuZCBlbmQgZXZlbnRzXG5cbiAgICB0aGlzLl9iaW5kUG9zdFN0YXJ0RXZlbnRzKGV2ZW50KTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgncG9pbnRlckRvd24nLCBldmVudCwgW3BvaW50ZXJdKTtcbiAgfTtcblxuICB2YXIgZm9jdXNOb2RlcyA9IHtcbiAgICBJTlBVVDogdHJ1ZSxcbiAgICBURVhUQVJFQTogdHJ1ZSxcbiAgICBTRUxFQ1Q6IHRydWVcbiAgfTtcblxuICBwcm90by5wb2ludGVyRG93bkZvY3VzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdmFyIGlzRm9jdXNOb2RlID0gZm9jdXNOb2Rlc1tldmVudC50YXJnZXQubm9kZU5hbWVdO1xuXG4gICAgaWYgKCFpc0ZvY3VzTm9kZSkge1xuICAgICAgdGhpcy5mb2N1cygpO1xuICAgIH1cbiAgfTtcblxuICBwcm90by5fcG9pbnRlckRvd25QcmV2ZW50RGVmYXVsdCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciBpc1RvdWNoU3RhcnQgPSBldmVudC50eXBlID09ICd0b3VjaHN0YXJ0JztcbiAgICB2YXIgaXNUb3VjaFBvaW50ZXIgPSBldmVudC5wb2ludGVyVHlwZSA9PSAndG91Y2gnO1xuICAgIHZhciBpc0ZvY3VzTm9kZSA9IGZvY3VzTm9kZXNbZXZlbnQudGFyZ2V0Lm5vZGVOYW1lXTtcblxuICAgIGlmICghaXNUb3VjaFN0YXJ0ICYmICFpc1RvdWNoUG9pbnRlciAmJiAhaXNGb2N1c05vZGUpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuICB9OyAvLyAtLS0tLSBtb3ZlIC0tLS0tIC8vXG5cblxuICBwcm90by5oYXNEcmFnU3RhcnRlZCA9IGZ1bmN0aW9uIChtb3ZlVmVjdG9yKSB7XG4gICAgcmV0dXJuIE1hdGguYWJzKG1vdmVWZWN0b3IueCkgPiB0aGlzLm9wdGlvbnMuZHJhZ1RocmVzaG9sZDtcbiAgfTsgLy8gLS0tLS0gdXAgLS0tLS0gLy9cblxuXG4gIHByb3RvLnBvaW50ZXJVcCA9IGZ1bmN0aW9uIChldmVudCwgcG9pbnRlcikge1xuICAgIGRlbGV0ZSB0aGlzLmlzVG91Y2hTY3JvbGxpbmc7XG4gICAgdGhpcy52aWV3cG9ydC5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wb2ludGVyLWRvd24nKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3BvaW50ZXJVcCcsIGV2ZW50LCBbcG9pbnRlcl0pO1xuXG4gICAgdGhpcy5fZHJhZ1BvaW50ZXJVcChldmVudCwgcG9pbnRlcik7XG4gIH07XG5cbiAgcHJvdG8ucG9pbnRlckRvbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMpO1xuICAgIGRlbGV0ZSB0aGlzLnBvaW50ZXJEb3duU2Nyb2xsO1xuICB9OyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBkcmFnZ2luZyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG5cbiAgcHJvdG8uZHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKGV2ZW50LCBwb2ludGVyKSB7XG4gICAgaWYgKCF0aGlzLmlzRHJhZ2dhYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5kcmFnU3RhcnRQb3NpdGlvbiA9IHRoaXMueDtcbiAgICB0aGlzLnN0YXJ0QW5pbWF0aW9uKCk7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnZHJhZ1N0YXJ0JywgZXZlbnQsIFtwb2ludGVyXSk7XG4gIH07XG5cbiAgcHJvdG8ucG9pbnRlck1vdmUgPSBmdW5jdGlvbiAoZXZlbnQsIHBvaW50ZXIpIHtcbiAgICB2YXIgbW92ZVZlY3RvciA9IHRoaXMuX2RyYWdQb2ludGVyTW92ZShldmVudCwgcG9pbnRlcik7XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3BvaW50ZXJNb3ZlJywgZXZlbnQsIFtwb2ludGVyLCBtb3ZlVmVjdG9yXSk7XG5cbiAgICB0aGlzLl9kcmFnTW92ZShldmVudCwgcG9pbnRlciwgbW92ZVZlY3Rvcik7XG4gIH07XG5cbiAgcHJvdG8uZHJhZ01vdmUgPSBmdW5jdGlvbiAoZXZlbnQsIHBvaW50ZXIsIG1vdmVWZWN0b3IpIHtcbiAgICBpZiAoIXRoaXMuaXNEcmFnZ2FibGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHRoaXMucHJldmlvdXNEcmFnWCA9IHRoaXMuZHJhZ1g7IC8vIHJldmVyc2UgaWYgcmlnaHQtdG8tbGVmdFxuXG4gICAgdmFyIGRpcmVjdGlvbiA9IHRoaXMub3B0aW9ucy5yaWdodFRvTGVmdCA/IC0xIDogMTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMud3JhcEFyb3VuZCkge1xuICAgICAgLy8gd3JhcCBhcm91bmQgbW92ZS4gIzU4OVxuICAgICAgbW92ZVZlY3Rvci54ID0gbW92ZVZlY3Rvci54ICUgdGhpcy5zbGlkZWFibGVXaWR0aDtcbiAgICB9XG5cbiAgICB2YXIgZHJhZ1ggPSB0aGlzLmRyYWdTdGFydFBvc2l0aW9uICsgbW92ZVZlY3Rvci54ICogZGlyZWN0aW9uO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMud3JhcEFyb3VuZCAmJiB0aGlzLnNsaWRlcy5sZW5ndGgpIHtcbiAgICAgIC8vIHNsb3cgZHJhZ1xuICAgICAgdmFyIG9yaWdpbkJvdW5kID0gTWF0aC5tYXgoLXRoaXMuc2xpZGVzWzBdLnRhcmdldCwgdGhpcy5kcmFnU3RhcnRQb3NpdGlvbik7XG4gICAgICBkcmFnWCA9IGRyYWdYID4gb3JpZ2luQm91bmQgPyAoZHJhZ1ggKyBvcmlnaW5Cb3VuZCkgKiAwLjUgOiBkcmFnWDtcbiAgICAgIHZhciBlbmRCb3VuZCA9IE1hdGgubWluKC10aGlzLmdldExhc3RTbGlkZSgpLnRhcmdldCwgdGhpcy5kcmFnU3RhcnRQb3NpdGlvbik7XG4gICAgICBkcmFnWCA9IGRyYWdYIDwgZW5kQm91bmQgPyAoZHJhZ1ggKyBlbmRCb3VuZCkgKiAwLjUgOiBkcmFnWDtcbiAgICB9XG5cbiAgICB0aGlzLmRyYWdYID0gZHJhZ1g7XG4gICAgdGhpcy5kcmFnTW92ZVRpbWUgPSBuZXcgRGF0ZSgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnZHJhZ01vdmUnLCBldmVudCwgW3BvaW50ZXIsIG1vdmVWZWN0b3JdKTtcbiAgfTtcblxuICBwcm90by5kcmFnRW5kID0gZnVuY3Rpb24gKGV2ZW50LCBwb2ludGVyKSB7XG4gICAgaWYgKCF0aGlzLmlzRHJhZ2dhYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5mcmVlU2Nyb2xsKSB7XG4gICAgICB0aGlzLmlzRnJlZVNjcm9sbGluZyA9IHRydWU7XG4gICAgfSAvLyBzZXQgc2VsZWN0ZWRJbmRleCBiYXNlZCBvbiB3aGVyZSBmbGljayB3aWxsIGVuZCB1cFxuXG5cbiAgICB2YXIgaW5kZXggPSB0aGlzLmRyYWdFbmRSZXN0aW5nU2VsZWN0KCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmZyZWVTY3JvbGwgJiYgIXRoaXMub3B0aW9ucy53cmFwQXJvdW5kKSB7XG4gICAgICAvLyBpZiBmcmVlLXNjcm9sbCAmIG5vdCB3cmFwIGFyb3VuZFxuICAgICAgLy8gZG8gbm90IGZyZWUtc2Nyb2xsIGlmIGdvaW5nIG91dHNpZGUgb2YgYm91bmRpbmcgc2xpZGVzXG4gICAgICAvLyBzbyBib3VuZGluZyBzbGlkZXMgY2FuIGF0dHJhY3Qgc2xpZGVyLCBhbmQga2VlcCBpdCBpbiBib3VuZHNcbiAgICAgIHZhciByZXN0aW5nWCA9IHRoaXMuZ2V0UmVzdGluZ1Bvc2l0aW9uKCk7XG4gICAgICB0aGlzLmlzRnJlZVNjcm9sbGluZyA9IC1yZXN0aW5nWCA+IHRoaXMuc2xpZGVzWzBdLnRhcmdldCAmJiAtcmVzdGluZ1ggPCB0aGlzLmdldExhc3RTbGlkZSgpLnRhcmdldDtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLm9wdGlvbnMuZnJlZVNjcm9sbCAmJiBpbmRleCA9PSB0aGlzLnNlbGVjdGVkSW5kZXgpIHtcbiAgICAgIC8vIGJvb3N0IHNlbGVjdGlvbiBpZiBzZWxlY3RlZCBpbmRleCBoYXMgbm90IGNoYW5nZWRcbiAgICAgIGluZGV4ICs9IHRoaXMuZHJhZ0VuZEJvb3N0U2VsZWN0KCk7XG4gICAgfVxuXG4gICAgZGVsZXRlIHRoaXMucHJldmlvdXNEcmFnWDsgLy8gYXBwbHkgc2VsZWN0aW9uXG4gICAgLy8gVE9ETyByZWZhY3RvciB0aGlzLCBzZWxlY3RpbmcgaGVyZSBmZWVscyB3ZWlyZFxuICAgIC8vIEhBQ0ssIHNldCBmbGFnIHNvIGRyYWdnaW5nIHN0YXlzIGluIGNvcnJlY3QgZGlyZWN0aW9uXG5cbiAgICB0aGlzLmlzRHJhZ1NlbGVjdCA9IHRoaXMub3B0aW9ucy53cmFwQXJvdW5kO1xuICAgIHRoaXMuc2VsZWN0KGluZGV4KTtcbiAgICBkZWxldGUgdGhpcy5pc0RyYWdTZWxlY3Q7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdkcmFnRW5kJywgZXZlbnQsIFtwb2ludGVyXSk7XG4gIH07XG5cbiAgcHJvdG8uZHJhZ0VuZFJlc3RpbmdTZWxlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlc3RpbmdYID0gdGhpcy5nZXRSZXN0aW5nUG9zaXRpb24oKTsgLy8gaG93IGZhciBhd2F5IGZyb20gc2VsZWN0ZWQgc2xpZGVcblxuICAgIHZhciBkaXN0YW5jZSA9IE1hdGguYWJzKHRoaXMuZ2V0U2xpZGVEaXN0YW5jZSgtcmVzdGluZ1gsIHRoaXMuc2VsZWN0ZWRJbmRleCkpOyAvLyBnZXQgY2xvc2V0IHJlc3RpbmcgZ29pbmcgdXAgYW5kIGdvaW5nIGRvd25cblxuICAgIHZhciBwb3NpdGl2ZVJlc3RpbmcgPSB0aGlzLl9nZXRDbG9zZXN0UmVzdGluZyhyZXN0aW5nWCwgZGlzdGFuY2UsIDEpO1xuXG4gICAgdmFyIG5lZ2F0aXZlUmVzdGluZyA9IHRoaXMuX2dldENsb3Nlc3RSZXN0aW5nKHJlc3RpbmdYLCBkaXN0YW5jZSwgLTEpOyAvLyB1c2UgY2xvc2VyIHJlc3RpbmcgZm9yIHdyYXAtYXJvdW5kXG5cblxuICAgIHZhciBpbmRleCA9IHBvc2l0aXZlUmVzdGluZy5kaXN0YW5jZSA8IG5lZ2F0aXZlUmVzdGluZy5kaXN0YW5jZSA/IHBvc2l0aXZlUmVzdGluZy5pbmRleCA6IG5lZ2F0aXZlUmVzdGluZy5pbmRleDtcbiAgICByZXR1cm4gaW5kZXg7XG4gIH07XG4gIC8qKlxuICAgKiBnaXZlbiByZXN0aW5nIFggYW5kIGRpc3RhbmNlIHRvIHNlbGVjdGVkIGNlbGxcbiAgICogZ2V0IHRoZSBkaXN0YW5jZSBhbmQgaW5kZXggb2YgdGhlIGNsb3Nlc3QgY2VsbFxuICAgKiBAcGFyYW0ge051bWJlcn0gcmVzdGluZ1ggLSBlc3RpbWF0ZWQgcG9zdC1mbGljayByZXN0aW5nIHBvc2l0aW9uXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkaXN0YW5jZSAtIGRpc3RhbmNlIHRvIHNlbGVjdGVkIGNlbGxcbiAgICogQHBhcmFtIHtJbnRlZ2VyfSBpbmNyZW1lbnQgLSArMSBvciAtMSwgZ29pbmcgdXAgb3IgZG93blxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIHsgZGlzdGFuY2U6IHtOdW1iZXJ9LCBpbmRleDoge0ludGVnZXJ9IH1cbiAgICovXG5cblxuICBwcm90by5fZ2V0Q2xvc2VzdFJlc3RpbmcgPSBmdW5jdGlvbiAocmVzdGluZ1gsIGRpc3RhbmNlLCBpbmNyZW1lbnQpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLnNlbGVjdGVkSW5kZXg7XG4gICAgdmFyIG1pbkRpc3RhbmNlID0gSW5maW5pdHk7XG4gICAgdmFyIGNvbmRpdGlvbiA9IHRoaXMub3B0aW9ucy5jb250YWluICYmICF0aGlzLm9wdGlvbnMud3JhcEFyb3VuZCA/IC8vIGlmIGNvbnRhaW4sIGtlZXAgZ29pbmcgaWYgZGlzdGFuY2UgaXMgZXF1YWwgdG8gbWluRGlzdGFuY2VcbiAgICBmdW5jdGlvbiAoZCwgbWQpIHtcbiAgICAgIHJldHVybiBkIDw9IG1kO1xuICAgIH0gOiBmdW5jdGlvbiAoZCwgbWQpIHtcbiAgICAgIHJldHVybiBkIDwgbWQ7XG4gICAgfTtcblxuICAgIHdoaWxlIChjb25kaXRpb24oZGlzdGFuY2UsIG1pbkRpc3RhbmNlKSkge1xuICAgICAgLy8gbWVhc3VyZSBkaXN0YW5jZSB0byBuZXh0IGNlbGxcbiAgICAgIGluZGV4ICs9IGluY3JlbWVudDtcbiAgICAgIG1pbkRpc3RhbmNlID0gZGlzdGFuY2U7XG4gICAgICBkaXN0YW5jZSA9IHRoaXMuZ2V0U2xpZGVEaXN0YW5jZSgtcmVzdGluZ1gsIGluZGV4KTtcblxuICAgICAgaWYgKGRpc3RhbmNlID09PSBudWxsKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBkaXN0YW5jZSA9IE1hdGguYWJzKGRpc3RhbmNlKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgZGlzdGFuY2U6IG1pbkRpc3RhbmNlLFxuICAgICAgLy8gc2VsZWN0ZWQgd2FzIHByZXZpb3VzIGluZGV4XG4gICAgICBpbmRleDogaW5kZXggLSBpbmNyZW1lbnRcbiAgICB9O1xuICB9O1xuICAvKipcbiAgICogbWVhc3VyZSBkaXN0YW5jZSBiZXR3ZWVuIHggYW5kIGEgc2xpZGUgdGFyZ2V0XG4gICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAqIEBwYXJhbSB7SW50ZWdlcn0gaW5kZXggLSBzbGlkZSBpbmRleFxuICAgKi9cblxuXG4gIHByb3RvLmdldFNsaWRlRGlzdGFuY2UgPSBmdW5jdGlvbiAoeCwgaW5kZXgpIHtcbiAgICB2YXIgbGVuID0gdGhpcy5zbGlkZXMubGVuZ3RoOyAvLyB3cmFwIGFyb3VuZCBpZiBhdCBsZWFzdCAyIHNsaWRlc1xuXG4gICAgdmFyIGlzV3JhcEFyb3VuZCA9IHRoaXMub3B0aW9ucy53cmFwQXJvdW5kICYmIGxlbiA+IDE7XG4gICAgdmFyIHNsaWRlSW5kZXggPSBpc1dyYXBBcm91bmQgPyB1dGlscy5tb2R1bG8oaW5kZXgsIGxlbikgOiBpbmRleDtcbiAgICB2YXIgc2xpZGUgPSB0aGlzLnNsaWRlc1tzbGlkZUluZGV4XTtcblxuICAgIGlmICghc2xpZGUpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gLy8gYWRkIGRpc3RhbmNlIGZvciB3cmFwLWFyb3VuZCBzbGlkZXNcblxuXG4gICAgdmFyIHdyYXAgPSBpc1dyYXBBcm91bmQgPyB0aGlzLnNsaWRlYWJsZVdpZHRoICogTWF0aC5mbG9vcihpbmRleCAvIGxlbikgOiAwO1xuICAgIHJldHVybiB4IC0gKHNsaWRlLnRhcmdldCArIHdyYXApO1xuICB9O1xuXG4gIHByb3RvLmRyYWdFbmRCb29zdFNlbGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBkbyBub3QgYm9vc3QgaWYgbm8gcHJldmlvdXNEcmFnWCBvciBkcmFnTW92ZVRpbWVcbiAgICBpZiAodGhpcy5wcmV2aW91c0RyYWdYID09PSB1bmRlZmluZWQgfHwgIXRoaXMuZHJhZ01vdmVUaW1lIHx8IC8vIG9yIGlmIGRyYWcgd2FzIGhlbGQgZm9yIDEwMCBtc1xuICAgIG5ldyBEYXRlKCkgLSB0aGlzLmRyYWdNb3ZlVGltZSA+IDEwMCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgdmFyIGRpc3RhbmNlID0gdGhpcy5nZXRTbGlkZURpc3RhbmNlKC10aGlzLmRyYWdYLCB0aGlzLnNlbGVjdGVkSW5kZXgpO1xuICAgIHZhciBkZWx0YSA9IHRoaXMucHJldmlvdXNEcmFnWCAtIHRoaXMuZHJhZ1g7XG5cbiAgICBpZiAoZGlzdGFuY2UgPiAwICYmIGRlbHRhID4gMCkge1xuICAgICAgLy8gYm9vc3QgdG8gbmV4dCBpZiBtb3ZpbmcgdG93YXJkcyB0aGUgcmlnaHQsIGFuZCBwb3NpdGl2ZSB2ZWxvY2l0eVxuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmIChkaXN0YW5jZSA8IDAgJiYgZGVsdGEgPCAwKSB7XG4gICAgICAvLyBib29zdCB0byBwcmV2aW91cyBpZiBtb3ZpbmcgdG93YXJkcyB0aGUgbGVmdCwgYW5kIG5lZ2F0aXZlIHZlbG9jaXR5XG4gICAgICByZXR1cm4gLTE7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH07IC8vIC0tLS0tIHN0YXRpY0NsaWNrIC0tLS0tIC8vXG5cblxuICBwcm90by5zdGF0aWNDbGljayA9IGZ1bmN0aW9uIChldmVudCwgcG9pbnRlcikge1xuICAgIC8vIGdldCBjbGlja2VkQ2VsbCwgaWYgY2VsbCB3YXMgY2xpY2tlZFxuICAgIHZhciBjbGlja2VkQ2VsbCA9IHRoaXMuZ2V0UGFyZW50Q2VsbChldmVudC50YXJnZXQpO1xuICAgIHZhciBjZWxsRWxlbSA9IGNsaWNrZWRDZWxsICYmIGNsaWNrZWRDZWxsLmVsZW1lbnQ7XG4gICAgdmFyIGNlbGxJbmRleCA9IGNsaWNrZWRDZWxsICYmIHRoaXMuY2VsbHMuaW5kZXhPZihjbGlja2VkQ2VsbCk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzdGF0aWNDbGljaycsIGV2ZW50LCBbcG9pbnRlciwgY2VsbEVsZW0sIGNlbGxJbmRleF0pO1xuICB9OyAvLyAtLS0tLSBzY3JvbGwgLS0tLS0gLy9cblxuXG4gIHByb3RvLm9uc2Nyb2xsID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzY3JvbGwgPSBnZXRTY3JvbGxQb3NpdGlvbigpO1xuICAgIHZhciBzY3JvbGxNb3ZlWCA9IHRoaXMucG9pbnRlckRvd25TY3JvbGwueCAtIHNjcm9sbC54O1xuICAgIHZhciBzY3JvbGxNb3ZlWSA9IHRoaXMucG9pbnRlckRvd25TY3JvbGwueSAtIHNjcm9sbC55OyAvLyBjYW5jZWwgY2xpY2svdGFwIGlmIHNjcm9sbCBpcyB0b28gbXVjaFxuXG4gICAgaWYgKE1hdGguYWJzKHNjcm9sbE1vdmVYKSA+IDMgfHwgTWF0aC5hYnMoc2Nyb2xsTW92ZVkpID4gMykge1xuICAgICAgdGhpcy5fcG9pbnRlckRvbmUoKTtcbiAgICB9XG4gIH07IC8vIC0tLS0tIHV0aWxzIC0tLS0tIC8vXG5cblxuICBmdW5jdGlvbiBnZXRTY3JvbGxQb3NpdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgeDogd2luZG93LnBhZ2VYT2Zmc2V0LFxuICAgICAgeTogd2luZG93LnBhZ2VZT2Zmc2V0XG4gICAgfTtcbiAgfSAvLyAtLS0tLSAgLS0tLS0gLy9cblxuXG4gIHJldHVybiBGbGlja2l0eTtcbn0pOyAvLyBwcmV2L25leHQgYnV0dG9uc1xuXG5cbihmdW5jdGlvbiAod2luZG93LCBmYWN0b3J5KSB7XG4gIC8vIHVuaXZlcnNhbCBtb2R1bGUgZGVmaW5pdGlvblxuXG4gIC8qIGpzaGludCBzdHJpY3Q6IGZhbHNlICovXG4gIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRFxuICAgIGRlZmluZSgnZmxpY2tpdHkvanMvcHJldi1uZXh0LWJ1dHRvbicsIFsnLi9mbGlja2l0eScsICd1bmlwb2ludGVyL3VuaXBvaW50ZXInLCAnZml6enktdWktdXRpbHMvdXRpbHMnXSwgZnVuY3Rpb24gKEZsaWNraXR5LCBVbmlwb2ludGVyLCB1dGlscykge1xuICAgICAgcmV0dXJuIGZhY3Rvcnkod2luZG93LCBGbGlja2l0eSwgVW5pcG9pbnRlciwgdXRpbHMpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgbW9kdWxlID09PSBcInVuZGVmaW5lZFwiID8gXCJ1bmRlZmluZWRcIiA6IF90eXBlb2YobW9kdWxlKSkgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSh3aW5kb3csIHJlcXVpcmUoJy4vZmxpY2tpdHknKSwgcmVxdWlyZSgndW5pcG9pbnRlcicpLCByZXF1aXJlKCdmaXp6eS11aS11dGlscycpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBicm93c2VyIGdsb2JhbFxuICAgIGZhY3Rvcnkod2luZG93LCB3aW5kb3cuRmxpY2tpdHksIHdpbmRvdy5Vbmlwb2ludGVyLCB3aW5kb3cuZml6enlVSVV0aWxzKTtcbiAgfVxufSkod2luZG93LCBmdW5jdGlvbiBmYWN0b3J5KHdpbmRvdywgRmxpY2tpdHksIFVuaXBvaW50ZXIsIHV0aWxzKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgc3ZnVVJJID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJzsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gUHJldk5leHRCdXR0b24gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cblxuICBmdW5jdGlvbiBQcmV2TmV4dEJ1dHRvbihkaXJlY3Rpb24sIHBhcmVudCkge1xuICAgIHRoaXMuZGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuXG4gICAgdGhpcy5fY3JlYXRlKCk7XG4gIH1cblxuICBQcmV2TmV4dEJ1dHRvbi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFVuaXBvaW50ZXIucHJvdG90eXBlKTtcblxuICBQcmV2TmV4dEJ1dHRvbi5wcm90b3R5cGUuX2NyZWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBwcm9wZXJ0aWVzXG4gICAgdGhpcy5pc0VuYWJsZWQgPSB0cnVlO1xuICAgIHRoaXMuaXNQcmV2aW91cyA9IHRoaXMuZGlyZWN0aW9uID09IC0xO1xuICAgIHZhciBsZWZ0RGlyZWN0aW9uID0gdGhpcy5wYXJlbnQub3B0aW9ucy5yaWdodFRvTGVmdCA/IDEgOiAtMTtcbiAgICB0aGlzLmlzTGVmdCA9IHRoaXMuZGlyZWN0aW9uID09IGxlZnREaXJlY3Rpb247XG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICBlbGVtZW50LmNsYXNzTmFtZSA9ICdmbGlja2l0eS1idXR0b24gZmxpY2tpdHktcHJldi1uZXh0LWJ1dHRvbic7XG4gICAgZWxlbWVudC5jbGFzc05hbWUgKz0gdGhpcy5pc1ByZXZpb3VzID8gJyBwcmV2aW91cycgOiAnIG5leHQnOyAvLyBwcmV2ZW50IGJ1dHRvbiBmcm9tIHN1Ym1pdHRpbmcgZm9ybSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xMDgzNjA3Ni8xODIxODNcblxuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCd0eXBlJywgJ2J1dHRvbicpOyAvLyBpbml0IGFzIGRpc2FibGVkXG5cbiAgICB0aGlzLmRpc2FibGUoKTtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsIHRoaXMuaXNQcmV2aW91cyA/ICdQcmV2aW91cycgOiAnTmV4dCcpOyAvLyBjcmVhdGUgYXJyb3dcblxuICAgIHZhciBzdmcgPSB0aGlzLmNyZWF0ZVNWRygpO1xuICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQoc3ZnKTsgLy8gZXZlbnRzXG5cbiAgICB0aGlzLnBhcmVudC5vbignc2VsZWN0JywgdGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5vbigncG9pbnRlckRvd24nLCB0aGlzLnBhcmVudC5jaGlsZFVJUG9pbnRlckRvd24uYmluZCh0aGlzLnBhcmVudCkpO1xuICB9O1xuXG4gIFByZXZOZXh0QnV0dG9uLnByb3RvdHlwZS5hY3RpdmF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmJpbmRTdGFydEV2ZW50KHRoaXMuZWxlbWVudCk7XG4gICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcyk7IC8vIGFkZCB0byBET01cblxuICAgIHRoaXMucGFyZW50LmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgfTtcblxuICBQcmV2TmV4dEJ1dHRvbi5wcm90b3R5cGUuZGVhY3RpdmF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyByZW1vdmUgZnJvbSBET01cbiAgICB0aGlzLnBhcmVudC5lbGVtZW50LnJlbW92ZUNoaWxkKHRoaXMuZWxlbWVudCk7IC8vIGNsaWNrIGV2ZW50c1xuXG4gICAgdGhpcy51bmJpbmRTdGFydEV2ZW50KHRoaXMuZWxlbWVudCk7XG4gICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcyk7XG4gIH07XG5cbiAgUHJldk5leHRCdXR0b24ucHJvdG90eXBlLmNyZWF0ZVNWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHN2Z1VSSSwgJ3N2ZycpO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2ZsaWNraXR5LWJ1dHRvbi1pY29uJyk7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgndmlld0JveCcsICcwIDAgMTAwIDEwMCcpO1xuICAgIHZhciBwYXRoID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHN2Z1VSSSwgJ3BhdGgnKTtcbiAgICB2YXIgcGF0aE1vdmVtZW50cyA9IGdldEFycm93TW92ZW1lbnRzKHRoaXMucGFyZW50Lm9wdGlvbnMuYXJyb3dTaGFwZSk7XG4gICAgcGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoTW92ZW1lbnRzKTtcbiAgICBwYXRoLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnYXJyb3cnKTsgLy8gcm90YXRlIGFycm93XG5cbiAgICBpZiAoIXRoaXMuaXNMZWZ0KSB7XG4gICAgICBwYXRoLnNldEF0dHJpYnV0ZSgndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgxMDAsIDEwMCkgcm90YXRlKDE4MCkgJyk7XG4gICAgfVxuXG4gICAgc3ZnLmFwcGVuZENoaWxkKHBhdGgpO1xuICAgIHJldHVybiBzdmc7XG4gIH07IC8vIGdldCBTVkcgcGF0aCBtb3ZtZW1lbnRcblxuXG4gIGZ1bmN0aW9uIGdldEFycm93TW92ZW1lbnRzKHNoYXBlKSB7XG4gICAgLy8gdXNlIHNoYXBlIGFzIG1vdmVtZW50IGlmIHN0cmluZ1xuICAgIGlmICh0eXBlb2Ygc2hhcGUgPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBzaGFwZTtcbiAgICB9IC8vIGNyZWF0ZSBtb3ZlbWVudCBzdHJpbmdcblxuXG4gICAgcmV0dXJuICdNICcgKyBzaGFwZS54MCArICcsNTAnICsgJyBMICcgKyBzaGFwZS54MSArICcsJyArIChzaGFwZS55MSArIDUwKSArICcgTCAnICsgc2hhcGUueDIgKyAnLCcgKyAoc2hhcGUueTIgKyA1MCkgKyAnIEwgJyArIHNoYXBlLngzICsgJyw1MCAnICsgJyBMICcgKyBzaGFwZS54MiArICcsJyArICg1MCAtIHNoYXBlLnkyKSArICcgTCAnICsgc2hhcGUueDEgKyAnLCcgKyAoNTAgLSBzaGFwZS55MSkgKyAnIFonO1xuICB9XG5cbiAgUHJldk5leHRCdXR0b24ucHJvdG90eXBlLmhhbmRsZUV2ZW50ID0gdXRpbHMuaGFuZGxlRXZlbnQ7XG5cbiAgUHJldk5leHRCdXR0b24ucHJvdG90eXBlLm9uY2xpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmlzRW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucGFyZW50LnVpQ2hhbmdlKCk7XG4gICAgdmFyIG1ldGhvZCA9IHRoaXMuaXNQcmV2aW91cyA/ICdwcmV2aW91cycgOiAnbmV4dCc7XG4gICAgdGhpcy5wYXJlbnRbbWV0aG9kXSgpO1xuICB9OyAvLyAtLS0tLSAgLS0tLS0gLy9cblxuXG4gIFByZXZOZXh0QnV0dG9uLnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNFbmFibGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5lbGVtZW50LmRpc2FibGVkID0gZmFsc2U7XG4gICAgdGhpcy5pc0VuYWJsZWQgPSB0cnVlO1xuICB9O1xuXG4gIFByZXZOZXh0QnV0dG9uLnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5pc0VuYWJsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmVsZW1lbnQuZGlzYWJsZWQgPSB0cnVlO1xuICAgIHRoaXMuaXNFbmFibGVkID0gZmFsc2U7XG4gIH07XG5cbiAgUHJldk5leHRCdXR0b24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBpbmRleCBvZiBmaXJzdCBvciBsYXN0IHNsaWRlLCBpZiBwcmV2aW91cyBvciBuZXh0XG4gICAgdmFyIHNsaWRlcyA9IHRoaXMucGFyZW50LnNsaWRlczsgLy8gZW5hYmxlIGlzIHdyYXBBcm91bmQgYW5kIGF0IGxlYXN0IDIgc2xpZGVzXG5cbiAgICBpZiAodGhpcy5wYXJlbnQub3B0aW9ucy53cmFwQXJvdW5kICYmIHNsaWRlcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aGlzLmVuYWJsZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBsYXN0SW5kZXggPSBzbGlkZXMubGVuZ3RoID8gc2xpZGVzLmxlbmd0aCAtIDEgOiAwO1xuICAgIHZhciBib3VuZEluZGV4ID0gdGhpcy5pc1ByZXZpb3VzID8gMCA6IGxhc3RJbmRleDtcbiAgICB2YXIgbWV0aG9kID0gdGhpcy5wYXJlbnQuc2VsZWN0ZWRJbmRleCA9PSBib3VuZEluZGV4ID8gJ2Rpc2FibGUnIDogJ2VuYWJsZSc7XG4gICAgdGhpc1ttZXRob2RdKCk7XG4gIH07XG5cbiAgUHJldk5leHRCdXR0b24ucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kZWFjdGl2YXRlKCk7XG4gICAgdGhpcy5hbGxPZmYoKTtcbiAgfTsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gRmxpY2tpdHkgcHJvdG90eXBlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cblxuICB1dGlscy5leHRlbmQoRmxpY2tpdHkuZGVmYXVsdHMsIHtcbiAgICBwcmV2TmV4dEJ1dHRvbnM6IHRydWUsXG4gICAgYXJyb3dTaGFwZToge1xuICAgICAgeDA6IDEwLFxuICAgICAgeDE6IDYwLFxuICAgICAgeTE6IDUwLFxuICAgICAgeDI6IDcwLFxuICAgICAgeTI6IDQwLFxuICAgICAgeDM6IDMwXG4gICAgfVxuICB9KTtcbiAgRmxpY2tpdHkuY3JlYXRlTWV0aG9kcy5wdXNoKCdfY3JlYXRlUHJldk5leHRCdXR0b25zJyk7XG4gIHZhciBwcm90byA9IEZsaWNraXR5LnByb3RvdHlwZTtcblxuICBwcm90by5fY3JlYXRlUHJldk5leHRCdXR0b25zID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5vcHRpb25zLnByZXZOZXh0QnV0dG9ucykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucHJldkJ1dHRvbiA9IG5ldyBQcmV2TmV4dEJ1dHRvbigtMSwgdGhpcyk7XG4gICAgdGhpcy5uZXh0QnV0dG9uID0gbmV3IFByZXZOZXh0QnV0dG9uKDEsIHRoaXMpO1xuICAgIHRoaXMub24oJ2FjdGl2YXRlJywgdGhpcy5hY3RpdmF0ZVByZXZOZXh0QnV0dG9ucyk7XG4gIH07XG5cbiAgcHJvdG8uYWN0aXZhdGVQcmV2TmV4dEJ1dHRvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wcmV2QnV0dG9uLmFjdGl2YXRlKCk7XG4gICAgdGhpcy5uZXh0QnV0dG9uLmFjdGl2YXRlKCk7XG4gICAgdGhpcy5vbignZGVhY3RpdmF0ZScsIHRoaXMuZGVhY3RpdmF0ZVByZXZOZXh0QnV0dG9ucyk7XG4gIH07XG5cbiAgcHJvdG8uZGVhY3RpdmF0ZVByZXZOZXh0QnV0dG9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnByZXZCdXR0b24uZGVhY3RpdmF0ZSgpO1xuICAgIHRoaXMubmV4dEJ1dHRvbi5kZWFjdGl2YXRlKCk7XG4gICAgdGhpcy5vZmYoJ2RlYWN0aXZhdGUnLCB0aGlzLmRlYWN0aXZhdGVQcmV2TmV4dEJ1dHRvbnMpO1xuICB9OyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cblxuXG4gIEZsaWNraXR5LlByZXZOZXh0QnV0dG9uID0gUHJldk5leHRCdXR0b247XG4gIHJldHVybiBGbGlja2l0eTtcbn0pOyAvLyBwYWdlIGRvdHNcblxuXG4oZnVuY3Rpb24gKHdpbmRvdywgZmFjdG9yeSkge1xuICAvLyB1bml2ZXJzYWwgbW9kdWxlIGRlZmluaXRpb25cblxuICAvKiBqc2hpbnQgc3RyaWN0OiBmYWxzZSAqL1xuICBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTURcbiAgICBkZWZpbmUoJ2ZsaWNraXR5L2pzL3BhZ2UtZG90cycsIFsnLi9mbGlja2l0eScsICd1bmlwb2ludGVyL3VuaXBvaW50ZXInLCAnZml6enktdWktdXRpbHMvdXRpbHMnXSwgZnVuY3Rpb24gKEZsaWNraXR5LCBVbmlwb2ludGVyLCB1dGlscykge1xuICAgICAgcmV0dXJuIGZhY3Rvcnkod2luZG93LCBGbGlja2l0eSwgVW5pcG9pbnRlciwgdXRpbHMpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgbW9kdWxlID09PSBcInVuZGVmaW5lZFwiID8gXCJ1bmRlZmluZWRcIiA6IF90eXBlb2YobW9kdWxlKSkgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSh3aW5kb3csIHJlcXVpcmUoJy4vZmxpY2tpdHknKSwgcmVxdWlyZSgndW5pcG9pbnRlcicpLCByZXF1aXJlKCdmaXp6eS11aS11dGlscycpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBicm93c2VyIGdsb2JhbFxuICAgIGZhY3Rvcnkod2luZG93LCB3aW5kb3cuRmxpY2tpdHksIHdpbmRvdy5Vbmlwb2ludGVyLCB3aW5kb3cuZml6enlVSVV0aWxzKTtcbiAgfVxufSkod2luZG93LCBmdW5jdGlvbiBmYWN0b3J5KHdpbmRvdywgRmxpY2tpdHksIFVuaXBvaW50ZXIsIHV0aWxzKSB7XG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFBhZ2VEb3RzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG4gIGZ1bmN0aW9uIFBhZ2VEb3RzKHBhcmVudCkge1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuXG4gICAgdGhpcy5fY3JlYXRlKCk7XG4gIH1cblxuICBQYWdlRG90cy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFVuaXBvaW50ZXIucHJvdG90eXBlKTtcblxuICBQYWdlRG90cy5wcm90b3R5cGUuX2NyZWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBjcmVhdGUgaG9sZGVyIGVsZW1lbnRcbiAgICB0aGlzLmhvbGRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29sJyk7XG4gICAgdGhpcy5ob2xkZXIuY2xhc3NOYW1lID0gJ2ZsaWNraXR5LXBhZ2UtZG90cyc7IC8vIGNyZWF0ZSBkb3RzLCBhcnJheSBvZiBlbGVtZW50c1xuXG4gICAgdGhpcy5kb3RzID0gW107IC8vIGV2ZW50c1xuXG4gICAgdGhpcy5oYW5kbGVDbGljayA9IHRoaXMub25DbGljay5iaW5kKHRoaXMpO1xuICAgIHRoaXMub24oJ3BvaW50ZXJEb3duJywgdGhpcy5wYXJlbnQuY2hpbGRVSVBvaW50ZXJEb3duLmJpbmQodGhpcy5wYXJlbnQpKTtcbiAgfTtcblxuICBQYWdlRG90cy5wcm90b3R5cGUuYWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXREb3RzKCk7XG4gICAgdGhpcy5ob2xkZXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmhhbmRsZUNsaWNrKTtcbiAgICB0aGlzLmJpbmRTdGFydEV2ZW50KHRoaXMuaG9sZGVyKTsgLy8gYWRkIHRvIERPTVxuXG4gICAgdGhpcy5wYXJlbnQuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLmhvbGRlcik7XG4gIH07XG5cbiAgUGFnZURvdHMucHJvdG90eXBlLmRlYWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5ob2xkZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmhhbmRsZUNsaWNrKTtcbiAgICB0aGlzLnVuYmluZFN0YXJ0RXZlbnQodGhpcy5ob2xkZXIpOyAvLyByZW1vdmUgZnJvbSBET01cblxuICAgIHRoaXMucGFyZW50LmVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5ob2xkZXIpO1xuICB9O1xuXG4gIFBhZ2VEb3RzLnByb3RvdHlwZS5zZXREb3RzID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGdldCBkaWZmZXJlbmNlIGJldHdlZW4gbnVtYmVyIG9mIHNsaWRlcyBhbmQgbnVtYmVyIG9mIGRvdHNcbiAgICB2YXIgZGVsdGEgPSB0aGlzLnBhcmVudC5zbGlkZXMubGVuZ3RoIC0gdGhpcy5kb3RzLmxlbmd0aDtcblxuICAgIGlmIChkZWx0YSA+IDApIHtcbiAgICAgIHRoaXMuYWRkRG90cyhkZWx0YSk7XG4gICAgfSBlbHNlIGlmIChkZWx0YSA8IDApIHtcbiAgICAgIHRoaXMucmVtb3ZlRG90cygtZGVsdGEpO1xuICAgIH1cbiAgfTtcblxuICBQYWdlRG90cy5wcm90b3R5cGUuYWRkRG90cyA9IGZ1bmN0aW9uIChjb3VudCkge1xuICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICB2YXIgbmV3RG90cyA9IFtdO1xuICAgIHZhciBsZW5ndGggPSB0aGlzLmRvdHMubGVuZ3RoO1xuICAgIHZhciBtYXggPSBsZW5ndGggKyBjb3VudDtcblxuICAgIGZvciAodmFyIGkgPSBsZW5ndGg7IGkgPCBtYXg7IGkrKykge1xuICAgICAgdmFyIGRvdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICBkb3QuY2xhc3NOYW1lID0gJ2RvdCc7XG4gICAgICBkb3Quc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgJ1BhZ2UgZG90ICcgKyAoaSArIDEpKTtcbiAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGRvdCk7XG4gICAgICBuZXdEb3RzLnB1c2goZG90KTtcbiAgICB9XG5cbiAgICB0aGlzLmhvbGRlci5hcHBlbmRDaGlsZChmcmFnbWVudCk7XG4gICAgdGhpcy5kb3RzID0gdGhpcy5kb3RzLmNvbmNhdChuZXdEb3RzKTtcbiAgfTtcblxuICBQYWdlRG90cy5wcm90b3R5cGUucmVtb3ZlRG90cyA9IGZ1bmN0aW9uIChjb3VudCkge1xuICAgIC8vIHJlbW92ZSBmcm9tIHRoaXMuZG90cyBjb2xsZWN0aW9uXG4gICAgdmFyIHJlbW92ZURvdHMgPSB0aGlzLmRvdHMuc3BsaWNlKHRoaXMuZG90cy5sZW5ndGggLSBjb3VudCwgY291bnQpOyAvLyByZW1vdmUgZnJvbSBET01cblxuICAgIHJlbW92ZURvdHMuZm9yRWFjaChmdW5jdGlvbiAoZG90KSB7XG4gICAgICB0aGlzLmhvbGRlci5yZW1vdmVDaGlsZChkb3QpO1xuICAgIH0sIHRoaXMpO1xuICB9O1xuXG4gIFBhZ2VEb3RzLnByb3RvdHlwZS51cGRhdGVTZWxlY3RlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyByZW1vdmUgc2VsZWN0ZWQgY2xhc3Mgb24gcHJldmlvdXNcbiAgICBpZiAodGhpcy5zZWxlY3RlZERvdCkge1xuICAgICAgdGhpcy5zZWxlY3RlZERvdC5jbGFzc05hbWUgPSAnZG90JztcbiAgICAgIHRoaXMuc2VsZWN0ZWREb3QucmVtb3ZlQXR0cmlidXRlKCdhcmlhLWN1cnJlbnQnKTtcbiAgICB9IC8vIGRvbid0IHByb2NlZWQgaWYgbm8gZG90c1xuXG5cbiAgICBpZiAoIXRoaXMuZG90cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnNlbGVjdGVkRG90ID0gdGhpcy5kb3RzW3RoaXMucGFyZW50LnNlbGVjdGVkSW5kZXhdO1xuICAgIHRoaXMuc2VsZWN0ZWREb3QuY2xhc3NOYW1lID0gJ2RvdCBpcy1zZWxlY3RlZCc7XG4gICAgdGhpcy5zZWxlY3RlZERvdC5zZXRBdHRyaWJ1dGUoJ2FyaWEtY3VycmVudCcsICdzdGVwJyk7XG4gIH07XG5cbiAgUGFnZURvdHMucHJvdG90eXBlLm9uVGFwID0gLy8gb2xkIG1ldGhvZCBuYW1lLCBiYWNrd2FyZHMtY29tcGF0aWJsZVxuICBQYWdlRG90cy5wcm90b3R5cGUub25DbGljayA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciB0YXJnZXQgPSBldmVudC50YXJnZXQ7IC8vIG9ubHkgY2FyZSBhYm91dCBkb3QgY2xpY2tzXG5cbiAgICBpZiAodGFyZ2V0Lm5vZGVOYW1lICE9ICdMSScpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnBhcmVudC51aUNoYW5nZSgpO1xuICAgIHZhciBpbmRleCA9IHRoaXMuZG90cy5pbmRleE9mKHRhcmdldCk7XG4gICAgdGhpcy5wYXJlbnQuc2VsZWN0KGluZGV4KTtcbiAgfTtcblxuICBQYWdlRG90cy5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRlYWN0aXZhdGUoKTtcbiAgICB0aGlzLmFsbE9mZigpO1xuICB9O1xuXG4gIEZsaWNraXR5LlBhZ2VEb3RzID0gUGFnZURvdHM7IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIEZsaWNraXR5IC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cbiAgdXRpbHMuZXh0ZW5kKEZsaWNraXR5LmRlZmF1bHRzLCB7XG4gICAgcGFnZURvdHM6IHRydWVcbiAgfSk7XG4gIEZsaWNraXR5LmNyZWF0ZU1ldGhvZHMucHVzaCgnX2NyZWF0ZVBhZ2VEb3RzJyk7XG4gIHZhciBwcm90byA9IEZsaWNraXR5LnByb3RvdHlwZTtcblxuICBwcm90by5fY3JlYXRlUGFnZURvdHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMucGFnZURvdHMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnBhZ2VEb3RzID0gbmV3IFBhZ2VEb3RzKHRoaXMpOyAvLyBldmVudHNcblxuICAgIHRoaXMub24oJ2FjdGl2YXRlJywgdGhpcy5hY3RpdmF0ZVBhZ2VEb3RzKTtcbiAgICB0aGlzLm9uKCdzZWxlY3QnLCB0aGlzLnVwZGF0ZVNlbGVjdGVkUGFnZURvdHMpO1xuICAgIHRoaXMub24oJ2NlbGxDaGFuZ2UnLCB0aGlzLnVwZGF0ZVBhZ2VEb3RzKTtcbiAgICB0aGlzLm9uKCdyZXNpemUnLCB0aGlzLnVwZGF0ZVBhZ2VEb3RzKTtcbiAgICB0aGlzLm9uKCdkZWFjdGl2YXRlJywgdGhpcy5kZWFjdGl2YXRlUGFnZURvdHMpO1xuICB9O1xuXG4gIHByb3RvLmFjdGl2YXRlUGFnZURvdHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wYWdlRG90cy5hY3RpdmF0ZSgpO1xuICB9O1xuXG4gIHByb3RvLnVwZGF0ZVNlbGVjdGVkUGFnZURvdHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wYWdlRG90cy51cGRhdGVTZWxlY3RlZCgpO1xuICB9O1xuXG4gIHByb3RvLnVwZGF0ZVBhZ2VEb3RzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucGFnZURvdHMuc2V0RG90cygpO1xuICB9O1xuXG4gIHByb3RvLmRlYWN0aXZhdGVQYWdlRG90cyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnBhZ2VEb3RzLmRlYWN0aXZhdGUoKTtcbiAgfTsgLy8gLS0tLS0gIC0tLS0tIC8vXG5cblxuICBGbGlja2l0eS5QYWdlRG90cyA9IFBhZ2VEb3RzO1xuICByZXR1cm4gRmxpY2tpdHk7XG59KTsgLy8gcGxheWVyICYgYXV0b1BsYXlcblxuXG4oZnVuY3Rpb24gKHdpbmRvdywgZmFjdG9yeSkge1xuICAvLyB1bml2ZXJzYWwgbW9kdWxlIGRlZmluaXRpb25cblxuICAvKiBqc2hpbnQgc3RyaWN0OiBmYWxzZSAqL1xuICBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTURcbiAgICBkZWZpbmUoJ2ZsaWNraXR5L2pzL3BsYXllcicsIFsnZXYtZW1pdHRlci9ldi1lbWl0dGVyJywgJ2Zpenp5LXVpLXV0aWxzL3V0aWxzJywgJy4vZmxpY2tpdHknXSwgZnVuY3Rpb24gKEV2RW1pdHRlciwgdXRpbHMsIEZsaWNraXR5KSB7XG4gICAgICByZXR1cm4gZmFjdG9yeShFdkVtaXR0ZXIsIHV0aWxzLCBGbGlja2l0eSk7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBtb2R1bGUgPT09IFwidW5kZWZpbmVkXCIgPyBcInVuZGVmaW5lZFwiIDogX3R5cGVvZihtb2R1bGUpKSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJ2V2LWVtaXR0ZXInKSwgcmVxdWlyZSgnZml6enktdWktdXRpbHMnKSwgcmVxdWlyZSgnLi9mbGlja2l0eScpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBicm93c2VyIGdsb2JhbFxuICAgIGZhY3Rvcnkod2luZG93LkV2RW1pdHRlciwgd2luZG93LmZpenp5VUlVdGlscywgd2luZG93LkZsaWNraXR5KTtcbiAgfVxufSkod2luZG93LCBmdW5jdGlvbiBmYWN0b3J5KEV2RW1pdHRlciwgdXRpbHMsIEZsaWNraXR5KSB7XG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFBsYXllciAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuICBmdW5jdGlvbiBQbGF5ZXIocGFyZW50KSB7XG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5zdGF0ZSA9ICdzdG9wcGVkJzsgLy8gdmlzaWJpbGl0eSBjaGFuZ2UgZXZlbnQgaGFuZGxlclxuXG4gICAgdGhpcy5vblZpc2liaWxpdHlDaGFuZ2UgPSB0aGlzLnZpc2liaWxpdHlDaGFuZ2UuYmluZCh0aGlzKTtcbiAgICB0aGlzLm9uVmlzaWJpbGl0eVBsYXkgPSB0aGlzLnZpc2liaWxpdHlQbGF5LmJpbmQodGhpcyk7XG4gIH1cblxuICBQbGF5ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdkVtaXR0ZXIucHJvdG90eXBlKTsgLy8gc3RhcnQgcGxheVxuXG4gIFBsYXllci5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5zdGF0ZSA9PSAncGxheWluZycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIGRvIG5vdCBwbGF5IGlmIHBhZ2UgaXMgaGlkZGVuLCBzdGFydCBwbGF5aW5nIHdoZW4gcGFnZSBpcyB2aXNpYmxlXG5cblxuICAgIHZhciBpc1BhZ2VIaWRkZW4gPSBkb2N1bWVudC5oaWRkZW47XG5cbiAgICBpZiAoaXNQYWdlSGlkZGVuKSB7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5Y2hhbmdlJywgdGhpcy5vblZpc2liaWxpdHlQbGF5KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnN0YXRlID0gJ3BsYXlpbmcnOyAvLyBsaXN0ZW4gdG8gdmlzaWJpbGl0eSBjaGFuZ2VcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCB0aGlzLm9uVmlzaWJpbGl0eUNoYW5nZSk7IC8vIHN0YXJ0IHRpY2tpbmdcblxuICAgIHRoaXMudGljaygpO1xuICB9O1xuXG4gIFBsYXllci5wcm90b3R5cGUudGljayA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBkbyBub3QgdGljayBpZiBub3QgcGxheWluZ1xuICAgIGlmICh0aGlzLnN0YXRlICE9ICdwbGF5aW5nJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciB0aW1lID0gdGhpcy5wYXJlbnQub3B0aW9ucy5hdXRvUGxheTsgLy8gZGVmYXVsdCB0byAzIHNlY29uZHNcblxuICAgIHRpbWUgPSB0eXBlb2YgdGltZSA9PSAnbnVtYmVyJyA/IHRpbWUgOiAzMDAwO1xuXG4gICAgdmFyIF90aGlzID0gdGhpczsgLy8gSEFDSzogcmVzZXQgdGlja3MgaWYgc3RvcHBlZCBhbmQgc3RhcnRlZCB3aXRoaW4gaW50ZXJ2YWxcblxuXG4gICAgdGhpcy5jbGVhcigpO1xuICAgIHRoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgX3RoaXMucGFyZW50Lm5leHQodHJ1ZSk7XG5cbiAgICAgIF90aGlzLnRpY2soKTtcbiAgICB9LCB0aW1lKTtcbiAgfTtcblxuICBQbGF5ZXIucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zdGF0ZSA9ICdzdG9wcGVkJztcbiAgICB0aGlzLmNsZWFyKCk7IC8vIHJlbW92ZSB2aXNpYmlsaXR5IGNoYW5nZSBldmVudFxuXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eWNoYW5nZScsIHRoaXMub25WaXNpYmlsaXR5Q2hhbmdlKTtcbiAgfTtcblxuICBQbGF5ZXIucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXQpO1xuICB9O1xuXG4gIFBsYXllci5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUgPT0gJ3BsYXlpbmcnKSB7XG4gICAgICB0aGlzLnN0YXRlID0gJ3BhdXNlZCc7XG4gICAgICB0aGlzLmNsZWFyKCk7XG4gICAgfVxuICB9O1xuXG4gIFBsYXllci5wcm90b3R5cGUudW5wYXVzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyByZS1zdGFydCBwbGF5IGlmIHBhdXNlZFxuICAgIGlmICh0aGlzLnN0YXRlID09ICdwYXVzZWQnKSB7XG4gICAgICB0aGlzLnBsYXkoKTtcbiAgICB9XG4gIH07IC8vIHBhdXNlIGlmIHBhZ2UgdmlzaWJpbGl0eSBpcyBoaWRkZW4sIHVucGF1c2UgaWYgdmlzaWJsZVxuXG5cbiAgUGxheWVyLnByb3RvdHlwZS52aXNpYmlsaXR5Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpc1BhZ2VIaWRkZW4gPSBkb2N1bWVudC5oaWRkZW47XG4gICAgdGhpc1tpc1BhZ2VIaWRkZW4gPyAncGF1c2UnIDogJ3VucGF1c2UnXSgpO1xuICB9O1xuXG4gIFBsYXllci5wcm90b3R5cGUudmlzaWJpbGl0eVBsYXkgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wbGF5KCk7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eWNoYW5nZScsIHRoaXMub25WaXNpYmlsaXR5UGxheSk7XG4gIH07IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIEZsaWNraXR5IC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cblxuICB1dGlscy5leHRlbmQoRmxpY2tpdHkuZGVmYXVsdHMsIHtcbiAgICBwYXVzZUF1dG9QbGF5T25Ib3ZlcjogdHJ1ZVxuICB9KTtcbiAgRmxpY2tpdHkuY3JlYXRlTWV0aG9kcy5wdXNoKCdfY3JlYXRlUGxheWVyJyk7XG4gIHZhciBwcm90byA9IEZsaWNraXR5LnByb3RvdHlwZTtcblxuICBwcm90by5fY3JlYXRlUGxheWVyID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucGxheWVyID0gbmV3IFBsYXllcih0aGlzKTtcbiAgICB0aGlzLm9uKCdhY3RpdmF0ZScsIHRoaXMuYWN0aXZhdGVQbGF5ZXIpO1xuICAgIHRoaXMub24oJ3VpQ2hhbmdlJywgdGhpcy5zdG9wUGxheWVyKTtcbiAgICB0aGlzLm9uKCdwb2ludGVyRG93bicsIHRoaXMuc3RvcFBsYXllcik7XG4gICAgdGhpcy5vbignZGVhY3RpdmF0ZScsIHRoaXMuZGVhY3RpdmF0ZVBsYXllcik7XG4gIH07XG5cbiAgcHJvdG8uYWN0aXZhdGVQbGF5ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuYXV0b1BsYXkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnBsYXllci5wbGF5KCk7XG4gICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZW50ZXInLCB0aGlzKTtcbiAgfTsgLy8gUGxheWVyIEFQSSwgZG9uJ3QgaGF0ZSB0aGUgLi4uIHRoYW5rcyBJIGtub3cgd2hlcmUgdGhlIGRvb3IgaXNcblxuXG4gIHByb3RvLnBsYXlQbGF5ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wbGF5ZXIucGxheSgpO1xuICB9O1xuXG4gIHByb3RvLnN0b3BQbGF5ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wbGF5ZXIuc3RvcCgpO1xuICB9O1xuXG4gIHByb3RvLnBhdXNlUGxheWVyID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucGxheWVyLnBhdXNlKCk7XG4gIH07XG5cbiAgcHJvdG8udW5wYXVzZVBsYXllciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnBsYXllci51bnBhdXNlKCk7XG4gIH07XG5cbiAgcHJvdG8uZGVhY3RpdmF0ZVBsYXllciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnBsYXllci5zdG9wKCk7XG4gICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZW50ZXInLCB0aGlzKTtcbiAgfTsgLy8gLS0tLS0gbW91c2VlbnRlci9sZWF2ZSAtLS0tLSAvL1xuICAvLyBwYXVzZSBhdXRvLXBsYXkgb24gaG92ZXJcblxuXG4gIHByb3RvLm9ubW91c2VlbnRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMub3B0aW9ucy5wYXVzZUF1dG9QbGF5T25Ib3Zlcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucGxheWVyLnBhdXNlKCk7XG4gICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCB0aGlzKTtcbiAgfTsgLy8gcmVzdW1lIGF1dG8tcGxheSBvbiBob3ZlciBvZmZcblxuXG4gIHByb3RvLm9ubW91c2VsZWF2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnBsYXllci51bnBhdXNlKCk7XG4gICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCB0aGlzKTtcbiAgfTsgLy8gLS0tLS0gIC0tLS0tIC8vXG5cblxuICBGbGlja2l0eS5QbGF5ZXIgPSBQbGF5ZXI7XG4gIHJldHVybiBGbGlja2l0eTtcbn0pOyAvLyBhZGQsIHJlbW92ZSBjZWxsXG5cblxuKGZ1bmN0aW9uICh3aW5kb3csIGZhY3RvcnkpIHtcbiAgLy8gdW5pdmVyc2FsIG1vZHVsZSBkZWZpbml0aW9uXG5cbiAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EXG4gICAgZGVmaW5lKCdmbGlja2l0eS9qcy9hZGQtcmVtb3ZlLWNlbGwnLCBbJy4vZmxpY2tpdHknLCAnZml6enktdWktdXRpbHMvdXRpbHMnXSwgZnVuY3Rpb24gKEZsaWNraXR5LCB1dGlscykge1xuICAgICAgcmV0dXJuIGZhY3Rvcnkod2luZG93LCBGbGlja2l0eSwgdXRpbHMpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgbW9kdWxlID09PSBcInVuZGVmaW5lZFwiID8gXCJ1bmRlZmluZWRcIiA6IF90eXBlb2YobW9kdWxlKSkgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSh3aW5kb3csIHJlcXVpcmUoJy4vZmxpY2tpdHknKSwgcmVxdWlyZSgnZml6enktdWktdXRpbHMnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gYnJvd3NlciBnbG9iYWxcbiAgICBmYWN0b3J5KHdpbmRvdywgd2luZG93LkZsaWNraXR5LCB3aW5kb3cuZml6enlVSVV0aWxzKTtcbiAgfVxufSkod2luZG93LCBmdW5jdGlvbiBmYWN0b3J5KHdpbmRvdywgRmxpY2tpdHksIHV0aWxzKSB7XG4gIC8vIGFwcGVuZCBjZWxscyB0byBhIGRvY3VtZW50IGZyYWdtZW50XG4gIGZ1bmN0aW9uIGdldENlbGxzRnJhZ21lbnQoY2VsbHMpIHtcbiAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgY2VsbHMuZm9yRWFjaChmdW5jdGlvbiAoY2VsbCkge1xuICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoY2VsbC5lbGVtZW50KTtcbiAgICB9KTtcbiAgICByZXR1cm4gZnJhZ21lbnQ7XG4gIH0gLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gYWRkL3JlbW92ZSBjZWxsIHByb3RvdHlwZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG5cbiAgdmFyIHByb3RvID0gRmxpY2tpdHkucHJvdG90eXBlO1xuICAvKipcbiAgICogSW5zZXJ0LCBwcmVwZW5kLCBvciBhcHBlbmQgY2VsbHNcbiAgICogQHBhcmFtIHtFbGVtZW50LCBBcnJheSwgTm9kZUxpc3R9IGVsZW1zXG4gICAqIEBwYXJhbSB7SW50ZWdlcn0gaW5kZXhcbiAgICovXG5cbiAgcHJvdG8uaW5zZXJ0ID0gZnVuY3Rpb24gKGVsZW1zLCBpbmRleCkge1xuICAgIHZhciBjZWxscyA9IHRoaXMuX21ha2VDZWxscyhlbGVtcyk7XG5cbiAgICBpZiAoIWNlbGxzIHx8ICFjZWxscy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbGVuID0gdGhpcy5jZWxscy5sZW5ndGg7IC8vIGRlZmF1bHQgdG8gYXBwZW5kXG5cbiAgICBpbmRleCA9IGluZGV4ID09PSB1bmRlZmluZWQgPyBsZW4gOiBpbmRleDsgLy8gYWRkIGNlbGxzIHdpdGggZG9jdW1lbnQgZnJhZ21lbnRcblxuICAgIHZhciBmcmFnbWVudCA9IGdldENlbGxzRnJhZ21lbnQoY2VsbHMpOyAvLyBhcHBlbmQgdG8gc2xpZGVyXG5cbiAgICB2YXIgaXNBcHBlbmQgPSBpbmRleCA9PSBsZW47XG5cbiAgICBpZiAoaXNBcHBlbmQpIHtcbiAgICAgIHRoaXMuc2xpZGVyLmFwcGVuZENoaWxkKGZyYWdtZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGluc2VydENlbGxFbGVtZW50ID0gdGhpcy5jZWxsc1tpbmRleF0uZWxlbWVudDtcbiAgICAgIHRoaXMuc2xpZGVyLmluc2VydEJlZm9yZShmcmFnbWVudCwgaW5zZXJ0Q2VsbEVsZW1lbnQpO1xuICAgIH0gLy8gYWRkIHRvIHRoaXMuY2VsbHNcblxuXG4gICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAvLyBwcmVwZW5kLCBhZGQgdG8gc3RhcnRcbiAgICAgIHRoaXMuY2VsbHMgPSBjZWxscy5jb25jYXQodGhpcy5jZWxscyk7XG4gICAgfSBlbHNlIGlmIChpc0FwcGVuZCkge1xuICAgICAgLy8gYXBwZW5kLCBhZGQgdG8gZW5kXG4gICAgICB0aGlzLmNlbGxzID0gdGhpcy5jZWxscy5jb25jYXQoY2VsbHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBpbnNlcnQgaW4gdGhpcy5jZWxsc1xuICAgICAgdmFyIGVuZENlbGxzID0gdGhpcy5jZWxscy5zcGxpY2UoaW5kZXgsIGxlbiAtIGluZGV4KTtcbiAgICAgIHRoaXMuY2VsbHMgPSB0aGlzLmNlbGxzLmNvbmNhdChjZWxscykuY29uY2F0KGVuZENlbGxzKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zaXplQ2VsbHMoY2VsbHMpO1xuXG4gICAgdGhpcy5jZWxsQ2hhbmdlKGluZGV4LCB0cnVlKTtcbiAgfTtcblxuICBwcm90by5hcHBlbmQgPSBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICB0aGlzLmluc2VydChlbGVtcywgdGhpcy5jZWxscy5sZW5ndGgpO1xuICB9O1xuXG4gIHByb3RvLnByZXBlbmQgPSBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICB0aGlzLmluc2VydChlbGVtcywgMCk7XG4gIH07XG4gIC8qKlxuICAgKiBSZW1vdmUgY2VsbHNcbiAgICogQHBhcmFtIHtFbGVtZW50LCBBcnJheSwgTm9kZUxpc3R9IGVsZW1zXG4gICAqL1xuXG5cbiAgcHJvdG8ucmVtb3ZlID0gZnVuY3Rpb24gKGVsZW1zKSB7XG4gICAgdmFyIGNlbGxzID0gdGhpcy5nZXRDZWxscyhlbGVtcyk7XG5cbiAgICBpZiAoIWNlbGxzIHx8ICFjZWxscy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbWluQ2VsbEluZGV4ID0gdGhpcy5jZWxscy5sZW5ndGggLSAxOyAvLyByZW1vdmUgY2VsbHMgZnJvbSBjb2xsZWN0aW9uICYgRE9NXG5cbiAgICBjZWxscy5mb3JFYWNoKGZ1bmN0aW9uIChjZWxsKSB7XG4gICAgICBjZWxsLnJlbW92ZSgpO1xuICAgICAgdmFyIGluZGV4ID0gdGhpcy5jZWxscy5pbmRleE9mKGNlbGwpO1xuICAgICAgbWluQ2VsbEluZGV4ID0gTWF0aC5taW4oaW5kZXgsIG1pbkNlbGxJbmRleCk7XG4gICAgICB1dGlscy5yZW1vdmVGcm9tKHRoaXMuY2VsbHMsIGNlbGwpO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMuY2VsbENoYW5nZShtaW5DZWxsSW5kZXgsIHRydWUpO1xuICB9O1xuICAvKipcbiAgICogbG9naWMgdG8gYmUgcnVuIGFmdGVyIGEgY2VsbCdzIHNpemUgY2hhbmdlc1xuICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW0gLSBjZWxsJ3MgZWxlbWVudFxuICAgKi9cblxuXG4gIHByb3RvLmNlbGxTaXplQ2hhbmdlID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICB2YXIgY2VsbCA9IHRoaXMuZ2V0Q2VsbChlbGVtKTtcblxuICAgIGlmICghY2VsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNlbGwuZ2V0U2l6ZSgpO1xuICAgIHZhciBpbmRleCA9IHRoaXMuY2VsbHMuaW5kZXhPZihjZWxsKTtcbiAgICB0aGlzLmNlbGxDaGFuZ2UoaW5kZXgpO1xuICB9O1xuICAvKipcbiAgICogbG9naWMgYW55IHRpbWUgYSBjZWxsIGlzIGNoYW5nZWQ6IGFkZGVkLCByZW1vdmVkLCBvciBzaXplIGNoYW5nZWRcbiAgICogQHBhcmFtIHtJbnRlZ2VyfSBjaGFuZ2VkQ2VsbEluZGV4IC0gaW5kZXggb2YgdGhlIGNoYW5nZWQgY2VsbCwgb3B0aW9uYWxcbiAgICovXG5cblxuICBwcm90by5jZWxsQ2hhbmdlID0gZnVuY3Rpb24gKGNoYW5nZWRDZWxsSW5kZXgsIGlzUG9zaXRpb25pbmdTbGlkZXIpIHtcbiAgICB2YXIgcHJldlNlbGVjdGVkRWxlbSA9IHRoaXMuc2VsZWN0ZWRFbGVtZW50O1xuXG4gICAgdGhpcy5fcG9zaXRpb25DZWxscyhjaGFuZ2VkQ2VsbEluZGV4KTtcblxuICAgIHRoaXMuX2dldFdyYXBTaGlmdENlbGxzKCk7XG5cbiAgICB0aGlzLnNldEdhbGxlcnlTaXplKCk7IC8vIHVwZGF0ZSBzZWxlY3RlZEluZGV4XG4gICAgLy8gdHJ5IHRvIG1haW50YWluIHBvc2l0aW9uICYgc2VsZWN0IHByZXZpb3VzIHNlbGVjdGVkIGVsZW1lbnRcblxuICAgIHZhciBjZWxsID0gdGhpcy5nZXRDZWxsKHByZXZTZWxlY3RlZEVsZW0pO1xuXG4gICAgaWYgKGNlbGwpIHtcbiAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IHRoaXMuZ2V0Q2VsbFNsaWRlSW5kZXgoY2VsbCk7XG4gICAgfVxuXG4gICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5taW4odGhpcy5zbGlkZXMubGVuZ3RoIC0gMSwgdGhpcy5zZWxlY3RlZEluZGV4KTtcbiAgICB0aGlzLmVtaXRFdmVudCgnY2VsbENoYW5nZScsIFtjaGFuZ2VkQ2VsbEluZGV4XSk7IC8vIHBvc2l0aW9uIHNsaWRlclxuXG4gICAgdGhpcy5zZWxlY3QodGhpcy5zZWxlY3RlZEluZGV4KTsgLy8gZG8gbm90IHBvc2l0aW9uIHNsaWRlciBhZnRlciBsYXp5IGxvYWRcblxuICAgIGlmIChpc1Bvc2l0aW9uaW5nU2xpZGVyKSB7XG4gICAgICB0aGlzLnBvc2l0aW9uU2xpZGVyQXRTZWxlY3RlZCgpO1xuICAgIH1cbiAgfTsgLy8gLS0tLS0gIC0tLS0tIC8vXG5cblxuICByZXR1cm4gRmxpY2tpdHk7XG59KTsgLy8gbGF6eWxvYWRcblxuXG4oZnVuY3Rpb24gKHdpbmRvdywgZmFjdG9yeSkge1xuICAvLyB1bml2ZXJzYWwgbW9kdWxlIGRlZmluaXRpb25cblxuICAvKiBqc2hpbnQgc3RyaWN0OiBmYWxzZSAqL1xuICBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTURcbiAgICBkZWZpbmUoJ2ZsaWNraXR5L2pzL2xhenlsb2FkJywgWycuL2ZsaWNraXR5JywgJ2Zpenp5LXVpLXV0aWxzL3V0aWxzJ10sIGZ1bmN0aW9uIChGbGlja2l0eSwgdXRpbHMpIHtcbiAgICAgIHJldHVybiBmYWN0b3J5KHdpbmRvdywgRmxpY2tpdHksIHV0aWxzKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIG1vZHVsZSA9PT0gXCJ1bmRlZmluZWRcIiA/IFwidW5kZWZpbmVkXCIgOiBfdHlwZW9mKG1vZHVsZSkpID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnkod2luZG93LCByZXF1aXJlKCcuL2ZsaWNraXR5JyksIHJlcXVpcmUoJ2Zpenp5LXVpLXV0aWxzJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIGJyb3dzZXIgZ2xvYmFsXG4gICAgZmFjdG9yeSh3aW5kb3csIHdpbmRvdy5GbGlja2l0eSwgd2luZG93LmZpenp5VUlVdGlscyk7XG4gIH1cbn0pKHdpbmRvdywgZnVuY3Rpb24gZmFjdG9yeSh3aW5kb3csIEZsaWNraXR5LCB1dGlscykge1xuICAndXNlIHN0cmljdCc7XG5cbiAgRmxpY2tpdHkuY3JlYXRlTWV0aG9kcy5wdXNoKCdfY3JlYXRlTGF6eWxvYWQnKTtcbiAgdmFyIHByb3RvID0gRmxpY2tpdHkucHJvdG90eXBlO1xuXG4gIHByb3RvLl9jcmVhdGVMYXp5bG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLm9uKCdzZWxlY3QnLCB0aGlzLmxhenlMb2FkKTtcbiAgfTtcblxuICBwcm90by5sYXp5TG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbGF6eUxvYWQgPSB0aGlzLm9wdGlvbnMubGF6eUxvYWQ7XG5cbiAgICBpZiAoIWxhenlMb2FkKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBnZXQgYWRqYWNlbnQgY2VsbHMsIHVzZSBsYXp5TG9hZCBvcHRpb24gZm9yIGFkamFjZW50IGNvdW50XG5cblxuICAgIHZhciBhZGpDb3VudCA9IHR5cGVvZiBsYXp5TG9hZCA9PSAnbnVtYmVyJyA/IGxhenlMb2FkIDogMDtcbiAgICB2YXIgY2VsbEVsZW1zID0gdGhpcy5nZXRBZGphY2VudENlbGxFbGVtZW50cyhhZGpDb3VudCk7IC8vIGdldCBsYXp5IGltYWdlcyBpbiB0aG9zZSBjZWxsc1xuXG4gICAgdmFyIGxhenlJbWFnZXMgPSBbXTtcbiAgICBjZWxsRWxlbXMuZm9yRWFjaChmdW5jdGlvbiAoY2VsbEVsZW0pIHtcbiAgICAgIHZhciBsYXp5Q2VsbEltYWdlcyA9IGdldENlbGxMYXp5SW1hZ2VzKGNlbGxFbGVtKTtcbiAgICAgIGxhenlJbWFnZXMgPSBsYXp5SW1hZ2VzLmNvbmNhdChsYXp5Q2VsbEltYWdlcyk7XG4gICAgfSk7IC8vIGxvYWQgbGF6eSBpbWFnZXNcblxuICAgIGxhenlJbWFnZXMuZm9yRWFjaChmdW5jdGlvbiAoaW1nKSB7XG4gICAgICBuZXcgTGF6eUxvYWRlcihpbWcsIHRoaXMpO1xuICAgIH0sIHRoaXMpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIGdldENlbGxMYXp5SW1hZ2VzKGNlbGxFbGVtKSB7XG4gICAgLy8gY2hlY2sgaWYgY2VsbCBlbGVtZW50IGlzIGxhenkgaW1hZ2VcbiAgICBpZiAoY2VsbEVsZW0ubm9kZU5hbWUgPT0gJ0lNRycpIHtcbiAgICAgIHZhciBsYXp5bG9hZEF0dHIgPSBjZWxsRWxlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtZmxpY2tpdHktbGF6eWxvYWQnKTtcbiAgICAgIHZhciBzcmNBdHRyID0gY2VsbEVsZW0uZ2V0QXR0cmlidXRlKCdkYXRhLWZsaWNraXR5LWxhenlsb2FkLXNyYycpO1xuICAgICAgdmFyIHNyY3NldEF0dHIgPSBjZWxsRWxlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtZmxpY2tpdHktbGF6eWxvYWQtc3Jjc2V0Jyk7XG5cbiAgICAgIGlmIChsYXp5bG9hZEF0dHIgfHwgc3JjQXR0ciB8fCBzcmNzZXRBdHRyKSB7XG4gICAgICAgIHJldHVybiBbY2VsbEVsZW1dO1xuICAgICAgfVxuICAgIH0gLy8gc2VsZWN0IGxhenkgaW1hZ2VzIGluIGNlbGxcblxuXG4gICAgdmFyIGxhenlTZWxlY3RvciA9ICdpbWdbZGF0YS1mbGlja2l0eS1sYXp5bG9hZF0sICcgKyAnaW1nW2RhdGEtZmxpY2tpdHktbGF6eWxvYWQtc3JjXSwgaW1nW2RhdGEtZmxpY2tpdHktbGF6eWxvYWQtc3Jjc2V0XSc7XG4gICAgdmFyIGltZ3MgPSBjZWxsRWxlbS5xdWVyeVNlbGVjdG9yQWxsKGxhenlTZWxlY3Rvcik7XG4gICAgcmV0dXJuIHV0aWxzLm1ha2VBcnJheShpbWdzKTtcbiAgfSAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBMYXp5TG9hZGVyIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cbiAgLyoqXG4gICAqIGNsYXNzIHRvIGhhbmRsZSBsb2FkaW5nIGltYWdlc1xuICAgKi9cblxuXG4gIGZ1bmN0aW9uIExhenlMb2FkZXIoaW1nLCBmbGlja2l0eSkge1xuICAgIHRoaXMuaW1nID0gaW1nO1xuICAgIHRoaXMuZmxpY2tpdHkgPSBmbGlja2l0eTtcbiAgICB0aGlzLmxvYWQoKTtcbiAgfVxuXG4gIExhenlMb2FkZXIucHJvdG90eXBlLmhhbmRsZUV2ZW50ID0gdXRpbHMuaGFuZGxlRXZlbnQ7XG5cbiAgTGF6eUxvYWRlci5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmltZy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgdGhpcyk7XG4gICAgdGhpcy5pbWcuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzKTsgLy8gZ2V0IHNyYyAmIHNyY3NldFxuXG4gICAgdmFyIHNyYyA9IHRoaXMuaW1nLmdldEF0dHJpYnV0ZSgnZGF0YS1mbGlja2l0eS1sYXp5bG9hZCcpIHx8IHRoaXMuaW1nLmdldEF0dHJpYnV0ZSgnZGF0YS1mbGlja2l0eS1sYXp5bG9hZC1zcmMnKTtcbiAgICB2YXIgc3Jjc2V0ID0gdGhpcy5pbWcuZ2V0QXR0cmlidXRlKCdkYXRhLWZsaWNraXR5LWxhenlsb2FkLXNyY3NldCcpOyAvLyBzZXQgc3JjICYgc2Vyc2V0XG5cbiAgICB0aGlzLmltZy5zcmMgPSBzcmM7XG5cbiAgICBpZiAoc3Jjc2V0KSB7XG4gICAgICB0aGlzLmltZy5zZXRBdHRyaWJ1dGUoJ3NyY3NldCcsIHNyY3NldCk7XG4gICAgfSAvLyByZW1vdmUgYXR0clxuXG5cbiAgICB0aGlzLmltZy5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtZmxpY2tpdHktbGF6eWxvYWQnKTtcbiAgICB0aGlzLmltZy5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtZmxpY2tpdHktbGF6eWxvYWQtc3JjJyk7XG4gICAgdGhpcy5pbWcucmVtb3ZlQXR0cmlidXRlKCdkYXRhLWZsaWNraXR5LWxhenlsb2FkLXNyY3NldCcpO1xuICB9O1xuXG4gIExhenlMb2FkZXIucHJvdG90eXBlLm9ubG9hZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuY29tcGxldGUoZXZlbnQsICdmbGlja2l0eS1sYXp5bG9hZGVkJyk7XG4gIH07XG5cbiAgTGF6eUxvYWRlci5wcm90b3R5cGUub25lcnJvciA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuY29tcGxldGUoZXZlbnQsICdmbGlja2l0eS1sYXp5ZXJyb3InKTtcbiAgfTtcblxuICBMYXp5TG9hZGVyLnByb3RvdHlwZS5jb21wbGV0ZSA9IGZ1bmN0aW9uIChldmVudCwgY2xhc3NOYW1lKSB7XG4gICAgLy8gdW5iaW5kIGV2ZW50c1xuICAgIHRoaXMuaW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWQnLCB0aGlzKTtcbiAgICB0aGlzLmltZy5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIHRoaXMpO1xuICAgIHZhciBjZWxsID0gdGhpcy5mbGlja2l0eS5nZXRQYXJlbnRDZWxsKHRoaXMuaW1nKTtcbiAgICB2YXIgY2VsbEVsZW0gPSBjZWxsICYmIGNlbGwuZWxlbWVudDtcbiAgICB0aGlzLmZsaWNraXR5LmNlbGxTaXplQ2hhbmdlKGNlbGxFbGVtKTtcbiAgICB0aGlzLmltZy5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7XG4gICAgdGhpcy5mbGlja2l0eS5kaXNwYXRjaEV2ZW50KCdsYXp5TG9hZCcsIGV2ZW50LCBjZWxsRWxlbSk7XG4gIH07IC8vIC0tLS0tICAtLS0tLSAvL1xuXG5cbiAgRmxpY2tpdHkuTGF6eUxvYWRlciA9IExhenlMb2FkZXI7XG4gIHJldHVybiBGbGlja2l0eTtcbn0pO1xuLyohXG4gKiBGbGlja2l0eSB2Mi4yLjBcbiAqIFRvdWNoLCByZXNwb25zaXZlLCBmbGlja2FibGUgY2Fyb3VzZWxzXG4gKlxuICogTGljZW5zZWQgR1BMdjMgZm9yIG9wZW4gc291cmNlIHVzZVxuICogb3IgRmxpY2tpdHkgQ29tbWVyY2lhbCBMaWNlbnNlIGZvciBjb21tZXJjaWFsIHVzZVxuICpcbiAqIGh0dHBzOi8vZmxpY2tpdHkubWV0YWZpenp5LmNvXG4gKiBDb3B5cmlnaHQgMjAxNS0yMDE4IE1ldGFmaXp6eVxuICovXG5cblxuKGZ1bmN0aW9uICh3aW5kb3csIGZhY3RvcnkpIHtcbiAgLy8gdW5pdmVyc2FsIG1vZHVsZSBkZWZpbml0aW9uXG5cbiAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EXG4gICAgZGVmaW5lKCdmbGlja2l0eS9qcy9pbmRleCcsIFsnLi9mbGlja2l0eScsICcuL2RyYWcnLCAnLi9wcmV2LW5leHQtYnV0dG9uJywgJy4vcGFnZS1kb3RzJywgJy4vcGxheWVyJywgJy4vYWRkLXJlbW92ZS1jZWxsJywgJy4vbGF6eWxvYWQnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBtb2R1bGUgPT09IFwidW5kZWZpbmVkXCIgPyBcInVuZGVmaW5lZFwiIDogX3R5cGVvZihtb2R1bGUpKSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4vZmxpY2tpdHknKSwgcmVxdWlyZSgnLi9kcmFnJyksIHJlcXVpcmUoJy4vcHJldi1uZXh0LWJ1dHRvbicpLCByZXF1aXJlKCcuL3BhZ2UtZG90cycpLCByZXF1aXJlKCcuL3BsYXllcicpLCByZXF1aXJlKCcuL2FkZC1yZW1vdmUtY2VsbCcpLCByZXF1aXJlKCcuL2xhenlsb2FkJykpO1xuICB9XG59KSh3aW5kb3csIGZ1bmN0aW9uIGZhY3RvcnkoRmxpY2tpdHkpIHtcbiAgLypqc2hpbnQgc3RyaWN0OiBmYWxzZSovXG4gIHJldHVybiBGbGlja2l0eTtcbn0pO1xuLyohXG4gKiBGbGlja2l0eSBhc05hdkZvciB2Mi4wLjFcbiAqIGVuYWJsZSBhc05hdkZvciBmb3IgRmxpY2tpdHlcbiAqL1xuXG4vKmpzaGludCBicm93c2VyOiB0cnVlLCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlLCBzdHJpY3Q6IHRydWUqL1xuXG5cbihmdW5jdGlvbiAod2luZG93LCBmYWN0b3J5KSB7XG4gIC8vIHVuaXZlcnNhbCBtb2R1bGUgZGVmaW5pdGlvblxuXG4gIC8qanNoaW50IHN0cmljdDogZmFsc2UgKi9cblxuICAvKmdsb2JhbHMgZGVmaW5lLCBtb2R1bGUsIHJlcXVpcmUgKi9cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EXG4gICAgZGVmaW5lKCdmbGlja2l0eS1hcy1uYXYtZm9yL2FzLW5hdi1mb3InLCBbJ2ZsaWNraXR5L2pzL2luZGV4JywgJ2Zpenp5LXVpLXV0aWxzL3V0aWxzJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgbW9kdWxlID09PSBcInVuZGVmaW5lZFwiID8gXCJ1bmRlZmluZWRcIiA6IF90eXBlb2YobW9kdWxlKSkgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCdmbGlja2l0eScpLCByZXF1aXJlKCdmaXp6eS11aS11dGlscycpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBicm93c2VyIGdsb2JhbFxuICAgIHdpbmRvdy5GbGlja2l0eSA9IGZhY3Rvcnkod2luZG93LkZsaWNraXR5LCB3aW5kb3cuZml6enlVSVV0aWxzKTtcbiAgfVxufSkod2luZG93LCBmdW5jdGlvbiBmYWN0b3J5KEZsaWNraXR5LCB1dGlscykge1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBhc05hdkZvciBwcm90b3R5cGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cbiAgLy8gRmxpY2tpdHkuZGVmYXVsdHMuYXNOYXZGb3IgPSBudWxsO1xuICBGbGlja2l0eS5jcmVhdGVNZXRob2RzLnB1c2goJ19jcmVhdGVBc05hdkZvcicpO1xuICB2YXIgcHJvdG8gPSBGbGlja2l0eS5wcm90b3R5cGU7XG5cbiAgcHJvdG8uX2NyZWF0ZUFzTmF2Rm9yID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMub24oJ2FjdGl2YXRlJywgdGhpcy5hY3RpdmF0ZUFzTmF2Rm9yKTtcbiAgICB0aGlzLm9uKCdkZWFjdGl2YXRlJywgdGhpcy5kZWFjdGl2YXRlQXNOYXZGb3IpO1xuICAgIHRoaXMub24oJ2Rlc3Ryb3knLCB0aGlzLmRlc3Ryb3lBc05hdkZvcik7XG4gICAgdmFyIGFzTmF2Rm9yT3B0aW9uID0gdGhpcy5vcHRpb25zLmFzTmF2Rm9yO1xuXG4gICAgaWYgKCFhc05hdkZvck9wdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gSEFDSyBkbyBhc3luYywgZ2l2ZSB0aW1lIGZvciBvdGhlciBmbGlja2l0eSB0byBiZSBpbml0YWxpemVkXG5cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uIGluaXROYXZDb21wYW5pb24oKSB7XG4gICAgICBfdGhpcy5zZXROYXZDb21wYW5pb24oYXNOYXZGb3JPcHRpb24pO1xuICAgIH0pO1xuICB9O1xuXG4gIHByb3RvLnNldE5hdkNvbXBhbmlvbiA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgZWxlbSA9IHV0aWxzLmdldFF1ZXJ5RWxlbWVudChlbGVtKTtcbiAgICB2YXIgY29tcGFuaW9uID0gRmxpY2tpdHkuZGF0YShlbGVtKTsgLy8gc3RvcCBpZiBubyBjb21wYW5pb24gb3IgY29tcGFuaW9uIGlzIHNlbGZcblxuICAgIGlmICghY29tcGFuaW9uIHx8IGNvbXBhbmlvbiA9PSB0aGlzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5uYXZDb21wYW5pb24gPSBjb21wYW5pb247IC8vIGNvbXBhbmlvbiBzZWxlY3RcblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLm9uTmF2Q29tcGFuaW9uU2VsZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgX3RoaXMubmF2Q29tcGFuaW9uU2VsZWN0KCk7XG4gICAgfTtcblxuICAgIGNvbXBhbmlvbi5vbignc2VsZWN0JywgdGhpcy5vbk5hdkNvbXBhbmlvblNlbGVjdCk7IC8vIGNsaWNrXG5cbiAgICB0aGlzLm9uKCdzdGF0aWNDbGljaycsIHRoaXMub25OYXZTdGF0aWNDbGljayk7XG4gICAgdGhpcy5uYXZDb21wYW5pb25TZWxlY3QodHJ1ZSk7XG4gIH07XG5cbiAgcHJvdG8ubmF2Q29tcGFuaW9uU2VsZWN0ID0gZnVuY3Rpb24gKGlzSW5zdGFudCkge1xuICAgIGlmICghdGhpcy5uYXZDb21wYW5pb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIHNlbGVjdCBzbGlkZSB0aGF0IG1hdGNoZXMgZmlyc3QgY2VsbCBvZiBzbGlkZVxuXG5cbiAgICB2YXIgc2VsZWN0ZWRDZWxsID0gdGhpcy5uYXZDb21wYW5pb24uc2VsZWN0ZWRDZWxsc1swXTtcbiAgICB2YXIgZmlyc3RJbmRleCA9IHRoaXMubmF2Q29tcGFuaW9uLmNlbGxzLmluZGV4T2Yoc2VsZWN0ZWRDZWxsKTtcbiAgICB2YXIgbGFzdEluZGV4ID0gZmlyc3RJbmRleCArIHRoaXMubmF2Q29tcGFuaW9uLnNlbGVjdGVkQ2VsbHMubGVuZ3RoIC0gMTtcbiAgICB2YXIgc2VsZWN0SW5kZXggPSBNYXRoLmZsb29yKGxlcnAoZmlyc3RJbmRleCwgbGFzdEluZGV4LCB0aGlzLm5hdkNvbXBhbmlvbi5jZWxsQWxpZ24pKTtcbiAgICB0aGlzLnNlbGVjdENlbGwoc2VsZWN0SW5kZXgsIGZhbHNlLCBpc0luc3RhbnQpOyAvLyBzZXQgbmF2IHNlbGVjdGVkIGNsYXNzXG5cbiAgICB0aGlzLnJlbW92ZU5hdlNlbGVjdGVkRWxlbWVudHMoKTsgLy8gc3RvcCBpZiBjb21wYW5pb24gaGFzIG1vcmUgY2VsbHMgdGhhbiB0aGlzIG9uZVxuXG4gICAgaWYgKHNlbGVjdEluZGV4ID49IHRoaXMuY2VsbHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHNlbGVjdGVkQ2VsbHMgPSB0aGlzLmNlbGxzLnNsaWNlKGZpcnN0SW5kZXgsIGxhc3RJbmRleCArIDEpO1xuICAgIHRoaXMubmF2U2VsZWN0ZWRFbGVtZW50cyA9IHNlbGVjdGVkQ2VsbHMubWFwKGZ1bmN0aW9uIChjZWxsKSB7XG4gICAgICByZXR1cm4gY2VsbC5lbGVtZW50O1xuICAgIH0pO1xuICAgIHRoaXMuY2hhbmdlTmF2U2VsZWN0ZWRDbGFzcygnYWRkJyk7XG4gIH07XG5cbiAgZnVuY3Rpb24gbGVycChhLCBiLCB0KSB7XG4gICAgcmV0dXJuIChiIC0gYSkgKiB0ICsgYTtcbiAgfVxuXG4gIHByb3RvLmNoYW5nZU5hdlNlbGVjdGVkQ2xhc3MgPSBmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgdGhpcy5uYXZTZWxlY3RlZEVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKG5hdkVsZW0pIHtcbiAgICAgIG5hdkVsZW0uY2xhc3NMaXN0W21ldGhvZF0oJ2lzLW5hdi1zZWxlY3RlZCcpO1xuICAgIH0pO1xuICB9O1xuXG4gIHByb3RvLmFjdGl2YXRlQXNOYXZGb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5uYXZDb21wYW5pb25TZWxlY3QodHJ1ZSk7XG4gIH07XG5cbiAgcHJvdG8ucmVtb3ZlTmF2U2VsZWN0ZWRFbGVtZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubmF2U2VsZWN0ZWRFbGVtZW50cykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY2hhbmdlTmF2U2VsZWN0ZWRDbGFzcygncmVtb3ZlJyk7XG4gICAgZGVsZXRlIHRoaXMubmF2U2VsZWN0ZWRFbGVtZW50cztcbiAgfTtcblxuICBwcm90by5vbk5hdlN0YXRpY0NsaWNrID0gZnVuY3Rpb24gKGV2ZW50LCBwb2ludGVyLCBjZWxsRWxlbWVudCwgY2VsbEluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBjZWxsSW5kZXggPT0gJ251bWJlcicpIHtcbiAgICAgIHRoaXMubmF2Q29tcGFuaW9uLnNlbGVjdENlbGwoY2VsbEluZGV4KTtcbiAgICB9XG4gIH07XG5cbiAgcHJvdG8uZGVhY3RpdmF0ZUFzTmF2Rm9yID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucmVtb3ZlTmF2U2VsZWN0ZWRFbGVtZW50cygpO1xuICB9O1xuXG4gIHByb3RvLmRlc3Ryb3lBc05hdkZvciA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubmF2Q29tcGFuaW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5uYXZDb21wYW5pb24ub2ZmKCdzZWxlY3QnLCB0aGlzLm9uTmF2Q29tcGFuaW9uU2VsZWN0KTtcbiAgICB0aGlzLm9mZignc3RhdGljQ2xpY2snLCB0aGlzLm9uTmF2U3RhdGljQ2xpY2spO1xuICAgIGRlbGV0ZSB0aGlzLm5hdkNvbXBhbmlvbjtcbiAgfTsgLy8gLS0tLS0gIC0tLS0tIC8vXG5cblxuICByZXR1cm4gRmxpY2tpdHk7XG59KTtcbi8qIVxuICogaW1hZ2VzTG9hZGVkIHY0LjEuNFxuICogSmF2YVNjcmlwdCBpcyBhbGwgbGlrZSBcIllvdSBpbWFnZXMgYXJlIGRvbmUgeWV0IG9yIHdoYXQ/XCJcbiAqIE1JVCBMaWNlbnNlXG4gKi9cblxuXG4oZnVuY3Rpb24gKHdpbmRvdywgZmFjdG9yeSkge1xuICAndXNlIHN0cmljdCc7IC8vIHVuaXZlcnNhbCBtb2R1bGUgZGVmaW5pdGlvblxuXG4gIC8qZ2xvYmFsIGRlZmluZTogZmFsc2UsIG1vZHVsZTogZmFsc2UsIHJlcXVpcmU6IGZhbHNlICovXG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EXG4gICAgZGVmaW5lKCdpbWFnZXNsb2FkZWQvaW1hZ2VzbG9hZGVkJywgWydldi1lbWl0dGVyL2V2LWVtaXR0ZXInXSwgZnVuY3Rpb24gKEV2RW1pdHRlcikge1xuICAgICAgcmV0dXJuIGZhY3Rvcnkod2luZG93LCBFdkVtaXR0ZXIpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgbW9kdWxlID09PSBcInVuZGVmaW5lZFwiID8gXCJ1bmRlZmluZWRcIiA6IF90eXBlb2YobW9kdWxlKSkgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSh3aW5kb3csIHJlcXVpcmUoJ2V2LWVtaXR0ZXInKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gYnJvd3NlciBnbG9iYWxcbiAgICB3aW5kb3cuaW1hZ2VzTG9hZGVkID0gZmFjdG9yeSh3aW5kb3csIHdpbmRvdy5FdkVtaXR0ZXIpO1xuICB9XG59KSh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHZvaWQgMCwgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gIGZhY3RvcnkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cbmZ1bmN0aW9uIGZhY3Rvcnkod2luZG93LCBFdkVtaXR0ZXIpIHtcbiAgdmFyICQgPSB3aW5kb3cualF1ZXJ5O1xuICB2YXIgY29uc29sZSA9IHdpbmRvdy5jb25zb2xlOyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBoZWxwZXJzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG4gIC8vIGV4dGVuZCBvYmplY3RzXG5cbiAgZnVuY3Rpb24gZXh0ZW5kKGEsIGIpIHtcbiAgICBmb3IgKHZhciBwcm9wIGluIGIpIHtcbiAgICAgIGFbcHJvcF0gPSBiW3Byb3BdO1xuICAgIH1cblxuICAgIHJldHVybiBhO1xuICB9XG5cbiAgdmFyIGFycmF5U2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7IC8vIHR1cm4gZWxlbWVudCBvciBub2RlTGlzdCBpbnRvIGFuIGFycmF5XG5cbiAgZnVuY3Rpb24gbWFrZUFycmF5KG9iaikge1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICAgIC8vIHVzZSBvYmplY3QgaWYgYWxyZWFkeSBhbiBhcnJheVxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICB2YXIgaXNBcnJheUxpa2UgPSBfdHlwZW9mKG9iaikgPT0gJ29iamVjdCcgJiYgdHlwZW9mIG9iai5sZW5ndGggPT0gJ251bWJlcic7XG5cbiAgICBpZiAoaXNBcnJheUxpa2UpIHtcbiAgICAgIC8vIGNvbnZlcnQgbm9kZUxpc3QgdG8gYXJyYXlcbiAgICAgIHJldHVybiBhcnJheVNsaWNlLmNhbGwob2JqKTtcbiAgICB9IC8vIGFycmF5IG9mIHNpbmdsZSBpbmRleFxuXG5cbiAgICByZXR1cm4gW29ial07XG4gIH0gLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gaW1hZ2VzTG9hZGVkIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7QXJyYXksIEVsZW1lbnQsIE5vZGVMaXN0LCBTdHJpbmd9IGVsZW1cbiAgICogQHBhcmFtIHtPYmplY3Qgb3IgRnVuY3Rpb259IG9wdGlvbnMgLSBpZiBmdW5jdGlvbiwgdXNlIGFzIGNhbGxiYWNrXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG9uQWx3YXlzIC0gY2FsbGJhY2sgZnVuY3Rpb25cbiAgICovXG5cblxuICBmdW5jdGlvbiBJbWFnZXNMb2FkZWQoZWxlbSwgb3B0aW9ucywgb25BbHdheXMpIHtcbiAgICAvLyBjb2VyY2UgSW1hZ2VzTG9hZGVkKCkgd2l0aG91dCBuZXcsIHRvIGJlIG5ldyBJbWFnZXNMb2FkZWQoKVxuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBJbWFnZXNMb2FkZWQpKSB7XG4gICAgICByZXR1cm4gbmV3IEltYWdlc0xvYWRlZChlbGVtLCBvcHRpb25zLCBvbkFsd2F5cyk7XG4gICAgfSAvLyB1c2UgZWxlbSBhcyBzZWxlY3RvciBzdHJpbmdcblxuXG4gICAgdmFyIHF1ZXJ5RWxlbSA9IGVsZW07XG5cbiAgICBpZiAodHlwZW9mIGVsZW0gPT0gJ3N0cmluZycpIHtcbiAgICAgIHF1ZXJ5RWxlbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoZWxlbSk7XG4gICAgfSAvLyBiYWlsIGlmIGJhZCBlbGVtZW50XG5cblxuICAgIGlmICghcXVlcnlFbGVtKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdCYWQgZWxlbWVudCBmb3IgaW1hZ2VzTG9hZGVkICcgKyAocXVlcnlFbGVtIHx8IGVsZW0pKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmVsZW1lbnRzID0gbWFrZUFycmF5KHF1ZXJ5RWxlbSk7XG4gICAgdGhpcy5vcHRpb25zID0gZXh0ZW5kKHt9LCB0aGlzLm9wdGlvbnMpOyAvLyBzaGlmdCBhcmd1bWVudHMgaWYgbm8gb3B0aW9ucyBzZXRcblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBvbkFsd2F5cyA9IG9wdGlvbnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4dGVuZCh0aGlzLm9wdGlvbnMsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGlmIChvbkFsd2F5cykge1xuICAgICAgdGhpcy5vbignYWx3YXlzJywgb25BbHdheXMpO1xuICAgIH1cblxuICAgIHRoaXMuZ2V0SW1hZ2VzKCk7XG5cbiAgICBpZiAoJCkge1xuICAgICAgLy8gYWRkIGpRdWVyeSBEZWZlcnJlZCBvYmplY3RcbiAgICAgIHRoaXMuanFEZWZlcnJlZCA9IG5ldyAkLkRlZmVycmVkKCk7XG4gICAgfSAvLyBIQUNLIGNoZWNrIGFzeW5jIHRvIGFsbG93IHRpbWUgdG8gYmluZCBsaXN0ZW5lcnNcblxuXG4gICAgc2V0VGltZW91dCh0aGlzLmNoZWNrLmJpbmQodGhpcykpO1xuICB9XG5cbiAgSW1hZ2VzTG9hZGVkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZFbWl0dGVyLnByb3RvdHlwZSk7XG4gIEltYWdlc0xvYWRlZC5wcm90b3R5cGUub3B0aW9ucyA9IHt9O1xuXG4gIEltYWdlc0xvYWRlZC5wcm90b3R5cGUuZ2V0SW1hZ2VzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW1hZ2VzID0gW107IC8vIGZpbHRlciAmIGZpbmQgaXRlbXMgaWYgd2UgaGF2ZSBhbiBpdGVtIHNlbGVjdG9yXG5cbiAgICB0aGlzLmVsZW1lbnRzLmZvckVhY2godGhpcy5hZGRFbGVtZW50SW1hZ2VzLCB0aGlzKTtcbiAgfTtcbiAgLyoqXG4gICAqIEBwYXJhbSB7Tm9kZX0gZWxlbWVudFxuICAgKi9cblxuXG4gIEltYWdlc0xvYWRlZC5wcm90b3R5cGUuYWRkRWxlbWVudEltYWdlcyA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgLy8gZmlsdGVyIHNpYmxpbmdzXG4gICAgaWYgKGVsZW0ubm9kZU5hbWUgPT0gJ0lNRycpIHtcbiAgICAgIHRoaXMuYWRkSW1hZ2UoZWxlbSk7XG4gICAgfSAvLyBnZXQgYmFja2dyb3VuZCBpbWFnZSBvbiBlbGVtZW50XG5cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYmFja2dyb3VuZCA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5hZGRFbGVtZW50QmFja2dyb3VuZEltYWdlcyhlbGVtKTtcbiAgICB9IC8vIGZpbmQgY2hpbGRyZW5cbiAgICAvLyBubyBub24tZWxlbWVudCBub2RlcywgIzE0M1xuXG5cbiAgICB2YXIgbm9kZVR5cGUgPSBlbGVtLm5vZGVUeXBlO1xuXG4gICAgaWYgKCFub2RlVHlwZSB8fCAhZWxlbWVudE5vZGVUeXBlc1tub2RlVHlwZV0pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgY2hpbGRJbWdzID0gZWxlbS5xdWVyeVNlbGVjdG9yQWxsKCdpbWcnKTsgLy8gY29uY2F0IGNoaWxkRWxlbXMgdG8gZmlsdGVyRm91bmQgYXJyYXlcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRJbWdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgaW1nID0gY2hpbGRJbWdzW2ldO1xuICAgICAgdGhpcy5hZGRJbWFnZShpbWcpO1xuICAgIH0gLy8gZ2V0IGNoaWxkIGJhY2tncm91bmQgaW1hZ2VzXG5cblxuICAgIGlmICh0eXBlb2YgdGhpcy5vcHRpb25zLmJhY2tncm91bmQgPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhciBjaGlsZHJlbiA9IGVsZW0ucXVlcnlTZWxlY3RvckFsbCh0aGlzLm9wdGlvbnMuYmFja2dyb3VuZCk7XG5cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXTtcbiAgICAgICAgdGhpcy5hZGRFbGVtZW50QmFja2dyb3VuZEltYWdlcyhjaGlsZCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHZhciBlbGVtZW50Tm9kZVR5cGVzID0ge1xuICAgIDE6IHRydWUsXG4gICAgOTogdHJ1ZSxcbiAgICAxMTogdHJ1ZVxuICB9O1xuXG4gIEltYWdlc0xvYWRlZC5wcm90b3R5cGUuYWRkRWxlbWVudEJhY2tncm91bmRJbWFnZXMgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgIHZhciBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGUoZWxlbSk7XG5cbiAgICBpZiAoIXN0eWxlKSB7XG4gICAgICAvLyBGaXJlZm94IHJldHVybnMgbnVsbCBpZiBpbiBhIGhpZGRlbiBpZnJhbWUgaHR0cHM6Ly9idWd6aWwubGEvNTQ4Mzk3XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBnZXQgdXJsIGluc2lkZSB1cmwoXCIuLi5cIilcblxuXG4gICAgdmFyIHJlVVJMID0gL3VybFxcKChbJ1wiXSk/KC4qPylcXDFcXCkvZ2k7XG4gICAgdmFyIG1hdGNoZXMgPSByZVVSTC5leGVjKHN0eWxlLmJhY2tncm91bmRJbWFnZSk7XG5cbiAgICB3aGlsZSAobWF0Y2hlcyAhPT0gbnVsbCkge1xuICAgICAgdmFyIHVybCA9IG1hdGNoZXMgJiYgbWF0Y2hlc1syXTtcblxuICAgICAgaWYgKHVybCkge1xuICAgICAgICB0aGlzLmFkZEJhY2tncm91bmQodXJsLCBlbGVtKTtcbiAgICAgIH1cblxuICAgICAgbWF0Y2hlcyA9IHJlVVJMLmV4ZWMoc3R5bGUuYmFja2dyb3VuZEltYWdlKTtcbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBAcGFyYW0ge0ltYWdlfSBpbWdcbiAgICovXG5cblxuICBJbWFnZXNMb2FkZWQucHJvdG90eXBlLmFkZEltYWdlID0gZnVuY3Rpb24gKGltZykge1xuICAgIHZhciBsb2FkaW5nSW1hZ2UgPSBuZXcgTG9hZGluZ0ltYWdlKGltZyk7XG4gICAgdGhpcy5pbWFnZXMucHVzaChsb2FkaW5nSW1hZ2UpO1xuICB9O1xuXG4gIEltYWdlc0xvYWRlZC5wcm90b3R5cGUuYWRkQmFja2dyb3VuZCA9IGZ1bmN0aW9uICh1cmwsIGVsZW0pIHtcbiAgICB2YXIgYmFja2dyb3VuZCA9IG5ldyBCYWNrZ3JvdW5kKHVybCwgZWxlbSk7XG4gICAgdGhpcy5pbWFnZXMucHVzaChiYWNrZ3JvdW5kKTtcbiAgfTtcblxuICBJbWFnZXNMb2FkZWQucHJvdG90eXBlLmNoZWNrID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLnByb2dyZXNzZWRDb3VudCA9IDA7XG4gICAgdGhpcy5oYXNBbnlCcm9rZW4gPSBmYWxzZTsgLy8gY29tcGxldGUgaWYgbm8gaW1hZ2VzXG5cbiAgICBpZiAoIXRoaXMuaW1hZ2VzLmxlbmd0aCkge1xuICAgICAgdGhpcy5jb21wbGV0ZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUHJvZ3Jlc3MoaW1hZ2UsIGVsZW0sIG1lc3NhZ2UpIHtcbiAgICAgIC8vIEhBQ0sgLSBDaHJvbWUgdHJpZ2dlcnMgZXZlbnQgYmVmb3JlIG9iamVjdCBwcm9wZXJ0aWVzIGhhdmUgY2hhbmdlZC4gIzgzXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX3RoaXMucHJvZ3Jlc3MoaW1hZ2UsIGVsZW0sIG1lc3NhZ2UpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5pbWFnZXMuZm9yRWFjaChmdW5jdGlvbiAobG9hZGluZ0ltYWdlKSB7XG4gICAgICBsb2FkaW5nSW1hZ2Uub25jZSgncHJvZ3Jlc3MnLCBvblByb2dyZXNzKTtcbiAgICAgIGxvYWRpbmdJbWFnZS5jaGVjaygpO1xuICAgIH0pO1xuICB9O1xuXG4gIEltYWdlc0xvYWRlZC5wcm90b3R5cGUucHJvZ3Jlc3MgPSBmdW5jdGlvbiAoaW1hZ2UsIGVsZW0sIG1lc3NhZ2UpIHtcbiAgICB0aGlzLnByb2dyZXNzZWRDb3VudCsrO1xuICAgIHRoaXMuaGFzQW55QnJva2VuID0gdGhpcy5oYXNBbnlCcm9rZW4gfHwgIWltYWdlLmlzTG9hZGVkOyAvLyBwcm9ncmVzcyBldmVudFxuXG4gICAgdGhpcy5lbWl0RXZlbnQoJ3Byb2dyZXNzJywgW3RoaXMsIGltYWdlLCBlbGVtXSk7XG5cbiAgICBpZiAodGhpcy5qcURlZmVycmVkICYmIHRoaXMuanFEZWZlcnJlZC5ub3RpZnkpIHtcbiAgICAgIHRoaXMuanFEZWZlcnJlZC5ub3RpZnkodGhpcywgaW1hZ2UpO1xuICAgIH0gLy8gY2hlY2sgaWYgY29tcGxldGVkXG5cblxuICAgIGlmICh0aGlzLnByb2dyZXNzZWRDb3VudCA9PSB0aGlzLmltYWdlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuY29tcGxldGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmRlYnVnICYmIGNvbnNvbGUpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdwcm9ncmVzczogJyArIG1lc3NhZ2UsIGltYWdlLCBlbGVtKTtcbiAgICB9XG4gIH07XG5cbiAgSW1hZ2VzTG9hZGVkLnByb3RvdHlwZS5jb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZXZlbnROYW1lID0gdGhpcy5oYXNBbnlCcm9rZW4gPyAnZmFpbCcgOiAnZG9uZSc7XG4gICAgdGhpcy5pc0NvbXBsZXRlID0gdHJ1ZTtcbiAgICB0aGlzLmVtaXRFdmVudChldmVudE5hbWUsIFt0aGlzXSk7XG4gICAgdGhpcy5lbWl0RXZlbnQoJ2Fsd2F5cycsIFt0aGlzXSk7XG5cbiAgICBpZiAodGhpcy5qcURlZmVycmVkKSB7XG4gICAgICB2YXIganFNZXRob2QgPSB0aGlzLmhhc0FueUJyb2tlbiA/ICdyZWplY3QnIDogJ3Jlc29sdmUnO1xuICAgICAgdGhpcy5qcURlZmVycmVkW2pxTWV0aG9kXSh0aGlzKTtcbiAgICB9XG4gIH07IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG5cbiAgZnVuY3Rpb24gTG9hZGluZ0ltYWdlKGltZykge1xuICAgIHRoaXMuaW1nID0gaW1nO1xuICB9XG5cbiAgTG9hZGluZ0ltYWdlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZFbWl0dGVyLnByb3RvdHlwZSk7XG5cbiAgTG9hZGluZ0ltYWdlLnByb3RvdHlwZS5jaGVjayA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBJZiBjb21wbGV0ZSBpcyB0cnVlIGFuZCBicm93c2VyIHN1cHBvcnRzIG5hdHVyYWwgc2l6ZXMsXG4gICAgLy8gdHJ5IHRvIGNoZWNrIGZvciBpbWFnZSBzdGF0dXMgbWFudWFsbHkuXG4gICAgdmFyIGlzQ29tcGxldGUgPSB0aGlzLmdldElzSW1hZ2VDb21wbGV0ZSgpO1xuXG4gICAgaWYgKGlzQ29tcGxldGUpIHtcbiAgICAgIC8vIHJlcG9ydCBiYXNlZCBvbiBuYXR1cmFsV2lkdGhcbiAgICAgIHRoaXMuY29uZmlybSh0aGlzLmltZy5uYXR1cmFsV2lkdGggIT09IDAsICduYXR1cmFsV2lkdGgnKTtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIElmIG5vbmUgb2YgdGhlIGNoZWNrcyBhYm92ZSBtYXRjaGVkLCBzaW11bGF0ZSBsb2FkaW5nIG9uIGRldGFjaGVkIGVsZW1lbnQuXG5cblxuICAgIHRoaXMucHJveHlJbWFnZSA9IG5ldyBJbWFnZSgpO1xuICAgIHRoaXMucHJveHlJbWFnZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgdGhpcyk7XG4gICAgdGhpcy5wcm94eUltYWdlLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcyk7IC8vIGJpbmQgdG8gaW1hZ2UgYXMgd2VsbCBmb3IgRmlyZWZveC4gIzE5MVxuXG4gICAgdGhpcy5pbWcuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIHRoaXMpO1xuICAgIHRoaXMuaW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcyk7XG4gICAgdGhpcy5wcm94eUltYWdlLnNyYyA9IHRoaXMuaW1nLnNyYztcbiAgfTtcblxuICBMb2FkaW5nSW1hZ2UucHJvdG90eXBlLmdldElzSW1hZ2VDb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBjaGVjayBmb3Igbm9uLXplcm8sIG5vbi11bmRlZmluZWQgbmF0dXJhbFdpZHRoXG4gICAgLy8gZml4ZXMgU2FmYXJpK0luZmluaXRlU2Nyb2xsK01hc29ucnkgYnVnIGluZmluaXRlLXNjcm9sbCM2NzFcbiAgICByZXR1cm4gdGhpcy5pbWcuY29tcGxldGUgJiYgdGhpcy5pbWcubmF0dXJhbFdpZHRoO1xuICB9O1xuXG4gIExvYWRpbmdJbWFnZS5wcm90b3R5cGUuY29uZmlybSA9IGZ1bmN0aW9uIChpc0xvYWRlZCwgbWVzc2FnZSkge1xuICAgIHRoaXMuaXNMb2FkZWQgPSBpc0xvYWRlZDtcbiAgICB0aGlzLmVtaXRFdmVudCgncHJvZ3Jlc3MnLCBbdGhpcywgdGhpcy5pbWcsIG1lc3NhZ2VdKTtcbiAgfTsgLy8gLS0tLS0gZXZlbnRzIC0tLS0tIC8vXG4gIC8vIHRyaWdnZXIgc3BlY2lmaWVkIGhhbmRsZXIgZm9yIGV2ZW50IHR5cGVcblxuXG4gIExvYWRpbmdJbWFnZS5wcm90b3R5cGUuaGFuZGxlRXZlbnQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgbWV0aG9kID0gJ29uJyArIGV2ZW50LnR5cGU7XG5cbiAgICBpZiAodGhpc1ttZXRob2RdKSB7XG4gICAgICB0aGlzW21ldGhvZF0oZXZlbnQpO1xuICAgIH1cbiAgfTtcblxuICBMb2FkaW5nSW1hZ2UucHJvdG90eXBlLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmNvbmZpcm0odHJ1ZSwgJ29ubG9hZCcpO1xuICAgIHRoaXMudW5iaW5kRXZlbnRzKCk7XG4gIH07XG5cbiAgTG9hZGluZ0ltYWdlLnByb3RvdHlwZS5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuY29uZmlybShmYWxzZSwgJ29uZXJyb3InKTtcbiAgICB0aGlzLnVuYmluZEV2ZW50cygpO1xuICB9O1xuXG4gIExvYWRpbmdJbWFnZS5wcm90b3R5cGUudW5iaW5kRXZlbnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucHJveHlJbWFnZS5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkJywgdGhpcyk7XG4gICAgdGhpcy5wcm94eUltYWdlLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcyk7XG4gICAgdGhpcy5pbWcucmVtb3ZlRXZlbnRMaXN0ZW5lcignbG9hZCcsIHRoaXMpO1xuICAgIHRoaXMuaW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcyk7XG4gIH07IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIEJhY2tncm91bmQgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cblxuXG4gIGZ1bmN0aW9uIEJhY2tncm91bmQodXJsLCBlbGVtZW50KSB7XG4gICAgdGhpcy51cmwgPSB1cmw7XG4gICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLmltZyA9IG5ldyBJbWFnZSgpO1xuICB9IC8vIGluaGVyaXQgTG9hZGluZ0ltYWdlIHByb3RvdHlwZVxuXG5cbiAgQmFja2dyb3VuZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExvYWRpbmdJbWFnZS5wcm90b3R5cGUpO1xuXG4gIEJhY2tncm91bmQucHJvdG90eXBlLmNoZWNrID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCB0aGlzKTtcbiAgICB0aGlzLmltZy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIHRoaXMpO1xuICAgIHRoaXMuaW1nLnNyYyA9IHRoaXMudXJsOyAvLyBjaGVjayBpZiBpbWFnZSBpcyBhbHJlYWR5IGNvbXBsZXRlXG5cbiAgICB2YXIgaXNDb21wbGV0ZSA9IHRoaXMuZ2V0SXNJbWFnZUNvbXBsZXRlKCk7XG5cbiAgICBpZiAoaXNDb21wbGV0ZSkge1xuICAgICAgdGhpcy5jb25maXJtKHRoaXMuaW1nLm5hdHVyYWxXaWR0aCAhPT0gMCwgJ25hdHVyYWxXaWR0aCcpO1xuICAgICAgdGhpcy51bmJpbmRFdmVudHMoKTtcbiAgICB9XG4gIH07XG5cbiAgQmFja2dyb3VuZC5wcm90b3R5cGUudW5iaW5kRXZlbnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW1nLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWQnLCB0aGlzKTtcbiAgICB0aGlzLmltZy5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIHRoaXMpO1xuICB9O1xuXG4gIEJhY2tncm91bmQucHJvdG90eXBlLmNvbmZpcm0gPSBmdW5jdGlvbiAoaXNMb2FkZWQsIG1lc3NhZ2UpIHtcbiAgICB0aGlzLmlzTG9hZGVkID0gaXNMb2FkZWQ7XG4gICAgdGhpcy5lbWl0RXZlbnQoJ3Byb2dyZXNzJywgW3RoaXMsIHRoaXMuZWxlbWVudCwgbWVzc2FnZV0pO1xuICB9OyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBqUXVlcnkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cblxuXG4gIEltYWdlc0xvYWRlZC5tYWtlSlF1ZXJ5UGx1Z2luID0gZnVuY3Rpb24gKGpRdWVyeSkge1xuICAgIGpRdWVyeSA9IGpRdWVyeSB8fCB3aW5kb3cualF1ZXJ5O1xuXG4gICAgaWYgKCFqUXVlcnkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIHNldCBsb2NhbCB2YXJpYWJsZVxuXG5cbiAgICAkID0galF1ZXJ5OyAvLyAkKCkuaW1hZ2VzTG9hZGVkKClcblxuICAgICQuZm4uaW1hZ2VzTG9hZGVkID0gZnVuY3Rpb24gKG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgaW5zdGFuY2UgPSBuZXcgSW1hZ2VzTG9hZGVkKHRoaXMsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgIHJldHVybiBpbnN0YW5jZS5qcURlZmVycmVkLnByb21pc2UoJCh0aGlzKSk7XG4gICAgfTtcbiAgfTsgLy8gdHJ5IG1ha2luZyBwbHVnaW5cblxuXG4gIEltYWdlc0xvYWRlZC5tYWtlSlF1ZXJ5UGx1Z2luKCk7IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG4gIHJldHVybiBJbWFnZXNMb2FkZWQ7XG59KTtcbi8qIVxuICogRmxpY2tpdHkgaW1hZ2VzTG9hZGVkIHYyLjAuMFxuICogZW5hYmxlcyBpbWFnZXNMb2FkZWQgb3B0aW9uIGZvciBGbGlja2l0eVxuICovXG5cbi8qanNoaW50IGJyb3dzZXI6IHRydWUsIHN0cmljdDogdHJ1ZSwgdW5kZWY6IHRydWUsIHVudXNlZDogdHJ1ZSAqL1xuXG5cbihmdW5jdGlvbiAod2luZG93LCBmYWN0b3J5KSB7XG4gIC8vIHVuaXZlcnNhbCBtb2R1bGUgZGVmaW5pdGlvblxuXG4gIC8qanNoaW50IHN0cmljdDogZmFsc2UgKi9cblxuICAvKmdsb2JhbHMgZGVmaW5lLCBtb2R1bGUsIHJlcXVpcmUgKi9cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EXG4gICAgZGVmaW5lKFsnZmxpY2tpdHkvanMvaW5kZXgnLCAnaW1hZ2VzbG9hZGVkL2ltYWdlc2xvYWRlZCddLCBmdW5jdGlvbiAoRmxpY2tpdHksIGltYWdlc0xvYWRlZCkge1xuICAgICAgcmV0dXJuIGZhY3Rvcnkod2luZG93LCBGbGlja2l0eSwgaW1hZ2VzTG9hZGVkKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIG1vZHVsZSA9PT0gXCJ1bmRlZmluZWRcIiA/IFwidW5kZWZpbmVkXCIgOiBfdHlwZW9mKG1vZHVsZSkpID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnkod2luZG93LCByZXF1aXJlKCdmbGlja2l0eScpLCByZXF1aXJlKCdpbWFnZXNsb2FkZWQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gYnJvd3NlciBnbG9iYWxcbiAgICB3aW5kb3cuRmxpY2tpdHkgPSBmYWN0b3J5KHdpbmRvdywgd2luZG93LkZsaWNraXR5LCB3aW5kb3cuaW1hZ2VzTG9hZGVkKTtcbiAgfVxufSkod2luZG93LCBmdW5jdGlvbiBmYWN0b3J5KHdpbmRvdywgRmxpY2tpdHksIGltYWdlc0xvYWRlZCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgRmxpY2tpdHkuY3JlYXRlTWV0aG9kcy5wdXNoKCdfY3JlYXRlSW1hZ2VzTG9hZGVkJyk7XG4gIHZhciBwcm90byA9IEZsaWNraXR5LnByb3RvdHlwZTtcblxuICBwcm90by5fY3JlYXRlSW1hZ2VzTG9hZGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMub24oJ2FjdGl2YXRlJywgdGhpcy5pbWFnZXNMb2FkZWQpO1xuICB9O1xuXG4gIHByb3RvLmltYWdlc0xvYWRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMub3B0aW9ucy5pbWFnZXNMb2FkZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gb25JbWFnZXNMb2FkZWRQcm9ncmVzcyhpbnN0YW5jZSwgaW1hZ2UpIHtcbiAgICAgIHZhciBjZWxsID0gX3RoaXMuZ2V0UGFyZW50Q2VsbChpbWFnZS5pbWcpO1xuXG4gICAgICBfdGhpcy5jZWxsU2l6ZUNoYW5nZShjZWxsICYmIGNlbGwuZWxlbWVudCk7XG5cbiAgICAgIGlmICghX3RoaXMub3B0aW9ucy5mcmVlU2Nyb2xsKSB7XG4gICAgICAgIF90aGlzLnBvc2l0aW9uU2xpZGVyQXRTZWxlY3RlZCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGltYWdlc0xvYWRlZCh0aGlzLnNsaWRlcikub24oJ3Byb2dyZXNzJywgb25JbWFnZXNMb2FkZWRQcm9ncmVzcyk7XG4gIH07XG5cbiAgcmV0dXJuIEZsaWNraXR5O1xufSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgU2hhbmUgQ2FyclxuICpcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS92b3RlNTM5L3BsYWNlaG9sZHJcbiAqIFxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICogXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKiBcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG4oZnVuY3Rpb24gKCQsIG5zLCBwbGFjZWhvbGRlckF0dHJpYnV0ZSwgb3JpZ1ZhbEZuKSB7XG4gIC8vIFV0aWxpdHkgZnVuY3Rpb25zXG4gIHZhciBwdXRQbGFjZWhvbGRlciA9IGZ1bmN0aW9uIHB1dFBsYWNlaG9sZGVyKCkge1xuICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XG5cbiAgICBpZiAoISR0aGlzW29yaWdWYWxGbl0oKSkge1xuICAgICAgJHRoaXMuYWRkQ2xhc3MobnMpO1xuXG4gICAgICBpZiAoJHRoaXMuYXR0cihcInR5cGVcIikgPT09IFwicGFzc3dvcmRcIikge1xuICAgICAgICAkdGhpcy5hdHRyKFwidHlwZVwiLCBcInRleHRcIik7XG4gICAgICAgICR0aGlzLmRhdGEobnMgKyBcIi1wd2RcIiwgdHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgICR0aGlzW29yaWdWYWxGbl0oJHRoaXMuYXR0cihwbGFjZWhvbGRlckF0dHJpYnV0ZSkpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgY2xlYXJQbGFjZWhvbGRlciA9IGZ1bmN0aW9uIGNsZWFyUGxhY2Vob2xkZXIoKSB7XG4gICAgdmFyICR0aGlzID0gJCh0aGlzKTtcbiAgICAkdGhpcy5yZW1vdmVDbGFzcyhucyk7XG5cbiAgICBpZiAoJHRoaXMuZGF0YShucyArIFwiLXB3ZFwiKSkge1xuICAgICAgJHRoaXMuYXR0cihcInR5cGVcIiwgXCJwYXNzd29yZFwiKTtcbiAgICB9XG5cbiAgICBpZiAoJHRoaXNbb3JpZ1ZhbEZuXSgpID09PSAkdGhpcy5hdHRyKHBsYWNlaG9sZGVyQXR0cmlidXRlKSkge1xuICAgICAgJHRoaXNbb3JpZ1ZhbEZuXShcIlwiKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIGNsZWFyUGxhY2Vob2xkZXJzSW5Gb3JtID0gZnVuY3Rpb24gY2xlYXJQbGFjZWhvbGRlcnNJbkZvcm0oKSB7XG4gICAgJCh0aGlzKS5maW5kKFwiW1wiICsgcGxhY2Vob2xkZXJBdHRyaWJ1dGUgKyBcIl1cIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoJCh0aGlzKS5kYXRhKG5zKSkgY2xlYXJQbGFjZWhvbGRlci5jYWxsKHRoaXMpO1xuICAgIH0pO1xuICB9O1xuXG4gICQuZm4ucGxhY2Vob2xkciA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBEb24ndCBldmFsdWF0ZSB0aGUgcG9seWZpbGwgaWYgdGhlIGJyb3dzZXIgc3VwcG9ydHMgcGxhY2Vob2xkZXJzXG4gICAgaWYgKHBsYWNlaG9sZGVyQXR0cmlidXRlIGluIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKSkgcmV0dXJuIHRoaXM7IC8vIEZpbmQgYW5kIGl0ZXJhdGUgdGhyb3VnaCBhbGwgaW5wdXRzIHRoYXQgaGF2ZSBhIHBsYWNlaG9sZGVyIGF0dHJpYnV0ZVxuXG4gICAgJCh0aGlzKS5maW5kKFwiW1wiICsgcGxhY2Vob2xkZXJBdHRyaWJ1dGUgKyBcIl1cIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpOyAvLyBsZWF2ZSBub3cgaWYgd2UndmUgcG9seWZpbGxlZCB0aGlzIGVsZW1lbnQgYmVmb3JlXG5cbiAgICAgIGlmICgkdGhpcy5kYXRhKG5zKSkgcmV0dXJuO1xuICAgICAgJHRoaXMuZGF0YShucywgdHJ1ZSk7IC8vIHB1dCB0aGUgcGxhY2Vob2xkZXIgaW50byB0aGUgdmFsdWVcblxuICAgICAgcHV0UGxhY2Vob2xkZXIuY2FsbCh0aGlzKTsgLy8gaGFuZGxlIGZvY3VzIGFuZCBibHVyIGV2ZW50c1xuXG4gICAgICAkdGhpcy5mb2N1cyhjbGVhclBsYWNlaG9sZGVyKTtcbiAgICAgICR0aGlzLmJsdXIocHV0UGxhY2Vob2xkZXIpO1xuICAgIH0pOyAvLyBGaW5kIGFuZCBpdGVyYXRlIHRocm91Z2ggYWxsIGZvcm0gZWxlbWVudHMgaW4gb3JkZXIgdG8gcHJldmVudFxuICAgIC8vIHBsYWNlaG9sZGVycyBmcm9tIGJlaW5nIHN1Ym1pdHRlZCBpbiBmb3Jtcy5cblxuICAgICQodGhpcykuZmluZChcImZvcm1cIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpOyAvLyBsZWF2ZSBub3cgaWYgd2UndmUgcG9seWZpbGxlZCB0aGlzIGVsZW1lbnQgYmVmb3JlXG5cbiAgICAgIGlmICgkdGhpcy5kYXRhKG5zKSkgcmV0dXJuO1xuICAgICAgJHRoaXMuZGF0YShucywgdHJ1ZSk7XG4gICAgICAkdGhpcy5zdWJtaXQoY2xlYXJQbGFjZWhvbGRlcnNJbkZvcm0pO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9OyAvLyBPdmVyd3JpdGUgdGhlIGV4aXN0aW5nIGpRdWVyeSB2YWwoKSBmdW5jdGlvblxuXG5cbiAgJC5mbltvcmlnVmFsRm5dID0gJC5mbi52YWw7XG5cbiAgJC5mbi52YWwgPSBmdW5jdGlvbiAodHh0KSB7XG4gICAgdmFyICR0aGlzID0gJCh0aGlzKTtcblxuICAgIGlmICgkLnR5cGUodHh0KSA9PT0gXCJ1bmRlZmluZWRcIiAmJiAkdGhpcy5kYXRhKG5zKSAmJiAkdGhpc1tvcmlnVmFsRm5dKCkgPT09ICR0aGlzLmF0dHIocGxhY2Vob2xkZXJBdHRyaWJ1dGUpKSB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG5cbiAgICB2YXIgaXNzdHIgPSAkLnR5cGUodHh0KSA9PT0gXCJzdHJpbmdcIjtcblxuICAgIGlmIChpc3N0cikge1xuICAgICAgY2xlYXJQbGFjZWhvbGRlci5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIHZhciByZXQgPSAkLmZuW29yaWdWYWxGbl0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIGlmIChpc3N0ciAmJiAhdHh0KSB7XG4gICAgICBwdXRQbGFjZWhvbGRlci5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH07IC8vIEV2YWx1YXRlIHRoZSBzY3JpcHQgb24gcGFnZSByZWFkeVxuXG5cbiAgJChmdW5jdGlvbiAoKSB7XG4gICAgJChkb2N1bWVudCkucGxhY2Vob2xkcigpO1xuICB9KTsgLy8gQWRkIGRlZmF1bHQgQ1NTIHJ1bGVcblxuICBkb2N1bWVudC53cml0ZShcIjxzdHlsZT4ucGxhY2Vob2xkcntjb2xvcjojQUFBO308L3N0eWxlPlwiKTtcbn0pKGpRdWVyeSwgXCJwbGFjZWhvbGRyXCIsIFwicGxhY2Vob2xkZXJcIiwgXCJwbGFjZWhvbGRyVmFsXCIpOyIsIiFmdW5jdGlvbiAocm9vdCwgbmFtZSwgbWFrZSkge1xuICBpZiAodHlwZW9mIG1vZHVsZSAhPSAndW5kZWZpbmVkJyAmJiBtb2R1bGVbJ2V4cG9ydHMnXSkgbW9kdWxlWydleHBvcnRzJ10gPSBtYWtlKCk7ZWxzZSByb290W25hbWVdID0gbWFrZSgpO1xufSh0aGlzLCAndmVyZ2UnLCBmdW5jdGlvbiAoKSB7XG4gIHZhciB4cG9ydHMgPSB7fSxcbiAgICAgIHdpbiA9IHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LFxuICAgICAgZG9jID0gdHlwZW9mIGRvY3VtZW50ICE9ICd1bmRlZmluZWQnICYmIGRvY3VtZW50LFxuICAgICAgZG9jRWxlbSA9IGRvYyAmJiBkb2MuZG9jdW1lbnRFbGVtZW50LFxuICAgICAgbWF0Y2hNZWRpYSA9IHdpblsnbWF0Y2hNZWRpYSddIHx8IHdpblsnbXNNYXRjaE1lZGlhJ10sXG4gICAgICBtcSA9IG1hdGNoTWVkaWEgPyBmdW5jdGlvbiAocSkge1xuICAgIHJldHVybiAhIW1hdGNoTWVkaWEuY2FsbCh3aW4sIHEpLm1hdGNoZXM7XG4gIH0gOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuICAgICAgdmlld3BvcnRXID0geHBvcnRzWyd2aWV3cG9ydFcnXSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYSA9IGRvY0VsZW1bJ2NsaWVudFdpZHRoJ10sXG4gICAgICAgIGIgPSB3aW5bJ2lubmVyV2lkdGgnXTtcbiAgICByZXR1cm4gYSA8IGIgPyBiIDogYTtcbiAgfSxcbiAgICAgIHZpZXdwb3J0SCA9IHhwb3J0c1sndmlld3BvcnRIJ10gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGEgPSBkb2NFbGVtWydjbGllbnRIZWlnaHQnXSxcbiAgICAgICAgYiA9IHdpblsnaW5uZXJIZWlnaHQnXTtcbiAgICByZXR1cm4gYSA8IGIgPyBiIDogYTtcbiAgfTtcbiAgLyoqXG4gICAqIFRlc3QgaWYgYSBtZWRpYSBxdWVyeSBpcyBhY3RpdmUuIExpa2UgTW9kZXJuaXpyLm1xXHJcbiAgICogQHNpbmNlIDEuNi4wXHJcbiAgICogQHJldHVybiB7Ym9vbGVhbn1cclxuICAgKi9cblxuXG4gIHhwb3J0c1snbXEnXSA9IG1xO1xuICAvKipcbiAgICogTm9ybWFsaXplZCBtYXRjaE1lZGlhXHJcbiAgICogQHNpbmNlIDEuNi4wXHJcbiAgICogQHJldHVybiB7TWVkaWFRdWVyeUxpc3R8T2JqZWN0fVxyXG4gICAqL1xuXG4gIHhwb3J0c1snbWF0Y2hNZWRpYSddID0gbWF0Y2hNZWRpYSA/IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBtYXRjaE1lZGlhIG11c3QgYmUgYmluZGVkIHRvIHdpbmRvd1xuICAgIHJldHVybiBtYXRjaE1lZGlhLmFwcGx5KHdpbiwgYXJndW1lbnRzKTtcbiAgfSA6IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBHcmFjZWZ1bGx5IGRlZ3JhZGUgdG8gcGxhaW4gb2JqZWN0XG4gICAgcmV0dXJuIHt9O1xuICB9O1xuICAvKipcclxuICAgKiBAc2luY2UgMS44LjBcclxuICAgKiBAcmV0dXJuIHt7d2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyfX1cclxuICAgKi9cblxuICBmdW5jdGlvbiB2aWV3cG9ydCgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ3dpZHRoJzogdmlld3BvcnRXKCksXG4gICAgICAnaGVpZ2h0Jzogdmlld3BvcnRIKClcbiAgICB9O1xuICB9XG5cbiAgeHBvcnRzWyd2aWV3cG9ydCddID0gdmlld3BvcnQ7XG4gIC8qKlxuICAgKiBDcm9zcy1icm93c2VyIHdpbmRvdy5zY3JvbGxYXHJcbiAgICogQHNpbmNlIDEuMC4wXHJcbiAgICogQHJldHVybiB7bnVtYmVyfVxyXG4gICAqL1xuXG4gIHhwb3J0c1snc2Nyb2xsWCddID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB3aW4ucGFnZVhPZmZzZXQgfHwgZG9jRWxlbS5zY3JvbGxMZWZ0O1xuICB9O1xuICAvKipcbiAgICogQ3Jvc3MtYnJvd3NlciB3aW5kb3cuc2Nyb2xsWVxyXG4gICAqIEBzaW5jZSAxLjAuMFxyXG4gICAqIEByZXR1cm4ge251bWJlcn1cclxuICAgKi9cblxuXG4gIHhwb3J0c1snc2Nyb2xsWSddID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB3aW4ucGFnZVlPZmZzZXQgfHwgZG9jRWxlbS5zY3JvbGxUb3A7XG4gIH07XG4gIC8qKlxyXG4gICAqIEBwYXJhbSB7e3RvcDpudW1iZXIsIHJpZ2h0Om51bWJlciwgYm90dG9tOm51bWJlciwgbGVmdDpudW1iZXJ9fSBjb29yZHNcclxuICAgKiBAcGFyYW0ge251bWJlcj19IGN1c2hpb24gYWRqdXN0bWVudFxyXG4gICAqIEByZXR1cm4ge09iamVjdH1cclxuICAgKi9cblxuXG4gIGZ1bmN0aW9uIGNhbGlicmF0ZShjb29yZHMsIGN1c2hpb24pIHtcbiAgICB2YXIgbyA9IHt9O1xuICAgIGN1c2hpb24gPSArY3VzaGlvbiB8fCAwO1xuICAgIG9bJ3dpZHRoJ10gPSAob1sncmlnaHQnXSA9IGNvb3Jkc1sncmlnaHQnXSArIGN1c2hpb24pIC0gKG9bJ2xlZnQnXSA9IGNvb3Jkc1snbGVmdCddIC0gY3VzaGlvbik7XG4gICAgb1snaGVpZ2h0J10gPSAob1snYm90dG9tJ10gPSBjb29yZHNbJ2JvdHRvbSddICsgY3VzaGlvbikgLSAob1sndG9wJ10gPSBjb29yZHNbJ3RvcCddIC0gY3VzaGlvbik7XG4gICAgcmV0dXJuIG87XG4gIH1cbiAgLyoqXHJcbiAgICogQ3Jvc3MtYnJvd3NlciBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCBwbHVzIG9wdGlvbmFsIGN1c2hpb24uXHJcbiAgICogQ29vcmRzIGFyZSByZWxhdGl2ZSB0byB0aGUgdG9wLWxlZnQgY29ybmVyIG9mIHRoZSB2aWV3cG9ydC5cclxuICAgKiBAc2luY2UgMS4wLjBcclxuICAgKiBAcGFyYW0ge0VsZW1lbnR8T2JqZWN0fSBlbCBlbGVtZW50IG9yIHN0YWNrICh1c2VzIGZpcnN0IGl0ZW0pXHJcbiAgICogQHBhcmFtIHtudW1iZXI9fSBjdXNoaW9uICsvLSBwaXhlbCBhZGp1c3RtZW50IGFtb3VudFxyXG4gICAqIEByZXR1cm4ge09iamVjdHxib29sZWFufVxyXG4gICAqL1xuXG5cbiAgZnVuY3Rpb24gcmVjdGFuZ2xlKGVsLCBjdXNoaW9uKSB7XG4gICAgZWwgPSBlbCAmJiAhZWwubm9kZVR5cGUgPyBlbFswXSA6IGVsO1xuICAgIGlmICghZWwgfHwgMSAhPT0gZWwubm9kZVR5cGUpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gY2FsaWJyYXRlKGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLCBjdXNoaW9uKTtcbiAgfVxuXG4gIHhwb3J0c1sncmVjdGFuZ2xlJ10gPSByZWN0YW5nbGU7XG4gIC8qKlxyXG4gICAqIEdldCB0aGUgdmlld3BvcnQgYXNwZWN0IHJhdGlvIChvciB0aGUgYXNwZWN0IHJhdGlvIG9mIGFuIG9iamVjdCBvciBlbGVtZW50KVxyXG4gICAqIEBzaW5jZSAxLjcuMFxyXG4gICAqIEBwYXJhbSB7KEVsZW1lbnR8T2JqZWN0KT19IG8gb3B0aW9uYWwgb2JqZWN0IHdpdGggd2lkdGgvaGVpZ2h0IHByb3BzIG9yIG1ldGhvZHNcclxuICAgKiBAcmV0dXJuIHtudW1iZXJ9XHJcbiAgICogQGxpbmsgaHR0cDovL3czLm9yZy9UUi9jc3MzLW1lZGlhcXVlcmllcy8jb3JpZW50YXRpb25cclxuICAgKi9cblxuICBmdW5jdGlvbiBhc3BlY3Qobykge1xuICAgIG8gPSBudWxsID09IG8gPyB2aWV3cG9ydCgpIDogMSA9PT0gby5ub2RlVHlwZSA/IHJlY3RhbmdsZShvKSA6IG87XG4gICAgdmFyIGggPSBvWydoZWlnaHQnXSxcbiAgICAgICAgdyA9IG9bJ3dpZHRoJ107XG4gICAgaCA9IHR5cGVvZiBoID09ICdmdW5jdGlvbicgPyBoLmNhbGwobykgOiBoO1xuICAgIHcgPSB0eXBlb2YgdyA9PSAnZnVuY3Rpb24nID8gdy5jYWxsKG8pIDogdztcbiAgICByZXR1cm4gdyAvIGg7XG4gIH1cblxuICB4cG9ydHNbJ2FzcGVjdCddID0gYXNwZWN0O1xuICAvKipcclxuICAgKiBUZXN0IGlmIGFuIGVsZW1lbnQgaXMgaW4gdGhlIHNhbWUgeC1heGlzIHNlY3Rpb24gYXMgdGhlIHZpZXdwb3J0LlxyXG4gICAqIEBzaW5jZSAxLjAuMFxyXG4gICAqIEBwYXJhbSB7RWxlbWVudHxPYmplY3R9IGVsXHJcbiAgICogQHBhcmFtIHtudW1iZXI9fSBjdXNoaW9uXHJcbiAgICogQHJldHVybiB7Ym9vbGVhbn1cclxuICAgKi9cblxuICB4cG9ydHNbJ2luWCddID0gZnVuY3Rpb24gKGVsLCBjdXNoaW9uKSB7XG4gICAgdmFyIHIgPSByZWN0YW5nbGUoZWwsIGN1c2hpb24pO1xuICAgIHJldHVybiAhIXIgJiYgci5yaWdodCA+PSAwICYmIHIubGVmdCA8PSB2aWV3cG9ydFcoKTtcbiAgfTtcbiAgLyoqXHJcbiAgICogVGVzdCBpZiBhbiBlbGVtZW50IGlzIGluIHRoZSBzYW1lIHktYXhpcyBzZWN0aW9uIGFzIHRoZSB2aWV3cG9ydC5cclxuICAgKiBAc2luY2UgMS4wLjBcclxuICAgKiBAcGFyYW0ge0VsZW1lbnR8T2JqZWN0fSBlbFxyXG4gICAqIEBwYXJhbSB7bnVtYmVyPX0gY3VzaGlvblxyXG4gICAqIEByZXR1cm4ge2Jvb2xlYW59XHJcbiAgICovXG5cblxuICB4cG9ydHNbJ2luWSddID0gZnVuY3Rpb24gKGVsLCBjdXNoaW9uKSB7XG4gICAgdmFyIHIgPSByZWN0YW5nbGUoZWwsIGN1c2hpb24pO1xuICAgIHJldHVybiAhIXIgJiYgci5ib3R0b20gPj0gMCAmJiByLnRvcCA8PSB2aWV3cG9ydEgoKTtcbiAgfTtcbiAgLyoqXHJcbiAgICogVGVzdCBpZiBhbiBlbGVtZW50IGlzIGluIHRoZSB2aWV3cG9ydC5cclxuICAgKiBAc2luY2UgMS4wLjBcclxuICAgKiBAcGFyYW0ge0VsZW1lbnR8T2JqZWN0fSBlbFxyXG4gICAqIEBwYXJhbSB7bnVtYmVyPX0gY3VzaGlvblxyXG4gICAqIEByZXR1cm4ge2Jvb2xlYW59XHJcbiAgICovXG5cblxuICB4cG9ydHNbJ2luVmlld3BvcnQnXSA9IGZ1bmN0aW9uIChlbCwgY3VzaGlvbikge1xuICAgIC8vIEVxdWl2IHRvIGBpblgoZWwsIGN1c2hpb24pICYmIGluWShlbCwgY3VzaGlvbilgIGJ1dCBqdXN0IG1hbnVhbGx5IGRvIGJvdGhcbiAgICAvLyB0byBhdm9pZCBjYWxsaW5nIHJlY3RhbmdsZSgpIHR3aWNlLiBJdCBnemlwcyBqdXN0IGFzIHNtYWxsIGxpa2UgdGhpcy5cbiAgICB2YXIgciA9IHJlY3RhbmdsZShlbCwgY3VzaGlvbik7XG4gICAgcmV0dXJuICEhciAmJiByLmJvdHRvbSA+PSAwICYmIHIucmlnaHQgPj0gMCAmJiByLnRvcCA8PSB2aWV3cG9ydEgoKSAmJiByLmxlZnQgPD0gdmlld3BvcnRXKCk7XG4gIH07XG5cbiAgcmV0dXJuIHhwb3J0cztcbn0pOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIFB1cmUgSmF2YVNjcmlwdCBpbXBsZW1lbnRhdGlvbiBvZiB6b29tLmpzLlxuICpcbiAqIE9yaWdpbmFsIHByZWFtYmxlOlxuICogem9vbS5qcyAtIEl0J3MgdGhlIGJlc3Qgd2F5IHRvIHpvb20gYW4gaW1hZ2VcbiAqIEB2ZXJzaW9uIHYwLjAuMlxuICogQGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2ZhdC96b29tLmpzXG4gKiBAbGljZW5zZSBNSVRcbiAqXG4gKiBUaGlzIGlzIGEgZm9yayBvZiB0aGUgb3JpZ2luYWwgem9vbS5qcyBpbXBsZW1lbnRhdGlvbiBieSBAZmF0LlxuICogQ29weXJpZ2h0cyBmb3IgdGhlIG9yaWdpbmFsIHByb2plY3QgYXJlIGhlbGQgYnkgQGZhdC4gQWxsIG90aGVyIGNvcHlyaWdodFxuICogZm9yIGNoYW5nZXMgaW4gdGhlIGZvcmsgYXJlIGhlbGQgYnkgTmlzaGFudGggU2hhbm11Z2hhbS5cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgQGZhdFxuICogVGhlIE1JVCBMaWNlbnNlLiBDb3B5cmlnaHQgwqkgMjAxNiBOaXNoYW50aCBTaGFubXVnaGFtLlxuICovXG4oZnVuY3Rpb24gKCkge1xuICBcInVzZSBzdHJpY3RcIjtcblxuICB2YXIgX2NyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldO1xuICAgICAgICBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7XG4gICAgICAgIGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTtcbiAgICAgICAgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiAoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7XG4gICAgICBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgICAgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7XG4gICAgICByZXR1cm4gQ29uc3RydWN0b3I7XG4gICAgfTtcbiAgfSgpO1xuXG4gIGZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHtcbiAgICBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTtcbiAgICB9XG4gIH1cblxuICAoZnVuY3Rpb24gKG1vZHVsZXMpIHtcbiAgICB2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuICAgICAgaWYgKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSByZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcbiAgICAgIHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiAgICAgICAgaTogbW9kdWxlSWQsXG4gICAgICAgIGw6IGZhbHNlLFxuICAgICAgICBleHBvcnRzOiB7fVxuICAgICAgfTtcbiAgICAgIG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuICAgICAgbW9kdWxlLmwgPSB0cnVlO1xuICAgICAgcmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuICAgIH1cblxuICAgIF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG4gICAgX193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuICAgIF9fd2VicGFja19yZXF1aXJlX18uaSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG5cbiAgICBfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbiAoZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gICAgICBpZiAoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICBnZXQ6IGdldHRlclxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24gKG1vZHVsZSkge1xuICAgICAgdmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/IGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7XG4gICAgICAgIHJldHVybiBtb2R1bGVbXCJkZWZhdWx0XCJdO1xuICAgICAgfSA6IGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7XG4gICAgICAgIHJldHVybiBtb2R1bGU7XG4gICAgICB9O1xuXG4gICAgICBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCBcImFcIiwgZ2V0dGVyKTtcblxuICAgICAgcmV0dXJuIGdldHRlcjtcbiAgICB9O1xuXG4gICAgX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7XG4gICAgfTtcblxuICAgIF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG4gICAgcmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMyk7XG4gIH0pKFtmdW5jdGlvbiAobW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZXhwb3J0cywgXCJhXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB3aW5kb3dXaWR0aDtcbiAgICB9KTtcblxuICAgIF9fd2VicGFja19yZXF1aXJlX18uZChleHBvcnRzLCBcImJcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHdpbmRvd0hlaWdodDtcbiAgICB9KTtcblxuICAgIF9fd2VicGFja19yZXF1aXJlX18uZChleHBvcnRzLCBcImNcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGVsZW1PZmZzZXQ7XG4gICAgfSk7XG5cbiAgICBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZXhwb3J0cywgXCJkXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBvbmNlO1xuICAgIH0pO1xuXG4gICAgdmFyIHdpbmRvd1dpZHRoID0gZnVuY3Rpb24gd2luZG93V2lkdGgoKSB7XG4gICAgICByZXR1cm4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoO1xuICAgIH07XG5cbiAgICB2YXIgd2luZG93SGVpZ2h0ID0gZnVuY3Rpb24gd2luZG93SGVpZ2h0KCkge1xuICAgICAgcmV0dXJuIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQ7XG4gICAgfTtcblxuICAgIHZhciBlbGVtT2Zmc2V0ID0gZnVuY3Rpb24gZWxlbU9mZnNldChlbGVtKSB7XG4gICAgICB2YXIgcmVjdCA9IGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICB2YXIgZG9jRWxlbSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICAgIHZhciB3aW4gPSB3aW5kb3c7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6IHJlY3QudG9wICsgd2luLnBhZ2VZT2Zmc2V0IC0gZG9jRWxlbS5jbGllbnRUb3AsXG4gICAgICAgIGxlZnQ6IHJlY3QubGVmdCArIHdpbi5wYWdlWE9mZnNldCAtIGRvY0VsZW0uY2xpZW50TGVmdFxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgdmFyIG9uY2UgPSBmdW5jdGlvbiBvbmNlKGVsZW0sIHR5cGUsIGhhbmRsZXIpIHtcbiAgICAgIHZhciBmbiA9IGZ1bmN0aW9uIGZuKGUpIHtcbiAgICAgICAgZS50YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBmbik7XG4gICAgICAgIGhhbmRsZXIoKTtcbiAgICAgIH07XG5cbiAgICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBmbik7XG4gICAgfTtcbiAgfSwgZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fem9vbV9pbWFnZV9qc19fID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuICAgIHZhciBfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfX3V0aWxzX2pzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDApO1xuXG4gICAgX193ZWJwYWNrX3JlcXVpcmVfXy5kKGV4cG9ydHMsIFwiYVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gem9vbTtcbiAgICB9KTtcblxuICAgIHZhciBjdXJyZW50ID0gbnVsbDtcbiAgICB2YXIgb2Zmc2V0ID0gODA7XG4gICAgdmFyIGluaXRpYWxTY3JvbGxQb3MgPSAtMTtcbiAgICB2YXIgaW5pdGlhbFRvdWNoUG9zID0gLTE7XG5cbiAgICB2YXIgc2V0dXAgPSBmdW5jdGlvbiBzZXR1cChlbGVtKSB7XG4gICAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBwcmVwYXJlWm9vbSk7XG4gICAgfTtcblxuICAgIHZhciBwcmVwYXJlWm9vbSA9IGZ1bmN0aW9uIHByZXBhcmVab29tKGUpIHtcbiAgICAgIGlmIChkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5jb250YWlucyhcInpvb20tb3ZlcmxheS1vcGVuXCIpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGUubWV0YUtleSB8fCBlLmN0cmxLZXkpIHtcbiAgICAgICAgd2luZG93Lm9wZW4oZS50YXJnZXQuZ2V0QXR0cmlidXRlKFwiZGF0YS1vcmlnaW5hbFwiKSB8fCBlLnRhcmdldC5zcmMsIFwiX2JsYW5rXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChlLnRhcmdldC53aWR0aCA+PSBfX3dlYnBhY2tfcmVxdWlyZV9fLmkoX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX191dGlsc19qc19fW1wiYVwiXSkoKSAtIG9mZnNldCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNsb3NlQ3VycmVudCh0cnVlKTtcbiAgICAgIGN1cnJlbnQgPSBuZXcgX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX196b29tX2ltYWdlX2pzX19bXCJhXCJdKGUudGFyZ2V0LCBvZmZzZXQpO1xuICAgICAgY3VycmVudC56b29tKCk7XG4gICAgICBhZGRDbG9zZUxpc3RlbmVycygpO1xuICAgIH07XG5cbiAgICB2YXIgY2xvc2VDdXJyZW50ID0gZnVuY3Rpb24gY2xvc2VDdXJyZW50KGZvcmNlKSB7XG4gICAgICBpZiAoY3VycmVudCA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGZvcmNlKSB7XG4gICAgICAgIGN1cnJlbnQuZGlzcG9zZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3VycmVudC5jbG9zZSgpO1xuICAgICAgfVxuXG4gICAgICByZW1vdmVDbG9zZUxpc3RlbmVycygpO1xuICAgICAgY3VycmVudCA9IG51bGw7XG4gICAgfTtcblxuICAgIHZhciBhZGRDbG9zZUxpc3RlbmVycyA9IGZ1bmN0aW9uIGFkZENsb3NlTGlzdGVuZXJzKCkge1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBoYW5kbGVTY3JvbGwpO1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGhhbmRsZUtleXVwKTtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaHN0YXJ0XCIsIGhhbmRsZVRvdWNoU3RhcnQpO1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGhhbmRsZUNsaWNrLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgdmFyIHJlbW92ZUNsb3NlTGlzdGVuZXJzID0gZnVuY3Rpb24gcmVtb3ZlQ2xvc2VMaXN0ZW5lcnMoKSB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwic2Nyb2xsXCIsIGhhbmRsZVNjcm9sbCk7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgaGFuZGxlS2V5dXApO1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInRvdWNoc3RhcnRcIiwgaGFuZGxlVG91Y2hTdGFydCk7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgaGFuZGxlQ2xpY2ssIHRydWUpO1xuICAgIH07XG5cbiAgICB2YXIgaGFuZGxlU2Nyb2xsID0gZnVuY3Rpb24gaGFuZGxlU2Nyb2xsKCkge1xuICAgICAgaWYgKGluaXRpYWxTY3JvbGxQb3MgPT0gLTEpIHtcbiAgICAgICAgaW5pdGlhbFNjcm9sbFBvcyA9IHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgICAgIH1cblxuICAgICAgdmFyIGRlbHRhWSA9IE1hdGguYWJzKGluaXRpYWxTY3JvbGxQb3MgLSB3aW5kb3cucGFnZVlPZmZzZXQpO1xuXG4gICAgICBpZiAoZGVsdGFZID49IDQwKSB7XG4gICAgICAgIGNsb3NlQ3VycmVudCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgaGFuZGxlS2V5dXAgPSBmdW5jdGlvbiBoYW5kbGVLZXl1cChlKSB7XG4gICAgICBpZiAoZS5rZXlDb2RlID09IDI3KSB7XG4gICAgICAgIGNsb3NlQ3VycmVudCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgaGFuZGxlVG91Y2hTdGFydCA9IGZ1bmN0aW9uIGhhbmRsZVRvdWNoU3RhcnQoZSkge1xuICAgICAgdmFyIHQgPSBlLnRvdWNoZXNbMF07XG5cbiAgICAgIGlmICh0ID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpbml0aWFsVG91Y2hQb3MgPSB0LnBhZ2VZO1xuICAgICAgZS50YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLCBoYW5kbGVUb3VjaE1vdmUpO1xuICAgIH07XG5cbiAgICB2YXIgaGFuZGxlVG91Y2hNb3ZlID0gZnVuY3Rpb24gaGFuZGxlVG91Y2hNb3ZlKGUpIHtcbiAgICAgIHZhciB0ID0gZS50b3VjaGVzWzBdO1xuXG4gICAgICBpZiAodCA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKE1hdGguYWJzKHQucGFnZVkgLSBpbml0aWFsVG91Y2hQb3MpID4gMTApIHtcbiAgICAgICAgY2xvc2VDdXJyZW50KCk7XG4gICAgICAgIGUudGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ0b3VjaG1vdmVcIiwgaGFuZGxlVG91Y2hNb3ZlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGhhbmRsZUNsaWNrID0gZnVuY3Rpb24gaGFuZGxlQ2xpY2soKSB7XG4gICAgICBjbG9zZUN1cnJlbnQoKTtcbiAgICB9O1xuXG4gICAgdmFyIHpvb20gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIHpvb20uc2V0dXAgPSBzZXR1cDtcbiAgfSwgZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fdXRpbHNfanNfXyA9IF9fd2VicGFja19yZXF1aXJlX18oMCk7XG5cbiAgICB2YXIgU2l6ZSA9IGZ1bmN0aW9uIFNpemUodywgaCkge1xuICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIFNpemUpO1xuXG4gICAgICB0aGlzLncgPSB3O1xuICAgICAgdGhpcy5oID0gaDtcbiAgICB9O1xuXG4gICAgdmFyIFpvb21JbWFnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGZ1bmN0aW9uIFpvb21JbWFnZShpbWcsIG9mZnNldCkge1xuICAgICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgWm9vbUltYWdlKTtcblxuICAgICAgICB0aGlzLmltZyA9IGltZztcbiAgICAgICAgdGhpcy5wcmVzZXJ2ZWRUcmFuc2Zvcm0gPSBpbWcuc3R5bGUudHJhbnNmb3JtO1xuICAgICAgICB0aGlzLndyYXAgPSBudWxsO1xuICAgICAgICB0aGlzLm92ZXJsYXkgPSBudWxsO1xuICAgICAgICB0aGlzLm9mZnNldCA9IG9mZnNldDtcbiAgICAgIH1cblxuICAgICAgX2NyZWF0ZUNsYXNzKFpvb21JbWFnZSwgW3tcbiAgICAgICAga2V5OiBcImZvcmNlUmVwYWludFwiLFxuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gZm9yY2VSZXBhaW50KCkge1xuICAgICAgICAgIHZhciBfID0gdGhpcy5pbWcub2Zmc2V0V2lkdGg7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9LCB7XG4gICAgICAgIGtleTogXCJ6b29tXCIsXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiB6b29tKCkge1xuICAgICAgICAgIHZhciBzaXplID0gbmV3IFNpemUodGhpcy5pbWcubmF0dXJhbFdpZHRoLCB0aGlzLmltZy5uYXR1cmFsSGVpZ2h0KTtcbiAgICAgICAgICB0aGlzLndyYXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICAgIHRoaXMud3JhcC5jbGFzc0xpc3QuYWRkKFwiem9vbS1pbWctd3JhcFwiKTtcbiAgICAgICAgICB0aGlzLmltZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLndyYXAsIHRoaXMuaW1nKTtcbiAgICAgICAgICB0aGlzLndyYXAuYXBwZW5kQ2hpbGQodGhpcy5pbWcpO1xuICAgICAgICAgIHRoaXMuaW1nLmNsYXNzTGlzdC5hZGQoXCJ6b29tLWltZ1wiKTtcbiAgICAgICAgICB0aGlzLmltZy5zZXRBdHRyaWJ1dGUoXCJkYXRhLWFjdGlvblwiLCBcInpvb20tb3V0XCIpO1xuICAgICAgICAgIHRoaXMub3ZlcmxheSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgICAgdGhpcy5vdmVybGF5LmNsYXNzTGlzdC5hZGQoXCJ6b29tLW92ZXJsYXlcIik7XG4gICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLm92ZXJsYXkpO1xuICAgICAgICAgIHRoaXMuZm9yY2VSZXBhaW50KCk7XG4gICAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5jYWxjdWxhdGVTY2FsZShzaXplKTtcbiAgICAgICAgICB0aGlzLmZvcmNlUmVwYWludCgpO1xuICAgICAgICAgIHRoaXMuYW5pbWF0ZShzY2FsZSk7XG4gICAgICAgICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKFwiem9vbS1vdmVybGF5LW9wZW5cIik7XG4gICAgICAgIH1cbiAgICAgIH0sIHtcbiAgICAgICAga2V5OiBcImNhbGN1bGF0ZVNjYWxlXCIsXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiBjYWxjdWxhdGVTY2FsZShzaXplKSB7XG4gICAgICAgICAgdmFyIG1heFNjYWxlRmFjdG9yID0gc2l6ZS53IC8gdGhpcy5pbWcud2lkdGg7XG4gICAgICAgICAgdmFyIHZpZXdwb3J0V2lkdGggPSBfX3dlYnBhY2tfcmVxdWlyZV9fLmkoX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX191dGlsc19qc19fW1wiYVwiXSkoKSAtIHRoaXMub2Zmc2V0O1xuICAgICAgICAgIHZhciB2aWV3cG9ydEhlaWdodCA9IF9fd2VicGFja19yZXF1aXJlX18uaShfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfX3V0aWxzX2pzX19bXCJiXCJdKSgpIC0gdGhpcy5vZmZzZXQ7XG4gICAgICAgICAgdmFyIGltYWdlQXNwZWN0UmF0aW8gPSBzaXplLncgLyBzaXplLmg7XG4gICAgICAgICAgdmFyIHZpZXdwb3J0QXNwZWN0UmF0aW8gPSB2aWV3cG9ydFdpZHRoIC8gdmlld3BvcnRIZWlnaHQ7XG5cbiAgICAgICAgICBpZiAoc2l6ZS53IDwgdmlld3BvcnRXaWR0aCAmJiBzaXplLmggPCB2aWV3cG9ydEhlaWdodCkge1xuICAgICAgICAgICAgcmV0dXJuIG1heFNjYWxlRmFjdG9yO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaW1hZ2VBc3BlY3RSYXRpbyA8IHZpZXdwb3J0QXNwZWN0UmF0aW8pIHtcbiAgICAgICAgICAgIHJldHVybiB2aWV3cG9ydEhlaWdodCAvIHNpemUuaCAqIG1heFNjYWxlRmFjdG9yO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdmlld3BvcnRXaWR0aCAvIHNpemUudyAqIG1heFNjYWxlRmFjdG9yO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwge1xuICAgICAgICBrZXk6IFwiYW5pbWF0ZVwiLFxuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gYW5pbWF0ZShzY2FsZSkge1xuICAgICAgICAgIHZhciBpbWFnZU9mZnNldCA9IF9fd2VicGFja19yZXF1aXJlX18uaShfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfX3V0aWxzX2pzX19bXCJjXCJdKSh0aGlzLmltZyk7XG5cbiAgICAgICAgICB2YXIgc2Nyb2xsVG9wID0gd2luZG93LnBhZ2VZT2Zmc2V0O1xuICAgICAgICAgIHZhciB2aWV3cG9ydFggPSBfX3dlYnBhY2tfcmVxdWlyZV9fLmkoX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX191dGlsc19qc19fW1wiYVwiXSkoKSAvIDI7XG4gICAgICAgICAgdmFyIHZpZXdwb3J0WSA9IHNjcm9sbFRvcCArIF9fd2VicGFja19yZXF1aXJlX18uaShfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfX3V0aWxzX2pzX19bXCJiXCJdKSgpIC8gMjtcbiAgICAgICAgICB2YXIgaW1hZ2VDZW50ZXJYID0gaW1hZ2VPZmZzZXQubGVmdCArIHRoaXMuaW1nLndpZHRoIC8gMjtcbiAgICAgICAgICB2YXIgaW1hZ2VDZW50ZXJZID0gaW1hZ2VPZmZzZXQudG9wICsgdGhpcy5pbWcuaGVpZ2h0IC8gMjtcbiAgICAgICAgICB2YXIgdHggPSB2aWV3cG9ydFggLSBpbWFnZUNlbnRlclg7XG4gICAgICAgICAgdmFyIHR5ID0gdmlld3BvcnRZIC0gaW1hZ2VDZW50ZXJZO1xuICAgICAgICAgIHZhciB0eiA9IDA7XG4gICAgICAgICAgdmFyIGltZ1RyID0gXCJzY2FsZShcIiArIHNjYWxlICsgXCIpXCI7XG4gICAgICAgICAgdmFyIHdyYXBUciA9IFwidHJhbnNsYXRlM2QoXCIgKyB0eCArIFwicHgsIFwiICsgdHkgKyBcInB4LCBcIiArIHR6ICsgXCJweClcIjtcbiAgICAgICAgICB0aGlzLmltZy5zdHlsZS50cmFuc2Zvcm0gPSBpbWdUcjtcbiAgICAgICAgICB0aGlzLndyYXAuc3R5bGUudHJhbnNmb3JtID0gd3JhcFRyO1xuICAgICAgICB9XG4gICAgICB9LCB7XG4gICAgICAgIGtleTogXCJkaXNwb3NlXCIsXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgICAgIGlmICh0aGlzLndyYXAgPT0gbnVsbCB8fCB0aGlzLndyYXAucGFyZW50Tm9kZSA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5pbWcuY2xhc3NMaXN0LnJlbW92ZShcInpvb20taW1nXCIpO1xuICAgICAgICAgIHRoaXMuaW1nLnNldEF0dHJpYnV0ZShcImRhdGEtYWN0aW9uXCIsIFwiem9vbVwiKTtcbiAgICAgICAgICB0aGlzLndyYXAucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5pbWcsIHRoaXMud3JhcCk7XG4gICAgICAgICAgdGhpcy53cmFwLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy53cmFwKTtcbiAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRoaXMub3ZlcmxheSk7XG4gICAgICAgICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwiem9vbS1vdmVybGF5LXRyYW5zaXRpb25pbmdcIik7XG4gICAgICAgIH1cbiAgICAgIH0sIHtcbiAgICAgICAga2V5OiBcImNsb3NlXCIsXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiBjbG9zZSgpIHtcbiAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKFwiem9vbS1vdmVybGF5LXRyYW5zaXRpb25pbmdcIik7XG4gICAgICAgICAgdGhpcy5pbWcuc3R5bGUudHJhbnNmb3JtID0gdGhpcy5wcmVzZXJ2ZWRUcmFuc2Zvcm07XG5cbiAgICAgICAgICBpZiAodGhpcy5pbWcuc3R5bGUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmltZy5yZW1vdmVBdHRyaWJ1dGUoXCJzdHlsZVwiKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLndyYXAuc3R5bGUudHJhbnNmb3JtID0gXCJub25lXCI7XG5cbiAgICAgICAgICBfX3dlYnBhY2tfcmVxdWlyZV9fLmkoX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX191dGlsc19qc19fW1wiZFwiXSkodGhpcy5pbWcsIFwidHJhbnNpdGlvbmVuZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBfdGhpcy5kaXNwb3NlKCk7XG5cbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInpvb20tb3ZlcmxheS1vcGVuXCIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XSk7XG5cbiAgICAgIHJldHVybiBab29tSW1hZ2U7XG4gICAgfSgpO1xuXG4gICAgZXhwb3J0c1tcImFcIl0gPSBab29tSW1hZ2U7XG4gIH0sIGZ1bmN0aW9uIChtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgICAgdmFsdWU6IHRydWVcbiAgICB9KTtcblxuICAgIHZhciBfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfX3NyY196b29tX2pzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDEpO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcImltZ1tkYXRhLWFjdGlvbj0nem9vbSddXCIpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fc3JjX3pvb21fanNfX1tcImFcIl0uc2V0dXAoZWxlbXNbaV0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XSk7XG59KSgpOyIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBfdHlwZW9mKG9iaikgeyBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIpIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9OyB9IGVsc2UgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07IH0gcmV0dXJuIF90eXBlb2Yob2JqKTsgfVxuXG4vKiEgcGljdHVyZWZpbGwgLSB2My4wLjIgLSAyMDE2LTAyLTEyXG4gKiBodHRwczovL3Njb3R0amVobC5naXRodWIuaW8vcGljdHVyZWZpbGwvXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTYgaHR0cHM6Ly9naXRodWIuY29tL3Njb3R0amVobC9waWN0dXJlZmlsbC9ibG9iL21hc3Rlci9BdXRob3JzLnR4dDsgTGljZW5zZWQgTUlUXG4gKi9cbiFmdW5jdGlvbiAoYSkge1xuICB2YXIgYiA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG4gIGEuSFRNTFBpY3R1cmVFbGVtZW50ICYmIC9lY2tvLy50ZXN0KGIpICYmIGIubWF0Y2goL3J2XFw6KFxcZCspLykgJiYgUmVnRXhwLiQxIDwgNDUgJiYgYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGIsXG4gICAgICAgIGMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic291cmNlXCIpLFxuICAgICAgICBkID0gZnVuY3Rpb24gZChhKSB7XG4gICAgICB2YXIgYixcbiAgICAgICAgICBkLFxuICAgICAgICAgIGUgPSBhLnBhcmVudE5vZGU7XG4gICAgICBcIlBJQ1RVUkVcIiA9PT0gZS5ub2RlTmFtZS50b1VwcGVyQ2FzZSgpID8gKGIgPSBjLmNsb25lTm9kZSgpLCBlLmluc2VydEJlZm9yZShiLCBlLmZpcnN0RWxlbWVudENoaWxkKSwgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGUucmVtb3ZlQ2hpbGQoYik7XG4gICAgICB9KSkgOiAoIWEuX3BmTGFzdFNpemUgfHwgYS5vZmZzZXRXaWR0aCA+IGEuX3BmTGFzdFNpemUpICYmIChhLl9wZkxhc3RTaXplID0gYS5vZmZzZXRXaWR0aCwgZCA9IGEuc2l6ZXMsIGEuc2l6ZXMgKz0gXCIsMTAwdndcIiwgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGEuc2l6ZXMgPSBkO1xuICAgICAgfSkpO1xuICAgIH0sXG4gICAgICAgIGUgPSBmdW5jdGlvbiBlKCkge1xuICAgICAgdmFyIGEsXG4gICAgICAgICAgYiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJwaWN0dXJlID4gaW1nLCBpbWdbc3Jjc2V0XVtzaXplc11cIik7XG5cbiAgICAgIGZvciAoYSA9IDA7IGEgPCBiLmxlbmd0aDsgYSsrKSB7XG4gICAgICAgIGQoYlthXSk7XG4gICAgICB9XG4gICAgfSxcbiAgICAgICAgZiA9IGZ1bmN0aW9uIGYoKSB7XG4gICAgICBjbGVhclRpbWVvdXQoYiksIGIgPSBzZXRUaW1lb3V0KGUsIDk5KTtcbiAgICB9LFxuICAgICAgICBnID0gYS5tYXRjaE1lZGlhICYmIG1hdGNoTWVkaWEoXCIob3JpZW50YXRpb246IGxhbmRzY2FwZSlcIiksXG4gICAgICAgIGggPSBmdW5jdGlvbiBoKCkge1xuICAgICAgZigpLCBnICYmIGcuYWRkTGlzdGVuZXIgJiYgZy5hZGRMaXN0ZW5lcihmKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGMuc3Jjc2V0ID0gXCJkYXRhOmltYWdlL2dpZjtiYXNlNjQsUjBsR09EbGhBUUFCQUFBQUFDSDVCQUVLQUFFQUxBQUFBQUFCQUFFQUFBSUNUQUVBT3c9PVwiLCAvXltjfGldfGQkLy50ZXN0KGRvY3VtZW50LnJlYWR5U3RhdGUgfHwgXCJcIikgPyBoKCkgOiBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBoKSwgZjtcbiAgfSgpKTtcbn0od2luZG93KSwgZnVuY3Rpb24gKGEsIGIsIGMpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgZnVuY3Rpb24gZChhKSB7XG4gICAgcmV0dXJuIFwiIFwiID09PSBhIHx8IFwiXHRcIiA9PT0gYSB8fCBcIlxcblwiID09PSBhIHx8IFwiXFxmXCIgPT09IGEgfHwgXCJcXHJcIiA9PT0gYTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGUoYiwgYykge1xuICAgIHZhciBkID0gbmV3IGEuSW1hZ2UoKTtcbiAgICByZXR1cm4gZC5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgQVtiXSA9ICExLCBiYSgpO1xuICAgIH0sIGQub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgQVtiXSA9IDEgPT09IGQud2lkdGgsIGJhKCk7XG4gICAgfSwgZC5zcmMgPSBjLCBcInBlbmRpbmdcIjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGYoKSB7XG4gICAgTSA9ICExLCBQID0gYS5kZXZpY2VQaXhlbFJhdGlvLCBOID0ge30sIE8gPSB7fSwgcy5EUFIgPSBQIHx8IDEsIFEud2lkdGggPSBNYXRoLm1heChhLmlubmVyV2lkdGggfHwgMCwgei5jbGllbnRXaWR0aCksIFEuaGVpZ2h0ID0gTWF0aC5tYXgoYS5pbm5lckhlaWdodCB8fCAwLCB6LmNsaWVudEhlaWdodCksIFEudncgPSBRLndpZHRoIC8gMTAwLCBRLnZoID0gUS5oZWlnaHQgLyAxMDAsIHIgPSBbUS5oZWlnaHQsIFEud2lkdGgsIFBdLmpvaW4oXCItXCIpLCBRLmVtID0gcy5nZXRFbVZhbHVlKCksIFEucmVtID0gUS5lbTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGcoYSwgYiwgYywgZCkge1xuICAgIHZhciBlLCBmLCBnLCBoO1xuICAgIHJldHVybiBcInNhdmVEYXRhXCIgPT09IEIuYWxnb3JpdGhtID8gYSA+IDIuNyA/IGggPSBjICsgMSA6IChmID0gYiAtIGMsIGUgPSBNYXRoLnBvdyhhIC0gLjYsIDEuNSksIGcgPSBmICogZSwgZCAmJiAoZyArPSAuMSAqIGUpLCBoID0gYSArIGcpIDogaCA9IGMgPiAxID8gTWF0aC5zcXJ0KGEgKiBiKSA6IGEsIGggPiBjO1xuICB9XG5cbiAgZnVuY3Rpb24gaChhKSB7XG4gICAgdmFyIGIsXG4gICAgICAgIGMgPSBzLmdldFNldChhKSxcbiAgICAgICAgZCA9ICExO1xuICAgIFwicGVuZGluZ1wiICE9PSBjICYmIChkID0gciwgYyAmJiAoYiA9IHMuc2V0UmVzKGMpLCBzLmFwcGx5U2V0Q2FuZGlkYXRlKGIsIGEpKSksIGFbcy5uc10uZXZhbGVkID0gZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGkoYSwgYikge1xuICAgIHJldHVybiBhLnJlcyAtIGIucmVzO1xuICB9XG5cbiAgZnVuY3Rpb24gaihhLCBiLCBjKSB7XG4gICAgdmFyIGQ7XG4gICAgcmV0dXJuICFjICYmIGIgJiYgKGMgPSBhW3MubnNdLnNldHMsIGMgPSBjICYmIGNbYy5sZW5ndGggLSAxXSksIGQgPSBrKGIsIGMpLCBkICYmIChiID0gcy5tYWtlVXJsKGIpLCBhW3MubnNdLmN1clNyYyA9IGIsIGFbcy5uc10uY3VyQ2FuID0gZCwgZC5yZXMgfHwgYWEoZCwgZC5zZXQuc2l6ZXMpKSwgZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGsoYSwgYikge1xuICAgIHZhciBjLCBkLCBlO1xuICAgIGlmIChhICYmIGIpIGZvciAoZSA9IHMucGFyc2VTZXQoYiksIGEgPSBzLm1ha2VVcmwoYSksIGMgPSAwOyBjIDwgZS5sZW5ndGg7IGMrKykge1xuICAgICAgaWYgKGEgPT09IHMubWFrZVVybChlW2NdLnVybCkpIHtcbiAgICAgICAgZCA9IGVbY107XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGwoYSwgYikge1xuICAgIHZhciBjLFxuICAgICAgICBkLFxuICAgICAgICBlLFxuICAgICAgICBmLFxuICAgICAgICBnID0gYS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInNvdXJjZVwiKTtcblxuICAgIGZvciAoYyA9IDAsIGQgPSBnLmxlbmd0aDsgZCA+IGM7IGMrKykge1xuICAgICAgZSA9IGdbY10sIGVbcy5uc10gPSAhMCwgZiA9IGUuZ2V0QXR0cmlidXRlKFwic3Jjc2V0XCIpLCBmICYmIGIucHVzaCh7XG4gICAgICAgIHNyY3NldDogZixcbiAgICAgICAgbWVkaWE6IGUuZ2V0QXR0cmlidXRlKFwibWVkaWFcIiksXG4gICAgICAgIHR5cGU6IGUuZ2V0QXR0cmlidXRlKFwidHlwZVwiKSxcbiAgICAgICAgc2l6ZXM6IGUuZ2V0QXR0cmlidXRlKFwic2l6ZXNcIilcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG0oYSwgYikge1xuICAgIGZ1bmN0aW9uIGMoYikge1xuICAgICAgdmFyIGMsXG4gICAgICAgICAgZCA9IGIuZXhlYyhhLnN1YnN0cmluZyhtKSk7XG4gICAgICByZXR1cm4gZCA/IChjID0gZFswXSwgbSArPSBjLmxlbmd0aCwgYykgOiB2b2lkIDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZSgpIHtcbiAgICAgIHZhciBhLFxuICAgICAgICAgIGMsXG4gICAgICAgICAgZCxcbiAgICAgICAgICBlLFxuICAgICAgICAgIGYsXG4gICAgICAgICAgaSxcbiAgICAgICAgICBqLFxuICAgICAgICAgIGssXG4gICAgICAgICAgbCxcbiAgICAgICAgICBtID0gITEsXG4gICAgICAgICAgbyA9IHt9O1xuXG4gICAgICBmb3IgKGUgPSAwOyBlIDwgaC5sZW5ndGg7IGUrKykge1xuICAgICAgICBmID0gaFtlXSwgaSA9IGZbZi5sZW5ndGggLSAxXSwgaiA9IGYuc3Vic3RyaW5nKDAsIGYubGVuZ3RoIC0gMSksIGsgPSBwYXJzZUludChqLCAxMCksIGwgPSBwYXJzZUZsb2F0KGopLCBYLnRlc3QoaikgJiYgXCJ3XCIgPT09IGkgPyAoKGEgfHwgYykgJiYgKG0gPSAhMCksIDAgPT09IGsgPyBtID0gITAgOiBhID0gaykgOiBZLnRlc3QoaikgJiYgXCJ4XCIgPT09IGkgPyAoKGEgfHwgYyB8fCBkKSAmJiAobSA9ICEwKSwgMCA+IGwgPyBtID0gITAgOiBjID0gbCkgOiBYLnRlc3QoaikgJiYgXCJoXCIgPT09IGkgPyAoKGQgfHwgYykgJiYgKG0gPSAhMCksIDAgPT09IGsgPyBtID0gITAgOiBkID0gaykgOiBtID0gITA7XG4gICAgICB9XG5cbiAgICAgIG0gfHwgKG8udXJsID0gZywgYSAmJiAoby53ID0gYSksIGMgJiYgKG8uZCA9IGMpLCBkICYmIChvLmggPSBkKSwgZCB8fCBjIHx8IGEgfHwgKG8uZCA9IDEpLCAxID09PSBvLmQgJiYgKGIuaGFzMXggPSAhMCksIG8uc2V0ID0gYiwgbi5wdXNoKG8pKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmKCkge1xuICAgICAgZm9yIChjKFQpLCBpID0gXCJcIiwgaiA9IFwiaW4gZGVzY3JpcHRvclwiOzspIHtcbiAgICAgICAgaWYgKGsgPSBhLmNoYXJBdChtKSwgXCJpbiBkZXNjcmlwdG9yXCIgPT09IGopIHtcbiAgICAgICAgICBpZiAoZChrKSkgaSAmJiAoaC5wdXNoKGkpLCBpID0gXCJcIiwgaiA9IFwiYWZ0ZXIgZGVzY3JpcHRvclwiKTtlbHNlIHtcbiAgICAgICAgICAgIGlmIChcIixcIiA9PT0gaykgcmV0dXJuIG0gKz0gMSwgaSAmJiBoLnB1c2goaSksIHZvaWQgZSgpO1xuICAgICAgICAgICAgaWYgKFwiKFwiID09PSBrKSBpICs9IGssIGogPSBcImluIHBhcmVuc1wiO2Vsc2Uge1xuICAgICAgICAgICAgICBpZiAoXCJcIiA9PT0gaykgcmV0dXJuIGkgJiYgaC5wdXNoKGkpLCB2b2lkIGUoKTtcbiAgICAgICAgICAgICAgaSArPSBrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChcImluIHBhcmVuc1wiID09PSBqKSB7XG4gICAgICAgICAgaWYgKFwiKVwiID09PSBrKSBpICs9IGssIGogPSBcImluIGRlc2NyaXB0b3JcIjtlbHNlIHtcbiAgICAgICAgICAgIGlmIChcIlwiID09PSBrKSByZXR1cm4gaC5wdXNoKGkpLCB2b2lkIGUoKTtcbiAgICAgICAgICAgIGkgKz0gaztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoXCJhZnRlciBkZXNjcmlwdG9yXCIgPT09IGopIGlmIChkKGspKSA7ZWxzZSB7XG4gICAgICAgICAgaWYgKFwiXCIgPT09IGspIHJldHVybiB2b2lkIGUoKTtcbiAgICAgICAgICBqID0gXCJpbiBkZXNjcmlwdG9yXCIsIG0gLT0gMTtcbiAgICAgICAgfVxuICAgICAgICBtICs9IDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIgZywgaCwgaSwgaiwgaywgbCA9IGEubGVuZ3RoLCBtID0gMCwgbiA9IFtdOzspIHtcbiAgICAgIGlmIChjKFUpLCBtID49IGwpIHJldHVybiBuO1xuICAgICAgZyA9IGMoViksIGggPSBbXSwgXCIsXCIgPT09IGcuc2xpY2UoLTEpID8gKGcgPSBnLnJlcGxhY2UoVywgXCJcIiksIGUoKSkgOiBmKCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbihhKSB7XG4gICAgZnVuY3Rpb24gYihhKSB7XG4gICAgICBmdW5jdGlvbiBiKCkge1xuICAgICAgICBmICYmIChnLnB1c2goZiksIGYgPSBcIlwiKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gYygpIHtcbiAgICAgICAgZ1swXSAmJiAoaC5wdXNoKGcpLCBnID0gW10pO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBlLCBmID0gXCJcIiwgZyA9IFtdLCBoID0gW10sIGkgPSAwLCBqID0gMCwgayA9ICExOzspIHtcbiAgICAgICAgaWYgKGUgPSBhLmNoYXJBdChqKSwgXCJcIiA9PT0gZSkgcmV0dXJuIGIoKSwgYygpLCBoO1xuXG4gICAgICAgIGlmIChrKSB7XG4gICAgICAgICAgaWYgKFwiKlwiID09PSBlICYmIFwiL1wiID09PSBhW2ogKyAxXSkge1xuICAgICAgICAgICAgayA9ICExLCBqICs9IDIsIGIoKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGogKz0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZChlKSkge1xuICAgICAgICAgICAgaWYgKGEuY2hhckF0KGogLSAxKSAmJiBkKGEuY2hhckF0KGogLSAxKSkgfHwgIWYpIHtcbiAgICAgICAgICAgICAgaiArPSAxO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKDAgPT09IGkpIHtcbiAgICAgICAgICAgICAgYigpLCBqICs9IDE7XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBlID0gXCIgXCI7XG4gICAgICAgICAgfSBlbHNlIGlmIChcIihcIiA9PT0gZSkgaSArPSAxO2Vsc2UgaWYgKFwiKVwiID09PSBlKSBpIC09IDE7ZWxzZSB7XG4gICAgICAgICAgICBpZiAoXCIsXCIgPT09IGUpIHtcbiAgICAgICAgICAgICAgYigpLCBjKCksIGogKz0gMTtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChcIi9cIiA9PT0gZSAmJiBcIipcIiA9PT0gYS5jaGFyQXQoaiArIDEpKSB7XG4gICAgICAgICAgICAgIGsgPSAhMCwgaiArPSAyO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmICs9IGUsIGogKz0gMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGMoYSkge1xuICAgICAgcmV0dXJuIGsudGVzdChhKSAmJiBwYXJzZUZsb2F0KGEpID49IDAgPyAhMCA6IGwudGVzdChhKSA/ICEwIDogXCIwXCIgPT09IGEgfHwgXCItMFwiID09PSBhIHx8IFwiKzBcIiA9PT0gYSA/ICEwIDogITE7XG4gICAgfVxuXG4gICAgdmFyIGUsXG4gICAgICAgIGYsXG4gICAgICAgIGcsXG4gICAgICAgIGgsXG4gICAgICAgIGksXG4gICAgICAgIGosXG4gICAgICAgIGsgPSAvXig/OlsrLV0/WzAtOV0rfFswLTldKlxcLlswLTldKykoPzpbZUVdWystXT9bMC05XSspPyg/OmNofGNtfGVtfGV4fGlufG1tfHBjfHB0fHB4fHJlbXx2aHx2bWlufHZtYXh8dncpJC9pLFxuICAgICAgICBsID0gL15jYWxjXFwoKD86WzAtOWEteiBcXC5cXCtcXC1cXCpcXC9cXChcXCldKylcXCkkL2k7XG5cbiAgICBmb3IgKGYgPSBiKGEpLCBnID0gZi5sZW5ndGgsIGUgPSAwOyBnID4gZTsgZSsrKSB7XG4gICAgICBpZiAoaCA9IGZbZV0sIGkgPSBoW2gubGVuZ3RoIC0gMV0sIGMoaSkpIHtcbiAgICAgICAgaWYgKGogPSBpLCBoLnBvcCgpLCAwID09PSBoLmxlbmd0aCkgcmV0dXJuIGo7XG4gICAgICAgIGlmIChoID0gaC5qb2luKFwiIFwiKSwgcy5tYXRjaGVzTWVkaWEoaCkpIHJldHVybiBqO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBcIjEwMHZ3XCI7XG4gIH1cblxuICBiLmNyZWF0ZUVsZW1lbnQoXCJwaWN0dXJlXCIpO1xuXG4gIHZhciBvLFxuICAgICAgcCxcbiAgICAgIHEsXG4gICAgICByLFxuICAgICAgcyA9IHt9LFxuICAgICAgdCA9ICExLFxuICAgICAgdSA9IGZ1bmN0aW9uIHUoKSB7fSxcbiAgICAgIHYgPSBiLmNyZWF0ZUVsZW1lbnQoXCJpbWdcIiksXG4gICAgICB3ID0gdi5nZXRBdHRyaWJ1dGUsXG4gICAgICB4ID0gdi5zZXRBdHRyaWJ1dGUsXG4gICAgICB5ID0gdi5yZW1vdmVBdHRyaWJ1dGUsXG4gICAgICB6ID0gYi5kb2N1bWVudEVsZW1lbnQsXG4gICAgICBBID0ge30sXG4gICAgICBCID0ge1xuICAgIGFsZ29yaXRobTogXCJcIlxuICB9LFxuICAgICAgQyA9IFwiZGF0YS1wZnNyY1wiLFxuICAgICAgRCA9IEMgKyBcInNldFwiLFxuICAgICAgRSA9IG5hdmlnYXRvci51c2VyQWdlbnQsXG4gICAgICBGID0gL3JpZGVudC8udGVzdChFKSB8fCAvZWNrby8udGVzdChFKSAmJiBFLm1hdGNoKC9ydlxcOihcXGQrKS8pICYmIFJlZ0V4cC4kMSA+IDM1LFxuICAgICAgRyA9IFwiY3VycmVudFNyY1wiLFxuICAgICAgSCA9IC9cXHMrXFwrP1xcZCsoZVxcZCspP3cvLFxuICAgICAgSSA9IC8oXFwoW14pXStcXCkpP1xccyooLispLyxcbiAgICAgIEogPSBhLnBpY3R1cmVmaWxsQ0ZHLFxuICAgICAgSyA9IFwicG9zaXRpb246YWJzb2x1dGU7bGVmdDowO3Zpc2liaWxpdHk6aGlkZGVuO2Rpc3BsYXk6YmxvY2s7cGFkZGluZzowO2JvcmRlcjpub25lO2ZvbnQtc2l6ZToxZW07d2lkdGg6MWVtO292ZXJmbG93OmhpZGRlbjtjbGlwOnJlY3QoMHB4LCAwcHgsIDBweCwgMHB4KVwiLFxuICAgICAgTCA9IFwiZm9udC1zaXplOjEwMCUhaW1wb3J0YW50O1wiLFxuICAgICAgTSA9ICEwLFxuICAgICAgTiA9IHt9LFxuICAgICAgTyA9IHt9LFxuICAgICAgUCA9IGEuZGV2aWNlUGl4ZWxSYXRpbyxcbiAgICAgIFEgPSB7XG4gICAgcHg6IDEsXG4gICAgXCJpblwiOiA5NlxuICB9LFxuICAgICAgUiA9IGIuY3JlYXRlRWxlbWVudChcImFcIiksXG4gICAgICBTID0gITEsXG4gICAgICBUID0gL15bIFxcdFxcblxcclxcdTAwMGNdKy8sXG4gICAgICBVID0gL15bLCBcXHRcXG5cXHJcXHUwMDBjXSsvLFxuICAgICAgViA9IC9eW14gXFx0XFxuXFxyXFx1MDAwY10rLyxcbiAgICAgIFcgPSAvWyxdKyQvLFxuICAgICAgWCA9IC9eXFxkKyQvLFxuICAgICAgWSA9IC9eLT8oPzpbMC05XSt8WzAtOV0qXFwuWzAtOV0rKSg/OltlRV1bKy1dP1swLTldKyk/JC8sXG4gICAgICBaID0gZnVuY3Rpb24gWihhLCBiLCBjLCBkKSB7XG4gICAgYS5hZGRFdmVudExpc3RlbmVyID8gYS5hZGRFdmVudExpc3RlbmVyKGIsIGMsIGQgfHwgITEpIDogYS5hdHRhY2hFdmVudCAmJiBhLmF0dGFjaEV2ZW50KFwib25cIiArIGIsIGMpO1xuICB9LFxuICAgICAgJCA9IGZ1bmN0aW9uICQoYSkge1xuICAgIHZhciBiID0ge307XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChjKSB7XG4gICAgICByZXR1cm4gYyBpbiBiIHx8IChiW2NdID0gYShjKSksIGJbY107XG4gICAgfTtcbiAgfSxcbiAgICAgIF8gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGEgPSAvXihbXFxkXFwuXSspKGVtfHZ3fHB4KSQvLFxuICAgICAgICBiID0gZnVuY3Rpb24gYigpIHtcbiAgICAgIGZvciAodmFyIGEgPSBhcmd1bWVudHMsIGIgPSAwLCBjID0gYVswXTsgKytiIGluIGE7KSB7XG4gICAgICAgIGMgPSBjLnJlcGxhY2UoYVtiXSwgYVsrK2JdKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGM7XG4gICAgfSxcbiAgICAgICAgYyA9ICQoZnVuY3Rpb24gKGEpIHtcbiAgICAgIHJldHVybiBcInJldHVybiBcIiArIGIoKGEgfHwgXCJcIikudG9Mb3dlckNhc2UoKSwgL1xcYmFuZFxcYi9nLCBcIiYmXCIsIC8sL2csIFwifHxcIiwgL21pbi0oW2Etei1cXHNdKyk6L2csIFwiZS4kMT49XCIsIC9tYXgtKFthLXotXFxzXSspOi9nLCBcImUuJDE8PVwiLCAvY2FsYyhbXildKykvZywgXCIoJDEpXCIsIC8oXFxkK1tcXC5dKltcXGRdKikoW2Etel0rKS9nLCBcIigkMSAqIGUuJDIpXCIsIC9eKD8hKGUuW2Etel18WzAtOVxcLiY9fD48XFwrXFwtXFwqXFwoXFwpXFwvXSkpLiovZ2ksIFwiXCIpICsgXCI7XCI7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKGIsIGQpIHtcbiAgICAgIHZhciBlO1xuICAgICAgaWYgKCEoYiBpbiBOKSkgaWYgKE5bYl0gPSAhMSwgZCAmJiAoZSA9IGIubWF0Y2goYSkpKSBOW2JdID0gZVsxXSAqIFFbZVsyXV07ZWxzZSB0cnkge1xuICAgICAgICBOW2JdID0gbmV3IEZ1bmN0aW9uKFwiZVwiLCBjKGIpKShRKTtcbiAgICAgIH0gY2F0Y2ggKGYpIHt9XG4gICAgICByZXR1cm4gTltiXTtcbiAgICB9O1xuICB9KCksXG4gICAgICBhYSA9IGZ1bmN0aW9uIGFhKGEsIGIpIHtcbiAgICByZXR1cm4gYS53ID8gKGEuY1dpZHRoID0gcy5jYWxjTGlzdExlbmd0aChiIHx8IFwiMTAwdndcIiksIGEucmVzID0gYS53IC8gYS5jV2lkdGgpIDogYS5yZXMgPSBhLmQsIGE7XG4gIH0sXG4gICAgICBiYSA9IGZ1bmN0aW9uIGJhKGEpIHtcbiAgICBpZiAodCkge1xuICAgICAgdmFyIGMsXG4gICAgICAgICAgZCxcbiAgICAgICAgICBlLFxuICAgICAgICAgIGYgPSBhIHx8IHt9O1xuXG4gICAgICBpZiAoZi5lbGVtZW50cyAmJiAxID09PSBmLmVsZW1lbnRzLm5vZGVUeXBlICYmIChcIklNR1wiID09PSBmLmVsZW1lbnRzLm5vZGVOYW1lLnRvVXBwZXJDYXNlKCkgPyBmLmVsZW1lbnRzID0gW2YuZWxlbWVudHNdIDogKGYuY29udGV4dCA9IGYuZWxlbWVudHMsIGYuZWxlbWVudHMgPSBudWxsKSksIGMgPSBmLmVsZW1lbnRzIHx8IHMucXNhKGYuY29udGV4dCB8fCBiLCBmLnJlZXZhbHVhdGUgfHwgZi5yZXNlbGVjdCA/IHMuc2VsIDogcy5zZWxTaG9ydCksIGUgPSBjLmxlbmd0aCkge1xuICAgICAgICBmb3IgKHMuc2V0dXBSdW4oZiksIFMgPSAhMCwgZCA9IDA7IGUgPiBkOyBkKyspIHtcbiAgICAgICAgICBzLmZpbGxJbWcoY1tkXSwgZik7XG4gICAgICAgIH1cblxuICAgICAgICBzLnRlYXJkb3duUnVuKGYpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBvID0gYS5jb25zb2xlICYmIGNvbnNvbGUud2FybiA/IGZ1bmN0aW9uIChhKSB7XG4gICAgY29uc29sZS53YXJuKGEpO1xuICB9IDogdSwgRyBpbiB2IHx8IChHID0gXCJzcmNcIiksIEFbXCJpbWFnZS9qcGVnXCJdID0gITAsIEFbXCJpbWFnZS9naWZcIl0gPSAhMCwgQVtcImltYWdlL3BuZ1wiXSA9ICEwLCBBW1wiaW1hZ2Uvc3ZnK3htbFwiXSA9IGIuaW1wbGVtZW50YXRpb24uaGFzRmVhdHVyZShcImh0dHA6Ly93d3cudzMub3JnL1RSL1NWRzExL2ZlYXR1cmUjSW1hZ2VcIiwgXCIxLjFcIiksIHMubnMgPSAoXCJwZlwiICsgbmV3IERhdGUoKS5nZXRUaW1lKCkpLnN1YnN0cigwLCA5KSwgcy5zdXBTcmNzZXQgPSBcInNyY3NldFwiIGluIHYsIHMuc3VwU2l6ZXMgPSBcInNpemVzXCIgaW4gdiwgcy5zdXBQaWN0dXJlID0gISFhLkhUTUxQaWN0dXJlRWxlbWVudCwgcy5zdXBTcmNzZXQgJiYgcy5zdXBQaWN0dXJlICYmICFzLnN1cFNpemVzICYmICFmdW5jdGlvbiAoYSkge1xuICAgIHYuc3Jjc2V0ID0gXCJkYXRhOixhXCIsIGEuc3JjID0gXCJkYXRhOixhXCIsIHMuc3VwU3Jjc2V0ID0gdi5jb21wbGV0ZSA9PT0gYS5jb21wbGV0ZSwgcy5zdXBQaWN0dXJlID0gcy5zdXBTcmNzZXQgJiYgcy5zdXBQaWN0dXJlO1xuICB9KGIuY3JlYXRlRWxlbWVudChcImltZ1wiKSksIHMuc3VwU3Jjc2V0ICYmICFzLnN1cFNpemVzID8gIWZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYSA9IFwiZGF0YTppbWFnZS9naWY7YmFzZTY0LFIwbEdPRGxoQWdBQkFQQUFBUC8vL3dBQUFDSDVCQUFBQUFBQUxBQUFBQUFDQUFFQUFBSUNCQW9BT3c9PVwiLFxuICAgICAgICBjID0gXCJkYXRhOmltYWdlL2dpZjtiYXNlNjQsUjBsR09EbGhBUUFCQUFBQUFDSDVCQUVLQUFFQUxBQUFBQUFCQUFFQUFBSUNUQUVBT3c9PVwiLFxuICAgICAgICBkID0gYi5jcmVhdGVFbGVtZW50KFwiaW1nXCIpLFxuICAgICAgICBlID0gZnVuY3Rpb24gZSgpIHtcbiAgICAgIHZhciBhID0gZC53aWR0aDtcbiAgICAgIDIgPT09IGEgJiYgKHMuc3VwU2l6ZXMgPSAhMCksIHEgPSBzLnN1cFNyY3NldCAmJiAhcy5zdXBTaXplcywgdCA9ICEwLCBzZXRUaW1lb3V0KGJhKTtcbiAgICB9O1xuXG4gICAgZC5vbmxvYWQgPSBlLCBkLm9uZXJyb3IgPSBlLCBkLnNldEF0dHJpYnV0ZShcInNpemVzXCIsIFwiOXB4XCIpLCBkLnNyY3NldCA9IGMgKyBcIiAxdyxcIiArIGEgKyBcIiA5d1wiLCBkLnNyYyA9IGM7XG4gIH0oKSA6IHQgPSAhMCwgcy5zZWxTaG9ydCA9IFwicGljdHVyZT5pbWcsaW1nW3NyY3NldF1cIiwgcy5zZWwgPSBzLnNlbFNob3J0LCBzLmNmZyA9IEIsIHMuRFBSID0gUCB8fCAxLCBzLnUgPSBRLCBzLnR5cGVzID0gQSwgcy5zZXRTaXplID0gdSwgcy5tYWtlVXJsID0gJChmdW5jdGlvbiAoYSkge1xuICAgIHJldHVybiBSLmhyZWYgPSBhLCBSLmhyZWY7XG4gIH0pLCBzLnFzYSA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgcmV0dXJuIFwicXVlcnlTZWxlY3RvclwiIGluIGEgPyBhLnF1ZXJ5U2VsZWN0b3JBbGwoYikgOiBbXTtcbiAgfSwgcy5tYXRjaGVzTWVkaWEgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGEubWF0Y2hNZWRpYSAmJiAobWF0Y2hNZWRpYShcIihtaW4td2lkdGg6IDAuMWVtKVwiKSB8fCB7fSkubWF0Y2hlcyA/IHMubWF0Y2hlc01lZGlhID0gZnVuY3Rpb24gKGEpIHtcbiAgICAgIHJldHVybiAhYSB8fCBtYXRjaE1lZGlhKGEpLm1hdGNoZXM7XG4gICAgfSA6IHMubWF0Y2hlc01lZGlhID0gcy5tTVEsIHMubWF0Y2hlc01lZGlhLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0sIHMubU1RID0gZnVuY3Rpb24gKGEpIHtcbiAgICByZXR1cm4gYSA/IF8oYSkgOiAhMDtcbiAgfSwgcy5jYWxjTGVuZ3RoID0gZnVuY3Rpb24gKGEpIHtcbiAgICB2YXIgYiA9IF8oYSwgITApIHx8ICExO1xuICAgIHJldHVybiAwID4gYiAmJiAoYiA9ICExKSwgYjtcbiAgfSwgcy5zdXBwb3J0c1R5cGUgPSBmdW5jdGlvbiAoYSkge1xuICAgIHJldHVybiBhID8gQVthXSA6ICEwO1xuICB9LCBzLnBhcnNlU2l6ZSA9ICQoZnVuY3Rpb24gKGEpIHtcbiAgICB2YXIgYiA9IChhIHx8IFwiXCIpLm1hdGNoKEkpO1xuICAgIHJldHVybiB7XG4gICAgICBtZWRpYTogYiAmJiBiWzFdLFxuICAgICAgbGVuZ3RoOiBiICYmIGJbMl1cbiAgICB9O1xuICB9KSwgcy5wYXJzZVNldCA9IGZ1bmN0aW9uIChhKSB7XG4gICAgcmV0dXJuIGEuY2FuZHMgfHwgKGEuY2FuZHMgPSBtKGEuc3Jjc2V0LCBhKSksIGEuY2FuZHM7XG4gIH0sIHMuZ2V0RW1WYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYTtcblxuICAgIGlmICghcCAmJiAoYSA9IGIuYm9keSkpIHtcbiAgICAgIHZhciBjID0gYi5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLFxuICAgICAgICAgIGQgPSB6LnN0eWxlLmNzc1RleHQsXG4gICAgICAgICAgZSA9IGEuc3R5bGUuY3NzVGV4dDtcbiAgICAgIGMuc3R5bGUuY3NzVGV4dCA9IEssIHouc3R5bGUuY3NzVGV4dCA9IEwsIGEuc3R5bGUuY3NzVGV4dCA9IEwsIGEuYXBwZW5kQ2hpbGQoYyksIHAgPSBjLm9mZnNldFdpZHRoLCBhLnJlbW92ZUNoaWxkKGMpLCBwID0gcGFyc2VGbG9hdChwLCAxMCksIHouc3R5bGUuY3NzVGV4dCA9IGQsIGEuc3R5bGUuY3NzVGV4dCA9IGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHAgfHwgMTY7XG4gIH0sIHMuY2FsY0xpc3RMZW5ndGggPSBmdW5jdGlvbiAoYSkge1xuICAgIGlmICghKGEgaW4gTykgfHwgQi51VCkge1xuICAgICAgdmFyIGIgPSBzLmNhbGNMZW5ndGgobihhKSk7XG4gICAgICBPW2FdID0gYiA/IGIgOiBRLndpZHRoO1xuICAgIH1cblxuICAgIHJldHVybiBPW2FdO1xuICB9LCBzLnNldFJlcyA9IGZ1bmN0aW9uIChhKSB7XG4gICAgdmFyIGI7XG5cbiAgICBpZiAoYSkge1xuICAgICAgYiA9IHMucGFyc2VTZXQoYSk7XG5cbiAgICAgIGZvciAodmFyIGMgPSAwLCBkID0gYi5sZW5ndGg7IGQgPiBjOyBjKyspIHtcbiAgICAgICAgYWEoYltjXSwgYS5zaXplcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGI7XG4gIH0sIHMuc2V0UmVzLnJlcyA9IGFhLCBzLmFwcGx5U2V0Q2FuZGlkYXRlID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICBpZiAoYS5sZW5ndGgpIHtcbiAgICAgIHZhciBjLFxuICAgICAgICAgIGQsXG4gICAgICAgICAgZSxcbiAgICAgICAgICBmLFxuICAgICAgICAgIGgsXG4gICAgICAgICAgayxcbiAgICAgICAgICBsLFxuICAgICAgICAgIG0sXG4gICAgICAgICAgbixcbiAgICAgICAgICBvID0gYltzLm5zXSxcbiAgICAgICAgICBwID0gcy5EUFI7XG4gICAgICBpZiAoayA9IG8uY3VyU3JjIHx8IGJbR10sIGwgPSBvLmN1ckNhbiB8fCBqKGIsIGssIGFbMF0uc2V0KSwgbCAmJiBsLnNldCA9PT0gYVswXS5zZXQgJiYgKG4gPSBGICYmICFiLmNvbXBsZXRlICYmIGwucmVzIC0gLjEgPiBwLCBuIHx8IChsLmNhY2hlZCA9ICEwLCBsLnJlcyA+PSBwICYmIChoID0gbCkpKSwgIWgpIGZvciAoYS5zb3J0KGkpLCBmID0gYS5sZW5ndGgsIGggPSBhW2YgLSAxXSwgZCA9IDA7IGYgPiBkOyBkKyspIHtcbiAgICAgICAgaWYgKGMgPSBhW2RdLCBjLnJlcyA+PSBwKSB7XG4gICAgICAgICAgZSA9IGQgLSAxLCBoID0gYVtlXSAmJiAobiB8fCBrICE9PSBzLm1ha2VVcmwoYy51cmwpKSAmJiBnKGFbZV0ucmVzLCBjLnJlcywgcCwgYVtlXS5jYWNoZWQpID8gYVtlXSA6IGM7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGggJiYgKG0gPSBzLm1ha2VVcmwoaC51cmwpLCBvLmN1clNyYyA9IG0sIG8uY3VyQ2FuID0gaCwgbSAhPT0gayAmJiBzLnNldFNyYyhiLCBoKSwgcy5zZXRTaXplKGIpKTtcbiAgICB9XG4gIH0sIHMuc2V0U3JjID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICB2YXIgYztcbiAgICBhLnNyYyA9IGIudXJsLCBcImltYWdlL3N2Zyt4bWxcIiA9PT0gYi5zZXQudHlwZSAmJiAoYyA9IGEuc3R5bGUud2lkdGgsIGEuc3R5bGUud2lkdGggPSBhLm9mZnNldFdpZHRoICsgMSArIFwicHhcIiwgYS5vZmZzZXRXaWR0aCArIDEgJiYgKGEuc3R5bGUud2lkdGggPSBjKSk7XG4gIH0sIHMuZ2V0U2V0ID0gZnVuY3Rpb24gKGEpIHtcbiAgICB2YXIgYixcbiAgICAgICAgYyxcbiAgICAgICAgZCxcbiAgICAgICAgZSA9ICExLFxuICAgICAgICBmID0gYVtzLm5zXS5zZXRzO1xuXG4gICAgZm9yIChiID0gMDsgYiA8IGYubGVuZ3RoICYmICFlOyBiKyspIHtcbiAgICAgIGlmIChjID0gZltiXSwgYy5zcmNzZXQgJiYgcy5tYXRjaGVzTWVkaWEoYy5tZWRpYSkgJiYgKGQgPSBzLnN1cHBvcnRzVHlwZShjLnR5cGUpKSkge1xuICAgICAgICBcInBlbmRpbmdcIiA9PT0gZCAmJiAoYyA9IGQpLCBlID0gYztcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGU7XG4gIH0sIHMucGFyc2VTZXRzID0gZnVuY3Rpb24gKGEsIGIsIGQpIHtcbiAgICB2YXIgZSxcbiAgICAgICAgZixcbiAgICAgICAgZyxcbiAgICAgICAgaCxcbiAgICAgICAgaSA9IGIgJiYgXCJQSUNUVVJFXCIgPT09IGIubm9kZU5hbWUudG9VcHBlckNhc2UoKSxcbiAgICAgICAgaiA9IGFbcy5uc107XG4gICAgKGouc3JjID09PSBjIHx8IGQuc3JjKSAmJiAoai5zcmMgPSB3LmNhbGwoYSwgXCJzcmNcIiksIGouc3JjID8geC5jYWxsKGEsIEMsIGouc3JjKSA6IHkuY2FsbChhLCBDKSksIChqLnNyY3NldCA9PT0gYyB8fCBkLnNyY3NldCB8fCAhcy5zdXBTcmNzZXQgfHwgYS5zcmNzZXQpICYmIChlID0gdy5jYWxsKGEsIFwic3Jjc2V0XCIpLCBqLnNyY3NldCA9IGUsIGggPSAhMCksIGouc2V0cyA9IFtdLCBpICYmIChqLnBpYyA9ICEwLCBsKGIsIGouc2V0cykpLCBqLnNyY3NldCA/IChmID0ge1xuICAgICAgc3Jjc2V0OiBqLnNyY3NldCxcbiAgICAgIHNpemVzOiB3LmNhbGwoYSwgXCJzaXplc1wiKVxuICAgIH0sIGouc2V0cy5wdXNoKGYpLCBnID0gKHEgfHwgai5zcmMpICYmIEgudGVzdChqLnNyY3NldCB8fCBcIlwiKSwgZyB8fCAhai5zcmMgfHwgayhqLnNyYywgZikgfHwgZi5oYXMxeCB8fCAoZi5zcmNzZXQgKz0gXCIsIFwiICsgai5zcmMsIGYuY2FuZHMucHVzaCh7XG4gICAgICB1cmw6IGouc3JjLFxuICAgICAgZDogMSxcbiAgICAgIHNldDogZlxuICAgIH0pKSkgOiBqLnNyYyAmJiBqLnNldHMucHVzaCh7XG4gICAgICBzcmNzZXQ6IGouc3JjLFxuICAgICAgc2l6ZXM6IG51bGxcbiAgICB9KSwgai5jdXJDYW4gPSBudWxsLCBqLmN1clNyYyA9IGMsIGouc3VwcG9ydGVkID0gIShpIHx8IGYgJiYgIXMuc3VwU3Jjc2V0IHx8IGcgJiYgIXMuc3VwU2l6ZXMpLCBoICYmIHMuc3VwU3Jjc2V0ICYmICFqLnN1cHBvcnRlZCAmJiAoZSA/ICh4LmNhbGwoYSwgRCwgZSksIGEuc3Jjc2V0ID0gXCJcIikgOiB5LmNhbGwoYSwgRCkpLCBqLnN1cHBvcnRlZCAmJiAhai5zcmNzZXQgJiYgKCFqLnNyYyAmJiBhLnNyYyB8fCBhLnNyYyAhPT0gcy5tYWtlVXJsKGouc3JjKSkgJiYgKG51bGwgPT09IGouc3JjID8gYS5yZW1vdmVBdHRyaWJ1dGUoXCJzcmNcIikgOiBhLnNyYyA9IGouc3JjKSwgai5wYXJzZWQgPSAhMDtcbiAgfSwgcy5maWxsSW1nID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICB2YXIgYyxcbiAgICAgICAgZCA9IGIucmVzZWxlY3QgfHwgYi5yZWV2YWx1YXRlO1xuICAgIGFbcy5uc10gfHwgKGFbcy5uc10gPSB7fSksIGMgPSBhW3MubnNdLCAoZCB8fCBjLmV2YWxlZCAhPT0gcikgJiYgKCghYy5wYXJzZWQgfHwgYi5yZWV2YWx1YXRlKSAmJiBzLnBhcnNlU2V0cyhhLCBhLnBhcmVudE5vZGUsIGIpLCBjLnN1cHBvcnRlZCA/IGMuZXZhbGVkID0gciA6IGgoYSkpO1xuICB9LCBzLnNldHVwUnVuID0gZnVuY3Rpb24gKCkge1xuICAgICghUyB8fCBNIHx8IFAgIT09IGEuZGV2aWNlUGl4ZWxSYXRpbykgJiYgZigpO1xuICB9LCBzLnN1cFBpY3R1cmUgPyAoYmEgPSB1LCBzLmZpbGxJbWcgPSB1KSA6ICFmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGMsXG4gICAgICAgIGQgPSBhLmF0dGFjaEV2ZW50ID8gL2QkfF5jLyA6IC9kJHxeY3xeaS8sXG4gICAgICAgIGUgPSBmdW5jdGlvbiBlKCkge1xuICAgICAgdmFyIGEgPSBiLnJlYWR5U3RhdGUgfHwgXCJcIjtcbiAgICAgIGYgPSBzZXRUaW1lb3V0KGUsIFwibG9hZGluZ1wiID09PSBhID8gMjAwIDogOTk5KSwgYi5ib2R5ICYmIChzLmZpbGxJbWdzKCksIGMgPSBjIHx8IGQudGVzdChhKSwgYyAmJiBjbGVhclRpbWVvdXQoZikpO1xuICAgIH0sXG4gICAgICAgIGYgPSBzZXRUaW1lb3V0KGUsIGIuYm9keSA/IDkgOiA5OSksXG4gICAgICAgIGcgPSBmdW5jdGlvbiBnKGEsIGIpIHtcbiAgICAgIHZhciBjLFxuICAgICAgICAgIGQsXG4gICAgICAgICAgZSA9IGZ1bmN0aW9uIGUoKSB7XG4gICAgICAgIHZhciBmID0gbmV3IERhdGUoKSAtIGQ7XG4gICAgICAgIGIgPiBmID8gYyA9IHNldFRpbWVvdXQoZSwgYiAtIGYpIDogKGMgPSBudWxsLCBhKCkpO1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZCA9IG5ldyBEYXRlKCksIGMgfHwgKGMgPSBzZXRUaW1lb3V0KGUsIGIpKTtcbiAgICAgIH07XG4gICAgfSxcbiAgICAgICAgaCA9IHouY2xpZW50SGVpZ2h0LFxuICAgICAgICBpID0gZnVuY3Rpb24gaSgpIHtcbiAgICAgIE0gPSBNYXRoLm1heChhLmlubmVyV2lkdGggfHwgMCwgei5jbGllbnRXaWR0aCkgIT09IFEud2lkdGggfHwgei5jbGllbnRIZWlnaHQgIT09IGgsIGggPSB6LmNsaWVudEhlaWdodCwgTSAmJiBzLmZpbGxJbWdzKCk7XG4gICAgfTtcblxuICAgIFooYSwgXCJyZXNpemVcIiwgZyhpLCA5OSkpLCBaKGIsIFwicmVhZHlzdGF0ZWNoYW5nZVwiLCBlKTtcbiAgfSgpLCBzLnBpY3R1cmVmaWxsID0gYmEsIHMuZmlsbEltZ3MgPSBiYSwgcy50ZWFyZG93blJ1biA9IHUsIGJhLl8gPSBzLCBhLnBpY3R1cmVmaWxsQ0ZHID0ge1xuICAgIHBmOiBzLFxuICAgIHB1c2g6IGZ1bmN0aW9uIHB1c2goYSkge1xuICAgICAgdmFyIGIgPSBhLnNoaWZ0KCk7XG4gICAgICBcImZ1bmN0aW9uXCIgPT0gdHlwZW9mIHNbYl0gPyBzW2JdLmFwcGx5KHMsIGEpIDogKEJbYl0gPSBhWzBdLCBTICYmIHMuZmlsbEltZ3Moe1xuICAgICAgICByZXNlbGVjdDogITBcbiAgICAgIH0pKTtcbiAgICB9XG4gIH07XG5cbiAgZm9yICg7IEogJiYgSi5sZW5ndGg7KSB7XG4gICAgYS5waWN0dXJlZmlsbENGRy5wdXNoKEouc2hpZnQoKSk7XG4gIH1cblxuICBhLnBpY3R1cmVmaWxsID0gYmEsIFwib2JqZWN0XCIgPT0gKHR5cGVvZiBtb2R1bGUgPT09IFwidW5kZWZpbmVkXCIgPyBcInVuZGVmaW5lZFwiIDogX3R5cGVvZihtb2R1bGUpKSAmJiBcIm9iamVjdFwiID09IF90eXBlb2YobW9kdWxlLmV4cG9ydHMpID8gbW9kdWxlLmV4cG9ydHMgPSBiYSA6IFwiZnVuY3Rpb25cIiA9PSB0eXBlb2YgZGVmaW5lICYmIGRlZmluZS5hbWQgJiYgZGVmaW5lKFwicGljdHVyZWZpbGxcIiwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBiYTtcbiAgfSksIHMuc3VwUGljdHVyZSB8fCAoQVtcImltYWdlL3dlYnBcIl0gPSBlKFwiaW1hZ2Uvd2VicFwiLCBcImRhdGE6aW1hZ2Uvd2VicDtiYXNlNjQsVWtsR1Jrb0FBQUJYUlVKUVZsQTRXQW9BQUFBUUFBQUFBQUFBQUFBQVFVeFFTQXdBQUFBQkJ4QVIvUTlFUlA4REFBQldVRGdnR0FBQUFEQUJBSjBCS2dFQUFRQURBRFFscEFBRGNBRCsrLzFRQUE9PVwiKSk7XG59KHdpbmRvdywgZG9jdW1lbnQpOyIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBfdHlwZW9mKG9iaikgeyBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIpIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9OyB9IGVsc2UgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07IH0gcmV0dXJuIF90eXBlb2Yob2JqKTsgfVxuXG4vKiFcbiAqIElzb3RvcGUgUEFDS0FHRUQgdjMuMC42XG4gKlxuICogTGljZW5zZWQgR1BMdjMgZm9yIG9wZW4gc291cmNlIHVzZVxuICogb3IgSXNvdG9wZSBDb21tZXJjaWFsIExpY2Vuc2UgZm9yIGNvbW1lcmNpYWwgdXNlXG4gKlxuICogaHR0cHM6Ly9pc290b3BlLm1ldGFmaXp6eS5jb1xuICogQ29weXJpZ2h0IDIwMTAtMjAxOCBNZXRhZml6enlcbiAqL1xuXG4vKipcbiAqIEJyaWRnZXQgbWFrZXMgalF1ZXJ5IHdpZGdldHNcbiAqIHYyLjAuMVxuICogTUlUIGxpY2Vuc2VcbiAqL1xuXG4vKiBqc2hpbnQgYnJvd3NlcjogdHJ1ZSwgc3RyaWN0OiB0cnVlLCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXG4oZnVuY3Rpb24gKHdpbmRvdywgZmFjdG9yeSkge1xuICAvLyB1bml2ZXJzYWwgbW9kdWxlIGRlZmluaXRpb25cblxuICAvKmpzaGludCBzdHJpY3Q6IGZhbHNlICovXG5cbiAgLyogZ2xvYmFscyBkZWZpbmUsIG1vZHVsZSwgcmVxdWlyZSAqL1xuICBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTURcbiAgICBkZWZpbmUoJ2pxdWVyeS1icmlkZ2V0L2pxdWVyeS1icmlkZ2V0JywgWydqcXVlcnknXSwgZnVuY3Rpb24gKGpRdWVyeSkge1xuICAgICAgcmV0dXJuIGZhY3Rvcnkod2luZG93LCBqUXVlcnkpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgbW9kdWxlID09PSBcInVuZGVmaW5lZFwiID8gXCJ1bmRlZmluZWRcIiA6IF90eXBlb2YobW9kdWxlKSkgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSh3aW5kb3csIHJlcXVpcmUoJ2pxdWVyeScpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBicm93c2VyIGdsb2JhbFxuICAgIHdpbmRvdy5qUXVlcnlCcmlkZ2V0ID0gZmFjdG9yeSh3aW5kb3csIHdpbmRvdy5qUXVlcnkpO1xuICB9XG59KSh3aW5kb3csIGZ1bmN0aW9uIGZhY3Rvcnkod2luZG93LCBqUXVlcnkpIHtcbiAgJ3VzZSBzdHJpY3QnOyAvLyAtLS0tLSB1dGlscyAtLS0tLSAvL1xuXG4gIHZhciBhcnJheVNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlOyAvLyBoZWxwZXIgZnVuY3Rpb24gZm9yIGxvZ2dpbmcgZXJyb3JzXG4gIC8vICQuZXJyb3IgYnJlYWtzIGpRdWVyeSBjaGFpbmluZ1xuXG4gIHZhciBjb25zb2xlID0gd2luZG93LmNvbnNvbGU7XG4gIHZhciBsb2dFcnJvciA9IHR5cGVvZiBjb25zb2xlID09ICd1bmRlZmluZWQnID8gZnVuY3Rpb24gKCkge30gOiBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSk7XG4gIH07IC8vIC0tLS0tIGpRdWVyeUJyaWRnZXQgLS0tLS0gLy9cblxuICBmdW5jdGlvbiBqUXVlcnlCcmlkZ2V0KG5hbWVzcGFjZSwgUGx1Z2luQ2xhc3MsICQpIHtcbiAgICAkID0gJCB8fCBqUXVlcnkgfHwgd2luZG93LmpRdWVyeTtcblxuICAgIGlmICghJCkge1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gYWRkIG9wdGlvbiBtZXRob2QgLT4gJCgpLnBsdWdpbignb3B0aW9uJywgey4uLn0pXG5cblxuICAgIGlmICghUGx1Z2luQ2xhc3MucHJvdG90eXBlLm9wdGlvbikge1xuICAgICAgLy8gb3B0aW9uIHNldHRlclxuICAgICAgUGx1Z2luQ2xhc3MucHJvdG90eXBlLm9wdGlvbiA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgICAgIC8vIGJhaWwgb3V0IGlmIG5vdCBhbiBvYmplY3RcbiAgICAgICAgaWYgKCEkLmlzUGxhaW5PYmplY3Qob3B0cykpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB0aGlzLm9wdGlvbnMsIG9wdHMpO1xuICAgICAgfTtcbiAgICB9IC8vIG1ha2UgalF1ZXJ5IHBsdWdpblxuXG5cbiAgICAkLmZuW25hbWVzcGFjZV0gPSBmdW5jdGlvbiAoYXJnMFxuICAgIC8qLCBhcmcxICovXG4gICAgKSB7XG4gICAgICBpZiAodHlwZW9mIGFyZzAgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgLy8gbWV0aG9kIGNhbGwgJCgpLnBsdWdpbiggJ21ldGhvZE5hbWUnLCB7IG9wdGlvbnMgfSApXG4gICAgICAgIC8vIHNoaWZ0IGFyZ3VtZW50cyBieSAxXG4gICAgICAgIHZhciBhcmdzID0gYXJyYXlTbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgIHJldHVybiBtZXRob2RDYWxsKHRoaXMsIGFyZzAsIGFyZ3MpO1xuICAgICAgfSAvLyBqdXN0ICQoKS5wbHVnaW4oeyBvcHRpb25zIH0pXG5cblxuICAgICAgcGxhaW5DYWxsKHRoaXMsIGFyZzApO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTsgLy8gJCgpLnBsdWdpbignbWV0aG9kTmFtZScpXG5cblxuICAgIGZ1bmN0aW9uIG1ldGhvZENhbGwoJGVsZW1zLCBtZXRob2ROYW1lLCBhcmdzKSB7XG4gICAgICB2YXIgcmV0dXJuVmFsdWU7XG4gICAgICB2YXIgcGx1Z2luTWV0aG9kU3RyID0gJyQoKS4nICsgbmFtZXNwYWNlICsgJyhcIicgKyBtZXRob2ROYW1lICsgJ1wiKSc7XG4gICAgICAkZWxlbXMuZWFjaChmdW5jdGlvbiAoaSwgZWxlbSkge1xuICAgICAgICAvLyBnZXQgaW5zdGFuY2VcbiAgICAgICAgdmFyIGluc3RhbmNlID0gJC5kYXRhKGVsZW0sIG5hbWVzcGFjZSk7XG5cbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgIGxvZ0Vycm9yKG5hbWVzcGFjZSArICcgbm90IGluaXRpYWxpemVkLiBDYW5ub3QgY2FsbCBtZXRob2RzLCBpLmUuICcgKyBwbHVnaW5NZXRob2RTdHIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtZXRob2QgPSBpbnN0YW5jZVttZXRob2ROYW1lXTtcblxuICAgICAgICBpZiAoIW1ldGhvZCB8fCBtZXRob2ROYW1lLmNoYXJBdCgwKSA9PSAnXycpIHtcbiAgICAgICAgICBsb2dFcnJvcihwbHVnaW5NZXRob2RTdHIgKyAnIGlzIG5vdCBhIHZhbGlkIG1ldGhvZCcpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSAvLyBhcHBseSBtZXRob2QsIGdldCByZXR1cm4gdmFsdWVcblxuXG4gICAgICAgIHZhciB2YWx1ZSA9IG1ldGhvZC5hcHBseShpbnN0YW5jZSwgYXJncyk7IC8vIHNldCByZXR1cm4gdmFsdWUgaWYgdmFsdWUgaXMgcmV0dXJuZWQsIHVzZSBvbmx5IGZpcnN0IHZhbHVlXG5cbiAgICAgICAgcmV0dXJuVmFsdWUgPSByZXR1cm5WYWx1ZSA9PT0gdW5kZWZpbmVkID8gdmFsdWUgOiByZXR1cm5WYWx1ZTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJldHVyblZhbHVlICE9PSB1bmRlZmluZWQgPyByZXR1cm5WYWx1ZSA6ICRlbGVtcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwbGFpbkNhbGwoJGVsZW1zLCBvcHRpb25zKSB7XG4gICAgICAkZWxlbXMuZWFjaChmdW5jdGlvbiAoaSwgZWxlbSkge1xuICAgICAgICB2YXIgaW5zdGFuY2UgPSAkLmRhdGEoZWxlbSwgbmFtZXNwYWNlKTtcblxuICAgICAgICBpZiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAvLyBzZXQgb3B0aW9ucyAmIGluaXRcbiAgICAgICAgICBpbnN0YW5jZS5vcHRpb24ob3B0aW9ucyk7XG5cbiAgICAgICAgICBpbnN0YW5jZS5faW5pdCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGluaXRpYWxpemUgbmV3IGluc3RhbmNlXG4gICAgICAgICAgaW5zdGFuY2UgPSBuZXcgUGx1Z2luQ2xhc3MoZWxlbSwgb3B0aW9ucyk7XG4gICAgICAgICAgJC5kYXRhKGVsZW0sIG5hbWVzcGFjZSwgaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB1cGRhdGVKUXVlcnkoJCk7XG4gIH0gLy8gLS0tLS0gdXBkYXRlSlF1ZXJ5IC0tLS0tIC8vXG4gIC8vIHNldCAkLmJyaWRnZXQgZm9yIHYxIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XG5cblxuICBmdW5jdGlvbiB1cGRhdGVKUXVlcnkoJCkge1xuICAgIGlmICghJCB8fCAkICYmICQuYnJpZGdldCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgICQuYnJpZGdldCA9IGpRdWVyeUJyaWRnZXQ7XG4gIH1cblxuICB1cGRhdGVKUXVlcnkoalF1ZXJ5IHx8IHdpbmRvdy5qUXVlcnkpOyAvLyAtLS0tLSAgLS0tLS0gLy9cblxuICByZXR1cm4galF1ZXJ5QnJpZGdldDtcbn0pO1xuLyoqXG4gKiBFdkVtaXR0ZXIgdjEuMS4wXG4gKiBMaWwnIGV2ZW50IGVtaXR0ZXJcbiAqIE1JVCBMaWNlbnNlXG4gKi9cblxuLyoganNoaW50IHVudXNlZDogdHJ1ZSwgdW5kZWY6IHRydWUsIHN0cmljdDogdHJ1ZSAqL1xuXG5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIC8vIHVuaXZlcnNhbCBtb2R1bGUgZGVmaW5pdGlvblxuXG4gIC8qIGpzaGludCBzdHJpY3Q6IGZhbHNlICovXG5cbiAgLyogZ2xvYmFscyBkZWZpbmUsIG1vZHVsZSwgd2luZG93ICovXG4gIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRCAtIFJlcXVpcmVKU1xuICAgIGRlZmluZSgnZXYtZW1pdHRlci9ldi1lbWl0dGVyJywgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBtb2R1bGUgPT09IFwidW5kZWZpbmVkXCIgPyBcInVuZGVmaW5lZFwiIDogX3R5cGVvZihtb2R1bGUpKSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTIC0gQnJvd3NlcmlmeSwgV2VicGFja1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFsc1xuICAgIGdsb2JhbC5FdkVtaXR0ZXIgPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB2b2lkIDAsIGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gRXZFbWl0dGVyKCkge31cblxuICB2YXIgcHJvdG8gPSBFdkVtaXR0ZXIucHJvdG90eXBlO1xuXG4gIHByb3RvLm9uID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgbGlzdGVuZXIpIHtcbiAgICBpZiAoIWV2ZW50TmFtZSB8fCAhbGlzdGVuZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIHNldCBldmVudHMgaGFzaFxuXG5cbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9OyAvLyBzZXQgbGlzdGVuZXJzIGFycmF5XG5cbiAgICB2YXIgbGlzdGVuZXJzID0gZXZlbnRzW2V2ZW50TmFtZV0gPSBldmVudHNbZXZlbnROYW1lXSB8fCBbXTsgLy8gb25seSBhZGQgb25jZVxuXG4gICAgaWYgKGxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKSA9PSAtMSkge1xuICAgICAgbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIHByb3RvLm9uY2UgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBsaXN0ZW5lcikge1xuICAgIGlmICghZXZlbnROYW1lIHx8ICFsaXN0ZW5lcikge1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gYWRkIGV2ZW50XG5cblxuICAgIHRoaXMub24oZXZlbnROYW1lLCBsaXN0ZW5lcik7IC8vIHNldCBvbmNlIGZsYWdcbiAgICAvLyBzZXQgb25jZUV2ZW50cyBoYXNoXG5cbiAgICB2YXIgb25jZUV2ZW50cyA9IHRoaXMuX29uY2VFdmVudHMgPSB0aGlzLl9vbmNlRXZlbnRzIHx8IHt9OyAvLyBzZXQgb25jZUxpc3RlbmVycyBvYmplY3RcblxuICAgIHZhciBvbmNlTGlzdGVuZXJzID0gb25jZUV2ZW50c1tldmVudE5hbWVdID0gb25jZUV2ZW50c1tldmVudE5hbWVdIHx8IHt9OyAvLyBzZXQgZmxhZ1xuXG4gICAgb25jZUxpc3RlbmVyc1tsaXN0ZW5lcl0gPSB0cnVlO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIHByb3RvLm9mZiA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGxpc3RlbmVyKSB7XG4gICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50cyAmJiB0aGlzLl9ldmVudHNbZXZlbnROYW1lXTtcblxuICAgIGlmICghbGlzdGVuZXJzIHx8ICFsaXN0ZW5lcnMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGluZGV4ID0gbGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuXG4gICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICBsaXN0ZW5lcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBwcm90by5lbWl0RXZlbnQgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBhcmdzKSB7XG4gICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50cyAmJiB0aGlzLl9ldmVudHNbZXZlbnROYW1lXTtcblxuICAgIGlmICghbGlzdGVuZXJzIHx8ICFsaXN0ZW5lcnMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBjb3B5IG92ZXIgdG8gYXZvaWQgaW50ZXJmZXJlbmNlIGlmIC5vZmYoKSBpbiBsaXN0ZW5lclxuXG5cbiAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuc2xpY2UoMCk7XG4gICAgYXJncyA9IGFyZ3MgfHwgW107IC8vIG9uY2Ugc3R1ZmZcblxuICAgIHZhciBvbmNlTGlzdGVuZXJzID0gdGhpcy5fb25jZUV2ZW50cyAmJiB0aGlzLl9vbmNlRXZlbnRzW2V2ZW50TmFtZV07XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGxpc3RlbmVyID0gbGlzdGVuZXJzW2ldO1xuICAgICAgdmFyIGlzT25jZSA9IG9uY2VMaXN0ZW5lcnMgJiYgb25jZUxpc3RlbmVyc1tsaXN0ZW5lcl07XG5cbiAgICAgIGlmIChpc09uY2UpIHtcbiAgICAgICAgLy8gcmVtb3ZlIGxpc3RlbmVyXG4gICAgICAgIC8vIHJlbW92ZSBiZWZvcmUgdHJpZ2dlciB0byBwcmV2ZW50IHJlY3Vyc2lvblxuICAgICAgICB0aGlzLm9mZihldmVudE5hbWUsIGxpc3RlbmVyKTsgLy8gdW5zZXQgb25jZSBmbGFnXG5cbiAgICAgICAgZGVsZXRlIG9uY2VMaXN0ZW5lcnNbbGlzdGVuZXJdO1xuICAgICAgfSAvLyB0cmlnZ2VyIGxpc3RlbmVyXG5cblxuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgcHJvdG8uYWxsT2ZmID0gZnVuY3Rpb24gKCkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHM7XG4gICAgZGVsZXRlIHRoaXMuX29uY2VFdmVudHM7XG4gIH07XG5cbiAgcmV0dXJuIEV2RW1pdHRlcjtcbn0pO1xuLyohXG4gKiBnZXRTaXplIHYyLjAuM1xuICogbWVhc3VyZSBzaXplIG9mIGVsZW1lbnRzXG4gKiBNSVQgbGljZW5zZVxuICovXG5cbi8qIGpzaGludCBicm93c2VyOiB0cnVlLCBzdHJpY3Q6IHRydWUsIHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cblxuLyogZ2xvYmFscyBjb25zb2xlOiBmYWxzZSAqL1xuXG5cbihmdW5jdGlvbiAod2luZG93LCBmYWN0b3J5KSB7XG4gIC8qIGpzaGludCBzdHJpY3Q6IGZhbHNlICovXG5cbiAgLyogZ2xvYmFscyBkZWZpbmUsIG1vZHVsZSAqL1xuICBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTURcbiAgICBkZWZpbmUoJ2dldC1zaXplL2dldC1zaXplJywgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBtb2R1bGUgPT09IFwidW5kZWZpbmVkXCIgPyBcInVuZGVmaW5lZFwiIDogX3R5cGVvZihtb2R1bGUpKSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gYnJvd3NlciBnbG9iYWxcbiAgICB3aW5kb3cuZ2V0U2l6ZSA9IGZhY3RvcnkoKTtcbiAgfVxufSkod2luZG93LCBmdW5jdGlvbiBmYWN0b3J5KCkge1xuICAndXNlIHN0cmljdCc7IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGhlbHBlcnMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cbiAgLy8gZ2V0IGEgbnVtYmVyIGZyb20gYSBzdHJpbmcsIG5vdCBhIHBlcmNlbnRhZ2VcblxuICBmdW5jdGlvbiBnZXRTdHlsZVNpemUodmFsdWUpIHtcbiAgICB2YXIgbnVtID0gcGFyc2VGbG9hdCh2YWx1ZSk7IC8vIG5vdCBhIHBlcmNlbnQgbGlrZSAnMTAwJScsIGFuZCBhIG51bWJlclxuXG4gICAgdmFyIGlzVmFsaWQgPSB2YWx1ZS5pbmRleE9mKCclJykgPT0gLTEgJiYgIWlzTmFOKG51bSk7XG4gICAgcmV0dXJuIGlzVmFsaWQgJiYgbnVtO1xuICB9XG5cbiAgZnVuY3Rpb24gbm9vcCgpIHt9XG5cbiAgdmFyIGxvZ0Vycm9yID0gdHlwZW9mIGNvbnNvbGUgPT0gJ3VuZGVmaW5lZCcgPyBub29wIDogZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICBjb25zb2xlLmVycm9yKG1lc3NhZ2UpO1xuICB9OyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBtZWFzdXJlbWVudHMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cblxuICB2YXIgbWVhc3VyZW1lbnRzID0gWydwYWRkaW5nTGVmdCcsICdwYWRkaW5nUmlnaHQnLCAncGFkZGluZ1RvcCcsICdwYWRkaW5nQm90dG9tJywgJ21hcmdpbkxlZnQnLCAnbWFyZ2luUmlnaHQnLCAnbWFyZ2luVG9wJywgJ21hcmdpbkJvdHRvbScsICdib3JkZXJMZWZ0V2lkdGgnLCAnYm9yZGVyUmlnaHRXaWR0aCcsICdib3JkZXJUb3BXaWR0aCcsICdib3JkZXJCb3R0b21XaWR0aCddO1xuICB2YXIgbWVhc3VyZW1lbnRzTGVuZ3RoID0gbWVhc3VyZW1lbnRzLmxlbmd0aDtcblxuICBmdW5jdGlvbiBnZXRaZXJvU2l6ZSgpIHtcbiAgICB2YXIgc2l6ZSA9IHtcbiAgICAgIHdpZHRoOiAwLFxuICAgICAgaGVpZ2h0OiAwLFxuICAgICAgaW5uZXJXaWR0aDogMCxcbiAgICAgIGlubmVySGVpZ2h0OiAwLFxuICAgICAgb3V0ZXJXaWR0aDogMCxcbiAgICAgIG91dGVySGVpZ2h0OiAwXG4gICAgfTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVhc3VyZW1lbnRzTGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBtZWFzdXJlbWVudCA9IG1lYXN1cmVtZW50c1tpXTtcbiAgICAgIHNpemVbbWVhc3VyZW1lbnRdID0gMDtcbiAgICB9XG5cbiAgICByZXR1cm4gc2l6ZTtcbiAgfSAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBnZXRTdHlsZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG4gIC8qKlxuICAgKiBnZXRTdHlsZSwgZ2V0IHN0eWxlIG9mIGVsZW1lbnQsIGNoZWNrIGZvciBGaXJlZm94IGJ1Z1xuICAgKiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD01NDgzOTdcbiAgICovXG5cblxuICBmdW5jdGlvbiBnZXRTdHlsZShlbGVtKSB7XG4gICAgdmFyIHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShlbGVtKTtcblxuICAgIGlmICghc3R5bGUpIHtcbiAgICAgIGxvZ0Vycm9yKCdTdHlsZSByZXR1cm5lZCAnICsgc3R5bGUgKyAnLiBBcmUgeW91IHJ1bm5pbmcgdGhpcyBjb2RlIGluIGEgaGlkZGVuIGlmcmFtZSBvbiBGaXJlZm94PyAnICsgJ1NlZSBodHRwczovL2JpdC5seS9nZXRzaXplYnVnMScpO1xuICAgIH1cblxuICAgIHJldHVybiBzdHlsZTtcbiAgfSAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBzZXR1cCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG5cbiAgdmFyIGlzU2V0dXAgPSBmYWxzZTtcbiAgdmFyIGlzQm94U2l6ZU91dGVyO1xuICAvKipcbiAgICogc2V0dXBcbiAgICogY2hlY2sgaXNCb3hTaXplck91dGVyXG4gICAqIGRvIG9uIGZpcnN0IGdldFNpemUoKSByYXRoZXIgdGhhbiBvbiBwYWdlIGxvYWQgZm9yIEZpcmVmb3ggYnVnXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHNldHVwKCkge1xuICAgIC8vIHNldHVwIG9uY2VcbiAgICBpZiAoaXNTZXR1cCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlzU2V0dXAgPSB0cnVlOyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBib3ggc2l6aW5nIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cbiAgICAvKipcbiAgICAgKiBDaHJvbWUgJiBTYWZhcmkgbWVhc3VyZSB0aGUgb3V0ZXItd2lkdGggb24gc3R5bGUud2lkdGggb24gYm9yZGVyLWJveCBlbGVtc1xuICAgICAqIElFMTEgJiBGaXJlZm94PDI5IG1lYXN1cmVzIHRoZSBpbm5lci13aWR0aFxuICAgICAqL1xuXG4gICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGRpdi5zdHlsZS53aWR0aCA9ICcyMDBweCc7XG4gICAgZGl2LnN0eWxlLnBhZGRpbmcgPSAnMXB4IDJweCAzcHggNHB4JztcbiAgICBkaXYuc3R5bGUuYm9yZGVyU3R5bGUgPSAnc29saWQnO1xuICAgIGRpdi5zdHlsZS5ib3JkZXJXaWR0aCA9ICcxcHggMnB4IDNweCA0cHgnO1xuICAgIGRpdi5zdHlsZS5ib3hTaXppbmcgPSAnYm9yZGVyLWJveCc7XG4gICAgdmFyIGJvZHkgPSBkb2N1bWVudC5ib2R5IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICBib2R5LmFwcGVuZENoaWxkKGRpdik7XG4gICAgdmFyIHN0eWxlID0gZ2V0U3R5bGUoZGl2KTsgLy8gcm91bmQgdmFsdWUgZm9yIGJyb3dzZXIgem9vbS4gZGVzYW5kcm8vbWFzb25yeSM5MjhcblxuICAgIGlzQm94U2l6ZU91dGVyID0gTWF0aC5yb3VuZChnZXRTdHlsZVNpemUoc3R5bGUud2lkdGgpKSA9PSAyMDA7XG4gICAgZ2V0U2l6ZS5pc0JveFNpemVPdXRlciA9IGlzQm94U2l6ZU91dGVyO1xuICAgIGJvZHkucmVtb3ZlQ2hpbGQoZGl2KTtcbiAgfSAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBnZXRTaXplIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cblxuICBmdW5jdGlvbiBnZXRTaXplKGVsZW0pIHtcbiAgICBzZXR1cCgpOyAvLyB1c2UgcXVlcnlTZWxldG9yIGlmIGVsZW0gaXMgc3RyaW5nXG5cbiAgICBpZiAodHlwZW9mIGVsZW0gPT0gJ3N0cmluZycpIHtcbiAgICAgIGVsZW0gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW0pO1xuICAgIH0gLy8gZG8gbm90IHByb2NlZWQgb24gbm9uLW9iamVjdHNcblxuXG4gICAgaWYgKCFlbGVtIHx8IF90eXBlb2YoZWxlbSkgIT0gJ29iamVjdCcgfHwgIWVsZW0ubm9kZVR5cGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3R5bGUgPSBnZXRTdHlsZShlbGVtKTsgLy8gaWYgaGlkZGVuLCBldmVyeXRoaW5nIGlzIDBcblxuICAgIGlmIChzdHlsZS5kaXNwbGF5ID09ICdub25lJykge1xuICAgICAgcmV0dXJuIGdldFplcm9TaXplKCk7XG4gICAgfVxuXG4gICAgdmFyIHNpemUgPSB7fTtcbiAgICBzaXplLndpZHRoID0gZWxlbS5vZmZzZXRXaWR0aDtcbiAgICBzaXplLmhlaWdodCA9IGVsZW0ub2Zmc2V0SGVpZ2h0O1xuICAgIHZhciBpc0JvcmRlckJveCA9IHNpemUuaXNCb3JkZXJCb3ggPSBzdHlsZS5ib3hTaXppbmcgPT0gJ2JvcmRlci1ib3gnOyAvLyBnZXQgYWxsIG1lYXN1cmVtZW50c1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZWFzdXJlbWVudHNMZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG1lYXN1cmVtZW50ID0gbWVhc3VyZW1lbnRzW2ldO1xuICAgICAgdmFyIHZhbHVlID0gc3R5bGVbbWVhc3VyZW1lbnRdO1xuICAgICAgdmFyIG51bSA9IHBhcnNlRmxvYXQodmFsdWUpOyAvLyBhbnkgJ2F1dG8nLCAnbWVkaXVtJyB2YWx1ZSB3aWxsIGJlIDBcblxuICAgICAgc2l6ZVttZWFzdXJlbWVudF0gPSAhaXNOYU4obnVtKSA/IG51bSA6IDA7XG4gICAgfVxuXG4gICAgdmFyIHBhZGRpbmdXaWR0aCA9IHNpemUucGFkZGluZ0xlZnQgKyBzaXplLnBhZGRpbmdSaWdodDtcbiAgICB2YXIgcGFkZGluZ0hlaWdodCA9IHNpemUucGFkZGluZ1RvcCArIHNpemUucGFkZGluZ0JvdHRvbTtcbiAgICB2YXIgbWFyZ2luV2lkdGggPSBzaXplLm1hcmdpbkxlZnQgKyBzaXplLm1hcmdpblJpZ2h0O1xuICAgIHZhciBtYXJnaW5IZWlnaHQgPSBzaXplLm1hcmdpblRvcCArIHNpemUubWFyZ2luQm90dG9tO1xuICAgIHZhciBib3JkZXJXaWR0aCA9IHNpemUuYm9yZGVyTGVmdFdpZHRoICsgc2l6ZS5ib3JkZXJSaWdodFdpZHRoO1xuICAgIHZhciBib3JkZXJIZWlnaHQgPSBzaXplLmJvcmRlclRvcFdpZHRoICsgc2l6ZS5ib3JkZXJCb3R0b21XaWR0aDtcbiAgICB2YXIgaXNCb3JkZXJCb3hTaXplT3V0ZXIgPSBpc0JvcmRlckJveCAmJiBpc0JveFNpemVPdXRlcjsgLy8gb3ZlcndyaXRlIHdpZHRoIGFuZCBoZWlnaHQgaWYgd2UgY2FuIGdldCBpdCBmcm9tIHN0eWxlXG5cbiAgICB2YXIgc3R5bGVXaWR0aCA9IGdldFN0eWxlU2l6ZShzdHlsZS53aWR0aCk7XG5cbiAgICBpZiAoc3R5bGVXaWR0aCAhPT0gZmFsc2UpIHtcbiAgICAgIHNpemUud2lkdGggPSBzdHlsZVdpZHRoICsgKCAvLyBhZGQgcGFkZGluZyBhbmQgYm9yZGVyIHVubGVzcyBpdCdzIGFscmVhZHkgaW5jbHVkaW5nIGl0XG4gICAgICBpc0JvcmRlckJveFNpemVPdXRlciA/IDAgOiBwYWRkaW5nV2lkdGggKyBib3JkZXJXaWR0aCk7XG4gICAgfVxuXG4gICAgdmFyIHN0eWxlSGVpZ2h0ID0gZ2V0U3R5bGVTaXplKHN0eWxlLmhlaWdodCk7XG5cbiAgICBpZiAoc3R5bGVIZWlnaHQgIT09IGZhbHNlKSB7XG4gICAgICBzaXplLmhlaWdodCA9IHN0eWxlSGVpZ2h0ICsgKCAvLyBhZGQgcGFkZGluZyBhbmQgYm9yZGVyIHVubGVzcyBpdCdzIGFscmVhZHkgaW5jbHVkaW5nIGl0XG4gICAgICBpc0JvcmRlckJveFNpemVPdXRlciA/IDAgOiBwYWRkaW5nSGVpZ2h0ICsgYm9yZGVySGVpZ2h0KTtcbiAgICB9XG5cbiAgICBzaXplLmlubmVyV2lkdGggPSBzaXplLndpZHRoIC0gKHBhZGRpbmdXaWR0aCArIGJvcmRlcldpZHRoKTtcbiAgICBzaXplLmlubmVySGVpZ2h0ID0gc2l6ZS5oZWlnaHQgLSAocGFkZGluZ0hlaWdodCArIGJvcmRlckhlaWdodCk7XG4gICAgc2l6ZS5vdXRlcldpZHRoID0gc2l6ZS53aWR0aCArIG1hcmdpbldpZHRoO1xuICAgIHNpemUub3V0ZXJIZWlnaHQgPSBzaXplLmhlaWdodCArIG1hcmdpbkhlaWdodDtcbiAgICByZXR1cm4gc2l6ZTtcbiAgfVxuXG4gIHJldHVybiBnZXRTaXplO1xufSk7XG4vKipcbiAqIG1hdGNoZXNTZWxlY3RvciB2Mi4wLjJcbiAqIG1hdGNoZXNTZWxlY3RvciggZWxlbWVudCwgJy5zZWxlY3RvcicgKVxuICogTUlUIGxpY2Vuc2VcbiAqL1xuXG4vKmpzaGludCBicm93c2VyOiB0cnVlLCBzdHJpY3Q6IHRydWUsIHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cblxuXG4oZnVuY3Rpb24gKHdpbmRvdywgZmFjdG9yeSkge1xuICAvKmdsb2JhbCBkZWZpbmU6IGZhbHNlLCBtb2R1bGU6IGZhbHNlICovXG4gICd1c2Ugc3RyaWN0JzsgLy8gdW5pdmVyc2FsIG1vZHVsZSBkZWZpbml0aW9uXG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EXG4gICAgZGVmaW5lKCdkZXNhbmRyby1tYXRjaGVzLXNlbGVjdG9yL21hdGNoZXMtc2VsZWN0b3InLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIG1vZHVsZSA9PT0gXCJ1bmRlZmluZWRcIiA/IFwidW5kZWZpbmVkXCIgOiBfdHlwZW9mKG1vZHVsZSkpID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBicm93c2VyIGdsb2JhbFxuICAgIHdpbmRvdy5tYXRjaGVzU2VsZWN0b3IgPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHdpbmRvdywgZnVuY3Rpb24gZmFjdG9yeSgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBtYXRjaGVzTWV0aG9kID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBFbGVtUHJvdG8gPSB3aW5kb3cuRWxlbWVudC5wcm90b3R5cGU7IC8vIGNoZWNrIGZvciB0aGUgc3RhbmRhcmQgbWV0aG9kIG5hbWUgZmlyc3RcblxuICAgIGlmIChFbGVtUHJvdG8ubWF0Y2hlcykge1xuICAgICAgcmV0dXJuICdtYXRjaGVzJztcbiAgICB9IC8vIGNoZWNrIHVuLXByZWZpeGVkXG5cblxuICAgIGlmIChFbGVtUHJvdG8ubWF0Y2hlc1NlbGVjdG9yKSB7XG4gICAgICByZXR1cm4gJ21hdGNoZXNTZWxlY3Rvcic7XG4gICAgfSAvLyBjaGVjayB2ZW5kb3IgcHJlZml4ZXNcblxuXG4gICAgdmFyIHByZWZpeGVzID0gWyd3ZWJraXQnLCAnbW96JywgJ21zJywgJ28nXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJlZml4ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBwcmVmaXggPSBwcmVmaXhlc1tpXTtcbiAgICAgIHZhciBtZXRob2QgPSBwcmVmaXggKyAnTWF0Y2hlc1NlbGVjdG9yJztcblxuICAgICAgaWYgKEVsZW1Qcm90b1ttZXRob2RdKSB7XG4gICAgICAgIHJldHVybiBtZXRob2Q7XG4gICAgICB9XG4gICAgfVxuICB9KCk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIG1hdGNoZXNTZWxlY3RvcihlbGVtLCBzZWxlY3Rvcikge1xuICAgIHJldHVybiBlbGVtW21hdGNoZXNNZXRob2RdKHNlbGVjdG9yKTtcbiAgfTtcbn0pO1xuLyoqXG4gKiBGaXp6eSBVSSB1dGlscyB2Mi4wLjdcbiAqIE1JVCBsaWNlbnNlXG4gKi9cblxuLypqc2hpbnQgYnJvd3NlcjogdHJ1ZSwgdW5kZWY6IHRydWUsIHVudXNlZDogdHJ1ZSwgc3RyaWN0OiB0cnVlICovXG5cblxuKGZ1bmN0aW9uICh3aW5kb3csIGZhY3RvcnkpIHtcbiAgLy8gdW5pdmVyc2FsIG1vZHVsZSBkZWZpbml0aW9uXG5cbiAgLypqc2hpbnQgc3RyaWN0OiBmYWxzZSAqL1xuXG4gIC8qZ2xvYmFscyBkZWZpbmUsIG1vZHVsZSwgcmVxdWlyZSAqL1xuICBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTURcbiAgICBkZWZpbmUoJ2Zpenp5LXVpLXV0aWxzL3V0aWxzJywgWydkZXNhbmRyby1tYXRjaGVzLXNlbGVjdG9yL21hdGNoZXMtc2VsZWN0b3InXSwgZnVuY3Rpb24gKG1hdGNoZXNTZWxlY3Rvcikge1xuICAgICAgcmV0dXJuIGZhY3Rvcnkod2luZG93LCBtYXRjaGVzU2VsZWN0b3IpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgbW9kdWxlID09PSBcInVuZGVmaW5lZFwiID8gXCJ1bmRlZmluZWRcIiA6IF90eXBlb2YobW9kdWxlKSkgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSh3aW5kb3csIHJlcXVpcmUoJ2Rlc2FuZHJvLW1hdGNoZXMtc2VsZWN0b3InKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gYnJvd3NlciBnbG9iYWxcbiAgICB3aW5kb3cuZml6enlVSVV0aWxzID0gZmFjdG9yeSh3aW5kb3csIHdpbmRvdy5tYXRjaGVzU2VsZWN0b3IpO1xuICB9XG59KSh3aW5kb3csIGZ1bmN0aW9uIGZhY3Rvcnkod2luZG93LCBtYXRjaGVzU2VsZWN0b3IpIHtcbiAgdmFyIHV0aWxzID0ge307IC8vIC0tLS0tIGV4dGVuZCAtLS0tLSAvL1xuICAvLyBleHRlbmRzIG9iamVjdHNcblxuICB1dGlscy5leHRlbmQgPSBmdW5jdGlvbiAoYSwgYikge1xuICAgIGZvciAodmFyIHByb3AgaW4gYikge1xuICAgICAgYVtwcm9wXSA9IGJbcHJvcF07XG4gICAgfVxuXG4gICAgcmV0dXJuIGE7XG4gIH07IC8vIC0tLS0tIG1vZHVsbyAtLS0tLSAvL1xuXG5cbiAgdXRpbHMubW9kdWxvID0gZnVuY3Rpb24gKG51bSwgZGl2KSB7XG4gICAgcmV0dXJuIChudW0gJSBkaXYgKyBkaXYpICUgZGl2O1xuICB9OyAvLyAtLS0tLSBtYWtlQXJyYXkgLS0tLS0gLy9cblxuXG4gIHZhciBhcnJheVNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlOyAvLyB0dXJuIGVsZW1lbnQgb3Igbm9kZUxpc3QgaW50byBhbiBhcnJheVxuXG4gIHV0aWxzLm1ha2VBcnJheSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopKSB7XG4gICAgICAvLyB1c2Ugb2JqZWN0IGlmIGFscmVhZHkgYW4gYXJyYXlcbiAgICAgIHJldHVybiBvYmo7XG4gICAgfSAvLyByZXR1cm4gZW1wdHkgYXJyYXkgaWYgdW5kZWZpbmVkIG9yIG51bGwuICM2XG5cblxuICAgIGlmIChvYmogPT09IG51bGwgfHwgb2JqID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICB2YXIgaXNBcnJheUxpa2UgPSBfdHlwZW9mKG9iaikgPT0gJ29iamVjdCcgJiYgdHlwZW9mIG9iai5sZW5ndGggPT0gJ251bWJlcic7XG5cbiAgICBpZiAoaXNBcnJheUxpa2UpIHtcbiAgICAgIC8vIGNvbnZlcnQgbm9kZUxpc3QgdG8gYXJyYXlcbiAgICAgIHJldHVybiBhcnJheVNsaWNlLmNhbGwob2JqKTtcbiAgICB9IC8vIGFycmF5IG9mIHNpbmdsZSBpbmRleFxuXG5cbiAgICByZXR1cm4gW29ial07XG4gIH07IC8vIC0tLS0tIHJlbW92ZUZyb20gLS0tLS0gLy9cblxuXG4gIHV0aWxzLnJlbW92ZUZyb20gPSBmdW5jdGlvbiAoYXJ5LCBvYmopIHtcbiAgICB2YXIgaW5kZXggPSBhcnkuaW5kZXhPZihvYmopO1xuXG4gICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICBhcnkuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG4gIH07IC8vIC0tLS0tIGdldFBhcmVudCAtLS0tLSAvL1xuXG5cbiAgdXRpbHMuZ2V0UGFyZW50ID0gZnVuY3Rpb24gKGVsZW0sIHNlbGVjdG9yKSB7XG4gICAgd2hpbGUgKGVsZW0ucGFyZW50Tm9kZSAmJiBlbGVtICE9IGRvY3VtZW50LmJvZHkpIHtcbiAgICAgIGVsZW0gPSBlbGVtLnBhcmVudE5vZGU7XG5cbiAgICAgIGlmIChtYXRjaGVzU2VsZWN0b3IoZWxlbSwgc2VsZWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBlbGVtO1xuICAgICAgfVxuICAgIH1cbiAgfTsgLy8gLS0tLS0gZ2V0UXVlcnlFbGVtZW50IC0tLS0tIC8vXG4gIC8vIHVzZSBlbGVtZW50IGFzIHNlbGVjdG9yIHN0cmluZ1xuXG5cbiAgdXRpbHMuZ2V0UXVlcnlFbGVtZW50ID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICBpZiAodHlwZW9mIGVsZW0gPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW0pO1xuICAgIH1cblxuICAgIHJldHVybiBlbGVtO1xuICB9OyAvLyAtLS0tLSBoYW5kbGVFdmVudCAtLS0tLSAvL1xuICAvLyBlbmFibGUgLm9udHlwZSB0byB0cmlnZ2VyIGZyb20gLmFkZEV2ZW50TGlzdGVuZXIoIGVsZW0sICd0eXBlJyApXG5cblxuICB1dGlscy5oYW5kbGVFdmVudCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciBtZXRob2QgPSAnb24nICsgZXZlbnQudHlwZTtcblxuICAgIGlmICh0aGlzW21ldGhvZF0pIHtcbiAgICAgIHRoaXNbbWV0aG9kXShldmVudCk7XG4gICAgfVxuICB9OyAvLyAtLS0tLSBmaWx0ZXJGaW5kRWxlbWVudHMgLS0tLS0gLy9cblxuXG4gIHV0aWxzLmZpbHRlckZpbmRFbGVtZW50cyA9IGZ1bmN0aW9uIChlbGVtcywgc2VsZWN0b3IpIHtcbiAgICAvLyBtYWtlIGFycmF5IG9mIGVsZW1zXG4gICAgZWxlbXMgPSB1dGlscy5tYWtlQXJyYXkoZWxlbXMpO1xuICAgIHZhciBmZkVsZW1zID0gW107XG4gICAgZWxlbXMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgLy8gY2hlY2sgdGhhdCBlbGVtIGlzIGFuIGFjdHVhbCBlbGVtZW50XG4gICAgICBpZiAoIShlbGVtIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gLy8gYWRkIGVsZW0gaWYgbm8gc2VsZWN0b3JcblxuXG4gICAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICAgIGZmRWxlbXMucHVzaChlbGVtKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSAvLyBmaWx0ZXIgJiBmaW5kIGl0ZW1zIGlmIHdlIGhhdmUgYSBzZWxlY3RvclxuICAgICAgLy8gZmlsdGVyXG5cblxuICAgICAgaWYgKG1hdGNoZXNTZWxlY3RvcihlbGVtLCBzZWxlY3RvcikpIHtcbiAgICAgICAgZmZFbGVtcy5wdXNoKGVsZW0pO1xuICAgICAgfSAvLyBmaW5kIGNoaWxkcmVuXG5cblxuICAgICAgdmFyIGNoaWxkRWxlbXMgPSBlbGVtLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpOyAvLyBjb25jYXQgY2hpbGRFbGVtcyB0byBmaWx0ZXJGb3VuZCBhcnJheVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkRWxlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZmZFbGVtcy5wdXNoKGNoaWxkRWxlbXNbaV0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBmZkVsZW1zO1xuICB9OyAvLyAtLS0tLSBkZWJvdW5jZU1ldGhvZCAtLS0tLSAvL1xuXG5cbiAgdXRpbHMuZGVib3VuY2VNZXRob2QgPSBmdW5jdGlvbiAoX2NsYXNzLCBtZXRob2ROYW1lLCB0aHJlc2hvbGQpIHtcbiAgICB0aHJlc2hvbGQgPSB0aHJlc2hvbGQgfHwgMTAwOyAvLyBvcmlnaW5hbCBtZXRob2RcblxuICAgIHZhciBtZXRob2QgPSBfY2xhc3MucHJvdG90eXBlW21ldGhvZE5hbWVdO1xuICAgIHZhciB0aW1lb3V0TmFtZSA9IG1ldGhvZE5hbWUgKyAnVGltZW91dCc7XG5cbiAgICBfY2xhc3MucHJvdG90eXBlW21ldGhvZE5hbWVdID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHRpbWVvdXQgPSB0aGlzW3RpbWVvdXROYW1lXTtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICB0aGlzW3RpbWVvdXROYW1lXSA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICBtZXRob2QuYXBwbHkoX3RoaXMsIGFyZ3MpO1xuICAgICAgICBkZWxldGUgX3RoaXNbdGltZW91dE5hbWVdO1xuICAgICAgfSwgdGhyZXNob2xkKTtcbiAgICB9O1xuICB9OyAvLyAtLS0tLSBkb2NSZWFkeSAtLS0tLSAvL1xuXG5cbiAgdXRpbHMuZG9jUmVhZHkgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB2YXIgcmVhZHlTdGF0ZSA9IGRvY3VtZW50LnJlYWR5U3RhdGU7XG5cbiAgICBpZiAocmVhZHlTdGF0ZSA9PSAnY29tcGxldGUnIHx8IHJlYWR5U3RhdGUgPT0gJ2ludGVyYWN0aXZlJykge1xuICAgICAgLy8gZG8gYXN5bmMgdG8gYWxsb3cgZm9yIG90aGVyIHNjcmlwdHMgdG8gcnVuLiBtZXRhZml6enkvZmxpY2tpdHkjNDQxXG4gICAgICBzZXRUaW1lb3V0KGNhbGxiYWNrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGNhbGxiYWNrKTtcbiAgICB9XG4gIH07IC8vIC0tLS0tIGh0bWxJbml0IC0tLS0tIC8vXG4gIC8vIGh0dHA6Ly9qYW1lc3JvYmVydHMubmFtZS9ibG9nLzIwMTAvMDIvMjIvc3RyaW5nLWZ1bmN0aW9ucy1mb3ItamF2YXNjcmlwdC10cmltLXRvLWNhbWVsLWNhc2UtdG8tZGFzaGVkLWFuZC10by11bmRlcnNjb3JlL1xuXG5cbiAgdXRpbHMudG9EYXNoZWQgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oLikoW0EtWl0pL2csIGZ1bmN0aW9uIChtYXRjaCwgJDEsICQyKSB7XG4gICAgICByZXR1cm4gJDEgKyAnLScgKyAkMjtcbiAgICB9KS50b0xvd2VyQ2FzZSgpO1xuICB9O1xuXG4gIHZhciBjb25zb2xlID0gd2luZG93LmNvbnNvbGU7XG4gIC8qKlxuICAgKiBhbGxvdyB1c2VyIHRvIGluaXRpYWxpemUgY2xhc3NlcyB2aWEgW2RhdGEtbmFtZXNwYWNlXSBvciAuanMtbmFtZXNwYWNlIGNsYXNzXG4gICAqIGh0bWxJbml0KCBXaWRnZXQsICd3aWRnZXROYW1lJyApXG4gICAqIG9wdGlvbnMgYXJlIHBhcnNlZCBmcm9tIGRhdGEtbmFtZXNwYWNlLW9wdGlvbnNcbiAgICovXG5cbiAgdXRpbHMuaHRtbEluaXQgPSBmdW5jdGlvbiAoV2lkZ2V0Q2xhc3MsIG5hbWVzcGFjZSkge1xuICAgIHV0aWxzLmRvY1JlYWR5KGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBkYXNoZWROYW1lc3BhY2UgPSB1dGlscy50b0Rhc2hlZChuYW1lc3BhY2UpO1xuICAgICAgdmFyIGRhdGFBdHRyID0gJ2RhdGEtJyArIGRhc2hlZE5hbWVzcGFjZTtcbiAgICAgIHZhciBkYXRhQXR0ckVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnWycgKyBkYXRhQXR0ciArICddJyk7XG4gICAgICB2YXIganNEYXNoRWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuanMtJyArIGRhc2hlZE5hbWVzcGFjZSk7XG4gICAgICB2YXIgZWxlbXMgPSB1dGlscy5tYWtlQXJyYXkoZGF0YUF0dHJFbGVtcykuY29uY2F0KHV0aWxzLm1ha2VBcnJheShqc0Rhc2hFbGVtcykpO1xuICAgICAgdmFyIGRhdGFPcHRpb25zQXR0ciA9IGRhdGFBdHRyICsgJy1vcHRpb25zJztcbiAgICAgIHZhciBqUXVlcnkgPSB3aW5kb3cualF1ZXJ5O1xuICAgICAgZWxlbXMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICB2YXIgYXR0ciA9IGVsZW0uZ2V0QXR0cmlidXRlKGRhdGFBdHRyKSB8fCBlbGVtLmdldEF0dHJpYnV0ZShkYXRhT3B0aW9uc0F0dHIpO1xuICAgICAgICB2YXIgb3B0aW9ucztcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIG9wdGlvbnMgPSBhdHRyICYmIEpTT04ucGFyc2UoYXR0cik7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgLy8gbG9nIGVycm9yLCBkbyBub3QgaW5pdGlhbGl6ZVxuICAgICAgICAgIGlmIChjb25zb2xlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBwYXJzaW5nICcgKyBkYXRhQXR0ciArICcgb24gJyArIGVsZW0uY2xhc3NOYW1lICsgJzogJyArIGVycm9yKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gLy8gaW5pdGlhbGl6ZVxuXG5cbiAgICAgICAgdmFyIGluc3RhbmNlID0gbmV3IFdpZGdldENsYXNzKGVsZW0sIG9wdGlvbnMpOyAvLyBtYWtlIGF2YWlsYWJsZSB2aWEgJCgpLmRhdGEoJ25hbWVzcGFjZScpXG5cbiAgICAgICAgaWYgKGpRdWVyeSkge1xuICAgICAgICAgIGpRdWVyeS5kYXRhKGVsZW0sIG5hbWVzcGFjZSwgaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTsgLy8gLS0tLS0gIC0tLS0tIC8vXG5cblxuICByZXR1cm4gdXRpbHM7XG59KTtcbi8qKlxuICogT3V0bGF5ZXIgSXRlbVxuICovXG5cblxuKGZ1bmN0aW9uICh3aW5kb3csIGZhY3RvcnkpIHtcbiAgLy8gdW5pdmVyc2FsIG1vZHVsZSBkZWZpbml0aW9uXG5cbiAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cblxuICAvKiBnbG9iYWxzIGRlZmluZSwgbW9kdWxlLCByZXF1aXJlICovXG4gIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRCAtIFJlcXVpcmVKU1xuICAgIGRlZmluZSgnb3V0bGF5ZXIvaXRlbScsIFsnZXYtZW1pdHRlci9ldi1lbWl0dGVyJywgJ2dldC1zaXplL2dldC1zaXplJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgbW9kdWxlID09PSBcInVuZGVmaW5lZFwiID8gXCJ1bmRlZmluZWRcIiA6IF90eXBlb2YobW9kdWxlKSkgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUyAtIEJyb3dzZXJpZnksIFdlYnBhY2tcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnZXYtZW1pdHRlcicpLCByZXF1aXJlKCdnZXQtc2l6ZScpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBicm93c2VyIGdsb2JhbFxuICAgIHdpbmRvdy5PdXRsYXllciA9IHt9O1xuICAgIHdpbmRvdy5PdXRsYXllci5JdGVtID0gZmFjdG9yeSh3aW5kb3cuRXZFbWl0dGVyLCB3aW5kb3cuZ2V0U2l6ZSk7XG4gIH1cbn0pKHdpbmRvdywgZnVuY3Rpb24gZmFjdG9yeShFdkVtaXR0ZXIsIGdldFNpemUpIHtcbiAgJ3VzZSBzdHJpY3QnOyAvLyAtLS0tLSBoZWxwZXJzIC0tLS0tIC8vXG5cbiAgZnVuY3Rpb24gaXNFbXB0eU9iaihvYmopIHtcbiAgICBmb3IgKHZhciBwcm9wIGluIG9iaikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHByb3AgPSBudWxsO1xuICAgIHJldHVybiB0cnVlO1xuICB9IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIENTUzMgc3VwcG9ydCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG5cbiAgdmFyIGRvY0VsZW1TdHlsZSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZTtcbiAgdmFyIHRyYW5zaXRpb25Qcm9wZXJ0eSA9IHR5cGVvZiBkb2NFbGVtU3R5bGUudHJhbnNpdGlvbiA9PSAnc3RyaW5nJyA/ICd0cmFuc2l0aW9uJyA6ICdXZWJraXRUcmFuc2l0aW9uJztcbiAgdmFyIHRyYW5zZm9ybVByb3BlcnR5ID0gdHlwZW9mIGRvY0VsZW1TdHlsZS50cmFuc2Zvcm0gPT0gJ3N0cmluZycgPyAndHJhbnNmb3JtJyA6ICdXZWJraXRUcmFuc2Zvcm0nO1xuICB2YXIgdHJhbnNpdGlvbkVuZEV2ZW50ID0ge1xuICAgIFdlYmtpdFRyYW5zaXRpb246ICd3ZWJraXRUcmFuc2l0aW9uRW5kJyxcbiAgICB0cmFuc2l0aW9uOiAndHJhbnNpdGlvbmVuZCdcbiAgfVt0cmFuc2l0aW9uUHJvcGVydHldOyAvLyBjYWNoZSBhbGwgdmVuZG9yIHByb3BlcnRpZXMgdGhhdCBjb3VsZCBoYXZlIHZlbmRvciBwcmVmaXhcblxuICB2YXIgdmVuZG9yUHJvcGVydGllcyA9IHtcbiAgICB0cmFuc2Zvcm06IHRyYW5zZm9ybVByb3BlcnR5LFxuICAgIHRyYW5zaXRpb246IHRyYW5zaXRpb25Qcm9wZXJ0eSxcbiAgICB0cmFuc2l0aW9uRHVyYXRpb246IHRyYW5zaXRpb25Qcm9wZXJ0eSArICdEdXJhdGlvbicsXG4gICAgdHJhbnNpdGlvblByb3BlcnR5OiB0cmFuc2l0aW9uUHJvcGVydHkgKyAnUHJvcGVydHknLFxuICAgIHRyYW5zaXRpb25EZWxheTogdHJhbnNpdGlvblByb3BlcnR5ICsgJ0RlbGF5J1xuICB9OyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBJdGVtIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cbiAgZnVuY3Rpb24gSXRlbShlbGVtZW50LCBsYXlvdXQpIHtcbiAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50OyAvLyBwYXJlbnQgbGF5b3V0IGNsYXNzLCBpLmUuIE1hc29ucnksIElzb3RvcGUsIG9yIFBhY2tlcnlcblxuICAgIHRoaXMubGF5b3V0ID0gbGF5b3V0O1xuICAgIHRoaXMucG9zaXRpb24gPSB7XG4gICAgICB4OiAwLFxuICAgICAgeTogMFxuICAgIH07XG5cbiAgICB0aGlzLl9jcmVhdGUoKTtcbiAgfSAvLyBpbmhlcml0IEV2RW1pdHRlclxuXG5cbiAgdmFyIHByb3RvID0gSXRlbS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2RW1pdHRlci5wcm90b3R5cGUpO1xuICBwcm90by5jb25zdHJ1Y3RvciA9IEl0ZW07XG5cbiAgcHJvdG8uX2NyZWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyB0cmFuc2l0aW9uIG9iamVjdHNcbiAgICB0aGlzLl90cmFuc24gPSB7XG4gICAgICBpbmdQcm9wZXJ0aWVzOiB7fSxcbiAgICAgIGNsZWFuOiB7fSxcbiAgICAgIG9uRW5kOiB7fVxuICAgIH07XG4gICAgdGhpcy5jc3Moe1xuICAgICAgcG9zaXRpb246ICdhYnNvbHV0ZSdcbiAgICB9KTtcbiAgfTsgLy8gdHJpZ2dlciBzcGVjaWZpZWQgaGFuZGxlciBmb3IgZXZlbnQgdHlwZVxuXG5cbiAgcHJvdG8uaGFuZGxlRXZlbnQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgbWV0aG9kID0gJ29uJyArIGV2ZW50LnR5cGU7XG5cbiAgICBpZiAodGhpc1ttZXRob2RdKSB7XG4gICAgICB0aGlzW21ldGhvZF0oZXZlbnQpO1xuICAgIH1cbiAgfTtcblxuICBwcm90by5nZXRTaXplID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2l6ZSA9IGdldFNpemUodGhpcy5lbGVtZW50KTtcbiAgfTtcbiAgLyoqXG4gICAqIGFwcGx5IENTUyBzdHlsZXMgdG8gZWxlbWVudFxuICAgKiBAcGFyYW0ge09iamVjdH0gc3R5bGVcbiAgICovXG5cblxuICBwcm90by5jc3MgPSBmdW5jdGlvbiAoc3R5bGUpIHtcbiAgICB2YXIgZWxlbVN0eWxlID0gdGhpcy5lbGVtZW50LnN0eWxlO1xuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBzdHlsZSkge1xuICAgICAgLy8gdXNlIHZlbmRvciBwcm9wZXJ0eSBpZiBhdmFpbGFibGVcbiAgICAgIHZhciBzdXBwb3J0ZWRQcm9wID0gdmVuZG9yUHJvcGVydGllc1twcm9wXSB8fCBwcm9wO1xuICAgICAgZWxlbVN0eWxlW3N1cHBvcnRlZFByb3BdID0gc3R5bGVbcHJvcF07XG4gICAgfVxuICB9OyAvLyBtZWFzdXJlIHBvc2l0aW9uLCBhbmQgc2V0cyBpdFxuXG5cbiAgcHJvdG8uZ2V0UG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmVsZW1lbnQpO1xuXG4gICAgdmFyIGlzT3JpZ2luTGVmdCA9IHRoaXMubGF5b3V0Ll9nZXRPcHRpb24oJ29yaWdpbkxlZnQnKTtcblxuICAgIHZhciBpc09yaWdpblRvcCA9IHRoaXMubGF5b3V0Ll9nZXRPcHRpb24oJ29yaWdpblRvcCcpO1xuXG4gICAgdmFyIHhWYWx1ZSA9IHN0eWxlW2lzT3JpZ2luTGVmdCA/ICdsZWZ0JyA6ICdyaWdodCddO1xuICAgIHZhciB5VmFsdWUgPSBzdHlsZVtpc09yaWdpblRvcCA/ICd0b3AnIDogJ2JvdHRvbSddO1xuICAgIHZhciB4ID0gcGFyc2VGbG9hdCh4VmFsdWUpO1xuICAgIHZhciB5ID0gcGFyc2VGbG9hdCh5VmFsdWUpOyAvLyBjb252ZXJ0IHBlcmNlbnQgdG8gcGl4ZWxzXG5cbiAgICB2YXIgbGF5b3V0U2l6ZSA9IHRoaXMubGF5b3V0LnNpemU7XG5cbiAgICBpZiAoeFZhbHVlLmluZGV4T2YoJyUnKSAhPSAtMSkge1xuICAgICAgeCA9IHggLyAxMDAgKiBsYXlvdXRTaXplLndpZHRoO1xuICAgIH1cblxuICAgIGlmICh5VmFsdWUuaW5kZXhPZignJScpICE9IC0xKSB7XG4gICAgICB5ID0geSAvIDEwMCAqIGxheW91dFNpemUuaGVpZ2h0O1xuICAgIH0gLy8gY2xlYW4gdXAgJ2F1dG8nIG9yIG90aGVyIG5vbi1pbnRlZ2VyIHZhbHVlc1xuXG5cbiAgICB4ID0gaXNOYU4oeCkgPyAwIDogeDtcbiAgICB5ID0gaXNOYU4oeSkgPyAwIDogeTsgLy8gcmVtb3ZlIHBhZGRpbmcgZnJvbSBtZWFzdXJlbWVudFxuXG4gICAgeCAtPSBpc09yaWdpbkxlZnQgPyBsYXlvdXRTaXplLnBhZGRpbmdMZWZ0IDogbGF5b3V0U2l6ZS5wYWRkaW5nUmlnaHQ7XG4gICAgeSAtPSBpc09yaWdpblRvcCA/IGxheW91dFNpemUucGFkZGluZ1RvcCA6IGxheW91dFNpemUucGFkZGluZ0JvdHRvbTtcbiAgICB0aGlzLnBvc2l0aW9uLnggPSB4O1xuICAgIHRoaXMucG9zaXRpb24ueSA9IHk7XG4gIH07IC8vIHNldCBzZXR0bGVkIHBvc2l0aW9uLCBhcHBseSBwYWRkaW5nXG5cblxuICBwcm90by5sYXlvdXRQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbGF5b3V0U2l6ZSA9IHRoaXMubGF5b3V0LnNpemU7XG4gICAgdmFyIHN0eWxlID0ge307XG5cbiAgICB2YXIgaXNPcmlnaW5MZWZ0ID0gdGhpcy5sYXlvdXQuX2dldE9wdGlvbignb3JpZ2luTGVmdCcpO1xuXG4gICAgdmFyIGlzT3JpZ2luVG9wID0gdGhpcy5sYXlvdXQuX2dldE9wdGlvbignb3JpZ2luVG9wJyk7IC8vIHhcblxuXG4gICAgdmFyIHhQYWRkaW5nID0gaXNPcmlnaW5MZWZ0ID8gJ3BhZGRpbmdMZWZ0JyA6ICdwYWRkaW5nUmlnaHQnO1xuICAgIHZhciB4UHJvcGVydHkgPSBpc09yaWdpbkxlZnQgPyAnbGVmdCcgOiAncmlnaHQnO1xuICAgIHZhciB4UmVzZXRQcm9wZXJ0eSA9IGlzT3JpZ2luTGVmdCA/ICdyaWdodCcgOiAnbGVmdCc7XG4gICAgdmFyIHggPSB0aGlzLnBvc2l0aW9uLnggKyBsYXlvdXRTaXplW3hQYWRkaW5nXTsgLy8gc2V0IGluIHBlcmNlbnRhZ2Ugb3IgcGl4ZWxzXG5cbiAgICBzdHlsZVt4UHJvcGVydHldID0gdGhpcy5nZXRYVmFsdWUoeCk7IC8vIHJlc2V0IG90aGVyIHByb3BlcnR5XG5cbiAgICBzdHlsZVt4UmVzZXRQcm9wZXJ0eV0gPSAnJzsgLy8geVxuXG4gICAgdmFyIHlQYWRkaW5nID0gaXNPcmlnaW5Ub3AgPyAncGFkZGluZ1RvcCcgOiAncGFkZGluZ0JvdHRvbSc7XG4gICAgdmFyIHlQcm9wZXJ0eSA9IGlzT3JpZ2luVG9wID8gJ3RvcCcgOiAnYm90dG9tJztcbiAgICB2YXIgeVJlc2V0UHJvcGVydHkgPSBpc09yaWdpblRvcCA/ICdib3R0b20nIDogJ3RvcCc7XG4gICAgdmFyIHkgPSB0aGlzLnBvc2l0aW9uLnkgKyBsYXlvdXRTaXplW3lQYWRkaW5nXTsgLy8gc2V0IGluIHBlcmNlbnRhZ2Ugb3IgcGl4ZWxzXG5cbiAgICBzdHlsZVt5UHJvcGVydHldID0gdGhpcy5nZXRZVmFsdWUoeSk7IC8vIHJlc2V0IG90aGVyIHByb3BlcnR5XG5cbiAgICBzdHlsZVt5UmVzZXRQcm9wZXJ0eV0gPSAnJztcbiAgICB0aGlzLmNzcyhzdHlsZSk7XG4gICAgdGhpcy5lbWl0RXZlbnQoJ2xheW91dCcsIFt0aGlzXSk7XG4gIH07XG5cbiAgcHJvdG8uZ2V0WFZhbHVlID0gZnVuY3Rpb24gKHgpIHtcbiAgICB2YXIgaXNIb3Jpem9udGFsID0gdGhpcy5sYXlvdXQuX2dldE9wdGlvbignaG9yaXpvbnRhbCcpO1xuXG4gICAgcmV0dXJuIHRoaXMubGF5b3V0Lm9wdGlvbnMucGVyY2VudFBvc2l0aW9uICYmICFpc0hvcml6b250YWwgPyB4IC8gdGhpcy5sYXlvdXQuc2l6ZS53aWR0aCAqIDEwMCArICclJyA6IHggKyAncHgnO1xuICB9O1xuXG4gIHByb3RvLmdldFlWYWx1ZSA9IGZ1bmN0aW9uICh5KSB7XG4gICAgdmFyIGlzSG9yaXpvbnRhbCA9IHRoaXMubGF5b3V0Ll9nZXRPcHRpb24oJ2hvcml6b250YWwnKTtcblxuICAgIHJldHVybiB0aGlzLmxheW91dC5vcHRpb25zLnBlcmNlbnRQb3NpdGlvbiAmJiBpc0hvcml6b250YWwgPyB5IC8gdGhpcy5sYXlvdXQuc2l6ZS5oZWlnaHQgKiAxMDAgKyAnJScgOiB5ICsgJ3B4JztcbiAgfTtcblxuICBwcm90by5fdHJhbnNpdGlvblRvID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICB0aGlzLmdldFBvc2l0aW9uKCk7IC8vIGdldCBjdXJyZW50IHggJiB5IGZyb20gdG9wL2xlZnRcblxuICAgIHZhciBjdXJYID0gdGhpcy5wb3NpdGlvbi54O1xuICAgIHZhciBjdXJZID0gdGhpcy5wb3NpdGlvbi55O1xuICAgIHZhciBkaWROb3RNb3ZlID0geCA9PSB0aGlzLnBvc2l0aW9uLnggJiYgeSA9PSB0aGlzLnBvc2l0aW9uLnk7IC8vIHNhdmUgZW5kIHBvc2l0aW9uXG5cbiAgICB0aGlzLnNldFBvc2l0aW9uKHgsIHkpOyAvLyBpZiBkaWQgbm90IG1vdmUgYW5kIG5vdCB0cmFuc2l0aW9uaW5nLCBqdXN0IGdvIHRvIGxheW91dFxuXG4gICAgaWYgKGRpZE5vdE1vdmUgJiYgIXRoaXMuaXNUcmFuc2l0aW9uaW5nKSB7XG4gICAgICB0aGlzLmxheW91dFBvc2l0aW9uKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHRyYW5zWCA9IHggLSBjdXJYO1xuICAgIHZhciB0cmFuc1kgPSB5IC0gY3VyWTtcbiAgICB2YXIgdHJhbnNpdGlvblN0eWxlID0ge307XG4gICAgdHJhbnNpdGlvblN0eWxlLnRyYW5zZm9ybSA9IHRoaXMuZ2V0VHJhbnNsYXRlKHRyYW5zWCwgdHJhbnNZKTtcbiAgICB0aGlzLnRyYW5zaXRpb24oe1xuICAgICAgdG86IHRyYW5zaXRpb25TdHlsZSxcbiAgICAgIG9uVHJhbnNpdGlvbkVuZDoge1xuICAgICAgICB0cmFuc2Zvcm06IHRoaXMubGF5b3V0UG9zaXRpb25cbiAgICAgIH0sXG4gICAgICBpc0NsZWFuaW5nOiB0cnVlXG4gICAgfSk7XG4gIH07XG5cbiAgcHJvdG8uZ2V0VHJhbnNsYXRlID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAvLyBmbGlwIGNvb3JpZGluYXRlcyBpZiBvcmlnaW4gb24gcmlnaHQgb3IgYm90dG9tXG4gICAgdmFyIGlzT3JpZ2luTGVmdCA9IHRoaXMubGF5b3V0Ll9nZXRPcHRpb24oJ29yaWdpbkxlZnQnKTtcblxuICAgIHZhciBpc09yaWdpblRvcCA9IHRoaXMubGF5b3V0Ll9nZXRPcHRpb24oJ29yaWdpblRvcCcpO1xuXG4gICAgeCA9IGlzT3JpZ2luTGVmdCA/IHggOiAteDtcbiAgICB5ID0gaXNPcmlnaW5Ub3AgPyB5IDogLXk7XG4gICAgcmV0dXJuICd0cmFuc2xhdGUzZCgnICsgeCArICdweCwgJyArIHkgKyAncHgsIDApJztcbiAgfTsgLy8gbm9uIHRyYW5zaXRpb24gKyB0cmFuc2Zvcm0gc3VwcG9ydFxuXG5cbiAgcHJvdG8uZ29UbyA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgdGhpcy5zZXRQb3NpdGlvbih4LCB5KTtcbiAgICB0aGlzLmxheW91dFBvc2l0aW9uKCk7XG4gIH07XG5cbiAgcHJvdG8ubW92ZVRvID0gcHJvdG8uX3RyYW5zaXRpb25UbztcblxuICBwcm90by5zZXRQb3NpdGlvbiA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgdGhpcy5wb3NpdGlvbi54ID0gcGFyc2VGbG9hdCh4KTtcbiAgICB0aGlzLnBvc2l0aW9uLnkgPSBwYXJzZUZsb2F0KHkpO1xuICB9OyAvLyAtLS0tLSB0cmFuc2l0aW9uIC0tLS0tIC8vXG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBzdHlsZSAtIENTU1xuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvblRyYW5zaXRpb25FbmRcbiAgICovXG4gIC8vIG5vbiB0cmFuc2l0aW9uLCBqdXN0IHRyaWdnZXIgY2FsbGJhY2tcblxuXG4gIHByb3RvLl9ub25UcmFuc2l0aW9uID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICB0aGlzLmNzcyhhcmdzLnRvKTtcblxuICAgIGlmIChhcmdzLmlzQ2xlYW5pbmcpIHtcbiAgICAgIHRoaXMuX3JlbW92ZVN0eWxlcyhhcmdzLnRvKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIGFyZ3Mub25UcmFuc2l0aW9uRW5kKSB7XG4gICAgICBhcmdzLm9uVHJhbnNpdGlvbkVuZFtwcm9wXS5jYWxsKHRoaXMpO1xuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIHByb3BlciB0cmFuc2l0aW9uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBhcmdzIC0gYXJndW1lbnRzXG4gICAqICAgQHBhcmFtIHtPYmplY3R9IHRvIC0gc3R5bGUgdG8gdHJhbnNpdGlvbiB0b1xuICAgKiAgIEBwYXJhbSB7T2JqZWN0fSBmcm9tIC0gc3R5bGUgdG8gc3RhcnQgdHJhbnNpdGlvbiBmcm9tXG4gICAqICAgQHBhcmFtIHtCb29sZWFufSBpc0NsZWFuaW5nIC0gcmVtb3ZlcyB0cmFuc2l0aW9uIHN0eWxlcyBhZnRlciB0cmFuc2l0aW9uXG4gICAqICAgQHBhcmFtIHtGdW5jdGlvbn0gb25UcmFuc2l0aW9uRW5kIC0gY2FsbGJhY2tcbiAgICovXG5cblxuICBwcm90by50cmFuc2l0aW9uID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAvLyByZWRpcmVjdCB0byBub25UcmFuc2l0aW9uIGlmIG5vIHRyYW5zaXRpb24gZHVyYXRpb25cbiAgICBpZiAoIXBhcnNlRmxvYXQodGhpcy5sYXlvdXQub3B0aW9ucy50cmFuc2l0aW9uRHVyYXRpb24pKSB7XG4gICAgICB0aGlzLl9ub25UcmFuc2l0aW9uKGFyZ3MpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIF90cmFuc2l0aW9uID0gdGhpcy5fdHJhbnNuOyAvLyBrZWVwIHRyYWNrIG9mIG9uVHJhbnNpdGlvbkVuZCBjYWxsYmFjayBieSBjc3MgcHJvcGVydHlcblxuICAgIGZvciAodmFyIHByb3AgaW4gYXJncy5vblRyYW5zaXRpb25FbmQpIHtcbiAgICAgIF90cmFuc2l0aW9uLm9uRW5kW3Byb3BdID0gYXJncy5vblRyYW5zaXRpb25FbmRbcHJvcF07XG4gICAgfSAvLyBrZWVwIHRyYWNrIG9mIHByb3BlcnRpZXMgdGhhdCBhcmUgdHJhbnNpdGlvbmluZ1xuXG5cbiAgICBmb3IgKHByb3AgaW4gYXJncy50bykge1xuICAgICAgX3RyYW5zaXRpb24uaW5nUHJvcGVydGllc1twcm9wXSA9IHRydWU7IC8vIGtlZXAgdHJhY2sgb2YgcHJvcGVydGllcyB0byBjbGVhbiB1cCB3aGVuIHRyYW5zaXRpb24gaXMgZG9uZVxuXG4gICAgICBpZiAoYXJncy5pc0NsZWFuaW5nKSB7XG4gICAgICAgIF90cmFuc2l0aW9uLmNsZWFuW3Byb3BdID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IC8vIHNldCBmcm9tIHN0eWxlc1xuXG5cbiAgICBpZiAoYXJncy5mcm9tKSB7XG4gICAgICB0aGlzLmNzcyhhcmdzLmZyb20pOyAvLyBmb3JjZSByZWRyYXcuIGh0dHA6Ly9ibG9nLmFsZXhtYWNjYXcuY29tL2Nzcy10cmFuc2l0aW9uc1xuXG4gICAgICB2YXIgaCA9IHRoaXMuZWxlbWVudC5vZmZzZXRIZWlnaHQ7IC8vIGhhY2sgZm9yIEpTSGludCB0byBodXNoIGFib3V0IHVudXNlZCB2YXJcblxuICAgICAgaCA9IG51bGw7XG4gICAgfSAvLyBlbmFibGUgdHJhbnNpdGlvblxuXG5cbiAgICB0aGlzLmVuYWJsZVRyYW5zaXRpb24oYXJncy50byk7IC8vIHNldCBzdHlsZXMgdGhhdCBhcmUgdHJhbnNpdGlvbmluZ1xuXG4gICAgdGhpcy5jc3MoYXJncy50byk7XG4gICAgdGhpcy5pc1RyYW5zaXRpb25pbmcgPSB0cnVlO1xuICB9OyAvLyBkYXNoIGJlZm9yZSBhbGwgY2FwIGxldHRlcnMsIGluY2x1ZGluZyBmaXJzdCBmb3JcbiAgLy8gV2Via2l0VHJhbnNmb3JtID0+IC13ZWJraXQtdHJhbnNmb3JtXG5cblxuICBmdW5jdGlvbiB0b0Rhc2hlZEFsbChzdHIpIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbQS1aXSkvZywgZnVuY3Rpb24gKCQxKSB7XG4gICAgICByZXR1cm4gJy0nICsgJDEudG9Mb3dlckNhc2UoKTtcbiAgICB9KTtcbiAgfVxuXG4gIHZhciB0cmFuc2l0aW9uUHJvcHMgPSAnb3BhY2l0eSwnICsgdG9EYXNoZWRBbGwodHJhbnNmb3JtUHJvcGVydHkpO1xuXG4gIHByb3RvLmVuYWJsZVRyYW5zaXRpb24gPSBmdW5jdGlvbiAoKVxuICAvKiBzdHlsZSAqL1xuICB7XG4gICAgLy8gSEFDSyBjaGFuZ2luZyB0cmFuc2l0aW9uUHJvcGVydHkgZHVyaW5nIGEgdHJhbnNpdGlvblxuICAgIC8vIHdpbGwgY2F1c2UgdHJhbnNpdGlvbiB0byBqdW1wXG4gICAgaWYgKHRoaXMuaXNUcmFuc2l0aW9uaW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBtYWtlIGB0cmFuc2l0aW9uOiBmb28sIGJhciwgYmF6YCBmcm9tIHN0eWxlIG9iamVjdFxuICAgIC8vIEhBQ0sgdW4tY29tbWVudCB0aGlzIHdoZW4gZW5hYmxlVHJhbnNpdGlvbiBjYW4gd29ya1xuICAgIC8vIHdoaWxlIGEgdHJhbnNpdGlvbiBpcyBoYXBwZW5pbmdcbiAgICAvLyB2YXIgdHJhbnNpdGlvblZhbHVlcyA9IFtdO1xuICAgIC8vIGZvciAoIHZhciBwcm9wIGluIHN0eWxlICkge1xuICAgIC8vICAgLy8gZGFzaC1pZnkgY2FtZWxDYXNlZCBwcm9wZXJ0aWVzIGxpa2UgV2Via2l0VHJhbnNpdGlvblxuICAgIC8vICAgcHJvcCA9IHZlbmRvclByb3BlcnRpZXNbIHByb3AgXSB8fCBwcm9wO1xuICAgIC8vICAgdHJhbnNpdGlvblZhbHVlcy5wdXNoKCB0b0Rhc2hlZEFsbCggcHJvcCApICk7XG4gICAgLy8gfVxuICAgIC8vIG11bmdlIG51bWJlciB0byBtaWxsaXNlY29uZCwgdG8gbWF0Y2ggc3RhZ2dlclxuXG5cbiAgICB2YXIgZHVyYXRpb24gPSB0aGlzLmxheW91dC5vcHRpb25zLnRyYW5zaXRpb25EdXJhdGlvbjtcbiAgICBkdXJhdGlvbiA9IHR5cGVvZiBkdXJhdGlvbiA9PSAnbnVtYmVyJyA/IGR1cmF0aW9uICsgJ21zJyA6IGR1cmF0aW9uOyAvLyBlbmFibGUgdHJhbnNpdGlvbiBzdHlsZXNcblxuICAgIHRoaXMuY3NzKHtcbiAgICAgIHRyYW5zaXRpb25Qcm9wZXJ0eTogdHJhbnNpdGlvblByb3BzLFxuICAgICAgdHJhbnNpdGlvbkR1cmF0aW9uOiBkdXJhdGlvbixcbiAgICAgIHRyYW5zaXRpb25EZWxheTogdGhpcy5zdGFnZ2VyRGVsYXkgfHwgMFxuICAgIH0pOyAvLyBsaXN0ZW4gZm9yIHRyYW5zaXRpb24gZW5kIGV2ZW50XG5cbiAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0cmFuc2l0aW9uRW5kRXZlbnQsIHRoaXMsIGZhbHNlKTtcbiAgfTsgLy8gLS0tLS0gZXZlbnRzIC0tLS0tIC8vXG5cblxuICBwcm90by5vbndlYmtpdFRyYW5zaXRpb25FbmQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLm9udHJhbnNpdGlvbmVuZChldmVudCk7XG4gIH07XG5cbiAgcHJvdG8ub25vdHJhbnNpdGlvbmVuZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMub250cmFuc2l0aW9uZW5kKGV2ZW50KTtcbiAgfTsgLy8gcHJvcGVydGllcyB0aGF0IEkgbXVuZ2UgdG8gbWFrZSBteSBsaWZlIGVhc2llclxuXG5cbiAgdmFyIGRhc2hlZFZlbmRvclByb3BlcnRpZXMgPSB7XG4gICAgJy13ZWJraXQtdHJhbnNmb3JtJzogJ3RyYW5zZm9ybSdcbiAgfTtcblxuICBwcm90by5vbnRyYW5zaXRpb25lbmQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAvLyBkaXNyZWdhcmQgYnViYmxlZCBldmVudHMgZnJvbSBjaGlsZHJlblxuICAgIGlmIChldmVudC50YXJnZXQgIT09IHRoaXMuZWxlbWVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBfdHJhbnNpdGlvbiA9IHRoaXMuX3RyYW5zbjsgLy8gZ2V0IHByb3BlcnR5IG5hbWUgb2YgdHJhbnNpdGlvbmVkIHByb3BlcnR5LCBjb252ZXJ0IHRvIHByZWZpeC1mcmVlXG5cbiAgICB2YXIgcHJvcGVydHlOYW1lID0gZGFzaGVkVmVuZG9yUHJvcGVydGllc1tldmVudC5wcm9wZXJ0eU5hbWVdIHx8IGV2ZW50LnByb3BlcnR5TmFtZTsgLy8gcmVtb3ZlIHByb3BlcnR5IHRoYXQgaGFzIGNvbXBsZXRlZCB0cmFuc2l0aW9uaW5nXG5cbiAgICBkZWxldGUgX3RyYW5zaXRpb24uaW5nUHJvcGVydGllc1twcm9wZXJ0eU5hbWVdOyAvLyBjaGVjayBpZiBhbnkgcHJvcGVydGllcyBhcmUgc3RpbGwgdHJhbnNpdGlvbmluZ1xuXG4gICAgaWYgKGlzRW1wdHlPYmooX3RyYW5zaXRpb24uaW5nUHJvcGVydGllcykpIHtcbiAgICAgIC8vIGFsbCBwcm9wZXJ0aWVzIGhhdmUgY29tcGxldGVkIHRyYW5zaXRpb25pbmdcbiAgICAgIHRoaXMuZGlzYWJsZVRyYW5zaXRpb24oKTtcbiAgICB9IC8vIGNsZWFuIHN0eWxlXG5cblxuICAgIGlmIChwcm9wZXJ0eU5hbWUgaW4gX3RyYW5zaXRpb24uY2xlYW4pIHtcbiAgICAgIC8vIGNsZWFuIHVwIHN0eWxlXG4gICAgICB0aGlzLmVsZW1lbnQuc3R5bGVbZXZlbnQucHJvcGVydHlOYW1lXSA9ICcnO1xuICAgICAgZGVsZXRlIF90cmFuc2l0aW9uLmNsZWFuW3Byb3BlcnR5TmFtZV07XG4gICAgfSAvLyB0cmlnZ2VyIG9uVHJhbnNpdGlvbkVuZCBjYWxsYmFja1xuXG5cbiAgICBpZiAocHJvcGVydHlOYW1lIGluIF90cmFuc2l0aW9uLm9uRW5kKSB7XG4gICAgICB2YXIgb25UcmFuc2l0aW9uRW5kID0gX3RyYW5zaXRpb24ub25FbmRbcHJvcGVydHlOYW1lXTtcbiAgICAgIG9uVHJhbnNpdGlvbkVuZC5jYWxsKHRoaXMpO1xuICAgICAgZGVsZXRlIF90cmFuc2l0aW9uLm9uRW5kW3Byb3BlcnR5TmFtZV07XG4gICAgfVxuXG4gICAgdGhpcy5lbWl0RXZlbnQoJ3RyYW5zaXRpb25FbmQnLCBbdGhpc10pO1xuICB9O1xuXG4gIHByb3RvLmRpc2FibGVUcmFuc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucmVtb3ZlVHJhbnNpdGlvblN0eWxlcygpO1xuICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHRyYW5zaXRpb25FbmRFdmVudCwgdGhpcywgZmFsc2UpO1xuICAgIHRoaXMuaXNUcmFuc2l0aW9uaW5nID0gZmFsc2U7XG4gIH07XG4gIC8qKlxuICAgKiByZW1vdmVzIHN0eWxlIHByb3BlcnR5IGZyb20gZWxlbWVudFxuICAgKiBAcGFyYW0ge09iamVjdH0gc3R5bGVcbiAgKiovXG5cblxuICBwcm90by5fcmVtb3ZlU3R5bGVzID0gZnVuY3Rpb24gKHN0eWxlKSB7XG4gICAgLy8gY2xlYW4gdXAgdHJhbnNpdGlvbiBzdHlsZXNcbiAgICB2YXIgY2xlYW5TdHlsZSA9IHt9O1xuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBzdHlsZSkge1xuICAgICAgY2xlYW5TdHlsZVtwcm9wXSA9ICcnO1xuICAgIH1cblxuICAgIHRoaXMuY3NzKGNsZWFuU3R5bGUpO1xuICB9O1xuXG4gIHZhciBjbGVhblRyYW5zaXRpb25TdHlsZSA9IHtcbiAgICB0cmFuc2l0aW9uUHJvcGVydHk6ICcnLFxuICAgIHRyYW5zaXRpb25EdXJhdGlvbjogJycsXG4gICAgdHJhbnNpdGlvbkRlbGF5OiAnJ1xuICB9O1xuXG4gIHByb3RvLnJlbW92ZVRyYW5zaXRpb25TdHlsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gcmVtb3ZlIHRyYW5zaXRpb25cbiAgICB0aGlzLmNzcyhjbGVhblRyYW5zaXRpb25TdHlsZSk7XG4gIH07IC8vIC0tLS0tIHN0YWdnZXIgLS0tLS0gLy9cblxuXG4gIHByb3RvLnN0YWdnZXIgPSBmdW5jdGlvbiAoZGVsYXkpIHtcbiAgICBkZWxheSA9IGlzTmFOKGRlbGF5KSA/IDAgOiBkZWxheTtcbiAgICB0aGlzLnN0YWdnZXJEZWxheSA9IGRlbGF5ICsgJ21zJztcbiAgfTsgLy8gLS0tLS0gc2hvdy9oaWRlL3JlbW92ZSAtLS0tLSAvL1xuICAvLyByZW1vdmUgZWxlbWVudCBmcm9tIERPTVxuXG5cbiAgcHJvdG8ucmVtb3ZlRWxlbSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpOyAvLyByZW1vdmUgZGlzcGxheTogbm9uZVxuXG4gICAgdGhpcy5jc3Moe1xuICAgICAgZGlzcGxheTogJydcbiAgICB9KTtcbiAgICB0aGlzLmVtaXRFdmVudCgncmVtb3ZlJywgW3RoaXNdKTtcbiAgfTtcblxuICBwcm90by5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8ganVzdCByZW1vdmUgZWxlbWVudCBpZiBubyB0cmFuc2l0aW9uIHN1cHBvcnQgb3Igbm8gdHJhbnNpdGlvblxuICAgIGlmICghdHJhbnNpdGlvblByb3BlcnR5IHx8ICFwYXJzZUZsb2F0KHRoaXMubGF5b3V0Lm9wdGlvbnMudHJhbnNpdGlvbkR1cmF0aW9uKSkge1xuICAgICAgdGhpcy5yZW1vdmVFbGVtKCk7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBzdGFydCB0cmFuc2l0aW9uXG5cblxuICAgIHRoaXMub25jZSgndHJhbnNpdGlvbkVuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMucmVtb3ZlRWxlbSgpO1xuICAgIH0pO1xuICAgIHRoaXMuaGlkZSgpO1xuICB9O1xuXG4gIHByb3RvLnJldmVhbCA9IGZ1bmN0aW9uICgpIHtcbiAgICBkZWxldGUgdGhpcy5pc0hpZGRlbjsgLy8gcmVtb3ZlIGRpc3BsYXk6IG5vbmVcblxuICAgIHRoaXMuY3NzKHtcbiAgICAgIGRpc3BsYXk6ICcnXG4gICAgfSk7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLmxheW91dC5vcHRpb25zO1xuICAgIHZhciBvblRyYW5zaXRpb25FbmQgPSB7fTtcbiAgICB2YXIgdHJhbnNpdGlvbkVuZFByb3BlcnR5ID0gdGhpcy5nZXRIaWRlUmV2ZWFsVHJhbnNpdGlvbkVuZFByb3BlcnR5KCd2aXNpYmxlU3R5bGUnKTtcbiAgICBvblRyYW5zaXRpb25FbmRbdHJhbnNpdGlvbkVuZFByb3BlcnR5XSA9IHRoaXMub25SZXZlYWxUcmFuc2l0aW9uRW5kO1xuICAgIHRoaXMudHJhbnNpdGlvbih7XG4gICAgICBmcm9tOiBvcHRpb25zLmhpZGRlblN0eWxlLFxuICAgICAgdG86IG9wdGlvbnMudmlzaWJsZVN0eWxlLFxuICAgICAgaXNDbGVhbmluZzogdHJ1ZSxcbiAgICAgIG9uVHJhbnNpdGlvbkVuZDogb25UcmFuc2l0aW9uRW5kXG4gICAgfSk7XG4gIH07XG5cbiAgcHJvdG8ub25SZXZlYWxUcmFuc2l0aW9uRW5kID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGNoZWNrIGlmIHN0aWxsIHZpc2libGVcbiAgICAvLyBkdXJpbmcgdHJhbnNpdGlvbiwgaXRlbSBtYXkgaGF2ZSBiZWVuIGhpZGRlblxuICAgIGlmICghdGhpcy5pc0hpZGRlbikge1xuICAgICAgdGhpcy5lbWl0RXZlbnQoJ3JldmVhbCcpO1xuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIGdldCBzdHlsZSBwcm9wZXJ0eSB1c2UgZm9yIGhpZGUvcmV2ZWFsIHRyYW5zaXRpb24gZW5kXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzdHlsZVByb3BlcnR5IC0gaGlkZGVuU3R5bGUvdmlzaWJsZVN0eWxlXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9XG4gICAqL1xuXG5cbiAgcHJvdG8uZ2V0SGlkZVJldmVhbFRyYW5zaXRpb25FbmRQcm9wZXJ0eSA9IGZ1bmN0aW9uIChzdHlsZVByb3BlcnR5KSB7XG4gICAgdmFyIG9wdGlvblN0eWxlID0gdGhpcy5sYXlvdXQub3B0aW9uc1tzdHlsZVByb3BlcnR5XTsgLy8gdXNlIG9wYWNpdHlcblxuICAgIGlmIChvcHRpb25TdHlsZS5vcGFjaXR5KSB7XG4gICAgICByZXR1cm4gJ29wYWNpdHknO1xuICAgIH0gLy8gZ2V0IGZpcnN0IHByb3BlcnR5XG5cblxuICAgIGZvciAodmFyIHByb3AgaW4gb3B0aW9uU3R5bGUpIHtcbiAgICAgIHJldHVybiBwcm9wO1xuICAgIH1cbiAgfTtcblxuICBwcm90by5oaWRlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIHNldCBmbGFnXG4gICAgdGhpcy5pc0hpZGRlbiA9IHRydWU7IC8vIHJlbW92ZSBkaXNwbGF5OiBub25lXG5cbiAgICB0aGlzLmNzcyh7XG4gICAgICBkaXNwbGF5OiAnJ1xuICAgIH0pO1xuICAgIHZhciBvcHRpb25zID0gdGhpcy5sYXlvdXQub3B0aW9ucztcbiAgICB2YXIgb25UcmFuc2l0aW9uRW5kID0ge307XG4gICAgdmFyIHRyYW5zaXRpb25FbmRQcm9wZXJ0eSA9IHRoaXMuZ2V0SGlkZVJldmVhbFRyYW5zaXRpb25FbmRQcm9wZXJ0eSgnaGlkZGVuU3R5bGUnKTtcbiAgICBvblRyYW5zaXRpb25FbmRbdHJhbnNpdGlvbkVuZFByb3BlcnR5XSA9IHRoaXMub25IaWRlVHJhbnNpdGlvbkVuZDtcbiAgICB0aGlzLnRyYW5zaXRpb24oe1xuICAgICAgZnJvbTogb3B0aW9ucy52aXNpYmxlU3R5bGUsXG4gICAgICB0bzogb3B0aW9ucy5oaWRkZW5TdHlsZSxcbiAgICAgIC8vIGtlZXAgaGlkZGVuIHN0dWZmIGhpZGRlblxuICAgICAgaXNDbGVhbmluZzogdHJ1ZSxcbiAgICAgIG9uVHJhbnNpdGlvbkVuZDogb25UcmFuc2l0aW9uRW5kXG4gICAgfSk7XG4gIH07XG5cbiAgcHJvdG8ub25IaWRlVHJhbnNpdGlvbkVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBjaGVjayBpZiBzdGlsbCBoaWRkZW5cbiAgICAvLyBkdXJpbmcgdHJhbnNpdGlvbiwgaXRlbSBtYXkgaGF2ZSBiZWVuIHVuLWhpZGRlblxuICAgIGlmICh0aGlzLmlzSGlkZGVuKSB7XG4gICAgICB0aGlzLmNzcyh7XG4gICAgICAgIGRpc3BsYXk6ICdub25lJ1xuICAgICAgfSk7XG4gICAgICB0aGlzLmVtaXRFdmVudCgnaGlkZScpO1xuICAgIH1cbiAgfTtcblxuICBwcm90by5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuY3NzKHtcbiAgICAgIHBvc2l0aW9uOiAnJyxcbiAgICAgIGxlZnQ6ICcnLFxuICAgICAgcmlnaHQ6ICcnLFxuICAgICAgdG9wOiAnJyxcbiAgICAgIGJvdHRvbTogJycsXG4gICAgICB0cmFuc2l0aW9uOiAnJyxcbiAgICAgIHRyYW5zZm9ybTogJydcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gSXRlbTtcbn0pO1xuLyohXG4gKiBPdXRsYXllciB2Mi4xLjFcbiAqIHRoZSBicmFpbnMgYW5kIGd1dHMgb2YgYSBsYXlvdXQgbGlicmFyeVxuICogTUlUIGxpY2Vuc2VcbiAqL1xuXG5cbihmdW5jdGlvbiAod2luZG93LCBmYWN0b3J5KSB7XG4gICd1c2Ugc3RyaWN0JzsgLy8gdW5pdmVyc2FsIG1vZHVsZSBkZWZpbml0aW9uXG5cbiAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cblxuICAvKiBnbG9iYWxzIGRlZmluZSwgbW9kdWxlLCByZXF1aXJlICovXG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EIC0gUmVxdWlyZUpTXG4gICAgZGVmaW5lKCdvdXRsYXllci9vdXRsYXllcicsIFsnZXYtZW1pdHRlci9ldi1lbWl0dGVyJywgJ2dldC1zaXplL2dldC1zaXplJywgJ2Zpenp5LXVpLXV0aWxzL3V0aWxzJywgJy4vaXRlbSddLCBmdW5jdGlvbiAoRXZFbWl0dGVyLCBnZXRTaXplLCB1dGlscywgSXRlbSkge1xuICAgICAgcmV0dXJuIGZhY3Rvcnkod2luZG93LCBFdkVtaXR0ZXIsIGdldFNpemUsIHV0aWxzLCBJdGVtKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIG1vZHVsZSA9PT0gXCJ1bmRlZmluZWRcIiA/IFwidW5kZWZpbmVkXCIgOiBfdHlwZW9mKG1vZHVsZSkpID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMgLSBCcm93c2VyaWZ5LCBXZWJwYWNrXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHdpbmRvdywgcmVxdWlyZSgnZXYtZW1pdHRlcicpLCByZXF1aXJlKCdnZXQtc2l6ZScpLCByZXF1aXJlKCdmaXp6eS11aS11dGlscycpLCByZXF1aXJlKCcuL2l0ZW0nKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gYnJvd3NlciBnbG9iYWxcbiAgICB3aW5kb3cuT3V0bGF5ZXIgPSBmYWN0b3J5KHdpbmRvdywgd2luZG93LkV2RW1pdHRlciwgd2luZG93LmdldFNpemUsIHdpbmRvdy5maXp6eVVJVXRpbHMsIHdpbmRvdy5PdXRsYXllci5JdGVtKTtcbiAgfVxufSkod2luZG93LCBmdW5jdGlvbiBmYWN0b3J5KHdpbmRvdywgRXZFbWl0dGVyLCBnZXRTaXplLCB1dGlscywgSXRlbSkge1xuICAndXNlIHN0cmljdCc7IC8vIC0tLS0tIHZhcnMgLS0tLS0gLy9cblxuICB2YXIgY29uc29sZSA9IHdpbmRvdy5jb25zb2xlO1xuICB2YXIgalF1ZXJ5ID0gd2luZG93LmpRdWVyeTtcblxuICB2YXIgbm9vcCA9IGZ1bmN0aW9uIG5vb3AoKSB7fTsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gT3V0bGF5ZXIgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cbiAgLy8gZ2xvYmFsbHkgdW5pcXVlIGlkZW50aWZpZXJzXG5cblxuICB2YXIgR1VJRCA9IDA7IC8vIGludGVybmFsIHN0b3JlIG9mIGFsbCBPdXRsYXllciBpbnRhbmNlc1xuXG4gIHZhciBpbnN0YW5jZXMgPSB7fTtcbiAgLyoqXG4gICAqIEBwYXJhbSB7RWxlbWVudCwgU3RyaW5nfSBlbGVtZW50XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cblxuICBmdW5jdGlvbiBPdXRsYXllcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdmFyIHF1ZXJ5RWxlbWVudCA9IHV0aWxzLmdldFF1ZXJ5RWxlbWVudChlbGVtZW50KTtcblxuICAgIGlmICghcXVlcnlFbGVtZW50KSB7XG4gICAgICBpZiAoY29uc29sZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdCYWQgZWxlbWVudCBmb3IgJyArIHRoaXMuY29uc3RydWN0b3IubmFtZXNwYWNlICsgJzogJyArIChxdWVyeUVsZW1lbnQgfHwgZWxlbWVudCkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5lbGVtZW50ID0gcXVlcnlFbGVtZW50OyAvLyBhZGQgalF1ZXJ5XG5cbiAgICBpZiAoalF1ZXJ5KSB7XG4gICAgICB0aGlzLiRlbGVtZW50ID0galF1ZXJ5KHRoaXMuZWxlbWVudCk7XG4gICAgfSAvLyBvcHRpb25zXG5cblxuICAgIHRoaXMub3B0aW9ucyA9IHV0aWxzLmV4dGVuZCh7fSwgdGhpcy5jb25zdHJ1Y3Rvci5kZWZhdWx0cyk7XG4gICAgdGhpcy5vcHRpb24ob3B0aW9ucyk7IC8vIGFkZCBpZCBmb3IgT3V0bGF5ZXIuZ2V0RnJvbUVsZW1lbnRcblxuICAgIHZhciBpZCA9ICsrR1VJRDtcbiAgICB0aGlzLmVsZW1lbnQub3V0bGF5ZXJHVUlEID0gaWQ7IC8vIGV4cGFuZG9cblxuICAgIGluc3RhbmNlc1tpZF0gPSB0aGlzOyAvLyBhc3NvY2lhdGUgdmlhIGlkXG4gICAgLy8ga2ljayBpdCBvZmZcblxuICAgIHRoaXMuX2NyZWF0ZSgpO1xuXG4gICAgdmFyIGlzSW5pdExheW91dCA9IHRoaXMuX2dldE9wdGlvbignaW5pdExheW91dCcpO1xuXG4gICAgaWYgKGlzSW5pdExheW91dCkge1xuICAgICAgdGhpcy5sYXlvdXQoKTtcbiAgICB9XG4gIH0gLy8gc2V0dGluZ3MgYXJlIGZvciBpbnRlcm5hbCB1c2Ugb25seVxuXG5cbiAgT3V0bGF5ZXIubmFtZXNwYWNlID0gJ291dGxheWVyJztcbiAgT3V0bGF5ZXIuSXRlbSA9IEl0ZW07IC8vIGRlZmF1bHQgb3B0aW9uc1xuXG4gIE91dGxheWVyLmRlZmF1bHRzID0ge1xuICAgIGNvbnRhaW5lclN0eWxlOiB7XG4gICAgICBwb3NpdGlvbjogJ3JlbGF0aXZlJ1xuICAgIH0sXG4gICAgaW5pdExheW91dDogdHJ1ZSxcbiAgICBvcmlnaW5MZWZ0OiB0cnVlLFxuICAgIG9yaWdpblRvcDogdHJ1ZSxcbiAgICByZXNpemU6IHRydWUsXG4gICAgcmVzaXplQ29udGFpbmVyOiB0cnVlLFxuICAgIC8vIGl0ZW0gb3B0aW9uc1xuICAgIHRyYW5zaXRpb25EdXJhdGlvbjogJzAuNHMnLFxuICAgIGhpZGRlblN0eWxlOiB7XG4gICAgICBvcGFjaXR5OiAwLFxuICAgICAgdHJhbnNmb3JtOiAnc2NhbGUoMC4wMDEpJ1xuICAgIH0sXG4gICAgdmlzaWJsZVN0eWxlOiB7XG4gICAgICBvcGFjaXR5OiAxLFxuICAgICAgdHJhbnNmb3JtOiAnc2NhbGUoMSknXG4gICAgfVxuICB9O1xuICB2YXIgcHJvdG8gPSBPdXRsYXllci5wcm90b3R5cGU7IC8vIGluaGVyaXQgRXZFbWl0dGVyXG5cbiAgdXRpbHMuZXh0ZW5kKHByb3RvLCBFdkVtaXR0ZXIucHJvdG90eXBlKTtcbiAgLyoqXG4gICAqIHNldCBvcHRpb25zXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzXG4gICAqL1xuXG4gIHByb3RvLm9wdGlvbiA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgdXRpbHMuZXh0ZW5kKHRoaXMub3B0aW9ucywgb3B0cyk7XG4gIH07XG4gIC8qKlxuICAgKiBnZXQgYmFja3dhcmRzIGNvbXBhdGlibGUgb3B0aW9uIHZhbHVlLCBjaGVjayBvbGQgbmFtZVxuICAgKi9cblxuXG4gIHByb3RvLl9nZXRPcHRpb24gPSBmdW5jdGlvbiAob3B0aW9uKSB7XG4gICAgdmFyIG9sZE9wdGlvbiA9IHRoaXMuY29uc3RydWN0b3IuY29tcGF0T3B0aW9uc1tvcHRpb25dO1xuICAgIHJldHVybiBvbGRPcHRpb24gJiYgdGhpcy5vcHRpb25zW29sZE9wdGlvbl0gIT09IHVuZGVmaW5lZCA/IHRoaXMub3B0aW9uc1tvbGRPcHRpb25dIDogdGhpcy5vcHRpb25zW29wdGlvbl07XG4gIH07XG5cbiAgT3V0bGF5ZXIuY29tcGF0T3B0aW9ucyA9IHtcbiAgICAvLyBjdXJyZW50TmFtZTogb2xkTmFtZVxuICAgIGluaXRMYXlvdXQ6ICdpc0luaXRMYXlvdXQnLFxuICAgIGhvcml6b250YWw6ICdpc0hvcml6b250YWwnLFxuICAgIGxheW91dEluc3RhbnQ6ICdpc0xheW91dEluc3RhbnQnLFxuICAgIG9yaWdpbkxlZnQ6ICdpc09yaWdpbkxlZnQnLFxuICAgIG9yaWdpblRvcDogJ2lzT3JpZ2luVG9wJyxcbiAgICByZXNpemU6ICdpc1Jlc2l6ZUJvdW5kJyxcbiAgICByZXNpemVDb250YWluZXI6ICdpc1Jlc2l6aW5nQ29udGFpbmVyJ1xuICB9O1xuXG4gIHByb3RvLl9jcmVhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gZ2V0IGl0ZW1zIGZyb20gY2hpbGRyZW5cbiAgICB0aGlzLnJlbG9hZEl0ZW1zKCk7IC8vIGVsZW1lbnRzIHRoYXQgYWZmZWN0IGxheW91dCwgYnV0IGFyZSBub3QgbGFpZCBvdXRcblxuICAgIHRoaXMuc3RhbXBzID0gW107XG4gICAgdGhpcy5zdGFtcCh0aGlzLm9wdGlvbnMuc3RhbXApOyAvLyBzZXQgY29udGFpbmVyIHN0eWxlXG5cbiAgICB1dGlscy5leHRlbmQodGhpcy5lbGVtZW50LnN0eWxlLCB0aGlzLm9wdGlvbnMuY29udGFpbmVyU3R5bGUpOyAvLyBiaW5kIHJlc2l6ZSBtZXRob2RcblxuICAgIHZhciBjYW5CaW5kUmVzaXplID0gdGhpcy5fZ2V0T3B0aW9uKCdyZXNpemUnKTtcblxuICAgIGlmIChjYW5CaW5kUmVzaXplKSB7XG4gICAgICB0aGlzLmJpbmRSZXNpemUoKTtcbiAgICB9XG4gIH07IC8vIGdvZXMgdGhyb3VnaCBhbGwgY2hpbGRyZW4gYWdhaW4gYW5kIGdldHMgYnJpY2tzIGluIHByb3BlciBvcmRlclxuXG5cbiAgcHJvdG8ucmVsb2FkSXRlbXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY29sbGVjdGlvbiBvZiBpdGVtIGVsZW1lbnRzXG4gICAgdGhpcy5pdGVtcyA9IHRoaXMuX2l0ZW1pemUodGhpcy5lbGVtZW50LmNoaWxkcmVuKTtcbiAgfTtcbiAgLyoqXG4gICAqIHR1cm4gZWxlbWVudHMgaW50byBPdXRsYXllci5JdGVtcyB0byBiZSB1c2VkIGluIGxheW91dFxuICAgKiBAcGFyYW0ge0FycmF5IG9yIE5vZGVMaXN0IG9yIEhUTUxFbGVtZW50fSBlbGVtc1xuICAgKiBAcmV0dXJucyB7QXJyYXl9IGl0ZW1zIC0gY29sbGVjdGlvbiBvZiBuZXcgT3V0bGF5ZXIgSXRlbXNcbiAgICovXG5cblxuICBwcm90by5faXRlbWl6ZSA9IGZ1bmN0aW9uIChlbGVtcykge1xuICAgIHZhciBpdGVtRWxlbXMgPSB0aGlzLl9maWx0ZXJGaW5kSXRlbUVsZW1lbnRzKGVsZW1zKTtcblxuICAgIHZhciBJdGVtID0gdGhpcy5jb25zdHJ1Y3Rvci5JdGVtOyAvLyBjcmVhdGUgbmV3IE91dGxheWVyIEl0ZW1zIGZvciBjb2xsZWN0aW9uXG5cbiAgICB2YXIgaXRlbXMgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaXRlbUVsZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZWxlbSA9IGl0ZW1FbGVtc1tpXTtcbiAgICAgIHZhciBpdGVtID0gbmV3IEl0ZW0oZWxlbSwgdGhpcyk7XG4gICAgICBpdGVtcy5wdXNoKGl0ZW0pO1xuICAgIH1cblxuICAgIHJldHVybiBpdGVtcztcbiAgfTtcbiAgLyoqXG4gICAqIGdldCBpdGVtIGVsZW1lbnRzIHRvIGJlIHVzZWQgaW4gbGF5b3V0XG4gICAqIEBwYXJhbSB7QXJyYXkgb3IgTm9kZUxpc3Qgb3IgSFRNTEVsZW1lbnR9IGVsZW1zXG4gICAqIEByZXR1cm5zIHtBcnJheX0gaXRlbXMgLSBpdGVtIGVsZW1lbnRzXG4gICAqL1xuXG5cbiAgcHJvdG8uX2ZpbHRlckZpbmRJdGVtRWxlbWVudHMgPSBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICByZXR1cm4gdXRpbHMuZmlsdGVyRmluZEVsZW1lbnRzKGVsZW1zLCB0aGlzLm9wdGlvbnMuaXRlbVNlbGVjdG9yKTtcbiAgfTtcbiAgLyoqXG4gICAqIGdldHRlciBtZXRob2QgZm9yIGdldHRpbmcgaXRlbSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7QXJyYXl9IGVsZW1zIC0gY29sbGVjdGlvbiBvZiBpdGVtIGVsZW1lbnRzXG4gICAqL1xuXG5cbiAgcHJvdG8uZ2V0SXRlbUVsZW1lbnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLml0ZW1zLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgcmV0dXJuIGl0ZW0uZWxlbWVudDtcbiAgICB9KTtcbiAgfTsgLy8gLS0tLS0gaW5pdCAmIGxheW91dCAtLS0tLSAvL1xuXG4gIC8qKlxuICAgKiBsYXlzIG91dCBhbGwgaXRlbXNcbiAgICovXG5cblxuICBwcm90by5sYXlvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fcmVzZXRMYXlvdXQoKTtcblxuICAgIHRoaXMuX21hbmFnZVN0YW1wcygpOyAvLyBkb24ndCBhbmltYXRlIGZpcnN0IGxheW91dFxuXG5cbiAgICB2YXIgbGF5b3V0SW5zdGFudCA9IHRoaXMuX2dldE9wdGlvbignbGF5b3V0SW5zdGFudCcpO1xuXG4gICAgdmFyIGlzSW5zdGFudCA9IGxheW91dEluc3RhbnQgIT09IHVuZGVmaW5lZCA/IGxheW91dEluc3RhbnQgOiAhdGhpcy5faXNMYXlvdXRJbml0ZWQ7XG4gICAgdGhpcy5sYXlvdXRJdGVtcyh0aGlzLml0ZW1zLCBpc0luc3RhbnQpOyAvLyBmbGFnIGZvciBpbml0YWxpemVkXG5cbiAgICB0aGlzLl9pc0xheW91dEluaXRlZCA9IHRydWU7XG4gIH07IC8vIF9pbml0IGlzIGFsaWFzIGZvciBsYXlvdXRcblxuXG4gIHByb3RvLl9pbml0ID0gcHJvdG8ubGF5b3V0O1xuICAvKipcbiAgICogbG9naWMgYmVmb3JlIGFueSBuZXcgbGF5b3V0XG4gICAqL1xuXG4gIHByb3RvLl9yZXNldExheW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmdldFNpemUoKTtcbiAgfTtcblxuICBwcm90by5nZXRTaXplID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2l6ZSA9IGdldFNpemUodGhpcy5lbGVtZW50KTtcbiAgfTtcbiAgLyoqXG4gICAqIGdldCBtZWFzdXJlbWVudCBmcm9tIG9wdGlvbiwgZm9yIGNvbHVtbldpZHRoLCByb3dIZWlnaHQsIGd1dHRlclxuICAgKiBpZiBvcHRpb24gaXMgU3RyaW5nIC0+IGdldCBlbGVtZW50IGZyb20gc2VsZWN0b3Igc3RyaW5nLCAmIGdldCBzaXplIG9mIGVsZW1lbnRcbiAgICogaWYgb3B0aW9uIGlzIEVsZW1lbnQgLT4gZ2V0IHNpemUgb2YgZWxlbWVudFxuICAgKiBlbHNlIHVzZSBvcHRpb24gYXMgYSBudW1iZXJcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1lYXN1cmVtZW50XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzaXplIC0gd2lkdGggb3IgaGVpZ2h0XG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgcHJvdG8uX2dldE1lYXN1cmVtZW50ID0gZnVuY3Rpb24gKG1lYXN1cmVtZW50LCBzaXplKSB7XG4gICAgdmFyIG9wdGlvbiA9IHRoaXMub3B0aW9uc1ttZWFzdXJlbWVudF07XG4gICAgdmFyIGVsZW07XG5cbiAgICBpZiAoIW9wdGlvbikge1xuICAgICAgLy8gZGVmYXVsdCB0byAwXG4gICAgICB0aGlzW21lYXN1cmVtZW50XSA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHVzZSBvcHRpb24gYXMgYW4gZWxlbWVudFxuICAgICAgaWYgKHR5cGVvZiBvcHRpb24gPT0gJ3N0cmluZycpIHtcbiAgICAgICAgZWxlbSA9IHRoaXMuZWxlbWVudC5xdWVyeVNlbGVjdG9yKG9wdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbiBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGVsZW0gPSBvcHRpb247XG4gICAgICB9IC8vIHVzZSBzaXplIG9mIGVsZW1lbnQsIGlmIGVsZW1lbnRcblxuXG4gICAgICB0aGlzW21lYXN1cmVtZW50XSA9IGVsZW0gPyBnZXRTaXplKGVsZW0pW3NpemVdIDogb3B0aW9uO1xuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIGxheW91dCBhIGNvbGxlY3Rpb24gb2YgaXRlbSBlbGVtZW50c1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuXG4gIHByb3RvLmxheW91dEl0ZW1zID0gZnVuY3Rpb24gKGl0ZW1zLCBpc0luc3RhbnQpIHtcbiAgICBpdGVtcyA9IHRoaXMuX2dldEl0ZW1zRm9yTGF5b3V0KGl0ZW1zKTtcblxuICAgIHRoaXMuX2xheW91dEl0ZW1zKGl0ZW1zLCBpc0luc3RhbnQpO1xuXG4gICAgdGhpcy5fcG9zdExheW91dCgpO1xuICB9O1xuICAvKipcbiAgICogZ2V0IHRoZSBpdGVtcyB0byBiZSBsYWlkIG91dFxuICAgKiB5b3UgbWF5IHdhbnQgdG8gc2tpcCBvdmVyIHNvbWUgaXRlbXNcbiAgICogQHBhcmFtIHtBcnJheX0gaXRlbXNcbiAgICogQHJldHVybnMge0FycmF5fSBpdGVtc1xuICAgKi9cblxuXG4gIHByb3RvLl9nZXRJdGVtc0ZvckxheW91dCA9IGZ1bmN0aW9uIChpdGVtcykge1xuICAgIHJldHVybiBpdGVtcy5maWx0ZXIoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHJldHVybiAhaXRlbS5pc0lnbm9yZWQ7XG4gICAgfSk7XG4gIH07XG4gIC8qKlxuICAgKiBsYXlvdXQgaXRlbXNcbiAgICogQHBhcmFtIHtBcnJheX0gaXRlbXNcbiAgICogQHBhcmFtIHtCb29sZWFufSBpc0luc3RhbnRcbiAgICovXG5cblxuICBwcm90by5fbGF5b3V0SXRlbXMgPSBmdW5jdGlvbiAoaXRlbXMsIGlzSW5zdGFudCkge1xuICAgIHRoaXMuX2VtaXRDb21wbGV0ZU9uSXRlbXMoJ2xheW91dCcsIGl0ZW1zKTtcblxuICAgIGlmICghaXRlbXMgfHwgIWl0ZW1zLmxlbmd0aCkge1xuICAgICAgLy8gbm8gaXRlbXMsIGVtaXQgZXZlbnQgd2l0aCBlbXB0eSBhcnJheVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgIGl0ZW1zLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIC8vIGdldCB4L3kgb2JqZWN0IGZyb20gbWV0aG9kXG4gICAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9nZXRJdGVtTGF5b3V0UG9zaXRpb24oaXRlbSk7IC8vIGVucXVldWVcblxuXG4gICAgICBwb3NpdGlvbi5pdGVtID0gaXRlbTtcbiAgICAgIHBvc2l0aW9uLmlzSW5zdGFudCA9IGlzSW5zdGFudCB8fCBpdGVtLmlzTGF5b3V0SW5zdGFudDtcbiAgICAgIHF1ZXVlLnB1c2gocG9zaXRpb24pO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy5fcHJvY2Vzc0xheW91dFF1ZXVlKHF1ZXVlKTtcbiAgfTtcbiAgLyoqXG4gICAqIGdldCBpdGVtIGxheW91dCBwb3NpdGlvblxuICAgKiBAcGFyYW0ge091dGxheWVyLkl0ZW19IGl0ZW1cbiAgICogQHJldHVybnMge09iamVjdH0geCBhbmQgeSBwb3NpdGlvblxuICAgKi9cblxuXG4gIHByb3RvLl9nZXRJdGVtTGF5b3V0UG9zaXRpb24gPSBmdW5jdGlvbiAoKVxuICAvKiBpdGVtICovXG4gIHtcbiAgICByZXR1cm4ge1xuICAgICAgeDogMCxcbiAgICAgIHk6IDBcbiAgICB9O1xuICB9O1xuICAvKipcbiAgICogaXRlcmF0ZSBvdmVyIGFycmF5IGFuZCBwb3NpdGlvbiBlYWNoIGl0ZW1cbiAgICogUmVhc29uIGJlaW5nIC0gc2VwYXJhdGluZyB0aGlzIGxvZ2ljIHByZXZlbnRzICdsYXlvdXQgaW52YWxpZGF0aW9uJ1xuICAgKiB0aHggQHBhdWxfaXJpc2hcbiAgICogQHBhcmFtIHtBcnJheX0gcXVldWVcbiAgICovXG5cblxuICBwcm90by5fcHJvY2Vzc0xheW91dFF1ZXVlID0gZnVuY3Rpb24gKHF1ZXVlKSB7XG4gICAgdGhpcy51cGRhdGVTdGFnZ2VyKCk7XG4gICAgcXVldWUuZm9yRWFjaChmdW5jdGlvbiAob2JqLCBpKSB7XG4gICAgICB0aGlzLl9wb3NpdGlvbkl0ZW0ob2JqLml0ZW0sIG9iai54LCBvYmoueSwgb2JqLmlzSW5zdGFudCwgaSk7XG4gICAgfSwgdGhpcyk7XG4gIH07IC8vIHNldCBzdGFnZ2VyIGZyb20gb3B0aW9uIGluIG1pbGxpc2Vjb25kcyBudW1iZXJcblxuXG4gIHByb3RvLnVwZGF0ZVN0YWdnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN0YWdnZXIgPSB0aGlzLm9wdGlvbnMuc3RhZ2dlcjtcblxuICAgIGlmIChzdGFnZ2VyID09PSBudWxsIHx8IHN0YWdnZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5zdGFnZ2VyID0gMDtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnN0YWdnZXIgPSBnZXRNaWxsaXNlY29uZHMoc3RhZ2dlcik7XG4gICAgcmV0dXJuIHRoaXMuc3RhZ2dlcjtcbiAgfTtcbiAgLyoqXG4gICAqIFNldHMgcG9zaXRpb24gb2YgaXRlbSBpbiBET01cbiAgICogQHBhcmFtIHtPdXRsYXllci5JdGVtfSBpdGVtXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB4IC0gaG9yaXpvbnRhbCBwb3NpdGlvblxuICAgKiBAcGFyYW0ge051bWJlcn0geSAtIHZlcnRpY2FsIHBvc2l0aW9uXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNJbnN0YW50IC0gZGlzYWJsZXMgdHJhbnNpdGlvbnNcbiAgICovXG5cblxuICBwcm90by5fcG9zaXRpb25JdGVtID0gZnVuY3Rpb24gKGl0ZW0sIHgsIHksIGlzSW5zdGFudCwgaSkge1xuICAgIGlmIChpc0luc3RhbnQpIHtcbiAgICAgIC8vIGlmIG5vdCB0cmFuc2l0aW9uLCBqdXN0IHNldCBDU1NcbiAgICAgIGl0ZW0uZ29Ubyh4LCB5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaXRlbS5zdGFnZ2VyKGkgKiB0aGlzLnN0YWdnZXIpO1xuICAgICAgaXRlbS5tb3ZlVG8oeCwgeSk7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogQW55IGxvZ2ljIHlvdSB3YW50IHRvIGRvIGFmdGVyIGVhY2ggbGF5b3V0LFxuICAgKiBpLmUuIHNpemUgdGhlIGNvbnRhaW5lclxuICAgKi9cblxuXG4gIHByb3RvLl9wb3N0TGF5b3V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucmVzaXplQ29udGFpbmVyKCk7XG4gIH07XG5cbiAgcHJvdG8ucmVzaXplQ29udGFpbmVyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpc1Jlc2l6aW5nQ29udGFpbmVyID0gdGhpcy5fZ2V0T3B0aW9uKCdyZXNpemVDb250YWluZXInKTtcblxuICAgIGlmICghaXNSZXNpemluZ0NvbnRhaW5lcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzaXplID0gdGhpcy5fZ2V0Q29udGFpbmVyU2l6ZSgpO1xuXG4gICAgaWYgKHNpemUpIHtcbiAgICAgIHRoaXMuX3NldENvbnRhaW5lck1lYXN1cmUoc2l6ZS53aWR0aCwgdHJ1ZSk7XG5cbiAgICAgIHRoaXMuX3NldENvbnRhaW5lck1lYXN1cmUoc2l6ZS5oZWlnaHQsIGZhbHNlKTtcbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBTZXRzIHdpZHRoIG9yIGhlaWdodCBvZiBjb250YWluZXIgaWYgcmV0dXJuZWRcbiAgICogQHJldHVybnMge09iamVjdH0gc2l6ZVxuICAgKiAgIEBwYXJhbSB7TnVtYmVyfSB3aWR0aFxuICAgKiAgIEBwYXJhbSB7TnVtYmVyfSBoZWlnaHRcbiAgICovXG5cblxuICBwcm90by5fZ2V0Q29udGFpbmVyU2l6ZSA9IG5vb3A7XG4gIC8qKlxuICAgKiBAcGFyYW0ge051bWJlcn0gbWVhc3VyZSAtIHNpemUgb2Ygd2lkdGggb3IgaGVpZ2h0XG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNXaWR0aFxuICAgKi9cblxuICBwcm90by5fc2V0Q29udGFpbmVyTWVhc3VyZSA9IGZ1bmN0aW9uIChtZWFzdXJlLCBpc1dpZHRoKSB7XG4gICAgaWYgKG1lYXN1cmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBlbGVtU2l6ZSA9IHRoaXMuc2l6ZTsgLy8gYWRkIHBhZGRpbmcgYW5kIGJvcmRlciB3aWR0aCBpZiBib3JkZXIgYm94XG5cbiAgICBpZiAoZWxlbVNpemUuaXNCb3JkZXJCb3gpIHtcbiAgICAgIG1lYXN1cmUgKz0gaXNXaWR0aCA/IGVsZW1TaXplLnBhZGRpbmdMZWZ0ICsgZWxlbVNpemUucGFkZGluZ1JpZ2h0ICsgZWxlbVNpemUuYm9yZGVyTGVmdFdpZHRoICsgZWxlbVNpemUuYm9yZGVyUmlnaHRXaWR0aCA6IGVsZW1TaXplLnBhZGRpbmdCb3R0b20gKyBlbGVtU2l6ZS5wYWRkaW5nVG9wICsgZWxlbVNpemUuYm9yZGVyVG9wV2lkdGggKyBlbGVtU2l6ZS5ib3JkZXJCb3R0b21XaWR0aDtcbiAgICB9XG5cbiAgICBtZWFzdXJlID0gTWF0aC5tYXgobWVhc3VyZSwgMCk7XG4gICAgdGhpcy5lbGVtZW50LnN0eWxlW2lzV2lkdGggPyAnd2lkdGgnIDogJ2hlaWdodCddID0gbWVhc3VyZSArICdweCc7XG4gIH07XG4gIC8qKlxuICAgKiBlbWl0IGV2ZW50Q29tcGxldGUgb24gYSBjb2xsZWN0aW9uIG9mIGl0ZW1zIGV2ZW50c1xuICAgKiBAcGFyYW0ge1N0cmluZ30gZXZlbnROYW1lXG4gICAqIEBwYXJhbSB7QXJyYXl9IGl0ZW1zIC0gT3V0bGF5ZXIuSXRlbXNcbiAgICovXG5cblxuICBwcm90by5fZW1pdENvbXBsZXRlT25JdGVtcyA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGl0ZW1zKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIG9uQ29tcGxldGUoKSB7XG4gICAgICBfdGhpcy5kaXNwYXRjaEV2ZW50KGV2ZW50TmFtZSArICdDb21wbGV0ZScsIG51bGwsIFtpdGVtc10pO1xuICAgIH1cblxuICAgIHZhciBjb3VudCA9IGl0ZW1zLmxlbmd0aDtcblxuICAgIGlmICghaXRlbXMgfHwgIWNvdW50KSB7XG4gICAgICBvbkNvbXBsZXRlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGRvbmVDb3VudCA9IDA7XG5cbiAgICBmdW5jdGlvbiB0aWNrKCkge1xuICAgICAgZG9uZUNvdW50Kys7XG5cbiAgICAgIGlmIChkb25lQ291bnQgPT0gY291bnQpIHtcbiAgICAgICAgb25Db21wbGV0ZSgpO1xuICAgICAgfVxuICAgIH0gLy8gYmluZCBjYWxsYmFja1xuXG5cbiAgICBpdGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICBpdGVtLm9uY2UoZXZlbnROYW1lLCB0aWNrKTtcbiAgICB9KTtcbiAgfTtcbiAgLyoqXG4gICAqIGVtaXRzIGV2ZW50cyB2aWEgRXZFbWl0dGVyIGFuZCBqUXVlcnkgZXZlbnRzXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIC0gbmFtZSBvZiBldmVudFxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIG9yaWdpbmFsIGV2ZW50XG4gICAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgLSBleHRyYSBhcmd1bWVudHNcbiAgICovXG5cblxuICBwcm90by5kaXNwYXRjaEV2ZW50ID0gZnVuY3Rpb24gKHR5cGUsIGV2ZW50LCBhcmdzKSB7XG4gICAgLy8gYWRkIG9yaWdpbmFsIGV2ZW50IHRvIGFyZ3VtZW50c1xuICAgIHZhciBlbWl0QXJncyA9IGV2ZW50ID8gW2V2ZW50XS5jb25jYXQoYXJncykgOiBhcmdzO1xuICAgIHRoaXMuZW1pdEV2ZW50KHR5cGUsIGVtaXRBcmdzKTtcblxuICAgIGlmIChqUXVlcnkpIHtcbiAgICAgIC8vIHNldCB0aGlzLiRlbGVtZW50XG4gICAgICB0aGlzLiRlbGVtZW50ID0gdGhpcy4kZWxlbWVudCB8fCBqUXVlcnkodGhpcy5lbGVtZW50KTtcblxuICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgIC8vIGNyZWF0ZSBqUXVlcnkgZXZlbnRcbiAgICAgICAgdmFyICRldmVudCA9IGpRdWVyeS5FdmVudChldmVudCk7XG4gICAgICAgICRldmVudC50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCRldmVudCwgYXJncyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBqdXN0IHRyaWdnZXIgd2l0aCB0eXBlIGlmIG5vIGV2ZW50IGF2YWlsYWJsZVxuICAgICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIodHlwZSwgYXJncyk7XG4gICAgICB9XG4gICAgfVxuICB9OyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBpZ25vcmUgJiBzdGFtcHMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cblxuICAvKipcbiAgICoga2VlcCBpdGVtIGluIGNvbGxlY3Rpb24sIGJ1dCBkbyBub3QgbGF5IGl0IG91dFxuICAgKiBpZ25vcmVkIGl0ZW1zIGRvIG5vdCBnZXQgc2tpcHBlZCBpbiBsYXlvdXRcbiAgICogQHBhcmFtIHtFbGVtZW50fSBlbGVtXG4gICAqL1xuXG5cbiAgcHJvdG8uaWdub3JlID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICB2YXIgaXRlbSA9IHRoaXMuZ2V0SXRlbShlbGVtKTtcblxuICAgIGlmIChpdGVtKSB7XG4gICAgICBpdGVtLmlzSWdub3JlZCA9IHRydWU7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogcmV0dXJuIGl0ZW0gdG8gbGF5b3V0IGNvbGxlY3Rpb25cbiAgICogQHBhcmFtIHtFbGVtZW50fSBlbGVtXG4gICAqL1xuXG5cbiAgcHJvdG8udW5pZ25vcmUgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgIHZhciBpdGVtID0gdGhpcy5nZXRJdGVtKGVsZW0pO1xuXG4gICAgaWYgKGl0ZW0pIHtcbiAgICAgIGRlbGV0ZSBpdGVtLmlzSWdub3JlZDtcbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBhZGRzIGVsZW1lbnRzIHRvIHN0YW1wc1xuICAgKiBAcGFyYW0ge05vZGVMaXN0LCBBcnJheSwgRWxlbWVudCwgb3IgU3RyaW5nfSBlbGVtc1xuICAgKi9cblxuXG4gIHByb3RvLnN0YW1wID0gZnVuY3Rpb24gKGVsZW1zKSB7XG4gICAgZWxlbXMgPSB0aGlzLl9maW5kKGVsZW1zKTtcblxuICAgIGlmICghZWxlbXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnN0YW1wcyA9IHRoaXMuc3RhbXBzLmNvbmNhdChlbGVtcyk7IC8vIGlnbm9yZVxuXG4gICAgZWxlbXMuZm9yRWFjaCh0aGlzLmlnbm9yZSwgdGhpcyk7XG4gIH07XG4gIC8qKlxuICAgKiByZW1vdmVzIGVsZW1lbnRzIHRvIHN0YW1wc1xuICAgKiBAcGFyYW0ge05vZGVMaXN0LCBBcnJheSwgb3IgRWxlbWVudH0gZWxlbXNcbiAgICovXG5cblxuICBwcm90by51bnN0YW1wID0gZnVuY3Rpb24gKGVsZW1zKSB7XG4gICAgZWxlbXMgPSB0aGlzLl9maW5kKGVsZW1zKTtcblxuICAgIGlmICghZWxlbXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBlbGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAvLyBmaWx0ZXIgb3V0IHJlbW92ZWQgc3RhbXAgZWxlbWVudHNcbiAgICAgIHV0aWxzLnJlbW92ZUZyb20odGhpcy5zdGFtcHMsIGVsZW0pO1xuICAgICAgdGhpcy51bmlnbm9yZShlbGVtKTtcbiAgICB9LCB0aGlzKTtcbiAgfTtcbiAgLyoqXG4gICAqIGZpbmRzIGNoaWxkIGVsZW1lbnRzXG4gICAqIEBwYXJhbSB7Tm9kZUxpc3QsIEFycmF5LCBFbGVtZW50LCBvciBTdHJpbmd9IGVsZW1zXG4gICAqIEByZXR1cm5zIHtBcnJheX0gZWxlbXNcbiAgICovXG5cblxuICBwcm90by5fZmluZCA9IGZ1bmN0aW9uIChlbGVtcykge1xuICAgIGlmICghZWxlbXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIGlmIHN0cmluZywgdXNlIGFyZ3VtZW50IGFzIHNlbGVjdG9yIHN0cmluZ1xuXG5cbiAgICBpZiAodHlwZW9mIGVsZW1zID09ICdzdHJpbmcnKSB7XG4gICAgICBlbGVtcyA9IHRoaXMuZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKGVsZW1zKTtcbiAgICB9XG5cbiAgICBlbGVtcyA9IHV0aWxzLm1ha2VBcnJheShlbGVtcyk7XG4gICAgcmV0dXJuIGVsZW1zO1xuICB9O1xuXG4gIHByb3RvLl9tYW5hZ2VTdGFtcHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLnN0YW1wcyB8fCAhdGhpcy5zdGFtcHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fZ2V0Qm91bmRpbmdSZWN0KCk7XG5cbiAgICB0aGlzLnN0YW1wcy5mb3JFYWNoKHRoaXMuX21hbmFnZVN0YW1wLCB0aGlzKTtcbiAgfTsgLy8gdXBkYXRlIGJvdW5kaW5nTGVmdCAvIFRvcFxuXG5cbiAgcHJvdG8uX2dldEJvdW5kaW5nUmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBnZXQgYm91bmRpbmcgcmVjdCBmb3IgY29udGFpbmVyIGVsZW1lbnRcbiAgICB2YXIgYm91bmRpbmdSZWN0ID0gdGhpcy5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHZhciBzaXplID0gdGhpcy5zaXplO1xuICAgIHRoaXMuX2JvdW5kaW5nUmVjdCA9IHtcbiAgICAgIGxlZnQ6IGJvdW5kaW5nUmVjdC5sZWZ0ICsgc2l6ZS5wYWRkaW5nTGVmdCArIHNpemUuYm9yZGVyTGVmdFdpZHRoLFxuICAgICAgdG9wOiBib3VuZGluZ1JlY3QudG9wICsgc2l6ZS5wYWRkaW5nVG9wICsgc2l6ZS5ib3JkZXJUb3BXaWR0aCxcbiAgICAgIHJpZ2h0OiBib3VuZGluZ1JlY3QucmlnaHQgLSAoc2l6ZS5wYWRkaW5nUmlnaHQgKyBzaXplLmJvcmRlclJpZ2h0V2lkdGgpLFxuICAgICAgYm90dG9tOiBib3VuZGluZ1JlY3QuYm90dG9tIC0gKHNpemUucGFkZGluZ0JvdHRvbSArIHNpemUuYm9yZGVyQm90dG9tV2lkdGgpXG4gICAgfTtcbiAgfTtcbiAgLyoqXG4gICAqIEBwYXJhbSB7RWxlbWVudH0gc3RhbXBcbiAgKiovXG5cblxuICBwcm90by5fbWFuYWdlU3RhbXAgPSBub29wO1xuICAvKipcbiAgICogZ2V0IHgveSBwb3NpdGlvbiBvZiBlbGVtZW50IHJlbGF0aXZlIHRvIGNvbnRhaW5lciBlbGVtZW50XG4gICAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBvZmZzZXQgLSBoYXMgbGVmdCwgdG9wLCByaWdodCwgYm90dG9tXG4gICAqL1xuXG4gIHByb3RvLl9nZXRFbGVtZW50T2Zmc2V0ID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICB2YXIgYm91bmRpbmdSZWN0ID0gZWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICB2YXIgdGhpc1JlY3QgPSB0aGlzLl9ib3VuZGluZ1JlY3Q7XG4gICAgdmFyIHNpemUgPSBnZXRTaXplKGVsZW0pO1xuICAgIHZhciBvZmZzZXQgPSB7XG4gICAgICBsZWZ0OiBib3VuZGluZ1JlY3QubGVmdCAtIHRoaXNSZWN0LmxlZnQgLSBzaXplLm1hcmdpbkxlZnQsXG4gICAgICB0b3A6IGJvdW5kaW5nUmVjdC50b3AgLSB0aGlzUmVjdC50b3AgLSBzaXplLm1hcmdpblRvcCxcbiAgICAgIHJpZ2h0OiB0aGlzUmVjdC5yaWdodCAtIGJvdW5kaW5nUmVjdC5yaWdodCAtIHNpemUubWFyZ2luUmlnaHQsXG4gICAgICBib3R0b206IHRoaXNSZWN0LmJvdHRvbSAtIGJvdW5kaW5nUmVjdC5ib3R0b20gLSBzaXplLm1hcmdpbkJvdHRvbVxuICAgIH07XG4gICAgcmV0dXJuIG9mZnNldDtcbiAgfTsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gcmVzaXplIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG4gIC8vIGVuYWJsZSBldmVudCBoYW5kbGVycyBmb3IgbGlzdGVuZXJzXG4gIC8vIGkuZS4gcmVzaXplIC0+IG9ucmVzaXplXG5cblxuICBwcm90by5oYW5kbGVFdmVudCA9IHV0aWxzLmhhbmRsZUV2ZW50O1xuICAvKipcbiAgICogQmluZCBsYXlvdXQgdG8gd2luZG93IHJlc2l6aW5nXG4gICAqL1xuXG4gIHByb3RvLmJpbmRSZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMpO1xuICAgIHRoaXMuaXNSZXNpemVCb3VuZCA9IHRydWU7XG4gIH07XG4gIC8qKlxuICAgKiBVbmJpbmQgbGF5b3V0IHRvIHdpbmRvdyByZXNpemluZ1xuICAgKi9cblxuXG4gIHByb3RvLnVuYmluZFJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcyk7XG4gICAgdGhpcy5pc1Jlc2l6ZUJvdW5kID0gZmFsc2U7XG4gIH07XG5cbiAgcHJvdG8ub25yZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5yZXNpemUoKTtcbiAgfTtcblxuICB1dGlscy5kZWJvdW5jZU1ldGhvZChPdXRsYXllciwgJ29ucmVzaXplJywgMTAwKTtcblxuICBwcm90by5yZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gZG9uJ3QgdHJpZ2dlciBpZiBzaXplIGRpZCBub3QgY2hhbmdlXG4gICAgLy8gb3IgaWYgcmVzaXplIHdhcyB1bmJvdW5kLiBTZWUgIzlcbiAgICBpZiAoIXRoaXMuaXNSZXNpemVCb3VuZCB8fCAhdGhpcy5uZWVkc1Jlc2l6ZUxheW91dCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5sYXlvdXQoKTtcbiAgfTtcbiAgLyoqXG4gICAqIGNoZWNrIGlmIGxheW91dCBpcyBuZWVkZWQgcG9zdCBsYXlvdXRcbiAgICogQHJldHVybnMgQm9vbGVhblxuICAgKi9cblxuXG4gIHByb3RvLm5lZWRzUmVzaXplTGF5b3V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzaXplID0gZ2V0U2l6ZSh0aGlzLmVsZW1lbnQpOyAvLyBjaGVjayB0aGF0IHRoaXMuc2l6ZSBhbmQgc2l6ZSBhcmUgdGhlcmVcbiAgICAvLyBJRTggdHJpZ2dlcnMgcmVzaXplIG9uIGJvZHkgc2l6ZSBjaGFuZ2UsIHNvIHRoZXkgbWlnaHQgbm90IGJlXG5cbiAgICB2YXIgaGFzU2l6ZXMgPSB0aGlzLnNpemUgJiYgc2l6ZTtcbiAgICByZXR1cm4gaGFzU2l6ZXMgJiYgc2l6ZS5pbm5lcldpZHRoICE9PSB0aGlzLnNpemUuaW5uZXJXaWR0aDtcbiAgfTsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gbWV0aG9kcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG4gIC8qKlxuICAgKiBhZGQgaXRlbXMgdG8gT3V0bGF5ZXIgaW5zdGFuY2VcbiAgICogQHBhcmFtIHtBcnJheSBvciBOb2RlTGlzdCBvciBFbGVtZW50fSBlbGVtc1xuICAgKiBAcmV0dXJucyB7QXJyYXl9IGl0ZW1zIC0gT3V0bGF5ZXIuSXRlbXNcbiAgKiovXG5cblxuICBwcm90by5hZGRJdGVtcyA9IGZ1bmN0aW9uIChlbGVtcykge1xuICAgIHZhciBpdGVtcyA9IHRoaXMuX2l0ZW1pemUoZWxlbXMpOyAvLyBhZGQgaXRlbXMgdG8gY29sbGVjdGlvblxuXG5cbiAgICBpZiAoaXRlbXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLml0ZW1zID0gdGhpcy5pdGVtcy5jb25jYXQoaXRlbXMpO1xuICAgIH1cblxuICAgIHJldHVybiBpdGVtcztcbiAgfTtcbiAgLyoqXG4gICAqIExheW91dCBuZXdseS1hcHBlbmRlZCBpdGVtIGVsZW1lbnRzXG4gICAqIEBwYXJhbSB7QXJyYXkgb3IgTm9kZUxpc3Qgb3IgRWxlbWVudH0gZWxlbXNcbiAgICovXG5cblxuICBwcm90by5hcHBlbmRlZCA9IGZ1bmN0aW9uIChlbGVtcykge1xuICAgIHZhciBpdGVtcyA9IHRoaXMuYWRkSXRlbXMoZWxlbXMpO1xuXG4gICAgaWYgKCFpdGVtcy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIGxheW91dCBhbmQgcmV2ZWFsIGp1c3QgdGhlIG5ldyBpdGVtc1xuXG5cbiAgICB0aGlzLmxheW91dEl0ZW1zKGl0ZW1zLCB0cnVlKTtcbiAgICB0aGlzLnJldmVhbChpdGVtcyk7XG4gIH07XG4gIC8qKlxuICAgKiBMYXlvdXQgcHJlcGVuZGVkIGVsZW1lbnRzXG4gICAqIEBwYXJhbSB7QXJyYXkgb3IgTm9kZUxpc3Qgb3IgRWxlbWVudH0gZWxlbXNcbiAgICovXG5cblxuICBwcm90by5wcmVwZW5kZWQgPSBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICB2YXIgaXRlbXMgPSB0aGlzLl9pdGVtaXplKGVsZW1zKTtcblxuICAgIGlmICghaXRlbXMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBhZGQgaXRlbXMgdG8gYmVnaW5uaW5nIG9mIGNvbGxlY3Rpb25cblxuXG4gICAgdmFyIHByZXZpb3VzSXRlbXMgPSB0aGlzLml0ZW1zLnNsaWNlKDApO1xuICAgIHRoaXMuaXRlbXMgPSBpdGVtcy5jb25jYXQocHJldmlvdXNJdGVtcyk7IC8vIHN0YXJ0IG5ldyBsYXlvdXRcblxuICAgIHRoaXMuX3Jlc2V0TGF5b3V0KCk7XG5cbiAgICB0aGlzLl9tYW5hZ2VTdGFtcHMoKTsgLy8gbGF5b3V0IG5ldyBzdHVmZiB3aXRob3V0IHRyYW5zaXRpb25cblxuXG4gICAgdGhpcy5sYXlvdXRJdGVtcyhpdGVtcywgdHJ1ZSk7XG4gICAgdGhpcy5yZXZlYWwoaXRlbXMpOyAvLyBsYXlvdXQgcHJldmlvdXMgaXRlbXNcblxuICAgIHRoaXMubGF5b3V0SXRlbXMocHJldmlvdXNJdGVtcyk7XG4gIH07XG4gIC8qKlxuICAgKiByZXZlYWwgYSBjb2xsZWN0aW9uIG9mIGl0ZW1zXG4gICAqIEBwYXJhbSB7QXJyYXkgb2YgT3V0bGF5ZXIuSXRlbXN9IGl0ZW1zXG4gICAqL1xuXG5cbiAgcHJvdG8ucmV2ZWFsID0gZnVuY3Rpb24gKGl0ZW1zKSB7XG4gICAgdGhpcy5fZW1pdENvbXBsZXRlT25JdGVtcygncmV2ZWFsJywgaXRlbXMpO1xuXG4gICAgaWYgKCFpdGVtcyB8fCAhaXRlbXMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHN0YWdnZXIgPSB0aGlzLnVwZGF0ZVN0YWdnZXIoKTtcbiAgICBpdGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtLCBpKSB7XG4gICAgICBpdGVtLnN0YWdnZXIoaSAqIHN0YWdnZXIpO1xuICAgICAgaXRlbS5yZXZlYWwoKTtcbiAgICB9KTtcbiAgfTtcbiAgLyoqXG4gICAqIGhpZGUgYSBjb2xsZWN0aW9uIG9mIGl0ZW1zXG4gICAqIEBwYXJhbSB7QXJyYXkgb2YgT3V0bGF5ZXIuSXRlbXN9IGl0ZW1zXG4gICAqL1xuXG5cbiAgcHJvdG8uaGlkZSA9IGZ1bmN0aW9uIChpdGVtcykge1xuICAgIHRoaXMuX2VtaXRDb21wbGV0ZU9uSXRlbXMoJ2hpZGUnLCBpdGVtcyk7XG5cbiAgICBpZiAoIWl0ZW1zIHx8ICFpdGVtcy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3RhZ2dlciA9IHRoaXMudXBkYXRlU3RhZ2dlcigpO1xuICAgIGl0ZW1zLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0sIGkpIHtcbiAgICAgIGl0ZW0uc3RhZ2dlcihpICogc3RhZ2dlcik7XG4gICAgICBpdGVtLmhpZGUoKTtcbiAgICB9KTtcbiAgfTtcbiAgLyoqXG4gICAqIHJldmVhbCBpdGVtIGVsZW1lbnRzXG4gICAqIEBwYXJhbSB7QXJyYXl9LCB7RWxlbWVudH0sIHtOb2RlTGlzdH0gaXRlbXNcbiAgICovXG5cblxuICBwcm90by5yZXZlYWxJdGVtRWxlbWVudHMgPSBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICB2YXIgaXRlbXMgPSB0aGlzLmdldEl0ZW1zKGVsZW1zKTtcbiAgICB0aGlzLnJldmVhbChpdGVtcyk7XG4gIH07XG4gIC8qKlxuICAgKiBoaWRlIGl0ZW0gZWxlbWVudHNcbiAgICogQHBhcmFtIHtBcnJheX0sIHtFbGVtZW50fSwge05vZGVMaXN0fSBpdGVtc1xuICAgKi9cblxuXG4gIHByb3RvLmhpZGVJdGVtRWxlbWVudHMgPSBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICB2YXIgaXRlbXMgPSB0aGlzLmdldEl0ZW1zKGVsZW1zKTtcbiAgICB0aGlzLmhpZGUoaXRlbXMpO1xuICB9O1xuICAvKipcbiAgICogZ2V0IE91dGxheWVyLkl0ZW0sIGdpdmVuIGFuIEVsZW1lbnRcbiAgICogQHBhcmFtIHtFbGVtZW50fSBlbGVtXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAqIEByZXR1cm5zIHtPdXRsYXllci5JdGVtfSBpdGVtXG4gICAqL1xuXG5cbiAgcHJvdG8uZ2V0SXRlbSA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgLy8gbG9vcCB0aHJvdWdoIGl0ZW1zIHRvIGdldCB0aGUgb25lIHRoYXQgbWF0Y2hlc1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGl0ZW0gPSB0aGlzLml0ZW1zW2ldO1xuXG4gICAgICBpZiAoaXRlbS5lbGVtZW50ID09IGVsZW0pIHtcbiAgICAgICAgLy8gcmV0dXJuIGl0ZW1cbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgICB9XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogZ2V0IGNvbGxlY3Rpb24gb2YgT3V0bGF5ZXIuSXRlbXMsIGdpdmVuIEVsZW1lbnRzXG4gICAqIEBwYXJhbSB7QXJyYXl9IGVsZW1zXG4gICAqIEByZXR1cm5zIHtBcnJheX0gaXRlbXMgLSBPdXRsYXllci5JdGVtc1xuICAgKi9cblxuXG4gIHByb3RvLmdldEl0ZW1zID0gZnVuY3Rpb24gKGVsZW1zKSB7XG4gICAgZWxlbXMgPSB1dGlscy5tYWtlQXJyYXkoZWxlbXMpO1xuICAgIHZhciBpdGVtcyA9IFtdO1xuICAgIGVsZW1zLmZvckVhY2goZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgIHZhciBpdGVtID0gdGhpcy5nZXRJdGVtKGVsZW0pO1xuXG4gICAgICBpZiAoaXRlbSkge1xuICAgICAgICBpdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuICAgIHJldHVybiBpdGVtcztcbiAgfTtcbiAgLyoqXG4gICAqIHJlbW92ZSBlbGVtZW50KHMpIGZyb20gaW5zdGFuY2UgYW5kIERPTVxuICAgKiBAcGFyYW0ge0FycmF5IG9yIE5vZGVMaXN0IG9yIEVsZW1lbnR9IGVsZW1zXG4gICAqL1xuXG5cbiAgcHJvdG8ucmVtb3ZlID0gZnVuY3Rpb24gKGVsZW1zKSB7XG4gICAgdmFyIHJlbW92ZUl0ZW1zID0gdGhpcy5nZXRJdGVtcyhlbGVtcyk7XG5cbiAgICB0aGlzLl9lbWl0Q29tcGxldGVPbkl0ZW1zKCdyZW1vdmUnLCByZW1vdmVJdGVtcyk7IC8vIGJhaWwgaWYgbm8gaXRlbXMgdG8gcmVtb3ZlXG5cblxuICAgIGlmICghcmVtb3ZlSXRlbXMgfHwgIXJlbW92ZUl0ZW1zLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHJlbW92ZUl0ZW1zLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIGl0ZW0ucmVtb3ZlKCk7IC8vIHJlbW92ZSBpdGVtIGZyb20gY29sbGVjdGlvblxuXG4gICAgICB1dGlscy5yZW1vdmVGcm9tKHRoaXMuaXRlbXMsIGl0ZW0pO1xuICAgIH0sIHRoaXMpO1xuICB9OyAvLyAtLS0tLSBkZXN0cm95IC0tLS0tIC8vXG4gIC8vIHJlbW92ZSBhbmQgZGlzYWJsZSBPdXRsYXllciBpbnN0YW5jZVxuXG5cbiAgcHJvdG8uZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBjbGVhbiB1cCBkeW5hbWljIHN0eWxlc1xuICAgIHZhciBzdHlsZSA9IHRoaXMuZWxlbWVudC5zdHlsZTtcbiAgICBzdHlsZS5oZWlnaHQgPSAnJztcbiAgICBzdHlsZS5wb3NpdGlvbiA9ICcnO1xuICAgIHN0eWxlLndpZHRoID0gJyc7IC8vIGRlc3Ryb3kgaXRlbXNcblxuICAgIHRoaXMuaXRlbXMuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgaXRlbS5kZXN0cm95KCk7XG4gICAgfSk7XG4gICAgdGhpcy51bmJpbmRSZXNpemUoKTtcbiAgICB2YXIgaWQgPSB0aGlzLmVsZW1lbnQub3V0bGF5ZXJHVUlEO1xuICAgIGRlbGV0ZSBpbnN0YW5jZXNbaWRdOyAvLyByZW1vdmUgcmVmZXJlbmNlIHRvIGluc3RhbmNlIGJ5IGlkXG5cbiAgICBkZWxldGUgdGhpcy5lbGVtZW50Lm91dGxheWVyR1VJRDsgLy8gcmVtb3ZlIGRhdGEgZm9yIGpRdWVyeVxuXG4gICAgaWYgKGpRdWVyeSkge1xuICAgICAgalF1ZXJ5LnJlbW92ZURhdGEodGhpcy5lbGVtZW50LCB0aGlzLmNvbnN0cnVjdG9yLm5hbWVzcGFjZSk7XG4gICAgfVxuICB9OyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBkYXRhIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cbiAgLyoqXG4gICAqIGdldCBPdXRsYXllciBpbnN0YW5jZSBmcm9tIGVsZW1lbnRcbiAgICogQHBhcmFtIHtFbGVtZW50fSBlbGVtXG4gICAqIEByZXR1cm5zIHtPdXRsYXllcn1cbiAgICovXG5cblxuICBPdXRsYXllci5kYXRhID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICBlbGVtID0gdXRpbHMuZ2V0UXVlcnlFbGVtZW50KGVsZW0pO1xuICAgIHZhciBpZCA9IGVsZW0gJiYgZWxlbS5vdXRsYXllckdVSUQ7XG4gICAgcmV0dXJuIGlkICYmIGluc3RhbmNlc1tpZF07XG4gIH07IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGNyZWF0ZSBPdXRsYXllciBjbGFzcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG4gIC8qKlxuICAgKiBjcmVhdGUgYSBsYXlvdXQgY2xhc3NcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVzcGFjZVxuICAgKi9cblxuXG4gIE91dGxheWVyLmNyZWF0ZSA9IGZ1bmN0aW9uIChuYW1lc3BhY2UsIG9wdGlvbnMpIHtcbiAgICAvLyBzdWItY2xhc3MgT3V0bGF5ZXJcbiAgICB2YXIgTGF5b3V0ID0gc3ViY2xhc3MoT3V0bGF5ZXIpOyAvLyBhcHBseSBuZXcgb3B0aW9ucyBhbmQgY29tcGF0T3B0aW9uc1xuXG4gICAgTGF5b3V0LmRlZmF1bHRzID0gdXRpbHMuZXh0ZW5kKHt9LCBPdXRsYXllci5kZWZhdWx0cyk7XG4gICAgdXRpbHMuZXh0ZW5kKExheW91dC5kZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgTGF5b3V0LmNvbXBhdE9wdGlvbnMgPSB1dGlscy5leHRlbmQoe30sIE91dGxheWVyLmNvbXBhdE9wdGlvbnMpO1xuICAgIExheW91dC5uYW1lc3BhY2UgPSBuYW1lc3BhY2U7XG4gICAgTGF5b3V0LmRhdGEgPSBPdXRsYXllci5kYXRhOyAvLyBzdWItY2xhc3MgSXRlbVxuXG4gICAgTGF5b3V0Lkl0ZW0gPSBzdWJjbGFzcyhJdGVtKTsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gZGVjbGFyYXRpdmUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cblxuICAgIHV0aWxzLmh0bWxJbml0KExheW91dCwgbmFtZXNwYWNlKTsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0galF1ZXJ5IGJyaWRnZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuICAgIC8vIG1ha2UgaW50byBqUXVlcnkgcGx1Z2luXG5cbiAgICBpZiAoalF1ZXJ5ICYmIGpRdWVyeS5icmlkZ2V0KSB7XG4gICAgICBqUXVlcnkuYnJpZGdldChuYW1lc3BhY2UsIExheW91dCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIExheW91dDtcbiAgfTtcblxuICBmdW5jdGlvbiBzdWJjbGFzcyhQYXJlbnQpIHtcbiAgICBmdW5jdGlvbiBTdWJDbGFzcygpIHtcbiAgICAgIFBhcmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIFN1YkNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGFyZW50LnByb3RvdHlwZSk7XG4gICAgU3ViQ2xhc3MucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3ViQ2xhc3M7XG4gICAgcmV0dXJuIFN1YkNsYXNzO1xuICB9IC8vIC0tLS0tIGhlbHBlcnMgLS0tLS0gLy9cbiAgLy8gaG93IG1hbnkgbWlsbGlzZWNvbmRzIGFyZSBpbiBlYWNoIHVuaXRcblxuXG4gIHZhciBtc1VuaXRzID0ge1xuICAgIG1zOiAxLFxuICAgIHM6IDEwMDBcbiAgfTsgLy8gbXVuZ2UgdGltZS1saWtlIHBhcmFtZXRlciBpbnRvIG1pbGxpc2Vjb25kIG51bWJlclxuICAvLyAnMC40cycgLT4gNDBcblxuICBmdW5jdGlvbiBnZXRNaWxsaXNlY29uZHModGltZSkge1xuICAgIGlmICh0eXBlb2YgdGltZSA9PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHRpbWU7XG4gICAgfVxuXG4gICAgdmFyIG1hdGNoZXMgPSB0aW1lLm1hdGNoKC8oXlxcZCpcXC4/XFxkKikoXFx3KikvKTtcbiAgICB2YXIgbnVtID0gbWF0Y2hlcyAmJiBtYXRjaGVzWzFdO1xuICAgIHZhciB1bml0ID0gbWF0Y2hlcyAmJiBtYXRjaGVzWzJdO1xuXG4gICAgaWYgKCFudW0ubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBudW0gPSBwYXJzZUZsb2F0KG51bSk7XG4gICAgdmFyIG11bHQgPSBtc1VuaXRzW3VuaXRdIHx8IDE7XG4gICAgcmV0dXJuIG51bSAqIG11bHQ7XG4gIH0gLy8gLS0tLS0gZmluIC0tLS0tIC8vXG4gIC8vIGJhY2sgaW4gZ2xvYmFsXG5cblxuICBPdXRsYXllci5JdGVtID0gSXRlbTtcbiAgcmV0dXJuIE91dGxheWVyO1xufSk7XG4vKipcbiAqIElzb3RvcGUgSXRlbVxuKiovXG5cblxuKGZ1bmN0aW9uICh3aW5kb3csIGZhY3RvcnkpIHtcbiAgLy8gdW5pdmVyc2FsIG1vZHVsZSBkZWZpbml0aW9uXG5cbiAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cblxuICAvKmdsb2JhbHMgZGVmaW5lLCBtb2R1bGUsIHJlcXVpcmUgKi9cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EXG4gICAgZGVmaW5lKCdpc290b3BlLWxheW91dC9qcy9pdGVtJywgWydvdXRsYXllci9vdXRsYXllciddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIG1vZHVsZSA9PT0gXCJ1bmRlZmluZWRcIiA/IFwidW5kZWZpbmVkXCIgOiBfdHlwZW9mKG1vZHVsZSkpID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnb3V0bGF5ZXInKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gYnJvd3NlciBnbG9iYWxcbiAgICB3aW5kb3cuSXNvdG9wZSA9IHdpbmRvdy5Jc290b3BlIHx8IHt9O1xuICAgIHdpbmRvdy5Jc290b3BlLkl0ZW0gPSBmYWN0b3J5KHdpbmRvdy5PdXRsYXllcik7XG4gIH1cbn0pKHdpbmRvdywgZnVuY3Rpb24gZmFjdG9yeShPdXRsYXllcikge1xuICAndXNlIHN0cmljdCc7IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIEl0ZW0gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cbiAgLy8gc3ViLWNsYXNzIE91dGxheWVyIEl0ZW1cblxuICBmdW5jdGlvbiBJdGVtKCkge1xuICAgIE91dGxheWVyLkl0ZW0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHZhciBwcm90byA9IEl0ZW0ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPdXRsYXllci5JdGVtLnByb3RvdHlwZSk7XG4gIHZhciBfY3JlYXRlID0gcHJvdG8uX2NyZWF0ZTtcblxuICBwcm90by5fY3JlYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGFzc2lnbiBpZCwgdXNlZCBmb3Igb3JpZ2luYWwtb3JkZXIgc29ydGluZ1xuICAgIHRoaXMuaWQgPSB0aGlzLmxheW91dC5pdGVtR1VJRCsrO1xuXG4gICAgX2NyZWF0ZS5jYWxsKHRoaXMpO1xuXG4gICAgdGhpcy5zb3J0RGF0YSA9IHt9O1xuICB9O1xuXG4gIHByb3RvLnVwZGF0ZVNvcnREYXRhID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlzSWdub3JlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gZGVmYXVsdCBzb3J0ZXJzXG5cblxuICAgIHRoaXMuc29ydERhdGEuaWQgPSB0aGlzLmlkOyAvLyBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuXG4gICAgdGhpcy5zb3J0RGF0YVsnb3JpZ2luYWwtb3JkZXInXSA9IHRoaXMuaWQ7XG4gICAgdGhpcy5zb3J0RGF0YS5yYW5kb20gPSBNYXRoLnJhbmRvbSgpOyAvLyBnbyB0aHJ1IGdldFNvcnREYXRhIG9iaiBhbmQgYXBwbHkgdGhlIHNvcnRlcnNcblxuICAgIHZhciBnZXRTb3J0RGF0YSA9IHRoaXMubGF5b3V0Lm9wdGlvbnMuZ2V0U29ydERhdGE7XG4gICAgdmFyIHNvcnRlcnMgPSB0aGlzLmxheW91dC5fc29ydGVycztcblxuICAgIGZvciAodmFyIGtleSBpbiBnZXRTb3J0RGF0YSkge1xuICAgICAgdmFyIHNvcnRlciA9IHNvcnRlcnNba2V5XTtcbiAgICAgIHRoaXMuc29ydERhdGFba2V5XSA9IHNvcnRlcih0aGlzLmVsZW1lbnQsIHRoaXMpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgX2Rlc3Ryb3kgPSBwcm90by5kZXN0cm95O1xuXG4gIHByb3RvLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY2FsbCBzdXBlclxuICAgIF9kZXN0cm95LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IC8vIHJlc2V0IGRpc3BsYXksICM3NDFcblxuXG4gICAgdGhpcy5jc3Moe1xuICAgICAgZGlzcGxheTogJydcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gSXRlbTtcbn0pO1xuLyoqXG4gKiBJc290b3BlIExheW91dE1vZGVcbiAqL1xuXG5cbihmdW5jdGlvbiAod2luZG93LCBmYWN0b3J5KSB7XG4gIC8vIHVuaXZlcnNhbCBtb2R1bGUgZGVmaW5pdGlvblxuXG4gIC8qIGpzaGludCBzdHJpY3Q6IGZhbHNlICovXG5cbiAgLypnbG9iYWxzIGRlZmluZSwgbW9kdWxlLCByZXF1aXJlICovXG4gIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRFxuICAgIGRlZmluZSgnaXNvdG9wZS1sYXlvdXQvanMvbGF5b3V0LW1vZGUnLCBbJ2dldC1zaXplL2dldC1zaXplJywgJ291dGxheWVyL291dGxheWVyJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgbW9kdWxlID09PSBcInVuZGVmaW5lZFwiID8gXCJ1bmRlZmluZWRcIiA6IF90eXBlb2YobW9kdWxlKSkgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCdnZXQtc2l6ZScpLCByZXF1aXJlKCdvdXRsYXllcicpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBicm93c2VyIGdsb2JhbFxuICAgIHdpbmRvdy5Jc290b3BlID0gd2luZG93Lklzb3RvcGUgfHwge307XG4gICAgd2luZG93Lklzb3RvcGUuTGF5b3V0TW9kZSA9IGZhY3Rvcnkod2luZG93LmdldFNpemUsIHdpbmRvdy5PdXRsYXllcik7XG4gIH1cbn0pKHdpbmRvdywgZnVuY3Rpb24gZmFjdG9yeShnZXRTaXplLCBPdXRsYXllcikge1xuICAndXNlIHN0cmljdCc7IC8vIGxheW91dCBtb2RlIGNsYXNzXG5cbiAgZnVuY3Rpb24gTGF5b3V0TW9kZShpc290b3BlKSB7XG4gICAgdGhpcy5pc290b3BlID0gaXNvdG9wZTsgLy8gbGluayBwcm9wZXJ0aWVzXG5cbiAgICBpZiAoaXNvdG9wZSkge1xuICAgICAgdGhpcy5vcHRpb25zID0gaXNvdG9wZS5vcHRpb25zW3RoaXMubmFtZXNwYWNlXTtcbiAgICAgIHRoaXMuZWxlbWVudCA9IGlzb3RvcGUuZWxlbWVudDtcbiAgICAgIHRoaXMuaXRlbXMgPSBpc290b3BlLmZpbHRlcmVkSXRlbXM7XG4gICAgICB0aGlzLnNpemUgPSBpc290b3BlLnNpemU7XG4gICAgfVxuICB9XG5cbiAgdmFyIHByb3RvID0gTGF5b3V0TW9kZS5wcm90b3R5cGU7XG4gIC8qKlxuICAgKiBzb21lIG1ldGhvZHMgc2hvdWxkIGp1c3QgZGVmZXIgdG8gZGVmYXVsdCBPdXRsYXllciBtZXRob2RcbiAgICogYW5kIHJlZmVyZW5jZSB0aGUgSXNvdG9wZSBpbnN0YW5jZSBhcyBgdGhpc2BcbiAgKiovXG5cbiAgdmFyIGZhY2FkZU1ldGhvZHMgPSBbJ19yZXNldExheW91dCcsICdfZ2V0SXRlbUxheW91dFBvc2l0aW9uJywgJ19tYW5hZ2VTdGFtcCcsICdfZ2V0Q29udGFpbmVyU2l6ZScsICdfZ2V0RWxlbWVudE9mZnNldCcsICduZWVkc1Jlc2l6ZUxheW91dCcsICdfZ2V0T3B0aW9uJ107XG4gIGZhY2FkZU1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kTmFtZSkge1xuICAgIHByb3RvW21ldGhvZE5hbWVdID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIE91dGxheWVyLnByb3RvdHlwZVttZXRob2ROYW1lXS5hcHBseSh0aGlzLmlzb3RvcGUsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfSk7IC8vIC0tLS0tICAtLS0tLSAvL1xuICAvLyBmb3IgaG9yaXpvbnRhbCBsYXlvdXQgbW9kZXMsIGNoZWNrIHZlcnRpY2FsIHNpemVcblxuICBwcm90by5uZWVkc1ZlcnRpY2FsUmVzaXplTGF5b3V0ID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGRvbid0IHRyaWdnZXIgaWYgc2l6ZSBkaWQgbm90IGNoYW5nZVxuICAgIHZhciBzaXplID0gZ2V0U2l6ZSh0aGlzLmlzb3RvcGUuZWxlbWVudCk7IC8vIGNoZWNrIHRoYXQgdGhpcy5zaXplIGFuZCBzaXplIGFyZSB0aGVyZVxuICAgIC8vIElFOCB0cmlnZ2VycyByZXNpemUgb24gYm9keSBzaXplIGNoYW5nZSwgc28gdGhleSBtaWdodCBub3QgYmVcblxuICAgIHZhciBoYXNTaXplcyA9IHRoaXMuaXNvdG9wZS5zaXplICYmIHNpemU7XG4gICAgcmV0dXJuIGhhc1NpemVzICYmIHNpemUuaW5uZXJIZWlnaHQgIT0gdGhpcy5pc290b3BlLnNpemUuaW5uZXJIZWlnaHQ7XG4gIH07IC8vIC0tLS0tIG1lYXN1cmVtZW50cyAtLS0tLSAvL1xuXG5cbiAgcHJvdG8uX2dldE1lYXN1cmVtZW50ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaXNvdG9wZS5fZ2V0TWVhc3VyZW1lbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcblxuICBwcm90by5nZXRDb2x1bW5XaWR0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmdldFNlZ21lbnRTaXplKCdjb2x1bW4nLCAnV2lkdGgnKTtcbiAgfTtcblxuICBwcm90by5nZXRSb3dIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5nZXRTZWdtZW50U2l6ZSgncm93JywgJ0hlaWdodCcpO1xuICB9O1xuICAvKipcbiAgICogZ2V0IGNvbHVtbldpZHRoIG9yIHJvd0hlaWdodFxuICAgKiBzZWdtZW50OiAnY29sdW1uJyBvciAncm93J1xuICAgKiBzaXplICdXaWR0aCcgb3IgJ0hlaWdodCdcbiAgKiovXG5cblxuICBwcm90by5nZXRTZWdtZW50U2l6ZSA9IGZ1bmN0aW9uIChzZWdtZW50LCBzaXplKSB7XG4gICAgdmFyIHNlZ21lbnROYW1lID0gc2VnbWVudCArIHNpemU7XG4gICAgdmFyIG91dGVyU2l6ZSA9ICdvdXRlcicgKyBzaXplOyAvLyBjb2x1bW5XaWR0aCAvIG91dGVyV2lkdGggLy8gcm93SGVpZ2h0IC8gb3V0ZXJIZWlnaHRcblxuICAgIHRoaXMuX2dldE1lYXN1cmVtZW50KHNlZ21lbnROYW1lLCBvdXRlclNpemUpOyAvLyBnb3Qgcm93SGVpZ2h0IG9yIGNvbHVtbldpZHRoLCB3ZSBjYW4gY2hpbGxcblxuXG4gICAgaWYgKHRoaXNbc2VnbWVudE5hbWVdKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBmYWxsIGJhY2sgdG8gaXRlbSBvZiBmaXJzdCBlbGVtZW50XG5cblxuICAgIHZhciBmaXJzdEl0ZW1TaXplID0gdGhpcy5nZXRGaXJzdEl0ZW1TaXplKCk7XG4gICAgdGhpc1tzZWdtZW50TmFtZV0gPSBmaXJzdEl0ZW1TaXplICYmIGZpcnN0SXRlbVNpemVbb3V0ZXJTaXplXSB8fCAvLyBvciBzaXplIG9mIGNvbnRhaW5lclxuICAgIHRoaXMuaXNvdG9wZS5zaXplWydpbm5lcicgKyBzaXplXTtcbiAgfTtcblxuICBwcm90by5nZXRGaXJzdEl0ZW1TaXplID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBmaXJzdEl0ZW0gPSB0aGlzLmlzb3RvcGUuZmlsdGVyZWRJdGVtc1swXTtcbiAgICByZXR1cm4gZmlyc3RJdGVtICYmIGZpcnN0SXRlbS5lbGVtZW50ICYmIGdldFNpemUoZmlyc3RJdGVtLmVsZW1lbnQpO1xuICB9OyAvLyAtLS0tLSBtZXRob2RzIHRoYXQgc2hvdWxkIHJlZmVyZW5jZSBpc290b3BlIC0tLS0tIC8vXG5cblxuICBwcm90by5sYXlvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pc290b3BlLmxheW91dC5hcHBseSh0aGlzLmlzb3RvcGUsIGFyZ3VtZW50cyk7XG4gIH07XG5cbiAgcHJvdG8uZ2V0U2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmlzb3RvcGUuZ2V0U2l6ZSgpO1xuICAgIHRoaXMuc2l6ZSA9IHRoaXMuaXNvdG9wZS5zaXplO1xuICB9OyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBjcmVhdGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cblxuXG4gIExheW91dE1vZGUubW9kZXMgPSB7fTtcblxuICBMYXlvdXRNb2RlLmNyZWF0ZSA9IGZ1bmN0aW9uIChuYW1lc3BhY2UsIG9wdGlvbnMpIHtcbiAgICBmdW5jdGlvbiBNb2RlKCkge1xuICAgICAgTGF5b3V0TW9kZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIE1vZGUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShwcm90byk7XG4gICAgTW9kZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBNb2RlOyAvLyBkZWZhdWx0IG9wdGlvbnNcblxuICAgIGlmIChvcHRpb25zKSB7XG4gICAgICBNb2RlLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIH1cblxuICAgIE1vZGUucHJvdG90eXBlLm5hbWVzcGFjZSA9IG5hbWVzcGFjZTsgLy8gcmVnaXN0ZXIgaW4gSXNvdG9wZVxuXG4gICAgTGF5b3V0TW9kZS5tb2Rlc1tuYW1lc3BhY2VdID0gTW9kZTtcbiAgICByZXR1cm4gTW9kZTtcbiAgfTtcblxuICByZXR1cm4gTGF5b3V0TW9kZTtcbn0pO1xuLyohXG4gKiBNYXNvbnJ5IHY0LjIuMVxuICogQ2FzY2FkaW5nIGdyaWQgbGF5b3V0IGxpYnJhcnlcbiAqIGh0dHBzOi8vbWFzb25yeS5kZXNhbmRyby5jb21cbiAqIE1JVCBMaWNlbnNlXG4gKiBieSBEYXZpZCBEZVNhbmRyb1xuICovXG5cblxuKGZ1bmN0aW9uICh3aW5kb3csIGZhY3RvcnkpIHtcbiAgLy8gdW5pdmVyc2FsIG1vZHVsZSBkZWZpbml0aW9uXG5cbiAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cblxuICAvKmdsb2JhbHMgZGVmaW5lLCBtb2R1bGUsIHJlcXVpcmUgKi9cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EXG4gICAgZGVmaW5lKCdtYXNvbnJ5LWxheW91dC9tYXNvbnJ5JywgWydvdXRsYXllci9vdXRsYXllcicsICdnZXQtc2l6ZS9nZXQtc2l6ZSddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIG1vZHVsZSA9PT0gXCJ1bmRlZmluZWRcIiA/IFwidW5kZWZpbmVkXCIgOiBfdHlwZW9mKG1vZHVsZSkpID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnb3V0bGF5ZXInKSwgcmVxdWlyZSgnZ2V0LXNpemUnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gYnJvd3NlciBnbG9iYWxcbiAgICB3aW5kb3cuTWFzb25yeSA9IGZhY3Rvcnkod2luZG93Lk91dGxheWVyLCB3aW5kb3cuZ2V0U2l6ZSk7XG4gIH1cbn0pKHdpbmRvdywgZnVuY3Rpb24gZmFjdG9yeShPdXRsYXllciwgZ2V0U2l6ZSkge1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBtYXNvbnJ5RGVmaW5pdGlvbiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuICAvLyBjcmVhdGUgYW4gT3V0bGF5ZXIgbGF5b3V0IGNsYXNzXG4gIHZhciBNYXNvbnJ5ID0gT3V0bGF5ZXIuY3JlYXRlKCdtYXNvbnJ5Jyk7IC8vIGlzRml0V2lkdGggLT4gZml0V2lkdGhcblxuICBNYXNvbnJ5LmNvbXBhdE9wdGlvbnMuZml0V2lkdGggPSAnaXNGaXRXaWR0aCc7XG4gIHZhciBwcm90byA9IE1hc29ucnkucHJvdG90eXBlO1xuXG4gIHByb3RvLl9yZXNldExheW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmdldFNpemUoKTtcblxuICAgIHRoaXMuX2dldE1lYXN1cmVtZW50KCdjb2x1bW5XaWR0aCcsICdvdXRlcldpZHRoJyk7XG5cbiAgICB0aGlzLl9nZXRNZWFzdXJlbWVudCgnZ3V0dGVyJywgJ291dGVyV2lkdGgnKTtcblxuICAgIHRoaXMubWVhc3VyZUNvbHVtbnMoKTsgLy8gcmVzZXQgY29sdW1uIFlcblxuICAgIHRoaXMuY29sWXMgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb2xzOyBpKyspIHtcbiAgICAgIHRoaXMuY29sWXMucHVzaCgwKTtcbiAgICB9XG5cbiAgICB0aGlzLm1heFkgPSAwO1xuICAgIHRoaXMuaG9yaXpvbnRhbENvbEluZGV4ID0gMDtcbiAgfTtcblxuICBwcm90by5tZWFzdXJlQ29sdW1ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmdldENvbnRhaW5lcldpZHRoKCk7IC8vIGlmIGNvbHVtbldpZHRoIGlzIDAsIGRlZmF1bHQgdG8gb3V0ZXJXaWR0aCBvZiBmaXJzdCBpdGVtXG5cbiAgICBpZiAoIXRoaXMuY29sdW1uV2lkdGgpIHtcbiAgICAgIHZhciBmaXJzdEl0ZW0gPSB0aGlzLml0ZW1zWzBdO1xuICAgICAgdmFyIGZpcnN0SXRlbUVsZW0gPSBmaXJzdEl0ZW0gJiYgZmlyc3RJdGVtLmVsZW1lbnQ7IC8vIGNvbHVtbldpZHRoIGZhbGwgYmFjayB0byBpdGVtIG9mIGZpcnN0IGVsZW1lbnRcblxuICAgICAgdGhpcy5jb2x1bW5XaWR0aCA9IGZpcnN0SXRlbUVsZW0gJiYgZ2V0U2l6ZShmaXJzdEl0ZW1FbGVtKS5vdXRlcldpZHRoIHx8IC8vIGlmIGZpcnN0IGVsZW0gaGFzIG5vIHdpZHRoLCBkZWZhdWx0IHRvIHNpemUgb2YgY29udGFpbmVyXG4gICAgICB0aGlzLmNvbnRhaW5lcldpZHRoO1xuICAgIH1cblxuICAgIHZhciBjb2x1bW5XaWR0aCA9IHRoaXMuY29sdW1uV2lkdGggKz0gdGhpcy5ndXR0ZXI7IC8vIGNhbGN1bGF0ZSBjb2x1bW5zXG5cbiAgICB2YXIgY29udGFpbmVyV2lkdGggPSB0aGlzLmNvbnRhaW5lcldpZHRoICsgdGhpcy5ndXR0ZXI7XG4gICAgdmFyIGNvbHMgPSBjb250YWluZXJXaWR0aCAvIGNvbHVtbldpZHRoOyAvLyBmaXggcm91bmRpbmcgZXJyb3JzLCB0eXBpY2FsbHkgd2l0aCBndXR0ZXJzXG5cbiAgICB2YXIgZXhjZXNzID0gY29sdW1uV2lkdGggLSBjb250YWluZXJXaWR0aCAlIGNvbHVtbldpZHRoOyAvLyBpZiBvdmVyc2hvb3QgaXMgbGVzcyB0aGFuIGEgcGl4ZWwsIHJvdW5kIHVwLCBvdGhlcndpc2UgZmxvb3IgaXRcblxuICAgIHZhciBtYXRoTWV0aG9kID0gZXhjZXNzICYmIGV4Y2VzcyA8IDEgPyAncm91bmQnIDogJ2Zsb29yJztcbiAgICBjb2xzID0gTWF0aFttYXRoTWV0aG9kXShjb2xzKTtcbiAgICB0aGlzLmNvbHMgPSBNYXRoLm1heChjb2xzLCAxKTtcbiAgfTtcblxuICBwcm90by5nZXRDb250YWluZXJXaWR0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBjb250YWluZXIgaXMgcGFyZW50IGlmIGZpdCB3aWR0aFxuICAgIHZhciBpc0ZpdFdpZHRoID0gdGhpcy5fZ2V0T3B0aW9uKCdmaXRXaWR0aCcpO1xuXG4gICAgdmFyIGNvbnRhaW5lciA9IGlzRml0V2lkdGggPyB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZSA6IHRoaXMuZWxlbWVudDsgLy8gY2hlY2sgdGhhdCB0aGlzLnNpemUgYW5kIHNpemUgYXJlIHRoZXJlXG4gICAgLy8gSUU4IHRyaWdnZXJzIHJlc2l6ZSBvbiBib2R5IHNpemUgY2hhbmdlLCBzbyB0aGV5IG1pZ2h0IG5vdCBiZVxuXG4gICAgdmFyIHNpemUgPSBnZXRTaXplKGNvbnRhaW5lcik7XG4gICAgdGhpcy5jb250YWluZXJXaWR0aCA9IHNpemUgJiYgc2l6ZS5pbm5lcldpZHRoO1xuICB9O1xuXG4gIHByb3RvLl9nZXRJdGVtTGF5b3V0UG9zaXRpb24gPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgIGl0ZW0uZ2V0U2l6ZSgpOyAvLyBob3cgbWFueSBjb2x1bW5zIGRvZXMgdGhpcyBicmljayBzcGFuXG5cbiAgICB2YXIgcmVtYWluZGVyID0gaXRlbS5zaXplLm91dGVyV2lkdGggJSB0aGlzLmNvbHVtbldpZHRoO1xuICAgIHZhciBtYXRoTWV0aG9kID0gcmVtYWluZGVyICYmIHJlbWFpbmRlciA8IDEgPyAncm91bmQnIDogJ2NlaWwnOyAvLyByb3VuZCBpZiBvZmYgYnkgMSBwaXhlbCwgb3RoZXJ3aXNlIHVzZSBjZWlsXG5cbiAgICB2YXIgY29sU3BhbiA9IE1hdGhbbWF0aE1ldGhvZF0oaXRlbS5zaXplLm91dGVyV2lkdGggLyB0aGlzLmNvbHVtbldpZHRoKTtcbiAgICBjb2xTcGFuID0gTWF0aC5taW4oY29sU3BhbiwgdGhpcy5jb2xzKTsgLy8gdXNlIGhvcml6b250YWwgb3IgdG9wIGNvbHVtbiBwb3NpdGlvblxuXG4gICAgdmFyIGNvbFBvc01ldGhvZCA9IHRoaXMub3B0aW9ucy5ob3Jpem9udGFsT3JkZXIgPyAnX2dldEhvcml6b250YWxDb2xQb3NpdGlvbicgOiAnX2dldFRvcENvbFBvc2l0aW9uJztcbiAgICB2YXIgY29sUG9zaXRpb24gPSB0aGlzW2NvbFBvc01ldGhvZF0oY29sU3BhbiwgaXRlbSk7IC8vIHBvc2l0aW9uIHRoZSBicmlja1xuXG4gICAgdmFyIHBvc2l0aW9uID0ge1xuICAgICAgeDogdGhpcy5jb2x1bW5XaWR0aCAqIGNvbFBvc2l0aW9uLmNvbCxcbiAgICAgIHk6IGNvbFBvc2l0aW9uLnlcbiAgICB9OyAvLyBhcHBseSBzZXRIZWlnaHQgdG8gbmVjZXNzYXJ5IGNvbHVtbnNcblxuICAgIHZhciBzZXRIZWlnaHQgPSBjb2xQb3NpdGlvbi55ICsgaXRlbS5zaXplLm91dGVySGVpZ2h0O1xuICAgIHZhciBzZXRNYXggPSBjb2xTcGFuICsgY29sUG9zaXRpb24uY29sO1xuXG4gICAgZm9yICh2YXIgaSA9IGNvbFBvc2l0aW9uLmNvbDsgaSA8IHNldE1heDsgaSsrKSB7XG4gICAgICB0aGlzLmNvbFlzW2ldID0gc2V0SGVpZ2h0O1xuICAgIH1cblxuICAgIHJldHVybiBwb3NpdGlvbjtcbiAgfTtcblxuICBwcm90by5fZ2V0VG9wQ29sUG9zaXRpb24gPSBmdW5jdGlvbiAoY29sU3Bhbikge1xuICAgIHZhciBjb2xHcm91cCA9IHRoaXMuX2dldFRvcENvbEdyb3VwKGNvbFNwYW4pOyAvLyBnZXQgdGhlIG1pbmltdW0gWSB2YWx1ZSBmcm9tIHRoZSBjb2x1bW5zXG5cblxuICAgIHZhciBtaW5pbXVtWSA9IE1hdGgubWluLmFwcGx5KE1hdGgsIGNvbEdyb3VwKTtcbiAgICByZXR1cm4ge1xuICAgICAgY29sOiBjb2xHcm91cC5pbmRleE9mKG1pbmltdW1ZKSxcbiAgICAgIHk6IG1pbmltdW1ZXG4gICAgfTtcbiAgfTtcbiAgLyoqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBjb2xTcGFuIC0gbnVtYmVyIG9mIGNvbHVtbnMgdGhlIGVsZW1lbnQgc3BhbnNcbiAgICogQHJldHVybnMge0FycmF5fSBjb2xHcm91cFxuICAgKi9cblxuXG4gIHByb3RvLl9nZXRUb3BDb2xHcm91cCA9IGZ1bmN0aW9uIChjb2xTcGFuKSB7XG4gICAgaWYgKGNvbFNwYW4gPCAyKSB7XG4gICAgICAvLyBpZiBicmljayBzcGFucyBvbmx5IG9uZSBjb2x1bW4sIHVzZSBhbGwgdGhlIGNvbHVtbiBZc1xuICAgICAgcmV0dXJuIHRoaXMuY29sWXM7XG4gICAgfVxuXG4gICAgdmFyIGNvbEdyb3VwID0gW107IC8vIGhvdyBtYW55IGRpZmZlcmVudCBwbGFjZXMgY291bGQgdGhpcyBicmljayBmaXQgaG9yaXpvbnRhbGx5XG5cbiAgICB2YXIgZ3JvdXBDb3VudCA9IHRoaXMuY29scyArIDEgLSBjb2xTcGFuOyAvLyBmb3IgZWFjaCBncm91cCBwb3RlbnRpYWwgaG9yaXpvbnRhbCBwb3NpdGlvblxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBncm91cENvdW50OyBpKyspIHtcbiAgICAgIGNvbEdyb3VwW2ldID0gdGhpcy5fZ2V0Q29sR3JvdXBZKGksIGNvbFNwYW4pO1xuICAgIH1cblxuICAgIHJldHVybiBjb2xHcm91cDtcbiAgfTtcblxuICBwcm90by5fZ2V0Q29sR3JvdXBZID0gZnVuY3Rpb24gKGNvbCwgY29sU3Bhbikge1xuICAgIGlmIChjb2xTcGFuIDwgMikge1xuICAgICAgcmV0dXJuIHRoaXMuY29sWXNbY29sXTtcbiAgICB9IC8vIG1ha2UgYW4gYXJyYXkgb2YgY29sWSB2YWx1ZXMgZm9yIHRoYXQgb25lIGdyb3VwXG5cblxuICAgIHZhciBncm91cENvbFlzID0gdGhpcy5jb2xZcy5zbGljZShjb2wsIGNvbCArIGNvbFNwYW4pOyAvLyBhbmQgZ2V0IHRoZSBtYXggdmFsdWUgb2YgdGhlIGFycmF5XG5cbiAgICByZXR1cm4gTWF0aC5tYXguYXBwbHkoTWF0aCwgZ3JvdXBDb2xZcyk7XG4gIH07IC8vIGdldCBjb2x1bW4gcG9zaXRpb24gYmFzZWQgb24gaG9yaXpvbnRhbCBpbmRleC4gIzg3M1xuXG5cbiAgcHJvdG8uX2dldEhvcml6b250YWxDb2xQb3NpdGlvbiA9IGZ1bmN0aW9uIChjb2xTcGFuLCBpdGVtKSB7XG4gICAgdmFyIGNvbCA9IHRoaXMuaG9yaXpvbnRhbENvbEluZGV4ICUgdGhpcy5jb2xzO1xuICAgIHZhciBpc092ZXIgPSBjb2xTcGFuID4gMSAmJiBjb2wgKyBjb2xTcGFuID4gdGhpcy5jb2xzOyAvLyBzaGlmdCB0byBuZXh0IHJvdyBpZiBpdGVtIGNhbid0IGZpdCBvbiBjdXJyZW50IHJvd1xuXG4gICAgY29sID0gaXNPdmVyID8gMCA6IGNvbDsgLy8gZG9uJ3QgbGV0IHplcm8tc2l6ZSBpdGVtcyB0YWtlIHVwIHNwYWNlXG5cbiAgICB2YXIgaGFzU2l6ZSA9IGl0ZW0uc2l6ZS5vdXRlcldpZHRoICYmIGl0ZW0uc2l6ZS5vdXRlckhlaWdodDtcbiAgICB0aGlzLmhvcml6b250YWxDb2xJbmRleCA9IGhhc1NpemUgPyBjb2wgKyBjb2xTcGFuIDogdGhpcy5ob3Jpem9udGFsQ29sSW5kZXg7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbDogY29sLFxuICAgICAgeTogdGhpcy5fZ2V0Q29sR3JvdXBZKGNvbCwgY29sU3BhbilcbiAgICB9O1xuICB9O1xuXG4gIHByb3RvLl9tYW5hZ2VTdGFtcCA9IGZ1bmN0aW9uIChzdGFtcCkge1xuICAgIHZhciBzdGFtcFNpemUgPSBnZXRTaXplKHN0YW1wKTtcblxuICAgIHZhciBvZmZzZXQgPSB0aGlzLl9nZXRFbGVtZW50T2Zmc2V0KHN0YW1wKTsgLy8gZ2V0IHRoZSBjb2x1bW5zIHRoYXQgdGhpcyBzdGFtcCBhZmZlY3RzXG5cblxuICAgIHZhciBpc09yaWdpbkxlZnQgPSB0aGlzLl9nZXRPcHRpb24oJ29yaWdpbkxlZnQnKTtcblxuICAgIHZhciBmaXJzdFggPSBpc09yaWdpbkxlZnQgPyBvZmZzZXQubGVmdCA6IG9mZnNldC5yaWdodDtcbiAgICB2YXIgbGFzdFggPSBmaXJzdFggKyBzdGFtcFNpemUub3V0ZXJXaWR0aDtcbiAgICB2YXIgZmlyc3RDb2wgPSBNYXRoLmZsb29yKGZpcnN0WCAvIHRoaXMuY29sdW1uV2lkdGgpO1xuICAgIGZpcnN0Q29sID0gTWF0aC5tYXgoMCwgZmlyc3RDb2wpO1xuICAgIHZhciBsYXN0Q29sID0gTWF0aC5mbG9vcihsYXN0WCAvIHRoaXMuY29sdW1uV2lkdGgpOyAvLyBsYXN0Q29sIHNob3VsZCBub3QgZ28gb3ZlciBpZiBtdWx0aXBsZSBvZiBjb2x1bW5XaWR0aCAjNDI1XG5cbiAgICBsYXN0Q29sIC09IGxhc3RYICUgdGhpcy5jb2x1bW5XaWR0aCA/IDAgOiAxO1xuICAgIGxhc3RDb2wgPSBNYXRoLm1pbih0aGlzLmNvbHMgLSAxLCBsYXN0Q29sKTsgLy8gc2V0IGNvbFlzIHRvIGJvdHRvbSBvZiB0aGUgc3RhbXBcblxuICAgIHZhciBpc09yaWdpblRvcCA9IHRoaXMuX2dldE9wdGlvbignb3JpZ2luVG9wJyk7XG5cbiAgICB2YXIgc3RhbXBNYXhZID0gKGlzT3JpZ2luVG9wID8gb2Zmc2V0LnRvcCA6IG9mZnNldC5ib3R0b20pICsgc3RhbXBTaXplLm91dGVySGVpZ2h0O1xuXG4gICAgZm9yICh2YXIgaSA9IGZpcnN0Q29sOyBpIDw9IGxhc3RDb2w7IGkrKykge1xuICAgICAgdGhpcy5jb2xZc1tpXSA9IE1hdGgubWF4KHN0YW1wTWF4WSwgdGhpcy5jb2xZc1tpXSk7XG4gICAgfVxuICB9O1xuXG4gIHByb3RvLl9nZXRDb250YWluZXJTaXplID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubWF4WSA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIHRoaXMuY29sWXMpO1xuICAgIHZhciBzaXplID0ge1xuICAgICAgaGVpZ2h0OiB0aGlzLm1heFlcbiAgICB9O1xuXG4gICAgaWYgKHRoaXMuX2dldE9wdGlvbignZml0V2lkdGgnKSkge1xuICAgICAgc2l6ZS53aWR0aCA9IHRoaXMuX2dldENvbnRhaW5lckZpdFdpZHRoKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNpemU7XG4gIH07XG5cbiAgcHJvdG8uX2dldENvbnRhaW5lckZpdFdpZHRoID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB1bnVzZWRDb2xzID0gMDsgLy8gY291bnQgdW51c2VkIGNvbHVtbnNcblxuICAgIHZhciBpID0gdGhpcy5jb2xzO1xuXG4gICAgd2hpbGUgKC0taSkge1xuICAgICAgaWYgKHRoaXMuY29sWXNbaV0gIT09IDApIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIHVudXNlZENvbHMrKztcbiAgICB9IC8vIGZpdCBjb250YWluZXIgdG8gY29sdW1ucyB0aGF0IGhhdmUgYmVlbiB1c2VkXG5cblxuICAgIHJldHVybiAodGhpcy5jb2xzIC0gdW51c2VkQ29scykgKiB0aGlzLmNvbHVtbldpZHRoIC0gdGhpcy5ndXR0ZXI7XG4gIH07XG5cbiAgcHJvdG8ubmVlZHNSZXNpemVMYXlvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHByZXZpb3VzV2lkdGggPSB0aGlzLmNvbnRhaW5lcldpZHRoO1xuICAgIHRoaXMuZ2V0Q29udGFpbmVyV2lkdGgoKTtcbiAgICByZXR1cm4gcHJldmlvdXNXaWR0aCAhPSB0aGlzLmNvbnRhaW5lcldpZHRoO1xuICB9O1xuXG4gIHJldHVybiBNYXNvbnJ5O1xufSk7XG4vKiFcbiAqIE1hc29ucnkgbGF5b3V0IG1vZGVcbiAqIHN1Yi1jbGFzc2VzIE1hc29ucnlcbiAqIGh0dHBzOi8vbWFzb25yeS5kZXNhbmRyby5jb21cbiAqL1xuXG5cbihmdW5jdGlvbiAod2luZG93LCBmYWN0b3J5KSB7XG4gIC8vIHVuaXZlcnNhbCBtb2R1bGUgZGVmaW5pdGlvblxuXG4gIC8qIGpzaGludCBzdHJpY3Q6IGZhbHNlICovXG5cbiAgLypnbG9iYWxzIGRlZmluZSwgbW9kdWxlLCByZXF1aXJlICovXG4gIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRFxuICAgIGRlZmluZSgnaXNvdG9wZS1sYXlvdXQvanMvbGF5b3V0LW1vZGVzL21hc29ucnknLCBbJy4uL2xheW91dC1tb2RlJywgJ21hc29ucnktbGF5b3V0L21hc29ucnknXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBtb2R1bGUgPT09IFwidW5kZWZpbmVkXCIgPyBcInVuZGVmaW5lZFwiIDogX3R5cGVvZihtb2R1bGUpKSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL2xheW91dC1tb2RlJyksIHJlcXVpcmUoJ21hc29ucnktbGF5b3V0JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIGJyb3dzZXIgZ2xvYmFsXG4gICAgZmFjdG9yeSh3aW5kb3cuSXNvdG9wZS5MYXlvdXRNb2RlLCB3aW5kb3cuTWFzb25yeSk7XG4gIH1cbn0pKHdpbmRvdywgZnVuY3Rpb24gZmFjdG9yeShMYXlvdXRNb2RlLCBNYXNvbnJ5KSB7XG4gICd1c2Ugc3RyaWN0JzsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gbWFzb25yeURlZmluaXRpb24gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cbiAgLy8gY3JlYXRlIGFuIE91dGxheWVyIGxheW91dCBjbGFzc1xuXG4gIHZhciBNYXNvbnJ5TW9kZSA9IExheW91dE1vZGUuY3JlYXRlKCdtYXNvbnJ5Jyk7XG4gIHZhciBwcm90byA9IE1hc29ucnlNb2RlLnByb3RvdHlwZTtcbiAgdmFyIGtlZXBNb2RlTWV0aG9kcyA9IHtcbiAgICBfZ2V0RWxlbWVudE9mZnNldDogdHJ1ZSxcbiAgICBsYXlvdXQ6IHRydWUsXG4gICAgX2dldE1lYXN1cmVtZW50OiB0cnVlXG4gIH07IC8vIGluaGVyaXQgTWFzb25yeSBwcm90b3R5cGVcblxuICBmb3IgKHZhciBtZXRob2QgaW4gTWFzb25yeS5wcm90b3R5cGUpIHtcbiAgICAvLyBkbyBub3QgaW5oZXJpdCBtb2RlIG1ldGhvZHNcbiAgICBpZiAoIWtlZXBNb2RlTWV0aG9kc1ttZXRob2RdKSB7XG4gICAgICBwcm90b1ttZXRob2RdID0gTWFzb25yeS5wcm90b3R5cGVbbWV0aG9kXTtcbiAgICB9XG4gIH1cblxuICB2YXIgbWVhc3VyZUNvbHVtbnMgPSBwcm90by5tZWFzdXJlQ29sdW1ucztcblxuICBwcm90by5tZWFzdXJlQ29sdW1ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBzZXQgaXRlbXMsIHVzZWQgaWYgbWVhc3VyaW5nIGZpcnN0IGl0ZW1cbiAgICB0aGlzLml0ZW1zID0gdGhpcy5pc290b3BlLmZpbHRlcmVkSXRlbXM7XG4gICAgbWVhc3VyZUNvbHVtbnMuY2FsbCh0aGlzKTtcbiAgfTsgLy8gcG9pbnQgdG8gbW9kZSBvcHRpb25zIGZvciBmaXRXaWR0aFxuXG5cbiAgdmFyIF9nZXRPcHRpb24gPSBwcm90by5fZ2V0T3B0aW9uO1xuXG4gIHByb3RvLl9nZXRPcHRpb24gPSBmdW5jdGlvbiAob3B0aW9uKSB7XG4gICAgaWYgKG9wdGlvbiA9PSAnZml0V2lkdGgnKSB7XG4gICAgICByZXR1cm4gdGhpcy5vcHRpb25zLmlzRml0V2lkdGggIT09IHVuZGVmaW5lZCA/IHRoaXMub3B0aW9ucy5pc0ZpdFdpZHRoIDogdGhpcy5vcHRpb25zLmZpdFdpZHRoO1xuICAgIH1cblxuICAgIHJldHVybiBfZ2V0T3B0aW9uLmFwcGx5KHRoaXMuaXNvdG9wZSwgYXJndW1lbnRzKTtcbiAgfTtcblxuICByZXR1cm4gTWFzb25yeU1vZGU7XG59KTtcbi8qKlxuICogZml0Um93cyBsYXlvdXQgbW9kZVxuICovXG5cblxuKGZ1bmN0aW9uICh3aW5kb3csIGZhY3RvcnkpIHtcbiAgLy8gdW5pdmVyc2FsIG1vZHVsZSBkZWZpbml0aW9uXG5cbiAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cblxuICAvKmdsb2JhbHMgZGVmaW5lLCBtb2R1bGUsIHJlcXVpcmUgKi9cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1EXG4gICAgZGVmaW5lKCdpc290b3BlLWxheW91dC9qcy9sYXlvdXQtbW9kZXMvZml0LXJvd3MnLCBbJy4uL2xheW91dC1tb2RlJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgZXhwb3J0cyA9PT0gXCJ1bmRlZmluZWRcIiA/IFwidW5kZWZpbmVkXCIgOiBfdHlwZW9mKGV4cG9ydHMpKSA9PSAnb2JqZWN0Jykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL2xheW91dC1tb2RlJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIGJyb3dzZXIgZ2xvYmFsXG4gICAgZmFjdG9yeSh3aW5kb3cuSXNvdG9wZS5MYXlvdXRNb2RlKTtcbiAgfVxufSkod2luZG93LCBmdW5jdGlvbiBmYWN0b3J5KExheW91dE1vZGUpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBGaXRSb3dzID0gTGF5b3V0TW9kZS5jcmVhdGUoJ2ZpdFJvd3MnKTtcbiAgdmFyIHByb3RvID0gRml0Um93cy5wcm90b3R5cGU7XG5cbiAgcHJvdG8uX3Jlc2V0TGF5b3V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMueCA9IDA7XG4gICAgdGhpcy55ID0gMDtcbiAgICB0aGlzLm1heFkgPSAwO1xuXG4gICAgdGhpcy5fZ2V0TWVhc3VyZW1lbnQoJ2d1dHRlcicsICdvdXRlcldpZHRoJyk7XG4gIH07XG5cbiAgcHJvdG8uX2dldEl0ZW1MYXlvdXRQb3NpdGlvbiA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgaXRlbS5nZXRTaXplKCk7XG4gICAgdmFyIGl0ZW1XaWR0aCA9IGl0ZW0uc2l6ZS5vdXRlcldpZHRoICsgdGhpcy5ndXR0ZXI7IC8vIGlmIHRoaXMgZWxlbWVudCBjYW5ub3QgZml0IGluIHRoZSBjdXJyZW50IHJvd1xuXG4gICAgdmFyIGNvbnRhaW5lcldpZHRoID0gdGhpcy5pc290b3BlLnNpemUuaW5uZXJXaWR0aCArIHRoaXMuZ3V0dGVyO1xuXG4gICAgaWYgKHRoaXMueCAhPT0gMCAmJiBpdGVtV2lkdGggKyB0aGlzLnggPiBjb250YWluZXJXaWR0aCkge1xuICAgICAgdGhpcy54ID0gMDtcbiAgICAgIHRoaXMueSA9IHRoaXMubWF4WTtcbiAgICB9XG5cbiAgICB2YXIgcG9zaXRpb24gPSB7XG4gICAgICB4OiB0aGlzLngsXG4gICAgICB5OiB0aGlzLnlcbiAgICB9O1xuICAgIHRoaXMubWF4WSA9IE1hdGgubWF4KHRoaXMubWF4WSwgdGhpcy55ICsgaXRlbS5zaXplLm91dGVySGVpZ2h0KTtcbiAgICB0aGlzLnggKz0gaXRlbVdpZHRoO1xuICAgIHJldHVybiBwb3NpdGlvbjtcbiAgfTtcblxuICBwcm90by5fZ2V0Q29udGFpbmVyU2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaGVpZ2h0OiB0aGlzLm1heFlcbiAgICB9O1xuICB9O1xuXG4gIHJldHVybiBGaXRSb3dzO1xufSk7XG4vKipcbiAqIHZlcnRpY2FsIGxheW91dCBtb2RlXG4gKi9cblxuXG4oZnVuY3Rpb24gKHdpbmRvdywgZmFjdG9yeSkge1xuICAvLyB1bml2ZXJzYWwgbW9kdWxlIGRlZmluaXRpb25cblxuICAvKiBqc2hpbnQgc3RyaWN0OiBmYWxzZSAqL1xuXG4gIC8qZ2xvYmFscyBkZWZpbmUsIG1vZHVsZSwgcmVxdWlyZSAqL1xuICBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTURcbiAgICBkZWZpbmUoJ2lzb3RvcGUtbGF5b3V0L2pzL2xheW91dC1tb2Rlcy92ZXJ0aWNhbCcsIFsnLi4vbGF5b3V0LW1vZGUnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBtb2R1bGUgPT09IFwidW5kZWZpbmVkXCIgPyBcInVuZGVmaW5lZFwiIDogX3R5cGVvZihtb2R1bGUpKSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL2xheW91dC1tb2RlJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIGJyb3dzZXIgZ2xvYmFsXG4gICAgZmFjdG9yeSh3aW5kb3cuSXNvdG9wZS5MYXlvdXRNb2RlKTtcbiAgfVxufSkod2luZG93LCBmdW5jdGlvbiBmYWN0b3J5KExheW91dE1vZGUpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBWZXJ0aWNhbCA9IExheW91dE1vZGUuY3JlYXRlKCd2ZXJ0aWNhbCcsIHtcbiAgICBob3Jpem9udGFsQWxpZ25tZW50OiAwXG4gIH0pO1xuICB2YXIgcHJvdG8gPSBWZXJ0aWNhbC5wcm90b3R5cGU7XG5cbiAgcHJvdG8uX3Jlc2V0TGF5b3V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMueSA9IDA7XG4gIH07XG5cbiAgcHJvdG8uX2dldEl0ZW1MYXlvdXRQb3NpdGlvbiA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgaXRlbS5nZXRTaXplKCk7XG4gICAgdmFyIHggPSAodGhpcy5pc290b3BlLnNpemUuaW5uZXJXaWR0aCAtIGl0ZW0uc2l6ZS5vdXRlcldpZHRoKSAqIHRoaXMub3B0aW9ucy5ob3Jpem9udGFsQWxpZ25tZW50O1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHRoaXMueSArPSBpdGVtLnNpemUub3V0ZXJIZWlnaHQ7XG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IHgsXG4gICAgICB5OiB5XG4gICAgfTtcbiAgfTtcblxuICBwcm90by5fZ2V0Q29udGFpbmVyU2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaGVpZ2h0OiB0aGlzLnlcbiAgICB9O1xuICB9O1xuXG4gIHJldHVybiBWZXJ0aWNhbDtcbn0pO1xuLyohXG4gKiBJc290b3BlIHYzLjAuNlxuICpcbiAqIExpY2Vuc2VkIEdQTHYzIGZvciBvcGVuIHNvdXJjZSB1c2VcbiAqIG9yIElzb3RvcGUgQ29tbWVyY2lhbCBMaWNlbnNlIGZvciBjb21tZXJjaWFsIHVzZVxuICpcbiAqIGh0dHBzOi8vaXNvdG9wZS5tZXRhZml6enkuY29cbiAqIENvcHlyaWdodCAyMDEwLTIwMTggTWV0YWZpenp5XG4gKi9cblxuXG4oZnVuY3Rpb24gKHdpbmRvdywgZmFjdG9yeSkge1xuICAvLyB1bml2ZXJzYWwgbW9kdWxlIGRlZmluaXRpb25cblxuICAvKiBqc2hpbnQgc3RyaWN0OiBmYWxzZSAqL1xuXG4gIC8qZ2xvYmFscyBkZWZpbmUsIG1vZHVsZSwgcmVxdWlyZSAqL1xuICBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTURcbiAgICBkZWZpbmUoWydvdXRsYXllci9vdXRsYXllcicsICdnZXQtc2l6ZS9nZXQtc2l6ZScsICdkZXNhbmRyby1tYXRjaGVzLXNlbGVjdG9yL21hdGNoZXMtc2VsZWN0b3InLCAnZml6enktdWktdXRpbHMvdXRpbHMnLCAnaXNvdG9wZS1sYXlvdXQvanMvaXRlbScsICdpc290b3BlLWxheW91dC9qcy9sYXlvdXQtbW9kZScsIC8vIGluY2x1ZGUgZGVmYXVsdCBsYXlvdXQgbW9kZXNcbiAgICAnaXNvdG9wZS1sYXlvdXQvanMvbGF5b3V0LW1vZGVzL21hc29ucnknLCAnaXNvdG9wZS1sYXlvdXQvanMvbGF5b3V0LW1vZGVzL2ZpdC1yb3dzJywgJ2lzb3RvcGUtbGF5b3V0L2pzL2xheW91dC1tb2Rlcy92ZXJ0aWNhbCddLCBmdW5jdGlvbiAoT3V0bGF5ZXIsIGdldFNpemUsIG1hdGNoZXNTZWxlY3RvciwgdXRpbHMsIEl0ZW0sIExheW91dE1vZGUpIHtcbiAgICAgIHJldHVybiBmYWN0b3J5KHdpbmRvdywgT3V0bGF5ZXIsIGdldFNpemUsIG1hdGNoZXNTZWxlY3RvciwgdXRpbHMsIEl0ZW0sIExheW91dE1vZGUpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgbW9kdWxlID09PSBcInVuZGVmaW5lZFwiID8gXCJ1bmRlZmluZWRcIiA6IF90eXBlb2YobW9kdWxlKSkgPT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KU1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSh3aW5kb3csIHJlcXVpcmUoJ291dGxheWVyJyksIHJlcXVpcmUoJ2dldC1zaXplJyksIHJlcXVpcmUoJ2Rlc2FuZHJvLW1hdGNoZXMtc2VsZWN0b3InKSwgcmVxdWlyZSgnZml6enktdWktdXRpbHMnKSwgcmVxdWlyZSgnaXNvdG9wZS1sYXlvdXQvanMvaXRlbScpLCByZXF1aXJlKCdpc290b3BlLWxheW91dC9qcy9sYXlvdXQtbW9kZScpLCAvLyBpbmNsdWRlIGRlZmF1bHQgbGF5b3V0IG1vZGVzXG4gICAgcmVxdWlyZSgnaXNvdG9wZS1sYXlvdXQvanMvbGF5b3V0LW1vZGVzL21hc29ucnknKSwgcmVxdWlyZSgnaXNvdG9wZS1sYXlvdXQvanMvbGF5b3V0LW1vZGVzL2ZpdC1yb3dzJyksIHJlcXVpcmUoJ2lzb3RvcGUtbGF5b3V0L2pzL2xheW91dC1tb2Rlcy92ZXJ0aWNhbCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBicm93c2VyIGdsb2JhbFxuICAgIHdpbmRvdy5Jc290b3BlID0gZmFjdG9yeSh3aW5kb3csIHdpbmRvdy5PdXRsYXllciwgd2luZG93LmdldFNpemUsIHdpbmRvdy5tYXRjaGVzU2VsZWN0b3IsIHdpbmRvdy5maXp6eVVJVXRpbHMsIHdpbmRvdy5Jc290b3BlLkl0ZW0sIHdpbmRvdy5Jc290b3BlLkxheW91dE1vZGUpO1xuICB9XG59KSh3aW5kb3csIGZ1bmN0aW9uIGZhY3Rvcnkod2luZG93LCBPdXRsYXllciwgZ2V0U2l6ZSwgbWF0Y2hlc1NlbGVjdG9yLCB1dGlscywgSXRlbSwgTGF5b3V0TW9kZSkge1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSB2YXJzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG4gIHZhciBqUXVlcnkgPSB3aW5kb3cualF1ZXJ5OyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBoZWxwZXJzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cbiAgdmFyIHRyaW0gPSBTdHJpbmcucHJvdG90eXBlLnRyaW0gPyBmdW5jdGlvbiAoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci50cmltKCk7XG4gIH0gOiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJyk7XG4gIH07IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGlzb3RvcGVEZWZpbml0aW9uIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG4gIC8vIGNyZWF0ZSBhbiBPdXRsYXllciBsYXlvdXQgY2xhc3NcblxuICB2YXIgSXNvdG9wZSA9IE91dGxheWVyLmNyZWF0ZSgnaXNvdG9wZScsIHtcbiAgICBsYXlvdXRNb2RlOiAnbWFzb25yeScsXG4gICAgaXNKUXVlcnlGaWx0ZXJpbmc6IHRydWUsXG4gICAgc29ydEFzY2VuZGluZzogdHJ1ZVxuICB9KTtcbiAgSXNvdG9wZS5JdGVtID0gSXRlbTtcbiAgSXNvdG9wZS5MYXlvdXRNb2RlID0gTGF5b3V0TW9kZTtcbiAgdmFyIHByb3RvID0gSXNvdG9wZS5wcm90b3R5cGU7XG5cbiAgcHJvdG8uX2NyZWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLml0ZW1HVUlEID0gMDsgLy8gZnVuY3Rpb25zIHRoYXQgc29ydCBpdGVtc1xuXG4gICAgdGhpcy5fc29ydGVycyA9IHt9O1xuXG4gICAgdGhpcy5fZ2V0U29ydGVycygpOyAvLyBjYWxsIHN1cGVyXG5cblxuICAgIE91dGxheWVyLnByb3RvdHlwZS5fY3JlYXRlLmNhbGwodGhpcyk7IC8vIGNyZWF0ZSBsYXlvdXQgbW9kZXNcblxuXG4gICAgdGhpcy5tb2RlcyA9IHt9OyAvLyBzdGFydCBmaWx0ZXJlZEl0ZW1zIHdpdGggYWxsIGl0ZW1zXG5cbiAgICB0aGlzLmZpbHRlcmVkSXRlbXMgPSB0aGlzLml0ZW1zOyAvLyBrZWVwIG9mIHRyYWNrIG9mIHNvcnRCeXNcblxuICAgIHRoaXMuc29ydEhpc3RvcnkgPSBbJ29yaWdpbmFsLW9yZGVyJ107IC8vIGNyZWF0ZSBmcm9tIHJlZ2lzdGVyZWQgbGF5b3V0IG1vZGVzXG5cbiAgICBmb3IgKHZhciBuYW1lIGluIExheW91dE1vZGUubW9kZXMpIHtcbiAgICAgIHRoaXMuX2luaXRMYXlvdXRNb2RlKG5hbWUpO1xuICAgIH1cbiAgfTtcblxuICBwcm90by5yZWxvYWRJdGVtcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyByZXNldCBpdGVtIElEIGNvdW50ZXJcbiAgICB0aGlzLml0ZW1HVUlEID0gMDsgLy8gY2FsbCBzdXBlclxuXG4gICAgT3V0bGF5ZXIucHJvdG90eXBlLnJlbG9hZEl0ZW1zLmNhbGwodGhpcyk7XG4gIH07XG5cbiAgcHJvdG8uX2l0ZW1pemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGl0ZW1zID0gT3V0bGF5ZXIucHJvdG90eXBlLl9pdGVtaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IC8vIGFzc2lnbiBJRCBmb3Igb3JpZ2luYWwtb3JkZXJcblxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGl0ZW0gPSBpdGVtc1tpXTtcbiAgICAgIGl0ZW0uaWQgPSB0aGlzLml0ZW1HVUlEKys7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlSXRlbXNTb3J0RGF0YShpdGVtcyk7XG5cbiAgICByZXR1cm4gaXRlbXM7XG4gIH07IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGxheW91dCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG5cbiAgcHJvdG8uX2luaXRMYXlvdXRNb2RlID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB2YXIgTW9kZSA9IExheW91dE1vZGUubW9kZXNbbmFtZV07IC8vIHNldCBtb2RlIG9wdGlvbnNcbiAgICAvLyBIQUNLIGV4dGVuZCBpbml0aWFsIG9wdGlvbnMsIGJhY2stZmlsbCBpbiBkZWZhdWx0IG9wdGlvbnNcblxuICAgIHZhciBpbml0aWFsT3B0cyA9IHRoaXMub3B0aW9uc1tuYW1lXSB8fCB7fTtcbiAgICB0aGlzLm9wdGlvbnNbbmFtZV0gPSBNb2RlLm9wdGlvbnMgPyB1dGlscy5leHRlbmQoTW9kZS5vcHRpb25zLCBpbml0aWFsT3B0cykgOiBpbml0aWFsT3B0czsgLy8gaW5pdCBsYXlvdXQgbW9kZSBpbnN0YW5jZVxuXG4gICAgdGhpcy5tb2Rlc1tuYW1lXSA9IG5ldyBNb2RlKHRoaXMpO1xuICB9O1xuXG4gIHByb3RvLmxheW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBpZiBmaXJzdCB0aW1lIGRvaW5nIGxheW91dCwgZG8gYWxsIG1hZ2ljXG4gICAgaWYgKCF0aGlzLl9pc0xheW91dEluaXRlZCAmJiB0aGlzLl9nZXRPcHRpb24oJ2luaXRMYXlvdXQnKSkge1xuICAgICAgdGhpcy5hcnJhbmdlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fbGF5b3V0KCk7XG4gIH07IC8vIHByaXZhdGUgbWV0aG9kIHRvIGJlIHVzZWQgaW4gbGF5b3V0KCkgJiBtYWdpYygpXG5cblxuICBwcm90by5fbGF5b3V0ID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGRvbid0IGFuaW1hdGUgZmlyc3QgbGF5b3V0XG4gICAgdmFyIGlzSW5zdGFudCA9IHRoaXMuX2dldElzSW5zdGFudCgpOyAvLyBsYXlvdXQgZmxvd1xuXG5cbiAgICB0aGlzLl9yZXNldExheW91dCgpO1xuXG4gICAgdGhpcy5fbWFuYWdlU3RhbXBzKCk7XG5cbiAgICB0aGlzLmxheW91dEl0ZW1zKHRoaXMuZmlsdGVyZWRJdGVtcywgaXNJbnN0YW50KTsgLy8gZmxhZyBmb3IgaW5pdGFsaXplZFxuXG4gICAgdGhpcy5faXNMYXlvdXRJbml0ZWQgPSB0cnVlO1xuICB9OyAvLyBmaWx0ZXIgKyBzb3J0ICsgbGF5b3V0XG5cblxuICBwcm90by5hcnJhbmdlID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgICAvLyBzZXQgYW55IG9wdGlvbnMgcGFzc1xuICAgIHRoaXMub3B0aW9uKG9wdHMpO1xuXG4gICAgdGhpcy5fZ2V0SXNJbnN0YW50KCk7IC8vIGZpbHRlciwgc29ydCwgYW5kIGxheW91dFxuICAgIC8vIGZpbHRlclxuXG5cbiAgICB2YXIgZmlsdGVyZWQgPSB0aGlzLl9maWx0ZXIodGhpcy5pdGVtcyk7XG5cbiAgICB0aGlzLmZpbHRlcmVkSXRlbXMgPSBmaWx0ZXJlZC5tYXRjaGVzO1xuXG4gICAgdGhpcy5fYmluZEFycmFuZ2VDb21wbGV0ZSgpO1xuXG4gICAgaWYgKHRoaXMuX2lzSW5zdGFudCkge1xuICAgICAgdGhpcy5fbm9UcmFuc2l0aW9uKHRoaXMuX2hpZGVSZXZlYWwsIFtmaWx0ZXJlZF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9oaWRlUmV2ZWFsKGZpbHRlcmVkKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zb3J0KCk7XG5cbiAgICB0aGlzLl9sYXlvdXQoKTtcbiAgfTsgLy8gYWxpYXMgdG8gX2luaXQgZm9yIG1haW4gcGx1Z2luIG1ldGhvZFxuXG5cbiAgcHJvdG8uX2luaXQgPSBwcm90by5hcnJhbmdlO1xuXG4gIHByb3RvLl9oaWRlUmV2ZWFsID0gZnVuY3Rpb24gKGZpbHRlcmVkKSB7XG4gICAgdGhpcy5yZXZlYWwoZmlsdGVyZWQubmVlZFJldmVhbCk7XG4gICAgdGhpcy5oaWRlKGZpbHRlcmVkLm5lZWRIaWRlKTtcbiAgfTsgLy8gSEFDS1xuICAvLyBEb24ndCBhbmltYXRlL3RyYW5zaXRpb24gZmlyc3QgbGF5b3V0XG4gIC8vIE9yIGRvbid0IGFuaW1hdGUvdHJhbnNpdGlvbiBvdGhlciBsYXlvdXRzXG5cblxuICBwcm90by5fZ2V0SXNJbnN0YW50ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpc0xheW91dEluc3RhbnQgPSB0aGlzLl9nZXRPcHRpb24oJ2xheW91dEluc3RhbnQnKTtcblxuICAgIHZhciBpc0luc3RhbnQgPSBpc0xheW91dEluc3RhbnQgIT09IHVuZGVmaW5lZCA/IGlzTGF5b3V0SW5zdGFudCA6ICF0aGlzLl9pc0xheW91dEluaXRlZDtcbiAgICB0aGlzLl9pc0luc3RhbnQgPSBpc0luc3RhbnQ7XG4gICAgcmV0dXJuIGlzSW5zdGFudDtcbiAgfTsgLy8gbGlzdGVuIGZvciBsYXlvdXRDb21wbGV0ZSwgaGlkZUNvbXBsZXRlIGFuZCByZXZlYWxDb21wbGV0ZVxuICAvLyB0byB0cmlnZ2VyIGFycmFuZ2VDb21wbGV0ZVxuXG5cbiAgcHJvdG8uX2JpbmRBcnJhbmdlQ29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gbGlzdGVuIGZvciAzIGV2ZW50cyB0byB0cmlnZ2VyIGFycmFuZ2VDb21wbGV0ZVxuICAgIHZhciBpc0xheW91dENvbXBsZXRlLCBpc0hpZGVDb21wbGV0ZSwgaXNSZXZlYWxDb21wbGV0ZTtcblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBhcnJhbmdlUGFyYWxsZWxDYWxsYmFjaygpIHtcbiAgICAgIGlmIChpc0xheW91dENvbXBsZXRlICYmIGlzSGlkZUNvbXBsZXRlICYmIGlzUmV2ZWFsQ29tcGxldGUpIHtcbiAgICAgICAgX3RoaXMuZGlzcGF0Y2hFdmVudCgnYXJyYW5nZUNvbXBsZXRlJywgbnVsbCwgW190aGlzLmZpbHRlcmVkSXRlbXNdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLm9uY2UoJ2xheW91dENvbXBsZXRlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaXNMYXlvdXRDb21wbGV0ZSA9IHRydWU7XG4gICAgICBhcnJhbmdlUGFyYWxsZWxDYWxsYmFjaygpO1xuICAgIH0pO1xuICAgIHRoaXMub25jZSgnaGlkZUNvbXBsZXRlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaXNIaWRlQ29tcGxldGUgPSB0cnVlO1xuICAgICAgYXJyYW5nZVBhcmFsbGVsQ2FsbGJhY2soKTtcbiAgICB9KTtcbiAgICB0aGlzLm9uY2UoJ3JldmVhbENvbXBsZXRlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaXNSZXZlYWxDb21wbGV0ZSA9IHRydWU7XG4gICAgICBhcnJhbmdlUGFyYWxsZWxDYWxsYmFjaygpO1xuICAgIH0pO1xuICB9OyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBmaWx0ZXIgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cblxuXG4gIHByb3RvLl9maWx0ZXIgPSBmdW5jdGlvbiAoaXRlbXMpIHtcbiAgICB2YXIgZmlsdGVyID0gdGhpcy5vcHRpb25zLmZpbHRlcjtcbiAgICBmaWx0ZXIgPSBmaWx0ZXIgfHwgJyonO1xuICAgIHZhciBtYXRjaGVzID0gW107XG4gICAgdmFyIGhpZGRlbk1hdGNoZWQgPSBbXTtcbiAgICB2YXIgdmlzaWJsZVVubWF0Y2hlZCA9IFtdO1xuXG4gICAgdmFyIHRlc3QgPSB0aGlzLl9nZXRGaWx0ZXJUZXN0KGZpbHRlcik7IC8vIHRlc3QgZWFjaCBpdGVtXG5cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBpdGVtID0gaXRlbXNbaV07XG5cbiAgICAgIGlmIChpdGVtLmlzSWdub3JlZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gLy8gYWRkIGl0ZW0gdG8gZWl0aGVyIG1hdGNoZWQgb3IgdW5tYXRjaGVkIGdyb3VwXG5cblxuICAgICAgdmFyIGlzTWF0Y2hlZCA9IHRlc3QoaXRlbSk7IC8vIGl0ZW0uaXNGaWx0ZXJNYXRjaGVkID0gaXNNYXRjaGVkO1xuICAgICAgLy8gYWRkIHRvIG1hdGNoZXMgaWYgaXRzIGEgbWF0Y2hcblxuICAgICAgaWYgKGlzTWF0Y2hlZCkge1xuICAgICAgICBtYXRjaGVzLnB1c2goaXRlbSk7XG4gICAgICB9IC8vIGFkZCB0byBhZGRpdGlvbmFsIGdyb3VwIGlmIGl0ZW0gbmVlZHMgdG8gYmUgaGlkZGVuIG9yIHJldmVhbGVkXG5cblxuICAgICAgaWYgKGlzTWF0Y2hlZCAmJiBpdGVtLmlzSGlkZGVuKSB7XG4gICAgICAgIGhpZGRlbk1hdGNoZWQucHVzaChpdGVtKTtcbiAgICAgIH0gZWxzZSBpZiAoIWlzTWF0Y2hlZCAmJiAhaXRlbS5pc0hpZGRlbikge1xuICAgICAgICB2aXNpYmxlVW5tYXRjaGVkLnB1c2goaXRlbSk7XG4gICAgICB9XG4gICAgfSAvLyByZXR1cm4gY29sbGVjdGlvbnMgb2YgaXRlbXMgdG8gYmUgbWFuaXB1bGF0ZWRcblxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1hdGNoZXM6IG1hdGNoZXMsXG4gICAgICBuZWVkUmV2ZWFsOiBoaWRkZW5NYXRjaGVkLFxuICAgICAgbmVlZEhpZGU6IHZpc2libGVVbm1hdGNoZWRcbiAgICB9O1xuICB9OyAvLyBnZXQgYSBqUXVlcnksIGZ1bmN0aW9uLCBvciBhIG1hdGNoZXNTZWxlY3RvciB0ZXN0IGdpdmVuIHRoZSBmaWx0ZXJcblxuXG4gIHByb3RvLl9nZXRGaWx0ZXJUZXN0ID0gZnVuY3Rpb24gKGZpbHRlcikge1xuICAgIGlmIChqUXVlcnkgJiYgdGhpcy5vcHRpb25zLmlzSlF1ZXJ5RmlsdGVyaW5nKSB7XG4gICAgICAvLyB1c2UgalF1ZXJ5XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGpRdWVyeShpdGVtLmVsZW1lbnQpLmlzKGZpbHRlcik7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZmlsdGVyID09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIHVzZSBmaWx0ZXIgYXMgZnVuY3Rpb25cbiAgICAgIHJldHVybiBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICByZXR1cm4gZmlsdGVyKGl0ZW0uZWxlbWVudCk7XG4gICAgICB9O1xuICAgIH0gLy8gZGVmYXVsdCwgdXNlIGZpbHRlciBhcyBzZWxlY3RvciBzdHJpbmdcblxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICByZXR1cm4gbWF0Y2hlc1NlbGVjdG9yKGl0ZW0uZWxlbWVudCwgZmlsdGVyKTtcbiAgICB9O1xuICB9OyAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBzb3J0aW5nIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG5cbiAgLyoqXG4gICAqIEBwYXJhbXMge0FycmF5fSBlbGVtc1xuICAgKiBAcHVibGljXG4gICAqL1xuXG5cbiAgcHJvdG8udXBkYXRlU29ydERhdGEgPSBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICAvLyBnZXQgaXRlbXNcbiAgICB2YXIgaXRlbXM7XG5cbiAgICBpZiAoZWxlbXMpIHtcbiAgICAgIGVsZW1zID0gdXRpbHMubWFrZUFycmF5KGVsZW1zKTtcbiAgICAgIGl0ZW1zID0gdGhpcy5nZXRJdGVtcyhlbGVtcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHVwZGF0ZSBhbGwgaXRlbXMgaWYgbm8gZWxlbXMgcHJvdmlkZWRcbiAgICAgIGl0ZW1zID0gdGhpcy5pdGVtcztcbiAgICB9XG5cbiAgICB0aGlzLl9nZXRTb3J0ZXJzKCk7XG5cbiAgICB0aGlzLl91cGRhdGVJdGVtc1NvcnREYXRhKGl0ZW1zKTtcbiAgfTtcblxuICBwcm90by5fZ2V0U29ydGVycyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZ2V0U29ydERhdGEgPSB0aGlzLm9wdGlvbnMuZ2V0U29ydERhdGE7XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gZ2V0U29ydERhdGEpIHtcbiAgICAgIHZhciBzb3J0ZXIgPSBnZXRTb3J0RGF0YVtrZXldO1xuICAgICAgdGhpcy5fc29ydGVyc1trZXldID0gbXVuZ2VTb3J0ZXIoc29ydGVyKTtcbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBAcGFyYW1zIHtBcnJheX0gaXRlbXMgLSBvZiBJc290b3BlLkl0ZW1zXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG5cbiAgcHJvdG8uX3VwZGF0ZUl0ZW1zU29ydERhdGEgPSBmdW5jdGlvbiAoaXRlbXMpIHtcbiAgICAvLyBkbyBub3QgdXBkYXRlIGlmIG5vIGl0ZW1zXG4gICAgdmFyIGxlbiA9IGl0ZW1zICYmIGl0ZW1zLmxlbmd0aDtcblxuICAgIGZvciAodmFyIGkgPSAwOyBsZW4gJiYgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgaXRlbSA9IGl0ZW1zW2ldO1xuICAgICAgaXRlbS51cGRhdGVTb3J0RGF0YSgpO1xuICAgIH1cbiAgfTsgLy8gLS0tLS0gbXVuZ2Ugc29ydGVyIC0tLS0tIC8vXG4gIC8vIGVuY2Fwc3VsYXRlIHRoaXMsIGFzIHdlIGp1c3QgbmVlZCBtdW5nZVNvcnRlclxuICAvLyBvdGhlciBmdW5jdGlvbnMgaW4gaGVyZSBhcmUganVzdCBmb3IgbXVuZ2luZ1xuXG5cbiAgdmFyIG11bmdlU29ydGVyID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGFkZCBhIG1hZ2ljIGxheWVyIHRvIHNvcnRlcnMgZm9yIGNvbnZpZW5lbnQgc2hvcnRoYW5kc1xuICAgIC8vIGAuZm9vLWJhcmAgd2lsbCB1c2UgdGhlIHRleHQgb2YgLmZvby1iYXIgcXVlcnlTZWxlY3RvclxuICAgIC8vIGBbZm9vLWJhcl1gIHdpbGwgdXNlIGF0dHJpYnV0ZVxuICAgIC8vIHlvdSBjYW4gYWxzbyBhZGQgcGFyc2VyXG4gICAgLy8gYC5mb28tYmFyIHBhcnNlSW50YCB3aWxsIHBhcnNlIHRoYXQgYXMgYSBudW1iZXJcbiAgICBmdW5jdGlvbiBtdW5nZVNvcnRlcihzb3J0ZXIpIHtcbiAgICAgIC8vIGlmIG5vdCBhIHN0cmluZywgcmV0dXJuIGZ1bmN0aW9uIG9yIHdoYXRldmVyIGl0IGlzXG4gICAgICBpZiAodHlwZW9mIHNvcnRlciAhPSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gc29ydGVyO1xuICAgICAgfSAvLyBwYXJzZSB0aGUgc29ydGVyIHN0cmluZ1xuXG5cbiAgICAgIHZhciBhcmdzID0gdHJpbShzb3J0ZXIpLnNwbGl0KCcgJyk7XG4gICAgICB2YXIgcXVlcnkgPSBhcmdzWzBdOyAvLyBjaGVjayBpZiBxdWVyeSBsb29rcyBsaWtlIFthbi1hdHRyaWJ1dGVdXG5cbiAgICAgIHZhciBhdHRyTWF0Y2ggPSBxdWVyeS5tYXRjaCgvXlxcWyguKylcXF0kLyk7XG4gICAgICB2YXIgYXR0ciA9IGF0dHJNYXRjaCAmJiBhdHRyTWF0Y2hbMV07XG4gICAgICB2YXIgZ2V0VmFsdWUgPSBnZXRWYWx1ZUdldHRlcihhdHRyLCBxdWVyeSk7IC8vIHVzZSBzZWNvbmQgYXJndW1lbnQgYXMgYSBwYXJzZXJcblxuICAgICAgdmFyIHBhcnNlciA9IElzb3RvcGUuc29ydERhdGFQYXJzZXJzW2FyZ3NbMV1dOyAvLyBwYXJzZSB0aGUgdmFsdWUsIGlmIHRoZXJlIHdhcyBhIHBhcnNlclxuXG4gICAgICBzb3J0ZXIgPSBwYXJzZXIgPyBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICByZXR1cm4gZWxlbSAmJiBwYXJzZXIoZ2V0VmFsdWUoZWxlbSkpO1xuICAgICAgfSA6IC8vIG90aGVyd2lzZSBqdXN0IHJldHVybiB2YWx1ZVxuICAgICAgZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgcmV0dXJuIGVsZW0gJiYgZ2V0VmFsdWUoZWxlbSk7XG4gICAgICB9O1xuICAgICAgcmV0dXJuIHNvcnRlcjtcbiAgICB9IC8vIGdldCBhbiBhdHRyaWJ1dGUgZ2V0dGVyLCBvciBnZXQgdGV4dCBvZiB0aGUgcXVlcnlTZWxlY3RvclxuXG5cbiAgICBmdW5jdGlvbiBnZXRWYWx1ZUdldHRlcihhdHRyLCBxdWVyeSkge1xuICAgICAgLy8gaWYgcXVlcnkgbG9va3MgbGlrZSBbZm9vLWJhcl0sIGdldCBhdHRyaWJ1dGVcbiAgICAgIGlmIChhdHRyKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBnZXRBdHRyaWJ1dGUoZWxlbSkge1xuICAgICAgICAgIHJldHVybiBlbGVtLmdldEF0dHJpYnV0ZShhdHRyKTtcbiAgICAgICAgfTtcbiAgICAgIH0gLy8gb3RoZXJ3aXNlLCBhc3N1bWUgaXRzIGEgcXVlcnlTZWxlY3RvciwgYW5kIGdldCBpdHMgdGV4dFxuXG5cbiAgICAgIHJldHVybiBmdW5jdGlvbiBnZXRDaGlsZFRleHQoZWxlbSkge1xuICAgICAgICB2YXIgY2hpbGQgPSBlbGVtLnF1ZXJ5U2VsZWN0b3IocXVlcnkpO1xuICAgICAgICByZXR1cm4gY2hpbGQgJiYgY2hpbGQudGV4dENvbnRlbnQ7XG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBtdW5nZVNvcnRlcjtcbiAgfSgpOyAvLyBwYXJzZXJzIHVzZWQgaW4gZ2V0U29ydERhdGEgc2hvcnRjdXQgc3RyaW5nc1xuXG5cbiAgSXNvdG9wZS5zb3J0RGF0YVBhcnNlcnMgPSB7XG4gICAgJ3BhcnNlSW50JzogZnVuY3Rpb24gKF9wYXJzZUludCkge1xuICAgICAgZnVuY3Rpb24gcGFyc2VJbnQoX3gpIHtcbiAgICAgICAgcmV0dXJuIF9wYXJzZUludC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuXG4gICAgICBwYXJzZUludC50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIF9wYXJzZUludC50b1N0cmluZygpO1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIHBhcnNlSW50O1xuICAgIH0oZnVuY3Rpb24gKHZhbCkge1xuICAgICAgcmV0dXJuIHBhcnNlSW50KHZhbCwgMTApO1xuICAgIH0pLFxuICAgICdwYXJzZUZsb2F0JzogZnVuY3Rpb24gKF9wYXJzZUZsb2F0KSB7XG4gICAgICBmdW5jdGlvbiBwYXJzZUZsb2F0KF94Mikge1xuICAgICAgICByZXR1cm4gX3BhcnNlRmxvYXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH1cblxuICAgICAgcGFyc2VGbG9hdC50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIF9wYXJzZUZsb2F0LnRvU3RyaW5nKCk7XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gcGFyc2VGbG9hdDtcbiAgICB9KGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KHZhbCk7XG4gICAgfSlcbiAgfTsgLy8gLS0tLS0gc29ydCBtZXRob2QgLS0tLS0gLy9cbiAgLy8gc29ydCBmaWx0ZXJlZEl0ZW0gb3JkZXJcblxuICBwcm90by5fc29ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMub3B0aW9ucy5zb3J0QnkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIGtlZXAgdHJhY2sgb2Ygc29ydEJ5IEhpc3RvcnlcblxuXG4gICAgdmFyIHNvcnRCeXMgPSB1dGlscy5tYWtlQXJyYXkodGhpcy5vcHRpb25zLnNvcnRCeSk7XG5cbiAgICBpZiAoIXRoaXMuX2dldElzU2FtZVNvcnRCeShzb3J0QnlzKSkge1xuICAgICAgLy8gY29uY2F0IGFsbCBzb3J0QnkgYW5kIHNvcnRIaXN0b3J5LCBhZGQgdG8gZnJvbnQsIG9sZGVzdCBnb2VzIGluIGxhc3RcbiAgICAgIHRoaXMuc29ydEhpc3RvcnkgPSBzb3J0QnlzLmNvbmNhdCh0aGlzLnNvcnRIaXN0b3J5KTtcbiAgICB9IC8vIHNvcnQgbWFnaWNcblxuXG4gICAgdmFyIGl0ZW1Tb3J0ZXIgPSBnZXRJdGVtU29ydGVyKHRoaXMuc29ydEhpc3RvcnksIHRoaXMub3B0aW9ucy5zb3J0QXNjZW5kaW5nKTtcbiAgICB0aGlzLmZpbHRlcmVkSXRlbXMuc29ydChpdGVtU29ydGVyKTtcbiAgfTsgLy8gY2hlY2sgaWYgc29ydEJ5cyBpcyBzYW1lIGFzIHN0YXJ0IG9mIHNvcnRIaXN0b3J5XG5cblxuICBwcm90by5fZ2V0SXNTYW1lU29ydEJ5ID0gZnVuY3Rpb24gKHNvcnRCeXMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNvcnRCeXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChzb3J0QnlzW2ldICE9IHRoaXMuc29ydEhpc3RvcnlbaV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9OyAvLyByZXR1cm5zIGEgZnVuY3Rpb24gdXNlZCBmb3Igc29ydGluZ1xuXG5cbiAgZnVuY3Rpb24gZ2V0SXRlbVNvcnRlcihzb3J0QnlzLCBzb3J0QXNjKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIHNvcnRlcihpdGVtQSwgaXRlbUIpIHtcbiAgICAgIC8vIGN5Y2xlIHRocm91Z2ggYWxsIHNvcnRLZXlzXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNvcnRCeXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvcnRCeSA9IHNvcnRCeXNbaV07XG4gICAgICAgIHZhciBhID0gaXRlbUEuc29ydERhdGFbc29ydEJ5XTtcbiAgICAgICAgdmFyIGIgPSBpdGVtQi5zb3J0RGF0YVtzb3J0QnldO1xuXG4gICAgICAgIGlmIChhID4gYiB8fCBhIDwgYikge1xuICAgICAgICAgIC8vIGlmIHNvcnRBc2MgaXMgYW4gb2JqZWN0LCB1c2UgdGhlIHZhbHVlIGdpdmVuIHRoZSBzb3J0Qnkga2V5XG4gICAgICAgICAgdmFyIGlzQXNjZW5kaW5nID0gc29ydEFzY1tzb3J0QnldICE9PSB1bmRlZmluZWQgPyBzb3J0QXNjW3NvcnRCeV0gOiBzb3J0QXNjO1xuICAgICAgICAgIHZhciBkaXJlY3Rpb24gPSBpc0FzY2VuZGluZyA/IDEgOiAtMTtcbiAgICAgICAgICByZXR1cm4gKGEgPiBiID8gMSA6IC0xKSAqIGRpcmVjdGlvbjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gMDtcbiAgICB9O1xuICB9IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIG1ldGhvZHMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cbiAgLy8gZ2V0IGxheW91dCBtb2RlXG5cblxuICBwcm90by5fbW9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbGF5b3V0TW9kZSA9IHRoaXMub3B0aW9ucy5sYXlvdXRNb2RlO1xuICAgIHZhciBtb2RlID0gdGhpcy5tb2Rlc1tsYXlvdXRNb2RlXTtcblxuICAgIGlmICghbW9kZSkge1xuICAgICAgLy8gVE9ETyBjb25zb2xlLmVycm9yXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGxheW91dCBtb2RlOiAnICsgbGF5b3V0TW9kZSk7XG4gICAgfSAvLyBIQUNLIHN5bmMgbW9kZSdzIG9wdGlvbnNcbiAgICAvLyBhbnkgb3B0aW9ucyBzZXQgYWZ0ZXIgaW5pdCBmb3IgbGF5b3V0IG1vZGUgbmVlZCB0byBiZSBzeW5jZWRcblxuXG4gICAgbW9kZS5vcHRpb25zID0gdGhpcy5vcHRpb25zW2xheW91dE1vZGVdO1xuICAgIHJldHVybiBtb2RlO1xuICB9O1xuXG4gIHByb3RvLl9yZXNldExheW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyB0cmlnZ2VyIG9yaWdpbmFsIHJlc2V0IGxheW91dFxuICAgIE91dGxheWVyLnByb3RvdHlwZS5fcmVzZXRMYXlvdXQuY2FsbCh0aGlzKTtcblxuICAgIHRoaXMuX21vZGUoKS5fcmVzZXRMYXlvdXQoKTtcbiAgfTtcblxuICBwcm90by5fZ2V0SXRlbUxheW91dFBvc2l0aW9uID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICByZXR1cm4gdGhpcy5fbW9kZSgpLl9nZXRJdGVtTGF5b3V0UG9zaXRpb24oaXRlbSk7XG4gIH07XG5cbiAgcHJvdG8uX21hbmFnZVN0YW1wID0gZnVuY3Rpb24gKHN0YW1wKSB7XG4gICAgdGhpcy5fbW9kZSgpLl9tYW5hZ2VTdGFtcChzdGFtcCk7XG4gIH07XG5cbiAgcHJvdG8uX2dldENvbnRhaW5lclNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX21vZGUoKS5fZ2V0Q29udGFpbmVyU2l6ZSgpO1xuICB9O1xuXG4gIHByb3RvLm5lZWRzUmVzaXplTGF5b3V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9tb2RlKCkubmVlZHNSZXNpemVMYXlvdXQoKTtcbiAgfTsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gYWRkaW5nICYgcmVtb3ZpbmcgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cbiAgLy8gSEVBRFMgVVAgb3ZlcndyaXRlcyBkZWZhdWx0IE91dGxheWVyIGFwcGVuZGVkXG5cblxuICBwcm90by5hcHBlbmRlZCA9IGZ1bmN0aW9uIChlbGVtcykge1xuICAgIHZhciBpdGVtcyA9IHRoaXMuYWRkSXRlbXMoZWxlbXMpO1xuXG4gICAgaWYgKCFpdGVtcy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIGZpbHRlciwgbGF5b3V0LCByZXZlYWwgbmV3IGl0ZW1zXG5cblxuICAgIHZhciBmaWx0ZXJlZEl0ZW1zID0gdGhpcy5fZmlsdGVyUmV2ZWFsQWRkZWQoaXRlbXMpOyAvLyBhZGQgdG8gZmlsdGVyZWRJdGVtc1xuXG5cbiAgICB0aGlzLmZpbHRlcmVkSXRlbXMgPSB0aGlzLmZpbHRlcmVkSXRlbXMuY29uY2F0KGZpbHRlcmVkSXRlbXMpO1xuICB9OyAvLyBIRUFEUyBVUCBvdmVyd3JpdGVzIGRlZmF1bHQgT3V0bGF5ZXIgcHJlcGVuZGVkXG5cblxuICBwcm90by5wcmVwZW5kZWQgPSBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICB2YXIgaXRlbXMgPSB0aGlzLl9pdGVtaXplKGVsZW1zKTtcblxuICAgIGlmICghaXRlbXMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBzdGFydCBuZXcgbGF5b3V0XG5cblxuICAgIHRoaXMuX3Jlc2V0TGF5b3V0KCk7XG5cbiAgICB0aGlzLl9tYW5hZ2VTdGFtcHMoKTsgLy8gZmlsdGVyLCBsYXlvdXQsIHJldmVhbCBuZXcgaXRlbXNcblxuXG4gICAgdmFyIGZpbHRlcmVkSXRlbXMgPSB0aGlzLl9maWx0ZXJSZXZlYWxBZGRlZChpdGVtcyk7IC8vIGxheW91dCBwcmV2aW91cyBpdGVtc1xuXG5cbiAgICB0aGlzLmxheW91dEl0ZW1zKHRoaXMuZmlsdGVyZWRJdGVtcyk7IC8vIGFkZCB0byBpdGVtcyBhbmQgZmlsdGVyZWRJdGVtc1xuXG4gICAgdGhpcy5maWx0ZXJlZEl0ZW1zID0gZmlsdGVyZWRJdGVtcy5jb25jYXQodGhpcy5maWx0ZXJlZEl0ZW1zKTtcbiAgICB0aGlzLml0ZW1zID0gaXRlbXMuY29uY2F0KHRoaXMuaXRlbXMpO1xuICB9O1xuXG4gIHByb3RvLl9maWx0ZXJSZXZlYWxBZGRlZCA9IGZ1bmN0aW9uIChpdGVtcykge1xuICAgIHZhciBmaWx0ZXJlZCA9IHRoaXMuX2ZpbHRlcihpdGVtcyk7XG5cbiAgICB0aGlzLmhpZGUoZmlsdGVyZWQubmVlZEhpZGUpOyAvLyByZXZlYWwgYWxsIG5ldyBpdGVtc1xuXG4gICAgdGhpcy5yZXZlYWwoZmlsdGVyZWQubWF0Y2hlcyk7IC8vIGxheW91dCBuZXcgaXRlbXMsIG5vIHRyYW5zaXRpb25cblxuICAgIHRoaXMubGF5b3V0SXRlbXMoZmlsdGVyZWQubWF0Y2hlcywgdHJ1ZSk7XG4gICAgcmV0dXJuIGZpbHRlcmVkLm1hdGNoZXM7XG4gIH07XG4gIC8qKlxuICAgKiBGaWx0ZXIsIHNvcnQsIGFuZCBsYXlvdXQgbmV3bHktYXBwZW5kZWQgaXRlbSBlbGVtZW50c1xuICAgKiBAcGFyYW0ge0FycmF5IG9yIE5vZGVMaXN0IG9yIEVsZW1lbnR9IGVsZW1zXG4gICAqL1xuXG5cbiAgcHJvdG8uaW5zZXJ0ID0gZnVuY3Rpb24gKGVsZW1zKSB7XG4gICAgdmFyIGl0ZW1zID0gdGhpcy5hZGRJdGVtcyhlbGVtcyk7XG5cbiAgICBpZiAoIWl0ZW1zLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gYXBwZW5kIGl0ZW0gZWxlbWVudHNcblxuXG4gICAgdmFyIGksIGl0ZW07XG4gICAgdmFyIGxlbiA9IGl0ZW1zLmxlbmd0aDtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgaXRlbSA9IGl0ZW1zW2ldO1xuICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKGl0ZW0uZWxlbWVudCk7XG4gICAgfSAvLyBmaWx0ZXIgbmV3IHN0dWZmXG5cblxuICAgIHZhciBmaWx0ZXJlZEluc2VydEl0ZW1zID0gdGhpcy5fZmlsdGVyKGl0ZW1zKS5tYXRjaGVzOyAvLyBzZXQgZmxhZ1xuXG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGl0ZW1zW2ldLmlzTGF5b3V0SW5zdGFudCA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5hcnJhbmdlKCk7IC8vIHJlc2V0IGZsYWdcblxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgZGVsZXRlIGl0ZW1zW2ldLmlzTGF5b3V0SW5zdGFudDtcbiAgICB9XG5cbiAgICB0aGlzLnJldmVhbChmaWx0ZXJlZEluc2VydEl0ZW1zKTtcbiAgfTtcblxuICB2YXIgX3JlbW92ZSA9IHByb3RvLnJlbW92ZTtcblxuICBwcm90by5yZW1vdmUgPSBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICBlbGVtcyA9IHV0aWxzLm1ha2VBcnJheShlbGVtcyk7XG4gICAgdmFyIHJlbW92ZUl0ZW1zID0gdGhpcy5nZXRJdGVtcyhlbGVtcyk7IC8vIGRvIHJlZ3VsYXIgdGhpbmdcblxuICAgIF9yZW1vdmUuY2FsbCh0aGlzLCBlbGVtcyk7IC8vIGJhaWwgaWYgbm8gaXRlbXMgdG8gcmVtb3ZlXG5cblxuICAgIHZhciBsZW4gPSByZW1vdmVJdGVtcyAmJiByZW1vdmVJdGVtcy5sZW5ndGg7IC8vIHJlbW92ZSBlbGVtcyBmcm9tIGZpbHRlcmVkSXRlbXNcblxuICAgIGZvciAodmFyIGkgPSAwOyBsZW4gJiYgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgaXRlbSA9IHJlbW92ZUl0ZW1zW2ldOyAvLyByZW1vdmUgaXRlbSBmcm9tIGNvbGxlY3Rpb25cblxuICAgICAgdXRpbHMucmVtb3ZlRnJvbSh0aGlzLmZpbHRlcmVkSXRlbXMsIGl0ZW0pO1xuICAgIH1cbiAgfTtcblxuICBwcm90by5zaHVmZmxlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIHVwZGF0ZSByYW5kb20gc29ydERhdGFcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBpdGVtID0gdGhpcy5pdGVtc1tpXTtcbiAgICAgIGl0ZW0uc29ydERhdGEucmFuZG9tID0gTWF0aC5yYW5kb20oKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMuc29ydEJ5ID0gJ3JhbmRvbSc7XG5cbiAgICB0aGlzLl9zb3J0KCk7XG5cbiAgICB0aGlzLl9sYXlvdXQoKTtcbiAgfTtcbiAgLyoqXG4gICAqIHRyaWdnZXIgZm4gd2l0aG91dCB0cmFuc2l0aW9uXG4gICAqIGtpbmQgb2YgaGFja3kgdG8gaGF2ZSB0aGlzIGluIHRoZSBmaXJzdCBwbGFjZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgKiBAcGFyYW0ge0FycmF5fSBhcmdzXG4gICAqIEByZXR1cm5zIHJldFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuXG4gIHByb3RvLl9ub1RyYW5zaXRpb24gPSBmdW5jdGlvbiAoZm4sIGFyZ3MpIHtcbiAgICAvLyBzYXZlIHRyYW5zaXRpb25EdXJhdGlvbiBiZWZvcmUgZGlzYWJsaW5nXG4gICAgdmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IHRoaXMub3B0aW9ucy50cmFuc2l0aW9uRHVyYXRpb247IC8vIGRpc2FibGUgdHJhbnNpdGlvblxuXG4gICAgdGhpcy5vcHRpb25zLnRyYW5zaXRpb25EdXJhdGlvbiA9IDA7IC8vIGRvIGl0XG5cbiAgICB2YXIgcmV0dXJuVmFsdWUgPSBmbi5hcHBseSh0aGlzLCBhcmdzKTsgLy8gcmUtZW5hYmxlIHRyYW5zaXRpb24gZm9yIHJldmVhbFxuXG4gICAgdGhpcy5vcHRpb25zLnRyYW5zaXRpb25EdXJhdGlvbiA9IHRyYW5zaXRpb25EdXJhdGlvbjtcbiAgICByZXR1cm4gcmV0dXJuVmFsdWU7XG4gIH07IC8vIC0tLS0tIGhlbHBlciBtZXRob2RzIC0tLS0tIC8vXG5cbiAgLyoqXG4gICAqIGdldHRlciBtZXRob2QgZm9yIGdldHRpbmcgZmlsdGVyZWQgaXRlbSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7QXJyYXl9IGVsZW1zIC0gY29sbGVjdGlvbiBvZiBpdGVtIGVsZW1lbnRzXG4gICAqL1xuXG5cbiAgcHJvdG8uZ2V0RmlsdGVyZWRJdGVtRWxlbWVudHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyZWRJdGVtcy5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHJldHVybiBpdGVtLmVsZW1lbnQ7XG4gICAgfSk7XG4gIH07IC8vIC0tLS0tICAtLS0tLSAvL1xuXG5cbiAgcmV0dXJuIElzb3RvcGU7XG59KTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBSZWxsYXguanNcbi8vIEJ1dHRlcnkgc21vb3RoIHBhcmFsbGF4IGxpYnJhcnlcbi8vIENvcHlyaWdodCAoYykgMjAxNiBNb2UgQW1heWEgKEBtb2VhbWF5YSlcbi8vIE1JVCBsaWNlbnNlXG4vL1xuLy8gVGhhbmtzIHRvIFBhcmF4aWZ5LmpzIGFuZCBKYWltZSBDYWJsbGVyb1xuLy8gZm9yIHBhcmFsbGF4IGNvbmNlcHRzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBtb2R1bGUgPT09IFwidW5kZWZpbmVkXCIgPyBcInVuZGVmaW5lZFwiIDogX3R5cGVvZihtb2R1bGUpKSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBOb2RlLiBEb2VzIG5vdCB3b3JrIHdpdGggc3RyaWN0IENvbW1vbkpTLCBidXRcbiAgICAvLyBvbmx5IENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cyxcbiAgICAvLyBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICByb290LlJlbGxheCA9IGZhY3RvcnkoKTtcbiAgfVxufSkodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IGdsb2JhbCwgZnVuY3Rpb24gKCkge1xuICB2YXIgUmVsbGF4ID0gZnVuY3Rpb24gUmVsbGF4KGVsLCBvcHRpb25zKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgc2VsZiA9IE9iamVjdC5jcmVhdGUoUmVsbGF4LnByb3RvdHlwZSk7XG4gICAgdmFyIHBvc1kgPSAwO1xuICAgIHZhciBzY3JlZW5ZID0gMDtcbiAgICB2YXIgcG9zWCA9IDA7XG4gICAgdmFyIHNjcmVlblggPSAwO1xuICAgIHZhciBibG9ja3MgPSBbXTtcbiAgICB2YXIgcGF1c2UgPSB0cnVlOyAvLyBjaGVjayB3aGF0IHJlcXVlc3RBbmltYXRpb25GcmFtZSB0byB1c2UsIGFuZCBpZlxuICAgIC8vIGl0J3Mgbm90IHN1cHBvcnRlZCwgdXNlIHRoZSBvbnNjcm9sbCBldmVudFxuXG4gICAgdmFyIGxvb3AgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKTtcbiAgICB9OyAvLyBzdG9yZSB0aGUgaWQgZm9yIGxhdGVyIHVzZVxuXG5cbiAgICB2YXIgbG9vcElkID0gbnVsbDsgLy8gVGVzdCB2aWEgYSBnZXR0ZXIgaW4gdGhlIG9wdGlvbnMgb2JqZWN0IHRvIHNlZSBpZiB0aGUgcGFzc2l2ZSBwcm9wZXJ0eSBpcyBhY2Nlc3NlZFxuXG4gICAgdmFyIHN1cHBvcnRzUGFzc2l2ZSA9IGZhbHNlO1xuXG4gICAgdHJ5IHtcbiAgICAgIHZhciBvcHRzID0gT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LCAncGFzc2l2ZScsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgc3VwcG9ydHNQYXNzaXZlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInRlc3RQYXNzaXZlXCIsIG51bGwsIG9wdHMpO1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ0ZXN0UGFzc2l2ZVwiLCBudWxsLCBvcHRzKTtcbiAgICB9IGNhdGNoIChlKSB7fSAvLyBjaGVjayB3aGF0IGNhbmNlbEFuaW1hdGlvbiBtZXRob2QgdG8gdXNlXG5cblxuICAgIHZhciBjbGVhckxvb3AgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IGNsZWFyVGltZW91dDsgLy8gY2hlY2sgd2hpY2ggdHJhbnNmb3JtIHByb3BlcnR5IHRvIHVzZVxuXG4gICAgdmFyIHRyYW5zZm9ybVByb3AgPSB3aW5kb3cudHJhbnNmb3JtUHJvcCB8fCBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgdGVzdEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICAgIGlmICh0ZXN0RWwuc3R5bGUudHJhbnNmb3JtID09PSBudWxsKSB7XG4gICAgICAgIHZhciB2ZW5kb3JzID0gWydXZWJraXQnLCAnTW96JywgJ21zJ107XG5cbiAgICAgICAgZm9yICh2YXIgdmVuZG9yIGluIHZlbmRvcnMpIHtcbiAgICAgICAgICBpZiAodGVzdEVsLnN0eWxlW3ZlbmRvcnNbdmVuZG9yXSArICdUcmFuc2Zvcm0nXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdmVuZG9yc1t2ZW5kb3JdICsgJ1RyYW5zZm9ybSc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAndHJhbnNmb3JtJztcbiAgICB9KCk7IC8vIERlZmF1bHQgU2V0dGluZ3NcblxuXG4gICAgc2VsZi5vcHRpb25zID0ge1xuICAgICAgc3BlZWQ6IC0yLFxuICAgICAgdmVydGljYWxTcGVlZDogbnVsbCxcbiAgICAgIGhvcml6b250YWxTcGVlZDogbnVsbCxcbiAgICAgIGJyZWFrcG9pbnRzOiBbNTc2LCA3NjgsIDEyMDFdLFxuICAgICAgY2VudGVyOiBmYWxzZSxcbiAgICAgIHdyYXBwZXI6IG51bGwsXG4gICAgICByZWxhdGl2ZVRvV3JhcHBlcjogZmFsc2UsXG4gICAgICByb3VuZDogdHJ1ZSxcbiAgICAgIHZlcnRpY2FsOiB0cnVlLFxuICAgICAgaG9yaXpvbnRhbDogZmFsc2UsXG4gICAgICB2ZXJ0aWNhbFNjcm9sbEF4aXM6IFwieVwiLFxuICAgICAgaG9yaXpvbnRhbFNjcm9sbEF4aXM6IFwieFwiLFxuICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uIGNhbGxiYWNrKCkge31cbiAgICB9OyAvLyBVc2VyIGRlZmluZWQgb3B0aW9ucyAobWlnaHQgaGF2ZSBtb3JlIGluIHRoZSBmdXR1cmUpXG5cbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgT2JqZWN0LmtleXMob3B0aW9ucykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHNlbGYub3B0aW9uc1trZXldID0gb3B0aW9uc1trZXldO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmFsaWRhdGVDdXN0b21CcmVha3BvaW50cygpIHtcbiAgICAgIGlmIChzZWxmLm9wdGlvbnMuYnJlYWtwb2ludHMubGVuZ3RoID09PSAzICYmIEFycmF5LmlzQXJyYXkoc2VsZi5vcHRpb25zLmJyZWFrcG9pbnRzKSkge1xuICAgICAgICB2YXIgaXNBc2NlbmRpbmcgPSB0cnVlO1xuICAgICAgICB2YXIgaXNOdW1lcmljYWwgPSB0cnVlO1xuICAgICAgICB2YXIgbGFzdFZhbDtcbiAgICAgICAgc2VsZi5vcHRpb25zLmJyZWFrcG9pbnRzLmZvckVhY2goZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGkgIT09ICdudW1iZXInKSBpc051bWVyaWNhbCA9IGZhbHNlO1xuXG4gICAgICAgICAgaWYgKGxhc3RWYWwgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChpIDwgbGFzdFZhbCkgaXNBc2NlbmRpbmcgPSBmYWxzZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsYXN0VmFsID0gaTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChpc0FzY2VuZGluZyAmJiBpc051bWVyaWNhbCkgcmV0dXJuO1xuICAgICAgfSAvLyByZXZlcnQgZGVmYXVsdHMgaWYgc2V0IGluY29ycmVjdGx5XG5cblxuICAgICAgc2VsZi5vcHRpb25zLmJyZWFrcG9pbnRzID0gWzU3NiwgNzY4LCAxMjAxXTtcbiAgICAgIGNvbnNvbGUud2FybihcIlJlbGxheDogWW91IG11c3QgcGFzcyBhbiBhcnJheSBvZiAzIG51bWJlcnMgaW4gYXNjZW5kaW5nIG9yZGVyIHRvIHRoZSBicmVha3BvaW50cyBvcHRpb24uIERlZmF1bHRzIHJldmVydGVkXCIpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmJyZWFrcG9pbnRzKSB7XG4gICAgICB2YWxpZGF0ZUN1c3RvbUJyZWFrcG9pbnRzKCk7XG4gICAgfSAvLyBCeSBkZWZhdWx0LCByZWxsYXggY2xhc3NcblxuXG4gICAgaWYgKCFlbCkge1xuICAgICAgZWwgPSAnLnJlbGxheCc7XG4gICAgfSAvLyBjaGVjayBpZiBlbCBpcyBhIGNsYXNzTmFtZSBvciBhIG5vZGVcblxuXG4gICAgdmFyIGVsZW1lbnRzID0gdHlwZW9mIGVsID09PSAnc3RyaW5nJyA/IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoZWwpIDogW2VsXTsgLy8gTm93IHF1ZXJ5IHNlbGVjdG9yXG5cbiAgICBpZiAoZWxlbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgc2VsZi5lbGVtcyA9IGVsZW1lbnRzO1xuICAgIH0gLy8gVGhlIGVsZW1lbnRzIGRvbid0IGV4aXN0XG4gICAgZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIlJlbGxheDogVGhlIGVsZW1lbnRzIHlvdSdyZSB0cnlpbmcgdG8gc2VsZWN0IGRvbid0IGV4aXN0LlwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSAvLyBIYXMgYSB3cmFwcGVyIGFuZCBpdCBleGlzdHNcblxuXG4gICAgaWYgKHNlbGYub3B0aW9ucy53cmFwcGVyKSB7XG4gICAgICBpZiAoIXNlbGYub3B0aW9ucy53cmFwcGVyLm5vZGVUeXBlKSB7XG4gICAgICAgIHZhciB3cmFwcGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxmLm9wdGlvbnMud3JhcHBlcik7XG5cbiAgICAgICAgaWYgKHdyYXBwZXIpIHtcbiAgICAgICAgICBzZWxmLm9wdGlvbnMud3JhcHBlciA9IHdyYXBwZXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFwiUmVsbGF4OiBUaGUgd3JhcHBlciB5b3UncmUgdHJ5aW5nIHRvIHVzZSBkb2Vzbid0IGV4aXN0LlwiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IC8vIHNldCBhIHBsYWNlaG9sZGVyIGZvciB0aGUgY3VycmVudCBicmVha3BvaW50XG5cblxuICAgIHZhciBjdXJyZW50QnJlYWtwb2ludDsgLy8gaGVscGVyIHRvIGRldGVybWluZSBjdXJyZW50IGJyZWFrcG9pbnRcblxuICAgIHZhciBnZXRDdXJyZW50QnJlYWtwb2ludCA9IGZ1bmN0aW9uIGdldEN1cnJlbnRCcmVha3BvaW50KHcpIHtcbiAgICAgIHZhciBicCA9IHNlbGYub3B0aW9ucy5icmVha3BvaW50cztcbiAgICAgIGlmICh3IDwgYnBbMF0pIHJldHVybiAneHMnO1xuICAgICAgaWYgKHcgPj0gYnBbMF0gJiYgdyA8IGJwWzFdKSByZXR1cm4gJ3NtJztcbiAgICAgIGlmICh3ID49IGJwWzFdICYmIHcgPCBicFsyXSkgcmV0dXJuICdtZCc7XG4gICAgICByZXR1cm4gJ2xnJztcbiAgICB9OyAvLyBHZXQgYW5kIGNhY2hlIGluaXRpYWwgcG9zaXRpb24gb2YgYWxsIGVsZW1lbnRzXG5cblxuICAgIHZhciBjYWNoZUJsb2NrcyA9IGZ1bmN0aW9uIGNhY2hlQmxvY2tzKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLmVsZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBibG9jayA9IGNyZWF0ZUJsb2NrKHNlbGYuZWxlbXNbaV0pO1xuICAgICAgICBibG9ja3MucHVzaChibG9jayk7XG4gICAgICB9XG4gICAgfTsgLy8gTGV0J3Mga2ljayB0aGlzIHNjcmlwdCBvZmZcbiAgICAvLyBCdWlsZCBhcnJheSBmb3IgY2FjaGVkIGVsZW1lbnQgdmFsdWVzXG5cblxuICAgIHZhciBpbml0ID0gZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYmxvY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHNlbGYuZWxlbXNbaV0uc3R5bGUuY3NzVGV4dCA9IGJsb2Nrc1tpXS5zdHlsZTtcbiAgICAgIH1cblxuICAgICAgYmxvY2tzID0gW107XG4gICAgICBzY3JlZW5ZID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgc2NyZWVuWCA9IHdpbmRvdy5pbm5lcldpZHRoO1xuICAgICAgY3VycmVudEJyZWFrcG9pbnQgPSBnZXRDdXJyZW50QnJlYWtwb2ludChzY3JlZW5YKTtcbiAgICAgIHNldFBvc2l0aW9uKCk7XG4gICAgICBjYWNoZUJsb2NrcygpO1xuICAgICAgYW5pbWF0ZSgpOyAvLyBJZiBwYXVzZWQsIHVucGF1c2UgYW5kIHNldCBsaXN0ZW5lciBmb3Igd2luZG93IHJlc2l6aW5nIGV2ZW50c1xuXG4gICAgICBpZiAocGF1c2UpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGluaXQpO1xuICAgICAgICBwYXVzZSA9IGZhbHNlOyAvLyBTdGFydCB0aGUgbG9vcFxuXG4gICAgICAgIHVwZGF0ZSgpO1xuICAgICAgfVxuICAgIH07IC8vIFdlIHdhbnQgdG8gY2FjaGUgdGhlIHBhcmFsbGF4IGJsb2NrcydcbiAgICAvLyB2YWx1ZXM6IGJhc2UsIHRvcCwgaGVpZ2h0LCBzcGVlZFxuICAgIC8vIGVsOiBpcyBkb20gb2JqZWN0LCByZXR1cm46IGVsIGNhY2hlIHZhbHVlc1xuXG5cbiAgICB2YXIgY3JlYXRlQmxvY2sgPSBmdW5jdGlvbiBjcmVhdGVCbG9jayhlbCkge1xuICAgICAgdmFyIGRhdGFQZXJjZW50YWdlID0gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXJlbGxheC1wZXJjZW50YWdlJyk7XG4gICAgICB2YXIgZGF0YVNwZWVkID0gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXJlbGxheC1zcGVlZCcpO1xuICAgICAgdmFyIGRhdGFYc1NwZWVkID0gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXJlbGxheC14cy1zcGVlZCcpO1xuICAgICAgdmFyIGRhdGFNb2JpbGVTcGVlZCA9IGVsLmdldEF0dHJpYnV0ZSgnZGF0YS1yZWxsYXgtbW9iaWxlLXNwZWVkJyk7XG4gICAgICB2YXIgZGF0YVRhYmxldFNwZWVkID0gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXJlbGxheC10YWJsZXQtc3BlZWQnKTtcbiAgICAgIHZhciBkYXRhRGVza3RvcFNwZWVkID0gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXJlbGxheC1kZXNrdG9wLXNwZWVkJyk7XG4gICAgICB2YXIgZGF0YVZlcnRpY2FsU3BlZWQgPSBlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtcmVsbGF4LXZlcnRpY2FsLXNwZWVkJyk7XG4gICAgICB2YXIgZGF0YUhvcml6b250YWxTcGVlZCA9IGVsLmdldEF0dHJpYnV0ZSgnZGF0YS1yZWxsYXgtaG9yaXpvbnRhbC1zcGVlZCcpO1xuICAgICAgdmFyIGRhdGFWZXJpY2FsU2Nyb2xsQXhpcyA9IGVsLmdldEF0dHJpYnV0ZSgnZGF0YS1yZWxsYXgtdmVydGljYWwtc2Nyb2xsLWF4aXMnKTtcbiAgICAgIHZhciBkYXRhSG9yaXpvbnRhbFNjcm9sbEF4aXMgPSBlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtcmVsbGF4LWhvcml6b250YWwtc2Nyb2xsLWF4aXMnKTtcbiAgICAgIHZhciBkYXRhWmluZGV4ID0gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXJlbGxheC16aW5kZXgnKSB8fCAwO1xuICAgICAgdmFyIGRhdGFNaW4gPSBlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtcmVsbGF4LW1pbicpO1xuICAgICAgdmFyIGRhdGFNYXggPSBlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtcmVsbGF4LW1heCcpO1xuICAgICAgdmFyIGRhdGFNaW5YID0gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXJlbGxheC1taW4teCcpO1xuICAgICAgdmFyIGRhdGFNYXhYID0gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXJlbGxheC1tYXgteCcpO1xuICAgICAgdmFyIGRhdGFNaW5ZID0gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXJlbGxheC1taW4teScpO1xuICAgICAgdmFyIGRhdGFNYXhZID0gZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXJlbGxheC1tYXgteScpO1xuICAgICAgdmFyIG1hcEJyZWFrcG9pbnRzO1xuICAgICAgdmFyIGJyZWFrcG9pbnRzID0gdHJ1ZTtcblxuICAgICAgaWYgKCFkYXRhWHNTcGVlZCAmJiAhZGF0YU1vYmlsZVNwZWVkICYmICFkYXRhVGFibGV0U3BlZWQgJiYgIWRhdGFEZXNrdG9wU3BlZWQpIHtcbiAgICAgICAgYnJlYWtwb2ludHMgPSBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1hcEJyZWFrcG9pbnRzID0ge1xuICAgICAgICAgICd4cyc6IGRhdGFYc1NwZWVkLFxuICAgICAgICAgICdzbSc6IGRhdGFNb2JpbGVTcGVlZCxcbiAgICAgICAgICAnbWQnOiBkYXRhVGFibGV0U3BlZWQsXG4gICAgICAgICAgJ2xnJzogZGF0YURlc2t0b3BTcGVlZFxuICAgICAgICB9O1xuICAgICAgfSAvLyBpbml0aWFsaXppbmcgYXQgc2Nyb2xsWSA9IDAgKHRvcCBvZiBicm93c2VyKSwgc2Nyb2xsWCA9IDAgKGxlZnQgb2YgYnJvd3NlcilcbiAgICAgIC8vIGVuc3VyZXMgZWxlbWVudHMgYXJlIHBvc2l0aW9uZWQgYmFzZWQgb24gSFRNTCBsYXlvdXQuXG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGVsZW1lbnQgaGFzIHRoZSBwZXJjZW50YWdlIGF0dHJpYnV0ZSwgdGhlIHBvc1kgYW5kIHBvc1ggbmVlZHMgdG8gYmVcbiAgICAgIC8vIHRoZSBjdXJyZW50IHNjcm9sbCBwb3NpdGlvbidzIHZhbHVlLCBzbyB0aGF0IHRoZSBlbGVtZW50cyBhcmUgc3RpbGwgcG9zaXRpb25lZCBiYXNlZCBvbiBIVE1MIGxheW91dFxuXG5cbiAgICAgIHZhciB3cmFwcGVyUG9zWSA9IHNlbGYub3B0aW9ucy53cmFwcGVyID8gc2VsZi5vcHRpb25zLndyYXBwZXIuc2Nyb2xsVG9wIDogd2luZG93LnBhZ2VZT2Zmc2V0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3AgfHwgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3A7IC8vIElmIHRoZSBvcHRpb24gcmVsYXRpdmVUb1dyYXBwZXIgaXMgdHJ1ZSwgdXNlIHRoZSB3cmFwcGVycyBvZmZzZXQgdG8gdG9wLCBzdWJ0cmFjdGVkIGZyb20gdGhlIGN1cnJlbnQgcGFnZSBzY3JvbGwuXG5cbiAgICAgIGlmIChzZWxmLm9wdGlvbnMucmVsYXRpdmVUb1dyYXBwZXIpIHtcbiAgICAgICAgdmFyIHNjcm9sbFBvc1kgPSB3aW5kb3cucGFnZVlPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCB8fCBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcDtcbiAgICAgICAgd3JhcHBlclBvc1kgPSBzY3JvbGxQb3NZIC0gc2VsZi5vcHRpb25zLndyYXBwZXIub2Zmc2V0VG9wO1xuICAgICAgfVxuXG4gICAgICB2YXIgcG9zWSA9IHNlbGYub3B0aW9ucy52ZXJ0aWNhbCA/IGRhdGFQZXJjZW50YWdlIHx8IHNlbGYub3B0aW9ucy5jZW50ZXIgPyB3cmFwcGVyUG9zWSA6IDAgOiAwO1xuICAgICAgdmFyIHBvc1ggPSBzZWxmLm9wdGlvbnMuaG9yaXpvbnRhbCA/IGRhdGFQZXJjZW50YWdlIHx8IHNlbGYub3B0aW9ucy5jZW50ZXIgPyBzZWxmLm9wdGlvbnMud3JhcHBlciA/IHNlbGYub3B0aW9ucy53cmFwcGVyLnNjcm9sbExlZnQgOiB3aW5kb3cucGFnZVhPZmZzZXQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQgfHwgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0IDogMCA6IDA7XG4gICAgICB2YXIgYmxvY2tUb3AgPSBwb3NZICsgZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xuICAgICAgdmFyIGJsb2NrSGVpZ2h0ID0gZWwuY2xpZW50SGVpZ2h0IHx8IGVsLm9mZnNldEhlaWdodCB8fCBlbC5zY3JvbGxIZWlnaHQ7XG4gICAgICB2YXIgYmxvY2tMZWZ0ID0gcG9zWCArIGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnQ7XG4gICAgICB2YXIgYmxvY2tXaWR0aCA9IGVsLmNsaWVudFdpZHRoIHx8IGVsLm9mZnNldFdpZHRoIHx8IGVsLnNjcm9sbFdpZHRoOyAvLyBhcHBhcmVudGx5IHBhcmFsbGF4IGVxdWF0aW9uIGV2ZXJ5b25lIHVzZXNcblxuICAgICAgdmFyIHBlcmNlbnRhZ2VZID0gZGF0YVBlcmNlbnRhZ2UgPyBkYXRhUGVyY2VudGFnZSA6IChwb3NZIC0gYmxvY2tUb3AgKyBzY3JlZW5ZKSAvIChibG9ja0hlaWdodCArIHNjcmVlblkpO1xuICAgICAgdmFyIHBlcmNlbnRhZ2VYID0gZGF0YVBlcmNlbnRhZ2UgPyBkYXRhUGVyY2VudGFnZSA6IChwb3NYIC0gYmxvY2tMZWZ0ICsgc2NyZWVuWCkgLyAoYmxvY2tXaWR0aCArIHNjcmVlblgpO1xuXG4gICAgICBpZiAoc2VsZi5vcHRpb25zLmNlbnRlcikge1xuICAgICAgICBwZXJjZW50YWdlWCA9IDAuNTtcbiAgICAgICAgcGVyY2VudGFnZVkgPSAwLjU7XG4gICAgICB9IC8vIE9wdGlvbmFsIGluZGl2aWR1YWwgYmxvY2sgc3BlZWQgYXMgZGF0YSBhdHRyLCBvdGhlcndpc2UgZ2xvYmFsIHNwZWVkXG5cblxuICAgICAgdmFyIHNwZWVkID0gYnJlYWtwb2ludHMgJiYgbWFwQnJlYWtwb2ludHNbY3VycmVudEJyZWFrcG9pbnRdICE9PSBudWxsID8gTnVtYmVyKG1hcEJyZWFrcG9pbnRzW2N1cnJlbnRCcmVha3BvaW50XSkgOiBkYXRhU3BlZWQgPyBkYXRhU3BlZWQgOiBzZWxmLm9wdGlvbnMuc3BlZWQ7XG4gICAgICB2YXIgdmVydGljYWxTcGVlZCA9IGRhdGFWZXJ0aWNhbFNwZWVkID8gZGF0YVZlcnRpY2FsU3BlZWQgOiBzZWxmLm9wdGlvbnMudmVydGljYWxTcGVlZDtcbiAgICAgIHZhciBob3Jpem9udGFsU3BlZWQgPSBkYXRhSG9yaXpvbnRhbFNwZWVkID8gZGF0YUhvcml6b250YWxTcGVlZCA6IHNlbGYub3B0aW9ucy5ob3Jpem9udGFsU3BlZWQ7IC8vIE9wdGlvbmFsIGluZGl2aWR1YWwgYmxvY2sgbW92ZW1lbnQgYXhpcyBkaXJlY3Rpb24gYXMgZGF0YSBhdHRyLCBvdGhlcndpc2UgZ29iYWwgbW92ZW1lbnQgZGlyZWN0aW9uXG5cbiAgICAgIHZhciB2ZXJ0aWNhbFNjcm9sbEF4aXMgPSBkYXRhVmVyaWNhbFNjcm9sbEF4aXMgPyBkYXRhVmVyaWNhbFNjcm9sbEF4aXMgOiBzZWxmLm9wdGlvbnMudmVydGljYWxTY3JvbGxBeGlzO1xuICAgICAgdmFyIGhvcml6b250YWxTY3JvbGxBeGlzID0gZGF0YUhvcml6b250YWxTY3JvbGxBeGlzID8gZGF0YUhvcml6b250YWxTY3JvbGxBeGlzIDogc2VsZi5vcHRpb25zLmhvcml6b250YWxTY3JvbGxBeGlzO1xuICAgICAgdmFyIGJhc2VzID0gdXBkYXRlUG9zaXRpb24ocGVyY2VudGFnZVgsIHBlcmNlbnRhZ2VZLCBzcGVlZCwgdmVydGljYWxTcGVlZCwgaG9yaXpvbnRhbFNwZWVkKTsgLy8gfn5TdG9yZSBub24tdHJhbnNsYXRlM2QgdHJhbnNmb3Jtc35+XG4gICAgICAvLyBTdG9yZSBpbmxpbmUgc3R5bGVzIGFuZCBleHRyYWN0IHRyYW5zZm9ybXNcblxuICAgICAgdmFyIHN0eWxlID0gZWwuc3R5bGUuY3NzVGV4dDtcbiAgICAgIHZhciB0cmFuc2Zvcm0gPSAnJzsgLy8gQ2hlY2sgaWYgdGhlcmUncyBhbiBpbmxpbmUgc3R5bGVkIHRyYW5zZm9ybVxuXG4gICAgICB2YXIgc2VhcmNoUmVzdWx0ID0gL3RyYW5zZm9ybVxccyo6L2kuZXhlYyhzdHlsZSk7XG5cbiAgICAgIGlmIChzZWFyY2hSZXN1bHQpIHtcbiAgICAgICAgLy8gR2V0IHRoZSBpbmRleCBvZiB0aGUgdHJhbnNmb3JtXG4gICAgICAgIHZhciBpbmRleCA9IHNlYXJjaFJlc3VsdC5pbmRleDsgLy8gVHJpbSB0aGUgc3R5bGUgdG8gdGhlIHRyYW5zZm9ybSBwb2ludCBhbmQgZ2V0IHRoZSBmb2xsb3dpbmcgc2VtaS1jb2xvbiBpbmRleFxuXG4gICAgICAgIHZhciB0cmltbWVkU3R5bGUgPSBzdHlsZS5zbGljZShpbmRleCk7XG4gICAgICAgIHZhciBkZWxpbWl0ZXIgPSB0cmltbWVkU3R5bGUuaW5kZXhPZignOycpOyAvLyBSZW1vdmUgXCJ0cmFuc2Zvcm1cIiBzdHJpbmcgYW5kIHNhdmUgdGhlIGF0dHJpYnV0ZVxuXG4gICAgICAgIGlmIChkZWxpbWl0ZXIpIHtcbiAgICAgICAgICB0cmFuc2Zvcm0gPSBcIiBcIiArIHRyaW1tZWRTdHlsZS5zbGljZSgxMSwgZGVsaW1pdGVyKS5yZXBsYWNlKC9cXHMvZywgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRyYW5zZm9ybSA9IFwiIFwiICsgdHJpbW1lZFN0eWxlLnNsaWNlKDExKS5yZXBsYWNlKC9cXHMvZywgJycpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGJhc2VYOiBiYXNlcy54LFxuICAgICAgICBiYXNlWTogYmFzZXMueSxcbiAgICAgICAgdG9wOiBibG9ja1RvcCxcbiAgICAgICAgbGVmdDogYmxvY2tMZWZ0LFxuICAgICAgICBoZWlnaHQ6IGJsb2NrSGVpZ2h0LFxuICAgICAgICB3aWR0aDogYmxvY2tXaWR0aCxcbiAgICAgICAgc3BlZWQ6IHNwZWVkLFxuICAgICAgICB2ZXJ0aWNhbFNwZWVkOiB2ZXJ0aWNhbFNwZWVkLFxuICAgICAgICBob3Jpem9udGFsU3BlZWQ6IGhvcml6b250YWxTcGVlZCxcbiAgICAgICAgdmVydGljYWxTY3JvbGxBeGlzOiB2ZXJ0aWNhbFNjcm9sbEF4aXMsXG4gICAgICAgIGhvcml6b250YWxTY3JvbGxBeGlzOiBob3Jpem9udGFsU2Nyb2xsQXhpcyxcbiAgICAgICAgc3R5bGU6IHN0eWxlLFxuICAgICAgICB0cmFuc2Zvcm06IHRyYW5zZm9ybSxcbiAgICAgICAgemluZGV4OiBkYXRhWmluZGV4LFxuICAgICAgICBtaW46IGRhdGFNaW4sXG4gICAgICAgIG1heDogZGF0YU1heCxcbiAgICAgICAgbWluWDogZGF0YU1pblgsXG4gICAgICAgIG1heFg6IGRhdGFNYXhYLFxuICAgICAgICBtaW5ZOiBkYXRhTWluWSxcbiAgICAgICAgbWF4WTogZGF0YU1heFlcbiAgICAgIH07XG4gICAgfTsgLy8gc2V0IHNjcm9sbCBwb3NpdGlvbiAocG9zWSwgcG9zWClcbiAgICAvLyBzaWRlIGVmZmVjdCBtZXRob2QgaXMgbm90IGlkZWFsLCBidXQgb2theSBmb3Igbm93XG4gICAgLy8gcmV0dXJucyB0cnVlIGlmIHRoZSBzY3JvbGwgY2hhbmdlZCwgZmFsc2UgaWYgbm90aGluZyBoYXBwZW5lZFxuXG5cbiAgICB2YXIgc2V0UG9zaXRpb24gPSBmdW5jdGlvbiBzZXRQb3NpdGlvbigpIHtcbiAgICAgIHZhciBvbGRZID0gcG9zWTtcbiAgICAgIHZhciBvbGRYID0gcG9zWDtcbiAgICAgIHBvc1kgPSBzZWxmLm9wdGlvbnMud3JhcHBlciA/IHNlbGYub3B0aW9ucy53cmFwcGVyLnNjcm9sbFRvcCA6IChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgfHwgZG9jdW1lbnQuYm9keS5wYXJlbnROb2RlIHx8IGRvY3VtZW50LmJvZHkpLnNjcm9sbFRvcCB8fCB3aW5kb3cucGFnZVlPZmZzZXQ7XG4gICAgICBwb3NYID0gc2VsZi5vcHRpb25zLndyYXBwZXIgPyBzZWxmLm9wdGlvbnMud3JhcHBlci5zY3JvbGxMZWZ0IDogKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCB8fCBkb2N1bWVudC5ib2R5LnBhcmVudE5vZGUgfHwgZG9jdW1lbnQuYm9keSkuc2Nyb2xsTGVmdCB8fCB3aW5kb3cucGFnZVhPZmZzZXQ7IC8vIElmIG9wdGlvbiByZWxhdGl2ZVRvV3JhcHBlciBpcyB0cnVlLCB1c2UgcmVsYXRpdmUgd3JhcHBlciB2YWx1ZSBpbnN0ZWFkLlxuXG4gICAgICBpZiAoc2VsZi5vcHRpb25zLnJlbGF0aXZlVG9XcmFwcGVyKSB7XG4gICAgICAgIHZhciBzY3JvbGxQb3NZID0gKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCB8fCBkb2N1bWVudC5ib2R5LnBhcmVudE5vZGUgfHwgZG9jdW1lbnQuYm9keSkuc2Nyb2xsVG9wIHx8IHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgICAgICAgcG9zWSA9IHNjcm9sbFBvc1kgLSBzZWxmLm9wdGlvbnMud3JhcHBlci5vZmZzZXRUb3A7XG4gICAgICB9XG5cbiAgICAgIGlmIChvbGRZICE9IHBvc1kgJiYgc2VsZi5vcHRpb25zLnZlcnRpY2FsKSB7XG4gICAgICAgIC8vIHNjcm9sbCBjaGFuZ2VkLCByZXR1cm4gdHJ1ZVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9sZFggIT0gcG9zWCAmJiBzZWxmLm9wdGlvbnMuaG9yaXpvbnRhbCkge1xuICAgICAgICAvLyBzY3JvbGwgY2hhbmdlZCwgcmV0dXJuIHRydWVcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IC8vIHNjcm9sbCBkaWQgbm90IGNoYW5nZVxuXG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9OyAvLyBBaGggYSBwdXJlIGZ1bmN0aW9uLCBnZXRzIG5ldyB0cmFuc2Zvcm0gdmFsdWVcbiAgICAvLyBiYXNlZCBvbiBzY3JvbGxQb3NpdGlvbiBhbmQgc3BlZWRcbiAgICAvLyBBbGxvdyBmb3IgZGVjaW1hbCBwaXhlbCB2YWx1ZXNcblxuXG4gICAgdmFyIHVwZGF0ZVBvc2l0aW9uID0gZnVuY3Rpb24gdXBkYXRlUG9zaXRpb24ocGVyY2VudGFnZVgsIHBlcmNlbnRhZ2VZLCBzcGVlZCwgdmVydGljYWxTcGVlZCwgaG9yaXpvbnRhbFNwZWVkKSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICB2YXIgdmFsdWVYID0gKGhvcml6b250YWxTcGVlZCA/IGhvcml6b250YWxTcGVlZCA6IHNwZWVkKSAqICgxMDAgKiAoMSAtIHBlcmNlbnRhZ2VYKSk7XG4gICAgICB2YXIgdmFsdWVZID0gKHZlcnRpY2FsU3BlZWQgPyB2ZXJ0aWNhbFNwZWVkIDogc3BlZWQpICogKDEwMCAqICgxIC0gcGVyY2VudGFnZVkpKTtcbiAgICAgIHJlc3VsdC54ID0gc2VsZi5vcHRpb25zLnJvdW5kID8gTWF0aC5yb3VuZCh2YWx1ZVgpIDogTWF0aC5yb3VuZCh2YWx1ZVggKiAxMDApIC8gMTAwO1xuICAgICAgcmVzdWx0LnkgPSBzZWxmLm9wdGlvbnMucm91bmQgPyBNYXRoLnJvdW5kKHZhbHVlWSkgOiBNYXRoLnJvdW5kKHZhbHVlWSAqIDEwMCkgLyAxMDA7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07IC8vIFJlbW92ZSBldmVudCBsaXN0ZW5lcnMgYW5kIGxvb3AgYWdhaW5cblxuXG4gICAgdmFyIGRlZmVycmVkVXBkYXRlID0gZnVuY3Rpb24gZGVmZXJyZWRVcGRhdGUoKSB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgZGVmZXJyZWRVcGRhdGUpO1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ29yaWVudGF0aW9uY2hhbmdlJywgZGVmZXJyZWRVcGRhdGUpO1xuICAgICAgKHNlbGYub3B0aW9ucy53cmFwcGVyID8gc2VsZi5vcHRpb25zLndyYXBwZXIgOiB3aW5kb3cpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIGRlZmVycmVkVXBkYXRlKTtcbiAgICAgIChzZWxmLm9wdGlvbnMud3JhcHBlciA/IHNlbGYub3B0aW9ucy53cmFwcGVyIDogZG9jdW1lbnQpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIGRlZmVycmVkVXBkYXRlKTsgLy8gbG9vcCBhZ2FpblxuXG4gICAgICBsb29wSWQgPSBsb29wKHVwZGF0ZSk7XG4gICAgfTsgLy8gTG9vcFxuXG5cbiAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgICAgaWYgKHNldFBvc2l0aW9uKCkgJiYgcGF1c2UgPT09IGZhbHNlKSB7XG4gICAgICAgIGFuaW1hdGUoKTsgLy8gbG9vcCBhZ2FpblxuXG4gICAgICAgIGxvb3BJZCA9IGxvb3AodXBkYXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvb3BJZCA9IG51bGw7IC8vIERvbid0IGFuaW1hdGUgdW50aWwgd2UgZ2V0IGEgcG9zaXRpb24gdXBkYXRpbmcgZXZlbnRcblxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgZGVmZXJyZWRVcGRhdGUpO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb3JpZW50YXRpb25jaGFuZ2UnLCBkZWZlcnJlZFVwZGF0ZSk7XG4gICAgICAgIChzZWxmLm9wdGlvbnMud3JhcHBlciA/IHNlbGYub3B0aW9ucy53cmFwcGVyIDogd2luZG93KS5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCBkZWZlcnJlZFVwZGF0ZSwgc3VwcG9ydHNQYXNzaXZlID8ge1xuICAgICAgICAgIHBhc3NpdmU6IHRydWVcbiAgICAgICAgfSA6IGZhbHNlKTtcbiAgICAgICAgKHNlbGYub3B0aW9ucy53cmFwcGVyID8gc2VsZi5vcHRpb25zLndyYXBwZXIgOiBkb2N1bWVudCkuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZGVmZXJyZWRVcGRhdGUsIHN1cHBvcnRzUGFzc2l2ZSA/IHtcbiAgICAgICAgICBwYXNzaXZlOiB0cnVlXG4gICAgICAgIH0gOiBmYWxzZSk7XG4gICAgICB9XG4gICAgfTsgLy8gVHJhbnNmb3JtM2Qgb24gcGFyYWxsYXggZWxlbWVudFxuXG5cbiAgICB2YXIgYW5pbWF0ZSA9IGZ1bmN0aW9uIGFuaW1hdGUoKSB7XG4gICAgICB2YXIgcG9zaXRpb25zO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuZWxlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gRGV0ZXJtaW5lIHJlbGV2YW50IG1vdmVtZW50IGRpcmVjdGlvbnNcbiAgICAgICAgdmFyIHZlcnRpY2FsU2Nyb2xsQXhpcyA9IGJsb2Nrc1tpXS52ZXJ0aWNhbFNjcm9sbEF4aXMudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgdmFyIGhvcml6b250YWxTY3JvbGxBeGlzID0gYmxvY2tzW2ldLmhvcml6b250YWxTY3JvbGxBeGlzLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHZhciB2ZXJ0aWNhbFNjcm9sbFggPSB2ZXJ0aWNhbFNjcm9sbEF4aXMuaW5kZXhPZihcInhcIikgIT0gLTEgPyBwb3NZIDogMDtcbiAgICAgICAgdmFyIHZlcnRpY2FsU2Nyb2xsWSA9IHZlcnRpY2FsU2Nyb2xsQXhpcy5pbmRleE9mKFwieVwiKSAhPSAtMSA/IHBvc1kgOiAwO1xuICAgICAgICB2YXIgaG9yaXpvbnRhbFNjcm9sbFggPSBob3Jpem9udGFsU2Nyb2xsQXhpcy5pbmRleE9mKFwieFwiKSAhPSAtMSA/IHBvc1ggOiAwO1xuICAgICAgICB2YXIgaG9yaXpvbnRhbFNjcm9sbFkgPSBob3Jpem9udGFsU2Nyb2xsQXhpcy5pbmRleE9mKFwieVwiKSAhPSAtMSA/IHBvc1ggOiAwO1xuICAgICAgICB2YXIgcGVyY2VudGFnZVkgPSAodmVydGljYWxTY3JvbGxZICsgaG9yaXpvbnRhbFNjcm9sbFkgLSBibG9ja3NbaV0udG9wICsgc2NyZWVuWSkgLyAoYmxvY2tzW2ldLmhlaWdodCArIHNjcmVlblkpO1xuICAgICAgICB2YXIgcGVyY2VudGFnZVggPSAodmVydGljYWxTY3JvbGxYICsgaG9yaXpvbnRhbFNjcm9sbFggLSBibG9ja3NbaV0ubGVmdCArIHNjcmVlblgpIC8gKGJsb2Nrc1tpXS53aWR0aCArIHNjcmVlblgpOyAvLyBTdWJ0cmFjdGluZyBpbml0aWFsaXplIHZhbHVlLCBzbyBlbGVtZW50IHN0YXlzIGluIHNhbWUgc3BvdCBhcyBIVE1MXG5cbiAgICAgICAgcG9zaXRpb25zID0gdXBkYXRlUG9zaXRpb24ocGVyY2VudGFnZVgsIHBlcmNlbnRhZ2VZLCBibG9ja3NbaV0uc3BlZWQsIGJsb2Nrc1tpXS52ZXJ0aWNhbFNwZWVkLCBibG9ja3NbaV0uaG9yaXpvbnRhbFNwZWVkKTtcbiAgICAgICAgdmFyIHBvc2l0aW9uWSA9IHBvc2l0aW9ucy55IC0gYmxvY2tzW2ldLmJhc2VZO1xuICAgICAgICB2YXIgcG9zaXRpb25YID0gcG9zaXRpb25zLnggLSBibG9ja3NbaV0uYmFzZVg7IC8vIFRoZSBuZXh0IHR3byBcImlmXCIgYmxvY2tzIGdvIGxpa2UgdGhpczpcbiAgICAgICAgLy8gQ2hlY2sgaWYgYSBsaW1pdCBpcyBkZWZpbmVkIChmaXJzdCBcIm1pblwiLCB0aGVuIFwibWF4XCIpO1xuICAgICAgICAvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIGNoYW5nZSB0aGUgWSBvciB0aGUgWFxuICAgICAgICAvLyAoQ3VycmVudGx5IHdvcmtpbmcgb25seSBpZiBqdXN0IG9uZSBvZiB0aGUgYXhlcyBpcyBlbmFibGVkKVxuICAgICAgICAvLyBUaGVuLCBjaGVjayBpZiB0aGUgbmV3IHBvc2l0aW9uIGlzIGluc2lkZSB0aGUgYWxsb3dlZCBsaW1pdFxuICAgICAgICAvLyBJZiBzbywgdXNlIG5ldyBwb3NpdGlvbi4gSWYgbm90LCBzZXQgcG9zaXRpb24gdG8gbGltaXQuXG4gICAgICAgIC8vIENoZWNrIGlmIGEgbWluIGxpbWl0IGlzIGRlZmluZWRcblxuICAgICAgICBpZiAoYmxvY2tzW2ldLm1pbiAhPT0gbnVsbCkge1xuICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnMudmVydGljYWwgJiYgIXNlbGYub3B0aW9ucy5ob3Jpem9udGFsKSB7XG4gICAgICAgICAgICBwb3NpdGlvblkgPSBwb3NpdGlvblkgPD0gYmxvY2tzW2ldLm1pbiA/IGJsb2Nrc1tpXS5taW4gOiBwb3NpdGlvblk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHNlbGYub3B0aW9ucy5ob3Jpem9udGFsICYmICFzZWxmLm9wdGlvbnMudmVydGljYWwpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uWCA9IHBvc2l0aW9uWCA8PSBibG9ja3NbaV0ubWluID8gYmxvY2tzW2ldLm1pbiA6IHBvc2l0aW9uWDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gLy8gQ2hlY2sgaWYgZGlyZWN0aW9uYWwgbWluIGxpbWl0cyBhcmUgZGVmaW5lZFxuXG5cbiAgICAgICAgaWYgKGJsb2Nrc1tpXS5taW5ZICE9IG51bGwpIHtcbiAgICAgICAgICBwb3NpdGlvblkgPSBwb3NpdGlvblkgPD0gYmxvY2tzW2ldLm1pblkgPyBibG9ja3NbaV0ubWluWSA6IHBvc2l0aW9uWTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChibG9ja3NbaV0ubWluWCAhPSBudWxsKSB7XG4gICAgICAgICAgcG9zaXRpb25YID0gcG9zaXRpb25YIDw9IGJsb2Nrc1tpXS5taW5YID8gYmxvY2tzW2ldLm1pblggOiBwb3NpdGlvblg7XG4gICAgICAgIH0gLy8gQ2hlY2sgaWYgYSBtYXggbGltaXQgaXMgZGVmaW5lZFxuXG5cbiAgICAgICAgaWYgKGJsb2Nrc1tpXS5tYXggIT09IG51bGwpIHtcbiAgICAgICAgICBpZiAoc2VsZi5vcHRpb25zLnZlcnRpY2FsICYmICFzZWxmLm9wdGlvbnMuaG9yaXpvbnRhbCkge1xuICAgICAgICAgICAgcG9zaXRpb25ZID0gcG9zaXRpb25ZID49IGJsb2Nrc1tpXS5tYXggPyBibG9ja3NbaV0ubWF4IDogcG9zaXRpb25ZO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnMuaG9yaXpvbnRhbCAmJiAhc2VsZi5vcHRpb25zLnZlcnRpY2FsKSB7XG4gICAgICAgICAgICBwb3NpdGlvblggPSBwb3NpdGlvblggPj0gYmxvY2tzW2ldLm1heCA/IGJsb2Nrc1tpXS5tYXggOiBwb3NpdGlvblg7XG4gICAgICAgICAgfVxuICAgICAgICB9IC8vIENoZWNrIGlmIGRpcmVjdGlvbmFsIG1heCBsaW1pdHMgYXJlIGRlZmluZWRcblxuXG4gICAgICAgIGlmIChibG9ja3NbaV0ubWF4WSAhPSBudWxsKSB7XG4gICAgICAgICAgcG9zaXRpb25ZID0gcG9zaXRpb25ZID49IGJsb2Nrc1tpXS5tYXhZID8gYmxvY2tzW2ldLm1heFkgOiBwb3NpdGlvblk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYmxvY2tzW2ldLm1heFggIT0gbnVsbCkge1xuICAgICAgICAgIHBvc2l0aW9uWCA9IHBvc2l0aW9uWCA+PSBibG9ja3NbaV0ubWF4WCA/IGJsb2Nrc1tpXS5tYXhYIDogcG9zaXRpb25YO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHppbmRleCA9IGJsb2Nrc1tpXS56aW5kZXg7IC8vIE1vdmUgdGhhdCBlbGVtZW50XG4gICAgICAgIC8vIChTZXQgdGhlIG5ldyB0cmFuc2xhdGlvbiBhbmQgYXBwZW5kIGluaXRpYWwgaW5saW5lIHRyYW5zZm9ybXMuKVxuXG4gICAgICAgIHZhciB0cmFuc2xhdGUgPSAndHJhbnNsYXRlM2QoJyArIChzZWxmLm9wdGlvbnMuaG9yaXpvbnRhbCA/IHBvc2l0aW9uWCA6ICcwJykgKyAncHgsJyArIChzZWxmLm9wdGlvbnMudmVydGljYWwgPyBwb3NpdGlvblkgOiAnMCcpICsgJ3B4LCcgKyB6aW5kZXggKyAncHgpICcgKyBibG9ja3NbaV0udHJhbnNmb3JtO1xuICAgICAgICBzZWxmLmVsZW1zW2ldLnN0eWxlW3RyYW5zZm9ybVByb3BdID0gdHJhbnNsYXRlO1xuICAgICAgfVxuXG4gICAgICBzZWxmLm9wdGlvbnMuY2FsbGJhY2socG9zaXRpb25zKTtcbiAgICB9O1xuXG4gICAgc2VsZi5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLmVsZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHNlbGYuZWxlbXNbaV0uc3R5bGUuY3NzVGV4dCA9IGJsb2Nrc1tpXS5zdHlsZTtcbiAgICAgIH0gLy8gUmVtb3ZlIHJlc2l6ZSBldmVudCBsaXN0ZW5lciBpZiBub3QgcGF1c2UsIGFuZCBwYXVzZVxuXG5cbiAgICAgIGlmICghcGF1c2UpIHtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGluaXQpO1xuICAgICAgICBwYXVzZSA9IHRydWU7XG4gICAgICB9IC8vIENsZWFyIHRoZSBhbmltYXRpb24gbG9vcCB0byBwcmV2ZW50IHBvc3NpYmxlIG1lbW9yeSBsZWFrXG5cblxuICAgICAgY2xlYXJMb29wKGxvb3BJZCk7XG4gICAgICBsb29wSWQgPSBudWxsO1xuICAgIH07IC8vIEluaXRcblxuXG4gICAgaW5pdCgpOyAvLyBBbGxvdyB0byByZWNhbGN1bGF0ZSB0aGUgaW5pdGlhbCB2YWx1ZXMgd2hlbmV2ZXIgd2Ugd2FudFxuXG4gICAgc2VsZi5yZWZyZXNoID0gaW5pdDtcbiAgICByZXR1cm4gc2VsZjtcbiAgfTtcblxuICByZXR1cm4gUmVsbGF4O1xufSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qXG5cbiBNeUZvbnRzIFdlYmZvbnQgQnVpbGQgSUQgMzg0NDQzMCwgMjAxOS0xMi0wNVQxMDoxMjo0MC0wNTAwXG5cbiBUaGUgZm9udHMgbGlzdGVkIGluIHRoaXMgbm90aWNlIGFyZSBzdWJqZWN0IHRvIHRoZSBFbmQgVXNlciBMaWNlbnNlXG4gQWdyZWVtZW50KHMpIGVudGVyZWQgaW50byBieSB0aGUgd2Vic2l0ZSBvd25lci4gQWxsIG90aGVyIHBhcnRpZXMgYXJlXG4gZXhwbGljaXRseSByZXN0cmljdGVkIGZyb20gdXNpbmcgdGhlIExpY2Vuc2VkIFdlYmZvbnRzKHMpLlxuXG4gWW91IG1heSBvYnRhaW4gYSB2YWxpZCBsaWNlbnNlIGF0IHRoZSBVUkxzIGJlbG93LlxuXG4gV2ViZm9udDogR2lscm95LVNlbWlCb2xkSXRhbGljIGJ5IFJhZG9taXIgVGlua292XG4gVVJMOiBodHRwczovL3d3dy5teWZvbnRzLmNvbS9mb250cy9yYWRvbWlyLXRpbmtvdi9naWxyb3kvc2VtaS1ib2xkLWl0YWxpYy9cbiBDb3B5cmlnaHQ6IENvcHlyaWdodCAmI3gwMEE5OyAyMDE1IGJ5IFJhZG9taXIgVGlua292LiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuXG4gV2ViZm9udDogR2lscm95LVNlbWlCb2xkIGJ5IFJhZG9taXIgVGlua292XG4gVVJMOiBodHRwczovL3d3dy5teWZvbnRzLmNvbS9mb250cy9yYWRvbWlyLXRpbmtvdi9naWxyb3kvc2VtaS1ib2xkL1xuIENvcHlyaWdodDogQ29weXJpZ2h0ICYjeDAwQTk7IDIwMTYgYnkgUmFkb21pciBUaW5rb3YuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG5cbiBXZWJmb250OiBHaWxyb3ktQm9sZEl0YWxpYyBieSBSYWRvbWlyIFRpbmtvdlxuIFVSTDogaHR0cHM6Ly93d3cubXlmb250cy5jb20vZm9udHMvcmFkb21pci10aW5rb3YvZ2lscm95L2JvbGQtaXRhbGljL1xuIENvcHlyaWdodDogQ29weXJpZ2h0ICYjeDAwQTk7IDIwMTUgYnkgUmFkb21pciBUaW5rb3YuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG5cbiBXZWJmb250OiBHaWxyb3ktQm9sZCBieSBSYWRvbWlyIFRpbmtvdlxuIFVSTDogaHR0cHM6Ly93d3cubXlmb250cy5jb20vZm9udHMvcmFkb21pci10aW5rb3YvZ2lscm95L2JvbGQvXG4gQ29weXJpZ2h0OiBDb3B5cmlnaHQgJiN4MDBBOTsgMjAxNiBieSBSYWRvbWlyIFRpbmtvdi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cblxuXG4gTGljZW5zZWQgcGFnZXZpZXdzOiAyMCwwMDBcblxuID8gMjAxOSBNeUZvbnRzIEluY1xuKi9cbnZhciBwcm90b2NvbCA9IGRvY3VtZW50LmxvY2F0aW9uLnByb3RvY29sO1xuXCJodHRwczpcIiAhPSBwcm90b2NvbCAmJiAocHJvdG9jb2wgPSBcImh0dHA6XCIpO1xudmFyIGNvdW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcbmNvdW50LnR5cGUgPSBcInRleHQvamF2YXNjcmlwdFwiO1xuY291bnQuYXN5bmMgPSAhMDtcbmNvdW50LnNyYyA9IHByb3RvY29sICsgXCIvL2hlbGxvLm15Zm9udHMubmV0L2NvdW50LzNhYTk0ZVwiO1xudmFyIHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInNjcmlwdFwiKVswXTtcbnMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoY291bnQsIHMpO1xudmFyIGJyb3dzZXJOYW1lLCBicm93c2VyVmVyc2lvbiwgd2ViZm9udFR5cGU7XG5pZiAoXCJ1bmRlZmluZWRcIiA9PSB0eXBlb2Ygd29mZkVuYWJsZWQpIHZhciB3b2ZmRW5hYmxlZCA9ICEwO1xudmFyIHN2Z0VuYWJsZWQgPSAxLFxuICAgIHdvZmYyRW5hYmxlZCA9IDE7XG5pZiAoXCJ1bmRlZmluZWRcIiAhPSB0eXBlb2YgY3VzdG9tUGF0aCkgdmFyIHBhdGggPSBjdXN0b21QYXRoO2Vsc2Uge1xuICB2YXIgc2NyaXB0cyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiU0NSSVBUXCIpLFxuICAgICAgc2NyaXB0ID0gc2NyaXB0c1tzY3JpcHRzLmxlbmd0aCAtIDFdLnNyYztcbiAgc2NyaXB0Lm1hdGNoKFwiOi8vXCIpIHx8IFwiL1wiID09IHNjcmlwdC5jaGFyQXQoMCkgfHwgKHNjcmlwdCA9IFwiLi9cIiArIHNjcmlwdCk7XG4gIHBhdGggPSBzY3JpcHQucmVwbGFjZSgvXFxcXC9nLCBcIi9cIikucmVwbGFjZSgvXFwvW15cXC9dKlxcLz8kLywgXCJcIik7XG59XG52YXIgd2ZwYXRoID0gcGF0aCArIFwiL2ZvbnRzL1wiLFxuICAgIGJyb3dzZXJzID0gW3tcbiAgcmVnZXg6IFwiTVNJRSAoXFxcXGQrXFxcXC5cXFxcZCspXCIsXG4gIHZlcnNpb25SZWdleDogXCJuZXcgTnVtYmVyKFJlZ0V4cC4kMSlcIixcbiAgdHlwZTogW3tcbiAgICB2ZXJzaW9uOiA5LFxuICAgIHR5cGU6IFwid29mZlwiXG4gIH0sIHtcbiAgICB2ZXJzaW9uOiA1LFxuICAgIHR5cGU6IFwiZW90XCJcbiAgfV1cbn0sIHtcbiAgcmVnZXg6IFwiVHJpZGVudC8oXFxcXGQrXFxcXC5cXFxcZCspOyAoLispP3J2OihcXFxcZCtcXFxcLlxcXFxkKylcIixcbiAgdmVyc2lvblJlZ2V4OiBcIm5ldyBOdW1iZXIoUmVnRXhwLiQzKVwiLFxuICB0eXBlOiBbe1xuICAgIHZlcnNpb246IDExLFxuICAgIHR5cGU6IFwid29mZlwiXG4gIH1dXG59LCB7XG4gIHJlZ2V4OiBcIkZpcmVmb3hbL3NdKFxcXFxkK1xcXFwuXFxcXGQrKVwiLFxuICB2ZXJzaW9uUmVnZXg6IFwibmV3IE51bWJlcihSZWdFeHAuJDEpXCIsXG4gIHR5cGU6IFt7XG4gICAgdmVyc2lvbjogMy42LFxuICAgIHR5cGU6IFwid29mZlwiXG4gIH0sIHtcbiAgICB2ZXJzaW9uOiAzLjUsXG4gICAgdHlwZTogXCJ0dGZcIlxuICB9XVxufSwge1xuICByZWdleDogXCJFZGdlLyhcXFxcZCtcXFxcLlxcXFxkKylcIixcbiAgdmVyc2lvblJlZ2V4OiBcIm5ldyBOdW1iZXIoUmVnRXhwLiQxKVwiLFxuICB0eXBlOiBbe1xuICAgIHZlcnNpb246IDEyLFxuICAgIHR5cGU6IFwid29mZlwiXG4gIH1dXG59LCB7XG4gIHJlZ2V4OiBcIkNocm9tZS8oXFxcXGQrXFxcXC5cXFxcZCspXCIsXG4gIHZlcnNpb25SZWdleDogXCJuZXcgTnVtYmVyKFJlZ0V4cC4kMSlcIixcbiAgdHlwZTogW3tcbiAgICB2ZXJzaW9uOiAzNixcbiAgICB0eXBlOiBcIndvZmYyXCJcbiAgfSwge1xuICAgIHZlcnNpb246IDYsXG4gICAgdHlwZTogXCJ3b2ZmXCJcbiAgfSwge1xuICAgIHZlcnNpb246IDQsXG4gICAgdHlwZTogXCJ0dGZcIlxuICB9XVxufSwge1xuICByZWdleDogXCJNb3ppbGxhLipBbmRyb2lkIChcXFxcZCtcXFxcLlxcXFxkKykuKkFwcGxlV2ViS2l0LipTYWZhcmlcIixcbiAgdmVyc2lvblJlZ2V4OiBcIm5ldyBOdW1iZXIoUmVnRXhwLiQxKVwiLFxuICB0eXBlOiBbe1xuICAgIHZlcnNpb246IDQuMSxcbiAgICB0eXBlOiBcIndvZmZcIlxuICB9LCB7XG4gICAgdmVyc2lvbjogMy4xLFxuICAgIHR5cGU6IFwic3ZnI3dmXCJcbiAgfSwge1xuICAgIHZlcnNpb246IDIuMixcbiAgICB0eXBlOiBcInR0ZlwiXG4gIH1dXG59LCB7XG4gIHJlZ2V4OiBcIk1vemlsbGEuKihpUGhvbmV8aVBhZCkuKiBPUyAoXFxcXGQrKV8oXFxcXGQrKS4qIEFwcGxlV2ViS2l0LipTYWZhcmlcIixcbiAgdmVyc2lvblJlZ2V4OiBcIm5ldyBOdW1iZXIoUmVnRXhwLiQyKSArIChuZXcgTnVtYmVyKFJlZ0V4cC4kMykgLyAxMClcIixcbiAgdW5oaW50ZWQ6ICEwLFxuICB0eXBlOiBbe1xuICAgIHZlcnNpb246IDUsXG4gICAgdHlwZTogXCJ3b2ZmXCJcbiAgfSwge1xuICAgIHZlcnNpb246IDQuMixcbiAgICB0eXBlOiBcInR0ZlwiXG4gIH0sIHtcbiAgICB2ZXJzaW9uOiAxLFxuICAgIHR5cGU6IFwic3ZnI3dmXCJcbiAgfV1cbn0sIHtcbiAgcmVnZXg6IFwiTW96aWxsYS4qKGlQaG9uZXxpUGFkfEJsYWNrQmVycnkpLipBcHBsZVdlYktpdC4qU2FmYXJpXCIsXG4gIHZlcnNpb25SZWdleDogXCIxLjBcIixcbiAgdHlwZTogW3tcbiAgICB2ZXJzaW9uOiAxLFxuICAgIHR5cGU6IFwic3ZnI3dmXCJcbiAgfV1cbn0sIHtcbiAgcmVnZXg6IFwiVmVyc2lvbi8oXFxcXGQrXFxcXC5cXFxcZCspKFxcXFwuXFxcXGQrKT8gU2FmYXJpLyhcXFxcZCtcXFxcLlxcXFxkKylcIixcbiAgdmVyc2lvblJlZ2V4OiBcIm5ldyBOdW1iZXIoUmVnRXhwLiQxKVwiLFxuICB0eXBlOiBbe1xuICAgIHZlcnNpb246IDUuMSxcbiAgICB0eXBlOiBcIndvZmZcIlxuICB9LCB7XG4gICAgdmVyc2lvbjogMy4xLFxuICAgIHR5cGU6IFwidHRmXCJcbiAgfV1cbn0sIHtcbiAgcmVnZXg6IFwiT3BlcmEvKFxcXFxkK1xcXFwuXFxcXGQrKSguKylWZXJzaW9uLyhcXFxcZCtcXFxcLlxcXFxkKykoXFxcXC5cXFxcZCspP1wiLFxuICB2ZXJzaW9uUmVnZXg6IFwibmV3IE51bWJlcihSZWdFeHAuJDMpXCIsXG4gIHR5cGU6IFt7XG4gICAgdmVyc2lvbjogMjQsXG4gICAgdHlwZTogXCJ3b2ZmMlwiXG4gIH0sIHtcbiAgICB2ZXJzaW9uOiAxMS4xLFxuICAgIHR5cGU6IFwid29mZlwiXG4gIH0sIHtcbiAgICB2ZXJzaW9uOiAxMC4xLFxuICAgIHR5cGU6IFwidHRmXCJcbiAgfV1cbn1dLFxuICAgIGJyb3dMZW4gPSBicm93c2Vycy5sZW5ndGgsXG4gICAgc3VmZml4ID0gXCJcIixcbiAgICBpID0gMDtcblxuYTogZm9yICg7IGkgPCBicm93TGVuOyBpKyspIHtcbiAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChicm93c2Vyc1tpXS5yZWdleCk7XG5cbiAgaWYgKHJlZ2V4LnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHtcbiAgICBicm93c2VyVmVyc2lvbiA9IGV2YWwoYnJvd3NlcnNbaV0udmVyc2lvblJlZ2V4KTtcbiAgICB2YXIgdHlwZUxlbiA9IGJyb3dzZXJzW2ldLnR5cGUubGVuZ3RoO1xuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCB0eXBlTGVuOyBqKyspIHtcbiAgICAgIGlmIChicm93c2VyVmVyc2lvbiA+PSBicm93c2Vyc1tpXS50eXBlW2pdLnZlcnNpb24gJiYgKDEgPT0gYnJvd3NlcnNbaV0udW5oaW50ZWQgJiYgKHN1ZmZpeCA9IFwiX3VuaGludGVkXCIpLCB3ZWJmb250VHlwZSA9IGJyb3dzZXJzW2ldLnR5cGVbal0udHlwZSwgXCJ3b2ZmXCIgIT0gd2ViZm9udFR5cGUgfHwgd29mZkVuYWJsZWQpICYmIChcIndvZmYyXCIgIT0gd2ViZm9udFR5cGUgfHwgd29mZjJFbmFibGVkKSAmJiAoXCJzdmcjd2ZcIiAhPSB3ZWJmb250VHlwZSB8fCBzdmdFbmFibGVkKSkgYnJlYWsgYTtcbiAgICB9XG4gIH0gZWxzZSB3ZWJmb250VHlwZSA9IFwid29mZlwiO1xufVxuXG4vKE1hY2ludG9zaHxBbmRyb2lkKS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSAmJiBcInN2ZyN3ZlwiICE9IHdlYmZvbnRUeXBlICYmIChzdWZmaXggPSBcIl91bmhpbnRlZFwiKTtcbnZhciBoZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJoZWFkXCIpWzBdLFxuICAgIHN0eWxlc2hlZXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG5zdHlsZXNoZWV0LnNldEF0dHJpYnV0ZShcInR5cGVcIiwgXCJ0ZXh0L2Nzc1wiKTtcbmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGVzaGVldCk7XG5cbmZvciAodmFyIGZvbnRzID0gW3tcbiAgZm9udEZhbWlseTogXCJHaWxyb3ktU2VtaUJvbGRJdGFsaWNcIixcbiAgdXJsOiB3ZnBhdGggKyBcIjNBQTk0RV8wXCIgKyBzdWZmaXggKyBcIl8wLlwiICsgd2ViZm9udFR5cGVcbn0sIHtcbiAgZm9udEZhbWlseTogXCJHaWxyb3ktU2VtaUJvbGRcIixcbiAgdXJsOiB3ZnBhdGggKyBcIjNBQTk0RV8xXCIgKyBzdWZmaXggKyBcIl8wLlwiICsgd2ViZm9udFR5cGVcbn0sIHtcbiAgZm9udEZhbWlseTogXCJHaWxyb3ktQm9sZEl0YWxpY1wiLFxuICB1cmw6IHdmcGF0aCArIFwiM0FBOTRFXzJcIiArIHN1ZmZpeCArIFwiXzAuXCIgKyB3ZWJmb250VHlwZVxufSwge1xuICBmb250RmFtaWx5OiBcIkdpbHJveS1Cb2xkXCIsXG4gIHVybDogd2ZwYXRoICsgXCIzQUE5NEVfM1wiICsgc3VmZml4ICsgXCJfMC5cIiArIHdlYmZvbnRUeXBlXG59XSwgbGVuID0gZm9udHMubGVuZ3RoLCBjc3MgPSBcIlwiLCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gIHZhciBmb3JtYXQgPSBcInN2ZyN3ZlwiID09IHdlYmZvbnRUeXBlID8gJ2Zvcm1hdChcInN2Z1wiKScgOiBcInR0ZlwiID09IHdlYmZvbnRUeXBlID8gJ2Zvcm1hdChcInRydWV0eXBlXCIpJyA6IFwiZW90XCIgPT0gd2ViZm9udFR5cGUgPyBcIlwiIDogJ2Zvcm1hdChcIicgKyB3ZWJmb250VHlwZSArICdcIiknLFxuICAgICAgY3NzID0gY3NzICsgKFwiQGZvbnQtZmFjZXtmb250LWZhbWlseTogXCIgKyBmb250c1tpXS5mb250RmFtaWx5ICsgXCI7c3JjOnVybChcIiArIGZvbnRzW2ldLnVybCArIFwiKVwiICsgZm9ybWF0ICsgXCI7XCIpO1xuICBmb250c1tpXS5mb250V2VpZ2h0ICYmIChjc3MgKz0gXCJmb250LXdlaWdodDogXCIgKyBmb250c1tpXS5mb250V2VpZ2h0ICsgXCI7XCIpO1xuICBmb250c1tpXS5mb250U3R5bGUgJiYgKGNzcyArPSBcImZvbnQtc3R5bGU6IFwiICsgZm9udHNbaV0uZm9udFN0eWxlICsgXCI7XCIpO1xuICBjc3MgKz0gXCJ9XCI7XG59XG5cbnN0eWxlc2hlZXQuc3R5bGVTaGVldCA/IHN0eWxlc2hlZXQuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzIDogc3R5bGVzaGVldC5pbm5lckhUTUwgPSBjc3M7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogR2xvYmFsIHZhcmlhYmxlcyBhbmQgb2JqZWN0c1xuICovXG52YXIgaHRtbCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdodG1sJylbMF07XG52YXIgYm9keSA9IGRvY3VtZW50LmJvZHk7XG4vKipcbiAqIEJyZWFrcG9pbnRzXG4gKlxuICogQHR5cGUgICAgIHtPYmplY3R9XG4gKi9cblxudmFyIGJyZWFrcG9pbnRzID0ge1xuICBtb2JpbGU6IDYwMCxcbiAgdGFibGV0OiA5NjAsXG4gIGRlc2t0b3A6IDEwMjBcbn07XG4vKipcbiAqIFNpdGUgc2VjdGlvbnNcbiAqXG4gKiBAdHlwZSAgICAge09iamVjdH1cbiAqL1xuXG52YXIgc2l0ZSA9IHtcbiAgc2l0ZTogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNpdGUnKSxcbiAgaGVhZGVyOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuc2l0ZS1oZWFkZXInKSxcbiAgbWFpbjogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNpdGUtbWFpbicpLFxuICBmb290ZXI6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zaXRlLWZvb3RlcicpXG59O1xuLyoqXG4gKiBNZW51IHRvZ2dsZVxuICpcbiAqIEB0eXBlICAgICB7T2JqZWN0fVxuICogQHByb3BlcnR5IHtIVE1MRWxlbWVudH0gdG9nZ2xlICAgICAtIE1lbnUgYnV0dG9uXG4gKiBAcHJvcGVydHkge0hUTUxFbGVtZW50fSBuYXZpZ2F0aW9uIC0gTWVudSBjb250YWluZXJcbiAqL1xuXG52YXIgbWVudSA9IHtcbiAgdG9nZ2xlOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuanMtbWVudS10b2dnbGUnKSxcbiAgbmF2aWdhdGlvbjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLW1lbnUnKSxcbiAgdGV4dDogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmpzLW1lbnUtdG9nZ2xlIC5idXR0b25fX3RleHQnKVxufTtcbi8qKlxuICogU2VhcmNoIHRvZ2dsZVxuICpcbiAqIEB0eXBlICAgICB7T2JqZWN0fVxuICogQHByb3BlcnR5IHtIVE1MRWxlbWVudH0gdG9nZ2xlICAgICAtIFNlYXJjaCBidXR0b25cbiAqIEBwcm9wZXJ0eSB7SFRNTEVsZW1lbnR9IG5hdmlnYXRpb24gLSBTZWFyY2ggY29udGFpbmVyXG4gKi9cblxudmFyIHNlYXJjaCA9IHtcbiAgdG9nZ2xlOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuanMtc2VhcmNoLXRvZ2dsZScpWzBdLFxuICBuYXZpZ2F0aW9uOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtc2VhcmNoJyksXG4gIHRleHQ6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5qcy1zZWFyY2gtdG9nZ2xlIC5idXR0b25fX3RleHQnKVxufTtcbi8qKlxuICogUGFnZXMtaW4gdG9nZ2xlXG4gKlxuICogQHR5cGUgICAgIHtPYmplY3R9XG4gKiBAcHJvcGVydHkge0hUTUxFbGVtZW50fSB0b2dnbGUgICAgIC0gUGFnZXMgaW4gYnV0dG9uXG4gKiBAcHJvcGVydHkge0hUTUxFbGVtZW50fSBuYXZpZ2F0aW9uIC0gUGFnZXMgaW4gbGlzdFxuICovXG5cbnZhciBwYWdlc0luID0ge1xuICB0b2dnbGU6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5qcy1wYWdlcy1pbi10b2dnbGUnKSxcbiAgbmF2aWdhdGlvbjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BhZ2VzLWluLWxpc3QnKVxufTtcbi8qKlxuICogQWxsIGhlYWRlciB0b2dnbGVzXG4gKlxuICogQHByb3BlcnR5IHtIVE1MRWxlbWVudH0gdG9nZ2xlICAgICAtIFRvZ2dsZSBidXR0b25zXG4gKi9cblxudmFyIGhlYWRlclRvZ2dsZXMgPSBzaXRlLmhlYWRlci5xdWVyeVNlbGVjdG9yQWxsKCcuanMtdG9nZ2xlJyk7XG4vKipcbiAqIFZpZXdwb3J0IHdpZHRoc1xuICpcbiAqIEB0eXBlICAgICB7T2JqZWN0fVxuICovXG5cbnZhciB2aWV3cG9ydHMgPSB7XG4gIHdpZHRoOiB2ZXJnZS52aWV3cG9ydFcoKSxcbiAgaGVpZ2h0OiB2ZXJnZS52aWV3cG9ydEgoKVxufTtcbi8qKlxuICogaU9TRGV2aWNlXG4gKlxuICogQHR5cGUgICAgIHtCb29sZWFufVxuICovXG5cbnZhciBpT1NEZXZpY2UgPSAhIW5hdmlnYXRvci5wbGF0Zm9ybS5tYXRjaCgvaVBob25lfGlQb2R8aVBhZC8pO1xuLyoqXG4gKiBFbWJlZGRlZCBNYXBzXG4gKlxuICovXG5cbnZhciBtYXAgPSBudWxsO1xudmFyIGVtYmVkZGVkTWFwcyA9IHNpdGUubWFpbi5xdWVyeVNlbGVjdG9yQWxsKCcubWFwJyk7XG52YXIgc2tpcEVtYmVkZGVkTWFwc0ZvcndhcmRzID0gc2l0ZS5tYWluLnF1ZXJ5U2VsZWN0b3JBbGwoJy5qcy1tYXAtc2tpcC1mb3J3YXJkcycpO1xudmFyIHNraXBFbWJlZGRlZE1hcHNCYWNrd2FyZHMgPSBzaXRlLm1haW4ucXVlcnlTZWxlY3RvckFsbCgnLmpzLW1hcC1za2lwLWJhY2t3YXJkcycpO1xuLyoqXG4gKiBqUXVlcnlcbiAqL1xuXG52YXIgJHNpdGVNYWluID0gJChzaXRlLm1haW4pO1xudmFyICRzaXRlSGVhZGVyID0gJChzaXRlLmhlYWRlcik7XG52YXIgJGZvcm1zID0gJHNpdGVNYWluLmZpbmQoJy5mb3JtJyk7XG52YXIgJGJvZHkgPSAkKGJvZHkpO1xudmFyICRodG1sID0gJChodG1sKTtcbnZhciAkd2luZG93ID0gJCh3aW5kb3cpO1xudmFyICRtZW51TmF2ID0gJChtZW51Lm5hdmlnYXRpb24pOyIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBkZWJvdW5jZShmdW5jLCB3YWl0LCBpbW1lZGlhdGUpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciB0aW1lb3V0O1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjb250ZXh0ID0gdGhpcyxcbiAgICAgICAgYXJncyA9IGFyZ3VtZW50cztcblxuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uIGxhdGVyKCkge1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICBpZiAoIWltbWVkaWF0ZSkgZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICB9O1xuXG4gICAgdmFyIGNhbGxOb3cgPSBpbW1lZGlhdGUgJiYgIXRpbWVvdXQ7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICBpZiAoY2FsbE5vdykgZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgfTtcbn1cblxuOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIE1vcmUgcGVyZm9ybWFudCBmb3JFYWNoIGZ1bmN0aW9uXG4gKlxuICogQHBhcmFtIHtBcnJheX0gICAgYXJyYXkgICAgLSBUaGUgYXJyYXkgLyBub2RlIGxpc3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrXG4gKi9cbmZ1bmN0aW9uIGZvckVhY2goYXJyYXksIGNhbGxiYWNrLCBzY29wZSkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgY2FsbGJhY2suY2FsbChzY29wZSwgaSwgYXJyYXlbaV0pOyAvLyBwYXNzZXMgYmFjayBzdHVmZiB3ZSBuZWVkXG4gIH1cbn1cblxuO1xuLyoqXG4gKiBDYWxjdWxhdGVzIHRoZSBoZWlnaHQgb2YgYSBnaXZlbiBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW0gLSBUaGUgZWxlbWVudFxuICpcbiAqIEByZXR1cm4ge3N0cmluZ30gVGhlIGhlaWdodCBpbiBweC5cbiAqL1xuXG5mdW5jdGlvbiBnZXRIZWlnaHQoZWxlbSkge1xuICBpZiAoIWVsZW0pIHJldHVybjtcbiAgdmFyIGVsZW1IZWlnaHQgPSBlbGVtLnNjcm9sbEhlaWdodCArICdweCc7XG4gIHJldHVybiBlbGVtSGVpZ2h0O1xufVxuXG47XG4vKipcbiAqIFNjcm9sbCBMb2NrXG4gKlxuICogVGhpcyBmdW5jdGlvbiBpcyBhcHBsaWVkIHRvIGxvY2sgdGhlIHdpbmRvdyBzY3JvbGxpbmcuXG4gKiBUaGlzIHNob3VsZCBiZSBhcHBsaWVkIHdoZW4gc2hvd2luZyBwb3B1cHMgYW5kIGZ1bGwgaGVpZ2h0IG1vZGVscyB0byBhbGxvdyB0aGUgdXNlciB0byBzY3JvbGwgdGhlIHRvcCBsYXllci5cbiAqXG4gKiBDYWxsIHVzaW5nIHNjcm9sbExvY2soKSB0byBsb2NrIGFuZCBzY3JvbGxMb2NrKGZhbHNlKSB0byB1bmxvY2s7XG4gKlxuICovXG5cbmZ1bmN0aW9uIHNjcm9sbExvY2soKSB7XG4gIHZhciBsb2NraW5nU2Nyb2xsID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiB0cnVlO1xuICBpZiAoISQoc2l0ZS5zaXRlKS5sZW5ndGgpIHJldHVybjtcblxuICBpZiAobG9ja2luZ1Njcm9sbCA9PSB0cnVlKSB7XG4gICAgJChzaXRlLnNpdGUpLmNzcygndG9wJywgLSQod2luZG93KS5zY3JvbGxUb3AoKSk7XG4gICAgJGh0bWwuYXR0cignZGF0YS1zY3JvbGwtbG9jaycsICd0cnVlJyk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKCEkaHRtbC5hdHRyKCdkYXRhLXNjcm9sbC1sb2NrJykubGVuZ3RoKSByZXR1cm47XG4gICAgdmFyIHJlc2V0U2Nyb2xsID0gcGFyc2VJbnQoJChzaXRlLnNpdGUpLmNzcygndG9wJykpICogLTE7XG4gICAgJGh0bWwucmVtb3ZlQXR0cignZGF0YS1zY3JvbGwtbG9jaycpO1xuICAgICQoc2l0ZS5zaXRlKS5jc3MoJ3RvcCcsICdhdXRvJyk7XG4gICAgJCgnaHRtbCwgYm9keScpLmFuaW1hdGUoe1xuICAgICAgc2Nyb2xsVG9wOiByZXNldFNjcm9sbFxuICAgIH0sIDApO1xuICB9XG59XG5cbjtcbi8qKlxuICogU2Nyb2xscyB0byBlbGVtZW50LlxuICpcbiAqIEltbWVkaWF0ZWx5IGludm9rZWQgZnVuY3Rpb24gZXhwcmVzc2lvblxuICpcbiAqIEFwcGx5IGRhdGEgYXR0cmlidXRlICdkYXRhLXNjcm9sbC10bycgdG8gYW4gZWxlbWVudCBidXR0b24gd2l0aCBhbiBJRCBvZlxuICogdGhlIHNlbGVjdG9yIHlvdSB3YW50IHRvIHNjcm9sbCB0by5cbiAqXG4gKiBVc2VzIGpRdWVyeSBzZWxlY3RvcnMgYXMgJ2FuaW1hdGUnIGlzbid0IHdpZGVseVxuICogc3VwcG9ydGVkIHdpdGggdmFuaWxsYSBKUy5cbiAqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAkKCdbZGF0YS1zY3JvbGwtdG9dJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdmFyICR0aGlzID0gJCh0aGlzKSxcbiAgICAgICAgdGFyZ2V0RGF0YSA9ICR0aGlzLmF0dHIoJ2RhdGEtc2Nyb2xsLXRvJyksXG4gICAgICAgICR0YXJnZXQgPSAkKHRhcmdldERhdGEpO1xuICAgIGlmICgkdGFyZ2V0Lm9mZnNldCgpID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7XG4gICAgICBzY3JvbGxUb3A6ICR0YXJnZXQub2Zmc2V0KCkudG9wXG4gICAgfSwgNTAwKTtcbiAgfSk7XG59KSgpO1xuLyoqXG4gKiBSZXNldHMgdGhlIHRhYmJpbmcgZm9jdXNcbiAqXG4gKiBJbW1lZGlhdGVseSBpbnZva2VkIGZ1bmN0aW9uIGV4cHJlc3Npb25cbiAqXG4gKiBBcHBseSBkYXRhIGF0dHJpYnV0ZSB0byBhIGhpZGRlbiBidXR0b24gd2l0aCBhbiBJRCBvZlxuICogdGhlIHNlbGVjdG9yIHlvdSB3YW50IHRvIGZvY3VzIHRvLlxuICovXG5cblxuKGZ1bmN0aW9uICgpIHtcbiAgJCgnW2RhdGEtZm9jdXNdJykub24oJ2ZvY3VzJywgZnVuY3Rpb24gKCkge1xuICAgIHZhciBpZCA9ICQodGhpcykuYXR0cignZGF0YS1mb2N1cycpO1xuICAgICQoJyMnICsgaWQpLmZvY3VzKCk7XG4gIH0pO1xufSkoKTtcbi8qXG4gKiBNYXRjaCBoZWlnaHQgdXNpbmcgZGF0YSBhdHRyaWJ1dGVcbiAqL1xuXG5cbihmdW5jdGlvbiAoKSB7XG4gICQoJ1tkYXRhLW1hdGNoSGVpZ2h0XScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XG4gICAgdmFyIG1hdGNoSGVpZ2h0VGFyZ2V0ID0gJHRoaXMuYXR0cignZGF0YS1tYXRjaEhlaWdodCcpO1xuICAgICR0aGlzLmZpbmQobWF0Y2hIZWlnaHRUYXJnZXQpLm1hdGNoSGVpZ2h0KCk7XG4gIH0pO1xuICAkKCdbZGF0YS1tYXRjaEhlaWdodC1wYXJlbnRdJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgdmFyICR0aGlzID0gJCh0aGlzKTtcbiAgICB2YXIgJG1hdGNoSGVpZ2h0UGFyZW50ID0gJHRoaXMuY2xvc2VzdCgkdGhpcy5hdHRyKCdkYXRhLW1hdGNoSGVpZ2h0LXBhcmVudCcpKTtcbiAgICB2YXIgJG1hdGNoSGVpZ2h0VGFyZ2V0T2JqID0gJG1hdGNoSGVpZ2h0UGFyZW50LmZpbmQoJHRoaXMuYXR0cignZGF0YS1tYXRjaEhlaWdodC13aXRoJykpO1xuXG4gICAgaWYgKCEkbWF0Y2hIZWlnaHRUYXJnZXRPYmoubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgJHRoaXMuYWRkKCRtYXRjaEhlaWdodFRhcmdldE9iaikubWF0Y2hIZWlnaHQoKTtcbiAgfSk7XG59KSgpO1xuLypcbiAqIFRvZ2dsZSBib2R5IGNsYXNzXG4gKi9cblxuXG5mdW5jdGlvbiB0b2dnbGVCb2R5Q2xhc3MoJGNsYXNzKSB7XG4gIHZhciAkc3RhdGUgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6ICdhZGQnO1xuXG4gIGlmICgkc3RhdGUgPT09ICdhZGQnKSB7XG4gICAgJGJvZHkuYWRkQ2xhc3MoJGNsYXNzKTtcbiAgfSBlbHNlIHtcbiAgICAkYm9keS5yZW1vdmVDbGFzcygkY2xhc3MpO1xuICB9XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmlmICghRWxlbWVudC5wcm90b3R5cGUubWF0Y2hlcykge1xuICBFbGVtZW50LnByb3RvdHlwZS5tYXRjaGVzID0gRWxlbWVudC5wcm90b3R5cGUubXNNYXRjaGVzU2VsZWN0b3IgfHwgRWxlbWVudC5wcm90b3R5cGUud2Via2l0TWF0Y2hlc1NlbGVjdG9yO1xufVxuXG5pZiAoIUVsZW1lbnQucHJvdG90eXBlLmNsb3Nlc3QpIHtcbiAgRWxlbWVudC5wcm90b3R5cGUuY2xvc2VzdCA9IGZ1bmN0aW9uIChzKSB7XG4gICAgdmFyIGVsID0gdGhpcztcblxuICAgIGRvIHtcbiAgICAgIGlmIChlbC5tYXRjaGVzKHMpKSByZXR1cm4gZWw7XG4gICAgICBlbCA9IGVsLnBhcmVudEVsZW1lbnQgfHwgZWwucGFyZW50Tm9kZTtcbiAgICB9IHdoaWxlIChlbCAhPT0gbnVsbCAmJiBlbC5ub2RlVHlwZSA9PT0gMSk7XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcblxuLypcbiogICBDdXN0b20gdmVyc2lvbiBvZiBhMTF5LXRvZ2dsZSAtIGh0dHBzOi8vZ2l0aHViLmNvbS9lZGVuc3BpZWtlcm1hbm4vYTExeS10b2dnbGVcbipcbiogICBGdWxsIGRvY3MgaGVyZTogaHR0cDovL2VkZW5zcGlla2VybWFubi5naXRodWIuaW8vYTExeS10b2dnbGUvXG4qXG4qICAgRXhhbXBsZSB0byB3YXRjaCBmb3IgY2FsbGJhY2sgZXZlbnRzLCBkbyB0aGUgZm9sbG93aW5nOlxuKiAgIDxidXR0b24gY2xhc3M9XCJidXR0b25cIiBkYXRhLWExMXktdG9nZ2xlPVwidGFyZ2V0XCIgZGF0YS1hMTF5LWNhbGxiYWNrPVwidGFyZ2V0Q2FsbGJhY2tcIj48L2J1dHRvbj5cbipcbiogICBUbyBhdm9pZCBkdXBsaWNhdGlvbiBvZiB0aGUgJ0RPTUNvbnRlbnRMb2FkZWQnIGxpc3RlbmVyLCBpbml0QTExeVRvZ2dsZSgpIGlzIG5vdyBjYWxsZWQgZnJvbSB3aXRoaW4gbWFpbi5qc1xuKiAgIElmIHlvdSBkbyBub3Qgd2FudCB0byByZWluaXRpYWxpc2UgZXZlcnl0aGluZywgeW91IGNhbiBwYXNzIGEgY29udGV4dCB0byB0aGUgYTExeVRvZ2dsZSBmdW5jdGlvbiB3aGljaCB3aWxsIGJlIHVzZWQgYXMgYSByb290IGZvciAucXVlcnlTZWxlY3RvckFsbC5cbiogICBpLmUuIHdpbmRvdy5hMTF5VG9nZ2xlKG15Q29udGFpbmVyKTtcbipcbiogICBJbml0aWFsaXNhdGlvbiBldmVudCBsaXN0ZW5lcjpcbipcbiogICAkKHdpbmRvdykub24oJ2ExMXktdG9nZ2xlOnRhcmdldENhbGxiYWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiogICAgIGNvbnNvbGUubG9nKCdhMTF5LXRvZ2dsZSBjYWxsYmFjayBsb2FkZWQnKTtcbiogICB9KTtcbipcbiogICBIaWRlIGV2ZW50IGxpc3RlbmVyOlxuKlxuKiAgICQod2luZG93KS5vbignYTExeS10b2dnbGUtaGlkZTp0YXJnZXRDYWxsYmFjaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4qICAgICBjb25zb2xlLmxvZygnYTExeS10b2dnbGUgY2FsbGJhY2sgaGlkZScpO1xuKiAgIH0pO1xuKlxuKiAgIFNob3cgZXZlbnQgbGlzdGVuZXI6XG4qXG4qICAgJCh3aW5kb3cpLm9uKCdhMTF5LXRvZ2dsZS1zaG93OnRhcmdldENhbGxiYWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiogICAgIGNvbnNvbGUubG9nKCdhMTF5LXRvZ2dsZSBjYWxsYmFjayBzaG93Jyk7XG4qICAgfSk7XG4qXG4qL1xudmFyIGluaXRBMTF5VG9nZ2xlID0gZnVuY3Rpb24gaW5pdEExMXlUb2dnbGUoKSB7fTtcblxuKGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBpbnRlcm5hbElkID0gMDtcbiAgdmFyIHRvZ2dsZXNNYXAgPSB7fTtcbiAgdmFyIHRhcmdldHNNYXAgPSB7fTtcblxuICBmdW5jdGlvbiAkKHNlbGVjdG9yLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKChjb250ZXh0IHx8IGRvY3VtZW50KS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDbG9zZXN0VG9nZ2xlKGVsZW1lbnQpIHtcbiAgICBpZiAoZWxlbWVudC5jbG9zZXN0KSB7XG4gICAgICByZXR1cm4gZWxlbWVudC5jbG9zZXN0KCdbZGF0YS1hMTF5LXRvZ2dsZV0nKTtcbiAgICB9XG5cbiAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgaWYgKGVsZW1lbnQubm9kZVR5cGUgPT09IDEgJiYgZWxlbWVudC5oYXNBdHRyaWJ1dGUoJ2RhdGEtYTExeS10b2dnbGUnKSkge1xuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgIH1cblxuICAgICAgZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVRvZ2dsZSh0b2dnbGUpIHtcbiAgICB2YXIgdGFyZ2V0ID0gdG9nZ2xlICYmIHRhcmdldHNNYXBbdG9nZ2xlLmdldEF0dHJpYnV0ZSgnYXJpYS1jb250cm9scycpXTtcblxuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIHRvZ2dsZXMgPSB0b2dnbGVzTWFwWycjJyArIHRhcmdldC5pZF07XG4gICAgdmFyIGlzRXhwYW5kZWQgPSB0YXJnZXQuZ2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicpID09PSAnZmFsc2UnO1xuICAgIHRhcmdldC5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgaXNFeHBhbmRlZCk7XG4gICAgdG9nZ2xlcy5mb3JFYWNoKGZ1bmN0aW9uICh0b2dnbGUpIHtcbiAgICAgIHRvZ2dsZS5zZXRBdHRyaWJ1dGUoJ2FyaWEtZXhwYW5kZWQnLCAhaXNFeHBhbmRlZCk7XG4gICAgfSk7XG5cbiAgICBpZiAodG9nZ2xlLmhhc0F0dHJpYnV0ZSgnZGF0YS1hMTF5LWNhbGxiYWNrJykpIHtcbiAgICAgIHZhciB0b2dnbGVDYWxsYmFja0V2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG5cbiAgICAgIGlmIChpc0V4cGFuZGVkKSB7XG4gICAgICAgIHRvZ2dsZUNhbGxiYWNrRXZlbnQuaW5pdEV2ZW50KCdhMTF5LXRvZ2dsZS1oaWRlOicgKyB0b2dnbGUuZ2V0QXR0cmlidXRlKCdkYXRhLWExMXktY2FsbGJhY2snKSwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0b2dnbGVDYWxsYmFja0V2ZW50LmluaXRFdmVudCgnYTExeS10b2dnbGUtc2hvdzonICsgdG9nZ2xlLmdldEF0dHJpYnV0ZSgnZGF0YS1hMTF5LWNhbGxiYWNrJyksIHRydWUsIHRydWUpO1xuICAgICAgfVxuXG4gICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudCh0b2dnbGVDYWxsYmFja0V2ZW50KTtcbiAgICB9XG4gIH1cblxuICBpbml0QTExeVRvZ2dsZSA9IGZ1bmN0aW9uIGluaXRBMTF5VG9nZ2xlKGNvbnRleHQpIHtcbiAgICB0b2dnbGVzTWFwID0gJCgnW2RhdGEtYTExeS10b2dnbGVdJywgY29udGV4dCkucmVkdWNlKGZ1bmN0aW9uIChhY2MsIHRvZ2dsZSkge1xuICAgICAgdmFyIHNlbGVjdG9yID0gJyMnICsgdG9nZ2xlLmdldEF0dHJpYnV0ZSgnZGF0YS1hMTF5LXRvZ2dsZScpO1xuICAgICAgYWNjW3NlbGVjdG9yXSA9IGFjY1tzZWxlY3Rvcl0gfHwgW107XG4gICAgICBhY2Nbc2VsZWN0b3JdLnB1c2godG9nZ2xlKTtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwgdG9nZ2xlc01hcCk7XG4gICAgdmFyIHRhcmdldHMgPSBPYmplY3Qua2V5cyh0b2dnbGVzTWFwKTtcbiAgICB0YXJnZXRzLmxlbmd0aCAmJiAkKHRhcmdldHMpLmZvckVhY2goZnVuY3Rpb24gKHRhcmdldCkge1xuICAgICAgdmFyIHRvZ2dsZXMgPSB0b2dnbGVzTWFwWycjJyArIHRhcmdldC5pZF07XG4gICAgICB2YXIgaXNFeHBhbmRlZCA9IHRhcmdldC5oYXNBdHRyaWJ1dGUoJ2RhdGEtYTExeS10b2dnbGUtb3BlbicpO1xuICAgICAgdmFyIGxhYmVsbGVkYnkgPSBbXTtcbiAgICAgIHRvZ2dsZXMuZm9yRWFjaChmdW5jdGlvbiAodG9nZ2xlKSB7XG4gICAgICAgIHRvZ2dsZS5pZCB8fCB0b2dnbGUuc2V0QXR0cmlidXRlKCdpZCcsICdhMTF5LXRvZ2dsZS0nICsgaW50ZXJuYWxJZCsrKTtcbiAgICAgICAgdG9nZ2xlLnNldEF0dHJpYnV0ZSgnYXJpYS1jb250cm9scycsIHRhcmdldC5pZCk7XG4gICAgICAgIHRvZ2dsZS5zZXRBdHRyaWJ1dGUoJ2FyaWEtZXhwYW5kZWQnLCBpc0V4cGFuZGVkKTtcbiAgICAgICAgbGFiZWxsZWRieS5wdXNoKHRvZ2dsZS5pZCk7XG5cbiAgICAgICAgaWYgKHRvZ2dsZS5oYXNBdHRyaWJ1dGUoJ2RhdGEtYTExeS1jYWxsYmFjaycpKSB7XG4gICAgICAgICAgdmFyIHRvZ2dsZUluaXQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICB0b2dnbGVJbml0LmluaXRFdmVudCgnYTExeS10b2dnbGU6JyArIHRvZ2dsZS5nZXRBdHRyaWJ1dGUoJ2RhdGEtYTExeS1jYWxsYmFjaycpLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudCh0b2dnbGVJbml0KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB0YXJnZXQuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICFpc0V4cGFuZGVkKTtcbiAgICAgIHRhcmdldC5oYXNBdHRyaWJ1dGUoJ2FyaWEtbGFiZWxsZWRieScpIHx8IHRhcmdldC5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWxsZWRieScsIGxhYmVsbGVkYnkuam9pbignICcpKTtcbiAgICAgIHRhcmdldHNNYXBbdGFyZ2V0LmlkXSA9IHRhcmdldDtcbiAgICB9KTtcbiAgfTtcblxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciB0b2dnbGUgPSBnZXRDbG9zZXN0VG9nZ2xlKGV2ZW50LnRhcmdldCk7XG4gICAgaGFuZGxlVG9nZ2xlKHRvZ2dsZSk7XG4gIH0pO1xuICB3aW5kb3cgJiYgKHdpbmRvdy5hMTF5VG9nZ2xlID0gaW5pdEExMXlUb2dnbGUpO1xufSkoKTsiLCJcInVzZSBzdHJpY3RcIjtcblxuKGZ1bmN0aW9uICgpIHtcbiAgLy8gYTExeS10b2dnbGUgY29ubmVjdGVkIHRvZ2dsZSBmdW5jdGlvbnNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZnVuY3Rpb24gY29sbGFwc2UodG9nZ2xlKSB7XG4gICAgdmFyIGlkID0gdG9nZ2xlLmdldEF0dHJpYnV0ZSgnZGF0YS1hMTF5LXRvZ2dsZScpO1xuICAgIHZhciBjb2xsYXBzaWJsZUJveCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICBjb2xsYXBzaWJsZUJveC5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgdHJ1ZSk7XG4gICAgdG9nZ2xlLnNldEF0dHJpYnV0ZSgnYXJpYS1leHBhbmRlZCcsIGZhbHNlKTtcbiAgfVxuXG4gIDtcblxuICBmdW5jdGlvbiBnZXRUb2dnbGVGcm9tVGFyZ2V0KGVsZW1lbnQpIHtcbiAgICB3aGlsZSAoIWVsZW1lbnQuaGFzQXR0cmlidXRlKCdkYXRhLWExMXktdG9nZ2xlJykpIHtcbiAgICAgIGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH1cblxuICA7XG5cbiAgZnVuY3Rpb24gY29sbGFwc2VBbGwoZXZlbnQpIHtcbiAgICB2YXIgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0O1xuICAgIHZhciBjb250YWluZXIgPSB0YXJnZXQuY2xvc2VzdCgnLmNvbm5lY3RlZC10b2dnbGVzJyk7XG4gICAgdmFyIHRvZ2dsZXMgPSBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtYTExeS10b2dnbGVdJyk7XG4gICAgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodG9nZ2xlcykuZmlsdGVyKGZ1bmN0aW9uICh0b2dnbGUpIHtcbiAgICAgIHJldHVybiB0b2dnbGUgIT09IGdldFRvZ2dsZUZyb21UYXJnZXQoZXZlbnQudGFyZ2V0KTtcbiAgICB9KS5mb3JFYWNoKGNvbGxhcHNlKTtcbiAgfVxuXG4gIHZhciBncm91cGVkVG9nZ2xlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5jb25uZWN0ZWQtdG9nZ2xlcyBbZGF0YS1hMTF5LXRvZ2dsZV0nKSk7XG4gIGdyb3VwZWRUb2dnbGVzLmZvckVhY2goZnVuY3Rpb24gKHRvZ2dsZSkge1xuICAgIHRvZ2dsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNvbGxhcHNlQWxsKTtcbiAgfSk7XG4gICQoJ2FbZGF0YS1hMTF5LXRvZ2dsZV0nKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICB9KTtcbn0pKCk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogRXh0ZXJuYWwgTGluayBDaGVja1xuICpcbiAqIENoZWNrIGZvciBleHRlbmFsIGxpbmtzIHdpdGhpbiAuZWRpdG9yIGFuZCBhZGQgYSBjbGFzcy5cbiAqXG4gKiBUbyBpZ25vcmUgZXh0ZXJuYWwgbGlua3MsIGFkZCB0aGUgZm9sbG93aW5nXG4gKiBkYXRhIGF0dHJpYnV0ZSB0byB5b3VyIG1hcmt1cDpcbiAqIFtkYXRhLWV4dGVybmFsLWxpbms9XCJmYWxzZVwiXVxuICovXG4oZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIGxpbmtzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmVkaXRvciBhJyk7XG4gIFtdLmZvckVhY2guY2FsbChsaW5rcywgZnVuY3Rpb24gKGVsZW0pIHtcbiAgICBpZiAobG9jYXRpb24uaG9zdG5hbWUgPT09IGVsZW0uaG9zdG5hbWUgfHwgIWVsZW0uaG9zdG5hbWUubGVuZ3RoKSByZXR1cm47XG4gICAgaWYgKGVsZW0uZ2V0QXR0cmlidXRlKCdkYXRhLWV4dGVybmFsLWxpbmsnKSA9PT0gJ2ZhbHNlJyB8fCBlbGVtLmNsYXNzTGlzdC5jb250YWlucygnYnV0dG9uJykpIHJldHVybjtcbiAgICBlbGVtLmNsYXNzTGlzdC5hZGQoJ2xpbmstZXh0ZXJuYWwnKTtcbiAgfSk7XG59KSgpOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vLyBDdXN0b20gZmlsZSB1cGxvYWQgZm9ybSBmaWVsZHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZWUgZGVtbyBhdCBodHRwOi8vdHltcGFudXMubmV0L2NvZHJvcHMvMjAxNS8wOS8xNS9zdHlsaW5nLWN1c3RvbWl6aW5nLWZpbGUtaW5wdXRzLXNtYXJ0LXdheS9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4oZnVuY3Rpb24gKCkge1xuICBpZiAoISRmb3Jtcy5sZW5ndGgpIHJldHVybjtcbiAgJGZvcm1zLmZpbmQoJy5mb3JtX19maWVsZC0tdXBsb2FkLCAuZm9ybV9fZmllbGQtLWltYWdlLXVwbG9hZCcpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgIHZhciAkaW5wdXQgPSAkKHRoaXMpLFxuICAgICAgICAkbGFiZWwgPSAkaW5wdXQuY2xvc2VzdCgnLmZvcm1fX2NvbnRyb2wnKS5maW5kKCcuZm9ybV9fbGFiZWwnKSxcbiAgICAgICAgbGFiZWxWYWwgPSAkbGFiZWwudGV4dCgpLFxuICAgICAgICBjbG9uZWRMYWJlbENsYXNzID0gJ2Zvcm1fX2xhYmVsLS11cGxvYWQnOyAvLyBPbmx5IGFwcGx5IHRoZSBmb2xsb3dpbmcgamF2YXNjcmlwdCBpZiB3ZSdyZSBOT1QgdXNpbmcgZHJvcHpvbmVcblxuICAgIGlmICghJGlucHV0LnBhcmVudCgnLmZvcm1fX2NvbXBvbmVudC0tZmlsZScpLmxlbmd0aCAmJiAhJGlucHV0LnBhcmVudCgnLmZvcm1fX2NvbXBvbmVudC0taW1hZ2UtdXBsb2FkJykubGVuZ3RoKSByZXR1cm47XG5cbiAgICBpZiAoJCh0aGlzKS5oYXNDbGFzcygnZm9ybV9fZmllbGQtLWltYWdlLXVwbG9hZCcpKSB7XG4gICAgICBjbG9uZWRMYWJlbENsYXNzID0gJ2Zvcm1fX2xhYmVsLS1pbWFnZS11cGxvYWQnO1xuICAgIH1cblxuICAgICRpbnB1dC5hZnRlcigkbGFiZWwuY2xvbmUoKS5hZGRDbGFzcyhjbG9uZWRMYWJlbENsYXNzKSk7XG4gICAgJGxhYmVsLnJlcGxhY2VXaXRoKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiAnPHNwYW4gY2xhc3M9XCJmb3JtX19sYWJlbFwiPicgKyB0aGlzLmlubmVySFRNTCArICc8L3NwYW4+JztcbiAgICB9KTtcbiAgICAkbGFiZWwgPSAkaW5wdXQubmV4dChjbG9uZWRMYWJlbENsYXNzKTtcbiAgICAkaW5wdXQub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgdmFyIGZpbGVOYW1lID0gJyc7XG5cbiAgICAgIGlmIChldmVudC50YXJnZXQudmFsdWUpIHtcbiAgICAgICAgZmlsZU5hbWUgPSBldmVudC50YXJnZXQudmFsdWUuc3BsaXQoJ1xcXFwnKS5wb3AoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGZpbGVOYW1lICE9PSAnJykge1xuICAgICAgICAkbGFiZWwudGV4dChmaWxlTmFtZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkbGFiZWwudGV4dChsYWJlbFZhbCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgJGlucHV0Lm9uKCdmb2N1cycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICRpbnB1dC5hZGRDbGFzcygnaGFzLWZvY3VzJyk7XG4gICAgfSkub24oJ2ZvY3Vzb3V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgJGlucHV0LnJlbW92ZUNsYXNzKCdoYXMtZm9jdXMnKTtcbiAgICB9KTtcbiAgfSk7XG59KSgpOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIFRvZ2dsZXMgZWxlbWVudHMgYmV0d2VlbiBkZXNrdG9wIGFuZCBtb2JpbGVcbiAqXG4gKiBVc2VmdWwgaWYgZWxlbWVudHMgbmVlZCB0byBiZSBzaG93blxuICogb24gZGVza3RvcCBhbmQgaGlkZGVuIG9uIG1vYmlsZVxuICpcbiAqIEFkZCBvbiBET01Db250ZW50TG9hZGVkIGFuZCBSZXNpemVcbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtICAgLSBUaGUgZWxlbWVudFxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gdG9nZ2xlIC0gVGhlIHRvZ2dsZVxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gYnJlYWtwb2ludCAtIGludGVnZXIgdmlld3BvcnQgc2l6ZSB2YWx1ZSAoc2V0IGluIGdsb2JhbHMuanMgLSBkZWZhdWx0IDYwMHB4KVxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcmVzaXplIC0gYm9vbGVhbiB2YWx1ZSB0byBkaWZmZXJlbnRpYXRlIGJldHdlZW4gZmlyc3QgcGFnZSBsb2FkIGFuZCBvbiBicm93c2VyIHJlc2l6ZSBldmVudCAodHJpZ2dlcmVkIGZyb20gbWFpbi5qcykuXG4gKlxuICogQHJldHVybiB7ZnVuY3Rpb259IEEgZGVib3VuY2UgZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gdG9nZ2xlTW9iaWxlU3dhcChlbGVtLCB0b2dnbGUsIGJyZWFrcG9pbnQpIHtcbiAgdmFyIHJlc2l6ZSA9IGFyZ3VtZW50cy5sZW5ndGggPiAzICYmIGFyZ3VtZW50c1szXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzNdIDogZmFsc2U7XG4gIGlmICghZWxlbSkgcmV0dXJuO1xuICBpZiAoIXRvZ2dsZSkgcmV0dXJuO1xuICBicmVha3BvaW50ID0gdHlwZW9mIGJyZWFrcG9pbnQgPT09ICd1bmRlZmluZWQnID8gYnJlYWtwb2ludHMubW9iaWxlIDogYnJlYWtwb2ludDtcbiAgalF1ZXJ5LmV4dGVuZCh2ZXJnZSk7XG5cbiAgaWYgKHZlcmdlLnZpZXdwb3J0VygpID49IGJyZWFrcG9pbnQpIHtcbiAgICBlbGVtLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAnZmFsc2UnKTtcbiAgICBlbGVtLnNldEF0dHJpYnV0ZSgnZGF0YS10b2dnbGUtbW9iaWxlLXN3YXAnLCAnYWJvdmUtJyArIGJyZWFrcG9pbnQpO1xuICAgIFtdLmZvckVhY2guY2FsbCh0b2dnbGUsIGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICAgIGJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2FyaWEtZXhwYW5kZWQnLCAndHJ1ZScpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGlmIChyZXNpemUgPT09IGZhbHNlKSB7XG4gICAgICBlbGVtLnNldEF0dHJpYnV0ZSgnZGF0YS10b2dnbGUtbW9iaWxlLXN3YXAnLCAnYmVsb3ctJyArIGJyZWFrcG9pbnQpO1xuICAgIH1cblxuICAgIGlmIChlbGVtLmdldEF0dHJpYnV0ZSgnZGF0YS10b2dnbGUtbW9iaWxlLXN3YXAnKSA9PT0gJ2Fib3ZlLScgKyBicmVha3BvaW50KSB7XG4gICAgICBlbGVtLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgICAgW10uZm9yRWFjaC5jYWxsKHRvZ2dsZSwgZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgICAgICBidXR0b24uc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJyk7XG4gICAgICB9KTtcbiAgICAgIGVsZW0uc2V0QXR0cmlidXRlKCdkYXRhLXRvZ2dsZS1tb2JpbGUtc3dhcCcsICdiZWxvdy0nICsgYnJlYWtwb2ludCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRlYm91bmNlKGZ1bmN0aW9uICgpIHtcbiAgICB0b2dnbGVNb2JpbGVTd2FwKGVsZW0sIHRvZ2dsZSwgYnJlYWtwb2ludCk7XG4gIH0sIDEwMCk7XG59XG5cbjsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIG5hdmlnYXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gIC8qKlxuICAgKiBUb2dnbGUgTWVudS5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHRvZ2dsZVR5cGUgLSBtZW51IC8gc2VhcmNoIC8gcGFnZXNJblxuICAgKlxuICAgKiBSZWZlciB0byBnbG9iYWxzLmpzIGZvciBwcm9wZXJ0aWVzIHdpdGhpbiB0aGVzZSBvYmplY3RzXG4gICAqL1xuICB2YXIgbWVudVRvZ2dsZSA9IGZ1bmN0aW9uIG1lbnVUb2dnbGUodG9nZ2xlVHlwZSkge1xuICAgIC8qKlxuICAgICAqIExvb3BpbmcgdGhyb3VnaCB0b2dnbGVzIGluIGNhc2UgdGhlcmUgYXJlIG11bHRpcGxlXG4gICAgICogYnV0dG9ucyB0b2dnbGluZyB0aGUgc2FtZSBjb250ZW50XG4gICAgICovXG4gICAgW10uZm9yRWFjaC5jYWxsKHRvZ2dsZVR5cGUudG9nZ2xlLCBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgZWxlbS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRvZ2dsZVR5cGUubmF2aWdhdGlvbi5nZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJykgPT09ICd0cnVlJykge1xuICAgICAgICAgIG9wZW5NZW51KHRvZ2dsZVR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNsb3NlTWVudSh0b2dnbGVUeXBlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG4gIC8qKlxuICAgKiBPcGVucyB0aGUgbWVudS5cbiAgICogSWYgTWVudSBpcyBjbG9zZWQsIGFkZCBjbGFzc1xuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gdG9nZ2xlVHlwZSAgLSBwYXNzZWQgZnJvbSAnbWVudVRvZ2dsZSgpJ1xuICAgKi9cblxuXG4gIHZhciBvcGVuTWVudSA9IGZ1bmN0aW9uIG9wZW5NZW51KHRvZ2dsZVR5cGUpIHtcbiAgICBzY3JvbGxMb2NrKCk7IC8vIExvY2sgc2Nyb2xsXG5cbiAgICAkbWVudU5hdi5jc3MoJ2hlaWdodCcsICR3aW5kb3cuaGVpZ2h0KCkgLSAkc2l0ZUhlYWRlci5oZWlnaHQoKSk7XG4gICAgJGJvZHkuY3NzKCdoZWlnaHQnLCAkd2luZG93LmhlaWdodCgpKTtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIHRvZ2dsZVR5cGUubmF2aWdhdGlvbi5jbGFzc0xpc3QuYWRkKCdpcy1vcGVuJyk7XG4gICAgICB0b2dnbGVCb2R5Q2xhc3MoJ21lbnUtaXMtb3BlbicpO1xuICAgIH0sIDUpO1xuICB9O1xuICAvKipcbiAgICogQ2xvc2VzIHRoZSBtZW51LlxuICAgKiBJZiBNZW51IGlzIG9wZW4sIHJlbW92ZSBjbGFzc1xuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gdG9nZ2xlVHlwZSAgLSBwYXNzZWQgZnJvbSAnbWVudVRvZ2dsZSgpJ1xuICAgKi9cblxuXG4gIHZhciBjbG9zZU1lbnUgPSBmdW5jdGlvbiBjbG9zZU1lbnUodG9nZ2xlVHlwZSkge1xuICAgIHNjcm9sbExvY2soZmFsc2UpOyAvLyBVbmxvY2sgc2Nyb2xsIGxvY2tcblxuICAgIHRvZ2dsZUJvZHlDbGFzcygnbWVudS1pcy1vcGVuJywgJ3JlbW92ZScpO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgdG9nZ2xlVHlwZS5uYXZpZ2F0aW9uLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLW9wZW4nKTtcbiAgICAgICRtZW51TmF2LmNzcygnaGVpZ2h0JywgJycpO1xuICAgICAgJGJvZHkuY3NzKCdoZWlnaHQnLCAnJyk7XG4gICAgfSwgMjAwKTtcbiAgfTtcbiAgLyoqXG4gICAqIENsb3NlIGFsbCBtZW51cy5cbiAgICpcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbSAtIFRoZSB0b2dnbGUgYnV0dG9uXG4gICAqXG4gICAqIEFyZ3VtZW50IGlzIHBhc3NlZCBmcm9tIGZvckVhY2ggaW4gJ21lbnVUb2dnbGUoKSdcbiAgICovXG5cblxuICB2YXIgY2xvc2VBbGxNZW51cyA9IGZ1bmN0aW9uIGNsb3NlQWxsTWVudXMoZWxlbSkge1xuICAgIGlmIChlbGVtLmdldEF0dHJpYnV0ZSgnYXJpYS1leHBhbmRlZCcpID09PSAnZmFsc2UnKSB7XG4gICAgICBbXS5mb3JFYWNoLmNhbGwoaGVhZGVyVG9nZ2xlcywgZnVuY3Rpb24gKHRvZ2dsZSkge1xuICAgICAgICB2YXIgY29udGFpbmVyQ2xhc3MgPSB0b2dnbGUuZ2V0QXR0cmlidXRlKCdkYXRhLWExMXktdG9nZ2xlJyksXG4gICAgICAgICAgICBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjb250YWluZXJDbGFzcyk7XG4gICAgICAgIHRvZ2dsZS5zZXRBdHRyaWJ1dGUoJ2FyaWEtZXhwYW5kZWQnLCAnZmFsc2UnKTtcbiAgICAgICAgY29udGFpbmVyLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgICAgICBjb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnaXMtb3BlbicpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogVG9nZ2xlIHRoZSBzZWFyY2ggZm9ybSBpbiBoZWFkZXJcbiAgICovXG5cblxuICB2YXIgc2VhcmNoVG9nZ2xlID0gZnVuY3Rpb24gc2VhcmNoVG9nZ2xlKCkge1xuICAgIHNlYXJjaC5uYXZpZ2F0aW9uLmNsYXNzTGlzdC50b2dnbGUoJ2lzLWFjdGl2ZScpO1xuICAgIHZhciBzZWFyY2hFeHBhbmRlZCA9IHNlYXJjaC5uYXZpZ2F0aW9uLmNsYXNzTGlzdC5jb250YWlucygnaXMtYWN0aXZlJyk7XG5cbiAgICBpZiAoc2VhcmNoRXhwYW5kZWQpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc2VhcmNoSGVpZ2h0ID0gc2VhcmNoLm5hdmlnYXRpb24ub2Zmc2V0SGVpZ2h0O1xuICAgICAgICBib2R5LmNsYXNzTGlzdC5hZGQoJ3NlYXJjaC1pcy1vcGVuJyk7XG4gICAgICAgIGJvZHkuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVkoJyArIHNlYXJjaEhlaWdodCArICdweCknO1xuICAgICAgICBzZWFyY2gubmF2aWdhdGlvbi5jbGFzc0xpc3QuYWRkKCdpcy1vcGVuJyk7XG4gICAgICB9LCA1MCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJvZHkuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVkoMCknO1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGJvZHkuY2xhc3NMaXN0LnJlbW92ZSgnc2VhcmNoLWlzLW9wZW4nKTtcbiAgICAgICAgc2VhcmNoLm5hdmlnYXRpb24uY2xhc3NMaXN0LnJlbW92ZSgnaXMtb3BlbicpO1xuICAgICAgfSwgMjAwKTtcbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBFeHBvc2VzIHRoZSBtZXRob2RzXG4gICAqL1xuXG5cbiAgcmV0dXJuIHtcbiAgICB0b2dnbGU6IG1lbnVUb2dnbGUsXG4gICAgc2VhcmNoVG9nZ2xlOiBzZWFyY2hUb2dnbGVcbiAgfTtcbn0oKTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuLy8gIFNpdGVpbXByb3ZlIGZpeGVzIGZvciBlbWJlZGRlZCBtYXBzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuZnVuY3Rpb24gaW5pdE1hcHMoKSB7XG4gIC8vIE9SQklULTEzMCAtIFdlIHdpbGwgbm8gbG9uZ2VyIHRyeSB0byBmaXggU2l0ZWltcHJvdmUgZXJyb3JzIG9uIEdvb2dsZSBNYXBzXG4gIC8vIGh0dHBzOi8vaXNzdWV0cmFja2VyLmdvb2dsZS5jb20vaXNzdWVzLzY5NTQxNzkyXG4gIC8vIEFkdmljZSBmb3IgY2xpZW50cyB0byBjb25mb3JtIHdpdGggV0NBRyAyLjEgQUEgc3RhbmRhcmQgaXMgdG8gcHJvdmlkZSB0ZXh0IGFsdGVybmF0aXZlcyBmb3IgdGhlIGluZm9ybWF0aW9uIGluIHRoZSBtYXAuXG4gIHJldHVybjtcbn1cblxuZnVuY3Rpb24gc2tpcE1hcHMoKSB7XG4gIGlmICgodHlwZW9mIHNraXBFbWJlZGRlZE1hcHNGb3J3YXJkcyA9PT0gXCJ1bmRlZmluZWRcIiA/IFwidW5kZWZpbmVkXCIgOiBfdHlwZW9mKHNraXBFbWJlZGRlZE1hcHNGb3J3YXJkcykpICE9PSAnb2JqZWN0JyB8fCAodHlwZW9mIHNraXBFbWJlZGRlZE1hcHNCYWNrd2FyZHMgPT09IFwidW5kZWZpbmVkXCIgPyBcInVuZGVmaW5lZFwiIDogX3R5cGVvZihza2lwRW1iZWRkZWRNYXBzQmFja3dhcmRzKSkgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyICRza2lwTWFwQnV0dG9uRm9yd2FyZHMgPSAkKHNraXBFbWJlZGRlZE1hcHNGb3J3YXJkcyk7XG4gIHZhciAkc2tpcE1hcEJ1dHRvbkJhY2t3YXJkcyA9ICQoc2tpcEVtYmVkZGVkTWFwc0JhY2t3YXJkcyk7XG4gIHZhciAkc2tpcE1hcEJ1dHRvbnMgPSAkc2tpcE1hcEJ1dHRvbkZvcndhcmRzLmFkZCgkc2tpcE1hcEJ1dHRvbkJhY2t3YXJkcyk7XG4gICRza2lwTWFwQnV0dG9ucy5mb2N1cyhmdW5jdGlvbiAoKSB7XG4gICAgJCh0aGlzKS5yZW1vdmVDbGFzcygndmlzdWFsbHktaGlkZGVuJyk7XG4gIH0pO1xuICAkc2tpcE1hcEJ1dHRvbnMuYmx1cihmdW5jdGlvbiAoKSB7XG4gICAgJCh0aGlzKS5hZGRDbGFzcygndmlzdWFsbHktaGlkZGVuJyk7XG4gIH0pO1xuICAkc2tpcE1hcEJ1dHRvbnMub24oJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB2YXIgJHRoaXNCdXR0b24gPSAkKHRoaXMpLFxuICAgICAgICAkcGFyZW50V3JhcHBlciA9ICR0aGlzQnV0dG9uLmNsb3Nlc3QoJy5mb3JtX19jb21wb25lbnQtLWdvb2dsZV9tYXAsIC5kZWZpbml0aW9uX19jb250ZW50LS1nb29nbGUtbWFwJyk7XG4gICAgJHRoaXMub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgJGFsbEJ1dHRvbnNbaW5kZXggKyAxXS5mb2N1cygpO1xuICAgIH0pO1xuXG4gICAgaWYgKCR0aGlzQnV0dG9uLmhhc0NsYXNzKCdqcy1tYXAtc2tpcC1mb3J3YXJkcycpKSB7XG4gICAgICB2YXIgJHRhcmdldEJ1dHRvbiA9ICRwYXJlbnRXcmFwcGVyLmZpbmQoJy5qcy1tYXAtc2tpcC1iYWNrd2FyZHMnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyICR0YXJnZXRCdXR0b24gPSAkcGFyZW50V3JhcHBlci5maW5kKCcuanMtbWFwLXNraXAtZm9yd2FyZHMnKTtcbiAgICB9XG5cbiAgICBpZiAoISR0YXJnZXRCdXR0b24ubGVuZ3RoKSByZXR1cm47XG4gICAgJHRhcmdldEJ1dHRvbi5mb2N1cygpO1xuICB9KTtcbn0iLCJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBMaWdodGJveCBlZmZlY3QgZm9yIGltYWdlc1xuICpcbiAqIEBwYXJhbSB7Li4uc3RyaW5nfSAtIENvbnRhaW5lcnMgZm9yIHpvb21hYmxlIGltYWdlc1xuICpcbiAqIGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL0BuaXNoYW50aHMvem9vbS5qc1xuICogU3VwcG9ydHMgSUUxMCBhbmQgYWJvdmUuXG4gKlxuICogRm9ya2VkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2ZhdC96b29tLmpzXG4gKiBVc2UgdGhlIG9yaWdpbmFsIGluc3RlYWQgaWYgeW91IG5lZWQgSUU5IHN1cHBvcnQgKG5vdCBvbiBOUE0pIC0gS2VlcCB0aGlzIGluaXQgZmlsZSB0aGUgc2FtZVxuICpcbiAqIFVzYWdlOlxuICogem9vbUltYWdlKCcud2lkZ2V0LS1pbWFnZScsICcud2lkZ2V0LS10b3AtdGFza3MnKTtcbiAqL1xudmFyIHpvb21JbWFnZSA9IGZ1bmN0aW9uIHpvb21JbWFnZSgpIHtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyksXG4gICAgICBhcmdzTGVuZ3RoID0gYXJncy5sZW5ndGgsXG4gICAgICBzZWxlY3RvcnMgPSBcIlwiO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJnc0xlbmd0aDsgaSsrKSB7XG4gICAgc2VsZWN0b3JzICs9IFwiLCBcIiArIGFyZ3NbaV07XG4gIH1cblxuICB2YXIgaW1nQ29udGFpbmVycyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5lZGl0b3InICsgc2VsZWN0b3JzKTtcblxuICB2YXIgYWRkWm9vbSA9IGZ1bmN0aW9uIGFkZFpvb20oaW1hZ2UpIHtcbiAgICBbXS5mb3JFYWNoLmNhbGwoaW1hZ2UsIGZ1bmN0aW9uIChlbCkge1xuICAgICAgaWYgKGVsLnBhcmVudE5vZGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ2EnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZWwuc2V0QXR0cmlidXRlKCdkYXRhLWFjdGlvbicsICd6b29tJyk7XG4gICAgfSk7XG4gIH07XG5cbiAgW10uZm9yRWFjaC5jYWxsKGltZ0NvbnRhaW5lcnMsIGZ1bmN0aW9uIChjb250YWluZXIpIHtcbiAgICB2YXIgem9vbWFibGVJbWdzID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ2ltZycpO1xuICAgIGFkZFpvb20oem9vbWFibGVJbWdzKTtcbiAgfSk7XG59OyIsIid1c2Ugc3RyaWN0Jztcbi8qXG4gKiBDQVJPVVNFTFxuICogPT09PT09PT09PVxuICpcbiAqIFVzZXMgRmxpY2tpdHkgdi5eMiDigJMgaHR0cHM6Ly9mbGlja2l0eS5tZXRhZml6enkuY28vb3B0aW9ucy5odG1sXG4gKiBJbmNsdWRlcyBjdXN0b21pc2F0aW9ucyB0byBtaW1pYyB0aGUgZnVuY3Rpb25hbGl0eSBvZiBodHRwczovL3d3dy53My5vcmcvV0FJL3R1dG9yaWFscy9jYXJvdXNlbHMvd29ya2luZy1leGFtcGxlL1xuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogY2Fyb3VzZWxJbml0KCcuanMtY2Fyb3VzZWwnLCAnLnNsaWRlJyk7XG4gKlxuICogT3B0aW9ucyAoY2FuIGJlIGFsdGVyZWQgaW4gdGhlIG1hcmt1cCk6XG4gKlxuICogPGRpdiBjbGFzcz1cImNhcm91c2VsIGpzLWNhcm91c2VsXCIgZGF0YS1jYXJvdXNlbC10aXRsZT1cIk15IENhcm91c2VsXCI+IC8vIEEgZGVzY3JpcHRpdmUgbmFtZSBvZiB0aGUgY2Fyb3VzZWwgZm9yIHNjcmVlbnJlYWRlcnMuIFdpbGwgZGVmYXVsdCB0byB0aGUgZmlyc3QgSDEsIEgyIG9yIC53aWRnZXRfX2hlYWRpbmcgLSB3aXRoIFwiU2xpZGVzaG93IFhcIiBhcyBhIGZhbGxiYWNrXG4gKlxuICogPGRpdiBjbGFzcz1cImNhcm91c2VsIGpzLWNhcm91c2VsXCIgZGF0YS1jYXJvdXNlbC1hdXRvcGxheT1cInRydWVcIj5cbiAqIE9SXG4gKiA8ZGl2IGNsYXNzPVwiY2Fyb3VzZWwganMtY2Fyb3VzZWxcIiBkYXRhLWNhcm91c2VsLWF1dG9wbGF5PVwiMTUwMFwiPiAoaW4gbWlsbGlzZWNvbmRzKVxuICpcbiAqIDxkaXYgY2xhc3M9XCJjYXJvdXNlbCBqcy1jYXJvdXNlbFwiIGRhdGEtY2Fyb3VzZWwtZG90cz1cImZhbHNlXCI+IC8vIFRvIHJlbW92ZSB0aGUgZG90c1xuICogT1JcbiAqIDxkaXYgY2xhc3M9XCJjYXJvdXNlbCBqcy1jYXJvdXNlbFwiIGRhdGEtY2Fyb3VzZWwtZG90cz1cIiR4ICR5ICRzdGFja1wiPiAvLyBPcHRpb25hbCBDU1Mgb3ZlcnJpZGVzIC0gcG9zaXRpb25zIHRoZSBkb3RzICdjZW50ZXIgYm90dG9tIGhvcml6b250YWwnIChkZWZhdWx0KSwgJ3JpZ2h0IHRvcCB2ZXJ0aWNhbCcsICdsZWZ0IGJvdHRvbSBob3Jpem9udGFsJ1xuICpcbiAqIDxkaXYgY2xhc3M9XCJjYXJvdXNlbCBqcy1jYXJvdXNlbFwiIGRhdGEtY2Fyb3VzZWwtYXJyb3dzPVwiZmFsc2VcIj4gLy8gVG8gcmVtb3ZlIHRoZSBwcmV2aW91cyBhbmQgbmV4dCBidXR0b25zXG4gKiBPUlxuICogPGRpdiBjbGFzcz1cImNhcm91c2VsIGpzLWNhcm91c2VsXCIgZGF0YS1jYXJvdXNlbC1hcnJvd3M9XCIkeCAkeVwiPiAvLyBPcHRpb25hbCBDU1Mgb3ZlcnJpZGVzIC0gcG9zaXRpb25zIHRoZSBhcnJvd3MgJ29wcG9zaXRlIGNlbnRlcicgKGRlZmF1bHQpLCAncmlnaHQgdG9wJywgJ2xlZnQgYm90dG9tJ1xuICpcbiAqIDxkaXYgY2xhc3M9XCJjYXJvdXNlbCBqcy1jYXJvdXNlbFwiIGRhdGEtY2Fyb3VzZWwtZHJhZ2dhYmxlPVwiZmFsc2VcIj4gLy8gZGlzYWJsZSBmbGlja2l0eSdzIGRyYWdnYWJsZSBvcHRpb246IGh0dHBzOi8vZmxpY2tpdHkubWV0YWZpenp5LmNvL29wdGlvbnMuaHRtbCNkcmFnZ2FibGVcbiAqXG4gKiA8ZGl2IGNsYXNzPVwiY2Fyb3VzZWwganMtY2Fyb3VzZWxcIiBkYXRhLWFkYXB0aXZlLWhlaWdodD1cInRydWVcIj4gLy8gU2V0IGZsaWNraXR5J3MgYWRhcHRpdmVIZWlnaHQgb3B0aW9uIGh0dHBzOi8vZmxpY2tpdHkubWV0YWZpenp5LmNvL29wdGlvbnMuaHRtbCNhZGFwdGl2ZWhlaWdodFxuICpcbiovXG5cbmZ1bmN0aW9uIHBhdXNlQ3VycmVudENhcm91c2VsKGVsZW1lbnQpIHtcbiAgJChlbGVtZW50KS5jbG9zZXN0KCcuZmxpY2tpdHktZW5hYmxlZCcpLmZsaWNraXR5KCdzdG9wUGxheWVyJyk7XG59IC8vIEFkZCB0ZXh0IHRvIGJ1dHRvbnNcblxuXG5mdW5jdGlvbiBmbGlja2l0eVBhZ2luYXRpb25UZXh0KCRlbCwgY2Fyb3VzZWxOYW1lKSB7XG4gICRlbC5maW5kKCcuZmxpY2tpdHktcHJldi1uZXh0LWJ1dHRvbi5uZXh0JykuYXR0cignYXJpYS1sYWJlbCcsICdOZXh0IHNsaWRlOiAnICsgY2Fyb3VzZWxOYW1lKS5hcHBlbmQoJzxzcGFuIGNsYXNzPVwiZmxpY2tpdHktYnV0dG9uX190ZXh0XCI+TmV4dDwvc3Bhbj48c3BhbiBjbGFzcz1cInZpc3VhbGx5LWhpZGRlblwiPiBzbGlkZTogJyArIGNhcm91c2VsTmFtZSArICc8L3NwYW4+Jyk7XG4gICRlbC5maW5kKCcuZmxpY2tpdHktcHJldi1uZXh0LWJ1dHRvbi5wcmV2aW91cycpLmF0dHIoJ2FyaWEtbGFiZWwnLCAnUHJldmlvdXMgc2xpZGU6ICcgKyBjYXJvdXNlbE5hbWUpLmFwcGVuZCgnPHNwYW4gY2xhc3M9XCJmbGlja2l0eS1idXR0b25fX3RleHRcIj5QcmV2PC9zcGFuPjxzcGFuIGNsYXNzPVwidmlzdWFsbHktaGlkZGVuXCI+IHNsaWRlOiAnICsgY2Fyb3VzZWxOYW1lICsgJzwvc3Bhbj4nKTtcbiAgJGVsLmZpbmQoJy5mbGlja2l0eS1idXR0b24taWNvbicpLmF0dHIoJ2ZvY3VzYWJsZScsICdmYWxzZScpO1xufVxuXG5mdW5jdGlvbiB3cmFwRmxpY2tpdHlQYWdlRG90cygkY3VycmVudENhcm91c2VsLCBzaG93RG90cywgY2Fyb3VzZWxOYW1lKSB7XG4gIGlmICghc2hvd0RvdHMgfHwgISRjdXJyZW50Q2Fyb3VzZWwubGVuZ3RoKSByZXR1cm47XG4gIHZhciAkcGFnZURvdHMgPSAkY3VycmVudENhcm91c2VsLmZpbmQoJy5mbGlja2l0eS1wYWdlLWRvdHMnKSxcbiAgICAgICRkb3RzID0gJHBhZ2VEb3RzLmZpbmQoJy5kb3QnKTtcbiAgJHBhZ2VEb3RzLndyYXAoJzxkaXYgY2xhc3M9XCJmbGlja2l0eS1wYWdlLWRvdHMtd3JhcHBlclwiPjwvZGl2PicpO1xuICAkZG90cy5yZW1vdmVBdHRyKCdhcmlhLWxhYmVsJykuZWFjaChmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICB2YXIgJGRvdCA9ICQodGhpcyksXG4gICAgICAgICRuZXdCdXR0b24gPSAkKCc8YnV0dG9uIGNsYXNzPVwiZmxpY2tpdHktcGFnZS1kb3RzX19idXR0b25cIj48c3BhbiBjbGFzcz1cInZpc3VhbGx5LWhpZGRlblwiPlZpZXcgc2xpZGUgJyArIChpbmRleCArIDEpICsgJzogJyArIGNhcm91c2VsTmFtZSArICc8L3NwYW4+PC9idXR0b24+Jyk7XG4gICAgJGRvdC5hcHBlbmQoJG5ld0J1dHRvbik7XG4gICAgJG5ld0J1dHRvbi5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAkKHRoaXMpLmNsb3Nlc3QoJy5kb3QnKS50cmlnZ2VyKCdjbGljaycpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gd3JhcEZsaWNraXR5UHJldk5leHRCdXR0b25zKCRjdXJyZW50Q2Fyb3VzZWwsIHNob3dBcnJvd3MpIHtcbiAgaWYgKCFzaG93QXJyb3dzIHx8ICEkY3VycmVudENhcm91c2VsLmxlbmd0aCkgcmV0dXJuO1xuICB2YXIgJHByZXZCdXR0b24gPSAkY3VycmVudENhcm91c2VsLmZpbmQoJy5mbGlja2l0eS1wcmV2LW5leHQtYnV0dG9uLnByZXZpb3VzJyksXG4gICAgICAkbmV4dEJ1dHRvbiA9ICRjdXJyZW50Q2Fyb3VzZWwuZmluZCgnLmZsaWNraXR5LXByZXYtbmV4dC1idXR0b24ubmV4dCcpLFxuICAgICAgJHZpZXdwb3J0ID0gJGN1cnJlbnRDYXJvdXNlbC5maW5kKCcuZmxpY2tpdHktdmlld3BvcnQnKTtcbiAgJHByZXZCdXR0b24uYWRkKCRuZXh0QnV0dG9uKS53cmFwQWxsKCc8ZGl2IGNsYXNzPVwiZmxpY2tpdHktYnV0dG9ucy13cmFwcGVyXCI+PC9kaXY+Jyk7XG4gICRwcmV2QnV0dG9uLmluc2VydEFmdGVyKCRuZXh0QnV0dG9uKTsgLy8gRmxpcCB0aGUgdGFiYmluZyBvcmRlciBzbyB0aGF0IHRoZSBuZXh0IGJ1dHRvbiBjb21lcyBmaXJzdCgpXG5cbiAgJGN1cnJlbnRDYXJvdXNlbC5maW5kKCcuZmxpY2tpdHktYnV0dG9ucy13cmFwcGVyJykuaW5zZXJ0QmVmb3JlKCR2aWV3cG9ydCk7IC8vIE1vdmUgdGhlIGJ1dHRvbnMgYmVmb3JlIHRoZSBjb250ZW50IGluIHRoZSB0YWJiaW5nIG9yZGVyXG59XG5cbmZ1bmN0aW9uIGNhcm91c2VsVGFiYmluZ0NvbnRyb2woJGN1cnJlbnRDYXJvdXNlbCwgaW5kZXgsIGNhcm91c2VsU2xpZGVDbGFzcykge1xuICBpZiAoISRjdXJyZW50Q2Fyb3VzZWwubGVuZ3RoKSByZXR1cm47XG4gIHZhciBjYXJvdXNlbFNsaWRlQ2xhc3MgPSB0eXBlb2YgY2Fyb3VzZWxTbGlkZUNsYXNzICE9PSAndW5kZWZpbmVkJyA/IGNhcm91c2VsU2xpZGVDbGFzcyA6ICcuc2xpZGUnLFxuICAgICAgJHNsaWRlcyA9ICRjdXJyZW50Q2Fyb3VzZWwuZmluZChjYXJvdXNlbFNsaWRlQ2xhc3MpLFxuICAgICAgJHNsaWRlTGlua3MgPSAkc2xpZGVzLmZpbmQoJ2EsIGJ1dHRvbiwgaW5wdXQ6bm90KFt0eXBlPVwiaGlkZGVuXCJdKSwgdGV4dGFyZWEsIHNlbGVjdCcpLFxuICAgICAgJHBhZ2VEb3RXcmFwcGVyID0gJGN1cnJlbnRDYXJvdXNlbC5maW5kKCcuZmxpY2tpdHktcGFnZS1kb3RzLXdyYXBwZXInKTtcbiAgJHNsaWRlTGlua3MuYXR0cigndGFiaW5kZXgnLCAnLTEnKTtcbiAgJHNsaWRlcy5lcShpbmRleCkuZmluZCgnYSwgYnV0dG9uLCBpbnB1dDpub3QoW3R5cGU9XCJoaWRkZW5cIl0pLCB0ZXh0YXJlYSwgc2VsZWN0JykucmVtb3ZlQXR0cigndGFiaW5kZXgnKTtcbiAgJHBhZ2VEb3RXcmFwcGVyLmZpbmQoJy5mbGlja2l0eS1wYWdlLWRvdHNfX2J1dHRvbicpLnJlbW92ZUF0dHIoJ2Rpc2FibGVkIHRhYmluZGV4Jyk7XG4gICRwYWdlRG90V3JhcHBlci5maW5kKCcuZG90LmlzLXNlbGVjdGVkIC5mbGlja2l0eS1wYWdlLWRvdHNfX2J1dHRvbicpLmF0dHIoe1xuICAgICdkaXNhYmxlZCc6ICcnLFxuICAgICd0YWJpbmRleCc6IC0xXG4gIH0pO1xufVxuLypcbiAqIElmIHVwZGF0ZSBpcyBmYWxzZSAoZGVmYXVsdCksIGNyZWF0ZSBhIG5ldyBhcmlhLWxpdmUgcmVnaW9uIGZvciB0aGUgY2Fyb3VzZWwsIG9yIHJlLXVzZSBvbmUgdGhhdCBpcyBpbiB0aGUgbWFya3VwIHdpdGggdGhlIGNsYXNzbmFtZSAuanMtYXJpYS1saXZlXG4gKiBJZiB1cGRhdGUgaXMgc2V0IHRvIHRydWUgdGhlbiBhbWVuZCB0aGUgYXJpYS1saXZlIG1lc3NhZ2UgdG8gcmVhZCBcIk5vdyB2aWV3aW5nIHNsaWRlIFggb2YgWFwiXG4gKlxuKi9cblxuXG5mdW5jdGlvbiBjYXJvdXNlbEFyaWFMaXZlKCkge1xuICB2YXIgdXBkYXRlID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiBmYWxzZTtcbiAgdmFyICRhcmlhTGl2ZSA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdW5kZWZpbmVkO1xuICB2YXIgY2Fyb3VzZWxOYW1lID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgPyBhcmd1bWVudHNbMl0gOiB1bmRlZmluZWQ7XG4gIHZhciBjYXJvdXNlbElkID0gYXJndW1lbnRzLmxlbmd0aCA+IDMgPyBhcmd1bWVudHNbM10gOiB1bmRlZmluZWQ7XG4gIHZhciAkY3VycmVudENhcm91c2VsID0gYXJndW1lbnRzLmxlbmd0aCA+IDQgPyBhcmd1bWVudHNbNF0gOiB1bmRlZmluZWQ7XG4gIHZhciBzbGlkZUNvdW50ID0gYXJndW1lbnRzLmxlbmd0aCA+IDUgPyBhcmd1bWVudHNbNV0gOiB1bmRlZmluZWQ7XG4gIHZhciBmbGt0eVN0YW5kYXJkID0gYXJndW1lbnRzLmxlbmd0aCA+IDYgPyBhcmd1bWVudHNbNl0gOiB1bmRlZmluZWQ7XG4gIGlmICghJGN1cnJlbnRDYXJvdXNlbC5sZW5ndGggfHwgc2xpZGVDb3VudCA8IDIgfHwgdHlwZW9mIGNhcm91c2VsTmFtZSA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybjtcblxuICBpZiAoIXVwZGF0ZSkge1xuICAgIC8vIElmIGFyaWEgbGl2ZSBlbGVtZW50IGlzIGRldGVjdGVkIGluIHRoZSBtYXJrdXAsIHVzZSB0aGF0LiBPdGhlcndpc2UgY3JlYXRlIG9uZS5cbiAgICBpZiAoISRhcmlhTGl2ZS5sZW5ndGgpIHtcbiAgICAgICRhcmlhTGl2ZSA9ICQoJzxkaXYgY2xhc3M9XCJjYXJvdXNlbF9fYXJpYS1saXZlIGpzLWFyaWEtbGl2ZVwiIGlkPVwic2xpZGVzaG93LScgKyBjYXJvdXNlbElkICsgJ1wiIGFyaWEtbGl2ZT1cInBvbGl0ZVwiIGFyaWEtYXRvbWljPVwidHJ1ZVwiIHJvbGU9XCJzdGF0dXNcIj5Ob3cgdmlld2luZyBzbGlkZSA8c3BhbiBjbGFzcz1cImpzLWFyaWEtbGl2ZV9fdGV4dFwiPjEgb2YgJyArIHNsaWRlQ291bnQgKyAnPC9zcGFuPjogJyArIGNhcm91c2VsTmFtZSArICc8L2Rpdj4nKTtcbiAgICAgICRjdXJyZW50Q2Fyb3VzZWwuYXR0cignYXJpYS1sYWJlbGxlZGJ5JywgJ3NsaWRlc2hvdy0nICsgY2Fyb3VzZWxJZCkucHJlcGVuZCgkYXJpYUxpdmUpO1xuICAgICAgJGN1cnJlbnRDYXJvdXNlbC5hdHRyKCdyb2xlJywgJ2FydGljbGUnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJGFyaWFMaXZlO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBmbGt0eVN0YW5kYXJkID09ICd1bmRlZmluZWQnKSByZXR1cm4gJGFyaWFMaXZlO1xuICAkYXJpYUxpdmUuZmluZCgnLmpzLWFyaWEtbGl2ZV9fdGV4dCcpLmh0bWwoZmxrdHlTdGFuZGFyZC5zZWxlY3RlZEluZGV4ICsgMSArICcgb2YgJyArIGZsa3R5U3RhbmRhcmQuc2xpZGVzLmxlbmd0aCk7XG4gIHJldHVybiAkYXJpYUxpdmU7XG59XG5cbmZ1bmN0aW9uIGNhcm91c2VsSW5pdChjYXJvdXNlbENsYXNzLCBjYXJvdXNlbFNsaWRlQ2xhc3MpIHtcbiAgdmFyICRjYXJvdXNlbHMgPSAkKGNhcm91c2VsQ2xhc3MpLFxuICAgICAgY2Fyb3VzZWxTbGlkZUNsYXNzID0gdHlwZW9mIGNhcm91c2VsU2xpZGVDbGFzcyAhPT0gJ3VuZGVmaW5lZCcgPyBjYXJvdXNlbFNsaWRlQ2xhc3MgOiAnLnNsaWRlJztcbiAgaWYgKCEkY2Fyb3VzZWxzLmxlbmd0aCkgcmV0dXJuO1xuICAkY2Fyb3VzZWxzLmVhY2goZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgdmFyICRjdXJyZW50Q2Fyb3VzZWwgPSAkKHRoaXMpLFxuICAgICAgICBjYXJvdXNlbElkID0gaW5kZXggKyAxLFxuICAgICAgICBzbGlkZUNvdW50ID0gJGN1cnJlbnRDYXJvdXNlbC5maW5kKGNhcm91c2VsU2xpZGVDbGFzcykubGVuZ3RoLFxuICAgICAgICBhdXRvUGxheVNwZWVkID0gdHlwZW9mICRjdXJyZW50Q2Fyb3VzZWwuYXR0cignZGF0YS1jYXJvdXNlbC1hdXRvcGxheScpICE9PSAndW5kZWZpbmVkJyA/ICRjdXJyZW50Q2Fyb3VzZWwuYXR0cignZGF0YS1jYXJvdXNlbC1hdXRvcGxheScpIDogZmFsc2UsXG4gICAgICAgIHNob3dEb3RzID0gJGN1cnJlbnRDYXJvdXNlbC5hdHRyKCdkYXRhLWNhcm91c2VsLWRvdHMnKSA9PT0gJ2ZhbHNlJyA/IGZhbHNlIDogdHJ1ZSxcbiAgICAgICAgc2hvd0Fycm93cyA9ICRjdXJyZW50Q2Fyb3VzZWwuYXR0cignZGF0YS1jYXJvdXNlbC1hcnJvd3MnKSA9PT0gJ2ZhbHNlJyA/IGZhbHNlIDogdHJ1ZSxcbiAgICAgICAgZHJhZ2dhYmxlID0gJGN1cnJlbnRDYXJvdXNlbC5hdHRyKCdkYXRhLWNhcm91c2VsLWRyYWdnYWJsZScpID09PSAnZmFsc2UnID8gZmFsc2UgOiB0cnVlLFxuICAgICAgICBhZGFwdGl2ZUhlaWdodCA9ICRjdXJyZW50Q2Fyb3VzZWwuYXR0cignZGF0YS1hZGFwdGl2ZS1oZWlnaHQnKSA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlLFxuICAgICAgICAkYXJpYUxpdmUgPSAkY3VycmVudENhcm91c2VsLmZpbmQoJy5qcy1hcmlhLWxpdmUnKTtcblxuICAgIGlmICh0eXBlb2YgJGN1cnJlbnRDYXJvdXNlbC5hdHRyKCdkYXRhLWNhcm91c2VsLXRpdGxlJykgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB2YXIgZmFsbGJhY2tUaXRsZSA9ICRjdXJyZW50Q2Fyb3VzZWwuYWRkKCRjdXJyZW50Q2Fyb3VzZWwuY2xvc2VzdCgnLndpZGdldCcpKS5maW5kKCdoMSwgaDIsIC53aWRnZXRfX2hlYWRpbmcnKS5maXJzdCgpLnRleHQoKS50cmltKCk7XG4gICAgICB2YXIgY2Fyb3VzZWxOYW1lID0gdHlwZW9mIGZhbGxiYWNrVGl0bGUgPT09ICd1bmRlZmluZWQnID8gJ1NsaWRlc2hvdyAnICsgY2Fyb3VzZWxJZCA6IGZhbGxiYWNrVGl0bGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBjYXJvdXNlbE5hbWUgPSAkY3VycmVudENhcm91c2VsLmF0dHIoJ2RhdGEtY2Fyb3VzZWwtdGl0bGUnKTtcbiAgICB9XG5cbiAgICBpZiAoc2xpZGVDb3VudCA8IDIpIHJldHVybjtcbiAgICAkYXJpYUxpdmUgPSBjYXJvdXNlbEFyaWFMaXZlKGZhbHNlLCAkYXJpYUxpdmUsIGNhcm91c2VsTmFtZSwgY2Fyb3VzZWxJZCwgJGN1cnJlbnRDYXJvdXNlbCwgc2xpZGVDb3VudCk7XG4gICAgJGN1cnJlbnRDYXJvdXNlbC5vbigncmVhZHkuZmxpY2tpdHknLCBmdW5jdGlvbiAoKSB7XG4gICAgICB3cmFwRmxpY2tpdHlQYWdlRG90cygkY3VycmVudENhcm91c2VsLCBzaG93RG90cywgY2Fyb3VzZWxOYW1lKTtcbiAgICAgIHdyYXBGbGlja2l0eVByZXZOZXh0QnV0dG9ucygkY3VycmVudENhcm91c2VsLCBzaG93QXJyb3dzKTtcbiAgICAgIGNhcm91c2VsVGFiYmluZ0NvbnRyb2woJGN1cnJlbnRDYXJvdXNlbCwgMCwgY2Fyb3VzZWxTbGlkZUNsYXNzKTtcbiAgICAgICRjdXJyZW50Q2Fyb3VzZWwuYWRkQ2xhc3MoJ3JlYWR5Jyk7XG4gICAgfSk7XG4gICAgJGN1cnJlbnRDYXJvdXNlbC5vbignc2VsZWN0LmZsaWNraXR5JywgZnVuY3Rpb24gKGV2ZW50LCBpbmRleCkge1xuICAgICAgY2Fyb3VzZWxUYWJiaW5nQ29udHJvbCgkY3VycmVudENhcm91c2VsLCBpbmRleCwgY2Fyb3VzZWxTbGlkZUNsYXNzKTtcbiAgICAgICRhcmlhTGl2ZSA9IGNhcm91c2VsQXJpYUxpdmUodHJ1ZSwgJGFyaWFMaXZlLCBjYXJvdXNlbE5hbWUsIGNhcm91c2VsSWQsICRjdXJyZW50Q2Fyb3VzZWwsIHNsaWRlQ291bnQsIGZsa3R5U3RhbmRhcmQpOyAvLyB0aGUgYmVsb3cgY29kZSBhZGRzIGFyaWEgaGlkZGVuIHRvIHRoZSBpbWFnZXMgb24gaGlkZGVuIHNsaWRlcywgYXMgdGhlc2Ugd2VyZSBjYXVzaW5nIGlzc3VlcyB3aXRoIHRoZSBzY3JlZW5yZWFkZXIgd2hlbiBzd2l0Y2hpbmcgc2xpZGVzIGFuZCBiYWNrIHRhYmJpbmdcblxuICAgICAgJGN1cnJlbnRDYXJvdXNlbC5maW5kKCcuc2xpZGUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICR0aGlzID0gJCh0aGlzKTtcblxuICAgICAgICBpZiAoJHRoaXMuYXR0cignYXJpYS1oaWRkZW4nKSA9PSAndHJ1ZScpIHtcbiAgICAgICAgICAkdGhpcy5maW5kKCdpbWcsIC5oZXJvX19jb250ZW50JykuYXR0cignYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICR0aGlzLmZpbmQoJ2ltZywgLmhlcm9fX2NvbnRlbnQnKS5hdHRyKCdhcmlhLWhpZGRlbicsICdmYWxzZScpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICAkY3VycmVudENhcm91c2VsLmZsaWNraXR5KHtcbiAgICAgIGFjY2Vzc2liaWxpdHk6IGZhbHNlLFxuICAgICAgYXV0b1BsYXk6IGF1dG9QbGF5U3BlZWQsXG4gICAgICBjZWxsU2VsZWN0b3I6IGNhcm91c2VsU2xpZGVDbGFzcyxcbiAgICAgIGRyYWdnYWJsZTogZHJhZ2dhYmxlLFxuICAgICAgaW1hZ2VzTG9hZGVkOiB0cnVlLFxuICAgICAgYWRhcHRpdmVIZWlnaHQ6IGFkYXB0aXZlSGVpZ2h0LFxuICAgICAgcGFnZURvdHM6IHNob3dEb3RzLFxuICAgICAgcHJldk5leHRCdXR0b25zOiBzaG93QXJyb3dzLFxuICAgICAgd3JhcEFyb3VuZDogdHJ1ZSxcbiAgICAgIHNlbGVjdGVkQXR0cmFjdGlvbjogLjAyXG4gICAgfSk7XG4gICAgdmFyIGZsa3R5U3RhbmRhcmQgPSAkY3VycmVudENhcm91c2VsLmRhdGEoJ2ZsaWNraXR5JyksXG4gICAgICAgICRmbGlja2l0eVNsaWRlciA9ICRjdXJyZW50Q2Fyb3VzZWwuZmluZCgnLmZsaWNraXR5LXNsaWRlcicpLFxuICAgICAgICAkc2xpZGVMaW5rcyA9ICRjdXJyZW50Q2Fyb3VzZWwuZmluZCgnYSwgaWZyYW1lJyk7XG4gICAgZmxpY2tpdHlQYWdpbmF0aW9uVGV4dCgkY3VycmVudENhcm91c2VsLCBjYXJvdXNlbE5hbWUpO1xuICB9KTtcbn1cblxuOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIFJlc3BvbnNpdmUgdGFibGVzXG4gKlxuICogQXBwbHkgcmVzcG9uc2l2ZSBjbGFzcyBpZiB0aGUgdGFibGUgaXMgbGFyZ2VyIHRoYW4gdGhlIGNvbnRhaW5lclxuICogQ29weSB0YWJsZSBoZWFkaW5ncyBpbnRvIGVhY2ggZGF0YSBjZWxsLCB3cmFwIHRhYmxlIGluIGEgY29udGFpbmVyXG4gKi9cbnZhciByZXNwb25zaXZlVGFibGVzID0gZnVuY3Rpb24gKCkge1xuICAvKipcbiAgICogUmVzcG9uc2l2ZSBjaGVja1xuICAgKlxuICAgKiBBcHBseSByZXNwb25zaXZlIGNsYXNzIGlmIHRoZSB0YWJsZSBpcyBsYXJnZXIgdGhhbiB0aGUgY29udGFpbmVyXG4gICAqL1xuICB2YXIgcmVzcG9uc2l2ZUNoZWNrID0gZGVib3VuY2UoZnVuY3Rpb24gKCkge1xuICAgICRzaXRlTWFpbi5maW5kKCd0YWJsZTpub3QoLmNhbGVuZGFyX190YWJsZSk6bm90KC5mb3JtX19tYXRyaXgpJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xuICAgICAgdmFyICR0YWJsZVdyYXBwZXIgPSAkdGhpcy5jbG9zZXN0KCcudGFibGUtd3JhcHBlcicpO1xuICAgICAgJHRhYmxlV3JhcHBlci5yZW1vdmVDbGFzcygncmVzcG9uc2l2ZScpO1xuXG4gICAgICBpZiAoJHRoaXMub3V0ZXJXaWR0aCgpID4gJHRhYmxlV3JhcHBlci5vdXRlcldpZHRoKCkpIHtcbiAgICAgICAgJHRhYmxlV3JhcHBlci5hZGRDbGFzcygncmVzcG9uc2l2ZScpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LCAyNTApO1xuICAvKipcbiAgICogQW1lbmQgdGFibGUgbWFya3VwXG4gICAqXG4gICAqIENvcHkgdGFibGUgaGVhZGluZ3MgaW50byBlYWNoIGRhdGEgY2VsbCwgd3JhcCB0YWJsZSBpbiBhIGNvbnRhaW5lclxuICAgKi9cblxuICB2YXIgdGFibGVNYXJrVXAgPSBmdW5jdGlvbiB0YWJsZU1hcmtVcCgpIHtcbiAgICAkc2l0ZU1haW4uZmluZCgndGFibGU6bm90KC5jYWxlbmRhcl9fdGFibGUpOm5vdCguZm9ybV9fbWF0cml4KScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICR0YWJsZSA9ICQodGhpcyk7XG4gICAgICAkdGFibGUuZmluZCgndGhlYWQgdGgsIHRoZWFkIHRkJykuZWFjaChmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgdmFyICR0aCA9ICQodGhpcykuaHRtbCgpLnRyaW0oKTtcbiAgICAgICAgdmFyICRjb3VudCA9IGluZGV4ICsgMTtcbiAgICAgICAgaWYgKCEkdGgubGVuZ3RoIHx8ICR0aCA9PSAnJm5ic3A7JykgcmV0dXJuO1xuICAgICAgICAkdGFibGUuZmluZCgndGJvZHkgdGQ6bnRoLWNoaWxkKCcgKyAkY291bnQgKyAnKScpLnByZXBlbmQoJzxzcGFuIGNsYXNzPVwibW9iaWxlLXRoXCI+JyArICR0aCArICc8c3BhbiBjbGFzcz1cIm1vYmlsZS10aF9fc2VwZXJhdG9yXCI+Ojwvc3Bhbj4gPC9zcGFuPicpO1xuICAgICAgfSk7XG4gICAgICAkdGFibGUud3JhcCgnPGRpdiBjbGFzcz1cInRhYmxlLXdyYXBwZXJcIj48L2Rpdj4nKTtcbiAgICB9KTtcbiAgfTtcbiAgLyoqXG4gICAqIEV4cG9zZXMgdGhlIG1ldGhvZHNcbiAgICovXG5cblxuICByZXR1cm4ge1xuICAgIGNoZWNrOiByZXNwb25zaXZlQ2hlY2ssXG4gICAgYW1lbmRNYXJrVXA6IHRhYmxlTWFya1VwXG4gIH07XG59KCk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vICBJc290b3BlIGxheW91dCB1c2luZyBkYXRhIGF0dHJpYnV0ZVxuLy8gIGh0dHBzOi8vaXNvdG9wZS5tZXRhZml6enkuY28vXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4oZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgJCgnW2RhdGEtZW5hYmxlLW1hc29ucnldJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgdmFyICR0aGlzID0gJCh0aGlzKSxcbiAgICAgICAgJGlzb3RvcGVUYXJnZXQgPSAkdGhpcy5hdHRyKCdkYXRhLWVuYWJsZS1tYXNvbnJ5Jyk7XG4gICAgJHRoaXMuaXNvdG9wZSh7XG4gICAgICBpdGVtU2VsZWN0b3I6ICRpc290b3BlVGFyZ2V0LFxuICAgICAgbGF5b3V0TW9kZTogJ21hc29ucnknXG4gICAgfSk7XG5cbiAgICBpZiAoaW1hZ2VzTG9hZGVkKSB7XG4gICAgICAkdGhpcy5pbWFnZXNMb2FkZWQoKS5wcm9ncmVzcyhmdW5jdGlvbiAoKSB7XG4gICAgICAgICR0aGlzLmlzb3RvcGUoJ2xheW91dCcpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbn0pKCk7IiwiJ3VzZSBzdHJpY3QnO1xuXG4oZnVuY3Rpb24gKCQpIHtcbiAgem9vbUltYWdlKCk7XG4gIHZhciAkcmVsbGF4O1xuICB2YXIgJHJlbGxheFByZXNlbnQ7IC8vIE9uIGRvY3VtZW50IHJlYWR5Li4uXG5cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgZnVuY3Rpb24gKCkge1xuICAgIGluaXRBMTF5VG9nZ2xlKCk7XG4gICAgbmF2aWdhdGlvbi50b2dnbGUobWVudSk7XG4gICAgbmF2aWdhdGlvbi50b2dnbGUocGFnZXNJbik7XG5cbiAgICBpZiAoc2VhcmNoLnRvZ2dsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBzZWFyY2gudG9nZ2xlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBuYXZpZ2F0aW9uLnNlYXJjaFRvZ2dsZSgpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdG9nZ2xlTW9iaWxlU3dhcChwYWdlc0luLm5hdmlnYXRpb24sIHBhZ2VzSW4udG9nZ2xlLCBicmVha3BvaW50cy50YWJsZXQpO1xuICAgIHJlc3BvbnNpdmVUYWJsZXMuYW1lbmRNYXJrVXAoKTtcbiAgICByZXNwb25zaXZlVGFibGVzLmNoZWNrKCk7IC8vIHRlbXBvcmFyeSBzY3JvbGxlciBmb3IgbWF0cml4IHRhYmxlXG5cbiAgICAkKCcuZm9ybV9fbWF0cml4JykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgdGFibGUgPSAkKHRoaXMpO1xuICAgICAgJCh0aGlzKS53cmFwKCc8ZGl2IGNsYXNzPVwidGFibGUtd3JhcHBlci1tYXRyaXhcIj48L2Rpdj4nKS53cmFwKCc8ZGl2IGNsYXNzPVwic2Nyb2xsZXJcIj48L2Rpdj4nKTtcblxuICAgICAgaWYgKHRhYmxlLm91dGVyV2lkdGgoKSA+IHRhYmxlLnBhcmVudCgpLnBhcmVudCgpLm91dGVyV2lkdGgoKSkge1xuICAgICAgICB0YWJsZS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcygnaGFzLXNjcm9sbCcpO1xuICAgICAgfVxuXG4gICAgICAkKHdpbmRvdykub24oJ3Jlc2l6ZSBvcmllbnRhdGlvbmNoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRhYmxlLm91dGVyV2lkdGgoKSA+IHRhYmxlLnBhcmVudCgpLnBhcmVudCgpLm91dGVyV2lkdGgoKSkge1xuICAgICAgICAgIHRhYmxlLnBhcmVudCgpLnBhcmVudCgpLmFkZENsYXNzKCdoYXMtc2Nyb2xsJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGFibGUucGFyZW50KCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2hhcy1zY3JvbGwnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7IC8vICBSZS1mb2N1cyB0byB0aGUgbGFzdCBsaW5rIGluIHRoZSBtZW51IG9uIGJhY2stdGFiXG4gICAgLy8gIENsb3NlIG1lbnUgd2hlbiBlc2Mga2V5IGlzIHByZXNzZWRcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgdmFyICRuYXZpZ2F0aW9uID0gJChtZW51Lm5hdmlnYXRpb24pO1xuICAgIHZhciAkbWVudUNsb3NlID0gJChtZW51LnRvZ2dsZSk7XG4gICAgdmFyICRuYXZpZ2F0aW9uTGlua3MgPSAkbmF2aWdhdGlvbi5maW5kKCdhJyk7XG4gICAgdmFyICRuYXZpZ2F0aW9uTGFzdExpbmsgPSAkbmF2aWdhdGlvbkxpbmtzLmxhc3QoKTtcbiAgICB2YXIgJHNlYXJjaENsb3NlID0gJChzZWFyY2gudG9nZ2xlKTtcbiAgICB2YXIgJHNlYXJjaE5hdiA9ICQoc2VhcmNoLm5hdmlnYXRpb24pO1xuICAgIHZhciAkc2VhcmNoQnRuID0gJHNlYXJjaE5hdi5maW5kKCcuZm9ybV9fYXBwZW5kLWdyb3VwIC5idXR0b24nKTtcbiAgICB2YXIgJHNlYXJjaElucHV0ID0gJHNlYXJjaE5hdi5maW5kKCcuZm9ybV9fYXBwZW5kLWdyb3VwIC5mb3JtX19maWVsZCcpO1xuICAgICRib2R5Lm9uKCdrZXlkb3duJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICBpZiAoJG1lbnVDbG9zZS5hdHRyKCdhcmlhLWV4cGFuZGVkJykgPT0gJ3RydWUnKSB7XG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSA5ICYmICRtZW51Q2xvc2UuaXMoJzpmb2N1cycpKSB7XG4gICAgICAgICAgaWYgKGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJG5hdmlnYXRpb25MYXN0TGluay5mb2N1cygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAyNykge1xuICAgICAgICAgICRtZW51Q2xvc2UuYXR0cignYXJpYS1leHBhbmRlZCcsICdmYWxzZScpO1xuICAgICAgICAgICRuYXZpZ2F0aW9uLmF0dHIoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcbiAgICAgICAgICAkbWVudUNsb3NlLmZvY3VzKCk7XG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkbmF2aWdhdGlvbi5yZW1vdmVDbGFzcygnaXMtb3BlbicpO1xuICAgICAgICAgIH0sIDIwMCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCRzZWFyY2hDbG9zZS5hdHRyKCdhcmlhLWV4cGFuZGVkJykgPT0gJ3RydWUnKSB7XG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSA5ICYmICRzZWFyY2hDbG9zZS5pcygnOmZvY3VzJykpIHtcbiAgICAgICAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkc2VhcmNoQnRuLmZvY3VzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDkgJiYgJHNlYXJjaElucHV0LmlzKCc6Zm9jdXMnKSkge1xuICAgICAgICAgIGlmIChldmVudC5zaGlmdEtleSkge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICRzZWFyY2hDbG9zZS5mb2N1cygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAyNykge1xuICAgICAgICAgICRzZWFyY2hOYXYucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgICAgICAgICRzZWFyY2hOYXYuYXR0cignYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgICAgICAgICRzZWFyY2hDbG9zZS5hdHRyKCdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJyk7XG4gICAgICAgICAgJGJvZHkuY3NzKCd0cmFuc2Zvcm0nLCAnJyk7XG4gICAgICAgICAgJHNlYXJjaENsb3NlLmZvY3VzKCk7XG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2VhcmNoTmF2LnJlbW92ZUNsYXNzKCdpcy1vcGVuJyk7XG4gICAgICAgICAgICAkYm9keS5yZW1vdmVDbGFzcygnc2VhcmNoLWlzLW9wZW4nKTtcbiAgICAgICAgICB9LCAyMDApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7IC8vIHN3YXAgb2JqZWN0LWZpdCBmb3IgYmFja2dyb3VuZCBpbWFnZSBpZiBub3Qgc3VwcG9ydGVkXG5cbiAgICBpZiAoIU1vZGVybml6ci5vYmplY3RmaXQpIHtcbiAgICAgICQoJy5saXN0aW5nX19pbWFnZS1jb250YWluZXIsIC5oZXJvX19pbWFnZS1jb250YWluZXIsIC5iYW5uZXJfX2ltYWdlLWNvbnRhaW5lcicpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJGNvbnRhaW5lciA9ICQodGhpcyksXG4gICAgICAgICAgICBpbWdVcmwgPSAkY29udGFpbmVyLmZpbmQoJ2ltZycpLnByb3AoJ3NyYycpO1xuXG4gICAgICAgIGlmIChpbWdVcmwpIHtcbiAgICAgICAgICAkY29udGFpbmVyLmNzcygnYmFja2dyb3VuZEltYWdlJywgJ3VybCgnICsgaW1nVXJsICsgJyknKS5hZGRDbGFzcygnY29tcGF0LW9iamVjdC1maXQnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTsgLy8gT24gd2luZG93IGxvYWQuLi5cblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICBjYXJvdXNlbEluaXQoJy5qcy1jYXJvdXNlbCcpO1xuICAgIHNraXBNYXBzKCk7XG5cbiAgICBpZiAoJCgnLnJlbGxheCcpLmxlbmd0aCkge1xuICAgICAgJHJlbGxheFByZXNlbnQgPSB0cnVlO1xuICAgICAgJHJlbGxheCA9IG5ldyBSZWxsYXgoJy5yZWxsYXgnLCB7XG4gICAgICAgIGJyZWFrcG9pbnRzOiBbYnJlYWtwb2ludHMubW9iaWxlLCBicmVha3BvaW50cy50YWJsZXQsIGJyZWFrcG9pbnRzLmRlc2t0b3BdXG4gICAgICB9KTtcbiAgICB9XG4gIH0pOyAvLyBPbiB3aW5kb3cgcmVzaXplLi4uXG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGZ1bmN0aW9uICgpIHtcbiAgICB0b2dnbGVNb2JpbGVTd2FwKHBhZ2VzSW4ubmF2aWdhdGlvbiwgcGFnZXNJbi50b2dnbGUsIGJyZWFrcG9pbnRzLnRhYmxldCwgdHJ1ZSk7XG4gICAgcmVzcG9uc2l2ZVRhYmxlcy5jaGVjaygpO1xuICB9KTtcblxuICBmdW5jdGlvbiBhbHRlck1lbnUoKSB7XG4gICAgaWYgKCRib2R5Lmhhc0NsYXNzKCdtZW51LWlzLW9wZW4nKSAmJiB2ZXJnZS52aWV3cG9ydFcoKSA+PSBicmVha3BvaW50cy50YWJsZXQpIHtcbiAgICAgICQobWVudS50b2dnbGUpLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCAnZmFsc2UnKTtcbiAgICAgICQobWVudS5uYXZpZ2F0aW9uKS5hdHRyKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgICBzY3JvbGxMb2NrKGZhbHNlKTtcbiAgICAgIHRvZ2dsZUJvZHlDbGFzcygnbWVudS1pcy1vcGVuJywgJ3JlbW92ZScpO1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQobWVudS5uYXZpZ2F0aW9uKS5yZW1vdmVDbGFzcygnaXMtb3BlbicpO1xuICAgICAgfSwgMjAwKTtcbiAgICB9XG5cbiAgICBpZiAoJGJvZHkuaGFzQ2xhc3MoJ21lbnUtaXMtb3BlbicpICYmIHZlcmdlLnZpZXdwb3J0VygpIDw9IGJyZWFrcG9pbnRzLnRhYmxldCkge1xuICAgICAgJG1lbnVOYXYuY3NzKCdoZWlnaHQnLCAkd2luZG93LmhlaWdodCgpIC0gJHNpdGVIZWFkZXIuaGVpZ2h0KCkpO1xuICAgICAgJGJvZHkuY3NzKCdoZWlnaHQnLCAkd2luZG93LmhlaWdodCgpKTtcbiAgICB9XG4gIH1cblxuICAkd2luZG93Lm9uKCdyZXNpemUgb3JpZW50YXRpb25jaGFuZ2UnLCBkZWJvdW5jZShhbHRlck1lbnUsIDUwKSk7XG5cbiAgZnVuY3Rpb24gcmVmcmVzaFJlbGxheCgpIHtcbiAgICBpZiAoJHJlbGxheFByZXNlbnQgPT0gdHJ1ZSkge1xuICAgICAgJHJlbGxheC5yZWZyZXNoKCk7XG4gICAgfVxuICB9XG5cbiAgJHdpbmRvdy5vbigncmVzaXplIG9yaWVudGF0aW9uY2hhbmdlJywgZGVib3VuY2UocmVmcmVzaFJlbGxheCwgMjUwKSk7XG4gIC8qKlxuICAgKiBPbiBvcmllbnRhdGlvbiBjaGFuZ2VcbiAgICovXG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ29yaWVudGF0aW9uY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgIHJlc3BvbnNpdmVUYWJsZXMuY2hlY2soKTtcbiAgfSk7XG59KShqUXVlcnkpOyJdfQ==
