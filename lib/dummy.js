// All placeholder data for the demo. Everything here is fictional.
// This file feeds the mock API in app/api/proxy/[...path]/route.ts and the stub auth context.

export const BRAND = {
  name: "Acme",
  panelTitle: "Acme Workspace",
  supportEmail: "support@example.com",
  websiteUrl: "https://www.example.com",
};

const iso = (offsetDays = 0, hour = 12) => {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString();
};
const day = (offsetDays = 0) => iso(offsetDays).slice(0, 10);
const NOW = iso(0);

// ---------- Reference data ----------
export const CURRENCIES = [
  { id: 1, name: "US Dollar", code: "USD", symbol: "$" },
  { id: 2, name: "Euro", code: "EUR", symbol: "€" },
  { id: 3, name: "Turkish Lira", code: "TRY", symbol: "₺" },
];
export const COUNTRIES = [
  { id: 1, name: "Exampleland", code: "EX", iso2: "EX", iso3: "EXL" },
  { id: 2, name: "Sampleland", code: "SL", iso2: "SL", iso3: "SAL" },
  { id: 3, name: "Demoland", code: "DL", iso2: "DL", iso3: "DEL" },
  { id: 4, name: "Testonia", code: "TS", iso2: "TS", iso3: "TST" },
  { id: 5, name: "Mockovia", code: "MK", iso2: "MK", iso3: "MCK" },
];
export const STATES = [
  { id: 1, name: "North Region", country: 1 },
  { id: 2, name: "South Region", country: 1 },
  { id: 3, name: "Central Region", country: 2 },
];
export const CITIES = [
  { id: 1, name: "Springfield", country: 1, state: 1 },
  { id: 2, name: "Rivertown", country: 1, state: 2 },
  { id: 3, name: "Lakeside", country: 2, state: 3 },
];

const permission = (id, codename) => ({ id, name: `Can ${codename.replace("_", " ")}`, codename });
export const PERMISSIONS = [
  "view_workspaceuser", "view_expense", "view_form", "view_reservation", "view_reportdata",
  "view_task", "assign_others_task", "view_property", "add_property", "change_property",
].map((c, i) => permission(i + 1, c));

export const GROUP_ICONS = [{ id: 1, icon: "star" }, { id: 2, icon: "home" }];

export const GROUPS = [
  { id: 1, workspace: 1, name: "Administrators", permissions: PERMISSIONS, created_at: NOW, updated_at: NOW, icon: { icon: "star" } },
  { id: 2, workspace: 1, name: "Cleaning Staff", permissions: PERMISSIONS.slice(5, 7), created_at: NOW, updated_at: NOW, icon: { icon: "home" } },
];

// ---------- Users ----------
const user = (id, first, last, extra = {}) => ({
  id,
  username: `${first}.${last}`.toLowerCase(),
  first_name: first,
  last_name: last,
  email: `${first}.${last}@example.com`.toLowerCase(),
  phone: "+1 555 0100",
  phone_number: "+1 555 0100",
  date_joined: iso(-200),
  last_login: iso(-1),
  profile_picture: "/images/avatar.png",
  country: "Exampleland",
  ...extra,
});

export const CURRENT_USER = user(1, "Demo", "Admin");

const ADDRESS = (n) => {
  const abroad = n % 4 === 0; // every 4th property sits in the second country
  return {
    id: n,
    address_line_1: `${100 + n} Example Street`,
    address_line_2: "",
    postal_code: `0000${n}`,
    city: CITIES[abroad ? 2 : n % 2],
    state: STATES[abroad ? 2 : n % 2],
    country: COUNTRIES[abroad ? 1 : 0],
  };
};

const workspaceUser = (id, u, user_type, groups = []) => ({
  id,
  user_type,
  user: u,
  is_active: true,
  permissions: PERMISSIONS,
  groups,
  address: ADDRESS(id),
  created_at: NOW,
  updated_at: NOW,
});

export const USERS = [
  workspaceUser(1, CURRENT_USER, "workspace_admin", [GROUPS[0]]),
  workspaceUser(2, user(2, "Olivia", "Owner", { extra_data: { listing_amount: 3, average_nightly_rate: 140 } }), "property_owner"),
  workspaceUser(3, user(3, "Omar", "Owner", { extra_data: { listing_amount: 2, average_nightly_rate: 95 } }), "property_owner"),
  workspaceUser(4, user(4, "Stella", "Staff"), "staff", [GROUPS[1]]),
  workspaceUser(5, user(5, "Sam", "Staff"), "staff", [GROUPS[1]]),
  // Cleaning / maintenance crew (mobile-app users)
  ...[["Clara", "Cleaner"], ["Chris", "Cleaner"], ["Cora", "Cleaner"], ["Carlos", "Cleaner"], ["Mia", "Maintenance"], ["Max", "Maintenance"]].map(
    ([first, last], i) => workspaceUser(6 + i, user(6 + i, first, last), "app_user", [GROUPS[1]])
  ),
];

