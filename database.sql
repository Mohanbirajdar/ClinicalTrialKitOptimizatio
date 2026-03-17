-- ============================================================
-- Clinical Trial Kit Optimization System — Database Schema
-- PostgreSQL 14+
-- ============================================================

-- ─── ENUMS ──────────────────────────────────────────────────
CREATE TYPE trial_phase AS ENUM ('Phase I', 'Phase II', 'Phase III', 'Phase IV');
CREATE TYPE trial_status AS ENUM ('planning', 'active', 'completed', 'suspended');
CREATE TYPE site_status AS ENUM ('pending', 'active', 'closed');
CREATE TYPE kit_status AS ENUM ('available', 'low_stock', 'expired', 'depleted');
CREATE TYPE shipment_status AS ENUM ('preparing', 'shipped', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE alert_type AS ENUM ('expiry_warning', 'low_stock', 'overstock', 'shipment_delayed', 'high_wastage');
CREATE TYPE severity AS ENUM ('info', 'warning', 'critical');

-- ─── TRIALS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trials (
  id              VARCHAR(36)    PRIMARY KEY,
  trial_name      VARCHAR(255)   NOT NULL,
  trial_phase     trial_phase    NOT NULL,
  status          trial_status   DEFAULT 'planning',
  start_date      DATE           NOT NULL,
  end_date        DATE,
  description     TEXT,
  sponsor         VARCHAR(255),
  protocol_number VARCHAR(100),
  created_at      TIMESTAMP      DEFAULT NOW(),
  updated_at      TIMESTAMP      DEFAULT NOW()
);

-- ─── SITES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
  id                  VARCHAR(36)   PRIMARY KEY,
  trial_id            VARCHAR(36)   NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  site_name           VARCHAR(255)  NOT NULL,
  location            VARCHAR(255)  NOT NULL,
  country             VARCHAR(100)  NOT NULL,
  activation_date     DATE          NOT NULL,
  patient_capacity    INTEGER       NOT NULL,
  enrolled_patients   INTEGER       DEFAULT 0,
  samples_per_patient INTEGER       DEFAULT 1,
  coordinator_name    VARCHAR(255),
  coordinator_email   VARCHAR(255),
  status              site_status   DEFAULT 'pending',
  created_at          TIMESTAMP     DEFAULT NOW(),
  updated_at          TIMESTAMP     DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trial_idx ON sites(trial_id);

-- ─── KITS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kits (
  id                    VARCHAR(36)       PRIMARY KEY,
  kit_type              VARCHAR(100)      NOT NULL,
  lot_number            VARCHAR(100)      NOT NULL UNIQUE,
  manufacturing_date    DATE              NOT NULL,
  expiry_date           DATE              NOT NULL,
  quantity              INTEGER           NOT NULL DEFAULT 0,
  unit_cost             NUMERIC(10, 2),
  storage_requirements  VARCHAR(255),
  status                kit_status        DEFAULT 'available',
  created_at            TIMESTAMP         DEFAULT NOW(),
  updated_at            TIMESTAMP         DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS expiry_idx ON kits(expiry_date);
CREATE INDEX IF NOT EXISTS status_idx ON kits(status);

-- ─── SHIPMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments (
  id                      VARCHAR(36)       PRIMARY KEY,
  site_id                 VARCHAR(36)       NOT NULL REFERENCES sites(id),
  kit_id                  VARCHAR(36)       NOT NULL REFERENCES kits(id),
  quantity                INTEGER           NOT NULL,
  shipment_date           DATE              NOT NULL,
  expected_delivery_date  DATE,
  actual_delivery_date    DATE,
  tracking_number         VARCHAR(100),
  status                  shipment_status   DEFAULT 'preparing',
  notes                   TEXT,
  created_at              TIMESTAMP         DEFAULT NOW(),
  updated_at              TIMESTAMP         DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS shipment_site_idx ON shipments(site_id);
CREATE INDEX IF NOT EXISTS shipment_kit_idx  ON shipments(kit_id);
CREATE INDEX IF NOT EXISTS shipment_date_idx ON shipments(shipment_date);

-- ─── KIT USAGE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kit_usage (
  id             VARCHAR(36)   PRIMARY KEY,
  site_id        VARCHAR(36)   NOT NULL REFERENCES sites(id),
  kit_id         VARCHAR(36)   NOT NULL REFERENCES kits(id),
  kits_used      INTEGER       NOT NULL,
  kits_returned  INTEGER       DEFAULT 0,
  kits_wasted    INTEGER       DEFAULT 0,
  usage_date     DATE          NOT NULL,
  patient_count  INTEGER,
  notes          TEXT,
  reported_by    VARCHAR(255),
  created_at     TIMESTAMP     DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS usage_site_idx ON kit_usage(site_id);
CREATE INDEX IF NOT EXISTS usage_date_idx ON kit_usage(usage_date);

-- ─── DEMAND FORECASTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS demand_forecasts (
  id               VARCHAR(36)      PRIMARY KEY,
  site_id          VARCHAR(36)      NOT NULL REFERENCES sites(id),
  kit_type         VARCHAR(100)     NOT NULL,
  forecast_date    DATE             NOT NULL,
  predicted_demand INTEGER          NOT NULL,
  safety_stock     INTEGER          NOT NULL,
  recommended_qty  INTEGER          NOT NULL,
  confidence_score NUMERIC(5, 2),
  model_version    VARCHAR(50),
  months_ahead     INTEGER          DEFAULT 3,
  created_at       TIMESTAMP        DEFAULT NOW()
);

-- ─── ALERTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id           VARCHAR(36)   PRIMARY KEY,
  alert_type   alert_type    NOT NULL,
  severity     severity      NOT NULL,
  entity_type  VARCHAR(50),
  entity_id    VARCHAR(36),
  message      TEXT          NOT NULL,
  is_resolved  BOOLEAN       DEFAULT FALSE,
  resolved_at  TIMESTAMP,
  created_at   TIMESTAMP     DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS resolved_idx   ON alerts(is_resolved);
CREATE INDEX IF NOT EXISTS alert_type_idx ON alerts(alert_type);
