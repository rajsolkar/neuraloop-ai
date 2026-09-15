import { getNodeDefinition } from "@/lib/workflow";
import { categoryColorSet } from "@/lib/workflow/node-colors";
import type { NodeCategory } from "@/types/workflow";

export function NodeIcon({
  definitionId,
  category,
  className,
}: {
  definitionId: string;
  category: NodeCategory;
  className?: string;
}) {
  const def = getNodeDefinition(definitionId);
  const Icon = def?.icon;
  const colors = categoryColorSet(category, def?.accentColor);

  if (!Icon) {
    return (
      <span
        className={className}
        style={{ backgroundColor: colors.tint, color: colors.accent }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex h-8 w-8 items-center justify-center rounded-lg"
      style={{ backgroundColor: colors.tint, color: colors.accent }}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}