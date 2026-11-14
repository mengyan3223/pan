// 结构校验：JS 中 getElementById 引用的 id 必须存在于 HTML 中
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/个人工作台.html', 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
const markup = html.slice(0, html.indexOf('<script>'));

const ids = new Set();
const re = /getElementById\(\s*'([^']+)'\s*\)/g;
let m;
while ((m = re.exec(script))) ids.add(m[1]);

// 动态拼接的 id（运行时生成）白名单
const dynamic = ['ni-', 'view-', 'page-'];
const missing = [];
ids.forEach(id => {
  if (dynamic.some(d => id.startsWith(d))) return;
  // 动态表单模板也允许：在脚本内的 HTML 字符串里定义 id="x"
  if (!html.includes('id="' + id + '"')) missing.push(id);
});

// 标签平衡检查
const openDiv = (markup.match(/<div\b/g) || []).length;
const closeDiv = (markup.match(/<\/div>/g) || []).length;
const openSec = (markup.match(/<section\b/g) || []).length;
const closeSec = (markup.match(/<\/section>/g) || []).length;
const openForm = (markup.match(/<form\b/g) || []).length;
const closeForm = (markup.match(/<\/form>/g) || []).length;
const openSvg = (markup.match(/<svg\b/g) || []).length;
const closeSvg = (markup.match(/<\/svg>/g) || []).length;

// 外部依赖检查（用户明确要求的音乐站以外不应有外链）
const extScript = (markup.match(/<script[^>]+src=/g) || []).length;
const extLink = (markup.match(/<link[^>]+href=/g) || []).length;
const iframes = (markup.match(/<iframe[^>]*>/g) || []).length;

const out = [];
out.push('JS 引用 id 总数: ' + ids.size);
out.push(missing.length === 0 ? 'PASS | 所有 id 均存在于 HTML' : 'FAIL | 缺失 id: ' + missing.join(', '));
out.push(openDiv === closeDiv ? 'PASS | div 标签平衡 (' + openDiv + ')' : 'FAIL | div 不平衡 开' + openDiv + ' 闭' + closeDiv);
out.push(openSec === closeSec ? 'PASS | section 标签平衡 (' + openSec + ')' : 'FAIL | section 不平衡');
out.push(openForm === closeForm ? 'PASS | form 标签平衡 (' + openForm + ')' : 'FAIL | form 不平衡 开' + openForm + ' 闭' + closeForm);
out.push(openSvg === closeSvg ? 'PASS | svg 标签平衡 (' + openSvg + ')' : 'FAIL | svg 不平衡 开' + openSvg + ' 闭' + closeSvg);
out.push(extScript === 0 && extLink === 0 ? 'PASS | 无外部 JS/CSS 引用（零依赖）' : 'FAIL | 存在外部引用 script:' + extScript + ' link:' + extLink);
out.push('iframe 数量: ' + iframes + '（音乐库，用户指定）');
out.push('文件大小: ' + (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB');
const fails = out.filter(l => l.startsWith('FAIL')).length;
console.log(out.join('\n'));
console.log(fails === 0 ? '\n结构校验通过' : '\n结构校验失败');
process.exit(fails === 0 ? 0 : 1);
