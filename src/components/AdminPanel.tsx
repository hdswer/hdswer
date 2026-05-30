import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { MenuItem, Order, AdminConfig } from '../types.ts';
import { 
  Lock, KeyRound, LayoutDashboard, Coffee, ClipboardList, CheckCircle2, 
  Settings, TrendingUp, AlertTriangle, ToggleLeft, ToggleRight, Edit2, Plus, 
  Trash2, X, RefreshCw, BarChart, DollarSign, Archive, Eye, EyeOff
} from 'lucide-react';
import { initialMenuItems } from '../seedData.ts';

interface AdminPanelProps {
  onRefreshMenu: () => void;
}

export default function AdminPanel({ onRefreshMenu }: AdminPanelProps) {
  // Config Setup state
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [setupPassword, setSetupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Inside Backstage State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'menu'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Menu item modification modal/drawer state
  const [editingDrink, setEditingDrink] = useState<Partial<MenuItem> | null>(null);
  const [drinkModalOpen, setDrinkModalOpen] = useState(false);

  // Load Admin Config first
  useEffect(() => {
    async function loadAdminConfig() {
      try {
        const configRef = doc(db, 'configs', 'admin');
        const docSnap = await getDoc(configRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data() as AdminConfig);
        } else {
          setConfig({ isSetup: false });
        }
      } catch (err) {
        console.error("Admin config fetch err:", err);
        // Fallback for permissions read if config doc is setup
        setConfig({ isSetup: false });
      } finally {
        setLoadingConfig(false);
      }
    }
    loadAdminConfig();
  }, []);

  // Set up listener for live orders and load drinks catalog when logged in
  useEffect(() => {
    if (!isLoggedIn) return;

    setLoadingData(true);
    const ordersCol = collection(db, 'orders');
    const qOrders = query(ordersCol);

    // Live Order Updates sync
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const liveOrders: Order[] = [];
      snapshot.forEach((doc) => {
        liveOrders.push({ id: doc.id, ...doc.data() } as Order);
      });
      // Sort client side by createdAt DESC
      liveOrders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(liveOrders);
      setLoadingData(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    // Menu list sync
    const menuCol = collection(db, 'menu');
    const unsubscribeMenu = onSnapshot(menuCol, (snapshot) => {
      const items: MenuItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as MenuItem);
      });
      setMenuList(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'menu');
    });

    return () => {
      unsubscribeOrders();
      unsubscribeMenu();
    };
  }, [isLoggedIn]);

  // Handler: First Time Setup password
  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (setupPassword.trim().length < 4) {
      setErrorMsg('密碼請設定至少 4 位數以上。');
      return;
    }
    if (setupPassword !== confirmPassword) {
      setErrorMsg('兩次輸入的密碼不一致。');
      return;
    }

    try {
      const configRef = doc(db, 'configs', 'admin');
      const payload: AdminConfig = {
        password: setupPassword.trim(),
        isSetup: true
      };
      await setDoc(configRef, payload);
      setConfig(payload);
      setIsLoggedIn(true);

      // Also auto seed menu items if menu collection is empty
      const menuCol = collection(db, 'menu');
      const menuSnap = await getDocs(menuCol);
      if (menuSnap.empty) {
        for (const item of initialMenuItems) {
          const itemDocRef = doc(menuCol);
          await setDoc(itemDocRef, item);
        }
      }
      onRefreshMenu();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'configs/admin');
    }
  };

  // Handler: Admin Login Challenge
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!config || !config.password) return;

    if (loginPassword.trim() === config.password) {
      setIsLoggedIn(true);
    } else {
      setErrorMsg('密碼錯誤，請重新輸入。');
    }
  };

  // Handler: Update Order Status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  // Handlers: Add or Edit Menu Item
  const handleOpenAddDrink = () => {
    setEditingDrink({
      name: '',
      category: '和風茶',
      priceM: 40,
      priceL: 50,
      available: true,
      description: ''
    });
    setDrinkModalOpen(true);
  };

  const handleOpenEditDrink = (drink: MenuItem) => {
    setEditingDrink(drink);
    setDrinkModalOpen(true);
  };

  const handleSaveDrink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDrink || !editingDrink.name) return;

    try {
      const menuCol = collection(db, 'menu');
      if (editingDrink.id) {
        // Update
        const drinkRef = doc(menuCol, editingDrink.id);
        const { id, ...payload } = editingDrink;
        await setDoc(drinkRef, payload);
      } else {
        // Create
        const drinkRef = doc(menuCol);
        await setDoc(drinkRef, editingDrink);
      }
      setDrinkModalOpen(false);
      setEditingDrink(null);
      onRefreshMenu();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'menu');
    }
  };

  // Toggle Drink Availability In Stock / Out of Stock
  const handleToggleDrinkStock = async (drink: MenuItem) => {
    try {
      const drinkRef = doc(db, 'menu', drink.id || '');
      await updateDoc(drinkRef, { available: !drink.available });
      onRefreshMenu();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `menu/${drink.id}`);
    }
  };

  // Remove drink item
  const handleDeleteDrink = async (drinkId: string) => {
    if (!window.confirm('確定要從菜單中永久刪除此飲品？')) return;
    try {
      // Create is fine, wait delete needs manual rules permission
      const drinkRef = doc(db, 'menu', drinkId);
      await setDoc(drinkRef, { available: false }); // soft delete is safer, or delete
      // we can do direct delete
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(drinkRef);
      onRefreshMenu();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `menu/${drinkId}`);
    }
  };

  // Calculate Metrics / Dashboard numbers safely
  const calculateMetrics = () => {
    const totalOrders = orders.filter(o => o.status === 'completed').length;
    const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing').length;
    const revenue = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, current) => sum + current.totalPrice, 0);

    // Calculate dynamic popular drinks
    const itemCountMap: { [key: string]: number } = {};
    orders.filter(o => o.status === 'completed').forEach(order => {
      order.items.forEach(item => {
        itemCountMap[item.name] = (itemCountMap[item.name] || 0) + item.quantity;
      });
    });

    const popularList = Object.entries(itemCountMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a,b) => b.qty - a.qty)
      .slice(0, 3);

    return { totalOrders, activeOrders, revenue, popularList };
  };

  const metrics = calculateMetrics();

  // If configuration is checking...
  if (loadingConfig) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[500px]">
        <RefreshCw className="animate-spin text-emerald-800 mb-3" size={32} />
        <p className="text-sm text-stone-500">正在探測安全設定，請稍候...</p>
      </div>
    );
  }

  // --- 1. FIRST TIME ACCESS PASSWORD SETUP WINDOW ---
  if (config && !config.isSetup) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-stone-100 shadow-xl text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <KeyRound className="text-emerald-800" size={30} />
        </div>
        <h2 className="text-2xl font-bold text-stone-850 mb-2">歡迎使用茶飲後台</h2>
        <p className="text-stone-500 text-xs leading-relaxed mb-6">
          這是您第一次啟用系統。請設定一組管理員專屬密碼，作為日後進入後台、調控選單與訂單的核可憑證。
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-650 rounded-xl border border-red-100 text-xs font-semibold text-left flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSetupPassword} className="space-y-4">
          <div className="text-left">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">設定管理者密碼 (4位數以上)</label>
            <div className="relative">
              <input
                type={isPasswordVisible ? "text" : "password"}
                required
                placeholder="輸入您的密碼"
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                id="setup-pass"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-1 focus:ring-emerald-850 focus:border-emerald-850 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="text-left">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">確認輸入密碼</label>
            <input
              type={isPasswordVisible ? "text" : "password"}
              required
              placeholder="再次輸入您的密碼"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              id="setup-pass-confirm"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-1 focus:ring-emerald-850 focus:border-emerald-850 transition-all font-mono"
            />
          </div>

          <button
            type="submit"
            id="setup-submit-btn"
            className="w-full py-3.5 bg-emerald-800 text-white font-bold rounded-2xl text-sm tracking-wide transition-all hover:bg-emerald-700 active:scale-95 shadow-sm shadow-emerald-800/10 mt-2"
          >
            完成設定並登入
          </button>
        </form>
      </div>
    );
  }

  // --- 2. SUBSEQUENT ACCESS: PASSWORD CHALLENGE GATE ---
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-stone-100 shadow-xl text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="text-emerald-800" size={28} />
        </div>
        <h2 className="text-xl font-bold text-stone-850 mb-1">管理者後台驗證</h2>
        <p className="text-stone-400 text-xs mb-6">
          進入後台管理需要管理密碼核准。
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-650 rounded-xl border border-rose-150 text-xs font-semibold text-left">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="text-left">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">店長驗證密碼</label>
            <div className="relative">
              <input
                type={isPasswordVisible ? "text" : "password"}
                required
                autoFocus
                placeholder="請輸入密碼"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                id="login-pass"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-1 focus:ring-emerald-850 focus:border-emerald-850 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            className="w-full py-3.5 bg-emerald-800 text-white font-bold rounded-2xl text-sm tracking-wide transition-all hover:bg-emerald-700 active:scale-95 shadow-sm shadow-emerald-800/10 mt-2"
          >
            驗證並解鎖後台
          </button>
        </form>
      </div>
    );
  }

  // --- 3. THE MAIN BACKSTAGE CONTROL INTERFACE ---
  return (
    <div className="max-w-6xl mx-auto px-4 py-4 min-h-[600px]">
      
      {/* Backstage Sub Navigation */}
      <div className="flex border-b border-stone-200 mb-8 bg-white p-2 rounded-2xl shadow-3xs max-w-lg mx-auto gap-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'dashboard'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'text-stone-500 hover:bg-stone-50'
          }`}
          id="admin-tab-dash"
        >
          <LayoutDashboard size={14} /> 銷售儀表板
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all relative ${
            activeTab === 'orders'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'text-stone-500 hover:bg-stone-50'
          }`}
          id="admin-tab-orders"
        >
          <ClipboardList size={14} /> 訂單調度
          {orders.filter(o => o.status === 'pending').length > 0 && (
            <span className="absolute -top-1 -right-0.5 bg-amber-500 border-2 border-white text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
              {orders.filter(o => o.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'menu'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'text-stone-500 hover:bg-stone-50'
          }`}
          id="admin-tab-menu"
        >
          <Coffee size={14} /> 飲品管理
        </button>
      </div>

      {loadingData ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-stone-100 rounded-3xl shadow-sm">
          <div className="w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-stone-400">正在讀取雲端茶飲記錄...</p>
        </div>
      ) : (
        <div>
          {/* TAB 1: DASHBOARD METRICS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-850 shrink-0">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">累積營業收入 (TWD)</span>
                    <span className="text-2xl font-black font-mono text-emerald-800">NT${metrics.revenue}</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">已完成點單 (Completed)</span>
                    <span className="text-2xl font-black font-mono text-stone-800">{metrics.totalOrders} 筆</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <RefreshCw className="animate-spin-slow" size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">待處理/製作中點單</span>
                    <span className="text-2xl font-black font-mono text-stone-800">{metrics.activeOrders} 筆</span>
                  </div>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Popular Drinks */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-2xs md:col-span-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-stone-850 mb-1 flex items-center gap-1.5 text-sm tracking-tight">
                      <TrendingUp className="text-emerald-800" size={16} /> 人氣熱銷茶品 Top 3
                    </h3>
                    <p className="text-[10px] text-stone-400 mb-4">統計已送出並完成製作的茶飲。每杯客製不計價格差異。</p>
                  </div>

                  <div className="space-y-4">
                    {metrics.popularList.length > 0 ? (
                      metrics.popularList.map((drink, index) => (
                        <div key={drink.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-xs font-black select-none ${
                              index === 0 ? 'bg-amber-100 text-amber-700' :
                              index === 1 ? 'bg-stone-150 text-stone-700' :
                              'bg-amber-50 text-amber-600'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="text-stone-700 font-medium text-xs">{drink.name}</span>
                          </div>
                          <span className="font-mono text-stone-500 font-semibold text-xs">
                            已售出 <span className="font-bold text-stone-800 font-mono">{drink.qty} 杯</span>
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-stone-400 text-xs">
                        尚無銷售數據。趕快把訂單狀態改為「已完成」！
                      </div>
                    )}
                  </div>
                  <div className="border-t border-stone-50 pt-3 mt-4 text-[10px] text-stone-400 text-center">
                    數據為 Firebase Cloud 系統即時統計。
                  </div>
                </div>

                {/* Recent Orders Stream */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-2xs md:col-span-8">
                  <h3 className="font-bold text-stone-850 text-sm tracking-tight mb-4 flex items-center gap-1.5">
                    <Archive className="text-stone-500" size={16} /> 近期點單流向 (Recent Activity Stream)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-stone-600">
                      <thead>
                        <tr className="bg-stone-50 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 text-center">
                          <th className="py-2.5 px-2 text-left">點單編號</th>
                          <th className="py-2.5 px-2">姓名</th>
                          <th className="py-2.5 px-2 text-right">總金額</th>
                          <th className="py-2.5 px-2">狀態</th>
                          <th className="py-2.5 px-2">時間</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map((order) => {
                          const badgeColor = 
                            order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                            order.status === 'preparing' ? 'bg-blue-50 text-blue-700' :
                            order.status === 'cancelled' ? 'bg-stone-100 text-stone-500 line-through' :
                            'bg-amber-50 text-amber-600';
                          return (
                            <tr key={order.id} className="border-b border-stone-50 text-center">
                              <td className="py-3 px-2 text-left font-mono font-bold text-emerald-800">#{order.orderNum}</td>
                              <td className="py-3 px-2 text-stone-700 font-medium">{order.customerName}</td>
                              <td className="py-3 px-2 text-right font-mono font-semibold text-stone-800">NT${order.totalPrice}</td>
                              <td className="py-3 px-2">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${badgeColor}`}>
                                  {order.status === 'completed' && '已完成'}
                                  {order.status === 'preparing' && '製作中'}
                                  {order.status === 'pending' && '等待中'}
                                  {order.status === 'cancelled' && '已取消'}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-[10px] text-stone-400">{new Date(order.createdAt).toLocaleTimeString('zh-TW')}</td>
                            </tr>
                          );
                        })}
                        {orders.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-6 text-stone-400">目前尚無任何點單紀錄。</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVE ORDERS PIPELINE */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-400 tracking-wider uppercase">待製作茶飲管道</span>
                <span className="text-xs text-stone-400">
                  共 {orders.length} 筆點單項目
                </span>
              </div>

              {orders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {orders.map((order) => {
                    const statusText = 
                      order.status === 'pending' ? '等待接單中' :
                      order.status === 'preparing' ? '飲料製作中' :
                      order.status === 'completed' ? '茶飲已完成' : '已取消';

                    const borderTheme = 
                      order.status === 'pending' ? 'border-amber-400/50 hover:border-amber-500' :
                      order.status === 'preparing' ? 'border-blue-400/50 hover:border-blue-500' :
                      'border-stone-150';

                    return (
                      <motion.div
                        layout
                        key={order.id}
                        id={`admin-order-${order.id}`}
                        className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between transition-all ${borderTheme}`}
                      >
                        <div>
                          {/* Order Header */}
                          <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3 shrink-0">
                            <div className="space-y-0.5">
                              <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                                #{order.orderNum}
                              </span>
                              <h4 className="font-bold text-sm text-stone-850 mt-1">
                                {order.customerName}
                              </h4>
                            </div>
                            <span className="text-[10px] text-stone-400 font-mono text-right capitalize">
                              {new Date(order.createdAt).toLocaleTimeString('zh-TW')}
                            </span>
                          </div>

                          {/* Customer Contacts */}
                          <div className="text-xs text-stone-500 mb-3 flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-stone-600 block">手機:</span>
                              <span className="font-mono text-stone-800 font-medium">{order.customerPhone}</span>
                            </div>
                            {order.notes && (
                              <div className="bg-stone-50 p-2 rounded-lg border border-stone-100 scale-95 origin-left text-[10px]">
                                <span className="font-bold text-stone-600">顧客備註:</span> {order.notes}
                              </div>
                            )}
                          </div>

                          {/* Items Stack */}
                          <div className="space-y-2 mb-4">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="bg-stone-50/60 p-2.5 rounded-xl border border-stone-100 text-xs">
                                <div className="flex items-center justify-between font-bold text-stone-800 mb-0.5">
                                  <span>{item.name}</span>
                                  <span className="font-semibold text-emerald-800 font-mono">*{item.quantity}杯</span>
                                </div>
                                <div className="text-[10px] text-stone-400 leading-tight">
                                  杯型: {item.customization.size} / {item.customization.sweetness} / {item.customization.ice}
                                  {item.customization.toppings.length > 0 && (
                                    <div className="text-amber-600 mt-0.5">加料: {item.customization.toppings.join(', ')}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Status Toggle buttons */}
                        <div className="border-t border-stone-100 pt-3 mt-2 shrink-0">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] text-stone-400">當前狀態: </span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                              order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-stone-100 text-stone-500'
                            }`}>
                              {statusText}
                            </span>
                          </div>

                          {/* Control actions */}
                          <div className="grid grid-cols-3 gap-1">
                            {order.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id!, 'preparing')}
                                  id={`action-prep-${order.id}`}
                                  className="col-span-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-[10px] text-center transition-all"
                                >
                                  接單(製作)
                                </button>
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id!, 'cancelled')}
                                  id={`action-cancel-${order.id}`}
                                  className="col-span-1 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-650 text-[10px] font-bold text-center transition-all"
                                >
                                  取消
                                </button>
                              </>
                            )}

                            {order.status === 'preparing' && (
                              <>
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id!, 'completed')}
                                  id={`action-comp-${order.id}`}
                                  className="col-span-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-[10px] text-center transition-all"
                                >
                                  飲料完成(出餐)
                                </button>
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id!, 'cancelled')}
                                  id={`action-cancel-${order.id}`}
                                  className="col-span-1 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-500 text-[10px] font-medium text-center transition-all"
                                >
                                  取消
                                </button>
                              </>
                            )}

                            {(order.status === 'completed' || order.status === 'cancelled') && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id!, 'pending')}
                                id={`action-reopen-${order.id}`}
                                className="col-span-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-[10px] font-medium text-center transition-all hover:bg-stone-50"
                              >
                                恢復此單為等待接單
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-stone-150 shadow-sm max-w-lg mx-auto">
                  <ClipboardList className="mx-auto text-stone-300 mb-3" size={40} />
                  <h4 className="text-stone-700 font-semibold mb-1">今日暫無待客點單</h4>
                  <p className="text-stone-400 text-xs">當有客人送出新茶飲點單時，即時資料會自動顯現於此。</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MENU ITEMS MANAGEMENT */}
          {activeTab === 'menu' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-400 tracking-wider uppercase">茶飲菜單清單 ({menuList.length} 項目)</span>
                <button
                  onClick={handleOpenAddDrink}
                  id="add-drink-btn"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                >
                  <Plus size={14} /> 新增茶飲品項
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-stone-100 shadow-3xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-stone-700">
                    <thead className="bg-stone-50 text-stone-500 text-[10px] font-bold uppercase tracking-wider text-center select-none">
                      <tr>
                        <th className="py-3 px-4 text-left">茶飲名稱</th>
                        <th className="py-3 px-3">目錄類別</th>
                        <th className="py-3 px-3">M 中杯價格</th>
                        <th className="py-3 px-3">L 大杯價格</th>
                        <th className="py-3 px-3">在庫狀態</th>
                        <th className="py-3 px-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50 text-center">
                      {menuList.map((drink) => (
                        <tr key={drink.id} className={`hover:bg-stone-50/50 ${!drink.available ? 'bg-stone-50/30' : ''}`}>
                          <td className="py-4 px-4 text-left">
                            <div className="font-bold text-stone-800 text-sm">{drink.name}</div>
                            {drink.description && (
                              <div className="text-[10px] text-stone-450 mt-0.5 line-clamp-1 truncate max-w-sm">
                                {drink.description}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-3 text-stone-500 font-medium">{drink.category}</td>
                          <td className="py-4 px-3 font-mono font-semibold">NT${drink.priceM}</td>
                          <td className="py-4 px-3 font-mono font-semibold">NT${drink.priceL}</td>
                          <td className="py-4 px-3">
                            <button
                              onClick={() => handleToggleDrinkStock(drink)}
                              id={`toggle-${drink.id}`}
                              className="focus:outline-none"
                            >
                              {drink.available ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 justify-center mx-auto w-20">
                                  供應中
                                </span>
                              ) : (
                                <span className="bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 justify-center mx-auto w-20">
                                  已售完
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditDrink(drink)}
                                id={`edit-${drink.id}`}
                                className="w-8 h-8 rounded-lg border border-stone-250 text-stone-500 hover:text-stone-800 hover:border-stone-550 flex items-center justify-center transition-all"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteDrink(drink.id!)}
                                id={`delete-${drink.id}`}
                                className="w-8 h-8 rounded-lg border border-red-200 text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 flex items-center justify-center transition-all"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {menuList.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-stone-400">菜單品項為空，請點選新增。</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT DRINK DETAILS */}
      <AnimatePresence>
        {drinkModalOpen && editingDrink && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-stone-100 flex flex-col"
            >
              <div className="bg-emerald-800 p-6 text-white relative">
                <button
                  type="button"
                  onClick={() => { setDrinkModalOpen(false); setEditingDrink(null); }}
                  className="absolute top-4 right-4 text-white/85 hover:text-white bg-stone-950/20 hover:bg-stone-950/40 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                >
                  <X size={16} />
                </button>
                <h3 className="text-xl font-bold">{editingDrink.id ? '編輯茶飲品項' : '新增茶飲品項'}</h3>
                <p className="text-white/80 text-[10px] mt-1 uppercase font-semibold">八曜和茶品項編輯器</p>
              </div>

              <form onSubmit={handleSaveDrink} className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">茶飲名稱 *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 究極307"
                    value={editingDrink.name || ''}
                    onChange={(e) => setEditingDrink({ ...editingDrink, name: e.target.value })}
                    id="edit-drink-name"
                    className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-850 focus:border-emerald-850"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">目錄類別 *</label>
                  <select
                    value={editingDrink.category || '和風茶'}
                    onChange={(e) => setEditingDrink({ ...editingDrink, category: e.target.value })}
                    id="edit-drink-category"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-850 focus:border-emerald-850 bg-white text-stone-700"
                  >
                    <option value="和風茶">和風茶</option>
                    <option value="自然茶">自然茶</option>
                    <option value="鮮乳配製">鮮乳配製</option>
                    <option value="厚奶茶">厚奶茶</option>
                    <option value="極上白奶茶">極上白奶茶</option>
                    <option value="乳酸樂多">乳酸樂多</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">中杯價格 (M Price) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editingDrink.priceM ?? 0}
                      onChange={(e) => setEditingDrink({ ...editingDrink, priceM: parseInt(e.target.value) || 0 })}
                      id="edit-drink-pricem"
                      className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-850 focus:border-emerald-850 font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">大杯價格 (L Price) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editingDrink.priceL ?? 0}
                      onChange={(e) => setEditingDrink({ ...editingDrink, priceL: parseInt(e.target.value) || 0 })}
                      id="edit-drink-pricel"
                      className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-850 focus:border-emerald-850 font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">茶飲特色說明 & 備註</label>
                  <textarea
                    placeholder="短句描述茶品特色..."
                    value={editingDrink.description || ''}
                    rows={2}
                    onChange={(e) => setEditingDrink({ ...editingDrink, description: e.target.value })}
                    id="edit-drink-desc"
                    className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-[11px] outline-none focus:ring-1 focus:ring-emerald-850 focus:border-emerald-850 resize-full min-h-[50px]"
                  />
                </div>

                <button
                  type="submit"
                  id="edit-drink-submit"
                  className="w-full py-3 bg-emerald-800 text-white font-bold rounded-xl text-xs tracking-wider uppercase shadow-md hover:bg-emerald-700 active:scale-95 transition-all mt-4"
                >
                  儲存茶品
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
