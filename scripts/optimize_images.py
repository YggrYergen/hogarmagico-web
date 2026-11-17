#!/usr/bin/env python3
"""
optimize_images.py - genera variantes WebP responsive de las fotos originales.

Local y sin red: solo usa la biblioteca estandar + Pillow.

Que hace
--------
Recorre ``images/`` (recursivo) y, por cada foto original (.jpg/.jpeg/.png/
.tif/.tiff/.bmp), escribe EN LA MISMA CARPETA tres WebP:

    <stem>-480.webp
    <stem>-960.webp
    <stem>-<min(1920, ancho)>.webp

* El ancho es el de la imagen ORIENTADA segun EXIF (exif_transpose).
* Nunca se hace upscale: un nivel solo se genera si es menor que el ancho
  original; el nivel final siempre es min(1920, ancho). Si la fuente es mas
  estrecha que 960 (o 480) los niveles colapsan sin duplicar archivos.
* Calidad (WebP con perdida, method=6): 480 -> 80, 960 -> 82, tope -> 84.
* Color: si la fuente trae un perfil ICC distinto de sRGB (p. ej. Adobe RGB,
  Display P3, CMYK) se convierte a sRGB antes de reducir/codificar, para que
  no cambie el tono ni se oscurezca al quitar el perfil. Luego no se embebe
  perfil (el navegador asume sRGB).
* Se elimina TODA la metadata (EXIF/GPS, XMP, ICC, comentarios).
* Los originales y cualquier otro archivo NO se modifican ni se borran.

Que se excluye
--------------
* Derivados antiguos ``*_small`` / ``*_medium`` / ``*_large`` (no son fuentes).
* QR (``qr*``), capturas/documentacion (``screenshot``, ``captura``,
  ``docs``...), y los propios ``.webp`` (son salidas).
* Salidas colisionadas: si dos fuentes de una carpeta producen el mismo nombre
  (p. ej. ``a.jpg`` y ``a.png``), solo se procesa una (la de mayor area, y por
  nombre en empate) y la otra se informa como COLISION; no se sobrescribe.
* Solo se escanea ``images/`` (no ``guias/``, ``work/``, ``tests/``...).

Uso (desde la raiz del repo, D:\\WebDev\\hogarmagico-B)
-------------------------------------------------------
    python -m pip install Pillow            # una sola vez, si hace falta
    python scripts/optimize_images.py       # genera lo que falte / este viejo
    python scripts/optimize_images.py --force            # regenera todo
    python scripts/optimize_images.py --dry-run          # solo lista el plan
    python scripts/optimize_images.py --only home-gallery  # filtra por subcadena
    python scripts/optimize_images.py --check            # verifica salidas, no escribe

Codigos de salida: 0 ok, 1 hubo errores o (con --check) faltan salidas, 2 uso.
Es idempotente: sin --force omite salidas que ya son mas nuevas que la fuente.
"""
from __future__ import annotations

import argparse
import io
import os
import re
import sys
import tempfile
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover
    sys.stderr.write("Falta Pillow. Instala con: python -m pip install Pillow\n")
    raise SystemExit(2)

try:
    from PIL import ImageCms  # puede faltar si Pillow se compilo sin lcms
except Exception:  # pragma: no cover
    ImageCms = None

Image.MAX_IMAGE_PIXELS = 250_000_000  # fotos de ~7000 px de ancho son legitimas

# Compatibilidad con Pillow < 9.1 (constantes antiguas)
LANCZOS = getattr(getattr(Image, "Resampling", Image), "LANCZOS")
if ImageCms is not None:
    _INTENT = getattr(ImageCms, "Intent", None)
    INTENT_PERCEPTUAL = _INTENT.PERCEPTUAL if _INTENT is not None else ImageCms.INTENT_PERCEPTUAL
else:
    INTENT_PERCEPTUAL = 0

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE_DIR = "images"

SOURCE_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp"}
TARGET_WIDTHS = (480, 960, 1920)
# calidad por nivel (rango pedido 80-84)
QUALITY_BY_TARGET = {480: 80, 960: 82, 1920: 84}
WEBP_METHOD = 6

DERIVATIVE_RE = re.compile(r"_(small|medium|large|thumb)$", re.I)
EXCLUDED_NAME_RE = re.compile(r"(^qr([-_ .]|$)|[-_ ]qr([-_ .]|$)|screenshot|captura|screen[-_ ]?shot|docs?[-_]|doc$)", re.I)
EXCLUDED_DIRS = {"docs", "doc", "documentacion", "screenshots", "capturas", "node_modules", ".git", "work", "tests", "guias"}


def log(msg: str) -> None:
    print(msg, flush=True)


def is_excluded(path: Path, source_root: Path) -> str | None:
    """Devuelve el motivo de exclusion o None si es una fuente valida."""
    rel_parts = path.relative_to(source_root).parts
    for part in rel_parts[:-1]:
        if part.lower() in EXCLUDED_DIRS:
            return "carpeta excluida"
    stem = path.stem
    if DERIVATIVE_RE.search(stem):
        return "derivado antiguo (_small/_medium)"
    if EXCLUDED_NAME_RE.search(stem):
        return "QR/captura/documentacion"
    return None


