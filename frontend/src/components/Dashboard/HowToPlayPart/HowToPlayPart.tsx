import React from "react";

const steps = [
  {
    title: "Connect Wallet",
    description:
      "Link your crypto wallet to start playing and manage your funds.",
  },
  {
    title: "Choose a Game",
    description:
      "Select an active chess game from the dashboard to participate in.",
  },
  {
    title: "Predict & Bet",
    description: "Predict the next move and place your bet on the outcome.",
  },
  {
    title: "Wait for Move",
    description: "Wait for the next move to be played in the chess game.",
  },
  {
    title: "Win or Lose",
    description:
      "If your prediction is correct, claim your winnings. If not, your bet is lost.",
  },
];

function Step({
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-3 border border-gray-300 rounded-md bg-gray-50">
      <div className="font-medium text-sm">
        <span className="mr-1 text-gray-500">{index + 1}.</span>
        {title}
      </div>
      <div className="text-xs text-gray-600">{description}</div>
    </div>
  );
}

export default function HowToPlayPart() {
  return (
    <div
      id="root"
      className="flex flex-col w-full h-full gap-5 border border-gray-500 rounded-lg p-5"
    >
      <div id="title" className="text-xl font-semibold">
        How to Play 🚀
      </div>

      <div id="steps" className="flex flex-col gap-3">
        {steps.map((step, idx) => (
          <Step
            key={idx}
            index={idx}
            title={step.title}
            description={step.description}
          />
        ))}
      </div>
    </div>
  );
}
