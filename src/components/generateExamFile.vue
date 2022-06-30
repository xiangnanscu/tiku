<template>
  <div style="width: 1200px; margin: auto">
    <div class="row">
      <div class="col">
        <h1 style="text-align: center;">试题解析器</h1>
      </div>
    </div>
    <div class="row">
      <div v-if="wrongNumber" class="col">
        <div class="alert alert-danger">
          解析出错{{ wrongNumber }}道题
        </div>
      </div>
      <div v-if="correctNumber" class="col">
        <div class="alert alert-success">
          解析成功{{ correctNumber }}道题
        </div>
      </div>
    </div>
    <div v-if="readyToPost" class="row">
      <div class="col">
        <button class=" form-control" type="submit" @click="downloadExam">
          <span style="color:green;font-weight: bold;">导出为xlsx文件</span>
        </button>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <form method="post" @submit.prevent="sendRecords">
          <textarea class="form-control" v-model.lazy="text" rows="35"></textarea>
        </form>
      </div>
      <div class="col">
        <div>
          <ol class="list-group" style="text-align: left">
            <li v-for="(ti, i) in records" :key="i">
              <ul :class="{ 'list-group': true, 'parse-error': ti.error }">
                <li v-if="ti.error" class="list-group-item">
                  ERROR:{{ ti.error }}
                </li>
                <li class="list-group-item">类型:{{ ti.type }}</li>
                <li class="list-group-item">
                  <div>{{ ti.content }}</div>
                </li>
                <template v-for="opt in ti.options">
                  <li class="list-group-item">
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox" :value="opt[0]" />
                      <label class="form-check-label" for="defaultCheck1">
                        {{ opt[0] }}．{{ opt[1] }}
                      </label>
                    </div>
                  </li>
                </template>
                <li class="list-group-item">答案:{{ ti.answer }}</li>
                <li class="list-group-item">解析:{{ ti.hint }}</li>
              </ul>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import convert from "../parse.js";
import { arrayToFile } from "../xlsxUtils.js"

const errorFirst = (records) => {
  return [
    ...records.filter((e) => e.error),
    ...records.filter((e) => !e.error),
  ];
};
const head = ['序号', '题目与答案', '分值', '题目难度', '题目类型', '题目答案', '试题分析', '选项A（必填）', '选项B（必填）', '选项C', '选项D', '选项E', '选项F']
export default {
  data() {
    return {
      text: "",
      message: "",
      suite: "",
      cls: "变形题",
    };
  },
  mounted() {
    setInterval(
      () => localStorage.setItem("draft", JSON.stringify(this.$data)),
      2000
    );
    Object.assign(this.$data, JSON.parse(localStorage.getItem("draft")));
  },
  methods: {
    downloadExam() {
      let rows = this.records.map((e, i) => [
        i + 1, e.content, e.type == '单选' ? 1 : 2, "一般", e.type, e.answer, e.hint, e.options[0][1], e.options[1][1], e.options[2][1], e.options[3][1], "", ""
      ])
      return arrayToFile({
        data: [head, ...rows],
        filename: "exam"
      })
    },
    async sendRecords() {
      this.message = "";
      this.records.forEach((e) => {
        e.suite = this.suite;
        e.cls = this.cls;
      });
      await this.$http.post("/vars", this.records, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      });
      this.message = "提交成功";
      this.text = "";
    },
  },
  computed: {
    wrongNumber() {
      return this.records.filter((e) => e.error).length;
    },
    correctNumber() {
      return this.records.length - this.wrongNumber
    },
    readyToPost() {
      return !this.wrongNumber && this.correctNumber;
    },
    records() {
      try {
        return this.text ? errorFirst(convert(this.text)) : [];
      } catch (e) {
        console.log(e);
        this.globalError = `解析错误：${e}`;
        return [];
      }
    },
  },
};
</script>
<style scoped>
.parse-error li {
  color: red;
}

ul.parse-error {
  border: 1px solid red;
}

.list-group-item {
  white-space: pre-line;
}
</style>
