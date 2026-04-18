const crypto = require('node:crypto');
const { ALPHABET, encodeBuffer } = require('./base62');

const randomChar = () => ALPHABET[crypto.randomInt(0, ALPHABET.length)];

const fitToLength = (raw, length) => {
  if (raw.length >= length) {
    return raw.slice(0, length);
  }

  let value = raw;
  while (value.length < length) {
    value += randomChar();
  }

  return value;
};

const generate = ({
  originalUrl,
  attempt,
  salt,
  length
}) => {
  const payload = `${originalUrl}|${Date.now()}|${attempt}|${salt}|${crypto.randomUUID()}`;
  const digest = crypto.createHash('sha256').update(payload).digest();
  const base62 = encodeBuffer(digest);

  return fitToLength(base62, length);
};

module.exports = {
  generate
};
