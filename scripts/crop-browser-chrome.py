"""
crop-browser-chrome.py
Recorta la barra de direcciones + la barra de marcadores/extensiones de una
captura de pantalla de escritorio (tomada a mano por el usuario, con el
navegador real visible), dejando solo el contenido de la app. Se usó para
public/landing/screenshots/showcase-cola-desktop.png (sección "producto" de
la landing, panel Cola del día de Karina Menú).

Uso:
    python scripts/crop-browser-chrome.py <entrada.png> <salida.png> [--top N]

--top: píxeles a recortar desde arriba (default 98, calibrado para Chrome en
Windows con la barra de marcadores visible — revisar con un recorte de
prueba si cambia el navegador o el zoom del SO).
"""
import sys
import argparse
from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('entrada')
    ap.add_argument('salida')
    ap.add_argument('--top', type=int, default=98)
    args = ap.parse_args()

    im = Image.open(args.entrada)
    w, h = im.size
    if args.top >= h:
        sys.exit(f'--top ({args.top}) es mayor que el alto de la imagen ({h})')
    im.crop((0, args.top, w, h)).save(args.salida)
    print(f'OK -> {args.salida} ({w}x{h - args.top})')


if __name__ == '__main__':
    main()
