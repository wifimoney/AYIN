import { NextRequest, NextResponse } from 'next/server';
import type { Delegation, DelegationIntent, ApiResponse } from '@/lib/types';
import { getSession } from '@/lib/auth';

// In-memory storage for delegations (mock)
// In production, this would be stored in a database
let mockDelegations: Delegation[] = [
  {
    id: 'del-1',
    agentId: '1',
    agentName: 'Sentinel Alpha',
    status: 'active',
    constraints: {
      agentId: '1',
      allocation: 5000,
      duration: 30,
      maxDrawdown: 10,
      maxPosition: 20,
      deltaNeutral: true,
      stopLoss: true,
    },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let delegations = [...mockDelegations];

    // Filter by status if provided
    if (status) {
      delegations = delegations.filter((d) => d.status === status);
    }

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
    const existingDelegation = mockDelegations.find(
      (d) => d.agentId === intent.agentId && d.status === 'active'
    );

    if (existingDelegation) {
      const response: ApiResponse<Delegation> = {
        success: false,
        error: 'DELEGATION_EXISTS',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create new delegation with pending status
    // In production, this would trigger backend validation and on-chain execution
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

    // Simulate async processing - mark as active after creation
    // In production, status would update based on on-chain confirmation
    setTimeout(() => {
      const delegation = mockDelegations.find((d) => d.id === newDelegation.id);
      if (delegation) {
        delegation.status = 'active';
      }
    }, 2000);

    mockDelegations.push(newDelegation);

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

