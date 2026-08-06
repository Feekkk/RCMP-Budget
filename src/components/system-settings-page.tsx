import { useEffect, useState, type ComponentType } from "react";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import {
  listSystemSettings,
  updateSystemSetting,
  type SystemSetting,
} from "@/lib/settings-fns";
import { cn } from "@/lib/utils";

export function SystemSettingsPage({
  Sidebar,
}: {
  Sidebar: ComponentType;
}) {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    listSystemSettings()
      .then((rows) => {
        if (active) setSettings(rows);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load settings. Refresh and try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleSetting = async (setting: SystemSetting) => {
    if (savingId != null) return;
    const nextEnabled = !setting.enabled;
    setSavingId(setting.id);
    setSettings((prev) =>
      prev.map((row) =>
        row.id === setting.id
          ? {
              ...row,
              enabled: nextEnabled,
              value: nextEnabled ? 1 : 0,
            }
          : row,
      ),
    );
    try {
      const updated = await updateSystemSetting({
        data: { settingId: setting.id, enabled: nextEnabled },
      });
      setSettings((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row)),
      );
      toast.success(
        nextEnabled
          ? `${setting.name} turned on`
          : `${setting.name} turned off`,
      );
    } catch (error) {
      setSettings((prev) =>
        prev.map((row) =>
          row.id === setting.id
            ? {
                ...row,
                enabled: setting.enabled,
                value: setting.enabled ? 1 : 0,
              }
            : row,
        ),
      );
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update that setting. Try again.",
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div>
          <h1 className="font-display text-4xl">Settings</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Turn system options on or off for Budget Tracker.
          </p>
        </div>

        {loading ? (
          <div className="mt-8 rounded-[1.5rem] border border-dashed border-foreground/15 bg-background py-16 text-center shadow-card">
            <p className="text-sm text-foreground/50">Loading settings…</p>
          </div>
        ) : settings.length === 0 ? (
          <div className="mt-8 rounded-[1.5rem] border border-dashed border-foreground/15 bg-background py-16 text-center shadow-card">
            <Settings2 className="mx-auto h-8 w-8 text-foreground/30" />
            <p className="mt-3 text-sm text-foreground/50">
              No settings found yet. Ask IT to add them in the database.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-[1.5rem] bg-background shadow-card">
            <ul className="divide-y divide-foreground/10">
              {settings.map((setting) => (
                <li
                  key={setting.id}
                  className="flex items-center justify-between gap-4 px-6 py-5 md:px-8"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium">
                      {setting.name}
                    </p>
                    <p className="mt-1 text-sm text-foreground/50">
                      Click On/Off to change this option.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={savingId === setting.id}
                    onClick={() => void toggleSetting(setting)}
                    aria-pressed={setting.enabled}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition",
                      setting.enabled
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-foreground/10 text-foreground/60 hover:bg-foreground/15",
                      savingId === setting.id && "opacity-60",
                    )}
                  >
                    {setting.enabled ? "On" : "Off"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
