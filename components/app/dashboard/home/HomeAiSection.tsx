"use client";

import { FaExclamationCircle } from "react-icons/fa";
import { LuBot, LuClock2 } from "react-icons/lu";
import EmptyLook from "@/components/ui/EmptyLook";
import styles from "@/styles/app/dashboard/HomeAiSection.module.scss";

export type HomeAiAttentionItem = {
  title: string;
  time: string;
  tone: "warning" | "danger";
};

export type HomeAiFlaggedProperty = {
  id: number;
  name: string;
  reason: string;
  flags: number | string;
};

type HomeAiSectionProps = {
  attentionItems: HomeAiAttentionItem[];
  flaggedProperties: HomeAiFlaggedProperty[];
  onViewAll?: () => void;
};

const getAttentionStatusClassName = (tone: HomeAiAttentionItem["tone"]) =>
  `${styles["home__ai-status"]} ${
    tone === "warning"
      ? styles["home__ai-status--warning"]
      : styles["home__ai-status--danger"]
  }`;

const HomeAiSection = ({
  attentionItems,
  flaggedProperties,
  onViewAll,
}: HomeAiSectionProps) => {
  return (
    <section className={styles["home__ai-section"]}>
      <div className={styles["home__ai-header"]}>
        <div className={styles["home__ai-title"]}>
          <div className={`${styles["home__icon"]} ${styles["home__ai-icon"]}`}>
            <LuBot />
          </div>
          <div className={styles["home__ai-title-group"]}>
            <h2>AI Intelligence</h2>
            <p>Real-time analysis &amp; alerts</p>
          </div>
        </div>
        <button
          className={styles["home__ai-link"]}
          type="button"
          onClick={onViewAll}
        >
          View All Insights
        </button>
      </div>

      <div className={styles["home__ai-grid"]}>
        <div className={styles["home__ai-column"]}>
          <h3>Requires Attention</h3>
          <div className={styles["home__ai-list"]}>
            {attentionItems.length > 0 ? (
              attentionItems.map((item) => (
                <div key={item.title} className={styles["home__ai-card"]}>
                  <span className={getAttentionStatusClassName(item.tone)}>
                    <FaExclamationCircle />
                  </span>
                  <div className={styles["home__ai-cardContent"]}>
                    <p className={styles["home__ai-cardTitle"]}>{item.title}</p>
                    <span className={styles["home__ai-time"]}>
                      <LuClock2 />
                      {item.time}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyLook label="AI alerts" />
            )}
          </div>
        </div>

        <div className={styles["home__ai-column"]}>
          <h3>Flagged Properties</h3>
          <div
            className={`${styles["home__ai-list"]} ${styles["home__ai-list--spread"]}`}
          >
            {flaggedProperties.length > 0 ? (
              flaggedProperties.map((item) => (
                <div key={item.id} className={styles["home__ai-card"]}>
                  <div className={styles["home__ai-flagContent"]}>
                    <p className={styles["home__ai-cardTitle"]}>{item.name}</p>
                    <span className={styles["home__ai-flagReason"]}>
                      {item.reason}
                    </span>
                  </div>
                  <div className={styles["home__ai-flagCount"]}>
                    <strong>{item.flags}</strong>
                    <span>Flags</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyLook label="flagged properties" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeAiSection;
