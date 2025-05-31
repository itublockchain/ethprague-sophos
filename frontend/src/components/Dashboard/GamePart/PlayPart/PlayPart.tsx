import { MoveLeft } from "lucide-react";
import Link from "next/link";
import React from "react";
import PlayInterfacePart from "./PlayInterfacePart/PlayInterfacePart";

type Props = {
  gameId: string;
};

export default function PlayPart({ gameId }: Props) {
  return (
    <div id="root" className="flex flex-col w-full h-full gap-4">
      <Link
        href="/"
        id="label"
        className="flex flex-row gap-2 items-center text-sm hover:underline"
      >
        <MoveLeft />
        <div className="text-sm">Back to Game List</div>
      </Link>

      <PlayInterfacePart gameId={gameId} />
    </div>
  );
}
