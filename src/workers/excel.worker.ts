import { parseExcelArrayBuffer } from '../utils/excelParser';
import { ParseResult } from '../utils/excelParser';

export interface ExcelWorkerRequest {
  type: 'PARSE_EXCEL';
  id: string;
  arrayBuffer: ArrayBuffer;
  fileName: string;
  overrideDate?: string;
  overrideSite?: string;
}

export interface ExcelWorkerSuccessResponse {
  type: 'PARSE_SUCCESS';
  id: string;
  result: ParseResult;
}

export interface ExcelWorkerErrorResponse {
  type: 'PARSE_ERROR';
  id: string;
  error: string;
}

export type ExcelWorkerResponse = ExcelWorkerSuccessResponse | ExcelWorkerErrorResponse;

// Dedicated Web Worker event listener
self.addEventListener('message', (e: MessageEvent<ExcelWorkerRequest>) => {
  const data = e.data;

  if (!data || data.type !== 'PARSE_EXCEL') {
    return;
  }

  const { id, arrayBuffer, fileName, overrideDate, overrideSite } = data;

  try {
    // Execute heavy XLSX decompression, sheet traversing, and calculations on worker thread
    const result = parseExcelArrayBuffer(arrayBuffer, fileName, overrideDate, overrideSite);

    const response: ExcelWorkerSuccessResponse = {
      type: 'PARSE_SUCCESS',
      id,
      result,
    };

    self.postMessage(response);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido al procesar archivo Excel en Web Worker.';
    const response: ExcelWorkerErrorResponse = {
      type: 'PARSE_ERROR',
      id,
      error: errorMsg,
    };

    self.postMessage(response);
  }
});
