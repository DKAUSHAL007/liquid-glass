/* eslint-disable react/no-unknown-property */
import * as THREE from 'three';
import { useRef, useState, useEffect, memo } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import {
  useFBO,
  useGLTF,
  useScroll,
  Image,
  Scroll,
  Preload,
  ScrollControls,
  MeshTransmissionMaterial,
  Text
} from '@react-three/drei';

const NAV_ITEMS = [
  { label: 'Home', link: '#home' },
  { label: 'About', link: '#about' },
  { label: 'Work', link: '#work' },
  { label: 'Contact', link: '#contact' }
];

export default function FluidGlass() {
  return (
    <div className="fluid-glass-container">
      <Canvas camera={{ position: [0, 0, 20], fov: 15 }} gl={{ alpha: true }}>
        <ScrollControls damping={0.2} pages={3} distance={0.4}>
          <NavItems items={NAV_ITEMS} />
          <Bar>
            <Scroll>
              <Typography />
              <Images />
            </Scroll>
            <Scroll html />
            <Preload />
          </Bar>
        </ScrollControls>
      </Canvas>
    </div>
  );
}

// Bar component - locked to bottom, contains scene content
const Bar = memo(function Bar({ children }) {
  const ref = useRef();
  const { nodes } = useGLTF('/bar.glb');
  const buffer = useFBO();
  const { viewport: vp } = useThree();
  const [scene] = useState(() => new THREE.Scene());
  const geoWidthRef = useRef(1);

  useEffect(() => {
    const geo = nodes.Cube?.geometry;
    if (geo) {
      geo.computeBoundingBox();
      geoWidthRef.current = geo.boundingBox.max.x - geo.boundingBox.min.x || 1;
    }
  }, [nodes]);

  useFrame((state) => {
    const { gl, viewport, camera } = state;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);

    // Lock to bottom
    ref.current.position.set(0, -v.height / 2 + 0.2, 15);

    // Scale to fit width
    const maxWorld = v.width * 0.7;
    const desired = maxWorld / geoWidthRef.current;
    ref.current.scale.setScalar(Math.min(0.12, desired));

    gl.setRenderTarget(buffer);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
  });

  return (
    <>
      {createPortal(children, scene)}
      <mesh scale={[vp.width, vp.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} />
      </mesh>
      <mesh
        ref={ref}
        rotation-x={Math.PI / 2}
        geometry={nodes.Cube?.geometry}
      >
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          transmission={1}
          roughness={0}
          thickness={10}
          ior={1.15}
          chromaticAberration={0.1}
          anisotropy={0.01}
          color="#ffffff"
          attenuationColor="#ffffff"
          attenuationDistance={0.25}
        />
      </mesh>
    </>
  );
});

// Nav items - positioned on the bar
function NavItems({ items }) {
  const group = useRef();
  const { viewport, camera } = useThree();

  const [spacing, setSpacing] = useState(0.3);
  const [fontSize, setFontSize] = useState(0.035);

  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth;
      if (w <= 639) {
        setSpacing(0.15);
        setFontSize(0.025);
      } else if (w <= 1023) {
        setSpacing(0.18);
        setFontSize(0.028);
      } else {
        setSpacing(0.22);
        setFontSize(0.03);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useFrame(() => {
    if (!group.current) return;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);
    group.current.position.set(0, -v.height / 2 + 0.2, 15.1);
    group.current.children.forEach((child, i) => {
      child.position.x = (i - (items.length - 1) / 2) * spacing;
    });
  });

  const handleNavigate = (link) => {
    if (!link) return;
    link.startsWith('#') ? (window.location.hash = link) : (window.location.href = link);
  };

  return (
    <group ref={group} renderOrder={10}>
      {items.map(({ label, link }) => (
        <Text
          key={label}
          fontSize={fontSize}
          color="white"
          anchorX="center"
          anchorY="middle"
          depthWrite={false}
          outlineWidth={0}
          outlineBlur="20%"
          outlineColor="#000"
          outlineOpacity={0.5}
          depthTest={false}
          renderOrder={10}
          onClick={(e) => {
            e.stopPropagation();
            handleNavigate(link);
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = 'auto')}
        >
          {label}
        </Text>
      ))}
    </group>
  );
}

function Images() {
  const group = useRef();
  const data = useScroll();
  const { height } = useThree((s) => s.viewport);

  useFrame(() => {
    const c = group.current.children;
    if (c[0]?.material) c[0].material.zoom = 1 + data.range(0, 1 / 3) / 3;
    if (c[1]?.material) c[1].material.zoom = 1 + data.range(0, 1 / 3) / 3;
    if (c[2]?.material) c[2].material.zoom = 1 + data.range(1.15 / 3, 1 / 3) / 2;
    if (c[3]?.material) c[3].material.zoom = 1 + data.range(1.15 / 3, 1 / 3) / 2;
    if (c[4]?.material) c[4].material.zoom = 1 + data.range(1.15 / 3, 1 / 3) / 2;
  });

  return (
    <group ref={group}>
      <Image position={[-2, 0, 0]} scale={[3, height / 1.1, 1]} url="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80" />
      <Image position={[2, 0, 3]} scale={3} url="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80" />
      <Image position={[-2.05, -height, 6]} scale={[1, 3, 1]} url="https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=400&q=80" />
      <Image position={[-0.6, -height, 9]} scale={[1, 2, 1]} url="https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&q=80" />
      <Image position={[0.75, -height, 10.5]} scale={1.5} url="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&q=80" />
    </group>
  );
}

function Typography() {
  const [fontSize, setFontSize] = useState(0.6);

  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth;
      setFontSize(w <= 639 ? 0.2 : w <= 1023 ? 0.4 : 0.6);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <Text
      position={[0, 0, 12]}
      fontSize={fontSize}
      letterSpacing={-0.05}
      outlineWidth={0}
      outlineBlur="20%"
      outlineColor="#000"
      outlineOpacity={0.5}
      color="white"
      anchorX="center"
      anchorY="middle"
    >
      Liquid Glass
    </Text>
  );
}
