import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Donation, Orphanage, Notification } from '../lib/supabase';
import { Plus, MapPin, Clock, Package, Bell, LogOut, History } from 'lucide-react';
import DonationForm from './DonationForm';
import NearbyOrphanages from './NearbyOrphanages';
import NotificationPanel from './NotificationPanel';

export default function DonorDashboard() {
  const { profile, signOut } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [orphanages, setOrphanages] = useState<Orphanage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonations();
    fetchOrphanages();
    fetchNotifications();
  }, []);

  const fetchDonations = async () => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('donor_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrphanages = async () => {
    try {
      const { data, error } = await supabase
        .from('orphanages')
        .select('*')
        .eq('verified', true);

      if (error) throw error;
      setOrphanages(data || []);
    } catch (error) {
      console.error('Error fetching orphanages:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const activeDonations = donations.filter(d => d.status === 'pending' || d.status === 'accepted');
  const historyDonations = donations.filter(d => d.status === 'completed' || d.status === 'rejected');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Donor Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {profile?.full_name}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onUpdate={fetchNotifications}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">My Donations</h2>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Donation
                </button>
              </div>

              {showForm && (
                <div className="mb-6">
                  <DonationForm
                    onSuccess={() => {
                      setShowForm(false);
                      fetchDonations();
                    }}
                    onCancel={() => setShowForm(false)}
                  />
                </div>
              )}

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'active'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Active ({activeDonations.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'history'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <History className="w-4 h-4" />
                  History ({historyDonations.length})
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading donations...</div>
              ) : (
                <div className="space-y-4">
                  {(activeTab === 'active' ? activeDonations : historyDonations).map((donation) => (
                    <div
                      key={donation.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-emerald-600" />
                          <h3 className="font-semibold text-gray-900">{donation.food_type}</h3>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>
                          {donation.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span>Quantity: {donation.quantity}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{donation.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Expires: {new Date(donation.expiry_time).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(activeTab === 'active' ? activeDonations : historyDonations).length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      {activeTab === 'active' ? 'No active donations' : 'No donation history'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <NearbyOrphanages orphanages={orphanages} />
          </div>
        </div>
      </main>
    </div>
  );
}
