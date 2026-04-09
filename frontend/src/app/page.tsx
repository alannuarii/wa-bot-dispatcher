"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getStatus,
  restartBot,
  logoutBot,
  type BotStatusResponse,
} from "@/lib/api";
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
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  QrCode,
  Loader2,
  RotateCcw,
  LogOut,
  Smartphone,
  Shield,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function DashboardPage() {
  const [statusData, setStatusData] = useState<BotStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<
    "restart" | "logout" | null
  >(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getStatus();
      setStatusData(data);
    } catch {
      setStatusData({ status: "DISCONNECTED", qrCode: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction === "restart") await restartBot();
      else await logoutBot();
      await fetchStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const status = statusData?.status || "DISCONNECTED";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor and control your WhatsApp Bot session
        </p>
      </div>

      {/* Status cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={cn("border-l-4", status === "CONNECTED" ? "border-l-emerald-500" : status === "QR_READY" ? "border-l-amber-500" : "border-l-red-500")}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs">
              <Wifi className="w-3.5 h-3.5" />
              Connection Status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{status}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs">
              <Shield className="w-3.5 h-3.5" />
              Session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">
              {status === "CONNECTED" ? "Authenticated" : "Not Active"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs">
              <Zap className="w-3.5 h-3.5" />
              Dispatcher
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">
              {status === "CONNECTED" ? "Active" : "Idle"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main session card */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Session Controller
          </CardTitle>
          <CardDescription>
            Manage your WhatsApp connection — scan QR code or control the
            session
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : status === "QR_READY" && statusData?.qrCode ? (
            /* QR Code display */
            <div className="flex flex-col items-center gap-6 py-6">
              <div className="relative p-4 bg-white rounded-2xl shadow-2xl glow-green">
                <Image
                  src={statusData.qrCode}
                  alt="WhatsApp QR Code"
                  width={280}
                  height={280}
                  className="rounded-lg"
                  unoptimized
                />
              </div>
              <div className="text-center space-y-2">
                <Badge
                  variant="outline"
                  className="text-amber-400 border-amber-400/30 bg-amber-400/10"
                >
                  <QrCode className="w-3 h-3 mr-1.5" />
                  Waiting for scan
                </Badge>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Open WhatsApp on your phone → Linked Devices → Link a
                  Device → Scan this QR code
                </p>
              </div>
            </div>
          ) : status === "CONNECTED" ? (
            /* Connected state */
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center glow-green">
                <Wifi className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xl font-semibold text-emerald-400">
                  Connected
                </p>
                <p className="text-sm text-muted-foreground">
                  Bot is online and listening to messages
                </p>
              </div>
            </div>
          ) : status === "CONNECTING" ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
              <p className="text-muted-foreground">Connecting to WhatsApp…</p>
            </div>
          ) : (
            /* Disconnected state */
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center glow-red">
                <WifiOff className="w-10 h-10 text-red-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xl font-semibold text-red-400">
                  Disconnected
                </p>
                <p className="text-sm text-muted-foreground">
                  Bot is offline — try restarting or re-scanning QR code
                </p>
              </div>
            </div>
          )}
        </CardContent>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-wrap gap-3 justify-center border-t border-border pt-6">
          <Button
            id="restart-bot"
            variant="outline"
            onClick={() => setConfirmAction("restart")}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restart Bot
          </Button>
          <Button
            id="logout-bot"
            variant="destructive"
            onClick={() => setConfirmAction("logout")}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout Session
          </Button>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "restart"
                ? "Restart Bot?"
                : "Logout Session?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "restart"
                ? "This will restart the WhatsApp connection. The bot may be briefly unavailable."
                : "This will clear the session. You will need to scan the QR code again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction === "logout" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {confirmAction === "restart" ? "Restart" : "Logout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
