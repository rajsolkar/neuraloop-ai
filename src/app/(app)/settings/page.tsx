import { Settings } from "lucide-react";
import { PlaceholderView } from "@/components/workspace/placeholder-view";

export default function SettingsPage() {
  return (
    <PlaceholderView
      title="Settings"
      icon={Settings}
      description="Workspace preferences, integrations and account settings will live here in a later phase."
    />
  );
}