import Cocoa

let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)

image.lockFocus()

let bounds = NSRect(origin: .zero, size: size)

// 1. App Icon Squircle Container (Standard macOS 824x824 centered inside 1024 with natural drop shadow)
let iconRect = NSRect(x: 100, y: 100, width: 824, height: 824)
let iconCorner: CGFloat = 185

// Drop Shadow behind squircle
let shadow = NSShadow()
shadow.shadowColor = NSColor(calibratedWhite: 0.0, alpha: 0.35)
shadow.shadowOffset = NSSize(width: 0, height: -24)
shadow.shadowBlurRadius = 36

NSGraphicsContext.current?.saveGraphicsState()
shadow.set()

let squirclePath = NSBezierPath(roundedRect: iconRect, xRadius: iconCorner, yRadius: iconCorner)
NSColor(calibratedRed: 0.08, green: 0.25, blue: 0.65, alpha: 1.0).setFill()
squirclePath.fill()
NSGraphicsContext.current?.restoreGraphicsState()

// 2. Base Gradient (Education Sapphire to Warm Marine Indigo)
NSGraphicsContext.current?.saveGraphicsState()
squirclePath.addClip()

let bgGradient = NSGradient(colors: [
    NSColor(calibratedRed: 0.14, green: 0.60, blue: 0.92, alpha: 1.0), // Sky Blue
    NSColor(calibratedRed: 0.25, green: 0.38, blue: 0.88, alpha: 1.0), // Royal Indigo
    NSColor(calibratedRed: 0.09, green: 0.20, blue: 0.56, alpha: 1.0)  // Deep Sapphire Navy
], atLocations: [0.0, 0.45, 1.0], colorSpace: .sRGB)!
bgGradient.draw(in: iconRect, angle: -50)

// Subtle Radial Warm Glow (Heart/Care warmth at bottom-left)
let warmGlowPath = NSBezierPath(ovalIn: NSRect(x: 60, y: 60, width: 500, height: 500))
let warmGlow = NSGradient(colors: [
    NSColor(calibratedRed: 0.16, green: 0.78, blue: 0.65, alpha: 0.45),
    NSColor(calibratedRed: 0.16, green: 0.78, blue: 0.65, alpha: 0.0)
])!
warmGlow.draw(in: warmGlowPath, relativeCenterPosition: NSPoint.zero)

// Subtle Inner Border Highlight (macOS bevel)
let innerBorder = NSBezierPath(roundedRect: iconRect.insetBy(dx: 4, dy: 4), xRadius: iconCorner - 4, yRadius: iconCorner - 4)
NSColor(calibratedWhite: 1.0, alpha: 0.22).setStroke()
innerBorder.lineWidth = 5
innerBorder.stroke()

NSGraphicsContext.current?.restoreGraphicsState()

// 3. Document / Counseling Record Card
let docWidth: CGFloat = 460
let docHeight: CGFloat = 560
let docX: CGFloat = (1024 - docWidth) / 2 - 20
let docY: CGFloat = (1024 - docHeight) / 2 - 10
let docRect = NSRect(x: docX, y: docY, width: docWidth, height: docHeight)

// Shadow for main document
let docShadow = NSShadow()
docShadow.shadowColor = NSColor(calibratedRed: 0.02, green: 0.08, blue: 0.25, alpha: 0.40)
docShadow.shadowOffset = NSSize(width: 0, height: -18)
docShadow.shadowBlurRadius = 28

NSGraphicsContext.current?.saveGraphicsState()
docShadow.set()

let docPath = NSBezierPath(roundedRect: docRect, xRadius: 36, yRadius: 36)
NSColor.white.setFill()
docPath.fill()
NSGraphicsContext.current?.restoreGraphicsState()

// Clip inside doc for subtle shading & top header
NSGraphicsContext.current?.saveGraphicsState()
docPath.addClip()

// Paper subtle gradient
let paperGrad = NSGradient(colors: [
    NSColor(calibratedWhite: 1.0, alpha: 1.0),
    NSColor(calibratedWhite: 0.96, alpha: 1.0)
])!
paperGrad.draw(in: docRect, angle: -90)

