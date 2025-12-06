
import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HandData } from '../types';

interface SpatialFieldProps {
  handsDataRef: React.MutableRefObject<HandData[]>;
}

// --- Alien Creature Component ---
const Alien = ({ position }: { position: [number, number, number] }) => {
    const group = useRef<THREE.Group>(null);
    const ring = useRef<THREE.Mesh>(null);
    const eyeRef = useRef<THREE.Mesh>(null);
    
    // Random offset for independent animation phases
    const offset = useMemo(() => Math.random() * 100, []);
    // Slight size variation
    const scale = useMemo(() => 0.8 + Math.random() * 0.4, []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime() + offset;
        if (group.current) {
            // Idle Hover Animation
            group.current.position.y = position[1] + Math.sin(t * 1.5) * 0.4;
            // Slow Rotation / "Looking around"
            group.current.rotation.y = Math.sin(t * 0.3) * 0.5;
            group.current.rotation.z = Math.sin(t * 0.5) * 0.1;
        }
        if (ring.current) {
            // Ring spins independently
            ring.current.rotation.x = t * 0.8;
            ring.current.rotation.y = t * 0.4;
        }
        if (eyeRef.current) {
            // Pulsing Eye
            const s = 1 + Math.sin(t * 3) * 0.1;
            eyeRef.current.scale.setScalar(s);
        }
    });

    // Theme: Electric Blue
    const BODY_COLOR = "#001133"; // Deep Blue Metal
    const GLOW_COLOR = "#0066ff"; // Electric Blue

    return (
        <group ref={group} position={position} scale={[scale, scale, scale]}>
            {/* Body: Dark Bio-Metallic Shell */}
            <mesh>
                <dodecahedronGeometry args={[0.5, 0]} />
                <meshStandardMaterial color={BODY_COLOR} roughness={0.3} metalness={0.9} />
            </mesh>
            
            {/* Eye: Glowing Core */}
            <mesh ref={eyeRef} position={[0, 0, 0.4]}>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshBasicMaterial color={GLOW_COLOR} toneMapped={false} />
            </mesh>
            
            {/* Local Glow Light */}
            <pointLight color={GLOW_COLOR} distance={4} intensity={2.0} decay={2} />
            
            {/* Orbiting Tech Ring */}
            <mesh ref={ring}>
                <torusGeometry args={[0.9, 0.03, 8, 32]} />
                <meshBasicMaterial color={GLOW_COLOR} transparent opacity={0.5} toneMapped={false} />
            </mesh>
            
            {/* Small Legs/Tentacles Stub */}
            {[0, 1, 2].map((i) => (
                <mesh key={i} position={[0, -0.4, 0]} rotation={[0, (i / 3) * Math.PI * 2, 0.5]}>
                    <coneGeometry args={[0.08, 0.6, 6]} />
                    <meshStandardMaterial color="#00081a" />
                </mesh>
            ))}
        </group>
    );
};

// --- Utils: Simple Value Noise for Procedural Generation ---
// A simple pseudo-random noise function for static texture generation
const perm = new Uint8Array(512);
const p = new Uint8Array(256);
for(let i=0; i<256; i++) p[i] = i;
// Shuffle
for(let i=255; i>0; i--) {
    const r = Math.floor(Math.random() * (i+1));
    [p[i], p[r]] = [p[r], p[i]];
}
for(let i=0; i<512; i++) perm[i] = p[i & 255];

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t: number, a: number, b: number) { return a + t * (b - a); }
function grad(hash: number, x: number, y: number, z: number) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}
function noise3d(x: number, y: number, z: number) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z,
          B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(w, lerp(v, lerp(u, grad(perm[AA], x, y, z),
                                   grad(perm[BA], x - 1, y, z)),
                           lerp(u, grad(perm[AB], x, y - 1, z),
                                   grad(perm[BB], x - 1, y - 1, z))),
                   lerp(v, lerp(u, grad(perm[AA + 1], x, y, z - 1),
                                   grad(perm[BA + 1], x - 1, y, z - 1)),
                           lerp(u, grad(perm[AB + 1], x, y - 1, z - 1),
                                   grad(perm[BB + 1], x - 1, y - 1, z - 1))));
}

// Fractal Brownian Motion for rich detail
function fbm(x: number, y: number, z: number, octaves: number, persistence: number) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0; 
    for(let i=0; i<octaves; i++) {
        total += noise3d(x * frequency, y * frequency, z * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }
    return total / maxValue;
}


// --- Texture Generators ---

