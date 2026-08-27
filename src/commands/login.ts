import type { Command } from 'commander';
import inquirer from 'inquirer';
import { configFilePath, saveApiKey } from '../core/config.js';
import { createClient } from '../core/http.js';
import { getUserInfo } from '../api/index.js';
import { logger } from '../utils/logger.js';
import { wrapAction } from '../utils/action.js';

export function registerLoginCommand(program: Command): void {
  program
    .command('login')
    .description('登录 Sive：保存 API Key 到本地（~/.sive/config.json）')
    .option('-k, --key <apiKey>', '非交互式传入 API Key（适用于 CI/CD 场景）')
    .action(
      wrapAction(async (options: { key?: string }) => {
        let apiKey = options.key?.trim() ?? '';
        if (!apiKey) {
          const answer = await inquirer.prompt<{ apiKey: string }>([
            {
              type: 'password',
              name: 'apiKey',
              message: '请输入 Sive API Key（在「个人设置 → API Token」中创建）：',
              mask: '*',
              validate: (value: string) => (value.trim() ? true : 'API Key 不能为空'),
            },
          ]);
          apiKey = answer.apiKey.trim();
        }
        if (!apiKey) {
          throw new Error('API Key 不能为空');
        }

        saveApiKey(apiKey);
        logger.success(`API Key 已保存至 ${configFilePath}`);

        // 保存后立即验证 Key 有效性（验证失败不影响保存结果）
        try {
          const client = createClient();
          const user = await getUserInfo(client);
          logger.success(`验证通过，当前用户：${user.username}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.warn(`Key 已保存，但在线验证失败：${message}`);
        }
      }),
    );
}
