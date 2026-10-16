"""DEV UNIQUEMENT. Génère l'illustration des 36 cartes factices (dev-card-N) dans public/uploads/dev-cards/
et écrit prisma/dev/cards-art.sql (titres + images). Lancer : python3 -I prisma/dev/gen-card-art.py"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "uploads", "dev-cards")
os.makedirs(OUT, exist_ok=True)
BW, BH = 600, 840          # fond (ratio carte 2.5:3.5)
HS = 800                   # héros : carré, la carte l'affiche en object-cover

# nom, haut du ciel, bas du ciel, silhouettes (clair→sombre), particule
THEMES = [
    ("des Cavernes", (22, 24, 38), (70, 62, 90), [(58, 52, 78), (38, 34, 56), (20, 18, 32)], (180, 220, 255)),
    ("du Nether", (60, 8, 8), (255, 110, 30), [(150, 30, 20), (90, 16, 14), (40, 8, 8)], (255, 190, 80)),
    ("de l'End", (8, 4, 24), (70, 30, 120), [(190, 190, 140), (110, 100, 90), (30, 20, 40)], (230, 170, 255)),
    ("des Neiges", (110, 150, 210), (235, 245, 255), [(200, 220, 240), (150, 180, 215), (100, 130, 170)], (255, 255, 255)),
    ("du Désert", (250, 150, 70), (255, 224, 150), [(230, 170, 90), (190, 120, 60), (130, 80, 40)], (255, 240, 200)),
    ("de la Jungle", (20, 90, 60), (160, 220, 120), [(60, 140, 70), (30, 100, 50), (14, 60, 34)], (240, 255, 160)),
    ("des Abysses", (4, 20, 50), (20, 120, 160), [(16, 80, 110), (10, 50, 80), (6, 28, 52)], (160, 240, 255)),
    ("du Ciel", (70, 130, 235), (255, 210, 190), [(235, 240, 255), (200, 215, 245), (160, 180, 225)], (255, 255, 255)),
    ("du Volcan", (40, 12, 8), (230, 70, 20), [(110, 40, 24), (66, 26, 18), (30, 14, 12)], (255, 160, 60)),
    ("des Ruines", (60, 70, 90), (200, 190, 170), [(130, 125, 120), (90, 88, 90), (50, 50, 58)], (255, 235, 190)),
    ("de la Forêt", (24, 60, 50), (150, 200, 140), [(50, 110, 70), (28, 76, 50), (14, 44, 32)], (200, 255, 170)),
    ("des Glaces", (30, 60, 120), (170, 230, 250), [(140, 200, 230), (90, 150, 200), (50, 100, 160)], (230, 250, 255)),
]
ROLES = {  # rareté -> métiers (un par carte de la rareté)
    "COMMON": ["Mineur", "Bûcheron", "Fermier", "Pêcheur", "Forgeron", "Berger", "Cuisinier", "Porteur", "Apprenti", "Bâtisseur", "Villageois"],
    "UNCOMMON": ["Éclaireur", "Archer", "Voyageur", "Garde", "Marchand", "Chasseur de primes", "Sentinelle", "Pisteur"],
    "RARE": ["Chevalier", "Alchimiste", "Rôdeur", "Duelliste", "Ingénieur", "Templier", "Briseur"],
    "EPIC": ["Berserker", "Mage noir", "Paladin", "Assassin", "Archimage"],
    "LEGENDARY": ["Seigneur", "Titan", "Oracle", "Champion"],
    "MYTHIC": ["Dieu déchu", "Gardien éternel"],
}
RANGES = [("COMMON", 1, 10), ("UNCOMMON", 11, 18), ("RARE", 19, 25), ("EPIC", 26, 30), ("LEGENDARY", 31, 34), ("MYTHIC", 35, 36)]
# la 11e Commune du catalogue est la carte d'origine de l'utilisateur ; ici 10 Communes dev-card-1..10
OUTFITS = [((200, 60, 60), (60, 60, 80)), ((60, 120, 210), (50, 50, 60)), ((70, 160, 90), (90, 60, 40)), ((220, 170, 50), (70, 40, 90)),
           ((150, 80, 200), (40, 40, 50)), ((230, 120, 40), (60, 60, 70)), ((60, 190, 190), (40, 60, 90)), ((210, 210, 220), (80, 80, 100))]
SKINS = [(236, 190, 150), (200, 150, 110), (150, 100, 70), (250, 210, 180)]
HAIR = [(40, 28, 20), (110, 70, 30), (220, 190, 90), (30, 30, 36), (170, 60, 40), (230, 230, 240)]
ACCENT = {"COMMON": None, "UNCOMMON": (140, 200, 120), "RARE": (90, 160, 255), "EPIC": (190, 100, 255), "LEGENDARY": (255, 190, 50), "MYTHIC": (255, 70, 70)}


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def ridge(rng, base, amp, seed_off, w=BW):
    """Ligne de crête lissée (somme de sinus à phases aléatoires)."""
    ph = [rng.random() * 6.28 for _ in range(4)]
    fr = [0.006 + rng.random() * 0.006, 0.013 + rng.random() * 0.01, 0.03 + rng.random() * 0.02, 0.07]
    return [base + amp * (math.sin(x * fr[0] + ph[0]) * 0.5 + math.sin(x * fr[1] + ph[1]) * 0.3 + math.sin(x * fr[2] + ph[2]) * 0.15 + math.sin(x * fr[3] + ph[3]) * 0.05) for x in range(w)]


def background(n, rarity, rng):
    th = THEMES[(n - 1) % len(THEMES)]
    img = Image.new("RGB", (BW, BH))
    d = ImageDraw.Draw(img)
    for y in range(BH):
        d.line([(0, y), (BW, y)], fill=lerp(th[1], th[2], (y / BH) ** 1.4))
    img = img.convert("RGBA")
    # soleil / lune / portail
    glow = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy = rng.randint(160, 440), rng.randint(190, 330)
    for r, a in ((190, 30), (130, 55), (80, 100), (46, 255)):
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=lerp(th[2], (255, 255, 255), 0.55) + (a,))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(10)))
    # rayons pour les raretés hautes
    if rarity in ("EPIC", "LEGENDARY", "MYTHIC"):
        rays = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
        rd = ImageDraw.Draw(rays)
        col = ACCENT[rarity]
        k = {"EPIC": 10, "LEGENDARY": 14, "MYTHIC": 18}[rarity]
        a0 = rng.random() * 6.28
        for i in range(k):
            a = a0 + i * 6.283 / k
            w = 0.08 if rarity != "MYTHIC" else 0.1
            rd.polygon([(cx, cy), (cx + math.cos(a - w) * 1100, cy + math.sin(a - w) * 1100), (cx + math.cos(a + w) * 1100, cy + math.sin(a + w) * 1100)], fill=col + (38,))
        img = Image.alpha_composite(img, rays.filter(ImageFilter.GaussianBlur(3)))
    # silhouettes : 3 plans
    for layer, colr in enumerate(th[3]):
        sil = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sil)
        ys = ridge(rng, 520 + layer * 110, 90 - layer * 14, layer)
        sd.polygon([(0, BH)] + [(x, ys[x]) for x in range(BW)] + [(BW, BH)], fill=colr + (255,))
        # arbres / piliers / cristaux selon le plan, pour casser la ligne
        for _ in range(7 + layer * 3):
            x = rng.randint(0, BW - 1)
            y = int(ys[x])
            h = rng.randint(30, 70 + layer * 20)
            w = rng.randint(6, 14)
            sd.rectangle([x - w // 2, y - h, x + w // 2, y + 6], fill=colr + (255,))
            if (n + layer) % 3 == 0:
                sd.polygon([(x - w, y - h + 4), (x, y - h - w * 2), (x + w, y - h + 4)], fill=colr + (255,))
        img = Image.alpha_composite(img, sil)
    # particules du thème
    pl = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pl)
    for _ in range(60 + (40 if rarity in ("LEGENDARY", "MYTHIC") else 0)):
        x, y, r = rng.randint(0, BW), rng.randint(0, BH), rng.choice((1, 1, 2, 2, 3))
        pd.ellipse([x - r, y - r, x + r, y + r], fill=th[4] + (rng.randint(90, 230),))
    img = Image.alpha_composite(img, pl.filter(ImageFilter.GaussianBlur(0.6)))
    # vignette
    vg = Image.new("L", (BW, BH), 0)
    ImageDraw.Draw(vg).ellipse([-120, -80, BW + 120, BH + 80], fill=255)
    vg = vg.filter(ImageFilter.GaussianBlur(90))
    dark = Image.new("RGBA", (BW, BH), (0, 0, 0, 255))
    dark.putalpha(vg.point(lambda v: int((255 - v) * 0.75)))
    img = Image.alpha_composite(img, dark)
    return img.convert("RGB")


def hero(n, rarity, rng):
    """Personnage en pixel art (grille 16×32 agrandie), avec accessoires selon la rareté."""
    S = 22
    ox, oy = (HS - 16 * S) // 2, HS - 32 * S - 8
    outfit, pants = rng.choice(OUTFITS)
    skin, hair = rng.choice(SKINS), rng.choice(HAIR)
    acc = ACCENT[rarity]
    layers = Image.new("RGBA", (HS, HS), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layers)

    def px(gx, gy, gw, gh, col, speck=True):
        for yy in range(gy, gy + gh):
            for xx in range(gx, gx + gw):
                c = col
                if speck:
                    r = rng.random()
                    c = lerp(col, (0, 0, 0), 0.14) if r < 0.18 else lerp(col, (255, 255, 255), 0.12) if r > 0.86 else col
                    c = lerp(c, (0, 0, 0), 0.22 * (yy - gy) / max(gh, 1))  # ombre vers le bas
                ld.rectangle([ox + xx * S, oy + yy * S, ox + (xx + 1) * S - 1, oy + (yy + 1) * S - 1], fill=c + (255,))

    # ailes (derrière)
    if rarity in ("LEGENDARY", "MYTHIC"):
        wc = acc if rarity == "MYTHIC" else (255, 215, 100)
        for side in (-1, 1):
            for row in range(9):
                span = 9 - row // 2 + (3 if row < 3 else 0)
                x0 = 8 + side * 2 if side > 0 else 8 - 2 - span
                px(x0 if side > 0 else x0, 6 + row * 2 - (3 - min(row, 3)), span, 2, lerp(wc, (255, 255, 255), 0.15 * (row % 3)), True)
    # cape (derrière)
    if rarity in ("EPIC", "LEGENDARY", "MYTHIC"):
        px(3, 10, 10, 20, lerp(acc, (0, 0, 0), 0.45))
    # jambes, corps, bras
    px(4, 20, 4, 12, pants)
    px(8, 20, 4, 12, lerp(pants, (255, 255, 255), 0.08))
    px(4, 8, 8, 12, outfit)
    px(0, 8, 4, 12, lerp(outfit, (0, 0, 0), 0.12))
    px(12, 8, 4, 12, lerp(outfit, (0, 0, 0), 0.12))
    px(0, 18, 4, 2, skin)
    px(12, 18, 4, 2, skin)
    px(4, 18, 8, 2, lerp(outfit, (0, 0, 0), 0.4), False)  # ceinture
    if acc and rarity != "COMMON":
        px(4, 18, 8, 1, acc, False)
        px(7, 8, 2, 2, acc, False)  # col / gemme
    # tête
    px(4, 0, 8, 8, skin)
    px(4, 0, 8, 3, hair)
    px(4, 3, 1, 2, hair)
    px(11, 3, 1, 2, hair)
    px(5, 5, 2, 1, (255, 255, 255), False)
    px(9, 5, 2, 1, (255, 255, 255), False)
    px(6, 5, 1, 1, (40, 60, 120), False)
    px(9, 5, 1, 1, (40, 60, 120), False)
    px(6, 7, 4, 1, lerp(skin, (120, 40, 40), 0.5), False)
    # casque / couronne / halo
    if rarity == "RARE":
        px(4, 0, 8, 2, lerp(acc, (60, 60, 70), 0.5), False)
        px(5, 5, 6, 1, acc, False)
    if rarity in ("EPIC", "LEGENDARY", "MYTHIC"):
        gold = (255, 205, 60)
        px(4, -1, 8, 1, gold, False)
        for gx in (4, 7, 10):
            px(gx, -3, 2, 2, gold, False)
    if rarity == "MYTHIC":
        for t in range(0, 360, 6):
            a = math.radians(t)
            x, y = ox + 8 * S + math.cos(a) * 7 * S, oy - 2 * S + math.sin(a) * 1.4 * S
            ld.ellipse([x - 7, y - 7, x + 7, y + 7], fill=(255, 235, 150, 255))
    # arme
    if rarity != "COMMON" and n % 2 == 0:
        px(-2, 4, 1, 16, (190, 190, 205))
        px(-3, 18, 3, 1, (120, 80, 40), False)
    # contour sombre + ombre portée
    alpha = layers.split()[3]
    outline = alpha.filter(ImageFilter.MaxFilter(7)).point(lambda v: 255 if v else 0)
    sh = Image.new("RGBA", (HS, HS), (0, 0, 0, 0))
    sh.putalpha(outline.filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.55)))
    base = Image.new("RGBA", (HS, HS), (0, 0, 0, 0))
    ol = Image.new("RGBA", (HS, HS), (12, 10, 18, 255))
    ol.putalpha(outline)
    base = Image.alpha_composite(Image.alpha_composite(base, sh), ol)
    out = Image.alpha_composite(base, layers)
    if acc and rarity in ("EPIC", "LEGENDARY", "MYTHIC"):  # lueur de rareté autour du héros
        gl = Image.new("RGBA", (HS, HS), acc + (255,))
        gl.putalpha(alpha.filter(ImageFilter.GaussianBlur(26)).point(lambda v: int(v * 0.9)))
        out = Image.alpha_composite(gl, out)
    return out


def rarity_of(n):
    return next(r for r, a, b in RANGES if a <= n <= b)


sql = ["-- DEV UNIQUEMENT. Généré par prisma/dev/gen-card-art.py : noms + illustrations des cartes dev-card-N.", ""]
for n in range(1, 37):
    rng = random.Random(n * 7919)
    rarity = rarity_of(n)
    a = next(a for r, a, b in RANGES if r == rarity)
    th = THEMES[(n - 1) % len(THEMES)]
    title = f"{ROLES[rarity][(n - a) % len(ROLES[rarity])]} {th[0]}"

    hero(n, rarity, rng).save(os.path.join(OUT, f"hero-{n}.png"), optimize=True)
    sql.append(f"UPDATE \"TradingCard\" SET title = '{title.replace(chr(39), chr(39) * 2)}', \"customBackground\" = '/uploads/dev-cards/bg-{n}.jpg', \"imageUrl\" = '/uploads/dev-cards/hero-{n}.png', \"playerId\" = NULL WHERE id = 'dev-card-{n}';")
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "cards-art.sql"), "w").write("\n".join(sql) + "\n")
print("ok", len(os.listdir(OUT)), "fichiers")
