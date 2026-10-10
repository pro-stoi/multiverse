// multiverse/render/svgParser.js
//
// Парсер SVG-строки в Path2D + цвета.
// Поддерживает: circle, ellipse, rect, line, polygon, polyline, path.
// path поддерживает: M, L, H, V, Z (абсолютные и относительные).
//
// Возвращает массив элементов:
//   { id, path: Path2D, fill: string|null, stroke: string|null,
//     strokeWidth: number, opacity: number }
//
// Координаты центрируются: SVG рисуется так, будто его центр (0,0) в
// точке (cx, cy) на канве и масштаб scale.

export class SvgParser {
    // Кэш: ключ = svg + '|' + cx + '|' + cy + '|' + scale
    // Значение = массив Path2D в абсолютных координатах канвы.
    // Это критично для производительности — не парсим каждый кадр.

   static _cache = new Map();
static _localCache = new Map();

    static parse(svgString, cx, cy, scale) {
        if (!svgString) return [];

        const key = svgString + '|' + cx + '|' + cy + '|' + scale;
        if (SvgParser._cache.has(key)) {
            return SvgParser._cache.get(key);
        }

        const result = SvgParser._parseUncached(svgString, cx, cy, scale);
        SvgParser._cache.set(key, result);
        return result;
    }


  // Новый метод: парсит SVG в локальных координатах (0, 0).
    // Трансформация (поворот, сдвиг) — снаружи, через ctx.
    static parseLocal(svgString, scale) {
        if (!svgString) return [];

        const key = svgString + '|' + scale;
        if (SvgParser._localCache.has(key)) {
            return SvgParser._localCache.get(key);
        }

        const result = SvgParser._parseUncached(svgString, 0, 0, scale);
        SvgParser._localCache.set(key, result);
        return result;
    }

    static clearCache() {
        SvgParser._cache.clear();
    SvgParser._localCache.clear();
    }

    static _parseUncached(svgString, cx, cy, scale) {
        const out = [];

        const start = svgString.indexOf('>');
        const end   = svgString.lastIndexOf('</svg>');
        if (start < 0 || end < 0) return out;

        const body = svgString.substring(start + 1, end);

        const tagRe = /<(circle|ellipse|rect|line|polygon|polyline|path)\b([^>]*)\/?>/gi;
        let m;
        while ((m = tagRe.exec(body)) !== null) {
            const tag = m[1].toLowerCase();
            const attrs = m[2];
            const el = SvgParser._parseElement(tag, attrs, cx, cy, scale);
            if (el) out.push(el);
        }
        return out;
    }

