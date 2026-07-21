import type { CandidatureStatus } from "@/lib/mock-data";
import { STATUS_LABELS } from "@/lib/mock-data";
import { StatusBadge } from "./StatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export function StatusSelect({
  value,
  onChange,
}: {
  value: CandidatureStatus;
  onChange: (s: CandidatureStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group inline-flex items-center gap-1 rounded-sm outline-none">
          <StatusBadge status={value} />
          <ChevronDown className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 border-border">
        {(Object.keys(STATUS_LABELS) as CandidatureStatus[]).map((s) => (
          <DropdownMenuItem key={s} onClick={() => onChange(s)} className="text-sm">
            <StatusBadge status={s} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
