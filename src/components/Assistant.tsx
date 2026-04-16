import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, User, Bot, Loader2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { RobotFace, Expression } from './RobotFace';
import { VoiceInput } from './VoiceInput';
import { processCommand } from '@/src/lib/gemini';
import { useTelegram } from '../lib/telegram';
import { 
  db, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  limit, 
  handleFirestoreError, 
  OperationType 
} from '@/src/lib/firebase';

interface AssistantProps {
  onAction: (action: string, data: any) => Promise<any>;
  context: any;
  initialCommand?: string;
  onClearInitialCommand?: () => void;
}

export const Assistant: React.FC<AssistantProps> = ({ onAction, context, initialCommand, onClearInitialCommand }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentExpression, setCurrentExpression] = useState<Expression>('neutral');
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processedCommandRef = useRef<string | null>(null);
  const { tg } = useTelegram();

  const speak = useCallback((text: string) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Remember if we were listening to resume later
    const wasListeningBeforeSpeech = isListening;
    if (wasListeningBeforeSpeech) setIsListening(false);

    const loadVoicesAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const viVoices = voices.filter(v => v.lang.includes('vi'));
      
      const viFemaleVoice = viVoices.find(v => 
        v.name.toLowerCase().includes('female') || 
        v.name.toLowerCase().includes('nữ') || 
        v.name.toLowerCase().includes('linh') ||
        v.name.toLowerCase().includes('mai')
      );
      
      const googleViVoice = viVoices.find(v => v.name.toLowerCase().includes('google'));
      
      if (viFemaleVoice) {
        utterance.voice = viFemaleVoice;
      } else if (googleViVoice) {
        utterance.voice = googleViVoice;
      } else if (viVoices.length > 0) {
        utterance.voice = viVoices[0];
      }

      utterance.lang = 'vi-VN';
      utterance.rate = 0.9;
      utterance.pitch = 1.2;
      
      utterance.onend = () => {
        // Auto-resume listening only if it was active before speech
        if (wasListeningBeforeSpeech) {
          setIsListening(true);
        }
      };

      utterance.onerror = () => {
        if (wasListeningBeforeSpeech) {
          setIsListening(true);
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        loadVoicesAndSpeak();
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else {
      loadVoicesAndSpeak();
    }
  }, [isVoiceEnabled, isListening, setIsListening]);

  // Speak welcome message on mount
  useEffect(() => {
    if (messages.length === 0 && isVoiceEnabled) {
      const welcomeText = 'Chào bạn! Tôi là Linh, trợ lý AI của bạn. Tôi có thể giúp gì cho bạn hôm nay?';
      // Small delay to ensure voices are loaded
      const timer = setTimeout(() => speak(welcomeText), 1000);
      return () => clearTimeout(timer);
    }
  }, [messages.length, isVoiceEnabled, speak]);

  // Firestore Messages Listener
  useEffect(() => {
    if (!context.userProfile?.uid) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('userId', '==', context.userProfile.uid),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: new Date(doc.data().timestamp)
      })) as ChatMessage[];
      
      if (data.length === 0) {
        setMessages([
          {
            id: 'welcome-message',
            role: 'assistant',
            content: 'Chào bạn! Tôi là Linh, trợ lý AI của bạn. Tôi có thể giúp gì cho bạn hôm nay?',
            timestamp: new Date(),
            expression: 'happy'
          }
        ]);
      } else {
        setMessages(data);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'messages'));

    return () => unsubscribe();
  }, [context.userProfile?.uid]);

  useEffect(() => {
    if (initialCommand && processedCommandRef.current !== initialCommand) {
      processedCommandRef.current = initialCommand;
      handleSend(initialCommand);
      onClearInitialCommand?.();
    }
  }, [initialCommand, onClearInitialCommand]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || !context.userProfile?.uid) return;

    const userMessageData = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      userId: context.userProfile.uid
    };

    try {
      await addDoc(collection(db, 'messages'), userMessageData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }

    setInput('');
    setIsLoading(true);
    setCurrentExpression('thinking');

    try {
      // Pass the last 10 messages as history for context
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const response = await processCommand(text, context, history);
      
      // Check for JSON action in response
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      let cleanResponse = response;
      let expression: Expression = 'neutral';
      
      if (jsonMatch) {
        try {
          const actionData = JSON.parse(jsonMatch[1]);
          if (actionData.action && actionData.action !== 'NONE') {
            const actionResult = await onAction(actionData.action, actionData.data);
            
            // If action returned data (like emails), Linh should process it
            if (actionData.action === 'CHECK_EMAILS' && actionResult && !actionResult.error) {
              const emailContext = `Dưới đây là danh sách email mới của người dùng: ${JSON.stringify(actionResult.messages)}. Hãy tóm tắt những email quan trọng nhất cho người dùng nhé.`;
              const secondResponse = await processCommand(emailContext, context, [...history, { role: 'user', content: text }, { role: 'assistant', content: cleanResponse }]);
              
              // Update cleanResponse with the summary
              const secondJsonMatch = secondResponse.match(/```json\n([\s\S]*?)\n```/);
              if (secondJsonMatch) {
                cleanResponse = secondResponse.replace(secondJsonMatch[0], '').trim();
              } else {
                cleanResponse = secondResponse;
              }
            }
          }
          if (actionData.expression) {
            expression = actionData.expression;
            setCurrentExpression(expression);
          }
          cleanResponse = response.replace(jsonMatch[0], '').trim();
        } catch (e) {
          console.error("Failed to parse action JSON", e);
        }
      }

      const assistantMessageData = {
        role: 'assistant',
        content: cleanResponse || "Mình đã thực hiện xong yêu cầu của bạn rồi nè!",
        timestamp: new Date().toISOString(),
        expression,
        userId: context.userProfile.uid
      };

      try {
        await addDoc(collection(db, 'messages'), assistantMessageData);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'messages');
      }

      speak(cleanResponse || "Mình đã thực hiện xong yêu cầu của bạn rồi nè!");
    } catch (error) {
      console.error("Error processing command:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full max-w-2xl mx-auto ${tg ? 'bg-transparent border-none' : 'bg-background/80 dark:bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-primary/10 shadow-2xl'} overflow-hidden`}>
      {!tg && (
        <div className="p-4 border-b border-primary/10 bg-primary/5 dark:bg-primary/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <RobotFace expression={currentExpression} size="md" className="text-primary" />
            <div>
              <h2 className="text-sm font-bold">Linh AI</h2>
              <p className="text-[10px] text-muted-foreground flex items-center">
                {isListening ? (
                  <>
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1 animate-pulse" />
                    Đang lắng nghe liên tục...
                  </>
                ) : (
                  "Trợ lý cá nhân thông minh"
                )}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={`rounded-full ${isVoiceEnabled ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1 p-4 min-h-0" ref={scrollRef}>
        <div className="space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`shrink-0 mt-1`}>
                    {msg.role === 'user' ? (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                    ) : (
                      <RobotFace expression={msg.expression || 'neutral'} size="sm" className="text-primary" />
                    )}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative group ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-muted/80 dark:bg-zinc-900/80 text-foreground dark:text-zinc-100 rounded-tl-none border border-black/5 dark:border-white/10'
                  }`}>
                    {msg.content}
                    {msg.role === 'assistant' && (
                      <button 
                        onClick={() => speak(msg.content)}
                        className="absolute -right-8 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                        title="Nghe lại"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-3 bg-muted/50 dark:bg-zinc-900/50 p-4 rounded-2xl rounded-tl-none border border-black/5 dark:border-white/10">
                <RobotFace expression="thinking" size="sm" className="text-primary" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-primary animate-pulse">Linh đang suy nghĩ...</span>
                  <div className="flex space-x-1 mt-1">
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-primary rounded-full" />
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-primary rounded-full" />
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-primary rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 bg-background dark:bg-zinc-950 border-t border-primary/10 flex items-center space-x-2">
        <VoiceInput 
          onTranscript={(text) => handleSend(text)} 
          isListening={isListening} 
          setIsListening={setIsListening} 
        />
        <div className="flex-1 relative">
          <Input
            placeholder="Nhập yêu cầu của bạn..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            className="pr-10 rounded-full bg-muted/50 dark:bg-zinc-900/50 border-none focus-visible:ring-1 text-foreground"
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8"
            onClick={() => handleSend(input)}
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
