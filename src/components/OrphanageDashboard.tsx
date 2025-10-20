import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Donation, Orphanage, Profile } from '../lib/supabase';
import { MapPin, Clock, Package, Bell, LogOut, CheckCircle, XCircle } from 'lucide-react';
import OrphanageProfile from './OrphanageProfile';
import NotificationPanel from './NotificationPanel';
import { Notification } from '../lib/supabase';

export default function OrphanageDashboard() {
  const { profile, signOut } = useAuth();
  const [donations, setDonations] = useState<(Donation & { donor: Profile })[]>([]);
  const [orphanageProfile, setOrphanageProfile] = useState<Orphanage | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrphanageProfile();
    fetchDonations();
    fetchNotifications();
  }, []);

  const fetchOrphanageProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('orphanages')
        .select('*')
        .eq('user_id', profile?.id)
        .maybeSingle();

      if (error) throw error;
      setOrphanageProfile(data);

      if (!data) {
        setShowProfile(true);
      }
    } catch (error) {
      console.error('Error fetching orphanage profile:', error);
    }
  };

  const fetchDonations = async () => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          donor:profiles!donations_donor_id_fkey(*)
        `)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
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

  const handleAccept = async (donation: Donation) => {
    if (!orphanageProfile) {
      alert('Please complete your orphanage profile first');
      setShowProfile(true);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('donations')
        .update({
          status: 'accepted',
          accepted_by: orphanageProfile.id,
        })
        .eq('id', donation.id);

      if (updateError) throw updateError;

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: donation.donor_id,
          donation_id: donation.id,
          message: `Your donation of ${donation.food_type} has been accepted by ${orphanageProfile.name}. Contact: ${orphanageProfile.phone}, Address: ${orphanageProfile.address}`,
        });

      if (notificationError) throw notificationError;

      fetchDonations();
    } catch (error: any) {
      console.error('Error accepting donation:', error);
      alert(error.message || 'Failed to accept donation');
    }
  };

  const handleReject = async (donationId: string) => {
    try {
      const { error } = await supabase
        .from('donations')
        .update({ status: 'rejected' })
        .eq('id', donationId);

      if (error) throw error;
      fetchDonations();
    } catch (error: any) {
      console.error('Error rejecting donation:', error);
      alert(error.message || 'Failed to reject donation');
    }
  };

  const handleComplete = async (donationId: string) => {
    try {
      const { error } = await supabase
        .from('donations')
        .update({ status: 'completed' })
        .eq('id', donationId);

      if (error) throw error;
      fetchDonations();
    } catch (error: any) {
      console.error('Error completing donation:', error);
      alert(error.message || 'Failed to mark as completed');
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const sortedDonations = orphanageProfile
    ? [...donations].sort((a, b) => {
        const distA = calculateDistance(
          orphanageProfile.latitude,
          orphanageProfile.longitude,
          a.latitude,
          a.longitude
        );
        const distB = calculateDistance(
          orphanageProfile.latitude,
          orphanageProfile.longitude,
          b.latitude,
          b.longitude
        );
        return distA - distB;
      })
    : donations;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Orphanage Dashboard</h1>
              <p className="text-sm text-gray-600">
                {orphanageProfile ? orphanageProfile.name : 'Welcome, ' + profile?.full_name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowProfile(true)}
                className="px-4 py-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors font-medium"
              >
                {orphanageProfile ? 'Edit Profile' : 'Setup Profile'}
              </button>
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

      {showProfile && (
        <OrphanageProfile
          orphanage={orphanageProfile}
          onClose={() => setShowProfile(false)}
          onUpdate={() => {
            fetchOrphanageProfile();
            setShowProfile(false);
          }}
        />
      )}

      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onUpdate={fetchNotifications}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Available Donations
            {orphanageProfile && ' (Sorted by distance)'}
          </h2>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading donations...</div>
          ) : (
            <div className="space-y-4">
              {sortedDonations.map((donation) => {
                const distance = orphanageProfile
                  ? calculateDistance(
                      orphanageProfile.latitude,
                      orphanageProfile.longitude,
                      donation.latitude,
                      donation.longitude
                    )
                  : null;

                const isExpiringSoon = new Date(donation.expiry_time) < new Date(Date.now() + 3 * 60 * 60 * 1000);
                const isAcceptedByMe = donation.accepted_by === orphanageProfile?.id;

                return (
                  <div
                    key={donation.id}
                    className={`border rounded-lg p-5 ${
                      isAcceptedByMe
                        ? 'border-blue-300 bg-blue-50'
                        : isExpiringSoon
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 hover:border-emerald-300'
                    } transition-colors`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">{donation.food_type}</h3>
                          {isAcceptedByMe && (
                            <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full font-medium">
                              ACCEPTED BY YOU
                            </span>
                          )}
                          {isExpiringSoon && !isAcceptedByMe && (
                            <span className="px-3 py-1 bg-red-600 text-white text-xs rounded-full font-medium">
                              EXPIRING SOON
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Donated by: {donation.donor.full_name}
                        </p>
                      </div>
                      {distance !== null && (
                        <div className="text-right">
                          <p className="text-sm font-medium text-emerald-600">
                            {distance.toFixed(1)} km away
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span>Quantity: {donation.quantity}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Expires: {new Date(donation.expiry_time).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{donation.location}</span>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${donation.latitude},${donation.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 font-medium inline-block"
                        >
                          View on Map →
                        </a>
                      </div>
                    </div>

                    {donation.notes && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{donation.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      {donation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAccept(donation)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleReject(donation.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}
                      {isAcceptedByMe && (
                        <button
                          onClick={() => handleComplete(donation.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark as Completed
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {sortedDonations.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No donations available at the moment
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
