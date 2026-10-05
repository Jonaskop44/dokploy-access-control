import axios, { type AxiosRequestConfig } from "axios";

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

let refreshPromise: Promise<unknown> | null = null;

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error)) throw error;

    const originalRequest = error.config as
      (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isRefreshCall = originalRequest?.url?.includes("/auth/refresh");

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isRefreshCall
    ) {
      throw error;
    }
    originalRequest._retry = true;

    refreshPromise ??= axiosInstance.post("/api/v1/auth/refresh").finally(() => {
      refreshPromise = null;
    });

    await refreshPromise;
    return axiosInstance(originalRequest);
  },
);

type CancelablePromise<T> = Promise<T> & { cancel: () => void };

// Orval-Mutator: generierte Hooks rufen customInstance<T>(config, options) auf.
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): CancelablePromise<T> => {
  const controller = new AbortController();
  const promise = axiosInstance({
    ...config,
    ...options,
    signal: controller.signal,
  }).then((response) => response.data) as CancelablePromise<T>;

  promise.cancel = () => controller.abort();

  return promise;
};

export default customInstance;
