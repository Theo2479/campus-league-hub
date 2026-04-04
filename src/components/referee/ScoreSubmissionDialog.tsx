import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch } from '@/lib/api';

interface ScoreSubmissionDialogProps {
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    gameId: number;
    homeTeamName: string;
    awayTeamName: string;
    isTournamentGame?: boolean;
    onSuccess: () => void;
    trigger?: React.ReactNode;
}

export function ScoreSubmissionDialog({
    isOpen,
    onOpenChange,
    gameId,
    homeTeamName,
    awayTeamName,
    isTournamentGame,
    onSuccess,
    trigger
}: ScoreSubmissionDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const controlled = isOpen !== undefined && onOpenChange !== undefined;
    const open = controlled ? isOpen : internalOpen;
    const setOpen = controlled ? onOpenChange : setInternalOpen;

    const [homeScore, setHomeScore] = useState("");
    const [awayScore, setAwayScore] = useState("");
    const [homePens, setHomePens] = useState("");
    const [awayPens, setAwayPens] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Derived state checking if standard play ended in a draw, allowing for penalties
    const isDraw = homeScore !== "" && awayScore !== "" && homeScore === awayScore;
    const showPens = isTournamentGame && isDraw;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (homeScore === '' || awayScore === '') {
            toast.error('Please enter both scores');
            return;
        }
        setIsSubmitting(true);

        try {
            const payload: any = {
                home_score: parseInt(homeScore),
                away_score: parseInt(awayScore)
            };

            if (showPens) {
                if (homePens === "" || awayPens === "") {
                    toast.error('Please enter the penalty scores');
                    setIsSubmitting(false);
                    return;
                }
                payload.home_pens = parseInt(homePens);
                payload.away_pens = parseInt(awayPens);
            }

            const response = await apiFetch(`/api/fixtures/${gameId}/score`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("Failed to submit score");
            }

            toast.success("Score submitted successfully");
            onSuccess();
            setOpen(false);
        } catch (error) {
            toast.error("Error submitting score");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Submit Match Result</DialogTitle>
                    <DialogDescription>
                        Enter the final score for {homeTeamName} vs {awayTeamName}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="home-score">{homeTeamName}</Label>
                                <Input
                                    id="home-score"
                                    type="number"
                                    min="0"
                                    value={homeScore}
                                    onChange={(e) => setHomeScore(e.target.value)}
                                    placeholder="0"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="away-score">{awayTeamName}</Label>
                                <Input
                                    id="away-score"
                                    type="number"
                                    min="0"
                                    value={awayScore}
                                    onChange={(e) => setAwayScore(e.target.value)}
                                    placeholder="0"
                                    required
                                />
                            </div>
                        </div>

                        {showPens && (
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border mt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="home-pens">{homeTeamName} (Pens)</Label>
                                    <Input
                                        id="home-pens"
                                        type="number"
                                        min="0"
                                        value={homePens}
                                        onChange={(e) => setHomePens(e.target.value)}
                                        placeholder="0"
                                        required={showPens}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="away-pens">{awayTeamName} (Pens)</Label>
                                    <Input
                                        id="away-pens"
                                        type="number"
                                        min="0"
                                        value={awayPens}
                                        onChange={(e) => setAwayPens(e.target.value)}
                                        placeholder="0"
                                        required={showPens}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Submitting..." : "Submit Score"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
