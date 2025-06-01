import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { ShineBorder } from "@/components/magicui/shine-border";
import { useBestMove } from "@/hooks/useBestMove";
import { useChessMoves } from "@/hooks/useGetMoves";
import { GamePreviewData, BetData } from "@/types/Chess";
import { GameState } from "@/types/Index";
import Image from "next/image";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";

type Props = {
  gameData: GamePreviewData | null;
  selectedMove: string | null;
  setSelectedMove: (move: string) => void;
  hoveredMove: string | null;
  setHoveredMove: (move: string | null) => void;
  onPlaceBet: (predictedMove: string, betAmount: number) => void;
  currentBet: BetData | null;
  gameState: GameState;
};

const BET_AMOUNT_LIMITS = {
  MIN: 0,
  MAX: 100,
  STEP: 1,
  DEFAULT: 30,
} as const;

const MOVE_COLORS = {
  BEST: {
    selected:
      "bg-green-600 hover:bg-green-700 border-green-500 text-white shadow-lg",
    unselected:
      "bg-white hover:bg-green-600 border-green-400 text-black shadow-md",
    indicator: "bg-green-500",
  },
  OTHER: {
    selected:
      "bg-blue-600 hover:bg-blue-700 border-blue-500 text-white shadow-lg",
    unselected:
      "bg-white hover:bg-blue-50 border-gray-300 text-gray-700 shadow-sm hover:border-blue-400",
    indicator: "bg-blue-500",
  },
} as const;

export default function BetPart({
  gameData,
  selectedMove,
  setSelectedMove,
  hoveredMove,
  setHoveredMove,
  onPlaceBet,
  currentBet,
  gameState,
}: Props) {
  const fen = gameData?.fen || "";

  const { bestMove } = useBestMove({ fen });
  const { moves } = useChessMoves(fen);
  const [betAmount, setBetAmount] = useState<number>(BET_AMOUNT_LIMITS.DEFAULT);

  const [amount, setAmount] = useState(100); // Start with initial balance of $100
  const previousBetRef = useRef<BetData | null>(null);

  // Effect to handle balance updates based on bet status changes
  useEffect(() => {
    const previousBet = previousBetRef.current;

    // If there's a current bet and it's different from the previous one
    if (currentBet && (!previousBet || currentBet !== previousBet)) {
      // If the bet just transitioned from null to pending, deduct the bet amount
      if (currentBet.status === "pending" && !previousBet) {
        setAmount((prevAmount) =>
          Math.max(0, prevAmount - currentBet.betAmount)
        );
      }

      // If the bet was resolved (transitioned from pending to won/lost)
      if (
        previousBet?.status === "pending" &&
        currentBet.status !== "pending"
      ) {
        if (currentBet.status === "won") {
          // Add back the bet amount plus winnings (2x the bet amount for winning)
          setAmount((prevAmount) => prevAmount + currentBet.betAmount * 2);
        }
        // If lost, the money was already deducted when the bet was placed
        // so no additional action needed
      }
    }

    // Update the ref to track the current bet for next comparison
    previousBetRef.current = currentBet;
  }, [currentBet]);

  // Memoized utility functions
  const formatMove = useCallback((from: string, to: string): string => {
    return `${from.toUpperCase()}${to.toUpperCase()}`;
  }, []);

  const getMoveKey = useCallback((from: string, to: string): string => {
    return `${from.toLowerCase()}${to.toLowerCase()}`;
  }, []);

  // Check if there's a pending bet
  const hasPendingBet = useMemo(
    () => currentBet?.status === "pending",
    [currentBet]
  );

  // Memoized computed values
  const isSubmitEnabled = useMemo(
    () =>
      Boolean(
        selectedMove && betAmount > BET_AMOUNT_LIMITS.MIN && !hasPendingBet
      ),
    [selectedMove, betAmount, hasPendingBet]
  );

  const submitButtonText = useMemo(() => {
    if (hasPendingBet) {
      return (
        <>
          🎯 Pending Bet
          <span className="ml-2 text-sm opacity-90">
            {currentBet?.predictedMove?.toUpperCase()} - $
            {currentBet?.betAmount}
          </span>
        </>
      );
    }

    if (isSubmitEnabled) {
      return (
        <>
          Submit Bet! 🎯
          <span className="ml-2 text-sm opacity-90">
            {selectedMove?.toUpperCase()} - ${betAmount}
          </span>
        </>
      );
    }
    return "Select a move and bet amount";
  }, [isSubmitEnabled, selectedMove, betAmount, hasPendingBet, currentBet]);

  // Event handlers
  const handleBetAmountChange = useCallback((value: number[]) => {
    setBetAmount(value[0]);
  }, []);

  const handleMoveSelect = useCallback(
    (move: string) => {
      if (!hasPendingBet) {
        setSelectedMove(move);
      }
    },
    [setSelectedMove, hasPendingBet]
  );

  const handleMoveHover = useCallback(
    (move: string | null) => {
      if (!hasPendingBet) {
        setHoveredMove(move);
      }
    },
    [setHoveredMove, hasPendingBet]
  );

  const handleSubmitBet = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      if (isSubmitEnabled && selectedMove) {
        onPlaceBet(selectedMove, betAmount);
      }
    },
    [isSubmitEnabled, selectedMove, betAmount, onPlaceBet]
  );

  // Loading state
  if (bestMove === null) {
    return (
      <div className="flex flex-col w-full h-full gap-6 p-4">
        <Header />
        <div className="flex justify-center items-center h-32">
          <Spinner className="w-8 h-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full items-center gap-6 bg-gray-100 p-10">
      {/* <Header /> */}

      <div className="flex flex-col justify-between w-full h-full">
        <div
          id="room-owner-and-label"
          className="flex flex-row justify-between"
        >
          <div id="owner" className="text-2xl font-thin">
            Yunus's Room
          </div>

          <Image src="/images/sophos.png" alt="close" width={32} height={32} />
        </div>

        <div
          id="total-balance"
          className="flex flex-col justify-center items-center gap-3"
        >
          <div id="balance" className="text-xl font-thin">
            Total Balance
          </div>
          <div id="amount" className="text-7xl font-bold">
            ${amount}
          </div>
        </div>

        <MoveSelection
          bestMove={bestMove}
          moves={moves}
          selectedMove={selectedMove}
          hoveredMove={hoveredMove}
          onMoveSelect={handleMoveSelect}
          onMoveHover={handleMoveHover}
          formatMove={formatMove}
          getMoveKey={getMoveKey}
          disabled={hasPendingBet}
        />

        {/* <BetAmountSection
          betAmount={betAmount}
          onBetAmountChange={handleBetAmountChange}
          disabled={hasPendingBet}
        /> */}

        {/* <SubmitButton
          isEnabled={isSubmitEnabled}
          text={submitButtonText}
          onClick={handleSubmitBet}
          isPending={hasPendingBet}
        /> */}
      </div>

      <CustomScrollbarStyles />
    </div>
  );
}

