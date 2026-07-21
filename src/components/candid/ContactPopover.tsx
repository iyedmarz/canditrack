import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Contact } from "@/lib/mock-data";
import { Mail, Linkedin } from "lucide-react";

export function ContactPopover({ contact }: { contact?: Contact }) {
  if (!contact) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="rounded-sm text-left text-sm text-foreground hover:underline">
          {contact.name}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 border-border p-3 text-sm shadow-none"
      >
        <div className="font-medium text-foreground">{contact.name}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{contact.role}</div>
        <div className="mt-3 space-y-1.5 text-xs">
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-2 text-foreground hover:text-primary"
          >
            <Mail className="h-3.5 w-3.5" />
            {contact.email}
          </a>
          {contact.linkedin && (
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-foreground hover:text-primary"
            >
              <Linkedin className="h-3.5 w-3.5" />
              LinkedIn
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
