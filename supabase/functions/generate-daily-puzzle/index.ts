import { createClient } from 'jsr:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@^0.32.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DailyGame {
  date: string
  title: string
  components: string[]
  nodes: Array<{
    id: string
    label: string
    position: { x: number; y: number }
    connectsTo: string[]
    mystery: boolean
  }>
}

interface GeneratedPuzzle {
  title: string
  components: string[]
  nodes: Array<{
    id: string
    label: string
    position: { x: number; y: number }
    connectsTo: string[]
    mystery: boolean
  }>
}

// Helper to get date string YYYY-MM-DD
function getDateString(daysOffset: number = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Check if two topics are too similar
function areTopicsSimilar(topic1: string, topic2: string): boolean {
  const similar = [
    ['tiktok', 'youtube shorts', 'instagram reels', 'shorts'],
    ['twitter', 'x', 'mastodon', 'threads'],
    ['instagram', 'snapchat', 'facebook'],
    ['uber', 'lyft', 'doordash', 'grubhub'],
    ['netflix', 'youtube', 'twitch', 'spotify'],
    ['whatsapp', 'telegram', 'signal', 'discord', 'slack'],
    ['airbnb', 'booking.com', 'expedia'],
  ]

  const t1 = topic1.toLowerCase()
  const t2 = topic2.toLowerCase()

  for (const group of similar) {
    const t1InGroup = group.some(keyword => t1.includes(keyword))
    const t2InGroup = group.some(keyword => t2.includes(keyword))
    if (t1InGroup && t2InGroup) return true
  }

  return false
}

// Check if all nodes are reachable from the User node (no isolated islands)
function hasIsolatedNodes(nodes: GeneratedPuzzle['nodes']): boolean {
  // Find the User node (should be id "1")
  const userNode = nodes.find(n => n.label === 'User' || n.id === '1')
  if (!userNode) return true // No user node means isolated

  // Build adjacency map (bidirectional - a connection either way counts)
  const graph = new Map<string, Set<string>>()
  nodes.forEach(node => {
    if (!graph.has(node.id)) graph.set(node.id, new Set())
    node.connectsTo.forEach(targetId => {
      // Add forward connection
      graph.get(node.id)!.add(targetId)
      // Add backward connection for reachability check
      if (!graph.has(targetId)) graph.set(targetId, new Set())
      graph.get(targetId)!.add(node.id)
    })
  })

  // BFS from User node to find all reachable nodes
  const visited = new Set<string>()
  const queue = [userNode.id]
  visited.add(userNode.id)

  while (queue.length > 0) {
    const current = queue.shift()!
    const neighbors = graph.get(current) || new Set()

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
  }

  // If we visited all nodes, there are no isolated islands
  return visited.size !== nodes.length
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    if (!supabaseUrl || !supabaseKey || !anthropicKey) {
      throw new Error('Missing required environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    // Target date: 7 days from now
    const targetDate = getDateString(7)

    // Check if puzzle already exists for target date
    const { data: existing } = await supabase
      .from('daily_games')
      .select('date')
      .eq('date', targetDate)
      .single()

    if (existing) {
      return new Response(
        JSON.stringify({ message: 'Puzzle already exists for target date', date: targetDate }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all existing titles to avoid duplicates
    const { data: allGames, error: fetchError } = await supabase
      .from('daily_games')
      .select('title, date')
      .order('date', { ascending: false })

    if (fetchError) throw fetchError

    const existingTitles = (allGames || []).map(game => game.title)

    // Get last 7 days of puzzles for variety checking
    const recentGames = (allGames || []).slice(0, 7)
    const recentTitles = recentGames.map(game => game.title)

    // Retry logic for puzzle generation
    const MAX_RETRIES = 3
    let lastError: Error | null = null
    let generatedPuzzle: GeneratedPuzzle | null = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Attempt ${attempt} of ${MAX_RETRIES} to generate puzzle`)

        // Generate prompt for Claude
        const prompt = `You are a puzzle designer for Sysdle, a daily system design puzzle game similar to Wordle but for software engineers.

Your task is to generate ONE daily puzzle. The puzzle consists of:
1. A title: A system design challenge (e.g., "Design TikTok for 500M users", "Design Netflix", "Design a URL shortener")
2. A diagram with 5-15 nodes representing different components in a system architecture
3. A list of 8 available components players can choose from

IMPORTANT RULES:
1. The title should be a popular real-world system or a common system design interview question
2. DO NOT use these existing titles: ${existingTitles.join(', ')}
3. Avoid topics similar to recent puzzles: ${recentTitles.join(', ')}
4. Exactly 3 nodes should be mystery nodes (player must guess them)
5. The 8 available components must include all 3 mystery node answers plus 5 decoys
6. Components should be specific technical terms (e.g., "CDN", "Load Balancer", "Redis Cache", "PostgreSQL", "Kafka", "S3")
7. The diagram should represent a realistic, production-grade architecture
8. Vary the complexity by using different node counts:
   - Simple systems (5-7 nodes): URL shortener, pastebin, polling system
   - Medium systems (8-10 nodes): Instagram, Twitter, basic e-commerce
   - Complex systems (11-15 nodes): Netflix, Uber, distributed systems with multiple data stores
9. Distribute mystery nodes strategically throughout the architecture (not all at the bottom)
10. **CRITICAL**: ALL nodes must be connected - no isolated islands! Every node must be reachable from the User node
11. **VARY THE DIAGRAM SHAPE**: Don't always pyramid out. Use different architectural patterns:
    - Fan-out then converge (e.g., multiple services -> message queue -> workers -> shared DB)
    - Parallel branches (e.g., read path vs write path)
    - Layered architecture (e.g., CDN -> LB -> App -> Cache + DB -> Analytics)
    - Circular/feedback loops (e.g., API -> DB -> Analytics -> Recommendation Engine -> API)
    - Hub and spoke (e.g., API Gateway -> multiple microservices -> shared data layer)

Node positioning guidelines:
- Use a vertical flow: User at top (y: 0), components below
- Space nodes vertically by ~80-100px
- Spread horizontally when branching (150-400px range on x-axis)
- Keep diagram balanced and readable

Available component types to choose from:
- CDN, Load Balancer, API Gateway, Reverse Proxy
- API Server, Web Server, Application Server
- PostgreSQL, MySQL, MongoDB, Cassandra, DynamoDB
- Redis Cache, Memcached, In-Memory Cache
- S3, Object Storage, File Storage, Blob Storage
- Kafka, RabbitMQ, Message Queue, Event Bus
- Elasticsearch, Search Service
- Auth Service, Authentication, OAuth Server
- Rate Limiter, Circuit Breaker
- Monitoring, Logging Service
- Data Warehouse, Analytics DB
- Payment Gateway, Third-Party API

Example puzzle structure (8 nodes - medium complexity):
{
  "title": "Design Instagram for 100M users",
  "components": ["CDN", "PostgreSQL", "Redis Cache", "S3", "Load Balancer", "Kafka", "Elasticsearch", "Auth Service"],
  "nodes": [
    {"id": "1", "label": "User", "position": {"x": 250, "y": 0}, "connectsTo": ["2"], "mystery": false},
    {"id": "2", "label": "CDN", "position": {"x": 250, "y": 80}, "connectsTo": ["3"], "mystery": true},
    {"id": "3", "label": "Load Balancer", "position": {"x": 250, "y": 160}, "connectsTo": ["4"], "mystery": false},
    {"id": "4", "label": "API Server", "position": {"x": 250, "y": 240}, "connectsTo": ["5", "6", "7"], "mystery": false},
    {"id": "5", "label": "PostgreSQL", "position": {"x": 150, "y": 340}, "connectsTo": [], "mystery": true},
    {"id": "6", "label": "Redis Cache", "position": {"x": 250, "y": 340}, "connectsTo": [], "mystery": false},
    {"id": "7", "label": "S3", "position": {"x": 350, "y": 340}, "connectsTo": [], "mystery": true},
    {"id": "8", "label": "Notification Service", "position": {"x": 150, "y": 240}, "connectsTo": ["5"], "mystery": false}
  ]
}

Example puzzle structure (6 nodes - simple):
{
  "title": "Design a URL Shortener",
  "components": ["Load Balancer", "PostgreSQL", "Redis Cache", "API Gateway", "CDN", "MongoDB", "Cassandra", "Rate Limiter"],
  "nodes": [
    {"id": "1", "label": "User", "position": {"x": 250, "y": 0}, "connectsTo": ["2"], "mystery": false},
    {"id": "2", "label": "Load Balancer", "position": {"x": 250, "y": 80}, "connectsTo": ["3"], "mystery": true},
    {"id": "3", "label": "API Server", "position": {"x": 250, "y": 160}, "connectsTo": ["4", "5"], "mystery": false},
    {"id": "4", "label": "Redis Cache", "position": {"x": 150, "y": 260}, "connectsTo": [], "mystery": true},
    {"id": "5", "label": "PostgreSQL", "position": {"x": 350, "y": 260}, "connectsTo": [], "mystery": true},
    {"id": "6", "label": "Analytics Service", "position": {"x": 250, "y": 340}, "connectsTo": [], "mystery": false}
  ]
}

Example puzzle structure (10 nodes - parallel branches pattern):
{
  "title": "Design Twitter Feed",
  "components": ["CDN", "PostgreSQL", "Redis Cache", "Kafka", "Cassandra", "Elasticsearch", "S3", "Load Balancer"],
  "nodes": [
    {"id": "1", "label": "User", "position": {"x": 250, "y": 0}, "connectsTo": ["2"], "mystery": false},
    {"id": "2", "label": "CDN", "position": {"x": 250, "y": 80}, "connectsTo": ["3"], "mystery": true},
    {"id": "3", "label": "API Server", "position": {"x": 250, "y": 160}, "connectsTo": ["4", "5"], "mystery": false},
    {"id": "4", "label": "Write Service", "position": {"x": 150, "y": 260}, "connectsTo": ["6", "7"], "mystery": false},
    {"id": "5", "label": "Read Service", "position": {"x": 350, "y": 260}, "connectsTo": ["8", "9"], "mystery": false},
    {"id": "6", "label": "PostgreSQL", "position": {"x": 100, "y": 360}, "connectsTo": ["10"], "mystery": true},
    {"id": "7", "label": "Kafka", "position": {"x": 200, "y": 360}, "connectsTo": ["10"], "mystery": false},
    {"id": "8", "label": "Redis Cache", "position": {"x": 300, "y": 360}, "connectsTo": [], "mystery": false},
    {"id": "9", "label": "S3", "position": {"x": 400, "y": 360}, "connectsTo": [], "mystery": true},
    {"id": "10", "label": "Analytics Engine", "position": {"x": 150, "y": 460}, "connectsTo": [], "mystery": false}
  ]
}

Example puzzle structure (9 nodes - layered with feedback):
{
  "title": "Design Spotify Recommendations",
  "components": ["Load Balancer", "PostgreSQL", "Redis Cache", "Kafka", "ML Service", "CDN", "Cassandra", "S3"],
  "nodes": [
    {"id": "1", "label": "User", "position": {"x": 250, "y": 0}, "connectsTo": ["2"], "mystery": false},
    {"id": "2", "label": "Load Balancer", "position": {"x": 250, "y": 80}, "connectsTo": ["3"], "mystery": true},
    {"id": "3", "label": "API Server", "position": {"x": 250, "y": 160}, "connectsTo": ["4", "5"], "mystery": false},
    {"id": "4", "label": "PostgreSQL", "position": {"x": 150, "y": 260}, "connectsTo": ["6"], "mystery": true},
    {"id": "5", "label": "Redis Cache", "position": {"x": 350, "y": 260}, "connectsTo": [], "mystery": false},
    {"id": "6", "label": "Kafka", "position": {"x": 150, "y": 360}, "connectsTo": ["7"], "mystery": false},
    {"id": "7", "label": "ML Service", "position": {"x": 250, "y": 460}, "connectsTo": ["8"], "mystery": true},
    {"id": "8", "label": "Model Storage", "position": {"x": 350, "y": 460}, "connectsTo": [], "mystery": false},
    {"id": "9", "label": "Event Stream", "position": {"x": 50, "y": 360}, "connectsTo": ["7"], "mystery": false}
  ]
}

CRITICAL: Return ONLY valid JSON with no additional text, explanation, or markdown. The response must be parseable by JSON.parse().

Generate a new puzzle now:`

        // Call Claude API
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })

        const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

        // Parse the response
        let puzzle: GeneratedPuzzle
        try {
          puzzle = JSON.parse(responseText)
        } catch (e) {
          throw new Error(`Failed to parse Claude response: ${responseText}`)
        }

        // Validate the puzzle
        if (!puzzle.title || !puzzle.components || !puzzle.nodes) {
          throw new Error('Invalid puzzle structure from Claude')
        }

        if (puzzle.components.length !== 8) {
          throw new Error('Puzzle must have exactly 8 components')
        }

        if (puzzle.nodes.length < 5 || puzzle.nodes.length > 15) {
          throw new Error(`Puzzle must have between 5-15 nodes, got ${puzzle.nodes.length}`)
        }

        const mysteryCount = puzzle.nodes.filter(n => n.mystery).length
        if (mysteryCount !== 3) {
          throw new Error(`Puzzle must have exactly 3 mystery nodes, got ${mysteryCount}`)
        }

        // Check for isolated nodes (no islands)
        if (hasIsolatedNodes(puzzle.nodes)) {
          throw new Error('Puzzle has isolated nodes - all components must be connected to the User node')
        }

        // Check for duplicate title
        if (existingTitles.some(title =>
          title.toLowerCase() === puzzle.title.toLowerCase()
        )) {
          throw new Error('Generated puzzle has duplicate title')
        }

        // Check for similar topics in recent puzzles
        for (const recentTitle of recentTitles) {
          if (areTopicsSimilar(puzzle.title, recentTitle)) {
            throw new Error(`Generated puzzle is too similar to recent puzzle: ${recentTitle}`)
          }
        }

        // Success! Break out of retry loop
        generatedPuzzle = puzzle
        console.log(`Successfully generated puzzle: ${puzzle.title}`)
        break

      } catch (error) {
        lastError = error as Error
        console.error(`Attempt ${attempt} failed:`, error.message)

        if (attempt === MAX_RETRIES) {
          console.error(`All ${MAX_RETRIES} attempts failed`)
        } else {
          console.log(`Retrying...`)
          // Add a small delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    // Check if we successfully generated a puzzle
    if (!generatedPuzzle) {
      throw new Error(`Failed to generate puzzle after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`)
    }

    // Insert into database
    const { data: insertedGame, error: insertError } = await supabase
      .from('daily_games')
      .insert({
        date: targetDate,
        title: generatedPuzzle.title,
        components: generatedPuzzle.components,
        nodes: generatedPuzzle.nodes
      })
      .select()
      .single()

    if (insertError) throw insertError

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Puzzle generated successfully',
        date: targetDate,
        puzzle: insertedGame
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error generating puzzle:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
