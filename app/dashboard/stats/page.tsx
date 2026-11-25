"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiDownload, FiFilter } from "react-icons/fi";
import {
  LuFileText,
  LuFile,
} from "react-icons/lu";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import styles from "@/styles/app/dashboard/Stats.module.scss";
import PageGreeting from "@/components/ui/PageGreeting";
import { useWorkspace } from "@/context/workspace-context";
import { reportsService, type AnalyticsFilters } from "@/lib/services/reports.service";
import { propertiesService } from "@/lib/services/properties.service";
import type {
  EarningAnalyticsDataPoint,
  ExpenseAnalyticsDataPoint,
  PropertyOccupancy,
  ReservationAnalyticsDataPoint,
  RevenuePacingEntry,
} from "@/types/api";

const exportDataPoints = [
  "Gross Revenue",
  "Net Operating Income",
  "Expenses Breakdown",
  "Occupancy Rates",
  "ADR Analysis",
];

const EXPENSE_COLORS: Record<string, string> = {
  cleaning: "var(--expense-cleaning)",
  maintenance: "var(--expense-maintenance)",
  rent: "var(--chart-9)",
  fixture: "var(--expense-fixture)",
  market: "var(--expense-market)",
  tax: "var(--expense-tax)",
  dues: "var(--expense-dues)",
  invoice: "var(--expense-invoice)",
  crediting: "var(--chart-8)",
};

const EXPENSE_LABELS: Record<string, string> = {
  cleaning: "Cleaning",
  maintenance: "Maintenance",
  rent: "Rent",
  fixture: "Fixture",
  market: "Market",
  crediting: "Crediting",
  dues: "Dues",
  invoice: "Invoice",
  tax: "Tax",
};

const calcGrossRevenue = (e: EarningAnalyticsDataPoint) =>
  Number(e.total_host_earning) + Number(e.total_workspace_earning) + Number(e.total_cleaning_fee);

const formatDateISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getPreviousDateRange = (dateAfter: string, dateBefore: string) => {
  const start = new Date(dateAfter);
  const end = new Date(dateBefore);
  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - duration);
  return {
    date_after: formatDateISO(prevStart),
    date_before: formatDateISO(prevEnd),
  };
};

