import { describe, it, expect } from 'vitest';
import { sanitizeExcelCell } from '../excelExporter';
import { parseExcelArrayBuffer, ParseResult } from '../excelParser';
import { parseExcelWithWorker } from '../excelWorkerClient';
import * as XLSX from 'xlsx';

describe('Excel Hardening & Security Features', () => {
  // -------------------------------------------------------------------------
  // 1. CSV / Excel Formula Injection Prevention (CWE-1236)
  // -------------------------------------------------------------------------
  describe('sanitizeExcelCell', () => {
    it('should prepend single quote to strings starting with formula characters (=, +, -, @)', () => {
      expect(sanitizeExcelCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeExcelCell('+12345')).toBe("'+12345");
      expect(sanitizeExcelCell('-100')).toBe("'-100");
      expect(sanitizeExcelCell('@SUM')).toBe("'@SUM");
    });

    it('should prepend single quote to strings with leading whitespace before formula characters', () => {
      expect(sanitizeExcelCell('   =CMD|"/C calc"!A0')).toBe("'   =CMD|\"/C calc\"!A0");
    });

    it('should NOT modify safe text strings or numbers', () => {
      expect(sanitizeExcelCell('José Morales')).toBe('José Morales');
      expect(sanitizeExcelCell(100)).toBe(100);
      expect(sanitizeExcelCell(0)).toBe(0);
      expect(sanitizeExcelCell(true)).toBe(true);
      expect(sanitizeExcelCell(null)).toBe(null);
      expect(sanitizeExcelCell(undefined)).toBe(undefined);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Cryptographic UUID Uniqueness for Attendance Records
  // -------------------------------------------------------------------------
  describe('UUID Uniqueness in ParseResult', () => {
    it('should generate cryptographically unique IDs for all attendance records', () => {
      // Build synthetic sample data
      const data = [
        ['Nombre', 'Grabar fecha', 'Hora más temprana', 'última Hora'],
        ['Carlos Mendoza', '2026-09-01', '08:00', '17:30'],
        ['Mariana Rivas', '2026-09-01', '08:05', '17:25'],
        ['José Morales', '2026-09-01', '07:55', '17:35'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');

      const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const result: ParseResult = parseExcelArrayBuffer(arrayBuffer, 'test_uniqueness.xlsx');

      expect(result.records.length).toBe(3);
      const ids = result.records.map((r) => r.id);
      const uniqueIds = new Set(ids);

      // Confirm zero collisions
      expect(uniqueIds.size).toBe(ids.length);

      // Confirm UUID structure
      for (const id of ids) {
        expect(id).toMatch(/^(rec|ope|mat)_[a-zA-Z0-9]+_\d{4}-\d{2}-\d{2}_[a-f0-9-]+$/);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 3. Date Fallback Audit Warning
  // -------------------------------------------------------------------------
  describe('ParseAudit Date Fallback Warning', () => {
    it('should set hasDateWarning = true when no date is found in sheet or filename', () => {
      // Sheet with no date in headers or name
      const data = [
        ['Nombre', 'Hora Entrada', 'Hora Salida'],
        ['Carlos Mendoza', '08:00', '17:30'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Hoja1'); // Generic sheet name

      const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const result: ParseResult = parseExcelArrayBuffer(arrayBuffer, 'reporte_asistencia.xlsx');

      expect(result.audit.hasDateWarning).toBe(true);
      expect(result.audit.dateWarningReason).toContain('No se detectó fecha explícita');
    });

    it('should NOT set hasDateWarning when date is explicitly provided in sheet or filename', () => {
      const data = [
        ['Nombre', 'Grabar fecha', 'Hora Entrada', 'Hora Salida'],
        ['Carlos Mendoza', '2026-09-01', '08:00', '17:30'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte_2026-09-01');

      const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const result: ParseResult = parseExcelArrayBuffer(arrayBuffer, 'asistencia_2026-09-01.xlsx');

      expect(result.audit.hasDateWarning).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 4. File Validation in excelWorkerClient
  // -------------------------------------------------------------------------
  describe('parseExcelWithWorker Pre-flight Validations', () => {
    it('should reject files with invalid extensions', async () => {
      const dummyFile = new File(['dummy content'], 'executable.exe', { type: 'application/octet-stream' });

      await expect(parseExcelWithWorker(dummyFile)).rejects.toThrow('Formato de archivo no soportado');
    });

    it('should reject files exceeding the 50MB limit', async () => {
      const largeBlob = new Blob([new Uint8Array(51 * 1024 * 1024)]); // 51MB
      const largeFile = new File([largeBlob], 'huge_dataset.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await expect(parseExcelWithWorker(largeFile)).rejects.toThrow('supera el tamaño máximo permitido de 50MB');
    });
  });
});
