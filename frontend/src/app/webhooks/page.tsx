"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getGroups,
  type Webhook,
  type WAGroup,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Webhook as WebhookIcon,
  ExternalLink,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FormData {
  groupJid: string;
  groupName: string;
  targetUrl: string;
  isActive: boolean;
}

const emptyForm: FormData = {
  groupJid: "",
  groupName: "",
  targetUrl: "",
  isActive: true,
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [groups, setGroups] = useState<WAGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [wh, gr] = await Promise.all([getWebhooks(), getGroups()]);
      setWebhooks(wh);
      setGroups(gr);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (wh: Webhook) => {
    setEditingId(wh.id);
    setForm({
      groupJid: wh.groupJid,
      groupName: wh.groupName,
      targetUrl: wh.targetUrl,
      isActive: wh.isActive,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (editingId) {
        await updateWebhook(editingId, {
          groupName: form.groupName,
          targetUrl: form.targetUrl,
          isActive: form.isActive,
        });
      } else {
        await createWebhook({
          groupJid: form.groupJid,
          groupName: form.groupName,
          targetUrl: form.targetUrl,
          isActive: form.isActive,
        });
      }
      setDialogOpen(false);
      await fetchData();
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setSubmitting(true);
    try {
      await deleteWebhook(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
      await fetchData();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (wh: Webhook) => {
    try {
      await updateWebhook(wh.id, { isActive: !wh.isActive });
      await fetchData();
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const handleGroupSelect = (groupId: string | null) => {
    if (!groupId) return;
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      setForm((prev) => ({
        ...prev,
        groupJid: group.id,
        groupName: group.subject,
      }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Webhook Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure which WhatsApp groups dispatch messages to your
            applications
          </p>
        </div>
        <Button id="add-webhook" onClick={openCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Webhook
        </Button>
      </div>

      {/* Table card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WebhookIcon className="w-5 h-5 text-primary" />
            Registered Webhooks
          </CardTitle>
          <CardDescription>
            {webhooks.length} webhook{webhooks.length !== 1 ? "s" : ""}{" "}
            configured
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <WebhookIcon className="w-12 h-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">No webhooks configured yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={openCreateDialog}
                className="mt-2"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add your first webhook
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group Name</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Group JID
                    </TableHead>
                    <TableHead>Target URL</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((wh) => (
                    <TableRow key={wh.id} className="group">
                      <TableCell className="font-medium">
                        {wh.groupName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {wh.groupJid}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 max-w-[200px]">
                          <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate text-sm">
                            {wh.targetUrl}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={wh.isActive}
                            onCheckedChange={() => handleToggle(wh)}
                          />
                          <Badge
                            variant={wh.isActive ? "default" : "secondary"}
                            className={cn(
                              "text-[10px]",
                              wh.isActive
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : ""
                            )}
                          >
                            {wh.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(wh)}
                            className="h-8 w-8"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(wh.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Webhook" : "Add Webhook"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the webhook configuration for this group."
                : "Configure a new group to dispatch messages to your application."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Group selector (only on create) */}
            {!editingId && groups.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Select from Connected Groups
                </Label>
                <Select onValueChange={handleGroupSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a WhatsApp group…" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.subject}{" "}
                        <span className="text-muted-foreground text-xs">
                          ({g.participants} members)
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={form.groupName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, groupName: e.target.value }))
                }
                placeholder="e.g. Team Support"
              />
            </div>

            {!editingId && (
              <div className="space-y-2">
                <Label htmlFor="groupJid">Group JID</Label>
                <Input
                  id="groupJid"
                  value={form.groupJid}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      groupJid: e.target.value,
                    }))
                  }
                  placeholder="e.g. 123456789@g.us"
                  className="font-mono text-sm"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="targetUrl">Target Webhook URL</Label>
              <Input
                id="targetUrl"
                value={form.targetUrl}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, targetUrl: e.target.value }))
                }
                placeholder="https://your-app.com/api/webhook"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingId ? "Save Changes" : "Create Webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Webhook?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Messages from this group will no
              longer be dispatched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
