export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  completed: boolean;
  category: 'work' | 'personal' | 'health' | 'other';
}

export interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  description?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    themeColor: string;
    layout: 'grid' | 'list';
    fontSize: 'sm' | 'base' | 'lg';
    notificationsEnabled: boolean;
    voiceEnabled: boolean;
  };
}

export interface UserInsight {
  id: string;
  userId: string;
  type: 'habit' | 'preference' | 'suggestion';
  content: string;
  confidence: number;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  expression?: 'neutral' | 'happy' | 'thinking' | 'surprised' | 'sad';
}
