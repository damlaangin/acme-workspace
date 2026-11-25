import { Metadata } from "next";
import ChatHistoryContent from "./ChatHistoryContent";

export const metadata: Metadata = {
  title: "Chat History | Dashboard",
  description: "View conversation history with your AI agents",
};

export default function ChatHistoryPage() {
  return <ChatHistoryContent />;
}
