"use client";
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function GoogleDeepDive() {
  const [allData, setAllData] = useState<any[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSavedToast, setShowSavedToast] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from('google_campaign_data')
        .select('*')
        .order('date', { ascending: true });
        
      if (data) {
        setAllData(data);
        
        const uniqueCampaigns = Array.from(new Set(data.map(d => d.campaign_name as string)));
        
        // Check local storage for saved defaults
        const savedDefaultsStr = localStorage.getItem('nsg_google_defaults');
        
        if (savedDefaultsStr) {
          const savedDefaults = JSON.parse(savedDefaultsStr);
          // Make sure the saved campaigns actually still exist in the latest data
          const activeDefaults = uniqueCampaigns.filter(c => savedDefaults.includes(c));
          setSelectedCampaigns(activeDefaults.length > 0 ? activeDefaults : uniqueCampaigns);
        } else {
          // If no defaults saved yet, select everything
          setSelectedCampaigns(uniqueCampaigns);
        }
      }
      setLoading(false);
    }
    fetchData();

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-500">Loading Google Ads Dashboard...</div>;

  const allAvailableCampaigns = Array.from(new Set(allData.map(d => d.campaign_name as string)));
  const filteredData = allData.filter(d => selectedCampaigns.includes(d.campaign_name));

  const groupedByDate = filteredData.reduce((acc: any, curr: any) => {
    if (!acc[curr.date]) acc[curr.date] = { date: curr.date, leads: 0, spend: 0 };
    acc[curr.date].leads += curr.leads;
    acc[curr.date].spend += curr.spend;
    return acc;
  }, {});

  const past60Days = Array.from({ length: 60 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (60 - i)); 
    return d.toISOString().split('T')[0];
  });

  const dailyData = past60Days.map(dateStr => {
    const existing = groupedByDate[dateStr] || { date: dateStr, leads: 0, spend: 0 };
    const spend = Math.round(existing.spend);
    const leads = existing.leads;
    return {
      date: dateStr,
      leads: leads,
      spend: spend,
      cpl: leads > 0 ? Math.round(spend / leads) : 0
    };
  });

  const yesterday = dailyData[dailyData.length - 1]; 
  const last3Days = dailyData.slice(-3);
  const avg3dLeads = Math.round(last3Days.reduce((sum, d) => sum + d.leads, 0) / 3);
  const avg3dSpend = Math.round(last3Days.reduce((sum, d) => sum + d.spend, 0) / 3);
  const avg3dCpl = Math.round(last3Days.reduce((sum, d) => sum + d.cpl, 0) / 3);

  const peakLeads60d = dailyData.length ? Math.max(...dailyData.map(d => d.leads)) : 0;
  
  const cplArray = dailyData.filter(d => d.cpl > 0).map(d => d.cpl);
  const minCpl60d = cplArray.length ? Math.min(...cplArray) : 0;
  
  const spendArray = dailyData.filter(d => d.spend > 0).map(d => d.spend);
  const minSpend60d = spendArray.length ? Math.min(...spendArray) : 0;

  const last7DaysGraph = dailyData.slice(-7);

  let aiMessage = "Gathering enough data to analyze Google search trends...";
  if (yesterday.leads > 0 && avg3dLeads > 0) {
    if (yesterday.leads > avg3dLeads && yesterday.cpl < avg3dCpl) {
      aiMessage = `Strong search intent detected. Yesterday's leads (${yesterday.leads}) beat the recent average, and your cost per lead dropped to ₹${yesterday.cpl}. Your current target keywords are highly effective.`;
    } else if (yesterday.leads < avg3dLeads && yesterday.cpl > avg3dCpl) {
      aiMessage = `Attention needed. Lead volume from search is dropping below average, and CPL has spiked to ₹${yesterday.cpl}. Consider checking if competitors are outbidding your top performing keywords.`;
    } else {
      aiMessage = `Search performance is holding steady. You secured ${yesterday.leads} leads at ₹${yesterday.cpl} each, keeping things perfectly in line with your 3-day baseline.`;
    }
  } else if (yesterday.leads === 0) {
    aiMessage = `Alert: Zero leads recorded for yesterday. Verify if Google Ads campaigns were paused, if the budget ran out, or if search volume dropped unexpectedly.`;
  }

  // UI Handlers
  const handleToggleCampaign = (campaignName: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignName) 
        ? prev.filter(c => c !== campaignName) 
        : [...prev, campaignName] 
    );
  };

  const handleSelectAll = () => setSelectedCampaigns(allAvailableCampaigns);
  const handleClearAll = () => setSelectedCampaigns([]);

  // Save to Local Storage
  const handleSaveDefault = () => {
    localStorage.setItem('nsg_google_defaults', JSON.stringify(selectedCampaigns));
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Google Ads Dashboard</h1>
            <p className="text-slate-500 mt-1">Search & Display Breakdown</p>
          </div>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-white border border-slate-300 px-5 py-2.5 rounded-lg shadow-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              Filter Campaigns 
              <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full">
                {selectedCampaigns.length}
              </span>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                
                {/* NEW DROPDOWN HEADER WITH SAVE BUTTON */}
                <div className="flex justify-between items-center p-3 border-b bg-slate-50">
                  <div className="space-x-3">
                    <button onClick={handleSelectAll} className="text-xs font-bold text-emerald-600 hover:text-emerald-800">Select All</button>
                    <button onClick={handleClearAll} className="text-xs font-bold text-slate-400 hover:text-slate-600">Clear All</button>
                  </div>
                  <button 
                    onClick={handleSaveDefault} 
                    className={`text-xs font-bold px-2 py-1 rounded transition-colors ${showSavedToast ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                  >
                    {showSavedToast ? '✓ Saved!' : 'Save as Default'}
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto p-2">
                  {allAvailableCampaigns.map(c => (
                    <label key={c} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        checked={selectedCampaigns.includes(c)}
                        onChange={() => handleToggleCampaign(c)}
                      />
                      <span className="text-sm font-medium text-slate-700 leading-tight">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 1: Quick Info Header */}
        <div className="grid grid-cols-3 gap-6">
          <TopCard title="Yesterday's Leads" value={yesterday.leads} color="text-emerald-600" />
          <TopCard title="Yesterday's CPL" value={`₹${yesterday.cpl}`} color="text-indigo-600" />
          <TopCard title="Yesterday's Spend" value={`₹${yesterday.spend}`} color="text-rose-600" />
        </div>

        {/* SECTION 2: Leads Breakdown */}
        <DataRow 
          title="Lead Generation"
          metric1={{ label: "Yesterday", value: yesterday.leads }}
          metric2={{ label: "3-Day Avg", value: avg3dLeads }}
          metric3={{ label: "60-Day Peak", value: peakLeads60d }}
          graphData={last7DaysGraph}
          dataKey="leads"
          lineColor="#059669"
        />

        {/* SECTION 3: CPL Breakdown */}
        <DataRow 
          title="Cost Per Lead (CPL)"
          metric1={{ label: "Yesterday", value: `₹${yesterday.cpl}` }}
          metric2={{ label: "3-Day Avg", value: `₹${avg3dCpl}` }}
          metric3={{ label: "60-Day Best", value: `₹${minCpl60d}` }}
          graphData={last7DaysGraph}
          dataKey="cpl"
          lineColor="#4f46e5"
        />

        {/* SECTION 4: Amount Spent Breakdown */}
        <DataRow 
          title="Amount Spent"
          metric1={{ label: "Yesterday", value: `₹${yesterday.spend}` }}
          metric2={{ label: "3-Day Avg", value: `₹${avg3dSpend}` }}
          metric3={{ label: "60-Day Low", value: `₹${minSpend60d}` }}
          graphData={last7DaysGraph}
          dataKey="spend"
          lineColor="#e11d48"
        />

        {/* Dynamic AI Insight Box */}
        <div className="bg-emerald-700 p-6 rounded-xl shadow-md text-white">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <span className="bg-emerald-500/30 p-1.5 rounded-lg">✨</span> AI Insights
          </h3>
          <p className="text-emerald-50 text-lg leading-relaxed">{aiMessage}</p>
        </div>

      </div>
    </div>
  );
}

function TopCard({ title, value, color }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</p>
      <p className={`text-4xl font-black mt-2 ${color}`}>{value}</p>
    </div>
  );
}

function DataRow({ title, metric1, metric2, metric3, graphData, dataKey, lineColor }: any) {
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
            <span className="text-xl font-bold text-slate-700">{metric2.value}</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg">
            <span className="text-slate-600 font-medium">{metric3.label}</span>
            <span className="text-xl font-bold text-slate-700">{metric3.value}</span>
          </div>
        </div>

        <div className="lg:col-span-2 h-64 w-full">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 text-right">Last 7 Days</p>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{fontSize: 12}} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
              <YAxis tick={{fontSize: 12}} width={40} />
              <Tooltip />
              <Area type="monotone" dataKey={dataKey} stroke={lineColor} fill={lineColor} fillOpacity={0.1} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}