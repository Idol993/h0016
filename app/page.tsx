'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Phone, User, Loader2, BookOpen, ClipboardList, Clock, CheckCircle, XCircle, Package } from 'lucide-react';

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

interface OrderBook {
  id: string;
  title: string;
  author: string;
  price: number | string;
  coverUrl: string;
}

interface OrderItem {
  bookId: string;
  quantity: number;
  book: OrderBook | null;
  subtotal: number;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  books: OrderItem[];
  status: '待确认' | '已确认' | '已取书' | '已取消';
  remark?: string;
  pickedAt?: string;
  createdAt: string;
  updatedAt: string;
  totalAmount: number;
}

const CATEGORIES = ['全部', '文学小说', '人文社科', '科技科普', '历史传记', '艺术设计', '儿童读物'];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const STATUS_COLORS: Record<string, string> = {
  '待确认': 'bg-yellow-100 text-yellow-700',
  '已确认': 'bg-blue-100 text-blue-700',
  '已取书': 'bg-green-100 text-green-700',
  '已取消': 'bg-gray-100 text-gray-500',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  '待确认': <Clock className="w-4 h-4" />,
  '已确认': <CheckCircle className="w-4 h-4" />,
  '已取书': <Package className="w-4 h-4" />,
  '已取消': <XCircle className="w-4 h-4" />,
};

