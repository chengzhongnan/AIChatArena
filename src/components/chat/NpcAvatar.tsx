
"use client";

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Assuming AvatarImage might be used if URL is provided
import { UserCircle2 } from 'lucide-react';

interface NpcAvatarProps {
  icon?: LucideIcon | string;
  name: string;
  bgColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function NpcAvatar({ icon: IconComponent, name, bgColor = 'bg-gray-400', size = 'md' }: NpcAvatarProps) {
  const initials = name.substring(0, 2).toUpperCase();
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <Avatar className={cn('shadow-sm', sizeClasses[size])}>
      {typeof IconComponent === 'string' && IconComponent.startsWith('http') ? (
        <AvatarImage src={IconComponent} alt={name} />
      ) : null}
      <AvatarFallback className={cn(bgColor, 'text-white font-semibold', sizeClasses[size])}>
        {typeof IconComponent === 'function' ? (
          <IconComponent className={cn('h-full w-auto p-1.5', size === 'sm' ? 'p-1' : size === 'lg' ? 'p-2' : 'p-1.5')} />
        ) : (
          // If IconComponent is not a function (e.g. it's a string for initials, undefined, or an object causing error), display initials.
          initials
        )}
      </AvatarFallback>
    </Avatar>
  );
}

export function UserAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
   const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };
  return (
    <Avatar className={cn('shadow-sm', sizeClasses[size])}>
      <AvatarFallback className={cn('bg-accent text-accent-foreground', sizeClasses[size])}>
        <UserCircle2 className={cn('h-full w-auto p-1.5', size === 'sm' ? 'p-1' : size === 'lg' ? 'p-2' : 'p-1.5')} />
      </AvatarFallback>
    </Avatar>
  );
}
