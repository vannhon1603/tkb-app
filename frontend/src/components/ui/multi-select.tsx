"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  placeholder?: string;
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
}

export function MultiSelect({
  options,
  placeholder,
  selected,
  onChange,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggleValue = (value: string) => {
    const exists = selected.includes(value);
    if (exists) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-[220px] justify-between bg-gray-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-sm",
            className
          )}
        >
          <span className="truncate">
            {selected.length > 0
              ? selected.join(", ")
              : placeholder ?? "Chọn..."}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Tìm kiếm..." />
          <CommandList>
            <CommandEmpty>Không tìm thấy</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  onSelect={() => toggleValue(opt.value)}
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-full border border-slate-400 dark:border-slate-600",
                      selected.includes(opt.value)
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "opacity-50"
                    )}
                  >
                    {selected.includes(opt.value) && <Check className="h-3 w-3" />}
                  </div>
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
