import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, isListening, setIsListening }) => {
  const recognitionRef = React.useRef<any>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = 'vi-VN';
      recog.maxAlternatives = 3;

      recog.onresult = (event: any) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          onTranscript(finalTranscript);
          setInterimTranscript('');
        } else {
          setInterimTranscript(currentInterim);
        }
      };

      recog.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'aborted') return;
        if (event.error === 'not-allowed') {
          toast.error("Quyền truy cập micro bị từ chối. Bạn hãy kiểm tra cài đặt trình duyệt nhé!");
        }
        setIsListening(false);
      };

      recog.onend = () => {
        // Only restart if the state still says we should be listening
        if (isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Probably already started or blocked
            console.warn("Auto-restart failed:", e);
          }
        }
      };

      recognitionRef.current = recog;
      setIsSupported(true);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript, isListening, setIsListening]);

  // React to isListening prop changes (e.g. from Assistant.tsx)
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Ignore already started errors
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors
      }
    }
  }, [isListening]);

  const toggleListening = useCallback(async () => {
    if (!recognitionRef.current) {
      toast.error("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.");
      return;
    }
    
    if (isListening) {
      setIsListening(false);
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (err: any) {
            console.warn("Microphone pre-check warning:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              toast.error("Bạn cần cấp quyền truy cập micro để sử dụng tính năng này.");
              return;
            }
          }
        }

        setIsListening(true);
        toast.info("Linh đang lắng nghe bạn nè...");
      } catch (e) {
        console.error("Speech recognition start error:", e);
      }
    }
  }, [isListening, setIsListening]);

  if (!isSupported) return null;

  return (
    <div className="relative flex items-center">
      <AnimatePresence>
        {isListening && interimTranscript && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-14 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-primary/20 shadow-xl whitespace-nowrap z-50"
          >
            <p className="text-xs text-primary font-medium italic">
              {interimTranscript}...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        variant={isListening ? "destructive" : "secondary"}
        size="icon"
        className={`rounded-full w-12 h-12 shadow-lg transition-all duration-300 ${isListening ? 'scale-110 ring-4 ring-destructive/20' : ''}`}
        onClick={toggleListening}
        title={isListening ? "Dừng lắng nghe" : "Nhấn để nói (Chế độ liên tục)"}
      >
        {isListening ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            <MicOff className="w-6 h-6" />
          </motion.div>
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </Button>
      
      <AnimatePresence>
        {isListening && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0.2 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 bg-primary rounded-full -z-10"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 2, opacity: 0.1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 }}
              className="absolute inset-0 bg-primary rounded-full -z-10"
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
