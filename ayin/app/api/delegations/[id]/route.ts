import { NextRequest, NextResponse } from 'next/server';
import type { Delegation, ApiResponse } from '@/lib/types';

// In-memory storage for delegations (mock)
// In production, this would be stored in a database
// This is a fallback when contract is not deployed
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

// Export mockDelegations for use in parent route
export { mockDelegations };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const delegation = mockDelegations.find((d) => d.id === id);

    if (!delegation) {
      const response: ApiResponse<Delegation> = {
        success: false,
        error: 'DELEGATION_NOT_FOUND',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<Delegation> = {
      success: true,
      data: delegation,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<Delegation> = {
      success: false,
      error: 'SERVER_ERROR',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const delegationIndex = mockDelegations.findIndex((d) => d.id === id);

    if (delegationIndex === -1) {
      const response: ApiResponse<Delegation> = {
        success: false,
        error: 'DELEGATION_NOT_FOUND',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const delegation = mockDelegations[delegationIndex];

    // Update status to expired (simulating revocation)
    // In production, this would check onchain status via DelegationPolicy contract
    delegation.status = 'expired';

    const response: ApiResponse<Delegation> = {
      success: true,
      data: delegation,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<Delegation> = {
      success: false,
      error: 'SERVER_ERROR',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

