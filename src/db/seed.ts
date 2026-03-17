import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { trials, sites, kits, shipments, kitUsage, alerts } from "./schema";
import { addDays, subMonths, subDays, format } from "date-fns";

// Use direct URL for seeding (bypasses pooler DNS issues)
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:6TwdVvMlsXRVdPvh@db.rdxuyrqddgqnkxfddfdo.supabase.co:5432/postgres";

const conn = postgres(DATABASE_URL, { ssl: "require", prepare: false });
const db = drizzle(conn, { schema });

function uid() {
  return crypto.randomUUID();
}

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ── Clear existing data (order: dependents first) ──────────────────────────
  console.log("Clearing old data...");
  await conn`TRUNCATE TABLE alerts, kit_usage, shipments, kits, sites, trials RESTART IDENTITY CASCADE`;

  // ── Trials ─────────────────────────────────────────────────────────────────
  const trial1 = uid(), trial2 = uid(), trial3 = uid();
  await db.insert(trials).values([
    {
      id: trial1,
      trial_name: "AURORA Phase III Oncology Study",
      trial_phase: "Phase III",
      status: "active",
      start_date: "2024-01-15",
      end_date: "2026-12-31",
      sponsor: "Aurora Pharma Inc.",
      protocol_number: "AUR-2024-003",
      description: "A randomized controlled trial for novel oncology treatment.",
    },
    {
      id: trial2,
      trial_name: "NEXUS Phase II Cardiology Trial",
      trial_phase: "Phase II",
      status: "active",
      start_date: "2024-03-01",
      end_date: "2026-06-30",
      sponsor: "Nexus Medical Corp.",
      protocol_number: "NEX-2024-011",
      description: "Phase II trial for new cardiovascular intervention.",
    },
    {
      id: trial3,
      trial_name: "SOLARIS Phase I Immunotherapy",
      trial_phase: "Phase I",
      status: "planning",
      start_date: "2026-06-01",
      end_date: "2027-12-31",
      sponsor: "Solaris Biotech",
      protocol_number: "SOL-2026-001",
      description: "First-in-human immunotherapy study.",
    },
  ]);
  console.log("✓ Trials: 3");

  // ── Sites ──────────────────────────────────────────────────────────────────
  const s1 = uid(), s2 = uid(), s3 = uid(), s4 = uid();
  await db.insert(sites).values([
    {
      id: s1, trial_id: trial1, site_name: "Boston Medical Center",
      location: "Boston, MA", country: "USA", activation_date: "2024-02-01",
      patient_capacity: 100, enrolled_patients: 78, samples_per_patient: 3,
      coordinator_name: "Dr. Sarah Chen", coordinator_email: "s.chen@bmc.org", status: "active",
    },
    {
      id: s2, trial_id: trial1, site_name: "Mayo Clinic Rochester",
      location: "Rochester, MN", country: "USA", activation_date: "2024-02-15",
      patient_capacity: 80, enrolled_patients: 52, samples_per_patient: 3,
      coordinator_name: "Dr. James Liu", coordinator_email: "j.liu@mayo.edu", status: "active",
    },
    {
      id: s3, trial_id: trial2, site_name: "Johns Hopkins Hospital",
      location: "Baltimore, MD", country: "USA", activation_date: "2024-04-01",
      patient_capacity: 60, enrolled_patients: 41, samples_per_patient: 2,
      coordinator_name: "Dr. Emily Ross", coordinator_email: "e.ross@jhu.edu", status: "active",
    },
    {
      id: s4, trial_id: trial2, site_name: "Toronto General Hospital",
      location: "Toronto, ON", country: "Canada", activation_date: "2024-05-01",
      patient_capacity: 50, enrolled_patients: 28, samples_per_patient: 2,
      coordinator_name: "Dr. Michael Park", coordinator_email: "m.park@tgh.ca", status: "active",
    },
  ]);
  console.log("✓ Sites: 4");

  // ── Kits ───────────────────────────────────────────────────────────────────
  const today = new Date();
  const k1 = uid(), k2 = uid(), k3 = uid(), k4 = uid(), k5 = uid();
  await db.insert(kits).values([
    {
      id: k1, kit_type: "Blood Draw Collection Kit", lot_number: "LOT-BDK-2024-001",
      manufacturing_date: format(subMonths(today, 6), "yyyy-MM-dd"),
      expiry_date: format(addDays(today, 270), "yyyy-MM-dd"),
      quantity: 420, unit_cost: "12.50", storage_requirements: "2-8°C, Refrigerated", status: "available",
    },
    {
      id: k2, kit_type: "Urine Sample Collection Kit", lot_number: "LOT-USK-2024-002",
      manufacturing_date: format(subMonths(today, 4), "yyyy-MM-dd"),
      expiry_date: format(addDays(today, 150), "yyyy-MM-dd"),
      quantity: 260, unit_cost: "8.75", storage_requirements: "Room temperature", status: "available",
    },
    {
      id: k3, kit_type: "Tissue Biopsy Kit", lot_number: "LOT-TBK-2024-003",
      manufacturing_date: format(subMonths(today, 2), "yyyy-MM-dd"),
      expiry_date: format(addDays(today, 330), "yyyy-MM-dd"),
      quantity: 130, unit_cost: "45.00", storage_requirements: "-20°C, Frozen", status: "available",
    },
    {
      id: k4, kit_type: "Blood Draw Collection Kit", lot_number: "LOT-BDK-2023-OLD",
      manufacturing_date: format(subMonths(today, 10), "yyyy-MM-dd"),
      expiry_date: format(addDays(today, 22), "yyyy-MM-dd"),
      quantity: 45, unit_cost: "12.50", storage_requirements: "2-8°C, Refrigerated", status: "low_stock",
    },
    {
      id: k5, kit_type: "Plasma Collection Kit", lot_number: "LOT-PCK-2024-EXP",
      manufacturing_date: format(subMonths(today, 8), "yyyy-MM-dd"),
      expiry_date: format(subDays(today, 5), "yyyy-MM-dd"),
      quantity: 12, unit_cost: "18.00", storage_requirements: "-80°C, Ultra-frozen", status: "expired",
    },
  ]);
  console.log("✓ Kits: 5");

  // ── Shipments (6 months of history) ───────────────────────────────────────
  const shipData = [];
  const siteList = [s1, s2, s3, s4];
  const kitList = [k1, k2, k3, k4];
  const qtys = [120, 80, 60, 40, 100, 70, 90, 50];
  let qi = 0;
  for (let m = 5; m >= 0; m--) {
    const base = subMonths(today, m);
    for (let i = 0; i < 2; i++) {
      const site = siteList[(m + i) % 4];
      const kit = kitList[(m + i) % 4];
      const qty = qtys[qi++ % qtys.length];
      const shipDate = format(addDays(base, i * 5 + 3), "yyyy-MM-dd");
      shipData.push({
        id: uid(), site_id: site, kit_id: kit,
        quantity: qty, shipment_date: shipDate,
        tracking_number: `TRK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        carrier: ["FedEx", "UPS", "DHL"][m % 3],
        status: (m > 0 ? "delivered" : "in_transit") as "delivered" | "in_transit",
        notes: `Shipment for month -${m}`,
      });
    }
  }
  await db.insert(shipments).values(shipData);
  console.log(`✓ Shipments: ${shipData.length}`);

  // ── Kit Usage (6 months) ───────────────────────────────────────────────────
  const usageData = [];
  const usedQtys =  [45, 30, 55, 20, 40, 35, 50, 25, 60, 28, 42, 38];
  const wastedQtys = [4,  2,  6,  1,  5,  3,  7,  2,  5,  3,  4,  3];
  let ui = 0;
  for (let m = 5; m >= 0; m--) {
    const base = subMonths(today, m);
    for (let i = 0; i < 2; i++) {
      const site = siteList[(m + i) % 4];
      const kit = kitList[(m + i) % 4];
      usageData.push({
        id: uid(), site_id: site, kit_id: kit,
        usage_date: format(addDays(base, i * 7 + 10), "yyyy-MM-dd"),
        kits_used: usedQtys[ui % usedQtys.length],
        kits_wasted: wastedQtys[ui % wastedQtys.length],
        reason_for_waste: wastedQtys[ui % wastedQtys.length] > 0 ? "Expiry" : null,
        recorded_by: ["Dr. Chen", "Dr. Liu", "Dr. Ross", "Dr. Park"][ui % 4],
      });
      ui++;
    }
  }
  await db.insert(kitUsage).values(usageData);
  console.log(`✓ Kit usage records: ${usageData.length}`);

  // ── Alerts ─────────────────────────────────────────────────────────────────
  const alertRows: (typeof alerts.$inferInsert)[] = [
    {
      id: uid(), alert_type: "expiry_warning", severity: "warning",
      title: "Kit Lot Expiring in 22 Days",
      message: "LOT-BDK-2023-OLD has 45 units expiring in 22 days. Expedite usage or arrange return.",
      entity_type: "kit", entity_id: k4, is_resolved: false,
    },
    {
      id: uid(), alert_type: "expiry_warning", severity: "critical",
      title: "Kit Lot Already Expired",
      message: "LOT-PCK-2024-EXP expired 5 days ago. 12 units must be quarantined immediately.",
      entity_type: "kit", entity_id: k5, is_resolved: false,
    },
    {
      id: uid(), alert_type: "low_stock", severity: "warning",
      title: "Low Stock Warning — Blood Draw Kit",
      message: "LOT-BDK-2023-OLD is at 45 units (below threshold of 50). Reorder recommended.",
      entity_type: "kit", entity_id: k4, is_resolved: false,
    },
    {
      id: uid(), alert_type: "shipment_delayed", severity: "info",
      title: "Shipment In Transit",
      message: "Recent shipment to Boston Medical Center is currently in transit.",
      entity_type: "shipment", entity_id: undefined, is_resolved: false,
    },
    {
      id: uid(), alert_type: "expiry_warning", severity: "info",
      title: "Urine Kit Lot Expiring in 150 Days",
      message: "LOT-USK-2024-002 has 260 units expiring in 5 months. Plan distribution.",
      entity_type: "kit", entity_id: k2, is_resolved: true,
    },
  ];
  await db.insert(alerts).values(alertRows);
  console.log("✓ Alerts: 5");

  console.log("\n✅ Seed complete!");
  await conn.end();
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed error:", e);
  conn.end();
  process.exit(1);
});
