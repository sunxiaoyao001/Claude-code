"""Single editable source for the script draft; writes research/script.md.

Frames are at 30 fps. BPM 75 -> beat 24 f, bar 96 f, eighth 12 f, sixteenth 6 f, eighth triplet 8 f.
"""
import re
import sys

FPS = 30
BPM = 75
BEAT = FPS * 60 // BPM  # 24
BAR = BEAT * 4  # 96
BARS = 28
TOTAL = BAR * BARS  # 2688

# Subtitle legibility: text is readable 6 f into the 12 f entrance and stops being readable when
# the 7 f exit starts. Rows marked "static" (cover, loop return) have no entrance animation.
ENTER_UNREADABLE = 6
EXIT = 7

# (start, end, zh, en, visual, images, motion, sfx, facts, cut, static)
#   cut: this row starts a new shot (must land on a beat, 24 f; most land on a half-bar)
#   static: subtitle is already in place (frame 0 cover and the loop return)
LINES = [
    # P1 · bars 1-3 · cover, bet, title
    (0, 96, "林肯的头，*借*来的身子", "Lincoln's head, a borrowed body",
     "【封面】两张带白边的相纸并排、只重叠 1 栏：林肯合成像在第 1–6 栏，1852 卡尔霍恩原版画在第 6–11 栏（右缘 x ≤ 923），上下错开 5%，两具身体从肩到脚完整可比；卡尔霍恩的头被一张米色档案签盖住，签上朱砂 Plex Mono「?」，从第 0 帧起轻轻摆动。3 帧起朱砂 Underline 横穿林肯脖颈画出「接缝」，两侧各伸出半个颈宽（12 f）。封面字幕 72 px。出处签 LIBRARY OF CONGRESS · CA. 1865 / 1852",
     "IMG01, IMG02", "镜头呼吸（漂移 ±6 px + 推拉 ≤1.5%）；「?」签轻摆；第 0 帧字幕已在位", "房间底噪；红笔划纸声 @3", "F01, F02", True, True),
    (96, 192, "猜猜，跟*谁*借的", "Guess whose body it is",
     "两张相纸上移并缩小到 y 10%–45%；两张档案签落在 y 44%–54%：「A 一位废奴派」@108、「B 一位蓄奴派」@120（对称、不剧透，选项字 56 px）；144 / 160 / 176 帧倒计时 03 · 02 · 01，朱砂 Plex Mono 128 px 立在两张签右侧（四分三连音，16 f 一跳，共 1.6 秒）", "IMG01, IMG02",
     "相纸 spring 上移缩小；档案签落位缓动（末帧仍在移动、当帧停住，落点即音效帧）", "档案签落纸声 ×2；倒计时打字机 ×3", "F05, F22", True, False),
    (192, 288, "", "",
     "标题卡不卸悬念：上半屏两张相纸和「?」签保持可见，A / B 签也留在原位；「林肯的 / 3 张假像」两行（Serif 900 128 px）在下半屏按词组遮罩上升；240 帧（第 3 拍）朱砂方印盖下；英文 THREE FAKE LINCOLNS 用 Plex 24 px；档案签 ARCHIVE No.001 · CA. 1865 · NEW YORK", "",
     "标题上升 12 f；印章 6 f 压入 + 10 f 墨晕；288 帧标题纸被抽走（盖下即切）", "纸张点击 @192；印章声 @240", "F01", True, False),
    # P2 · bars 4-7 · fake No.1: the borrowed body
    (288, 384, "答案是 B：*卡尔霍恩*", "It's B: John C. Calhoun",
     "盖头的档案签被抽走，露出卡尔霍恩的脸；两张相纸滑动对位（330 到位）；330–384 闪烁比对：配准好的两张版画按八分音符来回硬切 4 次（342 / 354 / 366 / 378），身体纹丝不动，只有头在跳（小屏也看得出）；378 起停在卡尔霍恩，接下一镜；378 比对停下后才落档案签 JOHN C. CALHOUN / VICE PRESIDENT · 1825–1832（36 px，绝不挂在林肯脸下）", "IMG01, IMG02",
     "抽签 bezier 18 f；对位 spring 24 f；闪烁硬切 ×4（12 f 一次），落在第 4 小节（全片第一个高潮，钢琴进入）", "纸张摩擦 @288 / 330；比对器咔嗒 ×4 @342 / 354 / 366 / 378", "F02, F05, F21, F24", True, False),
    (384, 480, "他说奴隶制不是恶，是*善*", "He said slavery wasn't an evil, but a good",
     "卡尔霍恩相纸单独一张（不推近：已在 1.5× 分辨率上限）；432 档案签两行 SENATE · 1837 / “A POSITIVE GOOD”（36 px，手机上可读）", "IMG02",
     "镜头呼吸；432 档案签落下（拍内事件）", "档案签落纸声 @432", "F04, F06", True, False),
    (480, 576, "*解放者*的头，蓄奴派的身子", "The Emancipator's head on a pro-slavery body",
     "两张相纸重新并排，朱砂 Circle 分别圈住两张脸（480 / 504）；旁注用朱砂铅笔批注样式（不用档案签，免得被误读成版画年代）：左 EMANCIPATION PROCLAMATION · 1863，右 “A POSITIVE GOOD” · 1837（都用 36 px，手机上可读）", "IMG01, IMG02",
     "两个 Circle 先后落在 480 / 504", "红笔划纸声 ×2", "F05, F23", True, False),
    (576, 672, "连桌上的*文件*都改了", "Even the papers on the desk were rewritten",
     "两张版画叠合后的差异图：除了头和桌上的文件，其余全部重合（由两张原图配准计算，标「差异图」）；朱砂 Box 先框头、再框文件（落在 576 / 600）", "IMG02, IMG01",
     "差异区按八分音符依次亮起；Box progress 20 f", "红笔划纸声 ×2", "F03, F24", True, False),
    # P3 · bars 8-11 · fake No.2: the widow's ghost
    (672, 744, "这只是第 *1* 张", "That was only the first",
     "Mumler 的灵异名片照（CDV）依次滑入桌面；出处签 W. H. MUMLER · SPIRIT PHOTOGRAPHS · 1860S–70S；档案签 ARCHIVE No.002 · CA. 1872 · BOSTON", "IMG08",
     "名片照落在八分音符（684 / 696 / 708 / 720，落位缓动当帧停住）；732 档案章盖下", "名片照落纸声 ×4 @684 / 696 / 708 / 720；印章 @732", "F08, F09, F25", True, False),
    (744, 840, "第 2 张，主角是林肯的*遗孀*", "The second stars Lincoln's widow",
     "744 起抽出其中一张；768（半小节）推进切入白色搪瓷显影盘（缺瓷、倒液口、深色药液和移动的反光）：相纸入液时暗部已经浮现，没有空白纸段；盘上方小标「显影过程为示意」只挂在显影进行时（768–1044），显影完成后撤掉——显好的是真实照片", "IMG03",
     "抽出 → 推进 match cut 20 f", "相纸滑动；相纸入液 @768", "F07", False, False),
    (840, 936, "她报*假名*，摄影师说没认出", "She gave a false name; he said he didn't know her",
     "显影：最深的影调先浮现——黑裙、椅子、她的脸", "IMG03",
     "连续调显影：gamma 从约 10 回落到 1，暗部先出、中灰其次、最淡的灰最后，不截断任何影调", "配乐", "F09", False, False),
    (936, 1056, "一双手，搭在她*肩*上", "A pair of hands on her shoulders",
     "显影后段：中灰调浮现；1008 起朱砂短划两道，依次标出搭在她肩上的两只手（1008 / 1020，手的灰调已经显出来）", "IMG03",
     "显影曲线第二段；短划各 10 f（起笔即见墨）", "红笔短划 ×2 @1008 / 1020", "F07", False, False),
    # P4 · bars 12-15 · the ghost, then the mechanism
    (1056, 1200, "她身后，站着「*林肯*」", "Behind her stands \"Lincoln\"",
     "【第 12 小节重拍，乐句第一拍】最淡的灰调最后浮现：她身后的「林肯」；朱砂 Circle 圈住鬼影（标注层在相纸遮罩之外，整圈可见）；1152 相纸被夹出显影盘、平放到桌上（拍内事件，接下一镜）", "IMG03",
     "显影 1032 完成；Circle progress 24 f；1152 夹出 24 f", "低频 swell 收束；红笔划纸声 @1056；夹出时滴回盘里 @1158", "F07, F11", False, False),
    (1200, 1296, "摄影师曾被控诈骗，法官*放*人", "Tried for fraud, the photographer walked free",
     "一张空白卷宗卡（不盖在任何照片上，避免给照片标年份）：印好的抬头 W. H. MUMLER · FRAUD TRIAL，打字机打出 NEW YORK · 1869", "",
     "日期逐字打出，每字 2 f（1206 起）", "打字机 ×12（空格无声）", "F10", True, False),
    (1296, 1392, "怎么做的，至今说*不清*", "How he did it is still unclear",
     "1280 卷宗卡被抽走归档（从左侧出画：名片照不落在卷宗上，它们不是庭审证物，其中一张晚于庭审）；Mumler 的 3 张灵异名片照发成一排（1296 / 1300 / 1304），朱砂 Circle 依次圈住每张里的鬼影（1308 / 1320 / 1332，八分音符）", "IMG08",
     "卷宗卡抽走 14 f；名片照落位缓动 10 f；Circle 每张 12 f", "卷宗卡 @1280；名片照落纸声 ×3；红笔划纸声 ×3", "F11, F25", False, False),
    (1392, 1488, "鬼影的常见造法：*双重曝光*", "The usual trick for ghosts: double exposure",
     "示意：看片灯桌（暗纸底色上一块相纸白平面光，不用 glow）上一只装好底片的片匣，相纸宽 600 px（The Met 原图 2886 px）；1400 遮光板抽出；1416 第一声快门，无名人像的潜影显出；右下角固定标「示意」", "IMG14",
     "片匣 spring 推入 12 f；遮光板 14 f 抽出；潜影 18 f", "片匣摩擦 @1392；遮光板 @1400；快门 @1416", "F11", True, False),
    (1488, 1584, "底片不换，再曝光 *1* 次", "Same plate, exposed a second time",
     "示意（同一镜头延续）：片匣里还是那块底片，1488 第二声快门，同一人的影像向左上偏移、变淡、只留人形，像站在自己身后的「鬼影」；只演示「一块底片曝两次光就会叠出半透明人影」，不暗示 Mumler 的具体做法；「示意」角标；出处签 THE MET 287722 · CC0 · SITTER UNRELATED", "IMG14",
     "第二层潜影 14 f", "快门 @1488（落在拍点）", "F11", False, False),
    # P5 · bars 16-20 · Grant composite, the question, silence
    (1584, 1680, "另一种造假：*拼*起来的照片", "Another kind of fake: a composite",
     "LoC 的三件原件依次从上方落在拍上（1584 / 1608 / 1632）：格兰特在冷港、麦库克少将骑马（LC-B817-7204）、费希尔山的南军战俘；1656 快门一响，合成像在下方原位曝光显出（12 f 显影，不推入；原件上手写 Composite photo）；档案签 EXHIBIT · CA. 1902 · L.C. HANDY", "IMG10, IMG11, IMG12, IMG04",
     "原件落下 10 f（落位缓动，落点在拍上）；合成像 12 f 显影", "档案签落纸声 ×3；快门 @1656", "F12", True, False),
    (1680, 1776, "头是*格兰特*，其余都不是", "Only the head is Grant's",
     "合成像上三处朱砂标注，配中文 36 px 小签：Circle「格兰特的头」@1680；Box「麦库克的马和身子」@1704；Underline「战俘当背景」@1728。每处标注时，对应原件上画同样的记号，另两张原件压暗", "IMG04, IMG10, IMG11, IMG12",
     "标注 14 f；原件压暗 6 f", "红笔划纸声 ×3", "F12", False, False),
    (1776, 1905, "那第 3 张*林肯*呢", "So who made the third Lincoln?",
     "林肯合成像和 Mumler 相纸滑到左侧并排，第三个位置空着，只有一张档案签 No.003 ?；1824 一只玻璃幻灯片盒推入画面", "IMG01, IMG03",
     "相纸 spring 滑入；空位档案签落下；幻灯片盒 spring 推入 18 f", "纸张点击；幻灯片盒摩擦", "", True, False),
    (1905, 1920, "", "",
     "全片静默 0.5 秒（只留房间底噪）；镜头继续呼吸", "",
     "—", "音乐静默", "", False, False),
    # P6 · bars 21-24 · the twist (the one heavy punch)
    (1920, 2016, "第 3 张，是*魔术师*做来打假的", "The third was made by a magician, to expose the fakers",
     "【全片唯一重拳】放映机取景框扩张：胡迪尼与「林肯鬼魂」玻璃幻灯片；投影本身就是光：取景框里的银幕边 1920 当帧全亮、随后回落成暗边，一道很淡的光束楔形连回幻灯机镜头（不用径向光斑）；幻灯片回到扫描原色（全片唯一一次）；1944 光回落时，胡迪尼脚边落下一张 Plex 签 HARRY HOUDINI（落位当帧有落纸声）；1968 朱砂 Circle 圈住鬼魂的头；档案签 No.003 · 1920S；出处签 LIBRARY OF CONGRESS · 1920–1930（放在投影上方的暗桌面上）", "IMG05",
     "取景框扩张 8 f；色彩当帧硬切还原；银幕边 48 f 回落", "放映机咔嗒 + 带谐波的 sub hit + 低音 A 小调和弦（手机外放也听得到）；落纸 @1944", "F13, F20", True, False),
    (2016, 2112, "胡迪尼约妻子：死后报*暗号*", "Houdini promised his wife a code from beyond",
     "LoC 照片：胡迪尼与妻子、母亲的合影（著录没写谁站在哪，所以不圈人、不指认）；前景米色档案签，打字机打出 ROSABELLE, BELIEVE（2028 起每字 2 f，2062 打完，停到 2112）", "IMG06",
     "合影 spring 滑入 16 f；打字机每字 2 f", "打字机 ×17（音高随机 ±1 半音）", "F15", True, False),
    (2112, 2208, "他死在*万圣节*，她招魂 10 年", "He died on Halloween; she held séances for 10 years",
     "剪报从右侧盖到合影上：1926 年报道他死讯的剪报（原件已是网点印刷，只做统一调色，不再加 halftone），出处签 LIBRARY OF CONGRESS · 1926；Plex Mono 56 px 计数器 1927 → 1936，每个八分三连音（8 f）一跳，2120 起，2192 停在 1936", "IMG07",
     "剪报 spring 14 f；计数器 8 f 一跳", "翻纸声 @2112；极轻打字机点击 ×10", "F14, F16", False, False),
    (2208, 2304, "最后那场，什么也*没来*", "At the last one, nothing came",
     "剪报被抽走，露出下面的合影；整张照片像过度曝光一样慢慢变白（显影曲线反向），2290 前只剩白纸；计数器停在 1936", "IMG06",
     "剪报抽走 14 f；密度曲线反向约 70 f", "钢琴单音延音", "F17", False, False),
    # P7 · bars 25-28 · golden line, centenary, interaction, loop
    (2304, 2400, "今年万圣节，他走了 *100* 年", "This Halloween marks 100 years since he died",
     "【第 25 小节】幻灯片里胡迪尼那半边单独成一张相纸（裁掉鬼魂，「他」不会被读成林肯），居中；下方 Plex 24 px HARRY HOUDINI · DIED OCT. 31, 1926，Plex Mono 56 px 打出 +100 YEARS（2316 起每字 3 f）；出处签 LIBRARY OF CONGRESS · 1920–1930", "IMG05",
     "相纸 spring 滑入 16 f；打字机每字 3 f", "打字机 ×9", "F14, F19, F20", True, False),
    (2400, 2568, "骗你的，是你*想相信*", "It's wanting to believe that fools you",
     "【金句，全片最大字号 150 px，第 26 小节乐句第一拍】三张假像排成接触印样（窄黑边 + 片号 No.001–003），整条只压暗 28%、不虚化（三件证据都要认得出；上下羽化的平面暗场，不给照片加蒙版）；逐字落下，每个字落在一个八分音符上（2400 骗 · 2412 你 · 2424 的， · 2436 是 · 2448 你 · 2460 想 · 2472 相 · 2484 信），2496 成形，整句完整停留到 2568（≥ 2.4 秒），英文 2496 入场；档案签 ARCHIVE No.001—003", "IMG01, IMG03, IMG05",
     "每字遮罩下落 12 f", "钢琴每字一个八分音符，「信」上一个延音和弦；全编制（全片第二响，仅次于反转）", "", True, False),
    (2568, 2640, "最近哪张图*骗*过你", "What's the last picture that fooled you?",
     "2568 署名卡（档案索引卡）从右侧推入、盖住画面（12 f）：SOURCES / LIBRARY OF CONGRESS · 9 ITEMS / W. H. MUMLER (PD) · COMMONS / THE MET 287722 · CC0 / PIANO · SALAMANDER GRAND / A. HOLM · CC BY 3.0 / FULL LIST IN DESCRIPTION，Plex Mono 36 px（手机上可读；编号和完整许可在简介与置顶评论），完整停留 2580–2628（1.6 秒）；2628 索引卡被抽走（12 f），露出下面已经摆好的封面构图，2640 到位", "",
     "索引卡推入 12 f；抽走 12 f；镜头 ease-out 12 f", "纸张声 ×2", "", True, False),
    (2640, 2688, "林肯的头，*借*来的身子", "Lincoln's head, a borrowed body",
     "封面构图（循环帧）：字幕直接在位（72 px）；镜头呼吸的周期都能整除全片时长（6.4 / 11.2 / 22.4 s），最后一帧自然接回第 0 帧，「?」签的摆动同理", "IMG01, IMG02",
     "镜头呼吸（与 S01 同一时钟）", "房间底噪", "F01, F02", False, True),
]

