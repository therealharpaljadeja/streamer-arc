"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Donation {
  id: string;
  donorAddress: string;
  amount: number;
  message: string | null;
  sourceChain: string;
  status: string;
  createdAt: string;
}

function shortenAddress(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [balance, setBalance] = useState("0.00");
  const [donations, setDonations] = useState<Donation[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Withdraw
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const donateUrl = session?.user?.id
    ? `${appUrl}/donate/${session.user.id}`
    : "";
  const overlayUrl = session?.user?.id
    ? `${appUrl}/overlay/${session.user.id}`
    : "";

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/balance");
      const data = await res.json();
      setBalance(data.balance);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchDonations = useCallback(async () => {
    try {
      const res = await fetch(`/api/donations?page=${page}&limit=10`);
      const data = await res.json();
      setDonations(data.donations);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
      /* ignore */
    }
  }, [page]);

  const refreshDonationStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/donations/refresh", { method: "POST" });
      const data = await res.json();
      if (data.updated > 0) {
        fetchDonations();
        fetchBalance();
      }
    } catch {
      /* ignore */
    }
  }, [fetchDonations, fetchBalance]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchBalance();
      fetchDonations();
      refreshDonationStatuses();
    }
  }, [session, fetchBalance, fetchDonations, refreshDonationStatuses]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleWithdraw = async () => {
    if (!withdrawAddress || !withdrawAmount) return;
    setWithdrawing(true);
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationAddress: withdrawAddress,
          amount: withdrawAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Withdrawal initiated");
      setWithdrawOpen(false);
      setWithdrawAddress("");
      setWithdrawAmount("");
      fetchBalance();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Withdrawal failed"
      );
    } finally {
      setWithdrawing(false);
    }
  };

  const handleTestAlert = async () => {
    try {
      const res = await fetch(
        `/api/alerts/${session?.user?.id}/test`,
        { method: "POST" }
      );
      if (res.ok) {
        toast.success("Test alert sent to overlay");
      }
    } catch {
      toast.error("Failed to send test alert");
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    router.push("/");
    return null;
  }

  if (!session.user.hasOnboarded) {
    router.push("/onboarding");
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your streamer alerts and track donations.
        </p>
      </div>

      <Separator />

      {/* Quick Links */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Donation Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate bg-muted px-2 py-1 text-xs">
                {donateUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(donateUrl, "Donation URL")}
              >
                Copy
              </Button>
            </div>
            <div className="flex justify-center">
              <QRCodeSVG value={donateUrl} size={160} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">OBS Overlay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate bg-muted px-2 py-1 text-xs">
                {overlayUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(overlayUrl, "Overlay URL")}
              >
                Copy
              </Button>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Add as a Browser Source in OBS:</p>
              <ol className="list-inside list-decimal space-y-1">
                <li>Sources → Add → Browser</li>
                <li>Paste the overlay URL</li>
                <li>Set width: 800, height: 600</li>
              </ol>
            </div>
            <Button variant="outline" size="sm" onClick={handleTestAlert}>
              Send Test Alert
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Balance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">USDC Balance</CardTitle>
            <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Withdraw
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Withdraw USDC</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Destination Address</Label>
                    <Input
                      placeholder="0x..."
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (USDC)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleWithdraw}
                    disabled={withdrawing || !withdrawAddress || !withdrawAmount}
                  >
                    {withdrawing ? "Processing..." : "Confirm Withdrawal"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-4xl font-bold">{balance} USDC</p>
          {session.user.circleWalletAddress && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Wallet:</span>
              <code className="bg-muted px-2 py-1 text-xs">
                {shortenAddress(session.user.circleWalletAddress)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() =>
                  copyToClipboard(
                    session.user.circleWalletAddress!,
                    "Wallet address"
                  )
                }
              >
                Copy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-semibold">
                {donations
                  .filter((d) => d.status === "COMPLETED")
                  .reduce((sum, d) => sum + d.amount, 0)
                  .toFixed(2)}{" "}
                USDC
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-xl font-semibold">
                {donations.filter((d) => d.status === "COMPLETED").length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-xl font-semibold">
                {donations.filter((d) => d.status === "PENDING").length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-xl font-semibold">
                {donations.filter((d) => d.status === "FAILED").length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Donation History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Donation History</CardTitle>
        </CardHeader>
        <CardContent>
          {donations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No donations yet. Share your donation link to get started!
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Donor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donations.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {shortenAddress(d.donorAddress)}
                      </TableCell>
                      <TableCell>{d.amount} USDC</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {d.message || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {d.sourceChain}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            d.status === "COMPLETED"
                              ? "default"
                              : d.status === "FAILED"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {d.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
