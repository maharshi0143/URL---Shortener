const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toHourBucketIso = (timestamp) => {
  const parsed = new Date(timestamp);
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
};

const pairsToObject = (pairs) => {
  const result = {};
  for (let i = 0; i < pairs.length; i += 2) {
    result[pairs[i]] = pairs[i + 1];
  }

  return result;
};

const parseReadResult = (readResult) => {
  if (!Array.isArray(readResult) || readResult.length === 0) {
    return [];
  }

  const [, messages] = readResult[0];
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.map(([id, fields]) => ({
    id,
    fields: pairsToObject(fields)
  }));
};

class ClickProcessor {
  constructor({ redis, pool, logger, env }) {
    this.redis = redis;
    this.pool = pool;
    this.logger = logger;
    this.env = env;
    this.running = false;
    this.claimCursor = '0-0';
  }

  async ensureConsumerGroup() {
    try {
      await this.redis.xgroup(
        'CREATE',
        this.env.streamName,
        this.env.consumerGroup,
        '0',
        'MKSTREAM'
      );
      this.logger.info({ stream: this.env.streamName, group: this.env.consumerGroup }, 'Created consumer group');
    } catch (error) {
      if (!String(error.message).includes('BUSYGROUP')) {
        throw error;
      }
    }
  }

  async readNewMessages() {
    const result = await this.redis.xreadgroup(
      'GROUP',
      this.env.consumerGroup,
      this.env.consumerName,
      'COUNT',
      this.env.batchSize,
      'BLOCK',
      this.env.blockMs,
      'STREAMS',
      this.env.streamName,
      '>'
    );

    return parseReadResult(result);
  }

  async claimStaleMessages() {
    try {
      const response = await this.redis.xautoclaim(
        this.env.streamName,
        this.env.consumerGroup,
        this.env.consumerName,
        this.env.claimIdleMs,
        this.claimCursor,
        'COUNT',
        this.env.claimBatchSize
      );

      if (!Array.isArray(response) || response.length < 2) {
        return [];
      }

      const [nextCursor, messages] = response;
      this.claimCursor = nextCursor || '0-0';

      if (!Array.isArray(messages)) {
        return [];
      }

      return messages.map(([id, fields]) => ({
        id,
        fields: pairsToObject(fields)
      }));
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to claim stale messages');
      return [];
    }
  }

  async ackIds(ids) {
    if (!ids.length) {
      return;
    }

    await this.redis.xack(this.env.streamName, this.env.consumerGroup, ...ids);
  }

  async persistBatch(batchRows) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const values = [];
      const placeholders = [];
      let index = 1;

      for (const row of batchRows) {
        placeholders.push(`($${index}, $${index + 1}, $${index + 2})`);
        values.push(row.streamId, row.shortCode, row.hour);
        index += 3;
      }

      const insertedResult = await client.query(
        `
          INSERT INTO processed_click_events (stream_id, short_code, hour)
          VALUES ${placeholders.join(', ')}
          ON CONFLICT (stream_id) DO NOTHING
          RETURNING short_code, hour
        `,
        values
      );

      const aggregateMap = new Map();
      for (const row of insertedResult.rows) {
        const hourIso = new Date(row.hour).toISOString();
        const key = `${row.short_code}|${hourIso}`;
        aggregateMap.set(key, (aggregateMap.get(key) || 0) + 1);
      }

      if (aggregateMap.size > 0) {
        const aggregateValues = [];
        const aggregatePlaceholders = [];
        let aggregateIndex = 1;

        for (const [key, count] of aggregateMap.entries()) {
          const [shortCode, hour] = key.split('|');
          aggregatePlaceholders.push(`($${aggregateIndex}, $${aggregateIndex + 1}, $${aggregateIndex + 2})`);
          aggregateValues.push(shortCode, hour, count);
          aggregateIndex += 3;
        }

        await client.query(
          `
            INSERT INTO analytics_hourly (short_code, hour, click_count)
            VALUES ${aggregatePlaceholders.join(', ')}
            ON CONFLICT (short_code, hour)
            DO UPDATE SET click_count = analytics_hourly.click_count + EXCLUDED.click_count
          `,
          aggregateValues
        );
      }

      await client.query('COMMIT');
      return {
        insertedRows: insertedResult.rowCount,
        aggregates: aggregateMap.size
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async processMessages(messages) {
    if (!messages.length) {
      return;
    }

    const validRows = [];
    const invalidIds = [];

    for (const message of messages) {
      const shortCode = message.fields.short_code;
      if (!shortCode) {
        invalidIds.push(message.id);
        continue;
      }

      validRows.push({
        streamId: message.id,
        shortCode,
        hour: toHourBucketIso(message.fields.timestamp)
      });
    }

    if (invalidIds.length) {
      this.logger.warn({ invalidCount: invalidIds.length }, 'Acknowledging malformed stream messages');
      await this.ackIds(invalidIds);
    }

    if (!validRows.length) {
      return;
    }

    const result = await this.persistBatch(validRows);
    await this.ackIds(validRows.map((row) => row.streamId));

    this.logger.info(
      {
        batchSize: messages.length,
        insertedRows: result.insertedRows,
        aggregateBuckets: result.aggregates
      },
      'Processed click message batch'
    );
  }

  async run() {
    await this.ensureConsumerGroup();
    this.running = true;

    this.logger.info(
      {
        stream: this.env.streamName,
        group: this.env.consumerGroup,
        consumer: this.env.consumerName
      },
      'Worker started'
    );

    while (this.running) {
      try {
        let processed = false;

        const newMessages = await this.readNewMessages();
        if (newMessages.length) {
          processed = true;
          await this.processMessages(newMessages);
        }

        const staleMessages = await this.claimStaleMessages();
        if (staleMessages.length) {
          processed = true;
          await this.processMessages(staleMessages);
        }

        if (!processed) {
          await sleep(100);
        }
      } catch (error) {
        this.logger.error({ err: error }, 'Worker loop error');
        await sleep(500);
      }
    }

    this.logger.info('Worker loop stopped');
  }

  stop() {
    this.running = false;
  }
}

module.exports = ClickProcessor;
