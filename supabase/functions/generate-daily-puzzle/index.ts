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

// Extract mystery component labels from recent games
function getRecentMysteryComponents(games: any[], daysBack: number): string[] {
  const recentGames = games.slice(0, daysBack)
  const mysteryComponents: string[] = []
  
  for (const game of recentGames) {
    const nodes = typeof game.nodes === 'string' ? JSON.parse(game.nodes) : game.nodes
    for (const node of nodes) {
      if (node.mystery && node.label !== 'User') {
        mysteryComponents.push(node.label)
      }
    }
  }
  
  return [...new Set(mysteryComponents)] // Remove duplicates
}

// Check if the standard opening pattern was used in recent games
function wasStandardOpeningUsedRecently(games: any[], daysBack: number): boolean {
  const recentGames = games.slice(0, daysBack)
  const standardPatterns = [
    ['User', 'CDN', 'Load Balancer', 'API Gateway'],
    ['User', 'CDN', 'Load Balancer', 'API Server'],
    ['User', 'CDN', 'API Gateway'],
    ['User', 'Load Balancer', 'API Gateway'],
  ]
  
  for (const game of recentGames) {
    const nodes = typeof game.nodes === 'string' ? JSON.parse(game.nodes) : game.nodes
    // Sort by y position to get the flow order
    const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y)
    const firstFourLabels = sortedNodes.slice(0, 4).map(n => n.label)
    
    for (const pattern of standardPatterns) {
      const matches = pattern.every((label, idx) => firstFourLabels[idx] === label)
      if (matches) {
        return true
      }
    }
  }
  
  return false
}

// Check if nodes that are vertically close are properly spaced horizontally
function hasOverlappingNodes(nodes: GeneratedPuzzle['nodes']): boolean {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i]
      const node2 = nodes[j]

      const yDiff = Math.abs(node1.position.y - node2.position.y)
      const xDiff = Math.abs(node1.position.x - node2.position.x)

      if (yDiff <= 50 && xDiff < 150) {
        return true
      }
    }
  }

  return false
}

// Check if all nodes are reachable from the User node
function hasIsolatedNodes(nodes: GeneratedPuzzle['nodes']): boolean {
  const userNode = nodes.find(n => n.label === 'User' || n.id === '1')
  if (!userNode) return true

  const graph = new Map<string, Set<string>>()
  nodes.forEach(node => {
    if (!graph.has(node.id)) graph.set(node.id, new Set())
    node.connectsTo.forEach(targetId => {
      graph.get(node.id)!.add(targetId)
      if (!graph.has(targetId)) graph.set(targetId, new Set())
      graph.get(targetId)!.add(node.id)
    })
  })

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

  return visited.size !== nodes.length
}

// Check if any component in the list duplicates a visible (non-mystery) node
function hasComponentDuplicatingVisibleNode(puzzle: GeneratedPuzzle): boolean {
  const visibleNodeLabels = puzzle.nodes
    .filter(n => !n.mystery)
    .map(n => n.label.toLowerCase())
  
  for (const component of puzzle.components) {
    if (visibleNodeLabels.includes(component.toLowerCase())) {
      return true
    }
  }
  
  return false
}

