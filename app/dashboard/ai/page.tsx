"use client";
import { useEffect, useState } from "react";
import styles from "@/styles/AiInsights.module.scss";
import {
  LuDollarSign,
  LuSmile,
  LuCpu,
} from "react-icons/lu";
import AiBreadcrumb from "@/components/app/ai/AiBreadcrumb";
import EmptyLook from "@/components/ui/EmptyLook";
import PageGreeting from "@/components/ui/PageGreeting";
import { useWorkspace } from "@/context/workspace-context";
import { propertiesService } from "@/lib/services/properties.service";
import { aiService, type ChronicIssue } from "@/lib/services/ai.service";
import { financialRisksService } from "@/lib/services/financial-risks.service";
import { reportsService } from "@/lib/services/reports.service";
import type {
  ConversationAnalyticsOverview,
  FinancialRisk,
  Property,
} from "@/types/api";
import AiPriorities from "@/components/app/ai/AiPriorities";
import AiRisks, { type AiRiskItem } from "@/components/app/ai/AiRisks";
import AiChronics from "@/components/app/ai/AiChronics";
// import AiSuggestions, { type AiSuggestionItem } from "@/components/app/ai/AiSuggestions";
import AiLiveTeam from "@/components/app/ai/AiLiveTeam";
import AiOverride from "@/components/app/ai/AiOverride";

const priorityItems = [
  {
    name: "Alice G.",
    avatar:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80",
    issue: "Late check-in",
    property: "Skyline Penthouse",
    time: "Yesterday",
    aiNote: "Guest is arriving early; send smart lock code and parking guide.",
    suggestion: "Send Arrival Pack",
  },
  {
    name: "Bob V.",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    issue: "Noise complaint",
    property: "Seaside Pool Villa",
    time: "Yesterday",
    aiNote: "3 neighbor complaints in 24h. Recommend warning and quiet hours reminder.",
    suggestion: "Issue Warning",
  },
];

const liveTeam: any[] = [
  {
    name: "Sam Taylor",
    email: "user@example.com",
    role: "Senior Host",
    hostTag: "Host",
    isTopHost: true,
    avatar:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=120&q=80",
    aiScore: 92,
    load: "High Load",
    loadVariant: "high",
    stats: {
      totalMessages: "2,579",
      avgResponse: "72.5 hrs",
      resolutionRate: "79.6%",
      satisfactionScore: "92.9%",
      bestSolver: "79.6%",
    },
    insight:
      "Sam is the best problem solver in the team, but delayed response times are impacting overall guest experience.",
  },
  {
    name: "Jordan L.",
    email: "user@example.com",
    role: "Guest Experience Lead",
    hostTag: "Co-Host",
    isTopHost: false,
    avatar:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80",
    aiScore: 88,
    load: "Balanced",
    loadVariant: "med",
    stats: {
      totalMessages: "1,984",
      avgResponse: "28.2 hrs",
      resolutionRate: "86.4%",
      satisfactionScore: "94.1%",
      bestSolver: "86.4%",
    },
    insight:
      "Jordan keeps response times healthy while maintaining a strong satisfaction rate across complex guest requests.",
  },
  {
    name: "Casey M.",
    email: "user@example.com",
    role: "Night Shift Host",
    hostTag: "Host",
    isTopHost: false,
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    aiScore: 76,
    load: "Low Load",
    loadVariant: "low",
    stats: {
      totalMessages: "1,210",
      avgResponse: "18.5 hrs",
      resolutionRate: "81.2%",
      satisfactionScore: "90.3%",
      bestSolver: "81.2%",
    },
    insight:
      "Casey resolves overnight issues quickly; monitor handoff quality to reduce repeated follow-ups.",
  },
];

type FinancialRiskCurrencyLine = {
  currency: string;
  amount: string;
};

const hasFinancialRiskAmount = (risk: FinancialRisk) => {
  const amount = Number(risk.amount);
  return Number.isFinite(amount) && amount > 0;
};

