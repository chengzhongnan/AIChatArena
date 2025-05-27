
"use client";

import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Step 1: Always initialize state with initialValue for consistent server/client first render.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Step 2: useEffect to load from localStorage on the client after initial hydration.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item) as T);
      } else {
        // If the item doesn't exist in localStorage,
        // and we want to persist the initialValue, we can do it here.
        // For this app, defaultNpcs being the initialValue means if LS is empty,
        // storedValue remains defaultNpcs. If a user action clears NPCs to [],
        // then [] will be stored and loaded.
        // window.localStorage.setItem(key, JSON.stringify(initialValue));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}" in useEffect:`, error);
      // Optionally revert to initialValue or handle error
      // setStoredValue(initialValue);
    }
  }, [key, initialValue]); // initialValue is included in case it's a prop that could change

  // Step 3: Persist to localStorage when setValue is called.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue] // storedValue is needed if `value` is a function
  );

  // Step 4: Listen to storage events from other tabs.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        if (event.newValue !== null) {
          try {
            setStoredValue(JSON.parse(event.newValue) as T);
          } catch (error) {
            console.warn(`Error parsing localStorage key "${key}" on storage event:`, error);
          }
        } else {
          // Item was removed from localStorage in another tab, reset to initialValue
          setStoredValue(initialValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);

  return [storedValue, setValue];
}

export default useLocalStorage;
