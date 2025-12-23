/**
 * 3D 스켈레톤 시각화 컴포넌트 (OpenCap 계측 리포트 스타일)
 *
 * 핵심 좌표계:
 * - hipMid(골반 중심)를 원점(0,0,0)으로 정렬
 * - 모든 좌표를 hipMid 기준으로 변환
 * - 기준선도 같은 좌표계에서 생성
 * - 스켈레톤과 기준선이 겹쳐서 표시됨
 */

'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import * as THREE from 'three'

interface Landmark {
  x: number
  y: number
  z: number
  visibility: number
}

interface Props {
  landmarks: Landmark[] | null
  worldLandmarks?: Landmark[] | null
  width?: number
  height?: number
  className?: string
  viewMode?: 'front' | 'side' | 'back'
}

// 관절 연결 정의
const CONNECTIONS = [
  [11, 12], [11, 23], [12, 24], [23, 24],  // 몸통
  [11, 13], [13, 15], [12, 14], [14, 16],  // 팔
  [23, 25], [25, 27], [24, 26], [26, 28],  // 다리
  [0, 11], [0, 12],  // 머리-어깨 연결
]

// 주요 관절 인덱스
const MAIN_JOINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]

// OrbitControls 타입
interface OrbitControlsInstance {
  enableDamping: boolean
  dampingFactor: number
  enableZoom: boolean
  enableRotate: boolean
  enablePan: boolean
  target: THREE.Vector3
  update: () => void
  dispose: () => void
}

