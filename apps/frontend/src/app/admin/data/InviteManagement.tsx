"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { PrivilegeLevel } from "@prisma/client";
import { Calendar, User, Mail } from "lucide-react";
import { useToast } from "~/components/ui/use-toast";
import { DeleteButton } from "~/components/ui/DeleteButton";
import { CopyButton } from "~/components/ui/CopyButton";

interface Invite {
  id: string;
  email: string;
  token: string;
  privilegeLevel: PrivilegeLevel;
  customMessage: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  createdBy: string;
}

interface CreateInviteData {
  email: string;
  privilegeLevel: PrivilegeLevel;
  customMessage?: string;
  expiresInDays?: number;
}

interface InvitesResponse {
  invites: Invite[];
}

interface ErrorResponse {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export function InviteManagement() {
  const { toast } = useToast();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateInviteData>({
    email: "",
    privilegeLevel: PrivilegeLevel.ReadAccess,
    customMessage: "",
    expiresInDays: 7,
  });

  // Fetch invites
  const fetchInvites = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/invites");
      if (response.ok) {
        const data = (await response.json()) as unknown as InvitesResponse;
        setInvites(data.invites);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch invites",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching invites:", error);
      toast({
        title: "Error",
        description: "Failed to fetch invites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchInvites();
  }, [fetchInvites]);

  // Create invite
  const createInvite = async () => {
    if (!formData.email || !formData.privilegeLevel) {
      toast({
        title: "Error",
        description: "Email and privilege level are required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Invite created successfully",
        });
        setFormData({
          email: "",
          privilegeLevel: PrivilegeLevel.ReadAccess,
          customMessage: "",
          expiresInDays: 7,
        });
        void fetchInvites(); // Refresh the list
      } else {
        const errorData = (await response.json()) as unknown as ErrorResponse;
        toast({
          title: "Error",
          description: errorData.error || "Failed to create invite",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating invite:", error);
      toast({
        title: "Error",
        description: "Failed to create invite",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const copyInviteUrl = async (invite: Invite) => {
    const baseUrl = window.location.origin;
    const inviteUrl = `${baseUrl}/auth/invite/${invite.token}`;
    await navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Success",
      description: "Invite URL copied to clipboard",
    });
  };

  const deleteInvite = async (inviteId: string, email: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the invite for ${email}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeleting(inviteId);
    try {
      const response = await fetch(`/api/admin/invites?id=${inviteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Invite deleted successfully",
        });
        void fetchInvites(); // Refresh the list
      } else {
        const errorData = (await response.json()) as unknown as ErrorResponse;
        toast({
          title: "Error",
          description: errorData.error || "Failed to delete invite",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting invite:", error);
      toast({
        title: "Error",
        description: "Failed to delete invite",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPrivilegeColor = (level: PrivilegeLevel) => {
    switch (level) {
      case PrivilegeLevel.Developer:
        return "bg-purple-100 text-purple-800";
      case PrivilegeLevel.Admin:
        return "bg-red-100 text-red-800";
      case PrivilegeLevel.RequestAccess:
        return "bg-yellow-100 text-yellow-800";
      case PrivilegeLevel.ReadAccess:
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return <div>Loading invites...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="privilegeLevel">Privilege Level</Label>
              <Select
                value={formData.privilegeLevel}
                onValueChange={(value: PrivilegeLevel) =>
                  setFormData({ ...formData, privilegeLevel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PrivilegeLevel.ReadAccess}>
                    Read Access
                  </SelectItem>
                  <SelectItem value={PrivilegeLevel.RequestAccess}>
                    Request Access
                  </SelectItem>
                  <SelectItem value={PrivilegeLevel.Admin}>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customMessage">Custom Message (Optional)</Label>
            <Textarea
              id="customMessage"
              placeholder="Welcome message for the new user..."
              value={formData.customMessage}
              onChange={(e) =>
                setFormData({ ...formData, customMessage: e.target.value })
              }
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresInDays">Expires In (Days)</Label>
            <Select
              value={formData.expiresInDays?.toString()}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  expiresInDays: parseInt(value),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select expiration period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="15">15 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createInvite} disabled={creating}>
            {creating ? "Creating..." : "Create Invite"}
          </Button>
        </CardContent>
      </Card>

      {/* Invites List */}
      <Card>
        <CardHeader>
          <CardTitle>Invites ({invites.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            You can send invitees the invite URL, or they can login directly
            with a matching email address.
          </p>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-muted-foreground">No invites found</p>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{invite.email}</span>
                      <Badge
                        className={getPrivilegeColor(invite.privilegeLevel)}
                        hoverable={false}
                      >
                        {invite.privilegeLevel}
                      </Badge>
                      {invite.usedAt ? (
                        <Badge variant="secondary" hoverable={false}>
                          Used
                        </Badge>
                      ) : new Date(invite.expiresAt) < new Date() ? (
                        <Badge variant="destructive" hoverable={false}>
                          Expired
                        </Badge>
                      ) : (
                        <Badge variant="outline" hoverable={false}>
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <CopyButton
                        onClick={() => copyInviteUrl(invite)}
                        title="Copy invite URL"
                      />
                      <DeleteButton
                        disabled={deleting === invite.id}
                        onClick={() => deleteInvite(invite.id, invite.email)}
                        title="Delete invite"
                      />
                    </div>
                  </div>

                  {invite.customMessage && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Message for user:</strong> {invite.customMessage}
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {invite.usedAt
                          ? `Used: ${formatDate(invite.usedAt)}`
                          : `Expires: ${formatDate(invite.expiresAt)}`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>Created: {formatDate(invite.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
