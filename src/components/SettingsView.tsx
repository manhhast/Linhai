import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Palette, Layout, Type as TypeIcon, Globe, Calendar, Mail, CheckCircle2, Bell, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/src/types';
import { useTelegram } from '../lib/telegram';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

interface SettingsProps {
  profile: UserProfile | null;
  onUpdate: (updates: Partial<UserProfile['preferences']>) => void;
}

export const SettingsView: React.FC<SettingsProps> = ({ profile, onUpdate }) => {
  const { tg, user: tgUser } = useTelegram();
  if (!profile) return null;

  const handleUpdate = (key: keyof UserProfile['preferences'], value: any) => {
    onUpdate({ [key]: value });
    toast.success("Đã cập nhật cài đặt!");
  };

  return (
    <div className="space-y-6 pb-20">
      <Card className="bg-card/50 dark:bg-zinc-900/50 border-white/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Palette className="w-5 h-5 mr-2 text-primary" />
            Giao diện & Hiển thị
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Chủ đề</label>
              <Select 
                value={profile.preferences.theme} 
                onValueChange={(v) => handleUpdate('theme', v)}
              >
                <SelectTrigger className="bg-background/50 border-white/10">
                  <SelectValue placeholder="Chọn chủ đề" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Sáng</SelectItem>
                  <SelectItem value="dark">Tối</SelectItem>
                  <SelectItem value="system">Hệ thống</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Màu chủ đạo</label>
              <div className="flex space-x-2">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(color => (
                  <button
                    key={color}
                    onClick={() => handleUpdate('themeColor', color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      profile.preferences.themeColor === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center">
                <Layout className="w-4 h-4 mr-2" />
                Bố cục Dashboard
              </label>
              <Select 
                value={profile.preferences.layout} 
                onValueChange={(v) => handleUpdate('layout', v)}
              >
                <SelectTrigger className="bg-background/50 border-white/10">
                  <SelectValue placeholder="Chọn bố cục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Dạng lưới (Grid)</SelectItem>
                  <SelectItem value="list">Dạng danh sách (List)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center">
                <TypeIcon className="w-4 h-4 mr-2" />
                Kích thước phông chữ
              </label>
              <Select 
                value={profile.preferences.fontSize} 
                onValueChange={(v) => handleUpdate('fontSize', v)}
              >
                <SelectTrigger className="bg-background/50 border-white/10">
                  <SelectValue placeholder="Chọn kích thước" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Nhỏ</SelectItem>
                  <SelectItem value="base">Vừa</SelectItem>
                  <SelectItem value="lg">Lớn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 dark:bg-zinc-900/50 border-white/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Bell className="w-5 h-5 mr-2 text-primary" />
            Thông báo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Thông báo đẩy</label>
              <p className="text-xs text-muted-foreground">Nhận thông báo về sự kiện và việc cần làm trên điện thoại.</p>
            </div>
            <Button 
              variant={profile.preferences.notificationsEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => handleUpdate('notificationsEnabled', !profile.preferences.notificationsEnabled)}
            >
              {profile.preferences.notificationsEnabled ? "Đang bật" : "Đang tắt"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 dark:bg-zinc-900/50 border-white/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-primary" />
            Quyền riêng tư & Bảo mật
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Dữ liệu của bạn được mã hóa và chỉ lưu trữ cục bộ hoặc trên đám mây bảo mật của bạn. 
            Linh không chia sẻ thông tin cá nhân với bên thứ ba.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Button variant="link" className="text-xs p-0 h-auto text-primary">Xem chính sách bảo mật</Button>
            <Button variant="link" className="text-xs p-0 h-auto text-destructive">Xóa tất cả dữ liệu</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
