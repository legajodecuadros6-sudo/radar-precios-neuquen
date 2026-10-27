import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, BasketItem } from '../types';

interface BasketContextType {
  items: BasketItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearBasket: () => void;
  isBasketOpen: boolean;
  openBasket: () => void;
  closeBasket: () => void;
  toggleBasket: () => void;
  isScannerOpen: boolean;
  setIsScannerOpen: (open: boolean) => void;
  isMapOpen: boolean;
  setIsMapOpen: (open: boolean) => void;
  selectedProductForModal: Product | null;
  setSelectedProductForModal: (product: Product | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  itemCount: number;
}

const BasketContext = createContext<BasketContextType | undefined>(undefined);

const BASKET_STORAGE_KEY = 'radar_precios_neuquen_basket';

export const BasketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<BasketItem[]>(() => {
    try {
      const stored = localStorage.getItem(BASKET_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  useEffect(() => {
    try {
      localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  }, [items]);

  const addItem = (product: Product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev =>
      prev.map(i => (i.product.id === productId ? { ...i, quantity } : i))
    );
  };

  const clearBasket = () => {
    setItems([]);
  };

  const openBasket = () => setIsBasketOpen(true);
  const closeBasket = () => setIsBasketOpen(false);
  const toggleBasket = () => setIsBasketOpen(prev => !prev);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <BasketContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearBasket,
        isBasketOpen,
        openBasket,
        closeBasket,
        toggleBasket,
        isScannerOpen,
        setIsScannerOpen,
        isMapOpen,
        setIsMapOpen,
        selectedProductForModal,
        setSelectedProductForModal,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        itemCount
      }}
    >
      {children}
    </BasketContext.Provider>
  );
};

export const useBasket = () => {
  const context = useContext(BasketContext);
  if (!context) {
    throw new Error('useBasket debe ser usado dentro de BasketProvider');
  }
  return context;
};
