"use client";

import React, { useEffect, useRef, useState } from "react";
import { LuCirclePause, LuCirclePlus, LuPlay, LuX } from "react-icons/lu";
import EmptyLook from "@/components/ui/EmptyLook";
import styles from "@/styles/app/ai/AiOverride.module.scss";
import type { Conversation, Property } from "@/types/api";
import { conversationsService } from "@/lib/services/conversations.service";
import { retrieveUserWorkspaceState } from "@/lib/server/workspace";
import { propertiesService } from "@/lib/services/properties.service";

type AiOverrideProps = {
  properties: Property[];
};

const AiOverride: React.FC<AiOverrideProps> = ({ properties }) => {
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [pauseDuration, setPauseDuration] = useState<
    "1_hour" | "8_hours" | "indefinitely"
  >("1_hour");
  const [propertySearch, setPropertySearch] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | "">("");
  const [isPropertyMenuOpen, setIsPropertyMenuOpen] = useState(false);
  const [pausedProperties, setPausedProperties] = useState<Property[]>([]);
  const [pausedConversations, setPausedConversations] = useState<Conversation[]>(
    []
  );
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [savingOverride, setSavingOverride] = useState(false);
  const [resumingKey, setResumingKey] = useState<string | null>(null);
  const pauseMenuRef = useRef<HTMLDivElement | null>(null);

  const formatPauseUntil = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    if (date.getUTCFullYear() >= 9999) return "indefinitely";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  useEffect(() => {
    if (!isOverrideOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pauseMenuRef.current &&
        !pauseMenuRef.current.contains(event.target as Node)
      ) {
        setIsOverrideOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOverrideOpen]);

  const loadPausedItems = async () => {
    try {
      setLoadingOverrides(true);
      const { currentWorkspace } = await retrieveUserWorkspaceState();

      const [propertiesResult, conversationsResult] = await Promise.all([
        propertiesService.getProperties(currentWorkspace.id, {
          page: 1,
          page_size: 50,
          ordering: "-updated_at",
          is_bot_stopped: true,
        }),
        conversationsService.getConversations(currentWorkspace.id, {
          page: 1,
          page_size: 50,
          ordering: "-updated_at",
          is_bot_stopped: true,
        }),
      ]);

      if (propertiesResult.success && propertiesResult.data) {
        setPausedProperties(propertiesResult.data.results ?? []);
      } else {
        console.error(
          "Failed to load paused properties:",
          propertiesResult.error?.message ?? propertiesResult.error
        );
        setPausedProperties([]);
      }

      if (conversationsResult.success && conversationsResult.data) {
        setPausedConversations(conversationsResult.data.results ?? []);
      } else {
        console.error(
          "Failed to load paused conversations:",
          conversationsResult.error?.message ?? conversationsResult.error
        );
        setPausedConversations([]);
      }
    } catch (error) {
      console.error("Error loading automation overrides:", error);
      setPausedProperties([]);
      setPausedConversations([]);
    } finally {
      setLoadingOverrides(false);
    }
  };

  useEffect(() => {
    loadPausedItems();
  }, []);

  const pauseDurationOptions = [
    { label: "1 Hour", value: "1_hour" },
    { label: "8 Hours", value: "8_hours" },
    { label: "Stop Indefinitely", value: "indefinitely" },
  ];

  const filteredProperties = properties.filter((property) =>
    property.name
      .toLowerCase()
      .includes(propertySearch.trim().toLowerCase())
  );

  const handleSaveOverride = async () => {
    if (!selectedPropertyId || savingOverride) return;
    setSavingOverride(true);
    try {
      const { currentWorkspace } = await retrieveUserWorkspaceState();
      const result = await propertiesService.pauseChatBot(
        currentWorkspace.id,
        selectedPropertyId,
        { duration: pauseDuration }
      );
      if (result.success) {
        if (result.data) {
          setPausedProperties((prev) => {
            const next = prev.filter((item) => item.id !== result.data!.id);
            return [result.data!, ...next];
          });
        }
        setIsOverrideOpen(false);
        setPropertySearch("");
        setSelectedPropertyId("");
        setIsPropertyMenuOpen(false);
        setPauseDuration("1_hour");
      } else {
        console.error(
          "Failed to pause chat bot:",
          result.error?.message ?? result.error
        );
      }
    } catch (error) {
      console.error("Error pausing chat bot:", error);
    } finally {
      setSavingOverride(false);
    }
  };

  const handleResumeProperty = async (property: Property) => {
    setResumingKey(`property-${property.id}`);
    try {
      const { currentWorkspace } = await retrieveUserWorkspaceState();
      const result = await propertiesService.resumeChatBot(
        currentWorkspace.id,
        property.id
      );

      if (result.success) {
        setPausedProperties((prev) =>
          prev.filter((item) => item.id !== property.id)
        );
      } else {
        console.error(
          "Failed to resume property bot:",
          result.error?.message ?? result.error
        );
      }
    } catch (error) {
      console.error("Error resuming property bot:", error);
    } finally {
      setResumingKey(null);
    }
  };

  const handleResumeConversation = async (conversation: Conversation) => {
    setResumingKey(`conversation-${conversation.id}`);
    try {
      const { currentWorkspace } = await retrieveUserWorkspaceState();
      const result = await conversationsService.resumeBot(
        currentWorkspace.id,
        conversation.id
      );
      if (result.success) {
        setPausedConversations((prev) =>
          prev.filter((item) => item.id !== conversation.id)
        );
      } else {
        console.error(
          "Failed to resume conversation bot:",
          result.error?.message ?? result.error
        );
      }
    } catch (error) {
      console.error("Error resuming conversation bot:", error);
    } finally {
      setResumingKey(null);
    }
  };

  const hasOverrides =
    pausedProperties.length > 0 || pausedConversations.length > 0;

  return (
    <div className={styles["ai__override"]}>
      <div className={styles["ai__override-header"]}>
        <span className={styles["ai__section-icon"]}>
          <LuCirclePause aria-hidden="true" />
        </span>
        <span className={styles["ai__override-title"]}>Automation Override</span>
        <div className={styles["ai__override-dropdown"]}>
          <button
            type="button"
            className={styles["ai__override-add"]}
            onClick={() => setIsOverrideOpen(true)}
            aria-haspopup="dialog"
          >
            <LuCirclePlus aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={styles["ai__override-card"]}>
        {!loadingOverrides && hasOverrides ? (
          <>
            {pausedProperties.map((property) => (
              <div
                key={`property-${property.id}`}
                className={styles["ai__override-item"]}
              >
                <div className={styles["ai__override-main"]}>
                  <div className={styles["ai__override-type"]}>Property</div>
                  <div className={styles["ai__override-property"]}>
                    {property.name ?? "Unknown property"}
                  </div>
                  <div className={styles["ai__override-issue"]}>
                    {property.pause_bot_until
                      ? `Until: ${formatPauseUntil(property.pause_bot_until)}`
                      : ""}
                  </div>
                </div>
                <div className={styles["ai__override-actions"]}>
                  <button
                    type="button"
                    className={`${styles["ai__override-btn"]} ${styles["ai__override-btn--play"]}`}
                    onClick={() => handleResumeProperty(property)}
                    disabled={resumingKey === `property-${property.id}`}
                  >
                    <LuPlay aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}

            {pausedConversations.map((conversation) => (
            <div
              key={`conversation-${conversation.id}`}
              className={styles["ai__override-item"]}
            >
              <div className={styles["ai__override-main"]}>
                <div className={styles["ai__override-type"]}>Conversation</div>
                <div className={styles["ai__override-property"]}>
                  {conversation.property?.name ?? "Unknown property"}
                </div>
                <div className={styles["ai__override-issue"]}>
                  {conversation.pause_bot_until
                    ? `Until: ${formatPauseUntil(conversation.pause_bot_until)}`
                    : ""}
                </div>
              </div>
              <div className={styles["ai__override-actions"]}>
                <button
                  type="button"
                  className={`${styles["ai__override-btn"]} ${styles["ai__override-btn--play"]}`}
                  onClick={() => handleResumeConversation(conversation)}
                  disabled={resumingKey === `conversation-${conversation.id}`}
                >
                  <LuPlay aria-hidden="true" />
                </button>
              </div>
            </div>
            ))}
          </>
        ) : (
          <EmptyLook label="automation overrides" />
        )}
      </div>

      {isOverrideOpen ? (
        <div
          className={styles["ai__override-modalOverlay"]}
          role="dialog"
          aria-modal="true"
          onClick={() => setIsOverrideOpen(false)}
        >
          <div
            className={styles["ai__override-modalCard"]}
            onClick={(event) => event.stopPropagation()}
            ref={pauseMenuRef}
          >
            <div className={styles["ai__override-modalHeader"]}>
              <div className={styles["ai__override-modalTitle"]}>
                AI Override
              </div>
              <button
                type="button"
                className={styles["ai__override-modalClose"]}
                onClick={() => setIsOverrideOpen(false)}
                aria-label="Close override modal"
              >
                <LuX />
              </button>
            </div>

            <div className={styles["ai__override-modalBody"]}>
              <label className={styles["ai__override-field"]}>
                <span className={styles["ai__override-label"]}>
                  Pause Duration
                </span>
                <select
                  className={styles["ai__override-select"]}
                  value={pauseDuration}
                  onChange={(event) =>
                    setPauseDuration(
                      event.target.value as "1_hour" | "8_hours" | "indefinitely"
                    )
                  }
                >
                  {pauseDurationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles["ai__override-field"]}>
                <span className={styles["ai__override-label"]}>Property</span>
                <div
                  className={styles["ai__override-searchSelect"]}
                  data-selected={selectedPropertyId ? "true" : "false"}
                >
                  <input
                    className={styles["ai__override-input"]}
                    type="text"
                    placeholder="Select Property..."
                    value={propertySearch}
                    onFocus={() => setIsPropertyMenuOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setIsPropertyMenuOpen(false);
                      }, 120);
                    }}
                    onChange={(event) => {
                      setPropertySearch(event.target.value);
                      setSelectedPropertyId("");
                      setIsPropertyMenuOpen(true);
                    }}
                  />
                  {isPropertyMenuOpen && (
                    <div
                      className={styles["ai__override-searchMenu"]}
                      role="listbox"
                    >
                      {filteredProperties.length === 0 ? (
                        <div className={styles["ai__override-searchEmpty"]}>
                          No results
                        </div>
                      ) : (
                        filteredProperties.map((property) => (
                          <button
                            key={property.id}
                            type="button"
                            className={styles["ai__override-searchOption"]}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setPropertySearch(property.name);
                              setSelectedPropertyId(property.id);
                              setIsPropertyMenuOpen(false);
                            }}
                          >
                            {property.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles["ai__override-modalFooter"]}>
              <button
                type="button"
                className={styles["ai__override-modalCancel"]}
                onClick={() => setIsOverrideOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles["ai__override-modalSubmit"]}
                onClick={handleSaveOverride}
                disabled={!selectedPropertyId || savingOverride}
              >
                Save Override
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AiOverride;
