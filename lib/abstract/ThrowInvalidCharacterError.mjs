import RangeError from '#primordials/RangeError';

const ThrowInvalidCharacterError = index => {
  throw new RangeError(`Invalid Base64URL character at index ${index}`);
}

export default ThrowInvalidCharacterError;
