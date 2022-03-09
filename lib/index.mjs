import {
  BigInt,
  FunctionBind,
  Map,
  MapPrototypeGet,
  MapSet,
  MathCeil,
  MathFloor,
  ObjectCreate,
  ObjectDefineProperties,
  ObjectPrototype,
  RangeError,
  StringFromCharCode,
  StringCharCodeAt,
  Symbol,
  SymbolToStringTag,
  TypeError,
  TypedArrayLength,
  TypedArraySlice,
  Uint8Array,
  Uint8ArrayOf
} from '@dwlib/primordials';
import IsBuffer from '@dwlib/abstract/IsBuffer';
import IsUint8Array from '@dwlib/abstract/IsUint8Array';
import ToString from '@dwlib/abstract/ToString';
import ToIntegerOrInfinity from '@dwlib/abstract/ToIntegerOrInfinity';
import ToBigInt from '@dwlib/abstract/ToBigInt';
import IsObject from '@dwlib/abstract/IsObject';
import {
  encode as UTF8Encode,
  decode as UTF8Decode
} from '@dwlib/utf8';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const FACTOR = 4 / 3;
const INVERSE_FACTOR = 3 / 4;

const ENCODING_SHIFTS = Uint8ArrayOf(2, 4, 6);
const ENCODING_MASKS = Uint8ArrayOf(3, 0xf, 0x3f);
const ENCODING_DIGITS = Uint8ArrayOf(4, 2, 0);

const DECODING_SHIFTS = Uint8ArrayOf(2, 4, 6, 0);
const DECODING_MASKS = Uint8ArrayOf(0, 0xf, 3, 0);
const DECODING_DIGITS = Uint8ArrayOf(0, 4, 2, 0);

const PADDING = Symbol();

const CreateLookups = alphabet => {
  const ALPHABET_LOOKUP = new Map();
  const BASE_MAP = new Map();
  const BASE_MAP_LOOKUP = new Map();
  for (let i = 0; i < 64; i++) {
    const char = alphabet[i];
    const charCode = StringCharCodeAt(alphabet, i);
    MapSet(ALPHABET_LOOKUP, char, i);
    MapSet(BASE_MAP, i, charCode);
    MapSet(BASE_MAP_LOOKUP, charCode, i);
  }
  return {
    ALPHABET_LOOKUP,
    BASE_MAP,
    BASE_MAP_LOOKUP
  };
}

const {
  ALPHABET_LOOKUP,
  BASE_MAP,
  BASE_MAP_LOOKUP
} = CreateLookups(ALPHABET);

const GetAlphabetCharIndex = FunctionBind(MapPrototypeGet, ALPHABET_LOOKUP);
const GetAlphabetCharCodeByIndex = FunctionBind(MapPrototypeGet, BASE_MAP);
const GetAlphabetCharIndexByCode = FunctionBind(MapPrototypeGet, BASE_MAP_LOOKUP);

const RequireBuffer = argument => {
  if (!IsBuffer(argument)) {
    throw new TypeError('`buffer` is not an instance of ArrayBuffer or ArrayBufferView');
  }
}

const RequireOptionsObject = argument => {
  if (!IsObject(argument)) {
    throw new TypeError('`options` is not an object');
  }
}

const GetEncodingBytes = (length, index) => {
  const remaining = length - index;
  return remaining < 3 ? remaining : 3;
}

const GetDecodingBytes = (length, index) => {
  const remaining = length - index;
  return remaining < 4 ? remaining : 4;
}

const GetPaddedLength = length => {
  const remainder = length % 4;
  return remainder ? length + (4 - remainder) : length;
}

const GetCapacity = (length, withPadding) => {
  const capacity = MathCeil(length * FACTOR);
  return withPadding ? GetPaddedLength(capacity) : capacity;
}

const GetInverseCapacity = length => MathCeil(length * INVERSE_FACTOR);

const Encode = (string, withPadding) => {
  const length = string.length;
  if (!length) {
    return '';
  }
  let result = '';
  let position = 0;
  for (let i = 0; i < length; i += 3) {
    const bytes = GetEncodingBytes(length, i);
    let carry = 0;
    for (let j = 0; j < bytes; j++) {
      const charCode = StringCharCodeAt(string, position++);
      if (charCode > 0xff) {
        throw new RangeError('Invalid ASCII encoding');
      }
      const charIndex = carry + (charCode >> ENCODING_SHIFTS[j]);
      result += ALPHABET[charIndex];
      carry = (charCode & ENCODING_MASKS[j]) << ENCODING_DIGITS[j];
    }
    result += ALPHABET[carry];
  }
  if (withPadding) {
    const paddedLength = GetPaddedLength(result.length);
    while (result.length < paddedLength) {
      result += '=';
    }
  }
  return result;
}

