/**
 * 구구별 대모험 결과 수집용 Google Apps Script
 *
 * 1. 결과를 받을 Google 스프레드시트에서 확장 프로그램 > Apps Script를 엽니다.
 * 2. 기존 코드를 지우고 이 파일의 내용을 붙여넣습니다.
 * 3. 배포 > 새 배포 > 웹 앱을 선택합니다.
 * 4. 실행 사용자는 '나', 액세스 사용자는 '모든 사용자'로 설정합니다.
 * 5. 배포 후 발급된 /exec 주소를 웹앱 config.js에 입력합니다.
 */

const SHEET_NAME = "게임 결과";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const data = JSON.parse(e.postData.contents || "{}");
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "제출 시각",
        "반",
        "번호",
        "연습한 단",
        "정답 수",
        "전체 문제",
        "오답",
        "최고 연속 정답",
        "획득 별",
        "기기 기록 시각",
      ]);
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date(),
      safeCell(data.studentClass),
      safeCell(data.studentNumber),
      safeCell(data.dans),
      Number(data.correct || 0),
      Number(data.total || 10),
      safeCell(data.mistakes || "없음"),
      Number(data.bestStreak || 0),
      Number(data.stars || 0),
      safeCell(data.playedAt),
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function safeCell(value) {
  const text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}
