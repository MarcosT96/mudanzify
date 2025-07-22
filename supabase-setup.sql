-- =====================================================
-- MUDANZIFY - Supabase Database Setup
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: user_locations
-- Almacena las ubicaciones guardadas por usuarios autenticados
-- =====================================================
CREATE TABLE user_locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mapbox_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  address TEXT,
  coordinates JSONB NOT NULL, -- {lat: number, lng: number}
  custom_data JSONB DEFAULT '{}', -- {link?: string, price?: string, contact?: string}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: anonymous_locations  
-- Almacena las ubicaciones de usuarios anónimos (por session_id)
-- =====================================================
CREATE TABLE anonymous_locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id VARCHAR NOT NULL, -- Browser fingerprint o ID único
  mapbox_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  address TEXT,
  coordinates JSONB NOT NULL, -- {lat: number, lng: number}
  custom_data JSONB DEFAULT '{}', -- {link?: string, price?: string, contact?: string}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES para mejorar performance
-- =====================================================
CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX idx_user_locations_mapbox_id ON user_locations(mapbox_id);
CREATE INDEX idx_anonymous_locations_session_id ON anonymous_locations(session_id);
CREATE INDEX idx_anonymous_locations_mapbox_id ON anonymous_locations(mapbox_id);

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Habilitar RLS en ambas tablas
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_locations ENABLE ROW LEVEL SECURITY;

-- Política para user_locations: usuarios solo pueden ver/editar sus propias ubicaciones
CREATE POLICY "Users can view own locations" ON user_locations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own locations" ON user_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own locations" ON user_locations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own locations" ON user_locations
  FOR DELETE USING (auth.uid() = user_id);

-- Política para anonymous_locations: acceso público (controlado por session_id en el cliente)
CREATE POLICY "Anonymous locations are publicly accessible" ON anonymous_locations
  FOR ALL USING (true);

-- =====================================================
-- TRIGGERS para updated_at automático
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para ambas tablas
CREATE TRIGGER update_user_locations_updated_at 
  BEFORE UPDATE ON user_locations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anonymous_locations_updated_at 
  BEFORE UPDATE ON anonymous_locations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función para migrar datos anónimos a usuario autenticado
CREATE OR REPLACE FUNCTION migrate_anonymous_to_user(
  p_session_id VARCHAR,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  migrated_count INTEGER;
BEGIN
  -- Insertar ubicaciones anónimas como ubicaciones de usuario
  INSERT INTO user_locations (user_id, mapbox_id, name, address, coordinates, custom_data)
  SELECT 
    p_user_id,
    mapbox_id,
    name,
    address,
    coordinates,
    custom_data
  FROM anonymous_locations 
  WHERE session_id = p_session_id;
  
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  
  -- Eliminar ubicaciones anónimas migradas
  DELETE FROM anonymous_locations WHERE session_id = p_session_id;
  
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE user_locations IS 'Ubicaciones guardadas por usuarios autenticados';
COMMENT ON TABLE anonymous_locations IS 'Ubicaciones guardadas por usuarios anónimos usando session_id';
COMMENT ON FUNCTION migrate_anonymous_to_user IS 'Migra ubicaciones anónimas a un usuario autenticado';

-- =====================================================
-- DATOS DE EJEMPLO (OPCIONAL - SOLO PARA TESTING)
-- =====================================================

-- Descomenta las siguientes líneas si quieres datos de ejemplo
/*
INSERT INTO anonymous_locations (session_id, mapbox_id, name, address, coordinates, custom_data) VALUES
('test-session-123', 'mapbox.test.1', 'Palermo', 'Palermo, Buenos Aires', '{"lat": -34.5755, "lng": -58.4338}', '{"price": "$150000", "contact": "WhatsApp"}'),
('test-session-123', 'mapbox.test.2', 'Recoleta', 'Recoleta, Buenos Aires', '{"lat": -34.5875, "lng": -58.3974}', '{"link": "https://example.com", "price": "$200000"}');
*/
