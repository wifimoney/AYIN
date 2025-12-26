import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface AuthUser {
  fid?: number;
  username?: string;
  walletAddress?: string;
  address?: string; // Base Account address
}

export async function createSession(user: AuthUser): Promise<string> {
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

  (await cookies()).set('ayin-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  return token;
}

export async function getSession(req?: NextRequest): Promise<AuthUser | null> {
  try {
    // Server-side: check cookies
    if (typeof window === 'undefined') {
      const token = (await cookies()).get('ayin-session')?.value;
      if (!token) return null;
      return jwt.verify(token, JWT_SECRET) as AuthUser;
    }

    // Client-side: check localStorage or authorization header
    const token =
      req?.headers.get('authorization')?.replace('Bearer ', '') ||
      (typeof window !== 'undefined' && localStorage.getItem('session_token'));

    if (!token) return null;
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete('ayin-session');
  if (typeof window !== 'undefined') {
    localStorage.removeItem('session_token');
  }
}