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

const mockBooks: Book[] = [
  {
    id: '1',
    isbn: '9787544270878',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    publisher: '南海出版公司',
    category: '文学小说',
    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',
    price: 55.0,
    stock: 12,
    status: '在售',
    description: '《百年孤独》是魔幻现实主义文学的代表作，描写了布恩迪亚家族七代人的传奇故事，以及加勒比海沿岸小镇马孔多的百年兴衰。',
  },
  {
    id: '2',
    isbn: '9787020002207',
    title: '红楼梦',
    author: '曹雪芹',
    publisher: '人民文学出版社',
    category: '文学小说',
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop',
    price: 59.7,
    stock: 8,
    status: '在售',
    description: '中国古典四大名著之首，以贾、史、王、薛四大家族的兴衰为背景，以富贵公子贾宝玉为视角，描绘了一批举止见识高于须眉之上的闺阁佳人的人生百态。',
  },
  {
    id: '3',
    isbn: '9787508694603',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    publisher: '中信出版社',
    category: '历史传记',
    coverUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=600&fit=crop',
    price: 68.0,
    stock: 3,
    status: '在售',
    description: '从十万年前有生命迹象开始到21世纪资本、科技交织的人类发展史，厘清影响人类发展的重大脉络。',
  },
  {
    id: '4',
    isbn: '9787111213826',
    title: '设计心理学',
    author: '唐纳德·A·诺曼',
    publisher: '中信出版社',
    category: '艺术设计',
    coverUrl: 'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=400&h=600&fit=crop',
    price: 42.0,
    stock: 0,
    status: '暂无库存',
    description: '以心理学视角剖析设计中的日常用品，探讨了以人为本的设计理念。',
  },
  {
    id: '5',
    isbn: '9787530211199',
    title: '平凡的世界',
    author: '路遥',
    publisher: '北京十月文艺出版社',
    category: '文学小说',
    coverUrl: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=600&fit=crop',
    price: 108.0,
    stock: 15,
    status: '在售',
    description: '茅盾文学奖获奖作品，一部全景式地表现中国当代城乡社会生活的长篇小说。',
  },
  {
    id: '6',
    isbn: '9787544291163',
    title: '小王子',
    author: '圣埃克苏佩里',
    publisher: '人民文学出版社',
    category: '儿童读物',
    coverUrl: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=600&fit=crop',
    price: 22.0,
    stock: 2,
    status: '在售',
    description: '一部为成年人写的童话，告诉我们要用心灵去看事物的本质。',
  },
];

export default function Home() {
  const [books, setBooks] = useState<Book[]>(mockBooks);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [successMsg, setSuccessMsg] = useState('');

  const debouncedKeyword = useDebounce(keyword, 300);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (debouncedKeyword) params.set('keyword', debouncedKeyword);
        if (activeCategory !== '全部') params.set('category', activeCategory);
        const res = await fetch(`/api/books?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setBooks(data);
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [debouncedKeyword, activeCategory]);

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
        setBooks(prev => prev.map(b => b.id === selectedBook.id
          ? { ...b, stock: b.stock - 1, status: b.stock - 1 <= 0 ? '暂无库存' : b.status }
          : b));
        setTimeout(() => {
          setShowPanel(false);
          setSuccessMsg('');
          setFormData({ name: '', phone: '' });
          setSelectedBook(null);
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
  }, [selectedBook, formData]);

  const filteredBooks = books.filter(b => {
    if (activeCategory !== '全部' && b.category !== activeCategory) return false;
    if (debouncedKeyword) {
      const k = debouncedKeyword.toLowerCase();
      return b.title.toLowerCase().includes(k) || b.author.toLowerCase().includes(k);
    }
    return true;
  });

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
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-20 text-[#8b5a2b]/60">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p>暂无符合条件的书籍</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredBooks.map(book => (
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
                  {book.status === '在售' && book.stock > 3 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                      库存充足
                    </span>
                  )}
                  {book.status === '在售' && book.stock <= 3 && book.stock > 0 && (
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
                  {selectedBook.status === '在售' && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      库存 {selectedBook.stock}
                    </span>
                  )}
                  {selectedBook.status === '暂无库存' && (
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
                {selectedBook.status === '在售' && (
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
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
