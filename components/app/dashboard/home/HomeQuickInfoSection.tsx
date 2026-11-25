"use client";

import type { ReactNode } from "react";
import { LuArrowDownToDot, LuArrowUpFromDot, LuDot } from "react-icons/lu";
import styles from "@/styles/app/dashboard/HomeQuickInfoSection.module.scss";

export type HomeQuickInfoTrend = "up" | "down" | "stable";

export type HomeQuickInfoValueLine = {
  label?: string;
  value: string;
  trend?: HomeQuickInfoTrend;
};

export type HomeQuickInfoItem = {
  label: string;
  value: string | HomeQuickInfoValueLine[];
  trend: HomeQuickInfoTrend;
  highlight?: boolean;
  inlineMeta?: boolean;
  isOccupancy?: boolean;
};

type HomeQuickInfoSectionProps = {
  items: HomeQuickInfoItem[];
};

const classNames = (...names: Array<string | false | undefined>) =>
  names.filter(Boolean).join(" ");

const getTrendIcon = (trend: HomeQuickInfoTrend) => {
  if (trend === "down") return <LuArrowDownToDot aria-hidden="true" />;
  if (trend === "up") return <LuArrowUpFromDot aria-hidden="true" />;
  return <LuDot aria-hidden="true" />;
};

const getTrendClassName = (trend: HomeQuickInfoTrend) =>
  classNames(
    styles.homeQuickInfoTrendIcon,
    trend === "down" && styles.homeQuickInfoPillDown,
    trend === "up" && styles.homeQuickInfoPillUp,
    trend === "stable" && styles.homeQuickInfoPillStable
  );

const TrendPill = ({ trend }: { trend: HomeQuickInfoTrend }) => (
  <span className={getTrendClassName(trend)}>{getTrendIcon(trend)}</span>
);

const ValueList = ({ value }: { value: HomeQuickInfoValueLine[] }) => (
  <div
    className={classNames(
      styles.homeQuickInfoValue,
      styles.homeQuickInfoValueList
    )}
  >
    {value.map((line, index) => (
      <div
        key={`${line.label ?? "value"}-${index}`}
        className={styles.homeQuickInfoValueLine}
      >
        {line.label ? (
          <span className={styles.homeQuickInfoValueCode}>{line.label}</span>
        ) : null}
        <div className={styles.homeQuickInfoValueLineContent}>
          <span className={styles.homeQuickInfoValueAmount}>{line.value}</span>
          {line.trend ? <TrendPill trend={line.trend} /> : null}
        </div>
      </div>
    ))}
  </div>
);

const ValueRow = ({ item }: { item: HomeQuickInfoItem }) => (
  <div
    className={classNames(
      styles.homeQuickInfoValueRow,
      item.inlineMeta && styles.homeQuickInfoValueRowInline
    )}
  >
    <div className={styles.homeQuickInfoValue}>{item.value as ReactNode}</div>
    {item.inlineMeta ? <TrendPill trend={item.trend} /> : null}
  </div>
);

const HomeQuickInfoSection = ({ items }: HomeQuickInfoSectionProps) => {
  if (items.length === 0) return null;

  return (
    <div className={styles.homeQuickInfo}>
      {items.map((item) => (
        <div
          key={item.label}
          className={classNames(
            styles.homeQuickInfoCard,
            item.highlight && styles.homeQuickInfoCardActive,
            item.isOccupancy && styles.homeQuickInfoCardOccupancy
          )}
        >
          <span className={styles.homeQuickInfoLabel}>{item.label}</span>
          {Array.isArray(item.value) ? (
            <ValueList value={item.value} />
          ) : (
            <ValueRow item={item} />
          )}
          {Array.isArray(item.value) || item.inlineMeta ? null : (
            <div className={styles.homeQuickInfoMeta}>
              <TrendPill trend={item.trend} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default HomeQuickInfoSection;
