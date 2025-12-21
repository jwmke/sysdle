import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // eslint-disable-next-line no-undef
    const supabaseUrl = process.env.SUPABASE_URL
    // eslint-disable-next-line no-undef
    const supabaseKey = process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey })
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'Missing Supabase credentials'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('daily_games')
      .select('*')
      .eq('date', today)
      .maybeSingle()

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to fetch daily game', details: error.message })
    }

    if (!data) {
      console.log('No game found for date:', today)
      return res.status(404).json({
        error: 'No game found for today',
        date: today,
        hint: 'Please insert a game for this date in Supabase'
      })
    }

    return res.status(200).json({
      date: data.date,
      components: data.components,
      nodes: data.nodes,
      title: data.title
    })
  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
