"use client";

import { useEffect, useState } from "react";
import { getStatus, type BotStatusResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, QrCode, Loader2 } from "lucide-react";

const statusConfig = {
  CONNECTED: {
    label: "Connected",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    dot: "bg-emerald-400",
    icon: Wifi,
  },
  DISCONNECTED: {
    label: "Disconnected",
    color: "text-red-400",
    bg: "bg-red-400/10",
    dot: "bg-red-400",
    icon: WifiOff,
  },
  QR_READY: {
    label: "QR Ready",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    dot: "bg-amber-400",
    icon: QrCode,
  },
  CONNECTING: {
    label: "Connecting…",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    dot: "bg-blue-400",
    icon: Loader2,
  },
};

export function StatusHeader() {
  const [status, setStatus] = useState<BotStatusResponse["status"]>("DISCONNECTED");

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const data = await getStatus();
        if (active) setStatus(data.status);
      } catch {
        if (active) setStatus("DISCONNECTED");
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-6 md:px-8 sticky top-0 z-20">
      {/* Left: spacer for mobile hamburger */}
      <div className="w-10 md:w-0" />

      {/* Right: status badge */}
      <div
        className={cn(
          "flex items-center gap-2.5 px-4 py-1.5 rounded-full border",
          cfg.bg,
          cfg.color,
          "border-current/20"
        )}
      >
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
              cfg.dot
            )}
          />
          <span
            className={cn("relative inline-flex rounded-full h-2 w-2", cfg.dot)}
          />
        </span>
        <Icon className={cn("w-3.5 h-3.5", status === "CONNECTING" && "animate-spin")} />
        <span className="text-xs font-semibold tracking-wide">{cfg.label}</span>
      </div>
    </header>
  );
}
