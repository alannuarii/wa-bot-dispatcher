"use client";

import { useEffect, useState, useCallback } from "react";
import { getLogs, clearLogs, type SystemLog } from "@/lib/api";
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
  ScrollText,
  Trash2,
  Loader2,
  Info,
  AlertTriangle,
  XCircle,
  RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const levelConfig = {
  INFO: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  WARNING: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  ERROR: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
};

export default function LogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await getLogs(200);
      setLogs(data);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearLogs();
      setLogs([]);
      setConfirmClear(false);
    } catch (err) {
      console.error("Failed to clear logs:", err);
    } finally {
      setClearing(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            System Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Activity and error logs from the bot dispatcher
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} className="gap-2">
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            id="clear-logs"
            variant="destructive"
            onClick={() => setConfirmClear(true)}
            className="gap-2"
            disabled={logs.length === 0}
          >
            <Trash2 className="w-4 h-4" />
            Clear Logs
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(["INFO", "WARNING", "ERROR"] as const).map((level) => {
          const cfg = levelConfig[level];
          const count = logs.filter((l) => l.level === level).length;
          const Icon = cfg.icon;
          return (
            <Card key={level} className={cn("border-l-4", cfg.border)}>
              <CardContent className="flex items-center gap-3 py-4">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    cfg.bg
                  )}
                >
                  <Icon className={cn("w-5 h-5", cfg.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{level}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Log entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" />
            Log Entries
          </CardTitle>
          <CardDescription>
            Showing latest {logs.length} entries
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <ScrollText className="w-12 h-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">No logs recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {logs.map((log) => {
                const cfg = levelConfig[log.level as keyof typeof levelConfig] || levelConfig.INFO;
                const Icon = cfg.icon;
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 px-6 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div
                      className={cn(
                        "mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                        cfg.bg
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            cfg.color,
                            cfg.border
                          )}
                        >
                          {log.level}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {formatTime(log.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 break-all">
                        {log.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clear confirmation */}
      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Logs?</DialogTitle>
            <DialogDescription>
              This will permanently delete all system log entries. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmClear(false)}
              disabled={clearing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClear}
              disabled={clearing}
            >
              {clearing && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
