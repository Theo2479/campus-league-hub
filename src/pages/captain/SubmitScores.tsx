import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mockCaptainGames, mockTeamStats } from '@/data/mockData';
import { FileText, Trophy, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const SubmitScores = () => {
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  // For demo, we'll pretend there's a recent game to submit
  const pendingGames = mockCaptainGames.filter(g => g.status === 'scheduled').slice(0, 1);
  const completedGames = mockCaptainGames.filter(g => g.status === 'completed');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeScore || !awayScore) {
      toast.error('Please enter both scores');
      return;
    }
    toast.success('Score submitted successfully! Awaiting confirmation from the other captain.');
    setHomeScore('');
    setAwayScore('');
    setSelectedGame(null);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Submit Match Scores"
        description="Enter the final score for completed matches"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score Submission Form */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gold" />
              Submit Score
            </CardTitle>
            <CardDescription>
              Enter the final score. Both captains must submit matching scores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingGames.length > 0 ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="font-semibold text-foreground">
                    {pendingGames[0].homeTeam} vs {pendingGames[0].awayTeam}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(pendingGames[0].date, 'EEEE, MMMM d')} at {pendingGames[0].time}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="home-score" className="text-center block">
                      {pendingGames[0].homeTeam}
                    </Label>
                    <Input
                      id="home-score"
                      type="number"
                      min="0"
                      max="99"
                      value={homeScore}
                      onChange={e => setHomeScore(e.target.value)}
                      className="text-center text-2xl font-bold h-16"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center justify-center h-16">
                    <span className="text-2xl font-bold text-muted-foreground">-</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="away-score" className="text-center block">
                      {pendingGames[0].awayTeam}
                    </Label>
                    <Input
                      id="away-score"
                      type="number"
                      min="0"
                      max="99"
                      value={awayScore}
                      onChange={e => setAwayScore(e.target.value)}
                      className="text-center text-2xl font-bold h-16"
                      placeholder="0"
                    />
                  </div>
                </div>

                <Button type="submit" variant="gold" className="w-full" size="lg">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Score
                </Button>
              </form>
            ) : (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground">No pending matches</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Score submission will be available after your next match
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gold" />
              Recent Results
            </CardTitle>
            <CardDescription>Your team's confirmed match results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {completedGames.map(game => (
              <Card key={game.id} variant="default" className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {game.homeTeam}{' '}
                        <span className="text-gold text-xl">{game.homeScore}</span>
                        <span className="text-muted-foreground mx-2">-</span>
                        <span className="text-gold text-xl">{game.awayScore}</span>{' '}
                        {game.awayTeam}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {format(game.date, 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/30">
                      Confirmed
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SubmitScores;
