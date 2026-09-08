import { describe, it, expect } from 'vitest';
import { sanitizeExcelCell } from '../excelExporter';

describe('excelExporter - Formula Injection Protection (CWE-1236)', () => {
  it('should prepend single quote to formula trigger characters', () => {
    expect(sanitizeExcelCell('=SUM(1+1)')).toBe("'=SUM(1+1)");
    expect(sanitizeExcelCell('+cmd|/c calc')).toBe("'+cmd|/c calc");
    expect(sanitizeExcelCell('-100')).toBe("'-100");
    expect(sanitizeExcelCell('@HYPERLINK("http://evil.com")')).toBe("'@HYPERLINK(\"http://evil.com\")");
    expect(sanitizeExcelCell('\tDDE("cmd")')).toBe("'\tDDE(\"cmd\")");
  });

  it('should not alter legitimate text or numbers', () => {
    expect(sanitizeExcelCell('JUAN PEREZ')).toBe('JUAN PEREZ');
    expect(sanitizeExcelCell('08:00:00')).toBe('08:00:00');
    expect(sanitizeExcelCell('2026-09-07')).toBe('2026-09-07');
    expect(sanitizeExcelCell(8.5)).toBe(8.5);
    expect(sanitizeExcelCell(0)).toBe(0);
    expect(sanitizeExcelCell(null)).toBe(null);
    expect(sanitizeExcelCell(undefined)).toBe(undefined);
  });
});
