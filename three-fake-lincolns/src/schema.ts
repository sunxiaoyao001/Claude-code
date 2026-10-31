import { z } from "zod";

export const mainSchema = z.object({
  // Change only this to cut a different length; every timing scales with it.
  durationSec: z.number().min(60).max(120),
  // Layouts are designed for 9:16; 16:9 is not built yet.
  aspect: z.enum(["9:16"]),
  watermark: z.string(),
  // Final renders turn on motion blur; drafts keep it off.
  motionBlur: z.boolean(),
});

export type MainProps = z.infer<typeof mainSchema>;
