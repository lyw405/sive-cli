import { createRequire } from 'node:module';
import { Command } from 'commander';
import { setDebug } from './utils/logger.js';
import { registerLoginCommand } from './commands/login.js';
import { registerLogoutCommand } from './commands/logout.js';
import { registerWhoamiCommand } from './commands/whoami.js';
import { registerUploadCommand } from './commands/upload.js';
import { registerQueryCommand } from './commands/query.js';
import { registerAskCommand } from './commands/ask.js';
import { registerStatusCommand } from './commands/status.js';
import { registerChartCommand } from './commands/chart.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const program = new Command();

program
  .name('sive')
  .description('Sive CLI —— 将 AntV Sive 数据可视化能力集成到终端与 CI/CD 工作流')
  .version(pkg.version)
  .option('--debug', '输出调试信息（请求明细，不含 API Key）');

program.hook('preAction', () => {
  setDebug(Boolean(program.opts().debug));
});

// 新增命令只需在 src/commands/ 下实现 register 函数并在此注册
registerLoginCommand(program);
registerLogoutCommand(program);
registerWhoamiCommand(program);
registerUploadCommand(program);
registerQueryCommand(program);
registerAskCommand(program);
registerStatusCommand(program);
registerChartCommand(program);

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
