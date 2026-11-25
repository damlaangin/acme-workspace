"use client";

import { useMemo } from "react";
import EmptyLook from "@/components/ui/EmptyLook";
import styles from "@/styles/app/dashboard/HomePropertiesSection.module.scss";

export type HomePropertyItem = {
  name: string;
  revenue: string;
  adr: string;
  occupancy: string;
  image: string;
  occupancyValue?: number;
};

type HomePropertiesSectionProps = {
  items: HomePropertyItem[];
  filter: "top" | "needs";
  onFilterChange: (next: "top" | "needs") => void;
  onFullReport?: () => void;
};

const FILTER_OPTIONS: Array<{ label: string; value: "top" | "needs" }> = [
  { label: "Top Performers", value: "top" },
  { label: "Needs Improvement", value: "needs" },
];

const getDisplayItems = (
  items: HomePropertyItem[],
  filter: HomePropertiesSectionProps["filter"]
) => {
  const sortedItems = [...items].sort(
    (a, b) => (b.occupancyValue ?? 0) - (a.occupancyValue ?? 0)
  );

  return filter === "top"
    ? sortedItems.slice(0, 5)
    : sortedItems.slice(-5).reverse();
};

const HomePropertiesSection = ({
  items,
  filter,
  onFilterChange,
}: HomePropertiesSectionProps) => {
  const displayItems = useMemo(
    () => getDisplayItems(items, filter),
    [items, filter]
  );

  return (
    <section className={styles["home__properties-section"]}>
      <div className={styles["home__properties-header"]}>
        <div className={styles["home__properties-filters"]}>
          {FILTER_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`${styles["home__properties-filter"]} ${
                filter === item.value ? styles["home__properties-filter--active"] : ""
              }`}
              onClick={() => onFilterChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles["home__properties-table"]}>
        <table className={styles["home__properties-tableGrid"]}>
          <thead>
            <tr>
              <th className={styles["home__properties-imageHeader"]}>Image</th>
              <th>Property Details</th>
              <th>Monthly Revenue</th>
              <th>Occupancy</th>
              <th>ADR</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((item) => (
              <tr key={item.name}>
                <td className={styles["home__properties-imageCell"]}>
                  <div className={styles["home__properties-avatar"]}>
                    <img src={item.image} alt={item.name} />
                  </div>
                </td>
                <td>
                  <span className={styles["home__properties-name"]}>
                    {item.name}
                  </span>
                </td>
                <td>
                  <span className={styles["home__properties-revenue"]}>
                    {item.revenue}
                  </span>
                </td>
                <td>
                  <div className={styles["home__properties-occupancyGroup"]}>
                    <span className={styles["home__properties-occupancy"]}>
                      {item.occupancy}
                    </span>
                    {(item.occupancyValue ?? 0) > 1 && (
                      <span className={styles["home__properties-overload"]}>
                        Overload
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={styles["home__properties-adr"]}>
                    {item.adr}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyLook label="properties" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default HomePropertiesSection;
