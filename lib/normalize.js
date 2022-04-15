'use strict';

const ToString = require('#abstract/ToString');
const NormalizeString = require('#abstract-functions/NormalizeString');
const ToErrorMode = require('#abstract-functions/ToErrorMode');

const normalize = (string, errorMode) => {
  const chars = ToString(string);
  const mode = errorMode === undefined ? 'break' : ToErrorMode(errorMode);
  return NormalizeString(chars, mode);
}

module.exports = normalize;