// ---------- Workspace ----------
export const WORKSPACE = {
  id: 1,
  name: "Acme Demo Workspace",
  description: "Demo workspace with placeholder data",
  slug: "demo",
  tax_number: "0000000000",
  is_active: true,
  logo: "/images/logo.png",
  panel_title: BRAND.panelTitle,
  theme: "light",
  preferred_currency: "USD",
  created_at: iso(-365),
  updated_at: NOW,
  owner: CURRENT_USER,
  owner_hidden_fields: { property: [], payment: [] },
};

// ---------- Properties ----------
// Single source of truth for the demo listings. The same table is used by every project
// (owners panel, workspace, marketing website) so names, sizes, ADR and occupancy always match.
// `occupancy` is the planned share of nights booked over the last 3 months (0..1);
// `adr` is the average nightly rate in USD. Photo n (public/images/properties/property-n.jpg) belongs to listing n.
export const PROPERTY_PROFILES = [
  { name: "Skyline Penthouse",        rooms: 3, baths: 2, guests: 6, beds: 4, cleaningFee: 75, adr: 230, occupancy: 0.52 },
  { name: "Sunny Loft Downtown",      rooms: 2, baths: 1, guests: 4, beds: 2, cleaningFee: 40, adr: 135, occupancy: 0.78 },
  { name: "Cozy Garden Studio",       rooms: 1, baths: 1, guests: 2, beds: 1, cleaningFee: 30, adr: 85,  occupancy: 0.82 },
  { name: "Modern Garden House",      rooms: 3, baths: 2, guests: 6, beds: 4, cleaningFee: 65, adr: 190, occupancy: 0.6 },
  { name: "Panorama Residence",       rooms: 3, baths: 2, guests: 6, beds: 3, cleaningFee: 60, adr: 175, occupancy: 0.64 },
  { name: "Marina Open-Plan Flat",    rooms: 2, baths: 1, guests: 4, beds: 2, cleaningFee: 45, adr: 125, occupancy: 0.72 },
  { name: "Old Town View Suite",      rooms: 1, baths: 1, guests: 2, beds: 1, cleaningFee: 35, adr: 110, occupancy: 0.85 },
  { name: "Terrace Townhouse",        rooms: 3, baths: 3, guests: 7, beds: 4, cleaningFee: 70, adr: 180, occupancy: 0.62 },
  { name: "Stone Courtyard Villa",    rooms: 4, baths: 3, guests: 8, beds: 5, cleaningFee: 90, adr: 260, occupancy: 0.48 },
  { name: "Seaside Pool Villa",       rooms: 4, baths: 3, guests: 8, beds: 6, cleaningFee: 100, adr: 320, occupancy: 0.45 },
  { name: "Bright City Flat",         rooms: 1, baths: 1, guests: 3, beds: 2, cleaningFee: 35, adr: 95,  occupancy: 0.76 },
  { name: "Galata Balcony Apartment", rooms: 2, baths: 1, guests: 4, beds: 3, cleaningFee: 50, adr: 150, occupancy: 0.8 },
];

// Listing geography shared by all projects (same fictional cities as the address data).
export const PROPERTY_CITIES = PROPERTY_PROFILES.map((_, i) => {
  const n = i + 1;
  return n % 4 === 0 ? "Lakeside" : n % 2 ? "Rivertown" : "Springfield";
});

export const PROPERTIES = PROPERTY_PROFILES.map((profile, i) => ({
  id: i + 1,
  name: profile.name,
  form: null,
  address: ADDRESS(i + 1),
  ical_link: "https://example.com/calendar.ics",
  owner: USERS[1 + (i % 2)],
  cleaning_payment_fee: { amount: String(profile.cleaningFee), currency: CURRENCIES[0] },
  payment_split_rule: null,
  commission_rate: "20.00",
  room_count: profile.rooms,
  bathroom_count: profile.baths,
  guest_count: profile.guests,
  bed_count: profile.beds,
  listing_id: `LISTING-${1000 + i}`,
  airbnb_url: `https://www.example.com/rooms/${1000 + i}`,
  cleaning_complete_duration: "02:00:00",
  check_in_time: "15:00",
  check_out_time: "11:00",
  latitude: (41.0 + (i % 4) * 0.02 + i * 0.003).toFixed(6),
  longitude: (28.9 + Math.floor(i / 4) * 0.05 + (i % 4) * 0.01).toFixed(6),
  is_active: true,
  created_at: iso(-120),
  updated_at: NOW,
  images: [0, 1, 2].map((n) => ({ id: i * 10 + n + 1, image: `/images/properties/property-${((i + n) % 12) + 1}.jpg`, order: n })),
  pause_bot_until: null,
}));

