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
  status: 'pending' | 'approved' | 'rejected';
  author_id: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading users:', error);
    } else {
      setUsers(data || []);
    }
  };

  const loadNews = async () => {
    const { data, error } = await supabase
      .from('news')
      .select(`
        *,
        profiles!inner (first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading news:', error);
    } else {
      setNews((data || []) as any);
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

          <TabsContent value="users" className="space-y-6">
            {userRole === 'super_admin' && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="text-primary">Admin Management</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    As a Super Admin, you can promote users to Admin role to help manage the platform.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 p-3 bg-primary/5 rounded-lg">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Admin Privileges Include:</p>
                      <p className="text-xs text-muted-foreground">
                        Moderate news, manage users, view messages, and approve content
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {userRole === 'super_admin' ? 
                    'Manage user roles and permissions. Click "Make Admin" to promote users.' :
                    'View and manage user accounts.'
                  }
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{user.first_name} {user.last_name}</h3>
                          {user.role === 'super_admin' && (
                            <Badge className="bg-gradient-primary text-white">Super Admin</Badge>
                          )}
                          {user.role === 'admin' && (
                            <Badge variant="secondary">Admin</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Role: {user.role} | Joined: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                        {user.is_blocked && (
                          <Badge variant="destructive" className="mt-1">Blocked</Badge>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {userRole === 'super_admin' && user.role !== 'super_admin' && (
                          <>
                            <Button
                              size="sm"
                              variant={user.role === 'admin' ? "destructive" : "default"}
                              onClick={() => updateUserRole(user.user_id, user.role === 'admin' ? 'user' : 'admin')}
                              className={user.role !== 'admin' ? "bg-primary hover:bg-primary/90" : ""}
                            >
                              {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant={user.is_blocked ? "default" : "destructive"}
                          onClick={() => toggleUserBlock(user.user_id, user.is_blocked)}
                        >
                          {user.is_blocked ? 'Unblock' : 'Block'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="news" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>News Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {news.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          By: {item.profiles?.first_name || 'Unknown'} {item.profiles?.last_name || 'User'} | 
                          Category: {item.category} | 
                          Status: {item.status}
                        </p>
                        <Badge 
                          variant={
                            item.status === 'approved' ? 'default' : 
                            item.status === 'pending' ? 'secondary' : 'destructive'
                          }
                          className="mt-1"
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <div className="flex space-x-2">
                        {item.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateNewsStatus(item.id, 'approved')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateNewsStatus(item.id, 'rejected')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteNews(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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