// Sub-components for better organization
function Header() {
  return (
    <div className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
      What&apos;s gonna be the next move?
    </div>
  );
}

interface MoveSelectionProps {
  bestMove: string;
  moves: Array<{ from: string; to: string }>;
  selectedMove: string | null;
  hoveredMove: string | null;
  onMoveSelect: (move: string) => void;
  onMoveHover: (move: string | null) => void;
  formatMove: (from: string, to: string) => string;
  getMoveKey: (from: string, to: string) => string;
  disabled?: boolean;
}

function MoveSelection({
  bestMove,
  moves,
  selectedMove,
  onMoveSelect,
  onMoveHover,
  formatMove,
  getMoveKey,
  disabled = false,
}: MoveSelectionProps) {
  // Sample bet amounts for display - in a real app this would come from props or state
  const sampleBetAmount = 5;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Best Move with Shine Border */}
      <div className="relative">
        <div
          className={`flex flex-row items-center justify-between p-4 rounded-lg border ${
            selectedMove === bestMove
              ? "bg-green-50 border-green-200"
              : "bg-white border-gray-200"
          } cursor-pointer transition-all duration-200 ${
            disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"
          }`}
          onClick={() => !disabled && onMoveSelect(bestMove)}
          onMouseEnter={() => !disabled && onMoveHover(bestMove)}
          onMouseLeave={() => !disabled && onMoveHover(null)}
        >
          <div className="flex items-center gap-4">
            {/* Chess piece icon (queen/crown for best move) */}
            <div className="text-2xl">👑</div>

            {/* Arrow */}
            <div className="text-gray-400">→</div>

            {/* Move notation */}
            <div className="text-lg font-medium text-gray-800">
              {bestMove.toUpperCase()}
            </div>
          </div>

          {/* Bet amount */}
          <div className="text-lg font-semibold text-gray-800">
            {sampleBetAmount}$
          </div>
        </div>

        {/* Shine Border Effect for Best Move */}
        <ShineBorder
          shineColor={["#FFD700", "#FFA500", "#FFD700"]}
          duration={3}
          borderWidth={2}
          className="rounded-lg"
        />
      </div>

      {/* Other Moves - Show exactly 3 to make total 4 */}
      {moves
        .filter((move) => getMoveKey(move.from, move.to) !== bestMove)
        .slice(0, 3) // Show only first 3 other moves to make total 4
        .map((move, index) => {
          const moveKey = getMoveKey(move.from, move.to);
          const isSelected = selectedMove === moveKey;

          return (
            <div
              key={`${move.from}-${move.to}-${index}`}
              className={`flex flex-row items-center justify-between p-4 rounded-lg border ${
                isSelected
                  ? "bg-blue-50 border-blue-200"
                  : "bg-white border-gray-200"
              } cursor-pointer transition-all duration-200 ${
                disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"
              }`}
              onClick={() => !disabled && onMoveSelect(moveKey)}
              onMouseEnter={() => !disabled && onMoveHover(moveKey)}
              onMouseLeave={() => !disabled && onMoveHover(null)}
            >
              <div className="flex items-center gap-4">
                {/* Chess piece icon (queen/crown for other moves too) */}
                <div className="text-2xl">👑</div>

                {/* Arrow */}
                <div className="text-gray-400">→</div>

                {/* Move notation */}
                <div className="text-lg font-medium text-gray-800">
                  {formatMove(move.from, move.to)}
                </div>
              </div>

              {/* Bet amount */}
              <div className="text-lg font-semibold text-gray-800">
                ${sampleBetAmount}
              </div>
            </div>
          );
        })}
    </div>
  );
}

