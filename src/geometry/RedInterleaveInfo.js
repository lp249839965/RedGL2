"use strict";
var RedInterleaveInfo;
(function () {
	/**DOC:
	 {
		 constructorYn : true,
		 title :`RedInterleaveInfo`,
		 description : `
			 RedInterleaveInfo Instance 생성자
		 `,
		 params : {
			 attributeKey : [
				 {type:'String'},
				 `쉐이더내의 attributeKey키`
			 ],
			 size : [
				 {type:'Number'},
				 `구성 사이즈`
			 ],
			 normalize : [
				 {type:'Booleab\n'},
				 `버퍼 업로드시 노멀라이징 여부`,
				 `기본값 : false`
			 ]
		 },
		 example : `
			 RedInterleaveInfo('aVertexPosition', 3);
		 `,
		 return : 'RedBuffer Instance'
	 }
	 :DOC*/
	RedInterleaveInfo = function (attributeKey, size, normalize) {
		if ( !(this instanceof RedInterleaveInfo) ) return new RedInterleaveInfo(attributeKey, size, normalize);
		typeof attributeKey == 'string' || RedGLUtil.throwFunc('RedInterleaveInfo : attributeKey - 문자열만 허용', attributeKey);
		attributeKey.charAt(0) == 'a' || RedGLUtil.throwFunc('RedInterleaveInfo : attributeKey 첫글자는 a로 시작해야합니다.', attributeKey);
		attributeKey.charAt(1) == attributeKey.charAt(1).toUpperCase() || RedInterleaveInfo.throwFunc('RedInterleaveInfo : attributeKey 두번째 글자는 대문자 시작해야합니다.', attributeKey);
		typeof size == 'number' || RedGLUtil.throwFunc('RedInterleaveInfo : size - 숫자만 허용', size);
		/**DOC:
		 {
		     code : 'PROPERTY',
			 title :`attributeKey`,
			 description : '쉐이더상 접근할 어트리뷰트 키',
			 return : 'String'
		 }
		 :DOC*/
		this['attributeKey'] = attributeKey;
		/**DOC:
		 {
		     code : 'PROPERTY',
			 title :`size`,
			 description : '어트리뷰트 사이즈',
			 return : 'Int'
		 }
		 :DOC*/
		this['size'] = size;
		/**DOC:
		 {
		     code : 'PROPERTY',
			 title :`normalize`,
			 description : `
			    기본값 : false
		     `,
			 return : 'Boolean'
		 }
		 :DOC*/
		this['normalize'] = normalize == undefined ? false : true;
		/**DOC:
		 {
		     code : 'PROPERTY',
			 title :`offset`,
			 description : `
			    RedBuffer 생성시 자동 주입됨.
			 `,
			 return : 'Int'
		 }
		 :DOC*/
		this['offset'] = null;// RedBuffer생성시 주입됨
	};
	Object.freeze(RedInterleaveInfo);
})();