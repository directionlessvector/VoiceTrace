import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { suggestions } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { createAlertNotification, type NotificationChannel } from "@/lib/alertsApi";
import { useLanguage } from "@/contexts/LanguageContext";
import { Package, ArrowUp, ArrowDown, Minus, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";

type Trend = "increasing" | "stable" | "decreasing";
type Confidence = "high" | "medium" | "low";
type WeatherConfidence = "high" | "medium" | "low";

type ForecastDay = {
  date: string;
  tempC: number;
  rainProbability: number;
  condition: string;
  icon: string;
};

type WeatherSuggestion = {
  item: string;
  suggestedQuantity: string;
  reason: string;
  confidence: WeatherConfidence;
  icon: string;
  weatherLabel: string;
};

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

function weatherCodeToCondition(code: number): { condition: string; icon: string } {
  if (code === 0) return { condition: "Clear", icon: "01d" };
  if ([1, 2, 3].includes(code)) return { condition: "Clouds", icon: "03d" };
  if ([45, 48].includes(code)) return { condition: "Fog", icon: "50d" };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: "Drizzle", icon: "09d" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: "Rain", icon: "10d" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: "Snow", icon: "13d" };
  if ([95, 96, 99].includes(code)) return { condition: "Thunderstorm", icon: "11d" };
  return { condition: "Clouds", icon: "03d" };
}

function pickBestDailySlotsFromOpenMeteo(hourly: {
  time: string[];
  temperature_2m: number[];
  precipitation_probability?: number[];
  weathercode?: number[];
}): ForecastDay[] {
  const grouped = new Map<string, Array<{ idx: number; hour: number }>>();

  hourly.time.forEach((iso, idx) => {
    const [date, time] = iso.split("T");
    const hour = Number(time?.split(":")[0] ?? "12");
    grouped.set(date, [...(grouped.get(date) ?? []), { idx, hour }]);
  });

  return [...grouped.entries()]
    .slice(0, 3)
    .map(([date, rows]) => {
      const best = rows.reduce((closest, curr) =>
        Math.abs(curr.hour - 12) < Math.abs(closest.hour - 12) ? curr : closest
      );

      const temp = Math.round(hourly.temperature_2m[best.idx] ?? 0);
      const rain = Math.round(hourly.precipitation_probability?.[best.idx] ?? 0);
      const code = Math.round(hourly.weathercode?.[best.idx] ?? 0);
      const mapped = weatherCodeToCondition(code);

      return {
        date,
        tempC: temp,
        rainProbability: rain,
        condition: mapped.condition,
        icon: mapped.icon,
      };
    });
}

function toWeatherBadgeVariant(confidence: WeatherConfidence): "confirmed" | "warning" | "danger" {
  if (confidence === "high") return "confirmed";
  if (confidence === "medium") return "warning";
  return "danger";
}

function buildWeatherSuggestions(forecast: ForecastDay[]): WeatherSuggestion[] {
  const suggestionsOut: WeatherSuggestion[] = [];

  const hotDay = forecast.find((d) => d.tempC > 32);
  if (hotDay) {
    suggestionsOut.push({
      item: "Cold Drinks & Ice Cream",
      suggestedQuantity: "Increase by 25%",
      reason: `Temperature is expected to reach ${hotDay.tempC}°C, so cooling items can sell faster.`,
      confidence: "high",
      icon: hotDay.icon,
      weatherLabel: `${hotDay.date} • ${hotDay.condition}`,
    });
  }

  const rainyDay = forecast.find((d) => d.rainProbability > 50);
  if (rainyDay) {
    suggestionsOut.push({
      item: "Leafy Greens & Fast-Perishables",
      suggestedQuantity: "Reduce by 20%",
      reason: `Rain chance is ${rainyDay.rainProbability}%, so footfall may dip and perishables can move slower.`,
      confidence: "medium",
      icon: rainyDay.icon,
      weatherLabel: `${rainyDay.date} • ${rainyDay.condition}`,
    });
  }

  const coldDay = forecast.find((d) => d.tempC <= 20);
  if (coldDay) {
    suggestionsOut.push({
      item: "Tea & Coffee",
      suggestedQuantity: "Increase by 18%",
      reason: `Cool weather around ${coldDay.tempC}°C can increase demand for hot beverages.`,
      confidence: "high",
      icon: coldDay.icon,
      weatherLabel: `${coldDay.date} • ${coldDay.condition}`,
    });
  }

  if (suggestionsOut.length < 2 && forecast.length) {
    const avgTemp = Math.round(forecast.reduce((sum, d) => sum + d.tempC, 0) / forecast.length);
    const avgRain = Math.round(forecast.reduce((sum, d) => sum + d.rainProbability, 0) / forecast.length);
    suggestionsOut.push({
      item: "Daily Essentials",
      suggestedQuantity: "Keep baseline +10%",
      reason: `Weather is moderate (avg ${avgTemp}°C, rain ${avgRain}%), so maintain a small buffer stock.`,
      confidence: "low",
      icon: forecast[0].icon,
      weatherLabel: `${forecast[0].date} • ${forecast[0].condition}`,
    });
  }

  return suggestionsOut.slice(0, 4);
}

