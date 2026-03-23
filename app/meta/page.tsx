'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MetaDeepDive() {
  const [allData, setAllData] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('All Campaigns');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from('meta_campaign_data')
        .select('*')
        .order('date', { ascending: true });
      if (data) setAllData(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="p-10 text-center text-slate-500">
        Loading Dashboard...
      </div>
    );

  // Filter Dropdown
  const campaigns = [
    'All Campaigns',
    ...Array.from(new Set(allData.map((d) => d.campaign_name))),
  ];
  const filteredData =
    selectedCampaign === 'All Campaigns'
      ? allData
      : allData.filter((d) => d.campaign_name === selectedCampaign);

  // Group by date
  const groupedByDate = filteredData.reduce((acc: any, curr: any) => {
    if (!acc[curr.date])
      acc[curr.date] = { date: curr.date, leads: 0, spend: 0 };
    acc[curr.date].leads += curr.leads;
    acc[curr.date].spend += curr.spend;
    return acc;
  }, {});

  // Generate a perfect calendar of the last 60 days ending exactly "yesterday"
  const past60Days = Array.from({ length: 60 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (60 - i));
    return d.toISOString().split('T')[0];
  });

  // Map the grouped data onto our perfect calendar. If a day is missing, it gets 0.
  const dailyData = past60Days.map((dateStr) => {
    const existing = groupedByDate[dateStr] || {
      date: dateStr,
      leads: 0,
      spend: 0,
    };
    const spend = Math.round(existing.spend);
    const leads = existing.leads;
    return {
      date: dateStr,
      leads: leads,
      spend: spend,
      cpl: leads > 0 ? Math.round(spend / leads) : 0,
    };
  });

  // Now our math is perfectly aligned to the calendar
  const yesterday = dailyData[dailyData.length - 1];

  const last3Days = dailyData.slice(-3);
  const avg3dLeads = Math.round(
    last3Days.reduce((sum, d) => sum + d.leads, 0) / 3
  );
  const avg3dSpend = Math.round(
    last3Days.reduce((sum, d) => sum + d.spend, 0) / 3
  );
  const avg3dCpl = Math.round(last3Days.reduce((sum, d) => sum + d.cpl, 0) / 3);

  const peakLeads60d = Math.max(...dailyData.map((d) => d.leads));

  // Find min values greater than 0 (ignore the 0 days for your "best" metrics)
  const cplArray = dailyData.filter((d) => d.cpl > 0).map((d) => d.cpl);
  const minCpl60d = cplArray.length ? Math.min(...cplArray) : 0;

  const spendArray = dailyData.filter((d) => d.spend > 0).map((d) => d.spend);
  const minSpend60d = spendArray.length ? Math.min(...spendArray) : 0;

  const last7DaysGraph = dailyData.slice(-7);

  // Dynamic AI Insight Logic
  let aiMessage = 'Gathering enough data to analyze trends...';
  if (yesterday.leads > 0 && avg3dLeads > 0) {
    if (yesterday.leads > avg3dLeads && yesterday.cpl < avg3dCpl) {
      aiMessage = `Strong performance detected. Yesterday's leads (${yesterday.leads}) beat the recent average, and your cost per lead dropped to ₹${yesterday.cpl}. Whatever creatives are running right now are highly effective.`;
    } else if (yesterday.leads < avg3dLeads && yesterday.cpl > avg3dCpl) {
      aiMessage = `Attention needed. Lead volume is dropping below average, and your CPL has spiked to ₹${yesterday.cpl}. Consider checking if specific campaigns have maxed out their audience and need fresh ad copy.`;
    } else {
      aiMessage = `Performance is holding steady. You secured ${yesterday.leads} leads at ₹${yesterday.cpl} each, keeping things perfectly in line with your 3-day baseline.`;
    }
  } else if (yesterday.leads === 0) {
    aiMessage = `Alert: Zero leads recorded for yesterday. Verify if campaigns were paused or if the budget ran out.`;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Meta Ads Dashboard
            </h1>
            <p className="text-slate-500 mt-1">Detailed Breakdown</p>
          </div>
          <select
            className="bg-white border border-slate-300 px-4 py-2 rounded-lg shadow-sm font-medium outline-none cursor-pointer"
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
          >
            {campaigns.map((c) => (
              <option key={c as string} value={c as string}>
                {c as string}
              </option>
            ))}
          </select>
        </div>

        {/* SECTION 1: Quick Info Header */}
        <div className="grid grid-cols-3 gap-6">
          <TopCard
            title="Yesterday's Leads"
            value={yesterday.leads}
            color="text-blue-600"
          />
          <TopCard
            title="Yesterday's CPL"
            value={`₹${yesterday.cpl}`}
            color="text-green-600"
          />
          <TopCard
            title="Yesterday's Spend"
            value={`₹${yesterday.spend}`}
            color="text-orange-600"
          />
        </div>

        {/* SECTION 2: Leads Breakdown */}
        <DataRow
          title="Lead Generation"
          metric1={{ label: 'Yesterday', value: yesterday.leads }}
          metric2={{ label: '3-Day Avg', value: avg3dLeads }}
          metric3={{ label: '60-Day Peak', value: peakLeads60d }}
          graphData={last7DaysGraph}
          dataKey="leads"
          lineColor="#3b82f6"
        />

        {/* SECTION 3: CPL Breakdown */}
        <DataRow
          title="Cost Per Lead (CPL)"
          metric1={{ label: 'Yesterday', value: `₹${yesterday.cpl}` }}
          metric2={{ label: '3-Day Avg', value: `₹${avg3dCpl}` }}
          metric3={{ label: '60-Day Best', value: `₹${minCpl60d}` }}
          graphData={last7DaysGraph}
          dataKey="cpl"
          lineColor="#10b981"
        />

        {/* SECTION 4: Amount Spent Breakdown */}
        <DataRow
          title="Amount Spent"
          metric1={{ label: 'Yesterday', value: `₹${yesterday.spend}` }}
          metric2={{ label: '3-Day Avg', value: `₹${avg3dSpend}` }}
          metric3={{ label: '60-Day Low', value: `₹${minSpend60d}` }}
          graphData={last7DaysGraph}
          dataKey="spend"
          lineColor="#f97316"
        />

        {/* Dynamic AI Insight Box */}
        <div className="bg-blue-600 p-6 rounded-xl shadow-md text-white">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <span className="bg-blue-400/30 p-1.5 rounded-lg">✨</span> AI
            Insights
          </h3>
          <p className="text-blue-50 text-lg leading-relaxed">{aiMessage}</p>
        </div>
      </div>
    </div>
  );
}

function TopCard({ title, value, color }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
        {title}
      </p>
      <p className={`text-4xl font-black mt-2 ${color}`}>{value}</p>
    </div>
  );
}

function DataRow({
  title,
  metric1,
  metric2,
  metric3,
  graphData,
  dataKey,
  lineColor,
}: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold mb-6 border-b pb-2">{title}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        <div className="grid grid-cols-1 gap-6">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg">
            <span className="text-slate-600 font-medium">{metric1.label}</span>
            <span className="text-2xl font-bold">{metric1.value}</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg">
            <span className="text-slate-600 font-medium">{metric2.label}</span>
            <span className="text-xl font-bold text-slate-700">
              {metric2.value}
            </span>
          </div>
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg">
            <span className="text-slate-600 font-medium">{metric3.label}</span>
            <span className="text-xl font-bold text-slate-700">
              {metric3.value}
            </span>
          </div>
        </div>

        <div className="lg:col-span-2 h-64 w-full">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 text-right">
            Last 7 Days
          </p>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={graphData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(val) => val.split('-').slice(1).join('/')}
              />
              <YAxis tick={{ fontSize: 12 }} width={40} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={lineColor}
                fill={lineColor}
                fillOpacity={0.1}
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