const EncodeToBytes = (string, withPadding) => {
  const length = string.length;
  if (!length) {
    return new Uint8Array(0);
  }
  const capacity = GetCapacity(length, withPadding);
  const result = new Uint8Array(capacity);
  let index = 0;
  let position = 0;
  for (let i = 0; i < length; i += 3) {
    const bytes = GetEncodingBytes(length, i);
    let carry = 0;
    for (let j = 0; j < bytes; j++) {
      const charCode = StringCharCodeAt(string, position++);
      if (charCode > 0xff) {
        throw new RangeError('Invalid ASCII encoding');
      }
      const charIndex = carry + (charCode >> ENCODING_SHIFTS[j]);
      result[index++] = GetAlphabetCharCodeByIndex(charIndex);
      carry = (charCode & ENCODING_MASKS[j]) << ENCODING_DIGITS[j];
    }
    result[index++] = GetAlphabetCharCodeByIndex(carry);
  }
  if (withPadding) {
    while (index < capacity) {
      result[index++] = 0x3d;
    }
  }
  return result;
}

const Decode = (encodedString, ignorePadding, allowConcatenation) => {
  const length = encodedString.length;
  if (!length) {
    return '';
  }
  let result = '';
  let position = 0;
  for (let i = 0; i < length; i += 4) {
    try {
      const bytes = GetDecodingBytes(length, position);
      let carry = 0;
      for (let j = 0; j < bytes; j++) {
        const charCode = StringCharCodeAt(encodedString, position++);
        const charIndex = GetAlphabetCharIndexByCode(charCode);
        if (charIndex === undefined) {
          if (charCode === 0x3d && !ignorePadding) {
            throw PADDING;
          }
          throw new RangeError('Invalid Base64URL encoding');
        }
        const mask = DECODING_MASKS[j];
        const shift = DECODING_SHIFTS[j];
        if (mask) {
          const charCode = carry + (charIndex >> DECODING_DIGITS[j]);
          result += StringFromCharCode(charCode);
          carry = (charIndex & mask) << shift;
        } else {
          carry += charIndex << shift;
        }
      }
      result += StringFromCharCode(carry);
    } catch (e) {
      if (e === PADDING) {
        if (allowConcatenation) {
          while (position < length && encodedString[position] === '=') {
            position++;
          }
          i = position;
          continue;
        }
        break;
      }
      throw e;
    }
  }
  return result;
}

const DecodeToBytes = (encodedString, ignorePadding, allowConcatenation) => {
  const length = encodedString.length;
  if (!length) {
    return new Uint8Array(0);
  }
  const capacity = GetInverseCapacity(length);
  const result = new Uint8Array(capacity);
  let index = 0;
  let position = 0;
  for (let i = 0; i < length; i += 4) {
    try {
      const bytes = GetDecodingBytes(length, position);
      let carry = 0;
      for (let j = 0; j < bytes; j++) {
        const charCode = StringCharCodeAt(encodedString, position++);
        const charIndex = GetAlphabetCharIndexByCode(charCode);
        if (charIndex === undefined) {
          if (charCode === 0x3d && !ignorePadding) {
            throw PADDING;
          }
          throw new RangeError('Invalid Base64URL encoding');
        }
        const mask = DECODING_MASKS[j];
        const shift = DECODING_SHIFTS[j];
        if (mask) {
          result[index++] = carry + (charIndex >> DECODING_DIGITS[j]);
          carry = (charIndex & mask) << shift;
        } else {
          carry += charIndex << shift;
        }
      }
      result[index++] = carry;
    } catch (e) {
      if (e === PADDING) {
        if (allowConcatenation) {
          while (position < length && encodedString[position] === '=') {
            position++;
          }
          i = position;
          continue;
        }
        break;
      }
      throw e;
    }
  }
  return capacity !== index ? TypedArraySlice(result, 0, index) : result;
}

const EncodeBytes = (buffer, withPadding) => {
  const source = IsUint8Array(buffer) ? buffer : new Uint8Array(buffer);
  const length = TypedArrayLength(source);
  if (!length) {
    return new Uint8Array(0);
  }
  const capacity = GetCapacity(length, withPadding);
  const result = new Uint8Array(capacity);
  let index = 0;
  let position = 0;
  for (let i = 0; i < length; i += 3) {
    const bytes = GetEncodingBytes(length, i);
    let carry = 0;
    for (let j = 0; j < bytes; j++) {
      const byte = source[position++];
      const charIndex = carry + (byte >> ENCODING_SHIFTS[j]);
      result[index++] = GetAlphabetCharCodeByIndex(charIndex);
      carry = (byte & ENCODING_MASKS[j]) << ENCODING_DIGITS[j];
    }
    result[index++] = GetAlphabetCharCodeByIndex(carry);
  }
  if (withPadding) {
    while (index < capacity) {
      result[index++] = 0x3d;
    }
  }
  return result;
}

