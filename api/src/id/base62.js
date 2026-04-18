const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = BigInt(ALPHABET.length);

const encodeBigInt = (value) => {
  let current = BigInt(value);

  if (current < 0n) {
    throw new Error('Base62 does not support negative values');
  }

  if (current === 0n) {
    return '0';
  }

  let encoded = '';
  while (current > 0n) {
    const remainder = Number(current % BASE);
    encoded = ALPHABET[remainder] + encoded;
    current /= BASE;
  }

  return encoded;
};

const encodeBuffer = (buffer) => {
  const hex = buffer.toString('hex');
  return encodeBigInt(BigInt(`0x${hex}`));
};

module.exports = {
  ALPHABET,
  encodeBigInt,
  encodeBuffer
};
