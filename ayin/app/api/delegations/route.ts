import { NextRequest, NextResponse } from 'next/server';
import type { Delegation, DelegationIntent, DelegationStatus, ApiResponse } from '@/lib/types';
import { getSession } from '@/lib/auth';
import {
  getDelegations,
  hasActiveDelegation,
  createDelegation,
  updateDelegationStatus,
  getUserByWallet,
  createOrUpdateUser,
} from '@/lib/data';
import { notifyAgentService } from '@/lib/api/agent-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') || undefined;

    // Validate status is a valid DelegationStatus
    const status: DelegationStatus | undefined = statusParam as DelegationStatus | undefined;

    // Get user from session
    const walletAddress = session.walletAddress || session.address;
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: 'NO_WALLET' }, { status: 400 });
    }

    const user = await getUserByWallet(walletAddress);
    if (!user) {
      // Return empty list for users without profiles
      const response: ApiResponse<Delegation[]> = {
        success: true,
        data: [],
      };
      return NextResponse.json(response);
    }

    const delegations = await getDelegations({
      status,
      userId: user.id
    });

    const response: ApiResponse<Delegation[]> = {
      success: true,
      data: delegations,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Delegations GET error:', error);
    const response: ApiResponse<Delegation[]> = {
      success: false,
      error: 'SERVER_ERROR',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const intent: DelegationIntent = await request.json();

    // Validate required fields
    if (!intent.agentId) {
      const response: ApiResponse<Delegation> = {
        success: false,
        error: 'VALIDATION_ERROR',
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (intent.allocation <= 0) {
      const response: ApiResponse<Delegation> = {
        success: false,
        error: 'VALIDATION_ERROR',
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (intent.duration < 1 || intent.duration > 365) {
      const response: ApiResponse<Delegation> = {
        success: false,
        error: intent.duration < 1 ? 'DURATION_TOO_SHORT' : 'DURATION_TOO_LONG',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get or create user
    const walletAddress = session.walletAddress || session.address;
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: 'NO_WALLET' }, { status: 400 });
    }

    const user = await createOrUpdateUser({
      walletAddress,
      fid: session.fid,
      username: session.username,
    });

    // Check for existing active delegation with same agent for this user
    const hasExisting = await hasActiveDelegation(intent.agentId, user.id);
    if (hasExisting) {
      const response: ApiResponse<Delegation> = {
        success: false,
        error: 'DELEGATION_EXISTS',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create new delegation in database (starts as PENDING)
    const newDelegation = await createDelegation({
      userId: user.id,
      intent,
    });

    // Notify the agent service to process this delegation (Phase 1.4)
    // This replaces the setTimeout mock with real service call
    notifyAgentService(newDelegation.id, intent).catch((err: Error) => {
      console.error('[API] Failed to notify agent service:', err);
      // TODO: Implement retry queue
    });

    const response: ApiResponse<Delegation> = {
      success: true,
      data: newDelegation,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[API] Delegations POST error:', error);
    const response: ApiResponse<Delegation> = {
      success: false,
      error: 'SERVER_ERROR',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
