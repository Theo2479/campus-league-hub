import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Plus, Trash2, Loader2, UserPlus, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface Captain {
    id: number;
    username: string;
    name: string;
    phone: string;
    team_id: number | null;
    team_name: string | null;
}

interface Team {
    id: number;
    name: string;
}

const CaptainManagement = () => {
    const [captains, setCaptains] = useState<Captain[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [captainToDelete, setCaptainToDelete] = useState<Captain | null>(null);

    // Form state
    const [newUsername, setNewUsername] = useState('');
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState<string>('none');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchCaptains = async () => {
        try {
            const res = await fetch('/api/admin/captains', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setCaptains(data.captains || []);
            } else {
                toast.error('Failed to load captains');
            }
        } catch (error) {
            console.error('Error fetching captains:', error);
            toast.error('Failed to load captains');
        } finally {
            setLoading(false);
        }
    };

    const fetchTeams = async () => {
        try {
            const res = await fetch('/api/admin/teams', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setTeams(data.teams || []);
            }
        } catch (error) {
            console.error('Error fetching teams:', error);
        }
    };

    useEffect(() => {
        fetchCaptains();
        fetchTeams();
    }, []);

    // Filter out teams that already have captains
    const availableTeams = teams.filter(
        (team) => !captains.some((cap) => cap.team_id === team.id)
    );

    const handleCreateCaptain = async () => {
        if (!newUsername.trim()) {
            toast.error('Username is required');
            return;
        }

        if (!newPassword.trim() || newPassword.trim().length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/captains', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    username: newUsername.trim(),
                    name: newName.trim() || newUsername.trim(),
                    phone: newPhone.trim(),
                    password: newPassword.trim(),
                    team_id: selectedTeamId && selectedTeamId !== 'none' ? parseInt(selectedTeamId) : null
                })
            });

            if (res.ok) {
                toast.success('Captain account created successfully');
                setIsAddDialogOpen(false);
                setNewUsername('');
                setNewName('');
                setNewPhone('');
                setNewPassword('');
                setSelectedTeamId('none');
                fetchCaptains();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to create captain');
            }
        } catch (error) {
            console.error('Error creating captain:', error);
            toast.error('Failed to create captain');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCaptain = async () => {
        if (!captainToDelete) return;

        try {
            const res = await fetch(`/api/admin/captains/${captainToDelete.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                toast.success('Captain deleted successfully');
                setDeleteDialogOpen(false);
                setCaptainToDelete(null);
                fetchCaptains();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete captain');
            }
        } catch (error) {
            console.error('Error deleting captain:', error);
            toast.error('Failed to delete captain');
        }
    };

    const openDeleteDialog = (captain: Captain) => {
        setCaptainToDelete(captain);
        setDeleteDialogOpen(true);
    };

    return (
        <DashboardLayout>
            <PageHeader
                title="Team Captains"
                description="Manage captain accounts and team assignments"
            />

            <div className="flex justify-between items-center mb-6">
                <Card className="flex-1 mr-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Captains</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{captains.length}</div>
                    </CardContent>
                </Card>

                <Button onClick={() => setIsAddDialogOpen(true)} className="bg-gold hover:bg-gold/90 text-black">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Captain
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Team Captains</CardTitle>
                    <CardDescription>
                        Captains can log in to view their team's fixtures, standings, and manage their team
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gold" />
                        </div>
                    ) : captains.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No captains registered yet.</p>
                            <p className="text-sm mt-1">Click "Add Captain" to create the first captain account.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Team</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {captains.map((captain) => (
                                    <TableRow key={captain.id}>
                                        <TableCell className="font-medium">{captain.username}</TableCell>
                                        <TableCell>{captain.name || '-'}</TableCell>
                                        <TableCell>{captain.phone || '-'}</TableCell>
                                        <TableCell>
                                            {captain.team_name ? (
                                                <Badge variant="default" className="bg-gold/20 text-gold-foreground border-gold/30">
                                                    {captain.team_name}
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">No team assigned</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => openDeleteDialog(captain)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add Captain Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Captain</DialogTitle>
                        <DialogDescription>
                            Create a new captain account. The captain can use these credentials to log in and manage their team.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username *</Label>
                            <Input
                                id="username"
                                placeholder="e.g. jsmith"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. John Smith"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                placeholder="e.g. 07700 900000"
                                value={newPhone}
                                onChange={(e) => setNewPhone(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password *</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Minimum 8 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                The captain will use this password to log in
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="team">Assign Team (Optional)</Label>
                            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a team..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No team</SelectItem>
                                    {availableTeams.filter(t => t && t.id).map((team) => (
                                        <SelectItem key={team.id} value={team.id.toString()}>
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Only teams without a captain are shown
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateCaptain}
                            disabled={isSubmitting}
                            className="bg-gold hover:bg-gold/90 text-black"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Captain
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Captain?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {captainToDelete?.name || captainToDelete?.username}?
                            This will remove their account and unlink them from their team. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setCaptainToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteCaptain}
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

export default CaptainManagement;
