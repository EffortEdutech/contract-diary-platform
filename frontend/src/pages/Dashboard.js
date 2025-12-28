import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { profile } = useAuth()

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Welcome, {profile?.full_name || 'User'}!
        </h2>
        <p className="text-gray-600 mb-6">
          Your dashboard is ready. Let's build amazing things together.
        </p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Active Contracts</p>
            <p className="text-2xl font-bold text-blue-900">0</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Pending Diaries</p>
            <p className="text-2xl font-bold text-green-900">0</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-600 font-medium">Claims This Month</p>
            <p className="text-2xl font-bold text-yellow-900">0</p>
          </div>
        </div>

        {/* Quick Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Account Info</h3>
          <div className="text-sm text-gray-600">
            <p>Email: {profile?.email}</p>
            <p>Role: {profile?.role?.replace('_', ' ').toUpperCase()}</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}