// ---------- Deterministic random + date helpers ----------
const mulberry32 = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rand = mulberry32(20250101);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (a, b) => a + Math.floor(rand() * (b - a + 1));

// ---------- Reservations (about 3 months back, 1 month ahead) ----------
const GUEST_NAMES = [
  "Alice Guest", "Bob Visitor", "Carol Traveler", "Dave Tourist", "Eve Explorer", "Frank Nomad",
  "Grace Wanderer", "Heidi Roamer", "Ivan Backpacker", "Judy Voyager", "Karl Sojourner", "Lena Jetsetter",
  "Mona Tripper", "Nils Pathfinder", "Olga Rover", "Pete Wayfarer", "Quinn Drifter", "Rosa Globetrotter",
];
const COUNTRY_NAMES = ["Exampleland", "Sampleland", "Demoland", "Testonia", "Mockovia"];

export const RESERVATIONS = (() => {
  const out = [];
  let id = 1;
  const START = -92;
  const END = 32;
  PROPERTIES.forEach((property, pi) => {
    const profile = PROPERTY_PROFILES[pi];
    const cleaning = Number(property.cleaning_payment_fee.amount);
    const first = START + between(0, 2);
    let cursor = first;
    let booked = 0; // nights actually occupied so far (cancelled / blocked nights do not count)
    while (cursor < END) {
      const nights = between(2, 6);
      const checkin = cursor;
      const checkout = Math.min(cursor + nights, END + 1);
      const stayNights = checkout - checkin;
      const blocked = rand() < 0.03;
      const rate = Math.round(profile.adr * (0.94 + rand() * 0.12));
      const room = rate * stayNights;
      const past = checkout <= 0;
      const status = blocked ? "blocked" : rand() < 0.04 ? "cancelled" : past ? "completed" : rand() < 0.25 ? "inquiry" : "completed";
      out.push({
        id: id++,
        property,
        reservation_code: `RES${String(20000 + id)}`,
        guest_name: blocked ? "Owner Block" : pick(GUEST_NAMES),
        country_name: pick(COUNTRY_NAMES),
        checkin_date: day(checkin),
        checkout_date: day(checkout),
        adult_guest_count: between(1, Math.min(3, profile.guests)),
        child_guest_count: rand() < 0.3 ? 1 : 0,
        baby_guest_count: 0,
        pet_count: rand() < 0.1 ? 1 : 0,
        night_count: stayNights,
        payment: {
          nightly_fee: String(rate),
          created_at: iso(checkin - between(5, 40)),
          currency: CURRENCIES[0],
          payout_currency: CURRENCIES[0],
          cleaning_fee: cleaning,
          guest_service_fee: Math.round(room * 0.03),
          total_room_fee: room,
          night_rate_adjustment: 0,
          host_service_fee: Math.round(room * 0.03),
          co_host_payout: Math.round(room * 0.2),
          net_payout: Math.round(room * 0.97),
          host_earning: String(Math.round(room * 0.77)),
          workspace_earning: String(Math.round(room * 0.2)),
        },
        profile_pic: "/images/avatar.png",
        reservation_status: status,
      });
      if (!blocked && status !== "cancelled") booked += stayNights;
      // Plan the gap so booked / elapsed tracks this property's target occupancy.
      // Future weeks are only partially booked, so the target tapers off after today.
      const target = profile.occupancy * (checkout > 0 ? Math.max(0.2, 1 - checkout / 50) : 1);
      const wantedElapsed = booked / target;
      const gap = Math.max(0, Math.round(wantedElapsed - (checkout - first)));
      cursor = checkout + gap;
    }
  });
  return out.sort((a, b) => a.checkin_date.localeCompare(b.checkin_date)).map((r, i) => ({ ...r, id: i + 1 }));
})();

