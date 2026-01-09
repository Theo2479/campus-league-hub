import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockReferees, Referee } from '@/data/mockData';
import { Users } from 'lucide-react';
import { format } from 'date-fns';

const RefereeManagement = () => {
  const activeCount = mockReferees.filter((r) => r.status === 'active').length;
  const inactiveCount = mockReferees.filter((r) => r.status === 'inactive').length;

  return (
    <DashboardLayout>
      <PageHeader
        title="Registered Referees"
        description="View all referees registered on the platform"
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockReferees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Badge variant="default" className="bg-green-600">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Badge variant="secondary">Inactive</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Registered Referees</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockReferees.map((referee: Referee) => (
                <TableRow key={referee.id}>
                  <TableCell className="font-medium">{referee.username}</TableCell>
                  <TableCell>{format(referee.registeredAt, 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <Badge
                      variant={referee.status === 'active' ? 'default' : 'secondary'}
                      className={referee.status === 'active' ? 'bg-green-600' : ''}
                    >
                      {referee.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default RefereeManagement;
