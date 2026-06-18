import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId') || '';

  try {
    const where: any = {};
    if (bookId) where.bookId = bookId;

    const logs = await prisma.stockLog.findMany({
      where,
      include: { book: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