// ---------- Tasks: one cleaning per checkout + some maintenance ----------
export const TASKS = (() => {
  const tasks = [];
  RESERVATIONS.filter((r) => r.reservation_status === "completed").forEach((r) => {
    const outDay = Math.round((new Date(r.checkout_date) - new Date(day(0))) / 86400000);
    const past = outDay < 0 || (outDay === 0 && new Date().getUTCHours() >= 14);
    tasks.push({
      property: r.property.id,
      reservation: r.id,
      planned_start_time: iso(outDay, 11),
      planned_end_time: iso(outDay, 13),
      start_time: past ? iso(outDay, 11) : null,
      end_time: past ? iso(outDay, 13) : null,
      assignee: r.property.id % 4 + 6,
      type: "cleaning",
      result: past ? (rand() < 0.92 ? "successful" : "faulty") : null,
      description: "Turnover cleaning",
    });
  });
  const issues = ["Fix leaking tap", "Replace light bulbs", "Service heating", "Repair door lock", "Deep clean oven", "Paint touch-up"];
  for (let i = 0; i < 12; i++) {
    const off = between(-85, 20);
    const past = off < 0;
    tasks.push({
      property: PROPERTIES[i % PROPERTIES.length].id,
      reservation: "",
      planned_start_time: iso(off, 9),
      planned_end_time: iso(off, 11),
      start_time: past ? iso(off, 9) : null,
      end_time: past ? iso(off, 11) : null,
      assignee: 10 + (i % 2),
      type: "maintenance",
      result: past ? "successful" : null,
      description: issues[i % issues.length],
    });
  }
  // Busy days around "today": yesterday, today and tomorrow get a full schedule for every property.
  const nowH = new Date().getUTCHours();
  const labels = ["Pre-arrival inspection", "Deep clean", "Linen & towel change", "Restock supplies", "Window cleaning", "Post-stay check"];
  [-1, 0, 1].forEach((off) => {
    PROPERTIES.forEach((prop, pi) => {
      const startH = 8 + ((pi * 2) % 8);
      const past = off < 0 || (off === 0 && startH + 2 <= nowH);
      const running = off === 0 && !past && startH <= nowH;
      tasks.push({
        property: prop.id,
        reservation: "",
        planned_start_time: iso(off, startH),
        planned_end_time: iso(off, startH + 2),
        start_time: past || running ? iso(off, startH) : null,
        end_time: past ? iso(off, startH + 2) : null,
        assignee: 6 + ((pi + off + 4) % 4),
        type: pi === 4 ? "maintenance" : "cleaning",
        result: past ? (pi % 5 === 3 ? "faulty" : "successful") : null,
        description: pi === 4 ? "Routine maintenance round" : labels[(pi + off + 3) % labels.length],
      });
    });
  });
  return tasks
    .sort((a, b) => a.planned_start_time.localeCompare(b.planned_start_time))
    .map((t, i) => ({ ...t, id: i + 1, created_at: t.planned_start_time, updated_at: t.planned_start_time }));
})();

// ---------- Expenses ----------
const EXPENSE_KINDS = [
  ["cleaning", "Cleaning supplies", 25, 90], ["maintenance", "Repair work", 60, 320], ["fixture", "New furniture", 80, 450],
  ["market", "Groceries & restock", 20, 110], ["dues", "Building dues", 90, 180], ["invoice", "Utility invoice", 40, 160], ["tax", "Local tax", 50, 200],
];
export const EXPENSES = Array.from({ length: 42 }, (_, i) => {
  const [type, label, lo, hi] = EXPENSE_KINDS[i % EXPENSE_KINDS.length];
  const off = -between(0, 89);
  return {
    id: i + 1,
    property: PROPERTIES[i % PROPERTIES.length],
    // Spread the expenses over the three currencies (TRY most, as it is the default view).
    ...(() => {
      const currency = CURRENCIES[[0, 2, 1, 2, 0, 2][i % 6]];
      const rate = { USD: 1, EUR: 0.92, TRY: 35.4 }[currency.code];
      return { currency, amount: ((between(lo * 100, hi * 100) / 100) * rate).toFixed(2) };
    })(),
    type,
    created_by: USERS[0],
    description: `${label} (demo)`,
    attachment: null,
    expense_date: day(off),
    payment_status: rand() < 0.75 ? "paid" : rand() < 0.5 ? "unpaid" : "scheduled",
    reservation: null,
    created_at: iso(off),
    updated_at: iso(off),
  };
}).sort((a, b) => a.expense_date.localeCompare(b.expense_date)).map((e, i) => ({ ...e, id: i + 1 }));

