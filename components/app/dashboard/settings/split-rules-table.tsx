"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DeleteDialog from "@/components/ui/delete-dialog";
import SplitRuleFormDialog, {
  SplitRuleFormData,
} from "./split-rule-form-dialog";
import { PaymentSplitRule } from "@/types/api";
import { paymentSplitRulesService } from "@/lib/services/payment-split-rules.service";
import { useWorkspace } from "@/context/workspace-context";
import styles from "@/styles/Options.module.scss";
import TableFooter from "@/components/app/dashboard/table-footer";

function getCommissionPercent(rule: PaymentSplitRule): string {
  const cohostPercent = rule.rules?.find(
    (r) => r.rule_type === "percent" && r.party === "cohost"
  );
  if (cohostPercent?.percent) {
    return `${parseFloat(cohostPercent.percent)}%`;
  }
  return "-";
}

function getCleaningFeeStrategyLabel(rule: PaymentSplitRule): string {
  switch (rule.cleaning_fee_strategy) {
    case "workspace":
      return "Workspace";
    case "home_owner":
      return "Home Owner";
    case "split":
      return "Split by Commission";
    default:
      return "-";
  }
}

function buildRulePayload(data: SplitRuleFormData) {
  return {
    name: data.name,
    description: data.description,
    is_default: data.isDefault,
    is_active: true,
    remainder_collector_party: data.remainderCollectorParty,
    basis_remainder_party: data.basisRemainderParty,
    cleaning_fee_strategy: data.cleaningFeeStrategy,
    rules: [
      {
        rule_type: "percent" as const,
        party: "cohost" as const,
        priority: 10,
        percent: String(data.commissionRate),
        include_tags: ["net_payout"],
      },
    ],
  };
}

