import { useEffect, useState } from "react";
import { 
  Shield, 
  Cpu, 
  Database, 
  Wifi, 
  Lock, 
  Code, 
  Terminal, 
  Cloud,
  Server,
  HardDrive,
  Binary,
  Fingerprint,
  Key,
  Globe,
  Zap,
  CircuitBoard,
  Layers,
  Network
} from "lucide-react";

const cyberIcons = [
  Shield, Cpu, Database, Wifi, Lock, Code, Terminal, Cloud,
  Server, HardDrive, Binary, Fingerprint, Key, Globe, Zap,
  CircuitBoard, Layers, Network
];

interface FloatingIcon {
  id: number;
  Icon: typeof Shield;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  rotateDirection: number;
}

function generateIcons(count: number): FloatingIcon[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    Icon: cyberIcons[Math.floor(Math.random() * cyberIcons.length)],
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 20 + Math.random() * 32,
    opacity: 0.06 + Math.random() * 0.1,
    duration: 12 + Math.random() * 20,
    delay: Math.random() * -15,
    rotateDirection: Math.random() > 0.5 ? 1 : -1,
  }));
}

interface CyberTextureOverlayProps {
  iconCount?: number;
  className?: string;
}

export function CyberTextureOverlay({ iconCount = 35, className = "" }: CyberTextureOverlayProps) {
  const [icons, setIcons] = useState<FloatingIcon[]>([]);

  useEffect(() => {
    setIcons(generateIcons(iconCount));
  }, [iconCount]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {icons.map((icon) => {
        const IconComponent = icon.Icon;
        return (
          <div
            key={icon.id}
            className="absolute text-primary"
            style={{
              left: `${icon.x}%`,
              top: `${icon.y}%`,
              opacity: icon.opacity,
              animation: `floatCyberOverlay ${icon.duration}s ease-in-out infinite`,
              animationDelay: `${icon.delay}s`,
            }}
          >
            <IconComponent 
              size={icon.size} 
              strokeWidth={1.2}
              style={{
                animation: `rotateCyberOverlay ${icon.duration * 1.5}s linear infinite`,
                animationDirection: icon.rotateDirection > 0 ? 'normal' : 'reverse',
                filter: 'drop-shadow(0 0 12px rgba(0, 229, 255, 0.5))',
              }}
            />
          </div>
        );
      })}
      
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]">
        <defs>
          <pattern id="cyber-circuit-overlay" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
            <path 
              d="M15 15 L15 40 L40 40 M40 15 L40 55 L70 55 M70 15 L70 30 L95 30 L95 55 M95 15 L95 15 M15 70 L50 70 L50 95 M70 70 L70 95 L95 95 M15 95 L15 105 M40 95 L40 105" 
              stroke="rgba(0, 229, 255, 1)" 
              strokeWidth="1.5" 
              fill="none"
            />
            <circle cx="15" cy="15" r="3" fill="rgba(0, 229, 255, 1)" />
            <circle cx="40" cy="40" r="3" fill="rgba(0, 229, 255, 1)" />
            <circle cx="70" cy="55" r="3" fill="rgba(0, 229, 255, 1)" />
            <circle cx="95" cy="30" r="3" fill="rgba(0, 229, 255, 1)" />
            <circle cx="50" cy="95" r="3" fill="rgba(0, 229, 255, 1)" />
            <circle cx="95" cy="95" r="3" fill="rgba(0, 229, 255, 1)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cyber-circuit-overlay)" />
      </svg>

      <div 
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(0, 229, 255, 0.6) 3px,
              rgba(0, 229, 255, 0.6) 5px
            )
          `,
          backgroundSize: '100% 5px',
          animation: 'scanlinesOverlay 6s linear infinite',
        }}
      />

      <style>{`
        @keyframes floatCyberOverlay {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-25px) translateX(15px);
          }
          50% {
            transform: translateY(-12px) translateX(-12px);
          }
          75% {
            transform: translateY(-35px) translateX(8px);
          }
        }
        
        @keyframes rotateCyberOverlay {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes scanlinesOverlay {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 100vh;
          }
        }
      `}</style>
    </div>
  );
}
