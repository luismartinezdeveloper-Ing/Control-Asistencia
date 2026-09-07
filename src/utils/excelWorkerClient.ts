import { ParseResult, parseExcelArrayBuffer } from './excelParser';
import { ExcelWorkerRequest, ExcelWorkerResponse } from '../workers/excel.worker';

let workerInstance: Worker | null = null;
const pendingRequests = new Map<
  string,
  {
    resolve: (value: ParseResult) => void;
    reject: (reason?: unknown) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }
>();

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }

  if (!workerInstance) {
    try {
      workerInstance = new Worker(
        new URL('../workers/excel.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerInstance.onmessage = (event: MessageEvent<ExcelWorkerResponse>) => {
        const data = event.data;
        if (!data || !data.id) return;

        const pending = pendingRequests.get(data.id);
        if (!pending) return;

        clearTimeout(pending.timeoutId);
        pendingRequests.delete(data.id);

        if (data.type === 'PARSE_SUCCESS') {
          pending.resolve(data.result);
        } else {
          pending.reject(new Error(data.error || 'Error en Web Worker al procesar Excel.'));
        }
      };

      workerInstance.onerror = (err) => {
        console.warn('Excel Web Worker error encountered:', err);
      };
    } catch (err) {
      console.warn('Could not initialize Excel Web Worker, falling back to main thread:', err);
      workerInstance = null;
    }
  }

  return workerInstance;
}

/**
 * Asynchronously parses an Excel file using a dedicated Web Worker off the main thread.
 * If Web Workers are unavailable or fail, automatically falls back to main thread parsing.
 */
export async function parseExcelWithWorker(
  file: File,
  overrideDate?: string,
  overrideSite?: string
): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const worker = getWorker();

  // If worker is not available, execute directly in current thread
  if (!worker) {
    return parseExcelArrayBuffer(arrayBuffer, file.name, overrideDate, overrideSite);
  }

  const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return new Promise<ParseResult>((resolve, reject) => {
    // 60-second safety timeout for massive files
    const timeoutId = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        console.warn('Worker timed out, executing fallback on main thread.');
        try {
          const fallbackResult = parseExcelArrayBuffer(
            arrayBuffer,
            file.name,
            overrideDate,
            overrideSite
          );
          resolve(fallbackResult);
        } catch (fallbackErr) {
          reject(new Error('Tiempo de espera agotado al procesar el archivo Excel.'));
        }
      }
    }, 60000);

    pendingRequests.set(id, { resolve, reject, timeoutId });

    try {
      const request: ExcelWorkerRequest = {
        type: 'PARSE_EXCEL',
        id,
        arrayBuffer,
        fileName: file.name,
        overrideDate,
        overrideSite,
      };

      // Pass arrayBuffer as transferable object for optimal zero-copy performance
      worker.postMessage(request, [arrayBuffer]);
    } catch (postErr) {
      clearTimeout(timeoutId);
      pendingRequests.delete(id);
      console.warn('postMessage to Worker failed, falling back to main thread:', postErr);
      try {
        const fallbackResult = parseExcelArrayBuffer(
          arrayBuffer,
          file.name,
          overrideDate,
          overrideSite
        );
        resolve(fallbackResult);
      } catch (err) {
        reject(err);
      }
    }
  });
}
