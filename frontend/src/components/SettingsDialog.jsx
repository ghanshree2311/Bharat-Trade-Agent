import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Gear, TelegramLogo, Bank, Check, X, PaperPlaneTilt, ArrowsClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "../lib/api";

const StatusBadge = ({ ok, label }) => (
  <span className="mono text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 border flex items-center gap-1"
    style={{
      color: ok ? "#059669" : "#525252",
      borderColor: ok ? "#6EE7B7" : "#E5E7EB",
      backgroundColor: ok ? "#D1FAE5" : "#F3F4F6",
    }}>
    {ok ? <Check size={10} weight="bold" /> : <X size={10} weight="bold" />} {label}
  </span>
);

export default function SettingsDialog({ onChange }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState(null);
  const [tgToken, setTgToken] = useState("");
  const [tgChat, setTgChat] = useState("");
  const [growwToken, setGrowwToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/settings");
      setS(data);
      setTgChat(data.telegram_chat_id || "");
    } catch { /* ignore */ }
  };

  useEffect(() => { if (open) { load(); setTgToken(""); setGrowwToken(""); } }, [open]);

  const saveTelegram = async () => {
    setSaving(true);
    try {
      const body = { telegram_chat_id: tgChat };
      if (tgToken) body.telegram_bot_token = tgToken;
      await api.put("/settings", body);
      toast.success("Telegram settings saved");
      await load();
      onChange?.();
    } catch { toast.error("Save failed"); }
    setSaving(false);
  };

  const testTelegram = async () => {
    try {
      await api.post("/settings/telegram/test");
      toast.success("Test message sent — check Telegram!");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Test failed");
    }
  };

  const saveGroww = async () => {
    setSaving(true);
    try {
      await api.put("/settings", { groww_api_token: growwToken });
      toast.success("Groww token saved");
      setGrowwToken("");
      await load();
    } catch { toast.error("Save failed"); }
    setSaving(false);
  };

  const syncGroww = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post("/broker/groww/sync");
      toast.success(`Synced ${data.imported} holdings from Groww`);
      onChange?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Sync failed");
    }
    setSyncing(false);
  };

  const StatusBadge2 = () => null; // unused, kept for backward compat

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          data-testid="settings-button"
          variant="outline"
          className="rounded-sm border-[#E5E7EB] h-9 px-3 gap-2 text-[#0A0A0A]"
        >
          <Gear size={16} weight="bold" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-sm max-w-2xl border-[#E5E7EB]" data-testid="settings-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Settings & Integrations</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="telegram" className="pt-2">
          <TabsList className="rounded-sm bg-[#F3F4F6] border border-[#E5E7EB]">
            <TabsTrigger value="telegram" data-testid="tab-telegram" className="rounded-sm gap-2 data-[state=active]:bg-white">
              <TelegramLogo size={14} weight="duotone" /> Telegram Alerts
            </TabsTrigger>
            <TabsTrigger value="groww" data-testid="tab-groww" className="rounded-sm gap-2 data-[state=active]:bg-white">
              <Bank size={14} weight="duotone" /> Groww Broker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="telegram" className="pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg">Telegram Bot</h3>
              <StatusBadge ok={s?.telegram_configured} label={s?.telegram_configured ? "Connected" : "Not connected"} />
            </div>

            <div className="bg-[#F3F4F6] border border-[#E5E7EB] p-3 text-xs text-[#525252] leading-relaxed">
              <p className="font-medium text-[#0A0A0A] mb-1">Setup in 90 seconds:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Open Telegram, search <span className="mono">@BotFather</span>, send <span className="mono">/newbot</span> and follow prompts.</li>
                <li>BotFather gives you a <span className="mono">Bot Token</span> — paste it below.</li>
                <li>Message your new bot (send &quot;hi&quot;), then open <span className="mono">https://api.telegram.org/bot&lt;YOUR_TOKEN&gt;/getUpdates</span> in browser and copy the <span className="mono">chat.id</span> value.</li>
                <li>Paste chat ID → Save → Send Test.</li>
              </ol>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-[#525252]">Bot Token</Label>
              <Input
                data-testid="input-telegram-token"
                type="password"
                placeholder={s?.telegram_bot_token_masked || "123456:ABC-DEF..."}
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
                className="mono rounded-sm mt-1 border-[#E5E7EB]"
              />
              {s?.telegram_bot_token_masked && (
                <p className="text-[10px] text-[#525252] mono mt-1">Currently: {s.telegram_bot_token_masked}</p>
              )}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#525252]">Chat ID</Label>
              <Input
                data-testid="input-telegram-chat"
                placeholder="e.g., 123456789"
                value={tgChat}
                onChange={(e) => setTgChat(e.target.value)}
                className="mono rounded-sm mt-1 border-[#E5E7EB]"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={saveTelegram} disabled={saving}
                data-testid="save-telegram-btn"
                className="rounded-sm bg-[#0A0A0A] hover:bg-[#262626] text-white"
              >
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                onClick={async () => {
                  setSaving(true);
                  try {
                    const { data } = await api.post("/settings/telegram/autodetect");
                    toast.success(`Detected chat ID ${data.chat_id} — Telegram connected!`);
                    await load(); onChange?.();
                  } catch (e) {
                    toast.error(e?.response?.data?.detail || "Auto-detect failed");
                  }
                  setSaving(false);
                }}
                data-testid="autodetect-telegram-btn"
                variant="outline"
                className="rounded-sm border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF] gap-2"
              >
                <ArrowsClockwise size={14} weight="bold" />
                Auto-detect Chat ID
              </Button>
              <Button
                onClick={testTelegram}
                disabled={!s?.telegram_configured}
                variant="outline"
                data-testid="test-telegram-btn"
                className="rounded-sm border-[#E5E7EB] gap-2"
              >
                <PaperPlaneTilt size={14} weight="bold" />
                Send Test
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="groww" className="pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg">Groww Broker</h3>
              <StatusBadge ok={s?.groww_configured} label={s?.groww_configured ? "Connected" : "Not connected"} />
            </div>

            <div className="bg-[#FEF3C7] border border-[#FCD34D] p-3 text-xs text-[#78350F] leading-relaxed">
              <p className="font-medium mb-1">⚠️ Groww API requires a paid subscription (₹499/mo)</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Open Groww app → Profile → <span className="mono">Trading API</span> → subscribe (₹499/month).</li>
                <li>On <span className="mono">groww.in/trade-api</span> web dashboard, generate an <span className="mono">Access Token</span> (TOTP flow recommended — never expires).</li>
                <li>SEBI requires <span className="mono">static IP whitelisting</span> — add your server IP in the Groww dashboard.</li>
                <li>Paste the token below → Save → click &quot;Sync Holdings&quot;.</li>
              </ol>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-[#525252]">Groww Access Token</Label>
              <Input
                data-testid="input-groww-token"
                type="password"
                placeholder={s?.groww_api_token_masked || "Paste your Groww API token"}
                value={growwToken}
                onChange={(e) => setGrowwToken(e.target.value)}
                className="mono rounded-sm mt-1 border-[#E5E7EB]"
              />
              {s?.groww_api_token_masked && (
                <p className="text-[10px] text-[#525252] mono mt-1">Currently: {s.groww_api_token_masked}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={saveGroww} disabled={saving || !growwToken}
                data-testid="save-groww-btn"
                className="rounded-sm bg-[#0A0A0A] hover:bg-[#262626] text-white"
              >
                {saving ? "Saving…" : "Save Token"}
              </Button>
              <Button
                onClick={syncGroww}
                disabled={!s?.groww_configured || syncing}
                variant="outline"
                data-testid="sync-groww-btn"
                className="rounded-sm border-[#E5E7EB] gap-2"
              >
                <ArrowsClockwise size={14} weight="bold" className={syncing ? "animate-spin" : ""} />
                {syncing ? "Syncing…" : "Sync Holdings"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
