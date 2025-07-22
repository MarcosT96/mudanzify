import React from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { 
  Plus, 
  Trash2, 
  Navigation, 
  ExternalLink, 
  MapPin, 
  LocateIcon,
  X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LocationFeature, iconMap } from "@/lib/mapbox/utils";

type LocationPopupProps = {
  location: LocationFeature;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  customData: { link?: string; price?: string; contact?: string };
  setCustomData: (data: { link?: string; price?: string; contact?: string }) => void;
  onDeleteLocation?: () => void;
  onClose: () => void;
};

export const LocationPopupNative = React.memo(function LocationPopupNative({ 
  location,
  showForm, 
  setShowForm, 
  customData, 
  setCustomData, 
  onDeleteLocation,
  onClose 
}: LocationPopupProps) {

  if (!location) return null;

  const { properties, geometry } = location;
  const name = properties?.name || "Unknown Location";
  const address = properties?.full_address || properties?.address || "";
  const categories = properties?.poi_category || [];
  const brand = properties?.brand?.[0] || "";
  const status = properties?.operational_status || "";
  const maki = properties?.maki || "";
  const lat = geometry?.coordinates?.[1] || properties?.coordinates?.latitude;
  const lng = geometry?.coordinates?.[0] || properties?.coordinates?.longitude;

  const getIcon = () => {
    const allKeys = [maki, ...(categories || [])];
    for (const key of allKeys) {
      const lower = key?.toLowerCase();
      if (iconMap[lower]) return iconMap[lower];
    }
    return <LocateIcon className="h-5 w-5" />;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowForm(false);
  };

  return (
    <React.Fragment>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
        <div className="bg-background border border-border rounded-lg shadow-lg w-[300px] sm:w-[350px] overflow-hidden">
          <div className="p-4 pb-3">
            <div className="flex items-start gap-3">
              <div className="bg-rose-500/10 p-2 rounded-full shrink-0">
                {getIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="font-semibold text-sm leading-tight truncate">
                    {name}
                  </h3>
                  <button 
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-sm hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {status && (
                  <Badge
                    variant={status === "active" ? "outline" : "secondary"}
                    className={cn(
                      "text-xs mt-1",
                      status === "active" ? "border-green-500 text-green-600" : ""
                    )}
                  >
                    {status === "active" ? "Open" : status}
                  </Badge>
                )}
              </div>
            </div>
            {brand && brand !== name && (
              <p className="text-sm font-medium text-muted-foreground mt-2">
                {brand}
              </p>
            )}
            {address && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                <MapPin className="h-3 w-3 inline mr-1 opacity-70" />
                {address}
              </p>
            )}
          </div>

          <div className="px-4 pb-4 space-y-3">
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1 max-w-full">
                {categories.slice(0, 3).map((category, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs capitalize truncate max-w-[100px]"
                  >
                    {category}
                  </Badge>
                ))}
                {categories.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{categories.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            <Separator />

            {showForm ? (
              <form
                className="space-y-3"
                onSubmit={handleSubmit}
                autoComplete="off"
              >
                <Input
                  name="link"
                  type="text"
                  placeholder="Link publicación"
                  value={customData.link || ""}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    setCustomData({ ...customData, [name]: value });
                  }}
                  className="text-sm"
                />
                <Input
                  name="price"
                  type="text"
                  placeholder="Precio"
                  value={customData.price || ""}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    setCustomData({ ...customData, [name]: value });
                  }}
                  className="text-sm"
                />
                <Input
                  name="contact"
                  type="text"
                  placeholder="Método de contacto"
                  value={customData.contact || ""}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    setCustomData({ ...customData, [name]: value });
                  }}
                  className="text-sm"
                />
                <div className="flex gap-2 mt-4">
                  <Button size="sm" type="submit" className="flex-1">
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center"
                  onClick={() => {
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                      "_blank"
                    );
                  }}
                >
                  <Navigation className="h-4 w-4 mr-1.5" />
                  Directions
                </Button>
                {customData.link || customData.price || customData.contact ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex items-center justify-center"
                    onClick={() => {
                      setCustomData({});
                      setShowForm(false);
                      if (typeof onDeleteLocation === 'function') onDeleteLocation();
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Eliminar datos
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className="flex items-center justify-center"
                    onClick={() => setShowForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Agregar datos
                  </Button>
                )}
                {properties?.external_ids?.website && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="col-span-2 flex items-center justify-center mt-1"
                    onClick={() => {
                      window.open(properties.external_ids?.website, "_blank");
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Visit Website
                  </Button>
                )}
              </div>
            )}
            
            {!showForm && (customData.link || customData.price || customData.contact) && (
              <div className="mt-3 p-2 rounded bg-muted/30 text-xs">
                {customData.link && (
                  <div>
                    <span className="font-medium">Link:</span> {customData.link}
                  </div>
                )}
                {customData.price && (
                  <div>
                    <span className="font-medium">Precio:</span> {customData.price}
                  </div>
                )}
                {customData.contact && (
                  <div>
                    <span className="font-medium">Contacto:</span> {customData.contact}
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
              <div className="flex justify-between items-center">
                <span className="truncate max-w-[170px]">
                  ID: {properties?.mapbox_id?.substring(0, 8)}...
                </span>
                <span className="text-right">
                  {lat?.toFixed(4)}, {lng?.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
});
