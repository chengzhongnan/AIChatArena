
"use client";

import { useCallback, useEffect, useState } from 'react';
import type { Npc } from '@/types';
import { defaultNpcs, getDefaultNpcAvatar, getDefaultAvatarColor } from '@/config/defaultNpcs';
import useLocalStorage from './useLocalStorage';
import { v4 as uuidv4 } from 'uuid';
// UserCircle2 is already imported in defaultNpcs.ts and exported via getDefaultNpcAvatar
// import { UserCircle2 } from 'lucide-react'; 

const NPCS_STORAGE_KEY = 'npc-chat-arena-npcs';

export function useNpcs() {
  // Initialize useLocalStorage with defaultNpcs.
  // This ensures that on SSR and initial client render, `npcs` will be `defaultNpcs`
  // if localStorage is empty. Then, useLocalStorage's useEffect will load actual
  // stored values if they exist.
  const [npcs, setNpcs] = useLocalStorage<Npc[]>(NPCS_STORAGE_KEY, defaultNpcs);

  // The problematic 'if' block that set defaultNpcs during render is removed.
  // useLocalStorage now handles the initial state consistently.
  // If localStorage stores an explicit empty array `[]`, useLocalStorage will load that,
  // and `npcs` will become `[]`, correctly triggering the "no NPCs" alert.

  const addNpc = useCallback((name: string, prompt: string) => {
    const newNpc: Npc = {
      id: uuidv4(),
      name,
      prompt,
      avatar: getDefaultNpcAvatar(),
      avatarColor: getDefaultAvatarColor(name),
      isDefault: false,
    };
    setNpcs(prevNpcs => {
      // If prevNpcs was defaultNpcs and user adds first custom NPC,
      // we might want to replace defaultNpcs or add to them.
      // Current behavior: adds to existing list. If list was defaultNpcs, they remain.
      // If list was empty '[]' (because user deleted all), it adds to empty.
      // This seems fine.
      return [...prevNpcs, newNpc];
    });
    return newNpc;
  }, [setNpcs]);

  const updateNpc = useCallback((id: string, updates: Partial<Omit<Npc, 'id' | 'isDefault'>>) => {
    setNpcs(prevNpcs =>
      prevNpcs.map(npc =>
        npc.id === id ? { ...npc, ...updates, avatarColor: updates.name ? getDefaultAvatarColor(updates.name) : npc.avatarColor } : npc
      )
    );
  }, [setNpcs]);

  const deleteNpc = useCallback((id: string) => {
    setNpcs(prevNpcs => {
      const newNpcs = prevNpcs.filter(npc => npc.id !== id);
      // If deleting the last NPC results in an empty list,
      // and the original state in localStorage was `defaultNpcs`,
      // this will correctly store `[]`.
      return newNpcs;
    });
  }, [setNpcs]);

  const getNpcById = useCallback((id: string): Npc | undefined => {
    return npcs.find(npc => npc.id === id);
  }, [npcs]);

  return { npcs, addNpc, updateNpc, deleteNpc, getNpcById };
}
