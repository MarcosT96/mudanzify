import { LocationData } from './supabase'

// =====================================================
// STORAGE LOCAL (localStorage)
// =====================================================

const STORAGE_KEYS = {
  LOCATIONS: 'mudanzify_locations',
  SESSION_ID: 'mudanzify_session_id',
  USER_PREFERENCES: 'mudanzify_preferences'
} as const

// Generar ID único para sesión anónima
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${randomStr}`
}

// Obtener o crear session ID para usuario anónimo
export function getSessionId(): string {
  if (typeof window === 'undefined') return '' // SSR safety
  
  let sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID)
  if (!sessionId) {
    sessionId = generateSessionId()
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId)
  }
  return sessionId
}

// =====================================================
// GESTIÓN DE UBICACIONES LOCALES
// =====================================================

export function getLocalLocations(): LocationData[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LOCATIONS)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error reading local locations:', error)
    return []
  }
}

export function saveLocalLocation(location: LocationData): void {
  if (typeof window === 'undefined') return
  
  try {
    const locations = getLocalLocations()
    
    // Verificar si ya existe (por mapbox_id)
    const existingIndex = locations.findIndex(loc => loc.mapbox_id === location.mapbox_id)
    
    if (existingIndex >= 0) {
      // Actualizar existente
      locations[existingIndex] = {
        ...locations[existingIndex],
        ...location,
        updated_at: new Date().toISOString()
      }
    } else {
      // Agregar nuevo
      locations.push({
        ...location,
        id: generateSessionId(), // ID temporal local
        session_id: getSessionId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }
    
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations))
  } catch (error) {
    console.error('Error saving local location:', error)
  }
}

export function updateLocalLocation(mapboxId: string, updates: Partial<LocationData>): void {
  if (typeof window === 'undefined') return
  
  try {
    const locations = getLocalLocations()
    const index = locations.findIndex(loc => loc.mapbox_id === mapboxId)
    
    if (index >= 0) {
      locations[index] = {
        ...locations[index],
        ...updates,
        updated_at: new Date().toISOString()
      }
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations))
    }
  } catch (error) {
    console.error('Error updating local location:', error)
  }
}

export function deleteLocalLocation(mapboxId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const locations = getLocalLocations()
    const filtered = locations.filter(loc => loc.mapbox_id !== mapboxId)
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error deleting local location:', error)
  }
}

export function clearLocalLocations(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(STORAGE_KEYS.LOCATIONS)
  } catch (error) {
    console.error('Error clearing local locations:', error)
  }
}

// =====================================================
// UTILIDADES
// =====================================================

export function getLocalLocationCount(): number {
  return getLocalLocations().length
}

export function hasLocalData(): boolean {
  return getLocalLocationCount() > 0
}

// Convertir LocationFeature (del mapa) a LocationData (para storage)
export function locationFeatureToData(
  feature: any, 
  customData: { link?: string; price?: string; contact?: string } = {}
): LocationData {
  const { properties, geometry } = feature
  
  return {
    mapbox_id: properties.mapbox_id,
    name: properties.name || 'Unknown Location',
    address: properties.full_address || properties.address || '',
    coordinates: {
      lat: geometry.coordinates[1],
      lng: geometry.coordinates[0]
    },
    custom_data: customData
  }
}
