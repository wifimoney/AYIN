import { NextRequest, NextResponse } from 'next/server';
import type { Delegation, DelegationIntent, ApiResponse } from '@/lib/types';
import { getSession } from '@/lib/auth';
import {
  getDelegations,
  addDelegation,
  hasActiveDelegation,
  updateDelegationStatus,
} from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const delegations = getDelegations({ status });

    const response: ApiResponse<Delegation[]> = {
      success: true,
      data: delegations,
    };

    return NextResponse.json(response);
  } catch (error) {
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

    // Check for existing active delegation with same agent
    if (hasActiveDelegation(intent.agentId)) {
      const response: ApiResponse<Delegation> = {
        success: false,
        error: 'DELEGATION_EXISTS',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create new delegation with pending status
    const newDelegation: Delegation = {
      id: `del-${Date.now()}`,
      agentId: intent.agentId,
      status: 'pending',
      constraints: intent,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(
        Date.now() + intent.duration * 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    // Add to centralized data store
    addDelegation(newDelegation);

    // Simulate async processing - mark as active after creation
    setTimeout(() => {
      updateDelegationStatus(newDelegation.id, 'active');
    }, 2000);

    const response: ApiResponse<Delegation> = {
      success: true,
      data: newDelegation,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const response: ApiResponse<Delegation> = {
      success: false,
      error: 'SERVER_ERROR',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
