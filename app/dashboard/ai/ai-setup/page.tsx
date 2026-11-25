import AiSetupContent from "@/app/dashboard/ai/ai-setup/AiSetupContent";
import styles from "@/styles/app/dashboard/AiSetup.module.scss";

export const metadata = {
  title: "AI Agent Setup",
  description: "Configure your AI agent with optimized prompting techniques for maximum performance",
};

export default function AiSetupPage() {
  return (
    <div className={styles["ai-setup-page"]}>
      <AiSetupContent />
    </div>
  );
}
