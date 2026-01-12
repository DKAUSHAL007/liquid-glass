/* eslint-disable react/no-unknown-property */
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uBalls[4];
uniform float uRadii[4];
uniform sampler2D uBackground;

varying vec2 vUv;

const float EPS = 0.001;
const int MAX_STEPS = 48;
const float MAX_DIST = 10.0;

float smoothMin(float d1, float d2, float k) {
  float h = max(k - abs(d1 - d2), 0.0) / k;
  return min(d1, d2) - h * h * k * 0.25;
}

float sdSphere(vec3 p, vec3 center, float radius) {
  return length(p - center) - radius;
}

float map(vec3 p) {
  float d = MAX_DIST;
  float k = 0.25; // Controls gooeyness - higher = more liquid blend
  
  for (int i = 0; i < 4; i++) {
    if (uRadii[i] < 0.001) continue;
    float sphere = sdSphere(p, uBalls[i], uRadii[i]);
    d = smoothMin(d, sphere, k);
  }
  
  return d;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(EPS, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  
  float a = hash(i);
  float b = hash(i + vec3(1.0, 0.0, 0.0));
  float c = hash(i + vec3(0.0, 1.0, 0.0));
  float d = hash(i + vec3(1.0, 1.0, 0.0));
  float ee = hash(i + vec3(0.0, 0.0, 1.0));
  float f1 = hash(i + vec3(1.0, 0.0, 1.0));
  float g = hash(i + vec3(0.0, 1.0, 1.0));
  float h = hash(i + vec3(1.0, 1.0, 1.0));
  
  return mix(
    mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
    mix(mix(ee, f1, f.x), mix(g, h, f.x), f.y),
    f.z
  );
}

void main() {
  vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  
  vec3 rayOrigin = vec3(uv.x, uv.y, 2.0);
  vec3 rayDir = vec3(0.0, 0.0, -1.0);
  
  float totalDist = 0.0;
  vec3 pos = rayOrigin;
  bool hit = false;
  
  for (int i = 0; i < MAX_STEPS; i++) {
    float dist = map(pos);
    if (dist < EPS) {
      hit = true;
      break;
    }
    if (totalDist > MAX_DIST) break;
    totalDist += dist;
    pos = rayOrigin + rayDir * totalDist;
  }
  
  if (hit) {
    vec3 normal = calcNormal(pos);
    
    // View-dependent fresnel
    float NdotV = abs(dot(normal, -rayDir));
    float fresnel = pow(1.0 - NdotV, 3.0);
    
    // Refraction for background distortion
    float ior = 1.15;
    vec3 refractDir = refract(rayDir, normal, 1.0 / ior);
    vec3 reflectDir = reflect(rayDir, normal);
    
    // Calculate refracted UV for background sampling with chromatic aberration
    float refractionStrength = 0.12;
    vec2 refractOffset = refractDir.xy * refractionStrength;
    
    // Chromatic aberration - sample background at slightly different offsets per channel
    float aberrationAmount = 0.02 * (1.0 + fresnel);
    vec2 uvR = screenUv + refractOffset * (1.0 + aberrationAmount);
    vec2 uvG = screenUv + refractOffset;
    vec2 uvB = screenUv + refractOffset * (1.0 - aberrationAmount);
    
    // Sample background - use screen position for refraction effect
    // Since we can't sample the actual page background, create a subtle tinted glass effect
    vec3 bgColorR = vec3(0.95, 0.95, 0.98);
    vec3 bgColorG = vec3(0.95, 0.95, 0.98);
    vec3 bgColorB = vec3(0.95, 0.95, 0.98);
    
    vec3 refractedBg;
    refractedBg.r = bgColorR.r;
    refractedBg.g = bgColorG.g;
    refractedBg.b = bgColorB.b;
    
    // Start with refracted background - no tint, pure transparency
    vec3 glassColor = refractedBg;
    
    // Subtle edge highlight (diffraction-like at edges only)
    float edgeFactor = pow(1.0 - NdotV, 5.0);
    vec3 edgeColor = vec3(
      0.5 + 0.5 * sin(edgeFactor * 6.28 + 0.0),
      0.5 + 0.5 * sin(edgeFactor * 6.28 + 2.09),
      0.5 + 0.5 * sin(edgeFactor * 6.28 + 4.18)
    );
    glassColor += edgeColor * edgeFactor * 0.08;
    
    // Specular highlights - subtle
    vec3 lightDir1 = normalize(vec3(1.0, 1.0, 1.0));
    vec3 lightDir2 = normalize(vec3(-0.5, 0.8, 0.5));
    float spec1 = pow(max(0.0, dot(reflectDir, lightDir1)), 80.0);
    float spec2 = pow(max(0.0, dot(reflectDir, lightDir2)), 60.0);
    glassColor += vec3(1.0) * spec1 * 0.4;
    glassColor += vec3(1.0) * spec2 * 0.2;
    
    // Very subtle rim
    float rim = pow(1.0 - NdotV, 3.0);
    glassColor += vec3(1.0) * rim * 0.1;
    
    // Alpha - mostly transparent, slightly more visible at edges
    float alpha = 0.15 + fresnel * 0.3 + rim * 0.1;
    
    gl_FragColor = vec4(glassColor, alpha);
  } else {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
  }
}
`;

function MetaballMesh({ active }) {
  const meshRef = useRef();
  const animRef = useRef({ 
    radii: [0.28, 0, 0, 0],
    startTime: 0,
    wasActive: false
  });

  const uniforms = useMemo(() => ({
    uResolution: { value: new THREE.Vector2(200, 600) },
    uTime: { value: 0 },
    uBalls: { value: [
      new THREE.Vector3(0, 0.4, 0),
      new THREE.Vector3(0, 0.4, 0),
      new THREE.Vector3(0, 0.4, 0),
      new THREE.Vector3(0, 0.4, 0),
    ]},
    uRadii: { value: [0.38, 0, 0, 0] },
  }), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const u = meshRef.current.material.uniforms;
    const anim = animRef.current;
    
    u.uTime.value = state.clock.elapsedTime;
    
    // Track when active state changes for staggered animation
    if (active !== anim.wasActive) {
      anim.startTime = state.clock.elapsedTime;
      anim.wasActive = active;
      // Reset velocities on state change for clean animation
      anim.velY = [0, 0, 0, 0];
      anim.velR = [0, 0, 0, 0];
    }
    
    const elapsed = state.clock.elapsedTime - anim.startTime;
    
    // Parent higher up, children match icon spacing
    const baseX = 0.95;
    const baseY = 2.96;
    const spacing = 0.62;
    
    // Stagger delays - parent instant, children staggered
    const staggerDelay = 0.2;
    const childDelays = [0, staggerDelay, staggerDelay * 2, staggerDelay * 3];
    
    const openPositions = [baseY, baseY - spacing * 2.6, baseY - spacing * 3.9, baseY - spacing * 5.2];
    const closedY = baseY;
    
    const openRadii = [0.38, 0.30, 0.30, 0.30];
    const closedRadii = [0.28, 0, 0, 0];
    
    // Initialize velocity arrays if not exists
    if (!anim.velY) anim.velY = [0, 0, 0, 0];
    if (!anim.velR) anim.velR = [0, 0, 0, 0];
    
    for (let i = 0; i < 4; i++) {
      const ball = u.uBalls.value[i];
      
      // Has this ball's stagger delay passed?
      const hasStarted = elapsed >= childDelays[i];
      
      // Final targets
      const finalY = active ? openPositions[i] : closedY;
      const finalR = active ? openRadii[i] : closedRadii[i];
      
      // If not started yet, don't move toward target
      let targetY, targetR;
      if (hasStarted) {
        targetY = finalY;
        targetR = finalR;
      } else {
        // Hold position until delay passes
        targetY = ball.y;
        targetR = anim.radii[i];
      }
      
      // Distance for easing
      const distY = Math.abs(finalY - ball.y);
      
      let stiffness, damping;
      if (active) {
        const progress = 1 - Math.min(distY / (spacing * 2), 1);
        stiffness = 25 + progress * 60;
        damping = 6 + progress * 6;
      } else {
        const progress = Math.min(distY / (spacing * 2), 1);
        stiffness = 40 + progress * 60;
        damping = 6 + (1 - progress) * 6;
      }
      
      // Spring physics for Y
      const forceY = (targetY - ball.y) * stiffness;
      anim.velY[i] += forceY * delta;
      anim.velY[i] *= Math.exp(-damping * delta);
      ball.y += anim.velY[i] * delta;
      
      ball.x = baseX;
      
      // Spring physics for radius
      const forceR = (targetR - anim.radii[i]) * 60;
      anim.velR[i] += forceR * delta;
      anim.velR[i] *= Math.exp(-10 * delta);
      anim.radii[i] += anim.velR[i] * delta;
      
      u.uRadii.value[i] = Math.max(0, anim.radii[i]);
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function GooeyMenu({ active, onToggle, menuItems = [] }) {
  return (
    <div className="gooey-menu-wrapper">
      {/* Canvas container - centered */}
      <div className="gooey-canvas-container">
        <Canvas
          camera={{ position: [0, 0, 1] }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <MetaballMesh active={active} />
        </Canvas>
      </div>
      
      {/* Clickable button */}
      <button 
        className={`gooey-button ${active ? 'active' : ''}`}
        onClick={onToggle}
        aria-label="Toggle menu"
      >
        <span className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
      
      {/* Menu items */}
      <div className={`gooey-items ${active ? 'open' : ''}`}>
        {menuItems.map((item, index) => (
          <a
            key={item.label}
            href={`#${item.label.toLowerCase()}`}
            className="gooey-item"
            style={{
              top: `${(index + 1) * 80}px`,
              transitionDelay: active ? `${index * 0.08 + 0.1}s` : `${(menuItems.length - 1 - index) * 0.05}s`,
            }}
          >
            <span className="gooey-icon">{item.icon}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
