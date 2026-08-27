import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import chalk from 'chalk';
import { createClient } from '../core/http.js';
import { createDataset, type DatasetSourceType } from '../api/index.js';
import { logger } from '../utils/logger.js';
import { wrapAction } from '../utils/action.js';

/** 文件扩展名 → 数据集来源类型 */
const EXT_TYPE_MAP: Record<string, DatasetSourceType> = {
  '.csv': 1,
  '.json': 2,
  '.xls': 3,
  '.xlsx': 3,
};

const CLI_TYPE_MAP: Record<string, DatasetSourceType> = {
  csv: 1,
  json: 2,
  excel: 3,
};

const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32MB

interface UploadOptions {
  name?: string;
  type?: string;
  description?: string;
}

export function registerUploadCommand(program: Command): void {
  program
    .command('upload <filePath>')
    .description('上传 CSV / JSON / Excel 文件，创建 Sive 数据集')
    .option('-n, --name <name>', '数据集名称（默认使用文件名）')
    .option('-t, --type <type>', '文件类型：csv | json | excel（默认按扩展名推断）')
    .option('--description <description>', '数据集描述')
    .action(
      wrapAction(async (filePath: string, options: UploadOptions) => {
        const resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`文件不存在：${resolvedPath}`);
        }

        const stats = fs.statSync(resolvedPath);
        if (stats.size > MAX_FILE_SIZE) {
          throw new Error(`文件超过 32MB 大小限制（当前 ${(stats.size / 1024 / 1024).toFixed(1)}MB）`);
        }

        let type: DatasetSourceType;
        if (options.type) {
          const mapped = CLI_TYPE_MAP[options.type.toLowerCase()];
          if (!mapped) {
            throw new Error(`不支持的文件类型：${options.type}（可选：csv | json | excel）`);
          }
          type = mapped;
        } else {
          const ext = path.extname(resolvedPath).toLowerCase();
          const inferred = EXT_TYPE_MAP[ext];
          if (!inferred) {
            throw new Error(`无法识别文件扩展名 ${ext}，请用 --type 指定：csv | json | excel`);
          }
          type = inferred;
        }

        const name = options.name?.trim() || path.basename(resolvedPath, path.extname(resolvedPath));

        logger.info(`上传中：${resolvedPath}`);
        const client = createClient();
        const result = await createDataset(client, {
          name,
          type,
          filePath: resolvedPath,
          description: options.description,
        });

        if (result?.id) {
          logger.success(`数据集创建成功`);
          logger.info(`${chalk.bold('Dataset ID')}   ${result.id}`);
          logger.info(`${chalk.bold('名称')}         ${name}`);
          if (type === 3) {
            // Excel 导入规则与 CSV/JSON 不同：表名=工作表名，列名可能是单元格编号
            logger.warn('Excel 数据集以工作表名作为表名，列名可能为单元格编号（A1/B1…），首行表头会作为数据行');
            logger.info(`查看表名：sive query ${result.id} "SELECT table_name FROM information_schema.tables"`);
            logger.info(`查看结构：sive query ${result.id} "SELECT * FROM <表名> LIMIT 5"（追求稳定体验建议改用 CSV）`);
          } else {
            logger.info(`${chalk.bold('默认表名')}     data（上传的文件会被导入为该表）`);
            logger.info(`下一步可执行：sive query ${result.id} "SELECT * FROM data LIMIT 10"`);
          }
        } else {
          logger.success('数据集创建成功');
          logger.info(JSON.stringify(result, null, 2));
        }
      }),
    );
}
