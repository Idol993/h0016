import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const pickedOrders = await prisma.order.findMany({
      where: {
        status: '已取书',
        createdAt: { gte: monthStart },
      },
    });

    const allBooks = await prisma.book.findMany();
    const bookMap = new Map(allBooks.map(b => [b.id, b]));

    let monthlySales = 0;
    const categoryCount: Record<string, number> = {};

    for (const order of pickedOrders) {
      const items = order.books as { bookId: string; quantity: number }[];
      for (const item of items) {
        const book = bookMap.get(item.bookId);
        if (book) {
          const lineTotal = Number(book.price) * item.quantity;
          monthlySales += lineTotal;
          categoryCount[book.category] = (categoryCount[book.category] || 0) + item.quantity;
        }
      }
    }

    const totalCategoryQty = Object.values(categoryCount).reduce((s, v) => s + v, 0);
    const categorySales = Object.entries(categoryCount).map(([name, value]) => ({
      name,
      value,
      percent: totalCategoryQty > 0 ? Math.round((value / totalCategoryQty) * 100) : 0,
    }));

    const allPickedOrders = await prisma.order.findMany({
      where: { status: '已取书' },
    });

    const soldBookIds = new Set<string>();
    for (const order of allPickedOrders) {
      if (new Date(order.createdAt) >= sixtyDaysAgo) {
        const items = order.books as { bookId: string; quantity: number }[];
        for (const item of items) {
          soldBookIds.add(item.bookId);
        }
      }
    }

    const slowSelling = allBooks.filter(b => !soldBookIds.has(b.id) && b.stock > 0);

    const totalOrders = await prisma.order.count();
    const lowStockCount = allBooks.filter(b => b.stock <= 3 && b.stock > 0).length;

    return NextResponse.json({
      monthlySales,
      totalOrders,
      lowStockCount,
      categorySales,
      slowSelling,
    });
  } catch (error) {
    return NextResponse.json({ error: '统计查询失败' }, { status: 500 });
  }
}
