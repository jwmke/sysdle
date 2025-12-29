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
    description?: string
    shape?: 'rectangle' | 'cylinder' | 'diamond' | 'parallelogram'
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
    description?: string
    shape?: 'rectangle' | 'cylinder' | 'diamond' | 'parallelogram'
  }>
}

// Helper to get date string YYYY-MM-DD
function getDateString(daysOffset: number = 0, fromDate?: Date): string {
  const date = fromDate ? new Date(fromDate) : new Date()
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
  const layer1 = ['CDN', 'Load Balancer', 'API Gateway', 'Reverse Proxy', 'Rate Limiter', 'GraphQL Gateway', 'Edge Function']
  const layer2 = ['WebSocket Server', 'Auth Service', 'Notification Service', 'Recommendation Engine',
                  'Search Service', 'Payment Gateway', 'API Server', 'Order Service', 'Inventory Service',
                  'Payment Service', 'Profile Service', 'Network Service', 'Listing Service', 'Booking Service',
                  'User Service', 'Message Service', 'Write Service', 'Read Service', 'Query Processor',
                  'Web Crawler', 'ML Service', 'Fraud Detection Service', 'Analytics Service', 'ML Inference Service',
                  'Voice Gateway', 'Presence Service', 'Event Stream', 'Ranking Service', 'Feature Flag Service',
                  'Operational Transform Service', 'MQTT Broker']
  const layer3 = ['PostgreSQL', 'MySQL', 'MongoDB', 'Cassandra', 'DynamoDB', 'Redis Cache', 'Memcached',
                  'S3', 'Object Storage', 'File Storage', 'Blob Storage', 'Kafka', 'RabbitMQ', 'Message Queue',
                  'Event Bus', 'Elasticsearch', 'Data Warehouse', 'Analytics DB', 'Cache Layer', 'Document Store',
                  'Distributed Index', 'Model Storage', 'Time-Series DB', 'Graph Database', 'Vector Database',
                  'Dead Letter Queue', 'Schema Registry', 'Config Server', 'Vault', 'Consul', 'ZooKeeper',
                  'Git Storage', 'Geospatial DB', 'PostGIS']

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

// Check if puzzle has custom components without metadata
function validateCustomComponentInfo(puzzle: GeneratedPuzzle): { valid: boolean; error?: string } {
  // Standard components that don't need metadata (commonly used, already in component_info table)
  const standardComponents = new Set([
    // Edge
    'CDN', 'Load Balancer', 'API Gateway', 'Reverse Proxy', 'Rate Limiter', 'GraphQL Gateway', 'Edge Function',
    // Messaging
    'Kafka', 'RabbitMQ', 'Message Queue', 'Event Bus', 'Dead Letter Queue',
    // Databases
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis Cache', 'Cassandra', 'DynamoDB', 'Elasticsearch',
    'Time-Series DB', 'Graph Database', 'Vector Database', 'Geospatial DB', 'PostGIS', 'Git Storage',
    // Storage
    'S3', 'Object Storage', 'Blob Storage', 'File Storage',
    // Common services (already in component_info table)
    'WebSocket Server', 'Auth Service', 'Notification Service', 'API Server', 'Web Server',
    'Payment Gateway', 'Recommendation Engine', 'ML Inference Service', 'Fraud Detection Service',
    'Analytics Service', 'Search Service', 'ML Model Server', 'A/B Testing Service',
    // Other standard
    'User', 'Circuit Breaker', 'Service Mesh', 'Memcached', 'Vault', 'Consul', 'ZooKeeper',
    'Schema Registry', 'Config Server', 'MQTT Broker'
  ])

  // Check each node for custom components that need metadata
  const missingMetadata: string[] = []
  for (const node of puzzle.nodes) {
    if (node.label === '???' || node.label === 'User') continue

    const isStandard = Array.from(standardComponents).some(
      std => std.toLowerCase() === node.label.toLowerCase()
    )

    if (!isStandard) {
      // This is a custom component - it needs description and shape
      if (!node.description || !node.shape) {
        missingMetadata.push(node.label)
      }
    }
  }

  if (missingMetadata.length > 0) {
    return {
      valid: false,
      error: `Custom components missing description/shape in nodes: ${missingMetadata.join(', ')}`
    }
  }

  return { valid: true }
}

// Check if two titles are semantically similar based on keywords
function areTitlesSimilar(title1: string, title2: string): boolean {
  // Normalize titles to lowercase and remove common words
  const commonWords = new Set(['design', 'a', 'an', 'the', 'for', 'system', 'service', 'app', 'application'])

  const extractKeywords = (title: string): Set<string> => {
    const words = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))

    const keywords = new Set(words)

    // Also add word stems/roots for better matching
    // e.g., "gaming" and "game" should match
    const stems = new Set<string>()
    for (const word of words) {
      // Add common stem patterns
      if (word.endsWith('ing')) stems.add(word.slice(0, -3))
      if (word.endsWith('s')) stems.add(word.slice(0, -1))
      if (word.endsWith('er')) stems.add(word.slice(0, -2))
      if (word.endsWith('ed')) stems.add(word.slice(0, -2))
    }

    return new Set([...keywords, ...stems])
  }

  const keywords1 = extractKeywords(title1)
  const keywords2 = extractKeywords(title2)

  // Check for keyword overlap
  let overlapCount = 0
  for (const keyword of keywords1) {
    if (keywords2.has(keyword)) {
      overlapCount++
    }
  }

  // If 2+ keywords overlap, or if 1 keyword overlaps and both titles have few keywords, consider similar
  const minKeywords = Math.min(keywords1.size, keywords2.size)
  if (overlapCount >= 2) return true
  if (overlapCount >= 1 && minKeywords <= 2) return true

  return false
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

    // Parse request body for date parameters
    let body: { startDate?: string; endDate?: string; daysOut?: number } = {}
    try {
      const text = await req.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch (e) {
      // Ignore parse errors, use defaults
    }

    // Determine target dates
    let targetDates: string[] = []

    if (body.startDate && body.endDate) {
      // Generate range from startDate to endDate
      const start = new Date(body.startDate)
      const end = new Date(body.endDate)
      const current = new Date(start)

      while (current <= end) {
        targetDates.push(getDateString(0, current))
        current.setDate(current.getDate() + 1)
      }
    } else if (body.startDate) {
      // Single date
      targetDates = [body.startDate]
    } else if (body.daysOut !== undefined) {
      // Specific days out
      targetDates = [getDateString(body.daysOut)]
    } else {
      // Default: check for missing puzzles in the next 14 days and fill gaps
      // This ensures that if a puzzle fails one day, the next run will catch it
      const lookAheadDays = 14
      for (let i = 0; i <= lookAheadDays; i++) {
        targetDates.push(getDateString(i))
      }
      console.log(`Default mode: checking for missing puzzles in the next ${lookAheadDays} days`)
    }

    const results: Array<{ date: string; status: string; message: string; puzzle?: any }> = []

    // Fetch all existing games once (used for all date generations)
    const { data: allGames, error: fetchError } = await supabase
      .from('daily_games')
      .select('title, date, nodes')
      .order('date', { ascending: false })

    if (fetchError) throw fetchError

    // Check which target dates already have puzzles
    const existingDates = new Set((allGames || []).map(game => game.date))
    const datesToGenerate = targetDates.filter(date => !existingDates.has(date))

    // Report skipped dates
    for (const date of targetDates) {
      if (existingDates.has(date)) {
        results.push({
          date,
          status: 'skipped',
          message: 'Puzzle already exists for this date'
        })
      }
    }

    // Limit to generating 5 puzzles per run to avoid timeouts
    // If there are more missing, they'll be caught in the next run
    const MAX_PUZZLES_PER_RUN = 5
    const limitedDatesToGenerate = datesToGenerate.slice(0, MAX_PUZZLES_PER_RUN)

    if (datesToGenerate.length > MAX_PUZZLES_PER_RUN) {
      console.log(`Found ${datesToGenerate.length} missing dates, limiting to ${MAX_PUZZLES_PER_RUN} per run`)
      for (const date of datesToGenerate.slice(MAX_PUZZLES_PER_RUN)) {
        results.push({
          date,
          status: 'deferred',
          message: 'Deferred to next run (max puzzles per run reached)'
        })
      }
    }

    // Generate puzzles for missing dates
    for (const targetDate of limitedDatesToGenerate) {
      console.log(`Generating puzzle for ${targetDate}`)

      const existingTitles = (allGames || []).map(game => game.title)
      const recentGames = (allGames || []).slice(0, 7)
      const recentTitles = recentGames.map(game => game.title)

      // Get mystery components from last 7 days (banned)
      const bannedMysteryComponents = getRecentMysteryComponents(allGames || [], 7)

      // Check if standard opening was used in last 7 days
      const standardOpeningUsedRecently = wasStandardOpeningUsedRecently(allGames || [], 7)

      const MAX_RETRIES = 5
      let lastError: Error | null = null
      let generatedPuzzle: GeneratedPuzzle | null = null
      let previousErrors: string[] = []

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Attempt ${attempt} of ${MAX_RETRIES} to generate puzzle`)

        let prompt = `You are a puzzle designer for Sysdle, a daily system design puzzle game similar to Wordle but for software engineers.

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
**CRITICAL: Your puzzle topic must be significantly different from these recent titles.** Do NOT create puzzles with similar themes or keywords (e.g., if recent puzzles include "Gaming Leaderboard", avoid "Game Matchmaking" or other gaming topics). Pick from diverse categories: fintech, gaming, IoT, developer tools, logistics, e-commerce, infrastructure, messaging, social media, cloud services, data analytics, etc.

**Mystery Node Rules:**
- Exactly 3 nodes should be mystery nodes (player must guess them)
- ${bannedMysteryComponents.length > 0 ? `BANNED MYSTERY COMPONENTS (used in last 7 days, DO NOT use as mystery nodes): ${bannedMysteryComponents.join(', ')}` : 'No recently used mystery components to avoid.'}
- **Mystery nodes MUST come from 3 different architectural layers:**
  - Layer 1 (Edge/Networking): CDN, Load Balancer, API Gateway, Reverse Proxy, Rate Limiter, GraphQL Gateway, Edge Function
  - Layer 2 (Application/Services): WebSocket Server, Auth Service, Notification Service, Recommendation Engine, Search Service, Payment Gateway, Fraud Detection Service, Analytics Service, ML Inference Service, Order Service, MQTT Broker, Operational Transform Service, etc.
  - Layer 3 (Data/Storage): PostgreSQL, Redis Cache, Kafka, S3, Elasticsearch, MongoDB, Cassandra, Message Queue, Time-Series DB, Graph Database, Vector Database, Git Storage, Geospatial DB, etc.
  - **You MUST have exactly ONE mystery node from each layer.** This is validated - puzzles with 2 nodes from the same layer will be REJECTED.
  - **IMPORTANT: Do NOT skip Layer 1 (Edge).** Historical data shows Layer 1 mystery nodes are often forgotten. Always include an edge/networking mystery component like CDN, Load Balancer, API Gateway, Rate Limiter, or GraphQL Gateway.
- **CRITICAL: WebSocket Server has been overused. Strongly prefer other edge/service layer options:**
  - Edge layer (Layer 1): CDN, Load Balancer, API Gateway, Rate Limiter, Reverse Proxy, GraphQL Gateway, Edge Function
  - Service layer (Layer 2): Auth Service, Notification Service, Recommendation Engine, Payment Gateway, Fraud Detection Service, Analytics Service, ML Inference Service, MQTT Broker
  - Only use WebSocket Server if the system is genuinely real-time focused (gaming, chat, live updates)
- **Mystery node variety:** Avoid making databases the "easy" mystery nodes—their cylinder shape in diagrams makes them visually obvious. Ensure at least one mystery node is a service-type component (rectangular shape) such as Recommendation Engine, Fraud Detection Service, Notification Service, Auth Service, Payment Gateway, Analytics Service, or ML Inference Service.

**Component List Rules:**
- The 8 components must include all 3 mystery node answers plus 5 decoys
- **CRITICAL: None of the 8 components may duplicate any visible (non-mystery) node label in the puzzle.** If "Load Balancer" appears as a non-mystery node, it CANNOT be in the components list.
- **At least 3 of the 8 components must be "less common" picks** from this list: Circuit Breaker, Rate Limiter, Feature Flag Service, Secrets Manager, Service Mesh, GraphQL Gateway, Sidecar Proxy, Config Server, Vault, Consul, ZooKeeper, Schema Registry, Dead Letter Queue, Blob Storage, Time-Series DB, Graph Database, Vector Database, ML Model Server, A/B Testing Service, Audit Log Service

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

**Node Positioning Guidelines (STRICT VALIDATION):**
- Use a vertical flow: User at top (y: 0), components below
- Space nodes vertically by ~80-100px between levels
- **CRITICAL SPACING RULE - MOST COMMON FAILURE**: If two nodes are within 50px of each other vertically (Y axis), they MUST be at least 150px apart horizontally (X axis)
  - Example FAIL: Node A at (x:200, y:300) and Node B at (x:250, y:320) - only 50px apart horizontally, 20px apart vertically ❌
  - Example PASS: Node A at (x:100, y:300) and Node B at (x:300, y:320) - 200px apart horizontally, 20px apart vertically ✅
- When placing nodes at similar Y coordinates, spread them FAR apart on X axis:
  - Same row: x=50, x=250, x=450 (200px minimum spacing)
  - Never place nodes closer than 150px horizontally if they're within 50px vertically
- Canvas width is approximately 600px, keep x values between 50 and 550
- **BEFORE FINALIZING**: Check every pair of nodes - if Y positions are close (< 50px difference), ensure X positions are far apart (> 150px)

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

**CUSTOM COMPONENT METADATA (REQUIRED):**
For ANY node that is NOT a standard infrastructure component, you MUST include "description" and "shape" fields directly in that node object.

**Standard components (do NOT need description/shape):**
- Edge: CDN, Load Balancer, API Gateway, Reverse Proxy, Rate Limiter, GraphQL Gateway
- Messaging: Kafka, RabbitMQ, Message Queue, Event Bus
- Databases: PostgreSQL, MySQL, MongoDB, Redis Cache, Cassandra, DynamoDB, Elasticsearch, Time-Series DB, Graph Database, Vector Database, Git Storage
- Storage: S3, Object Storage, Blob Storage
- Common Services: WebSocket Server, Auth Service, Notification Service, Payment Gateway, Recommendation Engine, ML Inference Service, Fraud Detection Service, Analytics Service, Search Service, ML Model Server, A/B Testing Service
- Other: User, Circuit Breaker, Service Mesh, Vault, MQTT Broker

**Custom components (MUST have description and shape in node object):**
Any domain-specific or application-specific service like:
- "Trading Engine", "Order Matching Service", "Price Feed Service", "Settlement Service"
- "Matchmaking Service", "Leaderboard Service", "Player Service"
- "Content Moderation", "Recommendation Engine", "Fraud Detection Service"
- "Risk Management", "Payment Processing", "Inventory Service"

For each custom component node, add these fields:
- **description**: ONE sentence (max 15 words) explaining what this component does
- **shape**: "rectangle" (for services), "cylinder" (for specialized databases), "diamond" (for routers), or "parallelogram" (for queues)

**Example custom node:**
{"id": "5", "label": "Trading Engine", "position": {"x": 100, "y": 280}, "connectsTo": ["6"], "mystery": false, "description": "Executes buy and sell orders with matching logic", "shape": "rectangle"}

**CRITICAL**: Any non-standard component MUST have description and shape fields. Failure to include these will result in rejection.

EXAMPLE PUZZLES:

Example 1 - Event-Driven Architecture (Hub and Spoke):
{
  "title": "Design an Order Processing Pipeline",
  "components": ["Kafka", "Payment Service", "Redis Cache", "Circuit Breaker", "DynamoDB", "Dead Letter Queue", "Rate Limiter", "Elasticsearch"],
  "nodes": [
    {"id": "1", "label": "User", "position": {"x": 300, "y": 0}, "connectsTo": ["2"], "mystery": false},
    {"id": "2", "label": "API Gateway", "position": {"x": 300, "y": 80}, "connectsTo": ["3"], "mystery": false},
    {"id": "3", "label": "Order Service", "position": {"x": 300, "y": 160}, "connectsTo": ["4"], "mystery": false, "description": "Manages order creation, validation, and lifecycle tracking", "shape": "rectangle"},
    {"id": "4", "label": "Kafka", "position": {"x": 300, "y": 260}, "connectsTo": ["5", "6", "7"], "mystery": true},
    {"id": "5", "label": "Inventory Service", "position": {"x": 100, "y": 360}, "connectsTo": ["4", "8"], "mystery": false, "description": "Tracks product availability and reserves items for orders", "shape": "rectangle"},
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
    {"id": "3", "label": "Command Service", "position": {"x": 150, "y": 180}, "connectsTo": ["5", "6"], "mystery": false, "description": "Processes trade orders and validates transactions before execution", "shape": "rectangle"},
    {"id": "4", "label": "Query Service", "position": {"x": 450, "y": 180}, "connectsTo": ["7", "8"], "mystery": false, "description": "Retrieves portfolio data and market information for display", "shape": "rectangle"},
    {"id": "5", "label": "Fraud Detection Service", "position": {"x": 100, "y": 280}, "connectsTo": ["6"], "mystery": true},
    {"id": "6", "label": "Kafka", "position": {"x": 250, "y": 360}, "connectsTo": ["9"], "mystery": false},
    {"id": "7", "label": "Redis Cache", "position": {"x": 400, "y": 280}, "connectsTo": ["4"], "mystery": false},
    {"id": "8", "label": "Time-Series DB", "position": {"x": 550, "y": 280}, "connectsTo": [], "mystery": true},
    {"id": "9", "label": "Trade Ledger", "position": {"x": 250, "y": 460}, "connectsTo": [], "mystery": false, "description": "Immutable record of all executed trades and transactions", "shape": "cylinder"}
  ]
}

CRITICAL: Return ONLY valid JSON with no additional text, explanation, or markdown. The response must be parseable by JSON.parse().

Generate a new puzzle now:`

        // Add error feedback if this is a retry
        if (previousErrors.length > 0) {
          prompt += `\n\n**PREVIOUS ATTEMPT ERRORS - FIX THESE:**\n`
          previousErrors.forEach((error, idx) => {
            prompt += `Attempt ${idx + 1} failed: ${error}\n`
          })
          prompt += `\nPlease generate a puzzle that avoids these errors. You can either fix the same concept or choose a completely different system design.`
        }

        prompt += `\n\nGenerate the puzzle now (JSON only):`

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })

        let responseText = message.content[0].type === 'text' ? message.content[0].text : ''

        // Strip markdown code blocks if present
        responseText = responseText.trim()
        if (responseText.startsWith('```json')) {
          responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (responseText.startsWith('```')) {
          responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }

        let puzzle: GeneratedPuzzle
        try {
          puzzle = JSON.parse(responseText)
        } catch (e) {
          throw new Error(`Failed to parse Claude response: ${responseText.substring(0, 500)}...`)
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

        // Check for similar titles in recent games (last 7 days)
        const similarTitle = recentTitles.find(title =>
          areTitlesSimilar(title, puzzle.title)
        )
        if (similarTitle) {
          throw new Error(`Generated puzzle title "${puzzle.title}" is too similar to recent puzzle "${similarTitle}"`)
        }

        // NEW: Check that no component duplicates a visible node
        // TEMPORARILY DISABLED - validation too strict
        // if (hasComponentDuplicatingVisibleNode(puzzle)) {
        //   throw new Error('Component list contains a label that matches a visible (non-mystery) node')
        // }

        // NEW: Validate mystery nodes come from 3 different layers
        const layerValidation = validateMysteryNodeLayers(puzzle.nodes)
        if (!layerValidation.valid) {
          throw new Error(layerValidation.error)
        }

        // NEW: Validate custom components have metadata
        const customInfoValidation = validateCustomComponentInfo(puzzle)
        if (!customInfoValidation.valid) {
          throw new Error(customInfoValidation.error)
        }

        // NEW: Check that banned mystery components aren't used
        const mysteryLabels = puzzle.nodes.filter(n => n.mystery).map(n => n.label)
        for (const banned of bannedMysteryComponents) {
          if (mysteryLabels.some(label => label.toLowerCase() === banned.toLowerCase())) {
            throw new Error(`Mystery component "${banned}" was used in the last 7 days and cannot be a mystery node`)
          }
        }

        generatedPuzzle = puzzle
        console.log(`Successfully generated puzzle: ${puzzle.title}`)
        break

      } catch (error) {
        lastError = error as Error
        console.error(`Attempt ${attempt} failed:`, error.message)

        // Add error to previousErrors so the next attempt knows what went wrong
        previousErrors.push(error.message)

        if (attempt === MAX_RETRIES) {
          console.error(`All ${MAX_RETRIES} attempts failed`)
        } else {
          console.log(`Retrying...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

      if (!generatedPuzzle) {
        results.push({
          date: targetDate,
          status: 'failed',
          message: `Failed to generate puzzle after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`
        })
        console.error(`Failed to generate puzzle for ${targetDate}`)
        continue
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

      if (insertError) {
        results.push({
          date: targetDate,
          status: 'failed',
          message: `Failed to insert puzzle: ${insertError.message}`
        })
        console.error(`Failed to insert puzzle for ${targetDate}:`, insertError)
        continue
      }

      results.push({
        date: targetDate,
        status: 'success',
        message: 'Puzzle generated successfully',
        puzzle: insertedGame
      })
      console.log(`Successfully generated puzzle for ${targetDate}: ${insertedGame.title}`)

      // Add the new puzzle to allGames so it's considered for the next date in the loop
      allGames?.unshift(insertedGame)
    }

    return new Response(
      JSON.stringify({
        success: results.some(r => r.status === 'success'),
        totalDates: targetDates.length,
        generated: results.filter(r => r.status === 'success').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        failed: results.filter(r => r.status === 'failed').length,
        deferred: results.filter(r => r.status === 'deferred').length,
        results
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