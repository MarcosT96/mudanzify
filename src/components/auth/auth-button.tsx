"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, LogIn, LogOut, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { locationService } from "@/lib/location-service";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// Función para obtener la URL base correcta según el entorno
const getBaseUrl = () => {
  // En desarrollo
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001';
  }
  
  // En producción, usar variables de entorno o detectar automáticamente
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // Fallback: detectar desde window.location (solo en cliente)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback final para producción
  return 'https://mudanzify.vercel.app';
};

export function AuthButton() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [localLocationCount, setLocalLocationCount] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    // Obtener usuario inicial
    getUser();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        await locationService.refreshAuth();
        
        // Si el usuario se logueó y hay datos locales, ofrecer migración
        if (event === 'SIGNED_IN' && locationService.hasLocalData()) {
          await handleDataMigration();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const getUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Contar ubicaciones locales
      const count = await locationService.getLocationCount();
      setLocalLocationCount(count);
    } catch (error) {
      console.error('Error getting user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDataMigration = async () => {
    try {
      setIsMigrating(true);
      const migratedCount = await locationService.migrateAnonymousDataToUser();
      
      if (migratedCount > 0) {
        console.log(`Migrated ${migratedCount} locations to user account`);
        // Actualizar contador
        const newCount = await locationService.getLocationCount();
        setLocalLocationCount(newCount);
      }
    } catch (error) {
      console.error('Error migrating data:', error);
    } finally {
      setIsMigrating(false);
    }
  };

  const signIn = async () => {
    try {
      setLoading(true);
      
      // Abrir popup nativo de Supabase con múltiples opciones
      const baseUrl = getBaseUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${baseUrl}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });
      
      if (error) {
        // Si falla Google, mostrar opción de email como fallback
        const email = prompt('Ingresa tu email para recibir un enlace de acceso:');
        if (email) {
          const { error: emailError } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${baseUrl}/auth/callback`
            }
          });
          
          if (emailError) throw emailError;
          alert('✅ Revisa tu email para el enlace de acceso');
        }
      }
    } catch (error) {
      console.error('Error signing in:', error);
      alert('❌ Error al iniciar sesión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <User className="h-4 w-4" />
      </Button>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {localLocationCount > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {localLocationCount}
          </Badge>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          disabled={isMigrating}
          className="flex items-center gap-2"
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">
            {user.email?.split('@')[0] || 'Usuario'}
          </span>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {localLocationCount > 0 && (
        <Badge variant="outline" className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {localLocationCount} local
        </Badge>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={signIn}
        className="flex items-center gap-2"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Ingresar</span>
      </Button>
    </div>
  );
}
