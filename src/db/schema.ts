import {
  pgTable,
  pgEnum,
  varchar,
  integer,
  date,
  numeric,
  timestamp,
  text,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── ENUMS ────────────────────────────────────────────────────────────────────
export const trialPhaseEnum = pgEnum("trial_phase", [
  "Phase I",
  "Phase II",
  "Phase III",
  "Phase IV",
]);

export const trialStatusEnum = pgEnum("trial_status", [
  "planning",
  "active",
  "completed",
  "suspended",
]);

export const siteStatusEnum = pgEnum("site_status", [
  "pending",
  "active",
  "closed",
]);

export const kitStatusEnum = pgEnum("kit_status", [
  "available",
  "low_stock",
  "expired",
  "depleted",
]);

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "preparing",
  "shipped",
  "in_transit",
  "delivered",
  "cancelled",
]);

export const alertTypeEnum = pgEnum("alert_type", [
  "expiry_warning",
  "low_stock",
  "overstock",
  "shipment_delayed",
  "high_wastage",
]);

export const severityEnum = pgEnum("severity", ["info", "warning", "critical"]);

// ─── CLINICAL TRIALS ─────────────────────────────────────────────────────────
export const trials = pgTable("trials", {
  id: varchar("id", { length: 36 }).primaryKey(),
  trial_name: varchar("trial_name", { length: 255 }).notNull(),
  trial_phase: trialPhaseEnum("trial_phase").notNull(),
  status: trialStatusEnum("status").default("planning"),
  start_date: date("start_date").notNull(),
  end_date: date("end_date"),
  description: text("description"),
  sponsor: varchar("sponsor", { length: 255 }),
  protocol_number: varchar("protocol_number", { length: 100 }),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── SITES ────────────────────────────────────────────────────────────────────
export const sites = pgTable(
  "sites",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    trial_id: varchar("trial_id", { length: 36 })
      .notNull()
      .references(() => trials.id, { onDelete: "cascade" }),
    site_name: varchar("site_name", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }).notNull(),
    country: varchar("country", { length: 100 }).notNull(),
    activation_date: date("activation_date").notNull(),
    patient_capacity: integer("patient_capacity").notNull(),
    enrolled_patients: integer("enrolled_patients").default(0),
    samples_per_patient: integer("samples_per_patient").default(1),
    coordinator_name: varchar("coordinator_name", { length: 255 }),
    coordinator_email: varchar("coordinator_email", { length: 255 }),
    status: siteStatusEnum("status").default("pending"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    trialIdx: index("trial_idx").on(table.trial_id),
  })
);

// ─── KITS ────────────────────────────────────────────────────────────────────
export const kits = pgTable(
  "kits",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    kit_type: varchar("kit_type", { length: 100 }).notNull(),
    lot_number: varchar("lot_number", { length: 100 }).notNull().unique(),
    manufacturing_date: date("manufacturing_date").notNull(),
    expiry_date: date("expiry_date").notNull(),
    quantity: integer("quantity").notNull().default(0),
    unit_cost: numeric("unit_cost", { precision: 10, scale: 2 }),
    storage_requirements: varchar("storage_requirements", { length: 255 }),
    status: kitStatusEnum("status").default("available"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    expiryIdx: index("expiry_idx").on(table.expiry_date),
    statusIdx: index("status_idx").on(table.status),
  })
);

// ─── SHIPMENTS ───────────────────────────────────────────────────────────────
export const shipments = pgTable(
  "shipments",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    site_id: varchar("site_id", { length: 36 })
      .notNull()
      .references(() => sites.id),
    kit_id: varchar("kit_id", { length: 36 })
      .notNull()
      .references(() => kits.id),
    quantity: integer("quantity").notNull(),
    shipment_date: date("shipment_date").notNull(),
    expected_delivery_date: date("expected_delivery_date"),
    actual_delivery_date: date("actual_delivery_date"),
    tracking_number: varchar("tracking_number", { length: 100 }),
    status: shipmentStatusEnum("status").default("preparing"),
    notes: text("notes"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    siteIdx: index("shipment_site_idx").on(table.site_id),
    kitIdx: index("shipment_kit_idx").on(table.kit_id),
    dateIdx: index("shipment_date_idx").on(table.shipment_date),
  })
);

// ─── KIT USAGE ───────────────────────────────────────────────────────────────
export const kitUsage = pgTable(
  "kit_usage",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    site_id: varchar("site_id", { length: 36 })
      .notNull()
      .references(() => sites.id),
    kit_id: varchar("kit_id", { length: 36 })
      .notNull()
      .references(() => kits.id),
    kits_used: integer("kits_used").notNull(),
    kits_returned: integer("kits_returned").default(0),
    kits_wasted: integer("kits_wasted").default(0),
    usage_date: date("usage_date").notNull(),
    patient_count: integer("patient_count"),
    notes: text("notes"),
    reported_by: varchar("reported_by", { length: 255 }),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    usageSiteIdx: index("usage_site_idx").on(table.site_id),
    usageDateIdx: index("usage_date_idx").on(table.usage_date),
  })
);

// ─── DEMAND FORECASTS ────────────────────────────────────────────────────────
export const demandForecasts = pgTable("demand_forecasts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  site_id: varchar("site_id", { length: 36 })
    .notNull()
    .references(() => sites.id),
  kit_type: varchar("kit_type", { length: 100 }).notNull(),
  forecast_date: date("forecast_date").notNull(),
  predicted_demand: integer("predicted_demand").notNull(),
  safety_stock: integer("safety_stock").notNull(),
  recommended_qty: integer("recommended_qty").notNull(),
  confidence_score: numeric("confidence_score", { precision: 5, scale: 2 }),
  model_version: varchar("model_version", { length: 50 }),
  months_ahead: integer("months_ahead").default(3),
  created_at: timestamp("created_at").defaultNow(),
});

// ─── ALERTS ──────────────────────────────────────────────────────────────────
export const alerts = pgTable(
  "alerts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    alert_type: alertTypeEnum("alert_type").notNull(),
    severity: severityEnum("severity").notNull(),
    entity_type: varchar("entity_type", { length: 50 }),
    entity_id: varchar("entity_id", { length: 36 }),
    message: text("message").notNull(),
    is_resolved: boolean("is_resolved").default(false),
    resolved_at: timestamp("resolved_at"),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    resolvedIdx: index("resolved_idx").on(table.is_resolved),
    alertTypeIdx: index("alert_type_idx").on(table.alert_type),
  })
);

// ─── RELATIONS ───────────────────────────────────────────────────────────────
export const trialsRelations = relations(trials, ({ many }) => ({
  sites: many(sites),
}));

export const sitesRelations = relations(sites, ({ one, many }) => ({
  trial: one(trials, { fields: [sites.trial_id], references: [trials.id] }),
  shipments: many(shipments),
  usage: many(kitUsage),
  forecasts: many(demandForecasts),
}));

export const kitsRelations = relations(kits, ({ many }) => ({
  shipments: many(shipments),
  usage: many(kitUsage),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  site: one(sites, { fields: [shipments.site_id], references: [sites.id] }),
  kit: one(kits, { fields: [shipments.kit_id], references: [kits.id] }),
}));

export const kitUsageRelations = relations(kitUsage, ({ one }) => ({
  site: one(sites, { fields: [kitUsage.site_id], references: [sites.id] }),
  kit: one(kits, { fields: [kitUsage.kit_id], references: [kits.id] }),
}));

export const demandForecastsRelations = relations(
  demandForecasts,
  ({ one }) => ({
    site: one(sites, {
      fields: [demandForecasts.site_id],
      references: [sites.id],
    }),
  })
);
