import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, DelegationStatus } from '@/lib/types';
import { updateDelegationStatus, activateDelegation, getDelegationById } from '@/lib/data';

/**
 * Delegation Callback Endpoint
 * Phase 1.4: Connect the Wires
 * 
 * This endpoint is called by the agent service to update delegation status
 * after processing. It replaces the mock setTimeout approach.
 */

// Verify service-to-service authentication token
function verifyServiceToken(request: NextRequest): boolean {
    const token = request.headers.get('X-Service-Token');
    const expectedToken = process.env.AGENT_SERVICE_TOKEN || 'dev-token';
    return token === expectedToken;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Verify service authentication
        if (!verifyServiceToken(request)) {
            return NextResponse.json({ success: false, error: 'UNAUTHORIZED_SERVICE' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Validate callback payload
        const { status, txHash, onchainId, error } = body as {
            status: 'active' | 'failed' | 'expired';
            txHash?: string;
            onchainId?: string;
            error?: string;
        };

        if (!status) {
            return NextResponse.json({ success: false, error: 'MISSING_STATUS' }, { status: 400 });
        }

        // Check delegation exists
        const existing = await getDelegationById(id);
        if (!existing) {
            return NextResponse.json({ success: false, error: 'DELEGATION_NOT_FOUND' }, { status: 404 });
        }

        // Prevent updating already-active or expired delegations
        if (existing.status === 'active' || existing.status === 'expired') {
            return NextResponse.json({
                success: false,
                error: 'DELEGATION_ALREADY_PROCESSED',
                currentStatus: existing.status,
            }, { status: 400 });
        }

        let updatedDelegation;

        // Update based on status
        if (status === 'active' && txHash) {
            // Successful activation with transaction hash
            updatedDelegation = await activateDelegation(id, txHash, onchainId);
            console.log(`[Callback] Delegation ${id} activated with tx: ${txHash}`);
        } else if (status === 'failed') {
            // Failed activation
            updatedDelegation = await updateDelegationStatus(id, 'failed');
            console.error(`[Callback] Delegation ${id} failed:`, error || 'Unknown error');
        } else {
            // Other status updates
            updatedDelegation = await updateDelegationStatus(id, status as DelegationStatus);
            console.log(`[Callback] Delegation ${id} status updated to: ${status}`);
        }

        if (!updatedDelegation) {
            return NextResponse.json({ success: false, error: 'UPDATE_FAILED' }, { status: 500 });
        }

        const response: ApiResponse<typeof updatedDelegation> = {
            success: true,
            data: updatedDelegation,
        };

        return NextResponse.json(response);
    } catch (err) {
        console.error('[Callback] Error processing callback:', err);
        return NextResponse.json({ success: false, error: 'SERVER_ERROR' }, { status: 500 });
    }
}
