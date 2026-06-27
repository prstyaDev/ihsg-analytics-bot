import { z } from 'zod';
import 'dotenv/config';

const schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string(),
  GOAPI_KEY: z.string(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
  AGGREGATOR_API_KEY: z.string(),
  AGGREGATOR_BASE_URL: z.string().default('https://lite.koboillm.com/v1'),
  AGGREGATOR_MODEL: z.string().default('openai/gpt-4o'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
});

export const env = schema.parse(process.env);   