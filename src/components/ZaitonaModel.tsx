import React from 'react';
import '@google/model-viewer';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        'auto-rotate'?: boolean;
        'camera-controls'?: boolean;
        'disable-zoom'?: boolean;
        'disable-pan'?: boolean;
        'shadow-intensity'?: string;
        'environment-image'?: string;
        exposure?: string;
        style?: React.CSSProperties;
      };
    }
  }
}

export function ZaitonaViewer() {
  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center">
      <model-viewer
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
