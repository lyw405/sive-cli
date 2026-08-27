import axios, { AxiosError, type AxiosInstance } from 'axios';
import { getApiKey } from './config.js';
import { logger } from '../utils/logger.js';

export const DEFAULT_BASE_URL = 'https://sive.antv.antgroup.com/api/open/v1';

/** 面向用户的接口/网络错误，消息可直接展示在终端 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 创建统一的 axios 客户端：
 * - 自动注入 x-api-key 请求头
 * - 支持 SIVE_BASE_URL 环境变量覆盖服务地址（联调/预发环境）
 * - 响应拦截器统一转换错误为可读的 ApiError
 */
export function createClient(): AxiosInstance {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new ApiError('尚未登录：请先运行 `sive login`，或设置环境变量 SIVE_API_KEY');
  }

  const client = axios.create({
    baseURL: process.env.SIVE_BASE_URL || DEFAULT_BASE_URL,
    timeout: 60_000,
    headers: { 'x-api-key': apiKey },
  });

  client.interceptors.request.use((config) => {
    logger.debug(`${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ message?: string; error?: string }>) => {
      if (!error.response) {
        throw new ApiError(`网络请求失败：${error.message}`);
      }
      const { status, data } = error.response;
      if (status === 401) {
        throw new ApiError('API Key 无效或已过期，请重新运行 `sive login`', status);
      }
      const message = data?.message || data?.error || `请求失败（HTTP ${status}）`;
      throw new ApiError(String(message), status, data);
    },
  );

  return client;
}
