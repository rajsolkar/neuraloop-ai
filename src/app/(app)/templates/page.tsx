import { LayoutTemplate } from "lucide-react";
import { PlaceholderView } from "@/components/workspace/placeholder-view";

export default function TemplatesPage() {
  return (
    <PlaceholderView
      title="Templates"
      icon={LayoutTemplate}
      description="Ready-made workflow templates will appear here in a later phase. For now, start from a blank canvas."
    />
  );
}