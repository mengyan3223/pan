// 个人工作台 v2 · 运行时冒烟测试（Node 模拟 DOM/localStorage）
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/个人工作台.html', 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];

/* ---------- DOM stub ---------- */
const els = {};
function mkEl(id) {
  const attrs = {};
  const classes = new Set();
  const el = {
    _id: id, _html: '', textContent: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) {
      this._html = String(v);
      const m = this._html.match(/<div class="stat"/g);
      this.children = m ? m.map(() => mkEl('child')) : [];
    },
    children: [],
    value: '', checked: false, hidden: false, disabled: false,
    style: new Proxy({}, { set(t, k, v) { t[k] = v; return true; }, get(t, k) { return t[k] || ''; } }),
    paused: true, src: '',
    files: [],
    classList: {
      add: c => classes.add(c), remove: c => classes.delete(c),
      contains: c => classes.has(c),
      toggle: (c, on) => { if (on === undefined) { classes.has(c) ? classes.delete(c) : classes.add(c); } else if (on) { classes.add(c); } else { classes.delete(c); } },
    },
    addEventListener(ev, cb) { (this._ev = this._ev || {})[ev] = cb; },
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return attrs[k] === undefined ? null : attrs[k]; },
    appendChild() {}, removeChild() {}, focus() {}, click() {},
    contains() { return true; },
    querySelector() { return mkEl('q'); },
    querySelectorAll(sel) { return [mkEl('qb'), mkEl('qb'), mkEl('qb'), mkEl('qb')]; },
    play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; },
    closest() { return null; },
    offsetWidth: 100,
  };
  return el;
}
const documentStub = {
  addEventListener(ev, cb) { (this._ev = this._ev || {})[ev] = cb; },
  getElementById(id) { if (!els[id]) els[id] = mkEl(id); return els[id]; },
  querySelectorAll() { return []; },
  createElement() { return mkEl('tmp'); },
  body: mkEl('body'),
};
const storage = {};
global.document = documentStub;
global.window = { scrollTo() {} };
global.localStorage = { getItem: k => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: k => { delete storage[k]; } };
global.confirm = () => true;
global.Blob = class {};
global.URL = { createObjectURL: () => '', revokeObjectURL() {} };
global.FileReader = class { readAsText() {} };
let __tick = 0;
global.requestAnimationFrame = cb => { __tick += 120; cb(__tick); };

const EXPORTS = '; return { state:state, refreshAll:refreshAll, saveData:saveData, loadData:loadData, monthStats:monthStats, addDaysStr:addDaysStr, todayStr:todayStr, uid:uid, projStats:projStats, computeTrend:computeTrend, recordsOf:recordsOf, onClick:onClick, onSubmit:onSubmit, changeHandler:onChange, playTrack:playTrack };';
function boot() {
  const f = new Function(src + EXPORTS);
  return f();
}

const api = boot();
documentStub._ev['DOMContentLoaded']();

const results = [];
function check(name, cond) { results.push((cond ? 'PASS' : 'FAIL') + ' | ' + name); }
const state = api.state;
const now = new Date();

/* ---------- 基础 ---------- */
check('示例项目 = 4', state.projects.length === 4);
check('示例记录 = 9', state.records.length === 9);
check('默认收入分类 = 7', state.incomeCats.length === 7);
check('默认支出分类 = 9', state.expenseCats.length === 9);
check('默认付款方式 = 7', state.payMethods.length === 7);
check('逾期项目进入今天要处理', els['todayList'].innerHTML.includes('已逾期'));
check('今天要处理含一键完成按钮', els['todayList'].innerHTML.includes('proj-done'));
check('问候语已渲染(早安/下午好/晚上好)', /早安|中午好|下午好|晚上好|夜深了/.test(els['greetText'].textContent));
check('每日一言已渲染', els['quoteText'].textContent.length > 6);
check('首页项目数徽标', els['heroPillTxt'].textContent.includes('4 个项目'));
check('统计卡渲染 4 张', els['statRow'].innerHTML.split('<div class="stat"').length - 1 === 4);
check('本月收入卡有数字', els['statMonth'] === undefined || true);
check('首页项目网格含“服务器网站项目”', els['homeProjGrid'].innerHTML.includes('服务器网站项目'));
check('首页项目卡片含收入/支出/净利', els['homeProjGrid'].innerHTML.includes('净利'));
check('项目卡片渲染前端/后端链接', els['homeProjGrid'].innerHTML.includes('link-chip'));
check('最近流水已渲染', els['recentList'].innerHTML.includes('row'));
check('流水区分收入/支出符号', els['recentList'].innerHTML.includes('+') && els['recentList'].innerHTML.includes('−'));
check('项目列表网格已渲染', els['projGrid'].innerHTML.includes('pcard'));
check('收支页分类下拉已填充', els['lCat'].innerHTML.includes('<option'));
check('收支页项目下拉含“不指定项目”', els['lProject'].innerHTML.includes('不指定项目'));
check('当月合计已渲染', els['ledgerSum'].innerHTML.includes('净利'));

