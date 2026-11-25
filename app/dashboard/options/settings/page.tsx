"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "@/styles/Options.module.scss";
import PageGreeting from "@/components/ui/PageGreeting";
import SplitRulesTable from "@/components/app/dashboard/settings/split-rules-table";
import { useWorkspace } from "@/context/workspace-context";
import { workspaceService } from "@/lib/services/workspace.service";
import { validatePassword } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const PROPERTY_FIELDS = [
  { key: "cleaning_payment_fee", label: "Cleaning Payment Fee" },
  { key: "commission_rate", label: "Commission Rate" },
] as const;

const PAYMENT_FIELDS = [
  { key: "net_payout", label: "Net Payout" },
  { key: "cleaning_fee", label: "Cleaning Fee" },
  { key: "nightly_fee", label: "Nightly Fee" },
  { key: "total_room_fee", label: "Total Room Fee" },
  { key: "guest_service_fee", label: "Guest Service Fee" },
  { key: "night_rate_adjustment", label: "Night Rate Adjustment" },
  { key: "host_service_fee", label: "Airbnb Service Fee" },
  { key: "co_host_payout", label: "Co-Host Payout" },
  { key: "workspace_earning", label: "Workspace Earning" },
] as const;

const SettingsPage: React.FC = () => {
  const { currentWorkspace, setCurrentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<"permissions" | "payment-rules">(
    "permissions"
  );

  const [hiddenProperty, setHiddenProperty] = useState<Set<string>>(new Set());
  const [hiddenPayment, setHiddenPayment] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const saveToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  useEffect(() => {
    if (!currentWorkspace) return;
    const fields = currentWorkspace.owner_hidden_fields;
    setHiddenProperty(new Set(fields?.property || []));
    setHiddenPayment(new Set(fields?.payment || []));
  }, [currentWorkspace?.id]);

  useEffect(() => {
    return () => {
      if (saveToastTimeoutRef.current) {
        clearTimeout(saveToastTimeoutRef.current);
      }
    };
  }, []);

  const showSaveToast = (type: "success" | "error", message: string) => {
    setSaveStatus({ type, message });
    if (saveToastTimeoutRef.current) {
      clearTimeout(saveToastTimeoutRef.current);
    }
    saveToastTimeoutRef.current = setTimeout(() => {
      setSaveStatus(null);
    }, 4000);
  };

  const toggleHiddenField = (field: string, group: "property" | "payment") => {
    const setter = group === "property" ? setHiddenProperty : setHiddenPayment;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const handleSaveChanges = async () => {
    if (!currentWorkspace?.id) {
      console.warn("Settings save blocked: no workspace selected.");
      showSaveToast("error", "No workspace selected.");
      return;
    }

    const formData = new FormData();
    formData.append(
      "owner_hidden_fields",
      JSON.stringify({
        property: Array.from(hiddenProperty),
        payment: Array.from(hiddenPayment),
      })
    );

    const result = await workspaceService.patchWorkspaceFormData(
      currentWorkspace.id,
      formData
    );

    if (!result.success) {
      console.error(
        "Settings save failed:",
        result.error?.message || "Unknown error"
      );
      showSaveToast("error", result.error?.message || "Save failed. Please try again.");
      return;
    }

    console.log("Settings save success", result.data);
    if (result.data) {
      setCurrentWorkspace({ ...currentWorkspace, ...result.data });
    }
    showSaveToast("success", "Settings saved successfully.");
  };

  return (
    <div className={styles["profile-page"]}>
      <div className={styles["profile-page-header"]}>
        <PageGreeting
          className={styles["profile-page-header-text"]}
          showGreetingTitle
          animateGreetingTitle
          greetingClassName={styles["profile-page-header-greeting"]}
          titleClassName={styles["profile-page-header-title"]}
          subtitleClassName={styles["profile-page-header-subtitle"]}
          title="WORKSPACE SETTINGS"
          subtitle="Manage permissions and payment rules for your workspace."
        />
      </div>

      <div className={styles["profile-tabs-row"]}>
        <div className={styles["profile-tabs"]} role="tablist">
          {[
            { id: "permissions", label: "Permissions" },
            { id: "payment-rules", label: "Payment Rules" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`profile-tab-${tab.id}-button`}
              aria-controls={`profile-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              className={`${styles["profile-tab"]} ${
                activeTab === tab.id ? styles["profile-tab--active"] : ""
              }`}
              onClick={() =>
                setActiveTab(
                  tab.id as "permissions" | "payment-rules"
                )
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className={styles["save-btn"]} onClick={handleSaveChanges}>
          Save Changes
        </button>
      </div>
      {saveStatus && (
        <div
          className={`${styles["save-toast"]} ${
            saveStatus.type === "success"
              ? styles["save-toast--success"]
              : styles["save-toast--error"]
          }`}
          role="status"
          aria-live="polite"
        >
          <span>{saveStatus.message}</span>
          <button
            type="button"
            className={styles["save-toast__close"]}
            onClick={() => setSaveStatus(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <div className={styles["profile-tab-panels"]}>
        {activeTab === "permissions" && (
          <div
            id="profile-tab-permissions"
            role="tabpanel"
            aria-labelledby="profile-tab-permissions-button"
            className={styles["profile-tab-panel"]}
          >
            <div className={styles["owner-permissions-card"]}>
              <div className={styles["owner-visibility"]}>
                <div className={styles["owner-visibility-header"]}>
                  <h3>Owner View Permissions</h3>
                  <p>
                    Configure which fields are hidden from property owners in the Owners Panel.
                  </p>
                </div>

                <div className={styles["owner-visibility-section"]}>
                  <h4>Hidden Property Fields (for Owners):</h4>
                  <div className={styles["owner-visibility-grid-row"]}>
                    {PROPERTY_FIELDS.map((field) => (
                      <label key={field.key} className={styles["owner-visibility-item"]}>
                        <Checkbox
                          id={`owner-prop-${field.key}`}
                          checked={hiddenProperty.has(field.key)}
                          onCheckedChange={() => toggleHiddenField(field.key, "property")}
                        />
                        <span>{field.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className={styles["owner-visibility-hint"]}>
                    Select fields to hide from property owners in the Owners Panel
                  </p>
                </div>

                <div className={styles["owner-visibility-section"]}>
                  <h4>Hidden Payment Fields (for Owners):</h4>
                  <div className={styles["owner-visibility-grid"]}>
                    {PAYMENT_FIELDS.map((field) => (
                      <label key={field.key} className={styles["owner-visibility-item"]}>
                        <Checkbox
                          id={`owner-pay-${field.key}`}
                          checked={hiddenPayment.has(field.key)}
                          onCheckedChange={() => toggleHiddenField(field.key, "payment")}
                        />
                        <span>{field.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className={styles["owner-visibility-hint"]}>
                    Select payment fields to hide from property owners
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payment-rules" && (
          <div
            id="profile-tab-payment-rules"
            role="tabpanel"
            aria-labelledby="profile-tab-payment-rules-button"
            className={styles["profile-tab-panel"]}
          >
            <div className={styles["payment-split-section"]}>
              <SplitRulesTable />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
