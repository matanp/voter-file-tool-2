import React from "react";
import { Button } from "~/components/ui/button";
import { Copy } from "lucide-react";

interface CopyButtonProps {
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  className?: string;
  title?: string;
}

export function CopyButton({
  onClick,
  disabled = false,
  size = "sm",
  variant = "ghost",
  className = "",
  title = "Copy",
}: CopyButtonProps) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      className={`h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 ${className}`}
      title={title}
      aria-label={title}
    >
      <Copy className="h-4 w-4" />
    </Button>
  );
}
