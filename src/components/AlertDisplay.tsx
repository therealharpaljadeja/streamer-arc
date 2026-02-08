"use client";

import { useState, useEffect, useCallback } from "react";

interface AlertData {
  donorAddress: string;
  amount: number;
  message?: string;
}

interface AlertDisplayProps {
  gifUrl: string;
  voiceName: string;
  voiceRate: number;
  voicePitch: number;
  alert: AlertData | null;
  onComplete?: () => void;
}

function shortenAddress(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function AlertDisplay({
  gifUrl,
  voiceName,
  voiceRate,
  voicePitch,
  alert,
  onComplete,
}: AlertDisplayProps) {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

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

  useEffect(() => {
    if (!alert) return;

    let cancelled = false;
    setVisible(true);
    setFadeOut(false);

    const run = async () => {
      const donor = shortenAddress(alert.donorAddress);
      const headerText = `${donor} donated ${alert.amount} USDC!`;
      await speakMessage(headerText);

      if (alert.message && !cancelled) {
        await speakMessage(alert.message);
      }

      if (!cancelled) {
        setFadeOut(true);
        setTimeout(() => {
          setVisible(false);
          setFadeOut(false);
          onComplete?.();
        }, 500);
      }
    };

    run();

    return () => {
      cancelled = true;
      speechSynthesis.cancel();
    };
  }, [alert, speakMessage, onComplete]);

  if (!alert || !visible) return null;

  return (
    <div
      className={`flex flex-col items-center gap-4 transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={gifUrl}
        alt="Alert animation"
        className="h-40 w-40 object-contain"
      />
      <div className="text-center">
        <p
          className="text-2xl font-bold"
          style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
        >
          {shortenAddress(alert.donorAddress)} donated {alert.amount} USDC!
        </p>
        {alert.message && (
          <p
            className="mt-2 text-lg"
            style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.8)" }}
          >
            {alert.message}
          </p>
        )}
      </div>
    </div>
  );
}
