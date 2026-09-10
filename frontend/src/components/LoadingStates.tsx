"use client";

import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSpinner({ size = "default", text }: { size?: "sm" | "default" | "lg"; text?: string }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    default: "w-6 h-6",
    lg: "w-10 h-10",
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-[#0969da]`} />
      {text && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{text}</p>}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="border border-[#d0d7de] dark:border-[#30363d] rounded-lg p-5 bg-white dark:bg-[#161b22] space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-[#d0d7de] dark:border-[#30363d] rounded-lg overflow-hidden bg-white dark:bg-[#161b22]">
      <div className="p-4 border-b border-[#d0d7de] dark:border-[#30363d]">
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="divide-y divide-[#d0d7de] dark:divide-[#30363d]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