interface SectionHeaderProps {
  color: string;
  title: string;
  animated?: boolean;
}

function SectionHeader({ color, title, animated = false }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-3 h-3 ${color} rounded-full ${
          animated ? "animate-pulse" : ""
        }`}
      />
      <span className="font-bold text-gray-800">{title}</span>
    </div>
  );
}

interface BetAmountSectionProps {
  betAmount: number;
  onBetAmountChange: (value: number[]) => void;
  disabled?: boolean;
}

function BetAmountSection({
  betAmount,
  onBetAmountChange,
  disabled = false,
}: BetAmountSectionProps) {
  return (
    <div
      className={`flex flex-col gap-4 border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-white shadow-lg lg:mt-auto ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <SectionHeader
        color="bg-yellow-500"
        title="How much do you want to bet?"
      />

      <div className="flex flex-row gap-4 items-center">
        <div className="flex-1">
          <Slider
            min={BET_AMOUNT_LIMITS.MIN}
            max={BET_AMOUNT_LIMITS.MAX}
            step={BET_AMOUNT_LIMITS.STEP}
            value={[betAmount]}
            onValueChange={onBetAmountChange}
            className="w-full"
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-center font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-xl px-6 py-3 border-2 border-yellow-400 shadow-md min-w-[80px]">
          ${betAmount}
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-500 px-1">
        <span>${BET_AMOUNT_LIMITS.MIN}</span>
        <span>${BET_AMOUNT_LIMITS.MAX / 2}</span>
        <span>${BET_AMOUNT_LIMITS.MAX}</span>
      </div>
    </div>
  );
}

interface SubmitButtonProps {
  isEnabled: boolean;
  text: React.ReactNode;
  onClick: () => void;
  isPending?: boolean;
}

function SubmitButton({
  isEnabled,
  text,
  onClick,
  isPending = false,
}: SubmitButtonProps) {
  return (
    <Button
      type="button"
      className={`w-full h-14 font-bold text-lg transition-all duration-300 border-2 ${
        isPending
          ? "bg-yellow-500 hover:bg-yellow-600 border-yellow-400 text-white shadow-lg cursor-wait"
          : isEnabled
          ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-purple-500 text-white shadow-lg hover:scale-[1.02] hover:shadow-xl"
          : "bg-gray-400 border-gray-300 text-gray-600 cursor-not-allowed"
      }`}
      disabled={!isEnabled || isPending}
      onClick={onClick}
    >
      {text}
    </Button>
  );
}

function CustomScrollbarStyles() {
  return (
    <style jsx>{`
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }

      .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 10px;
      }

      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
      }

      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    `}</style>
  );
}