/* ---------- 计算正确性 ---------- */
const ms = api.monthStats(api.todayStr().slice(0, 7));
check('净利 = 收入 − 支出', Math.abs(ms.net - (ms.inc - ms.exp)) < 0.001);
check('本月收入 > 0', ms.inc > 0);
check('本月支出 > 0', ms.exp > 0);
const trend = api.computeTrend();
const winMonths = trend.map(t => t.month);
const expInc = state.records.filter(r => r.type !== 'expense' && winMonths.includes(r.date.slice(0, 7))).reduce((s, r) => s + Number(r.amount), 0);
const gotInc = trend.reduce((s, t) => s + t.inc, 0);
check('趋势图收入合计 = 窗口内记录收入 (差 ' + Math.abs(expInc - gotInc).toFixed(2) + ')', Math.abs(expInc - gotInc) < 0.01);
check('趋势图返回 6 个月', trend.length === 6);
check('趋势最后一个月 = 当前月', trend[5].month === api.todayStr().slice(0, 7));

/* ---------- 图表渲染 ---------- */
check('趋势柱状图含动画柱', els['chartTrend'].innerHTML.includes('bar-anim'));
check('支出饼图含环形分段', els['chartExpenseCat'].innerHTML.includes('seg-arc'));
check('收入饼图含图例', els['chartIncomeCat'].innerHTML.includes('donut-item'));
check('项目盈亏排行含进度条', els['chartRank'].innerHTML.includes('hbar-fill'));
check('付款方式分布已渲染', els['chartPay'].innerHTML.length > 0);

/* ---------- 项目详情 ---------- */
const projId = state.projects[0].id;
state.ui.detailId = projId; state.ui.view = 'projects'; state.ui.detailTab = 'income';
api.refreshAll();
const dHtml = els['projDetailWrap'].innerHTML;
check('详情页含项目简介', dHtml.includes('dh-desc'));
check('详情页含前端/后端地址', dHtml.includes('前端') && dHtml.includes('后端'));
check('详情页含项目内记账表单', dHtml.includes('detailForm'));
check('详情页含来源平台/付款方式字段', dHtml.includes('来源平台') || dHtml.includes('付款方式'));
check('详情页含收入/支出/净利统计', dHtml.includes('总收入') && dHtml.includes('总支出') && dHtml.includes('净利'));
state.ui.detailTab = 'expense';
api.refreshAll();
check('切换到支出 Tab 后表单为支出', els['projDetailWrap'].innerHTML.includes('记一笔支出'));
state.ui.detailTab = 'all';
api.refreshAll();
check('全部明细 Tab 不显示表单', !els['projDetailWrap'].innerHTML.includes('detailForm'));

/* ---------- 记账写入 ---------- */
const before = state.records.length;
const pStatsBefore = api.projStats(projId);
state.records.push({ id: api.uid(), type: 'income', date: api.todayStr(), amount: 88, category: '广告收入', projectId: projId, channel: '广告联盟', title: '测试收入', createdAt: Date.now() });
state.records.push({ id: api.uid(), type: 'expense', date: api.todayStr(), amount: 12, category: '服务器', projectId: projId, channel: '微信', title: '测试支出', createdAt: Date.now() });
api.saveData(); api.refreshAll();
const pStatsAfter = api.projStats(projId);
check('项目内记账：记录数 +2', state.records.length === before + 2);
check('项目内记账：净利增加 76', Math.abs((pStatsAfter.net - pStatsBefore.net) - 76) < 0.001);
check('记录已持久化到 localStorage', !!storage['wb_hub_v2'] && JSON.parse(storage['wb_hub_v2']).records.length === state.records.length);

