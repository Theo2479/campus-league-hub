import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockCaptainGames, mockTeamStats, Game } from '@/data/mockData';
import { Calendar, Clock, MapPin, Trophy } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CaptainFixtures = () => {
  const upcomingGames = mockCaptainGames.filter(g => g.status === 'scheduled');
  const completedGames = mockCaptainGames.filter(g => g.status === 'completed');

  const getActionButton = (game: Game) => {
    const hoursUntil = differenceInHours(game.date, new Date());

    if (hoursUntil > 72) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast.info('Postponement request submitted for review')}
        >
          <Clock className="h-4 w-4 mr-1" />
          Request Postponement
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={() => toast.warning('Forfeit submitted. You will receive a 0-3 loss.')}
      >
        Forfeit Match
      </Button>
    );
  };

  const GameCard = ({ game, showActions = false }: { game: Game; showActions?: boolean }) => (
    <Card variant="elevated" className="animate-fade-in">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-gold">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {game.homeTeam === mockTeamStats.teamName ? (
                  <>
                    <span className="text-gold">{game.homeTeam}</span>
                    {game.status === 'completed' && (
                      <span className="mx-2">{game.homeScore}</span>
                    )}
                    <span className="text-muted-foreground mx-2">-</span>
                    {game.status === 'completed' && (
                      <span className="mx-2">{game.awayScore}</span>
                    )}
                    {game.awayTeam}
                  </>
                ) : (
                  <>
                    {game.homeTeam}
                    {game.status === 'completed' && (
                      <span className="mx-2">{game.homeScore}</span>
                    )}
                    <span className="text-muted-foreground mx-2">-</span>
                    {game.status === 'completed' && (
                      <span className="mx-2">{game.awayScore}</span>
                    )}
                    <span className="text-gold">{game.awayTeam}</span>
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(game.date, 'MMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {game.time}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {game.venue}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={game.homeTeam === mockTeamStats.teamName ? 'default' : 'secondary'}>
              {game.homeTeam === mockTeamStats.teamName ? 'Home' : 'Away'}
            </Badge>
            {showActions && getActionButton(game)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Season Fixtures"
        description={`${mockTeamStats.teamName} - Full season schedule`}
      />

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming ({upcomingGames.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedGames.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingGames.map(game => (
            <GameCard key={game.id} game={game} showActions />
          ))}
          {upcomingGames.length === 0 && (
            <Card variant="elevated">
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground">No upcoming fixtures</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back later for new scheduled matches
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedGames.map(game => (
            <GameCard key={game.id} game={game} />
          ))}
          {completedGames.length === 0 && (
            <Card variant="elevated">
              <CardContent className="p-12 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground">No completed matches</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your match history will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default CaptainFixtures;
