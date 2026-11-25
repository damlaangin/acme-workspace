"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/styles/Home.module.scss";
import EmptyLook from "@/components/ui/EmptyLook";
import PageGreeting from "@/components/ui/PageGreeting";
import { useWorkspace } from "@/context/workspace-context";
import HomeAiSection, {
  type HomeAiAttentionItem,
  type HomeAiFlaggedProperty,
} from "@/components/app/dashboard/home/HomeAiSection";
import HomeUpcomingSection, {
  type HomeUpcomingItem,
} from "@/components/app/dashboard/home/HomeUpcomingSection";
import HomePropertiesSection, {
  type HomePropertyItem,
} from "@/components/app/dashboard/home/HomePropertiesSection";
import HomeCleaningSection from "@/components/app/dashboard/home/HomeCleaningSection";
import HomeDemographicsSection, {
  type HomeDemographicsEntry,
} from "@/components/app/dashboard/home/HomeDemographicsSection";
import HomeQuickInfoSection, {
  type HomeQuickInfoItem,
  type HomeQuickInfoTrend,
} from "@/components/app/dashboard/home/HomeQuickInfoSection";
import HomeMarketPulseSection, {
  type HomeMarketPulseChannel,
} from "@/components/app/dashboard/home/HomeMarketPulseSection";
import { aiService } from "@/lib/services/ai.service";
import { propertiesService } from "@/lib/services/properties.service";
import { reportsService } from "@/lib/services/reports.service";
import { reservationsService } from "@/lib/services/reservations.service";
import type {
  GuestDemographic,
  MonthlySummary,
  PropertyOccupancy,
  Reservation,
} from "@/types/api";

const DEMOGRAPHICS_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
];

const AI_ATTENTION_ITEMS: HomeAiAttentionItem[] = [
  { title: "Guest at Skyline Penthouse reports no hot water", time: "12 min ago", tone: "danger" },
  { title: "Refund request detected in Sunny Loft Downtown chat", time: "1 hour ago", tone: "warning" },
  { title: "Cleaning delayed at Seaside Pool Villa before next check-in", time: "3 hours ago", tone: "warning" },
];

const MARKET_PULSE_CHANNELS: HomeMarketPulseChannel[] = [
  { name: "Airbnb", value: 100, color: "var(--chart-4)" },
  { name: "Direct", value: 0, color: "var(--chart-3)" },
  { name: "Booking", value: 0, color: "var(--chart-6)" },
];

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDashboardDateRange = () => {
  const today = new Date();
  const upcomingEnd = new Date(today);
  upcomingEnd.setDate(upcomingEnd.getDate() + 3);

  const daysInPrevMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    0
  ).getDate();
  const startDay = Math.min(today.getDate(), daysInPrevMonth);
  const demographicsStart = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    startDay
  );

  return {
    today: formatDate(today),
    upcomingEnd: formatDate(upcomingEnd),
    demographicsStart: formatDate(demographicsStart),
    demographicsEnd: formatDate(today),
  };
};

const formatIntegerWithoutRounding = (value: string | undefined) => {
  if (!value || value.trim() === "") return "-";

  const trimmed = value.trim();
  const decimalMatch = trimmed.match(/^([+-]?)(\d+)(?:\.\d+)?$/);

  if (decimalMatch) {
    const [, sign, integerPart] = decimalMatch;
    const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "");
    const bigintValue = BigInt(`${sign}${normalizedInteger}`);

    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(bigintValue);
  }

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return value;

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.trunc(numeric));
};

const formatValueWithCurrency = (
  currencyCode: string | undefined,
  value: string | undefined
) => {
  const formatted = formatIntegerWithoutRounding(value);
  if (formatted === "-") return formatted;
  return currencyCode ? `${currencyCode} ${formatted}` : formatted;
};

const formatPercent = (value: string | undefined) => {
  if (!value || value.trim() === "") return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `${value}%`;
  return `${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.trunc(numeric * 100))}%`;
};

const parseTrend = (value?: string | null): HomeQuickInfoTrend => {
  if (!value) return "stable";
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) return "stable";
  return numeric > 0 ? "up" : "down";
};

const normalizeMonthlySummary = (item: MonthlySummary) => ({
  ...item,
  gross_revenue: item.gross_revenue ?? item.total_revenue,
  gross_revenue_change: item.gross_revenue_change ?? item.total_revenue_change,
  workspace_revenue: item.workspace_revenue ?? item.workspace_earning,
  workspace_revenue_change:
    item.workspace_revenue_change ?? item.workspace_earning_change,
});

const buildCurrencyLines = (
  summaries: MonthlySummary[],
  field: keyof MonthlySummary,
  changeField: keyof MonthlySummary
) =>
  summaries.map((item) => ({
    label: item.currency_code,
    value: formatIntegerWithoutRounding(item[field]),
    trend: parseTrend(item[changeField]),
  }));

