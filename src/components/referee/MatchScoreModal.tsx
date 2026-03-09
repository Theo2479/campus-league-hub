import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface MatchScoreModalProps {
  fixture: any;
  onScoreSubmitted: () => void;
  trigger?: React.ReactNode;
}

export function MatchScoreModal({ fixture, onScoreSubmitted, trigger }: MatchScoreModalProps) {
  const [open, setOpen] = useState(false);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (homeScore === '' || awayScore === '') {
      toast.error('Please enter both scores');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch(`/api/fixtures/${fixture.id}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          home_score: parseInt(homeScore),
          away_score: parseInt(awayScore)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit score');
      }

      toast.success('Score submitted successfully!');
      setOpen(false);
      onScoreSubmitted();
    } catch (error) {
      toast.error('Error submitting score');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">Enter Score</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter Match Result</DialogTitle>
          <DialogDescription>
            {fixture.home_team} vs {fixture.away_team}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="home" className="text-right">
                {fixture.home_team}
              </Label>
              <Input
                id="home"
                type="number"
                min="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="away" className="text-right">
                {fixture.away_team}
              </Label>
              <Input
                id="away"
                type="number"
                min="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Finalize Match'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
