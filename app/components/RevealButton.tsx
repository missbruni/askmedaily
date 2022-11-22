import React from "react";

import { animated, useSpring } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

type RevealButtonProps = {
  label: string;
  image?: React.ReactNode;
  children: React.ReactNode;
};

const RevealButton: React.FC<RevealButtonProps> = ({
  children,
  label,
  image,
}) => {
  const [show, setShow] = React.useState(false);
  const { transform, opacity } = useSpring({
    opacity: show ? 1 : 0,
    transform: `perspective(600px) rotateX(${show ? 180 : 0}deg)`,
    config: { mass: 5, tension: 500, friction: 80 },
  });

  const bind = useDrag(({ event }) => {
    event.stopPropagation();
  });

  return (
    <div
      className="flex h-full items-center justify-center"
      onClick={() => setShow(() => true)}
      {...bind()}
    >
      <animated.button
        className="absolute flex cursor-pointer items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-base font-medium text-[#1dbab4] shadow-sm hover:bg-[#e4f9f8]"
        style={{
          opacity: opacity.to((o) => 1 - o),
          transform,
          willChange: "transform, opacity",
        }}
      >
        {label}
      </animated.button>
      <animated.div
        className="font-large absolute flex items-center justify-center px-4 py-2 text-base text-white shadow-sm"
        style={{
          opacity,
          transform,
          rotateX: "180deg",
          willChange: "transform, opacity",
        }}
      >
        {children}
      </animated.div>
      {!!image && (
        <animated.div
          className="absolute bottom-0 left-2 px-4 py-2"
          style={{
            opacity,
            willChange: "opacity",
          }}
        >
          {image}
        </animated.div>
      )}
    </div>
  );
};
export default RevealButton;
