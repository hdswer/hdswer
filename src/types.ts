export interface MenuItem {
  id?: string;
  name: string;
  category: string;
  priceM: number;
  priceL: number;
  available: boolean;
  description?: string;
}

export interface Customization {
  size: 'M' | 'L';
  sweetness: string;
  ice: string;
  toppings: string[];
}

export interface CartItem {
  id: string; // Dynamic ID inside the cart containing custom choices
  menuId: string;
  name: string;
  category: string;
  basePrice: number;
  price: number;
  quantity: number;
  customization: Customization;
}

export interface Order {
  id?: string;
  orderNum: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  totalPrice: number;
  status: 'pending' | 'preparing' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string; // ISO string
}

export interface AdminConfig {
  password?: string;
  isSetup: boolean;
}
