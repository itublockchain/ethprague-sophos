import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";

export default function page() {
  return (
    <div id="root" className="flex w-full h-screen items-center justify-center">
      <Link href="/game">
        <Button>Open Game</Button>
      </Link>
    </div>
  );
}
