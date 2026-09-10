import { de } from "date-fns/locale";
import * as Popover from "@radix-ui/react-popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ---------------- COMPONENTS ---------------- */
export default function MultiSelect({ label, values, setValues, options }: { label: string; values: string[]; setValues: (v: string[]) => void; options: string[] }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="outline" className="justify-between w-full text-sm">
          {values.length ? `${label} (${values.length})` : label}
        </Button>
      </Popover.Trigger>
      <Popover.Content className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md p-2 shadow-lg" align="start">
        <ScrollArea className="h-40 w-48">
          {options.map((opt: any, index: number) => (
            <div key={index} className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">
              <Checkbox
                checked={values.includes(opt)}
                onCheckedChange={(checked: any) => {
                  if (checked) setValues([...values, opt]);
                  else setValues(values.filter((v) => v !== opt));
                }}
              />
              <span className="text-sm">{opt}</span>
            </div>
          ))}
        </ScrollArea>
      </Popover.Content>
    </Popover.Root>
  );
}