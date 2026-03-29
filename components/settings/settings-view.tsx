"use client";

import { useEffect, useState, useTransition } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Blocks,
  Gauge,
  Loader2,
  Mail,
  MessagesSquare,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  deleteAccount,
  deleteAllMonitors,
  saveAlertSettings,
  saveDiscordIntegration,
  saveNotificationEmailIntegration,
  saveNotificationSettings,
  testDiscordWebhook,
} from "@/lib/actions/settings";
import { USER_SETTINGS_DEFAULTS } from "@/lib/data/user-settings";
import type { UserSettings } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type SectionId =
  | "profile"
  | "notifications"
  | "alerts"
  | "integrations"
  | "danger";

const NAV: { id: SectionId; label: string; icon: typeof UserRound }[] = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "alerts", label: "Alerts", icon: Gauge },
  { id: "integrations", label: "Integrations", icon: Blocks },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

function initialsFromUser(user: ReturnType<typeof useUser>["user"]): string {
  if (!user) return "…";
  const fn = user.firstName?.charAt(0);
  const ln = user.lastName?.charAt(0);
  if (fn && ln) return (fn + ln).toUpperCase();
  const full = user.fullName?.trim();
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (
        parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
      ).toUpperCase();
    }
    return full.slice(0, 2).toUpperCase();
  }
  const em =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress;
  return em ? em.slice(0, 2).toUpperCase() : "?";
}

function displayName(user: ReturnType<typeof useUser>["user"]): string {
  if (!user) return "…";
  return (
    user.fullName?.trim() ||
    user.username ||
    user.primaryEmailAddress?.emailAddress ||
    "Account"
  );
}

function formatMemberSince(createdAt: Date | null | undefined): string {
  if (!createdAt) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(createdAt);
}

const accentBtn =
  "bg-carbon-accent text-carbon-ctaText hover:bg-carbon-accent-hover border-transparent";

