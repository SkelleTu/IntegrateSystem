import { Scissors, Sparkles, Star, Zap, Crown, User, Coffee, Cookie, Utensils, Croissant } from "lucide-react";

const icons = [
  { Icon: Scissors, size: 32 },
  { Icon: Sparkles, size: 24 },
  { Icon: Coffee, size: 30 },
  { Icon: Cookie, size: 28 },
  { Icon: Utensils, size: 26 },
  { Icon: Croissant, size: 28 },
  { Icon: Star, size: 22 },
  { Icon: Zap, size: 26 },
  { Icon: Crown, size: 34 },
  { Icon: User, size: 24 },
];

export function BackgroundIcons() {
  const floatingElements = Array.from({ length: 50 }).map((_, i) => {
    const iconData = icons[i % icons.length];
    return {
      id: i,
      ...iconData,
      x: Math.random() * 100,
      y: Math.random() * 100,
      opacity: 0.15,
      scale: 0.8 + Math.random() * 0.5,
      rotation: Math.random() * 360,
    };
  });

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[10] bg-transparent w-full h-full min-h-screen">
      {floatingElements.map((el) => (
        <div
          key={el.id}
          className="absolute"
          style={{ 
            left: `${el.x}%`, 
            top: `${el.y}%`, 
            opacity: el.opacity * 2, 
            transform: `translate3d(0,0,0) scale(${el.scale * 1.5}) rotate(${el.rotation}deg)`,
            color: "#10b981",
            contain: 'layout paint'
          }}
        >
          <el.Icon size={el.size} strokeWidth={2} />
        </div>
      ))}
    </div>
  );
}
