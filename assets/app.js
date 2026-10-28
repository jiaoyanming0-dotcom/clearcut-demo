/* 剪意 ClearCut · 交互逻辑 v2（零构建，经典脚本）
   状态机驱动；确定性 Mock；扁平分镜为内联 SVG；localStorage 持久化；重置即回到初始。 */
(function () {
  'use strict';

  var M = window.MOCK;
  var KEY = 'clearcut:v3';
  var VERSION = 3;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  var AI_COVER = { c1: 'covered', c2: 'partial', c3: 'gap', c4: 'covered', c5: 'covered' };
  var COVER_ORDER = ['covered', 'partial', 'gap'];
  var COVER_LABEL = M.coverageLabels;

  var T = { exportReady: false, first: true };

  function initialState() {
    return {
      v: VERSION,
      view: 'inbox',
      step: 1,
      hintDismissed: false,
      comments: M.comments.map(function (c) { return Object.assign({}, c); }),
      currentCommentId: null,
      cler: null,
      intents: [],
      tasks: [],
      taskGen: 'idle',
      taskGenFailedOnce: false,
      accepted: null,
      exported: false,
      completed: false,
      termExtra: 0
    };
  }

  var S = load() || initialState();

  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 忽略 */ } }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || d.v !== VERSION) return null;
      if (!Array.isArray(d.comments) || d.comments.length !== M.comments.length) return null;
      if (['inbox', 'clarify', 'compare'].indexOf(d.view) < 0) return null;
      if (!Array.isArray(d.intents) || !Array.isArray(d.tasks)) return null;
      if (d.view === 'clarify' && !d.currentCommentId) d.view = 'inbox';
      return d;
    } catch (e) { return null; }
  }

  function cmt(id) { for (var i = 0; i < S.comments.length; i++) if (S.comments[i].id === id) return S.comments[i]; return null; }
  function cfgOf(id) { return M.clarify[id] || null; }
  function intentOfComment(id) { for (var i = 0; i < S.intents.length; i++) if (S.intents[i].commentId === id) return S.intents[i]; return null; }
  function intentById(iid) { for (var i = 0; i < S.intents.length; i++) if (S.intents[i].id === iid) return S.intents[i]; return null; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function counts() {
    var pending = S.comments.filter(function (c) { return c.status === 'pending'; }).length;
    return { pending: pending, clarified: S.comments.length - pending };
  }
  function processed() { return S.intents.filter(function (x) { return x.coverage !== 'gap'; }).length; }

  /* ---------- 分镜画面（扁平剪影，无渐变） ---------- */
  function sceneSVG(scene) {
    function wrap(bg, inner) {
      return '<svg viewBox="0 0 160 90" aria-hidden="true">' +
        '<rect class="' + bg + '" width="160" height="90"/>' + inner + '</svg>';
    }
    switch (scene) {
      case 'dawn':
        return wrap('sc-a',
          '<rect class="sc-b" y="56" width="160" height="34"/>' +
          '<circle class="sc-ink" cx="118" cy="28" r="10" opacity=".8"/>' +
          '<circle class="sc-deep" cx="52" cy="44" r="7"/>' +
          '<rect class="sc-deep" x="45" y="51" width="14" height="28" rx="7"/>');
      case 'dawn-cut':
        return wrap('sc-a',
          '<rect class="sc-b" y="62" width="160" height="28"/>' +
          '<circle class="sc-ink" cx="112" cy="22" r="8" opacity=".8"/>' +
          '<circle class="sc-deep" cx="46" cy="34" r="9"/>' +
          '<rect class="sc-deep" x="37" y="43" width="18" height="38" rx="9"/>');
      case 'hospital':
        return wrap('sc-b',
          '<rect class="sc-a" x="98" y="12" width="46" height="38" rx="3"/>' +
          '<rect class="sc-c" x="16" y="60" width="84" height="7" rx="3"/>' +
          '<circle class="sc-deep" cx="38" cy="42" r="7"/>' +
          '<rect class="sc-deep" x="31" y="49" width="14" height="16" rx="7"/>');
      case 'hospital-v2':
        return wrap('sc-b',
          '<rect class="sc-a" x="98" y="12" width="46" height="38" rx="3"/>' +
          '<rect class="sc-c" x="16" y="60" width="84" height="7" rx="3"/>' +
          '<circle class="sc-deep" cx="38" cy="42" r="7"/>' +
          '<rect class="sc-deep" x="31" y="49" width="14" height="16" rx="7"/>' +
          '<polyline points="58,70 65,62 72,73 79,64 86,70 93,66" style="fill:none;stroke:var(--ink)" stroke-width="2" opacity=".65"/>');
      case 'night':
        return wrap('sc-b',
          '<rect class="sc-deep" y="68" width="160" height="22"/>' +
          '<rect class="sc-c" x="24" y="16" width="3" height="52" rx="1.5"/>' +
          '<circle class="sc-a" cx="25.5" cy="15" r="7"/>' +
          '<circle class="sc-deep" cx="106" cy="40" r="7"/>' +
          '<rect class="sc-deep" x="99" y="47" width="14" height="24" rx="7"/>');
      case 'night-v2':
        return wrap('sc-b',
          '<rect class="sc-deep" y="68" width="160" height="22"/>' +
          '<rect class="sc-c" x="24" y="16" width="3" height="52" rx="1.5"/>' +
          '<circle class="sc-a" cx="25.5" cy="15" r="7"/>' +
          '<circle class="sc-deep" cx="106" cy="40" r="7"/>' +
          '<rect class="sc-deep" x="99" y="47" width="14" height="24" rx="7"/>' +
          '<circle cx="106" cy="40" r="13" style="fill:none;stroke:var(--ink)" stroke-width="2" opacity=".55"/>');
      case 'room':
        return wrap('sc-c',
          '<rect class="sc-b" x="102" y="18" width="44" height="72" rx="3"/>' +
          '<circle class="sc-deep" cx="62" cy="38" r="7"/>' +
          '<rect class="sc-deep" x="55" y="45" width="14" height="30" rx="7"/>' +
          '<rect class="sc-a" x="84" y="56" width="10" height="10" rx="2"/>');
      default:
        return wrap('sc-b', '');
    }
  }

  /* ============================================================ 渲染 */
  function render() {
    if (T.first) {
      T.first = false;
      var app = $('#app');
      if (app) { app.classList.add('booting'); setTimeout(function () { if (app) app.classList.remove('booting'); }, 1100); }
    }
    $('#topbar').innerHTML = topbarHTML();
    $('#sidebar').innerHTML = sidebarHTML();
    $('#center').innerHTML = centerHTML();
    $('#panel').innerHTML = panelHTML();
  }
  function commit() { save(); render(); }

  function topbarHTML() {
    var labels = ['澄清', '修改', '验收'];
    var steps = labels.map(function (label, i) {
      var cls = 'step' + (S.step === i + 1 ? ' current' : (S.step > i + 1 ? ' done' : ''));
      return '<span class="' + cls + '">' + label + '</span>';
    }).join('');
    return '' +
      '<div class="brand">' +
        '<span class="brand-mark"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 L12 5 L19 19 Z"/></svg></span>' +
        '<span class="brand-name">剪意</span><span class="brand-desc">短剧审片意见工作台</span>' +
      '</div>' +
      '<div class="proj"><b>' + M.project.drama + '</b><span>' + M.project.cut + '</span><span>EP' + M.project.current + '</span></div>' +
      '<div class="steps">' + steps + '</div>' +
      '<div class="top-right"><span class="role">制片统筹</span>' +
        '<button class="icon-btn" data-act="reset" title="重置演示" aria-label="重置演示">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>' +
        '</button></div>';
  }

  function sidebarHTML() {
    var cc = counts();
    var eps = M.project.episodes.map(function (n) {
      var active = n === M.project.current;
      var note = (active && cc.pending > 0) ? '<span class="ep-note">' + cc.pending + ' 条新意见</span>' : '';
      return '<button class="ep' + (active ? ' active' : ' dis') + '"' + (active ? '' : ' disabled') + ' data-act="ep" data-n="' + n + '" aria-label="第 ' + n + ' 集">' +
        '<span class="ep-n">EP' + n + '</span>' + note + '</button>';    }).join('');
    return '' +
      '<div class="side-label">剧集</div>' +
      '<div class="ep-list">' + eps + '</div>' +
      '<div class="side-foot"><button class="termbase' + (S.termExtra > 0 ? ' hot' : '') + '" data-act="termbase">' +
        '术语库<span class="tb-n">' + (M.termBase.count + S.termExtra) + '</span></button></div>';
  }

  function centerHTML() {
    if (S.view === 'clarify') return clarifyHTML();
    var tabs = '' +
      '<div class="tabs">' +
        '<button class="tab' + (S.view === 'inbox' ? ' active' : '') + '" data-act="tab" data-view="inbox">意见收件箱<span class="tcount">' + counts().pending + '</span></button>' +
        '<button class="tab' + (S.view === 'compare' ? ' active' : '') + '" data-act="tab" data-view="compare">版本对照</button>' +
      '</div>';
    return tabs + (S.view === 'compare' ? compareHTML() : inboxHTML());
  }

  function inboxHTML() {
    var html = '';
    if (!S.hintDismissed) {
      html += '<div class="hintbar"><span>推荐路径：先澄清前三条意见，再批量确认第 4、5 条，然后生成修改任务，到版本对照核对 v2，最后确认采用并导出处理说明。</span>' +
        '<button class="hint-close" data-act="dismiss-hint">知道了</button></div>';
    }
    if (S.taskGen === 'done' && !S.accepted) {
      html += '<div class="noticebar"><span>修改任务已派发，到版本对照里核对 v2 是否回应了每条意图。</span><span class="spacer"></span>' +
        '<button class="btn sm" data-act="tab" data-view="compare">去版本对照</button></div>';
    }
    var c1 = cmt('c1'), c2 = cmt('c2'), c3 = cmt('c3');
    var quickReady = c1 && c2 && c3 && c1.status !== 'pending' && c2.status !== 'pending' && c3.status !== 'pending' &&
      cmt('c4').status === 'pending' && cmt('c5').status === 'pending';
    if (quickReady) {
      html += '<div class="noticebar"><span>第 4、5 条指向具体位置，AI 已直接生成修改意图。</span><span class="spacer"></span>' +
        '<button class="btn primary sm" data-act="quick-all">全部确认</button></div>';
    }
    var cards = S.comments.map(function (c, i) { return commentCardHTML(c, i); }).join('');
    return '<div class="center-scroll">' + html + '<div class="cmts">' + cards + '</div></div>';
  }

  function commentCardHTML(c, i) {
    var tags = '<span class="cmt-tags"><span>' + (c.lang === 'en' ? 'EN' : '中文') + '</span>' +
      (c.kind === 'voice' ? '<span>语音转写</span>' : '') + '</span>';
    var trans = c.translation ? '<div class="cmt-trans">' + esc(c.translation) + '</div>' : '';
    var tc = c.tcode ? '<span class="tcode">' + c.tcode + '</span>'
      : (c.lowConfidence && c.status === 'pending' ? '<span class="tcode">待定位</span>' : '');
    var stTxt = { pending: '待澄清', clarified: '已澄清', tasked: '已建任务' };
    var stCls = { pending: 's-none', clarified: 's-clarified', tasked: 's-tasked' };
    var action;
    if (c.status === 'pending') {
      action = cfgOf(c.id).quick
        ? '<button class="btn quiet sm" data-act="open" data-id="' + c.id + '">查看 AI 建议</button>'
        : '<button class="btn primary sm" data-act="open" data-id="' + c.id + '">澄清这条意见</button>';
    } else {
      action = '<button class="btn quiet sm" data-act="open" data-id="' + c.id + '">查看修改意图</button>';
    }
    return '' +
      '<article class="cmt s-' + c.status + '" style="--i:' + (i || 0) + '">' +
        '<div class="cmt-head">' +
          '<span class="cmt-src">' + esc(c.srcName) + '</span>' +
          '<span class="cmt-platform">' + esc(c.org) + '</span>' + tags +
          '<span class="cmt-time">' + c.time + '</span>' +
        '</div>' +
        '<div class="cmt-text">' + esc(c.text) + '</div>' + trans +
        '<div class="cmt-foot">' + tc +
          '<span class="state ' + stCls[c.status] + '">' + stTxt[c.status] + '</span>' +
          '<span class="spacer"></span>' + action +
        '</div>' +
      '</article>';
  }

  function clarifyHTML() {
    var c = cmt(S.currentCommentId);
    if (!c) return inboxHTML();
    var cfg = cfgOf(c.id);
    var cl = S.cler || { phase: 'ask', stepIndex: 0, answers: [], intentText: cfg.intent.text, editing: false, readOnly: false };
    var idx = S.comments.indexOf(c) + 1;
    var head = '' +
      '<div class="tabs"><span class="tab active">澄清第 ' + idx + ' 条意见</span></div>' +
      '<div class="center-scroll"><div class="clerify">' +
      '<button class="backlink" data-act="back">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>返回收件箱</button>';
    var orig = '' +
      '<div class="orig"><div class="orig-label">原始审片意见</div>' +
      '<div class="cmt-head"><span class="cmt-src">' + esc(c.srcName) + '</span><span class="cmt-platform">' + esc(c.org) + '</span><span class="cmt-time">' + c.time + '</span></div>' +
      '<div class="cmt-text">' + esc(c.text) + '</div>' +
      (c.translation ? '<div class="cmt-trans">' + esc(c.translation) + '</div>' : '') +
      (c.tcode ? '<div class="cmt-foot"><span class="tcode">' + c.tcode + '</span></div>' : '') + '</div>';

    var body = '';
    if (cl.phase === 'lowconf') {
      body = '' +
        '<div class="ai-block"><div class="ai-head"><span class="ai-name">澄清助手</span><span class="ai-desc">这条意见说不清，先交回人来判断</span></div>' +
        '<div class="conf-note"><span class="bar"></span><span>' + esc(cfg.note) + '</span></div>' +
        '<div class="q-text">选一个最接近的判断：</div>' +
        '<div class="opts">' + cfg.anchors.map(function (a, i) {
          return '<button class="opt" data-act="anchor" data-i="' + i + '">' + esc(a) + '</button>';
        }).join('') + '</div></div>';
    } else if (cl.phase === 'thinking') {
      body = '<div class="ai-block"><div class="ai-head"><span class="ai-name">澄清助手</span></div>' +
        '<div class="loading">正在把这条意见收敛成可执行的修改意图<span class="pbar" aria-hidden="true"></span></div></div>';
    } else if (cl.phase === 'ask') {
      var steps = cfg.steps.map(function (st, i) {
        if (i > cl.stepIndex) return '';
        var isCurrent = i === cl.stepIndex;
        var opts = st.options.map(function (o, oi) {
          var picked = cl.answers[i] === oi;
          return '<button class="opt' + (picked ? ' picked' : '') + '" data-act="answer" data-i="' + oi + '"' + (isCurrent ? '' : ' disabled') + '>' + esc(o) + '</button>';
        }).join('');
        return '<div class="q-block"><div class="q-text">' + esc(st.q) + '</div><div class="opts">' + opts + '</div>' +
          (!isCurrent && cl.answers[i] !== undefined ? '<div class="picked-note">已选：' + esc(st.options[cl.answers[i]]) + '</div>' : '') + '</div>';
      }).join('');
      body = '<div class="ai-block"><div class="ai-head"><span class="ai-name">澄清助手</span>' +
        '<span class="ai-desc">' + (c.lang === 'en' ? '已给出中文译文，先按语义澄清' : '先按语义澄清这条意见') + '</span></div>' + steps + '</div>';
    } else {
      var editBlock = cl.editing
        ? '<textarea class="edit-area" id="intent-edit">' + esc(cl.intentText) + '</textarea>' +
          '<div class="intent-actions"><button class="btn primary sm" data-act="save-intent">保存</button>' +
          '<button class="btn quiet sm" data-act="cancel-edit">取消</button></div>'
        : '<div class="intent-text">' + esc(cl.intentText) + '</div>';
      var actions = cl.readOnly
        ? '<div class="intent-actions"><button class="btn quiet sm" data-act="back">返回收件箱</button></div>'
        : '<div class="intent-actions"><button class="btn primary sm" data-act="confirm-intent">确认加入线程</button>' +
          (cl.editing ? '' : '<button class="btn quiet sm" data-act="edit-intent">改写</button>') + '</div>';
      body = '<div class="ai-block"><div class="ai-head"><span class="ai-name">澄清助手</span>' +
        '<span class="ai-desc">' + (cfg.quick ? '可一步生成修改意图' : '已生成修改意图') + '</span></div>' +
        '<div class="intent-card"><div class="intent-label">修改意图</div>' +
        editBlock +
        '<div class="intent-meta">' +
          (cfg.intent.tcode ? '<span class="num">' + cfg.intent.tcode + '</span>' : '') +
          '<span>' + esc(cfg.intent.tag) + '</span>' +
        '</div>' + actions + '</div></div>';
    }
    return head + orig + body + '</div></div>';
  }

  function compareHTML() {
    if (S.intents.length === 0) {
      return '<div class="center-scroll"><div class="empty">先澄清意见、生成修改任务，再回到这里对照 v1 与 v2。' +
        '<div style="margin-top:12px"><button class="btn sm" data-act="tab" data-view="inbox">去意见收件箱</button></div></div></div>';
    }
    var colHead = function (v) {
      return '<div class="cmp-col-head"><b>' + v.label + '</b><span>' + v.meta + '</span></div>';
    };
    var cells = function (side) {
      return M.compare.frames.map(function (f) {
        var d = f[side];
        var flag = d.flag ? ' flag-' + d.flag : '';
        return '<div class="board-cell' + flag + '">' +
          '<div class="art">' + sceneSVG(d.scene) + '</div>' +
          '<div class="cap"><span>' + d.tcode + '</span><b>' + esc(d.cap) + '</b></div></div>';
      }).join('');
    };
    var duo = '<div class="cmp-duo">' +
      '<div class="cmp-col">' + colHead(M.compare.v1) + '<div class="board">' + cells('v1') + '</div></div>' +
      '<div class="cmp-col">' + colHead(M.compare.v2) + '<div class="board">' + cells('v2') + '</div></div>' +
      '</div>';

    var marks = M.compare.markers.filter(function (mk) { return !!intentById(mk.intentId); });
    var pos = { i1: '10%', i2: '38%', i4: '58%', i3: '86%' };
    var timeline = '<div class="timeline"><div class="tl-title">v2 相对 v1 的改动点</div>' +
      '<div class="tl-track">' + marks.map(function (mk) {
        return '<span class="tl-mark ' + mk.ai + '" style="left:' + (pos[mk.intentId] || '50%') + '"></span>';
      }).join('') + '</div>' +
      '<div class="tl-labels">' + marks.map(function (mk) {
        return '<div class="tl-item c-' + mk.ai + '"><span class="t">' + mk.t + '</span><b>' + esc(mk.label) + '</b></div>';
      }).join('') + '</div></div>';

    var matrix = '<div class="matrix"><div class="matrix-head"><span class="mt">意图覆盖判断</span>' +
      '<span class="note">点击状态可改判，AI 初判会保留</span></div>' +
      S.intents.map(function (it) {
        var overridden = it.coverage !== it.ai;
        return '<div class="mrow"><div class="mtext">' +
          (it.tcode ? '<span class="mt-code">' + it.tcode + '</span>' : '') + esc(it.text) +
          (overridden ? '<div class="ai-note">AI 初判：' + COVER_LABEL[it.ai] + '，已由人工改判</div>' : '') +
          '</div><button class="cov ' + it.coverage + '" data-act="cov" data-id="' + it.id + '">' + COVER_LABEL[it.coverage] + '</button></div>';
      }).join('') + '</div>';

    return '<div class="center-scroll">' +
      '<div class="cmp-head"><span class="cmp-title">版本对照</span>' +
      '<span class="cmp-note">EP' + M.project.current + '</span><span class="cmp-note">v1 与 v2 的改动点</span></div>' +
      duo + timeline + matrix + '</div>';
  }

  function panelHTML() {
    var cc = counts();
    var html = '<div class="panel-scroll">';
    html += '<div class="pgroup"><div class="pgroup-head"><span class="pt">审片线程</span><span class="pc">EP' + M.project.current + '</span></div>' +
      '<div class="thread-meta">' +
      '<div class="row"><span class="k">剧集</span><span>' + M.project.drama + ' ' + M.project.cut + '</span></div>' +
      '<div class="row"><span class="k">意见</span><span>5 条，已澄清 ' + cc.clarified + '，待澄清 ' + cc.pending + '</span></div>' +
      '<div class="row"><span class="k">采用版本</span><span>' + (S.accepted ? 'v2，已确认' : '尚未确认') + '</span></div>' +
      '</div></div>';

    html += '<div class="pgroup"><div class="pgroup-head"><span class="pt">修改意图</span><span class="pc">' + S.intents.length + '</span></div>';
    html += S.intents.length === 0
      ? '<div class="empty">澄清一条意见后，可追踪的修改意图会出现在这里。</div>'
      : S.intents.map(function (it) {
          return '<div class="intent-row"><div class="it">' + esc(it.text) + '</div><div class="im">' +
            (it.tcode ? '<span class="num">' + it.tcode + '</span>' : '') +
            '<span>' + esc(it.tag) + '</span>' +
            '<span class="c-' + it.coverage + '">' + COVER_LABEL[it.coverage] + '</span>' +
            '</div></div>';
        }).join('');
    html += '</div>';

    html += '<div class="pgroup"><div class="pgroup-head"><span class="pt">修改任务</span>' +
      (S.tasks.length ? '<span class="pc">' + S.tasks.length + '</span>' : '') + '</div>';
    if (S.taskGen === 'done' || S.tasks.length) {
      html += S.tasks.map(function (t) {
        var stCls = t.status === 'done' ? 'done' : t.status === 'doing' ? 'doing' : 'todo';
        return '<div class="task-row"><span class="t-avatar">' + t.avatar + '</span>' +
          '<div class="tt"><div class="t1">' + esc(t.title) + '</div><div class="t2">' + esc(t.assignee) + '</div></div>' +
          '<span class="tstate ' + stCls + '">' + t.statusText + '</span></div>';
      }).join('');
    } else if (S.taskGen === 'loading') {
      html += '<div class="loading">正在生成修改任务<span class="pbar" aria-hidden="true"></span></div>';
    } else {
      if (S.taskGen === 'failed') html += '<div class="empty">上次生成失败，服务超时。</div>';
      html += '<div style="margin-top:4px"><button class="btn ' + (S.intents.length ? 'primary' : '') + ' sm" data-act="gen-tasks"' + (S.intents.length ? '' : ' disabled') + '>' +
        (S.taskGen === 'failed' ? '重试生成' : '生成修改任务') + '</button></div>';
    }
    html += '</div>';

    html += '<div class="pgroup"><div class="pgroup-head"><span class="pt">决策</span></div>';
    if (S.completed) {
      html += '<div class="done-banner"><div class="dt">本轮闭环完成</div>' +
        '5 条意见全部澄清，' + processed() + ' 条已随 v2 处理，1 条待 EP14 补拍；2 条澄清话术已沉淀到术语库。</div>';
    } else if (!S.tasks.length) {
      html += '<div class="empty">生成修改任务后，可在这里确认采用版本。</div>';
    } else if (!S.accepted) {
      html += '<button class="btn primary sm" data-act="accept">确认采用 v2</button>';
    } else {
      html += '<div class="thread-meta" style="margin-bottom:12px"><div class="row"><span class="k">采用版本</span><span>v2，已记录决策</span></div>' +
        '<div class="row"><span class="k">时间</span><span>周一 11:40</span></div></div>' +
        '<button class="btn sm" data-act="export">导出客户处理说明</button>';
    }
    html += '</div>';

    html += '</div>';
    return html;
  }

  /* ---------- 浮层 ---------- */
  function toast(type, msg, action) {
    var root = $('#toast-root');
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<span class="tx">' + esc(msg) + '</span>' +
      (action ? '<button class="btn quiet sm" data-act="' + action.act + '">' + esc(action.label) + '</button>' : '');
    root.appendChild(el);
    setTimeout(function () { el.classList.add('leaving'); setTimeout(function () { el.remove(); }, 220); }, action ? 8000 : 4200);
  }
  function closeModal() { var r = $('#modal-root'); r.classList.remove('open'); r.innerHTML = ''; }

  function openExport() {
    T.exportReady = false;
    var root = $('#modal-root');
    root.classList.add('open');
    root.innerHTML = '' +
      '<div class="modal"><div class="modal-head"><span class="modal-title">客户处理说明</span><span class="spacer"></span>' +
      '<button class="icon-btn" data-act="modal-close" aria-label="关闭"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="modal-body" id="export-body"><div class="loading">正在根据本轮决策生成处理说明<span class="pbar" aria-hidden="true"></span></div></div>' +
      '<div class="modal-foot"><button class="btn sm" data-act="copy">复制文本</button>' +
      '<button class="btn primary sm" data-act="modal-close">完成</button></div></div>';
    setTimeout(function () {
      if (!root.classList.contains('open')) return;
      T.exportReady = true;
      var body = $('#export-body');
      if (body) body.innerHTML = '<div class="copy-hint">将以下内容发给 ' + esc(M.project.platform) + ' 审片组，客户无需登录本产品。</div>' +
        '<div class="exported-text" id="export-text">' + esc(exportText()) + '</div>';
    }, 700);
  }

  function exportText() {
    var L = [];
    L.push('《逆光》EP' + M.project.current + ' 修改处理说明 · ' + (S.accepted || 'v2') + '（提交版）');
    L.push('致：繁星短剧审片组');
    L.push('');
    S.comments.forEach(function (c, i) {
      var it = intentOfComment(c.id);
      var name = c.translation ? c.translation : c.text;
      L.push((i + 1) + '. 「' + name + '」');
      if (!it) L.push('   待澄清，将于下一轮一并处理');
      else if (it.coverage === 'covered') L.push('   已处理：' + it.text);
      else if (it.coverage === 'partial') L.push('   已处理（部分）：' + it.text + '；请复审确认');
      else L.push('   已澄清为：' + it.text + '；本轮未处理，待 EP14 补拍后一并提交');
      L.push('');
    });
    L.push('备注：本轮采用 ' + (S.accepted || 'v2') + ' 作为提交版本；修改决策记录随附，未达成意图的处置见记录。');
    L.push('导出：逆光项目组 · 周一 11:40 · 剪意 ClearCut');
    return L.join('\n');
  }

  function copyExport() {
    if (!T.exportReady) { toast('info', '说明还在生成中，稍等一下'); return; }
    var text = exportText();
    function done() { toast('ok', '已复制到剪贴板'); }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove(); done();
      } catch (e) { toast('err', '复制失败，请手动选择文本复制'); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
  }

  /* ============================================================ 动作 */
  function openComment(id) {
    var c = cmt(id); if (!c) return;
    var cfg = cfgOf(id); if (!cfg) return;
    var saved = intentOfComment(id);
    S.view = 'clarify';
    S.currentCommentId = id;
    S.cler = {
      phase: 'ask', stepIndex: 0, answers: [], editing: false,
      intentText: (c.status !== 'pending' && saved) ? saved.text : cfg.intent.text,
      readOnly: c.status !== 'pending'
    };
    if (S.cler.readOnly) S.cler.phase = 'intent';
    if (cfg.lowConfidence && !S.cler.readOnly) S.cler.phase = 'lowconf';
    if (cfg.quick && !S.cler.readOnly) {
      S.cler.phase = 'thinking';
      var cid = id;
      setTimeout(function () {
        if (S.currentCommentId === cid && S.cler && S.cler.phase === 'thinking') { S.cler.phase = 'intent'; render(); }
      }, 520);
    }
    commit();
  }

  function pickAnswer(i) {
    var cid = S.currentCommentId; var cfg = cfgOf(cid); var cl = S.cler;
    if (!cfg || !cl || cl.phase !== 'ask') return;
    cl.answers[cl.stepIndex] = i;
    if (cl.stepIndex < cfg.steps.length - 1) {
      cl.phase = 'thinking'; render();
      var si = cl.stepIndex;
      setTimeout(function () {
        if (S.currentCommentId === cid && S.cler && S.cler.phase === 'thinking') {
          S.cler.stepIndex = si + 1; S.cler.phase = 'ask'; render(); save();
        }
      }, 640);
    } else {
      cl.phase = 'thinking'; render();
      setTimeout(function () {
        if (S.currentCommentId === cid && S.cler && S.cler.phase === 'thinking') { S.cler.phase = 'intent'; render(); save(); }
      }, 900);
    }
    save();
  }

  function pickAnchor(i) {
    var cid = S.currentCommentId; var cl = S.cler;
    if (!cl || cl.phase !== 'lowconf') return;
    cl.phase = 'thinking'; render();
    setTimeout(function () {
      if (S.currentCommentId === cid && S.cler && S.cler.phase === 'thinking') { S.cler.phase = 'intent'; render(); save(); }
    }, 820);
    save();
  }

  function addIntent(cid) {
    if (intentOfComment(cid)) return null;
    var cfg = cfgOf(cid); if (!cfg) return null;
    var text = (S.cler && S.currentCommentId === cid && S.cler.intentText ? S.cler.intentText : cfg.intent.text).trim();
    var it = {
      id: 'i' + cid.slice(1),
      commentId: cid,
      text: text || cfg.intent.text,
      tcode: cfg.intent.tcode,
      tag: cfg.intent.tag,
      ai: AI_COVER[cid],
      coverage: AI_COVER[cid]
    };
    S.intents.push(it);
    var c = cmt(cid); if (c) c.status = 'clarified';
    return it;
  }

  function confirmIntent() {
    var cid = S.currentCommentId; if (!cid) return;
    addIntent(cid);
    S.view = 'inbox'; S.currentCommentId = null; S.cler = null;
    commit();
  }

  function quickAll() {
    var pairs = ['c4', 'c5'].filter(function (cid) { return cmt(cid) && cmt(cid).status === 'pending'; });
    if (!pairs.length) return;
    addIntent(pairs[0]);
    commit();
    if (pairs[1]) {
      setTimeout(function () { addIntent(pairs[1]); save(); render(); toast('ok', '已批量确认 2 条修改意图'); }, 380);
    } else save();
  }

  function genTasks() {
    if (S.taskGen === 'loading') return;
    if (!S.intents.length) { toast('err', '还没有可派发的修改意图'); return; }
    S.taskGen = 'loading'; render(); save();
    setTimeout(function () {
      if (S.taskGen !== 'loading') return;
      if (!S.taskGenFailedOnce) {
        S.taskGenFailedOnce = true;
        S.taskGen = 'failed';
        commit();
        toast('err', '任务生成失败，生成服务超时', { label: '重试', act: 'gen-tasks' });
      } else {
        S.tasks = M.tasks.filter(function (t) { return !!intentById(t.intentId); })
          .map(function (t) { return Object.assign({}, t); });
        ['c1', 'c2', 'c5'].forEach(function (cid) {
          if (intentOfComment(cid)) { var c = cmt(cid); if (c) c.status = 'tasked'; }
        });
        S.taskGen = 'done';
        S.step = 2;
        commit();
        toast('ok', '已生成 ' + S.tasks.length + ' 个修改任务并派发');
      }
    }, 950);
  }

  function cycleCoverage(iid) {
    var it = intentById(iid); if (!it) return;
    var idx = COVER_ORDER.indexOf(it.coverage);
    it.coverage = COVER_ORDER[(idx + 1) % COVER_ORDER.length];
    commit();
  }

  function acceptCut() {
    if (!S.tasks.length) return;
    S.accepted = 'v2'; S.step = 3;
    commit();
    toast('ok', '已确认采用 v2，决策记录已生成');
  }

  /* ============================================================ 事件 */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');
    var id = el.getAttribute('data-id');
    var i = el.getAttribute('data-i');
    switch (act) {
      case 'tab': S.view = el.getAttribute('data-view'); commit(); break;
      case 'open': openComment(id); break;
      case 'back': S.view = 'inbox'; S.currentCommentId = null; S.cler = null; commit(); break;
      case 'answer': pickAnswer(Number(i)); break;
      case 'anchor': pickAnchor(Number(i)); break;
      case 'edit-intent': if (S.cler) { S.cler.editing = true; render(); } break;
      case 'cancel-edit': if (S.cler) { S.cler.editing = false; render(); } break;
      case 'save-intent': {
        var ta = $('#intent-edit');
        if (S.cler && ta) { S.cler.intentText = ta.value; S.cler.editing = false; commit(); }
        break;
      }
      case 'confirm-intent': confirmIntent(); break;
      case 'quick-all': quickAll(); break;
      case 'gen-tasks': genTasks(); break;
      case 'cov': cycleCoverage(id); break;
      case 'accept': acceptCut(); break;
      case 'export': openExport(); break;
      case 'copy': copyExport(); break;
      case 'modal-close':
        closeModal();
        if (S.accepted && !S.completed) {
          S.exported = true; S.completed = true; S.termExtra = 2;
          commit();
          toast('ok', '本轮闭环完成，2 条澄清话术已沉淀到术语库');
        }
        break;
      case 'dismiss-hint': S.hintDismissed = true; commit(); break;
      case 'reset':
        if (window.confirm('重置演示到初始状态？')) {
          try { localStorage.removeItem(KEY); } catch (e2) {}
          S = initialState();
          closeModal();
          render();
        }
        break;
      case 'termbase':
        toast('info', '术语库：' + (M.termBase.count + S.termExtra) + ' 条常用澄清话术与译名规范（演示数据）');
        break;
      case 'ep':
        toast('info', '演示版本仅包含 EP' + M.project.current + ' 的数据');
        break;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $('#modal-root').classList.contains('open')) closeModal();
  });

  /* 演示直达：#/played 一步到走完流程的状态，#/compare 到有数据但未采用的状态。
     用于演示、录屏与自动截图，确定性种子，不改变正常路径。 */
  function seedFromHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    if (h !== 'played' && h !== 'compare') return;
    ['c1', 'c2', 'c3', 'c4', 'c5'].forEach(function (cid) { addIntent(cid); });
    S.tasks = M.tasks.map(function (t) { return Object.assign({}, t); });
    ['c1', 'c2', 'c5'].forEach(function (cid) { var c = cmt(cid); if (c) c.status = 'tasked'; });
    S.taskGen = 'done';
    S.hintDismissed = true;
    S.step = 3;
    S.view = 'compare';
    if (h === 'played') { S.accepted = 'v2'; S.exported = true; S.completed = true; S.termExtra = 2; }
    save();
  }
  seedFromHash();

  render();
})();
