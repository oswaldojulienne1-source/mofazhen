
import React, { useState, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { OrbitControls } from '@react-three/drei';
import { UIOverlay } from './components/UIOverlay';
import { HandController } from './components/HandController';
import { MagicShield } from './components/MagicShield';
import { SpatialField } from './components/SpatialField';
import { HandData } from './types';

export default function App() {
  const [started, setStarted] = useState(false);
  
  // The Single Source of Truth for high-frequency data
  // Now an array to support two hands [Hand 1, Hand 2]
  const handsDataRef = useRef<HandData[]>([
    {
      x: 0.5,
      y: 0.5,
      z: 0,
      quaternionX: 0,
      quaternionY: 0,
      quaternionZ: 0,
      quaternionW: 1,
      gestureIntensity: 0,
      isPresent: false,
      fingerCount: 0
    },
    {
      x: 0.5,
      y: 0.5,
      z: 0,
      quaternionX: 0,
      quaternionY: 0,
      quaternionZ: 0,
      quaternionW: 1,
      gestureIntensity: 0,
      isPresent: false,
      fingerCount: 0
    }
  ]);

  const handleStart = () => {
    setStarted(true);
    document.documentElement.requestFullscreen().catch((e) => {
        console.log("Fullscreen blocked or not supported", e);
    });
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div className="scanline"></div>
      
      {/* 2D UI Layer */}
      <UIOverlay started={started} onStart={handleStart} />

      {/* Logic Layer: Mutates handDataRef.current directly */}
      {started && <HandController handsDataRef={handsDataRef} />}

      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas 
          dpr={[1, 2]} // Support High-DPI screens
          camera={{ position: [0, 2, 8], fov: 50 }} 
          gl={{ 
            antialias: false, // Disable native AA, handled by EffectComposer
            powerPreference: "high-performance",
            stencil: false,
            depth: true
          }} 
          shadows
        >
          <color attach="background" args={['#000000']} />
          
          <Suspense fallback={null}>
             {/* 3D Environment Background */}
             <SpatialField handsDataRef={handsDataRef} />
             
             {/* The Magic Shield (renders one per hand) */}
             <MagicShield handsDataRef={handsDataRef} />
          </Suspense>

          {/* Mouse Control for 3D View */}
          <OrbitControls 
            enableZoom={true} 
            enablePan={true}
            minDistance={2}
            maxDistance={50}
            maxPolarAngle={Math.PI / 1.5} 
            minPolarAngle={Math.PI / 6}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
          />

          <EffectComposer multisampling={8} disableNormalPass>
            <Bloom 
                luminanceThreshold={0.5} // Higher threshold to reduce washout
                mipmapBlur 
                intensity={1.0} 
                radius={0.5}
            />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Canvas>
      </div>
    </div>
  );
}
