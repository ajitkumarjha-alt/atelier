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
  'l1-dashboard': 'L1 Dashboard',
  'l2-dashboard': 'L2 Dashboard',
  'l3-dashboard': 'L3 Dashboard',
  'l4-dashboard': 'L4 Dashboard',
  'cm-dashboard': 'CM Dashboard',
  'consultant-dashboard': 'Consultant Dashboard',
  'vendor-dashboard': 'Vendor Dashboard',
  'super-admin-dashboard': 'Super Admin',
  'project-input': 'Create Project',
  'project': 'Project Details',
  'mas': 'Material Approval Sheets',
  'rfi': 'Requests for Information',
  'design-calculations': 'Design Calculations',
  'drawings': 'Drawings',
  'change-requests': 'Change Requests',
  'project-standards': 'Project Standards',
  'team-management': 'Team Management',
  'consultant-login': 'Consultant Login',
  'consultant-registration': 'Consultant Registration',
  'vendor-registration': 'Vendor Registration',
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
              className="flex items-center text-gray-500 hover:text-lodha-gold transition-colors"
              aria-label="Home"
            >
              <Home className="w-4 h-4" />
            </Link>
          </li>
          {customCrumbs.map((crumb, index) => (
            <li key={index} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden="true" />
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="text-gray-500 hover:text-lodha-gold transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium" aria-current="page">
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

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 text-sm flex-wrap">
        <li>
          <Link
            to="/dashboard"
            className="flex items-center text-gray-500 hover:text-lodha-gold transition-colors"
            aria-label="Home"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>
        {pathnames.map((segment, index) => {
          const path = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const label = routeNameMap[segment] || segment.replace(/-/g, ' ');

          return (
            <li key={path} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden="true" />
              {isLast ? (
                <span
                  className="text-gray-900 font-medium capitalize"
                  aria-current="page"
                >
                  {label}
                </span>
              ) : (
                <Link
                  to={path}
                  className="text-gray-500 hover:text-lodha-gold transition-colors capitalize"
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
