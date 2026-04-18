const { z } = require('zod');

const shortenSchema = z.object({
  url: z.string().url().max(2048),
  strategy: z.enum(['hash', 'snowflake']),
  expires_at: z
    .string()
    .optional()
    .nullable()
    .refine((value) => {
      if (!value) {
        return true;
      }

      const parsed = Date.parse(value);
      return Number.isFinite(parsed) && parsed > Date.now();
    }, 'expires_at must be a valid future ISO datetime')
});

const shortCodeSchema = z.object({
  shortCode: z.string().regex(/^[0-9A-Za-z]{1,16}$/)
});

const validate = (schema, selector) => (req, res, next) => {
  const payload = selector(req);
  const result = schema.safeParse(payload);

  if (!result.success) {
    const issue = result.error.issues[0];
    return res.status(400).json({
      error: issue ? issue.message : 'Invalid request payload'
    });
  }

  Object.assign(payload, result.data);
  return next();
};

const validateShortenRequest = validate(shortenSchema, (req) => req.body);
const validateShortCodeParam = validate(shortCodeSchema, (req) => req.params);

module.exports = {
  validateShortenRequest,
  validateShortCodeParam
};
