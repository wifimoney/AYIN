import { NextRequest, NextResponse } from 'next/server';
import type { Agent, ApiResponse } from '@/lib/types';
import { getAgentById } from '@/lib/data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = getAgentById(id);

    if (!agent) {
      const response: ApiResponse<Agent> = {
        success: false,
        error: 'AGENT_NOT_FOUND',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<Agent> = {
      success: true,
      data: agent,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<Agent> = {
      success: false,
      error: 'SERVER_ERROR',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
