# Sive CLI

基于 [AntV Sive](https://sive.antv.antgroup.com/)（AI Native 数据可视化平台）开放接口的命令行工具，把数据上传、SQL 查询、AI 分析、图表生成等能力带进终端与 CI/CD 流水线，实现数据可视化的自动化与可编程化。

## 能力一览

| 能力 | 命令 | 说明 |
| --- | --- | --- |
| 凭证管理 | `login` / `logout` / `whoami` | API Key 保存、删除与在线验证 |
| 数据接入 | `upload` | CSV / JSON / Excel 上传为 Sive 数据集 |
| 数据查询 | `query` | 对数据集执行只读 SQL，表格或 JSON 输出 |
| AI 生成 | `ask` / `status` | 自然语言生成数据单图 / 数据报告，自动轮询状态 |
| 图表直出 | `chart` | 23 种图表类型服务端渲染为 PNG |

## 快速开始

```bash
# 1. 安装（源码构建，要求 Node.js ≥ 18）
npm install && npm run build && npm link

# 2. 登录（API Key 在 Sive「个人设置 → API Token」创建）
sive login

# 3. 上传数据 → 查询 → 出图
sive upload ./sales.csv --name 销售数据        # 成功后打印 Dataset ID
sive query <datasetId> "SELECT * FROM data LIMIT 10"
sive chart column -d '[{"category":"华东","value":120},{"category":"华南","value":98}]' -t 区域对比 -o demo.png
```

## 安装

尚未发布到 npm，从源码构建并全局注册：

```bash
npm install
npm run build
npm link          # 全局注册 sive 命令
sive --help
```

## 配置

### 获取与登录

在 [Sive](https://sive.antv.antgroup.com/)「个人设置 → API Token」创建令牌，然后：

```bash
sive login              # 交互式输入（不回显）
sive login --key xxx    # 非交互式，适用于 CI/CD
sive whoami             # 验证 Key 并查看用户信息
sive logout             # 删除本地配置
```

Key 保存在 `~/.sive/config.json`（目录 `0700`、文件 `0600` 权限）。

> ⚠️ `--key` 方式会把 Key 留在 shell 历史记录中，交互式终端建议直接用 `sive login`；自动化场景优先使用 `SIVE_API_KEY` 环境变量。

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `SIVE_API_KEY` | API Key，优先级高于本地配置文件，CI/CD 推荐 |
| `SIVE_BASE_URL` | 覆盖服务地址，用于联调/预发环境 |

## 命令

### `sive upload <filePath>` —— 创建数据集

```bash
sive upload ./sales.csv --name 2025销售数据
sive upload ./data.xlsx -t excel --description "季度汇总"
```

- 支持 CSV / JSON / Excel，按扩展名自动推断类型，也可用 `-t csv|json|excel` 指定
- 文件上限 32MB，成功后打印 Dataset ID，并给出下一步查询的命令提示

**导入后的表名规则**（实测结论，官方文档未记载）：

| 类型 | 表名 | 列名 |
| --- | --- | --- |
| CSV / JSON | 固定为 `data` | 文件表头 |
| Excel | 工作表名（如 `Sheet1`） | 可能为单元格编号（`A1`/`B1`…），首行表头会作为数据行 |

Excel 导入行为较原始，追求稳定体验建议优先使用 CSV。可用 `SELECT table_name FROM information_schema.tables` 查询实际表名。

### `sive query <datasetId> <sql>` —— 只读 SQL 查询

```bash
sive query <datasetId> "SELECT region, SUM(sales) FROM data GROUP BY region"
sive query <datasetId> "SELECT * FROM data LIMIT 10" --json   # JSON 输出，便于管道处理
```

- 服务端仅允许 `SELECT / WITH / PIVOT` 等只读语句，结果以终端表格渲染
- `--json` 输出 `{columns, rows}` 结构（打印到 stdout），便于 `jq` 等工具二次处理
- 查询成功但结果为空时给出警告（退出码仍为 0）

### `sive ask <prompt>` —— 自然语言生成数据应用

```bash
# <datasetId> 为 upload 返回的 Dataset ID（平台只认 ID，写数据集名称无法自动关联）
sive ask "基于数据集 <datasetId>（表名 data），分析各区域销售趋势并给出建议"   # 数据报告（默认）
sive ask "基于数据集 <datasetId>（表名 data），按月汇总销售额绘制折线图" --type chart   # 数据单图
sive ask "..." --timeout 900                            # 自定义超时（秒，默认 600）
```

- 提交后自动轮询生成状态（`not_started → streaming → finished`，每 3 秒一次），完成打印预览地址
- 预览地址是应用的 AI 对话工作台；`finished` 仅表示应用已生成响应，若 AI 认为上下文不足会在页面内追问（如索要 Dataset ID），不代表图表已画出
- 报告类应用通常需要几分钟，超时不会丢失任务，用 `sive status <appId>` 复查
- `ask` 只向平台提交应用类型与 Prompt（不带数据集参数）。实测平台 AI 只认 **Dataset ID**（或直接粘贴的数据内容），仅写数据集名称无法自动关联；建议把 `upload` 返回的 ID 写进 Prompt，如 `sive ask "基于数据集 <datasetId>（表名 data）…"`，也可在预览页绑定数据集后继续对话

### `sive status <appId>` —— 查询生成状态

```bash
sive status <appId>
```

适用于 `ask` 超时后复查。展示应用名称、生成状态（含中文说明），完成时打印预览地址。应用处于 `aborted` / `error` 状态时以非零退出码结束，流水线可感知失败。

### `sive chart <chartType>` —— 图表直出为图片

```bash
sive chart column -d '[{"category":"华东","value":120},{"category":"华南","value":98}]' -t 区域对比
sive chart pie -d ./data.json -o pie.png --theme dark
sive chart liquid --spec '{"percent":0.7}' -d '[]'      # 特殊图表用 --spec 传配置
```

- `-d/--data`（必选）：内联 JSON 或本地 JSON 文件路径。`liquid` 等以 `--spec` 为主的图表同样要求该参数，传 `'[]'` 占位即可
- `-t/--title`：图表标题；`-o/--output`：输出路径（默认 `output.png`）
- `--width` / `--height`：图片尺寸（服务端默认 600 × 400）
- `--theme`：`default | light | dark | academy`
- `--spec`：额外配置对象，浅合并到图表配置中（同名键会覆盖）
- 支持 23 种图表类型：`line` `area` `column` `bar` `pie` `scatter` `histogram` `boxplot` `violin` `dual-axes` `funnel` `waterfall` `liquid` `word-cloud` `venn` `treemap` `sankey` `flow-diagram` `network-graph` `mind-map` `organization-chart` `fishbone-diagram` `radar`（`sive chart --help` 查看）
- 各类型数据形状以官方文档为准（折线 `{time,value}[]`、柱状 `{category,value}[]` 等）

### 全局选项

```bash
sive --version
sive --debug <command>    # 输出请求调试信息（打印到 stderr，不含 API Key）
```

## CI/CD 集成

```yaml
# GitHub Actions 示例
jobs:
  weekly-chart:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install Sive CLI（源码构建，尚未发布 npm）
        run: |
          git clone <本仓库地址> sive-cli
          cd sive-cli && npm ci && npm run build && npm link
      - name: Generate weekly chart
        env:
          SIVE_API_KEY: ${{ secrets.SIVE_API_KEY }}
        run: |
          sive upload ./weekly.csv --name 周报数据
          sive chart line -d ./trend.json -o report.png
```

- 所有命令失败时以非零退出码结束（含 `status` 查询到 `aborted` / `error` 状态），流水线可正确感知失败
- Key 通过 `SIVE_API_KEY` 注入，不落盘、不进代码库

## 项目结构

```
src/
├── index.ts           # 入口：全局选项 + 命令注册
├── commands/          # 命令层：每个命令一个文件
│   ├── login.ts  logout.ts  whoami.ts
│   ├── upload.ts  query.ts
│   ├── ask.ts  status.ts  chart.ts
├── api/index.ts       # 接口层：对齐官方 OpenAPI 的请求函数与类型
├── core/
│   ├── config.ts      # ~/.sive/config.json 读写（0600）+ 环境变量
│   └── http.ts        # axios 封装：Key 注入、拦截器、错误归一化
└── utils/
    ├── logger.ts      # 彩色日志 + debug 开关（诊断信息走 stderr）
    ├── action.ts      # 命令异常统一处理（错误输出 + 退出码）
    └── table.ts       # cli-table3 表格渲染
```

## 新增命令指南

1. 在 `src/commands/` 新建文件，导出 `registerXxxCommand(program)`
2. 在 `src/index.ts` 注册
3. 接口请求统一加到 `src/api/index.ts`，命令层不直接调 axios
4. action 用 `wrapAction` 包装，保证错误输出与退出码一致
5. 「命令执行成功但业务结果为失败」的场景（参考 `status`），在 action 内显式设置 `process.exitCode = 1`

## 常用脚本

```bash
npm run build       # tsup 构建到 dist/（ESM 单文件 + shebang）
npm run dev         # 监听模式
npm run typecheck   # 类型检查
npm run lint        # ESLint
npm run format      # Prettier
```

## 已知行为说明

- `POST /dataset/excute-sql` 路径中的 `excute` 为官方拼写，非笔误
- Excel 数据集的表名/列名规则见上文「导入后的表名规则」
- 接口响应统一包裹在 `data` 字段；`excute-sql` 的业务错误在顶层 `error` 字段；`vis/generate` 失败返回 400 + `message`
- `sive login --key` 会把 Key 写入 shell 历史，交互式场景建议使用不带 `--key` 的交互式登录
- `ask` 的 Prompt 中数据集名称无法自动绑定数据，需写 Dataset ID 或在预览页绑定（实测结论，官方文档未记载）
- `vis/generate` 返回图片的实际分辨率为请求尺寸的 3 倍（默认 600×400 → 实际 1800×1200）（实测结论）