function inferTrend(reason: string, currentQty: number, suggestedQty: number): Trend {
  const lower = reason.toLowerCase();
  if (/(no change|matches demand|stable)/.test(lower)) return "stable";
  if (suggestedQty > currentQty || /(high demand|sold out|runs out|increase|festival)/.test(lower)) return "increasing";
  if (suggestedQty < currentQty) return "decreasing";
  return "stable";
}

function inferConfidence(reason: string, delta: number, stockOutRisk: boolean): Confidence {
  const lower = reason.toLowerCase();
  if (stockOutRisk || /(historical|daily demand|sold out|3x|high demand)/.test(lower)) return "high";
  if (Math.abs(delta) >= 2) return "medium";
  return "low";
}

export default function SuggestionsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [weatherSuggestions, setWeatherSuggestions] = useState<WeatherSuggestion[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [sendingChannel, setSendingChannel] = useState<NotificationChannel | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  const enriched = suggestions
    .map((s) => {
      const delta = s.suggestedQty - s.currentQty;
      const stockOutRisk = s.currentQty <= 3 || /sold out|runs out/i.test(s.reason);
      const trend = inferTrend(s.reason, s.currentQty, s.suggestedQty);
      const confidence = inferConfidence(s.reason, delta, stockOutRisk);
      const highDemand = trend === "increasing" && delta >= 4;
      const priority =
        (stockOutRisk ? 100 : 0) +
        (highDemand ? 40 : 0) +
        (confidence === "high" ? 20 : confidence === "medium" ? 10 : 0) +
        Math.max(0, delta);

      return {
        ...s,
        delta,
        stockOutRisk,
        trend,
        confidence,
        highDemand,
        priority,
      };
    })
    .sort((a, b) => b.priority - a.priority);

  const increasingCount = enriched.filter((item) => item.trend === "increasing").length;
  const stockOutCount = enriched.filter((item) => item.stockOutRisk).length;
  const topPriority = enriched[0];

  const handleAcceptAll = () => {
    toast({
      title: "Suggestions accepted",
      description: `Applied ${enriched.length} stock recommendations in priority order.`,
    });
  };

  const handleManualEdit = () => {
    setManualMode((prev) => !prev);
    toast({
      title: manualMode ? "Manual mode off" : "Manual mode on",
      description: manualMode ? "Back to AI suggestions view." : "You can now fine-tune quantities manually.",
    });
  };

  const buildSuggestionsMessage = (): string => {
    const stockLines = enriched.slice(0, 5).map((item, index) => {
      const delta = item.suggestedQty - item.currentQty;
      const sign = delta > 0 ? `+${delta}` : `${delta}`;
      return `${index + 1}. ${item.item}: ${item.currentQty} -> ${item.suggestedQty} (${sign}) | ${item.trend} | ${item.confidence}`;
    });

    const weatherLines = weatherSuggestions.slice(0, 3).map((item, index) => {
      return `${index + 1}. ${item.item}: ${item.suggestedQuantity} (${item.weatherLabel})`;
    });

    const sections = [
      "VoiceTrace Stock Suggestions",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "Priority Stock Actions:",
      ...(stockLines.length ? stockLines : ["No stock suggestions available"]),
    ];

    if (weatherLines.length) {
      sections.push("", "Weather Signals:", ...weatherLines);
    }

    if (topPriority) {
      sections.push("", `Top Priority: ${topPriority.item} (+${Math.max(0, topPriority.delta)} suggested)`);
    }

    return sections.join("\n");
  };

  const handleSendSuggestions = async (channel: NotificationChannel) => {
    try {
      setSendingChannel(channel);
      const sent = await createAlertNotification({
        channel,
        messageBody: buildSuggestionsMessage(),
      });

      const destination = sent.destination || "configured destination";
      const provider = sent.provider ? ` via ${sent.provider}` : "";

      toast({
        title: `Suggestions ${sent.status} for ${channel.toUpperCase()}`,
        description: `Sent to ${destination}${provider}`,
      });
    } catch (error) {
      toast({
        title: `Failed to send via ${channel.toUpperCase()}`,
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingChannel(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadWeather = async () => {
      try {
        setWeatherLoading(true);
        setWeatherError(null);

        const latitude = Number(import.meta.env.VITE_WEATHER_LAT ?? 19.076);
        const longitude = Number(import.meta.env.VITE_WEATHER_LON ?? 72.8777);

        const params = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          hourly: "temperature_2m,precipitation_probability,weathercode",
          timezone: "auto",
        });

        const res = await fetch(`${OPEN_METEO_URL}?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Open-Meteo API failed: ${res.status}`);
        }

        const data = (await res.json()) as {
          hourly?: {
            time: string[];
            temperature_2m: number[];
            precipitation_probability?: number[];
            weathercode?: number[];
          };
        };

        if (!data.hourly?.time?.length) {
          throw new Error("Open-Meteo returned no hourly forecast data");
        }

        const picked = pickBestDailySlotsFromOpenMeteo(data.hourly);
        const generated = buildWeatherSuggestions(picked);

        if (!mounted) return;
        setForecast(picked);
        setWeatherSuggestions(generated);
      } catch (error) {
        if (!mounted) return;
        setWeatherError(error instanceof Error ? error.message : "Unable to fetch weather forecast");
        setForecast([]);
        setWeatherSuggestions([]);
      } finally {
        if (mounted) setWeatherLoading(false);
      }
    };

    void loadWeather();
    return () => {
      mounted = false;
    };
  }, []);

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
        <h1 className="text-2xl md:text-3xl font-bold">{t("page.suggestions")}</h1>
        <p className="text-muted-foreground font-medium">{t("page.suggestionsSubtitle")}</p>

        <BrutalCard className="p-4" highlight="primary">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              <h2 className="text-lg font-bold">Weather Forecast (Top Signal)</h2>
            </div>

            {weatherLoading && <BrutalBadge variant="info">Loading forecast</BrutalBadge>}
            {!weatherLoading && !weatherError && <BrutalBadge variant="confirmed">Weather linked</BrutalBadge>}
            {!weatherLoading && weatherError && <BrutalBadge variant="danger">Forecast error</BrutalBadge>}
          </div>

          <div className="mt-3">
            {weatherLoading && (
              <p className="text-sm text-muted-foreground font-medium">Fetching Open-Meteo data for smart stock prediction...</p>
            )}

            {!weatherLoading && weatherError && (
              <div className="space-y-1">
                <p className="text-sm font-bold text-destructive">Could not load weather suggestions</p>
                <p className="text-sm text-muted-foreground">{weatherError}</p>
                <p className="text-xs font-medium text-muted-foreground">
                  Check network access and optional VITE_WEATHER_LAT / VITE_WEATHER_LON values in frontend env.
                </p>
              </div>
            )}

            {!weatherLoading && !weatherError && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {forecast.map((day) => (
                    <div key={day.date} className="brutal-border bg-muted/50 p-3 flex items-center gap-2">
                      <img
                        src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                        alt={day.condition}
                        className="w-10 h-10"
                      />
                      <div>
                        <p className="text-sm font-bold">{day.date}</p>
                        <p className="text-xs text-muted-foreground font-medium">{day.tempC} C | Rain {day.rainProbability}%</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 mt-4">
                  {weatherSuggestions.slice(0, 4).map((w, idx) => (
                    <div key={`${w.item}-${idx}`} className="brutal-card p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <img
                            src={`https://openweathermap.org/img/wn/${w.icon}.png`}
                            alt={w.item}
                            className="w-12 h-12 brutal-border bg-card"
                          />
                          <div>
                            <h3 className="font-bold">{w.item}</h3>
                            <p className="text-sm font-medium text-muted-foreground mt-1">{w.reason}</p>
                            <p className="text-xs mt-1 font-bold uppercase text-primary">{w.weatherLabel}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="brutal-border p-2 bg-primary/10 text-center min-w-[120px]">
                            <p className="text-xs font-bold uppercase text-muted-foreground">Suggestion</p>
                            <p className="text-sm font-black text-primary">{w.suggestedQuantity}</p>
                          </div>
                          <BrutalBadge variant={toWeatherBadgeVariant(w.confidence)}>{w.confidence} confidence</BrutalBadge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </BrutalCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BrutalCard className="p-4" highlight="secondary">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-primary" />
              <p className="text-sm font-bold uppercase">Demand Trend</p>
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {increasingCount} of {enriched.length} items show increasing demand this cycle.
            </p>
          </BrutalCard>

          <BrutalCard className="p-4" highlight={stockOutCount > 0 ? "warning" : "success"}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className={stockOutCount > 0 ? "text-warning" : "text-success"} />
              <p className="text-sm font-bold uppercase">Stock-Out Risk</p>
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {stockOutCount > 0
                ? `${stockOutCount} items are at stock-out risk and prioritized first.`
                : "No immediate stock-out risks detected."}
            </p>
          </BrutalCard>

          <BrutalCard className="p-4" highlight="primary">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={16} className="text-primary" />
              <p className="text-sm font-bold uppercase">Top Priority</p>
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {topPriority ? `${topPriority.item}: suggested +${Math.max(0, topPriority.delta)} units.` : "No suggestions available."}
            </p>
          </BrutalCard>
        </div>

        <div className="space-y-4">
          {enriched.map((s) => {
            const needsMore = s.suggestedQty > s.currentQty;
            const trendIcon = s.trend === "increasing"
              ? <ArrowUp size={16} className="text-warning" />
              : s.trend === "decreasing"
                ? <ArrowDown size={16} className="text-destructive" />
                : <Minus size={16} className="text-success" />;

            const confidenceVariant =
              s.confidence === "high"
                ? "confirmed"
                : s.confidence === "medium"
                  ? "warning"
                  : "danger";

            const trendVariant =
              s.trend === "increasing"
                ? "warning"
                : s.trend === "stable"
                  ? "confirmed"
                  : "danger";

            return (
              <BrutalCard
                key={s.id}
                highlight={s.stockOutRisk ? "warning" : needsMore ? "warning" : "success"}
                className={s.stockOutRisk ? "bg-warning/10" : ""}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-sm brutal-border flex items-center justify-center shrink-0 bg-muted">
                      <Package size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold">{s.item}</h3>
                      <p className="text-sm text-muted-foreground font-medium mt-1">{s.reason}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {s.stockOutRisk && (
                          <BrutalBadge variant="warning">
                            <span className="inline-flex items-center gap-1">
                              <AlertTriangle size={12} /> Stock-Out Detected
                            </span>
                          </BrutalBadge>
                        )}
                        <BrutalBadge variant={confidenceVariant}>Confidence: {s.confidence}</BrutalBadge>
                        <BrutalBadge variant={trendVariant}>
                          <span className="inline-flex items-center gap-1">
                            {trendIcon}
                            {s.trend}
                          </span>
                        </BrutalBadge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center brutal-border p-2 bg-muted/60">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Current</p>
                      <p className="font-mono text-lg font-bold text-muted-foreground">{s.currentQty}</p>
                    </div>
                    {needsMore ? <ArrowUp size={20} className="text-warning" /> : <Minus size={20} className="text-success" />}
                    <div className="text-center brutal-border p-2 bg-primary/10 min-w-[90px]">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Suggested</p>
                      <p className="font-mono text-3xl leading-none font-black text-primary">{s.suggestedQty}</p>
                    </div>
                    {needsMore && <BrutalBadge variant="warning">Increase</BrutalBadge>}
                    {!needsMore && <BrutalBadge variant="confirmed">OK</BrutalBadge>}
                  </div>
                </div>
              </BrutalCard>
            );
          })}
        </div>

        <BrutalCard className="mt-6 p-4 bg-muted/40">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg">Finalize Suggestions</h3>
              <p className="text-sm text-muted-foreground font-medium">Apply all prioritized updates at once or adjust item-by-item manually.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <BrutalButton variant="primary" onClick={handleAcceptAll}>Accept All Suggestions</BrutalButton>
              <BrutalButton variant="outline" onClick={handleManualEdit}>{manualMode ? "Exit Manual Edit" : "Edit Manually"}</BrutalButton>
              <BrutalButton
                variant="outline"
                onClick={() => handleSendSuggestions("whatsapp")}
                disabled={sendingChannel !== null}
              >
                {sendingChannel === "whatsapp" ? "Sending WhatsApp..." : "Send on WhatsApp"}
              </BrutalButton>
              <BrutalButton
                variant="outline"
                onClick={() => handleSendSuggestions("sms")}
                disabled={sendingChannel !== null}
              >
                {sendingChannel === "sms" ? "Sending SMS..." : "Send on SMS"}
              </BrutalButton>
            </div>
          </div>
        </BrutalCard>
      </div>
    </AppLayout>
  );
}
