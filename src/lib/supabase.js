import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only create client if credentials are available
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Cache for component info to avoid repeated fetches
let componentInfoCache = null

// Fetch all component info from Supabase
export async function fetchComponentInfo() {
  // Return cached data if available
  if (componentInfoCache) {
    return componentInfoCache
  }

  // Return empty object if Supabase isn't configured
  if (!supabase) {
    console.warn('Supabase not configured - component info features disabled')
    return {}
  }

  try {
    const { data, error } = await supabase
      .from('component_info')
      .select('*')

    if (error) {
      console.error('Error fetching component info:', error)
      return {}
    }

    // Convert array to object keyed by component_name for quick lookup
    const infoMap = {}
    data?.forEach(item => {
      infoMap[item.component_name] = {
        shape: item.node_shape,
        category: item.category,
        description: item.short_description,
        link: item.docs_link || item.wiki_link,
        aliases: item.aliases || []
      }
    })

    componentInfoCache = infoMap
    return infoMap
  } catch (error) {
    console.error('Error fetching component info:', error)
    return {}
  }
}

// Get info for a specific component (with alias support)
export function getComponentInfo(componentName, componentInfoMap) {
  // Try exact match first
  if (componentInfoMap[componentName]) {
    return componentInfoMap[componentName]
  }

  // Try case-insensitive match or alias match
  const lowerName = componentName.toLowerCase()
  for (const [key, value] of Object.entries(componentInfoMap)) {
    // Check if canonical name matches (case-insensitive)
    if (key.toLowerCase() === lowerName) {
      return value
    }
    // Check if any alias matches (case-insensitive)
    if (value.aliases?.some(alias => alias.toLowerCase() === lowerName)) {
      return value
    }
  }

  // Default fallback
  return {
    shape: 'rectangle',
    category: null,
    description: null,
    link: null,
    aliases: []
  }
}