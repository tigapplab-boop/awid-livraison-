'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { CartItem, Product, DeliveryZone, FeeCalculation } from '@/bm/types';

interface CartState {
  items: CartItem[];
  selectedZone: DeliveryZone | null;
  deliveryFee: number;
  isNightDelivery: boolean;
}

interface CartContextType extends CartState {
  addItem: (product: Product, quantity?: number, attachedToProductId?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setZone: (zone: DeliveryZone, feeCalc: FeeCalculation) => void;
  clearZone: () => void;
  getBurgersInCart: () => CartItem[];
  getSupplementsForBurger: (burgerProductId: string) => CartItem[];
  totalItems: number;
  subtotal: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Supplement category IDs — populated dynamically from the menu
let _supplementCategoryIds: Set<string> = new Set();

export function registerSupplementCategoryIds(ids: string[]) {
  _supplementCategoryIds = new Set(ids);
}

export function isSupplement(product: Product): boolean {
  // Check by category ID (most reliable, set from menu page)
  if (_supplementCategoryIds.has(product.categoryId)) return true;
  // Fallback: check by category name (if category relation is populated)
  if (product.category?.name) {
    const SUPPLEMENT_NAMES = ['Suppléments', 'Supplements', 'suppléments', 'supplements'];
    return SUPPLEMENT_NAMES.includes(product.category.name);
  }
  return false;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bm_cart')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return []
        }
      }
    }
    return []
  });
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bm_cart_zone')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return null
        }
      }
    }
    return null
  });
  const [deliveryFee, setDeliveryFee] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bm_cart_fee')
      if (saved) return parseInt(saved)
    }
    return 0
  });
  const [isNightDelivery, setIsNightDelivery] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bm_cart_night')
      if (saved) return saved === 'true'
    }
    return false
  });

  // Save to localStorage when cart changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bm_cart', JSON.stringify(items))
    }
  }, [items])

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedZone) {
        localStorage.setItem('bm_cart_zone', JSON.stringify(selectedZone))
      } else {
        localStorage.removeItem('bm_cart_zone')
      }
    }
  }, [selectedZone])

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bm_cart_fee', String(deliveryFee))
    }
  }, [deliveryFee])

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bm_cart_night', String(isNightDelivery))
    }
  }, [isNightDelivery])

  const addItem = useCallback((product: Product, quantity: number = 1, attachedToProductId?: string) => {
    setItems((prev) => {
      // For supplements with attachment, we need to handle them separately
      // since the same supplement could be attached to different burgers
      if (attachedToProductId) {
        // Find existing item with same product AND same attachment
        const existingIndex = prev.findIndex(
          (item) => item.product.id === product.id && item.attachedToProductId === attachedToProductId
        );
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + quantity,
          };
          return updated;
        }
        // Add new item with attachment
        return [...prev, { product, quantity, attachedToProductId }];
      }

      // For non-supplement items (burgers, drinks, fries), find by product id only
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && !item.attachedToProductId
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      // When removing a burger, also remove all supplements attached to it
      // We need to identify which specific cart entries to remove (by reference, not just product.id)
      const itemsToRemove = new Set<number>();

      prev.forEach((item, index) => {
        // Remove the item itself
        if (item.product.id === productId && !item.attachedToProductId) {
          itemsToRemove.add(index);
        }
        // Remove supplements attached to this burger
        if (item.attachedToProductId === productId) {
          itemsToRemove.add(index);
        }
      });

      // Also remove standalone supplement entries matching productId
      prev.forEach((item, index) => {
        if (item.product.id === productId && item.attachedToProductId === undefined) {
          itemsToRemove.add(index);
        }
      });

      return prev.filter((_, index) => !itemsToRemove.has(index));
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => {
        // When removing a burger (quantity <= 0), also remove attached supplements
        const isBurger = prev.some(
          (item) => item.product.id === productId && !item.attachedToProductId
        );
        if (isBurger) {
          return prev.filter(
            (item) => item.product.id !== productId && item.attachedToProductId !== productId
          );
        }
        return prev.filter((item) => item.product.id !== productId);
      });
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      ),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setSelectedZone(null);
    setDeliveryFee(0);
    setIsNightDelivery(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bm_cart')
      localStorage.removeItem('bm_cart_zone')
      localStorage.removeItem('bm_cart_fee')
      localStorage.removeItem('bm_cart_night')
    }
  }, []);

  const setZone = useCallback((zone: DeliveryZone, feeCalc: FeeCalculation) => {
    setSelectedZone(zone);
    setDeliveryFee(feeCalc.currentFee);
    setIsNightDelivery(feeCalc.isNight);
  }, []);

  const clearZone = useCallback(() => {
    setSelectedZone(null);
    setDeliveryFee(0);
    setIsNightDelivery(false);
  }, []);

  const getBurgersInCart = useCallback(() => {
    return items.filter((item) => !item.attachedToProductId);
  }, [items]);

  const getSupplementsForBurger = useCallback((burgerProductId: string) => {
    return items.filter((item) => item.attachedToProductId === burgerProductId);
  }, [items]);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items],
  );

  const total = useMemo(
    () => subtotal + deliveryFee,
    [subtotal, deliveryFee],
  );

  const value = useMemo<CartContextType>(
    () => ({
      items,
      selectedZone,
      deliveryFee,
      isNightDelivery,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      setZone,
      clearZone,
      getBurgersInCart,
      getSupplementsForBurger,
      totalItems,
      subtotal,
      total,
    }),
    [
      items,
      selectedZone,
      deliveryFee,
      isNightDelivery,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      setZone,
      clearZone,
      getBurgersInCart,
      getSupplementsForBurger,
      totalItems,
      subtotal,
      total,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
