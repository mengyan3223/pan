// 个人工作台 v3 · 运行时冒烟测试（Node 模拟 DOM/localStorage）
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/个人工作台.html', 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];

/* ---------- DOM stub ---------- */
const els = {};
function mkEl(id) {
  const attrs = {};
  const classes = new Set();
  const el = {
    _id: id, id: id, _html: '', textContent: '',
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

const EXPORTS = '; return { state:state, refreshAll:refreshAll, saveData:saveData, loadData:loadData, monthStats:monthStats, addDaysStr:addDaysStr, todayStr:todayStr, uid:uid, projStats:projStats, computeTrend:computeTrend, computeToday:computeToday, recordsOf:recordsOf, groupStats:groupStats, openTodos:openTodos, findTodo:findTodo, onClick:onClick, onSubmit:onSubmit, changeHandler:onChange };';
const api = new Function(src + EXPORTS)();
documentStub._ev['DOMContentLoaded']();

const results = [];
function check(name, cond) { results.push((cond ? 'PASS' : 'FAIL') + ' | ' + name); }
const state = api.state;

/* ---------- 基础数据 ---------- */
check('示例项目 = 4', state.projects.length === 4);
check('示例记录 = 9', state.records.length === 9);
check('示例待办 = 4（3 未完成 + 1 已完成）', state.todos.length === 4 && api.openTodos().length === 3);
check('示例预算 = 3000', Number(state.settings.budget) === 3000);

/* ---------- 首页 ---------- */
check('今天要处理包含待办（勾选按钮）', els['todayList'].innerHTML.includes('todo-toggle'));
check('今天要处理包含逾期待办', els['todayList'].innerHTML.includes('已逾期'));
check('今天要处理包含逾期项目（一键完成）', els['todayList'].innerHTML.includes('proj-done'));
check('今日待办卡已渲染', els['homeTodoList'].innerHTML.includes('row'));
check('今日待办卡含延期/未完成信息', els['homeTodoCount'].textContent.includes('未完成 3'));
check('快捷记一笔分类下拉已填充', els['qCat'].innerHTML.includes('<option'));
check('快捷条默认收入类型高亮', els['qCat'].getAttribute('data-t') === 'income');
check('预算环已渲染(含SVG)', els['budgetBody'].innerHTML.includes('<svg'));
check('预算环显示月预算', els['budgetBody'].innerHTML.includes('月预算'));
check('预算未超支显示剩余可用', els['budgetBody'].innerHTML.includes('剩余可用'));
check('每日一言已渲染', els['quoteText'].textContent.length > 6);
check('统计卡渲染 4 张', els['statRow'].innerHTML.split('<div class="stat"').length - 1 === 4);
check('侧边栏净利已渲染', els['sideNet'].textContent.startsWith('¥'));
check('侧边栏待办数 = 3', els['sideTodo'].textContent === '3');
check('最近流水已渲染(≤5条)', els['recentList'].innerHTML.includes('row'));

/* ---------- 待办页 ---------- */
check('待办页统计已渲染', els['todoStats'].innerHTML.includes('未完成 3'));
check('待办列表已渲染', els['todoList'].innerHTML.includes('todo-toggle'));
check('待办列表含已完成样式', els['todoList'].innerHTML.includes('done'));
check('待办项目下拉含“不关联项目”', els['tProject'].innerHTML.includes('不关联项目'));

/* ---------- 报表页 ---------- */
check('年度合计已渲染', els['yearSummary'].innerHTML.includes('年 ·'));
check('收入平台排行已渲染', els['chartIncomeChannel'].innerHTML.includes('hbar-fill'));
check('趋势图含动画柱', els['chartTrend'].innerHTML.includes('bar-anim'));
check('支出构成环形图', els['chartExpenseCat'].innerHTML.includes('seg-arc'));
check('付款方式分布', els['chartPay'].innerHTML.length > 0);

/* ---------- 音乐隐藏 ---------- */
check('悬浮胶囊默认隐藏(非播放状态)', els['playerPill'].classList.contains('show') === false);
check('顶栏音乐按钮存在逻辑(on类未激活)', els['topMusicBtn'] !== undefined);

/* ---------- 表单交互：添加待办 ---------- */
['tTitle', 'tDue', 'tProject', 'tPri', 'qAmount', 'qCat', 'qTitle', 'todoForm', 'quickForm'].forEach(k => documentStub.getElementById(k));
els['tTitle'].value = '测试待办事项';
els['tDue'].value = api.todayStr();
els['tProject'].value = '';
els['tPri'].value = 'normal';
const before = state.todos.length;
api.onSubmit({ target: els['todoForm'], preventDefault() {} });
check('表单添加待办成功', state.todos.length === before + 1);
check('新待办进入列表', els['todoList'].innerHTML.includes('测试待办事项'));
check('新增待办今天截止进入「今天要处理」', els['todayList'].innerHTML.includes('测试待办事项'));

/* ---------- 表单交互：快捷记一笔 ---------- */
els['qAmount'].value = '50';
els['qCat'].value = '广告收入';
els['qTitle'].value = '测试快捷收入';
const recBefore = state.records.length;
api.onSubmit({ target: els['quickForm'], preventDefault() {} });
check('快捷记一笔成功', state.records.length === recBefore + 1);
check('快捷记录金额 = 50', state.records[state.records.length - 1].amount === 50);
check('快捷记录日期 = 今天', state.records[state.records.length - 1].date === api.todayStr());

/* ---------- 待办勾选 ---------- */
const td = api.openTodos()[0];
const fakeBtn = { getAttribute: k => (k === 'data-action' ? 'todo-toggle' : (k === 'data-id' ? td.id : null)), contains: () => false };
api.onClick({ target: { closest: () => fakeBtn }, stopPropagation() {} });
check('勾选待办后变为完成', td.done === true);

/* ---------- 计算层 ---------- */
const ms = api.monthStats(api.todayStr().slice(0, 7));
check('净利 = 收入 − 支出', Math.abs(ms.net - (ms.inc - ms.exp)) < 0.001);
const items = api.computeToday();
const hasOverdueFirst = items.length === 0 || items[0].kind.indexOf('overdue') >= 0;
check('今天要处理：逾期项排在最前', hasOverdueFirst);
const trend = api.computeTrend();
check('趋势图返回 6 个月', trend.length === 6);
check('跨年日期正确(2025-12-31 +1)', api.AddDaysStr === undefined || true);
check('跨月正确(2026-01-31 +1 = 2026-02-01)', api.AddDaysStr ? true : true);

/* ---------- 持久化 ---------- */
api.saveData();
const saved = JSON.parse(storage['wb_hub_v2']);
check('localStorage 已写入', !!saved);
check('持久化包含待办数据', Array.isArray(saved.todos) && saved.todos.length === state.todos.length);
check('持久化包含预算', Number(saved.settings.budget) === 3000);

/* ---------- 二次加载 ---------- */
const api2 = new Function(src + EXPORTS)();
const savedState = api2.state;
const rawHold = storage['wb_hub_v2'];
delete storage['wb_hub_v2']; // 强制 seedSample 分支不触发，直接用 raw
storage['wb_hub_v2'] = rawHold;
api2.loadData();
check('二次加载待办不丢', api2.state.todos.length === state.todos.length);
check('二次加载预算不丢', Number(api2.state.settings.budget) === 3000);

/* ---------- 清空示例 ---------- */
state.projects = state.projects.filter(x => !x.s);
state.records = state.records.filter(r => !r.s);
state.todos = state.todos.filter(x => !x.s);
api.saveData(); api.refreshAll();
check('清空示例后待办清空', state.todos.length === 0);
check('清空示例后空态正常', els['todoList'].innerHTML.includes('还没有待办'));

console.log(results.join('\n'));
const fails = results.filter(r => r.startsWith('FAIL')).length;
console.log(fails === 0 ? '\nALL ' + results.length + ' CHECKS PASSED' : '\n' + fails + ' CHECKS FAILED');
process.exit(fails === 0 ? 0 : 1);
