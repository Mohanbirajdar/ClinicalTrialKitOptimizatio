"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Brain, TrendingUp, Package, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { ForecastResult, Site } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function SiteForecastPage() {
  const params = useParams();
  const { toast } = useToast();
  const [site, setSite] = useState<Site | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [kitType, setKitType] = useState("Blood Draw Collection Kit");
  const [monthsAhead, setMonthsAhead] = useState("3");

  useEffect(() => {
    fetch(`/api/sites/${params.id}`)
      .then((r) => r.json())
      .then((j) => setSite(j.data));
  }, [params.id]);

  const runForecast = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${params.id}/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kit_type: kitType,
          months_ahead: Number(monthsAhead),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed");
      setForecast(json.data);
      toast({ title: "Forecast generated successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const chartData = forecast
    ? [
        { label: "Predicted Demand", value: forecast.predicted_demand, color: "#6366f1" },
        { label: "Safety Stock", value: forecast.safety_stock, color: "#f97316" },
        { label: "Recommended Total", value: forecast.recommended_qty, color: "#22c55e" },
      ]
    : [];

  return (
    <div>
      <Topbar title="Demand Forecast" />
      <div className="p-6 max-w-4xl space-y-6">
        <Link
          href={`/sites/${params.id}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Site
        </Link>

        {site && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="font-semibold text-blue-900">{site.site_name}</p>
            <p className="text-sm text-blue-700">
              {site.location}, {site.country} · {site.enrolled_patients} enrolled /{" "}
              {site.patient_capacity} capacity · {site.samples_per_patient} samples/patient
            </p>
          </div>
        )}

        {/* Forecast Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" /> Demand Prediction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="space-y-1.5">
                <Label>Kit Type</Label>
                <Input
                  value={kitType}
                  onChange={(e) => setKitType(e.target.value)}
                  placeholder="e.g. Blood Draw Kit"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Forecast Horizon</Label>
                <Select value={monthsAhead} onValueChange={setMonthsAhead}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 6, 9, 12].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} month{m > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={runForecast} disabled={loading} className="w-full gap-2">
                  <Brain className="h-4 w-4" />
                  {loading ? "Predicting..." : "Run Forecast"}
                </Button>
              </div>
            </div>

            {site && (
              <div className="text-sm text-muted-foreground bg-slate-50 rounded p-3">
                <strong>Formula preview:</strong>{" "}
                {site.enrolled_patients ?? 0} patients × {site.samples_per_patient ?? 0} samples ×{" "}
                {monthsAhead} months ={" "}
                <strong className="text-foreground">
                  {(site.enrolled_patients ?? 0) * (site.samples_per_patient ?? 0) * Number(monthsAhead)}{" "}
                  base kits
                </strong>{" "}
                + 20% safety stock
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {forecast && (
          <>
            {/* Result Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-indigo-200 bg-indigo-50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                    <p className="text-sm font-medium text-indigo-700">Predicted Demand</p>
                  </div>
                  <p className="text-4xl font-bold text-indigo-900">
                    {forecast.predicted_demand}
                  </p>
                  <p className="text-xs text-indigo-600 mt-1">kits needed</p>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-5 w-5 text-orange-600" />
                    <p className="text-sm font-medium text-orange-700">Safety Stock</p>
                  </div>
                  <p className="text-4xl font-bold text-orange-900">
                    {forecast.safety_stock}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">20% buffer</p>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-medium text-green-700">Recommended Order</p>
                  </div>
                  <p className="text-4xl font-bold text-green-900">
                    {forecast.recommended_qty}
                  </p>
                  <p className="text-xs text-green-600 mt-1">total kits to order</p>
                </CardContent>
              </Card>
            </div>

            {/* Chart + Details */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Forecast Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Kits" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Model Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prediction Method</span>
                    <span className="font-medium capitalize">
                      {forecast.method.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confidence Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-primary rounded-full"
                          style={{ width: `${forecast.confidence_score * 100}%` }}
                        />
                      </div>
                      <span className="font-medium">
                        {Math.round(forecast.confidence_score * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Horizon</span>
                    <span className="font-medium">{monthsAhead} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kit Type</span>
                    <span className="font-medium">{kitType}</span>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-muted-foreground mb-1">Formula</p>
                    <p className="font-mono text-xs bg-slate-50 p-2 rounded">
                      {forecast.predicted_demand} + {forecast.safety_stock} = {forecast.recommended_qty}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
