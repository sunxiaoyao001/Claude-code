import { AbsoluteFill, Sequence } from "remotion";
import "../fonts";
import { PhotoPrint } from "../components/PhotoPrint";
import { InkFilter, ManilaTag, MonoText, PenMark, Seal } from "../components/Props";
import { ArchiveProgress, ArchiveTag, SourceCaption, Watermark } from "../components/SeriesChrome";
import { Subtitle } from "../components/Subtitle";
import { COLORS, FONTS } from "../theme";

// Dev-only layout check of the reusable components on a synthetic test print. Not part of the film.
export const DevComponents = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.darkPaper }}>
    <InkFilter />
    <PhotoPrint src="dev/test_print.png" imgW={1600} imgH={2400} width={560} left={140} top={260} tilt={-0.8}>
      <PenMark kind="circle" left={150} top={480} width={260} height={140} from={0} durationInFrames={10} />
    </PhotoPrint>
    <SourceCaption text="LIBRARY OF CONGRESS · CA. 1865" left={156} top={1150} />
    <ManilaTag left={640} top={420} height={84} tilt={2}>
      <span style={{ fontFamily: FONTS.serifZh, fontWeight: 900, fontSize: 56 }}>B 一位副总统</span>
    </ManilaTag>
    <ManilaTag left={640} top={540} height={64} tilt={-1}>
      <MonoText size={24}>No.003 ?</MonoText>
    </ManilaTag>
    <Seal text="假" left={800} top={700} size={120} at={0} />
    <Watermark handle="@Faulx.Elys" />
    <ArchiveTag entries={[{ from: 0, text: "ARCHIVE No.001 · CA. 1865 · NEW YORK" }]} />
    <ArchiveProgress bounds={[0, 672, 1776, 2688]} labels={["No.001", "No.002", "No.003"]} barFrames={96} rewind={[2628, 2640]} />
    <Sequence durationInFrames={96}>
      <Subtitle zh="这张林肯像，身子是*借*的" en="This Lincoln's body is borrowed" durationInFrames={96} isStatic />
    </Sequence>
  </AbsoluteFill>
);
