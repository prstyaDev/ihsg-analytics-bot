import { z } from 'zod';
import 'dotenv/config';

const schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string(),
  GOAPI_KEY: z.string(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
  AGGREGATOR_API_KEY: z.string(),
  AGGREGATOR_BASE_URL: z.string().default('https://lite.koboillm.com/v1'),
  AGGREGATOR_MODEL: z.string().default('openai/gpt-4o'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  
  /**
   * Alert worker check interval in milliseconds
   * Controls how frequently the background worker checks active price alerts
   * 
   * Recommended range: 60000-300000ms (1-5 minutes)
   * Default: 120000ms (2 minutes)
   * 
   * Lower values = more responsive alerts but higher API usage
   * Higher values = reduced API calls but slower alert responses
   */
  ALERT_CHECK_INTERVAL_MS: z.coerce.number().default(120000),
});

export const env = schema.parse(process.env);   