HOOKS = [
    ("1 · 双像证据（当前采用）", "林肯的头，借来的身子",
     "两张相纸错位叠放：两具一模一样的身体，下层的头被写着「?」的档案签盖住"),
    ("2 · 单张断言", "这张林肯像，只有头是林肯的",
     "只有林肯合成像一张相纸；2.8 秒时放大镜移到脖颈"),
    ("3 · 直接下注", "这具身体，不是林肯的",
     "只有林肯合成像一张相纸；第 2 秒直接弹出 A / B 选项"),
]

SECTIONS = [
    ("P1", 1, 3, "冷开场（双像证据）→ 下注 → 标题卡", "只有 pad（小调，暗）"),
    ("P2", 4, 7, "证据链 · 第 1 张：借来的身体", "第 4 小节重拍钢琴进入 = 揭晓 = 全片第一个高潮"),
    ("P3", 8, 11, "证据链 · 第 2 张：遗孀身后的鬼（显影）", "钢琴 + 轻脉冲"),
    ("P4", 12, 15, "鬼影浮现 → 机制 · 审判与双重曝光", "第 12 小节重拍 = 鬼影浮现；加低音、刷子"),
    ("P5", 16, 20, "机制 · 格兰特三拼 → 第 3 张？→ 静默（5 小节扩展乐句）", "1905–1920 帧全静默 0.5 秒"),
    ("P6", 21, 24, "反转 · 胡迪尼（每句 1 小节）", "重拳：sub hit + 色彩还原；低音八度"),
    ("P7", 25, 28, "100 年 → 金句 → 互动 + 署名 → 循环", "第 26 小节金句全编制 → 回落到 pad 尾音"),
]


