"use client";

import React, { createContext, useContext, useState } from "react";
import type { MascotMood } from "./mascot-assets";

interface MascotContextType {
  mood: MascotMood;
  message: string | null;
  isOpen: boolean;
  setMood: (mood: MascotMood) => void;
  setMessage: (msg: string | null) => void;
  setNoriState: (mood: MascotMood, msg?: string | null) => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
}

const MascotContext = createContext<MascotContextType | undefined>(undefined);

export function MascotProvider({ children }: { children: React.ReactNode }) {
  const [mood, setMoodState] = useState<MascotMood>("default");
  const [message, setMessageState] = useState<string | null>(null);
  const [isOpen, setIsOpenState] = useState(false);

  const setMood = (newMood: MascotMood) => setMoodState(newMood);
  const setMessage = (msg: string | null) => setMessageState(msg);
  const setNoriState = (newMood: MascotMood, msg?: string | null) => {
    setMoodState(newMood);
    if (msg !== undefined) setMessageState(msg);
  };
  const toggleOpen = () => setIsOpenState((prev) => !prev);
  const setOpen = (open: boolean) => setIsOpenState(open);

  return (
    <MascotContext.Provider
      value={{
        mood,
        message,
        isOpen,
        setMood,
        setMessage,
        setNoriState,
        toggleOpen,
        setOpen,
      }}
    >
      {children}
    </MascotContext.Provider>
  );
}

export function useMascot() {
  const context = useContext(MascotContext);
  if (!context) {
    throw new Error("useMascot must be used within a MascotProvider");
  }
  return context;
}