export const FX_RATES = { USD: 1, EUR: 0.92, TRY: 35.4 };

// =====================================================================
// Workspace-only demo data: conversations, AI issues, forms, HR, finance rules
// =====================================================================
const supervisorProperty = (p) => ({
  id: p.id,
  name: p.name,
  address: {
    id: p.address.id, address_line_1: p.address.address_line_1, address_line_2: "", postal_code: p.address.postal_code,
    city: { id: p.address.city.id, name: p.address.city.name },
    state: { id: p.address.state.id, name: p.address.state.name },
    country: { id: 1, name: "Exampleland", iso2: "EX", iso3: "EXL", currency: CURRENCIES[0] },
  },
  cleaning_payment_fee: p.cleaning_payment_fee,
  first_image: p.images[0]?.image ?? null,
  latitude: p.latitude,
  longitude: p.longitude,
  form: 1,
});
export const SUPERVISOR_PROPERTIES = PROPERTIES.map(supervisorProperty);
const staffName = (id) => (USERS.find((u) => u.id === id)?.user.first_name ?? "Staff") + " " + (USERS.find((u) => u.id === id)?.user.last_name ?? "");

// ---------- Conversations & messages ----------
const GUEST_LINES = [
  "Hi! What time is check-in tomorrow?", "Is there parking nearby?", "The Wi-Fi password doesn't seem to work, could you check?",
  "Can we get a late check-out at 1pm?", "Thanks, everything was perfect!", "The heating is not working in the bedroom.",
  "Could you recommend a good restaurant close by?", "Is early check-in possible? Our flight lands at 8am.",
];
const BOT_LINES = [
  "Hello! Check-in starts at 3:00 pm. I'll send the door code on the day of arrival.", "There is free street parking on the same block and a paid garage 2 minutes away.",
  "Sorry about that! I've alerted our team and someone will get back to you shortly.", "Late check-out is subject to availability, I'll confirm with the team.",
  "Glad you enjoyed your stay! We'd love a review.", "Thank you for letting us know, a technician is on the way.",
];
export const CONVERSATIONS = RESERVATIONS.filter((r) => r.reservation_status !== "blocked" && r.reservation_status !== "cancelled")
  .filter((_, i) => i % 6 === 0)
  .slice(0, 16)
  .map((r, i) => ({
    id: i + 1,
    name: r.guest_name,
    airbnb_conversation_id: `CONV-${5000 + i}`,
    property: r.property,
    reservation: r.id,
    created_at: iso(Math.round((new Date(r.checkin_date) - new Date(day(0))) / 86400000) - 5),
    updated_at: iso(Math.round((new Date(r.checkin_date) - new Date(day(0))) / 86400000) - 1),
    pause_bot_until: i % 7 === 3 ? iso(1) : null,
    is_bot_stopped: i % 7 === 3,
    unreadCount: i % 4 === 0 ? 2 : 0,
  }));
export const MESSAGES = CONVERSATIONS.flatMap((c) => {
  const n = 4 + (c.id % 5);
  return Array.from({ length: n }, (_, k) => {
    const guest = k % 2 === 0;
    const staff = !guest && c.id % 3 === 0 && k === 3;
    return {
      sender_name: guest ? c.name : staff ? "Stella Staff" : "Acme Assistant",
      sender_image: null,
      message: guest ? GUEST_LINES[(c.id + k) % GUEST_LINES.length] : BOT_LINES[(c.id + k) % BOT_LINES.length],
      is_staff: staff,
      is_bot: !guest && !staff,
      reply_to: 0,
      manuel_action_required: guest && k === 2 && c.id % 4 === 0,
      conversation: c.id,
      created_at: new Date(new Date(c.created_at).getTime() + k * 3600 * 1000 * 3).toISOString(),
      updated_at: c.updated_at,
    };
  });
}).map((m, i) => ({ ...m, id: i + 1 }));

export const CONVERSATION_REQUESTS = CONVERSATIONS.slice(0, 8).map((c, i) => ({
  id: i + 1, conversation: c.id,
  text: ["Late check-out", "Extra towels", "Baby cot", "Early check-in", "Quiet room", "Airport pickup", "Extra key", "Pet friendly"][i],
  evidence: "Mentioned by the guest in chat.", source: i % 2 ? "request" : "preference", is_resolved: i % 3 === 0,
  created_at: c.created_at, updated_at: c.updated_at,
}));

