const { encodeBigInt } = require('./base62');

const NODE_ID_BITS = 10n;
const SEQUENCE_BITS = 12n;
const MAX_NODE_ID = (1n << NODE_ID_BITS) - 1n;
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n;

class SnowflakeGenerator {
  constructor(nodeId, epoch) {
    const parsedNodeId = BigInt(nodeId);
    if (parsedNodeId < 0n || parsedNodeId > MAX_NODE_ID) {
      throw new Error(`snowflake node_id out of range: ${nodeId}`);
    }

    this.nodeId = parsedNodeId;
    this.epoch = BigInt(epoch);
    this.sequence = 0n;
    this.lastTimestamp = -1n;
  }

  currentTimestamp() {
    return BigInt(Date.now());
  }

  waitNextMillis(lastTimestamp) {
    let timestamp = this.currentTimestamp();
    while (timestamp <= lastTimestamp) {
      timestamp = this.currentTimestamp();
    }

    return timestamp;
  }

  nextId() {
    let timestamp = this.currentTimestamp();
    if (timestamp < this.lastTimestamp) {
      throw new Error('System clock moved backwards for snowflake generator');
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & MAX_SEQUENCE;
      if (this.sequence === 0n) {
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    const shiftedTimestamp = (timestamp - this.epoch) << 22n;
    const shiftedNodeId = this.nodeId << SEQUENCE_BITS;

    return shiftedTimestamp | shiftedNodeId | this.sequence;
  }

  nextCode() {
    return encodeBigInt(this.nextId());
  }
}

module.exports = {
  SnowflakeGenerator
};
