"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import { sourceForLaunchFile } from "@/lib/launch-files";

type LaunchFileHandle = {
  getFile: () => Promise<File>;
};

type LaunchParams = {
  files?: LaunchFileHandle[];
};

type LaunchQueue = {
  setConsumer: (consumer: (params: LaunchParams) => void | Promise<void>) => void;
};

type LaunchWindow = Window & {
  launchQueue?: LaunchQueue;
};

export function PWAFileLaunchHandler() {
  const router = useRouter();
  const startedAt = useSession((s) => s.startedAt);
  const reset = useSession((s) => s.reset);
  const setSource = useSession((s) => s.setSource);
  const setPendingLaunchFile = useSession((s) => s.setPendingLaunchFile);
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const stateRef = useRef({
    startedAt,
    reset,
    setSource,
    setPendingLaunchFile,
    setPrerecordStage,
  });

  useEffect(() => {
    stateRef.current = {
      startedAt,
      reset,
      setSource,
      setPendingLaunchFile,
      setPrerecordStage,
    };
  }, [reset, setPendingLaunchFile, setPrerecordStage, setSource, startedAt]);

  useEffect(() => {
    const launchQueue = (window as LaunchWindow).launchQueue;
    if (!launchQueue?.setConsumer) return;

    let mounted = true;

    launchQueue.setConsumer(async (params) => {
      const firstHandle = params.files?.[0];
      if (!firstHandle) return;

      const {
        startedAt: activeStartedAt,
        reset: currentReset,
        setSource: currentSetSource,
        setPendingLaunchFile: currentSetPendingLaunchFile,
        setPrerecordStage: currentSetPrerecordStage,
      } = stateRef.current;

      if (activeStartedAt) return;

      const file = await firstHandle.getFile();
      if (!mounted) return;

      const source = sourceForLaunchFile(file);
      if (!source) return;

      currentReset();
      currentSetPendingLaunchFile(file);
      currentSetSource(source);
      currentSetPrerecordStage("selected");
      router.replace("/session");
    });

    return () => {
      mounted = false;
    };
  }, [router]);

  return null;
}
