import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="text-center py-16 text-gray-400">Cargando...</div>
  if (!session) return <Navigate to="/admin/login" replace />
  return children
}
