"use client";

import { useEffect, useState } from "react";

import { trpc } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { PageBody } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { Switch } from "@/components/ui/switch";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** The browser wants the public key as bytes, not base64url text. */
function keyToBytes(base64Url: string) {
  const padded = base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type Support = "checking" | "supported" | "needs-install" | "unsupported";

export default function NotificationsSettingsPage() {
  const utils = trpc.useUtils();
  const { data: status } = trpc.notification.status.useQuery();
  const subscribe = trpc.notification.subscribe.useMutation({ onSuccess: () => utils.notification.status.invalidate() });
  const unsubscribe = trpc.notification.unsubscribe.useMutation({ onSuccess: () => utils.notification.status.invalidate() });
  const sendTest = trpc.notification.sendTest.useMutation();

  const [support, setSupport] = useState<Support>("checking");
  const [thisDevice, setThisDevice] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "n/a">("n/a");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Capability checks run in the browser only.
    /* eslint-disable react-hooks/set-state-in-effect */
    const hasPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (!hasPush) {
      // On an iPhone the push APIs only exist once the app is opened from the Home Screen.
      setSupport(isIos && !standalone ? "needs-install" : "unsupported");
      return;
    }
    setSupport("supported");
    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setThisDevice(!!sub));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function turnOn() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setMessage("Notifications are blocked for Nest. Allow them in your phone's settings, then try again.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(PUBLIC_KEY) }));
      const json = sub.toJSON();
      await subscribe.mutateAsync({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent.slice(0, 280),
      });
      setThisDevice(true);
    } catch {
      setMessage("Couldn't switch notifications on for this device. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribe.mutateAsync({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setThisDevice(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageBody>
      <Section
        title="Reminder notifications"
        description="You get one message a day at 10:00 listing the reminders that are due for you, and one gentle nudge when something is 2 days overdue. After that it stays red in the app, but doesn't notify again."
      >
        {status && !status.configured && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            Notifications aren&apos;t set up on this server yet.
          </p>
        )}

        {support === "needs-install" && (
          <div className="rounded-2xl border p-4 text-sm">
            <p className="mb-2 font-semibold">First add Nest to your Home Screen</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Open Nest in Safari on your iPhone.</li>
              <li>
                Tap the Share button, then <b className="text-foreground">Add to Home Screen</b>.
              </li>
              <li>Open Nest from the Home Screen icon, come back to this page and switch notifications on.</li>
            </ol>
          </div>
        )}

        {support === "unsupported" && (
          <p className="text-sm text-muted-foreground">This browser can&apos;t receive notifications.</p>
        )}

        {support === "supported" && (
          <div className="flex items-center gap-4 rounded-2xl border p-4">
            <div className="min-w-0 flex-1">
              <div className="text-base font-medium md:text-sm">Notifications on this device</div>
              <div className="text-sm text-muted-foreground">
                {permission === "denied"
                  ? "Blocked — allow notifications for Nest in your device settings."
                  : thisDevice
                    ? "On — this device will get your reminders."
                    : "Off"}
              </div>
            </div>
            <Switch
              aria-label="Notifications on this device"
              checked={thisDevice}
              disabled={busy || !status?.configured || permission === "denied"}
              onCheckedChange={(on) => (on ? turnOn() : turnOff())}
            />
          </div>
        )}

        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}

        {status && (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => sendTest.mutate()}
              disabled={sendTest.isPending || status.devices === 0}
              className="self-start"
            >
              {sendTest.isPending ? "Sending…" : "Send me a test notification"}
            </Button>
            <p className="text-sm text-muted-foreground">
              {status.devices === 0
                ? "No device has notifications on yet."
                : `${status.devices} device${status.devices === 1 ? "" : "s"} will get your reminders.`}
              {sendTest.data && (sendTest.data.sent > 0 ? " Test sent — check your phone." : " It didn't reach any device.")}
            </p>
          </div>
        )}
      </Section>
    </PageBody>
  );
}
