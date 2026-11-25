// Query engine for the mock API: filtering, ordering, pagination and analytics
// aggregation over the in-memory demo data (lib/dummy.js).
import { CURRENCIES, FX_RATES, PROPERTIES } from "@/lib/dummy";

const addressOf = (r: Row) => {
  const prop = typeof r.property === "object" && r.property?.address ? r.property : PROPERTIES.find((x: Row) => x.id === r.property);
  return prop?.address;
};
const idOf = (v: any) => (typeof v === "object" ? v?.id : v);

type Row = Record<string, any>;
type Params = URLSearchParams;

const DAY = 86400000;
// Expenses are stored in their own currency; analytics work in USD and convert from there.
const toUsd = (e: Row) => Number(e.amount) / ((FX_RATES as Record<string, number>)[e.currency?.code] ?? 1);
const toDate = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`);
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const today = () => toDate(new Date().toISOString());

const list = (p: Params, key: string): string[] =>
  (p.getAll(key).flatMap((v) => v.split(",")) as string[]).filter(Boolean);

// ---------- Lists ----------
export function applyOrdering(rows: Row[], ordering?: string | null) {
  if (!ordering) return rows;
  const field = ordering.split(",")[0];
  const desc = field.startsWith("-");
  const key = field.replace(/^-/, "");
  return [...rows].sort((a, b) => {
    const x = a[key] ?? "";
    const y = b[key] ?? "";
    const c = x < y ? -1 : x > y ? 1 : 0;
    return desc ? -c : c;
  });
}

export function paginate(rows: Row[], p: Params, url: string) {
  const size = Math.max(1, Number(p.get("page_size")) || 200);
  const page = Math.max(1, Number(p.get("page")) || 1);
  const start = (page - 1) * size;
  const link = (n: number) => {
    const u = new URL(url);
    u.searchParams.set("page", String(n));
    return u.toString();
  };
  return {
    count: rows.length,
    next: start + size < rows.length ? link(page + 1) : null,
    previous: page > 1 ? link(page - 1) : null,
    results: rows.slice(start, start + size),
  };
}

export function filterRows(collection: string, rows: Row[], p: Params): Row[] {
  let out = rows;
  const propertyIds = [...list(p, "property_id"), ...list(p, "property")].map(Number);
  const has = (k: string) => p.get(k) !== null && p.get(k) !== "";
  const propId = (r: Row) => (typeof r.property === "object" ? r.property?.id : r.property);

  // Zone filters (cleaning app): match the property's address.
  if (collection !== "properties" && (has("country_id") || has("state_id") || has("city_id"))) {
    out = out.filter((r) => {
      const a = addressOf(r);
      if (!a) return false;
      return (!has("country_id") || String(idOf(a.country)) === p.get("country_id")) &&
        (!has("state_id") || String(idOf(a.state)) === p.get("state_id")) &&
        (!has("city_id") || String(idOf(a.city)) === p.get("city_id"));
    });
  }
  if (collection === "users" && has("user_type")) out = out.filter((r) => r.user_type === p.get("user_type"));

  if (propertyIds.length && collection !== "properties") out = out.filter((r) => propertyIds.includes(propId(r)));

  if (collection === "reservations") {
    if (has("checkin_date_gte")) out = out.filter((r) => r.checkin_date >= p.get("checkin_date_gte")!);
    if (has("checkin_date_lte")) out = out.filter((r) => r.checkin_date <= p.get("checkin_date_lte")!);
    if (has("checkout_date_gte")) out = out.filter((r) => r.checkout_date >= p.get("checkout_date_gte")!);
    if (has("checkout_date_lte")) out = out.filter((r) => r.checkout_date <= p.get("checkout_date_lte")!);
    if (has("checkin_date")) out = out.filter((r) => r.checkin_date === p.get("checkin_date"));
    if (has("checkout_date")) out = out.filter((r) => r.checkout_date === p.get("checkout_date"));
    if (has("guest_name")) out = out.filter((r) => r.guest_name.toLowerCase().includes(p.get("guest_name")!.toLowerCase()));
    if (has("reservation_code")) out = out.filter((r) => r.reservation_code.toLowerCase().includes(p.get("reservation_code")!.toLowerCase()));
    if (has("country_name")) out = out.filter((r) => r.country_name === p.get("country_name"));
    if (has("reservation_status")) out = out.filter((r) => list(p, "reservation_status").includes(r.reservation_status));
  } else if (collection === "expenses") {
    if (has("created_at_gte")) out = out.filter((r) => r.expense_date >= p.get("created_at_gte")!.slice(0, 10));
    if (has("created_at_lte")) out = out.filter((r) => r.expense_date <= p.get("created_at_lte")!.slice(0, 10));
    if (has("amount_gte")) out = out.filter((r) => Number(r.amount) >= Number(p.get("amount_gte")));
    if (has("amount_lte")) out = out.filter((r) => Number(r.amount) <= Number(p.get("amount_lte")));
    const type = p.get("type") ?? p.get("expense_type");
    if (type) out = out.filter((r) => r.type === type);
    if (has("description")) out = out.filter((r) => r.description.toLowerCase().includes(p.get("description")!.toLowerCase()));
  } else if (collection === "tasks") {
    if (has("planned_start_time_gte")) out = out.filter((r) => r.planned_start_time >= p.get("planned_start_time_gte")!);
    if (has("planned_start_time_lte")) out = out.filter((r) => r.planned_start_time <= p.get("planned_start_time_lte")!);
    if (has("assignee_id")) out = out.filter((r) => String(r.assignee) === p.get("assignee_id"));
    if (has("type")) out = out.filter((r) => r.type === p.get("type"));
  } else if (collection === "properties") {
    if (has("name")) out = out.filter((r) => r.name.toLowerCase().includes(p.get("name")!.toLowerCase()));
    if (has("is_active")) out = out.filter((r) => String(r.is_active) === p.get("is_active"));
    if (has("owner_id")) out = out.filter((r) => String(r.owner?.id) === p.get("owner_id"));
    if (has("room_count_gte")) out = out.filter((r) => r.room_count >= Number(p.get("room_count_gte")));
    if (has("guest_count_gte")) out = out.filter((r) => r.guest_count >= Number(p.get("guest_count_gte")));
  } else {
    // Generic filters for the remaining collections (conversations, issues, risks, submissions, ...).
    if (has("is_resolved")) out = out.filter((r) => String(r.is_resolved) === p.get("is_resolved"));
    if (has("status")) out = out.filter((r) => r.status === p.get("status"));
    if (has("exposure_level")) out = out.filter((r) => r.exposure_level === p.get("exposure_level"));
    if (has("issue_category")) out = out.filter((r) => r.issue_category === p.get("issue_category"));
    if (has("risk_type")) out = out.filter((r) => r.risk_type === p.get("risk_type"));
    if (has("source")) out = out.filter((r) => r.source === p.get("source"));
    if (has("is_bot")) out = out.filter((r) => String(r.is_bot) === p.get("is_bot"));
    if (has("is_staff")) out = out.filter((r) => String(r.is_staff) === p.get("is_staff"));
    if (has("created_at_gte")) out = out.filter((r) => !r.created_at || r.created_at.slice(0, 10) >= p.get("created_at_gte")!.slice(0, 10));
    if (has("created_at_lte")) out = out.filter((r) => !r.created_at || r.created_at.slice(0, 10) <= p.get("created_at_lte")!.slice(0, 10));
    const q = p.get("search") ?? p.get("name");
    if (q) out = out.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  }
  return applyOrdering(out, p.get("ordering"));
}

// ---------- Analytics ----------
type Period = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

const bucketStart = (d: Date, period: Period) => {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  if (period === "daily") return fmt(d);
  if (period === "weekly") return fmt(addDays(d, -((d.getUTCDay() + 6) % 7)));
  if (period === "monthly") return fmt(new Date(Date.UTC(y, m, 1)));
  if (period === "quarterly") return fmt(new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1)));
  return fmt(new Date(Date.UTC(y, 0, 1)));
};

function range(p: Params) {
  const end = p.get("date_before") ? toDate(p.get("date_before")!) : today();
  const start = p.get("date_after") ? toDate(p.get("date_after")!) : addDays(end, -89);
  return { start, end };
}

function scope(p: Params, reservations: Row[]) {
  const ids = [...list(p, "properties"), ...list(p, "property")].map(Number);
  const active = reservations.filter((r) => r.reservation_status !== "cancelled" && r.reservation_status !== "blocked");
  return ids.length ? active.filter((r) => ids.includes(r.property.id)) : active;
}

// Deterministic per-currency/per-period factor so each currency's series has its own shape
// (own trend + volatility) instead of being a pure rescale of the USD series.
const jitter = (code: string, key: string) => {
  if (code === "USD") return 1;
  let h = 0;
  for (const ch of code + key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  // Avalanche-mix so neighbouring dates give uncorrelated noise.
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b); h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b); h ^= h >>> 16;
  const n = (((h >>> 0) % 2000) / 1000) - 1; // -1 .. 1
  const m = key.match(/^\d{4}-\d{2}-\d{2}/);
  const t = m ? (Date.parse(m[0]) - Date.now()) / 86400000 : 0; // days relative to today (past < 0)
  const phase = t + 90; // 0 at the start of the 3-month window
  switch (code) {
    case "TRY": return Math.max(0.2, (1 + 0.007 * phase) * (1 + 0.3 * n)); // inflation-like upward drift, volatile
    case "EUR": return Math.max(0.2, (1.25 - 0.004 * phase) * (1 + 0.2 * n)); // gently falling
    default: return 1 + 0.15 * n;
  }
};

export const allCurrencyIds = (p: Params) => {
  const ids = list(p, "currencies").map(Number).filter(Boolean);
  return ids.length ? ids : CURRENCIES.map((c: Row) => c.id);
};

function currencyOf(p: Params) {
  const id = Number(list(p, "currencies")[0]);
  const cur = CURRENCIES.find((c) => c.id === id) ?? CURRENCIES[0];
  return { code: cur.code, rate: (FX_RATES as Record<string, number>)[cur.code] ?? 1 };
}

const buckets = (p: Params, period: Period) => {
  const { start, end } = range(p);
  const keys: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const k = bucketStart(d, period);
    if (!keys.includes(k)) keys.push(k);
  }
  return { keys, start, end };
};

export function reservationsAnalytics(p: Params, reservations: Row[]) {
  const period = (p.get("period") as Period) || "monthly";
  const { keys, start, end } = buckets(p, period);
  const rows = scope(p, reservations);
  const propertyCount = (list(p, "properties").length || PROPERTIES.length) || 1;
  const { code, rate } = currencyOf(p);
  const map = new Map(keys.map((k) => [k, { count: 0, nights: 0, days: 0, amount: 0, blocked: 0 }]));
  const blockedIds = [...list(p, "properties"), ...list(p, "property")].map(Number);
  const blockedRows = reservations.filter((r) => r.reservation_status === "blocked" && (!blockedIds.length || blockedIds.includes(r.property.id)));

  rows.forEach((r) => {
    const ci = toDate(r.checkin_date);
    if (ci >= start && ci <= end) {
      const b = map.get(bucketStart(ci, period));
      if (b) { b.count += 1; b.amount += Number(r.payment.total_room_fee) * rate; }
    }
    for (let d = toDate(r.checkin_date); d < toDate(r.checkout_date); d = addDays(d, 1)) {
      if (d < start || d > end) continue;
      const b = map.get(bucketStart(d, period));
      if (b) b.nights += 1;
    }
  });
  blockedRows.forEach((r) => {
    for (let d = toDate(r.checkin_date); d < toDate(r.checkout_date); d = addDays(d, 1)) {
      if (d < start || d > end) continue;
      const b = map.get(bucketStart(d, period));
      if (b) b.blocked += 1;
    }
  });
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const b = map.get(bucketStart(d, period));
    if (b) b.days += 1;
  }
  const results = keys.map((k) => {
    const b = map.get(k)!;
    return {
      period: k,
      total_reservations: b.count,
      total_amount: Math.round(b.amount * jitter(code, k)),
      occupancy_rate: b.days ? Number(Math.min(1, b.nights / (b.days * propertyCount)).toFixed(3)) : 0,
      currency_code: code,
      // available property-days, booked property-days and blocked property-days in the period
      active_days: b.days * propertyCount,
      busy_days: b.nights,
      blocked_days: b.blocked,
      total_period_days: b.days * propertyCount,
    };
  });
  return {
    period,
    results,
    total_reservations: results.reduce((s, r) => s + r.total_reservations, 0),
    total_amount: results.reduce((s, r) => s + r.total_amount, 0),
    currency: code,
  };
}

export function earningsAnalytics(p: Params, reservations: Row[]) {
  const period = (p.get("period") as Period) || "monthly";
  const { keys, start, end } = buckets(p, period);
  const rows = scope(p, reservations);
  const { code, rate } = currencyOf(p);
  const map = new Map(keys.map((k) => [k, { host: 0, ws: 0, clean: 0, rateSum: 0, n: 0 }]));
  rows.forEach((r) => {
    const co = toDate(r.checkout_date);
    if (co < start || co > end) return;
    const b = map.get(bucketStart(co, period));
    if (!b) return;
    b.host += Number(r.payment.host_earning) * rate;
    b.ws += Number(r.payment.workspace_earning) * rate;
    b.clean += Number(r.payment.cleaning_fee) * rate;
    b.rateSum += Number(r.payment.nightly_fee) * rate;
    b.n += 1;
  });
  const results = keys.map((k) => {
    const b = map.get(k)!;
    return {
      period: k,
      total_host_earning: Math.round(b.host * jitter(code, k)),
      total_workspace_earning: Math.round(b.ws * jitter(code, k + "w")),
      total_cleaning_fee: Math.round(b.clean * jitter(code, k + "c")),
      avg_nightly_rate: b.n ? Math.round((b.rateSum / b.n) * jitter(code, k + "a")) : 0,
      currency_code: code,
    };
  });
  const n = results.filter((r) => r.avg_nightly_rate > 0);
  return {
    period,
    results,
    total_host_earning: results.reduce((s, r) => s + r.total_host_earning, 0),
    total_workspace_earning: results.reduce((s, r) => s + r.total_workspace_earning, 0),
    total_cleaning_fee: results.reduce((s, r) => s + r.total_cleaning_fee, 0),
    avg_nightly_rate: n.length ? Math.round(n.reduce((s, r) => s + r.avg_nightly_rate, 0) / n.length) : 0,
    currency: code,
  };
}

export function expensesAnalytics(p: Params, expenses: Row[]) {
  const period = (p.get("period") as Period) || "monthly";
  const { keys, start, end } = buckets(p, period);
  const { code, rate } = currencyOf(p);
  const ids = [...list(p, "properties"), ...list(p, "property")].map(Number);
  const rows = expenses.filter((e) => !ids.length || ids.includes(e.property.id));
  const types = Array.from(new Set(rows.map((e) => e.type)));
  const results: Record<string, any[]> = {};
  let total = 0;
  types.forEach((t) => {
    const map = new Map(keys.map((k) => [k, { total: 0, count: 0 }]));
    rows.filter((e) => e.type === t).forEach((e) => {
      const d = toDate(e.expense_date);
      if (d < start || d > end) return;
      const b = map.get(bucketStart(d, period))!;
      b.total += toUsd(e) * rate;
      b.count += 1;
      total += toUsd(e) * rate;
    });
    results[t] = keys.map((k) => ({ period: k, date: k, total: Math.round(map.get(k)!.total * jitter(code, k + t)), count: map.get(k)!.count, currency: code }));
  });
  return { period, results, total_amount: Math.round(total), total_expense: Math.round(total), currency: code, currency_code: code };
}

export function propertyOccupancy(p: Params, reservations: Row[]) {
  const { start, end } = range(p);
  const days = Math.round((end.getTime() - start.getTime()) / DAY) + 1;
  return PROPERTIES.map((prop: Row) => {
    const rs = reservations.filter((r) => r.property.id === prop.id && r.reservation_status !== "cancelled");
    let occupied = 0, blocked = 0, revenue = 0, count = 0, rateSum = 0;
    rs.forEach((r) => {
      for (let d = toDate(r.checkin_date); d < toDate(r.checkout_date); d = addDays(d, 1)) {
        if (d < start || d > end) continue;
        if (r.reservation_status === "blocked") blocked += 1; else occupied += 1;
      }
      const ci = toDate(r.checkin_date);
      if (r.reservation_status !== "blocked" && ci >= start && ci <= end) {
        count += 1; revenue += Number(r.payment.total_room_fee); rateSum += Number(r.payment.nightly_fee);
      }
    });
    return {
      property: {
        id: prop.id, name: prop.name, listing_id: prop.listing_id, airbnb_url: prop.airbnb_url, images: prop.images,
        address: prop.address, room_count: prop.room_count, bed_count: prop.bed_count, guest_count: prop.guest_count,
      },
      occupancy_rate: String(Number(Math.min(1, occupied / Math.max(1, days - blocked)).toFixed(3))),
      revenue: revenue.toFixed(2),
      avg_nightly_rate: count ? (rateSum / count).toFixed(2) : "0.00",
      occupied_nights: occupied,
      available_nights: Math.max(0, days - occupied - blocked),
      blocked_nights: blocked,
      total_reservations: count,
    };
  });
}

export function monthlySummary(reservations: Row[], expenses: Row[]) {
  const e = today();
  const mk = (from: Date, to: Date) => {
    const p = new URLSearchParams({ period: "yearly", date_after: fmt(from), date_before: fmt(to) });
    const earn = earningsAnalytics(p, reservations);
    const res = reservationsAnalytics(p, reservations);
    const exp = expenses.filter((x) => x.expense_date >= fmt(from) && x.expense_date <= fmt(to)).reduce((s, x) => s + toUsd(x), 0);
    const occ = res.results.length ? res.results.reduce((s, r) => s + r.occupancy_rate, 0) / res.results.length : 0;
    const revenue = earn.total_host_earning + earn.total_workspace_earning;
    return { host: earn.total_host_earning, ws: earn.total_workspace_earning, revenue, exp, occ, adr: earn.avg_nightly_rate };
  };
  const cur = mk(addDays(e, -29), e);
  const prev = mk(addDays(e, -59), addDays(e, -30));
  const diff = (a: number, b: number) => String(Math.round(a - b)); // absolute change (money)
  const occChange = (a: number, b: number) => String(Number(Math.max(-0.56, Math.min(0.56, b ? (a - b) / b : 0)).toFixed(3))); // relative, capped at 56%
  const usdEntry = {
    currency_code: "USD",
    workspace_earning: String(cur.ws), workspace_earning_change: diff(cur.ws, prev.ws),
    total_expenses: cur.exp.toFixed(0), total_expenses_change: diff(cur.exp, prev.exp),
    total_revenue: String(cur.revenue), total_revenue_change: diff(cur.revenue, prev.revenue),
    avg_nightly_rate: String(cur.adr), avg_nightly_rate_change: diff(cur.adr, prev.adr),
    occupancy_rate: String(Number(Math.min(1, cur.occ).toFixed(3))), occupancy_rate_change: occChange(cur.occ, prev.occ),
    gross_revenue: String(cur.revenue), gross_revenue_change: diff(cur.revenue, prev.revenue),
    owner_revenue: String(cur.host), owner_revenue_change: diff(cur.host, prev.host),
    workspace_revenue: String(cur.ws), workspace_revenue_change: diff(cur.ws, prev.ws),
    noi: String(Math.round(cur.host - cur.exp)), noi_change: diff(cur.host - cur.exp, prev.host - prev.exp),
  };
  const money = ["workspace_earning", "total_expenses", "total_revenue", "avg_nightly_rate", "gross_revenue", "owner_revenue", "workspace_revenue", "noi"];
  return CURRENCIES.map((c: Row) => {
    if (c.code === "USD") return usdEntry;
    const rate = (FX_RATES as Record<string, number>)[c.code] ?? 1;
    const out: Row = { ...usdEntry, currency_code: c.code };
    money.forEach((k) => {
      const f = jitter(c.code, k);
      out[k] = String(Math.round(Number((usdEntry as Row)[k]) * rate * f));
      const chg = Number((usdEntry as Row)[`${k}_change`]);
      out[`${k}_change`] = String(Math.round(chg * rate * f));
    });
    return out;
  });
}

export function propertyPerformance(p: Params, reservations: Row[]) {
  const id = Number(p.get("property") ?? 1);
  const { start, end } = range(p);
  const occ = propertyOccupancy(p, reservations).find((o) => o.property.id === id);
  const days = Math.round((end.getTime() - start.getTime()) / DAY) + 1;
  const rev = Number(occ?.revenue ?? 0);
  const prevLen = days;
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(prevLen - 1));
  const pp = new URLSearchParams({ date_after: fmt(prevStart), date_before: fmt(prevEnd) });
  const prevRev = Number(propertyOccupancy(pp, reservations).find((o) => o.property.id === id)?.revenue ?? 0);
  return {
    property_id: id, currency_code: "USD",
    date_after: fmt(start), date_before: fmt(end),
    occupancy_rate: occ?.occupancy_rate ?? "0",
    avg_nightly_rate: occ?.avg_nightly_rate ?? "0.00",
    revpar: (rev / days).toFixed(2),
    total_revenue: rev.toFixed(2),
    total_bookings: occ?.total_reservations ?? 0,
    growth_rate_percent: prevRev ? (((rev - prevRev) / prevRev) * 100).toFixed(1) : null,
    average_rating: (4.6 + (id % 4) * 0.1).toFixed(1),
    compare_window: p.get("compare_period") === "none" ? null : { date_after: fmt(prevStart), date_before: fmt(prevEnd), total_revenue: prevRev.toFixed(2) },
  };
}

// ---------- Workspace-only analytics ----------
export function guestDemographics(p: Params, reservations: Row[]) {
  const from = p.get("start_date") ?? "0000-01-01";
  const to = p.get("end_date") ?? "9999-12-31";
  const rows = reservations.filter((r) => r.reservation_status !== "cancelled" && r.reservation_status !== "blocked" && r.checkin_date >= from && r.checkin_date <= to);
  const counts = new Map<string, number>();
  let total = 0;
  rows.forEach((r) => {
    const g = r.adult_guest_count + r.child_guest_count;
    counts.set(r.country_name, (counts.get(r.country_name) ?? 0) + g);
    total += g;
  });
  const codes: Record<string, string> = { Exampleland: "EX", Sampleland: "SL", Demoland: "DL", Testonia: "TS", Mockovia: "MK" };
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 4).map(([name, n]) => ({ country_code: codes[name] ?? "XX", country_name: name, percentage: Number(((n / Math.max(1, total)) * 100).toFixed(1)) }));
  const topPct = top.reduce((s, c) => s + c.percentage, 0);
  const home = counts.get("Exampleland") ?? 0;
  return { total_guests: total, international_pct: Number((((total - home) / Math.max(1, total)) * 100).toFixed(1)), countries: top, others: { percentage: Number(Math.max(0, 100 - topPct).toFixed(1)) } };
}

export function revenuePacing(p: Params, reservations: Row[]) {
  const ahead = Number(p.get("months_ahead") ?? 6);
  const base = today();
  const out: Row[] = [];
  for (let i = -2; i <= ahead; i++) {
    const m = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + i, 1));
    const end = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0));
    const q = new URLSearchParams({ period: "monthly", date_after: fmt(m), date_before: fmt(end) });
    const earn = earningsAnalytics(q, reservations);
    const res = reservationsAnalytics(q, reservations);
    const revenue = earn.total_host_earning + earn.total_workspace_earning;
    // Future months only contain bookings made so far, so pacing naturally tapers off.
    const ly = 0.82 + ((m.getUTCMonth() * 7) % 10) / 50;
    out.push({
      period: fmt(m),
      current_year_revenue: String(revenue),
      current_year_reservations: res.total_reservations,
      current_year_occupancy_rate: res.results[0]?.occupancy_rate ?? 0,
      current_year_avg_nightly_rate: String(earn.avg_nightly_rate),
      last_year_revenue: String(Math.round(Math.max(revenue, 9000) * ly)),
      last_year_reservations: Math.round(Math.max(res.total_reservations, 18) * ly),
      last_year_occupancy_rate: Number(Math.min(1, (res.results[0]?.occupancy_rate || 0.6) * ly).toFixed(3)),
      last_year_avg_nightly_rate: String(Math.round((earn.avg_nightly_rate || 120) * ly)),
      currency_code: "USD",
    });
  }
  return out;
}
