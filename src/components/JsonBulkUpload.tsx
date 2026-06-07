import { useState, useRef } from 'react';
import type { BulkCreateResult } from '../types';

interface JsonBulkUploadProps<T> {
  /** Label shown on the trigger button, e.g. "Bulk Upload Products" */
  label: string;
  /** Called with the parsed JSON array; should hit your bulkCreate service method */
  onUpload: (items: T[]) => Promise<BulkCreateResult<T>>;
  /** Called after a successful (or partial) upload so the parent can refresh its list */
  onSuccess?: () => void;
  /** Optional example JSON shown in the modal to help the user format their payload */
  exampleJson?: string;
}

type UploadState = 'idle' | 'parsing' | 'uploading' | 'done' | 'error';

export function JsonBulkUpload<T>({
  label,
  onUpload,
  onSuccess,
  exampleJson,
}: JsonBulkUploadProps<T>) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<UploadState>('idle');
  const [result, setResult] = useState<BulkCreateResult<T> | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const reset = () => {
    setState('idle');
    setResult(null);
    setParseError(null);
    if (fileRef.current) fileRef.current.value = '';
    if (textRef.current) textRef.current.value = '';
  };

  const close = () => {
    reset();
    setOpen(false);
  };

  const parseJson = (raw: string): T[] | null => {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setParseError('JSON must be an array [ { ... }, { ... } ]');
        return null;
      }
      return parsed as T[];
    } catch (e: unknown) {
      setParseError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  };

  const handleFileChange = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (textRef.current) textRef.current.value = text;
      setParseError(null);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    const raw = textRef.current?.value?.trim() ?? '';
    if (!raw) {
      setParseError('Paste JSON or select a .json file.');
      return;
    }
    setParseError(null);
    setState('parsing');

    const items = parseJson(raw);
    if (!items) {
      setState('idle');
      return;
    }

    setState('uploading');
    try {
      const res = await onUpload(items);
      setResult(res);
      setState('done');
      if (res.failed.length === 0) onSuccess?.();
    } catch (e: unknown) {
      setParseError(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
      setState('error');
    }
  };

  const allFailed = result && result.created.length === 0 && result.failed.length > 0;
  const partial = result && result.created.length > 0 && result.failed.length > 0;
  const allOk = result && result.failed.length === 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-dashed border-gray-400 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
        </svg>
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {state !== 'done' && (
                <>
                  {/* File picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select a .json file <span className="text-gray-400 font-normal">or paste below</span>
                    </label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  {/* Textarea */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">JSON payload</label>
                    <textarea
                      ref={textRef}
                      rows={10}
                      placeholder={'[\n  { "productName": "...", "sku": "...", ... }\n]'}
                      className="w-full font-mono text-xs border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                  </div>

                  {exampleJson && (
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer font-medium text-blue-600 hover:underline">
                        Show example JSON
                      </summary>
                      <pre className="mt-2 bg-gray-50 border rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
                        {exampleJson}
                      </pre>
                    </details>
                  )}

                  {parseError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                      {parseError}
                    </p>
                  )}
                </>
              )}

              {/* Result panel */}
              {state === 'done' && result && (
                <div className="space-y-3">
                  <div className={`rounded-lg p-3 text-sm font-medium ${allOk ? 'bg-green-50 text-green-700' : partial ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                    {allOk && `✓ All ${result.created.length} item(s) created successfully.`}
                    {partial && `⚠ ${result.created.length} created, ${result.failed.length} failed.`}
                    {allFailed && `✗ All ${result.failed.length} item(s) failed.`}
                  </div>

                  {result.failed.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Failed items:</p>
                      <ul className="space-y-1 max-h-48 overflow-y-auto">
                        {result.failed.map((f) => (
                          <li key={f.index} className="text-xs bg-red-50 border border-red-100 rounded p-2">
                            <span className="font-semibold">[{f.index}] {f.label}</span>
                            <span className="text-red-600 ml-2">— {f.reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              {state === 'done' ? (
                <>
                  {result && result.failed.length > 0 && (
                    <button onClick={reset} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                      Try Again
                    </button>
                  )}
                  <button onClick={close} className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button onClick={close} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={state === 'uploading' || state === 'parsing'}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {state === 'uploading' ? 'Uploading…' : state === 'parsing' ? 'Parsing…' : 'Upload'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
