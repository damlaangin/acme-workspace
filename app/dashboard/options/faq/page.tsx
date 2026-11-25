"use client";

import React, { useState } from "react";
import styles from "@/styles/Options.module.scss";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

const faqData = [
  {
    question: "How can I reset my password?",
    answer:
      "Go to Settings and use the Change Password section to update it.",
  },
  {
    question: "How do I add or manage team members?",
    answer:
      "Open Users to add new members, assign roles, and update permissions.",
  },
  {
    question: "How do I change the workspace theme or branding?",
    answer:
      "Go to Settings to update your panel title, theme, and logo, then save changes.",
  },
  {
    question: "How do I switch between workspaces?",
    answer:
      "Use the workspace switcher in the top navigation to select a different workspace.",
  },
  {
    question: "Where can I update owner permissions?",
    answer:
      "In Settings, open the Permissions tab and choose which fields are hidden from owners.",
  },
  {
    question: "How do I set payment rules and split logic?",
    answer:
      "Go to Settings and open the Payment Rules tab to manage split rules.",
  },
  {
    question: "Where can I view performance and reports?",
    answer:
      "Use the Stats page to review KPIs, trends, and exports for your workspace.",
  },
];

const FAQPage: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className={styles["faq-page"]}>
      <div className={styles["faq-header"]}>
        <div className={styles["faq-header-left"]}>
          <h2>Frequently Asked Questions</h2>
          <p className={styles["faq-subtitle"]}>
            Find quick answers to the most common questions about your workspace.
          </p>
        </div>
      </div>

      <div className={styles["faq-container"]}>
        {faqData.map((faq, index) => (
          <div key={index} className={styles["faq-item"]}>
            <button
              className={styles["faq-question"]}
              onClick={() => toggleFAQ(index)}
            >
              <span>{faq.question}</span>
              {activeIndex === index ? (
                <FaChevronUp className={styles["faq-icon"]} />
              ) : (
                <FaChevronDown className={styles["faq-icon"]} />
              )}
            </button>
            {activeIndex === index && (
              <div className={styles["faq-answer"]}>
                <p>{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQPage;
