# -*- coding: utf-8 -*-
"""软件 3D：透视相机、平面着色、雾、地面阴影、画家算法排序。
y 轴向上，地面 y=0。
"""
import math
import numpy as np
import skia
from .core import LW, LH, C, CI, clamp, lerp


def normalize(v):
    v = np.asarray(v, np.float64)
    n = np.linalg.norm(v)
    return v / n if n > 0 else v


class Camera:
    def __init__(self, pos, target, fov=50.0, up=(0, 1, 0), roll=0.0):
        self.pos = np.asarray(pos, np.float64)
        self.target = np.asarray(target, np.float64)
        f = normalize(self.target - self.pos)
        r = normalize(np.cross(f, np.asarray(up, np.float64)))
        u = np.cross(r, f)
        if roll:
            cr, sr = math.cos(roll), math.sin(roll)
            r, u = r * cr + u * sr, -r * sr + u * cr
        self.f, self.r, self.u = f, r, u
        self.fov = fov
        self.focal = (LH / 2) / math.tan(math.radians(fov) / 2)
        self.near = 0.5

    def to_cam(self, P):
        d = P - self.pos
        return np.stack([d @ self.r, d @ self.u, d @ self.f], axis=-1)

    def proj_cam(self, Q):
        z = np.maximum(Q[..., 2], 1e-6)
        x = LW / 2 + Q[..., 0] / z * self.focal
        y = LH / 2 - Q[..., 1] / z * self.focal
        return np.stack([x, y], -1), Q[..., 2]

    def project(self, P):
        return self.proj_cam(self.to_cam(np.asarray(P, np.float64)))

    def horizon_y(self):
        # 远处水平方向的点
        fh = np.array([self.f[0], 0.0, self.f[2]])
        fh = normalize(fh) if np.linalg.norm(fh) > 1e-6 else np.array([0, 0, 1.0])
        P = self.pos + fh * 1e7
        P[1] = 0.0
        (xy, z) = self.project(P[None, :])
        return float(xy[0, 1])


class Mesh:
    """多边形网格：verts Nx3, faces 列表(索引元组), colors 每面 ARGB, convex 是否作为凸物体投影阴影。"""
    def __init__(self, verts, faces, color, shadow=True, emissive=0.0, double=False, rough=0.0):
        self.v = np.asarray(verts, np.float64)
        self.faces = [tuple(f) for f in faces]
        self.color = color if isinstance(color, (list, tuple)) else [color] * len(self.faces)
        self.shadow = shadow
        self.emissive = emissive
        self.double = double
        self.rough = rough


def _rgbf(c):
    return np.array([(c >> 16) & 255, (c >> 8) & 255, c & 255], np.float64) / 255.0


def _toint(rgbf, a=1.0):
    r, g, b = [int(clamp(x) * 255 + 0.5) for x in rgbf]
    return (int(clamp(a) * 255 + 0.5) << 24) | (r << 16) | (g << 8) | b


def _clip_near(Q, near):
    """Sutherland-Hodgman 对相机空间多边形做近平面裁剪。"""
    out = []
    n = len(Q)
    for i in range(n):
        a = Q[i]; b = Q[(i + 1) % n]
        ina = a[2] >= near; inb = b[2] >= near
        if ina:
            out.append(a)
        if ina != inb:
            t = (near - a[2]) / (b[2] - a[2])
            out.append(a + (b - a) * t)
    return np.array(out) if out else None


def convex_hull(pts):
    pts = sorted(set(map(tuple, np.round(pts, 6))))
    if len(pts) <= 2:
        return np.array(pts)
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return np.array(lower[:-1] + upper[:-1])


class Light:
    def __init__(self, sun_dir=(-0.5, 0.35, 0.8), sun=0xFFFFD9A8, sky=0xFF3A4060, ground=0xFF3A2A20,
                 fog=0xFFC98A5A, fog_density=0.0025, fog_max=0.92, sun_int=1.0, amb_int=0.55,
                 shadow_alpha=0.55, shadow_color=0xFF120C0A, rim=0.0, rim_color=0xFFFFC08A):
        self.sun_dir = normalize(sun_dir)  # 指向太阳
        self.sun = _rgbf(sun); self.sky = _rgbf(sky); self.ground = _rgbf(ground)
        self.fog = _rgbf(fog); self.fog_density = fog_density; self.fog_max = fog_max
        self.sun_int = sun_int; self.amb_int = amb_int
        self.shadow_alpha = shadow_alpha; self.shadow_color = shadow_color
        self.rim = rim; self.rim_color = _rgbf(rim_color)


