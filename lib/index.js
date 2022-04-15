'use strict';

const GetIntrinsicOrThrow = require('#intrinsics/GetIntrinsicOrThrow');
const ObjectCreate = require('#primordials/ObjectCreate');
const ReflectDefineProperty = require('#primordials/ReflectDefineProperty');
const Base64URLDecode = require('./decode');
const Base64URLDecodeInto = require('./decodeInto');
const Base64URLEncode = require('./encode');
const Base64URLIsValid = require('./isValid');
const Base64URLNormalize = require('./normalize');
const Base64URLValidate = require('./validate');

const ObjectPrototype = GetIntrinsicOrThrow('Object.prototype');
const SymbolToStringTag = GetIntrinsicOrThrow('@@toStringTag');

const Base64URL = ObjectCreate(ObjectPrototype, {
  decode: {
    value: Base64URLDecode
  },
  decodeInto: {
    value: Base64URLDecodeInto
  },
  encode: {
    value: Base64URLEncode
  },
  isValid: {
    value: Base64URLIsValid
  },
  normalize: {
    value: Base64URLNormalize
  },
  validate: {
    value: Base64URLValidate
  }
});
ReflectDefineProperty(Base64URL, SymbolToStringTag, {
  value: 'Base64URL'
});

module.exports = Base64URL;
