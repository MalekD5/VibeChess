import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorStatus(err: unknown): number | null {
  if (!isRecord(err)) return null;

  const status = err.status ?? err.statusCode;
  if (typeof status === 'number') return status;
  if (typeof status === 'string') {
    const parsedStatus = Number(status);
    return Number.isNaN(parsedStatus) ? null : parsedStatus;
  }

  const response = err.response;
  if (!isRecord(response)) return null;

  const responseStatus = response.status;
  if (typeof responseStatus === 'number') return responseStatus;
  if (typeof responseStatus === 'string') {
    const parsedStatus = Number(responseStatus);
    return Number.isNaN(parsedStatus) ? null : parsedStatus;
  }

  return null;
}

function isNoSessionError(err: unknown): boolean {
  const status = getErrorStatus(err);
  if (status === 401 || status === 404) return true;

  if (!(err instanceof Error)) return false;

  const message = err.message.toLowerCase();
  return (
    message.includes('unauthorized') ||
    message.includes('no session') ||
    message.includes('session not found')
  );
}

export async function getCurrentSession() {
  try {
    return await auth.api.getSession({
      headers: await headers(),
    });
  } catch (err) {
    if (isNoSessionError(err)) return null;

    throw err;
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };
}
