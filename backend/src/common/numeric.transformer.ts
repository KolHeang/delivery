import { ValueTransformer } from 'typeorm';

export class ColumnNumericTransformer implements ValueTransformer {
  to(data?: number | null): number | null | undefined {
    return data;
  }
  from(data?: string | number | null): number | null {
    if (data === null || data === undefined) return null;
    const res = typeof data === 'number' ? data : parseFloat(data);
    return isNaN(res) ? null : res;
  }
}

export const numericTransformer = new ColumnNumericTransformer();