def output_widths(width: int) -> list[int]:
    """Anchos de salida sin upscale y sin duplicados: {480, 960, min(1920, W)} < W, + W tope."""
    top = min(1920, width)
    levels = {w for w in (480, 960) if w < top}
    levels.add(top)
    return sorted(levels)


def quality_for(level: int, top: int) -> int:
    if level == top:
        return QUALITY_BY_TARGET[1920]
    return QUALITY_BY_TARGET.get(level, 82)


def out_path(src: Path, width: int) -> Path:
    return src.with_name(f"{src.stem}-{width}.webp")


def is_srgb_profile(profile) -> bool:
    try:
        desc = ImageCms.getProfileDescription(profile) or ""
        return "srgb" in desc.lower()
    except Exception:
        return False


def load_oriented_srgb(src: Path):
    """Abre, aplica orientacion EXIF y normaliza a sRGB (sin metadata). Devuelve (imagen, avisos)."""
    warnings: list[str] = []
    with Image.open(src) as im:
        im.load()
        icc = im.info.get("icc_profile")
        im = ImageOps.exif_transpose(im)  # copia ya orientada (o la misma si no hay EXIF)

        has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)

        if icc and ImageCms is not None and im.mode in ("RGB", "RGBA", "L", "LA", "CMYK", "P"):
            try:
                src_profile = ImageCms.ImageCmsProfile(io.BytesIO(icc))
                if not is_srgb_profile(src_profile):
                    base = im.convert("RGBA") if has_alpha else im
                    if base.mode in ("L", "P"):
                        base = base.convert("RGB")
                    srgb = ImageCms.createProfile("sRGB")
                    out_mode = "RGBA" if base.mode == "RGBA" else "RGB"
                    # ImageCms no admite RGBA en todas las versiones: separar alfa
                    if base.mode == "RGBA":
                        alpha = base.getchannel("A")
                        rgb = ImageCms.profileToProfile(
                            base.convert("RGB"), src_profile, srgb,
                            renderingIntent=INTENT_PERCEPTUAL, outputMode="RGB")
                        rgb.putalpha(alpha)
                        im = rgb
                    else:
                        im = ImageCms.profileToProfile(
                            base, src_profile, srgb,
                            renderingIntent=INTENT_PERCEPTUAL, outputMode=out_mode)
                    warnings.append("perfil ICC no-sRGB convertido a sRGB")
            except Exception as exc:  # noqa: BLE001
                warnings.append(f"no se pudo convertir ICC ({exc}); se continua sin conversion")

        if im.mode == "CMYK":
            im = im.convert("RGB")
            warnings.append("CMYK sin perfil: conversion ingenua a RGB")
        elif im.mode in ("I;16", "I", "F"):
            im = im.point(lambda v: v / 256).convert("L").convert("RGB")
        elif has_alpha:
            im = im.convert("RGBA")
        else:
            im = im.convert("RGB")

        im.info = {}  # fuera EXIF/ICC/XMP/comentarios
        return im, warnings, has_alpha


def resize_to(im: Image.Image, width: int) -> Image.Image:
    if width == im.width:
        return im.copy()
    height = max(1, round(im.height * width / im.width))
    out = im.resize((width, height), LANCZOS, reducing_gap=3.0)
    out.info = {}
    return out


def save_webp(im: Image.Image, dest: Path, quality: int, has_alpha: bool) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=dest.stem + ".", suffix=".tmp", dir=str(dest.parent))
    os.close(fd)
    tmp = Path(tmp_name)
    try:
        params = dict(format="WEBP", quality=quality, method=WEBP_METHOD,
                      exif=b"", xmp=b"")  # sin ICC: im.info esta vacio y la imagen ya es sRGB
        if has_alpha:
            params["alpha_quality"] = 100
        im.save(tmp, **params)
        os.replace(tmp, dest)  # atomico: nunca deja un .webp a medias
    finally:
        if tmp.exists():
            tmp.unlink()


def needs_work(src: Path, outputs: list[Path], force: bool) -> bool:
    if force:
        return True
    src_mtime = src.stat().st_mtime
    for o in outputs:
        if not o.exists() or o.stat().st_size == 0 or o.stat().st_mtime < src_mtime:
            return True
    return False


def probe_size(path: Path):
    """Ancho/alto orientados sin decodificar toda la imagen."""
    with Image.open(path) as im:
        w, h = im.size
        try:
            orientation = im.getexif().get(0x0112, 1)
        except Exception:
            orientation = 1
        if orientation in (5, 6, 7, 8):
            w, h = h, w
        return w, h


def discover_sources(source_root: Path, only: str | None):
    sources, skipped = [], []
    for path in sorted(source_root.rglob("*")):
        if not path.is_file():
            continue
        ext = path.suffix.lower()
        if ext == ".webp":
            continue  # salidas, no fuentes
        if ext not in SOURCE_EXTS:
            continue
        if only and only.lower() not in path.as_posix().lower():
            continue
        reason = is_excluded(path, source_root)
        if reason:
            skipped.append((path, reason))
        else:
            sources.append(path)
    return sources, skipped


