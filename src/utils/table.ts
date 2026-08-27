import Table from 'cli-table3';

/** 将 SQL 查询结果渲染为终端表格字符串 */
export function renderTable(columns: string[], rows: unknown[]): string {
  const table = new Table({ head: columns });
  for (const row of rows) {
    const cells = Array.isArray(row)
      ? row
      : columns.map((col) => (row as Record<string, unknown>)?.[col]);
    table.push(cells.map((cell) => (cell === null || cell === undefined ? '' : String(cell))));
  }
  return table.toString();
}
