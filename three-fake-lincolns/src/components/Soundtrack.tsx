import { Audio } from "@remotion/media";
import React from "react";
import { interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import manifest from "../../public/sfx/manifest.json";
import { useTime } from "../time";
import { SFX, SILENCE, SUBTITLE_TICKS, type SfxEvent, type SfxName } from "../timeline";

type ManifestEntry = { readonly file: string; readonly durationSec: number; readonly peakOffsetFrames: number };
const MANIFEST = manifest as unknown as Record<string, ManifestEntry>;

// Mix: the score sits at about −1.6 dB. The synth peak-normalises it, and the twist chord is its
// peak, so this gain is set to keep the other bars where they were when the chord changes. Timeline
// gains are relative to the sound files plus the SFX bus offset, so a −26 dB pen lands a few dB
// under the score. The sub hit is kept low (−32): its energy is below what a phone plays, and on its
// own it would drive the master limiter and turn the audible part of the twist down.
// The finished render is mastered to −14 LUFS afterwards (see README).
const MUSIC_GAIN = 0.83;
const SFX_BUS_DB = 12;
const ROOM_TONE_DB = -40;
const dbToGain = (db: number) => 10 ** (db / 20);

// The score steps back (−4 dB) under the seal. Not under the twist: there the score's own chord
// is the audible part of the hit on a phone speaker.
const DUCKS = [240];
const DUCK_GAIN = dbToGain(-4);

// Paper and pen friction sit 6 dB under the other effects: they must stay below the score.
const FRICTION: readonly SfxName[] = ["pen", "paper_slide", "page_turn", "flip"];
const FRICTION_TRIM_DB = -6;

// Friction and slosh sounds start on the picture event (the stroke, the slide begins) and peak later;
// clicks and hits put their peak on the event.
const ONSET_ALIGNED: readonly SfxName[] = ["pen", "paper_slide", "page_turn", "flip", "liquid"];

// Sounds with pitch variants; the variant is picked from the frame so renders are deterministic.
const VARIANTS: Partial<Record<SfxName, number>> = { paper_tick: 5, typewriter: 5 };
const fileFor = (e: SfxEvent): ManifestEntry => {
  const n = VARIANTS[e.sound];
  const entry = MANIFEST[n ? `${e.sound}_${(e.at * 7 + Math.floor(e.at / 3)) % n}` : e.sound];
  if (!entry) {
    throw new Error(`No sound file for ${e.sound}`);
  }
  return entry;
};

const Music: React.FC = () => {
  const t = useTime();
  return (
    <Audio
      src={staticFile(MANIFEST._score.file)}
      volume={(f) => {
        let g = 1;
        for (const d of DUCKS) {
          const at = t(d);
          g = Math.min(g, interpolate(f, [at - 2, at, at + 8, at + 26], [1, DUCK_GAIN, DUCK_GAIN, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
        }
        return MUSIC_GAIN * g;
      }}
    />
  );
};

// One sound event: the file starts early by its measured peak offset, so the transient (not the
// file start) lands on the picture frame.
const SoundEvent: React.FC<{ readonly e: SfxEvent }> = ({ e }) => {
  const t = useTime();
  const { fps } = useVideoConfig();
  const entry = fileFor(e);
  const start = t(e.at) - (ONSET_ALIGNED.includes(e.sound) ? 0 : Math.round(entry.peakOffsetFrames));
  const length = Math.ceil(entry.durationSec * fps) + 2;
  return (
    <Sequence from={Math.max(0, start)} durationInFrames={length} name={e.sound} layout="none">
      <Audio src={staticFile(entry.file)} trimBefore={Math.max(0, -start)} volume={dbToGain(e.gainDb + SFX_BUS_DB + (FRICTION.includes(e.sound) ? FRICTION_TRIM_DB : 0))} />
    </Sequence>
  );
};

// The room stays under everything; in the half second before the twist it is the only thing left
// (the score and effects stop), so the silence is a room, not digital black.
const RoomTone: React.FC = () => {
  const t = useTime();
  return (
    <Audio
      src={staticFile(MANIFEST.room_tone.file)}
      volume={(f) =>
        dbToGain(ROOM_TONE_DB) *
        interpolate(f, [t(SILENCE.from) - 2, t(SILENCE.from), t(SILENCE.to) - 1, t(SILENCE.to)], [1, 0.8, 0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      }
    />
  );
};

export const Soundtrack: React.FC = () => (
  <>
    <Music />
    <RoomTone />
    {[...SFX, ...SUBTITLE_TICKS].map((e, i) => (
      <SoundEvent key={`${e.sound}-${e.at}-${i}`} e={e} />
    ))}
  </>
);