def tc(frame):
    s, f = divmod(frame, FPS)
    m, s = divmod(s, 60)
    return f"{m:02d}:{s:02d}.{f:02d}"


def plain(s):
    return s.replace("*", "")


def zh_len(s):
    return len(re.sub(r"[\s「」*]", "", s))


def min_frames(n):
    return max(1.2, 0.6 + n * 0.16) * FPS


def readable_frames(a, b, static, is_last):
    unreadable = (0 if static else ENTER_UNREADABLE) + (0 if is_last else EXIT)
    return b - a - unreadable


def check():
    errors = []
    prev_end = 0
    for i, (a, b, zh, en, vis, img, mot, sfx, fid, cut, static) in enumerate(LINES):
        if a != prev_end:
            errors.append(f"row {i + 1}: starts at {a}, previous ended at {prev_end}")
        prev_end = b
        if cut and a % BEAT:
            errors.append(f"row {i + 1}: shot cut at {a} is not on a beat (24 f)")
        if zh:
            if a % BEAT:
                errors.append(f"row {i + 1}: subtitle starts at {a}, not on a beat")
            n = zh_len(zh)
            if n > 14:
                errors.append(f"row {i + 1}: {n} chars > 14: {plain(zh)}")
            if plain(zh).endswith("。"):
                errors.append(f"row {i + 1}: ends with a full stop")
            if re.search(r"[一二两三四五六七八九十百千]\s*[次张块年个位句颗]", plain(zh)):
                errors.append(f"row {i + 1}: use Arabic numerals: {plain(zh)}")
            if zh.count("*") not in (0, 2):
                errors.append(f"row {i + 1}: more than one keyword")
            r = readable_frames(a, b, static, i == len(LINES) - 1)
            # The last line is the cover line: it loops straight into frame 0, where the same line
            # is already on screen, so its time on screen continues there.
            if i == len(LINES) - 1 and static and zh == LINES[0][2]:
                r += readable_frames(LINES[0][0], LINES[0][1], True, False)
            if r < min_frames(n) - 1e-6:
                errors.append(f"row {i + 1}: readable {r}f < min {min_frames(n):.1f}f ({n} chars): {plain(zh)}")
    if prev_end != TOTAL:
        errors.append(f"timeline ends at {prev_end}, expected {TOTAL}")
    return errors


