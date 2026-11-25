"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FaRobot,
  FaClock,
  FaPencilAlt,
} from "react-icons/fa";
import { LuLoaderCircle } from "react-icons/lu";
import { useParams } from "next/navigation";
import { botsService } from "@/lib/services/bots.service";
import styles from "@/styles/app/dashboard/AgentDetails.module.scss";
import { useWorkspace } from "@/context/workspace-context";
import AiBreadcrumb from "@/components/app/ai/AiBreadcrumb";
import { Bot, PatchedBot } from "@/types/api";

interface ParsedInstructions {
  sections: InstructionSection[];
}

interface InstructionSection {
  title: string;
  content: string;
}

interface ChatHistory {
  id: number;
  timestamp: string;
  duration: string;
  messageCount: number;
  rating?: number;
}

type ActiveTab = "settings";

const AgentDetailsContent: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedInstructions, setParsedInstructions] = useState<ParsedInstructions | null>(null);
  const [loadingInstructions, setLoadingInstructions] = useState(false);
  const [instructionError, setInstructionError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", temperature: "", delay: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [revertMessage, setRevertMessage] = useState<string | null>(null);
  const activeTab: ActiveTab = "settings";
  const params = useParams();
  const rawBotId = Array.isArray(params.id) ? params.id[0] : params.id;
  const botId = rawBotId ? Number(rawBotId) : NaN;

  const loadBotDetails = useCallback(async () => {
    if (!currentWorkspace || Number.isNaN(botId)) return;
    try {
      setLoading(true);
      setError(null);
      const result = await botsService.getBot(currentWorkspace.id, botId);

      if (result.success && result.data) {
        setBot(result.data);
        setEditForm({
          name: result.data.name || "",
          temperature: String(result.data.temperature ?? ""),
          delay: String(result.data.delay_before_responding ?? ""),
        });
        
        // Fetch and parse instruction content if available
        if (result.data.instruction) {
          setLoadingInstructions(true);
          setInstructionError(null);
          try {
            const parsed = await fetchInstructionContent(result.data.instruction);
            setParsedInstructions(parsed);
          } catch (error) {
            console.error("Error loading instructions:", error);
            setInstructionError("Failed to load instruction details");
          } finally {
            setLoadingInstructions(false);
          }
        }
      } else {
        setError(result.error?.message || "Failed to load bot details");
      }
    } catch (error) {
      console.error("Error loading bot details:", error);
      setError("Failed to load bot details");
    } finally {
      setLoading(false);
    }
  }, [botId, currentWorkspace]);

  useEffect(() => {
    loadBotDetails();
  }, [loadBotDetails]);

  const parseInstructionText = (instructionText: string): ParsedInstructions => {
    const sections: InstructionSection[] = [];
    const lines = instructionText.split('\n');
    let currentSection = '';
    let currentContent = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('# ')) {
        if (currentSection && currentContent.trim()) {
          sections.push({
            title: currentSection,
            content: currentContent.trim()
          });
        }
        
        currentSection = trimmedLine.substring(2).trim();
        currentContent = '';
      } else if (currentSection) {
        currentContent += line + '\n';
      }
    }

    if (currentSection && currentContent.trim()) {
      sections.push({
        title: currentSection,
        content: currentContent.trim()
      });
    }
    return { sections };
  };

  const fetchInstructionContent = async (
    instructionUrl: string
  ): Promise<ParsedInstructions | null> => {
    if (!instructionUrl || typeof instructionUrl !== "string") {
      return null;
    }

    let resolvedUrl = instructionUrl;
    try {
      resolvedUrl = new URL(instructionUrl, window.location.origin).toString();
    } catch {
      return null;
    }

    try {
      const response = await fetch(resolvedUrl, { credentials: "include" });
      if (!response.ok) return null;
      const text = await response.text();
      return parseInstructionText(text);
    } catch {
      return null;
    }
  };

  const handleOpenEdit = () => {
    if (!bot) return;
    setEditForm({
      name: bot.name || "",
      temperature: String(bot.temperature ?? ""),
      delay: String(bot.delay_before_responding ?? ""),
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    setIsEditModalOpen(false);
    setEditError(null);
  };

  const handleEditChange = (field: "name" | "temperature" | "delay", value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = async () => {
    if (!bot || !currentWorkspace || Number.isNaN(botId)) return;

    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      setEditError("Agent name is required.");
      return;
    }

    const temperature = parseFloat(editForm.temperature);
    if (Number.isNaN(temperature) || temperature < 0 || temperature > 2) {
      setEditError("Temperature must be between 0 and 2.");
      return;
    }

    const delay = parseFloat(editForm.delay);
    if (Number.isNaN(delay) || delay < 1) {
      setEditError("Delay must be at least 1 minute.");
      return;
    }

    try {
      setSavingEdit(true);
      setEditError(null);
      const updates: PatchedBot = {
        name: trimmedName,
        temperature,
        delay_before_responding: delay,
      };
      const result = await botsService.partialUpdateBot(currentWorkspace.id, botId, updates);
      if (result.success && result.data) {
        setBot(result.data);
        setEditForm({
          name: result.data.name || "",
          temperature: String(result.data.temperature ?? ""),
          delay: String(result.data.delay_before_responding ?? ""),
        });
        setIsEditModalOpen(false);
      } else {
        setEditError(result.error?.message || "Failed to save changes.");
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      setEditError("Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRevertClick = () => {
    setRevertMessage("No previous version to revert back.");
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatConfigLabel = (key: string) =>
    key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const formatConfigValue = (value: unknown) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "string") return value.trim() || "—";
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.length ? value.join(", ") : "—";
    }
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className={styles["loading-container"]}>
        <div className={styles["loading-spinner"]}>
          <LuLoaderCircle className={`${styles["loading-icon"]} animate-spin`} />
          <p>Loading agent details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles["error-container"]}>
        <span>Error Loading Agent</span>
        <p>{error}</p>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className={styles["error-container"]}>
        <span>Agent Not Found</span>
        <p>The requested AI agent could not be found.</p>
      </div>
    );
  }

  return (
    <div className={styles["agent-details-container"]}>
      <AiBreadcrumb />
      <div className={styles["agent-hero"]}>
        <div className={styles["agent-hero-left"]}>
          <div
            className={`${styles["agent-avatar"]} ${
              bot.setup_completed ? styles["active"] : styles["inactive"]
            }`}
          >
            <FaRobot />
            {!bot.setup_completed && (
              <span className={styles["icon-tooltip"]}>
                Please complete your setup to activate your bot.
              </span>
            )}
          </div>
          <div className={styles["agent-hero-text"]}>
            <span>{bot.name} Configuration</span>
            <p>Fine-tune behavior and knowledge base</p>
          </div>
        </div>
        <div className={styles["hero-meta"]}>
          <FaClock />
          <span>Created {formatDate(bot.created_at)}</span>
        </div>
      </div>

      <div className={styles["tabs"]}>
        <button
          type="button"
          className={`${styles["tab-button"]} ${
            activeTab === "settings" ? styles["tab-active"] : ""
          }`}
        >
          Agent Settings
        </button>
      </div>

      {activeTab === "settings" ? (
        <>
          <div className={styles["agent-instructions-container"]}>
            <div className={styles["settings-header"]}>
              <div className={styles["instructions-title"]}>Agent Instructions</div>
              <button
                type="button"
                className={styles["add-button"]}
                onClick={handleOpenEdit}
              >
                <FaPencilAlt />
                Edit
              </button>
            </div>
            <div className={styles["instructions-wrapper"]}>
              <div className={styles["stats-grid"]}>
                <div className={styles["stat"]}>
                  <div className={styles["stat-label"]}>Temperature</div>
                  <div className={styles["stat-value"]}>{bot.temperature}</div>
                </div>
                <div className={styles["stat"]}>
                  <div className={styles["stat-label"]}>Response Delay</div>
                  <div className={styles["stat-value"]}>
                    {bot.delay_before_responding}m
                  </div>
                </div>
                <div className={styles["stat"]}>
                  <div className={styles["stat-label"]}>Model</div>
                  <div className={styles["stat-value"]}>{bot.llm_model}</div>
                </div>
              </div>
              {loadingInstructions ? (
                <div className={styles["instructions-card"]}>
                  <div className={styles["instructions-loading"]}>
                    <LuLoaderCircle className="animate-spin" />
                    <p>Loading agent instructions...</p>
                  </div>
                </div>
              ) : instructionError ? (
                <div className={styles["instructions-card"]}>
                  <div className={styles["instructions-error"]}>
                    <p>{instructionError}</p>
                  </div>
                </div>
              ) : parsedInstructions && parsedInstructions.sections.length > 0 ? (
                parsedInstructions.sections.map((section) => (
                  <div key={section.title} className={styles["instructions-card"]}>
                    <div>{section.title}</div>
                    <pre className={styles["instruction-content"]}>
                      {section.content}
                    </pre>
                  </div>
                ))
              ) : (
                <div className={styles["instructions-card"]}>
                  <div className={styles["config-title"]}>Configuration</div>
                  <div className={styles["config-section"]}>
                    {bot.form_submission?.config &&
                    Object.keys(bot.form_submission.config).length > 0 ? (
                      <>
                        <span className={styles["config-text"]}>
                          No detailed instructions available. Showing full configuration:
                        </span>
                        <div className={styles["config-grid"]}>
                          {Object.entries(bot.form_submission.config).map(
                            ([key, value]) => {
                              const formatted = formatConfigValue(value);
                              const isLong =
                                typeof value === "object" ||
                                (typeof formatted === "string" &&
                                  formatted.length > 120);
                              return (
                                <div key={key} className={styles["config-card"]}>
                                  <div className={styles["config-label"]}>
                                    {formatConfigLabel(key)}
                                  </div>
                                  {isLong ? (
                                    <pre className={styles["config-block"]}>
                                      {formatted}
                                    </pre>
                                  ) : (
                                    <div className={styles["config-value"]}>
                                      {formatted}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      </>
                    ) : (bot as Bot & { template?: string }).template ? (
                      <div className={styles["config-empty"]}>
                        This agent was created from the{" "}
                        <span className={styles["config-template"]}>
                          {(bot as Bot & { template?: string }).template}
                        </span>{" "}
                        template, so there is no custom configuration to show.
                      </div>
                    ) : (
                      <div className={styles["config-empty"]}>
                        No configuration data available.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles["content-grid"]}>
            <span className={styles["content-title"]}>Version Control</span>
            <div className={styles["chat-actions"]}>
              <button className={styles["revert-button"]} onClick={handleRevertClick}>
                Revert to Previous Version
              </button>
              {revertMessage && (
                <span className={styles["revert-warning"]}>{revertMessage}</span>
              )}
            </div>
          </div>
        </>
      ) : null}

            {isEditModalOpen && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["modal-content"]}>
            <div className={styles["modal-header"]}>
              <span>Edit Agent</span>
              <button className={styles["modal-close"]} onClick={handleCloseEdit}>
                ×
              </button>
            </div>
            <div className={styles["modal-body"]}>
              <div className={styles["modal-field"]}>
                <label htmlFor="agent-name">Agent Name</label>
                <input
                  id="agent-name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => handleEditChange("name", e.target.value)}
                />
              </div>
              <div className={styles["modal-field"]}>
                <label htmlFor="agent-temperature">Temperature (0 - 2)</label>
                <input
                  id="agent-temperature"
                  type="number"
                  min={0}
                  max={2}
                  step={0.01}
                  value={editForm.temperature}
                  onChange={(e) => handleEditChange("temperature", e.target.value)}
                />
              </div>
              <div className={styles["modal-field"]}>
                <label htmlFor="agent-delay">Delay (minutes)</label>
                <input
                  id="agent-delay"
                  type="number"
                  min={0}
                  value={editForm.delay}
                  onChange={(e) => handleEditChange("delay", e.target.value)}
                />
              </div>
              {editError && <p className={styles["modal-error"]}>{editError}</p>}
            </div>
            <div className={styles["modal-actions"]}>
              <button className={styles["modal-cancel"]} onClick={handleCloseEdit} disabled={savingEdit}>
                Cancel
              </button>
              <button className={styles["modal-save"]} onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDetailsContent;
