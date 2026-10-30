const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const OUT = path.join(__dirname, 'out', 'v5'); fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.APP_URL || 'http://127.0.0.1:5173/';
const fails = [];
function check(name, ok) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) fails.push(name); }

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const mk = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('PAGE-ERR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERR: ' + m.text()); });
    return { ctx, page };
  };
  const w = (p, ms) => p.waitForTimeout(ms);
  const btn = (p, t, exact) => p.getByRole('button', { name: t, exact: !!exact }).first();
  const lab = (p, t) => p.locator('label').filter({ hasText: t }).first();
  const shot = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });
  const visible = async (loc) => { try { return await loc.first().isVisible(); } catch { return false; } };
  const fresh = async (page, url) => {
    for (let i = 0; i < 25; i++) { try { await page.goto(url, { timeout: 10000 }); break; } catch { await w(page, 1500); } }
    await page.evaluate(() => localStorage.clear());
    await page.reload({ timeout: 15000 });
    await w(page, 2600);
  };
  const clarifyC1 = async (page, degree) => {
    await btn(page, '澄清这条意见').click(); await w(page, 1000);
    await lab(page, '开场抓力').click(); await w(page, 1300);
    await lab(page, degree).click(); await w(page, 3200);
  };

  /* ---------- A. 主链路（默认：任务生成直接成功） ---------- */
  {
    const { ctx, page } = await mk();
    await fresh(page, BASE);
    check('A5 入口一开始就出现', await visible(page.getByText('第 4、5 条指向具体位置')));
    check('A5 批量按钮文案', await visible(btn(page, '确认这 2 条修改意图')));
    await shot(page, '01-strip');

    await clarifyC1(page, '压缩到 8 秒内');
    await btn(page, '确认加入线程').click(); await w(page, 1400);
    await btn(page, '澄清这条意见').click(); await w(page, 1000);
    await lab(page, '医院戏，奶奶').click(); await w(page, 1300);
    await lab(page, '哽咽但克制').click(); await w(page, 2600);
    await btn(page, '确认加入线程').click(); await w(page, 1400);
    await btn(page, '澄清这条意见').click(); await w(page, 1000);
    await lab(page, '结尾缺少钩子，收得太快').click(); await w(page, 2600);
    await btn(page, '确认加入线程').click(); await w(page, 1500);

    await btn(page, '确认这 2 条修改意图').click(); await w(page, 1800);
    await btn(page, '生成修改任务').click(); await w(page, 2800);
    check('A6 默认路径直接成功', await visible(page.getByText('「别走」口型对齐修复')));
    check('A6 默认路径无重试入口', (await page.getByRole('button', { name: '重试生成' }).count()) === 0);
    check('A6 成功提示', await visible(page.getByRole('heading', { name: /已生成 4 个修改任务/ })));
    await shot(page, '02-tasks');

    await btn(page, '版本对照', true).click(); await w(page, 2200);
    check('A7 交回提示', await visible(page.getByText('修改人员已交回 v2')));
    check('A7 任务状态已更新', await visible(page.getByText('已交回，待复审')));
    check('A7 素材事实声明', await visible(page.getByText('灰阶分镜仅用于定位示意')));

    const i4row = page.locator('[data-mrow]').filter({ hasText: '口型对齐修复' });
    check('A8 依据展示', await visible(i4row.getByText('依据：口型对齐检测记录')));
    await i4row.getByRole('button', { name: '部分覆盖', exact: true }).click(); await w(page, 800);
    check('A8 初判保留提示', await visible(i4row.getByText('AI 初判：已覆盖（保留）')));
    await i4row.getByLabel('复核依据').fill('抽检仍需重看后半句'); await w(page, 400);
    await i4row.getByPlaceholder('填写已确认的安排').fill('下周一复听后半句'); await w(page, 500);
    await shot(page, '03-conclusion');

    await btn(page, '确认采用 v2').click(); await w(page, 1600);
    await btn(page, '导出客户处理说明').click(); await w(page, 2600);
    const exA = await page.locator('pre').first().textContent();
    check('A9 导出含复核依据', !!exA && exA.includes('复核依据：抽检仍需重看后半句'));
    check('A9 导出含后续处置', !!exA && exA.includes('后续处置：下周一复听后半句'));
    await btn(page, '复制文本').click(); await w(page, 1200);
    check('A9 复制反馈为按钮文案', await visible(btn(page, '已复制，再次复制')));
    await btn(page, '完成', true).click(); await w(page, 1600);
    check('A9 主区域完成反馈', await visible(page.getByText('本轮验收完成')));
    check('A9 计数按最终记录', await visible(page.getByText('已覆盖 2 · 部分覆盖 2 · 未覆盖 1')));
    check('A9 已复制状态', await visible(page.getByText('已复制，可发送客户')));
    check('R2 完成后仍可查看处理说明', await visible(btn(page, '查看 / 复制处理说明')));
    await shot(page, '04-completed');

    await page.reload({ timeout: 15000 }); await w(page, 2600);
    check('持久化：完成态仍在', await visible(page.getByText('本轮验收完成')));
    check('持久化：依据被保存', (await page.locator('[data-mrow]').filter({ hasText: '口型对齐修复' }).getByLabel('复核依据').inputValue()) === '抽检仍需重看后半句');
    await shot(page, '05-persist');
    await ctx.close();
  }

  /* ---------- B. 分支链路：只提速 ---------- */
  {
    const { ctx, page } = await mk();
    await fresh(page, BASE);
    await clarifyC1(page, '只提速，不改结构');
    const intentText = await page.locator('[data-intent-text]').first().textContent();
    check('分支意图含提速', !!intentText && intentText.includes('提速约三成'));
    check('分支意图不含压缩', !!intentText && !intentText.includes('压缩至 8 秒内'));
    await shot(page, '06-branch-intent');
    await btn(page, '确认加入线程').click(); await w(page, 1400);

    await btn(page, '确认这条').click(); await w(page, 900);
    check('A5 单条确认后剩 1 条', await visible(btn(page, '确认这 1 条修改意图')));
    await btn(page, '确认这 1 条修改意图').click(); await w(page, 1500);
    check('A5 全部确认后入口消失', (await page.getByText('指向具体位置').count()) === 0);

    await btn(page, '澄清这条意见').click(); await w(page, 1000);
    await lab(page, '医院戏，奶奶').click(); await w(page, 1300);
    await lab(page, '哽咽但克制').click(); await w(page, 2600);
    await btn(page, '确认加入线程').click(); await w(page, 1400);
    await btn(page, '澄清这条意见').click(); await w(page, 1000);
    await lab(page, '结尾缺少钩子，收得太快').click(); await w(page, 2600);
    await btn(page, '确认加入线程').click(); await w(page, 1500);
    await btn(page, '生成修改任务').click(); await w(page, 2800);
    check('分支任务标题', await visible(page.getByText('开场提速（结构保留）')));
    await btn(page, '版本对照', true).click(); await w(page, 2600);
    check('分支对照标注', await visible(page.getByText('开场提速至 10.5s，结构保留')));
    check('分支 v2 时长', await visible(page.getByText('10.5 秒')));
    await btn(page, '确认采用 v2').click(); await w(page, 1600);
    await btn(page, '导出客户处理说明').click(); await w(page, 2600);
    const ex = await page.locator('pre').first().textContent();
    check('导出含提速表述', !!ex && ex.includes('提速约三成'));
    check('导出不再出现压缩措辞', !!ex && !ex.includes('压缩至 8 秒内'));
    await shot(page, '07-branch-export');
    await ctx.close();
  }

  /* ---------- C. 直达链接 ---------- */
  {
    const { ctx, page } = await mk();
    await page.goto(BASE + '#/played', { timeout: 20000 });
    await page.reload({ timeout: 15000 });
    await w(page, 2800);
    check('played：完成计数', await visible(page.getByText('已覆盖 3 · 部分覆盖 1 · 未覆盖 1')));
    check('played：已复制', await visible(page.getByText('已复制，可发送客户')));
    check('played：任务为交回态', await visible(page.getByText('已完成，已交回')));
    check('played：保留查看入口', await visible(btn(page, '查看 / 复制处理说明')));
    await shot(page, '08-played');
    await page.goto(BASE + '#/compare', { timeout: 20000 });
    await page.reload({ timeout: 15000 });
    await w(page, 2800);
    check('compare：未采用状态', await visible(btn(page, '确认采用 v2')) && (await page.getByText('本轮验收完成').count()) === 0);
    check('compare：已交回提示', await visible(page.getByText('修改人员已交回 v2')));
    await ctx.close();
  }

  /* ---------- D. 提示可关闭（含多条分别关闭） ---------- */
  {
    const { ctx, page } = await mk();
    await fresh(page, BASE);
    await btn(page, '术语库').click(); await w(page, 350);
    await btn(page, '术语库').click(); await w(page, 700);
    const toasts = page.locator('[role="dialog"]').filter({ hasText: '常用澄清话术' });
    check('D 两条提示同时存在', (await toasts.count()) === 2);
    await toasts.first().hover(); await w(page, 500);
    await toasts.first().getByRole('button', { name: '关闭提示' }).click(); await w(page, 900);
    check('D 第一条关闭后剩一条', (await toasts.count()) === 1);
    check('D 业务步骤保持不变', await visible(page.getByText('第 4、5 条指向具体位置')));
    await shot(page, '09-toast-closed');
    await toasts.first().hover(); await w(page, 400);
    await toasts.first().getByRole('button', { name: '关闭提示' }).click(); await w(page, 900);
    check('D 第二条单独关闭', (await toasts.count()) === 0);
    await ctx.close();
  }

  /* ---------- E. 1280 溢出 ---------- */
  {
    const { ctx, page } = await mk();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(BASE + '#/compare', { timeout: 20000 });
    await page.reload({ timeout: 15000 });
    await w(page, 2600);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('1280 无横向溢出', overflow === 0);
    await ctx.close();
  }

  /* ---------- F. 失败分支按需复现：?fail=1 ---------- */
  {
    const { ctx, page } = await mk();
    await fresh(page, BASE + '?fail=1');
    await btn(page, '确认这 2 条修改意图').click(); await w(page, 1800);
    await btn(page, '生成修改任务').click(); await w(page, 2800);
    check('F 失败分支：面板显示原因与重试', await visible(page.getByText('上次生成失败，服务超时')) && await visible(btn(page, '重试生成')));
    check('F 失败分支：提示不带操作', (await page.getByRole('button', { name: '重试', exact: true }).count()) === 0 && await visible(page.getByRole('heading', { name: /任务生成失败/ })));
    await shot(page, '10-fail-branch');
    await btn(page, '重试生成').click(); await w(page, 2800);
    check('F 失败分支：重试成功', await visible(page.getByText('「别走」口型对齐修复')));
    check('F 失败分支：意图保留', await visible(page.getByText('台词口型对齐修复')));
    await ctx.close();
  }

  /* ---------- G. 待补充语义（GPT R3/R4 冒烟） ---------- */
  {
    const { ctx, page } = await mk();
    await fresh(page, BASE);
    await clarifyC1(page, '压缩到 8 秒内');
    await btn(page, '确认加入线程').click(); await w(page, 1400);
    await btn(page, '澄清这条意见').click(); await w(page, 1000);
    await lab(page, '其他场景').click(); await w(page, 1300);
    await lab(page, '只提清晰度，情绪不动').click(); await w(page, 2600);
    check('G 待补充按钮文案', await visible(btn(page, '暂存待补充')));
    await btn(page, '暂存待补充').click(); await w(page, 1400);
    check('G 待补充计入待澄清', await visible(page.getByText('已澄清 1，待澄清 4')));
    await btn(page, '生成修改任务').click(); await w(page, 2800);
    check('G 待补充不派发', (await page.locator('[data-task-row]').count()) === 1);
    await btn(page, '版本对照', true).click(); await w(page, 2200);
    check('G 对照页提示待补充', await visible(page.getByText('待补充或澄清，尚未派发')));
    check('G 待补充行标记', await visible(page.getByText('待补充，未派发')));
    await btn(page, '确认采用 v2').click(); await w(page, 1600);
    await btn(page, '导出客户处理说明').click(); await w(page, 2600);
    const exG = await page.locator('pre').first().textContent();
    check('G 导出写明待补充且不承诺补拍', !!exG && exG.includes('待补充：') && !exG.includes('EP14 补拍'));
    await shot(page, '11-needs-info');
    await ctx.close();
  }

  await browser.close();
  console.log('FAILS: ' + (fails.length ? fails.join(' | ') : 'none'));
  if (fails.length) process.exit(1);
  console.log('ALL-OK');
})().catch(e => { console.error('FATAL ' + e); process.exit(1); });
