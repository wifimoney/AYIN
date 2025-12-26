import { createClient, Errors } from '@farcaster/quick-auth';
import { NextRequest, NextResponse } from 'next/server';
import { createSession, getSession } from '@/lib/auth';
import jwt from 'jsonwebtoken';

// Quick Auth domain - should match your deployment domain
const domain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
const quickAuthClient = createClient();

export async function GET() {
  try {
    const user = await getSession();
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Farcaster Quick Auth flow (JWT verification)
    if (body.token) {
      const authorization = req.headers.get('Authorization');
      const token = body.token || authorization?.split(' ')[1];

      if (!token) {
        return NextResponse.json({ error: 'Missing token' }, { status: 401 });
      }

      try {
        // Verify JWT with Quick Auth
        const payload = await quickAuthClient.verifyJwt({ token, domain });

        // Create session with verified FID
        const sessionToken = await createSession({
          fid: payload.sub,
          walletAddress: body.walletAddress
        });

        return NextResponse.json({
          success: true,
          token: sessionToken,
          fid: payload.sub
        });
      } catch (e) {
        if (e instanceof Errors.InvalidTokenError) {
          return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        throw e;
      }
    }

    // Base Account authentication (address-based)
    if (body.address) {
      const { address } = body;
      if (!address) {
        return NextResponse.json({ error: 'Missing address' }, { status: 400 });
      }
      // Use createSession to set the cookie
      const token = await createSession({ address });
      return NextResponse.json({ token, success: true });
    }

    // Legacy Farcaster authentication (FID-based, no Quick Auth)
    const { fid, username, walletAddress } = body;
    if (!fid) {
      return NextResponse.json({ error: 'FID, token, or address required' }, { status: 400 });
    }

    await createSession({ fid, username, walletAddress });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}