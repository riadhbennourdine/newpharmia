
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { WebinarTimeSlot, Webinar, WebinarGroup, ProductType, Pack } from '../types';

// Define the shape of a single cart item
export interface CartItem {
  type: ProductType; // 'WEBINAR' or 'PACK'
  id: string; // webinarId or packId
  webinarId?: string; // Kept for compatibility/clarity
  packId?: string;
  slots?: WebinarTimeSlot[];
  title: string;
  date?: Date; // Only for webinars
  group: WebinarGroup; // Critical for mixed-cart check
  priceHT?: number;
  credits?: number;
  description?: string;
}

// Define the shape of the context data
interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: { webinar?: Webinar, pack?: Pack, type: ProductType, selectedSlots?: WebinarTimeSlot[] }) => void;
  removeFromCart: (id: string) => void;
  updateItemSlots: (webinarId: string, newSlots: WebinarTimeSlot[]) => void;
  clearCart: () => void;
  getItemCount: () => number;
  findItem: (id: string) => CartItem | undefined;
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
      if (!localData) return [];
      
      const parsedData = JSON.parse(localData);
      
      // Auto-repair/Migrate legacy items
      return parsedData.map((item: any) => {
          if (!item.type) {
              if (item.packId) return { ...item, type: ProductType.PACK, id: item.packId, group: WebinarGroup.MASTER_CLASS };
              return { ...item, type: ProductType.WEBINAR, id: item.webinarId, group: WebinarGroup.CROP_TUNIS }; // Default fallback
          }
          return item;
      });
    } catch (error) {
      console.error("Could not parse webinar cart from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    // Save cart to local storage whenever it changes
    localStorage.setItem('webinarCart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (input: { webinar?: Webinar, pack?: Pack, type: ProductType, selectedSlots?: WebinarTimeSlot[] }) => {
    const { webinar, pack, type, selectedSlots } = input;
    
    let newItem: CartItem;
    let itemGroup: WebinarGroup;

    if (type === ProductType.WEBINAR && webinar) {
        const now = new Date();
        const webinarDateTime = new Date(webinar.date);
        
        let isPast = webinarDateTime < now;

        // Special logic for PHARMIA group: extended validity (Tuesday to Friday)
        if (webinar.group === WebinarGroup.PHARMIA) {
             const fridayDate = new Date(webinarDateTime);
             fridayDate.setDate(webinarDateTime.getDate() + 3);
             fridayDate.setHours(23, 59, 59, 999); // End of Friday
             isPast = fridayDate < now;
        }

        if (isPast) {
            console.warn(`Cannot add past webinar "${webinar.title}" to cart.`);
            return;
        }
        itemGroup = webinar.group;
        newItem = {
            type: ProductType.WEBINAR,
            id: webinar._id as string,
            webinarId: webinar._id as string,
            slots: selectedSlots || [],
            title: webinar.title,
            date: webinar.date,
            group: webinar.group,
            priceHT: webinar.price, // Add webinar price to CartItem
        };
    } else if (type === ProductType.PACK && pack) {
        if (pack.id.startsWith('PIA_')) {
            itemGroup = WebinarGroup.PHARMIA;
        } else {
            itemGroup = WebinarGroup.MASTER_CLASS;
        }
        newItem = {
            type: ProductType.PACK,
            id: pack.id,
            packId: pack.id,
            title: pack.name,
            group: itemGroup,
            priceHT: pack.priceHT,
            credits: pack.credits,
            description: pack.description,
        };
    } else {
        console.error("Invalid addToCart input");
        return;
    }

    // Security Check: Mixed Groups
    if (cartItems.length > 0) {
        const firstItemGroup = cartItems[0].group;
        // Check for incompatibility
        // If current cart is CROP and new item is MASTER_CLASS -> Error
        // If current cart is MASTER_CLASS and new item is CROP -> Error
        if (firstItemGroup !== itemGroup) {
            alert("Impossible d'associer des formations CROP Tunis et des Master Classes dans le même panier pour des raisons de facturation.\n\nVeuillez finaliser votre commande en cours ou vider votre panier.");
            return;
        }
    }

    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(i => i.id === newItem.id);

      if (existingItemIndex > -1) {
        // Item already exists
        const updatedItems = [...prevItems];
        // Merge logic if needed, for now just replace/update slots if webinar
        if (type === ProductType.WEBINAR) {
             updatedItems[existingItemIndex] = { ...updatedItems[existingItemIndex], slots: newItem.slots };
        }
        return updatedItems;
      } else {
        // Item does not exist, add it
        return [...prevItems, newItem];
      }
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const updateItemSlots = (webinarId: string, newSlots: WebinarTimeSlot[]) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === webinarId ? { ...item, slots: newSlots } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getItemCount = () => cartItems.length;

  const findItem = (id: string) => {
    return cartItems.find(item => item.id === id);
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
