'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, ShoppingCart, Package, BarChart3,
  Plus, Upload, Edit2, Search, X,
  Lock, LogOut, Loader2, AlertTriangle
} from 'lucide-react';

interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  coverUrl: string;
  price: number | string;
  stock: number;
  status: string;
  description?: string;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  books: { bookId: string; quantity: number }[];
  status: string;
  remark?: string;
  createdAt: string;
}

interface StatsData {
  monthlySales: number;
  totalOrders: number;
  lowStockCount: number;
  categorySales: { name: string; value: number; percent: number }[];
  slowSelling: Book[];
}

const TABS = [
  { id: 'books', name: '书目管理', icon: BookOpen },
  { id: 'orders', name: '订单管理', icon: ShoppingCart },
  { id: 'restock', name: '进货录入', icon: Package },
  { id: 'stats', name: '销售统计', icon: BarChart3 },
];

const CATEGORIES = ['文学小说', '人文社科', '科技科普', '历史传记', '艺术设计', '儿童读物'];

const STATUS_COLORS: Record<string, string> = {
  '在售': 'bg-green-100 text-green-700',
  '暂无库存': 'bg-orange-100 text-orange-700',
  '下架': 'bg-gray-100 text-gray-700',
  '待确认': 'bg-yellow-100 text-yellow-700',
  '已确认': 'bg-blue-100 text-blue-700',
  '已取书': 'bg-green-100 text-green-700',
  '已取消': 'bg-red-100 text-red-700',
};

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookForm, setBookForm] = useState({
    isbn: '', title: '', author: '', publisher: '', category: CATEGORIES[0],
    coverUrl: '', price: '', stock: '', description: ''
  });
  const [restockForm, setRestockForm] = useState({ bookId: '', quantity: '', costPrice: '', supplier: '' });
  const [orderKeyword, setOrderKeyword] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);

  const refreshBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/books');
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch {}
  }, []);

  const refreshOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch {}
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
  }, []);

  const handleLogin = async () => {
    if (!password) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsLoggedIn(true);
      } else {
        const data = await res.json();
        setLoginError(data.error || '密码错误');
      }
    } catch {
      setLoginError('验证失败，请重试');
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      refreshBooks();
      refreshOrders();
    }
  }, [isLoggedIn, refreshBooks, refreshOrders]);

  useEffect(() => {
    if (isLoggedIn && activeTab === 'stats') {
      refreshStats();
    }
  }, [isLoggedIn, activeTab, refreshStats]);

  const openAddBook = () => {
    setEditingBook(null);
    setBookForm({ isbn: '', title: '', author: '', publisher: '', category: CATEGORIES[0], coverUrl: '', price: '', stock: '', description: '' });
    setShowBookModal(true);
  };

  const openEditBook = (book: Book) => {
    setEditingBook(book);
    setBookForm({
      isbn: book.isbn, title: book.title, author: book.author, publisher: book.publisher,
      category: book.category, coverUrl: book.coverUrl, price: String(book.price),
      stock: String(book.stock), description: book.description || ''
    });
    setShowBookModal(true);
  };

  const submitBook = async () => {
    setLoading(true);
    try {
      const payload = {
        ...bookForm,
        price: parseFloat(bookForm.price),
        stock: parseInt(bookForm.stock) || 0,
      };
      const url = editingBook ? `/api/books?id=${editingBook.id}` : '/api/books';
      const method = editingBook ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowBookModal(false);
        await refreshBooks();
      } else {
        const err = await res.json();
        alert(err.error || '保存失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitRestock = async () => {
    if (!restockForm.bookId || !restockForm.quantity || !restockForm.costPrice || !restockForm.supplier) {
      alert('请填写完整信息');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: restockForm.bookId,
          quantity: parseInt(restockForm.quantity),
          costPrice: parseFloat(restockForm.costPrice),
          supplier: restockForm.supplier,
        }),
      });
      if (res.ok) {
        setRestockForm({ bookId: '', quantity: '', costPrice: '', supplier: '' });
        await refreshBooks();
        alert('进货录入成功');
      } else {
        const err = await res.json();
        alert(err.error || '录入失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders?id=${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await refreshOrders();
      } else {
        const err = await res.json();
        alert(err.error || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length <= 1) {
      alert('CSV文件无有效数据行');
      return;
    }

    setCsvImporting(true);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      const isbn = cols[0];
      const title = cols[1];
      const stockStr = cols[2];
      if (!isbn || !title) {
        skipped++;
        continue;
      }

      const stock = parseInt(stockStr) || 0;

      try {
        const createRes = await fetch('/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isbn,
            title,
            author: '未知',
            publisher: '未知',
            category: CATEGORIES[0],
            coverUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20${encodeURIComponent(title)}&image_size=portrait_4_3`,
            price: 0,
            stock,
          }),
        });

        if (createRes.ok) {
          created++;
        } else if (createRes.status === 400) {
          const errData = await createRes.json();
          if (errData.error === 'ISBN已存在') {
            const existingBook = books.find(b => b.isbn === isbn);
            if (existingBook) {
              const patchRes = await fetch(`/api/books?id=${existingBook.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock: existingBook.stock + stock }),
              });
              if (patchRes.ok) {
                updated++;
              } else {
                errors.push(`第${i + 1}行：更新库存失败`);
              }
            } else {
              await refreshBooks();
              const refreshedBooks = await fetch('/api/books').then(r => r.ok ? r.json() : []);
              const found = refreshedBooks.find((b: Book) => b.isbn === isbn);
              if (found) {
                const patchRes = await fetch(`/api/books?id=${found.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ stock: found.stock + stock }),
                });
                if (patchRes.ok) updated++;
                else errors.push(`第${i + 1}行：更新库存失败`);
              } else {
                skipped++;
              }
            }
          } else {
            errors.push(`第${i + 1}行：${errData.error || '导入失败'}`);
            skipped++;
          }
        }
      } catch {
        errors.push(`第${i + 1}行：网络错误`);
        skipped++;
      }
    }

    await refreshBooks();
    setCsvImporting(false);

    let msg = `导入完成：新增 ${created} 本，更新库存 ${updated} 本`;
    if (skipped > 0) msg += `，跳过 ${skipped} 行`;
    if (errors.length > 0) msg += `\n错误：${errors.slice(0, 5).join('；')}`;
    alert(msg);
  };

  const filteredOrders = orders.filter(o => {
    if (orderKeyword && !o.customerPhone.includes(orderKeyword) && !o.customerName.includes(orderKeyword)) return false;
    if (orderStatusFilter && o.status !== orderStatusFilter) return false;
    return true;
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm p-8 bg-gray-50 rounded-2xl shadow-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#8b5a2b]/10 rounded-2xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-[#8b5a2b]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">店主后台</h1>
            <p className="text-sm text-gray-500 mt-1">请输入管理密码</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30"
            />
            {loginError && <p className="text-sm text-red-500">{loginError}</p>}
            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full py-3 bg-[#8b5a2b] text-white rounded-xl font-semibold hover:bg-[#6b4420] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8 px-2">
          <BookOpen className="w-6 h-6 text-[#8b5a2b]" />
          <span className="font-bold text-gray-800">墨香书店</span>
        </div>
        <nav className="space-y-1 flex-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                activeTab === tab.id
                  ? 'bg-[#8b5a2b]/10 text-[#8b5a2b] font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </nav>
        <button
          onClick={() => setIsLoggedIn(false)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <LogOut className="w-4 h-4" />
          退出
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        {activeTab === 'books' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-800">书目管理</h1>
              <div className="flex gap-3">
                <label className={`px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${csvImporting ? 'opacity-60 pointer-events-none' : ''}`}>
                  <Upload className="w-4 h-4" />
                  {csvImporting ? '导入中...' : '导入CSV'}
                  <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} disabled={csvImporting} />
                </label>
                <button
                  onClick={openAddBook}
                  className="px-4 py-2 bg-[#8b5a2b] text-white rounded-lg text-sm font-medium hover:bg-[#6b4420] flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  新增书目
                </button>
              </div>
            </div>
            {books.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">暂无书目</p>
                <p className="text-sm text-gray-400 mt-1">点击"新增书目"或"导入CSV"添加</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">封面</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">书名</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ISBN</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">作者</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">分类</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">售价</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">库存</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {books.map(book => (
                      <tr key={book.id} className={book.stock <= 3 && book.stock > 0 ? 'bg-orange-50/40' : ''}>
                        <td className="px-4 py-3">
                          {book.coverUrl ? (
                            <img src={book.coverUrl} alt="" className="w-10 h-14 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center">
                              <BookOpen className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{book.title}</div>
                          {book.stock <= 3 && book.stock > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-orange-600 mt-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              库存预警
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">{book.isbn}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{book.author}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{book.category}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 text-right font-medium">¥{Number(book.price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-center font-medium">
                          <span className={book.stock <= 3 && book.stock > 0 ? 'text-orange-600' : 'text-gray-800'}>
                            {book.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[book.status]}`}>
                            {book.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => openEditBook(book)} className="p-1.5 text-gray-500 hover:text-[#8b5a2b] hover:bg-[#8b5a2b]/10 rounded">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-800">订单管理</h1>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="手机号/姓名"
                    value={orderKeyword}
                    onChange={(e) => setOrderKeyword(e.target.value)}
                    className="pl-9 pr-4 py-2 w-48 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30"
                  />
                </div>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30"
                >
                  <option value="">全部状态</option>
                  <option value="待确认">待确认</option>
                  <option value="已确认">已确认</option>
                  <option value="已取书">已取书</option>
                  <option value="已取消">已取消</option>
                </select>
              </div>
            </div>
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">暂无订单</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">订单号</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">顾客</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">手机号</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">书目</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">下单时间</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">备注</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map(order => (
                      <tr key={order.id}>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{order.id.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">{order.customerName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{order.customerPhone}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{order.books.length} 本</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.createdAt).toLocaleString('zh-CN')}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{order.remark || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            {order.status === '待确认' && (
                              <>
                                <button onClick={() => updateOrderStatus(order.id, '已确认')} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">确认</button>
                                <button onClick={() => updateOrderStatus(order.id, '已取消')} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">取消</button>
                              </>
                            )}
                            {order.status === '已确认' && (
                              <>
                                <button onClick={() => updateOrderStatus(order.id, '已取书')} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">已取</button>
                                <button onClick={() => updateOrderStatus(order.id, '已取消')} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">取消</button>
                              </>
                            )}
                            {(order.status === '已取书' || order.status === '已取消') && (
                              <span className="text-xs text-gray-400">已完成</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'restock' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">进货录入</h1>
            {books.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">暂无书目可进货</p>
                <p className="text-sm text-gray-400 mt-1">请先在书目管理中添加书籍</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">选择书目</label>
                    <select
                      value={restockForm.bookId}
                      onChange={(e) => setRestockForm({ ...restockForm, bookId: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30"
                    >
                      <option value="">请选择书目</option>
                      {books.map(b => (
                        <option key={b.id} value={b.id}>{b.title}（当前库存：{b.stock}）</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">进货数量</label>
                    <input
                      type="number"
                      placeholder="请输入数量"
                      value={restockForm.quantity}
                      onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">进货价（元/本）</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="请输入进货价"
                      value={restockForm.costPrice}
                      onChange={(e) => setRestockForm({ ...restockForm, costPrice: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                    <input
                      type="text"
                      placeholder="请输入供应商名称"
                      value={restockForm.supplier}
                      onChange={(e) => setRestockForm({ ...restockForm, supplier: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30"
                    />
                  </div>
                  <button
                    onClick={submitRestock}
                    disabled={loading}
                    className="w-full py-3 bg-[#8b5a2b] text-white rounded-xl font-semibold hover:bg-[#6b4420] transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    确认录入
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">销售统计</h1>
            {!stats ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#8b5a2b]" />
                <p className="text-gray-500 mt-3">加载统计中...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <p className="text-sm text-gray-500 mb-1">本月销售额</p>
                    <p className="text-3xl font-bold text-[#8b5a2b]">¥{stats.monthlySales.toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <p className="text-sm text-gray-500 mb-1">订单总数</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.totalOrders}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <p className="text-sm text-gray-500 mb-1">库存预警书目</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.lowStockCount}</p>
                    <p className="text-xs text-gray-500 mt-1">需要及时补货</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">各分类销量占比</h3>
                    {stats.categorySales.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">暂无销售数据</p>
                    ) : (
                      <div className="space-y-3">
                        {stats.categorySales.map(cat => (
                          <div key={cat.name}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700">{cat.name}</span>
                              <span className="text-gray-500">{cat.percent}%（{cat.value}本）</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#8b5a2b] rounded-full" style={{ width: `${cat.percent}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">滞销书列表（超过60天无销售）</h3>
                    {stats.slowSelling.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">暂无滞销书目</p>
                    ) : (
                      <div className="space-y-3">
                        {stats.slowSelling.map(book => (
                          <div key={book.id} className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              {book.coverUrl ? (
                                <img src={book.coverUrl} alt="" className="w-8 h-10 object-cover rounded" />
                              ) : (
                                <div className="w-8 h-10 bg-gray-100 rounded flex items-center justify-center">
                                  <BookOpen className="w-3 h-3 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-800">{book.title}</p>
                                <p className="text-xs text-gray-500">{book.author}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-red-600">库存 {book.stock}</p>
                              <p className="text-xs text-gray-500">建议促销</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {showBookModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowBookModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white z-50 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">{editingBook ? '编辑书目' : '新增书目'}</h2>
              <button onClick={() => setShowBookModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                  <input type="text" value={bookForm.isbn} onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30" disabled={!!editingBook} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">书名</label>
                  <input type="text" value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">作者</label>
                  <input type="text" value={bookForm.author} onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">出版社</label>
                  <input type="text" value={bookForm.publisher} onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                  <select value={bookForm.category} onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">售价（元）</label>
                  <input type="number" step="0.01" value={bookForm.price} onChange={(e) => setBookForm({ ...bookForm, price: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">库存数量</label>
                  <input type="number" value={bookForm.stock} onChange={(e) => setBookForm({ ...bookForm, stock: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">封面URL</label>
                  <input type="text" value={bookForm.coverUrl} onChange={(e) => setBookForm({ ...bookForm, coverUrl: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">内容简介</label>
                  <textarea rows={3} value={bookForm.description} onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowBookModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                取消
              </button>
              <button onClick={submitBook} disabled={loading} className="flex-1 py-2.5 bg-[#8b5a2b] text-white rounded-lg font-medium hover:bg-[#6b4420] transition disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                保存
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
