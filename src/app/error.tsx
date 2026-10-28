"use client";
import { buttonClass, Notice } from "@/components/ui";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-xl space-y-4">
      <Notice tone="danger" title="Something went wrong loading this page.">The error was logged on the server. Your data has not been changed.</Notice>
      <button className={buttonClass("secondary")} onClick={reset}>Try again</button>
    </div>
  );
}
