import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Ping database to confirm connectivity
    await prisma.$queryRaw`SELECT 1;`;

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown database error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