const EncodeBytesToString = (buffer, withPadding) => {
  const source = IsUint8Array(buffer) ? buffer : new Uint8Array(buffer);
  const length = TypedArrayLength(source);
  if (!length) {
    return '';
  }
  let result = '';
  let position = 0;
  for (let i = 0; i < length; i += 3) {
    const bytes = GetEncodingBytes(length, i);
    let carry = 0;
    for (let j = 0; j < bytes; j++) {
      const byte = source[position++];
      const charIndex = carry + (byte >> ENCODING_SHIFTS[j]);
      result += ALPHABET[charIndex];
      carry = (byte & ENCODING_MASKS[j]) << ENCODING_DIGITS[j];
    }
    result += ALPHABET[carry];
  }
  if (withPadding) {
    const paddedLength = GetPaddedLength(result.length);
    while (result.length < paddedLength) {
      result += '=';
    }
  }
  return result;
}

const DecodeBytes = (buffer, ignorePadding, allowConcatenation) => {
  const source = IsUint8Array(buffer) ? buffer : new Uint8Array(buffer);
  const length = TypedArrayLength(source);
  if (!length) {
    return new Uint8Array(0);
  }
  const capacity = GetInverseCapacity(length);
  const result = new Uint8Array(capacity);
  let index = 0;
  let position = 0;
  for (let i = 0; i < length; i += 4) {
    try {
      const bytes = GetDecodingBytes(length, position);
      let carry = 0;
      for (let j = 0; j < bytes; j++) {
        const charCode = source[position++];
        const charIndex = GetAlphabetCharIndexByCode(charCode);
        if (charIndex === undefined) {
          if (charCode === 0x3d && !ignorePadding) {
            throw PADDING;
          }
          throw new RangeError('Invalid Base64URL encoding');
        }
        const mask = DECODING_MASKS[j];
        const shift = DECODING_SHIFTS[j];
        if (mask) {
          result[index++] = carry + (charIndex >> DECODING_DIGITS[j]);
          carry = (charIndex & mask) << shift;
        } else {
          carry += charIndex << shift;
        }
      }
      result[index++] = carry;
    } catch (e) {
      if (e === PADDING) {
        if (allowConcatenation) {
          while (position < length && source[position] === 0x3d) {
            position++;
          }
          i = position;
          continue;
        }
        break;
      }
      throw e;
    }
  }
  return capacity !== index ? TypedArraySlice(result, 0, index) : result;
}

const DecodeBytesToString = (buffer, ignorePadding, allowConcatenation) => {
  const source = IsUint8Array(buffer) ? buffer : new Uint8Array(buffer);
  const length = TypedArrayLength(source);
  if (!length) {
    return '';
  }
  let result = '';
  let position = 0;
  for (let i = 0; i < length; i += 4) {
    try {
      const bytes = GetDecodingBytes(length, position);
      let carry = 0;
      for (let j = 0; j < bytes; j++) {
        const charCode = source[position++];
        const charIndex = GetAlphabetCharIndexByCode(charCode);
        if (charIndex === undefined) {
          if (charCode === 0x3d && !ignorePadding) {
            throw PADDING;
          }
          throw new RangeError('Invalid Base64URL encoding');
        }
        const mask = DECODING_MASKS[j];
        const shift = DECODING_SHIFTS[j];
        if (mask) {
          const charCode = carry + (charIndex >> DECODING_DIGITS[j]);
          result += StringFromCharCode(charCode);
          carry = (charIndex & mask) << shift;
        } else {
          carry += charIndex << shift;
        }
      }
      result += StringFromCharCode(carry);
    } catch (e) {
      if (e === PADDING) {
        if (allowConcatenation) {
          while (position < length && source[position] === 0x3d) {
            position++;
          }
          i = position;
          continue;
        }
        break;
      }
      throw e;
    }
  }
  return result;
}

const EncodeText = (text, withPadding) => {
  const buffer = UTF8Encode(text);
  return EncodeBytesToString(buffer, withPadding);
}

const EncodeTextToBytes = (text, withPadding) => {
  const buffer = UTF8Encode(text);
  return EncodeBytes(buffer, withPadding);
}

