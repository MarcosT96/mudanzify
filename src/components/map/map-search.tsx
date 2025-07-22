"use client";

import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Loader2, MapPin, X } from "lucide-react";
import { useState, useEffect } from "react";

import { useDebounce } from "@/hooks/useDebounce";
import { useMap } from "@/context/map-context";
import { cn } from "@/lib/utils";
import {
  iconMap,
  LocationFeature,
  LocationSuggestion,
} from "@/lib/mapbox/utils";
import { LocationMarker } from "../location-marker";
import { LocationPopup } from "../location-popup";
import { locationService } from "@/lib/location-service";
import { AuthButton } from "../auth/auth-button";
import React from "react";

export default function MapSearch() {
  const { map } = useMap();
  const [query, setQuery] = useState("");
  const [displayValue, setDisplayValue] = useState("");
  const [results, setResults] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationFeature | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<LocationFeature[]>(
    []
  );
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);


  // Estado de formularios personalizados por ubicación
  const [customForms, setCustomForms] = useState<{
    [id: string]: {
      showForm: boolean;
      customData: { link?: string; price?: string; contact?: string };
    };
  }>({});

  // Cargar ubicaciones guardadas al inicializar
  useEffect(() => {
    loadSavedLocations();
  }, []);

  const loadSavedLocations = async () => {
    try {
      setIsLoadingLocations(true);
      const savedLocations = await locationService.getLocations();
      
      // Convertir LocationData a LocationFeature para el mapa
      const locationFeatures: LocationFeature[] = savedLocations.map(loc => ({
        type: 'Feature',
        properties: {
          mapbox_id: loc.mapbox_id,
          name: loc.name,
          feature_type: 'poi', // Tipo por defecto
          full_address: loc.address,
          address: loc.address,
          context: {}, // Contexto vacío por defecto
          coordinates: {
            latitude: loc.coordinates.lat,
            longitude: loc.coordinates.lng
          }
        },
        geometry: {
          type: 'Point',
          coordinates: [loc.coordinates.lng, loc.coordinates.lat]
        }
      }));
      
      setSelectedLocations(locationFeatures);
      
      // Cargar datos personalizados en customForms
      const forms: typeof customForms = {};
      savedLocations.forEach(loc => {
        if (loc.custom_data && Object.keys(loc.custom_data).length > 0) {
          forms[loc.mapbox_id] = {
            showForm: false,
            customData: loc.custom_data
          };
        }
      });
      setCustomForms(forms);
      
    } catch (error) {
      console.error('Error loading saved locations:', error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  function handleShowForm(id: string, show: boolean) {
    setCustomForms(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { customData: {} }),
        showForm: show,
      },
    }));
  }

  function handleCustomData(id: string, data: { link?: string; price?: string; contact?: string }) {
    setCustomForms(prev => {
      const prevData = prev[id]?.customData || {};
      // Solo crear un nuevo objeto si el contenido cambia
      if (
        prevData.link === data.link &&
        prevData.price === data.price &&
        prevData.contact === data.contact
      ) {
        return prev;
      }
      return {
        ...prev,
        [id]: {
          ...(prev[id] || { showForm: false }),
          customData: data,
        },
      };
    });
    
    // Persistir cambios en la base de datos
    saveCustomDataToPersistence(id, data);
  }
  
  const saveCustomDataToPersistence = async (mapboxId: string, customData: any) => {
    try {
      await locationService.updateLocation(mapboxId, { custom_data: customData });
    } catch (error) {
      console.error('Error saving custom data:', error);
    }
  };

  const handleDeleteLocation = async (mapboxId: string) => {
    try {
      // Eliminar de la base de datos/localStorage
      await locationService.deleteLocation(mapboxId);
      
      // Eliminar de selectedLocations
      setSelectedLocations(prev => prev.filter(loc => loc.properties.mapbox_id !== mapboxId));
      
      // Limpiar datos personalizados
      setCustomForms(prev => {
        const newForms = { ...prev };
        delete newForms[mapboxId];
        return newForms;
      });
      
      // Cerrar popup si está abierto para esta ubicación
      setSelectedLocation(prev => 
        prev?.properties.mapbox_id === mapboxId ? null : prev
      );
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchLocations = async () => {
      setIsSearching(true);
      setIsOpen(true);

      try {
        let proximity = "";
        if (map && typeof map.getCenter === "function") {
          const center = map.getCenter();
          proximity = `&proximity=${center.lng},${center.lat}`;
        }
        const res = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(
            debouncedQuery
          )}&access_token=${
            process.env.NEXT_PUBLIC_MAPBOX_TOKEN
          }&session_token=${
            process.env.NEXT_PUBLIC_MAPBOX_SESSION_TOKEN
          }&country=AR&limit=5${proximity}`
        );

        const data = await res.json();
        setResults(data.suggestions ?? []);
      } catch (err) {
        console.error("Geocoding error:", err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    searchLocations();
  }, [debouncedQuery]);

  // Handle input change
  const handleInputChange = (value: string) => {
    setQuery(value);
    setDisplayValue(value);
  };

  // Handle location selection
  const handleSelect = async (suggestion: LocationSuggestion) => {
    try {
      setIsSearching(true);

      const res = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&session_token=${process.env.NEXT_PUBLIC_MAPBOX_SESSION_TOKEN}`
      );

      const data = await res.json();
      const featuresData = data?.features;

      if (map && featuresData?.length > 0) {
        const coordinates = featuresData[0]?.geometry?.coordinates;

        map.flyTo({
          center: coordinates,
          zoom: 14,
          speed: 4,
          duration: 1000,
          essential: true,
        });

        // Limpiar el input para permitir nueva búsqueda inmediatamente
        setDisplayValue("");
        setQuery("");
        setResults([]);
        setIsOpen(false);

        // Agregar la nueva ubicación solo si no existe en el array
        const newLocation = featuresData[0];
        if (!selectedLocations.some(loc => loc.properties.mapbox_id === newLocation.properties.mapbox_id)) {
          setSelectedLocations([...selectedLocations, newLocation]);
          
          // Guardar en persistencia
          try {
            await locationService.saveLocation(newLocation);
          } catch (error) {
            console.error('Error saving location:', error);
          }
        }
        // Siempre abrir popup al seleccionar una nueva ubicación
        setSelectedLocation(newLocation);
      }
    } catch (err) {
      console.error("Retrieve error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setQuery("");
    setDisplayValue("");
    setResults([]);
    setIsOpen(false);
    setSelectedLocation(null);
    // NO eliminar selectedLocations - deben persistir
    // setSelectedLocations([]);
  };

  return (
    <>
      <section className="absolute top-4 left-1/2 sm:left-4 z-10 w-[90vw] sm:w-[350px] -translate-x-1/2 sm:translate-x-0 rounded-lg shadow-lg">
        <Command className="rounded-lg">
          <div
            className={cn(
              "w-full flex items-center justify-between px-3 gap-1",
              isOpen && "border-b"
            )}
          >
            <CommandInput
              placeholder="Search locations..."
              value={displayValue}
              onValueChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results.length > 0 && !isSearching) {
                  e.preventDefault();
                  handleSelect(results[0]);
                }
              }}
              className="flex-1"
            />
            {displayValue && !isSearching && (
              <X
                className="size-4 shrink-0 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={clearSearch}
              />
            )}
            {isSearching && (
              <Loader2 className="size-4 shrink-0 text-primary animate-spin" />
            )}
          </div>

          {isOpen && (
            <CommandList className="max-h-60 overflow-y-auto">
              {!query.trim() || isSearching ? null : results.length === 0 ? (
                <CommandEmpty className="py-6 text-center">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <p className="text-sm font-medium">No locations found</p>
                    <p className="text-xs text-muted-foreground">
                      Try a different search term
                    </p>
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {results.map((location) => (
                    <CommandItem
                      key={location.mapbox_id}
                      onSelect={() => handleSelect(location)}
                      value={`${location.name} ${location.place_formatted} ${location.mapbox_id}`}
                      className="flex items-center py-3 px-2 cursor-pointer hover:bg-accent rounded-md"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="bg-primary/10 p-1.5 rounded-full">
                          {location.maki && iconMap[location.maki] ? (
                            iconMap[location.maki]
                          ) : (
                            <MapPin className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate max-w-[270px]">
                            {location.name}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[270px]">
                            {location.place_formatted}
                          </span>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          )}
        </Command>
      </section>

      {selectedLocations.map((location) => (
        <LocationMarker
          key={location.properties.mapbox_id}
          location={location}
          onHover={() => {
            // Solo para efectos visuales (hover del marker), no abre popup
          }}
          onClick={(data) => {
            // Solo click abre el popup
            setSelectedLocation(data);
          }}
        />
      ))}

      {/* Refactor: hooks fuera de condicionales */}
      {(() => {
        const mapboxId = selectedLocation?.properties.mapbox_id;
        const showForm = mapboxId ? customForms[mapboxId]?.showForm || false : false;
        const customData = React.useMemo(
          () => (mapboxId ? customForms[mapboxId]?.customData || {} : {}),
          [mapboxId, mapboxId ? customForms[mapboxId]?.customData : null]
        );
        const setShowForm = (show: boolean) => mapboxId && handleShowForm(mapboxId, show);
        const setCustomData = (data: { link?: string; price?: string; contact?: string }) => mapboxId && handleCustomData(mapboxId, data);
        return selectedLocation ? (
          <LocationPopup
            key={mapboxId}
            location={selectedLocation}
            onClose={() => {
              setSelectedLocation(null);
            }}
            showForm={showForm}
            setShowForm={setShowForm}
            customData={customData}
            setCustomData={setCustomData}
            onDeleteLocation={() => mapboxId && handleDeleteLocation(mapboxId)}
          />
        ) : null;
      })()}

      {/* Botón de autenticación flotante */}
      <div className="absolute top-4 right-4 z-10">
        <AuthButton />
      </div>

    </>
  );
}
