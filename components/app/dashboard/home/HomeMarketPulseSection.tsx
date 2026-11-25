"use client";

import { LuTrendingUp, LuZap } from "react-icons/lu";
import EmptyLook from "@/components/ui/EmptyLook";
import styles from "@/styles/app/dashboard/HomeMarketPulseSection.module.scss";

export type HomeMarketPulseChannel = {
  name: string;
  value: number;
  color: string;
};

type HomeMarketPulseSectionProps = {
  channels: HomeMarketPulseChannel[];
  pacingPercent?: number;
  targetPercent?: number;
  note?: string;
};

const clampPercent = (value: number) => Math.min(Math.max(value, 0), 100);

const HomeMarketPulseSection = ({
  channels,
  pacingPercent = 65,
}: HomeMarketPulseSectionProps) => {
  const pacingWidth = clampPercent(pacingPercent);

  return (
    <section className={styles["home__marketPulse-section"]}>
      <div className={styles["home__marketPulse-header"]}>
        <div className={styles["home__marketPulse-header-group"]}>
          <h2>Market Pulse</h2>
          <p>Pacing &amp; Channel Forecast</p>
        </div>
        <div
          className={`${styles["home__icon"]} ${styles["home__marketPulse-icon"]}`}
        >
          <LuTrendingUp />
        </div>
      </div>

      <div className={styles["home__marketPulse-block"]}>
        <div className={styles["home__marketPulse-row"]}>
          <span>Next Month Pacing</span>
        </div>
        <div className={styles["home__marketPulse-progress"]}>
          <div>
            <LuZap />
            <span>{pacingPercent}% Booked</span>
          </div>
        </div>
        <div className={styles["home__marketPulse-bar"]}>
          <span style={{ width: `${pacingWidth}%` }} />
        </div>
      </div>

      <div className={styles["home__marketPulse-block"]}>
        <span className={styles["home__marketPulse-subtitle"]}>
          Channel Distribution
        </span>
        {channels.length > 0 ? (
          channels.map((item) => (
            <div key={item.name} className={styles["home__marketPulse-channel"]}>
              <div>
                <span
                  className={styles["home__marketPulse-dot"]}
                  style={{ background: item.color }}
                />
                <span className={styles["home__marketPulse-channelName"]}>
                  {item.name}
                </span>
              </div>
              <span className={styles["home__marketPulse-channelValue"]}>
                {item.value}%
              </span>
              <div className={styles["home__marketPulse-channelBar"]}>
                <span
                  style={{
                    width: `${clampPercent(item.value)}%`,
                    background: item.color,
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <EmptyLook label="channel distribution" />
        )}
      </div>
    </section>
  );
};

export default HomeMarketPulseSection;
