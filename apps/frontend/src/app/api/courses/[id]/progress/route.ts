import { NextResponse } from 'next/server';

let progressByCourse: Record<string, number> = {};

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const value = progressByCourse[params.id] ?? 0;
  return NextResponse.json({ success: true, data: { progress: value } });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const value = Number(body?.progress ?? 0);
  progressByCourse[params.id] = Math.max(0, Math.min(100, value));
  return NextResponse.json({ success: true, message: 'Progress updated' });
}

