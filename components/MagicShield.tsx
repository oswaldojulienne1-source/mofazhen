
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { HandData } from '../types';

// --- Palette (Gold, Light Orange, White) ---
const GOLD_COLOR = '#FFD700'; 
const ORANGE_LIGHT = '#FFA07A'; 
const WHITE_GLOW = '#FFFFFF';
const GEM_COLOR = '#FFDEAD'; // NavajoWhite for gem base

// --- Procedural Texture Generation (Vector Illustration Style) ---
const createMandalaMaps = () => {
  const size = 2048; // Increased resolution for sharper lines
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Default return to safe empty textures if context fails
  const fallback = { 
      alphaMap: new THREE.Texture(), 
      roughMap: new THREE.Texture(), 
      bumpMap: new THREE.Texture() 
  };
  
  if (!ctx) return fallback;

  const cx = size / 2;
  const cy = size / 2;
  const scaleFactor = size / 1024; // Scale drawing commands to new resolution

  // Clear
  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 0; // Keep lines crisp for vector style

  const drawSymmetry = (count: number, fn: (i: number) => void) => {
     const step = (Math.PI * 2) / count;
     for(let i=0; i<count; i++) {
         ctx.save();
         ctx.translate(cx, cy);
         ctx.rotate(i * step);
         fn(i);
         ctx.restore();
     }
  };

  // --- Layer 1: Central Star / Flower (Inner) ---
  drawSymmetry(8, () => {
      ctx.beginPath();
      ctx.moveTo(0, -60 * scaleFactor);
      ctx.quadraticCurveTo(20 * scaleFactor, -30 * scaleFactor, 40 * scaleFactor, -10 * scaleFactor);
      ctx.quadraticCurveTo(20 * scaleFactor, 10 * scaleFactor, 0, 60 * scaleFactor);
      ctx.lineWidth = 4 * scaleFactor;
      ctx.strokeStyle = 'white';
      ctx.stroke();
      
      // Delicate dots
      ctx.beginPath();
      ctx.arc(0, -75 * scaleFactor, 4 * scaleFactor, 0, Math.PI*2);
      ctx.fillStyle = 'white';
      ctx.fill();
  });

  // --- Layer 2: Intricate Scrollwork (Middle) ---
  drawSymmetry(12, () => {
      ctx.translate(0, -200 * scaleFactor);
      ctx.beginPath();
      // Vector-style scroll
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(40 * scaleFactor, -40 * scaleFactor, 80 * scaleFactor, 0, 0, 60 * scaleFactor);
      ctx.bezierCurveTo(-80 * scaleFactor, 0, -40 * scaleFactor, -40 * scaleFactor, 0, 0);
      ctx.lineWidth = 6 * scaleFactor;
      ctx.strokeStyle = 'white';
      ctx.stroke();
      
      // Inner fill for opacity
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fill();
  });
  
  // --- Layer 3: Outer Geometric Runes (Outer) ---
  drawSymmetry(16, () => {
      ctx.translate(0, -400 * scaleFactor);
      ctx.beginPath();
      ctx.moveTo(0, 20 * scaleFactor);
      ctx.lineTo(25 * scaleFactor, -30 * scaleFactor);
      ctx.lineTo(0, -60 * scaleFactor);
      ctx.lineTo(-25 * scaleFactor, -30 * scaleFactor);
      ctx.closePath();
      ctx.lineWidth = 8 * scaleFactor;
      ctx.strokeStyle = 'white';
      ctx.stroke();
      
      // Decorative line
      ctx.beginPath();
      ctx.moveTo(0, -60 * scaleFactor);
      ctx.lineTo(0, -90 * scaleFactor);
      ctx.lineWidth = 3 * scaleFactor;
      ctx.stroke();
  });

  // --- Connecting Rings ---
  const drawRing = (r: number, w: number) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r * scaleFactor, 0, Math.PI*2);
      ctx.lineWidth = w * scaleFactor;
      ctx.strokeStyle = 'white';
      ctx.stroke();
  };
  
  drawRing(120, 4);
  drawRing(280, 8);
  drawRing(480, 12);

  const alphaMap = new THREE.CanvasTexture(canvas);
  alphaMap.anisotropy = 16; // High quality textures at angle

  // --- Voronoi / Crystal Texture for Gem Roughness & Bump ---
  const vCanvas = document.createElement('canvas');
  vCanvas.width = 512;
  vCanvas.height = 512;
  const vCtx = vCanvas.getContext('2d');
  
  if (vCtx) {
      vCtx.fillStyle = '#000000';
      vCtx.fillRect(0,0,512,512);
      
      // Generate cells
      for(let i=0; i<60; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 512;
          const r = 20 + Math.random() * 40;
          
          const g = vCtx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, '#FFFFFF'); // High point
          g.addColorStop(1, '#000000'); // Low point
          
          vCtx.fillStyle = g;
          vCtx.globalCompositeOperation = 'lighten';
          vCtx.beginPath();
          vCtx.arc(x, y, r, 0, Math.PI*2);
          vCtx.fill();
      }
  }
  const roughMap = new THREE.CanvasTexture(vCanvas);

  return { alphaMap, roughMap, bumpMap: roughMap };
};

