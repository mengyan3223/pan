// 工作台运行时冒烟测试（Node 模拟 DOM）
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/营收工作台.html', 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];

// ---- DOM stubs ----
const els = {};
function mkEl(id) {
  return {
    _id: id, innerHTML: '', textContent: '', value: '', className: '',
    files: [],
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, setAttribute() {},
    getAttribute() { return null; },
    appendChild() {}, removeChild() {},
  };
}
const documentStub = {
  addEventListener(ev, cb) { if (ev === 'DOMContentLoaded') this._cb = cb; },
  getElementById(id) { if (!els[id]) els[id] = mkEl(id); return els[id]; },
  querySelectorAll() { return [mkEl('q'), mkEl('q')]; },
  createElement() { return mkEl('tmp'); },
  body: mkEl('body'),
};
const storage = {};
global.document = documentStub;
global.window = { scrollTo() {} };
global.localStorage = {
  getItem: k => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: k => { delete storage[k]; },
};
global.confirm = () => true;
global.Blob = class {};
global.URL = { createObjectURL: () => '', revokeObjectURL() {} };
global.FileReader = class { readAsText() {} };

new Function(src)();
const api = new Function(src + '; return { state: state, refreshAll: refreshAll, saveData: saveData, addDaysStr: addDaysStr, todayStr: todayStr, uid: uid };')();
const state = api.state;

// 触发 DOMContentLoaded 初始化链路
documentStub._cb();
// 首次访问只在内存预置示例，此处显式保存以验证持久化链路
api.saveData();

const results = [];
function check(name, cond) { results.push((cond ? 'PASS' : 'FAIL') + ' | ' + name); }

check('示例项目=3', state.projects.length === 3);
check('示例记录=5', state.records.length === 5);
check('默认分类=5', state.categories.length === 5);
check('逾期项进入今天区', els['todayList'].innerHTML.includes('已逾期'));
check('今天区有处理按钮', els['todayList'].innerHTML.includes('today-done'));
check('本月营收卡已渲染', els['statMonth'].textContent.startsWith('¥'));
check('饼图已生成 SVG', els['pieBox'].innerHTML.includes('<svg'));
check('趋势图含折线', els['trendBox'].innerHTML.includes('polyline'));
check('流水列表已渲染', els['recList'].innerHTML.includes('row'));
check('月份合计已渲染', els['monthTotal'].innerHTML.includes('¥'));
check('分类列表已渲染', els['catList'].innerHTML.includes('cat-pill'));
check('项目列表含已回款', els['projList'].innerHTML.includes('已回款'));
check('localStorage 已写入', !!storage['wb_rev_hub_v1']);
check('数据持久化可解析', (() => {
  try { const d = JSON.parse(storage['wb_rev_hub_v1']); return Array.isArray(d.projects) && Array.isArray(d.records); }
  catch (e) { return false; }
})());

// 二次加载（持久化链路）
const s2 = JSON.parse(storage['wb_rev_hub_v1']);
check('二次加载数据不丢', s2.projects.length === 3 && s2.records.length === 5);

// 日期边界：跨月/跨年
const a = api.addDaysStr('2025-12-31', 1);
check('跨年正确(2025-12-31 +1 = 2026-01-01)', a === '2026-01-01');
const b = api.addDaysStr('2026-01-31', 1);
check('跨月正确(2026-01-31 +1 = 2026-02-01)', b === '2026-02-01');

// 清空示例链路（等价于点击清空示例按钮的处理逻辑）
state.projects = state.projects.filter(p => !p.s);
state.records = state.records.filter(r => !r.s);
api.saveData(); api.refreshAll();
check('清空示例后剩0条', state.records.length === 0 && state.projects.length === 0);
check('清空示例后空态正常', els['recList'].innerHTML.includes('暂无'));

// 空数据下再新增一条（回归：空数据 → 写入 → 渲染）
state.records.push({ id: api.uid(), date: api.todayStr(), title: '测试', amount: 99, category: state.categories[0], projectId: '', createdAt: Date.now() });
api.saveData(); api.refreshAll();
check('空数据后新增记录正常', els['recList'].innerHTML.includes('¥99') || els['recList'].innerHTML.includes('99'));

console.log(results.join('\n'));
const fails = results.filter(r => r.startsWith('FAIL')).length;
console.log(fails === 0 ? '\nALL ' + results.length + ' CHECKS PASSED' : '\n' + fails + ' CHECKS FAILED');
process.exit(fails === 0 ? 0 : 1);
