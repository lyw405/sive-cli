import type { Command } from 'commander';
import chalk from 'chalk';
import { createClient } from '../core/http.js';
import { getAppInfo } from '../api/index.js';
import { logger } from '../utils/logger.js';
import { wrapAction } from '../utils/action.js';

/** 生成状态的中文说明 */
const STATUS_DESC: Record<string, string> = {
  not_started: '排队中',
  streaming: '生成中',
  finished: '已完成',
  aborted: '已中断',
  error: '生成失败',
};

export function registerStatusCommand(program: Command): void {
  program
    .command('status <appId>')
    .description('查询应用的 AI 生成状态（适用于 ask 超时后复查）')
    .action(
      wrapAction(async (appId: string) => {
        const client = createClient();
        const info = await getAppInfo(client, appId);

        logger.info(`${chalk.bold('应用 ID')}    ${info.id}`);
        if (info.name) logger.info(`${chalk.bold('名称')}       ${info.name}`);
        logger.info(
          `${chalk.bold('生成状态')}   ${info.aiStatus}（${STATUS_DESC[info.aiStatus] ?? '未知'}）`,
        );
        if (info.aiStatus === 'finished') {
          if (info.previewUrl) {
            logger.info(`${chalk.bold('预览地址')}   ${info.previewUrl}`);
          }
          logger.success('应用已生成完成');
        } else if (info.aiStatus === 'aborted' || info.aiStatus === 'error') {
          logger.error(`生成${STATUS_DESC[info.aiStatus]}，可重新运行 sive ask 重试`);
          process.exitCode = 1;
        } else {
          logger.info('仍在生成，可稍后再次运行本命令查询');
        }
      }),
    );
}