// --- Sub-Components ---

// 1. Brushed Gold Structure Ring (3D Torus)
const BrushedGoldRing = ({ radius, tube, speed, rotationOffset, boost, bumpMap }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state, delta) => {
        if (meshRef.current) {
            const dir = Math.sign(speed) || 1;
            meshRef.current.rotation.z += (speed + dir * boost) * delta;
        }
    });

    return (
        <mesh ref={meshRef} rotation={[0, 0, rotationOffset]}>
            <torusGeometry args={[radius, tube, 32, 100]} />
            <meshPhysicalMaterial 
                color={GOLD_COLOR}
                metalness={1.0}
                roughness={0.3} // Polished but brushed
                clearcoat={0.8}
                clearcoatRoughness={0.1}
                bumpMap={bumpMap}
                bumpScale={0.02}
            />
        </mesh>
    );
};

// 2. Vector Pattern Layer (Alpha Plane)
// Represents the "Ornate light orange line decorations"
const PatternLayer = ({ radius, map, speed, boost, zPos, scale = 1, color }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.z -= (speed + boost) * delta;
        }
    });

    return (
        <mesh ref={meshRef} position={[0,0,zPos]} scale={[scale, scale, scale]}>
             <planeGeometry args={[radius * 2, radius * 2]} />
             <meshStandardMaterial 
                map={map}
                alphaMap={map}
                transparent
                color={color}
                side={THREE.DoubleSide}
                alphaTest={0.01}
                depthWrite={false} // Clean layering
                emissive={color}
                emissiveIntensity={0.8} // Glowing vector lines
             />
        </mesh>
    );
}

// 3. Textured Gem Core
const GemCore = ({ intensity, map }: { intensity: number, map: THREE.Texture }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += delta * (0.5 + intensity * 5);
            meshRef.current.rotation.y += delta * (0.8 + intensity * 5);
            const s = 1.0 + intensity * 0.2;
            meshRef.current.scale.setScalar(s);
        }
    });

    return (
        <mesh ref={meshRef}>
            <icosahedronGeometry args={[0.5, 0]} /> {/* Faceted gem */}
            <meshPhysicalMaterial 
                color={GEM_COLOR}
                roughness={0.1}
                metalness={0.1}
                transmission={0.9} // Crystal clear
                thickness={2.0}
                ior={1.6} // Crystal refraction
                normalMap={map}
                normalScale={new THREE.Vector2(0.5, 0.5)}
                emissive={ORANGE_LIGHT}
                emissiveIntensity={0.2 + intensity}
                clearcoat={1}
            />
            <pointLight distance={4} intensity={2 + intensity * 3} color={ORANGE_LIGHT} />
        </mesh>
    );
}

// --- Shield Instance ---

interface ShieldInstanceProps {
    maps: { alphaMap: THREE.Texture, roughMap: THREE.Texture, bumpMap: THREE.Texture };
    intensity: number;
    position: [number, number, number];
    scale: number;
}

