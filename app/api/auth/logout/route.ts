import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const res = NextResponse.json({ message: 'Logged out' });
    res.cookies.delete('hlm-token');
    return res;
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
