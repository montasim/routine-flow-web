import React from "react";
import { LogOut, Trash2, AlertTriangle, Download, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmModal({ config, onConfirm, onCancel }: { config: any, onConfirm: () => void, onCancel: () => void }) {
  const tone = config.confirmTone || "danger";
  
  let IconComponent = AlertTriangle;
  if (config.icon === "log-out") IconComponent = LogOut;
  if (config.icon === "trash") IconComponent = Trash2;
  if (config.icon === "download") IconComponent = Download;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md bg-[var(--surface-card)] border-[var(--border-default)]">
        <DialogHeader className="flex flex-col items-center text-center gap-2">
          <div style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: tone === "danger" ? "var(--missed-100)" : "var(--signal-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: tone === "danger" ? "var(--missed-600)" : "var(--interactive)", display: "inline-flex" }}>
              <IconComponent size={24} />
            </span>
          </div>
          <DialogTitle className="text-xl font-bold font-display tracking-tight text-[var(--text-primary)]">
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--text-secondary)] leading-relaxed text-center">
            {config.body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:justify-center w-full mt-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1 h-11 border-[1.5px] border-[var(--border-default)] font-medium text-base hover:bg-[var(--surface-sunken)]"
          >
            {config.cancelLabel || "Cancel"}
          </Button>
          <Button 
            variant={tone === "danger" ? "destructive" : "default"} 
            onClick={onConfirm}
            className="flex-1 h-11 font-medium text-base"
            style={{ background: tone === "danger" ? "var(--missed-600)" : "var(--interactive)", color: "#fff" }}
          >
            {config.confirmLabel || "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
