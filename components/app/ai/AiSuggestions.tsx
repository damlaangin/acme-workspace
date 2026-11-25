"use client";

import React from "react";
import { LuLightbulb } from "react-icons/lu";
import EmptyLook from "@/components/ui/EmptyLook";
import styles from "@/styles/app/ai/AiSuggestions.module.scss";

export type AiSuggestionItem = {
  text: string;
  tag: string;
  impact: string;
  tagVariant?: "primary" | "secondary";
};

type AiSuggestionsProps = {
  items: AiSuggestionItem[];
};

const AiSuggestions: React.FC<AiSuggestionsProps> = ({ items }) => {
  return (
    <div className={styles["ai__suggestions"]}>
      <div className={styles["ai__suggestions-header"]}>
        <span className={styles["ai__section-icon"]}>
          <LuLightbulb aria-hidden="true" />
        </span>
        <span className={styles["ai__suggestions-title"]}>AI Suggestions</span>
      </div>
      <div className={styles["ai__suggestions-grid"]}>
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.text} className={styles["ai__suggestion-card"]}>
              <div className={styles["ai__suggestion-top"]}>
                <span
                  className={`${styles["ai__suggestion-tag"]} ${
                    item.tagVariant === "secondary"
                      ? styles["ai__suggestion-tag--secondary"]
                      : styles["ai__suggestion-tag--primary"]
                  }`}
                >
                  {item.tag}
                </span>
                <span className={styles["ai__suggestion-impact"]}>
                  {item.impact}
                </span>
              </div>
              <p className={styles["ai__suggestion-text"]}>{item.text}</p>
              <button type="button" className={styles["ai__suggestion-action"]}>
                Review &amp; Apply
              </button>
            </div>
          ))
        ) : (
          <EmptyLook label="AI suggestions" />
        )}
      </div>
    </div>
  );
};

export default AiSuggestions;
