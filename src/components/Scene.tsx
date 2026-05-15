'use client'

import { Suspense, useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, extend } from '@react-three/fiber'
import * as THREE from 'three'

/* ─── Custom liquid metallic shader ─── */
class LiquidMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uColor1: { value: new THREE.Color('#1a0a2e') },
        uColor2: { value: new THREE.Color('#4338ca') },
        uColor3: { value: new THREE.Color('#7c3aed') },
        uColor4: { value: new THREE.Color('#c084fc') },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uMouse;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vDisplacement;

        vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
        vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v){
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod(i, 289.0);
          vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 1.0/7.0;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
          vNormal = normal;
          vPosition = position;

          // Slowed down — was 0.3, now 0.12
          float slow = uTime * 0.12;
          float n1 = snoise(position * 1.2 + slow) * 0.3;
          float n2 = snoise(position * 2.4 + slow * 1.1) * 0.12;
          float n3 = snoise(position * 4.0 + slow * 0.5) * 0.04;
          float displacement = n1 + n2 + n3;

          // Mouse influence
          float mouseInfluence = smoothstep(2.0, 0.0, length(position.xy - uMouse * 1.5));
          displacement += mouseInfluence * 0.12;

          vDisplacement = displacement;

          vec3 newPosition = position + normal * displacement;

          // Recalculate normals
          float eps = 0.01;
          vec3 tangent1 = normalize(cross(normal, vec3(0.0, 1.0, 0.0)));
          vec3 tangent2 = normalize(cross(normal, tangent1));
          float d1 = snoise((position + tangent1 * eps) * 1.2 + slow) * 0.3
                    + snoise((position + tangent1 * eps) * 2.4 + slow * 1.1) * 0.12;
          float d2 = snoise((position + tangent2 * eps) * 1.2 + slow) * 0.3
                    + snoise((position + tangent2 * eps) * 2.4 + slow * 1.1) * 0.12;
          vec3 neighbor1 = (position + tangent1 * eps) + normal * d1;
          vec3 neighbor2 = (position + tangent2 * eps) + normal * d2;
          vNormal = normalize(cross(neighbor1 - newPosition, neighbor2 - newPosition));

          vWorldPosition = (modelMatrix * vec4(newPosition, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec3 uColor4;

        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vDisplacement;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          vec3 normal = normalize(vNormal);

          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);

          // Slowed iridescent shift — was 0.1, now 0.04
          float shift = vDisplacement * 3.0 + uTime * 0.04;
          vec3 iridescentColor = mix(uColor1, uColor2, smoothstep(-0.3, 0.3, sin(shift * 2.0)));
          iridescentColor = mix(iridescentColor, uColor3, smoothstep(-0.3, 0.3, sin(shift * 3.0 + 1.0)));
          iridescentColor = mix(iridescentColor, uColor4, fresnel * 0.6);

          vec3 lightDir1 = normalize(vec3(2.0, 3.0, 4.0));
          vec3 lightDir2 = normalize(vec3(-3.0, 1.0, 2.0));
          vec3 halfDir1 = normalize(lightDir1 + viewDir);
          vec3 halfDir2 = normalize(lightDir2 + viewDir);
          float spec1 = pow(max(dot(normal, halfDir1), 0.0), 80.0);
          float spec2 = pow(max(dot(normal, halfDir2), 0.0), 60.0);

          vec3 color = iridescentColor * 0.6;
          color += fresnel * vec3(0.5, 0.4, 0.8) * 0.8;
          color += spec1 * vec3(0.9, 0.85, 1.0) * 0.7;
          color += spec2 * vec3(0.4, 0.5, 1.0) * 0.3;
          color *= 0.8 + vDisplacement * 0.5;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })
  }
}

extend({ LiquidMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    liquidMaterial: any
  }
}

/* ─── The liquid blob ─── */
function LiquidBlob({ isMobile }: { isMobile: boolean }) {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useRef<LiquidMaterial>(null)
  const mouse = useRef({ x: 0, y: 0 })
  const smoothMouse = useRef(new THREE.Vector2(0, 0))
  const targetPos = useRef(new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length === 0) return
      const touch = e.touches[0]
      mouse.current.x = (touch.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(touch.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', handleMouse)
    window.addEventListener('touchmove', handleTouch, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouse)
      window.removeEventListener('touchmove', handleTouch)
    }
  }, [])

  const blobScale = isMobile ? 1.4 : 2.0
  const detail = isMobile ? 64 : 128

  useFrame(({ clock }) => {
    if (!mesh.current || !material.current) return
    const t = clock.getElapsedTime()

    material.current.uniforms.uTime.value = t

    // Smooth mouse — slower lerp for dreamy feel
    smoothMouse.current.x += (mouse.current.x - smoothMouse.current.x) * 0.02
    smoothMouse.current.y += (mouse.current.y - smoothMouse.current.y) * 0.02
    material.current.uniforms.uMouse.value.copy(smoothMouse.current)

    // Drift toward cursor
    targetPos.current.x = smoothMouse.current.x * (isMobile ? 0.4 : 0.8)
    targetPos.current.y = smoothMouse.current.y * (isMobile ? 0.25 : 0.5)
    mesh.current.position.lerp(targetPos.current, 0.01)

    // Very slow rotation
    mesh.current.rotation.x = Math.sin(t * 0.06) * 0.1 + smoothMouse.current.y * 0.08
    mesh.current.rotation.y = t * 0.02 + smoothMouse.current.x * 0.06
  })

  return (
    <mesh ref={mesh} scale={blobScale}>
      <icosahedronGeometry args={[1, detail]} />
      <liquidMaterial ref={material} />
    </mesh>
  )
}

export default function Scene() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, isMobile ? 5.5 : 4.5], fov: 45 }}
        gl={{ antialias: !isMobile, alpha: false, powerPreference: 'high-performance' }}
        dpr={isMobile ? [1, 1] : [1, 2]}
        style={{ background: '#050505' }}
      >
        <color attach="background" args={['#050505']} />

        <Suspense fallback={null}>
          <LiquidBlob isMobile={isMobile} />
        </Suspense>
      </Canvas>
    </div>
  )
}
