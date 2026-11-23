import math
import os
import struct
import sys
import zlib

W = 1024
H = 1024

PAPER = (243, 236, 222)
PAPER_LIGHT = (247, 241, 230)
PAPER_DARK = (238, 230, 213)
SCENE_BG = (234, 225, 207)
SHADE = (214, 203, 179)
INK = (27, 24, 20)
MUTED = (94, 86, 73)
FAINT = (166, 155, 133)
RED = (169, 39, 32)
RED_DARK = (116, 25, 21)
TEAL = (30, 91, 106)
BLUE = (40, 78, 116)
GOLD = (198, 158, 36)
CREAM = (250, 246, 236)
SMOKE = (178, 168, 149)
SMOKE_DARK = (132, 122, 105)
SEA = (216, 225, 220)

FONT = {
    "A": (".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"),
    "B": ("####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."),
    "C": (".####", "#....", "#....", "#....", "#....", "#....", ".####"),
    "D": ("####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."),
    "E": ("#####", "#....", "#....", "####.", "#....", "#....", "#####"),
    "F": ("#####", "#....", "#....", "####.", "#....", "#....", "#...."),
    "G": (".####", "#....", "#....", "#.###", "#...#", "#...#", ".####"),
    "H": ("#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"),
    "I": ("#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"),
    "J": ("..###", "...#.", "...#.", "...#.", "#..#.", "#..#.", ".##.."),
    "K": ("#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"),
    "L": ("#....", "#....", "#....", "#....", "#....", "#....", "#####"),
    "M": ("#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"),
    "N": ("#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"),
    "O": (".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."),
    "P": ("####.", "#...#", "#...#", "####.", "#....", "#....", "#...."),
    "Q": (".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"),
    "R": ("####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"),
    "S": (".####", "#....", "#....", ".###.", "....#", "....#", "####."),
    "T": ("#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."),
    "U": ("#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."),
    "V": ("#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."),
    "W": ("#...#", "#...#", "#...#", "#...#", "#.#.#", "##.##", "#...#"),
    "X": ("#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"),
    "Y": ("#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."),
    "Z": ("#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"),
    "0": (".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."),
    "1": ("..#..", ".##..", "..#..", "..#..", "..#..", "..#..", "#####"),
    "2": (".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"),
    "3": ("####.", "....#", "....#", ".###.", "....#", "....#", "####."),
    "4": ("...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."),
    "5": ("#####", "#....", "####.", "....#", "....#", "#...#", ".###."),
    "6": (".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."),
    "7": ("#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."),
    "8": (".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."),
    "9": (".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."),
    " ": (".....", ".....", ".....", ".....", ".....", ".....", "....."),
    ".": (".....", ".....", ".....", ".....", ".....", ".##..", ".##.."),
    ",": (".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."),
    ":": (".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."),
    ";": (".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."),
    "-": (".....", ".....", ".....", "#####", ".....", ".....", "....."),
    "'": ("..#..", "..#..", ".....", ".....", ".....", ".....", "....."),
    '"': (".#.#.", ".#.#.", ".....", ".....", ".....", ".....", "....."),
    "!": ("..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."),
    "?": (".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."),
    "/": ("....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#...."),
    "(": ("...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."),
    ")": (".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."),
    "+": (".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."),
    "=": (".....", ".....", "#####", ".....", "#####", ".....", "....."),
    "$": ("..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."),
    "%": ("##..#", "##.#.", "...#.", "..#..", ".#...", ".#.##", "#..##"),
    "&": (".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"),
    "*": (".....", "#.#.#", ".###.", "#####", ".###.", "#.#.#", "....."),
    "·": (".....", ".....", ".....", "..#..", ".....", ".....", "....."),
}

GLYPH_H = 7


def text_width(s, scale=1, tracking=0):
    if not s:
        return 0
    return len(s) * (6 * scale + tracking) - tracking