const DecodeText = (encodedString, ignorePadding, allowConcatenation) => {
  const buffer = DecodeToBytes(encodedString, ignorePadding, allowConcatenation);
  return UTF8Decode(buffer);
}

const DecodeBytesToText = (buffer, ignorePadding, allowConcatenation) => {
  const bytes = DecodeBytes(buffer, ignorePadding, allowConcatenation);
  return UTF8Decode(bytes);
}

const EncodeInt = integer => {
  if (!integer) {
    return 'A';
  }
  let result = '';
  let carry = integer;
  while (carry) {
    const charIndex = carry % 64;
    const char = ALPHABET[charIndex];
    result = `${char}${result}`;
    carry = MathFloor(carry / 64);
  }
  return result;
}

const DecodeInt = encodedInteger => {
  const length = encodedInteger.length;
  if (!length) {
    return NaN;
  }
  let leadingZeros = 0;
  while (leadingZeros < length && encodedInteger[leadingZeros] === 'A') {
    leadingZeros++;
  }
  let result = 0;
  for (let i = leadingZeros; i < length; i++) {
    const char = encodedInteger[i];
    const charIndex = GetAlphabetCharIndex(char);
    if (charIndex === undefined) {
      return NaN;
    }
    result = result * 64 + charIndex;
  }
  return result;
}

export const encode = (string, options) => {
  const $string = ToString(string);
  let withPadding = false;
  if (options !== undefined) {
    RequireOptionsObject(options);
    withPadding = !!options.withPadding;
  }
  return Encode($string, withPadding);
}

export const encodeToBytes = (string, options) => {
  const $string = ToString(string);
  let withPadding = false;
  if (options !== undefined) {
    RequireOptionsObject(options);
    withPadding = !!options.withPadding;
  }
  return EncodeToBytes($string, withPadding);
}

export const decode = (encodedString, options) => {
  const $encodedString = ToString(encodedString);
  let ignorePadding = true;
  let allowConcatenation = false;
  if (options !== undefined) {
    RequireOptionsObject(options);
    const $ignorePadding = options.ignorePadding;
    if ($ignorePadding !== undefined) {
      ignorePadding = !!$ignorePadding;
    }
    allowConcatenation = !!options.allowConcatenation;
  }
  return Decode($encodedString, ignorePadding, allowConcatenation);
}

export const decodeToBytes = (encodedString, options) => {
  const $encodedString = ToString(encodedString);
  let ignorePadding = true;
  let allowConcatenation = false;
  if (options !== undefined) {
    RequireOptionsObject(options);
    const $ignorePadding = options.ignorePadding;
    if ($ignorePadding !== undefined) {
      ignorePadding = !!$ignorePadding;
    }
    allowConcatenation = !!options.allowConcatenation;
  }
  return DecodeToBytes($encodedString, ignorePadding, allowConcatenation);
}

export const encodeBytes = (buffer, options) => {
  RequireBuffer(buffer);
  let withPadding = false;
  if (options !== undefined) {
    RequireOptionsObject(options);
    withPadding = !!options.withPadding;
  }
  return EncodeBytes(buffer, withPadding);
}

export const encodeBytesToString = (buffer, options) => {
  RequireBuffer(buffer);
  let withPadding = false;
  if (options !== undefined) {
    RequireOptionsObject(options);
    withPadding = !!options.withPadding;
  }
  return EncodeBytesToString(buffer, withPadding);
}

export const decodeBytes = (buffer, options) => {
  RequireBuffer(buffer);
  let ignorePadding = true;
  let allowConcatenation = false;
  if (options !== undefined) {
    RequireOptionsObject(options);
    const $ignorePadding = options.ignorePadding;
    if ($ignorePadding !== undefined) {
      ignorePadding = !!$ignorePadding;
    }
    allowConcatenation = !!options.allowConcatenation;
  }
  return DecodeBytes(buffer, ignorePadding, allowConcatenation);
}

export const decodeBytesToString = (buffer, options) => {
  RequireBuffer(buffer);
  let ignorePadding = true;
  let allowConcatenation = false;
  if (options !== undefined) {
    RequireOptionsObject(options);
    const $ignorePadding = options.ignorePadding;
    if ($ignorePadding !== undefined) {
      ignorePadding = !!$ignorePadding;
    }
    allowConcatenation = !!options.allowConcatenation;
  }
  return DecodeBytesToString(buffer, ignorePadding, allowConcatenation);
}

export const encodeText = (text, options) => {
  const $text = ToString(text);
  let withPadding = false;
  if (options !== undefined) {
    RequireOptionsObject(options);
    withPadding = !!options.withPadding;
  }
  return EncodeText($text, withPadding);
}

