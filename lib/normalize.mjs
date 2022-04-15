import ToString from '#abstract/ToString';
import NormalizeString from '#abstract-functions/NormalizeString';
import ToErrorMode from '#abstract-functions/ToErrorMode';

const normalize = (string, errorMode) => {
  const chars = ToString(string);
  const mode = errorMode === undefined ? 'break' : ToErrorMode(errorMode);
  return NormalizeString(chars, mode);
}

export default normalize;
