import AlphabetIndexOf from '#internal/AlphabetIndexOf';

const NormalizeStringBreak = string => {
  const length = string.length;
  let normalized = '';
  for (let i = 0; i < length; i++) {
    const char = string[i];
    const charIndex = AlphabetIndexOf(char);
    if (charIndex === undefined) {
      break;
    }
    normalized += char;
  }
  return normalized;
}

export default NormalizeStringBreak;
