import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
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
import { Users, Plus, Trash2, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface Referee {
  id: number;
  username: string;
  name: string;
  games_reffed: number;
  games_assigned: number;
  availability_submissions: number;
}

const RefereeManagement = () => {
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [refToDelete, setRefToDelete] = useState<Referee | null>(null);

  // Form state
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReferees = async () => {
    try {
      const res = await apiFetch('/api/admin/referees');
      if (res.ok) {
        const data = await res.json();
        setReferees(data.referees || []);
      } else {
        toast.error('Failed to load referees');
      }
    } catch (error) {
      console.error('Error fetching referees:', error);
      toast.error('Failed to load referees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferees();
  }, []);

  const handleCreateReferee = async () => {
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
      const res = await apiFetch('/api/admin/referees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          name: newName.trim() || newUsername.trim(),
          password: newPassword.trim()
        })
      });

      if (res.ok) {
        toast.success('Referee account created successfully');
        setIsAddDialogOpen(false);
        setNewUsername('');
        setNewName('');
        setNewPassword('');
        fetchReferees();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create referee');
      }
    } catch (error) {
      console.error('Error creating referee:', error);
      toast.error('Failed to create referee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReferee = async () => {
    if (!refToDelete) return;

    try {
      const res = await apiFetch(`/api/admin/referees/${refToDelete.id}`, {
        method: 'DELETE'
        
      });

      if (res.ok) {
        toast.success('Referee deleted successfully');
        setDeleteDialogOpen(false);
        setRefToDelete(null);
        fetchReferees();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete referee');
      }
    } catch (error) {
      console.error('Error deleting referee:', error);
      toast.error('Failed to delete referee');
    }
  };

  const openDeleteDialog = (referee: Referee) => {
    setRefToDelete(referee);
    setDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Registered Referees"
        description="Manage referee accounts on the platform"
      />

      <div className="flex justify-between items-center mb-6">
        <Card className="flex-1 mr-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referees.length}</div>
          </CardContent>
        </Card>

        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-gold hover:bg-gold/90 text-black">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Referee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Registered Referees</CardTitle>
          <CardDescription>
            Referees can log in with their credentials and manage their availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
          ) : referees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No referees registered yet.</p>
              <p className="text-sm mt-1">Click "Add Referee" to create the first referee account.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center" title="Games marked as Completed">Games Reffed</TableHead>
                  <TableHead className="text-center" title="Total games currently assigned">Assigned</TableHead>
                  <TableHead className="text-center" title="Number of availability slots submitted">Availability</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referees.map((referee) => (
                  <TableRow key={referee.id}>
                    <TableCell className="font-medium">{referee.username}</TableCell>
                    <TableCell>{referee.name || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                        {referee.games_reffed}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium">{referee.games_assigned}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-muted-foreground">{referee.availability_submissions} slots</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(referee)}
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

      {/* Add Referee Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Referee</DialogTitle>
            <DialogDescription>
              Create a new referee account. The referee can use these credentials to log in.
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
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The referee will use this password to log in
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateReferee}
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
                  Create Referee
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
            <AlertDialogTitle>Delete Referee?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {refToDelete?.name || refToDelete?.username}?
              This will remove their account and unassign them from any fixtures. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRefToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReferee}
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

export default RefereeManagement;
