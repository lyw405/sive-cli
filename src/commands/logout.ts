import type { Command } from 'commander';
import { clearConfig, configFilePath } from '../core/config.js';
import { logger } from '../utils/logger.js';
import { wrapAction } from '../utils/action.js';

export function registerLogoutCommand(program: Command): void {
  program
    .command('logout')
    .description('退出登录：删除本地保存的 API Key')
    .action(
      wrapAction(async () => {
        if (clearConfig()) {
          logger.success(`已删除本地配置 ${configFilePath}`);
        } else {
          logger.info('本地没有已保存的配置，无需退出');
        }
      }),
    );
}