const ShieldInstance: React.FC<ShieldInstanceProps> = ({ maps, intensity, position, scale }) => {
    const groupRef = useRef<THREE.Group>(null);
    const particlesRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (groupRef.current) {
            const jitter = intensity * 0.05; 
            groupRef.current.position.x = position[0] + (Math.random() - 0.5) * jitter;
            groupRef.current.position.y = position[1] + (Math.random() - 0.5) * jitter;
            groupRef.current.position.z = position[2];
        }
        if (particlesRef.current) {
             // Rotation increases with intensity
             particlesRef.current.rotation.z += delta * (0.5 + intensity * 8);
             
             // Expand particles group based on intensity
             const s = 1 + intensity * 1.5;
             particlesRef.current.scale.lerp(new THREE.Vector3(s,s,s), 0.1);
        }
    });

    return (
        <group position={position} scale={[scale, scale, scale]} ref={groupRef}>
             {/* Center: Textured Gem */}
             <GemCore intensity={intensity} map={maps.roughMap} />

             {/* Layer 1: Inner Star Pattern (Gold Lines) */}
             <PatternLayer 
                radius={1.0} 
                map={maps.alphaMap} 
                speed={0.1} 
                boost={intensity * 5} 
                zPos={0.1} 
                scale={0.5}
                color={GOLD_COLOR}
             />

             {/* Layer 2: Delicate Scrollwork (White/Orange Glow) */}
             <PatternLayer 
                radius={1.5} 
                map={maps.alphaMap} 
                speed={-0.15} 
                boost={intensity * 8} 
                zPos={0.2} 
                scale={0.8}
                color={ORANGE_LIGHT}
             />

             {/* Layer 3: Solid Gold Structure Ring */}
             <group position={[0,0,0.3]}>
                <BrushedGoldRing 
                    radius={1.2} 
                    tube={0.05} 
                    speed={0.3} 
                    boost={intensity * 12} 
                    rotationOffset={0} 
                    bumpMap={maps.bumpMap}
                />
             </group>

             {/* Layer 4: Outer Geometric Runes (Gold) */}
             <PatternLayer 
                radius={2.5} 
                map={maps.alphaMap} 
                speed={0.1} 
                boost={intensity * 5} 
                zPos={0.35} 
                scale={1.0}
                color={GOLD_COLOR}
             />

             {/* Layer 5: Heavy Outer Ring (Orange Metal) */}
             <group position={[0,0,0.4]}>
                <mesh>
                    <torusGeometry args={[2.0, 0.08, 16, 100]} />
                    <meshPhysicalMaterial 
                        color={ORANGE_LIGHT} 
                        metalness={0.8} 
                        roughness={0.4}
                        emissive={ORANGE_LIGHT}
                        emissiveIntensity={0.2}
                    />
                </mesh>
             </group>

            {/* Particles: "Mysterious and gorgeous" + "Splashing effect" on high intensity */}
            <group ref={particlesRef} position={[0,0,0.5]}>
                 {/* 1. Base Ambient Gold Dust - Always active */}
                 <Sparkles 
                    count={intensity > 0.1 ? 200 + (intensity * 400) : 100} 
                    scale={4 + intensity * 3} // Slight expansion
                    size={3 + intensity}
                    speed={1 + intensity * 6} 
                    opacity={0.5 + intensity * 0.3}
                    color={GOLD_COLOR}
                    noise={0.5}
                 />
                 
                 {/* 2. White Core Energy - Increases brightness */}
                 <Sparkles 
                    count={intensity > 0.2 ? 150 : 50}
                    scale={3 + intensity * 2}
                    size={4 + intensity * 3}
                    speed={0.5 + intensity * 2}
                    opacity={0.6 + intensity * 0.4}
                    color={WHITE_GLOW}
                 />

                 {/* 3. EXPLOSIVE SPLASH EFFECT (Triggers on Clench/High Intensity) */}
                 {intensity > 0.4 && (
                     <>
                        {/* Fiery flying sparks - Massive Increase */}
                        <Sparkles 
                            count={Math.floor(intensity * 1000)} // Huge amount of particles
                            scale={15 + intensity * 25}          // Extremely wide spread
                            size={12 + intensity * 20}           // Very large particles
                            speed={10 + intensity * 60}          // Extremely high velocity
                            opacity={intensity}
                            color="#FF4500" // Red-Orange / Magma color
                            noise={4.0} // High chaos
                        />
                         {/* Additional layer for depth - Intense Core Sparks */}
                         <Sparkles 
                            count={200}
                            scale={5}
                            size={20}
                            speed={5}
                            opacity={1}
                            color="#FFFFFF"
                            noise={0}
                        />
                        {/* High velocity streaks */}
                        <Sparkles 
                            count={200}
                            scale={20}
                            size={15}
                            speed={30}
                            opacity={intensity * 0.9}
                            color={GOLD_COLOR}
                            noise={2.0}
                        />
                     </>
                 )}
            </group>
        </group>
    );
};

