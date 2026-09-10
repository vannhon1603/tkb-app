"use client";

import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function CustomTooltip({ 
  title, 
  children 
}: { 
  title: React.ReactNode; 
  children: React.ReactNode; 
}) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent className="bg-slate-800 text-white border-none px-3 py-1.5 text-xs font-medium shadow-md">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}