const STATUS_HINTS: Record<string, string> = {
  '待确认': '请等待店主确认您的预留订单，确认后会通知您取书',
  '已确认': '订单已确认，请在营业时间内到店取书，逾期可能会被取消',
  '已取书': '感谢您的惠顾，欢迎再次光临',
  '已取消': '订单已取消，如有疑问请联系店主',
};

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [successMsg, setSuccessMsg] = useState('');

  const [showMyOrders, setShowMyOrders] = useState(false);
  const [queryPhone, setQueryPhone] = useState('');
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersQuerying, setOrdersQuerying] = useState(false);

  const debouncedKeyword = useDebounce(keyword, 300);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedKeyword) params.set('keyword', debouncedKeyword);
      if (activeCategory !== '全部') params.set('category', activeCategory);
      params.set('status', '在售');
      const res = await fetch(`/api/books?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [debouncedKeyword, activeCategory]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleReserve = useCallback(async () => {
    if (!selectedBook) return;
    if (!formData.name || !formData.phone) {
      alert('请填写姓名和手机号');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      alert('手机号格式不正确');
      return;
    }
    setReserving(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.name,
          customerPhone: formData.phone,
          books: [{ bookId: selectedBook.id, quantity: 1 }],
        }),
      });
      if (res.ok) {
        setSuccessMsg('预留成功！请等待店主确认');
        setTimeout(() => {
          setShowPanel(false);
          setSuccessMsg('');
          setFormData({ name: '', phone: '' });
          setSelectedBook(null);
          fetchBooks();
        }, 2000);
      } else {
        const err = await res.json();
        alert(err.error || '预留失败');
      }
    } catch {
      alert('预留失败，请稍后重试');
    } finally {
      setReserving(false);
    }
  }, [selectedBook, formData, fetchBooks]);

  const queryMyOrders = useCallback(async () => {
    if (!queryPhone) {
      alert('请输入预留时使用的手机号');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(queryPhone)) {
      alert('手机号格式不正确');
      return;
    }
    setOrdersQuerying(true);
    try {
      const res = await fetch(`/api/orders?phone=${queryPhone}`);
      if (res.ok) {
        const data = await res.json();
        setMyOrders(data);
        setOrdersLoading(true);
        setTimeout(() => setOrdersLoading(false), 300);
      } else {
        alert('查询失败，请稍后重试');
      }
    } catch {
      alert('查询失败，请稍后重试');
    } finally {
      setOrdersQuerying(false);
    }
  }, [queryPhone]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <main className="min-h-screen bg-[#faf7f2]">
      <header className="sticky top-0 z-30 bg-[#faf7f2]/95 backdrop-blur-sm border-b border-[#e8dccf]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-[#8b5a2b]" />
              <h1 className="text-2xl font-bold text-[#5a3a1a] tracking-wide">墨香书店</h1>
            </div>
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b5a2b]/50" />
              <input
                type="text"
                placeholder="搜索书名或作者..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[#d4c4b0] bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30 text-[#5a3a1a] placeholder:text-[#8b5a2b]/40"
              />
            </div>
            <button
              onClick={() => setShowMyOrders(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#8b5a2b] hover:text-[#5a3a1a] border border-[#d4c4b0] rounded-lg hover:bg-white/60 transition"
            >
              <ClipboardList className="w-4 h-4" />
              我的预留
            </button>
            <a
              href="/admin"
              className="px-4 py-2 text-sm text-[#8b5a2b] hover:text-[#5a3a1a] border border-[#d4c4b0] rounded-lg hover:bg-white/60 transition"
            >
              店主入口
            </a>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 text-sm rounded-full transition ${
                  activeCategory === cat
                    ? 'bg-[#8b5a2b] text-white shadow-md'
                    : 'bg-white/60 text-[#5a3a1a] border border-[#d4c4b0] hover:bg-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="book-card rounded-2xl p-4 animate-pulse">
                <div className="aspect-[2/3] bg-[#d4c4b0]/50 rounded-xl mb-3" />
                <div className="h-4 bg-[#d4c4b0]/50 rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#d4c4b0]/30 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 text-[#8b5a2b]/60">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg">暂无在售书籍</p>
            <p className="text-sm mt-2">店主正在整理书架，请稍后再来</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.map(book => (
              <div
                key={book.id}
                onClick={() => { setSelectedBook(book); setShowPanel(true); }}
                className="book-card rounded-2xl p-4 cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-200 group"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden mb-3 relative shadow-md">
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {book.status !== '在售' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="px-3 py-1 bg-orange-500 text-white text-xs rounded-full">
                        {book.status}
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-[#3a230e] line-clamp-1 text-base leading-tight">
                  {book.title}
                </h3>
                <p className="text-xs text-[#8b5a2b]/70 mt-1 line-clamp-1">{book.author}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[#dc2626] font-bold text-lg">
                    ¥{Number(book.price).toFixed(2)}
                  </span>
                  {book.stock > 3 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                      库存充足
                    </span>
                  )}
                  {book.stock <= 3 && book.stock > 0 && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                      仅剩{book.stock}本
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPanel && selectedBook && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowPanel(false)}
          />
          <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl slide-panel ${
            showPanel ? 'translate-x-0' : 'translate-x-full'
          }`}>
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">图书详情</h2>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="aspect-[2/3] w-2/3 mx-auto rounded-2xl overflow-hidden shadow-xl mb-6">
                  <img src={selectedBook.coverUrl} alt={selectedBook.title} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedBook.title}</h3>
                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  <p>作者：{selectedBook.author}</p>
                  <p>出版社：{selectedBook.publisher}</p>
                  <p>ISBN：{selectedBook.isbn}</p>
                  <p>分类：{selectedBook.category}</p>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-bold text-[#dc2626]">
                    ¥{Number(selectedBook.price).toFixed(2)}
                  </span>
                  {selectedBook.stock > 0 && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      库存 {selectedBook.stock}
                    </span>
                  )}
                  {selectedBook.stock <= 0 && (
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">
                      暂无库存
                    </span>
                  )}
                </div>
                {selectedBook.description && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">内容简介</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{selectedBook.description}</p>
                  </div>
                )}
                {selectedBook.stock > 0 && selectedBook.status === '在售' && (
                  <div className="space-y-3 p-4 bg-[#faf7f2] rounded-xl">
                    <h4 className="font-semibold text-gray-800">预留此书</h4>
                    {successMsg ? (
                      <div className="p-3 bg-green-100 text-green-700 text-sm rounded-lg text-center">
                        {successMsg}
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="您的姓名"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30"
                          />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="tel"
                            placeholder="手机号（用于通知取书）"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30"
                          />
                        </div>
                        <button
                          onClick={handleReserve}
                          disabled={reserving}
                          className="w-full py-3 bg-[#8b5a2b] text-white rounded-xl font-semibold hover:bg-[#6b4420] transition disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {reserving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              提交中...
                            </>
                          ) : (
                            '确认预留'
                          )}
                        </button>
                      </>
                    )}
                  </div>
                )}
                {selectedBook.stock <= 0 && (
                  <div className="p-4 bg-orange-50 rounded-xl text-center">
                    <p className="text-orange-700 text-sm">此书暂无库存，无法预留</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showMyOrders && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowMyOrders(false)}
          />
          <div className={`fixed top-0 right-0 h-full w-full max-w-xl bg-white z-50 shadow-2xl slide-panel ${
            showMyOrders ? 'translate-x-0' : 'translate-x-full'
          }`}>
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[#8b5a2b]" />
                  <h2 className="text-lg font-bold text-gray-800">我的预留</h2>
                </div>
                <button
                  onClick={() => setShowMyOrders(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 border-b border-gray-100 bg-[#faf7f2]">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="输入预留时的手机号"
                      value={queryPhone}
                      onChange={(e) => setQueryPhone(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && queryMyOrders()}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]/30"
                    />
                  </div>
                  <button
                    onClick={queryMyOrders}
                    disabled={ordersQuerying}
                    className="px-6 py-2.5 bg-[#8b5a2b] text-white rounded-lg font-medium hover:bg-[#6b4420] transition disabled:opacity-60 flex items-center gap-2"
                  >
                    {ordersQuerying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        查询中
                      </>
                    ) : (
                      '查询'
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {ordersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                        <div className="h-16 bg-gray-200 rounded mb-3" />
                        <div className="h-4 bg-gray-200 rounded w-1/4" />
                      </div>
                    ))}
                  </div>
                ) : myOrders.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-40" />
                    <p className="text-lg">暂无预留记录</p>
                    <p className="text-sm mt-2">输入手机号查询您的预留订单</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myOrders.map(order => (
                      <div key={order.id} className="bg-[#faf7f2] rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-white/50 border-b border-[#e8dccf]">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                              {STATUS_ICONS[order.status]}
                              {order.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              订单号：{order.id.slice(-8)}
                            </span>
                          </div>
                          <span className="text-[#dc2626] font-bold">
                            ¥{order.totalAmount.toFixed(2)}
                          </span>
                        </div>

                        <div className="p-3 space-y-2">
                          {order.books.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-2">
                              {item.book?.coverUrl && (
                                <img
                                  src={item.book.coverUrl}
                                  alt={item.book.title}
                                  className="w-12 h-16 object-cover rounded"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-800 text-sm line-clamp-1">
                                  {item.book?.title || '未知书籍'}
                                </h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {item.book?.author}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[#dc2626] text-sm font-medium">
                                    ¥{Number(item.book?.price || 0).toFixed(2)}
                                  </span>
                                  <span className="text-gray-400 text-xs">×</span>
                                  <span className="text-gray-600 text-sm">{item.quantity}</span>
                                </div>
                              </div>
                              <span className="text-gray-700 text-sm font-medium">
                                ¥{item.subtotal.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="p-3 bg-white/30 text-xs text-gray-500 space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>下单时间：{formatDate(order.createdAt)}</span>
                          </div>
                          {order.pickedAt && (
                            <div className="flex items-center gap-2">
                              <Package className="w-3 h-3" />
                              <span>取书时间：{formatDate(order.pickedAt)}</span>
                            </div>
                          )}
                        </div>

                        <div className={`p-3 ${
                          order.status === '已确认' ? 'bg-blue-50' :
                          order.status === '待确认' ? 'bg-yellow-50' :
                          order.status === '已取书' ? 'bg-green-50' :
                          'bg-gray-50'
                        }`}>
                          <p className={`text-xs flex items-start gap-2 ${
                            order.status === '已确认' ? 'text-blue-700' :
                            order.status === '待确认' ? 'text-yellow-700' :
                            order.status === '已取书' ? 'text-green-700' :
                            'text-gray-500'
                          }`}>
                            <span className="mt-0.5">{STATUS_ICONS[order.status]}</span>
                            <span>{STATUS_HINTS[order.status]}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
