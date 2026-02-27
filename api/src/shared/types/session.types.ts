export interface SessionResetJobData {
  userId: string;
}

export interface CanStartSessionResponse {
  canStartSession: boolean;
  userId: string;
  lastSessionAt?: Date;
  nextSessionAt?: Date;
  minutesUntilNextSession?: number;
}
