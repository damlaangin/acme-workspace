import { Metadata } from "next";
import AiAgentsContent from "./AiAgentsContent";

export const metadata: Metadata = {
  title: "AI Agents | Dashboard",
  description: "Manage your AI assistants and track their performance",
};

export default function AiAgentsPage() {
  return <AiAgentsContent />;
}
