"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ── Types ── */
export interface PeerState {
  userId: string;
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
}

export interface WebRTCHook {
  /** Local media stream */
  localStream: MediaStream | null;
  /** Connected peers */
  peers: Map<string, PeerState>;
  /** Start capturing mic + camera */
  startCapture: (video?: boolean, audio?: boolean) => Promise<void>;
  /** Stop all capture & connections */
  stopCapture: () => void;
  /** Signal received from the server */
  handleSignal: (from: string, type: string, payload: unknown) => Promise<void>;
  /** Are we connected to media? */
  isCapturing: boolean;
  /** Errors */
  error: string | null;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/**
 * WebRTC hook — manages local capture, peer connections, and signaling.
 * Call `handleSignal(from, type, payload)` with messages from the server.
 */
export function useWebRTC(userId: string, roomId: string, sendSignal: (toUser: string, signalType: string, payload: unknown) => Promise<void>): WebRTCHook {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [peers, setPeers] = useState<Map<string, PeerState>>(new Map());
  const sendSignalRef = useRef(sendSignal);
  sendSignalRef.current = sendSignal;

  // Keep track of pending offers we've sent (to avoid dupes)
  const pendingOffersRef = useRef<Set<string>>(new Set());

  const updatePeerState = useCallback((peerId: string, state: Partial<PeerState>) => {
    setPeers((prev) => {
      const next = new Map(prev);
      const existing = next.get(peerId) || { userId: peerId, stream: null, connectionState: "new" as RTCPeerConnectionState };
      next.set(peerId, { ...existing, ...state });
      return next;
    });
  }, []);

  const createPeerConnection = useCallback((peerUserId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // ICE candidate handler
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        void sendSignalRef.current(peerUserId, "ice-candidate", e.candidate.toJSON());
      }
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      updatePeerState(peerUserId, { connectionState: pc.connectionState });
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        peersRef.current.delete(peerUserId);
        setPeers((prev) => {
          const next = new Map(prev);
          next.delete(peerUserId);
          return next;
        });
      }
    };

    // Remote stream handler
    pc.ontrack = (e) => {
      if (e.streams[0]) {
        updatePeerState(peerUserId, { stream: e.streams[0] });
      }
    };

    // ICE connection state
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        updatePeerState(peerUserId, { connectionState: "failed" });
      }
    };

    peersRef.current.set(peerUserId, pc);
    updatePeerState(peerUserId, { userId: peerUserId, stream: null, connectionState: "connecting" });
    return pc;
  }, [localStream, updatePeerState]);

  const startCapture = useCallback(async (video = true, audio = true) => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: "user" } : false,
        audio,
      });
      setLocalStream(stream);
      setIsCapturing(true);

      // Add tracks to existing peer connections
      peersRef.current.forEach((pc) => {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
        // Re-negotiate
        void pc.createOffer().then((offer) => pc.setLocalDescription(offer));
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法访问摄像头/麦克风");
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
      setIsCapturing(false);
    }
    // Close all peer connections
    peersRef.current.forEach((pc) => {
      pc.close();
    });
    peersRef.current.clear();
    setPeers(new Map());
  }, [localStream]);

  const handleSignal = useCallback(async (from: string, type: string, payload: unknown) => {
    let pc = peersRef.current.get(from);

    if (type === "offer") {
      if (!pc) {
        pc = createPeerConnection(from);
      }
      // Prevent processing duplicate offers
      const offerKey = `${from}-offer`;
      if (pendingOffersRef.current.has(offerKey)) return;
      pendingOffersRef.current.add(offerKey);

      await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignalRef.current(from, "answer", pc.localDescription!.toJSON());
    } else if (type === "answer") {
      if (!pc) {
        pc = createPeerConnection(from);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
    } else if (type === "ice-candidate") {
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload as RTCIceCandidateInit));
      } catch {
        // ICE candidate may arrive before remote description — retry once
        await new Promise((r) => setTimeout(r, 500));
        try { await pc.addIceCandidate(new RTCIceCandidate(payload as RTCIceCandidateInit)); } catch {}
      }
    } else if (type === "hangup") {
      if (pc) {
        pc.close();
        peersRef.current.delete(from);
        setPeers((prev) => {
          const next = new Map(prev);
          next.delete(from);
          return next;
        });
      }
    }
  }, [createPeerConnection]);

  // Offer to new peers (called when we detect a new member)
  const offerToPeer = useCallback(async (peerUserId: string) => {
    if (peersRef.current.has(peerUserId)) return;
    const pc = createPeerConnection(peerUserId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignalRef.current(peerUserId, "offer", pc.localDescription!.toJSON());
  }, [createPeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      peersRef.current.forEach((pc) => pc.close());
    };
  }, [localStream]);

  return {
    localStream,
    peers,
    startCapture,
    stopCapture,
    handleSignal,
    isCapturing,
    error,
    // Expose offerToPeer so the room can call it when new members appear
    offerToPeer,
  } as WebRTCHook & { offerToPeer: (peerUserId: string) => Promise<void> };
}
