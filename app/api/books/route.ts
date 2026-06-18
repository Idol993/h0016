import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const isbnRegex = /^(?:ISBN(?:-13)?:?\s*)?(?=[0-9]{13}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9]{13}$)/;

const createBookSchema = z.object({
  isbn: z.string().regex(isbnRegex, 'ISBN格式不正确'),
  title: z.string().min(1, '书名不能为空'),
  author: z.string().min(1, '作者不能为空'),
  publisher: z.string().min(1, '出版社不能为空'),
  category: z.string().min(1, '分类不能为空'),
  coverUrl: z.string().url('封面URL格式不正确'),
  price: z.coerce.number().positive('售价必须为正数'),
  stock: z.coerce.number().int().nonnegative('库存数量不能为负数').default(0),
  description: z.string().optional(),
});

const updateBookSchema = z.object({
  stock: z.coerce.number().int().nonnegative('库存数量不能为负数').optional(),
  price: z.coerce.number().positive('售价必须为正数').optional(),
  status: z.enum(['在售', '暂无库存', '下架']).optional(),
  title: z.string().optional(),
  author: z.string().optional(),
  publisher: z.string().optional(),
  category: z.string().optional(),
  coverUrl: z.string().url().optional(),
  description: z.string().optional(),
});

function computeStatus(stock: number, currentStatus?: string | null): string {
  if (currentStatus === '下架') return '下架';
  if (stock <= 0) return '暂无库存';
  return '在售';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const category = searchParams.get('category') || '';
  const status = searchParams.get('status') || '';

  const where: any = {};

  if (keyword) {
    where.OR = [
      { title: { contains: keyword, mode: 'insensitive' } },
      { author: { contains: keyword, mode: 'insensitive' } },
    ];
  }
  if (category) {
    where.category = category;
  }
  if (status) {
    where.status = status;
  }

  try {
    const books = await prisma.book.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(books);
  } catch (error) {
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createBookSchema.parse(body);

    const existingBook = await prisma.book.findUnique({ where: { isbn: validated.isbn } });
    if (existingBook) {
      return NextResponse.json({ error: 'ISBN已存在' }, { status: 400 });
    }

    const status = computeStatus(validated.stock);
    const book = await prisma.book.create({
      data: { ...validated, status },
    });
    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: '缺少书目ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validated = updateBookSchema.parse(body);

    const currentBook = await prisma.book.findUnique({ where: { id } });
    if (!currentBook) {
      return NextResponse.json({ error: '书目不存在' }, { status: 404 });
    }

    let finalStatus = validated.status || currentBook.status;
    if (validated.stock !== undefined) {
      finalStatus = computeStatus(validated.stock, currentBook.status);
    }

    const book = await prisma.book.update({
      where: { id },
      data: { ...validated, status: finalStatus },
    });
    return NextResponse.json(book);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
