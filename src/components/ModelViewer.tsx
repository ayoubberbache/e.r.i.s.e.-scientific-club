import React, { useEffect, useState } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

interface ModelViewerProps {
  src: string;
  alt: string;
  className?: string;
  cameraOrbit?: string;
  exposure?: string;
  shadowIntensity?: string;
}

export function ModelViewer({
  src,
  alt,
  className = "w-full h-full",
  cameraOrbit = "180deg 75deg 105%",
  exposure = "1",
  shadowIntensity = "1"
}: ModelViewerProps) {
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
      <div className={`flex items-center justify-center bg-dominant rounded-xl border border-subtle ${className}`}>
        <div className="flex flex-col items-center gap-3 text-accent font-semibold text-sm">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span>Loading 3D Model...</span>
        </div>
      </div>
    );
  }

  const ModelTag = 'model-viewer' as any;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <ModelTag
        src={src}
        alt={alt}
        camera-controls
        disable-zoom
        disable-pan
        loading="eager"
        reveal="auto"
        shadow-intensity={shadowIntensity}
        environment-image="neutral"
        exposure={exposure}
        camera-orbit={cameraOrbit}
        orientation="0deg 0deg 0deg"
        interaction-prompt="none"
        style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
      />
    </div>
  );
}
