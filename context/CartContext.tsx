
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { WebinarTimeSlot, Webinar } from '../types';

// Define the shape of a single cart item
export interface CartItem {
  webinarId: string;
  slots: WebinarTimeSlot[];
  webinarDate: Date;
  webinarTitle: string;
}

// Define the shape of the context data
interface CartContextType {
  cartItems: CartItem[];
  addToCart: (webinar: Webinar, selectedSlots: WebinarTimeSlot[]) => void;
  removeFromCart: (webinarId: string) => void;
  updateItemSlots: (webinarId: string, newSlots: WebinarTimeSlot[]) => void;
  clearCart: () => void;
  getItemCount: () => number;
  findItem: (webinarId: string) => CartItem | undefined;
}

// Create the context with a default value
const CartContext = createContext<CartContextType | undefined>(undefined);

// Create a provider component
interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    // Load cart from local storage on initial load
    try {
      const localData = localStorage.getItem('webinarCart');
      return localData ? JSON.parse(localData) : [];
    } catch (error) {
      console.error("Could not parse webinar cart from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    // Save cart to local storage whenever it changes
    localStorage.setItem('webinarCart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (webinar: Webinar, selectedSlots: WebinarTimeSlot[]) => {
    const now = new Date();
    const webinarDateTime = new Date(webinar.date);

    if (webinarDateTime < now) {
      console.warn(`Cannot add past webinar "${webinar.title}" to cart.`);
      return;
    }

    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(i => i.webinarId === webinar._id);
      const newItem: CartItem = {
        webinarId: webinar._id as string,
        slots: selectedSlots,
        webinarDate: webinar.date,
        webinarTitle: webinar.title,
      };

      if (existingItemIndex > -1) {
        // Item already exists, update its slots
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = newItem;
        return updatedItems;
      } else {
        // Item does not exist, add it
        return [...prevItems, newItem];
      }
    });
  };

  const removeFromCart = (webinarId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.webinarId !== webinarId));
  };

  const updateItemSlots = (webinarId: string, newSlots: WebinarTimeSlot[]) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.webinarId === webinarId ? { ...item, slots: newSlots } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getItemCount = () => cartItems.length;

  const findItem = (webinarId: string) => {
    return cartItems.find(item => item.webinarId === webinarId);
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateItemSlots, clearCart, getItemCount, findItem }}>
      {children}
    </CartContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