const formatIntegerWithoutRounding = (value: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.trunc(value));

const buildFinancialRiskCurrencyLines = (
  risks: FinancialRisk[]
): FinancialRiskCurrencyLine[] => {
  const totalsByCurrency = new Map<string, number>();

  risks.forEach((risk) => {
    const amount = Number(risk.amount ?? 0);
    if (!Number.isFinite(amount)) return;

    const currency = risk.currency || "Unknown";
    totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? 0) + amount);
  });

  return Array.from(totalsByCurrency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([currency, amount]) => ({
      currency,
      amount: formatIntegerWithoutRounding(amount),
    }));
};

const formatRiskAmount = (risk: FinancialRisk) => {
  const amount = Number(risk.amount);
  const formattedAmount = formatIntegerWithoutRounding(
    Number.isFinite(amount) ? amount : 0
  );

  return risk.currency ? `${risk.currency} ${formattedAmount}` : formattedAmount;
};

const formatRiskType = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const mapFinancialRiskItems = (
  risks: FinancialRisk[],
  properties: Property[]
): AiRiskItem[] => {
  const propertyNameById = new Map(
    properties.map((property) => [property.id, property.name])
  );

  return risks.map((risk) => {
    const property =
      typeof risk.property === "number"
        ? {
            id: risk.property,
            name: propertyNameById.get(risk.property) ?? `Property #${risk.property}`,
          }
        : risk.property;

    return {
      id: risk.id,
      name: property.name,
      amount: formatRiskAmount(risk),
      progress: Math.max(0, Math.min(100, risk.risk_score * 100)),
      reason: risk.recommendation || risk.evidence || formatRiskType(risk.risk_type),
      status: risk.exposure_level,
      conversation: risk.conversation,
      property,
      riskType: risk.risk_type,
      source: risk.source,
      riskScore: risk.risk_score,
      evidence: risk.evidence,
      percentage: risk.percentage,
      currency: risk.currency,
      isCommitted: risk.is_committed,
      isReasonable: risk.is_reasonable,
      justificationStrength: risk.justification_strength,
      recommendation: risk.recommendation,
      exposureLevel: risk.exposure_level,
      createdAt: risk.created_at,
    };
  });
};

