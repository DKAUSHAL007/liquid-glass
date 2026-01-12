# Liquid Glass UI

A React demo showcasing liquid glass effects inspired by iOS 26's aesthetic. Features gooey metaball animations, glass refraction using WebGL shaders, and smooth spring physics.

## Features

- **Gooey Menu** - Burger menu with liquid droplet animations using ray marching and smooth minimum blending
- **Glass Nav Bar** - Bottom navigation bar with `MeshTransmissionMaterial` for realistic glass refraction
- **Scrollable Gallery** - Parallax image gallery with zoom effects
- **Spring Physics** - Organic animations with variable stiffness for natural liquid feel

## Tech Stack

- React
- Three.js / React Three Fiber
- Drei (R3F helpers)
- Custom GLSL shaders

## 3D Models Required

Place these GLB files in the `public` folder:
- `lens.glb` - Cylinder geometry for lens effect
- `bar.glb` - Cube geometry for navigation bar

## Getting Started

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Key Techniques

### Smooth Minimum (Gooey Effect)
```glsl
float smoothMin(float d1, float d2, float k) {
  float h = max(k - abs(d1 - d2), 0.0) / k;
  return min(d1, d2) - h * h * k * 0.25;
}
```

### Ray Marching with Metaballs
```glsl
float map(vec3 p) {
  float d = MAX_DIST;
  for (int i = 0; i < 4; i++) {
    float sphere = sdSphere(p, uBalls[i], uRadii[i]);
    d = smoothMin(d, sphere, k);
  }
  return d;
}
```

## Credits

- [React Bits](https://www.reactbits.dev/) - Glass bar component inspiration
- [Inigo Quilez](https://iquilezles.org/articles/smin/) - SDF and smooth minimum techniques
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber)
- [Drei](https://github.com/pmndrs/drei)
