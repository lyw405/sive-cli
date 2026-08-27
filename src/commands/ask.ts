import type { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createClient, ApiError } from '../core/http.js';
import { createApp, getAppInfo, type AppType } from '../api/index.js';
import { logger } from '../utils/logger.js';
import { wrapAction } from '../utils/action.js';

/** CLI 参数 → 官方应用类型编号：1=数据单图 2=数据报告 */
const TYPE_MAP: Record<string, AppType> = {
  chart: 1,
  report: 2,
};

const POLL_INTERVAL_MS = 3_000;
const DEFAULT_TIMEOUT_SECONDS = 600;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface AskOptions {
  type?: string;
  timeout?: string;
}

export function registerAskCommand(program: Command): void {
  program
    .command('ask <prompt>')
    .description('用自然语言生成数据应用（数据单图 / 数据报告）')
    .option('-t, --type <type>', '应用类型：chart（数据单图）| report（数据报告）', 'report')
    .option('--timeout <seconds>', `等待生成完成的超时时间（默认 ${DEFAULT_TIMEOUT_SECONDS}s）`)
    .action(
      wrapAction(async (prompt: string, options: AskOptions) => {
        const appType = TYPE_MAP[options.type?.toLowerCase() ?? ''];
        if (!appType) {
          throw new Error(`不支持的应用类型：${options.type}（可选：chart | report）`);
        }
        const timeoutSeconds = Number(options.timeout ?? DEFAULT_TIMEOUT_SECONDS);
        if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
          throw new Error('--timeout 必须为正数（单位：秒）');
        }

        const client = createClient();
        const spinner = ora('提交生成请求…').start();
        const { id: appId } = await createApp(client, { type: appType, prompt });
        logger.debug(`应用已创建：${appId}`);

        const startedAt = Date.now();
        try {
          // 轮询生成状态：not_started → streaming → finished | aborted | error
          for (;;) {
            const info = await getAppInfo(client, appId);
            const elapsed = Math.round((Date.now() - startedAt) / 1000);

            if (info.aiStatus === 'finished') {
              spinner.succeed('应用生成完成');
              logger.info(`${chalk.bold('应用 ID')}    ${appId}`);
              if (info.name) logger.info(`${chalk.bold('名称')}       ${info.name}`);
              if (info.previewUrl) {
                logger.info(`${chalk.bold('预览地址')}   ${info.previewUrl}`);
              }
              return;
            }
            if (info.aiStatus === 'aborted') {
              spinner.fail('生成被中断（aborted）');
              throw new ApiError(`应用 ${appId} 的生成被中断`);
            }
            if (info.aiStatus === 'error') {
              spinner.fail('生成失败（error）');
              throw new ApiError(`应用 ${appId} 生成失败，请到 Sive 控制台查看详情`);
            }
            if (elapsed > timeoutSeconds) {
              spinner.fail(`生成超时（${timeoutSeconds}s）`);
              throw new ApiError(
                `等待超时，应用 ${appId} 可能仍在生成，稍后可用 \`sive status ${appId}\` 查询`,
              );
            }

            spinner.text = `AI 生成中（${info.aiStatus}）… 已等待 ${elapsed}s`;
            await sleep(POLL_INTERVAL_MS);
          }
        } catch (error) {
          if (spinner.isSpinning) spinner.fail('生成未完成');
          throw error;
        }
      }),
    );
}
