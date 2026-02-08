import { EventEmitter } from "events";

interface DonationAlertData {
  id: string;
  donorAddress: string;
  donorName?: string;
  amount: number;
  message: string | null;
  sourceChain: string;
}

const globalForEmitter = globalThis as unknown as {
  alertEmitter: EventEmitter | undefined;
};

export const alertEmitter =
  globalForEmitter.alertEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForEmitter.alertEmitter = alertEmitter;
}

alertEmitter.setMaxListeners(100);

export function emitDonationAlert(
  streamerId: string,
  donation: DonationAlertData
) {
  alertEmitter.emit(`donation:${streamerId}`, donation);
}