class Canvas:
    def __init__(self, w, h, bg):
        self.w = w
        self.h = h
        self.data = bytearray(bytes(bg) * (w * h))

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            o = (y * self.w + x) * 3
            self.data[o] = c[0]
            self.data[o + 1] = c[1]
            self.data[o + 2] = c[2]

    def fill_rect(self, x, y, w, h, c):
        x0 = max(0, x)
        y0 = max(0, y)
        x1 = min(self.w, x + w)
        y1 = min(self.h, y + h)
        if x0 >= x1 or y0 >= y1:
            return
        row = bytes(c) * (x1 - x0)
        for yy in range(y0, y1):
            o = (yy * self.w + x0) * 3
            self.data[o:o + len(row)] = row

    def hline(self, x0, x1, y, c, t=1):
        if x0 > x1:
            x0, x1 = x1, x0
        self.fill_rect(x0, y, x1 - x0 + 1, t, c)

    def vline(self, x, y0, y1, c, t=1):
        if y0 > y1:
            y0, y1 = y1, y0
        self.fill_rect(x, y0, t, y1 - y0 + 1, c)

    def rect_outline(self, x, y, w, h, c, t=1):
        self.hline(x, x + w - 1, y, c, t)
        self.hline(x, x + w - 1, y + h - t, c, t)
        self.vline(x, y, y + h - 1, c, t)
        self.vline(x + w - t, y, y + h - 1, c, t)

    def line(self, x0, y0, x1, y1, c, t=1):
        x0, y0, x1, y1 = int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))
        dx = abs(x1 - x0)
        dy = -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        off = 0 if t == 1 else -(t // 2)
        while True:
            if t == 1:
                self.set(x0, y0, c)
            else:
                self.fill_rect(x0 + off, y0 + off, t, t, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def poly(self, pts, c):
        n = len(pts)
        if n < 3:
            return
        ys = [p[1] for p in pts]
        y0 = max(0, int(math.floor(min(ys))))
        y1 = min(self.h - 1, int(math.ceil(max(ys))))
        for y in range(y0, y1 + 1):
            yc = y + 0.5
            xs = []
            for i in range(n):
                xa, ya = pts[i]
                xb, yb = pts[(i + 1) % n]
                if (ya <= yc < yb) or (yb <= yc < ya):
                    xs.append(xa + (yc - ya) * (xb - xa) / (yb - ya))
            xs.sort()
            for i in range(0, len(xs) - 1, 2):
                xl = int(math.ceil(xs[i] - 0.5))
                xr = int(math.ceil(xs[i + 1] - 0.5)) - 1
                if xr >= xl:
                    self.hline(xl, xr, y, c)

    def poly_outline(self, pts, c, t=1):
        for i in range(len(pts)):
            a = pts[i]
            b = pts[(i + 1) % len(pts)]
            self.line(a[0], a[1], b[0], b[1], c, t)

    def circle_fill(self, cx, cy, r, c):
        r2 = r * r
        for y in range(int(cy - r), int(cy + r) + 1):
            dy = y - cy
            span = r2 - dy * dy
            if span < 0:
                continue
            d = int(math.sqrt(span))
            self.hline(int(cx - d), int(cx + d), y, c)

    def circle_outline(self, cx, cy, r, c, t=1):
        steps = max(48, int(r * 6))
        px = cx + r
        py = cy
        for i in range(1, steps + 1):
            a = 2 * math.pi * i / steps
            nx = cx + r * math.cos(a)
            ny = cy + r * math.sin(a)
            self.line(round(px), round(py), round(nx), round(ny), c, t)
            px, py = nx, ny

    def ellipse_fill(self, cx, cy, rx, ry, c):
        for y in range(int(cy - ry), int(cy + ry) + 1):
            dy = (y - cy) / ry
            span = 1 - dy * dy
            if span < 0:
                continue
            d = rx * math.sqrt(span)
            self.hline(int(cx - d), int(cx + d), y, c)

    def ellipse_outline(self, cx, cy, rx, ry, c, t=1):
        steps = max(64, int((rx + ry) * 3))
        px = cx + rx
        py = cy
        for i in range(1, steps + 1):
            a = 2 * math.pi * i / steps
            nx = cx + rx * math.cos(a)
            ny = cy + ry * math.sin(a)
            self.line(round(px), round(py), round(nx), round(ny), c, t)
            px, py = nx, ny

    def hatch_rect(self, x, y, w, h, c, step=4, direction=1):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if (xx + yy * direction) % step == 0:
                    self.set(xx, yy, c)

    def text(self, x, y, s, scale=1, c=INK, tracking=0, align="left"):
        s = s.upper()
        width = text_width(s, scale, tracking)
        if align == "center":
            x -= width // 2
        elif align == "right":
            x -= width
        adv = 6 * scale + tracking
        for ch in s:
            glyph = FONT.get(ch, FONT[" "])
            for ry, row in enumerate(glyph):
                for rx, bit in enumerate(row):
                    if bit == "#":
                        self.fill_rect(x + rx * scale, y + ry * scale, scale, scale, c)
            x += adv
        return width

    def wrap(self, s, maxw, scale=1, tracking=0):
        words = s.upper().split()
        lines = []
        cur = ""
        for word in words:
            trial = (cur + " " + word).strip()
            if not cur or text_width(trial, scale, tracking) <= maxw:
                cur = trial
            else:
                lines.append(cur)
                cur = word
        if cur:
            lines.append(cur)
        return lines


def normalize(s):
    return (s.replace("\u2019", "'").replace("\u2018", "'")
             .replace("\u201c", '"').replace("\u201d", '"')
             .replace("\u2013", "-").replace("\u2014", "-"))


def paper_texture(cv):
    seed = 20261123
    for _ in range(4200):
        seed = (1103515245 * seed + 12345) & 0x7FFFFFFF
        x = seed % W
        seed = (1103515245 * seed + 12345) & 0x7FFFFFFF
        y = seed % H
        seed = (1103515245 * seed + 12345) & 0x7FFFFFFF
        cv.set(x, y, PAPER_DARK if seed & 1 else PAPER_LIGHT)


def box_of(x, y, w, h):
    def X(f):
        return int(round(x + f * w))
    def Y(f):
        return int(round(y + f * h))
    return X, Y


def star_pts(cx, cy, ro, ri, points=5, rot=-90.0):
    pts = []
    for i in range(points * 2):
        a = math.radians(rot + 180.0 * i / points)
        r = ro if i % 2 == 0 else ri
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def wavy(cv, x0, x1, y, c, amp=2, period=9, phase=0, t=1):
    prev = None
    for x in range(int(x0), int(x1) + 1):
        yy = y + int(round(amp * math.sin((x + phase) / period)))
        if prev is not None:
            cv.line(prev[0], prev[1], x, yy, c, t)
        prev = (x, yy)


def puff(cv, x, y, r, fill=SMOKE, edge=SMOKE_DARK):
    cv.circle_fill(x, y, r, fill)
    cv.circle_outline(x, y, r, edge, 1)


def flame(cv, x, y, hgt, wid, c1=RED, c2=GOLD):
    cv.poly([(x - wid, y), (x - wid // 2, y - hgt // 2), (x - 2, y - hgt // 3),
             (x + 1, y - hgt), (x + 4, y - hgt // 2), (x + wid, y)], c1)
    cv.poly([(x - wid // 2, y), (x - 1, y - hgt // 2), (x + 2, y - hgt // 2),
             (x + wid // 2, y)], c2)


def arc(cv, cx, cy, r, a0, a1, c, t=1):
    steps = max(6, int(abs(a1 - a0) * r / 3))
    px = cx + r * math.cos(math.radians(a0))
    py = cy + r * math.sin(math.radians(a0))
    for i in range(1, steps + 1):
        a = math.radians(a0 + (a1 - a0) * i / steps)
        nx = cx + r * math.cos(a)
        ny = cy + r * math.sin(a)
        cv.line(round(px), round(py), round(nx), round(ny), c, t)
        px, py = nx, ny


def scene_kyiv(cv, x, y, w, h):
    X, Y = box_of(x, y, w, h)
    bx, by = X(0.02), Y(0.12)
    bw, bh = X(0.44) - bx, Y(0.90) - by
    cv.fill_rect(bx, by, bw, bh, SHADE)
    for fy in (0.30, 0.50, 0.70):
        cv.hline(bx, bx + bw - 1, Y(fy), MUTED)
    for row in range(3):
        for col in range(4):
            wx = bx + 5 + col * (bw - 10) // 4
            wy = by + 5 + row * (bh - 10) // 3
            ww = max(5, (bw - 14) // 5)
            wh = max(5, (bh - 12) // 5)
            if (row * 4 + col) % 5 == 0:
                cv.fill_rect(wx, wy, ww, wh, INK)
            else:
                cv.fill_rect(wx, wy, ww, wh, CREAM)
                cv.rect_outline(wx, wy, ww, wh, MUTED)
    cv.poly([(X(0.27), by), (X(0.44), by), (X(0.44), Y(0.40)),
             (X(0.39), Y(0.30)), (X(0.35), Y(0.42)),
             (X(0.31), Y(0.32)), (X(0.27), Y(0.38))], SCENE_BG)
    cv.poly_outline([(X(0.27), by), (X(0.27), Y(0.38)), (X(0.31), Y(0.32)),
                     (X(0.35), Y(0.42)), (X(0.39), Y(0.30)),
                     (X(0.44), Y(0.40)), (X(0.44), by)], INK, 2)
    for i in range(3):
        puff(cv, X(0.36 + i * 0.035), Y(0.16 - i * 0.06), 5 + i * 2)
    cv.rect_outline(bx, by, bw, bh, INK, 2)
    cv.hline(X(0.02), X(0.46), Y(0.90), INK, 2)
    for i in range(5):
        rx = X(0.04 + i * 0.085)
        cv.fill_rect(rx, Y(0.84 - (i % 2) * 0.02), max(4, w // 55), max(3, h // 45), MUTED)
        cv.rect_outline(rx, Y(0.84 - (i % 2) * 0.02), max(4, w // 55), max(3, h // 45), INK)
    cx = X(0.73)
    cw = max(8, w // 30)
    cv.fill_rect(cx - cw // 2, Y(0.55), cw, Y(0.90) - Y(0.55), CREAM)
    cv.rect_outline(cx - cw // 2, Y(0.55), cw, Y(0.90) - Y(0.55), INK, 2)
    cv.hline(cx - cw // 2, cx + cw // 2 - 1, Y(0.76), INK, 3)
    flame(cv, cx, Y(0.55), max(9, h // 6), max(4, w // 42))
    cv.circle_outline(cx, Y(0.46), max(5, w // 32), RED, 1)
    cv.line(cx, Y(0.38), cx, Y(0.32), RED, 1)
    cv.line(cx, Y(0.36), cx - max(3, w // 55), Y(0.32), RED, 1)
    cv.line(cx, Y(0.36), cx + max(3, w // 55), Y(0.32), RED, 1)
    cv.text(X(0.82), Y(0.80), "DAY OF", 1, RED_DARK)
    cv.text(X(0.82), Y(0.90), "MOURNING", 1, RED_DARK)


def scene_nato(cv, x, y, w, h):
    X, Y = box_of(x, y, w, h)
    cx, cy = X(0.16), Y(0.48)
    r = max(14, min(X(0.16) - x, h // 2 - 4))
    cv.circle_fill(cx, cy, r, TEAL)
    cv.circle_outline(cx, cy, r, INK, 2)
    cv.poly(star_pts(cx, cy, r - 3, (r - 3) // 4), CREAM)
    cv.poly_outline(star_pts(cx, cy, r - 3, (r - 3) // 4), INK, 1)
    cv.circle_fill(cx, cy, max(2, r // 7), TEAL)
    mp = [(X(0.36), Y(0.40)), (X(0.44), Y(0.18)), (X(0.54), Y(0.26)),
          (X(0.64), Y(0.14)), (X(0.78), Y(0.22)), (X(0.90), Y(0.16)),
          (X(0.98), Y(0.34)), (X(0.94), Y(0.62)), (X(0.84), Y(0.84)),
          (X(0.70), Y(0.90)), (X(0.58), Y(0.80)), (X(0.46), Y(0.86)),
          (X(0.40), Y(0.66))]
    cv.poly(mp, SHADE)
    cv.poly_outline(mp, INK, 2)
    cv.line(X(0.54), Y(0.26), X(0.58), Y(0.56), FAINT, 1)
    cv.line(X(0.58), Y(0.56), X(0.48), Y(0.80), FAINT, 1)
    cv.line(X(0.58), Y(0.56), X(0.82), Y(0.56), FAINT, 1)
    for tx, ty in ((X(0.58), Y(0.56)), (X(0.70), Y(0.34)), (X(0.76), Y(0.70))):
        cv.circle_fill(tx, ty, max(3, w // 70), RED)
        cv.circle_outline(tx, ty, max(6, w // 40), RED, 1)
        cv.line(tx - max(5, w // 35), ty, tx + max(5, w // 35), ty, RED, 1)
        cv.line(tx, ty - max(5, w // 35), tx, ty + max(5, w // 35), RED, 1)
    for i in range(3):
        ty = Y(0.20 + i * 0.26)
        tgt = (X(0.76), Y(0.56 + (i - 1) * 0.14))
        cv.line(X(0.99), ty, tgt[0], tgt[1], RED, 1)
    cv.text(X(0.38), Y(0.94), "POLAND", 1, INK)


def scene_naval(cv, x, y, w, h):
    X, Y = box_of(x, y, w, h)
    cv.fill_rect(x, Y(0.54), w, Y(0.96) - Y(0.54), SEA)
    for i, fy in enumerate((0.60, 0.69, 0.78, 0.87, 0.95)):
        wavy(cv, x + 2, x + w - 3, Y(fy), TEAL if i % 2 else MUTED, 2, 8, i * 9)
    cv.poly([(X(0.03), Y(0.62)), (X(0.28), Y(0.62)), (X(0.25), Y(0.73)),
             (X(0.06), Y(0.73))], INK)
    cv.fill_rect(X(0.10), Y(0.55), X(0.17) - X(0.10), Y(0.62) - Y(0.55), INK)
    cv.line(X(0.135), Y(0.55), X(0.135), Y(0.44), INK, 2)
    cv.line(X(0.135), Y(0.44), X(0.175), Y(0.50), INK, 1)
    cv.circle_fill(X(0.05), Y(0.63), max(2, w // 80), RED)
    for i in range(3):
        cv.line(X(0.03), Y(0.66 + i * 0.02), X(0.0) + i * 2, Y(0.64 + i * 0.02), CREAM, 1)
    cv.poly([(X(0.56), Y(0.58)), (X(0.93), Y(0.58)), (X(0.98), Y(0.66)),
             (X(0.92), Y(0.78)), (X(0.62), Y(0.78)), (X(0.54), Y(0.68))], INK)
    cv.poly([(X(0.66), Y(0.42)), (X(0.78), Y(0.42)), (X(0.80), Y(0.58)),
             (X(0.64), Y(0.58))], INK)
    cv.fill_rect(X(0.60), Y(0.49), X(0.64) - X(0.60), Y(0.58) - Y(0.49), INK)
    cv.fill_rect(X(0.83), Y(0.48), X(0.90) - X(0.83), Y(0.58) - Y(0.48), INK)
    cv.line(X(0.765), Y(0.42), X(0.765), Y(0.28), INK, 2)
    cv.line(X(0.765), Y(0.30), X(0.84), Y(0.38), INK, 1)
    for i in range(3):
        puff(cv, X(0.82 + i * 0.03), Y(0.24 - i * 0.06), 4 + i * 2)
    for fx in (0.70, 0.76, 0.86, 0.91):
        flame(cv, X(fx), Y(0.56), max(7, h // 7), max(3, w // 48))
    cv.text(X(0.02), Y(0.06), "BENGHAZI", 1, INK)


def scene_cop(cv, x, y, w, h):
    X, Y = box_of(x, y, w, h)
    cx, cy = X(0.25), Y(0.48)
    r = max(14, min(X(0.25) - x, h // 2 - 3))
    cv.circle_fill(cx, cy, r, TEAL)
    cv.circle_outline(cx, cy, r, INK, 2)
    cv.ellipse_outline(cx, cy, r, max(3, r // 3), INK, 1)
    cv.ellipse_outline(cx, cy, max(3, r // 3), r, INK, 1)
    cv.line(cx, cy - r, cx, cy + r, INK, 1)
    cv.line(cx, cy - r, cx - r // 3, cy - r // 2, PAPER, 2)
    cv.line(cx - r // 3, cy - r // 2, cx + r // 3, cy, PAPER, 2)
    cv.line(cx + r // 3, cy, cx - r // 4, cy + r // 2, PAPER, 2)
    cv.line(cx - r // 4, cy + r // 2, cx + r // 6, cy + r, PAPER, 2)
    for fx, fh in ((0.60, 0.34), (0.72, 0.48), (0.84, 0.26)):
        bx = X(fx)
        bw = max(9, w // 15)
        cv.fill_rect(bx, Y(0.86 - fh), bw, int(fh * (Y(0.86) - Y(0.10))), MUTED)
        cv.rect_outline(bx, Y(0.86 - fh), bw, int(fh * (Y(0.86) - Y(0.10))), INK, 1)
        cv.fill_rect(bx - 2, Y(0.86 - fh) - 3, bw + 4, 4, INK)
        for i in range(2):
            puff(cv, bx + bw // 2 + i * 3, Y(0.86 - fh) - 8 - i * 5, 4 + i * 2)
    cv.hline(X(0.02), X(0.98), Y(0.88), INK, 2)
    cv.text(X(0.56), Y(0.94), "NO DEAL", 1, RED)


def scene_iran(cv, x, y, w, h):
    X, Y = box_of(x, y, w, h)
    cv.fill_rect(x, Y(0.50), w, Y(0.97) - Y(0.50), SEA)
    for i, fy in enumerate((0.56, 0.65, 0.74, 0.83, 0.92)):
        wavy(cv, x + 2, x + w - 3, Y(fy), TEAL if i % 2 else MUTED, 2, 8, i * 7)
    cv.poly([(X(0.02), Y(0.50)), (X(0.34), Y(0.50)), (X(0.38), Y(0.58)),
             (X(0.33), Y(0.68)), (X(0.05), Y(0.68)), (X(0.01), Y(0.59))], INK)
    cv.poly([(X(0.13), Y(0.30)), (X(0.21), Y(0.30)), (X(0.23), Y(0.50)),
             (X(0.11), Y(0.50))], INK)
    cv.line(X(0.20), Y(0.30), X(0.20), Y(0.12), INK, 2)
    cv.line(X(0.20), Y(0.14), X(0.30), Y(0.22), INK, 2)
    cv.fill_rect(X(0.03), Y(0.44), X(0.08) - X(0.03), Y(0.50) - Y(0.44), INK)
    cv.fill_rect(X(0.26), Y(0.42), X(0.32) - X(0.26), Y(0.50) - Y(0.42), INK)
    for i in range(3):
        cv.circle_fill(X(0.16 + i * 0.02), Y(0.56), 2, RED)
    cv.poly([(X(0.56), Y(0.50)), (X(0.94), Y(0.50)), (X(0.98), Y(0.60)),
             (X(0.92), Y(0.72)), (X(0.60), Y(0.72)), (X(0.54), Y(0.60))], INK)
    for i in range(5):
        cv.circle_fill(X(0.60 + i * 0.07), Y(0.57), max(3, w // 62), CREAM)
    cv.line(X(0.70), Y(0.50), X(0.70), Y(0.34), INK, 2)
    cv.fill_rect(X(0.76), Y(0.34), X(0.88) - X(0.76), Y(0.50) - Y(0.34), INK)
    cv.fill_rect(X(0.90), Y(0.42), X(0.96) - X(0.90), Y(0.50) - Y(0.42), INK)
    for i in range(3):
        puff(cv, X(0.80 + i * 0.03), Y(0.26 - i * 0.06), 3 + i * 2)
    cv.fill_rect(X(0.46), Y(0.20), 3, Y(0.86) - Y(0.20), RED)
    for i in range(5):
        cv.circle_fill(X(0.46) + 1, Y(0.24 + i * 0.13), 3, RED)
def scene_berlin(cv, x, y, w, h):
    X, Y = box_of(x, y, w, h)
    cx = X(0.50)
    base = Y(0.94)
    roof = Y(0.56)
    bx, bw = X(0.05), X(0.95) - X(0.05)
    cv.fill_rect(bx, roof, bw, base - roof, SHADE)
    cv.rect_outline(bx, roof, bw, base - roof, INK, 2)
    for row in range(2):
        wy = roof + 6 + row * (base - roof - 10) // 2
        wh = max(5, (base - roof) // 5)
        for i in range(13):
            wxx = bx + 7 + i * (bw - 14) // 12
            cv.fill_rect(wxx, wy, max(4, w // 50), wh, CREAM)
            cv.rect_outline(wxx, wy, max(4, w // 50), wh, INK, 1)
    dw = int(0.18 * w)
    drum_top = Y(0.44)
    cv.fill_rect(cx - dw, drum_top, 2 * dw, roof - drum_top, SHADE)
    cv.rect_outline(cx - dw, drum_top, 2 * dw, roof - drum_top, INK, 2)
    for i in range(6):
        cv.vline(cx - dw + 5 + i * (2 * dw - 10) // 5, drum_top + 4,
                 roof - 4, MUTED, 1)
    rise = drum_top - Y(0.26)
    dome = [(cx - dw, drum_top)]
    for i in range(1, 25):
        a = math.radians(180.0 - 180.0 * i / 24)
        dome.append((cx + dw * math.cos(a), drum_top - rise * math.sin(a)))
    dome.append((cx + dw, drum_top))
    cv.poly(dome, CREAM)
    cv.poly_outline(dome, INK, 2)
    cv.line(cx, drum_top, cx, drum_top - rise, MUTED, 1)
    for f in (0.35, 0.65, 0.9):
        yy = drum_top - int(rise * f)
        span = int(dw * math.sqrt(max(0.0, 1.0 - f * f)))
        cv.line(cx - span, yy, cx + span, yy, MUTED, 1)
    cv.fill_rect(cx - 2, drum_top - rise - 5, 5, 8, INK)
    cv.line(cx, drum_top - rise - 5, cx, drum_top - rise - 10, INK, 2)
    pw = int(0.16 * w)
    ptop = Y(0.70)
    cv.fill_rect(cx - pw, ptop, 2 * pw, base - ptop, CREAM)
    cv.rect_outline(cx - pw, ptop, 2 * pw, base - ptop, INK, 2)
    for i in range(5):
        cv.vline(cx - pw + 7 + i * (2 * pw - 14) // 4, ptop + 6, base - 6,
                 MUTED, 2)
    cv.poly([(cx - pw - 8, ptop), (cx + pw + 8, ptop), (cx, Y(0.63))], CREAM)
    cv.poly_outline([(cx - pw - 8, ptop), (cx + pw + 8, ptop), (cx, Y(0.63))],
                    INK, 2)
    cv.hline(cx - pw - 8, cx + pw + 8, ptop, INK, 2)
    scx, scy = cx, Y(0.12)
    sr = max(10, h // 11)
    cv.circle_fill(scx, scy, sr, TEAL)
    cv.circle_outline(scx, scy, sr, INK, 2)
    cv.poly(star_pts(scx, scy, sr - 3, (sr - 3) // 4), CREAM)
    cv.poly_outline(star_pts(scx, scy, sr - 3, (sr - 3) // 4), INK, 1)
    cv.circle_fill(scx, scy, max(2, sr // 6), TEAL)
    cv.text(X(0.97), Y(0.05), "BERLIN", 1, TEAL, align="right")


def scene_capitol(cv, x, y, w, h):
    X, Y = box_of(x, y, w, h)
    base = Y(0.88)
    cv.fill_rect(X(0.02), Y(0.66), X(0.50) - X(0.02), base - Y(0.66), SHADE)
    cv.rect_outline(X(0.02), Y(0.66), X(0.50) - X(0.02), base - Y(0.66), INK, 2)
    for i in range(7):
        cx = X(0.06 + i * 0.062)
        cv.vline(cx, Y(0.68), base - 1, MUTED, 2)
    cv.poly([(X(0.01), Y(0.66)), (X(0.51), Y(0.66)), (X(0.44), Y(0.54)),
             (X(0.08), Y(0.54))], CREAM)
    cv.poly_outline([(X(0.01), Y(0.66)), (X(0.51), Y(0.66)), (X(0.44), Y(0.54)),
                     (X(0.08), Y(0.54))], INK, 2)
    cx = X(0.26)
    rx = max(10, X(0.14) - X(0.02))
    ry = max(8, Y(0.14) - Y(0.02))
    cv.ellipse_fill(cx, Y(0.42), rx, ry, CREAM)
    cv.ellipse_outline(cx, Y(0.42), rx, ry, INK, 2)
    cv.rect_outline(cx - 3, Y(0.30), 6, Y(0.42) - Y(0.30), INK, 1)
    cv.line(cx, Y(0.30), cx, Y(0.22), INK, 2)
    cv.fill_rect(cx - 1, Y(0.18), 3, Y(0.22) - Y(0.18), INK)
    for i, fh in enumerate((0.40, 0.56, 0.72)):
        bx = X(0.56 + i * 0.14)
        bw = max(12, X(0.11) - X(0.02))
        bh = int(fh * (base - Y(0.22)))
        cv.fill_rect(bx, base - bh, bw, bh, RED if i == 2 else TEAL)
        cv.rect_outline(bx, base - bh, bw, bh, INK, 1)
    cv.hline(X(0.02), X(0.98), base, INK, 2)
    cv.text(X(0.56), Y(0.94), "258 SEATS", 1, INK)
def scene_himalaya(cv, x, y, w, h):
    X, Y = box_of(x, y, w, h)
    ridge = [(x, Y(0.58)), (X(0.11), Y(0.14)), (X(0.23), Y(0.40)),
             (X(0.36), Y(0.08)), (X(0.50), Y(0.38)), (X(0.64), Y(0.16)),
             (X(0.78), Y(0.44)), (x + w, Y(0.26))]
    cv.poly(ridge + [(x + w, Y(0.80)), (x, Y(0.80))], SHADE)
    cv.poly_outline(ridge, INK, 2)
    cv.poly([(X(0.07), Y(0.26)), (X(0.11), Y(0.14)), (X(0.16), Y(0.28)),
             (X(0.12), Y(0.33)), (X(0.09), Y(0.29))], CREAM)
    cv.poly([(X(0.31), Y(0.22)), (X(0.36), Y(0.08)), (X(0.42), Y(0.24)),
             (X(0.37), Y(0.30)), (X(0.33), Y(0.25))], CREAM)
    cv.poly([(X(0.60), Y(0.27)), (X(0.64), Y(0.16)), (X(0.69), Y(0.28)),
             (X(0.65), Y(0.32)), (X(0.62), Y(0.29))], CREAM)
    cv.fill_rect(x, Y(0.80), w, Y(1.0) - Y(0.80), SCENE_BG)
    cv.hline(x, x + w - 1, Y(0.80), INK, 2)
    cv.line(x + 4, Y(0.90), X(0.34), Y(0.86), MUTED, 1)
    cv.line(X(0.34), Y(0.86), X(0.46), Y(0.94), MUTED, 1)
    for i in range(3):
        tx = X(0.10 + i * 0.09)
        cv.fill_rect(tx, Y(0.84), max(6, w // 30), max(4, h // 26), INK)
        cv.fill_rect(tx + 2, Y(0.85), max(2, w // 80), max(2, h // 50), GOLD)
    hx = X(0.62)
    cv.fill_rect(hx, Y(0.84), X(0.72) - hx, Y(0.93) - Y(0.84), SHADE)
    cv.rect_outline(hx, Y(0.84), X(0.72) - hx, Y(0.93) - Y(0.84), INK, 1)
    cv.fill_rect(X(0.72), Y(0.86), X(0.82) - X(0.72), Y(0.91) - Y(0.86), SHADE)
    cv.rect_outline(X(0.72), Y(0.86), X(0.82) - X(0.72), Y(0.91) - Y(0.86), INK, 1)
    cv.fill_rect(X(0.70), Y(0.84), X(0.74) - X(0.70), Y(0.94) - Y(0.84), INK)
    cv.text(X(0.86), Y(0.86), "$1.6BN", 1, TEAL)
def scene_sudan(cv, x, y, w, h):
    X, Y = box_of(x, y, w, h)
    bx, by = X(0.03), Y(0.28)
    bw, bh = X(0.50) - bx, Y(0.90) - by
    cv.fill_rect(bx, by, bw, bh, SHADE)
    for fy in (0.46, 0.66):
        cv.hline(bx, bx + bw - 1, Y(fy), MUTED)
    for row in range(3):
        for col in range(4):
            wx = bx + 5 + col * (bw - 10) // 4
            wy = by + 6 + row * (bh - 12) // 3
            ww = max(5, (bw - 16) // 5)
            wh = max(5, (bh - 14) // 5)
            if (row * 4 + col) % 4 == 0:
                cv.fill_rect(wx, wy, ww, wh, INK)
            else:
                cv.fill_rect(wx, wy, ww, wh, CREAM)
                cv.rect_outline(wx, wy, ww, wh, MUTED)
    cv.poly([(X(0.34), by), (X(0.50), by), (X(0.50), Y(0.46)),
             (X(0.46), Y(0.36)), (X(0.42), Y(0.48)), (X(0.38), Y(0.38)),
             (X(0.34), Y(0.44))], SCENE_BG)
    cv.poly_outline([(X(0.34), by), (X(0.34), Y(0.44)), (X(0.38), Y(0.38)),
                     (X(0.42), Y(0.48)), (X(0.46), Y(0.36)),
                     (X(0.50), Y(0.46)), (X(0.50), by)], INK, 2)
    for i in range(3):
        puff(cv, X(0.43 + i * 0.035), Y(0.18 - i * 0.05), 4 + i * 2)
    cv.rect_outline(bx, by, bw, bh, INK, 2)
    cv.hline(X(0.02), X(0.52), Y(0.90), INK, 2)
    lx, ly = X(0.74), Y(0.42)
    rr = max(11, min(X(0.18) - x, h // 4))
    cv.circle_outline(lx, ly, rr, TEAL, 2)
    cv.ellipse_outline(lx, ly, rr, max(3, rr // 3), TEAL, 1)
    cv.ellipse_outline(lx, ly, max(3, rr // 3), rr, TEAL, 1)
    cv.line(lx, ly - rr, lx, ly + rr, TEAL, 1)
    for side in (-1, 1):
        cx0 = lx + side * rr
        cv.circle_fill(cx0, ly + rr, 3, TEAL)
        arc(cv, lx + side * int(rr * 0.55), ly + rr + 2, int(rr * 1.35),
            200 if side < 0 else -20, 340 if side < 0 else 160, TEAL, 1)
    cv.text(X(0.60), Y(0.74), "UN", 1, TEAL)
    cv.text(X(0.60), Y(0.84), "BUILDING", 1, TEAL)
    cv.text(X(0.60), Y(0.94), "DAMAGED", 1, RED)
def scene_asia(cv, x, y, w, h):
    X, Y = box_of(x, y, w, h)
    cv.fill_rect(X(0.02), Y(0.10), X(0.34) - X(0.02), Y(0.92) - Y(0.10), CREAM)
    cv.rect_outline(X(0.02), Y(0.10), X(0.34) - X(0.02), Y(0.92) - Y(0.10), INK, 2)
    cv.fill_rect(X(0.05), Y(0.15), X(0.31) - X(0.05), Y(0.30) - Y(0.15), SHADE)
    for row in range(4):
        for col in range(2):
            cv.fill_rect(X(0.05 + col * 0.14), Y(0.38 + row * 0.12),
                         max(3, w // 60), max(2, h // 70), MUTED)
    cv.fill_rect(X(0.13), Y(0.86), max(4, w // 55), max(3, h // 80), INK)
    cv.fill_rect(X(0.07), Y(0.92), X(0.29) - X(0.07), Y(0.97) - Y(0.92), SHADE)
    gx, gy = X(0.62), Y(0.36)
    cv.poly([(gx - 9, gy), (gx + 9, gy), (gx + 5, gy - 22), (gx - 5, gy - 22)], INK)
    cv.fill_rect(gx - 16, gy - 26, 32, 5, INK)
    cv.line(gx + 9, gy - 4, X(0.92), Y(0.68), INK, 3)
    cv.poly([(X(0.86), Y(0.62)), (X(0.94), Y(0.72)), (X(0.92), Y(0.76)),
             (X(0.84), Y(0.66))], INK)
    cv.text(X(0.40), Y(0.86), "AI EXAM", 1, TEAL)

CAPTION = (62, 56, 47)


def draw_text_block(cv, x, y, w, s, scale=1, color=CAPTION, leading=3,
                    max_lines=None, tracking=0):
    lines = cv.wrap(normalize(s), w, scale, tracking)
    if max_lines is not None and len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while last and text_width(last + "...", scale, tracking) > w:
            last = last[:-1]
        lines[-1] = last + "..."
    lh = GLYPH_H * scale + leading
    for i, ln in enumerate(lines):
        cv.text(x, y + i * lh, ln, scale, color, tracking)
    return len(lines) * lh


def draw_headline(cv, x, y, w, h, s, scale=2, color=INK, leading=2, tracking=0):
    lines = cv.wrap(normalize(s), w, scale, tracking)
    lh = GLYPH_H * scale + leading
    total = len(lines) * lh - leading
    oy = y + max(0, (h - total) // 2)
    for i, ln in enumerate(lines):
        cv.text(x, oy + i * lh, ln, scale, color, tracking)
    return total


def draw_masthead(cv):
    cv.hline(34, 990, 22, INK, 1)
    cv.text(34, 28, "VOL. VIII", 1, MUTED, 1)
    cv.text(34 + text_width("VOL. VIII", 1, 1) + 12, 28, "NO. 327", 1, MUTED, 1)
    cv.text(990, 28, "THE WORLD, IN ONE IMAGE", 1, MUTED, 1, align="right")
    cv.hline(34, 990, 40, INK, 2)

    title = "THE WORLD LEDGER"
    tw = text_width(title, 8, 1)
    cv.text(W // 2, 46, title, 8, INK, 1, align="center")
    cv.text(W // 2 - tw // 2, 46 + 56 + 3, "", 1, MUTED)
    cv.hline(34, 990, 112, INK, 3)
    cv.hline(34, 990, 117, INK, 1)

    date = "MONDAY, 23 NOVEMBER 2026"
    dw = text_width(date, 4, 2)
    cv.text(W // 2, 126, date, 4, INK, 2, align="center")
    lx = W // 2 - dw // 2 - 16
    rx = W // 2 + dw // 2 + 16
    for px in (lx, rx):
        cv.fill_rect(px - 3, 138, 6, 6, RED)
    cv.text(W // 2, 160, "SUM OF THE DAY'S WORLD NEWS", 1, MUTED, 2, align="center")
    cv.hline(34, 990, 174, INK, 2)
    cv.hline(34, 990, 178, INK, 1)


PANELS = [
    (1, RED, "MOURNING IN DYMER",
     "RUSSIAN STRIKE ON A KYIV APARTMENT BLOCK; THE KYIV REGION DECLARES A DAY OF MOURNING.",
     scene_kyiv),
    (2, TEAL, "MISSILES HIT POLAND",
     "POLAND SAYS THREE OBJECTS WERE RUSSIAN MISSILES; NATO TO MEET. ZELENSKYY BACKS MEMBERSHIP.",
     scene_nato),
    (3, RED, "DRONES SINK CORVETTE",
     "DRONE BOATS SANK A RUSSIAN CORVETTE OFF BENGHAZI; SPARTA II ABLAZE IN THE GULF OF FINLAND.",
     scene_naval),
    (4, RED, "COP31 COLLAPSES",
     "ANTALYA ENDS WITH NO COVER DECISION; 130 NATIONS REJECTED A TEXT WITHOUT A PHASE-OUT.",
     scene_cop),
    (5, RED, "IRAN DEFIES BLOCKADE",
     "TEHRAN VOWS TO USE ALL TOOLS TO CONFRONT THE US NAVAL BLOCKADE OF ITS OIL EXPORTS.",
     scene_iran),
    (6, TEAL, "ZELENSKYY IN BERLIN",
     "UKRAINE'S PRESIDENT TOLD THE NATO PARLIAMENTARY ASSEMBLY THAT FULL MEMBERSHIP "
     "BEATS ARTICLE-5-STYLE GUARANTEES.",
     scene_berlin),
    (7, BLUE, "DEMOCRATS WIN 258",
     "DEMOCRATS CLINCH 258 HOUSE SEATS, THE LARGEST MAJORITY IN OVER THREE DECADES.",
     scene_capitol),
    (8, TEAL, "DELHI AID FOR NEPAL",
     "INDIA PLEDGES $1.6 BILLION IN FLOOD AID AS NEPAL'S PM VISITS DELHI.",
     scene_himalaya),
    (9, RED, "DRONES HIT KHARTOUM",
     "DRONES DAMAGE HOMES AND A UN BUILDING IN KHARTOUM; SUDAN'S CRISIS DEEPENS.",
     scene_sudan),
]


def draw_panel(cv, x, y, w, h, num, accent, headline, caption, scene):
    cv.fill_rect(x, y, w, h, PAPER_LIGHT)
    cv.rect_outline(x, y, w, h, INK, 1)
    cv.fill_rect(x + 1, y + 1, w - 2, 3, accent)
    chip = 20
    cv.fill_rect(x + 9, y + 8, chip, chip, accent)
    cv.text(x + 9 + chip // 2, y + 8 + (chip - GLYPH_H * 2) // 2, str(num), 2,
            CREAM, align="center")
    draw_headline(cv, x + 35, y + 11, w - 44, 14, headline, 2, INK, 2)
    cv.hline(x + 9, x + w - 10, y + 29, FAINT, 1)
    sx, sy = x + 9, y + 33
    sw = w - 18
    sh = h - 33 - 44
    cv.fill_rect(sx, sy, sw, sh, SCENE_BG)
    scene(cv, sx, sy, sw, sh)
    cv.rect_outline(sx, sy, sw, sh, FAINT, 1)
    draw_text_block(cv, x + 9, y + h - 42, w - 19, caption, 1, CAPTION, 3, 4, 4)


def draw_brief(cv):
    x0, x1 = 34, 990
    cv.hline(x0, x1, 858, INK, 2)
    cv.text(x0, 866, "WORLD IN BRIEF", 2, INK, 1)
    cv.hline(x0, 466, 886, INK, 1)
    lines = [
        "BERLIN: ZELENSKYY PRESSES NATO FOR FULL MEMBERSHIP.",
        "BENGHAZI: SEA DRONES STRIKE RUSSIAN SHIPS OFF LIBYA.",
        "COP32 GOES TO ADDIS ABABA AFTER THE ANTALYA COLLAPSE.",
        "DHAKA: HIGH COURT CURBS SOCIAL MEDIA FOR THE UNDER-16S.",
        "BANTEN, INDONESIA: CANDY FACTORY BLAZE LEAVES WORKERS DEAD.",
        "KHARTOUM: AID AGENCIES WARN THE CRISIS IS SPIRALLING.",
    ]
    yy = 894
    for ln in lines:
        cv.fill_rect(x0, yy + 2, 4, 4, RED)
        cv.text(x0 + 11, yy, ln, 1, CAPTION, 0)
        yy += 15
    cv.vline(478, 862, 992, FAINT, 1)
    cx = 492
    cv.fill_rect(cx, 866, 26, 22, TEAL)
    cv.text(cx + 13, 869, "10", 2, CREAM, align="center")
    draw_headline(cv, cx + 32, 862, 320, 26, "AI EXAM SCANDAL", 2, INK, 2)
    scene_asia(cv, cx, 896, 226, 100)
    cv.rect_outline(cx, 896, 226, 100, FAINT, 1)
    draw_text_block(cv, 734, 896, 256,
                    "SOUTH KOREA'S EDUCATION MINISTER RESIGNS DAYS BEFORE THE "
                    "SUNEUNG EXAM, AS SEOUL AND DHAKA MOVE ON AI CHEATING AND "
                    "TEEN SCREENS.", 1, CAPTION, 4, 8)
    cv.hline(x0, x1, 998, INK, 1)
    cv.text(W // 2, 1003, "THE WORLD LEDGER  ·  MONDAY, 23 NOVEMBER 2026  ·  PAGE ONE",
            1, MUTED, 1, align="center")


def render():
    cv = Canvas(W, H, PAPER)
    paper_texture(cv)
    cv.rect_outline(18, 12, W - 36, H - 24, INK, 1)
    draw_masthead(cv)
    m = 34
    gut = 12
    pw = (W - 2 * m - 2 * gut) // 3
    ph = 214
    for i, (num, accent, head, cap, scene) in enumerate(PANELS):
        col = i % 3
        row = i // 3
        px = m + col * (pw + gut)
        py = 184 + row * (ph + 12)
        draw_panel(cv, px, py, pw, ph, num, accent, head, cap, scene)
    draw_brief(cv)
    return cv


def write_png(path, cv):
    raw = bytearray()
    stride = cv.w * 3
    for y in range(cv.h):
        raw.append(0)
        raw += cv.data[y * stride:(y + 1) * stride]
    comp = zlib.compress(bytes(raw), 9)

    def chunk(tag, payload):
        return (struct.pack(">I", len(payload)) + tag + payload +
                struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF))

    ihdr = struct.pack(">IIBBBBB", cv.w, cv.h, 8, 2, 0, 0, 0)
    out = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) +
           chunk(b"IDAT", comp) + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(out)
    return len(out)


def verify_file(path):
    try:
        with open(path, "rb") as f:
            data = f.read()
    except OSError as e:
        print("FAIL cannot read %s: %s" % (path, e))
        return False
    ok = True
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        print("FAIL signature: %r" % (data[:8],))
        return False
    pos = 8
    first = True
    width = height = None
    idat = bytearray()
    nchunks = 0
    while pos + 8 <= len(data):
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        tag = data[pos + 4:pos + 8]
        if pos + 12 + length > len(data):
            print("FAIL truncated chunk %r at %d" % (tag, pos))
            ok = False
            break
        payload = data[pos + 8:pos + 8 + length]
        (crc,) = struct.unpack(">I", data[pos + 8 + length:pos + 12 + length])
        calc = zlib.crc32(tag + payload) & 0xFFFFFFFF
        if crc != calc:
            print("FAIL CRC %r: stored %08x calc %08x" % (tag, crc, calc))
            ok = False
        if first:
            if tag != b"IHDR" or length != 13:
                print("FAIL first chunk is %r len %d" % (tag, length))
                return False
            width, height = struct.unpack(">II", payload[:8])
            first = False
        if tag == b"IDAT":
            idat += payload
        if tag == b"IEND":
            pos += 12 + length
            break
        pos += 12 + length
        nchunks += 1
    print("file:      %s" % path)
    print("bytes:     %d (limit 1048576)" % len(data))
    print("size:      %dx%d" % (width or 0, height or 0))
    print("chunks:    %d" % nchunks)
    if (width, height) != (1024, 1024):
        print("FAIL dimensions")
        ok = False
    if len(data) > 1048576:
        print("FAIL too large")
        ok = False
    try:
        dec = zlib.decompress(bytes(idat))
        need = 1024 * (1024 * 3 + 1)
        if len(dec) != need:
            print("FAIL IDAT decoded %d bytes, expected %d" % (len(dec), need))
            ok = False
        else:
            print("pixels:    %d bytes decoded OK" % len(dec))
    except zlib.error as e:
        print("FAIL IDAT: %s" % e)
        ok = False
    import hashlib
    print("sha256:    %s" % hashlib.sha256(data).hexdigest())
    print("PASS" if ok else "FAIL")
    return ok


def main(argv):
    if len(argv) > 1 and argv[1] == "--verify":
        if len(argv) > 2:
            sys.exit(0 if verify_file(argv[2]) else 1)
        import tempfile
        tmpdir = tempfile.mkdtemp(prefix="newsimage-")
        p1 = os.path.join(tmpdir, "a.png")
        p2 = os.path.join(tmpdir, "b.png")
        cv = render()
        n1 = write_png(p1, cv)
        cv2 = render()
        n2 = write_png(p2, cv2)
        print("re-rendered twice: %d and %d bytes" % (n1, n2))
        with open(p1, "rb") as f:
            b1 = f.read()
        with open(p2, "rb") as f:
            b2 = f.read()
        same = b1 == b2
        print("determinism: %s" % ("IDENTICAL BYTES" if same else "MISMATCH"))
        for p in (p1, p2):
            try:
                os.remove(p)
            except OSError:
                pass
        try:
            os.rmdir(tmpdir)
        except OSError:
            pass
        out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "entry.png")
        write_png(out, cv)
        ok = verify_file(out)
        sys.exit(0 if (ok and same) else 1)

    cv = render()
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "entry.png")
    size = write_png(out, cv)
    extra = os.environ.get("MAKEFUN_OUTPUT_DIR")
    if extra:
        try:
            os.makedirs(extra, exist_ok=True)
            write_png(os.path.join(extra, "entry.png"), cv)
        except OSError:
            pass
    elif os.path.isdir("/output"):
        try:
            write_png("/output/entry.png", cv)
        except OSError:
            pass
    print("wrote %s (%d bytes)" % (out, size))


if __name__ == "__main__":
    main(sys.argv)
