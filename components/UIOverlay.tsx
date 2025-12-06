import React from 'react';
import { Shield, Zap, Maximize, Lock, Aperture } from 'lucide-react';

interface UIOverlayProps {
  started: boolean;
  onStart: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ started, onStart }) => {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  if (!started) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 text-orange-500">
        <div className="max-w-lg w-full p-8 border border-orange-500/30 bg-black/50 backdrop-blur-md relative overflow-hidden group">
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-orange-500"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-orange-500"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-orange-500"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-orange-500"></div>

          <h1 className="text-4xl font-bold font-['Rajdhani'] mb-2 tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-200">
            MYSTIC ARTS OS
          </h1>
          <div className="h-px w-full bg-orange-900 mb-6"></div>
          
          <p className="mb-8 text-orange-300/80 font-mono text-sm leading-relaxed">
            SYSTEM INITIALIZED.<br/>
            NEURAL INTERFACE: STANDBY.<br/>
            <br/>
            To activate the Eldritch Shield generator, biometric access (camera) is required.
            Perform somatic components (hand gestures) to manipulate the energy construct.
          </p>

          <button
            onClick={onStart}
            className="w-full py-4 bg-orange-900/20 hover:bg-orange-600 hover:text-white border border-orange-500 text-orange-400 font-bold tracking-[0.2em] transition-all duration-300 uppercase flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(255,165,0,0.5)]"
          >
            <Aperture size={20} className="animate-spin-slow" />
            Initialize Construct
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex flex-col justify-between p-6">
      {/* Top HUD */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-orange-400">
             <Shield size={20} />
             <span className="font-['Share_Tech_Mono'] text-xs tracking-widest">SHIELD_STATUS: ACTIVE</span>
          </div>
          <div className="h-1 w-32 bg-orange-900/50 overflow-hidden">
             <div className="h-full bg-orange-500 w-full animate-pulse"></div>
          </div>
        </div>

        <button 
            onClick={toggleFullscreen}
            className="pointer-events-auto p-2 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 hover:text-white transition-colors"
        >
            <Maximize size={24} />
        </button>
      </div>

      {/* Crosshair Center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20">
         <div className="w-[200px] h-[1px] bg-orange-500"></div>
         <div className="h-[200px] w-[1px] bg-orange-500 absolute top-0 left-1/2 -translate-x-1/2"></div>
      </div>

      {/* Bottom Stats */}
      <div className="flex justify-between items-end">
        <div className="text-orange-900/60 font-mono text-xs">
            Coordinates: <span className="text-orange-400 animate-pulse">TRK-992</span><br/>
            Reality Integrity: 98%
        </div>
        
        <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
                <span className="font-['Share_Tech_Mono'] text-orange-400 text-xs">ETHERIC_OUTPUT</span>
                <div className="flex gap-1 mt-1">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className={`w-1 h-3 ${i < 3 ? 'bg-orange-500' : 'bg-orange-900'}`}></div>
                    ))}
                </div>
             </div>
             <Zap className="text-orange-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
};