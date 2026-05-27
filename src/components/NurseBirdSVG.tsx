import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

interface Props {
  width?: number;
  height?: number;
}

export default function NurseBirdSVG({ width = 140, height = 180 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 140 180">
      {/* Body */}
      <Ellipse cx={70} cy={120} rx={38} ry={45} fill="#B8E6D0" />
      <Ellipse cx={70} cy={120} rx={32} ry={38} fill="#D4F2E7" />

      {/* Belly */}
      <Ellipse cx={70} cy={132} rx={22} ry={24} fill="#FFF5E6" />

      {/* Head */}
      <Circle cx={70} cy={62} r={30} fill="#B8E6D0" />
      <Circle cx={70} cy={62} r={26} fill="#D4F2E7" />

      {/* Nurse cap */}
      <Rect x={50} y={32} width={40} height={16} rx={3} fill="#FFF" />
      <Rect x={66} y={28} width={8} height={20} rx={2} fill="#FF6B6B" />
      <Rect x={62} y={36} width={16} height={6} rx={2} fill="#FF6B6B" />

      {/* Eyes */}
      <G>
        <Ellipse cx={58} cy={60} rx={6} ry={7} fill="#FFF" />
        <Circle cx={59} cy={60} r={3.5} fill="#3D2C1E" />
        <Circle cx={60} cy={59} r={1.2} fill="#FFF" />
      </G>
      <G>
        <Ellipse cx={82} cy={60} rx={6} ry={7} fill="#FFF" />
        <Circle cx={81} cy={60} r={3.5} fill="#3D2C1E" />
        <Circle cx={82} cy={59} r={1.2} fill="#FFF" />
      </G>

      {/* Blush */}
      <Ellipse cx={50} cy={68} rx={5} ry={3} fill="#FFB3B3" opacity={0.5} />
      <Ellipse cx={90} cy={68} rx={5} ry={3} fill="#FFB3B3" opacity={0.5} />

      {/* Beak */}
      <Path d="M 66 70 L 70 78 L 74 70 Z" fill="#FFB347" />
      <Path d="M 66 70 L 70 74 L 74 70 Z" fill="#FFCC80" />

      {/* Wings */}
      <Path
        d="M 32 110 Q 20 100, 18 115 Q 16 130, 35 128 Q 38 120, 32 110 Z"
        fill="#9AD4BE"
      />
      <Path
        d="M 108 110 Q 120 100, 122 115 Q 124 130, 105 128 Q 102 120, 108 110 Z"
        fill="#9AD4BE"
      />

      {/* Stethoscope */}
      <Path
        d="M 58 85 Q 55 95, 60 105 Q 65 115, 70 112"
        fill="none"
        stroke="#5B9BD5"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Circle cx={70} cy={112} r={4} fill="#5B9BD5" />
      <Circle cx={70} cy={112} r={2} fill="#FFF" />

      {/* Feet */}
      <Path d="M 52 162 L 48 175 L 56 170 L 60 175 L 58 162 Z" fill="#FFB347" />
      <Path d="M 80 162 L 78 175 L 84 170 L 88 175 L 86 162 Z" fill="#FFB347" />

      {/* Tail feathers */}
      <Path
        d="M 70 160 Q 60 168, 55 172 Q 65 168, 70 165 Q 75 168, 85 172 Q 80 168, 70 160 Z"
        fill="#9AD4BE"
      />
    </Svg>
  );
}
