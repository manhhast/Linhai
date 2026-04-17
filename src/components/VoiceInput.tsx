import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const playFeedbackSound = (type: 'start' | 'stop') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'start' ? 523.25 : 440, ctx.currentTime); // C5 or A4
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // Ignore audio errors
    }
  };

  const toggleListening = useCallback(async () => {
    if (!recognitionRef.current) {
      toast.error("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.");
      return;
    }
    
    if (isListening) {
      playFeedbackSound('stop');
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

        playFeedbackSound('start');
        setIsListening(true);
        toast.info("Linh đang lắng nghe bạn nè...");
      } catch (e) {
        console.error("Speech recognition start error:", e);
      }
    }
  }, [isListening, setIsListening]);

  if (!isSupported) return null;

  return (
    <div className="pointer-events-none">
      {isListening && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center space-y-4">
          {/* Animated audio waves */}
          <div className="flex items-center space-x-1 h-12">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full animate-[bounce_1s_infinite]"
                style={{ 
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.1}s`,
                  opacity: 0.4 + (Math.random() * 0.6)
                }}
              />
            ))}
          </div>

          {interimTranscript && (
            <div
              className="bg-primary/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-primary/30 shadow-2xl flex items-center space-x-3"
            >
              <div 
                 className="w-2 h-2 bg-primary rounded-full animate-pulse"
              />
              <p className="text-sm text-primary font-bold italic">
                "{interimTranscript}..."
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
