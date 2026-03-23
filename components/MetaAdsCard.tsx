'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MetaAdsCard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      const { data: metrics } = await supabase
        .from('meta_dashboard_metrics')
        .select('*')
        .single();
      setData(metrics);
    }
    loadData();
  }, []);

  if (!data) return <div className="p-6 text-gray-500">Loading metrics...</div>;

  return (
    <div className="max-w-md p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Meta Ads</h2>
        <span className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full">
          Leads
        </span>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-500 uppercase tracking-wide">
          Yesterday
        </p>
        <p className="text-4xl font-black text-gray-900">
          {data.leads_yesterday || 0}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">3-Day Avg</p>
          <p className="text-lg font-bold text-gray-800">
            {data.avg_leads_3d || 0}
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">7-Day Avg</p>
          <p className="text-lg font-bold text-gray-800">
            {data.avg_leads_7d || 0}
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg col-span-2 flex justify-between items-center">
          <p className="text-sm text-gray-600 font-medium">3-Month Peak</p>
          <p className="text-xl font-bold text-green-600">
            {data.peak_leads_3m || 0}
          </p>
        </div>
      </div>
    </div>
  );
}
