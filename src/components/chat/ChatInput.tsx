"use client";

import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendHorizonal, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onStopConversations: () => void; // Added prop for stopping conversations
}

export function ChatInput({ onSendMessage, isLoading, onStopConversations }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      if (message.trim().toLowerCase() === 'stop') { // Check for 'stop' command
        onStopConversations(); // Call the new prop function
        setMessage(''); // Clear the input
        return; // Stop further processing
      }
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 border-t bg-background sticky bottom-0">
      <Input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="flex-grow rounded-full px-4 py-2 focus-visible:ring-accent"
        disabled={isLoading}
        aria-label="Chat message input"
      />
      <Button type="submit" size="icon" className="rounded-full bg-accent hover:bg-accent/90" disabled={isLoading} aria-label="Send message">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizonal className="h-5 w-5" />}
      </Button>
    </form>
  );
}
