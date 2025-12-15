# Automated Daily Puzzle Generation Setup

This guide helps you set up automated daily puzzle generation for Sysdle using Supabase Edge Functions and Claude AI.

## Quick Start

1. **Get a Claude API Key**
   - Go to https://console.anthropic.com
   - Create an account and generate an API key
   - You'll need this for step 4

2. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

3. **Login and Link Project**
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```

   Find your project ref in your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

4. **Set the Claude API Key as a Secret**
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=your_claude_api_key_here
   ```

5. **Deploy the Edge Function**
   ```bash
   supabase functions deploy generate-daily-puzzle
   ```

6. **Test It Manually First**
   ```bash
   supabase functions invoke generate-daily-puzzle
   ```

   This should generate a puzzle for 7 days from now. Check your `daily_games` table in Supabase to see it.

7. **Set Up Daily Cron Job**

   In your Supabase SQL Editor, run:

   ```sql
   -- Enable the pg_cron extension
   CREATE EXTENSION IF NOT EXISTS pg_cron;

   -- Create a cron job that runs daily at 2 AM UTC
   SELECT cron.schedule(
     'generate-daily-puzzle',
     '0 2 * * *',
     $$
     SELECT
       net.http_post(
         url := 'YOUR_SUPABASE_URL/functions/v1/generate-daily-puzzle',
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
         ),
         body := '{}'::jsonb
       ) as request_id;
     $$
   );
   ```

   **Replace these values:**
   - `YOUR_SUPABASE_URL` - Found in Project Settings → API (e.g., `https://abcdefg.supabase.co`)
   - `YOUR_SERVICE_ROLE_KEY` - Found in Project Settings → API → service_role key (secret)

## What This Does

- **Runs daily at 2 AM UTC** to generate tomorrow's puzzle
- **Generates puzzles 7 days in advance** so you can review them before they go live
- **Prevents duplicates** by checking all existing puzzle titles
- **Ensures variety** by avoiding similar topics from the last 7 days
- **Varies complexity** by using 5-15 nodes depending on system complexity (simple to complex)
  - Example: Won't generate "YouTube Shorts" right after "TikTok"
  - Similar topics: Twitter/X/Threads, Uber/Lyft/DoorDash, Netflix/YouTube/Twitch, etc.
- **Validates puzzle structure** (5-15 nodes, 3 mystery nodes, 8 components)
- **Auto-retries** up to 3 times if puzzle is duplicate or too similar to recent ones
- **Uses Claude Sonnet 4** to generate realistic system design puzzles

## Puzzle Complexity

The generator creates puzzles with varying complexity:
- **Simple (5-7 nodes)**: URL shortener, pastebin, polling systems
- **Medium (8-10 nodes)**: Instagram, Twitter, basic e-commerce
- **Complex (11-15 nodes)**: Netflix, Uber, distributed systems

## Reviewing Generated Puzzles

Since puzzles are created 7 days in advance, you can review them:

```sql
-- View upcoming puzzles
SELECT date, title, created_at
FROM daily_games
WHERE date > CURRENT_DATE
ORDER BY date ASC;

-- View a specific upcoming puzzle
SELECT *
FROM daily_games
WHERE date = CURRENT_DATE + INTERVAL '7 days';
```

## Modifying a Generated Puzzle

If you want to edit a puzzle before it goes live:

```sql
UPDATE daily_games
SET
  title = 'design Spotify for 200M users',
  components = '["CDN", "PostgreSQL", "Redis Cache", "S3", "Load Balancer", "Kafka", "Elasticsearch", "Auth Service"]'::jsonb,
  nodes = '[...]'::jsonb  -- your modified nodes array
WHERE date = '2025-12-21';
```

## Regenerating a Puzzle

If you want the cron job to generate a new puzzle for a specific date:

```sql
-- Delete the puzzle (next cron run will generate a new one)
DELETE FROM daily_games WHERE date = '2025-12-21';
```

## Monitoring

### Check if cron job is running:
```sql
SELECT * FROM cron.job WHERE jobname = 'generate-daily-puzzle';
```

### View recent cron job executions:
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-daily-puzzle')
ORDER BY start_time DESC
LIMIT 10;
```

### View Edge Function logs:
- Go to Supabase Dashboard → Edge Functions → generate-daily-puzzle → Logs

## Stopping the Cron Job

If you need to pause automated generation:

```sql
SELECT cron.unschedule('generate-daily-puzzle');
```

To restart it, run the cron.schedule SQL command again.

## Cost Estimate

- **Claude API**: ~$0.01-0.02 per puzzle (using Sonnet 4)
- **Monthly**: ~$0.30-0.60 (30 puzzles)
- **Supabase Edge Functions**: Free tier includes 500K invocations/month

## Troubleshooting

### "Missing required environment variables"
- Make sure you set the ANTHROPIC_API_KEY secret: `supabase secrets set ANTHROPIC_API_KEY=sk-...`

### "Puzzle already exists for target date"
- This is normal behavior - the function won't overwrite existing puzzles
- Delete the puzzle if you want to regenerate it

### Generated puzzle is too similar to recent ones
- The function automatically checks the last 7 days for similar topics
- Edit the `areTopicsSimilar` function in the code to adjust similarity rules

### Want to change the schedule
- Modify the cron expression: `'0 2 * * *'`
  - `0 0 * * *` - Midnight UTC
  - `0 */6 * * *` - Every 6 hours
  - `0 12 * * *` - Noon UTC

## Full Documentation

See `supabase/functions/generate-daily-puzzle/README.md` for detailed documentation.
