"use client";

import React, { useMemo, useState } from "react";
import { LuWrench } from "react-icons/lu";
import EmptyLook from "@/components/ui/EmptyLook";
import styles from "@/styles/app/ai/AiChronics.module.scss";
import type { Property } from "@/types/api";
import type { ChronicIssue } from "@/lib/services/ai.service";
import { aiService } from "@/lib/services/ai.service";
import { useWorkspace } from "@/context/workspace-context";

type AiChronicsProps = {
  issues: ChronicIssue[];
  properties: Property[];
};

const AiChronics: React.FC<AiChronicsProps> = ({ issues, properties }) => {
  const { currentWorkspace } = useWorkspace();
  const [selectedIssue, setSelectedIssue] = useState<ChronicIssue | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const selectedProperty = useMemo(() => {
    if (!selectedIssue) return null;
    return properties.find((item) => item.id === selectedIssue.property) ?? null;
  }, [properties, selectedIssue]);

  const handleResolve = async () => {
    if (!selectedIssue || !currentWorkspace?.id || isResolving) return;
    setIsResolving(true);
    const result = await aiService.resolveChronicIssue(
      currentWorkspace.id,
      selectedIssue.id,
      { is_resolved: true }
    );
    setIsResolving(false);
    if (result.success) {
      setSelectedIssue(null);
    }
  };

  return (
    <div className={styles["ai__chronics"]}>
      <div className={styles["ai__chronics-header"]}>
        <span className={styles["ai__section-icon"]}>
          <LuWrench aria-hidden="true" />
        </span>
        <span className={styles["ai__chronics-title"]}>Chronic Issues</span>
      </div>
      <div className={styles["ai__chronics-grid"]}>
        {issues.length > 0 ? (
          issues.map((issue) => {
            const property = properties.find(
              (item) => item.id === issue.property
            );
            const image = property?.images?.[0]?.image;
            const propertyName =
              property?.name ?? `Property #${issue.property}`;
            const reportLabel = `${issue.report_count} report${
              issue.report_count === 1 ? "" : "s"
            }`;

            return (
              <button
                key={issue.id}
                type="button"
                className={styles["ai__chronic-card"]}
                onClick={() => setSelectedIssue(issue)}
              >
                <div className={styles["ai__chronic-info"]}>
                  <div className={styles["ai__chronic-name"]}>
                    {propertyName}
                  </div>
                  <div className={styles["ai__chronic-issue"]}>
                    {issue.issue}
                  </div>
                  <div className={styles["ai__chronic-category"]}>
                    {issue.issue_category}
                  </div>
                </div>
                <div className={styles["ai__chronic-meta"]}>
                  {image ? (
                    <img
                      src={image}
                      alt={propertyName}
                      className={styles["ai__chronic-image"]}
                    />
                  ) : (
                    <div
                      className={styles["ai__chronic-imageFallback"]}
                      aria-hidden="true"
                    >
                      {propertyName.slice(0, 1)}
                    </div>
                  )}
                  <span className={styles["ai__chronic-report"]}>
                    {reportLabel}
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <EmptyLook label="chronic issues" />
        )}
      </div>

      {selectedIssue ? (
        <div
          className={styles["ai__chronic-modalOverlay"]}
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedIssue(null)}
        >
          <div
            className={styles["ai__chronic-modalCard"]}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles["ai__chronic-modalHeader"]}>
              <div className={styles["ai__chronic-modalTitle"]}>
                Chronic Issue
              </div>
              <button
                type="button"
                className={styles["ai__chronic-modalClose"]}
                onClick={() => setSelectedIssue(null)}
                aria-label="Close chronic issue modal"
              >
                ×
              </button>
            </div>
            <div className={styles["ai__chronic-modalBody"]}>
              <div className={styles["ai__chronic-modalIssue"]}>
                {selectedIssue.issue}
              </div>
              <div className={styles["ai__chronic-modalMeta"]}>
                <span className={styles["ai__chronic-modalTag"]}>
                  {selectedIssue.issue_category}
                </span>
                <span className={styles["ai__chronic-modalProperty"]}>
                  {selectedProperty?.name ??
                    `Property #${selectedIssue.property}`}
                </span>
              </div>
            </div>
            <div className={styles["ai__chronic-modalFooter"]}>
              <button
                type="button"
                className={styles["ai__chronic-modalCancel"]}
                onClick={() => setSelectedIssue(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles["ai__chronic-modalResolve"]}
                onClick={handleResolve}
                disabled={isResolving || !currentWorkspace?.id}
              >
                {isResolving ? "Resolving..." : "Resolve"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AiChronics;
