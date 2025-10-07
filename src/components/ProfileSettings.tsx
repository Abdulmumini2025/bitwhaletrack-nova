import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save } from "lucide-react";

export const ProfileSettings = () => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState({
    username: "",
    first_name: "",
    last_name: "",
    bio: "",
    avatar_url: "",
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUser(user);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          username: data.username || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleUpdate = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: profile.username,
          first_name: profile.first_name,
          last_name: profile.last_name,
          bio: profile.bio,
        })
        .eq("user_id", currentUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("user_id", currentUser.id);

      if (updateError) throw updateError;

      setProfile((prev) => ({ ...prev, avatar_url: data.publicUrl }));

      toast({
        title: "Success",
        description: "Avatar updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    return `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 glass-card">
      <h2 className="text-2xl font-orbitron font-bold mb-6 text-gradient">
        Profile Settings
      </h2>

      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
          </Avatar>
          <div>
            <Label
              htmlFor="avatar-upload"
              className="cursor-pointer inline-flex items-center space-x-2 glass px-4 py-2 rounded-lg hover:crypto-glow transition-all"
            >
              <Camera className="h-4 w-4" />
              <span>Change Avatar</span>
            </Label>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG or GIF (MAX. 5MB)
            </p>
          </div>
        </div>

        {/* Username */}
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            placeholder="Enter your username"
            value={profile.username}
            onChange={(e) =>
              setProfile((prev) => ({ ...prev, username: e.target.value }))
            }
            className="glass mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            This is your unique identifier. Others can search for you using this.
          </p>
        </div>

        {/* First Name */}
        <div>
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            placeholder="Enter your first name"
            value={profile.first_name}
            onChange={(e) =>
              setProfile((prev) => ({ ...prev, first_name: e.target.value }))
            }
            className="glass mt-2"
          />
        </div>

        {/* Last Name */}
        <div>
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            placeholder="Enter your last name"
            value={profile.last_name}
            onChange={(e) =>
              setProfile((prev) => ({ ...prev, last_name: e.target.value }))
            }
            className="glass mt-2"
          />
        </div>

        {/* Bio */}
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell us about yourself..."
            value={profile.bio}
            onChange={(e) =>
              setProfile((prev) => ({ ...prev, bio: e.target.value }))
            }
            className="glass mt-2 min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Brief description for your profile.
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleUpdate}
          disabled={loading || uploading}
          className="w-full crypto-glow"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
};
