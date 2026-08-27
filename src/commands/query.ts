import type { Command } from 'commander';
import { createClient } from '../core/http.js';
import { executeSql } from '../api/index.js';
import { logger } from '../utils/logger.js';
import { renderTable } from '../utils/table.js';
import { wrapAction } from '../utils/action.js';

interface QueryOptions {
  json?: boolean;
}

export function registerQueryCommand(program: Command): void {
  program
    .command('query <datasetId> <sql>')
    .description('对数据集执行只读 SQL 查询，以表格形式打印结果')
    .option('--json', '以 JSON 格式输出（便于管道处理）')
    .action(
      wrapAction(async (datasetId: string, sql: string, options: QueryOptions) => {
        const client = createClient();
        const result = await executeSql(client, datasetId, sql);

        if (options.json) {
          logger.info(JSON.stringify({ columns: result.columns, rows: result.rows }, null, 2));
          return;
        }

        if (!result.rows?.length) {
          logger.warn('查询成功，但没有返回任何数据');
          return;
        }

        logger.info(renderTable(result.columns ?? [], result.rows));
        logger.info(`共 ${result.rows.length} 行`);
      }),
    );
}
