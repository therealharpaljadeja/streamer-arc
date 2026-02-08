"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface AlertData {
  id: string;
  donorAddress: string;
  donorName?: string;
  amount: number;
  message: string | null;
  sourceChain: string;
}

interface OverlayClientProps {
  streamerId: string;
  gifUrl: string;
  voiceName: string;
  voiceRate: number;
  voicePitch: number;
}

function shortenAddress(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function OverlayClient({
  streamerId,
  gifUrl,
  voiceName,
  voiceRate,
  voicePitch,
}: OverlayClientProps) {
  const [currentAlert, setCurrentAlert] = useState<AlertData | null>(null);
  const [fadeOut, setFadeOut] = useState(false);
  const queueRef = useRef<AlertData[]>([]);
  const processingRef = useRef(false);

  const speakMessage = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!("speechSynthesis" in window)) {
          resolve();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = speechSynthesis.getVoices();
        const selectedVoice = voices.find((v) => v.name === voiceName);
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.rate = voiceRate;
        utterance.pitch = voicePitch;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        speechSynthesis.speak(utterance);
      });
    },
    [voiceName, voiceRate, voicePitch]
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return;
    processingRef.current = true;

    const alert = queueRef.current.shift()!;
    setCurrentAlert(alert);
    setFadeOut(false);

    // Speak header
    const donor = alert.donorName ?? shortenAddress(alert.donorAddress);
    await speakMessage(`${donor} donated ${alert.amount} USDC!`);

    // Speak message
    if (alert.message) {
      await speakMessage(alert.message);
    }

    // Fade out
    setFadeOut(true);
    await new Promise((r) => setTimeout(r, 500));

    setCurrentAlert(null);
    setFadeOut(false);
    processingRef.current = false;

    // Process next in queue
    if (queueRef.current.length > 0) {
      processQueue();
    }
  }, [speakMessage]);

  // Track which donation IDs we've already shown
  const shownIdsRef = useRef<Set<string>>(new Set());

  const enqueueAlert = useCallback(
    (data: AlertData) => {
      if (shownIdsRef.current.has(data.id)) return;
      shownIdsRef.current.add(data.id);
      queueRef.current.push(data);
      if (!processingRef.current) {
        processQueue();
      }
    },
    [processQueue]
  );

  useEffect(() => {
    // Load voices
    speechSynthesis.getVoices();

    // SSE for instant alerts
    const eventSource = new EventSource(
      `/api/alerts/${streamerId}/stream`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") return;
        enqueueAlert(data);
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      // Will auto-reconnect
    };

    // Polling fallback — catches donations if SSE drops
    let lastCheck = new Date().toISOString();
    const poll = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/alerts/${streamerId}/latest?after=${encodeURIComponent(lastCheck)}`
        );
        if (!res.ok) return;
        const { donation } = await res.json();
        if (donation && !shownIdsRef.current.has(donation.id)) {
          enqueueAlert({
            id: donation.id,
            donorAddress: donation.donorAddress,
            amount: donation.amount,
            message: donation.message,
            sourceChain: donation.sourceChain,
          });
        }
      } catch {
        // Ignore
      }
    }, 10000);

    return () => {
      eventSource.close();
      clearInterval(poll);
      speechSynthesis.cancel();
    };
  }, [streamerId, enqueueAlert]);

  if (!currentAlert) return null;

  return (
    <div className="overlay-container">
      <div className={`alert-wrapper ${fadeOut ? "fade-out" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={gifUrl} alt="Alert" className="alert-gif" />
        <div className="alert-text">
          <p className="alert-header">
            {currentAlert.donorName ?? shortenAddress(currentAlert.donorAddress)} donated{" "}
            {currentAlert.amount} USDC!
          </p>
          {currentAlert.message && (
            <p className="alert-message">{currentAlert.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