// Validate mystery nodes come from 3 different layers
function validateMysteryNodeLayers(nodes: GeneratedPuzzle['nodes']): { valid: boolean; error?: string } {
  const layer1 = ['CDN', 'Load Balancer', 'API Gateway', 'Reverse Proxy', 'Rate Limiter']
  const layer2 = ['WebSocket Server', 'Auth Service', 'Notification Service', 'Recommendation Engine', 
                  'Search Service', 'Payment Gateway', 'API Server', 'Order Service', 'Inventory Service',
                  'Payment Service', 'Profile Service', 'Network Service', 'Listing Service', 'Booking Service',
                  'User Service', 'Message Service', 'Write Service', 'Read Service', 'Query Processor',
                  'Web Crawler', 'ML Service', 'Fraud Detection Service', 'Analytics Service', 'ML Inference Service',
                  'Voice Gateway', 'Presence Service', 'Event Stream', 'Ranking Service', 'Feature Flag Service']
  const layer3 = ['PostgreSQL', 'MySQL', 'MongoDB', 'Cassandra', 'DynamoDB', 'Redis Cache', 'Memcached',
                  'S3', 'Object Storage', 'File Storage', 'Blob Storage', 'Kafka', 'RabbitMQ', 'Message Queue',
                  'Event Bus', 'Elasticsearch', 'Data Warehouse', 'Analytics DB', 'Cache Layer', 'Document Store',
                  'Distributed Index', 'Model Storage', 'Time-Series DB', 'Graph Database', 'Vector Database',
                  'Dead Letter Queue', 'Schema Registry', 'Config Server', 'Vault', 'Consul', 'ZooKeeper']

  const mysteryNodes = nodes.filter(n => n.mystery)
  
  let layer1Count = 0
  let layer2Count = 0
  let layer3Count = 0
  
  for (const node of mysteryNodes) {
    if (layer1.some(l => node.label.includes(l) || l.includes(node.label))) layer1Count++
    else if (layer3.some(l => node.label.includes(l) || l.includes(node.label))) layer3Count++
    else layer2Count++ // Default to layer 2 for services
  }
  
  if (layer1Count === 0 || layer2Count === 0 || layer3Count === 0) {
    return { 
      valid: false, 
      error: `Mystery nodes must come from 3 different layers. Got: Edge=${layer1Count}, Service=${layer2Count}, Data=${layer3Count}` 
    }
  }
  
  return { valid: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    if (!supabaseUrl || !supabaseKey || !anthropicKey) {
      throw new Error('Missing required environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    const targetDate = getDateString(7)

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

    const { data: allGames, error: fetchError } = await supabase
      .from('daily_games')
      .select('title, date, nodes')
      .order('date', { ascending: false })

    if (fetchError) throw fetchError

    const existingTitles = (allGames || []).map(game => game.title)
    const recentGames = (allGames || []).slice(0, 7)
    const recentTitles = recentGames.map(game => game.title)
    
    // Get mystery components from last 3 days (banned)
    const bannedMysteryComponents = getRecentMysteryComponents(allGames || [], 3)
    
    // Check if standard opening was used in last 7 days
    const standardOpeningUsedRecently = wasStandardOpeningUsedRecently(allGames || [], 7)

    const MAX_RETRIES = 3
    let lastError: Error | null = null
    let generatedPuzzle: GeneratedPuzzle | null = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Attempt ${attempt} of ${MAX_RETRIES} to generate puzzle`)

        const prompt = `You are a puzzle designer for Sysdle, a daily system design puzzle game similar to Wordle but for software engineers.

Your task is to generate ONE daily puzzle. The puzzle consists of:
1. A title: A system design challenge (e.g., "Design TikTok", "Design Netflix", "Design a URL Shortener")
2. A diagram with 5-15 nodes representing different components in a system architecture
3. A list of 8 available components players can choose from

IMPORTANT RULES:

**Title Format:**
- Use simple system names WITHOUT user counts or scale numbers
- Good: "Design Uber", "Design a Payment Processing System", "Design Netflix Recommendations"
- Bad: "Design Uber for 50M users", "Design a URL Shortener for 100M requests/day"

**Existing Titles - DO NOT USE:**
${existingTitles.join(', ')}

**Recent Puzzles - CREATE VARIETY:**
${recentTitles.join(', ')}
Pick from diverse categories: fintech, gaming, IoT, developer tools, logistics, e-commerce, infrastructure, messaging, etc.

**Mystery Node Rules:**
- Exactly 3 nodes should be mystery nodes (player must guess them)
- ${bannedMysteryComponents.length > 0 ? `BANNED MYSTERY COMPONENTS (used in last 3 days, DO NOT use as mystery nodes): ${bannedMysteryComponents.join(', ')}` : 'No recently used mystery components to avoid.'}
- **Mystery nodes MUST come from 3 different architectural layers:**
  - Layer 1 (Edge/Networking): CDN, Load Balancer, API Gateway, Reverse Proxy, Rate Limiter
  - Layer 2 (Application/Services): WebSocket Server, Auth Service, Notification Service, Recommendation Engine, Search Service, Payment Gateway, Fraud Detection Service, Analytics Service, ML Inference Service, Order Service, etc.
  - Layer 3 (Data/Storage): PostgreSQL, Redis Cache, Kafka, S3, Elasticsearch, MongoDB, Cassandra, Message Queue, etc.
  - You MUST have exactly ONE mystery node from each layer.
- **Mystery node variety:** Avoid making databases the "easy" mystery nodes—their cylinder shape in diagrams makes them visually obvious. Ensure at least one mystery node is a service-type component (rectangular shape) such as Recommendation Engine, Fraud Detection Service, Notification Service, Auth Service, Payment Gateway, Analytics Service, or ML Inference Service.

**Component List Rules:**
- The 8 components must include all 3 mystery node answers plus 5 decoys
- **CRITICAL: None of the 8 components may duplicate any visible (non-mystery) node label in the puzzle.** If "Load Balancer" appears as a non-mystery node, it CANNOT be in the components list.
- **At least 2 of the 8 components must be "less common" picks** from this list: Circuit Breaker, Rate Limiter, Feature Flag Service, Secrets Manager, Service Mesh, GraphQL Gateway, Sidecar Proxy, Config Server, Vault, Consul, ZooKeeper, Schema Registry, Dead Letter Queue, Blob Storage, Time-Series DB, Graph Database, Vector Database, ML Model Server, A/B Testing Service, Audit Log Service

**Diagram Entry Pattern:**
${standardOpeningUsedRecently ? `**WARNING: The standard opening pattern (User → CDN → Load Balancer → API Gateway) has been overused in recent puzzles. You MUST use a different entry pattern.**` : 'Vary the opening pattern - avoid always using User → CDN → Load Balancer → API Gateway.'}
Alternative entry patterns to use:
- User → Load Balancer → multiple parallel services (skip CDN or place it elsewhere)
- User → API Gateway → branching service paths immediately
- User → WebSocket Server for real-time systems
- User → Rate Limiter → API Gateway → services
- User → Edge Function → downstream services
- User → GraphQL Gateway → resolver services
Be creative with the entry flow—the first 3-4 nodes should NOT be predictable.

**BIDIRECTIONAL CONNECTIONS - USE THESE LIBERALLY:**
Nodes can and SHOULD connect to each other bidirectionally (A connects to B AND B connects to A). This creates more realistic and interesting architectures. Use bidirectional connections for:
- Cache synchronization: App Server ↔ Redis Cache (server reads/writes, cache can invalidate)
- Pub/Sub systems: Service ↔ Message Queue (publish and subscribe)
- Database replication: Primary DB ↔ Replica DB
- Microservice communication: Service A ↔ Service B (request/response)
- WebSocket connections: Client-facing server ↔ Presence Service
- Health checks: Load Balancer ↔ Backend Services
**Aim for at least 2-3 bidirectional connection pairs in each puzzle.** This makes the architecture more realistic and the puzzle more interesting.

**DIAGRAM SHAPE - Choose one of these patterns (DO NOT always pyramid):**
1. **Fan-out then Converge:** Multiple services branch out, then reconnect to a shared downstream component
2. **Parallel Pipelines:** Separate read and write paths, or real-time vs batch processing paths
3. **Hub and Spoke:** Central component (like Kafka or API Gateway) connects to many independent services
4. **Circular/Feedback Loop:** Data flows in a cycle (e.g., API → DB → Analytics → Recommendation → back to API)
5. **Layered with Skip Connections:** Mostly layered, but some components connect across multiple layers
6. **Diamond Pattern:** Branches out then converges to a single point, then branches again
7. **Event Mesh:** Multiple event-driven services interconnected through message queues
8. **Microservices Mesh:** Several services with peer-to-peer connections, not just top-down flow

**Node Positioning Guidelines:**
- Use a vertical flow: User at top (y: 0), components below
- Space nodes vertically by ~80-100px between levels
- **CRITICAL SPACING RULE**: If two nodes are within 50px of each other vertically (Y axis), they MUST be at least 150px apart horizontally (X axis)
- When branching horizontally, spread nodes widely (e.g., x=50, x=250, x=450)
- Canvas width is approximately 600px, keep x values between 50 and 550

**Available Component Types:**
Standard: CDN, Load Balancer, API Gateway, Reverse Proxy, API Server, Web Server, Application Server
Databases: PostgreSQL, MySQL, MongoDB, Cassandra, DynamoDB, Graph Database, Time-Series DB, Vector Database
Caching: Redis Cache, Memcached, In-Memory Cache
Storage: S3, Object Storage, File Storage, Blob Storage
Messaging: Kafka, RabbitMQ, Message Queue, Event Bus, Dead Letter Queue
Search: Elasticsearch, Search Service
Auth: Auth Service, OAuth Server, Secrets Manager, Vault
Reliability: Rate Limiter, Circuit Breaker, Service Mesh
Monitoring: Monitoring Service, Logging Service, Audit Log Service
Data: Data Warehouse, Analytics DB, Schema Registry
Services: Payment Gateway, Notification Service, Recommendation Engine, ML Model Server, Feature Flag Service, A/B Testing Service, Fraud Detection Service

**Node Count Guidelines:**
- Simple systems (5-7 nodes): URL shortener, pastebin, feature flags
- Medium systems (8-10 nodes): Social apps, e-commerce, messaging
- Complex systems (11-15 nodes): Search engines, trading platforms, distributed systems

**CRITICAL REQUIREMENTS:**
- ALL nodes must be connected - no isolated islands
- Every node must be reachable from the User node
- Exactly 3 mystery nodes from 3 different layers
- 8 components with no duplicates of visible nodes
- At least 2-3 bidirectional connection pairs

EXAMPLE PUZZLES:

Example 1 - Event-Driven Architecture (Hub and Spoke):
{
  "title": "Design an Order Processing Pipeline",
  "components": ["Kafka", "Payment Service", "Redis Cache", "Circuit Breaker", "DynamoDB", "Dead Letter Queue", "Rate Limiter", "Elasticsearch"],
  "nodes": [
    {"id": "1", "label": "User", "position": {"x": 300, "y": 0}, "connectsTo": ["2"], "mystery": false},
    {"id": "2", "label": "API Gateway", "position": {"x": 300, "y": 80}, "connectsTo": ["3"], "mystery": false},
    {"id": "3", "label": "Order Service", "position": {"x": 300, "y": 160}, "connectsTo": ["4"], "mystery": false},
    {"id": "4", "label": "Kafka", "position": {"x": 300, "y": 260}, "connectsTo": ["5", "6", "7"], "mystery": true},
    {"id": "5", "label": "Inventory Service", "position": {"x": 100, "y": 360}, "connectsTo": ["4", "8"], "mystery": false},
    {"id": "6", "label": "Payment Service", "position": {"x": 300, "y": 360}, "connectsTo": ["4", "8"], "mystery": true},
    {"id": "7", "label": "Notification Service", "position": {"x": 500, "y": 360}, "connectsTo": ["4"], "mystery": false},
    {"id": "8", "label": "PostgreSQL", "position": {"x": 200, "y": 460}, "connectsTo": [], "mystery": true}
  ]
}

Example 2 - CQRS with Parallel Pipelines:
{
  "title": "Design a Stock Trading Platform",
  "components": ["Redis Cache", "Kafka", "Time-Series DB", "Circuit Breaker", "Rate Limiter", "Fraud Detection Service", "Consul", "Elasticsearch"],
  "nodes": [
    {"id": "1", "label": "User", "position": {"x": 300, "y": 0}, "connectsTo": ["2"], "mystery": false},
    {"id": "2", "label": "Rate Limiter", "position": {"x": 300, "y": 80}, "connectsTo": ["3", "4"], "mystery": true},
    {"id": "3", "label": "Command Service", "position": {"x": 150, "y": 180}, "connectsTo": ["5", "6"], "mystery": false},
    {"id": "4", "label": "Query Service", "position": {"x": 450, "y": 180}, "connectsTo": ["7", "8"], "mystery": false},
    {"id": "5", "label": "Fraud Detection Service", "position": {"x": 100, "y": 280}, "connectsTo": ["6"], "mystery": true},
    {"id": "6", "label": "Kafka", "position": {"x": 250, "y": 360}, "connectsTo": ["9"], "mystery": false},
    {"id": "7", "label": "Redis Cache", "position": {"x": 400, "y": 280}, "connectsTo": ["4"], "mystery": false},
    {"id": "8", "label": "Time-Series DB", "position": {"x": 550, "y": 280}, "connectsTo": [], "mystery": true},
    {"id": "9", "label": "Trade Ledger", "position": {"x": 250, "y": 460}, "connectsTo": [], "mystery": false}
  ]
}

Example 3 - Microservices with Bidirectional Connections:
{
  "title": "Design a Food Delivery System",
  "components": ["GraphQL Gateway", "Redis Cache", "MongoDB", "Kafka", "Circuit Breaker", "ML Model Server", "PostGIS", "Rate Limiter"],
  "nodes": [
    {"id": "1", "label": "User", "position": {"x": 300, "y": 0}, "connectsTo": ["2"], "mystery": false},
    {"id": "2", "label": "GraphQL Gateway", "position": {"x": 300, "y": 80}, "connectsTo": ["3", "4", "5"], "mystery": true},
    {"id": "3", "label": "Restaurant Service", "position": {"x": 100, "y": 180}, "connectsTo": ["6", "7"], "mystery": false},
    {"id": "4", "label": "Order Service", "position": {"x": 300, "y": 180}, "connectsTo": ["7", "8"], "mystery": false},
    {"id": "5", "label": "Driver Service", "position": {"x": 500, "y": 180}, "connectsTo": ["7", "9"], "mystery": false},
    {"id": "6", "label": "MongoDB", "position": {"x": 50, "y": 300}, "connectsTo": [], "mystery": true},
    {"id": "7", "label": "Redis Cache", "position": {"x": 300, "y": 300}, "connectsTo": ["3", "4", "5"], "mystery": false},
    {"id": "8", "label": "Kafka", "position": {"x": 200, "y": 400}, "connectsTo": ["10"], "mystery": false},
    {"id": "9", "label": "ML Model Server", "position": {"x": 500, "y": 300}, "connectsTo": ["5"], "mystery": true},
    {"id": "10", "label": "Analytics Service", "position": {"x": 200, "y": 500}, "connectsTo": [], "mystery": false}
  ]
}

Example 4 - Circular/Feedback Pattern:
{
  "title": "Design a Content Recommendation Engine",
  "components": ["Vector Database", "Kafka", "Redis Cache", "Feature Flag Service", "PostgreSQL", "Circuit Breaker", "A/B Testing Service", "S3"],
  "nodes": [
    {"id": "1", "label": "User", "position": {"x": 300, "y": 0}, "connectsTo": ["2"], "mystery": false},
    {"id": "2", "label": "API Gateway", "position": {"x": 300, "y": 80}, "connectsTo": ["3"], "mystery": false},
    {"id": "3", "label": "Content Service", "position": {"x": 300, "y": 160}, "connectsTo": ["4", "5"], "mystery": false},
    {"id": "4", "label": "Vector Database", "position": {"x": 150, "y": 260}, "connectsTo": [], "mystery": true},
    {"id": "5", "label": "A/B Testing Service", "position": {"x": 450, "y": 260}, "connectsTo": ["6"], "mystery": true},
    {"id": "6", "label": "Kafka", "position": {"x": 450, "y": 360}, "connectsTo": ["7"], "mystery": false},
    {"id": "7", "label": "ML Pipeline", "position": {"x": 300, "y": 460}, "connectsTo": ["4", "8"], "mystery": false},
    {"id": "8", "label": "Feature Flag Service", "position": {"x": 150, "y": 360}, "connectsTo": ["3"], "mystery": true}
  ]
}

CRITICAL: Return ONLY valid JSON with no additional text, explanation, or markdown. The response must be parseable by JSON.parse().

Generate a new puzzle now:`

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })

        const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

        let puzzle: GeneratedPuzzle
        try {
          puzzle = JSON.parse(responseText)
        } catch (e) {
          throw new Error(`Failed to parse Claude response: ${responseText}`)
        }

        // Validation checks
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

        // Check for isolated nodes
        if (hasIsolatedNodes(puzzle.nodes)) {
          throw new Error('Puzzle has isolated nodes - all components must be connected to the User node')
        }

        // Check for overlapping nodes
        if (hasOverlappingNodes(puzzle.nodes)) {
          throw new Error('Puzzle has overlapping nodes - nodes within 50px vertically must be at least 150px apart horizontally')
        }

        // Check for duplicate title
        if (existingTitles.some(title =>
          title.toLowerCase() === puzzle.title.toLowerCase()
        )) {
          throw new Error('Generated puzzle has duplicate title')
        }

        // NEW: Check that no component duplicates a visible node
        if (hasComponentDuplicatingVisibleNode(puzzle)) {
          throw new Error('Component list contains a label that matches a visible (non-mystery) node')
        }

        // NEW: Validate mystery nodes come from 3 different layers
        const layerValidation = validateMysteryNodeLayers(puzzle.nodes)
        if (!layerValidation.valid) {
          throw new Error(layerValidation.error)
        }

        // NEW: Check that banned mystery components aren't used
        const mysteryLabels = puzzle.nodes.filter(n => n.mystery).map(n => n.label)
        for (const banned of bannedMysteryComponents) {
          if (mysteryLabels.some(label => label.toLowerCase() === banned.toLowerCase())) {
            throw new Error(`Mystery component "${banned}" was used in the last 3 days and cannot be a mystery node`)
          }
        }

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
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    if (!generatedPuzzle) {
      throw new Error(`Failed to generate puzzle after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`)
    }

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