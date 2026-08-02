import React from 'react';

export function PosterGenerator() {
  return (
    <div className="w-full h-screen bg-[#0a1628] flex flex-col">
      <div className="bg-[#0f2537] border-b border-[#00e5ff]/20 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            🎨 ERISE Team Leader Poster Generator
          </h1>
          <p className="text-xs text-[#00e5ff]">
            Instagram 1080x1080 Post Template & PNG Exporter
          </p>
        </div>
        <a
          href="/team-poster-template/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-[#0073c8] hover:bg-[#00e5ff] text-white hover:text-[#0a1628] rounded-lg text-sm font-semibold transition-colors"
        >
          Open in New Tab ↗
        </a>
      </div>
      <iframe
        src="/team-poster-template/index.html"
        title="Poster Generator"
        className="w-full flex-1 border-none"
      />
    </div>
  );
}
