import AiChatContent from "@/app/dashboard/ai/chat-history/AiChatContent";
import styles from "@/styles/app/dashboard/AiChat.module.scss";

export const metadata = {
  title: "AI Chat",
  description: "Test your AI Agent",
};

export default function AiChatPage() {
  return (
    <div className={styles["ai-chat-page"]}>
      <AiChatContent />
    </div>
  );
}
