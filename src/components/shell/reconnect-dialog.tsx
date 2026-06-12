"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConnectionStore } from "@/stores/connection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ReconnectDialog() {
  const router = useRouter();
  const { connection, dismiss } = useConnectionStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (connection.isActive && connection.roomCode) {
      // Small delay so page renders first
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [connection.isActive, connection.roomCode]);

  if (!connection.isActive || !connection.roomCode) return null;

  const elapsedSec = connection.connectedAt
    ? Math.floor((Date.now() - new Date(connection.connectedAt).getTime()) / 1000)
    : 0;
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedText = elapsedMin > 0 ? `${elapsedMin} 分钟` : `${elapsedSec} 秒`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>检测到未完成的连线</DialogTitle>
          <DialogDescription>
            你之前在房间 <span className="font-mono text-primary font-bold">{connection.roomCode}</span> 中连线，
            已持续约 {elapsedText}。是否继续加入？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => {
              dismiss();
              setOpen(false);
            }}
          >
            放弃并结算
          </Button>
          <Button
            onClick={() => {
              setOpen(false);
              router.push(`/room/${connection.roomCode}`);
            }}
          >
            继续连线
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
