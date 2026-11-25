"use client";

import { useState } from "react";
import { LuDollarSign } from "react-icons/lu";
import EmptyLook from "@/components/ui/EmptyLook";
import styles from "@/styles/app/ai/AiRisks.module.scss";

export type AiRiskItem = {
  id: number;
  name: string;
  amount: string;
  progress: number;
  reason: string;
  status: string;
  conversation: number;
  property: { id: number; name: string } | null;
  riskType: string;
  source: string;
  riskScore: number;
  evidence: string;
  percentage: number | null;
  currency: string | null;
  isCommitted: boolean;
  isReasonable: boolean | null;
  justificationStrength: string | null;
  recommendation: string | null;
  exposureLevel: string;
  createdAt: string;
};

type AiRisksProps = {
  items: AiRiskItem[];
  onResolve: (riskId: number) => Promise<{ success: boolean; message: string }>;
};

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null;
}) => (
  <div className={styles["ai__risk-detail-row"]}>
    <span>{label}</span>
    <span className={styles["ai__risk-detail-value"]}>
      {value === null || value === "" ? "—" : String(value)}
    </span>
  </div>
);

const formatLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const AiRisks = ({ items, onResolve }: AiRisksProps) => {
  const [selectedRisk, setSelectedRisk] = useState<AiRiskItem | null>(null);
  const [resolveMessage, setResolveMessage] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = async () => {
    if (!selectedRisk) return;

    setResolveMessage(null);
    setIsResolving(true);
    const result = await onResolve(selectedRisk.id);
    setIsResolving(false);
    setResolveMessage(result.message);

    if (result.success) {
      window.setTimeout(() => {
        setSelectedRisk(null);
        setResolveMessage(null);
      }, 1200);
    }
  };

  return (
    <div className={styles["ai__risks"]}>
      <div className={styles["ai__risks-header"]}>
        <span className={styles["ai__section-icon"]}>
          <LuDollarSign aria-hidden="true" />
        </span>
        <span className={styles["ai__risks-title"]}>At Financial Risk</span>
      </div>
      <div className={styles["ai__risks-grid"]}>
        {items.length > 0 ? (
          items.map((risk) => (
            <div key={risk.id} className={styles["ai__risk-card"]}>
              <div className={styles["ai__risk-top"]}>
                <span className={styles["ai__risk-name"]}>{risk.name}</span>
                <span className={styles["ai__risk-amount"]}>{risk.amount}</span>
              </div>
              <div className={styles["ai__risk-bar"]}>
                <div
                  className={styles["ai__risk-barFill"]}
                  style={{ width: `${risk.progress}%` }}
                />
              </div>
              <div className={styles["ai__risk-reason"]}>{risk.reason}</div>
              <div className={styles["ai__risk-footer"]}>
                <span className={styles["ai__risk-status"]}>{risk.status}</span>
                <button
                  type="button"
                  className={styles["ai__risk-action"]}
                  onClick={() => {
                    setSelectedRisk(risk);
                    setResolveMessage(null);
                  }}
                >
                  Intervene
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyLook label="risk signals" />
        )}
      </div>

      {selectedRisk ? (
        <div
          className={styles["ai__risk-modal-overlay"]}
          role="dialog"
          aria-modal="true"
          aria-label="Financial risk details"
          onClick={() => {
            if (!isResolving) setSelectedRisk(null);
          }}
        >
          <div
            className={styles["ai__risk-modal"]}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles["ai__risk-modal-header"]}>
              <div>
                <h3>Financial Risk</h3>
              </div>
              <button
                type="button"
                className={styles["ai__risk-modal-close"]}
                onClick={() => setSelectedRisk(null)}
                disabled={isResolving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles["ai__risk-modal-summary"]}>
              <span className={styles["ai__risk-modal-amount"]}>
                {selectedRisk.amount}
              </span>
              <span>{selectedRisk.exposureLevel} exposure</span>
            </div>

            <div className={styles["ai__risk-detail-grid"]}>
              <DetailRow
                label="Property"
                value={selectedRisk.property?.name ?? selectedRisk.name}
              />
              <DetailRow label="Risk Type" value={formatLabel(selectedRisk.riskType)} />
              <DetailRow label="Source" value={formatLabel(selectedRisk.source)} />
              <DetailRow label="Risk Score" value={`${Math.round(selectedRisk.riskScore * 100)}%`} />
              <DetailRow label="Conversation" value={selectedRisk.conversation} />
              <DetailRow label="Committed" value={selectedRisk.isCommitted ? "Yes" : "No"} />
              <DetailRow
                label="Reasonable"
                value={
                  selectedRisk.isReasonable === null
                    ? null
                    : selectedRisk.isReasonable
                      ? "Yes"
                      : "No"
                }
              />
              <DetailRow
                label="Justification"
                value={
                  selectedRisk.justificationStrength
                    ? formatLabel(selectedRisk.justificationStrength)
                    : null
                }
              />
            </div>

            <div className={styles["ai__risk-modal-section"]}>
              <span>Evidence</span>
              <p className={styles["ai__risk-modal-evidence"]}>
                {selectedRisk.evidence}
              </p>
            </div>

            <div className={styles["ai__risk-modal-section"]}>
              <span>Recommendation</span>
              <p>{selectedRisk.recommendation || "No recommendation provided."}</p>
            </div>

            {resolveMessage ? (
              <p
                className={`${styles["ai__risk-resolve-message"]} ${
                  resolveMessage.toLowerCase().includes("failed")
                    ? styles["ai__risk-resolve-message--error"]
                    : ""
                }`}
              >
                {resolveMessage}
              </p>
            ) : null}

            <div className={styles["ai__risk-modal-actions"]}>
              <button
                type="button"
                className={styles["ai__risk-modal-cancel"]}
                onClick={() => setSelectedRisk(null)}
                disabled={isResolving}
              >
                Close
              </button>
              <button
                type="button"
                className={styles["ai__risk-modal-resolve"]}
                onClick={handleResolve}
                disabled={isResolving}
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

export default AiRisks;
