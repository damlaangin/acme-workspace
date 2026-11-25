"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FaRobot, FaPlus, FaCog, FaPowerOff } from "react-icons/fa";
import { LuLoaderCircle } from "react-icons/lu";
import { useRouter } from "next/navigation";
import { botsService } from "@/lib/services/bots.service";
import { Bot } from "@/types/api";
import styles from "@/styles/app/dashboard/AiAgents.module.scss";
import { useWorkspace } from "@/context/workspace-context";
import AiBreadcrumb from "@/components/app/ai/AiBreadcrumb";
import EmptyLook from "@/components/ui/EmptyLook";
import PageGreeting from "@/components/ui/PageGreeting";

const AiAgentsContent: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMap, setActiveMap] = useState<Record<number, boolean>>({});
  const router = useRouter();

  const loadBots = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      setError(null);
      const result = await botsService.getBots(currentWorkspace.id);
      
      if (result.success && result.data) {
        const botsList = Array.isArray(result.data)
          ? result.data
          : result.data.results ?? [];

        setBots(botsList);
        setActiveMap((prev) => {
          const next: Record<number, boolean> = { ...prev };
          botsList.forEach((bot) => {
            if (typeof next[bot.id] !== "boolean") {
              next[bot.id] = true;
            }
          });
          return next;
        });
      } else {
        setError(result.error?.message || "Failed to load bots");
      }
    } catch (error) {
      console.error('Error loading bots:', error);
      setError("Failed to load bots");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  const handleCreateAgent = () => {
    router.push("/dashboard/ai/ai-setup");
  };

  const handleViewAgent = (botId: number) => {
    router.push(`/dashboard/ai/ai-agents/${botId}`);
  };

  const handleToggleActive = (botId: number) => {
    setActiveMap((prev) => ({
      ...prev,
      [botId]: !prev[botId],
    }));
  };

  const getAvatarUrl = (
    bot: Bot & { avatar_url?: string; form_submission?: { config?: { avatar_url?: string } } }
  ) => {
    return bot.avatar_url || bot.form_submission?.config?.avatar_url || null;
  };

  if (loading) {
    return (
      <div className={styles["loading-container"]}>
        <div className={styles["loading-spinner"]}>
          <LuLoaderCircle className={`${styles["loading-icon"]} animate-spin`} />
          <p>Loading your AI agents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles["error-container"]}>
        <h2>Error Loading Agents</h2>
        <p>{error}</p>
        <button onClick={loadBots} className={styles["retry-button"]}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={styles["ai-agents-container"]}>
      <div className={styles["ai-header-row"]}>
        <PageGreeting
          subtitle="Manage Active Agents"
          className={styles["ai__header-text"]}
        />
        <div className={styles["ai-nav"]}>
          <AiBreadcrumb />
        </div>
      </div>

      {bots.length === 0 ? (
        <EmptyLook label="AI agents" />
      ) : (
        <div className={styles["agents-grid"]}>
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles["deploy-card"]}
            onClick={handleCreateAgent}
          >
            <span className={styles["deploy-card-icon"]}>
              <span className={styles["deploy-card-label"]}>Deploy New Bot</span>
              <FaPlus aria-hidden="true" />
            </span>
          </motion.button>
          {bots.map((bot: Bot, index: number) => {
            const avatarUrl = getAvatarUrl(bot);
            return (
              <motion.div
                key={bot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + 1) * 0.1 }}
                className={styles["agent-card"]}
              >
                <div className={styles["agent-card-inner"]}>
                  <div className={styles["agent-top-row"]}>
                    <div className={styles["agent-avatar"]}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={`${bot.name} avatar`} />
                      ) : (
                        <FaRobot aria-hidden="true" />
                      )}
                    </div>
                    <div className={styles["agent-actions"]}>
                      <button
                        type="button"
                        className={styles["icon-button"]}
                        onClick={() => handleViewAgent(bot.id)}
                        aria-label="Open agent settings"
                      >
                        <FaCog />
                      </button>
                      <button
                        type="button"
                        className={`${styles["icon-button"]} ${
                          activeMap[bot.id] ? styles["power-on"] : styles["power-off"]
                        }`}
                        onClick={() => handleToggleActive(bot.id)}
                        aria-label={activeMap[bot.id] ? "Pause agent" : "Activate agent"}
                      >
                        <FaPowerOff />
                      </button>
                    </div>
                  </div>

                  <div className={styles["agent-info"]}>
                    <span className={styles["agent-name"]}>{bot.name}</span>
                    <div className={styles["agent-status"]}>
                      <span
                        className={`${styles["status-dot"]} ${
                          activeMap[bot.id] ? styles["status-active"] : styles["status-paused"]
                        }`}
                      />
                      <span>{activeMap[bot.id] ? "Active" : "Paused"}</span>
                    </div>
                  </div>

                  <div className={styles["agent-divider"]} />

                  <div className={styles["agent-metrics"]}>
                    <div className={styles["metric"]}>
                      <span>Conversations</span>
                      <strong>—</strong>
                    </div>
                    <div className={styles["metric"]}>
                      <span>Satisfaction</span>
                      <strong>—</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles["configure-button"]}
                    onClick={() => handleViewAgent(bot.id)}
                  >
                    Configure Knowledge Base
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AiAgentsContent;
