"use strict";
var RedImageLoader;
(function () {
    var base64toBlob = function (base64Data, contentType) {
        contentType = contentType || '';
        var sliceSize = 1024;
        var byteCharacters = atob(base64Data);
        var bytesLength = byteCharacters.length;
        var slicesCount = Math.ceil(bytesLength / sliceSize);
        var byteArrays = new Array(slicesCount);
        for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
            var begin = sliceIndex * sliceSize;
            var end = Math.min(begin + sliceSize, bytesLength);

            var bytes = new Array(end - begin);
            for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
                bytes[i] = byteCharacters[offset].charCodeAt(0);
            }
            byteArrays[sliceIndex] = new Uint8Array(bytes);
        }
        return new Blob(byteArrays, {type: contentType});
    }
    var fileLoader = function (src, onLoader, onError, option) {
        var self = this
        var request = new XMLHttpRequest();
        request.open("GET", src, true);
        request.responseType = "blob";
        request.onreadystatechange = function (e) {
            if (request.readyState == 4 ) {
                console.log(request)
                if(request.status === 200){
                    createImageBitmap(request.response, option ? option : {
                        imageOrientation: 'flipY'
                    }).then(function (v) {
                        v['src'] = src
                        self['source'] = v
                        if (self['_onLoad']) {
                            self['_onLoad'](request)
                            self['_onLoad'] = undefined
                            self['_onError'] = undefined
                        }
                        console.log('fileLoader',v)
                    })
                }else{
                    if (self['_onError']) {
                        self['_onError'](request)
                        self['_onLoad'] = undefined
                        self['_onError'] = undefined
                    }
                }

            }
        }

        request.send();
    }
    RedImageLoader = function (src, onLoad, onError, option) {
        var self = this;
        if (!(this instanceof RedImageLoader)) return new RedImageLoader(src, onLoad, onError, option);
        self['_src'] = src
        self['_onLoad'] = onLoad
        self['_onError'] = onError
        if (window['createImageBitmap']) {
            if (src.split(',').length == 2 && src.substr(0, 5) == 'data:') {
                createImageBitmap(base64toBlob(src.split(',')[1], 'image/png'), option ? option : {
                    imageOrientation: 'flipY'
                }).then(function (v) {
                    console.log(v)
                    v['src'] = src
                    self['source'] = v
                    if (self['_onLoad']) {
                        self['_onLoad'](v)
                        self['_onLoad'] = undefined
                        self['_onError'] = undefined
                    }
                });
            } else fileLoader.apply(self, [self['_src'], onLoad, onError, option])
        } else {
            var img;
            var HD_onLoad, HD_onError, clearEvents;
            clearEvents = function (img) {
                img.removeEventListener('error', HD_onError);
                img.removeEventListener('load', HD_onLoad);
            };
            HD_onError = function (e) {
                clearEvents(this);
                if (self['_onError']) self['_onError'](e)
            };
            HD_onLoad = function (e) {
                clearEvents(this);
                self['source'] = img
                if (self['_onLoad']) self['_onLoad'](e)
            };
            img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = src;
            img.addEventListener('error', HD_onError);
            img.addEventListener('load', HD_onLoad);
        }

    }
    Object.freeze(RedImageLoader);
})();