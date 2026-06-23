function doGet(e) {
  if (!e || !e.parameter) {
    return ContentService
      .createTextOutput("Missing parameters")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const action = e.parameter.action;

  if (action === "getTracks") {
    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName("Support Tracks");

    if (!sheet) {
      return ContentService
        .createTextOutput("Sheet not found")
        .setMimeType(ContentService.MimeType.TEXT);
    }

    const data = sheet.getDataRange().getValues();

    const headers = data[0];
    const rows = data.slice(1);

    const result = rows.map(r => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    });

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getStudents") {
    return handleGetStudents_(e.parameter);
  }

  return ContentService
    .createTextOutput("Invalid action")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  if (!e || !e.postData) {
    return ContentService
      .createTextOutput("No data")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const body = JSON.parse(e.postData.contents);
  const action = e.parameter && e.parameter.action ? e.parameter.action : body.action;

  if (action === "addStudent") {
    return handleAddStudent_(body);
  }

  if (action === "updateStudents") {
    return handleUpdateStudents_(body);
  }

  if (action === "deleteStudent") {
    return handleDeleteStudent_(body);
  }

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("Support Tracks");

  if (!sheet) {
    return ContentService
      .createTextOutput("Sheet not found")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  sheet.clearContents();

  const keys = Object.keys(body[0]);
  sheet.appendRow(keys);

  body.forEach(item => {
    sheet.appendRow(keys.map(k => item[k]));
  });

  return ContentService
    .createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}

function getStudentSheet_(sheetId) {
  const ss = SpreadsheetApp.openById(sheetId);
  return ss.getSheets()[0];
}

function findHeaderIndexes_(headerRow) {
  const normalized = headerRow.map(h => String(h).trim().toLowerCase());
  return {
    id: normalized.indexOf('id'),
    name: normalized.indexOf('student name'),
    image: normalized.indexOf('student image'),
    score: normalized.indexOf('score'),
    attendency: normalized.indexOf('attendency'),
    tasks: normalized.indexOf('tasks'),
    activity: normalized.indexOf('activity'),
    contAttendance: normalized.indexOf('cont attendance'),
    bonus: normalized.indexOf('bonus'),
  };
}

/**
 * action=getStudents&sheetId=...
 */
function handleGetStudents_(params) {
  const sheetId = params.sheetId;

  if (!sheetId) {
    return ContentService
      .createTextOutput("Missing sheetId")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const sheet = getStudentSheet_(sheetId);
  const range = sheet.getDataRange().getValues();

  if (range.length === 0) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const headerRow = range[0];
  const rows = range.slice(1);
  const idx = findHeaderIndexes_(headerRow);

  const students = rows
    .filter(row => row[idx.name] || row[idx.id])
    .map(row => ({
      id: idx.id !== -1 ? String(row[idx.id]) : '',
      name: idx.name !== -1 ? String(row[idx.name]) : '',
      image: idx.image !== -1 ? String(row[idx.image]) : '',
      score: idx.score !== -1 ? Number(row[idx.score]) || 0 : 0,
      attendency: idx.attendency !== -1 ? Number(row[idx.attendency]) || 0 : 0,
      tasks: idx.tasks !== -1 ? Number(row[idx.tasks]) || 0 : 0,
      activity: idx.activity !== -1 ? Number(row[idx.activity]) || 0 : 0,
      contAttendance: idx.contAttendance !== -1 ? Number(row[idx.contAttendance]) || 0 : 0,
      bonus: idx.bonus !== -1 ? Number(row[idx.bonus]) || 0 : 0,
    }));

  return ContentService
    .createTextOutput(JSON.stringify(students))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * action=addStudent (POST)
 * body: { action, sheetId, student: {...} }
 */
// function handleAddStudent_(body) {
//   const sheetId = body.sheetId;
//   const student = body.student;

//   if (!sheetId || !student) {
//     return ContentService
//       .createTextOutput("Missing sheetId or student")
//       .setMimeType(ContentService.MimeType.TEXT);
//   }

//   const sheet = getStudentSheet_(sheetId);
//   const range = sheet.getDataRange().getValues();
//   const headerRow = range[0] || [
//     'ID', 'Student Name', 'Student Image', 'Score',
//     'Attendency', 'Tasks', 'Activity', 'Cont Attendance', 'Bonus',
//   ];
//   const idx = findHeaderIndexes_(headerRow);

//   const newRow = new Array(headerRow.length).fill('');
//   if (idx.id !== -1) newRow[idx.id] = student.id;
//   if (idx.name !== -1) newRow[idx.name] = student.name;
//   if (idx.image !== -1) newRow[idx.image] = student.image;
//   if (idx.score !== -1) newRow[idx.score] = 0;
//   if (idx.attendency !== -1) newRow[idx.attendency] = student.attendency;
//   if (idx.tasks !== -1) newRow[idx.tasks] = student.tasks;
//   if (idx.activity !== -1) newRow[idx.activity] = student.activity;
//   if (idx.contAttendance !== -1) newRow[idx.contAttendance] = student.contAttendance;
//   if (idx.bonus !== -1) newRow[idx.bonus] = student.bonus;

//   const lastRow = sheet.getLastRow();

//   sheet
//     .getRange(lastRow + 1, 1, 1, newRow.length)
//     .setValues([newRow]);

//   return ContentService
//     .createTextOutput(JSON.stringify({ success: true, student: student }))
//     .setMimeType(ContentService.MimeType.JSON);
// }

function handleAddStudent_(body) {
  const sheetId = body.sheetId;
  const student = body.student;

  if (!sheetId || !student) {
    return ContentService
      .createTextOutput("Missing sheetId or student")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const sheet = getStudentSheet_(sheetId);
  const range = sheet.getDataRange().getValues();
  const headerRow = range[0] || [
    'ID', 'Student Name', 'Student Image', 'Score',
    'Attendency', 'Tasks', 'Activity', 'Cont Attendance', 'Bonus',
  ];
  const idx = findHeaderIndexes_(headerRow);

  const newRow = new Array(headerRow.length).fill('');
  if (idx.id !== -1) newRow[idx.id] = student.id;
  if (idx.name !== -1) newRow[idx.name] = student.name;
  if (idx.image !== -1) newRow[idx.image] = student.image;
  if (idx.score !== -1) newRow[idx.score] = student.score;
  if (idx.attendency !== -1) newRow[idx.attendency] = student.attendency;
  if (idx.tasks !== -1) newRow[idx.tasks] = student.tasks;
  if (idx.activity !== -1) newRow[idx.activity] = student.activity;
  if (idx.contAttendance !== -1) newRow[idx.contAttendance] = student.contAttendance;
  if (idx.bonus !== -1) newRow[idx.bonus] = student.bonus;

  sheet.insertRowAfter(1);
  sheet.getRange(2, 1, 1, newRow.length).setValues([newRow]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, student: student }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateStudents_(body) {
  const sheetId = body.sheetId;
  const students = body.students;

  if (!sheetId || !students) {
    return ContentService
      .createTextOutput("Missing sheetId or students")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const sheet = getStudentSheet_(sheetId);
  const range = sheet.getDataRange();
  const values = range.getValues();
  const headerRow = values[0];
  const idx = findHeaderIndexes_(headerRow);

  if (idx.id === -1) {
    return ContentService
      .createTextOutput("Sheet has no ID column")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const studentById = {};
  students.forEach(s => { studentById[String(s.id)] = s; });

  for (let r = 1; r < values.length; r++) {
    const rowId = String(values[r][idx.id]);
    const updated = studentById[rowId];
    if (!updated) continue;

    if (idx.name !== -1) values[r][idx.name] = updated.name;
    if (idx.image !== -1) values[r][idx.image] = updated.image;
    if (idx.score !== -1) values[r][idx.score] = updated.score;
    if (idx.attendency !== -1) values[r][idx.attendency] = updated.attendency;
    if (idx.tasks !== -1) values[r][idx.tasks] = updated.tasks;
    if (idx.activity !== -1) values[r][idx.activity] = updated.activity;
    if (idx.contAttendance !== -1) values[r][idx.contAttendance] = updated.contAttendance;
    if (idx.bonus !== -1) values[r][idx.bonus] = updated.bonus;
  }

  range.setValues(values);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, updated: students.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * action=deleteStudent (POST)
 * body: { action, sheetId, studentId }
 */
function handleDeleteStudent_(body) {
  const sheetId = body.sheetId;
  const studentId = body.studentId;

  if (!sheetId || !studentId) {
    return ContentService
      .createTextOutput("Missing sheetId or studentId")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const sheet = getStudentSheet_(sheetId);
  const values = sheet.getDataRange().getValues();
  const idx = findHeaderIndexes_(values[0]);

  if (idx.id === -1) {
    return ContentService
      .createTextOutput("Sheet has no ID column")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  for (let r = values.length - 1; r >= 1; r--) {
    if (String(values[r][idx.id]) === String(studentId)) {
      sheet.deleteRow(r + 1);
      return ContentService
        .createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ error: "Student not found" }))
    .setMimeType(ContentService.MimeType.JSON);
}