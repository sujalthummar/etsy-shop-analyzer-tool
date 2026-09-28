"use client";

import { useState } from "react";

export default function DebugPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchDebug() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cron?secret=etsy-listing-monitor&debug=true");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Cron Debug Dashboard</h1>
        
        <button
          onClick={fetchDebug}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-6"
        >
          {loading ? "Loading..." : "Check Cron Status"}
        </button>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">📊 Summary</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Total Shops</div>
                  <div className="text-2xl font-bold">{data.database.totalShops}</div>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Total Schedules</div>
                  <div className="text-2xl font-bold">{data.database.totalSchedules}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Will Sync Now</div>
                  <div className="text-2xl font-bold">{data.summary.willSyncNow}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-yellow-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Enabled Schedules</div>
                  <div className="text-2xl font-bold">{data.summary.enabledSchedules}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Due Schedules</div>
                  <div className="text-2xl font-bold">{data.summary.dueSchedules}</div>
                </div>
              </div>
            </div>

            {/* Shops */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">🏪 Shops</h2>
              <div className="space-y-2">
                {data.database.shops.map((shop: any) => (
                  <div key={shop.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="font-semibold">{shop.shopName}</div>
                    <div className="text-sm text-gray-600">Etsy Shop ID: {shop.etsyShopId}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedules */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">⏰ Schedules</h2>
              <div className="space-y-4">
                {data.schedules.map((schedule: any) => (
                  <div
                    key={schedule.scheduleId}
                    className={`border-l-4 ${
                      schedule.willSync
                        ? "border-green-500 bg-green-50"
                        : schedule.enabled
                        ? "border-yellow-500 bg-yellow-50"
                        : "border-gray-300 bg-gray-50"
                    } p-4 rounded`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{schedule.shopName}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Etsy Shop ID: {schedule.etsyShopId}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {schedule.enabled ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            ENABLED
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                            DISABLED
                          </span>
                        )}
                        {schedule.willSync && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            WILL SYNC
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-gray-600">Timezone:</span>{" "}
                        <span className="font-medium">{schedule.timezone}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Scheduled Time:</span>{" "}
                        <span className="font-medium">{schedule.scheduledTime}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Current Local Time:</span>{" "}
                        <span className="font-medium">{schedule.currentLocalTime}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Current Date:</span>{" "}
                        <span className="font-medium">{schedule.currentDate}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Last Synced:</span>{" "}
                        <span className="font-medium">
                          {schedule.lastSyncedDate || "Never"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Is Due:</span>{" "}
                        <span className={schedule.isDue ? "text-green-600" : "text-red-600"}>
                          {schedule.isDue ? "✓ Yes" : "✗ No"}
                        </span>
                      </div>
                    </div>

                    {schedule.alreadySyncedToday && (
                      <div className="mt-2 text-sm text-orange-600">
                        ⚠️ Already synced today
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Raw JSON */}
            <details className="bg-white rounded-lg shadow p-6">
              <summary className="text-xl font-semibold cursor-pointer">
                🔍 Raw JSON Response
              </summary>
              <pre className="mt-4 bg-gray-100 p-4 rounded overflow-x-auto text-xs">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
