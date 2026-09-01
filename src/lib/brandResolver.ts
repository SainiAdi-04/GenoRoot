import { PRODUCT_CATEGORIES } from "./engine";

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface BrandEntry {
  brand: string;
  category: ProductCategory;
  aliases: string[];
}

/**
 * Common Indian hair care brand dictionary mapping pharmacy and retail brands
 * to the 5 schema product categories in Question 12.
 */
export const BRAND_DICTIONARY: BrandEntry[] = [
  // 1. Topical Minoxidil
  {
    brand: "Tugain",
    category: "Topical Minoxidil",
    aliases: ["tugain", "tugain 2%", "tugain 5%", "tugain 10%", "tugain foam", "tugain solution", "cipla tugain"],
  },
  {
    brand: "Mintop",
    category: "Topical Minoxidil",
    aliases: ["mintop", "mintop 2%", "mintop 5%", "mintop 10%", "mintop solution", "mintop pro", "dr reddy mintop"],
  },
  {
    brand: "Morr-F",
    category: "Topical Minoxidil",
    aliases: ["morr-f", "morr f", "morr f 5%", "morr-f 5%", "morr-f 3%", "morr 5%", "morr", "morrf"],
  },
  {
    brand: "Imxia",
    category: "Topical Minoxidil",
    aliases: ["imxia", "imxia plus", "imxia 5%"],
  },
  {
    brand: "Minocheck",
    category: "Topical Minoxidil",
    aliases: ["minocheck", "minocheck 5%"],
  },
  {
    brand: "Hair4U",
    category: "Topical Minoxidil",
    aliases: ["hair4u", "hair 4u", "hair4u 5%", "hair4u 10%"],
  },

  // 2. Supplements
  {
    brand: "Follihair",
    category: "Supplements",
    aliases: ["follihair", "follihair new", "follihair tablet", "follihair tablets", "follihair a"],
  },
  {
    brand: "Keraglo",
    category: "Supplements",
    aliases: ["keraglo", "keraglo men", "keraglo eva", "keraglo tablet", "keraglo tablets"],
  },
  {
    brand: "Biotin",
    category: "Supplements",
    aliases: [
      "biotin",
      "biotin supplements",
      "biotin supplement",
      "biotin tablet",
      "biotin tablets",
      "biotin gummies",
      "biotin gummy",
    ],
  },
  {
    brand: "Perfectil",
    category: "Supplements",
    aliases: ["perfectil", "perfectil original", "perfectil plus"],
  },
  {
    brand: "Chicnutrix",
    category: "Supplements",
    aliases: ["chicnutrix", "chicnutrix bounce"],
  },

  // 3. OTC / Medicated Shampoos
  {
    brand: "Scalpe-Pro",
    category: "OTC/Medicated Shampoos",
    aliases: [
      "scalpe-pro",
      "scalpe pro",
      "scalpe+",
      "scalpe plus",
      "scalpe shampoo",
      "glenmark scalpe",
    ],
  },
  {
    brand: "Selsun",
    category: "OTC/Medicated Shampoos",
    aliases: [
      "selsun",
      "selsun blue",
      "selsun suspension",
      "selsun daily",
      "selsun daily shampoo",
    ],
  },
  {
    brand: "Ketoconazole",
    category: "OTC/Medicated Shampoos",
    aliases: [
      "ketoconazole",
      "ketoconazole shampoo",
      "ketomac",
      "keto shampoo",
      "danfree",
      "cipla 8x",
      "8x shampoo",
      "nizoral",
      "nizral",
    ],
  },

  // 4. Hair Oils / Serums
  {
    brand: "Anaboom",
    category: "Hair Oils/Serums",
    aliases: ["anaboom", "anaboom serum", "anaboom anti-hair fall serum", "anaboom ad"],
  },
  {
    brand: "Bontress",
    category: "Hair Oils/Serums",
    aliases: ["bontress", "bontress pro", "bontress hair serum", "bontress serum"],
  },
  {
    brand: "Redensyl",
    category: "Hair Oils/Serums",
    aliases: ["redensyl", "redensyl serum", "redensyl oil"],
  },
  {
    brand: "Procapil",
    category: "Hair Oils/Serums",
    aliases: ["procapil", "procapil serum"],
  },
  {
    brand: "Kesh King",
    category: "Hair Oils/Serums",
    aliases: ["kesh king", "kesh king oil", "keshking", "indulekha", "indulekha oil"],
  },
  {
    brand: "Hair Growth Serum",
    category: "Hair Oils/Serums",
    aliases: ["hair growth serum", "growth serum", "hair serum", "minimalist hair serum", "wishcare hair growth"],
  },

  // 5. Oral Minoxidil
  {
    brand: "Oral Minoxidil",
    category: "Oral Minoxidil",
    aliases: [
      "oral minoxidil",
      "oral minoxidil tablets",
      "oral minoxidil tablet",
      "lonitab",
      "lonitab 2.5",
      "lonitab 5",
      "lonitab 2.5mg",
    ],
  },
  {
    brand: "Finax",
    category: "Oral Minoxidil",
    aliases: ["finax", "finax 1mg", "finax tablet", "finpecia", "finalo"],
  },
  {
    brand: "Finasteride",
    category: "Oral Minoxidil",
    aliases: ["finasteride", "finasteride 1mg", "finasteride tablet", "oral finasteride", "propecia", "dutasteride", "duta"],
  },
];

