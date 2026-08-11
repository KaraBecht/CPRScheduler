import app from "./app";
import { logger } from "./lib/logger";
import { autoCompletePastClasses } from "./lib/autoComplete";
import { scheduleRenewalReminders } from "./lib/renewalReminder";
import { scheduleSevenDayReminders } from "./lib/classReminderJob";
import { db, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { seedProductionIfEmpty } from "./lib/seedProduction";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Seed production database if it has very little data (first deploy)
  try {
    await seedProductionIfEmpty();
  } catch (e) {
    logger.error({ err: e }, "Failed to run production data seed");
  }

  // Bootstrap: if no administrator exists, promote known admin emails to administrator role
  try {
    const [{ adminCount }] = await db
      .select({ adminCount: count() })
      .from(usersTable)
      .where(eq(usersTable.role, "administrator"));
    if (adminCount === 0) {
      const knownAdmins = [
        "sharon.anctil@fox.com",
        "kara.becht@fox.com",
      ];
      for (const email of knownAdmins) {
        await db
          .update(usersTable)
          .set({ role: "administrator" })
          .where(eq(usersTable.email, email));
      }
      logger.info("Bootstrap: promoted known admin users to administrator role");
    }
  } catch (e) {
    logger.error({ err: e }, "Failed to run admin bootstrap");
  }

  try {
    await autoCompletePastClasses();
  } catch (e) {
    logger.error({ err: e }, "Failed to auto-complete past classes on startup");
  }

  scheduleRenewalReminders();
  scheduleSevenDayReminders();
});
