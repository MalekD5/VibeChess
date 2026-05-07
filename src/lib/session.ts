import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export async function getCurrentSession() {
  try {
    return await auth.api.getSession({
      headers: await headers(),
    });
  } catch {
    return null;
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
