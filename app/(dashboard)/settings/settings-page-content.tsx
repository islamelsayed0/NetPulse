import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/settings-view";
import { getUserSettingsForUser } from "@/lib/data/user-settings";
import { isThrownSchemaMissingError } from "@/lib/supabase-errors";

export async function SettingsPageContent() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let initialSettings = null;
  let settingsTableMissing = false;
  try {
    initialSettings = await getUserSettingsForUser(userId);
  } catch (err) {
    if (isThrownSchemaMissingError(err)) {
      settingsTableMissing = true;
      console.error(
        "[NetPulse] Settings: user_settings missing (PGRST205). Run supabase/migrations/005_user_settings.sql in SQL Editor."
      );
    } else {
      console.error("SettingsPage", err);
    }
  }

  return (
    <SettingsView
      userId={userId}
      initialSettings={initialSettings}
      settingsTableMissing={settingsTableMissing}
    />
  );
}
