"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentSplitRule } from "@/types/api";
import styles from "@/styles/Options.module.scss";

interface SplitRuleFormData {
  name: string;
  description: string;
  commissionRate: number;
  isDefault: boolean;
  remainderCollectorParty: "cohost" | "home_owner";
  basisRemainderParty: "cohost" | "home_owner";
  cleaningFeeStrategy: "workspace" | "home_owner" | "split";
}

interface SplitRuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: PaymentSplitRule | null;
  onSubmit: (data: SplitRuleFormData) => Promise<void>;
  isSubmitting: boolean;
}

function extractCommissionRate(rule: PaymentSplitRule | null): number {
  if (!rule?.rules) return 20;
  const cohostPercent = rule.rules.find(
    (r) => r.rule_type === "percent" && r.party === "cohost"
  );
  if (cohostPercent?.percent) {
    return parseFloat(cohostPercent.percent);
  }
  return 20;
}

const SplitRuleFormDialog: React.FC<SplitRuleFormDialogProps> = ({
  open,
  onOpenChange,
  rule,
  onSubmit,
  isSubmitting,
}) => {
  const isEditing = !!rule;

  const [formData, setFormData] = useState<SplitRuleFormData>({
    name: "",
    description: "",
    commissionRate: 20,
    isDefault: false,
    remainderCollectorParty: "cohost",
    basisRemainderParty: "cohost",
    cleaningFeeStrategy: "workspace",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (rule) {
        setFormData({
          name: rule.name,
          description: rule.description || "",
          commissionRate: extractCommissionRate(rule),
          isDefault: rule.is_default,
          remainderCollectorParty: rule.remainder_collector_party,
          basisRemainderParty: rule.basis_remainder_party,
          cleaningFeeStrategy: rule.cleaning_fee_strategy || "workspace",
        });
      } else {
        setFormData({
          name: "",
          description: "",
          commissionRate: 20,
          isDefault: false,
          remainderCollectorParty: "cohost",
          basisRemainderParty: "cohost",
          cleaningFeeStrategy: "workspace",
        });
      }
      setError(null);
    }
  }, [open, rule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Name is required.");
      return;
    }

    if (formData.commissionRate < 0 || formData.commissionRate > 100) {
      setError("Commission rate must be between 0 and 100.");
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err?.message || "An error occurred.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Rule" : "Add Rule"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the payment split rule configuration."
              : "Create a new payment split rule for your workspace."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className={styles["payment-split-form-grid"]}>
            <div className={styles["payment-split-form-field"]}>
              <label htmlFor="rule-name">Name</label>
              <input
                id="rule-name"
                type="text"
                className={styles["payment-split-form-input"]}
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Standard Commission"
                required
              />
            </div>

            <div className={styles["payment-split-form-field"]}>
              <label htmlFor="rule-description">Description</label>
              <input
                id="rule-description"
                type="text"
                className={styles["payment-split-form-input"]}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Optional description"
              />
            </div>

            <div className={styles["payment-split-form-field"]}>
              <label htmlFor="rule-commission">Commission Rate %</label>
              <input
                id="rule-commission"
                type="number"
                className={styles["payment-split-form-input"]}
                value={formData.commissionRate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    commissionRate: parseFloat(e.target.value) || 0,
                  }))
                }
                min="0"
                max="100"
                step="0.01"
              />
            </div>

            <div className={styles["payment-split-form-row"]}>
              <div className={styles["payment-split-form-field"]}>
                <label htmlFor="rule-remainder">Remainder Collector</label>
                <select
                  id="rule-remainder"
                  className={styles["payment-split-form-input"]}
                  value={formData.remainderCollectorParty}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      remainderCollectorParty: e.target.value as
                        | "cohost"
                        | "home_owner",
                    }))
                  }
                >
                  <option value="cohost">Co-Host</option>
                  <option value="home_owner">Home Owner</option>
                </select>
              </div>

              <div className={styles["payment-split-form-field"]}>
                <label htmlFor="rule-basis">Basis Remainder</label>
                <select
                  id="rule-basis"
                  className={styles["payment-split-form-input"]}
                  value={formData.basisRemainderParty}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      basisRemainderParty: e.target.value as
                        | "cohost"
                        | "home_owner",
                    }))
                  }
                >
                  <option value="cohost">Co-Host</option>
                  <option value="home_owner">Home Owner</option>
                </select>
              </div>
            </div>

            <div className={styles["payment-split-form-field"]}>
              <label htmlFor="rule-cleaning-fee">Cleaning Fee</label>
              <select
                id="rule-cleaning-fee"
                className={styles["payment-split-form-input"]}
                value={formData.cleaningFeeStrategy}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    cleaningFeeStrategy: e.target.value as
                      | "workspace"
                      | "home_owner"
                      | "split",
                  }))
                }
              >
                <option value="workspace">Workspace</option>
                <option value="home_owner">Home Owner</option>
                <option value="split">Split by Commission</option>
              </select>
            </div>

            <div className={styles["payment-split-checkbox-field"]}>
              <Checkbox
                id="rule-default"
                checked={formData.isDefault}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    isDefault: checked === true,
                  }))
                }
              />
              <div>
                <label htmlFor="rule-default">Set as default rule</label>
                <p className={styles["payment-split-checkbox-note"]}>
                  Only one rule can be the default at a time.
                </p>
              </div>
            </div>

            {error && (
              <p className={styles["payment-split-form-error"]}>{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SplitRuleFormDialog;
export type { SplitRuleFormData };
