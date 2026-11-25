"use client";

import React, { useState } from "react";
import {
  LuUsers,
  LuStar,
  LuMessageCircle,
  LuClock,
  LuZap,
  LuTarget,
  LuX,
} from "react-icons/lu";
import EmptyLook from "@/components/ui/EmptyLook";
import styles from "@/styles/app/ai/AiLiveTeam.module.scss";

export type AiLiveTeamMember = {
  name: string;
  email: string;
  role: string;
  hostTag: string;
  isTopHost: boolean;
  aiScore: number;
  load: string;
  loadVariant: "high" | "med" | "low";
  stats: {
    totalMessages: string;
    avgResponse: string;
    resolutionRate: string;
    satisfactionScore: string;
    bestSolver: string;
  };
  insight: string;
};

type AiLiveTeamProps = {
  members: AiLiveTeamMember[];
};

const AiLiveTeam: React.FC<AiLiveTeamProps> = ({ members }) => {
  const [selectedMember, setSelectedMember] =
    useState<AiLiveTeamMember | null>(null);

  return (
    <div className={styles["ai__liveTeam"]}>
      <div className={styles["ai__liveTeam-header"]}>
        <span className={styles["ai__section-icon"]}>
          <LuUsers aria-hidden="true" />
        </span>
        <span className={styles["ai__liveTeam-title"]}>Live Team Status</span>
      </div>
      <div className={styles["ai__liveTeam-card"]}>
        <div className={styles["ai__liveTeam-list"]}>
          {members.length > 0 ? (
            members.map((member, index) => (
              <button
                key={member.name}
                type="button"
                className={`${styles["ai__liveTeam-row"]} ${
                  index === members.length - 1
                    ? styles["ai__liveTeam-row--last"]
                    : ""
                }`}
                onClick={() => setSelectedMember(member)}
              >
                <div className={styles["ai__liveTeam-identity"]}>
                  <div>
                    <div className={styles["ai__liveTeam-name"]}>
                      {member.name}
                    </div>
                    <div className={styles["ai__liveTeam-role"]}>
                      {member.role}
                    </div>
                  </div>
                </div>
                <div className={styles["ai__liveTeam-meta"]}>
                  <span
                    className={`${styles["ai__liveTeam-load"]} ${
                      member.loadVariant === "high"
                        ? styles["ai__liveTeam-load--high"]
                        : member.loadVariant === "med"
                          ? styles["ai__liveTeam-load--med"]
                          : styles["ai__liveTeam-load--low"]
                    }`}
                  >
                    {member.load}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <EmptyLook label="live team status" />
          )}
        </div>
      </div>

      {selectedMember ? (
        <div
          className={styles["ai__modal-overlay"]}
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedMember(null)}
        >
          <div
            className={styles["ai__modal-card"]}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles["ai__modal-header"]}>
              <div className={styles["ai__modal-identity"]}>
                <div>
                  <div className={styles["ai__modal-name"]}>
                    {selectedMember.name}
                  </div>
                  <div className={styles["ai__modal-email"]}>
                    {selectedMember.email}
                  </div>
                </div>
              </div>
              <div className={styles["ai__modal-actions"]}>
                <span className={styles["ai__modal-tag"]}>
                  {selectedMember.hostTag}
                </span>
                <button
                  type="button"
                  className={styles["ai__modal-close"]}
                  onClick={() => setSelectedMember(null)}
                  aria-label="Close host details"
                >
                  <LuX />
                </button>
              </div>
            </div>

            <div className={styles["ai__modal-metrics"]}>
              <div className={styles["ai__modal-metricRow"]}>
                <span className={styles["ai__modal-metricIcon"]}>
                  <LuMessageCircle />
                </span>
                <span className={styles["ai__modal-metricLabel"]}>
                  Total Messages
                </span>
                <span className={styles["ai__modal-metricValue"]}>
                  {selectedMember.stats.totalMessages}
                </span>
              </div>
              <div className={styles["ai__modal-metricRow"]}>
                <span className={styles["ai__modal-metricIcon"]}>
                  <LuClock />
                </span>
                <span className={styles["ai__modal-metricLabel"]}>
                  Avg. Response Time
                </span>
                <span className={styles["ai__modal-metricValue"]}>
                  {selectedMember.stats.avgResponse}
                </span>
              </div>
              <div className={styles["ai__modal-metricRow"]}>
                <span className={styles["ai__modal-metricIcon"]}>
                  <LuZap />
                </span>
                <span className={styles["ai__modal-metricLabel"]}>
                  Resolution Rate
                </span>
                <span className={styles["ai__modal-metricValue"]}>
                  {selectedMember.stats.resolutionRate}
                </span>
              </div>
              <div className={styles["ai__modal-metricRow"]}>
                <span className={styles["ai__modal-metricIcon"]}>
                  <LuStar />
                </span>
                <span className={styles["ai__modal-metricLabel"]}>
                  Satisfaction Score
                </span>
                <span className={styles["ai__modal-metricValue"]}>
                  {selectedMember.stats.satisfactionScore}
                </span>
              </div>
              {/* <div
                className={`${styles["ai__modal-metricRow"]} ${styles["ai__modal-metricRow--highlight"]}`}
              >
                <span className={styles["ai__modal-metricIcon"]}>
                  <LuTarget />
                </span>
                <span className={styles["ai__modal-metricLabel"]}>
                  Best Problem Solver
                </span>
                <span className={styles["ai__modal-metricValue"]}>
                  {selectedMember.stats.bestSolver}
                </span>
              </div> */}
            </div>

            <div className={styles["ai__modal-insight"]}>
              <p className={styles["ai__modal-insightLabel"]}>Key Insight</p>
              <p className={styles["ai__modal-insightText"]}>
                {selectedMember.insight}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AiLiveTeam;
