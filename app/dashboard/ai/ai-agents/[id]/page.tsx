import { Metadata } from "next";
import AgentDetailsContent from "./AgentDetailsContent";

export const metadata: Metadata = {
  title: "Agent Details | Dashboard",
  description: "View detailed information about your AI agent",
};

export default function AgentDetailsPage() {
  return <AgentDetailsContent />;
}
