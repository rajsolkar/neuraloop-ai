import { prisma } from "@/lib/prisma";
import {
  STARTER_TEMPLATES,
  STARTER_TEMPLATE_IDS,
  seedStarterTemplates,
} from "./starter-templates";

async function main() {
  console.log("============================================================");
  console.log("  NEURALOOP: CANONICAL STARTER WORKFLOWS PRODUCTION SEEDER  ");
  console.log("============================================================");
  console.log(`[Init] Target starter templates count: ${STARTER_TEMPLATES.length}`);
  console.log(`[Init] Deterministic IDs: ${STARTER_TEMPLATE_IDS.join(", ")}`);

  const startTime = Date.now();

  try {
    console.log("[Seeding] Validating node schemas and executing idempotent upsert...");
    await seedStarterTemplates();

    console.log("[Verification] Inspecting database records in 'workflow_templates'...");
    const verified = await prisma.workflowTemplate.findMany({
      where: { id: { in: [...STARTER_TEMPLATE_IDS] } },
      select: {
        id: true,
        name: true,
        category: true,
        isOfficial: true,
        isPublic: true,
        featured: true,
      },
    });

    console.log(`[Success] Verified ${verified.length} of ${STARTER_TEMPLATE_IDS.length} canonical starters in database.`);

    for (const item of verified) {
      console.log(`  ✓ [${item.id}] ${item.name} (${item.category})`);
    }

    if (verified.length < STARTER_TEMPLATE_IDS.length) {
      const missing = STARTER_TEMPLATE_IDS.filter(
        (id) => !verified.some((v) => v.id === id),
      );
      throw new Error(`Incomplete seeding! Missing template IDs: ${missing.join(", ")}`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Done] Seeding completed successfully in ${elapsed}ms.`);
    process.exit(0);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Error] Production starter template seeding failed:", errorMsg);
    process.exit(1);
  }
}

void main();
