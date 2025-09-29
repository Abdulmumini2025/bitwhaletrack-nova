import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, MessageSquare, Shield, Eye, Trash2, Check, X } from 'lucide-react';
import { AdminNewsForm } from '@/components/AdminNewsForm';

interface User {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  role: 'user' | 'admin' | 'super_admin';
  is_blocked: boolean;
  created_at: string;
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  image_url?: string;
  author_id: string;
  status: 'pending' | 'approved' | 'rejected';
  is_breaking: boolean;
  created_at: string;
  updated_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    role: string;
  } | null;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const AdminPage = () => {
  const [createAdminEmail, setCreateAdminEmail] = useState("");
  const [createAdminPassword, setCreateAdminPassword] = useState("");
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setUserRole(profile.role);
      await Promise.all([loadUsers(), loadNews(), loadMessages()]);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      console.error('Exception loading users:', err);
      setUsers([]);
    }
  };

  const loadNews = async () => {
    try {
      // First get all news
      const { data: newsData, error: newsError } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (newsError) {
        console.error('Error loading news:', newsError);
        setNews([]);
        return;
      }
      
      if (!newsData || newsData.length === 0) {
        setNews([]);
        return;
      }
      
      // Get unique author IDs
      const authorIds = [...new Set(newsData.map(n => n.author_id))];
      
      // Get profiles for these authors
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, role')
        .in('user_id', authorIds);
      
      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      }
      
      // Create a map of user_id to profile
      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );
      
      // Merge news with profiles
      const newsWithProfiles = newsData.map(news => ({
        ...news,
        profiles: profilesMap.get(news.author_id) || null
      }));
      
      setNews(newsWithProfiles as NewsItem[]);
      
    } catch (err) {
      console.error('Exception loading news:', err);
      setNews([]);
    }
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading messages:', error);
    } else {
      setMessages(data || []);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin' | 'super_admin') => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    } else {
      const actionText = newRole === 'admin' ? 'promoted to Admin' : 
                        newRole === 'super_admin' ? 'promoted to Super Admin' : 'demoted to User';
      toast({
        title: "Role Updated",
        description: `User successfully ${actionText}.`,
      });
      await loadUsers(); // Refresh the user list
    }
  };

  const toggleUserBlock = async (userId: string, isBlocked: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: !isBlocked })
      .eq('user_id', userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update user status.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `User ${!isBlocked ? 'blocked' : 'unblocked'} successfully.`,
      });
      loadUsers();
    }
  };

  const createAdminAccount = async () => {
    if (!createAdminEmail) {
      toast({ title: "Email required", description: "Please enter an email.", variant: "destructive" });
      return;
    }
    setIsCreatingAdmin(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // Pass the current session JWT for role check in the function
          'authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
        },
        body: JSON.stringify({ email: createAdminEmail, password: createAdminPassword || undefined, role: 'admin' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create admin');
      toast({ title: 'Admin created', description: `Invited: ${createAdminEmail}` });
      setCreateAdminEmail("");
      setCreateAdminPassword("");
      await loadUsers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const updateNewsStatus = async (newsId: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('news')
      .update({ status })
      .eq('id', newsId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update news status.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `News ${status} successfully.`,
      });
      loadNews();
    }
  };

  const deleteNews = async (newsId: string) => {
    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', newsId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete news.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "News deleted successfully.",
      });
      loadNews();
    }
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete message.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Message deleted successfully.",
      });
      loadMessages();
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    const { error } = await supabase
      .from('contact_messages')
      .update({ is_read: true })
      .eq('id', messageId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to mark message as read.",
        variant: "destructive",
      });
    } else {
      loadMessages();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <Badge variant="secondary" className="text-sm">
            {userRole === 'super_admin' ? 'Super Admin' : 'Admin'}
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
            <TabsTrigger value="post">Post News</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending News</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {news.filter(n => n.status === 'pending').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {messages.filter(m => !m.is_read).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Admins</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users.filter(u => ['admin', 'super_admin'].includes(u.role)).length}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-8">
            {userRole === 'super_admin' && (
              <Card className="glass-card border-crypto-blue/30 bg-gradient-to-r from-crypto-blue/10 to-crypto-gold/5">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-gradient-primary">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl bg-gradient-primary bg-clip-text text-transparent">
                        Admin Management Center
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Empower trusted users with administrative privileges
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">User Management</p>
                        <p className="text-xs text-muted-foreground">Role assignments</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Content Moderation</p>
                        <p className="text-xs text-muted-foreground">News approval</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Communication</p>
                        <p className="text-xs text-muted-foreground">Message handling</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="glass-card">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
                      User Management
                    </CardTitle>
                    <p className="text-muted-foreground mt-1">
                      {userRole === 'super_admin' ? 
                        'Manage user roles, permissions, and account status' :
                        'View and moderate user accounts'
                      }
                    </p>
                  </div>
                  <Badge variant="outline" className="border-crypto-blue/30 text-crypto-blue">
                    {users.length} Total Users
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {userRole === 'super_admin' && (
                  <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center">
                          <Shield className="h-3 w-3 text-white" />
                        </div>
                        <h4 className="font-semibold text-lg">Create New Admin</h4>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                          <input
                            type="email"
                            placeholder="Enter admin email"
                            value={createAdminEmail}
                            onChange={(e) => setCreateAdminEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Temporary Password</label>
                          <input
                            type="password"
                            placeholder="Optional password"
                            value={createAdminPassword}
                            onChange={(e) => setCreateAdminPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <p className="text-xs text-muted-foreground">
                          💡 If password is omitted, the user will receive an email invitation to set their password
                        </p>
                        <Button 
                          onClick={createAdminAccount} 
                          disabled={isCreatingAdmin}
                          className="bg-gradient-primary hover:opacity-90 transition-opacity px-6"
                        >
                          {isCreatingAdmin ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Creating...
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Create Admin
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">All Users</h3>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-gradient-primary"></div>
                        <span>Admins: {users.filter(u => ['admin', 'super_admin'].includes(u.role)).length}</span>
                      </div>
                      <div className="w-px h-4 bg-border"></div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-destructive"></div>
                        <span>Blocked: {users.filter(u => u.is_blocked).length}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-4">
                    {users.map((user) => (
                      <Card key={user.id} className={`transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 ${user.is_blocked ? 'opacity-75 border-destructive/30' : 'hover:border-primary/30'}`}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              {/* User Avatar */}
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${
                                user.role === 'super_admin' ? 'bg-gradient-primary' :
                                user.role === 'admin' ? 'bg-gradient-to-r from-secondary to-primary' :
                                'bg-gradient-to-r from-muted-foreground to-muted-foreground/80'
                              }`}>
                                {user.first_name?.charAt(0)?.toUpperCase() || '?'}{user.last_name?.charAt(0)?.toUpperCase() || ''}
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex items-center space-x-3">
                                  <h3 className="font-semibold text-lg">{user.first_name} {user.last_name}</h3>
                                  
                                  {user.role === 'super_admin' && (
                                    <Badge className="bg-gradient-primary text-white border-0 shadow-md">
                                      <Shield className="h-3 w-3 mr-1" />
                                      Super Admin
                                    </Badge>
                                  )}
                                  {user.role === 'admin' && (
                                    <Badge variant="secondary" className="border-primary/30 text-primary bg-primary/10">
                                      <Shield className="h-3 w-3 mr-1" />
                                      Admin
                                    </Badge>
                                  )}
                                  {user.role === 'user' && (
                                    <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                                      User
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <span>Joined {new Date(user.created_at).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}</span>
                                  <div className="w-px h-4 bg-border"></div>
                                  <span className="capitalize">{user.role.replace('_', ' ')}</span>
                                </div>
                                
                                {user.is_blocked && (
                                  <Badge variant="destructive" className="mt-2">
                                    <X className="h-3 w-3 mr-1" />
                                    Account Blocked
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {userRole === 'super_admin' && user.role !== 'super_admin' && (
                                <Button
                                  size="sm"
                                  variant={user.role === 'admin' ? "destructive" : "default"}
                                  onClick={() => updateUserRole(user.user_id, user.role === 'admin' ? 'user' : 'admin')}
                                  className={user.role !== 'admin' ? "bg-gradient-primary hover:opacity-90 text-white border-0" : ""}
                                >
                                  <Shield className="h-3 w-3 mr-1" />
                                  {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant={user.is_blocked ? "default" : "destructive"}
                                onClick={() => toggleUserBlock(user.user_id, user.is_blocked)}
                                className={user.is_blocked ? "bg-green-600 hover:bg-green-700 text-white border-0" : ""}
                              >
                                {user.is_blocked ? (
                                  <>
                                    <Check className="h-3 w-3 mr-1" />
                                    Unblock
                                  </>
                                ) : (
                                  <>
                                    <X className="h-3 w-3 mr-1" />
                                    Block
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="news" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>News Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  All submitted news is automatically approved. You can reject articles if they violate community guidelines.
                </p>
              </CardHeader>
              <CardContent>
                {news.length === 0 ? (
                  <div className="text-center py-8">
                    <h3 className="text-lg font-semibold mb-2">No news articles found</h3>
                    <p className="text-muted-foreground">No news articles have been submitted yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {news.map((item) => (
                      <div key={item.id} className="flex items-start justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{item.title}</h3>
                            {item.is_breaking && (
                              <Badge variant="destructive" className="text-xs">
                                BREAKING
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {item.content?.substring(0, 100)}...
                          </p>
                          <p className="text-sm text-muted-foreground">
                            By: {(() => {
                              if (!item.profiles) return 'Unknown User';
                              const role = item.profiles.role;
                              if (role === 'super_admin') return 'Super Admin';
                              if (role === 'admin') return 'Admin';
                              return item.profiles.first_name; // Regular user - first name only
                            })()} | 
                            Category: {item.category.replace(/_/g, ' ')} | 
                            Status: <Badge 
                              variant={item.status === 'approved' ? 'default' : 'destructive'}
                              className="ml-1"
                            >
                              {item.status}
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          {item.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateNewsStatus(item.id, 'rejected')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject Post
                            </Button>
                          )}
                          {item.status === 'rejected' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateNewsStatus(item.id, 'approved')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Restore Post
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="post" className="space-y-6">
            <AdminNewsForm onSuccess={loadNews} />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`p-4 border rounded-lg ${!message.is_read ? 'bg-muted/50' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{message.name}</h3>
                      <div className="flex items-center space-x-2">
                        {!message.is_read && (
                          <Badge variant="secondary">New</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markMessageAsRead(message.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {userRole === 'super_admin' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMessage(message.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{message.email}</p>
                      <p className="text-sm">{message.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};