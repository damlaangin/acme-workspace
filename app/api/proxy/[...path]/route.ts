// Mock API. There is no real backend: every request made by the service layer
// (lib/services/*) lands here and is answered from the in-memory demo data in lib/dummy.js.
import { NextRequest, NextResponse } from "next/server";
import {
  BOTS,
  CHRONIC_ISSUES,
  CITIES,
  CONVERSATIONS,
  CONVERSATION_OVERVIEW,
  CONVERSATION_REQUESTS,
  COUNTRIES,
  CURRENCIES,
  CURRENT_USER,
  EXPENSES,
  FINANCIAL_RISKS,
  FORMS,
  FORM_SUBMISSIONS,
  GROUPS,
  GROUP_ICONS,
  LEAVE_REQUESTS,
  MESSAGES,
  PAYMENT_SPLIT_RULES,
  PROPERTIES,
  QUESTIONS,
  RESERVATIONS,
  REVIEWS,
  STATES,
  SUPERVISOR_PROPERTIES,
  TASKS,
  USERS,
  WORKSPACE,
  conversationAnalyticsFor,
  submissionChatFor,
} from "@/lib/dummy";
import {
  allCurrencyIds,
  earningsAnalytics,
  expensesAnalytics,
  filterRows,
  guestDemographics,
  monthlySummary,
  paginate,
  propertyOccupancy,
  reservationsAnalytics,
  revenuePacing,
} from "@/lib/mock-engine";

type Row = Record<string, any>;

// Mutable in-memory store (resets when the server restarts).
const store: Record<string, Row[]> = {
  users: structuredClone(USERS),
  properties: structuredClone(PROPERTIES),
  reservations: structuredClone(RESERVATIONS),
  tasks: structuredClone(TASKS),
  expenses: structuredClone(EXPENSES),
  groups: structuredClone(GROUPS),
  reviews: structuredClone(REVIEWS),
  conversations: structuredClone(CONVERSATIONS),
  messages: structuredClone(MESSAGES),
  "conversation-requests": structuredClone(CONVERSATION_REQUESTS),
  "chronic-issues": structuredClone(CHRONIC_ISSUES),
  "financial-risks": structuredClone(FINANCIAL_RISKS),
  "leave-requests": structuredClone(LEAVE_REQUESTS),
  "payment-split-rules": structuredClone(PAYMENT_SPLIT_RULES),
  bots: structuredClone(BOTS),
  forms: structuredClone(FORMS),
  questions: structuredClone(QUESTIONS),
  "form-submissions": structuredClone(FORM_SUBMISSIONS),
};

const chats: Record<string, Row[]> = {};

const referenceData: Record<string, Row[]> = {
  currencies: CURRENCIES,
  countries: COUNTRIES,
  states: STATES,
  cities: CITIES,
};

const list = (results: Row[]) => ({ count: results.length, next: null, previous: null, results });
const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