def resolve_collisions(sources: list[Path]):
    """Dos fuentes con el mismo (carpeta, stem) producirian las mismas URLs: se queda una."""
    groups: dict[tuple, list[Path]] = {}
    for p in sources:
        groups.setdefault((p.parent, p.stem.lower()), []).append(p)
    kept, collided = [], []
    for group in groups.values():
        if len(group) == 1:
            kept.append(group[0])
            continue
        def area(p: Path) -> int:
            try:
                w, h = probe_size(p)
                return w * h
            except Exception:
                return 0
        ranked = sorted(group, key=lambda p: (-area(p), p.name))
        kept.append(ranked[0])
        collided.extend((p, ranked[0]) for p in ranked[1:])
    return sorted(kept), collided


def human(n: int) -> str:
    return f"{n / 1024:.0f} KB" if n < 1024 * 1024 else f"{n / 1024 / 1024:.2f} MB"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Genera WebP 480/960/<=1920 junto a cada foto original.")
    ap.add_argument("--root", default=str(REPO_ROOT), help="raiz del proyecto (por defecto: la del repo)")
    ap.add_argument("--source-dir", default=DEFAULT_SOURCE_DIR, help="carpeta a escanear dentro de la raiz (images)")
    ap.add_argument("--force", action="store_true", help="regenerar aunque la salida exista y sea mas nueva")
    ap.add_argument("--dry-run", action="store_true", help="solo mostrar el plan, no escribir")
    ap.add_argument("--check", action="store_true", help="solo verificar que existan las salidas (exit 1 si faltan)")
    ap.add_argument("--only", help="procesar solo rutas que contengan esta subcadena")
    args = ap.parse_args(argv)

    root = Path(args.root).resolve()
    source_root = (root / args.source_dir).resolve()
    if not source_root.is_dir():
        sys.stderr.write(f"No existe la carpeta de fuentes: {source_root}\n")
        return 2

    sources, skipped = discover_sources(source_root, args.only)
    sources, collided = resolve_collisions(sources)

    log(f"Fuentes: {len(sources)} | excluidas: {len(skipped)} | colisiones: {len(collided)}")
    for path, reason in skipped:
        log(f"  [excluida] {path.relative_to(root).as_posix()} ({reason})")
    for dup, winner in collided:
        log(f"  [COLISION] {dup.relative_to(root).as_posix()} omitida; se usa {winner.relative_to(root).as_posix()}")

    errors = 0
    missing = 0
    done = skipped_up_to_date = 0
    total_src = total_out = 0

    for src in sources:
        rel = src.relative_to(root).as_posix()
        try:
            width, height = probe_size(src)
        except Exception as exc:  # noqa: BLE001
            log(f"  [ERROR] {rel}: no se pudo leer ({exc})")
            errors += 1
            continue

        widths = output_widths(width)
        outputs = [out_path(src, w) for w in widths]
        plan = ", ".join(f"{w}" for w in widths)
        if len(widths) < 3:
            log(f"  [aviso] {rel}: {width}px de ancho -> solo {len(widths)} nivel(es) ({plan}); no se hace upscale")

        if args.check:
            gone = [o.name for o in outputs if not o.exists() or o.stat().st_size == 0]
            if gone:
                missing += len(gone)
                log(f"  [FALTA] {rel}: {', '.join(gone)}")
            continue

        if not needs_work(src, outputs, args.force):
            skipped_up_to_date += 1
            log(f"  [ok]    {rel} ({width}x{height}) al dia -> {plan}")
            continue

        if args.dry_run:
            log(f"  [plan]  {rel} ({width}x{height}) -> {plan}")
            continue

        try:
            base, warns, has_alpha = load_oriented_srgb(src)
            top = widths[-1]
            sizes = []
            for w, dest in zip(widths, outputs):
                variant = resize_to(base, w) if w != base.width else base
                save_webp(variant, dest, quality_for(w, top), has_alpha)
                sizes.append(dest.stat().st_size)
            total_src += src.stat().st_size
            total_out += sum(sizes)
            done += 1
            log(f"  [hecho] {rel} ({base.width}x{base.height}) -> "
                + ", ".join(f"{w}w={human(s)}" for w, s in zip(widths, sizes)))
            for w_ in warns:
                log(f"          aviso: {w_}")
        except Exception as exc:  # noqa: BLE001
            errors += 1
            log(f"  [ERROR] {rel}: {exc}")

    if args.check:
        log(f"Comprobacion: {missing} salida(s) faltante(s).")
        return 1 if (missing or errors) else 0

    log(f"Resumen: {done} procesadas, {skipped_up_to_date} al dia, {errors} con error.")
    if done:
        log(f"Peso: fuentes procesadas {human(total_src)} -> WebP (3 niveles sumados) {human(total_out)}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
