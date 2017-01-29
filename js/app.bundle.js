(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Croppie = require('croppie');
var Watermark = require('watermarkjs');

(function(){
    'use strict';

    var PicFrame = PicFrame || {};

    // Globals
    PicFrame.User = {};
    PicFrame.Croppie = null;
    PicFrame.Watermark = null;

    PicFrame.NavigateTo = function(selector)
    {
        var selectedPage = document.querySelector(selector);
        var currentPage = document.querySelector('.app-page__active');

        // toggle active page
        currentPage.classList.remove('app-page__active');
        selectedPage.classList.add('app-page__active');

        return selectedPage;
    };

    PicFrame.AuthService = function(onLoggedCallback)
    {
        var loginButton = document.querySelector('[data-login-action]');
        var logoutButton = document.querySelector('[data-logout-action]');

        if(loginButton) {
            loginButton.addEventListener('click', function(e){
                e.preventDefault();

                FB.login(function(response){
                    FB.api('/me', { fields: 'name,email'}, function(response){
                        PicFrame.User = {
                            'id' : response.id,
                            'name' : response.name,
                            'email' : response.email,
                            'image' : 'http://graph.facebook.com/' + response.id + '/picture?height=600&width=600',
                            'frame': null,
                            'result': null
                        };

                        onLoggedCallback(PicFrame.User);
                    });

                }, { scope: 'email,publish_actions,user_photos'});
            });
        }

        if(logoutButton) {
            logoutButton.addEventListener('click', function(e){
                e.preventDefault();

                FB.getLoginstatus(function(response){
                    if(response.status === 'connected')
                        FB.logout(function(response){
                            location.reload(true);
                        });
                });
            });
        }
    };

    PicFrame.ShareService = function()
    {
        var shareButton = document.querySelector('[app-result-share]');

        // exit if share button doest exists
        if(!shareButton) return;

        shareButton.addEventListener('click', function(e) {
            e.preventDefault();

            PicFrame.Watermark.blob(Watermark.image.atPos(function(){ return 0; }, function(){ return 0; }, 1)).then(function(blob){
                FB.login(function(response){

                    var form = new FormData();
                    form.append("access_token", response.authResponse.accessToken);
                    form.append("source", blob);
                    form.append("message", "Hello World");

                    var xhr = new XMLHttpRequest();
                    xhr.open('POST', 'https://graph.facebook.com/me/photos', true);
                    xhr.onload = xhr.onerror = function(){
                        console.log(xhr.responseText);
                    };
                    xhr.send( form );

                }, { scope: 'publish_actions,user_photos' });

            });
        });
    };

    PicFrame.ImageService = function(onUploadedFile)
    {
        var uploadButton = document.querySelectorAll('[app-upload-action]');

        // exit if upload button doest exists
        if(!uploadButton) return;

        // check browser support
        if(!window.FileReader){
            uploadButton.style.display = 'none';
            return alert('Seu navegador não é compatível com esse serviço.');
        }

        // check file type
        var isSupportedFileType = function(file)
        {
            var allowedExtensions = ['jpeg', 'jpg', 'png'];
        	var fileExtension = file.files[0].name.split('.').pop().toLowerCase();

        	if(allowedExtensions.indexOf(fileExtension) > -1)
        		return true;

        	alert('O arquivo carregado não é uma imagem suportada.');

        	return false;
        };

        // create dynamic (hidden) input file
        var inputFile = document.createElement('input');
        inputFile.type = "file";

        // listen change event on input
        inputFile.addEventListener('change', function(e){
            if(!isSupportedFileType(this)) return;

            // Load uploaded file
            if(this.files && this.files[0]) {
                var reader = new FileReader();

                reader.onload = function(e) {
                    PicFrame.User.image = e.target.result;

                    // Render file on Croppie
                    PicFrame.Croppie.bind({ url: PicFrame.User.image })
                };

                reader.readAsDataURL(this.files[0]);

                onUploadedFile(this);
            }
        });

        // listen click event on button
        uploadButton.forEach(function(button, index){
            button.addEventListener('click', function(e){
                e.preventDefault();

                // dispatch click event on input
                inputFile.click();
            });
        });
    };

    PicFrame.MainAction = function()
    {
        // load all pages
        var pages = document.querySelectorAll('[data-page]');

        Array.prototype.slice.call(pages).forEach(function(page, index) {
            page.classList.add('app-page');
            // set main page
            if(index === 0) page.classList.add('app-page__active');
        });

        // Enable services
        PicFrame.ShareService();

        PicFrame.ImageService(function(uploadedFile){
            PicFrame.FrameAction();
        });

        PicFrame.AuthService(function(loggedUser) {
            PicFrame.FrameAction();
        });
    };

    PicFrame.FrameAction = function()
    {
        // go to frame page
        PicFrame.NavigateTo('[data-page="frames"]');

        // initialize croppie & render profile image
        PicFrame.Croppie = (PicFrame.Croppie) ? PicFrame.Croppie : new Croppie(document.querySelector('.croppie'), {
            boundary : { width: 400, height: 400 },
            viewport : { width: 400, height: 400, type: 'square' },
            enableOrientation : true
        });

        if(PicFrame.User.image) {
            PicFrame.Croppie.bind({
                url: PicFrame.User.image
            });
        }

        // add loading gif
        var boundary = document.querySelector('.cr-boundary');
        boundary.classList.add('app-boundary-loading');

        // inject user name
        var title = document.querySelector('[app-username]');
        if(title) title.innerHTML = PicFrame.User.name;

        // enable frame choosing
        document.querySelectorAll('[data-frames-item]').forEach(function(frame, index){
            frame.addEventListener('click', function(e){
                e.preventDefault();

                PicFrame.User.frame = frame.getAttribute('data-frames-item');

                var viewport = document.querySelector('.cr-viewport');

                viewport.classList.add('app-viewport-frame');
                viewport.setAttribute('style', 'background-image: url(' + PicFrame.User.frame + ')');

                // enable result button
                var resultbutton = document.querySelector('[app-result-action]');
                resultbutton.style.display = 'block';
                resultbutton.addEventListener('click', function(e){
                    PicFrame.ResultAction();
                });
            });
        });
    };

    PicFrame.ResultAction = function()
    {
        // Get croppie result and...
        PicFrame.Croppie.result({ type: 'base64', size: { width: 600, height: 600 } }).then(function(result){

            // Merge image and frame
            PicFrame.Watermark = Watermark([result, PicFrame.User.frame], {
                init: function(img) {
                    img.crossOrigin = 'anonymous'
                }
            });

            // Generate merged image
            PicFrame.Watermark.dataUrl(Watermark.image.atPos(function(){ return 0; }, function(){ return 0; }, 1)).then(function(url){
                PicFrame.User.result = url;

                // Populate image preview
                var preview = document.querySelector('[app-result-preview]');
                preview.src = PicFrame.User.result;

                // Populate download link
                var download = document.querySelector('[app-result-download]');
                download.href = PicFrame.User.result;

                // go to result action
                PicFrame.NavigateTo('[data-page="result"]');
            });

        });
    };

    // ladies and gentlemen,
    // welcome to PicFrame.
    PicFrame.MainAction();
})();

},{"croppie":2,"watermarkjs":3}],2:[function(require,module,exports){
/*************************
 * Croppie
 * Copyright 2016
 * Foliotek
 * Version: 2.4.0
 *************************/
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports'], factory);
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        // CommonJS
        factory(exports);
    } else {
        // Browser globals
        factory((root.commonJsStrict = {}));
    }
}(this, function (exports) {

    /* Polyfills */
    if (typeof Promise !== 'function') {
        /*! promise-polyfill 3.1.0 */
        !function(a){function b(a,b){return function(){a.apply(b,arguments)}}function c(a){if("object"!=typeof this)throw new TypeError("Promises must be constructed via new");if("function"!=typeof a)throw new TypeError("not a function");this._state=null,this._value=null,this._deferreds=[],i(a,b(e,this),b(f,this))}function d(a){var b=this;return null===this._state?void this._deferreds.push(a):void k(function(){var c=b._state?a.onFulfilled:a.onRejected;if(null===c)return void(b._state?a.resolve:a.reject)(b._value);var d;try{d=c(b._value)}catch(e){return void a.reject(e)}a.resolve(d)})}function e(a){try{if(a===this)throw new TypeError("A promise cannot be resolved with itself.");if(a&&("object"==typeof a||"function"==typeof a)){var c=a.then;if("function"==typeof c)return void i(b(c,a),b(e,this),b(f,this))}this._state=!0,this._value=a,g.call(this)}catch(d){f.call(this,d)}}function f(a){this._state=!1,this._value=a,g.call(this)}function g(){for(var a=0,b=this._deferreds.length;b>a;a++)d.call(this,this._deferreds[a]);this._deferreds=null}function h(a,b,c,d){this.onFulfilled="function"==typeof a?a:null,this.onRejected="function"==typeof b?b:null,this.resolve=c,this.reject=d}function i(a,b,c){var d=!1;try{a(function(a){d||(d=!0,b(a))},function(a){d||(d=!0,c(a))})}catch(e){if(d)return;d=!0,c(e)}}var j=setTimeout,k="function"==typeof setImmediate&&setImmediate||function(a){j(a,1)},l=Array.isArray||function(a){return"[object Array]"===Object.prototype.toString.call(a)};c.prototype["catch"]=function(a){return this.then(null,a)},c.prototype.then=function(a,b){var e=this;return new c(function(c,f){d.call(e,new h(a,b,c,f))})},c.all=function(){var a=Array.prototype.slice.call(1===arguments.length&&l(arguments[0])?arguments[0]:arguments);return new c(function(b,c){function d(f,g){try{if(g&&("object"==typeof g||"function"==typeof g)){var h=g.then;if("function"==typeof h)return void h.call(g,function(a){d(f,a)},c)}a[f]=g,0===--e&&b(a)}catch(i){c(i)}}if(0===a.length)return b([]);for(var e=a.length,f=0;f<a.length;f++)d(f,a[f])})},c.resolve=function(a){return a&&"object"==typeof a&&a.constructor===c?a:new c(function(b){b(a)})},c.reject=function(a){return new c(function(b,c){c(a)})},c.race=function(a){return new c(function(b,c){for(var d=0,e=a.length;e>d;d++)a[d].then(b,c)})},c._setImmediateFn=function(a){k=a},"undefined"!=typeof module&&module.exports?module.exports=c:a.Promise||(a.Promise=c)}(this);
    }

    if ( typeof window.CustomEvent !== "function" ) {
        (function(){
            function CustomEvent ( event, params ) {
                params = params || { bubbles: false, cancelable: false, detail: undefined };
                var evt = document.createEvent( 'CustomEvent' );
                evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
                return evt;
            }
            CustomEvent.prototype = window.Event.prototype;
            window.CustomEvent = CustomEvent;
        }());
    }

    if (!HTMLCanvasElement.prototype.toBlob) {
        Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
            value: function (callback, type, quality) {
                var binStr = atob( this.toDataURL(type, quality).split(',')[1] ),
                len = binStr.length,
                arr = new Uint8Array(len);

                for (var i=0; i<len; i++ ) {
                    arr[i] = binStr.charCodeAt(i);
                }

                callback( new Blob( [arr], {type: type || 'image/png'} ) );
            }
        });
    }
    /* End Polyfills */

    var cssPrefixes = ['Webkit', 'Moz', 'ms'],
        emptyStyles = document.createElement('div').style,
        CSS_TRANS_ORG,
        CSS_TRANSFORM,
        CSS_USERSELECT;

    function vendorPrefix(prop) {
        if (prop in emptyStyles) {
            return prop;
        }

        var capProp = prop[0].toUpperCase() + prop.slice(1),
            i = cssPrefixes.length;

        while (i--) {
            prop = cssPrefixes[i] + capProp;
            if (prop in emptyStyles) {
                return prop;
            }
        }
    }

    CSS_TRANSFORM = vendorPrefix('transform');
    CSS_TRANS_ORG = vendorPrefix('transformOrigin');
    CSS_USERSELECT = vendorPrefix('userSelect');

    // Credits to : Andrew Dupont - http://andrewdupont.net/2009/08/28/deep-extending-objects-in-javascript/
    function deepExtend(destination, source) {
        destination = destination || {};
        for (var property in source) {
            if (source[property] && source[property].constructor && source[property].constructor === Object) {
                destination[property] = destination[property] || {};
                deepExtend(destination[property], source[property]);
            } else {
                destination[property] = source[property];
            }
        }
        return destination;
    }

    function debounce(func, wait, immediate) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    function dispatchChange(element) {
        if ("createEvent" in document) {
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent("change", false, true);
            element.dispatchEvent(evt);
        }
        else {
            element.fireEvent("onchange");
        }
    }

    //http://jsperf.com/vanilla-css
    function css(el, styles, val) {
        if (typeof (styles) === 'string') {
            var tmp = styles;
            styles = {};
            styles[tmp] = val;
        }

        for (var prop in styles) {
            el.style[prop] = styles[prop];
        }
    }

    function addClass(el, c) {
        if (el.classList) {
            el.classList.add(c);
        }
        else {
            el.className += ' ' + c;
        }
    }

    function removeClass(el, c) {
        if (el.classList) {
            el.classList.remove(c);
        }
        else {
            el.className = el.className.replace(c, '');
        }
    }

    function num(v) {
        return parseInt(v, 10);
    }

    /* Utilities */
    function loadImage(src, imageEl, useCanvas) {
        var img = imageEl || new Image(),
            prom;

        if (img.src === src) {
            // If image source hasn't changed, return a promise that resolves immediately
            prom = new Promise(function (resolve, reject) {
                resolve(img);
            });
        } else {
            prom = new Promise(function (resolve, reject) {
                if (useCanvas && src.substring(0,4).toLowerCase() === 'http') {
                    img.setAttribute('crossOrigin', 'anonymous');
                }
                img.onload = function () {
                    setTimeout(function () {
                        resolve(img);
                    }, 1);
                };
            });

            img.src = src;
        }

        img.style.opacity = 0;

        return prom;
    }

    /* CSS Transform Prototype */
    var _TRANSLATE = 'translate3d',
        _TRANSLATE_SUFFIX = ', 0px';
    var Transform = function (x, y, scale) {
        this.x = parseFloat(x);
        this.y = parseFloat(y);
        this.scale = parseFloat(scale);
    };

    Transform.parse = function (v) {
        if (v.style) {
            return Transform.parse(v.style[CSS_TRANSFORM]);
        }
        else if (v.indexOf('matrix') > -1 || v.indexOf('none') > -1) {
            return Transform.fromMatrix(v);
        }
        else {
            return Transform.fromString(v);
        }
    };

    Transform.fromMatrix = function (v) {
        var vals = v.substring(7).split(',');
        if (!vals.length || v === 'none') {
            vals = [1, 0, 0, 1, 0, 0];
        }

        return new Transform(num(vals[4]), num(vals[5]), parseFloat(vals[0]));
    };

    Transform.fromString = function (v) {
        var values = v.split(') '),
            translate = values[0].substring(_TRANSLATE.length + 1).split(','),
            scale = values.length > 1 ? values[1].substring(6) : 1,
            x = translate.length > 1 ? translate[0] : 0,
            y = translate.length > 1 ? translate[1] : 0;

        return new Transform(x, y, scale);
    };

    Transform.prototype.toString = function () {
        return _TRANSLATE + '(' + this.x + 'px, ' + this.y + 'px' + _TRANSLATE_SUFFIX + ') scale(' + this.scale + ')';
    };

    var TransformOrigin = function (el) {
        if (!el || !el.style[CSS_TRANS_ORG]) {
            this.x = 0;
            this.y = 0;
            return;
        }
        var css = el.style[CSS_TRANS_ORG].split(' ');
        this.x = parseFloat(css[0]);
        this.y = parseFloat(css[1]);
    };

    TransformOrigin.prototype.toString = function () {
        return this.x + 'px ' + this.y + 'px';
    };

    function getExifOrientation (img, cb) {
        if (!window.EXIF) {
            cb(0);
        }

        EXIF.getData(img, function () {
            var orientation = EXIF.getTag(this, 'Orientation');
            cb(orientation);
        });
    }

    function drawCanvas(canvas, img, orientation) {
        var width = img.width,
            height = img.height,
            ctx = canvas.getContext('2d');

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.save();
        switch (orientation) {
          case 2:
             ctx.translate(width, 0);
             ctx.scale(-1, 1);
             break;

          case 3:
              ctx.translate(width, height);
              ctx.rotate(180*Math.PI/180);
              break;

          case 4:
              ctx.translate(0, height);
              ctx.scale(1, -1);
              break;

          case 5:
              canvas.width = height;
              canvas.height = width;
              ctx.rotate(90*Math.PI/180);
              ctx.scale(1, -1);
              break;

          case 6:
              canvas.width = height;
              canvas.height = width;
              ctx.rotate(90*Math.PI/180);
              ctx.translate(0, -height);
              break;

          case 7:
              canvas.width = height;
              canvas.height = width;
              ctx.rotate(-90*Math.PI/180);
              ctx.translate(-width, height);
              ctx.scale(1, -1);
              break;

          case 8:
              canvas.width = height;
              canvas.height = width;
              ctx.translate(0, width);
              ctx.rotate(-90*Math.PI/180);
              break;
        }
        ctx.drawImage(img, 0,0, width, height);
        ctx.restore();
    }

    /* Private Methods */
    function _create() {
        var self = this,
            contClass = 'croppie-container',
            customViewportClass = self.options.viewport.type ? 'cr-vp-' + self.options.viewport.type : null,
            boundary, img, viewport, overlay, canvas, bw, bh;

        self.options.useCanvas = self.options.enableOrientation || _hasExif.call(self);
        // Properties on class
        self.data = {};
        self.elements = {};

        // Generating Markup
        boundary = self.elements.boundary = document.createElement('div');
        viewport = self.elements.viewport = document.createElement('div');
        img = self.elements.img = document.createElement('img');
        overlay = self.elements.overlay = document.createElement('div');

        if (self.options.useCanvas) {
            self.elements.canvas = document.createElement('canvas');
            self.elements.preview = self.elements.canvas;
        }
        else {
            self.elements.preview = self.elements.img;
        }

        addClass(boundary, 'cr-boundary');
        bw = self.options.boundary.width;
        bh = self.options.boundary.height;
        css(boundary, {
            width: (bw + (isNaN(bw) ? '' : 'px')),
            height: (bh + (isNaN(bh) ? '' : 'px'))
        });

        addClass(viewport, 'cr-viewport');
        if (customViewportClass) {
            addClass(viewport, customViewportClass);
        }
        css(viewport, {
            width: self.options.viewport.width + 'px',
            height: self.options.viewport.height + 'px'
        });
        viewport.setAttribute('tabindex', 0);

        addClass(self.elements.preview, 'cr-image');
        addClass(overlay, 'cr-overlay');

        self.element.appendChild(boundary);
        boundary.appendChild(self.elements.preview);
        boundary.appendChild(viewport);
        boundary.appendChild(overlay);

        addClass(self.element, contClass);
        if (self.options.customClass) {
            addClass(self.element, self.options.customClass);
        }

        // Initialize drag & zoom
        _initDraggable.call(this);

        if (self.options.enableZoom) {
            _initializeZoom.call(self);
        }

        // if (self.options.enableOrientation) {
        //     _initRotationControls.call(self);
        // }
    }

    function _initRotationControls () {
        // TODO - Not a fan of these controls
        return;
        var self = this,
            wrap, btnLeft, btnRight, iLeft, iRight;

        wrap = document.createElement('div');
        self.elements.orientationBtnLeft = btnLeft = document.createElement('button');
        self.elements.orientationBtnRight = btnRight = document.createElement('button');

        wrap.appendChild(btnLeft);
        wrap.appendChild(btnRight);

        iLeft = document.createElement('i');
        iRight = document.createElement('i');
        btnLeft.appendChild(iLeft);
        btnRight.appendChild(iRight);

        addClass(wrap, 'cr-rotate-controls');
        addClass(btnLeft, 'cr-rotate-l');
        addClass(btnRight, 'cr-rotate-r');

        self.elements.boundary.appendChild(wrap);

        btnLeft.addEventListener('click', function () {
            self.rotate(-90);
        });
        btnRight.addEventListener('click', function () {
            self.rotate(90);
        });
    }

    function _hasExif() {
        // todo - remove options.exif after deprecation
        return this.options.enableExif && window.EXIF;
    }

    function _setZoomerVal(v) {
        if (this.options.enableZoom) {
            var z = this.elements.zoomer,
                val = fix(v, 4);

            z.value = Math.max(z.min, Math.min(z.max, val));
        }
    }

    function _initializeZoom() {
        var self = this,
            wrap = self.elements.zoomerWrap = document.createElement('div'),
            zoomer = self.elements.zoomer = document.createElement('input');

        addClass(wrap, 'cr-slider-wrap');
        addClass(zoomer, 'cr-slider');
        zoomer.type = 'range';
        zoomer.step = '0.0001';
        zoomer.value = 1;
        zoomer.style.display = self.options.showZoomer ? '' : 'none';

        self.element.appendChild(wrap);
        wrap.appendChild(zoomer);

        self._currentZoom = 1;

        function change() {
            _onZoom.call(self, {
                value: parseFloat(zoomer.value),
                origin: new TransformOrigin(self.elements.preview),
                viewportRect: self.elements.viewport.getBoundingClientRect(),
                transform: Transform.parse(self.elements.preview)
            });
        }

        function scroll(ev) {
            var delta, targetZoom;

            if (ev.wheelDelta) {
                delta = ev.wheelDelta / 1200; //wheelDelta min: -120 max: 120 // max x 10 x 2
            } else if (ev.deltaY) {
                delta = ev.deltaY / 1060; //deltaY min: -53 max: 53 // max x 10 x 2
            } else if (ev.detail) {
                delta = ev.detail / -60; //delta min: -3 max: 3 // max x 10 x 2
            } else {
                delta = 0;
            }

            targetZoom = self._currentZoom + (delta * self._currentZoom);

            ev.preventDefault();
            _setZoomerVal.call(self, targetZoom);
            change.call(self);
        }

        self.elements.zoomer.addEventListener('input', change);// this is being fired twice on keypress
        self.elements.zoomer.addEventListener('change', change);

        if (self.options.mouseWheelZoom) {
            self.elements.boundary.addEventListener('mousewheel', scroll);
            self.elements.boundary.addEventListener('DOMMouseScroll', scroll);
        }
    }

    function _onZoom(ui) {
        var self = this,
            transform = ui ? ui.transform : Transform.parse(self.elements.preview),
            vpRect = ui ? ui.viewportRect : self.elements.viewport.getBoundingClientRect(),
            origin = ui ? ui.origin : new TransformOrigin(self.elements.preview),
            transCss = {};

        function applyCss() {
            var transCss = {};
            transCss[CSS_TRANSFORM] = transform.toString();
            transCss[CSS_TRANS_ORG] = origin.toString();
            css(self.elements.preview, transCss);
        }

        self._currentZoom = ui ? ui.value : self._currentZoom;
        transform.scale = self._currentZoom;
        applyCss();


        if (self.options.enforceBoundary) {
            var boundaries = _getVirtualBoundaries.call(self, vpRect),
                transBoundaries = boundaries.translate,
                oBoundaries = boundaries.origin;

            if (transform.x >= transBoundaries.maxX) {
                origin.x = oBoundaries.minX;
                transform.x = transBoundaries.maxX;
            }

            if (transform.x <= transBoundaries.minX) {
                origin.x = oBoundaries.maxX;
                transform.x = transBoundaries.minX;
            }

            if (transform.y >= transBoundaries.maxY) {
                origin.y = oBoundaries.minY;
                transform.y = transBoundaries.maxY;
            }

            if (transform.y <= transBoundaries.minY) {
                origin.y = oBoundaries.maxY;
                transform.y = transBoundaries.minY;
            }
        }
        applyCss();
        _debouncedOverlay.call(self);
        _triggerUpdate.call(self);
    }

    function _getVirtualBoundaries(viewport) {
        var self = this,
            scale = self._currentZoom,
            vpWidth = viewport.width,
            vpHeight = viewport.height,
            centerFromBoundaryX = self.elements.boundary.clientWidth / 2,
            centerFromBoundaryY = self.elements.boundary.clientHeight / 2,
            imgRect = self.elements.preview.getBoundingClientRect(),
            curImgWidth = imgRect.width,
            curImgHeight = imgRect.height,
            halfWidth = vpWidth / 2,
            halfHeight = vpHeight / 2;

        var maxX = ((halfWidth / scale) - centerFromBoundaryX) * -1;
        var minX = maxX - ((curImgWidth * (1 / scale)) - (vpWidth * (1 / scale)));

        var maxY = ((halfHeight / scale) - centerFromBoundaryY) * -1;
        var minY = maxY - ((curImgHeight * (1 / scale)) - (vpHeight * (1 / scale)));

        var originMinX = (1 / scale) * halfWidth;
        var originMaxX = (curImgWidth * (1 / scale)) - originMinX;

        var originMinY = (1 / scale) * halfHeight;
        var originMaxY = (curImgHeight * (1 / scale)) - originMinY;

        return {
            translate: {
                maxX: maxX,
                minX: minX,
                maxY: maxY,
                minY: minY
            },
            origin: {
                maxX: originMaxX,
                minX: originMinX,
                maxY: originMaxY,
                minY: originMinY
            }
        };
    }

    function _updateCenterPoint() {
        var self = this,
            scale = self._currentZoom,
            data = self.elements.preview.getBoundingClientRect(),
            vpData = self.elements.viewport.getBoundingClientRect(),
            transform = Transform.parse(self.elements.preview.style[CSS_TRANSFORM]),
            pc = new TransformOrigin(self.elements.preview),
            top = (vpData.top - data.top) + (vpData.height / 2),
            left = (vpData.left - data.left) + (vpData.width / 2),
            center = {},
            adj = {};

        center.y = top / scale;
        center.x = left / scale;

        adj.y = (center.y - pc.y) * (1 - scale);
        adj.x = (center.x - pc.x) * (1 - scale);

        transform.x -= adj.x;
        transform.y -= adj.y;

        var newCss = {};
        newCss[CSS_TRANS_ORG] = center.x + 'px ' + center.y + 'px';
        newCss[CSS_TRANSFORM] = transform.toString();
        css(self.elements.preview, newCss);
    }

    function _initDraggable() {
        var self = this,
            isDragging = false,
            originalX,
            originalY,
            originalDistance,
            vpRect,
            transform;

        function assignTransformCoordinates(deltaX, deltaY) {
            var imgRect = self.elements.preview.getBoundingClientRect(),
                top = transform.y + deltaY,
                left = transform.x + deltaX;

            if (self.options.enforceBoundary) {
                if (vpRect.top > imgRect.top + deltaY && vpRect.bottom < imgRect.bottom + deltaY) {
                    transform.y = top;
                }

                if (vpRect.left > imgRect.left + deltaX && vpRect.right < imgRect.right + deltaX) {
                    transform.x = left;
                }
            }
            else {
                transform.y = top;
                transform.x = left;
            }
        }

        function keyDown(ev) {
            var LEFT_ARROW  = 37,
                UP_ARROW    = 38,
                RIGHT_ARROW = 39,
                DOWN_ARROW  = 40;

            if (ev.shiftKey && (ev.keyCode == UP_ARROW || ev.keyCode == DOWN_ARROW)) {
                var zoom = 0.0;
                if (ev.keyCode == UP_ARROW) {
                    zoom = parseFloat(self.elements.zoomer.value, 10) + parseFloat(self.elements.zoomer.step, 10)
                }
                else {
                    zoom = parseFloat(self.elements.zoomer.value, 10) - parseFloat(self.elements.zoomer.step, 10)
                }
                self.setZoom(zoom);
            }
            else if (ev.keyCode >= 37 && ev.keyCode <= 40) {
                ev.preventDefault();
                var movement = parseKeyDown(ev.keyCode);

                transform = Transform.parse(self.elements.preview);
                document.body.style[CSS_USERSELECT] = 'none';
                vpRect = self.elements.viewport.getBoundingClientRect();
                keyMove(movement);
            };

            function parseKeyDown(key) {
                switch (key) {
                    case LEFT_ARROW:
                        return [1, 0];
                    case UP_ARROW:
                        return [0, 1];
                    case RIGHT_ARROW:
                        return [-1, 0];
                    case DOWN_ARROW:
                        return [0, -1];
                };
            };
        }

        function keyMove(movement) {
            var deltaX = movement[0],
                deltaY = movement[1],
                newCss = {};

            assignTransformCoordinates(deltaX, deltaY);

            newCss[CSS_TRANSFORM] = transform.toString();
            css(self.elements.preview, newCss);
            _updateOverlay.call(self);
            document.body.style[CSS_USERSELECT] = '';
            _updateCenterPoint.call(self);
            _triggerUpdate.call(self);
            originalDistance = 0;
        }

        function mouseDown(ev) {
            ev.preventDefault();
            if (isDragging) return;
            isDragging = true;
            originalX = ev.pageX;
            originalY = ev.pageY;

            if (ev.touches) {
                var touches = ev.touches[0];
                originalX = touches.pageX;
                originalY = touches.pageY;
            }

            transform = Transform.parse(self.elements.preview);
            window.addEventListener('mousemove', mouseMove);
            window.addEventListener('touchmove', mouseMove);
            window.addEventListener('mouseup', mouseUp);
            window.addEventListener('touchend', mouseUp);
            document.body.style[CSS_USERSELECT] = 'none';
            vpRect = self.elements.viewport.getBoundingClientRect();
        }

        function mouseMove(ev) {
            ev.preventDefault();
            var pageX = ev.pageX,
                pageY = ev.pageY;

            if (ev.touches) {
                var touches = ev.touches[0];
                pageX = touches.pageX;
                pageY = touches.pageY;
            }

            var deltaX = pageX - originalX,
                deltaY = pageY - originalY,
                newCss = {};

            if (ev.type == 'touchmove') {
                if (ev.touches.length > 1) {
                    var touch1 = ev.touches[0];
                    var touch2 = ev.touches[1];
                    var dist = Math.sqrt((touch1.pageX - touch2.pageX) * (touch1.pageX - touch2.pageX) + (touch1.pageY - touch2.pageY) * (touch1.pageY - touch2.pageY));

                    if (!originalDistance) {
                        originalDistance = dist / self._currentZoom;
                    }

                    var scale = dist / originalDistance;

                    _setZoomerVal.call(self, scale);
                    dispatchChange(self.elements.zoomer);
                    return;
                }
            }

            assignTransformCoordinates(deltaX, deltaY);

            newCss[CSS_TRANSFORM] = transform.toString();
            css(self.elements.preview, newCss);
            _updateOverlay.call(self);
            originalY = pageY;
            originalX = pageX;
        }

        function mouseUp() {
            isDragging = false;
            window.removeEventListener('mousemove', mouseMove);
            window.removeEventListener('touchmove', mouseMove);
            window.removeEventListener('mouseup', mouseUp);
            window.removeEventListener('touchend', mouseUp);
            document.body.style[CSS_USERSELECT] = '';
            _updateCenterPoint.call(self);
            _triggerUpdate.call(self);
            originalDistance = 0;
        }

        self.elements.overlay.addEventListener('mousedown', mouseDown);
        self.elements.viewport.addEventListener('keydown', keyDown);
        self.elements.overlay.addEventListener('touchstart', mouseDown);
    }

    function _updateOverlay() {
        var self = this,
            boundRect = self.elements.boundary.getBoundingClientRect(),
            imgData = self.elements.preview.getBoundingClientRect();

        css(self.elements.overlay, {
            width: imgData.width + 'px',
            height: imgData.height + 'px',
            top: (imgData.top - boundRect.top) + 'px',
            left: (imgData.left - boundRect.left) + 'px'
        });
    }
    var _debouncedOverlay = debounce(_updateOverlay, 500);

    function _triggerUpdate() {
        var self = this,
            data = self.get(),
            ev; 

        if (!_isVisible.call(self)) {
            return;
        }

        self.options.update.call(self, data);
        if (self.$) {
            self.$(self.element).trigger('update', data)
        }
        else {
            var ev;
            if (window.CustomEvent) {
                ev = new CustomEvent('update', { detail: data });
            } else {
                ev = document.createEvent('CustomEvent');
                ev.initCustomEvent('update', true, true, data);
            }

            self.element.dispatchEvent(ev);
        }
    }

    function _isVisible() {
        return this.elements.preview.offsetHeight > 0 && this.elements.preview.offsetWidth > 0;
    }

    function _updatePropertiesFromImage() {
        var self = this,
            minZoom = 0,
            maxZoom = 1.5,
            initialZoom = 1,
            cssReset = {},
            img = self.elements.preview,
            zoomer = self.elements.zoomer,
            transformReset = new Transform(0, 0, initialZoom),
            originReset = new TransformOrigin(),
            isVisible = _isVisible.call(self),
            imgData,
            vpData,
            boundaryData,
            minW,
            minH;

        if (!isVisible || self.data.bound) {
            // if the croppie isn't visible or it doesn't need binding
            return;
        }

        self.data.bound = true;
        cssReset[CSS_TRANSFORM] = transformReset.toString();
        cssReset[CSS_TRANS_ORG] = originReset.toString();
        cssReset['opacity'] = 1;
        css(img, cssReset);

        imgData = img.getBoundingClientRect();
        vpData = self.elements.viewport.getBoundingClientRect();
        boundaryData = self.elements.boundary.getBoundingClientRect();
        self._originalImageWidth = imgData.width;
        self._originalImageHeight = imgData.height;

        if (self.options.enableZoom) {
            if (self.options.enforceBoundary) {
                minW = vpData.width / imgData.width;
                minH = vpData.height / imgData.height;
                minZoom = Math.max(minW, minH);
            }

            if (minZoom >= maxZoom) {
                maxZoom = minZoom + 1;
            }

            zoomer.min = fix(minZoom, 4);
            zoomer.max = fix(maxZoom, 4);
            var defaultInitialZoom = Math.max((boundaryData.width / imgData.width), (boundaryData.height / imgData.height));
            initialZoom = self.data.boundZoom !== null ? self.data.boundZoom : defaultInitialZoom;
            _setZoomerVal.call(self, initialZoom);
            dispatchChange(zoomer);
        }
        else {
            self._currentZoom = initialZoom;
        }
        
        transformReset.scale = self._currentZoom;
        cssReset[CSS_TRANSFORM] = transformReset.toString();
        css(img, cssReset);

        if (self.data.points.length) {
            _bindPoints.call(self, self.data.points);
        }
        else {
            _centerImage.call(self);
        }

        _updateCenterPoint.call(self);
        _updateOverlay.call(self);
    }

    function _bindPoints(points) {
        if (points.length != 4) {
            throw "Croppie - Invalid number of points supplied: " + points;
        }
        var self = this,
            pointsWidth = points[2] - points[0],
            // pointsHeight = points[3] - points[1],
            vpData = self.elements.viewport.getBoundingClientRect(),
            boundRect = self.elements.boundary.getBoundingClientRect(),
            vpOffset = {
                left: vpData.left - boundRect.left,
                top: vpData.top - boundRect.top
            },
            scale = vpData.width / pointsWidth,
            originTop = points[1],
            originLeft = points[0],
            transformTop = (-1 * points[1]) + vpOffset.top,
            transformLeft = (-1 * points[0]) + vpOffset.left,
            newCss = {};

        newCss[CSS_TRANS_ORG] = originLeft + 'px ' + originTop + 'px';
        newCss[CSS_TRANSFORM] = new Transform(transformLeft, transformTop, scale).toString();
        css(self.elements.preview, newCss);

        _setZoomerVal.call(self, scale);
        self._currentZoom = scale;
    }

    function _centerImage() {
        var self = this,
            imgDim = self.elements.preview.getBoundingClientRect(),
            vpDim = self.elements.viewport.getBoundingClientRect(),
            boundDim = self.elements.boundary.getBoundingClientRect(),
            vpLeft = vpDim.left - boundDim.left,
            vpTop = vpDim.top - boundDim.top,
            w = vpLeft - ((imgDim.width - vpDim.width) / 2),
            h = vpTop - ((imgDim.height - vpDim.height) / 2),
            transform = new Transform(w, h, self._currentZoom);

        css(self.elements.preview, CSS_TRANSFORM, transform.toString());
    }

    function _transferImageToCanvas(customOrientation) {
        var self = this,
            canvas = self.elements.canvas,
            img = self.elements.img,
            ctx = canvas.getContext('2d'),
            exif = _hasExif.call(self),
            customOrientation = self.options.enableOrientation && customOrientation;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = img.width;
        canvas.height = img.height;

        if (exif) {
            getExifOrientation(img, function (orientation) {
                drawCanvas(canvas, img, num(orientation, 10));
                if (customOrientation) {
                    drawCanvas(canvas, img, customOrientation);
                }
            });
        } else if (customOrientation) {
            drawCanvas(canvas, img, customOrientation);
        }
    }

    function _getCanvas(data) {
        var self = this,
            points = data.points,
            left = num(points[0]),
            top = num(points[1]),
            width = (points[2] - points[0]),
            height = (points[3] - points[1]),
            circle = data.circle,
            canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d'),
            outWidth = width,
            outHeight = height,
            startX = 0,
            startY = 0;

        if (data.outputWidth && data.outputHeight) {
            outWidth = data.outputWidth;
            outHeight = data.outputHeight;
        }

        canvas.width = outWidth;
        canvas.height = outHeight;

        if (data.backgroundColor) {
            ctx.fillStyle = data.backgroundColor;
            ctx.fillRect(0, 0, outWidth, outHeight);
        }
        // start fixing data to send to draw image for enforceBoundary: false
        if (left < 0) {
            startX = Math.abs(left);
            left = 0;
        }
        if (top < 0) {
            startY = Math.abs(top);
            top = 0;
        }
        if ((left + width) > self._originalImageWidth) {
            width = self._originalImageWidth - left;
            outWidth = width;
        }
        if ((top + height) > self._originalImageHeight) {
            height = self._originalImageHeight - top;
            outHeight = height;
        }

        ctx.drawImage(this.elements.preview, left, top, width, height, startX, startY, outWidth, outHeight);
        if (circle) {
            ctx.fillStyle = '#fff';
            ctx.globalCompositeOperation = 'destination-in';
            ctx.beginPath();
            ctx.arc(outWidth / 2, outHeight / 2, outWidth / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();
        }
        return canvas;
    }

    function _getHtmlResult(data) {
        var points = data.points,
            div = document.createElement('div'),
            img = document.createElement('img'),
            width = points[2] - points[0],
            height = points[3] - points[1];

        addClass(div, 'croppie-result');
        div.appendChild(img);
        css(img, {
            left: (-1 * points[0]) + 'px',
            top: (-1 * points[1]) + 'px'
        });
        img.src = data.url;
        css(div, {
            width: width + 'px',
            height: height + 'px'
        });

        return div;
    }

    function _getBase64Result(data) {
        return _getCanvas.call(this, data).toDataURL(data.format, data.quality);
    }

    function _getBlobResult(data) {
        var self = this;
        return new Promise(function (resolve, reject) {
            _getCanvas.call(self, data).toBlob(function (blob) {
                resolve(blob);
            }, data.format, data.quality);
        });
    }

    function _bind(options, cb) {
        var self = this,
            url,
            points = [],
            zoom = null;

        if (typeof (options) === 'string') {
            url = options;
            options = {};
        }
        else if (Array.isArray(options)) {
            points = options.slice();
        }
        else if (typeof (options) == 'undefined' && self.data.url) { //refreshing
            _updatePropertiesFromImage.call(self);
            _triggerUpdate.call(self);
            return null;
        }
        else {
            url = options.url;
            points = options.points || [];
            zoom = typeof(options.zoom) === 'undefined' ? null : options.zoom;
        }

        self.data.bound = false;
        self.data.url = url || self.data.url;
        self.data.points = (points || self.data.points).map(function (p) {
            return parseFloat(p);
        });
        self.data.boundZoom = zoom;
        var prom = loadImage(url, self.elements.img, self.options.useCanvas);
        prom.then(function () {
            if (self.options.useCanvas) {
                self.elements.img.exifdata = null;
                _transferImageToCanvas.call(self, options.orientation || 1);
            }
            _updatePropertiesFromImage.call(self);
            _triggerUpdate.call(self);
            if (cb) {
                cb();
            }
        });
        return prom;
    }

    function fix(v, decimalPoints) {
        return parseFloat(v).toFixed(decimalPoints || 0);
    }

    function _get() {
        var self = this,
            imgData = self.elements.preview.getBoundingClientRect(),
            vpData = self.elements.viewport.getBoundingClientRect(),
            x1 = vpData.left - imgData.left,
            y1 = vpData.top - imgData.top,
            widthDiff = (vpData.width - self.elements.viewport.offsetWidth) / 2,
            heightDiff = (vpData.height - self.elements.viewport.offsetHeight) / 2,
            x2 = x1 + self.elements.viewport.offsetWidth + widthDiff,
            y2 = y1 + self.elements.viewport.offsetHeight + heightDiff,
            scale = self._currentZoom;

        if (scale === Infinity || isNaN(scale)) {
            scale = 1;
        }

        var max = self.options.enforceBoundary ? 0 : Number.NEGATIVE_INFINITY;
        x1 = Math.max(max, x1 / scale);
        y1 = Math.max(max, y1 / scale);
        x2 = Math.max(max, x2 / scale);
        y2 = Math.max(max, y2 / scale);

        return {
            points: [fix(x1), fix(y1), fix(x2), fix(y2)],
            zoom: scale
        };
    }

    var RESULT_DEFAULTS = {
            type: 'canvas',
            format: 'png',
            quality: 1
        },
        RESULT_FORMATS = ['jpeg', 'webp', 'png'];

    function _result(options) {
        var self = this,
            data = _get.call(self),
            opts = deepExtend(RESULT_DEFAULTS, deepExtend({}, options)),
            resultType = (typeof (options) === 'string' ? options : (opts.type || 'base64')),
            size = opts.size,
            format = opts.format,
            quality = opts.quality,
            backgroundColor = opts.backgroundColor,
            circle = typeof opts.circle === 'boolean' ? opts.circle : (self.options.viewport.type === 'circle'),
            vpRect = self.elements.viewport.getBoundingClientRect(),
            ratio = vpRect.width / vpRect.height,
            prom;

        if (size === 'viewport') {
            data.outputWidth = vpRect.width;
            data.outputHeight = vpRect.height;
        } else if (typeof size === 'object') {
            if (size.width && size.height) {
                data.outputWidth = size.width;
                data.outputHeight = size.height;
            } else if (size.width) {
                data.outputWidth = size.width;
                data.outputHeight = size.width / ratio;
            } else if (size.height) {
                data.outputWidth = size.height * ratio;
                data.outputHeight = size.height;
            }
        }

        if (RESULT_FORMATS.indexOf(format) > -1) {
            data.format = 'image/' + format;
            data.quality = quality;
        }

        data.circle = circle;
        data.url = self.data.url;
        data.backgroundColor = backgroundColor;

        prom = new Promise(function (resolve, reject) {
            switch(resultType.toLowerCase())
            {
                case 'rawcanvas': 
                    resolve(_getCanvas.call(self, data));
                    break;
                case 'canvas':
                case 'base64':
                    resolve(_getBase64Result.call(self, data));
                    break;
                case 'blob':
                    _getBlobResult.call(self, data).then(resolve);
                    break;
                default: 
                    resolve(_getHtmlResult.call(self, data));
                    break;
            }
        });
        return prom;
    }

    function _refresh() {
        _updatePropertiesFromImage.call(this);
    }

    function _rotate(deg) {
        if (!this.options.useCanvas) {
            throw 'Croppie: Cannot rotate without enableOrientation';
        }

        var self = this,
            canvas = self.elements.canvas,
            img = self.elements.img,
            copy = document.createElement('canvas'),
            ornt = 1;

        copy.width = canvas.width;
        copy.height = canvas.height;
        var ctx = copy.getContext('2d');
        ctx.drawImage(canvas, 0, 0);

        if (deg === 90 || deg === -270) ornt = 6;
        if (deg === -90 || deg === 270) ornt = 8;
        if (deg === 180 || deg === -180) ornt = 3;

        drawCanvas(canvas, copy, ornt);
        _onZoom.call(self);
    }

    function _destroy() {
        var self = this;
        self.element.removeChild(self.elements.boundary);
        removeClass(self.element, 'croppie-container');
        if (self.options.enableZoom) {
            self.element.removeChild(self.elements.zoomerWrap);
        }
        delete self.elements;
    }

    if (window.jQuery) {
        var $ = window.jQuery;
        $.fn.croppie = function (opts) {
            var ot = typeof opts;

            if (ot === 'string') {
                var args = Array.prototype.slice.call(arguments, 1);
                var singleInst = $(this).data('croppie');

                if (opts === 'get') {
                    return singleInst.get();
                }
                else if (opts === 'result') {
                    return singleInst.result.apply(singleInst, args);
                }
                else if (opts === 'bind') {
                    return singleInst.bind.apply(singleInst, args);
                }

                return this.each(function () {
                    var i = $(this).data('croppie');
                    if (!i) return;

                    var method = i[opts];
                    if ($.isFunction(method)) {
                        method.apply(i, args);
                        if (opts === 'destroy') {
                            $(this).removeData('croppie');
                        }
                    }
                    else {
                        throw 'Croppie ' + opts + ' method not found';
                    }
                });
            }
            else {
                return this.each(function () {
                    var i = new Croppie(this, opts);
                    i.$ = $;
                    $(this).data('croppie', i);
                });
            }
        };
    }

    function Croppie(element, opts) {
        this.element = element;
        this.options = deepExtend(deepExtend({}, Croppie.defaults), opts);

        if (this.element.tagName.toLowerCase() === 'img') {
            var origImage = this.element;
            addClass(origImage, 'cr-original-image');
            var replacementDiv = document.createElement('div');
            this.element.parentNode.appendChild(replacementDiv);
            replacementDiv.appendChild(origImage);
            this.element = replacementDiv;
            this.options.url = this.options.url || origImage.src;
        }
        
        _create.call(this);
        if (this.options.url) {
            var bindOpts = {
                url: this.options.url,
                points: this.options.points
            };
            delete this.options['url'];
            delete this.options['points'];
            _bind.call(this, bindOpts);
        }
    }

    Croppie.defaults = {
        viewport: {
            width: 100,
            height: 100,
            type: 'square'
        },
        boundary: { },
        orientationControls: {
            enabled: true,
            leftClass: '',
            rightClass: ''
        },
        customClass: '',
        showZoomer: true,
        enableZoom: true,
        mouseWheelZoom: true,
        enableExif: false,
        enforceBoundary: true,
        enableOrientation: false,
        update: function () { }
    };

    deepExtend(Croppie.prototype, {
        bind: function (options, cb) {
            return _bind.call(this, options, cb);
        },
        get: function () {
            return _get.call(this);
        },
        result: function (type) {
            return _result.call(this, type);
        },
        refresh: function () {
            return _refresh.call(this);
        },
        setZoom: function (v) {
            _setZoomerVal.call(this, v);
            dispatchChange(this.elements.zoomer);
        },
        rotate: function (deg) {
            _rotate.call(this, deg);
        },
        destroy: function () {
            return _destroy.call(this);
        }
    });

    exports.Croppie = window.Croppie = Croppie;

    if (typeof module === 'object' && !!module.exports) {
        module.exports = Croppie;
    }
}));

},{}],3:[function(require,module,exports){
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["watermark"] = factory();
	else
		root["watermark"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(1);
	module.exports = __webpack_require__(2).default;


/***/ },
/* 1 */
/***/ function(module, exports) {

	// required to safely use babel/register within a browserify codebase

	"use strict";

	exports.__esModule = true;

	exports["default"] = function () {};

	module.exports = exports["default"];

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = watermark;

	var _image = __webpack_require__(3);

	var _canvas = __webpack_require__(5);

	var _blob = __webpack_require__(6);

	var _style = __webpack_require__(7);

	var style = _interopRequireWildcard(_style);

	var _object = __webpack_require__(10);

	var _pool = __webpack_require__(11);

	var _pool2 = _interopRequireDefault(_pool);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

	/**
	 * A configuration type for the watermark function
	 *
	 * @typedef {Object} Options
	 * @property {Function} init - an initialization function that is given Image objects before loading (only applies if resources is a collection of urls)
	 * @property {Number} poolSize - number of canvas elements available for drawing,
	 * @property {CanvasPool} pool - the pool used. If provided, poolSize will be ignored
	 */

	/**
	 * @constant
	 * @type {Options}
	 */
	var defaults = {
	  init: function init() {}
	};

	/**
	 * Merge the given options with the defaults
	 *
	 * @param {Options} options
	 * @return {Options}
	 */
	function mergeOptions(options) {
	  return (0, _object.extend)((0, _object.clone)(defaults), options);
	}

	/**
	 * Release canvases from a draw result for reuse. Returns
	 * the dataURL from the result's canvas
	 *
	 * @param {DrawResult} result
	 * @param {CanvasPool} pool
	 * @return  {String}
	 */
	function release(result, pool) {
	  var canvas = result.canvas;
	  var sources = result.sources;

	  var dataURL = (0, _canvas.dataUrl)(canvas);
	  sources.forEach(pool.release);
	  return dataURL;
	}

	/**
	 * Return a watermark object
	 *
	 *
	 * @param {Array} resources - a collection of urls, File objects, or Image objects
	 * @param {Options} options - a configuration object for watermark
	 * @param {Promise} promise - optional
	 * @return {Object}
	 */
	function watermark(resources) {
	  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
	  var promise = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

	  var opts = mergeOptions(options);
	  promise || (promise = (0, _image.load)(resources, opts.init));

	  return {
	    /**
	     * Convert the watermarked image into a dataUrl. The draw
	     * function is given all images as canvas elements in order
	     *
	     * @param {Function} draw
	     * @return {Object}
	     */

	    dataUrl: function dataUrl(draw) {
	      var promise = this.then(function (images) {
	        return (0, _image.mapToCanvas)(images, _pool2.default);
	      }).then(function (canvases) {
	        return style.result(draw, canvases);
	      }).then(function (result) {
	        return release(result, _pool2.default);
	      });

	      return watermark(resources, opts, promise);
	    },

	    /**
	     * Load additional resources
	     *
	     * @param {Array} resources - a collection of urls, File objects, or Image objects
	     * @param {Function} init - an initialization function that is given Image objects before loading (only applies if resources is a collection of urls)
	     * @return {Object}
	     */
	    load: function load(resources, init) {
	      var promise = this.then(function (resource) {
	        return (0, _image.load)([resource].concat(resources), init);
	      });

	      return watermark(resources, opts, promise);
	    },

	    /**
	     * Render the current state of the watermarked image. Useful for performing
	     * actions after the watermark has been applied
	     *
	     * @return {Object}
	     */
	    render: function render() {
	      var promise = this.then(function (resource) {
	        return (0, _image.load)([resource]);
	      });

	      return watermark(resources, opts, promise);
	    },

	    /**
	     * Convert the watermark into a blob
	     *
	     * @param {Function} draw
	     * @return {Object}
	     */
	    blob: function blob(draw) {
	      var promise = this.dataUrl(draw).then(_blob.blob);

	      return watermark(resources, opts, promise);
	    },

	    /**
	     * Convert the watermark into an image using the given draw function
	     *
	     * @param {Function} draw
	     * @return {Object}
	     */
	    image: function image(draw) {
	      var promise = this.dataUrl(draw).then(_image.createImage);

	      return watermark(resources, opts, promise);
	    },

	    /**
	     * Delegate to the watermark promise
	     *
	     * @return {Promise}
	     */
	    then: function then() {
	      for (var _len = arguments.length, funcs = Array(_len), _key = 0; _key < _len; _key++) {
	        funcs[_key] = arguments[_key];
	      }

	      return promise.then.apply(promise, funcs);
	    }
	  };
	};

	/**
	 * Style functions
	 */
	watermark.image = style.image;
	watermark.text = style.text;

	/**
	 * Clean up all canvas references
	 */
	watermark.destroy = function () {
	  return _pool2.default.clear();
	};

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.getLoader = getLoader;
	exports.load = load;
	exports.loadUrl = loadUrl;
	exports.loadFile = loadFile;
	exports.createImage = createImage;
	exports.imageToCanvas = imageToCanvas;
	exports.mapToCanvas = mapToCanvas;

	var _functions = __webpack_require__(4);

	function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

	/**
	 * Set the src of an image object and call the resolve function
	 * once it has loaded
	 *
	 * @param {Image} img
	 * @param {String} src
	 * @param {Function} resolve
	 */
	function setAndResolve(img, src, resolve) {
	  img.onload = function () {
	    return resolve(img);
	  };
	  img.src = src;
	}

	/**
	 * Given a resource, return an appropriate loading function for it's type
	 *
	 * @param {String|File|Image} resource
	 * @return {Function}
	 */
	function getLoader(resource) {
	  var type = typeof resource === 'undefined' ? 'undefined' : _typeof(resource);

	  if (type === 'string') {
	    return loadUrl;
	  }

	  if (resource instanceof Image) {
	    return _functions.identity;
	  }

	  return loadFile;
	}

	/**
	 * Used for loading image resources asynchronously and maintaining
	 * the supplied order of arguments
	 *
	 * @param {Array} resources - a mixed array of urls, File objects, or Image objects
	 * @param {Function} init - called at the beginning of resource initialization
	 * @return {Promise}
	 */
	function load(resources, init) {
	  var promises = [];
	  for (var i = 0; i < resources.length; i++) {
	    var resource = resources[i];
	    var loader = getLoader(resource);
	    var promise = loader(resource, init);
	    promises.push(promise);
	  }
	  return Promise.all(promises);
	}

	/**
	 * Load an image by its url
	 *
	 * @param {String} url
	 * @param {Function} init - an optional image initializer
	 * @return {Promise}
	 */
	function loadUrl(url, init) {
	  var img = new Image();
	  typeof init === 'function' && init(img);
	  return new Promise(function (resolve) {
	    img.onload = function () {
	      return resolve(img);
	    };
	    img.src = url;
	  });
	}

	/**
	 * Return a collection of images from an
	 * array of File objects
	 *
	 * @param {File} file
	 * @return {Promise}
	 */
	function loadFile(file) {
	  var reader = new FileReader();
	  return new Promise(function (resolve) {
	    var img = new Image();
	    reader.onloadend = function () {
	      return setAndResolve(img, reader.result, resolve);
	    };
	    reader.readAsDataURL(file);
	  });
	}

	/**
	 * Create a new image, optionally configuring it's onload behavior
	 *
	 * @param {String} url
	 * @param {Function} onload
	 * @return {Image}
	 */
	function createImage(url, onload) {
	  var img = new Image();
	  if (typeof onload === 'function') {
	    img.onload = onload;
	  }
	  img.src = url;
	  return img;
	}

	/**
	 * Draw an image to a canvas element
	 *
	 * @param {Image} img
	 * @param {HTMLCanvasElement} canvas
	 * @return {HTMLCanvasElement}
	 */
	function drawImage(img, canvas) {
	  var ctx = canvas.getContext('2d');

	  canvas.width = img.width;
	  canvas.height = img.height;
	  ctx.drawImage(img, 0, 0);
	  return canvas;
	}

	/**
	 * Convert an Image object to a canvas
	 *
	 * @param {Image} img
	 * @param {CanvasPool} pool
	 * @return {HTMLCanvasElement}
	 */
	function imageToCanvas(img, pool) {
	  var canvas = pool.pop();
	  return drawImage(img, canvas);
	}

	/**
	 * Convert an array of image objects
	 * to canvas elements
	 *
	 * @param {Array} images
	 * @param {CanvasPool} pool
	 * @return {HTMLCanvasElement[]}
	 */
	function mapToCanvas(images, pool) {
	  return images.map(function (img) {
	    return imageToCanvas(img, pool);
	  });
	}

/***/ },
/* 4 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.sequence = sequence;
	exports.identity = identity;
	/**
	 * Return a function that executes a sequence of functions from left to right,
	 * passing the result of a previous operation to the next
	 *
	 * @param {...funcs}
	 * @return {Function}
	 */
	function sequence() {
	  for (var _len = arguments.length, funcs = Array(_len), _key = 0; _key < _len; _key++) {
	    funcs[_key] = arguments[_key];
	  }

	  return function (value) {
	    return funcs.reduce(function (val, fn) {
	      return fn.call(null, val);
	    }, value);
	  };
	}

	/**
	 * Return the argument passed to it
	 *
	 * @param {Mixed} x
	 * @return {Mixed}
	 */
	function identity(x) {
	  return x;
	}

/***/ },
/* 5 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.dataUrl = dataUrl;
	/**
	 * Get the data url of a canvas
	 *
	 * @param {HTMLCanvasElement}
	 * @return {String}
	 */
	function dataUrl(canvas) {
	  return canvas.toDataURL();
	}

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.blob = undefined;
	exports.split = split;
	exports.decode = decode;
	exports.uint8 = uint8;

	var _functions = __webpack_require__(4);

	var url = /^data:([^;]+);base64,(.*)$/;

	/**
	 * Split a data url into a content type and raw data
	 *
	 * @param {String} dataUrl
	 * @return {Array}
	 */
	function split(dataUrl) {
	  return url.exec(dataUrl).slice(1);
	}

	/**
	 * Decode a base64 string
	 *
	 * @param {String} base64
	 * @return {String}
	 */
	function decode(base64) {
	  return window.atob(base64);
	}

	/**
	 * Return a string of raw data as a Uint8Array
	 *
	 * @param {String} data
	 * @return {UInt8Array}
	 */
	function uint8(data) {
	  var length = data.length;
	  var uints = new Uint8Array(length);

	  for (var i = 0; i < length; i++) {
	    uints[i] = data.charCodeAt(i);
	  }

	  return uints;
	}

	/**
	 * Turns a data url into a blob object
	 *
	 * @param {String} dataUrl
	 * @return {Blob}
	 */
	var blob = exports.blob = (0, _functions.sequence)(split, function (parts) {
	  return [decode(parts[1]), parts[0]];
	}, function (blob) {
	  return new Blob([uint8(blob[0])], { type: blob[1] });
	});

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.text = exports.image = undefined;
	exports.result = result;

	var _image = __webpack_require__(8);

	var img = _interopRequireWildcard(_image);

	var _text = __webpack_require__(9);

	var txt = _interopRequireWildcard(_text);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

	/**
	 * @typedef {Object} DrawResult
	 * @property {HTMLCanvasElement} canvas - the end result of a draw
	 * @property {HTMLCanvasElement[]} sources - the sources used in the draw
	 */

	var image = exports.image = img;
	var text = exports.text = txt;

	/**
	 * Create a DrawResult by apply a list of canvas elements to a draw function
	 *
	 * @param {Function} draw - the draw function used to create a DrawResult
	 * @param {HTMLCanvasElement} sources - the canvases used by the draw function
	 * @return {DrawResult}
	 */
	function result(draw, sources) {
	  var canvas = draw.apply(null, sources);
	  return {
	    canvas: canvas,
	    sources: sources
	  };
	}

/***/ },
/* 8 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.atPos = atPos;
	exports.lowerRight = lowerRight;
	exports.upperRight = upperRight;
	exports.lowerLeft = lowerLeft;
	exports.upperLeft = upperLeft;
	exports.center = center;
	/**
	 * Return a function for positioning a watermark on a target canvas
	 *
	 * @param {Function} xFn - a function to determine an x value
	 * @param {Function} yFn - a function to determine a y value
	 * @param {Number} alpha
	 * @return {Function}
	 */
	function atPos(xFn, yFn, alpha) {
	  alpha || (alpha = 1.0);
	  return function (target, watermark) {
	    var context = target.getContext('2d');
	    context.save();

	    context.globalAlpha = alpha;
	    context.drawImage(watermark, xFn(target, watermark), yFn(target, watermark));

	    context.restore();
	    return target;
	  };
	}

	/**
	 * Place the watermark in the lower right corner of the target
	 * image
	 *
	 * @param {Number} alpha
	 * @return {Function}
	 */
	function lowerRight(alpha) {
	  return atPos(function (target, mark) {
	    return target.width - (mark.width + 10);
	  }, function (target, mark) {
	    return target.height - (mark.height + 10);
	  }, alpha);
	}

	/**
	 * Place the watermark in the upper right corner of the target
	 * image
	 *
	 * @param {Number} alpha
	 * @return {Function}
	 */
	function upperRight(alpha) {
	  return atPos(function (target, mark) {
	    return target.width - (mark.width + 10);
	  }, function (target, mark) {
	    return 10;
	  }, alpha);
	}

	/**
	 * Place the watermark in the lower left corner of the target
	 * image
	 *
	 * @param {Number} alpha
	 * @return {Function}
	 */
	function lowerLeft(alpha) {
	  return atPos(function (target, mark) {
	    return 10;
	  }, function (target, mark) {
	    return target.height - (mark.height + 10);
	  }, alpha);
	}

	/**
	 * Place the watermark in the upper left corner of the target
	 * image
	 *
	 * @param {Number} alpha
	 * @return {Function}
	 */
	function upperLeft(alpha) {
	  return atPos(function (target, mark) {
	    return 10;
	  }, function (target, mark) {
	    return 10;
	  }, alpha);
	}

	/**
	 * Place the watermark in the center of the target
	 * image
	 *
	 * @param {Number} alpha
	 * @return {Function}
	 */
	function center(alpha) {
	  return atPos(function (target, mark) {
	    return (target.width - mark.width) / 2;
	  }, function (target, mark) {
	    return (target.height - mark.height) / 2;
	  }, alpha);
	}

