import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockPostponementRequests, PostponementRequest } from '@/data/mockData';
import { CheckSquare, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminApprovals = () => {
  const [requests, setRequests] = useState<PostponementRequest[]>(mockPostponementRequests);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  const handleApprove = (id: string) => {
    setRequests(prev =>
      prev.map(r => (r.id === id ? { ...r, status: 'approved' as const } : r))
    );
    toast.success('Request approved. Teams have been notified.');
  };

  const handleDeny = (id: string) => {
    setRequests(prev =>
      prev.map(r => (r.id === id ? { ...r, status: 'denied' as const } : r))
    );
    toast.error('Request denied. Teams have been notified.');
  };

  const RequestCard = ({
    request,
    showActions,
  }: {
    request: PostponementRequest;
    showActions: boolean;
  }) => (
    <Card
      variant={
        request.status === 'pending'
          ? 'elevated'
          : request.status === 'approved'
          ? 'success'
          : 'urgent'
      }
      className="animate-fade-in"
    >
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  request.status === 'pending'
                    ? 'bg-gold/20 text-gold'
                    : request.status === 'approved'
                    ? 'bg-success/20 text-success'
                    : 'bg-destructive/20 text-destructive'
                }`}
              >
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{request.teamName}</p>
                <p className="text-sm text-muted-foreground">Postponement Request</p>
              </div>
            </div>
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
              {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
              {request.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
              {request.status === 'denied' && <XCircle className="h-3 w-3 mr-1" />}
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Badge>
          </div>

          <div className="bg-secondary/50 rounded-lg p-4">
            <p className="text-sm font-medium text-foreground mb-1">Reason:</p>
            <p className="text-sm text-muted-foreground">{request.reason}</p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>
              <strong>Requested Date:</strong> {format(request.requestedDate, 'MMMM d, yyyy')}
            </span>
            <span>
              <strong>Submitted:</strong> {format(request.submittedAt, 'MMM d, h:mm a')}
            </span>
          </div>

          {showActions && request.status === 'pending' && (
            <div className="flex gap-3 pt-2 border-t border-border">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleDeny(request.id)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Deny Request
              </Button>
              <Button
                variant="success"
                className="flex-1"
                onClick={() => handleApprove(request.id)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Request
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Approval Requests"
        description={`${pendingRequests.length} pending request${pendingRequests.length !== 1 ? 's' : ''} awaiting review`}
      />

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="processed">Processed ({processedRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.map(request => (
            <RequestCard key={request.id} request={request} showActions />
          ))}
          {pendingRequests.length === 0 && (
            <Card variant="elevated">
              <CardContent className="p-12 text-center">
                <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No pending requests to review
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4">
          {processedRequests.map(request => (
            <RequestCard key={request.id} request={request} showActions={false} />
          ))}
          {processedRequests.length === 0 && (
            <Card variant="elevated">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground">No processed requests</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Processed requests will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default AdminApprovals;