export const conversationAnalyticsFor = (c) => ({
  conversation_id: c.id,
  summary: `Guest ${c.name} asked about arrival logistics and amenities. All questions were answered by the assistant.`,
  key_topics: "check-in, parking, wifi",
  last_analyzed_message_id: 1, last_message_id: 1,
  analysis: { id: c.id, summary: "Routine pre-arrival conversation.", highest_urgency_reached: "low", early_check_in_requested: c.id % 3 === 0, late_check_out_requested: c.id % 4 === 0, required_escalation: false, urgency: "low", requires_immediate_action: false, urgency_reason: "No blocking issues.", fixed_issues: [], created_at: c.created_at, updated_at: c.updated_at },
  guest_profile: null,
  satisfaction: { id: c.id, initial_satisfaction: 6, final_satisfaction: 8, satisfaction_trend: "improving", expectations_met: "yes", would_recommend_likelihood: 8, frustration_peaks: "none", satisfaction_peaks: "after quick reply", unresolved_concerns: "none", churn_risk: "low", churn_risk_factors: "", positive_mentions: "fast replies", negative_mentions: "", overall_satisfaction: 8, created_at: c.created_at, updated_at: c.updated_at },
  response_suggestion: null,
  sentiments: [{ id: 1, label: "positive", score: 0.7, confidence: 0.9, frustration_level: 1, expressed_emotions: "curious, friendly", created_at: c.created_at, updated_at: c.updated_at }],
  issues: [], risks: [], financial_risks: [], requests_and_preferences: [],
});

export const CONVERSATION_OVERVIEW = {
  average_sentiment_score: 0.62, total_message_volume: MESSAGES.length * 14,
  bot_message_volume_percentage: 68.4, staff_message_volume_percentage: 9.6, average_response_time_seconds: 94,
};

// ---------- AI: chronic issues & financial risks ----------
const ISSUE_TEXT = [
  ["cleanliness", "Guests report dust on top shelves"], ["maintenance", "Bathroom tap drips repeatedly"], ["check_in", "Smart lock battery low"],
  ["amenities", "Coffee machine descaling needed"], ["noise", "Street noise at night"], ["maintenance", "Heating takes long to warm up"],
  ["cleanliness", "Stains on living room sofa"], ["safety", "Loose stair railing"], ["communication", "Unclear parking instructions"], ["amenities", "Missing hair dryer"],
];
export const CHRONIC_ISSUES = ISSUE_TEXT.map(([issue_category, issue], i) => ({
  id: i + 1, property: PROPERTIES[i % PROPERTIES.length].id, issue_category, issue,
  report_count: 2 + ((i * 3) % 7), is_resolved: i % 4 === 3, resolved_at: i % 4 === 3 ? iso(-3) : null,
  created_at: iso(-80 + i * 7), updated_at: iso(-2),
}));
const RISK_TYPES = ["full_refund", "partial_refund", "discount", "compensation", "free_night", "upgrade"];
const EXPOSURE = ["Low", "Medium", "High", "Medium", "Low", "Critical", "Low", "High"];
export const FINANCIAL_RISKS = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1, conversation: CONVERSATIONS[i % CONVERSATIONS.length].id,
  property: { id: PROPERTIES[i % PROPERTIES.length].id, name: PROPERTIES[i % PROPERTIES.length].name },
  risk_type: RISK_TYPES[i % RISK_TYPES.length], source: i % 2 ? "guest" : "bot", risk_score: 20 + ((i * 17) % 75),
  evidence: "Guest requested compensation after a minor issue.", amount: String(30 + i * 15), percentage: i % 3 ? null : 10 + i,
  currency: "USD", is_committed: i % 4 === 0, is_reasonable: i % 3 !== 0, justification_strength: ["Weak", "Moderate", "Strong"][i % 3],
  recommendation: "Offer a partial discount on the next stay.", exposure_level: EXPOSURE[i % EXPOSURE.length], is_resolved: i % 5 === 4,
  created_at: iso(-70 + i * 5), updated_at: iso(-1),
}));

// ---------- Staff leave requests ----------
export const LEAVE_REQUESTS = [
  [6, "vacation", 10, 14, "pending"], [7, "sick", -12, -10, "approved"], [8, "personal", -30, -30, "approved"],
  [9, "vacation", 20, 27, "pending"], [6, "unpaid", -50, -45, "rejected"], [7, "sick", 2, 3, "approved"],
  [8, "vacation", 5, 8, "pending"], [10, "personal", 1, 1, "approved"], [11, "sick", 0, 1, "approved"], [9, "personal", 15, 15, "pending"],
].map(([by, leave_type, s, e, status], i) => ({
  id: i + 1, requested_by: by, requested_by_name: staffName(by), leave_type, start_date: day(s), end_date: day(e), status,
  reason: "Demo request", reviewed_by: status === "pending" ? null : 1, reviewed_at: status === "pending" ? null : iso(s - 3),
  review_note: status === "rejected" ? "Peak season" : "", created_at: iso(s - 8), updated_at: iso(s - 3),
}));

