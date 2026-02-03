import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TeamStats {
    id: number;
    name: string;
    stats: {
        played: number;
        won: number;
        drawn: number;
        lost: number;
        goals_for: number;
        goals_against: number;
        goal_difference: number;
        points: number;
    };
}

interface TopScorer {
    id: number;
    name: string;
    team_name: string;
    goals: number;
    assists: number;
}

const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState<TeamStats[]>([]);
    const [scorers, setScorers] = useState<TopScorer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [lbRes, scorerRes] = await Promise.all([
                    fetch("/api/leaderboard"),
                    fetch("/api/top-scorers")
                ]);

                if (lbRes.ok) {
                    const data = await lbRes.json();
                    setLeaderboard(data.leaderboard);
                }

                if (scorerRes.ok) {
                    const data = await scorerRes.json();
                    setScorers(data.scorers);
                }
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <DashboardLayout>
            <PageHeader
                title="League Leaderboards"
                description="Current standings and top player statistics"
            />

            <div className="grid gap-6 md:grid-cols-3">
                {/* League Table - Takes up 2 columns */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-gold" />
                            <CardTitle>League Table</CardTitle>
                        </div>
                        <CardDescription>Wednesday League 1 Standings</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">Pos</TableHead>
                                    <TableHead>Team</TableHead>
                                    <TableHead className="text-center">P</TableHead>
                                    <TableHead className="text-center">W</TableHead>
                                    <TableHead className="text-center">D</TableHead>
                                    <TableHead className="text-center">L</TableHead>
                                    <TableHead className="text-center">GD</TableHead>
                                    <TableHead className="text-center font-bold">Pts</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leaderboard.map((team, index) => (
                                    <TableRow key={team.id}>
                                        <TableCell className="font-medium">
                                            {index + 1}
                                            {index === 0 && <span className="ml-2 text-xl">🥇</span>}
                                            {index === 1 && <span className="ml-2 text-xl">🥈</span>}
                                            {index === 2 && <span className="ml-2 text-xl">🥉</span>}
                                        </TableCell>
                                        <TableCell className="font-semibold">{team.name}</TableCell>
                                        <TableCell className="text-center">{team.stats.played}</TableCell>
                                        <TableCell className="text-center">{team.stats.won}</TableCell>
                                        <TableCell className="text-center">{team.stats.drawn}</TableCell>
                                        <TableCell className="text-center">{team.stats.lost}</TableCell>
                                        <TableCell className="text-center">{team.stats.goal_difference}</TableCell>
                                        <TableCell className="text-center font-bold text-lg text-primary">
                                            {team.stats.points}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!loading && leaderboard.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No league data available
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Top Scorers - Takes up 1 column */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Medal className="h-5 w-5 text-gold" />
                            <CardTitle>Top Scorers</CardTitle>
                        </div>
                        <CardDescription>Golden Boot Race</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {scorers.map((player, index) => (
                                <div key={player.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm
                      ${index === 0 ? 'bg-gold/20 text-gold-600' :
                                                index === 1 ? 'bg-slate-200 text-slate-600' :
                                                    index === 2 ? 'bg-amber-700/20 text-amber-700' : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{player.name}</p>
                                            <p className="text-xs text-muted-foreground">{player.team_name}</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="font-mono text-sm px-2">
                                        {player.goals} ⚽
                                    </Badge>
                                </div>
                            ))}
                            {!loading && scorers.length === 0 && (
                                <p className="text-center text-sm text-muted-foreground py-4">No top scorers yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default Leaderboard;
