import type { Command } from 'commander';
import chalk from 'chalk';
import { createClient } from '../core/http.js';
import { getUserInfo } from '../api/index.js';
import { logger } from '../utils/logger.js';
import { wrapAction } from '../utils/action.js';

export function registerWhoamiCommand(program: Command): void {
  program
    .command('whoami')
    .description('验证 API Key 并展示当前用户信息')
    .action(
      wrapAction(async () => {
        const client = createClient();
        const user = await getUserInfo(client);
        logger.info(`${chalk.bold('用户名')}    ${user.username}`);
        logger.info(`${chalk.bold('用户 ID')}   ${user.id}`);
        if (user.avatarUrl) {
          logger.info(`${chalk.bold('头像')}      ${user.avatarUrl}`);
        }
        logger.success('API Key 有效');
      }),
    );
}
