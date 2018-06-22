
"use strict";
var RedRenderer;
//TODO: 캐싱전략을 좀더 고도화하는게 좋을듯
(function () {
	/**DOC:
	 {
		 constructorYn : true,
		 title :`RedRenderer`,
		 description : `
			 RedRenderer Instance 생성자.
		 `,
		 example : `
		 RedRenderer();
		 `,
		 return : 'RedRenderer Instance'
	 }
	 :DOC*/
	RedRenderer = function () {
		if ( !(this instanceof RedRenderer) ) return new RedRenderer();
		this.world = null;
		this['_tickKey'] = null;
		this['_callback'] = null;
		this['_UUID'] = RedGL['makeUUID']();
		this['renderInfo'] = {};
		this['cacheUniformInfo'] = [];
		this['cacheAttrInfo'] = [];
		this['cacheBySamplerIndex'] = [];
		this['cacheState'] = [];
		this['renderDebuger'] = RedRenderDebuger();
		console.log(this);
	};
	RedRenderer.prototype = {
		/**DOC:
		 {
			 code:`METHOD`,
			 title :`start`,
			 description : `
				 렌더 시작
			 `,
			 params : {
				 redGL : [
					 {type : "RedGL"}
				 ],
				 callback : [
					 {type : "Function"},
					 '렌더시마다 실행될 콜백'
				 ]
			 },
			 return : 'void'
		 }
		 :DOC*/
		start: (function () {
			var tick;
			var self, tRedGL;
			tick = function (time) {
				self.worldRender(tRedGL, time);
				self['_callback'] ? self['_callback'](time) : 0
				self['_tickKey'] = requestAnimationFrame(tick);
			}
			return function (redGL, callback) {
				if ( !(redGL instanceof RedGL) ) RedGLUtil.throwFunc('RedGL Instance만 허용');
				if ( !(redGL.world instanceof RedWorld) ) RedGLUtil.throwFunc('RedWorld Instance만 허용');
				self = this;
				self.world = redGL.world;
				tRedGL = redGL;
				self['_tickKey'] = requestAnimationFrame(tick);
				self['_callback'] = callback;
			}
		})(),
		/**DOC:
		 {
			 code:`METHOD`,
			 title :`render`,
			 description : `
				 단일 프레임 렌더
			 `,
			 params : {
				 redGL : [
					 {type : "RedGL"}
				 ],
				 time : [
					 {type : "Number"},
					 'time'
				 ]
			 },
			 return : 'void'
		 }
		 :DOC*/
		render: function (redGL, time) {
			if ( !(redGL instanceof RedGL) ) RedGLUtil.throwFunc('RedGL Instance만 허용');
			this.worldRender(redGL, time);
			this.world = redGL.world;
		},
		/**DOC:
		 {
			 code:`METHOD`,
			 title :`stop`,
			 description : `
				 렌더 중지
			 `,
			 return : 'void'
		 }
		 :DOC*/
		stop: function () { cancelAnimationFrame(this['_tickKey']) }
	};
	// 캐시관련
	var prevProgram_UUID;
	var tCamera
	var tScene;
	RedRenderer.prototype.worldRender = (function () {
		var worldRect;
		var perspectiveMTX;
		var self;
		var valueParser;
		var updateSystemUniform;
		var glInitialize;
		var lightDebugRenderList
		var postEffectRender;
		lightDebugRenderList = []
		// 숫자면 숫자로 %면 월드대비 수치로 변경해줌
		valueParser = function (rect) {
			rect.forEach(function (v, index) {
				if ( typeof rect[index] == 'number' ) rect[index] = v;
				else {
					if ( index < 2 ) rect[index] = worldRect[index + 2] * parseFloat(rect[index]) / 100
					else rect[index] = worldRect[index] * parseFloat(rect[index]) / 100
				}
				;
			})
			return rect;
		}
		updateSystemUniform = (function () {
			var tProgram;
			var tSystemUniformGroup;
			var gl;
			var tLocationInfo, tLocation, tUUID, tViewRect;
			var cacheSystemUniform;
			var tFogColor = [];
			var getValueStr, tValueStr;
			getValueStr = function (v) {
				var t0 = [];
				var i;
				if ( v.buffer || v instanceof Array ) {
					i = v.length
					while ( i-- ) t0[i] = v[i]
					t0 = t0.join(',')
					return t0
				}
				else return v
			}
			cacheSystemUniform = []
			return function (redGL, time, scene, camera, viewRect) {
				gl = redGL.gl;
				lightDebugRenderList.length = 0
				for ( var k in redGL['_datas']['RedProgram'] ) {
					tProgram = redGL['_datas']['RedProgram'][k];
					prevProgram_UUID == tProgram['_UUID'] ? 0 : gl.useProgram(tProgram['webglProgram']);
					prevProgram_UUID = tProgram['_UUID'];
					//
					tSystemUniformGroup = tProgram['systemUniformLocation'];
					//
					tLocationInfo = tSystemUniformGroup['uTime'];
					if ( tLocationInfo ) {
						tLocation = tLocationInfo['location'];
						tUUID = tLocationInfo['_UUID']
						if ( tLocation && cacheSystemUniform[tUUID] != time ) {
							gl.uniform1f(tLocation, time);
							cacheSystemUniform[tUUID] = time;
						}
					}
					//
					tLocationInfo = tSystemUniformGroup['uResolution'];
					if ( tLocationInfo ) {
						tLocation = tLocationInfo['location'];
						tUUID = tLocationInfo['_UUID'];
						tViewRect = [viewRect[2], viewRect[3]]
						tValueStr = JSON.stringify(tViewRect)
						if ( tLocation && cacheSystemUniform[tUUID] != tValueStr ) {
							gl.uniform2fv(tLocation, tViewRect);
							cacheSystemUniform[tUUID] = tValueStr
						}
					}
					tLocationInfo = tSystemUniformGroup['uUseFog'];
					if ( tLocationInfo ) {
						tLocation = tLocationInfo['location'];
						tValue = scene['useFog'] ? 1 : 0;
						tUUID = tLocationInfo['_UUID'];
						if ( tLocation && cacheSystemUniform[tUUID] != tValue ) {
							gl[tLocationInfo['renderMethod']](tLocation, tValue)
							cacheSystemUniform[tUUID] = tValue
						}
					}
					//
					tLocationInfo = tSystemUniformGroup['uFogDensity'];
					if ( tLocationInfo ) {
						tLocation = tLocationInfo['location'];
						tValue = scene['fogDensity'];
						tUUID = tLocationInfo['_UUID'];
						if ( tLocation && cacheSystemUniform[tUUID] != tValue ) {
							gl.uniform1f(tLocation, tValue)
							cacheSystemUniform[tUUID] = tValue
						}
					}
					//
					tLocationInfo = tSystemUniformGroup['uFogColor'];
					if ( tLocationInfo ) {
						tLocation = tLocationInfo['location'];
						tFogColor[0] = scene['_fogR'];
						tFogColor[1] = scene['_fogG'];
						tFogColor[2] = scene['_fogB'];
						tFogColor[3] = 1;
						tValue = tFogColor;
						tUUID = tLocationInfo['_UUID'];
						tValueStr = getValueStr(tValue)
						if ( tLocation && cacheSystemUniform[tUUID] != tValueStr ) {
							gl.uniform4fv(tLocation, tValue)
							cacheSystemUniform[tUUID] = tValueStr
						}
					}
					//
					tLocationInfo = tSystemUniformGroup['uFogDistance'];
					if ( tLocationInfo ) {
						tLocation = tLocationInfo['location'];
						tValue = scene['fogDistance'];
						tUUID = tLocationInfo['_UUID'];
						if ( tLocation && cacheSystemUniform[tUUID] != tValue ) {
							gl.uniform1f(tLocation, tValue)
							cacheSystemUniform[tUUID] = tValue
						}
					}
					//
					tLocationInfo = tSystemUniformGroup['uCameraMatrix'];
					if ( tLocationInfo ) {
						tLocation = tLocationInfo['location'];
						tValue = camera['matrix'];
						tUUID = tLocationInfo['_UUID'];
						tValueStr = JSON.stringify(tValue)
						if ( tLocation && cacheSystemUniform[tUUID] != tValueStr ) {
							gl.uniformMatrix4fv(tLocation, false, tValue);
							cacheSystemUniform[tUUID] = tValueStr
						}
					}
					//
					tLocationInfo = tSystemUniformGroup['uPMatrix'];
					if ( tLocationInfo ) {
						tLocation = tLocationInfo['location'];
						tValue = camera['perspectiveMTX'];
						tUUID = tLocationInfo['_UUID'];
						tValueStr = JSON.stringify(tValue)
						if ( tLocation && cacheSystemUniform[tUUID] != tValueStr ) {
							gl.uniformMatrix4fv(tLocation, false, tValue);
							cacheSystemUniform[tUUID] = tValueStr
						}
					}
					//
					var i, tList;
					var tLightData, tDebugObj;
					var tValue
					// 엠비언트 라이트 업데이트
					if ( tLightData = scene['_lightInfo'][RedAmbientLight['type']] ) {
						tLocationInfo = tSystemUniformGroup['uAmbientLightColor'];
						tLocation = tLocationInfo['location'];
						tUUID = tLocationInfo['_UUID'];
						tValue = tLightData['_color'];
						tValueStr = JSON.stringify(tValue)
						if ( tLocation && cacheSystemUniform[tUUID] != tValueStr ) {
							gl.uniform4fv(tLocation, tValue)
							cacheSystemUniform[tUUID] = tValueStr
						}
						//
						tLocationInfo = tSystemUniformGroup['uAmbientIntensity'];
						tLocation = tLocationInfo['location'];
						tUUID = tLocationInfo['_UUID'];
						tValue = tLightData['_intensity'];
						if ( tLocation && cacheSystemUniform[tUUID] != tValue ) {
							gl.uniform1f(tLocation, tValue)
							cacheSystemUniform[tUUID] = tValue
						}
					}
					// 디렉셔널 라이트 업데이트
					var tDirectionnalPositionList, tColorList, tIntensityList;
					var tVector;
					tVector = vec3.create()
					tDirectionnalPositionList = new Float32Array(3 * 3)
					tColorList = new Float32Array(4 * 3)
					tIntensityList = new Float32Array(3)
					tList = scene['_lightInfo'][RedDirectionalLight['type']];
					i = tList.length;
					while ( i-- ) {
						tLightData = tList[i];
						vec3.set(tVector, tLightData['x'], tLightData['y'], tLightData['z'])
						if ( tLightData['debug'] ) {
							tDebugObj = tLightData['debugObject'];
							tDebugObj['x'] = tVector[0];
							tDebugObj['y'] = tVector[1];
							tDebugObj['z'] = tVector[2];
							tDebugObj['_material']['_color'] = tLightData['_color']
							lightDebugRenderList.push(tDebugObj)
						}
						//
						tLocationInfo = tSystemUniformGroup['uDirectionalLightPosition'];
						if ( tLocationInfo ) {
							tLocation = tLocationInfo['location'];
							if ( tLocation ) {
								vec3.normalize(tVector, tVector)
								tDirectionnalPositionList[0 + 3 * i] = tVector[0];
								tDirectionnalPositionList[1 + 3 * i] = tVector[1];
								tDirectionnalPositionList[2 + 3 * i] = tVector[2];
							}
						}
						//
						tLocationInfo = tSystemUniformGroup['uDirectionalLightColor'];
						if ( tLocationInfo ) {
							tLocation = tLocationInfo['location'];
							if ( tLocation ) {
								tColorList[0 + 4 * i] = tLightData['_color'][0];
								tColorList[1 + 4 * i] = tLightData['_color'][1];
								tColorList[2 + 4 * i] = tLightData['_color'][2];
								tColorList[3 + 4 * i] = tLightData['_color'][3];
							}
						}
						if ( tLocationInfo ) {
							tLocationInfo = tSystemUniformGroup['uDirectionalLightIntensity'];
							tLocation = tLocationInfo['location'];
							if ( tLocation ) tIntensityList[i] = tLightData['_intensity']
						}
						//
					}
					//
					tLocationInfo = tSystemUniformGroup['uDirectionalLightPosition'];
					if ( tLocationInfo ) {
						tLocation = tLocationInfo['location'];
						tUUID = tLocationInfo['_UUID'];
						tValue = tDirectionnalPositionList;
						tValueStr = JSON.stringify(tValue)
						if ( tLocation && cacheSystemUniform[tUUID] != tValueStr ) {
							gl.uniform3fv(tLocation, tValue);
							cacheSystemUniform[tUUID] = tValueStr
						}
					}
					//
					tLocationInfo = tSystemUniformGroup['uDirectionalLightColor'];
					tLocation = tLocationInfo['location'];
					tUUID = tLocationInfo['_UUID'];
					tValue = tColorList;
					tValueStr = JSON.stringify(tValue)
					if ( tLocation && cacheSystemUniform[tUUID] != tValueStr ) {
						gl.uniform4fv(tLocation, tValue);
						cacheSystemUniform[tUUID] = tValueStr
					}
					//
					tLocationInfo = tSystemUniformGroup['uDirectionalLightIntensity'];
					tLocation = tLocationInfo['location'];
					tUUID = tLocationInfo['_UUID'];
					tValue = tIntensityList;
					tValueStr = JSON.stringify(tValue)
					if ( tLocation && cacheSystemUniform[tUUID] != tValueStr ) {
						gl.uniform1fv(tLocation, tValue)
						cacheSystemUniform[tUUID] = tValueStr
					}
					//
					tLocationInfo = tSystemUniformGroup['uDirectionalLightNum'];
					tLocation = tLocationInfo['location'];
					tUUID = tLocationInfo['_UUID'];
					tValue = tList.length;
					if ( tLocation && cacheSystemUniform[tUUID] != tValue ) {
						gl.uniform1i(tLocation, tValue)
						cacheSystemUniform[tUUID] = tValue
					}
					// 포인트 라이트 업데이트
					var tPointPositionList, tColorList, tIntensityList, tRadiusList;
					var tVector;
					tVector = vec3.create()
					tPointPositionList = new Float32Array(3 * 5)
					tColorList = new Float32Array(4 * 5)
					tIntensityList = new Float32Array(5)
					tRadiusList = new Float32Array(5)
					tList = scene['_lightInfo'][RedPointLight['type']];
					i = tList.length;
					while ( i-- ) {
						tLightData = tList[i];
						vec3.set(tVector, tLightData['x'], tLightData['y'], tLightData['z'])
						if ( tLightData['debug'] ) {
							tDebugObj = tLightData['debugObject'];
							tDebugObj['x'] = tVector[0];
							tDebugObj['y'] = tVector[1];
							tDebugObj['z'] = tVector[2];
							tDebugObj['scaleX'] = tDebugObj['scaleY'] = tDebugObj['scaleZ'] = tLightData['_radius']
							tDebugObj['_material']['_color'] = tLightData['_color']
							lightDebugRenderList.push(tDebugObj)
						}
						//
						tLocationInfo = tSystemUniformGroup['uPointLightPosition'];
						tLocation = tLocationInfo['location'];
						if ( tLocation ) {
							tPointPositionList[0 + 3 * i] = tVector[0];
							tPointPositionList[1 + 3 * i] = tVector[1];
							tPointPositionList[2 + 3 * i] = tVector[2];
						}
						//
						tLocationInfo = tSystemUniformGroup['uPointLightColor'];
						tLocation = tLocationInfo['location'];
						if ( tLocation ) {
							tColorList[0 + 4 * i] = tLightData['_color'][0];
							tColorList[1 + 4 * i] = tLightData['_color'][1];
							tColorList[2 + 4 * i] = tLightData['_color'][2];
							tColorList[3 + 4 * i] = tLightData['_color'][3];
						}
						//
						tLocationInfo = tSystemUniformGroup['uPointLightIntensity'];
						tLocation = tLocationInfo['location'];
						if ( tLocation ) tIntensityList[i] = tLightData['_intensity']
						//
						tLocationInfo = tSystemUniformGroup['uPointLightRadius'];
						tLocation = tLocationInfo['location'];
						if ( tLocation ) tRadiusList[i] = tLightData['_radius']
					}
					//
					tLocationInfo = tSystemUniformGroup['uPointLightPosition'];
					tLocation = tLocationInfo['location'];
					tUUID = tLocationInfo['_UUID'];
					tValue = tPointPositionList;
					tValueStr = JSON.stringify(tValue)
					if ( tLocation && cacheSystemUniform[tUUID] != tValueStr ) {
						gl.uniform3fv(tLocation, tValue);
						cacheSystemUniform[tUUID] = tValueStr
					}
					//
					tLocationInfo = tSystemUniformGroup['uPointLightColor'];
					tLocation = tLocationInfo['location'];
					tUUID = tLocationInfo['_UUID'];
					tValue = tColorList;
					tValueStr = JSON.stringify(tValue)
					if ( tLocation && cacheSystemUniform[tUUID] != tValueStr ) {
						gl.uniform4fv(tLocation, tValue);
						cacheSystemUniform[tUUID] = tValueStr
					}
					//
					tLocationInfo = tSystemUniformGroup['uPointLightIntensity'];
					tLocation = tLocationInfo['location'];
					tUUID = tLocationInfo['_UUID'];
					tValue = tIntensityList;
					tValueStr = JSON.stringify(tValue)
					if ( tLocation && cacheSystemUniform[tUUID] != tValueStr ) {
						gl.uniform1fv(tLocation, tValue)
						cacheSystemUniform[tUUID] = tValueStr
					}
					//
					tLocationInfo = tSystemUniformGroup['uPointLightRadius'];
					tLocation = tLocationInfo['location'];
					tUUID = tLocationInfo['_UUID'];
					tValue = tRadiusList;
					tValueStr = JSON.stringify(tValue)
					if ( tLocation && cacheSystemUniform[tUUID] != tValueStr ) {
						gl.uniform1fv(tLocation, tValue)
						cacheSystemUniform[tUUID] = tValueStr
					}
					//
					tLocationInfo = tSystemUniformGroup['uPointLightNum'];
					tLocation = tLocationInfo['location'];
					tUUID = tLocationInfo['_UUID'];
					tValue = tList.length;
					if ( tLocation && cacheSystemUniform[tUUID] != tValue ) {
						gl.uniform1i(tLocation, tValue)
						cacheSystemUniform[tUUID] = tValue
					}
				}
				return lightDebugRenderList
			}
		})();
		glInitialize = function (gl) {
			// 뎁스데스티 설정
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL)
			// 컬링 페이스 설정
			gl.frontFace(gl.CCW)
			gl.enable(gl.CULL_FACE);
			gl.cullFace(gl.BACK)
			gl.enable(gl.SCISSOR_TEST);
			// 블렌드모드설정
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			// gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
			// // 픽셀 블렌딩 결정
			// gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
			// 픽셀 플립 기본설정
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		};
		postEffectRender = (function () {
			var tPostEffectMesh;
			var setBaseUniform;
			setBaseUniform = (function () {
				var tMaterial;
				var tProgram;
				var tLocationInfo;
				var tSystemUniformLocation;
				var tLocation;
				var tResolution;
				var tMTX;
				tMTX = mat4.create()
				tResolution = new Float32Array(2)
				return function (gl, effect, width, height, finalYn) {
					// 최종메쉬의 재질을 현재 이펙트로 변경
					tMaterial = tPostEffectMesh['_material'] = effect;
					// 프로그램을 변경
					tProgram = tMaterial['program']
					gl.useProgram(tProgram['webglProgram'])
					// 시스템 유니폼중 업데이트 해야할 목록 처리
					tSystemUniformLocation = tProgram['systemUniformLocation'];
					// 퍼스펙티브 매트릭스 처리
					tLocationInfo = tSystemUniformLocation['uPMatrix'];
					tLocation = tLocationInfo['location'];
					if ( tLocation ) {
						mat4.ortho(
							tMTX, -0.5, // left
							0.5, // right
							-0.5, // bottom
							0.5, // top,
							-tCamera['farClipping'],
							tCamera['farClipping']
						)
						gl.uniformMatrix4fv(tLocation, false, tMTX);
					}
					// 레졸루션 정보 처리
					tLocationInfo = tSystemUniformLocation['uResolution'];
					tLocation = tLocationInfo['location'];
					if ( tLocation ) {
						tResolution[0] = width;
						tResolution[1] = height;
						gl.uniform2fv(tLocation, tResolution);
					}
					// 최종 드로잉일 경우 만 필요
					if ( finalYn ) {
						// 카메라 매트릭스 처리
						tLocationInfo = tSystemUniformLocation['uCameraMatrix'];
						tLocation = tLocationInfo['location'];
						mat4.identity(tMTX);
						gl.uniformMatrix4fv(tLocation, false, tMTX);
					}
				}
			})();
			return (function () {
				var originFrameBufferTexture;
				var lastFrameBufferTexture;
				var setViewportScissorAndBaseUniform;
				var pWidth, pHeight;
				setViewportScissorAndBaseUniform = (function () {
					var tWidth, tHeight;
					return function (gl, tEffect) {
						tWidth = tEffect['frameBuffer']['width'];
						tHeight = tEffect['frameBuffer']['height'];
						if ( pWidth != tWidth || pHeight != tHeight ) {
							gl.viewport(0, 0, tWidth, tHeight);
							gl.scissor(0, 0, tWidth, tHeight);
						}
						// 해당 이펙트의 프레임버퍼 유니폼 정보 업데이트
						setBaseUniform(gl, tEffect, tWidth, tHeight)
						pWidth = tWidth
						pHeight = tHeight
					}
				})();
				return function (redGL, gl, postEffectManager, viewRect, time, renderInfo) {
					pWidth = null;
					pHeight = null;
					// 포스트 이펙터 언바인딩
					postEffectManager.unbind(gl)
					tPostEffectMesh = postEffectManager['children'][0]
					// 프레임 버퍼 정보를 캐싱
					lastFrameBufferTexture = originFrameBufferTexture = postEffectManager['frameBuffer']['texture'];
					// 최종결과는 드로잉버퍼사이즈로 한다.
					// postEffectManager['frameBuffer']['width'] = gl.drawingBufferWidth
					// postEffectManager['frameBuffer']['height'] = gl.drawingBufferHeight
					postEffectManager['frameBuffer']['width'] = viewRect[2]
					postEffectManager['frameBuffer']['height'] = viewRect[3]
					// 포스트 이펙트를 돌면서 갱신해나간다.
					var tList = postEffectManager['postEffectList'].concat();
					if ( postEffectManager['antialiasing'] ) tList.push(postEffectManager['antialiasing']);
					var draw = function (effect) {
						// console.log('Render Effect', v)
						var parentFrameBufferTexture
						var subFrameBufferInfo;
						subFrameBufferInfo = effect['subFrameBufferInfo'];
						// 이펙트 전처리 진행
						if ( effect['process'] && effect['process'].length ) {
							parentFrameBufferTexture = lastFrameBufferTexture
							effect['process'].forEach(function (effect) {
								draw(effect)
							})
						}
						// 이펙트 서브신버퍼를 사용한다면 그림
						if ( subFrameBufferInfo ) {
							subFrameBufferInfo['frameBuffer'].bind(gl);
							// effect['subSceneFrameBuffer']['width'] = tScene['postEffectManager']['frameBuffer']['width']
							// effect['subSceneFrameBuffer']['height'] = tScene['postEffectManager']['frameBuffer']['height']
							gl.viewport(0, 0, subFrameBufferInfo['frameBuffer']['width'], subFrameBufferInfo['frameBuffer']['height']);
							gl.scissor(0, 0, subFrameBufferInfo['frameBuffer']['width'], subFrameBufferInfo['frameBuffer']['height']);
							gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
							self.sceneRender(redGL, gl, tCamera['orthographicYn'], tScene['children'], time, renderInfo, subFrameBufferInfo['renderMaterial']);
							subFrameBufferInfo['frameBuffer'].unbind(gl);
							pWidth = subFrameBufferInfo['frameBuffer']['width']
							pHeight = subFrameBufferInfo['frameBuffer']['height']
						}
						// 이펙트 처리
						if ( effect['frameBuffer'] ) {
							setViewportScissorAndBaseUniform(gl, effect)
							// 해당 이펙트의 프레임 버퍼를 바인딩
							effect.bind(gl);
							// 해당 이펙트의 기본 텍스쳐를 지난 이펙트의 최종 텍스쳐로 업로드
							effect.updateTexture(
								lastFrameBufferTexture,
								parentFrameBufferTexture
							);
							// 해당 이펙트를 렌더링하고
							self.sceneRender(redGL, gl, true, postEffectManager['children'], time, renderInfo);
							// 해당 이펙트의 프레임 버퍼를 언바인딩한다.
							effect.unbind(gl)
							// 현재 이펙트를 최종 텍스쳐로 기록하고 다음 이펙트가 있을경우 활용한다.
							lastFrameBufferTexture = effect['frameBuffer']['texture']
							// console.log(effect)
						}
						// 서브 신버퍼에 프로세스 처리
						if ( subFrameBufferInfo && subFrameBufferInfo['process'] ) {
							subFrameBufferInfo['process'].forEach(function (effect) {
								draw(effect)
							})
						}
					}
					tList.forEach(function (effect) {
						draw(effect)
					})
					// 이펙트가 존재한다면 최종 이펙트의 프레임버퍼 결과물을 최종으로 렌더링한다.
					if ( lastFrameBufferTexture != originFrameBufferTexture ) {
						postEffectManager['_finalMaterial']['diffuseTexture'] = lastFrameBufferTexture;
						gl.viewport(viewRect[0], worldRect[3] - viewRect[3] - viewRect[1], viewRect[2], viewRect[3]);
						gl.scissor(viewRect[0], worldRect[3] - viewRect[3] - viewRect[1], viewRect[2], viewRect[3]);
						// 최종 재질을 기준으로 필요한 기본 유니폼을 세팅한다.
						setBaseUniform(gl, postEffectManager['_finalMaterial'], viewRect[2], viewRect[3], true)
						self.sceneRender(redGL, gl, true, postEffectManager['children'], time, renderInfo);
					}
					postEffectManager['_finalMaterial']['diffuseTexture'] = postEffectManager['frameBuffer']['texture'];
				}
			})()
		})();
		return function (redGL, time) {
			var gl;
			var tViewRect;
			var tRenderInfo
			gl = redGL.gl;
			self = this;
			// 캔버스 사이즈 적용
			worldRect = [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight];
			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
			gl.scissor(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			// glInitialize
			glInitialize(gl);
			// console.log("worldRender", v['key'], t0)
			self['renderInfo'] = {}
			self['cacheAttrInfo'].length = 0
			self['world']['_viewList'].forEach(function (tView) {
				///////////////////////////////////
				// view의 위치/크기결정
				tViewRect = tView['_viewRect']
				tViewRect[0] = tView['_x'];
				tViewRect[1] = tView['_y'];
				tViewRect[2] = tView['_width'];
				tViewRect[3] = tView['_height'];
				tCamera = tView['camera'];
				tScene = tView['scene']
				// 위치/크기의 % 여부를 파싱
				valueParser(tViewRect);
				//
				tRenderInfo = self['renderInfo'][tView['key']] = {
					orthographicYn: tCamera['orthographicYn'],
					x: tView['_x'],
					y: tView['_y'],
					width: tView['_width'],
					height: tView['_height'],
					viewRectX: tViewRect[0],
					viewRectY: tViewRect[1],
					viewRectWidth: tViewRect[2],
					viewRectHeight: tViewRect[3],
					key: tView['key'],
					call: 0
				}
				// viewport 설정
				gl.viewport(tViewRect[0], worldRect[3] - tViewRect[3] - tViewRect[1], tViewRect[2], tViewRect[3]);
				gl.scissor(tViewRect[0], worldRect[3] - tViewRect[3] - tViewRect[1], tViewRect[2], tViewRect[3]);
				if ( tScene['useBackgroundColor'] ) {
					gl.clearColor(tScene['_r'], tScene['_g'], tScene['_b'], 1);
					gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
				} else {
					gl.clearColor(0, 0, 0, 0);
					gl.clear(gl.DEPTH_BUFFER_BIT);
				}
				if ( !(tCamera instanceof RedCamera) ) {
					// 카메라 형식이 아닌경우 컨트롤러로 판단함
					tCamera['update']()
					tCamera = tCamera['camera']
				}
				if ( tCamera['autoUpdateMatrix'] ) tCamera['update']()
				perspectiveMTX = tCamera['perspectiveMTX']
				// view 에 적용할 카메라 퍼스펙티브를 계산
				mat4.identity(perspectiveMTX);
				if ( tCamera['orthographicYn'] ) {
					mat4.ortho(
						perspectiveMTX, -0.5, // left
						0.5, // right
						-0.5, // bottom
						0.5, // top,
						-tCamera['farClipping'],
						tCamera['farClipping']
					)
					mat4.translate(perspectiveMTX, perspectiveMTX, [-0.5, 0.5, 0])
					mat4.scale(perspectiveMTX, perspectiveMTX, [1 / tViewRect[2], -1 / tViewRect[3], 1]);
					mat4.identity(tCamera['matrix'])
					gl.disable(gl.CULL_FACE);
				} else {
					mat4.perspective(
						perspectiveMTX,
						tCamera['fov'] * Math.PI / 180,
						tViewRect[2] / tViewRect[3],
						tCamera['nearClipping'],
						tCamera['farClipping']
					);
					gl.enable(gl.CULL_FACE);
				}
				;
				// 포스트이펙트 확인
				if ( tScene['postEffectManager']['postEffectList'].length ) {
					tScene['postEffectManager'].bind(gl);
					mat4.perspective(
						perspectiveMTX,
						tCamera['fov'] * Math.PI / 180,
						tScene['postEffectManager']['frameBuffer']['width'] / tScene['postEffectManager']['frameBuffer']['height'],
						tCamera['nearClipping'],
						tCamera['farClipping']
					);
					gl.viewport(0, 0, tScene['postEffectManager']['frameBuffer']['width'], tScene['postEffectManager']['frameBuffer']['height']);
					gl.scissor(0, 0, tScene['postEffectManager']['frameBuffer']['width'], tScene['postEffectManager']['frameBuffer']['height']);
				}
				///////////////////////////////
				// 실제렌더 계산
				updateSystemUniform(redGL, time, tScene, tCamera, tViewRect)
				if ( tScene['skyBox'] ) {
					gl.cullFace(gl.FRONT)
					tScene['skyBox']['scaleX'] = tScene['skyBox']['scaleY'] = tScene['skyBox']['scaleZ'] = tCamera['farClipping']
					self.sceneRender(redGL, gl, tCamera['orthographicYn'], [tScene['skyBox']], time, tRenderInfo);
					gl.cullFace(gl.BACK)
					gl.clear(gl.DEPTH_BUFFER_BIT);
				}
				// 그리드가 있으면 그림
				if ( tScene['grid'] ) self.sceneRender(redGL, gl, tCamera['orthographicYn'], [tScene['grid']], time, tRenderInfo);
				// 씬렌더 호출
				self.sceneRender(redGL, gl, tCamera['orthographicYn'], tScene['children'], time, tRenderInfo);
				// asix가 있으면 그림
				if ( tScene['axis'] ) self.sceneRender(redGL, gl, tCamera['orthographicYn'], tScene['axis']['children'], time, tRenderInfo);
				// 디버깅 라이트 업데이트
				if ( lightDebugRenderList.length ) self.sceneRender(redGL, gl, tCamera['orthographicYn'], lightDebugRenderList, time, tRenderInfo);
				// 포스트이펙트 렌더
				if ( tScene['postEffectManager']['postEffectList'].length ) postEffectRender(redGL, gl, tScene['postEffectManager'], tViewRect, time, tRenderInfo)
			})
			if ( this['renderDebuger']['visible'] ) this['renderDebuger'].update(redGL, self['renderInfo'])
		}
	})();
	RedRenderer.prototype.sceneRender = (function () {
		var draw;
		var tPrevIndexBuffer_UUID;
		var tPrevInterleaveBuffer_UUID;
		var tPrevSamplerIndex;
		draw = function (redGL,
		                 gl,
		                 children,
		                 orthographicYn,
		                 time,
		                 renderResultObj,
		                 tCacheInterleaveBuffer,
		                 tCacheUniformInfo,
		                 tCacheBySamplerIndex,
		                 tCacheState,
		                 parentMTX,
		                 subSceneMaterial) {
			var i, i2;
			// 오쏘고날 스케일 비율
			var orthographicYnScale = orthographicYn ? 1 : 1
			//
			var BYTES_PER_ELEMENT;
			var CONVERT_RADIAN;
			//
			var tMesh;
			var tGeometry;
			var tMaterial;
			var tInterleaveDefineInfo;
			var tAttrGroup, tUniformGroup, tSystemUniformGroup;
			var tInterleaveDefineUnit
			var tUniformLocationInfo, tAttributeLocationInfo, tWebGLUniformLocation, tWebGLAttributeLocation;
			var tInterleaveBuffer, tIndexBufferInfo;
			var tUniformValue
			var tRenderType;
			var tMVMatrix, tNMatrix
			var tUUID, noChangeUniform;
			var tSamplerIndex;
			var tSprite3DYn;
			// matix 관련
			var a,
				aSx, aSy, aSz, aCx, aCy, aCz, tRx, tRy, tRz,
				a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33,
				b0, b1, b2, b3,
				b00, b01, b02, b10, b11, b12, b20, b21, b22,
				aX, aY, aZ,
				inverse_c, inverse_d, inverse_e, inverse_g, inverse_f, inverse_h, inverse_i, inverse_j, inverse_k, inverse_l, inverse_n, inverse_o, inverse_A, inverse_m, inverse_p, inverse_r, inverse_s, inverse_B, inverse_t, inverse_u, inverse_v, inverse_w, inverse_x, inverse_y, inverse_z, inverse_C, inverse_D, inverse_E, inverse_q;
			// sin,cos 관련
			var SIN, COS, tRadian, CPI, CPI2, C225, C127, C045, C157;
			//////////////// 변수값 할당 ////////////////
			BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;
			CONVERT_RADIAN = Math.PI / 180
			CPI = 3.141592653589793,
				CPI2 = 6.283185307179586,
				C225 = 0.225,
				C127 = 1.27323954,
				C045 = 0.405284735,
				C157 = 1.5707963267948966;
			//////////////// 렌더시작 ////////////////
			tPrevSamplerIndex = null
			i = children.length
			while ( i-- ) {
				renderResultObj['call']++
				tMesh = children[i]
				tMVMatrix = tMesh['matrix']
				tNMatrix = tMesh['normalMatrix']
				tGeometry = tMesh['_geometry']
				tSprite3DYn = tMesh['sprite3DYn']
				if ( tGeometry ) {
					tMaterial = subSceneMaterial ? subSceneMaterial : tMesh['_material']
					prevProgram_UUID == tMaterial['program']['_UUID'] ? 0 : gl.useProgram(tMaterial['program']['webglProgram'])
					prevProgram_UUID = tMaterial['program']['_UUID']
					// 업데이트할 어트리뷰트와 유니폼 정보를 가져옴
					tAttrGroup = tMaterial['program']['attributeLocation'];
					tUniformGroup = tMaterial['program']['uniformLocation'];
					tSystemUniformGroup = tMaterial['program']['systemUniformLocation'];
					// 버퍼를 찾는다.
					tInterleaveBuffer = tGeometry['interleaveBuffer'] // 인터리브 버퍼
					tIndexBufferInfo = tGeometry['indexBuffer'] // 엘리먼트 버퍼
					/////////////////////////////////////////////////////////////////////////
					/////////////////////////////////////////////////////////////////////////
					// interleaveDefineInfoList 정보를 가져온다.
					tInterleaveDefineInfo = tInterleaveBuffer['interleaveDefineInfoList']
					// 버퍼의 UUID
					tUUID = tInterleaveBuffer['_UUID']
					// 프로그램의 어트리뷰트를 순환한다.
					i2 = tAttrGroup.length
					while ( i2-- ) {
						// 대상 어트리뷰트의 로케이션 정보를 구함
						tAttributeLocationInfo = tAttrGroup[i2]
						// 대상 어트리뷰트의 이름으로 interleaveDefineInfoList에서 단위 인터리브 정보를 가져온다.
						tInterleaveDefineUnit = tInterleaveDefineInfo[tAttributeLocationInfo['name']]
						// 실제 버퍼 바인딩하고 //TODO: 이놈은 검증해야함
						tPrevInterleaveBuffer_UUID == tUUID ? 0 : gl.bindBuffer(gl.ARRAY_BUFFER, tInterleaveBuffer['webglBuffer'])
						tPrevInterleaveBuffer_UUID = tUUID;
						/*
						 어트리뷰트 정보매칭이 안되는 녀석은 무시한다
						 이경우는 버퍼상에는 존재하지만 프로그램에서 사용하지 않는경우이다.
						 */
						if ( tAttributeLocationInfo && tInterleaveDefineUnit ) {
							// webgl location도 알아낸다.
							tWebGLAttributeLocation = tAttributeLocationInfo['location']
							if ( tCacheInterleaveBuffer[tWebGLAttributeLocation] != tInterleaveDefineUnit['_UUID'] ) {
								// 해당로케이션을 활성화된적이없으면 활성화 시킨다
								tAttributeLocationInfo['enabled'] ? 0 : (gl.enableVertexAttribArray(tWebGLAttributeLocation), tAttributeLocationInfo['enabled'] = true)
								gl.vertexAttribPointer(
									tWebGLAttributeLocation,
									tInterleaveDefineUnit['size'],
									tInterleaveBuffer['glArrayType'],
									tInterleaveDefineUnit['normalize'],
									tInterleaveBuffer['stride'] * BYTES_PER_ELEMENT, //stride
									tInterleaveDefineUnit['offset'] * BYTES_PER_ELEMENT //offset
								)
								// 상태 캐싱
								tCacheInterleaveBuffer[tWebGLAttributeLocation] = tInterleaveDefineUnit['_UUID']
							}
						}
					}
					/////////////////////////////////////////////////////////////////////////
					/////////////////////////////////////////////////////////////////////////
					// 유니폼 업데이트
					i2 = tUniformGroup.length
					while ( i2-- ) {
						tUniformLocationInfo = tUniformGroup[i2];
						tWebGLUniformLocation = tUniformLocationInfo['location'];
						tUUID = tUniformLocationInfo['_UUID'];
						tRenderType = tUniformLocationInfo['renderType'];
						tUniformValue = tMaterial[tUniformLocationInfo['materialPropertyName']];
						noChangeUniform = tCacheUniformInfo[tUUID] == tUniformValue;
						// console.log(tCacheInfo)
						if ( tRenderType == 'sampler2D' || tRenderType == 'samplerCube' ) {
							tSamplerIndex = tUniformLocationInfo['samplerIndex']
							// samplerIndex : 0,1 번은 생성용으로 쓴다.
							if ( tUniformValue ) {
								// console.log(tUniformLocationInfo['materialPropertyName'],tUniformValue)
								// console.log(tUniformLocationInfo)
								if ( tCacheBySamplerIndex[tSamplerIndex] == tUniformValue['_UUID'] ) {
									// console.log('온다',tUniformLocationInfo['materialPropertyName'],tSamplerIndex,tSamplerIndex)
								} else {
									// console.log('온다2',tUniformLocationInfo['materialPropertyName'],tSamplerIndex,tSamplerIndex)
									tPrevSamplerIndex == tSamplerIndex ? 0 : gl.activeTexture(gl.TEXTURE0 + (tPrevSamplerIndex = tSamplerIndex));
									if ( tUniformValue['_videoDom'] ) {
										//TODO: 일단 비디오를 우겨넣었으니 정리를 해야함
										gl.bindTexture(gl.TEXTURE_2D, tUniformValue['webglTexture']);
										if ( tUniformValue['_videoDom']['loaded'] ) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tUniformValue['_videoDom'])
										else gl.bindTexture(gl.TEXTURE_2D, tUniformValue['webglTexture']);
									} else {
										gl.bindTexture(tRenderType == 'sampler2D' ? gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP, tUniformValue['webglTexture']);
									}
									tCacheBySamplerIndex[tUUID] == tSamplerIndex ? 0 : gl[tUniformLocationInfo['renderMethod']](tWebGLUniformLocation, tCacheBySamplerIndex[tUUID] = tSamplerIndex);
									tCacheBySamplerIndex[tSamplerIndex] = tUniformValue['_UUID'];
								}
								// 아틀라스 UV검색
								if ( tSystemUniformGroup['uAtlascoord']['location'] ) {
									tUUID = tSystemUniformGroup['uAtlascoord']['_UUID']
									if ( tCacheUniformInfo[tUUID] != tUniformValue['atlascoord']['data']['_UUID'] ) {
										gl.uniform4fv(tSystemUniformGroup['uAtlascoord']['location'], tUniformValue['atlascoord']['data'])
										tCacheUniformInfo[tUUID] = tUniformValue['atlascoord']['data']['_UUID']
									}
								}
							} else {
								// console.log('설마',tUniformLocationInfo['materialPropertyName'])
								if ( tRenderType == 'sampler2D' ) {
									if ( tCacheBySamplerIndex[tSamplerIndex] == 0 ) {
									} else {
										tPrevSamplerIndex == 0 ? 0 : gl.activeTexture(gl.TEXTURE0);
										gl.bindTexture(gl.TEXTURE_2D, redGL['_datas']['emptyTexture']['2d']['webglTexture']);
										tCacheBySamplerIndex[tUUID] == 0 ? 0 : gl[tUniformLocationInfo['renderMethod']](tWebGLUniformLocation, tCacheBySamplerIndex[tUUID] = 0);
										tCacheBySamplerIndex[tSamplerIndex] = 0;
										tPrevSamplerIndex = 0;
									}
								} else {
									if ( tCacheBySamplerIndex[tSamplerIndex] == 1 ) {
									} else {
										tPrevSamplerIndex == 1 ? 0 : gl.activeTexture(gl.TEXTURE0 + 1);
										gl.bindTexture(gl.TEXTURE_CUBE_MAP, redGL['_datas']['emptyTexture']['3d']['webglTexture']);
										tCacheBySamplerIndex[tUUID] == 1 ? 0 : gl[tUniformLocationInfo['renderMethod']](tWebGLUniformLocation, tCacheBySamplerIndex[tUUID] = 1);
										tCacheBySamplerIndex[tSamplerIndex] = 1;
										tPrevSamplerIndex = 1;
									}
								}
							}
						} else {
							tUniformValue == undefined ? RedGLUtil.throwFunc('RedRenderer : Material에 ', tUniformLocationInfo['materialPropertyName'], '이 정의 되지않았습니다.') : 0;
							tRenderType == 'float' ? noChangeUniform ? 0 : gl[tUniformLocationInfo['renderMethod']](tWebGLUniformLocation, tCacheUniformInfo[tUUID] = tUniformValue) :
								tRenderType == 'int' ? noChangeUniform ? 0 : gl[tUniformLocationInfo['renderMethod']](tWebGLUniformLocation, tCacheUniformInfo[tUUID] = tUniformValue) :
									tRenderType == 'bool' ? noChangeUniform ? 0 : gl[tUniformLocationInfo['renderMethod']](tWebGLUniformLocation, tCacheUniformInfo[tUUID] = tUniformValue) :
										tRenderType == 'vec' ? gl[tUniformLocationInfo['renderMethod']](tWebGLUniformLocation, tUniformValue) :
											tRenderType == 'mat' ? gl[tUniformLocationInfo['renderMethod']](tWebGLUniformLocation, false, tUniformValue) :
												RedGLUtil.throwFunc('RedRenderer : 처리할수없는 타입입니다.', 'tRenderType -', tRenderType)
						}
					}
				}
				/////////////////////////////////////////////////////////////////////////
				/////////////////////////////////////////////////////////////////////////
				// tMVMatrix
				// tMVMatrix 초기화
				if ( tMesh['autoUpdateMatrix'] ) {
					tMVMatrix[0] = 1, tMVMatrix[1] = 0, tMVMatrix[2] = 0, tMVMatrix[3] = 0,
						tMVMatrix[4] = 0, tMVMatrix[5] = 1, tMVMatrix[6] = 0, tMVMatrix[7] = 0,
						tMVMatrix[8] = 0, tMVMatrix[9] = 0, tMVMatrix[10] = 1, tMVMatrix[11] = 0,
						tMVMatrix[12] = 0, tMVMatrix[13] = 0, tMVMatrix[14] = 0, tMVMatrix[15] = 1,
						a = tMVMatrix,
						// tMVMatrix translate
						aX = tMesh['x'], aY = tMesh['y'], aZ = tMesh['z'],
						a[12] = a[0] * aX + a[4] * aY + a[8] * aZ + a[12],
						a[13] = a[1] * aX + a[5] * aY + a[9] * aZ + a[13],
						a[14] = a[2] * aX + a[6] * aY + a[10] * aZ + a[14],
						a[15] = a[3] * aX + a[7] * aY + a[11] * aZ + a[15],
						// tMVMatrix rotate
						tSprite3DYn ?
							(tRx = 0 * CONVERT_RADIAN, tRy = 0 * CONVERT_RADIAN, tRz = 0) :
							(tRx = tMesh['rotationX'] * CONVERT_RADIAN, tRy = tMesh['rotationY'] * CONVERT_RADIAN, tRz = tMesh['rotationZ'] * CONVERT_RADIAN),
						/////////////////////////
						tRadian = tRx % CPI2,
						tRadian < -CPI ? tRadian = tRadian + CPI2 : tRadian > CPI ? tRadian = tRadian - CPI2 : 0,
						tRadian = tRadian < 0 ? C127 * tRadian + C045 * tRadian * tRadian : C127 * tRadian - C045 * tRadian * tRadian,
						aSx = tRadian < 0 ? C225 * (tRadian * -tRadian - tRadian) + tRadian : C225 * (tRadian * tRadian - tRadian) + tRadian,
						tRadian = (tRx + C157) % CPI2,
						tRadian < -CPI ? tRadian = tRadian + CPI2 : tRadian > CPI ? tRadian = tRadian - CPI2 : 0,
						tRadian = tRadian < 0 ? C127 * tRadian + C045 * tRadian * tRadian : C127 * tRadian - C045 * tRadian * tRadian,
						aCx = tRadian < 0 ? C225 * (tRadian * -tRadian - tRadian) + tRadian : C225 * (tRadian * tRadian - tRadian) + tRadian,
						tRadian = tRy % CPI2,
						tRadian < -CPI ? tRadian = tRadian + CPI2 : tRadian > CPI ? tRadian = tRadian - CPI2 : 0,
						tRadian = tRadian < 0 ? C127 * tRadian + C045 * tRadian * tRadian : C127 * tRadian - C045 * tRadian * tRadian,
						aSy = tRadian < 0 ? C225 * (tRadian * -tRadian - tRadian) + tRadian : C225 * (tRadian * tRadian - tRadian) + tRadian,
						tRadian = (tRy + C157) % CPI2,
						tRadian < -CPI ? tRadian = tRadian + CPI2 : tRadian > CPI ? tRadian = tRadian - CPI2 : 0,
						tRadian = tRadian < 0 ? C127 * tRadian + C045 * tRadian * tRadian : C127 * tRadian - C045 * tRadian * tRadian,
						aCy = tRadian < 0 ? C225 * (tRadian * -tRadian - tRadian) + tRadian : C225 * (tRadian * tRadian - tRadian) + tRadian,
						tRadian = tRz % CPI2,
						tRadian < -CPI ? tRadian = tRadian + CPI2 : tRadian > CPI ? tRadian = tRadian - CPI2 : 0,
						tRadian = tRadian < 0 ? C127 * tRadian + C045 * tRadian * tRadian : C127 * tRadian - C045 * tRadian * tRadian,
						aSz = tRadian < 0 ? C225 * (tRadian * -tRadian - tRadian) + tRadian : C225 * (tRadian * tRadian - tRadian) + tRadian,
						tRadian = (tRz + C157) % CPI2,
						tRadian < -CPI ? tRadian = tRadian + CPI2 : tRadian > CPI ? tRadian = tRadian - CPI2 : 0,
						tRadian = tRadian < 0 ? C127 * tRadian + C045 * tRadian * tRadian : C127 * tRadian - C045 * tRadian * tRadian,
						aCz = tRadian < 0 ? C225 * (tRadian * -tRadian - tRadian) + tRadian : C225 * (tRadian * tRadian - tRadian) + tRadian,
						/////////////////////////
						a00 = a[0], a01 = a[1], a02 = a[2],
						a10 = a[4], a11 = a[5], a12 = a[6],
						a20 = a[8], a21 = a[9], a22 = a[10],
						b00 = aCy * aCz, b01 = aSx * aSy * aCz - aCx * aSz, b02 = aCx * aSy * aCz + aSx * aSz,
						b10 = aCy * aSz, b11 = aSx * aSy * aSz + aCx * aCz, b12 = aCx * aSy * aSz - aSx * aCz,
						b20 = -aSy, b21 = aSx * aCy, b22 = aCx * aCy,
						a[0] = a00 * b00 + a10 * b01 + a20 * b02, a[1] = a01 * b00 + a11 * b01 + a21 * b02, a[2] = a02 * b00 + a12 * b01 + a22 * b02,
						a[4] = a00 * b10 + a10 * b11 + a20 * b12, a[5] = a01 * b10 + a11 * b11 + a21 * b12, a[6] = a02 * b10 + a12 * b11 + a22 * b12,
						a[8] = a00 * b20 + a10 * b21 + a20 * b22, a[9] = a01 * b20 + a11 * b21 + a21 * b22, a[10] = a02 * b20 + a12 * b21 + a22 * b22,
						// tMVMatrix scale
						aX = tMesh['scaleX'], aY = tMesh['scaleY'] * orthographicYnScale, aZ = tMesh['scaleZ'],
						a[0] = a[0] * aX, a[1] = a[1] * aX, a[2] = a[2] * aX, a[3] = a[3] * aX,
						a[4] = a[4] * aY, a[5] = a[5] * aY, a[6] = a[6] * aY, a[7] = a[7] * aY,
						a[8] = a[8] * aZ, a[9] = a[9] * aZ, a[10] = a[10] * aZ, a[11] = a[11] * aZ,
						a[12] = a[12], a[13] = a[13], a[14] = a[14], a[15] = a[15],
						// 부모가있으면 곱함
						parentMTX ? (
								// 부모매트릭스 복사
								// 매트립스 곱
								a00 = parentMTX[0], a01 = parentMTX[1], a02 = parentMTX[2], a03 = parentMTX[3],
									a10 = parentMTX[4], a11 = parentMTX[5], a12 = parentMTX[6], a13 = parentMTX[7],
									a20 = parentMTX[8], a21 = parentMTX[9], a22 = parentMTX[10], a23 = parentMTX[11],
									a30 = parentMTX[12], a31 = parentMTX[13], a32 = parentMTX[14], a33 = parentMTX[15],
									// Cache only the current line of the second matrix
									b0 = tMVMatrix[0], b1 = tMVMatrix[1], b2 = tMVMatrix[2], b3 = tMVMatrix[3],
									tMVMatrix[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30,
									tMVMatrix[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31,
									tMVMatrix[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32,
									tMVMatrix[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33,
									b0 = tMVMatrix[4], b1 = tMVMatrix[5], b2 = tMVMatrix[6], b3 = tMVMatrix[7],
									tMVMatrix[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30,
									tMVMatrix[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31,
									tMVMatrix[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32,
									tMVMatrix[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33,
									b0 = tMVMatrix[8], b1 = tMVMatrix[9], b2 = tMVMatrix[10], b3 = tMVMatrix[11],
									tMVMatrix[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30,
									tMVMatrix[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31,
									tMVMatrix[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32,
									tMVMatrix[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33,
									b0 = tMVMatrix[12], b1 = tMVMatrix[13], b2 = tMVMatrix[14], b3 = tMVMatrix[15],
									tMVMatrix[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30,
									tMVMatrix[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31,
									tMVMatrix[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32,
									tMVMatrix[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33
							) : 0
				} else {
					a = tMVMatrix
				}
				/////////////////////////////////////////////////////////////////////////
				/////////////////////////////////////////////////////////////////////////
				if ( tGeometry ) {
					gl.uniformMatrix4fv(tSystemUniformGroup['uMMatrix']['location'], false, tMVMatrix)
				}
				/////////////////////////////////////////////////////////////////////////
				/////////////////////////////////////////////////////////////////////////
				// 노말매트릭스를 사용할경우
				if ( tGeometry && tSystemUniformGroup['uNMatrix']['location'] ) {
					//클론
					// mat4Inverse
					inverse_c = tMVMatrix[0], inverse_d = tMVMatrix[1], inverse_e = tMVMatrix[2], inverse_g = tMVMatrix[3],
						inverse_f = tMVMatrix[4], inverse_h = tMVMatrix[5], inverse_i = tMVMatrix[6], inverse_j = tMVMatrix[7],
						inverse_k = tMVMatrix[8], inverse_l = tMVMatrix[9], inverse_n = tMVMatrix[10], inverse_o = tMVMatrix[11],
						inverse_m = tMVMatrix[12], inverse_p = tMVMatrix[13], inverse_r = tMVMatrix[14], inverse_s = tMVMatrix[15],
						inverse_A = inverse_c * inverse_h - inverse_d * inverse_f,
						inverse_B = inverse_c * inverse_i - inverse_e * inverse_f,
						inverse_t = inverse_c * inverse_j - inverse_g * inverse_f,
						inverse_u = inverse_d * inverse_i - inverse_e * inverse_h,
						inverse_v = inverse_d * inverse_j - inverse_g * inverse_h,
						inverse_w = inverse_e * inverse_j - inverse_g * inverse_i,
						inverse_x = inverse_k * inverse_p - inverse_l * inverse_m,
						inverse_y = inverse_k * inverse_r - inverse_n * inverse_m,
						inverse_z = inverse_k * inverse_s - inverse_o * inverse_m,
						inverse_C = inverse_l * inverse_r - inverse_n * inverse_p,
						inverse_D = inverse_l * inverse_s - inverse_o * inverse_p,
						inverse_E = inverse_n * inverse_s - inverse_o * inverse_r,
						inverse_q = inverse_A * inverse_E - inverse_B * inverse_D + inverse_t * inverse_C + inverse_u * inverse_z - inverse_v * inverse_y + inverse_w * inverse_x,
						inverse_q = 1 / inverse_q,
						tNMatrix[0] = (inverse_h * inverse_E - inverse_i * inverse_D + inverse_j * inverse_C) * inverse_q,
						tNMatrix[1] = (-inverse_d * inverse_E + inverse_e * inverse_D - inverse_g * inverse_C) * inverse_q,
						tNMatrix[2] = (inverse_p * inverse_w - inverse_r * inverse_v + inverse_s * inverse_u) * inverse_q,
						tNMatrix[3] = (-inverse_l * inverse_w + inverse_n * inverse_v - inverse_o * inverse_u) * inverse_q,
						tNMatrix[4] = (-inverse_f * inverse_E + inverse_i * inverse_z - inverse_j * inverse_y) * inverse_q,
						tNMatrix[5] = (inverse_c * inverse_E - inverse_e * inverse_z + inverse_g * inverse_y) * inverse_q,
						tNMatrix[6] = (-inverse_m * inverse_w + inverse_r * inverse_t - inverse_s * inverse_B) * inverse_q,
						tNMatrix[7] = (inverse_k * inverse_w - inverse_n * inverse_t + inverse_o * inverse_B) * inverse_q,
						tNMatrix[8] = (inverse_f * inverse_D - inverse_h * inverse_z + inverse_j * inverse_x) * inverse_q,
						tNMatrix[9] = (-inverse_c * inverse_D + inverse_d * inverse_z - inverse_g * inverse_x) * inverse_q,
						tNMatrix[10] = (inverse_m * inverse_v - inverse_p * inverse_t + inverse_s * inverse_A) * inverse_q,
						tNMatrix[11] = (-inverse_k * inverse_v + inverse_l * inverse_t - inverse_o * inverse_A) * inverse_q,
						tNMatrix[12] = (-inverse_f * inverse_C + inverse_h * inverse_y - inverse_i * inverse_x) * inverse_q,
						tNMatrix[13] = (inverse_c * inverse_C - inverse_d * inverse_y + inverse_e * inverse_x) * inverse_q,
						tNMatrix[14] = (-inverse_m * inverse_u + inverse_p * inverse_B - inverse_r * inverse_A) * inverse_q,
						tNMatrix[15] = (inverse_k * inverse_u - inverse_l * inverse_B + inverse_n * inverse_A) * inverse_q,
						// transpose
						a01 = tNMatrix[1], a02 = tNMatrix[2], a03 = tNMatrix[3],
						a12 = tNMatrix[6], a13 = tNMatrix[7], a23 = tNMatrix[11],
						tNMatrix[1] = tNMatrix[4], tNMatrix[2] = tNMatrix[8], tNMatrix[3] = tNMatrix[12], tNMatrix[4] = a01, tNMatrix[6] = tNMatrix[9],
						tNMatrix[7] = tNMatrix[13], tNMatrix[8] = a02, tNMatrix[9] = a12, tNMatrix[11] = tNMatrix[14],
						tNMatrix[12] = a03, tNMatrix[13] = a13, tNMatrix[14] = a23,
						// uNMatrix 입력
						gl.uniformMatrix4fv(tSystemUniformGroup['uNMatrix']['location'], false, tNMatrix)
				}
				if ( tGeometry ) {
					/////////////////////////////////////////////////////////////////////////
					/////////////////////////////////////////////////////////////////////////
					// 상태처리
					if ( tSystemUniformGroup['uPointSize']['location'] ) {
						tCacheState['pointSize'] != tMesh['pointSize'] ? gl.uniform1f(tSystemUniformGroup['uPointSize']['location'], tCacheState['pointSize'] = tMesh['pointSize']) : 0
					}
					// 컬페이스 사용여부 캐싱처리
					tCacheState['useCullFace'] != tMesh['useCullFace'] ? (tCacheState['useCullFace'] = tMesh['useCullFace']) ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE) : 0;
					// 컬페이스 캐싱처리
					tCacheState['cullFace'] != tMesh['cullFace'] ? gl.cullFace(tCacheState['cullFace'] = tMesh['cullFace']) : 0;
					// 뎁스테스트 사용여부 캐싱처리
					tCacheState['useDepthTest'] != tMesh['useDepthTest'] ? (tCacheState['useDepthTest'] = tMesh['useDepthTest']) ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST) : 0;
					// 뎁스테스팅 캐싱처리
					tCacheState['depthTestFunc'] != tMesh['depthTestFunc'] ? gl.depthFunc(tCacheState['depthTestFunc'] = tMesh['depthTestFunc']) : 0;
					// 블렌딩 사용여부 캐싱처리
					tCacheState['useBlendMode'] != tMesh['useBlendMode'] ? (tCacheState['useBlendMode'] = tMesh['useBlendMode']) ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND) : 0;
					// 블렌딩팩터 캐싱처리
					if ( tCacheState['blendSrc'] != tMesh['blendSrc'] || tCacheState['blendDst'] != tMesh['blendDst'] ) {
						gl.blendFunc(tMesh['blendSrc'], tMesh['blendDst'])
						tCacheState['blendSrc'] = tMesh['blendSrc']
						tCacheState['blendDst'] = tMesh['blendDst']
					}
					if ( tSystemUniformGroup['uSprite3DYn']['location'] ) {
						tUUID = tSystemUniformGroup['uSprite3DYn']['_UUID']
						tUniformValue = tSprite3DYn
						if ( tCacheUniformInfo[tUUID] != tUniformValue ) {
							gl[tSystemUniformGroup['uSprite3DYn']['renderMethod']](tSystemUniformGroup['uSprite3DYn']['location'], tUniformValue)
							tCacheUniformInfo[tUUID] = tUniformValue
						}
						tUUID = tSystemUniformGroup['uPerspectiveScale']['_UUID']
						tUniformValue = tMesh['perspectiveScale']
						if ( tCacheUniformInfo[tUUID] != tUniformValue ) {
							gl[tSystemUniformGroup['uPerspectiveScale']['renderMethod']](tSystemUniformGroup['uPerspectiveScale']['location'], tUniformValue)
							tCacheUniformInfo[tUUID] = tUniformValue
						}
					}
					/////////////////////////////////////////////////////////////////////////
					/////////////////////////////////////////////////////////////////////////
					// 드로우
					if ( tIndexBufferInfo ) {
						tPrevIndexBuffer_UUID == tIndexBufferInfo['_UUID'] ? 0 : gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexBufferInfo['webglBuffer'])
						//enum mode, long count, enum type, long offset
						gl.drawElements(
							tMesh['drawMode'],
							tIndexBufferInfo['pointNum'],
							tIndexBufferInfo['glArrayType'],
							0
						);
						tPrevIndexBuffer_UUID = tIndexBufferInfo['_UUID'];
					} else gl.drawArrays(tMesh['drawMode'], 0, tInterleaveBuffer['pointNum'])
				}
				/////////////////////////////////////////////////////////////////////////
				/////////////////////////////////////////////////////////////////////////
				if ( tMesh['children'].length ) {
					draw(
						redGL,
						gl,
						tMesh['children'],
						orthographicYn,
						time,
						renderResultObj,
						tCacheInterleaveBuffer,
						tCacheUniformInfo,
						tCacheBySamplerIndex,
						tCacheState,
						tMVMatrix,
						subSceneMaterial
					)
				}
			}
		}
		return function (redGL, gl, orthographicYn, children, time, renderResultObj, subSceneMaterial) {
			// TODO: 이제 아래부분을 날릴수 있을것 같은데? 체크해봐야함
			if ( this['cacheState']['pointSize'] == undefined ) this['cacheState']['pointSize'] = null
			if ( !this['cacheState']['useCullFace'] ) this['cacheState']['useCullFace'] = null
			if ( !this['cacheState']['cullFace'] ) this['cacheState']['cullFace'] = null
			if ( !this['cacheState']['useDepthTest'] ) this['cacheState']['useDepthTest'] = null
			if ( !this['cacheState']['depthTestFunc'] ) this['cacheState']['depthTestFunc'] = null
			if ( !this['cacheState']['useBlendMode'] ) this['cacheState']['useBlendMode'] = null
			if ( !this['cacheState']['blendSrc'] ) this['cacheState']['blendSrc'] = null
			if ( !this['cacheState']['blendDst'] ) this['cacheState']['blendDst'] = null
			this['cacheBySamplerIndex'].length = 0
			// this['cacheBySamplerIndex'][0] = null
			// this['cacheBySamplerIndex'][1] = null
			draw(
				redGL,
				gl,
				children,
				orthographicYn,
				time,
				renderResultObj,
				this['cacheAttrInfo'],
				this['cacheUniformInfo'],
				this['cacheBySamplerIndex'],
				this['cacheState'],
				undefined,
				subSceneMaterial
			)
		}
	})()
	Object.freeze(RedRenderer);
})();