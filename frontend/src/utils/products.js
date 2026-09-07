export function createEmptyProductLine(id = 1) {
  return {
    id,
    urunKodu: "",
    adet: "1",
    envanterdeBekleyenAdet: "0",
    envanterdeMi: false,
    envanterAciklamasi: "",
  };
}

export function formatProductLines(lines) {
  return lines
    .filter((line) => line.urunKodu.trim())
    .map((line) => `${line.urunKodu.trim()} (x${line.adet})`)
    .join(", ");
}

export function mapProductLinesToUrunler(lines) {
  return lines
    .filter((line) => line.urunKodu.trim())
    .map((line) => ({
      urunKodu: line.urunKodu.trim(),
      adet: parseInt(line.adet, 10) || 1,
      envanterdeBekleyenAdet:
        Math.max(
          0,
          Math.min(
            parseInt(line.envanterdeBekleyenAdet, 10) || 0,
            parseInt(line.adet, 10) || 1,
          ),
        ) || 0,
      envanterdeMi: (parseInt(line.envanterdeBekleyenAdet, 10) || 0) > 0,
      envanterAciklamasi: (parseInt(line.envanterdeBekleyenAdet, 10) || 0) > 0
        ? (line.envanterAciklamasi || "").trim()
        : "",
    }));
}

export function formatUrunDisplay(urun) {
  return `${urun.urunKodu} (x${urun.adet})`;
}

export function validateProductLines(lines) {
  const filled = lines.filter((line) => line.urunKodu.trim());

  if (filled.length === 0) {
    return "En az bir ürün girilmelidir";
  }

  for (const line of filled) {
    const adet = parseInt(line.adet, 10);
    const envanterdeBekleyenAdet =
      parseInt(line.envanterdeBekleyenAdet, 10) || 0;

    if (isNaN(adet) || adet <= 0) {
      return "Her ürün için adet 1 veya daha büyük olmalıdır";
    }

    if (envanterdeBekleyenAdet < 0) {
      return "Envanterde bekletilecek adet negatif olamaz";
    }

    if (envanterdeBekleyenAdet > adet) {
      return "Envanterde bekletilecek adet, toplam adetten büyük olamaz";
    }

    if (envanterdeBekleyenAdet > 0 && !line.envanterAciklamasi?.trim()) {
      return "Envanterde bekleyecek ürünler için açıklama zorunludur";
    }
  }

  return null;
}
