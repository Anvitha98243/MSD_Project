import { Orphanage } from '../lib/supabase';
import { MapPin, Phone, Users } from 'lucide-react';

type NearbyOrphanagesProps = {
  orphanages: Orphanage[];
};

export default function NearbyOrphanages({ orphanages }: NearbyOrphanagesProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Registered Orphanages</h2>

      <div className="space-y-4">
        {orphanages.map((orphanage) => (
          <div
            key={orphanage.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{orphanage.name}</h3>
              {orphanage.verified && (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full font-medium">
                  Verified
                </span>
              )}
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{orphanage.address}</span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{orphanage.phone}</span>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Capacity: {orphanage.capacity} people</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
              <a
                href={`https://www.google.com/maps?q=${orphanage.latitude},${orphanage.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View on Map →
              </a>
            </div>
          </div>
        ))}

        {orphanages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No orphanages found
          </div>
        )}
      </div>
    </div>
  );
}