// ---------- Payment split rules ----------
export const PAYMENT_SPLIT_RULES = [
  { name: "Standard 80/20", description: "Owner keeps 80% of room revenue.", is_default: true, cleaning_fee_strategy: "workspace",
    rules: [{ rule_type: "percent", party: "cohost", priority: 1, percent: "20.00" }], property_count: 4 },
  { name: "Premium tiered", description: "Higher commission above a revenue threshold.", is_default: false, cleaning_fee_strategy: "split",
    rules: [{ rule_type: "tiered_percent", party: "cohost", priority: 1, tiers: [{ threshold: "0", percentage: "18" }, { threshold: "5000", percentage: "22" }] }], property_count: 2 },
].map((r, i) => ({ id: i + 1, is_active: true, remainder_collector_party: "home_owner", basis_remainder_party: "home_owner", created_at: iso(-200), updated_at: iso(-20), ...r }));

// ---------- Bot ----------
export const BOTS = [{
  id: 1, name: "Acme Assistant", workspace: 1, instruction: null, llm_model: 1, temperature: 0.4, delay_before_responding: 20, setup_completed: true,
  form_submission: { id: 1, template: "default", config: { role: "Guest communication assistant", objective: "Answer guest questions politely and accurately.", context: "Short-term rentals managed by Acme.", sop: "1. Greet. 2. Answer. 3. Escalate when unsure.", instructions: "Keep replies short and friendly.", examples: "", notes: "" } },
  created_at: iso(-120), updated_at: iso(-10),
}];

// ---------- Forms (cleaning checklists) ----------
export const FORMS = [
  { id: 1, name: "Turnover cleaning checklist", title: "Turnover cleaning checklist", description: "Completed after every guest checkout.", created_at: iso(-150), updated_at: iso(-20) },
  { id: 2, name: "Maintenance inspection", title: "Maintenance inspection", description: "Quarterly inspection of fixtures and appliances.", created_at: iso(-150), updated_at: iso(-20) },
];
const Q = (form, order, question, answer_type, extra = {}) => ({ form, order, question, answer_type, required: true, randomly_required: false, is_conditional: false, conditional_target: null, conditional_operator: "", conditional_value: "", options: [], ...extra });
export const QUESTIONS = [
  Q(1, 1, "Is the kitchen clean?", "yesno"), Q(1, 2, "Photo of the bathroom", "image"), Q(1, 3, "Cleanliness rating", "rating"),
  Q(1, 4, "Any missing amenities?", "open", { required: false }), Q(1, 5, "Linen condition", "dropdown", { options: ["New", "Good", "Needs replacing"] }),
  Q(2, 1, "Heating works?", "yesno"), Q(2, 2, "Number of smoke detectors", "number"), Q(2, 3, "Notes", "open", { required: false }),
].map((q, i) => ({ id: i + 1, ...q }));

const OPEN_NOTES = [
  "All good, replaced the towels and restocked the coffee pods.",
  "Left the balcony door slightly sticky, maintenance may need to look at it.",
  "Guest left a few items in the wardrobe, put them in the lost & found box.",
  "Minor stain on the sofa cushion, treated it with stain remover.",
  "No issues. Smart lock battery looked fine.",
  "Hair dryer was missing in the bedroom, brought a spare from the storage.",
  "Dishwasher needed an extra cycle, finished before the next check-in.",
  "Everything was in good condition.",
];
const LINEN = ["New", "Good", "Good", "Needs replacing"];

