import { useState, useMemo, useCallback } from "react";

/* ───── INITIAL DATA ───── */
const ADMIN_ACCOUNT = { id: "admin", name: "관리자", email: "admin@ebrmall.com", password: "admin1234", role: "admin", approved: true, phone: "", company: "" };

const INITIAL_PRODUCTS = [
  { id: 1, name: "라이넥", price: 5500, desc: "라이넥 주사제", stock: 200 },
  { id: 2, name: "히스토불린", price: 33000, desc: "히스토불린 주사제", stock: 100 },
  { id: 3, name: "히시파겐씨", price: 3146, desc: "히시파겐씨 주사제", stock: 150 },
];

const ORDER_FLOW = ["입금대기", "입금확인", "배송준비", "배송중", "배송완료"];
const fmt = n => n.toLocaleString("ko-KR") + "원";
const EMPTY_PRODUCT = { name: "", price: "", desc: "", stock: "" };
const DEFAULT_BANK = { bank: "국민은행", account: "000-0000-0000", holder: "(주)EBRMALL" };

/* ───── SMALL COMPONENTS ───── */
const Toast = ({ t }) => t ? (
  <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${t.type === "success" ? "bg-green-500" : t.type === "error" ? "bg-red-500" : "bg-blue-500"}`}>{t.msg}</div>
) : null;

const ApprovalBadge = ({ s }) => {
  const m = { pending: "bg-yellow-100 text-yellow-700 border-yellow-200", approved: "bg-green-100 text-green-700 border-green-200" };
  const l = { pending: "승인대기", approved: "승인완료" };
  return <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${m[s]}`}>{l[s]}</span>;
};

