import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const restockSchema = z.object({
  bookId: z.string(),
  quantity: z.coerce.number().int().positive('进货数量必须为正整数'),
  costPrice: z.coerce.number().positive('进货价必须为正数'),
  supplier: z.string().min(1, '供应商不能为空'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = restockSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({ where: { id: validated.bookId } });
      if (!book) {
        throw new Error('书目不存在');
      }

      const newStock = book.stock + validated.quantity;
      await tx.book.update({
        where: { id: validated.bookId },
        data: {
          stock: newStock,
          status: book.status === '暂无库存' && newStock > 0 ? '在售' : book.status,
        },
      });

      return tx.restockLog.create({
        data: validated,
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || '进货录入失败' }, { status: 400 });
  }
}

export async function GET() {
  try {
    const logs = await prisma.restockLog.findMany({
      include: { book: { select: { title: true } } },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
