/* 剪意 ClearCut · 确定性演示数据
   依据 调研/03-Demo规格.md 及 2026-10-28 修订：集数统一为第 13 集；v2 开场实测 7.8 秒；
   覆盖判定与导出说明均由状态实时生成，不再使用固定文本。 */
window.MOCK = (function () {
  var project = {
    drama: '《逆光》',
    cut: '出海版',
    episodes: [11, 12, 13, 14, 15],
    current: 13,
    platform: '繁星短剧'
  };

  var comments = [
    { id: 'c1', src: '平台方 · 繁星短剧', srcType: 'platform', lang: 'zh', kind: 'text', time: '今天 09:12',
      text: '第 13 集开场节奏有点拖，前 15 秒没抓住人', tcode: '00:00–00:15', status: 'pending' },

    { id: 'c2', src: '平台方 · 繁星短剧', srcType: 'platform', lang: 'en', kind: 'text', time: '今天 09:12',
      text: 'The grandma’s dubbing feels flat in the hospital scene — it kills the emotion.',
      translation: '医院戏里奶奶的配音太平了，情绪出不来。', tcode: '00:42–00:55', status: 'pending' },

    { id: 'c3', src: '平台方 · 繁星短剧', srcType: 'platform', lang: 'zh', kind: 'voice', time: '今天 09:13',
      text: '整体感觉不太对，你们自己看看', tcode: null, lowConfidence: true, status: 'pending' },

    { id: 'c4', src: '客户 · 审片人', srcType: 'client', lang: 'zh', kind: 'text', time: '今天 09:15',
      text: '女主说「别走」那句，口型和声音对不上', tcode: '01:10–01:14', status: 'pending' },

    { id: 'c5', src: '平台方 · 繁星短剧', srcType: 'platform', lang: 'en', kind: 'text', time: '今天 09:16',
      text: 'Subtitle for 「顾沉」 is inconsistent — “Gu Chen” and “Mr. Gu” are mixed.',
      translation: '「顾沉」的字幕译名不一致，“Gu Chen” 和 “Mr. Gu” 混着用。', tcode: null, status: 'pending' }
  ];

  var clarify = {
    c1: {
      steps: [
        { q: '这条意见指的是哪个环节？', options: ['开场抓力', '中段节奏', '结尾收束'], pick: 0 },
        { q: '希望改到什么程度？', options: ['压缩到 8 秒内', '只提速，不改结构'], pick: 0 }
      ],
      intent: { text: 'EP13 开场 00:00–00:15 压缩至 8 秒内，保留女主背影镜头作为钩子', tcode: '00:00–00:15', tag: 'AI 建议定位' }
    },
    c2: {
      steps: [
        { q: '指哪场戏的配音？', options: ['医院戏 · 奶奶', '病房外走廊', '其他场景'], pick: 0 },
        { q: '希望改成什么情绪？', options: ['哽咽但克制', '更外放一些', '只提清晰度，情绪不动'], pick: 0 }
      ],
      intent: { text: '00:42–00:55 医院戏奶奶配音重录，情绪改为「哽咽但克制」', tcode: '00:42–00:55', tag: 'AI 建议定位' }
    },
    c3: {
      lowConfidence: true,
      note: '置信度低：这条意见没有指向具体画面或位置，已退回人工拆解。',
      anchors: ['结尾悬念太弱', '结尾缺少钩子，收得太快', '说不清 · 先按「结尾悬念弱」记录'],
      intent: { text: '01:52–02:10 结尾加男主发现项链的特写，强化悬念', tcode: '01:52–02:10', tag: '人工拆解' }
    },
    c4: { quick: true, intent: { text: '01:10–01:14「别走」台词口型对齐修复', tcode: '01:10–01:14', tag: 'AI 直接生成' } },
    c5: { quick: true, intent: { text: 'EP13–EP15 全片统一角色称谓译法：顾沉 → Gu Chen', tcode: '全片', tag: '术语库匹配' } }
  };

  var tasks = [
    { id: 't1', intentId: 'i1', title: '开场压缩至 8 秒', assignee: '剪辑 · 阿凯', avatar: '剪', status: 'doing', statusText: '修改中' },
    { id: 't2', intentId: 'i2', title: '奶奶配音重录（哽咽 · 克制）', assignee: '配音 · 小雨', avatar: '配', status: 'todo', statusText: '待处理' },
    { id: 't3', intentId: 'i5', title: 'EP13–15 称谓统一 Gu Chen', assignee: '本地化 · 小周', avatar: '本', status: 'done', statusText: '已完成' }
  ];

  var compare = {
    v1: { label: 'v1 · 修改前', meta: '2 分 10 秒' },
    v2: { label: 'v2 · 修改后', meta: '2 分 04 秒' },
    markers: [
      { intentId: 'i1', t: '00:00–00:15', label: '开场 15.0s → 7.8s', ai: 'covered' },
      { intentId: 'i2', t: '00:42–00:55', label: '配音重录 · 情绪仍待复审', ai: 'partial' },
      { intentId: 'i4', t: '01:10–01:14', label: '口型对齐已修复', ai: 'covered' },
      { intentId: 'i3', t: '01:52–02:10', label: '尾声特写未处理 · 待 EP14 补拍', ai: 'gap' }
    ],
    /* 对照帧：art 决定占位画面渐变，badge 为时长/状态角标 */
    frames: [
      { intentId: 'i1', v1: { art: 'dawn',    badge: '开场 · 15.0s' }, v2: { art: 'dawn-cut', badge: '开场 · 7.8s', fixed: true } },
      { intentId: 'i2', v1: { art: 'hospital', badge: '医院戏 · 原声' }, v2: { art: 'hospital', badge: '医院戏 · 重录', partial: true } },
      { intentId: 'i4', v1: { art: 'night',    badge: '01:10 · 口型偏移' }, v2: { art: 'night',  badge: '01:10 · 已对齐', fixed: true } },
      { intentId: 'i3', v1: { art: 'room',     badge: '01:52 · 原结尾' }, v2: { art: 'room',   badge: '01:52 · 未处理', gap: true } }
    ]
  };

  var coverageLabels = { covered: '已覆盖', partial: '部分覆盖', gap: '未覆盖' };

  var termBase = {
    count: 12,
    added: ['「节奏拖」→ 常用澄清模板', '「译名混用」→ 术语一致性检查']
  };

  return { project: project, comments: comments, clarify: clarify, tasks: tasks, compare: compare, coverageLabels: coverageLabels, termBase: termBase };
})();
