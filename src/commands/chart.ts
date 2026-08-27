import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { createClient } from '../core/http.js';
import { downloadFile, generateVis } from '../api/index.js';
import { logger } from '../utils/logger.js';
import { wrapAction } from '../utils/action.js';

/** 官方支持的图表类型枚举 */
export const CHART_TYPES = [
  'line',
  'area',
  'column',
  'bar',
  'pie',
  'scatter',
  'histogram',
  'boxplot',
  'violin',
  'dual-axes',
  'funnel',
  'waterfall',
  'liquid',
  'word-cloud',
  'venn',
  'treemap',
  'sankey',
  'flow-diagram',
  'network-graph',
  'mind-map',
  'organization-chart',
  'fishbone-diagram',
  'radar',
] as const;

const THEMES = ['default', 'light', 'dark', 'academy'] as const;

/** 解析 --data / --spec 参数：内联 JSON 或本地文件路径 */
function loadJsonArg(value: string, flagName: string): unknown {
  const trimmed = value.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error(`${flagName} 不是合法的 JSON：${trimmed.slice(0, 80)}…`);
    }
  }
  const filePath = path.resolve(trimmed);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${flagName} 既不是合法 JSON，也不是存在的文件路径：${trimmed}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    throw new Error(`无法将文件解析为 JSON：${filePath}`);
  }
}

interface ChartOptions {
  data?: string;
  spec?: string;
  title?: string;
  output?: string;
  width?: string;
  height?: string;
  theme?: string;
}

export function registerChartCommand(program: Command): void {
  program
    .command('chart <chartType>')
    .description('生成图表图片并保存到本地')
    .requiredOption(
      '-d, --data <jsonOrPath>',
      '图表数据：内联 JSON 数组或本地 JSON 文件路径',
    )
    .option('-t, --title <title>', '图表标题')
    .option('-o, --output <file>', '输出文件路径', 'output.png')
    .option('--width <px>', '图片宽度（默认 600）')
    .option('--height <px>', '图片高度（默认 400）')
    .option('--theme <theme>', `主题：${THEMES.join(' | ')}（默认 light）`)
    .option('--spec <jsonOrPath>', '额外 spec 配置（合并到图表配置中）')
    .addHelpText(
      'after',
      `\n支持的图表类型：\n  ${CHART_TYPES.join(', ')}\n\n示例：\n  sive chart column -d '[{"category":"A","value":1},{"category":"B","value":2}]' -t 销量对比`,
    )
    .action(
      wrapAction(async (chartType: string, options: ChartOptions) => {
        if (!(CHART_TYPES as readonly string[]).includes(chartType)) {
          throw new Error(
            `不支持的图表类型：${chartType}\n可选类型：${CHART_TYPES.join(', ')}`,
          );
        }
        if (options.theme && !(THEMES as readonly string[]).includes(options.theme)) {
          throw new Error(`不支持的主题：${options.theme}（可选：${THEMES.join(' | ')}）`);
        }

        const spec: Record<string, unknown> = { data: loadJsonArg(options.data!, '--data') };
        if (options.title) spec.title = options.title;
        if (options.width) spec.width = Number(options.width);
        if (options.height) spec.height = Number(options.height);
        if (options.theme) spec.theme = options.theme;
        if (options.spec) {
          const extra = loadJsonArg(options.spec, '--spec');
          if (typeof extra !== 'object' || extra === null || Array.isArray(extra)) {
            throw new Error('--spec 必须是 JSON 对象');
          }
          Object.assign(spec, extra);
        }

        const client = createClient();
        const { url } = await generateVis(client, { type: chartType, spec });
        logger.debug(`图片地址：${url}`);

        const outputPath = path.resolve(options.output ?? 'output.png');
        await downloadFile(url, outputPath);
        logger.success(`图表已保存至 ${outputPath}`);
      }),
    );
}
