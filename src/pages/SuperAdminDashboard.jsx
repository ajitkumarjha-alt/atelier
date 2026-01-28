import { useNavigate } from 'react-router-dom';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { Users, Shield, TrendingUp, Settings } from 'lucide-react';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  const dashboards = [
    {
      title: 'L1 Dashboard',
      subtitle: 'Admin - Project Allocation',
      description: 'View and manage all projects. Assign leads to projects.',
      icon: Shield,
      color: 'from-red-500 to-red-600',
      route: '/l1-dashboard',
      access: 'Full system access',
    },
    {
      title: 'L2 Dashboard',
      subtitle: 'Lead - Execution & Tracking',
      description: 'View assigned projects and track execution. Handle MAS and RFI approvals.',
      icon: TrendingUp,
      color: 'from-blue-500 to-blue-600',
      route: '/l2-dashboard',
      access: 'Project tracking',
    },
    {
      title: 'L3 Dashboard',
      subtitle: 'Supervisor - Limited Access',
      description: 'View project progress with limited edit capabilities. Monitor KPIs.',
      icon: Users,
      color: 'from-green-500 to-green-600',
      route: '/l3-dashboard',
      access: 'Read-only dashboard',
    },
    {
      title: 'L4 Dashboard',
      subtitle: 'Team Member - View Only',
      description: 'View assigned projects and basic information. No editing capabilities.',
      icon: Settings,
      color: 'from-yellow-500 to-yellow-600',
      route: '/l4-dashboard',
      access: 'View-only access',
    },
  ];

  const DashboardCard = ({ dashboard }) => {
    const Icon = dashboard.icon;
    return (
      <div
        onClick={() => navigate(dashboard.route)}
        className={`bg-gradient-to-br ${dashboard.color} rounded-lg p-8 text-white shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 cursor-pointer`}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h3 className="text-2xl font-garamond font-bold mb-1">
              {dashboard.title}
            </h3>
            <p className="text-white/80 font-jost text-sm mb-3">
              {dashboard.subtitle}
            </p>
            <p className="text-white/70 font-jost text-sm leading-relaxed">
              {dashboard.description}
            </p>
          </div>
          <Icon className="w-12 h-12 text-white/60 flex-shrink-0 ml-4" />
        </div>

        <div className="pt-4 border-t border-white/20">
          <span className="inline-block px-3 py-1 bg-white/20 text-white/90 text-xs font-jost font-semibold rounded-full">
            {dashboard.access}
          </span>
        </div>
      </div>
    );
  };

  return (
    <SuperAdminLayout>
      {/* Header */}
      <div className="mb-12">
        <h1 className="heading-primary mb-2">Super Admin Dashboard</h1>
        <p className="text-body">
          Access and manage all user level dashboards. Test and verify functionality across all access levels.
        </p>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {dashboards.map((dashboard) => (
          <DashboardCard key={dashboard.route} dashboard={dashboard} />
        ))}
      </div>

      {/* Info Section */}
      <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-lodha-gold">
        <h2 className="heading-secondary mb-4">About Super Admin Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-garamond font-bold text-lodha-black mb-3">
              What You Can Do
            </h3>
            <ul className="space-y-2 text-body">
              <li className="flex items-start gap-3">
                <span className="text-lodha-gold font-bold mt-1">•</span>
                <span>Access all user level dashboards</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lodha-gold font-bold mt-1">•</span>
                <span>Test features across all permission levels</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lodha-gold font-bold mt-1">•</span>
                <span>Verify project allocation and tracking</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lodha-gold font-bold mt-1">•</span>
                <span>Monitor system functionality</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-garamond font-bold text-lodha-black mb-3">
              User Levels Overview
            </h3>
            <div className="space-y-3 text-sm font-jost">
              <div className="flex justify-between items-center">
                <span className="text-lodha-grey">L1 - Admin</span>
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-semibold">
                  Full Access
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lodha-grey">L2 - Lead</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                  Tracking
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lodha-grey">L3 - Supervisor</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                  Limited
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lodha-grey">L4 - Member</span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-semibold">
                  View Only
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
