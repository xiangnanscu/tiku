import fs from "file-saver";
import xlsx from "xlsx"


var wopts = {
  bookType: "xlsx",
  bookSST: false,
  type: "binary",
};

function s2ab(s) {
  var buf = new ArrayBuffer(s.length);
  var view = new Uint8Array(buf);
  for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xff;
  return buf;
}

function cleanFileName(s) {
  if (s.slice(-5) != ".xlsx") {
    return s + ".xlsx";
  } else {
    return s;
  }
}
function save({ binary, filename }) {
  fs.saveAs(
    new Blob([s2ab(binary)], {
      type: "application/octet-stream",
    }),
    filename
  );
}
function templateToFile({ template, filename, tables, table }) {
  var bin = "";
  var bytes = new Uint8Array(template);
  var length = bytes.byteLength;
  for (var i = 0; i < length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  var tbin = new XlsxTemplate(bin);
  if (tables) {
    for (const [name, data] of Object.entries(tables)) {
      tbin.substitute(name, data);
    }
  }
  if (table) {
    for (const sht of tbin.sheets) {
      tbin.substitute(sht.name, table);
    }
  }
  var data = tbin.generate();
  if (filename.slice(-5) != ".xlsx") {
    filename = filename + ".xlsx";
  }
  fs.saveAs(
    new Blob([s2ab(data)], {
      type: "application/octet-stream",
    }),
    filename
  );
}
function arrayToFile(opts) {
  var sheet = xlsx.utils.aoa_to_sheet(opts.data);
  var sheet_name = opts.sheet_name || "Sheet1";
  var wb = {
    SheetNames: [sheet_name],
    Sheets: {
      [sheet_name]: sheet,
    },
  };
  fs.saveAs(
    new Blob([s2ab(xlsx.write(wb, wopts))], {
      type: "application/octet-stream",
    }),
    cleanFileName(opts.filename || "file.xlsx")
  );
}

function sheetToArray(sheet) {
  var ref = sheet["!ref"];
  if (!ref) {
    return [];
  }
  var m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(ref);
  if (!m) {
    return [];
  }
  var ret = [];
  var r2 = xlsx.utils.decode_row(m[4]) + 1;
  var r1 = xlsx.utils.decode_row(m[2]);
  var c2 = xlsx.utils.decode_col(m[3]) + 1;
  var c1 = xlsx.utils.decode_col(m[1]);
  for (var r = r1; r < r2; r++) {
    var row = [];
    for (var c = c1; c < c2; c++) {
      var key = xlsx.utils.encode_col(c) + xlsx.utils.encode_row(r);
      row.push(sheet[key] && sheet[key].v);
    }
    ret.push(row);
  }
  return ret;
}

function readFileAsync(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

async function fileToArray(opts) {
  var data = await readFileAsync(opts.file);
  var workbook = xlsx.read(data, {
    type: "binary",
  });
  var names = workbook.SheetNames;
  if (opts.single && names.length !== 1) {
    throw "EXCEL只能包含一个工作表，请删除无关的工作表";
  }
  if (opts.name) {
    if (!names.includes(opts.name)) {
      throw `没有发现名称为“${opts.name}”的工作表`;
    } else {
      names = [opts.name];
    }
  }
  for (let name of names) {
    var sheet = workbook.Sheets[name];
    await opts.callback(sheetToArray(sheet));
  }
}

// function fileToArray(opts) {
//   var reader = new FileReader();
//   reader.onload = function(e) {
//     var data = e.target.result;
//     var workbook = xlsx.read(data, {
//       type: "binary"
//     });
//     for (let name of workbook.SheetNames) {
//       var sheet = workbook.Sheets[name];
//       opts.callback(sheetToArray(sheet));
//     }
//   };
//   reader.readAsBinaryString(opts.file);
// }
function onUploadFileFactory(successCallback, failCallback) {
  return (event) => {
    event.preventDefault();
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = async (event) => {
      var binary = "";
      var bytes = new Uint8Array(event.target.result);
      var length = bytes.byteLength;
      for (var i = 0; i < length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      var workbook = xlsx.read(binary, { type: "binary" });
      var n = workbook.SheetNames.length;
      if (n !== 1) {
        let message = `上传的电子文档只能包含1个工作表，当前${n}个`;
        if (failCallback) {
          return await failCallback(message);
        } else {
          throw message;
        }
      }
      var sheet = workbook.Sheets[workbook.SheetNames[0]];
      var records = xlsx.utils.sheet_to_json(sheet);
      return await successCallback(records);
    };
    reader.readAsArrayBuffer(file);
    event.target.value = "";
  };
}
export default {
  arrayToFile,
  fileToArray,
  sheetToArray,
  readFileAsync,
};

export { save, arrayToFile, templateToFile, fileToArray, sheetToArray, readFileAsync, onUploadFileFactory };