const OBadge = ({ s }) => {
  const m = { "입금대기": "bg-yellow-50 text-yellow-700 border-yellow-200", "입금확인": "bg-blue-50 text-blue-700 border-blue-200", "배송준비": "bg-purple-50 text-purple-700 border-purple-200", "배송중": "bg-indigo-50 text-indigo-700 border-indigo-200", "배송완료": "bg-green-50 text-green-700 border-green-200" };
  return <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${m[s] || "bg-gray-50 text-gray-600 border-gray-200"}`}>{s}</span>;
};

/* ───── STYLES ───── */
const btnPrimary = "bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const btnOutline = "border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors";
const btnDanger = "border border-red-200 text-red-500 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-50 transition-colors";
const inputCls = "w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white";
const cardCls = "bg-white rounded-xl border border-slate-100 shadow-sm";

/* ───── MAIN APP ───── */
export default function App() {
  const [users, setUsers] = useState([ADMIN_ACCOUNT]);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login");
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "", phone: "", company: "" });
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", addr: "", memo: "" });
  const [selProduct, setSelProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [adminTab, setAdminTab] = useState("members");
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [showProductForm, setShowProductForm] = useState(false);
  const [bankInfo, setBankInfo] = useState(DEFAULT_BANK);
  const [bankForm, setBankForm] = useState(DEFAULT_BANK);
  const [editingBank, setEditingBank] = useState(false);

  const fire = useCallback((msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2200); }, []);
  const nav = useCallback((p) => { setPage(p); setSelProduct(null); setQty(1); setSearch(""); }, []);

  const isAdmin = user?.role === "admin";
  const isApproved = user?.approved === true;

  /* ── Auth ── */
  const doLogin = () => {
    const u = users.find(u => u.email === loginForm.email && u.password === loginForm.password);
    if (!u) return fire("이메일 또는 비밀번호가 올바르지 않습니다.", "error");
    setUser(u); setCart([]); nav(u.role === "admin" ? "admin" : u.approved ? "shop" : "pending");
    fire(`${u.name}님 환영합니다!`);
  };

  const doRegister = () => {
    if (!regForm.name || !regForm.email || !regForm.password) return fire("필수 항목을 모두 입력해주세요.", "error");
    if (users.find(u => u.email === regForm.email)) return fire("이미 등록된 이메일입니다.", "error");
    const nu = { ...regForm, id: Date.now().toString(), role: "member", approved: false };
    setUsers(p => [...p, nu]);
    fire("회원가입 완료! 관리자 승인 후 이용 가능합니다.", "info");
    setRegForm({ name: "", email: "", password: "", phone: "", company: "" }); nav("login");
  };

  const logout = () => { setUser(null); setCart([]); nav("login"); };

  /* ── Admin: Members ── */
  const approveUser = id => { setUsers(p => p.map(u => u.id === id ? { ...u, approved: true } : u)); fire("승인 완료"); };
  const rejectUser = id => { setUsers(p => p.map(u => u.id === id ? { ...u, approved: false } : u)); fire("승인 취소 완료"); };

  /* ── Admin: Orders ── */
  const advanceOrder = oid => {
    setOrders(p => p.map(o => {
      if (o.id !== oid) return o;
      const i = ORDER_FLOW.indexOf(o.status);
      return i < ORDER_FLOW.length - 1 ? { ...o, status: ORDER_FLOW[i + 1] } : o;
    }));
    fire("주문 상태 변경 완료");
  };

  /* ── Admin: Products ── */
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm(EMPTY_PRODUCT);
    setShowProductForm(true);
  };

  const openEditProduct = (p) => {
    setEditingProduct(p.id);
    setProductForm({ name: p.name, price: String(p.price), desc: p.desc, stock: String(p.stock) });
    setShowProductForm(true);
  };

  const cancelProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductForm(EMPTY_PRODUCT);
  };

  const saveProduct = () => {
    const { name, price, desc, stock } = productForm;
    if (!name || !price) return fire("상품명과 가격은 필수입니다.", "error");
    const priceNum = Number(price);
    const stockNum = Number(stock) || 0;
    if (isNaN(priceNum) || priceNum <= 0) return fire("가격을 올바르게 입력해주세요.", "error");

    if (editingProduct) {
      setProducts(p => p.map(item => item.id === editingProduct ? { ...item, name, price: priceNum, desc, stock: stockNum } : item));
      fire("상품이 수정되었습니다.");
    } else {
      const newP = { id: Date.now(), name, price: priceNum, desc, stock: stockNum };
      setProducts(p => [...p, newP]);
      fire("새 상품이 추가되었습니다.");
    }
    cancelProductForm();
  };

  const deleteProduct = (id) => {
    setProducts(p => p.filter(item => item.id !== id));
    fire("상품이 삭제되었습니다.");
  };

  const saveBank = () => {
    if (!bankForm.bank || !bankForm.account || !bankForm.holder) return fire("모든 항목을 입력해주세요.", "error");
    setBankInfo({ ...bankForm });
    setEditingBank(false);
    fire("계좌 정보가 변경되었습니다.");
  };

  /* ── Shop ── */
  const filtered = useMemo(() => products.filter(p => p.name.includes(search)), [search, products]);

  const addToCart = (product, q) => {
    setCart(prev => {
      const ex = prev.find(c => c.id === product.id);
      if (ex) return prev.map(c => c.id === product.id ? { ...c, qty: c.qty + q } : c);
      return [...prev, { ...product, qty: q }];
    });
    fire(`${product.name} ${q}개 장바구니에 담았습니다.`);
  };

  const updateCartQty = (id, q) => setCart(p => q < 1 ? p.filter(c => c.id !== id) : p.map(c => c.id === id ? { ...c, qty: q } : c));
  const removeCart = id => setCart(p => p.filter(c => c.id !== id));
  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const placeOrder = () => {
    if (!orderForm.name || !orderForm.phone || !orderForm.addr) return fire("배송 정보를 모두 입력해주세요.", "error");
    if (cart.length === 0) return fire("장바구니가 비어 있습니다.", "error");
    const o = { id: Date.now().toString(), userId: user.id, userName: user.name, items: [...cart], total: cartTotal, status: "입금대기", date: new Date().toLocaleDateString("ko-KR"), addr: { ...orderForm } };
    setOrders(p => [...p, o]); setCart([]); setOrderForm({ name: "", phone: "", addr: "", memo: "" }); nav("orderDone");
    fire("주문이 완료되었습니다!");
  };

  const myOrders = orders.filter(o => o.userId === user?.id);
  const members = users.filter(u => u.role !== "admin");
  const pendingMembers = members.filter(u => !u.approved);

  if (user) {
    const freshUser = users.find(u => u.id === user.id);
    if (freshUser && freshUser.approved !== user.approved) {
      setTimeout(() => setUser(freshUser), 0);
    }
  }

  /* ═══════════════════ RENDER SECTIONS ═══════════════════ */

  const renderHeader = () => (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={() => nav(isAdmin ? "admin" : "shop")} className="text-lg font-bold tracking-tight text-slate-900">EBRMALL</button>
        {user && isApproved && !isAdmin && (
          <nav className="flex items-center gap-1">
            <button onClick={() => nav("shop")} className={`px-3 py-1.5 rounded-md text-sm font-medium ${page === "shop" || page === "detail" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>상품</button>
            <button onClick={() => nav("cart")} className={`px-3 py-1.5 rounded-md text-sm font-medium relative ${page === "cart" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
              장바구니{cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full flex items-center justify-center" style={{width:18,height:18,fontSize:10}}>{cart.length}</span>}
            </button>
            <button onClick={() => nav("myorders")} className={`px-3 py-1.5 rounded-md text-sm font-medium ${page === "myorders" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>주문내역</button>
          </nav>
        )}
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">{user.name}{isAdmin ? " (관리자)" : ""}</span>
            <button onClick={logout} className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-2.5 py-1 rounded-md">로그아웃</button>
          </div>
        )}
      </div>
    </header>
  );

  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">EBRMALL</h1>
          <p className="text-sm text-slate-400">회원 전용 쇼핑몰</p>
        </div>
        <div className={`${cardCls} p-6`}>
          <div className="space-y-3">
            <input className={inputCls} placeholder="이메일" value={loginForm.email} onChange={e => setLoginForm(p => ({...p, email: e.target.value}))} onKeyDown={e => e.key === "Enter" && doLogin()} />
            <input className={inputCls} type="password" placeholder="비밀번호" value={loginForm.password} onChange={e => setLoginForm(p => ({...p, password: e.target.value}))} onKeyDown={e => e.key === "Enter" && doLogin()} />
          </div>
          <button onClick={doLogin} className={`${btnPrimary} w-full mt-4`}>로그인</button>
          <div className="mt-4 text-center">
            <button onClick={() => nav("register")} className="text-sm text-slate-400 hover:text-slate-600 underline underline-offset-2">회원가입</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRegister = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">회원가입</h1>
          <p className="text-sm text-slate-400">가입 후 관리자 승인이 필요합니다</p>
        </div>
        <div className={`${cardCls} p-6 space-y-3`}>
          <input className={inputCls} placeholder="이름 *" value={regForm.name} onChange={e => setRegForm(p => ({...p, name: e.target.value}))} />
          <input className={inputCls} placeholder="이메일 *" value={regForm.email} onChange={e => setRegForm(p => ({...p, email: e.target.value}))} />
          <input className={inputCls} type="password" placeholder="비밀번호 *" value={regForm.password} onChange={e => setRegForm(p => ({...p, password: e.target.value}))} />
          <input className={inputCls} placeholder="연락처" value={regForm.phone} onChange={e => setRegForm(p => ({...p, phone: e.target.value}))} />
          <input className={inputCls} placeholder="소속/기관명" value={regForm.company} onChange={e => setRegForm(p => ({...p, company: e.target.value}))} />
          <button onClick={doRegister} className={`${btnPrimary} w-full mt-2`}>가입 신청</button>
          <button onClick={() => nav("login")} className="w-full text-sm text-slate-400 hover:text-slate-600 mt-1">← 로그인으로 돌아가기</button>
        </div>
      </div>
    </div>
  );

  const renderPending = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className={`${cardCls} p-8 text-center max-w-sm w-full`}>
        <div className="text-4xl mb-4">⏳</div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">승인 대기 중</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">관리자의 가입 승인을 기다리고 있습니다.<br/>승인 완료 후 쇼핑몰 이용이 가능합니다.</p>
        <button onClick={logout} className={btnOutline}>로그아웃</button>
      </div>
    </div>
  );

  const renderShop = () => (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <input className={`${inputCls} max-w-xs`} placeholder="상품 검색..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <div className={`${cardCls} p-10 text-center`}><p className="text-sm text-slate-400">검색 결과가 없습니다.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <button key={p.id} onClick={() => { setSelProduct(p); setQty(1); setPage("detail"); }} className={`${cardCls} p-5 text-left hover:shadow-md transition-shadow group`}>
              <div className="w-full h-32 bg-slate-50 rounded-lg flex items-center justify-center text-5xl mb-4 group-hover:bg-slate-100 transition-colors">💉</div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1">{p.name}</h3>
              <p className="text-base font-bold text-slate-900">{fmt(p.price)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderDetail = () => selProduct ? (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => nav("shop")} className="text-sm text-slate-400 hover:text-slate-600 mb-4 inline-block">← 목록으로</button>
      <div className={`${cardCls} overflow-hidden`}>
        <div className="w-full h-48 bg-slate-50 flex items-center justify-center text-6xl">💉</div>
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-1">{selProduct.name}</h2>
          <p className="text-sm text-slate-500 mb-4">{selProduct.desc}</p>
          <p className="text-2xl font-bold text-slate-900 mb-6">{fmt(selProduct.price)}</p>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-slate-500">수량</span>
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-50">−</button>
              <span className="w-10 text-center text-sm font-semibold">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-50">+</button>
            </div>
            <span className="text-sm text-slate-400 ml-auto">소계 {fmt(selProduct.price * qty)}</span>
          </div>
          <button onClick={() => { addToCart(selProduct, qty); nav("shop"); }} className={`${btnPrimary} w-full`}>장바구니 담기</button>
        </div>
      </div>
    </div>
  ) : null;

  const renderCart = () => (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-lg font-bold text-slate-900 mb-4">장바구니</h2>
      {cart.length === 0 ? (
        <div className={`${cardCls} p-10 text-center`}>
          <p className="text-sm text-slate-400 mb-3">장바구니가 비어 있습니다.</p>
          <button onClick={() => nav("shop")} className={btnOutline}>쇼핑하기</button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {cart.map(c => (
              <div key={c.id} className={`${cardCls} p-4 flex items-center gap-4`}>
                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-2xl shrink-0">💉</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                  <p className="text-sm text-slate-500">{fmt(c.price)}</p>
                </div>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                  <button onClick={() => updateCartQty(c.id, c.qty - 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-50 text-sm">−</button>
                  <span className="w-8 text-center text-sm font-semibold">{c.qty}</span>
                  <button onClick={() => updateCartQty(c.id, c.qty + 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-50 text-sm">+</button>
                </div>
                <p className="text-sm font-bold text-slate-900 w-20 text-right">{fmt(c.price * c.qty)}</p>
                <button onClick={() => removeCart(c.id)} className="text-slate-300 hover:text-red-400 text-lg">×</button>
              </div>
            ))}
          </div>
          <div className={`${cardCls} p-5`}>
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm text-slate-500">합계</span>
              <span className="text-xl font-bold text-slate-900">{fmt(cartTotal)}</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">배송 정보</h3>
            <div className="space-y-2 mb-4">
              <input className={inputCls} placeholder="수령인 *" value={orderForm.name} onChange={e => setOrderForm(p => ({...p, name: e.target.value}))} />
              <input className={inputCls} placeholder="연락처 *" value={orderForm.phone} onChange={e => setOrderForm(p => ({...p, phone: e.target.value}))} />
              <input className={inputCls} placeholder="배송주소 *" value={orderForm.addr} onChange={e => setOrderForm(p => ({...p, addr: e.target.value}))} />
              <input className={inputCls} placeholder="배송 메모 (선택)" value={orderForm.memo} onChange={e => setOrderForm(p => ({...p, memo: e.target.value}))} />
            </div>
            <div className="bg-slate-50 rounded-lg p-4 mb-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900 mb-1">계좌이체 안내</p>
              <p>{bankInfo.bank} {bankInfo.account} {bankInfo.holder}</p>
              <p className="text-xs text-slate-400 mt-1">입금 확인 후 배송이 시작됩니다.</p>
            </div>
            <button onClick={placeOrder} className={`${btnPrimary} w-full`}>주문하기</button>
          </div>
        </>
      )}
    </div>
  );

  const renderOrderDone = () => (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className={`${cardCls} p-8`}>
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">주문이 완료되었습니다</h2>
        <p className="text-sm text-slate-500 mb-1">아래 계좌로 입금해 주세요.</p>
        <p className="text-sm font-semibold text-slate-900 mb-4">{bankInfo.bank} {bankInfo.account} {bankInfo.holder}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => nav("myorders")} className={btnPrimary}>주문내역 확인</button>
          <button onClick={() => nav("shop")} className={btnOutline}>계속 쇼핑</button>
        </div>
      </div>
    </div>
  );

  const renderMyOrders = () => (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h2 className="text-lg font-bold text-slate-900 mb-4">주문내역</h2>
      {myOrders.length === 0 ? (
        <div className={`${cardCls} p-10 text-center`}><p className="text-sm text-slate-400">주문 내역이 없습니다.</p></div>
      ) : (
        <div className="space-y-3">
          {[...myOrders].reverse().map(o => (
            <div key={o.id} className={`${cardCls} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-400">{o.date}</span>
                <OBadge s={o.status} />
              </div>
              {o.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-slate-700">{it.name} × {it.qty}</span>
                  <span className="text-slate-900 font-medium">{fmt(it.price * it.qty)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 mt-2 border-t border-slate-100 text-sm">
                <span className="text-slate-500">합계</span>
                <span className="font-bold text-slate-900">{fmt(o.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ───── ADMIN ───── */
  const renderAdmin = () => (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-lg font-bold text-slate-900 mb-4">관리자 패널</h2>
      <div className="flex gap-1 mb-5 border-b border-slate-100 pb-3 overflow-x-auto">
        {[
          ["members", `회원 관리${pendingMembers.length > 0 ? ` (${pendingMembers.length})` : ""}`],
          ["products", `상품 관리 (${products.length})`],
          ["orders", `주문 관리 (${orders.length})`],
          ["settings", "설정"],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setAdminTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${adminTab === k ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{l}</button>
        ))}
      </div>
      {adminTab === "members" && renderAdminMembers()}
      {adminTab === "products" && renderAdminProducts()}
      {adminTab === "orders" && renderAdminOrders()}
      {adminTab === "settings" && renderAdminSettings()}
    </div>
  );

  const renderAdminMembers = () => (
    members.length === 0 ? (
      <div className={`${cardCls} p-10 text-center`}><p className="text-sm text-slate-400">등록된 회원이 없습니다.</p></div>
    ) : (
      <div className="space-y-2">
        {members.map(m => (
          <div key={m.id} className={`${cardCls} p-4 flex flex-wrap items-center gap-3`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-slate-900">{m.name}</span>
                <ApprovalBadge s={m.approved ? "approved" : "pending"} />
              </div>
              <p className="text-xs text-slate-400">{m.email}{m.company ? ` · ${m.company}` : ""}{m.phone ? ` · ${m.phone}` : ""}</p>
            </div>
            <div className="flex gap-2">
              {!m.approved && <button onClick={() => approveUser(m.id)} className="text-xs px-3 py-1.5 rounded-md bg-green-500 text-white font-medium hover:bg-green-600">승인</button>}
              {m.approved && <button onClick={() => rejectUser(m.id)} className="text-xs px-3 py-1.5 rounded-md bg-red-50 text-red-500 font-medium hover:bg-red-100 border border-red-200">승인 취소</button>}
            </div>
          </div>
        ))}
      </div>
    )
  );

  const renderAdminProducts = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">총 {products.length}개 상품</p>
        <button onClick={openAddProduct} className={btnPrimary}>+ 상품 추가</button>
      </div>

      {showProductForm && (
        <div className={`${cardCls} p-5 mb-4 border-2 border-slate-200`}>
          <h3 className="text-sm font-bold text-slate-900 mb-3">{editingProduct ? "상품 수정" : "새 상품 추가"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">상품명 *</label>
              <input className={inputCls} placeholder="상품명" value={productForm.name} onChange={e => setProductForm(p => ({...p, name: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">가격 (원) *</label>
              <input className={inputCls} type="number" placeholder="0" value={productForm.price} onChange={e => setProductForm(p => ({...p, price: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">설명</label>
              <input className={inputCls} placeholder="상품 설명" value={productForm.desc} onChange={e => setProductForm(p => ({...p, desc: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">재고 수량</label>
              <input className={inputCls} type="number" placeholder="0" value={productForm.stock} onChange={e => setProductForm(p => ({...p, stock: e.target.value}))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveProduct} className={btnPrimary}>{editingProduct ? "수정 완료" : "추가하기"}</button>
            <button onClick={cancelProductForm} className={btnOutline}>취소</button>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className={`${cardCls} p-10 text-center`}><p className="text-sm text-slate-400">등록된 상품이 없습니다.</p></div>
      ) : (
        <div className="space-y-2">
          {products.map(p => (
            <div key={p.id} className={`${cardCls} p-4 flex flex-wrap items-center gap-3`}>
              <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-xl shrink-0">💉</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-400">{p.desc || "설명 없음"} · 재고 {p.stock}개</p>
              </div>
              <p className="text-sm font-bold text-slate-900 w-24 text-right">{fmt(p.price)}</p>
              <div className="flex gap-2">
                <button onClick={() => openEditProduct(p)} className="text-xs px-3 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium hover:bg-slate-200">수정</button>
                <button onClick={() => deleteProduct(p.id)} className={btnDanger}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAdminOrders = () => (
    orders.length === 0 ? (
      <div className={`${cardCls} p-10 text-center`}><p className="text-sm text-slate-400">주문이 없습니다.</p></div>
    ) : (
      <div className="space-y-3">
        {[...orders].reverse().map(o => (
          <div key={o.id} className={`${cardCls} p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-sm font-semibold text-slate-900 mr-2">{o.userName}</span>
                <span className="text-xs text-slate-400">{o.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <OBadge s={o.status} />
                {o.status !== "배송완료" && (
                  <button onClick={() => advanceOrder(o.id)} className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-medium hover:bg-slate-200">다음 단계 →</button>
                )}
              </div>
            </div>
            {o.items.map((it, i) => (
              <div key={i} className="flex justify-between text-sm py-0.5">
                <span className="text-slate-600">{it.name} × {it.qty}</span>
                <span className="text-slate-900 font-medium">{fmt(it.price * it.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 mt-2 border-t border-slate-50 text-sm">
              <span className="text-slate-400">합계</span>
              <span className="font-bold text-slate-900">{fmt(o.total)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">배송: {o.addr.name} · {o.addr.phone} · {o.addr.addr}</p>
          </div>
        ))}
      </div>
    )
  );

  /* ───── ADMIN SETTINGS ───── */
  const renderAdminSettings = () => (
    <div>
      <h3 className="text-sm font-bold text-slate-900 mb-3">입금 계좌 설정</h3>
      <div className={`${cardCls} p-5`}>
        {editingBank ? (
          <>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">은행명</label>
                <input className={inputCls} value={bankForm.bank} onChange={e => setBankForm(p => ({...p, bank: e.target.value}))} placeholder="국민은행" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">계좌번호</label>
                <input className={inputCls} value={bankForm.account} onChange={e => setBankForm(p => ({...p, account: e.target.value}))} placeholder="000-0000-0000" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">예금주</label>
                <input className={inputCls} value={bankForm.holder} onChange={e => setBankForm(p => ({...p, holder: e.target.value}))} placeholder="(주)EBRMALL" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveBank} className={btnPrimary}>저장</button>
              <button onClick={() => { setEditingBank(false); setBankForm({...bankInfo}); }} className={btnOutline}>취소</button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-900 font-semibold">{bankInfo.bank} {bankInfo.account}</p>
              <p className="text-xs text-slate-400 mt-0.5">예금주: {bankInfo.holder}</p>
            </div>
            <button onClick={() => { setBankForm({...bankInfo}); setEditingBank(true); }} className="text-xs px-3 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium hover:bg-slate-200">변경</button>
          </div>
        )}
      </div>
    </div>
  );

  /* ───── FINAL RENDER ───── */
  if (!user) return (<><Toast t={toast} />{page === "register" ? renderRegister() : renderLogin()}</>);
  if (!isAdmin && !isApproved) return (<><Toast t={toast} />{renderPending()}</>);

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast t={toast} />
      {renderHeader()}
      {page === "shop" && renderShop()}
      {page === "detail" && renderDetail()}
      {page === "cart" && renderCart()}
      {page === "orderDone" && renderOrderDone()}
      {page === "myorders" && renderMyOrders()}
      {page === "admin" && renderAdmin()}
    </div>
  );
}