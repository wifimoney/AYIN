import { NextRequest, NextResponse } from 'next/server';
import type { Delegation, ApiResponse } from '@/lib/types';
import { getDelegationById, updateDelegationStatus } from '@/lib/data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const delegation = getDelegationById(id);

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
    const delegation = getDelegationById(id);

    if (!delegation) {
      const response: ApiResponse<Delegation> = {
        success: false,
        error: 'DELEGATION_NOT_FOUND',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Update status to expired (simulating revocation)
    const updatedDelegation = updateDelegationStatus(id, 'expired');

    const response: ApiResponse<Delegation> = {
      success: true,
      data: updatedDelegation!,
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
