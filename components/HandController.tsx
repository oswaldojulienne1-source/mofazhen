
import React, { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import { HandData } from '../types';
import { audioManager } from '../services/audioSynth';

interface HandControllerProps {
  handsDataRef: React.MutableRefObject<HandData[]>;
}

export const HandController: React.FC<HandControllerProps> = ({ handsDataRef }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;
    let stream: MediaStream | null = null;
    
    // Helpers for 3D Calculation
    const dummyMatrix = new THREE.Matrix4();
    const dummyQuaternion = new THREE.Quaternion();
    const vecUp = new THREE.Vector3();
    const vecRight = new THREE.Vector3();
    const vecForward = new THREE.Vector3();
    const vecP0 = new THREE.Vector3(); // Wrist
    const vecP5 = new THREE.Vector3(); // Index MCP
    const vecP9 = new THREE.Vector3(); // Middle MCP
    const vecP17 = new THREE.Vector3(); // Pinky MCP

    const init = async () => {
      try {
        // PARALLEL LOADING: Start Camera and Model loading simultaneously
        const streamPromise = navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 60 }
            }
        });

        const visionPromise = FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );

        // Wait for Vision WASM first to start creating landmarker
        const vision = await visionPromise;
        const landmarkerPromise = HandLandmarker.createFromOptions(vision, {
            baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2 // Enable 2 hands
        });

        // Resolve both
        const [camStream, landmarker] = await Promise.all([streamPromise, landmarkerPromise]);

        stream = camStream;
        handLandmarker = landmarker;

        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Wait for video to be ready
            await new Promise<void>((resolve) => {
                if (videoRef.current) {
                    videoRef.current.onloadeddata = () => resolve();
                }
            });
            await videoRef.current.play();
            
            // Start loop
            predictWebcam();
            audioManager.start();
        }

      } catch (err) {
        console.error("Initialization failed:", err);
      }
    };

    const predictWebcam = () => {
      if (!handLandmarker || !videoRef.current || videoRef.current.videoWidth === 0) {
         animationFrameId = requestAnimationFrame(predictWebcam);
         return;
      }
      
      const startTimeMs = performance.now();
      const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);
      
      let maxIntensity = 0;
      let anyHandPresent = false;

      // Reset presence for all hands initially
      handsDataRef.current.forEach(h => h.isPresent = false);

      if (results.landmarks.length > 0) {
        anyHandPresent = true;

        // Loop through all detected hands
        for (let i = 0; i < results.landmarks.length; i++) {
            // Safety check for array bounds (in case model returns > 2 for some reason)
            if (i >= handsDataRef.current.length) break;

            const landmarks = results.landmarks[i];
            const worldLandmarks = results.worldLandmarks?.[i]; 
            const handData = handsDataRef.current[i];
            
            // --- 1. Key Landmarks (Screen Space for Position) ---
            const wrist = landmarks[0];
            const middleBase = landmarks[9]; 
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];
            const ringTip = landmarks[16];
            const pinkyTip = landmarks[20];
            
            const indexPip = landmarks[6];
            const middlePip = landmarks[10];
            const ringPip = landmarks[14];
            const pinkyPip = landmarks[18];

            // --- 2. Position (Center of Palm - Screen Space) ---
            const centerX = (wrist.x + middleBase.x) * 0.5 + 0.5 * middleBase.x; 
            const centerY = (wrist.y + middleBase.y) * 0.5;
            
            // --- 3. Depth / Distance (Apparent Size) ---
            const dx = middleBase.x - wrist.x;
            const dy = middleBase.y - wrist.y;
            const handApparentSize = Math.sqrt(dx * dx + dy * dy);
            
            // --- 4. 3D Orientation (Using World Landmarks) ---
            if (worldLandmarks) {
                const wl = worldLandmarks;
                // Populate vectors
                vecP0.set(wl[0].x, -wl[0].y, -wl[0].z); // Invert Y/Z to match Three.js approx
                vecP5.set(wl[5].x, -wl[5].y, -wl[5].z);
                vecP9.set(wl[9].x, -wl[9].y, -wl[9].z);
                vecP17.set(wl[17].x, -wl[17].y, -wl[17].z);

                // Define Basis Vectors
                // Up: Wrist -> Middle Finger (Longitudinal)
                vecUp.subVectors(vecP9, vecP0).normalize();
                
                // Temp Right: Index -> Pinky (Transverse)
                vecRight.subVectors(vecP17, vecP5).normalize();
                
                // Forward (Normal): Cross Product
                vecForward.crossVectors(vecRight, vecUp).normalize();
                
                // Recalculate true Right to be orthogonal
                vecRight.crossVectors(vecUp, vecForward).normalize();
                
                // Construct Rotation Matrix
                dummyMatrix.makeBasis(vecRight, vecUp, vecForward);
                dummyQuaternion.setFromRotationMatrix(dummyMatrix);
                
                // Store
                handData.quaternionX = dummyQuaternion.x;
                handData.quaternionY = dummyQuaternion.y;
                handData.quaternionZ = dummyQuaternion.z;
                handData.quaternionW = dummyQuaternion.w;
            } else {
                const rotation = Math.atan2(dy, dx) + Math.PI / 2;
                dummyQuaternion.setFromEuler(new THREE.Euler(0, 0, -rotation));
                handData.quaternionX = dummyQuaternion.x;
                handData.quaternionY = dummyQuaternion.y;
                handData.quaternionZ = dummyQuaternion.z;
                handData.quaternionW = dummyQuaternion.w;
            }
            
            // --- 5. Finger Counting Logic ---
            let fingersExtended = 0;
            const distToWrist = (p: {x:number, y:number}) => Math.hypot(p.x - wrist.x, p.y - wrist.y);
            
            if (distToWrist(indexTip) > distToWrist(indexPip)) fingersExtended++;
            if (distToWrist(middleTip) > distToWrist(middlePip)) fingersExtended++;
            if (distToWrist(ringTip) > distToWrist(ringPip)) fingersExtended++;
            if (distToWrist(pinkyTip) > distToWrist(pinkyPip)) fingersExtended++;
            
            const thumbBase = landmarks[2];
            if (Math.hypot(thumbTip.x - thumbBase.x, thumbTip.y - thumbBase.y) > handApparentSize * 0.8) {
                fingersExtended++;
            }
            fingersExtended = Math.min(5, fingersExtended);

            // --- 6. Clench / Gesture Intensity ---
            const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
            const openRatio = pinchDist / handApparentSize; 
            
            let intensity = 0;
            if (openRatio < 0.3) {
                intensity = 1.0 - (openRatio / 0.3);
                intensity = Math.pow(intensity, 0.5); 
            } else {
                intensity = 0;
            }
            intensity = Math.max(0, Math.min(1, intensity));

            // Accumulate max intensity for audio
            if (intensity > maxIntensity) maxIntensity = intensity;

            // Update Shared Reference
            handData.x = centerX;
            handData.y = centerY;
            handData.z = handApparentSize; 
            handData.gestureIntensity = intensity;
            handData.isPresent = true;
            handData.fingerCount = fingersExtended;
        }

        // Audio Effects
        audioManager.updateIntensity(maxIntensity, true);
        if (maxIntensity > 0.8 && Math.random() > 0.9) {
            audioManager.triggerSpark();
        }

      } else {
        // No hands detected
        audioManager.updateIntensity(0, false);
      }
      
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    init();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stream) {
         stream.getTracks().forEach(t => t.stop());
      }
      if (handLandmarker) handLandmarker.close();
    };
  }, [handsDataRef]);

  return (
    <video
      ref={videoRef}
      className="fixed top-0 left-0 w-1 h-1 opacity-0 pointer-events-none" 
      playsInline
      muted 
    />
  );
};
