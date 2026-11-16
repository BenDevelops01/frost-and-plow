import React from 'react';
import type { GamePhase, RunSummary } from '../game/types';

interface StatusModalProps {
  phase: GamePhase;
  districtIndex: number;
  districtName: string;
  summary: RunSummary | null;
  onResume: () => void;
  onRestart: () => void;
  onNextDistrict: () => void;
  onTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  phase,
  districtIndex,
  districtName,
  summary,
  onResume,
  onRestart,
  onNextDistrict,
  onTitle,
}) => {
  if (phase !== 'paused' && phase !== 'gameover') return null;

  if (phase === 'paused') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[rgba(15,23,42,0.52)]">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-title"
          className="w-full max-w-sm bg-[#182336] border-2 border-[#cbd5e1]/35 rounded-2xl p-6 shadow-[0_24px_48px_rgba(15,23,42,0.55)] text-white"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-[#93c5fd]">
            District {districtIndex} · {districtName}
          </div>
          <h2 id="pause-title" className="font-display font-bold text-3xl mt-1 mb-5">
            Shift Paused
          </h2>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="w-full py-3 rounded-xl bg-[#e0483a] hover:bg-[#eb5648] font-display font-bold text-lg border-2 border-[#0f172a] shadow-[0_3px_0_#0f172a] cursor-pointer"
            >
              Resume Shift
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-2.5 rounded-xl bg-[#24344d] hover:bg-[#2d4160] font-semibold text-sm border border-[#475569] cursor-pointer"
            >
              Restart District
            </button>
            <button
              type="button"
              onClick={onTitle}
              className="w-full py-2.5 rounded-xl bg-[#111927] hover:bg-[#1b273c] text-[#cbd5e1] font-semibold text-sm border border-[#334155] cursor-pointer"
            >
              Title Screen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[rgba(15,23,42,0.52)]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="victory-title"
        className="w-full max-w-md bg-[#182336] border-2 border-[#fbbf24]/60 rounded-2xl p-6 shadow-[0_24px_48px_rgba(15,23,42,0.6)] text-white"
      >
        <div className="text-xs font-bold uppercase tracking-wider text-[#fbbf24]">
          District {summary?.districtIndex ?? districtIndex} Complete
        </div>
        <h2 id="victory-title" className="font-display font-bold text-3xl mt-1 mb-4">
          {summary?.districtName ?? districtName} Cleared!
        </h2>

        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <div className="bg-[#111927] border border-[#334155] rounded-xl p-3 text-center">
            <div className="text-[11px] font-bold uppercase text-[#94a3b8]">Cleared</div>
            <div className="font-display font-bold text-xl text-[#38bdf8] tabular-nums mt-0.5">
              {summary?.clearedPercent ?? 92}%
            </div>
          </div>
          <div className="bg-[#111927] border border-[#334155] rounded-xl p-3 text-center">
            <div className="text-[11px] font-bold uppercase text-[#94a3b8]">Best Chain</div>
            <div className="font-display font-bold text-xl text-[#fbbf24] tabular-nums mt-0.5">
              {summary?.maxCombo ?? 0}
            </div>
          </div>
          <div className="bg-[#111927] border border-[#334155] rounded-xl p-3 text-center">
            <div className="text-[11px] font-bold uppercase text-[#94a3b8]">Shift Time</div>
            <div className="font-display font-bold text-xl text-white tabular-nums mt-0.5">
              {summary?.elapsedSeconds ?? 0}s
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onNextDistrict}
            className="w-full py-3 rounded-xl bg-[#f59e0b] hover:bg-[#fbbf24] text-[#0f172a] font-display font-bold text-lg border-2 border-[#0f172a] shadow-[0_3px_0_#0f172a] cursor-pointer"
          >
            Next District Storm
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="py-2.5 rounded-xl bg-[#24344d] hover:bg-[#2d4160] font-semibold text-sm border border-[#475569] cursor-pointer"
            >
              Replay District
            </button>
            <button
              type="button"
              onClick={onTitle}
              className="py-2.5 rounded-xl bg-[#111927] hover:bg-[#1b273c] text-[#cbd5e1] font-semibold text-sm border border-[#334155] cursor-pointer"
            >
              Title Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