def render(c, cam, meshes, light, ground_shadows=True, edge=None, edge_alpha=0.0, alpha=1.0, max_dist=1e9):
    """绘制网格。返回绘制面数。"""
    faces_out = []
    shadow_polys = []
    L = light.sun_dir
    for m in meshes:
        V = m.v
        Q = cam.to_cam(V)
        if m.shadow and ground_shadows and L[1] > 0.02:
            # 沿光线把顶点投到地面 y=0
            t = V[:, 1] / L[1]
            G = V - np.outer(t, L)
            G[:, 1] = 0.0
            hull = convex_hull(G[:, [0, 2]])
            if len(hull) >= 3:
                shadow_polys.append(np.stack([hull[:, 0], np.zeros(len(hull)), hull[:, 1]], -1))
        for fi, f in enumerate(m.faces):
            Pf = V[list(f)]
            Qf = Q[list(f)]
            if np.all(Qf[:, 2] < cam.near):
                continue
            n = np.cross(Pf[1] - Pf[0], Pf[2] - Pf[0])
            nn = np.linalg.norm(n)
            if nn < 1e-12:
                continue
            n = n / nn
            centroid = Pf.mean(0)
            view = cam.pos - centroid
            facing = np.dot(n, view)
            if facing < 0:
                if not m.double:
                    continue
                n = -n
            depth = float(np.linalg.norm(view))
            if depth > max_dist:
                continue
            # 着色
            base = _rgbf(m.color[fi])
            ndl = max(0.0, float(np.dot(n, L)))
            hemi = 0.5 + 0.5 * n[1]
            amb = light.sky * hemi + light.ground * (1 - hemi)
            col = base * (amb * light.amb_int + light.sun * ndl * light.sun_int)
            if light.rim > 0:
                vd = view / max(depth, 1e-6)
                rim = (1 - max(0.0, float(np.dot(n, vd)))) ** 3
                col = col + light.rim_color * rim * light.rim * max(0.0, -float(np.dot(vd, L)) * 0.5 + 0.5)
            if m.emissive:
                col = col + base * m.emissive
            fog = min(light.fog_max, 1 - math.exp(-depth * light.fog_density))
            col = col * (1 - fog) + light.fog * fog
            if np.any(Qf[:, 2] < cam.near):
                Qc = _clip_near(Qf, cam.near)
                if Qc is None or len(Qc) < 3:
                    continue
            else:
                Qc = Qf
            xy, _ = cam.proj_cam(Qc)
            faces_out.append((depth, xy, _toint(col, alpha)))
    # 阴影
    if shadow_polys:
        c.saveLayerAlpha(None, int(255 * light.shadow_alpha * alpha))
        sp = skia.Paint(AntiAlias=True, Color=light.shadow_color | 0xFF000000)
        for G in shadow_polys:
            Qg = cam.to_cam(G)
            if np.all(Qg[:, 2] < cam.near):
                continue
            if np.any(Qg[:, 2] < cam.near):
                Qg = _clip_near(Qg, cam.near)
                if Qg is None or len(Qg) < 3:
                    continue
            xy, _ = cam.proj_cam(Qg)
            path = skia.Path()
            path.addPoly([skia.Point(float(a), float(b)) for a, b in xy], True)
            c.drawPath(path, sp)
        c.restore()
    faces_out.sort(key=lambda x: -x[0])
    p = skia.Paint(AntiAlias=True)
    ep = None
    if edge is not None and edge_alpha > 0:
        ep = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=0.8)
    for depth, xy, col in faces_out:
        path = skia.Path()
        path.addPoly([skia.Point(float(a), float(b)) for a, b in xy], True)
        p.setColor(col)
        c.drawPath(path, p)
        # 细缝，避免相邻面露缝
        if ep is not None:
            ep.setColor(CI(edge, edge_alpha * alpha))
            c.drawPath(path, ep)
    return len(faces_out)


# ------------------------------------------------------------------ 几何体
def box(cx, cy, cz, sx, sy, sz, color, ry=0.0, top_scale=1.0, **kw):
    """以底面中心 (cx,cy,cz) 为基准的长方体，sy 为高度。ry 绕 y 轴旋转。top_scale 让顶部收窄。"""
    hx, hz = sx / 2, sz / 2
    b = np.array([[-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz]], np.float64)
    t = b.copy(); t[:, 0] *= top_scale; t[:, 2] *= top_scale; t[:, 1] = sy
    V = np.vstack([b, t])
    cr, sr = math.cos(ry), math.sin(ry)
    R = np.array([[cr, 0, sr], [0, 1, 0], [-sr, 0, cr]])
    V = V @ R.T + np.array([cx, cy, cz])
    F = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return Mesh(V, F, color, **kw)


