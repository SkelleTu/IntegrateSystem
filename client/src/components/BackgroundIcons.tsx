export function BackgroundIcons() {
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] bg-[#05070a] w-full h-full"
      style={{
        backgroundImage: `
          linear-gradient(rgba(0, 229, 255, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 229, 255, 0.08) 1px, transparent 1px),
          radial-gradient(at 0% 0%, rgba(0, 229, 255, 0.15) 0, transparent 80%),
          radial-gradient(at 100% 100%, rgba(147, 51, 234, 0.15) 0, transparent 80%)
        `,
        backgroundSize: '40px 40px, 40px 40px, 100% 100%, 100% 100%',
        backgroundAttachment: 'fixed'
      }}
    />
  );
}
