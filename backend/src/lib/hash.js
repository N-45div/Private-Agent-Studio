import { keccak256, toUtf8Bytes } from "ethers";

function normalize(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = normalize(value[key]);
        return accumulator;
      }, {});
  }

  return value;
}

export function stableStringify(value) {
  return JSON.stringify(normalize(value));
}

export function keccakJson(value) {
  return keccak256(toUtf8Bytes(stableStringify(value)));
}

export function extractJsonObject(input) {
  if (typeof input !== "string") {
    throw new Error("Model response is not a string");
  }

  const firstBrace = input.indexOf("{");
  const lastBrace = input.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("Model response does not contain JSON");
  }

  return JSON.parse(input.slice(firstBrace, lastBrace + 1));
}
