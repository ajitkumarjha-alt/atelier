import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

/**
 * Breadcrumbs Component
 * Provides navigation breadcrumbs with automatic route detection
 */

const routeNameMap = {
  '': 'Home',
  'dashboard': 'Dashboard',
  'l0-dashboard': 'Executive Overview',
  'l1-dashboard': 'Project Allocation',
  'l2-dashboard': 'Execution Dashboard',
  'l3-dashboard': 'L3 Supervisor Dashboard',
  'l4-dashboard': 'L4 Team Member Dashboard',
  'cm-dashboard': 'Construction Manager Dashboard',
  'consultant-dashboard': 'Consultant Dashboard',
  'vendor-dashboard': 'Vendor Dashboard',
  'super-admin-dashboard': 'Super Admin Dashboard',
  'project-input': 'Create Project',
  'project-input-enhanced': 'Create Project',
  'project': 'Project Details',
  'mas': 'Material Approval Sheets',
  'mas-list': 'Material Approval Sheets',
  'mas-form': 'Material Approval Sheet',
  'rfi': 'Request for Information',
  'rfi-list': 'Request for Information',
  'design-calculations': 'Design Calculations',
  'drawing-schedule': 'Drawing Schedule',
  'change-requests': 'Change Requests',
  'change-request': 'Change Request',
  'project-standards': 'Project Standards',
  'standards-management': 'Standards Management',
  'task-management': 'Task Management',
  'rfc-management': 'Request for Change',
  'dds': 'Design Delivery Schedule',
  'policy-management': 'Policy Management',
  'pending-approval': 'Pending Approval',
  'consultant-login': 'Consultant Login',
  'vendor-login': 'Vendor Login',
  'calculations': 'Calculations',
  'electrical-load': 'Electrical Load',
  'water-demand': 'Water Demand',
  'project-plans': 'Project Plans',
  'structural-data': 'Structural Data',
  'settings': 'Settings',
};

const Breadcrumbs = ({ customCrumbs = null }) => {
  const location = useLocation();

  // If custom breadcrumbs provided, use them
  if (customCrumbs) {
    return (
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link
              to="/dashboard"
              className="flex items-center text-lodha-grey/70 hover:text-lodha-gold transition-colors"
              aria-label="Home"
            >
              <Home className="w-4 h-4" />
            </Link>
          </li>
          {customCrumbs.map((crumb, index) => (
            <li key={index} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-lodha-grey/50" aria-hidden="true" />
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="text-lodha-grey/70 hover:text-lodha-gold transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-lodha-black font-medium" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  // Auto-generate breadcrumbs from route
  const pathnames = location.pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on home page
  if (pathnames.length === 0) {
    return null;
  }

  // Don't show breadcrumbs on login pages
  if (pathnames[0]?.includes('login')) {
    return null;
  }

  // Don't show breadcrumbs on top-level dashboard/landing pages
  const dashboardPages = [
    'dashboard', 'l0-dashboard', 'l1-dashboard', 'l2-dashboard', 
    'l3-dashboard', 'l4-dashboard', 'cm-dashboard', 'super-admin-dashboard',
    'consultant-dashboard', 'vendor-dashboard', 'pending-approval',
    'welcome'
  ];
  if (pathnames.length === 1 && dashboardPages.includes(pathnames[0])) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 text-sm flex-wrap">
        <li>
          <Link
            to="/dashboard"
            className="flex items-center text-lodha-grey/70 hover:text-lodha-gold transition-colors"
            aria-label="Home"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>
        {pathnames.map((segment, index) => {
          let path = `/${pathnames.slice(0, index + 1).join('/')}`;
          
          // Skip numeric segments (project IDs) — they don't need their own breadcrumb
          if (!isNaN(segment) && segment !== '') {
            return null;
          }

          // Special handling for calculations breadcrumb
          if (segment === 'calculations' && index > 0) {
            const projectId = pathnames[index - 1];
            if (!isNaN(projectId)) {
              path = `/design-calculations/${projectId}`;
            }
          }
          
          const isLast = index === pathnames.length - 1 || 
            (index === pathnames.length - 2 && !isNaN(pathnames[pathnames.length - 1]));
          const label = routeNameMap[segment] || segment.replace(/-/g, ' ');

          return (
            <li key={path} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-lodha-grey/50" aria-hidden="true" />
              {isLast ? (
                <span
                  className="text-lodha-black font-medium capitalize"
                  aria-current="page"
                >
                  {label}
                </span>
              ) : (
                <Link
                  to={path}
                  className="text-lodha-grey/70 hover:text-lodha-gold transition-colors capitalize"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
