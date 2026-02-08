"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCircleWallet } from "@/hooks/useCircleWallet";
import AlertDisplay from "@/components/AlertDisplay";

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Wallet
  const {
    status: walletStatus,
    walletAddress,
    error: walletError,
    createWallet,
  } = useCircleWallet();

  // Saved wallet from DB
  const [savedWalletAddress, setSavedWalletAddress] = useState<string | null>(null);

  // GIF upload
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("Google US English");
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [voiceSaved, setVoiceSaved] = useState(false);

  // Preview
  const [previewAlert, setPreviewAlert] = useState<{
    donorAddress: string;
    amount: number;
    message: string;
  } | null>(null);

  // Load existing settings
  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.circleWalletAddress) setSavedWalletAddress(data.circleWalletAddress);
        if (data.gifUrl) setGifUrl(data.gifUrl);
        if (data.voiceName) setVoiceName(data.voiceName);
        if (data.voiceRate) setVoiceRate(data.voiceRate);
        if (data.voicePitch) setVoicePitch(data.voicePitch);
      })
      .catch(() => {});
  }, []);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const v = speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    };
    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () =>
      speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const handleGifUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGifUrl(data.gifUrl);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  };

  const testVoice = () => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      "John donated 5 USDC! Great stream, keep it up!"
    );
    const voice = voices.find((v) => v.name === voiceName);
    if (voice) utterance.voice = voice;
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;
    speechSynthesis.speak(utterance);
  };

  const saveVoiceSettings = async () => {
    await fetch("/api/user/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceName, voiceRate, voicePitch }),
    });
    setVoiceSaved(true);
    setTimeout(() => setVoiceSaved(false), 2000);
  };

  const triggerPreview = useCallback(() => {
    setPreviewAlert(null);
    setTimeout(() => {
      setPreviewAlert({
        donorAddress: "0x1234567890abcdef1234567890abcdef12345678",
        amount: 5,
        message: "Great stream, keep it up!",
      });
    }, 50);
  }, []);

  const effectiveWalletAddress = walletAddress || savedWalletAddress;
  const isWalletDone = walletStatus === "done" || !!effectiveWalletAddress;
  const isFullyOnboarded = isWalletDone && !!gifUrl;

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

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Get Started</h1>
        <p className="mt-1 text-muted-foreground">
          Set up your streamer profile in a few steps.
        </p>
      </div>

      <Separator />

      {/* Step 1: Create Wallet */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">1. Create Wallet</CardTitle>
            {isWalletDone && <Badge variant="secondary">Complete</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {isWalletDone ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Your Arc Testnet wallet is ready.
              </p>
              <code className="block break-all bg-muted p-2 text-xs">
                {effectiveWalletAddress}
              </code>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Create a Circle wallet on Arc Testnet to receive donations.
              </p>
              <Button
                onClick={createWallet}
                disabled={
                  walletStatus !== "idle" && walletStatus !== "error"
                }
              >
                {walletStatus === "idle" || walletStatus === "error"
                  ? "Create Wallet"
                  : "Creating..."}
              </Button>
              {walletError && (
                <p className="text-sm text-destructive">{walletError}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Upload GIF */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">2. Upload Alert GIF</CardTitle>
            {gifUrl && <Badge variant="secondary">Complete</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload a GIF to display with donation alerts (max 5MB).
            </p>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/gif"
                onChange={handleGifUpload}
                disabled={uploading}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : gifUrl ? "Change GIF" : "Choose File"}
              </Button>
            </div>
            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
            {gifUrl && (
              <div className="mt-2 flex items-end gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gifUrl}
                  alt="Alert GIF preview"
                  className="h-24 w-24 border border-border object-contain"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setGifUrl(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Select Voice */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3. Configure TTS Voice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Voice</Label>
              <Select value={voiceName} onValueChange={setVoiceName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((v) => (
                    <SelectItem key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rate: {voiceRate.toFixed(1)}</Label>
              <Slider
                value={[voiceRate]}
                onValueChange={([val]) => setVoiceRate(val)}
                min={0.5}
                max={2}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <Label>Pitch: {voicePitch.toFixed(1)}</Label>
              <Slider
                value={[voicePitch]}
                onValueChange={([val]) => setVoicePitch(val)}
                min={0.5}
                max={2}
                step={0.1}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={testVoice}>
                Test Voice
              </Button>
              <Button onClick={saveVoiceSettings}>
                {voiceSaved ? "Saved!" : "Save Settings"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Alert Preview */}
      {gifUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4. Alert Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Preview how your donation alerts will look and sound.
              </p>
              <Button variant="outline" onClick={triggerPreview}>
                {previewAlert ? "Replay Preview" : "Play Preview"}
              </Button>
              <div className="flex min-h-[200px] items-center justify-center border border-border bg-muted/50">
                <AlertDisplay
                  gifUrl={gifUrl}
                  voiceName={voiceName}
                  voiceRate={voiceRate}
                  voicePitch={voicePitch}
                  alert={previewAlert}
                  onComplete={() => setPreviewAlert(null)}
                />
                {!previewAlert && (
                  <p className="text-sm text-muted-foreground">
                    Click &quot;Play Preview&quot; to see the alert
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue */}
      <div className="flex justify-end pb-8">
        <Button
          size="lg"
          disabled={!isFullyOnboarded}
          onClick={() => router.push("/dashboard")}
        >
          Continue to Dashboard
        </Button>
      </div>
    </div>
  );
}
