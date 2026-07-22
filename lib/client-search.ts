/** Fields used for client list search (name / phone / email / tags / memo). */
export type ClientSearchSource = {
  name: string;
  nameKana?: string;
  email?: string;
  phone?: string;
  memo?: string;
  tags?: string[];
};

function normalizeForSearch(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

/**
 * Precompute a lowercase haystack once per client so list filtering
 * stays O(tokens × haystack.includes) without rebuilding fields each keystroke.
 */
export function buildClientSearchText(source: ClientSearchSource): string {
  const phone = source.phone?.trim() ?? "";
  const phoneDigits = phone.replace(/\D/g, "");
  const tags = (source.tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(" ");

  return normalizeForSearch(
    [
      source.name,
      source.nameKana ?? "",
      source.email ?? "",
      phone,
      phoneDigits,
      tags,
      source.memo ?? "",
    ]
      .filter(Boolean)
      .join("\u0000"),
  );
}

export function normalizeClientSearchQuery(query: string): string {
  return normalizeForSearch(query).trim();
}

/** Real-time match: all whitespace-separated tokens must hit the haystack. */
export function matchesClientSearch(
  searchText: string,
  query: string,
): boolean {
  const normalized = normalizeClientSearchQuery(query);
  if (!normalized) return true;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  return tokens.every((token) => {
    if (searchText.includes(token)) return true;
    // Allow phone search with/without hyphens/spaces
    const digits = token.replace(/\D/g, "");
    return digits.length >= 3 && searchText.includes(digits);
  });
}
