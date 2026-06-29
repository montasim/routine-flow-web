export interface OtpStoreEntry {
  code: string;
  expires: number;
  name?: string;
  timezone?: string;
}

type GlobalWithOtpStore = typeof globalThis & {
  otpStore?: Map<string, OtpStoreEntry>;
};

export function getOtpStore() {
  const globalWithOtpStore = globalThis as GlobalWithOtpStore;

  if (!globalWithOtpStore.otpStore) {
    globalWithOtpStore.otpStore = new Map<string, OtpStoreEntry>();
  }

  return globalWithOtpStore.otpStore;
}