// Document Header Tag Bar (Mint / Emerald education badge)
let headerBarRect = NSRect(x: docX, y: docY + docHeight - 90, width: docWidth, height: 90)
let headerGrad = NSGradient(colors: [
    NSColor(calibratedRed: 0.08, green: 0.75, blue: 0.58, alpha: 1.0),
    NSColor(calibratedRed: 0.05, green: 0.65, blue: 0.50, alpha: 1.0)
])!
headerGrad.draw(in: headerBarRect, angle: 0)

// Header icon: A small white badge / checkmark on header
let badgeCircle = NSBezierPath(ovalIn: NSRect(x: docX + 36, y: docY + docHeight - 65, width: 40, height: 40))
NSColor(calibratedWhite: 1.0, alpha: 0.35).setFill()
badgeCircle.fill()

// Header line placeholder
let headerLine = NSBezierPath(roundedRect: NSRect(x: docX + 92, y: docY + docHeight - 52, width: 220, height: 16), xRadius: 8, yRadius: 8)
NSColor.white.setFill()
headerLine.fill()

// 4. Structured Form Rows on Document (Embossed pastel lines)
let lineConfigs: [(yOffset: CGFloat, width: CGFloat, color: NSColor)] = [
    (150, 360, NSColor(calibratedRed: 0.82, green: 0.86, blue: 0.94, alpha: 1.0)),
    (205, 300, NSColor(calibratedRed: 0.88, green: 0.91, blue: 0.96, alpha: 1.0)),
    (260, 360, NSColor(calibratedRed: 0.82, green: 0.86, blue: 0.94, alpha: 1.0)),
    (315, 260, NSColor(calibratedRed: 0.88, green: 0.91, blue: 0.96, alpha: 1.0)),
    (370, 340, NSColor(calibratedRed: 0.82, green: 0.86, blue: 0.94, alpha: 1.0)),
    (425, 200, NSColor(calibratedRed: 0.88, green: 0.91, blue: 0.96, alpha: 1.0))
]

for cfg in lineConfigs {
    let rowPath = NSBezierPath(roundedRect: NSRect(x: docX + 44, y: docY + docHeight - cfg.yOffset - 14, width: cfg.width, height: 14), xRadius: 7, yRadius: 7)
    cfg.color.setFill()
    rowPath.fill()
}

// Checkbox dots on the left of rows
for yOffset in [150, 260, 370] as [CGFloat] {
    let dot = NSBezierPath(ovalIn: NSRect(x: docX + 24, y: docY + docHeight - yOffset - 13, width: 12, height: 12))
    NSColor(calibratedRed: 0.25, green: 0.45, blue: 0.90, alpha: 0.8).setFill()
    dot.fill()
}

NSGraphicsContext.current?.restoreGraphicsState()

// 5. Parent-Teacher Counseling Heart & Chat Bubble (Bottom-Right Overlap)
let bubbleX: CGFloat = 530
let bubbleY: CGFloat = 200
let bubbleSize: CGFloat = 260

let bubbleShadow = NSShadow()
bubbleShadow.shadowColor = NSColor(calibratedRed: 0.85, green: 0.20, blue: 0.15, alpha: 0.35)
bubbleShadow.shadowOffset = NSSize(width: 0, height: -12)
bubbleShadow.shadowBlurRadius = 22

NSGraphicsContext.current?.saveGraphicsState()
bubbleShadow.set()

let bubblePath = NSBezierPath(roundedRect: NSRect(x: bubbleX, y: bubbleY, width: bubbleSize, height: bubbleSize), xRadius: 64, yRadius: 64)
let bubbleGrad = NSGradient(colors: [
    NSColor(calibratedRed: 1.00, green: 0.42, blue: 0.35, alpha: 1.0), // Coral Rose
    NSColor(calibratedRed: 0.96, green: 0.24, blue: 0.42, alpha: 1.0)  // Warm Berry Pink
])!
bubbleGrad.draw(in: bubblePath, angle: -45)

NSGraphicsContext.current?.restoreGraphicsState()

