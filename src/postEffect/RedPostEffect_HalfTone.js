"use strict";
var RedPostEffect_HalfTone;
(function () {
    var makeProgram;

    RedPostEffect_HalfTone = function (redGL) {
        if (!(this instanceof RedPostEffect_HalfTone)) return new RedPostEffect_HalfTone(redGL);
        if (!(redGL instanceof RedGL)) RedGLUtil.throwFunc('RedPostEffect_HalfTone : RedGL Instance만 허용됩니다.', redGL)
        this['frameBuffer'] = RedFrameBuffer(redGL);
        this['diffuseTexture'] = null;
        this['centerX'] = 0.0
        this['centerY'] = 0.0
        this['angle'] = 1
        this['radius'] = 1
        this['grayMode'] = true
        /////////////////////////////////////////
        // 일반 프로퍼티
        this['program'] = makeProgram(this, redGL);
        this['_UUID'] = RedGL['makeUUID']();
        this.checkProperty()
        // Object.seal(this)
        console.log(this)

        this.bind = function (gl) {
            this['frameBuffer'].bind(gl);
        }
        this.unbind = function (gl) {
            this['frameBuffer'].unbind(gl);
        }
    }
    makeProgram = (function () {
        var vSource, fSource;
        var PROGRAM_NAME;
        vSource = function () {
            /*
            void main(void) {
                vTexcoord = uAtlascoord.xy + aTexcoord * uAtlascoord.zw;
                vResolution = uResolution;
                gl_Position = uPMatrix * uCameraMatrix * uMMatrix *  vec4(aVertexPosition, 1.0);
            }
            */
        }
        fSource = function () {
            /*
            precision mediump float;
            uniform sampler2D uDiffuseTexture;      
            uniform float uCenterX;
            uniform float uCenterY;
            uniform float uAngle;
            uniform float uRadius;
            uniform bool uGrayMode;            
            float pattern(float angle) {
                float s = sin(angle), c = cos(angle);
                vec2 tex = vTexcoord;
                tex.x -= uCenterX + 0.5;
                tex.y -= uCenterY + 0.5;
                vec2 point = vec2( 
                    c * tex.x - s * tex.y, 
                    s * tex.x + c * tex.y 
                ) * vResolution / uRadius;
                return (sin(point.x) * sin(point.y)) * 4.0;
            }
            void main(void) {
                vec4 finalColor = texture2D(uDiffuseTexture, vTexcoord);
                if(uGrayMode) {
                    float average = (finalColor.r + finalColor.g + finalColor.b) / 3.0;
                    gl_FragColor = vec4(vec3(average * 10.0 - 5.0 + pattern(uAngle)), finalColor.a);
                }else{
                    vec3 cmy = 1.0 - finalColor.rgb;
                    float k = min(cmy.x, min(cmy.y, cmy.z));
                    cmy = (cmy - k) / (1.0 - k);
                    cmy = clamp(cmy * 10.0 - 3.0 + vec3(pattern(uAngle + 0.26179), pattern(uAngle + 1.30899), pattern(uAngle)), 0.0, 1.0);
                    k = clamp(k * 10.0 - 5.0 + pattern(uAngle + 0.78539), 0.0, 1.0);
                    gl_FragColor = vec4(1.0 - cmy - k, finalColor.a);
                }
              
            }
            */
        }
        vSource = RedGLUtil.getStrFromComment(vSource.toString());
        fSource = RedGLUtil.getStrFromComment(fSource.toString());
        PROGRAM_NAME = 'RedPostEffect_HalfTone_Program';
        return function (target, redGL) {
            return target['checkProgram'](redGL, PROGRAM_NAME, vSource, fSource)

        }
    })();
    RedPostEffect_HalfTone.prototype = RedBaseMaterial.prototype
    Object.freeze(RedPostEffect_HalfTone)
})();