def render():
    out = []
    out.append("# 剧本：林肯的 3 张假像（Three Fake Lincolns）\n")
    out.append(f"- 总时长 **{TOTAL / FPS:.1f} 秒** = {TOTAL} 帧 @ {FPS} fps")
    out.append(f"- 节拍网格：{BPM} BPM，4/4；拍 = {BEAT} f，小节 = {BAR} f，八分 = 12 f，十六分 = 6 f，八分三连音 = 8 f；共 {BARS} 小节")
    out.append("- 画幅 9:16，1080×1920；中文主字幕 + 英文斜体副字幕；无配音")
    out.append("- 规则：字幕起点全部在拍上；镜头切换全部在半小节（48 f）上；数字用阿拉伯数字；每句 1 个朱砂关键词（表中加粗）")
    out.append(f"- 停留检查：可读时长 = 在屏时长 − 入场 {ENTER_UNREADABLE} f（入场 12 f，过半即可读）− 出场 {EXIT} f；须 ≥ max(1.2 s, 0.6 s + 字数 × 0.16 s)。封面和循环帧没有入场动画\n")
    out.append("## 乐句与叙事弧\n")
    out.append("| 乐句 | 小节 | 帧 | 时间 | 占比 | 段落 | 配乐 |")
    out.append("|---|---|---|---|---|---|---|")
    for name, b0, b1, what, music in SECTIONS:
        f0, f1 = (b0 - 1) * BAR, b1 * BAR
        out.append(f"| {name} | {b0}–{b1} | {f0}–{f1} | {tc(f0)}–{tc(f1)} | "
                   f"{f0 / TOTAL:.1%}–{f1 / TOTAL:.1%} | {what} | {music} |")
    out.append("\n关键节点：揭晓 288 f（10.7%）· 鬼影 1056 f（39.3%）· 反转 1920 f（71.4%）· 金句 2400 f（89.3%）· 全部在乐句第一拍。\n")
    out.append("## 前 3 秒 · 钩子版本\n")
    out.append("| 版本 | 第 0 帧字幕 | 第 0 帧画面 |")
    out.append("|---|---|---|")
    for h in HOOKS:
        out.append(f"| {h[0]} | {h[1]} | {h[2]} |")
    out.append("\n## 逐句表\n")
    out.append("| # | 时间码 | 帧 | 中文字幕 | 英文副字幕 | 画面 | 图片ID | 运动 | 音效 | 事实ID |")
    out.append("|---|---|---|---|---|---|---|---|---|---|")
    for i, (a, b, zh, en, vis, img, mot, sfx, fid, cut, static) in enumerate(LINES, 1):
        if zh:
            r = readable_frames(a, b, static, i == len(LINES))
            z = re.sub(r"\*(.+?)\*", r"**\1**", zh) + f"（{zh_len(zh)} 字，可读 {r / FPS:.2f} s）"
        else:
            z = "—"
        mark = "✂ " if cut else ""
        out.append(f"| {i:02d} | {mark}{tc(a)}–{tc(b)} | {a}–{b} | {z} | {('*' + en + '*') if en else '—'} | "
                   f"{vis} | {img or '—'} | {mot} | {sfx} | {fid or '—'} |")
    out.append("\n✂ = 镜头切换（落在半小节）。")
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    errs = check()
    for e in errs:
        print("ERROR", e)
    if errs:
        sys.exit(1)
    open(sys.argv[1], "w").write(render())
    print("ok", len(LINES), "rows,", TOTAL, "frames")
