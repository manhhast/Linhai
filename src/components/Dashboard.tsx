import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Reminder, Event } from '@/src/types';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Bell, CheckCircle2, Circle, Plus, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DashboardProps {
  reminders: Reminder[];
  events: Event[];
  onToggleReminder: (id: string) => void;
  onAction: (command: string) => void;
  layout?: 'grid' | 'list';
}

export const Dashboard: React.FC<DashboardProps> = ({ reminders, events, onToggleReminder, onAction, layout = 'grid' }) => {
  const upcomingEvents = events
    .filter(e => e.startTime > new Date())
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, 3);

  const pendingReminders = reminders
    .filter(r => !r.completed)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5);

  const containerClass = layout === 'grid' 
    ? "grid gap-6 md:grid-cols-2" 
    : "flex flex-col gap-6";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Thêm nhắc nhở', icon: Bell, color: 'text-blue-400', command: 'Thêm một nhắc nhở mới' },
          { label: 'Lên lịch họp', icon: CalendarIcon, color: 'text-green-400', command: 'Lên lịch một cuộc họp mới' },
          { label: 'Tóm tắt ngày', icon: Zap, color: 'text-yellow-400', command: 'Tóm tắt lịch trình ngày hôm nay của mình' },
          { label: 'Tùy chỉnh AI', icon: Plus, color: 'text-purple-400', command: 'Mình muốn tùy chỉnh cài đặt AI' },
        ].map((action) => (
          <Button 
            key={action.label} 
            variant="outline" 
            onClick={() => onAction(action.command)}
            className="h-24 flex flex-col items-center justify-center space-y-2 bg-card/30 border-white/5 hover:bg-primary/10 hover:border-primary/30 transition-all"
          >
            <action.icon className={`w-6 h-6 ${action.color}`} />
            <span className="text-[10px] font-medium uppercase tracking-wider">{action.label}</span>
          </Button>
        ))}
      </div>

      <div className={containerClass}>
        <Card className="bg-card/50 dark:bg-zinc-900/50 backdrop-blur-sm border-primary/10 dark:border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Sự kiện sắp tới</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Không có sự kiện nào sắp tới.</p>
              ) : (
                upcomingEvents.map((event, idx) => (
                  <div key={event.id || `event-${idx}`} className="flex flex-col space-y-1">
                    <span className="text-sm font-semibold">{event.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(event.startTime, 'HH:mm, dd/MM/yyyy')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 dark:bg-zinc-900/50 backdrop-blur-sm border-primary/10 dark:border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Việc cần làm</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingReminders.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Tất cả đã hoàn thành!</p>
              ) : (
                pendingReminders.map((reminder, idx) => (
                  <div 
                    key={reminder.id || `reminder-${idx}`} 
                    className="flex items-center space-x-3 cursor-pointer group"
                    onClick={() => onToggleReminder(reminder.id)}
                  >
                    {reminder.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <div className="flex flex-col">
                      <span className={`text-sm ${reminder.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                        {reminder.title}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">
                          {format(reminder.dueDate, 'dd/MM')}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {reminder.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
