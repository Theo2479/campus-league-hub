import { useAuth, UserRole } from '@/contexts/AuthContext';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Bell,
  Settings,
  LogOut,
  Shield,
  Trophy,
  Clock,
  AlertTriangle,
  CheckSquare,
  Handshake,
  FileText,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  // Referee items
  { label: 'Dashboard', path: '/referee', icon: LayoutDashboard, roles: ['referee'] },
  { label: 'Availability', path: '/referee/availability', icon: Clock, roles: ['referee'] },
  { label: 'My Games', path: '/referee/games', icon: Trophy, roles: ['referee'] },
  
  // Captain items
  { label: 'Dashboard', path: '/captain', icon: LayoutDashboard, roles: ['captain'] },
  { label: 'Season Fixtures', path: '/captain/fixtures', icon: Calendar, roles: ['captain'] },
  { label: 'Friendly Market', path: '/captain/friendlies', icon: Handshake, roles: ['captain'] },
  { label: 'Submit Scores', path: '/captain/scores', icon: FileText, roles: ['captain'] },
  
  // Admin items
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, roles: ['admin'] },
  { label: 'Approvals', path: '/admin/approvals', icon: CheckSquare, roles: ['admin'] },
  { label: 'Emergency Control', path: '/admin/emergency', icon: AlertTriangle, roles: ['admin'] },
  
  // Common items
  { label: 'Notifications', path: '/notifications', icon: Bell, roles: ['admin', 'referee', 'captain'] },
  { label: 'Profile', path: '/profile', icon: Settings, roles: ['admin', 'referee', 'captain'] },
];

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  referee: 'Referee',
  captain: 'Team Captain',
};

const roleIcons: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  referee: Users,
  captain: Trophy,
};

export const AppSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const filteredItems = navItems.filter((item) => item.roles.includes(user.role));
  const RoleIcon = roleIcons[user.role];

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold">
            <RoleIcon className="h-5 w-5 text-navy" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">
              {user.name}
            </p>
            <p className="text-xs text-gold">
              {roleLabels[user.role]}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gold text-navy shadow-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-gold'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive ? 'text-navy' : '')} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden bg-navy text-gold hover:bg-navy-light"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar transition-transform duration-300 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
};
