// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface DemandInput {
  site_id: string;
  enrolled_patients: number;
  patient_capacity: number;
  samples_per_patient: number;
  historical_usage: number[];
  trial_phase: string;
  months_ahead: number;
}

export interface ForecastResult {
  predicted_demand: number;
  safety_stock: number;
  recommended_qty: number;
  confidence_score: number;
  method: string;
}

export interface TrainingSample {
  base_demand: number;
  avg_usage: number;
  trend: number;
  enrollment_rate: number;
  phase: number; // 0=Phase I, 1=Phase II, 2=Phase III, 3=Phase IV
  months_ahead: number;
  actual_usage: number;
}

export interface ModelWeights {
  coefficients: number[];
  intercept: number;
  featureMeans: number[];
  featureStds: number[];
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PHASE_MULTIPLIERS: Record<string, number> = {
  "Phase I": 0.6,
  "Phase II": 0.8,
  "Phase III": 1.0,
  "Phase IV": 0.9,
};

const PHASE_MAP: Record<string, number> = {
  "Phase I": 0,
  "Phase II": 1,
  "Phase III": 2,
  "Phase IV": 3,
};

const SAFETY_STOCK_FACTOR = 0.2;

// ─── MATRIX MATH (pure JS, no dependencies) ──────────────────────────────────

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, k = B.length;
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      Array.from({ length: k }, (_, l) => A[i][l] * B[l][j]).reduce((a, b) => a + b, 0)
    )
  );
}

function transpose(A: number[][]): number[][] {
  return A[0].map((_, j) => A.map((row) => row[j]));
}

function matInverse(A: number[][]): number[][] | null {
  const n = A.length;
  const aug = A.map((row, i) =>
    [...row, ...Array.from({ length: n }, (_, j) => (j === i ? 1 : 0))]
  );
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-12) return null;
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }
  }
  return aug.map((row) => row.slice(n));
}

function standardize(X: number[][]): { scaled: number[][]; means: number[]; stds: number[] } {
  const nFeatures = X[0].length;
  const means = Array.from({ length: nFeatures }, (_, j) => {
    const col = X.map((row) => row[j]);
    return col.reduce((a, b) => a + b, 0) / col.length;
  });
  const stds = Array.from({ length: nFeatures }, (_, j) => {
    const col = X.map((row) => row[j]);
    const mean = means[j];
    const variance = col.reduce((a, b) => a + (b - mean) ** 2, 0) / col.length;
    return Math.sqrt(variance) || 1;
  });
  const scaled = X.map((row) => row.map((val, j) => (val - means[j]) / stds[j]));
  return { scaled, means, stds };
}

// ─── FEATURE EXTRACTION ───────────────────────────────────────────────────────

function buildFeatures(input: DemandInput): number[] {
  const history = input.historical_usage.slice(-6);
  const avg_usage = history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : 0;
  const trend = history.length > 1 ? (history[history.length - 1] - history[0]) / history.length : 0;
  const base_demand = input.enrolled_patients * input.samples_per_patient;
  const enrollment_rate = input.enrolled_patients / Math.max(input.patient_capacity, 1);
  const phase_encoded = PHASE_MAP[input.trial_phase] ?? 2;
  return [base_demand, avg_usage, trend, enrollment_rate, phase_encoded, input.months_ahead];
}

// ─── RIDGE REGRESSION ────────────────────────────────────────────────────────

export function trainRidge(samples: TrainingSample[], alpha = 1.0): ModelWeights | null {
  if (samples.length < 5) return null;

  const X = samples.map((s) => [
    s.base_demand,
    s.avg_usage,
    s.trend,
    s.enrollment_rate,
    s.phase,
    s.months_ahead,
  ]);
  const y = samples.map((s) => s.actual_usage);

  const { scaled, means, stds } = standardize(X);

  // Add intercept column (bias)
  const Xb = scaled.map((row) => [1, ...row]);
  const Xt = transpose(Xb);
  const XtX = matMul(Xt, Xb);

  // Ridge regularization (skip intercept term at index 0)
  for (let i = 1; i < XtX.length; i++) XtX[i][i] += alpha;

  const XtXinv = matInverse(XtX);
  if (!XtXinv) return null;

  const Xty = Xt.map((row) => row.reduce((sum, val, i) => sum + val * y[i], 0));
  const w = XtXinv.map((row) => row.reduce((sum, val, i) => sum + val * Xty[i], 0));

  return {
    intercept: w[0],
    coefficients: w.slice(1),
    featureMeans: means,
    featureStds: stds,
  };
}

export function predictWithRidge(input: DemandInput, weights: ModelWeights): number {
  const features = buildFeatures(input);
  const scaled = features.map((f, i) =>
    weights.featureStds[i] > 0 ? (f - weights.featureMeans[i]) / weights.featureStds[i] : 0
  );
  const predicted = weights.intercept + scaled.reduce((sum, f, i) => sum + f * weights.coefficients[i], 0);
  return Math.max(0, Math.round(predicted));
}

// ─── FORMULA-BASED PREDICTION (fallback) ─────────────────────────────────────

export function predictDemand(input: DemandInput): ForecastResult {
  const { enrolled_patients, samples_per_patient, historical_usage, trial_phase, months_ahead } = input;

  const phaseMultiplier = PHASE_MULTIPLIERS[trial_phase] ?? 1.0;
  const formulaDemand = enrolled_patients * samples_per_patient * phaseMultiplier * months_ahead;

  let predictedBase = formulaDemand;
  let confidence = 0.6;
  let method = "formula_based";

  if (historical_usage.length >= 3) {
    const recent = historical_usage.slice(-6);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    predictedBase = avg * 0.6 + formulaDemand * 0.4;
    confidence = Math.min(0.85, 0.6 + (recent.length / 6) * 0.35);
    method = "weighted_hybrid";
  }

  if (historical_usage.length >= 2) {
    const last = historical_usage[historical_usage.length - 1];
    const prev = historical_usage[historical_usage.length - 2];
    const trend = prev > 0 ? (last - prev) / prev : 0;
    predictedBase *= 1 + Math.max(-0.3, Math.min(0.3, trend));
  }

  const predicted_demand = Math.max(0, Math.round(predictedBase));
  const safety_stock = Math.round(predicted_demand * SAFETY_STOCK_FACTOR);

  return {
    predicted_demand,
    safety_stock,
    recommended_qty: predicted_demand + safety_stock,
    confidence_score: Math.round(confidence * 100) / 100,
    method,
  };
}

// ─── MAIN PREDICT (formula + optional Ridge) ─────────────────────────────────

export async function predictDemandWithML(
  input: DemandInput,
  weights?: ModelWeights | null
): Promise<ForecastResult> {
  if (weights) {
    const predicted_demand = predictWithRidge(input, weights);
    const safety_stock = Math.round(predicted_demand * SAFETY_STOCK_FACTOR);
    return {
      predicted_demand,
      safety_stock,
      recommended_qty: predicted_demand + safety_stock,
      confidence_score: 0.87,
      method: "ridge_regression",
    };
  }
  return predictDemand(input);
}
