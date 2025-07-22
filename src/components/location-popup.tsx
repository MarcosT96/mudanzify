import { LocationFeature } from "@/lib/mapbox/utils";
import React from "react";
import { LocationPopupNative } from "./location-popup-native";

type LocationPopupProps = {
  location: LocationFeature;
  onClose?: () => void;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  customData: { link?: string; price?: string; contact?: string };
  setCustomData: (data: { link?: string; price?: string; contact?: string }) => void;
  onDeleteLocation?: () => void;
};

export const LocationPopup = React.memo(function LocationPopup({ location, onClose, showForm, setShowForm, customData, setCustomData, onDeleteLocation }: LocationPopupProps) {
  if (!location) return null;

  // Popup definitivo sin bug de focus
  return (
    <LocationPopupNative
      location={location}
      showForm={showForm}
      setShowForm={setShowForm}
      customData={customData}
      setCustomData={setCustomData}
      onDeleteLocation={onDeleteLocation}
      onClose={() => onClose?.()}
    />
  );
});