async function readBody(request: NextRequest): Promise<Row> {
  try {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("multipart/form-data")) {
      return Object.fromEntries((await request.formData()).entries());
    }
    const text = await request.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

const nextId = (rows: Row[]) => Math.max(0, ...rows.map((r) => r.id ?? 0)) + 1;

// Task shape used by the supervisor "today" view.
const toTodayTask = (t: Row) => {
  const reservation = store.reservations.find((r) => r.id === t.reservation);
  const property = SUPERVISOR_PROPERTIES.find((p) => p.id === t.property) ?? SUPERVISOR_PROPERTIES[0];
  const assignee = store.users.find((u) => u.id === t.assignee);
  return {
    ...t,
    result: t.result ?? "",
    property,
    cleaning_fee: property.cleaning_payment_fee,
    reservation: reservation
      ? {
          guest_name: reservation.guest_name, country_name: reservation.country_name,
          checkin_date: reservation.checkin_date, checkout_date: reservation.checkout_date,
          adult_guest_count: reservation.adult_guest_count, child_guest_count: reservation.child_guest_count,
          baby_guest_count: reservation.baby_guest_count, pet_count: reservation.pet_count,
        }
      : null,
    assigned_to: assignee ? { id: assignee.id, name: `${assignee.user.first_name} ${assignee.user.last_name}` } : null,
  };
};

async function handle(request: NextRequest) {
  const url = new URL(request.url);
  const q = url.searchParams;
  const segments = url.pathname.replace(/^\/api\/proxy\/?/, "").split("/").filter(Boolean);
  const method = request.method;
  const [root, second, collection, itemId, ...rest] = segments;

  if (method === "OPTIONS") return json({});

  // Auth: always "logged in" as the demo user.
  if (root === "auth") {
    if (second === "user") return json(CURRENT_USER);
    return json({ detail: "ok", key: "demo-token", user: CURRENT_USER });
  }
  if (root === "registration") return json({ key: "demo-token", user: CURRENT_USER }, 201);

  // Reference data.
  if (root === "address" && second && referenceData[second]) return json(list(referenceData[second]));
  if (root === "allowed_permissions") return json(list([]));
  if (root === "group-icons") return json(list(GROUP_ICONS));

  if (root !== "workspaces") return method === "GET" ? json(list([])) : json({});

  // Workspaces.
  if (!second) return json(list([WORKSPACE]));
  if (!collection) return method === "GET" ? json(WORKSPACE) : json({ ...WORKSPACE, ...(await readBody(request)) });

  // ----- Analytics -----
  if (collection === "analytics") {
    switch (itemId) {
      case "reservations": return json(reservationsAnalytics(q, store.reservations).results);
      case "earnings": {
        // One series per currency (all of them unless a subset was requested).
        return json(allCurrencyIds(q).flatMap((id) => {
          const qq = new URLSearchParams(q);
          qq.set("currencies", String(id));
          return earningsAnalytics(qq, store.reservations).results.map((e) => ({
            ...e,
            total_host_earning: String(e.total_host_earning), total_workspace_earning: String(e.total_workspace_earning),
            total_cleaning_fee: String(e.total_cleaning_fee), avg_nightly_rate: String(e.avg_nightly_rate),
          }));
        }));
      }
      case "expenses": {
        return json(allCurrencyIds(q).flatMap((id) => {
          const qq = new URLSearchParams(q);
          qq.set("currencies", String(id));
          const r = expensesAnalytics(qq, store.expenses);
          return Object.entries(r.results).flatMap(([type, points]) =>
            points.map((pt: Row) => ({ period: pt.period, type, total_amount: String(pt.total), currency_code: r.currency_code }))
          );
        }));
      }
      case "property-occupancy": return json(propertyOccupancy(q, store.reservations));
      case "monthly-summary": return json(monthlySummary(store.reservations, store.expenses));
      case "guest-demographics": return json(guestDemographics(q, store.reservations));
      case "revenue-pacing": return json(revenuePacing(q, store.reservations));
      case "conversations": return json(CONVERSATION_OVERVIEW);
      case "export":
        return new NextResponse("period,total\n", {
          headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="analytics-export.csv"' },
        });
      default: return json({});
    }
  }

  // ----- Tasks "today" -----
  if (collection === "tasks" && itemId === "today-all") {
    const today = new Date().toISOString().slice(0, 10);
    return json(filterRows("tasks", store.tasks.filter((t) => t.planned_start_time.slice(0, 10) === today), q).map(toTodayTask));
  }

  // ----- Sub-resources -----
  if (rest.length > 0 || (itemId && ["messages", "requests"].includes(rest[0] ?? ""))) {
    const sub = rest[0];
    if (collection === "conversations" && sub === "messages") {
      return json(paginate(filterRows("messages", store.messages.filter((m) => String(m.conversation) === itemId), q), q, request.url));
    }
    if (collection === "conversations" && sub === "analytics") {
      const c = store.conversations.find((x) => String(x.id) === itemId) ?? store.conversations[0];
      return json(conversationAnalyticsFor(c));
    }
    if (collection === "conversations" && sub === "requests") {
      return json(paginate(store["conversation-requests"].filter((r) => String(r.conversation) === itemId), q, request.url));
    }
    if (collection === "forms" && sub === "questions") {
      return json(paginate(store.questions.filter((x) => String(x.form) === itemId).sort((a, b) => a.order - b.order), q, request.url));
    }
    if (collection === "form-submissions" && sub === "chat") {
      const submission = store["form-submissions"].find((x) => String(x.id) === itemId);
      if (!submission) return json(list([]));
      chats[itemId] ??= submissionChatFor(submission);
      if (method === "POST") {
        const body = await readBody(request);
        const message = { id: nextId(chats[itemId]), submission: submission.id, role: "admin", sender_name: "Demo Admin", text: String(body.text ?? ""), created_at: new Date().toISOString() };
        chats[itemId].push(message);
        return json(message, 201);
      }
      return json(list(chats[itemId]));
    }
    const target = store[collection]?.find((r) => String(r.id) === itemId);
    if (target && method === "POST") {
      if (sub === "resolve") target.is_resolved = true;
      if (sub === "approve") target.status = "approved";
      if (sub === "reject") target.status = "rejected";
      if (sub === "flag") target.status = "needs_followup";
      if (collection === "payment-split-rules" && sub === "duplicate") {
        const copy = { ...structuredClone(target), id: nextId(store[collection]), name: `${target.name} (copy)`, is_default: false };
        store[collection].push(copy);
        return json(copy, 201);
      }
      return json(target);
    }
    return json(method === "GET" ? list([]) : {});
  }

  // ----- Generic collections -----
  const rows = store[collection];
  if (!rows) return json(method === "GET" && !itemId ? list([]) : {});

  if (!itemId) {
    if (method === "GET") return json(paginate(filterRows(collection, rows, q), q, request.url));
    if (method === "POST") {
      const created = { id: nextId(rows), ...(await readBody(request)) };
      rows.push(created);
      return json(created, 201);
    }
    return json({});
  }

  const index = rows.findIndex((r) => String(r.id) === itemId);
  if (method === "GET" && collection === "form-submissions" && index >= 0) {
    // Detail view includes the form definition so answers can be shown next to their questions.
    const form = store.forms.find((f) => f.id === rows[index].form);
    const questions = store.questions.filter((x) => x.form === rows[index].form).sort((a, b) => a.order - b.order);
    return json({ ...rows[index], form_definition: { id: form?.id, name: form?.name, questions } });
  }
  if (method === "GET") return index >= 0 ? json(rows[index]) : json({ detail: "Not found." }, 404);
  if (method === "DELETE") {
    if (index >= 0) rows.splice(index, 1);
    return new NextResponse(null, { status: 204 });
  }
  if (method === "PUT" || method === "PATCH") {
    if (index < 0) return json({ detail: "Not found." }, 404);
    rows[index] = { ...rows[index], ...(await readBody(request)) };
    return json(rows[index]);
  }
  return json({});
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