export const encodeTextToBytes = (text, options) => {
  const $text = ToString(text);
  let withPadding = false;
  if (options !== undefined) {
    RequireOptionsObject(options);
    withPadding = !!options.withPadding;
  }
  return EncodeTextToBytes($text, withPadding);
}

export const decodeText = (encodedString, options) => {
  const $encodedString = ToString(encodedString);
  let ignorePadding = true;
  let allowConcatenation = false;
  if (options !== undefined) {
    RequireOptionsObject(options);
    const $ignorePadding = options.ignorePadding;
    if ($ignorePadding !== undefined) {
      ignorePadding = !!$ignorePadding;
    }
    allowConcatenation = !!options.allowConcatenation;
  }
  return DecodeText($encodedString, ignorePadding, allowConcatenation);
}

export const decodeBytesToText = (buffer, options) => {
  RequireBuffer(buffer);
  let ignorePadding = true;
  let allowConcatenation = false;
  if (options !== undefined) {
    RequireOptionsObject(options);
    const $ignorePadding = options.ignorePadding;
    if ($ignorePadding !== undefined) {
      ignorePadding = !!$ignorePadding;
    }
    allowConcatenation = !!options.allowConcatenation;
  }
  return DecodeBytesToText(buffer, ignorePadding, allowConcatenation);
}

export const encodeInt = integer => {
  const $integer = ToIntegerOrInfinity(integer);
  if ($integer < 0) {
    throw new RangeError('`integer` cannot be negative');
  }
  if ($integer === Infinity) {
    throw new RangeError('`integer` is not finite');
  }
  return EncodeInt($integer);
}

export const decodeInt = encodedInteger => {
  const $encodedInteger = ToString(encodedInteger);
  return DecodeInt($encodedInteger);
}

export const Base64URL = ObjectCreate(ObjectPrototype, {
  encode: {
    value: encode
  },
  encodeToBytes: {
    value: encodeToBytes
  },
  decode: {
    value: decode
  },
  decodeToBytes: {
    value: decodeToBytes
  },
  encodeBytes: {
    value: encodeBytes
  },
  encodeBytesToString: {
    value: encodeBytesToString
  },
  decodeBytes: {
    value: decodeBytes
  },
  decodeBytesToString: {
    value: decodeBytesToString
  },
  encodeText: {
    value: encodeText
  },
  encodeTextToBytes: {
    value: encodeTextToBytes
  },
  decodeText: {
    value: decodeText
  },
  decodeBytesToText: {
    value: decodeBytesToText
  },
  encodeInt: {
    value: encodeInt
  },
  decodeInt: {
    value: decodeInt
  },
  [SymbolToStringTag]: {
    value: 'Base64URL'
  }
});
export default Base64URL;

export let encodeBigInt;
export let decodeBigInt;

if (BigInt) {
  const BIGINT_ZERO = BigInt(0);
  const BIGINT_BASE = BigInt(64);

  const EncodeBigInt = bigint => {
    if (!bigint) {
      return 'A';
    }
    let result = '';
    let carry = bigint;
    while (carry) {
      const charIndex = carry % BIGINT_BASE;
      const char = ALPHABET[charIndex];
      result = `${char}${result}`;
      carry /= BIGINT_BASE;
    }
    return result;
  }

  const DecodeBigInt = encodedInteger => {
    const length = encodedInteger.length;
    if (!length) {
      throw new RangeError('Invalid Base64URL encoded integer');
    }
    let leadingZeros = 0;
    while (leadingZeros < length && encodedInteger[leadingZeros] === 'A') {
      leadingZeros++;
    }
    let result = BIGINT_ZERO;
    for (let i = leadingZeros; i < length; i++) {
      const char = encodedInteger[i];
      const charIndex = GetAlphabetCharIndex(char);
      if (charIndex === undefined) {
        throw new RangeError('Invalid Base64URL encoded integer');
      }
      result = result * BIGINT_BASE + BigInt(charIndex);
    }
    return result;
  }

  encodeBigInt = bigint => {
    const $bigint = ToBigInt(bigint);
    if ($bigint < BIGINT_ZERO) {
      throw new RangeError('`bigint` cannot be negative');
    }
    return EncodeBigInt($bigint);
  }

  decodeBigInt = encodedInteger => {
    const $encodedInteger = ToString(encodedInteger);
    return DecodeBigInt($encodedInteger);
  }

  ObjectDefineProperties(Base64URL, {
    encodeBigInt: {
      value: encodeBigInt
    },
    decodeBigInt: {
      value: decodeBigInt
    }
  });
}
