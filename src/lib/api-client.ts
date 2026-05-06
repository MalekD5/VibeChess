interface ApiErrorResponse {
  error?: string;
  message?: string;
}

function getApiError(data: unknown, fallback: string): string {
  if (typeof data !== 'object' || data === null) return fallback;
  const body = data as ApiErrorResponse;
  return body.message ?? body.error ?? fallback;
}

export async function parseJsonResponse<T>(response: Response, fallback: string): Promise<T> {
  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(getApiError(data, fallback));
  }

  return data as T;
}
