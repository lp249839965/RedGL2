"use strict";
var RedPostEffect_DoF;
(function () {
    var makeProgram;
    /**DOC:
       {
           constructorYn : true,
           title :`RedPostEffect_DoF`,
           description : `
               RedPostEffect_DoF Instance 생성.
           `,
           params : {
               redGL : [
                   {type:'RedGL'}
               ]
           },
           return : 'RedPostEffect_DoF Instance'
       }
   :DOC*/
    RedPostEffect_DoF = function (redGL) {
        if (!(this instanceof RedPostEffect_DoF)) return new RedPostEffect_DoF(redGL);
        if (!(redGL instanceof RedGL)) RedGLUtil.throwFunc('RedPostEffect_DoF : RedGL Instance만 허용됩니다.', redGL)
        this['frameBuffer'] = RedFrameBuffer(redGL);
        this['depthFrameBuffer'] = RedFrameBuffer(redGL);
        this['depthMaterial'] = RedPostEffect_DoF_DepthMaterial(redGL);

        this['diffuseTexture'] = null;
        this['blurTexture'] = null;
        this['depthTexture'] = null;
        /////////////////////////////////////////
        // 일반 프로퍼티
        this['program'] = makeProgram(this, redGL);
        this['_UUID'] = RedGL['makeUUID']();
        this['process'] = [
            RedPostEffect_BlurX(redGL),
            RedPostEffect_BlurY(redGL)
        ]
        /**DOC:
           {
               title :`focusLength`,
               description : `
                   focusLength
                   기본값 : 15
               `,
               return : 'Number'
           }
       :DOC*/
        Object.defineProperty(this, 'focusLength', (function () {
            return {
                get: function () {
                    return this['depthMaterial']['focusLength']
                },
                set: function (v) {
                    this['depthMaterial']['focusLength'] = v
                }
            }
        })());
        /**DOC:
           {
               title :`blur`,
               description : `
                   blur 정도.
                   기본값 : 20
               `,
               return : 'Number'
           }
       :DOC*/
        Object.defineProperty(this, 'blur', (function () {
            var _v = 1
            return {
                get: function () {
                    return _v
                },
                set: function (v) {
                    _v = v;
                    this['process'][0]['size'] = _v;
                    this['process'][1]['size'] = _v;
                }
            }
        })());
        this['blur'] = 10
        this.updateTexture = function (lastFrameBufferTexture, parentFramBufferTexture, depthTexture) {
            this['diffuseTexture'] = parentFramBufferTexture;
            this['blurTexture'] = lastFrameBufferTexture;
            this['depthTexture'] = depthTexture;
        }
        this['bind'] = RedPostEffectManager.prototype['bind'];
        this['unbind'] = RedPostEffectManager.prototype['unbind'];
        this.checkProperty();
        console.log(this);
    }
    makeProgram = (function () {
        var vSource, fSource;
        var PROGRAM_NAME;
        vSource = function () {
            /*
            
            void main(void) {
                vTexcoord = uAtlascoord.xy + aTexcoord * uAtlascoord.zw;
                gl_Position = uPMatrix * uMMatrix *  vec4(aVertexPosition, 1.0);
              
            }
            */
        }
        fSource = function () {
            /*
            precision mediump float;
            uniform sampler2D uDiffuseTexture;     
            uniform sampler2D uBlurTexture;    
            uniform sampler2D uDepthTexture;    
                 
            highp float unpack_depth( const in highp vec4 rgba_depth ) {
                const highp vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );
                highp float depth = dot( rgba_depth, bit_shift );
                return depth;
            }

            //http://www.nutty.ca/?page_id=352&amp;link=shadow_map	
            highp float unpack_depth2 (highp vec4 colour)
            {
                const highp vec4 bitShifts = vec4(
                    1.0,
                    1.0 / 255.0,
                    1.0 / (255.0 * 255.0),
                    1.0 / (255.0 * 255.0 * 255.0)
                );
                return dot(colour, bitShifts);
            }
            
            uniform float uDistance;           
            void main() {
                vec4 finalColor = texture2D(uDiffuseTexture, vTexcoord);
                vec4 blurColor = texture2D(uBlurTexture, vTexcoord);
                vec4 depthColor = texture2D(uDepthTexture, vTexcoord);             
                finalColor.rgb *= (depthColor.r);
                blurColor.rgb *= (1.0-depthColor.r);
                gl_FragColor =  (finalColor + blurColor) ;
         
          
            }
            */
        }
        vSource = RedGLUtil.getStrFromComment(vSource.toString());
        fSource = RedGLUtil.getStrFromComment(fSource.toString());
        PROGRAM_NAME = 'RedPostEffect_DoF_Program';
        return function (target, redGL) {
            return target['checkProgram'](redGL, PROGRAM_NAME, vSource, fSource);
        }
    })();
    RedPostEffect_DoF.prototype = RedBaseMaterial.prototype;
    Object.freeze(RedPostEffect_DoF);
})();