def spike(base_center, base_r, apex, color, sides=4, rot=0.0, **kw):
    """尖刺：底面多边形 + 顶点。"""
    bc = np.asarray(base_center, np.float64)
    ax = np.asarray(apex, np.float64)
    d = normalize(ax - bc)
    # 底面所在平面的两个基向量
    tmp = np.array([0, 1, 0.0]) if abs(d[1]) < 0.9 else np.array([1, 0, 0.0])
    e1 = normalize(np.cross(d, tmp)); e2 = np.cross(d, e1)
    V = [bc + base_r * (math.cos(rot + k * 2 * math.pi / sides) * e1 + math.sin(rot + k * 2 * math.pi / sides) * e2)
         for k in range(sides)]
    V.append(ax)
    V = np.array(V)
    F = [(k, (k + 1) % sides, sides) for k in range(sides)]
    F.append(tuple(range(sides - 1, -1, -1)))
    return Mesh(V, F, color, **kw)


def prism(poly_xz, h, color, top_inset=0.0, **kw):
    """把地面多边形挤出成棱柱（可收顶，像土丘）。poly 逆时针（从上看）。"""
    P = np.asarray(poly_xz, np.float64)
    n = len(P)
    cen = P.mean(0)
    B = np.stack([P[:, 0], np.zeros(n), P[:, 1]], -1)
    T = P + (cen - P) * top_inset
    T = np.stack([T[:, 0], np.full(n, h), T[:, 1]], -1)
    V = np.vstack([B, T])
    F = [tuple(range(n, 2 * n))]  # 顶
    for k in range(n):
        k2 = (k + 1) % n
        F.append((k, k2, n + k2, n + k))
    return Mesh(V, F, color, **kw)


def sky(c, cam, top, mid, hor, sun_xy=None, sun_color=0xFFFFE2B0, sun_r=26, glow_r=520, glow_a=0.55):
    """天空渐变 + 太阳。返回地平线 y。"""
    hy = cam.horizon_y()
    hy_c = clamp(hy, -2000, 3000)
    sh = skia.GradientShader.MakeLinear([skia.Point(0, hy_c - 900), skia.Point(0, hy_c)],
                                        [top | 0xFF000000, mid | 0xFF000000, hor | 0xFF000000], [0.0, 0.62, 1.0])
    c.drawRect(skia.Rect.MakeXYWH(-50, -50, LW + 100, max(0, hy_c) + 60), skia.Paint(Shader=sh))
    if sun_xy is not None:
        sx, sy = sun_xy
        g = skia.GradientShader.MakeRadial(skia.Point(sx, sy), glow_r,
                                           [CI(sun_color, glow_a), CI(sun_color, glow_a * 0.28), CI(sun_color, 0)],
                                           [0.0, 0.3, 1.0])
        c.drawCircle(sx, sy, glow_r, skia.Paint(AntiAlias=True, Shader=g))
        c.drawCircle(sx, sy, sun_r, skia.Paint(AntiAlias=True, Color=sun_color | 0xFF000000))
    return hy


def ground(c, cam, near_col, far_col, hy=None):
    if hy is None:
        hy = cam.horizon_y()
    hy_c = clamp(hy, -2000, 3000)
    sh = skia.GradientShader.MakeLinear([skia.Point(0, hy_c), skia.Point(0, LH + 50)],
                                        [far_col | 0xFF000000, near_col | 0xFF000000], [0.0, 1.0])
    c.drawRect(skia.Rect.MakeLTRB(-50, hy_c, LW + 50, LH + 50), skia.Paint(Shader=sh))
    return hy


