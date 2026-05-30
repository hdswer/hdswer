import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, addDoc, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import { MenuItem, CartItem, Order } from './types.ts';
import { initialMenuItems } from './seedData.ts';

// Lucide Icons
import { 
  ShoppingBag, Trash2, ClipboardList, ClipboardCheck, Settings, 
  X, Check, Sparkles, HeartHandshake, PhoneCall, Scroll, RefreshCw, AlertCircle
} from 'lucide-react';

// Subcomponents
import OrderForm from './components/OrderForm.tsx';
import OrderLookup from './components/OrderLookup.tsx';
import AdminPanel from './components/AdminPanel.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<'order' | 'lookup' | 'admin'>('order');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout info state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Successful invoice modal
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Load and seed menu
  const fetchAndSeedMenu = async () => {
    setLoadingMenu(true);
    try {
      const menuCol = collection(db, 'menu');
      const querySnapshot = await getDocs(menuCol);
      
      let items: MenuItem[] = [];
      if (querySnapshot.empty) {
        console.log("No menu items found. Seeding initial Taiwanese tea catalog...");
        // Seed menu
        for (const item of initialMenuItems) {
          const newDocRef = doc(menuCol);
          await setDoc(newDocRef, item);
        }
        // Fetch again after seed
        const newSnapshot = await getDocs(menuCol);
        newSnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as MenuItem);
        });
      } else {
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as MenuItem);
        });
      }
      setMenuItems(items);
    } catch (err) {
      console.error("Failed to load or seed menu:", err);
      // Wait, let's gracefully load offline if Firestore isn't fully ready
      setMenuItems(initialMenuItems);
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    fetchAndSeedMenu();
  }, []);

  // Sync menu state when admin updates items in backstage
  const handleRefreshMenu = () => {
    fetchAndSeedMenu();
  };

  // Add Item to active cart
  const handleAddToCart = (newItem: Omit<CartItem, 'id' | 'quantity'> & { quantity: number }) => {
    const customKey = `${newItem.menuId}-${newItem.customization.size}-${newItem.customization.sweetness}-${newItem.customization.ice}-${newItem.customization.toppings.sort().join(',')}`;

    setCart(prevCart => {
      const existingIdx = prevCart.findIndex(item => item.id === customKey);
      if (existingIdx > -1) {
        const updated = [...prevCart];
        updated[existingIdx].quantity += newItem.quantity;
        return updated;
      } else {
        return [...prevCart, { ...newItem, id: customKey } as CartItem];
      }
    });

    // Elegant feedback flash in screen
    setIsCartOpen(true);
  };

  // Tally overall cup count in header cart button
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotalPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Cart operations
  const updateQuantity = (id: string, amount: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const nextQty = item.quantity + amount;
        return nextQty > 0 ? { ...item, quantity: nextQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeCartItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Complete customer checkout process
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');

    if (cart.length === 0) {
      setCheckoutError('您的點單車是空的！請點選加購飲品。');
      return;
    }

    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();

    if (!trimmedName) {
      setCheckoutError('請輸入訂購人稱呼。');
      return;
    }

    // Traditional Taiwanese mobile phone pattern helper: starting with 09 and 10 digits
    const phoneRegex = /^09\d{8}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      setCheckoutError('請輸入正確的手機號碼 (例如: 0912345678)，以便後續進度查詢。');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Fetch current orders count to generate dynamic sequential ID e.g., #1001
      const ordersCol = collection(db, 'orders');
      const snapshot = await getDocs(ordersCol);
      const nextNum = 1001 + snapshot.size;

      // 2. Formulate payload
      const payload: Order = {
        orderNum: nextNum.toString(),
        customerName: trimmedName,
        customerPhone: trimmedPhone,
        items: [...cart],
        totalPrice: cartTotalPrice,
        status: 'pending',
        notes: notes.trim(),
        createdAt: new Date().toISOString()
      };

      // 3. Save into Firestore database
      await addDoc(ordersCol, payload);

      // Reset Form State
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      setIsCartOpen(false);

      // Display Success Completed Ticket Modal
      setCompletedOrder(payload);
    } catch (err) {
      console.error(err);
      setCheckoutError('送出失敗，請確認網路連線是否正常。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between selection:bg-emerald-850 selection:text-white">
      
      {/* 1. BRAND HERO & HEADER HEADER */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Shop logo mockup */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-800 text-white rounded-2xl flex items-center justify-center font-black shadow-md shadow-emerald-800/10 tracking-tight text-lg">
              八曜
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-rose-950 tracking-tight">八曜和茶</h1>
                <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-200">
                  8yotea 日本穀物茶
                </span>
              </div>
              <p className="text-[10px] text-stone-400 mt-0.5 font-medium tracking-wide">
                和風茶專賣店．獨創穀麥無咖啡因黃金比例茶飲
              </p>
            </div>
          </div>

          {/* Navigation Control & Cart Hub */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
            <div className="flex bg-stone-100 p-1.5 rounded-2xl border border-stone-150 text-stone-600 gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('order')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'order' 
                    ? 'bg-emerald-850 text-white shadow-sm' 
                    : 'hover:bg-amber-50 hover:text-emerald-850'
                }`}
                id="tab-order"
              >
                <ClipboardCheck size={14} /> 線上點單
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lookup')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'lookup' 
                    ? 'bg-emerald-850 text-white shadow-sm' 
                    : 'hover:bg-amber-50 hover:text-emerald-850'
                }`}
                id="tab-lookup"
              >
                <ClipboardList size={14} /> 點單進度
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'admin' 
                    ? 'bg-emerald-850 text-white shadow-sm' 
                    : 'hover:bg-amber-50 hover:text-emerald-850'
                }`}
                id="tab-admin"
              >
                <Settings size={14} /> 管理後台
              </button>
            </div>

            {/* Shopping cart floating action */}
            {activeTab === 'order' && (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                id="open-cart-btn"
                className="relative px-4 py-3 bg-emerald-800 text-white rounded-2xl font-bold text-xs tracking-wider flex items-center gap-2 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-800/10 cursor-pointer"
              >
                <ShoppingBag size={14} /> 點單車
                <span className="font-mono bg-white text-emerald-850 font-black px-1.5 py-0.2 rounded-md">
                  {cartItemCount}
                </span>
                {cartTotalPrice > 0 && (
                  <span className="border-l border-white/20 pl-2 font-mono text-[11px]">
                    NT${cartTotalPrice}
                  </span>
                )}
              </button>
            )}
          </div>

        </div>
      </header>

      {/* 2. CORE VIEW SWITCH SCREEN */}
      <main className="flex-1 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'order' && (
              <>
                {/* Visual notice line banner with brand identity */}
                <div className="max-w-4xl mx-auto mb-8 bg-amber-50/70 py-3.5 px-6 rounded-2xl border border-amber-200/50 flex items-center justify-between gap-3 text-stone-700 text-xs shadow-3xs mx-4 md:mx-auto">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-750 inline-block" />
                    <span><strong>加料通知：</strong> 本旬推薦蜜漬白玉丸與寒天天草。點單完畢後，可用手機號碼隨時展開進度追蹤！</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-100/50 px-2.5 py-0.5 rounded-md">
                    純原點單
                  </span>
                </div>

                {loadingMenu ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <RefreshCw className="animate-spin text-emerald-850 mb-3" size={32} />
                    <p className="text-stone-400 text-xs animate-pulse">正在調製八曜和茶獨特穀麥茶飲品項中...</p>
                  </div>
                ) : (
                  <OrderForm 
                    menuItems={menuItems} 
                    onAddToCart={handleAddToCart}
                  />
                )}
              </>
            )}

            {activeTab === 'lookup' && <OrderLookup />}

            {activeTab === 'admin' && (
              <AdminPanel onRefreshMenu={handleRefreshMenu} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. CART SYSTEM DRAWER/OVERLAY OVERLAY */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/60 backdrop-blur-xs flex justify-end">
            {/* Click backdrop to exit modal */}
            <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-stone-100 z-10"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/85">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-emerald-800" />
                  <h3 className="text-lg font-black text-rose-950 tracking-tight">我的點單車</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  id="close-cart-drawer"
                  className="w-8 h-8 rounded-full hover:bg-stone-200 flex items-center justify-center transition-all text-stone-500"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Scroll Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {cart.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">所選茶品商品 ({cart.length})</div>
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        id={`cart-item-${item.id}`}
                        className="bg-stone-50/70 border border-stone-150 p-4 rounded-2xl relative flex flex-col justify-between"
                      >
                        <div>
                          {/* Drink Title & category */}
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-stone-850 text-sm tracking-tight">{item.name}</span>
                            <span className="font-mono text-stone-900 font-bold text-xs">
                              NT${item.price * item.quantity}
                            </span>
                          </div>

                          <div className="text-[10px] text-stone-500 space-x-1 flex flex-wrap leading-relaxed">
                            <span>杯型:{item.customization.size}</span>
                            <span>/ {item.customization.sweetness}</span>
                            <span>/ {item.customization.ice}</span>
                            {item.customization.toppings.length > 0 && (
                              <span className="text-amber-700 font-semibold block sm:inline mt-0.5 sm:mt-0">
                                / 加料:{item.customization.toppings.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amount controller & Trash bin */}
                        <div className="flex items-center justify-between border-t border-stone-200/50 pt-2.5 mt-3">
                          <button
                            type="button"
                            onClick={() => removeCartItem(item.id)}
                            className="text-stone-400 hover:text-rose-600 transition-colors flex items-center gap-1 text-[10px] font-bold"
                          >
                            <Trash2 size={12} /> 移除
                          </button>

                          <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-7 h-6 hover:bg-stone-100 flex items-center justify-center font-bold text-stone-600 text-xs active:scale-90"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-mono font-semibold text-stone-800 text-xs">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-7 h-6 hover:bg-stone-100 flex items-center justify-center font-bold text-stone-600 text-xs active:scale-90"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-stone-400">
                    <ShoppingBag className="mx-auto text-stone-200 mb-3" size={48} />
                    <p className="text-sm font-semibold">您的點單車空空如也</p>
                    <p className="text-xs text-stone-400 mt-1">快挑選幾杯八曜和茶美味點心消消暑！</p>
                  </div>
                )}

                {/* Checkout Submission Form */}
                {cart.length > 0 && (
                  <div className="pt-6 border-t border-stone-150 space-y-4">
                    <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">顧客訂購與聯絡資料 (Checkout Details)</div>
                    
                    {checkoutError && (
                      <div className="p-3.5 bg-red-50 text-red-650 rounded-xl border border-red-100 text-xs font-semibold flex items-start gap-1.5">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{checkoutError}</span>
                      </div>
                    )}

                    <form id="checkout-form" onSubmit={handleCheckout} className="space-y-3.5">
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">訂購人姓名/稱呼 *</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="如何稱呼您 (e.g. 王先生)"
                          id="customer-name"
                          className="w-full px-3.5 py-2 border border-stone-250 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-850"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-0.5">聯絡電話 (查詢進度用) *</label>
                        <p className="text-[9px] text-stone-400 mb-1">請填寫 09 開頭 10 碼行動號碼</p>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="e.g. 0912345678"
                          id="customer-phone"
                          className="w-full px-3.5 py-2 border border-stone-250 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-850 font-mono font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">備註需求 (例如：糖分、料放少一點)</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="如有特殊需求或客製，請備註在此..."
                          rows={2}
                          id="order-notes"
                          className="w-full px-3.5 py-2 border border-stone-250 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-850 resize-y"
                        />
                      </div>

                      {/* Sticky submit element */}
                      <div className="pt-3 border-t border-stone-100 mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs text-stone-400 font-bold uppercase">結帳總計 (Subtotal)</span>
                          <span className="font-mono text-2xl font-black text-emerald-850">NT${cartTotalPrice}</span>
                        </div>
                        
                        <button
                          type="submit"
                          id="submit-order-button"
                          disabled={submitting}
                          className="w-full py-4 bg-emerald-850 text-white font-extrabold text-xs tracking-widest text-center rounded-2xl hover:bg-emerald-700 active:scale-98 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-md shadow-emerald-800/10 cursor-pointer"
                        >
                          {submitting ? (
                            <>
                              <RefreshCw className="animate-spin" size={14} />
                              茶單遞送至雲端製作櫃檯...
                            </>
                          ) : (
                            <>
                              <ClipboardCheck size={14} /> 送出八曜茶單 / 線上點單
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. SUCCESS COMPLETED RECEIPT RECEIPT TICKET (POPUP) */}
      <AnimatePresence>
        {completedOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-stone-100 flex flex-col relative text-center"
            >
              {/* Confetti celebration top layout */}
              <div className="bg-emerald-800 p-8 text-white flex flex-col items-center">
                <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="text-amber-300" size={28} />
                </div>
                <h3 className="text-xl font-bold tracking-tight">茶單遞送成功！</h3>
                <p className="text-[10px] text-white/75 uppercase tracking-widest font-bold mt-1">
                  Order Successfully Posted
                </p>
              </div>

              {/* Ticket Details */}
              <div className="p-6 md:p-8 space-y-5">
                {/* Visual Order Number Badge */}
                <div className="bg-stone-50 border border-stone-150 p-4 rounded-2xl relative">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">
                    您的調茶專屬流水號 (Sequence ID)
                  </div>
                  <div className="text-4xl font-mono font-black text-emerald-800 tracking-tight">
                    #{completedOrder.orderNum}
                  </div>
                </div>

                <div className="space-y-4 text-xs text-stone-600 text-left">
                  {/* Customer Information detail checklist */}
                  <div className="border-b border-dashed border-stone-200 pb-3 block">
                    <span className="font-bold text-stone-700 block mb-1">顧客聯絡資訊 :</span>
                    <p className="leading-tight">
                      姓名：<span className="font-bold text-stone-850">{completedOrder.customerName}</span> <br />
                      手機：<span className="font-mono text-stone-850 font-semibold">{completedOrder.customerPhone}</span>
                    </p>
                  </div>

                  {/* Estimated Waiting info instructions */}
                  <div className="flex items-start gap-2.5 bg-amber-50/50 p-3 rounded-xl border border-amber-200/50">
                    <HeartHandshake className="text-amber-600 shrink-0 mt-0.5 font-medium" size={16} />
                    <p className="text-[10px] text-stone-500 leading-normal">
                      店內大師正在為您精心備料、搖製。您現在可以使用 <span className="font-bold text-stone-800">「點單進度」</span> 功能並點擊手機號碼展開歷史紀錄，隨時追蹤您的茶飲狀態。
                    </p>
                  </div>
                </div>

                {/* Big Close action confirmation */}
                <button
                  type="button"
                  onClick={() => {
                    setCompletedOrder(null);
                    setActiveTab('lookup');
                  }}
                  id="success-receipt-close"
                  className="w-full py-3.5 bg-emerald-800 text-white font-bold rounded-2xl text-xs tracking-wider transition-all hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-800/10 cursor-pointer"
                >
                  前往追蹤進度 (Track My Drinks)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. BRAND FOOTER CREDITS */}
      <footer className="bg-emerald-950 text-white/50 text-[10px] py-12 text-center border-t border-emerald-900 mx-auto w-full px-4 shrink-0 mt-20">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center justify-center gap-2 text-white">
            <span className="font-black text-sm tracking-tight text-white select-none">八曜和茶</span>
            <span className="text-stone-550 border border-stone-550/40 px-1.5 py-0.2 rounded text-[8px] font-bold">
              AUTHORIZED OUTLET
            </span>
          </div>
          <p className="leading-relaxed">
            本系統為展示之「八曜和茶智慧飲品點單系統」雲端專案，提供完整的客人端線上自訂飲品（甜度極客、冰塊調整、珍珠加料、明細備註）與手機號碼獨立查詢，以及後台店長專屬的加密登錄、即時訂單流與動態菜单編輯調度，數據均透過 Firebase 安全儲存。
          </p>
          <div className="text-[9px] text-stone-500 pt-3">
            © 8yotea Smart Ordering Portal. All rights reserved. Powered by cloud Firestore.
          </div>
        </div>
      </footer>

    </div>
  );
}
