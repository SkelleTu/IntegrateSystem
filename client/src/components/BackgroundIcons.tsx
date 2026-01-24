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
    size: 16 + Math.random() * 24,
    opacity: 0.03 + Math.random() * 0.06,
    duration: 15 + Math.random() * 25,
    delay: Math.random() * -20,
    rotateDirection: Math.random() > 0.5 ? 1 : -1,
  }));
}

export function BackgroundIcons() {
  const [icons, setIcons] = useState<FloatingIcon[]>([]);

  useEffect(() => {
    setIcons(generateIcons(40));
  }, []);

  return (
    <>
      <div 
        className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] bg-[#05070a] w-full h-full"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 229, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 229, 255, 0.06) 1px, transparent 1px),
            radial-gradient(at 0% 0%, rgba(0, 229, 255, 0.12) 0, transparent 80%),
            radial-gradient(at 100% 100%, rgba(147, 51, 234, 0.12) 0, transparent 80%)
          `,
          backgroundSize: '40px 40px, 40px 40px, 100% 100%, 100% 100%',
          backgroundAttachment: 'fixed'
        }}
      />
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
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
                animation: `floatCyber ${icon.duration}s ease-in-out infinite`,
                animationDelay: `${icon.delay}s`,
              }}
            >
              <IconComponent 
                size={icon.size} 
                strokeWidth={1}
                style={{
                  animation: `rotateCyber ${icon.duration * 2}s linear infinite`,
                  animationDirection: icon.rotateDirection > 0 ? 'normal' : 'reverse',
                  filter: 'drop-shadow(0 0 8px rgba(0, 229, 255, 0.4))',
                }}
              />
            </div>
          );
        })}
        
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0, 229, 255, 0.05) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 100% 50%, rgba(147, 51, 234, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 0% 100%, rgba(0, 229, 255, 0.04) 0%, transparent 50%)
            `,
          }}
        />
        
        <svg className="absolute inset-0 w-full h-full opacity-[0.02]">
          <defs>
            <pattern id="circuit-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path 
                d="M10 10 L10 30 L30 30 M30 10 L30 40 L50 40 M50 10 L50 20 L70 20 L70 40 M70 10 L70 10 M90 10 L90 50 M10 50 L40 50 L40 70 M50 50 L50 70 L70 70 M70 50 L90 50 M10 70 L10 90 M30 70 L30 90 M50 90 L70 90 L70 70 M90 70 L90 90" 
                stroke="rgba(0, 229, 255, 1)" 
                strokeWidth="1" 
                fill="none"
              />
              <circle cx="10" cy="10" r="2" fill="rgba(0, 229, 255, 1)" />
              <circle cx="30" cy="30" r="2" fill="rgba(0, 229, 255, 1)" />
              <circle cx="50" cy="40" r="2" fill="rgba(0, 229, 255, 1)" />
              <circle cx="70" cy="20" r="2" fill="rgba(0, 229, 255, 1)" />
              <circle cx="90" cy="50" r="2" fill="rgba(0, 229, 255, 1)" />
              <circle cx="40" cy="70" r="2" fill="rgba(0, 229, 255, 1)" />
              <circle cx="70" cy="90" r="2" fill="rgba(0, 229, 255, 1)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit-pattern)" />
        </svg>

        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0, 229, 255, 0.5) 2px,
                rgba(0, 229, 255, 0.5) 4px
              )
            `,
            backgroundSize: '100% 4px',
            animation: 'scanlines 8s linear infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes floatCyber {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-30px) translateX(5px);
          }
        }
        
        @keyframes rotateCyber {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes scanlines {
          0% {
            backgroundPosition: 0 0;
          }
          100% {
            backgroundPosition: 0 100vh;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.03;
          }
          50% {
            opacity: 0.08;
          }
        }
      `}</style>
    </>
  );
}
