'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Onboarding, { isOnboardingComplete } from "@/components/Onboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    const done = isOnboardingComplete();
    if (done) {
      setAlreadyDone(true);
      router.replace("/");
    }
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen w-full bg-[#0B0D17] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#2A6FBB]/30 border-t-[#2A6FBB] animate-spin" />
      </div>
    );
  }

  if (alreadyDone) {
    return (
      <div className="min-h-screen w-full bg-[#0B0D17] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#2A6FBB]/30 border-t-[#2A6FBB] animate-spin" />
      </div>
    );
  }

  return (
    <Onboarding
      onComplete={() => {
        router.replace("/");
      }}
    />
  );
}