const buildQuickInfoItems = (summaries: MonthlySummary[]) => {
  const primarySummary = summaries[0];
  if (!primarySummary) return [];

  const currencyCode = primarySummary.currency_code;
  const hasMultipleCurrencies = summaries.length > 1;
  const normalized = summaries.map(normalizeMonthlySummary);

  return [
    {
      label: "Gross Revenue",
      value: hasMultipleCurrencies
        ? buildCurrencyLines(
            normalized,
            "gross_revenue",
            "gross_revenue_change"
          )
        : formatValueWithCurrency(
            currencyCode,
            primarySummary.gross_revenue ?? primarySummary.total_revenue
          ),
      trend: parseTrend(
        primarySummary.gross_revenue_change
          ?? primarySummary.total_revenue_change
      ),
    },
    {
      label: "Occupancy Rate",
      value: formatPercent(primarySummary.occupancy_rate),
      trend: parseTrend(primarySummary.occupancy_rate_change),
      inlineMeta: true,
      isOccupancy: true,
    },
    {
      label: "Workspace Revenue",
      value: hasMultipleCurrencies
        ? buildCurrencyLines(
            normalized,
            "workspace_revenue",
            "workspace_revenue_change"
          )
        : formatValueWithCurrency(
            currencyCode,
            primarySummary.workspace_revenue ?? primarySummary.workspace_earning
          ),
      trend: parseTrend(
        primarySummary.workspace_revenue_change
          ?? primarySummary.workspace_earning_change
      ),
      highlight: true,
    },
    {
      label: "Avg. Daily Rate",
      value: hasMultipleCurrencies
        ? buildCurrencyLines(
            summaries,
            "avg_nightly_rate",
            "avg_nightly_rate_change"
          )
        : formatValueWithCurrency(currencyCode, primarySummary.avg_nightly_rate),
      trend: parseTrend(primarySummary.avg_nightly_rate_change),
    },
    {
      label: "Total Expenses",
      value: hasMultipleCurrencies
        ? buildCurrencyLines(
            summaries,
            "total_expenses",
            "total_expenses_change"
          )
        : formatValueWithCurrency(currencyCode, primarySummary.total_expenses),
      trend: parseTrend(primarySummary.total_expenses_change),
    },
  ] satisfies HomeQuickInfoItem[];
};

const mapDemographics = (demo?: GuestDemographic) => {
  if (!demo) {
    return { series: [], internationalPct: "0%" };
  }

  const countries = [...(demo.countries ?? [])].sort(
    (a, b) => b.percentage - a.percentage
  );
  const series = countries.map((country, index) => ({
    name: country.country_name,
    value: country.percentage,
    color: DEMOGRAPHICS_COLORS[index % DEMOGRAPHICS_COLORS.length],
  }));

  if (demo.others?.percentage !== undefined) {
    series.push({
      name: "Others",
      value: demo.others.percentage,
      color: "var(--slate-300)",
    });
  }

  return {
    series,
    internationalPct: `${Math.trunc(demo.international_pct ?? 0)}%`,
  };
};

const mapPropertyOccupancy = (
  items: PropertyOccupancy[],
  currencyCode: string | undefined
): HomePropertyItem[] =>
  items.map((item) => ({
    name: item.property.name,
    revenue: formatValueWithCurrency(currencyCode, item.revenue),
    adr: formatValueWithCurrency(currencyCode, item.avg_nightly_rate),
    occupancy: formatPercent(item.occupancy_rate),
    occupancyValue: Number(item.occupancy_rate),
    image: item.property.images?.[0]?.image ?? "",
  }));

const mapReservationToUpcomingItem = (
  reservation: Reservation
): HomeUpcomingItem => ({
  id: reservation.id,
  name: reservation.guest_name,
  property: reservation.property.name,
  checkinDate: reservation.checkin_date,
  checkoutDate: reservation.checkout_date,
  checkInTime: reservation.property.check_in_time,
  checkOutTime: reservation.property.check_out_time,
});

