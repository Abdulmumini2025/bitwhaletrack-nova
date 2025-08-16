import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bitcoin, Mail, Lock, Eye, EyeOff, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const AdminLoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }
    };
    checkUser();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Check if user is admin after login
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
          toast({
            title: "Admin Login Successful!",
            description: "Welcome to the admin dashboard.",
          });
          navigate("/admin");
        } else {
          toast({
            title: "Access Denied",
            description: "Administrator credentials required.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
        }
      }
    } catch (error: any) {
      toast({
        title: "Admin Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-crypto-dark relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="floating-crypto absolute top-20 left-10">
          <Shield className="h-12 w-12 text-crypto-gold opacity-30 animate-pulse" />
        </div>
        <div className="floating-crypto absolute top-40 right-20 animation-delay-2000">
          <Bitcoin className="h-8 w-8 text-crypto-blue opacity-20 animate-bounce" />
        </div>
        <div className="floating-crypto absolute bottom-20 left-1/4 animation-delay-4000">
          <Shield className="h-10 w-10 text-crypto-gold opacity-25 animate-pulse" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-2 group mb-6">
              <Bitcoin className="h-10 w-10 text-crypto-blue crypto-glow" />
              <span className="text-2xl font-orbitron font-bold text-gradient">
                Bitwhaletrack
              </span>
            </Link>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Shield className="h-8 w-8 text-crypto-gold" />
              <h1 className="text-3xl font-orbitron font-bold text-foreground">
                Admin Portal
              </h1>
            </div>
            <p className="text-muted-foreground">
              Secure administrator access only
            </p>
          </div>

          {/* Admin Login Form */}
          <Card className="glass-card border-crypto-gold/20">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-orbitron text-center flex items-center justify-center space-x-2">
                <Shield className="h-6 w-6 text-crypto-gold" />
                <span>Administrator Login</span>
              </CardTitle>
              <CardDescription className="text-center">
                Enter your administrator credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email" className="text-foreground">Admin Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="admin-email"
                      name="email"
                      type="email"
                      placeholder="Enter admin email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10 glass"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-foreground">Admin Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="admin-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter admin password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 pr-10 glass"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full crypto-button bg-crypto-gold hover:bg-crypto-gold/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Authenticating..." : "Access Admin Dashboard"}
                </Button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <Link to="/auth" className="text-sm text-crypto-blue hover:text-crypto-gold transition-colors block">
                  ← Back to User Login
                </Link>
                <Link to="/" className="text-xs text-muted-foreground hover:text-crypto-blue transition-colors block">
                  Return to Home
                </Link>
              </div>

              <div className="mt-6 p-3 bg-crypto-gold/10 rounded-lg border border-crypto-gold/20">
                <p className="text-xs text-center text-muted-foreground">
                  <Shield className="h-4 w-4 inline mr-1" />
                  Restricted Access - Authorized Personnel Only
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};