import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem, CartItem, Customization } from '../types.ts';
import { Plus, Check, ShoppingBag, X, Wine, Info, AlertOctagon } from 'lucide-react';

interface OrderFormProps {
  menuItems: MenuItem[];
  onAddToCart: (item: Omit<CartItem, 'id' | 'quantity'> & { quantity: number }) => void;
}

const CATEGORIES = ['全部', '和風茶', '自然茶', '鮮乳配製', '厚奶茶', '極上白奶茶', '乳酸樂多'];

const SWEETNESS_OPTIONS = ['正常糖 (100%)', '少糖 (70%)', '半糖 (50%)', '微糖 (30%)', '無糖 (0%)'];
const ICE_OPTIONS = ['正常冰', '少冰', '微冰', '去冰', '熱飲'];
const TOPPINGS = [
  { name: '蜜漬白玉丸', price: 10 },
  { name: '椰果', price: 10 },
  { name: '仙草凍', price: 10 },
  { name: '寒天天草', price: 10 }
];

export default function OrderForm({ menuItems, onAddToCart }: OrderFormProps) {
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [selectedDrink, setSelectedDrink] = useState<MenuItem | null>(null);

  // Customization selection state
  const [size, setSize] = useState<'M' | 'L'>('L');
  const [sweetness, setSweetness] = useState('半糖 (50%)');
  const [ice, setIce] = useState('微冰');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  const filteredItems = selectedCategory === '全部'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  const openCustomization = (drink: MenuItem) => {
    if (!drink.available) return;
    setSelectedDrink(drink);
    setSize('L');
    setSweetness('半糖 (50%)');
    setIce('微冰');
    setSelectedToppings([]);
    setQuantity(1);
  };

  const toggleTopping = (toppingName: string) => {
    setSelectedToppings(prev =>
      prev.includes(toppingName)
        ? prev.filter(t => t !== toppingName)
        : [...prev, toppingName]
    );
  };

  const handleAddValue = () => {
    if (!selectedDrink) return;

    const basePrice = size === 'M' ? selectedDrink.priceM : selectedDrink.priceL;
    const toppingsPrice = selectedToppings.length * 10;
    const singleUnitPrice = basePrice + toppingsPrice;

    onAddToCart({
      menuId: selectedDrink.id || '',
      name: selectedDrink.name,
      category: selectedDrink.category,
      basePrice: basePrice,
      price: singleUnitPrice,
      quantity: quantity,
      customization: {
        size,
        sweetness,
        ice,
        toppings: [...selectedToppings]
      }
    });

    setSelectedDrink(null);
  };

  return (
    <div className="w-full">
      {/* Category Tabs */}
      <div className="mb-8 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex space-x-2 md:justify-center min-w-max px-4">
          {CATEGORIES.map(category => (
            <button
              key={category}
              id={`cat-btn-${category}`}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedCategory === category
                  ? 'bg-emerald-800 text-white shadow-md shadow-emerald-800/10 scale-105'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-emerald-800 border border-gray-150'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 max-w-7xl mx-auto">
        {filteredItems.map((drink, i) => (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
            key={drink.id || i}
            id={`drink-card-${drink.id || i}`}
            className={`bg-white rounded-2xl border border-stone-100 p-5 shadow-sm transition-all duration-300 hover:shadow-md relative overflow-hidden flex flex-col justify-between ${
              drink.available ? 'cursor-pointer hover:border-emerald-700/30' : 'opacity-70 bg-stone-50'
            }`}
            onClick={() => openCustomization(drink)}
          >
            {/* Tag Category */}
            <div className="absolute top-0 right-0">
              <span className="bg-stone-100 text-stone-600 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-bl-xl block">
                {drink.category}
              </span>
            </div>

            <div className="pr-12">
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="font-bold text-lg text-stone-800 tracking-tight">{drink.name}</h3>
                {!drink.available && (
                  <span className="bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5">
                    <AlertOctagon size={10} /> 售完
                  </span>
                )}
              </div>
              <p className="text-stone-500 text-xs leading-relaxed min-h-[32px] mb-4">
                {drink.description || '精選優質茶葉，現點現泡極致風味。'}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 pt-3 mt-2">
              <div className="flex items-baseline gap-3">
                {drink.priceM && (
                  <span className="text-stone-700 text-sm">
                    M <span className="font-mono text-stone-900 font-semibold">NT${drink.priceM}</span>
                  </span>
                )}
                {drink.priceL && (
                  <span className="text-stone-700 text-sm">
                    L <span className="font-mono text-stone-900 font-semibold text-base">NT${drink.priceL}</span>
                  </span>
                )}
              </div>

              {drink.available ? (
                <button
                  id={`add-btn-${drink.id}`}
                  className="w-8 h-8 rounded-full bg-emerald-800 text-white hover:bg-emerald-700 flex items-center justify-center transition-all duration-300 transform hover:scale-115 active:scale-95 shadow-sm shadow-emerald-800/10"
                  type="button"
                >
                  <Plus size={16} />
                </button>
              ) : (
                <span className="text-xs text-stone-400 font-medium">明日請早</span>
              )}
            </div>
            
            {/* Elegant visual backdrop tint for branding */}
            <div className="absolute top-1/2 left-0 w-1.5 h-10 -translate-y-1/2 bg-emerald-800 rounded-r-md transition-all duration-300 opacity-0 group-hover:opacity-100" />
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-100 max-w-lg mx-auto shadow-sm my-10">
          <Wine className="mx-auto text-stone-300 mb-4" size={48} />
          <h4 className="text-stone-700 font-semibold mb-1">此類別暫無飲品</h4>
          <p className="text-stone-400 text-xs">我們即將推出更多精緻好茶，敬請期待！</p>
        </div>
      )}

      {/* Customization Modal */}
      <AnimatePresence>
        {selectedDrink && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-stone-100 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="bg-emerald-800 p-6 text-white relative">
                <button
                  onClick={() => setSelectedDrink(null)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white bg-stone-900/20 hover:bg-stone-900/40 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  id="close-modal-btn"
                >
                  <X size={18} />
                </button>
                <div className="text-[10px] tracking-wider uppercase font-extrabold text-amber-300 mb-1">
                  {selectedDrink.category}
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">{selectedDrink.name}</h3>
                {selectedDrink.description && (
                  <p className="text-white/85 text-xs mt-2 font-light leading-relaxed">
                    {selectedDrink.description}
                  </p>
                )}
              </div>

              {/* Scrollable Customization Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Size Selection */}
                <div>
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <span className="w-1 h-3.5 bg-emerald-800 rounded-full inline-block" />
                    選擇容量 (Size)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSize('M')}
                      id="size-m-btn"
                      className={`py-3.5 px-4 rounded-xl border text-center transition-all ${
                        size === 'M'
                          ? 'border-emerald-800 bg-emerald-50/50 text-emerald-800 font-semibold'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <span className="block text-sm">中杯 (Medium)</span>
                      <span className="block text-xs font-mono font-medium text-stone-500 mt-1">
                        NT${selectedDrink.priceM}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSize('L')}
                      id="size-l-btn"
                      className={`py-3.5 px-4 rounded-xl border text-center transition-all ${
                        size === 'L'
                          ? 'border-emerald-800 bg-emerald-50/50 text-emerald-800 font-semibold'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <span className="block text-sm">大杯 (Large)</span>
                      <span className="block text-xs font-mono font-medium text-stone-500 mt-1">
                        NT${selectedDrink.priceL}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sweetness Selection */}
                <div>
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <span className="w-1 h-3.5 bg-emerald-800 rounded-full inline-block" />
                    選擇甜度 (Sweetness)
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {SWEETNESS_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSweetness(opt)}
                        id={`sweetness-btn-${opt}`}
                        className={`py-2 px-1 text-center rounded-lg text-xs border transition-all ${
                          sweetness === opt
                            ? 'border-emerald-800 bg-emerald-50/50 text-emerald-800 font-semibold'
                            : 'border-stone-150 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {opt.split(' ')[0]}
                        <span className="block text-[8px] text-stone-400 font-mono mt-0.5">
                          {opt.split(' ')[1] || ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ice Selection */}
                <div>
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <span className="w-1 h-3.5 bg-emerald-800 rounded-full inline-block" />
                    選擇冰量 (Ice Level)
                  </h4>
                  <div className="grid grid-cols-5 gap-2">
                    {ICE_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setIce(opt)}
                        id={`ice-btn-${opt}`}
                        className={`py-2.5 px-1 text-center rounded-lg text-xs border transition-all ${
                          ice === opt
                            ? 'border-emerald-800 bg-emerald-50/50 text-emerald-800 font-semibold'
                            : 'border-stone-150 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toppings Selection */}
                <div>
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <span className="w-1 h-3.5 bg-emerald-800 rounded-full inline-block" />
                    加料客製化 (Toppings)
                  </h4>
                  <p className="text-[10px] text-stone-400 mb-3 block">每項加料酌收 NT$10 元</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TOPPINGS.map(top => {
                      const active = selectedToppings.includes(top.name);
                      return (
                        <button
                          key={top.name}
                          type="button"
                          onClick={() => toggleTopping(top.name)}
                          id={`topping-btn-${top.name}`}
                          className={`py-3 px-3.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                            active
                              ? 'border-amber-500 bg-amber-50/30 text-stone-800 font-medium'
                              : 'border-stone-150 text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded flex items-center justify-center border text-white transition-all ${
                              active ? 'bg-amber-500 border-amber-500' : 'border-stone-300 bg-white'
                            }`}>
                              {active && <Check size={10} strokeWidth={3} />}
                            </span>
                            <span className="text-xs">{top.name}</span>
                          </div>
                          <span className="text-xs font-mono text-amber-700 font-semibold">+NT$10</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity Control */}
                <div className="flex items-center justify-between border-t border-stone-100 pt-5">
                  <span className="text-xs font-bold text-stone-700 uppercase tracking-widest">購買數量</span>
                  <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      id="qty-minus"
                      className="w-10 h-9 font-bold text-stone-600 hover:bg-stone-200 flex items-center justify-center transition-all active:scale-90"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-mono font-semibold text-stone-800 text-sm">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => q + 1)}
                      id="qty-plus"
                      className="w-10 h-9 font-bold text-stone-600 hover:bg-stone-200 flex items-center justify-center transition-all active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-stone-100 p-6 bg-stone-50/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-stone-400 uppercase font-bold">總金額 (Total)</div>
                  <div className="text-2xl font-black font-mono text-emerald-800">
                    NT${( (size === 'M' ? selectedDrink.priceM : selectedDrink.priceL) + (selectedToppings.length * 10) ) * quantity}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddValue}
                  id="confirm-add-cart-btn"
                  className="px-6 py-3 rounded-full bg-emerald-800 text-white font-bold text-sm tracking-wide shadow-md shadow-emerald-800/10 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2"
                >
                  <ShoppingBag size={16} /> 放入點單車
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
