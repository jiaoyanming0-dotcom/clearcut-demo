# ADR 0004 · 视觉重做：采用 Cal.com coss ui 设计系统（UI v3）

日期：2026-10-29 ｜ 状态：已采纳 ｜ 取代 ADR 0003 的技术选型部分

## 背景

UI v2（自研 CSS，暖石底 + 场记黄）虽然通过了自查（lint 0 告警 / inspect 0 FAIL），仍被判定「AI 感」：深色底 + 单一亮色 accent 是 2024 到 2026 年 AI 生成落地页的典型配方；按钮、卡片、标签等组件的细节也缺工艺感。评审要求以成熟组件库的视觉语言重做，候选为 HeroUI 与 coss.com/ui。

## 决策

采用 **Cal.com 官方设计系统 coss.com/ui**（前 Origin UI，MIT，10.8k stars）作为视觉基座。技术栈由零构建静态页迁移为 **Vite + React 19 + Tailwind CSS v4**；组件经 shadcn CLI 的 `@coss` 注册表入仓（共 56 个），源码进入自有仓库。

## 理由

- coss 的视觉语言是白底 + 近黑主色（neutral-800）、发丝级边框（黑 8% alpha）、排版主导，色彩只保留给语义状态（info / success / warning / destructive）。这套语言与 B2B 效率工具语境一致，与「AI 风」正面相反。
- 组件由 Cal.com 真实产品打磨，弹窗、toast、按钮按压等交互自带工艺细节。
- 备选 HeroUI（NextUI 后继）为消费端软圆角、多色彩风格，模板感更强，落选。

## 影响

- 业务逻辑、确定性 Mock、localStorage 状态、深链（`#/played`、`#/compare`）全部保留；文案与数据不变。
- ADR 0003 的「零构建」选型被取代：仓库改为托管构建产物（`npm run build` 输出），源码为交付中的 `app/` 工程。
- 覆盖状态的语义色由品牌黄改为 success / warning / destructive；品牌识别改由字体承担（Cal Sans + Paper Mono，随设计系统）。
