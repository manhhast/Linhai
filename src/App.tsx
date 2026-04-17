import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dashboard } from './components/Dashboard';
import { Assistant } from './components/Assistant';
import { SettingsView } from './components/SettingsView';
import { Login } from '@/src/components/Login';
import { Reminder, Event, UserProfile, UserInsight, ChatMessage } from './types';
import { LayoutDashboard, MessageSquare, Settings, ShieldCheck, Sparkles, LogIn, LogOut, User, Brain } from 'lucide-react';
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  handleFirestoreError,
  OperationType
} from './lib/firebase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { generateUserInsights } from './lib/learning';
import { getApiUrl } from './lib/config';
import { NotificationService } from './lib/notifications';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [insights, setInsights] = useState<UserInsight[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingCommand, setPendingCommand] = useState<string | undefined>(undefined);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName,
            photoURL: currentUser.photoURL,
            preferences: { 
              theme: 'dark', 
              themeColor: '#3b82f6',
              layout: 'grid',
              fontSize: 'base',
              notificationsEnabled: true, 
              voiceEnabled: true 
            }
          }, { merge: true });
        } catch (error) {
          console.error("Error setting user profile:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Request Notification Permissions
  useEffect(() => {
    if (user) {
      NotificationService.requestPermissions();
    }
  }, [user]);

  // Notification Scheduler
  useEffect(() => {
    if (!user || !userProfile?.preferences.notificationsEnabled) return;

    const syncNotifications = async () => {
      await NotificationService.cancelAll();
      
      const now = new Date();
      let notificationId = 1;

      // Schedule Reminders
      reminders.forEach(reminder => {
        if (!reminder.completed && reminder.dueDate > now) {
          NotificationService.scheduleNotification(
            notificationId++,
            "Nhắc nhở từ Linh",
            reminder.title,
            reminder.dueDate
          );
        }
      });

      // Schedule Events
      events.forEach(event => {
        if (event.startTime > now) {
          NotificationService.scheduleNotification(
            notificationId++,
            "Sự kiện sắp tới",
            event.title,
            event.startTime
          );
        }
      });
    };

    syncNotifications();
  }, [reminders, events, user, userProfile?.preferences.notificationsEnabled]);

  // Data Listeners
  useEffect(() => {
    if (!user || !isAuthReady) {
      setReminders([]);
      setEvents([]);
      setInsights([]);
      return;
    }

    const remindersQuery = query(collection(db, 'reminders'), where('userId', '==', user.uid));
    const unsubscribeReminders = onSnapshot(remindersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        ...doc.data(), 
        id: doc.id,
        dueDate: new Date(doc.data().dueDate)
      })) as Reminder[];
      setReminders(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reminders'));

    const eventsQuery = query(collection(db, 'events'), where('userId', '==', user.uid));
    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        ...doc.data(), 
        id: doc.id,
        startTime: new Date(doc.data().startTime),
        endTime: new Date(doc.data().endTime)
      })) as Event[];
      setEvents(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'events'));

    const insightsQuery = query(collection(db, 'insights'), where('userId', '==', user.uid));
    const unsubscribeInsights = onSnapshot(insightsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        ...doc.data(), 
        id: doc.id,
        createdAt: new Date(doc.data().createdAt)
      })) as UserInsight[];
      setInsights(data);
    });

    const userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data() as UserProfile);
      }
    });

    // Messages with fallback
    let currentMessagesUnsubscribe: (() => void) | null = null;
    const setupMessagesListener = (isFallback = false) => {
      const q = isFallback 
        ? query(collection(db, 'messages'), where('userId', '==', user.uid), limit(100))
        : query(collection(db, 'messages'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'), limit(50));

      const unsubscribe = onSnapshot(q, (snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({
          ...doc.data(),
          id: doc.id,
          timestamp: new Date(doc.data().timestamp)
        })) as ChatMessage[];
        
        const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setMessages(sortedData);
      }, (error: any) => {
        console.error(`Firestore messages listener error in App (fallback: ${isFallback}):`, error);
        if (!isFallback && error?.message?.toLowerCase().includes('index')) {
          if (currentMessagesUnsubscribe) currentMessagesUnsubscribe();
          currentMessagesUnsubscribe = setupMessagesListener(true);
        }
      });
      return unsubscribe;
    };

    currentMessagesUnsubscribe = setupMessagesListener();

    return () => {
      unsubscribeReminders();
      unsubscribeEvents();
      unsubscribeInsights();
      if (currentMessagesUnsubscribe) currentMessagesUnsubscribe();
      userUnsubscribe();
    };
  }, [user, isAuthReady]);

  // Learning trigger
  const lastAnalysisTimeRef = React.useRef<number>(0);
  const lastMessagesCountRef = React.useRef<number>(0);
  const lastRemindersCountRef = React.useRef<number>(0);

  useEffect(() => {
    if (!user || reminders.length === 0) return;
    
    const analyze = async () => {
      const now = Date.now();
      // Only analyze once every 30 minutes to save resources
      if (now - lastAnalysisTimeRef.current < 1800000) return;
      
      // Only analyze if there's a significant change (at least 5 new messages or any change in reminders)
      const messageDiff = messages.length - lastMessagesCountRef.current;
      const reminderDiff = reminders.length !== lastRemindersCountRef.current;
      
      if (messageDiff < 5 && !reminderDiff && lastAnalysisTimeRef.current !== 0) return;

      console.log("Linh is learning from your habits...");
      lastAnalysisTimeRef.current = now;
      lastMessagesCountRef.current = messages.length;
      lastRemindersCountRef.current = reminders.length;
      
      try {
        const chatHistoryStrings = messages.slice(-15).map(m => `${m.role === 'user' ? 'User' : 'Linh'}: ${m.content}`);
        const newInsights = await generateUserInsights(user.uid, reminders, events, chatHistoryStrings);
        
        for (const insight of newInsights) {
          if (insight.confidence && insight.confidence > 0.8) {
            const isDuplicate = insights.some(existing => 
              existing.content.toLowerCase().includes(insight.content!.toLowerCase()) ||
              insight.content!.toLowerCase().includes(existing.content.toLowerCase())
            );

            if (!isDuplicate) {
              await addDoc(collection(db, 'insights'), {
                ...insight,
                userId: user.uid,
                createdAt: new Date().toISOString()
              });

              if (activeTab === 'assistant') {
                setPendingCommand(`Linh ơi, bạn vừa nhận ra một điều thú vị về mình: "${insight.content}". Hãy chia sẻ điều này với mình một cách ấm áp và đặt một câu hỏi liên quan nhé!`);
              }
            }
          }
        }
      } catch (err) {
        console.error("Analysis period error:", err);
      }
    };

    // Debounce to avoid constant updates
    const timer = setTimeout(analyze, 15000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [user, reminders.length, events.length, messages.length]);



  const handleUpdateProfile = async (updates: Partial<UserProfile['preferences']>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        preferences: { ...userProfile?.preferences, ...updates }
      });
    } catch (error) {
      console.error("Profile update error:", error);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Đăng nhập thành công!");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Đăng nhập thất bại.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Đã đăng xuất.");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleAction = async (action: string, data: any): Promise<any> => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để thực hiện tác vụ này.");
      return null;
    }

    try {
      switch (action) {
        case 'CREATE_REMINDER':
          const reminderRef = await addDoc(collection(db, 'reminders'), {
            title: data.title || 'Nhắc nhở mới',
            dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : new Date(Date.now() + 3600000).toISOString(),
            completed: false,
            category: data.category || 'other',
            userId: user.uid,
            createdAt: new Date().toISOString()
          });
          toast.success(`Đã tạo nhắc nhở: ${data.title}`);
          return { id: reminderRef.id };
        case 'CREATE_EVENT':
          const eventRef = await addDoc(collection(db, 'events'), {
            title: data.title || 'Sự kiện mới',
            startTime: data.startTime ? new Date(data.startTime).toISOString() : new Date(Date.now() + 3600000).toISOString(),
            endTime: data.endTime ? new Date(data.endTime).toISOString() : new Date(Date.now() + 7200000).toISOString(),
            userId: user.uid,
            createdAt: new Date().toISOString()
          });
          toast.success(`Đã lên lịch: ${data.title}`);
          return { id: eventRef.id };
        default:
          console.log("Action not handled:", action, data);
          return null;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, action);
      return null;
    }
  };

  const toggleReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    
    try {
      await updateDoc(doc(db, 'reminders', id), {
        completed: !reminder.completed
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reminders/${id}`);
    }
  };

  const handleDashboardAction = (command: string) => {
    setPendingCommand(command);
    setActiveTab('assistant');
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  const themeStyles = {
    '--primary': userProfile?.preferences.themeColor || '#3b82f6',
    fontSize: userProfile?.preferences.fontSize === 'sm' ? '14px' : userProfile?.preferences.fontSize === 'lg' ? '18px' : '16px',
  } as React.CSSProperties;

  return (
    <div 
      className={`h-screen flex flex-col ${userProfile?.preferences.theme === 'light' ? 'bg-white text-black' : 'dark bg-[#050505] text-white'} font-sans selection:bg-primary/30 overflow-hidden`}
      style={themeStyles}
    >
      <div className="max-w-4xl w-full mx-auto px-4 md:px-8 py-4 flex flex-col h-full overflow-hidden">
        <header className="flex items-center justify-between shrink-0 mb-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3"
          >
            <div 
              className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary),0.3)]"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Linh AI</h1>
              <p className="text-xs text-muted-foreground">Trợ lý cá nhân thông minh</p>
            </div>
          </motion.div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex px-3 py-1 rounded-full bg-primary/10 border border-primary/20 items-center space-x-2">
              <ShieldCheck className="w-3 h-3 text-primary" style={{ color: 'var(--primary)' }} />
              <span className="text-[10px] font-medium text-primary uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Bảo mật riêng tư</span>
            </div>
            
            {user && (
              <div className="flex items-center space-x-3">
                <Avatar className="w-8 h-8 border border-white/10">
                  <AvatarImage src={user.photoURL} />
                  <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-white">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </header>

        {!user ? (
          <Login onLoginSuccess={() => setActiveTab('dashboard')} />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3 bg-muted/20 p-1 rounded-xl border border-white/5 shrink-0">
              <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Tổng quan</span>
              </TabsTrigger>
              <TabsTrigger value="assistant" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <MessageSquare className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Trợ lý</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Cài đặt</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent key="tab-dashboard" value="dashboard" className="mt-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {insights.length > 0 && (
                <div className="mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-start space-x-3">
                  <Brain className="w-5 h-5 text-primary shrink-0 mt-1" style={{ color: 'var(--primary)' }} />
                  <div>
                    <h4 className="text-sm font-bold text-primary" style={{ color: 'var(--primary)' }}>Gợi ý từ Linh</h4>
                    <p className="text-xs text-muted-foreground">{insights[insights.length - 1].content}</p>
                  </div>
                </div>
              )}
              <Dashboard 
                reminders={reminders} 
                events={events} 
                onToggleReminder={toggleReminder} 
                onAction={handleDashboardAction}
                layout={userProfile?.preferences.layout}
              />
            </TabsContent>

            <TabsContent key="tab-assistant" value="assistant" className="mt-6 flex-1 overflow-hidden">
              <Assistant 
                onAction={handleAction} 
                context={{ reminders, events, userProfile, insights }} 
                initialCommand={pendingCommand}
                onClearInitialCommand={() => setPendingCommand(undefined)}
                isActive={activeTab === 'assistant'}
              />
            </TabsContent>

            <TabsContent key="tab-settings" value="settings" className="mt-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <SettingsView 
                profile={userProfile} 
                onUpdate={handleUpdateProfile}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
      <Toaster position="top-center" theme="dark" />
    </div>
  );
}
