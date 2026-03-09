import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch } from '@/lib/api';

interface ScoreSubmissionDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    gameId: number;
    homeTeamName: string;
    awayTeamName: string;
    onSuccess: () => void;
}

export function ScoreSubmissionDialog({
    isOpen,
    onOpenChange,
    gameId,
    homeTeamName,
    awayTeamName,
    onSuccess
}: ScoreSubmissionDialogProps) {
    const [homeScore, setHomeScore] = useState("");
    const [awayScore, setAwayScore] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await apiFetch(`/api/fixtures/${gameId}/score`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    home_score: parseInt(homeScore),
                    away_score: parseInt(awayScore)
                })
            });

            if (!response.ok) {
                throw new Error("Failed to submit score");
            }

            toast.success("Score submitted successfully");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast.error("Error submitting score");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
