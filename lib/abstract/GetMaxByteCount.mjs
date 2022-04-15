import MathFloor from '#primordials/MathFloor';

const GetMaxByteCount = charCount => MathFloor(charCount / 4 * 3);

export default GetMaxByteCount;
