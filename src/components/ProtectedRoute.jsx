import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute — guards routes that require authentication and optional role checks.
 *
 * @param {object}  props
 * @param {React.ReactNode} props.children   - The element to render when authorised
 * @param {object|null}     props.user       - Current Firebase user (null = logged out)
 * @param {string|null}     props.userLevel  - Mapped role stored in the DB
 * @param {string[]}        [props.roles]    - Allowed role set. If omitted any authenticated user passes.
 * @param {string}          [props.redirect] - Where to redirect unauthorised users (default: "/")
 */
export default function ProtectedRoute({
  children,
  user,
  userLevel,
  roles,
  redirect = '/',
}) {
  if (!user) {
    return <Navigate to={redirect} replace />;
  }

  if (roles && !roles.includes(userLevel)) {
    return <Navigate to={redirect} replace />;
  }

  return children;
}