const SplitRulesTable: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const [rules, setRules] = useState<PaymentSplitRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PaymentSplitRule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<PaymentSplitRule | null>(
    null
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Success message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search + pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowLimit, setRowLimit] = useState(8);

  const fetchRules = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    const response = await paymentSplitRulesService.getAll(workspaceId);
    if (response.success && response.data) {
      setRules(response.data.results);
    } else {
      setError(response.error?.message || "Failed to load rules.");
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setFormOpen(true);
  };

  const handleEdit = (rule: PaymentSplitRule) => {
    setEditingRule(rule);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: SplitRuleFormData) => {
    if (!workspaceId) return;
    setIsSubmitting(true);
    const payload = buildRulePayload(data);

    let response;
    if (editingRule) {
      response = await paymentSplitRulesService.update(
        workspaceId,
        editingRule.id,
        payload
      );
    } else {
      response = await paymentSplitRulesService.create(workspaceId, payload);
    }

    setIsSubmitting(false);

    if (response.success) {
      setFormOpen(false);
      showSuccess(editingRule ? "Rule updated." : "Rule created.");
      await fetchRules();
    } else {
      throw new Error(response.error?.message || "Failed to save rule.");
    }
  };

  const handleDuplicate = async (rule: PaymentSplitRule) => {
    if (!workspaceId) return;
    const response = await paymentSplitRulesService.duplicate(
      workspaceId,
      rule.id
    );
    if (response.success) {
      showSuccess("Rule duplicated.");
      await fetchRules();
    } else {
      setError(response.error?.message || "Failed to duplicate rule.");
    }
  };

  const handleSetDefault = async (rule: PaymentSplitRule) => {
    if (!workspaceId) return;
    const response = await paymentSplitRulesService.update(
      workspaceId,
      rule.id,
      { is_default: true }
    );
    if (response.success) {
      showSuccess("Default rule updated.");
      await fetchRules();
    } else {
      setError(response.error?.message || "Failed to set default.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!workspaceId || !deleteTarget) return;
    setDeleteError(null);
    const response = await paymentSplitRulesService.delete(
      workspaceId,
      deleteTarget.id
    );
    if (response.success) {
      setDeleteTarget(null);
      showSuccess("Rule deleted.");
      await fetchRules();
    } else {
      setDeleteError(response.error?.message || "Failed to delete rule.");
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredRules = useMemo(() => {
    if (!normalizedSearch) return rules;
    return rules.filter((rule) => {
      const name = rule.name?.toLowerCase() ?? "";
      const description = rule.description?.toLowerCase() ?? "";
      return name.includes(normalizedSearch) || description.includes(normalizedSearch);
    });
  }, [rules, normalizedSearch]);

  const totalRows = filteredRules.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowLimit));
  const safePage = Math.min(currentPage, totalPages);

  const pagedRules = useMemo(() => {
    const startIndex = (safePage - 1) * rowLimit;
    return filteredRules.slice(startIndex, startIndex + rowLimit);
  }, [filteredRules, rowLimit, safePage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const handleRowLimitChange = (limit: number) => {
    setRowLimit(limit);
    setCurrentPage(1);
  };

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const prevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  if (!workspaceId) {
    return <div className={styles["payment-split-empty"]}>No workspace selected.</div>;
  }

  return (
    <>
      <div className={styles["payment-split-card"]}>
        <div className={styles["payment-split-card-header"]}>
          <h2>Payment Split Rules</h2>
          <div className={styles["payment-split-header-actions"]}>
            <Input
              type="search"
              placeholder="Search rules"
              className={styles["payment-split-search-input"]}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Button onClick={handleCreate}>Add Rule</Button>
          </div>
        </div>

        {successMessage && (
          <p className={styles["payment-split-form-success"]}>{successMessage}</p>
        )}
        {error && <p className={styles["payment-split-form-error"]}>{error}</p>}

        {loading ? (
          <div className={styles["payment-split-empty"]}>Loading...</div>
        ) : rules.length === 0 ? (
          <div className={styles["payment-split-empty"]}>
            No payment split rules found. Create one to get started.
          </div>
        ) : filteredRules.length === 0 ? (
          <div className={styles["payment-split-empty"]}>
            No rules match your search.
          </div>
        ) : (
          <>
            <div className={styles["payment-split-table-wrapper"]}>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Commission %</TableHead>
                  <TableHead>Cleaning Fee</TableHead>
                  <TableHead>Properties</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <span className={styles["payment-split-name"]}>
                        {rule.name}
                        {rule.is_default && (
                          <span className={styles["payment-split-default-badge"]}>
                            Default
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{getCommissionPercent(rule)}</TableCell>
                    <TableCell>{getCleaningFeeStrategyLabel(rule)}</TableCell>
                    <TableCell>{rule.property_count}</TableCell>
                    <TableCell>
                      <div className={styles["payment-split-actions"]}>
                        <button
                          type="button"
                          className={styles["payment-split-action-btn"]}
                          onClick={() => handleEdit(rule)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles["payment-split-action-btn"]}
                          onClick={() => handleDuplicate(rule)}
                        >
                          Duplicate
                        </button>
                        {!rule.is_default && (
                          <button
                            type="button"
                            className={`${styles["payment-split-action-btn"]} ${styles["payment-split-action-btn--primary"]}`}
                            onClick={() => handleSetDefault(rule)}
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          type="button"
                          className={`${styles["payment-split-action-btn"]} ${styles["payment-split-action-btn--destructive"]}`}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(rule);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>

            <div className={styles["payment-split-mobile-cards"]}>
              {pagedRules.map((rule) => (
                <article
                  key={`mobile-${rule.id}`}
                  className={styles["payment-split-mobile-card"]}
                >
                  <div className={styles["payment-split-mobile-header"]}>
                    <span className={styles["payment-split-name"]}>
                      {rule.name}
                      {rule.is_default && (
                        <span className={styles["payment-split-default-badge"]}>
                          Default
                        </span>
                      )}
                    </span>
                  </div>
                  <div className={styles["payment-split-mobile-grid"]}>
                    <div className={styles["payment-split-mobile-item"]}>
                      <span className={styles["payment-split-mobile-label"]}>
                        Commission %
                      </span>
                      <span className={styles["payment-split-mobile-value"]}>
                        {getCommissionPercent(rule)}
                      </span>
                    </div>
                    <div className={styles["payment-split-mobile-item"]}>
                      <span className={styles["payment-split-mobile-label"]}>
                        Cleaning Fee
                      </span>
                      <span className={styles["payment-split-mobile-value"]}>
                        {getCleaningFeeStrategyLabel(rule)}
                      </span>
                    </div>
                    <div className={styles["payment-split-mobile-item"]}>
                      <span className={styles["payment-split-mobile-label"]}>
                        Properties
                      </span>
                      <span className={styles["payment-split-mobile-value"]}>
                        {rule.property_count}
                      </span>
                    </div>
                  </div>
                  <div className={styles["payment-split-actions"]}>
                    <button
                      type="button"
                      className={styles["payment-split-action-btn"]}
                      onClick={() => handleEdit(rule)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles["payment-split-action-btn"]}
                      onClick={() => handleDuplicate(rule)}
                    >
                      Duplicate
                    </button>
                    {!rule.is_default && (
                      <button
                        type="button"
                        className={`${styles["payment-split-action-btn"]} ${styles["payment-split-action-btn--primary"]}`}
                        onClick={() => handleSetDefault(rule)}
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      type="button"
                      className={`${styles["payment-split-action-btn"]} ${styles["payment-split-action-btn--destructive"]}`}
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(rule);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {totalRows > 0 && (
              <TableFooter
                currentPageSize={rowLimit}
                totalRows={totalRows}
                changeRowLimit={handleRowLimitChange}
                nextPage={nextPage}
                prevPage={prevPage}
                page={safePage}
                onPageSelect={(page) => setCurrentPage(page)}
              />
            )}
          </>
        )}
      </div>

      <SplitRuleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        rule={editingRule}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {deleteTarget && (
        <DeleteDialog
          title="Delete Rule"
          message={
            deleteError ||
            `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
          }
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          onConfirm={deleteError ? undefined : handleDeleteConfirm}
          confirmOnly={!!deleteError}
        />
      )}
    </>
  );
};

export default SplitRulesTable;
