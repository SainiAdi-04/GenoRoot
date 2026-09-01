import { describe, expect, it } from "bun:test";
import {
  BRAND_DICTIONARY,
  resolveBrandToProductCategory,
  resolveBrandMentions,
  ProductCategory,
} from "./brandResolver";

describe("Brand Resolver Seam", () => {
  describe("Exact and normalized brand lookup", () => {
    it("maps Topical Minoxidil brands correctly", () => {
      expect(resolveBrandToProductCategory("Tugain")).toBe("Topical Minoxidil");
      expect(resolveBrandToProductCategory("tugain 5%")).toBe("Topical Minoxidil");
      expect(resolveBrandToProductCategory("Mintop")).toBe("Topical Minoxidil");
      expect(resolveBrandToProductCategory("mintop 10% solution")).toBe("Topical Minoxidil");
      expect(resolveBrandToProductCategory("Morr-F")).toBe("Topical Minoxidil");
      expect(resolveBrandToProductCategory("Morr F 5%")).toBe("Topical Minoxidil");
      expect(resolveBrandToProductCategory("Imxia")).toBe("Topical Minoxidil");
      expect(resolveBrandToProductCategory("imxia plus")).toBe("Topical Minoxidil");
    });

    it("maps Supplements brands correctly", () => {
      expect(resolveBrandToProductCategory("Follihair")).toBe("Supplements");
      expect(resolveBrandToProductCategory("follihair new tablet")).toBe("Supplements");
      expect(resolveBrandToProductCategory("Keraglo")).toBe("Supplements");
      expect(resolveBrandToProductCategory("Keraglo Men")).toBe("Supplements");
      expect(resolveBrandToProductCategory("Keraglo Eva")).toBe("Supplements");
      expect(resolveBrandToProductCategory("Biotin supplements")).toBe("Supplements");
      expect(resolveBrandToProductCategory("biotin gummies")).toBe("Supplements");
    });

    it("maps OTC / Medicated Shampoos brands correctly", () => {
      expect(resolveBrandToProductCategory("Scalpe-Pro")).toBe("OTC/Medicated Shampoos");
      expect(resolveBrandToProductCategory("scalpe pro")).toBe("OTC/Medicated Shampoos");
      expect(resolveBrandToProductCategory("Scalpe+")).toBe("OTC/Medicated Shampoos");
      expect(resolveBrandToProductCategory("Selsun")).toBe("OTC/Medicated Shampoos");
      expect(resolveBrandToProductCategory("Selsun Daily")).toBe("OTC/Medicated Shampoos");
      expect(resolveBrandToProductCategory("Ketoconazole shampoo")).toBe("OTC/Medicated Shampoos");
      expect(resolveBrandToProductCategory("Nizoral")).toBe("OTC/Medicated Shampoos");
    });

    it("maps Hair Oils / Serums brands correctly", () => {
      expect(resolveBrandToProductCategory("Anaboom")).toBe("Hair Oils/Serums");
      expect(resolveBrandToProductCategory("anaboom anti-hair fall serum")).toBe("Hair Oils/Serums");
      expect(resolveBrandToProductCategory("Bontress")).toBe("Hair Oils/Serums");
      expect(resolveBrandToProductCategory("Bontress Pro")).toBe("Hair Oils/Serums");
      expect(resolveBrandToProductCategory("Redensyl serum")).toBe("Hair Oils/Serums");
      expect(resolveBrandToProductCategory("Procapil")).toBe("Hair Oils/Serums");
      expect(resolveBrandToProductCategory("hair growth serum")).toBe("Hair Oils/Serums");
      expect(resolveBrandToProductCategory("Kesh King oil")).toBe("Hair Oils/Serums");
    });

    it("maps Oral Minoxidil and oral Finasteride correctly", () => {
      expect(resolveBrandToProductCategory("Oral Minoxidil tablets")).toBe("Oral Minoxidil");
      expect(resolveBrandToProductCategory("Lonitab 2.5mg")).toBe("Oral Minoxidil");
      expect(resolveBrandToProductCategory("Finax")).toBe("Oral Minoxidil");
      expect(resolveBrandToProductCategory("Finax 1mg")).toBe("Oral Minoxidil");
      expect(resolveBrandToProductCategory("Finasteride")).toBe("Oral Minoxidil");
      expect(resolveBrandToProductCategory("Finpecia")).toBe("Oral Minoxidil");
    });

    it("returns null for unknown brands or general text", () => {
      expect(resolveBrandToProductCategory("Dove shampoo")).toBe(null);
      expect(resolveBrandToProductCategory("nothing special")).toBe(null);
      expect(resolveBrandToProductCategory("")).toBe(null);
    });
  });

  describe("Sentence and transcript extraction (resolveBrandMentions)", () => {
    it("extracts multiple brand categories from a Hinglish voice transcript", () => {
      const transcript =
        "Main pehle Tugain 5% use karta tha aur doctor ne Follihair tablets bhi di thi.";
      const categories = resolveBrandMentions(transcript);
      expect(categories).toContain("Topical Minoxidil");
      expect(categories).toContain("Supplements");
      expect(categories.length).toBe(2);
    });

    it("extracts shampoo and serum mentions from user description", () => {
      const transcript =
        "Scalpe-Pro lagaya dandruff ke liye aur Bontress serum bhi lagaya crown pe.";
      const categories = resolveBrandMentions(transcript);
      expect(categories).toContain("OTC/Medicated Shampoos");
      expect(categories).toContain("Hair Oils/Serums");
    });

    it("avoids duplicates if multiple brands of same category are mentioned", () => {
      const transcript = "Pehle Mintop lagaya, fir doctor ne Morr-F bola.";
      const categories = resolveBrandMentions(transcript);
      expect(categories).toEqual(["Topical Minoxidil"]);
    });

    it("returns empty array if no known brands are mentioned", () => {
      const transcript = "Normal water se wash karta hoon bas.";
      const categories = resolveBrandMentions(transcript);
      expect(categories).toEqual([]);
    });
  });

  describe("Brand dictionary completeness", () => {
    it("contains all brands specified in issue 05 spec", () => {
      const specBrands = [
        "Tugain",
        "Mintop",
        "Morr-F",
        "Imxia",
        "Follihair",
        "Keraglo",
        "Scalpe-Pro",
        "Selsun",
        "Ketoconazole",
        "Anaboom",
        "Bontress",
        "Finax",
        "Finasteride",
      ];

      for (const brand of specBrands) {
        expect(resolveBrandToProductCategory(brand)).not.toBe(null);
      }
    });
  });
});
