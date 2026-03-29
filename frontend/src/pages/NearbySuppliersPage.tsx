import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import {
  fetchLowStockItems,
  fetchNearbyOsmSuppliers,
  fetchUserSuppliers,
  type LowStockItem,
  type OsmSupplier,
  type UserSupplier,
} from "@/lib/nearbySuppliersApi";
import { AlertTriangle, MapPin, Phone, RefreshCcw, Store } from "lucide-react";

function toNumber(v: string | null | undefined): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function NearbySuppliersPage() {
  const [loading, setLoading] = useState(true);
  const [searchItem, setSearchItem] = useState("");
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [nearbySuppliers, setNearbySuppliers] = useState<OsmSupplier[]>([]);
  const [mySuppliers, setMySuppliers] = useState<UserSupplier[]>([]);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        setGeoError(err.message || "Could not get your location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const [lowResult, myResult] = await Promise.allSettled([
          fetchLowStockItems(),
          fetchUserSuppliers(),
        ]);
        if (!mounted) return;

        if (lowResult.status === "fulfilled") {
          setLowStock(lowResult.value);
          if (lowResult.value.length && !searchItem) {
            setSearchItem(lowResult.value[0].name);
          }
        }

        if (myResult.status === "fulfilled") {
          setMySuppliers(myResult.value);
        }

        const loadErrors: string[] = [];
        if (lowResult.status === "rejected") {
          loadErrors.push(lowResult.reason instanceof Error ? lowResult.reason.message : "Low stock unavailable");
        }
        if (myResult.status === "rejected") {
          loadErrors.push(myResult.reason instanceof Error ? myResult.reason.message : "Your suppliers unavailable");
        }

        if (loadErrors.length) {
          setError(`Some vendor data is unavailable. Nearby OSM suppliers still work. (${loadErrors[0]})`);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const loadNearby = async () => {
    if (!coords) return;
    try {
      setNearbyLoading(true);
      setError(null);
      const response = await fetchNearbyOsmSuppliers(coords.lat, coords.lng, searchItem.trim());
      setNearbySuppliers(response.suppliers);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch nearby suppliers";
      if (message.includes("Overpass API is currently busy")) {
        setError("Nearby supplier servers are busy right now. We already retried automatically. Please tap Refresh in a few seconds.");
      } else {
        setError(message);
      }
      setNearbySuppliers([]);
    } finally {
      setNearbyLoading(false);
    }
  };

  useEffect(() => {
    if (coords) {
      void loadNearby();
    }
  }, [coords]);

  const mySuppliersWithDistance = useMemo<Array<UserSupplier & { distanceKm: number | null }>>(() => {
    if (!coords) return mySuppliers.map((s) => ({ ...s, distanceKm: null }));
    return mySuppliers
      .map((s) => {
        const lat = toNumber(s.lat);
        const lng = toNumber(s.lng);
        if (lat === null || lng === null) return { ...s, distanceKm: null as number | null };
        return {
          ...s,
          distanceKm: Number(haversineKm(coords.lat, coords.lng, lat, lng).toFixed(2)),
        };
      })
      .sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [mySuppliers, coords]);

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <SkeletonLoader type="text" lines={1} />
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Nearby Suppliers</h1>

        <BrutalCard highlight={lowStock.length ? "warning" : "success"}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className={lowStock.length ? "text-warning" : "text-success"} />
            <h2 className="text-lg font-bold">Low Stock Alert</h2>
          </div>

          {lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground font-medium">No low-stock items right now.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {lowStock.map((item) => (
                <BrutalBadge key={item.id} variant="warning">
                  {item.name}: {item.currentQuantity}{item.unit}
                </BrutalBadge>
              ))}
            </div>
          )}
        </BrutalCard>

        <BrutalCard highlight="primary">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <h2 className="text-lg font-bold">Nearby Suppliers (OSM)</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <input
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
                placeholder="Search item (e.g. rice, milk)"
                className="brutal-input px-3 py-2 min-w-[240px]"
              />
              <BrutalButton variant="primary" onClick={loadNearby} loading={nearbyLoading}>
                <RefreshCcw size={14} /> Refresh
              </BrutalButton>
            </div>
          </div>

          {!coords && (
            <p className="text-sm text-warning font-medium mb-3">
              {geoError || "Waiting for location permission to load nearby suppliers."}
            </p>
          )}

          {error && <p className="text-sm text-destructive font-medium mb-3">{error}</p>}

          <div className="space-y-3">
            {nearbySuppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground font-medium">No nearby suppliers found for this location/query.</p>
            ) : (
              nearbySuppliers.map((supplier, idx) => {
                const mapUrl = `https://www.google.com/maps/search/?api=1&query=${supplier.latitude},${supplier.longitude}`;
                return (
                  <div key={`${supplier.name}-${idx}`} className="brutal-card p-4 bg-muted/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-base">{supplier.name}</p>
                        <p className="text-sm text-muted-foreground font-medium">
                          {supplier.distanceKm.toFixed(2)} km • {supplier.category}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <a href={mapUrl} target="_blank" rel="noreferrer">
                          <BrutalButton size="sm" variant="outline">Open in Maps</BrutalButton>
                        </a>
                        {supplier.phone ? (
                          <a href={`tel:${supplier.phone}`}>
                            <BrutalButton size="sm" variant="primary">
                              <Phone size={14} /> Call
                            </BrutalButton>
                          </a>
                        ) : (
                          <BrutalButton size="sm" variant="outline" disabled>
                            <Phone size={14} /> No Phone
                          </BrutalButton>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </BrutalCard>

        <BrutalCard highlight="secondary">
          <div className="flex items-center gap-2 mb-3">
            <Store size={18} className="text-primary" />
            <h2 className="text-lg font-bold">Your Suppliers</h2>
          </div>

          <div className="space-y-3">
            {mySuppliersWithDistance.length === 0 ? (
              <p className="text-sm text-muted-foreground font-medium">No user-added suppliers yet.</p>
            ) : (
              mySuppliersWithDistance.map((supplier) => {
                const lat = toNumber(supplier.lat);
                const lng = toNumber(supplier.lng);
                const mapUrl = lat !== null && lng !== null
                  ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
                  : undefined;

                return (
                  <div key={supplier.id} className="brutal-card p-4 bg-muted/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-base">{supplier.name}</p>
                        <p className="text-sm text-muted-foreground font-medium">
                          {supplier.category || "general"}
                          {" • "}
                          {supplier.distanceKm !== null
                            ? `${supplier.distanceKm.toFixed(2)} km`
                            : "distance unavailable"}
                        </p>
                        {supplier.addressRaw && (
                          <p className="text-xs text-muted-foreground mt-1">{supplier.addressRaw}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {mapUrl ? (
                          <a href={mapUrl} target="_blank" rel="noreferrer">
                            <BrutalButton size="sm" variant="outline">Open in Maps</BrutalButton>
                          </a>
                        ) : (
                          <BrutalButton size="sm" variant="outline" disabled>Open in Maps</BrutalButton>
                        )}
                        {supplier.phone ? (
                          <a href={`tel:${supplier.phone}`}>
                            <BrutalButton size="sm" variant="primary">
                              <Phone size={14} /> Call
                            </BrutalButton>
                          </a>
                        ) : (
                          <BrutalButton size="sm" variant="outline" disabled>
                            <Phone size={14} /> No Phone
                          </BrutalButton>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </BrutalCard>
      </div>
    </AppLayout>
  );
}
