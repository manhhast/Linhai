import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, LogIn, Mail, Lock, User as UserIcon, ArrowRight, Chrome, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  signInAnonymously
} from '../lib/firebase';
import { toast } from 'sonner';
import { useTelegram } from '../lib/telegram';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { tg, user: tgUser } = useTelegram();

  const handleTelegramLogin = async () => {
    if (!tgUser) return;
    setIsLoading(true);
    try {
      // In a real TWA, you'd verify initData on your backend.
      // For this applet, we'll sign in anonymously and link the display name.
      const userCredential = await signInAnonymously(auth);
      await updateProfile(userCredential.user, { 
        displayName: tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : '')
      });
      toast.success(`Chào mừng ${tgUser.first_name} từ Telegram!`);
      onLoginSuccess();
    } catch (error) {
      console.error("Telegram logic login error:", error);
      toast.error("Đăng nhập Telegram thất bại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Đăng nhập bằng Google thành công!");
      onLoginSuccess();
    } catch (error: any) {
      console.error("Google login error:", error);
      if (error.code === 'auth/popup-blocked') {
        toast.error("Trình duyệt đã chặn cửa sổ đăng nhập. Vui lòng cho phép popup.");
      } else {
        toast.error("Đăng nhập Google thất bại. Vui lòng thử lại.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Đăng nhập thành công!");
      onLoginSuccess();
    } catch (error: any) {
      console.error("Email login error:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error("Email hoặc mật khẩu không chính xác.");
      } else {
        toast.error("Đăng nhập thất bại. Vui lòng thử lại.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      toast.error("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      toast.success("Đăng ký tài khoản thành công!");
      onLoginSuccess();
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error("Email này đã được sử dụng.");
      } else {
        toast.error("Đăng ký thất bại. Vui lòng thử lại.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-10 space-y-8 w-full max-w-md mx-auto"
    >
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.2)]">
          <Sparkles className="w-10 h-10 text-primary" style={{ color: 'var(--primary)' }} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Chào mừng đến với Linh AI</h2>
          <p className="text-muted-foreground">
            Trợ lý cá nhân thông minh giúp bạn tối ưu hóa cuộc sống.
          </p>
        </div>
      </div>

      <Card className="w-full bg-card/50 backdrop-blur-xl border-white/5 shadow-2xl">
        <Tabs defaultValue="login" className="w-full">
          <CardHeader>
            <TabsList className="grid w-full grid-cols-2 bg-muted/20">
              <TabsTrigger value="login">Đăng nhập</TabsTrigger>
              <TabsTrigger value="signup">Đăng ký</TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <CardContent>
            <TabsContent value="login" className="space-y-4 mt-0">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="email" 
                      placeholder="Email của bạn" 
                      className="pl-10 bg-background/50 border-white/10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="password" 
                      placeholder="Mật khẩu" 
                      className="pl-10 bg-background/50 border-white/10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full rounded-xl h-11 font-medium" 
                  disabled={isLoading}
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {isLoading ? "Đang xử lý..." : "Đăng nhập"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-0">
              <form onSubmit={handleEmailSignup} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Tên của bạn" 
                      className="pl-10 bg-background/50 border-white/10"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="email" 
                      placeholder="Email" 
                      className="pl-10 bg-background/50 border-white/10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="password" 
                      placeholder="Mật khẩu (ít nhất 6 ký tự)" 
                      className="pl-10 bg-background/50 border-white/10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full rounded-xl h-11 font-medium" 
                  disabled={isLoading}
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {isLoading ? "Đang tạo tài khoản..." : "Đăng ký ngay"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Hoặc tiếp tục với</span>
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              {tg && tgUser && (
                <Button 
                  className="w-full rounded-xl h-11 bg-[#229ED9] hover:bg-[#1c86ba] text-white" 
                  onClick={handleTelegramLogin}
                  disabled={isLoading}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Đăng nhập nhanh với Telegram
                </Button>
              )}

              <Button 
                variant="outline" 
                className="w-full rounded-xl h-11 border-white/10 bg-background/50 hover:bg-white/5" 
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <Chrome className="mr-2 h-4 w-4" />
                Google
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <p className="text-xs text-center text-muted-foreground">
              Bằng cách tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.
            </p>
          </CardFooter>
        </Tabs>
      </Card>
    </motion.div>
  );
};
