import React from "react";
import bgImage from "@/assets/ChatGPT Image Sep 20, 2026, 02_23_27 AM.png";
import "./SunsetBackground.css";

export function SunsetBackground({ children }) {
  return (
    <div className="sunset-bg-wrapper">
      <div className="chat-background">
        <img
          src={bgImage}
          className="background-image pointer-events-none select-none"
          alt="Chat application sunset background"
        />

        <div className="sun-glow" />

        <div className="water-reflection">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="bulb bulb-1" />
        <div className="bulb bulb-2" />
        <div className="bulb bulb-3" />
        <div className="bulb bulb-4" />
        <div className="bulb bulb-5" />

        {/* Content anchored to the artwork stage */}
        {children}
      </div>
    </div>
  );
}
