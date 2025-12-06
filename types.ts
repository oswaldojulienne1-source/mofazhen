
export interface HandData {
  x: number;
  y: number;
  z: number;
  // Rotation is now a Quaternion for full 3D orientation
  quaternionX: number;
  quaternionY: number;
  quaternionZ: number;
  quaternionW: number;
  gestureIntensity: number; // 0 to 1. 1 = Clenched Fist (High Energy), 0 = Open Palm (Low Energy)
  isPresent: boolean;
  fingerCount: number; // 0-5
}

export interface AudioState {
  isHumming: boolean;
  intensity: number;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      group: any;
      planeGeometry: any;
      meshBasicMaterial: any;
      circleGeometry: any;
      ambientLight: any;
      pointLight: any;
      directionalLight: any;
      color: any;
      // New additions for SpatialField
      fogExp2: any;
      points: any;
      pointsMaterial: any;
      bufferGeometry: any;
      float32BufferAttribute: any;
      gridHelper: any;
      octahedronGeometry: any;
      sphereGeometry: any;
      meshStandardMaterial: any;
      lineBasicMaterial: any;
      edgesGeometry: any;
      lineSegments: any;
      instancedMesh: any; // Added for rocks
      dodecahedronGeometry: any; // Added for rocks
      icosahedronGeometry: any; // Added for jagged rocks
      torusGeometry: any; // Added for 3D shield rings
      // Catch-all for HTML elements and other R3F elements
      [elemName: string]: any;
    }
  }
}
