import TypedArrayLength from '#primordials/TypedArrayLength';
import ALPHABET from '#internal/ALPHABET';

const EncodeBytes = buffer => {
  const length = TypedArrayLength(buffer);
  let string = '';
  let bits = 0;
  let carry = 0;
  for (let i = 0; i < length; i++) {
    const byte = buffer[i];
    carry = (carry << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      const charIndex = (carry >>> bits) & 0x3f;
      string += ALPHABET[charIndex];
    }
  }
  if (bits) {
    const charIndex = (carry << (6 - bits)) & 0x3f;
    string += ALPHABET[charIndex];
  }
  return string;
}

export default EncodeBytes;
