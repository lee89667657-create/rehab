/**
 * 3D 휴머노이드 모델 시각화 컴포넌트
 *
 * Three.js 프로시저럴 휴머노이드 + MediaPipe 랜드마크 기반 포즈
 * - 외부 모델 불필요 (CORS 문제 없음)
 * - hipMid 기준 좌표 정렬
 * - 기준선 유지 (수직, 어깨, 골반)
 */

'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
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

// 휴머노이드 기준 높이 (피벗 포인트)
const HUMANOID_HEIGHTS = {
  shoulder: 1.42,
  hip: 0.90,
}

export default function Skeleton3DModel({
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
  const humanoidRef = useRef<THREE.Group | null>(null)
  const referenceGroupRef = useRef<THREE.Group | null>(null)
  const frameIdRef = useRef<number>(0)
  const isInitializedRef = useRef(false)

  const [trunkTilt, setTrunkTilt] = useState<number>(0)
  const [pointCount, setPointCount] = useState<number>(0)

  // 활성 랜드마크
  const activeLandmarks = useMemo(() => {
    return worldLandmarks || landmarks
  }, [landmarks, worldLandmarks])

  // hipMid 기준 정렬된 좌표
  const alignedLandmarks = useMemo(() => {
    if (!activeLandmarks || activeLandmarks.length !== 33) return null

    const leftHip = activeLandmarks[23]
    const rightHip = activeLandmarks[24]

    if (!leftHip || !rightHip) return null

    const hipMidX = (leftHip.x + rightHip.x) / 2
    const hipMidY = (leftHip.y + rightHip.y) / 2
    const hipMidZ = (leftHip.z + rightHip.z) / 2

    const head = activeLandmarks[0]
    const ankle = activeLandmarks[27]
    let bodyHeight = 1.0

    if (head && ankle && head.visibility > 0.5 && ankle.visibility > 0.5) {
      bodyHeight = Math.abs(head.y - ankle.y)
    }

    const targetHeight = 1.6
    const scale = bodyHeight > 0.01 ? targetHeight / bodyHeight : 2.0

    return activeLandmarks.map((lm) => ({
      x: (lm.x - hipMidX) * scale,
      y: -(lm.y - hipMidY) * scale,
      z: (lm.z - hipMidZ) * scale,
      visibility: lm.visibility,
    }))
  }, [activeLandmarks])

  // 카메라 뷰 설정
  const setCameraView = useCallback((mode: string) => {
    if (!cameraRef.current || !controlsRef.current) return

    const camera = cameraRef.current
    const controls = controlsRef.current

    controls.target.set(0, 1.0, 0)

    const startPos = camera.position.clone()
    let endPos: THREE.Vector3

    switch (mode) {
      case 'front':
        endPos = new THREE.Vector3(0, 1.0, 3.0)
        break
      case 'side':
        endPos = new THREE.Vector3(3.0, 1.0, 0)
        break
      case 'back':
        endPos = new THREE.Vector3(0, 1.0, -3.0)
        break
      default:
        endPos = new THREE.Vector3(0, 1.0, 3.0)
    }

    const duration = 350
    const startTime = Date.now()

    const animateCamera = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      camera.position.lerpVectors(startPos, endPos, eased)
      controls.update()

      if (progress < 1) {
        requestAnimationFrame(animateCamera)
      }
    }

    animateCamera()
  }, [])

  // viewMode 변경 시 카메라 이동
  useEffect(() => {
    if (isInitializedRef.current) {
      setCameraView(viewMode)
    }
  }, [viewMode, setCameraView])

  // Trunk Tilt 계산
  const calculateTrunkTilt = useCallback((lm: Landmark[]): number => {
    const leftShoulder = lm[11]
    const rightShoulder = lm[12]
    const leftHip = lm[23]
    const rightHip = lm[24]

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 0
    if (leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5) return 0

    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2
    const hipMidX = (leftHip.x + rightHip.x) / 2
    const hipMidY = (leftHip.y + rightHip.y) / 2

    const dx = shoulderMidX - hipMidX
    const dy = shoulderMidY - hipMidY

    if (Math.abs(dy) < 0.001) return 0

    const angle = Math.atan2(dx, dy) * (180 / Math.PI)
    return Math.round(angle * 10) / 10
  }, [])

  // 계층적 본 구조로 휴머노이드 생성
  const createHumanoid = useCallback(() => {
    const group = new THREE.Group()

    // 머티리얼
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x8b9dc3,
      metalness: 0.1,
      roughness: 0.7,
    })

    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x58a6ff,
      metalness: 0.3,
      roughness: 0.5,
      emissive: 0x58a6ff,
      emissiveIntensity: 0.1,
    })

    // 기준 위치
    const shoulderY = 1.42
    const shoulderX = 0.20
    const hipY = 0.90
    const hipX = 0.12

    // === 몸통 (중심) ===
    const torsoGroup = new THREE.Group()
    torsoGroup.position.set(0, hipY, 0)
    torsoGroup.name = 'torsoGroup'
    group.add(torsoGroup)

    // 골반
    const pelvisGeo = new THREE.BoxGeometry(0.32, 0.15, 0.16)
    const pelvis = new THREE.Mesh(pelvisGeo, skinMat)
    pelvis.position.y = 0.05
    pelvis.name = 'pelvis'
    torsoGroup.add(pelvis)

    // 척추/몸통
    const spineGeo = new THREE.BoxGeometry(0.30, 0.45, 0.18)
    const spine = new THREE.Mesh(spineGeo, skinMat)
    spine.position.y = 0.35
    spine.name = 'spine'
    torsoGroup.add(spine)

    // 목
    const neckGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8)
    const neck = new THREE.Mesh(neckGeo, skinMat)
    neck.position.y = 0.62
    neck.name = 'neck'
    torsoGroup.add(neck)

    // 머리
    const headGeo = new THREE.SphereGeometry(0.10, 16, 16)
    const head = new THREE.Mesh(headGeo, skinMat)
    head.position.y = 0.72
    head.name = 'head'
    torsoGroup.add(head)

    // === 왼팔 (계층 구조) ===
    // 어깨 피벗 (어깨 위치에서 회전)
    const leftShoulderPivot = new THREE.Group()
    leftShoulderPivot.position.set(-shoulderX, shoulderY, 0)
    leftShoulderPivot.name = 'leftShoulderPivot'
    group.add(leftShoulderPivot)

    // 어깨 관절 (시각적)
    const leftShoulderJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 12),
      jointMat
    )
    leftShoulderJoint.name = 'leftShoulderJoint'
    leftShoulderPivot.add(leftShoulderJoint)

    // 상완 (피벗에서 아래로)
    const upperArmLen = 0.28
    const leftUpperArmGeo = new THREE.CylinderGeometry(0.04, 0.035, upperArmLen, 8)
    const leftUpperArm = new THREE.Mesh(leftUpperArmGeo, skinMat)
    leftUpperArm.position.y = -upperArmLen / 2
    leftUpperArm.name = 'leftUpperArm'
    leftShoulderPivot.add(leftUpperArm)

    // 팔꿈치 피벗
    const leftElbowPivot = new THREE.Group()
    leftElbowPivot.position.y = -upperArmLen
    leftElbowPivot.name = 'leftElbowPivot'
    leftShoulderPivot.add(leftElbowPivot)

    // 팔꿈치 관절
    const leftElbowJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 12, 12),
      jointMat
    )
    leftElbowJoint.name = 'leftElbowJoint'
    leftElbowPivot.add(leftElbowJoint)

    // 하완
    const lowerArmLen = 0.26
    const leftLowerArmGeo = new THREE.CylinderGeometry(0.035, 0.03, lowerArmLen, 8)
    const leftLowerArm = new THREE.Mesh(leftLowerArmGeo, skinMat)
    leftLowerArm.position.y = -lowerArmLen / 2
    leftLowerArm.name = 'leftLowerArm'
    leftElbowPivot.add(leftLowerArm)

    // 손
    const leftHand = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      skinMat
    )
    leftHand.position.y = -lowerArmLen
    leftHand.name = 'leftHand'
    leftElbowPivot.add(leftHand)

    // === 오른팔 (계층 구조) ===
    const rightShoulderPivot = new THREE.Group()
    rightShoulderPivot.position.set(shoulderX, shoulderY, 0)
    rightShoulderPivot.name = 'rightShoulderPivot'
    group.add(rightShoulderPivot)

    const rightShoulderJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 12),
      jointMat
    )
    rightShoulderJoint.name = 'rightShoulderJoint'
    rightShoulderPivot.add(rightShoulderJoint)

    const rightUpperArmGeo = new THREE.CylinderGeometry(0.04, 0.035, upperArmLen, 8)
    const rightUpperArm = new THREE.Mesh(rightUpperArmGeo, skinMat)
    rightUpperArm.position.y = -upperArmLen / 2
    rightUpperArm.name = 'rightUpperArm'
    rightShoulderPivot.add(rightUpperArm)

    const rightElbowPivot = new THREE.Group()
    rightElbowPivot.position.y = -upperArmLen
    rightElbowPivot.name = 'rightElbowPivot'
    rightShoulderPivot.add(rightElbowPivot)

    const rightElbowJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 12, 12),
      jointMat
    )
    rightElbowJoint.name = 'rightElbowJoint'
    rightElbowPivot.add(rightElbowJoint)

    const rightLowerArmGeo = new THREE.CylinderGeometry(0.035, 0.03, lowerArmLen, 8)
    const rightLowerArm = new THREE.Mesh(rightLowerArmGeo, skinMat)
    rightLowerArm.position.y = -lowerArmLen / 2
    rightLowerArm.name = 'rightLowerArm'
    rightElbowPivot.add(rightLowerArm)

    const rightHand = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      skinMat
    )
    rightHand.position.y = -lowerArmLen
    rightHand.name = 'rightHand'
    rightElbowPivot.add(rightHand)

    // === 왼쪽 다리 (계층 구조) ===
    const leftHipPivot = new THREE.Group()
    leftHipPivot.position.set(-hipX, hipY, 0)
    leftHipPivot.name = 'leftHipPivot'
    group.add(leftHipPivot)

    const leftHipJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 12),
      jointMat
    )
    leftHipJoint.name = 'leftHipJoint'
    leftHipPivot.add(leftHipJoint)

    const upperLegLen = 0.42
    const leftUpperLegGeo = new THREE.CylinderGeometry(0.06, 0.05, upperLegLen, 8)
    const leftUpperLeg = new THREE.Mesh(leftUpperLegGeo, skinMat)
    leftUpperLeg.position.y = -upperLegLen / 2
    leftUpperLeg.name = 'leftUpperLeg'
    leftHipPivot.add(leftUpperLeg)

    const leftKneePivot = new THREE.Group()
    leftKneePivot.position.y = -upperLegLen
    leftKneePivot.name = 'leftKneePivot'
    leftHipPivot.add(leftKneePivot)

    const leftKneeJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 12),
      jointMat
    )
    leftKneeJoint.name = 'leftKneeJoint'
    leftKneePivot.add(leftKneeJoint)

    const lowerLegLen = 0.40
    const leftLowerLegGeo = new THREE.CylinderGeometry(0.045, 0.035, lowerLegLen, 8)
    const leftLowerLeg = new THREE.Mesh(leftLowerLegGeo, skinMat)
    leftLowerLeg.position.y = -lowerLegLen / 2
    leftLowerLeg.name = 'leftLowerLeg'
    leftKneePivot.add(leftLowerLeg)

    const leftAnklePivot = new THREE.Group()
    leftAnklePivot.position.y = -lowerLegLen
    leftAnklePivot.name = 'leftAnklePivot'
    leftKneePivot.add(leftAnklePivot)

    const leftAnkleJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 12, 12),
      jointMat
    )
    leftAnkleJoint.name = 'leftAnkleJoint'
    leftAnklePivot.add(leftAnkleJoint)

    const leftFootGeo = new THREE.BoxGeometry(0.08, 0.05, 0.18)
    const leftFoot = new THREE.Mesh(leftFootGeo, skinMat)
    leftFoot.position.set(0, -0.025, 0.05)
    leftFoot.name = 'leftFoot'
    leftAnklePivot.add(leftFoot)

    // === 오른쪽 다리 (계층 구조) ===
    const rightHipPivot = new THREE.Group()
    rightHipPivot.position.set(hipX, hipY, 0)
    rightHipPivot.name = 'rightHipPivot'
    group.add(rightHipPivot)

    const rightHipJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 12),
      jointMat
    )
    rightHipJoint.name = 'rightHipJoint'
    rightHipPivot.add(rightHipJoint)

    const rightUpperLegGeo = new THREE.CylinderGeometry(0.06, 0.05, upperLegLen, 8)
    const rightUpperLeg = new THREE.Mesh(rightUpperLegGeo, skinMat)
    rightUpperLeg.position.y = -upperLegLen / 2
    rightUpperLeg.name = 'rightUpperLeg'
    rightHipPivot.add(rightUpperLeg)

    const rightKneePivot = new THREE.Group()
    rightKneePivot.position.y = -upperLegLen
    rightKneePivot.name = 'rightKneePivot'
    rightHipPivot.add(rightKneePivot)

    const rightKneeJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 12),
      jointMat
    )
    rightKneeJoint.name = 'rightKneeJoint'
    rightKneePivot.add(rightKneeJoint)

    const rightLowerLegGeo = new THREE.CylinderGeometry(0.045, 0.035, lowerLegLen, 8)
    const rightLowerLeg = new THREE.Mesh(rightLowerLegGeo, skinMat)
    rightLowerLeg.position.y = -lowerLegLen / 2
    rightLowerLeg.name = 'rightLowerLeg'
    rightKneePivot.add(rightLowerLeg)

    const rightAnklePivot = new THREE.Group()
    rightAnklePivot.position.y = -lowerLegLen
    rightAnklePivot.name = 'rightAnklePivot'
    rightKneePivot.add(rightAnklePivot)

    const rightAnkleJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 12, 12),
      jointMat
    )
    rightAnkleJoint.name = 'rightAnkleJoint'
    rightAnklePivot.add(rightAnkleJoint)

    const rightFootGeo = new THREE.BoxGeometry(0.08, 0.05, 0.18)
    const rightFoot = new THREE.Mesh(rightFootGeo, skinMat)
    rightFoot.position.set(0, -0.025, 0.05)
    rightFoot.name = 'rightFoot'
    rightAnklePivot.add(rightFoot)

    // 그림자 설정
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    return group
  }, [])

  // Three.js 초기화
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return

    const container = containerRef.current

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0d1117)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000)
    camera.position.set(0, 1.0, 3.0)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0)
    keyLight.position.set(3, 5, 3)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 1024
    keyLight.shadow.mapSize.height = 1024
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x8899bb, 0.4)
    fillLight.position.set(-3, 2, -2)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0x58a6ff, 0.3)
    rimLight.position.set(0, 3, -3)
    scene.add(rimLight)

    // Ground
    const groundGeo = new THREE.PlaneGeometry(6, 6)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x161b22,
      roughness: 0.9,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    ground.receiveShadow = true
    scene.add(ground)

    // Grid
    const gridHelper = new THREE.GridHelper(4, 20, 0x21262d, 0x161b22)
    gridHelper.position.y = 0.01
    scene.add(gridHelper)

    // Reference lines group
    const referenceGroup = new THREE.Group()
    scene.add(referenceGroup)
    referenceGroupRef.current = referenceGroup

    // 휴머노이드 생성
    const humanoid = createHumanoid()
    scene.add(humanoid)
    humanoidRef.current = humanoid

    // Load OrbitControls
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
        controls.enableRotate = true
        controls.enablePan = false
        controls.target.set(0, 1.0, 0)
        controls.minDistance = 1.5
        controls.maxDistance = 6
        controls.minPolarAngle = 0.5
        controls.maxPolarAngle = 2.5
        controlsRef.current = controls

        // Animation loop
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
  }, [width, height, viewMode, setCameraView, createHumanoid])

  // 기준선 업데이트
  useEffect(() => {
    if (!referenceGroupRef.current || !alignedLandmarks) return

    const group = referenceGroupRef.current

    // 기존 제거
    while (group.children.length > 0) {
      const child = group.children[0]
      group.remove(child)
      if (child instanceof THREE.Line) {
        child.geometry.dispose()
      }
    }

    // 포인트 수 계산
    const visiblePoints = alignedLandmarks.filter((l) => l.visibility > 0.5).length
    setPointCount(visiblePoints)

    // Trunk Tilt 계산
    const tilt = calculateTrunkTilt(alignedLandmarks)
    setTrunkTilt(tilt)

    // 수직 기준선
    const verticalMat = new THREE.LineDashedMaterial({
      color: 0x60a5fa,
      dashSize: 0.1,
      gapSize: 0.05,
    })
    const verticalPoints = [
      new THREE.Vector3(0, 1.8, 0.01),
      new THREE.Vector3(0, 0, 0.01),
    ]
    const verticalGeo = new THREE.BufferGeometry().setFromPoints(verticalPoints)
    const verticalLine = new THREE.Line(verticalGeo, verticalMat)
    verticalLine.computeLineDistances()
    group.add(verticalLine)

    // 어깨 기준선
    const shoulderY = HUMANOID_HEIGHTS.shoulder
    const shoulderMat = new THREE.LineDashedMaterial({
      color: 0x4ade80,
      dashSize: 0.08,
      gapSize: 0.04,
    })
    const shoulderPoints = [
      new THREE.Vector3(-0.5, shoulderY, 0.01),
      new THREE.Vector3(0.5, shoulderY, 0.01),
    ]
    const shoulderGeo = new THREE.BufferGeometry().setFromPoints(shoulderPoints)
    const shoulderLine = new THREE.Line(shoulderGeo, shoulderMat)
    shoulderLine.computeLineDistances()
    group.add(shoulderLine)

    // 골반 기준선
    const pelvisY = HUMANOID_HEIGHTS.hip
    const pelvisMat = new THREE.LineDashedMaterial({
      color: 0xfbbf24,
      dashSize: 0.08,
      gapSize: 0.04,
    })
    const pelvisPoints = [
      new THREE.Vector3(-0.4, pelvisY, 0.01),
      new THREE.Vector3(0.4, pelvisY, 0.01),
    ]
    const pelvisGeo = new THREE.BufferGeometry().setFromPoints(pelvisPoints)
    const pelvisLine = new THREE.Line(pelvisGeo, pelvisMat)
    pelvisLine.computeLineDistances()
    group.add(pelvisLine)

    // Trunk Tilt 시각화 (1도 이상일 때)
    if (Math.abs(tilt) > 1) {
      // 몸통 중심선 (빨간색)
      const trunkMat = new THREE.LineBasicMaterial({ color: 0xf87171 })
      const trunkAngleRad = (tilt * Math.PI) / 180
      const trunkTopX = Math.sin(trunkAngleRad) * 0.54
      const trunkPoints = [
        new THREE.Vector3(0, pelvisY, 0.02),
        new THREE.Vector3(trunkTopX, shoulderY, 0.02),
      ]
      const trunkGeo = new THREE.BufferGeometry().setFromPoints(trunkPoints)
      const trunkLine = new THREE.Line(trunkGeo, trunkMat)
      group.add(trunkLine)
    }

  }, [alignedLandmarks, calculateTrunkTilt])

  // 두 랜드마크 사이의 각도 계산 (Z축 회전 - 정면 뷰)
  const calcAngleZ = useCallback((
    from: Landmark,
    to: Landmark
  ): number => {
    if (from.visibility < 0.5 || to.visibility < 0.5) return 0
    const dx = to.x - from.x
    const dy = to.y - from.y
    // 아래 방향(+y)이 0도, 시계 방향으로 양수
    return Math.atan2(-dx, -dy)
  }, [])

  // 두 랜드마크 사이의 각도 계산 (X축 회전 - 측면 뷰)
  const calcAngleX = useCallback((
    from: Landmark,
    to: Landmark
  ): number => {
    if (from.visibility < 0.5 || to.visibility < 0.5) return 0
    const dz = to.z - from.z
    const dy = to.y - from.y
    // MediaPipe z좌표 반전: 작을수록 앞쪽(카메라 방향)
    // Three.js에서 앞으로 뻗으면 양수 회전
    return Math.atan2(-dz, -dy)
  }, [])

  // 휴머노이드 포즈 업데이트 (계층적 피벗 회전)
  useEffect(() => {
    if (!humanoidRef.current || !alignedLandmarks) return

    const humanoid = humanoidRef.current

    // MediaPipe 랜드마크 인덱스
    const lm = {
      nose: alignedLandmarks[0],
      leftShoulder: alignedLandmarks[11],
      rightShoulder: alignedLandmarks[12],
      leftElbow: alignedLandmarks[13],
      rightElbow: alignedLandmarks[14],
      leftWrist: alignedLandmarks[15],
      rightWrist: alignedLandmarks[16],
      leftHip: alignedLandmarks[23],
      rightHip: alignedLandmarks[24],
      leftKnee: alignedLandmarks[25],
      rightKnee: alignedLandmarks[26],
      leftAnkle: alignedLandmarks[27],
      rightAnkle: alignedLandmarks[28],
    }

    // === 몸통 회전 ===
    const torsoGroup = humanoid.getObjectByName('torsoGroup')
    if (torsoGroup && lm.leftShoulder && lm.rightShoulder && lm.leftHip && lm.rightHip) {
      // 몸통 기울기 (어깨 중심 - 골반 중심)
      const shoulderMidX = (lm.leftShoulder.x + lm.rightShoulder.x) / 2
      const hipMidX = (lm.leftHip.x + lm.rightHip.x) / 2
      const shoulderMidY = (lm.leftShoulder.y + lm.rightShoulder.y) / 2
      const hipMidY = (lm.leftHip.y + lm.rightHip.y) / 2

      const tiltZ = Math.atan2(shoulderMidX - hipMidX, shoulderMidY - hipMidY)
      torsoGroup.rotation.z = tiltZ * 0.8

      // 전후 기울기
      const shoulderMidZ = (lm.leftShoulder.z + lm.rightShoulder.z) / 2
      const hipMidZ = (lm.leftHip.z + lm.rightHip.z) / 2
      const tiltX = Math.atan2(shoulderMidZ - hipMidZ, shoulderMidY - hipMidY)
      torsoGroup.rotation.x = tiltX * 0.5
    }

    // === 왼팔 ===
    const leftShoulderPivot = humanoid.getObjectByName('leftShoulderPivot')
    if (leftShoulderPivot && lm.leftShoulder && lm.leftElbow) {
      // 상완 각도 (어깨 -> 팔꿈치)
      const angleZ = calcAngleZ(lm.leftShoulder, lm.leftElbow)
      const angleX = calcAngleX(lm.leftShoulder, lm.leftElbow)
      leftShoulderPivot.rotation.z = angleZ
      leftShoulderPivot.rotation.x = angleX
    }

    const leftElbowPivot = humanoid.getObjectByName('leftElbowPivot')
    if (leftElbowPivot && lm.leftElbow && lm.leftWrist) {
      // 하완 각도 (팔꿈치 -> 손목) - 상완 기준 상대 각도
      const elbowAngleZ = calcAngleZ(lm.leftElbow, lm.leftWrist)
      const shoulderAngleZ = lm.leftShoulder ? calcAngleZ(lm.leftShoulder, lm.leftElbow) : 0
      leftElbowPivot.rotation.z = elbowAngleZ - shoulderAngleZ

      const elbowAngleX = calcAngleX(lm.leftElbow, lm.leftWrist)
      const shoulderAngleX = lm.leftShoulder ? calcAngleX(lm.leftShoulder, lm.leftElbow) : 0
      leftElbowPivot.rotation.x = elbowAngleX - shoulderAngleX
    }

    // === 오른팔 ===
    const rightShoulderPivot = humanoid.getObjectByName('rightShoulderPivot')
    if (rightShoulderPivot && lm.rightShoulder && lm.rightElbow) {
      const angleZ = calcAngleZ(lm.rightShoulder, lm.rightElbow)
      const angleX = calcAngleX(lm.rightShoulder, lm.rightElbow)
      rightShoulderPivot.rotation.z = angleZ
      rightShoulderPivot.rotation.x = angleX
    }

    const rightElbowPivot = humanoid.getObjectByName('rightElbowPivot')
    if (rightElbowPivot && lm.rightElbow && lm.rightWrist) {
      const elbowAngleZ = calcAngleZ(lm.rightElbow, lm.rightWrist)
      const shoulderAngleZ = lm.rightShoulder ? calcAngleZ(lm.rightShoulder, lm.rightElbow) : 0
      rightElbowPivot.rotation.z = elbowAngleZ - shoulderAngleZ

      const elbowAngleX = calcAngleX(lm.rightElbow, lm.rightWrist)
      const shoulderAngleX = lm.rightShoulder ? calcAngleX(lm.rightShoulder, lm.rightElbow) : 0
      rightElbowPivot.rotation.x = elbowAngleX - shoulderAngleX
    }

    // === 왼쪽 다리 ===
    const leftHipPivot = humanoid.getObjectByName('leftHipPivot')
    if (leftHipPivot && lm.leftHip && lm.leftKnee) {
      const angleZ = calcAngleZ(lm.leftHip, lm.leftKnee)
      const angleX = calcAngleX(lm.leftHip, lm.leftKnee)
      leftHipPivot.rotation.z = angleZ
      leftHipPivot.rotation.x = angleX
    }

    const leftKneePivot = humanoid.getObjectByName('leftKneePivot')
    if (leftKneePivot && lm.leftKnee && lm.leftAnkle) {
      const kneeAngleZ = calcAngleZ(lm.leftKnee, lm.leftAnkle)
      const hipAngleZ = lm.leftHip ? calcAngleZ(lm.leftHip, lm.leftKnee) : 0
      leftKneePivot.rotation.z = kneeAngleZ - hipAngleZ

      const kneeAngleX = calcAngleX(lm.leftKnee, lm.leftAnkle)
      const hipAngleX = lm.leftHip ? calcAngleX(lm.leftHip, lm.leftKnee) : 0
      leftKneePivot.rotation.x = kneeAngleX - hipAngleX
    }

    // === 오른쪽 다리 ===
    const rightHipPivot = humanoid.getObjectByName('rightHipPivot')
    if (rightHipPivot && lm.rightHip && lm.rightKnee) {
      const angleZ = calcAngleZ(lm.rightHip, lm.rightKnee)
      const angleX = calcAngleX(lm.rightHip, lm.rightKnee)
      rightHipPivot.rotation.z = angleZ
      rightHipPivot.rotation.x = angleX
    }

    const rightKneePivot = humanoid.getObjectByName('rightKneePivot')
    if (rightKneePivot && lm.rightKnee && lm.rightAnkle) {
      const kneeAngleZ = calcAngleZ(lm.rightKnee, lm.rightAnkle)
      const hipAngleZ = lm.rightHip ? calcAngleZ(lm.rightHip, lm.rightKnee) : 0
      rightKneePivot.rotation.z = kneeAngleZ - hipAngleZ

      const kneeAngleX = calcAngleX(lm.rightKnee, lm.rightAnkle)
      const hipAngleX = lm.rightHip ? calcAngleX(lm.rightHip, lm.rightKnee) : 0
      rightKneePivot.rotation.x = kneeAngleX - hipAngleX
    }

    // === 머리 ===
    const head = humanoid.getObjectByName('head')
    if (head && lm.nose && lm.leftShoulder && lm.rightShoulder) {
      const shoulderMidX = (lm.leftShoulder.x + lm.rightShoulder.x) / 2
      const headTiltZ = (lm.nose.x - shoulderMidX) * 1.5
      head.rotation.z = headTiltZ

      const shoulderMidZ = (lm.leftShoulder.z + lm.rightShoulder.z) / 2
      const headTiltX = (lm.nose.z - shoulderMidZ) * 1.0
      head.rotation.x = headTiltX
    }

  }, [alignedLandmarks, calcAngleZ, calcAngleX])

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

      {/* 3D 모델 표시 */}
      <div className="absolute bottom-4 right-4 bg-blue-900/60 px-2 py-1 rounded text-[10px] text-blue-300">
        3D Humanoid
      </div>
    </div>
  )
}
