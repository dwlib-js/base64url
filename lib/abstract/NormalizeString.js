'use strict';

const NormalizeStringBreak = require('./NormalizeStringBreak');
const NormalizeStringIgnore = require('./NormalizeStringIgnore');
const ValidateString = require('./ValidateString');

const NormalizeString = (string, errorMode) => {
  const normalize = (
    errorMode === 'strict' ? ValidateString :
    errorMode === 'ignore' ? NormalizeStringIgnore : NormalizeStringBreak
  );
  return normalize(string);
}

module.exports = NormalizeString;