export const FORM_SUBMISSIONS = TASKS.filter((t) => t.type === "cleaning" && t.end_time).slice(-45).map((t, i) => {
  const status = ["approved", "approved", "pending", "approved", "needs_followup", "rejected"][i % 6];
  const reviewed = status !== "pending";
  const bad = status === "rejected" || status === "needs_followup";
  const q = QUESTIONS.filter((x) => x.form === 1).sort((a, b) => a.order - b.order);
  return {
    id: i + 1, form: 1, workspace: 1,
    property: SUPERVISOR_PROPERTIES.find((p) => p.id === t.property),
    task: { id: t.id, planned_start_time: t.planned_start_time, planned_end_time: t.planned_end_time },
    staff: { id: t.assignee, name: staffName(t.assignee) },
    status, review_note: status === "rejected" ? "Bathroom photo is blurry, please redo." : status === "needs_followup" ? "Check the sofa stain next visit." : "",
    reviewed_by: reviewed ? { id: 1, name: "Demo Admin" } : null,
    reviewed_at: reviewed ? iso(-1) : null, latitude: "41.0082", longitude: "28.9784", created_at: t.end_time,
    answers: [
      { question: q[0].id, answer: bad && i % 2 ? "No" : "Yes" },
      { question: q[1].id, answer: `/images/properties/property-${((t.property + i) % 12) + 1}.jpg` },
      { question: q[2].id, answer: String(bad ? 2 + (i % 2) : 4 + (i % 2)) },
      { question: q[3].id, answer: OPEN_NOTES[i % OPEN_NOTES.length] },
      { question: q[4].id, answer: LINEN[i % LINEN.length] },
    ],
  };
});

// Chat between the cleaner who filled in a form and the admin reviewing it.
export const submissionChatFor = (sub) => {
  const cleaner = sub.staff?.name ?? "Cleaner";
  const at = (m) => new Date(new Date(sub.created_at).getTime() + m * 60000).toISOString();
  const thread = [
    ["cleaner", `Hi! I just finished ${sub.property?.name ?? "the apartment"} and submitted the checklist.`, 2],
    ["admin", "Thanks " + cleaner.split(" ")[0] + "! Looking at it now.", 9],
  ];
  if (sub.status === "rejected") {
    thread.push(["admin", "The bathroom photo is blurry. Could you take a new one?", 14], ["cleaner", "Sure, I'll go back and retake it before the next guest arrives.", 20], ["admin", "Perfect, please also check the mirror.", 24]);
  } else if (sub.status === "needs_followup") {
    thread.push(["cleaner", "There is a small stain on the sofa, I treated it but it is still faintly visible.", 12], ["admin", "Noted, I flagged it. We'll look at it on the next visit.", 18]);
  } else if (sub.status === "approved") {
    thread.push(["cleaner", "All done, linen was swapped and the supplies are restocked.", 12], ["admin", "Great job, approved! 👍", 16]);
  } else {
    thread.push(["cleaner", "Let me know if you need any extra photos.", 12]);
  }
  return thread.map(([role, text, m], i) => ({
    id: i + 1, submission: sub.id, role, sender_name: role === "admin" ? "Demo Admin" : cleaner, text, created_at: at(m),
  }));
};

// ---------- Guest reviews (owners panel "Latest reviews"): ratings cycle 5 / 3 / 1 stars ----------
const REVIEW_TEXT = {
  5: [
    "Spotless apartment, great location and a super responsive host. Would happily stay again!",
    "Everything was perfect. The place felt like home and check-in was effortless.",
    "Beautiful, bright and exactly like the photos. Highly recommended.",
  ],
  3: [
    "Nice place overall, but the Wi-Fi was slow and the shower pressure was weak.",
    "Good location and clean, though the bed was a little firm and street noise was noticeable.",
    "Decent stay. Communication was good but a few items from the listing were missing.",
  ],
  1: [
    "Arrived to a dirty kitchen and the heating did not work. Very disappointed.",
    "The apartment was not as described and it took a long time to get a reply.",
    "Noisy, smelly bathroom and the key box was broken at check-in. Would not stay again.",
  ],
};
export const REVIEWS = RESERVATIONS.filter((r) => r.reservation_status === "completed" && r.checkout_date < day(0))
  .filter((_, i) => i % 7 === 3)
  .slice(-12)
  .map((r, i) => {
    const rating = [5, 3, 1][i % 3];
    const texts = REVIEW_TEXT[rating];
    return {
      id: i + 1,
      property: r.property.id,
      reservation: r.id,
      guest_name: r.guest_name,
      profile_picture: "/images/avatar.png",
      rating,
      comment: texts[Math.floor(i / 3) % texts.length],
      created_at: new Date(`${r.checkout_date}T18:00:00Z`).toISOString(),
    };
  })
  .sort((a, b) => b.created_at.localeCompare(a.created_at))
  // keep the 5 / 3 / 1 pattern in the newest-first order that the dashboard shows
  .map((r, i) => ({ ...r, rating: [5, 3, 1][i % 3], comment: REVIEW_TEXT[[5, 3, 1][i % 3]][Math.floor(i / 3) % 3] }));