// Inner Glow on Bubble
NSGraphicsContext.current?.saveGraphicsState()
bubblePath.addClip()
let bubbleBorder = NSBezierPath(roundedRect: NSRect(x: bubbleX + 3, y: bubbleY + 3, width: bubbleSize - 6, height: bubbleSize - 6), xRadius: 61, yRadius: 61)
NSColor(calibratedWhite: 1.0, alpha: 0.30).setStroke()
bubbleBorder.lineWidth = 4
bubbleBorder.stroke()

// Draw Beautiful White Heart in Bubble
let heartPath = NSBezierPath()
let hx = bubbleX + bubbleSize / 2
let hy = bubbleY + bubbleSize / 2 - 8
let s: CGFloat = 1.05

heartPath.move(to: NSPoint(x: hx, y: hy - 40 * s))
heartPath.curve(to: NSPoint(x: hx - 65 * s, y: hy + 20 * s), controlPoint1: NSPoint(x: hx - 45 * s, y: hy - 18 * s), controlPoint2: NSPoint(x: hx - 65 * s, y: hy))
heartPath.curve(to: NSPoint(x: hx, y: hy + 55 * s), controlPoint1: NSPoint(x: hx - 65 * s, y: hy + 42 * s), controlPoint2: NSPoint(x: hx - 30 * s, y: hy + 60 * s))
heartPath.curve(to: NSPoint(x: hx + 65 * s, y: hy + 20 * s), controlPoint1: NSPoint(x: hx + 30 * s, y: hy + 60 * s), controlPoint2: NSPoint(x: hx + 65 * s, y: hy + 42 * s))
heartPath.curve(to: NSPoint(x: hx, y: hy - 40 * s), controlPoint1: NSPoint(x: hx + 65 * s, y: hy), controlPoint2: NSPoint(x: hx + 45 * s, y: hy - 18 * s))
heartPath.close()

NSColor.white.setFill()
heartPath.fill()

NSGraphicsContext.current?.restoreGraphicsState()

// 6. AI Golden Sparkles (Top-Right Floating Stars)
func drawSparkle(center: NSPoint, radius: CGFloat, color: NSColor) {
    let path = NSBezierPath()
    let innerR = radius * 0.26
    for i in 0..<8 {
        let angle = Double(i) * Double.pi / 4.0
        let r = (i % 2 == 0) ? radius : innerR
        let pt = NSPoint(x: center.x + CGFloat(cos(angle)) * r, y: center.y + CGFloat(sin(angle)) * r)
        if i == 0 { path.move(to: pt) } else { path.line(to: pt) }
    }
    path.close()
    
    let spShadow = NSShadow()
    spShadow.shadowColor = color.withAlphaComponent(0.6)
    spShadow.shadowBlurRadius = 14
    spShadow.shadowOffset = NSSize.zero
    
    NSGraphicsContext.current?.saveGraphicsState()
    spShadow.set()
    color.setFill()
    path.fill()
    NSGraphicsContext.current?.restoreGraphicsState()
}

// Major AI Star
drawSparkle(center: NSPoint(x: 740, y: 770), radius: 52, color: NSColor(calibratedRed: 1.0, green: 0.88, blue: 0.35, alpha: 1.0))
// Smaller Sister Sparkles
drawSparkle(center: NSPoint(x: 820, y: 690), radius: 28, color: NSColor(calibratedRed: 1.0, green: 0.95, blue: 0.60, alpha: 0.95))
drawSparkle(center: NSPoint(x: 670, y: 830), radius: 24, color: NSColor(calibratedRed: 1.0, green: 0.92, blue: 0.45, alpha: 0.9))

image.unlockFocus()

// Save to 1024x1024 PNG
let outPath = "/Users/chiahua/.gemini/antigravity/scratch/parent-teacher-summarizer/build/icon_1024.png"
let fileManager = FileManager.default
try? fileManager.createDirectory(atPath: "/Users/chiahua/.gemini/antigravity/scratch/parent-teacher-summarizer/build", withIntermediateDirectories: true)

if let tiff = image.tiffRepresentation,
   let bitmap = NSBitmapImageRep(data: tiff),
   let pngData = bitmap.representation(using: .png, properties: [:]) {
    try? pngData.write(to: URL(fileURLWithPath: outPath))
    print("ICON_SUCCESS: \(outPath)")
} else {
    print("ICON_FAILED")
}
