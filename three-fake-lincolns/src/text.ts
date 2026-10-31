// Subtitle text helpers shared by the Subtitle component and the timeline (keyword stamp sounds).

export type Chunk = { readonly text: string; readonly keyword: boolean };

// "这张林肯像，身子是*借*的" -> word groups that rise one after another. Groups break after
// Chinese punctuation and around the keyword (marked with *...*).
export const splitGroups = (zh: string): Chunk[] => {
  const parts = zh.split(/(\*[^*]+\*)/).filter(Boolean);
  const chunks: Chunk[] = [];
  for (const part of parts) {
    if (part.startsWith("*")) {
      chunks.push({ text: part.slice(1, -1), keyword: true });
      continue;
    }
    for (const piece of part.split(/(?<=[，：；、])/)) {
      if (piece) chunks.push({ text: piece, keyword: false });
    }
  }
  return chunks;
};

