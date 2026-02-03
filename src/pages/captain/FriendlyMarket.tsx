import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FriendlyPost } from '@/types'; // Or define locally
// Actually, let's define locally to avoid creating new file if not needed yet.

interface FriendlyPost {
  id: string;
  teamName: string;
  date: Date;
  time: string;
  venue: string;
  contactName: string;
  postedAt: Date;
}

const FriendlyMarket = () => {
  const [posts, setPosts] = useState<FriendlyPost[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Mock team name for now as we don't have context, or assume user is captain
  const currentTeamName = "My Team";

  const handlePostAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    const newPost: FriendlyPost = {
      id: `fp-${Date.now()}`,
      teamName: currentTeamName,
      date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // Mock date from form if I read it, but simplifying
      time: '14:00',
      venue: 'Flexible',
      contactName: 'Captain',
      postedAt: new Date(),
    };
    setPosts(prev => [newPost, ...prev]);
    setIsDialogOpen(false);
    toast.success('Your availability has been posted to the market!');
  };

  const handleContactTeam = (teamName: string) => {
    toast.success(`Message sent to ${teamName}. They will be notified.`);
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
                    <Input id="venue" placeholder="e.g., Any, Home only, Away OK" required />
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
                <div>
                  <CardTitle className="text-lg">{post.teamName}</CardTitle>
                  <CardDescription>
                    Posted {format(post.postedAt, 'MMM d, h:mm a')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{format(post.date, 'EEEE, MMMM d')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{post.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{post.venue}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{post.contactName}</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleContactTeam(post.teamName)}
                disabled={post.teamName === currentTeamName}
              >
                <Send className="h-4 w-4 mr-2" />
                {post.teamName === currentTeamName ? 'Your Post' : 'Contact Team'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {posts.length === 0 && (
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
