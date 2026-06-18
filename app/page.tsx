'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Phone, User, Loader2, BookOpen } from 'lucide-react';

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

const CATEGORIES = ['全部', '文学小说', '人文社科', '科技科普', '历史传记', '艺术设计', '儿童读物'];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

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
    </main>
  );
}
