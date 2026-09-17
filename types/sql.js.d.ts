declare module "sql.js" {
  interface SqlValue {
    [key: string]: unknown;
  }

  interface Statement {
    bind(values?: unknown): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    run(...params: unknown[]): void;
    free(): void;
  }

  interface Database {
    prepare(sql: string): Statement;
    exec(sql: string): unknown[];
    run(sql: string, params?: unknown[]): void;
    export(): Uint8Array;
    transaction<T extends (...args: any[]) => any>(fn: T): T;
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Uint8Array) => Database;
  }

  const initSqlJs: (config?: Record<string, unknown>) => Promise<SqlJsStatic>;
  export default initSqlJs;
}
