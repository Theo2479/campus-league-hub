import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockCaptainGames, mockTeamStats, mockFriendlyPosts, Game } from '@/data/mockData';
import { Trophy, Target, Calendar, Clock, Handshake, ArrowRight, CheckCircle } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const CaptainDashboard = () => {
  const upcomingGames = mockCaptainGames.filter(g => g.status === 'scheduled').slice(0, 3);
  const recentResults = mockCaptainGames.filter(g => g.status === 'completed').slice(0, 2);

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

  return (
    <DashboardLayout>
      <PageHeader
        title="Team Dashboard"
        description={`Managing ${mockTeamStats.teamName}`}
      />

      {/* Team Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          label="League Position"
          value={`#${mockTeamStats.position}`}
          icon={<Trophy className="h-6 w-6" />}
        />
        <StatCard
          label="Points"
          value={mockTeamStats.points}
          icon={<Target className="h-6 w-6" />}
        />
        <StatCard
          label="Goal Difference"
          value={`+${mockTeamStats.goalsFor - mockTeamStats.goalsAgainst}`}
          icon={<Target className="h-6 w-6" />}
        />
        <StatCard
          label="Form"
          value={`${mockTeamStats.won}W ${mockTeamStats.drawn}D ${mockTeamStats.lost}L`}
          icon={<CheckCircle className="h-6 w-6" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Fixtures */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gold" />
              Upcoming Fixtures
            </CardTitle>
            <CardDescription>
              Manage your upcoming matches. Request postponement if more than 72h away.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingGames.map(game => (
              <Card key={game.id} variant="default" className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {game.homeTeam === mockTeamStats.teamName ? (
                            <>
                              <span className="text-gold">{game.homeTeam}</span>
                              <span className="text-muted-foreground mx-2">vs</span>
                              {game.awayTeam}
                            </>
                          ) : (
                            <>
                              {game.homeTeam}
                              <span className="text-muted-foreground mx-2">vs</span>
                              <span className="text-gold">{game.awayTeam}</span>
                            </>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(game.date, 'EEEE, MMMM d')} at {game.time}
                        </p>
                        <p className="text-sm text-muted-foreground">{game.venue}</p>
                      </div>
                      <Badge variant={game.homeTeam === mockTeamStats.teamName ? 'default' : 'secondary'}>
                        {game.homeTeam === mockTeamStats.teamName ? 'Home' : 'Away'}
                      </Badge>
                    </div>
                    <div className="flex justify-end">
                      {getActionButton(game)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Recent Results */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gold" />
              Recent Results
            </CardTitle>
            <CardDescription>Your team's recent match results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentResults.map(game => (
              <Card key={game.id} variant="default" className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {game.homeTeam} {game.homeScore} - {game.awayScore} {game.awayTeam}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(game.date, 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <Badge
                      variant={
                        (game.homeTeam === mockTeamStats.teamName && (game.homeScore ?? 0) > (game.awayScore ?? 0)) ||
                        (game.awayTeam === mockTeamStats.teamName && (game.awayScore ?? 0) > (game.homeScore ?? 0))
                          ? 'default'
                          : game.homeScore === game.awayScore
                          ? 'secondary'
                          : 'destructive'
                      }
                      className={
                        (game.homeTeam === mockTeamStats.teamName && (game.homeScore ?? 0) > (game.awayScore ?? 0)) ||
                        (game.awayTeam === mockTeamStats.teamName && (game.awayScore ?? 0) > (game.homeScore ?? 0))
                          ? 'bg-success'
                          : ''
                      }
                    >
                      {(game.homeTeam === mockTeamStats.teamName && (game.homeScore ?? 0) > (game.awayScore ?? 0)) ||
                      (game.awayTeam === mockTeamStats.teamName && (game.awayScore ?? 0) > (game.homeScore ?? 0))
                        ? 'Won'
                        : game.homeScore === game.awayScore
                        ? 'Draw'
                        : 'Lost'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Friendly Market Preview */}
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5 text-gold" />
                Friendly Market
              </CardTitle>
              <CardDescription>Teams looking for friendly matches</CardDescription>
            </div>
            <Button variant="gold" onClick={() => toast.success('Your availability has been posted!')}>
              Post Availability
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {mockFriendlyPosts.map(post => (
                <Card key={post.id} variant="gold" className="animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{post.teamName}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(post.date, 'EEEE, MMMM d')} at {post.time}
                        </p>
                        <p className="text-sm text-muted-foreground">{post.venue}</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Contact: {post.contactName}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CaptainDashboard;
