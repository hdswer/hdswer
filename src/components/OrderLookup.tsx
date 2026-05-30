import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { Order } from '../types.ts';
import { Search, Hash, Clock, Phone, Loader, ChevronDown, CheckCircle, Timer, AlertCircle, ShoppingBag, MapPin } from 'lucide-react';

export default function OrderLookup() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedPhone = phone.trim();
    if (!formattedPhone) return;

    setLoading(true);
    setSearched(true);
    try {
      const ordersCol = collection(db, 'orders');
      // Look up orders matching customer phone, sorted by creation date descending
      const q = query(
        ordersCol,
        where('customerPhone', '==', formattedPhone),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const results: Order[] = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(results);
      if (results.length > 0) {
        setOpenOrderId(results[0].id || null);
      }
    } catch (err) {
      console.error(err);
      // Wait, let's gracefully handle index building or other errors. If orderby fails because index is not yet built, we query without orderby and sort on client.
      try {
        const ordersCol = collection(db, 'orders');
        const q = query(ordersCol, where('customerPhone', '==', formattedPhone));
        const querySnapshot = await getDocs(q);
        const results: Order[] = [];
        querySnapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() } as Order);
        });
        results.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(results);
        if (results.length > 0) {
          setOpenOrderId(results[0].id || null);
        }
      } catch (backupError) {
        handleFirestoreError(backupError, OperationType.GET, 'orders');
      }
    } finally {
      setLoading(false);
    }
  };

  const statusMap = {
    pending: {
      label: '等待接單中',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <Clock size={14} className="animate-pulse" />
    },
    preparing: {
      label: '飲料製作中',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Timer size={14} className="animate-spin" />
    },
    completed: {
      label: '茶飲已完成',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle size={14} />
    },
    cancelled: {
      label: '點單已取消',
      color: 'bg-rose-50 text-rose-600 border-rose-200',
      icon: <AlertCircle size={14} />
    }
  };

  const getFormatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="bg-white rounded-3xl border border-stone-100 p-6 md:p-8 shadow-sm mb-6">
        <h2 className="text-xl font-bold text-stone-850 mb-2 tracking-tight flex items-center gap-2">
          <Phone size={20} className="text-emerald-800" />
          輸入手機查詢點單 (Search Orders)
        </h2>
        <p className="text-xs text-stone-400 mb-6">
          輸入您送出點單時留下的手機號碼，即可查詢歷史訂單與製作進度。
        </p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-stone-400">
              <Phone size={16} />
            </span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0912345678"
              id="lookup-phone-input"
              className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-800 text-sm font-medium focus:ring-1 focus:ring-emerald-850 focus:border-emerald-850 focus:bg-white transition-all outline-none"
            />
          </div>
          <button
            type="submit"
            id="lookup-submit-btn"
            disabled={loading}
            className="px-6 py-3 bg-emerald-800 text-white font-bold rounded-2xl text-sm transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            {loading ? <Loader className="animate-spin" size={16} /> : <Search size={16} />} 搜尋
          </button>
        </form>
      </div>

      {/* Query Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-emerald-850 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs text-stone-400 animate-pulse">正在調閱資料庫中的茶飲記錄...</p>
        </div>
      ) : searched ? (
        orders.length > 0 ? (
          <div className="space-y-4">
            <div className="text-xs font-bold text-stone-400 tracking-wider uppercase mb-1">
              找到共 {orders.length} 筆點單項目
            </div>
            {orders.map((order) => {
              const isOpen = openOrderId === order.id;
              const statusInfo = statusMap[order.status || 'pending'];
              return (
                <div
                  key={order.id}
                  id={`lookup-order-${order.id}`}
                  className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-xs transition-all hover:border-stone-200"
                >
                  {/* Card Header Accordion Trigger */}
                  <div
                    onClick={() => setOpenOrderId(isOpen ? null : (order.id || null))}
                    className="p-5 flex items-center justify-between cursor-pointer active:bg-stone-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                          #{order.orderNum}
                        </span>
                        <span className="font-semibold text-stone-700 text-sm">
                          {order.customerName}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-400 flex items-center gap-1">
                        <Clock size={10} /> {getFormatDate(order.createdAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 text-xs font-bold border rounded-full flex items-center gap-1 ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-stone-400"
                      >
                        <ChevronDown size={16} />
                      </motion.div>
                    </div>
                  </div>

                  {/* Card Details Body */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-stone-50 bg-stone-50/40"
                      >
                        <div className="p-5 space-y-4 text-stone-700 text-sm">
                          {/* Items List */}
                          <div className="space-y-2.5">
                            <div className="text-[10px] text-stone-400 uppercase font-black tracking-wider">茶飲明細 (Items)</div>
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-start justify-between bg-white rounded-xl p-3 border border-stone-100 shadow-3xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-stone-850">
                                    <span>{item.name}</span>
                                    <span className="text-xs bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded-md font-medium">*{item.quantity}</span>
                                  </div>
                                  <div className="text-stone-400 text-xs flex flex-wrap gap-x-2">
                                    <span>杯型:{item.customization.size}</span>
                                    <span>/ {item.customization.sweetness}</span>
                                    <span>/ {item.customization.ice}</span>
                                    {item.customization.toppings.length > 0 && (
                                      <span className="text-amber-600 font-medium">+ {item.customization.toppings.join(', ')}</span>
                                    )}
                                  </div>
                                </div>
                                <span className="font-mono text-stone-900 font-semibold text-xs py-0.5">
                                  NT${item.price * item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Order Note */}
                          {order.notes && (
                            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 text-xs text-stone-500">
                              <span className="font-bold text-stone-700 block mb-0.5">顧客備註：</span>
                              {order.notes}
                            </div>
                          )}

                          {/* Footer details */}
                          <div className="flex items-center justify-between border-t border-stone-100/80 pt-4 mt-2">
                            <span className="text-xs text-stone-400 font-medium">
                              聯絡手機: <span className="font-mono">{order.customerPhone}</span>
                            </span>
                            <div className="text-right">
                              <span className="text-xs text-stone-400">實付總計 </span>
                              <span className="text-lg font-black font-mono text-emerald-800">
                                NT${order.totalPrice}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-100 shadow-sm">
            <ShoppingBag className="mx-auto text-stone-300 mb-3" size={40} />
            <h4 className="text-stone-700 font-semibold mb-1">找不到相關點單</h4>
            <p className="text-stone-400 text-xs px-6">
              未在其手機號碼 <span className="font-mono text-stone-600 font-bold">"{phone}"</span> 下發現任何有效的茶飲點單。請再次確認號碼是否輸入正確。
            </p>
          </div>
        )
      ) : (
        <div className="text-center py-12 border border-dashed border-stone-200 rounded-3xl text-stone-400 text-xs">
          請於上方輸入完整的行動電話號碼展開查詢。
        </div>
      )}
    </div>
  );
}
