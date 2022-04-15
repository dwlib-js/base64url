import GetIntrinsicOrThrow from '#intrinsics/GetIntrinsicOrThrow';
import ObjectCreate from '#primordials/ObjectCreate';
import ReflectDefineProperty from '#primordials/ReflectDefineProperty';
import Base64URLDecode from './decode.mjs';
import Base64URLDecodeInto from './decodeInto.mjs';
import Base64URLEncode from './encode.mjs';
import Base64URLIsValid from './isValid.mjs';
import Base64URLNormalize from './normalize.mjs';
import Base64URLValidate from './validate.mjs';

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

export default Base64URL;
