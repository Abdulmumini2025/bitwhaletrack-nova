import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Save, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export const ProfilePage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      // Load profile data
      loadProfile();
    }
  }, [user, loading, navigate]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      // Get profile from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      setProfile({
        firstName: profileData?.first_name || "",
        lastName: profileData?.last_name || "",
        email: user.email || "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      // Update email in auth
      if (profile.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profile.email,
        });
        if (emailError) throw emailError;
      }

      // Update profile in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          first_name: profile.firstName,
          last_name: profile.lastName,
        });

      if (profileError) throw profileError;

      toast({
        title: "Success!",
        description: "Your profile has been updated successfully.",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-crypto-dark flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-crypto-dark">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-foreground">
                My Profile
              </h1>
              <p className="text-muted-foreground">
                Manage your account information
              </p>
            </div>
          </div>

          {/* Profile Form */}
          <Card className="glass-card border-crypto-blue/20">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-orbitron flex items-center">
                <User className="h-6 w-6 mr-2 text-crypto-blue" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-foreground">
                      First Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder="Enter your first name"
                        value={profile.firstName}
                        onChange={handleInputChange}
                        className="pl-10 glass"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-foreground">
                      Last Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder="Enter your last name"
                        value={profile.lastName}
                        onChange={handleInputChange}
                        className="pl-10 glass"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={profile.email}
                      onChange={handleInputChange}
                      className="pl-10 glass"
                      required
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You can update your email without verification
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full crypto-button"
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Updating..." : "Update Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};