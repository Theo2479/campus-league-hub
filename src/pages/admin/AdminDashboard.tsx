import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Clock, Users, Trophy, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { EmergencyCancelDialog } from '@/components/admin/EmergencyCancelDialog';
import { apiFetch } from '@/lib/api';

interface PostponementRequest {
  id: number;
  teamName: string;
  fixture: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  submittedAt: string;
  requestedDate: string;
}

const AdminDashboard = () => {
  const [requests, setRequests] = useState<PostponementRequest[]>([]);
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const [stats, setStats] = useState({
    activeTeams: 0,
    activeRefs: 0,
    weekGames: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [reqsRes, teamsRes, refsRes, gamesRes] = await Promise.all([
          apiFetch('/api/admin/approvals'),
          apiFetch('/api/admin/teams'),
          apiFetch('/api/admin/referees'),
          apiFetch('/api/fixtures') // Assuming returns all games or I filter
        ]);

        if (reqsRes.ok) {
          const data = await reqsRes.json();
          setRequests(data.requests || []);
        }

        if (teamsRes.ok) {
          const data = await teamsRes.json();
          setStats(prev => ({ ...prev, activeTeams: data.teams?.length || 0 }));
        }

        if (refsRes.ok) {
          const data = await refsRes.json();
          setStats(prev => ({ ...prev, activeRefs: data.referees?.length || 0 }));
        }

        if (gamesRes.ok) {
          const data = await gamesRes.json();
          // Filter for this week games roughly or just total for now
          const games = data.fixtures || [];
          setStats(prev => ({ ...prev, weekGames: games.length }));
        }

      } catch (e) {
        console.error("Failed to fetch dashboard data", e);
        toast.error('Failed to load dashboard data');
      }
    };
    fetchDashboardData();
  }, []);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const handleApprove = async (id: number) => {
    try {
      const res = await apiFetch(`/api/admin/approvals/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
        toast.success('Request approved successfully');
      }
    } catch (e) {
      toast.error('Failed to approve');
    }
  };

  const handleDeny = async (id: number) => {
    try {
      const res = await apiFetch(`/api/admin/approvals/${id}/deny`, { method: 'POST' });
      if (res.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'denied' } : r));
        toast.success('Request denied');
      }
    } catch (e) {
      toast.error('Failed to deny');
    }
  };

  const handleEmergencySuccess = (count: number, date: Date) => {
    setEmergencyTriggered(true);
    toast.error(`EMERGENCY CANCELLATION ACTIVE - ${count} games cancelled for ${format(date, 'MMM do')}.`, {
      duration: 5000
    });
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Admin Dashboard"
        description="League management and control center"
      />

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          label="Pending Approvals"
          value={pendingCount}
          icon={<Clock className="h-6 w-6" />}
        />
        <StatCard
          label="Active Teams"
          value={stats.activeTeams}
          icon={<Trophy className="h-6 w-6" />}
        />
        <StatCard
          label="Active Referees"
          value={stats.activeRefs}
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          label="Total Games"
          value={stats.weekGames}
          icon={<Calendar className="h-6 w-6" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Emergency Control */}
        <Card variant={emergencyTriggered ? 'urgent' : 'elevated'} className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Emergency Control
            </CardTitle>
            <CardDescription>
              Mass cancellation for severe weather or emergencies
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emergencyTriggered ? (
              <div className="text-center py-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <p className="font-semibold text-destructive">Emergency Active</p>
                <p className="text-sm text-muted-foreground mt-2">
                  All games have been cancelled. Notifications sent.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setEmergencyTriggered(false);
                    toast.success('Emergency status cleared');
                  }}
                >
                  Clear Emergency
                </Button>
              </div>
            ) : (
              <Button
                variant="danger"
                size="xl"
                className="w-full"
                onClick={() => setShowCancelDialog(true)}
              >
                <AlertTriangle className="h-5 w-5 mr-2" />
                Emergency Cancel Games
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Postponement Requests */}
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gold" />
              Postponement Requests
            </CardTitle>
            <CardDescription>Review and manage team postponement requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requests.map(request => (
              <Card
                key={request.id}
                variant={
                  request.status === 'pending'
                    ? 'default'
                    : request.status === 'approved'
                      ? 'success'
                      : 'urgent'
                }
                className="animate-fade-in"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{request.teamName}</p>
                          <Badge
                            variant={
                              request.status === 'pending'
                                ? 'secondary'
                                : request.status === 'approved'
                                  ? 'default'
                                  : 'destructive'
                            }
                            className={request.status === 'approved' ? 'bg-success' : ''}
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Requested: {format(parseISO(request.requestedDate), 'MMMM d, yyyy')} •
                          Submitted: {format(parseISO(request.submittedAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    {request.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeny(request.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Deny
                        </Button>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleApprove(request.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
      <EmergencyCancelDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onSuccess={handleEmergencySuccess}
      />
    </DashboardLayout>
  );
};

export default AdminDashboard;
