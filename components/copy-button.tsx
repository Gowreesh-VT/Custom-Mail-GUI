"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps extends Omit<ButtonProps, "onClick"> {
  text: string;
  label?: string;
  successMessage?: string;
}

export function CopyButton({
  text,
  label,
  successMessage = "Copied to clipboard",
  className,
  variant = "ghost",
  size = "icon",
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(successMessage);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("transition-all", className)}
      title={label || "Copy to clipboard"}
      {...props}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500 animate-in zoom-in-50 duration-150" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
      )}
      {label && <span className="ml-1.5 text-xs">{copied ? "Copied" : label}</span>}
    </Button>
  );
}
