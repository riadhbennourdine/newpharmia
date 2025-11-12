
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// Define the shape of the context data
interface CartContextType {
  cartItems: string[]; // Array of webinar IDs
  addToCart: (webinarId: string) => void;
  removeFromCart: (webinarId: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
}

// Create the context with a default value
const CartContext = createContext<CartContextType | undefined>(undefined);

// Create a provider component
interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<string[]>(() => {
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

  const addToCart = (webinarId: string) => {
    setCartItems(prevItems => {
      if (!prevItems.includes(webinarId)) {
        return [...prevItems, webinarId];
      }
      return prevItems;
    });
  };

  const removeFromCart = (webinarId: string) => {
    setCartItems(prevItems => prevItems.filter(id => id !== webinarId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getItemCount = () => cartItems.length;

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, getItemCount }}>
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