const StatsDashboard = () => {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();

  // UI state
  const [datePreset, setDatePreset] = useState<"year" | "quarter" | "custom">("year");
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [localStart, setLocalStart] = useState<string>("");
  const [localEnd, setLocalEnd] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState("Monthly");
  const [exportFormat, setExportFormat] = useState("PDF");
  const [exportPoints, setExportPoints] = useState<string[]>([
    "Gross Revenue",
    "Net Operating Income",
    "Expenses Breakdown",
  ]);
  const [exportLoading, setExportLoading] = useState(false);
  const [propertySearch, setPropertySearch] = useState("");
  const [isPropertyMenuOpen, setIsPropertyMenuOpen] = useState(false);
  const [pendingProperties, setPendingProperties] = useState<number[]>([]);
  const [pendingPeriod, setPendingPeriod] = useState("Monthly");
  const propertyMenuRef = useRef<HTMLDivElement | null>(null);

  // Data state
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");
  const [expenseCurrency, setExpenseCurrency] = useState<string>("");
  const [profitCurrency, setProfitCurrency] = useState<string>("");
  const [compareCurrency, setCompareCurrency] = useState<string>("");
  const [isCompareMode, setIsCompareMode] = useState(true);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [properties, setProperties] = useState<{ id: number; name: string }[]>([]);
  const [earningsData, setEarningsData] = useState<EarningAnalyticsDataPoint[]>([]);
  const [expensesData, setExpensesData] = useState<ExpenseAnalyticsDataPoint[]>([]);
  const [prevEarningsData, setPrevEarningsData] = useState<EarningAnalyticsDataPoint[]>([]);
  const [prevExpensesData, setPrevExpensesData] = useState<ExpenseAnalyticsDataPoint[]>([]);
  const [reservationsData, setReservationsData] = useState<ReservationAnalyticsDataPoint[]>([]);
  const [prevReservationsData, setPrevReservationsData] = useState<ReservationAnalyticsDataPoint[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<PropertyOccupancy[]>([]);
  const [pacingData, setPacingData] = useState<RevenuePacingEntry[]>([]);
  const [pacingCurrency, setPacingCurrency] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [leaderboardSort, setLeaderboardSort] = useState<{
    key: "revenue" | "occ" | "adr";
    direction: "asc" | "desc";
  } | null>(null);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const getChartAxisSettings = (
    data: Record<string, string | number>[],
    keys: readonly string[]
  ) => {
    const values = data.flatMap((row) =>
      keys
        .map((key) => row[key])
        .filter((value): value is number => typeof value === "number")
    );
    const longestLabel = values.reduce((longest, value) => {
      const label = formatNumber(value);
      return label.length > longest.length ? label : longest;
    }, "0");
    const fontSize = longestLabel.length > 10 ? 10 : longestLabel.length > 8 ? 11 : 12;

    return {
      width: Math.min(Math.max(longestLabel.length * 7 + 18, 54), 92),
      tick: { fontSize },
    };
  };

  const formatDisplayDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatCurrencyValue = (value: number, currencyCode?: string) => {
    const code = currencyCode || selectedCurrency || availableCurrencies[0] || "USD";
    return `${code} ${formatNumber(value)}`;
  };

  const formatCurrencyAmount = (value: number) => formatNumber(value);

  const now = new Date();
  const lastYearStart = new Date(now);
  lastYearStart.setFullYear(now.getFullYear() - 1);
  const currentQuarterStart = new Date(
    now.getFullYear(),
    Math.floor(now.getMonth() / 3) * 3,
    1
  );
  const quarterStart = new Date(
    currentQuarterStart.getFullYear(),
    currentQuarterStart.getMonth() - 3,
    1
  );
  const quarterEnd = new Date(
    currentQuarterStart.getFullYear(),
    currentQuarterStart.getMonth(),
    0
  );
  const thisYearRangeLabel = `${formatDisplayDate(lastYearStart)} — ${formatDisplayDate(now)}`;
  const quarterRangeLabel = `${formatDisplayDate(quarterStart)} — ${formatDisplayDate(quarterEnd)}`;
  const customRangeLabel =
    customStart && customEnd
      ? `${formatDisplayDate(new Date(customStart))} — ${formatDisplayDate(new Date(customEnd))}`
      : "Select dates";
  const activeRangeLabel =
    datePreset === "year"
      ? thisYearRangeLabel
      : datePreset === "quarter"
        ? quarterRangeLabel
        : customRangeLabel;

  const getDateRange = () => {
    const current = new Date();
    if (datePreset === "year") {
      const start = new Date(current);
      start.setFullYear(current.getFullYear() - 1);
      return { date_after: formatDateISO(start), date_before: formatDateISO(current) };
    } else if (datePreset === "quarter") {
      const cqStart = new Date(current.getFullYear(), Math.floor(current.getMonth() / 3) * 3, 1);
      const qStart = new Date(cqStart.getFullYear(), cqStart.getMonth() - 3, 1);
      const qEnd = new Date(cqStart.getFullYear(), cqStart.getMonth(), 0);
      return { date_after: formatDateISO(qStart), date_before: formatDateISO(qEnd) };
    } else if (customStart && customEnd) {
      return { date_after: customStart.split("T")[0], date_before: customEnd.split("T")[0] };
    }
    const start = new Date(current);
    start.setFullYear(current.getFullYear() - 1);
    return { date_after: formatDateISO(start), date_before: formatDateISO(current) };
  };

  const toggleExportPoint = (point: string) => {
    setExportPoints((prev) =>
      prev.includes(point)
        ? prev.filter((item) => item !== point)
        : [...prev, point]
    );
  };

  const handleExport = async () => {
    if (!currentWorkspace?.id) return;

    setExportLoading(true);
    try {
      // Map UI labels to backend data_points
      const pointMap: Record<string, string[]> = {
        "Gross Revenue": ["revenue"],
        "Net Operating Income": ["revenue", "expenses"],
        "Expenses Breakdown": ["expenses"],
        "Occupancy Rates": ["occupancy"],
        "ADR Analysis": ["adr"],
      };
      const dataPointSet = new Set<string>();
      exportPoints.forEach((label) => {
        pointMap[label]?.forEach((dp) => dataPointSet.add(dp));
      });

      const { date_after: dateAfter, date_before: dateBefore } = getDateRange();

      const format = exportFormat.toLowerCase();
      const exportPeriodMap: Record<string, string> = {
        Daily: "daily",
        Weekly: "weekly",
        Monthly: "monthly",
        Quarterly: "quarterly",
        Yearly: "yearly",
      };
      const blob = await reportsService.exportAnalytics(currentWorkspace.id, {
        date_after: dateAfter,
        date_before: dateBefore,
        period: exportPeriodMap[selectedPeriod] ?? "monthly",
        export_format: format,
        properties: selectedProperties.length > 0 ? selectedProperties.join(",") : undefined,
        data_points: dataPointSet.size > 0 ? Array.from(dataPointSet).join(",") : undefined,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-export-${dateAfter}-to-${dateBefore}.${format === "pdf" ? "pdf" : "csv"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const resetFilters = () => {
    setPendingProperties([]);
    setPropertySearch("");
  };

  // Fetch properties separately (only depends on workspace)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        propertyMenuRef.current &&
        !propertyMenuRef.current.contains(event.target as Node)
      ) {
        setIsPropertyMenuOpen(false);
      }
    };
    if (isPropertyMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPropertyMenuOpen]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    propertiesService.getProperties(currentWorkspace.id, { page_size: 200 }).then((res) => {
      if (res.success && res.data) {
        setProperties(
          res.data.results.map((p: { id: number; name: string }) => ({ id: p.id, name: p.name }))
        );
      }
    });
  }, [currentWorkspace?.id]);

  const filteredProperties = useMemo(() => {
    const query = propertySearch.trim().toLowerCase();
    if (!query) return properties;
    return properties.filter((prop) => prop.name.toLowerCase().includes(query));
  }, [properties, propertySearch]);

  const togglePendingProperty = (propertyId: number) => {
    setPendingProperties((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  // Main data fetching
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    let isActive = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const { date_after, date_before } = getDateRange();
      type AnalyticsPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
      const periodMap: Record<string, AnalyticsPeriod> = {
        Daily: "daily",
        Weekly: "weekly",
        Monthly: "monthly",
        Quarterly: "quarterly",
        Yearly: "yearly",
      };
      const period: AnalyticsPeriod = periodMap[selectedPeriod] ?? "monthly";
      const filters: AnalyticsFilters = { date_after, date_before, period };
      if (selectedProperties.length > 0) {
        filters.properties = selectedProperties;
      }

      const prevRange = getPreviousDateRange(date_after, date_before);
      const prevFilters: AnalyticsFilters = {
        ...filters,
        date_after: prevRange.date_after,
        date_before: prevRange.date_before,
      };

      const leaderboardFilters: AnalyticsFilters = {
        date_after,
        date_before,
        ordering: "-occupancy_rate",
        ...(selectedProperties.length > 0
          ? { properties: selectedProperties }
          : {}),
      };

      try {
        const [
          earningsRes,
          expensesRes,
          reservationsRes,
          leaderboardRes,
          prevEarningsRes,
          prevExpensesRes,
          prevReservationsRes,
          pacingRes,
        ] = await Promise.all([
          reportsService.getEarningAnalytics(currentWorkspace.id, filters),
          reportsService.getExpenseAnalytics(currentWorkspace.id, filters),
          reportsService.getReservationAnalytics(currentWorkspace.id, filters),
          reportsService.getPropertyOccupancy(currentWorkspace.id, leaderboardFilters),
          reportsService.getEarningAnalytics(currentWorkspace.id, prevFilters),
          reportsService.getExpenseAnalytics(currentWorkspace.id, prevFilters),
          reportsService.getReservationAnalytics(currentWorkspace.id, prevFilters),
          reportsService.getRevenuePacing(currentWorkspace.id, {
            months_ahead: 3,
            properties: selectedProperties.length > 0 ? selectedProperties.join(",") : undefined,
          }),
        ]);

        if (!isActive) return;

        if (!earningsRes.success || !reservationsRes.success) {
          setError("Failed to load financial data. Please try again.");
          setLoading(false);
          return;
        }

        // Store raw data — KPIs computed in the secondary effect
        const earnings = Array.isArray(earningsRes.data) ? earningsRes.data : [];
        setEarningsData(earnings);

        const currencies = Array.from(new Set(earnings.map((d) => d.currency_code)));
        const ordered = [
          ...currencies.filter((c) => c === "TRY"),
          ...currencies.filter((c) => c !== "TRY"),
        ];
        setAvailableCurrencies(ordered);

        setExpensesData(
          expensesRes.success && Array.isArray(expensesRes.data) ? expensesRes.data : []
        );
        setReservationsData(Array.isArray(reservationsRes.data) ? reservationsRes.data : []);
        setPrevReservationsData(prevReservationsRes.success && Array.isArray(prevReservationsRes.data)
          ? prevReservationsRes.data : []);
        setLeaderboardData(
          leaderboardRes.success && Array.isArray(leaderboardRes.data) ? leaderboardRes.data : []
        );
        setPrevEarningsData(
          prevEarningsRes.success && Array.isArray(prevEarningsRes.data) ? prevEarningsRes.data : []
        );
        setPrevExpensesData(
          prevExpensesRes.success && Array.isArray(prevExpensesRes.data) ? prevExpensesRes.data : []
        );
        setPacingData(
          pacingRes.success && Array.isArray(pacingRes.data) ? pacingRes.data : []
        );
      } catch {
        if (isActive) {
          setError("Failed to load financial data. Please try again.");
        }
      }

      if (isActive) setLoading(false);
    };

    fetchData();
    return () => { isActive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id, datePreset, customStart, customEnd, selectedProperties, selectedPeriod]);

  useEffect(() => {
    if (availableCurrencies.length === 0) return;
    if (!selectedCurrency || !availableCurrencies.includes(selectedCurrency)) {
      setSelectedCurrency(availableCurrencies[0]);
    }
    if (!expenseCurrency || !availableCurrencies.includes(expenseCurrency)) {
      setExpenseCurrency(availableCurrencies[0]);
    }
    if (!profitCurrency || !availableCurrencies.includes(profitCurrency)) {
      setProfitCurrency(availableCurrencies[0]);
    }
  }, [availableCurrencies, selectedCurrency, expenseCurrency, profitCurrency]);

  useEffect(() => {
    if (availableCurrencies.length < 2) {
      setIsCompareMode(false);
      setCompareCurrency("");
      return;
    }
    const fallbackCompare = availableCurrencies.find((c) => c !== selectedCurrency) ?? "";
    if (!compareCurrency || !availableCurrencies.includes(compareCurrency) || compareCurrency === selectedCurrency) {
      setCompareCurrency(fallbackCompare);
    }
  }, [availableCurrencies, selectedCurrency, compareCurrency]);

  const pacingCurrencies = useMemo(
    () => Array.from(new Set(pacingData.map((d) => d.currency_code))),
    [pacingData]
  );

  useEffect(() => {
    if (pacingCurrencies.length === 0) return;
    if (!pacingCurrency || !pacingCurrencies.includes(pacingCurrency)) {
      setPacingCurrency(pacingCurrencies[0]);
    }
  }, [pacingCurrencies, pacingCurrency]);

  const pacingChartData = useMemo(() => {
    const activeCurrency = pacingCurrency || pacingCurrencies[0] || "";
    const filtered = pacingData.filter((d) => d.currency_code === activeCurrency);
    return filtered.map((d) => {
      const date = new Date(d.period);
      const label = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      return {
        month: label,
        thisYear: Number(d.current_year_revenue),
        lastYear: Number(d.last_year_revenue),
      };
    });
  }, [pacingData, pacingCurrency, pacingCurrencies]);

  const trend = (curr: number, prev: number): "up" | "down" | "stable" =>
    curr > prev ? "up" : curr < prev ? "down" : "stable";

  const occupancySummary = useMemo(() => {
    const totalBusyDays = reservationsData.reduce((sum: number, r) => sum + (Number(r.busy_days) || 0), 0);
    const totalActiveDays = reservationsData.reduce((sum: number, r) => sum + (Number(r.active_days) || 0), 0);
    const totalBlockedDays = reservationsData.reduce((sum: number, r) => sum + (Number(r.blocked_days) || 0), 0);
    const effectiveDays = totalActiveDays - totalBlockedDays;
    const current = effectiveDays > 0 ? totalBusyDays / effectiveDays : 0;

    const prevBusyDays = prevReservationsData.reduce((sum: number, r) => sum + (Number(r.busy_days) || 0), 0);
    const prevActiveDays = prevReservationsData.reduce((sum: number, r) => sum + (Number(r.active_days) || 0), 0);
    const prevBlockedDays = prevReservationsData.reduce((sum: number, r) => sum + (Number(r.blocked_days) || 0), 0);
    const prevEffectiveDays = prevActiveDays - prevBlockedDays;
    const prev = prevEffectiveDays > 0 ? prevBusyDays / prevEffectiveDays : 0;

    return { current: Math.min(current, 1), prev };
  }, [reservationsData, prevReservationsData]);

  const currencyKpis = useMemo(() => {
    if (availableCurrencies.length === 0) return [];
    return availableCurrencies.map((currency) => {
      const currEarnings = earningsData.filter((e) => e.currency_code === currency);
      const currExpenses = expensesData.filter((e) => e.currency_code === currency);

      const totalRevenue = currEarnings.reduce((sum, e) => sum + calcGrossRevenue(e), 0);
      const totalExpenses = currExpenses.reduce((sum, e) => sum + Number(e.total_amount), 0);
      const currentNoi = totalRevenue - totalExpenses;
      // TODO: busy_days is not filtered by currency — ADR will be deflated in multi-currency
      // workspaces. Proper fix requires backend to add currency_code to reservation analytics response.
      const totalRoomNights = reservationsData.reduce((sum, r) => sum + (Number(r.busy_days) || 0), 0);
      const avgNightlyRate = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 0;
      const currentRevpar = avgNightlyRate * occupancySummary.current;

      const prevCurrEarnings = prevEarningsData.filter((e) => e.currency_code === currency);
      const prevCurrExpenses = prevExpensesData.filter((e) => e.currency_code === currency);
      const prevRevenue = prevCurrEarnings.reduce((sum, e) => sum + calcGrossRevenue(e), 0);
      const prevTotalExpenses = prevCurrExpenses.reduce((sum, e) => sum + Number(e.total_amount), 0);
      const prevNoi = prevRevenue - prevTotalExpenses;
      // TODO: busy_days is not filtered by currency — ADR will be deflated in multi-currency
      // workspaces. Proper fix requires backend to add currency_code to reservation analytics response.
      const prevRoomNights = prevReservationsData.reduce((sum, r) => sum + (Number(r.busy_days) || 0), 0);
      const prevAvgRate = prevRoomNights > 0 ? prevRevenue / prevRoomNights : 0;
      const prevRevpar = prevAvgRate * occupancySummary.prev;

      return {
        currency,
        revenue: totalRevenue,
        noi: currentNoi,
        revpar: currentRevpar,
        trends: {
          revenue: trend(totalRevenue, prevRevenue),
          noi: trend(currentNoi, prevNoi),
          revpar: trend(currentRevpar, prevRevpar),
        },
      };
    });
  }, [
    availableCurrencies,
    earningsData,
    expensesData,
    prevEarningsData,
    prevExpensesData,
    reservationsData,
    prevReservationsData,
    occupancySummary,
  ]);

  // Chart data computations
  const financialChartData = useMemo(() => {
    const primary = selectedCurrency || availableCurrencies[0];
    if (!primary) return [];

    const buildSeries = (currency: string) => {
      const earningsByPeriod = new Map(
        earningsData
          .filter((e) => e.currency_code === currency)
          .map((e) => [e.period, e])
      );
      const expensesByPeriod = new Map<string, number>();
      expensesData
        .filter((e) => e.currency_code === currency)
        .forEach((e) => {
          expensesByPeriod.set(
            e.period,
            (expensesByPeriod.get(e.period) || 0) + Number(e.total_amount)
          );
        });
      return { earningsByPeriod, expensesByPeriod };
    };

    const effectiveCompare =
      compareCurrency && compareCurrency !== primary
        ? compareCurrency
        : availableCurrencies.find((c) => c !== primary) || "";

    if (isCompareMode && effectiveCompare) {
      const currencies = [primary, effectiveCompare];
      const seriesByCurrency = new Map(
        currencies.map((currency) => [currency, buildSeries(currency)])
      );
      const periods = Array.from(
        new Set(
          currencies.flatMap((currency) => {
            const series = seriesByCurrency.get(currency);
            if (!series) return [];
            return Array.from(series.earningsByPeriod.keys()).concat(
              Array.from(series.expensesByPeriod.keys())
            );
          })
        )
      ).sort();

      return periods.map((period) => {
        const label = new Date(period).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
        });
        const row: Record<string, string | number> = { month: label };
        currencies.forEach((currency) => {
          const series = seriesByCurrency.get(currency);
          if (!series) return;
          const earning = series.earningsByPeriod.get(period);
          const revenue = earning ? calcGrossRevenue(earning) : 0;
          const expenses = series.expensesByPeriod.get(period) || 0;
          row[`${currency}_Revenue`] = Math.round(revenue);
          row[`${currency}_Expenses`] = Math.round(expenses);
          row[`${currency}_NOI`] = Math.round(revenue - expenses);
        });
        return row;
      });
    }

    const { earningsByPeriod, expensesByPeriod } = buildSeries(primary);
    const periods = Array.from(
      new Set(Array.from(earningsByPeriod.keys()).concat(Array.from(expensesByPeriod.keys())))
    ).sort();

    return periods.map((period) => {
      const earning = earningsByPeriod.get(period);
      const revenue = earning ? calcGrossRevenue(earning) : 0;
      const expenses = expensesByPeriod.get(period) || 0;
      const monthLabel = new Date(period).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
      });
      return {
        month: monthLabel,
        Revenue: Math.round(revenue),
        Expenses: Math.round(expenses),
        NOI: Math.round(revenue - expenses),
      };
    });
  }, [
    earningsData,
    expensesData,
    selectedCurrency,
    compareCurrency,
    availableCurrencies,
    isCompareMode,
  ]);

  const expenseBreakdownData = useMemo(() => {
    const byType = new Map<string, number>();
    expensesData
      .filter((e) => e.currency_code === expenseCurrency)
      .forEach((e) => {
        byType.set(e.type, (byType.get(e.type) || 0) + Number(e.total_amount));
      });
    return Array.from(byType.entries())
      .map(([type, value]) => ({
        name: EXPENSE_LABELS[type] || type,
        value: Math.round(value),
        color: EXPENSE_COLORS[type] || "var(--chart-10)",
      }))
      .sort((a, b) => b.value - a.value);
  }, [expensesData, expenseCurrency]);

  const expenseTotal = useMemo(
    () => expenseBreakdownData.reduce((sum, d) => sum + d.value, 0),
    [expenseBreakdownData]
  );

  const profitabilityData = useMemo(() => {
    const currency = profitCurrency || availableCurrencies[0];
    if (!currency) return [];
    const currEarnings = earningsData.filter((e) => e.currency_code === currency);
    const payouts = currEarnings.reduce((sum, e) => sum + Number(e.total_host_earning), 0);
    const commission = currEarnings.reduce((sum, e) => sum + Number(e.total_workspace_earning), 0);
    const cleaningFees = currEarnings.reduce((sum, e) => sum + Number(e.total_cleaning_fee), 0);
    const expenses = expensesData
      .filter((e) => e.currency_code === currency)
      .reduce((sum, e) => sum + Number(e.total_amount), 0);

    return [
      { name: "Payouts", value: Math.round(payouts), color: "var(--chart-1)" },
      { name: "Commission", value: Math.round(commission), color: "var(--chart-2)" },
      { name: "Cleaning Fees", value: Math.round(cleaningFees), color: "var(--chart-3)" },
      { name: "Expenses", value: Math.round(expenses), color: "var(--chart-4)" },
    ].filter((d) => d.value > 0);
  }, [earningsData, expensesData, profitCurrency, availableCurrencies]);

  const profitabilityTotal = useMemo(
    () => profitabilityData.reduce((sum, d) => sum + d.value, 0),
    [profitabilityData]
  );

  const channelRoiData = useMemo(() => {
    const totalReservations = reservationsData.reduce(
      (sum, r) => sum + (Number(r.total_reservations) || 0), 0
    );

    const currencies = availableCurrencies.length
      ? availableCurrencies
      : selectedCurrency
        ? [selectedCurrency]
        : [];

    // TODO: busy_days is not filtered by currency — ADR will be deflated in multi-currency
    // workspaces. Proper fix requires backend to add currency_code to reservation analytics response.
    const totalRoomNights = reservationsData.reduce(
      (sum, r) => sum + (Number(r.busy_days) || 0), 0
    );

    const airbnbCurrencies = currencies.map((currency) => {
      const currEarnings = earningsData.filter((e) => e.currency_code === currency);
      const airbnbRevenue = currEarnings.reduce((sum, e) => sum + calcGrossRevenue(e), 0);
      const airbnbAdr = totalRoomNights > 0 ? airbnbRevenue / totalRoomNights : 0;
      return {
        currency,
        revenue: formatCurrencyValue(Math.round(airbnbRevenue), currency),
        adr: airbnbAdr > 0 ? formatCurrencyValue(Math.round(airbnbAdr), currency) : "—",
      };
    });

    const emptyCurrencies = currencies.map((currency) => ({
      currency,
      revenue: "—",
      adr: "—",
    }));

    return [
      {
        name: "Airbnb",
        reservations: totalReservations || null,
        currencies: airbnbCurrencies,
      },
      // {
      //   name: "Booking.com",
      //   reservations: null,
      //   currencies: emptyCurrencies,
      // },
      // {
      //   name: "Direct",
      //   reservations: null,
      //   currencies: emptyCurrencies,
      // },
      // {
      //   name: "VRBO",
      //   reservations: null,
      //   currencies: emptyCurrencies,
      // },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earningsData, reservationsData, selectedCurrency, availableCurrencies]);

  const leaderboardRows = useMemo(() => {
    return leaderboardData.map((item) => {
      const revenueValue = Math.round(Number(item.revenue) || 0);
      const occValue = Math.min(Math.round((Number(item.occupancy_rate) || 0) * 100), 100);
      const adrValue = Math.round(Number(item.avg_nightly_rate) || 0);
      return {
        name: item.property.name,
        revenue: formatCurrencyValue(revenueValue),
        occ: `${occValue}%`,
        adr: formatCurrencyValue(adrValue),
        trend: "—",
        trendPositive: true,
        revenueValue,
        occValue,
        adrValue,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderboardData, selectedCurrency]);

  const sortedLeaderboardRows = useMemo(() => {
    if (!leaderboardSort) return leaderboardRows;
    const { key, direction } = leaderboardSort;
    const dir = direction === "asc" ? 1 : -1;
    return [...leaderboardRows].sort((a, b) => {
      const aValue = key === "revenue" ? a.revenueValue : key === "occ" ? a.occValue : a.adrValue;
      const bValue = key === "revenue" ? b.revenueValue : key === "occ" ? b.occValue : b.adrValue;
      return (aValue - bValue) * dir;
    });
  }, [leaderboardRows, leaderboardSort]);

  const toggleLeaderboardSort = (key: "revenue" | "occ" | "adr") => {
    setLeaderboardSort((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: "desc" };
      }
      return { key, direction: prev.direction === "desc" ? "asc" : "desc" };
    });
  };

  const primaryKpi =
    currencyKpis.find((item) => item.currency === (selectedCurrency || availableCurrencies[0])) ||
    currencyKpis[0];

  const trendLabel = (t: "up" | "down" | "stable") =>
    t === "up" ? "Up" : t === "down" ? "Down" : "Stable";

  const trendPillClass = (t: "up" | "down" | "stable") =>
    t === "up"
      ? styles.kpiPillPositive
      : t === "down"
        ? styles.kpiPillWarning
        : styles.kpiPillNeutral;

  const primaryCurrency = selectedCurrency || availableCurrencies[0] || "";
  const compareOptions = availableCurrencies.filter((c) => c !== primaryCurrency);
  const compareValue = compareOptions.includes(compareCurrency)
    ? compareCurrency
    : compareOptions[0] || "";
  const compareSelection =
    compareValue && compareValue !== primaryCurrency ? compareValue : "";
  const compareCurrencies =
    isCompareMode && compareSelection
      ? [primaryCurrency, compareSelection].filter(Boolean)
      : [primaryCurrency].filter(Boolean);
  const chartMetrics = ["Revenue", "Expenses", "NOI"] as const;
  const financialAxisSettings = getChartAxisSettings(
    financialChartData,
    compareCurrencies.length > 1
      ? chartMetrics.map((metric) => `${compareCurrencies[0]}_${metric}`)
      : chartMetrics
  );
  const financialRightAxisSettings = getChartAxisSettings(
    financialChartData,
    compareCurrencies.length > 1
      ? chartMetrics.map((metric) => `${compareCurrencies[1]}_${metric}`)
      : chartMetrics
  );
  const pacingAxisSettings = getChartAxisSettings(pacingChartData, [
    "thisYear",
    "lastYear",
  ]);
  // Financial chart colours come from the --revenue-*, --expenses-* and --noi-* tokens (one shade per currency).
  const metricColor = (
    metric: (typeof chartMetrics)[number],
    _isComparison: boolean,
    currency?: string
  ) => {
    const code = (currency || primaryCurrency || "USD").toLowerCase();
    const key = ["try", "usd", "eur"].includes(code) ? code : "usd";
    const prefix = metric === "Revenue" ? "revenue" : metric === "Expenses" ? "expenses" : "noi";
    return `var(--${prefix}-${key})`;
  };
  const parseCurrencyFromSeries = (name: string) => {
    const match = /\(([^)]+)\)$/.exec(name);
    return match?.[1];
  };
  const stripCurrencyFromSeries = (name: string) =>
    name.replace(/\s*\([^)]+\)$/, "");

  const handleCloseCustomModal = () => {
    if (!customStart || !customEnd) {
      setDatePreset("year");
      setLocalStart("");
      setLocalEnd("");
    }
    setIsCustomModalOpen(false);
  };

  return (
    <div className={styles.stats}>
      <section className={styles.stats__greeting}>
        <div className={styles["stats__header-top"]}>
          <PageGreeting
            className={styles["stats__header-text"]}
            title="Financial Intelligence"
          />
        </div>
      </section>

      <section className={styles.stats__filter}>
        <div className={styles.filterBar}>
          <div className={styles.filterBar__left}>
            <div className={styles.filterBar__toggle}>
              <button
                className={`${styles.filterBar__button} ${
                  datePreset === "year" ? styles["is-active"] : ""
                }`}
                onClick={() => {
                  setDatePreset("year");
                  setIsCustomModalOpen(false);
                }}
              >
                Last 12 Months
              </button>
              <button
                className={`${styles.filterBar__button} ${
                  datePreset === "quarter" ? styles["is-active"] : ""
                }`}
                onClick={() => {
                  setDatePreset("quarter");
                  setIsCustomModalOpen(false);
                }}
              >
                Last Quarter
              </button>
              <button
                className={`${styles.filterBar__button} ${
                  datePreset === "custom" ? styles["is-active"] : ""
                }`}
                onClick={() => {
                  setDatePreset("custom");
                  setLocalStart(customStart);
                  setLocalEnd(customEnd);
                  setIsCustomModalOpen(true);
                }}
              >
                Custom
              </button>
            </div>
            <div className={styles.filterBar__range}>{activeRangeLabel}</div>
          </div>

          <div className={styles.filterBar__right}>
            <button
              className={`${styles.filterBar__action} ${
                isFilterOpen ? styles["is-open"] : ""
              }`}
              onClick={() => {
                setPendingProperties(selectedProperties);
                setPendingPeriod(selectedPeriod);
                setPropertySearch("");
                setIsPropertyMenuOpen(false);
                setIsFilterOpen(true);
              }}
            >
              <FiFilter />
              Filter
              {selectedProperties.length > 0 && ` (${selectedProperties.length})`}
            </button>

            <button
              className={styles.filterBar__export}
              onClick={() => setIsExportModalOpen(true)}
            >
              <FiDownload />
              Export Financial Report
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className={styles.stats__error} role="alert">
          {error}
        </div>
      )}

      {isFilterOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modal__header}>
              <div>
                <h4>Filter</h4>
              </div>
              <button
                className={styles.modal__close}
                onClick={() => setIsFilterOpen(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.filterModal__body}>
              <div className={styles.filterDropdown__group}>
                <span className={styles.label}>Properties</span>
                <div className={styles.propertySelect} ref={propertyMenuRef}>
                  <div className={styles.propertyPills}>
                    {pendingProperties.length > 0 ? (
                      pendingProperties.map((id) => {
                        const property = properties.find((item) => item.id === id);
                        return (
                          <span key={id} className={styles.propertyPill}>
                            {property?.name ?? "Unknown"}
                            <button
                              type="button"
                              className={styles.propertyPillRemove}
                              onClick={() => togglePendingProperty(id)}
                              aria-label="Remove property"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <span className={styles.propertyPlaceholder}>
                        Search property (e.g. Seaside Villa)...
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={propertySearch}
                    onChange={(event) => setPropertySearch(event.target.value)}
                    onFocus={() => setIsPropertyMenuOpen(true)}
                    className={styles.propertyInput}
                    aria-label="Search property"
                  />
                  {isPropertyMenuOpen && (
                    <div className={styles.propertyMenu}>
                      {filteredProperties.length > 0 ? (
                        filteredProperties.map((property) => {
                          const isSelected = pendingProperties.includes(property.id);
                          return (
                            <button
                              key={property.id}
                              type="button"
                              className={`${styles.propertyOption} ${
                                isSelected ? styles.propertyOptionSelected : ""
                              }`}
                              onClick={() => togglePendingProperty(property.id)}
                            >
                              <span>{property.name}</span>
                              {isSelected ? <span>✓</span> : null}
                            </button>
                          );
                        })
                      ) : (
                        <div className={styles.propertyEmpty}>
                          No properties found.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modal__field}>
                <label>Period</label>
                <select
                  value={pendingPeriod}
                  onChange={(event) => setPendingPeriod(event.target.value)}
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Yearly</option>
                </select>
              </div>
            </div>
            <div className={styles.filterDropdown__footer}>
              <button type="button" onClick={resetFilters}>
                Clear Filter
              </button>
              <button
                type="button"
                className={styles.isPrimary}
                onClick={() => {
                  setSelectedProperties(pendingProperties);
                  setSelectedPeriod(pendingPeriod);
                  setIsPropertyMenuOpen(false);
                  setIsFilterOpen(false);
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <section className={styles.stats__kpis}>
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Gross Revenue</span>
            {loading ? (
              <div className={styles.kpiRow}>
                <span className={styles.kpiValue}>—</span>
              </div>
            ) : currencyKpis.length > 1 ? (
              <div className={styles.kpiCurrencyList}>
                {currencyKpis.map((item) => (
                  <div key={`revenue-${item.currency}`} className={styles.kpiCurrencyRow}>
                    <span className={styles.kpiCurrencyCode}>{item.currency}</span>
                    <span className={styles.kpiCurrencyAmount}>
                      {formatCurrencyAmount(Math.round(item.revenue))}
                    </span>
                    {/* <span className={trendPillClass(item.trends.revenue)}>
                      {trendLabel(item.trends.revenue)}
                    </span> */}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.kpiRow}>
                <span className={styles.kpiValue}>
                  {primaryKpi
                    ? `${primaryKpi.currency} ${formatCurrencyAmount(Math.round(primaryKpi.revenue))}`
                    : "—"}
                </span>
                {/* <span className={trendPillClass(primaryKpi?.trends.revenue ?? "stable")}>
                  {trendLabel(primaryKpi?.trends.revenue ?? "stable")}
                </span> */}
              </div>
            )}
            <p>Total income before expenses</p>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Net Operating Income</span>
            {loading ? (
              <div className={styles.kpiRow}>
                <span className={styles.kpiValue} data-variant="accent">—</span>
              </div>
            ) : currencyKpis.length > 1 ? (
              <div className={styles.kpiCurrencyList}>
                {currencyKpis.map((item) => (
                  <div key={`noi-${item.currency}`} className={styles.kpiCurrencyRow}>
                    <span className={styles.kpiCurrencyCode}>{item.currency}</span>
                    <span className={styles.kpiCurrencyAmount} data-variant="accent">
                      {formatCurrencyAmount(Math.round(item.noi))}
                    </span>
                    {/* <span className={trendPillClass(item.trends.noi)}>
                      {trendLabel(item.trends.noi)}
                    </span> */}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.kpiRow}>
                <span className={styles.kpiValue} data-variant="accent">
                  {primaryKpi
                    ? `${primaryKpi.currency} ${formatCurrencyAmount(Math.round(primaryKpi.noi))}`
                    : "—"}
                </span>
                {/* <span className={trendPillClass(primaryKpi?.trends.noi ?? "stable")}>
                  {trendLabel(primaryKpi?.trends.noi ?? "stable")}
                </span> */}
              </div>
            )}
            <p>Actual profit (Revenue - Expenses)</p>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Portfolio Occupancy</span>
            <div className={styles.kpiRow}>
              <span className={styles.kpiValue}>
                {loading ? "—" : `${Math.round(occupancySummary.current * 100)}%`}
              </span>
              {/* <span className={trendPillClass(trend(occupancySummary.current, occupancySummary.prev))}>
                {trendLabel(trend(occupancySummary.current, occupancySummary.prev))}
              </span> */}
            </div>
            <div className={styles.kpiProgress}>
              <span style={{ width: loading ? "0%" : `${Math.round(occupancySummary.current * 100)}%` }} />
            </div>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>RevPAR</span>
            {loading ? (
              <div className={styles.kpiRow}>
                <span className={styles.kpiValue}>—</span>
              </div>
            ) : currencyKpis.length > 1 ? (
              <div className={styles.kpiCurrencyList}>
                {currencyKpis.map((item) => (
                  <div key={`revpar-${item.currency}`} className={styles.kpiCurrencyRow}>
                    <span className={styles.kpiCurrencyCode}>{item.currency}</span>
                    <span className={styles.kpiCurrencyAmount}>
                      {formatCurrencyAmount(Math.round(item.revpar))}
                    </span>
                    {/* <span className={trendPillClass(item.trends.revpar)}>
                      {trendLabel(item.trends.revpar)}
                    </span> */}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.kpiRow}>
                <span className={styles.kpiValue}>
                  {primaryKpi
                    ? `${primaryKpi.currency} ${formatCurrencyAmount(Math.round(primaryKpi.revpar))}`
                    : "—"}
                </span>
                {/* <span className={trendPillClass(primaryKpi?.trends.revpar ?? "stable")}>
                  {trendLabel(primaryKpi?.trends.revpar ?? "stable")}
                </span> */}
              </div>
            )}
            <p>Revenue Per Available Room</p>
          </div>
        </div>
      </section>

      <section className={styles.stats__financial}>
        <div className={styles.financialGrid}>
          <div className={styles.financialCard}>
            <div className={styles.financialHeader}>
              <div>
                <h3>Financial Performance</h3>
                <p>Revenue vs Expenses &amp; Net Income Trend</p>
              </div>
              {availableCurrencies.length > 1 && (
                <div className={styles.financialActions}>
                  <div className={styles.filterBar__toggle}>
                    {availableCurrencies.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedCurrency(c)}
                        className={`${styles.filterBar__button} ${
                          selectedCurrency === c ? styles["is-active"] : ""
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`${styles.filterBar__button} ${styles.currencyCompare} ${
                      isCompareMode ? styles["is-active"] : ""
                    }`}
                    onClick={() => setIsCompareMode((prev) => !prev)}
                  >
                    Compare
                  </button>
                </div>
              )}
            </div>
            {compareCurrencies.length > 1 && (
              <p className={styles.financialNote}>
                Left axis: {compareCurrencies[0]}. Right axis: {compareCurrencies[1]}. Dashed lines show comparison currency.
              </p>
            )}
            <div className={styles.financialChart}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5 }}>
                  Loading chart data...
                </div>
              ) : financialChartData.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5 }}>
                  No data available for the selected period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={financialChartData}
                    margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    {compareCurrencies.length > 1 ? (
                      <>
                        <YAxis
                          yAxisId="left"
                          width={financialAxisSettings.width}
                          tick={financialAxisSettings.tick}
                          tickFormatter={(value) => formatNumber(Number(value))}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          width={financialRightAxisSettings.width}
                          tick={financialRightAxisSettings.tick}
                          tickFormatter={(value) => formatNumber(Number(value))}
                        />
                        <Tooltip
                          formatter={(value, name) => {
                            const currency =
                              parseCurrencyFromSeries(String(name)) || primaryCurrency || "USD";
                            return [
                              formatCurrencyValue(Number(value), currency),
                              stripCurrencyFromSeries(String(name)),
                            ];
                          }}
                        />
                        <Legend />
                        {compareCurrencies.map((currency, currencyIndex) =>
                          chartMetrics.map((metric) => {
                            const isComparison = currencyIndex === 1;
                            if (metric === "NOI") {
                              return (
                                <Line
                                  key={`${currency}-${metric}`}
                                  type="monotone"
                                  dataKey={`${currency}_${metric}`}
                                  name={`${metric} (${currency})`}
                                  stroke={metricColor(metric, isComparison, currency)}
                                  strokeWidth={2}
                                  dot={false}
                                  strokeDasharray={isComparison ? "6 4" : "0"}
                                  yAxisId={isComparison ? "right" : "left"}
                                />
                              );
                            }
                            return (
                              <Bar
                                key={`${currency}-${metric}`}
                                dataKey={`${currency}_${metric}`}
                                name={`${metric} (${currency})`}
                                fill={metricColor(metric, isComparison, currency)}
                                radius={[8, 8, 0, 0]}
                                yAxisId={isComparison ? "right" : "left"}
                              />
                            );
                          })
                        )}
                      </>
                    ) : (
                      <>
                        <YAxis
                          width={financialAxisSettings.width}
                          tick={financialAxisSettings.tick}
                          tickFormatter={(value) => formatNumber(Number(value))}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            formatCurrencyValue(Number(value), primaryCurrency || "USD"),
                            String(name),
                          ]}
                        />
                        <Legend />
                        <Bar
                          dataKey="Revenue"
                          fill={metricColor("Revenue", false)}
                          radius={[8, 8, 0, 0]}
                        />
                        <Bar
                          dataKey="Expenses"
                          fill={metricColor("Expenses", false)}
                          radius={[8, 8, 0, 0]}
                        />
                        <Line
                          type="monotone"
                          dataKey="NOI"
                          stroke={metricColor("NOI", false)}
                          strokeWidth={3}
                          dot={{ r: 4 }}
                        />
                      </>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className={styles.financialCard}>
            <div className={styles.financialHeader}>
              <div>
                <h3>Expense Breakdown</h3>
                <p>Where the money goes</p>
              </div>
              {availableCurrencies.length > 1 && (
                <div className={styles.financialActions}>
                  <div className={styles.filterBar__toggle}>
                    {availableCurrencies.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setExpenseCurrency(c)}
                        className={`${styles.filterBar__button} ${
                          expenseCurrency === c ? styles["is-active"] : ""
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className={styles.expenseChart}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, opacity: 0.5 }}>
                  Loading...
                </div>
              ) : expenseBreakdownData.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, opacity: 0.5 }}>
                  No expense data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={expenseBreakdownData}
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {expenseBreakdownData.map((entry, index) => (
                        <Cell key={`expense-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <text
                      x="50%"
                      y="48%"
                      textAnchor="middle"
                      className={styles.expenseTotal}
                    >
                      {formatCurrencyAmount(expenseTotal)}
                    </text>
                    <text
                      x="50%"
                      y="58%"
                      textAnchor="middle"
                      className={styles.expenseLabel}
                    >
                      Total
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className={styles.expenseLegend}>
              {expenseBreakdownData.map((item, index) => (
                <div key={`expense-legend-${index}`} className={styles.expenseItem}>
                  <span
                    className={styles.expenseDot}
                    style={{ background: item.color }}
                  />
                  <span className={styles.expenseName}>{item.name}</span>
                  <span className={styles.expenseValue}>
                    {formatCurrencyValue(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.stats__forecast}>
        <div className={styles.forecastGrid}>
          <div className={styles.forecastCard}>
            <div className={styles.forecastHeader}>
              <div>
                <h3>Future Revenue Pacing</h3>
                <p>On The Books (OTB) vs Last Year</p>
              </div>
              {pacingCurrencies.length > 1 && (
                <div className={styles.financialActions}>
                  <div className={styles.filterBar__toggle}>
                    {pacingCurrencies.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setPacingCurrency(c)}
                        className={`${styles.filterBar__button} ${
                          pacingCurrency === c ? styles["is-active"] : ""
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {loading ? (
              <div className={styles.forecastChart} style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
                Loading...
              </div>
            ) : pacingChartData.length === 0 ? (
              <div className={styles.forecastChart} style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
                No future bookings available
              </div>
            ) : (
              <div className={styles.forecastChart}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={pacingChartData}
                    margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis
                      width={pacingAxisSettings.width}
                      tick={pacingAxisSettings.tick}
                      tickFormatter={(value) => formatNumber(Number(value))}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const curr = pacingCurrency || pacingCurrencies[0] || "";
                        return [formatCurrencyValue(Number(value), curr), name];
                      }}
                      labelFormatter={(label) => label}
                    />
                    <Legend />
                    <Bar
                      dataKey="thisYear"
                      name="This Year"
                      fill="var(--chart-1)"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="lastYear"
                      name="Last Year"
                      fill="var(--chart-2)"
                      radius={[8, 8, 0, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className={styles.forecastCard}>
            <div className={styles.forecastHeader}>
              <div>
                <h3>Profitability Breakdown</h3>
                <p>Where the Gross Revenue goes</p>
              </div>
              {availableCurrencies.length > 1 && (
                <div className={styles.financialActions}>
                  <div className={styles.filterBar__toggle}>
                    {availableCurrencies.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setProfitCurrency(c)}
                        className={`${styles.filterBar__button} ${
                          profitCurrency === c ? styles["is-active"] : ""
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className={styles.forecastDonut}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, opacity: 0.5 }}>
                  Loading...
                </div>
              ) : profitabilityData.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, opacity: 0.5 }}>
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={profitabilityData}
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {profitabilityData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <text
                      x="50%"
                      y="48%"
                      textAnchor="middle"
                      className={styles.expenseTotal}
                    >
                      {formatCurrencyAmount(profitabilityTotal)}
                    </text>
                    <text
                      x="50%"
                      y="58%"
                      textAnchor="middle"
                      className={styles.expenseLabel}
                    >
                      Total
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className={styles.forecastLegend}>
              {profitabilityData.map((item) => (
                <div key={item.name} className={styles.forecastLegendItem}>
                  <span
                    className={styles.forecastLegendDot}
                    style={{ background: item.color }}
                  />
                  <span className={styles.forecastLegendLabel}>
                    {item.name}
                  </span>
                  <strong>{formatCurrencyAmount(item.value)}</strong>
                  <em>
                    {profitabilityTotal > 0
                      ? `${Math.round((item.value / profitabilityTotal) * 100)}%`
                      : "—"}
                  </em>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.stats__roi}>
        <div className={styles.roiGrid}>
          <div className={styles.roiCard}>
            <div className={styles.roiHeader}>
              <div>
                <h3>Channel ROI</h3>
                <p>Revenue &amp; ADR by Source</p>
              </div>
            </div>

            <div className={styles.roiList}>
              {channelRoiData.map((item) => (
                <div key={item.name} className={styles.roiChannel}>
                  <div className={styles.roiChannelHeader}>
                    <span className={styles.roiChannelName}>{item.name}</span>
                    <span className={styles.roiChannelMeta}>
                      {item.reservations !== null
                        ? `${item.reservations} Reservations`
                        : "— Reservations"}
                    </span>
                  </div>
                  <div className={styles.roiCurrencyGrid}>
                    {item.currencies.map((currency) => (
                      <div key={`${item.name}-${currency.currency}`} className={styles.roiCurrencyBox}>
                        <strong className={styles.roiCurrencyValue}>
                          {currency.revenue}
                        </strong>
                        <span className={styles.roiAdrPill}>
                          ADR: {currency.adr}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.roiCard}>
            <div className={styles.roiHeader}>
              <div>
                <h3>Portfolio Leaderboard</h3>
                <p>Top 10 performing assets</p>
              </div>
              <button
                className={styles.roiButton}
                type="button"
                onClick={() => router.push("/dashboard/properties")}
              >
                View All
              </button>
            </div>

            <div className={styles.leaderboardTableWrapper}>
              <div className={styles.leaderboardTable}>
                {loading ? (
                  <div style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>
                    Loading...
                  </div>
                ) : leaderboardRows.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>
                    No property data available
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Property Name</th>
                        <th
                          aria-sort={
                            leaderboardSort?.key === "revenue"
                              ? leaderboardSort.direction === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          <button
                            type="button"
                            className={styles.sortHeader}
                            onClick={() => toggleLeaderboardSort("revenue")}
                          >
                            Revenue
                            <span className={styles.sortArrows} aria-hidden="true">
                              <span
                                className={
                                  leaderboardSort?.key === "revenue" &&
                                  leaderboardSort.direction === "asc"
                                    ? styles.sortArrowActive
                                    : styles.sortArrow
                                }
                              >
                                ▲
                              </span>
                              <span
                                className={
                                  leaderboardSort?.key === "revenue" &&
                                  leaderboardSort.direction === "desc"
                                    ? styles.sortArrowActive
                                    : styles.sortArrow
                                }
                              >
                                ▼
                              </span>
                            </span>
                          </button>
                        </th>
                        <th
                          aria-sort={
                            leaderboardSort?.key === "occ"
                              ? leaderboardSort.direction === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          <button
                            type="button"
                            className={styles.sortHeader}
                            onClick={() => toggleLeaderboardSort("occ")}
                          >
                            Occ %
                            <span className={styles.sortArrows} aria-hidden="true">
                              <span
                                className={
                                  leaderboardSort?.key === "occ" &&
                                  leaderboardSort.direction === "asc"
                                    ? styles.sortArrowActive
                                    : styles.sortArrow
                                }
                              >
                                ▲
                              </span>
                              <span
                                className={
                                  leaderboardSort?.key === "occ" &&
                                  leaderboardSort.direction === "desc"
                                    ? styles.sortArrowActive
                                    : styles.sortArrow
                                }
                              >
                                ▼
                              </span>
                            </span>
                          </button>
                        </th>
                        <th
                          aria-sort={
                            leaderboardSort?.key === "adr"
                              ? leaderboardSort.direction === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          <button
                            type="button"
                            className={styles.sortHeader}
                            onClick={() => toggleLeaderboardSort("adr")}
                          >
                            ADR
                            <span className={styles.sortArrows} aria-hidden="true">
                              <span
                                className={
                                  leaderboardSort?.key === "adr" &&
                                  leaderboardSort.direction === "asc"
                                    ? styles.sortArrowActive
                                    : styles.sortArrow
                                }
                              >
                                ▲
                              </span>
                              <span
                                className={
                                  leaderboardSort?.key === "adr" &&
                                  leaderboardSort.direction === "desc"
                                    ? styles.sortArrowActive
                                    : styles.sortArrow
                                }
                              >
                                ▼
                              </span>
                            </span>
                          </button>
                        </th>
                        <th>Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedLeaderboardRows.map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td>{row.revenue}</td>
                          <td className={styles.leaderboardOcc}>{row.occ}</td>
                          <td>{row.adr}</td>
                          <td
                            className={
                              row.trendPositive
                                ? styles.leaderboardTrendPositive
                                : styles.leaderboardTrendNegative
                            }
                          >
                            {row.trend}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className={styles.leaderboardCards}>
              {loading ? (
                <div className={styles.leaderboardCardStatus}>Loading...</div>
              ) : leaderboardRows.length === 0 ? (
                <div className={styles.leaderboardCardStatus}>No property data available</div>
              ) : (
                sortedLeaderboardRows.map((row) => (
                  <article className={styles.leaderboardCard} key={`mobile-${row.name}`}>
                    <div className={styles.leaderboardCardHeader}>
                      <span>{row.name}</span>
                      <span
                        className={
                          row.trendPositive
                            ? styles.leaderboardTrendPositive
                            : styles.leaderboardTrendNegative
                        }
                      >
                        {row.trend}
                      </span>
                    </div>
                    <div className={styles.leaderboardCardGrid}>
                      <div className={styles.leaderboardCardItem}>
                        <span className={styles.leaderboardCardLabel}>Revenue</span>
                        <span className={styles.leaderboardCardValue}>{row.revenue}</span>
                      </div>
                      <div className={styles.leaderboardCardItem}>
                        <span className={styles.leaderboardCardLabel}>Occ %</span>
                        <span className={`${styles.leaderboardCardValue} ${styles.leaderboardOcc}`}>
                          {row.occ}
                        </span>
                      </div>
                      <div className={styles.leaderboardCardItem}>
                        <span className={styles.leaderboardCardLabel}>ADR</span>
                        <span className={styles.leaderboardCardValue}>{row.adr}</span>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {isCustomModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modal__header}>
              <div>
                <h4>Custom Date Range</h4>
                <p>Select specific dates.</p>
              </div>
              <button
                className={styles.modal__close}
                onClick={handleCloseCustomModal}
              >
                ×
              </button>
            </div>
            <div className={styles.modal__body}>
              <div className={styles.modal__field}>
                <label>Start</label>
                <input
                  type="datetime-local"
                  value={localStart}
                  onChange={(event) => setLocalStart(event.target.value)}
                />
              </div>
              <div className={styles.modal__field}>
                <label>End</label>
                <input
                  type="datetime-local"
                  value={localEnd}
                  onChange={(event) => setLocalEnd(event.target.value)}
                />
              </div>
            </div>
            <div className={styles.modal__footer}>
              <button onClick={handleCloseCustomModal}>
                Cancel
              </button>
              <button
                className={styles.isPrimary}
                onClick={() => {
                  if (localStart && localEnd && localEnd >= localStart) {
                    setCustomStart(localStart);
                    setCustomEnd(localEnd);
                  }
                  setIsCustomModalOpen(false);
                }}
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}

      {isExportModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modal__header}>
              <div>
                <h4>Export Financial Report</h4>
                <p>Customize your data export for deep analysis.</p>
              </div>
              <button
                className={styles.modal__close}
                onClick={() => setIsExportModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modal__bodyGrid}>
              <div>
                <h4>1. Select Data Points</h4>
                <div className={styles.modal__checklist}>
                  {exportDataPoints.map((point) => (
                    <label key={point}>
                      <input
                        type="checkbox"
                        checked={exportPoints.includes(point)}
                        onChange={() => toggleExportPoint(point)}
                      />
                      {point}
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles.modal__rightCol}>
                <div className={styles.modal__field}>
                  <label>2. Format</label>
                  <div className={styles.modal__formats}>
                    {[
                      { label: "PDF", icon: LuFileText },
                      { label: "CSV", icon: LuFile },
                    ].map((format) => (
                      <button
                        key={format.label}
                        className={`${styles.formatCard} ${
                          exportFormat === format.label
                            ? styles["is-active"]
                            : ""
                        }`}
                        onClick={() => setExportFormat(format.label)}
                        type="button"
                      >
                        <format.icon aria-hidden="true" />
                        <span>{format.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modal__footer}>
              <button onClick={() => setIsExportModalOpen(false)}>
                Cancel
              </button>
              <button
                className={styles.isPrimary}
                onClick={handleExport}
                disabled={exportLoading || exportPoints.length === 0}
              >
                {exportLoading ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsDashboard;
