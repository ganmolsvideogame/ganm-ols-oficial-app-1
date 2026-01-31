export type PackageDimensions = {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

type ListingPackageInput = {
  family?: string | null;
  package_weight_grams?: number | null;
  package_length_cm?: number | null;
  package_width_cm?: number | null;
  package_height_cm?: number | null;
};

const DEFAULT_PRESET: PackageDimensions = {
  weightGrams: 1200,
  lengthCm: 30,
  widthCm: 22,
  heightCm: 12,
};

const PRESETS_BY_FAMILY: Record<string, PackageDimensions> = {
  nintendo: { weightGrams: 1400, lengthCm: 33, widthCm: 24, heightCm: 12 },
  playstation: { weightGrams: 1800, lengthCm: 35, widthCm: 26, heightCm: 13 },
  xbox: { weightGrams: 2200, lengthCm: 38, widthCm: 28, heightCm: 14 },
  sega: { weightGrams: 1500, lengthCm: 33, widthCm: 24, heightCm: 12 },
  atari: { weightGrams: 1100, lengthCm: 28, widthCm: 20, heightCm: 10 },
  pc: { weightGrams: 2500, lengthCm: 40, widthCm: 30, heightCm: 20 },
  acessorios: { weightGrams: 500, lengthCm: 20, widthCm: 14, heightCm: 8 },
  perifericos: { weightGrams: 1300, lengthCm: 32, widthCm: 24, heightCm: 12 },
  "pecas-manutencao": { weightGrams: 900, lengthCm: 24, widthCm: 18, heightCm: 10 },
  mods: { weightGrams: 350, lengthCm: 16, widthCm: 12, heightCm: 6 },
};

function isValidPositive(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function resolvePackageDimensions(input: ListingPackageInput): PackageDimensions {
  const weight = isValidPositive(input.package_weight_grams)
    ? input.package_weight_grams
    : null;
  const length = isValidPositive(input.package_length_cm)
    ? input.package_length_cm
    : null;
  const width = isValidPositive(input.package_width_cm)
    ? input.package_width_cm
    : null;
  const height = isValidPositive(input.package_height_cm)
    ? input.package_height_cm
    : null;

  if (weight && length && width && height) {
    return {
      weightGrams: weight,
      lengthCm: length,
      widthCm: width,
      heightCm: height,
    };
  }

  if (input.family && PRESETS_BY_FAMILY[input.family]) {
    return PRESETS_BY_FAMILY[input.family];
  }

  return DEFAULT_PRESET;
}