export function SettingsView({
  userId,
  initialSettings,
  settingsTableMissing,
}: {
  userId: string;
  initialSettings: UserSettings | null;
  settingsTableMissing?: boolean;
}) {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const [section, setSection] = useState<SectionId>("profile");

  const base = initialSettings ?? {
    ...USER_SETTINGS_DEFAULTS,
    user_id: userId,
    id: "",
    created_at: null,
    updated_at: null,
  };

  const [notifEmail, setNotifEmail] = useState(
    () => base.notification_email ?? ""
  );
  const [emailDown, setEmailDown] = useState(base.email_on_down);
  const [emailRecovery, setEmailRecovery] = useState(base.email_on_recovery);
  const [dailySummary, setDailySummary] = useState(base.daily_summary);
  const [weeklyReport, setWeeklyReport] = useState(base.weekly_report);

  const [responseMs, setResponseMs] = useState(
    String(base.response_time_threshold)
  );
  const [downtimeDelay, setDowntimeDelay] = useState(
    String(base.downtime_delay)
  );
  const [alertCooldown, setAlertCooldown] = useState(
    String(base.alert_cooldown)
  );

  const [discordUrl, setDiscordUrl] = useState(base.discord_webhook ?? "");
  const [integrationEmail, setIntegrationEmail] = useState(
    base.notification_email ?? ""
  );
  const [editingIntegrationEmail, setEditingIntegrationEmail] = useState(
    false
  );

  useEffect(() => {
    const b =
      initialSettings ?? {
        ...USER_SETTINGS_DEFAULTS,
        user_id: userId,
        id: "",
        created_at: null,
        updated_at: null,
      };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror server props when settings refresh
    setNotifEmail(b.notification_email ?? "");
    setEmailDown(b.email_on_down);
    setEmailRecovery(b.email_on_recovery);
    setDailySummary(b.daily_summary);
    setWeeklyReport(b.weekly_report);
    setResponseMs(String(b.response_time_threshold));
    setDowntimeDelay(String(b.downtime_delay));
    setAlertCooldown(String(b.alert_cooldown));
    setDiscordUrl(b.discord_webhook ?? "");
    setIntegrationEmail(b.notification_email ?? "");
  }, [initialSettings, userId]);

  const [notifPending, startNotif] = useTransition();
  const [alertPending, startAlert] = useTransition();
  const [discordPending, startDiscord] = useTransition();
  const [discordTestPending, startDiscordTest] = useTransition();
  const [intEmailPending, startIntEmail] = useTransition();
  const [delMonPending, startDelMon] = useTransition();
  const [delAccPending, startDelAcc] = useTransition();

  const [notifMsg, setNotifMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [alertMsg, setAlertMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [discordMsg, setDiscordMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [discordTestMsg, setDiscordTestMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [intEmailMsg, setIntEmailMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const [monitorsOpen, setMonitorsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const saveNotifications = () => {
    setNotifMsg(null);
    startNotif(async () => {
      const r = await saveNotificationSettings({
        notification_email: notifEmail,
        email_on_down: emailDown,
        email_on_recovery: emailRecovery,
        daily_summary: dailySummary,
        weekly_report: weeklyReport,
      });
      if (r.ok) {
        if (r.warning) {
          toast.warning(r.warning, { duration: 12_000 });
        } else {
          toast.success("Notification settings saved.");
        }
        setIntegrationEmail(notifEmail.trim());
        setNotifMsg({ ok: true, text: "Saved." });
        setTimeout(() => setNotifMsg(null), 2500);
        router.refresh();
      } else {
        setNotifMsg({ ok: false, text: r.error });
        toast.error(r.error);
      }
    });
  };

  const saveAlerts = () => {
    setAlertMsg(null);
    startAlert(async () => {
      const r = await saveAlertSettings({
        response_time_threshold: Number(responseMs),
        downtime_delay: Number(downtimeDelay),
        alert_cooldown: Number(alertCooldown),
      });
      if (r.ok) {
        if (r.warning) {
          toast.warning(r.warning, { duration: 12_000 });
        } else {
          toast.success("Alert settings saved.");
        }
        setAlertMsg({ ok: true, text: "Saved." });
        setTimeout(() => setAlertMsg(null), 2500);
        router.refresh();
      } else {
        setAlertMsg({ ok: false, text: r.error });
        toast.error(r.error);
      }
    });
  };

  const saveDiscord = () => {
    setDiscordMsg(null);
    startDiscord(async () => {
      const r = await saveDiscordIntegration(discordUrl);
      if (r.ok) {
        if (r.warning) {
          toast.warning(r.warning, { duration: 12_000 });
        } else {
          toast.success("Discord webhook saved.");
        }
        setDiscordMsg({ ok: true, text: "Saved." });
        setTimeout(() => setDiscordMsg(null), 2500);
        router.refresh();
      } else {
        setDiscordMsg({ ok: false, text: r.error });
        toast.error(r.error);
      }
    });
  };

  const runDiscordTest = () => {
    setDiscordTestMsg(null);
    startDiscordTest(async () => {
      const r = await testDiscordWebhook(discordUrl);
      if (r.ok) {
        setDiscordTestMsg({ ok: true, text: "Test message sent." });
        toast.success("Test message sent to Discord.");
        setTimeout(() => setDiscordTestMsg(null), 3500);
      } else {
        setDiscordTestMsg({ ok: false, text: r.error });
        toast.error(r.error);
      }
    });
  };

  const saveIntEmail = () => {
    setIntEmailMsg(null);
    startIntEmail(async () => {
      const r = await saveNotificationEmailIntegration(integrationEmail);
      if (r.ok) {
        if (r.warning) {
          toast.warning(r.warning, { duration: 12_000 });
        } else {
          toast.success("Integration email saved.");
        }
        setNotifEmail(integrationEmail.trim());
        setEditingIntegrationEmail(false);
        setIntEmailMsg({ ok: true, text: "Saved." });
        setTimeout(() => setIntEmailMsg(null), 2500);
        router.refresh();
      } else {
        setIntEmailMsg({ ok: false, text: r.error });
        toast.error(r.error);
      }
    });
  };

  const confirmDeleteMonitors = () => {
    startDelMon(async () => {
      const r = await deleteAllMonitors();
      if (r.ok) {
        toast.success("All monitors deleted.");
        setMonitorsOpen(false);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  const confirmDeleteAccount = () => {
    startDelAcc(async () => {
      const r = await deleteAccount();
      if (r.ok) {
        toast.success("Account deleted. Signing out…");
        setAccountOpen(false);
        await signOut({ redirectUrl: "/" });
      } else {
        toast.error(r.error);
      }
    });
  };

  const discordConnected = Boolean(
    (initialSettings?.discord_webhook ?? discordUrl).trim()
  );
  const emailConnected = Boolean(
    (initialSettings?.notification_email ?? integrationEmail).trim()
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-carbon-heading">
            Settings
          </h1>
          <p className="mt-2 max-w-xl text-sm text-carbon-body">
            Manage your account and notification preferences
          </p>
        </header>

        {settingsTableMissing ? (
          <div
            role="status"
            className="mb-6 rounded-xl border border-carbon-warning/40 bg-carbon-warning/10 px-4 py-3 text-sm text-carbon-warning"
          >
            User settings table is missing. Run{" "}
            <code className="rounded bg-carbon-border/40 px-1.5 py-0.5 text-xs text-carbon-heading">
              supabase/migrations/005_user_settings.sql
            </code>{" "}
            in the Supabase SQL Editor. Forms will use defaults until then.
          </div>
        ) : null}

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <nav
            className="shrink-0 lg:w-52"
            aria-label="Settings sections"
          >
            <ul className="flex flex-row gap-1 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
              {NAV.map(({ id, label, icon: Icon }) => {
                const active = section === id;
                return (
                  <li key={id} className="shrink-0 lg:w-full">
                    <button
                      type="button"
                      onClick={() => setSection(id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                        active
                          ? "bg-carbon-accent/[0.12] text-carbon-accent lg:border-l-2 lg:border-carbon-accent lg:bg-carbon-accent/[0.08]"
                          : "text-carbon-muted hover:bg-carbon-border/30 hover:text-carbon-body lg:border-l-2 lg:border-transparent"
                      )}
                    >
                      <Icon className="size-[18px] shrink-0 opacity-90" strokeWidth={1.75} />
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div
            className="min-w-0 flex-1 transition-all duration-200 ease-out"
            key={section}
          >
            {section === "profile" && (
              <section
                aria-labelledby="settings-profile-heading"
                className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
              >
                <h2
                  id="settings-profile-heading"
                  className="sr-only"
                >
                  Profile
                </h2>
                <div className="rounded-xl border border-carbon-border bg-carbon-surface p-6 shadow-sm">
                  {!userLoaded ? (
                    <div className="flex items-center gap-4">
                      <div className="size-16 animate-pulse rounded-full bg-carbon-border/50" />
                      <div className="h-24 flex-1 space-y-2">
                        <div className="h-4 w-1/3 animate-pulse rounded bg-carbon-border/50" />
                        <div className="h-4 w-2/3 animate-pulse rounded bg-carbon-border/50" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                      <div
                        className="flex size-20 shrink-0 items-center justify-center rounded-full bg-carbon-accent/15 text-lg font-semibold text-carbon-accent ring-2 ring-carbon-border"
                        aria-hidden
                      >
                        {initialsFromUser(user)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <Label className="text-carbon-muted">Display name</Label>
                            <Input
                              readOnly
                              value={displayName(user)}
                              className="mt-1.5 border-carbon-border bg-carbon-page text-carbon-heading"
                            />
                          </div>
                          <div>
                            <Label className="text-carbon-muted">Email</Label>
                            <Input
                              readOnly
                              value={
                                user?.primaryEmailAddress?.emailAddress ??
                                user?.emailAddresses[0]?.emailAddress ??
                                ""
                              }
                              className="mt-1.5 border-carbon-border bg-carbon-page text-carbon-heading"
                            />
                          </div>
                        </div>
                        <p className="text-sm text-carbon-body">
                          Member since{" "}
                          <span className="text-carbon-heading">
                            {formatMemberSince(user?.createdAt ?? null)}
                          </span>
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-carbon-border bg-carbon-page text-carbon-heading hover:bg-carbon-border/30"
                          onClick={() => openUserProfile()}
                        >
                          Manage account
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {section === "notifications" && (
              <section
                aria-labelledby="settings-notifications-heading"
                className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
              >
                <h2
                  id="settings-notifications-heading"
                  className="mb-4 font-heading text-lg font-semibold text-carbon-heading"
                >
                  Notifications
                </h2>
                <div className="space-y-6 rounded-xl border border-carbon-border bg-carbon-surface p-6 shadow-sm">
                  <div className="space-y-4">
                    <ToggleRow
                      id="email-down"
                      label="Email when a monitor goes down"
                      checked={emailDown}
                      onCheckedChange={setEmailDown}
                      disabled={notifPending}
                    />
                    <ToggleRow
                      id="email-recovery"
                      label="Email when a monitor recovers"
                      checked={emailRecovery}
                      onCheckedChange={setEmailRecovery}
                      disabled={notifPending}
                    />
                    <ToggleRow
                      id="daily-summary"
                      label="Daily uptime summary email"
                      checked={dailySummary}
                      onCheckedChange={setDailySummary}
                      disabled={notifPending}
                    />
                    <ToggleRow
                      id="weekly-report"
                      label="Weekly report email"
                      checked={weeklyReport}
                      onCheckedChange={setWeeklyReport}
                      disabled={notifPending}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notification-email" className="text-carbon-body">
                      Notification email
                    </Label>
                    <Input
                      id="notification-email"
                      type="email"
                      autoComplete="email"
                      value={notifEmail}
                      onChange={(e) => setNotifEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="mt-1.5 border-carbon-border bg-carbon-page text-carbon-heading placeholder:text-carbon-muted"
                      disabled={notifPending}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      className={accentBtn}
                      disabled={notifPending}
                      onClick={saveNotifications}
                    >
                      {notifPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <p
                      className="text-sm text-carbon-body"
                      aria-live="polite"
                    >
                      {notifMsg?.ok ? (
                        <span className="text-carbon-success">{notifMsg.text}</span>
                      ) : notifMsg?.text ? (
                        <span className="text-carbon-danger">{notifMsg.text}</span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {section === "alerts" && (
              <section
                aria-labelledby="settings-alerts-heading"
                className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
              >
                <h2
                  id="settings-alerts-heading"
                  className="mb-4 font-heading text-lg font-semibold text-carbon-heading"
                >
                  Alert thresholds
                </h2>
                <div className="space-y-5 rounded-xl border border-carbon-border bg-carbon-surface p-6 shadow-sm">
                  <div>
                    <Label htmlFor="response-ms" className="text-carbon-body">
                      Response time threshold (ms)
                    </Label>
                    <p className="mt-0.5 text-xs text-carbon-muted">
                      Alert when response time exceeds this value
                    </p>
                    <Input
                      id="response-ms"
                      type="number"
                      min={100}
                      max={600000}
                      value={responseMs}
                      onChange={(e) => setResponseMs(e.target.value)}
                      className="mt-1.5 max-w-xs border-carbon-border bg-carbon-page text-carbon-heading"
                      disabled={alertPending}
                    />
                  </div>
                  <div>
                    <Label className="text-carbon-body">Downtime alert delay</Label>
                    <p className="mt-0.5 text-xs text-carbon-muted">
                      Wait this long after a failure before alerting
                    </p>
                    <Select
                      value={downtimeDelay}
                      onValueChange={setDowntimeDelay}
                      disabled={alertPending}
                    >
                      <SelectTrigger className="mt-1.5 max-w-xs">
                        <SelectValue placeholder="Select delay" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="2">2 minutes</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="cooldown" className="text-carbon-body">
                      Alert cooldown (minutes)
                    </Label>
                    <p className="mt-0.5 text-xs text-carbon-muted">
                      Do not repeat alerts more often than this interval
                    </p>
                    <Input
                      id="cooldown"
                      type="number"
                      min={1}
                      max={10080}
                      value={alertCooldown}
                      onChange={(e) => setAlertCooldown(e.target.value)}
                      className="mt-1.5 max-w-xs border-carbon-border bg-carbon-page text-carbon-heading"
                      disabled={alertPending}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      className={accentBtn}
                      disabled={alertPending}
                      onClick={saveAlerts}
                    >
                      {alertPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <p className="text-sm text-carbon-body" aria-live="polite">
                      {alertMsg?.ok ? (
                        <span className="text-carbon-success">{alertMsg.text}</span>
                      ) : alertMsg?.text ? (
                        <span className="text-carbon-danger">{alertMsg.text}</span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {section === "integrations" && (
              <section
                aria-labelledby="settings-integrations-heading"
                className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
              >
                <h2
                  id="settings-integrations-heading"
                  className="mb-4 font-heading text-lg font-semibold text-carbon-heading"
                >
                  Integrations
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-carbon-border bg-carbon-surface text-carbon-heading ring-carbon-border/60">
                    <CardHeader className="border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-carbon-accent/15 text-carbon-accent">
                            <Mail className="size-5" strokeWidth={1.75} />
                          </div>
                          <div>
                            <CardTitle className="text-carbon-heading">
                              Email (Resend)
                            </CardTitle>
                            <CardDescription className="text-carbon-body">
                              Outbound alert email via Resend
                            </CardDescription>
                          </div>
                        </div>
                        <StatusBadge connected={emailConnected} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs leading-relaxed text-carbon-muted">
                        This email receives alerts when a monitor goes down or
                        recovers (when enabled under Notifications).
                      </p>
                      {editingIntegrationEmail ? (
                        <>
                          <div>
                            <Label
                              htmlFor="integration-resend-email"
                              className="text-carbon-body"
                            >
                              Notification email
                            </Label>
                            <Input
                              id="integration-resend-email"
                              type="email"
                              value={integrationEmail}
                              onChange={(e) =>
                                setIntegrationEmail(e.target.value)
                              }
                              className="mt-1.5 border-carbon-border bg-carbon-page text-carbon-heading"
                              disabled={intEmailPending}
                              placeholder="you@company.com"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              className={accentBtn}
                              disabled={intEmailPending}
                              onClick={saveIntEmail}
                            >
                              {intEmailPending ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : null}
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-carbon-body hover:bg-carbon-border/30"
                              onClick={() => {
                                setIntegrationEmail(
                                  initialSettings?.notification_email ?? ""
                                );
                                setEditingIntegrationEmail(false);
                                setIntEmailMsg(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="truncate text-sm text-carbon-heading">
                            {integrationEmail || (
                              <span className="text-carbon-muted">Not set</span>
                            )}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 border-carbon-border bg-carbon-page"
                            onClick={() => setEditingIntegrationEmail(true)}
                          >
                            Edit
                          </Button>
                        </div>
                      )}
                      <p className="text-sm text-carbon-body" aria-live="polite">
                        {intEmailMsg?.ok ? (
                          <span className="text-carbon-success">{intEmailMsg.text}</span>
                        ) : intEmailMsg?.text ? (
                          <span className="text-carbon-danger">{intEmailMsg.text}</span>
                        ) : null}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-carbon-border bg-carbon-surface text-carbon-heading ring-carbon-border/60">
                    <CardHeader className="border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-[#5865F2]/20 text-[#5865F2]">
                            <MessagesSquare
                              className="size-5"
                              strokeWidth={1.75}
                            />
                          </div>
                          <div>
                            <CardTitle className="text-carbon-heading">
                              Discord
                            </CardTitle>
                            <CardDescription className="text-carbon-body">
                              Server alerts via webhook
                            </CardDescription>
                          </div>
                        </div>
                        <StatusBadge connected={discordConnected} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label
                          htmlFor="discord-webhook"
                          className="text-carbon-body"
                        >
                          Webhook URL
                        </Label>
                        <Input
                          id="discord-webhook"
                          type="url"
                          placeholder="https://discord.com/api/webhooks/…"
                          value={discordUrl}
                          onChange={(e) => setDiscordUrl(e.target.value)}
                          className="mt-1.5 border-carbon-border bg-carbon-page font-mono text-sm text-carbon-heading"
                          disabled={discordPending || discordTestPending}
                        />
                        <p className="mt-2 text-xs leading-relaxed text-carbon-muted">
                          Create a webhook in your Discord server under Server
                          Settings → Integrations → Webhooks
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Button
                          type="button"
                          className={accentBtn}
                          disabled={discordPending || discordTestPending}
                          onClick={saveDiscord}
                        >
                          {discordPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : null}
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-carbon-border bg-carbon-page text-carbon-heading hover:bg-carbon-border/30"
                          disabled={
                            discordPending ||
                            discordTestPending ||
                            !discordUrl.trim()
                          }
                          onClick={runDiscordTest}
                        >
                          {discordTestPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : null}
                          Test
                        </Button>
                        <div
                          className="flex w-full min-w-0 flex-col gap-1 text-sm text-carbon-body sm:w-auto"
                          aria-live="polite"
                        >
                          {discordMsg?.ok ? (
                            <span className="text-carbon-success">
                              {discordMsg.text}
                            </span>
                          ) : discordMsg?.text ? (
                            <span className="text-carbon-danger">
                              {discordMsg.text}
                            </span>
                          ) : null}
                          {discordTestMsg?.ok ? (
                            <span className="text-carbon-success">
                              {discordTestMsg.text}
                            </span>
                          ) : discordTestMsg?.text ? (
                            <span className="text-carbon-danger">
                              {discordTestMsg.text}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>
            )}

            {section === "danger" && (
              <section
                aria-labelledby="settings-danger-heading"
                className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
              >
                <h2
                  id="settings-danger-heading"
                  className="mb-4 font-heading text-lg font-semibold text-carbon-danger"
                >
                  Danger zone
                </h2>
                <div className="rounded-xl border-2 border-carbon-danger/45 bg-carbon-surface/80 p-6 shadow-sm">
                  <p className="text-sm text-carbon-body">
                    Actions below are <strong className="text-carbon-heading">permanent</strong>{" "}
                    and cannot be undone. Proceed only if you understand the impact.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      variant="destructive"
                      className="border-carbon-danger/50 bg-carbon-danger/15 text-carbon-danger hover:bg-carbon-danger/25"
                      onClick={() => setMonitorsOpen(true)}
                    >
                      Delete all monitors
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="border-carbon-danger/50 bg-carbon-danger/15 text-carbon-danger hover:bg-carbon-danger/25"
                      onClick={() => setAccountOpen(true)}
                    >
                      Delete account
                    </Button>
                  </div>
                </div>

                <Dialog open={monitorsOpen} onOpenChange={setMonitorsOpen}>
                  <DialogContent className="border-carbon-border bg-carbon-surface">
                    <DialogHeader>
                      <DialogTitle>Delete all monitors?</DialogTitle>
                      <DialogDescription>
                        This removes every monitor, check history, and related incidents for your
                        account. This cannot be reversed.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-carbon-border"
                        onClick={() => setMonitorsOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="bg-carbon-danger text-white hover:bg-carbon-danger/90"
                        disabled={delMonPending}
                        onClick={confirmDeleteMonitors}
                      >
                        {delMonPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        Delete all monitors
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
                  <DialogContent className="border-carbon-border bg-carbon-surface">
                    <DialogHeader>
                      <DialogTitle>Delete your account?</DialogTitle>
                      <DialogDescription>
                        Your NetPulse data and Clerk account will be removed. You will be signed
                        out immediately.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-carbon-border"
                        onClick={() => setAccountOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="bg-carbon-danger text-white hover:bg-carbon-danger/90"
                        disabled={delAccPending}
                        onClick={confirmDeleteAccount}
                      >
                        {delAccPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        Delete account
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-carbon-border/80 bg-carbon-page/40 px-4 py-3 transition-colors hover:border-carbon-border">
      <Label htmlFor={id} className="cursor-pointer text-sm text-carbon-heading">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <span className="shrink-0 rounded-full bg-carbon-success/15 px-2.5 py-0.5 text-xs font-medium text-carbon-success">
        Connected
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-carbon-warning/15 px-2.5 py-0.5 text-xs font-medium text-carbon-warning">
      Not configured
    </span>
  );
}
