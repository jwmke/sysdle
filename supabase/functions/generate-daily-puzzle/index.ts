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

interface RefinementFeedback {
  isValid: boolean
  issues: string[]
  suggestions: string[]
  refinedPuzzle?: GeneratedPuzzle
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
  
  return [...new Set(mysteryComponents)]
}

// Get frequency counts of mystery components
function getMysteryComponentFrequency(games: any[]): Map<string, number> {
  const freq = new Map<string, number>()
  
  for (const game of games) {
    const nodes = typeof game.nodes === 'string' ? JSON.parse(game.nodes) : game.nodes
    for (const node of nodes) {
      if (node.mystery && node.label !== 'User') {
        freq.set(node.label, (freq.get(node.label) || 0) + 1)
      }
    }
  }
  
  return freq
}

// Get frequency counts of decoy components (in list but never mystery)
function getDecoyComponentFrequency(games: any[]): Map<string, number> {
  const freq = new Map<string, number>()
  
  for (const game of games) {
    const components = typeof game.components === 'string' ? JSON.parse(game.components) : game.components
    const nodes = typeof game.nodes === 'string' ? JSON.parse(game.nodes) : game.nodes
    const mysteryLabels = new Set(nodes.filter((n: any) => n.mystery).map((n: any) => n.label))
    
    for (const comp of components) {
      if (!mysteryLabels.has(comp)) {
        freq.set(comp, (freq.get(comp) || 0) + 1)
      }
    }
  }
  
  return freq
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

// Check if two titles are semantically similar based on keywords
function areTitlesSimilar(title1: string, title2: string): boolean {
  const commonWords = new Set(['design', 'a', 'an', 'the', 'for', 'system', 'service', 'app', 'application', 'platform'])

  const extractKeywords = (title: string): Set<string> => {
    const words = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))

    const keywords = new Set(words)
    const stems = new Set<string>()
    for (const word of words) {
      if (word.endsWith('ing')) stems.add(word.slice(0, -3))
      if (word.endsWith('s')) stems.add(word.slice(0, -1))
      if (word.endsWith('er')) stems.add(word.slice(0, -2))
      if (word.endsWith('ed')) stems.add(word.slice(0, -2))
    }

    return new Set([...keywords, ...stems])
  }

  const keywords1 = extractKeywords(title1)
  const keywords2 = extractKeywords(title2)

  let overlapCount = 0
  for (const keyword of keywords1) {
    if (keywords2.has(keyword)) {
      overlapCount++
    }
  }

  const minKeywords = Math.min(keywords1.size, keywords2.size)
  if (overlapCount >= 2) return true
  if (overlapCount >= 1 && minKeywords <= 2) return true

  return false
}

// Count bidirectional connections
function countBidirectionalConnections(nodes: GeneratedPuzzle['nodes']): number {
  let count = 0
  for (const node of nodes) {
    for (const targetId of node.connectsTo) {
      const targetNode = nodes.find(n => n.id === targetId)
      if (targetNode && targetNode.connectsTo.includes(node.id)) {
        count++
      }
    }
  }
  return count / 2 // Each bidirectional pair is counted twice
}

