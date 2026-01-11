// app/api/auth/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin-session');
  
  return NextResponse.json({
    authenticated: session?.value === 'authenticated'
  });
}
