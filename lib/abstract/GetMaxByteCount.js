'use strict';

const MathFloor = require('#primordials/MathFloor');

const GetMaxByteCount = charCount => MathFloor(charCount / 4 * 3);

module.exports = GetMaxByteCount;
