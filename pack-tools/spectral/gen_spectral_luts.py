"""Offline generator for datasheet-based LUTs (CLAUDE.md §6, decided C-18).

Uses spectral_film_lut (MIT, https://github.com/JanLohse/spectral_film_lut) to simulate each prototype's
negative + print (or B&W paper) from published film datasheets, sRGB in / sRGB out, 33^3.
Writes .cube files to OUT_DIR; convert them with pack-tools/cube2png.mts. Not part of CI: run by hand
in a virtualenv with `pip install spectral_film_lut`.

    python pack-tools/spectral/gen_spectral_luts.py <out_dir> [id ...]
"""

import sys
from pathlib import Path

import spectral_film_lut as sfl
from spectral_film_lut.film_spectral import FilmSpectral
from spectral_film_lut.utils import create_lut

# id -> (negative, print or None, film_conversion overrides). Comments name the camera prototype.
RECIPES = {
    # A · 日系彩色 135. exp_kelvin is the assumed scene white balance: above 6500 K warms the result.
    "sunny-fun": ("KODAK_PORTRA_800_AT_1600", "KODAK_SUPRA_ENDURA", {"exp_kelvin": 8500, "exp_comp": 0.3, "sat_adjust": 1.05}),  # FunSaver 800
    "pocket-gold": ("KODAK_GOLD_200", "KODAK_PORTRA_ENDURA", {"exp_kelvin": 7500, "sat_adjust": 1.05}),  # mju-II + Gold 200
    "green-flash": ("FUJI_SUPERIA_XTRA_400", "FUJI_CA_SUPER_C", {"tint": -0.12}),  # QuickSnap + X-TRA 400
    "knight-t2": ("AGFA_VISTA_100", "FUJI_CA_DPII", {"exp_kelvin": 6000, "tint": -0.05, "sat_adjust": 0.95}),  # T2 + Vista
    "moonlight": ("FUJI_NATURA_1600", "FUJI_CA_SUPER_C", {"exp_comp": 0.6, "exp_kelvin": 7000}),  # NATURA S + Natura 1600
    "red-box": ("KODAK_EKTAR_100", "KODAK_ENDURA_PREMIER", {"sat_adjust": 1.2}),  # TC-1 + Ektar 100
    "sakura-premium": ("FUJI_SUPERIA_REALA", "FUJI_CA_DPII", {"tint": 0.12, "exp_comp": 0.4, "sat_adjust": 0.95}),  # T3 + Superia Premium (Reala data)
    "pastel-160": ("KODAK_PORTRA_160", "KODAK_PORTRA_ENDURA", {"exp_comp": 0.7, "sat_adjust": 0.75}),  # T4 + Portra 160
    # B · 街头黑白 (Tri-X / Double-X data on Polymax paper grades)
    "m3-hp5": ("KODAK_TRI_X_400", "KODAK_POLYMAX_GRADE_2", {}),  # M3 + HP5 (Tri-X data)
    "street-gr": ("KODAK_TRI_X_400_DEV_11", "KODAK_POLYMAX_GRADE_4", {}),  # GR21 + Tri-X, hard
    "night-3200": ("KODAK_TRI_X_400_DEV_11", "KODAK_POLYMAX_GRADE_3", {"exp_comp": 0.5}),  # FM2 + Delta 3200 (pushed Tri-X)
    "silver-50": ("KODAK_5222_DEV_4", "KODAK_POLYMAX_GRADE_1", {}),  # Rollei 35 + Pan F 50 (soft Double-X)
    "ql17-street": ("KODAK_TRI_X_400_DEV_7", "KODAK_POLYMAX_GRADE_2", {}),  # QL17 + Neopan 400
    "silk-xp2": ("KODAK_5222_DEV_5", "KODAK_POLYMAX_GRADE_1", {"exp_comp": 0.3}),  # XA + XP2 (smooth)
}

COMMON = {
    "input_colorspace": "sRGB",
    "output_gamut": "Rec. 709",
    "gamma_func": "sRGB",
}


def film(name: str, negative: FilmSpectral | None = None) -> FilmSpectral:
    stock = FilmSpectral(getattr(sfl, name))
    if negative is not None and stock.stage == "print" and stock.density_measure == "status_a":
        stock.set_color_checker(negative=negative)
    else:
        stock.set_color_checker()
    return stock


def main() -> None:
    out_dir = Path(sys.argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    wanted = sys.argv[2:] or list(RECIPES)
    for lut_id in wanted:
        negative_name, print_name, overrides = RECIPES[lut_id]
        negative = film(negative_name)
        printing = film(print_name, negative) if print_name else None
        path = create_lut(negative, printing, lut_size=33, name=str(out_dir / lut_id), cube=True, **COMMON, **overrides)
        print(f"{lut_id}: {path}")


if __name__ == "__main__":
    main()