# ------------------------------------------------------------------ 预计算静态场景（快速路径）
class Scene3D:
    """静态网格 + 静态光照：预先算好每个面的受光颜色与阴影多边形，逐帧只做投影/雾/排序。"""
    def __init__(self, meshes, light):
        self.light = light
        verts, faces, cols, nrm, cen, emis = [], [], [], [], [], []
        off = 0
        L = light.sun_dir
        shadows = []
        for m in meshes:
            V = m.v
            for fi, f in enumerate(m.faces):
                P = V[list(f)]
                n = np.cross(P[1] - P[0], P[2] - P[0])
                nn = np.linalg.norm(n)
                if nn < 1e-12:
                    continue
                n = n / nn
                base = _rgbf(m.color[fi])
                faces.append([off + i for i in f])
                nrm.append(n)
                cen.append(P.mean(0))
                cols.append(base)
                emis.append(m.emissive)
            verts.append(V)
            off += len(V)
            if m.shadow and L[1] > 0.02:
                t = V[:, 1] / L[1]
                G = V - np.outer(t, L)
                hull = convex_hull(G[:, [0, 2]])
                if len(hull) >= 3:
                    shadows.append(np.stack([hull[:, 0], np.zeros(len(hull)), hull[:, 1]], -1))
        self.V = np.vstack(verts)
        self.faces = faces
        self.N = np.array(nrm)
        self.cen = np.array(cen)
        base = np.array(cols)
        self.base = base
        self.emis = np.array(emis)
        ndl = np.clip(self.N @ L, 0, None)
        hemi = 0.5 + 0.5 * self.N[:, 1]
        amb = np.outer(hemi, light.sky) + np.outer(1 - hemi, light.ground)
        self.lit = base * (amb * light.amb_int + np.outer(ndl, light.sun) * light.sun_int) + base * self.emis[:, None]
        self.shadows = shadows
        self.nv = np.array([len(f) for f in faces])

    def render(self, c, cam, alpha=1.0, edge=None, edge_alpha=0.0, cull_dist=1e9, extra_fog=None, V=None,
               shadow_mul=1.0):
        L = self.light
        Q = cam.to_cam(self.V if V is None else V)
        xy, z = cam.proj_cam(Q)
        view = cam.pos[None, :] - self.cen
        dist = np.linalg.norm(view, axis=1)
        facing = np.einsum('ij,ij->i', self.N, view) > 0
        col = self.lit.copy()
        if L.rim > 0:
            vd = view / np.maximum(dist[:, None], 1e-6)
            rim = (1 - np.clip(np.einsum('ij,ij->i', self.N, vd), 0, None)) ** 3
            back = np.clip(-(vd @ L.sun_dir) * 0.5 + 0.5, 0, 1)
            col = col + np.outer(rim * back * L.rim, L.rim_color)
        fog = np.minimum(L.fog_max, 1 - np.exp(-dist * L.fog_density))
        fogc = L.fog if extra_fog is None else extra_fog
        col = col * (1 - fog[:, None]) + fogc[None, :] * fog[:, None]
        col = np.clip(col, 0, 1)
        ci = (np.round(col * 255).astype(np.int64))
        argb = (int(clamp(alpha) * 255) << 24) | (ci[:, 0] << 16) | (ci[:, 1] << 8) | ci[:, 2]
        # 阴影
        if self.shadows and shadow_mul > 0.003:
            c.saveLayerAlpha(None, int(255 * L.shadow_alpha * alpha * shadow_mul))
            sp = skia.Paint(AntiAlias=True, Color=L.shadow_color | 0xFF000000)
            path = skia.Path()
            for G in self.shadows:
                Qg = cam.to_cam(G)
                if np.all(Qg[:, 2] < cam.near):
                    continue
                if np.any(Qg[:, 2] < cam.near):
                    Qg = _clip_near(Qg, cam.near)
                    if Qg is None or len(Qg) < 3:
                        continue
                pxy, _ = cam.proj_cam(Qg)
                if pxy[:, 0].max() < -50 or pxy[:, 0].min() > LW + 50 or pxy[:, 1].min() > LH + 50:
                    continue
                path.addPoly([skia.Point(float(a), float(b)) for a, b in pxy], True)
            c.drawPath(path, sp)
            c.restore()
        vis = np.nonzero(facing & (dist < cull_dist))[0]
        order = vis[np.argsort(-dist[vis])]
        p = skia.Paint(AntiAlias=True)
        ep = None
        if edge is not None and edge_alpha > 0:
            ep = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=0.7, Color=CI(edge, edge_alpha * alpha))
        near = cam.near
        for fi in order:
            f = self.faces[fi]
            zf = z[f]
            if zf.min() < near:
                if zf.max() < near:
                    continue
                Qc = _clip_near(Q[f], near)
                if Qc is None or len(Qc) < 3:
                    continue
                pts, _ = cam.proj_cam(Qc)
            else:
                pts = xy[f]
            if pts[:, 0].max() < -20 or pts[:, 0].min() > LW + 20 or pts[:, 1].max() < -20 or pts[:, 1].min() > LH + 20:
                continue
            path = skia.Path()
            path.addPoly([skia.Point(float(a), float(b)) for a, b in pts], True)
            p.setColor(int(argb[fi]))
            c.drawPath(path, p)
            if ep is not None:
                c.drawPath(path, ep)
        return len(order)
