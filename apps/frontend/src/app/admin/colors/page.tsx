import React from "react";

const colors = [
  { name: "background", className: "bg-background text-foreground" },
  { name: "foreground", className: "bg-foreground text-background" },
  { name: "card", className: "bg-card text-card-foreground" },
  { name: "card-foreground", className: "bg-card-foreground text-card" },
  { name: "popover", className: "bg-popover text-popover-foreground" },
  {
    name: "popover-foreground",
    className: "bg-popover-foreground text-popover",
  },
  { name: "primary", className: "bg-primary text-primary-foreground" },
  {
    name: "primary-foreground",
    className: "bg-primary-foreground text-primary",
  },
  { name: "secondary", className: "bg-secondary text-secondary-foreground" },
  {
    name: "secondary-foreground",
    className: "bg-secondary-foreground text-secondary",
  },
  { name: "muted", className: "bg-muted text-muted-foreground" },
  { name: "muted-foreground", className: "bg-muted-foreground text-muted" },
  { name: "accent", className: "bg-accent text-accent-foreground" },
  { name: "accent-foreground", className: "bg-accent-foreground text-accent" },
  {
    name: "destructive",
    className: "bg-destructive text-destructive-foreground",
  },
  {
    name: "destructive-foreground",
    className: "bg-destructive-foreground text-destructive",
  },
  { name: "border", className: "border border-border" },
  { name: "input", className: "border border-input" },
  { name: "ring", className: "ring ring-ring" },
];

const ColorReference = () => {
  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
      {colors.map((color) => (
        <div key={color.name} className={`rounded-md p-4 ${color.className}`}>
          <p>{color.name}</p>
        </div>
      ))}
    </div>
  );
};

export default ColorReference;
