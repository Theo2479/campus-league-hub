import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Handshake, Calendar, Clock, MapPin, User, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

interface FriendlyPost {
  id: number;
  team_id: number;
  team_name: string;
  captain_name: string;
  preferred_date: string;
  preferred_time: string;
  venue_preference: string;
  notes: string;
  status: string;
  created_at: string;
}

const FriendlyMarket = () => {
  const [posts, setPosts] = useState<FriendlyPost[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchPosts = async () => {
    try {
      const res = await apiFetch('/api/captain/friendlies');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      toast.error('Failed to load friendly posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePostAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const dateInput = (form.querySelector('#date') as HTMLInputElement).value;
    const timeInput = (form.querySelector('#time') as HTMLInputElement).value;
    const venueInput = (form.querySelector('#venue') as HTMLInputElement).value;
    const notesInput = (form.querySelector('#notes') as HTMLInputElement).value;

    try {
      const res = await apiFetch('/api/captain/friendlies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateInput,
          time: timeInput,
          venue: venueInput || 'Flexible',
          notes: notesInput || ''
        })
      });

      if (res.ok) {
        toast.success('Your availability has been posted to the market!');
        setIsDialogOpen(false);
        fetchPosts();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create post');
      }
    } catch (err) {
      toast.error('Failed to create post');
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      const res = await apiFetch(`/api/captain/friendlies/${postId}`, {
        method: 'DELETE'
        
      });
      if (res.ok) {
        toast.success('Post removed');
        fetchPosts();
      } else {
        toast.error('Failed to delete post');
      }
    } catch (err) {
      toast.error('Failed to delete post');
    }
  };

  const handleContactTeam = async (postId: number) => {
    try {
      const res = await apiFetch(`/api/captain/friendlies/${postId}/contact`, {
        method: 'POST'
        
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Chat created! Check your messages.');
        fetchPosts();
      } else {
        toast.error(data.error || 'Failed to contact team');
      }
    } catch (err) {
      toast.error('Failed to contact team');
    }
  };

  const isOwnPost = (post: FriendlyPost) => {
    return user?.team_id === post.team_id;
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Friendly Market"
        description="Find teams for practice matches or post your availability"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gold">
                <Plus className="h-4 w-4 mr-2" />
                Post Availability
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Post Match Availability</DialogTitle>
                <DialogDescription>
                  Let other teams know when you're available for a friendly match
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePostAvailability}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Preferred Date</Label>
                    <Input id="date" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Preferred Time</Label>
                    <Input id="time" type="time" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue Preference</Label>
                    <Input id="venue" placeholder="e.g., Any, Home only, Away OK" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Input id="notes" placeholder="e.g., Looking for competitive match" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gold">
                    Post Availability
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, index) => (
          <Card
            key={post.id}
            variant="elevated"
            className="animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/20 text-gold">
                  <Handshake className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{post.team_name}</CardTitle>
                  <CardDescription>
                    Posted {format(new Date(post.created_at), 'MMM d, h:mm a')}
                  </CardDescription>
                </div>
                {isOwnPost(post) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeletePost(post.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {format(new Date(post.preferred_date + 'T00:00:00'), 'EEEE, MMMM d')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{post.preferred_time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{post.venue_preference || 'Flexible'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{post.captain_name}</span>
                </div>
                {post.notes && (
                  <p className="text-sm text-muted-foreground italic mt-2">"{post.notes}"</p>
                )}
              </div>
              {isOwnPost(post) ? (
                <Button variant="outline" className="w-full" disabled>
                  Your Post
                </Button>
              ) : post.status === 'matched' ? (
                <Button variant="outline" className="w-full" disabled>
                  Already Matched
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleContactTeam(post.id)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Contact Team
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && posts.length === 0 && (
        <Card variant="elevated">
          <CardContent className="p-12 text-center">
            <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">No teams available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to post your availability!
            </p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default FriendlyMarket;
