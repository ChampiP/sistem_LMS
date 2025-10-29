import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function getJwtPayload(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (e) {
    return null;
  }
}

export async function GET() {
  try {
    const token = cookies().get('hlm-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await getJwtPayload(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = {
      id: (payload as any).sub ?? (payload as any).userId ?? (payload as any).id,
      email: (payload as any).email,
      name: (payload as any).name,
      role: (payload as any).role,
    };

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error GET /api/me', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
