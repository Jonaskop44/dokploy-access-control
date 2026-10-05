import { z } from 'zod';

export const EnvSchema = z.object({
  //Server Configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(4000),

  //Database Configuration
  DATABASE_URL: z.url(),

  //Auth Configuration
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SESSION_EXPIRES_IN: z.string().default('1d'),

  //Entra ID Configuration
  ENTRA_TENANT_ID: z.string().min(1),
  ENTRA_CLIENT_ID: z.string().min(1),
  ENTRA_CLIENT_SECRET: z.string().min(1),
  ENTRA_REDIRECT_URI: z.url(),

  //CORS Configuration
  FRONTEND_URL: z.url(),
  DOMAIN: z.string().min(1),
});

export type Env = z.infer<typeof EnvSchema>;
