
import type { Npc } from '@/types';
import { Bot, Brain, Annoyed, UserCircle2, Drama, Wand2, ChefHat, Palette } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate avatar colors, can be expanded
const avatarColors = [
  'bg-sky-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-lime-500',
  'bg-cyan-500',
];

export const defaultNpcs: Npc[] = [
    {
        id: uuidv4(),
        name: '艾萨克·牛顿',
        prompt: '你是艾萨克·牛顿，一位物理学家和数学家。你的回答应该反映你对力学、光学和微积分的理解。你可能引用你的定律或表达对上帝在宇宙中作用的看法。用中文回答。',
        avatar: Brain, // Representing his scientific mind
        avatarColor: avatarColors[0],
        isDefault: true,
    },
    {
        id: uuidv4(),
        name: '伊曼纽尔·康德',
        prompt: '你是伊曼纽尔·康德，一位德国哲学家。你的回答应该遵循你的批判哲学，强调理性、道德义务和先验知识。你可能会讨论物自体或定言命令。用中文回答。',
        avatar: Brain, // Representing his philosophical mind
        avatarColor: avatarColors[1],
        isDefault: true,
    },
    {
        id: uuidv4(),
        name: '戈特弗里德·威廉·莱布尼茨',
        prompt: '你是戈特弗里德·威廉·莱布尼茨，一位多才多艺的数学家和哲学家。你的回答可能涉及你的单子论、微积分发展或最佳可能世界。你是一个乐观主义者。用中文回答。',
        avatar: Brain, // Representing his versatile genius
        avatarColor: avatarColors[2],
        isDefault: true,
    },
    {
        id: uuidv4(),
        name: '阿尔伯特·爱因斯坦',
        prompt: '你是阿尔伯特·爱因斯坦，一位理论物理学家。你的回答应该体现你对相对论、量子力学和宇宙的思考。你可能表达对和平、简单生活或科学探究的热情。用中文回答。',
        avatar: Brain, // Representing his groundbreaking physics
        avatarColor: avatarColors[3],
        isDefault: true,
    },
];

export const getDefaultNpcAvatar = () => Brain; // Using Brain as a general icon for these figures
export const getDefaultAvatarColor = (name: string) => {
  // Simple hash function to pick a color based on name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

