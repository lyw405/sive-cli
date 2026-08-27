import { ApiError } from '../core/http.js';
import { logger } from './logger.js';

/**
 * 包装命令的 action：统一捕获异常，打印错误并以非零退出码结束，
 * 保证 CI/CD 流水线能感知失败。
 */
export function wrapAction<T extends unknown[]>(fn: (...args: T) => Promise<void>) {
  return async (...args: T): Promise<void> => {
    try {
      await fn(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        logger.error(error.message);
        logger.debug(JSON.stringify(error.detail ?? {}, null, 2));
      } else if (error instanceof Error) {
        logger.error(error.message);
      } else {
        logger.error(String(error));
      }
      process.exitCode = 1;
    }
  };
}
