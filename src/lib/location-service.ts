import { supabase, LocationData } from './supabase'
import { 
  getLocalLocations, 
  saveLocalLocation, 
  updateLocalLocation, 
  deleteLocalLocation,
  clearLocalLocations,
  hasLocalData,
  getSessionId,
  locationFeatureToData
} from './storage'

// =====================================================
// LOCATION SERVICE - Maneja persistencia unificada
// =====================================================

export class LocationService {
  private static instance: LocationService
  private isAuthenticated = false
  private userId: string | null = null

  private constructor() {
    this.initializeAuth()
  }

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService()
    }
    return LocationService.instance
  }

  // =====================================================
  // AUTENTICACIÓN
  // =====================================================

  private async initializeAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    this.isAuthenticated = !!user
    this.userId = user?.id || null
  }

  async refreshAuth() {
    await this.initializeAuth()
  }

  isUserAuthenticated(): boolean {
    return this.isAuthenticated
  }

  getUserId(): string | null {
    return this.userId
  }

  // =====================================================
  // CRUD OPERATIONS
  // =====================================================

  async getLocations(): Promise<LocationData[]> {
    if (this.isAuthenticated && this.userId) {
      return this.getUserLocations()
    } else {
      return this.getAnonymousLocations()
    }
  }

  async saveLocation(locationFeature: any, customData: any = {}): Promise<void> {
    const locationData = locationFeatureToData(locationFeature, customData)
    
    if (this.isAuthenticated && this.userId) {
      await this.saveUserLocation(locationData)
    } else {
      await this.saveAnonymousLocation(locationData)
    }
  }

  async updateLocation(mapboxId: string, updates: Partial<LocationData>): Promise<void> {
    if (this.isAuthenticated && this.userId) {
      await this.updateUserLocation(mapboxId, updates)
    } else {
      await this.updateAnonymousLocation(mapboxId, updates)
    }
  }

  async deleteLocation(mapboxId: string): Promise<void> {
    if (this.isAuthenticated && this.userId) {
      await this.deleteUserLocation(mapboxId)
    } else {
      await this.deleteAnonymousLocation(mapboxId)
    }
  }

  // =====================================================
  // MÉTODOS PARA USUARIOS AUTENTICADOS
  // =====================================================

  private async getUserLocations(): Promise<LocationData[]> {
    try {
      const { data, error } = await supabase
        .from('user_locations')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching user locations:', error)
      return []
    }
  }

  private async saveUserLocation(location: LocationData): Promise<void> {
    try {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('user_locations')
        .select('id')
        .eq('user_id', this.userId)
        .eq('mapbox_id', location.mapbox_id)
        .single()

      if (existing) {
        // Actualizar existente
        const { error } = await supabase
          .from('user_locations')
          .update({
            name: location.name,
            address: location.address,
            coordinates: location.coordinates,
            custom_data: location.custom_data
          })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('user_locations')
          .insert({
            user_id: this.userId,
            mapbox_id: location.mapbox_id,
            name: location.name,
            address: location.address,
            coordinates: location.coordinates,
            custom_data: location.custom_data
          })

        if (error) throw error
      }
    } catch (error) {
      console.error('Error saving user location:', error)
      throw error
    }
  }

  private async updateUserLocation(mapboxId: string, updates: Partial<LocationData>): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_locations')
        .update(updates)
        .eq('user_id', this.userId)
        .eq('mapbox_id', mapboxId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating user location:', error)
      throw error
    }
  }

  private async deleteUserLocation(mapboxId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_locations')
        .delete()
        .eq('user_id', this.userId)
        .eq('mapbox_id', mapboxId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting user location:', error)
      throw error
    }
  }

  // =====================================================
  // MÉTODOS PARA USUARIOS ANÓNIMOS
  // =====================================================

  private async getAnonymousLocations(): Promise<LocationData[]> {
    // Primero intentar desde Supabase (si hay conexión)
    try {
      const sessionId = getSessionId()
      const { data, error } = await supabase
        .from('anonymous_locations')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        return data
      }
    } catch (error) {
      console.log('Supabase not available, using localStorage')
    }

    // Fallback a localStorage
    return getLocalLocations()
  }

  private async saveAnonymousLocation(location: LocationData): Promise<void> {
    // Guardar en localStorage (siempre)
    saveLocalLocation(location)

    // Intentar guardar en Supabase también
    try {
      const sessionId = getSessionId()
      
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('anonymous_locations')
        .select('id')
        .eq('session_id', sessionId)
        .eq('mapbox_id', location.mapbox_id)
        .single()

      if (existing) {
        // Actualizar existente
        await supabase
          .from('anonymous_locations')
          .update({
            name: location.name,
            address: location.address,
            coordinates: location.coordinates,
            custom_data: location.custom_data
          })
          .eq('id', existing.id)
      } else {
        // Crear nuevo
        await supabase
          .from('anonymous_locations')
          .insert({
            session_id: sessionId,
            mapbox_id: location.mapbox_id,
            name: location.name,
            address: location.address,
            coordinates: location.coordinates,
            custom_data: location.custom_data
          })
      }
    } catch (error) {
      console.log('Could not save to Supabase, localStorage used as fallback')
    }
  }

  private async updateAnonymousLocation(mapboxId: string, updates: Partial<LocationData>): Promise<void> {
    // Actualizar localStorage
    updateLocalLocation(mapboxId, updates)

    // Intentar actualizar Supabase
    try {
      const sessionId = getSessionId()
      await supabase
        .from('anonymous_locations')
        .update(updates)
        .eq('session_id', sessionId)
        .eq('mapbox_id', mapboxId)
    } catch (error) {
      console.log('Could not update in Supabase, localStorage updated')
    }
  }

  private async deleteAnonymousLocation(mapboxId: string): Promise<void> {
    // Eliminar de localStorage
    deleteLocalLocation(mapboxId)

    // Intentar eliminar de Supabase
    try {
      const sessionId = getSessionId()
      await supabase
        .from('anonymous_locations')
        .delete()
        .eq('session_id', sessionId)
        .eq('mapbox_id', mapboxId)
    } catch (error) {
      console.log('Could not delete from Supabase, localStorage updated')
    }
  }

  // =====================================================
  // MIGRACIÓN DE DATOS
  // =====================================================

  async migrateAnonymousDataToUser(): Promise<number> {
    if (!this.isAuthenticated || !this.userId) {
      throw new Error('User must be authenticated to migrate data')
    }

    try {
      const sessionId = getSessionId()
      
      // Llamar función de migración en Supabase
      const { data, error } = await supabase.rpc('migrate_anonymous_to_user', {
        p_session_id: sessionId,
        p_user_id: this.userId
      })

      if (error) throw error

      // Limpiar localStorage después de migración exitosa
      clearLocalLocations()

      return data || 0
    } catch (error) {
      console.error('Error migrating anonymous data:', error)
      throw error
    }
  }

  // =====================================================
  // UTILIDADES
  // =====================================================

  hasLocalData(): boolean {
    return hasLocalData()
  }

  async getLocationCount(): Promise<number> {
    const locations = await this.getLocations()
    return locations.length
  }
}

// Exportar instancia singleton
export const locationService = LocationService.getInstance()
