"use strict";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
// Wait, I saw dropdown-menu.tsx but not popover.tsx in the list.
// Let me double check usage of Popover in other files.
// Checking admin/projects/new/page.tsx showed Select usage. 
// Let's assume Popover exists or check import. 
// Actually, looking at the previous list_dir, I DID NOT see popover.tsx.
// I saw: alert-dialog, alert, badge, button, card, checkbox, dialog, dropdown-menu, input, label, select, separator, sonner, table, tabs, textarea.
// NO popover.tsx. 
// So I should use DropdownMenu for this.

import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type Option = {
    label: string;
    value: string;
};

interface MultiSelectProps {
    options: Option[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select options...",
    className,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);

    const handleSelect = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((item) => item !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const handleRemove = (value: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selected.filter((item) => item !== value));
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between h-auto min-h-[10px] py-2", className)}
                >
                    <div className="flex flex-wrap gap-1 items-center">
                        {selected.length > 0 ? (
                            selected.map((val) => {
                                const option = options.find((o) => o.value === val);
                                return (
                                    <Badge key={val} variant="secondary" className="mr-1 mb-1">
                                        {option?.label || val}
                                        <X
                                            className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                                            onClick={(e) => handleRemove(val, e)}
                                        />
                                    </Badge>
                                );
                            })
                        ) : (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-[300px] max-h-[300px] overflow-y-auto">
                <DropdownMenuLabel>{placeholder}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {options.map((option) => (
                    <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={selected.includes(option.value)}
                        onCheckedChange={() => handleSelect(option.value)}
                    >
                        {option.label}
                    </DropdownMenuCheckboxItem>
                ))}
                {options.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">No options available</div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
