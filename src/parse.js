let print = s => console.log(s);
let qj = 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ'
let bj = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
let qbmap = {}
for (let index = 0; index < qj.length; index++) {
  qbmap[qj[index]] = bj[index];
}
function qj2bj(match, p1) {
  return qbmap[match]
}
let MUST = {
  content: '题干',
  answer: '答案'
}
let OPTION_C = 'ABCDEFGH'
let TYPES = "多选,单选,不定项,填空,判断,案例,简答"
let makeJudgeOptions = () => [
  ["A", "正确"],
  ["B", "错误"]
];
function check_row(row) {
  for (let [key, value] of Object.entries(MUST)) {
    if (!row[key]) {
      row.error = "题目必须包含" + value;
    }
  }
  let a = row["options"].map(e => e[0]).join("");
  let b = OPTION_C.slice(0, row["options"].length);
  if (a !== b) {
    row.error = `选项字母顺序${a}不对, 应按ABCDEFGH的顺序`;
  }
  if (!TYPES.includes(row.type)) {
    row.error = `类型不对：${row.type},限:${TYPES}`;
  }
}
function makeJudge(row, answer) {
  row["options"] = makeJudgeOptions();
  row["answer"] = (answer.includes("正确") || answer.includes("对")) ? "A" : "B";
  row["type"] = "判断";
}
let StateMap = {
  content: '题干',
  options: '选项',
  hint: '解析',
  answer: '答案',
}
function clean_opt(v, row) {
  v = v.trim();
  if (".,。，、．".includes(v[0])) {
    v = v.slice(1);
  }
  v.trim();
  if (!v) {
    row.error = "选项文本为空";
  }
  return v
}
function getOptions(line, row) {
  let ret = [];
  let state = null;
  let c2 = null;
  let opt = null;
  for (let [i, c] of Object.entries(line)) {
    i = Number(i);
    if (state == "value") {
      if (c != c2 || !line[i - 1].match(/^\s$/)) {
        opt[1] += c;
      } else {
        c2 = OPTION_C[OPTION_C.indexOf(c2) + 1];
        opt[1] = clean_opt(opt[1], row);
        ret.push(opt);
        opt = [c, ""];
      }
    } else if (OPTION_C.includes(c)) {
      c2 = OPTION_C[OPTION_C.indexOf(c) + 1];
      opt = [c, ""];
      state = "value";
    } else {
      print('解析选项时出现未知情况：' + line);
    }
  }
  opt[1] = clean_opt(opt[1], row);
  ret.push(opt);
  return ret;
}
function convert(s) {
  let date = new Date();
  let row = null;
  let rows = [];
  let last_state = 'init';
  let title = "";
  let m = null;
  let d = null;
  let n, type;
  let answer = "";
  let multiNumber = 0
  let done = 0
  for (let line of s.split("\n")) {
    line = line.trim();
    if (!line) {
      continue;
    }
    if (/^(命题单位|~)/.test(line)) {
      continue;
    }
    // 简单粗暴解决选项大小写的问题
    line = line.toUpperCase()
    // 把全角英文字符改为半角
    line = line.replace(/[Ａ-Ｚ]/ig, qj2bj)
    // 优先识别简写形式的答案
    if (m = line.match(/^(?<answer>[A-H]+|正确|错误|对|错)$/)) {
      answer = m.groups["answer"];
      if (answer.match(/^(正确|错误|对|错)/) && last_state == "content") {
        makeJudge(row, answer)
      } else if (answer.match(/^[A-H]+/i)) {
        row["answer"] = answer;
        if (!row["type"]) {
          // 前面type有可能已经在题干里面定义了
          row["type"] = type || (answer.length == 1 ? "单选" : "多选");
        }
      }
      continue
    }
    // 识别板块
    if (
      (m = line.match(
        /^[(（]?[一二三四五六七][）)]?\s*[．.、]?\s*(?<title>党建理论知识|就业创业|社会保险|劳动关系|人事人才|综合服务标准规范)/
      ))
    ) {
      last_state = 'init'
      title = m.groups["title"];
      if (title == "党建理论知识") {
        title = "党建理论";
      } else if (title == "综合服务标准规范") {
        title = "综合服务";
      }
      continue;
    }
    // 识别题型
    if ((m = line.match(/^[一二三四五六七]\s*[．.、]\s*(?<type>多选|单选|不定项|填空|判断|案例|简答)题?/))) {
      type = m.groups["type"];
      last_state = 'init'
      continue;
    }
    // 识别题干或识别多行模式下的以数字开头的题干,解析,答案
    if ((m = line.match(/^(?<oid>\d+)\s*[．.、]\s*(?<content>.+)$/))) {
      let x = Number(m.groups["oid"])
      if ('content,hint,answer'.includes(last_state) &&
        (x == 1 || x - multiNumber == 1)) {
        // print(`${StateMap[last_state]}换行，首字是数字`);
        row[last_state] = row[last_state] + "\n" + line;
        multiNumber = x
        if (last_state == 'answer' && row.type == '填空') {
          // 答案是多行的, 要将填空类型修正为简答, 这个是最高优先级
          row.type = '简答'
        }
        continue;
      }
      multiNumber = 0
      if (row) {
        check_row(row);
        rows.push(row);
        print('已解析题数：' + rows.length)
      }
      row = m.groups;
      row["oid"] = Number(row["oid"]);
      row["title"] = title;
      row["options"] = [];
      row["suite"] = `${date.getMonth() + 1}${date.getDate()}`;
      row["type"] = type || "";
      if (n = line.match(/[(（]\s*(?<type>多选|单选|不定项|填空|判断|案例|简答)题?\s*[）)]/i)) {
        // 类型包含在题干里, 最高优先级
        row["type"] = n.groups.type;
      }
      if (n = line.match(/[(（]\s*(?<answer>[ABCDEFGH]+|正确|错误|对|错)\s*[）)]/i)) {
        // 客观题答案包含在题干里
        print('客观题答案包含在题干里')
        let answer = n.groups.answer;
        row.content = row.content.replace(n[0], "()");
        if (answer.match(/正确|错误|对|错/)) {
          makeJudge(row, answer)
        } else if (answer.match(/[ABCDEFGH]+/)) {
          row["type"] = row["type"] || (answer.length == 1 ? "单选" : "多选")
          row.answer = answer;
        }
      }
      last_state = "content";
      continue;
    }
    // 识别ABCD选项
    if ((m = line.match(/^(?<option>[A-H])\s*[.,。，、．]?\s*(?<value>.+)$/)) && 'options,content'.includes(last_state)) {
      for (let e of getOptions(line, row)) {
        row["options"].push(e);
      }
      last_state = "options";
      continue;
    }
    // 识别答案
    if (
      (m = line.match(
        /^(参考|正确)?答案?\s*[：:；;.,。，、．]?\s*(?<answer>.*)$/
      ))
    ) {
      // 考虑第一行为"答案:"的情况
      // 先假定答案只占一行, 在type为空的情况下, 要尝试推断出合适的类型
      // 如果后面是多行, 则可能需要:填空->简答
      answer = m.groups["answer"];
      if (answer.match(/^(正确|错误|对|错)/) && last_state == "content") {
        makeJudge(row, answer)
      } else if (answer.match(/^[A-H]+/i)) {
        row["answer"] = answer;
        if (!row["type"]) {
          // 前面type有可能已经在题干里面定义了
          row["type"] = type || (answer.length == 1 ? "单选" : "多选");
        }
      } else {
        // 主观题
        row["answer"] = answer;
        if (!row["type"]) {
          row["type"] = type || "填空";
        }
      }
      last_state = "answer";
      continue;
    }
    // 识别解析
    if ((m = line.match(/^解[析释]\s*[：:]\s*(?<hint>.*)$/))) {
      row.hint = m.groups.hint;
      last_state = "hint";
      continue;
    }
    if (last_state == 'init') {
      continue;
    }
    if ("content,hint,answer".includes(last_state)) {
      row[last_state] = row[last_state] + "\n" + line;
    } else {
      // 目前只可能是选项
      row.error = `选项不允许多行:` + line;
    }
  }
  if (row) {
    check_row(row);
    rows.push(row);
  }

  return rows;
}


export default convert;