// --- Single Hand Rig ---
// Controls position of one shield set based on one hand index

interface HandShieldRigProps {
    handIndex: number;
    handsDataRef: React.MutableRefObject<HandData[]>;
    maps: { alphaMap: THREE.Texture, roughMap: THREE.Texture, bumpMap: THREE.Texture };
}

const HandShieldRig: React.FC<HandShieldRigProps> = ({ handIndex, handsDataRef, maps }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // Get data for this specific hand
        const handData = handsDataRef.current[handIndex];
        const { x, y, z, quaternionX, quaternionY, quaternionZ, quaternionW, isPresent } = handData;

        // Position Logic
        const targetX = (x - 0.5) * -30;
        const targetY = -(y - 0.5) * 20;
        // Map apparent hand size to Z depth
        const rawZ = Math.max(0.05, Math.min(0.35, z));
        const distFactor = (rawZ - 0.05) / (0.30 - 0.05);
        
        // Position
        const targetZPosition = isPresent ? (-25 + distFactor * 23.0) : -20;
        
        // Scale
        const baseScale = 0.6 + distFactor * 1.5; 
        const targetScale = isPresent ? baseScale : 0;

        // Smooth Interpolation
        groupRef.current.position.x += (targetX - groupRef.current.position.x) * 0.15;
        groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.15;
        groupRef.current.position.z += (targetZPosition - groupRef.current.position.z) * 0.12;

        const currentScale = groupRef.current.scale.x;
        const newScale = currentScale + (targetScale - currentScale) * 0.12;
        groupRef.current.scale.set(newScale, newScale, newScale);

        // Rotation Logic (Quaternion Tracking)
        if (isPresent) {
            const targetQ = new THREE.Quaternion(quaternionX, quaternionY, quaternionZ, quaternionW);
            groupRef.current.quaternion.slerp(targetQ, 0.2);
        }
    });

    // Pass the calculated intensity down to the visual instance
    const intensity = handsDataRef.current[handIndex]?.gestureIntensity ?? 0;

    return (
        <group ref={groupRef}>
             <ShieldInstance maps={maps} intensity={intensity} position={[0, 0, 0]} scale={1.0} />
        </group>
    );
};


// --- Main Container ---

interface ShieldProps {
  handsDataRef: React.MutableRefObject<HandData[]>;
}

export const MagicShield: React.FC<ShieldProps> = ({ handsDataRef }) => {
  const maps = useMemo(() => createMandalaMaps(), []);

  return (
    <group>
        <ambientLight intensity={0.6} color={ORANGE_LIGHT} />
        {/* Cinematic Backlight */}
        <pointLight position={[0, 5, -5]} intensity={2.0} color="#FFF8DC" distance={20} />
        {/* Key Light */}
        <pointLight position={[10, 10, 20]} intensity={1.2} color="#FFFFFF" /> 
        
        {/* Render a shield rig for Hand 0 */}
        <HandShieldRig handIndex={0} handsDataRef={handsDataRef} maps={maps} />
        {/* Render a shield rig for Hand 1 */}
        <HandShieldRig handIndex={1} handsDataRef={handsDataRef} maps={maps} />
    </group>
  );
};
