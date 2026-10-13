import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

// Local hosts and IPs (localhost, VM-IP) have no TLD.
const URL_OPTIONS = { require_tld: false, require_protocol: true };

class EnvironmentVariables {
  //Server Configuration
  @IsIn(['development', 'production', 'test'])
  NODE_ENV = 'development';

  @IsInt()
  PORT: number = 4000;

  //Database Configuration
  @IsUrl({ ...URL_OPTIONS, protocols: ['postgresql', 'postgres'] })
  DATABASE_URL: string;

  //Auth Configuration
  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  JWT_REFRESH_SESSION_EXPIRES_IN: string = '1d';

  //Entra ID Configuration
  @IsString()
  @IsNotEmpty()
  ENTRA_TENANT_ID: string;

  @IsString()
  @IsNotEmpty()
  ENTRA_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  ENTRA_CLIENT_SECRET: string;

  @IsUrl(URL_OPTIONS)
  ENTRA_REDIRECT_URI: string;

  //Dokploy Configuration
  @IsUrl(URL_OPTIONS)
  DOKPLOY_URL: string;

  @IsNotEmpty()
  DOKPLOY_API_KEY: string;

  @IsInt()
  @Min(1024)
  @Max(65535)
  PROJECT_PORT_RANGE_START: number = 20000;

  @IsInt()
  @Min(1024)
  @Max(65535)
  PROJECT_PORT_RANGE_END: number = 29999;

  //CORS Configuration
  @IsUrl(URL_OPTIONS)
  FRONTEND_URL: string;

  @IsNotEmpty()
  DOMAIN: string;
}

export function validateEnv(config: object) {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return env;
}
