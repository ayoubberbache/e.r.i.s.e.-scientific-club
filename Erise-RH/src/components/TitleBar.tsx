import React from 'react';
import { Minus, Square, X, Bell, BellOff, Users } from 'lucide-react';

interface TitleBarProps {
  isRealtimeConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  pendingCount: number;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  isRealtimeConnected,
  soundEnabled,
  onToggleSound,
  pendingCount,
}) => {
  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.close();
    }
  };

  return (
    <div className="h-10 bg-white border-b border-slate-200 flex items-center justify-between px-3 select-none z-50 text-xs [app-region:drag]">
      {/* Left: App Identity */}
      <div className="flex items-center gap-2.5 [app-region:no-drag]">
        <div className="w-5 h-5 bg-[#0d5c63] text-white flex items-center justify-center font-bold text-[11px] rounded-xs">
          RH
        </div>
        <span className="font-bold text-slate-900 text-xs tracking-wide">
          ERISE HR
        </span>
        <span className="text-[11px] text-slate-400 font-mono">
          v1.0
        </span>
      </div>

      {/* Center: Live Connection - just a word, no flashing */}
      <div className="flex items-center gap-3 [app-region:no-drag]">
        <span className={`text-xs font-medium ${isRealtimeConnected ? 'text-emerald-700' : 'text-slate-400'}`}>
          {isRealtimeConnected ? 'Connected' : 'Disconnected'}
        </span>

        {pendingCount > 0 && (
          <span className="text-xs font-semibold text-[#0d5c63] bg-teal-50 px-2 py-0.5 border border-teal-200">
            {pendingCount} Pending
          </span>
        )}
      </div>

      {/* Right: Sound Toggle & Window Controls */}
      <div className="flex items-center gap-0.5 [app-region:no-drag]">
        <button
          type="button"
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute chimes' : 'Enable chimes'}
          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          {soundEnabled ? <Bell className="w-3.5 h-3.5 text-[#0d5c63]" /> : <BellOff className="w-3.5 h-3.5" />}
        </button>

        <div className="h-3.5 w-[1px] bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={handleMinimize}
          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="p-1 text-slate-500 hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
