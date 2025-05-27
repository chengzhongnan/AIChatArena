"use client";

import type { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { NpcAvatar, UserAvatar } from './NpcAvatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, AlertTriangle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.senderType === 'user';
  const bubbleAlignment = isUser ? 'items-end' : 'items-start';
  const bubbleColor = isUser
    ? 'bg-primary text-primary-foreground' 
    : 'bg-card text-card-foreground border';
  const nameColor = isUser ? 'text-primary-foreground/80' : 'text-muted-foreground';

  // Safely extract and validate sender name
  const getSenderName = (): string => {
    if (typeof message.senderName === 'string') {
      return message.senderName;
    }
    if (isUser) {
      return 'You';
    }
    return 'Unknown NPC';
  };

  const senderName = getSenderName();

  // Check if message indicates an error or loading issue
  const hasError = message.text?.includes("I'm having trouble thinking right now") || 
                   message.text?.includes("error") ||
                   message.text?.includes("Error");

  return (
    <div className={cn('flex flex-col w-full mb-4', bubbleAlignment)}>
      <div className={cn(
        'flex items-end gap-2 max-w-[85%] md:max-w-[75%]', 
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}>
        {/* Avatar */}
        {isUser ? (
          <UserAvatar />
        ) : (
          <NpcAvatar 
            icon={message.avatar} 
            name={senderName} 
            bgColor={message.avatarColor} 
          />
        )}
        
        {/* Message Card */}
        <Card className={cn(
          'rounded-xl shadow-md overflow-hidden transition-all duration-200',
          bubbleColor,
          isUser ? 'rounded-tr-none' : 'rounded-tl-none',
          hasError && 'border-destructive/50'
        )}>
          <CardHeader className="p-3 pb-2">
            <CardTitle className={cn("text-sm font-medium", nameColor)}>
              {senderName}
            </CardTitle>
            {/* {message.npcReasoning && (
              <CardDescription className={cn(
                "text-xs italic pt-1 opacity-75", 
                nameColor
              )}>
                Reason to speak: {message.npcReasoning}
              </CardDescription>
            )} */}
          </CardHeader>
          
          <CardContent className="p-3 pt-0">
            {message.isLoading ? (
              <div data-testid="loading-skeleton" className="space-y-2">
                <Skeleton className="h-4 w-[200px] bg-muted/30" />
                <Skeleton className="h-4 w-[150px] bg-muted/30" />
                <Skeleton className="h-4 w-[100px] bg-muted/30" />
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="text-sm whitespace-pre-wrap break-words flex-1 leading-relaxed">
                  {message.text || 'No message content'}
                </p>
                {hasError && (
                  <AlertTriangle className="flex-shrink-0 w-4 h-4 text-destructive mt-0.5" />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Timestamp */}
      <div className={cn(
        'text-xs text-muted-foreground mt-1 px-1',
        isUser ? 'text-right pr-12' : 'text-left pl-12'
      )}>
        {message.timestamp ? (
          new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        ) : (
          'Now'
        )}
      </div>
    </div>
  );
}