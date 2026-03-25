import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  // We added &limit=1000 so Facebook doesn't hide your campaigns
  const url = `https://graph.facebook.com/v19.0/act_${process.env.META_ACCOUNT_ID}/insights?date_preset=last_30d&time_increment=1&level=campaign&fields=campaign_name,campaign_id,spend,actions&limit=1000&access_token=${process.env.META_TOKEN}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.data) {
    return NextResponse.json({ error: 'Something went wrong', details: data });
  }

  let rowsSaved = 0;

  for (const day of data.data) {
    const actions = day.actions || [];

    // This adds both website leads and form leads together for the total
    let leadsCount = 0;
    for (const action of actions) {
      if (
        action.action_type === 'lead' ||
        action.action_type === 'onsite_conversion.lead_ads'
      ) {
        leadsCount += parseInt(action.value);
      }
    }

    const spendAmount = parseFloat(day.spend || 0);
    const dateStr = day.date_start;

    await supabase.from('meta_campaign_data').upsert({
      date: dateStr,
      campaign_id: day.campaign_id,
      campaign_name: day.campaign_name,
      leads: leadsCount,
      spend: spendAmount,
    });

    rowsSaved++;
  }

  return NextResponse.json({
    success: true,
    message: `Successfully saved ${rowsSaved} rows of campaign data!`,
  });
}
