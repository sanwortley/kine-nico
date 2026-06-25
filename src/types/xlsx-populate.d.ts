declare module 'xlsx-populate' {
  interface Cell {
    value(): unknown;
    value(val: string | number | boolean | Date | null | undefined): Cell;
    formula(): string;
    formula(val: string): Cell;
    style(name: string): unknown;
    style(name: string, val: unknown): Cell;
  }

  interface Sheet {
    cell(address: string): Cell;
    name(): string;
  }

  interface Workbook {
    sheet(name: string): Sheet | undefined;
    outputAsync(type?: string): Promise<Uint8Array>;
  }

  const XlsxPopulate: {
    fromFileAsync(path: string): Promise<Workbook>;
    fromDataAsync(data: Buffer | ArrayBuffer): Promise<Workbook>;
  };

  export = XlsxPopulate;
}