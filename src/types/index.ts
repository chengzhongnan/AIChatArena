import type { LucideIcon } from 'lucide-react';

export interface Npc {
  id: string;
  name: string;
  prompt: string;
  avatar: LucideIcon | string; // Can be a LucideIcon component or a string for initials
  avatarColor?: string; // Optional background color for avatar
  isDefault?: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderName: string; // "user" or NPC name
  senderType: 'user' | 'npc';
  avatar?: LucideIcon | string;
  avatarColor?: string; 
  timestamp: number;
  isLoading?: boolean; // For NPC responses being generated
  npcReasoning?: string; // For the prioritized NPC's reasoning
}

export interface NpcGroup {
  id: string;
  name: string;
  npcIds: string[];
  createdAt: Date;
}
