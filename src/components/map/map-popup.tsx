"use client";

import { useMap } from "@/context/map-context";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

type PopupProps = {
  children: React.ReactNode;
  latitude?: number;
  longitude?: number;
  onClose?: () => void;
  marker?: mapboxgl.Marker;
} & mapboxgl.PopupOptions;

export default function Popup({
  latitude,
  longitude,
  children,
  marker,
  onClose,
  className,
  ...props
}: PopupProps) {
  const { map } = useMap();

  // UseRef to keep container stable across renders
  const containerRef = useRef<HTMLDivElement | null>(null);
  if (!containerRef.current) {
    containerRef.current = document.createElement("div");
  }
  const container = containerRef.current;

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // Guardar instancia del popup para no recrearlo en cada render
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    if (!map) return;
    // Solo crear el popup si no existe o si cambia marker/coords
    if (!popupRef.current) {
      const popupOptions: mapboxgl.PopupOptions = {
        closeButton: true,
        closeOnClick: false,
        anchor: 'bottom',
        className: `mapboxgl-custom-popup ${className ?? ''}`,
        focusAfterOpen: false,
      };
      const popup = new mapboxgl.Popup(popupOptions)
        .setDOMContent(container)
        .setMaxWidth("none");
      popup.on("close", handleClose);
      popupRef.current = popup;
      if (marker) {
        const currentPopup = marker.getPopup();
        if (currentPopup) {
          currentPopup.remove();
        }
        marker.setPopup(popup);
        marker.togglePopup();
      } else if (latitude !== undefined && longitude !== undefined) {
        popup.setLngLat([longitude, latitude]).addTo(map);
      }
    } else {
      // Solo mover el popup si cambian coords
      if (!marker && latitude !== undefined && longitude !== undefined) {
        popupRef.current.setLngLat([longitude, latitude]);
      }
    }
    return () => {
      if (popupRef.current) {
        popupRef.current.off("close", handleClose);
        popupRef.current.remove();
        popupRef.current = null;
      }
      if (marker && marker.getPopup()) {
        marker.setPopup(null);
      }
    };
  }, [map, marker, latitude, longitude, className, handleClose, container]);

  // El container nunca cambia, React actualiza el contenido normalmente
  return createPortal(children, container);

}
