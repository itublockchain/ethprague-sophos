"use client";

import React, { Suspense } from "react";
import WalletPart from "./WalletPart/WalletPart";

import HowToPlayPart from "./HowToPlayPart/HowToPlayPart";
import GamePart from "./GamePart/GamePart";

export default function Dashboard() {
  return (
    <div
      id="root"
      className="flex flex-col w-full lg:flex-row lg:h-screen lg:max-h-screen gap-5 p-5 lg:p-14"
    >
      <div
        id="wallet-how-to-play-part"
        className="flex flex-col w-full lg:w-1/5 max-h-full overflow-auto gap-5 "
      >
        <WalletPart />
        <HowToPlayPart />
      </div>
      <div id="game-part" className="w-full max-h-full overflow-auto lg:w-4/5">
        <Suspense fallback={<div>Loading...</div>}>
          <GamePart />
        </Suspense>
      </div>
    </div>
  );
}