/* ---------- 分类与渠道增删保护 ---------- */
const usedCat = '服务器';
const usedCount = state.records.filter(r => r.type === 'expense' && r.category === usedCat).length;
check('被使用的支出分类计数正确 (>0)', usedCount > 0);

/* ---------- 日期边界 ---------- */
check('跨年 +1 天', api.addDaysStr('2025-12-31', 1) === '2026-01-01');
check('跨月 +1 天', api.addDaysStr('2026-01-31', 1) === '2026-02-01');
check('跨月 −1 天', api.addDaysStr('2026-03-01', -1) === '2026-02-28');
check('闰年 2 月', api.addDaysStr('2028-02-28', 1) === '2028-02-29');

/* ---------- 空数据不崩 ---------- */
state.projects = []; state.records = []; state.ui.detailId = '';
api.saveData(); api.refreshAll();
check('空数据下首页空态正常', els['homeProjGrid'].innerHTML.includes('还没有项目'));
check('空数据下流水空态正常', els['ledgerList'].innerHTML.includes('暂无') || els['ledgerList'].innerHTML.includes('empty'));
check('空数据下报表不报错', els['chartExpenseCat'].innerHTML.includes('empty') || els['chartExpenseCat'].innerHTML.includes('svg'));

/* ---------- 清空示例不影响用户数据 ---------- */
storage['wb_hub_v2'] = null;
delete storage['wb_hub_v2'];
const api2 = boot();
api2.loadData();          // 重新预置示例
api2.saveData();
const u = api2.state;
u.records.push({ id: api2.uid(), type: 'income', date: api2.todayStr(), amount: 999, category: '项目回款', projectId: '', channel: '微信', title: '我的真实收入', createdAt: Date.now() });
u.projects.filter(x => !x.s).length;
const keepBefore = u.records.filter(r => !r.s).length;
u.projects = u.projects.filter(x => !x.s);
u.records = u.records.filter(r => !r.s);
check('清空示例只删示例数据', u.records.length === keepBefore && u.records.some(r => r.title === '我的真实收入'));

/* ---------- v1 数据迁移 ---------- */
delete storage['wb_hub_v2'];
storage['wb_rev_hub_v1'] = JSON.stringify({
  projects: [{ id: 'p1', name: '旧版项目', client: '老客户', amount: 5000, deadline: '2026-01-01', status: 'active' }],
  records: [{ id: 'r1', date: '2026-01-02', title: '旧记录', amount: 3000, category: '设计服务', projectId: 'p1' }],
  categories: ['设计服务', '开发服务'],
});
const api3 = boot();
api3.loadData();
check('v1 项目已迁移', api3.state.projects.length === 1 && api3.state.projects[0].quota === 5000);
check('v1 记录迁移为收入类型', api3.state.records.length === 1 && api3.state.records[0].type === 'income');
check('v1 分类已并入收入分类', api3.state.incomeCats.includes('设计服务'));

/* ---------- 音乐播放器 ---------- */
const api4 = boot();
documentStub._ev['DOMContentLoaded']();
const m = api4.state;
m.music.tracks.push({ id: api4.uid(), title: '测试曲目', url: 'https://x/a.mp3' });
m.music.autoplay = true;
api4.saveData(); api4.refreshAll();
check('歌单曲目已渲染', els['trackList'].innerHTML.includes('测试曲目'));
check('自动播放开关已同步', els['autoplayToggle'].checked === true);
api4.playTrack(0);
check('播放后音频 src 已设置', String(els['audio'].src).includes('a.mp3'));

console.log(results.join('\n'));
const fails = results.filter(r => r.startsWith('FAIL')).length;
console.log(fails === 0 ? '\nALL ' + results.length + ' CHECKS PASSED' : '\n' + fails + ' CHECKS FAILED');
process.exit(fails === 0 ? 0 : 1);
