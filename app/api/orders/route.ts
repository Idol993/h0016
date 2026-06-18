import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const orderItemSchema = z.object({
  bookId: z.string(),
  quantity: z.coerce.number().int().positive('数量必须为正整数'),
});

const createOrderSchema = z.object({
  customerName: z.string().min(1, '姓名不能为空'),
  customerPhone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  books: z.array(orderItemSchema).min(1, '至少选择一本书'),
  remark: z.string().optional(),
});

const updateOrderSchema = z.object({
  status: z.enum(['待确认', '已确认', '已取书', '已取消']),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone') || '';
  const status = searchParams.get('status') || '';

  const where: any = {};
  if (phone) where.customerPhone = phone;
  if (status) where.status = status;

  try {
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      for (const item of validated.books) {
        const book = await tx.book.findUnique({ where: { id: item.bookId } });
        if (!book) {
          throw new Error(`书目ID ${item.bookId} 不存在`);
        }
        if (book.stock < item.quantity) {
          throw new Error(`《${book.title}》库存不足，当前仅 ${book.stock} 本`);
        }
        await tx.book.update({
          where: { id: item.bookId },
          data: {
            stock: { decrement: item.quantity },
            status: book.stock - item.quantity <= 0 ? '暂无库存' : book.status,
          },
        });
      }

      const order = await tx.order.create({
        data: {
          customerName: validated.customerName,
          customerPhone: validated.customerPhone,
          books: validated.books,
          remark: validated.remark,
        },
      });
      return order;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || '创建订单失败' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: '缺少订单ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status } = updateOrderSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) {
        throw new Error('订单不存在');
      }

      if (status === '已取消' && order.status !== '已取消') {
        const books = order.books as { bookId: string; quantity: number }[];
        for (const item of books) {
          const book = await tx.book.findUnique({ where: { id: item.bookId } });
          if (book) {
            const newStock = book.stock + item.quantity;
            await tx.book.update({
              where: { id: item.bookId },
              data: {
                stock: newStock,
                status: book.status === '暂无库存' && newStock > 0 ? '在售' : book.status,
              },
            });
          }
        }
      }

      const validTransitions: Record<string, string[]> = {
        '待确认': ['已确认', '已取消'],
        '已确认': ['已取书', '已取消'],
        '已取书': [],
        '已取消': [],
      };

      if (!validTransitions[order.status]?.includes(status)) {
        throw new Error(`订单状态不能从 ${order.status} 变更为 ${status}`);
      }

      return tx.order.update({
        where: { id },
        data: { status },
      });
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || '更新失败' }, { status: 400 });
  }
}
