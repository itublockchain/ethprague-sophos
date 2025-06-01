"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import React from "react";

export default function page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col relative overflow-hidden">
      {/* Enhanced Background decoration with more layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-20 right-20 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl animate-bounce"
          style={{ animationDelay: "0.5s" }}
        ></div>
        <div
          className="absolute bottom-32 left-32 w-24 h-24 bg-pink-400/20 rounded-full blur-xl animate-bounce"
          style={{ animationDelay: "1.5s" }}
        ></div>

        {/* Floating grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMC41IiBmaWxsPSJyZ2JhKDU5LCAxMzAsIDI0NiwgMC4xKSIvPgo8L3N2Zz4K')] opacity-40"></div>
      </div>

      {/* Enhanced Header with glassmorphism */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 backdrop-blur-xl bg-white/70 shadow-2xl border-b border-white/30">
        <div className="flex items-center group">
          <div className="relative overflow-hidden rounded-full p-1 bg-gradient-to-r from-blue-500 to-purple-600">
            <Image
              src="/images/sophos.png"
              alt="Sophos Logo"
              width={40}
              height={40}
              className="rounded-full transition-transform hover:scale-110 duration-500 hover:rotate-12"
            />
          </div>
          <div className="ml-3 hidden sm:block">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Sophos
            </h1>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          <Link
            href="#"
            className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 hover:scale-105 relative group px-3 py-2 rounded-lg hover:bg-white/50"
          >
            Home
            <span className="absolute -bottom-1 left-3 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-[calc(100%-1.5rem)] rounded-full"></span>
          </Link>
          <Link
            href="#"
            className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 hover:scale-105 relative group px-3 py-2 rounded-lg hover:bg-white/50"
          >
            Games
            <span className="absolute -bottom-1 left-3 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-[calc(100%-1.5rem)] rounded-full"></span>
          </Link>
          <Link
            href="#"
            className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 hover:scale-105 relative group px-3 py-2 rounded-lg hover:bg-white/50"
          >
            Leaderboard
            <span className="absolute -bottom-1 left-3 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-[calc(100%-1.5rem)] rounded-full"></span>
          </Link>
          <Link
            href="#"
            className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 hover:scale-105 relative group px-3 py-2 rounded-lg hover:bg-white/50"
          >
            About
            <span className="absolute -bottom-1 left-3 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-[calc(100%-1.5rem)] rounded-full"></span>
          </Link>
        </nav>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-white/80 to-gray-100/80 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 cursor-pointer backdrop-blur-sm border border-white/20 group">
            <span className="text-gray-600 text-lg group-hover:rotate-90 transition-transform duration-300">
              ⚙
            </span>
          </div>
        </div>
      </header>

      {/* Enhanced Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Enhanced Left side - Chess pieces with improved animations */}
            <div className="flex justify-center lg:justify-start relative">
              <div className="relative w-96 h-96">
                {/* Multiple floating backgrounds for depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-100/40 to-amber-200/40 rounded-3xl transform rotate-12 blur-2xl animate-pulse"></div>
                <div
                  className="absolute inset-0 bg-gradient-to-tl from-blue-100/30 to-purple-100/30 rounded-3xl transform -rotate-6 blur-xl animate-pulse"
                  style={{ animationDelay: "1s" }}
                ></div>

                {/* Enhanced King with floating animation */}
                <div className="absolute top-4 left-8 z-10 animate-float">
                  <div className="group cursor-pointer">
                    <Image
                      src="/images/king.png"
                      alt="Chess King"
                      width={200}
                      height={300}
                      className="drop-shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 filter hover:brightness-110"
                    />
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-black/30 rounded-full blur-sm opacity-70 group-hover:scale-110 transition-transform duration-700"></div>
                  </div>
                </div>

                {/* Enhanced Rook with delayed floating animation */}
                <div
                  className="absolute top-12 right-16 z-20 animate-float"
                  style={{ animationDelay: "0.5s" }}
                >
                  <div className="group cursor-pointer">
                    <Image
                      src="/images/rook.png"
                      alt="Chess Rook"
                      width={210}
                      height={300}
                      className="drop-shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 filter hover:brightness-110"
                    />
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-black/30 rounded-full blur-sm opacity-70 group-hover:scale-110 transition-transform duration-700"></div>
                  </div>
                </div>

                {/* Enhanced Knight with floating animation */}
                <div
                  className="absolute bottom-16 right-8 z-30 animate-float"
                  style={{ animationDelay: "1s" }}
                >
                  <div className="group cursor-pointer">
                    <Image
                      src="/images/knight.png"
                      alt="Chess Knight"
                      width={200}
                      height={230}
                      className="drop-shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-12 filter hover:brightness-110"
                    />
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-14 h-2 bg-black/30 rounded-full blur-sm opacity-70 group-hover:scale-110 transition-transform duration-700"></div>
                  </div>
                </div>

                {/* Enhanced Pawn with floating animation */}
                <div
                  className="absolute bottom-8 left-16 z-40 animate-float"
                  style={{ animationDelay: "1.5s" }}
                >
                  <div className="group cursor-pointer">
                    <Image
                      src="/images/pawn.png"
                      alt="Chess Pawn"
                      width={100}
                      height={150}
                      className="drop-shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:-rotate-12 filter hover:brightness-110"
                    />
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-black/30 rounded-full blur-sm opacity-70 group-hover:scale-110 transition-transform duration-700"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Right side - Content with better typography and animations */}
            <div className="text-center lg:text-left space-y-8">
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                    Trustless Chess Stakes with{" "}
                  </span>
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent animate-gradient-x">
                    Seamless Flow
                  </span>
                </h1>

                <div className="space-y-4">
                  <p className="text-xl lg:text-2xl text-gray-600 max-w-lg leading-relaxed">
                    Start playing and earning by connecting your crypto wallet.
                  </p>
                  <div className="flex flex-wrap gap-4 text-base text-gray-500 justify-center lg:justify-start">
                    <span className="flex items-center gap-2 bg-white/60 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                      ⚡ Lightning fast
                    </span>
                    <span className="flex items-center gap-2 bg-white/60 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                      🔒 Secure
                    </span>
                    <span className="flex items-center gap-2 bg-white/60 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                      💎 Trustless
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 lg:justify-start justify-center">
                <Button
                  className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 relative overflow-hidden group"
                  asChild
                >
                  <Link
                    href="/game"
                    className="flex items-center gap-2 relative z-10"
                  >
                    <span className="group-hover:animate-bounce">🚀</span>
                    Connect Wallet
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  className="border-2 border-gray-300 hover:border-purple-400 text-gray-700 hover:text-purple-600 px-8 py-4 text-lg rounded-xl shadow-md hover:shadow-xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-1 bg-white/80 backdrop-blur-sm relative overflow-hidden group"
                  asChild
                >
                  <Link
                    href="/demo"
                    className="flex items-center gap-2 relative z-10"
                  >
                    <span className="group-hover:animate-pulse">👀</span>
                    Watch Demo
                  </Link>
                </Button>
              </div>

              {/* Enhanced Stats section with better animations */}
              <div className="grid grid-cols-3 gap-4 pt-8">
                <div className="text-center p-4 rounded-xl bg-white/70 backdrop-blur-sm shadow-lg border border-white/30 hover:bg-white/80 transition-all duration-300 hover:scale-105 hover:-translate-y-1 group">
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                    10K+
                  </div>
                  <div className="text-sm text-gray-600">Active Players</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-white/70 backdrop-blur-sm shadow-lg border border-white/30 hover:bg-white/80 transition-all duration-300 hover:scale-105 hover:-translate-y-1 group">
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                    $2M+
                  </div>
                  <div className="text-sm text-gray-600">Prize Pool</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-white/70 backdrop-blur-sm shadow-lg border border-white/30 hover:bg-white/80 transition-all duration-300 hover:scale-105 hover:-translate-y-1 group">
                  <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                    99.9%
                  </div>
                  <div className="text-sm text-gray-600">Uptime</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Enhanced Footer with glassmorphism */}
      <footer className="relative z-10 backdrop-blur-xl bg-white/70 border-t border-white/30 px-6 py-8 shadow-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Enhanced Logo section */}
            <div className="md:col-span-1">
              <div className="flex items-center mb-4 group">
                <div className="relative">
                  <Image
                    src="/images/sophos_long.png"
                    alt="Sophos"
                    width={120}
                    height={30}
                    className="transition-all group-hover:scale-105 duration-300 filter group-hover:brightness-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-3 py-1 rounded-full text-xs font-medium shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer hover:scale-105 transform">
                  yellow
                </span>
                <span className="text-gray-400 flex items-center hover:text-purple-500 transition-colors duration-300">
                  <span className="text-purple-500 animate-pulse">▽</span>{" "}
                  vlayer
                </span>
              </div>
            </div>

            {/* Enhanced Community section */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">
                Community
              </h3>
              <div className="space-y-3">
                <Link
                  href="#"
                  className=" text-gray-600 hover:text-blue-600 text-sm transition-all duration-300 hover:translate-x-2 flex items-center gap-2 group p-2 -ml-2 rounded-lg hover:bg-white/50"
                >
                  <span className="group-hover:scale-125 transition-transform duration-300">
                    🐦
                  </span>{" "}
                  Twitter
                </Link>
                <Link
                  href="#"
                  className=" text-gray-600 hover:text-indigo-600 text-sm transition-all duration-300 hover:translate-x-2 flex items-center gap-2 group p-2 -ml-2 rounded-lg hover:bg-white/50"
                >
                  <span className="group-hover:scale-125 transition-transform duration-300">
                    💬
                  </span>{" "}
                  Discord
                </Link>
                <Link
                  href="#"
                  className=" text-gray-600 hover:text-blue-500 text-sm transition-all duration-300 hover:translate-x-2 flex items-center gap-2 group p-2 -ml-2 rounded-lg hover:bg-white/50"
                >
                  <span className="group-hover:scale-125 transition-transform duration-300">
                    📱
                  </span>{" "}
                  Telegram
                </Link>
                <Link
                  href="#"
                  className=" text-gray-600 hover:text-green-600 text-sm transition-all duration-300 hover:translate-x-2 flex items-center gap-2 group p-2 -ml-2 rounded-lg hover:bg-white/50"
                >
                  <span className="group-hover:scale-125 transition-transform duration-300">
                    📝
                  </span>{" "}
                  Medium
                </Link>
              </div>
            </div>

            {/* Enhanced Legal section */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">
                Legal
              </h3>
              <div className="space-y-3">
                <Link
                  href="#"
                  className="block text-gray-600 hover:text-gray-900 text-sm transition-all duration-300 hover:translate-x-2 p-2 -ml-2 rounded-lg hover:bg-white/50"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="#"
                  className="block text-gray-600 hover:text-gray-900 text-sm transition-all duration-300 hover:translate-x-2 p-2 -ml-2 rounded-lg hover:bg-white/50"
                >
                  Terms of Use
                </Link>
                <Link
                  href="#"
                  className="block text-gray-600 hover:text-gray-900 text-sm transition-all duration-300 hover:translate-x-2 p-2 -ml-2 rounded-lg hover:bg-white/50"
                >
                  Legal Disclaimer
                </Link>
              </div>
            </div>

            {/* Enhanced Contact section */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">
                Stay Updated
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-white/80 to-gray-50/80 border border-white/30 backdrop-blur-sm hover:bg-white/90 transition-all duration-300">
                  <span className="text-gray-600 text-sm">sophos@xyz.com</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-gradient-to-r from-white/80 to-blue-50/80 border-blue-200 hover:border-blue-400 text-blue-700 hover:text-blue-800 transition-all duration-300 hover:scale-105 hover:shadow-lg backdrop-blur-sm"
                >
                  📧 Subscribe to Updates
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced Copyright */}
          <div className="border-t border-white/30 mt-8 pt-6 text-center text-sm text-gray-500 bg-white/30 rounded-lg p-4 backdrop-blur-sm">
            <p className="hover:text-gray-700 transition-colors duration-300">
              © 2024 Sophos Chess. All rights reserved. Built with{" "}
              <span className="text-red-500 animate-pulse">❤️</span> for the
              blockchain community.
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes gradient-x {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
