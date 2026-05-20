import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Users, Trash2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { apiFetch } from '@/lib/api';

interface Team {
    id: string;
    name: string;
}

const TeamManagement = () => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Delete confirmation dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
    const [deleteTeamName, setDeleteTeamName] = useState<string>('');

    const fetchTeams = async () => {
        try {
            const res = await apiFetch('/api/admin/teams');
            if (res.ok) {
                const data = await res.json();
                setTeams(data.teams.map((t: any) => ({
                    id: t.id.toString(),
                    name: t.name
                })));
            }
        } catch (e) {
            toast.error("Failed to load teams");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, []);

    const handleCreateTeam = async () => {
        if (!newTeamName) {
            toast.error('Team name is required');
            return;
        }

        try {
            const res = await apiFetch('/api/admin/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTeamName })
                
            });

            if (res.ok) {
                toast.success(`Team "${newTeamName}" created`);
                setNewTeamName('');
                setIsDialogOpen(false);
                fetchTeams();
            } else {
                toast.error("Failed to create team");
            }
        } catch (e) {
            toast.error("Error creating team");
        }
    };

    const openDeleteDialog = (id: string, name: string) => {
        setDeleteTeamId(id);
        setDeleteTeamName(name);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTeamId) return;

        try {
            const res = await apiFetch(`/api/admin/teams/${deleteTeamId}`, {
                method: 'DELETE'
                
            });

            if (res.ok) {
                toast.success(`Team "${deleteTeamName}" deleted`);
                fetchTeams();
            } else {
                toast.error("Failed to delete team");
            }
        } catch (e) {
            toast.error("Error deleting team");
        } finally {
            setDeleteDialogOpen(false);
            setDeleteTeamId(null);
            setDeleteTeamName('');
        }
    };

    const filteredTeams = teams.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-gold" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <PageHeader
                title="Team Management"
                description="Manage the master list of all teams"
            />

            <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search teams..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="gold" size="lg">
                            <Plus className="h-5 w-5 mr-2" />
                            Add New Team
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add New Team</DialogTitle>
                            <DialogDescription>
                                Create a new team to add to the master list.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Team Name</Label>
                                <Input
                                    id="name"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    placeholder="e.g. Engineering Eagles"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button variant="gold" onClick={handleCreateTeam}>Create Team</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card variant="elevated">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-gold" />
                        All Teams
                    </CardTitle>
                    <CardDescription>
                        {filteredTeams.length} teams found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredTeams.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No teams found</p>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredTeams.map((team, index) => (
                                <div
                                    key={team.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-gold/20 flex items-center justify-center">
                                            <span className="text-xs font-bold text-gold">{index + 1}</span>
                                        </div>
                                        <span className="font-medium text-foreground">{team.name}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => openDeleteDialog(team.id, team.name)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Team?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deleteTeamName}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
};

export default TeamManagement;