    static _parseElement(tag, attrs, cx, cy, scale) {
        const id = SvgParser._attr(attrs, 'id');
        const fill = SvgParser._color(SvgParser._attr(attrs, 'fill'));
        const stroke = SvgParser._color(SvgParser._attr(attrs, 'stroke'));
        const strokeWidth = SvgParser._num(SvgParser._attr(attrs, 'stroke-width'), 0) * scale;
        const opacity = SvgParser._num(SvgParser._attr(attrs, 'opacity'), 1);

        let path = null;

        switch (tag) {
            case 'circle': {
                const x = cx + SvgParser._num(SvgParser._attr(attrs, 'cx'), 0) * scale;
                const y = cy + SvgParser._num(SvgParser._attr(attrs, 'cy'), 0) * scale;
                const r = SvgParser._num(SvgParser._attr(attrs, 'r'), 0) * scale;
                path = new Path2D();
                path.arc(x, y, r, 0, Math.PI * 2);
                break;
            }
            case 'ellipse': {
                const x = cx + SvgParser._num(SvgParser._attr(attrs, 'cx'), 0) * scale;
                const y = cy + SvgParser._num(SvgParser._attr(attrs, 'cy'), 0) * scale;
                const rx = SvgParser._num(SvgParser._attr(attrs, 'rx'), 0) * scale;
                const ry = SvgParser._num(SvgParser._attr(attrs, 'ry'), 0) * scale;
                path = new Path2D();
                path.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
                break;
            }
            case 'rect': {
                const x = cx + SvgParser._num(SvgParser._attr(attrs, 'x'), 0) * scale;
                const y = cy + SvgParser._num(SvgParser._attr(attrs, 'y'), 0) * scale;
                const w = SvgParser._num(SvgParser._attr(attrs, 'width'), 0) * scale;
                const h = SvgParser._num(SvgParser._attr(attrs, 'height'), 0) * scale;
                const rx = SvgParser._num(SvgParser._attr(attrs, 'rx'), 0) * scale;
                path = new Path2D();
                if (rx > 0) path.roundRect(x, y, w, h, rx);
                else        path.rect(x, y, w, h);
                break;
            }
            case 'line': {
                const x1 = cx + SvgParser._num(SvgParser._attr(attrs, 'x1'), 0) * scale;
                const y1 = cy + SvgParser._num(SvgParser._attr(attrs, 'y1'), 0) * scale;
                const x2 = cx + SvgParser._num(SvgParser._attr(attrs, 'x2'), 0) * scale;
                const y2 = cy + SvgParser._num(SvgParser._attr(attrs, 'y2'), 0) * scale;
                path = new Path2D();
                path.moveTo(x1, y1);
                path.lineTo(x2, y2);
                break;
            }
            case 'polygon':
            case 'polyline': {
                const pts = SvgParser._attr(attrs, 'points');
                if (!pts) return null;
                path = new Path2D();
                const pairs = pts.trim().split(/\s+/);
                let first = true;
                for (const pair of pairs) {
                    const xy = pair.split(',');
                    if (xy.length < 2) continue;
                    const x = cx + parseFloat(xy[0]) * scale;
                    const y = cy + parseFloat(xy[1]) * scale;
                    if (first) { path.moveTo(x, y); first = false; }
                    else       { path.lineTo(x, y); }
                }
                if (tag === 'polygon') path.closePath();
                break;
            }
            case 'path': {
                const d = SvgParser._attr(attrs, 'd');
                if (!d) return null;
                path = SvgParser._parsePath(d, cx, cy, scale);
                break;
            }
            default:
                return null;
        }

        return { id, path, fill, stroke, strokeWidth, opacity };
    }

    // ----- path -----
    static _parsePath(d, cx, cy, scale) {
        const p = new Path2D();
        const tokens = d.replace(/,/g, ' ').trim().split(/\s+/);

        let x = 0, y = 0;
        let startX = 0, startY = 0;
        let cmd = '';
        let i = 0;

        while (i < tokens.length) {
            const t = tokens[i];

            if (t.length === 1 && /[A-Za-z]/.test(t)) {
                cmd = t;
                i++;
                if (cmd === 'Z' || cmd === 'z') {
                    p.closePath();
                    x = startX; y = startY;
                }
                continue;
            }

            switch (cmd) {
                case 'M':
                case 'm': {
                    x = parseFloat(tokens[i++]);
                    y = parseFloat(tokens[i++]);
                    p.moveTo(cx + x * scale, cy + y * scale);
                    startX = x; startY = y;
                    cmd = (cmd === 'M') ? 'L' : 'l';
                    break;
                }
                case 'L':
                case 'l': {
                    x = parseFloat(tokens[i++]);
                    y = parseFloat(tokens[i++]);
                    p.lineTo(cx + x * scale, cy + y * scale);
                    break;
                }
                case 'H':
                case 'h': {
                    x = parseFloat(tokens[i++]);
                    p.lineTo(cx + x * scale, cy + y * scale);
                    break;
                }
                case 'V':
                case 'v': {
                    y = parseFloat(tokens[i++]);
                    p.lineTo(cx + x * scale, cy + y * scale);
                    break;
                }
                case 'Z':
                case 'z': {
                    p.closePath();
                    x = startX; y = startY;
                    i++;
                    break;
                }
                default:
                    // неизвестная команда — прекращаем
                    return p;
            }
        }
        return p;
    }

    // ----- утилиты -----
    static _attr(attrs, name) {
        const re = new RegExp(name + '\\s*=\\s*["\']([^"\']*)["\']');
        const m = attrs.match(re);
        return m ? m[1] : null;
    }

    static _num(s, def) {
        if (s == null) return def;
        const v = parseFloat(s);
        return isNaN(v) ? def : v;
    }

    static _color(s) {
        if (s == null) return null;
        s = s.trim();
        if (s === '' || s.toLowerCase() === 'none') return null;
        return s;   // canvas сам поймёт '#rrggbb', 'rgb(...)', 'hsl(...)'
    }
}