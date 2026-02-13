import { useNavigate } from 'react-router-dom';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { Users, Shield, TrendingUp, Settings, Database, Truck, HelpCircle, Briefcase, UserCog } from 'lucide-react';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  const dashboards = [
    {
      title: 'L0 Dashboard',
      subtitle: 'VP/HoD MEP - Executive Overview',
      description: 'High-level overview of all projects. View status, pending MAS, and RFIs.',
      icon: Briefcase,
      color: 'from-lodha-cream to-lodha-sage',
      textColor: 'text-lodha-grey',
      borderColor: 'border-lodha-gold',
      route: '/l0-dashboard',
      access: 'Executive overview',
    },
    {
      title: 'L1 Dashboard',
      subtitle: 'Admin - Project Allocation',
      description: 'View and manage all projects. Assign leads to projects.',
      icon: Shield,
      color: 'from-white to-lodha-cream',
      textColor: 'text-lodha-grey',
      borderColor: 'border-lodha-gold',
      route: '/l1-dashboard',
      access: 'Full system access',
    },
    {
      title: 'L2 Dashboard',
      subtitle: 'Lead - Execution & Tracking',
      description: 'View assigned projects and track execution. Handle MAS and RFI approvals.',
      icon: TrendingUp,
      color: 'from-lodha-sand to-lodha-sand/80',
      textColor: 'text-lodha-black',
      borderColor: 'border-lodha-gold/50',
      route: '/l2-dashboard',
      access: 'Project tracking',
    },
    {
      title: 'L3 Dashboard',
      subtitle: 'Supervisor - Limited Access',
      description: 'View project progress with limited edit capabilities. Monitor KPIs.',
      icon: Users,
      color: 'from-lodha-sand/90 to-lodha-sand/70',
      textColor: 'text-lodha-black',
      borderColor: 'border-lodha-gold/30',
      route: '/l3-dashboard',
      access: 'Read-only dashboard',
    },
    {
      title: 'L4 Dashboard',
      subtitle: 'Team Member - View Only',
      description: 'View assigned projects and basic information. No editing capabilities.',
      icon: Settings,
      color: 'from-lodha-sand/70 to-lodha-sand/50',
      textColor: 'text-lodha-black/80',
      borderColor: 'border-lodha-gold/20',
      route: '/l4-dashboard',
      access: 'View-only access',
    },
    {
      title: 'CM Dashboard',
      subtitle: 'Construction Manager - RFI Management',
      description: 'Create and manage Requests for Information (RFI). Track pending and approved RFIs.',
      icon: HelpCircle,
      color: 'from-yellow-100 to-yellow-200',
      textColor: 'text-lodha-black',
      borderColor: 'border-lodha-gold/40',
      route: '/cm-dashboard',
      access: 'RFI management',
    },
    {
      title: 'Vendor Dashboard',
      subtitle: 'VENDOR - MAS Uploads',
      description: 'View and upload Material Approval Sheets (MAS) for approval.',
      icon: Truck,
      color: 'from-lodha-sand/90 to-lodha-sand/70',
      textColor: 'text-lodha-black',
      borderColor: 'border-lodha-gold/30',
      route: '/vendor-dashboard',
      access: 'Vendor access: upload MAS',
    },
    {
      title: 'Consultant Portal',
      subtitle: 'MEP CONSULTANT - Review & Respond',
      description: 'View projects, drawings, calculations, and respond to MAS/RFI referrals.',
      icon: UserCog,
      color: 'from-blue-100 to-blue-200',
      textColor: 'text-lodha-black',
      borderColor: 'border-blue-400',
      route: '/consultant-dashboard',
      access: 'Consultant access: technical review',
    },
    {
      title: 'Standards & Policies',
      subtitle: 'Project Standards Hub',
      description: 'Manage reference standards, policies, and project-specific selections.',
      icon: Database,
      color: 'from-lodha-gold/30 to-lodha-gold/20',
      textColor: 'text-lodha-black',
      borderColor: 'border-lodha-gold',
      route: '/standards',
      access: 'Configuration',
    },
  ];

  const DashboardCard = ({ dashboard }) => {
    const Icon = dashboard.icon;
    return (
      <div
        onClick={() => navigate(dashboard.route)}
        className={`bg-gradient-to-br ${dashboard.color} rounded-lg p-8 ${dashboard.textColor} shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 cursor-pointer border-2 ${dashboard.borderColor}`}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h3 className="text-2xl font-garamond font-bold mb-1">
              {dashboard.title}
            </h3>
            <p className="opacity-80 font-jost text-sm mb-3">
              {dashboard.subtitle}
            </p>
            <p className="opacity-70 font-jost text-sm leading-relaxed">
              {dashboard.description}
            </p>
          </div>
          <Icon className="w-12 h-12 opacity-60 flex-shrink-0 ml-4" />
        </div>

        <div className="pt-4 border-t opacity-20">
          <span className="inline-block px-3 py-1 bg-lodha-black/10 backdrop-blur-sm text-xs font-jost font-semibold rounded-full">
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
                <span>Manage project standards (dropdown options)</span>
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
                <span className="px-3 py-1 bg-lodha-gold/20 text-lodha-black rounded-full font-semibold border border-lodha-gold">
                  Full Access
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lodha-grey">L2 - Lead</span>
                <span className="px-3 py-1 bg-lodha-sand text-lodha-black rounded-full font-semibold border border-lodha-gold/50">
                  Tracking
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lodha-grey">L3 - Supervisor</span>
                <span className="px-3 py-1 bg-lodha-sand text-lodha-black rounded-full font-semibold border border-lodha-gold/30">
                  Limited
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lodha-grey">L4 - Member</span>
                <span className="px-3 py-1 bg-lodha-sand/50 text-lodha-black/70 rounded-full font-semibold border border-lodha-gold/20">
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
