# Daily Puzzle Generator - Deployment Guide

This Supabase Edge Function generates daily Sysdle puzzles automatically using Claude AI. It runs once per day and creates a puzzle for 7 days in the future, giving you time to review before it goes live.

## Features

- ✅ Generates system design puzzles using Claude Sonnet 4
- ✅ Checks for duplicate titles across all existing puzzles
- ✅ Ensures variety by avoiding similar topics from the last 7 days
- ✅ Varies puzzle complexity (5-15 nodes based on system complexity)
- ✅ Validates puzzle structure (5-15 nodes, 3 mystery nodes, 8 components)
- ✅ **Automatic retry** - retries up to 3 times if puzzle is duplicate or too similar
- ✅ Runs automatically via Supabase cron job
- ✅ 7-day offset allows manual review before puzzles go live

## Prerequisites

1. Supabase project with the `daily_games` table set up
2. Claude API key (from https://console.anthropic.com)
3. Supabase CLI installed: `npm install -g supabase`

## Setup Instructions

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

You can find your project ref in your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### 4. Set Environment Variables (Secrets)

You need to set the `ANTHROPIC_API_KEY` secret:

```bash
supabase secrets set ANTHROPIC_API_KEY=your_claude_api_key_here
```

The function also uses these built-in Supabase environment variables (automatically available):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 5. Deploy the Edge Function

From your project root directory:

```bash
supabase functions deploy generate-daily-puzzle
```

### 6. Set Up the Cron Job

In your Supabase SQL Editor, run this to create a daily cron job:

```sql
-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job that runs daily at 2 AM UTC
SELECT cron.schedule(
  'generate-daily-puzzle',      -- job name
  '0 2 * * *',                   -- cron expression: 2 AM UTC daily
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

**Replace:**
- `YOUR_SUPABASE_URL` with your Supabase project URL (e.g., `https://abcdefghijk.supabase.co`)
- `YOUR_SERVICE_ROLE_KEY` with your Supabase service role key (found in Project Settings → API)

**Alternative cron schedules:**
- `0 2 * * *` - 2 AM UTC daily
- `0 0 * * *` - Midnight UTC daily
- `0 */6 * * *` - Every 6 hours (for testing)

### 7. Verify the Cron Job

Check that the cron job was created:

```sql
SELECT * FROM cron.job;
```

### 8. Test the Function Manually

You can test the function manually before setting up the cron job:

```bash
supabase functions invoke generate-daily-puzzle
```

Or via curl:

```bash
curl -X POST \
  'YOUR_SUPABASE_URL/functions/v1/generate-daily-puzzle' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

## How It Works

1. **Daily Trigger**: The cron job runs at 2 AM UTC every day
2. **Target Date**: Generates a puzzle for 7 days in the future
3. **Duplicate Check**: Queries all existing puzzle titles to avoid duplicates
4. **Variety Check**: Checks last 7 puzzles to avoid similar topics (e.g., no TikTok followed by YouTube Shorts)
5. **Claude Generation**: Calls Claude Sonnet 4 with a detailed prompt to generate the puzzle
6. **Validation**: Ensures the puzzle has 5-15 nodes (varies by complexity), 3 mystery nodes, and 8 components
7. **Retry Logic**: If validation fails (duplicate or too similar), automatically retries up to 3 times
8. **Database Insert**: Saves the validated puzzle to the `daily_games` table

## Puzzle Complexity Variation

The system automatically varies puzzle complexity by adjusting the number of nodes:
- **Simple (5-7 nodes)**: URL shortener, pastebin, polling systems
- **Medium (8-10 nodes)**: Instagram, Twitter, basic e-commerce
- **Complex (11-15 nodes)**: Netflix, Uber, distributed systems with multiple data stores

## Monitoring

### View Cron Job Logs

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-daily-puzzle')
ORDER BY start_time DESC
LIMIT 10;
```

### View Edge Function Logs

In your Supabase Dashboard:
1. Go to Edge Functions
2. Click on `generate-daily-puzzle`
3. View the Logs tab

### Check Upcoming Puzzles

```sql
SELECT date, title, created_at
FROM daily_games
WHERE date > CURRENT_DATE
ORDER BY date ASC;
```

## Troubleshooting

### Function returns "Puzzle already exists"

This is normal - the function won't overwrite existing puzzles. It only creates a puzzle if one doesn't exist for the target date.

### Similarity check is too strict/loose

Edit the `areTopicsSimilar` function in `index.ts` to adjust the similarity groups.

### Want to change the offset

Change the number in the `getDateString()` call in `index.ts`:
```typescript
const targetDate = getDateString(7)  // Change 7 to desired number of days
```

### Function keeps retrying but eventually fails

Check the Edge Function logs to see which validation is failing:
- "Generated puzzle has duplicate title" - Claude picked an existing title
- "Generated puzzle is too similar to recent puzzle" - Topic similarity check failed
- The function will automatically retry up to 3 times with different prompts

If it fails all 3 attempts, the function will fail that day and try again the next day. You can also manually invoke the function to trigger another attempt.

### Delete a cron job

```sql
SELECT cron.unschedule('generate-daily-puzzle');
```

## Updating the Function

After making changes to the function code:

```bash
supabase functions deploy generate-daily-puzzle
```

The cron job will automatically use the updated function.

## Cost Considerations

- **Claude API**: Each puzzle generation attempt costs ~$0.01-0.02 per request (Sonnet 4)
- **Retry logic**: If a puzzle fails validation, it will retry up to 3 times (rare)
- **Supabase Edge Functions**: Free tier includes 500K function invocations/month
- **Typical monthly cost**: ~$0.30-0.60 for daily puzzle generation (30 days × $0.01-0.02)
- **Worst case** (if every puzzle requires 3 retries): ~$0.90-1.80/month

## Manual Puzzle Review

Since puzzles are generated 7 days in advance, you have time to review them:

```sql
-- View upcoming puzzle
SELECT * FROM daily_games
WHERE date = CURRENT_DATE + INTERVAL '7 days';

-- Update a puzzle if needed
UPDATE daily_games
SET title = 'new title',
    nodes = '...'::jsonb,
    components = '...'::jsonb
WHERE date = '2025-12-21';

-- Delete a puzzle to regenerate it
DELETE FROM daily_games WHERE date = '2025-12-21';
```

Then the next cron run will generate a new puzzle for any missing dates.