const createRealisticMoonTexture = () => {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // 1. Regolith Base
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    for(let i=0; i<size; i++) {
        for(let j=0; j<size; j++) {
            const index = (i + j * size) * 4;
            // High frequency noise for dust
            const n = fbm(i * 0.05, j * 0.05, 0, 3, 0.5); 
            // Low frequency noise for terrain variation
            const terrain = fbm(i * 0.005, j * 0.005, 10, 4, 0.5);
            
            const val = 20 + (n * 20) + (terrain * 40);
            const clampVal = Math.min(255, Math.max(0, val));
            
            data[index] = clampVal;     // R
            data[index+1] = clampVal;   // G
            data[index+2] = clampVal;   // B
            data[index+3] = 255;        // A
        }
    }
    ctx.putImageData(imageData, 0, 0);

    // 2. Procedural Craters (Shadows and Highlights)
    for(let i=0; i<30; i++) {
        const cx = Math.random() * size;
        const cy = Math.random() * size;
        const r = Math.random() * 50 + 10;
        
        // Crater shadow
        const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
        g.addColorStop(0, 'rgba(0,0,0,0.8)');
        g.addColorStop(0.8, 'rgba(40,40,40,0.5)');
        g.addColorStop(1, 'rgba(80,80,80,0)');
        
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Impact Rays
        if (r > 30) {
            ctx.strokeStyle = 'rgba(200,200,200,0.05)';
            ctx.lineWidth = 1;
            for(let j=0; j<15; j++) {
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                const angle = Math.random() * Math.PI * 2;
                const len = r * (2 + Math.random() * 3);
                ctx.lineTo(cx + Math.cos(angle)*len, cy + Math.sin(angle)*len);
                ctx.stroke();
            }
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
};

const createRealisticEarthTexture = () => {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    const scale = 0.008;
    const cloudScale = 0.01;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const index = (x + y * size) * 4;

            // --- 1. Continents vs Ocean ---
            // Use FBM noise to generate continents
            // Offset z slightly to get a unique slice
            const n = fbm(x * scale, y * scale, 5.2, 6, 0.5);
            
            let r, g, b;

            if (n < 0.05) {
                // Deep Ocean
                r = 5; g = 10; b = 40;
            } else if (n < 0.1) {
                // Shallow Water (Continental Shelf)
                r = 10; g = 30; b = 70;
            } else if (n < 0.25) {
                // Lowlands / Green
                // Variation within land
                const landVar = fbm(x * scale * 4, y * scale * 4, 0, 2, 0.5);
                r = 30 + landVar * 20; 
                g = 80 + landVar * 40; 
                b = 20;
            } else if (n < 0.5) {
                // Highlands / Desert / Brown
                r = 120; g = 100; b = 60;
            } else {
                // Snow / Mountains
                r = 230; g = 230; b = 235;
            }

            // --- 2. Clouds ---
            const cloudN = fbm(x * cloudScale, y * cloudScale, 9.8, 4, 0.6);
            if (cloudN > 0.3) {
                const cloudAlpha = (cloudN - 0.3) * 1.5; // Intensity
                const c = 255;
                r = r * (1-cloudAlpha) + c * cloudAlpha;
                g = g * (1-cloudAlpha) + c * cloudAlpha;
                b = b * (1-cloudAlpha) + c * cloudAlpha;
            }

            data[index] = r;
            data[index+1] = g;
            data[index+2] = b;
            data[index+3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
};

export const SpatialField: React.FC<SpatialFieldProps> = ({ handsDataRef }) => {
  const starsRef = useRef<THREE.Points>(null);
  const groundRef = useRef<THREE.Mesh>(null);
  const earthGroupRef = useRef<THREE.Group>(null);
  const rocksRef = useRef<THREE.InstancedMesh>(null);
  
  const moonTexture = useMemo(() => createRealisticMoonTexture(), []);
  const earthTexture = useMemo(() => createRealisticEarthTexture(), []);

  // Generate Realistic Rock Instances
  useLayoutEffect(() => {
    if (rocksRef.current) {
        const tempObj = new THREE.Object3D();
        const count = 150;
        for (let i = 0; i < count; i++) {
            // Distribute rocks on the ground plane
            const x = (Math.random() - 0.5) * 120;
            const z = (Math.random() - 0.5) * 100 - 10;
            
            // Randomize Scale to make them look like irregular debris
            // Flattened on Y, stretched on X/Z
            const baseScale = Math.random() * 0.8 + 0.2;
            const sx = baseScale * (0.8 + Math.random() * 0.5);
            const sy = baseScale * (0.5 + Math.random() * 0.5); // Flatter
            const sz = baseScale * (0.8 + Math.random() * 0.5);
            
            // Embed in ground slightly - Lowered to approx -12
            const y = -12 - (sy * 0.3); 
            
            tempObj.position.set(x, y, z);
            tempObj.rotation.set(
                Math.random() * Math.PI, 
                Math.random() * Math.PI, 
                Math.random() * Math.PI
            );
            tempObj.scale.set(sx, sy, sz);
            
            tempObj.updateMatrix();
            rocksRef.current.setMatrixAt(i, tempObj.matrix);
        }
        rocksRef.current.instanceMatrix.needsUpdate = true;
    }
  }, []);

  // Generate Positions for Aliens
  const alienPositions = useMemo(() => {
    const pos: [number, number, number][] = [];
    const count = 40; // Increased Quantity
    for(let i=0; i<count; i++) {
        // Scatter around the scene, keeping some distance
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 80 - 10;
        // Hovering slightly above the new ground level (-12)
        const y = -11.0; 
        pos.push([x, y, z]);
    }
    return pos;
  }, []);

  // Stars
  const starGeo = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const count = 4000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      // Sphere distribution for stars
      const r = 400 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i+2] = r * Math.cos(phi);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }, []);

  useFrame((state) => {
    // Parallax logic: use the first hand if present, otherwise default to 0
    let x = 0.5; 
    let y = 0.5;
    let isPresent = false;

    // Check if any hand is present
    const h1 = handsDataRef.current[0];
    const h2 = handsDataRef.current[1];
    if (h1.isPresent) {
        x = h1.x; y = h1.y; isPresent = true;
    } else if (h2.isPresent) {
        x = h2.x; y = h2.y; isPresent = true;
    }
    
    // Slight camera shifts based on hand position (optional parallax)
    // const targetX = isPresent ? (x - 0.5) * -1 : 0;
    // const targetY = isPresent ? (y - 0.5) * -0.5 : 0;

    if (earthGroupRef.current) {
        // Earth spins slowly
        earthGroupRef.current.rotation.y += 0.0005;
    }

    // Sky rotation
    if (starsRef.current) {
        starsRef.current.rotation.y += 0.00008;
    }
  });

  return (
    <group>
      {/* 1. Deep Space Atmosphere */}
      <fogExp2 attach="fog" args={['#000000', 0.012]} />
      
      {/* 2. Lighting - Cinematic Contrast */}
      <directionalLight position={[80, 20, 40]} intensity={3.5} color="#ffffff" castShadow />
      <directionalLight position={[0, 10, -30]} intensity={0.4} color="#4455aa" />
      <ambientLight intensity={0.05} color="#111111" />

      {/* 3. Stars */}
      <points ref={starsRef} geometry={starGeo}>
        <pointsMaterial size={0.3} color="#ffffff" sizeAttenuation={true} transparent opacity={1.0} />
      </points>

      {/* 4. The Moon Ground - Lowered to -12 */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -12, -30]} receiveShadow>
        <planeGeometry args={[160, 160, 256, 256]} />
        <meshStandardMaterial 
            map={moonTexture}
            displacementMap={moonTexture}
            displacementScale={4}
            color="#999999"
            roughness={0.95}
            metalness={0.1}
            normalScale={new THREE.Vector2(2.5, 2.5)}
        />
      </mesh>

      {/* 5. Realistic Scattered Rocks */}
      <instancedMesh ref={rocksRef} args={[undefined, undefined, 150]} castShadow receiveShadow>
         {/* Icosahedron looks more like a jagged rock than dodecahedron */}
         <icosahedronGeometry args={[1, 0]} /> 
         <meshStandardMaterial 
            color="#777777" 
            roughness={0.9} 
            metalness={0.1} 
            flatShading={true} 
         />
      </instancedMesh>

      {/* 6. Alien Creatures */}
      {alienPositions.map((pos, idx) => (
         <Alien key={idx} position={pos} />
      ))}

      {/* 7. Realistic Earth */}
      <group ref={earthGroupRef} position={[0, 12, -70]}>
        {/* Planet Surface */}
        <mesh>
            <sphereGeometry args={[14, 128, 128]} />
            <meshStandardMaterial 
                map={earthTexture}
                roughness={0.6} // Specular map simulated: Land rougher, water smoother
                metalness={0.1}
                emissive="#001133"
                emissiveIntensity={0.05}
            />
        </mesh>
        {/* Atmosphere Halo */}
        <mesh scale={[1.04, 1.04, 1.04]}>
            <sphereGeometry args={[14, 64, 64]} />
            <meshBasicMaterial 
                color="#4488ff" 
                transparent 
                opacity={0.15} 
                side={THREE.BackSide} 
                blending={THREE.AdditiveBlending}
            />
        </mesh>
        {/* Earthshine Source */}
        <pointLight intensity={1} distance={120} color="#3366ff" decay={2} />
      </group>

    </group>
  );
};
