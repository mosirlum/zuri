"use client";

import { useState, useEffect } from "react";
import { REGIONS, getLocations } from "@/lib/regions";

interface RegionLocationProps {
  regionLabel: string;
  locationLabel: string;
  regionValue: string;
  locationValue: string;
  onRegionChange: (value: string) => void;
  onLocationChange: (value: string) => void;
}

export default function RegionLocation({
  regionLabel,
  locationLabel,
  regionValue,
  locationValue,
  onRegionChange,
  onLocationChange,
}: RegionLocationProps) {
  const [locations, setLocations] = useState<string[]>([]);
  const [customLocation, setCustomLocation] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (regionValue) {
      const locs = getLocations(regionValue);
      setLocations(locs);
      // Reset location when region changes
      onLocationChange("");
      setCustomLocation("");
      setShowCustom(false);
    } else {
      setLocations([]);
    }
  }, [regionValue]);

  const handleLocationChange = (value: string) => {
    if (value === "Other (specify below)") {
      setShowCustom(true);
      onLocationChange(customLocation);
    } else {
      setShowCustom(false);
      onLocationChange(value);
    }
  };

  const handleCustomChange = (value: string) => {
    setCustomLocation(value);
    onLocationChange(value);
  };

  return (
    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Region */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium">
          {regionLabel}
        </label>
        <select
          value={regionValue}
          onChange={e => onRegionChange(e.target.value)}
          className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors"
        >
          <option value="">— Select Region —</option>
          {REGIONS.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium">
          {locationLabel}
        </label>
        {!regionValue ? (
          <input
            type="text"
            placeholder="Select a region first"
            disabled
            className="w-full border border-ink/15 bg-paper-soft text-muted px-3 py-2.5 rounded-lg text-sm cursor-not-allowed"
          />
        ) : (
          <select
            value={showCustom ? "Other (specify below)" : locationValue}
            onChange={e => handleLocationChange(e.target.value)}
            className="w-full border border-ink/15 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors"
          >
            <option value="">— Select Location —</option>
            {locations.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        )}
      </div>

      {/* Custom location input — shows when "Other" is selected */}
      {showCustom && (
        <div className="sm:col-span-2">
          <label className="block text-xs tracking-widest uppercase text-muted mb-1.5 font-medium">
            Specify Location
          </label>
          <input
            type="text"
            value={customLocation}
            onChange={e => handleCustomChange(e.target.value)}
            placeholder="Type the exact location..."
            className="w-full border border-gold/50 bg-paper text-ink px-3 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
