"use client";

import { useEffect, useState } from "react";

import { buildHomeDashboard, type HomeDashboard } from "@/modules/home/domain/home-dashboard";
import { HomeDashboardPanel } from "@/modules/home/presentation/home-dashboard-panel";
import { IndexedDbRecordingRepository, LocalPracticeDatabase } from "@/modules/local-recording/infrastructure/indexeddb-recording-repository";
import type { PracticeSession } from "@/modules/practice-session/domain/practice-session";

export default function HomePage() {
  const [dashboard, setDashboard] = useState<HomeDashboard | null>(null);

  useEffect(() => {
    const repository = new IndexedDbRecordingRepository(new LocalPracticeDatabase());
    void (async () => {
      const sessions = await repository.listPracticeSessions();
      const reviews = await Promise.all(sessions.map((session) => repository.findSelfReview(session.id)));
      const activeSession = getStoredPracticeSession();
      setDashboard(buildHomeDashboard({
        sessions,
        reviews: reviews.filter((review): review is NonNullable<typeof review> => review !== null),
        recordingCount: await repository.countStoredCompletedRecordings(),
        hasRecovery: activeSession?.preserveRecoverableData === true,
      }));
    })();
  }, []);

  return <HomeDashboardPanel dashboard={dashboard} />;
}

function getStoredPracticeSession(): PracticeSession | null {
  const stored = window.sessionStorage.getItem("client-talk-coach.practice-session");
  return stored ? JSON.parse(stored) as PracticeSession : null;
}
