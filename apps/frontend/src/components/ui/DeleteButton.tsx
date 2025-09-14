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
      size={size}
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      className={`h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 ${className}`}
      title={title}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
