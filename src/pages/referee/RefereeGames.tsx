import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockRefereeGames } from '@/data/mockData';
import { Calendar, MapPin, Clock, MessageCircle, X, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const RefereeGames = () => {
  const handleDropOut = (gameId: string) => {
    toast.info('Drop out request submitted. You will be notified once a replacement is found.');
  };

  const handleChat = (gameId: string) => {
    toast.info('Opening team chat...');
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="My Assigned Games"
        description="View and manage your upcoming referee assignments"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {mockRefereeGames.map((game, index) => (
          <Card
            key={game.id}
            variant="elevated"
            className="animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-gold">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {game.homeTeam}
                      <span className="text-muted-foreground mx-2 font-normal">vs</span>
                      {game.awayTeam}
                    </CardTitle>
                    <CardDescription>League Match</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-gold/10 text-gold border-gold/30">
                  Assigned
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {format(game.date, 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{game.time}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{game.venue}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleChat(game.id)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Team Chat
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleDropOut(game.id)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Drop Out
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockRefereeGames.length === 0 && (
        <Card variant="elevated">
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">No upcoming games</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check the availability schedule to sign up for games
            </p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default RefereeGames;
