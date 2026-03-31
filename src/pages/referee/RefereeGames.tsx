import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, X, Trophy, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScoreSubmissionDialog } from '@/components/referee/ScoreSubmissionDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';

// Define types matching the API response
interface Game {
  id: number;
  home_team: string; // Adjusted to match API
  away_team: string;
  date: string;
  time: string;
  venue: string;
  status: string;
  home_score?: number;
  away_score?: number;
}

const RefereeGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false);

  // Dropout confirmation state
  const [dropoutGameId, setDropoutGameId] = useState<number | null>(null);
  const [showDropoutConfirm, setShowDropoutConfirm] = useState(false);

  const fetchGames = async () => {
    try {
      const response = await apiFetch('/api/referee/my-games');
      if (response.ok) {
        const data = await response.json();
        // The API returns { assigned: [], interested: [] }
        // We want to show 'assigned' games here primarily
        setGames(data.assigned);
      }
    } catch (error) {
      console.error('Failed to fetch games', error);
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleDropOut = (gameId: number) => {
    setDropoutGameId(gameId);
    setShowDropoutConfirm(true);
  };

  const confirmDropOut = async () => {
    if (!dropoutGameId) return;

    try {
      const res = await apiFetch(`/api/referee/games/${dropoutGameId}/dropout`, {
        method: 'POST'

      });

      if (res.ok) {
        toast.success('You have dropped out of the game. Notification sent.');
        fetchGames();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to drop out');
      }
    } catch (e) {
      toast.error('Error processing request');
    } finally {
      setShowDropoutConfirm(false);
      setDropoutGameId(null);
    }
  };

  const openScoreDialog = (game: Game) => {
    setSelectedGame(game);
    setIsScoreDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="My Assigned Games"
        description="View and manage your upcoming referee assignments"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {games.map((game, index) => (
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
                      {game.home_team}
                      <span className="text-muted-foreground mx-2 font-normal">vs</span>
                      {game.away_team}
                    </CardTitle>
                    <CardDescription>League Match testing 123</CardDescription>
                  </div>
                </div>
                {game.status === 'cancelled' ? (
                  <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">
                    Cancelled
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-gold/10 text-gold border-gold/30">
                    {game.status === 'completed' ? 'Completed' : 'Assigned'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {format(new Date(game.date), 'EEEE, MMMM d, yyyy')}
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
                {game.status === 'completed' && (
                  <div className="flex items-center gap-3 text-sm font-bold text-navy">
                    <CheckCircle className="h-4 w-4" />
                    <span>Result: {game.home_score} - {game.away_score}</span>
                  </div>
                )}
                {game.status === 'cancelled' && (
                  <div className="flex items-center gap-3 text-sm font-bold text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span>Game Cancelled - Do Not Attend</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                {game.status === 'cancelled' && (
                  <Button
                    variant="ghost"
                    className="flex-1 text-muted-foreground cursor-not-allowed"
                    disabled
                  >
                    No Actions Available
                  </Button>
                )}

                {game.status !== 'cancelled' && game.status !== 'completed' && (
                  <>
                    <Button
                      className="flex-1 bg-navy hover:bg-navy/90"
                      onClick={() => openScoreDialog(game)}
                    >
                      Report Score
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDropOut(game.id)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Drop Out
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && games.length === 0 && (
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

      {selectedGame && (
        <ScoreSubmissionDialog
          isOpen={isScoreDialogOpen}
          onOpenChange={setIsScoreDialogOpen}
          gameId={selectedGame.id}
          homeTeamName={selectedGame.home_team}
          awayTeamName={selectedGame.away_team}
          onSuccess={fetchGames}
        />
      )}

      {/* Dropout Confirmation Dialog */}
      <Dialog open={showDropoutConfirm} onOpenChange={setShowDropoutConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Drop Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to drop out of this game? This will notify the league admin and make the game available for other referees.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDropoutConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDropOut}>
              Drop Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default RefereeGames;