/**
 * Normalizes input text for brand matching: removes punctuation, excess spaces, lowercase.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s%+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves a brand name or short user input to a schema product category.
 * Returns null if no match found.
 */
export function resolveBrandToProductCategory(input: string): ProductCategory | null {
  if (!input || !input.trim()) return null;

  const normalized = normalizeText(input);
  if (!normalized) return null;

  // Direct match on alias or brand
  for (const entry of BRAND_DICTIONARY) {
    if (normalizeText(entry.brand) === normalized) {
      return entry.category;
    }
    for (const alias of entry.aliases) {
      const normAlias = normalizeText(alias);
      if (normalized === normAlias) {
        return entry.category;
      }
      // If the input contains the alias as a word boundary match or whole phrase
      const pattern = new RegExp(`(^|\\s)${normAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "i");
      if (pattern.test(normalized)) {
        return entry.category;
      }
    }
  }

  return null;
}

/**
 * Scans a longer text or voice transcript and returns all matched product categories (de-duplicated).
 */
export function resolveBrandMentions(text: string): ProductCategory[] {
  if (!text || !text.trim()) return [];

  const normalized = normalizeText(text);
  const matchedCategories = new Set<ProductCategory>();

  for (const entry of BRAND_DICTIONARY) {
    for (const alias of entry.aliases) {
      const normAlias = normalizeText(alias);
      const pattern = new RegExp(`(^|\\s)${normAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "i");
      if (pattern.test(normalized)) {
        matchedCategories.add(entry.category);
        break;
      }
    }
  }

  return Array.from(matchedCategories);
}

/**
 * Helper to generate brand context for the LLM extraction and triage prompts.
 */
export function getBrandPromptContext(): string {
  return `Indian Hair Care Brand Resolver Mapping:
- Topical Minoxidil: Tugain, Mintop, Morr-F, Imxia, Minocheck, Hair4U (2%, 5%, 10% solution or foam)
- Supplements: Follihair, Keraglo, Keraglo Men, Keraglo Eva, Biotin supplements/gummies, Perfectil
- OTC/Medicated Shampoos: Scalpe-Pro, Scalpe+, Selsun, Ketoconazole shampoo, Nizoral, Cipla 8X
- Hair Oils/Serums: Anaboom, Bontress, Bontress Pro, Redensyl serum, Procapil, Kesh King, Indulekha, hair growth serums
- Oral Minoxidil: Oral Minoxidil tablets, Lonitab (2.5mg/5mg), Finax, Finasteride, Finpecia`;
}
