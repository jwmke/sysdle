# Supabase Setup Instructions

## 1. Create a Supabase Project
1. Go to https://supabase.com
2. Sign in and create a new project
3. Note your project URL and anon/public key

## 2. Create the `daily_games` Table

Run this SQL in the Supabase SQL Editor:

```sql
CREATE TABLE daily_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  title TEXT NOT NULL,
  components JSONB NOT NULL,
  nodes JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index on date for faster queries
CREATE INDEX idx_daily_games_date ON daily_games(date);

-- Enable Row Level Security
ALTER TABLE daily_games ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON daily_games
  FOR SELECT
  USING (true);
```

## 3. Insert Sample Data

```sql
INSERT INTO daily_games (date, title, components, nodes) VALUES (
  CURRENT_DATE,
  'design x for 10m users',
  '["Load Balancer", "NoSQL DB", "SQL DB", "Cache", "Message Queue", "API Gateway", "CDN", "Auth Service"]'::jsonb,
  '[
    {"id": "1", "label": "User", "position": {"x": 250, "y": 0}, "connectsTo": ["2"], "mystery": false},
    {"id": "2", "label": "CDN", "position": {"x": 250, "y": 80}, "connectsTo": ["3"], "mystery": true},
    {"id": "3", "label": "Load Balancer", "position": {"x": 250, "y": 160}, "connectsTo": ["4", "5"], "mystery": false},
    {"id": "4", "label": "API Server", "position": {"x": 150, "y": 260}, "connectsTo": ["6", "7", "8"], "mystery": false},
    {"id": "5", "label": "API Server", "position": {"x": 350, "y": 260}, "connectsTo": ["6", "7", "8"], "mystery": false},
    {"id": "6", "label": "Cache", "position": {"x": 100, "y": 380}, "connectsTo": [], "mystery": true},
    {"id": "7", "label": "SQL DB", "position": {"x": 250, "y": 380}, "connectsTo": [], "mystery": true},
    {"id": "8", "label": "Object Storage", "position": {"x": 400, "y": 380}, "connectsTo": [], "mystery": false}
  ]'::jsonb
);
```

## 4. Set Environment Variables in Vercel

In your Vercel project settings, add these environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon/public key

## 5. Data Structure

Each daily game should have:
- `date`: YYYY-MM-DD format (e.g., "2024-12-13")
- `title`: Text shown at top of canvas (e.g., "design x for 10m users")
- `components`: Array of 8 component names available in the sidebar
- `nodes`: Array of node objects with structure:
  - `id`: Unique identifier
  - `label`: Component name or "???" for mystery nodes
  - `position`: {x, y} coordinates
  - `mystery`: boolean (true for mystery nodes)
  - `connectsTo`: array of node IDs this node connects to