export default function Skeleton3D({
  landmarks,
  worldLandmarks,
  width = 400,
  height = 480,
  className = '',
  viewMode = 'front',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControlsInstance | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const skeletonGroupRef = useRef<THREE.Group | null>(null)
  const frameIdRef = useRef<number>(0)
  const isInitializedRef = useRef(false)

  // Trunk Tilt 각도 상태
  const [trunkTilt, setTrunkTilt] = useState<number>(0)
  // 포인트 수 상태
  const [pointCount, setPointCount] = useState<number>(0)

  // 활성 랜드마크 선택 (worldLandmarks 우선)
  const activeLandmarks = useMemo(() => {
    return worldLandmarks || landmarks
  }, [landmarks, worldLandmarks])

  // hipMid 기준으로 정렬된 좌표 계산
  const alignedLandmarks = useMemo(() => {
    if (!activeLandmarks || activeLandmarks.length !== 33) return null

    const leftHip = activeLandmarks[23]
    const rightHip = activeLandmarks[24]

    if (!leftHip || !rightHip) return null

    // hipMid 계산 (골반 중심) - 이것이 원점이 됨
    const hipMidX = (leftHip.x + rightHip.x) / 2
    const hipMidY = (leftHip.y + rightHip.y) / 2
    const hipMidZ = (leftHip.z + rightHip.z) / 2

    // 스케일 계산 (인체 높이 기준)
    const head = activeLandmarks[0]
    const ankle = activeLandmarks[27]
    let bodyHeight = 1.0

    if (head && ankle && head.visibility > 0.5 && ankle.visibility > 0.5) {
      bodyHeight = Math.abs(head.y - ankle.y)
    }

    // 목표 높이: 1.6 단위 (기준선 높이의 약 80%)
    const targetHeight = 1.6
    const scale = bodyHeight > 0.01 ? targetHeight / bodyHeight : 2.0

    // 모든 좌표를 hipMid 기준으로 정렬 + 스케일 적용
    return activeLandmarks.map((lm) => ({
      x: (lm.x - hipMidX) * scale,
      y: -(lm.y - hipMidY) * scale, // y 반전 (화면 좌표 -> 3D 좌표)
      z: (lm.z - hipMidZ) * scale,
      visibility: lm.visibility,
    }))
  }, [activeLandmarks])

  // 카메라 뷰 설정
  const setCameraView = (mode: string) => {
    if (!cameraRef.current || !controlsRef.current) return

    const camera = cameraRef.current
    const controls = controlsRef.current

    // 모든 뷰에서 몸통 중심을 바라봄
    controls.target.set(0, 0.3, 0)

    const startPos = camera.position.clone()
    let endPos: THREE.Vector3

    switch (mode) {
      case 'front':
        endPos = new THREE.Vector3(0, 0.3, 3)
        break
      case 'side':
        endPos = new THREE.Vector3(3, 0.3, 0)
        break
      case 'back':
        endPos = new THREE.Vector3(0, 0.3, -3)
        break
      default:
        endPos = new THREE.Vector3(0, 0.3, 3)
    }

    // 부드러운 카메라 전환
    const duration = 350
    const startTime = Date.now()

    const animateCamera = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic

      camera.position.lerpVectors(startPos, endPos, eased)
      controls.update()

      if (progress < 1) {
        requestAnimationFrame(animateCamera)
      }
    }

    animateCamera()
  }

  // viewMode 변경 시 카메라 이동
  useEffect(() => {
    if (isInitializedRef.current) {
      setCameraView(viewMode)
    }
  }, [viewMode])

  // Three.js 초기화
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return

    const container = containerRef.current

    // 씬 - GitHub Dark 배경
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0d1117)
    sceneRef.current = scene

    // 카메라
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 0.3, 3)
    cameraRef.current = camera

    // 렌더러
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // 조명
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8)
    keyLight.position.set(2, 4, 3)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x8899bb, 0.4)
    fillLight.position.set(-2, 1, -1)
    scene.add(fillLight)

    // 바닥 그리드 (원점 중심)
    const gridHelper = new THREE.GridHelper(4, 20, 0x21262d, 0x161b22)
    gridHelper.position.y = -0.8
    scene.add(gridHelper)

    // 스켈레톤 그룹
    const skeletonGroup = new THREE.Group()
    scene.add(skeletonGroup)
    skeletonGroupRef.current = skeletonGroup

    // OrbitControls 동적 로드 (SSR 안전)
    const loadControls = async () => {
      try {
        const { OrbitControls } = await import(
          'three/examples/jsm/controls/OrbitControls.js'
        )

        if (!rendererRef.current || !cameraRef.current) return

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.enableZoom = true
        controls.enableRotate = false // 자유 회전 비활성
        controls.enablePan = false
        controls.target.set(0, 0.3, 0)
        controlsRef.current = controls

        // 애니메이션 루프
        const animate = () => {
          frameIdRef.current = requestAnimationFrame(animate)
          controls.update()
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current)
          }
        }
        animate()

        isInitializedRef.current = true
        setCameraView(viewMode)
      } catch (error) {
        console.error('OrbitControls load failed:', error)
      }
    }

    loadControls()

    return () => {
      cancelAnimationFrame(frameIdRef.current)
      if (controlsRef.current) {
        controlsRef.current.dispose()
        controlsRef.current = null
      }
      renderer.dispose()
      if (container && renderer.domElement) {
        try {
          container.removeChild(renderer.domElement)
        } catch {
          /* already removed */
        }
      }
      isInitializedRef.current = false
    }
  }, [width, height])

  // Trunk Tilt 계산 (정렬된 좌표 기준)
  const calculateTrunkTilt = (lm: Landmark[]): number => {
    const leftShoulder = lm[11]
    const rightShoulder = lm[12]
    const leftHip = lm[23]
    const rightHip = lm[24]

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 0
    if (leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5) return 0

    // 정렬된 좌표에서 어깨 중심
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2

    // 정렬된 좌표에서 골반 중심 (이미 0에 가까움)
    const hipMidX = (leftHip.x + rightHip.x) / 2
    const hipMidY = (leftHip.y + rightHip.y) / 2

    // 수직선과의 각도
    const dx = shoulderMidX - hipMidX
    const dy = shoulderMidY - hipMidY

    if (Math.abs(dy) < 0.001) return 0

    const angle = Math.atan2(dx, dy) * (180 / Math.PI)
    return Math.round(angle * 10) / 10
  }

  // 스켈레톤 렌더링
  useEffect(() => {
    if (!skeletonGroupRef.current || !alignedLandmarks) return

    const group = skeletonGroupRef.current

    // 기존 객체 제거
    while (group.children.length > 0) {
      const child = group.children[0]
      group.remove(child)
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose()
        if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
          child.material.dispose()
        }
      }
    }

    // 포인트 수 계산
    const visiblePoints = alignedLandmarks.filter((l) => l.visibility > 0.5).length
    setPointCount(visiblePoints)

    // Trunk Tilt 계산
    const tilt = calculateTrunkTilt(alignedLandmarks)
    setTrunkTilt(tilt)

    // === 기준선 생성 (정렬된 좌표계 기준) ===

    // 1. 전역 수직 기준선 (x=0 통과, 인체 중심과 겹침)
    const verticalMat = new THREE.LineDashedMaterial({
      color: 0x60a5fa, // 밝은 파랑
      dashSize: 0.1,
      gapSize: 0.05,
    })
    const verticalPoints = [
      new THREE.Vector3(0, 1.2, 0), // 머리 위
      new THREE.Vector3(0, -0.8, 0), // 발 아래
    ]
    const verticalGeo = new THREE.BufferGeometry().setFromPoints(verticalPoints)
    const verticalLine = new THREE.Line(verticalGeo, verticalMat)
    verticalLine.computeLineDistances()
    group.add(verticalLine)

    // 2. 어깨 기준선 (정렬된 어깨 y 위치)
    const leftShoulder = alignedLandmarks[11]
    const rightShoulder = alignedLandmarks[12]
    if (leftShoulder?.visibility > 0.5 && rightShoulder?.visibility > 0.5) {
      const shoulderY = (leftShoulder.y + rightShoulder.y) / 2

      const shoulderMat = new THREE.LineDashedMaterial({
        color: 0x4ade80, // 밝은 초록
        dashSize: 0.08,
        gapSize: 0.04,
      })
      const shoulderPoints = [
        new THREE.Vector3(-0.8, shoulderY, 0),
        new THREE.Vector3(0.8, shoulderY, 0),
      ]
      const shoulderGeo = new THREE.BufferGeometry().setFromPoints(shoulderPoints)
      const shoulderLine = new THREE.Line(shoulderGeo, shoulderMat)
      shoulderLine.computeLineDistances()
      group.add(shoulderLine)
    }

    // 3. 골반 기준선 (y=0 근처, 정렬 기준점)
    const leftHip = alignedLandmarks[23]
    const rightHip = alignedLandmarks[24]
    if (leftHip?.visibility > 0.5 && rightHip?.visibility > 0.5) {
      const pelvisY = (leftHip.y + rightHip.y) / 2 // 거의 0

      const pelvisMat = new THREE.LineDashedMaterial({
        color: 0xfbbf24, // 밝은 노랑
        dashSize: 0.08,
        gapSize: 0.04,
      })
      const pelvisPoints = [
        new THREE.Vector3(-0.7, pelvisY, 0),
        new THREE.Vector3(0.7, pelvisY, 0),
      ]
      const pelvisGeo = new THREE.BufferGeometry().setFromPoints(pelvisPoints)
      const pelvisLine = new THREE.Line(pelvisGeo, pelvisMat)
      pelvisLine.computeLineDistances()
      group.add(pelvisLine)
    }

    // === Trunk Tilt 시각화 ===
    if (
      leftShoulder?.visibility > 0.5 &&
      rightShoulder?.visibility > 0.5 &&
      leftHip?.visibility > 0.5 &&
      rightHip?.visibility > 0.5 &&
      Math.abs(tilt) > 1
    ) {
      const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
      const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2
      const hipMidX = (leftHip.x + rightHip.x) / 2
      const hipMidY = (leftHip.y + rightHip.y) / 2

      // 몸통축 선 (실제 기울기) - 빨간색
      const trunkLineMat = new THREE.LineBasicMaterial({ color: 0xf87171 })
      const trunkPoints = [
        new THREE.Vector3(hipMidX, hipMidY, 0.01),
        new THREE.Vector3(shoulderMidX, shoulderMidY, 0.01),
      ]
      const trunkGeo = new THREE.BufferGeometry().setFromPoints(trunkPoints)
      const trunkLine = new THREE.Line(trunkGeo, trunkLineMat)
      group.add(trunkLine)

      // 수직 기준선 (비교용) - 연한 파랑
      const refLineMat = new THREE.LineBasicMaterial({
        color: 0x60a5fa,
        transparent: true,
        opacity: 0.4,
      })
      const refPoints = [
        new THREE.Vector3(hipMidX, hipMidY, 0.01),
        new THREE.Vector3(hipMidX, shoulderMidY, 0.01),
      ]
      const refGeo = new THREE.BufferGeometry().setFromPoints(refPoints)
      const refLine = new THREE.Line(refGeo, refLineMat)
      group.add(refLine)

      // 각도 Arc
      const arcPoints: THREE.Vector3[] = []
      const arcRadius = 0.15
      const arcSegments = 20
      const angleRad = (Math.abs(tilt) * Math.PI) / 180
      const direction = tilt >= 0 ? 1 : -1

      for (let i = 0; i <= arcSegments; i++) {
        const t = (i / arcSegments) * angleRad
        const x = hipMidX + arcRadius * Math.sin(t * direction)
        const y = hipMidY + arcRadius * Math.cos(t)
        arcPoints.push(new THREE.Vector3(x, y, 0.02))
      }

      const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints)
      const arcMat = new THREE.LineBasicMaterial({ color: 0xfbbf24 })
      const arc = new THREE.Line(arcGeo, arcMat)
      group.add(arc)
    }

    // === 스켈레톤 렌더링 ===

    // 뼈대 재질 (밝은 회색-청색)
    const boneMaterial = new THREE.MeshStandardMaterial({
      color: 0xa8b2bd,
      metalness: 0.2,
      roughness: 0.6,
    })

    // 관절 재질 (밝은 청색, 약간 발광)
    const jointMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8e1ff,
      metalness: 0.3,
      roughness: 0.4,
      emissive: 0x58a6ff,
      emissiveIntensity: 0.15,
    })

    // 좌표 변환 (이미 정렬됨, z만 반전)
    const toThreePos = (lm: Landmark) => {
      return new THREE.Vector3(lm.x, lm.y, -lm.z)
    }

    // 뼈대 생성
    CONNECTIONS.forEach(([i, j]) => {
      const p1 = alignedLandmarks[i]
      const p2 = alignedLandmarks[j]

      if (p1?.visibility > 0.5 && p2?.visibility > 0.5) {
        const start = toThreePos(p1)
        const end = toThreePos(p2)

        const direction = new THREE.Vector3().subVectors(end, start)
        const length = direction.length()

        if (length < 0.01) return // 너무 짧으면 스킵

        const geometry = new THREE.CylinderGeometry(0.025, 0.025, length, 8)
        const bone = new THREE.Mesh(geometry, boneMaterial)

        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
        bone.position.copy(midpoint)

        bone.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.clone().normalize()
        )

        group.add(bone)
      }
    })

    // 관절 생성
    MAIN_JOINTS.forEach((idx) => {
      const lm = alignedLandmarks[idx]
      if (lm?.visibility > 0.5) {
        const position = toThreePos(lm)
        // 주요 관절(어깨, 골반)은 더 크게
        const radius = [11, 12, 23, 24].includes(idx) ? 0.045 : 0.035
        const geometry = new THREE.SphereGeometry(radius, 12, 12)
        const joint = new THREE.Mesh(geometry, jointMaterial)
        joint.position.copy(position)
        group.add(joint)
      }
    })
  }, [alignedLandmarks])

  // 데이터 없음 표시
  if (!alignedLandmarks) {
    return (
      <div
        className={`rounded-lg bg-[#0d1117] flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-[#8b949e]">
          <svg
            className="w-10 h-10 mx-auto mb-2 text-[#484f58]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-sm">No measurement data</p>
          <p className="text-xs mt-1">Perform posture analysis first</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* 3D 캔버스 */}
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden"
        style={{ width, height }}
      />

      {/* Trunk Tilt 표시 - 좌하단 */}
      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/10">
        <p className="text-[10px] text-green-400 font-medium uppercase tracking-wider">
          Trunk Tilt
        </p>
        <p className="text-2xl font-mono text-white">{trunkTilt}°</p>
      </div>

      {/* 포인트 수 표시 - 우상단 */}
      <div className="absolute top-4 right-4 bg-black/70 px-2.5 py-1.5 rounded text-xs text-gray-300 font-mono">
        {pointCount}/33 pts
      </div>
    </div>
  )
}
