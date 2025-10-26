import React from "react";

export default function TitleScreen({ onStart }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center text-center bg-gradient-to-r from-blue-300 via-blue-400 to-blue-700 overflow-hidden">
        <h1 className="text-8xl font-extrabold text-white mb-6 drop-shadow-[0_6px_8px_rgba(0,0,0,0.4)]">
            🧊 Fridge 🧊
        </h1>
        <p className="text-3xl text-blue-50 mb-10 max-w-xl font-medium drop-shadow-[0_3px_6px_rgba(0,0,0,0.3)]">
            Stay cool and join a community of poets!
        </p>
        <button
            onClick={onStart}
            className="bg-blue-600 text-white px-10 py-4 rounded-2xl text-2xl font-bold hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg"
        >
            Start Game
        </button>
    </div>
  );
}
