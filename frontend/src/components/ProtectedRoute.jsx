export default function ProtectedRoute({ children, requiredRole }) {
  const auth = getAuth();
  const userRole = auth?.user?.role;

  if (!auth || !auth.token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