/***/ },
/* 9 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.atPos = atPos;
	exports.lowerRight = lowerRight;
	exports.lowerLeft = lowerLeft;
	exports.upperRight = upperRight;
	exports.upperLeft = upperLeft;
	exports.center = center;
	/**
	 * Return a function for positioning a watermark on a target canvas
	 *
	 * @param {Function} xFn - a function to determine an x value
	 * @param {Function} yFn - a function to determine a y value
	 * @param {String} text - the text to write
	 * @param {String} font - same as the CSS font property
	 * @param {String} fillStyle
	 * @param {Number} alpha
	 * @return {Function}
	 */
	function atPos(xFn, yFn, text, font, fillStyle, alpha) {
	  alpha || (alpha = 1.0);
	  return function (target) {
	    var context = target.getContext('2d');
	    context.save();

	    context.globalAlpha = alpha;
	    context.fillStyle = fillStyle;
	    context.font = font;
	    var metrics = context.measureText(text);
	    context.fillText(text, xFn(target, metrics, context), yFn(target, metrics, context));

	    context.restore();
	    return target;
	  };
	}

	/**
	 * Write text to the lower right corner of the target canvas
	 *
	 * @param {String} text - the text to write
	 * @param {String} font - same as the CSS font property
	 * @param {String} fillStyle
	 * @param {Number} alpha - control text transparency
	 * @param {Number} y - height in text metrics is not very well supported. This is a manual value
	 * @return {Function}
	 */
	function lowerRight(text, font, fillStyle, alpha, y) {
	  return atPos(function (target, metrics) {
	    return target.width - (metrics.width + 10);
	  }, function (target) {
	    return y || target.height - 10;
	  }, text, font, fillStyle, alpha);
	}

	/**
	 * Write text to the lower left corner of the target canvas
	 *
	 * @param {String} text - the text to write
	 * @param {String} font - same as the CSS font property
	 * @param {String} fillStyle
	 * @param {Number} alpha - control text transparency
	 * @param {Number} y - height in text metrics is not very well supported. This is a manual value
	 * @return {Function}
	 */
	function lowerLeft(text, font, fillStyle, alpha, y) {
	  return atPos(function () {
	    return 10;
	  }, function (target) {
	    return y || target.height - 10;
	  }, text, font, fillStyle, alpha);
	}

	/**
	 * Write text to the upper right corner of the target canvas
	 *
	 * @param {String} text - the text to write
	 * @param {String} font - same as the CSS font property
	 * @param {String} fillStyle
	 * @param {Number} alpha - control text transparency
	 * @param {Number} y - height in text metrics is not very well supported. This is a manual value
	 * @return {Function}
	 */
	function upperRight(text, font, fillStyle, alpha, y) {
	  return atPos(function (target, metrics) {
	    return target.width - (metrics.width + 10);
	  }, function () {
	    return y || 20;
	  }, text, font, fillStyle, alpha);
	}

	/**
	 * Write text to the upper left corner of the target canvas
	 *
	 * @param {String} text - the text to write
	 * @param {String} font - same as the CSS font property
	 * @param {String} fillStyle
	 * @param {Number} alpha - control text transparency
	 * @param {Number} y - height in text metrics is not very well supported. This is a manual value
	 * @return {Function}
	 */
	function upperLeft(text, font, fillStyle, alpha, y) {
	  return atPos(function () {
	    return 10;
	  }, function () {
	    return y || 20;
	  }, text, font, fillStyle, alpha);
	}

	/**
	 * Write text to the center of the target canvas
	 *
	 * @param {String} text - the text to write
	 * @param {String} font - same as the CSS font property
	 * @param {String} fillStyle
	 * @param {Number} alpha - control text transparency
	 * @param {Number} y - height in text metrics is not very well supported. This is a manual value
	 * @return {Function}
	 */
	function center(text, font, fillStyle, alpha, y) {
	  return atPos(function (target, metrics, ctx) {
	    ctx.textAlign = 'center';return target.width / 2;
	  }, function (target, metrics, ctx) {
	    ctx.textBaseline = 'middle';return target.height / 2;
	  }, text, font, fillStyle, alpha);
	}

