import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkResults() {
  console.log('Checking test results in Supabase...\n');
  
  // Check for the test market
  const { data: markets, error: marketsError } = await supabase
    .from('markets')
    .select('*')
    .eq('market_address', 'TestMarket11111111111111111111111111111')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (marketsError) {
    console.error('Error fetching markets:', marketsError);
  } else {
    console.log('✅ Markets found:', markets?.length || 0);
    if (markets && markets.length > 0) {
      console.log('Latest market:', JSON.stringify(markets[0], null, 2));
    }
  }
  
  // Check for test position
  const { data: positions, error: positionsError } = await supabase
    .from('user_positions')
    .select('*')
    .eq('market_address', 'TestMarket11111111111111111111111111111')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (positionsError) {
    console.error('Error fetching positions:', positionsError);
  } else {
    console.log('\n✅ Positions found:', positions?.length || 0);
    if (positions && positions.length > 0) {
      console.log('Latest position:', JSON.stringify(positions[0], null, 2));
    }
  }
  
  // Check for test trade
  const { data: trades, error: tradesError } = await supabase
    .from('trades')
    .select('*')
    .eq('market_address', 'TestMarket11111111111111111111111111111')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (tradesError) {
    console.error('Error fetching trades:', tradesError);
  } else {
    console.log('\n✅ Trades found:', trades?.length || 0);
    if (trades && trades.length > 0) {
      console.log('Latest trade:', JSON.stringify(trades[0], null, 2));
    }
  }
}

checkResults().then(() => process.exit(0)).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
