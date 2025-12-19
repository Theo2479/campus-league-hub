import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockPostponementRequests, PostponementRequest } from '@/data/mockData';
import { AlertTriangle, CheckCircle, XCircle, Clock, Users, Trophy, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const AdminDashboard = () => {
  const [requests, setRequests] = useState<PostponementRequest[]>(mockPostponementRequests);
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const handleApprove = (id: string) => {
    setRequests(prev =>
      prev.map(r => (r.id === id ? { ...r, status: 'approved' as const } : r))
    );
    toast.success('Request approved successfully');
  };

  const handleDeny = (id: string) => {
    setRequests(prev =>
      prev.map(r => (r.id === id ? { ...r, status: 'denied' as const } : r))
    );
    toast.error('Request denied');
  };

  const handleEmergencyCancel = () => {
    setEmergencyTriggered(true);
    toast.error('EMERGENCY CANCELLATION TRIGGERED - All teams and referees notified', {
      duration: 5000,
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
          value={12}
          icon={<Trophy className="h-6 w-6" />}
        />
        <StatCard
          label="Active Referees"
          value={8}
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          label="This Week's Games"
          value={15}
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="danger" size="xl" className="w-full">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Emergency Cancel All Games
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Confirm Emergency Cancellation
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will immediately cancel ALL scheduled games and notify all teams,
                      referees, and players. This action should only be used for severe
                      weather or genuine emergencies.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleEmergencyCancel}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirm Emergency Cancel
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                          Requested: {format(request.requestedDate, 'MMMM d, yyyy')} •
                          Submitted: {format(request.submittedAt, 'MMM d, h:mm a')}
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
    </DashboardLayout>
  );
};

export default AdminDashboard;