const DashboardAIPage = () => {
  const { currentWorkspace } = useWorkspace();
  const [properties, setProperties] = useState<Property[]>([]);
  const [chronicIssues, setChronicIssues] = useState<ChronicIssue[]>([]);
  const [financialRisks, setFinancialRisks] = useState<FinancialRisk[]>([]);
  const [conversationAnalytics, setConversationAnalytics] =
    useState<ConversationAnalyticsOverview | null>(null);

  const formatPercent = (value: number) => `${Math.round(value)}%`;
  const formatResponseTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes.toFixed(1)}m`;
    const hours = minutes / 60;
    return `${hours.toFixed(1)}h`;
  };

  const sentimentBaseScore = Math.trunc(
    (conversationAnalytics?.average_sentiment_score ?? 0) * 100
  ) / 100;
  const sentimentScore = sentimentBaseScore * 5;
  const botShare = conversationAnalytics?.bot_message_volume_percentage ?? 0;
  const staffShare = conversationAnalytics?.staff_message_volume_percentage ?? 0;
  const totalMessageVolume = conversationAnalytics?.total_message_volume ?? 0;
  const responseTimeSeconds =
    conversationAnalytics?.average_response_time_seconds ?? 0;
  const financialRisksWithAmount = financialRisks.filter(hasFinancialRiskAmount);
  const activeFinancialRiskCount = financialRisksWithAmount.length;
  const financialRiskCurrencyLines =
    buildFinancialRiskCurrencyLines(financialRisksWithAmount);
  const financialRiskItems = mapFinancialRiskItems(
    financialRisksWithAmount,
    properties
  );

  const infoCards = [
    {
      title: "Guest Sentiment",
      value: sentimentScore.toFixed(2),
      valueMeta: "/ 5.0",
      pill:
        sentimentScore >= 4
          ? "Strong"
          : sentimentScore >= 3
            ? "Stable"
            : "Needs Attention",
      pillVariant: sentimentScore >= 4 ? "positive" : "neutral",
      icon: LuSmile,
    },
    {
      title: "Operation Pulse",
      value: formatPercent(botShare),
      valueMeta: "AI Share",
      pill: totalMessageVolume
        ? `${totalMessageVolume.toLocaleString()} messages`
        : "",
      pillVariant: "",
      accent: true,
    },
    {
      title: "Ratio",
      value: "",
      valueMeta: "",
      pill: "",
      pillVariant: "",
      hideValue: true,
      metricsColumns: 2,
      metricsVariant: "ratio",
      metrics: [
        { label: "Staff", value: formatPercent(staffShare) },
        { label: "Speed", value: formatResponseTime(responseTimeSeconds) },
      ],
      progress: {
        value: Math.max(0, Math.min(100, botShare)),
        label: "Human vs AI Rate",
        split: `${formatPercent(staffShare)} / ${formatPercent(botShare)}`,
      },
    },
    {
      title: "Financial Risks",
      value: financialRiskCurrencyLines,
      valueMeta: "",
      pill: `${activeFinancialRiskCount} Active Claim${
        activeFinancialRiskCount === 1 ? "" : "s"
      }`,
      pillVariant: "default",
      icon: LuDollarSign,
    },
  ];

  const handleResolveFinancialRisk = async (riskId: number) => {
    if (!currentWorkspace?.id) {
      return {
        success: false,
        message: "Workspace is not ready. Please try again.",
      };
    }

    const result = await financialRisksService.update(
      currentWorkspace.id,
      riskId,
      { is_resolved: true }
    );

    if (result.success) {
      setFinancialRisks((prev) => prev.filter((risk) => risk.id !== riskId));
      return {
        success: true,
        message: "Financial risk resolved successfully.",
      };
    }

    return {
      success: false,
      message: result.error?.message || "Failed to resolve financial risk.",
    };
  };

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    let isActive = true;
    const loadFinancialRisks = async () => {
      const result = await financialRisksService.list(currentWorkspace.id, {
        is_resolved: false,
        page_size: 100,
        ordering: "-risk_score",
      });

      if (!isActive) return;
      if (result.success && result.data) {
        console.log("Financial risks data:", result.data);
        setFinancialRisks((result.data.results ?? []).filter(hasFinancialRiskAmount));
      } else {
        console.log("Financial risks data:", result);
        setFinancialRisks([]);
      }
    };
    loadFinancialRisks();
    return () => {
      isActive = false;
    };
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    let isActive = true;
    const loadProperties = async () => {
      const result = await propertiesService.getAllProperties(
        currentWorkspace.id
      );
      if (!isActive) return;
      if (result.success && result.data) {
        setProperties(result.data);
      }
    };
    loadProperties();
    return () => {
      isActive = false;
    };
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    let isActive = true;
    const loadConversationAnalytics = async () => {
      const result = await reportsService.getConversationAnalytics(
        currentWorkspace.id
      );
      if (!isActive) return;
      if (result.success && result.data) {
        setConversationAnalytics(result.data);
      }
    };
    loadConversationAnalytics();
    return () => {
      isActive = false;
    };
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    let isActive = true;
    const loadChronicIssues = async () => {
      const result = await aiService.getChronicIssues(currentWorkspace.id, {
        page_size: 50,
      });
      if (!isActive) return;
      if (result.success && result.data) {
        setChronicIssues(result.data.results ?? []);
      }
    };
    loadChronicIssues();
    return () => {
      isActive = false;
    };
  }, [currentWorkspace?.id]);

  return (
    <>
      <div className={styles["ai__header-section"]}>
        <div className={styles["ai__header-top"]}>
          <PageGreeting
            className={styles["ai__header-text"]}
            title="Ai Operations Center"
          />
          <AiBreadcrumb />
        </div>
        <div className={styles["ai__info"]}>
          {infoCards.length > 0 ? (
            infoCards.map((card) => (
              <div
                key={card.title}
                className={`${styles["ai__info-card"]} ${
                  card.accent ? styles["ai__info-card--accent"] : ""
                }`}
              >
                {card.icon ? (
                  <span className={styles["ai__info-icon"]}>
                    <card.icon aria-hidden="true" />
                  </span>
                ) : null}
                <div className={styles["ai__info-header"]}>
                  <span className={styles["ai__info-title"]}>
                    {card.title}
                  </span>
                </div>
                {card.hideValue ? null : (
                  <div className={styles["ai__info-value"]}>
                    {Array.isArray(card.value) ? (
                      <div className={styles["ai__info-value-list"]}>
                        {card.value.length > 0 ? (
                          card.value.map((line) => (
                            <div
                              key={line.currency}
                              className={styles["ai__info-value-line"]}
                            >
                              <span className={styles["ai__info-value-code"]}>
                                {line.currency}
                              </span>
                              <strong>{line.amount}</strong>
                            </div>
                          ))
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    ) : (
                      <>
                        {card.value}{" "}
                        {card.valueMeta ? <span>{card.valueMeta}</span> : null}
                      </>
                    )}
                  </div>
                )}
                {card.pill ? (
                  <span
                    className={`${styles["ai__info-pill"]} ${
                      card.pillVariant === "positive"
                        ? styles["ai__info-pill--positive"]
                        : card.pillVariant === "neutral"
                          ? styles["ai__info-pill--neutral"]
                          : ""
                    }`}
                  >
                    {card.pill}
                  </span>
                ) : null}
                {card.metrics ? (
                  <div
                    className={`${styles["ai__info-metrics"]} ${
                      card.metricsColumns === 2
                        ? styles["ai__info-metrics--two"]
                        : ""
                    } ${
                      card.metricsVariant === "ratio"
                        ? styles["ai__info-metrics--ratio"]
                        : ""
                    }`}
                  >
                    {card.metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className={styles["ai__info-metric"]}
                      >
                        {card.metricsVariant === "ratio" ? (
                          <>
                            <span className={styles["ai__info-metric-value"]}>
                              {metric.value}
                            </span>
                            <span className={styles["ai__info-metric-label"]}>
                              {metric.label}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className={styles["ai__info-metric-label"]}>
                              {metric.label}
                            </span>
                            <span className={styles["ai__info-metric-value"]}>
                              {metric.value}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
                {card.progress ? (
                  <div className={styles["ai__info-progress"]}>
                    <div className={styles["ai__info-progress-track"]}>
                      <div
                        className={styles["ai__info-progress-fill"]}
                        style={{ width: `${card.progress.value}%` }}
                      />
                    </div>
                    <span className={styles["ai__info-progress-label"]}>
                      {card.progress.label}{" "}
                      <strong>{card.progress.split}</strong>
                    </span>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <EmptyLook label="AI insights" />
          )}
        </div>
        <div className={styles["ai__layout"]}>
          <div className={styles["ai__layout-col"]}>
            <AiPriorities items={priorityItems} />
            <AiRisks
              items={financialRiskItems}
              onResolve={handleResolveFinancialRisk}
            />
          </div>
          <div className={styles["ai__layout-col"]}>
            <AiChronics issues={chronicIssues} properties={properties} />
            {/* <AiSuggestions items={suggestions} /> */}
          </div>
          <div className={styles["ai__layout-col"]}>
            <AiLiveTeam members={liveTeam} />
            <AiOverride properties={properties} />
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardAIPage;
