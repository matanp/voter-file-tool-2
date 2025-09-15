import React from "react";
import { Button } from "~/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteButtonProps {
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

export function DeleteButton({
  onClick,
  disabled = false,
  size = "sm",
  variant = "ghost",
  className = "",
  title = "Delete",
}: DeleteButtonProps) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      className={`h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10 ${className}`}
      title={title}
      aria-label={title}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