/***/ },
/* 10 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.extend = extend;
	exports.clone = clone;
	/**
	 * Extend one object with the properties of another
	 *
	 * @param {Object} first
	 * @param {Object} second
	 * @return {Object}
	 */
	function extend(first, second) {
	  var secondKeys = Object.keys(second);
	  secondKeys.forEach(function (key) {
	    return first[key] = second[key];
	  });
	  return first;
	}

	/**
	 * Create a shallow copy of the object
	 *
	 * @param {Object} obj
	 * @return {Object}
	 */
	function clone(obj) {
	  return extend({}, obj);
	}

/***/ },
/* 11 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.CanvasPool = CanvasPool;
	/**
	 * An immutable canvas pool allowing more efficient use of canvas resources
	 *
	 * @typedef {Object} CanvasPool
	 * @property {Function} pop - return a promise that will evaluate to a canvas
	 * @property {Number} length - the number of available canvas elements
	 * @property {HTMLCanvasElement[]} elements - the canvas elements used by the pool
	 * @property {Function} clear - empty the pool of canvas elements
	 * @property {Function} release - free a pool up for release and return the data url
	 */

	/**
	 * Create a CanvasPool with the given size
	 *
	 * @param {Number} size
	 * @param {HTMLCanvasElement[]} elements
	 * @param {EventEmitter} eventEmitter
	 * @return {CanvasPool}
	 */
	function CanvasPool() {
	  var canvases = [];

	  return {
	    /**
	     * Get the next available canvas from the pool
	     *
	     * @return {HTMLCanvasElement}
	     */

	    pop: function pop() {
	      if (this.length === 0) {
	        canvases.push(document.createElement('canvas'));
	      }

	      return canvases.pop();
	    },

	    /**
	     * Return the number of available canvas elements in the pool
	     *
	     * @return {Number}
	     */
	    get length() {
	      return canvases.length;
	    },

	    /**
	     * Return a canvas to the pool. This function will clear the canvas for reuse
	     *
	     * @param {HTMLCanvasElement} canvas
	     * @return {String}
	     */
	    release: function release(canvas) {
	      var context = canvas.getContext('2d');
	      context.clearRect(0, 0, canvas.width, canvas.height);
	      canvases.push(canvas);
	    },

	    /**
	     * Empty the pool, destroying any references to canvas objects
	     */
	    clear: function clear() {
	      canvases.splice(0, canvases.length);
	    },

	    /**
	     * Return the collection of canvases in the pool
	     *
	     * @return {HTMLCanvasElement[]}
	     */
	    get elements() {
	      return canvases;
	    }
	  };
	}

	var shared = CanvasPool();
	exports.default = shared;

/***/ }
/******/ ])
});
;
},{}]},{},[1])