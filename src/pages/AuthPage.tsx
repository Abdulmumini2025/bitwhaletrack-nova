import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bitcoin, Mail, Lock, User, Eye, EyeOff, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const AuthPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'password'>('email');
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    confirmPassword: "",
    newPassword: "",
    confirmNewPassword: "",
    otpCode: ""
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();

    // Remove any URL params related to password reset since we're using OTP flow
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'reset') {
      // Clear the URL and stay on normal auth page
      window.history.replaceState({}, document.title, "/auth");
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log("Sending password reset for:", formData.email);
      
      // Use resetPasswordForEmail which can be configured to send OTP codes
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        console.error("Password reset error:", error);
        throw error;
      }

      console.log("Password reset email sent successfully");

      toast({
        title: "Verification code sent!",
        description: "Please check your email for the 6-digit verification code. Note: You may need to configure email templates in Supabase dashboard.",
      });
      setResetStep('otp');
    } catch (error: any) {
      console.error("Failed to send reset email:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log("Verifying OTP:", formData.otpCode, "for email:", formData.email);
      
      // For password reset OTP, we use verifyOtp with type 'recovery'
      const { error } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: formData.otpCode,
        type: 'recovery' // Use recovery type for password reset
      });

      if (error) {
        console.error("OTP verification error:", error);
        throw error;
      }

      console.log("OTP verified successfully");

      toast({
        title: "Code verified!",
        description: "Please create your new password.",
      });
      setResetStep('password');
    } catch (error: any) {
      console.error("Failed to verify OTP:", error);
      toast({
        title: "Error",
        description: "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmNewPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password updated!",
        description: "Your password has been successfully reset.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
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
          <Bitcoin className="h-12 w-12 text-crypto-gold opacity-30 animate-pulse" />
        </div>
        <div className="floating-crypto absolute top-40 right-20 animation-delay-2000">
          <Bitcoin className="h-8 w-8 text-crypto-blue opacity-20 animate-bounce" />
        </div>
        <div className="floating-crypto absolute bottom-20 left-1/4 animation-delay-4000">
          <Bitcoin className="h-10 w-10 text-crypto-gold opacity-25 animate-pulse" />
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
            <h1 className="text-3xl font-orbitron font-bold text-foreground mb-2">
              Welcome to the Future
            </h1>
            <p className="text-muted-foreground">
              Join the crypto revolution with real-time news and insights
            </p>
          </div>

          {/* Auth Form */}
          <Card className="glass-card border-crypto-blue/20">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-orbitron text-center">
                {showForgotPassword ? "Reset Password" : "Account"}
              </CardTitle>
              <CardDescription className="text-center">
                {showForgotPassword 
                  ? (resetStep === 'email' ? "Enter your email to reset password" : resetStep === 'otp' ? "Enter the verification code sent to your email" : "Create your new password")
                  : "Choose your authentication method"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showForgotPassword ? (
                <div className="space-y-4">
                  {resetStep === 'email' && (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email" className="text-foreground">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="reset-email"
                            name="email"
                            type="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="pl-10 glass"
                            required
                          />
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full crypto-button"
                        disabled={isLoading}
                      >
                        {isLoading ? "Sending..." : "Send Verification Code"}
                      </Button>
                    </form>
                  )}

                  {resetStep === 'otp' && (
                    <form onSubmit={handleOtpVerification} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="otp-code" className="text-foreground">Verification Code</Label>
                        <Input
                          id="otp-code"
                          name="otpCode"
                          type="text"
                          placeholder="Enter 6-digit code"
                          value={formData.otpCode}
                          onChange={handleInputChange}
                          className="glass text-center text-lg font-mono"
                          maxLength={6}
                          required
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full crypto-button"
                        disabled={isLoading}
                      >
                        {isLoading ? "Verifying..." : "Verify Code"}
                      </Button>
                    </form>
                  )}

                  {resetStep === 'password' && (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-foreground">New Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="new-password"
                            name="newPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            value={formData.newPassword}
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
                      <div className="space-y-2">
                        <Label htmlFor="confirm-new-password" className="text-foreground">Confirm New Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="confirm-new-password"
                            name="confirmNewPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={formData.confirmNewPassword}
                            onChange={handleInputChange}
                            className="pl-10 glass"
                            required
                          />
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full crypto-button"
                        disabled={isLoading}
                      >
                        {isLoading ? "Updating..." : "Update Password"}
                      </Button>
                    </form>
                  )}
                  
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetStep('email');
                      }}
                      className="text-sm text-crypto-blue hover:text-crypto-gold transition-colors"
                    >
                      ← Back to Sign In
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Tabs defaultValue="signin" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 glass mb-6">
                      <TabsTrigger value="signin" className="crypto-tab">Sign In</TabsTrigger>
                      <TabsTrigger value="signup" className="crypto-tab">Sign Up</TabsTrigger>
                    </TabsList>

                    <TabsContent value="signin" className="space-y-4">
                      <form onSubmit={handleSignIn} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signin-email" className="text-foreground">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="signin-email"
                              name="email"
                              type="email"
                              placeholder="Enter your email"
                              value={formData.email}
                              onChange={handleInputChange}
                              className="pl-10 glass"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signin-password" className="text-foreground">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="signin-password"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
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
                          className="w-full crypto-button"
                          disabled={isLoading}
                        >
                          {isLoading ? "Signing In..." : "Sign In"}
                        </Button>

                        <div className="text-center mt-4">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-sm text-crypto-blue hover:text-crypto-gold transition-colors"
                          >
                            Forgot Password?
                          </Button>
                        </div>
                      </form>
                    </TabsContent>

                    <TabsContent value="signup" className="space-y-4">
                      <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName" className="text-foreground">First Name</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="firstName"
                                name="firstName"
                                type="text"
                                placeholder="First name"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                className="pl-10 glass"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-foreground">Last Name</Label>
                            <Input
                              id="lastName"
                              name="lastName"
                              type="text"
                              placeholder="Last name"
                              value={formData.lastName}
                              onChange={handleInputChange}
                              className="glass"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-email" className="text-foreground">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="signup-email"
                              name="email"
                              type="email"
                              placeholder="Enter your email"
                              value={formData.email}
                              onChange={handleInputChange}
                              className="pl-10 glass"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-password" className="text-foreground">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="signup-password"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a password"
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

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="confirmPassword"
                              name="confirmPassword"
                              type={showPassword ? "text" : "password"}
                              placeholder="Confirm your password"
                              value={formData.confirmPassword}
                              onChange={handleInputChange}
                              className="pl-10 glass"
                              required
                            />
                          </div>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full crypto-button"
                          disabled={isLoading}
                        >
                          {isLoading ? "Creating Account..." : "Create Account"}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-8 space-y-4">
                    <div className="text-center">
                      <Link to="/" className="text-sm text-crypto-blue hover:text-crypto-gold transition-colors block">
                        ← Back to Home
                      </Link>
                    </div>
                    
                    {/* Beautiful Admin Login Section */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-crypto-gold/20 to-crypto-blue/20 rounded-lg blur-sm"></div>
                      <div className="relative bg-gradient-to-r from-crypto-gold/10 to-crypto-blue/10 border border-crypto-gold/30 rounded-lg p-4">
                        <div className="text-center space-y-2">
                          <div className="flex items-center justify-center space-x-2">
                            <Shield className="h-5 w-5 text-crypto-gold" />
                            <span className="text-sm font-medium text-crypto-gold">Administrator Access</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Authorized personnel only
                          </p>
                          <Link 
                            to="/admin-login"
                            className="inline-flex items-center space-x-2 bg-gradient-to-r from-crypto-gold to-crypto-blue hover:from-crypto-gold/90 hover:to-crypto-blue/90 text-dark-bg font-medium py-2 px-4 rounded-md transition-all duration-200 transform hover:scale-105 crypto-glow text-sm"
                          >
                            <Shield className="h-4 w-4" />
                            <span>Admin Login</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};