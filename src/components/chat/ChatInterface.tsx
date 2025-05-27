// --- START OF FILE ChatInterface.tsx ---

"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage, Npc } from '@/types';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput'; // 假设 ChatInput.tsx 已按要求更新
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNpcs } from '@/hooks/useNpcs';
import { useToast } from '@/hooks/use-toast';

// AI Flow Imports
import { prioritizeNPCResponse, type PrioritizeNPCResponseInput } from '@/ai/flows/prioritize-npc-response';
import { collaborativeDiscussion, type CollaborativeDiscussionInput, type CollaborativeDiscussionOutput } from '@/ai/flows/enable-collaborative-discussion';
import { generateSingleNpcResponse, type GenerateSingleNpcResponseInput } from '@/ai/flows/generate-single-npc-response-flow';
import { generateNpcContinuation, type GenerateNpcContinuationInput } from '@/ai/flows/generate-npc-continuation-flow';
import { generateUserReengagement, type GenerateUserReengagementInput } from '@/ai/flows/generate-user-reengagement-flow';
import { generateContextSummary, type GenerateContextSummaryInput } from '@/ai/flows/summarize-chat-history-flow';

import { v4 as uuidv4 } from 'uuid';
import { AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Constants
const INITIAL_CONTINUATION_INTERVAL = 8000;
const CONTINUATION_INTERVAL_INCREMENT = 5000;
const MAX_CONTINUATION_INTERVAL = 30000;
const REENGAGEMENT_TIMEOUT = 45000;
const MESSAGES_PER_SUMMARY_UPDATE = 10;
const MAX_LLM_HISTORY_MESSAGES = 10;
const NPC_DISPLAY_DELAY = 1000;

// --- LLM History Helper ---
type LlmMessage = { role: 'user' | 'model'; content: [{ text: string }] };

const sanitizeLlmHistory = (history: LlmMessage[]): LlmMessage[] => {
  if (history.length === 0) return [];
  let sanitized: LlmMessage[] = [];
  let lastRole: 'user' | 'model' | null = null;
  for (const msg of history) {
    if (msg.role === lastRole) {
      if (sanitized.length > 0) sanitized[sanitized.length - 1] = msg;
    } else {
      sanitized.push(msg);
      lastRole = msg.role;
    }
  }
  while (sanitized.length > 0 && sanitized[0].role === 'model') {
    console.warn(`[sanitizeLlmHistory] History starts with 'model'. Removing: "${sanitized[0].content[0].text.substring(0,30)}"`);
    sanitized.shift();
  }
  if (sanitized.length === 0) {
      console.warn("[sanitizeLlmHistory] History empty after sanitization.");
  }
  return sanitized;
};

const buildLlmChatHistory = (currentMessages: ChatMessage[], maxMessages: number = MAX_LLM_HISTORY_MESSAGES): LlmMessage[] => {
  const recentMessages = currentMessages
    .filter(msg => msg.senderType !== 'system' && !msg.isLoading && msg.text.trim() !== '')
    .slice(-maxMessages);
  const rawHistory: LlmMessage[] = recentMessages.map(msg => ({
    role: msg.senderType === 'user' ? 'user' : 'model' as 'user' | 'model',
    content: [{ text: msg.text }],
  }));
  return sanitizeLlmHistory(rawHistory);
};
// --- End LLM History Helper ---

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isNpcThinking, setIsNpcThinking] = useState(false);
  const [currentContextSummary, setCurrentContextSummary] = useState<string>("");
  const [messageIdsForNextSummary, setMessageIdsForNextSummary] = useState<string[]>([]);
  const [queuedNpcMessages, setQueuedNpcMessages] = useState<ChatMessage[]>([]);

  const { npcs } = useNpcs();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const continuationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reengagementTimerRef = useRef<NodeJS.Timeout | null>(null);
  const npcDisplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentContinuationIntervalRef = useRef<number>(INITIAL_CONTINUATION_INTERVAL);

  const clearAllTimers = useCallback(() => {
    if (continuationTimerRef.current) clearTimeout(continuationTimerRef.current);
    if (reengagementTimerRef.current) clearTimeout(reengagementTimerRef.current);
    if (npcDisplayTimerRef.current) clearTimeout(npcDisplayTimerRef.current);
    continuationTimerRef.current = null;
    reengagementTimerRef.current = null;
    npcDisplayTimerRef.current = null;
  }, []);

  const addMessage = useCallback((message: ChatMessage, isFinal: boolean = true) => {
    setMessages(prevMsgs => {
      if (prevMsgs.some(m => m.id === message.id)) {
        console.warn(`[addMessage] Duplicate ID: ${message.id}. Updating.`);
        return prevMsgs.map(m => m.id === message.id ? message : m);
      }
      return [...prevMsgs, message];
    });
    if (isFinal && (message.senderType === 'user' || message.senderType === 'npc') && !message.isLoading && message.text.trim() !== '') {
      setMessageIdsForNextSummary(prevIds => {
        if (prevIds.includes(message.id)) return prevIds;
        return [...prevIds, message.id];
      });
    }
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    let finalMessageForSummary: ChatMessage | null = null;
    setMessages(prev => prev.map(msg => {
      if (msg.id === id) {
        const originalWasLoading = msg.isLoading;
        const updatedMsg = { ...msg, ...updates };
        if (originalWasLoading && !updatedMsg.isLoading && updatedMsg.text.trim() !== '' && (updatedMsg.senderType === 'user' || updatedMsg.senderType === 'npc')) {
          finalMessageForSummary = updatedMsg;
        }
        return updatedMsg;
      }
      return msg;
    }));
    if (finalMessageForSummary) {
      const msgIdForSummary = finalMessageForSummary.id;
      setMessageIdsForNextSummary(prevIds => {
        if (prevIds.includes(msgIdForSummary)) return prevIds;
        return [...prevIds, msgIdForSummary];
      });
    }
  }, []);

  useEffect(() => { // NPC Display Queue
    if (queuedNpcMessages.length > 0 && !isNpcThinking && !npcDisplayTimerRef.current) {
      npcDisplayTimerRef.current = setTimeout(() => {
        setQueuedNpcMessages(prevQueue => {
          if (prevQueue.length > 0) {
            const [nextMessage, ...rest] = prevQueue;
            addMessage(nextMessage, true);
            return rest;
          }
          return prevQueue;
        });
        npcDisplayTimerRef.current = null;
      }, NPC_DISPLAY_DELAY);
    } else if (npcDisplayTimerRef.current && (isNpcThinking || queuedNpcMessages.length === 0)) {
      clearTimeout(npcDisplayTimerRef.current);
      npcDisplayTimerRef.current = null;
    }
    return () => { if (npcDisplayTimerRef.current) clearTimeout(npcDisplayTimerRef.current); };
  }, [queuedNpcMessages, isNpcThinking, addMessage]);

  const commonNpcActionPreamble = useCallback((): boolean => {
    if (npcs.length === 0 || isLoading || isNpcThinking || queuedNpcMessages.length > 0) return false;
    clearAllTimers();
    setIsNpcThinking(true);
    return true;
  }, [npcs, isLoading, isNpcThinking, queuedNpcMessages, clearAllTimers]);

  const handleNpcContinuation = useCallback(async () => {
    // console.log('[handleNpcContinuation] Attempting...');
    if (!commonNpcActionPreamble()) return;
    const currentMessagesSnapshot = [...messages];
    const llmChatHistory = buildLlmChatHistory(currentMessagesSnapshot);
    const recentMessagesForSelector = currentMessagesSnapshot.slice(-5).filter(m => !m.isLoading).map(m => ({ senderName: m.senderName, text: m.text }));
    try {
      const continuationResult = await generateNpcContinuation({ recentMessages: recentMessagesForSelector, npcProfiles: npcs.map(n => ({ name: n.name, profile: n.prompt })), llmChatHistory, contextSummary: currentContextSummary });
      const speakingNpc = npcs.find(n => n.name === continuationResult.npcName);
      if (!speakingNpc) throw new Error(`NPC ${continuationResult.npcName} not found.`);
      const leadingMsg: ChatMessage = { id: uuidv4(), text: continuationResult.continuationText, senderName: speakingNpc.name, senderType: 'npc', avatar: speakingNpc.avatar, avatarColor: speakingNpc.avatarColor, timestamp: Date.now(), isLoading: false };
      addMessage(leadingMsg, true);
      const historyAfterLeading = [...currentMessagesSnapshot, leadingMsg];
      const otherNpcs = npcs.filter(n => n.id !== speakingNpc.id).map(n => ({ name: n.name, profile: n.prompt }));
      if (otherNpcs.length > 0) {
        const collabResult = await collaborativeDiscussion({ userMessage: "", leadingNpcContribution: { npcName: speakingNpc.name, npcResponse: continuationResult.continuationText, npcPrompt: continuationResult.npcSystemPrompt || speakingNpc.prompt }, otherNpcProfiles: otherNpcs, llmChatHistory: buildLlmChatHistory(historyAfterLeading), contextSummary: currentContextSummary });
        const newQueued = collabResult.filter(c => !(c.npcName === speakingNpc.name && c.response === continuationResult.continuationText)).map((c, i) => { const n = npcs.find(npc => npc.name === c.npcName); return n ? { id: uuidv4(), text: c.response, senderName: n.name, senderType: 'npc' as 'npc', avatar: n.avatar, avatarColor: n.avatarColor, timestamp: Date.now() + (i * 10) + 1, isLoading: false } : null; }).filter(Boolean) as ChatMessage[];
        if (newQueued.length > 0) setQueuedNpcMessages(prev => [...prev, ...newQueued].sort((a, b) => a.timestamp - b.timestamp));
      }
      currentContinuationIntervalRef.current = Math.min(MAX_CONTINUATION_INTERVAL, currentContinuationIntervalRef.current + CONTINUATION_INTERVAL_INCREMENT);
    } catch (e) { console.error("[handleNpcContinuation] Error:", e); addMessage({ id: uuidv4(), text: `系统错误：NPC接续失败 (${e instanceof Error ? e.message : String(e)})`, senderName: "系统", senderType: 'system', avatar: AlertCircle, avatarColor: 'bg-destructive', timestamp: Date.now() }, true); }
    finally { setIsNpcThinking(false); }
  }, [npcs, messages, addMessage, currentContextSummary, commonNpcActionPreamble]);

  const handleUserReengagement = useCallback(async () => {
    // console.log('[handleUserReengagement] Attempting...');
    if (!commonNpcActionPreamble()) return;
    const currentMessagesSnapshot = [...messages];
    const llmChatHistory = buildLlmChatHistory(currentMessagesSnapshot);
    try {
      const reengagementResult = await generateUserReengagement({ npcProfiles: npcs.map(n => ({ name: n.name, profile: n.prompt })), llmChatHistory, contextSummary: currentContextSummary });
      const speakingNpc = npcs.find(n => n.name === reengagementResult.npcName);
      if (speakingNpc) addMessage({ id: uuidv4(), text: reengagementResult.reengagementText, senderName: speakingNpc.name, senderType: 'npc', avatar: speakingNpc.avatar, avatarColor: speakingNpc.avatarColor, timestamp: Date.now(), isLoading: false }, true);
      else console.warn(`[handleUserReengagement] NPC ${reengagementResult.npcName} not found.`);
    } catch (e) { console.error("[handleUserReengagement] Error:", e); addMessage({ id: uuidv4(), text: `系统错误：用户重入失败 (${e instanceof Error ? e.message : String(e)})`, senderName: "系统", senderType: 'system', avatar: AlertCircle, avatarColor: 'bg-destructive', timestamp: Date.now() }, true); }
    finally { setIsNpcThinking(false); }
  }, [npcs, messages, addMessage, currentContextSummary, commonNpcActionPreamble]);

  useEffect(() => { // Auto-Timers
    if (continuationTimerRef.current) clearTimeout(continuationTimerRef.current);
    if (reengagementTimerRef.current) clearTimeout(reengagementTimerRef.current);
    continuationTimerRef.current = null; reengagementTimerRef.current = null;
    if (npcs.length > 0 && !isLoading && !isNpcThinking && queuedNpcMessages.length === 0) {
      continuationTimerRef.current = setTimeout(handleNpcContinuation, currentContinuationIntervalRef.current);
      reengagementTimerRef.current = setTimeout(handleUserReengagement, REENGAGEMENT_TIMEOUT);
    }
    return () => { if (continuationTimerRef.current) clearTimeout(continuationTimerRef.current); if (reengagementTimerRef.current) clearTimeout(reengagementTimerRef.current); };
  }, [npcs.length, isLoading, isNpcThinking, queuedNpcMessages.length, handleNpcContinuation, handleUserReengagement, messages.length]);

  useEffect(() => { // Scroll
    if (scrollAreaRef.current) { const vp = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]'); if (vp) vp.scrollTop = vp.scrollHeight; }
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    // if (isLoading || isNpcThinking || queuedNpcMessages.length > 0) {
    //   console.warn("[handleSendMessage] System busy. Ignoring send.");
    //   toast({ title: "系统繁忙", description: "请等待当前操作完成后再试。", variant: "default" });
    //   return;
    // }
    if (npcs.length === 0) { toast({ title: "无可用NPC", description: "请先添加NPC。", variant: "destructive" }); return; }

    console.log(`[handleSendMessage] User: "${text.substring(0, 50)}..."`);
    clearAllTimers(); setQueuedNpcMessages([]); currentContinuationIntervalRef.current = INITIAL_CONTINUATION_INTERVAL;
    setIsLoading(true); setIsNpcThinking(true);

    let currentTurnMsgs = [...messages];
    const userMsg: ChatMessage = { id: uuidv4(), text, senderName: '用户', senderType: 'user', timestamp: Date.now(), isLoading: false };
    addMessage(userMsg, true); currentTurnMsgs.push(userMsg);
    
    let summaryForTurn = currentContextSummary;
    const summaryBatchIds = [...messageIdsForNextSummary, userMsg.id]; // Conceptual batch
    if (summaryBatchIds.length >= MESSAGES_PER_SUMMARY_UPDATE) {
      console.log(`[handleSendMessage] Summary threshold. Generating...`);
      const actualMsgsForSummary = summaryBatchIds.map(id => messages.find(m=>m.id===id) || (userMsg.id === id ? userMsg : null)).filter(Boolean) as ChatMessage[];
      try {
        const summary = await generateContextSummary({ previousSummary: currentContextSummary, messagesToSummarize: actualMsgsForSummary.map(m => ({ senderName: m.senderName, text: m.text })) });
        setCurrentContextSummary(summary); summaryForTurn = summary; setMessageIdsForNextSummary([]);
        const sysMsg: ChatMessage = { id: uuidv4(), text: `[系统提示：上下文已更新。焦点：${summary.substring(0,100)}${summary.length>100?'...':''}]`, senderName: "系统", senderType: 'system', avatar: Info, avatarColor: 'bg-blue-500', timestamp: Date.now(), isLoading: false };
        addMessage(sysMsg, true); currentTurnMsgs.push(sysMsg);
      } catch (e) { console.error("[handleSendMessage] Summary error:", e); const em: ChatMessage = {id:uuidv4(), text:`系统错误：更新上下文失败 (${e instanceof Error ? e.message:String(e)})`, senderName:"系统",senderType:'system',avatar:AlertCircle,avatarColor:'bg-destructive',timestamp:Date.now(),isLoading:false}; addMessage(em,true); currentTurnMsgs.push(em); }
    }

    let loadingNpcMsgId: string | null = null;
    let leadingNpcErrorDetails: { name: string } | null = null;
    try {
      const historyPrio = buildLlmChatHistory(currentTurnMsgs);
      const prioRes = await prioritizeNPCResponse({ userMessage: text, npcProfiles: npcs.map(n => ({ name: n.name, profile: n.prompt })), llmChatHistory: historyPrio, contextSummary: summaryForTurn });
      const leadingNpc = npcs.find(n => n.name === prioRes.leadingNpc);
      if (!leadingNpc) throw new Error(`NPC ${prioRes.leadingNpc} not found.`);
      leadingNpcErrorDetails = { name: leadingNpc.name };
      const loadingMsg: ChatMessage = { id: uuidv4(), text: '', senderName: leadingNpc.name, senderType: 'npc', avatar: leadingNpc.avatar, avatarColor: leadingNpc.avatarColor, isLoading: true, npcReasoning: prioRes.reasoning, timestamp: Date.now() };
      loadingNpcMsgId = loadingMsg.id; addMessage(loadingMsg, false);

      const historySingle = buildLlmChatHistory(currentTurnMsgs); // History BEFORE placeholder is final
      const responseText = await generateSingleNpcResponse({ npcName: leadingNpc.name, npcSystemPrompt: leadingNpc.prompt, userMessageText: text, llmChatHistory: historySingle, contextSummary: summaryForTurn });
      updateMessage(loadingNpcMsgId, { text: responseText, isLoading: false, timestamp: Date.now() });
      const finalLeadingMsg: ChatMessage = { ...loadingMsg, text: responseText, isLoading: false, timestamp: Date.now() }; // Use current timestamp
      currentTurnMsgs.push(finalLeadingMsg);

      const otherNpcs = npcs.filter(n => n.id !== leadingNpc.id).map(n => ({ name: n.name, profile: n.prompt }));
      if (otherNpcs.length > 0) {
        const historyCollab = buildLlmChatHistory(currentTurnMsgs); // History WITH final leading msg
        const collabRes = await collaborativeDiscussion({ userMessage: text, leadingNpcContribution: { npcName: leadingNpc.name, npcResponse: responseText, npcPrompt: leadingNpc.prompt }, otherNpcProfiles: otherNpcs, llmChatHistory: historyCollab, contextSummary: summaryForTurn });
        const newQueued = collabRes.filter(c => !(c.npcName === leadingNpc.name && c.response === responseText)).map((c, i) => { const n = npcs.find(npc => npc.name === c.npcName); return n ? { id: uuidv4(), text: c.response, senderName: n.name, senderType: 'npc' as 'npc', avatar: n.avatar, avatarColor: n.avatarColor, timestamp: Date.now() + (i * 10) + 1, isLoading: false } : null; }).filter(Boolean) as ChatMessage[];
        if (newQueued.length > 0) { newQueued.sort((a,b)=>a.timestamp-b.timestamp); setQueuedNpcMessages(prev => [...prev, ...newQueued]); }
      }
    } catch (e) { console.error("[handleSendMessage] Flow error:", e); const emsg = e instanceof Error ? e.message : String(e); if (loadingNpcMsgId && leadingNpcErrorDetails) updateMessage(loadingNpcMsgId, { text: `NPC ${leadingNpcErrorDetails.name} 回复出错: ${emsg}`, isLoading: false, senderName: "系统", senderType: 'system', avatar: AlertCircle, avatarColor: 'bg-destructive', timestamp: Date.now() }); else addMessage({ id: uuidv4(), text: `抱歉，AI处理出错: ${emsg}`, senderName: "系统", senderType: 'system', avatar: AlertCircle, avatarColor: 'bg-destructive', timestamp: Date.now() }, true); toast({ title: "AI错误", description: `发生错误: ${emsg}`, variant: "destructive" });
    } finally { setIsLoading(false); setIsNpcThinking(false); }
  };

  const shouldDisableSendButton = isLoading || isNpcThinking || queuedNpcMessages.length > 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {npcs.length === 0 && (
        <Alert variant="default" className="m-4 rounded-lg border-accent text-accent shadow-md">
          <AlertCircle className="h-5 w-5 text-accent" />
          <AlertTitle className="font-semibold text-accent">欢迎来到 NPC 聊天竞技场！</AlertTitle>
          <AlertDescription>尚未设置任何 NPC。请使用"管理 NPC"按钮添加角色开始聊天。</AlertDescription>
        </Alert>
      )}
      <ScrollArea className="flex-grow p-4 space-y-4" ref={scrollAreaRef}>
        {messages.map((msg) => (<MessageBubble key={msg.id} message={msg} />))}
        {(isLoading || isNpcThinking) && (messages.length === 0 || !messages[messages.length -1].isLoading) && (
          <div className="flex justify-center p-2"><p className="text-sm text-muted-foreground italic">
            {isNpcThinking ? "NPC 或系统正在思考中..." : (isLoading ? "正在处理您的消息..." : "")}
          </p></div>
        )}
        {queuedNpcMessages.length > 0 && !isNpcThinking && !isLoading && (messages.length === 0 || !messages[messages.length -1].isLoading) && (
          <div className="flex justify-center p-2"><p className="text-sm text-muted-foreground italic">正在展示后续回复...</p></div>
        )}
      </ScrollArea>
      <ChatInput
        onSendMessage={handleSendMessage}
        isSendDisabled={shouldDisableSendButton} // Updated prop name
        onStopConversations={() => {
          clearAllTimers(); setQueuedNpcMessages([]);
          setIsNpcThinking(false); setIsLoading(false);
          toast({ title: "自动对话已停止", description: "NPC将不再自动发言，队列已清空。" });
        }}
      />
    </div>
  );
}
// --- END OF FILE ChatInterface.tsx ---