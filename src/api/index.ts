import fs from 'node:fs';
import axios, { type AxiosInstance } from 'axios';
import FormData from 'form-data';

// ---------- 类型定义（对齐官方 OpenAPI 文档） ----------

export interface UserInfo {
  id: string;
  username: string;
  avatarUrl?: string;
}

/** 数据集来源类型：1=CSV 2=JSON 3=Excel 5=MySQL 8=HTTP */
export type DatasetSourceType = 1 | 2 | 3 | 5 | 8;

export interface DatasetCreateResult {
  id: string;
  [key: string]: unknown;
}

export interface SqlResult {
  columns: string[];
  rows: unknown[];
  sql: string;
}

/** AI 应用生成状态机：not_started → streaming → finished | aborted | error */
export type AiStatus = 'not_started' | 'streaming' | 'finished' | 'aborted' | 'error';

/** 应用类型：1=数据单图 2=数据报告 */
export type AppType = 1 | 2;

export interface AppInfo {
  id: string;
  name?: string;
  description?: string;
  type?: number;
  aiStatus: AiStatus;
  isPublic?: boolean;
  previewUrl?: string;
  thumbnailUrl?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VisResult {
  url: string;
  type: string;
}

// ---------- 接口封装 ----------

/** GET /user/info 获取当前用户信息 */
export async function getUserInfo(client: AxiosInstance): Promise<UserInfo> {
  const { data } = await client.get('/user/info');
  return data.data as UserInfo;
}

/** POST /dataset/create 上传文件创建数据集（multipart/form-data） */
export async function createDataset(
  client: AxiosInstance,
  options: {
    name: string;
    type: DatasetSourceType;
    filePath?: string;
    description?: string;
  },
): Promise<DatasetCreateResult> {
  const form = new FormData();
  form.append('name', options.name);
  form.append('type', String(options.type));
  if (options.description) form.append('description', options.description);
  if (options.filePath) form.append('file', fs.createReadStream(options.filePath));

  const { data } = await client.post('/dataset/create', form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 300_000,
  });
  return data.data as DatasetCreateResult;
}

/** POST /dataset/excute-sql 执行只读 SQL（官方路径即为 excute） */
export async function executeSql(
  client: AxiosInstance,
  datasetId: string,
  sql: string,
): Promise<SqlResult> {
  const { data } = await client.post('/dataset/excute-sql', { datasetId, sql });
  if (data.error) {
    throw new Error(typeof data.error === 'string' ? data.error : 'SQL 执行失败');
  }
  return data.data as SqlResult;
}

/** POST /app/create 提交自然语言 Prompt，AI 生成应用 */
export async function createApp(
  client: AxiosInstance,
  options: { type: AppType; prompt: string },
): Promise<{ id: string; aiStatus: AiStatus }> {
  const { data } = await client.post('/app/create', options);
  return data.data as { id: string; aiStatus: AiStatus };
}

/** GET /app/info 获取应用详情与 AI 生成状态 */
export async function getAppInfo(client: AxiosInstance, id: string): Promise<AppInfo> {
  const { data } = await client.get('/app/info', { params: { id } });
  return data.data as AppInfo;
}

/** POST /vis/generate 生成可视化图表，返回图片地址 */
export async function generateVis(
  client: AxiosInstance,
  options: { type: string; spec: Record<string, unknown> },
): Promise<VisResult> {
  const { data } = await client.post('/vis/generate', options);
  return data.data as VisResult;
}

/** 下载远程图片到本地文件 */
export async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await axios.get<NodeJS.ReadableStream>(url, {
    responseType: 'stream',
    timeout: 60_000,
  });
  await new Promise<void>((resolve, reject) => {
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}
