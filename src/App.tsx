import {
  SetStateAction,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
// import { useAspect } from "@react-three/drei";
import { Box, Flex, useFlexSize } from "@react-three/flex";

import state from "./state";
import Text from "./Text";
import "./App.css";
import { useAspect } from "@react-three/drei";

import image from "./assets/BH41NVu.jpg";

interface LayercardProps {
  depth: number;
  boxWidth: number;
  boxHeight: number;
  text: string;
  textColor: string;
  color: string;
  map: THREE.Texture;
  textScaleFactor: number;
}

function Layercard({
  depth,
  boxWidth,
  boxHeight,
  text,
  // textColor,
  // color,
  map,
}: // textScaleFactor,
LayercardProps) {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  const { viewport, size } = useThree();
  const pageLerp = useRef(state.top / size.height);
  useFrame(() => {
    const page = (pageLerp.current = THREE.MathUtils.lerp(
      pageLerp.current,
      state.top / size.height,
      0.15
    ));

    if (depth >= 0) {
      if (ref.current) {
        ref.current.opacity =
          page < state.threshold * 1.7 ? 1 : 1 - (page - state.threshold * 1.7);
      }
    }
  });

  return (
    <>
      <mesh position={[boxWidth / 2, -boxHeight / 2, depth]}>
        <planeGeometry attach="geometry" args={[boxWidth, boxHeight]} />
        <meshBasicMaterial
          ref={ref}
          // color={color}
          map={map}
          toneMapped={false}
          transparent
          opacity={1}
        />
      </mesh>
      <Text>{text}</Text>
    </>
  );
}

function HeightReporter({
  onReflow,
}: {
  onReflow: (w: number, h: number) => void;
}) {
  const size = useFlexSize();
  useLayoutEffect(
    () => onReflow && onReflow(size[0], size[1]),
    [onReflow, size]
  );
  return null;
}

interface PageProps {
  text: string;
  tag: string;
  images: string[];
  textScaleFactor: number;
  onReflow: (w: number, h: number) => void;
  left: boolean;
}

const Page = ({ text, tag, images, onReflow, left = false }: PageProps) => {
  const textures = useLoader(THREE.TextureLoader, images);

  const boxProps = {
    centerAnchor: true,
    grow: 1,
    marginTop: 1,
    marginLeft: left ? 1 : 0,
    marginRight: left ? 0 : 1,
    width: "auto",
    height: "auto",
    minWidth: 3,
    minHeight: 3,
    maxWidth: 6,
    maxHeight: 6,
  };

  return (
    <>
      <Box
        dir="column"
        align={left ? "flex-start" : "flex-end"}
        justify="flex-start"
        width="100%"
        height="auto"
        minHeight="100%"
      >
        <HeightReporter onReflow={onReflow} />

        <Box
          dir="row"
          width="100%"
          height="auto"
          justify={left ? "flex-end" : "flex-start"}
          margin={0}
          grow={1}
          wrap="wrap"
        >
          {textures.map((texture, index) => (
            <Box key={index} {...boxProps}>
              {(width, height) => (
                <mesh>
                  <planeGeometry attach="geometry" args={[width, height]} />
                  <meshBasicMaterial map={texture} toneMapped={false} />
                </mesh>
              )}
            </Box>
          ))}
        </Box>

        <Box>
          <Text>
            {tag}
            <meshBasicMaterial color="#cccccc" toneMapped={false} />
          </Text>
        </Box>

        <Box>
          <Text>{text}</Text>
        </Box>
      </Box>
    </>
  );
};

interface ContentProps {
  onReflow: (pages: SetStateAction<number>) => void;
}

const Content = ({ onReflow }: ContentProps) => {
  const group = useRef<THREE.Group>(null);
  const sizeRef = useRef<number[]>([]);

  const texture = useLoader(THREE.TextureLoader, image);

  /**
   * useThree: 현재 Three.js의 렌더링 컨텍스트에 대한 정보를 제공하는 훅
   * viewport: 카메라 뷰포트에 대한 정보로, 3D 공간에서 카메라가 보고 있는 영역의 크기와 위치
   * size: 캔버스의 크기에 관한 정보를 제공
   */
  const { viewport, size } = useThree();

  /**
   * useAspect: 3D 오브젝트가 화면의 다양한 크기에 맞게 적절히 조절되도록 도와주는 도구
   * width, height, zoom
   */
  const [bW, bH] = useAspect(1920, 1920, 0.5);

  const vec = new THREE.Vector3();

  /**
   * Page Linear Interpolation (pageLerp)
   * state.top: 현재 스크롤 위치
   * size.height: 컨테이너의 높이
   * state.top / size.height: 현재 스크롤 위치가 화면 높이에 대해 얼만큼인지 (비율)
   * */
  const pageLerp = useRef(state.top / size.height);

  useFrame(() => {
    const page = (pageLerp.current = THREE.MathUtils.lerp(
      pageLerp.current,
      state.top / size.height,
      0.15
    ));

    const y = page * viewport.height;

    const sticky = state.threshold * viewport.height;

    if (group.current) {
      group.current.position.lerp(
        vec.set(
          0,
          page < state.threshold ? y : sticky,
          page < state.threshold ? 0 : page * 1.25
        ),
        0.15
      );
    }
  });

  const handleReflow = useCallback(
    (w: number, h: number) => {
      onReflow((state.pages = h / viewport.height + 5.5));
    },
    [onReflow, viewport.height]
  );

  const scale = Math.min(1, viewport.width / 16);

  return (
    <>
      <group ref={group}>
        <Flex
          dir="column"
          position={[-viewport.width / 2, viewport.height / 2, 0]}
          size={[viewport.width, viewport.height, 0]}
          onReflow={handleReflow}
        >
          {state.content.map((props, index) => (
            <Page
              key={index}
              left={index === 2}
              textScaleFactor={scale}
              onReflow={(w, h) => {
                sizeRef.current[index] = h;
                //! threshold:: scroll event page
                state.threshold = Math.max(
                  4,
                  (4 / (15.8 * 3)) *
                    sizeRef.current.reduce((acc, e) => acc + e, 0)
                );
              }}
              {...props}
            />
          ))}

          <Box
            dir="row"
            width="100%"
            height="100%"
            align="center"
            justify="center"
          >
            <Box>
              <Text>{state.depthbox[0].text}</Text>
            </Box>
          </Box>

          <Box
            dir="row"
            width="100%"
            height="100%"
            align="center"
            justify="center"
          >
            <Box>
              <Layercard
                {...state.depthbox[0]}
                text={state.depthbox[1].text}
                boxWidth={bW}
                boxHeight={bH}
                map={texture}
                textScaleFactor={scale}
              />
              {/* <Geo /> */}
              <Text>11</Text>
            </Box>
          </Box>
        </Flex>
      </group>
    </>
  );
};

function App() {
  const scrollArea = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(0);

  const updateScrollTop = (scrollTop: number) => {
    state.top = scrollTop;
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    updateScrollTop(target.scrollTop);
  };

  useEffect(() => {
    if (scrollArea.current) {
      updateScrollTop(scrollArea.current.scrollTop);
    }
  }, []);

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0, 10], far: 1000 }}
        gl={{
          powerPreference: "high-performance",
          alpha: false,
          antialias: false,
          stencil: false,
          depth: false,
        }}
        onCreated={({ gl }) => gl.setClearColor("#f5f5f5")}
      >
        <pointLight position={[-10, -10, -10]} intensity={1} />
        <ambientLight intensity={0.4} />
        <spotLight
          castShadow
          angle={0.3}
          penumbra={1}
          position={[0, 10, 20]}
          intensity={5}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <Suspense fallback={null}>
          <Content onReflow={setPages} />
        </Suspense>
      </Canvas>
      <div
        className="scrollArea"
        ref={scrollArea}
        onScroll={onScroll}
        onPointerMove={(e) =>
          (state.mouse = [
            (e.clientX / window.innerWidth) * 2 - 1,
            (e.clientY / window.innerHeight) * 2 - 1,
          ])
        }
      >
        <div style={{ height: `${pages * 100}vh` }} />
      </div>
    </>
  );
}

export default App;
