import { useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import DonorDashboard from './components/DonorDashboard';
import OrphanageDashboard from './components/OrphanageDashboard';

function App() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Auth />;
  }

  return profile.role === 'donor' ? <DonorDashboard /> : <OrphanageDashboard />;
}

export default App;