// Validate architectural connection sense
function findArchitecturalIssues(nodes: GeneratedPuzzle['nodes']): string[] {
  const issues: string[] = []
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  
  // Components that should NOT directly connect to each other
  const invalidConnections: [string[], string[]][] = [
    // Message queues shouldn't directly connect to databases
    [['Kafka', 'RabbitMQ', 'Message Queue', 'Event Bus'], ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis Cache', 'Cassandra', 'DynamoDB', 'Elasticsearch']],
    // Databases shouldn't connect to CDN
    [['PostgreSQL', 'MySQL', 'MongoDB', 'Cassandra', 'DynamoDB'], ['CDN']],
    // User shouldn't directly connect to databases
    [['User'], ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis Cache', 'Cassandra', 'DynamoDB', 'S3', 'Elasticsearch']],
  ]
  
  // Components that SHOULD have bidirectional connections when connected
  const shouldBeBidirectional: string[][] = [
    ['Redis Cache', 'Memcached'], // Caches should have bidirectional with services
    ['Kafka', 'RabbitMQ', 'Message Queue'], // Message systems often bidirectional
  ]
  
  for (const node of nodes) {
    for (const targetId of node.connectsTo) {
      const targetNode = nodeMap.get(targetId)
      if (!targetNode) continue
      
      for (const [sources, targets] of invalidConnections) {
        const sourceMatches = sources.some(s => node.label.includes(s) || s.includes(node.label))
        const targetMatches = targets.some(t => targetNode.label.includes(t) || t.includes(targetNode.label))
        
        if (sourceMatches && targetMatches) {
          issues.push(`Invalid connection: "${node.label}" should not directly connect to "${targetNode.label}"`)
        }
      }
    }
  }
  
  return issues
}

// Build the generation prompt
function buildGenerationPrompt(
  existingTitles: string[],
  recentTitles: string[],
  bannedMysteryComponents: string[],
  overusedMysteryComponents: string[],
  overusedDecoys: string[],
  previousErrors: string[] = []
): string {
  let prompt = `You are a puzzle designer for Sysdle, a daily system design puzzle game for software engineers.

Generate ONE puzzle consisting of:
1. A title (system design challenge like "Design Netflix" or "Design a URL Shortener")
2. A diagram with 6-12 nodes representing system architecture components
3. A list of 8 components (3 correct mystery answers + 5 decoys)

## CRITICAL RULES

### Title Rules
- Use simple names WITHOUT scale metrics (no "for 50M users")
- Must be DIFFERENT from recent puzzles - vary the domain/industry
- Good: "Design Uber", "Design a Payment System", "Design Netflix Recommendations"
- Bad: "Design Uber for 50M users", "Design a URL Shortener for 100M requests"

### Existing Titles (DO NOT REUSE):
${existingTitles.slice(0, 50).join(', ')}

### Recent Puzzles (CREATE VARIETY - pick a DIFFERENT domain):
${recentTitles.join(', ')}

### Mystery Node Rules
- Exactly 3 nodes must be mystery nodes (mystery: true)
- Mystery nodes should be INTERESTING components that require knowledge to identify
- AVOID making databases the "easy" mystery - their cylinder shape makes them obvious
- Mix it up: include edge components, services, AND data stores across different puzzles

### BANNED Mystery Components (overused recently - DO NOT use as mystery):
${bannedMysteryComponents.length > 0 ? bannedMysteryComponents.join(', ') : 'None'}

### OVERUSED Mystery Components (use sparingly):
${overusedMysteryComponents.length > 0 ? overusedMysteryComponents.join(', ') : 'None'}

### Component List Rules
- 8 components total: 3 mystery answers + 5 decoys
- Decoys must be PLAUSIBLE for the system (not random infrastructure)
- AVOID constantly using the same decoys

### OVERUSED Decoys (vary your decoy choices):
${overusedDecoys.length > 0 ? overusedDecoys.join(', ') : 'None'}

### Connection Rules - CRITICAL
Connections must make ARCHITECTURAL SENSE:
- User → Edge/Gateway components (CDN, Load Balancer, API Gateway)
- Edge → Application services
- Services → Other services OR data stores
- Services ↔ Message queues (bidirectional for pub/sub)
- Services ↔ Caches (bidirectional for read/write)

INVALID connections (never do these):
- Kafka/Message Queue → Database directly (queues don't write to DBs)
- User → Database directly (always through services)
- Database → CDN (makes no sense)
- CDN → Database (CDN serves static content)

### Bidirectional Connections - USE THESE
Real architectures have bidirectional flows. Include 2-4 bidirectional pairs:
- Service ↔ Cache (read/write)
- Service ↔ Message Queue (publish/subscribe)  
- Service ↔ Service (request/response)
- Load Balancer ↔ Service (health checks)

Example: If node "3" connects to node "5", and node "5" also connects to "3", that's bidirectional.

### Node Positioning
- User at top (y: 0)
- Flow downward, ~80-100px between levels
- If nodes are within 50px vertically, space them 150px+ horizontally
- Keep x values between 50-550

### Available Components
**Edge/Gateway:** CDN, Load Balancer, API Gateway, Reverse Proxy, Rate Limiter, GraphQL Gateway, Edge Function
**Application:** WebSocket Server, Auth Service, Notification Service, Payment Gateway, Search Service, Recommendation Engine, ML Inference Service, Analytics Service
**Messaging:** Kafka, RabbitMQ, Message Queue, Event Bus, MQTT Broker
**Databases:** PostgreSQL, MySQL, MongoDB, Redis Cache, Cassandra, DynamoDB, Elasticsearch, Time-Series DB, Graph Database, Vector Database
**Storage:** S3, Object Storage, Blob Storage
**Reliability:** Circuit Breaker, Service Mesh, Feature Flag Service

### Custom Components
For domain-specific components not in the standard list, include:
- "description": One sentence (max 15 words) explaining what it does
- "shape": "rectangle" (services), "cylinder" (databases), "diamond" (routers), "parallelogram" (queues)

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no explanation):
{
  "title": "Design ...",
  "components": ["comp1", "comp2", ...],  // exactly 8
  "nodes": [
    {"id": "1", "label": "User", "position": {"x": 300, "y": 0}, "connectsTo": ["2"], "mystery": false},
    ...
  ]
}

## EXAMPLE (for reference style only - create something DIFFERENT)
{
  "title": "Design a Video Transcoding Pipeline",
  "components": ["Kafka", "S3", "Worker Pool", "Rate Limiter", "Circuit Breaker", "Redis Cache", "PostgreSQL", "CDN"],
  "nodes": [
    {"id": "1", "label": "User", "position": {"x": 300, "y": 0}, "connectsTo": ["2"], "mystery": false},
    {"id": "2", "label": "API Gateway", "position": {"x": 300, "y": 80}, "connectsTo": ["3", "4"], "mystery": false},
    {"id": "3", "label": "Upload Service", "position": {"x": 150, "y": 180}, "connectsTo": ["5", "6"], "mystery": false, "description": "Handles video uploads and validates formats", "shape": "rectangle"},
    {"id": "4", "label": "Status Service", "position": {"x": 450, "y": 180}, "connectsTo": ["7"], "mystery": false, "description": "Tracks transcoding job progress", "shape": "rectangle"},
    {"id": "5", "label": "S3", "position": {"x": 50, "y": 280}, "connectsTo": ["8"], "mystery": true},
    {"id": "6", "label": "Kafka", "position": {"x": 250, "y": 280}, "connectsTo": ["3", "8"], "mystery": true},
    {"id": "7", "label": "Redis Cache", "position": {"x": 450, "y": 280}, "connectsTo": ["4"], "mystery": false},
    {"id": "8", "label": "Worker Pool", "position": {"x": 150, "y": 380}, "connectsTo": ["5", "6", "9"], "mystery": true, "description": "Distributed workers that transcode videos", "shape": "rectangle"},
    {"id": "9", "label": "CDN", "position": {"x": 300, "y": 480}, "connectsTo": [], "mystery": false}
  ]
}
`

  if (previousErrors.length > 0) {
    prompt += `\n\n## PREVIOUS ERRORS TO FIX:\n`
    previousErrors.forEach((error, idx) => {
      prompt += `${idx + 1}. ${error}\n`
    })
  }

  prompt += `\n\nGenerate the puzzle now (JSON only):`
  
  return prompt
}

// Build the refinement/critique prompt
function buildRefinementPrompt(puzzle: GeneratedPuzzle, issues: string[]): string {
  return `You are reviewing a system design puzzle for architectural correctness and quality.

## CURRENT PUZZLE:
${JSON.stringify(puzzle, null, 2)}

## IDENTIFIED ISSUES:
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

## YOUR TASK:
Fix ALL the identified issues while preserving the puzzle's theme and structure where possible.

### Rules for fixes:
1. Fix invalid connections by either removing them or adding intermediate services
2. Add bidirectional connections where architecturally appropriate (services ↔ caches, services ↔ queues)
3. Ensure mystery nodes are interesting (not just obvious databases)
4. Keep exactly 3 mystery nodes and 8 components
5. Maintain proper node spacing (150px+ horizontal gap if within 50px vertically)
6. All nodes must be reachable from User

### Connection guidelines:
- Message queues (Kafka, RabbitMQ) connect TO and FROM services, not directly to databases
- Databases are endpoints - services write to them, they don't initiate connections
- Caches should have bidirectional connections with the services using them
- CDN serves content to users and receives content from storage/services

Return ONLY the fixed puzzle as valid JSON (no explanation, no markdown):
`
}

// Analyze puzzle and identify issues
function analyzePuzzle(puzzle: GeneratedPuzzle): string[] {
  const issues: string[] = []
  
  // Check architectural issues
  const archIssues = findArchitecturalIssues(puzzle.nodes)
  issues.push(...archIssues)
  
  // Check bidirectional connections
  const bidirectionalCount = countBidirectionalConnections(puzzle.nodes)
  if (bidirectionalCount < 2) {
    issues.push(`Only ${bidirectionalCount} bidirectional connection(s) found. Add at least 2 for realistic architecture.`)
  }
  
  // Check if mystery nodes are too "obvious" (all databases)
  const mysteryNodes = puzzle.nodes.filter(n => n.mystery)
  const mysteryDatabases = mysteryNodes.filter(n => 
    ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra', 'DynamoDB', 'Elasticsearch', 'Time-Series DB', 'Graph Database'].some(db => n.label.includes(db))
  )
  if (mysteryDatabases.length >= 2) {
    issues.push(`${mysteryDatabases.length} of 3 mystery nodes are databases, which are visually obvious. Mix in more services.`)
  }
  
  // Check component count
  if (puzzle.components.length !== 8) {
    issues.push(`Component list has ${puzzle.components.length} items, needs exactly 8.`)
  }
  
  // Check mystery count
  if (mysteryNodes.length !== 3) {
    issues.push(`Found ${mysteryNodes.length} mystery nodes, needs exactly 3.`)
  }
  
  // Check for isolated nodes
  if (hasIsolatedNodes(puzzle.nodes)) {
    issues.push('Some nodes are not reachable from the User node.')
  }
  
  // Check for overlapping nodes
  if (hasOverlappingNodes(puzzle.nodes)) {
    issues.push('Some nodes overlap visually (within 50px vertically but less than 150px horizontally).')
  }
  
  // Check mystery answers are in components
  const componentSet = new Set(puzzle.components.map(c => c.toLowerCase()))
  for (const node of mysteryNodes) {
    if (!componentSet.has(node.label.toLowerCase())) {
      issues.push(`Mystery node "${node.label}" is not in the components list.`)
    }
  }
  
  // Check that non-mystery visible nodes are NOT in components (they shouldn't be options)
  const visibleNonMystery = puzzle.nodes.filter(n => !n.mystery && n.label !== 'User')
  for (const node of visibleNonMystery) {
    if (componentSet.has(node.label.toLowerCase())) {
      issues.push(`Visible node "${node.label}" should not be in components list (gives away that it's not a mystery).`)
    }
  }
  
  // Check for dead-end message queues (Kafka etc connecting to nothing meaningful)
  const messageQueues = puzzle.nodes.filter(n => 
    ['Kafka', 'RabbitMQ', 'Message Queue', 'Event Bus'].some(mq => n.label.includes(mq))
  )
  for (const mq of messageQueues) {
    // Check if anything connects back to the message queue (consumers)
    const hasConsumers = puzzle.nodes.some(n => n.id !== mq.id && n.connectsTo.includes(mq.id))
    if (!hasConsumers && mq.connectsTo.length > 0) {
      issues.push(`Message queue "${mq.label}" has no consumers (nothing connects back to it for subscribing).`)
    }
  }
  
  return issues
}

// Parse Claude response, handling potential markdown wrapping
function parseClaudeResponse(responseText: string): GeneratedPuzzle {
  let text = responseText.trim()
  
  // Strip markdown code blocks if present
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '')
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/, '')
  }
  
  return JSON.parse(text)
}

