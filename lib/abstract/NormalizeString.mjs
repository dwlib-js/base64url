import NormalizeStringBreak from './NormalizeStringBreak.mjs';
import NormalizeStringIgnore from './NormalizeStringIgnore.mjs';
import ValidateString from './ValidateString.mjs';

const NormalizeString = (string, errorMode) => {
  const normalize = (
    errorMode === 'strict' ? ValidateString :
    errorMode === 'ignore' ? NormalizeStringIgnore : NormalizeStringBreak
  );
  return normalize(string);
}

export default NormalizeString;
