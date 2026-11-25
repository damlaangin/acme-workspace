"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import EmptyLook from "@/components/ui/EmptyLook";
import styles from "@/styles/app/dashboard/HomeDemographicsSection.module.scss";

export type HomeDemographicsEntry = {
  name: string;
  value: number;
  color: string;
};

type HomeDemographicsSectionProps = {
  series: HomeDemographicsEntry[];
  totalLabel?: string;
  totalValue?: string;
};

const HomeDemographicsSection = ({
  series,
  totalLabel = "INTL.",
  totalValue = "0%",
}: HomeDemographicsSectionProps) => {
  return (
    <section className={styles["home__demographics-section"]}>
      <div className={styles["home__demographics-header"]}>
        <h2>Demographics</h2>
        <p>Guest distribution by country</p>
      </div>

      {series.length > 0 ? (
        <>
          <div className={styles["home__demographics-chart"]}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={series}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="70%"
                  outerRadius="90%"
                  cornerRadius="50%"
                  paddingAngle={5}
                  stroke="var(--dash-background)"
                  strokeWidth={2}
                  startAngle={90}
                  endAngle={-270}
                >
                  {series.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className={styles["home__demographics-center"]}>
              <span className={styles["home__demographics-percent"]}>
                {totalValue}
              </span>
              <span className={styles["home__demographics-label"]}>
                {totalLabel}
              </span>
            </div>
          </div>

          <div className={styles["home__demographics-list"]}>
            {series.map((item) => (
              <div key={item.name} className={styles["home__demographics-row"]}>
                <span className={styles["home__demographics-name"]}>
                  {item.name}
                </span>
                <div className={styles["home__demographics-bar"]}>
                  <span
                    className={styles["home__demographics-fill"]}
                    style={{
                      background: item.color,
                      width: `${item.value}%`,
                    }}
                  />
                </div>
                <span className={styles["home__demographics-value"]}>
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyLook label="demographics" />
      )}
    </section>
  );
};

export default HomeDemographicsSection;
