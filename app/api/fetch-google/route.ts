import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  // STEP 1: Trade the refresh token for a live access token
  let accessToken = '';
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID!.trim(),
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!.trim(),
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!.trim(),
        grant_type: 'refresh_token',
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
       return NextResponse.json({ error: "Google rejected the keys", details: tokenData });
    }
    accessToken = tokenData.access_token;
    
  } catch (error: any) {
    return NextResponse.json({ error: "Crash at Step 1 (Token Connection)", details: error.message });
  }

  // STEP 2: Ask Google Ads for the data
  let adsData;
  try {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!.replace(/-/g, '').trim();
    const managerId = process.env.GOOGLE_ADS_MANAGER_ID!.replace(/-/g, '').trim();
    
    const query = `
      SELECT 
        campaign.id, 
        campaign.name, 
        segments.date, 
        metrics.cost_micros, 
        metrics.conversions 
      FROM campaign 
      WHERE segments.date DURING LAST_30_DAYS
    `;

    const adsResponse = await fetch(`https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!.trim(),
        // FIX: We pass the Manager ID as the master key to get through the door
        'login-customer-id': managerId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    adsData = await adsResponse.json();
    
    if (adsData.error) {
      return NextResponse.json({ error: "Crash at Step 2 (Google Ads Data)", details: adsData.error });
    }

  } catch (error: any) {
    return NextResponse.json({ error: "Crash at Step 2 (Network Fetch)", details: error.message });
  }

  // STEP 3: Save to Database
  try {
    let rowsSaved = 0;
    const results = adsData.results || [];
    
    for (const row of results) {
      const dateStr = row.segments?.date;
      const campaignId = row.campaign?.id;
      const campaignName = row.campaign?.name;
      
      const spendAmount = (row.metrics?.costMicros / 1000000) || 0;
      const leadsCount = row.metrics?.conversions || 0;

      if (dateStr && campaignId) {
        await supabase.from('google_campaign_data').upsert({ 
          date: dateStr, 
          campaign_id: campaignId,
          campaign_name: campaignName,
          leads: Math.round(leadsCount), 
          spend: spendAmount 
        });
        rowsSaved++;
      }
    }

    return NextResponse.json({ success: true, message: `Successfully saved ${rowsSaved} rows of Google Ads data!` });

  } catch (error: any) {
    return NextResponse.json({ error: "Crash at Step 3 (Database processing)", details: error.message });
  }
}