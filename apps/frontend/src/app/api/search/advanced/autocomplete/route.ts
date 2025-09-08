import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const base = q.toLowerCase() || 'js';
  const suggestions = [
    `${base} fundamentals`,
    `${base} advanced`,
    `${base} patterns`,
  ];
  return NextResponse.json(suggestions);
}