// Main generation function with refinement loop
async function generatePuzzleWithRefinement(
  anthropic: Anthropic,
  existingTitles: string[],
  recentTitles: string[],
  allGames: any[]
): Promise<GeneratedPuzzle> {
  const MAX_GENERATION_ATTEMPTS = 3
  const MAX_REFINEMENT_PASSES = 2
  
  // Analyze historical data for variety
  const mysteryFreq = getMysteryComponentFrequency(allGames)
  const decoyFreq = getDecoyComponentFrequency(allGames)
  
  // Components that have been mystery nodes in last 7 days - ban them
  const bannedMysteryComponents = getRecentMysteryComponents(allGames, 7)
  
  // Components used as mystery more than 5 times total - flag as overused
  const overusedMysteryComponents = Array.from(mysteryFreq.entries())
    .filter(([_, count]) => count >= 5)
    .map(([comp, _]) => comp)
  
  // Decoys used more than 10 times - flag as overused
  const overusedDecoys = Array.from(decoyFreq.entries())
    .filter(([_, count]) => count >= 10)
    .map(([comp, _]) => comp)
  
  let lastError: Error | null = null
  let previousErrors: string[] = []
  
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    console.log(`Generation attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}`)
    
    try {
      // Step 1: Initial generation
      const generationPrompt = buildGenerationPrompt(
        existingTitles,
        recentTitles,
        bannedMysteryComponents,
        overusedMysteryComponents,
        overusedDecoys,
        previousErrors
      )
      
      const initialResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: generationPrompt }]
      })
      
      const initialText = initialResponse.content[0].type === 'text' ? initialResponse.content[0].text : ''
      let puzzle = parseClaudeResponse(initialText)
      
      console.log(`Generated initial puzzle: ${puzzle.title}`)
      
      // Step 2: Refinement passes
      for (let refinePass = 1; refinePass <= MAX_REFINEMENT_PASSES; refinePass++) {
        const issues = analyzePuzzle(puzzle)
        
        if (issues.length === 0) {
          console.log(`Puzzle passed validation on refinement pass ${refinePass}`)
          break
        }
        
        console.log(`Refinement pass ${refinePass}: Found ${issues.length} issues`)
        issues.forEach(issue => console.log(`  - ${issue}`))
        
        const refinementPrompt = buildRefinementPrompt(puzzle, issues)
        
        const refinementResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{ role: 'user', content: refinementPrompt }]
        })
        
        const refinedText = refinementResponse.content[0].type === 'text' ? refinementResponse.content[0].text : ''
        puzzle = parseClaudeResponse(refinedText)
        
        console.log(`Refined puzzle: ${puzzle.title}`)
      }
      
      // Step 3: Final validation
      const finalIssues = analyzePuzzle(puzzle)
      
      // Filter to only critical issues
      const criticalIssues = finalIssues.filter(issue => 
        issue.includes('not reachable') || 
        issue.includes('not in the components') ||
        issue.includes('exactly') ||
        issue.includes('Invalid connection')
      )
      
      if (criticalIssues.length > 0) {
        throw new Error(`Critical issues remain: ${criticalIssues.join('; ')}`)
      }
      
      // Basic structure validation
      if (!puzzle.title || !puzzle.components || !puzzle.nodes) {
        throw new Error('Invalid puzzle structure')
      }
      
      if (puzzle.components.length !== 8) {
        throw new Error(`Must have exactly 8 components, got ${puzzle.components.length}`)
      }
      
      const mysteryCount = puzzle.nodes.filter(n => n.mystery).length
      if (mysteryCount !== 3) {
        throw new Error(`Must have exactly 3 mystery nodes, got ${mysteryCount}`)
      }
      
      if (hasIsolatedNodes(puzzle.nodes)) {
        throw new Error('Puzzle has isolated nodes')
      }
      
      if (hasOverlappingNodes(puzzle.nodes)) {
        throw new Error('Puzzle has overlapping nodes')
      }
      
      // Check duplicate title
      if (existingTitles.some(t => t.toLowerCase() === puzzle.title.toLowerCase())) {
        throw new Error('Duplicate title')
      }
      
      // Check similar title
      const similarTitle = recentTitles.find(t => areTitlesSimilar(t, puzzle.title))
      if (similarTitle) {
        throw new Error(`Title too similar to recent: "${similarTitle}"`)
      }
      
      // Success!
      const remainingIssues = finalIssues.filter(i => !criticalIssues.includes(i))
      if (remainingIssues.length > 0) {
        console.log(`Non-critical issues (acceptable): ${remainingIssues.join('; ')}`)
      }
      
      return puzzle
      
    } catch (error) {
      lastError = error as Error
      console.error(`Attempt ${attempt} failed:`, lastError.message)
      previousErrors.push(lastError.message)
      
      if (attempt < MAX_GENERATION_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }
  
  throw new Error(`Failed after ${MAX_GENERATION_ATTEMPTS} attempts. Last error: ${lastError?.message}`)
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
      const start = new Date(body.startDate)
      const end = new Date(body.endDate)
      const current = new Date(start)

      while (current <= end) {
        targetDates.push(getDateString(0, current))
        current.setDate(current.getDate() + 1)
      }
    } else if (body.startDate) {
      targetDates = [body.startDate]
    } else if (body.daysOut !== undefined) {
      targetDates = [getDateString(body.daysOut)]
    } else {
      // Default: check for missing puzzles in the next 14 days
      const lookAheadDays = 14
      for (let i = 0; i <= lookAheadDays; i++) {
        targetDates.push(getDateString(i))
      }
      console.log(`Default mode: checking for missing puzzles in the next ${lookAheadDays} days`)
    }

    const results: Array<{ date: string; status: string; message: string; puzzle?: any }> = []

    // Fetch all existing games
    const { data: allGames, error: fetchError } = await supabase
      .from('daily_games')
      .select('title, date, nodes, components')
      .order('date', { ascending: false })

    if (fetchError) throw fetchError

    // Check which dates already have puzzles
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

    // Limit to 5 puzzles per run
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

    // Generate puzzles
    for (const targetDate of limitedDatesToGenerate) {
      console.log(`\n=== Generating puzzle for ${targetDate} ===`)

      const existingTitles = (allGames || []).map(game => game.title)
      const recentTitles = (allGames || []).slice(0, 14).map(game => game.title)

      try {
        const puzzle = await generatePuzzleWithRefinement(
          anthropic,
          existingTitles,
          recentTitles,
          allGames || []
        )

        const { data: insertedGame, error: insertError } = await supabase
          .from('daily_games')
          .insert({
            date: targetDate,
            title: puzzle.title,
            components: puzzle.components,
            nodes: puzzle.nodes
          })
          .select()
          .single()

        if (insertError) {
          results.push({
            date: targetDate,
            status: 'failed',
            message: `Failed to insert: ${insertError.message}`
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

        // Add to allGames for next iteration
        allGames?.unshift(insertedGame)

      } catch (error) {
        results.push({
          date: targetDate,
          status: 'failed',
          message: `Generation failed: ${(error as Error).message}`
        })
        console.error(`Failed to generate puzzle for ${targetDate}:`, (error as Error).message)
      }
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
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: (error as Error).message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})