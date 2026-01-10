# Design Guidelines: Premium Barber Shop Queue & Command System

## Design Approach
**Reference-Based**: Inspired by premium booking platforms (Calendly, Treatwell) merged with dark gaming interfaces. Layout follows dashboard patterns like Linear and Notion, elevated with luxurious glassmorphic aesthetic for high-end barbershop experience.

**Core Principles**:
- Dark elegance with emerald green (#10b981) as signature accent
- Sidebar navigation with main dashboard area
- Deep blacks (#0A0A0A) with subtle gradients for depth
- Tablet/desktop optimized for barber stations

---

## Typography

**Font Stack**:
- Primary: 'Inter' - clean, professional for UI elements
- Accent: 'Crimson Pro' or 'Playfair Display' - barbershop name, section headers

**Hierarchy**:
- Barbershop Name: 5xl, font-bold, emerald glow effect
- Dashboard Headers: 3xl, font-semibold
- Client Names: xl, font-medium
- Service Details: base, font-normal, text-gray-400
- Pricing/Time: lg, font-semibold, emerald accent
- Queue Numbers: 4xl, font-bold, emerald with glow

---

## Layout System

**Spacing Primitives**: Tailwind units of 4, 6, 8, 12
- Card padding: p-6 to p-8
- Section spacing: py-12
- Grid gaps: gap-6

**Grid Strategy**:
- Sidebar: Fixed 280px width, collapsible on mobile
- Main dashboard: 3-column grid (active queue, upcoming, completed)
- Client cards: Vertical layout with avatar top
- Service panels: 2-column on desktop, single on mobile

---

## Component Library

### Navigation Sidebar
- Glassmorphic panel (backdrop-blur-xl, bg-black/50, border-r border-white/5)
- Menu items: Glassmorphic containers with emerald left border on active
- Sections: Dashboard, Queue, Services, Barbers, Analytics, Settings
- Barbershop logo at top with subtle emerald underglow

### Header Bar
- Fixed top (h-20)
- Barbershop name/logo left with emerald accent line
- Real-time clock center
- Notification bell + barber profile right
- Glassmorphic background (backdrop-blur-lg, bg-black/40)

### Queue Dashboard Cards
**Active Service Card**:
- Large glassmorphic container (backdrop-blur-md, bg-white/5, border border-emerald-500/20)
- Client avatar with emerald ring (120px circular)
- Queue number (massive, emerald glow)
- Service type, estimated time, progress bar (emerald gradient)
- Action buttons: Complete Service, Add Time (emerald with glow)

**Upcoming Queue Card**:
- Compact glassmorphic cards (backdrop-blur-sm, bg-white/3)
- Client name, service icons, wait time
- Drag-to-reorder functionality indicated by subtle grip icon
- Emerald pulse animation on newest additions

**Barber Status Panel**:
- Horizontal glassmorphic cards showing all barbers
- Profile image with availability indicator (emerald = available, gray = busy)
- Current client name, service in progress
- Performance stats (services today, avg time)

### Service Command Panel
- Grid of service types (Haircut, Beard Trim, Hot Towel, etc.)
- Large touch-friendly buttons (min-h-32)
- Icon + service name + duration + price
- Glassmorphic with emerald border on selection
- Multi-select for service packages

### Client Check-In Modal
- Full-screen overlay (backdrop-blur-2xl, bg-black/70)
- Centered glassmorphic card (max-w-xl)
- Client search/create form
- Service selection grid
- Barber preference dropdown
- Confirm button (solid emerald with dark text, glow effect)

### Queue Management Drawer
- Right-side slide-out (400px width)
- Complete queue overview with timeline
- Estimated wait times with emerald progress indicators
- Quick actions: Call Next, Skip, Remove
- Empty state: Emerald outlined chair illustration

### Analytics Dashboard
- Stats cards: Today's revenue, services completed, avg wait time
- Glassmorphic containers with emerald accent headers
- Line charts with emerald gradient fills
- Bar graphs for barber performance comparison

### Service History Timeline
- Vertical timeline with emerald connector line
- Each entry: Client name, service, barber, timestamp
- Glassmorphic cards with subtle hover lift effect
- Filter by date range, barber, service type

---

## Visual Elements

### Glassmorphism Treatment
- Primary panels: backdrop-blur-xl, bg-black/40, border border-white/5
- Cards: backdrop-blur-md, bg-white/5, border border-white/8
- Inputs: backdrop-blur-lg, bg-white/3, emerald focus ring with glow

### Emerald Green Accents (#10b981)
- Active states, progress bars, CTAs, status indicators
- Button glow: box-shadow: 0 0 24px rgba(16, 185, 129, 0.4)
- Subtle pulse on active queue items
- Gradient overlays: from-emerald-500/20 to-transparent

### Backgrounds
- Base: #0A0A0A (true black)
- Panels: #121212 (charcoal)
- Subtle radial gradients: from-emerald-500/5 via-transparent to-transparent
- Dark wash overlay on all images: bg-black/50

---

## Images

**Hero Section** (Dashboard Top):
- Full-width banner (h-64) with barbershop interior image
- Dark gradient overlay (from-black/80 to-black/40)
- Barbershop name overlaid with emerald glow effect
- Blurred backdrop for "Open Queue" CTA button

**Barber Profiles** (8-12 professional headshots):
- Circular avatars (80px standard, 120px for active service)
- Dark vignette treatment, emerald border on active
- High-quality portraits with shallow depth of field

**Service Icons**:
- Use Heroicons or Font Awesome via CDN
- Emerald colored icons for active services

**Ambiance Images** (4-6 interior shots):
- Barbershop chairs, tools, grooming products
- Dark moody lighting, 16:9 ratio
- Used in empty states and background panels with heavy dark wash

**No large marketing hero** - this is a functional dashboard application.

---

## Key Differentiators
- Real-time queue updates with smooth emerald pulse animations
- Drag-and-drop queue reordering with glassmorphic drag handles
- Large, touch-optimized buttons for barber stations
- Emerald glow effects on all interactive states
- Professional dark aesthetic that conveys premium barbershop experience
- Dashboard shows all critical info at a glance: active clients, queue depth, barber availability, daily stats