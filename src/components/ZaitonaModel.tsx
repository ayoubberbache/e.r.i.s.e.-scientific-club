import React, { useEffect, useState } from 'react';

export function ZaitonaViewer() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    import('@google/model-viewer')
      .then(() => setLoaded(true))
      .catch((err) => {
        console.warn('Could not load 3D model viewer:', err);
        setLoaded(false);
      });
  }, []);

  if (!loaded) {
    return (
      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-dominant/30 rounded-2xl">
        <div className="text-sm font-semibold text-accent animate-pulse">Loading Zaitona 3D...</div>
      </div>
    );
  }

  const ModelTag = 'model-viewer' as any;

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center">
      <ModelTag
        src="/zaitona.glb"
        alt="Zaitona 3D Model"
        camera-controls
        disable-zoom
        disable-pan
        shadow-intensity="1"
        environment-image="neutral"
        exposure="1"
        camera-orbit="180deg 75deg 105%"
        orientation="0deg 0deg 0deg"
        interaction-prompt="none"
        style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
      />
    </div>
  );
}
