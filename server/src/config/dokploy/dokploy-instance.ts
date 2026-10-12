import { BadGatewayException, Logger } from '@nestjs/common';
import axios, { type AxiosRequestConfig, isAxiosError } from 'axios';

const logger = new Logger('Dokploy');

export const dokployAxios = axios.create({ timeout: 30_000 });

dokployAxios.interceptors.response.use(undefined, (error: unknown) => {
  const procedure = isAxiosError(error) ? error.config?.url : undefined;
  const status = isAxiosError(error) ? error.response?.status : undefined;
  const body = isAxiosError(error) ? error.response?.data : undefined;
  logger.error(
    `${procedure} failed (${status ?? 'unreachable'}): ${JSON.stringify(body)}`,
  );
  throw new BadGatewayException(`Dokploy request ${procedure} failed`);
});

export const dokployInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> =>
  dokployAxios({ ...config, ...options }).then(
    (response) => response.data as T,
  );
