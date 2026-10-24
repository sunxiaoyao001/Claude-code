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
#   cut: this row starts a new shot (must land on a 48 f half-bar)
#   static: subtitle is already in place (frame 0 cover and the loop return)
LINES = [
    # P1 · bars 1-3 · cover, bet, title
    (0, 96, "这张林肯像，身子是*借*的", "This Lincoln's body is borrowed",
     "【封面】档案桌上两张相纸错位叠放：上层林肯合成像，下层 1852 卡尔霍恩原版画向右下错开 18%，两具身体一模一样；下层的头被一张写着「?」的米色档案签盖住。主体落右三分线。左下角出处「LIBRARY OF CONGRESS · c.1865 / 1852」",
     "IMG01, IMG02", "镜头呼吸：每秒缓推 1%；第 0 帧字幕已在位", "房间底噪", "F01, F02", True, True),
    (96, 240, "猜猜，跟*谁*借的", "Guess who lent it",
     "两张档案签依次落在右侧第 7–11 栏：「A 一位总统」「B 一位副总统」；192 / 208 / 224 帧 Plex Mono 倒计时 03 · 02 · 01（四分三连音，16 f 一跳）", "IMG01, IMG02",
     "档案签 spring(damping 200) 落在拍点 120 / 144", "档案签落纸声 ×2 @120/144；倒计时打字机 ×3", "F21, F22", True, False),
    (240, 288, "", "",
     "标题卡：「林肯的 / 3 张假像」两行，Noto Serif SC 900 128 px，左对齐第 2–9 栏；朱砂方印压在第二行末尾；英文 Three Fake Lincolns；右上档案签换成 ARCHIVE No.001 · c.1865 · NEW YORK", "",
     "印章 240 帧盖下：6 f 压入 + 10 f 墨晕；288 帧标题纸被抽走（盖下即切）", "印章声 @240（峰值对齐）", "F01", True, False),
    # P2 · bars 4-7 · fake No.1: the borrowed body (piano enters on the reveal)
    (288, 384, "答案是 B：副总统*卡尔霍恩*", "B — Vice President John C. Calhoun",
     "盖头的档案签被抽走，露出卡尔霍恩的脸；两张相纸滑动对位，朱砂竖向擦除线扫过：除了头，完全重合", "IMG01, IMG02",
     "抽签 bezier 18 f；对位 spring；擦除线 24 f，落在第 4 小节重拍（全片第一个高潮，钢琴进入）", "纸张摩擦 + 关键词印章声 @288", "F02, F21", True, False),
    (384, 480, "他说奴隶制是「*积极的善*」", "He called slavery “a positive good”",
     "从身体推到卡尔霍恩的脸（match cut）；档案签 JOHN C. CALHOUN · 1782–1850", "IMG02",
     "推近 4%，bezier 36 f", "纸张点击", "F04, F06", True, False),
    (480, 576, "版画师，把头*换*成了林肯", "An engraver swapped in Lincoln's head",
     "两张相纸重新错开，擦除线来回扫一次，停在脖子", "IMG01, IMG02",
     "错开 / 对位 spring；擦除线 2 拍往返", "相纸滑动摩擦", "F01, F02", False, False),
    (576, 672, "桌上主张*州权*的字，也换了", "Even the states'-rights papers were rewritten",
     "放大镜移到桌上文件，框内 2.5×，先看卡尔霍恩版，再滑到林肯版；朱砂 Box 框住被改的字", "IMG02, IMG01",
     "Loupe 位移 18 f；Box progress 20 f", "放大镜机械声；红笔划纸声", "F03", True, False),
    # P3 · bars 8-11 · fake No.2: the widow's ghost
    (672, 768, "这只是第 *1* 张", "That was only the first",
     "名片照托盘：几张 Mumler 的灵异名片照（CDV）在桌上散开，右上档案签换成 No.002 · c.1872 · BOSTON", "IMG08",
     "名片照依次滑入，落在八分音符", "名片照落纸声 ×3（音高随机）", "F08, F09", True, False),
    (768, 864, "第 2 张，主角是他的*遗孀*", "The second stars his widow",
     "从托盘里抽出一张，推进放大，落进显影盘：一张空白相纸", "IMG03",
     "抽出 → 推进 match cut 20 f", "相纸滑动；显影液轻响", "F07", True, False),
    (864, 960, "她报了*假名*，走进照相馆", "She gave a false name at the studio",
     "显影：最深的影调先浮现——黑裙、椅子、她的脸", "IMG03",
     "levels 白点随帧上升（显影曲线）", "液体轻响（低）", "F09", False, False),
    (960, 1056, "照片*洗*出来了", "Then the print came up",
     "显影后段：中灰调出来，画面看起来已经完整", "IMG03",
     "显影曲线第二段；镜头呼吸", "液体 + 极轻低频 swell", "F07", False, False),
    (1056, 1152, "他，就站在她*身后*", "And there he was, right behind her",
     "【第 12 小节重拍，乐句第一拍】最淡的灰调最后浮现：她身后的「林肯」；朱砂 Circle 圈住鬼影", "IMG03",
     "显影曲线最后 12 f 收尾；Circle progress 24 f", "低频 swell 收束；红笔划纸声", "F07, F11", True, False),
    # P4 · bars 12-15 · mechanism: the trial, the darkroom
    (1152, 1248, "摄影师 1869 年就吃过*官司*", "The photographer had been tried in 1869",
     "Harper's Weekly 1869-05-08 漫画版面，halftone 网点，局部高亮招牌 MUMLER'S（无公有领域扫描件时：Mumler 名片照 + 打字机日期戳 NEW YORK · APRIL 1869）", "IMG09 / IMG08",
     "版面斜 0.5° 缓推", "翻页声", "F10", True, False),
    (1248, 1344, "证据不足，法官*放*了他", "No proof. The judge let him go",
     "版面被抽走，桌上只剩名片照", "IMG08",
     "抽出 bezier 16 f", "相纸滑动", "F10", True, False),
    (1344, 1440, "可在*暗房*里，造鬼不难", "But in a darkroom, ghosts come easy",
     "转到看片灯桌（暗纸底色上一块米白发光面板，不用 glow）；两张负片入画；右下角固定标「示意」", "",
     "负片 spring 落位", "放映机风扇底噪起", "F10, F11", True, False),
    (1440, 1536, "1 块底片，曝光 *2* 次", "One plate, two exposures",
     "示意：肖像负片与淡影负片沿 x 轴相向滑动重合，叠加区显出「鬼影」；「示意」角标", "",
     "两片相向滑动 bezier 32 f", "快门 ×2（@1440、@1488，落在拍点）", "F11", False, False),
    # P5 · bars 16-20 · Grant composite, the question, silence
    (1536, 1632, "或者 *3* 张底片，拼成 1 位将军", "Or three negatives, one general",
     "第三张负片滑入，三片合成后显影成 LoC《General Grant at City Point》；档案签 EXHIBIT · c.1902 · L.C. HANDY", "IMG04",
     "显影（快速版 24 f）", "快门（重拍 @1536）", "F12", True, False),
    (1632, 1728, "头是*格兰特*，其余都不是", "The head is Grant's. Nothing else is",
     "朱砂 Circle 圈头部，标签 HEAD · GRANT · 1864；Box 框马和身体，标签 BODY · McCOOK；Underline 划过背景，标签 BACKGROUND · POWs, FISHER'S HILL（三处标注落在 1632 / 1656 / 1680）", "IMG04",
     "镜头随标注推近、横移、拉远", "红笔划纸声 ×3", "F12", False, False),
    (1728, 1824, "那第 3 张*林肯*呢", "So who made the third Lincoln?",
     "桌上两张假像并排（林肯合成像、Mumler），第三个位置空着，只有一张档案签 No.003 ?", "IMG01, IMG03",
     "两张相纸滑到左侧，空位推近", "纸张点击", "", True, False),
    (1824, 1920, "", "",
     "一只玻璃幻灯片盒推入画面；1905–1920 帧全片静默 0.5 秒（只留房间底噪）；镜头继续呼吸", "",
     "幻灯片盒 bezier 推入 30 f", "音乐静默 0.5 秒", "", True, False),
    # P6 · bars 21-24 · the twist (the one heavy punch)
    (1920, 2016, "第 3 张，是魔术师*胡迪尼*造的", "The third was made by the magician Houdini",
     "【全片唯一重拳】放映机光斑从小取景框扩张成全屏：胡迪尼与「林肯鬼魂」玻璃幻灯片，还原扫描原色（扫描件若接近单色，改为放映机暖光）；档案签 No.003 · 1920s · H. HOUDINI；出处 LIBRARY OF CONGRESS · 1920–1930", "IMG05",
     "取景框扩张 20 f；色彩还原 18 f", "放映机咔嗒 + sub hit（峰值对齐 1920）", "F13, F20", True, False),
    (2016, 2112, "他造这个鬼，是为了*打假*", "He made the ghost to expose the fakes",
     "画面回到统一调色；放大镜看胡迪尼身后的淡影，朱砂 Circle 圈住「林肯」", "IMG05",
     "Loupe 18 f；Circle 24 f", "放大镜机械声", "F13", True, False),
    (2112, 2208, "他生前，和妻子约好了*暗号*", "Before he died, he and his wife set a code",
     "1926 年报道他死讯的剪报（halftone），出处 LIBRARY OF CONGRESS · 1926；前景米色档案签上打字机打出 ROSABELLE, BELIEVE（每字 2 f，2124 起，2158 打完），下方小字「她唱过的一首歌」", "IMG07",
     "打字机每字 2 f；打完后停 1.7 秒", "打字机 ×17（音高随机 ±1 半音）", "F14, F15", True, False),
    (2208, 2304, "她办了 *10* 年万圣节降神会", "She held a séance every Halloween for 10 years",
     "胡迪尼锁链全身像相纸；Plex Mono 计数器 1927 → 1936，每个八分三连音（8 f）一跳，2216 起，2288 停在 1936；出处 LIBRARY OF CONGRESS · 1903", "IMG06",
     "计数器 8 f 一跳；相纸像过度曝光一样慢慢压暗", "极轻打字机点击 ×10", "F16, F17", True, False),
    # P7 · bars 25-28 · golden line, centenary, interaction, loop
    (2304, 2448, "骗你的，是你*想相信*", "What fools you is wanting to believe",
     "【金句，全片最大字号 150 px】三张假像排成接触印样作暗背景；「骗你的，」落在 2304（乐句第一拍），「是你想相信」落在 2328（下一拍），2340 前成形，停到 2448", "IMG01, IMG03, IMG05",
     "两个词组各自遮罩下落 12 f", "sub hit（低）@2304；全编制", "", True, False),
    (2448, 2544, "今年万圣节，他走了 *100* 年", "This Halloween marks 100 years since he died",
     "接触印样里胡迪尼那一格推近；档案签打出 1926 — 2026", "IMG05",
     "推近 6%", "打字机 ×9", "F14, F19", True, False),
    (2544, 2616, "你被哪张*图*骗过", "Which picture fooled you?",
     "2544 相纸翻面（12 f），背面就是署名卡：全部图片、音效与字体出处（Plex Mono 24 px，档案签样式），完整停留 2556–2604（1.6 秒）；2604 起相纸翻回正面、镜头拉回封面构图，2616 到位", "",
     "翻面 12 f；翻回 + 拉回 12 f（同一个连续镜头）", "相纸翻面声 ×2", "", True, False),
    (2616, 2688, "这张林肯像，身子是*借*的", "This Lincoln's body is borrowed",
     "封面构图（循环帧）：字幕直接在位，最后一帧与第 0 帧完全一致，可无缝循环", "IMG01, IMG02",
     "镜头参数 = 第 0 帧", "房间底噪", "F01, F02", False, True),
]

HOOKS = [
    ("1 · 双像证据（当前采用）", "这张林肯像，身子是借的",
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
    ("P7", 25, 28, "金句 → 100 年 → 互动 + 署名 → 循环", "全编制 → 回落到 pad 尾音"),
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
        if cut and a % (BEAT * 2):
            errors.append(f"row {i + 1}: shot cut at {a} is not on a half-bar (48 f)")
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
    out.append("\n关键节点：揭晓 288 f（10.7%）· 鬼影 1056 f（39.3%）· 反转 1920 f（71.4%）· 金句 2304 f（85.7%）· 全部在乐句第一拍。\n")
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