export default function Home() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [upcomingFilter, setUpcomingFilter] = useState<
    "all" | "in" | "out" | "upcoming"
  >("all");
  const [noteModal, setNoteModal] = useState<string | null>(null);
  const [propertiesFilter, setPropertiesFilter] = useState<
    "top" | "needs"
  >("top");
  const [flaggedProperties, setFlaggedProperties] = useState<
    HomeAiFlaggedProperty[]
  >([]);
  const [demographicsSeries, setDemographicsSeries] = useState<
    HomeDemographicsEntry[]
  >([]);
  const [demographicsIntlPct, setDemographicsIntlPct] = useState("0%");
  const [quickInfoItems, setQuickInfoItems] = useState<HomeQuickInfoItem[]>([]);
  const [propertiesTableItems, setPropertiesTableItems] = useState<
    HomePropertyItem[]
  >([]);
  const [upcomingItems, setUpcomingItems] = useState<HomeUpcomingItem[]>([]);
  const workspaceId = currentWorkspace?.id;

  useEffect(() => {
    if (!workspaceId) {
      setFlaggedProperties([]);
      setDemographicsSeries([]);
      setDemographicsIntlPct("0%");
      setQuickInfoItems([]);
      setPropertiesTableItems([]);
      setUpcomingItems([]);
      return;
    }

    let isActive = true;

    const loadDashboardData = async () => {
      const {
        today,
        upcomingEnd,
        demographicsStart,
        demographicsEnd,
      } = getDashboardDateRange();

      const [
        issuesResult,
        monthlySummaryResult,
        demographicsResult,
        propertyOccupancyResult,
        checkinsResult,
        checkoutsResult,
      ] = await Promise.all([
        aiService.getChronicIssues(workspaceId, {
          page_size: 6,
          is_resolved: false,
        }),
        reportsService.getMonthlySummary(workspaceId),
        reportsService.getGuestDemographics(workspaceId, {
          start_date: demographicsStart,
          end_date: demographicsEnd,
        }),
        reportsService.getPropertyOccupancy(workspaceId),
        reservationsService.getReservations(workspaceId, {
          page_size: 200,
          checkin_date_gte: today,
          checkin_date_lte: upcomingEnd,
          ordering: "checkin_date",
          reservation_status: "completed",
        }),
        reservationsService.getReservations(workspaceId, {
          page_size: 200,
          checkout_date: today,
          ordering: "checkout_date",
          reservation_status: "completed",
        }),
      ]);

      if (!isActive) return;

      const monthlySummaries =
        monthlySummaryResult.success && monthlySummaryResult.data
          ? Array.isArray(monthlySummaryResult.data)
            ? monthlySummaryResult.data
            : [monthlySummaryResult.data]
          : [];
      const primaryCurrencyCode = monthlySummaries[0]?.currency_code;

      setQuickInfoItems(buildQuickInfoItems(monthlySummaries));
      setPropertiesTableItems(
        propertyOccupancyResult.success && propertyOccupancyResult.data
          ? mapPropertyOccupancy(
              propertyOccupancyResult.data,
              primaryCurrencyCode
            )
          : []
      );

      const demo =
        demographicsResult.success && demographicsResult.data
          ? Array.isArray(demographicsResult.data)
            ? demographicsResult.data[0]
            : demographicsResult.data
          : undefined;
      const demographics = mapDemographics(demo);

      setDemographicsSeries(demographics.series);
      setDemographicsIntlPct(demographics.internationalPct);

      const upcomingById = new Map<number, HomeUpcomingItem>();
      [checkinsResult, checkoutsResult].forEach((result) => {
        if (!result.success || !result.data) return;

        result.data.results.forEach((reservation) => {
          upcomingById.set(
            reservation.id,
            mapReservationToUpcomingItem(reservation)
          );
        });
      });

      const upcoming = Array.from(upcomingById.values()).sort(
        (a, b) => a.checkinDate.localeCompare(b.checkinDate)
      );

      setUpcomingItems(upcoming);

      const issues =
        issuesResult.success && issuesResult.data
          ? issuesResult.data.results
          : [];
      if (issues.length === 0) {
        setFlaggedProperties([]);
        return;
      }

      const propertiesResult = await propertiesService.getProperties(
        workspaceId,
        { page_size: 200 }
      );

      if (!isActive) return;

      const propertyNameById = new Map<number, string>();
      if (propertiesResult.success && propertiesResult.data) {
        propertiesResult.data.results.forEach((property) => {
          propertyNameById.set(property.id, property.name);
        });
      }

      setFlaggedProperties(
        issues.map((issue) => ({
          id: issue.id,
          name:
            propertyNameById.get(issue.property) ?? `Property #${issue.property}`,
          reason: issue.issue,
          flags: issue.report_count,
        }))
      );
    };

    loadDashboardData();
    return () => {
      isActive = false;
    };
  }, [workspaceId]);

  return (
    <div className={styles["home"]}>
      <PageGreeting
        className={styles["home__header-section"]}
        // subtitle="Here's what's happening across your portfolio today."
      />

      {quickInfoItems.length > 0 ? (
        <HomeQuickInfoSection items={quickInfoItems} />
      ) : (
        <EmptyLook label="portfolio metrics" />
      )}

      <div className={styles["home__aiRow"]}>
        <HomeAiSection
          attentionItems={AI_ATTENTION_ITEMS}
          flaggedProperties={flaggedProperties}
          onViewAll={() => router.push("/dashboard/ai")}
        />
        <HomeUpcomingSection
          upcomingFilter={upcomingFilter}
          items={upcomingItems}
          noteModal={noteModal}
          onFilterChange={setUpcomingFilter}
          onNoteOpen={(note) => setNoteModal(note)}
          onNoteClose={() => setNoteModal(null)}
        />
      </div>

      <div className={styles["home__layout"]}>
        <div className={styles["home__layout-left"]}>
          <HomeDemographicsSection
            series={demographicsSeries}
            totalLabel="INTL."
            totalValue={demographicsIntlPct}
          />
          <HomeMarketPulseSection channels={MARKET_PULSE_CHANNELS} />
        </div>

        <div className={styles["home__layout-right"]}>
          <HomePropertiesSection
            items={propertiesTableItems}
            filter={propertiesFilter}
            onFilterChange={setPropertiesFilter}
          />
          <HomeCleaningSection />
        </div>
      </div>
    </div>
  );
}
